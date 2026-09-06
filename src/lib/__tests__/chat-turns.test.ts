// Tests for Talk-to-AI request/reply correlation (ADR-2008).
//
// These encode the three mis-attribution failures the closeout names - late,
// out-of-order, and stale/replayed replies - as executable cases, plus the
// requirement that the tier is transmitted as an explicitly unverified hint
// rather than as authority.

import { describe, it, expect } from "vitest";
import {
  HEADER_IDENTITY,
  HEADER_REQUEST,
  HEADER_TIER,
  TurnRegistry,
  UNVERIFIED_NOTE,
  encodeQuestion,
  newRequestId,
  parseReplyEnvelope,
} from "../chat-turns";

describe("newRequestId", () => {
  it("mints a 16-hex token", () => {
    expect(newRequestId()).toMatch(/^[0-9a-f]{16}$/);
  });

  it("does not collide across a realistic session", () => {
    const ids = new Set(Array.from({ length: 500 }, () => newRequestId()));
    expect(ids.size).toBe(500);
  });
});

describe("encodeQuestion", () => {
  it("carries the request id and the question body", () => {
    const out = encodeQuestion({ requestId: "abc123", question: "What is a pod?" });
    expect(out).toContain(`${HEADER_REQUEST}: abc123`);
    expect(out.endsWith("What is a pod?")).toBe(true);
  });

  it("marks the tier as an unverified client assertion, never as authority", () => {
    const out = encodeQuestion({ requestId: "a1", question: "hi", tier: 3 });
    expect(out).toContain(`${HEADER_TIER}: 3`);
    expect(out).toContain(UNVERIFIED_NOTE);
    // The wire format must not present the tier as a granted capability.
    expect(out).not.toMatch(/authoris|entitled|granted|verified tier/i);
  });

  it("marks a NIP-07 pubkey as unverified with no proof of possession", () => {
    const pk = "f".repeat(64);
    const out = encodeQuestion({ requestId: "a1", question: "hi", tier: 2, identityHint: pk });
    expect(out).toContain(`${HEADER_IDENTITY}: ${pk}`);
    expect(out).toContain("no proof of possession");
  });

  it("omits the identity header when no pubkey is connected", () => {
    const out = encodeQuestion({ requestId: "a1", question: "hi", tier: 1, identityHint: null });
    expect(out).not.toContain(HEADER_IDENTITY);
  });

  it("truncates the question, never the request id, when over budget", () => {
    const out = encodeQuestion({
      requestId: "deadbeefdeadbeef",
      question: "x".repeat(10_000),
      tier: 1,
      maxLength: 200,
    });
    expect(out.length).toBeLessThanOrEqual(200);
    // A truncated id would make the reply uncorrelatable - the exact bug this
    // module exists to prevent.
    expect(out).toContain(`${HEADER_REQUEST}: deadbeefdeadbeef`);
  });
});

describe("parseReplyEnvelope", () => {
  it("recovers the id from a header block and strips the plumbing", () => {
    const { requestId, body } = parseReplyEnvelope(
      `${HEADER_REQUEST}: ab12\n${HEADER_TIER}: 1 (x)\n\nHere is your answer.`,
    );
    expect(requestId).toBe("ab12");
    expect(body).toBe("Here is your answer.");
  });

  it("recovers an inline [req:...] marker", () => {
    const { requestId, body } = parseReplyEnvelope("Answer text [req:AB12]");
    expect(requestId).toBe("ab12"); // normalised to lower case
    expect(body).toBe("Answer text");
  });

  it("returns the text unchanged when there is no correlation id", () => {
    const { requestId, body } = parseReplyEnvelope("Just an answer.");
    expect(requestId).toBeNull();
    expect(body).toBe("Just an answer.");
  });
});

describe("TurnRegistry", () => {
  it("resolves the turn a correlated reply names", () => {
    const r = new TurnRegistry();
    const turn = r.open("question one");
    const settled = r.settleById(turn.id);
    expect(settled).toMatchObject({ outcome: "resolved", correlated: true });
    expect(r.pendingCount).toBe(0);
  });

  // FAILURE 1 - the late reply. Turn A times out, the user asks B, then A's
  // answer arrives. It must NOT close B.
  it("does not let a late reply to a timed-out turn resolve a newer one", () => {
    const r = new TurnRegistry();
    const a = r.open("question A");
    r.timeout(a.id);
    const b = r.open("question B");

    const settled = r.settleById(a.id);
    expect(settled.outcome).toBe("already-settled");
    expect(r.get(b.id)?.state).toBe("pending");
    expect(r.pendingCount).toBe(1);
  });

  // FAILURE 2 - out of order. Two turns outstanding, the SECOND answers first.
  it("resolves the correct turn when replies arrive out of order", () => {
    const r = new TurnRegistry();
    const a = r.open("question A");
    const b = r.open("question B");

    expect(r.settleById(b.id)).toMatchObject({ outcome: "resolved" });
    expect(r.get(b.id)?.state).toBe("resolved");
    expect(r.get(a.id)?.state).toBe("pending");

    expect(r.settleById(a.id)).toMatchObject({ outcome: "resolved" });
    expect(r.pendingCount).toBe(0);
  });

  // FAILURE 3 - a reply for an id this session never issued (replayed from an
  // open relay's history, or another session's traffic).
  it("rejects a reply correlated to an unknown request", () => {
    const r = new TurnRegistry();
    r.open("question A");
    expect(r.settleById("00000000deadbeef")).toMatchObject({ outcome: "unknown-request" });
    expect(r.pendingCount).toBe(1);
  });

  it("never resolves a turn twice", () => {
    const r = new TurnRegistry();
    const a = r.open("q");
    expect(r.settleById(a.id).outcome).toBe("resolved");
    expect(r.settleById(a.id).outcome).toBe("already-settled");
  });

  it("matches a request id case-insensitively", () => {
    const r = new TurnRegistry();
    const a = r.open("q", "abcdef01");
    expect(r.settleById("ABCDEF01").outcome).toBe("resolved");
  });

  describe("uncorrelated replies (the agent does not echo the header yet)", () => {
    it("resolves the oldest pending turn", () => {
      const r = new TurnRegistry();
      const a = r.open("A");
      const b = r.open("B");
      const settled = r.settleUncorrelated();
      expect(settled).toMatchObject({ outcome: "resolved", correlated: false });
      expect(settled.outcome === "resolved" && settled.turn.id).toBe(a.id);
      expect(r.get(b.id)?.state).toBe("pending");
    });

    it("resolves nothing when no turn is outstanding", () => {
      const r = new TurnRegistry();
      const a = r.open("A");
      r.timeout(a.id);
      expect(r.settleUncorrelated()).toEqual({ outcome: "no-pending" });
    });

    it("skips turns that already closed", () => {
      const r = new TurnRegistry();
      const a = r.open("A");
      const b = r.open("B");
      r.timeout(a.id);
      const settled = r.settleUncorrelated();
      expect(settled.outcome === "resolved" && settled.turn.id).toBe(b.id);
    });
  });

  describe("timeout and failure", () => {
    it("does not time out a turn that already resolved", () => {
      const r = new TurnRegistry();
      const a = r.open("A");
      r.settleById(a.id);
      expect(r.timeout(a.id)).toBeNull();
      expect(r.get(a.id)?.state).toBe("resolved");
    });

    it("does not fail a turn that already resolved", () => {
      const r = new TurnRegistry();
      const a = r.open("A");
      r.settleById(a.id);
      expect(r.fail(a.id)).toBeNull();
    });

    it("abandons every pending turn on teardown", () => {
      const r = new TurnRegistry();
      const a = r.open("A");
      const b = r.open("B");
      r.settleById(a.id);
      r.abandonAll();
      expect(r.get(a.id)?.state).toBe("resolved");
      expect(r.get(b.id)?.state).toBe("failed");
      expect(r.pendingCount).toBe(0);
    });
  });

  describe("turn budget", () => {
    it("counts opened turns and survives resolution", () => {
      const r = new TurnRegistry();
      const a = r.open("A");
      r.settleById(a.id);
      r.open("B");
      expect(r.turnsUsed).toBe(2);
    });

    it("resets with the panel", () => {
      const r = new TurnRegistry();
      r.open("A");
      r.reset();
      expect(r.turnsUsed).toBe(0);
      expect(r.pendingCount).toBe(0);
    });
  });

  it("round-trips an encoded question through a correlated reply", () => {
    const r = new TurnRegistry();
    const turn = r.open("What is a zone?");
    const wire = encodeQuestion({ requestId: turn.id, question: turn.question, tier: 1 });
    // The agent echoes the header back on its reply.
    const reply = `${HEADER_REQUEST}: ${turn.id}\n\nA zone is an access-scoped section.`;
    const { requestId, body } = parseReplyEnvelope(reply);
    expect(wire).toContain(requestId);
    expect(r.settleById(requestId).outcome).toBe("resolved");
    expect(body).toBe("A zone is an access-scoped section.");
  });
});

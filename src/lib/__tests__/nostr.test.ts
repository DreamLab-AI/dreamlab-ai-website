import { describe, it, expect, vi, afterEach } from "vitest";
import * as nip17 from "nostr-tools/nip17";

import {
  buildContactRumor,
  generateEphemeralIdentity,
  publishGiftWrap,
  wrapDm,
  DmSession,
  NIP44_MAX_PLAINTEXT,
} from "../nostr";

const RELAY = "wss://relay.example.test";

// A scripted stand-in for the browser WebSocket. Nothing happens on its own:
// tests drive open/message/close explicitly so ordering is fully deterministic.
class FakeWebSocket {
  url: string;
  sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((evt: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.();
  }

  // --- test drivers ---
  fireOpen(): void {
    this.onopen?.();
  }
  emit(frame: unknown): void {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  frames(): unknown[][] {
    return this.sent.map((s) => JSON.parse(s) as unknown[]);
  }
}

/** Factory that records every socket it mints so a test can drive the last one. */
function trackedFactory() {
  const sockets: FakeWebSocket[] = [];
  const wsFactory = (url: string): WebSocket => {
    const fake = new FakeWebSocket(url);
    sockets.push(fake);
    return fake as unknown as WebSocket;
  };
  return { wsFactory, sockets, last: () => sockets[sockets.length - 1] };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("buildContactRumor", () => {
  it("builds the header + JSON payload schema (ADR-041)", () => {
    const rumor = buildContactRumor({
      name: "  Ada Lovelace  ",
      email: "ada@example.com",
      hasConsent: true,
      source: "website_signup_form",
      pageUrl: "https://dreamlab-ai.com/",
    });

    expect(rumor.kind).toBe(14);
    expect(rumor.tags).toEqual([]); // ['p'] is added by the wrap helper, not here

    const [header, json] = rumor.content.split("\n\n");
    expect(header).toBe("New website signup from Ada Lovelace");

    const payload = JSON.parse(json);
    expect(payload).toMatchObject({
      type: "contact_signup",
      name: "Ada Lovelace",
      email: "ada@example.com",
      has_consent: true,
      source: "website_signup_form",
      page_url: "https://dreamlab-ai.com/",
    });
    expect(typeof payload.submitted_at).toBe("string");
    expect(Number.isNaN(Date.parse(payload.submitted_at))).toBe(false);
  });

  it("falls back to the email in the header when no name is given", () => {
    const rumor = buildContactRumor({
      email: "nobody@example.com",
      hasConsent: false,
      source: "website_signup_form",
      pageUrl: "https://dreamlab-ai.com/",
    });
    const [header, json] = rumor.content.split("\n\n");
    expect(header).toBe("New website signup from nobody@example.com");
    expect(JSON.parse(json).name).toBe("");
    expect(JSON.parse(json).has_consent).toBe(false);
  });

  it("throws when content exceeds the NIP-44 plaintext cap", () => {
    const huge = "x".repeat(NIP44_MAX_PLAINTEXT + 1);
    expect(() =>
      buildContactRumor({
        name: huge,
        email: "a@b.com",
        hasConsent: true,
        source: "website_signup_form",
        pageUrl: "https://dreamlab-ai.com/",
      }),
    ).toThrow(/plaintext cap/i);
  });
});

describe("publishGiftWrap", () => {
  it("resolves ok:true on a matching OK-true frame and closes the socket", async () => {
    const sender = generateEphemeralIdentity();
    const recipient = generateEphemeralIdentity();
    const wrap = wrapDm("hello", sender.sk, recipient.pk);
    const { wsFactory, last } = trackedFactory();

    const p = publishGiftWrap(RELAY, wrap, { wsFactory });
    const ws = last();
    ws.fireOpen();

    // The first frame the client sends is the EVENT publish.
    expect(ws.frames()[0][0]).toBe("EVENT");

    ws.emit(["OK", wrap.id, true, "saved"]);
    const result = await p;

    expect(result).toEqual({ ok: true, message: "saved" });
    expect(ws.closed).toBe(true);
  });

  it("resolves ok:false with the relay message on OK-false", async () => {
    const sender = generateEphemeralIdentity();
    const recipient = generateEphemeralIdentity();
    const wrap = wrapDm("hello", sender.sk, recipient.pk);
    const { wsFactory, last } = trackedFactory();

    const p = publishGiftWrap(RELAY, wrap, { wsFactory });
    const ws = last();
    ws.fireOpen();
    ws.emit(["OK", wrap.id, false, "blocked: gift-wrap recipient not whitelisted"]);

    const result = await p;
    expect(result.ok).toBe(false);
    expect(result.message).toBe("blocked: gift-wrap recipient not whitelisted");
  });

  it("ignores an AUTH frame and still awaits the OK", async () => {
    const sender = generateEphemeralIdentity();
    const recipient = generateEphemeralIdentity();
    const wrap = wrapDm("hello", sender.sk, recipient.pk);
    const { wsFactory, last } = trackedFactory();

    const p = publishGiftWrap(RELAY, wrap, { wsFactory });
    const ws = last();
    ws.fireOpen();
    ws.emit(["AUTH", "challenge-123"]); // must not resolve or crash the publish
    ws.emit(["OK", wrap.id, true, ""]);

    const result = await p;
    expect(result.ok).toBe(true);
    // The publish never answers AUTH (EVENT needs no AUTH): only the EVENT frame.
    const kinds = ws.frames().map((f) => f[0]);
    expect(kinds).toEqual(["EVENT"]);
  });

  it("resolves ok:false on timeout", async () => {
    vi.useFakeTimers();
    const sender = generateEphemeralIdentity();
    const recipient = generateEphemeralIdentity();
    const wrap = wrapDm("hello", sender.sk, recipient.pk);
    const { wsFactory } = trackedFactory();

    const p = publishGiftWrap(RELAY, wrap, { wsFactory, timeoutMs: 8000 });
    await vi.advanceTimersByTimeAsync(8000);

    const result = await p;
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/timed out/i);
  });
});

describe("DmSession", () => {
  async function connectSession(opts?: { onReply?: (t: string) => void; onError?: (e: string) => void }) {
    const identity = generateEphemeralIdentity();
    const { wsFactory, last } = trackedFactory();
    const onReply = opts?.onReply ?? vi.fn();
    const onError = opts?.onError ?? vi.fn();
    const session = new DmSession(RELAY, identity, { wsFactory, onReply, onError });

    const connectPromise = session.connect();
    const ws = last();
    ws.fireOpen();
    ws.emit(["AUTH", "challenge-abc"]);
    ws.emit(["EOSE", "inbox"]);
    await connectPromise;

    return { session, identity, ws, onReply, onError };
  }

  it("answers AUTH before issuing the REQ, subscribing before any publish", async () => {
    const { ws, identity } = await connectSession();
    const frames = ws.frames();

    // Ordering: AUTH response first, then the inbox REQ.
    expect(frames[0][0]).toBe("AUTH");
    expect(frames[1][0]).toBe("REQ");

    const authEvent = frames[0][1] as { kind: number; pubkey: string; tags: string[][] };
    expect(authEvent.kind).toBe(22242);
    expect(authEvent.pubkey).toBe(identity.pk); // signed with the session key
    expect(authEvent.tags).toContainEqual(["relay", RELAY]);
    expect(authEvent.tags).toContainEqual(["challenge", "challenge-abc"]);

    const [, subId, filter] = frames[1] as [string, string, { kinds: number[]; "#p": string[] }];
    expect(subId).toBe("inbox");
    expect(filter.kinds).toEqual([1059]);
    expect(filter["#p"]).toEqual([identity.pk]);

    // No EVENT was published as part of connect (subscribe-before-publish).
    expect(frames.some((f) => f[0] === "EVENT")).toBe(false);
  });

  it("unwraps an incoming gift wrap and delivers the plaintext via onReply", async () => {
    const onReply = vi.fn();
    const { ws, identity } = await connectSession({ onReply });

    const jarvis = generateEphemeralIdentity();
    const reply = nip17.wrapEvent(jarvis.sk, { publicKey: identity.pk }, "the four zones are public, friends, family, business");
    ws.emit(["EVENT", "inbox", reply]);

    expect(onReply).toHaveBeenCalledTimes(1);
    expect(onReply).toHaveBeenCalledWith("the four zones are public, friends, family, business");
  });

  it("ignores self-authored rumors", async () => {
    const onReply = vi.fn();
    const { ws, identity } = await connectSession({ onReply });

    // A wrap whose inner rumor is authored by the session key itself.
    const echo = nip17.wrapEvent(identity.sk, { publicKey: identity.pk }, "echo of my own question");
    ws.emit(["EVENT", "inbox", echo]);

    expect(onReply).not.toHaveBeenCalled();
  });

  it("resolves sendQuestion on OK-true and rejects on OK-false", async () => {
    const { session, ws } = await connectSession();
    const jarvis = generateEphemeralIdentity();

    // OK-true path.
    const okPromise = session.sendQuestion("what zones exist?", jarvis.pk);
    const eventFrame = ws.frames().find((f) => f[0] === "EVENT") as [string, { id: string }];
    expect(eventFrame).toBeTruthy();
    ws.emit(["OK", eventFrame[1].id, true, ""]);
    await expect(okPromise).resolves.toBeUndefined();

    // OK-false path (fresh question → fresh wrap id).
    const failPromise = session.sendQuestion("again?", jarvis.pk);
    const eventFrames = ws.frames().filter((f) => f[0] === "EVENT") as Array<[string, { id: string }]>;
    const secondId = eventFrames[eventFrames.length - 1][1].id;
    ws.emit(["OK", secondId, false, "rate-limited"]);
    await expect(failPromise).rejects.toThrow(/rate-limited/);
  });

  it("keepalive uses a fresh sub id each tick and stops after close", async () => {
    vi.useFakeTimers();
    const identity = generateEphemeralIdentity();
    const { wsFactory, last } = trackedFactory();
    const session = new DmSession(RELAY, identity, { wsFactory, onReply: vi.fn() });

    const connectPromise = session.connect();
    const ws = last();
    ws.fireOpen();
    ws.emit(["AUTH", "c"]);
    ws.emit(["EOSE", "inbox"]);
    await connectPromise;

    const baseline = ws.frames().length;

    await vi.advanceTimersByTimeAsync(12000);
    await vi.advanceTimersByTimeAsync(12000);

    const keepaliveReqs = ws
      .frames()
      .slice(baseline)
      .filter((f) => f[0] === "REQ")
      .map((f) => f[1] as string);
    expect(keepaliveReqs).toEqual(["ka:1", "ka:2"]);

    // Each keepalive REQ is immediately followed by a CLOSE of the same id.
    const closes = ws
      .frames()
      .slice(baseline)
      .filter((f) => f[0] === "CLOSE")
      .map((f) => f[1] as string);
    expect(closes).toEqual(["ka:1", "ka:2"]);

    // After close(), the interval is cleared: no further keepalive traffic.
    session.close();
    const afterClose = ws.frames().length;
    await vi.advanceTimersByTimeAsync(36000);
    expect(ws.frames().length).toBe(afterClose);
  });

  it("rejects connect() and sendQuestion() once closed", async () => {
    const identity = generateEphemeralIdentity();
    const { wsFactory } = trackedFactory();
    const session = new DmSession(RELAY, identity, { wsFactory, onReply: vi.fn() });
    session.close();

    await expect(session.connect()).rejects.toThrow(/closed/i);
    await expect(session.sendQuestion("hi", identity.pk)).rejects.toThrow(/not connected/i);
  });
});

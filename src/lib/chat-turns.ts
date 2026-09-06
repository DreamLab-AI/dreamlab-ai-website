// Request/reply correlation for the Talk-to-AI chat (ADR-2008).
//
// THE PROBLEM THIS SOLVES
// The DM transport carries no protocol-level correlation: the agent replies with
// a fresh kind-14 rumor that has no `e` tag pointing at the question. The client
// therefore used to resolve "the pending turn" on *any* accepted reply. With a
// 30 s reply timeout and open public reply relays that replay history, three
// things went wrong:
//
//   1. LATE REPLY  - turn A times out, the user asks B, A's answer finally
//      arrives and resolves B. The user reads A's answer as the answer to B.
//   2. OUT OF ORDER - two answers arrive newest-first; the first one to land
//      resolves whichever turn happens to be pending.
//   3. STALE/REPLAYED - a reply relay serves an old wrap; it resolves a live
//      turn it has nothing to do with.
//
// THE FIX
// Every outgoing question carries a client-minted request id in a small header
// block. A reply that echoes the id resolves *that* turn and no other. A reply
// with an id we never issued is dropped. A reply with no id at all is handled
// conservatively (see `settleUncorrelated`): it can only ever resolve the single
// oldest still-pending turn, which is the pre-existing behaviour, retained
// because the deployed agent does not yet echo the header.
//
// TIER IS A HINT, NOT AUTHORITY
// The header transmits the selected tier and any NIP-07 pubkey as explicitly
// UNVERIFIED client assertions. The browser holds no proof of possession for the
// pubkey (it never signs with the NIP-07 key - DMs ride the ephemeral session
// key), so nothing here may be read as an entitlement. The wire format says so
// in words, so a downstream reader cannot mistake the hint for a grant.

/** Wire header names. Chosen to be inert if the agent does not parse them. */
export const HEADER_REQUEST = "X-DreamLab-Request";
export const HEADER_TIER = "X-DreamLab-Tier-Hint";
export const HEADER_IDENTITY = "X-DreamLab-Identity-Hint";

/** Stated on every capability hint so it cannot be read as an entitlement. */
export const UNVERIFIED_NOTE = "client-asserted, UNVERIFIED, not an entitlement";

export type TurnState = "pending" | "resolved" | "timedout" | "failed";

export interface Turn {
  id: string;
  question: string;
  askedAt: number;
  state: TurnState;
}

export type SettleOutcome =
  | { outcome: "resolved"; turn: Turn; correlated: boolean }
  | { outcome: "unknown-request"; requestId: string }
  | { outcome: "already-settled"; turn: Turn }
  | { outcome: "no-pending" };

/**
 * Mint a request id. Uses the platform CSPRNG when available; the fallback keeps
 * the module usable in a test environment without `crypto`, and the value is a
 * correlation token, never a secret or a capability.
 */
export function newRequestId(): string {
  const bytes = new Uint8Array(8);
  const c = globalThis.crypto;
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface EncodeQuestionParams {
  requestId: string;
  question: string;
  /** Selected tier (0-3). Transmitted as an unverified client assertion. */
  tier?: number;
  /** NIP-07 pubkey, if the user connected one. Also unverified - no PoP. */
  identityHint?: string | null;
  /** Hard cap on the encoded length (NIP-44 plaintext budget). */
  maxLength?: number;
}

/**
 * Build the outgoing rumor content: a header block the agent may echo, a blank
 * line, then the user's question verbatim.
 *
 * The question is what gets truncated if the whole thing would exceed
 * `maxLength` - never the header, because a truncated request id would make the
 * reply uncorrelatable, which is the failure this whole module exists to fix.
 */
export function encodeQuestion({
  requestId,
  question,
  tier,
  identityHint,
  maxLength,
}: EncodeQuestionParams): string {
  const headers = [`${HEADER_REQUEST}: ${requestId}`];
  if (tier !== undefined) {
    headers.push(`${HEADER_TIER}: ${tier} (${UNVERIFIED_NOTE})`);
  }
  if (identityHint) {
    headers.push(`${HEADER_IDENTITY}: ${identityHint} (${UNVERIFIED_NOTE}, no proof of possession)`);
  }
  const block = `${headers.join("\n")}\n\n`;
  if (maxLength === undefined) return `${block}${question}`;
  const room = Math.max(0, maxLength - block.length);
  return `${block}${question.slice(0, room)}`;
}

/**
 * Recover the request id from a reply, and strip any header block so the user
 * never sees wire plumbing. Liberal in what it accepts: a header line, or an
 * inline `[req:<id>]` marker anywhere in the text.
 */
export function parseReplyEnvelope(text: string): { requestId: string | null; body: string } {
  const headerRe = new RegExp(`^${HEADER_REQUEST}:\\s*([0-9a-f]{4,64})\\s*$`, "im");
  const header = text.match(headerRe);
  if (header) {
    // Drop the whole leading header block (contiguous X-DreamLab-* lines plus
    // the blank line that terminates it).
    const body = text
      .replace(/^(?:X-DreamLab-[A-Za-z-]+:.*\n?)+/i, "")
      .replace(/^\n+/, "");
    return { requestId: header[1].toLowerCase(), body: body || text };
  }
  const inline = text.match(/\[req:([0-9a-f]{4,64})\]/i);
  if (inline) {
    return {
      requestId: inline[1].toLowerCase(),
      body: text.replace(/\s*\[req:[0-9a-f]{4,64}\]\s*/i, " ").trim(),
    };
  }
  return { requestId: null, body: text };
}

/**
 * Tracks the lifecycle of every question this panel session has sent, so a reply
 * can only ever resolve the turn it actually belongs to.
 */
export class TurnRegistry {
  private readonly turns = new Map<string, Turn>();
  /** Insertion order of ids, so "oldest pending" is well defined. */
  private readonly order: string[] = [];
  private transported = 0;

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Open a new turn and return it. The caller sends `turn.id` on the wire. */
  open(question: string, requestId: string = newRequestId()): Turn {
    const turn: Turn = { id: requestId, question, askedAt: this.now(), state: "pending" };
    this.turns.set(requestId, turn);
    this.order.push(requestId);
    this.transported += 1;
    return turn;
  }

  get(requestId: string): Turn | undefined {
    return this.turns.get(requestId);
  }

  /** Number of turns opened this session (the abuse budget counts these). */
  get turnsUsed(): number {
    return this.transported;
  }

  get pendingCount(): number {
    return this.order.filter((id) => this.turns.get(id)?.state === "pending").length;
  }

  private oldestPending(): Turn | null {
    for (const id of this.order) {
      const turn = this.turns.get(id);
      if (turn?.state === "pending") return turn;
    }
    return null;
  }

  /**
   * Settle the turn a correlated reply names. An id we never issued is rejected
   * outright, and an id whose turn already resolved (or timed out) is reported
   * as already-settled rather than re-resolving - that is the late-reply case.
   */
  settleById(requestId: string): SettleOutcome {
    const turn = this.turns.get(requestId.toLowerCase());
    if (!turn) return { outcome: "unknown-request", requestId };
    if (turn.state !== "pending") return { outcome: "already-settled", turn };
    turn.state = "resolved";
    return { outcome: "resolved", turn, correlated: true };
  }

  /**
   * Settle from a reply carrying no correlation id. Conservative by design: it
   * resolves ONLY the oldest still-pending turn, and reports `no-pending` when
   * nothing is outstanding, so an unsolicited or replayed message can never
   * close a turn it did not answer.
   */
  settleUncorrelated(): SettleOutcome {
    const turn = this.oldestPending();
    if (!turn) return { outcome: "no-pending" };
    turn.state = "resolved";
    return { outcome: "resolved", turn, correlated: false };
  }

  /** Mark a turn timed out. No-op unless it is still pending. */
  timeout(requestId: string): Turn | null {
    const turn = this.turns.get(requestId);
    if (!turn || turn.state !== "pending") return null;
    turn.state = "timedout";
    return turn;
  }

  /** Mark a turn failed (transport error). No-op unless it is still pending. */
  fail(requestId: string): Turn | null {
    const turn = this.turns.get(requestId);
    if (!turn || turn.state !== "pending") return null;
    turn.state = "failed";
    return turn;
  }

  /** Abandon every pending turn (panel closed, session torn down). */
  abandonAll(): void {
    for (const turn of this.turns.values()) {
      if (turn.state === "pending") turn.state = "failed";
    }
  }

  /** Full reset - the turn budget resets when the panel closes. */
  reset(): void {
    this.turns.clear();
    this.order.length = 0;
    this.transported = 0;
  }
}

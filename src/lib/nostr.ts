// Shared Nostr core for the marketing site's two client-side gift-wrap features:
//   - Anonymous contact-form ingress (ADR-041): fire-and-forget publish of a
//     kind-1059 gift wrap to the admin recipient, success gated on the relay OK.
//   - "Talk to AI" agent chat (ADR-042): a NIP-42-authenticated DM session with
//     junkiejarvis, subscribe-before-publish with an application-level keepalive,
//     plus best-effort reply listeners on open relays (the primary relay's
//     recipient-whitelist gate can never admit a reply to the ephemeral session
//     key, so replies are only readable from the agent's open-relay fan-out).
//
// Deliberately dependency-light: only nostr-tools primitives plus a raw
// WebSocket. No NDK (ADR-042 Decision 6). All socket construction flows through
// an injectable factory so jsdom unit tests can drive a scripted fake.
//
// Reference implementations this mirrors:
//   scripts/seed/probes/probe-giftwrap.mjs        (publish + AUTH frames)
//   scripts/seed/probes/probe-agent-bridge-dm.mjs (round-trip unwrap)
//   scripts/seed/test-junkiejarvis.mjs            (AUTH → REQ → EVENT ordering)

import { finalizeEvent, generateSecretKey, getPublicKey, type Event } from "nostr-tools/pure";
import * as nip17 from "nostr-tools/nip17";
import * as nip59 from "nostr-tools/nip59";

// Kind numbers used on the wire.
const KIND_GIFT_WRAP = 1059;
const KIND_NIP42_AUTH = 22242;

// NIP-44 plaintext ceiling (nostr-bbs-core/src/nip44.rs:52; nostr-tools enforces
// the same bound in its pad()). We guard content length before wrapping so an
// oversize payload fails with a clear message rather than a cryptic pad error.
export const NIP44_MAX_PLAINTEXT = 65535;

// Timing defaults. The keepalive cadence mirrors the agent bridge's own 12 s
// interval (ADR-042 Decision 4) that defeats the relay Durable Object's ~20 s
// idle push-death.
const DEFAULT_PUBLISH_TIMEOUT_MS = 8000;
const CONNECT_TIMEOUT_MS = 10000;
const KEEPALIVE_INTERVAL_MS = 12000;
const SEND_OK_TIMEOUT_MS = 8000;

// Reply-relay listeners (ADR-042 amendment). The primary relay's kind-1059
// admission gate only admits wraps whose recipient is whitelisted, and the
// session's ephemeral pubkey never is — so the agent's reply can never land
// there. The agent publishes every reply to its full relay set (the primary
// plus open public relays), so the session listens for its own inbox on those
// open relays too. Best-effort: a dead reply relay never fails the session.
const REPLY_RELAY_RETRY_MS = 2000;
const REPLY_RELAY_MAX_RETRIES = 3;

export type WsFactory = (url: string) => WebSocket;

const defaultWsFactory: WsFactory = (url) => new WebSocket(url);

const nowSec = (): number => Math.floor(Date.now() / 1000);

const errMsg = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

const closeQuietly = (ws: WebSocket): void => {
  try {
    ws.close();
  } catch {
    /* already closed / never opened — nothing to do */
  }
};

/** Throw if `content` exceeds the NIP-44 plaintext cap (measured in UTF-8 bytes). */
function assertPlaintextSize(content: string): void {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes > NIP44_MAX_PLAINTEXT) {
    throw new Error(
      `DM content exceeds the NIP-44 plaintext cap (${bytes} > ${NIP44_MAX_PLAINTEXT} bytes).`,
    );
  }
}

export interface EphemeralIdentity {
  sk: Uint8Array;
  pk: string;
}

/**
 * Mint a fresh, unpersisted secp256k1 keypair. Feature A uses one per submission
 * and discards it after the relay OK; feature B uses one per chat session.
 */
export function generateEphemeralIdentity(): EphemeralIdentity {
  const sk = generateSecretKey();
  return { sk, pk: getPublicKey(sk) };
}

export interface ContactSignupParams {
  name?: string;
  email: string;
  hasConsent: boolean;
  source: string;
  pageUrl: string;
}

export interface ContactRumor {
  kind: 14;
  created_at: number;
  content: string;
  tags: string[][];
}

/**
 * Build the unsigned kind-14 rumor body for a contact signup (ADR-041). The
 * content is a human-readable header line (the forum DM view renders content
 * verbatim, so this keeps the admin inbox scannable) followed by a pretty JSON
 * payload. The `["p", recipient]` tag is added later by the wrap helper.
 */
export function buildContactRumor(params: ContactSignupParams): ContactRumor {
  const { name, email, hasConsent, source, pageUrl } = params;
  const trimmedName = name?.trim() ?? "";
  const payload = {
    type: "contact_signup",
    name: trimmedName,
    email,
    has_consent: hasConsent,
    source,
    page_url: pageUrl,
    submitted_at: new Date().toISOString(),
  };
  const header = `New website signup from ${trimmedName || email}`;
  const content = `${header}\n\n${JSON.stringify(payload, null, 2)}`;
  assertPlaintextSize(content);
  return { kind: 14, created_at: nowSec(), content, tags: [] };
}

/**
 * Wrap plaintext as a signed kind-1059 gift wrap addressed to `recipientPk`,
 * exactly as the kit reads it: kind-14 rumor (with `["p", recipient]` and an
 * optional `["subject", …]` tag) → kind-13 seal → kind-1059 wrap. Never uses
 * wrapManyEvents (it self-wraps a copy to the non-whitelisted sender, which the
 * relay rejects — ADR-041 Decision 3).
 */
export function wrapDm(
  rumorContent: string,
  senderSk: Uint8Array,
  recipientPk: string,
  subject?: string,
): Event {
  assertPlaintextSize(rumorContent);
  return nip17.wrapEvent(senderSk, { publicKey: recipientPk }, rumorContent, subject);
}

export interface PublishResult {
  ok: boolean;
  message: string;
}

export interface PublishOptions {
  timeoutMs?: number;
  wsFactory?: WsFactory;
}

/**
 * Publish a gift wrap over a one-shot WebSocket and resolve on the matching
 * relay OK frame. Never rejects: transport failures, OK-false, and timeout all
 * resolve `{ ok: false, message }` so the caller shows a user-visible failure
 * (ADR-041 Decision 4 — success only on relay OK-true). AUTH frames are ignored;
 * publishing an EVENT needs no NIP-42 AUTH. The socket is always closed.
 */
export function publishGiftWrap(
  relayUrl: string,
  wrap: Event,
  opts: PublishOptions = {},
): Promise<PublishResult> {
  const wsFactory = opts.wsFactory ?? defaultWsFactory;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_PUBLISH_TIMEOUT_MS;

  return new Promise<PublishResult>((resolve) => {
    let ws: WebSocket;
    try {
      ws = wsFactory(relayUrl);
    } catch (err) {
      resolve({ ok: false, message: `Failed to open relay connection: ${errMsg(err)}` });
      return;
    }

    let settled = false;
    const finish = (result: PublishResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      closeQuietly(ws);
      resolve(result);
    };

    // Declared after `finish` because the timeout callback invokes it; the
    // closure resolves `timer` lazily and finish only ever runs once the
    // synchronous executor (which sets it) has completed.
    const timer = setTimeout(
      () => finish({ ok: false, message: "Timed out waiting for relay confirmation." }),
      timeoutMs,
    );

    ws.onopen = () => {
      try {
        ws.send(JSON.stringify(["EVENT", wrap]));
      } catch (err) {
        finish({ ok: false, message: `Failed to send event: ${errMsg(err)}` });
      }
    };

    ws.onmessage = (evt: MessageEvent) => {
      let frame: unknown;
      try {
        frame = JSON.parse(typeof evt.data === "string" ? evt.data : String(evt.data));
      } catch {
        return;
      }
      if (!Array.isArray(frame)) return;
      // AUTH frames are ignored: an EVENT publish requires no NIP-42 AUTH.
      if (frame[0] === "OK" && frame[1] === wrap.id) {
        const accepted = Boolean(frame[2]);
        const msg = typeof frame[3] === "string" ? frame[3] : "";
        finish({
          ok: accepted,
          message: accepted ? msg || "Accepted by relay." : msg || "Rejected by relay.",
        });
      }
    };

    ws.onerror = () => finish({ ok: false, message: "Relay connection error." });
    ws.onclose = () =>
      finish({ ok: false, message: "Relay connection closed before confirmation." });
  });
}

export interface DmSessionOptions {
  wsFactory?: WsFactory;
  onReply: (plaintext: string) => void;
  onError?: (err: string) => void;
  /**
   * Open relays to also watch for the session's kind-1059 inbox. The agent's
   * reply cannot pass the primary relay's recipient-whitelist gate (the
   * session key is ephemeral), so it is only ever readable from these.
   */
  replyRelays?: string[];
}

interface PendingSend {
  resolve: () => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * A warm DM session for the agent chat (ADR-042). Lifecycle: connect() opens the
 * socket, answers the relay's NIP-42 AUTH challenge with the session key, issues
 * a REQ for the session's own kind-1059 inbox, and resolves only once the
 * subscription is active (EOSE). Subscribe-before-publish is mandatory because
 * re-REQ does not restore live delivery on this relay. An application-level
 * keepalive (fresh sub id each tick) keeps the Durable Object pushing. Sends are
 * serialised by the caller; each sendQuestion awaits its own relay OK.
 */
export class DmSession {
  private readonly wsFactory: WsFactory;
  private readonly onReply: (plaintext: string) => void;
  private readonly onError: (err: string) => void;

  private ws: WebSocket | null = null;
  private closed = false;
  private reqSent = false;

  private readonly subId = "inbox";
  private connectSettled = false;
  private connectResolve: (() => void) | null = null;
  private connectReject: ((err: Error) => void) | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;

  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  private keepaliveSeq = 0;

  private readonly pendingOk = new Map<string, PendingSend>();

  private readonly replyRelays: string[];
  private readonly replySockets = new Map<string, WebSocket>();
  private readonly replyRetryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly replyRetries = new Map<string, number>();
  // The agent signs one wrap and fans it out to every relay it knows, so the
  // same event id can arrive on several sockets (and again as stored history
  // after a listener reconnects). First arrival wins.
  private readonly seenWrapIds = new Set<string>();

  constructor(
    private readonly relayUrl: string,
    private readonly identity: EphemeralIdentity,
    opts: DmSessionOptions,
  ) {
    this.wsFactory = opts.wsFactory ?? defaultWsFactory;
    this.onReply = opts.onReply;
    this.onError = opts.onError ?? (() => {});
    this.replyRelays = [...new Set(opts.replyRelays ?? [])].filter(
      (url) => url && url !== this.relayUrl,
    );
  }

  connect(): Promise<void> {
    if (this.closed) return Promise.reject(new Error("Session already closed."));
    return new Promise<void>((resolve, reject) => {
      this.connectResolve = resolve;
      this.connectReject = reject;

      let ws: WebSocket;
      try {
        ws = this.wsFactory(this.relayUrl);
      } catch (err) {
        this.settleConnect(false, new Error(`Failed to open relay connection: ${errMsg(err)}`));
        return;
      }
      this.ws = ws;

      // Reply listeners are best-effort and never gate connect(): kind-1059 is
      // a stored kind and the inbox REQ carries no `since`, so even a listener
      // that connects after the question was answered replays the reply from
      // the relay's history.
      for (const url of this.replyRelays) {
        this.openReplyListener(url);
      }

      this.connectTimer = setTimeout(() => {
        this.settleConnect(false, new Error("Timed out establishing relay subscription."));
        this.close();
      }, CONNECT_TIMEOUT_MS);

      // No REQ on open: kind-1059 reads are AUTH-gated, so we wait for the
      // relay's AUTH challenge, answer it, then subscribe.
      ws.onopen = () => {};
      ws.onmessage = (evt: MessageEvent) => this.handleMessage(evt.data);
      ws.onerror = () => {
        this.onError("Relay connection error.");
        this.settleConnect(false, new Error("Relay connection error."));
        this.close();
      };
      ws.onclose = () => {
        if (this.closed) return;
        this.settleConnect(false, new Error("Relay connection closed before subscription was active."));
        this.close();
      };
    });
  }

  sendQuestion(text: string, recipientPk: string): Promise<void> {
    if (this.closed || !this.ws) {
      return Promise.reject(new Error("Session is not connected."));
    }
    let wrap: Event;
    try {
      wrap = wrapDm(text, this.identity.sk, recipientPk);
    } catch (err) {
      return Promise.reject(err instanceof Error ? err : new Error(errMsg(err)));
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingOk.delete(wrap.id);
        reject(new Error("Timed out waiting for the relay to accept the message."));
      }, SEND_OK_TIMEOUT_MS);
      this.pendingOk.set(wrap.id, { resolve, reject, timer });
      try {
        this.ws!.send(JSON.stringify(["EVENT", wrap]));
      } catch (err) {
        clearTimeout(timer);
        this.pendingOk.delete(wrap.id);
        reject(new Error(`Failed to send message: ${errMsg(err)}`));
      }
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    this.failPending("Session closed.");
    this.settleConnect(false, new Error("Session closed."));
    if (this.ws) {
      closeQuietly(this.ws);
      this.ws = null;
    }
    for (const timer of this.replyRetryTimers.values()) {
      clearTimeout(timer);
    }
    this.replyRetryTimers.clear();
    // closeQuietly triggers each socket's onclose, which mutates replySockets;
    // iterate a snapshot.
    for (const socket of Array.from(this.replySockets.values())) {
      closeQuietly(socket);
    }
    this.replySockets.clear();
  }

  private handleMessage(data: unknown): void {
    let frame: unknown;
    try {
      frame = JSON.parse(typeof data === "string" ? data : String(data));
    } catch {
      return;
    }
    if (!Array.isArray(frame) || frame.length === 0) return;

    switch (frame[0]) {
      case "AUTH": {
        const challenge = frame[1];
        if (typeof challenge !== "string" || !this.ws) return;
        const authEvent = finalizeEvent(
          {
            kind: KIND_NIP42_AUTH,
            created_at: nowSec(),
            tags: [
              ["relay", this.relayUrl],
              ["challenge", challenge],
            ],
            content: "",
          },
          this.identity.sk,
        );
        this.sendRaw(["AUTH", authEvent]);
        // Subscribe to our own inbox once, on the SAME socket, immediately after
        // AUTH (message order is preserved by the relay Durable Object).
        if (!this.reqSent) {
          this.reqSent = true;
          this.sendRaw([
            "REQ",
            this.subId,
            { kinds: [KIND_GIFT_WRAP], "#p": [this.identity.pk] },
          ]);
        }
        break;
      }
      case "EOSE": {
        if (frame[1] === this.subId && !this.connectSettled) {
          this.settleConnect(true);
          this.startKeepalive();
        }
        break;
      }
      case "EVENT": {
        if (frame[1] !== this.subId) return; // keepalive subs use limit:0 → no events
        const event = frame[2] as Event | undefined;
        if (!event || event.kind !== KIND_GIFT_WRAP) return;
        this.deliverReply(event);
        break;
      }
      case "OK": {
        const id = frame[1];
        if (typeof id !== "string") return;
        const pending = this.pendingOk.get(id);
        if (!pending) return;
        this.pendingOk.delete(id);
        clearTimeout(pending.timer);
        if (frame[2]) {
          pending.resolve();
        } else {
          const msg = typeof frame[3] === "string" ? frame[3] : "";
          pending.reject(new Error(msg || "Relay rejected the message."));
        }
        break;
      }
      case "CLOSED": {
        if (frame[1] === this.subId) {
          const msg = typeof frame[2] === "string" ? frame[2] : "Subscription closed by relay.";
          this.onError(msg);
          this.settleConnect(false, new Error(msg));
        }
        break;
      }
      default:
        break;
    }
  }

  private deliverReply(event: Event): void {
    if (this.seenWrapIds.has(event.id)) return; // duplicate from another relay
    this.seenWrapIds.add(event.id);
    let rumor: { pubkey: string; content: string };
    try {
      rumor = nip59.unwrapEvent(event, this.identity.sk);
    } catch {
      return; // not addressed to us, or undecryptable — ignore
    }
    if (rumor.pubkey === this.identity.pk) return; // ignore self-authored rumors
    this.onReply(rumor.content);
  }

  /**
   * Open a best-effort read-only listener on an open relay for the session's
   * own kind-1059 inbox. Public relays serve this REQ without NIP-42, so we
   * subscribe on open; if a relay does challenge, we answer with the session
   * key and re-issue the REQ so it is evaluated post-AUTH. Failures retry a
   * few times, then give up silently — the session itself stays usable.
   */
  private openReplyListener(url: string): void {
    if (this.closed) return;
    let ws: WebSocket;
    try {
      ws = this.wsFactory(url);
    } catch {
      this.scheduleReplyRetry(url);
      return;
    }
    this.replySockets.set(url, ws);

    const subscribe = (): void => {
      try {
        ws.send(
          JSON.stringify(["REQ", this.subId, { kinds: [KIND_GIFT_WRAP], "#p": [this.identity.pk] }]),
        );
      } catch {
        /* send failed — the socket's onclose handles the retry */
      }
    };

    ws.onopen = subscribe;
    ws.onmessage = (evt: MessageEvent) => {
      let frame: unknown;
      try {
        frame = JSON.parse(typeof evt.data === "string" ? evt.data : String(evt.data));
      } catch {
        return;
      }
      if (!Array.isArray(frame) || frame.length === 0) return;
      if (frame[0] === "EVENT" && frame[1] === this.subId) {
        const event = frame[2] as Event | undefined;
        if (event && event.kind === KIND_GIFT_WRAP) this.deliverReply(event);
      } else if (frame[0] === "AUTH" && typeof frame[1] === "string") {
        const authEvent = finalizeEvent(
          {
            kind: KIND_NIP42_AUTH,
            created_at: nowSec(),
            tags: [
              ["relay", url],
              ["challenge", frame[1]],
            ],
            content: "",
          },
          this.identity.sk,
        );
        try {
          ws.send(JSON.stringify(["AUTH", authEvent]));
        } catch {
          return;
        }
        subscribe();
      }
    };
    ws.onerror = () => {
      /* onclose follows a fatal error; retry is handled there */
    };
    ws.onclose = () => {
      this.replySockets.delete(url);
      this.scheduleReplyRetry(url);
    };
  }

  private scheduleReplyRetry(url: string): void {
    if (this.closed || this.replyRetryTimers.has(url)) return;
    const attempts = this.replyRetries.get(url) ?? 0;
    if (attempts >= REPLY_RELAY_MAX_RETRIES) return;
    this.replyRetries.set(url, attempts + 1);
    const timer = setTimeout(() => {
      this.replyRetryTimers.delete(url);
      this.openReplyListener(url);
    }, REPLY_RELAY_RETRY_MS);
    this.replyRetryTimers.set(url, timer);
  }

  private startKeepalive(): void {
    if (this.keepaliveTimer || this.closed) return;
    this.keepaliveTimer = setInterval(() => {
      if (this.closed || !this.ws) return;
      // Fresh sub id each tick: the relay does not reliably restore live
      // delivery on re-REQ of an existing subscription, so we never re-REQ the
      // main subscription id.
      const subId = `ka:${++this.keepaliveSeq}`;
      this.sendRaw(["REQ", subId, { kinds: [KIND_GIFT_WRAP], "#p": [this.identity.pk], limit: 0 }]);
      this.sendRaw(["CLOSE", subId]);
    }, KEEPALIVE_INTERVAL_MS);
  }

  private sendRaw(frame: unknown[]): void {
    if (!this.ws) return;
    try {
      this.ws.send(JSON.stringify(frame));
    } catch (err) {
      this.onError(`Failed to send to relay: ${errMsg(err)}`);
    }
  }

  private settleConnect(ok: boolean, err?: Error): void {
    if (this.connectSettled) return;
    this.connectSettled = true;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    const resolveFn = this.connectResolve;
    const rejectFn = this.connectReject;
    this.connectResolve = null;
    this.connectReject = null;
    if (ok) {
      resolveFn?.();
    } else {
      rejectFn?.(err ?? new Error("Failed to connect."));
    }
  }

  private failPending(reason: string): void {
    for (const pending of this.pendingOk.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    this.pendingOk.clear();
  }
}

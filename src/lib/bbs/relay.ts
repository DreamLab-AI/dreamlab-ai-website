/**
 * Minimal NIP-01 / NIP-42 relay client over a raw WebSocket.
 *
 * Deliberately dependency-light (no SimplePool) and modelled on the kit's
 * seed scripts so it speaks the exact protocol the DreamLab relay expects:
 *   - REQ / EVENT / EOSE / CLOSE                         (NIP-01)
 *   - AUTH challenge → kind-22242 response               (NIP-42)
 *
 * The client multiplexes many subscriptions over one socket, auto-reconnects
 * with backoff, and replays live subscriptions after a reconnect.
 */

import type { NostrEvent, RelayFilter, RelayStatus } from "./types";
import { KIND } from "./types";
import type { Signer } from "./identity";

type EventHandler = (event: NostrEvent) => void;
type EoseHandler = () => void;
type StatusHandler = (status: RelayStatus) => void;

interface Subscription {
  id: string;
  filters: RelayFilter[];
  onEvent: EventHandler;
  onEose?: EoseHandler;
  /** Live subscriptions are replayed across reconnects. */
  live: boolean;
}

interface PendingPublish {
  resolve: (result: { ok: boolean; message: string }) => void;
  timer: ReturnType<typeof setTimeout>;
}

let counter = 0;
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}`;
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export class RelayClient {
  readonly url: string;
  private ws: WebSocket | null = null;
  private signer: Signer | null = null;
  private status: RelayStatus = "idle";
  private wantOpen = false;
  private authed = false;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly subs = new Map<string, Subscription>();
  private readonly pending = new Map<string, PendingPublish>();
  private readonly statusHandlers = new Set<StatusHandler>();

  constructor(url: string) {
    this.url = url;
  }

  getStatus(): RelayStatus {
    return this.status;
  }

  isAuthed(): boolean {
    return this.authed;
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  private setStatus(status: RelayStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const h of this.statusHandlers) h(status);
  }

  /** Provide (or clear) the signer used for NIP-42 auth and publishing. */
  setSigner(signer: Signer | null): void {
    this.signer = signer;
    this.authed = false;
  }

  /** Open the socket (idempotent). */
  connect(): void {
    if (typeof WebSocket === "undefined") {
      this.setStatus("error");
      return;
    }
    this.wantOpen = true;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    this.setStatus("connecting");
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.setStatus("error");
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus("online");
      // Replay any live subscriptions established before (re)connect.
      for (const sub of this.subs.values()) {
        if (sub.live) this.sendReq(sub);
      }
    };
    this.ws.onmessage = (ev) => this.handleMessage(ev.data);
    this.ws.onerror = () => {
      if (this.status !== "online") this.setStatus("error");
    };
    this.ws.onclose = () => {
      this.authed = false;
      if (this.wantOpen) {
        this.setStatus("connecting");
        this.scheduleReconnect();
      } else {
        this.setStatus("closed");
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.wantOpen) return;
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.wantOpen) this.connect();
    }, delay);
  }

  private send(payload: unknown[]): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private async handleMessage(raw: string): Promise<void> {
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(msg) || msg.length === 0) return;
    const type = msg[0] as string;

    switch (type) {
      case "EVENT": {
        const subId = msg[1] as string;
        const event = msg[2] as NostrEvent;
        const sub = this.subs.get(subId);
        if (sub && event) sub.onEvent(event);
        break;
      }
      case "EOSE": {
        const sub = this.subs.get(msg[1] as string);
        if (sub?.onEose) sub.onEose();
        break;
      }
      case "OK": {
        const id = msg[1] as string;
        const ok = msg[2] as boolean;
        const message = (msg[3] as string) || "";
        const p = this.pending.get(id);
        if (p) {
          clearTimeout(p.timer);
          this.pending.delete(id);
          p.resolve({ ok, message });
        }
        break;
      }
      case "AUTH": {
        await this.respondAuth(msg[1] as string);
        break;
      }
      case "CLOSED": {
        // Relay closed a subscription (e.g. auth-required). Surface via EOSE.
        const sub = this.subs.get(msg[1] as string);
        if (sub?.onEose) sub.onEose();
        break;
      }
      default:
        break;
    }
  }

  private async respondAuth(challenge: string): Promise<void> {
    if (!this.signer || !challenge) return;
    this.setStatus("authenticating");
    try {
      const authEvent = await this.signer.sign({
        kind: KIND.AUTH,
        created_at: nowSec(),
        tags: [
          ["relay", this.url],
          ["challenge", challenge],
        ],
        content: "",
      });
      this.send(["AUTH", authEvent]);
      this.authed = true;
    } catch {
      /* signing failed — remain unauthenticated (read-only) */
    } finally {
      if (this.status === "authenticating") this.setStatus("online");
    }
  }

  private sendReq(sub: Subscription): void {
    this.send(["REQ", sub.id, ...sub.filters]);
  }

  /**
   * Open a live subscription. Returns an unsubscribe function. `onEvent` fires
   * per matching event; `onEose` fires once stored events are exhausted.
   */
  subscribe(
    filters: RelayFilter[],
    onEvent: EventHandler,
    onEose?: EoseHandler
  ): () => void {
    const id = nextId("sub");
    const sub: Subscription = { id, filters, onEvent, onEose, live: true };
    this.subs.set(id, sub);
    this.sendReq(sub);
    return () => {
      this.subs.delete(id);
      this.send(["CLOSE", id]);
    };
  }

  /**
   * One-shot query: collect events until EOSE (or timeout), then close the
   * subscription and resolve. Results are sorted newest-first.
   */
  query(
    filters: RelayFilter[],
    options: { timeoutMs?: number } = {}
  ): Promise<NostrEvent[]> {
    const timeoutMs = options.timeoutMs ?? 7000;
    return new Promise((resolve) => {
      const events: NostrEvent[] = [];
      const id = nextId("q");
      let done = false;

      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.subs.delete(id);
        this.send(["CLOSE", id]);
        events.sort((a, b) => b.created_at - a.created_at);
        resolve(events);
      };

      const timer = setTimeout(finish, timeoutMs);
      const sub: Subscription = {
        id,
        filters,
        onEvent: (e) => events.push(e),
        onEose: finish,
        live: false,
      };
      this.subs.set(id, sub);

      if (this.status === "online" || this.status === "authenticating") {
        this.sendReq(sub);
      } else {
        // Defer the REQ until the socket opens.
        const off = this.onStatus((s) => {
          if (s === "online") {
            this.sendReq(sub);
            off();
          }
        });
        this.connect();
      }
    });
  }

  /** Publish a signed event; resolves with the relay's OK verdict. */
  publish(
    event: NostrEvent,
    options: { timeoutMs?: number } = {}
  ): Promise<{ ok: boolean; message: string }> {
    const timeoutMs = options.timeoutMs ?? 8000;
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve({ ok: false, message: "not connected" });
        return;
      }
      const timer = setTimeout(() => {
        this.pending.delete(event.id);
        resolve({ ok: false, message: "timeout waiting for relay" });
      }, timeoutMs);
      this.pending.set(event.id, { resolve, timer });
      this.send(["EVENT", event]);
    });
  }

  /**
   * Cycle the socket without tearing down subscriptions — used after the signer
   * changes so the relay issues a fresh NIP-42 AUTH challenge. Live
   * subscriptions are replayed automatically on reconnect.
   */
  reconnect(): void {
    this.authed = false;
    const old = this.ws;
    this.ws = null;
    if (old) {
      old.onclose = null;
      old.onerror = null;
      old.onmessage = null;
      try {
        old.close();
      } catch {
        /* ignore */
      }
    }
    if (this.wantOpen) this.connect();
  }

  /** Close the socket and stop reconnecting. */
  close(): void {
    this.wantOpen = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.resolve({ ok: false, message: "closed" });
    }
    this.pending.clear();
    this.subs.clear();
    try {
      this.ws?.close();
    } catch {
      /* ignore */
    }
    this.ws = null;
    this.setStatus("closed");
  }
}

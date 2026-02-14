import WebSocket from 'ws';
import crypto from 'crypto';
import { type Event } from 'nostr-tools';

export type NostrEventCallback = (event: Event) => void;

interface Subscription {
  id: string;
  filters: Record<string, unknown>[];
  callback: NostrEventCallback;
}

/**
 * Minimal Nostr WebSocket client for the bridge.
 * Connects to the relay, subscribes to events, and publishes responses.
 */
export class NostrClient {
  private ws: WebSocket | null = null;
  private url: string;
  private subscriptions: Map<string, Subscription> = new Map();
  private reconnectInterval: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private intentionalClose = false;

  constructor(url: string, reconnectInterval = 5000) {
    this.url = url;
    this.reconnectInterval = reconnectInterval;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.intentionalClose = false;

      try {
        this.ws = new WebSocket(this.url);
      } catch (err) {
        reject(err);
        return;
      }

      const timeout = setTimeout(() => {
        if (!this.connected) {
          this.ws?.close();
          reject(new Error('Connection timeout'));
        }
      }, 15000);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.connected = true;
        console.log(`[NostrClient] Connected to ${this.url}`);

        // Re-subscribe after reconnect
        for (const sub of this.subscriptions.values()) {
          this.sendSubscription(sub);
        }

        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', () => {
        this.connected = false;
        console.log('[NostrClient] Disconnected');

        if (!this.intentionalClose) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (err) => {
        console.error('[NostrClient] WebSocket error:', err.message);
        if (!this.connected) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    console.log(`[NostrClient] Reconnecting in ${this.reconnectInterval}ms...`);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connect();
      } catch (err) {
        console.error('[NostrClient] Reconnect failed:', (err as Error).message);
        this.scheduleReconnect();
      }
    }, this.reconnectInterval);
  }

  private handleMessage(raw: string): void {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length < 2) return;

      const [type, ...args] = parsed;

      switch (type) {
        case 'EVENT': {
          // ["EVENT", subscriptionId, event]
          const subId = args[0] as string;
          const event = args[1] as Event;
          const sub = this.subscriptions.get(subId);
          if (sub) {
            sub.callback(event);
          }
          break;
        }
        case 'EOSE': {
          // End of stored events
          const subId = args[0] as string;
          console.log(`[NostrClient] EOSE for subscription ${subId}`);
          break;
        }
        case 'OK': {
          // ["OK", eventId, success, message]
          const [eventId, success, message] = args;
          if (!success) {
            console.warn(`[NostrClient] Event ${eventId} rejected: ${message}`);
          }
          break;
        }
        case 'NOTICE': {
          console.log(`[NostrClient] NOTICE: ${args[0]}`);
          break;
        }
      }
    } catch {
      // Malformed message, ignore
    }
  }

  /**
   * Subscribe to events matching filters.
   * Returns a subscription ID that can be used to unsubscribe.
   */
  subscribe(
    filters: Record<string, unknown>[],
    callback: NostrEventCallback
  ): string {
    const id = `bridge_${crypto.randomBytes(8).toString('hex')}`;
    const sub: Subscription = { id, filters, callback };
    this.subscriptions.set(id, sub);

    if (this.connected) {
      this.sendSubscription(sub);
    }

    return id;
  }

  private sendSubscription(sub: Subscription): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg = JSON.stringify(['REQ', sub.id, ...sub.filters]);
    this.ws.send(msg);
    console.log(`[NostrClient] Subscribed: ${sub.id} with ${sub.filters.length} filter(s)`);
  }

  /** Unsubscribe from a subscription */
  unsubscribe(id: string): void {
    this.subscriptions.delete(id);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(['CLOSE', id]));
    }
  }

  /** Publish an event to the relay */
  async publish(event: Event): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to relay');
    }

    this.ws.send(JSON.stringify(['EVENT', event]));
  }

  /** Check if connected */
  isConnected(): boolean {
    return this.connected;
  }

  /** Disconnect from the relay */
  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

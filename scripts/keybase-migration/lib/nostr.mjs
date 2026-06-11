// Nostr key handling, NIP-98 admin calls, and websocket publishing against
// the DreamLab relay. Mirrors scripts/seed/seed-forum-zones.mjs.

import { createHash } from 'node:crypto';
import { finalizeEvent, getPublicKey, generateSecretKey } from 'nostr-tools/pure';
import * as nip19 from 'nostr-tools/nip19';

export const RELAY_HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
export const RELAY_WS = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';

export const nowSec = () => Math.floor(Date.now() / 1000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const toHex = (b) => Buffer.from(b).toString('hex');

export function newIdentity() {
  const skBytes = generateSecretKey();
  const pk = getPublicKey(skBytes);
  return { sk: toHex(skBytes), pk, npub: nip19.npubEncode(pk), nsec: nip19.nsecEncode(skBytes) };
}

// Accepts 64-char hex or an nsec1… bech32 string.
export function skFromInput(input) {
  const s = String(input || '').trim();
  if (/^[0-9a-f]{64}$/i.test(s)) return Uint8Array.from(Buffer.from(s, 'hex'));
  if (s.startsWith('nsec1')) {
    const { type, data } = nip19.decode(s);
    if (type !== 'nsec') throw new Error('not an nsec key');
    return data;
  }
  throw new Error('expected 64-char hex privkey or nsec1…');
}

export const pkOf = (skBytes) => getPublicKey(skBytes);
export const finalize = (skBytes, template) => finalizeEvent(template, skBytes);

// ── NIP-98 signed HTTP (admin endpoints) ────────────────────────────────────
export function nip98Header(skBytes, url, method, bodyStr) {
  const tags = [['u', url], ['method', method]];
  if (bodyStr) tags.push(['payload', createHash('sha256').update(bodyStr).digest('hex')]);
  const ev = finalizeEvent({ kind: 27235, created_at: nowSec(), tags, content: '' }, skBytes);
  return 'Nostr ' + Buffer.from(JSON.stringify(ev)).toString('base64');
}

export async function adminPost(skBytes, path, body) {
  const url = RELAY_HTTP + path;
  const bodyStr = JSON.stringify(body);
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: nip98Header(skBytes, url, 'POST', bodyStr), 'Content-Type': 'application/json' },
    body: bodyStr,
  });
  const json = await r.json().catch(() => ({}));
  if (r.status >= 400) throw new Error(`${path} -> ${r.status} ${JSON.stringify(json).slice(0, 200)}`);
  return { status: r.status, json };
}

// ── Websocket publisher ─────────────────────────────────────────────────────
// Sends events in paced windows and awaits the relay's OK acks.
// "duplicate" rejections count as success (idempotent re-runs).
export class RelayPublisher {
  constructor(log = () => {}) {
    this.log = log;
    this.ws = null;
    this.pending = new Map(); // event id -> {resolve}
  }

  async ensure() {
    if (this.ws && this.ws.readyState === 1) return;
    await new Promise((resolve, reject) => {
      const ws = new WebSocket(RELAY_WS);
      const timer = setTimeout(() => reject(new Error('relay ws connect timeout')), 15000);
      ws.onopen = () => { clearTimeout(timer); this.ws = ws; resolve(); };
      ws.onerror = (e) => { clearTimeout(timer); reject(new Error('relay ws error: ' + (e?.message || 'connect failed'))); };
      ws.onmessage = (m) => {
        let d;
        try { d = JSON.parse(m.data); } catch { return; }
        if (d[0] === 'OK') {
          const p = this.pending.get(d[1]);
          if (p) { this.pending.delete(d[1]); p.resolve({ ok: d[2], msg: d[3] || '' }); }
        } else if (d[0] === 'NOTICE') {
          this.log('relay NOTICE: ' + String(d[1]).slice(0, 200));
        }
      };
      ws.onclose = () => { this.ws = null; };
    });
  }

  // Publish a batch; resolves with {okCount, failures: [{id, msg}]}.
  async publish(events, { ratePerSec = 8, onProgress } = {}) {
    const failures = [];
    let okCount = 0;
    for (let i = 0; i < events.length; i += ratePerSec) {
      const window = events.slice(i, i + ratePerSec);
      await this.ensure();
      const acks = window.map(
        (ev) =>
          new Promise((resolve) => {
            this.pending.set(ev.id, { resolve });
            this.ws.send(JSON.stringify(['EVENT', ev]));
            setTimeout(() => {
              if (this.pending.delete(ev.id)) resolve({ ok: false, msg: 'ack timeout' });
            }, 30000);
          })
      );
      const results = await Promise.all(acks);
      results.forEach((r, j) => {
        if (r.ok || /duplicate/i.test(r.msg)) okCount += 1;
        else failures.push({ id: window[j].id, msg: r.msg });
      });
      if (onProgress) onProgress(Math.min(i + window.length, events.length));
      if (i + ratePerSec < events.length) await sleep(1000);
    }
    return { okCount, failures };
  }

  close() {
    try { this.ws?.close(); } catch { /* already closed */ }
    this.ws = null;
  }
}

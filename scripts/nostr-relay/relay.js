#!/usr/bin/env node
/**
 * Minimal NIP-01/NIP-11 Nostr relay for private LLM bridging.
 * Stores events in-memory, broadcasts to subscribers.
 *
 * Usage: node scripts/nostr-relay/relay.js [--port 7777]
 */

import { WebSocketServer } from 'ws';
import { createHash } from 'crypto';
import http from 'http';
import { verifyEvent as ntVerifyEvent } from 'nostr-tools';

const PORT = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--port') || '7777', 10);

// In-memory event store (Map<id, event>)
const events = new Map();

// Active subscriptions: Map<ws, Map<subId, filters[]>>
const subscriptions = new Map();

// NIP-11 relay info
const RELAY_INFO = {
  name: 'DreamLab Private Relay',
  description: 'Private Nostr relay for LLM bridging',
  pubkey: '',
  contact: '',
  supported_nips: [1, 11],
  software: 'dreamlab-private-relay',
  version: '0.1.0',
};

function verifyEvent(event) {
  if (!event || typeof event !== 'object') return false;
  if (!event.id || !event.pubkey || !event.sig) return false;
  if (typeof event.kind !== 'number') return false;
  if (!Array.isArray(event.tags)) return false;
  if (typeof event.content !== 'string') return false;

  try {
    return ntVerifyEvent(event);
  } catch {
    return false;
  }
}

function matchesFilter(event, filter) {
  if (filter.ids && !filter.ids.some((id) => event.id.startsWith(id))) return false;
  if (filter.authors && !filter.authors.some((a) => event.pubkey.startsWith(a))) return false;
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
  if (filter.since && event.created_at < filter.since) return false;
  if (filter.until && event.created_at > filter.until) return false;

  for (const [key, values] of Object.entries(filter)) {
    if (key.startsWith('#') && key.length === 2) {
      const tagName = key[1];
      const eventTagValues = event.tags.filter((t) => t[0] === tagName).map((t) => t[1]);
      if (!values.some((v) => eventTagValues.includes(v))) return false;
    }
  }
  return true;
}

function send(ws, msg) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(msg));
  }
}

function handleEvent(ws, event) {
  if (!verifyEvent(event)) {
    send(ws, ['OK', event?.id || '', false, 'invalid: signature verification failed']);
    return;
  }

  if (events.has(event.id)) {
    send(ws, ['OK', event.id, true, 'duplicate: already have this event']);
    return;
  }

  events.set(event.id, event);

  if (events.size > 10000) {
    const oldest = [...events.keys()].slice(0, events.size - 10000);
    oldest.forEach((k) => events.delete(k));
  }

  send(ws, ['OK', event.id, true, '']);

  for (const [clientWs, clientSubs] of subscriptions) {
    if (clientWs === ws && clientWs.readyState !== 1) continue;
    for (const [subId, filters] of clientSubs) {
      if (filters.some((f) => matchesFilter(event, f))) {
        send(clientWs, ['EVENT', subId, event]);
      }
    }
  }

  console.log(
    `[EVENT] kind=${event.kind} id=${event.id.slice(0, 8)}.. from=${event.pubkey.slice(0, 8)}.. content=${event.content.slice(0, 60)}`
  );
}

function handleReq(ws, subId, ...filters) {
  if (!subscriptions.has(ws)) subscriptions.set(ws, new Map());
  subscriptions.get(ws).set(subId, filters);

  let count = 0;
  const limit = filters.reduce((min, f) => Math.min(min, f.limit || 500), 500);
  const sorted = [...events.values()].sort((a, b) => b.created_at - a.created_at);

  for (const event of sorted) {
    if (count >= limit) break;
    if (filters.some((f) => matchesFilter(event, f))) {
      send(ws, ['EVENT', subId, event]);
      count++;
    }
  }

  send(ws, ['EOSE', subId]);
  console.log(`[REQ] sub=${subId} filters=${filters.length} sent=${count}`);
}

function handleClose(ws, subId) {
  const subs = subscriptions.get(ws);
  if (subs) {
    subs.delete(subId);
    send(ws, ['CLOSED', subId, '']);
  }
}

const server = http.createServer((req, res) => {
  if (req.headers.accept === 'application/nostr+json') {
    res.writeHead(200, {
      'Content-Type': 'application/nostr+json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(RELAY_INFO));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(
    `DreamLab Private Relay\nEvents: ${events.size}\nClients: ${subscriptions.size}\n`
  );
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const addr = req.socket.remoteAddress;
  console.log(`[CONN] Client connected from ${addr}`);
  subscriptions.set(ws, new Map());

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      send(ws, ['NOTICE', 'invalid JSON']);
      return;
    }

    if (!Array.isArray(msg) || msg.length < 2) {
      send(ws, ['NOTICE', 'invalid message format']);
      return;
    }

    switch (msg[0]) {
      case 'EVENT':
        handleEvent(ws, msg[1]);
        break;
      case 'REQ':
        handleReq(ws, msg[1], ...msg.slice(2));
        break;
      case 'CLOSE':
        handleClose(ws, msg[1]);
        break;
      default:
        send(ws, ['NOTICE', `unknown message type: ${msg[0]}`]);
    }
  });

  ws.on('close', () => {
    subscriptions.delete(ws);
    console.log(`[DISC] Client disconnected from ${addr}`);
  });

  ws.on('error', (err) => {
    console.error(`[ERR] ${addr}: ${err.message}`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[RELAY] DreamLab Private Relay listening on ws://0.0.0.0:${PORT}`);
  console.log(`[RELAY] NIP-11 info at http://0.0.0.0:${PORT} (Accept: application/nostr+json)`);
  console.log(`[RELAY] Events in memory: ${events.size}`);
});

process.on('SIGINT', () => {
  console.log('\n[RELAY] Shutting down...');
  wss.close();
  server.close();
  process.exit(0);
});

# Nostr Relay API — nostr-relay (TypeScript, not ported)

## Overview

Private whitelist-only Nostr relay on Cloudflare Workers with Durable Objects for
WebSocket management. Stays TypeScript due to WebSocket Hibernation API not being
exposed in `workers-rs` v0.7.5.

**WebSocket**: `wss://dreamlab-nostr-relay.<account>.workers.dev`

## NIP-11 Relay Info

`GET /` with `Accept: application/nostr+json` returns relay metadata:
supported NIPs (1, 11, 16, 33, 98), limits (64KB content, 2000 tags, 20
subscriptions, 10 filters, 1000 result limit), restricted writes.

## WebSocket Protocol (NIP-01)

**Client -> Server**: `["EVENT", {...}]`, `["REQ", "sub-id", {...filters}]`, `["CLOSE", "sub-id"]`
**Server -> Client**: `["EVENT", "sub-id", {...}]`, `["EOSE", "sub-id"]`, `["OK", "id", bool, "msg"]`, `["NOTICE", "msg"]`

## Event Processing

1. Rate limit check (10 events/sec per IP)
2. Structure validation (types, lengths, tag limits)
3. Whitelist check (skip for kind 0 profile and kind 9024 registration)
4. Event ID verification (SHA-256 of NIP-01 canonical serialization)
5. Schnorr signature verification (`@noble/curves/secp256k1`)
6. NIP-16 treatment: regular (store), replaceable (upsert), ephemeral (broadcast only), parameterized replaceable (upsert by d-tag)
7. Store in D1, broadcast to matching subscriptions

## Admin Endpoints (NIP-98 Protected)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/whitelist/add` | POST | Add user: `{ "pubkey": "...", "cohorts": ["approved"] }` |
| `/api/whitelist/list` | GET | List users: `?limit=20&offset=0&cohort=staff` |
| `/api/check-whitelist` | GET | Check status: `?pubkey=<hex>` (public) |
| `/api/whitelist/update-cohorts` | POST | Update cohorts: `{ "pubkey": "...", "cohorts": [...] }` |

Admin = `ADMIN_PUBKEYS` env var OR `admin` cohort in D1 whitelist.

## D1 Schema

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY, pubkey TEXT NOT NULL, created_at INTEGER NOT NULL,
  kind INTEGER NOT NULL, tags TEXT NOT NULL, content TEXT NOT NULL,
  sig TEXT NOT NULL, d_tag TEXT DEFAULT '', received_at INTEGER NOT NULL
);
CREATE TABLE whitelist (
  pubkey TEXT PRIMARY KEY, cohorts TEXT NOT NULL, added_at INTEGER NOT NULL,
  added_by TEXT, expires_at INTEGER
);
```

## Durable Objects: NostrRelayDO

Single instance (named `"main"`) handles all WebSocket connections using the
Hibernation API (releases memory between messages). Internal state: sessions map,
per-IP rate limits (sliding window), connection counts (max 20/IP).

## Environment Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1Database | `dreamlab-relay` — events + whitelist |
| `RELAY` | DurableObjectNamespace | NostrRelayDO |
| `ADMIN_PUBKEYS` | Secret | Comma-separated admin hex pubkeys |
| `RELAY_NAME` | Var | Display name for NIP-11 |
| `ALLOWED_ORIGIN` | Secret | Primary CORS origin |

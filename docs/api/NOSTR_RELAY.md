# Nostr Relay API -- nostr-relay (TypeScript, Not Ported)

**Last updated:** 2026-03-08 | [Back to Documentation Index](../README.md)

---

## Table of Contents

- [Overview](#overview)
- [WebSocket Protocol Flow](#websocket-protocol-flow)
- [Event Processing Pipeline](#event-processing-pipeline)
- [NIP-11 Relay Information](#nip-11-relay-information)
- [Admin Endpoints](#admin-endpoints)
- [D1 Schema](#d1-schema)
- [Durable Objects](#durable-objects)
- [Environment Bindings](#environment-bindings)
- [Related Documents](#related-documents)

---

## Overview

Private whitelist-only Nostr relay on Cloudflare Workers with Durable Objects for WebSocket management. Stays TypeScript due to WebSocket Hibernation API not being exposed in `workers-rs` v0.7.5.

**WebSocket:** `wss://dreamlab-nostr-relay.<account>.workers.dev` (production: DNS route via `relay.dreamlab-ai.com`)

---

## WebSocket Protocol Flow

```mermaid
sequenceDiagram
    participant Client as Leptos Client
    participant Edge as CF Edge
    participant Worker as nostr-relay Worker
    participant DO as NostrRelayDO<br/>(Durable Object)
    participant D1 as D1: dreamlab-relay

    Client->>Edge: WSS upgrade request
    Edge->>Worker: Route to Worker
    Worker->>DO: Forward to DO (name: "main")
    DO->>DO: Check per-IP connection limit (max 20)

    alt Connection limit exceeded
        DO-->>Client: Close with reason
    else Connection accepted
        DO-->>Client: WebSocket established
    end

    Note over Client, DO: Client sends EVENT

    Client->>DO: ["EVENT", {kind, pubkey, tags, content, sig}]
    DO->>DO: Rate limit check (10/sec per IP)
    DO->>DO: Structure validation
    DO->>DO: Whitelist check
    DO->>DO: Event ID verification (SHA-256)
    DO->>DO: Schnorr signature verification
    DO->>D1: Store event (NIP-16 rules)
    DO-->>Client: ["OK", "event-id", true, ""]
    DO-->>Client: Broadcast to matching subscriptions

    Note over Client, DO: Client sends REQ

    Client->>DO: ["REQ", "sub-id", {filters...}]
    DO->>D1: Query matching events
    DO-->>Client: ["EVENT", "sub-id", {...}] (per match)
    DO-->>Client: ["EOSE", "sub-id"]

    Note over Client, DO: Client sends CLOSE

    Client->>DO: ["CLOSE", "sub-id"]
    DO->>DO: Remove subscription
    DO-->>Client: (subscription closed silently)
```

### Message Types

**Client to Server:**

| Message | Format | Description |
|---------|--------|-------------|
| EVENT | `["EVENT", <event>]` | Publish an event |
| REQ | `["REQ", "<sub-id>", <filter>, ...]` | Subscribe with filters (max 10 filters) |
| CLOSE | `["CLOSE", "<sub-id>"]` | Unsubscribe |

**Server to Client:**

| Message | Format | Description |
|---------|--------|-------------|
| EVENT | `["EVENT", "<sub-id>", <event>]` | Event matching subscription |
| EOSE | `["EOSE", "<sub-id>"]` | End of stored events |
| OK | `["OK", "<event-id>", <bool>, "<message>"]` | Event acceptance/rejection |
| NOTICE | `["NOTICE", "<message>"]` | Human-readable notice |

---

## Event Processing Pipeline

```mermaid
flowchart TD
    RECEIVE[Receive EVENT message] --> RATE[Rate Limit Check<br/>10 events/sec per IP]
    RATE -- Exceeded --> REJECT_RATE["OK: false<br/>'rate-limited'"]
    RATE -- OK --> STRUCT[Structure Validation<br/>types, lengths, tag limits]
    STRUCT -- Invalid --> REJECT_STRUCT["OK: false<br/>'invalid: ...'"]
    STRUCT -- Valid --> KIND_CHECK{Kind 0 or 9024?}

    KIND_CHECK -- Yes --> SKIP_WL[Skip whitelist<br/>Profile + registration events]
    KIND_CHECK -- No --> WL[Whitelist Check<br/>pubkey in D1 whitelist?]

    WL -- Not whitelisted --> REJECT_WL["OK: false<br/>'restricted: not whitelisted'"]
    WL -- Whitelisted --> VERIFY_ID
    SKIP_WL --> VERIFY_ID

    VERIFY_ID[Verify Event ID<br/>SHA-256 of NIP-01 canonical form] --> ID_OK{ID matches?}
    ID_OK -- No --> REJECT_ID["OK: false<br/>'invalid: bad event id'"]
    ID_OK -- Yes --> VERIFY_SIG[Verify Schnorr Signature<br/>noble/curves secp256k1]
    VERIFY_SIG --> SIG_OK{Signature valid?}
    SIG_OK -- No --> REJECT_SIG["OK: false<br/>'invalid: bad signature'"]

    SIG_OK -- Yes --> NIP16{NIP-16 Classification}

    NIP16 --> REGULAR[Regular Event<br/>kinds 1, 4, 7, ...]
    NIP16 --> REPLACEABLE[Replaceable Event<br/>kinds 0, 3, 10000-19999]
    NIP16 --> EPHEMERAL[Ephemeral Event<br/>kinds 20000-29999]
    NIP16 --> PARAM_REPLACE[Parameterized Replaceable<br/>kinds 30000-39999]

    REGULAR --> STORE[Store in D1]
    REPLACEABLE --> UPSERT[Upsert in D1<br/>by pubkey + kind]
    EPHEMERAL --> BROADCAST_ONLY[Broadcast only<br/>do not store]
    PARAM_REPLACE --> UPSERT_D[Upsert in D1<br/>by pubkey + kind + d-tag]

    STORE --> BROADCAST[Broadcast to<br/>matching subscriptions]
    UPSERT --> BROADCAST
    BROADCAST_ONLY --> BROADCAST
    UPSERT_D --> BROADCAST
    BROADCAST --> OK_TRUE["OK: true"]
```

---

## NIP-11 Relay Information

`GET /` with `Accept: application/nostr+json` returns relay metadata:

```json
{
  "name": "<RELAY_NAME>",
  "description": "DreamLab AI private community relay",
  "supported_nips": [1, 11, 16, 33, 98],
  "software": "dreamlab-nostr-relay",
  "limitation": {
    "max_message_length": 65536,
    "max_subscriptions": 20,
    "max_filters": 10,
    "max_limit": 1000,
    "max_event_tags": 2000,
    "auth_required": false,
    "payment_required": false,
    "restricted_writes": true
  }
}
```

---

## Admin Endpoints

All admin endpoints require NIP-98 authentication from a pubkey listed in `ADMIN_PUBKEYS` or with `"admin"` in their D1 whitelist `cohorts` column.

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/whitelist/add` | POST | `{ "pubkey": "<hex>", "cohorts": ["approved"] }` | `{ "status": "added" }` |
| `/api/whitelist/list` | GET | Query: `?limit=20&offset=0&cohort=staff` | `{ "users": [...], "total": N }` |
| `/api/check-whitelist` | GET | Query: `?pubkey=<hex>` (public, no auth) | `{ "whitelisted": true, "cohorts": [...] }` |
| `/api/whitelist/update-cohorts` | POST | `{ "pubkey": "<hex>", "cohorts": ["staff", "approved"] }` | `{ "status": "updated" }` |

---

## D1 Schema

```mermaid
erDiagram
    EVENTS {
        TEXT id PK "SHA-256 event hash"
        TEXT pubkey "Author hex pubkey"
        INTEGER created_at "Unix timestamp"
        INTEGER kind "NIP-01 event kind"
        TEXT tags "JSON array of tag arrays"
        TEXT content "Event content"
        TEXT sig "64-byte Schnorr signature hex"
        TEXT d_tag "NIP-33 d-tag value or empty"
        INTEGER received_at "Server receive timestamp"
    }

    WHITELIST {
        TEXT pubkey PK "User hex pubkey"
        TEXT cohorts "JSON array: approved, staff, admin, etc."
        INTEGER added_at "Unix timestamp"
        TEXT added_by "Admin pubkey who added this user"
        INTEGER expires_at "Optional expiry timestamp"
    }

    WHITELIST ||--o{ EVENTS : "authorizes publishing"
```

**SQL:**

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  kind INTEGER NOT NULL,
  tags TEXT NOT NULL,
  content TEXT NOT NULL,
  sig TEXT NOT NULL,
  d_tag TEXT DEFAULT '',
  received_at INTEGER NOT NULL
);

CREATE TABLE whitelist (
  pubkey TEXT PRIMARY KEY,
  cohorts TEXT NOT NULL,
  added_at INTEGER NOT NULL,
  added_by TEXT,
  expires_at INTEGER
);
```

---

## Durable Objects

### NostrRelayDO

Single instance (named `"main"`) handles all WebSocket connections using the Hibernation API, which releases memory between messages for cost efficiency.

```mermaid
graph TD
    subgraph "NostrRelayDO Instance (main)"
        SESSIONS[Sessions Map<br/>WebSocket -> session state]
        RATE_LIMITS[Per-IP Rate Limits<br/>Sliding window, 10 events/sec]
        CONN_COUNTS[Connection Counts<br/>Max 20 per IP]
        SUBS[Subscriptions<br/>Max 20 per WebSocket]
    end

    WS1[Client WebSocket 1] --> SESSIONS
    WS2[Client WebSocket 2] --> SESSIONS
    WS3[Client WebSocket N] --> SESSIONS

    SESSIONS --> HIBERNATE[Hibernation API<br/>Memory freed between messages]
```

**Internal state per session:**
- WebSocket handle
- Client IP address
- Active subscriptions (filter sets)
- Last event timestamps (for rate limiting)

---

## Environment Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1Database | `dreamlab-relay` -- events + whitelist |
| `RELAY` | DurableObjectNamespace | NostrRelayDO |
| `ADMIN_PUBKEYS` | Secret | Comma-separated admin hex pubkeys |
| `RELAY_NAME` | Var | Display name for NIP-11 |
| `ALLOWED_ORIGIN` | Secret | Primary CORS origin |

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Auth API](AUTH_API.md) | WebAuthn registration provisions relay whitelist entries |
| [Security Overview](../security/SECURITY_OVERVIEW.md) | Zone-based access control, input validation limits |
| [Authentication](../security/AUTHENTICATION.md) | NIP-98 token format and verification |
| [Search API](SEARCH_API.md) | Vector search over relay events |
| [Cloudflare Workers](../deployment/CLOUDFLARE_WORKERS.md) | D1 database and DO configuration |
| [Deployment Overview](../deployment/README.md) | CI/CD, environments, DNS |

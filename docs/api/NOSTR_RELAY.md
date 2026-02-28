# Nostr Relay WebSocket API

**Last Updated:** 2026-02-28

WebSocket API for the DreamLab AI Nostr relay. Implements NIP-01 (basic protocol), NIP-16 (event treatment), NIP-28 (public channels), NIP-33 (parameterised replaceable events), NIP-42 (authentication), and NIP-98 (HTTP auth).

**Protocol**: WebSocket (RFC 6455)
**Transport**: WSS (TLS-encrypted)
**Database**: PostgreSQL 15 with JSONB indexing
**Deployment**: GCP Cloud Run (always-on, 1 instance, 3600s timeout)

---

## Connection

### WebSocket Connection

```javascript
const ws = new WebSocket('wss://<relay-url>');

ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => {
  const message = JSON.parse(e.data);
  // Handle relay messages
};
ws.onerror = (err) => console.error('Error:', err);
ws.onclose = () => console.log('Disconnected');
```

### Connection Parameters

| Parameter | Value |
|-----------|-------|
| Connect timeout | 10 seconds |
| Auth timeout | 5 seconds |
| Publish timeout | 5 seconds |
| Subscribe timeout | 30 seconds |
| Max WebSocket connections | 10 per IP |

---

## Message Types

All messages are JSON arrays with a type identifier as the first element.

### Client to Relay

#### EVENT -- Publish Event

```json
["EVENT", {
  "id": "<64-char-hex-sha256>",
  "pubkey": "<64-char-hex>",
  "created_at": 1740700000,
  "kind": 1,
  "tags": [
    ["e", "<referenced-event-id>"],
    ["p", "<mentioned-pubkey>"]
  ],
  "content": "Hello from DreamLab",
  "sig": "<128-char-hex-schnorr-signature>"
}]
```

**Response**:
```json
["OK", "<event-id>", true, ""]
```

#### REQ -- Subscribe to Events

```json
["REQ", "<subscription-id>", {
  "kinds": [1],
  "authors": ["<pubkey>"],
  "since": 1740700000,
  "limit": 100
}]
```

**Response**: matching events followed by EOSE:
```json
["EVENT", "<subscription-id>", { ...event }]
["EOSE", "<subscription-id>"]
```

#### CLOSE -- Close Subscription

```json
["CLOSE", "<subscription-id>"]
```

#### AUTH -- Authentication Response (NIP-42)

```json
["AUTH", {
  "kind": 22242,
  "pubkey": "<pubkey>",
  "created_at": 1740700000,
  "tags": [
    ["relay", "wss://<relay-url>"],
    ["challenge", "<challenge-string>"]
  ],
  "content": "",
  "sig": "<schnorr-signature>"
}]
```

### Relay to Client

| Message | Format | Description |
|---------|--------|-------------|
| EVENT | `["EVENT", "<sub-id>", { ...event }]` | Matching event data |
| OK | `["OK", "<event-id>", true/false, "<message>"]` | Command result |
| EOSE | `["EOSE", "<sub-id>"]` | End of stored events |
| NOTICE | `["NOTICE", "<message>"]` | Human-readable notice |
| AUTH | `["AUTH", "<challenge>"]` | Authentication challenge |

---

## NIP Support

### NIP-01: Basic Protocol

Core event structure, subscription filters, and message types.

### NIP-16: Event Treatment

| Kind Range | Behaviour | Storage |
|-----------|-----------|---------|
| 1-9999 (regular) | Stored permanently | All events kept |
| 0, 3, 10000-19999 (replaceable) | Latest only | Older by same pubkey/kind deleted |
| 20000-29999 (ephemeral) | Broadcast only | Not persisted |
| 30000-39999 (parameterised replaceable) | Latest by `d` tag | Older by pubkey/kind/d-tag deleted |

### NIP-28: Public Channels

| Kind | Purpose |
|------|---------|
| 40 | Channel creation |
| 41 | Channel metadata |
| 42 | Channel message |
| 43 | Hide message |
| 44 | Mute user |

### NIP-42: Authentication

Challenge-response authentication for WebSocket connections.

1. Client connects via WebSocket
2. Relay sends `["AUTH", "<challenge>"]`
3. Client signs kind 22242 event with relay URL and challenge
4. Relay verifies signature and marks connection as authenticated

### NIP-98: HTTP Auth

NIP-98 tokens are used for authenticated HTTP endpoints on the relay (if any). See [Auth API Reference](./AUTH_API.md) for the NIP-98 header format specification.

---

## Filters

### Filter Parameters

```typescript
{
  ids?: string[];          // Event IDs (prefix matching)
  kinds?: number[];        // Event kinds
  authors?: string[];      // Author pubkeys (prefix matching)
  since?: number;          // Unix timestamp (inclusive)
  until?: number;          // Unix timestamp (inclusive)
  limit?: number;          // Max events to return (max: 5000)
  "#e"?: string[];         // Events referenced in tags
  "#p"?: string[];         // Pubkeys referenced in tags
  "#h"?: string[];         // Channel IDs referenced in tags
}
```

### Examples

**Recent text notes**:
```json
{ "kinds": [1], "since": 1740700000, "limit": 50 }
```

**User's posts**:
```json
{ "kinds": [1], "authors": ["<pubkey>"], "limit": 100 }
```

**Replies to an event**:
```json
{ "kinds": [1], "#e": ["<parent-event-id>"], "limit": 50 }
```

**Channel messages**:
```json
{ "kinds": [42], "#h": ["<channel-id>"], "limit": 100 }
```

---

## Event Validation

### Event ID Verification

The event ID must be the SHA-256 hash of the NIP-01 canonical serialisation:

```
SHA-256(JSON.stringify([0, pubkey, created_at, kind, tags, content]))
```

Events with mismatched IDs are rejected.

### Signature Verification

All events must carry a valid 64-byte Schnorr signature (BIP-340) over the event ID, verifiable with the event's pubkey.

### Rate Limits

| Limit | Value |
|-------|-------|
| Events per second per IP | 10 |
| Max connections per IP | 10 |
| Max events per query | 5000 |
| Database connection pool | 20 max, 30s idle timeout |

---

## Database Schema

### events Table

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  pubkey TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  kind INTEGER NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  content TEXT NOT NULL,
  sig TEXT NOT NULL,
  received_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

CREATE INDEX idx_pubkey ON events(pubkey);
CREATE INDEX idx_kind ON events(kind);
CREATE INDEX idx_created_at ON events(created_at DESC);
CREATE INDEX idx_kind_created ON events(kind, created_at DESC);
CREATE INDEX idx_tags ON events USING GIN(tags);
```

### whitelist Table

```sql
CREATE TABLE whitelist (
  pubkey TEXT PRIMARY KEY,
  cohorts JSONB NOT NULL DEFAULT '[]'::jsonb,
  added_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  added_by TEXT,
  expires_at BIGINT,
  notes TEXT
);

CREATE INDEX idx_whitelist_cohorts ON whitelist USING GIN(cohorts);
```

---

## Error Messages

| Message | Cause | Solution |
|---------|-------|---------|
| `error: invalid signature` | Schnorr signature verification failed | Regenerate signature |
| `error: invalid event id` | Event ID does not match SHA-256 hash | Recalculate event ID |
| `error: rate limited` | Too many requests from this IP | Wait and retry |
| `error: blocked` | Pubkey not whitelisted | Contact admin |
| `error: duplicate` | Event already stored | No action needed |
| `error: invalid filter` | Malformed subscription filter | Check filter syntax |

---

## Client Libraries

### NDK (Nostr Dev Kit)

```bash
npm install @nostr-dev-kit/ndk
```

```typescript
import NDK from '@nostr-dev-kit/ndk';

const ndk = new NDK({
  explicitRelayUrls: ['wss://<relay-url>'],
});

await ndk.connect();
```

NDK handles NIP-42 authentication automatically when configured with a signer.

---

## Related Documentation

- [Auth API Reference](./AUTH_API.md) -- WebAuthn and NIP-98 endpoints
- [Embedding Service](./EMBEDDING_SERVICE.md) -- Semantic search API
- [Cloud Services Deployment](../deployment/CLOUD_SERVICES.md) -- Relay deployment details
- [Security Overview](../security/SECURITY_OVERVIEW.md) -- Security architecture

---

## Protocol References

- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-16: Event Treatment](https://github.com/nostr-protocol/nips/blob/master/16.md)
- [NIP-28: Public Chat](https://github.com/nostr-protocol/nips/blob/master/28.md)
- [NIP-33: Parameterised Replaceable Events](https://github.com/nostr-protocol/nips/blob/master/33.md)
- [NIP-42: Authentication](https://github.com/nostr-protocol/nips/blob/master/42.md)
- [NIP-98: HTTP Auth](https://github.com/nostr-protocol/nips/blob/master/98.md)

---

*Last major revision: 2026-02-28.*

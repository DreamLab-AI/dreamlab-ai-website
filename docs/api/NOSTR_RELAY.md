# Nostr Relay WebSocket API

## Overview

The Fairfield Nostr relay implements the Nostr protocol (NIP-01) with comprehensive support for authentication (NIP-42), event treatment (NIP-16), parameterized events (NIP-33), and HTTP authentication (NIP-98). The relay uses WebSocket for bidirectional communication and supports whitelist-controlled access with PostgreSQL persistence.

**Base URL**: `wss://nostr-relay-617806532906.us-central1.run.app`
**Protocol**: WebSocket (RFC 6455)
**Database**: PostgreSQL 14+ with JSONB support
**Authentication**: NIP-98 HTTP Auth, whitelist-based access control

## Connection

### WebSocket Connection

```javascript
const ws = new WebSocket('wss://nostr-relay-617806532906.us-central1.run.app');

ws.onopen = () => {
  console.log('Connected to relay');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Handle relay messages
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from relay');
};
```

### Connection States

| State | Description |
|-------|-------------|
| `disconnected` | Not connected to relay |
| `connecting` | Connection in progress |
| `connected` | WebSocket connection established |
| `auth-required` | Relay requires authentication |
| `authenticating` | Sending AUTH event |
| `authenticated` | Successfully authenticated |
| `auth-failed` | Authentication failed |
| `error` | Connection error |

### Connection Configuration

```typescript
{
  connectTimeout: 10000,    // 10 seconds
  authTimeout: 5000,        // 5 seconds
  publishTimeout: 5000,     // 5 seconds
  subscribeTimeout: 30000   // 30 seconds
}
```

## Message Types

All messages are JSON arrays with a type identifier as the first element.

### Client → Relay Messages

#### 1. EVENT - Publish Event

```json
["EVENT", {
  "id": "event_id_hex",
  "pubkey": "author_pubkey_hex",
  "created_at": 1234567890,
  "kind": 1,
  "tags": [
    ["e", "referenced_event_id"],
    ["p", "mentioned_pubkey"]
  ],
  "content": "Hello, Nostr!",
  "sig": "signature_hex"
}]
```

**Response**:
```json
["OK", "event_id", true, ""]
```

or on failure:
```json
["OK", "event_id", false, "error: invalid signature"]
```

#### 2. REQ - Subscribe to Events

```json
["REQ", "subscription_id", {
  "kinds": [1],
  "authors": ["pubkey_hex"],
  "since": 1234567890,
  "limit": 100
}]
```

**Response**: Stream of matching events followed by EOSE
```json
["EVENT", "subscription_id", {...event}]
["EVENT", "subscription_id", {...event}]
["EOSE", "subscription_id"]
```

#### 3. CLOSE - Close Subscription

```json
["CLOSE", "subscription_id"]
```

**Response**: No response, subscription is closed

#### 4. AUTH - Authentication Response (NIP-42)

Sent in response to relay AUTH challenge:

```json
["AUTH", {
  "id": "event_id",
  "pubkey": "pubkey_hex",
  "created_at": 1234567890,
  "kind": 22242,
  "tags": [
    ["relay", "wss://relay.url"],
    ["challenge", "challenge_string"]
  ],
  "content": "",
  "sig": "signature_hex"
}]
```

### Relay → Client Messages

#### 1. EVENT - Event Data

```json
["EVENT", "subscription_id", {
  "id": "event_id",
  "pubkey": "author_pubkey",
  "created_at": 1234567890,
  "kind": 1,
  "tags": [],
  "content": "Event content",
  "sig": "signature"
}]
```

#### 2. OK - Command Result

```json
["OK", "event_id", true|false, "message"]
```

#### 3. EOSE - End of Stored Events

```json
["EOSE", "subscription_id"]
```

#### 4. NOTICE - Human-Readable Message

```json
["NOTICE", "error: invalid event"]
```

#### 5. AUTH - Authentication Challenge (NIP-42)

```json
["AUTH", "random_challenge_string"]
```

## Event Kinds

### Standard Events (NIP-01)

| Kind | Name | Description |
|------|------|-------------|
| 0 | `METADATA` | User profile metadata |
| 1 | `SHORT_TEXT_NOTE` | Text note/post |
| 2 | `RECOMMEND_RELAY` | Relay recommendation |
| 3 | `CONTACTS` | Contact list |
| 4 | `ENCRYPTED_DM` | Encrypted direct message |
| 5 | `DELETION` | Event deletion request |
| 6 | `REPOST` | Repost/share event |

### Extended Events

| Kind | Name | NIP | Description |
|------|------|-----|-------------|
| 7 | `REACTION` | NIP-25 | Reaction to event (like/emoji) |
| 8 | `BADGE_AWARD` | - | Badge award |
| 40 | `CHANNEL_CREATE` | NIP-28 | Create channel |
| 41 | `CHANNEL_METADATA` | NIP-28 | Channel metadata |
| 42 | `CHANNEL_MESSAGE` | NIP-28 | Channel message |
| 43 | `CHANNEL_HIDE` | NIP-28 | Hide message |
| 44 | `CHANNEL_MUTE` | NIP-28 | Mute user |
| 1984 | `REPORT` | - | Report content |
| 9734 | `ZAP_REQUEST` | NIP-57 | Zap request |
| 9735 | `ZAP_RECEIPT` | NIP-57 | Zap receipt |
| 10000 | `MUTE_LIST` | - | Mute list |
| 10002 | `RELAY_LIST` | - | Relay list |
| 22242 | `AUTH` | NIP-42 | Authentication |
| 1059 | `GIFT_WRAP` | NIP-59 | Gift wrapped message |
| 13 | `SEALED` | NIP-59 | Sealed message |

## Filters

Filters specify which events to retrieve in REQ subscriptions.

### Filter Parameters

```typescript
{
  ids?: string[];          // Event IDs (prefix matching)
  kinds?: number[];        // Event kinds
  authors?: string[];      // Author pubkeys (prefix matching)
  since?: number;          // Unix timestamp (inclusive)
  until?: number;          // Unix timestamp (inclusive)
  limit?: number;          // Maximum events to return (max: 5000)
  "#e"?: string[];         // Events referenced in tags
  "#p"?: string[];         // Pubkeys referenced in tags
}
```

### Filter Examples

**Get recent text notes**:
```json
{
  "kinds": [1],
  "since": 1234567890,
  "limit": 50
}
```

**Get user's posts**:
```json
{
  "kinds": [1],
  "authors": ["pubkey_hex"],
  "limit": 100
}
```

**Get replies to an event**:
```json
{
  "kinds": [1],
  "#e": ["parent_event_id"],
  "limit": 50
}
```

**Get mentions of a user**:
```json
{
  "kinds": [1],
  "#p": ["mentioned_pubkey"],
  "limit": 100
}
```

## Authentication (NIP-42)

### Authentication Flow

1. Client connects to relay via WebSocket
2. Relay sends AUTH challenge: `["AUTH", "challenge_string"]`
3. Client creates kind 22242 event with relay URL and challenge
4. Client signs event and sends: `["AUTH", {...event}]`
5. Relay validates signature and marks connection as authenticated

### AUTH Event Structure

```json
{
  "id": "calculated_event_id",
  "pubkey": "user_pubkey_hex",
  "created_at": 1234567890,
  "kind": 22242,
  "tags": [
    ["relay", "wss://relay.url"],
    ["challenge", "challenge_string"]
  ],
  "content": "",
  "sig": "signature_hex"
}
```

### Example with NDK

```typescript
import NDK, { NDKEvent, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk';

const signer = new NDKPrivateKeySigner(privateKeyHex);
const ndk = new NDK({
  explicitRelayUrls: ['wss://relay.url'],
  signer
});

// NDK handles AUTH automatically
await ndk.connect();

// Relay authentication event listener
ndk.pool.on('relay:auth', (relay, challenge) => {
  console.log(`AUTH challenge from ${relay.url}: ${challenge}`);
});
```

## Publishing Events

### Event Structure

```typescript
{
  id: string;          // 32-byte hex SHA-256 hash
  pubkey: string;      // 32-byte hex public key
  created_at: number;  // Unix timestamp
  kind: number;        // Event kind
  tags: string[][];    // Array of tag arrays
  content: string;     // Arbitrary string content
  sig: string;         // 64-byte hex signature
}
```

### Publishing Flow

1. Create event object
2. Calculate event ID (SHA-256 hash of serialized event)
3. Sign event with private key (Schnorr signature)
4. Send EVENT message to relay
5. Wait for OK response

### Example: Publishing Text Note

```typescript
import { NDKEvent } from '@nostr-dev-kit/ndk';

const event = new NDKEvent(ndk);
event.kind = 1;
event.content = 'Hello, Nostr!';
event.tags = [
  ['t', 'nostr'],
  ['t', 'introduction']
];

await event.sign(signer);
await event.publish();
```

### Example: Publishing with Reply

```typescript
const reply = new NDKEvent(ndk);
reply.kind = 1;
reply.content = 'Great post!';
reply.tags = [
  ['e', parentEventId, '', 'reply'],
  ['p', parentAuthorPubkey]
];

await reply.sign(signer);
await reply.publish();
```

## Subscriptions

### Creating Subscription

```typescript
import { NDKFilter } from '@nostr-dev-kit/ndk';

const filter: NDKFilter = {
  kinds: [1],
  authors: [userPubkey],
  limit: 50
};

const subscription = ndk.subscribe(filter, {
  closeOnEose: false,  // Keep subscription open
  groupable: true       // Allow grouping with other subscriptions
});

subscription.on('event', (event) => {
  console.log('Received event:', event);
});

subscription.on('eose', () => {
  console.log('End of stored events');
});

subscription.on('close', () => {
  console.log('Subscription closed');
});
```

### Managing Subscriptions

```typescript
// Close specific subscription
subscription.stop();

// Get active subscriptions
const activeSubs = relayManager.getActiveSubscriptions();

// Close subscription by ID
relayManager.closeSubscription(subscriptionId);
```

## Database Schema

The relay stores events in PostgreSQL with the following schema:

### Events Table

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

-- Indexes for query performance
CREATE INDEX idx_pubkey ON events(pubkey);
CREATE INDEX idx_kind ON events(kind);
CREATE INDEX idx_created_at ON events(created_at DESC);
CREATE INDEX idx_kind_created ON events(kind, created_at DESC);
CREATE INDEX idx_tags ON events USING GIN(tags);
```

### Whitelist Table

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

## Error Handling

### Common Error Messages

| Message | Cause | Solution |
|---------|-------|----------|
| `error: invalid signature` | Event signature verification failed | Regenerate signature with correct private key |
| `error: invalid event id` | Event ID doesn't match hash | Recalculate event ID |
| `error: rate limited` | Too many requests | Wait before retrying |
| `error: blocked` | Pubkey not whitelisted | Contact admin for whitelist |
| `error: duplicate` | Event already exists | Event is already stored |
| `error: invalid filter` | Malformed filter | Check filter syntax |
| `AUTH timeout` | Authentication took too long | Retry connection |
| `Connection timeout` | Failed to connect | Check network and relay URL |

### Error Response Format

```json
["OK", "event_id", false, "error: detailed message"]
```

or

```json
["NOTICE", "error: detailed message"]
```

## Rate Limits

- Maximum 5000 events per query
- Connection pool: 20 connections max
- Idle timeout: 30 seconds
- Publish timeout: 5 seconds per event

## Client Libraries

### Recommended: NDK (Nostr Dev Kit)

```bash
npm install @nostr-dev-kit/ndk
npm install @nostr-dev-kit/ndk-cache-dexie  # Optional: IndexedDB cache
```

```typescript
import NDK from '@nostr-dev-kit/ndk';
import NDKCacheAdapterDexie from '@nostr-dev-kit/ndk-cache-dexie';

const cacheAdapter = new NDKCacheAdapterDexie({ dbName: 'nostr-cache' });

const ndk = new NDK({
  explicitRelayUrls: ['wss://relay.url'],
  cacheAdapter,
  enableOutboxModel: false
});

await ndk.connect();
```

## Best Practices

1. **Always validate events** before publishing
2. **Use event IDs** for deduplication
3. **Implement retry logic** with exponential backoff
4. **Cache events locally** using IndexedDB
5. **Batch subscriptions** when possible
6. **Handle AUTH challenges** automatically
7. **Close subscriptions** when no longer needed
8. **Monitor connection state** for reconnection
9. **Use NIP-42 AUTH** for authenticated operations
10. **Implement rate limiting** on client side

## Security Considerations

1. **Private keys** should never be sent to the relay
2. **Signatures** must be validated on both client and relay
3. **Event IDs** must match SHA-256 hash
4. **AUTH events** should be ephemeral and not stored
5. **TLS/SSL** (wss://) should always be used in production
6. **Input validation** on all event fields
7. **SQL injection protection** via parameterized queries
8. **Rate limiting** to prevent DoS attacks

## Event Validation

### Event ID Verification

All events must have a valid event ID that matches the SHA-256 hash of the serialised event:

```
serialised = JSON.stringify([0, pubkey, created_at, kind, tags, content])
event_id = SHA256(serialised)
```

The relay will reject events with mismatched event IDs.

### Signature Verification

All events must be signed using Schnorr signatures (64-byte hex). The relay validates:
1. Signature format (64-char hex)
2. Signature validity using the public key
3. Signature matches the event ID

### Whitelist Access Control

Events can only be published by whitelisted pubkeys. Check whitelist status:

```bash
curl https://relay.example.com/api/check-whitelist?pubkey=<pubkey>
```

Response includes:
- `isWhitelisted` - Access status
- `cohorts` - User's cohort membership
- `verifiedAt` - Verification timestamp

---

## NIP-16 Event Treatment (Storage Behavior)

The relay handles events differently based on their kind:

### Regular Events (stored permanently)
- Kinds 1-9999 (except replaceable ranges)
- Examples: text notes (1), DMs (4), reactions (7)
- **Storage**: Persisted indefinitely

### Replaceable Events (latest only)
- Kinds 0, 3, 10000-19999
- Examples: metadata (0), contacts (3), relay list (10002)
- **Storage**: Older events by same pubkey/kind deleted

### Ephemeral Events (broadcast only, not stored)
- Kinds 20000-29999
- **Storage**: Broadcast to subscribers, not persisted

### Parameterized Replaceable (by d-tag)
- Kinds 30000-39999
- Examples: long-form content (30023)
- **Storage**: Older events by pubkey/kind/d-tag deleted

---

## Database Schema

### events table

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,                -- 64-char hex event ID
  pubkey TEXT NOT NULL,               -- 64-char hex pubkey
  created_at BIGINT NOT NULL,         -- Unix timestamp
  kind INTEGER NOT NULL,              -- Event kind
  tags JSONB NOT NULL,                -- JSONB array for efficient filtering
  content TEXT NOT NULL,              -- Event content
  sig TEXT NOT NULL,                  -- 128-char hex signature
  received_at BIGINT                  -- Server receipt time
);

-- Indexes for optimal query performance
CREATE INDEX idx_pubkey ON events(pubkey);
CREATE INDEX idx_kind ON events(kind);
CREATE INDEX idx_created_at ON events(created_at DESC);
CREATE INDEX idx_tags ON events USING GIN(tags);
```

### whitelist table

```sql
CREATE TABLE whitelist (
  pubkey TEXT PRIMARY KEY,            -- 64-char hex pubkey
  cohorts JSONB NOT NULL DEFAULT '[]',-- Array of cohort names
  added_at BIGINT,                    -- Registration timestamp
  added_by TEXT,                      -- Admin who added (hex pubkey)
  expires_at BIGINT,                  -- Expiry timestamp (optional)
  notes TEXT                          -- Admin notes
);
```

---

## Performance Considerations

### Connection Pool
- Maximum 20 concurrent database connections
- Idle timeout: 30 seconds
- Connection timeout: 10 seconds

### Query Limits
- Maximum 500 events per REQ filter
- Hard limit: 5000 events per query
- Rate limiting: 10 events/second per IP address

### Indexing Strategy
- Event lookups use composite indexes (kind, created_at)
- Tag queries use GIN index on JSONB column
- Pubkey lookups are indexed for fast access

---

## Security Best Practices

1. **Always validate event signatures** before processing
2. **Check whitelist status** for every publish attempt
3. **Implement retry logic** with exponential backoff
4. **Cache verification results** to reduce database load
5. **Monitor rate limits** and implement client-side throttling
6. **Use TLS/SSL (wss://)** in production
7. **Validate event IDs** match computed hash
8. **Sanitize tag content** before using in queries

---

## Troubleshooting

### Connection Issues

**Problem**: `Connection timeout` or `Failed to connect`
- Check network connectivity
- Verify relay URL is correct (use wss:// not ws://)
- Ensure firewall allows WebSocket connections

**Problem**: `AUTH timeout`
- Retry authentication
- Check if relay supports NIP-42 AUTH
- Verify challenge string is being signed correctly

### Event Publishing Issues

**Problem**: `"invalid: event id verification failed"`
- Recalculate event ID from event data
- Ensure using SHA-256 hash
- Check event serialization format

**Problem**: `"invalid: signature verification failed"`
- Verify private key matches public key
- Check signature format (128-char hex)
- Ensure timestamp is current

**Problem**: `"blocked: pubkey not whitelisted"`
- Request whitelist approval from relay admin
- Check whitelist status endpoint
- Verify pubkey format (64-char hex)

---

## References

- [NIP-01: Basic Protocol](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-11: Relay Information](https://github.com/nostr-protocol/nips/blob/master/11.md)
- [NIP-16: Event Treatment](https://github.com/nostr-protocol/nips/blob/master/16.md)
- [NIP-33: Parameterized Replaceable Events](https://github.com/nostr-protocol/nips/blob/master/33.md)
- [NIP-42: Authentication](https://github.com/nostr-protocol/nips/blob/master/42.md)
- [NIP-98: HTTP Auth](https://github.com/nostr-protocol/nips/blob/master/98.md)
- [NDK Documentation](https://github.com/nostr-dev-kit/ndk)
- [Relay Documentation](../architecture/BACKEND_SERVICES.md) - Backend service architecture
- [Development Guide](../developer/SERVICE_DEVELOPMENT.md) - Local development setup
- [Deployment Guide](../deployment/CLOUD_SERVICES.md) - Production deployment

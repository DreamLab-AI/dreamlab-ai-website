# ADR-021: Offline-First Architecture with IndexedDB

[Back to ADR Index](README.md) | [Back to Documentation Index](../README.md)

| Field     | Value                                     |
|-----------|-------------------------------------------|
| Status    | Accepted                                  |
| Date      | 2026-03-09                                |
| Deciders  | DreamLab Engineering                      |
| Related   | PRD v4.0.0, ADR-016 (Nostr SDK)           |

## Context

The SvelteKit forum uses Dexie (IndexedDB wrapper) with 7 tables for offline
message caching, search indexing, and outgoing event queuing. The Rust forum
currently has no offline support — all data is lost on page refresh unless
re-fetched from the relay.

## Decision

Implement IndexedDB persistence via `web-sys` with a thin Rust abstraction layer.

### Object Stores
| Store | Key | Indices | Purpose |
|-------|-----|---------|---------|
| `messages` | `event_id` | `channel_id+created_at` | Channel message cache |
| `channels` | `channel_id` | `section_id` | Channel metadata |
| `profiles` | `pubkey` | `updated_at` | User profile cache (24h TTL) |
| `deletions` | `event_id` | `target_id` | Deletion event tracking |
| `outbox` | `auto_increment` | `created_at` | Queued outgoing events |

### Strategy
- **Read**: IndexedDB first → relay subscription fills gaps
- **Write**: Write to relay → on success, write to IndexedDB
- **Offline**: Queue writes to `outbox` → replay on reconnect
- **Eviction**: Messages older than 30 days purged on app start

### API Surface
```rust
pub struct ForumDb { /* IdbDatabase wrapper */ }

impl ForumDb {
    pub async fn open() -> Result<Self, JsValue>;
    pub async fn put_message(&self, msg: &CachedMessage) -> Result<(), JsValue>;
    pub async fn get_channel_messages(&self, channel_id: &str, limit: u32) -> Vec<CachedMessage>;
    pub async fn queue_outgoing(&self, event: &NostrEvent) -> Result<(), JsValue>;
    pub async fn drain_outbox(&self) -> Vec<NostrEvent>;
    pub async fn evict_old(&self, max_age_days: u32) -> Result<u32, JsValue>;
}
```

## Consequences

### Positive
- Instant page loads from cache (no relay roundtrip)
- Offline read access to cached conversations
- Outgoing messages survive page refresh
- Reduced relay load (only fetch since last cached timestamp)

### Negative
- IndexedDB API is async + callback-heavy (complex in Rust/WASM)
- Storage quota varies by browser (~50MB default)
- Schema migrations require versioned `onupgradeneeded` handlers

### Mitigations
- Wrap all IDB operations in `wasm_bindgen_futures` for ergonomic async
- Monitor quota via `navigator.storage.estimate()`
- Version the database schema (start at v1, bump on store changes)

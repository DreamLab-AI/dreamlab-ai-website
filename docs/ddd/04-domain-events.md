# Domain Events

**Last updated:** 2026-03-08 | [Back to DDD Index](README.md) | [Back to Documentation Index](../README.md)

This document distinguishes between **Nostr protocol events** (signed data structures transmitted via relays) and **application-level domain events** (state transitions within the DreamLab forum).

## Nostr Protocol Events (NIP-01)

Every Nostr event has a `kind` that determines its semantics. The DreamLab forum uses the following kinds.

### Event Kind Registry

| Kind | Name | NIP | Description |
|------|------|-----|-------------|
| 0 | ProfileMetadata | NIP-01 | User profile metadata |
| 1 | TextNote | NIP-01 | Short text note / forum post |
| 7 | Reaction | NIP-25 | Reaction to another event (`+`, `-`, emoji) |
| 13 | Seal | NIP-17 | Encrypted direct message seal |
| 14 | DirectMessage | NIP-17 | Encrypted direct message content |
| 1059 | GiftWrap | NIP-59 | Gift wrap envelope, hides sender metadata |
| 9021 | JoinRequest | Custom | Join request for a gated channel |
| 9024 | Thread | Custom | Thread / long-form post |
| 40 | ChannelCreation | NIP-28 | Channel creation |
| 41 | ChannelMetadata | NIP-28 | Channel metadata update |
| 42 | ChannelMessage | NIP-28 | Channel message |
| 43 | ChannelHideMessage | NIP-28 | Channel hide message |
| 44 | ChannelMuteUser | NIP-28 | Channel mute user |
| 10002 | RelayList | NIP-65 | Relay list metadata |
| 27235 | HttpAuth | NIP-98 | HTTP authentication token |
| 31922 | CalendarEvent | NIP-52 | Time-based calendar event |
| 31923 | CalendarDateEvent | NIP-52 | Date-based calendar event |
| 39000 | GroupMetadata | NIP-29 | Group metadata |
| 39002 | GroupMembers | NIP-29 | Group member list |

```rust
/// All Nostr event kinds used by the DreamLab forum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u32)]
pub enum EventKind {
    ProfileMetadata       = 0,
    TextNote              = 1,
    Reaction              = 7,
    Seal                  = 13,
    DirectMessage         = 14,
    GiftWrap              = 1059,
    JoinRequest           = 9021,
    Thread                = 9024,
    ChannelCreation       = 40,
    ChannelMetadata       = 41,
    ChannelMessage        = 42,
    ChannelHideMessage    = 43,
    ChannelMuteUser       = 44,
    RelayList             = 10002,
    HttpAuth              = 27235,
    CalendarEvent         = 31922,
    CalendarDateEvent     = 31923,
    GroupMetadata         = 39000,
    GroupMembers          = 39002,
}
```

### Event Structure

Every Nostr event follows the NIP-01 canonical form. The `id` field is the SHA-256 hash of the serialized array `[0, pubkey, created_at, kind, tags, content]`.

```rust
/// Wire format of a Nostr event (NIP-01 canonical).
#[derive(Serialize, Deserialize)]
pub struct NostrEventWire {
    pub id: String,          // 64-char hex SHA-256
    pub pubkey: String,      // 64-char hex
    pub created_at: u64,     // Unix seconds
    pub kind: u32,
    pub tags: Vec<Vec<String>>,
    pub content: String,
    pub sig: String,         // 128-char hex Schnorr BIP-340
}
```

## Application-Level Domain Events

These are state transitions within the DreamLab application, triggered by receiving or sending Nostr events. They drive reactive updates in the Leptos signal graph.

### Identity Domain Events

| Event | Trigger | Effect |
|-------|---------|--------|
| `UserRegistered` | Passkey registration + server verify | Creates UserIdentity, provisions Pod |
| `UserAuthenticated` | Passkey login or NIP-07 connect | Populates Session, starts relay connection |
| `UserLoggedOut` | Explicit logout or page discard | Zeros private key, clears stores |
| `ProfileUpdated` | Kind 0 event received/published | Updates Profile in UserIdentity |
| `WhitelistVerified` | Relay API response | Updates cohorts and permissions |

### Channel Domain Events

| Event | Trigger | Effect |
|-------|---------|--------|
| `ChannelCreated` | Kind 40 event | Adds channel to store |
| `ChannelMetadataUpdated` | Kind 41 or 39000 event | Updates channel name/description |
| `MessageReceived` | Kind 42 event from relay | Appends to channel message list |
| `MessageDeleted` | Kind 5 deletion event | Removes from channel message list |
| `JoinRequested` | Kind 9021 event | Adds pending request |
| `JoinApproved` | Kind 39002 member list update | Grants membership |
| `ReactionAdded` | Kind 7 event | Increments reaction count |

### DM Domain Events

| Event | Trigger | Effect |
|-------|---------|--------|
| `DirectMessageReceived` | Kind 1059 gift wrap | Decrypt, add to Conversation |
| `DirectMessageSent` | User sends DM | Encrypt, gift-wrap, publish |
| `ConversationRead` | User views conversation | Updates last_read timestamp |

### Storage Domain Events

| Event | Trigger | Effect |
|-------|---------|--------|
| `MediaUploaded` | PUT to pod-worker | Adds MediaAsset to Pod |
| `MediaDeleted` | DELETE to pod-worker | Removes MediaAsset from Pod |
| `AclUpdated` | Admin modifies ACL | Updates WacAcl rules |

## Event Flow Diagrams

### Publishing (Outbound)

```mermaid
sequenceDiagram
    participant U as User
    participant FC as forum-client
    participant NC as nostr-core
    participant RW as relay-worker

    U->>FC: User action (post, react, etc.)
    FC->>NC: Create unsigned event
    NC->>NC: Sign with private key (Schnorr BIP-340)
    NC->>NC: Compute event ID (SHA-256 of canonical JSON)
    NC-->>FC: Signed NostrEvent
    FC->>RW: Publish via WebSocket (EVENT message)
    RW->>RW: Validate NIP-01 + whitelist check
    RW-->>FC: OK / NOTICE
    RW->>RW: Broadcast to subscribers
```

### Receiving (Inbound)

```mermaid
sequenceDiagram
    participant RW as relay-worker
    participant FC as forum-client
    participant NC as nostr-core
    participant UI as Leptos UI

    RW->>FC: EVENT message via WebSocket
    FC->>NC: Validate signature + ID
    NC-->>FC: Valid event
    FC->>FC: Route by event kind
    FC->>FC: Update appropriate store (Leptos signals)
    FC-->>UI: Reactive re-render
```

### NIP-98 Auth Flow (HTTP)

```mermaid
sequenceDiagram
    participant FC as forum-client
    participant NC as nostr-core
    participant W as Worker (auth/pod)

    FC->>NC: Create kind 27235 event<br/>(URL, method, payload hash)
    NC->>NC: Sign with private key
    NC-->>FC: Base64-encoded signed event
    FC->>W: HTTP request<br/>Authorization: Nostr [base64]
    W->>W: Extract event from header
    W->>W: Verify signature + timestamp
    W->>W: Verify URL + method + payload hash
    W-->>FC: Response (200 / 401)
```

### NIP-59 Gift Wrap Flow (DMs)

```mermaid
sequenceDiagram
    participant S as Sender
    participant NC as nostr-core
    participant RW as relay-worker
    participant R as Recipient

    Note over S,R: Sending a DM

    S->>NC: Compose plaintext message
    NC->>NC: ECDH shared secret<br/>(sender privkey + recipient pubkey)
    NC->>NC: NIP-44 encrypt plaintext<br/>(ChaCha20-Poly1305)
    NC->>NC: Create kind 14 Rumor<br/>(unsigned, contains ciphertext)
    NC->>NC: Create kind 13 Seal<br/>(signed by sender, encrypts Rumor)
    NC->>NC: Create kind 1059 Gift Wrap<br/>(random throwaway key,<br/>addressed to recipient via p-tag)
    NC-->>S: Gift wrap event
    S->>RW: Publish kind 1059

    Note over S,R: Receiving a DM

    RW->>R: Deliver kind 1059 to recipient
    R->>NC: Decrypt gift wrap<br/>(recipient privkey)
    NC->>NC: Extract kind 13 Seal
    NC->>NC: Verify Seal signature<br/>(confirms sender identity)
    NC->>NC: Decrypt kind 14 Rumor<br/>(ECDH shared secret)
    NC-->>R: Plaintext in memory only
```

### NIP-44 Encryption Detail

```mermaid
graph LR
    SK["Sender Private Key"] --> ECDH["ECDH<br/>(secp256k1)"]
    RPK["Recipient Public Key"] --> ECDH
    ECDH --> SS["Shared Secret"]
    SS --> HKDF2["HKDF-SHA-256"]
    HKDF2 --> CK["Conversation Key"]
    CK --> ENC["ChaCha20-Poly1305<br/>Encrypt"]
    PT["Plaintext"] --> PAD["Pad to power-of-2"]
    PAD --> ENC
    ENC --> CT["Nip44Ciphertext<br/>(version=2, nonce, ciphertext+tag)"]
```

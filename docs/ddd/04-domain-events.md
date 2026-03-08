# Domain Events

This document distinguishes between **Nostr protocol events** (signed data
structures transmitted via relays) and **application-level domain events**
(state transitions within the DreamLab forum).

## Nostr Protocol Events (NIP-01)

Every Nostr event has a `kind` that determines its semantics. The DreamLab
forum uses the following kinds.

### Event Kind Registry

```rust
/// All Nostr event kinds used by the DreamLab forum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[repr(u32)]
pub enum EventKind {
    /// User profile metadata (NIP-01).
    ProfileMetadata       = 0,
    /// Short text note / forum post (NIP-01).
    TextNote              = 1,
    /// Relay list metadata (NIP-65).
    RelayList             = 10002,
    /// Reaction to another event (NIP-25). Content: "+", "-", or emoji.
    Reaction              = 7,
    /// Encrypted direct message seal (NIP-17).
    Seal                  = 13,
    /// Encrypted direct message content (NIP-17).
    DirectMessage         = 14,
    /// Gift wrap envelope (NIP-59). Hides sender metadata.
    GiftWrap              = 1059,
    /// Thread / long-form post (DreamLab custom).
    Thread                = 9024,
    /// Join request for a gated channel (DreamLab custom).
    JoinRequest           = 9021,
    /// Channel creation (NIP-28).
    ChannelCreation       = 40,
    /// Channel metadata update (NIP-28).
    ChannelMetadata       = 41,
    /// Channel message (NIP-28).
    ChannelMessage        = 42,
    /// Channel hide message (NIP-28).
    ChannelHideMessage    = 43,
    /// Channel mute user (NIP-28).
    ChannelMuteUser       = 44,
    /// NIP-98 HTTP authentication token.
    HttpAuth              = 27235,
    /// Time-based calendar event (NIP-52).
    CalendarEvent         = 31922,
    /// Date-based calendar event (NIP-52).
    CalendarDateEvent     = 31923,
    /// NIP-29 group metadata.
    GroupMetadata         = 39000,
    /// NIP-29 group member list.
    GroupMembers          = 39002,
}
```

### Event Structure

Every Nostr event follows the NIP-01 canonical form. The `id` field is the
SHA-256 hash of the serialized array `[0, pubkey, created_at, kind, tags, content]`.

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

These are state transitions within the DreamLab application, triggered by
receiving or sending Nostr events. They drive reactive updates in the Leptos
signal graph.

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

## Event Flow

### Publishing (Outbound)

```
User action
  -> forum-client creates unsigned event
  -> nostr-core signs with private key (Schnorr BIP-340)
  -> nostr-core computes event ID (SHA-256 of canonical JSON)
  -> nostr-sdk publishes to relay pool
  -> relay validates (NIP-01 + whitelist check)
  -> relay broadcasts to subscribers
```

### Receiving (Inbound)

```
Relay sends EVENT message
  -> nostr-sdk receives via WebSocket
  -> nostr-core validates signature + ID
  -> forum-client event pipeline routes by kind
  -> Appropriate store updates (Leptos signals)
  -> UI reactively re-renders
```

### NIP-98 Auth Flow (HTTP)

```
forum-client needs authenticated HTTP call
  -> nostr-core creates kind 27235 event with URL, method, payload hash
  -> Signs with private key
  -> Base64-encodes signed event
  -> Sends as Authorization: Nostr <base64>
  -> Worker extracts event, verifies signature + timestamp + URL + method + payload
  -> Worker processes request if valid
```

### NIP-44 Encryption Flow (DMs)

```
Sender composes DM
  -> nostr-core derives shared secret (ECDH: sender privkey + recipient pubkey)
  -> nostr-core encrypts plaintext (ChaCha20-Poly1305)
  -> Creates kind 14 event with ciphertext
  -> Wraps in kind 13 seal (signed by sender)
  -> Wraps in kind 1059 gift wrap (random throwaway key, addressed to recipient)
  -> Publishes gift wrap to relay

Recipient receives kind 1059
  -> Unwraps gift wrap (decrypt with recipient privkey)
  -> Verifies kind 13 seal signature (confirms sender)
  -> Decrypts kind 14 content (ECDH shared secret)
  -> Plaintext available in memory only
```

# DDD: Forum Parity Sprint — Bounded Contexts

## Domain Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    DreamLab Forum Domain                        │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Identity  │  │Messaging │  │  Forum   │  │  Social  │       │
│  │ Context   │──│ Context  │──│ Context  │──│ Context  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│       │              │              │              │            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Access   │  │  Media   │  │ Calendar │  │Rendering │       │
│  │ Context   │  │ Context  │  │ Context  │  │ Context  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│       │                                          │             │
│  ┌──────────┐                              ┌──────────┐       │
│  │  Admin   │                              │ Offline  │       │
│  │ Context  │                              │ Context  │       │
│  └──────────┘                              └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Bounded Contexts

### 1. Identity Context
**Aggregate Root**: `AuthStore`
**Entities**: User, Session, Credential
**Value Objects**: Pubkey, PrivkeyMem, PRFSalt, Mnemonic

| Capability | Status | Sprint Work |
|-----------|--------|-------------|
| Passkey registration | Done | — |
| Passkey login | Done | — |
| nsec/hex login | Done | — |
| NIP-07 extension | Stub | Implement `window.nostr` binding |
| Session persist | Done | — |
| BIP39 mnemonic | Missing | One-time display component |
| nsec backup | Missing | One-time download component |

**Domain Events**: UserRegistered, UserLoggedIn, SessionRestored, KeyZeroized

### 2. Messaging Context
**Aggregate Root**: `ChannelMessages`
**Entities**: Message, Reaction, PinnedMessage, Draft
**Value Objects**: EventId, Content, Timestamp, ReplyRef

| Capability | Status | Sprint Work |
|-----------|--------|-------------|
| Send/receive messages | Done | — |
| Reactions (kind 7) | Done | — |
| Reply/quote | Done | — |
| Typing indicator | Done | — |
| Message deletion (NIP-09) | Missing | Kind 5/9005, soft-delete UI |
| Pinned messages | Missing | Pin action, banner component |
| Draft persistence | Missing | localStorage auto-save |
| Message export | Missing | JSON/CSV download |
| Read position | Missing | Per-channel tracking + badge |

**Domain Events**: MessageSent, MessageDeleted, MessagePinned, DraftSaved, PositionUpdated

### 3. Forum Context
**Aggregate Root**: `ForumHierarchy`
**Entities**: Category, Section, Channel
**Value Objects**: ZoneLevel, CohortId, ChannelMetadata

| Capability | Status | Sprint Work |
|-----------|--------|-------------|
| Category/Section/Channel | Done | — |
| Breadcrumbs | Done | — |
| NIP-29 groups | Missing | Full kind set implementation |
| Board stats | Missing | Stats aggregation components |
| Top posters | Missing | Leaderboard component |
| Activity graph | Missing | WebGPU/Canvas chart |
| Welcome modal | Missing | First-time onboarding |
| Moderator display | Missing | Role-aware team list |

**Domain Events**: ChannelCreated, SectionAccessed, GroupJoined

### 4. Social Context
**Aggregate Root**: `UserProfile`
**Entities**: Profile, Bookmark, MutedEntity
**Value Objects**: Nickname, Avatar, Bio, DisplayName

| Capability | Status | Sprint Work |
|-----------|--------|-------------|
| Profile view | Done | — |
| Profile edit | Done | — |
| Bookmarks | Done | — |
| Mute users | Done | — |
| Mute channels | Missing | Channel-level mute toggle |

**Domain Events**: ProfileUpdated, UserMuted, ChannelMuted, BookmarkAdded

### 5. Access Context
**Aggregate Root**: `ZoneAccess`
**Entities**: Whitelist, CohortMembership, JoinRequest, SectionRequest
**Value Objects**: Zone (0-3), CohortId, AccessDecision

| Capability | Status | Sprint Work |
|-----------|--------|-------------|
| Whitelist check | Done | — |
| Cohort assignment | Done | — |
| 4-zone enforcement | Missing | Client route guards + relay filter |
| Join request flow | Missing | Kind 9021 + admin queue |
| Section request flow | Missing | Request + approval UI |

**Domain Events**: AccessGranted, AccessDenied, JoinRequested, JoinApproved

### 6. Media Context
**Aggregate Root**: `MediaUpload`
**Entities**: UploadedImage, EncryptedMedia
**Value Objects**: ImageBlob, Thumbnail, EncryptionKey, PodPath

| Capability | Status | Sprint Work |
|-----------|--------|-------------|
| Image upload component | Done (UI) | Pod API integration |
| Image compression | Missing | Canvas resize + JPEG 85% |
| Thumbnail generation | Missing | 200px thumbnail |
| NIP-98 upload auth | Missing | Authenticated upload wrapper |
| Image encryption | Missing | AES-GCM for DM images |

**Domain Events**: ImageUploaded, ImageEncrypted, ThumbnailGenerated

### 7. Calendar Context
**Aggregate Root**: `CalendarEvent`
**Entities**: Event, RSVP, Birthday
**Value Objects**: EventTime, Location, MaxAttendees, RSVPStatus

| Capability | Status | Sprint Work |
|-----------|--------|-------------|
| Events listing | Done | — |
| Event cards | Done | — |
| Mini calendar | Done | — |
| NIP-52 creation (31923) | Missing | Create event modal |
| RSVP (31925) | Missing | Accept/decline/tentative |
| Birthday calendar | Missing | Profile field + aggregation |
| Admin calendar mgmt | Missing | Admin tab for event CRUD |

**Domain Events**: EventCreated, RSVPSubmitted, BirthdayAdded

### 8. Rendering Context
**Aggregate Root**: `RenderTier`
**Entities**: WebGPUPipeline, Canvas2DRenderer, CSSFallback
**Value Objects**: RenderTier (WebGPU/Canvas2D/CSSOnly), ShaderModule, ParticleConfig

| Capability | Status | Sprint Work |
|-----------|--------|-------------|
| Canvas2D particles | Done | — |
| Glassmorphism CSS | Done | — |
| WebGPU detection | Missing | `navigator.gpu` check |
| WebGPU hero | Missing | Compute + render pipeline |
| WebGPU activity viz | Missing | Network graph + particles |
| Reaction burst FX | Missing | Instanced particle burst |
| Reduced motion | Missing | `prefers-reduced-motion` gate |

**Domain Events**: TierDetected, PipelineInitialized, FallbackActivated

### 9. Offline Context
**Aggregate Root**: `ForumDb`
**Entities**: CachedMessage, CachedProfile, OutboxEvent
**Value Objects**: DatabaseVersion, StoreName, CacheTimestamp

| Capability | Status | Sprint Work |
|-----------|--------|-------------|
| Service worker | Missing | sw.js cache-first strategy |
| IndexedDB messages | Missing | 5-table schema |
| Offline read | Missing | Cache-first reads |
| Outbox queue | Missing | Queue + replay on reconnect |
| Storage quota check | Missing | `navigator.storage.estimate()` |

**Domain Events**: CacheHit, CacheMiss, EventQueued, OutboxDrained

### 10. Admin Context
**Aggregate Root**: `AdminStore`
**Entities**: AdminUser, PendingRegistration, RelayConfig
**Value Objects**: AdminPubkey, ApprovalDecision, RelayHealth

| Capability | Status | Sprint Work |
|-----------|--------|-------------|
| Whitelist CRUD | Done | — |
| Channel CRUD | Done | — |
| Pending approvals | Done | — |
| Relay settings | Done | — |
| Stats overview | Done | — |
| Calendar admin | Missing | Event create/edit/delete tab |
| Section requests | Missing | Approval queue |
| Stats graphs | Missing | Activity timeline chart |

**Domain Events**: UserApproved, UserRejected, ChannelCreated, EventManaged

## Context Map — Integration Patterns

```
Identity ←[Shared Kernel: Pubkey, Privkey]→ Messaging
Identity ←[Shared Kernel: Pubkey, Cohort]→ Access
Access ←[Conformist: Zone rules]→ Forum
Messaging ←[ACL: Nostr events]→ Offline (cache/queue)
Media ←[Customer-Supplier: NIP-98 auth]→ Identity
Calendar ←[Published Language: NIP-52]→ Messaging
Rendering ←[Separate Ways]→ all other contexts (pure UI concern)
Admin ←[Open Host: API endpoints]→ Access, Calendar, Forum
```

## Ubiquitous Language

| Term | Definition |
|------|-----------|
| **Zone** | Access tier (0=public, 1=registered, 2=cohort, 3=private) |
| **Cohort** | Named group of users with shared access permissions |
| **Whitelist** | Set of pubkeys allowed to access the forum |
| **Gift Wrap** | NIP-59 encryption wrapper hiding sender identity |
| **PRF** | WebAuthn Pseudo-Random Function extension for key derivation |
| **HKDF** | HMAC-based Key Derivation Function (PRF output → secp256k1 key) |
| **Kind** | Nostr event type number (e.g., kind 40 = channel creation) |
| **Render Tier** | Detected GPU capability level (WebGPU > Canvas2D > CSS) |
| **Outbox** | IndexedDB queue for events created while offline |
| **EOSE** | End Of Stored Events — relay signal that historical data is complete |

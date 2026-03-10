# DDD: Forum Hardening Sprint — Bounded Contexts

## Domain Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                  Forum Hardening Domain                              │
│                                                                      │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐            │
│  │   Relay      │───>│  Identity    │───>│  Messaging   │            │
│  │  Transport   │    │   Auth       │    │   Channel    │            │
│  └─────────────┘    └──────────────┘    └──────────────┘            │
│        │                   │                    │                     │
│        │                   │              ┌──────────────┐            │
│        │                   └─────────────>│    Admin     │            │
│        │                                  │  Operations  │            │
│        │                                  └──────────────┘            │
│        │                                        │                    │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐            │
│  │ Subscription │    │   Social     │    │  Navigation  │            │
│  │  Management  │    │ Engagement   │    │   Routing    │            │
│  └─────────────┘    └──────────────┘    └──────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

## Bounded Contexts

### 1. Relay Transport Context
**Aggregate Root**: `RelayConnection`
**Entities**: PendingPublish, Subscription
**Value Objects**: EventId, Filter, PublishCallback, ConnectionState

| Capability | Current State | Sprint Fix |
|-----------|--------------|------------|
| WebSocket connect/disconnect | Working | — |
| Fire-and-forget publish | Broken (silent failures) | `publish_with_ack()` with OK routing |
| OK message routing | Logged only | Callback dispatch to callers |
| NOTICE handling | Logged only | Surface to UI as warnings |
| Subscription management | Cleared on disconnect | Preserve + replay on reconnect |
| Filter storage | Not stored | Store in `Subscription` struct |
| Reconnect replay | Missing | Auto-replay all active REQs |

**Domain Events**: PublishAcked, PublishRejected, ConnectionLost, ConnectionRestored, SubscriptionReplayed

**Invariants**:
- Every publish MUST track event ID in `pending_publishes`
- OK responses MUST invoke and remove matching callback
- Disconnect MUST NOT clear subscription registry
- Reconnect MUST replay all active subscription filters

**Anti-corruption Layer**: Wraps raw WebSocket. Translates NIP-01 relay messages into domain events. Isolates callers from transport failures.

---

### 2. Identity Auth Context
**Aggregate Root**: `AuthStore`
**Entities**: Session, LocalKeySession
**Value Objects**: Pubkey, PrivkeyMem, AuthPhase

| Capability | Current State | Sprint Fix |
|-----------|--------------|------------|
| Passkey login | Working | — |
| NIP-07 login | Working | — |
| nsec/hex login | Working | — |
| Session restore (passkey) | Working | — |
| Session restore (local-key) | **BROKEN** — marks authenticated without key | Restore as Unauthenticated |
| Sign event | Working (when key present) | — |

**Domain Events**: SessionRestored, SessionDowngraded, KeyProvided, KeyZeroized

**Invariants**:
- `AuthPhase::Authenticated` REQUIRES either privkey bytes in memory OR NIP-07 signer
- Local-key sessions without in-memory key MUST restore as `Unauthenticated`
- Pubkey MAY be preserved for display even when unauthenticated

**Critical Fix**: `src/auth/session.rs` — `is_local_key` branch must set `state: AuthPhase::Unauthenticated, is_authenticated: false`

---

### 3. Messaging Channel Context
**Aggregate Root**: `ChannelMessages`
**Entities**: Message (kind 42), ChannelMeta (kind 40)
**Value Objects**: ChannelId, SectionTag, RootTag, MessageContent

| Capability | Current State | Sprint Fix |
|-----------|--------------|------------|
| Channel list | Working | — |
| Message subscription | **BROKEN** — strict `#e` filter | Broad kind-42 + client-side resolution |
| Message counts | **BROKEN** — all show 0 | Resolve via root tag, name, section |
| Message send | **BROKEN** — silent publish | Use `publish_with_ack` |
| Channel header | Intermittent loading | Store fallback before relay fetch |
| Zone filtering | Wrong count/case | Use filtered count, proper-case names |

**Domain Events**: MessageReceived, MessageSent, MessageSendFailed, ChannelResolved

**Invariants**:
- Channel identity resolution MUST try: kind-40 event ID → channel name → section slug
- Message send MUST NOT clear input until relay acknowledges
- Message count MUST reflect resolved messages, not strict filter matches

**Channel Identity Resolution Algorithm**:
```
given event with tags:
  1. find ["e", val, ..., "root"] (NIP-10 root marker)
  2. OR find first ["e", val, ...]
  3. resolve val:
     a. exact match in channel_map by ID → use that channel
     b. match by channel.name → use that channel
     c. match by channel.section → use that channel
     d. no match → discard event
```

---

### 4. Admin Operations Context
**Aggregate Root**: `AdminStore`
**Entities**: AdminChannel, WhitelistEntry, SectionRequest, CalendarEvent
**Value Objects**: AdminStats, ChannelFormData

| Capability | Current State | Sprint Fix |
|-----------|--------------|------------|
| Channel creation | **BROKEN** — silent publish, premature reset | Ack-aware publish, delay reset |
| Whitelist fetch | **BROKEN** — no auth after reload | Fix depends on P0-1 session restore |
| Section requests | **BROKEN** — stuck loading | 8s timeout fallback |
| Calendar admin | **BROKEN** — stuck loading, 0 RSVPs | 8s timeout, kind-31925 subscription |
| Legacy section inference | Missing | `infer_legacy_section()` helper |

**Domain Events**: ChannelCreated, ChannelCreateFailed, WhitelistLoaded, RequestsTimedOut

**Invariants**:
- Channel creation MUST NOT insert into local state until relay ack
- Form MUST NOT reset until relay ack (or explicit user action)
- Admin operations MUST require `is_authenticated == true` with signing capability
- Loading states MUST timeout after 8 seconds

---

### 5. Social Engagement Context
**Aggregate Root**: `EventPage`
**Entities**: CalendarEvent (kind 31923), RSVP (kind 31925)
**Value Objects**: RsvpStatus, AttendeeCount

| Capability | Current State | Sprint Fix |
|-----------|--------------|------------|
| RSVP publish | **BROKEN** — silent publish | Ack-aware with toast feedback |
| Profile save | **BROKEN** — no feedback | Ack-aware with toast, fetch kind-0 on mount |
| Profile page | **MISSING** — 404 | New route + component |

**Domain Events**: RsvpAccepted, RsvpRejected, ProfileSaved, ProfileSaveFailed

**Invariants**:
- RSVP toast MUST only show on relay acceptance
- Profile save MUST show error toast on relay rejection
- Settings page MUST fetch kind-0 metadata from relay on mount

---

### 6. Navigation Routing Context
**Aggregate Root**: `AppRouter`
**Entities**: Route, AuthGate
**Value Objects**: Path, RouteParams

| Capability | Current State | Sprint Fix |
|-----------|--------------|------------|
| `/profile/:pubkey` | **MISSING** — 404 | Add route + ProfilePage |
| `/search` | **MISSING** — 404 | Add route + SearchPage |
| Mobile Forums nav | Points to `/chat` | Fix to `/forums` |
| Mobile Profile nav | Points to `/` | Fix to `/profile/{pubkey}` |
| Category drill-down | Empty body | Fix section matching logic |

**Invariants**:
- All advertised navigation links MUST resolve to registered routes
- Mobile nav hrefs MUST match desktop nav semantics

---

## Context Interactions

```
Relay Transport ──publishes──> Identity Auth (sign event)
                 <──ack/nak──

Identity Auth ──authenticates──> Admin Operations (gate access)
              ──signs──> Messaging Channel (send message)
              ──signs──> Social Engagement (RSVP, profile)

Messaging Channel ──subscribes──> Relay Transport (kind-42 events)
                  ──resolves──> Channel Identity (root tag mapping)

Admin Operations ──creates──> Relay Transport (kind-40 events)
                 ──fetches──> Relay Transport (whitelist API)

Navigation Routing ──gates──> Identity Auth (auth check)
                   ──renders──> All page contexts
```

## Ubiquitous Language

| Term | Definition |
|------|-----------|
| **Publish ack** | Relay's `["OK", event_id, accepted, message]` response confirming or rejecting an event |
| **Fire-and-forget** | Anti-pattern where publish assumes success without waiting for ack |
| **Channel identity** | The canonical ID linking kind-42 messages to kind-40 channel metadata |
| **Root tag** | `["e", value, ..., "root"]` NIP-10 marker identifying the channel a message belongs to |
| **Session downgrade** | Restoring a persisted session as Unauthenticated when signing capability is absent |
| **Subscription replay** | Re-sending REQ messages to relay after WebSocket reconnection |
| **Legacy section** | Channels created by old SvelteKit client with non-standard tag structures |
| **Inferred section** | Server-side guess of section membership for legacy channels without section tags |

## Sprint Execution Order

1. **Relay Transport** (P0-2, P0-5) — Foundation; all other fixes depend on ack infrastructure
2. **Identity Auth** (P0-1) — Unblocks admin operations and all signing flows
3. **Messaging Channel** (P0-3, P0-4) — Restores core chat functionality
4. **Admin Operations** (P1-1, P1-4, P1-5, P1-6) — Restores admin panel
5. **Social Engagement** (P1-2, P1-3) — Restores RSVP and profile
6. **Navigation Routing** (P2-1 through P2-9) — Missing routes and UX polish

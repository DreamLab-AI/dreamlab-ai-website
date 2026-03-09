---
title: "PRD: DreamLab Community Forum — Final Feature Parity Sprint (Rust/WASM)"
version: "4.0.0"
status: in-progress
date: 2026-03-09
branch: main
scope: community-forum-rs 100% feature parity with SvelteKit forum
baseline: "v4.0.0 supersedes v3.0.0 — 54% parity achieved, this sprint completes the remaining 46%"
---

# PRD v4.0: Final Feature Parity Sprint — Rust/WASM Forum

## 1. Context

The Rust/WASM forum (`community-forum-rs/`) has progressed from 15% to ~54% feature
parity with the legacy SvelteKit forum (`community-forum/`). Core infrastructure is
solid: Leptos 0.7 CSR, WebAuthn PRF passkey auth, NIP-01 relay, NIP-44/59 encrypted
DMs, admin panel, 16 route pages, 30+ components, and 5 Cloudflare Workers.

**This PRD defines the single sprint to reach 100% feature parity.**

## 2. What's Already Shipped (54%)

### Auth (75%)
- [x] Passkey (WebAuthn PRF + HKDF) registration + login
- [x] nsec/hex private key login (advanced)
- [x] Session persistence (localStorage) + pagehide zeroization
- [x] Pending approval flow + setup page
- [x] Account status tracking (Incomplete → Complete)
- [ ] NIP-07 browser extension login (stub only)
- [ ] BIP39 mnemonic backup display

### Messaging (64%)
- [x] Real-time channel chat via relay
- [x] Message bubbles with sender info
- [x] Emoji reactions (reaction_bar.rs)
- [x] Reply/quote threading (quoted_message.rs)
- [x] Typing indicator
- [x] Virtual scrolling (virtual_list.rs)
- [x] Markdown input with preview
- [x] Link previews, media embeds, @mentions
- [x] Bookmarks modal
- [ ] Message deletion (NIP-09, kind 5)
- [ ] Pinned messages per channel
- [ ] Draft persistence across sessions
- [ ] Message export (JSON/CSV)
- [ ] Channel join request flow

### Forum/BBS (75%)
- [x] Categories → Sections → Channels hierarchy
- [x] Breadcrumb navigation
- [x] Category + section cards
- [ ] NIP-29 group support (kinds 9, 9000-9005, 39000, 39002)
- [ ] Zone-based 4-tier access control (public/registered/cohort/private)

### DMs (75%)
- [x] NIP-59 Gift Wrap + NIP-44 encryption
- [x] Conversation list with unread counts
- [x] Real-time subscriptions
- [ ] Offline message queue (IndexedDB)
- [ ] Conversation pinning + muting

### Admin (73%)
- [x] Whitelist + cohort management
- [x] Channel CRUD (kind-40 events)
- [x] Pending approvals + user table
- [x] Relay settings + stats overview
- [ ] Calendar event admin management
- [ ] Admin stats graphs (activity timeline, top posters chart)
- [ ] Section request approval queue

### Calendar/Events (38%)
- [x] Events page with upcoming/past filtering
- [x] Event cards with metadata
- [x] Mini-calendar sidebar
- [ ] NIP-52 event creation (kind 31923)
- [ ] RSVP tracking (kind 31925)
- [ ] Birthday calendar integration
- [ ] Event edit/delete by admin

### UI/UX (72%)
- [x] Toasts, modals, confirm dialogs, badges, empty states
- [x] Mobile bottom nav + responsive layout
- [x] Notification bell + session timeout warning
- [x] Particle canvas background + glassmorphism
- [x] Global search overlay
- [x] Profile modal + image upload + user display
- [ ] WebGPU hero with Canvas2D fallback
- [ ] PWA service worker + offline queue
- [ ] Swipe gestures (mobile)
- [ ] Accessibility (screen reader, ARIA, focus management)
- [ ] Welcome modal (first-time users)
- [ ] Board stats (TopPosters, TodaysActivity, ActivityGraph)

## 3. Feature Manifest — Sprint Deliverables

### Stream 1: Nostr Protocol Completion (P0)

#### 1a. NIP-09 Message Deletion
- Kind 5 deletion events for own messages
- Kind 9005 group deletion for admin
- Soft-delete UI (strikethrough → fade) with undo toast
- Deletion event subscription + relay propagation
- **Files**: `nostr-core/src/deletion.rs`, `relay.rs` (filter update), `message_bubble.rs` (delete action)

#### 1b. NIP-29 Group Support
- Kind 9 group chat messages
- Kind 9000/9001 add/remove user
- Kind 9005 delete event in group
- Kind 9021 join request
- Kind 9024 user registration request
- Kind 39000 group metadata
- Kind 39002 group members
- **Files**: `nostr-core/src/groups.rs`, `relay.rs` (group subscriptions)

#### 1c. NIP-52 Calendar Events
- Kind 31923 calendar event creation
- Kind 31925 RSVP (accept/decline/tentative)
- Create event modal with form validation
- Admin calendar management tab
- **Files**: `nostr-core/src/calendar.rs`, `components/create_event_modal.rs`, `admin/calendar.rs`

#### 1d. NIP-07 Browser Extension
- `window.nostr` detection + capability check
- `getPublicKey()` → auth store integration
- `signEvent()` → relay publish pipeline
- `nip04.encrypt()`/`nip04.decrypt()` fallback for legacy DMs
- Login UI: third tab alongside Passkey and Advanced
- **Files**: `auth/nip07.rs`, `pages/login.rs` (UI update)

### Stream 2: Social Richness Features (P0-P1)

#### 2a. Pinned Messages
- Pin/unpin action on message context menu (admin/mod only)
- Pinned messages banner at top of channel
- Persist via kind-41 channel metadata tags
- **Files**: `components/pinned_messages.rs`, `pages/channel.rs` (integration)

#### 2b. Channel Join Requests
- Join request button on gated channels
- Kind 9021 join request event
- Admin approval queue in admin panel
- Notification to admin on new request
- **Files**: `components/join_request.rs`, `admin/join_requests.rs`

#### 2c. Draft Persistence
- Auto-save draft per channel to localStorage
- Draft indicator badge on channel card
- Restore on channel re-entry
- **Files**: `components/draft_indicator.rs`, `components/message_input.rs` (integration)

#### 2d. Message Export
- Export channel history as JSON or CSV
- Date range selector
- Download via Blob URL
- **Files**: `components/export_modal.rs`

#### 2e. Read Position Tracking
- Track last-read event ID per channel in localStorage
- Unread count badge on channel cards
- "New messages" divider in message list
- Jump-to-unread button
- **Files**: `stores/read_position.rs`, `components/channel_card.rs` (badge), `pages/channel.rs` (divider)

#### 2f. Mute Channels
- Mute/unmute toggle on channel context menu
- Muted channels collapsed in sidebar
- localStorage persistence
- **Files**: `stores/mute.rs`, `pages/chat.rs` (integration)

### Stream 3: Zone Access & Cohort Model (P0)

#### 3a. 4-Zone BBS Access Control
- Zone 0: Public (lobby, announcements) — no auth required
- Zone 1: Registered — any whitelisted user
- Zone 2: Cohort — specific cohort membership required
- Zone 3: Private — explicit invitation only
- Client-side gate on route entry + relay filter
- **Files**: `stores/zone_access.rs`, `app.rs` (route guards)

#### 3b. Section Request Flow
- Request access to gated sections
- Admin approval queue
- Notification on approval/denial
- **Files**: `components/section_request.rs`, `admin/section_requests.rs`

### Stream 4: Media & Upload Pipeline (P1)

#### 4a. Image Upload to Pod API
- Client-side compression (canvas resize, JPEG 85%)
- Thumbnail generation (200px)
- Upload to pod-api (`/pods/{pubkey}/media/public/`)
- NIP-98 authenticated upload
- Progress indicator
- **Files**: `components/image_upload.rs` (enhance existing), `auth/nip98.rs` (upload wrapper)

#### 4b. Image Encryption for DMs
- AES-GCM encryption with per-recipient key
- Encrypted image tags in DM events
- Decrypt + render in DM view
- **Files**: `dm/encrypted_media.rs`, `components/media_embed.rs` (decrypt path)

### Stream 5: PWA & Offline (P1)

#### 5a. Service Worker
- Cache-first for static assets (WASM, CSS, HTML)
- Network-first for relay data
- Offline detection + banner
- **Files**: `sw.js` (new, in project root for Trunk copy)

#### 5b. IndexedDB Message Cache
- Dexie-like abstraction via `web-sys` IndexedDB API
- Tables: messages, channels, profiles, deletions
- Cache relay responses for offline read
- Queue outgoing events when offline
- Replay queue on reconnect
- **Files**: `stores/indexed_db.rs`, `relay.rs` (offline queue integration)

### Stream 6: Board Stats & Engagement (P1-P2)

#### 6a. Board Stats Components
- `BoardStats` — total messages, users, channels, online count
- `TopPosters` — leaderboard of most active users (7-day window)
- `TodaysActivity` — message count + sparkline
- `ActivityGraph` — WebGPU bar chart with Canvas2D fallback
- **Files**: `components/board_stats.rs`, `components/top_posters.rs`, `components/activity_graph.rs`

#### 6b. Welcome Modal
- First-time user onboarding overlay
- Feature highlights with glass cards
- "Don't show again" localStorage flag
- **Files**: `components/welcome_modal.rs`

#### 6c. Moderator Team Display
- List moderators for current section
- Role badges (admin, moderator, member)
- **Files**: `components/moderator_team.rs`

### Stream 7: WebGPU Eye Candy (P1)

#### 7a. WebGPU Hero Background
- GPU-accelerated particle field (replace Canvas2D)
- Voronoi tessellation with golden ratio
- Bloom post-processing pass
- Ambient occlusion on glass cards
- **Fallback**: Canvas2D particle_canvas.rs (existing)
- **Detection**: `navigator.gpu` availability check
- **Files**: `components/webgpu_hero.rs`, `components/particle_canvas.rs` (fallback flag)

#### 7b. WebGPU Activity Visualization
- Real-time message flow as particle streams
- Channel activity as pulsing nodes in network graph
- GPU compute for layout (force-directed)
- **Fallback**: Static SVG graph
- **Files**: `components/webgpu_activity.rs`

#### 7c. Micro-Interactions
- Reaction burst particles (WebGPU compute → instanced quads)
- Toast slide-in with glass refraction
- Modal open: ripple + blur transition
- Card hover: ambient glow intensification
- **Fallback**: CSS transitions (existing)
- **Files**: `components/fx/mod.rs`, `components/fx/reaction_burst.rs`

### Stream 8: Accessibility & Polish (P2)

#### 8a. Screen Reader Support
- ARIA labels on all interactive elements
- Live regions for dynamic content (new messages, toasts)
- Focus trap in modals
- Skip navigation link
- **Files**: across all components (attribute additions)

#### 8b. Keyboard Navigation
- `Cmd+K` global search (existing, verify)
- `Escape` to close modals/search
- Arrow keys in channel list
- `Enter` to send message
- Tab order audit
- **Files**: `app.rs` (global keydown handler)

#### 8c. Mobile Swipe Gestures
- Swipe-right on message → reply
- Swipe-left on message → delete/bookmark
- Touch gesture detection via pointer events
- **Files**: `components/swipeable_message.rs`

#### 8d. Preferences Store
- Theme toggle (dark/light/system)
- Notification preferences (mentions only, all, none)
- Link preview toggle
- Compact message mode
- localStorage persistence
- **Files**: `stores/preferences.rs`, `pages/settings.rs` (UI)

### Stream 9: BIP39 Mnemonic & Key Backup (P2)

#### 9a. Mnemonic Display
- BIP39 word list from privkey entropy
- One-time display after registration
- Copy + download as text
- Clear warning: "This is your only chance"
- **Files**: `components/mnemonic_display.rs`, `pages/signup.rs` (integration)

#### 9b. nsec Backup Download
- One-time nsec (bech32) download
- File download via Blob URL
- Never shown again after dismiss
- **Files**: `components/nsec_backup.rs`

### Stream 10: Birthday Calendar & Notifications (P2-P3)

#### 10a. Birthday Calendar
- Optional birthday field in profile
- Birthday calendar view aggregating cohort birthdays
- Notification on cohort member birthdays
- **Files**: `components/birthday_calendar.rs`, `pages/events.rs` (tab)

#### 10b. Browser Push Notifications
- Notification permission prompt
- Push for DMs, mentions, join approvals
- Service worker notification handler
- **Files**: `stores/notifications.rs` (enhance), `sw.js` (push handler)

#### 10c. Notification Persistence
- localStorage with 7-day retention
- Notification center slide-out panel
- Mark all as read
- **Files**: `components/notification_center.rs`

## 4. Design System Extensions — WebGPU Candy

### WebGPU Pipeline
```
navigator.gpu → requestAdapter() → requestDevice() → configure canvas
  ├── Vertex shader: particle positions (compute → render)
  ├── Fragment shader: bloom + glow + glass refraction
  └── Fallback: Canvas2D (particle_canvas.rs) when no WebGPU
```

### New CSS Tokens (v4.0)
```css
--webgpu-bloom-radius: 12px;
--webgpu-glow-intensity: 0.6;
--glass-refraction-strength: 0.15;
--particle-density: 120;
--reaction-burst-count: 24;
--activity-pulse-speed: 2s;
```

### Fallback Strategy
| Feature | WebGPU | Canvas2D | CSS-only |
|---------|--------|----------|----------|
| Hero particles | GPU compute + instanced | requestAnimationFrame | Static gradient |
| Activity graph | GPU bar chart | Canvas bars | Inline SVG |
| Reaction burst | Compute particles | Canvas particles | CSS scale animation |
| Glass refraction | Custom shader | backdrop-filter | backdrop-filter |
| Bloom glow | Post-process pass | box-shadow glow | box-shadow |

### Detection Code
```rust
fn has_webgpu() -> bool {
    js_sys::Reflect::get(&web_sys::window().unwrap(), &"gpu".into())
        .map(|v| !v.is_undefined())
        .unwrap_or(false)
}
```

## 5. Technical Architecture

### New Modules (nostr-core)
| Module | NIPs | Kinds |
|--------|------|-------|
| `deletion.rs` | NIP-09 | 5 |
| `groups.rs` | NIP-29 | 9, 9000-9005, 9021, 9024, 39000, 39002 |
| `calendar.rs` | NIP-52 | 31923, 31925 |
| `nip07.rs` | NIP-07 | (signer interface) |

### New Stores (forum-client)
| Store | Purpose |
|-------|---------|
| `zone_access.rs` | 4-zone BBS access enforcement |
| `read_position.rs` | Per-channel last-read tracking |
| `mute.rs` | Channel + user muting |
| `preferences.rs` | User preference persistence |
| `indexed_db.rs` | Offline cache + message queue |
| `notifications.rs` | Notification state + persistence |

### New Components (forum-client)
| Component | Stream | Priority |
|-----------|--------|----------|
| `pinned_messages.rs` | 2 | P0 |
| `join_request.rs` | 2 | P1 |
| `draft_indicator.rs` | 2 | P2 |
| `export_modal.rs` | 2 | P2 |
| `section_request.rs` | 3 | P1 |
| `board_stats.rs` | 6 | P1 |
| `top_posters.rs` | 6 | P1 |
| `activity_graph.rs` | 6 | P1 |
| `welcome_modal.rs` | 6 | P2 |
| `moderator_team.rs` | 6 | P2 |
| `webgpu_hero.rs` | 7 | P1 |
| `webgpu_activity.rs` | 7 | P2 |
| `fx/reaction_burst.rs` | 7 | P2 |
| `swipeable_message.rs` | 8 | P2 |
| `mnemonic_display.rs` | 9 | P2 |
| `nsec_backup.rs` | 9 | P2 |
| `birthday_calendar.rs` | 10 | P3 |
| `notification_center.rs` | 10 | P3 |
| `create_event_modal.rs` | 1 | P1 |

### Modified Files
| File | Changes |
|------|---------|
| `app.rs` | Zone route guards, global keydown, WebGPU detection |
| `relay.rs` | NIP-09/29/52 subscription filters, offline queue |
| `pages/channel.rs` | Pinned messages, read position, delete action |
| `pages/chat.rs` | Muted channels, unread badges, board stats |
| `pages/login.rs` | NIP-07 tab |
| `pages/events.rs` | Create event modal, RSVP, birthday tab |
| `pages/settings.rs` | Preferences, notification settings |
| `admin/mod.rs` | Calendar tab, section requests tab |
| `components/message_bubble.rs` | Delete action, swipe gestures |
| `components/message_input.rs` | Draft persistence |
| `components/channel_card.rs` | Unread badge, mute indicator |
| `components/mobile_bottom_nav.rs` | Unread counts for all sections |
| `dm/mod.rs` | Offline queue, conversation pin/mute |

## 6. Swarm Execution Plan

### Topology: Hierarchical Mesh (8 agents)

```
Queen (Coordinator)
├── Agent 1: Protocol — NIP-09/29/52/07 in nostr-core
├── Agent 2: Social — Pinned, drafts, read pos, mute, join requests
├── Agent 3: Zones — 4-zone access, section requests, cohort gates
├── Agent 4: Media — Image upload, encryption, pod integration
├── Agent 5: PWA — Service worker, IndexedDB, offline queue
├── Agent 6: Stats — Board stats, top posters, activity graph, welcome
├── Agent 7: WebGPU — Hero, activity viz, reaction burst, fallbacks
├── Agent 8: A11y — ARIA, keyboard nav, swipe, preferences, mnemonic
```

### Dependency Graph
```
Stream 1 (Protocol) ──→ Stream 2 (Social) ──→ Stream 6 (Stats)
                    ╲                      ╲
                     → Stream 3 (Zones)     → Stream 8 (A11y)
Stream 4 (Media) ──→ Stream 5 (PWA)
Stream 7 (WebGPU) ──→ (independent, parallel)
```

## 7. Success Criteria

- [ ] All 21 Nostr event kinds supported (matching SvelteKit)
- [ ] All 17 routes functional with zone access gates
- [ ] 50+ components rendered (up from 30)
- [ ] WebGPU hero with Canvas2D fallback verified on Chrome/Firefox/Safari
- [ ] `cargo check --target wasm32-unknown-unknown -p forum-client` passes
- [ ] `cargo test -p nostr-core` passes (including new NIP tests)
- [ ] Mobile-responsive on all pages
- [ ] Offline mode: cached messages readable, queue replays on reconnect
- [ ] Screen reader audit: all interactive elements labeled
- [ ] No regression on existing auth, chat, DM, admin flows

## 8. Out of Scope (v4.0)

- Semantic search (RuVector WASM integration) — deferred to v4.1
- ONNX embedder deployment — deferred to v4.1
- CORS proxy route — not needed (CF Workers handle CORS)
- Full Playwright e2e test suite — deferred to v4.1
- Rate limiting client-side store — handled by relay-worker

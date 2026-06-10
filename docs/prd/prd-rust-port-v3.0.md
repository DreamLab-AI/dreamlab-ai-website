---
title: "PRD: DreamLab Community Forum — Full Feature Parity (Rust/WASM)"
version: "3.0.0"
status: superseded
date: 2026-03-08
branch: main
scope: community-forum-rs full feature parity with SvelteKit forum
baseline: "v3.0.0 supersedes v2.1.0 — all core infrastructure shipped, now feature completion"
---

> **STATUS: SUPERSEDED** — This document is superseded by `prd-rust-port-v4.0.md`. The TS→Rust migration completed on 2026-03-12. All 5 workers (auth, pod, preview, relay, search) and the forum client are now Rust. This document is retained for historical reference only.

# PRD v3.0: Full Feature Parity — Rust/WASM Forum

## 1. Context

The Rust/WASM forum (`community-forum-rs/`) has shipped its core infrastructure:
- Leptos 0.7 CSR with Trunk build pipeline
- WebAuthn PRF passkey auth with HKDF key derivation
- NIP-28 channel messaging (kind 40/42)
- NIP-59 Gift Wrap DMs with NIP-44 encryption
- Admin whitelist management with NIP-98 auth
- WebSocket relay connection with auto-reconnect
- Canvas2D particle field hero + glassmorphism design system

**Current coverage: ~15% of legacy SvelteKit forum features.**
This PRD defines the completion milestone to achieve 100% feature parity.

## 2. Feature Gap Analysis

### 2.1 Auth Flow (3 features missing)

| Feature | Legacy Source | Priority |
|---------|-------------|----------|
| Nickname setup (post-registration) | `auth/NicknameSetup.svelte` | P0 |
| Pending approval waiting page | `auth/PendingApproval.svelte` | P0 |
| nsec backup one-time download | `auth/NsecBackup.svelte` | P1 |

### 2.2 Chat Enrichment (12 features missing)

| Feature | Legacy Source | Priority |
|---------|-------------|----------|
| Rich compose box (markdown, emoji) | `chat/MessageInput.svelte` | P0 |
| Emoji reactions (kind 7) | `chat/ReactionBar.svelte`, `ReactionPicker.svelte` | P0 |
| Link previews (OG cards) | `chat/LinkPreview.svelte` | P0 |
| Media embeds (images, YouTube) | `chat/MediaEmbed.svelte` | P1 |
| @mention autocomplete | `chat/MentionAutocomplete.svelte`, `MentionText.svelte` | P1 |
| Reply/quote threading | `chat/QuotedMessage.svelte` | P1 |
| Pinned messages | `chat/PinnedMessages.svelte` | P1 |
| Bookmarks modal | `chat/BookmarksModal.svelte` | P2 |
| Global search (Cmd+K) | `chat/GlobalSearch.svelte` | P1 |
| Typing indicators | `ui/TypingIndicator.svelte` | P2 |
| Virtual scrolling | `ui/VirtualList.svelte` | P1 |
| Export modal | `chat/ExportModal.svelte` | P3 |

### 2.3 Navigation & Mobile (6 features missing)

| Feature | Legacy Source | Priority |
|---------|-------------|----------|
| Mobile bottom nav | `ui/MobileBottomNav.svelte` | P0 |
| Breadcrumb navigation | `navigation/Breadcrumb.svelte` | P1 |
| Notification bell + unread count | `ui/NotificationBell.svelte` | P0 |
| Session timeout warning | `ui/SessionTimeoutWarning.svelte` | P2 |
| Zone navigation | `zones/ZoneNav.svelte` | P1 |
| Mobile swipe gestures | `ui/SwipeableMessage.svelte` | P2 |

### 2.4 User Profile (3 features missing)

| Feature | Legacy Source | Priority |
|---------|-------------|----------|
| My profile modal (edit) | `user/MyProfileModal.svelte` | P0 |
| Profile modal (view other) | `user/ProfileModal.svelte` | P0 |
| User display (inline) | `user/UserDisplay.svelte` | P0 |

### 2.5 Forum/BBS Hierarchy (6 features missing)

| Feature | Legacy Source | Priority |
|---------|-------------|----------|
| Forum index page | `/forums` route | P0 |
| Category browsing | `/[category]` route | P0 |
| Section browsing | `/[category]/[section]` route | P0 |
| Category hero cards | `navigation/CategoryCard.svelte` | P1 |
| Section cards | `navigation/SectionListCard.svelte` | P1 |
| Welcome back widget | `forum/WelcomeBack.svelte` | P2 |

### 2.6 Calendar/Events (4 features missing)

| Feature | Legacy Source | Priority |
|---------|-------------|----------|
| Events listing page | `/events` route | P1 |
| Event cards | `events/EventCard.svelte` | P1 |
| Mini calendar widget | `calendar/MiniCalendar.svelte` | P2 |
| Create event modal | `events/CreateEventModal.svelte` | P2 |

### 2.7 Admin Enhancement (4 features missing)

| Feature | Legacy Source | Priority |
|---------|-------------|----------|
| Admin stats dashboard | `admin/AdminStats.svelte` | P1 |
| Pending user registrations | `admin/PendingUserApproval.svelte` | P0 |
| Relay settings | `admin/RelaySettings.svelte` | P2 |
| User cohort manager | `admin/UserCohortManager.svelte` | P1 |

### 2.8 Settings & Misc (4 features missing)

| Feature | Legacy Source | Priority |
|---------|-------------|----------|
| Settings/muted users | `/settings/muted` route | P1 |
| Single note deep-link | `/view/[noteId]` route | P1 |
| Image upload component | `ui/ImageUpload.svelte` | P1 |
| Toast notification system | `ui/Toast.svelte` | P0 |

## 3. Design System — "WebGPU Candy Tech Demo"

The forum maintains and extends the established design DNA:

### Visual Identity
- **Base**: Deep navy (#111827) with amber-400/500 accent hierarchy
- **Glass**: Backdrop-blur cards with animated gradient borders
- **Particles**: Canvas2D constellation field (Fermat spiral, golden angle)
- **Glow**: Ambient orbs, breathing glow, pulse rings
- **Motion**: Spring-based micro-interactions, reduced-motion support

### New CSS Extensions (v3.0)
- `glass-card-interactive` — Hover glow border + lift
- `gradient-border` — Animated gradient stroke
- `aurora-shimmer` — Aurora borealis shimmer for featured content
- `neon-pulse` — Subtle neon pulse for notifications
- `candy-gradient` — Multi-stop amber/coral/violet gradient text
- `mesh-bg` — Animated mesh gradient background

### Component Design Tokens
- Avatar: Generative identicon from pubkey hash
- Reactions: Floating emoji with particle burst on click
- Modals: Center-fade with glass backdrop
- Toasts: Slide-in from top with glow border
- Cards: Glass with ambient glow on hover

## 4. Route Architecture (Target)

| Route | Component | Auth | New |
|-------|-----------|------|-----|
| `/` | HomePage | No | - |
| `/login` | LoginPage | No | - |
| `/signup` | SignupPage | No | - |
| `/setup` | SetupPage | Yes | NEW |
| `/pending` | PendingPage | Yes | NEW |
| `/chat` | ChatPage | Yes | - |
| `/chat/:channel_id` | ChannelPage | Yes | - |
| `/dm` | DmListPage | Yes | - |
| `/dm/:pubkey` | DmChatPage | Yes | - |
| `/forums` | ForumsPage | Yes | NEW |
| `/forums/:category` | CategoryPage | Yes | NEW |
| `/forums/:category/:section` | SectionPage | Yes | NEW |
| `/events` | EventsPage | Yes | NEW |
| `/settings` | SettingsPage | Yes | NEW |
| `/view/:note_id` | NoteViewPage | No | NEW |
| `/admin` | AdminPage | Admin | - |
| `/admin/stats` | AdminStatsPage | Admin | NEW |

## 5. File Structure (Target)

```
src/
  main.rs                          # Module declarations
  app.rs                           # Router + Layout (enhanced)
  relay.rs                         # WebSocket relay manager
  utils.rs                         # Shared utilities
  auth/
    mod.rs                         # AuthStore
    session.rs                     # Session persistence
    passkey.rs                     # WebAuthn PRF
    webauthn.rs                    # WebAuthn bindings
    nip98.rs                       # NIP-98 tokens
    http.rs                        # HTTP fetch helpers
  dm/
    mod.rs                         # DMStore + NIP-59
  admin/
    mod.rs                         # AdminStore
    overview.rs                    # Admin overview tab
    channel_form.rs                # Channel creation form
    user_table.rs                  # User list table
    stats.rs                       # Stats dashboard (NEW)
    registrations.rs               # Pending registrations (NEW)
    relay_settings.rs              # Relay config (NEW)
  pages/
    mod.rs                         # Page exports
    home.rs, login.rs, signup.rs   # Existing
    chat.rs, channel.rs            # Existing
    dm_list.rs, dm_chat.rs         # Existing
    admin.rs                       # Existing (enhanced)
    setup.rs                       # Nickname setup (NEW)
    pending.rs                     # Pending approval (NEW)
    forums.rs                      # Forum index (NEW)
    category.rs                    # Category view (NEW)
    section.rs                     # Section view (NEW)
    events.rs                      # Events listing (NEW)
    settings.rs                    # User settings (NEW)
    note_view.rs                   # Single note (NEW)
  components/
    mod.rs                         # Component exports
    particle_canvas.rs             # Existing
    channel_card.rs                # Existing
    message_bubble.rs              # Enhanced with reactions/reply
    avatar.rs                      # Generative identicon (NEW)
    modal.rs                       # Glass modal (NEW)
    toast.rs                       # Toast notifications (NEW)
    badge.rs                       # Status badges (NEW)
    confirm_dialog.rs              # Confirm dialog (NEW)
    empty_state.rs                 # Animated empty (NEW)
    message_input.rs               # Rich compose box (NEW)
    reaction_bar.rs                # Emoji reactions (NEW)
    link_preview.rs                # OG card (NEW)
    media_embed.rs                 # Media embeds (NEW)
    quoted_message.rs              # Reply/quote (NEW)
    mention_text.rs                # @mention render (NEW)
    pinned_messages.rs             # Pinned banner (NEW)
    typing_indicator.rs            # Typing dots (NEW)
    profile_modal.rs               # User profile (NEW)
    user_display.rs                # Inline user (NEW)
    mobile_bottom_nav.rs           # Mobile nav (NEW)
    breadcrumb.rs                  # Breadcrumb (NEW)
    notification_bell.rs           # Bell + count (NEW)
    global_search.rs               # Cmd+K search (NEW)
    category_card.rs               # Category card (NEW)
    section_card.rs                # Section card (NEW)
    event_card.rs                  # Event card (NEW)
    virtual_list.rs                # Virtual scroll (NEW)
    image_upload.rs                # Image upload (NEW)
```

## 6. Implementation Streams

8 parallel streams targeting ~40 new files:

1. **Core UI Components**: avatar, modal, toast, badge, empty_state, confirm_dialog
2. **Rich Messages**: message_input, reactions, link_preview, media, mentions, quotes
3. **Auth Flow + Profile**: setup page, pending page, profile modal, user display
4. **Navigation + Mobile**: bottom nav, breadcrumb, notifications, layout
5. **Forum/BBS**: forums page, category, section, hierarchy cards
6. **Calendar/Events**: events page, event card, mini calendar
7. **Admin + Settings**: admin stats, settings, note view, registrations
8. **DM Enhancement + Search**: global search, virtual list, bookmarks, DM improvements

## 7. Success Criteria

- All 17 routes functional
- All 40+ components rendered
- Build passes (`cargo check --target wasm32-unknown-unknown -p forum-client`)
- No regression on existing auth, chat, DM flows
- Mobile-responsive on all pages
- WebGPU candy tech demo aesthetic throughout

---
title: "PRD: DreamLab Community Forum — Hardening Sprint (Rust/WASM)"
version: "5.0.0"
status: planned
date: 2026-03-10
branch: main
scope: Fix all 18 QA snags, implement GPT-5.4 architectural recommendations
baseline: "v5.0 — v4.0 parity sprint complete (~95%), this sprint fixes all runtime defects"
sources:
  - docs/forum-snag-list.md (18 snags, 3 CRITICAL / 6 HIGH / 6 MEDIUM / 3 LOW)
  - docs/gpt5-forum-review-response.md (GPT-5.4 code review, 38K chars)
  - 26 QA screenshots in logs/forum-01 through forum-26
---

# PRD v5.0: Forum Hardening Sprint

## 1. Context

The Rust/WASM forum reached ~95% feature parity (PRD v4.0) but systematic QA on
2026-03-10 revealed **18 snags** — 3 CRITICAL, 6 HIGH, 6 MEDIUM, 3 LOW. GPT-5.4
code review identified three root causes behind 13 of 18 snags:

1. **Session restore without private key** — local-key users marked authenticated
   after page reload but cannot sign events (auth/session.rs)
2. **Fire-and-forget publish** — relay.rs `publish()` returns `()`, no OK/NOTICE
   callback routing, callers assume success (relay.rs)
3. **Kind-42 tag filter mismatch** — subscription assumes `#e == kind40_event_id`
   but legacy data uses different tag structures (channels.rs, channel.rs)

**This single sprint fixes all 18 snags and hardens the relay layer.**

## 2. Success Criteria

- [ ] All 3 CRITICAL snags resolved (chat send, message counts, channel creation)
- [ ] All 6 HIGH snags resolved (RSVP, whitelist, sections, calendar, profile, profile page)
- [ ] All 6 MEDIUM snags resolved (header loading, category drill-down, section tags, nickname, zone filter, search)
- [ ] All 3 LOW snags resolved or accepted (icons, button state, loading flash)
- [ ] `cargo check --target wasm32-unknown-unknown -p forum-client` passes
- [ ] Manual QA re-test of all 15 routes passes
- [ ] No regression in existing 129 nostr-core tests

## 3. Priority Tiers

### P0 — Core Functionality (Sprint Days 1-2)

| ID | Snags | Work Item | File(s) | Est |
|----|-------|-----------|---------|-----|
| P0-1 | 5/8/12/18 | Fix local-key session restore — do NOT mark authenticated without privkey bytes | `src/auth/session.rs` | 2h |
| P0-2 | 2/4/12/18 | Add `publish_with_ack()` to RelayConnection — track pending publishes by event ID, route OK/NOTICE callbacks | `src/relay.rs` | 4h |
| P0-3 | 13 | Fix `start_msg_sync()` — broad kind-42 subscription with client-side channel resolution via root tag, name, section | `src/stores/channels.rs` | 3h |
| P0-4 | 2 | Fix channel page message filter — accept variant `#e` tag structures, use `publish_with_ack` for sends | `src/pages/channel.rs` | 3h |
| P0-5 | — | Store subscription filters in `Subscription` struct, replay on reconnect | `src/relay.rs` | 3h |

### P1 — Feature Restoration (Sprint Days 2-3)

| ID | Snags | Work Item | File(s) | Est |
|----|-------|-----------|---------|-----|
| P1-1 | 18 | Admin channel creation with ack — don't reset form or insert local state until relay confirms | `src/admin/mod.rs`, `src/admin/channel_form.rs` | 2h |
| P1-2 | 4 | RSVP with ack — show toast only on relay acceptance | `src/components/rsvp_buttons.rs` | 1h |
| P1-3 | 12 | Profile save with ack — fetch kind-0 on mount, toast on relay confirm | `src/pages/settings.rs` | 2h |
| P1-4 | 5/8 | Whitelist fetch — fix auth guard (requires P0-1), surface transport errors | `src/admin/mod.rs` | 1h |
| P1-5 | 9 | Section requests — add 8s loading timeout | `src/admin/section_requests.rs` | 0.5h |
| P1-6 | 10 | Calendar admin — add 8s loading timeout, add RSVP count subscription (kind 31925) | `src/admin/calendar.rs` | 2h |

### P2 — Missing Features & UX (Sprint Days 3-4)

| ID | Snags | Work Item | File(s) | Est |
|----|-------|-----------|---------|-----|
| P2-1 | 16 | Add `/profile/:pubkey` route + ProfilePage component | `src/app.rs`, `src/pages/mod.rs`, new `src/pages/profile.rs` | 3h |
| P2-2 | 17 | Add `/search` route + SearchPage component | `src/app.rs`, `src/pages/mod.rs`, new `src/pages/search.rs` | 3h |
| P2-3 | — | Fix mobile nav — Forums href `/forums` not `/chat`, Profile href `/profile/{pubkey}` | `src/components/mobile_bottom_nav.rs` | 0.5h |
| P2-4 | 1 | Channel header — fallback to store lookup before relay fetch | `src/pages/channel.rs` | 1h |
| P2-5 | 3 | Category page — fix section matching (exact, case-insensitive, zone parent) | `src/pages/category.rs` | 1h |
| P2-6 | 7 | Legacy section inference — `infer_legacy_section()` for channels without section tag | `src/admin/mod.rs`, `src/stores/channels.rs` | 1h |
| P2-7 | 11 | Settings nickname — fetch kind-0 from relay on mount | `src/pages/settings.rs` | 1h |
| P2-8 | 14 | Zone filter — use filtered count, proper-case zone names | `src/pages/chat.rs` | 0.5h |
| P2-9 | 3b | Category icons — fix emoji rendering for zone categories | `src/pages/forums.rs` | 0.5h |

## 4. Architecture Changes

### 4.1 Relay Layer Hardening (P0-2, P0-5)

```
Before:
  publish() → send_raw() → hope for the best
  disconnect() → clear all subscriptions

After:
  publish_with_ack(event, callback) → track pending → route OK response → invoke callback
  Subscription { filters, on_event, on_eose } → replay REQ on reconnect
  disconnect() → preserve subscriptions for replay
```

**New types in relay.rs:**
```rust
type PublishCallback = Rc<dyn Fn(bool, String)>;

struct PendingPublish {
    on_ok: Option<PublishCallback>,
}

struct Subscription {
    filters: Vec<Filter>,
    on_event: EventCallback,
    on_eose: Option<EoseCallback>,
}
```

### 4.2 Auth Session Fix (P0-1)

```
Before:
  session_restore(local_key_user) → AuthPhase::Authenticated (no privkey in memory)
  → all signing fails silently → admin/chat/profile writes broken

After:
  session_restore(local_key_user) → AuthPhase::Unauthenticated (pubkey preserved)
  → UI shows "sign in again" → user re-enters key → signing works
```

### 4.3 Channel Identity Resolution (P0-3, P0-4)

```
Before:
  subscribe(kind:42, #e:[channel_kind40_id])
  → matches nothing if legacy data uses slugs/section tags

After:
  subscribe(kind:42) → client-side filter:
    event.tags.find(["e", val, ..., "root"]) OR first ["e", val]
    → match val against: channel.id, channel.name, channel.section
  → resolves both new and legacy tag structures
```

## 5. Files Changed

### Modified (14 files)
| File | Changes |
|------|---------|
| `src/relay.rs` | `publish_with_ack()`, `PendingPublish`, OK routing, subscription filter storage, reconnect replay, preserve subs on disconnect |
| `src/auth/session.rs` | Local-key restore → Unauthenticated |
| `src/stores/channels.rs` | Broad kind-42 sync, client-side channel resolution |
| `src/pages/channel.rs` | Variant tag matching, ack-aware send, store fallback for header |
| `src/pages/settings.rs` | Fetch kind-0 on mount, ack-aware profile save |
| `src/pages/chat.rs` | Filtered count for zone badge, proper-case zone names |
| `src/pages/category.rs` | Fix section matching logic |
| `src/pages/forums.rs` | Fix emoji rendering |
| `src/pages/mod.rs` | Export ProfilePage, SearchPage |
| `src/app.rs` | Add /profile/:pubkey and /search routes |
| `src/admin/mod.rs` | Ack-aware channel creation, legacy section inference, whitelist error surfacing |
| `src/admin/channel_form.rs` | Don't reset form before ack |
| `src/admin/section_requests.rs` | Loading timeout |
| `src/admin/calendar.rs` | Loading timeout, RSVP count subscription |
| `src/components/rsvp_buttons.rs` | Ack-aware RSVP |
| `src/components/mobile_bottom_nav.rs` | Fix Forums/Profile hrefs |

### New (2 files)
| File | Purpose |
|------|---------|
| `src/pages/profile.rs` | User profile page (pubkey, posts, about) |
| `src/pages/search.rs` | Global search (messages, users, channels) |

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Broad kind-42 scan won't scale | Medium | Temporary fix; normalize channel IDs in relay data long-term |
| `publish_with_ack` callback lifetime | Low | Use `Rc<dyn Fn>`, test in WASM context |
| Session restore change breaks passkey users | Low | Only affects `is_local_key` branch; passkey/NIP-07 paths unchanged |
| Reconnect subscription replay causes duplicates | Low | Dedup by subscription ID; relay handles duplicate REQ gracefully |

## 7. Testing Plan

| Phase | Method | Scope |
|-------|--------|-------|
| Unit | `cargo test -p nostr-core` | 129 existing tests + new relay ack tests |
| Compile | `cargo check --target wasm32-unknown-unknown` | Full WASM build |
| Integration | Manual QA of all 15 routes | Re-test all 18 snag scenarios |
| Regression | Browser automation | Homepage, login, chat, admin, settings |

## 8. Sprint Schedule

| Day | Focus | Deliverables |
|-----|-------|-------------|
| 1 | P0-1, P0-2 | Session fix, publish_with_ack |
| 2 | P0-3, P0-4, P0-5 | Message filters, subscription replay |
| 3 | P1-1 through P1-6 | Admin/RSVP/profile ack, timeouts |
| 4 | P2-1 through P2-9 | Missing routes, UX fixes, polish |
| 5 | QA + deploy | Full re-test, build, push |

## 9. Dependencies

- Existing relay must accept NIP-01 OK responses (confirmed working)
- Admin privkey: `a617d2109bdd3f1a607d5a837e885178f6367af296885d7f058c26b2bd03221a`
- Trunk build: `trunk build --release --public-url /community/`
- Deploy: GitHub Pages via `.github/workflows/deploy.yml`

---
title: "PRD: UX Onboarding & Journey Refinement"
version: "5.0.0"
status: accepted
date: 2026-03-16
branch: main
scope: "Forum-first UX, simplified auth, guided onboarding, Nostr abstraction"
baseline: "Post-parity: 95% feature parity achieved (v4.0), all 5 Rust workers deployed, all features wired in. This PRD addresses journey/UX gaps identified in external audit."
supersedes: null
depends-on: ["prd-rust-port-v4.0.md"]
---

# PRD v5.0: UX Onboarding & Journey Refinement

## 1. Context

An external UX audit of the DreamLab forum identified that while the system is
technically complete and functional for Nostr-savvy users, the onboarding and
navigation journeys are **chat-first rather than forum-first**, and protocol
terminology leaks into mainstream user-facing surfaces.

### What the audit found (validated against codebase)

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Post-registration and post-setup both navigate to `/chat`, not forums | High | **Open** |
| 2 | Login "traffic light" exposes 3 auth methods with Nostr jargon | High | **Open** |
| 3 | Profile setup is thin — no guided next steps, no explanation of relay publish | Medium | **Open** |
| 4 | Overall journey is chat-first, undermining forum mental model | High | **Open** |
| 5 | Missing admin/moderator journeys | Low | **Already exists** — 8 admin modules |
| 6 | Protocol-native language (NIP-07, nsec, PRF) alienates mainstream users | Medium | **Open** |
| 7 | No returnTo flow after auth redirect | Low | **Already fixed** — `login_redirect_target()` |
| 8 | DM routes use raw pubkeys, not display names | Low | **Already fixed** — `use_display_name_memo` |

### Scope

This PRD covers items 1–4 and 6. Items 5, 7, 8 are already resolved.

### Non-goals

- Offline-first / IndexedDB integration (explicitly deferred by stakeholder)
- Per-channel or per-section gating (zone model is binary)
- Full ONNX embedder deployment (using hash fallback)
- Native mobile app

## 2. Cohort Analysis

Four distinct user cohorts interact with the forum. Each has different
expectations and pain points.

### 2.1 First-time visitor (unauthenticated)

**Current journey:** Home → sees WebGPU hero + CTA → clicks Sign Up → creates
account → backs up nsec → lands in `/chat` → ???

**Problems:**
- Lands in chat, not the community/forums
- Never sees what the community offers before committing to registration
- No preview of forum content to motivate signup

**Target journey:** Home → sees community preview → clicks Sign Up → creates
account → backs up key → guided welcome page → enters Forums

### 2.2 Returning member

**Current journey:** Login → chooses from 3 confusing auth methods → lands in
`/chat` → must manually navigate to Forums

**Problems:**
- Auth method choice is overwhelming
- Default landing is chat, not the forum they came for
- returnTo works for auth-gated pages but signup/setup always go to `/chat`

**Target journey:** Login → single primary method (smart default) → returns to
intended destination or Forums home

### 2.3 Admin

**Current journey:** First-user-is-admin → setup → `/chat` → must find `/admin`
via navigation

**Problems:**
- No admin onboarding guidance
- Admin panel exists but first-time admin doesn't know what to configure
- No "admin checklist" or setup wizard

**Target journey:** First admin → setup → admin welcome with checklist → Forums

### 2.4 Nostr power user

**Current journey:** Login with NIP-07 or nsec → `/chat` → navigates freely

**Problems:**
- Minimal — this cohort handles protocol terminology fine
- Still benefits from forum-first navigation

**Target journey:** Unchanged, but expose advanced options behind a toggle
rather than on the primary login surface

## 3. Streams

### Stream 1: Forum-First Navigation (High Priority)

**Problem:** Post-registration, post-setup, and post-login all default to
`/chat`. The forum product's primary surface is `/forums`.

**Changes:**

#### 3.1 Setup page → Forums instead of Chat
- **File:** `pages/setup.rs` line 136
- Change: `nav("/chat", ...)` → `nav("/forums", ...)`
- After publishing kind-0 metadata, land on Forums so users discover community content

#### 3.2 Signup page → Forums instead of Chat
- **File:** `pages/signup.rs` lines 44, 73
- Change: default `return_to` from `"/chat"` to `"/forums"`
- Still respects `?returnTo=` if present

#### 3.3 Login page → Forums instead of Chat
- **File:** `pages/login.rs` line 31
- Change: default `return_to` from `"/chat"` to `"/forums"`
- Still respects `?returnTo=` if present

#### 3.4 Header nav emphasis
- **File:** `app.rs` header component
- Reorder nav links: Forums first, Chat second, DMs third
- Visual emphasis (amber accent) on Forums link

### Stream 2: Simplified Authentication UX (High Priority)

**Problem:** The login page presents three auth methods simultaneously with
protocol jargon ("NIP-07", "PRF", "nsec1"). Most users don't know what these
mean and can't make an informed choice.

**Changes:**

#### 2.1 Smart default with progressive disclosure
- **File:** `pages/login.rs`
- Default view: single "Sign In" button
  - If user has a registered passkey → attempt passkey login automatically
  - If NIP-07 extension detected → show "Sign in with Extension" as primary
  - Otherwise → show "Sign in with Key" as primary
- "More options" expandable section reveals all three methods
- Remove traffic-light color coding (green/yellow/red implies judgment)

#### 2.2 Plain-language labels
| Current | Proposed |
|---------|----------|
| "Private Key" + "Easy" | "Sign in with your key" |
| "Nostr Extension (NIP-07)" | "Sign in with browser extension" |
| "Passkey (PRF)" + "Chrome/Safari only" | "Sign in with biometrics" |

#### 2.3 Security guidance (not alarm)
- Replace "Easy" / "Chrome/Safari only" labels with brief one-line descriptions
- Add a subtle info tooltip explaining each method without protocol names
- Private key field: add "Your key never leaves your browser" reassurance

#### 2.4 Signup simplification
- **File:** `pages/signup.rs`
- Currently generates a keypair and shows nsec backup
- Add: brief explanation before key generation ("We'll create a secure identity
  for you. This key is yours alone — back it up so you can always access your
  account.")
- Post-backup: navigate to `/setup` (profile) instead of direct to `/chat`

### Stream 3: Guided Onboarding (Medium Priority)

**Problem:** After registration and profile setup, users have no guidance on
what to do next. They land in an empty chat view with no context.

**Changes:**

#### 3.1 Welcome card in Forums page
- **File:** `pages/forums.rs`
- New component: `WelcomeCard` — shown once to new users (flag in localStorage)
- Content:
  - "Welcome to DreamLab, {name}!"
  - Brief explanation of zones and categories
  - "Start by exploring the Home zone"
  - Dismissible (sets `dreamlab_welcome_dismissed` in localStorage)

#### 3.2 Admin onboarding checklist
- **File:** `pages/admin.rs` (or new `admin/onboarding.rs`)
- New component: `AdminChecklist` — shown on admin overview when setup is fresh
- Checklist items:
  - [ ] Create your first channel
  - [ ] Invite members (share signup link)
  - [ ] Configure zone access
  - [ ] Review relay settings
- Each item links to the relevant admin tab
- Dismissible

#### 3.3 Setup page → explain relay publishing
- **File:** `pages/setup.rs`
- Currently shows: "Your profile is published to the Nostr relay" (tiny footer text)
- Change: Move explanation above the form as a brief, friendly paragraph:
  "Your nickname and bio will be visible to other community members. This
   information is stored on the DreamLab relay."
- Remove "Nostr relay" terminology — use "DreamLab community" or "community relay"

### Stream 4: Nostr Abstraction Layer (Medium Priority)

**Problem:** Protocol terminology leaks into user-facing text throughout the
app: nsec, pubkey, NIP-07, NIP-44, relay, kind 0. This is fine for Nostr
power users but alienating for mainstream cohorts.

**Changes:**

#### 4.1 Terminology mapping
Apply consistently across all user-facing text:

| Protocol term | User-facing term |
|---------------|-----------------|
| pubkey | "your ID" or "public key" (in advanced view only) |
| nsec / private key | "your secret key" or "recovery key" |
| NIP-07 extension | "browser extension" |
| Passkey + PRF | "biometric sign-in" |
| relay | "community server" or omit |
| kind 0 metadata | "your profile" |
| NIP-44 encrypted | "end-to-end encrypted" (already used in DM chat) |

#### 4.2 Advanced mode toggle
- **File:** `pages/settings.rs`
- New preference: "Show technical details" (default: off)
- When on: show full Nostr terminology, pubkey hex, relay URLs
- When off: use friendly labels from 4.1
- Stored in `PreferencesStore` (localStorage-backed)

#### 4.3 Login page conditional terminology
- When "Show technical details" is off (default):
  - Hide hex/nsec format hints
  - Label key input as "Paste your recovery key"
  - Label extension as "Browser extension"
- When on:
  - Show current detailed labels

## 4. Implementation Priority

| Priority | Stream | Effort | Impact |
|----------|--------|--------|--------|
| P0 | Stream 1: Forum-first navigation | XS (4 line changes) | High — fixes primary journey break |
| P0 | Stream 2.1-2.2: Smart auth default | M (login.rs rewrite) | High — removes biggest barrier for new users |
| P1 | Stream 3.1: Welcome card | S (new component) | Medium — guides first session |
| P1 | Stream 2.3-2.4: Signup refinement | S (copy changes + flow) | Medium — reduces signup friction |
| P2 | Stream 3.2: Admin checklist | S (new component) | Medium — helps admin cohort |
| P2 | Stream 3.3: Setup explanation | XS (copy change) | Low-medium — reduces confusion |
| P2 | Stream 4.1-4.3: Nostr abstraction | M (cross-cutting) | Medium — long-term accessibility |

## 5. Files to Modify

### Stream 1 (P0)
- `pages/setup.rs` — change nav destination
- `pages/signup.rs` — change default return_to
- `pages/login.rs` — change default return_to
- `app.rs` — reorder header nav links

### Stream 2 (P0-P1)
- `pages/login.rs` — smart auth default, plain labels, progressive disclosure
- `pages/signup.rs` — pre-keygen explanation, post-backup flow
- `components/nsec_backup.rs` — friendly terminology

### Stream 3 (P1-P2)
- `pages/forums.rs` — WelcomeCard component
- `admin/overview.rs` — AdminChecklist component
- `pages/setup.rs` — explanation copy

### Stream 4 (P2)
- `pages/login.rs` — conditional terminology
- `pages/setup.rs` — terminology
- `stores/preferences.rs` — add `show_technical_details` field
- `pages/settings.rs` — toggle UI
- Cross-cutting: any component showing "pubkey", "relay", "NIP-*"

## 6. Success Criteria

1. **First-time user lands on Forums** after signup → setup → (not /chat)
2. **Login page shows single primary action** with "More options" for alternatives
3. **No protocol jargon on default surfaces** (NIP-07, nsec, PRF hidden behind toggle)
4. **Welcome card shown once** to new users on Forums page
5. **Admin checklist shown** to first admin on Overview tab
6. **All changes compile clean** — `cargo check --target wasm32-unknown-unknown -p forum-client`

## 7. Out of Scope (Deferred)

- Offline-first / IndexedDB (stakeholder decision)
- Per-channel gating / join requests (zone model is binary)
- Full ONNX embedder (hash fallback sufficient)
- Native mobile app
- Email/password auth (Nostr-native only)
- Multi-language i18n (English only for now)

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Passkey auto-detect may fail silently | Fall back to key input with clear error |
| "Show technical details" toggle increases maintenance | Use a single `nostr_label()` helper function |
| Welcome card dismissed too quickly | Make it visually appealing, not a banner |
| Admin checklist becomes stale | Derive completion state from actual data (channels exist, users exist) |

## 9. References

- External UX audit: provided in conversation (2026-03-16)
- ADR-022: NIP-29 Group Access Model
- PRD v4.0: Feature Parity Sprint (complete)
- ADR-012: Hardening Sprint (complete)
- Auth flow documentation: `CLAUDE.md` Forum Auth Architecture section

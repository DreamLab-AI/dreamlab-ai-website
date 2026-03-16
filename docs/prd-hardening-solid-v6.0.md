---
title: "PRD: Audit Remediation & Solid Pod Infrastructure Upgrade"
version: "6.0.0"
status: accepted
date: 2026-03-16
branch: main
scope: "Full-project audit remediation (security, quality, tests) + Solid pod upgrade to LDP compliance"
baseline: "v6.0 — v4.0 parity sprint complete, v5.0 hardening + UX shipped. This sprint resolves all audit findings and upgrades pod infrastructure."
supersedes: null
depends-on:
  - prd-rust-port-v4.0.md
  - prd-forum-hardening-v5.0.md
  - prd-ux-onboarding-v5.0.md
sources:
  - Full project audit (2026-03-16) — 5 CRITICAL, 5 HIGH across Rust workers + forum client + React site
  - JavaScriptSolidServer (JSS) architecture research — LDP, WAC, content negotiation
  - ADR-011 (images-to-solid-pods), ADR-023 (forum-relay-hardening)
adrs:
  - "024-solid-ldp-containers.md (new — Stream 8)"
  - "025-relay-module-split.md (new — Stream 3)"
  - "026-solid-enhanced-wac.md (new — Stream 10)"
---

# PRD v6.0: Audit Remediation & Solid Pod Infrastructure Upgrade

## 1. Context

The DreamLab forum and worker infrastructure reached feature parity (v4.0), runtime
hardening (v5.0), and UX refinement (v5.0-UX). A comprehensive project audit on
2026-03-16 uncovered **5 CRITICAL** and **5 HIGH** security issues, plus significant
code quality debt across 4 Rust crates, the Leptos forum client, and the React
marketing site. Separately, the current `pod-worker` is a minimal R2 + KV store with
basic NIP-98 auth and flat-file WAC ACL — far short of the Solid protocol specification.

This PRD defines a single sprint with two initiatives:

1. **Audit Remediation** (Streams 1--7): Fix all security vulnerabilities, refactor
   oversized modules, eliminate dead code, establish test infrastructure, wire
   remaining UX gaps, and resolve defect-prediction findings.

2. **Solid Pod Infrastructure Upgrade** (Streams 8--12): Bring `pod-worker` to full
   LDP (Linked Data Platform) compliance with container support, conditional requests,
   enhanced WAC, JSON-LD native storage, and federation-ready features — inspired by
   the JavaScriptSolidServer (JSS) architecture.

### Why now

- CRIT-01 (XSS via comrak) and CRIT-02 (NIP-98 body hash bypass) are exploitable in
  production. Every day they remain unpatched is a security exposure.
- `relay_do.rs` at 1,401 LOC and `preview-worker/src/lib.rs` at 1,037 LOC violate
  the project's 500-line file limit and are increasingly difficult to review.
- The pod infrastructure is the foundation for user-generated content, encrypted DMs,
  and future federation. Upgrading it now prevents costly retrofits.

## 2. Success Criteria

- [ ] All 5 CRITICAL security issues resolved and verified
- [ ] All 5 HIGH security issues resolved and verified
- [ ] `relay_do.rs` split into 5 modules, none exceeding 300 LOC
- [ ] `preview-worker/src/lib.rs` split into 4 modules, none exceeding 300 LOC
- [ ] Dead-code warnings reduced from 45 to 0
- [ ] 100+ new unit tests across relay-worker, auth-worker, search-worker, forum-client
- [ ] Vitest + @testing-library/react installed with initial React test suite
- [ ] `cargo check --target wasm32-unknown-unknown -p forum-client` passes with 0 warnings
- [ ] `cargo test` passes across all workspace crates
- [ ] `npm run build` and `npm run lint` pass with 0 new warnings
- [ ] LDP container CRUD verified against Solid Test Suite (subset)
- [ ] Conditional requests (ETag, If-Match, If-None-Match) verified
- [ ] ACL inheritance verified (3-level deep container tree)
- [ ] No new `unwrap()` calls introduced in any worker or forum-client code
- [ ] ADR-024, ADR-025, ADR-026 written and accepted

## 3. Priority Classification

| Priority | Streams | Description | Blocking |
|----------|---------|-------------|----------|
| **P0** | 1, 2 | Security critical + high fixes | Yes — deploy before any other work |
| **P1** | 3, 4, 5 | Relay refactor, code quality, test infra | Yes — required for maintainability |
| **P1-P2** | 6, 7 | UX completion, defect prediction | No — can be interleaved |
| **P1-P2** | 8, 9, 10 | Solid pod core (LDP, conditional, WAC) | No — can be phased |
| **P2** | 11, 12 | Solid pod advanced (JSON-LD, federation) | No — can follow in next sprint |

---

# Part 1: Audit Remediation (Streams 1--7)

## Stream 1: Security Critical Fixes (P0)

### CRIT-01: XSS via comrak `inner_html`

**Severity:** CRITICAL
**Location:** `community-forum-rs/crates/forum-client/src/components/mention_text.rs:33`, `message_input.rs:263`
**Description:** Markdown rendered via `comrak` with default options allows raw HTML
injection. The output is passed to Leptos `inner_html` attribute, which does not
sanitize. An attacker can embed `<script>` tags or event handlers in a Nostr message
that execute in every viewer's browser.

**Fix:**
1. Create `community-forum-rs/crates/forum-client/src/utils/sanitize.rs`:
   - `pub fn sanitize_markdown(input: &str) -> String` — calls `comrak::markdown_to_html`
     with `Options` configured: `render.unsafe_ = false`, `extension.tagfilter = true`,
     `extension.autolink = true`, `extension.table = true`, `extension.strikethrough = true`.
   - Re-export from `utils/mod.rs`.
2. Replace all direct `comrak::markdown_to_html` calls in `mention_text.rs` and
   `message_input.rs` with `sanitize_markdown()`.
3. Audit all other `inner_html` usages across the forum-client crate (expected: 5--8 sites).
   Ensure every one passes through `sanitize_markdown()` or a static string.

**Acceptance criteria:**
- [ ] `<script>alert(1)</script>` in a Nostr message content renders as escaped text
- [ ] `<img onerror="alert(1)">` in message content is stripped by tagfilter
- [ ] All `inner_html` call sites documented in ADR-025 appendix
- [ ] Unit test: `sanitize_markdown("<script>xss</script>")` returns no `<script>` tag

**Files:** `utils/sanitize.rs` (new), `mention_text.rs`, `message_input.rs`, `utils/mod.rs`
**Est:** 3h

---

### CRIT-02: NIP-98 Body Hash Never Verified on POST

**Severity:** CRITICAL
**Location:** `community-forum-rs/crates/auth-worker/src/lib.rs:190-201`
**Description:** NIP-98 specification requires that POST/PUT requests include a
`payload` tag containing the SHA-256 hash of the request body. The auth-worker
consumes the body via `.text()` in the route handler but never passes the raw bytes
to the NIP-98 verifier. An attacker can replay a valid NIP-98 token with a different
body, bypassing payload integrity.

**Fix:**
1. In `lib.rs` main router, read the raw body bytes **before** route matching:
   ```rust
   let body_bytes = req.bytes().await.unwrap_or_default();
   ```
2. Pass `&body_bytes` to the NIP-98 verification function alongside the `Authorization`
   header value.
3. In `nostr_core::nip98::verify_nip98_token()`, add `expected_payload: Option<&[u8]>`
   parameter. When present, compute `SHA-256(body)` and compare against the `payload`
   tag value.
4. Re-parse `body_bytes` into the handler's expected type (JSON, form, etc.) after
   verification.
5. Apply the same pattern to `pod-worker` and `relay-worker` POST endpoints.

**Acceptance criteria:**
- [ ] POST with valid NIP-98 token but altered body returns 401
- [ ] POST with valid NIP-98 token and matching body returns 200
- [ ] POST without `payload` tag on body-bearing request returns 401
- [ ] GET requests (no body) continue to work without payload verification
- [ ] Unit tests in `nostr-core` for `verify_nip98_token` with payload scenarios

**Files:** `auth-worker/src/lib.rs`, `pod-worker/src/lib.rs`, `relay-worker/src/lib.rs`, `nostr-core/src/nip98.rs`
**Est:** 4h

---

### CRIT-03: 13 `unwrap()` in IndexedDB Init

**Severity:** CRITICAL
**Location:** `community-forum-rs/crates/forum-client/src/stores/indexed_db.rs:104-186`
**Description:** IndexedDB initialization uses 13 `.unwrap()` calls on `JsValue`
results. If IndexedDB is unavailable (private browsing, storage quota exceeded, Firefox
with corrupted profile), the entire application panics on load.

**Fix:**
1. Change `open()` to return `Result<Self, IndexedDbError>` where `IndexedDbError` is
   a new enum: `NotAvailable`, `OpenFailed(String)`, `UpgradeFailed(String)`.
2. Replace all 13 `.unwrap()` with `.map_err(|e| IndexedDbError::...)?`.
3. Callers of `open()` fall back to in-memory cache when `Err` is returned.
4. Log warning via `web_sys::console::warn_1` when falling back.
5. Store a `RwSignal<bool>` for `indexed_db_available` in the app state so UI can
   display "Offline storage unavailable" badge.

**Acceptance criteria:**
- [ ] Application loads in Firefox private browsing without panic
- [ ] `indexed_db.rs` contains zero `.unwrap()` calls
- [ ] Fallback to in-memory cache verified (messages still display, not persisted)
- [ ] Warning logged to console when IndexedDB unavailable

**Files:** `stores/indexed_db.rs`, callers in `stores/channels.rs`, `stores/messages.rs`
**Est:** 4h

---

### CRIT-04: NIP-40 COUNT SQL Bug

**Severity:** CRITICAL
**Location:** `community-forum-rs/crates/relay-worker/src/relay_do.rs:784-789`
**Description:** The NIP-40 COUNT query uses `json_extract(tags, '$[0]')` to extract
tag names, but this extracts the first element of the outer tags array (which is itself
an array), not the tag name. The result is always `null`, so expiration-based COUNT
queries return incorrect results.

**Fix:**
1. Remove the SQL-level JSON tag extraction for COUNT queries.
2. Use application-layer filtering consistent with `query_events()`: fetch matching
   events, deserialize, filter by tag predicate in Rust, return count.
3. For performance, add a `SELECT COUNT(*)` path that skips tag filtering when the
   filter has no tag constraints (common case).
4. Add index on `(kind, created_at)` to D1 schema if not present.

**Acceptance criteria:**
- [ ] COUNT query with `#expiration` tag returns correct count
- [ ] COUNT query without tag filters uses optimized SQL COUNT(*)
- [ ] Unit test for `build_count_query()` with various filter combinations
- [ ] No regression in NIP-45 COUNT for non-tag filters

**Files:** `relay_do.rs` (to be split into `filter.rs` in Stream 3)
**Est:** 3h

---

### CRIT-05: Hibernation Recovery Loses Subscriptions + Auth State

**Severity:** CRITICAL
**Location:** `community-forum-rs/crates/relay-worker/src/relay_do.rs:430-488`
**Description:** When a Durable Object hibernates between WebSocket messages, the
in-memory `sessions` HashMap is wiped. The current `recover_session()` rebuilds
session identity from WebSocket tags but does **not** restore active subscriptions
or NIP-42 auth state. After hibernation wake, clients receive no events for their
subscriptions and must re-authenticate.

**Fix:**
1. Serialize active subscription filters as JSON and store in WebSocket tags:
   `sub:{sub_id}:{json_filters}`. Tags have a 1KB limit per tag, so large filter
   sets are split across multiple tags.
2. Serialize NIP-42 auth state (authenticated pubkey) as tag: `auth:{pubkey}`.
3. In `recover_session()`, parse `sub:*` and `auth:*` tags to rebuild full session
   state.
4. After recovery, replay stored events matching recovered subscriptions (last 60
   seconds, bounded by `STORED_EVENT_REPLAY_WINDOW`).
5. Add `STORED_EVENT_REPLAY_WINDOW` constant (default: 60 seconds).

**Acceptance criteria:**
- [ ] Client subscription survives DO hibernation (verified with forced alarm wake)
- [ ] NIP-42 authenticated session survives hibernation
- [ ] Subscription replay delivers events missed during hibernation window
- [ ] Tag serialization handles filter sets up to 10 subscriptions
- [ ] Unit test for `serialize_subscriptions()` / `deserialize_subscriptions()`

**Files:** `relay_do.rs` (to be split into `session.rs` in Stream 3)
**Est:** 6h

---

## Stream 2: Security High Fixes (P0)

### HIGH-01: No Rate Limiting on HTTP Workers

**Severity:** HIGH
**Location:** `auth-worker`, `pod-worker`, `preview-worker`, `search-worker`
**Description:** All four HTTP workers accept unlimited requests. An attacker can
brute-force WebAuthn challenges, exhaust D1 read units, or abuse the preview-worker
as an open SSRF proxy.

**Fix:**
1. Add Cloudflare Rate Limiting rules via `wrangler.toml` configuration:
   - Auth-worker: 20 req/min per IP on `/auth/*` endpoints
   - Pod-worker: 60 req/min per IP on write endpoints, 300 req/min on read
   - Preview-worker: 30 req/min per IP (prevents SSRF abuse)
   - Search-worker: 100 req/min per IP
2. Application-layer fallback: implement IP-based sliding window in each worker using
   a shared `RateLimiter` struct backed by KV with TTL.
3. Return `429 Too Many Requests` with `Retry-After` header.

**Acceptance criteria:**
- [ ] Exceeding rate limit returns 429 with correct `Retry-After` header
- [ ] Rate limit state persists across requests (KV-backed)
- [ ] Legitimate traffic patterns (auth + browse + search in a session) remain unblocked
- [ ] Rate limiter struct is in a shared crate or copy-pasted with identical logic

**Files:** `auth-worker/src/lib.rs`, `pod-worker/src/lib.rs`, `preview-worker/src/lib.rs`, `search-worker/src/lib.rs`, shared `rate_limit.rs`
**Est:** 4h

---

### HIGH-02: Localhost in Production CORS

**Severity:** HIGH
**Location:** `auth-worker/src/lib.rs`, `pod-worker/src/lib.rs`, `relay-worker/src/lib.rs`
**Description:** CORS `Access-Control-Allow-Origin` includes `http://localhost:5173`
and `http://localhost:5174` in production builds. An attacker running a local dev
server can make authenticated cross-origin requests.

**Fix:**
1. Move allowed origins to an environment variable `ALLOWED_ORIGINS` (comma-separated).
2. In production wrangler.toml: `ALLOWED_ORIGINS = "https://dreamlab-ai.com,https://www.dreamlab-ai.com"`.
3. In dev wrangler.toml (or `wrangler dev` override): include localhost.
4. Fallback: if `ALLOWED_ORIGINS` is unset, default to `https://dreamlab-ai.com` only.
5. Validate `Origin` header against the list; reject with 403 if not matched.

**Acceptance criteria:**
- [ ] Production workers reject requests from `localhost` origins
- [ ] `wrangler dev` includes localhost origins for local development
- [ ] No hardcoded localhost strings remain in Rust source files
- [ ] CORS preflight (OPTIONS) returns correct origin for allowed requests

**Files:** `auth-worker/src/lib.rs`, `pod-worker/src/lib.rs`, `relay-worker/src/lib.rs`, `search-worker/src/lib.rs`, `preview-worker/src/lib.rs`, all `wrangler.toml` files
**Est:** 3h

---

### HIGH-03: `#[derive(Clone)]` on Passkey Result Structs

**Severity:** HIGH
**Location:** `community-forum-rs/crates/forum-client/src/auth/passkey.rs`
**Description:** Structs wrapping WebAuthn assertion/attestation results derive `Clone`,
allowing the private key material contained within to be duplicated. While the privkey
is in a closure, the intermediate PRF output and HKDF result structs should not be
clonable.

**Fix:**
1. Remove `#[derive(Clone)]` from `PasskeyRegistrationResult`, `PasskeyLoginResult`,
   and any struct containing PRF output bytes.
2. Where cloning is needed for signal updates, extract the non-sensitive fields into
   a separate `PublicResult` struct and clone only that.
3. Add a comment explaining why `Clone` is intentionally omitted.

**Acceptance criteria:**
- [ ] No struct containing key material implements `Clone`
- [ ] `cargo check` passes — all moved values handled correctly
- [ ] Comment on each struct explains the security rationale

**Files:** `auth/passkey.rs`, `auth/session.rs`
**Est:** 2h

---

### HIGH-04: Hardcoded Fallback Auth API URL in WASM

**Severity:** HIGH
**Location:** `community-forum-rs/crates/forum-client/src/auth/http.rs` (or constants)
**Description:** A hardcoded fallback URL (`https://dreamlab-auth-api.*.workers.dev`)
is compiled into the WASM binary. If the environment variable is missing at build time,
the client silently uses the fallback, which may point to a development or staging
endpoint.

**Fix:**
1. Use `std::option_env!("VITE_AUTH_API_URL")` at compile time.
2. If `None`, emit a `compile_error!("VITE_AUTH_API_URL must be set at build time")`.
3. Remove the fallback URL string entirely from the source.
4. Update Trunk.toml / build scripts to ensure the variable is always set.
5. Document the required build environment variables in `community-forum-rs/README.md`.

**Acceptance criteria:**
- [ ] Build without `VITE_AUTH_API_URL` fails with clear error message
- [ ] No hardcoded `workers.dev` URLs remain in forum-client source
- [ ] CI build sets the variable correctly

**Files:** `auth/http.rs` (or wherever the constant is defined), `Trunk.toml`, `community-forum-rs/README.md`
**Est:** 1h

---

### HIGH-05: React `innerHTML` in Index.tsx

**Severity:** HIGH
**Location:** `src/pages/Index.tsx:434`
**Description:** The landing page uses `dangerouslySetInnerHTML` to render content
that may include user-influenced data or CMS-sourced HTML without DOMPurify
sanitization.

**Fix:**
1. If the content is static/hardcoded: replace `dangerouslySetInnerHTML` with JSX
   elements (DOM API).
2. If the content is dynamic: pipe through `DOMPurify.sanitize()` before setting.
3. Audit all other `dangerouslySetInnerHTML` usages in `src/` (expected: 2-4 sites).
4. Add ESLint rule `no-danger` to `eslint.config.js` to flag future usages.

**Acceptance criteria:**
- [ ] No unsanitized `dangerouslySetInnerHTML` in `src/pages/Index.tsx`
- [ ] ESLint `no-danger` rule added (warn level, not error, to avoid blocking CI)
- [ ] All existing `dangerouslySetInnerHTML` sites either use DOMPurify or are proven static

**Files:** `src/pages/Index.tsx`, `eslint.config.js`
**Est:** 2h

---

## Stream 3: Relay Worker Refactor (P1)

**ADR:** 025-relay-module-split.md

### 3a. Split `relay_do.rs` (1,401 LOC) into 5 Modules

Current state: a single file with 37 functions handling session management, event
filtering, NIP-09 deletion, NIP-29 group enforcement, and broadcasting.

Target module structure:

| Module | Responsibility | Target LOC |
|--------|---------------|------------|
| `relay_do.rs` | DO lifecycle, alarm, WebSocket accept, dispatch | ~250 |
| `session.rs` | Session struct, add/remove/recover, hibernation tags | ~250 |
| `filter.rs` | `NostrFilter`, `build_filter_conditions`, `event_matches_filters`, COUNT | ~300 |
| `nip09.rs` | Deletion event handling (kind 5, kind 9005) | ~100 |
| `nip29.rs` | Group admin-kind enforcement, membership checks | ~150 |
| `broadcast.rs` | Subscription matching, message fan-out, rate limiting | ~200 |

**Method:**
1. Extract pure functions first (no `&self` dependency): `event_matches_filters`,
   `build_filter_conditions`, `validate_event`, NIP-09 handlers, NIP-29 admin checks.
2. Move session management into `session.rs` with a `SessionManager` struct wrapping
   the `RefCell<HashMap>`.
3. Move broadcast logic (iterate sessions, match filters, send) into `broadcast.rs`.
4. Keep DO trait implementation and WebSocket accept in `relay_do.rs`.
5. Re-export from `mod.rs` so external API is unchanged.

**Acceptance criteria:**
- [ ] No file in `relay-worker/src/` exceeds 300 LOC
- [ ] `cargo check -p relay-worker` passes
- [ ] All existing relay functionality preserved (manual WebSocket test)
- [ ] Public API from `relay_do.rs` unchanged (re-exports)

**Est:** 6h

---

### 3b. Split `preview-worker/src/lib.rs` (1,037 LOC) into 4 Modules

Target module structure:

| Module | Responsibility | Target LOC |
|--------|---------------|------------|
| `lib.rs` | Worker entry point, router, CORS | ~150 |
| `fetch.rs` | HTTP fetch with SSRF protection, redirect handling | ~200 |
| `parse.rs` | HTML meta tag extraction, Open Graph parsing | ~250 |
| `oembed.rs` | oEmbed discovery and formatting | ~200 |
| `ssrf.rs` | DNS resolution, private IP blocking, URL validation | ~150 |

**Acceptance criteria:**
- [ ] No file exceeds 300 LOC
- [ ] `cargo check -p preview-worker` passes
- [ ] All existing preview functionality preserved

**Est:** 4h

---

### 3c. Regex Compilation to `OnceLock`

**Location:** `preview-worker/src/lib.rs` — 12 `Regex::new(...).unwrap()` calls.

**Fix:** Replace with `static` `OnceLock<Regex>` pattern:
```rust
use std::sync::OnceLock;
fn og_title_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r#"..."#).expect("valid regex"))
}
```

**Acceptance criteria:**
- [ ] Zero runtime `Regex::new()` calls in hot paths
- [ ] All 12 regexes compiled once via `OnceLock`
- [ ] `.expect("valid regex")` with descriptive message (compile-time-knowable patterns)

**Est:** 1h

---

## Stream 4: Code Quality (P1)

### 4a. Eliminate 45 Dead-Code Warnings

1. Run `cargo fix --allow-dirty --target wasm32-unknown-unknown -p forum-client` for
   the 11 auto-fixable warnings (unused imports, unused variables).
2. Manually audit the remaining 34 warnings:
   - If the function/struct is genuinely unused: delete it.
   - If it is used only in tests: gate with `#[cfg(test)]`.
   - If it is used only in WASM: gate with `#[cfg(target_arch = "wasm32")]`.
3. Target: `cargo check -p forum-client --target wasm32-unknown-unknown 2>&1 | grep "warning" | wc -l` returns 0.

**Acceptance criteria:**
- [ ] 0 dead-code warnings from `forum-client`
- [ ] No functional code removed (only genuinely dead code)

**Est:** 3h

---

### 4b. Remove or Gate Dead IndexedDB Store (392 LOC)

**Location:** `stores/indexed_db.rs` — the majority of this file implements a feature
that is currently unused (offline message persistence). After CRIT-03 fix, the
remaining code should be gated behind a feature flag.

**Fix:**
1. Add `offline` feature to `forum-client/Cargo.toml` (default off).
2. Gate the full IndexedDB store behind `#[cfg(feature = "offline")]`.
3. When `offline` is disabled, the fallback in-memory store is used.
4. Document in `community-forum-rs/README.md`.

**Acceptance criteria:**
- [ ] Default build excludes IndexedDB code (smaller WASM binary)
- [ ] `cargo check --features offline` compiles the full IndexedDB store
- [ ] No dead code warnings from IndexedDB module

**Est:** 2h

---

### 4c. Fix 4 `serde_json::to_string().unwrap()` in Admin

**Location:** `community-forum-rs/crates/forum-client/src/admin/mod.rs`

**Fix:** Replace with `match` or `map_err()` and display error toast on serialization failure.

**Acceptance criteria:**
- [ ] Zero `.unwrap()` calls on `serde_json` operations in admin module
- [ ] Serialization errors surfaced to user via toast

**Est:** 1h

---

### 4d. Consolidate 4 Duplicated `relay_api_base()`

**Location:** 4 files each define their own `relay_api_base()` or equivalent function
to construct the relay URL.

**Fix:**
1. Create `community-forum-rs/crates/forum-client/src/utils/relay_url.rs`.
2. Single `pub fn relay_api_base() -> String` with the canonical logic.
3. Replace all 4 call sites with the shared function.

**Acceptance criteria:**
- [ ] Single source of truth for relay URL construction
- [ ] All 4 previous definitions removed

**Est:** 1h

---

### 4e. Extract Cohort-to-Zone Mapping into Shared Const

**Location:** Duplicated mapping between cohort names and zone levels exists in both
`forum-client` and `relay-worker`.

**Fix:** Add `pub const COHORT_ZONE_MAP: &[(&str, u8)]` to `nostr-core` and import
from both crates.

**Acceptance criteria:**
- [ ] Single definition in `nostr-core`
- [ ] Both `forum-client` and `relay-worker` import from `nostr-core`

**Est:** 1h

---

### 4f. Centralize 83 `web_sys::window()` Calls

**Location:** Across 30+ files in `forum-client`.

**Fix:**
1. Create `utils/window.rs` with `pub fn window() -> web_sys::Window`.
2. This function calls `web_sys::window().expect("no global window")` once.
3. Add convenience wrappers: `document()`, `local_storage()`, `location()`.
4. Replace all 83 direct `web_sys::window()` calls.

**Acceptance criteria:**
- [ ] Single `window()` entry point
- [ ] Convenience wrappers reduce boilerplate at call sites
- [ ] `cargo check` passes

**Est:** 3h

---

### 4g. Standardize `expect_context` vs `use_context`

**Location:** 47 `expect_context` and 9 `use_context` across forum-client.

**Fix:**
1. Audit all 56 context access sites.
2. Within `spawn_local` closures: use `use_context` (returns `Option`) with graceful
   handling, because the reactive owner may have been disposed.
3. In synchronous component bodies: `expect_context` is safe.
4. Document the rule in a code comment at `app.rs` context provider section.

**Acceptance criteria:**
- [ ] All `spawn_local` bodies use `use_context` with `Option` handling
- [ ] All synchronous component bodies use `expect_context`
- [ ] No panics from context access in edge cases (tab switch, navigation)

**Est:** 3h

---

## Stream 5: Test Infrastructure (P1)

### 5a. Relay-Worker Unit Tests (40--50 tests)

Target functions:

| Function | Tests | Focus |
|----------|-------|-------|
| `validate_event` | 8 | Valid event, bad signature, future timestamp, oversized content, too many tags |
| `event_matches_filters` | 12 | Kind match, author match, tag match, since/until, limit, compound filters |
| `build_filter_conditions` | 10 | SQL generation for various filter combinations, injection prevention |
| `check_rate_limit` | 5 | Under limit, at limit, over limit, window expiry, per-IP isolation |
| `serialize_subscriptions` | 5 | Round-trip, empty subs, max size, Unicode filter values |
| `recover_session` | 5 | Tag parsing, missing tags, corrupt tags, multiple sessions |

**Acceptance criteria:**
- [ ] `cargo test -p relay-worker` passes with 40+ tests
- [ ] All pure functions tested without DO/WebSocket dependencies

**Est:** 8h

---

### 5b. Auth-Worker Unit Tests (15--20 tests)

Target functions:

| Function | Tests | Focus |
|----------|-------|-------|
| `constant_time_equal` | 3 | Equal, not equal, different length |
| `is_valid_pubkey` | 4 | Valid hex, short, non-hex, empty |
| `base64url_decode` | 4 | Valid, padding, invalid chars, empty |
| `verify_nip98_token` | 5 | Valid token, expired, wrong URL, wrong method, bad payload hash |
| `RateLimiter` | 4 | Under limit, at limit, over limit, TTL expiry |

**Acceptance criteria:**
- [ ] `cargo test -p auth-worker` passes with 15+ tests
- [ ] NIP-98 verification tested with known test vectors

**Est:** 4h

---

### 5c. Search-Worker Unit Tests (15--20 tests)

Target functions:

| Function | Tests | Focus |
|----------|-------|-------|
| `VectorStore::insert` | 4 | Single vector, duplicate ID, capacity limits, zero vector |
| `VectorStore::search` | 5 | Exact match, approximate match, empty store, k > count, threshold |
| `VectorStore::delete` | 3 | Existing ID, non-existing ID, delete then search |
| RVF serialize/deserialize | 5 | Round-trip, corrupt header, empty segments, large payload |

**Acceptance criteria:**
- [ ] `cargo test -p search-worker` passes with 15+ tests
- [ ] RVF format tested with known binary fixtures

**Est:** 4h

---

### 5d. Forum-Client Auth Tests (20--25 tests)

Target functions:

| Function | Tests | Focus |
|----------|-------|-------|
| `decode_nsec` | 5 | Valid bech32, invalid checksum, wrong HRP, too short, non-bech32 |
| `PrivkeyMem::zeroize` | 3 | After drop, after explicit zeroize, memory contains zeros |
| `sign_event` | 5 | Valid signature, empty content, large content, special chars |
| `create_nip98_token` | 5 | GET, POST with body, wrong URL, expired, future timestamp |
| `hkdf_derive` | 5 | Deterministic output, different salt → different key, edge-case inputs |

**Acceptance criteria:**
- [ ] `cargo test -p forum-client --lib` passes with 20+ tests
- [ ] WASM-independent tests (pure crypto logic) run in native target

**Est:** 6h

---

### 5e. React Test Infrastructure

**Fix:**
1. Install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`.
2. Configure `vitest.config.ts` with `environment: 'jsdom'`.
3. Add `"test": "vitest run"` to `package.json` scripts.
4. Write initial tests:
   - Contact form: Zod validation (5 tests — valid, missing fields, invalid email,
     XSS in name, max length).
   - Router: all 14 routes render without crash (14 tests).
   - WorkshopCard: renders title, description, link (3 tests).

**Acceptance criteria:**
- [ ] `npm test` passes with 20+ tests
- [ ] Test files live in `src/__tests__/` or colocated as `*.test.tsx`
- [ ] CI runs `npm test` in the deploy workflow

**Est:** 6h

---

### 5f. Property-Based Tests for nostr-core

**Fix:**
1. Add `proptest` to `nostr-core` dev dependencies.
2. Write property tests:
   - NIP-44: 10K random plaintexts → encrypt → decrypt → original (round-trip)
   - NIP-98: 10K random (URL, method, body) tuples → create token → verify → pass
   - HKDF: determinism property (same input → same output, always)
   - Event serialization: 10K random events → serialize → deserialize → equal
3. Add `#[cfg(not(target_arch = "wasm32"))]` gate (proptest does not run in WASM).

**Acceptance criteria:**
- [ ] `cargo test -p nostr-core` includes proptest suites
- [ ] 10K iterations per property (configurable via `PROPTEST_CASES`)
- [ ] No failures found

**Est:** 4h

---

### 5g. DOMPurify Audit Fix

**Fix:**
1. Run `npm audit` and verify GHSA-v2wj-7wpq-c8vv status.
2. If fix available: `npm audit fix` or upgrade `dompurify` to patched version.
3. If no fix: document in ADR appendix with mitigation (our usage pattern may not be
   affected).

**Acceptance criteria:**
- [ ] `npm audit` shows 0 critical / 0 high for DOMPurify
- [ ] Or: documented mitigation if no upstream fix available

**Est:** 0.5h

---

## Stream 6: UX Completion (P1--P2)

### 6a. Wire `show_technical_details` Preference into Login

**Location:** `community-forum-rs/crates/forum-client/src/pages/login.rs`,
`stores/preferences.rs`

**Description:** The preferences store already has a `show_technical_details: bool`
signal. The login page should read this preference and conditionally show/hide
Nostr-specific terminology (nsec, NIP-07, hex key).

**Fix:**
1. In `login.rs`, read `show_technical_details` from preferences store.
2. When `false`: show "Passkey" as the primary method, hide "Advanced" tab entirely
   unless user clicks "More options".
3. When `true`: show all three auth methods with full technical labels.
4. Default for new users: `false`.

**Acceptance criteria:**
- [ ] New users see simplified login (passkey only, "More options" disclosure)
- [ ] Users who toggle `show_technical_details` in settings see full auth options
- [ ] No functional change to auth flows

**Files:** `pages/login.rs`, `stores/preferences.rs`
**Est:** 2h

---

### 6b. Admin Onboarding Checklist Component

**Description:** First-time admin (first-user-is-admin flow) sees a checklist overlay
guiding them through essential setup tasks.

**Checklist items:**
1. Create at least one channel
2. Create at least one forum section
3. Review relay settings
4. (Optional) Invite another admin

**Fix:**
1. Create `components/admin_checklist.rs`.
2. Track completion state in localStorage (`admin_checklist_dismissed`).
3. Show as a dismissable card at the top of `/admin` page.
4. Each item links to the relevant admin tab.

**Acceptance criteria:**
- [ ] First admin visit shows checklist
- [ ] Completing items updates checklist state
- [ ] "Dismiss" hides permanently (localStorage)

**Files:** `components/admin_checklist.rs` (new), `admin/mod.rs`
**Est:** 3h

---

### 6c. BIP39 Mnemonic Display for Key Backup

**Description:** Alternative to raw hex/nsec backup. Display 24-word BIP39 mnemonic
derived from the private key entropy.

**Fix:**
1. Add BIP39 English wordlist as a const array in `utils/bip39.rs` (2,048 words).
2. `pub fn privkey_to_mnemonic(privkey: &[u8; 32]) -> Vec<&'static str>` — split 256
   bits into 24 x 11-bit indices, append checksum.
3. Display in `components/nsec_backup.rs` as an alternative view (toggle button).
4. Add "Copy mnemonic" and "Download as text" actions.

**Acceptance criteria:**
- [ ] Mnemonic is deterministic (same privkey → same 24 words)
- [ ] Mnemonic view toggleable from nsec view
- [ ] Unit test: known test vector privkey → known mnemonic

**Files:** `utils/bip39.rs` (new), `components/nsec_backup.rs`
**Est:** 4h

---

## Stream 7: Defect Prediction Fixes (P1--P2)

### 7a. `unsafe impl Send+Sync` Guard

**Location:** `stores/dm.rs`, `relay.rs`, `admin/user_table.rs`

**Description:** Three structs use `unsafe impl Send for X {}` and
`unsafe impl Sync for X {}` to satisfy compiler requirements. These are safe only
in the single-threaded WASM context. If the code is ever compiled for native (e.g.,
for testing), the `unsafe` impls could mask real data races.

**Fix:**
1. Wrap all `unsafe impl Send` and `unsafe impl Sync` blocks in
   `#[cfg(target_arch = "wasm32")]`.
2. For native testing, provide alternative implementations or use `PhantomData<!Send>`
   to make the incompatibility explicit.

**Acceptance criteria:**
- [ ] `unsafe impl Send/Sync` only active on `wasm32` target
- [ ] `cargo test` (native) does not depend on the unsafe impls

**Files:** `stores/dm.rs`, `relay.rs`, `admin/user_table.rs`
**Est:** 1h

---

### 7b. Home Page Double-Click Registration Guard

**Location:** `community-forum-rs/crates/forum-client/src/pages/login.rs` (or signup
flow entry point)

**Description:** Rapid double-click on the "Sign Up" button can initiate two
concurrent WebAuthn ceremonies, causing one to fail and potentially corrupting state.

**Fix:**
1. Add `is_pending: RwSignal<bool>` to the signup component.
2. Set `true` on click, `false` on completion or error.
3. Disable button when `is_pending` is `true`.
4. Apply same pattern to all form submission buttons (login, profile save, channel create).

**Acceptance criteria:**
- [ ] Double-click does not trigger two ceremonies
- [ ] Button visually indicates pending state (disabled + spinner)

**Files:** `pages/login.rs`, `pages/signup.rs`, `pages/setup.rs`
**Est:** 2h

---

### 7c. `reset-db` Endpoint Protection

**Location:** `community-forum-rs/crates/relay-worker/src/lib.rs`

**Description:** The `/api/reset-db` endpoint (added for development) could be abused
in production to wipe all stored events.

**Fix:**
1. Add rate limiting: 1 request per hour per IP (via KV TTL key).
2. Require a confirmation token: caller must first `POST /api/reset-db/confirm` to
   receive a single-use token, then `POST /api/reset-db` with the token.
3. Require admin NIP-98 authentication on both endpoints.
4. Log all reset-db attempts to D1 audit table.

**Acceptance criteria:**
- [ ] Unauthenticated reset-db returns 401
- [ ] Non-admin authenticated reset-db returns 403
- [ ] Admin without confirmation token returns 400
- [ ] Full flow (admin + confirm + token) succeeds

**Files:** `relay-worker/src/lib.rs`
**Est:** 3h

---

### 7d. NIP-40 SQL-Level Filtering in `query_events()`

**Location:** `relay_do.rs` (to be `filter.rs` after Stream 3)

**Description:** Currently, expiration tag filtering is done post-query in application
code, wasting D1 read units on expired events. (Related to CRIT-04 but distinct: this
is about query efficiency, not correctness.)

**Fix:**
1. Add a `WHERE created_at + expiration > ?now` clause for events with expiration tags.
2. Since D1 does not natively understand JSON tag structures, add an `expires_at`
   column to the events table (nullable, populated on insert).
3. Migration: backfill `expires_at` from existing events with expiration tags.
4. Index on `expires_at` for efficient filtering.

**Acceptance criteria:**
- [ ] Expired events excluded at SQL level (reduced D1 read units)
- [ ] `expires_at` column populated on new event inserts
- [ ] Backfill migration runs without data loss
- [ ] Events without expiration tags unaffected

**Files:** `relay_do.rs`/`filter.rs`, D1 migration SQL
**Est:** 3h

---

### 7e. React Image Optimization Consolidation

**Location:** 5 files in `src/` totaling 2,301 LOC related to image optimization.

**Fix:**
1. Audit the 5 files: `hooks/use-optimized-images.ts`, `lib/image-utils.ts`, and 3
   others containing duplicated lazy-load / srcset / WebP logic.
2. Consolidate into 2 files:
   - `lib/image-utils.ts` — pure utility functions (srcset generation, WebP check, etc.)
   - `hooks/use-optimized-images.ts` — React hook wrapping the utilities
3. Target: combined < 800 LOC.
4. Update all import sites.

**Acceptance criteria:**
- [ ] Image-related code reduced from 2,301 LOC to < 800 LOC
- [ ] No visual regression on pages with images
- [ ] `npm run build` passes
- [ ] No duplicate utility functions remain

**Files:** `src/hooks/use-optimized-images.ts`, `src/lib/image-utils.ts`, others TBD
**Est:** 4h

---

# Part 2: Solid Pod Infrastructure Upgrade (Streams 8--12)

## Rationale

The current `pod-worker` (in `community-forum-rs/crates/pod-worker/src/lib.rs`)
provides:
- Flat key-value storage in R2 (Cloudflare)
- NIP-98 authenticated read/write
- Basic WAC ACL evaluation from JSON-LD in KV
- Pod provisioning on user registration

This is insufficient for:
- Directory-like browsing of pod contents (LDP containers)
- Conflict detection on concurrent writes (ETags / conditional requests)
- Streaming large media files (range requests)
- Interoperability with Solid apps (missing standard link headers, content negotiation)
- Federation with external Solid pods (missing Solid-OIDC, notifications)

The upgrade is inspired by the JavaScriptSolidServer (JSS) but adapted for the
Cloudflare Workers + R2 + KV runtime. We do **not** port JSS code; we implement
the same Solid specification endpoints natively in Rust.

---

## Stream 8: LDP Container Support (P1)

**ADR:** 024-solid-ldp-containers.md

### 8a. Container Model

**Current state:** Resources stored as flat keys in R2 (e.g., `{pubkey}/media/avatar.jpg`).
No concept of containers, no directory listing.

**Target state:** Full LDP Basic Container compliance.

**Design:**

1. **Container representation:** A container is an R2 object with key ending in `/`
   and content-type `application/ld+json`. Its body is a JSON-LD document listing
   contained resources via `ldp:contains`.

2. **Container creation:**
   - `POST` to a container URL with `Slug` header creates a child resource.
   - `PUT` to a URL ending in `/` creates a container.
   - Container JSON-LD body is auto-generated and maintained by the worker.

3. **Container listing:**
   - `GET` on a container returns its JSON-LD representation with `ldp:contains`
     triples, plus metadata (`dcterms:modified`, `stat:size`) for each member.
   - Use R2 `list` with `prefix` to discover children.

4. **Containment management:**
   - On resource creation: add `ldp:contains` entry to parent container.
   - On resource deletion: remove from parent container.
   - Container auto-creation: creating `/a/b/c/file.txt` auto-creates `/a/`, `/a/b/`,
     `/a/b/c/` if they do not exist.

5. **Default container structure on pod provisioning:**
   ```
   /{pubkey}/
   ├── profile/
   │   └── card          (WebID document)
   ├── inbox/
   ├── outbox/
   ├── public/
   ├── private/
   └── media/
       ├── public/
       └── encrypted/
   ```

**Implementation:**

| Component | Location | Description |
|-----------|----------|-------------|
| `Container` struct | `pod-worker/src/container.rs` (new) | JSON-LD container body generation, member management |
| `container_get()` | `pod-worker/src/container.rs` | R2 list + JSON-LD serialization |
| `container_post()` | `pod-worker/src/container.rs` | Slug-based child creation |
| `auto_create_parents()` | `pod-worker/src/container.rs` | Recursive parent container creation |
| Pod provisioning update | `pod-worker/src/lib.rs` | Create default container tree on registration |

**Acceptance criteria:**
- [ ] `GET /pods/{pubkey}/` returns JSON-LD with `ldp:contains` listing
- [ ] `POST /pods/{pubkey}/media/` with `Slug: photo.jpg` creates `/media/photo.jpg`
- [ ] Creating nested resource auto-creates parent containers
- [ ] Container body includes `dcterms:modified` and `stat:size` per member
- [ ] Link header includes `<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"`
- [ ] New pod provisioning creates the default 7-container tree

**Est:** 8h

---

### 8b. Container Deletion Rules

- Deleting a non-empty container returns `409 Conflict`.
- Client must delete children first (or use `Prefer: handling=lenient` to force).
- Recursive delete is opt-in via custom header: `X-Delete-Recursive: true`.

**Acceptance criteria:**
- [ ] `DELETE` on non-empty container returns 409
- [ ] `DELETE` with `X-Delete-Recursive: true` deletes container and all children
- [ ] `DELETE` on empty container succeeds with 204

**Est:** 2h

---

## Stream 9: Conditional Requests & Streaming (P1)

### 9a. ETag and Conditional Headers

**Current state:** Partial ETag support (R2 returns `etag` on object metadata).

**Target state:**
- Every response includes `ETag` header (strong validator from R2 object hash).
- `If-Match`: return 412 Precondition Failed if ETag does not match.
- `If-None-Match`: return 304 Not Modified if ETag matches (for GET/HEAD).
- `If-Modified-Since`: return 304 if resource unchanged (using R2 `httpMetadata.lastModified`).

**Implementation:**
1. Create `pod-worker/src/conditional.rs` with `evaluate_preconditions()` function.
2. Call before every read/write operation.
3. For writes: require `If-Match` to prevent lost updates (optional, configurable).

**Acceptance criteria:**
- [ ] `GET` with matching `If-None-Match` returns 304 (empty body)
- [ ] `PUT` with stale `If-Match` returns 412
- [ ] `PUT` without `If-Match` succeeds (backward compatible)
- [ ] All responses include `ETag` header

**Est:** 4h

---

### 9b. HTTP Range Requests for Streaming Media

**Description:** R2 supports range reads natively. Expose this for media files so
browsers can seek in audio/video without downloading the entire file.

**Fix:**
1. Parse `Range` header in GET requests.
2. Pass range to R2 `get()` with `range` option.
3. Return `206 Partial Content` with `Content-Range` header.
4. Support `multipart/byteranges` for multiple ranges (optional — single range is P1,
   multi-range is P2).

**Acceptance criteria:**
- [ ] `Range: bytes=0-1023` returns 206 with first 1024 bytes
- [ ] `Range: bytes=1024-` returns 206 with remainder
- [ ] Missing or invalid `Range` returns full 200 response
- [ ] Video `<video>` tag seeking works in browser

**Est:** 3h

---

### 9c. PATCH Method Support (N3 Patch)

**Description:** Solid specification supports PATCH with `text/n3` content type for
partial updates to RDF resources. This avoids full re-upload of JSON-LD documents.

**Fix:**
1. Implement basic N3 Patch parsing (INSERT DATA / DELETE DATA operations).
2. Apply patches to JSON-LD resources stored in R2.
3. Return updated resource with new ETag.
4. Reject PATCH on non-RDF resources (binary files) with 415 Unsupported Media Type.

**Acceptance criteria:**
- [ ] `PATCH` with `DELETE DATA { ... } INSERT DATA { ... }` modifies JSON-LD resource
- [ ] ETag updated after PATCH
- [ ] PATCH on binary file returns 415
- [ ] Unit tests for N3 Patch parsing

**Est:** 6h

---

### 9d. Per-User Storage Quotas

**Description:** Enforce per-user storage limits to prevent abuse.

**Fix:**
1. Store quota config in KV: `quota:{pubkey}` → `{ limit_bytes: u64, used_bytes: u64 }`.
2. Default quota: 50MB (configurable via worker env var `DEFAULT_QUOTA_MB`).
3. On every write: check `used_bytes + content_length <= limit_bytes`.
4. On write success: increment `used_bytes`.
5. On delete: decrement `used_bytes`.
6. Return `413 Payload Too Large` when quota exceeded.
7. Admin endpoint: `PUT /api/quota/{pubkey}` to adjust individual quotas.

**Acceptance criteria:**
- [ ] Upload exceeding quota returns 413
- [ ] Quota tracked accurately across create/delete operations
- [ ] Admin can raise/lower individual quotas
- [ ] Default quota applies to new users automatically

**Est:** 4h

---

## Stream 10: Enhanced WAC + WebID (P1--P2)

**ADR:** 026-solid-enhanced-wac.md

### 10a. `.acl` Resource Pattern

**Current state:** ACL documents stored in KV with key `acl:{resource_path}`.

**Target state:** ACL documents stored as `.acl` sidecar files in R2 alongside the
resources they protect, following the Solid specification.

**Fix:**
1. For resource `/pods/{pubkey}/public/doc.json`, the ACL is at
   `/pods/{pubkey}/public/doc.json.acl`.
2. For container `/pods/{pubkey}/public/`, the ACL is at
   `/pods/{pubkey}/public/.acl`.
3. Migrate existing KV-based ACLs to R2 `.acl` files.
4. ACL CRUD via standard HTTP methods on the `.acl` URL.
5. Add `Link: <{resource}.acl>; rel="acl"` header to all responses.

**Acceptance criteria:**
- [ ] `Link` header with `rel="acl"` on every resource response
- [ ] `GET /pods/{pubkey}/public/.acl` returns the container's ACL document
- [ ] `PUT /pods/{pubkey}/public/.acl` updates the ACL (admin or resource owner only)
- [ ] Migration script converts KV ACLs to R2 `.acl` files

**Est:** 5h

---

### 10b. ACL Inheritance

**Description:** When a resource has no `.acl` file, walk up the container tree until
an applicable ACL is found. This is the Solid WAC inheritance model.

**Fix:**
1. `find_applicable_acl(resource_path)`: check `{resource}.acl`, then parent
   container's `.acl`, recursively up to the pod root.
2. Cache the result in KV with a short TTL (60 seconds) to avoid repeated R2 lookups.
3. `acl:default` mode in a container ACL applies to all descendants without their own ACL.

**Implementation:**
```
GET /pods/{pk}/private/docs/secret.json
  1. Check /pods/{pk}/private/docs/secret.json.acl → not found
  2. Check /pods/{pk}/private/docs/.acl → not found
  3. Check /pods/{pk}/private/.acl → found: acl:default → acl:Read acl:Write for owner
  4. Apply: owner can read/write, others denied
```

**Acceptance criteria:**
- [ ] Resource without own ACL inherits from nearest ancestor
- [ ] `acl:default` in container ACL applies to nested resources
- [ ] ACL inheritance walks up to pod root
- [ ] Cache invalidated when ACL document is created/updated/deleted

**Est:** 4h

---

### 10c. `acl:origin` Support

**Description:** Restrict resource access by the requesting application's origin. This
prevents a malicious third-party Solid app from reading resources even if the user is
authenticated.

**Fix:**
1. Parse `acl:origin` from ACL documents.
2. Compare against the `Origin` header of the incoming request.
3. If `acl:origin` is specified and the request origin does not match, return 403.
4. If `acl:origin` is not specified, origin is not checked (backward compatible).

**Acceptance criteria:**
- [ ] ACL with `acl:origin <https://dreamlab-ai.com>` allows requests from that origin
- [ ] Requests from other origins denied with 403
- [ ] ACL without `acl:origin` allows all origins (backward compatible)

**Est:** 2h

---

### 10d. WebID Profile Enhancement

**Current state:** Minimal WebID at `/pods/{pubkey}/profile/card`.

**Target state:** Full WebID profile document with HTML + JSON-LD representation.

**Fix:**
1. `GET /pods/{pubkey}/profile/card` with `Accept: text/html` returns HTML page with
   embedded JSON-LD (`<script type="application/ld+json">`).
2. `GET /pods/{pubkey}/profile/card` with `Accept: application/ld+json` returns pure
   JSON-LD.
3. Profile includes: `foaf:name`, `foaf:img`, `solid:oidcIssuer` (set to our auth
   worker URL), `rdfs:seeAlso` linking to extended profile.
4. `PATCH` support for profile updates (same N3 Patch from Stream 9c).

**Acceptance criteria:**
- [ ] HTML representation renders in browser with profile data
- [ ] JSON-LD representation parseable by Solid clients
- [ ] Content negotiation selects correct representation
- [ ] Profile updates via PATCH reflected in both representations

**Est:** 4h

---

### 10e. WAC-Allow Header

**Description:** Advertise available access modes to the client.

**Fix:**
1. On every response, compute the effective ACL for the authenticated user.
2. Add `WAC-Allow: user="read write", public="read"` header.
3. This enables Solid clients to show/hide edit controls based on permissions.

**Acceptance criteria:**
- [ ] `WAC-Allow` header present on all resource responses
- [ ] Reflects actual permissions for the authenticated user
- [ ] Unauthenticated requests show only public permissions

**Est:** 2h

---

## Stream 11: JSON-LD Native Storage (P2)

### 11a. JSON-LD as Default Storage Format

**Description:** Store all RDF resources as JSON-LD natively in R2. Non-RDF resources
(images, videos, binary) remain as-is.

**Fix:**
1. On `PUT`/`POST` with `Content-Type: application/ld+json` or `text/turtle`:
   convert to JSON-LD for storage (Turtle → JSON-LD conversion via a lightweight
   parser; Turtle support is P2 and can initially just store as-is).
2. All metadata stored as JSON-LD (`.meta` sidecar not needed for JSON-LD resources
   since metadata is embedded).
3. Non-RDF resources get a `.meta` JSON-LD sidecar with `stat:size`,
   `dcterms:modified`, `dcterms:format`.

**Acceptance criteria:**
- [ ] JSON-LD resources stored with correct content type in R2
- [ ] `.meta` sidecar generated for binary uploads
- [ ] `GET` on binary resource with `Accept: application/ld+json` returns metadata only
- [ ] `GET` on binary resource without Accept preference returns the binary content

**Est:** 5h

---

### 11b. Content Negotiation

**Description:** Serve different representations based on `Accept` header.

**Fix:**
1. JSON-LD resources: serve as `application/ld+json` by default.
2. If client sends `Accept: text/turtle`: return Turtle serialization (P2 — initially
   return 406 with a `Link` to the JSON-LD representation).
3. If client sends `Accept: text/html`: return HTML wrapper with embedded JSON-LD.
4. Binary resources: ignore content negotiation, serve as stored content-type.

**Acceptance criteria:**
- [ ] `Accept: application/ld+json` returns JSON-LD (200)
- [ ] `Accept: text/turtle` returns 406 with alternatives (P2: returns Turtle)
- [ ] `Accept: text/html` returns HTML wrapper
- [ ] No Accept header returns JSON-LD for RDF, original type for binary

**Est:** 3h

---

### 11c. JSON-LD Context Resolution and Compaction

**Description:** Resolve external `@context` URLs and compact JSON-LD documents for
efficient storage and transmission.

**Fix:**
1. On ingest: resolve `@context` URLs, cache resolved contexts in KV with 24h TTL.
2. Store documents in compacted form (shorter keys, reduced payload).
3. On serve: expand if the client requests expanded form (via `Prefer` header).
4. Pre-cache common contexts: `https://www.w3.org/ns/solid/terms`,
   `https://www.w3.org/ns/ldp`, `http://xmlns.com/foaf/0.1/`.

**Acceptance criteria:**
- [ ] Stored JSON-LD uses compacted form
- [ ] External context URLs cached in KV
- [ ] `Prefer: return=representation; include="http://www.w3.org/ns/json-ld#expanded"`
   returns expanded form

**Est:** 4h

---

## Stream 12: Federation & Advanced Features (P2)

### 12a. remoteStorage Protocol Compatibility

**Description:** Support the remoteStorage protocol (draft-dejong-remotestorage-22)
alongside Solid/LDP for broad client compatibility. remoteStorage is simpler than
Solid and has a larger client ecosystem (browser extensions, note apps, etc.).

**Fix:**
1. Implement `/.well-known/webfinger` endpoint returning storage endpoint URL.
2. Map remoteStorage folder operations to LDP container operations.
3. OAuth 2.0 bearer token verification alongside NIP-98 (dual-auth).
4. Scope: read-only initially; read-write in future sprint.

**Acceptance criteria:**
- [ ] `/.well-known/webfinger?resource=acct:{pubkey}@dreamlab-ai.com` returns correct
   JSON with storage `href`
- [ ] remoteStorage.js client can connect and list folders
- [ ] Read operations work; write operations return 405 (Phase 1)

**Est:** 6h

---

### 12b. Solid-OIDC Token Verification

**Description:** Accept DPoP-bound access tokens from external Solid OIDC identity
providers alongside our native NIP-98 auth. This enables users from other Solid pods
to interact with DreamLab pods.

**Fix:**
1. Parse `Authorization: DPoP <token>` headers.
2. Verify DPoP proof (JWK thumbprint, `ath` claim, `htm`, `htu`).
3. Verify access token JWT signature against issuer's JWKS endpoint.
4. Extract `webid` claim as the authenticated identity.
5. Apply WAC using the extracted WebID.
6. NIP-98 remains the primary auth method; Solid-OIDC is supplementary.

**Acceptance criteria:**
- [ ] DPoP-bound token from a test Solid IdP authenticates successfully
- [ ] Invalid DPoP proof returns 401
- [ ] Expired token returns 401
- [ ] WAC applied correctly using external WebID

**Est:** 8h

---

### 12c. Pod Provisioning Improvements

**Description:** Enhance the pod creation flow with templates and richer defaults.

**Fix:**
1. **ACL templates:** Define JSON-LD ACL templates for common patterns:
   - `private`: owner-only read/write
   - `public-read`: owner write, public read
   - `shared`: owner write, specified agents read
2. Apply templates during pod provisioning based on container role (e.g., `inbox` is
   `private`, `public` is `public-read`).
3. **Default container structure:** Ensure all 7 containers from Stream 8a are created
   with appropriate ACLs.

**Acceptance criteria:**
- [ ] New pod has 7 containers with correct ACL templates applied
- [ ] ACL templates are extensible (stored as JSON-LD in KV)
- [ ] Admin can define custom templates

**Est:** 3h

---

### 12d. Quota Management Enhancements

**Description:** Build on Stream 9d with administrative controls and user-facing quota display.

**Fix:**
1. **Admin dashboard:** Add quota overview to admin panel (per-user usage, top
   consumers, total storage).
2. **User-facing:** Show quota usage bar in settings page and upload UI.
3. **402 Payment Required:** Return 402 (not 413) when quota exceeded, with a JSON body
   explaining the limit. (Stub — no payment integration in this sprint.)
4. **Quota tiers:** Support named tiers in KV config: `free` (50MB), `member` (500MB),
   `admin` (5GB).

**Acceptance criteria:**
- [ ] Admin sees per-user storage usage in admin panel
- [ ] User sees quota bar in settings
- [ ] Quota tiers configurable via KV
- [ ] 402 response includes machine-readable quota info

**Est:** 4h

---

### 12e. Solid Notifications Protocol

**Description:** Notify clients when resources change, enabling real-time updates
without polling.

**Fix:**
1. Implement Solid Notifications Protocol (WebSocket channel type).
2. Client subscribes to a notification channel for a resource or container.
3. On resource change (create/update/delete), broadcast notification to subscribers.
4. Notification payload: `{ "type": "Update", "object": "resource-url", "published": "ISO-8601" }`.
5. Reuse the existing relay-worker DO WebSocket infrastructure for notification delivery.

**Acceptance criteria:**
- [ ] Client can subscribe to notifications for a container
- [ ] Resource creation in container triggers notification to subscribers
- [ ] Resource update/delete trigger appropriate notifications
- [ ] Notifications delivered via WebSocket with < 1 second latency

**Est:** 6h

---

## 4. Technical Architecture

### New Modules Overview

| Crate | Module | Stream | Purpose |
|-------|--------|--------|---------|
| `forum-client` | `utils/sanitize.rs` | 1 | Shared markdown sanitization |
| `forum-client` | `utils/relay_url.rs` | 4 | Consolidated relay URL construction |
| `forum-client` | `utils/window.rs` | 4 | Centralized `web_sys::window()` |
| `forum-client` | `utils/bip39.rs` | 6 | BIP39 mnemonic derivation |
| `forum-client` | `components/admin_checklist.rs` | 6 | Admin onboarding component |
| `relay-worker` | `session.rs` | 3 | Session management, hibernation recovery |
| `relay-worker` | `filter.rs` | 3 | Event filtering, query building, COUNT |
| `relay-worker` | `nip09.rs` | 3 | Deletion event handling |
| `relay-worker` | `nip29.rs` | 3 | Group admin enforcement |
| `relay-worker` | `broadcast.rs` | 3 | Subscription matching, fan-out |
| `preview-worker` | `fetch.rs` | 3 | HTTP fetch with SSRF protection |
| `preview-worker` | `parse.rs` | 3 | HTML/OG metadata parsing |
| `preview-worker` | `oembed.rs` | 3 | oEmbed discovery and formatting |
| `preview-worker` | `ssrf.rs` | 3 | URL validation, private IP blocking |
| `pod-worker` | `container.rs` | 8 | LDP container model |
| `pod-worker` | `conditional.rs` | 9 | ETag, If-Match, If-None-Match |
| `pod-worker` | `range.rs` | 9 | HTTP Range request handling |
| `pod-worker` | `patch.rs` | 9 | N3 Patch parsing and application |
| `pod-worker` | `quota.rs` | 9 | Per-user storage quota enforcement |
| `pod-worker` | `acl.rs` | 10 | Enhanced WAC with inheritance |
| `pod-worker` | `webid.rs` | 10 | WebID profile generation |
| `pod-worker` | `conneg.rs` | 11 | Content negotiation |
| `pod-worker` | `jsonld.rs` | 11 | JSON-LD context resolution and compaction |
| `pod-worker` | `webfinger.rs` | 12 | remoteStorage webfinger endpoint |
| `pod-worker` | `dpop.rs` | 12 | Solid-OIDC DPoP verification |
| `pod-worker` | `notifications.rs` | 12 | Solid Notifications Protocol |
| `nostr-core` | (update `nip98.rs`) | 1 | Payload hash verification |
| All workers | `rate_limit.rs` | 2 | Shared KV-backed rate limiter |

### Modified Files

| File | Stream | Changes |
|------|--------|---------|
| `forum-client/src/components/mention_text.rs` | 1 | Use `sanitize_markdown()` |
| `forum-client/src/components/message_input.rs` | 1 | Use `sanitize_markdown()` |
| `forum-client/src/stores/indexed_db.rs` | 1, 4 | Remove unwraps, add feature gate |
| `forum-client/src/auth/passkey.rs` | 2 | Remove Clone derive |
| `forum-client/src/auth/http.rs` | 2 | Remove fallback URL, compile-time check |
| `forum-client/src/pages/login.rs` | 6, 7 | Wire preferences, double-click guard |
| `forum-client/src/pages/signup.rs` | 7 | Double-click guard |
| `forum-client/src/components/nsec_backup.rs` | 6 | BIP39 mnemonic toggle |
| `forum-client/src/admin/mod.rs` | 4, 6 | Fix unwraps, add checklist |
| `auth-worker/src/lib.rs` | 1, 2 | NIP-98 body hash, rate limiting, CORS |
| `pod-worker/src/lib.rs` | 1, 2, 8-12 | Major refactor into modules |
| `relay-worker/src/relay_do.rs` | 1, 3 | Split into 5 modules |
| `relay-worker/src/lib.rs` | 7 | reset-db protection |
| `preview-worker/src/lib.rs` | 3 | Split into 4 modules |
| `nostr-core/src/nip98.rs` | 1 | Payload hash verification parameter |
| `src/pages/Index.tsx` | 2 | Remove dangerouslySetInnerHTML |
| `eslint.config.js` | 2 | Add no-danger rule |

### Dependency Graph

```
Stream 1 (Security Critical) ──→ Stream 3 (Relay Refactor) ──→ Stream 5 (Tests)
                              ╲
Stream 2 (Security High) ──────→ Stream 4 (Code Quality)
                                                           ╲
                                                            → Stream 7 (Defect Fixes)
Stream 6 (UX) ──→ (independent)

Stream 8 (LDP Containers) ──→ Stream 9 (Conditional/Streaming)
                           ╲                                  ╲
                            → Stream 10 (WAC/WebID) ──────────→ Stream 11 (JSON-LD)
                                                                            ╲
                                                                             → Stream 12 (Federation)
```

### New ADRs

| ADR | Title | Scope |
|-----|-------|-------|
| 024 | Solid LDP Containers on Cloudflare R2 | Container model, auto-creation, default tree |
| 025 | Relay Worker Module Split | Module boundaries, re-export strategy, file size limits |
| 026 | Enhanced WAC with Inheritance on Cloudflare Workers | `.acl` sidecar pattern, inheritance walk, caching |

### DDD Bounded Contexts

| Context | Streams | Aggregates |
|---------|---------|------------|
| **Security** | 1, 2 | SanitizedContent, NIP98Token, RateLimiter, CorsPolicy |
| **Relay** | 3, CRIT-04, CRIT-05 | Session, Subscription, Filter, Broadcast |
| **Quality** | 4 | (refactoring — no new aggregates) |
| **Testing** | 5 | TestFixture, TestVector, PropertyTest |
| **UX** | 6 | Preferences, AdminChecklist, Mnemonic |
| **Defects** | 7 | SendSyncGuard, RegistrationGuard, Quota, ExpirationFilter |
| **Pod-Storage** | 8, 9 | Container, Resource, ETag, RangeRequest, Quota |
| **Pod-Access** | 10 | ACLDocument, ACLInheritance, WebIDProfile, WACEvaluation |
| **Pod-Interop** | 11, 12 | JSONLDDocument, ContentNegotiator, DPoPToken, Notification |

---

## 5. Swarm Execution Plan

### Topology: Hierarchical (12 agents)

```
Coordinator (Queen)
├── Agent 1: Security-Critical  — CRIT-01 through CRIT-05 (Stream 1)
├── Agent 2: Security-High      — HIGH-01 through HIGH-05 (Stream 2)
├── Agent 3: Relay-Refactor     — relay_do.rs + preview-worker split (Stream 3)
├── Agent 4: Code-Quality       — Dead code, dedup, standardize (Stream 4)
├── Agent 5: Test-Relay         — Relay + auth + search tests (Streams 5a-5c)
├── Agent 6: Test-Client        — Forum-client + React + proptest (Streams 5d-5g)
├── Agent 7: UX-Completion      — Preferences, checklist, BIP39 (Stream 6)
├── Agent 8: Defect-Fixes       — Send/Sync, double-click, reset-db, images (Stream 7)
├── Agent 9: Pod-LDP            — Container model, provisioning (Stream 8)
├── Agent 10: Pod-Conditional   — ETags, range, PATCH, quotas (Stream 9)
├── Agent 11: Pod-WAC           — ACL sidecar, inheritance, WebID (Stream 10)
├── Agent 12: Pod-Advanced      — JSON-LD, conneg, federation, notifications (Streams 11-12)
```

### Execution Order

| Phase | Agents | Duration | Dependency |
|-------|--------|----------|------------|
| **Phase 1** | 1, 2 (parallel) | Day 1-2 | None — P0 security fixes first |
| **Phase 2** | 3, 4, 7, 8 (parallel) | Day 2-4 | Phase 1 complete for Agent 3 (relay refactor needs CRIT-04/05 fixed) |
| **Phase 3** | 5, 6, 9, 10 (parallel) | Day 3-5 | Agent 5 needs Agent 3 (tests need split modules); Agent 9/10 need Agent 9 |
| **Phase 4** | 8, 11, 12 (parallel) | Day 4-6 | Agent 11/12 need Agent 9/10 |

---

## 6. Effort Estimates

| Stream | Description | Est. Hours | Priority |
|--------|-------------|------------|----------|
| 1 | Security Critical Fixes | 20h | P0 |
| 2 | Security High Fixes | 12h | P0 |
| 3 | Relay Worker Refactor | 11h | P1 |
| 4 | Code Quality | 14h | P1 |
| 5 | Test Infrastructure | 32.5h | P1 |
| 6 | UX Completion | 9h | P1-P2 |
| 7 | Defect Prediction Fixes | 13h | P1-P2 |
| 8 | LDP Container Support | 10h | P1-P2 |
| 9 | Conditional Requests & Streaming | 17h | P1-P2 |
| 10 | Enhanced WAC + WebID | 17h | P1-P2 |
| 11 | JSON-LD Native Storage | 12h | P2 |
| 12 | Federation & Advanced | 27h | P2 |
| | **Total** | **194.5h** | |

---

## 7. Non-Goals

- **Full Solid-OIDC Identity Provider**: We use NIP-98 + WebAuthn passkey as the
  primary auth mechanism, not OIDC. Stream 12b adds token verification for
  federation, not an IdP.
- **ActivityPub federation**: Future consideration. Solid Notifications Protocol
  (Stream 12e) provides a stepping stone but we do not implement AP inbox/outbox.
- **MongoDB backend**: All storage is Cloudflare R2 + KV + D1. No MongoDB.
- **Git HTTP backend**: Not applicable to this project.
- **HTTP 402 payment integration**: Stream 12d returns 402 as a stub response code.
  No Stripe, no crypto payments in this sprint.
- **Full Turtle/N-Triples support**: JSON-LD is the native format. Turtle content
  negotiation returns 406 initially (P2 follow-up).
- **Full Solid Test Suite compliance**: We target the subset relevant to LDP Basic
  Container, WAC, and conditional requests. Full compliance is a future goal.
- **ONNX embedder deployment**: Search-worker continues using hash fallback for
  vector generation. Full ONNX WASM embedding deferred.
- **Native mobile app**: Forum remains a PWA. No React Native or native app in scope.

---

## 8. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| CRIT-01 XSS is already exploited | High | Low | Deploy comrak safe mode within 24h of sprint start |
| Cloudflare Rate Limiting rules require Business plan | Medium | Medium | KV-backed application-layer rate limiter as fallback |
| R2 `list` performance on large containers (>10K items) | Medium | Low | Paginate container listings, cache in KV |
| N3 Patch parsing complexity | Medium | Medium | Implement only INSERT/DELETE DATA operations; reject others with 501 |
| DPoP verification requires JWK fetching from external IdPs | Low | Medium | Cache JWKS in KV with 1h TTL; timeout after 3s |
| WebSocket tag size limit (1KB) may be insufficient for large subscription sets | Medium | Low | Split across multiple tags; limit to 10 active subscriptions |
| D1 migration for `expires_at` column on large datasets | Low | Low | Run migration during low-traffic window; no downtime required (ALTER TABLE ADD COLUMN is fast in SQLite) |

---

## 9. Verification Plan

### Per-Stream Verification

| Stream | Verification Method |
|--------|-------------------|
| 1 | Manual XSS payload testing + unit tests for sanitize + NIP-98 body hash tests |
| 2 | `curl` tests for rate limiting, CORS, passkey struct compilation |
| 3 | `cargo check` passes, manual WebSocket test, LOC count per file |
| 4 | `cargo check` with 0 warnings, no duplicate functions |
| 5 | `cargo test` + `npm test` pass with target counts |
| 6 | Manual walkthrough of login flow with preferences toggled |
| 7 | `cargo check` native target for Send/Sync, manual double-click test |
| 8 | `curl` CRUD on containers, verify JSON-LD response |
| 9 | `curl` with conditional headers, range requests on video file |
| 10 | `curl` with ACL creation, inheritance verification across 3-level tree |
| 11 | `curl` with Accept header negotiation, `.meta` sidecar verification |
| 12 | webfinger discovery test, DPoP token verification with test fixture |

### Integration Verification

- [ ] Full auth flow → message send → pod upload → search → works end-to-end
- [ ] Forum-client WASM binary size does not increase more than 15% (feature-gated IndexedDB excluded)
- [ ] All 5 workers deploy successfully via `workers-deploy.yml`
- [ ] Manual QA re-test of all 17 forum routes

---

## 10. References

| Document | Location |
|----------|----------|
| PRD v4.0 (Feature Parity Sprint) | `docs/prd-rust-port-v4.0.md` |
| PRD v5.0 (Hardening Sprint) | `docs/prd-forum-hardening-v5.0.md` |
| PRD v5.0-UX (Onboarding) | `docs/prd-ux-onboarding-v5.0.md` |
| ADR-011 (Images to Solid Pods) | `docs/adr/011-images-to-solid-pods.md` |
| ADR-023 (Forum Relay Hardening) | `docs/adr/023-forum-relay-hardening.md` |
| Solid Protocol Specification | https://solidproject.org/TR/protocol |
| Solid WAC Specification | https://solidproject.org/TR/wac |
| LDP Specification | https://www.w3.org/TR/ldp/ |
| remoteStorage Protocol | https://tools.ietf.org/html/draft-dejong-remotestorage-22 |
| Solid Notifications Protocol | https://solidproject.org/TR/notifications-protocol |
| JavaScriptSolidServer (JSS) | https://github.com/CommunitySolidServer/CommunitySolidServer |
| NIP-98 Specification | https://github.com/nostr-protocol/nips/blob/master/98.md |
| NIP-40 Specification | https://github.com/nostr-protocol/nips/blob/master/40.md |

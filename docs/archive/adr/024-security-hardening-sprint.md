# ADR-024: Security Hardening Sprint

## Status
Accepted

## Date
2026-03-16

## Context

A comprehensive 6-agent security audit on 2026-03-16 identified 22 findings across the
DreamLab AI platform: 2 CRITICAL, 5 HIGH, 7 MEDIUM, 4 LOW, 4 INFO. The audit covered:
Leptos/WASM forum client, 5 Rust Cloudflare Workers (auth, pod, preview, relay, search),
nostr-core library, and React marketing site.

Key findings requiring architectural decisions:

**CRITICAL:**
1. **XSS via comrak `inner_html`** — user markdown rendered without sanitization in
   `mention_text.rs:33` and `message_input.rs:263`. comrak `Options::default()` may
   allow raw HTML passthrough.
2. **NIP-98 body hash never verified on auth-worker POST endpoints** — body consumed by
   routing before NIP-98 verification can check payload hash.

**HIGH:**
3. No rate limiting on 4 HTTP workers (auth, pod, preview, search).
4. localhost:5173/5174 hardcoded in production CORS allow-lists (relay-worker,
   search-worker).
5. `#[derive(Clone)]` on PasskeyRegistrationResult/PasskeyAuthResult allows privkey
   duplication past Zeroize.
6. Hardcoded fallback auth API URL (`dreamlab-auth-api.solitary-paper-764d.workers.dev`)
   in WASM binary.
7. React `innerHTML` in Index.tsx:434 error handler.

**Defect-class findings requiring architectural decisions:**
8. relay_do.rs hibernation recovery loses all subscriptions + NIP-42 auth state.
9. NIP-40 COUNT SQL bug — `json_extract(tags, '$[0]')` extracts array not value.
10. 13 `unwrap()` in IndexedDB init path — WASM panic on any failure.
11. `unsafe impl Send+Sync` on non-Send types (DMStore, RelayConnection).
12. 50 `expect_context` calls — any invoked after reactive owner destroyed = panic.

## Decision

### D1: HTML Sanitization Strategy

All user-generated content rendered via `inner_html` must pass through a sanitization
layer. Rather than adding a Rust HTML sanitizer crate (ammonia is 500KB+ WASM), we will:
- Set `comrak::Options` explicitly: `render.unsafe_ = false`, `extension.tagfilter = true`
- Create a shared `utils/sanitize.rs` module that strips any remaining HTML tags via a
  simple regex-free approach (iterative char scanner)
- This is defense-in-depth: comrak with `unsafe_ = false` already strips raw HTML

**Trade-off**: Slightly more restrictive markdown rendering — legitimate inline HTML in
user posts will be stripped. Acceptable for a forum where markdown syntax covers all
needed formatting.

### D2: Auth-Worker Body Verification

Restructure auth-worker routing to capture raw body bytes before route matching:
- Read body as `Vec<u8>` at the top of the `fetch` handler
- Pass `body_bytes` to both NIP-98 verification and the matched route handler
- All POST/PUT/PATCH routes receive pre-read body instead of consuming the Request

**Trade-off**: Adds ~1 allocation per request (body cloned into Vec). Justified because
NIP-98 payload verification is a security-critical check that is currently entirely
bypassed on all POST endpoints.

### D3: Rate Limiting Strategy

Use Cloudflare Rate Limiting rules (configured via wrangler.toml or dashboard) rather
than in-code rate limiting for the 4 HTTP workers:
- auth-worker: 30 req/min on `/auth/*`
- pod-worker: 60 req/min on `/pods/*` (writes), unlimited reads
- preview-worker: 60 req/min on all endpoints
- search-worker: 100 req/min on `/search` and `/embed`

**Trade-off**: Rate limiting is external to application code (Cloudflare dashboard/API).
Harder to test locally but zero runtime overhead and no additional dependencies.

### D4: CORS Origin Management

Move CORS allowed origins to environment variables:
- `ALLOWED_ORIGINS` env var in wrangler.toml (production: `https://dreamlab-ai.com`)
- `DEV_ORIGINS` env var only set in dev wrangler config
- Remove all hardcoded localhost origins from source code

**Trade-off**: Requires separate wrangler.toml overrides for dev vs production. Current
approach of hardcoding localhost is a security risk that outweighs the config complexity.

### D5: Privkey Protection

- Remove `#[derive(Clone)]` from `PasskeyRegistrationResult` and `PasskeyAuthResult`
- Add `#[cfg(target_arch = "wasm32")]` guard on all `unsafe impl Send + Sync` blocks
- Document the single-threaded WASM safety assumption

**Trade-off**: Removing Clone may require refactoring callers that move these types
through multiple functions. The types contain secret material and must not be
duplicated — correctness over convenience.

### D6: Hibernation Recovery

Store subscription state in WebSocket tags:
- `sub:{sub_id}:{json_filters}` tag format
- `recover_session()` deserializes tags and rebuilds subscription HashMap
- `auth:{pubkey}` tag for NIP-42 auth state persistence
- Maximum 10 subscriptions per session (tag storage limit)

**Trade-off**: Tag storage is limited in size. 10 subscriptions per session is sufficient
for the current forum (typical client uses 3-5 concurrent subscriptions). Exceeding the
limit requires an explicit CLOSE before new REQs.

### D7: Context Safety Pattern

Replace all `expect_context::<T>()` calls with a project-wide `require_ctx::<T>(component_name: &str)` wrapper that:
- Uses `use_context::<T>()` (returns Option)
- Logs the component name + type on failure
- Still panics (context missing is unrecoverable) but with diagnostic info

**Trade-off**: Marginally more verbose call sites. Justified by the 50 blind-panic
sites currently producing unhelpful "called Option::unwrap() on None" messages in
production.

## Consequences

### Positive
- Eliminates all 2 CRITICAL and 5 HIGH security vulnerabilities
- Hibernation recovery prevents silent subscription loss
- Rate limiting protects all Workers from abuse without runtime cost
- Diagnostic context panics aid debugging in production
- No new crate dependencies (WASM binary size preserved)

### Negative
- Auth-worker body pre-read adds ~1 allocation per request
- Rate limiting rules require Cloudflare dashboard or API setup
- Subscription tag storage limited to 10 per session
- comrak `unsafe_ = false` may strip legitimate HTML from markdown (acceptable tradeoff)

### Risks
- Comrak version upgrade may change default `unsafe_` behavior — pin version
- Rate limiting rules may be too aggressive for legitimate burst traffic — monitor and adjust
- Tag-based subscription recovery is untested at scale with >5 concurrent subscriptions

## Files Affected

| File | Change Type | Scope |
|------|------------|-------|
| `crates/forum-client/src/components/mention_text.rs` | Moderate | comrak Options + sanitize call |
| `crates/forum-client/src/components/message_input.rs` | Moderate | comrak Options + sanitize call |
| `crates/forum-client/src/utils/sanitize.rs` | New | HTML tag stripping utility |
| `crates/auth-worker/src/lib.rs` | Major | Body pre-read, NIP-98 payload verification |
| `crates/relay-worker/src/relay_do.rs` | Major | Subscription + auth tag recovery |
| `crates/forum-client/src/auth/passkey.rs` | Moderate | Remove Clone, cfg-gate unsafe impls |
| `crates/forum-client/src/utils/mod.rs` | Minor | require_ctx wrapper |
| `crates/forum-client/src/stores/*.rs` | Minor | Replace expect_context with require_ctx |
| `crates/forum-client/src/pages/*.rs` | Minor | Replace expect_context with require_ctx |
| `crates/relay-worker/wrangler.toml` | Minor | ALLOWED_ORIGINS env var |
| `crates/search-worker/wrangler.toml` | Minor | ALLOWED_ORIGINS env var |
| `src/pages/Index.tsx` | Minor | Remove innerHTML in error handler |

## Alternatives Considered

1. **ammonia crate for HTML sanitization** — Adds ~500KB to WASM binary. comrak's
   built-in `unsafe_ = false` plus a lightweight char scanner achieves the same
   result at zero dependency cost.

2. **In-code rate limiting with HashMap counters** — Requires per-isolate state that
   resets on cold starts. Cloudflare's native rate limiting is persistent, distributed,
   and zero-maintenance.

3. **DOMPurify via JS interop for sanitization** — Requires wasm-bindgen FFI to
   call DOMPurify in the browser. Adds JS bundle dependency and FFI overhead.
   Server-side sanitization (comrak options) is more robust since it prevents
   malicious HTML from ever reaching the client.

4. **Rebuild subscription state from D1 on hibernation wake** — Would require a D1
   query per wake event. Tag-based recovery is O(1) with no I/O, keeping wake
   latency under 1ms.

## Implementation
See PRD v6.0 Streams 1-2 for detailed implementation plan.

## References

- [NIP-98: HTTP Auth](https://github.com/nostr-protocol/nips/blob/master/98.md) — payload hash verification
- [NIP-42: Authentication](https://github.com/nostr-protocol/nips/blob/master/42.md) — relay auth state
- [comrak Options](https://docs.rs/comrak/latest/comrak/struct.Options.html) — render.unsafe_ flag
- [Cloudflare Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/) — Workers rate limits
- ADR-023: Forum Relay Layer Hardening — prior hibernation and subscription work
- ADR-012: Hardening Sprint — prior security audit findings

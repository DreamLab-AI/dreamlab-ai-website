# Full Project Audit — DreamLab AI Website + Consumed Upstream

**Date:** 2026-06-27 · **Branch:** `claude/ascii-forum-interface-5ys8fm`
**Method:** Agentic QE v3 (AQE) framework + 6 parallel audit sub-agents (each using
AQE skills), with the upstream Rust crates pulled at their **pinned** versions.

---

## 1. Scope & method

| Domain | What was audited |
|--------|------------------|
| React BBS subsystem | `src/lib/bbs`, `src/components/bbs`, `src/hooks/bbs`, `src/pages/BBS.tsx` (new Nostr client) |
| React marketing app + libs | pages, `src/lib/*`, components, build scripts, `vite.config.ts`, `index.html` |
| forum-config overlay + workers | `forum-config/` (Cargo pins, `dreamlab.toml`, `deploy/*.wrangler.toml`) |
| Upstream relay + auth | `nostr-rust-forum@3c16c21` `nostr-bbs-relay-worker`, `nostr-bbs-auth-worker`, `-core`, `-rate-limit` |
| Upstream pod storage | `nostr-bbs-pod-worker` + `solid-pod-rs@0.5.0-alpha.2` (crates.io) |
| CI/CD + secrets + docs | `.github/workflows/*`, repo-wide secret scan, docs/ADR/CLAUDE.md consistency |

**AQE framework used:** `aqe code` (index/complexity/hypergraph pre-scan), `aqe quality`
(gate), `aqe security --sast`, `aqe hypergraph untested`, `aqe memory` (findings stored
in namespace `audit`), and the AQE **skills** (`security-testing`, `qe-quality-assessment`,
`pentest-validation`, `brutal-honesty-review`, `compliance-testing`,
`cicd-pipeline-qe-orchestrator`) invoked inside each sub-agent. Threat model for the
client/upstream review: **the relay and pod are treated as untrusted.**

**Pins audited (dual-pin verified in lockstep):**
`KIT_REF = 3c16c21280f0b6080c6534094ebd9a5347ced4bf` (deploy.yml, workers-deploy.yml,
rust-ci.yml) == `rev = "3c16c21"` (forum-config/Cargo.toml + Cargo.lock);
`solid-pod-rs = 0.5.0-alpha.2` (checksum `a6593a9d…`).

---

## 2. Severity summary

### This repository (actionable here)

| Sev | Count | Items |
|-----|-------|-------|
| HIGH | 4 | BBS no inbound-sig verification **(FIXED)**; `gptengineer.js` in prod; stale kit SHAs in overlay docs; no CI dual-pin guard |
| MEDIUM | 6 | vulnerable deps; CSP `unsafe-inline`/`unsafe-eval`; `members` undefined write-cohort; agent/test-user legacy cohorts; search-worker partial ADMIN_PUBKEYS; gate `passed` always true |
| LOW | 9 | local key in localStorage (no UI warning); GDPR client-delete; weak email regex; error logging; ADMIN_KV provisioning split; CORS breadth; actions not SHA-pinned; `/bbs` undocumented; dual-pin rule omits rust-ci.yml |
| INFO | 6 | misc (see §4) |

### Upstream — report to `nostr-rust-forum` / `solid-pod-rs`

| Sev | Count | Items |
|-----|-------|-------|
| HIGH | 5 | relay live-broadcast no zone gate; relay REQ/COUNT default-allow non-channel kinds; relay soft-hidden events served; pod stored-XSS via content-type; pod CORS `*`+credentials fallback |
| MEDIUM | 4 | relay COUNT metadata leak; relay WoT/invite/welcome gate dead code; pod container listing leaks child names; pod NIP-05 directory enumeration / quota charged to owner |
| LOW | 5 | NIP-42 relay-tag/challenge; WebAuthn challenge non-atomic; KV limiter fail-open; pod git probe; inbox spam |

**Crypto core verdict (upstream):** STRONG. Event id is recomputed and the Schnorr
signature verified against the **recomputed** id (not the claimed id); NIP-98 binds
URL+method+payload-hash with a 60s window and atomic D1 replay protection; WebAuthn
assertions are genuinely verified; SQL is parameterized; zero `unsafe` in the pod layer.

---

## 3. Fixes applied during this audit (this repo, BBS subsystem)

| File | Change | Closes |
|------|--------|--------|
| `src/lib/bbs/relay.ts` | Verify id + Schnorr signature of every inbound relay event (`verifyEvent`); drop unverifiable events before they reach any screen | BBS-HIGH |
| `src/lib/bbs/services.ts` | `encodeURIComponent` on the `checkWhitelist` pubkey query param | BBS-LOW |
| `src/components/bbs/MainMenu.tsx` | Valid `aria-current` token (`"true" \| undefined`) | BBS-INFO |

All three verified: `tsc` clean, 48 BBS tests green, production build green.

---

## 4. Findings by domain

### 4.1 BBS subsystem (new Nostr client)

- **[HIGH → FIXED]** Inbound relay events were rendered without signature verification
  (`relay.ts` `handleMessage`). A hostile/compromised relay could spoof any author,
  content, or `✓ nip05` badge. Now every event is `verifyEvent`-checked and dropped if
  invalid. *Note: rendering was already XSS-safe (all content via escaped JSX / `<pre>`).*
- **[MEDIUM]** `local` private keys are persisted to `localStorage` (`identity.ts`) with
  no user-facing caveat at key-generation time (only on export). Recommend surfacing the
  "throwaway / XSS-exposed" caveat in Settings and defaulting to NIP-07. *(Documented in
  code comments; never logged or sent to any endpoint — verified.)*
- **[LOW]** `relay.ts` reconnect is driven only by `onclose`; an `onerror` that never
  closes can stall reconnection. `query()` registers a status listener only cleared on
  `online`, leaking on never-online sockets. `seen` Set in `ChatScreen` grows unbounded
  in long sessions (ids only). `publish` OK is keyed on `event.id` so a relay can
  false-confirm a post (inherent to NIP-01; Thread re-queries, Chat does not).
- **[LOW → FIXED]** `checkWhitelist` interpolated the pubkey unencoded (defended in depth
  by `isHexKey`, but now `encodeURIComponent`d).
- **Positives:** no `dangerouslySetInnerHTML`/`eval`; secret never leaves device; identity
  validation sound; HTTP services fail soft; clean teardown in `close()`/`reconnect()`.

### 4.2 React marketing app + shared libs

- **[HIGH]** `index.html` loads `https://cdn.gpteng.co/gptengineer.js` unconditionally in
  the production build (confirmed in `dist/index.html`), with full DOM access on PII pages
  (`/contact`, `/privacy`); CSP allowlists it. **Recommendation:** remove from the prod
  build (it is editor tooling) along with its CSP/preconnect entries.
- **[MEDIUM]** `npm audit --omit=dev` → 5 vulns (verified): `dompurify` (sanitizer-bypass
  advisories; mostly `IN_PLACE` mode, which is **not** used here), `mermaid` (HTML/CSS
  injection + Gantt DoS — intersects the workshop-markdown render path), `react-router`
  (open redirect via `//`), `ws` (high; dev-only). Fix via `npm audit fix` + retest the
  Mermaid path; add `npm audit --omit=dev` as a CI gate.
- **[MEDIUM]** CSP uses `'unsafe-inline'` + `'unsafe-eval'` in `script-src`. Tighten
  (nonce the inline redirect/JSON-LD; check if mermaid still needs `unsafe-eval`).
- **[LOW]** `gdpr-erasure.ts` performs a client-side `delete` under the anon key — either
  silently no-ops (if RLS blocks) while reporting success, or allows arbitrary deletion by
  email (if RLS permits). Route through a server-side verified flow; re-query post-delete.
- **[LOW]** `EmailSignupForm`/`DataErasureRequest` use a weak shared email regex and no
  length caps (Contact correctly uses Zod). `EmailSignupForm` logs raw Supabase errors
  (Contact deliberately does not — inconsistent).
- **Positives:** `react-markdown` without `rehype-raw` (raw HTML escaped); Mermaid path is
  defense-in-depth (`securityLevel:'strict'` + pre-sanitize + DOMPurify SVG); only the
  public Supabase anon key in source; strong baseline security headers; build scripts use
  fixed paths + safe YAML parse.

### 4.3 forum-config overlay + worker configs

- **[HIGH]** Stale kit SHAs in human-facing docs contradict the real pins: `Cargo.toml:16`
  (`c5329f6`), `README.md:10` (`8d31f3a`), `README.md:177`/`:205` (`a7c9c40`) vs the actual
  `3c16c21`. This is the exact dual-pin foot-gun CLAUDE.md warns about. **Fixed in this
  commit** (see §6).
- **[MEDIUM]** `public` zone `write_cohorts = ["members","friends","agent"]` references
  `members`, which is **not** in the canonical cohort taxonomy
  (`admin/family/friends/business`+`agent`); `members` is the superseded kit default. The
  value is consistent across all four projection surfaces but diverges from the design doc.
- **[MEDIUM]** `[[agents]]`/`[[test_users]]` cohorts use legacy vocabulary
  (`home`/`dreamlab`/`minimoonoir`/`trainers`…) that maps to no zone's `required_cohorts`;
  non-admin agents (`marketplace-agent`, `knowledge-enrichment-agent`) would get no zone
  access from these tags. Seed/metadata drift, not a live ACL break.
- **[MEDIUM]** `search-worker.wrangler.toml` `ADMIN_PUBKEYS` lists only 2 of the 5 admin
  keys (and in reversed order); the search-indexer bot itself is not recognized as admin
  by the worker it feeds.
- **[LOW]** ADMIN_KV provisioning uses per-worker titles, so auth-worker `ADMIN_KV` and
  pod-worker `ADMIN_KV_RO` likely resolve to **different** namespaces, breaking the
  intended shared read/write split — verify at deploy. CORS allows `dreamlab-ai.github.io`
  (broad apex); preview-worker only sets singular `ALLOWED_ORIGIN`. `FORUM_NAME` differs
  (deploy injects "Minimoonoir Forums" vs code default "DreamLab Community Forum").
- **Positives:** dual-pin values in lockstep; **zone config byte-identical** across
  `dreamlab.toml` / `deploy.yml` / relay `ZONE_CONFIG` / `src/lib/bbs/env.ts`; no secrets
  inlined (all admin keys are public x-only keys); deploy-time secret-presence gate fails
  closed; `family` zone `encrypted:true` everywhere.

### 4.4 Upstream relay + auth (`nostr-rust-forum@3c16c21`) — report upstream

- **[HIGH]** Live broadcast (`relay_do/broadcast.rs`) applies **no** zone/cohort gate for
  non-DM kinds: a kind-42 to a Locked/Hidden zone is delivered live to every subscriber,
  including non-members — even though the historical REQ path withholds it.
- **[HIGH]** REQ/COUNT read gate (`nip_handlers.rs handle_req`) only scopes kind-40/42 and
  calendar kinds; the `_ => None` default serves all other zone-private kinds (kind-1,
  kind-7, kind-30023, …) to non-members. Unmapped channels default to the `home` zone.
- **[HIGH]** `hidden_events` is write-only: auto-hide (3+ reports) and admin-hide INSERT
  but the table is never consulted on read/broadcast/COUNT — soft-hide moderation does not
  suppress content (only hard delete works).
- **[MEDIUM]** NIP-45 COUNT bypasses all access control (unauthenticated zone metadata leak).
- **[MEDIUM]** auth-worker `register_verify` never calls the WoT/invite/welcome gates —
  `wot_enabled` is not enforced; `invite_code` is parsed and discarded (dead code).
- **[LOW]** NIP-42 AUTH doesn't validate the `relay` tag and doesn't rotate the challenge;
  WebAuthn challenge consume is non-atomic (read-then-delete); KV rate-limit/replay fail
  open on backend error.
- **Resolved concern:** the suspected "kind-0/9024 whitelist write bypass" does **not**
  exist at this pin — `handle_event` requires whitelist for all non-gift-wrap kinds; the
  relay `auto_whitelist`/first-user-is-admin path is dead code.
- **Positives:** event id recomputed + Schnorr verified before side effects; NIP-98 full
  binding + atomic replay; WebAuthn genuinely verified; admin routes all gated;
  zone-policy primitives fail closed; DM (kind-1059) gated on both read and broadcast;
  strict input limits; parameterized SQL; no attacker-reachable panics.

### 4.5 Upstream pod worker + `solid-pod-rs@0.5.0-alpha.2` — report upstream

- **[HIGH]** Stored content is served back with the client-chosen `Content-Type` and **no**
  `X-Content-Type-Options: nosniff` / `Content-Disposition`. A user can store HTML/JS in a
  world-readable `/public/` or `/profile/card` and have the pod serve `text/html`
  (stored-XSS in the **pod** origin). **Mitigant for this deployment:** pod origins
  (`dreamlab-pod-api.solitary-paper-764d.workers.dev`, `pods-native.dreamlab-ai.com`) are
  **distinct** from the app origin `dreamlab-ai.com`, so this is cross-origin
  (phishing/credential-leak to the pod origin), not same-origin XSS against the SPA; the
  BBS FileBase also renders the pod card as escaped `<pre>`. Still: add `nosniff` +
  attachment disposition upstream.
- **[HIGH]** Default CORS pairs an `Access-Control-Allow-Origin: *` fallback (when
  `EXPECTED_ORIGIN` unset) with `Allow-Credentials: true` — operator footgun.
- **[MEDIUM]** Container listing enumerates child names/timestamps regardless of per-child
  ACL; NIP-05 discovery enumerates the username→pubkey directory with a fail-open limiter;
  storage quota is charged to the pod **owner**, so append/delegated writers can exhaust
  the owner's quota (DoS).
- **[LOW]** Git smart-HTTP probe matched pre-auth (returns 501 on CF — genuinely disabled);
  inbox append spam; `validate_webid_html` permits executable HTML (instance of stored-XSS).
- **Positives:** WAC deny-by-default with correct inheritance gating; NIP-98 real on the
  consumed path; **strong path-traversal defense in depth** (hex-owner + `is_safe_resource_path`
  + percent-decode checks + `starts_with(root)`); cross-pod write structurally impossible;
  `.acl` write-escalation blocked; provisioning binds to the authed pubkey; **zero `unsafe`**,
  no panics on untrusted input; disabled features genuinely disabled on CF.

### 4.6 CI/CD + secrets + docs

- **[HIGH]** No CI job enforces the dual-pin (KIT_REF ×3 + Cargo rev) despite the
  documented 2026-06-15 skew incident. **Recommendation:** add a `pin-check` job to
  `ci.yml` that greps the four locations and fails on divergence (highest-value addition).
- **[MEDIUM]** `test-and-lint.yml` `Summary` step hardcodes `passed=true` (`if: always()`),
  so the `workflow_call` `passed` output is always true; ESLint/clippy are
  `continue-on-error`. Deploy still gates on job success, but the output contract is
  misleading.
- **[LOW]** Third-party actions float on `@vN` tags, not commit SHAs (supply-chain risk in
  jobs holding `contents:write` / CF tokens). `/bbs` route undocumented in CLAUDE.md;
  dual-pin rule omits the 4th location (`rust-ci.yml`). **CLAUDE.md updated in this commit.**
- **Positives:** least-privilege `permissions` everywhere; no `pull_request_target`; no
  `${{ github.event.* }}` in `run:`; secrets via `env:` (never logged/inlined); Trunk
  SHA256-verified; **no hardcoded secrets** (all 64-hex literals are public keys); complete
  `.gitignore` coverage (`.env`, `.test-keys.json`, `.mcp.json`, `.claude/`, `.agentic-qe/`).

---

## 5. AQE automated results

- **`aqe quality` gate:** criticalBugs 0, codeSmells 0, securityVulnerabilities 0,
  technicalDebt 0, duplications 0 (PASS). Coverage metric reads 0 because no coverage data
  was generated and AQE did not execute the suite — treat as "not measured," not "0%".
- **`aqe security --sast`:** 0 pattern-matched vulnerabilities (corroborates the deeper
  manual review; the real issues above are logic/config, not regex-detectable).
- **`aqe code complexity src/`:** hotspots `VoronoiGoldenHero.tsx` (110),
  `WorkshopHeader.tsx` (53), `AIChatFab.tsx` (34) — all pre-existing. New BBS code max 17
  (`MessageBaseScreen`) — acceptable.
- **`aqe hypergraph untested`:** ~255 functions with no test coverage, dominated by
  `scripts/embeddings/*` (AQE's own tooling). BBS lib has unit tests; BBS screens beyond
  `BbsTerminal` are not unit-tested (component-render coverage gap).
- Findings persisted to AQE memory namespace `audit` (keys `audit-2026-06-27/*`).

---

## 6. Prioritized recommendations

**Do now (this repo):**
1. ✅ Verify inbound relay event signatures (BBS) — **done**.
2. Remove `gptengineer.js` from the production `index.html`/CSP.
3. `npm audit fix` + retest the Mermaid render path; add `npm audit --omit=dev` CI gate.
4. Add a CI `pin-check` job enforcing the dual-pin.
5. ✅ Fix stale kit SHAs in `forum-config` docs + add `/bbs` to CLAUDE.md — **done**.
6. Decide the `public` zone `write_cohorts` (`members` vs `friends,agent`) and re-project.
7. Populate `search-worker` `ADMIN_PUBKEYS` with the full 5-key set.

**Should do:** surface the BBS localStorage-key caveat in Settings; tighten CSP; harden
GDPR erasure (server-side verified); pin GitHub Actions to SHAs; verify ADMIN_KV
provisioning shares a namespace; standardize email validation/length caps.

**Report upstream (`nostr-rust-forum` / `solid-pod-rs`):** the 5 upstream HIGH findings
(relay broadcast/REQ/COUNT/hidden read-path gating; pod content-type/CORS hardening) and
the medium/low items in §4.4–4.5. These are the most impactful issues found and are
**not** fixable in this overlay repo.

---

## 7. Coverage & limitations

Static source review (no live DAST / PoC execution). Supabase RLS policies, live CF
resource state (KV/D1/R2 provisioning), GitHub repo-side secret config, and the Leptos
forum client were out of scope. Upstream review focused on the security perimeter
(relay/auth/pod + core crypto); mesh, search, preview workers and `nip44`/gift-wrap
internals were spot-checked only. Upstream crates were audited at the pinned versions
above; HEAD may differ.

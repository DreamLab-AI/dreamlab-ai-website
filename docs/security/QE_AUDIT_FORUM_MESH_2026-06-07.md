# QE Audit — Human-Agent Collaboration Forum (cross-repo mesh)

**Date:** 2026-06-07
**Method:** ruflo-coordinated mesh (`swarm_1780864092696`, topology=mesh) of 6 Opus
audit agents (auth, workers, solid-pod, protocol, consumer, runtime), diagram-based
debugging lens, native `cargo`/`npm` execution, browser-sidecar live UI smoke.
**Scope (4-layer dependency chain):**

| Layer | Repo | Role | Version |
|-------|------|------|---------|
| L1 | `dreamlab-ai-website` | kit-consumer (`forum-config/`, deploy, governance UI) | — |
| L2 | `nostr-rust-forum` | forum kit: `nostr-bbs-*` crates, 5 CF workers, Leptos client | v3.0.0-rc11 |
| L3 | `solid-pod-rs` | Solid pod server (WAC, RDF, git, IDP) | v0.4.0-alpha.15 |
| L4 | `JavaScriptSolidServer` | AGPL reference (port source) | — |

> **Architecture correction:** the vendored `community-forum-rs/` tree was deleted in
> commit `d248550` ("Phase 10 — deploy from kit upstream"). `dreamlab-ai-website/CLAUDE.md`
> is **stale** (39 references to the removed tree + old `forum-*` crate names; the
> `admin-cli`/`forum-admin` binary is also gone). The forum is now consumed from the
> `nostr-rust-forum` kit (crates renamed `nostr-bbs-*`), overlaid by `forum-config/`.

## Severity tally

| Sev | Count | Theme |
|-----|-------|-------|
| **P0** | 4 | Pod data confidentiality (2) · moderation lifecycle (2) |
| **P1** | 8 | Auth challenge binding, salt disclosure, git read authz, DPoP replay, mod d-tag forge, governance approval authz, SSRF rebind, build break |
| **P2** | 14 | Defense-in-depth, fail-open, config/deploy, doc UX |
| **P3** | ~7 | Hygiene, tooling, doc-drift |

Native test health is strong: **nostr-bbs-core 439**, all kit crates **1142+ tests pass / 0 fail**, solid-pod-rs **27 pass**, forum-config **17 pass**, website lint+build clean.

---

## P0 — Critical

### P0-1 · Private pod resources are world-readable (no WAC read enforcement)
`solid-pod-rs/crates/solid-pod-rs-server/src/lib.rs:436-597` (`handle_get`)
`handle_get` extracts a pubkey, computes an **advisory** `wac-allow` header (`:448`), then
returns `storage.get(&path)` verbatim (`:580`) with **no `evaluate_access`/`AccessMode::Read`
check**. `build_app` (`:2769-2778`) wraps only ErrorLogging/Cors/NormalizePath/PathTraversal/
DotfileGuard — no read-authz middleware. `enforce_write` runs only for PUT/POST/PATCH/DELETE/COPY.
**Every private resource is readable by anyone.**
**Fix:** add `enforce_read` (mirror of `enforce_write`, `AccessMode::Read`) at the top of
`handle_get`/`handle_head`/container-listing.

### P0-2 · `.acl` write authorized as Write, not Control → privilege escalation
`solid-pod-rs/crates/solid-pod-rs-server/src/lib.rs:638` (`handle_put`, + PATCH/DELETE siblings)
`enforce_write(path, AccessMode::Write)` is called with the literal request path, so
`PUT /victim/.acl` is checked as Write on `/victim/.acl` — never as `acl:Control` on `/victim/`.
An agent with Write on a container can overwrite its `.acl` and grant itself Control.
**Re-introduces JSS 2026-01-03 CRITICAL #1** (fixed upstream in v0.0.49). The MCP tool path
enforces Control + lockout guard correctly (`mcp/tools.rs:505-548`); the HTTP surface does not.
**Fix:** in `enforce_write`, when `path` ends in `.acl`/`.meta`, evaluate `Control` on the
protected resource (strip suffix) and add the lockout guard.

### P0-3 · Timed mutes silently become permanent bans (tag-name mismatch)
`nostr-bbs-core/src/moderation_events.rs:326` ⇄ `nostr-bbs-relay-worker/src/relay_do/nip_handlers.rs:946` ⇄ `mod_cache.rs:119`
`build_mute`/validator write+read an **`expires`** tag; the relay mirror that populates
`moderation_actions` reads **`expiration`** → every Nostr-path timed mute lands with
`expires_at = NULL` → `mod_cache.rs:119` maps `("mute", None) => Block::Banned`.
**A 1-hour mute becomes a permanent kind-1/42 ban.** The auth-worker HTTP path stores the real
expiry from a separate JSON field, so the two enforcement paths diverge.
**Fix:** standardise both layers on one tag name; add a cross-layer round-trip test.

### P0-4 · Unban / Unmute are no-ops — bans cannot be lifted
`mod_cache.rs:103` · `nip_handlers.rs:288` · `nostr-bbs-auth-worker/src/moderation.rs:170`
`KIND_UNBAN`(30915)/`KIND_UNMUTE`(30916) have constants, builders and validator coverage, but
**no consumer processes them**: `load_state` queries `action IN ('ban','mute')`; the relay mirror
fires only for `KIND_BAN|KIND_MUTE`; auth-worker `handle_action` routes only `ban|mute|warn`.
A lifted ban stays in force forever (governance-integrity / self-inflicted DoS). Not a self-unban
escalation (mirror requires `is_admin`), but the moderation lifecycle is broken.
**Fix:** mirror 30915/30916; have `load_state` subtract active unban/unmute rows (latest-wins per target).

---

## P1 — High

- **P1-1 · WebAuthn challenge not bound to authenticating pubkey** — `nostr-bbs-auth-worker/src/webauthn.rs:805-812` (register), `:1135-1143` (login). Verify queries `WHERE challenge=?1 AND created_at>?2` but never compares the stored `pubkey` column to `body.pubkey`. A challenge minted for A is consumable by a verify for B (cross-session reuse within the 5-min window). **Fix:** add `AND pubkey=?`; key the discoverable `__discoverable__` bucket to resolved userHandle.
- **P1-2 · `login_options` discloses real PRF salt unauthenticated** — `webauthn.rs:978-994`. Returns stored `prf_salt` for any known pubkey (registered/unregistered oracle); removes a defence layer (not key compromise, since PRF needs the authenticator). **Fix:** return salt only after a verified assertion, or guarantee fallback (`deterministic_salt_for`, `:60-66`) is byte-indistinguishable from real salts.
- **P1-3 · Unauthenticated git read/clone of private pod repos** — `solid-pod-rs-git/src/service.rs:82` (`is_write` true only for `git-receive-pack`) + `GIT_HTTP_EXPORT_ALL` (`:270`). `git-upload-pack`/`info/refs` invoke no `GitAuth`; any repo exposed via `/.well-known/apps` (JSS #464) is anonymously cloneable. **Fix:** gate upload-pack through WAC Read on the repo path.
- **P1-4 · DPoP replay protection off by default** — `solid-pod-rs/src/oidc/replay.rs:11,38`. `DpopReplayCache` is behind the `dpop-replay-cache` feature; `verify_dpop_proof` is replay-unaware otherwise (replayable within iat-skew). **Mirrors JSS 2026-01-05 #2.** **Fix:** enable the feature in the server build; wire `check_and_record(jti)`.
- **P1-5 · Moderation d-tag admin-namespace not bound** — `nostr-bbs-core/src/moderation_events.rs:169-194,239`. d-tag is `{admin}:{target}`; validator checks `admin_set.contains(pubkey)` + hex64 halves but never asserts `event.pubkey == admin_part`. Admin A can overwrite admin B's replaceable ban/unban slot. **Fix:** assert `admin_part == event.pubkey` for the four `{admin}:{target}` kinds.
- **P1-6 · Governance 31403 approve/reject needs no admin auth** — `nip_handlers.rs:221-232`. The agent-registry gate explicitly excludes `KIND_ACTION_RESPONSE`; the only remaining check is generic whitelist membership, so **any whitelisted member can approve/reject agent action requests** and drive `project_action_response`. Spec ("31403 requires NIP-98 admin signing") unmet. **Fix:** gate 31403 behind `is_admin`.
- **P1-7 · preview-worker SSRF is DNS-rebinding-vulnerable** — `nostr-bbs-preview-worker/src/ssrf.rs:120` validates only the hostname string; the runtime resolves at fetch time (`:81`), so `rebind.attacker.com` → `127.0.0.1`/`169.254.169.254`/RFC1918 passes. Redirect re-validation (`:76`, MAX_REDIRECTS=3) shares the flaw. Call sites `lib.rs:216`, `parse.rs:213`, `oembed.rs:79`. **Fix:** validate the resolved IP / pin connect IP, or apply a CF egress allowlist.
- **P1-8 · Workspace test build broken** — `nostr-bbs-config/src/validate.rs:125`: `baseline_cfg()` fixture omits the `native_pod` field added to `ForumConfig` (`schema.rs:49`) → `cargo test --workspace` fails (E0063). Lib compiles fine. **Fix:** add `native_pod: NativePod{…}` to the fixture.

---

## P2 — Medium

- **pod-worker `resource_path` lacks explicit `..`/`%2e`/`%2f` rejection** — `nostr-bbs-pod-worker/src/lib.rs:758` (`r2_key=format!("pods/{owner}{resource_path}")`). Contained today by ACL scoping + WHATWG path normalization, but defense-in-depth missing.
- **relay `mod_cache` fails OPEN on D1 error** — `mod_cache.rs:93-130` returns `Block::None` on any D1 fault; banned/muted users can post during a D1 outage. **Fix:** fail-closed or alarm.
- **WebAuthn RP_ID / EXPECTED_ORIGIN fail-open fallbacks** — `webauthn.rs:712,792,842,1124,1164` default to `"example.test"`/`"https://example.com"` when env unset. **Fix:** fail closed.
- **`clientDataJSON.crossOrigin`/`topOrigin` not validated** — `webauthn.rs:781-794,1112-1128`; an attacker iframe could drive the ceremony. **Fix:** assert `cross_origin != Some(true)`.
- **NIP-98 `u`-tag compared against `req.url()`** — `webauthn.rs:1058,1061` vs client `verify_url` (`passkey.rs:268-275`); proxy host rewriting can drift. **Fix:** canonicalise (scheme+host+path, drop query) both sides.
- **`acl:accessTo` over-inherits on walk-up** — `solid-pod-rs/src/wac/resolver.rs:55-103` + `evaluator.rs:280-293`; inherited ancestor `accessTo` rules leak to arbitrary descendants. **Fix:** tag inherited docs; ignore `accessTo` when inherited.
- **NIP-98 git-push body not hashed** — `solid-pod-rs-git/src/auth.rs:144-158` (`payload=None`, `GitLenient`). Accepted JSS-parity tradeoff for stock git clients; document + pin allow-lists.
- **`governance.rs` has no authz / append-only logic** — 31405 audit log is NIP-33 replaceable → a later same-`d` event silently overwrites an audit entry. **Fix:** `validate_governance_event(...)`; treat 31405 as append-only.
- **Agent-allowlist source drift** — relay uses D1 `agent_registry` (`nip_handlers.rs:223`), not the spec'd `forum-config/dreamlab.toml [governance].agent_pubkeys`. Reconcile the source of truth.
- **`ADMIN_KV` id placeholder unresolved** — `forum-config/deploy/auth-worker.wrangler.toml:41` + `pod-worker.wrangler.toml:23` bind `id="REPLACE_WITH_NEW_ADMIN_KV_ID"`; `wrangler deploy` will fail (or admin-flag writes break). **Fix:** create the KV namespace, paste the real id.
- **Non-constant-time PSK comparison** — `solid-pod-rs-server/src/lib.rs:2467` (`provided != expected` on `&str`); the single credential gate on native-pod provisioning. Low exploitability (network jitter, 32-byte random key) but should use `subtle::ConstantTimeEq`.
- **`/community/` setup-status probe `ERR_NAME_NOT_RESOLVED`** — console error on every forum load (unresolved native-pod/setup hostname).
- **Agentbox Nostr relay bridge: 0 events** — forum relay live and serving, agentbox side (`ws://127.0.0.1:7777`) down locally; bridge propagation unverifiable here (needs-infra).
- **WASM build blocked** — `secp256k1-sys` C cross-compile fails (`gnu/stubs-32.h`); only `nostr-bbs-config` + `nostr-bbs-preview-worker` are declared WASM-clean. Portability tracked by kit ADR-087.

---

## P3 — Low / hygiene

- search-worker admin set from `ADMIN_PUBKEYS` env, not members table — `nostr-bbs-search-worker/src/auth.rs:57` (acceptable for single ingest route).
- git guard strips literal `..` but doesn't decode `%2F`/`%2E` — `guard.rs:44-50` (post-decode `path_safe` catches it; add explicit decode-then-validate).
- **Doc-drift:** `dreamlab-ai-website/CLAUDE.md` — 39 stale refs (21 `community-forum-rs/` paths `:69-72,:89,:264-268,:404` + 18 `forum-*` crate names); `admin-cli`/`forum-admin` crate deleted from workspace.
- Prod `apple-touch-icon.png` 404; forum icon-font 404 (glyphs render as boxes).
- `@ruvector/rvf` dep not installed (rvf-validation tests blocked); stale Playwright `executablePath` chromium; `aqe` CLI unusable (`better-sqlite3` node-v115 ABI mismatch).

---

## Verified secure (no action)

- **Native-pod provisioning auth chain** — `POST /api/native-pod/provision` → auth-worker `lib.rs:586-706`: admin NIP-98 (`verify_nip98_replay`) + atomic replay store + `is_admin` + strict 64-hex pubkey; `NATIVE_POD_URL`/`NATIVE_POD_ADMIN_KEY` are pushed as CF secrets by `.github/workflows/set-worker-secrets.yml` from GH secrets (never committed); server `handle_admin_provision` (`solid-pod-rs-server/src/lib.rs:2448`) fails closed (403) when key is absent and writes owner-only WAC ACL.
- **No committed secrets** — `git grep` for `nsec1…`/PSK/admin-key/64-hex privkeys = 0 hits; `.env`/`.nostr-identities.env` gitignored + untracked.
- **NIP-01 verification** — canonical `[0,pubkey,created_at,kind,tags,content]` serialization (`event.rs:78-91`); `verify_event_strict` (`:205-239`) recomputes id + schnorr-verifies on **every** EVENT/AUTH path before side effects; no trust-without-verify path found.
- **NIP-42 AUTH** — full Schnorr + server-challenge match + 600s window (`nip_handlers.rs:482-528`).
- **Rate-limiting** — `nostr-bbs-rate-limit` wired into every mutating worker (auth/preview/search/pod/relay) + atomic D1 `INSERT OR IGNORE` replay.
- **Auth hardenings** — register re-derives PRF salt server-side (ignores client value, P0-01 fixed); counter regression check; constant-time RP-ID-hash compare; privkey never serialised (`StoredSession` excludes it), zeroized on `pagehide`, re-auth on bfcache; hybrid/QR blocked, Windows-Hello/no-PRF rejected with clear copy.
- **Pod ACL** — `.acl`-write escalation coerced to Control on the MCP path, 64 KiB ACL cap, deny-all on missing ACL.
- **Git** — `git-http-backend` CGI with `env_clear()` (no shell injection); `path_safe` rejects absolute/ParentDir/prefix-escape. IdP tokens ES256-signed (not the unsigned JSS bug).
- **Governance route** — `#/governance` rendering the landing page pre-auth is **correct** (auth-gated via `auth_gated!(AuthGatedGovernance, GovernancePage)`, `app.rs:1050/548`).

---

## Testability matrix (what ran vs. blocked)

| Item | Status | Evidence |
|------|--------|----------|
| `nostr-rust-forum cargo check --workspace` | RAN | 12 crates, 1m31s, exit 0 |
| kit `cargo test` (native) | PARTIAL | 1142+ pass / 0 fail / 2 ignored; **config test blocked** (P1-8) |
| `solid-pod-rs cargo test --workspace` | RAN | 27 pass / 0 fail / 6 ignored |
| `forum-config cargo test` | RAN | 17/17 pass |
| website `npm run lint` / `build` | RAN | lint 0 err/12 warn; build 16.36s OK |
| `tests/nostr-integration.mjs` | PARTIAL | 6/8 (2 live-relay deps) |
| `tests/agentbox-relay-test.mjs` | PARTIAL | 3/10 (agentbox relay down locally) |
| rvf-validation `.mjs` | BLOCKED | `@ruvector/rvf` not installed |
| `npx playwright test` | BLOCKED | chromium `executablePath` missing |
| Live UI smoke (browser sidecar) | RAN | prod root + `/community/` + `/governance` render |
| **USER passkey/PRF** | BLOCKED | no headless authenticator (flow documented) |
| **ADMIN forum-admin NIP-98** | BLOCKED | `admin-cli`/`forum-admin` crate deleted; keygen tested natively |
| **AGENT governance pubkey** | RAN (dry-run) | native keygen → valid 64-hex + `npub1…`, no prod contact |
| WASM forum-client build | BLOCKED | `secp256k1-sys` cross-compile (`stubs-32.h`); no trunk |
| CF worker runtime / `wrangler deploy` | BLOCKED | no CF creds/wrangler; workers audited statically |
| `aqe` QE fleet | BLOCKED | `better-sqlite3` node-v115 ABI crash |
| Native-pod e2e round-trip | BLOCKED | agentbox solid-pod-rs behind CF Tunnel; host SSH prohibited |

### Credential workflows (mapped)
- **User:** `credentials.create({prf})` → `HKDF(PRF, info="nostr-secp256k1-v1")` → secp256k1 sk → pubkey; sk never stored, re-derived per login, zeroed on `pagehide`. *Cannot exercise headlessly — no authenticator.*
- **Admin:** whitelist a hex pubkey via NIP-98; the `forum-admin` CLI is **gone from the workspace** (capability regression / doc-drift). Native identity-gen verified instead.
- **Agent:** add 64-hex pubkey to `forum-config/dreamlab.toml:191 [governance].agent_pubkeys`; relay filters kinds 31400-31405 to registered agent/admin pubkeys. Dry-run keygen produced `npub15583fthf3sylv…`.

---

## Recommended fix order
1. **P0-1, P0-2** (pod confidentiality + ACL escalation) — highest blast radius; both are JSS-known classes. Add `enforce_read` and `.acl`→Control.
2. **P0-3, P0-4** (moderation lifecycle) — unify the `expires`/`expiration` tag and wire unban/unmute consumers; add cross-layer round-trip tests.
3. **P1-3, P1-6** (anon git clone, governance approval authz) — directly weaken the human-agent trust boundary.
4. **P1-1, P1-2, P1-7** (auth challenge binding, salt disclosure, SSRF rebind).
5. **P1-8 / P2 deploy** (config test fixture, `ADMIN_KV` placeholder) — unblock CI + deploy.
6. **P2/P3** hardening + **CLAUDE.md rewrite** to the kit-consumer reality.

## Tooling gaps encountered (environment, not the product)
`aqe` fleet CLI (sqlite ABI) · `mmdc` render (puppeteer missing) · no wasm32 toolchain for secp256k1 · no `trunk` · `@ruvector/rvf` · Playwright chromium · host SSH prohibited (native-pod e2e). These bounded what could be *executed*; all P0/P1 findings are confirmed by static source trace and named with `file:line`.

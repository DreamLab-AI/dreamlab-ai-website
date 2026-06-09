# Forum Flow Cartography — DreamLab Community (`/community/`)

**Date:** 2026-06-09
**Method:** Diagram-Driven Diagnosis, read-only static trace, file:line evidence only.
**Live system:** https://dreamlab-ai.com/community/ — Leptos/WASM forum client + 5 Cloudflare Workers (`nostr-rust-forum` kit), configured by `forum-config/dreamlab.toml`.
**Repos traced:** `dreamlab-ai-website` (deploy + config), `nostr-rust-forum` (workers + Leptos client).
**Pinned kit:** `nostr-rust-forum@8d31f3a` (`.github/workflows/deploy.yml:45`, `workers-deploy.yml:31`).

> No secrets reproduced. Admin/agent pubkeys referenced by role only.

---

## 0. Topology recap (who serves what)

| Surface | Origin | Source |
|---|---|---|
| `/` React marketing site | GitHub Pages (`dreamlab-ai.com`, `CNAME`) | `dreamlab-ai-website/src/` (Vite) |
| `/community/` Forum UI | GitHub Pages, same origin | Leptos/WASM `nostr-bbs-forum-client` (trunk), copied to `dist/community/` (`deploy.yml:155`) |
| Auth API | `api.dreamlab-ai.com` → `dreamlab-auth-api` worker | `crates/nostr-bbs-auth-worker` |
| Relay (WSS) | `relay.dreamlab-ai.com` → `dreamlab-nostr-relay` worker + `NostrRelayDO` | `crates/nostr-bbs-relay-worker` |
| Pod API | `pods.dreamlab-ai.com` → `dreamlab-pod-api` worker | `crates/nostr-bbs-pod-worker` |
| Search API | `search.dreamlab-ai.com` → `dreamlab-search-api` worker | `crates/nostr-bbs-search-worker` |
| Link preview | `preview.dreamlab-ai.com` → `dreamlab-link-preview` worker | `crates/nostr-bbs-preview-worker` |
| Native pod tier | `pods-native.dreamlab-ai.com` (CF Tunnel → agentbox `solid-pod-rs`) | `dreamlab.toml:169-174` |

**Runtime URL resolution.** The WASM resolves worker URLs at runtime from `window.__ENV__` (injected post-build, `deploy.yml:166-167`) with a compile-time `option_env!("VITE_*")` fallback (set in `deploy.yml:34-39`). Relay/auth read `window.__ENV__` (`relay_url.rs:9-59`); pod/search/preview read **compile-time only** (see Gap 4).

**Base path.** `FORUM_BASE=/community` at compile (`deploy.yml:39`, consumed `app.rs:41`); `trunk build --public-url /community/` (`deploy.yml:141`); GitHub Pages SPA deep-link restore in `index.html:11-23` and `404.html` (`deploy.yml:179-196`).

---

## 1. USER flow — sequence diagram

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant GH as GitHub Pages<br/>(dreamlab-ai.com)
    participant W as Forum WASM<br/>(Leptos @ /community/)
    participant A as Auth Worker<br/>(api.dreamlab-ai.com)
    participant D1A as D1 dreamlab-auth<br/>(credentials, challenges, nip98_replay)
    participant R as Relay Worker + DO<br/>(relay.dreamlab-ai.com WSS)
    participant D1R as D1 dreamlab-relay<br/>(events, whitelist, agent_registry)
    participant S as Search Worker
    participant P as Preview Worker

    Note over B,GH: 1) Load
    B->>GH: GET /community/
    GH-->>B: index.html + window.__ENV__ + WASM (deploy.yml:166)
    W->>W: resolve auth_api_base()/relay_url() from __ENV__ (relay_url.rs:9,38)

    Note over B,A: 2) Registration (WebAuthn create + PRF)
    W->>A: POST /auth/register/options {displayName} (passkey.rs:115, lib.rs:253)
    A->>A: rp_id_required(env), prf_server_secret(env) [fail-closed]
    A->>D1A: INSERT challenges (challenge bucket bound to pubkey)
    A-->>W: {options, prfSalt}
    W->>B: navigator.credentials.create({prf}) (passkey.rs:140)
    W->>W: PRF output -> HKDF -> secp256k1 sk -> pubkey (passkey.rs:150)
    W->>A: POST /auth/register/verify {response,pubkey,prfSalt} (passkey.rs:171, lib.rs:258)
    A->>D1A: SELECT challenge WHERE challenge=?1 AND pubkey=?3 [P1-1 cross-bucket bind]
    A-->>W: {pubkey, didNostr, webId, podUrl}

    Note over B,A: 3) Login (WebAuthn get + PRF re-derive)
    W->>A: POST /auth/login/options {pubkey} (passkey.rs:235, lib.rs:264)
    A-->>W: {options, prfSalt}
    W->>B: navigator.credentials.get({prf}) (passkey.rs:246)
    W->>W: PRF -> HKDF -> sk -> pubkey; block hybrid/QR (passkey.rs:249)
    W->>A: POST /auth/login/verify {response,pubkey}<br/>Authorization: Nostr <nip98> (passkey.rs:286, lib.rs:269)
    A->>D1A: nip98 verify + replay INSERT OR IGNORE
    A-->>W: {token / session}
    W->>W: store PrfSigner (sk in-memory, zeroed on pagehide) (session.rs:281)

    Note over W,R: 4) Browse boards/threads (NIP-01/28 over WSS)
    W->>R: WebSocket connect wss://relay... (relay.rs)
    W->>R: ["REQ", sub, {kinds:[40]}]  channels (channel.rs:248 uses 42)
    R->>D1R: query events
    R-->>W: ["EVENT", sub, kind-40 channel / kind-42 message]
    W->>S: POST /search {q} (search optional) (search_client.rs:70, search lib.rs:535)
    W->>P: GET /preview?url=... (link cards) (link_preview.rs:8, preview lib.rs:342)

    Note over W,R: 5) Create a post (client signs, relay stores)
    W->>W: build UnsignedEvent{kind:42, tags:[e,root...]} (channel.rs:398)
    W->>W: auth.sign_event_async() via PrfSigner / NIP-07 (channel.rs:413, auth/mod.rs:549)
    W->>R: ["EVENT", signed] publish_with_ack (relay.rs:375)
    R->>R: verify_event_strict (Schnorr) + is_whitelisted (nip_handlers.rs:92)
    R->>R: trust level + zone access gate (nip_handlers.rs:145,267)
    R->>D1R: INSERT event; broadcast to DO subscribers

    Note over W,R: 6) Read receipt of own post
    R-->>W: ["OK", event_id, true, ""] (relay.rs:537)
    W->>W: pending_publishes callback (accepted=true) (relay.rs:540-556)
    W->>S: POST /ingest (NIP-98) index own message (channel.rs:421, search_client.rs:103)
```

**Identity:** `did:nostr:<hex>`. Private key is **never stored**; derived per session from WebAuthn PRF via HKDF→secp256k1 (`passkey.rs:150`, `session.rs:281`), held only as an in-memory `PrfSigner` and zeroed on `pagehide`. NIP-07 browser extension is an alternate signer (`auth/mod.rs:493`).

**Kinds:** channel = kind-40 (NIP-28), message/post = kind-42, report = kind-1984, deletion = kind-5 (`nip_handlers.rs:147,164,188,198`; `channel.rs:1,401`). NIP-98 (kind-27235) carries HTTP auth on `/api/*`, `/auth/login/verify`, `/ingest`.

---

## 2. ADMIN flow — sequence diagram

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Admin Browser<br/>(operator key / passkey)
    participant W as Forum WASM<br/>(/community/ admin pages)
    participant A as Auth Worker
    participant D1R as D1 dreamlab-relay<br/>(whitelist.is_admin, agent_registry, broker_cases)
    participant D1A as D1 dreamlab-auth<br/>(members.is_admin)
    participant R as Relay Worker + DO
    participant S as Search Worker
    participant NP as Native Pod Tier<br/>(pods-native via CF Tunnel)

    Note over Admin,A: Admin authorization is D1-sourced, NOT dreamlab.toml
    Admin->>A: any /api/* with Authorization: Nostr <nip98> (lib.rs:280)
    A->>A: verify_nip98_replay (auth.rs)
    A->>D1R: WHITELIST_IS_ADMIN_SQL (admin.rs:50)
    A->>D1A: MEMBERS_IS_ADMIN_SQL fallback (admin.rs:65)
    A-->>A: is_admin = true/false (admin.rs:48)
    Note right of A: dreamlab.toml [admin].static_pubkeys NOT read here (Gap 1)

    Note over Admin,A: Moderation actions (admin-gated, P0-3/P0-4 sprint)
    Admin->>A: POST /api/mod/{ban|mute|warn|unban|unmute} (lib.rs:375, moderation.rs)
    A->>D1R: persist moderation_actions (signed created_at)
    Admin->>A: POST /api/mod/report ; GET /api/mod/reports (lib.rs:387,395)
    Admin->>A: POST /api/mod/reports/:id/action (lib.rs:400)

    Note over Admin,R: Moderation enforced at relay (latest-wins, fail-closed)
    R->>D1R: mod_cache load_state + resolve_block (mod_cache.rs)
    R->>R: Block::{Banned|MutedUntil|None|Unknown} -> reject/accept EVENT

    Note over Admin,A: Agent governance / control surface (kinds 31400-31405)
    Admin->>A: GET /api/governance/agents ; POST agents/register|revoke (lib.rs:507-519)
    A->>D1R: agent_registry insert/active (governance_api.rs)
    Admin->>A: GET /api/governance/cases ; /cases/:id (lib.rs:521-530, broker_cases)
    Admin->>A: POST /api/governance/roles/{grant|revoke} ; GET roles (lib.rs:531-542)
    Note over Admin,R: Relay gates 31400-31405 on agent_registry; 31403 admin-only
    Admin->>R: ["EVENT", kind-31403 ActionResponse] (nip_handlers.rs:235,246)
    R->>R: is_registered_agent() / governance_response_blocked() admin gate (nip_handlers.rs:680)

    Note over Admin,S: Search admin uses a SEPARATE admin source
    Admin->>S: admin ops gated by ADMIN_PUBKEYS env (search auth.rs:47,56)
    Note right of S: search-worker admin set != auth/relay D1 set (Gap 2)

    Note over Admin,NP: Native pod provisioning (8d31f3a rc11)
    Admin->>A: POST /api/native-pod/provision {pubkey} (lib.rs:557,593)
    A->>A: require admin NIP-98 (lib.rs:629)
    A->>NP: POST {NATIVE_POD_URL}/_admin/provision/{pubkey}<br/>X-Pod-Admin-Key: <PSK> (lib.rs:689-707)
    NP-->>A: provisioned (git-enabled pod)
    Note right of A: dreamlab.toml admin_provision_url=/_admin/provision<br/>but worker posts /_admin/provision/{pubkey} (Gap 3)
```

**`ADMIN_PUBKEYS` check** is implemented in **two unrelated places**: (a) search-worker reads the `ADMIN_PUBKEYS` env (`search-worker/src/auth.rs:45-58`, comma-separated hex); (b) auth-worker + relay read **D1 `whitelist.is_admin` / `members.is_admin`** (`auth-worker/admin.rs:48-78`, `relay/whitelist.rs:91`). The `dreamlab.toml [admin] static_pubkeys` and the auth-worker `ADMIN_PUBKEYS` secret (required by `workers-deploy.yml:181`) are **not** consumed by the auth-worker admin gate.

**Governance / agent surface** (NIP-11 `agent_control_surface`, advertised `nip11.rs:77`): kinds 31400 PanelDefinition, 31401 PanelState, 31402 ActionRequest, 31403 ActionResponse, 31404 PanelUpdate, 31405 PanelRetired. Relay accepts 31400/31401/31402/31404/31405 only from `agent_registry` pubkeys (D1), and 31403 only from admins (`nip_handlers.rs:228-246`). `broker_cases` is the governance inbox surfaced via `/api/governance/cases` (`governance_api.rs:206-251`).

**Native pod tier** (`dreamlab.toml:169-174`, `8d31f3a`): `[native_pod] enabled=true`, git-enabled, cohort-gated; auth-worker proxies provisioning with `X-Pod-Admin-Key` PSK (`lib.rs:695`). Match `NATIVE_POD_ADMIN_KEY` (CF secret) ↔ `SOLID_ADMIN_KEY` (agentbox).

---

## 3. GAP LIST

Severity scale: **P0** critical / **P1** high (deploy or auth blocker) / **P2** medium / **P3** low.

### Gap 1 — `dreamlab.toml [admin] static_pubkeys` is read by no runtime admin gate — **P1**
- **Evidence:** `forum-config/dreamlab.toml:33-40` declares `[admin] mode="static"` + `static_pubkeys`. The auth-worker admin gate `is_admin()` queries only D1 `whitelist.is_admin` (`admin.rs:50`) and `members.is_admin` (`admin.rs:65`). No code path reads `static_pubkeys` or the auth-worker `ADMIN_PUBKEYS` secret. The relay also uses D1 (`whitelist.rs:91`).
- **Impact:** A fresh deployment whose D1 `whitelist`/`members` tables have no `is_admin=1` row has **zero admins** despite `dreamlab.toml` declaring two static admin pubkeys. The human operator cannot moderate, register agents, or provision native pods until a D1 admin row is seeded out-of-band. The "static admin" config is silently inert.
- **Minimal fix:** In `auth-worker/admin.rs::is_admin`, add a third check that reads the `ADMIN_PUBKEYS` env (mirror `search-worker/src/auth.rs:47`) before returning `false`; and have the deploy pipeline seed `dreamlab.toml [admin].static_pubkeys` into `ADMIN_PUBKEYS` (already required as a secret at `workers-deploy.yml:181`). One env read closes it.

### Gap 2 — Two divergent admin sources (D1 vs `ADMIN_PUBKEYS`) across workers — **P2**
- **Evidence:** auth-worker/relay admin = D1 (`admin.rs:48`, `whitelist.rs:91`); search-worker admin = `ADMIN_PUBKEYS` env (`search-worker/src/auth.rs:56`), with `search-worker/wrangler.toml:27` hardcoding only the visionclaw-server pubkey. The relay also carries an empty `ADMIN_PUBKEYS=""` (`relay-worker/wrangler.toml:10`) that nothing reads.
- **Impact:** An admin authorized via D1 whitelist is **not** an admin to the search worker unless separately listed in its env, and vice-versa. Admin-gated search reindex/ingest ops can succeed/fail inconsistently with the rest of the stack. This is the audit-05 "two sources of truth" flag, now confirmed to span three workers.
- **Minimal fix:** Pick one source. Either route search-worker admin checks through the relay D1 (cross-D1 binding like auth-worker `RELAY_DB`), or feed all three workers the same `ADMIN_PUBKEYS` derived from `dreamlab.toml [admin].static_pubkeys` at deploy time. Document the chosen authority in `CLOUDFLARE_WORKERS.md`.

### Gap 3 — Native-pod provision URL path disagreement (config vs worker) — **P2**
- **Evidence:** `dreamlab.toml:174` sets `admin_provision_url = ".../\_admin/provision"`. The auth-worker ignores that value and constructs `POST {NATIVE_POD_URL}/_admin/provision/{pubkey}` from the `NATIVE_POD_URL` env (`lib.rs:667,689`). `admin_provision_url` from `dreamlab.toml` is read by nothing in the worker; the worker needs `NATIVE_POD_URL` + `NATIVE_POD_ADMIN_KEY` as separate env bindings that are **not present** in `auth-worker.wrangler.toml` (`[vars]` lines 57-66 have no `NATIVE_POD_URL`).
- **Impact:** `/api/native-pod/provision` returns 503 "native pod not configured" (`lib.rs:669-686`) on the live deployment because `NATIVE_POD_URL`/`NATIVE_POD_ADMIN_KEY` are unset, even though `dreamlab.toml [native_pod].enabled=true`. The native pod tier (8d31f3a feature) is advertised but unreachable through the documented config key.
- **Minimal fix:** Add `NATIVE_POD_URL = "https://pods-native.dreamlab-ai.com"` to `auth-worker.wrangler.toml [vars]` and set `NATIVE_POD_ADMIN_KEY` as a CF secret; OR make the worker read `admin_provision_url` from config. Reconcile the trailing `/{pubkey}` path-segment convention between the two.

### Gap 4 — Pod/Search/Preview clients ignore `window.__ENV__` (compile-time only) — **P2**
- **Evidence:** `pod_client.rs:12`, `search_client.rs:9`, `components/link_preview.rs:8` resolve their base URL via `option_env!("VITE_*")` **only**, with no `window_env()` runtime path — unlike `relay_url.rs:9-59` which checks `window.__ENV__` first. `deploy.yml:166` injects `VITE_POD_API_URL`/`VITE_SEARCH_API_URL`/`VITE_LINK_PREVIEW_API_URL` into `window.__ENV__`, but those three keys are dead for these clients.
- **Impact:** Works today only because the trunk build also sets the `VITE_*` env at compile time (`deploy.yml:36-38`). If the runtime `__ENV__` injection is the intended override mechanism (it is, per `relay_url.rs:1-5` doc), any operator who rebrands by editing `__ENV__` without rebuilding the WASM will silently keep the baked-in URLs for pod/search/preview, falling back to `pod.example.com` / `search.example.com` / `members-link-preview...` if the compile-time vars were ever absent. Inconsistent override surface.
- **Minimal fix:** Give `pod_client`/`search_client`/`link_preview` the same `window_env("VITE_POD_API_URL")`-first resolution helper used in `relay_url.rs:62-75`.

### Gap 5 — Default CORS / RP fallback strings are placeholders (fail-open shape) — **P3 (mitigated)**
- **Evidence:** `auth-worker/lib.rs:40` defaults `Access-Control-Allow-Origin` to `https://example.com` when `EXPECTED_ORIGIN` is unset; `auth_api_base()` falls back to `https://api.example.com` (`relay_url.rs:57`). Wrangler sets `EXPECTED_ORIGIN=https://dreamlab-ai.com` (`auth-worker.wrangler.toml:60`) so production is correct.
- **Impact:** Low while wrangler vars are set, but a misconfigured deploy CORS-allows `example.com`. Audit-04 Anomaly 3 hardened the WebAuthn RP_ID/origin path to fail-closed; the CORS default here is still fail-to-placeholder rather than fail-closed.
- **Minimal fix:** Make `cors_headers` return no `Access-Control-Allow-Origin` (or 500) when `EXPECTED_ORIGIN` is unset, mirroring `expected_origin_required()` in `webauthn.rs`.

### Gap 6 — Auth-worker endpoint paths are `/auth/*`, not `/api/webauthn/*` as audit-04 diagrammed — **P3 (doc-accuracy)**
- **Evidence:** Real routes are `/auth/register/options|verify`, `/auth/login/options|verify`, `/auth/lookup` (`lib.rs:253-275`, client `passkey.rs:115,171,235,286`). Audit report 04 Diagram 1B labelled them `/api/webauthn/register/*` / `/api/webauthn/login/*`. No `/api/webauthn/*` route exists.
- **Impact:** Any tester or runbook following audit-04's endpoint names will hit 404. Browser-test assertions must use `/auth/*`.
- **Minimal fix:** Correct the endpoint names in audit-04 (and any client referencing `/api/webauthn/`). This doc uses the verified `/auth/*` paths.

### Gap 7 — NIP-11 advertises `auth_required:false` + NIP-17 while writes are whitelist-restricted — **P3** (carried from audit-04 Anomalies 5/6)
- **Evidence:** `relay-worker/src/nip11.rs:54` `auth_required:false` with `restricted_writes:true` (`:56`); `supported_nips` (`:43`) does not list 17 in the trimmed live set but NIP-59 gift-wrap is the only DM substrate (no kind-14 inbox routing in `relay_do/`).
- **Impact:** Spec-compliance only. Standard clients may not expect a write rejection without a NIP-42 AUTH challenge.
- **Minimal fix:** Either advertise the whitelist requirement or document the trust-gated write model in the relay info doc.

### Gap 8 — `KIT_REF` / `ADMIN_KV` / doc-drift from audit 05 — **CLOSED, verify** (was P1/P2)
- **Status:** `deploy.yml:45` and `workers-deploy.yml:31` now pin `KIT_REF=8d31f3a...` (audit-05 A3 fixed). `workers-deploy.yml:115-163` auto-provisions the `ADMIN_KV` namespace via the CF API, substituting `REPLACE_WITH_NEW_ADMIN_KV_ID` at deploy time (audit-05 A2 / register R-09 addressed at the pipeline layer). `workers-deploy.yml:170-193` gates deploy on `PRF_SERVER_SECRET` + `ADMIN_PUBKEYS` presence. Register R-13c marks the `community-forum-rs/` doc refs fixed in `182cc23`.
- **Residual:** The wrangler.toml files still literally contain `REPLACE_WITH_NEW_ADMIN_KV_ID` (`auth-worker.wrangler.toml:41`); a `wrangler deploy` run **outside** the CI pipeline (manual local deploy) still fails. Keep this as a P3 note: the placeholder is only safe because CI rewrites it.

---

## 4. Browser-test map

For an automated browser session (chrome-devtools-mcp / Playwright via the `browser` skill). Selectors are derived from Leptos view markup; assert primarily on the **network call** (most robust against WASM markup drift).

### USER flow

| # | Step | URL / action | Selector hint | Expected network call |
|---|---|---|---|---|
| U1 | Load forum | `GET https://dreamlab-ai.com/community/` | `#loading-screen` then app mount | 200; `index.html` contains `window.__ENV__` with `VITE_RELAY_URL` (`deploy.yml:166`) |
| U2 | Signup page | navigate `/community/signup` | display-name input, "Create passkey" button (`pages/signup.rs`) | — |
| U3 | Register options | click register | — | `POST api.dreamlab-ai.com/auth/register/options` → 200 `{options, prfSalt}` |
| U4 | WebAuthn create | virtual authenticator w/ PRF | browser passkey UI | `navigator.credentials.create` resolves |
| U5 | Register verify | (auto) | — | `POST .../auth/register/verify` → 200 `{pubkey, didNostr, podUrl}` |
| U6 | Login | navigate `/community/login`, click sign-in | login button (`pages/login.rs`) | `POST .../auth/login/options` → 200; then `POST .../auth/login/verify` with `Authorization: Nostr ...` → 200 |
| U7 | Relay connect | (auto after login) | online indicator | WSS open to `relay.dreamlab-ai.com`; client sends `["REQ",...]` |
| U8 | Browse boards | navigate `/community/forums` | category list (`pages/forums.rs`) | `["EVENT", sub, kind-40]` frames received |
| U9 | Open channel | click a channel | message list (`pages/channel.rs`) | `["REQ", {kinds:[42], e_tags:[...]}]` (`channel.rs:248`) |
| U10 | Link preview | message with URL in view | `.link-preview-card` (`link_preview.rs:110`) | `GET preview.dreamlab-ai.com/preview?url=...` → 200 |
| U11 | Search | navigate `/community/search`, type query | search box (`pages/search.rs`) | `POST search.dreamlab-ai.com/search` → 200 (`search_client.rs:70`) |
| U12 | Create post | type in compose box, submit | compose textarea + send (`channel.rs:398`) | WSS `["EVENT", {kind:42,...}]` sent (`relay.rs:375`) |
| U13 | Read receipt | (auto) | message appears / "sent" state | WSS `["OK", <id>, true, ""]` (`relay.rs:537`); message renders in own thread |
| U14 | Search ingest | (auto post-publish) | — | `POST search.../ingest` with NIP-98 (`channel.rs:421`) |

### ADMIN flow

| # | Step | URL / action | Selector hint | Expected network call |
|---|---|---|---|---|
| A1 | Login as admin | as U6 with operator passkey | — | `POST .../auth/login/verify` → 200 |
| A2 | Admin page loads | navigate `/community/admin` | admin nav visible only if admin (`pages/admin.rs`) | first admin-gated `GET /api/...` returns 200 (not 403) — **asserts Gap 1**: against a fresh D1, expect **403** here despite `dreamlab.toml` static admin |
| A3 | List reports | open Reports tab | `admin/reports.rs` table | `GET api.../api/mod/reports` → 200 `{reports:[...]}` (`lib.rs:395`) |
| A4 | Ban a user | click ban in user table | `admin/user_table.rs` | `POST api.../api/mod/ban` → 200 (`lib.rs:375`) |
| A5 | Unban | click unban | — | `POST api.../api/mod/unban` → 200 |
| A6 | List agents | Governance tab | `pages/governance.rs` | `GET api.../api/governance/agents` → 200 (`lib.rs:507`) |
| A7 | Register agent | submit agent pubkey | governance form | `POST api.../api/governance/agents/register` → 200 (`lib.rs:511`) |
| A8 | List broker cases | Governance → Cases | case list | `GET api.../api/governance/cases` → 200 (`lib.rs:521`) |
| A9 | Governance response | approve/reject an ActionRequest | — | WSS `["EVENT", {kind:31403}]` → `["OK", id, true]` only if admin (`nip_handlers.rs:246`) |
| A10 | Native pod provision | provision a member pod | `pages/pod_browser.rs` native card | `POST api.../api/native-pod/provision {pubkey}` — **asserts Gap 3**: expect **503 "native pod not configured"** until `NATIVE_POD_URL` is set |
| A11 | Search admin op | admin-only reindex | — | search op gated by `ADMIN_PUBKEYS` — **asserts Gap 2**: a D1-only admin may get 401/403 here |

**Negative assertions worth baking in:** (a) any `/api/webauthn/*` URL → 404 (Gap 6); (b) non-admin pubkey on `POST /api/mod/ban` → 403; (c) non-whitelisted pubkey publishing kind-42 → WSS `["OK", id, false, "blocked: pubkey not whitelisted"]` (`nip_handlers.rs:92`); (d) non-agent pubkey publishing kind-31400 → rejected (`nip_handlers.rs:235`).

---

## Evidence index (primary files)

- Auth routes: `nostr-bbs-auth-worker/src/lib.rs:224-583`
- Admin gate: `nostr-bbs-auth-worker/src/admin.rs:48-78`
- Governance API: `nostr-bbs-auth-worker/src/governance_api.rs`
- Native pod proxy: `nostr-bbs-auth-worker/src/lib.rs:585-713`
- Client auth/PRF: `nostr-bbs-forum-client/src/auth/passkey.rs`, `auth/session.rs:281`, `auth/mod.rs:185,549`
- URL resolution: `nostr-bbs-forum-client/src/utils/relay_url.rs`, `utils/pod_client.rs:12`, `utils/search_client.rs:9`, `components/link_preview.rs:8`
- Post/kind flow: `nostr-bbs-forum-client/src/pages/channel.rs:398-425`, `src/relay.rs:365-556`
- Relay write/governance gate: `nostr-bbs-relay-worker/src/relay_do/nip_handlers.rs:92,145,228-246,680`; `src/whitelist.rs:91`; `src/nip11.rs:43-77`
- Config: `forum-config/dreamlab.toml`, `forum-config/deploy/*.wrangler.toml`
- Deploy: `.github/workflows/deploy.yml`, `.github/workflows/workers-deploy.yml`

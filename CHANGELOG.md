# Changelog

## 2026-09-26 — kit pin 49e70de: encrypted-zone fixes from the browser run, still switched off (nostr-bbs-core/mesh 1.0.0-beta.11, unchanged)

- `KIT_REF` moved from `3a7f329` to forum `49e70de`. Encryption stays off (`ENCRYPTION_ENABLED = "false"`).
- **Zone keys are kept.** A received key is now saved in the browser, and a grant is only marked handled once its key is stored, so a brief network failure can no longer lose it.
- **Live events after idle.** When the relay woke from idle, members whose tabs had been open a while stopped receiving live events (key grants included). Fixed.
- **CORS.** The relay now answers each allowed origin rather than always the first.
- **Keys for new members.** Granting a zone key to members who are missing it can also send the earlier keys, so someone who joins after a rotation can read older messages. On by default in Admin › Encryption; untick it to send only the current key.
- Found by a local browser run of the whole encryption flow. Needs `deploy.yml` and `workers-deploy.yml`; no D1 migration or secret.

## 2026-09-26 — kit pin 3a7f329: end-to-end encrypted zones, shipped switched off (nostr-bbs-core/mesh 1.0.0-beta.11, unchanged)

- `KIT_REF` moved from `87c580c` to forum `3a7f329` (kit ADR-2016).
- **Encrypted zones.** Each encrypted zone gets a key. Admins give it to members as a gift-wrapped DM, and replace it with a new key when someone leaves. Channel messages in that zone are NIP-44 encrypted to the key, and the relay refuses plaintext posts into encrypted channels that are bound to a zone. Only the text of each message is encrypted: who posted, when, and replies stay visible. Public zones can never be encrypted.
- **Off for now.** `[encryption].enabled = false` in `dreamlab.toml`, and it's mirrored as `ENCRYPTION_ENABLED = "false"` in the relay's `[vars]` and in the forum and BBS `window.__ENV__`. The config-mirror check now covers all three. With the switch off, nothing changes for members.
- **Zones staged for encryption:** zone2, zone3 and zone4. zone4 has `agent_keys = true`, so JunkieJarvis can hold its key.
- Needs both `deploy.yml` (client) and `workers-deploy.yml` (relay). No D1 migration or secret.

## 2026-09-25 — kit pin 87c580c: user cards, identity links, thread landing, search deep links (nostr-bbs-core/mesh 1.0.0-beta.11, unchanged)

- `KIT_REF` moved from `c3f147f` to forum `87c580c`.
- **User cards.** Clicking a member's avatar or name shows when they started posting, how many posts they have, where they are most active and a link to their full profile. The profile page gets the same section. The counts come from the relay's new `GET /api/profile-stats`, which only counts posts in zones the viewer can read.
- **Linked identities.** An admin alias (`pubkey_aliases`) now marks a key as replaced. The relay publishes the map (`GET /api/profiles/successors`) and leaves replaced keys out of profile search. The forum shows a replaced key's posts under the successor's name and avatar, drops it from the @mention and DM pickers, and redirects `/dm/<old>` to the successor.
- **Threads and search.** Opening a topic lands on its newest post. Search results open at the matching message (`/go/:event_id` finds the topic and highlights the post) instead of the channel above it. User results open the profile.
- Needs both `deploy.yml` (client) and `workers-deploy.yml` (relay). No D1 migration, secret or `dreamlab.toml` change.

## 2026-09-25 — kit pin c3f147f: sidestr-core 0.3.2 (nostr-bbs-core/mesh 1.0.0-beta.11, unchanged)

- `KIT_REF` moved from `d79ae26` to forum `c3f147f`: the forum client takes sidestr-core 0.3.2, which builds without its `std` feature again. No behaviour change; client-only.

## 2026-09-25 — kit pin d79ae26: wording for Podkey's opt-in (nostr-bbs-core/mesh 1.0.0-beta.11, unchanged)

- `KIT_REF` moved from `21562c6` to forum `d79ae26`. Podkey 0.0.10 keeps sidechain spends off until a member turns them on, and asks in its own window the first time the forum requests one. The Wallet and tip hints now say so ("Podkey will ask you to turn on sidechain spends, then show you this spend"), reading `window.nostr.sidestr.enabled`, and an `unsupported` refusal explains how to turn spends on. Client-only; no worker, secret or D1 change.

## 2026-09-24 — kit pin 21562c6: spend through a browser signer (nostr-bbs-core/mesh 1.0.0-beta.11, unchanged)

- `KIT_REF` moved from `aabfb85` to forum `21562c6`. Members signed in with Podkey (0.0.9 or later) spend from the Wallet page and tip without pasting an nsec: the forum builds the spend unsigned and Podkey, which reads and validates `sidestr:dreamlab` itself, shows it and signs it (`window.nostr.sidestr.signTransaction`, sidestr spec proposal `browser-signer`; forum ADR-2015 D8). Transaction events now come from a throwaway key, so a member is asked once. Members with an older extension still see the unlock box. Client-only; no worker, secret or D1 change.

## 2026-09-24 — member wallets and DREAM tips switched on

- `SIDESTR_WALLET` set to `'on'` in `deploy.yml` (`0c6161b`): members get the Wallet page (DREAM balance, give, starter packs for members and agents, receive, faucet), a DREAM tip control on every post's reaction row, and "Send DREAM" on profiles (forum ADR-2015, kit `aabfb85`). Client-only; no worker, secret or D1 change.
- Opening distribution on `sidestr:dreamlab`: 100 DREAM to each named member and the JunkieJarvis and Jezbot agents (blocks 406–407); the treasury faucet grants 100 DREAM and 1,000 sats per member per 24 hours.

## 2026-09-24 — kit pin aabfb85: member wallets and DREAM tips (staged off), Pending fix (nostr-bbs-core/mesh 1.0.0-beta.11, unchanged)

- `KIT_REF` moved from `411352b` to forum `aabfb85`. The admin Pending tab no longer shows approved members as pending: the client read only the relay whitelist's first page of 20, so every older member appeared pending and approving them could not clear it. Every page is now read, which also fixes the Members table and new-joiner alerts (forum ADR-2014, phase 0).
- Member wallets on `sidestr:dreamlab` (testnet4) and DREAM tips (forum ADR-2015) ship in the bundle but stay off: `SIDESTR_WALLET` is `'off'` in `deploy.yml` and injected into `window.__ENV__`, so members see no change until it is set to `'on'`. Client-only; no worker, secret or D1 change.

## 2026-09-23 — kit pin 411352b: ontology governance live (nostr-bbs-core/mesh 1.0.0-beta.11, unchanged)

- `KIT_REF` moved from `c076992` to forum `411352b`: ontology governance goes live — Promote is activated, Demote is added, and pending ontology proposals expire via the relay's existing five-minute cron sweep. D1 migration `0007_ontology_governance.sql` is additive and nullable (`broker_cases.stale_after` plus a partial index); the relay applies it at start-up through `ensure_schema()`, so no manual migration step. Crate versions unchanged.

## 2026-09-23 — kit pin c076992 (nostr-bbs-core/mesh 1.0.0-beta.11, unchanged)

- `KIT_REF` in `deploy.yml`, `workers-deploy.yml`, `rust-ci.yml` and the kit compatibility record moved from `64b15d5` to forum `c076992` (the head of nostr-rust-forum PR #70, merged): members' posts are found by text search again (the relay's NIP-50 search replaces the admin-only vector index for plain queries), long-press or hover on a reaction shows who reacted, plus the relay 31403 admission build fix, rustls 0.23.45 (RUSTSEC-2026-0285) and colloquy knowledge kinds 38410-38412. Crate versions unchanged, so no Cargo edit. Forum `5a3fea6` (Promote/Demote governance) is deliberately not in this pin.

## 2026-09-15 — kit pin 64b15d5 (nostr-bbs-core/mesh 1.0.0-beta.11)

- `KIT_REF` in `deploy.yml`, `workers-deploy.yml`, `rust-ci.yml` and the kit compatibility record moved from `931898a3` (beta.10 release) to forum `main` `64b15d5`.
- `forum-config` pins `nostr-bbs-core` and `nostr-bbs-mesh` at `=1.0.0-beta.11`; `nostr-bbs-config` and `nostr-bbs-rate-limit` republished at beta.11 (version-only) so the set is coherent.
- Brings the augmentation-conditions governance changes (VisionFlow ADR-2010/2011; forum ADR-2011) and the 2026-09 user-feedback fixes to the edge on the next deploy.
- **Operator action before deploy:** `wrangler secret put CALIBRATION_SELECTION_KEY --name dreamlab-nostr-relay` (HMAC key for calibration sampling); without it the relay refuses to mark calibration samples.


All notable changes to the DreamLab AI website will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Native Pod Sprint] - 2026-05-17

Encrypted agentbox ↔ forum link via Cloudflare Tunnel. Users in eligible
cohorts see a second "Native pod" card in the pod browser backed by the
agentbox `solid-pod-rs-server`. Full git panel and app manifest panel available
on the native tier. Admin can provision native pods from the admin control panel.

### Added

- **`[native_pod]` in dreamlab.toml**: `base_url`, `allowlist_cohorts`,
  `admin_provision_url`. Wires the forum client to `pods-native.dreamlab-ai.com`.
- **Native pod card in pod browser**: second pod section showing when user is in
  an allowlisted cohort; probes native server, renders GitPanel + AppManifestPanel
  on `Available`.
- **Admin "Native Pods" tab**: enter any pubkey and provision a native pod
  without CLI access. Calls `POST /api/native-pod/provision` → CF auth-worker →
  native server `/_admin/provision/{pubkey}` (PSK-gated).
- **`solid-pod-rs-server` alpha.15**: `--allowed-origins` / `SOLID_ALLOWED_ORIGINS`
  CORS allowlist; `--admin-key` / `SOLID_ADMIN_KEY` PSK for the provision endpoint.
- **Agentbox sidecar** (`docker-compose.solid-pods.yml`): `solid-pod-rs-server`
  (built from source with `--features git`) + `cloudflared-pod` tunnel; shared
  `agentbox-solid-data` volume.
- **forum-config pinned to NRF rc11 (`8d31f3a`) / solid-pod-rs alpha.15 (`0c5fa42`)**.

## [Git Control Panel Sprint] - 2026-05-17

Full git Version Control surface for Solid pods. Users on native-server
deployments can stage, diff, commit, branch, and publish directly from the
forum pod browser. Pods also become first-class app distribution repositories
(JSS issue #464). CF Workers deployments gracefully show "Git API not
available".

### Added

- **Git control panel** (`components/git_panel.rs` in forum client): VS Code
  Source Control panel UI. Staged/unstaged/untracked file sections. Per-file
  stage, unstage, discard, and inline diff viewer (green/red line colouring).
  Commit message textarea + button. Lazy-loaded commit history log. Busy guard
  prevents concurrent mutations.
- **App manifest panel** (JSS #464 — Apps in pods): collapsible form below the
  git card. Reads/writes `{pod}/apps/manifest.json` via NIP-98-authenticated
  GET/PUT. Makes pods usable as decentralised app-distribution repositories:
  store an app manifest in your pod and the server aggregates them at
  `/.well-known/apps`.
- **Auto-probe on pod mount**: the pod browser fires a one-shot probe as soon
  as the pod URL and signer are ready, with no "Check Git" button required.
  Probe result gates the full git card (Available), a compact note
  (Unavailable), or a spinner (Probing). CF Workers pods settle immediately to
  Unavailable.
- **solid-pod-rs alpha.14 server endpoints** (nine `/_git/{pk}/*` REST routes,
  NIP-98 + pod-owner guarded): status, log, diff, stage, unstage, commit,
  branches, create-branch, discard. `/.well-known/apps` discovery
  unconditional. Native server only (ADR-089).

### Changed

- **forum-config pinned to `nostr-rust-forum` rc10 (`23c0c5b`)** and
  `solid-pod-rs` alpha.14 (`4ac7670`).

## [Unreleased]

### Changed

- **Pinned forum kit to `nostr-rust-forum` `a7c9c40`** for the JSS v0.0.197
  Solid surface and DreamLab's public `POD_BASE_URL` fix. The operator overlay
  now consumes the same upstream code that exposes authenticated `POST /.pods`,
  JSS-compatible CORS/auth headers, `Updates-Via`, TypeIndex/media
  provisioning, and public WebID URLs on `pods.dreamlab-ai.com`.
- **Corrected Cloudflare feature flags**: pod creation and federated NIP-05 are
  live, but pod-stored private keys, native JSON-LD export, and git-init remain
  disabled on the CF Workers tier until those upstream paths are Worker-portable.
- **Forum build endpoints now use custom DreamLab domains** (`api.`,
  `pods.`, `search.`, `preview.`, `relay.`) instead of `workers.dev` URLs.

## [JSS Phase 1 Sprint] - 2026-05-16

Cross-repo sprint landing JSS v0.0.190 Phase 1 features through the
ecosystem. Federated NIP-05 identity and pod provisioning are live on the
operator overlay; native key-provisioning and export paths remain tracked
upstream for Worker portability.

### Added

- **Federated NIP-05 identity (live)**: `nostr-bbs-auth-worker` now
  resolves `/.well-known/nostr.json` against the local D1 whitelist
  first and falls back to the user's Solid pod over HTTP when the
  D1 row is absent. Verified `name@dreamlab.ai` badges work for any
  user with a provisioned pod.
- **Pod-resident key provisioning (live)**: Signup generates a
  BIP-340 Schnorr secp256k1 keypair inside the user's pod, writes
  `/private/privkey.jsonld` under an owner-only WAC ACL, and patches
  the WebID `/profile/card` with the `nostr:pubkey` triple. Removes
  the previous "paste your nsec" friction.
- **Pod data export endpoint (live)**: `GET /api/export` returns a
  JSON-LD bundle of the user's pod contents,
  `@context = "https://solid-pod-rs.dev/ns/export/v1"`, time-chain
  ordered ascending by `created`, `/private/*` excluded by default.
  Operator opt-in via `[export]` overlay block.
- **Operator overlay config blocks**: Three new manifest sections in
  `forum-config/dreamlab.toml` — `[provision]`, `[nip05]`, and
  `[export]` — with `Phase1Config` schema in
  `forum-config/src/phase1.rs`. Operators can flip each feature
  independently and tune resolver mode, fallback timeouts, and
  default exclusions without touching auth-worker source.
- **Wrangler env wiring**: `NIP05_RESOLVER_MODE` and `POD_BASE_URL`
  env-vars threaded through `workers/auth-worker/wrangler.toml` so
  the federated resolver picks up overlay values at build time.

### Changed

- **solid-pod-rs dependency bumped** to `0.4.0-alpha.11` via the
  upstream `nostr-rust-forum` kit. All seven sibling crates were
  published to crates.io in the same release window, so the
  workspace `[patch.crates-io]` override has been removed.

### Notes

- Cross-repo commit chain:
  [solid-pod-rs d8a1c81](https://github.com/DreamLab-AI/solid-pod-rs/commit/d8a1c81)
  (v0.4.0-alpha.11) →
  [nostr-rust-forum 1fe95fd](https://github.com/DreamLab-AI/nostr-rust-forum/commit/1fe95fd)
  (federated NIP-05 resolver, [ADR-086](https://github.com/DreamLab-AI/nostr-rust-forum/blob/main/docs/adr/ADR-086-nip05-pod-federation.md))
  → forum-config
  [aad6aad](https://github.com/DreamLab-AI/dreamlab-ai-website/commit/aad6aad)
  (overlay flipped to federated).
- See the operator overlay README "JSS Phase 1 features" subsection
  (`forum-config/README.md`) for the per-block configuration
  reference.
- Two follow-up ADRs are open upstream:
  [ADR-087](https://github.com/DreamLab-AI/nostr-rust-forum/blob/main/docs/adr/ADR-087-cf-workers-portable-cores.md)
  (CF-Workers-portable cores — blocks pod-resident signup UX, data
  export UX, and NIP-05 badge in the CF Workers runtime) and
  [ADR-088](https://github.com/DreamLab-AI/nostr-rust-forum/blob/main/docs/adr/ADR-088-wac-turtle-serializer-quirk.md)
  (WAC Turtle serializer bare-path IRI quirk).

## [Governance Sprint] - 2026-05-12

### Added

- **Agent Control Surface**: Governance dashboard at `/governance` route with
  reactive agent panel for human-in-the-loop oversight of autonomous AI systems.
  Custom Nostr event kinds 31400-31405 carry agent control surface events;
  approve/reject action responses are NIP-98 signed.
- **Governance feature flag**: `governance = true` in `forum-config/dreamlab.toml`
  `[features]` section, with full `[governance]` configuration block (route,
  kinds range, relay URL, agent pubkey allowlist).
- **Header navigation**: Governance submenu added under Community dropdown in
  `src/components/Header.tsx`, linking to `/community/#/governance`.
- **Outcome card**: "Agent Control Surface" card added to the landing page
  outcome grid in `src/pages/Index.tsx`.

## [Security Audit Sprint] - 2026-05-11

DreamLab ecosystem-wide security audit. 10 fixes applied to
dreamlab-ai-website covering P0 critical, P1 high, P2 medium, and P3
housekeeping findings.

### Security

- **P0-15**: GDPR consent now requires explicit checkbox interaction in
  ExclusivityBanner.tsx; previously the banner accepted implicit consent
  via page scroll or navigation, which does not meet GDPR Article 7
  requirements for unambiguous consent
- **P0-16**: Supabase client null guards added on all call sites in
  supabase.ts and 3 consuming files, preventing runtime crashes when
  Supabase environment variables are missing and gracefully degrading
  instead of throwing unhandled exceptions
- **P0-17**: Production URL fallback replaced with requireEnv() in
  forum-api.ts; the previous fallback silently pointed to a hardcoded
  production URL when the environment variable was unset, which could
  route staging/dev traffic to production

### Fixed

- **P1-30**: strictNullChecks enabled in tsconfig.json with all 5
  affected files updated to handle null cases explicitly, eliminating
  an entire class of null-reference runtime errors
- **P2-11**: Mermaid diagram rendering hardened with strict mode and
  DOMPurify sanitisation in WorkshopPage.tsx, preventing XSS through
  crafted diagram definitions in user-contributed workshop content

### Added

- **P1-29**: GDPR data erasure pipeline implemented in gdpr-erasure.ts
  with supporting UI in Privacy.tsx, allowing users to request and
  execute complete deletion of their personal data
- **P1-31**: Token buy/withdraw confirmation dialog added in
  PaymentDashboard.tsx, requiring explicit user confirmation before
  executing irreversible financial transactions
- **P2-12**: AgentJobsDashboard component added in
  AgentJobsDashboard.tsx with supporting API integration in
  forum-api.ts, providing visibility into agent job status and costs

### Removed

- **P3-06**: Dead components Work.tsx and ResearchPaper.tsx removed;
  both were unreachable from the router and had no active references
- **P3-07**: Unused Three.js dependencies removed from package.json
  (@react-three/fiber, @react-three/drei, three), reducing the
  production bundle by approximately 850KB

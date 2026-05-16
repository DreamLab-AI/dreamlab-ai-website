# Changelog

All notable changes to the DreamLab AI website will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [JSS Phase 1 Sprint] - 2026-05-16

Cross-repo sprint landing JSS v0.0.190 Phase 1 features through the
ecosystem. Three Phase 1 outcomes are live on the operator overlay:
federated NIP-05 identity, pod-resident key provisioning, and pod
data export.

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

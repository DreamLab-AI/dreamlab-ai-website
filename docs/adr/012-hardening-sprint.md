---
title: "ADR-012: Community Forum Hardening Sprint"
description: "Architectural decisions for the community forum security, auth, data, performance, and code quality hardening sprint"
category: architecture
tags: [adr, security, auth, hardening, ddd, nostr, forum]
difficulty: advanced
last-updated: 2026-03-07
---

# ADR-012: Community Forum Hardening Sprint

## Status

Accepted

## Date

2026-03-07

## Context

An independent audit (GPT-5.4 624K-token full-codebase review + Opus 4.6 manual review) scored the community forum at architecture maturity 2/5, identifying 2 CRITICAL, 10 HIGH, and 6 MEDIUM findings across 18 items. The five top blockers for production readiness are:

1. Plaintext private key handling in the "simple" auth flow
2. Client-side-only trust for admin/access logic
3. Broken passkey discoverable login (`/auth/lookup` missing)
4. Static deployment pretending to have server-side protections (`hooks.server.ts`)
5. Duplicated channel/state architecture (two competing stores)

This ADR documents the architectural decisions made to resolve all findings in a single sprint across 5 epics (16 items).

## Decisions

### D1: Local-Key Private Keys — Encrypt at Rest (E1.1, E1.4)

**Decision**: Local-key auth mode encrypts private keys using the existing `key-encryption.ts` module with a user-supplied passphrase before writing to `localStorage` or `sessionStorage`. Raw hex keys are never stored in browser storage.

**Rationale**: The "simple" login flow stored raw nsec/hex private keys in `localStorage`, meaning any XSS, extension, or local access permanently compromises the user's Nostr identity. Passkey mode already keeps keys in a non-persistent closure. Local-key mode must match that security posture.

**Constraints**:
- `sessionStorage` entries also encrypted (session theft via dev tools)
- `privateKey` field in `AuthState` remains for relay connection (in-memory only, never persisted)
- On logout, `_privkeyMem` is zero-filled and storage entries are deleted

### D2: Server-Side Admin Authorization — Relay Is Source of Truth (E1.2, E3.2)

**Decision**: All admin/whitelist mutations are validated server-side by the nostr-relay Worker. The relay verifies NIP-98 Authorization headers and checks the signer's pubkey against its authoritative admin whitelist in D1. Client-side admin checks (`VITE_ADMIN_PUBKEY`) are UX-only.

**Rationale**: Frontend-only admin checks are trivially bypassed. The relay already stores the whitelist and can verify NIP-98 tokens. Making it the enforcement point requires no new infrastructure.

**Constraints**:
- `whitelist.ts` functions use `fetchWithNip98()` for all mutations
- `verifyWhitelistStatus()` queries the relay API, not local env vars, for the authoritative answer
- Fallback to `VITE_ADMIN_PUBKEY` only when relay is unreachable (read-only UX hint, never for writes)

### D3: SSRF Protection — DNS Resolution Before Fetch (E1.3)

**Decision**: The link preview proxy (`src/routes/api/proxy/+server.ts`) performs DNS resolution on the target URL's hostname before issuing the fetch. Resolved IPs are checked against private/reserved ranges. Redirects are followed manually with re-resolution at each hop, max 3 redirects.

**Rationale**: Hostname deny-lists are bypassed by DNS rebinding attacks. Resolving DNS and checking the actual IP addresses prevents SSRF to internal services regardless of hostname tricks.

**Constraints**:
- Only `http:` and `https:` schemes allowed
- Private, loopback, link-local, multicast, and reserved IP ranges blocked
- Redirect limit: 3 hops with re-resolution at each

### D4: Remove False-Security Server Hooks (E2.2)

**Decision**: Delete `hooks.server.ts` and move all security headers to a static `_headers` file and Cloudflare rules. The app uses `adapter-static` with `ssr = false` — server hooks never execute in production.

**Rationale**: `hooks.server.ts` creates false confidence that CSP, HSTS, and route protection are active in production. They only run in `vite dev`. Static deployments must use CDN-level headers.

### D5: Consolidate Channel Stores Into One (E3.1)

**Decision**: `channelStore.ts` (the NIP-29 metadata-based store) becomes the single canonical channel store. `channels.ts` (the older store with `stores/channels.ts` semantics) is deleted. Any code importing from `channels.ts` is migrated to use `channelStore.ts`.

**Rationale**: Two stores with different `Channel` interfaces, different access semantics, and different filtering logic create data inconsistency. One store eliminates the class of bugs where different pages show different channel visibility.

### D6: Make Config Reactive (E3.3)

**Decision**: Replace the module-scope frozen `config` singleton in `loader.ts` with a Svelte writable store. Derived constants like `SECTION_CONFIG` become derived stores that recompute on config changes.

**Rationale**: `saveConfig()` writes to localStorage and updates `cachedConfig`, but `SECTION_CONFIG` is computed once at import time from the initial config. Runtime config mutations never propagate to permission checks or section maps.

### D7: Fix Bundle — puppeteer to devDependencies (E4.3)

**Decision**: Move `puppeteer` from `dependencies` to `devDependencies` in `community-forum/package.json`. It's a test/scraping tool, not a runtime dependency.

### D8: Normalize Package Identity (E4.4)

**Decision**: Rename package from `Nostr-BBS-nostr` to `dreamlab-community-forum`. Fix broken `validate:docs` scripts that reference `docs/scripts/validate-*.sh` — these files exist at the repo root, not the community-forum subdirectory. Update references to use correct relative paths.

## Consequences

### Positive
- Private keys encrypted at rest (local-key mode) or never stored (passkey mode)
- Admin operations enforced server-side with NIP-98 verification
- SSRF protection resilient against DNS rebinding
- No false-security from dead server hooks
- Single channel model eliminates data inconsistency
- Config changes propagate reactively to all consumers
- Smaller production bundle (no puppeteer)
- Working pre-commit hooks

### Negative
- Local-key users must enter passphrase on each session restore (UX tradeoff for security)
- Config reactivity adds Svelte store overhead (negligible for config-sized data)

### Risks
- Channel store consolidation may surface bugs in components that relied on the deleted store's interface differences
- Removing `hooks.server.ts` means `vite dev` loses security headers (acceptable — dev is not production)

## References

- `forumPRD.md` — Hardening Sprint PRD
- ADR-010 — Return to Cloudflare (migration complete)
- ADR-011 — Images to Solid Pods

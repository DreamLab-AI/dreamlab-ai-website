---
title: "Community Forum"
description: "SvelteKit community forum with Nostr protocol, passkey authentication, and static deployment"
category: reference
tags: ['forum', 'sveltekit', 'nostr', 'community', 'developer']
difficulty: intermediate
last-updated: 2026-03-01
---

# Community Forum

The DreamLab AI community forum is a SvelteKit 2.49 application deployed as a static site at `/community/`. It provides channels, direct messages, calendar events, and user profiles, all built on the Nostr protocol with passkey-first authentication.

## Architecture

```
community-forum/
  src/
    routes/              -- 21 SvelteKit route pages
    lib/
      auth/              -- passkey.ts, nip98-client.ts
      stores/            -- auth.ts, pwa.ts
      nostr/             -- NDK setup, NIP-07, keys
      components/
        auth/            -- AuthFlow, Signup, Login, NicknameSetup, NsecBackup
  packages/
    nip98/               -- shared NIP-98 sign/verify module
  services/
    auth-api/            -- Cloud Run WebAuthn server (Express)
    jss/                 -- Cloud Run Solid pod server
    nostr-relay/         -- Cloud Run Nostr relay
    embedding-api/       -- Cloud Run vector embeddings
    image-api/           -- Cloud Run image resizing
    link-preview-api/    -- Cloud Run URL metadata
  tests/
    unit/                -- Vitest unit tests
    e2e/                 -- Playwright end-to-end tests
```

## Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | `+page.svelte` | Landing / auth redirect |
| `/signup` | `signup/+page.svelte` | Registration flow |
| `/login` | `login/+page.svelte` | Login (passkey, NIP-07, nsec) |
| `/setup` | `setup/+page.svelte` | Profile setup after registration |
| `/pending` | `pending/+page.svelte` | Approval waiting room |
| `/forums` | `forums/+page.svelte` | Forum directory |
| `/chat` | `chat/+page.svelte` | Channel list |
| `/chat/[channelId]` | `chat/[channelId]/+page.svelte` | Channel messages |
| `/dm` | `dm/+page.svelte` | Direct message inbox |
| `/dm/[pubkey]` | `dm/[pubkey]/+page.svelte` | DM conversation |
| `/events` | `events/+page.svelte` | Calendar events |
| `/view/[noteId]` | `view/[noteId]/+page.svelte` | Single note view |
| `/settings/muted` | `settings/muted/+page.svelte` | Muted users |
| `/admin` | `admin/+page.svelte` | Admin dashboard |
| `/admin/calendar` | `admin/calendar/+page.svelte` | Admin calendar management |
| `/admin/stats` | `admin/stats/+page.svelte` | Admin statistics |
| `/[category]` | `[category]/+page.svelte` | Category view |
| `/[category]/[section]` | `[category]/[section]/+page.svelte` | Section view |
| `/[category]/[section]/calendar` | `[...]/calendar/+page.svelte` | Section calendar |
| `/[category]/[section]/[forumId]` | `[...]/[forumId]/+page.svelte` | Forum thread |
| `/[section]/calendar` | `[section]/calendar/+page.svelte` | Section calendar (alt route) |

## Auth Integration

The forum uses three authentication methods, orchestrated by the `AuthFlow.svelte` component:

1. **Passkey (primary)** -- WebAuthn PRF extension derives a secp256k1 private key from biometric authentication. The key lives only in a memory closure and is zero-filled on page hide.

2. **NIP-07 extension** -- Alby, nos2x, or another Nostr signer extension provides the pubkey and handles event signing. No private key is exposed to the application.

3. **Local key (advanced)** -- Users paste an nsec or hex private key. Stored in sessionStorage (default) or localStorage (remember me).

### Onboarding Steps

```
Signup --> NicknameSetup --> NsecBackup (local key only) --> PendingApproval --> Forum
```

- `Signup.svelte` handles passkey registration or local key generation
- `NicknameSetup.svelte` sets a display name and publishes a kind:0 metadata event
- `NsecBackup.svelte` (local key path only) enforces private key backup before continuing
- `PendingApproval.svelte` polls for admin approval (whitelist addition)

### NIP-98 API Authentication

All state-mutating API calls use NIP-98 HTTP auth. The `fetchWithNip98()` wrapper in `nip98-client.ts` automatically signs requests with the in-memory private key. See [NIP-98 Auth](./nip98-auth.md) for details.

## Nostr Protocol Usage

| NIP | Usage |
|-----|-------|
| **NIP-01** | Basic event structure, kind:0 metadata, kind:1 notes |
| **NIP-17** | Encrypted direct messages |
| **NIP-25** | Reactions (emoji responses) |
| **NIP-28** | Public channel messages |
| **NIP-42** | Relay authentication |
| **NIP-44** | Message encryption (v2, replaces deprecated NIP-04) |
| **NIP-52** | Calendar events (kind:31922 date, kind:31923 time) |
| **NIP-59** | Gift wrapping for DM privacy |
| **NIP-98** | HTTP authentication for API calls |

## Build Process

The forum uses the SvelteKit static adapter to produce a pre-rendered static site:

```bash
cd community-forum
npm run build
# Output: community-forum/build/  (copied to dist/community/ during CI)
```

### CI/CD Pipeline

1. The `deploy.yml` GitHub Actions workflow builds both the main Vite SPA and the SvelteKit forum
2. The forum build output is copied into `dist/community/`
3. The combined `dist/` directory is deployed to GitHub Pages (gh-pages branch)
4. The forum is accessible at `https://dreamlab-ai.com/community/`

### Testing

```bash
# Unit tests (Vitest)
cd community-forum && npm test

# End-to-end tests (Playwright)
cd community-forum && npx playwright test
```

## Backend Services

The forum depends on six Cloud Run services. Per ADR-010, auth-api, pod-api, and search-api Workers are deployed to Cloudflare:

| Service | Purpose | Storage | Migration Target |
|---------|---------|---------|-----------------|
| **auth-api** | WebAuthn registration/authentication, NIP-98 gating, pod provisioning | PostgreSQL | Cloudflare Workers + D1 (deployed) |
| **jss** | Solid pod storage (WebID, per-user files, ACLs) | Filesystem | Cloudflare Workers + R2 pod-api (deployed) |
| **nostr-relay** | Nostr event relay (NIP-01/28/98) | PostgreSQL | Retained on Cloud Run |
| **embedding-api** | Vector embeddings for semantic search | -- | Retained on Cloud Run |
| **image-api** | Image upload, resizing, serving | Filesystem | Cloudflare Workers + R2 (planned) |
| **link-preview-api** | URL metadata extraction | -- | Cloudflare Workers (planned) |


## Zone and Cohort Access Control

The forum uses a three-tier hierarchy for content organisation:

1. **Zone (Category)** -- top-level context boundary
2. **Section** -- topical grouping within a zone, access-controlled by cohort membership
3. **Forum (Channel)** -- NIP-28 channel for messages within a section

Users are assigned to **cohorts** (named groups) via a PostgreSQL whitelist. The relay rejects events from pubkeys not on the whitelist (except kind:0 metadata and kind:9024 registration requests).

## Related Documentation

- [Authentication System](./authentication.md) -- WebAuthn PRF and login flows
- [NIP-98 Auth](./nip98-auth.md) -- shared NIP-98 module
- [ADR-002](../adr/002-three-tier-hierarchy.md) -- three-tier hierarchy decision
- [ADR-004](../adr/004-zone-based-access-control.md) -- zone-based access control
- [ADR-007](../adr/007-sveltekit-ndk-frontend.md) -- SvelteKit + NDK frontend

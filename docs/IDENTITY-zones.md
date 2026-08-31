---
title: DreamLab AI — Identity, Zones & DM Routing Baseline
doc_id: DLW-IDENTITY
version: 0.1.0
status: draft-for-ratification
verified_commit: d852f61
sources:
  - forum-config/dreamlab.toml
  - forum-config/README.md
  - src/lib/nostr.ts
  - src/components/AIChatFab.tsx
  - .github/workflows/deploy.yml
  - docs/archive/adr/027-canonical-identity-stack.md
date: 2026-08-31
---

# DreamLab AI — Identity, Zones & DM Routing Baseline

## Purpose

Single source of truth for how identity, access zones, the admin/agent roster,
and website→agent DM routing actually work in this repo — as distinct from the
converged `did:nostr` document shape the identity ADRs describe but no code here
produces. Ground-truth order: overlay config and client code > legacy ADR prose.
The deploy/build topology lives in the sibling doc `BASELINE-architecture.md`.

## Current State

### Identity is raw-hex Schnorr pubkeys, not DID documents

Every identity in the shipped surface is a **64-hex secp256k1 public key**. The
React client generates and uses keys via `nostr-tools` — `getPublicKey`,
`finalizeEvent` signing `kind: KIND_NIP42_AUTH` (22242) relay-challenge auth
events (`src/lib/nostr.ts:20-22,31,98,279-281,579-581,706-708`; NIP-42, not
NIP-98 — the string `NIP-98` appears nowhere in `nostr.ts`)
— with **no** DID-document, Multikey, or `publicKeyMultibase` construction
anywhere in this repo. The forum client (upstream kit) authenticates the same
raw-pubkey way. Auth methods offered are WebAuthn PRF passkeys, NIP-07 extension,
and raw private key; the resulting principal is always the hex pubkey.

### The DID/Multikey "convergence" is documentation-only

Legacy ADR-027 documents a converged `did:nostr` document form — `@context`
`["https://www.w3.org/ns/cid/v1", "https://w3id.org/nostr/context"]`, top-level
`"type": "DIDNostr"`, a `"type": "Multikey"` verification method whose
`publicKeyMultibase` is the prefix **`fe70102`** + x-only hex
(`archive/adr/027-canonical-identity-stack.md`). `fe70102` is **not a commit** —
it is the Multikey encoding prefix itself: base16-multibase `f` + secp256k1-pub
multicodec varint `e701` + compressed-point `02`. The two commits that landed
this "convergence" (`d62ab40`, `8d942d7`) touched **only docs and JSON-LD
`@context` strings**; their own messages state "no identity/key/npub/URN/ACL
migration; raw-pubkey Schnorr auth untouched". The binding spec they cite,
`ADR-125-did-nostr-multikey-convergence.md`, **does not exist in this repo** —
it is a backend/kit document. Net: no code here emits or verifies a `fe70102`
Multikey DID document; the convergence is a paper decision deferred to the kit
(ADR-027 is archived as "Deferred — kit-owned").

### Access model — four zones, authored once

Zones are authored in `forum-config/dreamlab.toml` `[[zones]]` and projected
into both the relay's `ZONE_CONFIG` and the client's `window.__ENV__.ZONE_CONFIG`
(hand-mirrored in `deploy.yml:73-75`). The four zones (`dreamlab.toml:95-143`):

| id | slug | display_name | visibility | encrypted | cohorts |
|----|------|-------------|-----------|-----------|---------|
| `zone1` | `welcome` | Welcome | **public** | no | none |
| `zone2` | `minimoonoir` | Minimoonoir | locked | no | `zone2`, `minimoonoir` |
| `zone3` | `family` | Family | locked | **yes** | `zone3`, `family` |
| `zone4` | `dreamlab` | DreamLab | locked | no | `zone4`, `dreamlab` |

Only `zone1` (Welcome) is public; the other three are locked tiles.
Required-cohort lists are **dual-accept** (generic zone id *and* legacy slug) so
pre-2026-07 grants keyed on the slug still match — dropping either arm collapses
legacy members to welcome-only (`dreamlab.toml:110-113` comment, 2026-07-20
regression fix). `zone3`/`zone4` carry `kanban = true` (kinds 30301/30302);
`zone3` is the only end-to-end-encrypted zone (`encrypted = true`,
`dreamlab.toml:131`). WebAuthn RP is pinned to `dreamlab-ai.com`
(`dreamlab.toml:15-16`).

### Admin & agent roster — trust-domain separation, one unsplit key

Four trust domains hold distinct key material (`forum-config/README.md`):
operator (human), agents, test users, and the VisionClaw server. Admin pubkeys
are **static** (`[admin].mode = "static"`, `dreamlab.toml:33-34`), not resolved
from D1. Seven agents and three test users are enumerated in `[[agents]]` /
`[[test_users]]`, each with an explicit `authorised_by` naming the human
operator `operator-jjohare` (`6407eed8…425a`).

**Open, staged, not applied:** the primary admin pubkey listed first is
`visionclaw-server` (`11ed6422…663c`) — the **same** key used under
`[governance].agent_pubkeys` as a BrokerActor publisher, a non-admin service
identity. The key split (mint a distinct operator/admin key) is a four-location
atomic change that includes the auth-worker `ADMIN_PUBKEYS` Cloudflare secret,
which cannot be rotated from this repo or CI, so it is deliberately held
(`dreamlab.toml:36-56` comment; legacy ADR-040 D3).

### Website → agent DM routing (`junkiejarvis`)

The marketing "Talk to AI" FAB routes over Nostr, not an HTTP chat endpoint. The
browser gift-wraps a kind-14 rumor to `VITE_JARVIS_PUBKEY` (junkiejarvis,
`2de44d…16e9`) and publishes the kind-1059 wrap to the primary relay
(`src/components/AIChatFab.tsx:23-28,354`). Because the primary relay's allowlist
rejects a kind-1059 addressed to the session's ephemeral key, **replies are read
from open relays** (`relay.damus.io`, `relay.primal.net`) the agent also
publishes to (`AIChatFab.tsx:31-35,269`; legacy ADR-042 Amendment 1). The
contact form uses the same gift-wrap transport to `VITE_ADMIN_PUBKEY` (legacy
ADR-041). Both pubkeys are hand-synced mirrors of `dreamlab.toml`.

### Pod & NIP-05 posture

Solid pods are provisioned Worker-native on Cloudflare R2; private keys are
generated on-device and never written to R2 (`dreamlab.toml` `[provision]`,
`keys_at_signup = false`). NIP-05 resolution is `federated` — D1 cache first,
pod `/.well-known/nostr.json` on miss (`dreamlab.toml:206-208`). A second
native-pod backend (agentbox tier, git-enabled) is advertised to `zone2/3/4`
cohorts via `[native_pod]` (`dreamlab.toml:245`).

## Known divergences & open items

- **"Friends" zone does not exist.** `README.md` markets "locked Friends, Family,
  and DreamLab" zones; the config has no `friends` zone — the second zone is
  `minimoonoir` (`dreamlab.toml:106-109`). "Friends"/"cohort" language in the
  marketing copy has no config referent.
- **"Public MiniMooNoir landing" is misleading.** The public zone is `zone1`
  Welcome (`visibility = "public"`); `minimoonoir` (`zone2`) is
  `visibility = "locked"` (`dreamlab.toml:101,115`). MiniMooNoir is the BBS node
  brand, not the public zone.
- **DID/Multikey convergence is unrealised here** (see Current State). Treat any
  claim that this repo emits `did:nostr` Multikey documents as false until a code
  path produces one; the `ADR-125` binding spec is not in-tree.
- **Admin/governance key is unsplit** (legacy ADR-040 D3) — `visionclaw-server`
  serves as both primary admin and governance publisher; the split is staged
  behind an operator-run CF-secret rotation.
- **Roster `authorised_by` is authored but not rendered.** The kit renders the
  authorising principal from server-side D1 `agent_registry.registered_by`, not
  from `[[agents]]`; `ForumConfig` does not parse the table
  (`dreamlab.toml` `[[agents]]` comment).

## Invariants (must not silently change)

1. Identity in the shipped surface is the raw 64-hex secp256k1 pubkey. Any move
   to emit or require a Multikey/DID document is a code change and a new ADR, not
   a docs edit.
2. Zone `required_cohorts` must stay **dual-accept** (zone id + legacy slug)
   until every legacy slug grant is migrated, or locked-zone members lose access.
3. Only `zone3` (Family) is encrypted; changing `encrypted` on any zone changes
   the E2E guarantee and must be recorded.
4. The Talk-to-AI reply-relay set must remain a subset of the agent's own
   publish fan-out, or replies are never seen (`AIChatFab.tsx:31-35`).
5. Admin pubkeys, the Jarvis pubkey, and `ZONE_CONFIG` are hand-mirrored between
   `dreamlab.toml` and `deploy.yml`; a rotation touches every mirror or the
   surfaces desync.

## Change process

Any change to identity handling, the zone model, the admin/agent roster, or DM
routing: (1) edit `forum-config/dreamlab.toml` as the authored source and update
every hand-synced mirror in `deploy.yml` in the same change; (2) if it touches
the auth-worker `ADMIN_PUBKEYS` secret, note the operator runbook step —
CI cannot rotate it; (3) update this doc's affected section with the new
`file:line` and re-record `verified_commit`; (4) add a thin ADR under
`docs/adr/`. Legacy identity ADRs (027–036, 040–042) are evidence, not
authority — the archive is frozen at 2026-08-31.

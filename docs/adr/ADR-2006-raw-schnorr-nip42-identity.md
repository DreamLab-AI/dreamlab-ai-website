---
id: ADR-2006
title: Identify principals by raw-hex Schnorr pubkey over NIP-42; defer DID/Multikey to the kit
date: 2026-08-31
decision_status: accepted
implementation_status: complete
activation_status: live
supersedes: []
superseded_by: []
verified_commit: dc06748
owner: jjohare
review_trigger: any code path that emits or verifies a did:nostr / Multikey document in this repo
repo: dreamlab-ai-website
domain: IDENTITY-zones.md
lineage: distils legacy 027-canonical-identity-stack (the deferred fe70102 Multikey convergence), 030-authentication-signer-abstraction, 017-passkey-rs-webauthn-prf, 036-agent-delegation-via-device-keys.
---

# ADR-2006 — Identify principals by raw-hex Schnorr pubkey over NIP-42; defer DID/Multikey to the kit

## Context

Legacy ADR-027 documents a converged `did:nostr` document form with a `fe70102`
Multikey verification method. A competent reader could take that as the shipped
identity model. It is not: no code here emits or verifies such a document, and the
binding spec it cites (`ADR-125`) lives in another repo.

## Decision

Every principal in the shipped surface **is** a 64-hex secp256k1 public key.
Client auth is NIP-42 relay-challenge: `finalizeEvent` signs `kind:
KIND_NIP42_AUTH = 22242` events (`src/lib/nostr.ts:31,281,581,708`), keys via
`getPublicKey` (`:22,:98`). This is **NIP-42, not NIP-98** — the string `NIP-98`
appears nowhere in `nostr.ts`. No DID-document, Multikey, or `publicKeyMultibase`
construction exists in-tree. The DID/Multikey convergence is a paper decision
**deferred to the kit** (ADR-027 archived "Deferred — kit-owned"); realising it
here is a code change and a new ADR, never a docs edit.

## Consequences

- Forecloses claiming this repo speaks `did:nostr`: any assertion that it emits a
  `fe70102` Multikey document is false until a code path produces one.
- The three auth methods offered (WebAuthn PRF passkey, NIP-07 extension, raw
  private key) all resolve to the same hex-pubkey principal — no principal-type
  branching downstream.
- The convergence deferral constrains: identity-shape work cannot land as
  documentation; it must cross the code boundary and re-open this ADR.

## Verification

At `dc06748`: `grep -nE "KIND_NIP42_AUTH|22242|getPublicKey|NIP-98|Multikey|publicKeyMultibase" src/lib/nostr.ts` returns the 22242 constant (`:31`) and its three
signing sites, `getPublicKey` at `:22,:98`, and **zero** hits for `NIP-98`,
`Multikey`, or `publicKeyMultibase`. Realm and deferral in `IDENTITY-zones.md`
§Identity is raw-hex Schnorr / Invariant 1.

## Closeout extension — 2026-09-04

Work package: **CP-04/05**. Accountable owner remains `jjohare`; estate acceptance requires the release and identity maintainers where the boundary crosses repositories. This extends closeout criteria without changing the accepted architectural choice.

NIP-42 signing uses the ephemeral chat key. Tier selection reads an extension public key only; it does not prove that key controls the DM session or grant private-context authority.

**Acceptance condition:** Keep transport identity distinct from visitor identity; decide whether tiers require authenticated authority and demonstrate the proof/grant/deny path if so. Keep deferred DID work explicitly kit-owned.

Dependency: the estate release identity (CP-01), plus the upstream kit revision and affected identity/grounding contracts. Reopen on the existing review trigger or a failing acceptance probe. Preserve the historical `verified_commit` and activation declaration: this annex is source/test evidence at `7e243741c8eaf61506ef86a70b8dd44d80722c11`, not a new live-service certification.

See the [commercial review](../../../VisionFlow/docs/estate-review/commercial-surfaces.md) and [receipt](../../../VisionFlow/docs/estate-review/evidence/commercial-snapshot.json).

## Acceptance progress — 2026-09-05

**Implemented (partial).** The closeout finding was that "tier selection reads an
extension public key only; it does not prove that key controls the DM session or
grant private-context authority" — and that the code did not say so.

Transport identity and visitor identity remain distinct, as this ADR requires:
DMs continue to ride the ephemeral session key and the NIP-07 key is never used
to sign a wrap. What has changed is that the client no longer transmits the tier
or the extension pubkey as bare facts open to being read as authority. Both now
go on the wire **explicitly labelled unverified**
(`src/lib/chat-turns.ts`, `encodeQuestion`):

```
X-DreamLab-Tier-Hint: 3 (client-asserted, UNVERIFIED, not an entitlement)
X-DreamLab-Identity-Hint: <pubkey> (client-asserted, UNVERIFIED, not an
                                    entitlement, no proof of possession)
```

"No proof of possession" is the accurate statement: `requestNostrAuth` calls
`getPublicKey()` only — the browser never asks the extension to sign anything, so
possession of the corresponding secret is unproven, and the key is in any case
not the key that signs the DM. A unit test asserts the payload never contains
"authoris/entitled/granted", so a future edit cannot quietly upgrade the hint's
language into a claim.

**Tests + results.** Covered by `src/lib/__tests__/chat-turns.test.ts` (25 tests,
passing): the tier hint carries the unverified marker; the identity hint carries
"no proof of possession"; the identity header is omitted entirely when no
extension key is connected; and no authority vocabulary appears. Component-level
proof in `src/components/__tests__/AIChatFab.test.tsx` — raising to Tier 2 with a
NIP-07 stub present transmits the hint in exactly that form. Full suite: 191
vitest tests pass.

**Remaining.** The open architectural question this ADR's closeout poses is
**not** decided here: whether tiers should require authenticated authority at
all. This pass makes the current, unauthenticated posture *honest on the wire*;
it does not add a proof/grant/deny path. If tiers are ever to gate private
VisionFlow context, that needs a NIP-42-style challenge over the extension key
(or a signed capability), an agent-side check, and a demonstrated denial — a
decision for the identity maintainers spanning this repo and agentbox. Deferred
DID/Multikey work remains kit-owned and untouched.

**Governed paths changed.** `src/lib/chat-turns.ts` (new),
`src/components/AIChatFab.tsx`.

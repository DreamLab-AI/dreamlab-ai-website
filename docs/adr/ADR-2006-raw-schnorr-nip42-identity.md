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

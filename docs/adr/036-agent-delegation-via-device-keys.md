# ADR-036: Agent Delegation via Device Keys (supersedes ADR-032)

## Status: Accepted

## Date: 2026-06-11

## Context

[ADR-032](032-agent-job-marketplace-nip90.md) proposed an agent job marketplace
built on two Nostr mechanisms: NIP-90 Data Vending Machines (job request/result
kinds 5000-7999 plus kind-31990 capability advertisements) and NIP-26 delegated
event signing (a delegator signs a time-scoped token authorising a delegatee
pubkey). It targeted modules of the in-tree `community-forum-rs` port that was
deleted on 2026-03-12 in favour of the upstream `nostr-rust-forum` kit
(`nostr-bbs-*` crates, pinned `25ca8a1` in `forum-config/Cargo.toml`).

Both mechanisms were subsequently **removed from the kit**. The upstream
repository deleted `nip26.rs` and `nip90.rs` (~1220 lines combined): NIP-90 DVMs
and NIP-26 delegation are no longer implemented, typed, or exposed by any kit
crate. The deletion was deliberate. NIP-26 delegation has a structural weakness
this ecosystem judged unacceptable for agent identity: a delegation token is
irrevocable within its `created_at<T` window — if a delegated agent key is
compromised, the only remedy is to wait for expiry. NIP-90's DVM kinds carried a
large surface area (per-domain job kinds, feedback/result correlation, payment
tags) for a marketplace that does not yet exist, and DreamLab's agent identities
are addressed and governed differently (see the agent roster and Agent Control
Surface kinds 31400-31405 in `forum-config/dreamlab.toml` and
`forum-config/README.md`).

The kit's sanctioned model for "an agent or a second device acting for a user" is
the **device-key** mechanism defined in upstream **ADR-099**. A device key is a
distinct keypair issued to a device or agent. It is not a token scoped against
the root key; it is its own identity with its own authority record, and it is
**individually revocable** without waiting for an expiry window. In the DreamLab
deployment the device-key tear-off path is currently gated off
(`DEVICE_KEYS_ENABLED=false`; see [ADR-039](039-connect-onboarding-adoption.md)
and `docs/forum-onboarding.md`), but it is the architectural slot that agent
delegation occupies — not NIP-26.

## Decision

**Supersede ADR-032.** Agent delegation in the DreamLab forum uses the kit's
device-key model (upstream ADR-099), not NIP-90 DVMs and not NIP-26 delegation.

1. **NIP-26 is not the delegation mechanism.** No delegation tokens are minted,
   parsed, or verified. The `DelegationToken` type, the `sign_hash()` Signer
   extension, and the `POST /api/delegation/create` endpoint from ADR-032 are
   abandoned — their implementation targets no longer exist and the underlying
   NIP was removed upstream.

2. **NIP-90 DVMs are not the marketplace mechanism.** Kinds 5000-7999 and
   kind-31990 carry no special DreamLab handling. The `/community/marketplace`
   page and the `nip90.rs` types from ADR-032 are abandoned.

3. **Agent authority is a device key.** An agent (e.g. `welcome-bot`,
   `moderation-bot`, `marketplace-agent` in the `forum-config` roster) holds its
   own keypair with its own cohort and admin flags. Its authority is granted and
   revoked at the key level via the kit's admin/whitelist tables
   (`is_admin`, cohort membership in `001_init.sql`), not via a token scoped
   against a human's root key. Compromise of an agent key is remedied by revoking
   that key — immediately, without an expiry window.

4. **The marketplace concept is deferred, not rejected.** If a capability
   marketplace is later prioritised, it is to be designed atop device keys: a
   device-keyed agent publishes a capability record, users address jobs to that
   agent's key, and authority is bounded and revoked per key. That is a future
   ADR; nothing here commits to building it.

## Consequences

### Positive

- The ADR record matches deployed reality: there is no dangling mandate to build
  NIP-90/NIP-26 code that the kit has deleted.
- Device keys give individually-revocable agent authority, closing the
  irrevocable-token weakness ADR-032 itself flagged as a trade-off.
- Agent identity reuses the kit's existing admin/whitelist/cohort machinery — no
  bespoke delegation subsystem to maintain.

### Negative / Trade-offs

- Cross-ecosystem interoperability with external NIP-90 DVM providers (Wavlake,
  Satlantis, etc.) is not available. DreamLab agents do not participate in the
  public DVM marketplace. This was an explicit ecosystem-level call upstream.
- The device-key tear-off path is gated off in this deployment today, so even the
  device-key model is not yet user-exercisable here; it is the architectural
  direction, not a shipped feature.

### Neutral

- No overlay code changes follow from this ADR — it records a supersession and a
  direction. The gate flip that would activate device keys is governed by
  [ADR-039](039-connect-onboarding-adoption.md).

## Related Decisions

- [ADR-032](032-agent-job-marketplace-nip90.md): Superseded by this ADR.
- [ADR-039](039-connect-onboarding-adoption.md): /connect onboarding and the
  gated device-key tear-off (upstream ADR-098/ADR-099).
- [ADR-030](030-authentication-signer-abstraction.md): The `Signer` trait that
  ADR-032 leaned on for `DelegationToken` signing — that dependency is void.

## References

- upstream `nostr-rust-forum` ADR-099 (device keys) — the sanctioned delegation model
- upstream `nostr-rust-forum` ADR-098 (/connect magic-link onboarding)
- [docs/forum-onboarding.md](../forum-onboarding.md)
- `forum-config/dreamlab.toml`, `forum-config/README.md` (agent roster, Agent Control Surface)

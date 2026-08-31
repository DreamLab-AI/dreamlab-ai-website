# ADR-039: /connect Onboarding Adoption — Magic-Link (ADR-098) + Gated Device-Key Tear-Off (ADR-099)

## Status: Accepted

## Date: 2026-06-11

## Context

The DreamLab forum's onboarding journey is the upstream kit's, not a
DreamLab-authored flow. Anomaly R4 in
[the forum overlay anomaly register](../architecture/00-forum-overlay-anomaly-register.md)
caught that the deployed `/connect` magic-link onboarding (upstream **ADR-098**)
was documented nowhere in this repo, while `docs/prd/prd-ux-onboarding-v5.0.md`
(the older traffic-light auth picker) was still marked `accepted` with no
supersession. R4 was resolved: `docs/forum-onboarding.md` §ADR-098 documents the
flow, and the v5.0 PRD carries a superseded-by note pointing at it.

This ADR is the **deployment-specific security acceptance** of that onboarding —
the decision of record for *why DreamLab accepts a bearer-key-in-fragment flow*,
who may mint links, and how it relates to the device-key tear-off. It is distinct
from the upstream ADRs (which define the mechanism) and from
`docs/forum-onboarding.md` (which describes the user journey): this records the
operator's acceptance of the security posture.

The deployed mechanism (from `docs/forum-onboarding.md` and the kit):

- **/connect magic-link (ADR-098, live).** Signup prints a recovery sheet whose
  primary QR encodes `https://<forum>/connect#k=<key>`. The key travels only in
  the URL **fragment**, so it is never sent to the server. The PWA reads
  `#k=<key>`, logs in locally, then immediately strips the fragment via
  `history.replaceState` so the key does not linger in browser history or get
  shared.
- **Device-key tear-off (ADR-099, gated OFF).** The recovery sheet also carries a
  tear-off device-key card for adding a second device, but this path is gated off
  in the DreamLab deployment (`DEVICE_KEYS_ENABLED=false`). Only the /connect
  magic-link onboarding is live.

A bearer key in a URL fragment is a deliberate security trade-off: it makes
cross-device onboarding a camera-scan with no typing and no server round-trip for
the secret, at the cost of the key being present in a URL — mitigated by the
fragment-only transport and immediate `replaceState` strip.

## Decision

Accept the upstream `/connect` magic-link onboarding (ADR-098) as the live
onboarding path for the DreamLab deployment, with the device-key tear-off
(ADR-099) gated off, on the following terms.

1. **/connect is the live onboarding path.** The bearer-key-in-fragment magic
   link is accepted for the DreamLab deployment. The accepted security posture:
   the key is transported in the URL **fragment only** (never sent to the
   server), is consumed by the PWA locally, and is stripped from the address bar
   via `history.replaceState` immediately after login. The residual risk —
   exposure if the full URL (including fragment) is captured before strip (shared
   screenshot of the QR target, a malicious fragment-reading extension) — is
   accepted as proportionate to the onboarding-friction reduction for this
   private, whitelist-gated community.

2. **Who can mint links.** A magic link grants login as the key it carries.
   Link/recovery-sheet minting is bounded to the signup flow and to operators —
   the same authority that controls whitelist/admission for this private forum
   (see the admin/cohort model in
   [ADR-033](033-multi-admin-moderation-architecture.md) and
   `forum-config/dreamlab.toml`). Minting is not a public, unauthenticated
   endpoint; a minted link is a credential and is treated as one.

3. **Device-key tear-off stays gated off.** `DEVICE_KEYS_ENABLED=false` for this
   deployment. Multi-device add via the tear-off card is **not** live. The
   architectural slot it occupies — individually-revocable per-device/per-agent
   keys — is the sanctioned delegation model
   ([ADR-036](036-agent-delegation-via-device-keys.md), upstream ADR-099), but it
   is not user-exercisable here until the gate flips. Flipping the gate is a
   future operator decision that MUST re-assess this ADR's security acceptance for
   the device-key path specifically.

4. **Recovery-sheet relationship.** The recovery sheet is the single artefact
   carrying both the live /connect QR and the (currently inert) device-key
   tear-off. It is the user's account-recovery credential: possession of the
   sheet is possession of the account. Users are onboarded with that
   understanding; the sheet is treated as sensitive material, not a convenience
   printout.

## Consequences

### Positive

- The deployed onboarding now has a recorded operator security acceptance, not
  just a mechanism reference — R4's documentation gap is fully closed at the
  decision level.
- Gating device keys off keeps the live attack surface to the single, understood
  /connect path; the device-key path is adopted in principle (ADR-036) without
  being exposed before its acceptance is re-assessed.
- The recovery-sheet-as-credential framing sets correct user expectations for a
  bearer-key model.

### Negative / Trade-offs

- Bearer-key-in-fragment is inherently weaker than a challenge-response or
  hardware-bound flow: anyone who captures the pre-strip URL holds the account.
  Accepted for this private, whitelist-gated community; would warrant
  re-assessment for a public deployment.
- With device keys gated off, multi-device use relies on re-running /connect per
  device (or re-using the recovery sheet), which is more friction than the
  tear-off would provide.

### Neutral

- No `forum-config/` code, gate value, or workflow is changed by this ADR — it
  records acceptance of the deployed state (`DEVICE_KEYS_ENABLED=false`, /connect
  live). Flipping the device-key gate is explicitly out of scope and triggers a
  re-assessment.

## Related Decisions

- [ADR-036](036-agent-delegation-via-device-keys.md): device keys as the
  sanctioned delegation model (the gated tear-off's destination).
- [ADR-033](033-multi-admin-moderation-architecture.md): admin/cohort authority
  that bounds who may mint links.
- `docs/prd/prd-ux-onboarding-v5.0.md`: superseded by ADR-098 (the journey this
  ADR accepts).

## References

- upstream `nostr-rust-forum` ADR-098 (/connect magic-link onboarding)
- upstream `nostr-rust-forum` ADR-099 (device keys)
- [docs/forum-onboarding.md §ADR-098](../forum-onboarding.md)
- [Forum overlay anomaly register, R4](../architecture/00-forum-overlay-anomaly-register.md)

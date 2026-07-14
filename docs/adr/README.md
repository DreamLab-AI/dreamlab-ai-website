# Architecture Decision Records

**Last updated:** 2026-07-14 | [Back to Documentation Index](../README.md)

This directory contains the Architecture Decision Records (ADRs) for the DreamLab community forum Rust port. ADRs 001--012 are historical (source files not present in this tree); ADRs 013--042 have full files in this directory.

> **Migration Complete (2026-03-12):** All 5 backend workers are Rust, now built from the upstream kit [github.com/DreamLab-AI/nostr-rust-forum](https://github.com/DreamLab-AI/nostr-rust-forum) (pinned in `forum-config/`) plus the `forum-config/` operator overlay. The Leptos forum client is at ~95% parity. SvelteKit `community-forum/` and TypeScript `workers/` directories have been deleted. ADRs written before 2026-03-12 may reference deleted paths — see status update notes on individual ADRs.

## Index

| ADR | Title | Status | File |
|-----|-------|--------|------|
| 001 | Nostr Protocol as Foundation | Accepted | historical |
| 002 | Three-Tier BBS Hierarchy | Accepted | historical |
| 003 | GCP Cloud Run Infrastructure | Superseded by 010 | historical |
| 004 | Zone-Based Access Control | Accepted | historical |
| 005 | NIP-44 Encryption Mandate | Accepted | historical |
| 006 | Client-Side WASM Search | Accepted | historical |
| 007 | SvelteKit + NDK Frontend | Superseded by 013 | historical |
| 008 | PostgreSQL Relay Storage | Superseded by 010 | historical |
| 009 | User Registration Flow | Accepted | historical |
| 010 | Return to Cloudflare Platform | Accepted | historical |
| 011 | Images to Solid Pods | Accepted | historical |
| 012 | Hardening Sprint | Accepted | historical |
| 013 | [Rust/Leptos 0.7 as Forum UI Framework](013-rust-leptos-forum-framework.md) | Accepted | present |
| 014 | [Hybrid Validation Phase Before Full Rewrite](014-hybrid-validation-phase.md) | Accepted (superseded by full port) | present |
| 015 | [Selective Workers Port Strategy (3 Rust, 2 TypeScript)](015-workers-port-strategy.md) | Accepted (superseded — all 5 now Rust) | present |
| 016 | [nostr-sdk 0.44.x as Nostr Protocol Layer](016-nostr-sdk-protocol-layer.md) | Accepted | present |
| 017 | [passkey-rs for WebAuthn/FIDO2 with PRF Extension](017-passkey-rs-webauthn-prf.md) | Accepted | present |
| 018 | [Testing Strategy for Rust Port](018-testing-strategy-rust-port.md) | Accepted | present |
| 019 | [Versioned Planning Governance and Tranche-Based Delivery](019-plan-governance-and-delivery-structure.md) | Accepted | present |
| 020 | [WebGPU Rendering with Progressive Fallback](020-webgpu-fallback-rendering.md) | Accepted | present |
| 021 | [Offline-First Architecture with IndexedDB](021-offline-first-indexeddb.md) | Accepted | present |
| 022 | [NIP-29 Group-Based Access Control Model](022-nip29-group-access-model.md) | Accepted | present |
| 023 | [Forum Relay Layer Hardening](023-forum-relay-hardening.md) | Accepted | present |
| 024 | [Security Hardening Sprint](024-security-hardening-sprint.md) | Accepted | present |
| 025 | [Solid Pod Infrastructure Upgrade](025-solid-pod-infrastructure-upgrade.md) | Accepted | present |
| 026 | [Forum Professionalisation](026-forum-professionalisation.md) | Accepted | present |
| 027 | [Canonical Identity Stack](027-canonical-identity-stack.md) | Deferred (kit-owned — code targets deleted in-tree port; DID-doc shape superseded by ADR-125) | present |
| 028 | [Solid Pod RS AGPL Boundary](028-solid-pod-rs-agpl-boundary.md) | Accepted | present |
| 029 | [JSON-LD Processing Strategy](029-json-ld-processing-strategy.md) | Deferred (kit-owned — RDF/JSON-LD stack is a kit decision; absent from overlay) | present |
| 030 | [Authentication Signer Abstraction](030-authentication-signer-abstraction.md) | Deferred (kit-owned — signer surface is kit-internal) | present |
| 031 | [DM Protocol Standardisation](031-dm-protocol-standardisation.md) | Proposed (partial — kind-1059 federated; NIP-04 fix/p_tag index/10050 not overlay-verifiable) | present |
| 032 | [Agent Job Marketplace (NIP-90)](032-agent-job-marketplace-nip90.md) | Superseded by 036 | present |
| 033 | [Multi-Admin Moderation Architecture](033-multi-admin-moderation-architecture.md) | Accepted (outcome shipped via kit; §2 d-tag mechanism moot) | present |
| 034 | [Nostr Relay NIP Conformance](034-nostr-relay-nip-conformance.md) | Deferred (kit-owned — relay NIP conformance is kit-internal; not overlay-verifiable) | present |
| 035 | [AGPL Combined-Work Licensing Posture](035-agpl-combined-work-licensing.md) | Accepted | present |
| 036 | [Agent Delegation via Device Keys](036-agent-delegation-via-device-keys.md) | Accepted (supersedes 032) | present |
| 037 | [Config Single Source of Truth](037-config-single-source-of-truth.md) | Accepted (partial — O3 fail-closed KV guard shipped; O1/O2 single-source generator deferred) | present |
| 038 | [Kit-Ref Pin Governance](038-kit-ref-pin-governance.md) | Accepted | present |
| 039 | [/connect Onboarding Adoption](039-connect-onboarding-adoption.md) | Accepted | present |
| 040 | [Gap-Close Edge Decisions](040-gap-close-edge-decisions.md) | Proposed | present |
| 041 | [Anonymous Contact-DM Ingress (Client-Side Gift-Wrap Publish to the Admin Recipient)](041-anonymous-contact-dm-ingress.md) | Proposed | present |
| 042 | [Website Agent Chat Routing ("Talk to AI" as a Nostr DM Conversation with junkiejarvis)](042-website-agent-chat-routing.md) | Proposed | present |

> **Note:** ADR-032 (Agent Job Marketplace, NIP-90 DVMs + NIP-26) is **superseded by [ADR-036](036-agent-delegation-via-device-keys.md)** — the kit removed `nip26.rs`+`nip90.rs` upstream, and agent delegation now uses the device-key model (upstream ADR-099). The Agent Control Surface governance feature (kinds 31400-31405, `/governance` route) stands on the deployed kit, not on ADR-032's NIP-90 design. See [forum-config/README.md](../../forum-config/README.md#governance-configuration) for the operator config.
>
> **Adjudication note (2026-06-11, closed out 2026-07-03):** ADRs 027, 029, 030, 031, 034 were written against the in-tree `community-forum-rs` port deleted on 2026-03-12. Their literal code targets no longer exist; the forum now runs the upstream `nostr-rust-forum` kit. **Closeout disposition (2026-07-03):** 027/029/030/034 are marked **Deferred (kit-owned)** — the capability is now an upstream-kit concern and each carries an explicit unfreeze criterion in its file, so the register no longer shows them as an open in-overlay backlog. ADR-031 remains **Proposed (partial)** because part of it (kind-1059 federation) is live in the overlay while the remainder is not overlay-verifiable. ADR-033's *outcome* shipped via the kit's relational moderation tables (`moderation_actions`, `is_admin`, `admin_log`, `nip1984_reports`), so it is Accepted with its §2 d-tag mechanism noted moot.

## Supersession Chain

```mermaid
graph LR
    ADR003["ADR-003<br/>GCP Cloud Run"] -->|superseded by| ADR010["ADR-010<br/>Cloudflare Platform"]
    ADR007["ADR-007<br/>SvelteKit + NDK"] -->|superseded by| ADR013["ADR-013<br/>Rust/Leptos 0.7"]
    ADR008["ADR-008<br/>PostgreSQL Relay"] -->|superseded by| ADR010
    ADR015["ADR-015<br/>3 Rust, 2 TS Workers"] -->|superseded by<br/>full migration| ADR015N["All 5 Workers Rust<br/>(2026-03-12)"]
    ADR032["ADR-032<br/>NIP-90 + NIP-26<br/>marketplace"] -->|superseded by<br/>kit removed nip26/nip90| ADR036["ADR-036<br/>Device-Key Delegation<br/>(upstream ADR-099)"]

    style ADR003 fill:#f9d6d6,stroke:#c0392b
    style ADR007 fill:#f9d6d6,stroke:#c0392b
    style ADR008 fill:#f9d6d6,stroke:#c0392b
    style ADR015 fill:#f9d6d6,stroke:#c0392b
    style ADR032 fill:#f9d6d6,stroke:#c0392b
    style ADR010 fill:#d5f5e3,stroke:#27ae60
    style ADR013 fill:#d5f5e3,stroke:#27ae60
    style ADR015N fill:#d5f5e3,stroke:#27ae60
    style ADR036 fill:#d5f5e3,stroke:#27ae60
```

## ADR Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Proposed : Author drafts ADR
    Proposed --> Accepted : Team review + consensus
    Proposed --> Rejected : Does not meet criteria
    Proposed --> Deferred : Parked with unfreeze criteria
    Deferred --> Accepted : Unfreeze criteria met
    Deferred --> Superseded : Replaced before unfreeze
    Accepted --> Superseded : New ADR replaces
    Accepted --> Deprecated : No longer relevant
    Superseded --> [*]
    Deprecated --> [*]
    Rejected --> [*]
```

## Conventions

- ADRs use sequential numbering (zero-padded to 3 digits).
- Status values: `Proposed`, `Accepted`, `Deferred`, `Superseded`, `Deprecated`, `Rejected`. `Deferred (kit-owned)` marks a decision whose realising code targeted the deleted in-tree port and is now an upstream-kit concern; each carries an explicit unfreeze criterion.
- Each ADR follows the format: Title, Status, Context, Decision, Consequences.
- Consequences are categorized as Positive, Negative, and Neutral.
- ADRs are immutable once accepted; new ADRs supersede old ones rather than editing.

## Related Documents

- [Documentation Index](../README.md)
- [PRD: Rust Port v2.0.0](../prd/prd-rust-port.md)
- [PRD: Rust Port v2.1.0](../prd/prd-rust-port-v2.1.md)
- [DDD Overview](../ddd/README.md)
- [Deployment Overview](../deployment/README.md)

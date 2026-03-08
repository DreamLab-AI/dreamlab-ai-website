# Architecture Decision Records

This directory contains the Architecture Decision Records (ADRs) for the DreamLab
AI community forum project.

> Note: this repository snapshot currently includes ADR files 013-019. Earlier
> ADR numbers are retained in the sequence as historical references, but their
> source files are not present in this docs tree.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| 001 | Nostr Protocol as Foundation | Accepted |
| 002 | Three-Tier BBS Hierarchy | Accepted |
| 003 | GCP Cloud Run Infrastructure | Superseded by 010 |
| 004 | Zone-Based Access Control | Accepted |
| 005 | NIP-44 Encryption Mandate | Accepted |
| 006 | Client-Side WASM Search | Accepted |
| 007 | SvelteKit + NDK Frontend | Superseded by 013 |
| 008 | PostgreSQL Relay Storage | Superseded by 010 |
| 009 | User Registration Flow | Accepted |
| 010 | Return to Cloudflare Platform | Accepted |
| 011 | Images to Solid Pods | Accepted |
| 012 | Hardening Sprint | Accepted |
| [013](013-rust-leptos-forum-framework.md) | Rust/Leptos 0.7 as Forum UI Framework | Accepted |
| [014](014-hybrid-validation-phase.md) | Hybrid Validation Phase Before Full Rewrite | Accepted |
| [015](015-workers-port-strategy.md) | Selective Workers Port Strategy (3 Rust, 2 TypeScript) | Accepted |
| [016](016-nostr-sdk-protocol-layer.md) | nostr-sdk 0.44.x as Nostr Protocol Layer | Accepted |
| [017](017-passkey-rs-webauthn-prf.md) | passkey-rs for WebAuthn/FIDO2 with PRF Extension | Accepted |
| [018](018-testing-strategy-rust-port.md) | Testing Strategy for Rust Port | Accepted |
| [019](019-plan-governance-and-delivery-structure.md) | Versioned Planning Governance and Tranche-Based Delivery | Proposed |

## Supersession Chain

- ADR-003 (GCP Cloud Run) -> ADR-010 (Cloudflare Platform)
- ADR-007 (SvelteKit + NDK) -> ADR-013 (Rust/Leptos 0.7)
- ADR-008 (PostgreSQL Relay Storage) -> ADR-010 (Cloudflare D1)

## Conventions

- ADRs use sequential numbering (zero-padded to 3 digits)
- Status values: `Proposed`, `Accepted`, `Superseded`, `Deprecated`
- Each ADR follows the format: Title, Status, Context, Decision, Consequences
- Consequences are categorized as Positive, Negative, and Neutral
- ADRs are immutable once accepted; new ADRs supersede old ones rather than editing

## Related Documents

- [PRD: Rust Port v2.0.0](../prd-rust-port.md)
- [PRD: Rust Port v2.1.0](../prd-rust-port-v2.1.md)
- [DDD Overview](../ddd/README.md)
- [Deployment Overview](../deployment/README.md)

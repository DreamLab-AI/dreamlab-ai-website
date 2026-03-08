# DreamLab AI — Rust Port Documentation

**Documentation Set:** 2026-03-08 | **Branch:** `rust-version`

Documentation for the DreamLab community forum Rust port. The React main site (`src/`) is excluded from this port.

## Planning and Governance

| Document | Status | Description |
|----------|--------|-------------|
| [PRD: Rust Port v2.0.0](prd-rust-port.md) | Accepted baseline | Current accepted architecture and execution baseline |
| [PRD: Rust Port v2.1.0](prd-rust-port-v2.1.md) | Proposed refinement | Refactored delivery model with tranche-based execution, stronger governance, and clearer stop/go gates |

## Architecture Decision Records (19 tracked)

| ADR | Title | Status |
|-----|-------|--------|
| [001](adr/README.md) | Nostr Protocol as Foundation | Accepted |
| [002](adr/README.md) | Three-Tier BBS Hierarchy | Accepted |
| [003](adr/README.md) | GCP Cloud Run Infrastructure | Superseded by 010 |
| [004](adr/README.md) | Zone-Based Access Control | Accepted |
| [005](adr/README.md) | NIP-44 Encryption Mandate | Accepted |
| [006](adr/README.md) | Client-Side WASM Search | Accepted |
| [007](adr/README.md) | SvelteKit + NDK Frontend | Superseded by 013 |
| [008](adr/README.md) | PostgreSQL Relay Storage | Superseded by 010 |
| [009](adr/README.md) | User Registration Flow | Resolved |
| [010](adr/README.md) | Return to Cloudflare Platform | Accepted |
| [011](adr/README.md) | Images to Solid Pods | Accepted |
| [012](adr/README.md) | Hardening Sprint | Accepted |
| [013](adr/013-rust-leptos-forum-framework.md) | Rust/Leptos as Forum Framework | Accepted |
| [014](adr/014-hybrid-validation-phase.md) | Hybrid Validation Phase | Accepted |
| [015](adr/015-workers-port-strategy.md) | Workers Port Strategy (3 Rust, 2 TS) | Accepted |
| [016](adr/016-nostr-sdk-protocol-layer.md) | nostr-sdk 0.44 Protocol Layer | Accepted |
| [017](adr/017-passkey-rs-webauthn-prf.md) | passkey-rs for WebAuthn PRF | Accepted |
| [018](adr/018-testing-strategy-rust-port.md) | Testing Strategy | Accepted |
| [019](adr/019-plan-governance-and-delivery-structure.md) | Versioned Planning Governance and Tranche-Based Delivery | Accepted |

## Domain-Driven Design

The current DDD set remains aligned to the accepted baseline in [PRD v2.0.0](prd-rust-port.md). The proposed refinement in [PRD v2.1.0](prd-rust-port-v2.1.md) and [ADR-019](adr/019-plan-governance-and-delivery-structure.md) is planning/governance focused and should only drive DDD updates after acceptance.

| Document | Description |
|----------|-------------|
| [Domain Model](ddd/01-domain-model.md) | Core entities with Rust type definitions |
| [Bounded Contexts](ddd/02-bounded-contexts.md) | Crate-to-context mapping (7 contexts) |
| [Aggregates](ddd/03-aggregates.md) | 5 aggregate roots with invariants |
| [Domain Events](ddd/04-domain-events.md) | Nostr event kinds + application events |
| [Value Objects](ddd/05-value-objects.md) | Immutable types with validation |
| [Ubiquitous Language](ddd/06-ubiquitous-language.md) | Terminology glossary (50+ terms) |

## API Reference

| Document | Description |
|----------|-------------|
| [Auth API](api/AUTH_API.md) | WebAuthn + NIP-98 endpoints (Rust Worker) |
| [Pod API](api/POD_API.md) | Solid pod storage + WAC ACL (Rust Worker) |
| [Nostr Relay](api/NOSTR_RELAY.md) | WebSocket NIP-01 relay (TypeScript Worker) |
| [Search API](api/SEARCH_API.md) | RVF WASM vector search (TypeScript Worker) |

## Security

| Document | Description |
|----------|-------------|
| [Security Overview](security/SECURITY_OVERVIEW.md) | Compile-time safety, crypto stack, access control |
| [Authentication](security/AUTHENTICATION.md) | Passkey PRF flow, NIP-98, session management |

## Deployment

| Document | Description |
|----------|-------------|
| [Deployment Overview](deployment/README.md) | CI/CD, environments, DNS |
| [Cloudflare Workers](deployment/CLOUDFLARE_WORKERS.md) | Rust + TS Worker builds, resources, secrets |

## Developer

| Document | Description |
|----------|-------------|
| [Getting Started](developer/GETTING_STARTED.md) | Prerequisites, setup, local development |
| [Rust Style Guide](developer/RUST_STYLE_GUIDE.md) | Coding standards, error handling, module organization |

---

**Total files in this docs tree:** 28 | **Accepted baseline:** v2.0.0 | **Proposed refinement:** v2.1.0 | **Repository:** [DreamLab-AI/dreamlab-ai-website](https://github.com/DreamLab-AI/dreamlab-ai-website)

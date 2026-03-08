# DreamLab Community Forum -- Domain-Driven Design

Domain-Driven Design documentation for the Rust port of the DreamLab community
forum. These documents define the domain model, bounded contexts, aggregates,
events, value objects, and shared vocabulary used across the 5-crate Rust
workspace (`nostr-core`, `forum-client`, `auth-worker`, `pod-worker`,
`preview-worker`).

For the accepted architecture baseline, see the
[Rust Port PRD v2.0.0](../prd-rust-port.md).

> Alignment note: The current DDD set reflects the accepted v2.0.0 plan. The
> proposed planning refinement in [PRD v2.1.0](../prd-rust-port-v2.1.md) and
> [ADR-019](../adr/019-plan-governance-and-delivery-structure.md) is focused on
> delivery structure and documentation governance. These domain documents should
> only be updated after the revised plan is accepted and any architecture
> changes are formalized through ADRs.

## Documents

| Document | Description |
|----------|-------------|
| [01 - Domain Model](01-domain-model.md) | Core entities: identity (keypairs, DIDs), authentication (passkeys, NIP-98), community (channels, sections, cohorts), messaging (events, DMs, reactions), content (posts, profiles, calendar), and storage (pods, media, ACL). Includes Rust type definitions for each entity. |
| [02 - Bounded Contexts](02-bounded-contexts.md) | Maps each bounded context to a Rust crate or TypeScript Worker. Defines responsibilities, public module structure, dependencies, and the anti-corruption layer between `nostr-sdk` alpha APIs and stable DreamLab types. |
| [03 - Aggregates](03-aggregates.md) | Five aggregate roots: UserIdentity (keypair + credentials + permissions), Channel (messages + members + join requests), Conversation (encrypted DMs), ForumThread (posts + replies + reactions), and Pod (media + ACL). Documents invariants and commands for each. |
| [04 - Domain Events](04-domain-events.md) | Distinguishes Nostr protocol events (kind-typed signed data) from application-level domain events (state transitions). Includes the event kind registry, event flow diagrams for publishing, receiving, NIP-98 auth, and NIP-44 encryption. |
| [05 - Value Objects](05-value-objects.md) | Immutable types: EventId (SHA-256), PublicKey (32-byte hex), Signature (Schnorr BIP-340), Timestamp (Unix seconds), RoleId enum, ChannelVisibility enum, Nip44Ciphertext, GiftWrap, RelayUrl, Tag, SectionId, CategoryId. Full Rust implementations with constructors and validation. |
| [06 - Ubiquitous Language](06-ubiquitous-language.md) | Glossary of all terms used in the project: Nostr protocol (event, kind, NIP, relay), DreamLab forum (cohort, zone, section, pod, whitelist), authentication (passkey, PRF, HKDF, NIP-98), and Rust/Leptos (signal, resource, memo, component, trunk). |

## Architecture Overview

```
nostr-core (shared library)
    |
    +-- forum-client (Leptos WASM, browser)
    |       |
    |       +-- WebSocket --> nostr-relay (TypeScript, unchanged)
    |       +-- HTTP ------> auth-worker (Rust CF Worker)
    |       +-- HTTP ------> pod-worker (Rust CF Worker)
    |       +-- HTTP ------> preview-worker (Rust CF Worker)
    |       +-- HTTP ------> search-api (TypeScript, unchanged)
    |
    +-- auth-worker
    +-- pod-worker
    +-- preview-worker
```

## Crate-to-Context Mapping

| Crate | Bounded Context | Target |
|-------|----------------|--------|
| `nostr-core` | Nostr Core | wasm32 + native |
| `forum-client` | Forum Client | wasm32 only |
| `auth-worker` | Identity and Auth | CF Worker (wasm32) |
| `pod-worker` | Storage | CF Worker (wasm32) |
| `preview-worker` | Preview | CF Worker (wasm32) |
| `workers/nostr-relay/` (TS) | Relay | CF Worker (JS) |
| `workers/search-api/` (TS) | Search | CF Worker (JS) |

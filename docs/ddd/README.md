# DreamLab Community Forum -- Domain-Driven Design

**Last updated:** 2026-04-20 | [Back to Documentation Index](../README.md)

Domain-Driven Design documentation for the Rust port of the DreamLab community forum. These documents define the domain model, bounded contexts, aggregates, events, value objects, and shared vocabulary used across the 8-crate Rust workspace (`nostr-core`, `forum-client`, `auth-worker`, `pod-worker`, `preview-worker`, `relay-worker`, `search-worker`, `admin-cli`).

The 2026-04 Obelisk-Polish sprint added moderation (kinds 30910-30914), WoT gating, invite credits, welcome bot, and the `admin-cli` crate. See the [sprint spec](../sprint/2026-04-obelisk-polish-sprint.md).

## Documents

| Document | Description |
|----------|-------------|
| [01 - Domain Model](01-domain-model.md) | Core entities: identity, authentication, community, messaging, content, storage. Rust type definitions for each. |
| [02 - Bounded Contexts](02-bounded-contexts.md) | Maps 7 bounded contexts to crates/Workers. Defines responsibilities, public modules, dependencies, and the anti-corruption layer. |
| [03 - Aggregates](03-aggregates.md) | Five aggregate roots: UserIdentity, Channel, Conversation, ForumThread, Pod. Invariants and commands for each. |
| [04 - Domain Events](04-domain-events.md) | Nostr protocol events (kind-typed signed data) and application-level domain events (state transitions). Event flow diagrams and NIP-59 gift wrap flow. |
| [05 - Value Objects](05-value-objects.md) | Immutable types: EventId, PublicKey, Signature, Timestamp, RoleId, ChannelVisibility, Nip44Ciphertext, GiftWrap, RelayUrl, Tag, SectionId, CategoryId. |
| [06 - Ubiquitous Language](06-ubiquitous-language.md) | Glossary of 60+ terms organized by domain area: Nostr protocol, DreamLab forum, authentication, Rust/Leptos. |

## Architecture Overview

```mermaid
graph TB
    NC["nostr-core<br/>(shared library)"]

    FC["forum-client<br/>(Leptos WASM, browser)"]
    AW["auth-worker<br/>(Rust CF Worker)"]
    PW["pod-worker<br/>(Rust CF Worker)"]
    PV["preview-worker<br/>(Rust CF Worker)"]
    RW["relay-worker<br/>(Rust CF Worker)"]
    SW["search-worker<br/>(Rust CF Worker)"]

    NC --> FC
    NC --> AW
    NC --> PW
    NC --> RW
    NC --> SW

    FC -->|"WebSocket<br/>(NIP-01/42)"| RW
    FC -->|"HTTP + NIP-98"| AW
    FC -->|"HTTP + NIP-98"| PW
    FC -->|"HTTP"| PV
    FC -->|"HTTP"| SW

    style NC fill:#3498db,color:#fff
    style FC fill:#2ecc71,color:#fff
    style AW fill:#e67e22,color:#fff
    style PW fill:#e67e22,color:#fff
    style PV fill:#e67e22,color:#fff
    style RW fill:#e67e22,color:#fff
    style SW fill:#e67e22,color:#fff
```

## Bounded Context Map

```mermaid
graph LR
    subgraph "Shared Kernel"
        NC["nostr-core"]
    end

    subgraph "Client"
        FC["forum-client"]
    end

    subgraph "Rust Workers"
        AW["auth-worker"]
        PW["pod-worker"]
        PV["preview-worker"]
        RW["relay-worker"]
        SW["search-worker"]
    end

    NC -.->|"Cargo dep"| FC
    NC -.->|"Cargo dep"| AW
    NC -.->|"Cargo dep"| PW
    NC -.->|"Cargo dep"| RW
    NC -.->|"Cargo dep"| SW
    FC -->|"HTTP + NIP-98"| AW
    FC -->|"HTTP + NIP-98"| PW
    FC -->|"HTTP"| PV
    FC -->|"WebSocket"| RW
    FC -->|"HTTP"| SW
    AW -->|"Pod provisioning"| PW
```

## Crate-to-Context Mapping

| Crate | Bounded Context | Target | Language |
|-------|----------------|--------|----------|
| `nostr-core` | Nostr Core (+ moderation event kinds 30910-30914) | wasm32 + native | Rust |
| `forum-client` | Forum Client | wasm32 only | Rust |
| `auth-worker` | Identity, Auth, Moderation, WoT, Invites, Welcome Bot | CF Worker (wasm32) | Rust |
| `pod-worker` | Storage | CF Worker (wasm32) | Rust |
| `preview-worker` | Preview | CF Worker (wasm32) | Rust |
| `relay-worker` | Relay (+ ingress mute/ban enforcement) | CF Worker (wasm32) | Rust |
| `search-worker` | Search | CF Worker (wasm32) | Rust |
| `admin-cli` | Operator Tooling (headless NIP-98 client) | native binary | Rust |

## Related Documents

- [Documentation Index](../README.md)
- [ADR Index](../adr/README.md)
- [PRD: Rust Port v2.0.0](../prd-rust-port.md)
- [Getting Started](../developer/GETTING_STARTED.md)

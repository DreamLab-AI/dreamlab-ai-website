# ADR-013: Rust/Leptos 0.7 as Forum UI Framework

| Field     | Value                          |
|-----------|--------------------------------|
| Status    | Accepted                       |
| Date      | 2026-03-08                     |
| Deciders  | DreamLab Engineering           |
| Supersedes| ADR-007 (SvelteKit + NDK)      |

## Context

The DreamLab community forum is currently built with SvelteKit 2.49 and NDK 2.13,
comprising 68,037 lines across 257 files. This codebase suffers from measurable
performance bottlenecks:

- NIP-44 encryption blocks the main thread (2-5ms per operation via `crypto.subtle`)
- V8 GC spikes of 50-200ms when parsing thousands of Nostr JSON events
- ~400 bytes per-event object overhead due to NDK's hidden class model (4MB wasted at 10K events)
- 32 Svelte stores with circular reactive dependencies (channels.ts alone has cyclomatic complexity >50)

A 4-agent parallel crate ecosystem survey (2026-03-08) evaluated three Rust WASM
UI frameworks for the forum rewrite: Leptos, Dioxus, and Yew.

### Framework Comparison

| Criterion           | Leptos 0.7         | Dioxus 0.6        | Yew 0.21           |
|---------------------|--------------------|-------------------|---------------------|
| GitHub stars        | 20,333             | 35,000            | 30,000              |
| Reactivity model    | Fine-grained signals (no VDOM) | VDOM + RSX | VDOM + macro components |
| WASM binary size    | Smallest of the three | Moderate          | Largest              |
| Forum proof-of-concept | lemmy-ui-leptos (134 stars, Lemmy backend) | None | None |
| Open issues         | ~200               | 661               | ~300                |
| SSR/CSR             | Both               | Both              | CSR focus            |
| Signal API          | `Signal<T>` (0.7 unified) | `use_signal` hooks | `use_state` hooks |
| Syntax familiarity  | Mirrors Svelte/React | React-like (JSX)  | React-like           |
| Community health    | Active, 0.7 stable | Active but issue backlog | Declining contributor count |

### Key Factor: lemmy-ui-leptos

The Lemmy project (14,000 stars) is actively rewriting its frontend from Inferno.js
to Leptos. The `lemmy-ui-leptos` crate (134 stars) proves that Leptos can handle a
production forum with: route-based code splitting, reactive comment threads, real-time
WebSocket updates, and Markdown rendering. This is the closest architectural analog
to DreamLab's forum.

## Decision

Use Leptos 0.7.x as the UI framework for the DreamLab community forum Rust port.
The forum-client crate will compile to WASM via `trunk` and run as a CSR (client-side
rendered) single-page application.

Key technical choices within this decision:

1. **CSR-only mode**: The forum requires client-side crypto (passkey PRF, NIP-44
   encryption, Schnorr signing). SSR would expose private key material in server
   memory. Leptos supports CSR-only via trunk.

2. **Signal<T> API**: Use Leptos 0.7's unified `Signal<T>` exclusively (not the
   deprecated `ReadSignal`/`WriteSignal` split from 0.6).

3. **Tailwind + DaisyUI**: Retain the existing CSS framework. Configure
   `tailwind.config.js` to scan `crates/**/*.rs` instead of `*.svelte`.

4. **Component structure**: Port all 102 Svelte components to Leptos `#[component]`
   functions, organized in the same groups: UI primitives (20), navigation (8),
   chat (15), auth (8), admin (10), forum (12), DM (8), calendar (6), user (8),
   sections/zones (7).

5. **Build tooling**: Use `trunk serve` for development and `trunk build --release`
   for production. `wasm-pack` was archived July 2025 and is not viable.

## Consequences

### Positive

- **Zero GC pauses**: Rust/WASM linear memory eliminates V8 garbage collection
  spikes. 10K event parsing drops from 150-300ms+GC to <20ms.
- **Smallest WASM binary**: Leptos produces the smallest output of the evaluated
  frameworks, targeting <2MB gzipped for the forum client.
- **Fine-grained reactivity**: Leptos signals update only affected DOM nodes (no
  VDOM diffing), which maps well to replacing Svelte's reactive stores.
- **Forum proof**: lemmy-ui-leptos validates the architecture for forum workloads.
- **Shared code**: The `nostr-core` crate compiles for both WASM (client) and
  Workers targets, eliminating the current code duplication between SvelteKit and
  `workers/shared/`.
- **Type safety**: Rust's type system catches at compile time what TypeScript misses
  (e.g., the `as ChannelSection` casts that hide bugs in the current codebase).

### Negative

- **Ecosystem maturity**: Leptos 0.7 is newer than React/Svelte. Some browser API
  bindings require manual `web-sys` calls rather than ready-made crate utilities.
- **Team learning curve**: Rust ownership/borrowing has a steeper learning curve
  than TypeScript. Phase 0-1 includes ramp-up time.
- **Smaller component library ecosystem**: No direct equivalent to shadcn/ui.
  RustForWeb/shadcn-ui (222 stars) exists but is less mature. UI primitives must
  be ported manually.
- **Debugging complexity**: WASM debugging tools are less mature than browser
  DevTools for JavaScript. `console_error_panic_hook` and `tracing-wasm` partially
  mitigate this.
- **First-of-kind risk**: No production Rust/WASM Nostr client UI exists. DreamLab
  will be the first. Phase 1 hybrid validation mitigates this risk (see ADR-014).

### Neutral

- **CSS unchanged**: Tailwind + DaisyUI are CSS-only and framework-agnostic. The
  migration only changes which files Tailwind scans for class usage.
- **E2E testing unchanged**: Playwright tests remain in JavaScript and interact
  with the rendered DOM regardless of framework.
- **Deployment unchanged**: GitHub Pages serves static files. WASM output from
  trunk replaces SvelteKit's static adapter output.

## References

- [PRD: DreamLab Forum Rust Port v2.0.0](../prd-rust-port.md)
- [Leptos Book](https://book.leptos.dev/)
- [lemmy-ui-leptos](https://github.com/LemmyNet/lemmy-ui-leptos) (134 stars)
- [Leptos 0.7 release notes](https://github.com/leptos-rs/leptos/releases)
- [RustForWeb/shadcn-ui](https://github.com/RustForWeb/shadcn-ui) (222 stars)
- ADR-007: SvelteKit + NDK Frontend (superseded by this ADR)

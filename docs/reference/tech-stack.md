# Technology Reference

Last updated: 2026-03-01

Complete technology inventory for the DreamLab AI platform, covering the main website, community forum, and backend services.

---

## Main site frontend

### Core framework

| Dependency | Version | Purpose |
|-----------|---------|---------|
| react | 18.3 | UI component library |
| react-dom | 18.3 | React DOM renderer |
| react-router-dom | 6.26 | Client-side routing (lazy-loaded routes) |
| typescript | 5.9 | Type-safe JavaScript (strict mode disabled) |

### Build tooling

| Dependency | Version | Purpose |
|-----------|---------|---------|
| vite | 5.4 | Build tool and development server |
| @vitejs/plugin-react-swc | 3.11 | React Fast Refresh via SWC compiler |
| terser | 5.46 | JavaScript minifier (available but esbuild used by default) |
| autoprefixer | 10.4 | CSS vendor prefixing |
| postcss | 8.5 | CSS processing pipeline |

### Styling

| Dependency | Version | Purpose |
|-----------|---------|---------|
| tailwindcss | 3.4 | Utility-first CSS framework |
| tailwindcss-animate | 1.0 | Animation utilities for Tailwind |
| @tailwindcss/typography | 0.5 | Prose styling for rendered markdown |
| tailwind-merge | 2.5 | Intelligent Tailwind class merging |
| clsx | 2.1 | Conditional class string construction |
| class-variance-authority | 0.7 | Component variant definitions (CVA) |

### UI components (shadcn/ui + Radix)

All Radix UI primitives are used through shadcn/ui wrappers in `src/components/ui/`.

| Dependency | Purpose |
|-----------|---------|
| @radix-ui/react-accordion | Collapsible content sections |
| @radix-ui/react-alert-dialog | Confirmation dialogs |
| @radix-ui/react-aspect-ratio | Aspect ratio containers |
| @radix-ui/react-avatar | User avatars |
| @radix-ui/react-checkbox | Checkbox inputs |
| @radix-ui/react-collapsible | Collapsible panels |
| @radix-ui/react-context-menu | Right-click context menus |
| @radix-ui/react-dialog | Modal dialogs |
| @radix-ui/react-dropdown-menu | Dropdown menus |
| @radix-ui/react-hover-card | Hover-triggered cards |
| @radix-ui/react-label | Form labels |
| @radix-ui/react-menubar | Menu bars |
| @radix-ui/react-navigation-menu | Navigation menus |
| @radix-ui/react-popover | Popover panels |
| @radix-ui/react-progress | Progress indicators |
| @radix-ui/react-radio-group | Radio button groups |
| @radix-ui/react-scroll-area | Custom scrollbars |
| @radix-ui/react-select | Select dropdowns |
| @radix-ui/react-separator | Visual separators |
| @radix-ui/react-slider | Range sliders |
| @radix-ui/react-slot | Slot composition |
| @radix-ui/react-switch | Toggle switches |
| @radix-ui/react-tabs | Tabbed interfaces |
| @radix-ui/react-toast | Toast notifications |
| @radix-ui/react-toggle | Toggle buttons |
| @radix-ui/react-toggle-group | Toggle button groups |
| @radix-ui/react-tooltip | Tooltips |

### Data and state

| Dependency | Version | Purpose |
|-----------|---------|---------|
| @tanstack/react-query | 5.90 | Server state management and data fetching |
| @supabase/supabase-js | 2.95 | Supabase client (PostgreSQL, Auth, Realtime) |
| react-hook-form | 7.71 | Form state management |
| @hookform/resolvers | 3.9 | Schema validation resolvers for react-hook-form |
| zod | 3.23 | Schema validation library |

### 3D graphics

| Dependency | Version | Purpose |
|-----------|---------|---------|
| three | 0.156 | 3D rendering engine |
| @react-three/fiber | 8.18 | React reconciler for Three.js |
| @react-three/drei | 9.122 | Utility helpers for React Three Fiber |

### Content and visualisation

| Dependency | Version | Purpose |
|-----------|---------|---------|
| react-markdown | 10.1 | Markdown rendering in React |
| remark-gfm | 4.0 | GitHub Flavoured Markdown support |
| mermaid | 11.12 | Diagram rendering from text |
| recharts | 2.12 | Chart and graph library |
| dompurify | 3.3 | HTML sanitisation |
| @types/dompurify | 3.2 | TypeScript types for DOMPurify |
| yaml | 2.8 | YAML parsing |

### UI extras

| Dependency | Version | Purpose |
|-----------|---------|---------|
| lucide-react | 0.563 | Icon library |
| cmdk | 1.1 | Command palette component |
| date-fns | 3.6 | Date utility library |
| embla-carousel-react | 8.6 | Carousel component |
| input-otp | 1.4 | One-time password input |
| next-themes | 0.3 | Theme switching (dark mode) |
| react-day-picker | 8.10 | Date picker component |
| react-resizable-panels | 2.1 | Resizable panel layout |
| sonner | 1.5 | Toast notification component |
| vaul | 0.9 | Drawer component |

### Nostr

| Dependency | Version | Purpose |
|-----------|---------|---------|
| @nostr-dev-kit/ndk | 3.0 | Nostr Development Kit (main site) |
| nostr-tools | 2.23 | Low-level Nostr protocol utilities |

### Linting

| Dependency | Version | Purpose |
|-----------|---------|---------|
| eslint | 9.9 | JavaScript/TypeScript linter |
| @eslint/js | 9.9 | ESLint core recommended rules |
| typescript-eslint | 8.55 | TypeScript ESLint integration |
| eslint-plugin-react-hooks | 5.1 | React hooks linting rules |
| eslint-plugin-react-refresh | 0.4 | React Fast Refresh compatibility |
| globals | 15.9 | Global variable definitions for ESLint |

### Other dev dependencies

| Dependency | Version | Purpose |
|-----------|---------|---------|
| @types/react | 18.3 | React type definitions |
| @types/react-dom | 18.3 | ReactDOM type definitions |
| @types/node | 25.2 | Node.js type definitions |
| lovable-tagger | 1.1 | Build tagging (Lovable platform) |

---

## Community forum

### Core framework

| Dependency | Version | Purpose |
|-----------|---------|---------|
| @sveltejs/kit | 2.49 | SvelteKit application framework |
| svelte | (peer) | Reactive component framework |
| vite | (peer) | Build tool (via SvelteKit) |

### Nostr and cryptography

| Dependency | Version | Purpose |
|-----------|---------|---------|
| @nostr-dev-kit/ndk | 2.8 | Nostr Development Kit |
| @nostr-dev-kit/ndk-cache-dexie | 2.2 | IndexedDB caching for NDK |
| @nostr-dev-kit/ndk-svelte | 2.2 | Svelte bindings for NDK |
| nostr-tools | 2.19 | Low-level Nostr protocol utilities |
| @scure/bip32 | 1.4 | HD key derivation |
| @scure/bip39 | 1.6 | Mnemonic generation |
| bip39 | 3.1 | BIP-39 mnemonic wordlists |

### Storage and search

| Dependency | Version | Purpose |
|-----------|---------|---------|
| dexie | 4.0 | IndexedDB wrapper |
| hnswlib-wasm | 0.8 | HNSW vector search (client-side) |

### Testing

| Dependency | Version | Purpose |
|-----------|---------|---------|
| vitest | (dev) | Unit test runner |
| @vitest/coverage-v8 | 2.1 | Code coverage via V8 |
| @playwright/test | (dev) | End-to-end browser testing |

### Other

| Dependency | Version | Purpose |
|-----------|---------|---------|
| dompurify | 3.0 | HTML sanitisation |
| lucide-svelte | 0.561 | Icon library (Svelte) |

---

## Backend services

### auth-api

Express application deployed to Cloud Run. A Cloudflare Workers version is deployed at `https://dreamlab-auth-api.solitary-paper-764d.workers.dev`.

| Dependency | Purpose |
|-----------|---------|
| express | HTTP server |
| cors | CORS middleware |
| @simplewebauthn/server | WebAuthn registration/authentication |
| pg (PostgreSQL) | Database driver |
| dotenv | Environment variable loading |

### jss (JavaScript Solid Server)

| Technology | Purpose |
|-----------|---------|
| @solid/community-server 7.1.8 | Solid pod server |
| Docker (node:20-slim) | Container runtime |

### nostr-relay

Custom Nostr relay with PostgreSQL storage. Supports NIP-01, NIP-11, NIP-16, NIP-33, NIP-98. Retained on Cloud Run per ADR-010 (persistent WebSocket connections require Cloud SQL).

### embedding-api

Vector embedding generation service. Retained on Cloud Run per ADR-010 (ML inference requires CPU/memory beyond Workers limits). Client-side WASM search (rvf-wasm) provides an alternative for forum search.

### image-api

Image resizing and format conversion service. Includes NIP-98 authentication.

### link-preview-api

URL metadata extraction for link previews.

---

## Cloudflare Workers (deployed)

auth-api, pod-api, and search-api Workers are deployed at `*.solitary-paper-764d.workers.dev`. image-api and link-preview-api Workers are planned. See ADR-010 for migration details.

| Technology | Purpose |
|-----------|---------|
| Cloudflare Workers | Serverless compute (auth-api, pod-api, search-api deployed) |
| D1 | SQLite database (WebAuthn credentials, challenges) |
| KV | Key-value storage (sessions, pod metadata, config) |
| R2 | Object storage (pod data, images) |
| Wrangler | CLI tooling and configuration |

Configuration is in `wrangler.toml`.

---

## Rust WASM

| Technology | Purpose |
|-----------|---------|
| Rust | Systems language for WASM modules |
| wasm-pack | Build tool for Rust-to-WASM compilation |
| wasm-bindgen | Rust/JavaScript interop |

| Module | Location | Purpose |
|--------|----------|---------|
| wasm-voronoi | `wasm-voronoi/` | Voronoi tessellation for the 3D hero visualisation |
| rvf-wasm | `community-forum/packages/rvf-wasm/` | Client-side TF-IDF semantic search (replaces server-side embedding-api for forum search) |

---

## Nostr protocol (NIPs used)

| NIP | Name | Usage |
|-----|------|-------|
| NIP-01 | Basic protocol | Event format, relay communication |
| NIP-11 | Relay information | `/.well-known/nostr.json` relay metadata |
| NIP-16 | Event treatment | Replaceable and ephemeral events |
| NIP-19 | Bech32 encoding | npub/nsec/note encoding |
| NIP-33 | Parameterized replaceable events | Events keyed by d-tag |
| NIP-44 | Encrypted payloads | Direct message encryption |
| NIP-98 | HTTP auth | `Authorization: Nostr <base64(event)>` for API calls |

### NIP-98 event structure

```json
{
  "kind": 27235,
  "created_at": 1709136000,
  "tags": [
    ["u", "https://api.dreamlab-ai.com/auth/register/verify"],
    ["method", "POST"],
    ["payload", "<sha256-hex-of-request-body>"]
  ],
  "content": "",
  "pubkey": "<64-char-hex>",
  "id": "<sha256-of-serialised-event>",
  "sig": "<schnorr-signature>"
}
```

---

## Deployment infrastructure

| Component | Platform | Notes |
|-----------|----------|-------|
| Main site | GitHub Pages | Static build via `deploy.yml` |
| Community forum | GitHub Pages | Static SvelteKit adapter, served at `/community/` |
| auth-api | Google Cloud Run (migration target: Cloudflare Workers) | `us-central1`, GCP project `cumbriadreamlab`. Workers version deployed at `dreamlab-auth-api.solitary-paper-764d.workers.dev`. |
| jss | Google Cloud Run (migration target: Cloudflare Workers pod-api) | Solid pod server. Workers pod-api deployed at `dreamlab-pod-api.solitary-paper-764d.workers.dev`. |
| nostr-relay | Google Cloud Run (retained) | WebSocket-capable. Remains on Cloud Run per ADR-010. |
| embedding-api | Google Cloud Run (retained) | Vector embeddings. Remains on Cloud Run per ADR-010. |
| image-api | Google Cloud Run (migration target: Cloudflare Workers) | Image processing. Workers version planned. |
| DNS | Cloudflare | Domain: dreamlab-ai.com |

---

## Related documentation

- [GETTING_STARTED.md](../developer/GETTING_STARTED.md) -- setup and installation
- [PROJECT_STRUCTURE.md](../developer/PROJECT_STRUCTURE.md) -- directory layout
- [api-reference.md](./api-reference.md) -- API endpoint reference

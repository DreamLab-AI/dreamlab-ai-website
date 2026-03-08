# Getting Started — DreamLab Community Forum (Rust Port)

## Prerequisites

```bash
# Rust toolchain
rustup target add wasm32-unknown-unknown
cargo install trunk wasm-bindgen-cli worker-build cargo-criterion
cargo install wasm-opt --locked

# Node.js 20+ (Tailwind, Playwright, TS Workers)
npm install -g wrangler
```

## Clone and Setup

```bash
git clone https://github.com/DreamLab-AI/dreamlab-ai-website.git
cd dreamlab-ai-website && git checkout rust-version
npm install
cargo check --workspace
cargo check --workspace --target wasm32-unknown-unknown
```

## Running the Leptos Dev Server

```bash
# From community-forum-rs/ workspace root
trunk serve
# Opens at http://localhost:8080, hot-reloads on .rs changes
```

`Trunk.toml` configures the build. `tailwind.config.js` scans `crates/**/*.rs`.

## Running Workers Locally

```bash
# Rust Workers (build first)
cd crates/auth-worker && worker-build --dev && wrangler dev
cd crates/pod-worker && worker-build --dev && wrangler dev
cd crates/preview-worker && worker-build --dev && wrangler dev

# TypeScript Workers
cd workers/nostr-relay && wrangler dev --local --persist
cd workers/search-api && wrangler dev
```

Add `--persist` to keep D1/KV data between restarts.

## Running Tests

```bash
# All native tests
cargo test --workspace

# WASM tests
cargo test --workspace --target wasm32-unknown-unknown

# Property-based (increase cases for CI)
PROPTEST_CASES=10000 cargo test -p nostr-core

# Benchmarks
cargo criterion -p nostr-core

# Playwright E2E
npx playwright install chromium && npx playwright test

# Linting
cargo clippy --workspace -- -D warnings
cargo fmt --workspace --check
```

## Environment Variables

Main site `.env` (never commit):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_AUTH_API_URL=http://localhost:8787
```

Workers use `wrangler.toml` vars for local dev:
```toml
[vars]
RP_ID = "localhost"
EXPECTED_ORIGIN = "http://localhost:8080"
ADMIN_PUBKEYS = "<your-test-pubkey>"
```

## Project Structure

```
community-forum-rs/
  Cargo.toml              # Workspace root
  Trunk.toml              # trunk build config
  index.html              # Entry point for Leptos SPA
  crates/
    nostr-core/            # Shared: events, NIP-44, NIP-98, keys
    forum-client/          # Leptos CSR app
    auth-worker/           # CF Worker (Rust)
    pod-worker/            # CF Worker (Rust)
    preview-worker/        # CF Worker (Rust)
  tests/
    unit/                  # cargo test
    integration/           # Cross-crate tests
    e2e/                   # Playwright (JS)
```

## Common Tasks

**Add a page**: Create `crates/forum-client/src/pages/my_page.rs`, add route in `app.rs`.
**Add event kind**: Add variant to `nostr_core::event::EventKind`, add tests, run `cargo test -p nostr-core`.
**Test crypto**: `PROPTEST_CASES=10000 cargo test -p nostr-core nip44 && cargo criterion -p nostr-core --bench crypto`.

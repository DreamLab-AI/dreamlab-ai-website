# DreamLab Forum Operator Overlay

This package is the **operator-specific overlay** sitting on top of the
generic `nostr-bbs-*` kit crates living in the `nostr-rust-forum` repo.

## What's here

| Path                                | Purpose                                                              |
|-------------------------------------|----------------------------------------------------------------------|
| `Cargo.toml`                        | Path-deps to `nostr-bbs-{core,config,mesh}` (kit crates)             |
| `dreamlab.toml`                     | Operator-supplied config consumed by `nostr_bbs_config::load_from_*` |
| `src/branding.rs`                   | DreamLab `BrandingConfig` populator (theme, logos, copy, zones)      |
| `src/workers.rs`                    | Per-worker entry shims (kit `dispatch` API not yet available)        |
| `deploy/<worker>.wrangler.toml`     | Preserved CF resource IDs for D2 zero-downtime route handover        |

## Feature flags

Feature flags live in `dreamlab.toml` under `[features]`:

| Flag | Default | Description |
|------|---------|-------------|
| `marketplace` | `true` | NIP-90 agent job marketplace |
| `calendar` | `true` | NIP-52 calendar events |
| `dms` | `true` | NIP-59 encrypted direct messages |
| `governance` | `true` | Agent Control Surface dashboard at `/governance` (kinds 31400-31405) |

## Governance configuration

The `[governance]` section in `dreamlab.toml` controls the Agent Control Surface:

```toml
[governance]
enabled       = true
route         = "/governance"
kinds_lo      = 31400
kinds_hi      = 31405
relay_url     = "wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev"
agent_pubkeys = [
  "11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c",
]
```

- `agent_pubkeys` -- Pre-registered agent pubkeys authorised to publish governance
  control panel events. Replace placeholders with real agent pubkeys at deploy time
  via `DREAMLAB_GOVERNANCE_AGENT_PUBKEYS` env-override.
- `relay_url` -- Relay endpoint for governance events. Uses the main relay by default;
  set to a separate endpoint to isolate governance traffic.
- `kinds_lo`/`kinds_hi` -- Nostr event kind range for governance events (31400-31405).

## Status

**Phase X3** per [PRD-012] — overlay exists; the legacy
`community-forum-rs/` has been renamed to `community-forum-rs.frozen/` and is
pending deletion. No D2 cutover yet.

**Phase X4** (Sprint v12+) — D2 cutover happens once the kit's
`nostr-bbs-*-worker::dispatch` extension API is available. At that point:

1. Switch CF Routes from legacy workers to forum-config/ workers.
2. Run regression suite + canary.
3. Delete `community-forum-rs.frozen/` once stable.

## Usage at deploy time

Operators run something like:

```bash
# Provision Cloudflare resources (one-time)
wrangler kv:namespace create dreamlab-admin-kv
wrangler kv:namespace create dreamlab-nip98-replay

# Update deploy/*.wrangler.toml with the returned IDs

# Build + deploy each worker
cd ../nostr-rust-forum
for w in auth pod relay preview search; do
  worker-build --release \
    --wrangler ../dreamlab-ai-website/forum-config/deploy/$w-worker.wrangler.toml \
    -p nostr-bbs-$w-worker
  wrangler deploy --config ../dreamlab-ai-website/forum-config/deploy/$w-worker.wrangler.toml
done

# Build the forum-client with branding overlay baked in
NOSTR_BBS_NIP05_DOMAIN=dreamlab-ai.com \
  trunk build --release --config ../dreamlab-ai-website/forum-config/Trunk.toml
```

## Migration plan summary (PRD-012)

```
   Phase X3 (now)                    Phase X4 (Sprint v12+)
   ──────────────                    ──────────────────────
   community-forum-rs.frozen/        forum-config/
   (frozen, pending deletion)        (production)

   forum-config/                     [community-forum-rs.frozen/
   (overlay only; not deployed)      deleted]
```

[PRD-012]: ../docs/PRD-012.md

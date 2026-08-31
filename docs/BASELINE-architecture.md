---
title: DreamLab AI Website — Deployment & Build Baseline
doc_id: DLW-BASELINE
version: 0.1.0
status: draft-for-ratification
verified_commit: d852f61
sources:
  - .github/workflows/deploy.yml
  - .github/workflows/workers-deploy.yml
  - forum-config/Cargo.toml
  - forum-config/Cargo.lock
  - forum-config/dreamlab.toml
  - forum-config/README.md
  - src/App.tsx
  - index.html
  - CLAUDE.md
  - CNAME
date: 2026-08-31
---

# DreamLab AI Website — Deployment & Build Baseline

## Purpose

Single source of truth for what this repository actually is, builds, and ships:
the marketing site, the forum surfaces it re-hosts from an upstream kit, the
backend workers it points at, and the deploy topology. Ground-truth order:
live code and CI workflows > operator config > legacy ADR prose. Where the
README's marketing framing and the CI reality diverge, the CI reality wins and
the gap is recorded under Known divergences. Identity, zones, and the DID/
Multikey question live in the sibling doc `IDENTITY-zones.md`.

## Current State

### What this repo is

A **thin operator overlay**, not a protocol owner. The forum source, the Nostr
crates, and the five Cloudflare Workers all live upstream in the
`nostr-rust-forum` kit; this repo carries only the React marketing site, the
`forum-config/` overlay (branding, zones, Cloudflare resource IDs, kit pin), and
docs (`CLAUDE.md:5-11`, `forum-config/README.md:1-13`).

### Frontends shipped (three, not two)

The deploy job builds and merges **three** WASM/JS frontends under one origin,
despite the README's "two SPAs" framing:

| Path | Frontend | Built from | Evidence |
|------|----------|-----------|----------|
| `/` | React 18 marketing SPA (Vite + React Router) | this repo, `src/` | `src/App.tsx:4,32-38`, `deploy.yml:136` "Build React main site" |
| `/community/` | Rust/Leptos 0.7 CSR-WASM forum client (Trunk) | kit crate `nostr-bbs-forum-client` | `deploy.yml:204` "Build Leptos forum with Trunk" |
| `/community/bbs/` | Retro ASCII/BBS terminal client (Trunk) | kit crate `nostr-bbs-bbs-client` | `deploy.yml:295` "Build retro ASCII/BBS client with Trunk" |

All three are static assets after build; each has its own `window.__ENV__`
runtime-config block injected by `sed` at deploy time
(`deploy.yml:241` "Inject runtime env config into forum", `deploy.yml:299`
"Merge + configure BBS at /community/bbs/").

### Deploy topology — GitHub Pages primary

The site origin is **GitHub Pages**, not Cloudflare Pages. The `Deploy` job
publishes the merged `dist/` to the `gh-pages` branch via
`peaceiris/actions-gh-pages` with `cname: dreamlab-ai.com`
(`deploy.yml:1,366-372`; `CNAME:1`). A second `peaceiris` step mirrors to
`TheDreamLabUK/website` (`thedreamlab.uk`) when `DREAMLAB_UK_TOKEN` is present
(`deploy.yml:391-398`). A Cloudflare Pages deploy exists but is **gated off** by
default: it runs only when the repo variable `CLOUDFLARE_PAGES_ENABLED == 'true'`
(`deploy.yml:402`). `CLAUDE.md:14` states the posture correctly ("Hosting:
GitHub Pages (static dual-SPA) + Cloudflare Workers (backend)").

### Backend — five Cloudflare Workers on `workers.dev`

The five Rust workers (auth, pod, relay, search, link-preview/preview) are built
from the kit and deployed by `workers-deploy.yml`; the client talks to their raw
`*.solitary-paper-764d.workers.dev` hosts baked into the build env
(`deploy.yml:47-52`). The branded custom domains
(`relay./api./pods./search./preview.dreamlab-ai.com`) are the documented
end-state but are **not provisioned in DNS** (`deploy.yml:42-44`, verified
2026-06-09 with `ERR_NAME_NOT_RESOLVED`; that DNS observation is carried from the
workflow comment and has **not** been re-checked as of this doc's 2026-08-31
verified date); shipping them baked in previously severed every client API call
(`deploy.yml:41-46`). CORS `Access-Control-Allow-Origin` for
`https://dreamlab-ai.com` is sent by the workers per the workflow's own comment
(`deploy.yml:45-47`) and is asserted live by the CI smoke test
(`tests/forum-smoke.spec.ts:404-410`, "workers return scoped CORS"). The worker
HTTP-handler source itself is upstream in the `nostr-rust-forum` kit (cloned at
deploy time, not vendored here), so this repo grounds the claim via the workflow
comment and CI assertion rather than the handler code.

### Kit pin — versioned crate + git SHA, must move in lockstep

Two pin mechanisms coexist:

- **Config crates** are consumed from crates.io at a **fixed version**, not a git
  rev: `nostr-bbs-{core,config,mesh,rate-limit} = "1.0.0-beta.9"`
  (`forum-config/Cargo.toml`, `forum-config/Cargo.lock`).
- **Client + workers** are built by cloning the kit repo at a pinned **git SHA**
  `KIT_REF = a7544687b4d1c09807862d749b27f8c8da307a12`, present identically in
  `deploy.yml` and `workers-deploy.yml`. It tracks `nostr-rust-forum
  v1.0.0-beta.9`.

`workers-deploy.yml:` fires on `forum-config/Cargo.lock` and `KIT_REF` changes
precisely so a kit re-pin never ships a new client against old workers — the
client/worker skew that "wiped the forum on 2026-06-15" (legacy ADR-038;
`workers-deploy.yml` path-filter comment).

### Supply-chain hardening in the privileged deploy

Every tool the deploy job downloads (Trunk, binaryen/`wasm-opt`, Tailwind CLI)
is pinned to an exact version **and** SHA256-verified before use
(`deploy.yml:32-40`, install steps), because that job carries the Cloudflare API
token. GitHub Actions are pinned to full commit SHAs, not tags.

## Known divergences & open items

- **"Cloudflare-edge deployment" (README) vs GitHub Pages reality.** `README.md`
  frames the site as a "dual-SPA Cloudflare-edge deployment". The origin is
  GitHub Pages (`deploy.yml:1,366-372`); Cloudflare hosts only the backend
  Workers, and Cloudflare Pages is opt-in behind `CLOUDFLARE_PAGES_ENABLED`
  (`deploy.yml:402`). `CLAUDE.md:14` is the accurate statement.
- **"Two SPAs" vs three clients.** The README says "Two SPAs, one origin"; the
  deploy ships a third, the ASCII/BBS client at `/community/bbs/`
  (`deploy.yml:295`).
- **Config is hand-synced, not generated (legacy ADR-037, Accepted "partial").**
  `VITE_ADMIN_PUBKEY`, `VITE_JARVIS_PUBKEY`, and `ZONE_CONFIG_JSON` in
  `deploy.yml:56,65,73-75` are **hand-synced mirrors** of
  `forum-config/dreamlab.toml`, explicitly labelled "HAND-SYNCED mirrors, not
  generated" (`deploy.yml:56`). Only the O3 fail-closed KV guard shipped; the
  O1/O2 single-source generator is deferred. Any pubkey/zone rotation is a
  multi-location manual change.
- **`forum-config/README.md` pin note is stale.** It describes the kit dep as a
  git `rev` (e.g. `6986276`); the actual dependency is now a crates.io version
  (`1.0.0-beta.9`) with the git SHA carried separately as `KIT_REF`.
- **Branded worker domains undeployed.** The end-state DNS
  (`relay./api./pods./…dreamlab-ai.com`) does not resolve; the build points at
  `workers.dev` hosts as the shipped reality (`deploy.yml:41-52`).
- **SPA deep links depend on a 404-redirect shim.** GitHub Pages has no
  server-side routing, so hard loads round-trip through `404.html` and a `__p`
  query pickup for both the React site and the forum (`deploy.yml:327-363`,
  `250-262`). This is load-bearing, not incidental.

## Invariants (must not silently change)

1. `KIT_REF` in `deploy.yml` and `workers-deploy.yml` and the pinned kit version
   in `forum-config/Cargo.{toml,lock}` must move together. A client built at a
   kit SHA the workers were not deployed from is the documented forum-wipe
   failure mode.
2. The privileged deploy job must download **no unverified artefact**: every
   external tool stays version-pinned and SHA256-checked (`deploy.yml` install
   steps). Actions stay pinned to commit SHAs.
3. Runtime API bases are injected via `window.__ENV__`, never baked as compile
   constants where a DNS-unprovisioned domain would sever calls (`deploy.yml:41-52`).
4. GitHub Pages is the origin of record for `dreamlab-ai.com` until DNS is
   re-cut; the Cloudflare Pages step stays gated behind an explicit repo
   variable.

## Change process

To change the deploy topology, kit pin, or worker endpoints: (1) update the
CI workflow(s) and `forum-config/` together in one change; (2) for a kit bump,
move the crate version and `KIT_REF` in lockstep and confirm `workers-deploy.yml`
will fire; (3) update this doc's affected section with the new `file:line` and
re-record `verified_commit`; (4) add a thin ADR under `docs/adr/` recording the
decision. Legacy ADR prose (013–044) is citable evidence, never authority — the
archive is frozen at 2026-08-31.

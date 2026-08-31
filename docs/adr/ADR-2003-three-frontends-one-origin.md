---
id: ADR-2003
title: Ship three polyglot frontends merged under one origin
date: 2026-08-31
decision_status: accepted
implementation_status: complete
activation_status: live
supersedes: []
superseded_by: []
verified_commit: dc06748
owner: jjohare
review_trigger: adding or retiring a frontend surface, or unifying the forum and BBS clients onto one toolchain
repo: dreamlab-ai-website
domain: BASELINE-architecture.md
lineage: distils legacy 013-rust-leptos-forum-framework and 026-forum-professionalisation, whose "two SPAs" framing predates the retro BBS client landing as a third surface.
---

# ADR-2003 — Ship three polyglot frontends merged under one origin

## Decision

The deploy job builds and merges **three** independently-toolchained clients into
one `dist/` under the single GitHub Pages origin: the React 18 marketing SPA at
`/` (Vite, `deploy.yml:136`), the Leptos 0.7 CSR-WASM forum client at
`/community/` (Trunk, `deploy.yml:204`), and the retro ASCII/BBS terminal client
at `/community/bbs/` (Trunk, `deploy.yml:295`). Each surface receives its **own**
`window.__ENV__` block with surface-specific keys — the forum reads `VITE_*`
names, the BBS reads `RELAY_URL`/`POD_API`/`PREVIEW_API` (`deploy.yml:248` vs
`:320`). The README's "two SPAs, one origin" is superseded by this three-surface
reality.

## Consequences

- Forecloses a single build toolchain: Vite and two separate Trunk/WASM builds
  must all stay green for a deploy; `wasm-bindgen`/`wasm-opt` versions are pinned
  per client (`workers-deploy.yml:193`, `deploy.yml` Trunk install).
- Path-based merge means no framework-level router owns the origin; each surface
  needs its own deep-link handling (the BBS is single-screen, so a hard sub-path
  load falls back rather than routes, `deploy.yml:322-325`).
- Two env-injection dialects to keep in step; a rename on one surface silently
  breaks only that surface.
- Upside: each audience (marketing, forum, BBS nostalgia) gets a fit-for-purpose
  client without forcing one framework to serve all three.

## Verification

At `dc06748`: `grep -n "Build React main site\|Build Leptos forum with Trunk\|Build retro ASCII/BBS client with Trunk" .github/workflows/deploy.yml` returns the three
build steps at `:136,:204,:295`; the two distinct `window.__ENV__` payloads are at
`deploy.yml:248` and `:320`. Frontend table and divergence note in
`BASELINE-architecture.md` §Frontends shipped.

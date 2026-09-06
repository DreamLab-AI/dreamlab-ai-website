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
at `/community/bbs/` (Trunk, `deploy.yml:295`). React receives Vite build variables; the forum and BBS each receive a
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

## Closeout extension — 2026-09-04

Work package: **CP-06/08**. Accountable owner remains `jjohare`; estate acceptance requires the release and identity maintainers where the boundary crosses repositories. This extends closeout criteria without changing the accepted architectural choice.

The workflow builds and merges three clients. This pass runs React tests only; it does not build or browse the pinned kit clients.

**Acceptance condition:** Build all three from the same release manifest and verify direct loads, navigation, authentication, disconnected states and intended accessibility on each surface.

Dependency: the estate release identity (CP-01), plus the upstream kit revision and affected identity/grounding contracts. Reopen on the existing review trigger or a failing acceptance probe. Preserve the historical `verified_commit` and activation declaration: this annex is source/test evidence at `7e243741c8eaf61506ef86a70b8dd44d80722c11`, not a new live-service certification.

See the [commercial review](../../../VisionFlow/docs/estate-review/commercial-surfaces.md) and [receipt](../../../VisionFlow/docs/estate-review/evidence/commercial-snapshot.json).

## Acceptance progress — 2026-09-05

**Implemented.** The previous pass ran React tests only and did not build or
browse the pinned kit clients. All three surfaces have now been built from the
**same pinned kit revision the deploy workflow uses**
(`KIT_REF = a7544687b4d1c09807862d749b27f8c8da307a12`), merged into one `dist/`
with the same `window.__ENV__` payloads `deploy.yml` injects, served on one
origin, and driven in a real browser.

| Surface | Path | Toolchain | Result |
|---|---|---|---|
| React marketing SPA | `/` | Vite 5.4 | boots; root mounted; Talk-to-AI FAB present |
| Leptos forum client | `/community/` | Trunk (release) | boots; "Community Forums" rebrand applied; 4 zones |
| Retro ASCII/BBS | `/community/bbs/` | Trunk (release) | boots; `MINIMOONOIR`, amber theme, 4 zones |

The two env-injection dialects this ADR flags as a rename risk were verified
distinct and both correct on the live surfaces: the forum received `VITE_*`-named
keys (`VITE_RELAY_URL`, `VITE_AUTH_API_URL`, `VITE_POD_API_URL`,
`VITE_SEARCH_API_URL`, `VITE_LINK_PREVIEW_API_URL`, `ZONE_CONFIG`) while the BBS
received the un-prefixed set (`RELAY_URL`, `POD_API`, `PREVIEW_API`,
`SEARCH_API`, `JARVIS_PUBKEY`) plus its `[branding]` projection
(`THEME: amber`, `NODE_NAME: MINIMOONOIR`, `TAGLINE`, `LOCATION`). A rename on
one surface is now caught statically too (ADR-2002 annex).

**Browser checks + results.** Harness: raw CDP against the `browsercontainer`
sidecar; static server with a GitHub-Pages-equivalent `404.html` fallback.
Receipt and screenshots in `docs/estate-closeout/2026-09-05/`; the re-runnable
probe is `browser-check.mjs`. Seven checks, eight derived verdicts, **all pass**,
**zero unclassified console errors**:

- direct load of each of the three surfaces (`react_direct_load`,
  `forum_direct_load`, `bbs_direct_load`);
- deep-link navigation through the `?__p=` shim on both React
  (`/programmes`, `/contact`) and the forum (`/community/login`), each restoring
  its path (`react_deeplink_spa_shim`, `forum_deeplink`);
- endpoints and the zone model reaching every surface
  (`effective_endpoints_reach_each_surface`,
  `zone_model_projected_identically`);
- the Talk-to-AI disconnected state (`talk_to_ai_disconnected_degrades_gracefully`
  — see ADR-2008).

Two deliberate stubs are recorded in the receipt with their justification: a
`navigator.serviceWorker` shim (the lab origin is plain HTTP and non-localhost,
so Chrome withholds this secure-context API and both Leptos clients abort during
boot; the real origin is HTTPS and unaffected — the stub records that the forum
would register `/sw.js` and the BBS `bbs-sw.js`), and a blocked `WebSocket` for
the Talk-to-AI check so no DM reaches the production agent.

**Remaining.** Not covered: authenticated journeys on any surface (both clients
were observed at their signed-out entry screens), intended accessibility
conformance, and anything requiring live workers or DNS. The three surfaces were
built here from the pinned kit but not from a published release manifest.

**Governed paths changed.** None of this ADR's own governed paths changed;
evidence added under `docs/estate-closeout/2026-09-05/`. Related workflow and
gate changes are recorded in the ADR-2002 and ADR-2004 annexes.

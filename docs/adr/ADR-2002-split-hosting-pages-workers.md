---
id: ADR-2002
title: Serve the origin from GitHub Pages and the backend from Cloudflare Workers
date: 2026-08-31
decision_status: accepted
implementation_status: complete
activation_status: live
supersedes: []
superseded_by: []
verified_commit: dc06748
owner: jjohare
review_trigger: a move to Cloudflare Pages as origin (flip CLOUDFLARE_PAGES_ENABLED), or DNS re-cut of the branded worker domains
repo: dreamlab-ai-website
domain: BASELINE-architecture.md
lineage: distils legacy 015-workers-port-strategy and 040-gap-close-edge-decisions — the "edge deployment" framing they carried is retired in favour of the split-plane reality.
---

# ADR-2002 — Serve the origin from GitHub Pages and the backend from Cloudflare Workers

## Context

The site could plausibly be a single Cloudflare property (Pages origin + Workers
backend on one edge, one deploy credential, server-side routing). The README
still markets that "Cloudflare-edge" shape. It was not chosen.

## Decision

The static origin for `dreamlab-ai.com` is **GitHub Pages** (`gh-pages` branch via
`peaceiris/actions-gh-pages`, `deploy.yml:365-372`; `CNAME:1`). Cloudflare hosts
**only** the five backend Workers. The Cloudflare Pages deploy path exists but
stays gated behind the repo variable `CLOUDFLARE_PAGES_ENABLED == 'true'`
(`deploy.yml:402`) — off is the shipped posture. Because the two planes are
separate and the branded worker DNS is unprovisioned, API bases are injected at
deploy time into `window.__ENV__` (`deploy.yml:49-53,248,320`), never compiled in.

## Consequences

- Forecloses the single-property edge: no server-side routing, so SPA deep links
  must round-trip through a `404.html` `__p` shim (`deploy.yml:327-363`), and
  every backend host is a cross-origin call needing scoped CORS.
- Forecloses baking API URLs as build constants: an unprovisioned branded domain
  baked in would sever every client call (`deploy.yml:41-46`), so `window.__ENV__`
  injection is mandatory, not stylistic.
- Two deploy credentials and two publish targets (GitHub Pages + the mirror to
  `TheDreamLabUK/website`, `deploy.yml:391-398`) instead of one.
- Cheap origin, no Cloudflare Pages lock-in; the gated CF-Pages step keeps the
  alternative one variable away without shipping it.

## Verification

At `dc06748`: `grep -n "actions-gh-pages\|cname: dreamlab-ai.com\|CLOUDFLARE_PAGES_ENABLED" .github/workflows/deploy.yml` shows the Pages deploy at
`:365-372` and the gated CF-Pages step at `:402`; `cat CNAME` = `dreamlab-ai.com`.
Worker bases resolve only to `*.solitary-paper-764d.workers.dev`
(`deploy.yml:49-53`). See `BASELINE-architecture.md` §Deploy topology / Invariants
3–4 for the compliance surface.

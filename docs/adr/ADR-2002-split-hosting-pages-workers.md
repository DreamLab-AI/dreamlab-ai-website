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
separate and the branded worker DNS is unprovisioned, forum/BBS API bases are injected at
deploy time into `window.__ENV__` (`deploy.yml:49-53,248,320`). React transport
uses Vite build variables in the React build step.

## Consequences

- Forecloses the single-property edge: no server-side routing, so SPA deep links
  must round-trip through a `404.html` `__p` shim (`deploy.yml:327-363`), and
  every backend host is a cross-origin call needing scoped CORS.
- Effective endpoint validation is required for both Vite build variables and
  forum/BBS runtime injection; an unavailable branded domain severs the affected
  surface (`deploy.yml:41-46`).
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

## Closeout extension — 2026-09-04

Work package: **CP-08**. Accountable owner remains `jjohare`; estate acceptance requires the release and identity maintainers where the boundary crosses repositories. This extends closeout criteria without changing the accepted architectural choice.

Workflow source retains GitHub Pages publication and separate workers. Earlier DNS/live assertions were not rechecked. React transport reads Vite build variables, whereas forum/BBS receive injected runtime configuration.

**Acceptance condition:** Record deployed frontend/worker revisions, scoped CORS and deep-link results; prove rollback and failed-check publication denial across the separate workflows.

Dependency: the estate release identity (CP-01), plus the upstream kit revision and affected identity/grounding contracts. Reopen on the existing review trigger or a failing acceptance probe. Preserve the historical `verified_commit` and activation declaration: this annex is source/test evidence at `7e243741c8eaf61506ef86a70b8dd44d80722c11`, not a new live-service certification.

See the [commercial review](../../../VisionFlow/docs/estate-review/commercial-surfaces.md) and [receipt](../../../VisionFlow/docs/estate-review/evidence/commercial-snapshot.json).

## Acceptance progress — 2026-09-05

**Implemented.** Effective endpoint validation now exists for both config
dialects, and the pre-deploy gate genuinely gates.

*Effective endpoints were unvalidated.* `scripts/lib/effective-endpoints.mjs`
derives what each surface actually receives from `deploy.yml` and checks it
against what the source actually reads. For React it resolves the `Build React
main site` step's `env:` mapping (including `${{ env.X }}` indirection, with
`${{ secrets.X }}` recorded as operator-held rather than validated) and fails
when a `import.meta.env.VITE_*` name the bundle reads is never supplied — the
case that bakes `undefined` into the bundle and silently severs a feature. For
the forum and BBS it parses each `window.__ENV__` payload, resolves every shell
interpolation against the workflow env (and against shell variables assigned in
the injecting run block, so `BUILD_HASH`/`BUILD_VERSION` are not false
positives), and asserts required keys are present per surface. Values are shape-
checked: `wss://` for relays, `https://` for API bases, 64-hex for pubkeys, and
`ZONE_CONFIG` must parse as a non-empty JSON array.

*The gate reported success unconditionally.* `test-and-lint.yml`'s summary step
wrote `passed=true` under `if: always()` regardless of what failed above it, so
the `passed` output was a constant. It now records each required step's outcome
(`pins`, `endpoints`, `mirrors`, `vitest`, `react_build`, `rust_fmt`,
`rust_test`), aggregates them into a real verdict, writes a per-gate table to the
step summary, and **exits non-zero** when any failed. `deploy.yml`'s
`build-and-deploy` and `workers-deploy.yml`'s `provision-kv` / `deploy-rust` now
additionally require `needs.gate.outputs.passed == 'true'`, so a future change
that makes a gate step non-blocking cannot quietly re-open the publication path.
All Actions are SHA-pinned (see ADR-2004).

**Tests + results.** `scripts/__tests__/effective-endpoints.test.mjs` — 17 tests,
all passing: a `VITE_*` read but never supplied; a relay URL that is not absolute
`wss://`; an API base that is not absolute `https://`; a malformed agent pubkey
reaching the BBS; an `__ENV__` key interpolating an undefined variable; a BBS
injection missing a required key; and invalid `ZONE_CONFIG` JSON — plus parser
tests for quoted values with trailing comments, env-block termination, and
JSON-safe payload splitting. All seven workflows re-parse as valid YAML.

**Browser receipts** (`docs/estate-closeout/2026-09-05/`, verdicts
`effective_endpoints_reach_each_surface: pass`,
`react_deeplink_spa_shim: pass`): the split-plane consequences this ADR names
were observed on a real build. The `404.html` `?__p=` shim round-trips deep links
— `/programmes` and `/contact` both 404 on the document and restore their path
with the correct page rendered. Scoped worker CORS was observed **enforced**: the
forum's cross-origin fetch to the relay was refused from the lab origin
`http://agentbox:8181`, which is the documented `https://dreamlab-ai.com`-only
policy behaving correctly. Every console error in the receipt is classified and
none were left unclassified.

**Remaining.** Nothing here is a live-service certification. Not closed:
deployed frontend/worker revisions, live DNS for the branded worker domains
(still unprovisioned, per the workflow's own note), rollback proof, and
observing publication actually denied on a failed check in a real run.
`CLOUDFLARE_PAGES_ENABLED` remains off, as shipped.

**Governed paths changed.** `.github/workflows/test-and-lint.yml`,
`.github/workflows/deploy.yml`, `.github/workflows/workers-deploy.yml`,
`.github/workflows/ci.yml`, `scripts/check-effective-endpoints.mjs` (new),
`scripts/lib/effective-endpoints.mjs` (new).

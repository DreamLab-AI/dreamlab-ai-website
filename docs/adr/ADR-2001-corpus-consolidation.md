---
id: ADR-2001
title: Consolidate the ADR corpus into living ground-truth docs
date: 2026-08-31
decision_status: accepted
implementation_status: complete
activation_status: live
supersedes: []
superseded_by: []
verified_commit: d852f61
owner: jjohare
review_trigger: next kit re-pin, deploy-topology change, or identity/zone-model change
repo: dreamlab-ai-website
---

# ADR-2001 — Consolidate the ADR corpus into living ground-truth docs

## Context

The `docs/adr/` corpus had grown to 33 records (013–044, plus 001–012 historical
stubs) — the largest satellite corpus in the estate. It had drifted from the
code and CI reality on load-bearing points: the README markets a "Cloudflare-edge
dual-SPA" that in fact deploys to **GitHub Pages** and ships **three** frontends
(`deploy.yml:1,295,366`); the identity ADRs describe a converged `did:nostr`/
Multikey document form (the `fe70102` Multikey prefix, ADR-027) that **no code
in this repo produces** — auth is raw-hex Schnorr via `nostr-tools`
(`src/lib/nostr.ts:20-22`), and the cited binding spec `ADR-125` lives in another
repo. Legacy ADR-037's "single source of truth" is still hand-synced mirrors
(`deploy.yml:56`). Prose was being read as authority when only the code is.

## Decision

The living decision surface is the set of governing documents in `docs/`
(`BASELINE-architecture.md`, `IDENTITY-zones.md`), each carrying present-tense
current state with `file:line` citations, *Invariants*, and a *Change process*.
New decisions are thin ADRs in `docs/adr/` created from `TEMPLATE.md`, carrying
three-axis status (decision / implementation / activation) and validated by
`scripts/adr-index-gen.cjs`. The legacy corpus (013–044) is frozen read-only under
`docs/archive/adr/` as citable evidence, never authority. Lookup order: governing
doc → code/CI/config citations → this ledger → archive (history only).

## Consequences

- A reader gets current truth from two short docs instead of reconciling 33
  drifted records by hand.
- Every load-bearing claim is now pinned to a `file:line` and a
  `verified_commit`, so drift is detectable at review time.
- The archive stops being mistaken for policy; its numbers remain resolvable for
  inbound cross-references.
- Cost: the governing docs must be updated in the same change as the code they
  describe, and `verified_commit` re-recorded — enforced by the *Change process*
  sections and this ledger.

## Verification

- `git mv` moved 32 legacy ADR records + the old index README to
  `docs/archive/adr/` (`ls docs/archive/adr/*.md` = 33 files incl. index).
- Living docs created: `docs/BASELINE-architecture.md` (157 lines),
  `docs/IDENTITY-zones.md` (161 lines), each with frontmatter
  `verified_commit: d852f61` (`git rev-parse --short HEAD`).
- Ledger validates: `node scripts/adr-index-gen.cjs docs/adr` exits 0 and writes
  `docs/adr/README.md`.
- Drift claims spot-checked against `deploy.yml`, `forum-config/dreamlab.toml`,
  `src/lib/nostr.ts`, and `src/components/AIChatFab.tsx` at commit `d852f61`.

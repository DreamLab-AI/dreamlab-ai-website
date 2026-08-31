# ARCHIVED — ADR (DreamLab AI Website)

**Frozen:** 2026-08-31. **Do not add or edit records here.**

These ADR records (013–044, plus the historical 001–012 stubs referenced in the
old index) are the pre-2026-08-31 decision corpus for the DreamLab AI website.
They drifted from the code and CI reality — the site markets a "Cloudflare-edge
dual-SPA" that in fact deploys to GitHub Pages and ships three frontends, and the
identity ADRs describe a `did:nostr`/Multikey convergence no code in this repo
produces. They are kept read-only for history and to resolve inbound
cross-references.

The living decision surface is now **`docs/`**:

- Deployment & build baseline ...... `docs/BASELINE-architecture.md`
- Identity, zones & DM routing ..... `docs/IDENTITY-zones.md`
- New ADR ledger ................... `docs/adr/`

New decisions go in `docs/adr/` using `docs/adr/TEMPLATE.md`. The living docs are
normative (their *Invariants* sections are the compliance surface); these
archived records are citable evidence ("legacy ADR-037"), never authority.

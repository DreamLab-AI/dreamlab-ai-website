**How to work against this pack** (engineering/build-with-quality agents start here):

The ADR pack for any domain is **its living governing document in `docs/` plus the
ledger records below that amend it**. The living docs are normative — their
*Invariants* sections are the compliance surface and their *Change process*
sections say how to amend them:

| Domain | Governing document |
|---|---|
| Deploy topology, frontends, kit pin, workers, build supply-chain | [`../BASELINE-architecture.md`](../BASELINE-architecture.md) |
| Identity (raw-pubkey vs DID/Multikey), zones, admin/agent roster, DM routing | [`../IDENTITY-zones.md`](../IDENTITY-zones.md) |

**Lookup order:** governing doc → its `file:line` citations into code, CI, and
`forum-config/` → the ledger records below → `docs/archive/adr/` **only for
rationale and history — never as authority** (the archive is the pre-2026-08-31
corpus 013–044, frozen precisely because it drifted from the code).

**Making a decision:** copy [`TEMPLATE.md`](TEMPLATE.md) to `ADR-NNNN-slug.md`
(next free number), fill the three-axis status honestly, update the affected
governing document **in the same change**, and regenerate this index
(`node scripts/adr-index-gen.cjs docs/adr` — it fails CI on invalid frontmatter).

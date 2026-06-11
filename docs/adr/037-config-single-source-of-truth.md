# ADR-037: Configuration Single Source of Truth — Generate Worker Vars and Client Env from `dreamlab.toml`

## Status: Accepted (implementation pending)

## Date: 2026-06-11

## Context

The 2026-06-11 audit's open findings O1, O2, and O3 in
[the forum overlay anomaly register](../architecture/00-forum-overlay-anomaly-register.md)
all describe the same root defect: deployment configuration that should have one
authored source exists instead as two or three hand-synchronised copies, with no
build step deriving the copies from the source. Divergence between copies causes
UI/enforcement mismatch, and one copy fails open.

- **O1 (zone config, MED).** `ZONE_CONFIG` exists three times: the authored
  `[[zones]]` array in `forum-config/dreamlab.toml`, the relay's `ZONE_CONFIG`
  `[vars]` JSON string in `relay-worker.wrangler.toml`, and the client's
  `window.__ENV__.ZONE_CONFIG`. The relay treats its copy as the single source of
  zone truth (deny-by-default if absent), but nothing generates the relay and
  client copies from `dreamlab.toml`. If they drift, the UI offers sections the
  relay denies, or hides sections the relay permits.

- **O2 (admin pubkeys, MED).** `ADMIN_PUBKEYS` is split across a 2-key plaintext
  `[vars]` value in `search-worker.wrangler.toml`, a larger CF secret on the
  auth-worker, and the authored `[admin].static_pubkeys` in `dreamlab.toml` —
  unsynchronised. A pubkey granted admin in one place but not another produces
  surface-specific authority.

- **O3 (ADMIN_KV placeholder, HIGH).** `auth-worker.wrangler.toml` and
  `pod-worker.wrangler.toml` carry an `ADMIN_KV` (and read-only `ADMIN_KV_RO`)
  binding with id `REPLACE_WITH_NEW_ADMIN_KV_ID`, sed-substituted at deploy time.
  CI asserts the placeholder is **present**, not that it was **resolved** — a
  silent KV-provision failure deploys a worker with a broken admin binding. The
  substitution must fail closed.

The authored source for all of this already exists and is coherent:
`forum-config/dreamlab.toml` carries `[[zones]]`, `[admin].static_pubkeys`, and
the deployment knobs. The defect is that the deploy pipeline copies by hand
rather than generates.

## Decision

Declare `forum-config/dreamlab.toml` the **single authored source of truth** for
zone configuration and the admin pubkey set, and adopt a generation step
(deferred — see Status) that derives the downstream copies from it, fail-closed.

1. **`dreamlab.toml` is authoritative.** The `[[zones]]` array and
   `[admin].static_pubkeys` (plus the deploy knobs the workers consume) are
   authored once in `dreamlab.toml`. No downstream copy is hand-edited.

2. **Worker `[vars]` are generated, not authored.** A deploy-time generation
   step emits the relay's `ZONE_CONFIG`, the search-worker's `ADMIN_PUBKEYS`,
   and any other derived `[vars]` from `dreamlab.toml` into the wrangler
   manifests (or injects them at `wrangler deploy` time). Hand-edited `[vars]`
   that duplicate authored config are removed once generation lands.

3. **Client `window.__ENV__` is generated.** `ZONE_CONFIG` (and any other
   client-visible derived config) in `__ENV__` is emitted from the same
   `dreamlab.toml` source during the client build, so the UI and the relay
   enforce the identical zone set by construction.

4. **Generation fails closed.** If the source is missing, malformed, or a
   required derived value is empty, the generation step **errors and aborts the
   deploy** — it never emits a default-open or empty value. This directly
   addresses O3: the `ADMIN_KV` id substitution (and every other placeholder)
   must be validated as **resolved**, not merely present; an unresolved
   `REPLACE_WITH_*` placeholder is a hard deploy failure.

5. **Admin source convergence (relates to O2).** The generated `ADMIN_PUBKEYS`
   for plaintext-var surfaces and the CF-secret surface derive from the same
   `[admin].static_pubkeys`. When the admin model switches from `mode = "static"`
   to `mode = "d1"` (the `is_admin` table; see
   [ADR-033](033-multi-admin-moderation-architecture.md)), the generation step is
   the seam that backfills the table from the authored set.

### Deferred implementation

The generation step itself is **not built in this change**. This ADR records the
decision and the fail-closed contract. Until the generator lands, the three-way
hand-sync remains in place and O1-O3 stay open in the anomaly register. The
implementation work is: a deploy-pipeline generator (run in `workers-deploy.yml`
and the client build) reading `dreamlab.toml`, emitting `ZONE_CONFIG` /
`ADMIN_PUBKEYS` / `__ENV__`, and a CI assertion that every `REPLACE_WITH_*`
placeholder is resolved before deploy proceeds.

## Consequences

### Positive

- One authored source removes the drift class behind O1 and O2: UI and relay
  enforce the same zones; admin authority is uniform across surfaces.
- Fail-closed generation turns O3 from a silent broken-binding deploy into a hard
  abort.
- The admin-model `static` → `d1` transition gains a clean seam.

### Negative / Trade-offs

- Until the generator ships, this ADR is aspirational — the hand-sync risk
  persists and O1-O3 remain open. The Status is explicitly "implementation
  pending" to avoid implying the defect is fixed.
- A generation step adds a deploy-pipeline dependency; a generator bug could
  itself block deploys (acceptable: fail-closed is the intent).

### Neutral

- No `forum-config/` code or workflow is changed by this ADR — those are the
  decisions to record, and the generator is future work. The authored
  `dreamlab.toml` is already the de-facto source; this ADR makes it de-jure.

## Related Decisions

- [ADR-033](033-multi-admin-moderation-architecture.md): admin model (`static`
  vs `d1`); the generated admin set feeds the `is_admin` backfill.
- [ADR-038](038-kit-ref-pin-governance.md): the other deploy-pipeline invariant
  (kit-ref lockstep) — same class of "one source, enforced in CI" discipline.

## References

- [Forum overlay anomaly register, O1-O3](../architecture/00-forum-overlay-anomaly-register.md)
- `forum-config/dreamlab.toml` (`[[zones]]`, `[admin].static_pubkeys`)
- `forum-config/deploy/relay-worker.wrangler.toml` (`ZONE_CONFIG`)
- `forum-config/deploy/search-worker.wrangler.toml` (`ADMIN_PUBKEYS`)
- `forum-config/deploy/auth-worker.wrangler.toml`, `pod-worker.wrangler.toml` (`ADMIN_KV`)

# ADR-019: Versioned Planning Governance and Tranche-Based Delivery

> **Status Update (2026-03-12):** The Rust port tranches are complete. The "stop after hybrid" option (Section 6) was not exercised — the full Leptos rewrite proceeded. SvelteKit has been deleted. The governance principles in this ADR remain in force for future planning.

[Back to ADR Index](README.md) | [Back to Documentation Index](../README.md)

| Field     | Value                          |
|-----------|--------------------------------|
| Status    | Accepted                       |
| Date      | 2026-03-08                     |
| Deciders  | DreamLab Engineering           |
| Related   | PRD Rust Port v2.0.0 and v2.1.0 |

## Context

The accepted Rust-port documentation set already makes an important distinction
between:

- the **PRD** as the delivery plan,
- the **ADR set** as accepted architecture decisions,
- and the **DDD set** as derived domain documentation.

However, the current documentation still leaves room for an unsafe pattern:
trying to rewrite the PRD, ADRs, and DDD together as if they were the same kind
of artifact.

That creates three problems.

1. **Accepted ADRs are supposed to be immutable**. The convention in
   [`README.md`](./README.md) says accepted ADRs should be superseded, not
   rewritten in place.
2. **DDD is derived from accepted architecture and plan state**. Rewriting it
   at the same time as unresolved planning changes makes review ambiguous.
3. **The Rust-port execution model is phased by design**. The hybrid validation
   gate in ADR-014 is not optional cleanup; it is the central risk control for
   a first-of-kind Rust/WASM Nostr client.

The project therefore needs an explicit governance rule for how planning changes
are introduced and how delivery is structured.

## Decision

Adopt the following planning and documentation governance model.

### 1. Planning revisions are versioned

Major planning changes produce a new versioned PRD.

- The accepted PRD remains the baseline until a replacement is approved.
- Proposed plan refinements may coexist with the accepted baseline during
  review.

### 2. Accepted ADRs are not rewritten in place

- Architectural change must be captured in a new ADR.
- If a previous ADR is no longer correct, the new ADR supersedes it.
- Editorial fixes are allowed, but semantic changes must not be hidden inside
  existing accepted ADRs.

### 3. DDD is updated after decision acceptance

- DDD documents are treated as derived artifacts.
- They should be synchronized only after the relevant PRD/ADR changes are
  accepted.
- DDD should not be used to pre-decide unresolved architecture.

### 4. Delivery proceeds in tranches with hard exits

The Rust port is executed through explicit tranches:

1. planning hardening and evidence baseline,
2. hybrid validation in the existing SvelteKit forum,
3. shared-core and low-risk worker migration,
4. auth boundary migration,
5. client migration by vertical slice,
6. cutover and decommissioning.

Each tranche must define:

- entry criteria,
- exit criteria,
- rollback conditions,
- and stop/re-scope conditions.

### 5. The client migration uses vertical slices

After the hybrid and worker phases, the forum client is migrated by end-user
capability slices rather than only by horizontal layers such as “all stores” or
“all components”.

This improves:

- demoability,
- parity review,
- rollback safety,
- and stakeholder confidence.

### 6. “Stop after hybrid” is a valid outcome

If the hybrid Rust/WASM integration delivers enough performance improvement with
lower risk than a full client rewrite, the project may stop at that point and
retain SvelteKit for the UI.

The Rust programme is therefore judged by delivered value, not by language
purity.

## Consequences

### Positive

- **Safer planning changes**: reviewers can compare accepted baseline versus
  proposed revision without losing the current source of truth.
- **ADR integrity preserved**: architecture history remains auditable.
- **Lower review ambiguity**: DDD updates follow accepted decisions rather than
  competing with them.
- **Better execution control**: tranche-level exit criteria make the programme
  easier to stop, continue, or re-scope with discipline.
- **More practical client migration**: vertical slices map better to product
  risk than mass component rewrites.

### Negative

- **More documents to maintain**: versioned PRDs and superseding ADRs increase
  documentation count.
- **More explicit governance overhead**: plan changes require clearer review and
  acceptance steps.
- **Temporary duplication**: during review, accepted and proposed plans may
  coexist.

### Neutral

- This ADR does not change the underlying technical architecture by itself.
- Existing accepted ADRs remain in force unless explicitly superseded.
- Existing DDD content remains valid until a later accepted change requires
  synchronization.

## References

- [PRD v2.0.0](../prd-rust-port.md)
- [PRD v2.1.0 (proposed)](../prd-rust-port-v2.1.md)
- [ADR-014: Hybrid Validation Phase Before Full Rewrite](./014-hybrid-validation-phase.md)
- [DDD Overview](../ddd/README.md)

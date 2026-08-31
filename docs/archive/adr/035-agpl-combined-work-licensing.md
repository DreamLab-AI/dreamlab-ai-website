# ADR-035: AGPL Combined-Work Licensing Posture (§13 Network Source)

## Status: Accepted

## Date: 2026-06-11

## Context

The dreamlab-ai-website repository contains two licensing surfaces that the
2026-06-11 ecosystem audit found were not cleanly separated. Anomaly R1 in
[the forum overlay anomaly register](../architecture/00-forum-overlay-anomaly-register.md)
recorded that `forum-config/Cargo.toml` declared `license = "Proprietary"` while
statically linking the **AGPL-3.0-only** `nostr-bbs-*` kit crates from the
upstream `nostr-rust-forum` repository, with no `LICENSE` file present anywhere.
That declaration was legally incoherent: a combined work that statically links
AGPL-3.0-only crates inherits AGPL-3.0-only; calling it "Proprietary" does not
change the obligation.

The repository is genuinely two products. The branded React/WASM marketing site
(everything outside `forum-config/` and the forum surfaces) is proprietary
DreamLab work — the root `package.json` is `UNLICENSED`. The forum surfaces are a
combined work of the AGPL kit. AGPL §13 adds a network-interaction clause to
GPL §5: users who interact with the combined work **over a network** are entitled
to the corresponding source. The audit needed a recorded posture that names which
surfaces fall under AGPL, where the corresponding source lives, and why the §13
offer stands even though DreamLab authors the kit.

## Decision

Adopt and record the following combined-work licensing posture. (The audit
already applied this posture in `forum-config/Cargo.toml`
(`license = "AGPL-3.0-only"`), `forum-config/LICENSE` (full AGPL-3.0 text), and
the root [`README.md`](../../README.md) §Licence. This ADR is the decision of
record behind those changes.)

### 1. Two surfaces, two licences

- **Branded React site — proprietary.** The React/WASM application outside
  `forum-config/` and the forum surfaces. Copyright 2024-2026 DreamLab AI
  Consulting Ltd, all rights reserved; root `package.json` marked `UNLICENSED`.
- **Forum surfaces — AGPL-3.0-only.** Three things constitute the combined work:
  the `forum-config/` operator overlay (which statically links the AGPL kit
  crates), the **deployed Cloudflare workers** (auth, pod, relay, preview,
  search — built from the kit), and the **forum-client** (the Leptos WASM forum
  UI). All inherit AGPL-3.0-only.

### 2. §13 against the kit itself is moot, but the offer still stands

DreamLab **authors** the `nostr-rust-forum` kit. AGPL §13's purpose is to grant
*downstream network users* access to source they could not otherwise obtain;
DreamLab cannot be its own non-compliant downstream against its own kit. So §13
against the kit as a whole is moot in the trivial sense.

The offer nonetheless stands and is honoured, because the **pod-worker statically
links upstream `solid-pod-rs`** (AGPL), which DreamLab does not solely author.
The visible network-source offer is therefore a real obligation, not a courtesy.
Treating the whole forum surface as AGPL-3.0-only with a live source offer is the
correct and simplest posture — see the solid-pod-rs aggregation treatment in the
agentbox `docs/developer/licensing.md` for the parallel analysis.

### 3. Canonical source and overlay source

- **Canonical source** of the kit crates is the upstream
  [`nostr-rust-forum`](https://github.com/DreamLab-AI/nostr-rust-forum) repository,
  pinned at the rev recorded in [`forum-config/Cargo.toml`](../../forum-config/Cargo.toml)
  (currently `25ca8a1`; the pin is governed by [ADR-038](038-kit-ref-pin-governance.md)).
- **Overlay source** — the DreamLab-authored operator layer (branding, config,
  worker shims, wrangler manifests) — lives in
  [`forum-config/`](../../forum-config/) and is covered by
  [`forum-config/LICENSE`](../../forum-config/LICENSE).

A network user of any forum surface obtains the corresponding source by following
the pinned upstream rev plus the in-repo `forum-config/` overlay.

## Consequences

### Positive

- The licence declaration is now legally coherent: combined work = AGPL-3.0-only,
  with a named, resolvable source offer (upstream rev + `forum-config/`).
- The proprietary marketing site and the AGPL forum surfaces are cleanly
  separated, so neither contaminates the other's licence.
- The §13 obligation is honoured at its real root (the `solid-pod-rs` link in
  pod-worker), not merely asserted.

### Negative / Trade-offs

- Any future code that crosses the boundary — pulling forum-surface (AGPL) code
  into the branded React site, or vice versa — must be reviewed for licence
  contamination. The boundary is `forum-config/` + the deployed workers +
  forum-client on the AGPL side; everything else proprietary.
- The source offer is only as current as the pinned rev. ADR-038 governs pin
  advancement so the offer cannot silently point at stale source.

### Neutral

- This ADR records an audit decision already reflected in the tree
  (`forum-config/Cargo.toml`, `forum-config/LICENSE`, root `README.md` §Licence).
  It adds no new obligation beyond making the rationale citable.

## Related Decisions

- [ADR-028](028-solid-pod-rs-agpl-boundary.md): Solid Pod RS AGPL boundary — the
  upstream-linking analysis this ADR builds on.
- [ADR-038](038-kit-ref-pin-governance.md): Kit-ref pin governance — keeps the
  §13 canonical-source pointer current.
- agentbox `docs/developer/licensing.md`: the solid-pod-rs aggregation treatment
  this posture mirrors.

## References

- [GNU AGPL-3.0 §13](https://www.gnu.org/licenses/agpl-3.0.en.html)
- [`forum-config/LICENSE`](../../forum-config/LICENSE)
- [`forum-config/Cargo.toml`](../../forum-config/Cargo.toml)
- [Root README §Licence](../../README.md)
- [Forum overlay anomaly register, R1](../architecture/00-forum-overlay-anomaly-register.md)

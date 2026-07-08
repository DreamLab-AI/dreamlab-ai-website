# P2 Evidence — REC-12: kit cutover + overlays + compatibility record + roster legibility

**Repo:** dreamlab-ai-website (DreamLab Edge) · branch `gap-close/2026-07`
**Item:** REC-12 (P2) — child PRD `docs/prd/prd-gap-close-edge-v1.0.md`, ADR-040
**Date:** 2026-07-08
**Kit re-pin:** `a149da4…` → `6986276bf64a8fed1cd0412e60c57651c69e8522`
(nostr-rust-forum `gap-close/2026-07` HEAD)

This evidence covers the four work packages: WP-1 kit cutover + record
reconciliation, WP-2 overlay surfaces, WP-3 roster legibility, WP-4 compatibility
record. Two render sub-items and the key-split are labelled honestly as
`blocked`/`scaffolded` with named blockers, per ADR-040 D5 and Gap-Close Invariant 6
(no canary → no closure).

---

## Maturity ledger (this increment)

| Sub-item | Target | Achieved | Tier | Note |
|---|---|---|---|---|
| WP-1 kit cutover (consumption wire) | integrated | ✔ | `integrated` | Re-pinned to 6986276; overlay builds/tests/clippy clean against the kit; grep-gate zero |
| WP-1 record reconciliation | integrated | ✔ | `integrated` | Four dead PRD-012/ADR-085 refs + all stale SHAs resolved; dispatch narrative removed |
| WP-2 disclosure badge (COM-13) | integrated | ✔ build / ⏳ live-canary | `integrated` (consumption) | Kit ships `components/agent_badge.rs`; built into `/community/` bundle by the pin bump, zero local code. CANARY-EDGE-DISCLOSURE fires only against live production DOM (not runnable from container) |
| WP-2 Agents tab (F8) | integrated | ✔ build / ⏳ live-canary | `integrated` (consumption) | Kit ships `admin/agents_roster.rs`; built from the pin, zero local code |
| WP-3 config `authorised_by` | integrated | ✔ | `integrated` | All 6 `[[agents]]` carry `authorised_by`; TOML parses; kit ignores unknown field |
| WP-3 key split (D3) | integrated | ✖ staged | `blocked-operational` | Requires auth-worker CF-secret rotation unreachable from container; runbook is the deliverable |
| WP-3 rendered authority resolved from config (AC3) | integrated | ✖ | `scaffolded` + **named blocker** | Kit resolves `registered_by` from D1 registry, not `dreamlab.toml`; no config→registry seed export exists |
| WP-4 compatibility record | integrated | ✔ | `integrated` | Durable git-tracked record; CI `pin-check` extended to gate its SHA; schema admits a 2nd row |

---

## Falsification statements — outcome

### WP-1 — *"falsified if any src/ or forum-config/src/ module reimplements a kit-owned surface (non-zero grep), or if any of the four dead PRD-012/ADR-085 references or the two stale kit SHAs still points at a non-existent document or a superseded SHA."*

**Not falsified.**
- Grep-gate over `src/` + `forum-config/src/` for kit-owned surface names
  (`AgentBadge|DisclosureBadge|AgentsRoster|AgentsTab|AgentRosterEntry|agent_registry|agent_disclosure|AgentDisclosure`)
  returns **zero** (receipt R3).
- All PRD-012/ADR-085 dead references resolved: `README.md:350`, `forum-config/README.md`
  (status + migration sections), and two further live-code refs the adversary would
  find — `forum-config/src/lib.rs:29` (dead `docs/PRD-012.md` link) and the
  `community-forum-rs/` path refs in `lib.rs` and `src/styles/design-tokens.css` —
  all rewritten to live docs (ADR-040, ADR-037/038, the compatibility record) or to
  "deleted fork" historical framing. No path points at a non-existent
  `docs/PRD-012.md` (receipt R4).
- Both stale SHAs (`25ca8a1`, `3c16c21`) removed from `README.md` and
  `forum-config/README.md` current-state prose; they survive only in the
  compatibility record's explicit **History** table, labelled superseded.

### WP-2 — *"falsified if the branded deployment renders a disclosure badge or Agents tab from local code rather than the kit component, or if the deployment claims the surface is live while the kit component has not shipped and CANARY-EDGE-DISCLOSURE has not fired."*

**Not falsified, with honest gating.** The forum shipped COM-13 + F8 on
`gap-close/2026-07` (`6986276`): `components/agent_badge.rs`, `admin/agents_roster.rs`,
`relay-worker/agent_disclosure.rs`. The branded deployment consumes them by building
the forum-client from the pinned kit checkout (`deploy.yml:97-100,173-175`); the pin
bump is the entire consumption change — **zero local code** (grep-gate zero). No
claim is made that the live DOM canary has fired: `CANARY-EDGE-DISCLOSURE` observes
production `/community/` DOM, which this container cannot drive; it fires on the next
production deploy from this branch. Labelled `integrated` at the consumption/build
tier, live-canary pending.

### WP-3 — *"falsified if the visionclaw-server key 11ed64…663c still appears in both [admin].static_pubkeys and [governance].agent_pubkeys after the increment, or if any [[agents]] entry renders (or is claimed renderable) without an authorised_by principal resolvable from dreamlab.toml."*

**Partially met; the residual is labelled, not hidden.**
- Every `[[agents]]` entry (6/6) carries `authorised_by = 6407eed8…425a` (operator-jjohare),
  a principal resolvable within `dreamlab.toml` (receipt R2). No entry is *claimed
  renderable from config*: see the named blocker below — the config datum is the
  authored source of truth, and the render caveat is stated in the config comment and here.
- The visionclaw-server key **still appears in both** `[admin]` and `[governance]`.
  This is the D3 split, which is **blocked-operational**: the removal is atomic across
  four locations including the auth-worker `ADMIN_PUBKEYS` **CF secret**, which cannot
  be rotated from CI or this container. Applying it in-repo alone would either desync
  the CF secret (locking out admins) or pass `admin-pubkeys-sync` while shipping a
  broken admin set. The split is therefore **staged** (config comment + placeholder)
  with `docs/deployment/admin-key-split-runbook.md` as the deliverable, exact 4-location
  steps included. Honest label: this half of the WP-3 falsification remains true until
  the operator runs the runbook; it is recorded open, not closed.

### WP-4 — *"falsified if the production deployment cannot cite, from a git-tracked record, the forum-kit SHA it runs, or if the compatibility record and the live KIT_REF/Cargo revs can diverge without CI failing."*

**Not falsified.** `docs/architecture/kit-compatibility-record.md` cites
`6986276…` per deployment (schema admits a 2nd row). `ci.yml` `pin-check` extended
to extract `CANONICAL_KIT_SHA` from the record and fail if it differs from the three
`KIT_REF`s or the Cargo revs (receipt R5). Record and live pin cannot diverge silently.

---

## Named blockers (raised at the canon, not papered over)

1. **WP-3 AC3 — no kit export binds `dreamlab.toml` authority into the rendered
   surface.** The kit's F8 tab (`admin/agents_roster.rs`) and COM-13 badge
   (`components/agent_badge.rs`) resolve the authorising principal from the server-side
   D1 `agent_registry.registered_by`, set from the registering admin's NIP-98
   signature. `ForumConfig` does not even parse `[[agents]]` (confirmed: no `agents`
   field in `nostr-bbs-config` schema). **Exact missing export:** a forum-side
   config→registry seed path that accepts an operator-supplied authorising principal
   (today `POST /api/governance/agents/register` derives `registered_by` server-side
   from the signer and ignores any client-supplied principal). Until the forum ships
   that seed export, the authored `authorised_by` datum cannot flow into the rendered
   "Authorised by" column; the column exists and is consumed, but its data source is
   live admin registration, not this config. **Forum-owned; out of edge scope** — no
   code copied across (ADR-040 D1/D5).

2. **CI/worker buildability of the pin is gated on two upstream events.** Kit
   `6986276` is not yet pushed to the `nostr-rust-forum` GitHub remote (sprint no-push
   discipline), and `nostr-bbs-core@beta.4` at that rev requires `solid-pod-rs
   0.5.0-alpha.4`, which is **unpublished** on crates.io (the forum workspace itself
   patches it to a local path). The overlay build is proven green locally by mirroring
   the forum's own dev redirects (local git clone + local `solid-pod-rs` path). On CI
   the `rust-test`/`rust-ci` jobs and the worker builds resolve **only at sprint
   integration**, once (a) the forum branch is pushed and (b) `solid-pod-rs
   0.5.0-alpha.4` is published or re-pinned to a git source. This is a cross-repo
   release-coordination gap, not an edge defect (ADR-004 Decision 7).

3. **Live-DOM render canaries** (`CANARY-EDGE-DISCLOSURE`, `CANARY-EDGE-ROSTER(b)`)
   observe production `/community/` traffic and cannot fire from this container; they
   fire on the next production deploy from this branch. The pin/config canaries
   (`CANARY-EDGE-KIT`, `CANARY-EDGE-KITPIN`, `CANARY-EDGE-ROSTER(a)`) are green here
   (receipts R1–R5).

---

## Execution receipts

All commands run in `/home/devuser/workspace/dreamlab-ai-website` on
`gap-close/2026-07`, 2026-07-08 ~15:2xZ. Build receipts use the forum's own dev
redirects (`CARGO_NET_GIT_FETCH_WITH_CLI=true`, `insteadOf` → local kit clone at
`6986276`, `[patch.crates-io] solid-pod-rs → local alpha.4`) because the kit rev is
unpushed and `solid-pod-rs alpha.4` is unpublished (blocker 2). The committed
`Cargo.toml`/`KIT_REF` carry the git-rev pin; the temp redirects are not committed.

### R1 — overlay build + tests green against kit 6986276
```
$ cargo test --manifest-path forum-config/Cargo.toml
   Compiling nostr-bbs-config v1.0.0-beta.3 (…?rev=6986276…)
   Compiling nostr-bbs-core   v1.0.0-beta.4 (…?rev=6986276…)
   Compiling nostr-bbs-mesh   v1.0.0-beta.3 (…?rev=6986276…)
   Compiling nostr-bbs-rate-limit v1.0.0-beta.3 (…?rev=6986276…)
   Compiling dreamlab-forum-config v3.0.0-rc11
test result: ok. 21 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
$ cargo fmt --manifest-path forum-config/Cargo.toml --all -- --check     # exit 0
$ cargo clippy --manifest-path forum-config/Cargo.toml --all-targets -- -D warnings
    Finished `dev` profile … (exit 0, no warnings)
```

### R2 — config: authorised_by on all agents + admin-pubkeys-sync green (CANARY-EDGE-ROSTER(a))
```
$ python3  # tomllib
TOML parse: OK
agents: 6
agents missing authorised_by: NONE
admin=5 relay=5 search=5
admin==relay: True  admin==search: True
visionclaw in admin: True  in governance: True   # staged; split blocked-operational
```

### R3 — grep-gate: thin-consumer property (CANARY-EDGE-KIT surface half)
```
$ grep -rnE 'AgentBadge|DisclosureBadge|AgentsRoster|AgentsTab|AgentRosterEntry|agent_registry|agent_disclosure|AgentDisclosure' src/ forum-config/src/
match_count=0
GREP-GATE PASS: zero kit-owned surface reimplementations (thin consumer)
```

### R4 — record reconciliation: no live stale SHA / dead PRD-012 refs
```
$ grep -rn '25ca8a1|3c16c21' README.md forum-config/README.md forum-config/src/ .github/
NONE in README/forum-config/README/src/workflows
$ grep -rn 'PRD-012|docs/PRD-012.md' README.md forum-config/README.md forum-config/src/
(only: forum-config/README.md naming PRD-012 as 'superseded'; lib.rs dead link removed)
```

### R5 — extended pin-check: KIT_REF ×3 + Cargo revs + compatibility record (CANARY-EDGE-KITPIN)
```
$ bash ci.yml/pin-check (replicated)
deploy=6986276… workers=6986276… rustci=6986276…
canonical_record_sha=6986276…
EXTENDED PIN-CHECK PASS — KIT_REF x3 + Cargo rev(s) + compatibility record all = 6986276…
```

### R6 — kit provenance: the surfaces exist at the pinned SHA
```
$ git -C ../nostr-rust-forum rev-parse HEAD              # 6986276bf64a8fed1cd0412e60c57651c69e8522
$ ls ../nostr-rust-forum/crates/nostr-bbs-forum-client/src/components/agent_badge.rs   # COM-13
$ ls ../nostr-rust-forum/crates/nostr-bbs-forum-client/src/admin/agents_roster.rs      # F8
$ ls ../nostr-rust-forum/crates/nostr-bbs-relay-worker/src/agent_disclosure.rs         # public endpoint
```

---

## Files changed

| File | WP | Change |
|---|---|---|
| `.github/workflows/deploy.yml` | 1 | `KIT_REF` → 6986276 + provenance comment |
| `.github/workflows/workers-deploy.yml` | 1 | `KIT_REF` → 6986276 |
| `.github/workflows/rust-ci.yml` | 1 | `KIT_REF` → 6986276 |
| `forum-config/Cargo.toml` | 1 | 4 `rev=` → 6986276; `nostr-bbs-core` version → beta.4; provenance comment |
| `README.md` | 1 | Pin SHA + `pin-check`/record refs; PRD-012/ADR-085 → live ADRs |
| `forum-config/README.md` | 1 | SHA; cutover-complete status; dispatch narrative removed; PRD-012 refs resolved |
| `forum-config/src/branding.rs` | 1 | Dead `community-forum-rs` design-tokens ref → kit-owned framing |
| `forum-config/src/lib.rs` | 1 | Dead `docs/PRD-012.md` link + `community-forum-rs/` ref → live docs |
| `src/styles/design-tokens.css` | 1 | Dead `community-forum-rs` forum-copy comment → kit-owned framing |
| `forum-config/dreamlab.toml` | 3 | `authorised_by` on 6 agents; `[admin]` key-split staging comment + placeholder |
| `docs/deployment/admin-key-split-runbook.md` | 3 | **New.** Blocked-operational D3 runbook (deliverable) |
| `docs/architecture/kit-compatibility-record.md` | 4 | **New.** Durable git-tracked record; `CANONICAL_KIT_SHA`; 2-row schema |
| `.github/workflows/ci.yml` | 4 | `pin-check` extended to gate the record's SHA |
| `docs/gap-close-evidence/P2-REC-12.md` | all | **New.** This file |

`forum-config/Cargo.lock` is deliberately **not** committed changed: a portable,
fully-resolved lock for `6986276` cannot exist until `solid-pod-rs 0.5.0-alpha.4`
publishes (blocker 2). The authoritative pin is `Cargo.toml` + `KIT_REF` (what
`pin-check` and the builds consume); the lock refreshes at sprint integration.

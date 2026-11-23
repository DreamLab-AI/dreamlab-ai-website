---
id: ADR-2012
title: DreamLab's first agent board is ontology review, activated only after the admin key split and panel binding
date: 2026-11-23
decision_status: proposed
implementation_status: none
activation_status: inactive
supersedes: []
superseded_by: []
verified_commit: 39d7043f
owner: jjohare
review_trigger: the operator running docs/deployment/admin-key-split-runbook.md; forum ADR-2024 or ADR-2035 changing status; the kit pin moving to a release that contains ADR-2035
repo: dreamlab-ai-website
evidence_class:
acceptance_boundary:
---

# ADR-2012 — DreamLab's first agent board is ontology review, activated only after the admin key split and panel binding

## Context
- Forum ADR-2035 (proposed) turns a kanban board into a governed agent workflow: an agent column dispatches, and the agent's result returns as a 31402 case. Forum ADR-2013 already defines the ontology-governance panel, which is staged and whose 31400 is unpublished.
- DreamLab enables kanban in the `family` and `dreamlab` zones and governance in `[features]`. It registers `knowledge-enrichment-agent` both as a governance publisher and as an `[[agents]]` row (`forum-config/dreamlab.toml` `[governance]`, `[[agents]]`).
- The `visionclaw-server` service key is also the primary forum admin (`dreamlab.toml:40-55`, legacy ADR-040 D3 / WP-3 AC2). The relay's self-review guard refuses projection of a decision by a case's own creator. But `response_admission` admits any admin for any case (`nip_handlers.rs:307`), so an agent service key can decide other agents' cases. The split is staged in `docs/deployment/admin-key-split-runbook.md` because it is a four-location change that includes a CF secret.
- The `dreamlab` zone is end-to-end encrypted, and only JunkieJarvis holds its key (`agent_keys`, ADR-2016). An agent dispatched from a board in that zone must be able to read the card.

## Decision
1. DreamLab's first agent board is **ontology review**: one board whose agent column names `knowledge-enrichment-agent` and whose approval column carries operator-declared `tp-verifiability`, `tp-reversibility` and `tp-stakes`. The board is authored by the operator key, never the agent. It reuses the ADR-2013 panel's Promote, Demote and expiry semantics for what an approval means.
2. Activation needs all of these, in order:
   (a) the admin key split has been run, so no agent service key holds admin authority;
   (b) forum ADR-2024 runs at `enforce`, with the ontology panel published by the operator key and bound to the agent;
   (c) the forum findings AB-INTENT-ACTOR-FROM-CARD-DTAG and FORUM-KANBAN-APPROVAL-COL-CLIENT-ONLY are closed, and the kit pin contains ADR-2035;
   (d) a probe agent distinct from `knowledge-enrichment-agent` is registered on the panel (`probe-agent`), with the calibration rate left at the 0.1 default;
   (e) at least one named `reviewer` exists besides the admin, so cases can be delegated.
3. The board lives in the `family` zone unless the agent is granted the `dreamlab` zone key. Choosing the zone is part of activation, not this record.
4. Prompt versions and run records go in the agent's pod on the native tier (`[native_pod]`, `git_enabled = true`), so each write carries a git-mark (solid-pod-rs ADR-2012).
5. Success is one ontology change that runs end to end from a card move to an `applied` receipt (ADR-2010 stages), with the probe catch rate reported for the first 30 days. Until then nothing on the website claims that DreamLab runs governed agent workflows.

## Consequences
- DreamLab becomes the first real deployment of the forum's agent-workflow loop, on the governance consumer that is already documented (ontology review).
- Activation depends on the key split, which only an operator can run, so this record can't go live from CI.
- Config changes on activation touch the four synced locations (ADR-2005: hand-synced mirrors). They land in one pull request with the runbook evidence.
- Proposed, so it does not amend IDENTITY-zones.md. The agent and reviewer roster changes are written there on acceptance.

## Verification
- At `39d7043f`: `dreamlab.toml:40-55` documents the unsplit key and the runbook. The `[governance]` and `[[agents]]` sections list `knowledge-enrichment-agent`. The `family` and `dreamlab` zones set `kanban = true`. The `dreamlab` zone sets `agent_keys = true`.
- The forum, at `c8b8c4e`, holds `response_admission` (admin admits any case) and the `CaseError::SelfReview` guard in core governance.
- `implementation_status: none`.

---
id: ADR-2009
title: Run the poker table's house seat as a DreamLab agent, settle hands in DREAM on sidestr:dreamlab, and schedule games on the calendar
date: 2026-10-03
decision_status: accepted
implementation_status: complete
activation_status: live
supersedes: []
superseded_by: []
verified_commit: 2ef7ead
owner: jjohare
review_trigger: the kit's protocol VERSION moving (house service and client must repin together); a chain with value behind the table; the daily cap or stakes changing; a relay reseed (the house key's whitelist row is dropped); a second house seat or operator
repo: dreamlab-ai-website
domain: IDENTITY-zones.md
lineage: builds on ADR-2008 (gift-wrap transport), kit ADR-2015 (member wallets, DREAM) and kit ADR-2020 (the table itself); scope note docs/sprint/librepoker-forum-table-scope.md.
---

# ADR-2009 — Run the poker table's house seat as a DreamLab agent, settle hands in DREAM on sidestr:dreamlab, and schedule games on the calendar

## Context

The kit's practice table (pin 457cb8e) played chips worth nothing; its money phase waited for a
house that holds its own key, since a browser-driven bot's cards and key are the member's to read.
The operator asked for DREAM play, game times on the calendar, and invitations to real players. The
kit now provides all three (kit ADR-2020 at 2ef7ead): a house service, hands between members with
the house dealing, and NIP-52 poker events with invitations. This record is the operator's overlay:
which key is the house, where it runs, how it is funded, and what the pins carry.

## Decision

1. **The house seat is the registered agent `poker-citizen`**, pubkey
   `d4bda43a…86df9`, a row in `forum-config/dreamlab.toml` `[[agents]]` (cohorts `dreamlab`, `agent`,
   authorised by operator-jjohare), whitelisted on the relay so members' gift wraps to it are
   admitted, with a kind-0 profile ("The House (poker)") so the forum names it. Its key lives only in
   the agentbox at `~/workspace/sidestr/agents/poker-citizen.key`.
2. **It runs in the agentbox** as `nostr-bbs-poker-citizen` built from the kit at the website's
   `KIT_REF` (agentbox `lib/poker-citizen.nix`, `[program:poker-citizen]`, gate
   `[poker_citizen].enabled`), against the local `sidestr:dreamlab` producer. The service and the
   client must be the same kit commit: moving `KIT_REF` moves both.
3. **The client is told the house through `[poker].citizen_pubkey`**, hand-mirrored into
   `deploy.yml` `POKER_CONFIG_JSON` (ADR-2005) and read by the forum as
   `window.__ENV__.POKER_CONFIG`. With it the DREAM table is offered beside the practice table; without
   it the practice table alone.
4. **Funding is a treasury provision**, not a faucet: the house holds DREAM to cover buy-ins and
   plain sats for its settlement fees (first provision 2026-10-03: 50,000 DREAM, 4,000 sats), and
   pays out at most `daily_cap` (20,000 DREAM) a day. Fees it pays collect at the producer and are
   recycled by the operator like the faucet's.
5. **Scheduled games are the kit's**: an admin or moderator creates a kind-31923 event tagged
   `poker` with invited players from `/table`; each invitee gets a NIP-17 DM. No new overlay surface.

## Consequences

Members can play for DREAM from `/community/table` now; the table's economics are the chain's (about
200 sats of fee per settled hand from a chain holding ~30,000). The house is the operator's agent
and sees both members' cards when it deals for them. A relay reseed drops the house's whitelist row:
re-run `scripts/seed/whitelist-admin-recipient.mjs --pubkey=<house> --cohorts=dreamlab,agent` and
`scripts/seed/provision-poker-citizen.mjs`. Until the agentbox image is rebuilt the service runs
from a release build in a tmux session (`poker-citizen`); a rebuild bakes it.

## Verification

- Kit pins: `KIT_REF = 2ef7ead627e14668503eb286c6fdc23b5a8d7581` in `deploy.yml`,
  `workers-deploy.yml`, `rust-ci.yml`; `CANONICAL_KIT_SHA` in
  `docs/architecture/kit-compatibility-record.md`.
- `forum-config/dreamlab.toml` `[poker].citizen_pubkey` equals `deploy.yml` `POKER_CONFIG_JSON`'s.
- `GET /api/check-whitelist?pubkey=d4bda43a…` → `isWhitelisted: true`, cohorts `dreamlab`, `agent`.
- `sidestr-agent --key-file ~/workspace/sidestr/agents/poker-citizen.key assets` shows DREAM held.
- `node scripts/seed/test-poker-citizen.mjs` with a whitelisted, funded test key plays one hand
  against the live house over the production relay and verifies the commitment, the nonce and the seed.

# LibrePoker in the DreamLab forum — scope

> **2026-10-03 update.** Rail 2 (the home table on `sidestr:dreamlab`, DREAM)
> is built and live: kit ADR-2020 (`nostr-bbs-poker`, `nostr-bbs-poker-citizen`)
> and website ADR-2009 (the `poker-citizen` agent, its funding, the pins). It
> goes further than §5.2's v1b: the house deals hands between two members too,
> and games are scheduled on the calendar with DM invitations. Rail 1 (txbt4
> through LibrePoker's teller) and the LibrePoker document federation (§5.5)
> remain open.

**Status:** scoped and **decided by the owner on 2026-10-02**: build in the
kit; the money rail is **BLAKE2b testnet4 (txbt4) read from the Dell node,
held and spent by the existing forum wallet**; `sidestr:dreamlab` sats/DREAM
is the second asset choice. Written against website `8ab4ab4` (kit pin
`341c5d2`), kit checkout `~/workspace/nostr-rust-forum`, and the libre-poker
org at the commits listed in §2. No ADR is minted yet: the 2026-09-21 planning
cycle (RuVector `project-state-current-focus`) forbids new decision records
until 20 October 2026; the kit ADR and the thin consumer ADR here are the
first task of Phase 1 (§6). Phase 0 and the Dell runbook (§5.7) do not need
one; the txbt4 node itself is already live on the Dell.

**Ask (verbatim):** a forum user "table" option, inline with the LibrePoker
ecosystem as a federated member, without bothering users about the details,
using their choice of tokens from their wallets. Edge level or kit level is the
open question.

---

## 1. Recommendation in one paragraph

Build it **in the kit** (`nostr-rust-forum`) as an off-by-default feature,
exactly as the member wallet (ADR-2015) and the BBS client were built, and let
this overlay switch it on and supply the venue identity through
`forum-config/dreamlab.toml`. The money is **txbt4 sats in the member's own
forum wallet**: the key they signed in with is already a taproot address on
txbt4; the wallet gains a txbt4 view read from the **Dell node** (blaketestnode
address index, the backend kit ADR-2019 already prefers) and signs txbt4
spends with `sidestr-wallet`, which already knows the Knots unified sighash.
That puts members on the **same chain as LibrePoker's teller and cashier**, so
"federated member" is literal: the forum does the teller `join` silently and
funds the seat with one spend from the member's address; each hand settles as
a signed kind-3700 transfer on LibrePoker's ledger, free and instant; the
member withdraws back to their own key with one click or never, their choice.
The **second asset choice** is `sidestr:dreamlab` sats or DREAM, settled as a
sidestr transfer with a `hand:<handRoot>` record through the spend path that
already exists. Publish a signed `Table` heartbeat so the DreamLab table
appears in the LibrePoker lobby, and `Hand` and `Link` documents so members'
careers accrue to their keys. Reuse LibrePoker's AGPL JavaScript engine, brain
and bot chassis as-is (thin wrappers over a 27 MB strategy table and a solver;
porting them is a rewrite, not a port). Port to Rust only the pure rules: the
teller client half and the ~40-line settlement.

---

## 2. What LibrePoker is (verified from source, 2026-10-02)

Org: <https://github.com/orgs/libre-poker/repositories>. All AGPL-3.0 except
`schema` (CC0). Author is Melvin Carvalho, whose Web Ledgers, teller, sidestr
and blaketestnode work this estate already ports and pins.

| Repo | Role | Last push | Notes |
|---|---|---|---|
| `sats` | **Heads-up limit hold'em for test sats over a Web Ledgers teller on txbt4.** | 2026-10-02 | The direct analogue of the ask. `lib/sats.mjs` (settlement rules, ~40 lines, pure); `sats.js` (wiring, 294 lines). Bot key travels in the URL fragment: "a demo of the rails", anyone with the link can drain the bot. |
| `play` | The trainer at librepoker.org/play: engine, CFR ladder, exact river solver, rated Glicko-2 matches, `cash.html`, `lobby.html`. | 2026-08-30 | No build step, no server. Engine modules vendored from `engine`. |
| `engine` | Pure hold'em state machine, CFR training, Cepheus preflop graft, river subgame solver, honesty rigs. | 2026-08-16 | JS. The 27 MB strategy table is fetched once per session. |
| `schema` | JSON-LD vocabulary and object specs: Hand, Match, Ledger, Settlement, Link, Brain, **Table**; protocols Claims and Pay-to-URI. | 2026-08-25 | CC0. "If an implementation and this repo disagree, this repo is right." |
| `croupier` | Game-blind dealing service: sealed envelopes, Merkle commitment, consent-gated reveal. Spec v0; implementation (a JSS plugin) to follow. | 2026-08-25 | The one trusted component for human-vs-human casual play. |
| `bots` | The citizen fleet: pluggable bots on a chassis (`lib/seat.js`) that watches the lobby, answers summons, verifies croupier proofs. Includes `cashier/` (claims-driven book on mempool.space testnet4). | 2026-08-25 | pm2 fleet. Bots "need nobody's permission, they are just clients". |
| `brains` | Versioned immutable strategy tables. | 2026-08-21 | |
| `hand` | Pure renderer for a Hand document. | 2026-08-16 | |
| `libre-poker.github.io` | Landing + constitution. | 2026-08-16 | |
| `librepoker` | Empty description, JS. | 2026-08-17 | Not inspected. |

Dependency it pins: `solidpayorg/teller` (kind 30333 ledger addressable by its
genesis hash, kind 3700 `join|withdraw|transfer` requests, deposit address =
operator point + `tagged("webledgers/deposit", hash‖account‖nonce)`, chain data
from mempool.guide testnet4, payouts signed by the operator by hand).

**Constitution invariants that bind us if we federate** (librepoker.org/constitution.html):
rake-free forever; libre; no server owns the truth; provable fairness or honest
absence; machines are citizens, flagged; identity is a nostr keypair; the
measurement is sacred. §6: human-vs-human **rated** play is blocked on mental
poker; until then it is casual and unrated. §7: "Not a gambling site. No
deposits, no cashouts, no chips worth fiat." Our testnet-only lock (ADR-2015 D1)
and a valueless DREAM keep us on the sport side of that line; any chain with
value reopens ADR-2015 and triggers the ADR-124 P21 owner-plus-legal gate
(UK Gambling Act territory). This scope is **testnet and DREAM only**.

**What "federated member" means in their vocabulary.** There is no membership
registry. A venue federates by (a) publishing a signed `Table` document
(`root`, `name`, `url`, `game`, `stakes`, `host` DID, refreshed as a heartbeat
every ~5 minutes) to the croupier archive that `play/lobby.html` reads
(`https://melvin.me/croupier/archive?type=Table`, reference lobby marks a table
stale after 15 minutes); (b) emitting `Hand`, `Match` and `Link` documents in
the shared `@context` so boards and careers recompute from them; (c) honouring
the constitution. A lobby "may filter by hosts it recognizes", so being listed
on librepoker.org is Melvin's call, not a protocol step.

---

## 3. What we already have (the sats stack)

| Capability | Where | State |
|---|---|---|
| Every member's key is a wallet on `sidestr:dreamlab` (tbtc4 parent); npub = address; browser validates the chain from a mirror; spends signed by passkey/local key or the Podkey extension (`window.nostr.sidestr`) | kit `crates/nostr-bbs-forum-client/src/wallet/{mod,chain,extension,relays}.rs`, ADR-2015 | complete, **live** on dreamlab-ai.com (`deploy.yml:77 SIDESTR_WALLET: 'on'`) |
| DREAM asset (`issue:DREAM:0`, supply 1,000,000, decimals 0) plus plain sats; `send_dream`, `send_sats`, `provision`, faucet (kind 23501) | same; `wallet/mod.rs:539-684` | live |
| Tips as chain records: a DREAM transfer with `tip:nostr:<event id>`; totals are what the chain says | `components/tip_button.rs`, ADR-2015 D5 | live |
| Rust sidestr crates: core 0.4, wallet 0.5.1 (bip21, external signer), nostr 0.4, agent 0.4, round 0.3, **hitch 0.2.0** (Lightning-shaped two-party channel kernel: funding, commitments, HTLCs, cooperative/force close, penalties) | crates.io, `~/workspace/sidestr-rs` | published |
| Web Ledgers in Rust: `WebLedger`, HTTP 402, MRC20, order book, AMM | `solid-pod-rs` payments.rs, trading.rs | published (0.5.0-alpha) |
| Pod-worker D1 sats ledger (`payments.rs`, 2,072 lines) | kit | **demoted** by ADR-2012: chain is the ledger; no new forum ledger, no new forum event kind |
| Agent roster with authorised_by; relay whitelist; registered agents | `forum-config/dreamlab.toml` `[[agents]]` | live |
| Mesh federation of forum instances (IS-Envelope, kind-1059 gift wrap) | kit `nostr-bbs-mesh` | shipped, unused (no second operator) |
| **Both parent chains live on the Dell (192.168.2.27).** tbtc4: `bitcoind-testnet4`, RPC :48332, wallet `sidestr-peg`, reachable from the agentbox. txbt4: Knots `knots-txbt4` (`txindex=1`) + rbitcoin, both synced to 152217 and out of IBD, RPC :48342 and P2P :48343 **loopback only** (verified on the Dell through tmux window 7, 2026-10-02) | Dell; RuVector `dell-knots-rbitcoin-txbt4-live-2026-09-30`, `dell-rbitcoin-txbt4-deployed-2026-09-30` | live; not on the LAN, no address index, no DreamLab sidestr chain on it |
| Both header families in Rust: `sidestr-header` Stock + Blake2bV2; `sidestr-wallet` signs and derives parent addresses for `tbtc4` **and `txbt4`** (`bip21.rs:332-342`, BIP 341 beside stock, Knots unified sighash beside BLAKE2b); Melvin's live `sidestr:txbt4-siding` replays as a fixture | `~/workspace/sidestr-rs` | published |
| blaketestnode `--address-index` (Esplora-shaped `/address/<addr>`, `/utxo`) merged upstream 2026-09-30 as the preferred read-only backend for the forum's chain view (kit ADR-2019) | upstream PR #1 | merged, **not deployed** on the Dell |

Governing constraints: ADR-2012 D3 (forum adds no ledger and no event kind for
value), ADR-2096 (sidestr chains are the sole value instrument; external assets
come in by peg), ADR-2099 (chain is ledger of record), ADR-2015 D1 (one chain,
one asset, testnet lock, compiled in), this repo's rule that forum behaviour
belongs upstream.

---

## 4. The placement question: edge versus kit

| | A. Edge only (this overlay) | B. Kit feature + overlay config (**recommended**) | C. Standalone agentbox service |
|---|---|---|---|
| Shape | React route or iframe at `/poker` hosting LibrePoker's `sats` page; money via LibrePoker's teller on txbt4 | `[features] poker` + `[poker]` block in the kit TOML; Leptos page at `/community/table`; settlement through the existing wallet module; overlay sets venue name, stakes, assets, bot | A JS "DreamLab venue" (bots chassis + cashier) announced to the LibrePoker lobby; forum only links to it |
| "Forum user table option" | No: it is a website page, not a forum surface; a second sign-in | Yes: behind the same auth, the same nav, the same wallet | No |
| "Without bothering users" | Fails: teller needs Join + deposit + withdraw, on a chain members hold nothing on | Passes: sign-in already yields a key that is already a wallet; Sit = one spend; no new account | Fails (same deposit problem) |
| "Their choice of tokens" | Teller is single-currency (txbt4 sats) | txbt4 sats, `sidestr:dreamlab` sats or DREAM per table, any future pinned asset | Single currency |
| Respects ADR-2012/2096/2099 | No: a second custodial ledger off-chain, on a chain we do not peg to | Yes: every hand is a chain record | No |
| Respects "forum behaviour belongs upstream" | n/a | Yes | n/a |
| Rust-first | No | Yes where it matters (settlement, config, chain); JS engine stays JS by the thin-wrapper rule | No |
| Reuse by other kit operators | None | Any operator gets a table by flipping a flag (ADR-080 D7 consumer pattern) | None |
| Cost | ~1 week | ~6 to 7 weeks for Phase 1 (§6) | ~2 weeks |

**Why not A even as a quick win:** the one thing it would prove, our members
paying into LibrePoker's teller, does not work *today*: the forum wallet is
compiled to one chain (`sidestr:dreamlab`, parent tbtc4, ADR-2015 D1), the
teller pays txbt4, and the Dell's txbt4 node is loopback-only with no address
index, so nothing in the estate can read a member's txbt4 coins yet. The
member's **key** is already a txbt4 address (`OP_1 <x-only>` is the same
script on every family), and sidestr-wallet already signs for txbt4, so the
gap is infrastructure and one wallet module, not a bridge. §5.2 makes that
the **first** rail, built in the kit, rather than a reason to go edge-only.

**What stays at the edge regardless (B):** the `KIT_REF` lockstep bump, the
`[poker]` section of `dreamlab.toml` projected into `window.__ENV__` (same
mechanism as `ZONE_CONFIG`), a `/poker` marketing redirect to
`/community/table`, the sitemap, a `poker-citizen` row in `[[agents]]`, and the
venue `Table` heartbeat secret (the venue signs as the forum operator DID).

---

## 5. Target design (B)

### 5.1 Identity and onboarding: nothing new

- A member is a 64-hex Schnorr key (ADR-2006). It is already their wallet
  address (`5120‖pubkey`). It is also a LibrePoker citizen ("identity is a
  keypair"). Nothing to register.
- First visit to `/community/table` silently publishes a `Link` document
  (`{claim:"controls-player", submitter:<display name or npub>}` signed by the
  key) so a career accrues under the name they already use in the forum.
  Opt-out in Settings, default on, surfaced as one line: "Your hands are
  signed with your key and replayable by anyone."

### 5.2 Money: one key, two rails, member's choice of asset

One member key is an address on four things today: `sidestr:dreamlab`
(`drm…`), tbtc4 itself, txbt4 itself, and any sidestr chain beside txbt4.
LibrePoker's teller and cashier pay txbt4. So the "choice of tokens" is:

| Rail | Asset | Where the hand settles | Opponent | Needs |
|---|---|---|---|---|
| **1. txbt4 table** (v1, **decided**) | txbt4 sats from the member's own key, via the forum wallet | LibrePoker's teller ledger (kind 30333): seat funded by one on-chain spend to the derived deposit address; each hand a kind-3700 `transfer`; `withdraw` back to the member's key | our citizen (same ledger) or LibrePoker's | Dell: expose txbt4 reads on the LAN (§5.7); kit: `wallet::txbt4` view + spend, and a Rust port of the teller **client** half (`lib/teller.mjs`: JCS, genesis hash, ledger check, deposit derivation `tagged("webledgers/deposit", hash‖account‖nonce)` as a pure additive tweak, request events) |
| **2. Home table** (v1b) | sats or DREAM on `sidestr:dreamlab` | one sidestr transfer per hand with a `hand:<root>` record | our citizen | nothing new in infra; wallet module exists |

Rail 1 is "federated member" in the money sense: the member deposits into a
LibrePoker ledger **with one spend from their own txbt4 address, signed by the
same key they signed in with**, and the forum does the `join` for them. The
member sees "Sit (txbt4 sats)" and a balance, nothing else. The seat balance is
custodial on LibrePoker's side, which is their rule, not ours; the forum labels
it "held by LibrePoker" and the withdrawal comes back to the member's own key.
Reef is the faucet for first txbt4 coins; the forum calls it once per key per
day exactly as `request_faucet` does for DREAM today.

Which ledger? A teller ledger is identified by its genesis hash and found on
the relays as the operator's signed kind-30333 event. The `sats` page takes
the hash **from the link** (`sats.js:25`, `SS.get('sats:ledger')`), so there is
no single "LibrePoker ledger": each operator mints one, and Melvin's demo link
names his. v1 joins a ledger whose hash the overlay pins in `[poker]`; the
plan is **Melvin's** (ask him for the hash and his operator did, decision 9),
so our members and his citizens share one book and a DreamLab seat is a
LibrePoker seat. Running a DreamLab-operated teller (we become custodian) is
out of scope (§5.6).

We do **not** need a DreamLab sidestr chain on txbt4 to be federated: the
member key is a txbt4 address as it stands. A chain beside txbt4 (level 2 under
ADR-2101, with peg sweep) stays a later, separate decision.

**Why the teller and not raw on-chain hands.** A hand every 30 seconds cannot
be an on-chain txbt4 transaction each (one block per ten minutes, fee per
hand, mempool wedging seen on 2026-09-23). The teller gives free, instant,
signed transfers with on-chain in and out; Phase 3 replaces the custodian with
a `sidestr-hitch` channel, which is the same shape without the operator.

- `[poker]` config lists the assets a table may be played in. v1: `txbt4`
  (rail 1); v1b adds `sats`, `DREAM` (rail 2). The engine counts in whole big
  blinds, so any integer asset works.
- Stakes table per asset, mirroring `sats/lib/sats.mjs` `STAKES`
  (`bb ∈ {2,10,20,100,200}`, buy-in 100 bb). The overlay picks defaults.
- **Sit** = the member reserves `buyin` from their own unspent coins (no
  transfer yet; the wallet already tracks held outpoints via `Balances::coins(script, held)`).
- **Hand end** = the loser signs **one transfer** of `|delta|` to the winner's
  script, with record `hand:<handRoot>` beside it (the exact shape of
  `tip:nostr:<id>`). Split pots produce no transfer. This is
  `sats.mjs::settlement()` ported to Rust in `wallet::poker`.
- The chain is the ledger. The page shows "balances with pending hands
  applied" from `Snapshot` + the localStorage pending list that already
  self-heals after 30 minutes (ADR-2015). A `Ledger` `handdelta` document for
  the LibrePoker archive is derived from the chain record, never kept separately.
- DREAM-carrier rule (ADR-2015 D7) applies unchanged: a sats hand never spends
  a coin carrying DREAM.

### 5.3 The opponent: a citizen that holds its own key

The `sats` page's shortcut (bot key in the URL) is disqualifying for anything
beyond a demo. The house bot must sign its own losing transfers and must not
let the hero's browser see its hole cards.

- `poker-citizen`: a LibrePoker `bots` chassis instance (JS, unchanged, pinned
  by commit) run under agentbox supervisord, wrapped by a small `sidestr-agent`
  signer that (i) holds the bot's Nostr key out of the browser, (ii) signs
  `hand:<root>` transfers when it loses, (iii) tops up from treasury under a
  daily cap. Registered in `[[agents]]` with `authorised_by = operator-jjohare`
  and the relay whitelist, like `junkiejarvis`.
- Transport for the hand itself: LibrePoker's own envelope, a signed claim in
  the `content` of a nostr event; "the event kind is not load-bearing"
  (CLAIMS.md), browsers use ephemeral 20779. Carry it over our relay as
  kind-20779 ephemeral events between the two keys. This adds **no
  forum-owned kind** (ADR-2012 D3 holds) and needs no croupier HTTP room.
- Deal fairness for heads-up vs bot: the bot runs the committed shuffle
  (`sha256` commit, reveal after) exactly as the Wardroom does; the hero's
  browser verifies the reveal with the vendored engine. Human-vs-bot needs no
  mental poker (constitution §6).

### 5.4 The page: `/community/table`

- Leptos route `/table` behind `AuthGated*`, hidden unless
  `window.__ENV__.POKER = "on"` **and** `wallet::enabled()`.
- Nav icon beside the wallet icon (`app.rs:267` pattern).
- The table UI is LibrePoker's `cash.html` skin loaded through
  `#[wasm_bindgen(module = ...)]` the way `webgpu_hero.rs:21` already loads a
  JS module; engine, ladder, river solver and strategy JSON pinned by commit
  from the CDN exactly as `sats.js:8-13` does. Rust owns: auth, wallet,
  settlement rules, pending reconciliation, config, the Link/Hand/Table
  document builders and their JCS canonicalisation (kit `nostr-bbs-mesh::jcs`
  already implements RFC 8785).
- Offline/failed-chain behaviour is the wallet's: `LoadStatus::Failed` shows
  the reason, no hand can start.

### 5.5 Federation (document layer)

- `Table` heartbeat every 5 minutes from the `poker-citizen` process (the
  thing whose death should make the table go stale), `host` = the forum
  operator DID, `url` = `https://dreamlab-ai.com/community/table`,
  `stakes` = "10/20 · sats or DREAM (sidestr:dreamlab, testnet)". Target
  archive configurable; default `https://melvin.me/croupier`.
- `Hand` documents published write-once to the same archive after each hand
  (both parties' signatures, as the schema asks), so hands render in
  `libre-poker/hand` and count on their board.
- Our own `Ledger` `handdelta` entries are derived from the chain and
  archived under the venue DID so an auditor can reconcile "sum of entries =
  chain" to the sat.
- Being **listed** on librepoker.org's lobby is a conversation with Melvin
  (lobbies filter by recognised hosts). Our table is reachable by URL and by
  any lobby pointed at our archive regardless.

### 5.6 Explicitly out of v1

- Human-vs-human **rated** play (constitution §6 blocker; needs mental poker).
- Human-vs-human **casual** play (needs a croupier; see Phase 3).
- Rake, fees, tournament fees: forbidden by invariant 1; not even configurable.
- Any mainnet chain or fiat-valued asset (ADR-2015 D1; ADR-124 P21 gate).
- Running our **own** teller ledger (DreamLab as custodian). Rail 2 joins
  LibrePoker's; the home rail is non-custodial by construction.
- No-limit (engine deals it; solver work upstream is not done).

---

### 5.7 Dell runbook: txbt4 reads on the LAN (operator, tmux window 7)

**BLAKE testnet4 is already live on the Dell** (verified through tmux window
7 on 2026-10-02 at 17:17 UTC): `knots-txbt4.service` (Knots 29.4.2,
`txindex=1`, RPC `127.0.0.1:48342`, P2P `127.0.0.1:48343`) and
`rbitcoin-txbt4.service` (rbitcoin 0.7.99, unix-socket RPC only) both at
height 152217, tip `00000000c024257a…`, out of initial block download, 14.5 GB
on disk. Both listen on loopback only; nftables (policy drop) admits LAN
traffic to 22, 8080, 8332, 48332 and 9736 and nothing else. No blaketestnode,
no address index, no Node.js on the Dell. Mainnet bitcoind and lightningd
carry real money: touch only the txbt4 services.

blaketestnode is plain JavaScript and its daemon wants an 8 GB V8 heap
(`--max-old-space-size=8192`, README line 52). The Dell has 8 GB in total,
2.3 GB available, and no Node.js. So the index does **not** run on the Dell.
The split is:

1. **Dell: Knots txbt4 RPC on the LAN. Done 2026-10-02** through tmux window
   7 (backups `/etc/knots/txbt4.conf.bak-20261002`,
   `/etc/nftables.conf.bak-20261002`). `[testnet4]` gained
   `rpcbind=192.168.2.27`, `rpcallowip=192.168.2.0/24`, an `rpcauth` user
   `txbt4read`, `rpcwhitelistdefault=0` (the local cookie user keeps full
   access) and a `rpcwhitelist` for `txbt4read` limited to chain, mempool,
   `scantxoutset`, `gettxout`, `getrawtransaction`, `testmempoolaccept` and
   `sendrawtransaction` (so the citizen can broadcast). nftables admits
   192.168.2.0/24 to tcp 48342. The password lives only in
   `/var/lib/agentbox/secrets/knots-txbt4.rpc` (0600, `user:password`); the
   Dell holds the salted hash. Verified from the agentbox: tip 152219 equal on
   Knots and rbitcoin, `getpeerinfo` refused, `scantxoutset` on a known txbt4
   taproot address answers in ~12 s over 14.2 M coins.
2. **Dell: rbitcoin Esplora. Done 2026-10-02 18:38 UTC** through tmux
   window 7, backups `/etc/rbitcoin/txbt4.conf.bak-20261002` and
   `/etc/nftables.conf.bak-20261002b`. Appended `sh_index=1` and
   `esplora_listen=192.168.2.27:3002`; nftables admits the LAN to 3002;
   `rbitcoin-txbt4` restarted. The scripthash index built in 81 s (41.9 M
   rows, 1.69 M keys) with memory flat at ~4.6 GB used of 7.9 GB.
3. **Verified from the agentbox 2026-10-02:** `/blocks/tip/hash` equals Knots
   `getbestblockhash` at 152221; `/address/<sidestr:txbt4-siding
   parentAddress>` answers in 24 ms with `funded_txo_sum` 2,500,000,000 and
   one confirmed UTXO at height 151152; `/mempool` live; a bad address is 404.
4. Record the endpoint as `TXBT4_API` (deploy.yml `[env]` → `window.__ENV__`)
   the way `SIDESTR_MIRROR` is injected.

Until step 2 exists, Knots alone already answers the two reads Phase 1 needs:
`scantxoutset start '["addr(tb1p…)"]'` (a few seconds over the 14 M-coin set)
for a member's coins, and `getrawtransaction` by txid (`txindex=1`) for
deposit confirmation. That is enough for the citizen and for probes.

The browser cannot reach `192.168.2.27` or the agentbox. For the live site
the public client reads txbt4 through a public Esplora-shaped source: Melvin's
blaketestnode instance, or a Cloudflare tunnel to the agentbox's :3337 if our
node is to be the source of truth (decision 8). The chain view validates
headers client-side either way (`sidestr-header` Blake2bV2).

### 5.8 The txbt4 read source: three real options (checked 2026-10-02)

The question "why a node in the agentbox" has a better answer than
blaketestnode anywhere. Melvin's estate and the kit already hold most of it.

**What the kit already has.** Kit ADR-2019, accepted 2026-10-02, ships
`wallet/parent.rs`: the signed-in key's `tb1p…` address on txbt4, its balance
read from an Esplora-shaped backend named by `BLAKE_TESTNET_API`, the
blaketestnode `/pair` split, and a link to blaketest for spending. It is
staged, off until the overlay sets the variable, and it refuses any backend
that is not `https://`. **Its decision 3 says the forum never signs a
parent-chain spend and that adding a send path reopens the record.** Phase 1
of this scope is exactly that send path, so the kit ADR for poker amends
ADR-2019 D3 rather than sitting beside it.

**What Melvin ships in the browser.** blaketestnode `browser/tabnode.js`
(`createTabNode({base, snapshotUrl, blocksUrl})`, then
`post({type:'coins', script})`) is the one shim behind Reef, Bight, Winch and
Hitch: a worker fetches the 830 MB fork-point UTXO snapshot into the
origin's private file system, checks its sha256 and `hash_serialized_3`,
validates every BLAKE2b block since from the mirror, follows the NIP-333
signed tip, and answers the unspent coins of a script from its own set. Reef
pins it by commit and by the loader's sha256 from jsDelivr, with the snapshot
and block file from melvin.me. Costs measured by Reef on Chromium: about
1.1 GB of storage, a minute of setup, one tab per origin runs the node and
siblings share its lock. Coins from before block 150,307 are not seen, which
is fine for keys made here. Reef broadcasts by publishing kind 23503 to
relays for "a node that serves txbt4" to pick up; that node can be ours now
that `sendrawtransaction` is on the whitelist.

**What the Dell can serve in Rust.** rbitcoin 0.7.99, already running there,
has an in-process Esplora REST server (`esplora_listen`) and the scripthash
index it needs (`sh_index=1`, "rebuilds on start"), serving `/address/{a}`,
`/address/{a}/utxo`, `/tx/{txid}`, `/blocks/tip/*` and `/mempool` from its own
validated archive. That is an address index on the Dell, in Rust, with no
new runtime and no JavaScript, which is the thing I said did not exist.

| Option | Where | Trust | Cost | Fit |
|---|---|---|---|---|
| **A. rbitcoin Esplora on the Dell** | Dell, `sh_index=1` + `esplora_listen=192.168.2.27:3002` in `/etc/rbitcoin/txbt4.conf`, nftables LAN rule, restart `rbitcoin-txbt4` | the Dell's own validated archive | one config change; index build on first start (size unmeasured on 13 GB store; the Dell has ~2.3 GB RAM free, so watch it) | the kit's `parent.rs` reads this shape today; backend for the citizen and probes; **recommended first** |
| **B. tabnode in the forum client** | kit, loaded like Reef does (pinned commit + sha256) behind a "verify in this tab" switch | the member's own tab, no server trusted | 1.1 GB per member, a minute, Chromium-class browsers; wasm↔JS bridge like `webgpu_hero.rs` | the ADR-2019 review trigger names it; the sovereign option for members who want it; not the default on a phone |
| C. blaketestnode daemon in the agentbox | agentbox, `run --api 3337 --source rpc --address-index` | its own validation from the Dell's blocks | 8 GB heap, Node 22 | only if A's index proves too heavy for the Dell; `/pair` view needs it or a stock-testnet4 Esplora |

For the **live site** the browser still needs an `https://` source
(`parent.rs` refuses anything else): Melvin's public backend, a Cloudflare
tunnel in front of A, or B. Decision 8 stays open with those three names.

Plan change: Phase 1 step 2 becomes **A**, with **B** as a Phase 2 item
alongside the federation documents. C is dropped unless A fails.

### 5.9 Going live with the txbt4 card: parked 2026-10-02

Checked and parked by the owner ("skip this for now"). State at parking:

- Kit pin moved to `13cbe6c` (website `81ec18c`), which carries the ADR-2019
  txbt4 reader; it ships dark because the overlay sets no `BLAKE_TESTNET_API`.
- The Dell's Esplora is `http://` only and the reader refuses that. No
  cloudflared runs anywhere; both account tunnels (`dreamlab-native-pods`,
  `visionclaw prod`) are down.
- **dreamlab-ai.com's DNS is at GoDaddy, not Cloudflare**; the account's only
  zone is junkiejarvis.com. A tunnel hostname must sit under junkiejarvis.com
  or the domain's nameservers must move first. This is also why the
  pods-native tunnel never landed.
- Exposure note: the Esplora includes `POST /tx` broadcast and the origin is
  the Dell, which carries mainnet bitcoind and a live Lightning channel.

To resume: pick a hostname (or move DNS), attach it to `dreamlab-native-pods`
via the API, run cloudflared as a plain container on the host Docker pointed
at `http://192.168.2.27:3002`, enable Cloudflare rate limiting, add
`BLAKE_TESTNET_API` to `deploy.yml` `[env]` and its `window.__ENV__`
injection, push. About twenty minutes.

### 5.10 Build log: v1 practice slice (started 2026-10-02 20:12 UTC)

Owner: "build the poker table and put it behind a gate in user settings",
executed as a ruflo swarm (`poker-table-v1`, hierarchical, Fable queen, Opus
workers), brief in RuVector `poker-table-v1-design-brief-2026-10-02`.

**Design call made by the queen.** Money against an in-browser bot is unsound:
the hero's browser drives the bot's decisions and sees its cards, so a cheat
is one devtools line away. The `sats` page gets away with it by handing the
bot's key to the player. Therefore v1 ships the table as **practice chips**,
money mode switched off until the citizen service (§5.3) exists, with the
settlement rules landing now as a pure Rust module so the money phase is
wiring, not design.

**Three gates, all required for the nav item and the route:**

1. operator: `[features] poker = true` in the kit TOML, projected as
   `window.__ENV__.POKER = "on"` with a `POKER_CONFIG` JSON beside it;
2. the wallet switched on (`SIDESTR_WALLET`), because the table is a wallet
   surface even in practice mode;
3. the member's own preference, a checkbox in the new **Games** section of
   `/community/settings`, off by default, stored with the other local
   preferences. Nothing about poker is visible until a member turns it on.

Work packages: WP-A config + overlay projection; WP-B page, gate, nav,
vendored engine behind a JSON-string shim; WP-C `wallet::poker` settlement
rules with the ported `sats.mjs` tests and the hand root over RFC 8785.

---

## 6. Phases and estimates

| Phase | Scope | Where | Effort | Exit evidence |
|---|---|---|---|---|
| 0. Spike | Load LibrePoker engine + brain inside the Leptos client via `wasm_bindgen(module)`; play one hand against the ladder in-browser with no money; measure bundle and the 27 MB brain fetch on the live site | kit branch | 3 days | Screenshot + console receipt in `.claude/evidence/` |
| 1. txbt4 table vs citizen, via the forum wallet | Kit ADR + thin consumer ADR here (first task). Dell runbook §5.7. sidestr-rs: `sidestr-teller` crate (pure rules: JCS, genesis hash, ledger check, deposit tweak, kind-3700 requests; the 22 upstream tests as oracle, attributed to solidpayorg/teller). Kit: `wallet::txbt4` (balance and coins by the member's script from the Esplora-shaped API, header validation reusing `sidestr-header` Blake2bV2, spend via `sidestr-wallet` unified sighash, Reef faucet), `[poker]` config + `Features::poker`, `/table` page, silent `join` + one-spend seat funding, `wallet::poker` settlement (port of `sats.mjs` with its 11 tests) emitting kind-3700 transfers, pending reconciliation against the republished ledger, withdraw-to-own-key, Link document on first visit. Agentbox: `poker-citizen` with its own txbt4 key on the same ledger. Overlay: `[poker]` (ledger hash, relays, stakes), `[[agents]]` row, `__ENV__` projection, sitemap, Playwright smoke | Dell (operator, one config change), agentbox (blaketestnode), sidestr-rs, kit (Rust + vendored JS), overlay | 6 to 7 weeks | A test member's key funded by Reef, joined and seated from the forum with no manual step, 20 hands won and lost against the citizen, balances equal to the operator's republished kind-30333 ledger, withdrawal confirmed on txbt4 from the Dell's index |
| 1b. Home table on `sidestr:dreamlab` | Second asset choice: `sats`/`DREAM` tables settled as one sidestr transfer per hand with a `hand:<root>` record; citizen gets a sidestr signer; `[poker]` asset list grows | kit, agentbox, overlay | 2 weeks | 20 hands replayed from `blocks.dat` to the same balances (ADR-2015 gate) |
| 2. Federation documents + tab node | Table heartbeat, Hand archive, derived Ledger entries, venue DID; ask Melvin about lobby listing. **tabnode in the forum client** (§5.8 B) behind a "verify in this tab" switch | agentbox + kit | 2 to 3 weeks | Table visible in a lobby pointed at our archive; one Hand rendered by `libre-poker/hand` |
| 3. Member vs member, casual | DreamLab croupier (spec v0 says "JSS plugin": host it on solid-pod-rs, our JSS port); settle through a **sidestr-hitch** two-party channel (both fund, each hand is a commitment update, close on leave) rather than custody; unrated per constitution §6 | solid-pod-rs, sidestr-rs, kit | 6 to 8 weeks, after croupier spec v1 exists upstream | Two members, ten hands, one cooperative close, penalty path tested |
| 4. Rated member vs member | Blocked upstream on mental poker | none | not scheduled | |

Phase 1 is the deliverable the ask describes. Phases 2 to 4 are the "federated
member" trajectory and should be sequenced against the real planning cycle.

---

## 7. Decisions

**Taken 2026-10-02 (owner):** "in the kit and use blake via the dell and the
forum wallet."

1. **Placement**: B. Kit feature, overlay config. Kit ADR-20xx plus a thin
   consumer ADR here (ADR-080 D7), minted as the first task of Phase 1.
2. **Rail**: txbt4 (BLAKE2b testnet4) served from the Dell, held and spent by
   the existing forum wallet; the member's sign-in key is the address. The
   Dell runbook (§5.7) is authorised: BLAKE testnet4 is already live there, so the runbook is a LAN-exposure change plus an index in the agentbox, not a new node. No DreamLab sidestr chain beside txbt4
   is required; that stays a separate ADR-2101 level-2 decision.
3. **Assets**: txbt4 sats first (Phase 1); `sidestr:dreamlab` sats and DREAM
   as the second choice (Phase 1b).

**Still open:**
4. **Citizen bankroll and cap**: treasury-funded, daily top-up ceiling
   (suggest 20,000 DREAM / 5,000 sats), and whether the citizen plays only
   DreamLab members or any key that reaches the relay.
5. **Link document default**: on by default with a one-line disclosure, or
   opt-in.
6. **Timing**: the current cycle forbids new ADRs until 20 Oct 2026 and parks
   sidestr work for 8 weeks. Phase 0 and the Dell runbook need neither; the
   ADRs and the `sidestr-teller` crate start on 20 Oct unless the owner
   re-plans the cycle.
8. **Public txbt4 read source** for the browser (§5.7 last paragraph): a
   public blaketestnode, or a tunnel to our Dell.
9. **Teller ledger**: ask Melvin for the hash and operator did of the ledger
   his `sats` demo plays on and pin it (recommended), or ask him to mint one
   named for DreamLab. Either way the operator is LibrePoker, not us.
7. **Melvin**: whether to open the lobby-listing conversation now, with this
   document, or after Phase 1 is live.

---

## 8. Risks

- **Browser-run bot leaks its cards** if Phase 1 copies the `sats` page's
  shortcut. Mitigated by §5.3: the citizen runs server-side and holds its key.
- **Fee drain on sats tables**: ~200 sats per settlement against 10/20
  stakes. DREAM default and a "net at leave" option (settle once per session
  rather than per hand, with per-hand signed claims in between) remove it;
  the per-session variant is exactly what the Phase 3 hitch channel does
  properly, so v1 settles per hand and accepts the fee on sats tables.
- **Bundle growth**: wallet already added 0.43 MB of WASM; the poker page adds
  JS modules fetched lazily and a 27 MB brain. Phase 0 measures; the brain is
  cached per session and only fetched on `/table`.
- **AGPL §13**: the kit is AGPL, LibrePoker is AGPL; combined-work posture is
  already recorded (website ADR-035). Pin by commit, attribute in the page
  footer as ADR-2015 does for sidestr.
- **Legal**: testnet coins and a valueless token only. The scope must not
  drift to any asset with a market. ADR-2015 D1 is the lock; keep it.
- **Custody on rail 2**: the teller operator (LibrePoker) can refuse a
  withdrawal and can link a ledger's deposit addresses (its README says both).
  Acceptable for test coins; the forum must say "held by LibrePoker" on the
  away balance and never on the home one.
- **One key, two chain families**: the same key signs BIP 341 sighashes on
  tbtc4 and Knots unified sighashes on txbt4. sidestr-wallet picks by family
  (`bip21.rs`, `external::accept_signed`); the Podkey extension pins a signer
  per chain on first spend. A wrong-family signature is simply invalid, not a
  loss, but the wallet view must never show the two balances as one number.
- **Upstream churn**: `sats` was pushed today; schema objects are v0. Pin
  commits, vendor nothing we do not have to, and treat the schema repo as
  authoritative when it moves.

---

## 9. References

- libre-poker: `sats` (README, `lib/sats.mjs`, `sats.js`), `schema`
  (`TABLE.md`, `LINK.md`, `CLAIMS.md`, `LEDGER.md`, `SETTLEMENT.md`,
  `PAY-TO-URI.md`), `bots` (README, `cashier/cashier.js`), `play/lobby.html`,
  constitution. Local clones in the session scratchpad.
- solidpayorg/teller README and `lib/teller.mjs` (kinds 30333 / 3700).
- Kit: `docs/adr/ADR-2015-member-wallets-on-sidestr-dreamlab-and-dream-tips.md`,
  `docs/adr/ADR-2012-d1-ledger-becomes-a-chain-view.md`,
  `crates/nostr-bbs-forum-client/src/wallet/*`, `app.rs:267,315,939`,
  `components/fx/webgpu_hero.rs:21`, `nostr-bbs-config/src/schema.rs:323,608`,
  `nostr-bbs-mesh` (jcs, envelope).
- agentbox: ADR-2096, ADR-2098, ADR-2099, ADR-2101; owner decisions
  2026-09-21 (RuVector `financial-substrate-sidestr-decisions-2026-09-21`).
- This repo: `forum-config/dreamlab.toml` `[payments]`, `[[agents]]`;
  `.github/workflows/deploy.yml:77,262`; `docs/sprint/bbs-rust-port-spec.md`
  (precedent for "build in the kit, configure here").

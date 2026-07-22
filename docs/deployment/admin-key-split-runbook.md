# Runbook: visionclaw-server admin/governance key split

**Status:** Pending operator execution (blocked-operational)
**Owner:** DreamLab Edge operator (holds the Cloudflare account + key material)
**Governs:** ADR-040 D3, gap-close edge PRD WP-3 AC2, ADR-037 O2 (`ADMIN_PUBKEYS` fragmentation)
**Precondition for:** WP-3 falsification clearance (visionclaw-server key must appear only in `[governance]`)

## Why this is a runbook, not a code change

The visionclaw-server key
`11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c` is currently
listed **both** as the PRIMARY forum admin (`dreamlab.toml [admin].static_pubkeys`)
and as a `[governance].agent_pubkeys` publisher. It is a non-admin governance
service identity (the VisionClaw governance publisher — historically labelled
"the BrokerActor", an actor that never merged to VisionClaw main; corrected
2026-07-22 per VisionClaw ADR-131/132); its admin listing is wrong.

Removing it from the admin set is a **four-location atomic change**:

1. `forum-config/dreamlab.toml` — `[admin].static_pubkeys`
2. `forum-config/deploy/relay-worker.wrangler.toml` — `[vars].ADMIN_PUBKEYS`
3. `forum-config/deploy/search-worker.wrangler.toml` — `[vars].ADMIN_PUBKEYS`
4. **auth-worker `ADMIN_PUBKEYS`** — a Cloudflare Workers **secret**, set with
   `wrangler secret put`, held only in the operator's Cloudflare account

Locations 1–3 are git-tracked and checked in lockstep by the `admin-pubkeys-sync`
job in `.github/workflows/ci.yml`. Location 4 is **not** reachable from CI or from
this container — it is operator-managed key material. Editing 1–3 without 4 in the
same window locks admins out of the auth-worker (or leaves the retired key admin
on it). Editing 1–3 in this repo alone would still pass `admin-pubkeys-sync`
(it does not see the CF secret) but would ship a broken admin set. Hence the split
is **staged in config comments and executed here by the operator**, never applied
piecemeal by an agent that cannot rotate the secret.

Per ADR-040 D3 and the container's operational limits, no real key material is
invented or committed. The placeholder below is documentation only.

## Target `ADMIN_PUBKEYS` layout (after the split)

The retired visionclaw-server key is **removed** from all four admin locations and
a freshly minted operator/admin key `OPERATOR_ADMIN_PUBKEY` is **added** in its
place. visionclaw-server stays only in `dreamlab.toml [governance].agent_pubkeys`.

The admin set becomes (order-independent; all four locations must be byte-identical
after lowercasing, per `admin-pubkeys-sync`):

```
OPERATOR_ADMIN_PUBKEY   # <64-hex, minted in step 1 — replaces visionclaw-server>
6407eed80e2a8646e41a5ddba0ae6619425fc54af40e2b30482b9623c682425a   # operator-jjohare (human admin)
5d80b5facd2d746689d7d2e400db6acce5843456967054adcf6956e4c734c54c   # moderation-bot
be92ccf53d9d535fd21f3388201fd83b49588552fff5a1395fb60b6998df2243   # calendar-bot
d5194639ee3560204a1b5584a0714a6dd2a6c59953d0869b483e72ee185ada26   # search-indexer
```

`[governance].agent_pubkeys` is unchanged (retains visionclaw-server +
knowledge-enrichment-agent).

> Note: if the operator judges that the *service* no longer needs any admin seat
> at all (only a human admin plus the automated moderation/calendar/search bots),
> `OPERATOR_ADMIN_PUBKEY` may simply be omitted and the admin set drops to four
> keys. In that case remove the retired key from all four locations and add
> nothing; keep the four mirrors identical.

## Execution steps (operator, one coordinated window)

1. **Mint the key.** Generate a fresh Nostr keypair for the operator/admin
   identity (e.g. `nak key generate` or the forum client's key tools). Record the
   nsec in the operator's secret store and in `.nostr-identities.env` (git-ignored)
   as `OPERATOR_ADMIN_PUBKEY` / `OPERATOR_ADMIN_NSEC`. This is the value that
   substitutes for `<64-hex minted by operator>` everywhere below.

2. **Edit the three git-tracked mirrors in one commit.** Replace the
   visionclaw-server pubkey with the minted `OPERATOR_ADMIN_PUBKEY` in:
   - `forum-config/dreamlab.toml` `[admin].static_pubkeys` (delete the
     visionclaw-server entry, add the minted key)
   - `forum-config/deploy/relay-worker.wrangler.toml` `[vars].ADMIN_PUBKEYS`
   - `forum-config/deploy/search-worker.wrangler.toml` `[vars].ADMIN_PUBKEYS`

   Leave `[governance].agent_pubkeys` untouched (visionclaw-server stays there).

3. **Validate lockstep locally before pushing:**
   ```bash
   python3 - <<'PY'
   import tomllib
   def load(p):
       with open(p,'rb') as f: return tomllib.load(f)
   def ks(csv): return {k.strip().lower() for k in csv.split(',') if k.strip()}
   t = load('forum-config/dreamlab.toml')
   admin = {k.strip().lower() for k in t['admin']['static_pubkeys']}
   relay = ks(load('forum-config/deploy/relay-worker.wrangler.toml')['vars']['ADMIN_PUBKEYS'])
   search = ks(load('forum-config/deploy/search-worker.wrangler.toml')['vars']['ADMIN_PUBKEYS'])
   assert admin == relay == search, (admin, relay, search)
   assert '11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c' not in admin, 'visionclaw still admin'
   print('OK — admin set consistent, visionclaw removed from admin')
   PY
   ```

4. **Rotate the auth-worker CF secret in the same window** (this is the step CI
   cannot do):
   ```bash
   # from forum-config/deploy, against the auth-worker manifest
   wrangler secret put ADMIN_PUBKEYS --config auth-worker.wrangler.toml
   # paste the SAME comma-separated set as step 2 (the four/five keys, no spaces)
   ```
   Verify: `wrangler secret list --config auth-worker.wrangler.toml` shows
   `ADMIN_PUBKEYS` updated.

5. **Push + let CI gate.** `admin-pubkeys-sync` must pass (mirrors 1–3 agree). The
   auth-worker secret (4) is verified out-of-band in step 4.

6. **Smoke-test admin auth.** Log in as the operator human admin and as the newly
   minted operator/admin identity; confirm the auth-worker admin routes
   (`/api/governance/agents`, admin Users tab) authorise both, and that the retired
   visionclaw-server key no longer has admin access while it can still publish
   governance panels (kinds 31400/31402).

7. **Update the config staging comment.** Delete the "KEY-SPLIT PENDING" block in
   `dreamlab.toml [admin]` and the placeholder line; the split is now applied.

## Rollback

If admin auth breaks after step 4, re-run `wrangler secret put ADMIN_PUBKEYS`
with the pre-split set (the five keys including visionclaw-server) and revert the
step-2 commit. `admin-pubkeys-sync` returns to green on the reverted mirrors. The
governance publisher path is unaffected throughout (visionclaw-server never left
`[governance]`).

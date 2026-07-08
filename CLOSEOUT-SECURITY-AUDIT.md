# dreamlab-ai-website — Closeout Security Audit Register

**Date:** 2026-07-03  
**Method:** Fable-orchestrated Opus mesh — 7 dimensions, analyze + adversarial-verify (0 refuted). Secret VALUES redacted in this file.  
**Note:** dreamlab is the config + deploy layer for nostr-rust-forum (forum-config/ crate + CI that deploys the forum's Cloudflare Workers and sets their secrets).

> ⚠️ **OPERATOR ACTION REQUIRED — rotate now (treated as exposed):** live Cloudflare API token + GitHub OAuth token (`.env`), a GitHub PAT that was inline in `.git/config` (scrubbed from the remote; still rotate), and 8 secp256k1 private keys incl. the moderation-bot **admin** key (`.nostr-identities.env`). All gitignored / not committed, but present on a shared container and read into an audit transcript. Rotate + move to a secret manager.


## P1

### (ci-deploy-secrets) set-worker-secrets.yml writes empty NATIVE_POD_ADMIN_KEY / NATIVE_POD_URL to the live auth worker (no presence guard) — *plausible*
- **Category:** deploy-misconfig
- **Detail:** The steps that PUT NATIVE_POD_URL (lines 23-34) and NATIVE_POD_ADMIN_KEY (lines 36-47) to the dreamlab-auth-api Worker have NO empty-value guard, whereas the PRF_SERVER_SECRET (lines 55-58) and ADMIN_PUBKEYS (lines 72-75) steps DO (`if [ -z "${SECRET_VALUE}" ]; then exit 1`). If the operator dispatches this workflow with the GH secret NATIVE_POD_ADMIN_KEY unset/empty (easy to do — it is a one-shot
- **Evidence:** .github/workflows/set-worker-secrets.yml:23-47 (NATIVE_POD_URL + NATIVE_POD_ADMIN_KEY steps have no `[ -z ]` guard) vs lines 55-58 and 72-75 (PRF_SERVER_SECRET + ADMIN_PUBKEYS steps do guard). The PUT at line 46 sends SECRET_VALUE unconditionally.
- **Decision:** Add the same `if [ -z "${SECRET_VALUE}" ]; then echo '::error::...' >&2; exit 1; fi` guard to the NATIVE_POD_URL and NATIVE_POD_ADMIN_KEY steps so an unset GH secret fails the run instead of writing an empty secret to the live worker.

### (deploy-misconfig) Primary forum-admin pubkey is reused as the always-online visionclaw-server agent key (full admin across relay/search/governance) — *CONFIRMED*
- **Category:** deploy-misconfig
- **Detail:** The pubkey [REDACTED-hex] is declared as static_pubkeys[0] labelled 'power-user — primary admin' AND, byte-identical, as governance agent_pubkeys[0] labelled 'visionclaw-server — BrokerActor publishes panel definitions (31400) and action requests (31402)'. The same key is the first entry of ADMIN_PUBKEYS baked into the relay-worker and search-worke
- **Evidence:** forum-config/dreamlab.toml:37 (power-user primary admin) == forum-config/dreamlab.toml:231 (visionclaw-server agent); same key first in forum-config/deploy/relay-worker.wrangler.toml:29 and forum-config/deploy/search-worker.wrangler.toml:38 ADMIN_PUBKEYS; trust-separation claim a
- **Decision:** Split the identities: give visionclaw-server a distinct, non-admin agent key (governance-publish capability only), and keep the human primary-admin key offline/hardware-backed and out of any online broker. Remove the broker key from all ADMIN_PUBKEYS sets. If 

### (deploy-misconfig) Deploy secret gate is name-only and set-worker-secrets.yml lacks empty guards, so an empty native-pod admin PSK/URL can ship past every check — *plausible*
- **Category:** deploy-misconfig
- **Detail:** workers-deploy.yml validates auth-worker secrets by NAME only (parses `wrangler secret list` names and greps for PRF_SERVER_SECRET/ADMIN_PUBKEYS/NATIVE_POD_ADMIN_KEY); a secret whose value is the empty string still appears in that list and passes. set-worker-secrets.yml adds an empty-value guard for PRF_SERVER_SECRET and ADMIN_PUBKEYS but NOT for NATIVE_POD_URL or NATIVE_POD_ADMIN_KEY — if those G
- **Evidence:** .github/workflows/workers-deploy.yml:200-211 (grep -qxF name-only presence check), .github/workflows/set-worker-secrets.yml:23-47 (NATIVE_POD_URL/NATIVE_POD_ADMIN_KEY steps have no `if [ -z ]` guard, unlike lines 55-58 and 72-75), forum-config/src/deploy_config.rs:223-249 (valida
- **Decision:** Add empty-value guards to the NATIVE_POD_URL and NATIVE_POD_ADMIN_KEY steps in set-worker-secrets.yml (mirror the PRF/ADMIN_PUBKEYS guards). In workers-deploy.yml, replace the name-only bash check with an actual call to forum-config's validate_required_secrets

### (deploy-misconfig) Live fine-grained GitHub PAT with push access exposed in .git/config — *CONFIRMED*
- **Category:** secret-leak
- **Detail:** The origin remote URL embeds a fine-grained GitHub personal access token (github_pat_11ANIC73I0G7HGbLkLovII_...) for DreamLab-AI/dreamlab-ai-website with both fetch and push configured. Push access to main is directly prod-affecting: deploy.yml and workers-deploy.yml trigger on push to main and deploy the site + forum workers, so this token is a supply-chain compromise vector. It resides in the lo
- **Evidence:** git remote -v output: origin https://x-access-token:github_pat_11ANIC73I0G7HGbLkLovII_...@github.com/DreamLab-AI/dreamlab-ai-website.git (fetch/push) — stored in .git/config of /home/devuser/workspace/dreamlab-ai-website
- **Decision:** Revoke and rotate this PAT immediately (it has push access). Reconfigure the remote to use a credential helper or SSH deploy key rather than an inline token in the remote URL, so credentials are not left in plaintext in .git/config.

### (nostr-auth-api) Live plaintext Cloudflare API token and GitHub token in working-tree .env — *CONFIRMED*
- **Category:** secret-leak
- **Detail:** .env contains CLOUDFLARE_API_TOKEN=[REDACTED] CLOUDFLARE_ACCOUNT_ID=[REDACTED-hex], and GITHUB_TOKEN=[REDACTED] in plaintext. These grant deploy/redeploy access to the Cloudflare Workers that host the consumed nostr-rust-forum, so exposure is prod-affecting. Verified NOT a repo leak: .env is gitignored (.gitignore:7) an
- **Evidence:** /home/devuser/workspace/dreamlab-ai-website/.env:26-28 (CLOUDFLARE_API_TOKEN/ACCOUNT_ID), .env:33 (GITHUB_TOKEN gho_); confirmed untracked (git ls-files --error-unmatch .env fails) and absent from history (git log --all -S count 0)
- **Decision:** Rotate both the Cloudflare API token and the GitHub token immediately (they are known-plaintext on a shared box). Remove the CLOUDFLARE_*/GITHUB_TOKEN lines from .env and source them from a secret manager / CI secrets only; keep only VITE_ client-public vars i

### (secrets-committed) Eight live Nostr secp256k1 private keys — including the moderation-bot ADMIN key — in working-tree .nostr-identities.env — *CONFIRMED*
- **Category:** secret-leak
- **Detail:** .nostr-identities.env holds plaintext nsec + 32-byte hex private keys for 8 of 11 ecosystem identities: welcome-bot, moderation-bot (Admin: yes), calendar-bot, search-indexer, marketplace-agent, knowledge-enrichment-agent, and test users alice/bob/carol. These are the LIVE forum identities — their pubkeys are committed in forum-config/dreamlab.toml and whitelisted in the relay D1, and dreamlab.tom
- **Evidence:** .nostr-identities.env:42 (MODERATION_BOT_NSEC, '# Admin: yes' at line 39), plus WELCOME_BOT_NSEC (.nostr-identities.env:27), CALENDAR_BOT_NSEC (:47), SEARCH_INDEXER_NSEC (:55), MARKETPLACE_AGENT_NSEC (:63), KNOWLEDGE_ENRICHMENT_AGENT_NSEC (:71), TEST_TRAINER_ALICE_NSEC (:79) and 
- **Decision:** Rotate the moderation-bot admin key (and ideally all bot keys) as part of closeout, updating dreamlab.toml admin.static_pubkeys, the relay D1 whitelist, and the VisionClaw/service configs. Store private keys only in a secret manager / hardware-backed store, ne

### (secrets-committed) Live Cloudflare API token + GitHub OAuth token present in working-tree .env (gitignored, not committed) — *CONFIRMED*
- **Category:** secret-leak
- **Detail:** The on-disk .env contains real, live-format production credentials: CLOUDFLARE_API_TOKEN=[REDACTED] (Cloudflare account-scoped API token — the account ccdf454d... is confirmed real and used by the deploy/secrets workflows), CLOUDFLARE_ACCOUNT_ID=[REDACTED-hex], and GITHUB_TOKEN=[REDACTED] (a GitHub OAuth access token). T
- **Evidence:** .env:27 (CLOUDFLARE_API_TOKEN=[REDACTED] .env:28 (CLOUDFLARE_ACCOUNT_ID), .env:33 (GITHUB_TOKEN=[REDACTED] Verified untracked: `git ls-files --error-unmatch .env` → pathspec did not match; `git check-ignore .env` → .
- **Decision:** Rotate the Cloudflare API token and GitHub OAuth token now (treat as exposed since they sat in a shared-container working tree). Move all real secrets out of the repo-root .env into a secret manager or an untracked location outside the checkout; keep only .env

### (stubs-adrs-quality) ADMIN_KV read/write split broken: deploy pipeline provisions per-worker KV namespaces, so pod-worker reads a different (empty) namespace than auth-worker writes — *plausible*
- **Category:** deploy-misconfig
- **Detail:** auth-worker.wrangler.toml binds ADMIN_KV (read/write authority) and pod-worker.wrangler.toml binds ADMIN_KV_RO (read-only view), both with id REPLACE_WITH_NEW_ADMIN_KV_ID. The pod-worker comment explicitly states the intent is to 'share the same id and rely on code-level read/write split'. But workers-deploy.yml resolves the placeholder with a per-worker namespace TITLE `${{ matrix.config }}-admin
- **Evidence:** .github/workflows/workers-deploy.yml:173 `title="${{ matrix.config }}-admin-kv"`; forum-config/deploy/pod-worker.wrangler.toml:17-24 (ADMIN_KV_RO, 'share the same id'); forum-config/deploy/auth-worker.wrangler.toml:38-42 (ADMIN_KV, 'auth-worker is the read/write authority'); auth
- **Decision:** Provision ONE shared 'dreamlab-admin-kv' namespace and bind its id to both auth-worker ADMIN_KV and pod-worker ADMIN_KV_RO. Use a fixed title (not matrix.config-scoped) for the ADMIN_KV placeholder, or resolve the id once in a pre-matrix job and pass it to bot


## P2

### (ci-deploy-secrets) CF Secrets-API JSON body built by unescaped shell string interpolation — a secret containing a quote/backslash corrupts the stored value — *plausible*
- **Category:** bug
- **Detail:** Every set-worker-secrets step builds the JSON payload as `--data "{\"name\":\"X\",\"text\":\"${SECRET_VALUE}\",\"type\":\"secret_text\"}"`. If a secret value contains a double-quote, backslash, or newline (all valid in a PRF salt or PSK), the JSON is malformed or the value is silently truncated at the first quote, so the Worker ends up with a shorter/weaker secret than intended (e.g. a truncated P
- **Evidence:** .github/workflows/set-worker-secrets.yml:33, 46, 63, 80 — all four PUTs interpolate ${SECRET_VALUE} straight into a hand-built JSON string.
- **Decision:** Build the payload with jq: `jq -n --arg n NAME --arg v "$SECRET_VALUE" '{name:$n,text:$v,type:"secret_text"}'` piped to curl `--data @-`, so arbitrary secret bytes are correctly escaped.

### (ci-deploy-secrets) DREAMLAB_UK_TOKEN interpolated directly into a run: shell condition instead of via env: — *plausible*
- **Category:** deploy-misconfig
- **Detail:** The 'Check mirror token' step tests the secret with `if [ -n "${{ secrets.DREAMLAB_UK_TOKEN }}" ]; then`, embedding the raw secret value into the shell script rendered onto the runner. GitHub's own hardening guidance forbids inline `${{ secrets.* }}` in run scripts: the value is written into the command line (masked in logs, but present in the process/script), and any shell metacharacter in the to
- **Evidence:** .github/workflows/deploy.yml:319 — `if [ -n "${{ secrets.DREAMLAB_UK_TOKEN }}" ]; then`. Contrast with the correct env-based handling everywhere else (e.g. set-worker-secrets.yml:24-27, workers-deploy.yml:138-140).
- **Decision:** Move the token into the step's env (`env: TOKEN: ${{ secrets.DREAMLAB_UK_TOKEN }}`) and test `[ -n "$TOKEN" ]`.

### (ci-deploy-secrets) Privileged deploy job downloads and executes binaryen (wasm-opt) and tailwindcss with NO checksum verification — *plausible*
- **Category:** deploy-misconfig
- **Detail:** deploy.yml verifies Trunk with a pinned SHA256 (lines 131-140, good), but immediately after it curls the binaryen v119 tarball (lines 142-151) and the tailwindcss v3.4.17 binary (lines 153-160) from GitHub releases and runs them (`tar -xzf`/`chmod +x`, then executed during the build) with no checksum check. This runs inside the build-and-deploy job which has `contents: write`, holds `secrets.NATIV
- **Evidence:** .github/workflows/deploy.yml:142-151 (binaryen, no `sha256sum -c`) and :153-160 (tailwindcss, no checksum), contrasted with :131-140 (Trunk with TRUNK_SHA256 verification). Same job elevates to `contents: write` at :84-85 and consumes secrets at :166, :308, :331, :343.
- **Decision:** Pin and verify SHA256 for the binaryen and tailwindcss downloads exactly as Trunk is verified (add BINARYEN_SHA256 / TAILWIND_SHA256 env vars and `sha256sum -c -`).

### (ci-deploy-secrets) Third-party action dtolnay/rust-toolchain pinned to a mutable version tag in the CLOUDFLARE_API_TOKEN-bearing deploy job — *plausible*
- **Category:** deploy-misconfig
- **Detail:** workers-deploy.yml and deploy.yml both use `dtolnay/rust-toolchain@1.90.0` — a mutable tag, not a commit SHA — in the same jobs that expose CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID (workers-deploy deploy-rust) and gh-pages write + NATIVE_POD_URL (deploy build-and-deploy). Tags can be force-moved to a malicious commit (or the action account compromised), giving attacker code the CF API token (Wor
- **Evidence:** .github/workflows/workers-deploy.yml:93 (`dtolnay/rust-toolchain@1.90.0`, same job as CLOUDFLARE_API_TOKEN at :139/:224) and .github/workflows/deploy.yml:115 (same job as gh-pages token at :308 and CF token at :343). Contrast SHA-pinned actions at deploy.yml:306, :329, :341 and d
- **Decision:** Pin dtolnay/rust-toolchain to a full commit SHA (with a `# 1.90.0` comment) at least in the two deploy workflows; ideally SHA-pin actions/checkout, setup-node, and cache too.

### (ci-deploy-secrets) Production Workers deploy from an UNMERGED PR-head SHA; the pre-deploy gate never runs the kit's worker test suite — *plausible*
- **Category:** gap
- **Detail:** Both deploy pipelines pin KIT_REF to a149da43…, annotated in-file as 'tracks nostr-rust-forum PR #63 head — re-pin to the merge commit on merge'. So production auth/relay/pod/search/preview Workers and the forum WASM client are built and deployed from an unmerged, in-review branch head that has not passed the forum repo's own merge gate/review. Compounding this, the deploy gate (`uses: ./.github/w
- **Evidence:** .github/workflows/workers-deploy.yml:40-41 and deploy.yml:66-68 and rust-ci.yml:19-20 (KIT_REF = PR #63 head). Gate coverage: deploy.yml:74 / workers-deploy.yml:47 call test-and-lint.yml, which only tests forum-config (test-and-lint.yml:87-88). Kit tests live in rust-ci.yml:9 (`w
- **Decision:** Re-pin KIT_REF (and the forum-config Cargo revs) to the merged/reviewed commit on nostr-rust-forum main before deploying, and either make rust-ci.yml (kit tests) a required gate on deploy or add the kit worker tests to the reusable gate.

### (deploy-misconfig) Admin KV is provisioned per-worker-config, so pod-worker reads a different (empty) namespace than auth-worker writes — H6 shared-admin-KV design is broken — *plausible*
- **Category:** deploy-misconfig
- **Detail:** auth-worker.wrangler.toml binds ADMIN_KV and pod-worker.wrangler.toml binds ADMIN_KV_RO, both with placeholder id REPLACE_WITH_NEW_ADMIN_KV_ID, with the explicit intent (audit H6) that pod-worker read the SAME namespace auth-worker writes ('share the same id and rely on code-level read/write split'). But workers-deploy.yml resolves/creates the namespace with title="${{ matrix.config }}-admin-kv", 
- **Evidence:** forum-config/deploy/auth-worker.wrangler.toml:40-42 (ADMIN_KV placeholder), forum-config/deploy/pod-worker.wrangler.toml:22-24 (ADMIN_KV_RO placeholder + 'share the same id' comment), .github/workflows/workers-deploy.yml:173 (title="${{ matrix.config }}-admin-kv")
- **Decision:** Provision ONE namespace (e.g. title 'dreamlab-admin-kv') once and substitute the same id into both manifests, instead of deriving the title from matrix.config. Either hardcode a single shared title for the ADMIN_KV placeholder branch, or resolve it in a pre-ma

### (deploy-misconfig) NATIVE_POD_URL is declared as both a wrangler [vars] plaintext binding and a Cloudflare secret — same-name var/secret conflict, nondeterministic and empty-clobberable — *plausible*
- **Category:** deploy-misconfig
- **Detail:** NATIVE_POD_URL is set three ways: as a plaintext [vars] value 'https://pods-native.dreamlab-ai.com' in auth-worker.wrangler.toml (applied by `wrangler deploy`), as a secret_text on the same worker via set-worker-secrets.yml (from GH secret), and baked into the WASM forum client via option_env at trunk build (deploy.yml). A Cloudflare worker cannot cleanly hold a plaintext binding and a secret of t
- **Evidence:** forum-config/deploy/auth-worker.wrangler.toml:82 (NATIVE_POD_URL in [vars]); .github/workflows/set-worker-secrets.yml:23-34 (NATIVE_POD_URL PUT as secret_text); .github/workflows/deploy.yml:166 (NATIVE_POD_URL: ${{ secrets.NATIVE_POD_URL }} baked into forum client)
- **Decision:** Pick one source of truth. NATIVE_POD_URL is not secret — keep it only as a [vars] value in auth-worker.wrangler.toml and remove the NATIVE_POD_URL step from set-worker-secrets.yml. Keep only NATIVE_POD_ADMIN_KEY as the secret. For the client build, source the 

### (deploy-misconfig) auth-worker admin set (GH secret) can drift from the in-repo ADMIN_PUBKEYS in relay/search/dreamlab.toml with no CI equality check — *plausible*
- **Category:** deploy-misconfig
- **Detail:** The admin set exists in four places that must stay identical: dreamlab.toml [admin].static_pubkeys, relay-worker.wrangler.toml [vars] ADMIN_PUBKEYS, search-worker.wrangler.toml [vars] ADMIN_PUBKEYS (all three carry the same in-repo 5-key list), and the auth-worker's ADMIN_PUBKEYS which is an out-of-band Cloudflare secret sourced from GH secret ADMIN_PUBKEYS (not present in any manifest). Nothing i
- **Evidence:** forum-config/dreamlab.toml:35-46 (static_pubkeys) vs forum-config/deploy/relay-worker.wrangler.toml:29 and forum-config/deploy/search-worker.wrangler.toml:38 (in-repo ADMIN_PUBKEYS) vs auth-worker ADMIN_PUBKEYS set only via .github/workflows/set-worker-secrets.yml:66-81 (GH secre
- **Decision:** Make ADMIN_PUBKEYS non-secret (pubkeys are public) and derive all four from dreamlab.toml at deploy time, or add a CI check that the GH secret ADMIN_PUBKEYS equals dreamlab.toml [admin].static_pubkeys before deploying the auth-worker. Fix or remove the stale D

### (deps-supplychain) Operator seed/signing scripts import Nostr crypto libs from a hardcoded out-of-tree absolute path — *CONFIRMED*
- **Category:** consumption-boundary
- **Detail:** scripts/seed-forum.mjs, scripts/seed-semantic.mjs and scripts/assign-cohorts.mjs import nostr-tools (getPublicKey/finalizeEvent), @noble/hashes and ws from the absolute path /home/devuser/workspace/project2/community-forum/node_modules/... — a different project's install tree that this repo's package-lock.json does not control or pin. These scripts then SIGN Nostr events and PUBLISH them to the pr
- **Evidence:** scripts/seed-forum.mjs:12-15; scripts/seed-semantic.mjs:10-13; scripts/assign-cohorts.mjs:12-14 (import ... from '/home/devuser/workspace/project2/community-forum/node_modules/nostr-tools/lib/esm/pure.js' and .../@noble/hashes/... and .../ws/wrapper.mjs); each script targets RELA
- **Decision:** Rewrite the imports to bare specifiers (import { getPublicKey } from 'nostr-tools/pure') so they resolve against this repo's pinned, audited node_modules. These are manual operator scripts (not in the build/deploy path), so severity is P2 not P0, but the signi

### (deps-supplychain) Prod forum (Workers + WASM client) is deployed from an unmerged PR-head commit, not a merged/tagged release — *CONFIRMED*
- **Category:** deploy-misconfig
- **Detail:** The pinned kit revision [REDACTED-hex] is, per the maintainers' own comments, the HEAD of nostr-rust-forum PR #63/#69 ('tracks nostr-rust-forum PR #63 head — re-pin to the merge commit on merge'). This SHA feeds both the Rust worker builds and the WASM forum client that ship to production Cloudflare domains. Integrity is fine (a full SHA is content-addressed, so it cannot
- **Evidence:** .github/workflows/deploy.yml:64-68 (KIT_REF + 'tracks nostr-rust-forum PR #63 head — re-pin to the merge commit on merge'); .github/workflows/workers-deploy.yml:38-40; .github/workflows/rust-ci.yml:18-20; forum-config/Cargo.toml deps block (rev = "[REDACTED-hex]
- **Decision:** Before closeout, re-pin KIT_REF and the forum-config Cargo revs to the merge commit (or an annotated release tag) of nostr-rust-forum once PR #63/#69 is merged, so prod ships reviewed code from a reachable ref. Keep the existing ci.yml lockstep check. Optional

### (nostr-auth-api) Nostr tier auth is client-side theatre: unauthenticated pubkey + tier sent to AI backend (impersonation / privilege escalation) — *ADJUSTED*
- **Category:** consumption-boundary
- **Detail:** requestNostrAuth (AIChatFab.tsx:60-70) only calls window.nostr.getPublicKey() — it performs NO challenge, NO signEvent, NO NIP-98/NIP-07 signature verification. switchTier (lines 88-99) then shows 'Signed in as <pk>' UX implying the user authenticated, when nothing was proven. In sendMessage (lines 139-150) the client sends `{message, session_id, tier, pubkey}` to VITE_AI_CHAT_URL, where both `pub
- **Evidence:** src/components/AIChatFab.tsx:60-70 (getPublicKey only, no signature); 88-99 ('Signed in as' with no proof); 139-150 (`if (pubkey) body.pubkey = pubkey`, tier sent verbatim); admin pubkey public at .env:10 / vite-env.d.ts:15
- **Decision:** Treat the client pubkey/tier as untrusted hints only. Require a signed NIP-98/NIP-07 challenge (server nonce -> window.nostr.signEvent -> server verifies sig+pubkey) before granting tier>=2, and have the backend derive tier from the verified identity, never fr

### (nostr-auth-api) Weak CSP: unsafe-inline/unsafe-eval scripts and wildcard connect-src *.workers.dev enable exfiltration — *CONFIRMED*
- **Category:** frontend-security
- **Detail:** The CSP (index.html:59, meta http-equiv) uses `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, which neutralises most of CSP's XSS mitigation (any injected inline script/eval would run). More importantly connect-src includes wildcards `https://*.workers.dev wss://*.workers.dev`, which permits network requests to ANY Cloudflare Workers subdomain on the internet — anyone can register a free <name>
- **Evidence:** index.html:59 (script-src 'unsafe-inline' 'unsafe-eval'; connect-src ... https://*.workers.dev wss://*.workers.dev); index.html:61 (X-Frame-Options DENY covers frame-ancestors)
- **Decision:** Pin connect-src to the specific worker hostnames (solitary-paper-764d.workers.dev / *.dreamlab-ai.com / *.supabase.co) instead of *.workers.dev. Drop 'unsafe-eval' (verify no runtime lib needs it) and move toward nonce/hash-based script-src to remove 'unsafe-i

### (stubs-adrs-quality) Kit ref pinned to an unmerged, mutable PR-head commit across all 3 workflows and Cargo.toml — *plausible*
- **Category:** deploy-misconfig
- **Detail:** KIT_REF and the Cargo.toml git rev are pinned to [REDACTED-hex], described in every location as 'tracks nostr-rust-forum PR #63 head — re-pin to the merge commit on merge'. Both deploy workflows do `git clone ... && git checkout --detach <SHA>` of this commit. A PR-branch head is mutable: if PR #63 is rebased, squash-merged, or its branch deleted, the commit can become un
- **Evidence:** .github/workflows/deploy.yml:66-68; .github/workflows/workers-deploy.yml:40-41; .github/workflows/rust-ci.yml:19-20; forum-config/Cargo.toml:16,42-45; ADR-036 line 15 ('pinned `25ca8a1`')
- **Decision:** Once PR #63 merges, re-pin all four locations to the immutable merge/tag commit and reconcile the version label (beta.3, not rc11). If a pre-merge pin is unavoidable, mirror the kit commit into a tag/release in the DreamLab fork so it cannot be GC'd.

### (stubs-adrs-quality) ADR-037 O1/O2 single-source generator deferred: ZONE_CONFIG and ADMIN_PUBKEYS hand-synced across 3-4 surfaces with no generator — *plausible*
- **Category:** gap
- **Detail:** ADR-037 (Status: 'Accepted (partial — O1/O2 single-source generator deferred)') declares dreamlab.toml the authored source but the generator that derives downstream copies was never built. ZONE_CONFIG exists as three hand-maintained copies (dreamlab.toml [[zones]], relay-worker.wrangler.toml ZONE_CONFIG [vars] JSON, deploy.yml ZONE_CONFIG_JSON injected into window.__ENV__). ADMIN_PUBKEYS exists as
- **Evidence:** docs/adr/037-config-single-source-of-truth.md:108-112 (O1/O2 open); forum-config/dreamlab.toml:71-106 ([[zones]]) & 35-46 ([admin].static_pubkeys); forum-config/deploy/relay-worker.wrangler.toml:21 (ZONE_CONFIG) & 29 (ADMIN_PUBKEYS); forum-config/deploy/search-worker.wrangler.tom
- **Decision:** Build the deferred generator: a small step (in forum-config, run in deploy.yml + workers-deploy.yml) that reads dreamlab.toml and emits the relay ZONE_CONFIG var, the search/relay ADMIN_PUBKEYS vars, and the client __ENV__.ZONE_CONFIG, failing closed on empty.

### (stubs-adrs-quality) forum-config deploy-config validator is test-only and never gates a real deploy; ADR-037 closeout overstates it — *plausible*
- **Category:** gap
- **Detail:** deploy_config.rs implements validate_deploy_dir/validate_required_secrets as a fail-closed guard, and ADR-037's closeout says it is 'gated in CI ... so an unresolved placeholder cannot merge unnoticed.' In reality the whole dreamlab-forum-config crate is never linked into any deployed artifact (verified: nothing outside the crate references dreamlab-forum-config or its functions; the deploy pipeli
- **Evidence:** forum-config/src/deploy_config.rs:183-249 & test at :263-286 (asserts expect_err on shipped manifests); ADR-037 lines 88-102 (closeout claims CI gating); .github/workflows/workers-deploy.yml:170-219 (bash reimplements the guard); grep confirms no consumer of dreamlab-forum-config
- **Decision:** Either invoke the Rust validator in the deploy job (build a tiny bin that runs validate_deploy_dir on the resolved kit wrangler.toml + validate_required_secrets on `wrangler secret list`), or drop the Rust validator and treat the bash as canonical — but don't 


## P3

### (ci-deploy-secrets) Reusable gate workflow unconditionally emits passed=true regardless of build/test outcome — *plausible*
- **Category:** bug
- **Detail:** test-and-lint.yml's Summary step runs `if: always()` and unconditionally does `echo "passed=true" >> $GITHUB_OUTPUT` (line 94), so the workflow's `passed` output is always 'true' even when the build or cargo test step failed. Today this is not exploited because deploy.yml/workers-deploy.yml gate on job success via `needs: [gate]` (a failed step still fails the job), not on the output. But the alwa
- **Evidence:** .github/workflows/test-and-lint.yml:90-96 — Summary step `if: always()` (line 92) then unconditional `echo "passed=true"` (line 94), wired to `outputs.passed` (line 35).
- **Decision:** Gate the `passed=true` on actual step success (e.g. set it only from a step that runs without always(), or compute from step outcomes) or delete the misleading output since consumers rely on job success.

### (ci-deploy-secrets) Pre-deploy gate treats clippy and ESLint as non-blocking, weakening the gate it advertises — *plausible*
- **Category:** gap
- **Detail:** The reusable gate (test-and-lint.yml) runs ESLint and cargo clippy with `continue-on-error: true` (lines 52 and 85), so lint and clippy regressions never block a deploy despite the workflow being named the 'Pre-deploy Gate'. Only npm build, cargo fmt --check, and cargo test on forum-config actually block. This narrows the gate's real coverage and lets lint-detectable defects reach production.
- **Evidence:** .github/workflows/test-and-lint.yml:50-52 (ESLint continue-on-error) and :83-85 (clippy continue-on-error).
- **Decision:** Make clippy blocking (`-D warnings`) in the gate, matching ci.yml's rust-clippy job (ci.yml:153), or document explicitly that lint is advisory and rely on the separate required ci.yml checks for enforcement.

### (ci-deploy-secrets) concurrency cancel-in-progress can abort a multi-Worker deploy mid-matrix, leaving Workers on skewed versions — *plausible*
- **Category:** improvement
- **Detail:** workers-deploy.yml sets `cancel-in-progress: true` (line 25) with a 5-worker matrix (`fail-fast: false`). A second push to main while a deploy is running cancels the whole in-flight run, so some Workers may have been redeployed and others not — exactly the client/worker version skew the file's own comments (lines 14-18) warn wiped the forum on 2026-06-15. deploy.yml also uses cancel-in-progress (l
- **Evidence:** .github/workflows/workers-deploy.yml:23-25 (cancel-in-progress on a 5-worker matrix) and :14-18 (skew incident note); .github/workflows/deploy.yml:23-25.
- **Decision:** Set `cancel-in-progress: false` for the workers-deploy matrix so an in-flight worker rollout completes atomically before the next run starts.

### (ci-deploy-secrets) NATIVE_POD_URL (managed as a secret) is baked into the public forum WASM bundle — *plausible*
- **Category:** secret-leak
- **Detail:** deploy.yml passes `NATIVE_POD_URL: ${{ secrets.NATIVE_POD_URL }}` into `trunk build --release` for the forum client (line 166), compiling it into the WASM that ships to every visitor of dreamlab-ai.com/community. The same value is treated as a Worker secret elsewhere (set-worker-secrets.yml:27). If NATIVE_POD_URL is an internal/non-public pod-mesh endpoint, baking it into a public client bundle di
- **Evidence:** .github/workflows/deploy.yml:166 (`NATIVE_POD_URL: ${{ secrets.NATIVE_POD_URL }}` in the trunk build env) vs .github/workflows/set-worker-secrets.yml:27 (same value handled as a Worker secret).
- **Decision:** Confirm NATIVE_POD_URL is intended to be a public endpoint; if so, move it to a plain `env`/repo var (it is not a secret). If it is an internal URL, do not compile it into the public client — proxy native-pod calls through the auth Worker instead.

### (deploy-misconfig) Reusable pre-deploy gate always emits passed=true regardless of test/build result — *CONFIRMED*
- **Category:** deploy-misconfig
- **Detail:** test-and-lint.yml's Summary step runs with `if: always()` and unconditionally writes `passed=true` to $GITHUB_OUTPUT. Deploy safety currently relies on job-level `needs: [gate]` failing when a non-continue-on-error step (fmt/build/test) fails, so gating still works today. But the workflow's declared `passed` output is a latent trap: any future consumer that gates on `needs.gate.outputs.passed == '
- **Evidence:** .github/workflows/test-and-lint.yml:90-96 (Summary: if: always(); echo passed=true unconditionally); consumed as an output at lines 10-13
- **Decision:** Compute passed from actual step outcomes (drop `if: always()` on the summary or set passed based on prior step success), so the advertised output cannot claim success on a failed gate.

### (deploy-misconfig) Payments enabled with an empty token issuer and no issuer binding in the pod-worker manifest — *plausible*
- **Category:** deploy-misconfig
- **Detail:** dreamlab.toml [payments].enabled=true and [payments.token].issuer="" with a comment that the operator sets it via DREAMLAB_TOKEN_ISSUER env-override — but no such env-override or PAY_TOKEN_ISSUER exists in pod-worker.wrangler.toml [vars], which sets PAY_ENABLED=true, ticker, rate, and supply but no issuer. The DREAM token (1M supply) is thus configured live with an unset issuer. Depending on how t
- **Evidence:** forum-config/dreamlab.toml:236-245 (enabled=true, issuer=""), forum-config/deploy/pod-worker.wrangler.toml:43-47 (PAY_ENABLED=true, PAY_TOKEN_* but no issuer var)
- **Decision:** Either set an explicit PAY_TOKEN_ISSUER in pod-worker.wrangler.toml [vars] (or the documented env-override) before enabling payments, or gate PAY_ENABLED behind a non-empty issuer. Confirm the kit's behaviour on empty issuer.

### (deploy-misconfig) ZONE_CONFIG duplicated in three hand-synced sources and cohort taxonomy diverges from the rostered cohorts — *plausible*
- **Category:** deploy-misconfig
- **Detail:** The zone/access model is maintained as three independent JSON/TOML copies that must stay identical: relay-worker.wrangler.toml [vars] ZONE_CONFIG (the enforcement authority), dreamlab.toml [[zones]] (authored source), and deploy.yml ZONE_CONFIG_JSON (client render). No CI check asserts they are equal, so a drift between the relay's enforced zones and the client's rendered zones can silently over- 
- **Evidence:** forum-config/deploy/relay-worker.wrangler.toml:21 (ZONE_CONFIG) vs forum-config/dreamlab.toml:71-106 ([[zones]]) vs .github/workflows/deploy.yml:50 (ZONE_CONFIG_JSON); cohort taxonomy: zone required_cohorts at dreamlab.toml:84/93/100 vs rostered cohorts at dreamlab.toml:255/261/2
- **Decision:** Generate the relay ZONE_CONFIG [vars] and deploy.yml ZONE_CONFIG_JSON from dreamlab.toml [[zones]] (single source) via the forum-config crate, or add a CI equality check across the three. Reconcile the cohort taxonomy so zone required_cohorts match the cohorts

### (deps-supplychain) Production deploy depends on prerelease kit crates (1.0.0-beta.3) and prerelease overlay (3.0.0-rc11) — *ADJUSTED*
- **Category:** gap
- **Detail:** The four consumed kit crates are pinned at version 1.0.0-beta.3 and the overlay crate forum-config itself is 3.0.0-rc11 — prerelease versions driving prod Cloudflare Worker + WASM deploys. Cargo's bare '*' will not match prereleases, which is why the explicit '1.0.0-beta.3' + git rev combination is required (documented in Cargo.toml). Prerelease crates can carry unstable APIs/behaviour and, on cra
- **Evidence:** forum-config/Cargo.toml (all nostr-bbs-* pinned to version = "1.0.0-beta.3"; package version = "3.0.0-rc11"); forum-config/Cargo.lock:305 (version = "3.0.0-rc11"); Cargo.toml comment block explaining the prerelease-matching requirement. Only one git source in Cargo.lock (nostr-ru
- **Decision:** Accept for now given SHA pinning + lockstep enforcement, but track promotion of the kit to a stable (1.0.0) release and forum-config to a non-rc version as a post-closeout item. No code change required immediately.

### (deps-supplychain) Deprecated stub type package shipped in prod dependencies; deprecated transitive encoder — *CONFIRMED*
- **Category:** improvement
- **Detail:** @types/dompurify ^3.2.0 is declared in `dependencies` (not devDependencies) and npm marks it deprecated: 'This is a stub types definition. dompurify provides its own type definitions, so you do not need this installed.' dompurify 3.3.1 already ships its own types, so this package is redundant. Separately, whatwg-encoding 3.1.1 (transitive via jsdom test tooling) is deprecated upstream ('use @exodu
- **Evidence:** package.json dependencies '@types/dompurify': '^3.2.0' and 'dompurify': '^3.3.1'; package-lock.json node_modules/@types/dompurify 3.2.0 flagged deprecated ('stub types definition ... you do not need this installed'); node_modules/whatwg-encoding 3.1.1 flagged deprecated; package.
- **Decision:** Drop @types/dompurify entirely (dompurify self-types). Leave whatwg-encoding (transitive dev). Optionally pin @types/node to the Node 20 major used in CI. Hygiene only.

### (deps-supplychain) Unused lovable-tagger devDependency remains in the tree (dead supply-chain surface) — *CONFIRMED*
- **Category:** improvement
- **Detail:** lovable-tagger (a third-party Lovable.dev component-instrumentation Vite plugin by 'Emil Fagerholm', pulling esbuild + tailwindcss) is declared in devDependencies but is NOT imported or registered anywhere in vite.config.ts (the only plugins are @vitejs/plugin-react-swc and an inline configure-server middleware). It is dead weight that adds an unused build-time code-execution dependency. Removing 
- **Evidence:** package.json devDependencies 'lovable-tagger': '^1.1.13' (installed 1.3.0 per node_modules/lovable-tagger/package.json); vite.config.ts (no import of lovable-tagger; plugins array contains only react() and the configure-server object).
- **Decision:** Remove lovable-tagger from devDependencies and regenerate the lockfile, unless there is an intent to use it. Low risk, hygiene only.

### (frontend-xss) t — *plausible*
- **Category:** bug
- **Detail:** d
- **Evidence:** e
- **Decision:** p

### (nostr-auth-api) VITE_EMBEDDING_API_URL declared but never used in this repo — *CONFIRMED*
- **Category:** gap
- **Detail:** VITE_EMBEDDING_API_URL is declared in the ImportMetaEnv typedef but has zero references anywhere in src/ (grep across *.ts/*.tsx). Same for several other declared vars (VITE_IMAGE_API_URL, VITE_POD_API_URL, VITE_SEARCH_API_URL, VITE_AUTH_API_URL, VITE_RELAY_URL) — they are consumed by the forum, not this marketing site. Not a vulnerability (no credential, no endpoint is actually called from this b
- **Evidence:** src/vite-env.d.ts:10 (declared); no usage found by `grep -rn EMBEDDING src/` beyond the typedef; other unused VITE_ URL vars vite-env.d.ts:6-11
- **Decision:** Prune the unused VITE_ declarations from vite-env.d.ts (or move them to the forum-config package that actually consumes them) so the declared surface matches what the bundle actually calls. No security action required.

### (secrets-committed) dreamlab.toml grants the documented non-admin visionclaw-server key primary forum-admin rights — *ADJUSTED*
- **Category:** deploy-misconfig
- **Detail:** forum-config/dreamlab.toml admin.static_pubkeys lists [REDACTED-hex] as the FIRST/primary admin, annotated 'matches auth-worker ADMIN_PUBKEYS CF secret'. That pubkey is visionclaw-server, which .nostr-identities.env explicitly documents as 'Admin: no — publishes governance events only', with its private key held in a separate service (VisionClaw .e
- **Evidence:** forum-config/dreamlab.toml:37 (static_pubkeys entry '11ed6422...' commented 'power-user — primary admin'); contradicted by .nostr-identities.env visionclaw-server block ('Admin: no | Trust: 3', 'NOT admin — publishes governance events only', pubkey VISIONCLAW_SERVER_PUBKEY=[REDACTED]
- **Decision:** Reconcile the admin roster: either intentionally document visionclaw-server as an admin (and treat its service key as an admin credential with matching protection/rotation) or remove it from admin.static_pubkeys and rely on operator-jjohare + moderation-bot. E

### (secrets-committed) Cloudflare account ID (git history) and D1 database ID (tracked migration comment) disclosed — *CONFIRMED*
- **Category:** gap
- **Detail:** Two Cloudflare identifiers are disclosed. (1) The account ID [REDACTED-hex] was committed in a wrangler.toml in history (commits 93b8c16, 30ade88) though it is absent from tracked files at HEAD. (2) The D1 database ID e3981999-e8f0-4c07-9e4b-2e50859b8524 is in a tracked comment in the init migration. These are resource identifiers, not credentials — they are not exploitable witho
- **Evidence:** forum-config/deploy/migrations/001_init.sql:6 ('Database ID: e3981999-e8f0-4c07-9e4b-2e50859b8524'); `git log --all -S [REDACTED-hex]` → 93b8c16, 30ade88 (wrangler.toml); not present in HEAD tracked files.
- **Decision:** Accept the account/database IDs as non-secret identifiers, but ensure the paired API token (Finding 1) is rotated so the IDs remain inert. No history rewrite needed.

### (secrets-committed) Binary .claude/memory.db was committed to git history (now removed, but empty) — *CONFIRMED*
- **Category:** improvement
- **Detail:** A SQLite claude-flow memory DB was committed at fb416b1 (.claude/memory.db) and later removed at 79cddfa. Extracting the historical blob shows it is EMPTY of user data: memory_entries=0, sessions=0, patterns=0, trajectories=0 (only 8 metadata/schema rows), and a strings scan found no nsec/token/api-key/email/64-hex material. So no PII or secret leaked. It is history hygiene evidence that binary ag
- **Evidence:** git log --all -- .claude/memory.db → fb416b1 (add), 79cddfa (remove); extracted blob is 'SQLite 3.x database'; sqlite3 counts: memory_entries 0, sessions 0, patterns 0, trajectories 0, metadata 8; .gitignore now lists .claude/.
- **Decision:** No remediation required for the data (empty). Optionally note in closeout that history contains this empty blob; a history rewrite is not warranted. Keep .claude/ gitignored.

### (secrets-committed) Orphaned 1.5MB ruvector.db (redb vector store) left in the repo working tree — *CONFIRMED*
- **Category:** improvement
- **Detail:** ruvector.db is a redb (Rust embedded KV) file, not SQLite — magic bytes 'redb', config __ruvector_db_config__ {dimensions:384,distance_metric:Cosine}. It contains only raw 384-dim MiniLM embedding vectors plus that config JSON: strings extraction yields 24 tokens total and no readable memory content, metadata text, PII, emails, keys, or tokens. It is gitignored (*.db and explicit ruvector.db), unt
- **Evidence:** od magic 'redb' at ruvector.db:0x0; strings ruvector.db → only __ruvector_db_config__{"dimensions":384,...}; `grep -rn ruvector.db src public` → 0 references; `find dist public -name '*.db'` → none; git check-ignore ruvector.db → ruvector.db; not in `git log --all`.
- **Decision:** Delete ruvector.db from the working tree (it is regenerable and unused at runtime). Keep the *.db / ruvector.db .gitignore rules.

### (stubs-adrs-quality) Reusable test-and-lint workflow emits passed=true unconditionally on failure — *CONFIRMED*
- **Category:** bug
- **Detail:** The Summary step has `if: always()` and unconditionally writes `passed=true` to GITHUB_OUTPUT, which is the workflow's declared `passed` output. If an earlier gate step fails (npm run build, cargo test), the job fails but the advertised output still reports success. Current consumers (deploy.yml, workers-deploy.yml) gate via `needs: [gate]` job-success, so this is presently harmless, but the outpu
- **Evidence:** .github/workflows/test-and-lint.yml:10-13 (declares passed output), :90-96 (Summary `if: always()` sets passed=true regardless of prior-step outcome)
- **Decision:** Gate the passed=true emission on step success (drop `if: always()` or compute passed from job status / step outcomes), so the output cannot report success on a failing run.

### (stubs-adrs-quality) Primary-admin key is reused as the visionclaw-server governance agent key (automated broker holds top admin authority) — *plausible*
- **Category:** deploy-misconfig
- **Detail:** The pubkey [REDACTED-hex] is simultaneously the first/primary entry in [admin].static_pubkeys ('power-user — primary admin') and the [governance] agent_pubkeys entry for 'visionclaw-server' (the automated BrokerActor that publishes control panels / action requests). So an automated service key carries full static-admin authority across relay/search
- **Evidence:** forum-config/dreamlab.toml:36-37 (static_pubkeys[0] 'power-user — primary admin') and :230-231 (governance agent 'visionclaw-server') share the same hex; grep confirms the key appears exactly twice in the file
- **Decision:** Give visionclaw-server its own distinct keypair (as with the other agents) and, if it must be admin, add it explicitly and intentionally; otherwise scope it to governance-publish only. Document the decision if the reuse is deliberate.

### (stubs-adrs-quality) set-worker-secrets.yml: no empty-value guard on native-pod secrets; unescaped JSON interpolation of secret values — *plausible*
- **Category:** deploy-misconfig
- **Detail:** The PRF_SERVER_SECRET and ADMIN_PUBKEYS steps guard against an empty GH secret (exit 1 if empty), but the NATIVE_POD_URL and NATIVE_POD_ADMIN_KEY steps have no such guard — an unset/empty repo secret would be PUT as an empty CF secret, which the deploy gate then treats as satisfied-if-present. Additionally every step interpolates the raw secret value directly into the curl --data JSON string; a va
- **Evidence:** .github/workflows/set-worker-secrets.yml:23-47 (NATIVE_POD_URL/NATIVE_POD_ADMIN_KEY lack the empty check present at :55-58 and :72-75); all steps build JSON via `--data "{...${SECRET_VALUE}...}"` without escaping
- **Decision:** Add the same empty-value guard to the two native-pod steps; build the JSON payload with jq (`jq -n --arg name ... --arg text "$SECRET_VALUE" '{name:$name,text:$text,type:"secret_text"}'`) so values are escaped.

### (stubs-adrs-quality) Stale config comments/flags contradict ADR-036: marketplace/NIP-90 kept enabled, governance 'placeholder keys' misleading — *plausible*
- **Category:** stub-or-unfinished
- **Detail:** ADR-036 (Accepted) supersedes ADR-032 and explicitly abandons the NIP-90 DVM marketplace and the /community/marketplace page. Yet dreamlab.toml still sets [features] marketplace = true and describes the marketplace-agent role as 'NIP-90 job broker, cost estimation', which can surface a dangling/abandoned feature and misdocuments the agent. Separately, the [governance] block comment says 'Replace p
- **Evidence:** docs/adr/036-agent-delegation-via-device-keys.md:42-53 (NIP-90/marketplace abandoned); forum-config/dreamlab.toml:145 (marketplace=true), :276-278 (marketplace-agent 'NIP-90 job broker'), :215-217 (stale 'placeholder keys' comment over real keys :229-234), :131 ('post-Sprint-v12'
- **Decision:** Reconcile marketplace flag/role text with ADR-036 (disable or re-describe as device-key capability record); fix the governance comment to say the keys are live and note the DREAMLAB_GOVERNANCE_AGENT_PUBKEYS override is optional; resolve or delete the Sprint-v1

### (stubs-adrs-quality) branding.rs dreamlab_zone_names() is stale and dead: returns a legacy 3-zone model contradicting the shipped 4-zone config — *plausible*
- **Category:** stub-or-unfinished
- **Detail:** dreamlab_zone_names() returns the fixed 3-tuple ('Lobby','DreamLab','MiniMooNoir') mapped to kit default zone ids home/members/private, but the shipped zone model is four zones public/minimoonoir/family/business (dreamlab.toml + relay ZONE_CONFIG + deploy.yml). The function is called by nothing except its own test dreamlab_zone_names_match_legacy, and the kit consumes zones via ZONE_CONFIG vars, n
- **Evidence:** forum-config/src/branding.rs:29-37 (dreamlab_zone_names, 3-zone legacy) vs forum-config/dreamlab.toml:71-106 (4 zones); branding.rs:50-55 (only caller is the test); branding.rs:9-11 (deleted community-forum-rs design-tokens.css path)
- **Decision:** Delete dreamlab_zone_names() (or regenerate zone display names from dreamlab.toml [[zones]]); fix or remove the branding.rs doc reference to the deleted design-tokens.css; fold dreamlab_branding() into the O1/O2 generator so branding is single-sourced too.


## Verifier-surfaced misses

- [secrets-committed] Unauthenticated NIP-07 pubkey used as an identity/authorization claim (AIChatFab.tsx:60-70, 144). requestNostrAuth calls window.nostr.getPublicKey() with NO signature challenge — NIP-07 getPublicKey does not prove key ow
- [secrets-committed] Minor accuracy defect in Finding 2: the identities file holds NINE private nsec/hex keys, not the stated eight (operator-jjohare and visionclaw-server are the two placeholder entries). Does not change severity but the ro
- [ci-deploy-secrets] Root-cause behind #8 the analyst missed: NATIVE_POD_URL is defined as BOTH a plaintext [vars] value (forum-config/deploy/auth-worker.wrangler.toml:82) AND handled as a CF secret (set-worker-secrets.yml:23-34 writes `secr
- [ci-deploy-secrets] Compounds #1: the workers-deploy.yml 'Validate required auth-worker secrets' gate (L191-219) checks NATIVE_POD_ADMIN_KEY/PRF_SERVER_SECRET/ADMIN_PUBKEYS by NAME only (`grep -qxF` against `wrangler secret list`), so an em
- [ci-deploy-secrets] Verified-clean (not a leak, worth stating): ADMIN_PUBKEYS committed in cleartext in relay-worker.wrangler.toml:29 and search-worker.wrangler.toml:38 are 64-hex x-only nostr PUBLIC keys — public by design, correctly not t
- [deploy-misconfig] KIT_REF supply-chain pin: deploy.yml:41 pins the prod worker build to nostr-rust-forum SHA a149da43… which its own comment (:40) states 'tracks nostr-rust-forum PR #63 head — re-pin to the merge commit on merge'. All fiv
- [deploy-misconfig] Task-framing correction (not a vuln): the '1.5MB committed ruvector.db' is NOT git-tracked — `git ls-files | grep ruvector` returns only scripts/start-ruvector.sh; ruvector.db is present in the working tree (1,589,248 by
- [deploy-misconfig] Over-broad relay origin allowlist: relay-worker.wrangler.toml:16 and search-worker.wrangler.toml:32 set ALLOWED_ORIGINS to include https://dreamlab-ai.github.io (a GitHub Pages origin) alongside the two production domain
- [frontend-xss] CSP is effectively neutered for XSS: index.html:59 sets script-src 'self' 'unsafe-inline' 'unsafe-eval'. 'unsafe-inline' + 'unsafe-eval' negate the CSP's value as an XSS mitigation (any injected inline script would execu
- [frontend-xss] Clickjacking/frame protection is not actually enforced: index.html:61 uses X-Frame-Options via <meta http-equiv> and CSP frame-ancestors 'none' via meta (line 59). Browsers ignore X-Frame-Options in a meta tag, and frame
- [frontend-xss] Positive verification the analyst omitted: the four real XSS sinks are all correctly mitigated — ReactMarkdown (WorkshopPage.tsx:351) runs without rehype-raw so raw HTML is dropped and react-markdown@10.1.0's defaultUrlT
- [frontend-xss] Non-material note: the Mermaid DOMPurify config (WorkshopPage.tsx:200-204) re-adds ADD_TAGS:['use'] and ADD_ATTR:['xlink:href']. <use xlink:href> can be an SVG-reference vector, but DOMPurify still sanitizes the href pro
- [nostr-auth-api] No NEW material vulnerability found; the analyst's dimension is well-covered. Surfaces I independently cleared: (a) ruvector.db — the task's 'committed 1.5MB ruvector.db' premise is FALSE; it is gitignored (.gitignore:87
- [nostr-auth-api] Severity-calibration note the analyst omitted and should be recorded: Finding 1's fetch is dead code because VITE_AI_CHAT_URL is unset in both .env and .env.example — the AI chat currently only returns a canned 'not conn
- [deps-supplychain] [P1 — MATERIAL, in-scope secret leak] Hardcoded, git-committed Nostr private key. scripts/seed-forum.mjs:20, scripts/seed-semantic.mjs:17 and scripts/assign-cohorts.mjs:18 all contain `const ADMIN_PRIVKEY_HEX = [REDACTED]
- [deps-supplychain] [Note, not a new finding] scripts/seed/.test-keys.json contains three privkey/pubkey pairs (family-dave/friends-carol/business-bob) but is UNTRACKED (git ls-files --error-unmatch fails) — confirmed NOT committed, so thos
- [stubs-adrs-quality] Secret-leak surfaces flagged in the task are all clean (strengthens the 'no committed secrets' claim): .env.example is the only tracked env file and holds placeholders + explicit 'never commit real credentials' notes; ru
- [stubs-adrs-quality] Minor ADR-vs-code drift the analyst did not call out explicitly (subsumed by F2): ADR-037 O2 (line 24) still describes search-worker.wrangler.toml ADMIN_PUBKEYS as 'a 2-key plaintext [vars] value', but search-worker:38 n
- [stubs-adrs-quality] Out-of-dimension (frontend-security, flag for that lane): AIChatFab.tsx requestNostrAuth (src/components/AIChatFab.tsx:60-64) only calls window.nostr.getPublicKey() with no signed NIP-98/challenge — a bare pubkey is an i
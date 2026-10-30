---
id: ADR-2010
title: A nightly SEO and agent-searchability watch runs alongside the dream engine and proposes through draft PRs
date: 2026-10-12
decision_status: accepted
implementation_status: complete
activation_status: live
supersedes: []
superseded_by: []
verified_commit: 5a6ac5fe
owner: jjohare
review_trigger: any change to the patch allowlist, the propose mode, the browser sidecar contract, or a new nightly job sharing the 05:00-06:00 UTC slot
repo: dreamlab-ai-website
---

# ADR-2010 — A nightly SEO and agent-searchability watch runs alongside the dream engine and proposes through draft PRs

## Context
The site is a prerendered React SPA on GitHub Pages whose discoverability
surface (canonicals, Open Graph, JSON-LD, `robots.txt`, `llms.txt`,
`llms-full.txt`, lesson Markdown alternates) is checked only at build time by
`scripts/check-discovery.mjs`. Nothing watched the live site as crawlers and
AI agents fetch it, nothing measured hydration parity or Lighthouse over time,
and nothing proposed improvements. The dream engine (agentbox ADR-2024) is
evidence-gated and human-merge-gated but reasons over evaluator receipts, not
over the live site; it also owns the 01:00-05:00 UTC window.

## Decision
`scripts/seo-watch/` is a nightly job supervised by the agentbox as
`[program:seo-watch-cron]`, gated on `[seo_watch].enabled` in `agentbox.toml`
and running supercronic over this repo's `scripts/seo-watch/crontab`
(05:40 UTC, after the dream window and the diagram review). It runs
**alongside** the dream engine: it never edits `dream.config.json`,
`docs/dream-cycle/`, or any `dream/*` branch, and the dream engine does not
consume its output. Three phases, each fail-open for the next:

1. **audit** (`lib/audit.mjs`, `lib/checks.mjs`): deterministic receipts from
   the live site. Sitemap, robots (RFC 9309 longest-match for every AI and
   search crawler we name), `llms.txt` links resolved live, `security.txt`,
   a rotating roster of sitemap pages (the eleven marketing pages every night
   plus the least-recently-seen remainder), per-page metadata and JSON-LD,
   user-agent parity (the same page fetched as Googlebot, Bingbot, GPTBot,
   OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot and PerplexityBot
   must return the same status and main text), and through the browsercontainer
   sidecar over MCP SSE (`lib/mcp-sse.mjs`, no SDK) hydration parity, console
   errors and mobile Lighthouse for a rotating few. Lighthouse drops count only
   beyond 5 points over 2 consecutive nights or below a 90 floor.
2. **advise** (`lib/advise.mjs`, `lib/glm.mjs`): `glm-5.3` via Z.AI, Anthropic
   Messages API, at the model's maximum reasoning effort (no thinking budget is
   named: an explicit one only lowers it) with the full 128K output cap and a
   30-minute call timeout, is called at most once a night and only when the
   finding fingerprint changed, a Lighthouse regression appeared, it is the
   weekly digest day, or the operator forced it, within a monthly token budget.
   The fingerprint covers the fixed core pages and site-level findings only, so
   the rotating roster does not trigger a call. It receives the receipts, the
   ledger tail, the exact `origin/main` contents of the allowlisted files and,
   read-only, the reference files (`src/lib/og-meta.ts`, `index.html`) so it can
   cite the line a human should edit. It answers with a report plus
   `PROPOSE: YES|NO` and at most one `seo-patch` unified diff.
3. **propose** (`lib/propose.mjs`): the diff is validated (allowlist
   `public/robots.txt` and `public/llms.txt` only: text the build never
   executes, so a model-written patch cannot run code; no renames, creations,
   deletions, modes or binaries; at most 60 changed lines; no file on
   cool-down; paths re-checked from `git apply --numstat`), applied on a
   detached worktree of `origin/main`, and `npm run build` (which runs the
   discovery check), `npm run lint` and `vitest` run against that tree under a
   cleared environment with a throwaway HOME, carrying only PATH-class plumbing
   and the public `VITE_*` values from `deploy.yml`. This is the same uid, not
   a sandbox: the allowlist is the isolation. After the build the tree must
   equal the applied patch exactly (same `git diff`, no other modified or
   untracked path); only those files plus the report are staged, and the
   commit runs with hooks disabled because the worktree shares `.git` with the
   checkout. Green opens **one draft PR at a time** labelled `seo-watch` on a
   `seo/nightly-<date>` branch carrying its report under `docs/seo/nightly/`.
   A human merges. The gate runs before the model call, so an open PR or a
   cool-down shapes the prompt. A proposal closed unmerged puts its files on a
   14-day cool-down. Reconcile deletes only branches this job owns (recorded
   in state or carrying a labelled PR), never one with an open PR, and leaves
   everything alone when `gh` errors.

Reports, the ledger (`ledger.jsonl`) and state live outside the repo under
`~/workspace/.agentbox/seo-watch/`. Every report, ledger row and PR body is
scrubbed of secret-looking environment values and token shapes; only an
allowlist of response headers is kept. `robots.txt` crawler policy is never
patched: unaddressed training crawlers are a note for a human. A weekly
Perplexity probe (when `PERPLEXITY_API_KEY` is set) records whether an AI
search engine cites dreamlab-ai.com for a fixed query set, the outcome metric.

## Consequences
- Discoverability regressions on the live site surface within a night, with a
  trend, and improvements arrive as reviewable PRs instead of being noticed by
  accident. The test-and-lint workflow gates every proposal PR as usual.
- Two metered dependencies (Z.AI, Perplexity) and the shared browser sidecar
  are exercised nightly; the sidecar being down costs an `info` finding, not a
  failed night. A quiet night makes no model call.
- The agentbox gate is REBUILD-class; the crontab, config and code are not.
- Hosting facts are stated, not patched: a `public/_redirects` file is inert
  on GitHub Pages, and a sitemap URL answering 404 means the prerender missed
  it. Google Search Console and Bing Webmaster data are not consulted (no
  credentials); adding them is the next step if indexing status is wanted.
- Follow-on: executable sources (`og-meta.ts`, `index.html`, `src/pages/*.tsx`)
  stay read-only until patches to them can be verified under a different uid
  or a no-network sandbox; until then the model cites the line and a human
  edits. The 90-minute cron bound and the 6M-token monthly budget assume a
  max-effort call of roughly 7K in / 20K out (measured 193 s on 2026-10-12).

## Verification
Working tree on top of 5a6ac5fe (the commit before this change landed): `npx vitest run scripts/__tests__/seo-watch.test.mjs`
(33 tests: HTML analysis, robots matching, parity, Lighthouse parsing and
regression logic, roster, stable-page fingerprint, SSE framing, patch
extraction and validation including bypass attempts and cool-down, branch
ownership, porcelain parsing, secret scrubbing, cleared build environment,
advise decision and prompt). An Opus review of the full diff on 2026-10-12
found and this change fixed: executable files on the allowlist, `git add -A`
after the build, a too-wide `ls-remote` pattern that could delete a human's
branch, the lock directory not existing on a fresh box, and the cool-down
being applied after the prompt was built. Live dry runs on 2026-10-12 against
https://dreamlab-ai.com: `node scripts/seo-watch/run.mjs audit` audited 30 of
199 sitemap pages with 0 high, 0 medium, 21 low findings, parity clean across
8 agents; the sidecar returned Lighthouse SEO 100 / accessibility 98 /
best-practices 100 / agentic-browsing 100 for `/programmes/`. Agentbox:
`[seo_watch]` in `agentbox.toml`, `seoWatchEnabled` and
`[program:seo-watch-cron]` in `flake.nix` (staged until the next
`./agentbox.sh rebuild`).

## Close-out 2026-10-30

`activation_status` staged → live, on runtime evidence executed today in the agentbox that supervises the job:

- `supervisorctl status seo-watch-cron` → `RUNNING pid 989`; `agentbox.toml` `[seo_watch]` carries `enabled = true`.
- `~/workspace/.agentbox/seo-watch/ledger.jsonl` holds 17 nightly rows, 2026-10-13 to 2026-10-30 (no row for 2026-10-27). Today's row is run `f36e444db922` at 05:40:57Z: 30 pages audited, 0 high / 0 medium / 18 low findings, user-agent parity clean across 8 agents, mobile Lighthouse SEO 100 on `/`, `/programmes/` and `/co-create/`, no model call ("findings unchanged since last night"), no patch proposed.

`implementation_status` stays complete and `verified_commit` is unchanged: this note certifies the running job, not a new source revision.

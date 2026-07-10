# Open Issue Triage — 2026-07-10

Triage of the 11 open GitHub issues on `DreamLab-AI/dreamlab-ai-website`.

The controlling fact is the repo boundary: this repo is the **operator overlay**
(`forum-config/` + CI + branding + docs). The forum client, relay, pod browser,
notifications and post editor are **upstream in
[`DreamLab-AI/nostr-rust-forum`](https://github.com/DreamLab-AI/nostr-rust-forum)**
(the pinned kit). Per `CLAUDE.md`: *forum behaviour changes belong upstream, not
here — this repo only configures and pins the kit.* So most "site bugs" filed
here are really kit issues in disguise; the correct resolution is to move them
upstream, and keep only the config/CI/branding half here.

## Classification

| # | Title | Belongs | Half addressable in THIS repo |
|---|-------|---------|-------------------------------|
| 40 | Doc review needed (auto) | this repo (docs/CI) | yes — CI + docs |
| 39 | Doc review needed (auto) | this repo (docs/CI) | duplicate of 40 |
| 37 | Doc review needed (auto) | this repo (docs/CI) | duplicate of 40 |
| 35 | Doc review needed (auto) | this repo (docs/CI) | duplicate of 40 |
| 36 | Notifications — Mark all read | nostr-rust-forum | no |
| 34 | Colour code the forums | mixed | yes — zone→colour config |
| 31 | Notifications | nostr-rust-forum | no |
| 28 | Pod Browser — pod url | nostr-rust-forum | no |
| 27 | Version | mixed | yes — build-version injection |
| 26 | Forum posts — features missing | nostr-rust-forum | no |
| 21 | Branded MiniMooNoir | this repo (branding) | yes — `[branding]` config |

## Per-issue resolution path

### Auto-generated doc-review issues — #40, #39, #37, #35 (this repo, self-inflicted spam)

Root cause: `.github/workflows/docs-update.yml` runs weekly (`cron: 0 22 * * 0`)
and **opens a brand-new issue** every Sunday for any `docs/*.md` older than
`THRESHOLD_DAYS=90`. It never reconciles against the previous week's issue, so
one accumulates per week (#35 → #37 → #39 → #40).

- **#40** — keep as the single canonical doc-drift tracking issue.
- **#39, #37, #35** — close as duplicates of #40.
- **Stop the recurrence (one-line fix):** make `docs-update.yml` idempotent —
  search for an existing open issue by the fixed title and *edit its body*
  instead of `create`, or gate creation on `if: no open issue with this title`.
  Secondary: raise `THRESHOLD_DAYS` or exclude historical `docs/prd/`,
  `docs/adr/`, `docs/tranche-1/` (record-of-decision files that are *meant* to
  be old) so the report only flags genuinely live docs.

### #36 Notifications — Mark all read (nostr-rust-forum)

Client button is a no-op — the mark-all-read handler doesn't dispatch the
read-state update. **File upstream** in nostr-rust-forum (notifications
component); nothing configurable in the overlay.

### #31 Notifications not hooked up (nostr-rust-forum)

No subscription for new topics/posts. **Upstream feature** — the kit must
subscribe to the relay for new events and surface a notification store. Not
overlay config; this repo already supplies `VITE_RELAY_URL`.

### #34 Colour-code the forums by zone (mixed — config here, render upstream)

Requested map: Landing=green, MiniMooNoir=blue, Fairfield/Family=amber,
DreamLab/business=purple, applied on `/community/forums` and on drill-down.
**Two-part fix:** (1) upstream kit reads a per-zone `colour` token and applies
it to the forum list + zone pages; (2) this repo supplies the zone→colour map in
`forum-config/dreamlab.toml` `[[zones]]` (the four-zone model already lives
there). Blocked on the upstream token; the config half is a small overlay edit
once the kit field exists.

### #28 Pod Browser — pod url (nostr-rust-forum)

Raw pod URL is shown unlabelled and 404s (auth-gated) when pasted. **Upstream
UX** — the kit's pod browser should label/hyperlink the URL and explain that it
is auth-gated, not a public link. Overlay only supplies `VITE_POD_API_URL`.

### #27 Version + commit hash in settings (mixed — deploy-side here)

**The env-injection half is genuinely this repo's:** inject build version and
git SHA into `window.__ENV__` from `.github/workflows/deploy.yml` (alongside the
existing `VITE_*`/`ZONE_CONFIG` injection). The kit then renders it in a settings
panel (upstream). Quick win: expose `APP_VERSION` / `APP_COMMIT` in
`window.__ENV__` now; upstream adds the display.

### #26 Forum posts — edit / photo+video upload / link previews (nostr-rust-forum)

All post-composer features → **upstream kit**. Note the `dreamlab-link-preview`
worker is *already* deployed from this repo (`VITE_LINK_PREVIEW_API_URL`), so the
link-preview item is unblocked on the backend — the kit just needs to call it.
Edit-post and media upload are new kit features.

### #21 Branded MiniMooNoir (this repo — branding, + kit theme support)

**Primarily overlay work:** set the MiniMooNoir `theme` / `banner_url` /
`logo_url` in `forum-config/dreamlab.toml` `[branding]` (these flow into
`window.__ENV__` and drive both the Leptos client and the ASCII/BBS client). The
kit must recognise the named theme. Config-owned here; coordinate the theme name
with upstream.

## Recommended milestone grouping

- **Overlay quick wins (this repo):** #27 (version injection), #21 (branding
  config), doc-review dedupe + `docs-update.yml` idempotency (#40 canonical,
  close #35/#37/#39).
- **Upstream nostr-rust-forum backlog:** #36, #31, #28, #26, and the render half
  of #34.
- **Cross-cut:** #34 and #27 need one upstream change + one overlay change each —
  track as paired issues so the halves ship together.

## Related security items (operator-gated, not in this triage's scope)

Two confirmed security findings sit outside the GitHub issue tracker and are
**operator actions**, documented separately:

- **Admin-key reuse as broker** — the visionclaw-server broker key
  `11ed64…663c` is listed as PRIMARY forum admin across four `ADMIN_PUBKEYS`
  mirrors. The required key-separation design (mint a distinct operator/admin
  key, remove the broker key from every `ADMIN_PUBKEYS`, keep visionclaw-server
  in `[governance]` only) is fully specified in
  `docs/deployment/admin-key-split-runbook.md`. **No key is minted or deployed
  here** — it is a four-location atomic change that includes an auth-worker CF
  secret CI cannot reach, so it is staged for the operator.
- **Credential rotation** — live Cloudflare API token, GitHub tokens and 8
  secp256k1 keys (all git-ignored, none committed) flagged for rotation in
  `CLOSEOUT-SECURITY-AUDIT.md`.

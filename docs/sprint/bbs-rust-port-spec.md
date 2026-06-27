# ASCII/BBS forum client — Rust port spec (for nostr-rust-forum)

**Decision (final):** the retro ASCII/BBS forum client is built **in the kit
(`nostr-rust-forum`) as Rust/Leptos**, alongside `nostr-bbs-forum-client`, served
under `/community/`, and **configured entirely from the kit's TOML**
(`forum.toml` / DreamLab's `forum-config/dreamlab.toml`). This overlay no longer
ships a client — it pins the kit (`KIT_REF`) and applies the TOML, exactly like the
main forum.

> A React/TS prototype previously lived in this overlay at `/bbs`
> (`src/lib/bbs`, `src/components/bbs`, `src/hooks/bbs`, `src/pages/BBS.tsx`). It
> has been **removed**. Its source — preserved in this repo's git history (PR #38,
> commits up to `01f1f09`) — is the **authoritative behavioural reference** for the
> port: 10 screens, the relay client, identity, keyboard model, and 4 themes, with
> 48 passing tests describing the contracts.

## 1. Placement in the kit

- New crate `crates/nostr-bbs-bbs-client` (Leptos CSR + Trunk), a sibling of
  `nostr-bbs-forum-client`. Build with `trunk build --release --public-url
  /community/bbs/` → served at `/community/bbs/`.
- Reuse the kit's design tokens and the shared `window.__ENV__` runtime config the
  forum client already consumes.

## 2. Reuse kit crates — do **not** reimplement

The React prototype reimplemented things the kit already has in audited Rust. The
port should depend on the existing crates instead:

| Concern | React prototype file (reference) | Use in the kit instead |
|---|---|---|
| Event id + Schnorr verify | `lib/bbs/relay.ts` `isVerifiedEvent` | `nostr-bbs-core` `event::verify_event_strict` |
| NIP-01/42 relay protocol | `lib/bbs/relay.ts` | the kit's relay/client transport + `nostr-bbs-core` |
| Signing / identity (nsec/NIP-07) | `lib/bbs/identity.ts` | kit signer + `nostr-bbs-forum-client/auth` (WebAuthn-PRF, NIP-07) |
| Zones / cohorts / access | `lib/bbs/env.ts`, `rank.ts` | `nostr-bbs-config` `ZoneConfig` (the canonical model) |
| Channels (kind-40) / posts (kind-42) | `lib/bbs/forum.ts` | kit channel/zone projection (now zone-gated server-side after `7b9bef45`) |
| Search / NIP-11 / whitelist | `lib/bbs/services.ts` | kit search/relay-info clients |

Net: the Rust BBS is mostly a **terminal-styled view layer** over the kit's
existing data/auth/zone plumbing — much smaller than the prototype, and it inherits
the relay-side zone enforcement automatically.

## 3. Feature parity (from the reference)

Chrome: status bar (connection light + live clock + node/location/users), ASCII
banner, two-column numbered **main menu**, footer stats (User/Level/Auth/Zones/
Credits), command line (`/` to focus, word + number commands), F1–F10 legend,
"newest posts" panel, CRT scanline CSS, 4 themes.

Screens (10): Message Base (areas→channels→thread + compose), File Base (pod
browser), Node List (relay NIP-11 + zone access map + mesh), User List (kind-0
profiles), Chat (live feed + post), Door Games (playable), Code Exchange
(`#code` snippets), System Info (+ search), Settings (identity + theme), Help.
Keyboard model: arrows/vim + numbers + Esc-back + Ctrl+Enter to send; see
`lib/bbs/menu.ts`, `hooks/bbs/useListNav.ts`, `useEscape.ts` for exact bindings.

## 4. TOML-driven configuration ("application of the toml")

Everything DreamLab-specific must come from config, not hardcode (the prototype's
de-brand gap). Source of truth = `forum-config/dreamlab.toml`, projected by
`nostr_bbs_config` + `deploy.yml` into `window.__ENV__`:

| BBS element | TOML / env source |
|---|---|
| Theme (amber/green/purple/sky) | `[branding].theme` |
| Forum name / banner title | `[deployment].name` / `FORUM_NAME` |
| Node name, location string | new `[branding]` keys (e.g. `node_name`, `location`) → `__ENV__` |
| Zones in Message Base / Node List | `[[zones]]` → `ZONE_CONFIG` (already injected) |
| Relay / auth / pod / search URLs | `[relay]`/`[pod]`/… → `VITE_*` (already injected) |
| Optional zone accent colour | `[[zones]].accent_hex` (new field, already validated in `nostr-bbs-config`) |

Add the few new `[branding]` keys (node_name, location, banner/logo) to
`nostr-bbs-config` + `forum.example.toml`; DreamLab sets them in `dreamlab.toml`.

## 5. Overlay consumption (this repo) — when the kit ships it

1. `deploy.yml`: after cloning the kit at `KIT_REF`, also
   `trunk build --public-url /community/bbs/` the new crate and copy into
   `dist/community/bbs/` (mirrors the existing forum build step).
2. Inject any new branding keys into `window.__ENV__` alongside the current set.
3. Optional `/bbs` → `/community/bbs/` redirect (a `404.html` rule like the existing
   `/community` branch) so the short URL keeps working.
4. Bump the dual-pin (`KIT_REF` ×3 + `forum-config/Cargo.toml` revs + lock) to the
   kit commit that adds the client — the `pin-check` CI job guards it.
5. Re-add the `/bbs` (or `/community/bbs/`) row to `public/sitemap.xml` and the
   CLAUDE.md routing note.

Until then, this overlay simply has no BBS route (the prototype is removed).

## 6. Status

- Overlay: React prototype **removed** (this PR); `nostr-tools` returned to
  devDependencies (only the seed scripts use it now).
- Kit (`nostr-rust-forum`): port to be implemented in the collaboration branch;
  the relay-side zone enforcement it depends on already landed in `7b9bef45`.
- This spec + the git-history React reference are the inputs for that work.

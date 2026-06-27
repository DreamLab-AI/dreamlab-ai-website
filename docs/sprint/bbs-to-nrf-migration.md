# Migrating the `/bbs` ASCII client into `nostr-rust-forum`

**Why:** the BBS is a *generic* Nostr forum client (it speaks the kit's relay
protocol; the DreamLab specifics are only `window.__ENV__` defaults). It belongs
beside `nostr-bbs-forum-client` in the kit so every deployment can use it, per the
overlay principle *"forum behaviour belongs upstream; the overlay only
configures/pins."* This repo (`dreamlab-ai-website`) then **consumes** the
kit-built BBS the same way it consumes the Leptos forum at `/community/`.

> **Form decided:** relocate **as-is (React/TS)** — it's tested and self-contained;
> a Leptos/Rust port can come later. The kit hosts it as a standalone web client
> built with its own toolchain (Vite), not as a Rust crate.

## 1. Status / ownership

- Source of truth **today:** this repo, branch `claude/ascii-forum-interface-5ys8fm`
  (PR #38). It stays here and keeps serving `/bbs` until the kit-built version is
  live — do **not** delete it from the overlay first.
- The move itself happens in the kit (a maintainer with push access / the NRF
  session) — this overlay session cannot push to `nostr-rust-forum`.

## 2. File manifest (50 files, ~5,300 LOC) → kit `clients/bbs/src/...`

Suggested kit layout: a new top-level `clients/bbs/` web app (sibling to the Rust
crates), or under `crates/nostr-bbs-forum-client/bbs-web/` if you prefer it nested.
Copy these from the overlay (paths relative to repo root), preserving structure:

```
src/lib/bbs/         → clients/bbs/src/lib/bbs/      (13 .ts: types, env, relay, forum,
                                                      identity, services, theme, rank,
                                                      format, menu, keyboard, ascii + tests)
src/components/bbs/  → clients/bbs/src/components/bbs/ (terminal, screens/*, session/*,
                                                      common, bbs.css, __tests__)
src/hooks/bbs/       → clients/bbs/src/hooks/bbs/     (useAsync, useBbsSession, useClock,
                                                      useEscape, useListNav)
src/pages/BBS.tsx    → clients/bbs/src/App.tsx        (the route entry → app root)
```

The `@/` import alias maps to the app `src/` — keep it (tsconfig + vite config) or
rewrite imports to relative. No other overlay code is referenced.

## 3. Dependencies & toolchain

- Runtime dep: **`nostr-tools`** (`^2.23.x`) only. Dev: vite, vitest, @testing-library,
  typescript, tailwind (the BBS uses Tailwind arbitrary values + `bbs.css`).
- Build: `vite build` → static assets. Tests: `vitest run` (48 BBS tests travel with it).
- Deploy parity with `/community/`: build with a base/public-url (e.g.
  `--base /community/bbs/`) and emit into the published tree; the overlay's
  `deploy.yml` then copies `dist/community/bbs/` like it does the Trunk output.

## 4. De-brand for the kit (make DreamLab values config-driven)

The client already reads `window.__ENV__` first; only the **fallback defaults** are
DreamLab-specific. Make these generic (or read from the kit's `forum.example.toml`):

| File | DreamLab-ism | Make it |
|------|--------------|---------|
| `lib/bbs/env.ts` | `DEFAULTS` URLs (`*.solitary-paper-764d.workers.dev`), `forumName`, `DEFAULT_ZONES` | empty/`localhost` dev fallbacks; rely on injected `window.__ENV__` (the kit already injects `VITE_*` + `ZONE_CONFIG`) |
| `lib/bbs/ascii.ts` | `DREAMLAB_LOGO`, `TAGLINE`, `CAT_MASCOT` | generic kit banner, or drive from `__ENV__.FORUM_NAME` / a config banner string |
| `components/bbs/session/BbsProvider.tsx` | `NODE_NAME = "DREAMLAB"`, default theme `amber` | `__ENV__.NODE_NAME` / `__ENV__.theme` with neutral fallback |
| `components/bbs/StatusBar.tsx` | `"CLAUDE CODE BBS"`, `"Deep in the Lake District"` | `__ENV__.FORUM_NAME` + a configurable location string |
| `components/bbs/screens/SettingsScreen.tsx` / `HelpScreen.tsx` | `/community/` links, "DreamLab" copy | kit-relative links / neutral copy |
| `lib/bbs/rank.ts` | rank labels (`DreamLab`, `Family`, `Friend`…) | keep cohort→rank mapping but make labels overridable or kit-neutral |
| `pages/BBS.tsx` (→ App) | OG meta "DreamLab BBS" | generic / config-driven title |

`rank.ts` cohort logic, `theme.ts` palettes, `forum.ts`/`menu.ts`/`types.ts` are
already generic (matches there are comments / the word "forum").

## 5. How this overlay consumes it afterwards

1. Kit builds `clients/bbs` → `dist/community/bbs/` (or a path the kit publishes).
2. Overlay `deploy.yml`: after cloning the kit at `KIT_REF`, build the BBS client
   alongside the Leptos forum and copy its output into `dist/community/bbs/`.
3. Overlay keeps a thin redirect/route: `/bbs` → `/community/bbs/` (a 404.html
   rule like the existing `/community` branch), and the React `/bbs` route +
   `src/lib/bbs`, `src/components/bbs`, `src/hooks/bbs`, `src/pages/BBS.tsx` are
   **deleted** from the overlay in the same PR that wires the kit build.
4. `window.__ENV__` injection in `deploy.yml` already carries `ZONE_CONFIG`,
   `VITE_RELAY_URL`, `FORUM_NAME`, etc. — add `NODE_NAME` and any banner config.
5. Update CLAUDE.md routing + sitemap (the `/bbs` row) to reflect the kit-served path.

## 6. Cutover checklist

- [ ] Kit: add `clients/bbs/` (manifest §2), de-brand (§4), wire Vite build, port tests.
- [ ] Kit: CI builds + runs the 48 BBS tests; publishes `dist/community/bbs/`.
- [ ] Overlay: `deploy.yml` builds/copies the kit BBS; add `/bbs → /community/bbs/`.
- [ ] Overlay: remove the local BBS source + React route; bump `KIT_REF` (dual-pin) to
      the kit commit that adds the client (the `pin-check` job guards it).
- [ ] Verify `/bbs` loads from the kit build against the live relay; drop this guide's
      "keep local copy" caveat.

Until those land, the overlay's own `/bbs` (PR #38) remains the shipping version.

# Keybase → Nostr migration utility

One-shot migration of a legacy Keybase team (dozens of users, 100k+ messages)
onto the DreamLab community relay. Local web UI + Node server; nothing leaves
your machine except the final writes to the relay/D1.

## Architecture

```
┌──────────────────────── your machine ────────────────────────┐
│  Browser UI (http://127.0.0.1:8989)                           │
│      │ selection, names, dry-run stats, progress              │
│  server.mjs (Node 22+, binds 127.0.0.1 only)                  │
│      ├─ lib/keybase.mjs  → shells out to `keybase chat api` / │
│      │                     `keybase team api` (paginated read,│
│      │                     same approach as keybase-export)   │
│      ├─ lib/convert.mjs  → pure transform: edits/deletes/     │
│      │                     replies/reactions → publish plan   │
│      ├─ lib/nostr.mjs    → keygen, signing, NIP-98 admin HTTP,│
│      │                     websocket publish                  │
│      └─ lib/d1.mjs       → `wrangler d1 execute --remote`     │
│  work/ (gitignored)      → archive, keys.json, plan.json      │
└───────────────┬──────────────────────────────┬────────────────┘
                │ NIP-98 admin + WS (control)   │ bulk SQL (data)
                ▼                               ▼
   dreamlab-nostr-relay worker        D1: dreamlab-relay
   (whitelist, channels, profiles)    (events table, INSERT OR IGNORE)
```

## Prerequisites (CachyOS)

- `keybase` CLI installed (`paru -S keybase-bin`) — logged-in desktop client
  is enough; otherwise the UI takes username + paper key (`keybase oneshot`).
- Node 22+ (global `WebSocket` is required).
- For the fast **Direct D1** publish mode: `CLOUDFLARE_API_TOKEN` (+
  `CLOUDFLARE_ACCOUNT_ID`) exported in the shell that runs the server, or a
  prior `wrangler login`. Target database: `dreamlab-relay`
  (`97c77d23-0e24-4325-ada7-1747eab4095b`, from
  `forum-config/deploy/relay-worker.wrangler.toml`).
- Relay admin key (hex or nsec) for the NIP-98 admin endpoints — paste in the
  UI or export `DREAMLAB_ADMIN_KEY` before starting the server. It is held in
  memory only.

## Run

```bash
cd scripts/keybase-migration
npm install
npm test          # pure-conversion unit tests
npm start         # → http://127.0.0.1:8989
```

## Wizard flow (multi-pass)

1. **Connect** — uses the existing Keybase session, or paste username + paper
   key (passed to `keybase oneshot` via env vars, never logged). Enter the
   team name and fetch the inventory: full channel list
   (`listconvsonname`) + member roster with Keybase full names
   (`list-team-memberships`).
2. **Select** — tick channels (choose a forum zone per channel:
   public/friends/family/business) and members. Keybase usernames become
   Nostr handles; real names are prefilled from Keybase and editable. Cohort
   checkboxes control relay write access per zone. "Save selection" generates
   a secp256k1 keypair per member (persisted in `work/keys.json`; re-runs
   never regenerate existing keys). **Download keys CSV** for distributing
   each `nsec` to its owner.
3. **Export** — pages through the full history of each selected channel
   (`chat api read`, 300/page, `peek` so nothing gets marked read) into
   `work/archive/<topic>.json` as compacted messages.
4. **Plan (dry run)** — applies Keybase edits, drops deleted messages (and
   reactions on them), resolves reply threads, maps senders to identities,
   truncates anything over the relay's event-size cap, and reports counts +
   which unselected senders' messages will be dropped. Output:
   `work/plan.json`. Nothing published yet.
5. **Publish** —
   - whitelists every member (NIP-98 `POST /api/whitelist/add` with their
     cohorts) and the admin key;
   - creates one NIP-28 channel (kind 40, `section` zone tag, admin-signed)
     per Keybase channel and maps it via `POST /api/admin/channel-zone`;
   - publishes kind-0 profiles signed by each member's key
     (`name` = keybase username, `display_name` = real name);
   - signs every message as kind 42 (`e` root tag → channel, `e` reply tag
     for Keybase replies, `section` zone tag, `keybase` provenance tag,
     `created_at` = original Keybase timestamp) and reactions as kind 7,
     then bulk-writes them:
     - **Direct D1** (default): batched `INSERT OR IGNORE` via
       `npx wrangler d1 execute dreamlab-relay --remote` — ~minutes for 100k
       events, bypasses the relay's 10 events/sec limit. Control-plane writes
       (whitelist/channels/profiles) still go through the worker.
     - **Relay websocket**: full validation path at ~8 events/sec
       (~3.5 h per 100k) — useful for a small trial channel first.

### Idempotency / resume

Event ids are deterministic (timestamps, tags and content all derive from the
Keybase data; ids exclude signatures), so re-running publish is safe:
duplicates are ignored (`INSERT OR IGNORE` / relay duplicate OK). D1 mode also
checkpoints batch progress in `work/publish-state.json` and resumes where it
stopped if the plan is unchanged.

## Mapping summary

| Keybase | Nostr |
|---|---|
| team channel | kind 40 channel (admin-signed) + `section` zone tag + channel-zone mapping |
| member | secp256k1 keypair, kind 0 profile (`name`=username, `display_name`=real name), whitelist entry with cohorts |
| text message | kind 42, `created_at` = original `sent_at`, `keybase` provenance tag |
| reply | NIP-10 `e` tag (`reply`) to the parent's event |
| edit | applied to the original body before conversion |
| delete | message (and its reactions) dropped |
| reaction | kind 7 with `e`/`p` tags to target |
| attachment | kind 42 placeholder `[attachment: filename] title` (assets not migrated) |
| join/leave/system/headline/unfurl | dropped |

## Limitations / cautions

- **Attachments are not migrated** — only a text placeholder. Keybase asset
  download + pod upload would be a follow-up pass.
- Messages from members you didn't select are dropped (counts shown in the
  dry run) — select everyone you care about, even if they may never log in.
- The **family** zone is flagged `encrypted: true` in the zone config;
  migrated history is plaintext, so prefer friends/business zones unless you
  accept that.
- Direct D1 mode bypasses relay-side zone write-gates by design (you are the
  operator); the dry run is your review step.
- Search embeddings are not generated; run the existing search re-index
  tooling afterwards if you want migrated history searchable.
- `work/keys.json` and the CSV hold real private keys — distribute, then
  shred (`shred -u`). Nothing else persists secret material; paper key and
  admin key stay in memory.

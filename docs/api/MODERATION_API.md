# Moderation, WoT, Invites, Welcome — Auth-Worker API

**Added in:** Sprint 2026-04 Obelisk-Polish | **Worker:** `auth-worker` | **Auth:** NIP-98 on every request

This document covers the four new endpoint families added in the April 2026 sprint. All endpoints are served by the `auth-worker` Cloudflare Worker.

## Authentication

Every mutating endpoint requires a NIP-98 `Authorization: Nostr <base64-event>` header. The event binds the request method, URL, and SHA-256 of the request body to prevent replay. Admin-only endpoints additionally check `members.is_admin = 1` for the signing pubkey.

---

## Moderation (`/api/mod/*`)

Backed by Nostr parameterized-replaceable event kinds **30910-30914** (defined in `nostr-core/src/moderation_events.rs`) with D1 projections in `moderation_actions` and `reports` tables for fast querying.

| Kind | Name | `d` tag | Effect |
|------|------|---------|--------|
| 30910 | Ban | banned pubkey | relay-worker blocks ALL kind-1/42 from target |
| 30911 | Mute | muted pubkey | blocks kind-1/42 until `expires` tag |
| 30912 | Warning | warned pubkey + ts | audit trail, visible to user |
| 30913 | Report | reported event id | user-submitted, admin-processed |
| 30914 | ModerationAction | action uuid | audit log entry |

### Endpoints

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/api/mod/ban` | admin | `moderation::handle_action` |
| POST | `/api/mod/mute` | admin | `moderation::handle_action` |
| POST | `/api/mod/warn` | admin | `moderation::handle_action` |
| POST | `/api/mod/report` | any authed user | `moderation::handle_report` |
| GET | `/api/mod/actions?target=<pubkey>` | admin | `moderation::handle_list_actions` |
| GET | `/api/mod/reports?status=open` | admin | `moderation::handle_list_reports` |
| POST | `/api/mod/reports/:id/action` | admin | `moderation::handle_report_action` |

### Enforcement

The relay-worker (`relay_do/mod_cache.rs`) caches the active ban/mute set per-pubkey with 60s TTL. Kind-1/42 events from muted (while `expires_at > now`) or banned pubkeys are rejected at ingress with NIP-01 `OK: false` and a reason message.

---

## Web-of-Trust (`/api/wot/*`)

Referente-based whitelist. Admin sets a "referente" pubkey; the worker fetches that pubkey's kind-3 (contact list) from configured relays and treats its follows as auto-whitelisted for registration.

### Config (D1 `instance_settings`)

| Column | Type | Default |
|--------|------|---------|
| `wot_enabled` | INTEGER | 0 |
| `wot_referente_pubkey` | TEXT | NULL |
| `wot_last_fetched_at` | INTEGER | NULL |
| `wot_follow_count` | INTEGER | NULL |

### Endpoints

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/api/wot/status` | public | `wot::handle_status` |
| POST | `/api/wot/set-referente` | admin | `wot::handle_set_referente` |
| POST | `/api/wot/refresh` | admin | `wot::handle_refresh` |
| POST | `/api/wot/override/add` | admin | `wot::handle_override` |
| POST | `/api/wot/override/remove` | admin | `wot::handle_override` |

### Registration gate

When `wot_enabled = 1`, `auth-worker` registration accepts a new pubkey only if:
- The pubkey exists in `wot_entries` (either from referente fetch or manual override), **OR**
- A valid unexpired invite token is supplied (see Invites below).

Manual overrides (`source = 'manual_override'`) survive refresh; referente entries (`source = 'referente'`) are replaced on each refresh.

---

## Invite Credits (`/api/invites/*`)

Tenure-gated invite minting. Members with sufficient `days_active` can mint single-use invite codes that bypass the WoT gate.

### Config (D1 `instance_settings`)

| Column | Type | Default |
|--------|------|---------|
| `min_days_active` | INTEGER | 7 |
| `invites_per_user` | INTEGER | 3 |
| `invite_expiry_hours` | INTEGER | 168 |

### Endpoints

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| POST | `/api/invites/create` | authed (tenured) or admin | `invites::handle_create` |
| GET | `/api/invites/mine` | authed | `invites::handle_list_mine` |
| GET | `/api/invites/:code` | public | `invites::handle_preview` |
| POST | `/api/invites/:code/redeem` | NIP-98 authed | `invites::handle_redeem` |
| POST | `/api/invites/:id/revoke` | issuer or admin | `invites::handle_revoke` |

### Tenure rule

```
days_active = (now - members.first_seen_at) / 86400
active_invites = count(invitations where issued_by=caller AND revoked_at IS NULL AND expires_at > now)
allow_mint = admin OR (days_active >= min_days_active AND active_invites < invites_per_user)
```

### Idempotency

Re-redeeming the same `(invitation_id, pubkey)` returns 200 with the existing member row — safe for retries. Revoked invites return HTTP 410 Gone with reason `"Invitation revoked"`.

---

## Welcome Bot (`/api/welcome/*`)

On a user's first successful registration, if enabled, `auth-worker` publishes a kind-42 greeting event to a configured channel on behalf of an admin-configured welcome-bot identity.

### Config (D1 `instance_settings`)

| Column | Type | Default |
|--------|------|---------|
| `welcome_enabled` | INTEGER | 0 |
| `welcome_channel_id` | TEXT | NULL |
| `welcome_message_en` | TEXT | NULL |
| `welcome_message_es` | TEXT | NULL |
| `welcome_bot_pubkey` | TEXT | NULL |
| `welcome_bot_nsec_encrypted` | TEXT | NULL (age-encrypted at rest) |

### Locale resolution

1. Request `CF-IPCountry` header mapped to locale (ES-family countries → `es`, fallback → `en`)
2. Message template variable substitution: `{name}` (profile), `{pubkey_short}`
3. Idempotent: subsequent registrations for the same pubkey do NOT re-trigger

### Endpoints

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/api/welcome/config` | admin | `welcome::handle_get_config` |
| POST | `/api/welcome/configure` | admin | `welcome::handle_configure` |
| POST | `/api/welcome/set-bot-key` | admin | `welcome::handle_set_bot_key` |
| POST | `/api/welcome/test` | admin | `welcome::handle_test` |

### Publication path

`welcome::send_on_first_registration` is called inline at the end of WebAuthn register, after pod provisioning. It decrypts the bot nsec using the age key in the `WELCOME_BOT_AGE_KEY` secret, constructs the kind-42 event, and posts it to relay-worker via an internal WebSocket request (not the public relay endpoint).

---

## Admin CLI

All endpoints above are driven by the `forum-admin` binary (`community-forum-rs/crates/admin-cli/`):

```bash
forum-admin mod ban <pubkey> --reason "spam"
forum-admin wot set-referente <pubkey>
forum-admin wot refresh
forum-admin invite create --expiry 168 --max-uses 1
forum-admin mod report-list --json
```

See `community-forum-rs/crates/admin-cli/AGENT.md` for the full AI-agent cheat sheet.

---

## Migration

All schema changes land in a single reversible migration: `community-forum-rs/crates/auth-worker/migrations/002_mod_wot_invites_welcome.sql`.

## Testing

- `cargo test -p nostr-core` — 154 tests (includes moderation event kind validators)
- `cargo test -p auth-worker` — 70 tests (includes all handlers above)
- `cargo test -p relay-worker` — 24 tests (includes mod-cache enforcement)
- `cargo test -p admin-cli` — 80 tests (command parsing + NIP-98 signing + dry-run)

## Related

- [Sprint spec](../sprint/2026-04-obelisk-polish-sprint.md)
- [Security audit baseline](../sprint/security-audit-2026-04.md)
- [DDD bounded contexts](../ddd/02-bounded-contexts.md)
- [AUTH_API](AUTH_API.md) (WebAuthn registration flow that integrates with WoT/invites/welcome)
- [NOSTR_RELAY](NOSTR_RELAY.md) (mute/ban enforcement at ingress)

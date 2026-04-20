# forum-admin — AI-agent cheat sheet

This CLI is the authorised way for AI coding agents (Claude Code, Codex,
Cursor, …) to operate a `community-forum-rs` instance. It speaks the same
HTTP API as the forum UI, signs every request with NIP-98, and never
holds any server-side privilege beyond the key you give it.

## TL;DR

```bash
export FORUM_ADMIN_NSEC="nsec1…"       # never commit, never log
export FORUM_ADMIN_BASE_URL="https://forum.dreamlab-ai.com"

forum-admin --json --env login
forum-admin --json --env mod report-list --status open
forum-admin --json --env mod ban <pubkey> --reason "spam"
```

Every command accepts `--json` — on success it prints a single JSON
object to stdout; on failure it prints `{"error": "<message>"}` to
stderr with a structured exit code.

## Environment

| Var                       | Purpose                                             |
|---------------------------|-----------------------------------------------------|
| `FORUM_ADMIN_NSEC`        | nsec1… or 64-char hex admin secret key              |
| `FORUM_ADMIN_BASE_URL`    | Base URL, default `https://forum.dreamlab-ai.com`   |

## Exit codes

| Code | Meaning        | Typical cause                                    |
|------|----------------|--------------------------------------------------|
| 0    | Success        | Request 2xx, body parsed                         |
| 1    | Usage          | Missing arg, bad flag combination, bad JSON body |
| 2    | Network        | DNS, connect, timeout, TLS                       |
| 3    | Auth           | Missing/invalid key, 401 or 403 from server      |
| 4    | Server         | Any other 4xx/5xx                                |

Agents SHOULD branch on exit code, not on stderr text — messages may
change across versions but codes are stable.

## Machine-readable output

All commands set `--json`. Examples of observed shapes:

### `login`
```json
{"pubkey": "…", "is_admin": true, "server_version": "0.1.0"}
```

### `mod report-list --status open`
```json
[
  {
    "id": "…",
    "reporter_pubkey": "…",
    "target_pubkey": "…",
    "target_event_id": "…",
    "reason": "spam",
    "status": "open",
    "created_at": 1714000000
  }
]
```

### `invite create`
```json
{
  "id": "ab12cd34",
  "code": "8f2e…",
  "url": "https://forum.dreamlab-ai.com/invite/8f2e…",
  "expires_at": 1714010000
}
```

### Dry-run
When invoked with `--dry-run --json`, the CLI prints the *prepared*
request without sending it:
```json
{
  "method": "POST",
  "url": "https://forum.dreamlab-ai.com/api/mod/ban",
  "authorization": "Nostr eyJ…",
  "body": {"target_pubkey": "…", "reason": "spam"}
}
```

Agents can diff the prepared request against expectations before letting
the write happen.

## Recommended moderation workflow

```bash
# 1. Pull open reports
reports=$(forum-admin --json --env mod report-list --status open)

# 2. For each report, decide and action
echo "$reports" | jq -c '.[]' | while read row; do
  target=$(echo "$row" | jq -r '.target_pubkey')
  reason=$(echo "$row" | jq -r '.reason')
  # … agent reasoning here …
  forum-admin --json --env mod ban "$target" --reason "$reason"
done
```

## Safety rules for agents

1. **Treat `FORUM_ADMIN_NSEC` as radioactive.** Never echo it, never pass
   it on argv in logs, never persist it beyond the current process.
2. **Prefer `--dry-run` first** on any write the user has not explicitly
   pre-authorised.
3. **Respect exit codes.** Exit 3 means "this key is not authorised for
   this operation" — do not retry with a different key without human
   confirmation.
4. **Idempotency is not guaranteed.** Re-running `mod ban` on an
   already-banned pubkey may return 409 from the server — surface that
   to the user, don't silently swallow.

## Command reference (compact)

```
forum-admin login [--nsec <v>|--bunker <uri>|--env]
forum-admin whitelist {list|add <pk>|remove <pk>}
forum-admin wot {set-referente <pk>|refresh}
forum-admin invite {create [--expiry N] [--max-uses N]|list|revoke <id>}
forum-admin mod {ban <pk> [--reason]|mute <pk> --hours N [--reason]|warn <pk> --reason S|report-list [--status]}
forum-admin channel {list|create <slug> [--name] [--description]}
```

Global: `--base-url <url>`, `--json`, `--dry-run`, `--verbose`.

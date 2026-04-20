# forum-admin

Headless admin CLI for `community-forum-rs`. Authenticates every HTTP
request with NIP-98 using an admin Nostr secret key.

Designed for two audiences:

1. **Humans** on the command line — pretty output, sensible defaults.
2. **AI coding agents** — `--json` output, documented exit codes, no
   interactive prompts, no writes to disk.

See [`AGENT.md`](./AGENT.md) for the agent-oriented cheat sheet.

## Install

```bash
# from the workspace root
cargo build --release -p admin-cli
./target/release/forum-admin --help
```

## Key handling

The admin nsec lives in memory only, wrapped in `Zeroizing<[u8; 32]>` and
wiped on drop. Supply it via **one** of:

| Source   | Flag                          | Notes                               |
|----------|-------------------------------|-------------------------------------|
| Arg      | `--nsec <nsec1…\|hex>`        | Accepts bech32 NIP-19 or 64-char hex |
| Env var  | `--env`                       | Reads `FORUM_ADMIN_NSEC`            |
| Bunker   | `--bunker <bunker://…>`       | NIP-46 remote signer (WIP stub)     |

The nsec is **never** written to disk and **never** printed to logs.

## Examples

```bash
# Smoke-test key + endpoint
forum-admin login --nsec $(cat ~/.secrets/admin.nsec)

# WoT management
forum-admin wot set-referente npub1…
forum-admin wot refresh

# Whitelist overrides
forum-admin whitelist list
forum-admin whitelist add npub1…

# Invites
forum-admin invite create --expiry 168 --max-uses 1
forum-admin invite list --json
forum-admin invite revoke <id>

# Moderation
forum-admin mod ban  <pubkey> --reason "spam"
forum-admin mod mute <pubkey> --hours 24
forum-admin mod warn <pubkey> --reason "off-topic"
forum-admin mod report-list --status open --json

# Channels
forum-admin channel list
forum-admin channel create general --name "General"
```

## Global flags

| Flag          | Default                            | Purpose                                          |
|---------------|------------------------------------|--------------------------------------------------|
| `--base-url`  | `https://forum.dreamlab-ai.com`    | Override for local/staging instances             |
| `--json`      | off                                | Machine-readable output on stdout                |
| `--dry-run`   | off                                | Print the prepared request without sending it    |
| `--verbose`   | off                                | Debug tracing to stderr                          |

## Exit codes

| Code | Meaning          |
|------|------------------|
| 0    | Success          |
| 1    | Usage error      |
| 2    | Network error    |
| 3    | Auth error (401/403, bad nsec, missing key) |
| 4    | Server error (any other 4xx/5xx)            |

## Development

```bash
cargo build   -p admin-cli
cargo test    -p admin-cli
cargo clippy  -p admin-cli -- -D warnings
```

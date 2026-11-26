#!/bin/bash
# Nightly Cloudflare forum backup → NAS (issue #48).
#
# Backs up everything needed to reconstruct the LIVE v2 forum after total cloud
# loss (v2 cutover 2026-11-26, PRs #105–#107):
#   D1  dreamlab-relay-v2  (all Nostr events)                       — critical
#   D1  dreamlab-auth-v2   (accounts, cohorts, zones, NIP-98 replay) — critical
#   R2  dreamlab-pods-v2   (Solid pod user data)                     — critical
#   KV  ADMIN_KV           (moderation state: bans, mutes)           — critical
#   KV  SESSIONS (= KV)    / POD_META                                — low (rebuildable)
# The v2 search worker is not provisioned (no dreamlab-vectors-v2 bucket, no v2
# SEARCH_CONFIG namespace), and RATE_LIMIT is ephemeral, so neither is here.
#
# The resource ids are hand-mirrored from forum-config/deploy/{auth,pod,relay}-
# worker.wrangler.toml. They are NOT derived at runtime because the cron
# program that runs this has no node on its pinned PATH. Instead CI enforces the
# mirror: scripts/check-config-mirrors.mjs (checkOperationalMirrors) fails when
# any D1/R2/KV binding of a provisioned worker is missing here, or when an id
# here is not bound by any worker.
#
# Auth: CLOUDFLARE_API_TOKEN (D1:read, R2:read, KV:read) and
# CLOUDFLARE_ACCOUNT_ID, read from the environment or from ENV_FILE
# (default: the agentbox .env). Without them the run logs a loud warning and
# exits 2 so the cron surface shows the gap instead of silently succeeding.
# The token reaches curl through a 0600 config file (-K), never argv, and is
# only sent to api.cloudflare.com, never to the signed D1 dump URL.
#
# A night is written to a work directory and renamed to YYYY-MM-DD only when
# every step succeeded. A failed run is kept as failed-<stamp> (never counted
# as a night) and retention runs only after a clean run, so KEEP_NIGHTS always
# means "this many complete snapshots".
#
# Content note: kind-1059 DMs are E2E encrypted at rest; kind-40/42/0 events
# are signed plaintext and SESSIONS holds live session tokens. The NAS copy is
# readable content: it is written owner-only (umask 077); keep it on the
# trusted segment only.
set -uo pipefail
umask 077

DEST_ROOT="${FORUM_BACKUP_DEST:-/mnt/dell/shared/backups/dreamlab-forum}"
ENV_FILE="${FORUM_BACKUP_ENV:-/home/devuser/workspace/agentbox/.env}"
KEEP_NIGHTS="${FORUM_BACKUP_KEEP:-14}"
KEEP_FAILED=3
LOCK_DIR="${FORUM_BACKUP_LOCK:-/home/devuser/workspace/.agentbox/forum-backup.lock}"

# D1 databases: name=id (from forum-config/deploy/*.wrangler.toml; CI-checked).
declare -A D1=(
  [dreamlab-relay-v2]="eb33cf2f-44db-433c-9771-6db850d8b64c"
  [dreamlab-auth-v2]="a53a49db-beec-4ee5-b09b-a2573923d21f"
)
R2_BUCKETS=(dreamlab-pods-v2)
# KV namespaces: label=id. SESSIONS and KV share 40fdb0ce… (one copy covers both);
# ADMIN_KV and ADMIN_KV_RO share 36c5f8d2….
declare -A KV=(
  [sessions]="40fdb0ce2d814f77b3db9d7b922ff579"
  [pod-meta]="d4c2d7bc103e4ce697340fa6962d2728"
  [admin-kv]="36c5f8d2157b4b3e8ef53c47c7fb68f1"
)

log() { echo "[forum-backup $(date -u +%FT%TZ)] $*"; }

# ── Single instance ─────────────────────────────────────────────────────────
# mkdir is atomic; flock(1) is not on the cron program's pinned PATH. A lock
# whose owner pid is gone is stale (the run was killed, e.g. by the crontab's
# timeout) and is taken over.
mkdir -p "$(dirname "$LOCK_DIR")"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  owner=$(cat "$LOCK_DIR/pid" 2>/dev/null || true)
  if [ -n "$owner" ] && kill -0 "$owner" 2>/dev/null; then
    log "ERROR: another backup is already running (pid $owner); skipping this slot."
    exit 1
  fi
  log "WARNING: removing stale lock (pid ${owner:-unknown} is gone)."
  rm -rf "$LOCK_DIR"
  mkdir "$LOCK_DIR" || { log "ERROR: could not take lock $LOCK_DIR"; exit 1; }
fi
echo $$ > "$LOCK_DIR/pid"
CURL_CFG=""
WORK=""
cleanup() {
  [ -n "$CURL_CFG" ] && rm -f "$CURL_CFG"
  # Interrupted (signal, crontab timeout): keep what was fetched as a failed run.
  if [ -n "$WORK" ] && [ -d "$WORK" ]; then
    mv "$WORK" "$DEST_ROOT/failed-$(date -u +%Y-%m-%dT%H%M%SZ)-interrupted" 2>/dev/null || true
  fi
  rm -rf "$LOCK_DIR"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

# ── Credentials ──────────────────────────────────────────────────────────────
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ -f "$ENV_FILE" ]; then
  CLOUDFLARE_API_TOKEN=$(grep -m1 '^CLOUDFLARE_API_TOKEN=' "$ENV_FILE" | cut -d= -f2-)
  CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID:-$(grep -m1 '^CLOUDFLARE_ACCOUNT_ID=' "$ENV_FILE" | cut -d= -f2-)}
fi
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  log "WARNING: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID not set (checked env + $ENV_FILE)."
  log "WARNING: no backup taken. Create an API token with D1:read, R2:read, KV:read"
  log "WARNING: and add both vars to $ENV_FILE (see docs/deployment and issue #48)."
  exit 2
fi
# The token is written into a curl config line; anything outside the token
# alphabet could break out of the quoted value, so refuse it.
if ! [[ "$CLOUDFLARE_API_TOKEN" =~ ^[A-Za-z0-9_-]+$ ]] || ! [[ "$CLOUDFLARE_ACCOUNT_ID" =~ ^[A-Za-z0-9]+$ ]]; then
  log "ERROR: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID contain unexpected characters; refusing."
  exit 2
fi
API="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}"
CURL_CFG=$(mktemp)
# printf is a shell builtin: the token never appears in any process's argv.
printf 'header = "Authorization: Bearer %s"\n' "$CLOUDFLARE_API_TOKEN" > "$CURL_CFG"
unset CLOUDFLARE_API_TOKEN

# Authenticated Cloudflare API call. Only ever pass api.cloudflare.com URLs.
cf() { curl -sSf --max-time 120 -K "$CURL_CFG" "$@"; }

if [ ! -d "$(dirname "$DEST_ROOT")" ]; then
  log "ERROR: NAS parent $(dirname "$DEST_ROOT") not mounted — refusing to back up to container disk."
  exit 1
fi

STAMP=$(date -u +%Y-%m-%d)
DEST="$DEST_ROOT/$STAMP"
mkdir -p "$DEST_ROOT"
WORK=$(mktemp -d "$DEST_ROOT/.inprogress-$STAMP-XXXXXX")
mkdir -p "$WORK"/{d1,r2,kv}
FAIL=0

# ── D1: server-side export → download SQL dump ──────────────────────────────
# poll_bookmark: the export API is async; POST returns a bookmark to re-poll
# with until status=complete, when the URL appears at .result.result.signed_url
# (shape checked against the live API 2026-09-25; the older top-level
# .result.signed_url is still accepted).
d1_export() {
  # One assignment per `local`: under `set -u`, a later word that expands an
  # earlier one in the same declaration can see it unset.
  local name="$1" id="$2"
  local out="$WORK/d1/${name}.sql"
  local body='{"output_format":"polling"}' resp bookmark url
  resp=$(cf -H 'content-type: application/json' \
    -d "$body" "$API/d1/database/$id/export") || { log "D1 $name: export request failed"; return 1; }
  bookmark=$(echo "$resp" | jq -r '.result.at_bookmark // empty')
  url=$(echo "$resp" | jq -r '.result.result.signed_url // .result.signed_url // empty')
  local tries=0
  while [ -z "$url" ] && [ $tries -lt 60 ]; do
    sleep 5; tries=$((tries+1))
    resp=$(cf -H 'content-type: application/json' \
      -d "{\"output_format\":\"polling\",\"current_bookmark\":\"$bookmark\"}" \
      "$API/d1/database/$id/export") || continue
    url=$(echo "$resp" | jq -r '.result.result.signed_url // .result.signed_url // empty')
  done
  [ -n "$url" ] || { log "D1 $name: export never produced a signed_url"; return 1; }
  # Pre-signed storage URL: deliberately NO Cloudflare credentials.
  curl -sSf --max-time 1800 -o "$out" "$url" || { log "D1 $name: dump download failed"; return 1; }
  gzip -f "$out" || { log "D1 $name: gzip failed"; return 1; }
  log "D1 $name: $(du -h "$out.gz" | cut -f1)"
}
for name in "${!D1[@]}"; do d1_export "$name" "${D1[$name]}" || FAIL=1; done

# Reversible, collision-free file name for an object/KV key: percent-encode
# everything outside [A-Za-z0-9._~-] (so '/' can never create a path), and
# encode a bare '.' / '..' so a key can never name the directory itself.
safe_name() {
  local s
  s=$(printf %s "$1" | jq -sRr @uri)
  case "$s" in
    ""|.|..) s=$(printf %s "$s" | sed 's/\./%2E/g'); s="${s:-%00empty}" ;;
  esac
  printf %s "$s"
}

# ── R2: list objects via REST, download each ────────────────────────────────
r2_backup() {
  local bucket="$1"
  local dir="$WORK/r2/$bucket" cursor="" n=0 bad=0
  mkdir -p "$dir"
  while :; do
    local page keys
    page=$(cf "$API/r2/buckets/$bucket/objects?per_page=500${cursor:+&cursor=$cursor}") \
      || { log "R2 $bucket: list failed"; return 1; }
    keys=$(echo "$page" | jq -r '.result[]?.key')
    [ -n "$keys" ] || break
    while IFS= read -r key; do
      if cf -o "$dir/$(safe_name "$key")" \
        "$API/r2/buckets/$bucket/objects/$(printf %s "$key" | jq -sRr @uri)"; then
        n=$((n+1))
      else
        bad=$((bad+1)); log "R2 $bucket: failed key $key"
      fi
    done <<< "$keys"
    cursor=$(echo "$page" | jq -r '.result_info.cursor // empty')
    [ -n "$cursor" ] && [ "$(echo "$page" | jq -r '.result_info.is_truncated')" = "true" ] || break
  done
  log "R2 $bucket: $n objects, $bad failed"
  [ "$bad" -eq 0 ]
}
for b in "${R2_BUCKETS[@]}"; do r2_backup "$b" || FAIL=1; done

# ── KV: list keys, get values into one JSON per namespace ───────────────────
# Values go through a file (--rawfile), never argv: SESSIONS values are live
# session tokens and would otherwise be readable in /proc/<pid>/cmdline.
kv_backup() {
  local label="$1" nsid="$2"
  local out="$WORK/kv/${label}.json" cursor="" tmp val bad=0
  tmp=$(mktemp "$WORK/.kv-XXXXXX")
  val=$(mktemp "$WORK/.kv-val-XXXXXX")
  echo '{}' > "$tmp"
  while :; do
    local page names
    page=$(cf "$API/storage/kv/namespaces/$nsid/keys?limit=1000${cursor:+&cursor=$cursor}") \
      || { log "KV $label: key list failed"; rm -f "$tmp" "$val"; return 1; }
    names=$(echo "$page" | jq -r '.result[]?.name')
    [ -n "$names" ] || break
    while IFS= read -r k; do
      if cf -o "$val" "$API/storage/kv/namespaces/$nsid/values/$(printf %s "$k" | jq -sRr @uri)"; then
        jq --arg k "$k" --rawfile v "$val" '. + {($k): $v}' "$tmp" > "$tmp.n" && mv "$tmp.n" "$tmp"
      else
        bad=$((bad+1)); log "KV $label: failed key $k"
      fi
    done <<< "$names"
    cursor=$(echo "$page" | jq -r '.result_info.cursor // empty')
    [ -n "$cursor" ] || break
  done
  rm -f "$val"
  mv "$tmp" "$out"
  log "KV $label: $(jq 'length' "$out") keys, $bad failed"
  [ "$bad" -eq 0 ]
}
for label in "${!KV[@]}"; do kv_backup "$label" "${KV[$label]}" || FAIL=1; done

# ── Manifest ────────────────────────────────────────────────────────────────
# Hash into a temp file outside the tree, then move it in: writing the manifest
# inside the tree while find walks it made it hash its own half-written self.
if ( cd "$WORK" && find . -type f ! -name MANIFEST.sha256 -exec sha256sum {} + > "$WORK.manifest.tmp" ) \
  && mv "$WORK.manifest.tmp" "$WORK/MANIFEST.sha256"; then
  log "manifest: $(wc -l < "$WORK/MANIFEST.sha256") files, total $(du -sh "$WORK" | cut -f1)"
else
  log "manifest: FAILED"; rm -f "$WORK.manifest.tmp"; FAIL=1
fi

# ── Failure: keep the partial run as evidence, never as a night, never prune ─
if [ $FAIL -ne 0 ]; then
  failed="$DEST_ROOT/failed-$(date -u +%Y-%m-%dT%H%M%SZ)"
  mv "$WORK" "$failed"
  ls -1d "$DEST_ROOT"/failed-* 2>/dev/null | sort | head -n -"$KEEP_FAILED" | while read -r old; do
    rm -rf "$old"
  done
  log "ERROR: COMPLETED WITH ERRORS — partial run kept at $failed; retention skipped."
  exit 1
fi

# ── Success: publish the night atomically, then apply retention ─────────────
rm -rf "$DEST"
mv "$WORK" "$DEST"
ls -1d "$DEST_ROOT"/20* 2>/dev/null | sort | head -n -"$KEEP_NIGHTS" | while read -r old; do
  log "retention: pruning $old"; rm -rf "$old"
done
log "backup complete: $DEST"

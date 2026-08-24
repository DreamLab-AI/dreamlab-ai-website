#!/bin/bash
# Nightly Cloudflare forum backup → NAS (issue #48).
#
# Backs up everything needed to reconstruct the forum after total cloud loss:
#   D1  dreamlab-relay   (all Nostr events)            — critical
#   D1  dreamlab-auth    (accounts, cohorts, zones)    — critical
#   R2  dreamlab-pods    (Solid pod user data)         — critical
#   R2  dreamlab-vectors (search embeddings)           — nice-to-have
#   KV  SESSIONS / POD_META / SEARCH_CONFIG            — low (rebuildable)
#
# Auth: CLOUDFLARE_API_TOKEN (D1:read, R2:read, KV:read) and
# CLOUDFLARE_ACCOUNT_ID, read from the environment or from ENV_FILE
# (default: the agentbox .env). Without them the run logs a loud warning and
# exits 2 so the cron surface shows the gap instead of silently succeeding.
#
# Content note: kind-1059 DMs are E2E encrypted at rest; kind-40/42/0 events
# are signed plaintext. The NAS copy is readable content — keep it on the
# trusted segment only.
set -uo pipefail

DEST_ROOT="${FORUM_BACKUP_DEST:-/mnt/dell/shared/backups/dreamlab-forum}"
ENV_FILE="${FORUM_BACKUP_ENV:-/home/devuser/workspace/agentbox/.env}"
KEEP_NIGHTS="${FORUM_BACKUP_KEEP:-14}"

# D1 databases: name=id (ids from forum-config/deploy/*.wrangler.toml).
declare -A D1=(
  [dreamlab-relay]="97c77d23-0e24-4325-ada7-1747eab4095b"
  [dreamlab-auth]="e3981999-e8f0-4c07-9e4b-2e50859b8524"
)
R2_BUCKETS=(dreamlab-pods dreamlab-vectors)
declare -A KV=(
  [sessions]="901345296c2848788066686aa67d5909"
  [pod-meta]="8ec8759ab40d4709a831bf6b0e5241eb"
  [search-config]="440b1f07ff224fb8ad644e094c6766c0"
)

log() { echo "[forum-backup $(date -u +%FT%TZ)] $*"; }

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
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
API="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}"
AUTH=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}")

if [ ! -d "$(dirname "$DEST_ROOT")" ]; then
  log "ERROR: NAS parent $(dirname "$DEST_ROOT") not mounted — refusing to back up to container disk."
  exit 1
fi

STAMP=$(date -u +%Y-%m-%d)
DEST="$DEST_ROOT/$STAMP"
mkdir -p "$DEST"/{d1,r2,kv}
FAIL=0

# ── D1: server-side export → download SQL dump ──────────────────────────────
# poll_bookmark: the export API is async; POST returns a bookmark to re-poll
# with until signed_url appears.
d1_export() {
  local name="$1" id="$2" out="$DEST/d1/${name}.sql"
  local body='{"output_format":"polling"}' resp bookmark url
  resp=$(curl -sf "${AUTH[@]}" -H 'content-type: application/json' \
    -d "$body" "$API/d1/database/$id/export") || { log "D1 $name: export request failed"; return 1; }
  bookmark=$(echo "$resp" | jq -r '.result.at_bookmark // empty')
  url=$(echo "$resp" | jq -r '.result.signed_url // empty')
  local tries=0
  while [ -z "$url" ] && [ $tries -lt 60 ]; do
    sleep 5; tries=$((tries+1))
    resp=$(curl -sf "${AUTH[@]}" -H 'content-type: application/json' \
      -d "{\"output_format\":\"polling\",\"current_bookmark\":\"$bookmark\"}" \
      "$API/d1/database/$id/export") || continue
    url=$(echo "$resp" | jq -r '.result.signed_url // empty')
  done
  [ -n "$url" ] || { log "D1 $name: export never produced a signed_url"; return 1; }
  curl -sf -o "$out" "$url" || { log "D1 $name: dump download failed"; return 1; }
  gzip -f "$out"
  log "D1 $name: $(du -h "$out.gz" | cut -f1)"
}
for name in "${!D1[@]}"; do d1_export "$name" "${D1[$name]}" || FAIL=1; done

# ── R2: list objects via REST, download each ────────────────────────────────
r2_backup() {
  local bucket="$1" dir="$DEST/r2/$bucket" cursor="" n=0
  mkdir -p "$dir"
  while :; do
    local page keys
    page=$(curl -sf "${AUTH[@]}" "$API/r2/buckets/$bucket/objects?per_page=500${cursor:+&cursor=$cursor}") \
      || { log "R2 $bucket: list failed"; return 1; }
    keys=$(echo "$page" | jq -r '.result[]?.key')
    [ -n "$keys" ] || break
    while IFS= read -r key; do
      local safe="${key//\//__}"
      curl -sf "${AUTH[@]}" -o "$dir/$safe" \
        "$API/r2/buckets/$bucket/objects/$(printf %s "$key" | jq -sRr @uri)" \
        && n=$((n+1)) || log "R2 $bucket: failed key $key"
    done <<< "$keys"
    cursor=$(echo "$page" | jq -r '.result_info.cursor // empty')
    [ -n "$cursor" ] && [ "$(echo "$page" | jq -r '.result_info.is_truncated')" = "true" ] || break
  done
  log "R2 $bucket: $n objects"
}
for b in "${R2_BUCKETS[@]}"; do r2_backup "$b" || FAIL=1; done

# ── KV: list keys, bulk-get values into one JSON per namespace ──────────────
kv_backup() {
  local label="$1" nsid="$2" out="$DEST/kv/${label}.json" cursor="" tmp
  tmp=$(mktemp)
  echo '{}' > "$tmp"
  while :; do
    local page names
    page=$(curl -sf "${AUTH[@]}" "$API/storage/kv/namespaces/$nsid/keys?limit=1000${cursor:+&cursor=$cursor}") \
      || { log "KV $label: key list failed"; rm -f "$tmp"; return 1; }
    names=$(echo "$page" | jq -r '.result[]?.name')
    [ -n "$names" ] || break
    while IFS= read -r k; do
      local v
      v=$(curl -sf "${AUTH[@]}" "$API/storage/kv/namespaces/$nsid/values/$(printf %s "$k" | jq -sRr @uri)") || v=""
      jq --arg k "$k" --arg v "$v" '. + {($k): $v}' "$tmp" > "$tmp.n" && mv "$tmp.n" "$tmp"
    done <<< "$names"
    cursor=$(echo "$page" | jq -r '.result_info.cursor // empty')
    [ -n "$cursor" ] || break
  done
  mv "$tmp" "$out"
  log "KV $label: $(jq 'length' "$out") keys"
}
for label in "${!KV[@]}"; do kv_backup "$label" "${KV[$label]}" || FAIL=1; done

# ── Manifest + retention ────────────────────────────────────────────────────
( cd "$DEST" && find . -type f -exec sha256sum {} + > MANIFEST.sha256 )
log "manifest: $(wc -l < "$DEST/MANIFEST.sha256") files, total $(du -sh "$DEST" | cut -f1)"

ls -1d "$DEST_ROOT"/20* 2>/dev/null | sort | head -n -"$KEEP_NIGHTS" | while read -r old; do
  log "retention: pruning $old"; rm -rf "$old"
done

if [ $FAIL -ne 0 ]; then log "COMPLETED WITH ERRORS"; exit 1; fi
log "backup complete: $DEST"

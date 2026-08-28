#!/usr/bin/env bash
# Dual-pin parity check — mirrors the authoritative pin-check job in
# .github/workflows/ci.yml (keep the two in lockstep). Emits PIN-PARITY-OK /
# PIN-DRIFT for the dream-cycle evaluator, which must invoke this quote-free
# (the annexe ssh dispatch strips nested double quotes, so no logic may be
# inlined in dream.config.json evaluatorEntrypoints).
set -uo pipefail

fail() { echo "$1"; echo PIN-DRIFT; exit 1; }

deploy=$(grep -oP "KIT_REF:\s*'\K[0-9a-f]+" .github/workflows/deploy.yml | head -1)
workers=$(grep -oP "KIT_REF:\s*'\K[0-9a-f]+" .github/workflows/workers-deploy.yml | head -1)
rustci=$(grep -oP "KIT_REF:\s*'\K[0-9a-f]+" .github/workflows/rust-ci.yml | head -1)
echo "deploy=$deploy  workers=$workers  rustci=$rustci"
if [ -z "$deploy" ] || [ "$deploy" != "$workers" ] || [ "$deploy" != "$rustci" ]; then
  fail "KIT_REF differs across deploy/workers-deploy/rust-ci.yml"
fi

# Library crates come from crates.io (git-SHA pin retired at 1.0.0-beta.6):
# the four version deps must agree with each other and with the record.
mapfile -t vers < <(grep -oP 'nostr-bbs-(core|config|mesh|rate-limit) = "\K[^"]+' forum-config/Cargo.toml | sort -u)
[ "${#vers[@]}" -eq 0 ] && fail "no nostr-bbs crates.io version deps found"
[ "${#vers[@]}" -ne 1 ] && fail "forum-config nostr-bbs deps disagree: ${vers[*]}"

record='docs/architecture/kit-compatibility-record.md'
[ -f "$record" ] || fail "compatibility record missing: $record"
canonical=$(grep -oP 'CANONICAL_KIT_SHA=\K[0-9a-f]+' "$record" | head -1)
[ -z "$canonical" ] && fail "no CANONICAL_KIT_SHA in $record"
[ "$canonical" != "$deploy" ] && fail "record CANONICAL_KIT_SHA $canonical != KIT_REF $deploy"
canonical_ver=$(grep -oP 'CANONICAL_KIT_VERSION=\K.+' "$record" | head -1)
[ -z "$canonical_ver" ] && fail "no CANONICAL_KIT_VERSION in $record"
[ "$canonical_ver" != "${vers[0]}" ] && fail "CANONICAL_KIT_VERSION $canonical_ver != dep version ${vers[0]}"

echo "source clone $deploy; library crates ${vers[0]} from crates.io; record in lockstep"
echo PIN-PARITY-OK

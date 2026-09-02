#!/usr/bin/env bash
# dream-kit-pin-guard: CI-side twin of the nightly `pin-parity` dream evaluator.
# Verbatim transcription of the evaluator entrypoint (dream cycle 2026-09-02).
# Contract preserved: prints PIN-PARITY-OK or a PIN-DRIFT-* token, always exits 0.
# Enforcement (fail on PIN-DRIFT) lives in .github/workflows/kit-pin-guard.yml;
# do not change exit codes here without updating that workflow.

deploy=$(grep -oP "KIT_REF:\s*'\K[0-9a-f]+" .github/workflows/deploy.yml | head -1)
workers=$(grep -oP "KIT_REF:\s*'\K[0-9a-f]+" .github/workflows/workers-deploy.yml | head -1)
rustci=$(grep -oP "KIT_REF:\s*'\K[0-9a-f]+" .github/workflows/rust-ci.yml | head -1)
echo "KIT_REF deploy=$deploy workers=$workers rustci=$rustci"
if [ -z "$deploy" ] || [ "$deploy" != "$workers" ] || [ "$deploy" != "$rustci" ]; then
  echo PIN-DRIFT-KITREF
  exit 0
fi
vers=$(grep -oP 'nostr-bbs-(core|config|mesh|rate-limit) = "\K[^"]+' forum-config/Cargo.toml | sort -u)
echo "crates.io versions: $vers"
nvers=$(echo "$vers" | wc -l)
if [ "$nvers" -ne 1 ]; then
  echo PIN-DRIFT-CRATE-VERSIONS
  exit 0
fi
record='docs/architecture/kit-compatibility-record.md'
canonical=$(grep -oP 'CANONICAL_KIT_SHA=\K[0-9a-f]+' "$record" 2>/dev/null | head -1)
canonical_ver=$(grep -oP 'CANONICAL_KIT_VERSION=\K.+' "$record" 2>/dev/null | head -1)
echo "record SHA=$canonical ver=$canonical_ver"
if [ "$canonical" != "$deploy" ]; then
  echo PIN-DRIFT-RECORD-SHA
elif [ "$canonical_ver" != "$vers" ]; then
  echo PIN-DRIFT-RECORD-VER
else
  echo PIN-PARITY-OK
fi

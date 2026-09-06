#!/usr/bin/env bash
# Dual-pin parity check — dream-cycle evaluator entrypoint.
#
# This is a THIN WRAPPER, not a second implementation. The invariant lives in
# scripts/pin-parity.mjs (and scripts/lib/pin-parity.mjs); the GitHub guard in
# .github/workflows/ci.yml runs the very same script. Before 2026-09-05 this file
# and the ci.yml pin-check job carried two independently-maintained copies of the
# logic, which is how the requirement-vs-lockfile gap survived: fixing one copy
# left the other green. Keep this file free of any check logic.
#
# Emits PIN-PARITY-OK / PIN-DRIFT for the evaluator, which must invoke this
# quote-free (the annexe ssh dispatch strips nested double quotes, so no logic
# may be inlined in dream.config.json evaluatorEntrypoints).
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1
exec node scripts/pin-parity.mjs

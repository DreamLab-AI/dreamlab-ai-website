#!/usr/bin/env bash
# dream-kit-pin-guard: CI-side twin of the nightly `pin-parity` dream evaluator.
#
# THIN WRAPPER, not a second implementation. The invariant lives in
# scripts/pin-parity.mjs (and scripts/lib/pin-parity.mjs); the `pin-check` job in
# .github/workflows/ci.yml and the dream-cycle entrypoint scripts/pin-parity-check.sh
# run the very same script. Keep this file free of any check logic.
#
# Why (2026-09-06): until this commit the file was a verbatim shell transcription
# of the evaluator, and it rotted exactly the way ADR-2004's closeout predicted a
# second copy would. When the manifest moved from floating requirements to exact
# `=` pins, the transcription kept reading the whole requirement string —
# `=1.0.0-beta.9` — and compared it against the record's `CANONICAL_KIT_VERSION`
# (`1.0.0-beta.9`), so it reported PIN-DRIFT-RECORD-VER against a repository whose
# pins were, and are, correct. The transcription was also strictly weaker than the
# gate it stood in for: it compared requirement STRINGS and never opened
# forum-config/Cargo.lock, so it could not see a resolved version or a registry
# checksum, and it never swept the workflows for tag-pinned actions.
#
# Contract preserved: prints PIN-PARITY-OK or PIN-DRIFT, and ALWAYS exits 0.
# Enforcement (fail on PIN-DRIFT) lives in .github/workflows/kit-pin-guard.yml;
# do not change exit codes here without updating that workflow.
#
# Arguments are forwarded to the gate, so `--root DIR` checks another tree.
set -uo pipefail

cd "$(dirname "$0")/.." || { echo PIN-DRIFT; exit 0; }
node scripts/pin-parity.mjs "$@"
exit 0

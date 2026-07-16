#!/usr/bin/env bash
set -euo pipefail

# Local forum dev server — clones or updates the upstream kit at KIT_REF,
# then runs `trunk serve` with live-reload on the forum client.
#
# Usage:
#   ./scripts/forum-dev.sh          # start dev server (default :8080)
#   ./scripts/forum-dev.sh build    # one-shot release build to kit/dist/
#   ./scripts/forum-dev.sh update   # re-fetch kit at current KIT_REF
#
# The kit is cloned into ./kit/ (gitignored). First run compiles the full
# dependency tree (~8-15 min); incremental rebuilds are 5-15 seconds.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Ensure cargo-installed tools (trunk, wasm-bindgen-cli) are on PATH.
# CARGO_HOME lives on the workspace overlay, not the default ~/.cargo.
CARGO_BIN="${CARGO_HOME:-$HOME/.cargo}/bin"
[ -d "$REPO_ROOT/../.cargo/bin" ] && CARGO_BIN="$REPO_ROOT/../.cargo/bin"
export PATH="$CARGO_BIN:$PATH"
KIT_DIR="$REPO_ROOT/kit"
CLIENT_DIR="$KIT_DIR/crates/nostr-bbs-forum-client"
KIT_REPO="https://github.com/DreamLab-AI/nostr-rust-forum.git"

# Extract KIT_REF from deploy.yml (single source of truth)
KIT_REF=$(grep -oP "KIT_REF:\s*'\K[a-f0-9]+" "$REPO_ROOT/.github/workflows/deploy.yml" | head -1)
if [ -z "$KIT_REF" ]; then
    echo "ERROR: Could not extract KIT_REF from deploy.yml" >&2
    exit 1
fi
echo "Kit ref: ${KIT_REF:0:12}..."

# Clone or update kit
if [ ! -d "$KIT_DIR/.git" ]; then
    echo "Cloning upstream kit..."
    git clone --filter=blob:none --no-checkout "$KIT_REPO" "$KIT_DIR"
    git -C "$KIT_DIR" checkout --detach "$KIT_REF"
elif [ "${1:-}" = "update" ]; then
    echo "Updating kit to $KIT_REF..."
    git -C "$KIT_DIR" fetch origin
    git -C "$KIT_DIR" checkout --detach "$KIT_REF"
    echo "Updated. Re-run without 'update' to start the dev server."
    exit 0
fi

# Verify kit is at expected ref
CURRENT_REF=$(git -C "$KIT_DIR" rev-parse HEAD)
if [ "$CURRENT_REF" != "$KIT_REF" ]; then
    echo "WARNING: kit is at ${CURRENT_REF:0:12}, expected ${KIT_REF:0:12}"
    echo "Run: $0 update"
fi

# NixOS cross-compilation fix: cc-rs picks up host glibc includes which
# fail on wasm32 ("gnu/stubs-32.h not found"). Override to suppress them.
export CFLAGS_wasm32_unknown_unknown="${CFLAGS_wasm32_unknown_unknown:--D__STDC_HOSTED__=0}"

# Trunk downloads wasm-bindgen into XDG_CACHE_HOME (~/.cache by default).
# On NixOS containers ~/.cache is often on a tmpfs with noexec — the binary
# downloads fine but can't be executed. Redirect to the workspace overlay.
WORKSPACE_CARGO="${CARGO_HOME:-$REPO_ROOT/../.cargo}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$WORKSPACE_CARGO/cache}"

# Env vars the forum client reads at compile time (option_env!) and runtime
# (window.__ENV__). Points at the live deployed workers.
export VITE_RELAY_URL="${VITE_RELAY_URL:-wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev}"
export VITE_AUTH_API_URL="${VITE_AUTH_API_URL:-https://dreamlab-auth-api.solitary-paper-764d.workers.dev}"
export VITE_POD_API_URL="${VITE_POD_API_URL:-https://dreamlab-pod-api.solitary-paper-764d.workers.dev}"
export VITE_SEARCH_API_URL="${VITE_SEARCH_API_URL:-https://dreamlab-search-api.solitary-paper-764d.workers.dev}"
export VITE_LINK_PREVIEW_API_URL="${VITE_LINK_PREVIEW_API_URL:-https://dreamlab-link-preview.solitary-paper-764d.workers.dev}"
export NOSTR_BBS_NIP05_DOMAIN="${NOSTR_BBS_NIP05_DOMAIN:-dreamlab-ai.com}"

cd "$CLIENT_DIR"

case "${1:-serve}" in
    build)
        echo "Building release..."
        trunk build --release --public-url /community/
        echo "Output: $KIT_DIR/dist/"
        find "$KIT_DIR/dist" -name '*.wasm' -printf '  %p  %s bytes\n' | \
            awk '{printf "  %s  %.2f MB\n", $1, $2/1024/1024}'
        ;;
    serve|"")
        echo ""
        echo "Starting forum dev server..."
        echo "  Forum:  http://localhost:8080/"
        echo "  Relay:  $VITE_RELAY_URL"
        echo "  Auth:   $VITE_AUTH_API_URL"
        echo ""
        echo "Live-reload watches src/ and ../nostr-core/src/"
        echo "First build takes ~8-15 min; incremental: ~5-15s"
        echo ""
        trunk serve --address 0.0.0.0 --port 8080
        ;;
    *)
        echo "Usage: $0 [serve|build|update]"
        exit 1
        ;;
esac

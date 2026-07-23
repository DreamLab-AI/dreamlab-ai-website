#!/usr/bin/env bash
set -euo pipefail

# Local forum dev server — builds the forum client from the SHARED master clone
# of the upstream kit and runs `trunk serve` with live-reload.
#
# Usage:
#   ./scripts/forum-dev.sh          # start dev server (default :8080)
#   ./scripts/forum-dev.sh build    # one-shot release build to <kit>/dist/
#   ./scripts/forum-dev.sh update   # fast-forward the master clone's main to KIT_REF
#
# The kit is NOT cloned into a per-project ./kit/ any more. Kit development
# happens in the single workspace master clone (a sibling of this repo, default
# ~/workspace/nostr-rust-forum) so there is one source of truth — edit there,
# push to main, then bump KIT_REF here. Override the location with
# NOSTR_RUST_FORUM_DIR. First build compiles the full dependency tree
# (~8-15 min); incremental rebuilds are 5-15 seconds.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Ensure cargo-installed tools (trunk, wasm-bindgen-cli) are on PATH.
# CARGO_HOME lives on the workspace overlay, not the default ~/.cargo.
CARGO_BIN="${CARGO_HOME:-$HOME/.cargo}/bin"
[ -d "$REPO_ROOT/../.cargo/bin" ] && CARGO_BIN="$REPO_ROOT/../.cargo/bin"
export PATH="$CARGO_BIN:$PATH"

# The shared upstream master clone (sibling of this repo by default).
KIT_DIR="${NOSTR_RUST_FORUM_DIR:-$REPO_ROOT/../nostr-rust-forum}"
CLIENT_DIR="$KIT_DIR/crates/nostr-bbs-forum-client"
KIT_REPO="https://github.com/DreamLab-AI/nostr-rust-forum.git"

if [ ! -d "$KIT_DIR/.git" ]; then
    echo "ERROR: upstream master clone not found at $KIT_DIR" >&2
    echo "Clone it once as a workspace sibling (single source of truth):" >&2
    echo "  git clone $KIT_REPO $KIT_DIR" >&2
    echo "Or point NOSTR_RUST_FORUM_DIR at an existing clone." >&2
    exit 1
fi

# Extract KIT_REF from deploy.yml (single source of truth for the pinned commit)
KIT_REF=$(grep -oP "KIT_REF:\s*'\K[a-f0-9]+" "$REPO_ROOT/.github/workflows/deploy.yml" | head -1)
if [ -z "$KIT_REF" ]; then
    echo "ERROR: Could not extract KIT_REF from deploy.yml" >&2
    exit 1
fi
echo "Kit ref: ${KIT_REF:0:12}...   (master clone: $KIT_DIR)"

# `update` fast-forwards the master clone's main to the pinned commit. Never
# force-mutates a dirty tree — the master is the developer's working copy.
if [ "${1:-}" = "update" ]; then
    if [ -n "$(git -C "$KIT_DIR" status --porcelain)" ]; then
        echo "Master clone has uncommitted changes — resolve them first, then re-run." >&2
        exit 1
    fi
    echo "Fetching + aligning master clone main to $KIT_REF..."
    git -C "$KIT_DIR" fetch origin
    git -C "$KIT_DIR" checkout main
    git -C "$KIT_DIR" pull --ff-only origin main
    echo "Updated. Re-run without 'update' to start the dev server."
    exit 0
fi

# Verify the master clone is at the expected pinned ref (KIT_REF is a commit on
# main). A mismatch means the master hasn't been aligned to the current pin.
CURRENT_REF=$(git -C "$KIT_DIR" rev-parse HEAD)
if [ "$CURRENT_REF" != "$KIT_REF" ]; then
    echo "WARNING: master clone is at ${CURRENT_REF:0:12}, KIT_REF is ${KIT_REF:0:12}"
    echo "Run: $0 update   (aligns the master clone's main to the pin)"
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
# (window.__ENV__). Default to local agentbox services; override with env vars
# to test against live Cloudflare workers.
# Use the agentbox hostname so the browser sidecar (browsercontainer) can
# reach the relay over the Docker network. 127.0.0.1 would resolve to the
# browser's own loopback, not the agentbox container.
RELAY_HOST="${AGENTBOX_RELAY_HOST:-agentbox}"
export VITE_RELAY_URL="${VITE_RELAY_URL:-ws://${RELAY_HOST}:7777}"
export VITE_AUTH_API_URL="${VITE_AUTH_API_URL:-http://${RELAY_HOST}:7777}"
export VITE_POD_API_URL="${VITE_POD_API_URL:-http://${RELAY_HOST}:8484}"
export VITE_SEARCH_API_URL="${VITE_SEARCH_API_URL:-http://${RELAY_HOST}:7777}"
export VITE_LINK_PREVIEW_API_URL="${VITE_LINK_PREVIEW_API_URL:-http://${RELAY_HOST}:7777}"
export NOSTR_BBS_NIP05_DOMAIN="${NOSTR_BBS_NIP05_DOMAIN:-localhost}"

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
        echo "Starting forum dev server (dev-auth enabled)..."
        echo "  Forum:  http://localhost:8080/"
        echo "  Relay:  $VITE_RELAY_URL"
        echo "  Auth:   $VITE_AUTH_API_URL"
        echo ""
        echo "Dev identities: Admin, Normal User, Junkie Jarvis"
        echo "Live-reload watches src/ and ../nostr-bbs-core/src/"
        echo "First build takes ~8-15 min; incremental: ~5-15s"
        echo ""
        trunk serve --address 0.0.0.0 --port 8080 --features dev-auth
        ;;
    *)
        echo "Usage: $0 [serve|build|update]"
        exit 1
        ;;
esac

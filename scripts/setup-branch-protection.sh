#!/usr/bin/env bash
#
# setup-branch-protection.sh
# ---------------------------------------------------------------------------
# Idempotent: configures GitHub branch protection on the `main` branch of
# DreamLab-AI/dreamlab-ai-website to enforce the Sprint v9 quality gate.
#
# RUN ONCE PER REPO with an admin-scoped token. Re-running is safe — the
# `gh api PUT` call replaces the existing protection block atomically.
#
# Required token scopes:
#   - `repo`               (full control of private repos)
#   - `admin:repo_hook`    (not strictly required but useful)
#   - For fine-grained PATs: "Administration: Read and write" + "Contents: Read"
#
# Usage:
#   GITHUB_TOKEN=ghp_xxx ./scripts/setup-branch-protection.sh
#   # or, with gh already authed as an admin:
#   ./scripts/setup-branch-protection.sh
#
# What this script enforces on `main`:
#   - Required PR review: 1 approving reviewer; stale reviews dismissed on push
#   - Required status checks (must pass + branches must be up-to-date):
#       * "Test + Lint Gate"           (from test-and-lint.yml)
#       * "Format"                     (from rust-ci.yml)
#       * "Clippy"                     (from rust-ci.yml)
#       * "Test (native)"              (from rust-ci.yml)
#       * "Test (wasm)"                (from rust-ci.yml)
#       * "Check (wasm client)"        (from rust-ci.yml)
#   - Linear history (no merge commits) — keeps audit trail clean
#   - Force pushes & branch deletion blocked
#   - Admins included in restrictions (no bypass)
#   - Conversation resolution required before merge
#
# Note: status check NAMES must match the `name:` field of each job in the
# workflows. If you rename a job in CI, update this list and re-run.
# ---------------------------------------------------------------------------

set -euo pipefail

REPO="${REPO:-DreamLab-AI/dreamlab-ai-website}"
BRANCH="${BRANCH:-main}"

# Sanity: gh CLI must be installed and authed.
if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh CLI not found. Install from https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: gh CLI is not authenticated. Run 'gh auth login' or export GITHUB_TOKEN." >&2
  exit 1
fi

echo "Configuring branch protection on ${REPO}@${BRANCH}..."

# Build the JSON payload. `required_status_checks.contexts` lists the EXACT
# job display names that must succeed. `strict: true` requires the branch to
# be up-to-date with main before merging.
PAYLOAD=$(cat <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Test + Lint Gate",
      "Format",
      "Clippy",
      "Test (native)",
      "Test (wasm)",
      "Check (wasm client)"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
JSON
)

# PUT replaces the entire protection block atomically — idempotent.
echo "$PAYLOAD" | gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "repos/${REPO}/branches/${BRANCH}/protection" \
  --input -

echo ""
echo "Branch protection applied to ${REPO}@${BRANCH}."
echo ""
echo "Verifying..."
gh api "repos/${REPO}/branches/${BRANCH}/protection" \
  --jq '{
    required_status_checks: .required_status_checks.contexts,
    strict: .required_status_checks.strict,
    pr_review_count: .required_pull_request_reviews.required_approving_review_count,
    dismiss_stale: .required_pull_request_reviews.dismiss_stale_reviews,
    enforce_admins: .enforce_admins.enabled,
    linear_history: .required_linear_history.enabled,
    force_pushes_allowed: .allow_force_pushes.enabled,
    deletions_allowed: .allow_deletions.enabled,
    conversation_resolution: .required_conversation_resolution.enabled
  }'

echo ""
echo "Done. Re-run this script after adding/renaming required CI jobs."

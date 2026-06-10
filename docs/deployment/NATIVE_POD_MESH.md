# Native Pod Mesh — Operator Runbook

**Last updated:** 2026-05-17 | [Back to Documentation Index](../README.md)

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1 — Cloudflare Zero Trust Tunnel](#step-1--cloudflare-zero-trust-tunnel)
- [Step 2 — agentbox sidecar](#step-2--agentbox-sidecar)
- [Step 3 — CF auth-worker secrets](#step-3--cf-auth-worker-secrets-wrangler)
- [Step 4 — Forum client build env](#step-4--forum-client-build-env)
- [Step 5 — dreamlab.toml](#step-5--dreamlabtoml)
- [Step 6 — Provision a user's native pod](#step-6--provision-a-users-native-pod)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Related Documents](#related-documents)

---

## Overview

The DreamLab ecosystem has two pod tiers:

```
Browser (forum WASM at dreamlab-ai.com)
  │
  ├─ NIP-98 ──► CF Workers tier (auth/relay/search/R2 pods)
  │              pods.dreamlab-ai.com — standard Solid, no git
  │
  └─ NIP-98 ──► Native tier (agentbox, pods-native.dreamlab-ai.com)
                 solid-pod-rs-server --features git
                 git control panel, /_git/* API, /.well-known/apps
                 ↑
                 Cloudflare Tunnel (encrypted, zero open ports)
```

The CF Workers tier uses R2 object storage and is always available. The native tier runs `solid-pod-rs` compiled with `--features git` inside the agentbox Docker stack and is exposed via a Cloudflare Zero Trust Tunnel — no inbound ports need to be opened on the host firewall.

The `[native_pod]` block in `forum-config/dreamlab.toml` gates this tier. When `enabled = false` (the default for new deployments), the forum WASM silently omits all native pod UI.

---

## Prerequisites

- agentbox Docker Compose stack running on the host machine
- Cloudflare account with Zero Trust (Tunnels) access
- `wrangler` CLI installed and authenticated (`wrangler login`)
- Auth-worker already deployed (see [Cloudflare Workers](CLOUDFLARE_WORKERS.md))

---

## Step 1 — Cloudflare Zero Trust Tunnel

1. Open the [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com/) and navigate to **Access → Tunnels**.
2. Click **Create a tunnel** and name it `dreamlab-native-pods`.
3. Under **Choose your environment**, select **Docker** and copy the `cloudflared` run command — it contains the tunnel token (`--token <TOKEN>`). Save this token; you will need it in Step 2.
4. Under **Public Hostname**, add:
   - **Subdomain:** `pods-native`
   - **Domain:** `dreamlab-ai.com`
   - **Service:** `http://solid-pod-server:8410`
5. Click **Save tunnel**.

The tunnel will appear as **Inactive** until the connector container starts in Step 2.

---

## Step 2 — agentbox sidecar

```bash
cd /path/to/agentbox

cp .env.solid-pods.example .env.solid-pods
```

Edit `.env.solid-pods` and set the following values:

```dotenv
CLOUDFLARE_TUNNEL_TOKEN=<token from Step 1>
SOLID_ADMIN_KEY=$(openssl rand -hex 32)   # keep this secret — also used in Step 3
SOLID_ALLOWED_ORIGINS=https://dreamlab-ai.com
SOLID_POD_PUBLIC_URL=https://pods-native.dreamlab-ai.com
```

Then bring up the two new services alongside the existing stack:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.override.yml \
  -f docker-compose.solid-pods.yml \
  up -d solid-pod-server cloudflared-pod
```

Verify the tunnel is live:

```bash
curl https://pods-native.dreamlab-ai.com/.well-known/solid
# Expected: 200 with a JSON-LD document
```

The Zero Trust dashboard will show the tunnel status as **Healthy** within ~30 seconds.

---

## Step 3 — CF auth-worker secrets (wrangler)

The auth-worker forwards pod provisioning requests to the native server. It needs both the server URL and the admin pre-shared key:

```bash
# Run from the directory containing auth-worker's wrangler.toml
wrangler secret put NATIVE_POD_URL        # value: https://pods-native.dreamlab-ai.com
wrangler secret put NATIVE_POD_ADMIN_KEY  # value: the SOLID_ADMIN_KEY set in Step 2
```

These secrets are not stored in any source file. Rotate them by running `wrangler secret put` again and restarting the relevant Docker service.

---

## Step 4 — Forum client build env

The forum WASM client reads `NATIVE_POD_URL` at compile time via `option_env!("NATIVE_POD_URL")`. If the variable is absent the native pod UI is compiled out entirely.

**Local build:**

```bash
NATIVE_POD_URL=https://pods-native.dreamlab-ai.com \
  trunk build --release community-forum-rs/crates/forum-client/index.html
```

**GitHub Actions (`deploy.yml`):**

Add `NATIVE_POD_URL` to the environment of the **Build Leptos forum with Trunk** step:

```yaml
- name: Build Leptos forum with Trunk
  working-directory: kit/crates/nostr-bbs-forum-client
  run: trunk build --release --public-url /community/
  env:
    NATIVE_POD_URL: ${{ secrets.NATIVE_POD_URL }}
```

Add `NATIVE_POD_URL` to the repository's **Settings → Secrets and variables → Actions** (secret, not variable) with the value `https://pods-native.dreamlab-ai.com`.

---

## Step 5 — dreamlab.toml

Open `forum-config/dreamlab.toml` and verify the `[native_pod]` section is present and correct:

```toml
[native_pod]
enabled             = true
base_url            = "https://pods-native.dreamlab-ai.com"
allowlist_cohorts   = ["members", "trainers", "private", "business"]
git_enabled         = true
admin_provision_url = "https://pods-native.dreamlab-ai.com/_admin/provision"
```

| Key | Purpose |
|-----|---------|
| `enabled` | Master toggle — set `false` to hide all native pod UI without rebuilding |
| `base_url` | Public HTTPS URL served by the Cloudflare Tunnel |
| `allowlist_cohorts` | User cohorts eligible for native pod provisioning |
| `git_enabled` | Enables the Git Control Panel and `/_git/*` API routes in the forum |
| `admin_provision_url` | Internal provisioning endpoint on the native server |

After editing, commit and push `dreamlab.toml`. The config is read by both the relay-worker (at boot) and the forum WASM (at runtime via the relay's config endpoint).

---

## Step 6 — Provision a user's native pod

### Via the Admin Panel

1. Navigate to **Admin → Native Pods** in the forum.
2. Enter the user's pubkey (64 hex characters).
3. Click **Provision**.

The admin panel calls `/api/native-pod/provision` on the auth-worker, which forwards the request (with `NATIVE_POD_ADMIN_KEY`) to the native server's `/_admin/provision` endpoint.

### Via the admin CLI

```bash
cargo run -p admin-cli -- native-pod provision <pubkey>
```

Use `--json` for machine-readable output:

```bash
cargo run -p admin-cli -- --json native-pod provision <pubkey>
# {"status":"ok","pod_url":"https://pods-native.dreamlab-ai.com/<pubkey>/"}
```

### Via curl (manual NIP-98 token)

```bash
# Build a NIP-98 event manually and base64-encode it, then:
curl -X POST https://api.dreamlab-ai.com/api/native-pod/provision \
  -H "Authorization: Nostr <base64-encoded-nip98-event>" \
  -H "Content-Type: application/json" \
  -d '{"pubkey":"<64-hex-pubkey>"}'
```

---

## Security Notes

- `SOLID_ADMIN_KEY` and `NATIVE_POD_ADMIN_KEY` must be **identical** across agentbox and CF Worker. A mismatch causes 403 errors on every provisioning call.
- Treat these keys as secrets. Never commit them, log them, or expose them in error responses.
- `SOLID_ALLOWED_ORIGINS` restricts CORS to the forum origin. Do **not** set `*` in production — it would allow any website to make credentialed requests to the native server.
- The Cloudflare Tunnel replaces the need for open inbound ports. The agentbox host firewall should block port 8410 externally; all traffic arrives through the tunnel.
- NIP-98 is verified independently on the native server for user requests. The PSK (`SOLID_ADMIN_KEY`) is used only for the `/_admin/provision` endpoint — ordinary pod read/write goes through standard NIP-98 Schnorr verification.
- Rotate both keys together: update the `.env.solid-pods` file, restart `solid-pod-server`, and run `wrangler secret put NATIVE_POD_ADMIN_KEY` with the new value.

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Native pod card does not appear in the forum | `NATIVE_POD_URL` was not set at forum WASM build time. Confirm via browser DevTools: `window.__ENV__` should not contain it (compile-time only) — rebuild with the env var exported |
| "Native pod not reachable" error in forum | Tunnel connector is down: `docker logs cloudflared-pod`. Also check DNS propagation for `pods-native.dreamlab-ai.com` |
| 503 from `/api/native-pod/provision` | CF Worker secrets not set: run `wrangler secret list --name dreamlab-auth-api` and verify `NATIVE_POD_URL` and `NATIVE_POD_ADMIN_KEY` are present |
| 403 from `/_admin/provision` | `SOLID_ADMIN_KEY` in agentbox does not match `NATIVE_POD_ADMIN_KEY` in CF Worker — re-set both to the same value |
| Git panel shows "Git API not available" on native pod | `solid-pod-rs` was built without `--features git`. Check `docker logs solid-pod-server` for feature flags at startup |
| Tunnel shows "Inactive" in Zero Trust dashboard | `cloudflared-pod` container not running: `docker ps | grep cloudflared-pod`; check `.env.solid-pods` has a valid `CLOUDFLARE_TUNNEL_TOKEN` |
| `/.well-known/apps` returns 404 | agentbox version predates the app manifest feature — pull latest `docker-compose.solid-pods.yml` and rebuild |

---

## Related Documents

| Document | Description |
|----------|-------------|
| [Deployment Overview](README.md) | Architecture, CI/CD pipeline, environments, DNS |
| [Cloudflare Workers](CLOUDFLARE_WORKERS.md) | auth-worker secrets, wrangler config, DNS routes |
| [Auth API](../api/AUTH_API.md) | auth-worker endpoints including `/api/native-pod/provision` |
| [Pod API](../api/POD_API.md) | pod-worker endpoints and R2 layout (CF tier) |
| [Security Overview](../security/SECURITY_OVERVIEW.md) | CORS, NIP-98 validation, SSRF protection |

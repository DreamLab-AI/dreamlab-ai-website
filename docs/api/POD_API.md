# Pod API — pod-worker (Rust Port)

## Overview

Per-user Solid pod storage backed by Cloudflare R2 with WAC access control. All
write operations require NIP-98 authentication. Rust Worker using `worker` 0.7.5.

**Base URL**: `pods.dreamlab-ai.com`

## Endpoints

### GET /pods/{pubkey}/{path}

Read a resource. Public resources (profile, public media) need no auth.
Returns raw content with `Content-Type` and `ETag` headers.

### HEAD /pods/{pubkey}/{path}

Headers only, no body. Used for existence checks.

### PUT /pods/{pubkey}/{path}

Write/overwrite a resource. Requires NIP-98 with `Write` access. Max body: 50MB.
**Response** (201): `{ "status": "ok" }`

### DELETE /pods/{pubkey}/{path}

Delete a resource. Requires NIP-98 with `Write` access.
**Response** (200): `{ "status": "deleted" }`

### GET /health

Returns `{ "status": "ok", "service": "pod-api" }`.

## WAC Access Control

Each pod has an ACL stored in KV at `acl:{pubkey}` in JSON-LD format.

### Access Mode Mapping

| HTTP Method | Required Mode |
|-------------|--------------|
| GET, HEAD | Read |
| PUT, DELETE | Write |
| POST | Append |

### Agent Matching

- `acl:agent` + `did:nostr:{pubkey}` — specific user
- `acl:agentClass` + `foaf:Agent` — public access
- `acl:agentClass` + `acl:AuthenticatedAgent` — any authenticated user
- No ACL document = deny all (secure by default)

### Default ACL (created at registration)

Owner gets Read/Write/Control on everything. Public gets Read on `./profile/`
and `./media/public/`.

## R2 Storage Layout

```
dreamlab-pods/pods/{pubkey}/
  profile/card          # JSON-LD profile (application/ld+json)
  media/public/{file}   # Publicly readable images
  media/private/{file}  # Owner-only media
  data/{arbitrary}      # App-specific data
```

## KV Metadata

| Key | Value |
|-----|-------|
| `acl:{pubkey}` | JSON-LD ACL document |
| `meta:{pubkey}` | `{ "created": timestamp, "storageUsed": bytes }` |

## Media Upload Example

```
PUT /pods/{pubkey}/media/public/avatar.webp
Authorization: Nostr <token>
Content-Type: image/webp
<binary>
```

Publicly readable at `https://pods.dreamlab-ai.com/{pubkey}/media/public/avatar.webp`
because the default ACL grants `foaf:Agent` Read on `./media/public/`.

## Environment Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `PODS` | R2Bucket | `dreamlab-pods` — all pod storage |
| `POD_META` | KVNamespace | ACL documents + pod metadata |
| `EXPECTED_ORIGIN` | Secret | `https://dreamlab-ai.com` |

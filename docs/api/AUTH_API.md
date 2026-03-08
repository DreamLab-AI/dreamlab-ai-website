# Auth API — auth-worker (Rust Port)

## Overview

WebAuthn registration/authentication with PRF extension, NIP-98 verification, and
Solid pod provisioning. Rust Worker using `worker` 0.7.5 and `passkey-rs` 0.3.x.

**Base URL**: `api.dreamlab-ai.com`

## Endpoints

### POST /auth/register/options

Generate WebAuthn registration options with server-controlled PRF salt.

**Body**: `{ "displayName": "Alice" }`
**Response**: PublicKeyCredentialCreationOptions + `prfSalt` (base64url 32 bytes).
Challenge stored in D1 with 5-minute TTL.

### POST /auth/register/verify

Complete registration. Client sends credential and PRF-derived pubkey.

**Body**: `{ "pubkey": "<64-char hex>", "response": { "id": "<credential>", "response": { "attestationObject": "..." } }, "prfSalt": "..." }`
**Response**: `{ "verified": true, "pubkey": "...", "didNostr": "did:nostr:...", "webId": "...", "podUrl": "..." }`

Creates default ACL (KV), profile card (R2), and metadata (KV) during pod provisioning.

### POST /auth/login/options

Generate authentication options. Returns stored PRF salt for key re-derivation.

**Body**: `{ "pubkey": "<hex>" }`
**Response**: PublicKeyCredentialRequestOptions + `prfSalt`.
**Error** (404): `{ "error": "No passkey registered", "code": "NO_CREDENTIAL" }`

### POST /auth/login/verify

Verify WebAuthn assertion + NIP-98 authorization.
Requires `Authorization: Nostr <token>` header.

**Verification**: NIP-98 token -> credential ID match -> clientDataJSON (type,
challenge, origin) -> authenticatorData (rpIdHash, UP/UV flags, counter) -> update
counter, consume challenge.

**Response**: `{ "verified": true, "pubkey": "...", "didNostr": "..." }`

### POST /auth/lookup

Look up pubkey by credential ID (discoverable credential flows).
**Body**: `{ "credentialId": "..." }` **Response**: `{ "pubkey": "<hex>" }`

### GET /api/profile (NIP-98 protected)

Returns authenticated user's Solid profile card (`application/ld+json`) from R2.

### GET /health

Returns `{ "status": "ok", "service": "auth-api", "runtime": "workers" }`.

## NIP-98 Auth Header

`Authorization: Nostr <base64(kind:27235 event)>` with tags `u` (URL), `method`,
optional `payload` (SHA-256 hex of body). Server recomputes event ID independently.

## D1 Schema

```sql
CREATE TABLE webauthn_credentials (
  pubkey TEXT PRIMARY KEY, credential_id TEXT NOT NULL,
  public_key TEXT NOT NULL, counter INTEGER DEFAULT 0,
  prf_salt TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE challenges (
  pubkey TEXT NOT NULL, challenge TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX idx_challenges_created ON challenges(created_at);
CREATE INDEX idx_credentials_cred_id ON webauthn_credentials(credential_id);
```

## Environment Bindings

| Binding | Type | Purpose |
|---------|------|---------|
| `DB` | D1Database | `dreamlab-auth` — credentials + challenges |
| `SESSIONS` | KVNamespace | Session tokens |
| `POD_META` | KVNamespace | Pod ACLs and metadata |
| `PODS` | R2Bucket | `dreamlab-pods` — profile cards, media |
| `RP_ID` | Secret | `dreamlab-ai.com` |
| `RP_NAME` | Secret | `DreamLab AI` |
| `EXPECTED_ORIGIN` | Secret | `https://dreamlab-ai.com` |

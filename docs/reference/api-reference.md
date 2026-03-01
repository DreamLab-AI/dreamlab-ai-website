# API Reference

Last updated: 2026-02-28

Complete API documentation for the DreamLab AI backend services.

---

## Overview

The platform runs six backend services, currently deployed on Google Cloud Run (region `us-central1`, GCP project `cumbriadreamlab`). A completed migration of auth-api, pod-api, and search-api to Cloudflare Workers is deployed at `*.solitary-paper-764d.workers.dev`.

| Service | Base URL | Auth required |
|---------|----------|---------------|
| auth-api | `https://auth-api-xxx-uc.a.run.app` | No (public endpoints) |
| jss | `https://jss-xxx-uc.a.run.app` | NIP-98 |
| nostr-relay | `wss://relay.dreamlab-ai.com` | Whitelist (writes only) |
| embedding-api | `https://embedding-api-xxx-uc.a.run.app` | NIP-98 |
| image-api | `https://image-api-xxx-uc.a.run.app` | NIP-98 |
| link-preview-api | `https://link-preview-xxx-uc.a.run.app` | None |

---

## Auth API

Express application handling WebAuthn registration and authentication with NIP-98 integration.

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `RELAY_URL` | Yes | Nostr relay WebSocket URL |
| `RP_ID` | Yes | WebAuthn relying party ID (e.g. `dreamlab-ai.com`) |
| `RP_NAME` | Yes | WebAuthn relying party name |
| `RP_ORIGIN` | Yes | Expected origin for WebAuthn ceremonies |
| `JSS_BASE_URL` | Yes | JavaScript Solid Server base URL |
| `PORT` | No | Server port (default: 8080) |

### GET /health

Health check endpoint. No authentication required.

**Response (200)**:

```json
{
  "ok": true,
  "service": "auth-api"
}
```

### POST /auth/register/options

Generate WebAuthn registration options for a new user.

**Request body**:

```json
{
  "username": "alice"
}
```

**Response (200)**:

```json
{
  "challenge": "<base64url>",
  "rp": {
    "name": "DreamLab Community",
    "id": "dreamlab-ai.com"
  },
  "user": {
    "id": "<base64url>",
    "name": "alice",
    "displayName": "alice"
  },
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 },
    { "type": "public-key", "alg": -257 }
  ],
  "authenticatorSelection": {
    "requireResidentKey": true,
    "residentKey": "required",
    "userVerification": "required"
  },
  "extensions": {
    "prf": {
      "eval": {
        "first": "<base64url-prf-salt>"
      }
    }
  }
}
```

### POST /auth/register/verify

Verify a WebAuthn registration response. On success, provisions a Solid pod via JSS.

**Request body**:

```json
{
  "id": "<credential-id>",
  "rawId": "<base64url>",
  "response": {
    "attestationObject": "<base64url>",
    "clientDataJSON": "<base64url>"
  },
  "type": "public-key",
  "pubkey": "<64-char-hex-nostr-pubkey>"
}
```

**Response (200)**:

```json
{
  "verified": true,
  "didNostr": "did:nostr:<pubkey>",
  "webId": "https://jss-xxx-uc.a.run.app/<pubkey>/profile/card#me",
  "podUrl": "https://jss-xxx-uc.a.run.app/<pubkey>/"
}
```

**Response (400)**:

```json
{
  "error": "Registration verification failed"
}
```

### POST /auth/login/options

Generate WebAuthn authentication options. Returns the stored PRF salt for the credential.

**Request body**:

```json
{}
```

**Response (200)**:

```json
{
  "challenge": "<base64url>",
  "rpId": "dreamlab-ai.com",
  "allowCredentials": [],
  "userVerification": "required",
  "extensions": {
    "prf": {
      "eval": {
        "first": "<base64url-prf-salt>"
      }
    }
  }
}
```

### POST /auth/login/verify

Verify a WebAuthn authentication response.

**Request body**:

```json
{
  "id": "<credential-id>",
  "rawId": "<base64url>",
  "response": {
    "authenticatorData": "<base64url>",
    "clientDataJSON": "<base64url>",
    "signature": "<base64url>"
  },
  "type": "public-key"
}
```

**Response (200)**:

```json
{
  "verified": true,
  "pubkey": "<64-char-hex>"
}
```

**Response (401)**:

```json
{
  "error": "Authentication verification failed"
}
```

---

## JavaScript Solid Server (JSS)

Provides WebID and pod storage per Nostr public key. Runs `@solid/community-server@7.1.8` in a Docker container.

### Pod URL format

```
https://jss-xxx-uc.a.run.app/<pubkey>/
```

### WebID

```
https://jss-xxx-uc.a.run.app/<pubkey>/profile/card#me
```

Pods are provisioned automatically during user registration via the auth-api.

---

## Nostr Relay

WebSocket-based Nostr relay with PostgreSQL storage. Supports NIP-01, NIP-11, NIP-16, NIP-33, NIP-98.

### WebSocket connection

```
wss://relay.dreamlab-ai.com
```

### Client-to-relay messages

#### EVENT -- publish an event

```json
["EVENT", <event>]
```

Event structure:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | 64-char hex SHA-256 of the serialised event |
| `pubkey` | string | 64-char hex secp256k1 public key |
| `created_at` | number | Unix timestamp (seconds) |
| `kind` | number | Event kind |
| `tags` | array | Array of tag arrays |
| `content` | string | Event content |
| `sig` | string | 128-char hex Schnorr signature |

Relay response:

```json
["OK", "<event-id>", true, ""]
```

Error responses:

```json
["OK", "<event-id>", false, "blocked: pubkey not whitelisted"]
["OK", "<event-id>", false, "invalid: event id verification failed"]
["OK", "<event-id>", false, "invalid: signature verification failed"]
["OK", "<event-id>", false, "rate limit exceeded"]
```

#### REQ -- subscribe to events

```json
["REQ", "<subscription-id>", <filter>, ...]
```

Filter fields:

| Field | Type | Description |
|-------|------|-------------|
| `ids` | string[] | Event IDs to match |
| `authors` | string[] | Public keys to match |
| `kinds` | number[] | Event kinds to match |
| `since` | number | Events after this timestamp |
| `until` | number | Events before this timestamp |
| `limit` | number | Maximum events (default: 500, max: 5000) |
| `#<tag>` | string[] | Tag values to match |

Response:

```json
["EVENT", "<subscription-id>", <event>]
["EOSE", "<subscription-id>"]
```

After EOSE, the subscription remains open for live events.

#### CLOSE -- unsubscribe

```json
["CLOSE", "<subscription-id>"]
```

No response.

### HTTP endpoints

#### GET /health

```json
{
  "status": "healthy",
  "version": "2.2.0",
  "database": "postgresql",
  "events": 1234,
  "whitelisted": 56,
  "dbSizeBytes": 10485760,
  "uptime": 3600.5,
  "nips": [1, 11, 16, 33, 98]
}
```

#### GET /api/check-whitelist?pubkey=<hex>

Check whitelist status.

```json
{
  "isWhitelisted": true,
  "isAdmin": false,
  "cohorts": ["members", "early-access"],
  "verifiedAt": 1704067200000,
  "source": "relay"
}
```

#### GET /.well-known/nostr.json

NIP-11 relay information document. Request with `Accept: application/nostr+json`.

```json
{
  "name": "DreamLab Nostr Relay",
  "description": "Private whitelist-only relay with NIP-16/98 support",
  "pubkey": "<admin-pubkey>",
  "supported_nips": [1, 11, 16, 33, 98],
  "software": "dreamlab-nostr-relay",
  "version": "2.2.0",
  "limitation": {
    "auth_required": false,
    "payment_required": false,
    "restricted_writes": true
  }
}
```

### Event kinds

**Regular events (stored permanently)**:

| Kind | Description |
|------|-------------|
| 1 | Short text note |
| 4 | Encrypted direct message |
| 5 | Event deletion |
| 6 | Repost |
| 7 | Reaction |

**Replaceable events (latest only)**:

| Kind | Description |
|------|-------------|
| 0 | Profile metadata |
| 3 | Contact list |
| 10002 | Relay list metadata |

**Parameterised replaceable (by d-tag)**:

| Kind | Description |
|------|-------------|
| 30023 | Long-form content |
| 30078 | Application-specific data |

### Rate limits

| Limit | Default |
|-------|---------|
| Events per second | 10 per IP |
| Concurrent connections | 10 per IP |
| Query limit | 500 events per REQ filter |
| Maximum query limit | 5000 events |

---

## Embedding API

Vector embedding generation service. All state-mutating endpoints require NIP-98 authentication.

### GET /health

Health check (no authentication).

```json
{
  "ok": true,
  "service": "embedding-api"
}
```

---

## Image API

Image resizing, format conversion, and serving. Upload endpoints require NIP-98 authentication.

### GET /health

Health check (no authentication).

```json
{
  "ok": true,
  "service": "image-api"
}
```

---

## Link Preview API

URL metadata extraction for generating link previews. No authentication required.

### GET /health

Health check.

```json
{
  "ok": true,
  "service": "link-preview-api"
}
```

---

## NIP-98 HTTP authentication

All state-mutating API calls to DreamLab services use NIP-98 authentication.

### Header format

```
Authorization: Nostr <base64-encoded-event-json>
```

### Event structure

```json
{
  "kind": 27235,
  "created_at": 1709136000,
  "tags": [
    ["u", "https://api.dreamlab-ai.com/auth/register/verify"],
    ["method", "POST"],
    ["payload", "<sha256-hex-of-raw-request-body>"]
  ],
  "content": "",
  "pubkey": "<64-char-hex>",
  "id": "<sha256-of-serialised-event>",
  "sig": "<128-char-hex-schnorr-signature>"
}
```

### Required tags

| Tag | Description |
|-----|-------------|
| `u` | Full URL being accessed |
| `method` | HTTP method (`GET`, `POST`, etc.) or `*` |
| `payload` | SHA-256 hex of the raw request body (optional, for POST/PUT) |

### Timing constraint

The `created_at` timestamp must be within 60 seconds of the server's current time.

### Creating an auth token (client)

```typescript
import { createNip98Token } from "@/lib/auth/nip98-client";

const token = await createNip98Token(
  privkey,
  "https://api.dreamlab-ai.com/endpoint",
  "POST",
  requestBody
);

const response = await fetch("https://api.dreamlab-ai.com/endpoint", {
  method: "POST",
  headers: {
    "Authorization": `Nostr ${token}`,
    "Content-Type": "application/json",
  },
  body: requestBody,
});
```

### Server verification

The server independently:

1. Base64-decodes the token to get the event JSON.
2. Recomputes the event ID from the NIP-01 canonical serialisation.
3. Verifies the Schnorr signature against the pubkey.
4. Checks `created_at` is within the time window.
5. Verifies the `u` tag matches the request URL.
6. Verifies the `method` tag matches the HTTP method.
7. If present, verifies the `payload` tag matches the SHA-256 of the raw request body.

### Fallback: Basic auth

For clients that only support Basic authentication:

```
Authorization: Basic <base64("nostr:" + token)>
```

### Error responses

| HTTP status | Description |
|-------------|-------------|
| 401 | Missing or malformed authorisation header |
| 401 | Invalid Schnorr signature |
| 401 | Timestamp outside allowed window |
| 401 | URL mismatch |
| 403 | CORS origin not allowed |

---

## Error code summary

| HTTP status | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Bad request (malformed input) |
| 401 | Authentication failed |
| 403 | Forbidden (CORS, whitelist) |
| 404 | Endpoint not found |
| 500 | Internal server error |

WebSocket-specific (relay):

| Message | Meaning |
|---------|---------|
| `["OK", id, true, ""]` | Event accepted |
| `["OK", id, false, "blocked: ..."]` | Whitelist rejection |
| `["OK", id, false, "invalid: ..."]` | Validation failure |
| `["NOTICE", "rate limit exceeded"]` | Rate limited |

---

## Related documentation

- [tech-stack.md](./tech-stack.md) -- complete technology reference
- [../developer/GETTING_STARTED.md](../developer/GETTING_STARTED.md) -- setup and installation
- [../developer/PROJECT_STRUCTURE.md](../developer/PROJECT_STRUCTURE.md) -- service source locations

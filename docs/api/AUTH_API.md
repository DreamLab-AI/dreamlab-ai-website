# Auth API Reference

**Last Updated:** 2026-03-01

REST API for the DreamLab AI authentication service. Handles WebAuthn PRF-based registration and authentication, with NIP-98 HTTP auth and Solid pod provisioning.

> **Migration note:** A Cloudflare Workers version of this service is deployed at `https://dreamlab-auth-api.solitary-paper-764d.workers.dev`. The Workers version uses D1 + KV instead of PostgreSQL. This reference documents the Cloud Run version; cutover to Workers pending DNS configuration.

**Base URL**: Cloud Run service URL (set as `VITE_AUTH_API_URL`)
**Protocol**: HTTPS
**Authentication**: NIP-98 on `/auth/login/verify`

---

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | None | Health check |
| POST | `/auth/register/options` | None | Generate WebAuthn registration options |
| POST | `/auth/register/verify` | None | Verify registration and provision pod |
| POST | `/auth/login/options` | None | Generate WebAuthn authentication options |
| POST | `/auth/login/verify` | NIP-98 | Verify authentication |

---

## GET /health

Health check endpoint. No authentication required.

### Response

```json
{
  "ok": true,
  "service": "auth-api"
}
```

**Status**: 200 OK

---

## POST /auth/register/options

Generate WebAuthn registration options for a new user. The server generates a random PRF salt and challenge, stores the challenge (5-minute expiry), and returns the options with the PRF salt.

### Request

```json
{
  "displayName": "Alice"
}
```

| Field | Type | Required | Description |
|-------|------|---------|-------------|
| `displayName` | string | No | User's display name (max 64 chars). Defaults to "DreamLab User". |

### Response (200 OK)

```json
{
  "options": {
    "challenge": "<base64url>",
    "rp": {
      "name": "DreamLab Community",
      "id": "dreamlab-ai.com"
    },
    "user": {
      "id": "<base64url>",
      "name": "nostr-user-a1b2c3d4",
      "displayName": "Alice"
    },
    "pubKeyCredParams": [
      { "alg": -7, "type": "public-key" },
      { "alg": -257, "type": "public-key" }
    ],
    "authenticatorSelection": {
      "residentKey": "preferred",
      "userVerification": "required"
    },
    "attestationType": "none",
    "extensions": {
      "prf": {
        "eval": {
          "first": "<base64url-prf-salt>"
        }
      }
    }
  },
  "prfSalt": "<base64url-32-byte-salt>"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `options` | object | `PublicKeyCredentialCreationOptionsJSON` for `navigator.credentials.create()` |
| `prfSalt` | string | Base64url-encoded 32-byte PRF salt. Client must pass this to the PRF extension. |

### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| 500 | `{ "error": "Failed to generate registration options" }` | Internal server error |
| 500 | `{ "error": "Failed to store challenge" }` | Database error |

---

## POST /auth/register/verify

Verify the WebAuthn registration response, provision a Solid pod, and store the credential.

### Request

```json
{
  "response": {
    "id": "<credential-id>",
    "rawId": "<base64url>",
    "response": {
      "clientDataJSON": "<base64url>",
      "attestationObject": "<base64url>",
      "transports": ["internal"]
    },
    "type": "public-key",
    "clientExtensionResults": {}
  },
  "pubkey": "a1b2c3d4e5f6..."
}
```

| Field | Type | Required | Description |
|-------|------|---------|-------------|
| `response` | object | Yes | `RegistrationResponseJSON` from `navigator.credentials.create()` |
| `pubkey` | string | Yes | 64-character lowercase hex Nostr pubkey (derived from PRF output on client) |

### Response (201 Created)

```json
{
  "ok": true,
  "pubkey": "a1b2c3d4e5f6...",
  "didNostr": "did:nostr:a1b2c3d4e5f6...",
  "webId": "https://jss-xxx.run.app/a1b2c3d4e5f6.../profile/card#me",
  "podUrl": "https://jss-xxx.run.app/a1b2c3d4e5f6.../"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | Always `true` on success |
| `pubkey` | string | Registered Nostr pubkey |
| `didNostr` | string | `did:nostr:<pubkey>` identifier |
| `webId` | string or null | Solid WebID URL (null if pod provisioning failed) |
| `podUrl` | string or null | Solid pod base URL (null if pod provisioning failed) |

### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "error": "Invalid pubkey: must be 64 hex characters" }` | Malformed pubkey |
| 400 | `{ "error": "Missing or invalid WebAuthn response" }` | Missing response object |
| 400 | `{ "error": "webId must use the https scheme" }` | Non-HTTPS webId |
| 400 | `{ "error": "webId contains invalid path sequences" }` | Path traversal attempt (`..", %2e%2e`) |
| 400 | `{ "error": "Missing challenge in clientDataJSON" }` | Malformed clientDataJSON |
| 400 | `{ "error": "Challenge not found, expired, or already used" }` | Invalid/expired challenge |
| 400 | `{ "error": "Challenge pubkey mismatch" }` | Challenge bound to different pubkey |
| 400 | `{ "error": "WebAuthn verification failed" }` | Signature or origin mismatch |
| 400 | `{ "error": "Registration not verified" }` | Verification returned false |
| 409 | `{ "error": "Pubkey already registered" }` | Duplicate registration |
| 500 | `{ "error": "Failed to store credential" }` | Database error |

---

## POST /auth/login/options

Generate WebAuthn authentication options for an existing user. Returns the stored PRF salt so the client can re-derive the same private key.

### Request

```json
{
  "pubkey": "a1b2c3d4e5f6..."
}
```

| Field | Type | Required | Description |
|-------|------|---------|-------------|
| `pubkey` | string | Yes | 64-character lowercase hex Nostr pubkey |

### Response (200 OK)

```json
{
  "options": {
    "challenge": "<base64url>",
    "rpId": "dreamlab-ai.com",
    "allowCredentials": [
      {
        "id": "<credential-id>"
      }
    ],
    "userVerification": "required",
    "extensions": {
      "prf": {
        "eval": {
          "first": "<base64url-prf-salt>"
        }
      }
    }
  },
  "prfSalt": "<base64url-32-byte-salt>"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `options` | object | `PublicKeyCredentialRequestOptionsJSON` for `navigator.credentials.get()` |
| `prfSalt` | string | Base64url-encoded stored PRF salt (same salt used during registration) |

### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| 400 | `{ "error": "Invalid pubkey: must be 64 hex characters" }` | Malformed pubkey |
| 404 | `{ "error": "Pubkey not registered" }` | No credential found for this pubkey |
| 500 | `{ "error": "Failed to generate authentication options" }` | Internal error |
| 500 | `{ "error": "Failed to store challenge" }` | Database error |

---

## POST /auth/login/verify

Verify the WebAuthn authentication response. This endpoint is protected by NIP-98: the `Authorization` header must contain a valid kind-27235 event signed by the same pubkey.

### Request Headers

```
Authorization: Nostr <base64-encoded-nip98-event>
Content-Type: application/json
```

The NIP-98 event must:

- Have `kind: 27235`
- Include a `u` tag matching the request URL
- Include a `method` tag matching `POST`
- Include a `payload` tag with SHA-256 of the raw request body
- Be signed by the same pubkey as the request body's `pubkey` field
- Have `created_at` within +/- 60 seconds of server time

### Request Body

```json
{
  "response": {
    "id": "<credential-id>",
    "rawId": "<base64url>",
    "response": {
      "clientDataJSON": "<base64url>",
      "authenticatorData": "<base64url>",
      "signature": "<base64url>",
      "userHandle": "<base64url>"
    },
    "type": "public-key",
    "clientExtensionResults": {}
  },
  "pubkey": "a1b2c3d4e5f6..."
}
```

| Field | Type | Required | Description |
|-------|------|---------|-------------|
| `response` | object | Yes | `AuthenticationResponseJSON` from `navigator.credentials.get()` |
| `pubkey` | string | Yes | 64-character lowercase hex Nostr pubkey |

### Response (200 OK)

```json
{
  "ok": true,
  "pubkey": "a1b2c3d4e5f6...",
  "didNostr": "did:nostr:a1b2c3d4e5f6...",
  "webId": "https://jss-xxx.run.app/a1b2c3d4e5f6.../profile/card#me",
  "podUrl": "https://jss-xxx.run.app/a1b2c3d4e5f6.../"
}
```

### Error Responses

| Status | Body | Cause |
|--------|------|-------|
| 401 | `{ "error": "NIP-98 authorization required" }` | Missing or invalid NIP-98 header |
| 403 | `{ "error": "NIP-98 pubkey does not match request pubkey" }` | Pubkey mismatch between NIP-98 token and request body |
| 400 | `{ "error": "Invalid pubkey: must be 64 hex characters" }` | Malformed pubkey |
| 400 | `{ "error": "Missing or invalid WebAuthn response" }` | Missing response object |
| 400 | `{ "error": "Missing challenge in clientDataJSON" }` | Malformed clientDataJSON |
| 400 | `{ "error": "Challenge not found, expired, or already used" }` | Invalid/expired challenge |
| 400 | `{ "error": "Challenge pubkey mismatch" }` | Challenge bound to different pubkey |
| 400 | `{ "error": "WebAuthn verification failed" }` | Signature or origin mismatch |
| 400 | `{ "error": "Authentication not verified" }` | Verification returned false |
| 401 | `{ "error": "Credential counter did not advance" }` | Replay attack detected |
| 404 | `{ "error": "Credential not found" }` | No credential for this pubkey |
| 500 | `{ "error": "Failed to update credential counter" }` | Database error |

---

## NIP-98 Header Format

The `Authorization` header for protected endpoints follows this format:

```
Authorization: Nostr <base64(JSON.stringify(signedEvent))>
```

The signed event:

```json
{
  "kind": 27235,
  "pubkey": "<64-char-hex-pubkey>",
  "created_at": 1740700000,
  "tags": [
    ["u", "https://auth-api-xxx.run.app/auth/login/verify"],
    ["method", "POST"],
    ["payload", "<sha256-hex-of-raw-request-body>"]
  ],
  "content": "",
  "id": "<sha256-of-nip01-canonical-form>",
  "sig": "<64-byte-schnorr-signature>"
}
```

### Fallback: Basic nostr:

If the `Nostr ` prefix is stripped by a proxy, the server also accepts:

```
Authorization: Basic <base64("nostr:" + base64(event))>
```

---

## CORS

```
Allowed origins:
  - https://dreamlab-ai.com
  - https://www.dreamlab-ai.com
  - http://localhost:5173 (development only)

Methods: GET, POST, OPTIONS
Headers: Content-Type, Authorization
Credentials: true (for allowed origins only)
```

---

## Database Schema

### webauthn_credentials

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `credential_id` | TEXT | PRIMARY KEY | WebAuthn credential ID |
| `pubkey` | TEXT | NOT NULL, UNIQUE | Nostr pubkey (64-char hex) |
| `did_nostr` | TEXT | NOT NULL | `did:nostr:<pubkey>` |
| `webid` | TEXT | nullable | Solid WebID URL |
| `pod_url` | TEXT | nullable | Solid pod base URL |
| `public_key_bytes` | BYTEA | NOT NULL | WebAuthn public key |
| `counter` | BIGINT | DEFAULT 0 | Credential counter (replay prevention) |
| `device_type` | TEXT | DEFAULT 'singleDevice' | Credential device type |
| `backed_up` | BOOLEAN | DEFAULT false | Whether credential is backed up |
| `transports` | TEXT[] | nullable | Supported transports |
| `prf_salt` | BYTEA | NOT NULL | 32-byte PRF salt |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Registration timestamp |

### webauthn_challenges

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated UUID |
| `challenge` | TEXT | NOT NULL, UNIQUE | Challenge string |
| `pubkey` | TEXT | nullable | Bound pubkey (null for registration) |
| `used` | BOOLEAN | DEFAULT FALSE | Whether challenge has been consumed |
| `prf_salt` | BYTEA | nullable | PRF salt (for registration challenges) |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Expiry timestamp (5 minutes from creation) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

Expired challenges are purged every 60 seconds by a background interval.

---

## Related Documentation

- [Authentication](../security/AUTHENTICATION.md) -- Full auth flow specification
- [Security Overview](../security/SECURITY_OVERVIEW.md) -- Security architecture
- [Cloud Services](../deployment/CLOUD_SERVICES.md) -- Deployment details

---

*Last major revision: 2026-03-01.*

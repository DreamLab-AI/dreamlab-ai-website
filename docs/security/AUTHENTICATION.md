# Authentication and Identity

**Last Updated:** 2026-03-01

Detailed specification of the DreamLab AI authentication system: WebAuthn PRF-based key derivation, NIP-98 HTTP authentication, and session management.

---

## Table of Contents

1. [Authentication Methods](#authentication-methods)
2. [WebAuthn PRF Registration](#webauthn-prf-registration)
3. [WebAuthn PRF Authentication](#webauthn-prf-authentication)
4. [Key Derivation](#key-derivation)
5. [NIP-98 HTTP Auth](#nip-98-http-auth)
6. [Consolidated NIP-98 Module](#consolidated-nip-98-module)
7. [Session Management](#session-management)
8. [Fallback Mechanisms](#fallback-mechanisms)
9. [Identity Model](#identity-model)
10. [Security Considerations](#security-considerations)

---

## Authentication Methods

DreamLab uses a passkey-first model. The private key is never stored; it is derived deterministically from the WebAuthn PRF extension output and held only in memory.

| Method | Priority | Key Management | PRF Required |
|--------|---------|---------------|-------------|
| **WebAuthn PRF (Passkey)** | Primary | Derived in closure, zeroed on pagehide | Yes |
| **NIP-07 Extension** | Advanced fallback | Extension-managed (Alby, nos2x) | No |
| **nsec Direct Entry** | Last resort | User-managed, one-time download | No |

### Method Selection

On page load, the auth store attempts to restore a session:

1. If `isPasskey` flag is set in localStorage, the user must re-authenticate with their passkey to re-derive the private key.
2. If `isNip07` flag is set, the store attempts to reconnect to the NIP-07 extension and verify the pubkey still matches.
3. If `isLocalKey` flag is set, the locally-held key is used (nsec fallback path).

---

## WebAuthn PRF Registration

### Flow Diagram

```
Browser                         auth-api                      PostgreSQL
  |                                |                              |
  |-- POST /auth/register/options -|                              |
  |   { displayName }             |                              |
  |                                |-- generate PRF salt (32 B) --|
  |                                |-- generate challenge --------|
  |                                |-- store challenge + salt --->|
  |<-- { options, prfSalt (b64u) } |                              |
  |                                |                              |
  |-- navigator.credentials.create()                              |
  |   extensions: { prf: { eval: { first: prfSalt } } }          |
  |                                                               |
  |-- Check prf.enabled === true                                  |
  |-- Extract prf.results.first (32 bytes)                        |
  |-- HKDF(SHA-256, salt=[], info="nostr-secp256k1-v1")          |
  |   -> 32-byte secp256k1 privkey                                |
  |-- getPublicKey(privkey) -> pubkey                             |
  |                                |                              |
  |-- POST /auth/register/verify --|                              |
  |   { response, pubkey }         |                              |
  |                                |-- verify WebAuthn response --|
  |                                |-- reject if pubkey exists -->|
  |                                |-- consume challenge -------->|
  |                                |-- provision Solid pod -------|
  |                                |-- store credential + salt -->|
  |<-- { didNostr, webId, podUrl } |                              |
  |                                |                              |
  |-- Store pubkey in auth state                                  |
  |-- Hold privkey in _privkeyMem closure                         |
  |-- Register pagehide listener to zero privkey                  |
```

### Step-by-Step

1. **Client sends display name** to `POST /auth/register/options`.
2. **Server generates**:
   - A random 32-byte PRF salt (`crypto.randomBytes(32)`)
   - WebAuthn registration options via `@simplewebauthn/server`
   - A challenge string stored in `webauthn_challenges` table (5-minute expiry)
3. **Server returns** options and PRF salt (base64url-encoded) to the client.
4. **Client calls `navigator.credentials.create()`** with the PRF extension requesting evaluation of the server-provided salt.
5. **Client checks** `extensions.prf.enabled === true`. If false, registration is aborted with an error (authenticator does not support PRF).
6. **Client extracts** `extensions.prf.results.first` (32-byte PRF output).
7. **Client derives** the secp256k1 private key via HKDF and computes the public key.
8. **Client sends** the WebAuthn response and derived pubkey to `POST /auth/register/verify`.
9. **Server verifies** the WebAuthn response, rejects duplicate pubkeys (HTTP 409), consumes the challenge, provisions a Solid pod via JSS, and stores the credential with the PRF salt.
10. **Server returns** `didNostr`, `webId`, and `podUrl`.
11. **Client stores** pubkey and profile metadata in localStorage. The private key is held only in `_privkeyMem`.

### Server-Side Validation (Registration)

- WebAuthn response verified via `@simplewebauthn/server` `verifyRegistrationResponse()`
- `requireUserVerification: true` enforced
- `expectedRPID: dreamlab-ai.com` and `expectedOrigin: https://dreamlab-ai.com` checked
- Pubkey validated as 64-character lowercase hex
- Duplicate pubkey check before challenge consumption (prevents race conditions)
- Client-supplied `webId` sanitised: must use `https:` scheme, no `..` or `%2e%2e` path sequences

---

## WebAuthn PRF Authentication

### Flow Diagram

```
Browser                         auth-api                      PostgreSQL
  |                                |                              |
  |-- POST /auth/login/options ----|                              |
  |   { pubkey }                   |                              |
  |                                |-- lookup credential -------->|
  |                                |-- retrieve stored prfSalt -->|
  |                                |-- generate challenge --------|
  |                                |-- store challenge + pubkey ->|
  |<-- { options, prfSalt (b64u) } |                              |
  |                                |                              |
  |-- navigator.credentials.get()                                 |
  |   extensions: { prf: { eval: { first: prfSalt } } }          |
  |                                                               |
  |-- Block if authenticatorAttachment === 'cross-platform'       |
  |-- Extract prf.results.first (32 bytes)                        |
  |-- HKDF(SHA-256, salt=[], info="nostr-secp256k1-v1")          |
  |   -> same 32-byte secp256k1 privkey                           |
  |-- getPublicKey(privkey) -> derivedPubkey                      |
  |                                |                              |
  |-- POST /auth/login/verify -----|                              |
  |   Authorization: Nostr <token> |                              |
  |   { response, pubkey }         |                              |
  |                                |-- verify NIP-98 token -------|
  |                                |-- check NIP-98 pubkey match -|
  |                                |-- verify WebAuthn assertion -|
  |                                |-- validate counter advanced -|
  |                                |-- update counter ----------->|
  |<-- { didNostr, webId, podUrl } |                              |
  |                                |                              |
  |-- Store pubkey in auth state                                  |
  |-- Hold privkey in _privkeyMem closure                         |
```

### Step-by-Step

1. **Client sends** stored pubkey to `POST /auth/login/options`.
2. **Server looks up** the credential by pubkey, retrieves the stored PRF salt, generates a challenge, and binds it to the pubkey.
3. **Server returns** authentication options with `allowCredentials` set to the stored credential ID, and the PRF salt.
4. **Client calls `navigator.credentials.get()`** with the same PRF salt used during registration.
5. **Client blocks cross-device QR auth**: if `assertion.authenticatorAttachment === 'cross-platform'`, an error is thrown. Cross-device QR produces a different PRF output, making the derived key inconsistent.
6. **Client extracts** PRF output, derives the private key via HKDF, and computes the public key. Because the same passkey and same PRF salt are used, the result is identical to registration.
7. **Client sends** the WebAuthn assertion response, the derived pubkey, and a NIP-98 `Authorization` header (signed with the derived key) to `POST /auth/login/verify`.
8. **Server verifies** the NIP-98 token first, confirming the caller controls the Nostr private key.
9. **Server verifies** the NIP-98 pubkey matches the claimed pubkey in the request body.
10. **Server verifies** the WebAuthn assertion via `@simplewebauthn/server`.
11. **Server validates** the credential counter has advanced (prevents replay).
12. **Server updates** the stored counter and returns identity information.

### Counter Validation

The WebAuthn credential counter is checked on every login:

```typescript
const newCounter = verification.authenticationInfo.newCounter;
if (newCounter <= Number(credential.counter)) {
  res.status(401).json({ error: 'Credential counter did not advance' });
  return;
}
```

This prevents replay of previously captured authentication responses.

---

## Key Derivation

### Derivation Pipeline

```
WebAuthn PRF output (32 bytes)
  |
  |  Input to Web Crypto HKDF
  |
  v
crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveBits'])
  |
  v
crypto.subtle.deriveBits({
  name: 'HKDF',
  hash: 'SHA-256',
  salt: new Uint8Array(0),       // empty salt
  info: 'nostr-secp256k1-v1'     // UTF-8 encoded
}, keyMaterial, 256)
  |
  v
32-byte candidate key
  |
  |  Validate: 0 < key < secp256k1 curve order n
  |  (probability of invalid key: ~2^-128)
  |
  v
Valid secp256k1 private key
  |
  v
nostr-tools getPublicKey() -> hex pubkey
```

### Implementation

```typescript
// community-forum/src/lib/auth/passkey.ts
async function derivePrivkeyFromPrf(prfOutput: ArrayBuffer): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', prfOutput, 'HKDF', false, ['deriveBits']
  );
  const privkeyBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode('nostr-secp256k1-v1'),
    },
    keyMaterial,
    256
  );
  const key = new Uint8Array(privkeyBits);
  if (!secp256k1.utils.isValidPrivateKey(key)) {
    return derivePrivkeyFromPrf(await crypto.subtle.digest('SHA-256', key));
  }
  return key;
}
```

### Critical Constraints

- **Deterministic**: Same passkey credential + same PRF salt always produces the same private key.
- **Cross-device QR blocked**: A different authenticator produces a different PRF output. The client explicitly rejects `authenticatorAttachment === 'cross-platform'`.
- **Windows Hello blocked**: Windows Hello does not implement the PRF extension. An error message is shown.
- **PRF salt is per-user**: Generated at registration, stored server-side in `webauthn_credentials.prf_salt`, and returned to the client on each login.

---

## NIP-98 HTTP Auth

### Token Creation (Client-Side)

```typescript
// community-forum/packages/nip98/sign.ts
import { getToken } from 'nostr-tools/nip98';

export async function createNip98Token(
  privkey: Uint8Array,
  url: string,
  method: string,
  body?: Uint8Array | ArrayBuffer,
): Promise<string> {
  const payload = body ? await hashRawBody(body) : undefined;
  return getToken(url, method, createSigner(privkey), true, payload);
}
```

The resulting token is a base64-encoded Nostr event:

```json
{
  "kind": 27235,
  "pubkey": "<64-char hex>",
  "created_at": 1740700000,
  "tags": [
    ["u", "https://auth-api-xxx.run.app/auth/login/verify"],
    ["method", "POST"],
    ["payload", "<sha256-hex-of-raw-body>"]
  ],
  "content": "",
  "id": "<sha256-of-canonical-form>",
  "sig": "<schnorr-signature>"
}
```

### Token Verification (Server-Side)

```typescript
// community-forum/packages/nip98/verify.ts
export async function verifyNip98(
  authHeader: string,
  opts: VerifyOptions,
): Promise<VerifyResult | null>
```

The server performs the following checks in order:

1. Extract token from `Nostr <base64>` header (or `Basic nostr:<base64>` fallback)
2. Decode and parse the JSON event (reject if > 64KB)
3. Verify `kind === 27235`
4. Check timestamp within +/- 60 seconds of server time
5. Validate pubkey is 64-character hex
6. Match the `u` tag against the expected URL (using RP_ORIGIN, not request headers)
7. Match the `method` tag against the request method
8. Verify event integrity (id + sig) via `nostr-tools` `verifyEvent()`
9. If `payload` tag present and raw body available, compute SHA-256 of raw body bytes and compare

### Anti-SSRF: RP_ORIGIN URL Reconstruction

The auth-api reconstructs the full request URL from the `RP_ORIGIN` environment variable rather than trusting `req.headers.host` or `x-forwarded-host`:

```typescript
const rpOrigin = process.env.RP_ORIGIN || '';
const baseOrigin = rpOrigin.replace(/\/$/, '');
const fullUrl = `${baseOrigin}${req.originalUrl}`;
```

This prevents an attacker from spoofing the Host header to bypass URL validation.

---

## Consolidated NIP-98 Module

The NIP-98 implementation is consolidated in `community-forum/packages/nip98/`:

| File | Role | Runtime |
|------|------|---------|
| `sign.ts` | Token creation via `nostr-tools/nip98` `getToken()` | Browser + Node |
| `verify.ts` | Token verification with `verifyEvent()`, URL matching, payload hash | Node + Workers |
| `types.ts` | `VerifyOptions`, `VerifyResult`, `Nip98Event` type definitions | Shared |
| `index.ts` | Re-exports | Shared |

### Consumer Modules

| Consumer | Import Path | Usage |
|----------|------------|-------|
| Forum client | `../../../packages/nip98/sign.js` | `createNip98Token()` via `fetchWithNip98()` |
| auth-api | `../../../packages/nip98/verify.js` | `verifyNip98()` with RP_ORIGIN |
| nostr-relay | `../../../packages/nip98/verify.js` | Event verification on publish |
| image-api | `../../../packages/nip98/verify.js` | Upload authorisation |

---

## Session Management

### Stateless Architecture

DreamLab does not use server-side sessions. Every request is independently authenticated via NIP-98 tokens signed with the client-held private key. There are no session cookies, JWTs, or server-side session stores.

### Client-Side State

| Storage | Data | Lifetime |
|---------|------|----------|
| `_privkeyMem` (closure) | secp256k1 private key (Uint8Array) | Until pagehide event |
| `localStorage` (`nostr_bbs_keys`) | pubkey, nickname, avatar, auth method flags | Persistent across sessions |
| No `sessionStorage` usage | -- | -- |

### Pagehide Zeroing

When the page is being unloaded (navigation away, tab close, window close), the private key is overwritten with zeros:

```typescript
window.addEventListener('pagehide', () => {
  if (_privkeyMem) {
    _privkeyMem.fill(0);
    _privkeyMem = null;
  }
}, { once: true });
```

This uses `pagehide` rather than `visibilitychange` to avoid clearing the key on every tab switch.

### Session Restoration

On page load:

- **Passkey users**: Profile metadata (pubkey, nickname) is restored from localStorage, but the private key is not available until the user re-authenticates with their passkey. The UI shows a "re-authenticate" prompt.
- **NIP-07 users**: The store attempts to reconnect to the extension and verify the pubkey matches. If the extension is unavailable, the user is prompted to sign in again.
- **nsec users**: Not applicable in the current architecture; this path is deprecated in favour of passkeys.

---

## Fallback Mechanisms

### Basic nostr: Encoding

If a proxy or CDN strips the `Nostr ` prefix from the Authorization header, the client can fall back to `Basic nostr:<base64-token>` encoding. The server's `extractToken()` function handles both formats:

```typescript
function extractToken(authHeader: string, allowBasicNostr: boolean): string | null {
  if (authHeader.startsWith('Nostr ')) return authHeader.slice(6).trim();
  if (allowBasicNostr && authHeader.startsWith('Basic ')) {
    const decoded = atob(authHeader.slice(6));
    if (decoded.startsWith('nostr:')) return decoded.slice(6);
  }
  return null;
}
```

### NIP-07 Browser Extension

For users who prefer hardware-backed keys (YubiKey) or existing Nostr signing extensions:

1. Extension detected via `window.nostr` availability
2. Public key obtained via `window.nostr.getPublicKey()`
3. Events signed via `window.nostr.signEvent()` (triggers user approval prompt)
4. No private key ever touches the application

### nsec Direct Entry

As a last-resort fallback, users can enter their nsec (bech32-encoded private key) directly. This is offered during the login flow as an "advanced" option. The key is held in the `_privkeyMem` closure and zeroed on pagehide, identical to the passkey path.

---

## Identity Model

### Primary Identity: Nostr Pubkey

The 64-character hex Nostr public key is the canonical identity across all DreamLab systems.

### DID Identifier

```
did:nostr:<pubkey>
```

Used for DID-based interoperability. Generated at registration time and stored in `webauthn_credentials.did_nostr`.

### WebID (Solid)

```
{jss-url}/{pubkey}/profile/card#me
```

A Solid WebID pointing to the user's profile document in their JSS pod. Used for Linked Data interoperability. Generated during pod provisioning.

---

## Security Considerations

### Why PRF, Not a Stored Key

Storing a private key (even encrypted) creates a target. The WebAuthn PRF approach means:

- The private key is **never stored** anywhere (not localStorage, not IndexedDB, not cookies, not the server).
- A database breach yields only PRF salts and WebAuthn credentials, neither of which can derive the private key.
- The authenticator's internal HMAC-SHA-256 computation uses a device-bound secret that never leaves the hardware.

### Timestamp Tolerance

NIP-98 uses a +/- 60 second tolerance. This is a trade-off:

- Too tight: clock skew causes legitimate requests to fail
- Too loose: increases the replay window

Combined with WebAuthn counter validation and single-use challenges, the 60-second window provides adequate protection.

### Raw Body Hashing

The `payload` tag in NIP-98 events contains a SHA-256 hash of the raw request body bytes. The server captures these bytes via `express.raw()` **before** JSON parsing to ensure the hash matches exactly. This prevents:

- JSON re-serialisation altering whitespace or key ordering
- Middleware transforms changing the body between hashing and verification

---

## Key Files

| File | Role |
|------|------|
| `community-forum/src/lib/auth/passkey.ts` | WebAuthn PRF ceremony, HKDF derivation |
| `community-forum/src/lib/auth/nip98-client.ts` | NIP-98 token creation + `fetchWithNip98()` wrapper |
| `community-forum/src/lib/stores/auth.ts` | Auth state, `_privkeyMem` closure, pagehide zeroing |
| `community-forum/packages/nip98/sign.ts` | Shared NIP-98 token signing |
| `community-forum/packages/nip98/verify.ts` | Shared NIP-98 token verification |
| `community-forum/services/auth-api/src/server.ts` | Express server, CORS, raw body capture |
| `community-forum/services/auth-api/src/routes/register.ts` | Registration endpoints |
| `community-forum/services/auth-api/src/routes/authenticate.ts` | Login endpoints |
| `community-forum/services/auth-api/src/nip98.ts` | Server-side NIP-98 verification (wraps shared module) |
| `community-forum/services/auth-api/src/webauthn.ts` | WebAuthn option generation and response verification |
| `community-forum/services/auth-api/src/db.ts` | PostgreSQL schema, challenge/credential CRUD |
| `community-forum/services/auth-api/src/jss-client.ts` | JSS pod provisioning via CSS 7.x REST API |

---

## Related Documentation

- [Security Overview](./SECURITY_OVERVIEW.md)
- [Data Protection](./DATA_PROTECTION.md)
- [Auth API Reference](../api/AUTH_API.md)
- [Deployment: Cloud Services](../deployment/CLOUD_SERVICES.md)

---

*This document is version-controlled. Last major revision: 2026-03-01.*

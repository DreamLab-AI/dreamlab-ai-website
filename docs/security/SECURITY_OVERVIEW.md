# Security Overview

**Last Updated:** 2026-02-28

Comprehensive security architecture for the DreamLab AI platform (dreamlab-ai.com): a React SPA with SvelteKit community forum, GCP Cloud Run backend services, and WebAuthn PRF-based authentication.

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Trust Model](#trust-model)
3. [Authentication Layer](#authentication-layer)
4. [Input Validation and Sanitisation](#input-validation-and-sanitisation)
5. [Transport Security](#transport-security)
6. [Key Management](#key-management)
7. [Access Control](#access-control)
8. [Known Limitations](#known-limitations)
9. [Threat Model](#threat-model)
10. [Security Best Practices](#security-best-practices)

---

## Security Architecture

### Multi-Layer Defence

```
+---------------------------------------------------------------+
| Layer 1: Identity and Authentication                          |
| - WebAuthn PRF extension (passkey-first, passwordless)        |
| - NIP-98 HTTP Auth (kind 27235, Schnorr-signed)               |
| - NIP-07 browser extension (advanced fallback)                |
| - nsec direct key entry (last-resort fallback)                |
+---------------------------------------------------------------+
                            |
+---------------------------------------------------------------+
| Layer 2: Authorisation and Access Control                     |
| - NIP-98 token on every state-mutating API call               |
| - WAC (Web Access Control) on JSS Solid pods                  |
| - CORS allowlist on all backend services                      |
| - RP_ORIGIN anti-SSRF URL reconstruction                      |
+---------------------------------------------------------------+
                            |
+---------------------------------------------------------------+
| Layer 3: Data Protection                                      |
| - Private key held only in closure (_privkeyMem), never stored|
| - Key zeroed on pagehide event                                |
| - NIP-44 v2 encryption for DMs (XChaCha20-Poly1305)          |
| - NIP-59 gift wrapping (sender anonymity)                     |
+---------------------------------------------------------------+
                            |
+---------------------------------------------------------------+
| Layer 4: Input Validation                                     |
| - Zod 3.23 schemas at all form boundaries                    |
| - DOMPurify 3.3 for rendered HTML                             |
| - File path traversal prevention (vite.config.ts middleware)  |
| - 64KB max event size on NIP-98 tokens                        |
+---------------------------------------------------------------+
                            |
+---------------------------------------------------------------+
| Layer 5: Transport and Network                                |
| - HTTPS for all web traffic (GitHub Pages + Cloud Run)        |
| - WebSocket Secure (WSS) for relay connections                |
| - Content Security Policy headers                             |
| - Strict CORS configuration per service                       |
+---------------------------------------------------------------+
                            |
+---------------------------------------------------------------+
| Layer 6: Integrity                                            |
| - Schnorr signatures (BIP-340) on all Nostr events            |
| - Event ID verification (SHA-256 of NIP-01 canonical form)   |
| - WebAuthn credential counter validation (replay prevention) |
| - NIP-98 timestamp tolerance: +/- 60 seconds                  |
+---------------------------------------------------------------+
```

### Security Principles

1. **Zero Trust**: Server always recomputes event IDs from NIP-01 canonical form and verifies Schnorr signatures independently. Client-supplied data is never trusted.
2. **Defence in Depth**: Multiple layers prevent single points of failure. WebAuthn + NIP-98 + CORS + WAC combine to protect resources.
3. **No Server-Side Key Storage**: Private keys exist only in the browser's auth store closure. The server stores WebAuthn credentials and PRF salts, but never the derived secp256k1 private key.
4. **Privacy by Design**: End-to-end encryption for DMs (NIP-44 + NIP-59). Gift wrapping hides sender identity from the relay.
5. **Cryptographic Identity**: Nostr pubkey (hex) is the primary identity, derived deterministically from WebAuthn PRF output via HKDF.

---

## Trust Model

### Trust Boundaries

```
+---------------------------------------------------------------+
|  CLIENT DEVICE (Trusted)                                      |
|  - Private key lives only in auth store closure               |
|  - Key zeroed on pagehide (never persisted)                   |
|  - Same passkey + same PRF salt = same privkey (deterministic)|
|  - User controls all cryptographic operations                 |
+-----------------------------+---------------------------------+
                              | HTTPS / WSS (TLS 1.3)
+-----------------------------v---------------------------------+
|  AUTH-API (Cloud Run, partially trusted)                      |
|  - Stores WebAuthn credentials + PRF salts in PostgreSQL      |
|  - Verifies WebAuthn assertions and NIP-98 tokens             |
|  - Provisions Solid pods via JSS                               |
|  - Cannot derive private keys (no PRF output)                 |
+-----------------------------+---------------------------------+
                              |
+-----------------------------v---------------------------------+
|  NOSTR RELAY (Cloud Run, semi-trusted)                        |
|  - Can read public channel messages                            |
|  - Cannot decrypt DMs (NIP-44 encrypted)                       |
|  - Enforces event signature verification                       |
|  - May log metadata (timestamps, pubkeys)                      |
+-----------------------------+---------------------------------+
                              |
+-----------------------------v---------------------------------+
|  JSS POD STORAGE (Cloud Run + Cloud Storage, controlled)      |
|  - Per-user pods with WAC-based ACLs                           |
|  - Owner gets full Control; authenticated agents get read-only|
|  - Cloud Storage volume mount for persistence                  |
+---------------------------------------------------------------+
```

### Threat Assumptions

- **Client Device**: Trusted, but may be lost, stolen, or compromised by malicious extensions.
- **Network**: Untrusted. Assume passive and active attackers on all paths.
- **Backend Services**: Semi-trusted. Compromise of auth-api or relay cannot yield private keys.
- **Database**: Untrusted for key material. Contains WebAuthn credentials, PRF salts, and Nostr events. A database breach cannot derive private keys (HKDF output is one-way).

---

## Authentication Layer

DreamLab uses a passkey-first authentication model. See [AUTHENTICATION.md](./AUTHENTICATION.md) for the full specification.

### Authentication Methods (Priority Order)

| Method | Security Level | Key Location | Use Case |
|--------|---------------|-------------|----------|
| **WebAuthn PRF (Passkey)** | Highest | Derived in browser closure, zeroed on pagehide | Primary method |
| **NIP-07 Extension** | High | Hardware-backed or extension-managed | Advanced users |
| **nsec Direct Entry** | Moderate | User-managed | Last-resort fallback |

### NIP-98 HTTP Auth

Every state-mutating API call is authenticated via NIP-98:

- **Token format**: `Authorization: Nostr <base64(signed_event)>`
- **Event kind**: 27235
- **Tags**: `u` (URL), `method`, optional `payload` (SHA-256 of raw body bytes)
- **Signing**: Schnorr signature with the secp256k1 private key from the auth store closure
- **Verification**: Server recomputes event ID from NIP-01 canonical form, verifies signature, checks timestamp within +/- 60 seconds
- **Payload hashing**: Server captures raw body bytes via `express.raw()` before JSON parsing to ensure hash consistency
- **Hardening**: RP_ORIGIN anti-SSRF (reconstructs URL from environment, not from `x-forwarded-host`), 64KB max event size, `Basic nostr:` fallback encoding

### Consolidated NIP-98 Module

All NIP-98 signing and verification is handled by a shared module at `community-forum/packages/nip98/`:

| File | Purpose |
|------|---------|
| `sign.ts` | Token creation using `nostr-tools/nip98` `getToken()` |
| `verify.ts` | Token verification with Schnorr signature check via `nostr-tools` `verifyEvent()` |
| `types.ts` | Shared type definitions |

---

## Input Validation and Sanitisation

### Form-Level Validation (Zod 3.23)

All user-facing forms use Zod schemas for input validation at the form boundary:

- React Hook Form integrates with Zod via `@hookform/resolvers/zod`
- Schemas validate shape, type, and constraints before data reaches any API
- Contact form, workshop booking, and newsletter signup all use Zod validation

### HTML Sanitisation (DOMPurify 3.3)

All user-generated content rendered as HTML is sanitised through DOMPurify before insertion into the DOM. This includes:

- Markdown-rendered workshop content
- Team profile descriptions
- Any content loaded from `public/data/` at runtime

### File Path Validation

The Vite dev server includes middleware to validate file paths and prevent directory traversal attacks. Encoded path segments (`%2e%2e`) are also checked to prevent bypass via URL encoding.

### API Input Validation

- Nostr pubkeys validated as 64-character lowercase hex: `/^[0-9a-f]{64}$/`
- WebAuthn responses validated for required fields before processing
- NIP-98 events capped at 64KB
- JSS client validates all URLs returned by the Community Solid Server against the expected host to prevent SSRF

---

## Transport Security

### HTTPS

- **GitHub Pages**: HTTPS enforced via GitHub's infrastructure. Custom domain `dreamlab-ai.com` configured with CNAME.
- **Cloud Run**: All services require HTTPS. Cloud Run provides managed TLS certificates.
- **WebSocket**: WSS (TLS-encrypted WebSocket) for all relay connections.

### CORS Configuration

Each backend service has an explicit CORS allowlist:

```
Allowed origins:
  - https://dreamlab-ai.com
  - https://www.dreamlab-ai.com
  - http://localhost:5173 (development only, excluded in production)
```

Credentials are granted only to known origins. No-origin requests (curl, server-to-server) receive a response without credentials.

### Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' wss://*.dreamlab-ai.com https://*.run.app;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### HTTP Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## Key Management

### Key Derivation

```
WebAuthn PRF output (32 bytes, HMAC-SHA-256 from authenticator)
  |
  v
HKDF(SHA-256, salt=[], info="nostr-secp256k1-v1")
  |
  v
32-byte secp256k1 private key
  |
  v
getPublicKey() -> hex pubkey (Nostr identity)
```

### Key Lifecycle

1. **Derivation**: PRF output from WebAuthn ceremony is passed through HKDF to produce a valid secp256k1 private key.
2. **Validation**: The derived key is checked against the secp256k1 curve order. Invalid keys (probability ~2^-128) are re-hashed deterministically.
3. **In-Memory Storage**: The private key is held in `_privkeyMem: Uint8Array | null` within the auth store closure. It is never written to localStorage, sessionStorage, IndexedDB, or cookies.
4. **Usage**: The key signs NIP-98 tokens and Nostr events during the session.
5. **Zeroing**: On `pagehide`, the key is overwritten with zeros (`_privkeyMem.fill(0)`) and set to null.
6. **Re-derivation**: On the next login, the same passkey + same PRF salt produces the same private key deterministically.

### What the Server Stores

| Data | Location | Can Derive Privkey? |
|------|----------|-------------------|
| WebAuthn credential ID | PostgreSQL `webauthn_credentials` | No |
| WebAuthn public key bytes | PostgreSQL `webauthn_credentials` | No |
| PRF salt (32 bytes) | PostgreSQL `webauthn_credentials.prf_salt` | No (needs authenticator) |
| Credential counter | PostgreSQL `webauthn_credentials` | No |
| Nostr pubkey (hex) | PostgreSQL `webauthn_credentials` | No |

The PRF salt alone is insufficient to derive the private key. The authenticator's internal HMAC-SHA-256 computation (using a device-bound secret) is required to produce the PRF output.

---

## Access Control

### NIP-98 Token-Based Access

All state-mutating API calls require a valid NIP-98 `Authorization` header. The server:

1. Extracts the base64-encoded event from the header
2. Verifies the Schnorr signature
3. Checks the event kind (27235)
4. Validates the URL tag against the reconstructed request URL (using RP_ORIGIN, not the request's Host header)
5. Validates the method tag
6. If a `payload` tag is present, computes SHA-256 of the raw body bytes and compares
7. Checks the timestamp is within +/- 60 seconds

### WAC on Solid Pods

JSS pod access is controlled via Web Access Control (WAC):

- **Owner (Nostr pubkey)**: Full Control (read, write, append, control)
- **Authenticated agents**: Read-only access
- **Public (unauthenticated)**: No access

ACL documents are stored as JSON-LD within the pod. A custom WAC evaluator (planned for Cloudflare Workers migration) will enforce these ACLs with zero RDF dependencies.

---

## Known Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| **Cross-device QR auth blocked** | Users cannot authenticate from a different device via QR-based WebAuthn | Cross-device QR produces a different PRF output, making key derivation inconsistent. The client explicitly blocks `authenticatorAttachment === 'cross-platform'`. |
| **Windows Hello blocked** | Windows Hello does not support the PRF extension | Users on Windows must use a FIDO2 security key (e.g., YubiKey) or fall back to NIP-07/nsec. An error message is shown when PRF is not available. |
| **No key rotation** | Nostr protocol does not support key rotation natively | The identity is bound to the secp256k1 keypair. Changing keys requires social migration. |
| **PRF support varies** | PRF extension requires Chrome 116+, Safari 17.4+, or equivalent | Older browsers will fail at registration with a descriptive error message. |
| **Pod storage is Cloud Run ephemeral** | JSS pod data is stored on a Cloud Storage volume mount, but CSS in-memory state is lost on restart | Cloud Storage volume provides persistence; CSS state rebuild on startup. Migration to R2 planned. |

---

## Threat Model

### Threat Analysis

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|-----------|--------|-----------|---------------|
| **Private key theft** | Very Low | Critical | Key exists only in closure, zeroed on pagehide, never stored | Very Low |
| **MITM attack** | Low | High | TLS 1.3 on all connections, HSTS headers | Very Low |
| **Relay compromise** | Medium | Medium | E2E encryption for DMs, NIP-98 on writes, no key material on relay | Low |
| **Auth-API compromise** | Low | High | Cannot derive privkeys (no PRF output), WebAuthn credentials cannot be replayed without authenticator | Low |
| **XSS** | Low | High | DOMPurify, CSP, Zod validation | Very Low |
| **SSRF via auth-api** | Low | Medium | RP_ORIGIN reconstruction ignores x-forwarded-host; JSS client validates URL host | Very Low |
| **CSRF** | Low | Medium | NIP-98 signed requests (cannot be forged), SameSite cookies | Very Low |
| **Replay attack** | Medium | Medium | WebAuthn counter validation, NIP-98 timestamp tolerance +/- 60s, challenge consumption (single-use) | Low |
| **PRF salt theft** | Low | Low | Salt alone is useless without the authenticator's device-bound secret | Very Low |

### Attack Scenario: Compromised Database

**Attack**: Attacker gains read access to the `webauthn_credentials` table.

**Obtained**: Credential IDs, public key bytes, PRF salts, counters, pubkeys, DID identifiers.

**Cannot obtain**: Private keys (PRF output requires the physical authenticator).

**Cannot do**: Sign events (no private key), authenticate as user (WebAuthn requires authenticator), access encrypted DMs (NIP-44 requires private key).

**Mitigation**: Even a full database breach does not compromise user identities or encrypted communications.

---

## Security Best Practices

### For Developers

1. **Never log private keys or PRF output**
   ```typescript
   // Wrong
   console.log('privkey:', privkey);

   // Correct
   console.log('privkey present:', !!privkey);
   ```

2. **Always validate inputs at system boundaries**
   ```typescript
   if (!isValidPubkey(pubkey)) {
     res.status(400).json({ error: 'Invalid pubkey' });
     return;
   }
   ```

3. **Sanitise all rendered content**
   ```typescript
   import DOMPurify from 'dompurify';
   const safeHTML = DOMPurify.sanitize(userContent);
   ```

4. **Use RP_ORIGIN for URL reconstruction**
   ```typescript
   // Wrong: trusts x-forwarded-host
   const url = `${req.protocol}://${req.headers.host}${req.originalUrl}`;

   // Correct: uses pre-configured origin
   const url = `${process.env.RP_ORIGIN}${req.originalUrl}`;
   ```

5. **Capture raw body before JSON parsing for NIP-98 payload hashing**
   ```typescript
   app.use(express.raw({ type: '*/*', limit: '1mb' }));
   // req.rawBody available for SHA-256 hash comparison
   ```

### For Users

1. **Register with a platform authenticator** (Touch ID, Face ID, fingerprint sensor) for the strongest security.
2. **Download your nsec backup** when prompted after registration. This is the only recovery mechanism if you lose your passkey.
3. **Do not use cross-device QR authentication** -- it will produce a different key.
4. **Windows users**: Use a FIDO2 security key (YubiKey, Titan Key) rather than Windows Hello.

---

## Security Audit History

- **2026-01-16**: Full internal audit. 2 high-severity issues resolved, 1 medium resolved.
- **2026-01-25**: GCP Cloud Run migration. SSRF and WebSocket security hardening.
- **2026-02-28**: Documentation rewrite to reflect current WebAuthn PRF + NIP-98 architecture.

---

## Related Documentation

- [Authentication Flow](./AUTHENTICATION.md) -- WebAuthn PRF registration and login, NIP-98 token creation
- [Data Protection](./DATA_PROTECTION.md) -- Key lifecycle, encrypted DMs, pod ACLs
- [Auth API Reference](../api/AUTH_API.md) -- Endpoint specifications
- [Vulnerability Management](./VULNERABILITY_MANAGEMENT.md) -- Reporting and triage

---

**Security Contact**: security@dreamlab-ai.com (to be configured)

*This document is version-controlled. Last major revision: 2026-02-28.*

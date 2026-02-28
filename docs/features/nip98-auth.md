---
title: "NIP-98 HTTP Auth"
description: "Shared NIP-98 module architecture for Schnorr-signed HTTP authentication across DreamLab AI services"
category: reference
tags: ['nip-98', 'authentication', 'nostr', 'developer']
difficulty: intermediate
last-updated: 2026-02-28
---

# NIP-98 HTTP Auth

NIP-98 defines a mechanism for authenticating HTTP requests using Nostr events. Every state-mutating API call in DreamLab AI includes an `Authorization: Nostr <base64(event)>` header containing a Schnorr-signed kind:27235 event that binds the request to a specific URL, method, and optionally the SHA-256 hash of the request body.

## Shared Module Architecture

The NIP-98 logic is consolidated in a single shared package at:

```
community-forum/packages/nip98/
  index.ts     -- barrel re-exports
  sign.ts      -- token creation (client-side)
  verify.ts    -- token verification (server-side)
  types.ts     -- TypeScript interfaces
```

All four consumers import from this shared package via relative path imports, eliminating duplication.

## sign.ts API

### `createSigner(privkey: Uint8Array)`

Returns a signer function compatible with `nostr-tools/nip98.getToken()`. Wraps `finalizeEvent()` to Schnorr-sign an event template with the given private key.

```typescript
import { createSigner } from 'packages/nip98/sign';

const signer = createSigner(privkey);
// signer(eventTemplate) => SignedEvent
```

### `hashRawBody(body: Uint8Array | ArrayBuffer): Promise<string>`

Computes the SHA-256 hex digest of raw request body bytes for the NIP-98 `payload` tag.

### `createNip98Token(privkey, url, method, body?): Promise<string>`

Creates a complete NIP-98 base64-encoded token ready for the `Authorization` header.

```typescript
import { createNip98Token } from 'packages/nip98/sign';

const token = await createNip98Token(privkey, url, 'POST', bodyBytes);
// Use as: Authorization: Nostr ${token}
```

Internally calls `nostr-tools/nip98.getToken()` with the signer and optional payload hash.

## verify.ts API

### `verifyNip98(authHeader, opts): Promise<VerifyResult | null>`

Verifies a NIP-98 `Authorization` header. Returns `{ pubkey, didNostr }` on success, `null` on any failure (silent rejection -- no exceptions).

Verification steps:

1. Extract token from `Nostr <token>` or `Basic nostr:<token>` prefix
2. Base64-decode the token to a JSON event
3. Enforce 64KB size limit (`MAX_EVENT_SIZE`)
4. Check `kind === 27235`
5. Check timestamp within +/-60 seconds of server time
6. Validate pubkey format (64-char hex)
7. Match `u` tag against expected URL (with optional prefix matching)
8. Match `method` tag against expected HTTP method
9. Verify event integrity (id + Schnorr signature) via `nostr-tools.verifyEvent()`
10. If `payload` tag is present and `rawBody` is provided, verify SHA-256 match

```typescript
import { verifyNip98 } from 'packages/nip98/verify';

const result = await verifyNip98(authHeader, {
  url: 'https://api.dreamlab-ai.com/auth/login/verify',
  method: 'POST',
  rawBody: requestBodyBuffer,
  allowBasicNostr: true,
  allowUrlPrefix: false,
});

if (result) {
  console.log(result.pubkey);    // 64-char hex
  console.log(result.didNostr);  // did:nostr:{pubkey}
}
```

### `hasNostrAuth(authHeader: string | undefined): boolean`

Quick check for whether an `Authorization` header contains a NIP-98 token (either `Nostr` or `Basic nostr:` prefix). Useful for middleware that needs to distinguish NIP-98 from other auth schemes.

## types.ts Interfaces

```typescript
interface VerifyOptions {
  url: string;                         // Expected request URL
  method: string;                      // Expected HTTP method
  rawBody?: ArrayBuffer | Uint8Array;  // Raw body for payload hash verification
  maxSize?: number;                    // Override 64KB limit
  allowBasicNostr?: boolean;           // Accept Basic nostr: prefix
  allowMethodWildcard?: boolean;       // Accept method: '*'
  allowUrlPrefix?: boolean;            // Accept URL prefix match
}

interface VerifyResult {
  pubkey: string;    // 64-char hex pubkey
  didNostr: string;  // did:nostr:{pubkey}
}

interface Nip98Event {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;       // 27235
  tags: string[][];   // [['u', url], ['method', method], ['payload', hash]?]
  content: string;
  sig: string;
}
```

## Consumers

Four services import from the shared package:

| Consumer | Imports | Customisation |
|----------|---------|---------------|
| **SvelteKit forum** (`src/lib/auth/nip98-client.ts`) | `createNip98Token` from sign.ts | `fetchWithNip98()` wrapper that computes body hash for string/ArrayBuffer bodies, skips for FormData/ReadableStream |
| **auth-api** (`services/auth-api/src/nip98.ts`) | `verifyNip98` from verify.ts | Wraps shared verify with service-specific RP_ORIGIN validation |
| **nostr-relay** (`services/nostr-relay/src/nip98.ts`) | `verifyNip98`, `hasNostrAuth` from verify.ts | Adds `pubkeyToDidNostr()` helper, WebSocket upgrade auth |
| **image-api** (`services/image-api/src/server.ts`) | `verifyNip98` from verify.ts | NIP-98 gating on upload endpoints |

## DreamLab Hardening

Beyond the base NIP-98 specification, the DreamLab implementation applies:

| Hardening | Detail |
|-----------|--------|
| **64KB event limit** | Reject events larger than 64KB to prevent memory abuse |
| **+/-60s timestamp** | Tight timestamp tolerance prevents replay attacks |
| **RP_ORIGIN validation** | Server-side URL origin check prevents SSRF via crafted `u` tags |
| **Basic nostr: fallback** | Accept `Basic nostr:<base64>` for clients that cannot set custom auth prefixes |
| **URL prefix matching** | Optional `allowUrlPrefix` for path-based routing |
| **Raw body payload hash** | Server captures body via `express.raw()` before JSON parsing to hash the exact bytes the client signed |
| **Silent rejection** | All verification failures return `null` -- no error messages that could aid attackers |

## Edge Compatibility (Cloudflare Workers)

The shared module uses `atob()` and `crypto.subtle` (Web Crypto API) for base64 decoding and SHA-256 hashing respectively, ensuring compatibility with:

- Node.js 18+ (global `crypto.subtle`)
- Cloudflare Workers (native Web Crypto)
- Modern browsers

The `Buffer` detection (`typeof Buffer !== 'undefined'`) provides a fast path for Node.js environments while falling back to `atob()` in Workers and browsers.

## Token Lifecycle

```
Client                              Server
  |                                    |
  |  1. Create event template          |
  |     kind: 27235                    |
  |     tags: [u, method, payload?]    |
  |     created_at: now                |
  |                                    |
  |  2. Schnorr sign with privkey      |
  |     (finalizeEvent computes id)    |
  |                                    |
  |  3. Base64-encode signed event     |
  |                                    |
  |  Authorization: Nostr <token> ---->|
  |                                    |  4. Decode base64
  |                                    |  5. Verify kind, timestamp, size
  |                                    |  6. Match URL and method
  |                                    |  7. Verify Schnorr signature
  |                                    |  8. Verify payload hash (if present)
  |                                    |
  |                          200 OK <--|  9. Return { pubkey, didNostr }
```

## Related Documentation

- [Authentication System](./authentication.md) -- WebAuthn PRF registration and login flows
- [Community Forum](./community-forum.md) -- forum architecture and auth integration
- [ADR-001](../adr/001-nostr-protocol-foundation.md) -- Nostr protocol foundation

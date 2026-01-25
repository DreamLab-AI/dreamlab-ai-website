# Data Protection & Privacy

**Last Updated:** 2026-01-25

This document covers encryption, storage, data handling, and privacy compliance in the Fairfield platform.

---

## Table of Contents

1. [Encryption Architecture](#encryption-architecture)
2. [NIP-44 v2 Encryption](#nip-44-v2-encryption)
3. [NIP-59 Gift Wrapping](#nip-59-gift-wrapping)
4. [Key Storage Encryption](#key-storage-encryption)
5. [Data Classification](#data-classification)
6. [Storage Security](#storage-security)
7. [Data Retention](#data-retention)
8. [Privacy Compliance](#privacy-compliance)
9. [User Rights](#user-rights)

---

## Encryption Architecture

### Encryption Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Application Layer                                           │
│ • Plaintext messages in memory                              │
│ • User input/output                                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ NIP-44 v2 Encryption (DMs)                                  │
│ • XChaCha20-Poly1305 AEAD                                   │
│ • ECDH shared secrets                                       │
│ • Message padding                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ NIP-59 Gift Wrapping (DMs)                                  │
│ • Sender anonymity                                          │
│ • Timestamp randomization                                   │
│ • Ephemeral keys                                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Transport Layer (TLS 1.3)                                   │
│ • WebSocket Secure (WSS)                                    │
│ • HTTPS for web assets                                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Storage Layer                                               │
│ • Encrypted blobs in database                               │
│ • AES-256-GCM for key storage                               │
└─────────────────────────────────────────────────────────────┘
```

### Message Types

| Type | Encryption | Relay Can Read | Use Case |
|------|-----------|----------------|----------|
| **Public Channel** | None | Yes | Community discussions |
| **Private Channel** | NIP-44 | No | Group conversations |
| **Direct Message** | NIP-44 + NIP-59 | No | 1-on-1 messaging |
| **Metadata** | None | Yes | Profiles, reactions |

---

## NIP-44 v2 Encryption

### Algorithm: XChaCha20-Poly1305

**Properties:**
- **Cipher**: XChaCha20 stream cipher (256-bit key, 192-bit nonce)
- **MAC**: Poly1305 (128-bit authentication tag)
- **Mode**: AEAD (Authenticated Encryption with Associated Data)
- **Key Derivation**: ECDH + HKDF-SHA256

### Encryption Process

```typescript
// src/lib/nostr/encryption.ts
import { nip44 } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';

async function encryptChannelMessage(
  content: string,
  channelId: string,
  senderPrivkey: string,
  memberPubkeys: string[]
): Promise<Event> {
  const encryptedPayloads: { [pubkey: string]: string } = {};

  // Encrypt for each member
  for (const memberPubkey of memberPubkeys) {
    // 1. Derive conversation key via ECDH
    const conversationKey = nip44.v2.utils.getConversationKey(
      hexToBytes(senderPrivkey),
      memberPubkey
    );

    // 2. Encrypt content with NIP-44 v2
    const encrypted = nip44.v2.encrypt(content, conversationKey);
    encryptedPayloads[memberPubkey] = encrypted;
  }

  // 3. Create signed event
  const event = {
    kind: 9, // Encrypted channel message
    pubkey: getPublicKey(hexToBytes(senderPrivkey)),
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['h', channelId],
      ['encrypted', 'nip44'],
      ...memberPubkeys.map(pk => ['p', pk])
    ],
    content: JSON.stringify(encryptedPayloads)
  };

  return finalizeEvent(event, hexToBytes(senderPrivkey));
}
```

### Decryption Process

```typescript
function decryptChannelMessage(
  event: Event,
  recipientPrivkey: string
): { content: string; senderPubkey: string } | null {
  // 1. Verify event is encrypted
  const hasEncryptedTag = event.tags.some(
    tag => tag[0] === 'encrypted' && tag[1] === 'nip44'
  );
  if (!hasEncryptedTag) {
    throw new Error('Event not marked as NIP-44 encrypted');
  }

  // 2. Get recipient's public key
  const recipientPubkey = getPublicKey(hexToBytes(recipientPrivkey));

  // 3. Parse encrypted payloads
  const payloads = JSON.parse(event.content);
  const myPayload = payloads[recipientPubkey];

  if (!myPayload) {
    return null; // Not a recipient
  }

  // 4. Derive conversation key
  const conversationKey = nip44.v2.utils.getConversationKey(
    hexToBytes(recipientPrivkey),
    event.pubkey
  );

  // 5. Decrypt
  try {
    const decryptedContent = nip44.v2.decrypt(myPayload, conversationKey);

    return {
      content: decryptedContent,
      senderPubkey: event.pubkey
    };
  } catch {
    return null; // Decryption failed
  }
}
```

### NIP-44 v2 Format

```
version (1 byte) || nonce (32 bytes) || ciphertext || mac (16 bytes)
```

**Fields:**
- `version`: 0x02 (NIP-44 v2)
- `nonce`: Random 32-byte nonce
- `ciphertext`: Padded plaintext encrypted with XChaCha20
- `mac`: Poly1305 authentication tag

### Message Padding

NIP-44 v2 implements padding to hide message length:

```typescript
function calculatePadding(plaintextLength: number): number {
  if (plaintextLength <= 32) return 32;
  if (plaintextLength <= 64) return 64;
  if (plaintextLength <= 128) return 128;
  if (plaintextLength <= 256) return 256;
  if (plaintextLength <= 512) return 512;

  // For larger messages: round up to next 1KB
  return Math.ceil(plaintextLength / 1024) * 1024;
}
```

---

## NIP-59 Gift Wrapping

### Purpose

NIP-59 provides **sender anonymity** and **metadata protection** for direct messages.

### Wrapping Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Gift Wrap (kind 1059)                                       │
│ • pubkey: Random ephemeral key                              │
│ • created_at: Random timestamp (±2 days)                    │
│ • content: Encrypted seal                                   │
│ • tags: [['p', recipient]]                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ Encrypted with ephemeral key
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Seal (kind 13)                                              │
│ • pubkey: Real sender                                       │
│ • created_at: Random timestamp                              │
│ • content: JSON.stringify(rumor)                            │
│ • sig: Schnorr signature                                    │
└───────────────────────┬─────────────────────────────────────┘
                        │ Contains rumor
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ Rumor (kind 14, unsigned)                                   │
│ • kind: 14 (DM)                                             │
│ • content: NIP-44 encrypted message                         │
│ • created_at: Actual timestamp                              │
│ • tags: [['p', recipient]]                                  │
└─────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// Wrap a DM for sending
async function wrapDM(
  plaintext: string,
  senderPrivkey: string,
  recipientPubkey: string
): Promise<Event> {
  // 1. Create rumor (unsigned event with actual content)
  const rumor = {
    kind: 14,
    content: await nip44.v2.encrypt(
      plaintext,
      nip44.v2.utils.getConversationKey(
        hexToBytes(senderPrivkey),
        recipientPubkey
      )
    ),
    created_at: Math.floor(Date.now() / 1000),
    tags: [['p', recipientPubkey]]
  };

  // 2. Create seal (signed wrapper)
  const seal = {
    kind: 13,
    content: JSON.stringify(rumor),
    created_at: randomTimestamp(), // ±2 days
    tags: []
  };
  const signedSeal = finalizeEvent(seal, hexToBytes(senderPrivkey));

  // 3. Create gift wrap with ephemeral key
  const ephemeralKey = generatePrivateKey();
  const giftWrap = {
    kind: 1059,
    pubkey: getPublicKey(hexToBytes(ephemeralKey)),
    created_at: randomTimestamp(), // ±2 days
    tags: [['p', recipientPubkey]],
    content: await nip44.v2.encrypt(
      JSON.stringify(signedSeal),
      nip44.v2.utils.getConversationKey(
        hexToBytes(ephemeralKey),
        recipientPubkey
      )
    )
  };

  return finalizeEvent(giftWrap, hexToBytes(ephemeralKey));
}

function randomTimestamp(): number {
  const now = Math.floor(Date.now() / 1000);
  const twoDays = 2 * 24 * 60 * 60;
  return now + Math.floor(Math.random() * twoDays * 2) - twoDays;
}
```

### Unwrapping

```typescript
async function unwrapDM(
  giftWrap: Event,
  recipientPrivkey: string
): Promise<{ content: string; sender: string; timestamp: number }> {
  // 1. Decrypt seal
  const sealJSON = await nip44.v2.decrypt(
    giftWrap.content,
    nip44.v2.utils.getConversationKey(
      hexToBytes(recipientPrivkey),
      giftWrap.pubkey // Ephemeral key
    )
  );

  const seal = JSON.parse(sealJSON);

  // 2. Verify seal signature
  if (!verifyEvent(seal)) {
    throw new Error('Invalid seal signature');
  }

  // 3. Extract rumor
  const rumor = JSON.parse(seal.content);

  // 4. Decrypt message content
  const content = await nip44.v2.decrypt(
    rumor.content,
    nip44.v2.utils.getConversationKey(
      hexToBytes(recipientPrivkey),
      seal.pubkey // Real sender
    )
  );

  return {
    content,
    sender: seal.pubkey,
    timestamp: rumor.created_at
  };
}
```

---

## Key Storage Encryption

### AES-256-GCM with PBKDF2

Private keys are encrypted before localStorage storage using Web Crypto API:

```typescript
// src/lib/utils/key-encryption.ts
const PBKDF2_ITERATIONS = 600000; // OWASP 2023 recommendation
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

async function encryptPrivateKey(
  privateKey: string,
  password: string
): Promise<string> {
  // 1. Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // 2. Derive encryption key
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // 3. Encrypt private key
  const plaintext = encoder.encode(privateKey);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext
  );

  // 4. Combine: salt + iv + ciphertext
  const combined = new Uint8Array(
    salt.length + iv.length + ciphertext.byteLength
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  // 5. Base64 encode for storage
  return btoa(String.fromCharCode(...combined));
}
```

### Decryption

```typescript
async function decryptPrivateKey(
  encryptedData: string,
  password: string
): Promise<string> {
  const decoder = new TextDecoder();

  // 1. Decode from base64
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(c => c.charCodeAt(0))
  );

  // 2. Extract components
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  // 3. Derive decryption key
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // 4. Decrypt
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return decoder.decode(plaintext);
  } catch {
    throw new Error('Invalid password or corrupted data');
  }
}
```

### Secure Memory Utilities

```typescript
// src/lib/security/secureMemory.ts
export class SecureString {
  private buffer: Uint8Array;
  private cleared = false;

  constructor(value: string) {
    const encoder = new TextEncoder();
    this.buffer = encoder.encode(value);
    Object.freeze(this);
  }

  use<T>(fn: (value: string) => T): T {
    if (this.cleared) {
      throw new Error('SecureString already cleared');
    }

    const decoder = new TextDecoder();
    const value = decoder.decode(this.buffer);

    try {
      return fn(value);
    } finally {
      // Force async boundary to help GC
      setTimeout(() => {}, 0);
    }
  }

  clear(): void {
    if (this.cleared) return;

    // Overwrite with random data before clearing
    crypto.getRandomValues(this.buffer);
    this.buffer = new Uint8Array(0);
    this.cleared = true;
  }
}
```

---

## Data Classification

### Sensitivity Levels

| Level | Data Types | Storage | Encryption |
|-------|-----------|---------|-----------|
| **Critical** | Private keys, mnemonics | sessionStorage (temp) | AES-256-GCM |
| **High** | DM content, passwords | localStorage (encrypted) | NIP-44 + NIP-59 |
| **Medium** | Channel messages, profiles | Relay database | NIP-44 (private channels) |
| **Low** | Public posts, reactions | Relay database | None |
| **Public** | Profile metadata, channels | Relay database | None |

### Data Handling Rules

1. **Critical Data**
   - Never log or transmit unencrypted
   - Clear from memory after use
   - Session-bound storage only

2. **High Sensitivity**
   - Encrypt before storage
   - TLS required for transmission
   - User consent for retention

3. **Medium/Low**
   - Standard security practices
   - Relay may access
   - User controls deletion

---

## Storage Security

### Browser Storage

| Storage | Lifetime | Security | Use Case |
|---------|----------|----------|----------|
| **sessionStorage** | Tab session | High (origin-bound) | Session keys, temp data |
| **localStorage** | Persistent | Medium (origin-bound) | Encrypted keys, preferences |
| **IndexedDB** | Persistent | Medium | Message cache, profiles |
| **Cookies** | Configured | Medium | Session tokens (not used) |

### Storage Isolation

```typescript
// Each storage namespace is origin-bound
const STORAGE_KEYS = {
  auth: 'nostr_bbs_keys',
  session: 'nostr_bbs_session',
  pwaAuth: 'nostr_bbs_pwa_auth',
  rateLimit: 'nostr_bbs_rate_limits',
  suspicious: 'nostr_bbs_suspicious_activity'
};
```

### Data Cleanup

```typescript
// On logout
async function logout(): Promise<void> {
  // 1. Clear all storage
  localStorage.removeItem(STORAGE_KEYS.auth);
  localStorage.removeItem(STORAGE_KEYS.pwaAuth);
  sessionStorage.clear();

  // 2. Clear IndexedDB
  const dbs = await indexedDB.databases();
  for (const db of dbs) {
    indexedDB.deleteDatabase(db.name);
  }

  // 3. Clear service worker cache
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }

  // 4. Clear memory
  authStore.reset();
}
```

---

## Data Retention

### Retention Policies

| Data Type | Default Retention | User Control | Justification |
|-----------|------------------|--------------|---------------|
| **Private Keys** | Session | Full | User owns keys |
| **Encrypted DMs** | Indefinite | Can delete | User data ownership |
| **Channel Messages** | Indefinite | Can delete | Community content |
| **Profiles** | Indefinite | Can update | Public metadata |
| **Activity Logs** | 30 days | None | Security monitoring |

### User Data Deletion

```typescript
// Delete user's messages
async function deleteUserMessages(pubkey: string): Promise<void> {
  // 1. Create deletion events (NIP-09)
  const messagesToDelete = await fetchUserMessages(pubkey);

  for (const msg of messagesToDelete) {
    const deleteEvent = {
      kind: 5, // Deletion event
      tags: [['e', msg.id]],
      content: 'User requested deletion',
      created_at: Math.floor(Date.now() / 1000)
    };

    await publishEvent(deleteEvent);
  }

  // 2. Clear local cache
  await clearLocalCache(pubkey);
}
```

---

## Privacy Compliance

### GDPR Compliance

**Data Subject Rights:**
- ✅ Right to access (export Nostr events)
- ✅ Right to rectification (update profile)
- ✅ Right to erasure (delete events)
- ✅ Right to portability (Nostr protocol inherently portable)
- ✅ Right to object (can leave platform)

**Implementation:**
```typescript
// Export user data (GDPR Article 20)
async function exportUserData(pubkey: string): Promise<string> {
  const events = await fetchAllUserEvents(pubkey);

  return JSON.stringify({
    pubkey,
    exportDate: new Date().toISOString(),
    events: events.map(e => ({
      id: e.id,
      kind: e.kind,
      content: e.content,
      tags: e.tags,
      created_at: e.created_at,
      sig: e.sig
    }))
  }, null, 2);
}
```

### CCPA Compliance

**California Consumer Privacy Act:**
- ✅ Right to know (data disclosure)
- ✅ Right to delete
- ✅ Right to opt-out (of data sales - N/A, no data sales)

### Data Processing

```typescript
interface PrivacyPolicy {
  dataController: 'User (self-custodial keys)';
  dataProcessor: 'Relay operators';
  legalBasis: 'User consent + legitimate interest';
  dataRetention: 'User-controlled';
  thirdPartySharing: 'None (relay operators only)';
  internationalTransfers: 'Nostr is global, relay-dependent';
}
```

---

## User Rights

### Data Access

Users can request their data at any time:

```bash
# Via Nostr protocol
nostr-cli fetch --author <pubkey> --kinds 1,3,4,5,6,7,9,10,14

# Or via relay API
curl https://relay.example.com/api/user-data?pubkey=<hex>
```

### Data Deletion

Users can delete specific events:

```typescript
// NIP-09 deletion request
const deleteEvent = {
  kind: 5,
  tags: [
    ['e', '<event-id-to-delete>'],
    ['k', '<kind-of-deleted-event>']
  ],
  content: 'Requested by user'
};
```

**Note**: Deletion requests are honored by compliant relays, but Nostr is a distributed protocol - events may persist on non-compliant relays.

### Data Portability

Users own their data via Nostr protocol:

- Events are cryptographically signed by user
- Can export and import to any Nostr-compatible app
- Keys are portable across platforms

---

## Related Documentation

- [Security Overview](./SECURITY_OVERVIEW.md)
- [Authentication](./AUTHENTICATION.md)
- [Encryption Implementation](../../community-forum/src/lib/nostr/encryption.ts)
- [Secure Memory](../../community-forum/src/lib/security/secureMemory.ts)

---

**Privacy Contact**: privacy@fairfield.community (not yet configured)

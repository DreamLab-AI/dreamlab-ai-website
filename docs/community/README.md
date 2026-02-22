# Community Forum Documentation

## Overview

This directory contains documentation specific to the community forum subsystem.

## Quick Links

- [UI Components](./UI_COMPONENTS.md) - Toast notification system, architecture, API, and usage
- [Forum Architecture](./ARCHITECTURE.md) - System design and data flow

Based on a comprehensive review of the provided codebase, here is a deep architectural and functional analysis of the User Onboarding, Identity, and User Management systems in the Nostr-BBS platform.

This system is highly sophisticated, combining the **decentralized cryptography of Nostr**, the **hardware security of WebAuthn (Passkeys)**, and a **strict, cohort-based Role-Based Access Control (RBAC)** enforced at the relay level.

---

### 1. Core Identity Model
The platform fundamentally rejects traditional username/password or centralized identity (like OAuth/JWT). Instead, identity is purely cryptographic.

*   **Primary Identity:** A secp256k1 keypair (Nostr public/private keys). The public key (hex or `npub`) serves as the permanent user ID.
*   **WebAuthn PRF Innovation:** The most striking feature is how keys are managed. Instead of forcing users to memorize a 12-word seed phrase, the app uses the **WebAuthn PRF (Pseudo-Random Function) extension** (`src/lib/auth/passkey.ts`).
    *   When a user registers a Passkey (FaceID, TouchID, YubiKey), the hardware authenticator deterministically generates a salt.
    *   The app derives the Nostr private key directly from this hardware-backed PRF output using HKDF-SHA-256.
    *   **Result:** Hardware-backed biometric login that generates a portable Nostr key, without the server ever seeing the private key.
*   **DID:NOSTR & Solid Integration:** The backend (`services/auth-api/src/jss-client.ts`) takes the Nostr pubkey and automatically provisions a W3C Solid Pod via the Community Solid Server (CSS), linking the Nostr identity to a `did:nostr` decentralized identifier.

---

### 2. The User Onboarding Flow (Signup)
The onboarding flow is carefully orchestrated through a Finite State Machine (`authMachine.ts`) and is designed to handle the "Catch-22" of private relays (you must be whitelisted to post, but you must post to ask for whitelisting).

**The Journey (`AuthFlow.svelte`):**
1.  **Gateway:** Users choose between "Quick Start" (local key generation) or "Secure Setup" (Passkey/WebAuthn).
2.  **Key Generation:** Keys are derived locally or via PRF.
3.  **Backup Enforcement:** If using a local key, the user is *forced* to acknowledge and download their `nsec` before proceeding (`NsecBackup.svelte`).
4.  **Profile Creation:** The user sets a nickname (`NicknameSetup.svelte`). The app publishes a Kind 0 (Metadata) event.
5.  **The Relay Handshake (`profile-sync.ts`):** Because this is a distributed system, the app uses an exponential backoff polling mechanism to verify the relay has actually indexed the Kind 0 profile *before* proceeding.
6.  **Registration Request:** Once the profile is indexed, the client fires a **Kind 9024 (User Registration)** event.
7.  **Pending State:** The user is placed in a "Waiting Room" (`PendingApproval.svelte`), which auto-polls the relay's API until an admin approves them.

*Note: The relay explicitly exempts Kind 0 and Kind 9024 events from the whitelist check (`handlers.ts`), solving the private-relay bootstrapping problem.*

---

### 3. Authentication & Session Management (Login)
*   **Login Methods:** Users can authenticate via Passkey (re-deriving the key via PRF), NIP-07 browser extensions (Alby, nos2x), or manual private key entry.
*   **NIP-98 API Authentication:** To actually log into the backend API (e.g., to fetch whitelist status or upload images), the client does not get a session cookie. Instead, it uses **NIP-98 HTTP Auth** (`nip98-client.ts`). The client signs a short-lived event specifying the URL and HTTP method being accessed. The server verifies this signature.
*   **In-Memory Key Security:** If a user logs in via Passkey, the private key is **never written to `localStorage`**. It is held in a volatile memory variable (`_privkeyMem` in `auth.ts`) and zero-filled upon logout or when the `pagehide` event fires.
*   **Session Timeout:** A background worker monitors activity. After 30 minutes of inactivity, it prompts a warning, then forcibly wipes the in-memory keys (`session.ts`), unless the app is installed as a PWA (where timeouts are disabled for a native feel).

---

### 4. User Management & Access Control (Admin)
The platform uses a "Zone and Cohort" architecture (`config/sections.yaml`), managed by administrators.

**The Whitelist System:**
*   The system is closed. By default, the relay rejects all events (except registration requests) from unknown pubkeys.
*   The PostgreSQL database holds a `whitelist` table mapping `pubkey` -> `[cohorts]`.

**Cohorts & Zones:**
*   Users are assigned to **Cohorts** (e.g., `family`, `minimoonoir`, `business`, `trainees`).
*   The UI and the Relay are divided into **Zones/Categories** (Tier 1) and **Sections** (Tier 2).
*   *Strict Isolation:* If a user does not possess the required cohort for a zone, the UI obfuscates the zone name using a "cypherpunk" ASCII scrambling animation (`ZoneNav.svelte`) and completely prevents routing.
*   The backend ensures that users cannot fetch channels or read messages for cohorts they do not belong to (`channels.ts` -> `canAccessChannel()`).

**The Admin Dashboard:**
*   Admins use `PendingUserApproval.svelte` to view Kind 9024 requests.
*   When an admin approves a user, they assign them cohorts.
*   The system then:
    1. Updates the PostgreSQL whitelist.
    2. Emits a Kind 5 (Deletion) event to remove the pending request from the queue.
    3. Emits a Kind 9023 (Approval) event.
    4. Automatically sends a **NIP-59 Gift-Wrapped Encrypted DM** to the user welcoming them to the platform.

---

### 5. Standout Engineering & Security Features
1.  **Removal of NIP-04:** The codebase explicitly shows the removal of the deprecated NIP-04 encryption standard (notorious for metadata leakage and IV reuse). It forces NIP-44 (v2) and NIP-59 (Gift Wrapping) for all private communications.
2.  **Web Worker Cryptography:** ECDH key derivation and AES-256-GCM encryption are computationally heavy. The app offloads NIP-44 encryption/decryption to a Web Worker (`crypto.worker.ts`) to prevent the UI thread from freezing when rendering channels with hundreds of encrypted messages.
3.  **Encrypted Image Payloads:** The `imageUpload.ts` and `encryptedImageTags.ts` files demonstrate a highly secure approach to media. Images in private channels are AES-encrypted locally in the browser. The AES key is then encrypted via NIP-44 *multiple times*, once for each member of the cohort, and attached as tags to the message event. The server only ever sees opaque, encrypted blobs.
4.  **Graceful Degradation for Search:** It uses an external PostgreSQL vector database (`RuVector`) for semantic search, but maintains an IndexedDB cache fallback. If the user goes offline, search falls back to a local brute-force cosine similarity check against cached embeddings.

### 6. Potential Vulnerabilities / Areas for Improvement
While the architecture is incredibly robust, a few areas require careful monitoring:
*   **Passkey Lockout Risk:** If a user registers via Passkey and loses that specific device/authenticator, and they *didn't* write down the raw private key, they are permanently locked out. The PRF output is specific to that credential on that device. The UI warns about this, but user error is likely.
*   **Cohort Tagging Trust:** In `channels.ts`, it appears that channel visibility is determined by a `['cohort', 'business']` tag on the Kind 39000 metadata event. If any whitelisted user can create a channel (Kind 40) and attach whatever cohort tag they want, they might be able to spam or pollute restricted cohorts unless channel creation is strictly gated by the relay.
*   **Scale of Encrypted Images:** When uploading an encrypted image to a channel with 5,000 members, the client has to perform 5,000 ECDH operations to encrypt the AES key for every single recipient (`encryptKeyForRecipients` in `imageEncryption.ts`). Even with the `await new Promise(r => setTimeout(r, 0))` yielding mechanism in place, this will severely bottleneck the client device on large channels.
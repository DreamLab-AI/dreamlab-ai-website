# Community Forum Documentation

## Overview

This directory contains documentation specific to the DreamLab AI community forum -- a SvelteKit application providing channels, direct messages, calendar events, and user profiles, built on the Nostr protocol with passkey-first authentication.

For the full architectural overview, see [features/community-forum.md](../features/community-forum.md).

## Quick Links

- [UI Components](./UI_COMPONENTS.md) -- toast notification system, architecture, API, and usage
- [Forum Architecture](./ARCHITECTURE.md) -- system design and data flow

## Key Features

- **Passkey authentication** -- WebAuthn PRF extension derives secp256k1 keys from biometric auth
- **NIP-98 HTTP auth** -- Schnorr-signed requests for all state-mutating API calls
- **Zone/cohort access control** -- three-tier hierarchy with whitelist-based membership
- **Encrypted messaging** -- NIP-44 encryption with NIP-59 gift wrapping for DMs
- **Calendar events** -- NIP-52 event scheduling with RSVPs
- **Admin workflows** -- registration approval, cohort assignment, moderation

## Architecture Highlights

### Identity Model
Identity is purely cryptographic -- no username/password or centralised OAuth. The primary identity is a secp256k1 keypair (Nostr public/private keys). The public key serves as the permanent user ID, extended to `did:nostr:{pubkey}` for DID interop and a WebID at the user's Solid pod.

### Authentication Methods
1. **Passkey (primary)** -- hardware-backed biometric login via WebAuthn PRF, private key derived via HKDF-SHA-256 and held only in memory
2. **NIP-07 extension** -- Alby, nos2x, or another Nostr signer extension
3. **Local key (advanced)** -- direct nsec or hex private key entry

### Onboarding Flow
Users register, set a nickname, optionally back up their nsec, then wait for admin approval before gaining full access. The relay exempts kind:0 (metadata) and kind:9024 (registration request) events from the whitelist, solving the private-relay bootstrapping problem.

### Security
- NIP-04 deprecated; NIP-44 (v2) + NIP-59 (gift wrapping) for all private communications
- Web Worker offloads NIP-44 encryption to prevent UI thread blocking
- Encrypted image payloads: AES-encrypted locally, key wrapped per-recipient via NIP-44

## Related Documentation

- [Authentication System](../features/authentication.md) -- WebAuthn PRF and login flows
- [NIP-98 Auth](../features/nip98-auth.md) -- shared NIP-98 module
- [Bounded Contexts](../ddd/02-bounded-contexts.md) -- DDD context map

## Last Updated

February 28, 2026
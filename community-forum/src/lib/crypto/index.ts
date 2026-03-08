/**
 * Crypto abstraction layer -- WASM first, JS fallback.
 *
 * Every function attempts the Rust WASM implementation from
 * @dreamlab/nostr-core-wasm. If WASM is disabled or fails,
 * it falls back to the existing JS crypto (noble/hashes,
 * noble/curves, nostr-tools).
 *
 * Callers should not need to know which backend is active.
 */

import { getWasmModule } from '$lib/wasm/init';

// -- JS fallback imports (existing codebase) ---------------------

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { secp256k1 } from '@noble/curves/secp256k1';
import { getPublicKey } from 'nostr-tools';
import { createNip98Token as createNip98TokenJS } from '../../../packages/nip98/sign.js';

// ----------------------------------------------------------------
// 1. Key derivation from WebAuthn PRF output
// ----------------------------------------------------------------

export interface DerivedKeypair {
	secretKey: Uint8Array;   // 32-byte secp256k1 private key
	publicKey: string;       // hex-encoded x-only public key
}

/**
 * Derive a secp256k1 keypair from a WebAuthn PRF output using HKDF-SHA-256.
 *
 * WASM path: single call to `derive_keypair_from_prf` (Rust HKDF + secp256k1).
 * JS path: Web Crypto HKDF + noble/curves validation (existing passkey.ts logic).
 */
export async function deriveKeypairFromPrf(prfOutput: Uint8Array): Promise<DerivedKeypair> {
	const wasm = await getWasmModule();
	if (wasm) {
		try {
			const result = wasm.derive_keypair_from_prf(prfOutput);
			return { secretKey: result.secretKey, publicKey: result.publicKey };
		} catch (err) {
			console.warn('[crypto] WASM derive_keypair_from_prf failed, falling back to JS:', err);
		}
	}

	// JS fallback: replicate the HKDF logic from passkey.ts
	const privkey = await derivePrivkeyFromPrfJS(prfOutput.buffer as ArrayBuffer);
	const pubkey = getPublicKey(privkey);
	return { secretKey: privkey, publicKey: pubkey };
}

/**
 * JS fallback for PRF key derivation (copied from passkey.ts to avoid circular deps).
 * Uses Web Crypto HKDF-SHA-256 with empty salt and info "nostr-secp256k1-v1".
 */
async function derivePrivkeyFromPrfJS(prfOutput: ArrayBuffer): Promise<Uint8Array> {
	const keyMaterial = await crypto.subtle.importKey(
		'raw', prfOutput, 'HKDF', false, ['deriveBits'],
	);
	const privkeyBits = await crypto.subtle.deriveBits(
		{
			name: 'HKDF',
			hash: 'SHA-256',
			salt: new Uint8Array(0),
			info: new TextEncoder().encode('nostr-secp256k1-v1'),
		},
		keyMaterial,
		256,
	);
	const key = new Uint8Array(privkeyBits);
	if (!secp256k1.utils.isValidPrivateKey(key)) {
		return derivePrivkeyFromPrfJS(await crypto.subtle.digest('SHA-256', key));
	}
	return key;
}

// ----------------------------------------------------------------
// 2. NIP-98 token creation
// ----------------------------------------------------------------

/**
 * Create a NIP-98 authorization token for an HTTP request.
 *
 * WASM path: `create_nip98_token` (Rust Schnorr signing + event serialization).
 * JS path: existing `packages/nip98/sign.ts` (nostr-tools finalizeEvent).
 */
export async function createNip98Token(
	sk: Uint8Array,
	url: string,
	method: string,
	body?: Uint8Array | ArrayBuffer,
): Promise<string> {
	const wasm = await getWasmModule();
	if (wasm) {
		try {
			// WASM expects Uint8Array | null for body
			const bodyBytes = body
				? (body instanceof ArrayBuffer ? new Uint8Array(body) : body)
				: undefined;
			return wasm.create_nip98_token(sk, url, method, bodyBytes ?? null);
		} catch (err) {
			console.warn('[crypto] WASM create_nip98_token failed, falling back to JS:', err);
		}
	}

	// JS fallback
	return createNip98TokenJS(sk, url, method, body);
}

// ----------------------------------------------------------------
// 3. NIP-44 encryption / decryption
// ----------------------------------------------------------------

/**
 * Encrypt plaintext using NIP-44 v2 (sender -> recipient).
 *
 * WASM path: `nip44_encrypt` (Rust ChaCha20-Poly1305 + ECDH).
 * JS path: nostr-tools nip44.v2.encrypt via conversation key.
 */
export async function nip44Encrypt(
	senderSk: Uint8Array,
	recipientPk: Uint8Array,
	plaintext: string,
): Promise<string> {
	const wasm = await getWasmModule();
	if (wasm) {
		try {
			return wasm.nip44_encrypt(senderSk, recipientPk, plaintext);
		} catch (err) {
			console.warn('[crypto] WASM nip44_encrypt failed, falling back to JS:', err);
		}
	}

	// JS fallback via nostr-tools
	const { nip44 } = await import('nostr-tools');
	const recipientPkHex = bytesToHex(recipientPk);
	const conversationKey = nip44.v2.utils.getConversationKey(senderSk, recipientPkHex);
	return nip44.v2.encrypt(plaintext, conversationKey);
}

/**
 * Decrypt NIP-44 v2 ciphertext (recipient decrypts from sender).
 *
 * WASM path: `nip44_decrypt` (Rust ChaCha20-Poly1305 + ECDH).
 * JS path: nostr-tools nip44.v2.decrypt via conversation key.
 */
export async function nip44Decrypt(
	recipientSk: Uint8Array,
	senderPk: Uint8Array,
	ciphertext: string,
): Promise<string> {
	const wasm = await getWasmModule();
	if (wasm) {
		try {
			return wasm.nip44_decrypt(recipientSk, senderPk, ciphertext);
		} catch (err) {
			console.warn('[crypto] WASM nip44_decrypt failed, falling back to JS:', err);
		}
	}

	// JS fallback via nostr-tools
	const { nip44 } = await import('nostr-tools');
	const senderPkHex = bytesToHex(senderPk);
	const conversationKey = nip44.v2.utils.getConversationKey(recipientSk, senderPkHex);
	return nip44.v2.decrypt(ciphertext, conversationKey);
}

// ----------------------------------------------------------------
// 4. Event ID computation (NIP-01)
// ----------------------------------------------------------------

/**
 * Compute NIP-01 event ID: SHA-256 of the canonical JSON serialization.
 *
 * WASM path: `compute_event_id` (Rust serde_json + sha2).
 * JS path: JSON.stringify + noble/hashes sha256.
 */
export async function computeEventId(
	pubkey: string,
	createdAt: number,
	kind: number,
	tags: string[][],
	content: string,
): Promise<string> {
	const wasm = await getWasmModule();
	if (wasm) {
		try {
			const tagsJson = JSON.stringify(tags);
			return wasm.compute_event_id(pubkey, createdAt, kind, tagsJson, content);
		} catch (err) {
			console.warn('[crypto] WASM compute_event_id failed, falling back to JS:', err);
		}
	}

	// JS fallback
	const serialized = JSON.stringify([0, pubkey, createdAt, kind, tags, content]);
	const hash = sha256(new TextEncoder().encode(serialized));
	return bytesToHex(hash);
}

// ----------------------------------------------------------------
// 5. Schnorr signing (BIP-340)
// ----------------------------------------------------------------

/**
 * Sign a 32-byte message hash with BIP-340 Schnorr.
 *
 * WASM path: `schnorr_sign` (Rust k256 Schnorr).
 * JS path: noble/curves secp256k1 schnorr.sign.
 */
export async function schnorrSign(
	sk: Uint8Array,
	message: Uint8Array,
): Promise<Uint8Array> {
	const wasm = await getWasmModule();
	if (wasm) {
		try {
			return wasm.schnorr_sign(sk, message);
		} catch (err) {
			console.warn('[crypto] WASM schnorr_sign failed, falling back to JS:', err);
		}
	}

	// JS fallback
	const { schnorr } = await import('@noble/curves/secp256k1');
	const sig = schnorr.sign(message, sk);
	return sig instanceof Uint8Array ? sig : new Uint8Array(sig);
}

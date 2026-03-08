/**
 * WASM module loader for @dreamlab/nostr-core-wasm.
 *
 * Lazy singleton pattern: the WASM binary is loaded once on first call
 * and cached for the lifetime of the page. Controlled by the
 * VITE_USE_WASM_CRYPTO env flag -- when not 'true', returns null
 * immediately so callers fall back to the JS implementations.
 */

import { browser } from '$app/environment';

export interface WasmModule {
	compute_event_id(
		pubkey: string,
		created_at: number,
		kind: number,
		tags_json: string,
		content: string,
	): string;

	create_nip98_token(
		secret_key: Uint8Array,
		url: string,
		method: string,
		body?: Uint8Array | null,
	): string;

	derive_keypair_from_prf(
		prf_output: Uint8Array,
	): { secretKey: Uint8Array; publicKey: string };

	nip44_decrypt(
		recipient_sk: Uint8Array,
		sender_pk: Uint8Array,
		ciphertext: string,
	): string;

	nip44_encrypt(
		sender_sk: Uint8Array,
		recipient_pk: Uint8Array,
		plaintext: string,
	): string;

	schnorr_sign(
		secret_key: Uint8Array,
		message: Uint8Array,
	): Uint8Array;

	verify_nip98_token(
		auth_header: string,
		url: string,
		method: string,
		body?: Uint8Array | null,
	): { pubkey: string; url: string; method: string; payloadHash?: string; createdAt: number };
}

let cached: WasmModule | null = null;
let loadAttempted = false;

/**
 * Returns the initialized WASM module, or null if WASM crypto is disabled,
 * unavailable, or failed to load. Safe to call repeatedly -- the module is
 * loaded at most once.
 */
export async function getWasmModule(): Promise<WasmModule | null> {
	// WASM only works in the browser
	if (!browser) return null;

	// Feature flag gate
	const enabled = import.meta.env.VITE_USE_WASM_CRYPTO;
	if (enabled !== 'true') return null;

	// Return cached result (including null from a previous failed attempt)
	if (loadAttempted) return cached;
	loadAttempted = true;

	try {
		const mod = await import('@dreamlab/nostr-core-wasm');
		cached = mod as unknown as WasmModule;
		return cached;
	} catch (err) {
		console.warn('[wasm] Failed to load @dreamlab/nostr-core-wasm, falling back to JS:', err);
		cached = null;
		return null;
	}
}

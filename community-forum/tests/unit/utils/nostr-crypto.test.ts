import { describe, it, expect } from 'vitest';
import { getPublicKey, getEventHash, signEvent, verifySignature } from '$lib/utils/nostr-crypto';

describe('nostr-crypto', () => {
	// Known test private key (32 bytes hex = 64 chars)
	const testPrivkey = '0000000000000000000000000000000000000000000000000000000000000001';

	describe('getPublicKey', () => {
		it('derives public key from private key', () => {
			const pubkey = getPublicKey(testPrivkey);
			expect(pubkey).toBeDefined();
			expect(pubkey).toHaveLength(64);
			// All hex characters
			expect(pubkey).toMatch(/^[0-9a-f]{64}$/);
		});

		it('returns deterministic output for same input', () => {
			const pub1 = getPublicKey(testPrivkey);
			const pub2 = getPublicKey(testPrivkey);
			expect(pub1).toBe(pub2);
		});

		it('returns different pubkeys for different privkeys', () => {
			const privkey2 = '0000000000000000000000000000000000000000000000000000000000000002';
			const pub1 = getPublicKey(testPrivkey);
			const pub2 = getPublicKey(privkey2);
			expect(pub1).not.toBe(pub2);
		});

		it('returns x-only public key (32 bytes / 64 hex chars)', () => {
			const pubkey = getPublicKey(testPrivkey);
			// Nostr uses x-only pubkeys, 32 bytes
			expect(pubkey.length).toBe(64);
		});
	});

	describe('getEventHash', () => {
		it('computes hash for a well-formed event', () => {
			const pubkey = getPublicKey(testPrivkey);
			const event = {
				pubkey,
				created_at: 1234567890,
				kind: 1,
				tags: [],
				content: 'Hello Nostr'
			};

			const hash = getEventHash(event);
			expect(hash).toHaveLength(64);
			expect(hash).toMatch(/^[0-9a-f]{64}$/);
		});

		it('produces deterministic hashes', () => {
			const pubkey = getPublicKey(testPrivkey);
			const event = {
				pubkey,
				created_at: 1234567890,
				kind: 1,
				tags: [['t', 'test']],
				content: 'Test'
			};

			const hash1 = getEventHash(event);
			const hash2 = getEventHash(event);
			expect(hash1).toBe(hash2);
		});

		it('produces different hashes for different content', () => {
			const pubkey = getPublicKey(testPrivkey);
			const base = { pubkey, created_at: 1234567890, kind: 1, tags: [] as string[][] };

			const hash1 = getEventHash({ ...base, content: 'Hello' });
			const hash2 = getEventHash({ ...base, content: 'World' });
			expect(hash1).not.toBe(hash2);
		});

		it('produces different hashes for different timestamps', () => {
			const pubkey = getPublicKey(testPrivkey);
			const base = { pubkey, kind: 1, tags: [] as string[][], content: 'same' };

			const hash1 = getEventHash({ ...base, created_at: 1000 });
			const hash2 = getEventHash({ ...base, created_at: 2000 });
			expect(hash1).not.toBe(hash2);
		});

		it('includes tags in hash computation', () => {
			const pubkey = getPublicKey(testPrivkey);
			const base = { pubkey, created_at: 1234567890, kind: 1, content: 'same' };

			const hash1 = getEventHash({ ...base, tags: [] });
			const hash2 = getEventHash({ ...base, tags: [['t', 'tag1']] });
			expect(hash1).not.toBe(hash2);
		});
	});

	describe('signEvent and verifySignature', () => {
		it('signs and verifies an event correctly', () => {
			const pubkey = getPublicKey(testPrivkey);
			const event = {
				pubkey,
				created_at: Math.floor(Date.now() / 1000),
				kind: 1,
				tags: [],
				content: 'Test message'
			};

			const id = getEventHash(event);
			const signedEvent = { ...event, id };

			const sig = signEvent(signedEvent, testPrivkey);
			expect(sig).toHaveLength(128); // 64 bytes hex
			expect(sig).toMatch(/^[0-9a-f]{128}$/);

			const isValid = verifySignature({ id, pubkey, sig });
			expect(isValid).toBe(true);
		});

		it('rejects invalid signature', () => {
			const isValid = verifySignature({
				id: 'a'.repeat(64),
				pubkey: 'b'.repeat(64),
				sig: 'c'.repeat(128)
			});
			expect(isValid).toBe(false);
		});

		it('rejects tampered event id', () => {
			const pubkey = getPublicKey(testPrivkey);
			const event = {
				pubkey,
				created_at: 1234567890,
				kind: 1,
				tags: [],
				content: 'Original'
			};

			const id = getEventHash(event);
			const sig = signEvent({ ...event, id }, testPrivkey);

			// Tamper with the id
			const tamperedId = 'f'.repeat(64);
			expect(verifySignature({ id: tamperedId, pubkey, sig })).toBe(false);
		});

		it('handles malformed inputs gracefully', () => {
			expect(verifySignature({
				id: 'not-hex',
				pubkey: 'also-not-hex',
				sig: 'definitely-not-hex'
			})).toBe(false);
		});
	});
});

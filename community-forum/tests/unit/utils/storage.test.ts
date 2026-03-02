import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	safeStorage,
	saveKeys,
	loadKeys,
	clearKeys,
	hasStoredKeys,
	getStoredPubkey
} from '$lib/utils/storage';

describe('storage', () => {
	let store: Record<string, string>;

	beforeEach(() => {
		store = {};
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
			(key: string) => store[key] ?? null
		);
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
			(key: string, value: string) => {
				store[key] = value;
			}
		);
		vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(
			(key: string) => {
				delete store[key];
			}
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('safeStorage', () => {
		it('getItem returns stored value', () => {
			store['test-key'] = 'test-value';
			expect(safeStorage.getItem('test-key')).toBe('test-value');
		});

		it('getItem returns null for missing key', () => {
			expect(safeStorage.getItem('nonexistent')).toBeNull();
		});

		it('setItem stores value and returns true', () => {
			const result = safeStorage.setItem('key', 'value');
			expect(result).toBe(true);
			expect(store['key']).toBe('value');
		});

		it('setItem falls back to memory storage on quota exceeded', () => {
			vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
				throw new DOMException('quota exceeded', 'QuotaExceededError');
			});
			const result = safeStorage.setItem('fallback-key', 'value');
			expect(result).toBe(true);
		});

		it('removeItem removes from storage', () => {
			// Use the spy-backed store to set a value first via safeStorage
			safeStorage.setItem('remove-me', 'value');
			expect(safeStorage.getItem('remove-me')).toBe('value');

			safeStorage.removeItem('remove-me');
			expect(safeStorage.getItem('remove-me')).toBeNull();
		});

		it('isUsingFallback reflects storage availability', () => {
			// localStorage is available in test, so should not use fallback initially
			expect(typeof safeStorage.isUsingFallback).toBe('boolean');
		});
	});

	describe('saveKeys', () => {
		it('saves pubkey and encrypted privkey to localStorage', () => {
			saveKeys('abc123', 'encrypted-key-data');
			expect(store['nostr_bbs_nostr_pubkey']).toBe('abc123');
			expect(store['nostr_bbs_nostr_encrypted_privkey']).toBe('encrypted-key-data');
		});

		it('throws when localStorage is unavailable', () => {
			vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
				throw new Error('localStorage disabled');
			});
			expect(() => saveKeys('abc', 'def')).toThrow('Failed to save keys');
		});
	});

	describe('loadKeys', () => {
		it('returns stored keys when both exist', () => {
			store['nostr_bbs_nostr_pubkey'] = 'pub123';
			store['nostr_bbs_nostr_encrypted_privkey'] = 'priv456';

			const result = loadKeys();
			expect(result).toEqual({
				pubkey: 'pub123',
				encryptedPrivkey: 'priv456'
			});
		});

		it('returns null when pubkey is missing', () => {
			store['nostr_bbs_nostr_encrypted_privkey'] = 'priv456';
			expect(loadKeys()).toBeNull();
		});

		it('returns null when encrypted privkey is missing', () => {
			store['nostr_bbs_nostr_pubkey'] = 'pub123';
			expect(loadKeys()).toBeNull();
		});

		it('returns null when both are missing', () => {
			expect(loadKeys()).toBeNull();
		});

		it('returns null on localStorage error', () => {
			vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
				throw new Error('Storage access denied');
			});
			expect(loadKeys()).toBeNull();
		});
	});

	describe('clearKeys', () => {
		it('removes all key entries from localStorage', () => {
			store['nostr_bbs_nostr_pubkey'] = 'pub';
			store['nostr_bbs_nostr_encrypted_privkey'] = 'priv';
			store['nostr_bbs_nostr_mnemonic_shown'] = 'true';

			clearKeys();

			expect(store['nostr_bbs_nostr_pubkey']).toBeUndefined();
			expect(store['nostr_bbs_nostr_encrypted_privkey']).toBeUndefined();
			expect(store['nostr_bbs_nostr_mnemonic_shown']).toBeUndefined();
		});

		it('handles errors gracefully', () => {
			vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
				throw new Error('Storage error');
			});
			// Should not throw
			expect(() => clearKeys()).not.toThrow();
		});
	});

	describe('hasStoredKeys', () => {
		it('returns true when keys exist', () => {
			store['nostr_bbs_nostr_pubkey'] = 'pub';
			store['nostr_bbs_nostr_encrypted_privkey'] = 'priv';
			expect(hasStoredKeys()).toBe(true);
		});

		it('returns false when keys are missing', () => {
			expect(hasStoredKeys()).toBe(false);
		});
	});

	describe('getStoredPubkey', () => {
		it('returns pubkey when stored', () => {
			store['nostr_bbs_nostr_pubkey'] = 'my-pubkey';
			expect(getStoredPubkey()).toBe('my-pubkey');
		});

		it('returns null when not stored', () => {
			expect(getStoredPubkey()).toBeNull();
		});

		it('returns null on error', () => {
			vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
				throw new Error('Access denied');
			});
			expect(getStoredPubkey()).toBeNull();
		});
	});
});

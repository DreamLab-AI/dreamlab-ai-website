import { describe, it, expect } from 'vitest';
import {
	RELAY_URL,
	ADMIN_PUBKEY,
	APP_NAME,
	APP_VERSION,
	NDK_CONFIG,
	TIMEOUTS,
	validateConfig
} from '$lib/config/environment';

describe('environment', () => {
	describe('constants', () => {
		it('RELAY_URL has a default value', () => {
			expect(RELAY_URL).toBeDefined();
			expect(typeof RELAY_URL).toBe('string');
			expect(RELAY_URL.length).toBeGreaterThan(0);
		});

		it('RELAY_URL starts with ws:// or wss://', () => {
			expect(RELAY_URL).toMatch(/^wss?:\/\//);
		});

		it('ADMIN_PUBKEY is a string', () => {
			expect(typeof ADMIN_PUBKEY).toBe('string');
		});

		it('APP_NAME has a default value', () => {
			expect(APP_NAME).toBeDefined();
			expect(typeof APP_NAME).toBe('string');
		});

		it('APP_VERSION is defined', () => {
			expect(APP_VERSION).toBeDefined();
			expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
		});
	});

	describe('NDK_CONFIG', () => {
		it('has cache configuration', () => {
			expect(NDK_CONFIG.cache.enabled).toBe(true);
			expect(NDK_CONFIG.cache.name).toBe('nostr-bbs-cache');
			expect(NDK_CONFIG.cache.version).toBe(1);
		});

		it('has pool configuration', () => {
			expect(NDK_CONFIG.pool.maxRelays).toBeGreaterThan(0);
			expect(NDK_CONFIG.pool.connectTimeout).toBeGreaterThan(0);
			expect(NDK_CONFIG.pool.reconnectDelay).toBeGreaterThan(0);
		});

		it('enableDebug is a boolean', () => {
			expect(typeof NDK_CONFIG.enableDebug).toBe('boolean');
		});
	});

	describe('TIMEOUTS', () => {
		it('has all required timeout values', () => {
			expect(TIMEOUTS.connect).toBeGreaterThan(0);
			expect(TIMEOUTS.auth).toBeGreaterThan(0);
			expect(TIMEOUTS.publish).toBeGreaterThan(0);
			expect(TIMEOUTS.subscribe).toBeGreaterThan(0);
		});

		it('connect timeout is 10s', () => {
			expect(TIMEOUTS.connect).toBe(10000);
		});

		it('auth timeout is 5s', () => {
			expect(TIMEOUTS.auth).toBe(5000);
		});

		it('publish timeout is 10s', () => {
			expect(TIMEOUTS.publish).toBe(10000);
		});

		it('subscribe timeout is 30s', () => {
			expect(TIMEOUTS.subscribe).toBe(30000);
		});
	});

	describe('validateConfig', () => {
		it('returns valid for default configuration', () => {
			const result = validateConfig();
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('returns errors array', () => {
			const result = validateConfig();
			expect(Array.isArray(result.errors)).toBe(true);
		});
	});
});

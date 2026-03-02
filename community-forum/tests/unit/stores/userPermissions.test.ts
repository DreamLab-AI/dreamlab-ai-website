import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mock references used in factory functions
const { mockAuthStore, mockWhitelistStatusStore } = vi.hoisted(() => {
	const { writable } = require('svelte/store');
	return {
		mockAuthStore: writable({ isAuthenticated: false, pubkey: null }),
		mockWhitelistStatusStore: writable(null)
	};
});

vi.mock('$lib/stores/auth', () => ({
	authStore: mockAuthStore
}));

vi.mock('$lib/stores/user', () => ({
	whitelistStatusStore: mockWhitelistStatusStore
}));

import { get } from 'svelte/store';
import { userPermissionsStore, permissionsReady, isAdmin, userPubkey } from '$lib/stores/userPermissions';

describe('userPermissions', () => {
	beforeEach(() => {
		mockAuthStore.set({ isAuthenticated: false, pubkey: null });
		mockWhitelistStatusStore.set(null);
	});

	describe('permissionsReady', () => {
		it('returns true when user is not authenticated', () => {
			mockAuthStore.set({ isAuthenticated: false, pubkey: null });
			expect(get(permissionsReady)).toBe(true);
		});

		it('returns false when authenticated but whitelist not loaded', () => {
			mockAuthStore.set({ isAuthenticated: true, pubkey: 'pk1' });
			mockWhitelistStatusStore.set(null);
			expect(get(permissionsReady)).toBe(false);
		});

		it('returns true when authenticated and whitelist loaded', () => {
			mockAuthStore.set({ isAuthenticated: true, pubkey: 'pk1' });
			mockWhitelistStatusStore.set({ cohorts: ['members'], isAdmin: false });
			expect(get(permissionsReady)).toBe(true);
		});
	});

	describe('userPermissionsStore', () => {
		it('returns null when not authenticated', () => {
			mockAuthStore.set({ isAuthenticated: false, pubkey: null });
			expect(get(userPermissionsStore)).toBeNull();
		});

		it('returns null when pubkey is missing', () => {
			mockAuthStore.set({ isAuthenticated: true, pubkey: null });
			expect(get(userPermissionsStore)).toBeNull();
		});

		it('returns permissions for authenticated user', () => {
			mockAuthStore.set({ isAuthenticated: true, pubkey: 'test-pk' });
			mockWhitelistStatusStore.set({ cohorts: ['members', 'approved'], isAdmin: false });

			const perms = get(userPermissionsStore);
			expect(perms).not.toBeNull();
			expect(perms!.pubkey).toBe('test-pk');
			expect(perms!.cohorts).toEqual(['members', 'approved']);
			expect(perms!.globalRole).toBe('member');
			expect(perms!.sectionRoles).toEqual([]);
		});

		it('returns admin role when isAdmin is true', () => {
			mockAuthStore.set({ isAuthenticated: true, pubkey: 'admin-pk' });
			mockWhitelistStatusStore.set({ cohorts: ['admin'], isAdmin: true });

			const perms = get(userPermissionsStore);
			expect(perms!.globalRole).toBe('admin');
		});

		it('returns empty cohorts when whitelist is null', () => {
			mockAuthStore.set({ isAuthenticated: true, pubkey: 'pk1' });
			mockWhitelistStatusStore.set(null);

			const perms = get(userPermissionsStore);
			expect(perms).not.toBeNull();
			expect(perms!.cohorts).toEqual([]);
			expect(perms!.globalRole).toBe('member');
		});
	});

	describe('isAdmin', () => {
		it('returns false when not authenticated', () => {
			expect(get(isAdmin)).toBe(false);
		});

		it('returns false for regular member', () => {
			mockAuthStore.set({ isAuthenticated: true, pubkey: 'pk1' });
			mockWhitelistStatusStore.set({ cohorts: ['members'], isAdmin: false });
			expect(get(isAdmin)).toBe(false);
		});

		it('returns true for admin', () => {
			mockAuthStore.set({ isAuthenticated: true, pubkey: 'pk1' });
			mockWhitelistStatusStore.set({ cohorts: ['admin'], isAdmin: true });
			expect(get(isAdmin)).toBe(true);
		});
	});

	describe('userPubkey', () => {
		it('returns null when not authenticated', () => {
			expect(get(userPubkey)).toBeNull();
		});

		it('returns pubkey when authenticated', () => {
			mockAuthStore.set({ isAuthenticated: true, pubkey: 'my-pub-key' });
			mockWhitelistStatusStore.set({ cohorts: [], isAdmin: false });
			expect(get(userPubkey)).toBe('my-pub-key');
		});
	});
});

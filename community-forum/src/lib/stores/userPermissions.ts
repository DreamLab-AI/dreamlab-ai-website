/**
 * User Permissions Store
 * Derives user permissions from auth state and whitelist status (SOURCE OF TRUTH)
 */

import { derived, get } from 'svelte/store';
import { authStore } from './auth';
import { whitelistStatusStore } from './user';
import type { UserPermissions } from '$lib/config/types';

/**
 * Whether the whitelist verification has completed (or failed with fallback).
 * Use this to distinguish "loading" from "loaded with empty cohorts".
 */
export const permissionsReady = derived(
	[authStore, whitelistStatusStore],
	([$auth, $whitelistStatus]) => {
		if (!$auth.isAuthenticated || !$auth.pubkey) return true; // not logged in = nothing to wait for
		return $whitelistStatus !== null;
	}
);

/**
 * Derived store that provides user permissions based on auth state AND whitelist status
 * Returns null if user is not authenticated
 *
 * SECURITY: cohorts are populated from whitelistStatusStore which is relay-verified
 */
export const userPermissionsStore = derived<
	[typeof authStore, typeof whitelistStatusStore],
	UserPermissions | null
>(
	[authStore, whitelistStatusStore],
	([$auth, $whitelistStatus]) => {
		// Not authenticated - return null
		if (!$auth.isAuthenticated || !$auth.pubkey) {
			return null;
		}

		// Get cohorts from relay-verified whitelist status (SOURCE OF TRUTH)
		// whitelistStatusStore is populated by userStore when auth changes
		const cohorts = $whitelistStatus?.cohorts ?? [];
		const isAdmin = $whitelistStatus?.isAdmin ?? false;

		return {
			pubkey: $auth.pubkey,
			cohorts: cohorts,
			globalRole: isAdmin ? 'admin' as const : 'member' as const,
			sectionRoles: [] // Section-specific roles (populated separately if needed)
		};
	}
);

/**
 * Wait for permissions to be fully loaded (whitelist verified).
 * Resolves immediately if not authenticated or if whitelist is already loaded.
 */
export function waitForPermissions(): Promise<UserPermissions | null> {
	return new Promise((resolve) => {
		const unsub = permissionsReady.subscribe((ready) => {
			if (ready) {
				// Use queueMicrotask to allow the subscription to be set before unsubscribing
				queueMicrotask(() => {
					unsub();
					resolve(get(userPermissionsStore));
				});
			}
		});
	});
}

/**
 * Check if user has admin permissions
 */
export const isAdmin = derived(userPermissionsStore, ($permissions) => {
	return $permissions?.globalRole === 'admin';
});

/**
 * Get user's public key from permissions
 */
export const userPubkey = derived(userPermissionsStore, ($permissions) => {
	return $permissions?.pubkey ?? null;
});

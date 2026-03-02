/**
 * Unit Tests: User Store
 *
 * Tests for the user store derived from auth state.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { writable } from 'svelte/store';

// Hoist mock for auth store since multiple modules depend on it
const { mockAuthStore } = vi.hoisted(() => {
  const { writable } = require('svelte/store');
  return {
    mockAuthStore: writable({
      state: 'unauthenticated',
      pubkey: null,
      publicKey: null,
      privateKey: null,
      isNip07: false,
      nickname: null,
      avatar: null
    })
  };
});

vi.mock('$lib/stores/auth', () => ({
  authStore: mockAuthStore
}));

vi.mock('$lib/nostr/whitelist', () => ({
  verifyWhitelistStatus: vi.fn(async (pubkey: string) => ({
    pubkey,
    isWhitelisted: true,
    isAdmin: false,
    cohorts: ['dreamlab-lobby'],
    source: 'relay' as const,
    timestamp: Date.now()
  })),
  createFallbackStatus: vi.fn((pubkey: string) => ({
    pubkey,
    isWhitelisted: false,
    isAdmin: false,
    cohorts: [],
    source: 'fallback' as const,
    timestamp: Date.now()
  }))
}));

vi.mock('$lib/stores/profiles', () => ({
  profileCache: {
    getProfile: vi.fn(async (pubkey: string) => ({
      pubkey,
      profile: { displayName: 'TestUser', name: 'test' },
      displayName: 'TestUser',
      avatar: 'https://avatar.test/pic.png',
      nip05: 'test@test.com',
      about: 'Test user bio',
      lastFetched: Date.now(),
      isFetching: false
    })),
    subscribe: (fn: any) => { fn({ profiles: new Map() }); return () => {}; }
  }
}));

import {
  userStore,
  isAuthenticated,
  isAdmin,
  isAdminVerified,
  isApproved,
  currentPubkey,
  currentCohorts,
  currentDisplayName,
  whitelistStatusStore,
  whitelistSource
} from '$lib/stores/user';

describe('userStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to unauthenticated state
    mockAuthStore.set({
      state: 'unauthenticated',
      pubkey: null,
      publicKey: null,
      privateKey: null,
      isNip07: false,
      nickname: null,
      avatar: null
    });
    whitelistStatusStore.set(null);
  });

  describe('when unauthenticated', () => {
    it('should have null profile', () => {
      const state = get(userStore);
      expect(state.profile).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('when authenticated', () => {
    it('should create initial profile from pubkey', () => {
      const pk = 'a'.repeat(64);
      mockAuthStore.set({
        state: 'authenticated',
        pubkey: pk,
        publicKey: pk,
        privateKey: null,
        isNip07: false,
        nickname: null,
        avatar: null
      });

      const state = get(userStore);
      expect(state.profile).not.toBeNull();
      expect(state.profile!.pubkey).toBe(pk);
      expect(state.isLoading).toBe(true); // Loading profile from relay
    });

    it('should have default profile values', () => {
      const pk = 'b'.repeat(64);
      mockAuthStore.set({
        state: 'authenticated',
        pubkey: pk,
        publicKey: pk,
        privateKey: null,
        isNip07: false
      });

      const state = get(userStore);
      expect(state.profile!.isAdmin).toBe(false);
      expect(state.profile!.isApproved).toBe(false);
      expect(state.profile!.cohorts).toHaveLength(0);
      expect(state.profile!.name).toBeNull();
    });
  });

  describe('derived: isAuthenticated', () => {
    it('should return false when unauthenticated', () => {
      expect(get(isAuthenticated)).toBe(false);
    });

    it('should return true when authenticated with pubkey', () => {
      const pk = 'c'.repeat(64);
      mockAuthStore.set({
        state: 'authenticated',
        pubkey: pk,
        publicKey: pk,
        privateKey: null,
        isNip07: false
      });
      expect(get(isAuthenticated)).toBe(true);
    });

    it('should return false when state is authenticated but no pubkey', () => {
      mockAuthStore.set({
        state: 'authenticated',
        pubkey: null,
        publicKey: null,
        privateKey: null,
        isNip07: false
      });
      expect(get(isAuthenticated)).toBe(false);
    });
  });

  describe('derived: isAdmin', () => {
    it('should return false when no profile', () => {
      expect(get(isAdmin)).toBe(false);
    });
  });

  describe('derived: isAdminVerified', () => {
    it('should return false when no whitelist status', () => {
      expect(get(isAdminVerified)).toBe(false);
    });

    it('should return true when whitelist confirms admin', () => {
      whitelistStatusStore.set({
        pubkey: 'a'.repeat(64),
        isWhitelisted: true,
        isAdmin: true,
        cohorts: [],
        source: 'relay',
        timestamp: Date.now()
      } as any);
      expect(get(isAdminVerified)).toBe(true);
    });
  });

  describe('derived: whitelistSource', () => {
    it('should return null when no whitelist status', () => {
      expect(get(whitelistSource)).toBeNull();
    });

    it('should return source from whitelist status', () => {
      whitelistStatusStore.set({
        pubkey: 'a'.repeat(64),
        isWhitelisted: true,
        isAdmin: false,
        cohorts: [],
        source: 'relay',
        timestamp: Date.now()
      } as any);
      expect(get(whitelistSource)).toBe('relay');
    });
  });

  describe('derived: isApproved', () => {
    it('should return false when no profile', () => {
      expect(get(isApproved)).toBe(false);
    });
  });

  describe('derived: currentPubkey', () => {
    it('should return null when unauthenticated', () => {
      expect(get(currentPubkey)).toBeNull();
    });

    it('should return pubkey when authenticated', () => {
      const pk = 'd'.repeat(64);
      mockAuthStore.set({
        state: 'authenticated',
        pubkey: pk,
        publicKey: pk,
        privateKey: null,
        isNip07: false
      });
      expect(get(currentPubkey)).toBe(pk);
    });
  });

  describe('derived: currentCohorts', () => {
    it('should return empty array when no profile', () => {
      expect(get(currentCohorts)).toHaveLength(0);
    });
  });

  describe('derived: currentDisplayName', () => {
    it('should return null when no profile', () => {
      expect(get(currentDisplayName)).toBeNull();
    });
  });

  describe('whitelistStatusStore', () => {
    it('should be a writable store', () => {
      expect(get(whitelistStatusStore)).toBeNull();

      whitelistStatusStore.set({
        pubkey: 'test',
        isWhitelisted: true,
        isAdmin: false,
        cohorts: ['lobby'],
        source: 'cache',
        timestamp: Date.now()
      } as any);

      expect(get(whitelistStatusStore)).not.toBeNull();
    });
  });
});

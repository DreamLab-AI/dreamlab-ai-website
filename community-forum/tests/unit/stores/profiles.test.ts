/**
 * Unit Tests: Profiles Store
 *
 * Tests for the profile cache store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { writable } from 'svelte/store';

// Mock NDK
const { mockFetchProfile, mockFetchEvents } = vi.hoisted(() => ({
  mockFetchProfile: vi.fn(),
  mockFetchEvents: vi.fn(() => new Set())
}));

vi.mock('$lib/nostr/relay', () => ({
  ndk: vi.fn(() => ({
    getUser: vi.fn(({ pubkey }: { pubkey: string }) => ({
      pubkey,
      fetchProfile: mockFetchProfile,
      profile: mockFetchProfile._profile || null
    })),
    fetchEvents: mockFetchEvents
  })),
  isConnected: vi.fn(() => true)
}));

vi.mock('$lib/stores/auth', () => ({
  authStore: writable({
    state: 'authenticated',
    pubkey: 'a'.repeat(64),
    publicKey: 'a'.repeat(64),
    privateKey: null,
    isNip07: false,
    nickname: null,
    avatar: null
  })
}));

vi.mock('$lib/utils/asyncHelpers', () => ({
  AsyncThrottle: vi.fn().mockImplementation(() => ({
    execute: vi.fn((fn: () => any) => fn())
  }))
}));

vi.mock('$lib/nostr/groups', () => ({
  KIND_USER_REGISTRATION: 30078
}));

import { profileCache, createProfileStore, type CachedProfile } from '$lib/stores/profiles';

describe('profileCache', () => {
  beforeEach(() => {
    profileCache.clear();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with empty profiles map', () => {
      const state = get(profileCache);
      expect(state.profiles.size).toBe(0);
    });
  });

  describe('getCachedSync()', () => {
    it('should return null for uncached pubkey', () => {
      const result = profileCache.getCachedSync('unknown-pk');
      expect(result).toBeNull();
    });
  });

  describe('getProfile()', () => {
    it('should fetch profile from NDK when not cached', async () => {
      mockFetchProfile.mockResolvedValue(null);

      const result = await profileCache.getProfile('b'.repeat(64));
      expect(result.pubkey).toBe('b'.repeat(64));
      expect(result.isFetching).toBe(false);
    });

    it('should return placeholder when NDK is not initialized', async () => {
      // Override ndk to return null
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      const result = await profileCache.getProfile('c'.repeat(64));
      expect(result.pubkey).toBe('c'.repeat(64));
      expect(result.isFetching).toBe(false);
      expect(result.lastFetched).toBe(0); // Not fetched, will retry
    });

    it('should return cached profile if still valid', async () => {
      mockFetchProfile.mockResolvedValue(null);

      // First fetch
      await profileCache.getProfile('d'.repeat(64));

      // Second fetch should use cache
      const result = await profileCache.getProfile('d'.repeat(64));
      expect(result.pubkey).toBe('d'.repeat(64));
    });

    it('should use displayName from profile when available', async () => {
      mockFetchProfile.mockResolvedValue(undefined);
      // After fetchProfile the user.profile should have the data
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce({
        getUser: vi.fn(() => ({
          pubkey: 'e'.repeat(64),
          fetchProfile: vi.fn(),
          profile: { displayName: 'TestUser', name: 'test' }
        })),
        fetchEvents: mockFetchEvents
      });

      const result = await profileCache.getProfile('e'.repeat(64));
      expect(result.displayName).toBe('TestUser');
    });

    it('should truncate pubkey for display when no name available', async () => {
      mockFetchProfile.mockResolvedValue(undefined);
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce({
        getUser: vi.fn(() => ({
          pubkey: 'f'.repeat(64),
          fetchProfile: vi.fn(),
          profile: null
        })),
        fetchEvents: mockFetchEvents
      });

      const result = await profileCache.getProfile('f'.repeat(64));
      // Should be truncated format: first 8 chars...last 4 chars
      expect(result.displayName.length).toBeLessThan(64);
      expect(result.displayName).toContain('...');
    });

    it('should handle fetch errors gracefully', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce({
        getUser: vi.fn(() => ({
          pubkey: 'g'.repeat(64),
          fetchProfile: vi.fn().mockRejectedValue(new Error('Network error'))
        })),
        fetchEvents: mockFetchEvents
      });

      // The AsyncThrottle mock will throw
      const mockThrottle = (await import('$lib/utils/asyncHelpers')).AsyncThrottle;
      (mockThrottle as any).mockImplementationOnce(() => ({
        execute: vi.fn().mockRejectedValue(new Error('Network error'))
      }));

      // Re-import to get fresh instance - but since profileCache is a singleton,
      // we test the error handling by checking the profile still has fallback data
      const result = await profileCache.getProfile('g'.repeat(64));
      expect(result.pubkey).toBe('g'.repeat(64));
      expect(result.isFetching).toBe(false);
    });
  });

  describe('prefetchProfiles()', () => {
    it('should deduplicate pubkeys', async () => {
      mockFetchProfile.mockResolvedValue(null);
      const pk = 'h'.repeat(64);

      await profileCache.prefetchProfiles([pk, pk, pk]);
      // Should have only one entry
      const state = get(profileCache);
      expect(state.profiles.size).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should empty the profile cache', async () => {
      mockFetchProfile.mockResolvedValue(null);
      await profileCache.getProfile('i'.repeat(64));
      expect(get(profileCache).profiles.size).toBe(1);

      profileCache.clear();
      expect(get(profileCache).profiles.size).toBe(0);
    });
  });

  describe('remove()', () => {
    it('should remove a specific profile from cache', async () => {
      mockFetchProfile.mockResolvedValue(null);
      const pk1 = 'j'.repeat(64);
      const pk2 = 'k'.repeat(64);

      await profileCache.getProfile(pk1);
      await profileCache.getProfile(pk2);
      expect(get(profileCache).profiles.size).toBe(2);

      profileCache.remove(pk1);
      expect(get(profileCache).profiles.size).toBe(1);
      expect(profileCache.getCachedSync(pk1)).toBeNull();
      expect(profileCache.getCachedSync(pk2)).not.toBeNull();
    });
  });

  describe('updateCurrentUserProfile()', () => {
    it('should update display name and avatar for a pubkey', () => {
      const pk = 'l'.repeat(64);
      profileCache.updateCurrentUserProfile(pk, 'NewName', 'https://avatar.url');

      const cached = profileCache.getCachedSync(pk);
      expect(cached).not.toBeNull();
      expect(cached!.displayName).toBe('NewName');
      expect(cached!.avatar).toBe('https://avatar.url');
    });

    it('should use truncated pubkey when displayName is null', () => {
      const pk = 'm'.repeat(64);
      profileCache.updateCurrentUserProfile(pk, null, null);

      const cached = profileCache.getCachedSync(pk);
      expect(cached!.displayName).toContain('...');
      expect(cached!.avatar).toBeNull();
    });

    it('should update lastFetched timestamp', () => {
      const pk = 'n'.repeat(64);
      const before = Date.now();
      profileCache.updateCurrentUserProfile(pk, 'Test', null);

      const cached = profileCache.getCachedSync(pk);
      expect(cached!.lastFetched).toBeGreaterThanOrEqual(before);
    });
  });

  describe('createProfileStore()', () => {
    it('should return a derived store for a pubkey', () => {
      const pk = 'o'.repeat(64);
      const store = createProfileStore(pk);
      const value = get(store);
      expect(value.pubkey).toBe(pk);
    });

    it('should use cached data if available', () => {
      const pk = 'p'.repeat(64);
      profileCache.updateCurrentUserProfile(pk, 'CachedUser', null);

      const store = createProfileStore(pk);
      const value = get(store);
      expect(value.displayName).toBe('CachedUser');
    });
  });
});

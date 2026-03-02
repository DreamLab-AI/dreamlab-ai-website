/**
 * Unit Tests: Mute Store
 *
 * Tests for the user mute store.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { muteStore, createIsMutedStore, mutedCount, mutedUsersList } from '$lib/stores/mute';

describe('muteStore', () => {
  beforeEach(() => {
    localStorage.clear();
    muteStore.clearAllMutes();
  });

  describe('muteUser()', () => {
    it('should mute a user by pubkey', () => {
      muteStore.muteUser('abc123');
      expect(muteStore.isMuted('abc123')).toBe(true);
    });

    it('should store mute timestamp', () => {
      const before = Date.now();
      muteStore.muteUser('abc123');
      const state = get(muteStore);
      const entry = state.mutedUsers.get('abc123');
      expect(entry!.mutedAt).toBeGreaterThanOrEqual(before);
    });

    it('should store optional reason', () => {
      muteStore.muteUser('abc123', 'spam');
      const state = get(muteStore);
      expect(state.mutedUsers.get('abc123')!.reason).toBe('spam');
    });

    it('should persist to localStorage', () => {
      muteStore.muteUser('abc123');
      const stored = localStorage.getItem('Nostr-BBS-muted-users');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].pubkey).toBe('abc123');
    });
  });

  describe('unmuteUser()', () => {
    it('should unmute a user', () => {
      muteStore.muteUser('abc123');
      muteStore.unmuteUser('abc123');
      expect(muteStore.isMuted('abc123')).toBe(false);
    });

    it('should not throw on unmuting non-muted user', () => {
      expect(() => muteStore.unmuteUser('nonexistent')).not.toThrow();
    });
  });

  describe('isMuted()', () => {
    it('should return false for unmuted user', () => {
      expect(muteStore.isMuted('abc123')).toBe(false);
    });

    it('should return true for muted user', () => {
      muteStore.muteUser('abc123');
      expect(muteStore.isMuted('abc123')).toBe(true);
    });
  });

  describe('getMutedUsers()', () => {
    it('should return empty array when no users muted', () => {
      expect(muteStore.getMutedUsers()).toHaveLength(0);
    });

    it('should return all muted users sorted by mutedAt descending', () => {
      muteStore.muteUser('user1');
      muteStore.muteUser('user2');
      const users = muteStore.getMutedUsers();
      expect(users).toHaveLength(2);
      expect(users[0].mutedAt).toBeGreaterThanOrEqual(users[1].mutedAt);
    });
  });

  describe('clearAllMutes()', () => {
    it('should clear all muted users', () => {
      muteStore.muteUser('user1');
      muteStore.muteUser('user2');
      muteStore.clearAllMutes();
      expect(muteStore.getMutedCount()).toBe(0);
    });
  });

  describe('getMutedCount()', () => {
    it('should return 0 initially', () => {
      expect(muteStore.getMutedCount()).toBe(0);
    });

    it('should return correct count', () => {
      muteStore.muteUser('user1');
      muteStore.muteUser('user2');
      expect(muteStore.getMutedCount()).toBe(2);
    });
  });

  describe('derived stores', () => {
    it('createIsMutedStore should reflect mute status', () => {
      const isMuted = createIsMutedStore('testpub');
      expect(get(isMuted)).toBe(false);
      muteStore.muteUser('testpub');
      expect(get(isMuted)).toBe(true);
    });

    it('mutedCount should track count', () => {
      expect(get(mutedCount)).toBe(0);
      muteStore.muteUser('user1');
      expect(get(mutedCount)).toBe(1);
    });

    it('mutedUsersList should return sorted array', () => {
      muteStore.muteUser('user1');
      muteStore.muteUser('user2');
      const list = get(mutedUsersList);
      expect(list).toHaveLength(2);
      expect(list[0].mutedAt).toBeGreaterThanOrEqual(list[1].mutedAt);
    });
  });
});

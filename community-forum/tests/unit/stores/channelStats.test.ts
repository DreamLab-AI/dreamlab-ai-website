/**
 * Unit Tests: Channel Stats Store
 *
 * Tests for the channel statistics store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Use vi.hoisted so mock fns are available when vi.mock factories run (hoisted)
const {
  mockGetChannelMessagesWithAuthors,
  mockGetUser,
  mockGetChannel,
  mockChannelsToArray,
  mockMessagesToArray,
  mockUsersToArray
} = vi.hoisted(() => ({
  mockGetChannelMessagesWithAuthors: vi.fn(),
  mockGetUser: vi.fn(),
  mockGetChannel: vi.fn(),
  mockChannelsToArray: vi.fn(() => []),
  mockMessagesToArray: vi.fn(() => []),
  mockUsersToArray: vi.fn(() => [])
}));

vi.mock('$lib/db', () => ({
  db: {
    getChannelMessagesWithAuthors: mockGetChannelMessagesWithAuthors,
    getUser: mockGetUser,
    getChannel: mockGetChannel,
    channels: { toArray: mockChannelsToArray },
    messages: { toArray: mockMessagesToArray },
    users: { toArray: mockUsersToArray }
  }
}));

import {
  channelStatsStore,
  statsLoading,
  statsError
} from '$lib/stores/channelStats';

describe('channelStatsStore', () => {
  beforeEach(() => {
    channelStatsStore.clear();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with empty stats', () => {
      const state = get(channelStatsStore);
      expect(state.stats.size).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('refreshStats()', () => {
    it('should calculate stats for a channel with no messages', async () => {
      mockGetChannelMessagesWithAuthors.mockResolvedValue([]);

      await channelStatsStore.refreshStats('ch1');

      const state = get(channelStatsStore);
      const stats = state.stats.get('ch1');
      expect(stats).toBeDefined();
      expect(stats!.messageCount).toBe(0);
      expect(stats!.uniquePosters).toBe(0);
      expect(stats!.avgMessagesPerDay).toBe(0);
      expect(stats!.topPosters).toHaveLength(0);
    });

    it('should calculate stats for a channel with messages', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockGetChannelMessagesWithAuthors.mockResolvedValue([
        { pubkey: 'user1', created_at: now - 3600 },
        { pubkey: 'user2', created_at: now - 1800 },
        { pubkey: 'user1', created_at: now }
      ]);
      mockGetUser.mockResolvedValue({ name: 'User', displayName: null, avatar: null });
      mockGetChannel.mockResolvedValue({ id: 'ch1' });

      await channelStatsStore.refreshStats('ch1');

      const state = get(channelStatsStore);
      const stats = state.stats.get('ch1');
      expect(stats).toBeDefined();
      expect(stats!.messageCount).toBe(3);
      expect(stats!.uniquePosters).toBe(2);
      expect(stats!.topPosters.length).toBeGreaterThan(0);
      expect(stats!.topPosters[0].pubkey).toBe('user1'); // Most messages
      expect(stats!.topPosters[0].messageCount).toBe(2);
    });

    it('should set loading state during calculation', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>(resolve => { resolvePromise = resolve; });

      mockGetChannelMessagesWithAuthors.mockImplementation(async () => {
        // Check loading state while in-flight
        expect(get(statsLoading)).toBe(true);
        resolvePromise();
        return [];
      });

      await channelStatsStore.refreshStats('ch1');
      await promise;
      expect(get(statsLoading)).toBe(false);
    });

    it('should handle errors and set error state', async () => {
      mockGetChannelMessagesWithAuthors.mockRejectedValue(new Error('DB error'));

      await channelStatsStore.refreshStats('ch1');

      const state = get(channelStatsStore);
      expect(state.error).toBe('DB error');
      expect(state.isLoading).toBe(false);
    });

    it('should calculate activity by hour', async () => {
      // Messages at different hours
      const baseTime = new Date('2026-01-15T12:00:00Z').getTime() / 1000;
      mockGetChannelMessagesWithAuthors.mockResolvedValue([
        { pubkey: 'user1', created_at: baseTime },     // noon
        { pubkey: 'user1', created_at: baseTime },     // noon
        { pubkey: 'user1', created_at: baseTime + 3600 } // 1pm
      ]);
      mockGetUser.mockResolvedValue(null);
      mockGetChannel.mockResolvedValue(null);

      await channelStatsStore.refreshStats('ch1');

      const stats = get(channelStatsStore).stats.get('ch1');
      expect(stats!.activityByHour).toHaveLength(24);
    });
  });

  describe('getStats()', () => {
    it('should return cached stats if recent', async () => {
      mockGetChannelMessagesWithAuthors.mockResolvedValue([]);

      // First call populates cache
      await channelStatsStore.refreshStats('ch1');

      // Second call should return cache without re-fetching
      vi.clearAllMocks();
      const stats = await channelStatsStore.getStats('ch1');
      expect(stats).not.toBeNull();
      expect(mockGetChannelMessagesWithAuthors).not.toHaveBeenCalled();
    });

    it('should refresh if no cached stats', async () => {
      mockGetChannelMessagesWithAuthors.mockResolvedValue([]);

      const stats = await channelStatsStore.getStats('ch1');
      expect(mockGetChannelMessagesWithAuthors).toHaveBeenCalledWith('ch1');
    });
  });

  describe('getPlatformStats()', () => {
    it('should calculate platform-wide statistics', async () => {
      mockChannelsToArray.mockResolvedValue([
        { id: 'ch1' }
      ]);
      mockMessagesToArray.mockResolvedValue([
        { channelId: 'ch1', created_at: Date.now() / 1000, deleted: false }
      ]);
      mockUsersToArray.mockResolvedValue([
        { pubkey: 'user1' }
      ]);
      mockGetChannelMessagesWithAuthors.mockResolvedValue([
        { pubkey: 'user1', created_at: Math.floor(Date.now() / 1000) }
      ]);
      mockGetUser.mockResolvedValue(null);
      mockGetChannel.mockResolvedValue({ id: 'ch1' });

      const platform = await channelStatsStore.getPlatformStats();
      expect(platform.totalChannels).toBe(1);
      expect(platform.totalMessages).toBe(1);
      expect(platform.totalUsers).toBe(1);
      expect(platform.channelStats).toHaveLength(1);
    });

    it('should handle errors in platform stats', async () => {
      mockChannelsToArray.mockRejectedValue(new Error('DB unavailable'));

      await expect(channelStatsStore.getPlatformStats()).rejects.toThrow('DB unavailable');
      expect(get(channelStatsStore).error).toBe('DB unavailable');
    });

    it('should filter deleted messages from total count', async () => {
      mockChannelsToArray.mockResolvedValue([]);
      mockMessagesToArray.mockResolvedValue([
        { channelId: 'ch1', deleted: false },
        { channelId: 'ch1', deleted: true },
        { channelId: 'ch1', deleted: false }
      ]);
      mockUsersToArray.mockResolvedValue([]);

      const platform = await channelStatsStore.getPlatformStats();
      expect(platform.totalMessages).toBe(2); // Excludes deleted
    });
  });

  describe('clearError()', () => {
    it('should clear error state', async () => {
      mockGetChannelMessagesWithAuthors.mockRejectedValue(new Error('Fail'));
      await channelStatsStore.refreshStats('ch1');
      expect(get(channelStatsStore).error).not.toBeNull();

      channelStatsStore.clearError();
      expect(get(channelStatsStore).error).toBeNull();
    });
  });

  describe('clear()', () => {
    it('should reset to initial state', async () => {
      mockGetChannelMessagesWithAuthors.mockResolvedValue([]);
      await channelStatsStore.refreshStats('ch1');
      expect(get(channelStatsStore).stats.size).toBe(1);

      channelStatsStore.clear();
      expect(get(channelStatsStore).stats.size).toBe(0);
      expect(get(channelStatsStore).isLoading).toBe(false);
      expect(get(channelStatsStore).error).toBeNull();
    });
  });

  describe('derived: statsLoading', () => {
    it('should reflect loading state', () => {
      expect(get(statsLoading)).toBe(false);
    });
  });

  describe('derived: statsError', () => {
    it('should reflect error state', () => {
      expect(get(statsError)).toBeNull();
    });
  });
});

/**
 * Unit Tests: Admin Store
 *
 * Tests for the admin state management store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock NDK relay
const mockNdk = vi.fn(() => null);
vi.mock('$lib/nostr/relay', () => ({
  ndk: (...args: any[]) => mockNdk(...args),
  isConnected: vi.fn(() => false),
  publishEvent: vi.fn(async () => true),
  subscribe: vi.fn()
}));

import {
  adminStore,
  pendingRequestsByChannel,
  usersByCohort,
  fetchPendingRequests,
  fetchAllUsers,
  fetchAllChannels,
  type PendingRequest,
  type User,
  type Channel
} from '$lib/stores/admin';

const makePendingRequest = (overrides: Partial<PendingRequest> = {}): PendingRequest => ({
  id: 'req1',
  pubkey: 'pk1',
  channelId: 'ch1',
  channelName: 'General',
  timestamp: 1000,
  event: { id: 'req1', kind: 9021, pubkey: 'pk1', created_at: 1000, tags: [], content: '', sig: '' },
  ...overrides
});

const makeUser = (overrides: Partial<User> = {}): User => ({
  pubkey: 'user1',
  name: 'Alice',
  cohorts: ['approved'],
  channels: [],
  joinedAt: 1000,
  ...overrides
});

const makeChannel = (overrides: Partial<Channel> = {}): Channel => ({
  id: 'ch1',
  name: 'General',
  cohorts: [],
  visibility: 'public',
  encrypted: false,
  section: 'dreamlab-lobby' as any,
  createdAt: 1000,
  memberCount: 0,
  creatorPubkey: 'creator1',
  ...overrides
});

describe('adminStore', () => {
  beforeEach(() => {
    adminStore.reset();
  });

  describe('initial state', () => {
    it('should start with empty lists', () => {
      const state = get(adminStore);
      expect(state.pendingRequests).toHaveLength(0);
      expect(state.users).toHaveLength(0);
      expect(state.channels).toHaveLength(0);
      expect(state.error).toBeNull();
    });

    it('should start with all loading false', () => {
      const state = get(adminStore);
      expect(state.loading.requests).toBe(false);
      expect(state.loading.users).toBe(false);
      expect(state.loading.channels).toBe(false);
    });
  });

  describe('setLoading()', () => {
    it('should set requests loading', () => {
      adminStore.setLoading('requests', true);
      expect(get(adminStore).loading.requests).toBe(true);
    });

    it('should set users loading', () => {
      adminStore.setLoading('users', true);
      expect(get(adminStore).loading.users).toBe(true);
    });

    it('should set channels loading', () => {
      adminStore.setLoading('channels', true);
      expect(get(adminStore).loading.channels).toBe(true);
    });

    it('should not affect other loading flags', () => {
      adminStore.setLoading('requests', true);
      const state = get(adminStore);
      expect(state.loading.users).toBe(false);
      expect(state.loading.channels).toBe(false);
    });
  });

  describe('setError()', () => {
    it('should set error message', () => {
      adminStore.setError('Something went wrong');
      expect(get(adminStore).error).toBe('Something went wrong');
    });

    it('should clear error with null', () => {
      adminStore.setError('error');
      adminStore.setError(null);
      expect(get(adminStore).error).toBeNull();
    });
  });

  describe('setPendingRequests()', () => {
    it('should set pending requests and clear loading', () => {
      adminStore.setLoading('requests', true);
      const requests = [makePendingRequest()];
      adminStore.setPendingRequests(requests);
      const state = get(adminStore);
      expect(state.pendingRequests).toHaveLength(1);
      expect(state.loading.requests).toBe(false);
    });
  });

  describe('removePendingRequest()', () => {
    it('should remove request by id', () => {
      adminStore.setPendingRequests([
        makePendingRequest({ id: 'req1' }),
        makePendingRequest({ id: 'req2' })
      ]);
      adminStore.removePendingRequest('req1');
      const state = get(adminStore);
      expect(state.pendingRequests).toHaveLength(1);
      expect(state.pendingRequests[0].id).toBe('req2');
    });

    it('should handle non-existent id gracefully', () => {
      adminStore.setPendingRequests([makePendingRequest({ id: 'req1' })]);
      adminStore.removePendingRequest('nonexistent');
      expect(get(adminStore).pendingRequests).toHaveLength(1);
    });
  });

  describe('setUsers()', () => {
    it('should set users and clear loading', () => {
      adminStore.setLoading('users', true);
      adminStore.setUsers([makeUser()]);
      const state = get(adminStore);
      expect(state.users).toHaveLength(1);
      expect(state.loading.users).toBe(false);
    });
  });

  describe('updateUser()', () => {
    it('should update specific user fields', () => {
      adminStore.setUsers([makeUser({ pubkey: 'user1', name: 'Alice' })]);
      adminStore.updateUser('user1', { name: 'Bob', isBanned: true });
      const state = get(adminStore);
      expect(state.users[0].name).toBe('Bob');
      expect(state.users[0].isBanned).toBe(true);
      expect(state.users[0].pubkey).toBe('user1');
    });

    it('should not affect other users', () => {
      adminStore.setUsers([
        makeUser({ pubkey: 'user1', name: 'Alice' }),
        makeUser({ pubkey: 'user2', name: 'Bob' })
      ]);
      adminStore.updateUser('user1', { name: 'Updated' });
      const state = get(adminStore);
      expect(state.users[1].name).toBe('Bob');
    });
  });

  describe('setChannels()', () => {
    it('should set channels and clear loading', () => {
      adminStore.setLoading('channels', true);
      adminStore.setChannels([makeChannel()]);
      const state = get(adminStore);
      expect(state.channels).toHaveLength(1);
      expect(state.loading.channels).toBe(false);
    });
  });

  describe('addChannel()', () => {
    it('should add a channel', () => {
      adminStore.addChannel(makeChannel({ id: 'ch1' }));
      adminStore.addChannel(makeChannel({ id: 'ch2' }));
      expect(get(adminStore).channels).toHaveLength(2);
    });
  });

  describe('updateChannel()', () => {
    it('should update specific channel fields', () => {
      adminStore.setChannels([makeChannel({ id: 'ch1', name: 'Old' })]);
      adminStore.updateChannel('ch1', { name: 'New', memberCount: 10 });
      const state = get(adminStore);
      expect(state.channels[0].name).toBe('New');
      expect(state.channels[0].memberCount).toBe(10);
    });
  });

  describe('deleteChannel()', () => {
    it('should remove a channel by id', () => {
      adminStore.setChannels([
        makeChannel({ id: 'ch1' }),
        makeChannel({ id: 'ch2' })
      ]);
      adminStore.deleteChannel('ch1');
      const state = get(adminStore);
      expect(state.channels).toHaveLength(1);
      expect(state.channels[0].id).toBe('ch2');
    });
  });

  describe('reset()', () => {
    it('should restore initial state', () => {
      adminStore.setUsers([makeUser()]);
      adminStore.setChannels([makeChannel()]);
      adminStore.setError('error');
      adminStore.reset();
      const state = get(adminStore);
      expect(state.users).toHaveLength(0);
      expect(state.channels).toHaveLength(0);
      expect(state.error).toBeNull();
    });
  });

  describe('derived: pendingRequestsByChannel', () => {
    it('should group requests by channel', () => {
      adminStore.setPendingRequests([
        makePendingRequest({ id: 'r1', channelId: 'ch1' }),
        makePendingRequest({ id: 'r2', channelId: 'ch1' }),
        makePendingRequest({ id: 'r3', channelId: 'ch2' })
      ]);
      const grouped = get(pendingRequestsByChannel);
      expect(grouped.get('ch1')).toHaveLength(2);
      expect(grouped.get('ch2')).toHaveLength(1);
    });
  });

  describe('derived: usersByCohort', () => {
    it('should group users by cohort', () => {
      adminStore.setUsers([
        makeUser({ pubkey: 'u1', cohorts: ['approved', 'business'] }),
        makeUser({ pubkey: 'u2', cohorts: ['approved'] }),
        makeUser({ pubkey: 'u3', cohorts: ['business'] })
      ]);
      const grouped = get(usersByCohort);
      expect(grouped.get('approved')).toHaveLength(2);
      expect(grouped.get('business')).toHaveLength(2);
    });
  });

  describe('fetchPendingRequests()', () => {
    beforeEach(() => {
      adminStore.reset();
    });

    it('should set error when NDK is not initialized', async () => {
      mockNdk.mockReturnValue(null);
      await fetchPendingRequests({} as any);
      const state = get(adminStore);
      expect(state.error).toBe('Failed to load pending requests');
      expect(state.loading.requests).toBe(false);
    });

    it('should parse join request events and set pending requests', async () => {
      const mockEvents = new Set([
        {
          id: 'evt1',
          kind: 9021,
          pubkey: 'pk1',
          created_at: 1000,
          tags: [['h', 'channel1']],
          content: '',
          sig: 'sig1'
        },
        {
          id: 'evt2',
          kind: 9021,
          pubkey: 'pk2',
          created_at: 2000,
          tags: [['h', 'channel2']],
          content: '',
          sig: 'sig2'
        }
      ]);
      mockNdk.mockReturnValue({ fetchEvents: vi.fn(async () => mockEvents) });

      await fetchPendingRequests({} as any);
      const state = get(adminStore);
      expect(state.pendingRequests).toHaveLength(2);
      expect(state.pendingRequests[0].timestamp).toBe(2000);
      expect(state.pendingRequests[0].channelId).toBe('channel2');
      expect(state.pendingRequests[1].channelId).toBe('channel1');
      expect(state.loading.requests).toBe(false);
    });

    it('should handle events with missing h tag', async () => {
      const mockEvents = new Set([
        {
          id: 'evt1',
          kind: 9021,
          pubkey: 'pk1',
          created_at: 1000,
          tags: [],
          content: '',
          sig: 'sig1'
        }
      ]);
      mockNdk.mockReturnValue({ fetchEvents: vi.fn(async () => mockEvents) });

      await fetchPendingRequests({} as any);
      const state = get(adminStore);
      expect(state.pendingRequests).toHaveLength(1);
      expect(state.pendingRequests[0].channelId).toBe('');
    });
  });

  describe('fetchAllUsers()', () => {
    beforeEach(() => {
      adminStore.reset();
    });

    it('should set error when NDK is not initialized', async () => {
      mockNdk.mockReturnValue(null);
      await fetchAllUsers({} as any);
      const state = get(adminStore);
      expect(state.error).toBe('Failed to load users');
      expect(state.loading.users).toBe(false);
    });

    it('should parse metadata and membership events', async () => {
      const metadataEvents = new Set([
        {
          id: 'meta1',
          kind: 0,
          pubkey: 'user1',
          created_at: 1000,
          tags: [],
          content: JSON.stringify({ name: 'Alice' }),
          sig: 'sig1'
        },
        {
          id: 'meta2',
          kind: 0,
          pubkey: 'user2',
          created_at: 900,
          tags: [],
          content: JSON.stringify({ display_name: 'Bob' }),
          sig: 'sig2'
        }
      ]);
      const membershipEvents = new Set([
        {
          id: 'mem1',
          kind: 9022,
          pubkey: 'user1',
          created_at: 1500,
          tags: [['e', 'chan1'], ['cohort', 'approved']],
          content: '',
          sig: 'sig3'
        },
        {
          id: 'mem2',
          kind: 9022,
          pubkey: 'user1',
          created_at: 1600,
          tags: [['e', 'chan2'], ['cohort', 'approved']],
          content: '',
          sig: 'sig4'
        }
      ]);
      mockNdk.mockReturnValue({
        fetchEvents: vi.fn()
          .mockResolvedValueOnce(metadataEvents)
          .mockResolvedValueOnce(membershipEvents)
      });

      await fetchAllUsers({} as any);
      const state = get(adminStore);
      expect(state.users).toHaveLength(2);
      const alice = state.users.find(u => u.pubkey === 'user1');
      expect(alice).toBeDefined();
      expect(alice!.name).toBe('Alice');
      expect(alice!.channels).toContain('chan1');
      expect(alice!.channels).toContain('chan2');
      expect(alice!.cohorts).toEqual(['approved']);
      expect(alice!.lastSeen).toBe(1600);
      expect(state.loading.users).toBe(false);
    });

    it('should handle invalid metadata JSON gracefully', async () => {
      const metadataEvents = new Set([
        {
          id: 'meta1',
          kind: 0,
          pubkey: 'user1',
          created_at: 1000,
          tags: [],
          content: 'invalid json',
          sig: 'sig1'
        }
      ]);
      const membershipEvents = new Set([]);
      mockNdk.mockReturnValue({
        fetchEvents: vi.fn()
          .mockResolvedValueOnce(metadataEvents)
          .mockResolvedValueOnce(membershipEvents)
      });

      await fetchAllUsers({} as any);
      const state = get(adminStore);
      expect(state.users).toHaveLength(0);
      expect(state.loading.users).toBe(false);
    });
  });

  describe('fetchAllChannels()', () => {
    beforeEach(() => {
      adminStore.reset();
    });

    it('should set error when NDK is not initialized', async () => {
      mockNdk.mockReturnValue(null);
      await fetchAllChannels({} as any);
      const state = get(adminStore);
      expect(state.error).toBe('Failed to load channels');
      expect(state.loading.channels).toBe(false);
    });

    it('should parse channel creation, metadata, and member events', async () => {
      const creationEvents = new Set([
        {
          id: 'ch1',
          kind: 40,
          pubkey: 'creator1',
          created_at: 1000,
          tags: [
            ['cohort', 'approved'],
            ['visibility', 'cohort'],
            ['encrypted', 'true'],
            ['section', 'discussions']
          ],
          content: JSON.stringify({ name: 'Channel One', about: 'First channel' }),
          sig: 'sig1'
        },
        {
          id: 'ch2',
          kind: 40,
          pubkey: 'creator2',
          created_at: 2000,
          tags: [
            ['cohort', 'admin'],
            ['cohort', 'business'],
            ['visibility', 'private']
          ],
          content: JSON.stringify({ name: 'Channel Two', description: 'Second channel' }),
          sig: 'sig2'
        }
      ]);
      const metadataEvents = new Set([
        {
          id: 'meta1',
          kind: 41,
          pubkey: 'creator1',
          created_at: 1500,
          tags: [['e', 'ch1']],
          content: JSON.stringify({ name: 'Updated Channel One', about: 'Updated description' }),
          sig: 'sig3'
        }
      ]);
      const memberEvents = new Set([
        {
          id: 'mem1', kind: 9022, pubkey: 'memberA', created_at: 1100,
          tags: [['e', 'ch1']], content: '', sig: 'sig4'
        },
        {
          id: 'mem2', kind: 9022, pubkey: 'memberB', created_at: 1200,
          tags: [['e', 'ch1']], content: '', sig: 'sig5'
        },
        {
          id: 'mem3', kind: 9022, pubkey: 'memberA', created_at: 1300,
          tags: [['e', 'ch2']], content: '', sig: 'sig6'
        }
      ]);

      mockNdk.mockReturnValue({
        fetchEvents: vi.fn()
          .mockResolvedValueOnce(creationEvents)
          .mockResolvedValueOnce(metadataEvents)
          .mockResolvedValueOnce(memberEvents)
      });

      await fetchAllChannels({} as any);
      const state = get(adminStore);
      expect(state.channels).toHaveLength(2);

      const ch1 = state.channels.find(c => c.id === 'ch1');
      expect(ch1).toBeDefined();
      expect(ch1!.name).toBe('Updated Channel One');
      expect(ch1!.description).toBe('Updated description');
      expect(ch1!.visibility).toBe('cohort');
      expect(ch1!.encrypted).toBe(true);
      expect(ch1!.section).toBe('discussions');
      expect(ch1!.memberCount).toBe(2);
      expect(ch1!.cohorts).toEqual(['approved']);

      const ch2 = state.channels.find(c => c.id === 'ch2');
      expect(ch2).toBeDefined();
      expect(ch2!.name).toBe('Channel Two');
      expect(ch2!.visibility).toBe('private');
      expect(ch2!.memberCount).toBe(1);
      expect(ch2!.cohorts).toEqual(['admin', 'business']);
      expect(state.loading.channels).toBe(false);
    });

    it('should handle invalid channel creation JSON gracefully', async () => {
      const creationEvents = new Set([
        {
          id: 'ch1', kind: 40, pubkey: 'creator1', created_at: 1000,
          tags: [], content: 'invalid json', sig: 'sig1'
        }
      ]);
      mockNdk.mockReturnValue({
        fetchEvents: vi.fn()
          .mockResolvedValueOnce(creationEvents)
          .mockResolvedValueOnce(new Set())
          .mockResolvedValueOnce(new Set())
      });

      await fetchAllChannels({} as any);
      const state = get(adminStore);
      expect(state.channels).toHaveLength(0);
      expect(state.loading.channels).toBe(false);
    });

    it('should default to public visibility and dreamlab-lobby section', async () => {
      const creationEvents = new Set([
        {
          id: 'ch1', kind: 40, pubkey: 'creator1', created_at: 1000,
          tags: [],
          content: JSON.stringify({ name: 'Basic Channel' }),
          sig: 'sig1'
        }
      ]);
      mockNdk.mockReturnValue({
        fetchEvents: vi.fn()
          .mockResolvedValueOnce(creationEvents)
          .mockResolvedValueOnce(new Set())
          .mockResolvedValueOnce(new Set())
      });

      await fetchAllChannels({} as any);
      const state = get(adminStore);
      expect(state.channels).toHaveLength(1);
      expect(state.channels[0].visibility).toBe('public');
      expect(state.channels[0].section).toBe('dreamlab-lobby');
      expect(state.channels[0].encrypted).toBe(false);
      expect(state.channels[0].cohorts).toEqual([]);
    });

    it('should handle metadata event with missing e tag', async () => {
      const creationEvents = new Set([
        {
          id: 'ch1', kind: 40, pubkey: 'creator1', created_at: 1000,
          tags: [],
          content: JSON.stringify({ name: 'Test Channel' }),
          sig: 'sig1'
        }
      ]);
      const metadataEvents = new Set([
        {
          id: 'meta1', kind: 41, pubkey: 'creator1', created_at: 1500,
          tags: [],
          content: JSON.stringify({ name: 'Should Not Apply' }),
          sig: 'sig2'
        }
      ]);
      mockNdk.mockReturnValue({
        fetchEvents: vi.fn()
          .mockResolvedValueOnce(creationEvents)
          .mockResolvedValueOnce(metadataEvents)
          .mockResolvedValueOnce(new Set())
      });

      await fetchAllChannels({} as any);
      const state = get(adminStore);
      expect(state.channels[0].name).toBe('Test Channel');
    });
  });
});

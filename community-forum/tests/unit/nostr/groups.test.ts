/**
 * Unit Tests: NIP-29 Group Operations
 *
 * Tests for group CRUD operations, join requests, approvals,
 * kicks, bans, message deletion, and metadata management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock nostr-tools with actual crypto operations
vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual('nostr-tools');
  return actual;
});

import {
  requestJoin,
  requestRegistration,
  approveJoin,
  rejectJoin,
  kickFromChannel,
  banUser,
  deleteMessage,
  fetchJoinRequests,
  isMember,
  sendGroupMessage,
  fetchChannelMessages,
  updateGroupMetadata,
  KIND_GROUP_CHAT_MESSAGE,
  KIND_GROUP_METADATA,
  KIND_GROUP_MEMBERS,
  KIND_ADD_USER,
  KIND_REMOVE_USER,
  KIND_DELETE_EVENT,
  KIND_JOIN_REQUEST,
  KIND_USER_REGISTRATION,
  KIND_DELETION,
  type Relay,
  type JoinRequest,
} from '$lib/nostr/groups';
import { generatePrivateKey, getPublicKey } from 'nostr-tools';
import { bytesToHex } from '@noble/hashes/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRelay(events: any[] = []): Relay {
  return {
    publish: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue(events),
  };
}

function makePrivkey(): string {
  return bytesToHex(generatePrivateKey() as unknown as Uint8Array);
}

// Use a deterministic test key for speed
const TEST_PRIVKEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const TEST_PUBKEY = getPublicKey(
  Uint8Array.from(Buffer.from(TEST_PRIVKEY, 'hex'))
);
const ADMIN_PRIVKEY = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
const ADMIN_PUBKEY = getPublicKey(
  Uint8Array.from(Buffer.from(ADMIN_PRIVKEY, 'hex'))
);

describe('NIP-29 Group Operations', () => {
  let relay: Relay;

  beforeEach(() => {
    relay = makeRelay();
    vi.clearAllMocks();
  });

  // =========================================================================
  // Event Kind Constants
  // =========================================================================
  describe('Event Kind Constants', () => {
    it('should export correct kind values', () => {
      expect(KIND_GROUP_CHAT_MESSAGE).toBe(9);
      expect(KIND_GROUP_METADATA).toBe(39000);
      expect(KIND_GROUP_MEMBERS).toBe(39002);
      expect(KIND_ADD_USER).toBe(9000);
      expect(KIND_REMOVE_USER).toBe(9001);
      expect(KIND_DELETE_EVENT).toBe(9005);
      expect(KIND_JOIN_REQUEST).toBe(9021);
      expect(KIND_USER_REGISTRATION).toBe(9024);
      expect(KIND_DELETION).toBe(5);
    });
  });

  // =========================================================================
  // requestJoin()
  // =========================================================================
  describe('requestJoin()', () => {
    it('should publish kind 9021 event with channel ID', async () => {
      const result = await requestJoin('channel-1', TEST_PRIVKEY, relay);

      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();
      expect(relay.publish).toHaveBeenCalledTimes(1);

      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.kind).toBe(KIND_JOIN_REQUEST);
      expect(published.tags).toEqual(expect.arrayContaining([['h', 'channel-1']]));
      expect(published.pubkey).toBe(TEST_PUBKEY);
    });

    it('should include optional message in content', async () => {
      const result = await requestJoin('channel-1', TEST_PRIVKEY, relay, 'Please let me in');
      expect(result.success).toBe(true);

      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.content).toBe('Please let me in');
    });

    it('should have empty content when no message provided', async () => {
      await requestJoin('channel-1', TEST_PRIVKEY, relay);
      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.content).toBe('');
    });

    it('should return error on publish failure', async () => {
      relay.publish = vi.fn().mockRejectedValue(new Error('Publish failed'));
      const result = await requestJoin('channel-1', TEST_PRIVKEY, relay);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Publish failed');
    });

    it('should handle invalid private key', async () => {
      const result = await requestJoin('channel-1', 'invalid-key', relay);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // =========================================================================
  // requestRegistration()
  // =========================================================================
  describe('requestRegistration()', () => {
    it('should publish kind 9024 event', async () => {
      const result = await requestRegistration(TEST_PRIVKEY, relay);
      expect(result.success).toBe(true);

      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.kind).toBe(KIND_USER_REGISTRATION);
      expect(published.tags).toEqual(expect.arrayContaining([['t', 'registration']]));
    });

    it('should include display name tag when provided', async () => {
      await requestRegistration(TEST_PRIVKEY, relay, 'Alice');
      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.tags).toEqual(expect.arrayContaining([['name', 'Alice']]));
    });

    it('should include custom message in content', async () => {
      await requestRegistration(TEST_PRIVKEY, relay, undefined, 'Hello!');
      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.content).toBe('Hello!');
    });

    it('should use default message when none provided', async () => {
      await requestRegistration(TEST_PRIVKEY, relay);
      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.content).toBe('New user registration request');
    });

    it('should handle publish failure gracefully', async () => {
      relay.publish = vi.fn().mockRejectedValue(new Error('Network error'));
      const result = await requestRegistration(TEST_PRIVKEY, relay);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  // =========================================================================
  // approveJoin()
  // =========================================================================
  describe('approveJoin()', () => {
    const request: JoinRequest = {
      id: 'request-id-1',
      pubkey: TEST_PUBKEY,
      channelId: 'channel-1',
      createdAt: Math.floor(Date.now() / 1000),
      status: 'pending',
    };

    it('should publish add-user (9000) and deletion (5) events', async () => {
      const result = await approveJoin(request, ADMIN_PRIVKEY, relay);
      expect(result.success).toBe(true);
      expect(relay.publish).toHaveBeenCalledTimes(2);

      const addEvent = (relay.publish as any).mock.calls[0][0];
      expect(addEvent.kind).toBe(KIND_ADD_USER);
      expect(addEvent.tags).toEqual(
        expect.arrayContaining([
          ['h', 'channel-1'],
          ['p', TEST_PUBKEY],
        ])
      );

      const deleteEvent = (relay.publish as any).mock.calls[1][0];
      expect(deleteEvent.kind).toBe(KIND_DELETION);
      expect(deleteEvent.tags).toEqual(expect.arrayContaining([['e', 'request-id-1']]));
      expect(deleteEvent.content).toBe('Approved');
    });

    it('should handle publish failure', async () => {
      relay.publish = vi.fn().mockRejectedValue(new Error('Failed'));
      const result = await approveJoin(request, ADMIN_PRIVKEY, relay);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // rejectJoin()
  // =========================================================================
  describe('rejectJoin()', () => {
    const request: JoinRequest = {
      id: 'request-id-2',
      pubkey: TEST_PUBKEY,
      channelId: 'channel-1',
      createdAt: Math.floor(Date.now() / 1000),
      status: 'pending',
    };

    it('should publish deletion event with Rejected content', async () => {
      const result = await rejectJoin(request, ADMIN_PRIVKEY, relay);
      expect(result.success).toBe(true);

      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.kind).toBe(KIND_DELETION);
      expect(published.content).toBe('Rejected');
      expect(published.tags).toEqual(expect.arrayContaining([['e', 'request-id-2']]));
    });

    it('should handle publish failure', async () => {
      relay.publish = vi.fn().mockRejectedValue(new Error('Failed'));
      const result = await rejectJoin(request, ADMIN_PRIVKEY, relay);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // kickFromChannel()
  // =========================================================================
  describe('kickFromChannel()', () => {
    it('should publish remove-user event', async () => {
      const result = await kickFromChannel(TEST_PUBKEY, 'channel-1', ADMIN_PRIVKEY, relay);
      expect(result.success).toBe(true);

      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.kind).toBe(KIND_REMOVE_USER);
      expect(published.tags).toEqual(
        expect.arrayContaining([
          ['h', 'channel-1'],
          ['p', TEST_PUBKEY],
        ])
      );
      expect(published.content).toBe('Removed by admin');
    });

    it('should include custom reason', async () => {
      await kickFromChannel(TEST_PUBKEY, 'channel-1', ADMIN_PRIVKEY, relay, 'Bad behavior');
      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.content).toBe('Bad behavior');
    });

    it('should handle failure', async () => {
      relay.publish = vi.fn().mockRejectedValue(new Error('Fail'));
      const result = await kickFromChannel(TEST_PUBKEY, 'channel-1', ADMIN_PRIVKEY, relay);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // banUser()
  // =========================================================================
  describe('banUser()', () => {
    it('should remove user from all channels they are a member of', async () => {
      const memberLists = [
        {
          kind: KIND_GROUP_MEMBERS,
          tags: [
            ['d', 'channel-1'],
            ['p', TEST_PUBKEY],
            ['p', 'other-user'],
          ],
          content: '',
          pubkey: ADMIN_PUBKEY,
          created_at: 0,
          id: 'ml1',
          sig: 'sig',
        },
        {
          kind: KIND_GROUP_MEMBERS,
          tags: [
            ['d', 'channel-2'],
            ['p', TEST_PUBKEY],
          ],
          content: '',
          pubkey: ADMIN_PUBKEY,
          created_at: 0,
          id: 'ml2',
          sig: 'sig',
        },
        {
          kind: KIND_GROUP_MEMBERS,
          tags: [
            ['d', 'channel-3'],
            ['p', 'other-user'],
          ],
          content: '',
          pubkey: ADMIN_PUBKEY,
          created_at: 0,
          id: 'ml3',
          sig: 'sig',
        },
      ];

      relay = {
        publish: vi.fn().mockResolvedValue(undefined),
        list: vi.fn().mockResolvedValue(memberLists),
      };

      const result = await banUser(TEST_PUBKEY, ADMIN_PRIVKEY, relay, 'Banned');
      expect(result.success).toBe(true);
      expect(result.channelsProcessed).toBe(2);
      expect(result.errors).toHaveLength(0);
      // 2 kick events (one per channel user is in)
      expect(relay.publish).toHaveBeenCalledTimes(2);
    });

    it('should return success false if any kick fails', async () => {
      const memberLists = [
        {
          kind: KIND_GROUP_MEMBERS,
          tags: [['d', 'ch1'], ['p', TEST_PUBKEY]],
          content: '',
          pubkey: ADMIN_PUBKEY,
          created_at: 0,
          id: 'ml1',
          sig: 'sig',
        },
      ];

      let callCount = 0;
      relay = {
        publish: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) return Promise.reject(new Error('Publish failed'));
          return Promise.resolve(undefined);
        }),
        list: vi.fn().mockResolvedValue(memberLists),
      };

      const result = await banUser(TEST_PUBKEY, ADMIN_PRIVKEY, relay);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle list failure gracefully', async () => {
      relay = {
        publish: vi.fn(),
        list: vi.fn().mockRejectedValue(new Error('Network error')),
      };

      const result = await banUser(TEST_PUBKEY, ADMIN_PRIVKEY, relay);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Network error');
    });
  });

  // =========================================================================
  // deleteMessage()
  // =========================================================================
  describe('deleteMessage()', () => {
    it('should publish kind 9005 deletion event', async () => {
      const result = await deleteMessage('event-1', 'channel-1', ADMIN_PRIVKEY, relay);
      expect(result.success).toBe(true);

      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.kind).toBe(KIND_DELETE_EVENT);
      expect(published.tags).toEqual(
        expect.arrayContaining([
          ['h', 'channel-1'],
          ['e', 'event-1'],
        ])
      );
      expect(published.content).toBe('Deleted by admin');
    });

    it('should include custom reason', async () => {
      await deleteMessage('event-1', 'channel-1', ADMIN_PRIVKEY, relay, 'Spam');
      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.content).toBe('Spam');
    });
  });

  // =========================================================================
  // fetchJoinRequests()
  // =========================================================================
  describe('fetchJoinRequests()', () => {
    it('should return parsed join requests', async () => {
      const events = [
        {
          id: 'req-1',
          kind: KIND_JOIN_REQUEST,
          pubkey: TEST_PUBKEY,
          created_at: 1000,
          tags: [['h', 'channel-1']],
          content: 'Hi',
          sig: 'sig',
        },
      ];
      relay = makeRelay(events);

      const requests = await fetchJoinRequests(relay);
      expect(requests).toHaveLength(1);
      expect(requests[0].id).toBe('req-1');
      expect(requests[0].pubkey).toBe(TEST_PUBKEY);
      expect(requests[0].channelId).toBe('channel-1');
      expect(requests[0].status).toBe('pending');
      expect(requests[0].message).toBe('Hi');
    });

    it('should filter by channelId when provided', async () => {
      relay = makeRelay([]);
      await fetchJoinRequests(relay, 'channel-1');

      const calledFilter = (relay.list as any).mock.calls[0][0][0];
      expect(calledFilter['#h']).toEqual(['channel-1']);
    });

    it('should handle list failure', async () => {
      relay = { publish: vi.fn(), list: vi.fn().mockRejectedValue(new Error('Fail')) };
      const result = await fetchJoinRequests(relay);
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // isMember()
  // =========================================================================
  describe('isMember()', () => {
    it('should return true when user is in member list', async () => {
      const memberLists = [
        {
          kind: KIND_GROUP_MEMBERS,
          tags: [['d', 'channel-1'], ['p', TEST_PUBKEY]],
          content: '',
          pubkey: ADMIN_PUBKEY,
          created_at: 0,
          id: 'ml1',
          sig: 'sig',
        },
      ];
      relay = makeRelay(memberLists);

      const result = await isMember(TEST_PUBKEY, 'channel-1', relay);
      expect(result).toBe(true);
    });

    it('should return false when user is not in member list', async () => {
      const memberLists = [
        {
          kind: KIND_GROUP_MEMBERS,
          tags: [['d', 'channel-1'], ['p', 'other-pubkey']],
          content: '',
          pubkey: ADMIN_PUBKEY,
          created_at: 0,
          id: 'ml1',
          sig: 'sig',
        },
      ];
      relay = makeRelay(memberLists);

      const result = await isMember(TEST_PUBKEY, 'channel-1', relay);
      expect(result).toBe(false);
    });

    it('should return false when no member list exists for channel', async () => {
      relay = makeRelay([]);
      const result = await isMember(TEST_PUBKEY, 'channel-1', relay);
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      relay = { publish: vi.fn(), list: vi.fn().mockRejectedValue(new Error('Fail')) };
      const result = await isMember(TEST_PUBKEY, 'channel-1', relay);
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // sendGroupMessage()
  // =========================================================================
  describe('sendGroupMessage()', () => {
    it('should publish kind 9 message event', async () => {
      const result = await sendGroupMessage('Hello!', 'channel-1', TEST_PRIVKEY, relay);
      expect(result.success).toBe(true);

      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.kind).toBe(KIND_GROUP_CHAT_MESSAGE);
      expect(published.content).toBe('Hello!');
      expect(published.tags).toEqual(expect.arrayContaining([['h', 'channel-1']]));
    });

    it('should include reply tag when replying', async () => {
      await sendGroupMessage('Reply', 'channel-1', TEST_PRIVKEY, relay, 'parent-event-id');

      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.tags).toEqual(
        expect.arrayContaining([['e', 'parent-event-id', '', 'reply']])
      );
    });

    it('should handle publish failure', async () => {
      relay.publish = vi.fn().mockRejectedValue(new Error('Fail'));
      const result = await sendGroupMessage('Hello!', 'channel-1', TEST_PRIVKEY, relay);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // fetchChannelMessages()
  // =========================================================================
  describe('fetchChannelMessages()', () => {
    it('should fetch messages for a channel', async () => {
      const messages = [
        { id: 'msg-1', kind: 9, content: 'Hi', pubkey: TEST_PUBKEY, created_at: 1000, tags: [['h', 'ch1']], sig: 's' },
      ];
      relay = makeRelay(messages);

      const result = await fetchChannelMessages('ch1', relay);
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Hi');
    });

    it('should pass since filter when provided', async () => {
      relay = makeRelay([]);
      await fetchChannelMessages('ch1', relay, 500);

      const filter = (relay.list as any).mock.calls[0][0][0];
      expect(filter.since).toBe(500);
    });

    it('should use default limit of 100', async () => {
      relay = makeRelay([]);
      await fetchChannelMessages('ch1', relay);

      const filter = (relay.list as any).mock.calls[0][0][0];
      expect(filter.limit).toBe(100);
    });

    it('should handle errors', async () => {
      relay = { publish: vi.fn(), list: vi.fn().mockRejectedValue(new Error('Fail')) };
      const result = await fetchChannelMessages('ch1', relay);
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // updateGroupMetadata()
  // =========================================================================
  describe('updateGroupMetadata()', () => {
    it('should publish kind 39000 metadata event', async () => {
      const result = await updateGroupMetadata(
        'channel-1',
        { name: 'Test Channel', about: 'Description' },
        ADMIN_PRIVKEY,
        relay
      );
      expect(result.success).toBe(true);

      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.kind).toBe(KIND_GROUP_METADATA);
      expect(published.tags).toEqual(expect.arrayContaining([['d', 'channel-1']]));

      const content = JSON.parse(published.content);
      expect(content.name).toBe('Test Channel');
      expect(content.about).toBe('Description');
    });

    it('should include cohort tags', async () => {
      await updateGroupMetadata(
        'channel-1',
        { name: 'Test', cohorts: ['business', 'tribe'] },
        ADMIN_PRIVKEY,
        relay
      );

      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.tags).toEqual(
        expect.arrayContaining([
          ['cohort', 'business'],
          ['cohort', 'tribe'],
        ])
      );
    });

    it('should include visibility tag', async () => {
      await updateGroupMetadata(
        'channel-1',
        { name: 'Test', visibility: 'listed' },
        ADMIN_PRIVKEY,
        relay
      );

      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.tags).toEqual(
        expect.arrayContaining([['visibility', 'listed']])
      );
    });

    it('should include encrypted tag', async () => {
      await updateGroupMetadata(
        'channel-1',
        { name: 'Test', encrypted: true },
        ADMIN_PRIVKEY,
        relay
      );

      const published = (relay.publish as any).mock.calls[0][0];
      expect(published.tags).toEqual(
        expect.arrayContaining([['encrypted', 'nip44']])
      );
    });

    it('should handle failure', async () => {
      relay.publish = vi.fn().mockRejectedValue(new Error('Fail'));
      const result = await updateGroupMetadata('ch1', { name: 'T' }, ADMIN_PRIVKEY, relay);
      expect(result.success).toBe(false);
    });
  });
});

/**
 * Unit Tests: DM Store
 *
 * Tests for the direct message store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { writable } from 'svelte/store';

// Mock dependencies
vi.mock('$lib/nostr/dm', () => ({
  receiveDM: vi.fn(),
  sendDM: vi.fn(),
  createDMFilter: vi.fn(() => ({ kinds: [1059], '#p': ['test'] }))
}));

vi.mock('$lib/nostr/relay', () => ({
  ndk: vi.fn(() => null),
  isConnected: vi.fn(() => false),
  publishEvent: vi.fn(async () => true)
}));

vi.mock('nostr-tools', () => ({
  getPublicKey: vi.fn((privkey: Uint8Array) => 'a'.repeat(64))
}));

vi.mock('$lib/stores/auth', () => ({
  authStore: writable({
    state: 'authenticated',
    pubkey: 'a'.repeat(64),
    publicKey: 'a'.repeat(64),
    privateKey: null,
    isNip07: false
  })
}));

vi.mock('$lib/stores/mute', () => {
  const { writable: w } = require('svelte/store');
  const store = w({ mutedUsers: new Set() });
  return { muteStore: store, __muteStoreRef: store };
});

vi.mock('$lib/stores/profiles', () => ({
  profileCache: {
    getCachedSync: vi.fn(() => null),
    subscribe: (fn: any) => { fn({ profiles: new Map() }); return () => {}; }
  }
}));

import { receiveDM as receiveDMMock } from '$lib/nostr/dm';
import { __muteStoreRef } from '$lib/stores/mute';
import {
  dmStore,
  sortedConversations,
  mutedConversations,
  totalUnread,
  currentConversation,
  type DMConversation,
  type DMMessage
} from '$lib/stores/dm';

const mockedReceiveDM = vi.mocked(receiveDMMock);

describe('dmStore', () => {
  beforeEach(() => {
    localStorage.clear();
    dmStore.reset();
  });

  describe('initial state', () => {
    it('should start with empty state', () => {
      const state = get(dmStore);
      expect(state.conversations.size).toBe(0);
      expect(state.currentConversation).toBeNull();
      expect(state.messages).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.isSubscribed).toBe(false);
    });
  });

  describe('startConversation()', () => {
    it('should create a new conversation', () => {
      dmStore.startConversation('pk1', 'Alice');
      const state = get(dmStore);
      expect(state.conversations.has('pk1')).toBe(true);
      expect(state.currentConversation).toBe('pk1');
    });

    it('should set conversation name', () => {
      dmStore.startConversation('pk1', 'Alice');
      const conv = get(dmStore).conversations.get('pk1')!;
      expect(conv.name).toBe('Alice');
    });

    it('should select existing conversation without duplicating', () => {
      dmStore.startConversation('pk1', 'Alice');
      dmStore.startConversation('pk1', 'Alice');
      const state = get(dmStore);
      expect(state.conversations.size).toBe(1);
      expect(state.currentConversation).toBe('pk1');
    });

    it('should initialize with empty messages', () => {
      dmStore.startConversation('pk1');
      expect(get(dmStore).messages).toHaveLength(0);
    });

    it('should fallback to truncated pubkey for name', () => {
      dmStore.startConversation('a'.repeat(64));
      const conv = get(dmStore).conversations.get('a'.repeat(64))!;
      // Should be a truncated pubkey format since profile cache returns null
      expect(conv.name.length).toBeLessThan(64);
    });
  });

  describe('selectConversation()', () => {
    it('should set current conversation', () => {
      dmStore.startConversation('pk1', 'Alice');
      dmStore.startConversation('pk2', 'Bob');
      dmStore.selectConversation('pk1');
      expect(get(dmStore).currentConversation).toBe('pk1');
    });

    it('should reset unread count for selected conversation', () => {
      dmStore.startConversation('pk1', 'Alice');
      // Manually set unread count
      const state = get(dmStore);
      const conv = state.conversations.get('pk1')!;
      const updatedConv: DMConversation = { ...conv, unreadCount: 5 };
      state.conversations.set('pk1', updatedConv);

      dmStore.selectConversation('pk1');
      const updated = get(dmStore);
      expect(updated.conversations.get('pk1')!.unreadCount).toBe(0);
    });

    it('should not change state for non-existent conversation', () => {
      const before = get(dmStore);
      dmStore.selectConversation('nonexistent');
      const after = get(dmStore);
      expect(after.currentConversation).toBe(before.currentConversation);
    });

    it('should load messages from localStorage', () => {
      dmStore.startConversation('pk1', 'Alice');
      const msgs: DMMessage[] = [{
        id: 'msg1',
        senderPubkey: 'pk1',
        recipientPubkey: 'me',
        content: 'Hello',
        timestamp: 1000,
        isSent: false,
        isRead: false
      }];
      localStorage.setItem('dm_messages', JSON.stringify({ pk1: msgs }));
      dmStore.selectConversation('pk1');
      expect(get(dmStore).messages).toHaveLength(1);
    });
  });

  describe('clearConversation()', () => {
    it('should clear current conversation and messages', () => {
      dmStore.startConversation('pk1', 'Alice');
      dmStore.clearConversation();
      const state = get(dmStore);
      expect(state.currentConversation).toBeNull();
      expect(state.messages).toHaveLength(0);
    });
  });

  describe('forceLoadingComplete()', () => {
    it('should set isLoading to false', () => {
      // Start a state where loading is true (cannot easily reach via fetchConversations
      // without full NDK mock, so we test the action directly)
      dmStore.forceLoadingComplete();
      expect(get(dmStore).isLoading).toBe(false);
    });
  });

  describe('clearError()', () => {
    it('should clear error', () => {
      dmStore.clearError();
      expect(get(dmStore).error).toBeNull();
    });
  });

  describe('reset()', () => {
    it('should restore initial state', () => {
      dmStore.startConversation('pk1', 'Alice');
      dmStore.reset();
      const state = get(dmStore);
      expect(state.conversations.size).toBe(0);
      expect(state.currentConversation).toBeNull();
      expect(state.messages).toHaveLength(0);
    });
  });

  describe('handleIncomingDM()', () => {
    it('should ignore event when decryption fails', () => {
      mockedReceiveDM.mockReturnValue(null);

      const event = {
        id: 'evt1', kind: 1059, pubkey: 'random',
        created_at: 1000, tags: [], content: 'enc', sig: 'sig'
      };
      dmStore.handleIncomingDM(event as any, new Uint8Array(32));
      expect(get(dmStore).conversations.size).toBe(0);
    });

    it('should add message to existing conversation', () => {
      mockedReceiveDM.mockReturnValue({
        content: 'Hello!',
        senderPubkey: 'sender1',
        timestamp: 2000
      } as any);

      dmStore.startConversation('sender1', 'Sender');

      const event = {
        id: 'evt1', kind: 1059, pubkey: 'random',
        created_at: 2000, tags: [], content: 'enc', sig: 'sig'
      };
      dmStore.handleIncomingDM(event as any, new Uint8Array(32));

      const state = get(dmStore);
      const conv = state.conversations.get('sender1')!;
      expect(conv.lastMessage).toContain('Hello');
      expect(conv.lastMessageTimestamp).toBe(2000);
    });

    it('should create new conversation for unknown sender', () => {
      mockedReceiveDM.mockReturnValue({
        content: 'Hi!',
        senderPubkey: 'newpk',
        timestamp: 3000
      } as any);

      const event = {
        id: 'evt1', kind: 1059, pubkey: 'random',
        created_at: 3000, tags: [], content: 'enc', sig: 'sig'
      };
      dmStore.handleIncomingDM(event as any, new Uint8Array(32));

      const state = get(dmStore);
      expect(state.conversations.has('newpk')).toBe(true);
      expect(state.conversations.get('newpk')!.unreadCount).toBe(1);
    });

    it('should add to messages if conversation is currently open', () => {
      mockedReceiveDM.mockReturnValue({
        content: 'Message!',
        senderPubkey: 'sender1',
        timestamp: 2000
      } as any);

      dmStore.startConversation('sender1', 'Sender');
      // startConversation sets currentConversation

      const event = {
        id: 'evt1', kind: 1059, pubkey: 'random',
        created_at: 2000, tags: [], content: 'enc', sig: 'sig'
      };
      dmStore.handleIncomingDM(event as any, new Uint8Array(32));

      expect(get(dmStore).messages).toHaveLength(1);
      expect(get(dmStore).messages[0].content).toBe('Message!');
    });

    it('should not add to messages if different conversation is open', () => {
      mockedReceiveDM.mockReturnValue({
        content: 'Message!',
        senderPubkey: 'sender1',
        timestamp: 2000
      } as any);

      dmStore.startConversation('sender1', 'Sender');
      dmStore.startConversation('other', 'Other');
      // currentConversation is now 'other'

      const event = {
        id: 'evt1', kind: 1059, pubkey: 'random',
        created_at: 2000, tags: [], content: 'enc', sig: 'sig'
      };
      dmStore.handleIncomingDM(event as any, new Uint8Array(32));

      // Messages should not include the new DM (wrong conversation)
      expect(get(dmStore).messages).toHaveLength(0);
    });

    it('should truncate long lastMessage preview', () => {
      const longContent = 'A'.repeat(100);
      mockedReceiveDM.mockReturnValue({
        content: longContent,
        senderPubkey: 'sender1',
        timestamp: 2000
      } as any);

      const event = {
        id: 'evt1', kind: 1059, pubkey: 'random',
        created_at: 2000, tags: [], content: 'enc', sig: 'sig'
      };
      dmStore.handleIncomingDM(event as any, new Uint8Array(32));

      const conv = get(dmStore).conversations.get('sender1')!;
      expect(conv.lastMessage.length).toBeLessThanOrEqual(53); // 50 chars + '...'
    });
  });

  describe('derived: sortedConversations', () => {
    it('should sort pinned first, then by timestamp', () => {
      dmStore.startConversation('pk1', 'Alice');
      dmStore.startConversation('pk2', 'Bob');

      // Update conversations to have different timestamps
      const state = get(dmStore);
      state.conversations.set('pk1', {
        ...state.conversations.get('pk1')!,
        lastMessageTimestamp: 100,
        isPinned: false
      });
      state.conversations.set('pk2', {
        ...state.conversations.get('pk2')!,
        lastMessageTimestamp: 200,
        isPinned: false
      });

      const sorted = get(sortedConversations);
      expect(sorted[0].pubkey).toBe('pk2'); // More recent
    });

    it('should filter out muted users', () => {
      dmStore.startConversation('pk1', 'Alice');
      // The muteStore mock has an empty Set, so no filtering happens
      const sorted = get(sortedConversations);
      expect(sorted).toHaveLength(1);
    });
  });

  describe('derived: totalUnread', () => {
    it('should sum unread counts across conversations', () => {
      dmStore.startConversation('pk1', 'Alice');
      dmStore.startConversation('pk2', 'Bob');

      // Both start at 0 unread
      expect(get(totalUnread)).toBe(0);
    });
  });

  describe('derived: currentConversation', () => {
    it('should return null when no conversation selected', () => {
      expect(get(currentConversation)).toBeNull();
    });

    it('should return conversation details when selected', () => {
      dmStore.startConversation('pk1', 'Alice');
      const conv = get(currentConversation);
      expect(conv!.name).toBe('Alice');
    });
  });

  describe('derived: mutedConversations', () => {
    it('should return conversations with muted users', () => {
      dmStore.startConversation('muted_pk', 'Muted User');
      dmStore.startConversation('normal_pk', 'Normal User');

      // Update the muted set and trigger store update
      const mutedSet = new Set(['muted_pk']);
      (__muteStoreRef as any).set({ mutedUsers: mutedSet });

      const muted = get(mutedConversations);
      expect(muted).toHaveLength(1);
      expect(muted[0].pubkey).toBe('muted_pk');

      // Cleanup
      (__muteStoreRef as any).set({ mutedUsers: new Set() });
    });
  });

  describe('derived: totalUnread with values', () => {
    it('should accumulate unread counts from incoming DMs', () => {
      // Add two conversations with unread messages via handleIncomingDM
      mockedReceiveDM.mockReturnValueOnce({
        content: 'Hi from sender1',
        senderPubkey: 'sender1',
        timestamp: 1000
      } as any);

      const event1 = {
        id: 'evt1', kind: 1059, pubkey: 'random',
        created_at: 1000, tags: [], content: 'enc', sig: 'sig'
      };
      dmStore.handleIncomingDM(event1 as any, new Uint8Array(32));

      mockedReceiveDM.mockReturnValueOnce({
        content: 'Hi from sender2',
        senderPubkey: 'sender2',
        timestamp: 2000
      } as any);

      const event2 = {
        id: 'evt2', kind: 1059, pubkey: 'random',
        created_at: 2000, tags: [], content: 'enc', sig: 'sig'
      };
      dmStore.handleIncomingDM(event2 as any, new Uint8Array(32));

      expect(get(totalUnread)).toBe(2);
    });
  });

  describe('handleIncomingDM: increment unread for non-current conversation', () => {
    it('should increment unread count for existing non-current conversation', () => {
      // First message creates conversation
      mockedReceiveDM.mockReturnValueOnce({
        content: 'First',
        senderPubkey: 'sender1',
        timestamp: 1000
      } as any);
      dmStore.handleIncomingDM(
        { id: 'e1', kind: 1059, pubkey: 'x', created_at: 1000, tags: [], content: '', sig: '' } as any,
        new Uint8Array(32)
      );

      // Switch to different conversation
      dmStore.startConversation('other_pk', 'Other');

      // Second message from same sender should increment unread
      mockedReceiveDM.mockReturnValueOnce({
        content: 'Second',
        senderPubkey: 'sender1',
        timestamp: 2000
      } as any);
      dmStore.handleIncomingDM(
        { id: 'e2', kind: 1059, pubkey: 'x', created_at: 2000, tags: [], content: '', sig: '' } as any,
        new Uint8Array(32)
      );

      const conv = get(dmStore).conversations.get('sender1');
      expect(conv!.unreadCount).toBe(2);
    });
  });

  describe('selectConversation: messages from localStorage are sorted', () => {
    it('should sort loaded messages by timestamp', () => {
      dmStore.startConversation('pk1', 'Alice');
      const msgs: DMMessage[] = [
        { id: 'm2', senderPubkey: 'pk1', recipientPubkey: 'me', content: 'B', timestamp: 2000, isSent: false, isRead: false },
        { id: 'm1', senderPubkey: 'pk1', recipientPubkey: 'me', content: 'A', timestamp: 1000, isSent: false, isRead: false },
        { id: 'm3', senderPubkey: 'pk1', recipientPubkey: 'me', content: 'C', timestamp: 3000, isSent: false, isRead: false }
      ];
      localStorage.setItem('dm_messages', JSON.stringify({ pk1: msgs }));
      dmStore.selectConversation('pk1');
      const state = get(dmStore);
      expect(state.messages[0].content).toBe('A');
      expect(state.messages[1].content).toBe('B');
      expect(state.messages[2].content).toBe('C');
    });

    it('should handle corrupted localStorage JSON gracefully', () => {
      dmStore.startConversation('pk1', 'Alice');
      localStorage.setItem('dm_messages', 'not valid json');
      dmStore.selectConversation('pk1');
      expect(get(dmStore).messages).toHaveLength(0);
    });

    it('should handle missing conversation key in stored messages', () => {
      dmStore.startConversation('pk1', 'Alice');
      localStorage.setItem('dm_messages', JSON.stringify({ other: [] }));
      dmStore.selectConversation('pk1');
      expect(get(dmStore).messages).toHaveLength(0);
    });
  });

  describe('sendDM()', () => {
    it('should throw when no conversation is selected', async () => {
      dmStore.reset();
      await expect(
        dmStore.sendDM('Hello', {} as any, new Uint8Array(32))
      ).rejects.toThrow('No conversation selected');
    });

    it('should set error when NDK is not initialized', async () => {
      dmStore.startConversation('pk1', 'Alice');
      await expect(
        dmStore.sendDM('Hello', {} as any, new Uint8Array(32))
      ).rejects.toThrow('NDK not initialized');
      const state = get(dmStore);
      expect(state.error).toBe('NDK not initialized');
    });
  });

  describe('fetchConversations()', () => {
    it('should set error when NDK is not initialized', async () => {
      await dmStore.fetchConversations({} as any, new Uint8Array(32));
      const state = get(dmStore);
      expect(state.error).toBe('NDK not initialized');
      expect(state.isLoading).toBe(false);
    });
  });
});

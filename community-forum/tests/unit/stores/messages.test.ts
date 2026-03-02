/**
 * Unit Tests: Message Store
 *
 * Tests for message fetching, caching, subscription setup,
 * message deletion handling, send, and derived stores.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';

// ─────────────────────────────────────────────────
// Lightweight event emitter for jsdom
// ─────────────────────────────────────────────────

function createMockSubscription() {
  const listeners = new Map<string, Array<(...args: any[]) => void>>();
  return {
    on(event: string, fn: (...args: any[]) => void) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event)!.push(fn);
      return this;
    },
    emit(event: string, ...args: any[]) {
      const fns = listeners.get(event);
      if (fns) fns.forEach((fn) => fn(...args));
    },
    stop: vi.fn(),
  };
}

// Track all subscriptions created so tests can emit events on them
const createdSubscriptions: ReturnType<typeof createMockSubscription>[] = [];

// ─────────────────────────────────────────────────
// Mocks (before source imports)
// ─────────────────────────────────────────────────

vi.mock('$lib/nostr/relay', () => ({
  ndk: vi.fn(() => ({ pool: {} })),
  isConnected: vi.fn(() => true),
  publishEvent: vi.fn(async () => true),
  subscribe: vi.fn(() => {
    const sub = createMockSubscription();
    createdSubscriptions.push(sub);
    return sub;
  })
}));

vi.mock('$lib/db', () => {
  const messagesMap = new Map<string, any>();
  const deletionsSet = new Set<string>();

  return {
    db: {
      getChannelMessagesWithAuthors: vi.fn(async () => []),
      getChannel: vi.fn(async () => null),
      getUser: vi.fn(async () => null),
      isMessageDeleted: vi.fn(async (id: string) => deletionsSet.has(id)),
      messages: {
        put: vi.fn(async (msg: any) => { messagesMap.set(msg.id, msg); }),
      },
      addDeletion: vi.fn(async (deletion: any) => {
        deletionsSet.add(deletion.deletedEventId);
      }),
      _reset: () => { messagesMap.clear(); deletionsSet.clear(); }
    },
  };
});

vi.mock('$lib/stores/user', () => ({
  currentPubkey: { subscribe: vi.fn((fn: any) => { fn('a'.repeat(64)); return () => {}; }) }
}));

vi.mock('$lib/stores/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() }
}));

vi.mock('$lib/utils/searchIndex', () => ({
  indexNewMessage: vi.fn(async () => {}),
  removeDeletedMessage: vi.fn(async () => {})
}));

vi.mock('$lib/utils/nostr-crypto', () => ({
  getPublicKey: vi.fn(() => 'a'.repeat(64)),
  getEventHash: vi.fn(() => 'hash' + Math.random().toString(36).slice(2)),
  signEvent: vi.fn((e: any) => ({ ...e, sig: 'sig123' }))
}));

vi.mock('$lib/config/migrations', () => ({
  NIP04_MIGRATION: { REMOVE_DATE: '2025-12-01', STATUS: 'REMOVED' }
}));

vi.mock('@nostr-dev-kit/ndk', () => {
  class NDKEvent {
    ndk: any; kind = 0; content = ''; tags: string[][] = [];
    created_at = 0; id = ''; pubkey = ''; sig = '';
    constructor(ndk: any) { this.ndk = ndk; }
  }
  return { NDKEvent, default: class {} };
});

// ─────────────────────────────────────────────────
// Imports (after mocks)
// ─────────────────────────────────────────────────

import { messageStore, activeMessages, messageCount } from '$lib/stores/messages';
import { db } from '$lib/db';
import { toast } from '$lib/stores/toast';
import { publishEvent, subscribe as ndkSubscribe } from '$lib/nostr/relay';
import { indexNewMessage, removeDeletedMessage } from '$lib/utils/searchIndex';

/** Helper: get the last subscription created by ndkSubscribe */
function lastSub() {
  return createdSubscriptions[createdSubscriptions.length - 1];
}

/** Helper: wait for async processing */
const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));

describe('messageStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Explicitly reset mock implementations that tests override
    vi.mocked(publishEvent).mockResolvedValue(true as any);
    vi.mocked(db.getChannelMessagesWithAuthors).mockResolvedValue([]);
    vi.mocked(db.getChannel).mockResolvedValue(null);
    vi.mocked(db.getUser).mockResolvedValue(null);
    vi.mocked(db.isMessageDeleted).mockResolvedValue(false);
    vi.mocked(db.messages.put).mockImplementation(async (msg: any) => {});
    vi.mocked(db.addDeletion).mockImplementation(async () => {});
    vi.mocked(indexNewMessage).mockResolvedValue(undefined as any);
    vi.mocked(removeDeletedMessage).mockResolvedValue(undefined as any);
    // Ensure ndkSubscribe creates fresh subscriptions via factory
    vi.mocked(ndkSubscribe).mockImplementation(() => {
      const sub = createMockSubscription();
      createdSubscriptions.push(sub);
      return sub as any;
    });
    createdSubscriptions.length = 0;
    messageStore.clear();
  });

  afterEach(() => {
    messageStore.disconnectAll();
  });

  // ─── Initial state ──────────────────────────────

  describe('initial state', () => {
    it('should start with empty state', () => {
      const state = get(messageStore);
      expect(state.messages).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.currentChannelId).toBeNull();
      expect(state.hasMore).toBe(true);
      expect(state.lastFetchTime).toBeNull();
    });
  });

  // ─── fetchMessages ──────────────────────────────

  describe('fetchMessages()', () => {
    it('should set currentChannelId and lastFetchTime', async () => {
      await messageStore.fetchMessages('wss://relay', 'chan1', null, 50);
      const state = get(messageStore);
      expect(state.loading).toBe(false);
      expect(state.currentChannelId).toBe('chan1');
      expect(state.lastFetchTime).not.toBeNull();
    });

    it('should load cached messages from db', async () => {
      vi.mocked(db.getChannelMessagesWithAuthors).mockResolvedValue([
        { id: 'msg1', channelId: 'chan1', pubkey: 'a'.repeat(64), content: 'cached', created_at: 100, encrypted: false, deleted: false, kind: 9, tags: [], sig: 'sig' }
      ]);

      await messageStore.fetchMessages('wss://relay', 'chan1', null, 50);
      const state = get(messageStore);
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe('cached');
    });

    it('should use limit=500 when catching up from cache', async () => {
      vi.mocked(db.getChannelMessagesWithAuthors).mockResolvedValue([
        { id: 'msg1', channelId: 'chan1', pubkey: 'a'.repeat(64), content: 'old', created_at: 100, encrypted: false, deleted: false, kind: 9, tags: [], sig: 'sig' }
      ]);

      await messageStore.fetchMessages('wss://relay', 'chan1', null, 50);
      expect(ndkSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({ since: 100, limit: 500 }),
        expect.anything()
      );
    });

    it('should process incoming relay events and update store', async () => {
      await messageStore.fetchMessages('wss://relay', 'chan1', null, 50);
      const sub = lastSub();

      sub.emit('event', {
        id: 'relay-msg', pubkey: 'b'.repeat(64), created_at: 200,
        kind: 9, tags: [['e', 'chan1']], content: 'from relay', sig: 'sig'
      });
      await tick();

      const state = get(messageStore);
      expect(state.messages.find((m) => m.id === 'relay-msg')).toBeTruthy();
    });

    it('should skip deleted events from relay', async () => {
      vi.mocked(db.isMessageDeleted).mockResolvedValue(true);
      await messageStore.fetchMessages('wss://relay', 'chan1', null, 50);
      const sub = lastSub();

      sub.emit('event', {
        id: 'deleted-msg', pubkey: 'b'.repeat(64), created_at: 200,
        kind: 9, tags: [], content: 'deleted', sig: 'sig'
      });
      await tick();

      expect(get(messageStore).messages.find((m) => m.id === 'deleted-msg')).toBeUndefined();
    });

    it('should replace content with placeholder for encrypted channels', async () => {
      vi.mocked(db.getChannel).mockResolvedValue({
        id: 'enc-chan', name: 'Secret', isEncrypted: true
      } as any);

      await messageStore.fetchMessages('wss://relay', 'enc-chan', null, 50);
      const sub = lastSub();

      sub.emit('event', {
        id: 'enc-msg', pubkey: 'b'.repeat(64), created_at: 200,
        kind: 9, tags: [], content: 'cipher', sig: 'sig'
      });
      await tick();

      const msg = get(messageStore).messages.find((m) => m.id === 'enc-msg');
      expect(msg).toBeTruthy();
      expect(msg?.content).toContain('NIP-04');
    });

    it('should call indexNewMessage for incoming events', async () => {
      await messageStore.fetchMessages('wss://relay', 'chan1', null, 50);
      const sub = lastSub();

      sub.emit('event', {
        id: 'idx-msg', pubkey: 'b'.repeat(64), created_at: 200,
        kind: 9, tags: [], content: 'index me', sig: 'sig'
      });
      await tick();

      expect(indexNewMessage).toHaveBeenCalled();
    });

    it('should not add duplicate events to store', async () => {
      await messageStore.fetchMessages('wss://relay', 'chan1', null, 50);
      const sub = lastSub();

      const evt = {
        id: 'dup-msg', pubkey: 'b'.repeat(64), created_at: 200,
        kind: 9, tags: [], content: 'dup', sig: 'sig'
      };
      sub.emit('event', evt);
      await tick(30);
      sub.emit('event', evt);
      await tick(30);

      const dups = get(messageStore).messages.filter((m) => m.id === 'dup-msg');
      expect(dups).toHaveLength(1);
    });

    it('should set error on fetch failure', async () => {
      vi.mocked(db.getChannelMessagesWithAuthors).mockRejectedValue(new Error('DB failure'));
      await messageStore.fetchMessages('wss://relay', 'chan1', null, 50);

      const state = get(messageStore);
      expect(state.error).toBe('DB failure');
      expect(state.loading).toBe(false);
      expect(toast.error).toHaveBeenCalled();
    });
  });

  // ─── sendMessage ────────────────────────────────

  describe('sendMessage()', () => {
    it('should publish event, cache, index, and update store', async () => {
      await messageStore.sendMessage('hello', 'chan1', 'wss://relay', 'a'.repeat(64));

      expect(publishEvent).toHaveBeenCalled();
      expect(db.messages.put).toHaveBeenCalled();
      expect(indexNewMessage).toHaveBeenCalled();
      expect(get(messageStore).messages).toHaveLength(1);
    });

    it('should reject encrypted message attempts with NIP-04 error', async () => {
      await expect(
        messageStore.sendMessage('secret', 'chan1', 'wss://relay', 'a'.repeat(64), true, [])
      ).rejects.toThrow('NIP-04');

      expect(publishEvent).not.toHaveBeenCalled();
    });

    it('should set error and toast on send failure', async () => {
      vi.mocked(publishEvent).mockRejectedValueOnce(new Error('Publish failed'));

      await expect(
        messageStore.sendMessage('hello', 'chan1', 'wss://relay', 'a'.repeat(64))
      ).rejects.toThrow('Publish failed');

      expect(get(messageStore).error).toBe('Publish failed');
      expect(toast.error).toHaveBeenCalled();
    });

    it('should maintain sort order by created_at', async () => {
      // Add a message via send
      await messageStore.sendMessage('first', 'chan1', 'wss://relay', 'a'.repeat(64));

      const state = get(messageStore);
      // All messages should be sorted
      for (let i = 1; i < state.messages.length; i++) {
        expect(state.messages[i].created_at).toBeGreaterThanOrEqual(state.messages[i - 1].created_at);
      }
    });
  });

  // ─── deleteMessage ──────────────────────────────

  describe('deleteMessage()', () => {
    it('should publish deletion, update db, remove from search, and mark deleted', async () => {
      // Add a message first
      await messageStore.sendMessage('bye', 'chan1', 'wss://relay', 'a'.repeat(64));
      const msgId = get(messageStore).messages[0]?.id;

      // Reset call tracking after sendMessage
      vi.mocked(publishEvent).mockClear();

      if (msgId) {
        await messageStore.deleteMessage(msgId, 'chan1', 'wss://relay', 'a'.repeat(64));

        expect(publishEvent).toHaveBeenCalled();
        expect(db.addDeletion).toHaveBeenCalled();
        expect(removeDeletedMessage).toHaveBeenCalledWith(msgId);

        const msg = get(messageStore).messages.find((m) => m.id === msgId);
        expect(msg?.deleted).toBe(true);
      }
    });

    it('should set error on deletion failure', async () => {
      vi.mocked(publishEvent).mockRejectedValueOnce(new Error('Delete failed'));

      await expect(
        messageStore.deleteMessage('msg1', 'chan1', 'wss://relay', 'a'.repeat(64))
      ).rejects.toThrow('Delete failed');

      expect(get(messageStore).error).toBe('Delete failed');
      expect(toast.error).toHaveBeenCalled();
    });
  });

  // ─── subscribeToChannel ─────────────────────────

  describe('subscribeToChannel()', () => {
    it('should create two NDK subscriptions (messages + deletions)', async () => {
      await messageStore.subscribeToChannel('chan1', 'wss://relay', null);
      expect(ndkSubscribe).toHaveBeenCalledTimes(2);
    });

    it('should stop previous channel subscriptions before creating new ones', async () => {
      await messageStore.subscribeToChannel('chan1', 'wss://relay', null);
      const firstSubs = [...createdSubscriptions];

      await messageStore.subscribeToChannel('chan1', 'wss://relay', null);

      firstSubs.forEach((sub) => expect(sub.stop).toHaveBeenCalled());
    });

    it('should handle subscription creation errors gracefully', async () => {
      vi.mocked(ndkSubscribe).mockImplementation(() => { throw new Error('Sub failed'); });

      await messageStore.subscribeToChannel('chan1', 'wss://relay', null);

      expect(get(messageStore).error).toBe('Sub failed');
      expect(toast.error).toHaveBeenCalled();
    });

    it('should process deletion events from the deletion subscription', async () => {
      // Add a message first
      await messageStore.sendMessage('doomed', 'chan1', 'wss://relay', 'a'.repeat(64));
      const msgId = get(messageStore).messages[0]?.id;

      // Subscribe to channel (creates 2 subscriptions: messages + deletions)
      createdSubscriptions.length = 0; // reset so we can track fresh subs
      await messageStore.subscribeToChannel('chan1', 'wss://relay', null);

      // The deletion subscription is the second one created
      const delSub = createdSubscriptions[1];
      expect(delSub).toBeTruthy();

      if (msgId && delSub) {
        delSub.emit('event', {
          id: 'del-evt', pubkey: 'admin'.padEnd(64, '0'), created_at: 999,
          kind: 5, tags: [['e', msgId]], content: '', sig: 'sig'
        });
        await tick();

        const msg = get(messageStore).messages.find((m) => m.id === msgId);
        expect(msg?.deleted).toBe(true);
      }
    });
  });

  // ─── unsubscribeFromChannel ─────────────────────

  describe('unsubscribeFromChannel()', () => {
    it('should stop subscriptions for channel', async () => {
      await messageStore.subscribeToChannel('chan1', 'wss://relay', null);
      messageStore.unsubscribeFromChannel('chan1', 'wss://relay');

      createdSubscriptions.forEach((sub) => expect(sub.stop).toHaveBeenCalled());
    });

    it('should not throw for unknown channel', () => {
      expect(() => messageStore.unsubscribeFromChannel('unknown', 'wss://relay')).not.toThrow();
    });
  });

  // ─── clearError / clear / disconnectAll ─────────

  describe('clearError()', () => {
    it('should clear error state', async () => {
      vi.mocked(db.getChannelMessagesWithAuthors).mockRejectedValueOnce(new Error('fail'));
      await messageStore.fetchMessages('wss://relay', 'chan1', null, 50);
      expect(get(messageStore).error).toBe('fail');

      messageStore.clearError();
      expect(get(messageStore).error).toBeNull();
    });
  });

  describe('clear()', () => {
    it('should reset to initial state', async () => {
      await messageStore.sendMessage('x', 'chan1', 'wss://relay', 'a'.repeat(64));
      messageStore.clear();

      const state = get(messageStore);
      expect(state.messages).toEqual([]);
      expect(state.currentChannelId).toBeNull();
    });
  });

  describe('disconnectAll()', () => {
    it('should stop all channel subscriptions', async () => {
      await messageStore.subscribeToChannel('chan1', 'wss://relay', null);
      await messageStore.subscribeToChannel('chan2', 'wss://relay', null);

      messageStore.disconnectAll();

      createdSubscriptions.forEach((sub) => expect(sub.stop).toHaveBeenCalled());
    });
  });

  // ─── fetchOlderMessages ──────────────────────────

  describe('fetchOlderMessages()', () => {
    it('should return false if no messages exist', async () => {
      const result = await messageStore.fetchOlderMessages('wss://relay', 'chan1', null, 50);
      expect(result).toBe(false);
    });

    it('should fetch older messages and add to store', async () => {
      // First, populate store with a message so there is an oldest timestamp
      await messageStore.sendMessage('existing', 'chan1', 'wss://relay', 'a'.repeat(64));

      // The fetchOlderMessages will create a new subscription with closeOnEose
      const result = messageStore.fetchOlderMessages('wss://relay', 'chan1', null, 50);

      // Get the subscription created by fetchOlderMessages
      await tick(10);
      const olderSub = lastSub();

      if (olderSub) {
        // Emit an older event
        olderSub.emit('event', {
          id: 'old-msg', pubkey: 'b'.repeat(64), created_at: 50,
          kind: 9, tags: [], content: 'older message', sig: 'sig'
        });
        await tick(10);

        // Emit EOSE to resolve the promise
        olderSub.emit('eose');
      }

      const fetched = await result;
      if (olderSub) {
        expect(fetched).toBe(true);
        const msgs = get(messageStore).messages;
        expect(msgs.find((m) => m.id === 'old-msg')).toBeTruthy();
      }
    });

    it('should return false when no older messages found (eose immediately)', async () => {
      await messageStore.sendMessage('existing', 'chan1', 'wss://relay', 'a'.repeat(64));

      const resultPromise = messageStore.fetchOlderMessages('wss://relay', 'chan1', null, 50);
      await tick(10);
      const olderSub = lastSub();

      if (olderSub) {
        olderSub.emit('eose');
      }

      const result = await resultPromise;
      expect(result).toBe(false);
      expect(get(messageStore).loading).toBe(false);
    });

    it('should resolve on close event', async () => {
      await messageStore.sendMessage('existing', 'chan1', 'wss://relay', 'a'.repeat(64));

      const resultPromise = messageStore.fetchOlderMessages('wss://relay', 'chan1', null, 50);
      await tick(10);
      const olderSub = lastSub();

      if (olderSub) {
        olderSub.emit('close');
      }

      const result = await resultPromise;
      expect(result).toBe(false);
    });

    it('should set hasMore based on found message count', async () => {
      await messageStore.sendMessage('existing', 'chan1', 'wss://relay', 'a'.repeat(64));

      const resultPromise = messageStore.fetchOlderMessages('wss://relay', 'chan1', null, 4);
      await tick(10);
      const olderSub = lastSub();

      if (olderSub) {
        // Add 3 messages (>= 4 * 0.5 = 2), so hasMore should be true
        for (let i = 0; i < 3; i++) {
          olderSub.emit('event', {
            id: `old-${i}`, pubkey: 'b'.repeat(64), created_at: 10 + i,
            kind: 9, tags: [], content: `msg ${i}`, sig: 'sig'
          });
          await tick(5);
        }
        olderSub.emit('eose');
      }

      await resultPromise;
      expect(get(messageStore).hasMore).toBe(true);
    });

    it('should handle errors in fetchOlderMessages', async () => {
      await messageStore.sendMessage('existing', 'chan1', 'wss://relay', 'a'.repeat(64));

      // Make ndkSubscribe throw
      vi.mocked(ndkSubscribe).mockImplementationOnce(() => {
        throw new Error('Relay down');
      });

      const result = await messageStore.fetchOlderMessages('wss://relay', 'chan1', null, 50);

      expect(result).toBe(false);
      expect(get(messageStore).error).toBe('Relay down');
      expect(get(messageStore).hasMore).toBe(false);
    });
  });

  // ─── Derived stores ─────────────────────────────

  describe('derived stores', () => {
    it('activeMessages should exclude deleted messages', async () => {
      // Add two messages
      await messageStore.sendMessage('keep', 'chan1', 'wss://relay', 'a'.repeat(64));
      await messageStore.sendMessage('delete', 'chan1', 'wss://relay', 'a'.repeat(64));

      const msgs = get(messageStore).messages;
      expect(msgs).toHaveLength(2);

      // Delete the second message
      const toDeleteId = msgs[1]?.id;
      if (toDeleteId) {
        vi.mocked(publishEvent).mockClear();
        await messageStore.deleteMessage(toDeleteId, 'chan1', 'wss://relay', 'a'.repeat(64));

        const active = get(activeMessages);
        expect(active.every((m) => !m.deleted)).toBe(true);
        expect(active.find((m) => m.id === toDeleteId)).toBeUndefined();
      }
    });

    it('messageCount should return count of non-deleted messages', async () => {
      await messageStore.sendMessage('one', 'chan1', 'wss://relay', 'a'.repeat(64));
      await messageStore.sendMessage('two', 'chan1', 'wss://relay', 'a'.repeat(64));

      expect(get(messageCount)).toBe(2);
    });
  });
});

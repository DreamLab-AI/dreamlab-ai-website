/**
 * Unit Tests: Reactions Store
 *
 * Tests for the message reactions store including fetch, add, remove,
 * subscribe, optimistic updates, and error handling.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { writable } from 'svelte/store';

// Use vi.hoisted so the mock fn is available when vi.mock factories run (they are hoisted)
const { mockNdkSubscribe, mockPublishEvent } = vi.hoisted(() => ({
  mockNdkSubscribe: vi.fn(),
  mockPublishEvent: vi.fn()
}));

vi.mock('$lib/nostr/relay', () => ({
  ndk: vi.fn(() => ({
    subscribe: mockNdkSubscribe
  })),
  isConnected: vi.fn(() => true),
  publishEvent: mockPublishEvent,
  subscribe: mockNdkSubscribe
}));

// Mock auth store
vi.mock('$lib/stores/auth', () => ({
  authStore: writable({
    state: 'authenticated',
    publicKey: 'user-pubkey',
    privateKey: 'user-privkey',
    isNip07: false
  })
}));

// Mock nostr reactions
vi.mock('$lib/nostr/reactions', () => ({
  parseReactionEvent: vi.fn((event: any) => {
    if (!event.tags?.find((t: string[]) => t[0] === 'e')) return null;
    return {
      eventId: event.tags.find((t: string[]) => t[0] === 'e')[1],
      authorPubkey: '',
      content: event.content || '+',
      reactorPubkey: event.pubkey,
      timestamp: event.created_at,
      reactionEventId: event.id
    };
  }),
  groupReactionsByContent: vi.fn((reactions: any[]) => {
    const grouped = new Map<string, string[]>();
    reactions.forEach(r => {
      const reactors = grouped.get(r.content) || [];
      reactors.push(r.reactorPubkey);
      grouped.set(r.content, reactors);
    });
    return grouped;
  }),
  hasUserReacted: vi.fn(() => false),
  getUserReaction: vi.fn(() => null),
  getReactionsForEvent: vi.fn(() => []),
  normalizeReactionContent: vi.fn((s: string) => s === '+' || s === '' ? '+' : s)
}));

// Mock NDKEvent
vi.mock('@nostr-dev-kit/ndk', () => ({
  NDKEvent: vi.fn().mockImplementation(function(this: any) {
    this.kind = 0;
    this.created_at = Math.floor(Date.now() / 1000);
    this.tags = [];
    this.content = '';
    this.id = 'ndk-event-id';
    this.pubkey = 'user-pubkey';
    this.sig = '';
  })
}));

// Mock nostr event types
vi.mock('../../src/types/nostr', () => ({
  EventKind: { REACTION: 7 }
}));

import { reactionStore, getMessageReactions } from '$lib/stores/reactions';

/**
 * Helper: create a mock subscription that captures the event callback
 * and returns it for manual invocation.
 */
function createMockSubscription() {
  let eventCb: ((event: any) => void) | undefined;
  const mockSub = {
    on: vi.fn((name: string, cb: any) => {
      if (name === 'event') eventCb = cb;
    }),
    stop: vi.fn(),
  };
  mockNdkSubscribe.mockReturnValue(mockSub);
  return {
    mockSub,
    fireEvent: (event: any) => { if (eventCb) eventCb(event); },
  };
}

describe('reactionStore', () => {
  beforeEach(() => {
    // Disconnect all subs to prevent old callbacks from firing
    reactionStore.disconnectAll();
    reactionStore.clear();
    vi.clearAllMocks();
    mockPublishEvent.mockResolvedValue(true);
  });

  describe('initial state', () => {
    it('should start with empty state', () => {
      const state = get(reactionStore);
      expect(state.reactionsByMessage.size).toBe(0);
      expect(state.optimisticReactions.size).toBe(0);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should have empty activeSubscriptions', () => {
      const state = get(reactionStore);
      expect(state.activeSubscriptions.size).toBe(0);
    });
  });

  describe('getReactionSummary()', () => {
    it('should return empty summary for unknown message', () => {
      const summary = reactionStore.getReactionSummary('unknown-msg');
      expect(summary.messageId).toBe('unknown-msg');
      expect(summary.totalCount).toBe(0);
      expect(summary.reactions.size).toBe(0);
      expect(summary.userReaction).toBeNull();
    });
  });

  describe('fetchReactions()', () => {
    it('should do nothing for empty message IDs', async () => {
      await reactionStore.fetchReactions([], 'relay');
      expect(mockNdkSubscribe).not.toHaveBeenCalled();
    });

    it('should set loading state and subscribe for non-empty IDs', async () => {
      const { mockSub } = createMockSubscription();

      await reactionStore.fetchReactions(['msg1', 'msg2'], 'wss://relay.test');

      expect(mockNdkSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          kinds: [7],
          '#e': ['msg1', 'msg2'],
        }),
        expect.any(Object)
      );
    });

    it('should process incoming reaction events via subscription', async () => {
      const { fireEvent } = createMockSubscription();

      await reactionStore.fetchReactions(['msg1'], 'wss://relay.test');

      fireEvent({
        id: 'reaction-1',
        pubkey: 'reactor-pubkey',
        created_at: 1000,
        kind: 7,
        tags: [['e', 'msg1']],
        content: '+',
        sig: 'sig',
      });

      const state = get(reactionStore);
      const reactions = state.reactionsByMessage.get('msg1');
      expect(reactions).toBeDefined();
      expect(reactions!.length).toBe(1);
      expect(reactions![0].reactorPubkey).toBe('reactor-pubkey');
    });

    it('should not add duplicate reactions', async () => {
      const { fireEvent } = createMockSubscription();

      await reactionStore.fetchReactions(['msg1'], 'wss://relay.test');

      const mockEvent = {
        id: 'reaction-1',
        pubkey: 'reactor',
        created_at: 1000,
        kind: 7,
        tags: [['e', 'msg1']],
        content: '+',
        sig: 'sig',
      };

      fireEvent(mockEvent);
      fireEvent(mockEvent);

      const state = get(reactionStore);
      const reactions = state.reactionsByMessage.get('msg1');
      expect(reactions!.length).toBe(1);
    });

    it('should handle subscription errors', async () => {
      mockNdkSubscribe.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      await reactionStore.fetchReactions(['msg1'], 'wss://relay.test');

      const state = get(reactionStore);
      expect(state.error).toBe('Subscription failed');
      expect(state.loading).toBe(false);
    });
  });

  describe('addReaction()', () => {
    it('should throw when no signing method available', async () => {
      const { authStore } = await import('$lib/stores/auth');
      authStore.set({
        state: 'unauthenticated',
        publicKey: null,
        privateKey: null,
        isNip07: false
      } as any);

      await expect(
        reactionStore.addReaction('msg1', '+', 'relay')
      ).rejects.toThrow('No signing method available');

      authStore.set({
        state: 'authenticated',
        publicKey: 'user-pubkey',
        privateKey: 'user-privkey',
        isNip07: false
      } as any);
    });

    it('should add optimistic reaction and replace on success', async () => {
      mockPublishEvent.mockResolvedValue(true);

      await reactionStore.addReaction('msg-opt', '+', 'relay');

      const state = get(reactionStore);
      const reactions = state.reactionsByMessage.get('msg-opt');
      expect(reactions).toBeDefined();
      expect(reactions!.length).toBe(1);
      // Optimistic should be replaced by real -- no optimistic entries remain
      expect(state.optimisticReactions.size).toBe(0);
    });

    it('should remove optimistic reaction on publish failure', async () => {
      mockPublishEvent.mockRejectedValue(new Error('Publish failed'));

      await expect(
        reactionStore.addReaction('msg-fail', '+', 'relay')
      ).rejects.toThrow('Publish failed');

      const state = get(reactionStore);
      const reactions = state.reactionsByMessage.get('msg-fail') || [];
      expect(reactions.filter(r => r.reactionEventId.startsWith('optimistic-'))).toHaveLength(0);
      expect(state.optimisticReactions.size).toBe(0);
      expect(state.error).toBe('Publish failed');
    });

    it('should include author pubkey in NDK event tags when provided', async () => {
      mockPublishEvent.mockResolvedValue(true);

      await reactionStore.addReaction('msg-auth', '+', 'relay', 'author-pk');

      expect(mockPublishEvent).toHaveBeenCalled();
    });

    it('should throw when NDK not connected', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      await expect(
        reactionStore.addReaction('msg-ndk', '+', 'relay')
      ).rejects.toThrow('NDK not connected');
    });
  });

  describe('removeReaction()', () => {
    it('should throw when not authenticated', async () => {
      const { authStore } = await import('$lib/stores/auth');
      authStore.set({
        state: 'unauthenticated',
        publicKey: null,
        privateKey: null,
        isNip07: false
      } as any);

      await expect(reactionStore.removeReaction('msg1', 'relay')).rejects.toThrow('Not authenticated');

      authStore.set({
        state: 'authenticated',
        publicKey: 'user-pubkey',
        privateKey: 'user-privkey',
        isNip07: false
      } as any);
    });

    it('should remove reactions by current user from message', async () => {
      // Add a reaction first
      mockPublishEvent.mockResolvedValue(true);
      await reactionStore.addReaction('msg-rm', '+', 'relay');

      // Now remove it
      await reactionStore.removeReaction('msg-rm', 'relay');
      const updated = get(reactionStore);
      const remaining = updated.reactionsByMessage.get('msg-rm') || [];
      const userReactions = remaining.filter(r => r.reactorPubkey === 'user-pubkey');
      expect(userReactions).toHaveLength(0);
    });

    it('should handle removing from a message with no reactions', async () => {
      await reactionStore.removeReaction('nonexistent', 'relay');
      const state = get(reactionStore);
      const reactions = state.reactionsByMessage.get('nonexistent') || [];
      expect(reactions).toHaveLength(0);
    });
  });

  describe('subscribeToReactions()', () => {
    it('should do nothing for empty message IDs', async () => {
      await reactionStore.subscribeToReactions([], 'relay');
      expect(mockNdkSubscribe).not.toHaveBeenCalled();
    });

    it('should create subscription and track it', async () => {
      createMockSubscription();

      await reactionStore.subscribeToReactions(['msg1'], 'wss://relay.test');

      const state = get(reactionStore);
      const subs = state.activeSubscriptions.get('wss://relay.test');
      expect(subs).toBeDefined();
      expect(subs!.length).toBe(1);
    });

    it('should process real-time events from subscription', async () => {
      const { fireEvent } = createMockSubscription();

      await reactionStore.subscribeToReactions(['msg-rt'], 'wss://relay.test');

      fireEvent({
        id: 'rt-reaction-1',
        pubkey: 'some-pubkey',
        created_at: 2000,
        kind: 7,
        tags: [['e', 'msg-rt']],
        content: '+',
        sig: 'sig',
      });

      const state = get(reactionStore);
      expect(state.reactionsByMessage.get('msg-rt')!.length).toBe(1);
    });
  });

  describe('unsubscribe()', () => {
    it('should stop subscriptions and remove from tracking', async () => {
      const { mockSub } = createMockSubscription();

      await reactionStore.subscribeToReactions(['msg1'], 'wss://relay.test');

      reactionStore.unsubscribe('wss://relay.test');

      expect(mockSub.stop).toHaveBeenCalled();
      const state = get(reactionStore);
      expect(state.activeSubscriptions.has('wss://relay.test')).toBe(false);
    });

    it('should do nothing for unknown relay URL', () => {
      reactionStore.unsubscribe('wss://unknown.relay');
    });
  });

  describe('disconnectAll()', () => {
    it('should stop all active subscriptions', async () => {
      const mockSub1 = { on: vi.fn(), stop: vi.fn() };
      const mockSub2 = { on: vi.fn(), stop: vi.fn() };
      mockNdkSubscribe
        .mockReturnValueOnce(mockSub1)
        .mockReturnValueOnce(mockSub2);

      await reactionStore.subscribeToReactions(['msg1'], 'wss://relay1');
      await reactionStore.subscribeToReactions(['msg2'], 'wss://relay2');

      reactionStore.disconnectAll();

      expect(mockSub1.stop).toHaveBeenCalled();
      expect(mockSub2.stop).toHaveBeenCalled();

      const state = get(reactionStore);
      expect(state.activeSubscriptions.size).toBe(0);
    });
  });

  describe('clearError()', () => {
    it('should clear error', () => {
      reactionStore.clearError();
      expect(get(reactionStore).error).toBeNull();
    });
  });

  describe('clear()', () => {
    it('should reset loading and error state', () => {
      reactionStore.clear();
      const cleared = get(reactionStore);
      expect(cleared.loading).toBe(false);
      expect(cleared.error).toBeNull();
      expect(cleared.reactionsByMessage.size).toBe(0);
      expect(cleared.optimisticReactions.size).toBe(0);
    });
  });

  describe('getMessageReactions()', () => {
    it('should return a derived store', () => {
      reactionStore.clear();
      const reactionsForMsg = getMessageReactions('fresh-msg');
      const value = get(reactionsForMsg);
      expect(value.messageId).toBe('fresh-msg');
      expect(value.totalCount).toBe(0);
    });
  });
});

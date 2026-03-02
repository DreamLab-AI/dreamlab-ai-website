/**
 * Unit Tests: Pinned Messages Store
 *
 * Tests for the pinned messages store.
 * NOTE: pinnedStore is a singleton with no reset method, so each test
 * uses unique channel IDs to avoid cross-test state pollution.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Hoist mock fns for vi.mock factories
const { mockPublishEvent, mockGetNdk, mockIsConnected, mockIsAdmin } = vi.hoisted(() => ({
  mockPublishEvent: vi.fn(async () => true),
  mockGetNdk: vi.fn(() => ({
    signer: { sign: vi.fn() },
    fetchEvents: vi.fn(async () => new Set())
  })),
  mockIsConnected: vi.fn(() => true),
  mockIsAdmin: vi.fn(() => false)
}));

vi.mock('$lib/nostr/relay', () => ({
  ndk: mockGetNdk,
  isConnected: mockIsConnected,
  publishEvent: mockPublishEvent
}));

vi.mock('@nostr-dev-kit/ndk', () => ({
  NDKEvent: vi.fn().mockImplementation(function(this: any) {
    this.kind = 0;
    this.tags = [];
    this.content = '';
    this.id = 'event-id';
  })
}));

// Mock user store isAdmin
vi.mock('./user', () => ({
  isAdmin: {
    subscribe: (fn: (v: boolean) => void) => {
      fn(mockIsAdmin());
      return () => {};
    }
  }
}));

vi.mock('$lib/stores/user', () => ({
  isAdmin: {
    subscribe: (fn: (v: boolean) => void) => {
      fn(mockIsAdmin());
      return () => {};
    }
  }
}));

import { pinnedStore, getPinnedForChannel, isPinnedMessage } from '$lib/stores/pinnedMessages';

// Counter for unique channel IDs to avoid state leaking between tests
let channelCounter = 0;
function uniqueChannel(): string {
  return `ch-test-${++channelCounter}`;
}

describe('pinnedStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin.mockReturnValue(false);
    mockPublishEvent.mockResolvedValue(true);
    mockIsConnected.mockReturnValue(true);
  });

  describe('isPinned()', () => {
    it('should return false for unpinned message', () => {
      const ch = uniqueChannel();
      expect(pinnedStore.isPinned(ch, 'msg1')).toBe(false);
    });
  });

  describe('getPinnedMessages()', () => {
    it('should return empty array for channel with no pins', () => {
      const ch = uniqueChannel();
      expect(pinnedStore.getPinnedMessages(ch)).toHaveLength(0);
    });
  });

  describe('canPinMore()', () => {
    it('should return true when channel has no pins', () => {
      const ch = uniqueChannel();
      expect(pinnedStore.canPinMore(ch)).toBe(true);
    });
  });

  describe('pinMessage()', () => {
    it('should reject when user is not admin', async () => {
      mockIsAdmin.mockReturnValue(false);
      const ch = uniqueChannel();
      const result = await pinnedStore.pinMessage(ch, 'msg1');
      expect(result).toBe(false);
    });

    it('should pin message when user is admin', async () => {
      mockIsAdmin.mockReturnValue(true);
      const ch = uniqueChannel();

      const result = await pinnedStore.pinMessage(ch, 'msg1');
      expect(result).toBe(true);
      expect(pinnedStore.isPinned(ch, 'msg1')).toBe(true);
    });

    it('should return true if message already pinned', async () => {
      mockIsAdmin.mockReturnValue(true);
      const ch = uniqueChannel();

      await pinnedStore.pinMessage(ch, 'msg1');
      const result = await pinnedStore.pinMessage(ch, 'msg1');
      expect(result).toBe(true);
    });

    it('should reject when max pins reached', async () => {
      mockIsAdmin.mockReturnValue(true);
      const ch = uniqueChannel();

      // Pin 5 messages (the max)
      for (let i = 1; i <= 5; i++) {
        await pinnedStore.pinMessage(ch, `msg${i}`);
      }

      const result = await pinnedStore.pinMessage(ch, 'msg6');
      expect(result).toBe(false);
      expect(pinnedStore.canPinMore(ch)).toBe(false);
    });

    it('should fail when relay publish fails', async () => {
      mockIsAdmin.mockReturnValue(true);
      mockPublishEvent.mockRejectedValue(new Error('Publish failed'));
      const ch = uniqueChannel();

      const result = await pinnedStore.pinMessage(ch, 'msg1');
      expect(result).toBe(false);
    });

    it('should persist to localStorage on pin', async () => {
      mockIsAdmin.mockReturnValue(true);
      const ch = uniqueChannel();

      await pinnedStore.pinMessage(ch, 'msg1');

      const stored = JSON.parse(localStorage.getItem('Nostr-BBS-pinned-messages')!);
      expect(stored[ch]).toContain('msg1');
    });
  });

  describe('unpinMessage()', () => {
    it('should reject when user is not admin', async () => {
      mockIsAdmin.mockReturnValue(false);
      const ch = uniqueChannel();
      const result = await pinnedStore.unpinMessage(ch, 'msg1');
      expect(result).toBe(false);
    });

    it('should return true when message is not pinned', async () => {
      mockIsAdmin.mockReturnValue(true);
      const ch = uniqueChannel();
      const result = await pinnedStore.unpinMessage(ch, 'msg-not-pinned');
      expect(result).toBe(true);
    });

    it('should unpin a pinned message', async () => {
      mockIsAdmin.mockReturnValue(true);
      const ch = uniqueChannel();

      await pinnedStore.pinMessage(ch, 'msg1');
      expect(pinnedStore.isPinned(ch, 'msg1')).toBe(true);

      const result = await pinnedStore.unpinMessage(ch, 'msg1');
      expect(result).toBe(true);
      expect(pinnedStore.isPinned(ch, 'msg1')).toBe(false);
    });
  });

  describe('getPinnedForChannel()', () => {
    it('should return a derived store', () => {
      const ch = uniqueChannel();
      const store = getPinnedForChannel(ch);
      const value = get(store);
      expect(Array.isArray(value)).toBe(true);
      expect(value).toHaveLength(0);
    });
  });

  describe('isPinnedMessage()', () => {
    it('should return a derived store that tracks pin status', () => {
      const ch = uniqueChannel();
      const store = isPinnedMessage(ch, 'msg1');
      expect(get(store)).toBe(false);
    });
  });
});

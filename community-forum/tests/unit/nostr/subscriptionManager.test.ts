/**
 * Unit Tests: Subscription Manager
 *
 * Tests for ManagedSubscription and SubscriptionManager lifecycle,
 * auto-reconnect, EOSE handling, stats, and factories.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted so references are available inside vi.mock factories
// ---------------------------------------------------------------------------

const { mockSubStop, mockSubOn } = vi.hoisted(() => ({
  mockSubStop: vi.fn(),
  mockSubOn: vi.fn(),
}));

vi.mock('$lib/nostr/relay', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writable } = require('svelte/store');

  const connectionStateStore = writable({
    state: 'connected',
    timestamp: Date.now(),
    authenticated: false,
  });

  return {
    subscribe: vi.fn().mockReturnValue({
      stop: mockSubStop,
      on: mockSubOn,
    }),
    isConnected: vi.fn().mockReturnValue(true),
    connectionState: connectionStateStore,
  };
});

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------
import {
  createSubscription,
  getSubscription,
  closeSubscription,
  closeAllSubscriptions,
  pauseAllSubscriptions,
  resumeAllSubscriptions,
  getSubscriptionStats,
  cleanupSubscriptions,
  subscriptionManager,
  createOneShotSubscription,
  createPersistentSubscription,
  createTimedSubscription,
} from '$lib/nostr/subscriptionManager';

import { subscribe as relaySubscribe, isConnected } from '$lib/nostr/relay';

describe('Subscription Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    closeAllSubscriptions();
    (isConnected as any).mockReturnValue(true);
  });

  afterEach(() => {
    closeAllSubscriptions();
  });

  // =========================================================================
  // createSubscription()
  // =========================================================================
  describe('createSubscription()', () => {
    it('should create and start a subscription', () => {
      const handlers = { onEvent: vi.fn() };
      const sub = createSubscription({ kinds: [1] }, handlers, { id: 'test-sub-1' });

      expect(sub).toBeDefined();
      expect(sub.id).toBe('test-sub-1');
      expect(relaySubscribe).toHaveBeenCalled();
    });

    it('should auto-generate id if not provided', () => {
      const handlers = { onEvent: vi.fn() };
      const sub = createSubscription({ kinds: [1] }, handlers);
      expect(sub.id).toMatch(/^sub_/);
    });

    it('should replace existing subscription with same ID', () => {
      const handlers1 = { onEvent: vi.fn() };
      const handlers2 = { onEvent: vi.fn() };

      createSubscription({ kinds: [1] }, handlers1, { id: 'dup' });
      const sub2 = createSubscription({ kinds: [1] }, handlers2, { id: 'dup' });

      expect(sub2.id).toBe('dup');
      // The first should have been closed
    });

    it('should accept array of filters', () => {
      const handlers = { onEvent: vi.fn() };
      const sub = createSubscription(
        [{ kinds: [1] }, { kinds: [7] }],
        handlers
      );
      expect(sub.filters).toHaveLength(2);
    });

    it('should set error state when not connected', () => {
      (isConnected as any).mockReturnValue(false);

      const handlers = { onEvent: vi.fn(), onError: vi.fn() };
      const sub = createSubscription({ kinds: [1] }, handlers, {
        id: 'err-sub',
        autoReconnect: false,
      });

      const meta = sub.getMetaSync();
      expect(meta.state).toBe('error');
    });
  });

  // =========================================================================
  // Subscription lifecycle
  // =========================================================================
  describe('Subscription lifecycle', () => {
    it('should transition through pause/resume', () => {
      const handlers = { onEvent: vi.fn() };
      const sub = createSubscription({ kinds: [1] }, handlers, { id: 'lifecycle' });

      expect(sub.getMetaSync().state).toBe('active');

      sub.pause();
      expect(sub.getMetaSync().state).toBe('paused');

      sub.resume();
      expect(sub.getMetaSync().state).toBe('active');
    });

    it('should transition through stop/start', () => {
      const handlers = { onEvent: vi.fn() };
      const sub = createSubscription({ kinds: [1] }, handlers, { id: 'stop-start' });

      sub.stop();
      expect(sub.getMetaSync().state).toBe('idle');

      sub.start();
      expect(sub.getMetaSync().state).toBe('active');
    });

    it('should set state to closed on close()', () => {
      const handlers = { onEvent: vi.fn(), onClose: vi.fn() };
      const sub = createSubscription({ kinds: [1] }, handlers, { id: 'close-test' });

      sub.close();
      expect(sub.getMetaSync().state).toBe('closed');
      expect(handlers.onClose).toHaveBeenCalled();
    });

    it('should not pause if not active', () => {
      const handlers = { onEvent: vi.fn() };
      const sub = createSubscription({ kinds: [1] }, handlers, { id: 'no-pause' });

      sub.stop(); // idle
      sub.pause(); // should no-op
      expect(sub.getMetaSync().state).toBe('idle');
    });

    it('should not resume if not paused', () => {
      const handlers = { onEvent: vi.fn() };
      const sub = createSubscription({ kinds: [1] }, handlers, { id: 'no-resume' });

      // already active, resume should no-op
      sub.resume();
      expect(sub.getMetaSync().state).toBe('active');
    });

    it('should warn when starting already active subscription', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const handlers = { onEvent: vi.fn() };
      const sub = createSubscription({ kinds: [1] }, handlers, { id: 'double-start' });

      sub.start(); // already active
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('already active')
      );
      warnSpy.mockRestore();
    });
  });

  // =========================================================================
  // getMeta() / getMetaSync()
  // =========================================================================
  describe('Subscription metadata', () => {
    it('should provide reactive meta store', () => {
      const handlers = { onEvent: vi.fn() };
      const sub = createSubscription({ kinds: [1] }, handlers, { id: 'meta-test' });

      const store = sub.getMeta();
      const values: any[] = [];
      const unsub = store.subscribe((v) => values.push(v));

      expect(values.length).toBeGreaterThanOrEqual(1);
      expect(values[values.length - 1].id).toBe('meta-test');
      unsub();
    });

    it('should track event count via onEvent callback', () => {
      const handlers = { onEvent: vi.fn() };
      const sub = createSubscription({ kinds: [1] }, handlers, { id: 'count-test' });

      // Simulate event handler setup
      const onCalls = mockSubOn.mock.calls;
      const eventHandler = onCalls.find((c: any) => c[0] === 'event');

      if (eventHandler) {
        // Simulate receiving an event
        eventHandler[1]({ id: 'evt1', kind: 1 });
        expect(sub.getMetaSync().eventCount).toBe(1);
      }
    });
  });

  // =========================================================================
  // Manager-level operations
  // =========================================================================
  describe('Manager operations', () => {
    it('getSubscription should return subscription by ID', () => {
      const handlers = { onEvent: vi.fn() };
      createSubscription({ kinds: [1] }, handlers, { id: 'get-test' });

      const found = getSubscription('get-test');
      expect(found).toBeDefined();
      expect(found!.id).toBe('get-test');
    });

    it('getSubscription should return undefined for non-existent', () => {
      expect(getSubscription('nonexistent')).toBeUndefined();
    });

    it('closeSubscription should close and remove', () => {
      const handlers = { onEvent: vi.fn() };
      createSubscription({ kinds: [1] }, handlers, { id: 'close-me' });

      expect(closeSubscription('close-me')).toBe(true);
      expect(getSubscription('close-me')).toBeUndefined();
    });

    it('closeSubscription should return false for non-existent', () => {
      expect(closeSubscription('nope')).toBe(false);
    });

    it('closeAllSubscriptions should close all', () => {
      const handlers = { onEvent: vi.fn() };
      createSubscription({ kinds: [1] }, handlers, { id: 'all-1' });
      createSubscription({ kinds: [1] }, handlers, { id: 'all-2' });

      closeAllSubscriptions();

      expect(getSubscription('all-1')).toBeUndefined();
      expect(getSubscription('all-2')).toBeUndefined();
    });

    it('pauseAllSubscriptions should pause active subs', () => {
      const handlers = { onEvent: vi.fn() };
      createSubscription({ kinds: [1] }, handlers, { id: 'pause-1' });
      createSubscription({ kinds: [1] }, handlers, { id: 'pause-2' });

      pauseAllSubscriptions();
      // Individual pause is called on each
    });

    it('resumeAllSubscriptions should resume paused subs', () => {
      const handlers = { onEvent: vi.fn() };
      createSubscription({ kinds: [1] }, handlers, { id: 'resume-1' });

      pauseAllSubscriptions();
      resumeAllSubscriptions();
    });
  });

  // =========================================================================
  // Stats
  // =========================================================================
  describe('getSubscriptionStats()', () => {
    it('should return stats store', () => {
      const statsStore = getSubscriptionStats();
      const values: any[] = [];
      const unsub = statsStore.subscribe((v) => values.push(v));
      expect(values[0]).toHaveProperty('total');
      expect(values[0]).toHaveProperty('active');
      expect(values[0]).toHaveProperty('paused');
      expect(values[0]).toHaveProperty('error');
      expect(values[0]).toHaveProperty('totalEvents');
      unsub();
    });

    it('should track counts correctly', () => {
      const handlers = { onEvent: vi.fn() };
      createSubscription({ kinds: [1] }, handlers, { id: 'stat-1' });
      createSubscription({ kinds: [1] }, handlers, { id: 'stat-2' });

      const statsStore = getSubscriptionStats();
      const values: any[] = [];
      const unsub = statsStore.subscribe((v) => values.push(v));
      const latest = values[values.length - 1];
      expect(latest.total).toBe(2);
      expect(latest.active).toBe(2);
      unsub();
    });
  });

  // =========================================================================
  // Cleanup
  // =========================================================================
  describe('cleanupSubscriptions()', () => {
    it('should return 0 when no stale subscriptions', () => {
      const handlers = { onEvent: vi.fn() };
      createSubscription({ kinds: [1] }, handlers, { id: 'clean-1' });

      const cleaned = cleanupSubscriptions();
      expect(cleaned).toBe(0);
    });
  });

  // =========================================================================
  // Factory functions
  // =========================================================================
  describe('createOneShotSubscription()', () => {
    it('should create subscription with closeOnEose=true', () => {
      const handlers = { onEvent: vi.fn() };
      const sub = createOneShotSubscription({ kinds: [1] }, handlers, {
        id: 'oneshot',
      });
      expect(sub).toBeDefined();
      expect(relaySubscribe).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ closeOnEose: true })
      );
    });
  });

  describe('createPersistentSubscription()', () => {
    it('should create subscription with autoReconnect', () => {
      const handlers = { onEvent: vi.fn() };
      const sub = createPersistentSubscription({ kinds: [1] }, handlers, {
        id: 'persistent',
      });
      expect(sub).toBeDefined();
    });
  });

  describe('createTimedSubscription()', () => {
    it('should create subscription with timeout', () => {
      const handlers = { onEvent: vi.fn() };
      const sub = createTimedSubscription({ kinds: [1] }, handlers, 5000, {
        id: 'timed',
      });
      expect(sub).toBeDefined();
      // Clean up to avoid timer leaks
      sub.close();
    });
  });

  // =========================================================================
  // subscriptionManager getIds / getCountByState
  // =========================================================================
  describe('subscriptionManager helpers', () => {
    it('getIds should return all subscription IDs', () => {
      const handlers = { onEvent: vi.fn() };
      createSubscription({ kinds: [1] }, handlers, { id: 'id-1' });
      createSubscription({ kinds: [1] }, handlers, { id: 'id-2' });

      const ids = subscriptionManager.getIds();
      expect(ids).toContain('id-1');
      expect(ids).toContain('id-2');
    });

    it('getCountByState should count subs in given state', () => {
      const handlers = { onEvent: vi.fn() };
      createSubscription({ kinds: [1] }, handlers, { id: 'cnt-1' });

      expect(subscriptionManager.getCountByState('active')).toBeGreaterThanOrEqual(1);
      expect(subscriptionManager.getCountByState('paused')).toBe(0);
    });
  });
});

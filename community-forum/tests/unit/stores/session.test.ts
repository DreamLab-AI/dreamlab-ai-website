/**
 * Unit Tests: Session Store
 *
 * Tests for the session timeout management store.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';

// Mock PWA store
vi.mock('$lib/stores/pwa', () => ({
  isPWAInstalled: {
    subscribe: (fn: (v: boolean) => void) => {
      fn(false);
      return () => {};
    }
  },
  checkIfPWA: vi.fn(() => false)
}));

import { sessionStore, formatRemainingTime, SESSION_CONFIG } from '$lib/stores/session';

describe('sessionStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStore.stop();
  });

  afterEach(() => {
    sessionStore.stop();
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should start active with no warning', () => {
      const state = get(sessionStore);
      expect(state.isActive).toBe(true);
      expect(state.showWarning).toBe(false);
      expect(state.remainingMs).toBe(SESSION_CONFIG.timeoutMs);
    });
  });

  describe('touch()', () => {
    it('should update localStorage with current timestamp', () => {
      sessionStore.touch();
      const stored = localStorage.getItem('nostr_bbs_last_activity');
      expect(stored).not.toBeNull();
      expect(parseInt(stored!)).toBeGreaterThan(0);
    });

    it('should reset state to active', () => {
      sessionStore.touch();
      const state = get(sessionStore);
      expect(state.isActive).toBe(true);
      expect(state.showWarning).toBe(false);
    });
  });

  describe('checkTimeout()', () => {
    it('should show warning when approaching timeout', () => {
      // Set last activity to 29 minutes ago (within 2-minute warning window)
      const twentyNineMinutesAgo = Date.now() - 29 * 60 * 1000;
      localStorage.setItem('nostr_bbs_last_activity', twentyNineMinutesAgo.toString());

      sessionStore.checkTimeout();
      const state = get(sessionStore);
      expect(state.showWarning).toBe(true);
      expect(state.isActive).toBe(true);
    });

    it('should mark inactive when timed out', () => {
      // Set last activity to 31 minutes ago
      const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
      localStorage.setItem('nostr_bbs_last_activity', thirtyOneMinutesAgo.toString());

      sessionStore.checkTimeout();
      const state = get(sessionStore);
      expect(state.isActive).toBe(false);
      expect(state.remainingMs).toBe(0);
    });

    it('should remain active when within timeout', () => {
      // Set last activity to 5 minutes ago
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      localStorage.setItem('nostr_bbs_last_activity', fiveMinutesAgo.toString());

      sessionStore.checkTimeout();
      const state = get(sessionStore);
      expect(state.isActive).toBe(true);
      expect(state.showWarning).toBe(false);
    });

    it('should call timeout callback when expired', () => {
      const callback = vi.fn();
      sessionStore.start(callback);

      // Set last activity to 31 minutes ago
      const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
      localStorage.setItem('nostr_bbs_last_activity', thirtyOneMinutesAgo.toString());

      sessionStore.checkTimeout();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('start()', () => {
    it('should return cleanup function', () => {
      const cleanup = sessionStore.start(vi.fn());
      expect(typeof cleanup).toBe('function');
    });

    it('should set initial activity timestamp', () => {
      sessionStore.start(vi.fn());
      const stored = localStorage.getItem('nostr_bbs_last_activity');
      expect(stored).not.toBeNull();
    });
  });

  describe('stop()', () => {
    it('should reset state to initial', () => {
      sessionStore.start(vi.fn());
      sessionStore.stop();
      const state = get(sessionStore);
      expect(state.isActive).toBe(true);
      expect(state.showWarning).toBe(false);
    });
  });

  describe('extend()', () => {
    it('should update activity timestamp', () => {
      sessionStore.touch();
      const before = localStorage.getItem('nostr_bbs_last_activity');
      vi.advanceTimersByTime(1000);
      sessionStore.extend();
      const after = localStorage.getItem('nostr_bbs_last_activity');
      expect(parseInt(after!)).toBeGreaterThanOrEqual(parseInt(before!));
    });
  });

  describe('PWA mode', () => {
    it('should skip timeout in PWA mode', async () => {
      const { checkIfPWA } = await import('$lib/stores/pwa');
      (checkIfPWA as any).mockReturnValueOnce(true);

      const callback = vi.fn();
      sessionStore.start(callback);

      // Even after timeout, callback should not fire
      const thirtyOneMinutesAgo = Date.now() - 31 * 60 * 1000;
      localStorage.setItem('nostr_bbs_last_activity', thirtyOneMinutesAgo.toString());

      // The start function returned early for PWA, so checkTimeout should
      // not have been scheduled. State should remain active.
      const state = get(sessionStore);
      expect(state.isActive).toBe(true);
    });
  });
});

describe('formatRemainingTime()', () => {
  it('should format minutes and seconds', () => {
    expect(formatRemainingTime(90000)).toBe('1m 30s');
  });

  it('should format seconds only', () => {
    expect(formatRemainingTime(30000)).toBe('30s');
  });

  it('should format zero', () => {
    expect(formatRemainingTime(0)).toBe('0s');
  });

  it('should format large values', () => {
    expect(formatRemainingTime(5 * 60 * 1000)).toBe('5m 0s');
  });
});

describe('SESSION_CONFIG', () => {
  it('should export timeout configuration', () => {
    expect(SESSION_CONFIG.timeoutMs).toBe(30 * 60 * 1000);
    expect(SESSION_CONFIG.warningBeforeMs).toBe(2 * 60 * 1000);
    expect(SESSION_CONFIG.checkIntervalMs).toBe(30 * 1000);
  });
});

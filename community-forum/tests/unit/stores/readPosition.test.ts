/**
 * Unit Tests: Read Position Store
 *
 * Tests for the channel read position tracking store.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { lastReadStore } from '$lib/stores/readPosition';

describe('lastReadStore', () => {
  beforeEach(() => {
    localStorage.clear();
    lastReadStore.clearAll();
  });

  describe('setLastRead()', () => {
    it('should set read timestamp for channel', () => {
      lastReadStore.setLastRead('ch1', 1000);
      expect(lastReadStore.getLastRead('ch1')).toBe(1000);
    });

    it('should persist to localStorage', () => {
      lastReadStore.setLastRead('ch1', 1000);
      const stored = JSON.parse(localStorage.getItem('Nostr-BBS-read-positions')!);
      expect(stored.ch1).toBe(1000);
    });

    it('should overwrite previous value', () => {
      lastReadStore.setLastRead('ch1', 1000);
      lastReadStore.setLastRead('ch1', 2000);
      expect(lastReadStore.getLastRead('ch1')).toBe(2000);
    });
  });

  describe('getLastRead()', () => {
    it('should return 0 for unknown channel', () => {
      expect(lastReadStore.getLastRead('unknown')).toBe(0);
    });

    it('should return stored value', () => {
      lastReadStore.setLastRead('ch1', 500);
      expect(lastReadStore.getLastRead('ch1')).toBe(500);
    });
  });

  describe('getUnreadCount()', () => {
    it('should count messages newer than last read', () => {
      lastReadStore.setLastRead('ch1', 100);
      const messages = [
        { createdAt: 50 },
        { createdAt: 100 },
        { createdAt: 150 },
        { createdAt: 200 }
      ] as any[];
      expect(lastReadStore.getUnreadCount('ch1', messages)).toBe(2);
    });

    it('should return all messages as unread when no read position', () => {
      const messages = [
        { createdAt: 50 },
        { createdAt: 100 }
      ] as any[];
      expect(lastReadStore.getUnreadCount('ch1', messages)).toBe(2);
    });

    it('should return 0 when all messages are read', () => {
      lastReadStore.setLastRead('ch1', 999);
      const messages = [
        { createdAt: 50 },
        { createdAt: 100 }
      ] as any[];
      expect(lastReadStore.getUnreadCount('ch1', messages)).toBe(0);
    });
  });

  describe('markAllRead()', () => {
    it('should set position to latest message timestamp', () => {
      const messages = [
        { createdAt: 50 },
        { createdAt: 200 },
        { createdAt: 100 }
      ] as any[];
      lastReadStore.markAllRead('ch1', messages);
      expect(lastReadStore.getLastRead('ch1')).toBe(200);
    });

    it('should not update for empty messages', () => {
      lastReadStore.setLastRead('ch1', 100);
      lastReadStore.markAllRead('ch1', []);
      expect(lastReadStore.getLastRead('ch1')).toBe(100);
    });
  });

  describe('clearChannel()', () => {
    it('should remove position for specific channel', () => {
      lastReadStore.setLastRead('ch1', 100);
      lastReadStore.setLastRead('ch2', 200);
      lastReadStore.clearChannel('ch1');
      expect(lastReadStore.getLastRead('ch1')).toBe(0);
      expect(lastReadStore.getLastRead('ch2')).toBe(200);
    });
  });

  describe('clearAll()', () => {
    it('should remove all positions', () => {
      lastReadStore.setLastRead('ch1', 100);
      lastReadStore.setLastRead('ch2', 200);
      lastReadStore.clearAll();
      expect(lastReadStore.getLastRead('ch1')).toBe(0);
      expect(lastReadStore.getLastRead('ch2')).toBe(0);
    });

    it('should remove from localStorage', () => {
      lastReadStore.setLastRead('ch1', 100);
      lastReadStore.clearAll();
      expect(localStorage.getItem('Nostr-BBS-read-positions')).toBeNull();
    });
  });
});

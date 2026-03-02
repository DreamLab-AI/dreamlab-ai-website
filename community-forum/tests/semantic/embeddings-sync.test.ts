import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  shouldSync,
  fetchManifest,
  getLocalSyncState,
  syncEmbeddings,
  initEmbeddingSync,
  type EmbeddingManifest
} from '$lib/semantic/embeddings-sync';
import { db } from '$lib/db';

// Mock the database
vi.mock('$lib/db', () => ({
  db: {
    table: vi.fn(() => ({
      get: vi.fn(),
      put: vi.fn()
    }))
  }
}));

describe('Embeddings Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('shouldSync', () => {
    it('returns false when navigator is undefined', () => {
      const originalNavigator = global.navigator;
      // @ts-ignore - Testing undefined navigator
      global.navigator = undefined;

      expect(shouldSync()).toBe(false);

      global.navigator = originalNavigator;
    });

    it('returns true when connection API is not available', () => {
      const result = shouldSync();
      expect(result).toBe(true);
    });

    it('returns true for WiFi connection', () => {
      Object.defineProperty(global.navigator, 'connection', {
        value: { type: 'wifi' },
        writable: true,
        configurable: true
      });

      expect(shouldSync()).toBe(true);
    });

    it('returns true for ethernet connection', () => {
      Object.defineProperty(global.navigator, 'connection', {
        value: { type: 'ethernet' },
        writable: true,
        configurable: true
      });

      expect(shouldSync()).toBe(true);
    });

    it('returns true for 4g with saveData disabled', () => {
      Object.defineProperty(global.navigator, 'connection', {
        value: {
          type: 'cellular',
          effectiveType: '4g',
          saveData: false
        },
        writable: true,
        configurable: true
      });

      expect(shouldSync()).toBe(true);
    });

    it('returns false for 4g with saveData enabled', () => {
      Object.defineProperty(global.navigator, 'connection', {
        value: {
          type: 'cellular',
          effectiveType: '4g',
          saveData: true
        },
        writable: true,
        configurable: true
      });

      expect(shouldSync()).toBe(false);
    });

    it('returns true for unmetered connection', () => {
      Object.defineProperty(global.navigator, 'connection', {
        value: {
          type: 'cellular',
          metered: false
        },
        writable: true,
        configurable: true
      });

      expect(shouldSync()).toBe(true);
    });

    it('returns false for metered connection', () => {
      Object.defineProperty(global.navigator, 'connection', {
        value: {
          type: 'cellular',
          effectiveType: '3g',
          metered: true
        },
        writable: true,
        configurable: true
      });

      expect(shouldSync()).toBe(false);
    });

    it('returns false for 3g connection', () => {
      Object.defineProperty(global.navigator, 'connection', {
        value: {
          type: 'cellular',
          effectiveType: '3g'
        },
        writable: true,
        configurable: true
      });

      expect(shouldSync()).toBe(false);
    });
  });

  describe('fetchManifest', () => {
    // The source now fetches /status and synthesizes a manifest from the response
    const mockStatusResponse = {
      totalVectors: 1000,
      dimensions: 384,
      model: 'all-MiniLM-L6-v2'
    };

    it('fetches manifest successfully from /status endpoint', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse
      });

      const result = await fetchManifest();

      expect(result).not.toBeNull();
      expect(result!.total_vectors).toBe(1000);
      expect(result!.dimensions).toBe(384);
      expect(result!.model).toBe('all-MiniLM-L6-v2');
      // version is synthesized from totalVectors
      expect(result!.version).toBe(1000);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/status'),
        { cache: 'no-cache' }
      );
    });

    it('returns null when response is not ok', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await fetchManifest();

      expect(result).toBeNull();
    });

    it('returns null when fetch throws error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await fetchManifest();

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error fetching search status:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('handles JSON parsing errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await fetchManifest();

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getLocalSyncState', () => {
    it('returns sync state from IndexedDB', async () => {
      const mockState = {
        version: 1,
        lastSynced: Date.now(),
        indexLoaded: true
      };

      const mockGet = vi.fn().mockResolvedValue({ value: mockState });
      const mockTable = vi.fn().mockReturnValue({ get: mockGet });
      (db.table as any) = mockTable;

      const result = await getLocalSyncState();

      expect(result).toEqual(mockState);
      expect(mockTable).toHaveBeenCalledWith('metadata');
      expect(mockGet).toHaveBeenCalledWith('embedding_sync_state');
    });

    it('returns null when no state exists', async () => {
      const mockGet = vi.fn().mockResolvedValue(undefined);
      const mockTable = vi.fn().mockReturnValue({ get: mockGet });
      (db.table as any) = mockTable;

      const result = await getLocalSyncState();

      expect(result).toBeNull();
    });

    it('returns null when database query fails', async () => {
      const mockGet = vi.fn().mockRejectedValue(new Error('DB error'));
      const mockTable = vi.fn().mockReturnValue({ get: mockGet });
      (db.table as any) = mockTable;

      const result = await getLocalSyncState();

      expect(result).toBeNull();
    });
  });

  describe('syncEmbeddings', () => {
    // The source now synthesizes manifest from /status, and downloadIndex is a no-op
    // (server-side search, no client-side index download)
    const mockStatusResponse = {
      totalVectors: 2000,
      dimensions: 384,
      model: 'all-MiniLM-L6-v2'
    };

    beforeEach(() => {
      // Mock connection to allow sync
      Object.defineProperty(global.navigator, 'connection', {
        value: { type: 'wifi' },
        writable: true,
        configurable: true
      });
    });

    it('skips sync when not on WiFi and not forced', async () => {
      Object.defineProperty(global.navigator, 'connection', {
        value: { type: 'cellular', effectiveType: '3g', metered: true },
        writable: true,
        configurable: true
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await syncEmbeddings(false);

      expect(result).toEqual({ synced: false, version: 0 });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Skipping embedding sync (not on WiFi)'
      );

      consoleLogSpy.mockRestore();
    });

    it('syncs when forced regardless of connection', async () => {
      Object.defineProperty(global.navigator, 'connection', {
        value: { type: 'cellular', effectiveType: '3g', metered: true },
        writable: true,
        configurable: true
      });

      const mockGet = vi.fn().mockResolvedValue({ value: { version: 1 } });
      const mockPut = vi.fn().mockResolvedValue(undefined);
      const mockTable = vi.fn().mockReturnValue({ get: mockGet, put: mockPut });
      (db.table as any) = mockTable;

      // fetchManifest calls /status
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await syncEmbeddings(true);

      // downloadIndex is now a no-op that always returns true
      expect(result.synced).toBe(true);
      // version comes from synthesized manifest (totalVectors)
      expect(result.version).toBe(2000);

      consoleLogSpy.mockRestore();
    });

    it('returns false when manifest fetch fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const mockGet = vi.fn().mockResolvedValue({ value: { version: 1 } });
      const mockTable = vi.fn().mockReturnValue({ get: mockGet });
      (db.table as any) = mockTable;

      const result = await syncEmbeddings();

      expect(result).toEqual({ synced: false, version: 1 });
    });

    it('skips sync when local version is up to date', async () => {
      // Local version matches remote (totalVectors)
      const mockGet = vi.fn().mockResolvedValue({ value: { version: 2000 } });
      const mockTable = vi.fn().mockReturnValue({ get: mockGet });
      (db.table as any) = mockTable;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await syncEmbeddings();

      expect(result).toEqual({ synced: false, version: 2000 });
      expect(consoleLogSpy).toHaveBeenCalledWith('Embeddings up to date (v2000)');

      consoleLogSpy.mockRestore();
    });

    it('downloads and stores new index successfully', async () => {
      const mockGet = vi.fn().mockResolvedValue({ value: { version: 1 } });
      const mockPut = vi.fn().mockResolvedValue(undefined);
      const mockTable = vi.fn().mockReturnValue({ get: mockGet, put: mockPut });
      (db.table as any) = mockTable;

      // fetchManifest calls /status
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await syncEmbeddings();

      // downloadIndex is a no-op (server-side search), always returns true
      expect(result.synced).toBe(true);
      expect(result.version).toBe(2000);

      // Verify sync state was updated
      expect(mockPut).toHaveBeenCalledWith({
        key: 'embedding_sync_state',
        value: expect.objectContaining({
          version: 2000,
          indexLoaded: false
        })
      });

      consoleLogSpy.mockRestore();
    });

    it('handles manifest fetch failure gracefully', async () => {
      const mockGet = vi.fn().mockResolvedValue({ value: { version: 1 } });
      const mockTable = vi.fn().mockReturnValue({ get: mockGet });
      (db.table as any) = mockTable;

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const result = await syncEmbeddings();

      expect(result).toEqual({ synced: false, version: 1 });
    });

    it('handles network error during manifest fetch', async () => {
      const mockGet = vi.fn().mockResolvedValue({ value: { version: 1 } });
      const mockTable = vi.fn().mockReturnValue({ get: mockGet });
      (db.table as any) = mockTable;

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = await syncEmbeddings();

      expect(result).toEqual({ synced: false, version: 1 });

      consoleWarnSpy.mockRestore();
    });

    it('handles zero local version', async () => {
      const mockGet = vi.fn().mockResolvedValue(null);
      const mockPut = vi.fn().mockResolvedValue(undefined);
      const mockTable = vi.fn().mockReturnValue({ get: mockGet, put: mockPut });
      (db.table as any) = mockTable;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await syncEmbeddings();

      expect(result.synced).toBe(true);
      expect(result.version).toBe(2000);

      consoleLogSpy.mockRestore();
    });
  });

  describe('initEmbeddingSync', () => {
    it('schedules background sync', async () => {
      vi.useFakeTimers();

      const mockGet = vi.fn().mockResolvedValue({ value: { version: 1 } });
      const mockTable = vi.fn().mockReturnValue({ get: mockGet });
      (db.table as any) = mockTable;

      Object.defineProperty(global.navigator, 'connection', {
        value: { type: 'wifi' },
        writable: true,
        configurable: true
      });

      const mockStatusResponse = {
        totalVectors: 1000,
        dimensions: 384,
        model: 'all-MiniLM-L6-v2'
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockStatusResponse
      });

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Start initialization (doesn't block)
      const promise = initEmbeddingSync();

      // Should return immediately
      await promise;

      // Advance timers to trigger background sync
      await vi.advanceTimersByTimeAsync(5000);

      expect(consoleLogSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      vi.useRealTimers();
    });

    it('handles background sync errors gracefully', async () => {
      vi.useFakeTimers();

      // Mock db to return null (no local state)
      const mockGet = vi.fn().mockResolvedValue(null);
      const mockTable = vi.fn().mockReturnValue({ get: mockGet });
      (db.table as any) = mockTable;

      // Mock fetch to throw - this simulates a network error during status fetch
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await initEmbeddingSync();
      await vi.advanceTimersByTimeAsync(5000);

      // The error is caught and logged by fetchManifest with updated message
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error fetching search status:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
      vi.useRealTimers();
    });
  });
});

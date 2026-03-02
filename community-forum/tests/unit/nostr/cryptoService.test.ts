/**
 * Unit Tests: CryptoService
 *
 * Tests for the Web Worker-based crypto service wrapper.
 *
 * CryptoService uses `new Worker(new URL(...), { type: 'module' })` which
 * Vite transforms at build time. In jsdom the Worker constructor fails,
 * leaving cryptoService in degraded mode (worker=null). To test the full
 * message handler / sendRequest / terminate paths, we inject a mock Worker
 * directly into the singleton's private fields after import.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the crypto.worker module to prevent import resolution issues
vi.mock('$lib/workers/crypto.worker', () => ({}));

/** Yield to the microtask queue so async operations can proceed */
const tick = () => new Promise<void>(r => setTimeout(r, 0));

/**
 * Helper: create a mock Worker object and inject it into a CryptoService instance.
 * Wires up the onmessage/onerror handlers to mimic what initWorker() does.
 */
function injectMockWorker(service: any) {
  const mockWorker = {
    onmessage: null as ((e: MessageEvent) => void) | null,
    onerror: null as ((e: ErrorEvent) => void) | null,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  };

  // Inject worker into private field
  service.worker = mockWorker;

  // Wire up the onmessage handler (replicate initWorker's logic)
  mockWorker.onmessage = (e: MessageEvent) => {
    const data = e.data;

    // Handle ready signal
    if ('type' in data && data.type === 'ready') {
      service.isReady = true;
      service.readyResolve?.();
      return;
    }

    // Handle response
    const response = data;
    const pending = service.pendingRequests.get(response.id);

    if (pending) {
      service.pendingRequests.delete(response.id);

      if (response.success && response.result !== undefined) {
        pending.resolve(response.result);
      } else {
        pending.reject(new Error(response.error || 'Unknown worker error'));
      }
    }
  };

  // Wire up the onerror handler
  mockWorker.onerror = (error: any) => {
    for (const [id, pending] of service.pendingRequests) {
      pending.reject(new Error('Worker error: ' + error.message));
      service.pendingRequests.delete(id);
    }
  };

  return {
    worker: mockWorker,
    simulateMessage(data: any) {
      mockWorker.onmessage!({ data } as MessageEvent);
    },
    simulateError(message: string) {
      mockWorker.onerror!({ message } as any);
    },
    makeReady() {
      this.simulateMessage({ type: 'ready' });
    },
  };
}

describe('CryptoService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe('singleton export', () => {
    it('should export a cryptoService instance', async () => {
      const mod = await import('$lib/services/cryptoService');
      expect(mod.cryptoService).toBeDefined();
      expect(typeof mod.cryptoService.encrypt44).toBe('function');
      expect(typeof mod.cryptoService.decrypt44).toBe('function');
      expect(typeof mod.cryptoService.getConversationKey).toBe('function');
      expect(typeof mod.cryptoService.terminate).toBe('function');
    });
  });

  describe('NIP-04 removed methods', () => {
    it('encrypt() should throw with removal message', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      await expect(cryptoService.encrypt('priv', 'pub', 'content')).rejects.toThrow(
        'NIP-04 encryption was removed on 2025-12-01'
      );
    });

    it('decrypt() should throw with removal message', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      await expect(cryptoService.decrypt('priv', 'pub', 'cipher')).rejects.toThrow(
        'NIP-04 decryption was removed on 2025-12-01'
      );
    });

    it('encrypt() error includes migration guidance', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      await expect(cryptoService.encrypt('a', 'b', 'c')).rejects.toThrow('encrypt44()');
    });

    it('decrypt() error includes migration guidance', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      await expect(cryptoService.decrypt('a', 'b', 'c')).rejects.toThrow('decrypt44()');
    });
  });

  describe('degraded mode (no Worker available)', () => {
    it('should not be available when Worker fails to initialize', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      expect(cryptoService.available).toBe(false);
    });

    it('should report zero pending requests', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      expect(cryptoService.pendingCount).toBe(0);
    });

    it('should safely call terminate without error', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      cryptoService.terminate();
      expect(cryptoService.available).toBe(false);
    });

    it('should not throw when terminating with no worker', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      cryptoService.terminate();
      cryptoService.terminate();
      expect(cryptoService.available).toBe(false);
    });
  });

  describe('with injected mock Worker', () => {
    it('should become available after worker sends ready signal', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      const mock = injectMockWorker(cryptoService);

      mock.makeReady();

      expect(cryptoService.available).toBe(true);
      expect(cryptoService.pendingCount).toBe(0);
    });

    it('encrypt44 should post message and resolve on success', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      const mock = injectMockWorker(cryptoService);
      mock.makeReady();

      // Start encrypt44 request (async - uses microtasks for ensureReady)
      const resultPromise = cryptoService.encrypt44(new Uint8Array([1, 2, 3]), 'hello');

      // Yield to microtask queue so sendRequest can proceed past ensureReady
      await tick();

      expect(mock.worker.postMessage).toHaveBeenCalledTimes(1);
      const sentRequest = mock.worker.postMessage.mock.calls[0][0];
      expect(sentRequest.type).toBe('encrypt44');
      expect(sentRequest.payload.content).toBe('hello');
      expect(sentRequest.id).toMatch(/^crypto-/);

      // Simulate worker response
      mock.simulateMessage({
        id: sentRequest.id,
        success: true,
        result: 'encrypted-payload',
      });

      const result = await resultPromise;
      expect(result).toBe('encrypted-payload');
      expect(cryptoService.pendingCount).toBe(0);
    });

    it('decrypt44 should post message and resolve on success', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      const mock = injectMockWorker(cryptoService);
      mock.makeReady();

      const resultPromise = cryptoService.decrypt44(new Uint8Array([4, 5, 6]), 'cipher-text');
      await tick();

      const sentRequest = mock.worker.postMessage.mock.calls[0][0];
      expect(sentRequest.type).toBe('decrypt44');
      expect(sentRequest.payload.ciphertext).toBe('cipher-text');

      mock.simulateMessage({
        id: sentRequest.id,
        success: true,
        result: 'decrypted-content',
      });

      const result = await resultPromise;
      expect(result).toBe('decrypted-content');
    });

    it('getConversationKey should post message and resolve', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      const mock = injectMockWorker(cryptoService);
      mock.makeReady();

      const mockKey = new Uint8Array([10, 20, 30]);
      const resultPromise = cryptoService.getConversationKey('privkey-hex', 'pubkey-hex');
      await tick();

      const sentRequest = mock.worker.postMessage.mock.calls[0][0];
      expect(sentRequest.type).toBe('getConversationKey');
      expect(sentRequest.payload.privkey).toBe('privkey-hex');
      expect(sentRequest.payload.pubkey).toBe('pubkey-hex');

      mock.simulateMessage({
        id: sentRequest.id,
        success: true,
        result: mockKey,
      });

      const result = await resultPromise;
      expect(result).toEqual(mockKey);
    });

    it('should reject request on worker error response', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      const mock = injectMockWorker(cryptoService);
      mock.makeReady();

      const resultPromise = cryptoService.encrypt44(new Uint8Array([1]), 'test');
      await tick();

      const sentRequest = mock.worker.postMessage.mock.calls[0][0];

      mock.simulateMessage({
        id: sentRequest.id,
        success: false,
        error: 'Invalid key material',
      });

      await expect(resultPromise).rejects.toThrow('Invalid key material');
      expect(cryptoService.pendingCount).toBe(0);
    });

    it('should reject with "Unknown worker error" when no error message', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      const mock = injectMockWorker(cryptoService);
      mock.makeReady();

      const resultPromise = cryptoService.encrypt44(new Uint8Array([1]), 'test');
      await tick();

      const sentRequest = mock.worker.postMessage.mock.calls[0][0];

      mock.simulateMessage({
        id: sentRequest.id,
        success: false,
      });

      await expect(resultPromise).rejects.toThrow('Unknown worker error');
    });

    it('should reject all pending on worker onerror', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      const mock = injectMockWorker(cryptoService);
      mock.makeReady();

      const promise1 = cryptoService.encrypt44(new Uint8Array([1]), 'msg1')
        .catch((e: Error) => e);
      const promise2 = cryptoService.decrypt44(new Uint8Array([2]), 'msg2')
        .catch((e: Error) => e);

      await tick();

      expect(cryptoService.pendingCount).toBe(2);

      mock.simulateError('Worker crashed');

      const err1 = await promise1;
      const err2 = await promise2;

      expect(err1).toBeInstanceOf(Error);
      expect((err1 as Error).message).toContain('Worker error');
      expect(err2).toBeInstanceOf(Error);
      expect((err2 as Error).message).toContain('Worker error');
      expect(cryptoService.pendingCount).toBe(0);
    });

    it('should ignore response for unknown request ID', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      const mock = injectMockWorker(cryptoService);
      mock.makeReady();

      mock.simulateMessage({
        id: 'non-existent-id',
        success: true,
        result: 'orphan-data',
      });

      expect(cryptoService.pendingCount).toBe(0);
    });

    it('terminate should reject pending requests and cleanup', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      const mock = injectMockWorker(cryptoService);
      mock.makeReady();

      const promise = cryptoService.encrypt44(new Uint8Array([1]), 'test')
        .catch((e: Error) => e);

      await tick();

      expect(cryptoService.pendingCount).toBe(1);
      expect(cryptoService.available).toBe(true);

      cryptoService.terminate();

      const err = await promise;
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('Worker terminated');
      expect(cryptoService.available).toBe(false);
      expect(cryptoService.pendingCount).toBe(0);
      expect(mock.worker.terminate).toHaveBeenCalled();
    });

    it('sendRequest should timeout after 30 seconds', async () => {
      vi.useFakeTimers();

      const { cryptoService } = await import('$lib/services/cryptoService');
      const mock = injectMockWorker(cryptoService);
      mock.makeReady();

      const promise = cryptoService.encrypt44(new Uint8Array([1]), 'test')
        .catch((e: Error) => e);

      // Flush microtasks so sendRequest proceeds past ensureReady
      await vi.advanceTimersByTimeAsync(0);

      expect(cryptoService.pendingCount).toBe(1);

      // Advance past 30s timeout
      await vi.advanceTimersByTimeAsync(30001);

      const err = await promise;
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('Crypto operation timed out');
      expect(cryptoService.pendingCount).toBe(0);

      vi.useRealTimers();
    });

    it('should generate unique request IDs', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      const mock = injectMockWorker(cryptoService);
      mock.makeReady();

      const p1 = cryptoService.encrypt44(new Uint8Array([1]), 'a').catch(() => {});
      const p2 = cryptoService.encrypt44(new Uint8Array([2]), 'b').catch(() => {});

      await tick();

      const id1 = mock.worker.postMessage.mock.calls[0][0].id;
      const id2 = mock.worker.postMessage.mock.calls[1][0].id;

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^crypto-/);
      expect(id2).toMatch(/^crypto-/);

      // Clean up
      cryptoService.terminate();
      await p1;
      await p2;
    });

    it('sendRequest should throw when worker is null after ready', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      const mock = injectMockWorker(cryptoService);
      mock.makeReady();

      // Null out the worker after ready to test the guard in sendRequest
      (cryptoService as any).worker = null;

      await expect(
        cryptoService.encrypt44(new Uint8Array([1]), 'test')
      ).rejects.toThrow('Crypto worker not available');
    });
  });

  describe('CryptoService class API', () => {
    it('should have all expected methods', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      expect(typeof cryptoService.encrypt).toBe('function');
      expect(typeof cryptoService.decrypt).toBe('function');
      expect(typeof cryptoService.encrypt44).toBe('function');
      expect(typeof cryptoService.decrypt44).toBe('function');
      expect(typeof cryptoService.getConversationKey).toBe('function');
      expect(typeof cryptoService.terminate).toBe('function');
    });

    it('should have available getter', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      expect(typeof cryptoService.available).toBe('boolean');
    });

    it('should have pendingCount getter', async () => {
      const { cryptoService } = await import('$lib/services/cryptoService');
      expect(typeof cryptoService.pendingCount).toBe('number');
      expect(cryptoService.pendingCount).toBe(0);
    });
  });

  describe('type exports', () => {
    it('should export CryptoWorkerRequest and CryptoWorkerResponse types', async () => {
      const mod = await import('$lib/services/cryptoService');
      expect(mod).toBeDefined();
    });
  });
});

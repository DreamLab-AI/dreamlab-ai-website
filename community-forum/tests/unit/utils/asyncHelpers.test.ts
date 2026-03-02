/**
 * Unit Tests: Async Helper Utilities
 *
 * Tests for AsyncThrottle, RequestDeduplicator, BatchExecutor,
 * retryWithBackoff, and debounceAsync.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AsyncThrottle,
  RequestDeduplicator,
  BatchExecutor,
  retryWithBackoff,
  debounceAsync,
} from '$lib/utils/asyncHelpers';

describe('AsyncThrottle', () => {
  it('should execute tasks up to the concurrency limit', async () => {
    const throttle = new AsyncThrottle<string>(2);
    const order: string[] = [];

    const task1 = throttle.execute(async () => {
      order.push('start-1');
      await new Promise(r => setTimeout(r, 50));
      order.push('end-1');
      return '1';
    });

    const task2 = throttle.execute(async () => {
      order.push('start-2');
      await new Promise(r => setTimeout(r, 50));
      order.push('end-2');
      return '2';
    });

    const task3 = throttle.execute(async () => {
      order.push('start-3');
      return '3';
    });

    // Task 3 should be queued since max concurrency is 2
    expect(throttle.queueSize).toBeLessThanOrEqual(1);
    expect(throttle.active).toBeLessThanOrEqual(2);

    const results = await Promise.all([task1, task2, task3]);
    expect(results).toEqual(['1', '2', '3']);
  });

  it('should default to maxConcurrent of 5', () => {
    const throttle = new AsyncThrottle();
    expect(throttle.queueSize).toBe(0);
    expect(throttle.active).toBe(0);
  });

  it('should propagate errors from tasks', async () => {
    const throttle = new AsyncThrottle<string>(1);

    await expect(
      throttle.execute(async () => {
        throw new Error('task failed');
      })
    ).rejects.toThrow('task failed');
  });

  it('should continue processing queue after task failure', async () => {
    const throttle = new AsyncThrottle<string>(1);

    const failing = throttle.execute(async () => {
      throw new Error('fail');
    });

    const succeeding = throttle.execute(async () => 'ok');

    await expect(failing).rejects.toThrow('fail');
    expect(await succeeding).toBe('ok');
  });

  it('should report queue size correctly', async () => {
    const throttle = new AsyncThrottle<void>(1);
    let resolveFirst: () => void;
    const blockingPromise = new Promise<void>(r => { resolveFirst = r; });

    const task1 = throttle.execute(async () => { await blockingPromise; });
    // task1 is running, so the next one should be queued
    const task2Promise = throttle.execute(async () => {});

    expect(throttle.queueSize).toBe(1);
    expect(throttle.active).toBe(1);

    resolveFirst!();
    await task1;
    await task2Promise;

    expect(throttle.queueSize).toBe(0);
    expect(throttle.active).toBe(0);
  });

  it('should clear pending queue and reject items', async () => {
    const throttle = new AsyncThrottle<void>(1);
    let resolveFirst: () => void;
    const blockingPromise = new Promise<void>(r => { resolveFirst = r; });

    const task1 = throttle.execute(async () => { await blockingPromise; });
    const task2 = throttle.execute(async () => {});
    const task3 = throttle.execute(async () => {});

    throttle.clear();

    // Queued tasks should be rejected
    await expect(task2).rejects.toThrow('Queue cleared');
    await expect(task3).rejects.toThrow('Queue cleared');
    expect(throttle.queueSize).toBe(0);

    // Let the active task finish
    resolveFirst!();
    await task1;
  });
});

describe('RequestDeduplicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should execute and cache results', async () => {
    const dedup = new RequestDeduplicator<string>(5000);
    const fn = vi.fn().mockResolvedValue('result');

    const result1 = await dedup.execute('key1', fn);
    expect(result1).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should return cached result for same key within duration', async () => {
    const dedup = new RequestDeduplicator<string>(5000);
    const fn = vi.fn().mockResolvedValue('result');

    await dedup.execute('key1', fn);
    const result2 = await dedup.execute('key1', fn);

    expect(result2).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1); // Not called again
  });

  it('should re-execute after cache expires', async () => {
    const dedup = new RequestDeduplicator<string>(1000);
    const fn = vi.fn().mockResolvedValue('result');

    await dedup.execute('key1', fn);

    // Advance past cache duration
    vi.advanceTimersByTime(1100);

    await dedup.execute('key1', fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should deduplicate concurrent requests for same key', async () => {
    const dedup = new RequestDeduplicator<string>(5000);
    let resolveRequest: (v: string) => void;
    const fn = vi.fn().mockImplementation(() => new Promise(r => { resolveRequest = r; }));

    const promise1 = dedup.execute('key1', fn);
    const promise2 = dedup.execute('key1', fn);

    // Only called once despite two execute calls
    expect(fn).toHaveBeenCalledTimes(1);

    resolveRequest!('shared-result');

    expect(await promise1).toBe('shared-result');
    expect(await promise2).toBe('shared-result');
  });

  it('should execute separately for different keys', async () => {
    const dedup = new RequestDeduplicator<string>(5000);
    const fn1 = vi.fn().mockResolvedValue('a');
    const fn2 = vi.fn().mockResolvedValue('b');

    const [r1, r2] = await Promise.all([
      dedup.execute('key1', fn1),
      dedup.execute('key2', fn2),
    ]);

    expect(r1).toBe('a');
    expect(r2).toBe('b');
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it('should not cache failed requests', async () => {
    const dedup = new RequestDeduplicator<string>(5000);
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');

    await expect(dedup.execute('key1', fn)).rejects.toThrow('fail');
    const result = await dedup.execute('key1', fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should invalidate a specific key', async () => {
    const dedup = new RequestDeduplicator<string>(5000);
    const fn = vi.fn().mockResolvedValue('result');

    await dedup.execute('key1', fn);
    dedup.invalidate('key1');
    await dedup.execute('key1', fn);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should clear all cache', async () => {
    const dedup = new RequestDeduplicator<string>(5000);
    const fn = vi.fn().mockResolvedValue('result');

    await dedup.execute('key1', fn);
    await dedup.execute('key2', fn);
    dedup.clear();

    await dedup.execute('key1', fn);
    await dedup.execute('key2', fn);

    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('should clean expired entries', async () => {
    const dedup = new RequestDeduplicator<string>(1000);
    const fn = vi.fn().mockResolvedValue('result');

    await dedup.execute('key1', fn);
    vi.advanceTimersByTime(1100);

    dedup.cleanExpired();

    await dedup.execute('key1', fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('BatchExecutor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should batch multiple execute calls together', async () => {
    const executor = vi.fn().mockImplementation(async (keys: string[]) => {
      const map = new Map<string, string>();
      keys.forEach(k => map.set(k, `value-${k}`));
      return map;
    });

    const batch = new BatchExecutor<string, string>(executor, 50, 10);

    const p1 = batch.execute(['a', 'b']);
    const p2 = batch.execute(['c']);

    // Flush after delay
    await vi.advanceTimersByTimeAsync(15);

    const [r1, r2] = await Promise.all([p1, p2]);

    // Executor should have been called once with all keys
    expect(executor).toHaveBeenCalledTimes(1);
    expect(executor).toHaveBeenCalledWith(expect.arrayContaining(['a', 'b', 'c']));

    expect(r1.get('a')).toBe('value-a');
    expect(r2.get('c')).toBe('value-c');
  });

  it('should flush immediately when batch size reached', async () => {
    const executor = vi.fn().mockImplementation(async (keys: number[]) => {
      const map = new Map<number, string>();
      keys.forEach(k => map.set(k, `v${k}`));
      return map;
    });

    const batch = new BatchExecutor<number, string>(executor, 3, 1000);

    const p1 = batch.execute([1]);
    const p2 = batch.execute([2]);
    const p3 = batch.execute([3]); // This should trigger flush (3 >= maxBatchSize)

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(executor).toHaveBeenCalledTimes(1);
    expect(r1.get(1)).toBe('v1');
  });

  it('should deduplicate keys within a batch', async () => {
    const executor = vi.fn().mockImplementation(async (keys: string[]) => {
      const map = new Map<string, number>();
      keys.forEach(k => map.set(k, 1));
      return map;
    });

    const batch = new BatchExecutor<string, number>(executor, 50, 10);

    batch.execute(['a', 'b']);
    batch.execute(['b', 'c']);

    await vi.advanceTimersByTimeAsync(15);

    // Should have been called with deduplicated keys
    const calledKeys = executor.mock.calls[0][0];
    expect(new Set(calledKeys).size).toBe(calledKeys.length);
  });

  it('should propagate executor errors to all waiters', async () => {
    const executor = vi.fn().mockRejectedValue(new Error('batch failed'));

    const batch = new BatchExecutor<string, string>(executor, 50, 10);

    const p1 = batch.execute(['a']).catch(e => e);
    const p2 = batch.execute(['b']).catch(e => e);

    await vi.advanceTimersByTimeAsync(15);

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBeInstanceOf(Error);
    expect((r1 as Error).message).toBe('batch failed');
    expect(r2).toBeInstanceOf(Error);
    expect((r2 as Error).message).toBe('batch failed');
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure up to maxRetries', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');

    const promise = retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelayMs: 100,
    });

    // Advance through retry delays
    await vi.advanceTimersByTimeAsync(100); // first retry delay
    await vi.advanceTimersByTimeAsync(200); // second retry delay (100 * 2)

    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

    const promise = retryWithBackoff(fn, {
      maxRetries: 2,
      initialDelayMs: 100,
    }).catch(e => e);

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('persistent failure');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should respect shouldRetry predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('non-retryable'));

    await expect(
      retryWithBackoff(fn, {
        maxRetries: 5,
        initialDelayMs: 100,
        shouldRetry: () => false,
      })
    ).rejects.toThrow('non-retryable');

    expect(fn).toHaveBeenCalledTimes(1); // No retries
  });

  it('should cap delay at maxDelayMs', async () => {
    let delays: number[] = [];
    const originalSetTimeout = globalThis.setTimeout;

    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockRejectedValueOnce(new Error('3'))
      .mockResolvedValue('ok');

    const promise = retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 2000,
      backoffFactor: 3,
    });

    // First retry: 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    // Second retry: min(1000*3, 2000) = 2000ms
    await vi.advanceTimersByTimeAsync(2000);
    // Third retry: min(2000*3, 2000) = 2000ms (capped)
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toBe('ok');
  });

  it('should use default options when none provided', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('ok');

    const promise = retryWithBackoff(fn);

    // Default initial delay is 1000ms
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe('ok');
  });
});

describe('debounceAsync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay execution by the specified time', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const debounced = debounceAsync(fn, 200);

    const promise = debounced('arg1');

    expect(fn).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should only execute the last call within the delay window', async () => {
    const fn = vi.fn().mockResolvedValue('result');
    const debounced = debounceAsync(fn, 200);

    const p1 = debounced('first');
    const p2 = debounced('second');
    const p3 = debounced('third');

    await vi.advanceTimersByTimeAsync(200);

    // All promises should resolve to the same value (last call)
    const r3 = await p3;
    expect(r3).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
  });

  it('should propagate errors from the debounced function', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('async error'));
    const debounced = debounceAsync(fn, 100);

    const promise = debounced().catch(e => e);
    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('async error');
  });

  it('should allow new calls after the debounced function completes', async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => `call-${++callCount}`);
    const debounced = debounceAsync(fn, 100);

    const p1 = debounced();
    await vi.advanceTimersByTimeAsync(100);
    const r1 = await p1;
    expect(r1).toBe('call-1');

    const p2 = debounced();
    await vi.advanceTimersByTimeAsync(100);
    const r2 = await p2;
    expect(r2).toBe('call-2');

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

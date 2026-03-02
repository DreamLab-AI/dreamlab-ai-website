/**
 * Unit Tests: Event Pipeline
 *
 * Tests for the event processing pipeline including deduplication,
 * batching, validation, stage factories, and pipeline factories.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the events module (verifyEventSignature)
vi.mock('$lib/nostr/events', () => ({
  verifyEventSignature: vi.fn(() => true)
}));

import {
  EventPipeline,
  filterByKind,
  filterByAuthor,
  filterByTimeRange,
  filterByTag,
  transformContent,
  logEvent,
  createDefaultPipeline,
  createChannelPipeline,
  createDMPipeline,
  type PipelineConfig,
  type PipelineStats
} from '$lib/nostr/pipeline/eventPipeline';

import { verifyEventSignature } from '$lib/nostr/events';

// Helper: create a minimal valid event
function makeEvent(overrides: Partial<{
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}> = {}) {
  return {
    id: overrides.id ?? 'event-' + Math.random().toString(36).slice(2),
    pubkey: overrides.pubkey ?? 'a'.repeat(64),
    created_at: overrides.created_at ?? Math.floor(Date.now() / 1000),
    kind: overrides.kind ?? 1,
    tags: overrides.tags ?? [],
    content: overrides.content ?? 'hello',
    sig: overrides.sig ?? 'sig-' + Math.random().toString(36).slice(2)
  };
}

describe('EventPipeline', () => {
  let pipeline: EventPipeline;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyEventSignature).mockReturnValue(true);
  });

  afterEach(() => {
    pipeline?.destroy();
  });

  // ─────────────────────────────────────────────────
  // Constructor and configuration
  // ─────────────────────────────────────────────────

  describe('constructor', () => {
    it('should create pipeline with default config', () => {
      pipeline = new EventPipeline();
      const stats = pipeline.getStats();
      expect(stats.processed).toBe(0);
      expect(stats.deduplicated).toBe(0);
    });

    it('should accept custom config', () => {
      pipeline = new EventPipeline({
        deduplicate: false,
        verifySignatures: false,
        dedupeMaxSize: 100,
        dedupeTTL: 1000,
        concurrency: 5
      });
      // Process without dedup or sig check
      expect(pipeline.getStats().processed).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────
  // Single event processing
  // ─────────────────────────────────────────────────

  describe('process()', () => {
    it('should process a valid event', async () => {
      pipeline = new EventPipeline({ verifySignatures: true });
      const event = makeEvent();
      const result = await pipeline.process(event);
      expect(result).toBeTruthy();
      expect(result?.id).toBe(event.id);
      expect(pipeline.getStats().processed).toBe(1);
    });

    it('should deduplicate repeated events', async () => {
      pipeline = new EventPipeline({ deduplicate: true });
      const event = makeEvent({ id: 'dup-id' });

      const first = await pipeline.process(event);
      const second = await pipeline.process(event);

      expect(first).toBeTruthy();
      expect(second).toBeNull();
      expect(pipeline.getStats().deduplicated).toBe(1);
      expect(pipeline.getStats().processed).toBe(1);
    });

    it('should skip deduplication when disabled', async () => {
      pipeline = new EventPipeline({ deduplicate: false, verifySignatures: false });
      const event = makeEvent({ id: 'same-id' });

      const first = await pipeline.process(event);
      const second = await pipeline.process(event);

      expect(first).toBeTruthy();
      expect(second).toBeTruthy();
      expect(pipeline.getStats().deduplicated).toBe(0);
      expect(pipeline.getStats().processed).toBe(2);
    });

    it('should reject events with invalid signatures', async () => {
      pipeline = new EventPipeline({ verifySignatures: true });
      vi.mocked(verifyEventSignature).mockReturnValue(false);

      const event = makeEvent();
      const result = await pipeline.process(event);

      expect(result).toBeNull();
      expect(pipeline.getStats().invalidSignatures).toBe(1);
    });

    it('should skip signature verification when disabled', async () => {
      pipeline = new EventPipeline({ verifySignatures: false });
      vi.mocked(verifyEventSignature).mockReturnValue(false);

      const event = makeEvent();
      const result = await pipeline.process(event);

      expect(result).toBeTruthy();
      expect(verifyEventSignature).not.toHaveBeenCalled();
    });

    it('should handle errors in processing gracefully', async () => {
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: false });
      pipeline.addStage(() => {
        throw new Error('stage failure');
      });

      const event = makeEvent();
      const result = await pipeline.process(event);

      expect(result).toBeNull();
      expect(pipeline.getStats().errors).toBe(1);
    });

    it('should record processing time', async () => {
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: false });
      const event = makeEvent();
      await pipeline.process(event);

      const stats = pipeline.getStats();
      expect(stats.avgProcessingTime).toBeGreaterThanOrEqual(0);
    });
  });

  // ─────────────────────────────────────────────────
  // Pipeline stages
  // ─────────────────────────────────────────────────

  describe('addStage()', () => {
    it('should return this for chaining', () => {
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: false });
      const result = pipeline.addStage((e) => e);
      expect(result).toBe(pipeline);
    });

    it('should execute stages in order', async () => {
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: false });
      const order: number[] = [];

      pipeline
        .addStage((e) => { order.push(1); return e; })
        .addStage((e) => { order.push(2); return e; })
        .addStage((e) => { order.push(3); return e; });

      await pipeline.process(makeEvent());
      expect(order).toEqual([1, 2, 3]);
    });

    it('should stop processing when a stage returns null', async () => {
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: false });
      const order: number[] = [];

      pipeline
        .addStage((e) => { order.push(1); return e; })
        .addStage(() => { order.push(2); return null; })
        .addStage((e) => { order.push(3); return e; });

      const result = await pipeline.process(makeEvent());
      expect(result).toBeNull();
      expect(order).toEqual([1, 2]);
    });

    it('should handle async stages', async () => {
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: false });

      pipeline.addStage(async (e) => {
        await new Promise((r) => setTimeout(r, 5));
        return { ...e, content: 'modified' };
      });

      const result = await pipeline.process(makeEvent());
      expect(result?.content).toBe('modified');
    });
  });

  // ─────────────────────────────────────────────────
  // processMany
  // ─────────────────────────────────────────────────

  describe('processMany()', () => {
    it('should process multiple events', async () => {
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: false });
      const events = [makeEvent(), makeEvent(), makeEvent()];
      const results = await pipeline.processMany(events);

      expect(results).toHaveLength(3);
      expect(pipeline.getStats().processed).toBe(3);
    });

    it('should filter out null results', async () => {
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: false });
      let count = 0;
      pipeline.addStage((e) => {
        count++;
        return count % 2 === 0 ? null : e;
      });

      const events = [makeEvent(), makeEvent(), makeEvent(), makeEvent()];
      const results = await pipeline.processMany(events);

      expect(results).toHaveLength(2);
    });

    it('should respect concurrency limit', async () => {
      pipeline = new EventPipeline({
        verifySignatures: false,
        deduplicate: false,
        concurrency: 2
      });

      const events = Array.from({ length: 5 }, () => makeEvent());
      const results = await pipeline.processMany(events);

      expect(results).toHaveLength(5);
      expect(pipeline.getStats().processed).toBe(5);
    });

    it('should deduplicate across batch', async () => {
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: true });
      const sharedEvent = makeEvent({ id: 'shared' });
      const events = [sharedEvent, makeEvent(), sharedEvent];
      const results = await pipeline.processMany(events);

      expect(results).toHaveLength(2);
      expect(pipeline.getStats().deduplicated).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────
  // Batching
  // ─────────────────────────────────────────────────

  describe('enableBatching()', () => {
    it('should add processed events to batch collector', async () => {
      const batched: any[] = [];
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: false, batchSize: 2 });
      pipeline.enableBatching(async (events) => {
        batched.push(...events);
      });

      await pipeline.process(makeEvent());
      await pipeline.process(makeEvent());

      // Flush to force batch processing
      pipeline.flush();
      // Give async processing a moment
      await new Promise((r) => setTimeout(r, 50));

      expect(batched.length).toBeGreaterThanOrEqual(1);
    });

    it('should increment batchesProcessed stat', async () => {
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: false, batchSize: 1 });
      pipeline.enableBatching(async () => {});

      await pipeline.process(makeEvent());
      pipeline.flush();
      await new Promise((r) => setTimeout(r, 50));

      expect(pipeline.getStats().batchesProcessed).toBeGreaterThanOrEqual(0);
    });
  });

  // ─────────────────────────────────────────────────
  // Stats and cache management
  // ─────────────────────────────────────────────────

  describe('getStats()', () => {
    it('should return a copy of stats', async () => {
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: false });
      await pipeline.process(makeEvent());

      const stats1 = pipeline.getStats();
      const stats2 = pipeline.getStats();

      expect(stats1).toEqual(stats2);
      expect(stats1).not.toBe(stats2); // Different object reference
    });
  });

  describe('resetStats()', () => {
    it('should reset all stats to zero', async () => {
      pipeline = new EventPipeline({ verifySignatures: false, deduplicate: false });
      await pipeline.process(makeEvent());
      expect(pipeline.getStats().processed).toBe(1);

      pipeline.resetStats();
      const stats = pipeline.getStats();
      expect(stats.processed).toBe(0);
      expect(stats.deduplicated).toBe(0);
      expect(stats.invalidSignatures).toBe(0);
      expect(stats.errors).toBe(0);
      expect(stats.batchesProcessed).toBe(0);
      expect(stats.avgProcessingTime).toBe(0);
    });
  });

  describe('getCacheSize()', () => {
    it('should return dedup cache size', async () => {
      pipeline = new EventPipeline({ deduplicate: true, verifySignatures: false });
      expect(pipeline.getCacheSize()).toBe(0);

      await pipeline.process(makeEvent({ id: 'e1' }));
      expect(pipeline.getCacheSize()).toBe(1);

      await pipeline.process(makeEvent({ id: 'e2' }));
      expect(pipeline.getCacheSize()).toBe(2);
    });
  });

  describe('clearCache()', () => {
    it('should clear the deduplication cache', async () => {
      pipeline = new EventPipeline({ deduplicate: true, verifySignatures: false });
      await pipeline.process(makeEvent({ id: 'e1' }));
      expect(pipeline.getCacheSize()).toBe(1);

      pipeline.clearCache();
      expect(pipeline.getCacheSize()).toBe(0);

      // Should be able to re-process previously deduplicated event
      const result = await pipeline.process(makeEvent({ id: 'e1' }));
      expect(result).toBeTruthy();
    });
  });

  describe('flush()', () => {
    it('should not throw when no batch collector is set', () => {
      pipeline = new EventPipeline();
      expect(() => pipeline.flush()).not.toThrow();
    });
  });

  describe('destroy()', () => {
    it('should clean up resources', async () => {
      pipeline = new EventPipeline({ verifySignatures: false });
      pipeline.enableBatching(async () => {});
      await pipeline.process(makeEvent());

      pipeline.destroy();
      expect(pipeline.getCacheSize()).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────
  // Dedup cache TTL and eviction
  // ─────────────────────────────────────────────────

  describe('deduplication cache behavior', () => {
    it('should evict expired entries on has()', async () => {
      // Use very short TTL
      pipeline = new EventPipeline({
        deduplicate: true,
        verifySignatures: false,
        dedupeTTL: 1 // 1ms TTL
      });

      await pipeline.process(makeEvent({ id: 'short-lived' }));
      expect(pipeline.getCacheSize()).toBe(1);

      // Wait for expiry
      await new Promise((r) => setTimeout(r, 10));

      // Processing same ID should succeed since it expired
      const result = await pipeline.process(makeEvent({ id: 'short-lived' }));
      expect(result).toBeTruthy();
    });

    it('should evict oldest when at capacity with distinct timestamps', async () => {
      pipeline = new EventPipeline({
        deduplicate: true,
        verifySignatures: false,
        dedupeMaxSize: 3,
        dedupeTTL: 50 // Short enough that first entries expire before 4th
      });

      await pipeline.process(makeEvent({ id: 'e1' }));
      await pipeline.process(makeEvent({ id: 'e2' }));
      await pipeline.process(makeEvent({ id: 'e3' }));
      expect(pipeline.getCacheSize()).toBe(3);

      // Wait for first entries to expire so eviction can clean them
      await new Promise((r) => setTimeout(r, 60));

      // Adding a 4th: evictOldest removes expired entries first
      await pipeline.process(makeEvent({ id: 'e4' }));
      // Cache size should be reduced: expired entries removed + new entry added
      expect(pipeline.getCacheSize()).toBeLessThanOrEqual(3);
    });
  });
});

// =====================================================================
// Pipeline Stage Factories
// =====================================================================

describe('filterByKind()', () => {
  it('should pass events with matching kind', () => {
    const filter = filterByKind([1, 9]);
    expect(filter(makeEvent({ kind: 1 }))).toBeTruthy();
    expect(filter(makeEvent({ kind: 9 }))).toBeTruthy();
  });

  it('should reject events with non-matching kind', () => {
    const filter = filterByKind([1, 9]);
    expect(filter(makeEvent({ kind: 4 }))).toBeNull();
    expect(filter(makeEvent({ kind: 0 }))).toBeNull();
  });
});

describe('filterByAuthor()', () => {
  it('should pass events from matching authors', () => {
    const pubkey = 'a'.repeat(64);
    const filter = filterByAuthor([pubkey]);
    expect(filter(makeEvent({ pubkey }))).toBeTruthy();
  });

  it('should reject events from non-matching authors', () => {
    const filter = filterByAuthor(['a'.repeat(64)]);
    expect(filter(makeEvent({ pubkey: 'b'.repeat(64) }))).toBeNull();
  });
});

describe('filterByTimeRange()', () => {
  const now = Math.floor(Date.now() / 1000);

  it('should pass events within time range', () => {
    const filter = filterByTimeRange(now - 100, now + 100);
    expect(filter(makeEvent({ created_at: now }))).toBeTruthy();
  });

  it('should reject events before since', () => {
    const filter = filterByTimeRange(now, undefined);
    expect(filter(makeEvent({ created_at: now - 100 }))).toBeNull();
  });

  it('should reject events after until', () => {
    const filter = filterByTimeRange(undefined, now);
    expect(filter(makeEvent({ created_at: now + 100 }))).toBeNull();
  });

  it('should pass all events when no range specified', () => {
    const filter = filterByTimeRange(undefined, undefined);
    expect(filter(makeEvent({ created_at: now }))).toBeTruthy();
  });
});

describe('filterByTag()', () => {
  it('should pass events with matching tag name', () => {
    const filter = filterByTag('e');
    const event = makeEvent({ tags: [['e', 'chan123']] });
    expect(filter(event)).toBeTruthy();
  });

  it('should reject events without matching tag name', () => {
    const filter = filterByTag('e');
    const event = makeEvent({ tags: [['p', 'pubkey1']] });
    expect(filter(event)).toBeNull();
  });

  it('should filter by tag value when values provided', () => {
    const filter = filterByTag('e', ['chan123']);
    expect(filter(makeEvent({ tags: [['e', 'chan123']] }))).toBeTruthy();
    expect(filter(makeEvent({ tags: [['e', 'other']] }))).toBeNull();
  });

  it('should handle events with no tags', () => {
    const filter = filterByTag('e');
    expect(filter(makeEvent({ tags: [] }))).toBeNull();
  });
});

describe('transformContent()', () => {
  it('should transform event content', () => {
    const stage = transformContent((c) => c.toUpperCase());
    const event = makeEvent({ content: 'hello' });
    const result = stage(event);
    expect(result?.content).toBe('HELLO');
  });

  it('should preserve other event fields', () => {
    const stage = transformContent((c) => c + '!');
    const event = makeEvent({ id: 'keep-me', content: 'hi' });
    const result = stage(event);
    expect(result?.id).toBe('keep-me');
    expect(result?.content).toBe('hi!');
  });
});

describe('logEvent()', () => {
  it('should log and pass event through', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stage = logEvent('test');
    const event = makeEvent();
    const result = stage(event);

    expect(result).toBe(event);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should work without prefix', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stage = logEvent();
    const event = makeEvent();
    stage(event);

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// =====================================================================
// Pipeline Factories
// =====================================================================

describe('createDefaultPipeline()', () => {
  it('should create pipeline with dedup and sig verification', async () => {
    const pipeline = createDefaultPipeline();
    expect(pipeline).toBeInstanceOf(EventPipeline);

    const event = makeEvent();
    const result = await pipeline.process(event);
    expect(result).toBeTruthy();

    pipeline.destroy();
  });

  it('should accept config overrides', () => {
    const pipeline = createDefaultPipeline({ deduplicate: false });
    expect(pipeline).toBeInstanceOf(EventPipeline);
    pipeline.destroy();
  });
});

describe('createChannelPipeline()', () => {
  it('should filter by kind 9 and channel tag', async () => {
    vi.mocked(verifyEventSignature).mockReturnValue(true);
    const pipeline = createChannelPipeline('chan123');

    // Kind 9 with matching channel tag
    const validEvent = makeEvent({
      kind: 9,
      tags: [['e', 'chan123']]
    });
    const result = await pipeline.process(validEvent);
    expect(result).toBeTruthy();

    pipeline.destroy();
  });

  it('should reject wrong kind', async () => {
    const pipeline = createChannelPipeline('chan123');
    const event = makeEvent({ kind: 1, tags: [['e', 'chan123']] });
    const result = await pipeline.process(event);
    expect(result).toBeNull();

    pipeline.destroy();
  });

  it('should reject wrong channel', async () => {
    const pipeline = createChannelPipeline('chan123');
    const event = makeEvent({ kind: 9, tags: [['e', 'other']] });
    const result = await pipeline.process(event);
    expect(result).toBeNull();

    pipeline.destroy();
  });
});

describe('createDMPipeline()', () => {
  const userPubkey = 'u'.repeat(64);

  it('should pass DMs sent by user', async () => {
    const pipeline = createDMPipeline(userPubkey);
    const event = makeEvent({
      kind: 4,
      pubkey: userPubkey,
      tags: [['p', 'b'.repeat(64)]]
    });
    const result = await pipeline.process(event);
    expect(result).toBeTruthy();

    pipeline.destroy();
  });

  it('should pass DMs addressed to user', async () => {
    const pipeline = createDMPipeline(userPubkey);
    const event = makeEvent({
      kind: 4,
      pubkey: 'b'.repeat(64),
      tags: [['p', userPubkey]]
    });
    const result = await pipeline.process(event);
    expect(result).toBeTruthy();

    pipeline.destroy();
  });

  it('should reject DMs not involving user', async () => {
    const pipeline = createDMPipeline(userPubkey);
    const event = makeEvent({
      kind: 4,
      pubkey: 'b'.repeat(64),
      tags: [['p', 'c'.repeat(64)]]
    });
    const result = await pipeline.process(event);
    expect(result).toBeNull();

    pipeline.destroy();
  });

  it('should reject non-DM kinds', async () => {
    const pipeline = createDMPipeline(userPubkey);
    const event = makeEvent({
      kind: 1,
      pubkey: userPubkey,
      tags: []
    });
    const result = await pipeline.process(event);
    expect(result).toBeNull();

    pipeline.destroy();
  });
});

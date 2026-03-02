/**
 * Unit Tests: Nostr Events Helper Module
 *
 * Tests for event creation, signing, verification, parsing,
 * NIP-19 encoding/decoding, filters, and timestamp utilities.
 */

import { describe, it, expect, vi } from 'vitest';

// Use actual nostr-tools for crypto operations
vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual('nostr-tools');
  return actual;
});

import {
  createChannelMessage,
  createUserMetadata,
  createDeletionEvent,
  createTextNote,
  createReaction,
  signEvent,
  verifyEventSignature,
  parseChannelMessage,
  parseUserMetadata,
  getEventTags,
  getEventTag,
  eventReferences,
  eventMentions,
  npubEncode,
  npubDecode,
  noteEncode,
  noteDecode,
  nsecEncode,
  nsecDecode,
  neventEncode,
  nprofileEncode,
  channelMessagesFilter,
  userMetadataFilter,
  textNotesFilter,
  reactionsFilter,
  eventsByIdFilter,
  repliesFilter,
  nowSeconds,
  formatRelativeTime,
  formatAbsoluteTime,
  isRecent,
  msToSeconds,
  secondsToMs,
  isValidEventStructure,
  isValidEvent,
  isReply,
  isRootPost,
  getRootEventId,
  getReplyTargetId,
} from '$lib/nostr/events';

import { getPublicKey } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';

const TEST_PRIVKEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
// nostr-tools v2 getPublicKey accepts hex string or Uint8Array, returns hex string
const TEST_PUBKEY = getPublicKey(hexToBytes(TEST_PRIVKEY)) as string;

describe('Nostr Events Helper Module', () => {
  // =========================================================================
  // Event Creation
  // =========================================================================
  describe('createChannelMessage()', () => {
    it('should create kind 42 message event', () => {
      const event = createChannelMessage('Hello', 'channel-1', TEST_PRIVKEY);
      expect(event.kind).toBe(42);
      expect(event.content).toBe('Hello');
      expect(event.pubkey).toBe(TEST_PUBKEY);
      expect(event.id).toBeDefined();
      expect(event.sig).toBeDefined();
    });

    it('should include channel ID in root e tag', () => {
      const event = createChannelMessage('Test', 'ch-1', TEST_PRIVKEY);
      const eTag = event.tags.find((t) => t[0] === 'e' && t[3] === 'root');
      expect(eTag).toBeDefined();
      expect(eTag![1]).toBe('ch-1');
    });
  });

  describe('createUserMetadata()', () => {
    it('should create kind 0 metadata event', () => {
      const profile = { name: 'Alice', about: 'Hello World' };
      const event = createUserMetadata(profile as any, TEST_PRIVKEY);
      expect(event.kind).toBe(0);
      expect(JSON.parse(event.content)).toEqual(profile);
    });
  });

  describe('createDeletionEvent()', () => {
    it('should create kind 5 deletion event', () => {
      const event = createDeletionEvent(['evt-1', 'evt-2'], TEST_PRIVKEY, 'spam');
      expect(event.kind).toBe(5);
      expect(event.content).toBe('spam');
      expect(event.tags).toEqual([
        ['e', 'evt-1'],
        ['e', 'evt-2'],
      ]);
    });

    it('should handle empty reason', () => {
      const event = createDeletionEvent(['evt-1'], TEST_PRIVKEY);
      expect(event.content).toBe('');
    });
  });

  describe('createTextNote()', () => {
    it('should create kind 1 text note', () => {
      const event = createTextNote('Hello Nostr!', TEST_PRIVKEY);
      expect(event.kind).toBe(1);
      expect(event.content).toBe('Hello Nostr!');
    });

    it('should include reply tag when replying', () => {
      const event = createTextNote('Reply', TEST_PRIVKEY, 'parent-id');
      expect(event.tags).toEqual([['e', 'parent-id', '', 'reply']]);
    });
  });

  describe('createReaction()', () => {
    it('should create kind 7 reaction event', () => {
      const event = createReaction('evt-1', 'author-pub', TEST_PRIVKEY);
      expect(event.kind).toBe(7);
      expect(event.content).toBe('+');
      expect(event.tags).toEqual([
        ['e', 'evt-1'],
        ['p', 'author-pub'],
      ]);
    });

    it('should support custom reaction emoji', () => {
      const event = createReaction('evt-1', 'author', TEST_PRIVKEY, 'fire');
      expect(event.content).toBe('fire');
    });
  });

  // =========================================================================
  // Signing and Verification
  // =========================================================================
  describe('signEvent()', () => {
    it('should sign event template', () => {
      const template = {
        kind: 1,
        created_at: nowSeconds(),
        tags: [],
        content: 'signed',
      };
      const event = signEvent(template, TEST_PRIVKEY);
      expect(event.id).toBeDefined();
      expect(event.sig).toBeDefined();
    });
  });

  describe('verifyEventSignature()', () => {
    it('should return true for valid event', () => {
      const event = createTextNote('verify me', TEST_PRIVKEY);
      expect(verifyEventSignature(event)).toBe(true);
    });

    it('should return false for missing id', () => {
      expect(verifyEventSignature({ id: '', sig: 'x' } as any)).toBe(false);
    });

    it('should return false for missing sig', () => {
      expect(verifyEventSignature({ id: 'x', sig: '' } as any)).toBe(false);
    });

    it('should return false for tampered content', () => {
      const event = createTextNote('original', TEST_PRIVKEY);
      (event as any).content = 'tampered';
      expect(verifyEventSignature(event)).toBe(false);
    });
  });

  // =========================================================================
  // Event Parsing
  // =========================================================================
  describe('parseChannelMessage()', () => {
    it('should parse kind 42 channel message', () => {
      const event = createChannelMessage('Hello', 'ch-1', TEST_PRIVKEY);
      const parsed = parseChannelMessage(event);
      expect(parsed).not.toBeNull();
      expect(parsed!.content).toBe('Hello');
      expect(parsed!.channelId).toBe('ch-1');
    });

    it('should return null for wrong kind', () => {
      const event = createTextNote('not a channel msg', TEST_PRIVKEY);
      expect(parseChannelMessage(event)).toBeNull();
    });

    it('should return null for missing channel tag', () => {
      const event = { kind: 42, content: 'x', pubkey: 'p', tags: [], id: 'i', created_at: 0, sig: 's' };
      expect(parseChannelMessage(event as any)).toBeNull();
    });
  });

  describe('parseUserMetadata()', () => {
    it('should parse kind 0 metadata', () => {
      const event = createUserMetadata({ name: 'Alice' } as any, TEST_PRIVKEY);
      const parsed = parseUserMetadata(event);
      expect(parsed).not.toBeNull();
      expect(parsed!.name).toBe('Alice');
    });

    it('should return null for invalid JSON', () => {
      const event = { kind: 0, content: 'bad-json', pubkey: 'p', tags: [], id: 'i', created_at: 0, sig: 's' };
      expect(parseUserMetadata(event as any)).toBeNull();
    });

    it('should return null for wrong kind', () => {
      const event = createTextNote('not metadata', TEST_PRIVKEY);
      expect(parseUserMetadata(event)).toBeNull();
    });
  });

  // =========================================================================
  // Tag Utilities
  // =========================================================================
  describe('getEventTags()', () => {
    it('should extract all tags of given name', () => {
      const event = {
        tags: [['e', 'id1'], ['e', 'id2'], ['p', 'pk1']],
      };
      expect(getEventTags(event as any, 'e')).toEqual(['id1', 'id2']);
      expect(getEventTags(event as any, 'p')).toEqual(['pk1']);
    });

    it('should return empty array for missing tags', () => {
      expect(getEventTags({} as any, 'e')).toEqual([]);
    });
  });

  describe('getEventTag()', () => {
    it('should return first tag value', () => {
      const event = { tags: [['e', 'id1'], ['e', 'id2']] };
      expect(getEventTag(event as any, 'e')).toBe('id1');
    });

    it('should return undefined for missing tag', () => {
      expect(getEventTag({ tags: [] } as any, 'x')).toBeUndefined();
    });
  });

  describe('eventReferences()', () => {
    it('should return true when event references target', () => {
      const event = { tags: [['e', 'target-id']] };
      expect(eventReferences(event as any, 'target-id')).toBe(true);
    });

    it('should return false when no reference', () => {
      const event = { tags: [['e', 'other-id']] };
      expect(eventReferences(event as any, 'target-id')).toBe(false);
    });
  });

  describe('eventMentions()', () => {
    it('should return true when event mentions pubkey', () => {
      const event = { tags: [['p', 'target-pk']] };
      expect(eventMentions(event as any, 'target-pk')).toBe(true);
    });
  });

  // =========================================================================
  // NIP-19 Encoding/Decoding
  // =========================================================================
  describe('NIP-19', () => {
    it('should encode/decode npub', () => {
      const npub = npubEncode(TEST_PUBKEY);
      expect(npub).toMatch(/^npub1/);
      const decoded = npubDecode(npub);
      expect(decoded).toBe(TEST_PUBKEY);
    });

    it('should throw on invalid npub decode', () => {
      const nsec = nsecEncode(TEST_PRIVKEY);
      expect(() => npubDecode(nsec)).toThrow('Invalid npub format');
    });

    it('should encode/decode note', () => {
      const event = createTextNote('test', TEST_PRIVKEY);
      const note = noteEncode(event.id);
      expect(note).toMatch(/^note1/);
      const decoded = noteDecode(note);
      expect(decoded).toBe(event.id);
    });

    it('should throw on invalid note decode', () => {
      const npub = npubEncode(TEST_PUBKEY);
      expect(() => noteDecode(npub)).toThrow('Invalid note format');
    });

    it('should encode/decode nsec', () => {
      const nsec = nsecEncode(TEST_PRIVKEY);
      expect(nsec).toMatch(/^nsec1/);
      const decoded = nsecDecode(nsec);
      expect(decoded).toBe(TEST_PRIVKEY);
    });

    it('should throw on invalid nsec decode', () => {
      const npub = npubEncode(TEST_PUBKEY);
      expect(() => nsecDecode(npub)).toThrow('Invalid nsec format');
    });

    it('should encode nevent', () => {
      const nevent = neventEncode('a'.repeat(64));
      expect(nevent).toMatch(/^nevent1/);
    });

    it('should encode nprofile', () => {
      const nprofile = nprofileEncode(TEST_PUBKEY);
      expect(nprofile).toMatch(/^nprofile1/);
    });
  });

  // =========================================================================
  // Event Filters
  // =========================================================================
  describe('Filter factories', () => {
    it('channelMessagesFilter', () => {
      const filter = channelMessagesFilter('ch-1', 1000, 50);
      expect(filter.kinds).toEqual([42]);
      expect(filter['#e']).toEqual(['ch-1']);
      expect(filter.since).toBe(1000);
      expect(filter.limit).toBe(50);
    });

    it('userMetadataFilter', () => {
      const filter = userMetadataFilter(['pk1', 'pk2']);
      expect(filter.kinds).toEqual([0]);
      expect(filter.authors).toEqual(['pk1', 'pk2']);
    });

    it('textNotesFilter', () => {
      const filter = textNotesFilter(['pk1'], 500);
      expect(filter.kinds).toEqual([1]);
      expect(filter.since).toBe(500);
    });

    it('reactionsFilter', () => {
      const filter = reactionsFilter('evt-1', 50);
      expect(filter.kinds).toEqual([7]);
      expect(filter['#e']).toEqual(['evt-1']);
    });

    it('eventsByIdFilter', () => {
      const filter = eventsByIdFilter(['id1', 'id2']);
      expect(filter.ids).toEqual(['id1', 'id2']);
    });

    it('repliesFilter', () => {
      const filter = repliesFilter('evt-1');
      expect(filter.kinds).toEqual([1]);
      expect(filter['#e']).toEqual(['evt-1']);
    });
  });

  // =========================================================================
  // Timestamp Utilities
  // =========================================================================
  describe('Timestamp utilities', () => {
    it('nowSeconds should return current unix timestamp', () => {
      const now = nowSeconds();
      expect(now).toBeCloseTo(Math.floor(Date.now() / 1000), -1);
    });

    it('formatRelativeTime - just now', () => {
      expect(formatRelativeTime(nowSeconds())).toBe('just now');
    });

    it('formatRelativeTime - minutes', () => {
      expect(formatRelativeTime(nowSeconds() - 120)).toMatch(/2 mins ago/);
    });

    it('formatRelativeTime - hours', () => {
      expect(formatRelativeTime(nowSeconds() - 7200)).toMatch(/2 hours ago/);
    });

    it('formatRelativeTime - days', () => {
      expect(formatRelativeTime(nowSeconds() - 172800)).toMatch(/2 days ago/);
    });

    it('formatRelativeTime - weeks', () => {
      expect(formatRelativeTime(nowSeconds() - 1209600)).toMatch(/2 weeks ago/);
    });

    it('formatRelativeTime - months', () => {
      expect(formatRelativeTime(nowSeconds() - 5184000)).toMatch(/2 months ago/);
    });

    it('formatRelativeTime - years', () => {
      expect(formatRelativeTime(nowSeconds() - 63072000)).toMatch(/2 years ago/);
    });

    it('formatRelativeTime - future', () => {
      expect(formatRelativeTime(nowSeconds() + 1000)).toBe('in the future');
    });

    it('formatAbsoluteTime with time', () => {
      const result = formatAbsoluteTime(1711929600);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formatAbsoluteTime without time', () => {
      const result = formatAbsoluteTime(1711929600, false);
      expect(typeof result).toBe('string');
    });

    it('isRecent should detect recent timestamps', () => {
      expect(isRecent(nowSeconds() - 5, 10)).toBe(true);
      expect(isRecent(nowSeconds() - 20, 10)).toBe(false);
    });

    it('msToSeconds / secondsToMs', () => {
      expect(msToSeconds(5000)).toBe(5);
      expect(secondsToMs(5)).toBe(5000);
    });
  });

  // =========================================================================
  // Event Validation
  // =========================================================================
  describe('Event validation', () => {
    it('isValidEventStructure should validate structure', () => {
      const event = createTextNote('valid', TEST_PRIVKEY);
      expect(isValidEventStructure(event)).toBe(true);
    });

    it('isValidEventStructure should reject null', () => {
      expect(isValidEventStructure(null)).toBe(false);
    });

    it('isValidEventStructure should reject partial event', () => {
      expect(isValidEventStructure({ id: 'x' })).toBe(false);
    });

    it('isValidEvent should verify structure and signature', () => {
      const event = createTextNote('valid', TEST_PRIVKEY);
      expect(isValidEvent(event)).toBe(true);
    });

    it('isValidEvent should reject invalid structure', () => {
      expect(isValidEvent({ id: 'x' })).toBe(false);
    });
  });

  // =========================================================================
  // Reply Detection
  // =========================================================================
  describe('Reply detection', () => {
    it('isReply should detect reply events', () => {
      const event = createTextNote('reply', TEST_PRIVKEY, 'parent');
      expect(isReply(event)).toBe(true);
    });

    it('isReply should return false for root posts', () => {
      const event = createTextNote('root', TEST_PRIVKEY);
      expect(isReply(event)).toBe(false);
    });

    it('isRootPost should be inverse of isReply', () => {
      const root = createTextNote('root', TEST_PRIVKEY);
      const reply = createTextNote('reply', TEST_PRIVKEY, 'parent');
      expect(isRootPost(root)).toBe(true);
      expect(isRootPost(reply)).toBe(false);
    });

    it('getRootEventId should return root tag value', () => {
      const event = {
        tags: [
          ['e', 'root-id', '', 'root'],
          ['e', 'reply-id', '', 'reply'],
        ],
      };
      expect(getRootEventId(event as any)).toBe('root-id');
    });

    it('getReplyTargetId should return reply tag value', () => {
      const event = {
        tags: [['e', 'reply-id', '', 'reply']],
      };
      expect(getReplyTargetId(event as any)).toBe('reply-id');
    });

    it('getRootEventId should return undefined for no root tag', () => {
      expect(getRootEventId({ tags: [] } as any)).toBeUndefined();
    });
  });
});

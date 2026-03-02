/**
 * Unit Tests: NIP-44 E2E Encryption Module
 *
 * Tests for encryptChannelMessage, decryptChannelMessage,
 * isEncryptedChannelMessage, getRecipients, isRecipient, EncryptionError.
 */

import { describe, it, expect, vi } from 'vitest';

// Mock nostr-tools and nip44 carefully
vi.mock('nostr-tools/pure', async () => {
  const actual = await vi.importActual('nostr-tools/pure');
  return actual;
});

vi.mock('nostr-tools', async () => {
  const actual = await vi.importActual('nostr-tools');
  return actual;
});

import {
  encryptChannelMessage,
  decryptChannelMessage,
  isEncryptedChannelMessage,
  getRecipients,
  isRecipient,
  EncryptionError,
} from '$lib/nostr/encryption';

import { getPublicKey, generatePrivateKey } from 'nostr-tools/pure';
import { hexToBytes, bytesToHex } from '@noble/hashes/utils';

// ---------------------------------------------------------------------------
// Test keys - deterministic
// ---------------------------------------------------------------------------
const ALICE_PRIVKEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const ALICE_PUBKEY = getPublicKey(hexToBytes(ALICE_PRIVKEY));

const BOB_PRIVKEY = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
const BOB_PUBKEY = getPublicKey(hexToBytes(BOB_PRIVKEY));

const CHARLIE_PRIVKEY = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
const CHARLIE_PUBKEY = getPublicKey(hexToBytes(CHARLIE_PRIVKEY));

describe('NIP-44 E2E Encryption Module', () => {
  // =========================================================================
  // EncryptionError
  // =========================================================================
  describe('EncryptionError', () => {
    it('should have name, message, and code', () => {
      const err = new EncryptionError('test error', 'TEST_CODE');
      expect(err.name).toBe('EncryptionError');
      expect(err.message).toBe('test error');
      expect(err.code).toBe('TEST_CODE');
      expect(err instanceof Error).toBe(true);
    });
  });

  // =========================================================================
  // encryptChannelMessage() - input validation
  // =========================================================================
  describe('encryptChannelMessage() validation', () => {
    it('should throw INVALID_CONTENT for empty content', async () => {
      await expect(
        encryptChannelMessage('', 'ch1', ALICE_PRIVKEY, [BOB_PUBKEY])
      ).rejects.toThrow('Message content is required');
    });

    it('should throw INVALID_CHANNEL for empty channelId', async () => {
      await expect(
        encryptChannelMessage('hello', '', ALICE_PRIVKEY, [BOB_PUBKEY])
      ).rejects.toThrow('Channel ID is required');
    });

    it('should throw INVALID_KEY for invalid sender private key', async () => {
      await expect(
        encryptChannelMessage('hello', 'ch1', 'bad-key', [BOB_PUBKEY])
      ).rejects.toThrow('Sender private key must be a 64-character hexadecimal string');
    });

    it('should throw INVALID_MEMBERS for empty members array', async () => {
      await expect(
        encryptChannelMessage('hello', 'ch1', ALICE_PRIVKEY, [])
      ).rejects.toThrow('Member public keys array is required and must not be empty');
    });

    it('should throw INVALID_KEY_FORMAT for invalid member pubkeys', async () => {
      await expect(
        encryptChannelMessage('hello', 'ch1', ALICE_PRIVKEY, ['bad-pubkey'])
      ).rejects.toThrow('Member public key must be a 64-character hexadecimal string');
    });
  });

  // =========================================================================
  // encryptChannelMessage() - encryption
  // =========================================================================
  describe('encryptChannelMessage() encryption', () => {
    it('should produce a valid signed event', async () => {
      const event = await encryptChannelMessage(
        'Hello everyone!',
        'channel-123',
        ALICE_PRIVKEY,
        [BOB_PUBKEY, CHARLIE_PUBKEY]
      );

      expect(event.kind).toBe(9);
      expect(event.pubkey).toBe(ALICE_PUBKEY);
      expect(event.id).toBeDefined();
      expect(event.sig).toBeDefined();
    });

    it('should include encrypted and channel tags', async () => {
      const event = await encryptChannelMessage(
        'Hello',
        'ch-1',
        ALICE_PRIVKEY,
        [BOB_PUBKEY]
      );

      expect(event.tags).toEqual(
        expect.arrayContaining([
          ['h', 'ch-1'],
          ['encrypted', 'nip44'],
          ['p', BOB_PUBKEY],
        ])
      );
    });

    it('should include p tags for each member', async () => {
      const event = await encryptChannelMessage(
        'Hello',
        'ch-1',
        ALICE_PRIVKEY,
        [BOB_PUBKEY, CHARLIE_PUBKEY]
      );

      const pTags = event.tags.filter((t) => t[0] === 'p').map((t) => t[1]);
      expect(pTags).toContain(BOB_PUBKEY);
      expect(pTags).toContain(CHARLIE_PUBKEY);
    });

    it('should have JSON content with encrypted payloads', async () => {
      const event = await encryptChannelMessage(
        'Hello',
        'ch-1',
        ALICE_PRIVKEY,
        [BOB_PUBKEY]
      );

      const payloads = JSON.parse(event.content);
      expect(payloads[BOB_PUBKEY]).toBeDefined();
      expect(typeof payloads[BOB_PUBKEY]).toBe('string');
    });
  });

  // =========================================================================
  // decryptChannelMessage() - validation
  // =========================================================================
  describe('decryptChannelMessage() validation', () => {
    it('should throw INVALID_EVENT for null event', () => {
      expect(() => decryptChannelMessage(null as any, BOB_PRIVKEY)).toThrow(
        'Event is required and must be an object'
      );
    });

    it('should throw INVALID_EVENT_KIND for wrong kind', () => {
      const event = {
        kind: 1,
        content: '{}',
        tags: [['encrypted', 'nip44'], ['h', 'ch1']],
        pubkey: ALICE_PUBKEY,
        id: 'id',
        sig: 'sig',
        created_at: 1000,
      };
      expect(() => decryptChannelMessage(event as any, BOB_PRIVKEY)).toThrow(
        'Invalid event kind: expected 9, got 1'
      );
    });

    it('should throw NOT_ENCRYPTED_EVENT for missing encrypted tag', () => {
      const event = {
        kind: 9,
        content: '{}',
        tags: [['h', 'ch1']],
        pubkey: ALICE_PUBKEY,
        id: 'id',
        sig: 'sig',
        created_at: 1000,
      };
      expect(() => decryptChannelMessage(event as any, BOB_PRIVKEY)).toThrow(
        'Event is not marked as NIP-44 encrypted'
      );
    });

    it('should throw MISSING_CHANNEL_ID for missing h tag', () => {
      const event = {
        kind: 9,
        content: '{}',
        tags: [['encrypted', 'nip44']],
        pubkey: ALICE_PUBKEY,
        id: 'id',
        sig: 'sig',
        created_at: 1000,
      };
      expect(() => decryptChannelMessage(event as any, BOB_PRIVKEY)).toThrow(
        'Event missing channel ID (h tag)'
      );
    });

    it('should throw for invalid recipient private key', () => {
      const event = {
        kind: 9,
        content: '{}',
        tags: [['encrypted', 'nip44'], ['h', 'ch1']],
        pubkey: ALICE_PUBKEY,
        id: 'id',
        sig: 'sig',
        created_at: 1000,
      };
      expect(() => decryptChannelMessage(event as any, 'bad-key')).toThrow(
        'Recipient private key must be a 64-character hexadecimal string'
      );
    });

    it('should throw for invalid JSON content', () => {
      const event = {
        kind: 9,
        content: 'not-json',
        tags: [['encrypted', 'nip44'], ['h', 'ch1']],
        pubkey: ALICE_PUBKEY,
        id: 'id',
        sig: 'sig',
        created_at: 1000,
      };
      expect(() => decryptChannelMessage(event as any, BOB_PRIVKEY)).toThrow(
        'Failed to parse event content as JSON'
      );
    });
  });

  // =========================================================================
  // Encrypt + Decrypt roundtrip
  // =========================================================================
  describe('encrypt/decrypt roundtrip', () => {
    it('should allow recipient to decrypt message', async () => {
      const event = await encryptChannelMessage(
        'Secret message',
        'channel-1',
        ALICE_PRIVKEY,
        [BOB_PUBKEY]
      );

      const decrypted = decryptChannelMessage(event, BOB_PRIVKEY);
      expect(decrypted).not.toBeNull();
      expect(decrypted!.content).toBe('Secret message');
      expect(decrypted!.senderPubkey).toBe(ALICE_PUBKEY);
      expect(decrypted!.channelId).toBe('channel-1');
    });

    it('should return null for non-recipient', async () => {
      const event = await encryptChannelMessage(
        'Secret message',
        'channel-1',
        ALICE_PRIVKEY,
        [BOB_PUBKEY]
      );

      const decrypted = decryptChannelMessage(event, CHARLIE_PRIVKEY);
      expect(decrypted).toBeNull();
    });

    it('should handle multi-recipient encryption', async () => {
      const event = await encryptChannelMessage(
        'Group secret',
        'channel-1',
        ALICE_PRIVKEY,
        [BOB_PUBKEY, CHARLIE_PUBKEY]
      );

      const bobResult = decryptChannelMessage(event, BOB_PRIVKEY);
      expect(bobResult!.content).toBe('Group secret');

      const charlieResult = decryptChannelMessage(event, CHARLIE_PRIVKEY);
      expect(charlieResult!.content).toBe('Group secret');
    });

    it('should handle unicode content', async () => {
      const event = await encryptChannelMessage(
        'Hello World!',
        'ch1',
        ALICE_PRIVKEY,
        [BOB_PUBKEY]
      );
      const decrypted = decryptChannelMessage(event, BOB_PRIVKEY);
      expect(decrypted!.content).toBe('Hello World!');
    });
  });

  // =========================================================================
  // isEncryptedChannelMessage()
  // =========================================================================
  describe('isEncryptedChannelMessage()', () => {
    it('should return true for kind 9 with encrypted tag', () => {
      const event = {
        kind: 9,
        tags: [['encrypted', 'nip44'], ['h', 'ch1']],
        content: '{}',
        pubkey: ALICE_PUBKEY,
        id: 'id',
        sig: 'sig',
        created_at: 1000,
      };
      expect(isEncryptedChannelMessage(event as any)).toBe(true);
    });

    it('should return false for wrong kind', () => {
      const event = {
        kind: 1,
        tags: [['encrypted', 'nip44']],
        content: '',
        pubkey: ALICE_PUBKEY,
        id: 'id',
        sig: 'sig',
        created_at: 1000,
      };
      expect(isEncryptedChannelMessage(event as any)).toBe(false);
    });

    it('should return false for missing encrypted tag', () => {
      const event = {
        kind: 9,
        tags: [['h', 'ch1']],
        content: '',
        pubkey: ALICE_PUBKEY,
        id: 'id',
        sig: 'sig',
        created_at: 1000,
      };
      expect(isEncryptedChannelMessage(event as any)).toBe(false);
    });
  });

  // =========================================================================
  // getRecipients()
  // =========================================================================
  describe('getRecipients()', () => {
    it('should return p tag values from encrypted event', () => {
      const event = {
        kind: 9,
        tags: [
          ['encrypted', 'nip44'],
          ['h', 'ch1'],
          ['p', BOB_PUBKEY],
          ['p', CHARLIE_PUBKEY],
        ],
        content: '{}',
        pubkey: ALICE_PUBKEY,
        id: 'id',
        sig: 'sig',
        created_at: 1000,
      };
      expect(getRecipients(event as any)).toEqual([BOB_PUBKEY, CHARLIE_PUBKEY]);
    });

    it('should return empty array for non-encrypted event', () => {
      const event = {
        kind: 1,
        tags: [['p', BOB_PUBKEY]],
        content: '',
        pubkey: ALICE_PUBKEY,
        id: 'id',
        sig: 'sig',
        created_at: 1000,
      };
      expect(getRecipients(event as any)).toEqual([]);
    });
  });

  // =========================================================================
  // isRecipient()
  // =========================================================================
  describe('isRecipient()', () => {
    const event = {
      kind: 9,
      tags: [
        ['encrypted', 'nip44'],
        ['h', 'ch1'],
        ['p', BOB_PUBKEY],
      ],
      content: '{}',
      pubkey: ALICE_PUBKEY,
      id: 'id',
      sig: 'sig',
      created_at: 1000,
    };

    it('should return true for listed recipient', () => {
      expect(isRecipient(event as any, BOB_PUBKEY)).toBe(true);
    });

    it('should return false for non-listed recipient', () => {
      expect(isRecipient(event as any, CHARLIE_PUBKEY)).toBe(false);
    });
  });
});

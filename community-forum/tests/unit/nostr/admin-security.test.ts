/**
 * Unit Tests: Admin Security Module
 *
 * Tests for pin list verification, rate limiting, cohort validation,
 * request signing/verification, suspicious activity logging.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('$app/environment', () => ({
  browser: true,
  dev: true,
  building: false,
  version: 'test',
}));

vi.mock('$lib/nostr/events', () => ({
  verifyEventSignature: vi.fn().mockReturnValue(true),
  nowSeconds: vi.fn(() => Math.floor(Date.now() / 1000)),
}));

vi.mock('$lib/nostr/whitelist', () => ({
  verifyWhitelistStatus: vi.fn().mockResolvedValue({
    isWhitelisted: true,
    isAdmin: true,
    cohorts: ['admin', 'business'],
    verifiedAt: Date.now(),
    source: 'relay',
  }),
}));

// Mock sessionStorage
const sessionStorageMock: Record<string, string> = {};
Object.defineProperty(globalThis, 'sessionStorage', {
  value: {
    getItem: vi.fn((key: string) => sessionStorageMock[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      sessionStorageMock[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete sessionStorageMock[key];
    }),
    clear: vi.fn(() => {
      Object.keys(sessionStorageMock).forEach((k) => delete sessionStorageMock[k]);
    }),
  },
  writable: true,
});

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------
import {
  verifyPinListSignature,
  parsePinList,
  checkRateLimit,
  recordRateLimitAttempt,
  clearRateLimit,
  validateCohortAssignment,
  getVerifiedCohorts,
  createSignedAdminRequest,
  verifySignedAdminRequest,
  verifyRelayResponse,
  getSuspiciousActivities,
  clearSuspiciousActivities,
  RATE_LIMIT_CONFIG,
  RESTRICTED_COHORTS,
  SIGNATURE_VALIDITY_WINDOW_SECONDS,
} from '$lib/nostr/admin-security';

import { verifyEventSignature, nowSeconds } from '$lib/nostr/events';
import { verifyWhitelistStatus } from '$lib/nostr/whitelist';

const ADMIN_PUBKEY = 'a'.repeat(64);

describe('Admin Security Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(sessionStorageMock).forEach((k) => delete sessionStorageMock[k]);
    (verifyEventSignature as any).mockReturnValue(true);
    (nowSeconds as any).mockReturnValue(Math.floor(Date.now() / 1000));
    (verifyWhitelistStatus as any).mockResolvedValue({
      isWhitelisted: true,
      isAdmin: true,
      cohorts: ['admin', 'business'],
      verifiedAt: Date.now(),
      source: 'relay',
    });
  });

  // =========================================================================
  // Constants
  // =========================================================================
  describe('Exported constants', () => {
    it('should export RATE_LIMIT_CONFIG', () => {
      expect(RATE_LIMIT_CONFIG).toHaveProperty('sectionAccessRequest');
      expect(RATE_LIMIT_CONFIG).toHaveProperty('cohortChange');
      expect(RATE_LIMIT_CONFIG).toHaveProperty('adminAction');
    });

    it('should export RESTRICTED_COHORTS', () => {
      expect(RESTRICTED_COHORTS).toContain('admin');
    });

    it('should export SIGNATURE_VALIDITY_WINDOW_SECONDS', () => {
      expect(SIGNATURE_VALIDITY_WINDOW_SECONDS).toBe(300);
    });
  });

  // =========================================================================
  // verifyPinListSignature()
  // =========================================================================
  describe('verifyPinListSignature()', () => {
    const validEvent = {
      id: 'e'.repeat(64),
      kind: 30001,
      pubkey: ADMIN_PUBKEY,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: '',
      sig: 's'.repeat(128),
    };

    it('should return valid for correct event', () => {
      const result = verifyPinListSignature(validEvent as any, ADMIN_PUBKEY);
      expect(result.valid).toBe(true);
    });

    it('should reject wrong event kind', () => {
      const event = { ...validEvent, kind: 1 };
      const result = verifyPinListSignature(event as any, ADMIN_PUBKEY);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid event kind');
    });

    it('should reject author mismatch', () => {
      const event = { ...validEvent, pubkey: 'b'.repeat(64) };
      const result = verifyPinListSignature(event as any, ADMIN_PUBKEY);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('author does not match');
    });

    it('should reject missing signature', () => {
      const event = { ...validEvent, sig: '' };
      const result = verifyPinListSignature(event as any, ADMIN_PUBKEY);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid or missing signature');
    });

    it('should reject wrong signature length', () => {
      const event = { ...validEvent, sig: 'short' };
      const result = verifyPinListSignature(event as any, ADMIN_PUBKEY);
      expect(result.valid).toBe(false);
    });

    it('should reject invalid cryptographic signature', () => {
      (verifyEventSignature as any).mockReturnValue(false);
      const result = verifyPinListSignature(validEvent as any, ADMIN_PUBKEY);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('signature verification failed');
    });

    it('should reject events older than 30 days', () => {
      const oldEvent = {
        ...validEvent,
        created_at: Math.floor(Date.now() / 1000) - 31 * 86400,
      };
      const result = verifyPinListSignature(oldEvent as any, ADMIN_PUBKEY);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too old');
    });
  });

  // =========================================================================
  // parsePinList()
  // =========================================================================
  describe('parsePinList()', () => {
    it('should extract event pins from e tags', () => {
      const event = {
        kind: 30001,
        tags: [
          ['e', 'event-id-1'],
          ['e', 'event-id-2'],
        ],
        content: '',
        pubkey: ADMIN_PUBKEY,
      };

      const result = parsePinList(event as any);
      expect(result.pins).toEqual(['event-id-1', 'event-id-2']);
    });

    it('should extract addressable event pins from a tags', () => {
      const event = {
        kind: 30001,
        tags: [['a', '30023:pubkey:slug']],
        content: '',
        pubkey: ADMIN_PUBKEY,
      };

      const result = parsePinList(event as any);
      expect(result.pins).toEqual(['30023:pubkey:slug']);
    });

    it('should return empty array when no tags', () => {
      const event = { kind: 30001, content: '', pubkey: ADMIN_PUBKEY };
      const result = parsePinList(event as any);
      expect(result.pins).toEqual([]);
    });

    it('should ignore tags without values', () => {
      const event = {
        kind: 30001,
        tags: [['e'], ['a']],
        content: '',
        pubkey: ADMIN_PUBKEY,
      };

      const result = parsePinList(event as any);
      expect(result.pins).toEqual([]);
    });
  });

  // =========================================================================
  // checkRateLimit() / recordRateLimitAttempt() / clearRateLimit()
  // =========================================================================
  describe('Rate Limiting', () => {
    it('should allow first attempt', () => {
      const result = checkRateLimit('test-action', 'sectionAccessRequest');
      expect(result.allowed).toBe(true);
    });

    it('should track attempts and block when limit reached', () => {
      const config = RATE_LIMIT_CONFIG.sectionAccessRequest;

      for (let i = 0; i < config.maxAttempts; i++) {
        recordRateLimitAttempt('block-test', 'sectionAccessRequest', false);
      }

      const result = checkRateLimit('block-test', 'sectionAccessRequest');
      expect(result.allowed).toBe(false);
      expect(result.waitMs).toBeDefined();
    });

    it('should reset on successful attempt', () => {
      recordRateLimitAttempt('reset-test', 'sectionAccessRequest', false);
      recordRateLimitAttempt('reset-test', 'sectionAccessRequest', true);

      const result = checkRateLimit('reset-test', 'sectionAccessRequest');
      expect(result.allowed).toBe(true);
    });

    it('should clear rate limit', () => {
      recordRateLimitAttempt('clear-test', 'sectionAccessRequest', false);
      clearRateLimit('clear-test');

      const result = checkRateLimit('clear-test', 'sectionAccessRequest');
      expect(result.allowed).toBe(true);
    });

    it('should handle different action types', () => {
      expect(checkRateLimit('cohort-test', 'cohortChange').allowed).toBe(true);
      expect(checkRateLimit('admin-test', 'adminAction').allowed).toBe(true);
    });

    it('should respect backoff period', () => {
      const config = RATE_LIMIT_CONFIG.sectionAccessRequest;
      for (let i = 0; i < config.maxAttempts + 1; i++) {
        recordRateLimitAttempt('backoff-test', 'sectionAccessRequest', false);
      }

      const result = checkRateLimit('backoff-test', 'sectionAccessRequest');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Rate limited');
    });
  });

  // =========================================================================
  // validateCohortAssignment()
  // =========================================================================
  describe('validateCohortAssignment()', () => {
    it('should allow admin to assign cohorts', async () => {
      const result = await validateCohortAssignment(ADMIN_PUBKEY, 'b'.repeat(64), [
        'business',
      ]);
      expect(result.valid).toBe(true);
    });

    it('should reject non-admin requests', async () => {
      (verifyWhitelistStatus as any).mockResolvedValue({
        isWhitelisted: true,
        isAdmin: false,
        cohorts: ['business'],
      });

      const result = await validateCohortAssignment('b'.repeat(64), 'c'.repeat(64), [
        'business',
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Only admins');
    });

    it('should prevent self-assignment to admin cohort', async () => {
      const result = await validateCohortAssignment(ADMIN_PUBKEY, ADMIN_PUBKEY, [
        'admin',
      ]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot self-assign admin');
    });
  });

  // =========================================================================
  // getVerifiedCohorts()
  // =========================================================================
  describe('getVerifiedCohorts()', () => {
    it('should return cohorts from whitelist status', async () => {
      const cohorts = await getVerifiedCohorts(ADMIN_PUBKEY);
      expect(cohorts).toEqual(['admin', 'business']);
    });
  });

  // =========================================================================
  // createSignedAdminRequest() / verifySignedAdminRequest()
  // =========================================================================
  describe('Signed Admin Requests', () => {
    it('should create signed request', async () => {
      const signFn = vi.fn().mockResolvedValue('signature123');

      const request = await createSignedAdminRequest(
        'test-action',
        { data: 'payload' },
        ADMIN_PUBKEY,
        signFn
      );

      expect(request.action).toBe('test-action');
      expect(request.pubkey).toBe(ADMIN_PUBKEY);
      expect(request.signature).toBe('signature123');
      expect(request.nonce).toBeDefined();
      expect(request.timestamp).toBeGreaterThan(0);
    });

    it('should verify valid signed request', async () => {
      const signFn = vi.fn().mockResolvedValue('valid-sig');
      const verifyFn = vi.fn().mockResolvedValue(true);

      const request = await createSignedAdminRequest(
        'test-action',
        { data: 'payload' },
        ADMIN_PUBKEY,
        signFn
      );

      const result = await verifySignedAdminRequest(request, verifyFn);
      expect(result.valid).toBe(true);
    });

    it('should reject expired request', async () => {
      const verifyFn = vi.fn().mockResolvedValue(true);

      const request = {
        action: 'test',
        timestamp: Math.floor(Date.now() / 1000) - 600, // 10 min ago
        nonce: 'a'.repeat(32),
        pubkey: ADMIN_PUBKEY,
        payload: {},
        signature: 'sig',
      };

      const result = await verifySignedAdminRequest(request, verifyFn);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject future timestamp', async () => {
      const verifyFn = vi.fn().mockResolvedValue(true);

      const request = {
        action: 'test',
        timestamp: Math.floor(Date.now() / 1000) + 600,
        nonce: 'a'.repeat(32),
        pubkey: ADMIN_PUBKEY,
        payload: {},
        signature: 'sig',
      };

      const result = await verifySignedAdminRequest(request, verifyFn);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
    });

    it('should reject short nonce', async () => {
      const verifyFn = vi.fn().mockResolvedValue(true);

      const request = {
        action: 'test',
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 'short',
        pubkey: ADMIN_PUBKEY,
        payload: {},
        signature: 'sig',
      };

      const result = await verifySignedAdminRequest(request, verifyFn);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('nonce');
    });

    it('should reject non-admin signer', async () => {
      const verifyFn = vi.fn().mockResolvedValue(true);

      (verifyWhitelistStatus as any).mockResolvedValue({
        isWhitelisted: true,
        isAdmin: false,
        cohorts: ['business'],
      });

      const request = {
        action: 'test',
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 'a'.repeat(32),
        pubkey: 'b'.repeat(64),
        payload: {},
        signature: 'sig',
      };

      const result = await verifySignedAdminRequest(request, verifyFn);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not an admin');
    });

    it('should reject invalid signature', async () => {
      const verifyFn = vi.fn().mockResolvedValue(false);

      const request = {
        action: 'test',
        timestamp: Math.floor(Date.now() / 1000),
        nonce: 'a'.repeat(32),
        pubkey: ADMIN_PUBKEY,
        payload: {},
        signature: 'bad-sig',
      };

      const result = await verifySignedAdminRequest(request, verifyFn);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid request signature');
    });

    it('should reject replayed nonce', async () => {
      const signFn = vi.fn().mockResolvedValue('sig');
      const verifyFn = vi.fn().mockResolvedValue(true);

      const request = await createSignedAdminRequest(
        'test',
        {},
        ADMIN_PUBKEY,
        signFn
      );

      // First verify should succeed
      const r1 = await verifySignedAdminRequest(request, verifyFn);
      expect(r1.valid).toBe(true);

      // Second verify with same nonce should fail
      const r2 = await verifySignedAdminRequest(request, verifyFn);
      expect(r2.valid).toBe(false);
      expect(r2.error).toContain('nonce already used');
    });
  });

  // =========================================================================
  // verifyRelayResponse()
  // =========================================================================
  describe('verifyRelayResponse()', () => {
    it('should return valid with warning for unsigned response', () => {
      const result = verifyRelayResponse({ data: 'test' });
      expect(result.valid).toBe(true);
      expect(result.warning).toContain('not signed');
    });

    it('should accept signed response with recent timestamp', () => {
      const result = verifyRelayResponse({
        signature: 'sig',
        timestamp: Math.floor(Date.now() / 1000),
        data: 'test',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject stale response (>60s)', () => {
      const result = verifyRelayResponse({
        signature: 'sig',
        timestamp: Math.floor(Date.now() / 1000) - 120,
        data: 'test',
      });
      expect(result.valid).toBe(false);
      expect(result.warning).toContain('stale');
    });
  });

  // =========================================================================
  // Suspicious Activity Logging
  // =========================================================================
  describe('Suspicious Activity Logging', () => {
    it('should return empty activities initially', () => {
      clearSuspiciousActivities();
      const activities = getSuspiciousActivities();
      expect(activities).toEqual([]);
    });

    it('should clear suspicious activities', () => {
      clearSuspiciousActivities();
      expect(getSuspiciousActivities()).toEqual([]);
    });

    it('should log activities through pin list verification', () => {
      clearSuspiciousActivities();

      // Trigger suspicious activity by verifying with wrong author
      verifyPinListSignature(
        {
          id: 'e'.repeat(64),
          kind: 30001,
          pubkey: 'b'.repeat(64),
          created_at: Math.floor(Date.now() / 1000),
          tags: [],
          content: '',
          sig: 's'.repeat(128),
        } as any,
        ADMIN_PUBKEY
      );

      const activities = getSuspiciousActivities();
      expect(activities.length).toBeGreaterThanOrEqual(1);
      expect(activities[0].action).toBe('pin_list_author_mismatch');
    });
  });
});

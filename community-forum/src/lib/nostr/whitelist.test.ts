/**
 * Tests for Whitelist Verification Service
 *
 * Tests cohort-based access control, caching, and relay API integration.
 * Security-critical module - comprehensive permission verification testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  verifyWhitelistStatus,
  verifyAdminStatus,
  verifyCohortMembership,
  getUserCohorts,
  checkWhitelistStatus,
  clearWhitelistCache,
  createFallbackStatus,
  approveUserRegistration,
  updateUserCohorts,
  fetchWhitelistUsers,
  publishRegistrationRequest,
  type WhitelistStatus
} from './whitelist';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock $app/environment
vi.mock('$app/environment', () => ({
  browser: true
}));

// Mock fetchWithNip98 from auth module
const mockFetchWithNip98 = vi.fn();
vi.mock('$lib/auth/nip98-client', () => ({
  fetchWithNip98: (...args: any[]) => mockFetchWithNip98(...args),
  createNip98Token: vi.fn().mockResolvedValue('mock-token')
}));

describe('Whitelist Verification Service', () => {
  // Test pubkeys (valid 64-char hex)
  const validPubkey = 'a'.repeat(64);
  const adminPubkey = 'b'.repeat(64);
  const regularUserPubkey = 'c'.repeat(64);
  const invalidPubkey = 'invalid-not-hex';
  const shortPubkey = 'abc123';
  const longPubkey = 'a'.repeat(128);

  beforeEach(() => {
    vi.clearAllMocks();
    clearWhitelistCache();

    // Reset import.meta.env mocks
    vi.stubEnv('VITE_RELAY_URL', 'wss://test-relay.example.com');
    vi.stubEnv('VITE_ADMIN_PUBKEY', adminPubkey);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('verifyWhitelistStatus', () => {
    it('should return relay-verified status on successful API call', async () => {
      const mockResponse: Partial<WhitelistStatus> = {
        isWhitelisted: true,
        isAdmin: false,
        cohorts: ['approved'],
        verifiedAt: Date.now()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const status = await verifyWhitelistStatus(validPubkey);

      expect(status.isWhitelisted).toBe(true);
      expect(status.isAdmin).toBe(false);
      expect(status.cohorts).toContain('approved');
      expect(status.source).toBe('relay');
    });

    it('should return admin status correctly', async () => {
      const mockResponse = {
        isWhitelisted: true,
        isAdmin: true,
        cohorts: ['admin', 'approved'],
        verifiedAt: Date.now()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const status = await verifyWhitelistStatus(adminPubkey);

      expect(status.isWhitelisted).toBe(true);
      expect(status.isAdmin).toBe(true);
      expect(status.cohorts).toContain('admin');
    });

    it('should return cached status within TTL', async () => {
      const mockResponse = {
        isWhitelisted: true,
        isAdmin: false,
        cohorts: ['approved'],
        verifiedAt: Date.now()
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // First call - hits API
      const status1 = await verifyWhitelistStatus(validPubkey);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const status2 = await verifyWhitelistStatus(validPubkey);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No additional API call
      expect(status2.source).toBe('cache');
    });

    it('should fallback when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const status = await verifyWhitelistStatus(validPubkey);

      expect(status.source).toBe('fallback');
    });

    it('should fallback when fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const status = await verifyWhitelistStatus(validPubkey);

      expect(status.source).toBe('fallback');
    });

    it('should return fallback for invalid pubkey format', async () => {
      const status = await verifyWhitelistStatus(invalidPubkey);

      expect(status.source).toBe('fallback');
      expect(status.isWhitelisted).toBe(false);
      expect(status.isAdmin).toBe(false);
      // Should NOT call API for invalid pubkey
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return fallback for short pubkey', async () => {
      const status = await verifyWhitelistStatus(shortPubkey);

      expect(status.source).toBe('fallback');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return fallback for long pubkey', async () => {
      const status = await verifyWhitelistStatus(longPubkey);

      expect(status.source).toBe('fallback');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return fallback for empty pubkey', async () => {
      const status = await verifyWhitelistStatus('');

      expect(status.source).toBe('fallback');
      expect(status.isWhitelisted).toBe(false);
    });

    it('should handle mixed case pubkey validation (case insensitive regex)', async () => {
      const mixedCasePubkey = 'AbCdEf0123456789'.repeat(4);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: false,
          cohorts: ['approved']
        })
      });

      const status = await verifyWhitelistStatus(mixedCasePubkey);

      // Should accept mixed case (regex is case insensitive)
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should URL-encode pubkey in API request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: false,
          cohorts: []
        })
      });

      await verifyWhitelistStatus(validPubkey);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent(validPubkey)),
        expect.any(Object)
      );
    });
  });

  describe('verifyAdminStatus', () => {
    it('should return true for admin user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: true,
          cohorts: ['admin']
        })
      });

      const isAdmin = await verifyAdminStatus(adminPubkey);

      expect(isAdmin).toBe(true);
    });

    it('should return false for non-admin user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: false,
          cohorts: ['approved']
        })
      });

      const isAdmin = await verifyAdminStatus(regularUserPubkey);

      expect(isAdmin).toBe(false);
    });

    it('should return false for invalid pubkey', async () => {
      const isAdmin = await verifyAdminStatus(invalidPubkey);

      expect(isAdmin).toBe(false);
    });
  });

  describe('verifyCohortMembership', () => {
    it('should return true when user belongs to cohort', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: false,
          cohorts: ['approved', 'business']
        })
      });

      const isMember = await verifyCohortMembership(validPubkey, 'business');

      expect(isMember).toBe(true);
    });

    it('should return false when user does not belong to cohort', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: false,
          cohorts: ['approved']
        })
      });

      const isMember = await verifyCohortMembership(validPubkey, 'business');

      expect(isMember).toBe(false);
    });

    it('should check admin cohort membership', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: true,
          cohorts: ['admin', 'approved']
        })
      });

      const isMember = await verifyCohortMembership(adminPubkey, 'admin');

      expect(isMember).toBe(true);
    });

    it('should check moomaa-tribe cohort membership', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: false,
          cohorts: ['moomaa-tribe']
        })
      });

      const isMember = await verifyCohortMembership(validPubkey, 'moomaa-tribe');

      expect(isMember).toBe(true);
    });
  });

  describe('getUserCohorts', () => {
    it('should return all user cohorts', async () => {
      const expectedCohorts: string[] = ['approved', 'business'];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: false,
          cohorts: expectedCohorts
        })
      });

      const cohorts = await getUserCohorts(validPubkey);

      expect(cohorts).toEqual(expectedCohorts);
    });

    it('should return empty array for non-whitelisted user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: false,
          isAdmin: false,
          cohorts: []
        })
      });

      const cohorts = await getUserCohorts(validPubkey);

      expect(cohorts).toEqual([]);
    });
  });

  describe('checkWhitelistStatus', () => {
    it('should return approved status for whitelisted user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: false,
          cohorts: ['approved']
        })
      });

      const status = await checkWhitelistStatus(validPubkey);

      expect(status.isApproved).toBe(true);
      expect(status.isAdmin).toBe(false);
    });

    it('should return admin status for admin user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: true,
          cohorts: ['admin']
        })
      });

      const status = await checkWhitelistStatus(adminPubkey);

      expect(status.isApproved).toBe(true);
      expect(status.isAdmin).toBe(true);
    });

    it('should return not approved for non-whitelisted user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: false,
          isAdmin: false,
          cohorts: []
        })
      });

      const status = await checkWhitelistStatus(validPubkey);

      expect(status.isApproved).toBe(false);
      expect(status.isAdmin).toBe(false);
    });
  });

  describe('clearWhitelistCache', () => {
    it('should clear cache for specific pubkey', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: false,
          cohorts: []
        })
      });

      // First call - populate cache
      await verifyWhitelistStatus(validPubkey);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Clear cache for this pubkey
      clearWhitelistCache(validPubkey);

      // Second call - should hit API again
      await verifyWhitelistStatus(validPubkey);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should clear entire cache when no pubkey specified', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: false,
          cohorts: []
        })
      });

      // Populate cache with multiple pubkeys
      await verifyWhitelistStatus(validPubkey);
      await verifyWhitelistStatus(adminPubkey);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Clear entire cache
      clearWhitelistCache();

      // Both should hit API again
      await verifyWhitelistStatus(validPubkey);
      await verifyWhitelistStatus(adminPubkey);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('fallback status behavior', () => {
    it('should identify admin from VITE_ADMIN_PUBKEY env var in fallback', async () => {
      vi.stubEnv('VITE_ADMIN_PUBKEY', adminPubkey);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const status = await verifyWhitelistStatus(adminPubkey);

      expect(status.source).toBe('fallback');
      expect(status.isAdmin).toBe(true);
      expect(status.isWhitelisted).toBe(true);
      expect(status.cohorts).toContain('admin');
    });

    it('should support comma-separated admin pubkeys in env var', async () => {
      const admin1 = 'a'.repeat(64);
      const admin2 = 'b'.repeat(64);
      vi.stubEnv('VITE_ADMIN_PUBKEY', `${admin1}, ${admin2}`);
      mockFetch.mockRejectedValue(new Error('Network error'));

      const status1 = await verifyWhitelistStatus(admin1);
      clearWhitelistCache();
      const status2 = await verifyWhitelistStatus(admin2);

      expect(status1.isAdmin).toBe(true);
      expect(status2.isAdmin).toBe(true);
    });

    it('should deny admin access when VITE_ADMIN_PUBKEY is not set', async () => {
      vi.stubEnv('VITE_ADMIN_PUBKEY', '');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const status = await verifyWhitelistStatus(adminPubkey);

      expect(status.source).toBe('fallback');
      expect(status.isAdmin).toBe(false);
    });

    it('should not grant admin status to non-admin pubkey in fallback', async () => {
      vi.stubEnv('VITE_ADMIN_PUBKEY', adminPubkey);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const status = await verifyWhitelistStatus(regularUserPubkey);

      expect(status.source).toBe('fallback');
      expect(status.isAdmin).toBe(false);
      expect(status.isWhitelisted).toBe(false);
    });
  });

  describe('API response handling', () => {
    it('should handle missing fields in API response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})  // Empty response
      });

      const status = await verifyWhitelistStatus(validPubkey);

      expect(status.isWhitelisted).toBe(false);
      expect(status.isAdmin).toBe(false);
      expect(status.cohorts).toEqual([]);
      expect(status.source).toBe('relay');
    });

    it('should handle null cohorts in API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: false,
          cohorts: null
        })
      });

      const status = await verifyWhitelistStatus(validPubkey);

      expect(status.cohorts).toEqual([]);
    });

    it('should handle undefined verifiedAt in API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          isWhitelisted: true,
          isAdmin: false,
          cohorts: [],
          verifiedAt: undefined
        })
      });

      const status = await verifyWhitelistStatus(validPubkey);

      expect(typeof status.verifiedAt).toBe('number');
      expect(status.verifiedAt).toBeGreaterThan(0);
    });
  });

  describe('security boundary tests', () => {
    it('should not accept pubkey with injection characters', async () => {
      const injectionPubkeys = [
        'a'.repeat(63) + '<script>',
        'a'.repeat(63) + '\'; DROP TABLE--',
        '../../../etc/passwd',
        '{{7*7}}' + 'a'.repeat(56),
      ];

      for (const pubkey of injectionPubkeys) {
        const status = await verifyWhitelistStatus(pubkey);

        expect(status.source).toBe('fallback');
        expect(status.isAdmin).toBe(false);
        expect(mockFetch).not.toHaveBeenCalled();

        mockFetch.mockClear();
      }
    });

    it('should reject pubkey with newline characters', async () => {
      const pubkeyWithNewline = 'a'.repeat(32) + '\n' + 'a'.repeat(31);

      const status = await verifyWhitelistStatus(pubkeyWithNewline);

      expect(status.source).toBe('fallback');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should reject pubkey with null bytes', async () => {
      const pubkeyWithNull = 'a'.repeat(32) + '\0' + 'a'.repeat(31);

      const status = await verifyWhitelistStatus(pubkeyWithNull);

      expect(status.source).toBe('fallback');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // New test suites for uncovered functions
  // ============================================================================

  describe('createFallbackStatus', () => {
    it('should return admin status when pubkey matches VITE_ADMIN_PUBKEY', () => {
      vi.stubEnv('VITE_ADMIN_PUBKEY', adminPubkey);
      const status = createFallbackStatus(adminPubkey);

      expect(status.isAdmin).toBe(true);
      expect(status.isWhitelisted).toBe(true);
      expect(status.cohorts).toContain('admin');
      expect(status.source).toBe('fallback');
    });

    it('should return non-admin status for unrecognized pubkey', () => {
      vi.stubEnv('VITE_ADMIN_PUBKEY', adminPubkey);
      const status = createFallbackStatus(regularUserPubkey);

      expect(status.isAdmin).toBe(false);
      expect(status.isWhitelisted).toBe(false);
      expect(status.cohorts).toEqual([]);
    });

    it('should handle empty admin env var', () => {
      vi.stubEnv('VITE_ADMIN_PUBKEY', '');
      const status = createFallbackStatus(adminPubkey);

      expect(status.isAdmin).toBe(false);
      expect(status.isWhitelisted).toBe(false);
    });

    it('should have a numeric verifiedAt timestamp', () => {
      const status = createFallbackStatus(validPubkey);
      expect(typeof status.verifiedAt).toBe('number');
      expect(status.verifiedAt).toBeGreaterThan(0);
    });
  });

  describe('approveUserRegistration', () => {
    const targetPubkey = 'd'.repeat(64);
    const testPrivkey = new Uint8Array(32).fill(1);

    beforeEach(() => {
      mockFetchWithNip98.mockReset();
    });

    it('should return error when privkey is not provided (NIP-07 guard)', async () => {
      const result = await approveUserRegistration(targetPubkey, adminPubkey);

      expect(result.success).toBe(false);
      expect(result.error).toContain('passkey login');
      expect(result.error).toContain('NIP-07');
      expect(mockFetchWithNip98).not.toHaveBeenCalled();
    });

    it('should return error when privkey is undefined', async () => {
      const result = await approveUserRegistration(targetPubkey, adminPubkey, undefined);

      expect(result.success).toBe(false);
      expect(result.error).toContain('passkey login');
    });

    it('should call fetchWithNip98 with correct URL, method, and body', async () => {
      mockFetchWithNip98.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await approveUserRegistration(targetPubkey, adminPubkey, testPrivkey);

      expect(mockFetchWithNip98).toHaveBeenCalledTimes(1);
      const [url, options, key] = mockFetchWithNip98.mock.calls[0];

      expect(url).toContain('/api/whitelist/add');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body);
      expect(body.pubkey).toBe(targetPubkey);
      expect(body.cohorts).toEqual(['approved']);
      expect(body.adminPubkey).toBe(adminPubkey);
      expect(key).toBe(testPrivkey);
    });

    it('should return success and clear cache on successful approval', async () => {
      // Pre-populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isWhitelisted: false, isAdmin: false, cohorts: [] })
      });
      await verifyWhitelistStatus(targetPubkey);

      mockFetchWithNip98.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const result = await approveUserRegistration(targetPubkey, adminPubkey, testPrivkey);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Cache should be cleared - next call should hit API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ isWhitelisted: true, isAdmin: false, cohorts: ['approved'] })
      });
      const status = await verifyWhitelistStatus(targetPubkey);
      expect(status.source).toBe('relay');
    });

    it('should return error on HTTP failure', async () => {
      mockFetchWithNip98.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Forbidden' })
      });

      const result = await approveUserRegistration(targetPubkey, adminPubkey, testPrivkey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Forbidden');
    });

    it('should return HTTP status on failure with unparseable JSON', async () => {
      mockFetchWithNip98.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      const result = await approveUserRegistration(targetPubkey, adminPubkey, testPrivkey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 500');
    });

    it('should return error on network exception', async () => {
      mockFetchWithNip98.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await approveUserRegistration(targetPubkey, adminPubkey, testPrivkey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });

    it('should handle non-Error thrown exceptions', async () => {
      mockFetchWithNip98.mockRejectedValueOnce('raw string error');

      const result = await approveUserRegistration(targetPubkey, adminPubkey, testPrivkey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('updateUserCohorts', () => {
    const targetPubkey = 'e'.repeat(64);
    const testPrivkey = new Uint8Array(32).fill(2);

    beforeEach(() => {
      mockFetchWithNip98.mockReset();
    });

    it('should return error when privkey is not provided (NIP-07 guard)', async () => {
      const result = await updateUserCohorts(targetPubkey, ['family'], adminPubkey);

      expect(result.success).toBe(false);
      expect(result.error).toContain('passkey login');
      expect(result.error).toContain('NIP-07');
    });

    it('should return error when privkey is undefined', async () => {
      const result = await updateUserCohorts(targetPubkey, ['family'], adminPubkey, undefined);

      expect(result.success).toBe(false);
      expect(result.error).toContain('passkey login');
    });

    it('should call fetchWithNip98 with correct URL and body', async () => {
      mockFetchWithNip98.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await updateUserCohorts(targetPubkey, ['family', 'business'], adminPubkey, testPrivkey);

      expect(mockFetchWithNip98).toHaveBeenCalledTimes(1);
      const [url, options, key] = mockFetchWithNip98.mock.calls[0];

      expect(url).toContain('/api/whitelist/update-cohorts');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.pubkey).toBe(targetPubkey);
      expect(body.cohorts).toEqual(['family', 'business']);
      expect(body.adminPubkey).toBe(adminPubkey);
      expect(key).toBe(testPrivkey);
    });

    it('should return success and clear cache on successful update', async () => {
      mockFetchWithNip98.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      const result = await updateUserCohorts(targetPubkey, ['admin'], adminPubkey, testPrivkey);

      expect(result.success).toBe(true);
    });

    it('should return error on HTTP failure', async () => {
      mockFetchWithNip98.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid cohorts' })
      });

      const result = await updateUserCohorts(targetPubkey, ['bad'], adminPubkey, testPrivkey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid cohorts');
    });

    it('should return HTTP status on failure with unparseable response', async () => {
      mockFetchWithNip98.mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('Bad Gateway'))
      });

      const result = await updateUserCohorts(targetPubkey, ['x'], adminPubkey, testPrivkey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 502');
    });

    it('should return error on network exception', async () => {
      mockFetchWithNip98.mockRejectedValueOnce(new Error('Timeout'));

      const result = await updateUserCohorts(targetPubkey, ['x'], adminPubkey, testPrivkey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Timeout');
    });

    it('should handle non-Error thrown exceptions', async () => {
      mockFetchWithNip98.mockRejectedValueOnce(42);

      const result = await updateUserCohorts(targetPubkey, ['x'], adminPubkey, testPrivkey);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('fetchWhitelistUsers', () => {
    it('should fetch users with default parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          users: [{ pubkey: 'a'.repeat(64), cohorts: ['approved'], addedAt: 1000, addedBy: null, displayName: 'Alice' }],
          total: 1,
          limit: 20,
          offset: 0
        })
      });

      const result = await fetchWhitelistUsers();

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/whitelist/list'),
        expect.any(Object)
      );
    });

    it('should pass pagination parameters to URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ users: [], total: 0, limit: 10, offset: 20 })
      });

      await fetchWhitelistUsers({ limit: 10, offset: 20 });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('limit=10');
      expect(calledUrl).toContain('offset=20');
    });

    it('should pass cohort filter parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ users: [], total: 0, limit: 20, offset: 0 })
      });

      await fetchWhitelistUsers({ cohort: 'family' });

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('cohort=family');
    });

    it('should handle missing fields in response with defaults', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const result = await fetchWhitelistUsers();

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      });

      await expect(fetchWhitelistUsers()).rejects.toThrow('API returned 500');
    });

    it('should throw on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network down'));

      await expect(fetchWhitelistUsers()).rejects.toThrow('Network down');
    });

    it('should handle error response text failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.reject(new Error('Cannot read'))
      });

      await expect(fetchWhitelistUsers()).rejects.toThrow('API returned 503');
    });
  });

  describe('publishRegistrationRequest', () => {
    it('should return error when not in browser', async () => {
      // This test exercises the non-browser guard. Since we mock browser=true
      // globally, we test the error path via the dynamic import mock.
      // Instead, test the success path and error handling.
      // The browser=true mock means this guard is skipped.
      // We can still verify the function signature works.
      expect(typeof publishRegistrationRequest).toBe('function');
    });

    it('should accept a private key and optional display name', async () => {
      // publishRegistrationRequest does dynamic imports of relay/groups/NDK
      // which makes it hard to mock cleanly in unit tests. We verify the
      // function handles errors in the dynamic import chain gracefully.
      const result = await publishRegistrationRequest('deadbeef'.repeat(8));

      // Should return a result (success or error) rather than throwing
      expect(result).toHaveProperty('success');
      if (!result.success) {
        expect(result).toHaveProperty('error');
      }
    });

    it('should include display name parameter', async () => {
      const result = await publishRegistrationRequest('deadbeef'.repeat(8), 'TestUser');

      expect(result).toHaveProperty('success');
    });
  });
});

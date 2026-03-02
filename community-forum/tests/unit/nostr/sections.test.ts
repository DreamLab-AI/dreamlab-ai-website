/**
 * Unit Tests: Section Access Nostr Service
 *
 * Tests for section access request, approval, fetching, and subscriptions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('$app/environment', () => ({
  browser: true,
  dev: true,
  building: false,
  version: 'test',
}));

const mockPublishEvent = vi.fn().mockResolvedValue(true);
const mockFetchEvents = vi.fn().mockResolvedValue(new Set());
const mockSubscribe = vi.fn().mockReturnValue({
  on: vi.fn(),
  stop: vi.fn(),
});
const mockSignerUser = vi.fn().mockResolvedValue({ pubkey: 'a'.repeat(64) });

const mockNdkInstance: any = {
  signer: {
    user: mockSignerUser,
    encrypt: vi.fn().mockResolvedValue('encrypted-content'),
    sign: vi.fn(),
  },
  fetchEvents: mockFetchEvents,
  subscribe: mockSubscribe,
};

vi.mock('$lib/nostr/relay', () => ({
  ndk: vi.fn(() => mockNdkInstance),
  isConnected: vi.fn(() => true),
  publishEvent: (...args: any[]) => mockPublishEvent(...args),
}));

vi.mock('@nostr-dev-kit/ndk', () => ({
  NDKEvent: vi.fn().mockImplementation((ndk) => ({
    ndk,
    kind: 0,
    content: '',
    tags: [] as string[][],
    pubkey: 'a'.repeat(64),
    created_at: 0,
    id: 'test-event-id',
    sign: vi.fn().mockResolvedValue(undefined),
    rawEvent: vi.fn().mockReturnValue({
      kind: 13,
      content: 'sealed',
      tags: [],
      pubkey: 'a'.repeat(64),
      created_at: 0,
      id: 'sealed-id',
      sig: 'sealed-sig',
    }),
  })),
}));

vi.mock('$lib/stores/sections', () => ({
  sectionStore: { update: vi.fn() },
}));

vi.mock('$lib/types/channel', () => ({
  SECTION_CONFIG: {
    'dreamlab-lobby': { name: 'DreamLab Lobby' },
    'business-hub': { name: 'Business Hub' },
    'community-rooms': { name: 'Community Rooms' },
  },
}));

// Set import.meta.env values for admin pubkey (Vitest makes import.meta.env mutable)
const TEST_ADMIN_PUBKEY = 'admin'.repeat(8) + '00000000000000000000000000000000';
import.meta.env.VITE_ADMIN_PUBKEY = TEST_ADMIN_PUBKEY;
import.meta.env.DEV = 'true';

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------
import {
  requestSectionAccess,
  approveSectionAccess,
  fetchPendingRequests,
  fetchUserAccess,
  fetchSectionStats,
  subscribeSectionEvents,
  subscribeAccessRequests,
} from '$lib/nostr/sections';

describe('Section Access Nostr Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNdkInstance.signer = {
      user: mockSignerUser,
      encrypt: vi.fn().mockResolvedValue('encrypted-content'),
      sign: vi.fn(),
    };
    mockFetchEvents.mockResolvedValue(new Set());
    mockPublishEvent.mockResolvedValue(true);
  });

  // =========================================================================
  // requestSectionAccess()
  // =========================================================================
  describe('requestSectionAccess()', () => {
    it('should reject dreamlab-lobby requests (auto-approved)', async () => {
      const result = await requestSectionAccess('dreamlab-lobby');
      expect(result.success).toBe(false);
      expect(result.error).toContain('does not require approval');
    });

    it('should return error when NDK is not initialized', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      const result = await requestSectionAccess('business-hub' as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('NDK not initialized');
    });

    it('should return error when no signer', async () => {
      mockNdkInstance.signer = null;
      const result = await requestSectionAccess('business-hub' as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('No signer');
    });

    it('should publish kind 9022 event on success', async () => {
      const result = await requestSectionAccess('business-hub' as any, 'Please grant access');
      expect(result.success).toBe(true);
      expect(mockPublishEvent).toHaveBeenCalled();
    });

    it('should handle publish error', async () => {
      mockPublishEvent.mockRejectedValue(new Error('Publish failed'));
      const result = await requestSectionAccess('business-hub' as any);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // approveSectionAccess()
  // =========================================================================
  describe('approveSectionAccess()', () => {
    const request = {
      id: 'req-1',
      section: 'business-hub' as any,
      requesterPubkey: 'b'.repeat(64),
      requestedAt: Date.now(),
      status: 'pending' as const,
    };

    it('should return error when NDK is not initialized', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      const result = await approveSectionAccess(request);
      expect(result.success).toBe(false);
    });

    it('should return error when no signer', async () => {
      mockNdkInstance.signer = null;
      const result = await approveSectionAccess(request);
      expect(result.success).toBe(false);
    });

    it('should publish approval event and send DM', async () => {
      const result = await approveSectionAccess(request);
      expect(result.success).toBe(true);
      // Should publish approval event + DM events
      expect(mockPublishEvent).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // fetchPendingRequests()
  // =========================================================================
  describe('fetchPendingRequests()', () => {
    it('should return empty array when NDK is null', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      const result = await fetchPendingRequests();
      expect(result).toEqual([]);
    });

    it('should parse pending requests and filter approved ones', async () => {
      const requestEvents = new Set([
        {
          id: 'req-1',
          kind: 9022,
          pubkey: 'b'.repeat(64),
          created_at: 1000,
          tags: [['section', 'business-hub'], ['p', 'admin-pubkey']],
          content: 'Please',
        },
      ]);
      const approvalEvents = new Set(); // No approvals yet

      mockFetchEvents
        .mockResolvedValueOnce(requestEvents)
        .mockResolvedValueOnce(approvalEvents);

      const result = await fetchPendingRequests();
      expect(result).toHaveLength(1);
      expect(result[0].section).toBe('business-hub');
    });
  });

  // =========================================================================
  // fetchUserAccess()
  // =========================================================================
  describe('fetchUserAccess()', () => {
    it('should return empty array for empty pubkey', async () => {
      const result = await fetchUserAccess('');
      expect(result).toEqual([]);
    });

    it('should always include dreamlab-lobby as approved', async () => {
      mockFetchEvents.mockResolvedValue(new Set());

      const result = await fetchUserAccess('a'.repeat(64));
      expect(result.some((a) => a.section === 'dreamlab-lobby' && a.status === 'approved')).toBe(true);
    });

    it('should parse approval events', async () => {
      const approvalEvents = new Set([
        {
          id: 'app-1',
          kind: 9023,
          pubkey: 'admin'.repeat(8) + '00000000000000000000000000000000',
          created_at: 2000,
          tags: [['section', 'business-hub'], ['p', 'a'.repeat(64)]],
          content: JSON.stringify({ approvedAt: 2000000 }),
        },
      ]);

      mockFetchEvents
        .mockResolvedValueOnce(approvalEvents)
        .mockResolvedValueOnce(new Set());

      const result = await fetchUserAccess('a'.repeat(64));
      expect(result.some((a) => a.section === 'business-hub' && a.status === 'approved')).toBe(true);
    });

    it('should handle fetch errors', async () => {
      mockFetchEvents.mockRejectedValue(new Error('Fail'));
      const result = await fetchUserAccess('a'.repeat(64));
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // fetchSectionStats()
  // =========================================================================
  describe('fetchSectionStats()', () => {
    it('should return empty array when NDK is null', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      const result = await fetchSectionStats();
      expect(result).toEqual([]);
    });

    it('should parse stat events', async () => {
      const statEvents = new Set([
        {
          id: 'stat-1',
          kind: 30079,
          pubkey: 'a'.repeat(64),
          created_at: 1000,
          tags: [['d', 'dreamlab-lobby']],
          content: JSON.stringify({
            channelCount: 5,
            memberCount: 100,
            messageCount: 500,
            lastActivity: 1000000,
          }),
        },
      ]);
      mockFetchEvents.mockResolvedValue(statEvents);

      const result = await fetchSectionStats();
      expect(result).toHaveLength(1);
      expect(result[0].section).toBe('dreamlab-lobby');
      expect(result[0].channelCount).toBe(5);
    });
  });

  // =========================================================================
  // subscribeSectionEvents()
  // =========================================================================
  describe('subscribeSectionEvents()', () => {
    it('should return null for empty pubkey', () => {
      const result = subscribeSectionEvents('', vi.fn());
      expect(result).toBeNull();
    });

    it('should return null when NDK is null', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      const result = subscribeSectionEvents('a'.repeat(64), vi.fn());
      expect(result).toBeNull();
    });

    it('should create subscription', () => {
      const callback = vi.fn();
      const sub = subscribeSectionEvents('a'.repeat(64), callback);
      expect(sub).not.toBeNull();
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // subscribeAccessRequests()
  // =========================================================================
  describe('subscribeAccessRequests()', () => {
    it('should return null when NDK is null', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      const result = subscribeAccessRequests(vi.fn());
      expect(result).toBeNull();
    });

    it('should create subscription for admin', () => {
      const callback = vi.fn();
      const sub = subscribeAccessRequests(callback);
      expect(sub).not.toBeNull();
    });
  });
});

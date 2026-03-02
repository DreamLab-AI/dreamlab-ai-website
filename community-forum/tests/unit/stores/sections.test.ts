/**
 * Unit Tests: Sections Store
 *
 * Tests for the section access management store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { writable } from 'svelte/store';

// Mock config - must be hoisted
vi.mock('$lib/config', () => ({
  getSections: vi.fn(() => [
    { id: 'dreamlab-lobby', name: 'Lobby', access: { autoApprove: true } },
    { id: 'family-home', name: 'Family', access: { autoApprove: true } },
    { id: 'dreamlab-community', name: 'Community', access: { autoApprove: false } },
    { id: 'fairfield-residents', name: 'Residents', access: { autoApprove: false } }
  ])
}));

vi.mock('$lib/stores/auth', () => ({
  authStore: writable({
    state: 'authenticated',
    pubkey: 'a'.repeat(64),
    publicKey: 'a'.repeat(64),
    privateKey: null,
    isNip07: false
  })
}));

vi.mock('./user', () => ({
  currentPubkey: {
    subscribe: (fn: (v: string | null) => void) => {
      fn('a'.repeat(64));
      return () => {};
    }
  },
  isAdminVerified: {
    subscribe: (fn: (v: boolean) => void) => {
      fn(false);
      return () => {};
    }
  }
}));

vi.mock('$lib/stores/user', () => ({
  currentPubkey: {
    subscribe: (fn: (v: string | null) => void) => {
      fn('a'.repeat(64));
      return () => {};
    }
  },
  isAdminVerified: {
    subscribe: (fn: (v: boolean) => void) => {
      fn(false);
      return () => {};
    }
  }
}));

vi.mock('$lib/stores/notifications', () => ({
  notificationStore: {
    addNotification: vi.fn()
  }
}));

vi.mock('$lib/nostr/admin-security', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  recordRateLimitAttempt: vi.fn()
}));

vi.mock('$lib/nostr/sections', () => ({
  requestSectionAccess: vi.fn(async () => ({ success: true })),
  approveSectionAccess: vi.fn(async () => ({ success: true })),
  fetchSectionStats: vi.fn(async () => []),
  fetchUserAccess: vi.fn(async () => []),
  fetchPendingRequests: vi.fn(async () => [])
}));

import {
  sectionStore,
  accessibleSections,
  pendingSections,
  pendingRequestCount,
  canSeeChannel
} from '$lib/stores/sections';
import type { ChannelSection } from '$lib/types/channel';

describe('sectionStore', () => {
  beforeEach(() => {
    localStorage.clear();
    sectionStore.clear();
  });

  describe('initial state', () => {
    it('should have auto-approved sections in access list', () => {
      const state = get(sectionStore);
      const approvedSections = state.access.filter(a => a.status === 'approved');
      expect(approvedSections.some(a => a.section === 'dreamlab-lobby')).toBe(true);
      expect(approvedSections.some(a => a.section === 'family-home')).toBe(true);
    });

    it('should not auto-approve restricted sections', () => {
      const state = get(sectionStore);
      expect(state.access.some(a => a.section === 'dreamlab-community' && a.status === 'approved')).toBe(false);
      expect(state.access.some(a => a.section === 'fairfield-residents' && a.status === 'approved')).toBe(false);
    });

    it('should start with no pending requests', () => {
      const state = get(sectionStore);
      expect(state.pendingRequests).toHaveLength(0);
    });

    it('should start with no loading or error', () => {
      const state = get(sectionStore);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('getAccessStatus()', () => {
    it('should return approved for auto-approved sections', () => {
      expect(sectionStore.getAccessStatus('dreamlab-lobby' as ChannelSection)).toBe('approved');
    });

    it('should return none for sections without access', () => {
      expect(sectionStore.getAccessStatus('dreamlab-community' as ChannelSection)).toBe('none');
    });
  });

  describe('canAccessSection()', () => {
    it('should return true for auto-approved sections', () => {
      expect(sectionStore.canAccessSection('dreamlab-lobby' as ChannelSection)).toBe(true);
    });

    it('should return false for restricted sections', () => {
      expect(sectionStore.canAccessSection('dreamlab-community' as ChannelSection)).toBe(false);
    });
  });

  describe('requestSectionAccess()', () => {
    it('should return error when already have access', async () => {
      const result = await sectionStore.requestSectionAccess('dreamlab-lobby' as ChannelSection);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Already have access');
    });

    it('should report already approved for autoApprove sections', async () => {
      // After clear(), autoApprove sections are re-added by initialState
      // So requesting access returns "Already have access"
      sectionStore.clear();
      const result = await sectionStore.requestSectionAccess('dreamlab-lobby' as ChannelSection);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Already have access');
      expect(sectionStore.getAccessStatus('dreamlab-lobby' as ChannelSection)).toBe('approved');
    });

    it('should set pending status for restricted sections', async () => {
      const result = await sectionStore.requestSectionAccess('dreamlab-community' as ChannelSection);
      expect(result.success).toBe(true);
      expect(sectionStore.getAccessStatus('dreamlab-community' as ChannelSection)).toBe('pending');
    });

    it('should return error when rate limited', async () => {
      const { checkRateLimit } = await import('$lib/nostr/admin-security');
      (checkRateLimit as any).mockReturnValueOnce({
        allowed: false,
        reason: 'Too many requests',
        waitMs: 5000
      });

      const result = await sectionStore.requestSectionAccess('dreamlab-community' as ChannelSection);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many requests');
      expect(result.waitMs).toBe(5000);
    });

    it('should return error when pending request exists', async () => {
      await sectionStore.requestSectionAccess('dreamlab-community' as ChannelSection);
      const result = await sectionStore.requestSectionAccess('dreamlab-community' as ChannelSection);
      expect(result.success).toBe(false);
      expect(result.error).toContain('already pending');
    });

    it('should rollback on relay failure', async () => {
      const { requestSectionAccess: mockRequest } = await import('$lib/nostr/sections');
      (mockRequest as any).mockResolvedValueOnce({ success: false, error: 'Relay error' });

      const result = await sectionStore.requestSectionAccess('fairfield-residents' as ChannelSection);
      expect(result.success).toBe(false);
      // Should rollback pending status
      expect(sectionStore.getAccessStatus('fairfield-residents' as ChannelSection)).toBe('none');
    });
  });

  describe('setAccess()', () => {
    it('should update access for a section', () => {
      sectionStore.setAccess({
        section: 'dreamlab-community' as ChannelSection,
        status: 'approved',
        approvedAt: Date.now()
      });
      expect(sectionStore.getAccessStatus('dreamlab-community' as ChannelSection)).toBe('approved');
    });

    it('should replace existing access', () => {
      sectionStore.setAccess({
        section: 'dreamlab-lobby' as ChannelSection,
        status: 'denied'
      });
      expect(sectionStore.getAccessStatus('dreamlab-lobby' as ChannelSection)).toBe('denied');
    });
  });

  describe('addPendingRequest()', () => {
    it('should add a pending request for admin view', () => {
      const request = {
        id: 'req1',
        requesterPubkey: 'b'.repeat(64),
        section: 'dreamlab-community' as ChannelSection,
        message: 'Please let me in',
        timestamp: Date.now()
      };
      sectionStore.addPendingRequest(request as any);
      expect(get(sectionStore).pendingRequests).toHaveLength(1);
      expect(get(sectionStore).pendingRequests[0].id).toBe('req1');
    });

    it('should deduplicate requests by id', () => {
      const request = {
        id: 'req1',
        requesterPubkey: 'b'.repeat(64),
        section: 'dreamlab-community' as ChannelSection,
        message: 'Please',
        timestamp: Date.now()
      };
      sectionStore.addPendingRequest(request as any);
      sectionStore.addPendingRequest(request as any);
      expect(get(sectionStore).pendingRequests).toHaveLength(1);
    });
  });

  describe('updateStats()', () => {
    it('should add stats for a section', () => {
      const stats = {
        section: 'dreamlab-lobby' as ChannelSection,
        channelCount: 5,
        memberCount: 20,
        lastActivity: Date.now()
      };
      sectionStore.updateStats(stats as any);
      const result = sectionStore.getStats('dreamlab-lobby' as ChannelSection);
      expect(result).toBeDefined();
      expect((result as any).channelCount).toBe(5);
    });

    it('should replace existing stats', () => {
      const stats1 = {
        section: 'dreamlab-lobby' as ChannelSection,
        channelCount: 5
      };
      const stats2 = {
        section: 'dreamlab-lobby' as ChannelSection,
        channelCount: 10
      };
      sectionStore.updateStats(stats1 as any);
      sectionStore.updateStats(stats2 as any);
      const result = sectionStore.getStats('dreamlab-lobby' as ChannelSection);
      expect((result as any).channelCount).toBe(10);
    });
  });

  describe('getStats()', () => {
    it('should return undefined for unknown section', () => {
      const result = sectionStore.getStats('unknown' as ChannelSection);
      expect(result).toBeUndefined();
    });
  });

  describe('clear()', () => {
    it('should reset to initial state with auto-approved sections', () => {
      sectionStore.setAccess({
        section: 'dreamlab-community' as ChannelSection,
        status: 'approved'
      });
      sectionStore.clear();

      const state = get(sectionStore);
      // Auto-approved sections should still be there
      expect(state.access.some(a => a.section === 'dreamlab-lobby')).toBe(true);
      // Manually set ones should be gone
      expect(state.access.some(a => a.section === 'dreamlab-community' && a.status === 'approved')).toBe(false);
      expect(state.pendingRequests).toHaveLength(0);
    });

    it('should clear localStorage', () => {
      sectionStore.setAccess({
        section: 'dreamlab-community' as ChannelSection,
        status: 'approved'
      });
      sectionStore.clear();
      expect(localStorage.getItem('nostr_bbs_section_access')).toBeNull();
    });
  });

  describe('derived: accessibleSections', () => {
    it('should list approved sections', () => {
      const sections = get(accessibleSections);
      expect(sections).toContain('dreamlab-lobby');
      expect(sections).toContain('family-home');
    });

    it('should not include unapproved sections', () => {
      const sections = get(accessibleSections);
      expect(sections).not.toContain('dreamlab-community');
    });
  });

  describe('derived: pendingSections', () => {
    it('should be empty initially', () => {
      expect(get(pendingSections)).toHaveLength(0);
    });
  });

  describe('derived: pendingRequestCount', () => {
    it('should be 0 initially', () => {
      expect(get(pendingRequestCount)).toBe(0);
    });

    it('should count pending requests', () => {
      sectionStore.addPendingRequest({
        id: 'req1',
        requesterPubkey: 'b'.repeat(64),
        section: 'dreamlab-community' as ChannelSection,
        timestamp: Date.now()
      } as any);
      expect(get(pendingRequestCount)).toBe(1);
    });
  });

  describe('canSeeChannel()', () => {
    it('should return true for public channel in accessible section', () => {
      expect(canSeeChannel('dreamlab-lobby' as ChannelSection, 'public', [])).toBe(true);
    });

    it('should return false for channel in inaccessible section', () => {
      expect(canSeeChannel('dreamlab-community' as ChannelSection, 'public', [])).toBe(false);
    });

    it('should return false for cohort channel even in accessible section', () => {
      expect(canSeeChannel('dreamlab-lobby' as ChannelSection, 'cohort', ['some-cohort'])).toBe(false);
    });
  });
});

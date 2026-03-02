/**
 * Unit Tests: Birthday Calendar Module
 *
 * Tests for birthday fetching, calendar event conversion, and upcoming birthday logic.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchEvents = vi.fn().mockResolvedValue(new Set());
const mockNdkInstance = {
  fetchEvents: mockFetchEvents,
};

vi.mock('$lib/nostr/relay', () => ({
  ndk: vi.fn(() => mockNdkInstance),
  isConnected: vi.fn(() => true),
}));

vi.mock('$lib/nostr/whitelist', () => ({
  verifyCohortMembership: vi.fn().mockResolvedValue(true),
}));

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------
import {
  fetchCohortBirthdays,
  birthdaysToCalendarEvents,
  fetchTribeBirthdayEvents,
  getUpcomingBirthdays,
  type BirthdayEntry,
} from '$lib/nostr/birthdays';

import { verifyCohortMembership } from '$lib/nostr/whitelist';

describe('Birthday Calendar Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (verifyCohortMembership as any).mockResolvedValue(true);
    mockFetchEvents.mockResolvedValue(new Set());
  });

  // =========================================================================
  // birthdaysToCalendarEvents()
  // =========================================================================
  describe('birthdaysToCalendarEvents()', () => {
    it('should convert birthdays to calendar events for given year', () => {
      const birthdays: BirthdayEntry[] = [
        {
          pubkey: 'a'.repeat(64),
          name: 'Alice',
          avatar: null,
          birthday: '1990-06-15',
          dayMonth: '06-15',
        },
      ];

      const events = birthdaysToCalendarEvents(birthdays, 2026);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe("Alice's Birthday");
      expect(events[0].channelId).toBe('birthdays');
      expect(events[0].id).toBe(`birthday-${'a'.repeat(64)}-2026`);
      expect(events[0].tags).toEqual(['birthday']);
    });

    it('should use "Member" for unnamed users', () => {
      const birthdays: BirthdayEntry[] = [
        {
          pubkey: 'b'.repeat(64),
          name: null,
          avatar: null,
          birthday: '1985-12-25',
          dayMonth: '12-25',
        },
      ];

      const events = birthdaysToCalendarEvents(birthdays, 2026);
      expect(events[0].title).toBe("Member's Birthday");
    });

    it('should use current year as default', () => {
      const birthdays: BirthdayEntry[] = [
        {
          pubkey: 'c'.repeat(64),
          name: 'Charlie',
          avatar: null,
          birthday: '2000-01-01',
          dayMonth: '01-01',
        },
      ];

      const events = birthdaysToCalendarEvents(birthdays);
      const currentYear = new Date().getFullYear();
      expect(events[0].id).toContain(String(currentYear));
    });

    it('should create all-day events (duration = 86400-1 seconds)', () => {
      const birthdays: BirthdayEntry[] = [
        {
          pubkey: 'd'.repeat(64),
          name: 'Dave',
          avatar: null,
          birthday: '1995-03-10',
          dayMonth: '03-10',
        },
      ];

      const events = birthdaysToCalendarEvents(birthdays, 2026);
      const duration = events[0].end - events[0].start;
      expect(duration).toBe(86400 - 1);
    });

    it('should handle empty birthday list', () => {
      const events = birthdaysToCalendarEvents([], 2026);
      expect(events).toEqual([]);
    });
  });

  // =========================================================================
  // fetchCohortBirthdays()
  // =========================================================================
  describe('fetchCohortBirthdays()', () => {
    it('should return empty array when NDK is null', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      const result = await fetchCohortBirthdays('tribe');
      expect(result).toEqual([]);
    });

    it('should parse birthday from metadata events', async () => {
      const events = new Set([
        {
          id: 'meta-1',
          kind: 0,
          content: JSON.stringify({
            display_name: 'Alice',
            picture: 'https://example.com/pic.jpg',
            birthday: '1990-06-15',
          }),
          tags: [],
          pubkey: 'a'.repeat(64),
          created_at: 1000,
        },
      ]);
      mockFetchEvents.mockResolvedValue(events);

      const result = await fetchCohortBirthdays('tribe');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Alice');
      expect(result[0].avatar).toBe('https://example.com/pic.jpg');
      expect(result[0].birthday).toBe('1990-06-15');
      expect(result[0].dayMonth).toBe('06-15');
    });

    it('should skip events without birthday', async () => {
      const events = new Set([
        {
          id: 'meta-no-bday',
          kind: 0,
          content: JSON.stringify({ display_name: 'Bob' }),
          tags: [],
          pubkey: 'b'.repeat(64),
          created_at: 1000,
        },
      ]);
      mockFetchEvents.mockResolvedValue(events);

      const result = await fetchCohortBirthdays('tribe');
      expect(result).toEqual([]);
    });

    it('should skip events with invalid birthday format', async () => {
      const events = new Set([
        {
          id: 'meta-bad-bday',
          kind: 0,
          content: JSON.stringify({ birthday: 'not-a-date' }),
          tags: [],
          pubkey: 'c'.repeat(64),
          created_at: 1000,
        },
      ]);
      mockFetchEvents.mockResolvedValue(events);

      const result = await fetchCohortBirthdays('tribe');
      expect(result).toEqual([]);
    });

    it('should skip events with invalid month', async () => {
      const events = new Set([
        {
          id: 'meta-bad-month',
          kind: 0,
          content: JSON.stringify({ birthday: '1990-13-01' }),
          tags: [],
          pubkey: 'd'.repeat(64),
          created_at: 1000,
        },
      ]);
      mockFetchEvents.mockResolvedValue(events);

      const result = await fetchCohortBirthdays('tribe');
      expect(result).toEqual([]);
    });

    it('should skip non-cohort members', async () => {
      (verifyCohortMembership as any).mockResolvedValue(false);

      const events = new Set([
        {
          id: 'meta-non-member',
          kind: 0,
          content: JSON.stringify({ birthday: '1990-06-15' }),
          tags: [],
          pubkey: 'e'.repeat(64),
          created_at: 1000,
        },
      ]);
      mockFetchEvents.mockResolvedValue(events);

      const result = await fetchCohortBirthdays('tribe');
      expect(result).toEqual([]);
    });

    it('should skip events with invalid JSON content', async () => {
      const events = new Set([
        {
          id: 'meta-bad-json',
          kind: 0,
          content: 'not-json',
          tags: [],
          pubkey: 'f'.repeat(64),
          created_at: 1000,
        },
      ]);
      mockFetchEvents.mockResolvedValue(events);

      const result = await fetchCohortBirthdays('tribe');
      expect(result).toEqual([]);
    });

    it('should use name fallback when display_name is absent', async () => {
      const events = new Set([
        {
          id: 'meta-fallback',
          kind: 0,
          content: JSON.stringify({ name: 'FallbackName', birthday: '2000-01-01' }),
          tags: [],
          pubkey: 'a'.repeat(64),
          created_at: 1000,
        },
      ]);
      mockFetchEvents.mockResolvedValue(events);

      const result = await fetchCohortBirthdays('tribe');
      expect(result[0].name).toBe('FallbackName');
    });

    it('should handle fetch error gracefully', async () => {
      mockFetchEvents.mockRejectedValue(new Error('Network error'));
      const result = await fetchCohortBirthdays('tribe');
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // fetchTribeBirthdayEvents()
  // =========================================================================
  describe('fetchTribeBirthdayEvents()', () => {
    it('should return empty array for non-tribe members', async () => {
      (verifyCohortMembership as any).mockResolvedValue(false);
      const result = await fetchTribeBirthdayEvents('a'.repeat(64));
      expect(result).toEqual([]);
    });

    it('should return events for current and next year', async () => {
      (verifyCohortMembership as any).mockResolvedValue(true);

      const events = new Set([
        {
          id: 'meta-bday',
          kind: 0,
          content: JSON.stringify({ display_name: 'Alice', birthday: '1990-06-15' }),
          tags: [],
          pubkey: 'a'.repeat(64),
          created_at: 1000,
        },
      ]);
      mockFetchEvents.mockResolvedValue(events);

      const result = await fetchTribeBirthdayEvents('a'.repeat(64));
      // Should have entries for current year and next year
      expect(result.length).toBe(2);
    });
  });

  // =========================================================================
  // getUpcomingBirthdays()
  // =========================================================================
  describe('getUpcomingBirthdays()', () => {
    it('should return empty array for non-tribe members', async () => {
      (verifyCohortMembership as any).mockResolvedValue(false);
      const result = await getUpcomingBirthdays('a'.repeat(64));
      expect(result).toEqual([]);
    });

    it('should filter birthdays within specified days', async () => {
      (verifyCohortMembership as any).mockResolvedValue(true);

      // Create birthday that is tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');

      const events = new Set([
        {
          id: 'meta-upcoming',
          kind: 0,
          content: JSON.stringify({
            display_name: 'Soon',
            birthday: `1990-${month}-${day}`,
          }),
          tags: [],
          pubkey: 'a'.repeat(64),
          created_at: 1000,
        },
      ]);
      mockFetchEvents.mockResolvedValue(events);

      const result = await getUpcomingBirthdays('a'.repeat(64), 7);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result[0].name).toBe('Soon');
    });

    it('should use default of 30 days', async () => {
      (verifyCohortMembership as any).mockResolvedValue(true);
      mockFetchEvents.mockResolvedValue(new Set());

      await getUpcomingBirthdays('a'.repeat(64));
      // Just verify it runs without error using default
    });
  });
});

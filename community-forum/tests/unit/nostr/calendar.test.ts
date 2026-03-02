/**
 * Unit Tests: Calendar Events Module (NIP-52)
 *
 * Tests for calendar event creation, fetching, RSVP, and deletion.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPublishEvent = vi.fn().mockResolvedValue(true);
const mockFetchEvents = vi.fn().mockResolvedValue(new Set());
const mockNdkSigner = { user: vi.fn().mockResolvedValue({ pubkey: 'a'.repeat(64) }) };

const mockNdkInstance = {
  signer: mockNdkSigner,
  fetchEvents: mockFetchEvents,
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
  })),
}));

vi.mock('$lib/nostr/channels', () => ({
  createChannel: vi.fn().mockResolvedValue({ id: 'chat-room-id', name: 'Chat' }),
}));

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------
import {
  CALENDAR_EVENT_KIND,
  RSVP_KIND,
  createCalendarEvent,
  fetchChannelEvents,
  fetchAllEvents,
  fetchUpcomingEvents,
  rsvpToEvent,
  fetchEventRSVPs,
  deleteCalendarEvent,
  type CalendarEvent,
  type CreateEventParams,
} from '$lib/nostr/calendar';

describe('Calendar Events Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNdkInstance.signer = mockNdkSigner;
    mockFetchEvents.mockResolvedValue(new Set());
    mockPublishEvent.mockResolvedValue(true);
  });

  // =========================================================================
  // Constants
  // =========================================================================
  describe('Constants', () => {
    it('should export correct kind values', () => {
      expect(CALENDAR_EVENT_KIND).toBe(31923);
      expect(RSVP_KIND).toBe(31925);
    });
  });

  // =========================================================================
  // createCalendarEvent()
  // =========================================================================
  describe('createCalendarEvent()', () => {
    const baseParams: CreateEventParams = {
      title: 'Team Meeting',
      description: 'Weekly sync',
      start: new Date('2026-04-01T10:00:00Z'),
      end: new Date('2026-04-01T11:00:00Z'),
      channelId: 'channel-1',
    };

    it('should create event with correct kind and tags', async () => {
      const result = await createCalendarEvent(baseParams);

      expect(result).not.toBeNull();
      expect(result!.title).toBe('Team Meeting');
      expect(result!.description).toBe('Weekly sync');
      expect(result!.channelId).toBe('channel-1');
      expect(mockPublishEvent).toHaveBeenCalledTimes(1);
    });

    it('should return null when NDK has no signer', async () => {
      mockNdkInstance.signer = null;
      const result = await createCalendarEvent(baseParams);
      expect(result).toBeNull();
    });

    it('should include location when provided', async () => {
      const params = { ...baseParams, location: 'Zoom' };
      const result = await createCalendarEvent(params);
      expect(result!.location).toBe('Zoom');
    });

    it('should include tags when provided', async () => {
      const params = { ...baseParams, tags: ['standup', 'weekly'] };
      const result = await createCalendarEvent(params);
      expect(result!.tags).toEqual(['standup', 'weekly']);
    });

    it('should create linked chatroom when requested', async () => {
      const params = { ...baseParams, createChatRoom: true };
      const result = await createCalendarEvent(params);
      expect(result!.chatRoomId).toBe('chat-room-id');
    });

    it('should handle publish failure and return null', async () => {
      mockPublishEvent.mockRejectedValue(new Error('Publish failed'));
      const result = await createCalendarEvent(baseParams);
      expect(result).toBeNull();
    });

    it('should convert dates to unix timestamps', async () => {
      const result = await createCalendarEvent(baseParams);
      expect(result!.start).toBe(Math.floor(baseParams.start.getTime() / 1000));
      expect(result!.end).toBe(Math.floor(baseParams.end.getTime() / 1000));
    });
  });

  // =========================================================================
  // fetchChannelEvents()
  // =========================================================================
  describe('fetchChannelEvents()', () => {
    it('should return empty array when NDK is null', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      const result = await fetchChannelEvents('channel-1');
      expect(result).toEqual([]);
    });

    it('should parse calendar events from NDK events', async () => {
      const mockEvent = {
        id: 'evt-1',
        kind: CALENDAR_EVENT_KIND,
        content: JSON.stringify({ description: 'Desc', maxAttendees: 10 }),
        tags: [
          ['d', '12345-channel-1'],
          ['name', 'Meeting'],
          ['start', '1711929600'],
          ['end', '1711933200'],
          ['e', 'channel-1', '', 'channel'],
        ],
        pubkey: 'a'.repeat(64),
        created_at: 1711929600,
      };
      mockFetchEvents.mockResolvedValue(new Set([mockEvent]));

      const result = await fetchChannelEvents('channel-1');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Meeting');
      expect(result[0].start).toBe(1711929600);
    });

    it('should handle fetch errors', async () => {
      mockFetchEvents.mockRejectedValue(new Error('Network error'));
      const result = await fetchChannelEvents('channel-1');
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // fetchAllEvents()
  // =========================================================================
  describe('fetchAllEvents()', () => {
    it('should return empty array when NDK is null', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      const result = await fetchAllEvents();
      expect(result).toEqual([]);
    });

    it('should sort events by start time', async () => {
      const events = [
        {
          id: 'evt-2', kind: CALENDAR_EVENT_KIND,
          content: JSON.stringify({ description: '' }),
          tags: [['name', 'Late'], ['start', '2000'], ['end', '3000'], ['e', 'ch', '', 'channel']],
          pubkey: 'a'.repeat(64), created_at: 0,
        },
        {
          id: 'evt-1', kind: CALENDAR_EVENT_KIND,
          content: JSON.stringify({ description: '' }),
          tags: [['name', 'Early'], ['start', '1000'], ['end', '1500'], ['e', 'ch', '', 'channel']],
          pubkey: 'a'.repeat(64), created_at: 0,
        },
      ];
      mockFetchEvents.mockResolvedValue(new Set(events));

      const result = await fetchAllEvents();
      expect(result[0].title).toBe('Early');
      expect(result[1].title).toBe('Late');
    });
  });

  // =========================================================================
  // fetchUpcomingEvents()
  // =========================================================================
  describe('fetchUpcomingEvents()', () => {
    it('should return empty array when NDK is null', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      const result = await fetchUpcomingEvents();
      expect(result).toEqual([]);
    });

    it('should filter events within date range', async () => {
      const now = Math.floor(Date.now() / 1000);
      const future = now + 3600; // 1 hour from now
      const past = now - 3600;

      const events = [
        {
          id: 'upcoming', kind: CALENDAR_EVENT_KIND,
          content: JSON.stringify({ description: '' }),
          tags: [['name', 'Upcoming'], ['start', String(future)], ['end', String(future + 1800)], ['e', 'ch', '', 'channel']],
          pubkey: 'a'.repeat(64), created_at: now - 86400,
        },
        {
          id: 'past', kind: CALENDAR_EVENT_KIND,
          content: JSON.stringify({ description: '' }),
          tags: [['name', 'Past'], ['start', String(past - 3600)], ['end', String(past)], ['e', 'ch', '', 'channel']],
          pubkey: 'a'.repeat(64), created_at: now - 172800,
        },
      ];
      mockFetchEvents.mockResolvedValue(new Set(events));

      const result = await fetchUpcomingEvents(7);
      expect(result.some((e) => e.title === 'Upcoming')).toBe(true);
      expect(result.some((e) => e.title === 'Past')).toBe(false);
    });
  });

  // =========================================================================
  // rsvpToEvent()
  // =========================================================================
  describe('rsvpToEvent()', () => {
    it('should publish RSVP event', async () => {
      const result = await rsvpToEvent('event-1', 'accept');
      expect(result).toBe(true);
      expect(mockPublishEvent).toHaveBeenCalled();
    });

    it('should return false when NDK has no signer', async () => {
      mockNdkInstance.signer = null;
      const result = await rsvpToEvent('event-1', 'accept');
      expect(result).toBe(false);
    });

    it('should handle different RSVP statuses', async () => {
      expect(await rsvpToEvent('event-1', 'decline')).toBe(true);
      expect(await rsvpToEvent('event-1', 'tentative')).toBe(true);
    });

    it('should handle publish failure', async () => {
      mockPublishEvent.mockRejectedValue(new Error('Fail'));
      const result = await rsvpToEvent('event-1', 'accept');
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // fetchEventRSVPs()
  // =========================================================================
  describe('fetchEventRSVPs()', () => {
    it('should return empty array when NDK is null', async () => {
      const { ndk } = await import('$lib/nostr/relay');
      (ndk as any).mockReturnValueOnce(null);

      const result = await fetchEventRSVPs('event-1');
      expect(result).toEqual([]);
    });

    it('should parse RSVP events', async () => {
      const rsvpEvents = [
        {
          id: 'rsvp-1', kind: RSVP_KIND,
          content: '',
          tags: [['e', 'event-1', '', 'event'], ['status', 'accept'], ['d', 'event-1']],
          pubkey: 'b'.repeat(64), created_at: 1000,
        },
      ];
      mockFetchEvents.mockResolvedValue(new Set(rsvpEvents));

      const result = await fetchEventRSVPs('event-1');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('accept');
      expect(result[0].pubkey).toBe('b'.repeat(64));
    });

    it('should skip RSVPs without status tag', async () => {
      const rsvpEvents = [
        {
          id: 'rsvp-no-status', kind: RSVP_KIND,
          content: '',
          tags: [['e', 'event-1']],
          pubkey: 'b'.repeat(64), created_at: 1000,
        },
      ];
      mockFetchEvents.mockResolvedValue(new Set(rsvpEvents));

      const result = await fetchEventRSVPs('event-1');
      expect(result).toHaveLength(0);
    });
  });

  // =========================================================================
  // deleteCalendarEvent()
  // =========================================================================
  describe('deleteCalendarEvent()', () => {
    it('should publish kind 5 deletion event', async () => {
      const result = await deleteCalendarEvent('event-1');
      expect(result).toBe(true);
      expect(mockPublishEvent).toHaveBeenCalled();
    });

    it('should return false when NDK has no signer', async () => {
      mockNdkInstance.signer = null;
      const result = await deleteCalendarEvent('event-1');
      expect(result).toBe(false);
    });

    it('should handle publish failure', async () => {
      mockPublishEvent.mockRejectedValue(new Error('Fail'));
      const result = await deleteCalendarEvent('event-1');
      expect(result).toBe(false);
    });
  });
});

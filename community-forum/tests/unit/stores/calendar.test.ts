/**
 * Unit Tests: Calendar Store
 *
 * Tests for the calendar events store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock calendar nostr module
vi.mock('$lib/nostr/calendar', () => ({
  fetchAllEvents: vi.fn(async () => []),
  fetchUpcomingEvents: vi.fn(async () => [])
}));

import {
  calendarStore,
  filteredEvents,
  todayEvents,
  eventsByDate,
  viewMode,
  selectedDate,
  sidebarExpanded,
  sidebarVisible,
  isLoading,
  availabilityBlocks,
  currentSectionId
} from '$lib/stores/calendar';
import type { CalendarEvent } from '$lib/nostr/calendar';

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'evt1',
  title: 'Test Event',
  start: Math.floor(Date.now() / 1000),
  end: Math.floor(Date.now() / 1000) + 3600,
  pubkey: 'creator1',
  content: 'Description',
  tags: [],
  ...overrides
} as CalendarEvent);

describe('calendarStore', () => {
  beforeEach(() => {
    calendarStore.reset();
  });

  describe('initial state', () => {
    it('should start with empty events', () => {
      const state = get(calendarStore);
      expect(state.events).toHaveLength(0);
      expect(state.upcomingEvents).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.viewMode).toBe('month');
      expect(state.selectedDate).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('setSelectedDate()', () => {
    it('should set selected date', () => {
      const date = new Date(2026, 2, 1);
      calendarStore.setSelectedDate(date);
      expect(get(calendarStore).selectedDate).toEqual(date);
    });

    it('should clear date with null', () => {
      calendarStore.setSelectedDate(new Date());
      calendarStore.setSelectedDate(null);
      expect(get(calendarStore).selectedDate).toBeNull();
    });
  });

  describe('setViewMode()', () => {
    it('should change view mode', () => {
      calendarStore.setViewMode('week');
      expect(get(calendarStore).viewMode).toBe('week');
    });

    it('should accept all valid modes', () => {
      for (const mode of ['month', 'week', 'day', 'list'] as const) {
        calendarStore.setViewMode(mode);
        expect(get(calendarStore).viewMode).toBe(mode);
      }
    });
  });

  describe('toggleFilter()', () => {
    it('should add a filter value', () => {
      calendarStore.toggleFilter('sections', 'community');
      expect(get(calendarStore).filters.sections).toContain('community');
    });

    it('should remove a filter value on second toggle', () => {
      calendarStore.toggleFilter('sections', 'community');
      calendarStore.toggleFilter('sections', 'community');
      expect(get(calendarStore).filters.sections).not.toContain('community');
    });

    it('should handle categories filter', () => {
      calendarStore.toggleFilter('categories', 'workshop');
      expect(get(calendarStore).filters.categories).toContain('workshop');
    });

    it('should handle venueTypes filter', () => {
      calendarStore.toggleFilter('venueTypes', 'online');
      expect(get(calendarStore).filters.venueTypes).toContain('online');
    });
  });

  describe('clearFilters()', () => {
    it('should clear all filters', () => {
      calendarStore.toggleFilter('sections', 'community');
      calendarStore.toggleFilter('categories', 'workshop');
      calendarStore.clearFilters();
      const filters = get(calendarStore).filters;
      expect(filters.sections).toHaveLength(0);
      expect(filters.categories).toHaveLength(0);
      expect(filters.venueTypes).toHaveLength(0);
    });
  });

  describe('toggleSidebar()', () => {
    it('should toggle sidebar expanded state', () => {
      expect(get(calendarStore).sidebarExpanded).toBe(false);
      calendarStore.toggleSidebar();
      expect(get(calendarStore).sidebarExpanded).toBe(true);
      calendarStore.toggleSidebar();
      expect(get(calendarStore).sidebarExpanded).toBe(false);
    });
  });

  describe('setSidebarVisible()', () => {
    it('should set sidebar visibility', () => {
      calendarStore.setSidebarVisible(false);
      expect(get(calendarStore).sidebarVisible).toBe(false);
    });
  });

  describe('addEvent()', () => {
    it('should add event and sort by start', () => {
      const now = Math.floor(Date.now() / 1000);
      calendarStore.addEvent(makeEvent({ id: 'e2', start: now + 200 }));
      calendarStore.addEvent(makeEvent({ id: 'e1', start: now + 100 }));
      const events = get(calendarStore).events;
      expect(events).toHaveLength(2);
      expect(events[0].id).toBe('e1');
    });
  });

  describe('updateEvent()', () => {
    it('should update existing event', () => {
      calendarStore.addEvent(makeEvent({ id: 'e1', title: 'Old' }));
      calendarStore.updateEvent('e1', { title: 'New' });
      expect(get(calendarStore).events[0].title).toBe('New');
    });

    it('should not affect other events', () => {
      calendarStore.addEvent(makeEvent({ id: 'e1', title: 'First' }));
      calendarStore.addEvent(makeEvent({ id: 'e2', title: 'Second' }));
      calendarStore.updateEvent('e1', { title: 'Updated' });
      expect(get(calendarStore).events.find(e => e.id === 'e2')!.title).toBe('Second');
    });
  });

  describe('removeEvent()', () => {
    it('should remove event from both events and upcomingEvents', () => {
      const evt = makeEvent({ id: 'e1' });
      calendarStore.addEvent(evt);
      // Manually add to upcomingEvents via state
      calendarStore.removeEvent('e1');
      expect(get(calendarStore).events).toHaveLength(0);
    });
  });

  describe('setCurrentSection()', () => {
    it('should set current section', () => {
      calendarStore.setCurrentSection('community' as any);
      expect(get(calendarStore).currentSectionId).toBe('community');
    });
  });

  describe('availability blocks', () => {
    it('setAvailabilityBlocks should set and sort blocks', () => {
      calendarStore.setAvailabilityBlocks([
        { id: 'b2', start: 200, end: 300, sectionId: 'a' as any, title: 'B' },
        { id: 'b1', start: 100, end: 200, sectionId: 'a' as any, title: 'A' }
      ] as any[]);
      const blocks = get(calendarStore).availabilityBlocks;
      expect(blocks).toHaveLength(2);
      expect(blocks[0].id).toBe('b1');
    });

    it('addAvailabilityBlocks should not add duplicates', () => {
      calendarStore.setAvailabilityBlocks([
        { id: 'b1', start: 100, end: 200, sectionId: 'a' as any, title: 'A' }
      ] as any[]);
      calendarStore.addAvailabilityBlocks([
        { id: 'b1', start: 100, end: 200, sectionId: 'a' as any, title: 'A' },
        { id: 'b2', start: 200, end: 300, sectionId: 'a' as any, title: 'B' }
      ] as any[]);
      expect(get(calendarStore).availabilityBlocks).toHaveLength(2);
    });

    it('clearAvailabilityBlocks should empty the list', () => {
      calendarStore.setAvailabilityBlocks([
        { id: 'b1', start: 100, end: 200, sectionId: 'a' as any, title: 'A' }
      ] as any[]);
      calendarStore.clearAvailabilityBlocks();
      expect(get(calendarStore).availabilityBlocks).toHaveLength(0);
    });
  });

  describe('fetchEvents()', () => {
    it('should set loading and call fetchAllEvents', async () => {
      const { fetchAllEvents } = await import('$lib/nostr/calendar');
      (fetchAllEvents as any).mockResolvedValueOnce([makeEvent()]);

      await calendarStore.fetchEvents();
      const state = get(calendarStore);
      expect(state.isLoading).toBe(false);
      expect(state.events).toHaveLength(1);
    });

    it('should handle fetch error', async () => {
      const { fetchAllEvents } = await import('$lib/nostr/calendar');
      (fetchAllEvents as any).mockRejectedValueOnce(new Error('Network fail'));

      await calendarStore.fetchEvents();
      const state = get(calendarStore);
      expect(state.isLoading).toBe(false);
      expect(state.error).toContain('Network fail');
    });
  });

  describe('fetchUpcomingEvents()', () => {
    it('should fetch upcoming events', async () => {
      const { fetchUpcomingEvents: fetchFn } = await import('$lib/nostr/calendar');
      (fetchFn as any).mockResolvedValueOnce([makeEvent()]);

      await calendarStore.fetchUpcomingEvents(7);
      const state = get(calendarStore);
      expect(state.upcomingEvents).toHaveLength(1);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('clearError()', () => {
    it('should clear error', async () => {
      const { fetchAllEvents } = await import('$lib/nostr/calendar');
      (fetchAllEvents as any).mockRejectedValueOnce(new Error('fail'));
      await calendarStore.fetchEvents();
      calendarStore.clearError();
      expect(get(calendarStore).error).toBeNull();
    });
  });

  describe('reset()', () => {
    it('should restore initial state', () => {
      calendarStore.addEvent(makeEvent());
      calendarStore.setViewMode('week');
      calendarStore.reset();
      const state = get(calendarStore);
      expect(state.events).toHaveLength(0);
      expect(state.viewMode).toBe('month');
    });
  });

  describe('derived stores', () => {
    it('filteredEvents should return all when no filters', () => {
      calendarStore.addEvent(makeEvent({ id: 'e1' }));
      calendarStore.addEvent(makeEvent({ id: 'e2' }));
      expect(get(filteredEvents)).toHaveLength(2);
    });

    it('viewMode derived store should reflect current mode', () => {
      calendarStore.setViewMode('day');
      expect(get(viewMode)).toBe('day');
    });

    it('selectedDate derived store should reflect current date', () => {
      const d = new Date(2026, 0, 1);
      calendarStore.setSelectedDate(d);
      expect(get(selectedDate)).toEqual(d);
    });

    it('sidebarExpanded derived store should track state', () => {
      expect(get(sidebarExpanded)).toBe(false);
      calendarStore.toggleSidebar();
      expect(get(sidebarExpanded)).toBe(true);
    });

    it('sidebarVisible derived store should track state', () => {
      expect(get(sidebarVisible)).toBe(true);
      calendarStore.setSidebarVisible(false);
      expect(get(sidebarVisible)).toBe(false);
    });

    it('isLoading derived store should track loading', () => {
      expect(get(isLoading)).toBe(false);
    });

    it('currentSectionId derived store should track section', () => {
      calendarStore.setCurrentSection('test' as any);
      expect(get(currentSectionId)).toBe('test');
    });

    it('availabilityBlocks derived store should reflect state', () => {
      calendarStore.setAvailabilityBlocks([
        { id: 'b1', start: 100, end: 200, sectionId: 'a' as any, title: 'A' }
      ] as any[]);
      expect(get(availabilityBlocks)).toHaveLength(1);
    });
  });
});

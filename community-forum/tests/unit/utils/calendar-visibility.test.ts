import { describe, it, expect, vi } from 'vitest';

// Mock the config dependencies
vi.mock('$lib/config/permissions', () => ({
	canAccessSection: vi.fn().mockReturnValue(true),
	canCreateCalendarEvent: vi.fn().mockReturnValue(true),
	canAccessCategory: vi.fn().mockReturnValue(true),
	hasCrossZoneAccess: vi.fn().mockReturnValue(false)
}));

vi.mock('$lib/config/loader', () => ({
	getCategory: vi.fn().mockReturnValue({
		id: 'test-cat',
		name: 'Test Category',
		branding: { displayName: 'Test Display' }
	}),
	getSection: vi.fn().mockReturnValue({
		id: 'test-section',
		name: 'Test Section',
		calendar: {
			access: 'full',
			canCreate: true,
			showBlocksFrom: ['fairfield-family', 'dreamlab'],
			blockDisplay: { showSourceZone: true, showReason: true }
		}
	}),
	getSections: vi.fn().mockReturnValue([]),
	getSectionsByCategory: vi.fn().mockReturnValue([
		{ id: 'section-1' },
		{ id: 'section-2' }
	])
}));

import {
	getEventVisibilityLayer,
	canUserRSVP,
	canUserCreateEvent,
	filterEventsForUser,
	getVisibleEventDetails,
	getCategoryIcon,
	getCategoryColor,
	getVenueTypeIcon,
	isEventAtCapacity,
	getSpotsRemaining,
	formatEventTimeRange,
	convertEventToBlock,
	getEventsFromZone,
	hasBlockConflict,
	getAvailabilitySummary,
	filterBlocksByDateRange,
	groupBlocksByDate,
	getMostRestrictiveBlockType,
	canSeeBlockDetails,
	getVisibleBlockInfo
} from '$lib/utils/calendar-visibility';
import type { CalendarDisplayEvent } from '$lib/utils/calendar-visibility';
import type { UserPermissions, AvailabilityBlock } from '$lib/config/types';
import { canAccessSection, canAccessCategory, hasCrossZoneAccess } from '$lib/config/permissions';

describe('calendar-visibility', () => {
	const adminPerms: UserPermissions = {
		pubkey: 'admin-pub',
		cohorts: ['admin'],
		globalRole: 'admin',
		sectionRoles: []
	};

	const memberPerms: UserPermissions = {
		pubkey: 'member-pub',
		cohorts: ['members'],
		globalRole: 'member',
		sectionRoles: [{ sectionId: 'section-1', role: 'member', assignedAt: Date.now() }]
	};

	const guestPerms: UserPermissions = {
		pubkey: 'guest-pub',
		cohorts: [],
		globalRole: 'guest',
		sectionRoles: []
	};

	const baseEvent: CalendarDisplayEvent = {
		id: 'evt-1',
		title: 'Test Event',
		start: Date.now(),
		end: Date.now() + 3600000,
		sectionId: 'section-1',
		category: 'workshop',
		status: 'published'
	};

	describe('getEventVisibilityLayer', () => {
		it('returns full for admin users', () => {
			const layer = getEventVisibilityLayer(baseEvent, adminPerms);
			expect(layer).toBe('full');
		});

		it('returns full when no visibility rules are set', () => {
			const event = { ...baseEvent, visibility: undefined };
			const layer = getEventVisibilityLayer(event, memberPerms);
			expect(layer).toBe('full');
		});

		it('returns full when user pubkey is in detailsVisibleTo.specificUsers', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				visibility: {
					visibleTo: { sections: [], cohorts: [], roles: [], specificUsers: [] },
					detailsVisibleTo: { sections: [], cohorts: [], roles: [], specificUsers: ['member-pub'] },
					rsvpAllowedFor: { cohorts: [], roles: [] }
				}
			};
			const layer = getEventVisibilityLayer(event, memberPerms);
			expect(layer).toBe('full');
		});

		it('returns full when user pubkey is in visibleTo.specificUsers', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				visibility: {
					visibleTo: { sections: [], cohorts: [], roles: [], specificUsers: ['member-pub'] },
					detailsVisibleTo: { sections: [], cohorts: [], roles: [], specificUsers: [] },
					rsvpAllowedFor: { cohorts: [], roles: [] }
				}
			};
			const layer = getEventVisibilityLayer(event, memberPerms);
			expect(layer).toBe('full');
		});

		it('returns full when user cohort matches detailsVisibleTo', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				visibility: {
					visibleTo: { sections: [], cohorts: [], roles: [], specificUsers: [] },
					detailsVisibleTo: { sections: [], cohorts: ['members'], roles: [], specificUsers: [] },
					rsvpAllowedFor: { cohorts: [], roles: [] }
				}
			};
			const layer = getEventVisibilityLayer(event, memberPerms);
			expect(layer).toBe('full');
		});

		it('returns type when user cohort only matches visibleTo', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				visibility: {
					visibleTo: { sections: [], cohorts: ['members'], roles: [], specificUsers: [] },
					detailsVisibleTo: { sections: [], cohorts: [], roles: [], specificUsers: [] },
					rsvpAllowedFor: { cohorts: [], roles: [] }
				}
			};
			const layer = getEventVisibilityLayer(event, memberPerms);
			expect(layer).toBe('type');
		});

		it('returns type when user role matches visibleTo roles', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				visibility: {
					visibleTo: { sections: [], cohorts: [], roles: ['member'], specificUsers: [] },
					detailsVisibleTo: { sections: [], cohorts: [], roles: [], specificUsers: [] },
					rsvpAllowedFor: { cohorts: [], roles: [] }
				}
			};
			const layer = getEventVisibilityLayer(event, memberPerms);
			expect(layer).toBe('type');
		});

		it('returns busy when user can access section but not event visibility', () => {
			vi.mocked(canAccessSection).mockReturnValue(true);
			const event: CalendarDisplayEvent = {
				...baseEvent,
				sectionId: 'section-1',
				visibility: {
					visibleTo: { sections: [], cohorts: ['restricted-cohort'], roles: [], specificUsers: [] },
					detailsVisibleTo: { sections: [], cohorts: [], roles: [], specificUsers: [] },
					rsvpAllowedFor: { cohorts: [], roles: [] }
				}
			};
			const layer = getEventVisibilityLayer(event, guestPerms);
			expect(layer).toBe('busy');
		});

		it('returns hidden when user has no access at all', () => {
			vi.mocked(canAccessSection).mockReturnValue(false);
			const event: CalendarDisplayEvent = {
				...baseEvent,
				sectionId: 'section-1',
				visibility: {
					visibleTo: { sections: [], cohorts: ['restricted-cohort'], roles: [], specificUsers: [] },
					detailsVisibleTo: { sections: [], cohorts: [], roles: [], specificUsers: [] },
					rsvpAllowedFor: { cohorts: [], roles: [] }
				}
			};
			const layer = getEventVisibilityLayer(event, guestPerms);
			expect(layer).toBe('hidden');
			vi.mocked(canAccessSection).mockReturnValue(true);
		});

		it('normalizes FairfieldEvent-style visibility format', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				visibility: {
					visibleToSections: ['section-1'],
					visibleToCohorts: ['members'],
					visibleToRoles: [],
					detailsVisibleToSections: [],
					detailsVisibleToCohorts: [],
					specificUsers: []
				}
			};
			const layer = getEventVisibilityLayer(event, memberPerms);
			expect(layer).toBe('type');
		});

		it('extracts section from linkedResources.channelId', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				sectionId: undefined,
				linkedResources: { channelId: 'section-1/forum-1' },
				visibility: {
					visibleTo: { sections: [], cohorts: [], roles: [], specificUsers: [] },
					detailsVisibleTo: { sections: [], cohorts: [], roles: [], specificUsers: [] },
					rsvpAllowedFor: { cohorts: [], roles: [] }
				}
			};
			vi.mocked(canAccessSection).mockReturnValue(true);
			const layer = getEventVisibilityLayer(event, guestPerms);
			expect(layer).toBe('busy');
		});
	});

	describe('canUserRSVP', () => {
		it('returns false for cancelled events', () => {
			const event = { ...baseEvent, status: 'cancelled' as const };
			expect(canUserRSVP(event, memberPerms)).toBe(false);
		});

		it('returns false for draft events', () => {
			const event = { ...baseEvent, status: 'draft' as const };
			expect(canUserRSVP(event, memberPerms)).toBe(false);
		});

		it('returns true for published events with no restrictions', () => {
			expect(canUserRSVP(baseEvent, memberPerms)).toBe(true);
		});

		it('returns false when visibility is hidden', () => {
			vi.mocked(canAccessSection).mockReturnValueOnce(false);
			const event: CalendarDisplayEvent = {
				...baseEvent,
				visibility: {
					visibleTo: { sections: [], cohorts: ['restricted'], roles: [], specificUsers: [] },
					detailsVisibleTo: { sections: [], cohorts: [], roles: [], specificUsers: [] },
					rsvpAllowedFor: { cohorts: [], roles: [] }
				}
			};
			expect(canUserRSVP(event, guestPerms)).toBe(false);
		});

		it('returns false when at capacity and no waitlist', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				attendance: {
					maxCapacity: 10,
					currentCount: 10,
					waitlistEnabled: false
				}
			};
			expect(canUserRSVP(event, memberPerms)).toBe(false);
		});

		it('returns true when at capacity but waitlist is enabled', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				attendance: {
					maxCapacity: 10,
					currentCount: 10,
					waitlistEnabled: true
				}
			};
			expect(canUserRSVP(event, memberPerms)).toBe(true);
		});

		it('returns true when under capacity', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				attendance: {
					maxCapacity: 10,
					currentCount: 5
				}
			};
			expect(canUserRSVP(event, memberPerms)).toBe(true);
		});

		it('checks cohort RSVP access', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				visibility: {
					visibleTo: { sections: [], cohorts: ['members'], roles: [], specificUsers: [] },
					detailsVisibleTo: { sections: [], cohorts: ['members'], roles: [], specificUsers: [] },
					rsvpAllowedFor: { cohorts: ['members'], roles: [] }
				}
			};
			expect(canUserRSVP(event, memberPerms)).toBe(true);
		});
	});

	describe('canUserCreateEvent', () => {
		it('delegates to canCreateCalendarEvent', () => {
			canUserCreateEvent('section-1', adminPerms);
			// Just verifying it calls through without error
		});
	});

	describe('filterEventsForUser', () => {
		it('filters out hidden events', () => {
			vi.mocked(canAccessSection).mockReturnValue(false);
			const events: CalendarDisplayEvent[] = [
				{ ...baseEvent, id: 'evt-1', sectionId: 'section-1', visibility: {
					visibleTo: { sections: [], cohorts: ['restricted'], roles: [], specificUsers: [] },
					detailsVisibleTo: { sections: [], cohorts: [], roles: [], specificUsers: [] },
					rsvpAllowedFor: { cohorts: [], roles: [] }
				}},
				{ ...baseEvent, id: 'evt-2', visibility: undefined }
			];
			const filtered = filterEventsForUser(events, guestPerms);
			// evt-2 has no visibility rules so it's 'full', evt-1 is hidden
			expect(filtered.length).toBe(1);
			expect(filtered[0].id).toBe('evt-2');
			vi.mocked(canAccessSection).mockReturnValue(true);
		});

		it('includes events at busy/type/full levels', () => {
			const events: CalendarDisplayEvent[] = [
				{ ...baseEvent, id: 'evt-1' },
				{ ...baseEvent, id: 'evt-2' }
			];
			const filtered = filterEventsForUser(events, adminPerms);
			expect(filtered).toHaveLength(2);
		});

		it('returns empty array for empty input', () => {
			const filtered = filterEventsForUser([], memberPerms);
			expect(filtered).toEqual([]);
		});
	});

	describe('getVisibleEventDetails', () => {
		it('returns null for hidden layer', () => {
			expect(getVisibleEventDetails(baseEvent, 'hidden')).toBeNull();
		});

		it('returns only time for busy layer', () => {
			const details = getVisibleEventDetails(baseEvent, 'busy');
			expect(details).toEqual({
				id: baseEvent.id,
				start: baseEvent.start,
				end: baseEvent.end
			});
		});

		it('returns type-level details for type layer', () => {
			const eventWithVenue: CalendarDisplayEvent = {
				...baseEvent,
				venue: { type: 'fairfield', room: 'Main Hall' }
			};
			const details = getVisibleEventDetails(eventWithVenue, 'type');
			expect(details).toHaveProperty('id');
			expect(details).toHaveProperty('start');
			expect(details).toHaveProperty('end');
			expect(details).toHaveProperty('category');
			expect(details).toHaveProperty('status');
			// Venue type is included but not room details
			expect(details!.venue).toEqual({ type: 'fairfield' });
		});

		it('returns full event for full layer', () => {
			const details = getVisibleEventDetails(baseEvent, 'full');
			expect(details).toEqual(baseEvent);
		});

		it('handles undefined venue in type layer', () => {
			const eventNoVenue: CalendarDisplayEvent = {
				...baseEvent,
				venue: undefined
			};
			const details = getVisibleEventDetails(eventNoVenue, 'type');
			expect(details!.venue).toBeUndefined();
		});
	});

	describe('getCategoryIcon', () => {
		it('returns correct icon for known categories', () => {
			expect(getCategoryIcon('workshop')).toBe('🔧');
			expect(getCategoryIcon('seminar')).toBe('📚');
			expect(getCategoryIcon('social')).toBe('🥳');
			expect(getCategoryIcon('ceremony')).toBe('🌸');
			expect(getCategoryIcon('retreat')).toBe('🧘');
			expect(getCategoryIcon('work-session')).toBe('💼');
			expect(getCategoryIcon('work_session')).toBe('💼');
			expect(getCategoryIcon('maintenance')).toBe('🛠️');
			expect(getCategoryIcon('accommodation')).toBe('🛏️');
			expect(getCategoryIcon('club-night')).toBe('🎵');
			expect(getCategoryIcon('club_night')).toBe('🎵');
			expect(getCategoryIcon('festival')).toBe('🎪');
			expect(getCategoryIcon('market')).toBe('🛍️');
			expect(getCategoryIcon('nature')).toBe('🌲');
			expect(getCategoryIcon('exhibition')).toBe('🎨');
			expect(getCategoryIcon('meetup')).toBe('🤝');
			expect(getCategoryIcon('webinar')).toBe('🎓');
			expect(getCategoryIcon('call')).toBe('📞');
			expect(getCategoryIcon('stream')).toBe('📺');
			expect(getCategoryIcon('planning')).toBe('📋');
		});

		it('returns default icon for undefined', () => {
			expect(getCategoryIcon(undefined)).toBe('📅');
		});

		it('returns default icon for unknown category', () => {
			expect(getCategoryIcon('unknown-category' as any)).toBe('📅');
		});

		it('handles object-style category', () => {
			expect(getCategoryIcon({ primary: 'workshop' })).toBe('🔧');
			expect(getCategoryIcon({ primary: 'social', tags: ['fun'] })).toBe('🥳');
		});
	});

	describe('getCategoryColor', () => {
		it('returns correct color for known categories', () => {
			expect(getCategoryColor('workshop')).toBe('#10b981');
			expect(getCategoryColor('seminar')).toBe('#3b82f6');
			expect(getCategoryColor('social')).toBe('#f59e0b');
		});

		it('returns default color for undefined', () => {
			expect(getCategoryColor(undefined)).toBe('#6b7280');
		});

		it('returns default color for unknown category', () => {
			expect(getCategoryColor('unknown' as any)).toBe('#6b7280');
		});

		it('handles object-style category', () => {
			expect(getCategoryColor({ primary: 'festival' })).toBe('#ef4444');
		});
	});

	describe('getVenueTypeIcon', () => {
		it('returns correct icon for each venue type', () => {
			expect(getVenueTypeIcon('fairfield')).toBe('🏠');
			expect(getVenueTypeIcon('offsite')).toBe('📍');
			expect(getVenueTypeIcon('online')).toBe('💻');
			expect(getVenueTypeIcon('external')).toBe('🌍');
		});

		it('returns default icon for undefined', () => {
			expect(getVenueTypeIcon(undefined)).toBe('📍');
		});
	});

	describe('isEventAtCapacity', () => {
		it('returns false when no attendance info', () => {
			expect(isEventAtCapacity(baseEvent)).toBe(false);
		});

		it('returns false when no maxCapacity set', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				attendance: { currentCount: 50 }
			};
			expect(isEventAtCapacity(event)).toBe(false);
		});

		it('returns true when at capacity', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				attendance: { maxCapacity: 10, currentCount: 10 }
			};
			expect(isEventAtCapacity(event)).toBe(true);
		});

		it('returns true when over capacity', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				attendance: { maxCapacity: 10, currentCount: 15 }
			};
			expect(isEventAtCapacity(event)).toBe(true);
		});

		it('returns false when under capacity', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				attendance: { maxCapacity: 10, currentCount: 5 }
			};
			expect(isEventAtCapacity(event)).toBe(false);
		});
	});

	describe('getSpotsRemaining', () => {
		it('returns null when no attendance info', () => {
			expect(getSpotsRemaining(baseEvent)).toBeNull();
		});

		it('returns null when no maxCapacity', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				attendance: { currentCount: 5 }
			};
			expect(getSpotsRemaining(event)).toBeNull();
		});

		it('returns remaining spots', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				attendance: { maxCapacity: 10, currentCount: 3 }
			};
			expect(getSpotsRemaining(event)).toBe(7);
		});

		it('returns 0 when at capacity', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				attendance: { maxCapacity: 10, currentCount: 10 }
			};
			expect(getSpotsRemaining(event)).toBe(0);
		});

		it('returns 0 when over capacity (not negative)', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				attendance: { maxCapacity: 10, currentCount: 15 }
			};
			expect(getSpotsRemaining(event)).toBe(0);
		});
	});

	describe('formatEventTimeRange', () => {
		it('formats same-day events', () => {
			// 2026-01-15 10:00 to 2026-01-15 12:00 (UTC)
			const start = new Date('2026-01-15T10:00:00Z').getTime();
			const end = new Date('2026-01-15T12:00:00Z').getTime();
			const result = formatEventTimeRange(start, end);

			// Should contain date and two times
			expect(result).toContain('Jan');
			expect(result).toContain('-');
		});

		it('formats multi-day events', () => {
			const start = new Date('2026-01-15T10:00:00Z').getTime();
			const end = new Date('2026-01-17T15:00:00Z').getTime();
			const result = formatEventTimeRange(start, end);

			// Should contain two dates
			expect(result).toContain('Jan');
			expect(result).toContain('-');
		});
	});

	describe('convertEventToBlock', () => {
		it('converts event to availability block', () => {
			const block = convertEventToBlock(baseEvent, 'fairfield-family', {});
			expect(block.id).toContain('block-fairfield-family-');
			expect(block.start).toBe(baseEvent.start);
			expect(block.end).toBe(baseEvent.end);
			expect(block.sourceZone).toBe('fairfield-family');
			expect(block.blockType).toBe('hard');
			expect(block.displayColour).toBe('#991b1b');
		});

		it('assigns hard block type for fairfield-family', () => {
			const block = convertEventToBlock(baseEvent, 'fairfield-family', {});
			expect(block.blockType).toBe('hard');
		});

		it('assigns soft block type for dreamlab', () => {
			const block = convertEventToBlock(baseEvent, 'dreamlab', {});
			expect(block.blockType).toBe('soft');
		});

		it('assigns tentative block type for minimoonoir', () => {
			const block = convertEventToBlock(baseEvent, 'minimoonoir', {});
			expect(block.blockType).toBe('tentative');
		});

		it('defaults to soft block type for unknown zones', () => {
			const block = convertEventToBlock(baseEvent, 'unknown-zone', {});
			expect(block.blockType).toBe('soft');
		});

		it('includes label when showSourceZone is true', () => {
			const block = convertEventToBlock(baseEvent, 'test-cat', { showSourceZone: true });
			expect(block.label).toBe('Test Display');
		});

		it('omits label when showSourceZone is false', () => {
			const block = convertEventToBlock(baseEvent, 'test-cat', { showSourceZone: false });
			expect(block.label).toBeUndefined();
		});

		it('includes reason when showReason is true', () => {
			const block = convertEventToBlock(baseEvent, 'test-cat', { showReason: true });
			expect(block.reason).toBe('Test Event');
		});

		it('uses event name if title is not set', () => {
			const event: CalendarDisplayEvent = {
				...baseEvent,
				title: undefined,
				name: 'Event Name'
			};
			const block = convertEventToBlock(event, 'test-cat', { showReason: true });
			expect(block.reason).toBe('Event Name');
		});

		it('uses custom zone colours when provided', () => {
			const block = convertEventToBlock(baseEvent, 'custom-zone', {
				zoneColours: { 'custom-zone': '#ff0000' }
			});
			expect(block.displayColour).toBe('#ff0000');
		});

		it('falls back to default colour', () => {
			const block = convertEventToBlock(baseEvent, 'unknown-zone', {});
			expect(block.displayColour).toBe('#6b7280');
		});
	});

	describe('hasBlockConflict', () => {
		const blocks: AvailabilityBlock[] = [
			{ id: 'b1', start: 100, end: 200, sourceZone: 'fairfield-family', blockType: 'hard', displayColour: '#991b1b' },
			{ id: 'b2', start: 300, end: 400, sourceZone: 'dreamlab', blockType: 'soft', displayColour: '#c2410c' },
			{ id: 'b3', start: 500, end: 600, sourceZone: 'minimoonoir', blockType: 'tentative', displayColour: '#6366f1' }
		];

		it('returns no conflict for non-overlapping time', () => {
			const result = hasBlockConflict(201, 299, blocks);
			expect(result.hasConflict).toBe(false);
			expect(result.conflictType).toBeNull();
			expect(result.blocks).toEqual([]);
		});

		it('detects overlap with hard block', () => {
			const result = hasBlockConflict(150, 250, blocks);
			expect(result.hasConflict).toBe(true);
			expect(result.conflictType).toBe('hard');
		});

		it('detects overlap with soft block', () => {
			const result = hasBlockConflict(350, 450, blocks);
			expect(result.hasConflict).toBe(true);
			expect(result.conflictType).toBe('soft');
		});

		it('detects overlap with tentative block', () => {
			const result = hasBlockConflict(550, 650, blocks);
			expect(result.hasConflict).toBe(true);
			expect(result.conflictType).toBe('tentative');
		});

		it('returns hard when overlapping both hard and soft', () => {
			const result = hasBlockConflict(150, 350, blocks);
			expect(result.hasConflict).toBe(true);
			expect(result.conflictType).toBe('hard');
		});

		it('returns soft when overlapping soft and tentative', () => {
			const softAndTentative: AvailabilityBlock[] = [
				{ id: 'b2', start: 300, end: 400, sourceZone: 'dreamlab', blockType: 'soft', displayColour: '#c2410c' },
				{ id: 'b3', start: 350, end: 500, sourceZone: 'minimoonoir', blockType: 'tentative', displayColour: '#6366f1' }
			];
			const result = hasBlockConflict(350, 450, softAndTentative);
			expect(result.conflictType).toBe('soft');
		});

		it('returns all conflicting blocks', () => {
			const result = hasBlockConflict(0, 1000, blocks);
			expect(result.blocks).toHaveLength(3);
		});

		it('handles empty blocks array', () => {
			const result = hasBlockConflict(100, 200, []);
			expect(result.hasConflict).toBe(false);
		});
	});

	describe('getAvailabilitySummary', () => {
		const blocks: AvailabilityBlock[] = [
			{ id: 'b1', start: 100, end: 200, sourceZone: 'fairfield-family', blockType: 'hard', displayColour: '#991b1b' },
			{ id: 'b2', start: 300, end: 400, sourceZone: 'dreamlab', blockType: 'soft', displayColour: '#c2410c' },
			{ id: 'b3', start: 500, end: 600, sourceZone: 'minimoonoir', blockType: 'tentative', displayColour: '#6366f1' }
		];

		it('returns available when no conflict', () => {
			const result = getAvailabilitySummary(201, 299, blocks);
			expect(result.status).toBe('available');
			expect(result.message).toBe('Available');
		});

		it('returns unavailable for hard conflict', () => {
			const result = getAvailabilitySummary(150, 250, blocks);
			expect(result.status).toBe('unavailable');
			expect(result.message).toContain('unavailable');
		});

		it('returns reduced for soft conflict', () => {
			const result = getAvailabilitySummary(350, 450, blocks);
			expect(result.status).toBe('reduced');
			expect(result.message).toContain('Reduced capacity');
		});

		it('returns available with note for tentative conflict', () => {
			const result = getAvailabilitySummary(550, 650, blocks);
			expect(result.status).toBe('available');
			expect(result.message).toContain('guests may be present');
		});
	});

	describe('filterBlocksByDateRange', () => {
		const blocks: AvailabilityBlock[] = [
			{ id: 'b1', start: 1000, end: 2000, sourceZone: 'z', blockType: 'soft', displayColour: '#000' },
			{ id: 'b2', start: 3000, end: 4000, sourceZone: 'z', blockType: 'soft', displayColour: '#000' },
			{ id: 'b3', start: 5000, end: 6000, sourceZone: 'z', blockType: 'soft', displayColour: '#000' }
		];

		it('returns blocks overlapping with date range', () => {
			const result = filterBlocksByDateRange(blocks, new Date(2500), new Date(5500));
			expect(result).toHaveLength(2); // b2 and b3
		});

		it('returns all blocks when range covers everything', () => {
			const result = filterBlocksByDateRange(blocks, new Date(0), new Date(10000));
			expect(result).toHaveLength(3);
		});

		it('returns empty when range is before all blocks', () => {
			const result = filterBlocksByDateRange(blocks, new Date(0), new Date(500));
			expect(result).toHaveLength(0);
		});

		it('returns empty when range is after all blocks', () => {
			const result = filterBlocksByDateRange(blocks, new Date(7000), new Date(8000));
			expect(result).toHaveLength(0);
		});
	});

	describe('groupBlocksByDate', () => {
		it('groups blocks by date string', () => {
			const blocks: AvailabilityBlock[] = [
				{ id: 'b1', start: new Date('2026-03-01T10:00:00Z').getTime(), end: new Date('2026-03-01T12:00:00Z').getTime(), sourceZone: 'z', blockType: 'soft', displayColour: '#000' },
				{ id: 'b2', start: new Date('2026-03-01T14:00:00Z').getTime(), end: new Date('2026-03-01T16:00:00Z').getTime(), sourceZone: 'z', blockType: 'soft', displayColour: '#000' },
				{ id: 'b3', start: new Date('2026-03-02T10:00:00Z').getTime(), end: new Date('2026-03-02T12:00:00Z').getTime(), sourceZone: 'z', blockType: 'soft', displayColour: '#000' }
			];

			const grouped = groupBlocksByDate(blocks);
			expect(grouped.size).toBe(2);
			expect(grouped.get('2026-03-01')).toHaveLength(2);
			expect(grouped.get('2026-03-02')).toHaveLength(1);
		});

		it('returns empty map for empty input', () => {
			const grouped = groupBlocksByDate([]);
			expect(grouped.size).toBe(0);
		});
	});

	describe('getMostRestrictiveBlockType', () => {
		it('returns null for empty blocks', () => {
			expect(getMostRestrictiveBlockType([])).toBeNull();
		});

		it('returns hard when any block is hard', () => {
			const blocks: AvailabilityBlock[] = [
				{ id: 'b1', start: 0, end: 1, sourceZone: 'z', blockType: 'tentative', displayColour: '#000' },
				{ id: 'b2', start: 0, end: 1, sourceZone: 'z', blockType: 'hard', displayColour: '#000' },
				{ id: 'b3', start: 0, end: 1, sourceZone: 'z', blockType: 'soft', displayColour: '#000' }
			];
			expect(getMostRestrictiveBlockType(blocks)).toBe('hard');
		});

		it('returns soft when no hard blocks exist', () => {
			const blocks: AvailabilityBlock[] = [
				{ id: 'b1', start: 0, end: 1, sourceZone: 'z', blockType: 'tentative', displayColour: '#000' },
				{ id: 'b2', start: 0, end: 1, sourceZone: 'z', blockType: 'soft', displayColour: '#000' }
			];
			expect(getMostRestrictiveBlockType(blocks)).toBe('soft');
		});

		it('returns tentative when only tentative blocks exist', () => {
			const blocks: AvailabilityBlock[] = [
				{ id: 'b1', start: 0, end: 1, sourceZone: 'z', blockType: 'tentative', displayColour: '#000' }
			];
			expect(getMostRestrictiveBlockType(blocks)).toBe('tentative');
		});
	});

	describe('canSeeBlockDetails', () => {
		const block: AvailabilityBlock = {
			id: 'b1', start: 0, end: 1,
			sourceZone: 'test-cat',
			blockType: 'soft',
			displayColour: '#000',
			label: 'Test',
			reason: 'Booking'
		};

		it('returns true for cross-zone access users', () => {
			vi.mocked(hasCrossZoneAccess).mockReturnValueOnce(true);
			expect(canSeeBlockDetails(adminPerms, block)).toBe(true);
		});

		it('returns true when user can access the source category', () => {
			vi.mocked(hasCrossZoneAccess).mockReturnValueOnce(false);
			vi.mocked(canAccessCategory).mockReturnValueOnce(true);
			expect(canSeeBlockDetails(memberPerms, block)).toBe(true);
		});

		it('returns false when user cannot access the source category', () => {
			vi.mocked(hasCrossZoneAccess).mockReturnValueOnce(false);
			vi.mocked(canAccessCategory).mockReturnValueOnce(false);
			expect(canSeeBlockDetails(guestPerms, block)).toBe(false);
		});
	});

	describe('getVisibleBlockInfo', () => {
		const block: AvailabilityBlock = {
			id: 'b1', start: 100, end: 200,
			sourceZone: 'test-cat',
			blockType: 'hard',
			displayColour: '#991b1b',
			label: 'Family',
			reason: 'Booking'
		};

		it('includes label and reason when user can see details', () => {
			vi.mocked(hasCrossZoneAccess).mockReturnValueOnce(true);
			const info = getVisibleBlockInfo(block, adminPerms);
			expect(info.label).toBe('Family');
			expect(info.reason).toBe('Booking');
			expect(info.sourceZone).toBe('test-cat');
		});

		it('excludes label, reason, and sourceZone when user cannot see details', () => {
			vi.mocked(hasCrossZoneAccess).mockReturnValueOnce(false);
			vi.mocked(canAccessCategory).mockReturnValueOnce(false);
			const info = getVisibleBlockInfo(block, guestPerms);
			expect(info.label).toBeUndefined();
			expect(info.reason).toBeUndefined();
			expect(info.sourceZone).toBeUndefined();
		});

		it('always includes id, start, end, blockType, displayColour', () => {
			vi.mocked(hasCrossZoneAccess).mockReturnValueOnce(false);
			vi.mocked(canAccessCategory).mockReturnValueOnce(false);
			const info = getVisibleBlockInfo(block, guestPerms);
			expect(info.id).toBe('b1');
			expect(info.start).toBe(100);
			expect(info.end).toBe(200);
			expect(info.blockType).toBe('hard');
			expect(info.displayColour).toBe('#991b1b');
		});
	});
});

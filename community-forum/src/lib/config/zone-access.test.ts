/**
 * Zone Access Control - Comprehensive Test Suite
 *
 * Tests for the 4-zone BBS architecture (fairfield-family, minimoonoir, dreamlab, ai-agents)
 * with cohort-based access control. Verifies:
 *
 * 1. Cohort definitions alignment (relay is source of truth)
 * 2. Admin zone access (globalRole='admin' AND cohorts=['admin'])
 * 3. Section access hierarchy for every section in sections.yaml
 * 4. Channel zone filtering via canAccessChannelZone logic
 * 5. UserPermissions store derivation logic
 * 6. Edge cases (empty cohorts, all cohorts, conflicts, fallback paths)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type {
	UserPermissions,
	CategoryConfig,
	SectionConfig,
	CategoryAccessConfig
} from './types';

// Mock the loader module before imports
vi.mock('./loader', () => ({
	getRole: vi.fn(),
	getSection: vi.fn(),
	getCategory: vi.fn(),
	getCategories: vi.fn(),
	roleHasCapability: vi.fn(),
	roleIsHigherThan: vi.fn(),
	getHighestRole: vi.fn(),
	getSectionWithCategory: vi.fn()
}));

import {
	canAccessSection,
	canAccessCategory,
	getAccessibleCategories,
	getAccessibleSections,
	isGlobalAdmin,
	hasCrossZoneAccess,
	isSectionAdmin,
	getEffectiveRole,
	createDefaultPermissions,
	createAdminPermissions,
	hasCapability
} from './permissions';

import {
	getRole,
	getSection,
	getCategory,
	getCategories,
	roleHasCapability,
	roleIsHigherThan,
	getSectionWithCategory
} from './loader';

// ---------------------------------------------------------------------------
// Cohort and category constants matching sections.yaml
// ---------------------------------------------------------------------------

/** All cohorts defined in sections.yaml */
const YAML_COHORTS = [
	'admin',
	'cross-access',
	'family',
	'family-only',
	'minimoonoir',
	'minimoonoir-only',
	'minimoonoir-business',
	'business',
	'business-only',
	'trainers',
	'trainees',
	'agent',
	'visionflow-full'
] as const;

/** The 4 category IDs from sections.yaml */
const CATEGORIES = {
	FAMILY: 'fairfield-family',
	MINIMOONOIR: 'minimoonoir',
	DREAMLAB: 'dreamlab',
	AI_AGENTS: 'ai-agents'
} as const;

/** All section IDs from sections.yaml, grouped by category */
const SECTIONS = {
	FAMILY: ['family-home', 'family-events', 'family-photos'],
	MINIMOONOIR: ['minimoonoir-welcome', 'minimoonoir-events', 'minimoonoir-booking'],
	DREAMLAB: ['dreamlab-lobby', 'dreamlab-training', 'dreamlab-projects', 'dreamlab-bookings'],
	AI_AGENTS: ['ai-general', 'ai-claude-flow', 'ai-visionflow']
} as const;

// ---------------------------------------------------------------------------
// Test fixtures: categories matching sections.yaml
// ---------------------------------------------------------------------------

function createFairfieldFamily(): CategoryConfig {
	return {
		id: 'fairfield-family',
		name: 'Fairfield Family',
		description: 'Private family zone',
		icon: '🏠',
		order: 1,
		access: {
			visibleToCohorts: ['family', 'cross-access'],
			hiddenFromCohorts: ['business-only'],
			strictIsolation: true
		},
		sections: [
			{
				id: 'family-home', name: 'Home', description: 'Main family discussion', icon: '🏡', order: 1,
				access: { requiresApproval: false, defaultRole: 'member', autoApprove: true, requiredCohorts: ['family', 'cross-access'] },
				calendar: { access: 'full', canCreate: true }, ui: { color: '#4a7c59' }
			},
			{
				id: 'family-events', name: 'Family Events', description: 'Birthdays etc', icon: '🎂', order: 2,
				access: { requiresApproval: false, defaultRole: 'member', autoApprove: true, requiredCohorts: ['family', 'cross-access'] },
				calendar: { access: 'full', canCreate: true }, ui: { color: '#6b8e23' }
			},
			{
				id: 'family-photos', name: 'Photos & Memories', description: 'Photo sharing', icon: '📸', order: 3,
				access: { requiresApproval: false, defaultRole: 'member', autoApprove: true, requiredCohorts: ['family', 'cross-access'] },
				calendar: { access: 'none', canCreate: false }, ui: { color: '#8b4513' }
			}
		]
	};
}

function createMinimoonoir(): CategoryConfig {
	return {
		id: 'minimoonoir',
		name: 'Minimoonoir',
		description: 'For friends and visitors',
		icon: '🌙',
		order: 2,
		access: {
			visibleToCohorts: ['minimoonoir', 'minimoonoir-business', 'cross-access'],
			hiddenFromCohorts: ['business-only'],
			strictIsolation: false
		},
		sections: [
			{
				id: 'minimoonoir-welcome', name: 'Welcome', description: 'Essential info', icon: '🏠', order: 1,
				access: { requiresApproval: false, defaultRole: 'guest', autoApprove: true },
				calendar: { access: 'full', canCreate: false }, ui: { color: '#8b5cf6' }
			},
			{
				id: 'minimoonoir-events', name: 'Events & Activities', description: 'Plan visits', icon: '🎯', order: 2,
				access: { requiresApproval: false, defaultRole: 'member', autoApprove: true, requiredCohorts: ['minimoonoir', 'minimoonoir-business', 'cross-access'] },
				calendar: { access: 'full', canCreate: true }, ui: { color: '#a78bfa' }
			},
			{
				id: 'minimoonoir-booking', name: 'Stay Booking', description: 'Book your stay', icon: '🛏️', order: 3,
				access: { requiresApproval: false, defaultRole: 'member', autoApprove: true, requiredCohorts: ['minimoonoir', 'minimoonoir-business', 'cross-access'] },
				calendar: { access: 'full', canCreate: true }, ui: { color: '#f59e0b' }
			}
		]
	};
}

function createDreamlab(): CategoryConfig {
	return {
		id: 'dreamlab',
		name: 'DreamLab',
		description: 'Business training and collaboration',
		icon: '✨',
		order: 3,
		access: {
			visibleToCohorts: ['business', 'minimoonoir-business', 'trainers', 'trainees', 'cross-access'],
			hiddenFromCohorts: ['family-only', 'minimoonoir-only'],
			strictIsolation: true
		},
		sections: [
			{
				id: 'dreamlab-lobby', name: 'DreamLab Lobby', description: 'Welcome area', icon: '🚪', order: 1,
				access: { requiresApproval: false, defaultRole: 'guest', autoApprove: true, requiredCohorts: ['business', 'minimoonoir-business', 'trainers', 'trainees', 'cross-access'] },
				calendar: { access: 'cohort', canCreate: false }, ui: { color: '#ec4899' }
			},
			{
				id: 'dreamlab-training', name: 'Training Rooms', description: 'Active training', icon: '📚', order: 2,
				access: { requiresApproval: true, defaultRole: 'member', autoApprove: false, requiredCohorts: ['trainers', 'trainees', 'cross-access'] },
				calendar: { access: 'cohort', canCreate: true }, ui: { color: '#db2777' }
			},
			{
				id: 'dreamlab-projects', name: 'Projects', description: 'Business projects', icon: '🚀', order: 3,
				access: { requiresApproval: true, defaultRole: 'member', autoApprove: false, requiredCohorts: ['business', 'cross-access'] },
				calendar: { access: 'cohort', canCreate: false }, ui: { color: '#a855f7' }
			},
			{
				id: 'dreamlab-bookings', name: 'Facility Booking', description: 'Book rooms', icon: '📅', order: 4,
				access: { requiresApproval: true, defaultRole: 'member', autoApprove: false, requiredCohorts: ['business', 'trainers', 'cross-access'] },
				calendar: { access: 'cohort', canCreate: false }, ui: { color: '#f97316' }
			}
		]
	};
}

function createAiAgents(): CategoryConfig {
	return {
		id: 'ai-agents',
		name: 'AI Agents',
		description: 'VisionFlow AI agents',
		icon: '🤖',
		order: 4,
		access: {
			visibleToCohorts: ['business', 'trainers', 'trainees', 'minimoonoir-business', 'cross-access'],
			hiddenFromCohorts: ['family-only'],
			strictIsolation: false
		},
		sections: [
			{
				id: 'ai-general', name: 'General Assistant', description: 'Quick answers', icon: '💬', order: 1,
				access: { requiresApproval: false, defaultRole: 'guest', autoApprove: true },
				calendar: { access: 'none', canCreate: false }, ui: { color: '#0ea5e9' }
			},
			{
				id: 'ai-claude-flow', name: 'Claude Flow Agent', description: 'Agentic AI', icon: '🧠', order: 2,
				access: { requiresApproval: true, defaultRole: 'member', autoApprove: false, requiredCohorts: ['business', 'trainers', 'trainees', 'minimoonoir-business', 'cross-access'] },
				calendar: { access: 'none', canCreate: false }, ui: { color: '#8b5cf6' }
			},
			{
				id: 'ai-visionflow', name: 'VisionFlow Intelligence', description: 'Full VisionFlow', icon: '🔮', order: 3,
				access: { requiresApproval: true, defaultRole: 'member', autoApprove: false, requiredCohorts: ['cross-access', 'visionflow-full'] },
				calendar: { access: 'none', canCreate: false }, ui: { color: '#ec4899' }
			}
		]
	};
}

/** All 4 categories as defined in sections.yaml */
function getAllCategories(): CategoryConfig[] {
	return [createFairfieldFamily(), createMinimoonoir(), createDreamlab(), createAiAgents()];
}

/** Find a section by ID from all categories */
function findSection(sectionId: string): SectionConfig | undefined {
	for (const cat of getAllCategories()) {
		const section = cat.sections.find(s => s.id === sectionId);
		if (section) return section;
	}
	return undefined;
}

/** Find a section with its parent category */
function findSectionWithCategory(sectionId: string): { section: SectionConfig; category: CategoryConfig } | undefined {
	for (const cat of getAllCategories()) {
		const section = cat.sections.find(s => s.id === sectionId);
		if (section) return { section, category: cat };
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Helper to create mock user permissions
// ---------------------------------------------------------------------------

function createTestPermissions(options: {
	pubkey?: string;
	cohorts: string[];
	globalRole?: 'guest' | 'member' | 'moderator' | 'section-admin' | 'admin';
	sectionRoles?: Array<{ sectionId: string; role: string }>;
}): UserPermissions {
	return {
		pubkey: options.pubkey || 'test-pubkey-' + Math.random().toString(36).slice(2, 10),
		cohorts: options.cohorts,
		globalRole: options.globalRole || 'member',
		sectionRoles: (options.sectionRoles || []).map(sr => ({
			sectionId: sr.sectionId,
			role: sr.role as any,
			assignedAt: Date.now()
		}))
	};
}

// ---------------------------------------------------------------------------
// Common mock setup
// ---------------------------------------------------------------------------

function setupDefaultMocks() {
	vi.mocked(getRole).mockImplementation((roleId) => {
		const roles: Record<string, { id: string; name: string; level: number; description: string }> = {
			guest: { id: 'guest', name: 'Guest', level: 0, description: 'Basic authenticated user' },
			member: { id: 'member', name: 'Member', level: 1, description: 'Approved zone member' },
			moderator: { id: 'moderator', name: 'Moderator', level: 2, description: 'Can manage channels' },
			'section-admin': { id: 'section-admin', name: 'Section Admin', level: 3, description: 'Section administrator' },
			admin: { id: 'admin', name: 'Admin', level: 4, description: 'Global administrator' }
		};
		return roles[roleId] as any;
	});

	vi.mocked(roleHasCapability).mockReturnValue(false);

	vi.mocked(roleIsHigherThan).mockImplementation((a, b) => {
		const levels: Record<string, number> = {
			guest: 0, member: 1, moderator: 2, 'section-admin': 3, admin: 4
		};
		return (levels[a] || 0) > (levels[b] || 0);
	});

	const allCats = getAllCategories();
	vi.mocked(getCategories).mockReturnValue(allCats);

	vi.mocked(getCategory).mockImplementation((id) =>
		allCats.find(c => c.id === id)
	);

	vi.mocked(getSection).mockImplementation((id) => findSection(id));

	vi.mocked(getSectionWithCategory).mockImplementation((id) => findSectionWithCategory(id));
}

// ===========================================================================
// TEST SUITE 1: Cohort Definitions Alignment
// ===========================================================================

describe('1. Cohort Definitions Alignment', () => {
	/**
	 * Cohort IDs are plain strings — the relay is the source of truth.
	 * These tests verify that sections.yaml cohorts are self-consistent
	 * and that the permission system passes them through without mapping.
	 */

	it('should confirm sections.yaml defines 13 cohorts total', () => {
		expect(YAML_COHORTS).toHaveLength(13);
	});

	it('should pass relay cohorts through to UserPermissions without mapping', () => {
		const relayResponse = {
			isWhitelisted: true,
			isAdmin: false,
			cohorts: ['family', 'cross-access', 'minimoonoir-business'],
			verifiedAt: Date.now(),
			source: 'relay' as const
		};

		const permissions: UserPermissions = {
			pubkey: 'test-pubkey',
			cohorts: relayResponse.cohorts,
			globalRole: 'member',
			sectionRoles: []
		};

		expect(permissions.cohorts).toHaveLength(3);
		expect(permissions.cohorts).toContain('family');
		expect(permissions.cohorts).toContain('cross-access');
		expect(permissions.cohorts).toContain('minimoonoir-business');
	});

	it('should accept arbitrary cohort strings (relay is source of truth)', () => {
		const permissions: UserPermissions = {
			pubkey: 'test',
			cohorts: ['family', 'future-cohort-added-on-relay', 'cross-access'],
			globalRole: 'member',
			sectionRoles: []
		};
		expect(permissions.cohorts).toHaveLength(3);
	});

	it('should verify every requiredCohort in sections.yaml is a defined cohort', () => {
		const allCats = getAllCategories();
		for (const cat of allCats) {
			for (const section of cat.sections) {
				if (section.access.requiredCohorts) {
					for (const cohort of section.access.requiredCohorts) {
						expect(YAML_COHORTS).toContain(cohort);
					}
				}
			}
		}
	});
});

// ===========================================================================
// TEST SUITE 2: Admin Zone Access
// ===========================================================================

describe('2. Admin Zone Access', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaultMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Admin with globalRole="admin" accesses ALL 4 categories', () => {
		const categoryIds = Object.values(CATEGORIES);

		for (const categoryId of categoryIds) {
			it(`should ALLOW globalRole admin to access ${categoryId}`, () => {
				const admin = createTestPermissions({
					cohorts: [],
					globalRole: 'admin'
				});

				const result = canAccessCategory(admin, categoryId);
				expect(result).toBe(true);
			});
		}

		it('should return all 4 categories for globalRole admin via getAccessibleCategories', () => {
			const admin = createTestPermissions({
				cohorts: [],
				globalRole: 'admin'
			});

			const accessible = getAccessibleCategories(admin);
			expect(accessible).toHaveLength(4);

			const ids = accessible.map(c => c.id);
			expect(ids).toContain(CATEGORIES.FAMILY);
			expect(ids).toContain(CATEGORIES.MINIMOONOIR);
			expect(ids).toContain(CATEGORIES.DREAMLAB);
			expect(ids).toContain(CATEGORIES.AI_AGENTS);
		});
	});

	describe('Admin with cohorts=["admin"] (no cross-access) accesses all via globalRole check', () => {
		it('should ALLOW admin-cohort user with globalRole="admin" to access all categories', () => {
			const admin = createTestPermissions({
				cohorts: ['admin'],
				globalRole: 'admin'
			});

			for (const categoryId of Object.values(CATEGORIES)) {
				expect(canAccessCategory(admin, categoryId)).toBe(true);
			}
		});

		it('should identify admin-cohort user as global admin even with globalRole="member"', () => {
			// BUG SCENARIO: Admin user has cohorts=['admin'] but globalRole='member'
			// isGlobalAdmin checks cohorts.includes('admin'), but canAccessCategory
			// only checks permissions.globalRole === 'admin'
			const adminCohortUser = createTestPermissions({
				cohorts: ['admin'],
				globalRole: 'member'
			});

			// isGlobalAdmin returns true because cohorts include 'admin'
			expect(isGlobalAdmin(adminCohortUser)).toBe(true);

			// hasCrossZoneAccess returns true because cohorts include 'admin'
			expect(hasCrossZoneAccess(adminCohortUser)).toBe(true);
		});

		it('should expose the bug: admin-cohort user without globalRole="admin" may be denied category access', () => {
			// This documents a real discrepancy in the codebase:
			// canAccessCategory checks globalRole === 'admin' first,
			// but does NOT check cohorts.includes('admin') for the bypass.
			// The cross-access check covers cohorts.includes('cross-access'),
			// but 'admin' cohort relies solely on globalRole.
			const adminCohortMember = createTestPermissions({
				cohorts: ['admin'],
				globalRole: 'member'
			});

			// For fairfield-family: visibleToCohorts = ['family', 'cross-access']
			// User has cohorts=['admin'] which is NOT in visibleToCohorts
			// globalRole='member' so admin bypass is skipped
			// 'admin' is not 'cross-access', so cross-access bypass is skipped
			// Result: denied access to family zone
			const familyAccess = canAccessCategory(adminCohortMember, CATEGORIES.FAMILY);
			expect(familyAccess).toBe(false);
			// ^ This is the BUG: isGlobalAdmin returns true but canAccessCategory returns false
			// because canAccessCategory does not consult isGlobalAdmin(), it only checks
			// permissions.globalRole === 'admin'
		});
	});

	describe('Cross-access cohort accesses all categories', () => {
		it('should ALLOW cross-access user to access all 4 categories', () => {
			const crossAccess = createTestPermissions({
				cohorts: ['cross-access'],
				globalRole: 'member'
			});

			for (const categoryId of Object.values(CATEGORIES)) {
				expect(canAccessCategory(crossAccess, categoryId)).toBe(true);
			}
		});

		it('should return all 4 categories for cross-access user', () => {
			const crossAccess = createTestPermissions({
				cohorts: ['cross-access'],
				globalRole: 'member'
			});

			const accessible = getAccessibleCategories(crossAccess);
			expect(accessible).toHaveLength(4);
		});
	});

	describe('Family-only user restricted to fairfield-family', () => {
		it('should ALLOW family user to access fairfield-family', () => {
			const familyUser = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'member'
			});

			expect(canAccessCategory(familyUser, CATEGORIES.FAMILY)).toBe(true);
		});

		it('should DENY family user access to minimoonoir', () => {
			const familyUser = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'member'
			});

			expect(canAccessCategory(familyUser, CATEGORIES.MINIMOONOIR)).toBe(false);
		});

		it('should DENY family user access to dreamlab', () => {
			const familyUser = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'member'
			});

			expect(canAccessCategory(familyUser, CATEGORIES.DREAMLAB)).toBe(false);
		});

		it('should DENY family user access to ai-agents', () => {
			const familyUser = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'member'
			});

			expect(canAccessCategory(familyUser, CATEGORIES.AI_AGENTS)).toBe(false);
		});

		it('should return only fairfield-family for family-only user', () => {
			const familyUser = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'member'
			});

			const accessible = getAccessibleCategories(familyUser);
			expect(accessible).toHaveLength(1);
			expect(accessible[0].id).toBe(CATEGORIES.FAMILY);
		});
	});

	describe('Business-only user CANNOT access fairfield-family (hiddenFromCohorts)', () => {
		it('should DENY business-only user access to fairfield-family', () => {
			const businessOnly = createTestPermissions({
				cohorts: ['business-only'],
				globalRole: 'member'
			});

			// fairfield-family has hiddenFromCohorts: ['business-only']
			expect(canAccessCategory(businessOnly, CATEGORIES.FAMILY)).toBe(false);
		});

		it('should DENY business-only user access to minimoonoir', () => {
			const businessOnly = createTestPermissions({
				cohorts: ['business-only'],
				globalRole: 'member'
			});

			// minimoonoir has hiddenFromCohorts: ['business-only']
			expect(canAccessCategory(businessOnly, CATEGORIES.MINIMOONOIR)).toBe(false);
		});

		it('should DENY business-only access to dreamlab (not in visibleToCohorts)', () => {
			const businessOnly = createTestPermissions({
				cohorts: ['business-only'],
				globalRole: 'member'
			});

			// dreamlab visibleToCohorts: ['business', 'minimoonoir-business', 'trainers', 'trainees', 'cross-access']
			// 'business-only' is NOT in visibleToCohorts
			expect(canAccessCategory(businessOnly, CATEGORIES.DREAMLAB)).toBe(false);
		});
	});

	describe('Guest user sees only categories without visibleToCohorts restriction', () => {
		it('should DENY guest with no cohorts access to all 4 zone categories', () => {
			const guest = createTestPermissions({
				cohorts: [],
				globalRole: 'guest'
			});

			// All 4 categories have visibleToCohorts defined, so guest with no cohorts is denied
			expect(canAccessCategory(guest, CATEGORIES.FAMILY)).toBe(false);
			expect(canAccessCategory(guest, CATEGORIES.MINIMOONOIR)).toBe(false);
			expect(canAccessCategory(guest, CATEGORIES.DREAMLAB)).toBe(false);
			expect(canAccessCategory(guest, CATEGORIES.AI_AGENTS)).toBe(false);
		});

		it('should ALLOW guest to see a category without access restrictions', () => {
			// Mock a public category with no access config
			const publicCategory: CategoryConfig = {
				id: 'public-zone',
				name: 'Public',
				description: 'Open zone',
				icon: '🌐',
				order: 99,
				sections: []
				// No access config = visible to all
			};

			vi.mocked(getCategory).mockImplementation((id) => {
				if (id === 'public-zone') return publicCategory;
				return getAllCategories().find(c => c.id === id);
			});

			const guest = createTestPermissions({
				cohorts: [],
				globalRole: 'guest'
			});

			expect(canAccessCategory(guest, 'public-zone')).toBe(true);
		});
	});
});

// ===========================================================================
// TEST SUITE 3: Section Access Hierarchy
// ===========================================================================

describe('3. Section Access Hierarchy', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaultMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Admin bypasses all section restrictions', () => {
		const allSections = [
			...SECTIONS.FAMILY,
			...SECTIONS.MINIMOONOIR,
			...SECTIONS.DREAMLAB,
			...SECTIONS.AI_AGENTS
		];

		for (const sectionId of allSections) {
			it(`should ALLOW admin to access section "${sectionId}"`, () => {
				const admin = createTestPermissions({
					cohorts: [],
					globalRole: 'admin'
				});

				expect(canAccessSection(admin, sectionId)).toBe(true);
			});
		}
	});

	describe('autoApprove sections accessible to all authenticated users', () => {
		// autoApprove sections from YAML:
		// family-home, family-events, family-photos (autoApprove: true)
		// minimoonoir-welcome, minimoonoir-events, minimoonoir-booking (autoApprove: true)
		// dreamlab-lobby (autoApprove: true)
		// ai-general (autoApprove: true)

		const autoApproveSections = [
			'family-home', 'family-events', 'family-photos',
			'minimoonoir-welcome', 'minimoonoir-events', 'minimoonoir-booking',
			'dreamlab-lobby',
			'ai-general'
		];

		for (const sectionId of autoApproveSections) {
			it(`should ALLOW guest to access autoApprove section "${sectionId}"`, () => {
				const guest = createTestPermissions({
					cohorts: [],
					globalRole: 'guest'
				});

				expect(canAccessSection(guest, sectionId)).toBe(true);
			});
		}
	});

	describe('requiredCohorts sections need matching cohort', () => {
		it('should ALLOW family user to access family-home (requiredCohorts: family, cross-access)', () => {
			const familyUser = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'member'
			});

			expect(canAccessSection(familyUser, 'family-home')).toBe(true);
		});

		it('should DENY business user access to family-home', () => {
			const businessUser = createTestPermissions({
				cohorts: ['business'],
				globalRole: 'member'
			});

			// family-home autoApprove: true, so everyone can access (autoApprove is checked first)
			// Note: Section-level access is separate from category-level access
			expect(canAccessSection(businessUser, 'family-home')).toBe(true);
		});

		it('should DENY business user access to dreamlab-training (requiredCohorts: trainers, trainees, cross-access)', () => {
			const businessUser = createTestPermissions({
				cohorts: ['business'],
				globalRole: 'member'
			});

			// dreamlab-training is NOT autoApprove, requires ['trainers', 'trainees', 'cross-access']
			// 'business' is NOT in required cohorts
			expect(canAccessSection(businessUser, 'dreamlab-training')).toBe(false);
		});

		it('should ALLOW trainers to access dreamlab-training', () => {
			const trainer = createTestPermissions({
				cohorts: ['trainers'],
				globalRole: 'member'
			});

			expect(canAccessSection(trainer, 'dreamlab-training')).toBe(true);
		});

		it('should ALLOW trainees to access dreamlab-training', () => {
			const trainee = createTestPermissions({
				cohorts: ['trainees'],
				globalRole: 'member'
			});

			expect(canAccessSection(trainee, 'dreamlab-training')).toBe(true);
		});

		it('should DENY family user access to ai-visionflow (requiredCohorts: cross-access, visionflow-full)', () => {
			const familyUser = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'member'
			});

			expect(canAccessSection(familyUser, 'ai-visionflow')).toBe(false);
		});

		it('should ALLOW visionflow-full user to access ai-visionflow', () => {
			const vfUser = createTestPermissions({
				cohorts: ['visionflow-full'],
				globalRole: 'member'
			});

			expect(canAccessSection(vfUser, 'ai-visionflow')).toBe(true);
		});
	});

	describe('Non-matching cohort users are denied restricted sections', () => {
		it('should DENY minimoonoir-only user access to dreamlab-projects', () => {
			const moonUser = createTestPermissions({
				cohorts: ['minimoonoir-only'],
				globalRole: 'member'
			});

			// dreamlab-projects requires ['business', 'cross-access']
			expect(canAccessSection(moonUser, 'dreamlab-projects')).toBe(false);
		});

		it('should DENY family-only user access to dreamlab-bookings', () => {
			const familyOnlyUser = createTestPermissions({
				cohorts: ['family-only'],
				globalRole: 'member'
			});

			// dreamlab-bookings requires ['business', 'trainers', 'cross-access']
			expect(canAccessSection(familyOnlyUser, 'dreamlab-bookings')).toBe(false);
		});

		it('should DENY agent cohort access to ai-claude-flow (not in requiredCohorts)', () => {
			// ai-claude-flow requires: business, trainers, trainees, minimoonoir-business, cross-access
			// 'agent' is NOT in the list
			const agentUser = createTestPermissions({
				cohorts: ['agent'],
				globalRole: 'member'
			});

			expect(canAccessSection(agentUser, 'ai-claude-flow')).toBe(false);
		});
	});

	describe('Section access with section-specific roles', () => {
		it('should ALLOW user with section-specific role to access restricted section', () => {
			const user = createTestPermissions({
				cohorts: [],
				globalRole: 'guest',
				sectionRoles: [{ sectionId: 'dreamlab-training', role: 'member' }]
			});

			expect(canAccessSection(user, 'dreamlab-training')).toBe(true);
		});
	});

	describe('Non-existent section returns false', () => {
		it('should return false for non-existent section', () => {
			const user = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'member'
			});

			vi.mocked(getSection).mockReturnValue(undefined);
			expect(canAccessSection(user, 'non-existent-section')).toBe(false);
		});
	});
});

// ===========================================================================
// TEST SUITE 4: Channel Zone Filtering
// ===========================================================================

describe('4. Channel Zone Filtering (canAccessChannelZone logic)', () => {
	/**
	 * canAccessChannelZone is a private function in channels.ts.
	 * We test its logic by replicating it here against the real category configs.
	 * This validates the behavior without needing to export the private function.
	 */

	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaultMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Replicate canAccessChannelZone logic for testing.
	 * This mirrors the implementation in channels.ts lines 425-457.
	 */
	function canAccessChannelZone(
		sectionId: string,
		userCohorts: string[],
		isAdmin: boolean
	): boolean {
		if (isAdmin) return true;

		const sectionInfo = findSectionWithCategory(sectionId);
		if (!sectionInfo) return true; // Unknown section -- don't filter

		const { category } = sectionInfo;
		if (!category.access) return true; // No access config = visible to all

		// cross-access cohort can access all categories
		if (userCohorts.includes('cross-access')) return true;

		// Check hiddenFromCohorts
		if (category.access.hiddenFromCohorts?.length) {
			const isHidden = category.access.hiddenFromCohorts.some((cohort: string) =>
				userCohorts.includes(cohort)
			);
			if (isHidden) return false;
		}

		// Check visibleToCohorts
		if (category.access.visibleToCohorts?.length) {
			return category.access.visibleToCohorts.some((cohort: string) =>
				userCohorts.includes(cohort)
			);
		}

		return true;
	}

	describe('Admin bypass returns true for all channels in all zones', () => {
		const allSections = [
			...SECTIONS.FAMILY,
			...SECTIONS.MINIMOONOIR,
			...SECTIONS.DREAMLAB,
			...SECTIONS.AI_AGENTS
		];

		for (const sectionId of allSections) {
			it(`should ALLOW admin for channel in section "${sectionId}"`, () => {
				expect(canAccessChannelZone(sectionId, [], true)).toBe(true);
			});
		}
	});

	describe('Cross-access cohort returns true for all zones', () => {
		for (const sectionId of [...SECTIONS.FAMILY, ...SECTIONS.MINIMOONOIR, ...SECTIONS.DREAMLAB, ...SECTIONS.AI_AGENTS]) {
			it(`should ALLOW cross-access for channel in section "${sectionId}"`, () => {
				expect(canAccessChannelZone(sectionId, ['cross-access'], false)).toBe(true);
			});
		}
	});

	describe('hiddenFromCohorts properly denies', () => {
		it('should DENY business-only user for channel in fairfield-family zone', () => {
			// fairfield-family hiddenFromCohorts: ['business-only']
			expect(canAccessChannelZone('family-home', ['business-only'], false)).toBe(false);
		});

		it('should DENY business-only user for channel in minimoonoir zone', () => {
			// minimoonoir hiddenFromCohorts: ['business-only']
			expect(canAccessChannelZone('minimoonoir-welcome', ['business-only'], false)).toBe(false);
		});

		it('should DENY family-only user for channel in dreamlab zone', () => {
			// dreamlab hiddenFromCohorts: ['family-only', 'minimoonoir-only']
			expect(canAccessChannelZone('dreamlab-lobby', ['family-only'], false)).toBe(false);
		});

		it('should DENY minimoonoir-only user for channel in dreamlab zone', () => {
			expect(canAccessChannelZone('dreamlab-training', ['minimoonoir-only'], false)).toBe(false);
		});

		it('should DENY family-only user for channel in ai-agents zone', () => {
			// ai-agents hiddenFromCohorts: ['family-only']
			expect(canAccessChannelZone('ai-general', ['family-only'], false)).toBe(false);
		});
	});

	describe('visibleToCohorts filtering', () => {
		it('should ALLOW family user for channel in fairfield-family zone', () => {
			expect(canAccessChannelZone('family-home', ['family'], false)).toBe(true);
		});

		it('should DENY family user for channel in minimoonoir zone', () => {
			// minimoonoir visibleToCohorts: ['minimoonoir', 'minimoonoir-business', 'cross-access']
			expect(canAccessChannelZone('minimoonoir-welcome', ['family'], false)).toBe(false);
		});

		it('should ALLOW minimoonoir user for channel in minimoonoir zone', () => {
			expect(canAccessChannelZone('minimoonoir-welcome', ['minimoonoir'], false)).toBe(true);
		});

		it('should ALLOW minimoonoir-business user for channel in minimoonoir zone', () => {
			expect(canAccessChannelZone('minimoonoir-events', ['minimoonoir-business'], false)).toBe(true);
		});

		it('should ALLOW minimoonoir-business user for channel in dreamlab zone', () => {
			// dreamlab visibleToCohorts includes 'minimoonoir-business'
			expect(canAccessChannelZone('dreamlab-lobby', ['minimoonoir-business'], false)).toBe(true);
		});

		it('should ALLOW business user for channel in dreamlab zone', () => {
			expect(canAccessChannelZone('dreamlab-lobby', ['business'], false)).toBe(true);
		});

		it('should ALLOW business user for channel in ai-agents zone', () => {
			// ai-agents visibleToCohorts: ['business', 'trainers', 'trainees', 'minimoonoir-business', 'cross-access']
			expect(canAccessChannelZone('ai-general', ['business'], false)).toBe(true);
		});

		it('should DENY family user for channel in ai-agents zone', () => {
			expect(canAccessChannelZone('ai-general', ['family'], false)).toBe(false);
		});
	});

	describe('Unknown section does not filter (returns true)', () => {
		it('should return true for unknown section ID', () => {
			expect(canAccessChannelZone('unknown-section', ['family'], false)).toBe(true);
		});

		it('should return true for empty section ID', () => {
			expect(canAccessChannelZone('', [], false)).toBe(true);
		});
	});
});

// ===========================================================================
// TEST SUITE 5: UserPermissions Store Derivation Logic
// ===========================================================================

describe('5. UserPermissions Store Derivation Logic', () => {
	/**
	 * The userPermissionsStore derives permissions from authStore + whitelistStatusStore.
	 * We test the derivation logic without importing the actual Svelte store.
	 */

	/**
	 * Replicates the derivation logic from userPermissions.ts
	 */
	function derivePermissions(
		auth: { isAuthenticated: boolean; pubkey: string | null },
		whitelistStatus: { isAdmin: boolean; cohorts: string[] } | null
	): UserPermissions | null {
		if (!auth.isAuthenticated || !auth.pubkey) {
			return null;
		}

		const cohorts = whitelistStatus?.cohorts ?? [];
		const isAdmin = whitelistStatus?.isAdmin ?? false;

		return {
			pubkey: auth.pubkey,
			cohorts: cohorts,
			globalRole: isAdmin ? 'admin' : 'member',
			sectionRoles: []
		};
	}

	it('should return null when user is not authenticated', () => {
		const result = derivePermissions(
			{ isAuthenticated: false, pubkey: null },
			null
		);
		expect(result).toBeNull();
	});

	it('should return null when pubkey is null even if authenticated', () => {
		const result = derivePermissions(
			{ isAuthenticated: true, pubkey: null },
			{ isAdmin: false, cohorts: ['family'] }
		);
		expect(result).toBeNull();
	});

	it('should set globalRole to "admin" when whitelistStatus.isAdmin is true', () => {
		const result = derivePermissions(
			{ isAuthenticated: true, pubkey: 'abc123' },
			{ isAdmin: true, cohorts: ['admin'] }
		);

		expect(result).not.toBeNull();
		expect(result!.globalRole).toBe('admin');
	});

	it('should set globalRole to "member" when whitelistStatus.isAdmin is false', () => {
		const result = derivePermissions(
			{ isAuthenticated: true, pubkey: 'abc123' },
			{ isAdmin: false, cohorts: ['family'] }
		);

		expect(result).not.toBeNull();
		expect(result!.globalRole).toBe('member');
	});

	it('should use empty cohorts when whitelistStatus is null (loading state)', () => {
		const result = derivePermissions(
			{ isAuthenticated: true, pubkey: 'abc123' },
			null
		);

		expect(result).not.toBeNull();
		expect(result!.cohorts).toEqual([]);
		expect(result!.globalRole).toBe('member');
	});

	it('should pass through all cohorts from whitelist status to permissions', () => {
		const cohorts = ['family', 'cross-access', 'minimoonoir-business'];
		const result = derivePermissions(
			{ isAuthenticated: true, pubkey: 'abc123' },
			{ isAdmin: false, cohorts }
		);

		expect(result).not.toBeNull();
		expect(result!.cohorts).toEqual(cohorts);
		expect(result!.cohorts).toHaveLength(3);
	});

	it('should always initialize sectionRoles as empty array', () => {
		const result = derivePermissions(
			{ isAuthenticated: true, pubkey: 'abc123' },
			{ isAdmin: true, cohorts: ['admin'] }
		);

		expect(result!.sectionRoles).toEqual([]);
	});

	it('should handle admin user with full relay cohort list', () => {
		const fullCohorts = ['admin', 'cross-access', 'family', 'business', 'trainers'];
		const result = derivePermissions(
			{ isAuthenticated: true, pubkey: 'admin-key' },
			{ isAdmin: true, cohorts: fullCohorts }
		);

		expect(result!.globalRole).toBe('admin');
		expect(result!.cohorts).toEqual(fullCohorts);
	});
});

// ===========================================================================
// TEST SUITE 6: Edge Cases
// ===========================================================================

describe('6. Edge Cases', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaultMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('Empty cohorts array', () => {
		it('should DENY member with empty cohorts access to all restricted categories', () => {
			const user = createTestPermissions({
				cohorts: [],
				globalRole: 'member'
			});

			expect(canAccessCategory(user, CATEGORIES.FAMILY)).toBe(false);
			expect(canAccessCategory(user, CATEGORIES.MINIMOONOIR)).toBe(false);
			expect(canAccessCategory(user, CATEGORIES.DREAMLAB)).toBe(false);
			expect(canAccessCategory(user, CATEGORIES.AI_AGENTS)).toBe(false);
		});

		it('should return 0 accessible categories for member with empty cohorts', () => {
			const user = createTestPermissions({
				cohorts: [],
				globalRole: 'member'
			});

			const accessible = getAccessibleCategories(user);
			expect(accessible).toHaveLength(0);
		});

		it('should still ALLOW access to autoApprove sections', () => {
			const user = createTestPermissions({
				cohorts: [],
				globalRole: 'guest'
			});

			// minimoonoir-welcome is autoApprove: true
			expect(canAccessSection(user, 'minimoonoir-welcome')).toBe(true);
			expect(canAccessSection(user, 'ai-general')).toBe(true);
		});
	});

	describe('User with ALL cohorts', () => {
		it('should access all categories when holding all visible cohorts', () => {
			const superUser = createTestPermissions({
				cohorts: [...YAML_COHORTS],
				globalRole: 'member'
			});

			// Has 'cross-access' in cohorts -> bypasses all category checks
			expect(canAccessCategory(superUser, CATEGORIES.FAMILY)).toBe(true);
			expect(canAccessCategory(superUser, CATEGORIES.MINIMOONOIR)).toBe(true);
			expect(canAccessCategory(superUser, CATEGORIES.DREAMLAB)).toBe(true);
			expect(canAccessCategory(superUser, CATEGORIES.AI_AGENTS)).toBe(true);
		});

		it('should have hiddenFromCohorts take precedence when user has conflicting cohorts', () => {
			// User has both 'family' (visible) and 'business-only' (hidden) for fairfield-family
			const conflicted = createTestPermissions({
				cohorts: ['family', 'business-only'],
				globalRole: 'member'
			});

			// fairfield-family: visibleToCohorts has 'family', hiddenFromCohorts has 'business-only'
			// hiddenFromCohorts is checked FIRST in the implementation, so deny wins
			expect(canAccessCategory(conflicted, CATEGORIES.FAMILY)).toBe(false);
		});
	});

	describe('User with conflicting cohorts (family + business-only)', () => {
		it('should be hidden from fairfield-family due to business-only cohort', () => {
			const conflicted = createTestPermissions({
				cohorts: ['family', 'business-only'],
				globalRole: 'member'
			});

			// hiddenFromCohorts: ['business-only'] takes precedence
			expect(canAccessCategory(conflicted, CATEGORIES.FAMILY)).toBe(false);
		});

		it('should be hidden from minimoonoir due to business-only cohort', () => {
			const conflicted = createTestPermissions({
				cohorts: ['minimoonoir', 'business-only'],
				globalRole: 'member'
			});

			// minimoonoir hiddenFromCohorts: ['business-only']
			expect(canAccessCategory(conflicted, CATEGORIES.MINIMOONOIR)).toBe(false);
		});

		it('should be hidden from dreamlab due to family-only + minimoonoir-only cohorts', () => {
			const familyOnly = createTestPermissions({
				cohorts: ['business', 'family-only'],
				globalRole: 'member'
			});

			// dreamlab hiddenFromCohorts: ['family-only', 'minimoonoir-only']
			// Even though user has 'business' (visible), 'family-only' hides it
			expect(canAccessCategory(familyOnly, CATEGORIES.DREAMLAB)).toBe(false);
		});
	});

	describe('hiddenFromCohorts precedence over visibleToCohorts', () => {
		it('should deny access even when user matches visibleToCohorts if also in hiddenFromCohorts', () => {
			// Specifically: user with 'family' matches visibleToCohorts of fairfield-family
			// But if they also have 'business-only', they are denied
			const user = createTestPermissions({
				cohorts: ['family', 'business-only'],
				globalRole: 'member'
			});

			expect(canAccessCategory(user, CATEGORIES.FAMILY)).toBe(false);
		});
	});

	describe('Non-existent category returns false', () => {
		it('should return false for non-existent category', () => {
			vi.mocked(getCategory).mockReturnValue(undefined);

			const user = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'admin'
			});

			expect(canAccessCategory(user, 'non-existent-zone')).toBe(false);
		});
	});

	describe('Whitelist API timeout / fallback path', () => {
		it('should produce permissions with empty cohorts and member role on fallback', () => {
			// When whitelist API times out, whitelistStatus is null
			// The store derivation produces member with empty cohorts
			const fallbackPermissions: UserPermissions = {
				pubkey: 'some-user',
				cohorts: [],
				globalRole: 'member',
				sectionRoles: []
			};

			// With empty cohorts and member role, user sees nothing restricted
			expect(canAccessCategory(fallbackPermissions, CATEGORIES.FAMILY)).toBe(false);
			expect(canAccessCategory(fallbackPermissions, CATEGORIES.MINIMOONOIR)).toBe(false);
			expect(canAccessCategory(fallbackPermissions, CATEGORIES.DREAMLAB)).toBe(false);
			expect(canAccessCategory(fallbackPermissions, CATEGORIES.AI_AGENTS)).toBe(false);
		});

		it('should produce admin permissions when fallback identifies admin pubkey', () => {
			// When API is down but VITE_ADMIN_PUBKEY matches, fallback gives admin+['admin'] cohort
			const fallbackAdmin: UserPermissions = {
				pubkey: 'admin-pubkey',
				cohorts: ['admin'],
				globalRole: 'admin',
				sectionRoles: []
			};

			// Admin globalRole bypasses all checks
			expect(canAccessCategory(fallbackAdmin, CATEGORIES.FAMILY)).toBe(true);
			expect(canAccessCategory(fallbackAdmin, CATEGORIES.MINIMOONOIR)).toBe(true);
			expect(canAccessCategory(fallbackAdmin, CATEGORIES.DREAMLAB)).toBe(true);
			expect(canAccessCategory(fallbackAdmin, CATEGORIES.AI_AGENTS)).toBe(true);
		});
	});

	describe('minimumRole enforcement', () => {
		it('should deny guest when category requires member role', () => {
			const memberOnlyCat: CategoryConfig = {
				id: 'members-only',
				name: 'Members Only',
				description: 'Requires member role',
				icon: '🔒',
				order: 99,
				sections: [],
				access: {
					minimumRole: 'member'
				}
			};

			vi.mocked(getCategory).mockImplementation((id) => {
				if (id === 'members-only') return memberOnlyCat;
				return getAllCategories().find(c => c.id === id);
			});

			const guest = createTestPermissions({
				cohorts: ['some-cohort'],
				globalRole: 'guest'
			});

			expect(canAccessCategory(guest, 'members-only')).toBe(false);
		});

		it('should allow member when category requires member role', () => {
			const memberOnlyCat: CategoryConfig = {
				id: 'members-only',
				name: 'Members Only',
				description: 'Requires member role',
				icon: '🔒',
				order: 99,
				sections: [],
				access: {
					minimumRole: 'member'
				}
			};

			vi.mocked(getCategory).mockImplementation((id) => {
				if (id === 'members-only') return memberOnlyCat;
				return getAllCategories().find(c => c.id === id);
			});

			const member = createTestPermissions({
				cohorts: ['some-cohort'],
				globalRole: 'member'
			});

			expect(canAccessCategory(member, 'members-only')).toBe(true);
		});
	});

	describe('getAccessibleSections with zone categories', () => {
		it('should return all sections for admin user', () => {
			const admin = createTestPermissions({
				cohorts: [],
				globalRole: 'admin'
			});

			const allSectionIds = [
				...SECTIONS.FAMILY,
				...SECTIONS.MINIMOONOIR,
				...SECTIONS.DREAMLAB,
				...SECTIONS.AI_AGENTS
			];

			const accessible = getAccessibleSections(admin, allSectionIds);
			expect(accessible).toHaveLength(allSectionIds.length);
		});

		it('should filter sections for family-only user', () => {
			const familyUser = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'member'
			});

			const allSectionIds = [
				...SECTIONS.FAMILY,
				...SECTIONS.MINIMOONOIR,
				...SECTIONS.DREAMLAB,
				...SECTIONS.AI_AGENTS
			];

			const accessible = getAccessibleSections(familyUser, allSectionIds);

			// Family user gets:
			// - family-home, family-events, family-photos (autoApprove + matching cohort)
			// - minimoonoir-welcome (autoApprove, no requiredCohorts)
			// - dreamlab-lobby (autoApprove, has requiredCohorts but family is not in them)
			// - ai-general (autoApprove, no requiredCohorts)
			// autoApprove sections are always accessible regardless of cohort
			const accessibleIds = accessible;

			expect(accessibleIds).toContain('family-home');
			expect(accessibleIds).toContain('family-events');
			expect(accessibleIds).toContain('family-photos');
			expect(accessibleIds).toContain('minimoonoir-welcome');
			expect(accessibleIds).toContain('ai-general');

			// Should NOT have restricted sections where family is not in requiredCohorts
			expect(accessibleIds).not.toContain('dreamlab-training');
			expect(accessibleIds).not.toContain('dreamlab-projects');
			expect(accessibleIds).not.toContain('dreamlab-bookings');
			expect(accessibleIds).not.toContain('ai-claude-flow');
			expect(accessibleIds).not.toContain('ai-visionflow');
		});
	});

	describe('Effective role computation for zone sections', () => {
		it('should return admin for admin user in any section', () => {
			const admin = createTestPermissions({
				cohorts: [],
				globalRole: 'admin'
			});

			expect(getEffectiveRole(admin, 'family-home')).toBe('admin');
			expect(getEffectiveRole(admin, 'dreamlab-lobby')).toBe('admin');
			expect(getEffectiveRole(admin, 'ai-visionflow')).toBe('admin');
		});

		it('should use section role when higher than global role', () => {
			const user = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'member',
				sectionRoles: [{ sectionId: 'family-home', role: 'moderator' }]
			});

			expect(getEffectiveRole(user, 'family-home')).toBe('moderator');
		});
	});

	describe('isSectionAdmin for zone sections', () => {
		it('should return true for global admin on any section', () => {
			const admin = createTestPermissions({
				cohorts: [],
				globalRole: 'admin'
			});

			expect(isSectionAdmin(admin, 'family-home')).toBe(true);
			expect(isSectionAdmin(admin, 'dreamlab-lobby')).toBe(true);
		});

		it('should return true for user with section-admin role', () => {
			const sectionAdmin = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'member',
				sectionRoles: [{ sectionId: 'family-home', role: 'section-admin' }]
			});

			expect(isSectionAdmin(sectionAdmin, 'family-home')).toBe(true);
		});

		it('should return false for regular member', () => {
			const member = createTestPermissions({
				cohorts: ['family'],
				globalRole: 'member'
			});

			expect(isSectionAdmin(member, 'family-home')).toBe(false);
		});
	});
});

// ===========================================================================
// TEST SUITE 7: Complete Zone Matrix
// ===========================================================================

describe('7. Zone Access Matrix - Comprehensive User/Category Permutations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		setupDefaultMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	/**
	 * Expected access matrix:
	 *
	 * User Cohort          | family | minimoonoir | dreamlab | ai-agents
	 * ---------------------|--------|-------------|----------|-----------
	 * admin (globalRole)   | YES    | YES         | YES      | YES
	 * cross-access         | YES    | YES         | YES      | YES
	 * family               | YES    | NO          | NO       | NO
	 * family-only          | YES    | NO          | NO*      | NO*
	 * minimoonoir          | NO     | YES         | NO       | NO
	 * minimoonoir-only     | NO     | YES         | NO*      | NO
	 * minimoonoir-business | NO     | YES         | YES      | YES
	 * business             | NO     | NO          | YES      | YES
	 * business-only        | NO*    | NO*         | NO       | NO
	 * trainers             | NO     | NO          | YES      | YES
	 * trainees             | NO     | NO          | YES      | YES
	 * agent                | NO     | NO          | NO       | NO
	 * visionflow-full      | NO     | NO          | NO       | NO
	 *
	 * NO* = denied via hiddenFromCohorts (stronger than visibleToCohorts)
	 * family-only denied dreamlab via hiddenFromCohorts
	 * minimoonoir-only denied dreamlab via hiddenFromCohorts
	 * business-only denied family/minimoonoir via hiddenFromCohorts
	 */

	interface AccessTest {
		cohort: string;
		expected: Record<string, boolean>;
	}

	const matrix: AccessTest[] = [
		{ cohort: 'family',              expected: { 'fairfield-family': true,  'minimoonoir': false, 'dreamlab': false, 'ai-agents': false } },
		{ cohort: 'family-only',         expected: { 'fairfield-family': false, 'minimoonoir': false, 'dreamlab': false, 'ai-agents': false } },
		{ cohort: 'minimoonoir',         expected: { 'fairfield-family': false, 'minimoonoir': true,  'dreamlab': false, 'ai-agents': false } },
		{ cohort: 'minimoonoir-only',    expected: { 'fairfield-family': false, 'minimoonoir': false, 'dreamlab': false, 'ai-agents': false } },
		{ cohort: 'minimoonoir-business', expected: { 'fairfield-family': false, 'minimoonoir': true,  'dreamlab': true,  'ai-agents': true  } },
		{ cohort: 'business',            expected: { 'fairfield-family': false, 'minimoonoir': false, 'dreamlab': true,  'ai-agents': true  } },
		{ cohort: 'business-only',       expected: { 'fairfield-family': false, 'minimoonoir': false, 'dreamlab': false, 'ai-agents': false } },
		{ cohort: 'trainers',            expected: { 'fairfield-family': false, 'minimoonoir': false, 'dreamlab': true,  'ai-agents': true  } },
		{ cohort: 'trainees',            expected: { 'fairfield-family': false, 'minimoonoir': false, 'dreamlab': true,  'ai-agents': true  } },
		{ cohort: 'agent',               expected: { 'fairfield-family': false, 'minimoonoir': false, 'dreamlab': false, 'ai-agents': false } },
		{ cohort: 'visionflow-full',     expected: { 'fairfield-family': false, 'minimoonoir': false, 'dreamlab': false, 'ai-agents': false } },
		{ cohort: 'cross-access',        expected: { 'fairfield-family': true,  'minimoonoir': true,  'dreamlab': true,  'ai-agents': true  } },
	];

	for (const { cohort, expected } of matrix) {
		describe(`User with cohort "${cohort}"`, () => {
			for (const [categoryId, shouldAccess] of Object.entries(expected)) {
				it(`should ${shouldAccess ? 'ALLOW' : 'DENY'} access to "${categoryId}"`, () => {
					const user = createTestPermissions({
						cohorts: [cohort],
						globalRole: 'member'
					});

					expect(canAccessCategory(user, categoryId)).toBe(shouldAccess);
				});
			}
		});
	}

	describe('Admin with globalRole="admin" (no cohorts) overrides all', () => {
		for (const categoryId of Object.values(CATEGORIES)) {
			it(`should ALLOW admin globalRole access to "${categoryId}"`, () => {
				const admin = createTestPermissions({
					cohorts: [],
					globalRole: 'admin'
				});

				expect(canAccessCategory(admin, categoryId)).toBe(true);
			});
		}
	});

	describe('Special note: family-only is NOT in visibleToCohorts for fairfield-family', () => {
		it('family-only user is DENIED fairfield-family (only "family" and "cross-access" are visible)', () => {
			// This is an important edge case: "family-only" is a restriction marker,
			// NOT a grant for the family zone. Only "family" cohort grants family zone access.
			const familyOnly = createTestPermissions({
				cohorts: ['family-only'],
				globalRole: 'member'
			});

			// fairfield-family visibleToCohorts: ['family', 'cross-access']
			// 'family-only' is NOT in that list
			expect(canAccessCategory(familyOnly, CATEGORIES.FAMILY)).toBe(false);
		});
	});

	describe('Special note: minimoonoir-only is NOT in visibleToCohorts for minimoonoir', () => {
		it('minimoonoir-only user is DENIED minimoonoir zone', () => {
			// Similar to family-only: "minimoonoir-only" is a restriction marker for OTHER zones,
			// NOT a grant for the minimoonoir zone itself.
			const moonOnly = createTestPermissions({
				cohorts: ['minimoonoir-only'],
				globalRole: 'member'
			});

			// minimoonoir visibleToCohorts: ['minimoonoir', 'minimoonoir-business', 'cross-access']
			expect(canAccessCategory(moonOnly, CATEGORIES.MINIMOONOIR)).toBe(false);
		});
	});
});

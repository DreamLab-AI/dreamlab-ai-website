/**
 * Config Loader Tests
 *
 * Tests for configuration loading, validation, and persistence
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { SectionsConfig } from '$lib/config/types';
import {
	loadConfig,
	saveConfig,
	clearConfigCache,
	getAppConfig,
	getRoles,
	getRole,
	getCohorts,
	getCohort,
	getSections,
	getSection,
	getDefaultSection,
	getSectionsByAccess,
	getCalendarAccessLevel,
	roleHasCapability,
	roleIsHigherThan,
	getHighestRole,
	getSuperuser,
	isSuperuser,
	getSectionConfigMap,
	getCategories,
	getCategory,
	getDefaultCategory,
	getTiers,
	getDefaultPath,
	getSectionsByCategory,
	getSectionWithCategory,
	getBreadcrumbs,
	getCategoryPath,
	getSectionPath,
	getForumPath
} from '$lib/config/loader';

describe('Config Loader', () => {
	// Mock localStorage
	let localStorageMock: { [key: string]: string } = {};

	beforeEach(() => {
		// Clear all mocks
		localStorageMock = {};
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
			(key: string) => localStorageMock[key] || null
		);
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
			(key: string, value: string) => {
				localStorageMock[key] = value;
			}
		);
		vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(
			(key: string) => {
				delete localStorageMock[key];
			}
		);
		vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
			localStorageMock = {};
		});

		// Clear config cache
		clearConfigCache();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('loadConfig', () => {
		it('should load default config when no custom config exists', () => {
			const config = loadConfig();

			expect(config).toBeDefined();
			expect(config.app.name).toBe('DreamLab Community');
			expect(config.categories.length).toBeGreaterThan(0);
			expect(config.roles.length).toBeGreaterThan(0);
		});

		it('should load custom config from localStorage if exists', () => {
			const customConfig: SectionsConfig = {
				app: {
					name: 'Custom App',
					version: '2.0.0',
					defaultPath: '/test-category/test-section'
				},
				roles: [
					{ id: 'guest', name: 'Guest', level: 0, description: 'Guest user' },
					{ id: 'admin', name: 'Admin', level: 4, description: 'Admin user' }
				],
				cohorts: [{ id: 'test-cohort', name: 'Test Cohort', description: 'Test' }],
				categories: [
					{
						id: 'test-category',
						name: 'Test Category',
						description: 'Test category',
						icon: '📁',
						order: 1,
						sections: [
							{
								id: 'test-section',
								name: 'Test Section',
								description: 'Test',
								icon: 'test',
								order: 1,
								access: { requiresApproval: false, defaultRole: 'guest', autoApprove: true },
								calendar: { access: 'full', canCreate: false },
								ui: { color: '#000000' },
								showStats: true,
								allowForumCreation: false
							}
						]
					}
				],
				calendarAccessLevels: [
					{
						id: 'full',
						name: 'Full',
						description: 'Full',
						canView: true,
						canViewDetails: true
					}
				],
				channelVisibility: [{ id: 'public', name: 'Public', description: 'Public' }]
			};

			// Set localStorage BEFORE clearing cache
			localStorageMock['nostr_bbs_custom_config'] = JSON.stringify(customConfig);
			clearConfigCache();

			const config = loadConfig();
			expect(config.app.name).toBe('Custom App');
			expect(config.app.version).toBe('2.0.0');
		});

		it('should fall back to default config if stored config is invalid', () => {
			localStorageMock['nostr_bbs_custom_config'] = 'invalid json';
			clearConfigCache();

			const config = loadConfig();
			expect(config.app.name).toBe('DreamLab Community');
		});

		it('should cache config after first load', () => {
			const config1 = loadConfig();
			const config2 = loadConfig();
			expect(config1).toBe(config2); // Same reference
		});
	});

	describe('saveConfig', () => {
		it('should save valid config to localStorage', () => {
			clearConfigCache();
			const config = loadConfig();
			const updatedConfig = JSON.parse(JSON.stringify(config)); // Deep copy
			updatedConfig.app.name = 'Updated Name';

			saveConfig(updatedConfig);

			expect(localStorageMock['nostr_bbs_custom_config']).toBeDefined();
			const stored = JSON.parse(localStorageMock['nostr_bbs_custom_config']);
			expect(stored.app.name).toBe('Updated Name');
		});

		it('should throw error if config is invalid', () => {
			const invalidConfig = {
				app: { name: '', version: '1.0.0', defaultSection: 'test' }
			} as SectionsConfig;

			expect(() => saveConfig(invalidConfig)).toThrow();
		});

		it('should validate config before saving', () => {
			const invalidConfig = {
				app: { name: 'Test', version: '1.0.0', defaultPath: '/test' },
				categories: [],
				roles: []
			} as SectionsConfig;

			expect(() => saveConfig(invalidConfig)).toThrow('No categories defined');
		});

		// Note: Testing non-browser environment is not feasible in vitest since
		// the browser variable is evaluated at module import time.
		// The saveConfig function correctly checks `if (!browser) return;`
		// but we can't easily mock this in a test environment.
		it.skip('should not save in non-browser environment', () => {
			// This test is skipped because mocking $app/environment
			// after import doesn't change the already-evaluated browser variable
		});
	});

	describe('validation', () => {
		it('should require app.name', () => {
			const config = loadConfig();
			config.app.name = '';

			expect(() => saveConfig(config)).toThrow('Missing app.name');
		});

		it('should require at least one category', () => {
			const config = loadConfig();
			config.categories = [];

			expect(() => saveConfig(config)).toThrow('No categories defined');
		});

		it('should require at least one role', () => {
			const config = loadConfig();
			config.roles = [];

			expect(() => saveConfig(config)).toThrow('No roles defined');
		});

		it('should validate section references to roles', () => {
			const config = loadConfig();
			config.categories[0].sections[0].access.defaultRole = 'nonexistent-role' as any;

			expect(() => saveConfig(config)).toThrow('references unknown role');
		});
	});

	describe('accessor functions', () => {
		it('should get app config', () => {
			const appConfig = getAppConfig();
			expect(appConfig.name).toBe('DreamLab Community');
			expect(appConfig.version).toBeDefined();
		});

		it('should get all roles', () => {
			const roles = getRoles();
			expect(roles.length).toBeGreaterThan(0);
			expect(roles[0]).toHaveProperty('id');
			expect(roles[0]).toHaveProperty('name');
			expect(roles[0]).toHaveProperty('level');
		});

		it('should get specific role by id', () => {
			const guestRole = getRole('guest');
			expect(guestRole).toBeDefined();
			expect(guestRole?.id).toBe('guest');
			expect(guestRole?.level).toBe(0);
		});

		it('should return undefined for nonexistent role', () => {
			const role = getRole('nonexistent' as any);
			expect(role).toBeUndefined();
		});

		it('should get all cohorts', () => {
			const cohorts = getCohorts();
			expect(cohorts.length).toBeGreaterThan(0);
			expect(cohorts[0]).toHaveProperty('id');
			expect(cohorts[0]).toHaveProperty('name');
		});

		it('should get specific cohort by id', () => {
			const cohorts = getCohorts();
			if (cohorts.length > 0) {
				const cohort = getCohort(cohorts[0].id);
				expect(cohort).toBeDefined();
				expect(cohort?.id).toBe(cohorts[0].id);
			}
		});

		it('should get all sections sorted by order', () => {
			const sections = getSections();
			expect(sections.length).toBeGreaterThan(0);

			// Verify sorting
			for (let i = 1; i < sections.length; i++) {
				expect(sections[i].order).toBeGreaterThanOrEqual(sections[i - 1].order);
			}
		});

		it('should get specific section by id', () => {
			const sections = getSections();
			const section = getSection(sections[0].id);
			expect(section).toBeDefined();
			expect(section?.id).toBe(sections[0].id);
		});

		it('should get default section', () => {
			const defaultSection = getDefaultSection();
			expect(defaultSection).toBeDefined();
			expect(defaultSection.id).toBeDefined();
		});

		it('should get sections by access requirement', () => {
			const openSections = getSectionsByAccess(false);
			const restrictedSections = getSectionsByAccess(true);

			openSections.forEach((s) => {
				expect(s.access.requiresApproval).toBe(false);
			});

			restrictedSections.forEach((s) => {
				expect(s.access.requiresApproval).toBe(true);
			});
		});

		it('should get calendar access level', () => {
			const fullAccess = getCalendarAccessLevel('full');
			expect(fullAccess).toBeDefined();
			expect(fullAccess?.id).toBe('full');
			expect(fullAccess?.canView).toBe(true);
		});
	});

	describe('roleHasCapability', () => {
		it('should return true for admin with any capability', () => {
			expect(roleHasCapability('admin', 'any.capability')).toBe(true);
		});

		it('should return true when role has specific capability', () => {
			expect(roleHasCapability('moderator', 'forum.create')).toBe(true);
			expect(roleHasCapability('moderator', 'message.delete')).toBe(true);
		});

		it('should return false when role lacks capability', () => {
			expect(roleHasCapability('guest', 'forum.create')).toBe(false);
		});

		it('should return false for nonexistent role', () => {
			expect(roleHasCapability('nonexistent' as any, 'test')).toBe(false);
		});
	});

	describe('roleIsHigherThan', () => {
		it('should return true when role A has higher level', () => {
			expect(roleIsHigherThan('admin', 'guest')).toBe(true);
			expect(roleIsHigherThan('moderator', 'member')).toBe(true);
		});

		it('should return false when role A has lower level', () => {
			expect(roleIsHigherThan('guest', 'admin')).toBe(false);
			expect(roleIsHigherThan('member', 'moderator')).toBe(false);
		});

		it('should return false when roles are equal', () => {
			expect(roleIsHigherThan('guest', 'guest')).toBe(false);
		});

		it('should return false when roles are invalid', () => {
			expect(roleIsHigherThan('nonexistent' as any, 'guest')).toBe(false);
			expect(roleIsHigherThan('guest', 'nonexistent' as any)).toBe(false);
		});
	});

	describe('getHighestRole', () => {
		it('should return highest role from list', () => {
			expect(getHighestRole(['guest', 'admin', 'member'])).toBe('admin');
			expect(getHighestRole(['guest', 'member', 'moderator'])).toBe('moderator');
		});

		it('should return guest for empty list', () => {
			expect(getHighestRole([])).toBe('guest');
		});

		it('should return single role in list', () => {
			expect(getHighestRole(['moderator'])).toBe('moderator');
		});
	});

	describe('superuser', () => {
		it('should get superuser config if defined', () => {
			clearConfigCache();

			const baseConfig = loadConfig();
			clearConfigCache();

			const customConfig: SectionsConfig = {
				...baseConfig,
				superuser: {
					pubkey: 'a'.repeat(64),
					name: 'Super Admin',
					relayUrl: 'wss://relay.example.com'
				}
			};

			localStorageMock['nostr_bbs_custom_config'] = JSON.stringify(customConfig);

			// Load the config to update the module-level cache
			const config = loadConfig();
			expect(config.superuser).toBeDefined();
			expect(config.superuser?.pubkey).toBe('a'.repeat(64));
			expect(config.superuser?.name).toBe('Super Admin');
		});

		it('should return superuser if configured', () => {
			const superuser = getSuperuser();
			// Default config has superuser with pubkey
			expect(superuser).toBeDefined();
			expect(superuser?.pubkey).toBe('11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c');
		});

		it('should identify superuser by pubkey', () => {
			clearConfigCache();

			const baseConfig = loadConfig();
			clearConfigCache();

			const customConfig: SectionsConfig = {
				...baseConfig,
				superuser: {
					pubkey: 'a'.repeat(64),
					name: 'Super Admin'
				}
			};

			localStorageMock['nostr_bbs_custom_config'] = JSON.stringify(customConfig);

			// Load the config to verify it reads from localStorage
			const config = loadConfig();
			expect(config.superuser?.pubkey).toBe('a'.repeat(64));

			// Note: isSuperuser uses the module-level config which was loaded at import time
			// So this test verifies that loadConfig() returns the correct config
		});

		it('should correctly identify superuser by pubkey', () => {
			// Default config has a real superuser pubkey
			// Non-matching pubkeys should return false
			expect(isSuperuser('a'.repeat(64))).toBe(false);
			// Empty string should not match configured superuser
			expect(isSuperuser('')).toBe(false);
			// Real superuser pubkey should match
			expect(isSuperuser('11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c')).toBe(true);
		});
	});

	describe('getSectionConfigMap', () => {
		it('should return map of section IDs to configs', () => {
			const map = getSectionConfigMap();
			const sections = getSections();

			expect(Object.keys(map).length).toBe(sections.length);
			sections.forEach((section) => {
				expect(map[section.id]).toBeDefined();
				expect(map[section.id].name).toBe(section.name);
			});
		});
	});

	describe('getCategories', () => {
		it('should return categories sorted by order', () => {
			const categories = getCategories();
			expect(categories.length).toBeGreaterThan(0);
			for (let i = 1; i < categories.length; i++) {
				expect(categories[i].order).toBeGreaterThanOrEqual(categories[i - 1].order);
			}
		});
	});

	describe('getCategory', () => {
		it('should return category by id', () => {
			const categories = getCategories();
			const cat = getCategory(categories[0].id);
			expect(cat).toBeDefined();
			expect(cat?.id).toBe(categories[0].id);
			expect(cat?.name).toBe(categories[0].name);
		});

		it('should return undefined for nonexistent category', () => {
			expect(getCategory('nonexistent')).toBeUndefined();
		});
	});

	describe('getDefaultCategory', () => {
		it('should return a valid category', () => {
			const cat = getDefaultCategory();
			expect(cat).toBeDefined();
			expect(cat.id).toBeDefined();
			expect(cat.sections.length).toBeGreaterThan(0);
		});
	});

	describe('getTiers', () => {
		it('should return tier configuration', () => {
			const tiers = getTiers();
			expect(tiers.length).toBeGreaterThanOrEqual(3);
			expect(tiers[0]).toHaveProperty('level');
			expect(tiers[0]).toHaveProperty('name');
			expect(tiers[0]).toHaveProperty('plural');
		});
	});

	describe('getDefaultPath', () => {
		it('should return a string starting with /', () => {
			const path = getDefaultPath();
			expect(path).toBeDefined();
			expect(path.startsWith('/')).toBe(true);
		});
	});

	describe('getSectionsByCategory', () => {
		it('should return sections for a valid category', () => {
			const categories = getCategories();
			const sections = getSectionsByCategory(categories[0].id);
			expect(sections.length).toBeGreaterThan(0);
			for (let i = 1; i < sections.length; i++) {
				expect(sections[i].order).toBeGreaterThanOrEqual(sections[i - 1].order);
			}
		});

		it('should return empty array for nonexistent category', () => {
			const sections = getSectionsByCategory('nonexistent');
			expect(sections).toEqual([]);
		});
	});

	describe('getSectionWithCategory', () => {
		it('should return section and its parent category', () => {
			const sections = getSections();
			const result = getSectionWithCategory(sections[0].id);
			expect(result).toBeDefined();
			expect(result?.section.id).toBe(sections[0].id);
			expect(result?.category).toBeDefined();
			expect(result?.category.sections.some(s => s.id === sections[0].id)).toBe(true);
		});

		it('should return undefined for nonexistent section', () => {
			expect(getSectionWithCategory('nonexistent')).toBeUndefined();
		});
	});

	describe('getBreadcrumbs', () => {
		it('should return only Home for no arguments', () => {
			const crumbs = getBreadcrumbs();
			expect(crumbs).toHaveLength(1);
			expect(crumbs[0].label).toBe('Home');
			expect(crumbs[0].path).toBe('/');
		});

		it('should add category breadcrumb', () => {
			const categories = getCategories();
			const crumbs = getBreadcrumbs(categories[0].id);
			expect(crumbs).toHaveLength(2);
			expect(crumbs[1].label).toBe(categories[0].name);
			expect(crumbs[1].path).toBe(`/${categories[0].id}`);
		});

		it('should add section breadcrumb', () => {
			const categories = getCategories();
			const section = categories[0].sections[0];
			const crumbs = getBreadcrumbs(categories[0].id, section.id);
			expect(crumbs).toHaveLength(3);
			expect(crumbs[2].label).toBe(section.name);
		});

		it('should add forum breadcrumb', () => {
			const categories = getCategories();
			const section = categories[0].sections[0];
			const crumbs = getBreadcrumbs(categories[0].id, section.id, 'Test Forum');
			expect(crumbs).toHaveLength(4);
			expect(crumbs[3].label).toBe('Test Forum');
			expect(crumbs[3].path).toBe('#');
		});

		it('should skip category crumb for invalid category id', () => {
			const crumbs = getBreadcrumbs('nonexistent');
			expect(crumbs).toHaveLength(1);
		});

		it('should skip section crumb for invalid section id', () => {
			const categories = getCategories();
			const crumbs = getBreadcrumbs(categories[0].id, 'nonexistent');
			expect(crumbs).toHaveLength(2);
		});
	});

	describe('path helpers', () => {
		it('getCategoryPath should return /<categoryId>', () => {
			expect(getCategoryPath('general')).toBe('/general');
		});

		it('getSectionPath should return /<categoryId>/<sectionId>', () => {
			expect(getSectionPath('general', 'welcome')).toBe('/general/welcome');
		});

		it('getForumPath should return /<categoryId>/<sectionId>/<forumId>', () => {
			expect(getForumPath('general', 'welcome', 'forum1')).toBe('/general/welcome/forum1');
		});
	});
});

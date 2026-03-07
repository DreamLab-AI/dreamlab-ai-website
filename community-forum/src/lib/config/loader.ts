/**
 * Configuration Loader
 * Loads and parses YAML configuration for 3-tier BBS hierarchy
 * Category -> Section -> Forum (NIP-28 Channel)
 *
 * Uses a Svelte writable store for reactivity. Runtime mutations
 * via saveConfig() propagate to all derived constants and getter
 * functions automatically.
 */

import type {
	BBSConfig,
	SectionsConfig,
	CategoryConfig,
	SectionConfig,
	RoleConfig,
	CohortConfig,
	CalendarAccessLevel,
	RoleId,
	CategoryId,
	SectionId,
	CohortId,
	SuperuserConfig,
	TierConfig
} from './types';

import { writable, derived, get } from 'svelte/store';
import { parse as parseYaml } from 'yaml';
import { browser } from '$app/environment';

// Import default YAML config at build time
import defaultConfigYaml from '../../../config/sections.yaml?raw';

const STORAGE_KEY = 'nostr_bbs_custom_config';

let cachedConfig: BBSConfig | null = null;

/** Whether configStore has been initialized (prevents circular ref during module init) */
let storeInitialized = false;

/**
 * Read config from localStorage / YAML without caching.
 * Used internally by clearConfigCache() to refresh the store
 * without polluting the cache.
 */
function readConfigFresh(): BBSConfig {
	if (browser) {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const customConfig = JSON.parse(stored) as BBSConfig;
				validateConfig(customConfig);
				return customConfig;
			}
		} catch {
			// fall through to default
		}
	}
	try {
		const parsed = parseYaml(defaultConfigYaml) as BBSConfig;
		validateConfig(parsed);
		return parsed;
	} catch {
		return getDefaultConfig();
	}
}

/**
 * Load and parse the BBS configuration.
 * Caches the result so subsequent calls return the same reference
 * until clearConfigCache() is called.
 * Also updates the reactive configStore so that Svelte-derived values
 * stay in sync whenever a fresh config is loaded.
 */
export function loadConfig(): BBSConfig {
	if (cachedConfig) {
		return cachedConfig;
	}

	cachedConfig = readConfigFresh();
	if (storeInitialized) {
		configStore.set(cachedConfig);
	}
	return cachedConfig;
}

// ============================================================================
// REACTIVE CONFIG STORE
// ============================================================================

/** Reactive config store - all getter functions read from this */
export const configStore = writable<BBSConfig>(loadConfig());
storeInitialized = true;

/**
 * Save custom configuration to localStorage and update the reactive store
 */
export function saveConfig(config: BBSConfig): void {
	if (!browser) return;

	try {
		validateConfig(config);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
		cachedConfig = config;
		configStore.set(config);
	} catch (error) {
		console.error('[Config] Failed to save configuration:', error);
		throw error;
	}
}

/**
 * Clear cached config and refresh the reactive store.
 * The store is updated immediately with a fresh read from
 * localStorage / YAML, but the result is NOT cached so that
 * subsequent calls to loadConfig() will read fresh again
 * (useful when localStorage changes between clear and load).
 */
export function clearConfigCache(): void {
	cachedConfig = null;
	if (storeInitialized) {
		configStore.set(readConfigFresh());
	}
}

/**
 * Validate configuration structure
 */
function validateConfig(config: BBSConfig): void {
	if (!config.app?.name) {
		throw new Error('Missing app.name in configuration');
	}
	if (!config.categories?.length) {
		throw new Error('No categories defined in configuration');
	}
	if (!config.roles?.length) {
		throw new Error('No roles defined in configuration');
	}

	// Validate role references in sections
	const roleIds = new Set(config.roles.map((r) => r.id));
	for (const category of config.categories) {
		for (const section of category.sections) {
			if (!roleIds.has(section.access.defaultRole)) {
				throw new Error(
					`Section ${section.id} references unknown role: ${section.access.defaultRole}`
				);
			}
		}
	}
}

/**
 * Get default configuration (fallback)
 * Generic BBS configuration - customize via config/sections.yaml
 */
function getDefaultConfig(): BBSConfig {
	return {
		app: {
			name: 'Nostr BBS',
			version: '2.0.0',
			defaultPath: '/general/welcome',
			tiers: [
				{ level: 1, name: 'Category', plural: 'Categories' },
				{ level: 2, name: 'Section', plural: 'Sections' },
				{ level: 3, name: 'Forum', plural: 'Forums' }
			]
		},
		roles: [
			{ id: 'guest', name: 'Guest', level: 0, description: 'Basic authenticated user' },
			{ id: 'member', name: 'Member', level: 1, description: 'Approved section member' },
			{
				id: 'moderator',
				name: 'Moderator',
				level: 2,
				description: 'Can manage forums and moderate',
				capabilities: ['forum.create', 'forum.lock', 'message.pin', 'message.delete']
			},
			{
				id: 'section-admin',
				name: 'Section Admin',
				level: 3,
				description: 'Section administrator',
				capabilities: ['section.manage', 'member.approve', 'member.remove', 'forum.create', 'forum.delete', 'message.pin', 'message.delete']
			},
			{
				id: 'admin',
				name: 'Admin',
				level: 4,
				description: 'Global administrator',
				capabilities: ['admin.global', 'category.create', 'category.delete', 'section.create', 'section.delete', 'section.manage', 'member.approve', 'member.remove', 'forum.create', 'forum.delete', 'message.pin', 'message.delete', 'user.whitelist']
			}
		],
		cohorts: [
			{ id: 'admin', name: 'Administrators', description: 'Global administrators' },
			{ id: 'approved', name: 'Approved Users', description: 'Manually approved' },
			{ id: 'members', name: 'Community Members', description: 'Core community members' }
		],
		categories: [
			{
				id: 'general',
				name: 'General',
				description: 'Public discussion areas',
				icon: '\u{1F4AC}',
				order: 1,
				sections: [
					{
						id: 'welcome',
						name: 'Welcome',
						description: 'Welcome area for new visitors',
						icon: '\u{1F44B}',
						order: 1,
						access: { requiresApproval: false, defaultRole: 'guest', autoApprove: true },
						calendar: { access: 'full', canCreate: false },
						ui: { color: '#6366f1' },
						showStats: true,
						allowForumCreation: false
					},
					{
						id: 'announcements',
						name: 'Announcements',
						description: 'Official news and updates',
						icon: '\u{1F4E2}',
						order: 2,
						access: { requiresApproval: false, defaultRole: 'guest', autoApprove: true },
						calendar: { access: 'full', canCreate: false },
						ui: { color: '#f59e0b' },
						showStats: true,
						allowForumCreation: false
					},
					{
						id: 'help',
						name: 'Help & Support',
						description: 'Get help with using the platform',
						icon: '\u{2753}',
						order: 3,
						access: { requiresApproval: false, defaultRole: 'guest', autoApprove: true },
						calendar: { access: 'none', canCreate: false },
						ui: { color: '#10b981' },
						showStats: true,
						allowForumCreation: false
					}
				]
			},
			{
				id: 'community',
				name: 'Community',
				description: 'Members-only discussion spaces',
				icon: '\u{1F31F}',
				order: 2,
				sections: [
					{
						id: 'discussions',
						name: 'Discussions',
						description: 'General member discussions',
						icon: '\u{1F4AD}',
						order: 1,
						access: { requiresApproval: true, defaultRole: 'member', autoApprove: false },
						calendar: { access: 'full', canCreate: true },
						ui: { color: '#8b5cf6' },
						showStats: true,
						allowForumCreation: true
					},
					{
						id: 'introductions',
						name: 'Introductions',
						description: 'Introduce yourself',
						icon: '\u{1F64B}',
						order: 2,
						access: { requiresApproval: true, defaultRole: 'member', autoApprove: false },
						calendar: { access: 'none', canCreate: false },
						ui: { color: '#06b6d4' },
						showStats: true,
						allowForumCreation: false
					},
					{
						id: 'events',
						name: 'Events',
						description: 'Community events and meetups',
						icon: '\u{1F4C5}',
						order: 3,
						access: { requiresApproval: true, defaultRole: 'member', autoApprove: false },
						calendar: { access: 'full', canCreate: true },
						ui: { color: '#ec4899' },
						showStats: true,
						allowForumCreation: true
					}
				]
			},
			{
				id: 'projects',
				name: 'Projects',
				description: 'Collaborative project spaces',
				icon: '\u{1F680}',
				order: 3,
				sections: [
					{
						id: 'active-projects',
						name: 'Active Projects',
						description: 'Currently active project discussions',
						icon: '\u{1F4A1}',
						order: 1,
						access: { requiresApproval: true, defaultRole: 'member', autoApprove: false },
						calendar: { access: 'availability', canCreate: true, cohortRestricted: true },
						ui: { color: '#ec4899' },
						showStats: true,
						allowForumCreation: true
					},
					{
						id: 'resources',
						name: 'Resources',
						description: 'Shared files and documentation',
						icon: '\u{1F4DA}',
						order: 2,
						access: { requiresApproval: true, defaultRole: 'member', autoApprove: false },
						calendar: { access: 'none', canCreate: false },
						ui: { color: '#84cc16' },
						showStats: false,
						allowForumCreation: false
					}
				]
			}
		],
		calendarAccessLevels: [
			{ id: 'full', name: 'Full Access', description: 'All details visible', canView: true, canViewDetails: true },
			{ id: 'availability', name: 'Availability Only', description: 'Dates only', canView: true, canViewDetails: false },
			{ id: 'cohort', name: 'Cohort Restricted', description: 'Cohort match required', canView: true, canViewDetails: 'cohort-match' },
			{ id: 'none', name: 'No Access', description: 'Hidden', canView: false, canViewDetails: false }
		],
		channelVisibility: [
			{ id: 'public', name: 'Public', description: 'All section members' },
			{ id: 'cohort', name: 'Cohort Only', description: 'Assigned cohorts' },
			{ id: 'invite', name: 'Invite Only', description: 'Explicit invites' }
		]
	};
}

// ============================================================================
// APP CONFIG
// ============================================================================

export function getAppConfig() {
	return get(configStore).app;
}

export function getTiers(): TierConfig[] {
	const cfg = get(configStore);
	return cfg.app.tiers || [
		{ level: 1, name: 'Category', plural: 'Categories' },
		{ level: 2, name: 'Section', plural: 'Sections' },
		{ level: 3, name: 'Forum', plural: 'Forums' }
	];
}

export function getDefaultPath(): string {
	return get(configStore).app.defaultPath || '/general/welcome';
}

// ============================================================================
// CATEGORIES (Tier 1)
// ============================================================================

export function getCategories(): CategoryConfig[] {
	return get(configStore).categories.sort((a, b) => a.order - b.order);
}

export function getCategory(categoryId: CategoryId): CategoryConfig | undefined {
	return get(configStore).categories.find((c) => c.id === categoryId);
}

export function getDefaultCategory(): CategoryConfig {
	const cfg = get(configStore);
	const defaultPath = cfg.app.defaultPath || '/general/welcome';
	const categoryId = defaultPath.split('/')[1];
	return getCategory(categoryId) || cfg.categories[0];
}

// ============================================================================
// SECTIONS (Tier 2)
// ============================================================================

export function getSections(): SectionConfig[] {
	const cfg = get(configStore);
	return cfg.categories
		.flatMap((cat) => cat.sections.map((sec) => ({ ...sec, _categoryId: cat.id })))
		.sort((a, b) => a.order - b.order);
}

export function getSectionsByCategory(categoryId: CategoryId): SectionConfig[] {
	const category = getCategory(categoryId);
	if (!category) return [];
	return category.sections.sort((a, b) => a.order - b.order);
}

export function getSection(sectionId: SectionId): SectionConfig | undefined {
	const cfg = get(configStore);
	for (const category of cfg.categories) {
		const section = category.sections.find((s) => s.id === sectionId);
		if (section) return section;
	}
	return undefined;
}

export function getSectionWithCategory(sectionId: SectionId): { section: SectionConfig; category: CategoryConfig } | undefined {
	const cfg = get(configStore);
	for (const category of cfg.categories) {
		const section = category.sections.find((s) => s.id === sectionId);
		if (section) return { section, category };
	}
	return undefined;
}

export function getDefaultSection(): SectionConfig {
	const cfg = get(configStore);
	const defaultPath = cfg.app.defaultPath || '/general/welcome';
	const parts = defaultPath.split('/').filter(Boolean);
	if (parts.length >= 2) {
		const section = getSection(parts[1]);
		if (section) return section;
	}
	return cfg.categories[0]?.sections[0];
}

export function getSectionsByAccess(requiresApproval: boolean): SectionConfig[] {
	return getSections().filter((s) => s.access.requiresApproval === requiresApproval);
}

// ============================================================================
// ROLES
// ============================================================================

export function getRoles(): RoleConfig[] {
	return get(configStore).roles;
}

export function getRole(roleId: RoleId): RoleConfig | undefined {
	return get(configStore).roles.find((r) => r.id === roleId);
}

export function roleHasCapability(roleId: RoleId, capability: string): boolean {
	const role = getRole(roleId);
	if (!role) return false;
	if (role.id === 'admin') return true;
	return role.capabilities?.includes(capability) ?? false;
}

export function roleIsHigherThan(roleA: RoleId, roleB: RoleId): boolean {
	const a = getRole(roleA);
	const b = getRole(roleB);
	if (!a || !b) return false;
	return a.level > b.level;
}

export function getHighestRole(roles: RoleId[]): RoleId {
	if (roles.length === 0) return 'guest';
	return roles.reduce((highest, current) => {
		return roleIsHigherThan(current, highest) ? current : highest;
	}, roles[0]);
}

// ============================================================================
// COHORTS
// ============================================================================

export function getCohorts(): CohortConfig[] {
	return get(configStore).cohorts;
}

export function getCohort(cohortId: CohortId): CohortConfig | undefined {
	return get(configStore).cohorts.find((c) => c.id === cohortId);
}

// ============================================================================
// CALENDAR
// ============================================================================

export function getCalendarAccessLevel(level: CalendarAccessLevel) {
	return get(configStore).calendarAccessLevels?.find((l) => l.id === level);
}

// ============================================================================
// SUPERUSER
// ============================================================================

export function getSuperuser(): SuperuserConfig | undefined {
	return get(configStore).superuser;
}

export function isSuperuser(pubkey: string): boolean {
	return get(configStore).superuser?.pubkey === pubkey;
}

// ============================================================================
// NAVIGATION HELPERS
// ============================================================================

import type { BreadcrumbItem } from './types';

export function getBreadcrumbs(categoryId?: CategoryId, sectionId?: SectionId, forumName?: string): BreadcrumbItem[] {
	const crumbs: BreadcrumbItem[] = [
		{ label: 'Home', path: '/', icon: '\u{1F3E0}' }
	];

	if (categoryId) {
		const category = getCategory(categoryId);
		if (category) {
			crumbs.push({
				label: category.name,
				path: `/${categoryId}`,
				icon: category.icon
			});
		}
	}

	if (sectionId) {
		const section = getSection(sectionId);
		if (section) {
			crumbs.push({
				label: section.name,
				path: `/${categoryId}/${sectionId}`,
				icon: section.icon
			});
		}
	}

	if (forumName) {
		crumbs.push({
			label: forumName,
			path: '#',
			icon: '\u{1F4AC}'
		});
	}

	return crumbs;
}

export function getCategoryPath(categoryId: CategoryId): string {
	return `/${categoryId}`;
}

export function getSectionPath(categoryId: CategoryId, sectionId: SectionId): string {
	return `/${categoryId}/${sectionId}`;
}

export function getForumPath(categoryId: CategoryId, sectionId: SectionId, forumId: string): string {
	return `/${categoryId}/${sectionId}/${forumId}`;
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

// For code that still uses SECTION_CONFIG map
export function getSectionConfigMap(): Record<string, SectionConfig> {
	const map: Record<string, SectionConfig> = {};
	for (const section of getSections()) {
		map[section.id] = section;
	}
	return map;
}

/**
 * SECTION_CONFIG as a derived store: automatically recalculates when
 * configStore changes (e.g. after saveConfig()).
 *
 * Components that use `$SECTION_CONFIG[sectionId]` in Svelte templates
 * will reactively update. Imperative code that needs the current value
 * synchronously can use `get(SECTION_CONFIG)` or call `getSectionConfigMap()`.
 */
export const SECTION_CONFIG = derived(configStore, ($config) => {
	const map: Record<string, SectionConfig> = {};
	for (const category of $config.categories) {
		for (const section of category.sections) {
			map[section.id] = section;
		}
	}
	return map;
});

// Export type aliases
export type { SectionId as ChannelSection } from './types';

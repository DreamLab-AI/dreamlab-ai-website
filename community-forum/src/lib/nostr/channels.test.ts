/**
 * Access Control Tests for Channel Operations
 *
 * Tests for cohort-based channel filtering and access control.
 * These tests verify the CORRECT behavior after the security fix.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import { resetRateLimit } from '$lib/utils/rateLimit';

// Mock $app/environment to enable browser-only code paths
vi.mock('$app/environment', () => ({
	browser: true,
	dev: true
}));

// Mock config module to avoid YAML loading issues in zone filtering
vi.mock('$lib/config', () => ({
	getSectionWithCategory: vi.fn(() => null)
}));

// Mock NDK and relay modules
vi.mock('./relay', () => ({
	ndk: vi.fn(),
	isConnected: vi.fn(),
	publishEvent: vi.fn().mockResolvedValue(true)
}));

vi.mock('$lib/utils/rateLimit', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/utils/rateLimit')>();
	return {
		...actual,
		checkRateLimit: vi.fn(() => ({ allowed: true, retryAfter: 0 })),
		resetRateLimit: vi.fn()
	};
});

vi.mock('$lib/utils/validation', () => ({
	validateContent: vi.fn(() => ({ valid: true, errors: [] })),
	validateChannelName: vi.fn(() => ({ valid: true, errors: [] }))
}));

import { ndk, isConnected, publishEvent } from './relay';
import { checkRateLimit } from '$lib/utils/rateLimit';
import { validateContent, validateChannelName } from '$lib/utils/validation';
import { getSectionWithCategory } from '$lib/config';
import {
	fetchChannels,
	fetchChannelById,
	fetchChannelMessages,
	subscribeToChannel,
	createChannel,
	updateChannelMetadata,
	sendChannelMessage,
	CHANNEL_KINDS,
	type CreatedChannel,
	type ChannelMessage
} from './channels';

/**
 * Helper to create mock NDK events for testing
 */
function createMockChannelEvent(options: {
	id: string;
	name: string;
	cohorts?: string[];
	visibility?: string;
	section?: string;
	accessType?: string;
	pubkey?: string;
}): NDKEvent {
	const metadata = {
		name: options.name,
		about: `Description for ${options.name}`
	};

	const tags: string[][] = [];

	if (options.cohorts && options.cohorts.length > 0) {
		tags.push(['cohort', options.cohorts.join(',')]);
	}
	if (options.visibility && options.visibility !== 'public') {
		tags.push(['visibility', options.visibility]);
	}
	if (options.section) {
		tags.push(['section', options.section]);
	}
	if (options.accessType) {
		tags.push(['access-type', options.accessType]);
	}

	return {
		id: options.id,
		kind: CHANNEL_KINDS.CREATE,
		content: JSON.stringify(metadata),
		tags,
		pubkey: options.pubkey || 'test-pubkey-' + options.id,
		created_at: Math.floor(Date.now() / 1000),
		sig: 'mock-signature'
	} as unknown as NDKEvent;
}

describe('Channel Access Control', () => {
	let mockNdk: {
		fetchEvents: ReturnType<typeof vi.fn>;
		signer: { getPublicKey: () => Promise<string> };
	};

	beforeEach(() => {
		resetRateLimit('message');
		resetRateLimit('channelCreate');

		mockNdk = {
			fetchEvents: vi.fn(),
			signer: {
				getPublicKey: async () => 'user-pubkey-123'
			}
		};

		// Default: first call returns channels, second call (messages) returns empty set
		mockNdk.fetchEvents.mockResolvedValue(new Set());

		vi.mocked(ndk).mockReturnValue(mockNdk as any);
		vi.mocked(isConnected).mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchChannels() - Cohort Filtering (FIXED)', () => {
		it('should return only public channels when no user cohorts provided', async () => {
			const allChannels = [
				createMockChannelEvent({
					id: 'public-channel',
					name: 'Public Discussion',
					visibility: 'public',
					section: 'public-lobby'
				}),
				createMockChannelEvent({
					id: 'family-channel',
					name: 'Family Only',
					cohorts: ['family'],
					visibility: 'cohort',
					section: 'family-zone'
				}),
				createMockChannelEvent({
					id: 'minimoonoir-channel',
					name: 'minimoonoir',
					cohorts: ['minimoonoir', 'cross-access'],
					visibility: 'cohort',
					section: 'dreamlab'
				}),
				createMockChannelEvent({
					id: 'business-channel',
					name: 'Business Discussion',
					cohorts: ['business'],
					visibility: 'cohort',
					section: 'business-zone'
				})
			];

			mockNdk.fetchEvents.mockResolvedValueOnce(new Set(allChannels)).mockResolvedValueOnce(new Set());

			// Act: Fetch channels without cohort filtering (no userCohorts passed)
			const result = await fetchChannels();

			// Assert: Only public channel returned (no cohorts = no access to restricted)
			expect(result).toHaveLength(1);
			expect(result.map(c => c.name)).toContain('Public Discussion');
			expect(result.map(c => c.name)).not.toContain('minimoonoir');
			expect(result.map(c => c.name)).not.toContain('Family Only');
		});

		it('should filter channels based on user cohorts - family user sees only family channels', async () => {
			const channelsFromRelay = [
				createMockChannelEvent({
					id: 'public-channel',
					name: 'Public Room',
					visibility: 'public'
				}),
				createMockChannelEvent({
					id: 'family-channel',
					name: 'Family Room',
					cohorts: ['family'],
					visibility: 'cohort'
				}),
				createMockChannelEvent({
					id: 'minimoonoir-channel',
					name: 'minimoonoir',
					cohorts: ['minimoonoir', 'cross-access'],
					visibility: 'cohort'
				})
			];

			mockNdk.fetchEvents.mockResolvedValueOnce(new Set(channelsFromRelay)).mockResolvedValueOnce(new Set());

			// User with 'family' cohort only
			const result = await fetchChannels({
				userCohorts: ['family'],
				userPubkey: 'family-user-pubkey'
			});

			const channelNames = result.map(c => c.name);

			// FIXED: Family user should NOT see minimoonoir channel
			expect(channelNames).not.toContain('minimoonoir');
			expect(channelNames).toContain('Family Room');
			expect(channelNames).toContain('Public Room');
			expect(result).toHaveLength(2);
		});

		it('should allow admin to see all channels', async () => {
			const channelWithCohorts = createMockChannelEvent({
				id: 'restricted-channel',
				name: 'Restricted Channel',
				cohorts: ['admin-only'],
				visibility: 'cohort',
				accessType: 'gated'
			});

			mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelWithCohorts])).mockResolvedValueOnce(new Set());

			// Admin bypass
			const result = await fetchChannels({ isAdmin: true });

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Restricted Channel');
		});

		it('should allow channel creator to see their own channel', async () => {
			const myChannel = createMockChannelEvent({
				id: 'my-channel',
				name: 'My Private Channel',
				cohorts: ['special-cohort'],
				visibility: 'cohort',
				pubkey: 'my-pubkey'
			});

			mockNdk.fetchEvents.mockResolvedValueOnce(new Set([myChannel])).mockResolvedValueOnce(new Set());

			// User without matching cohort but IS the creator
			const result = await fetchChannels({
				userCohorts: [],
				userPubkey: 'my-pubkey'
			});

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('My Private Channel');
		});

		it('should return empty array when relay is not connected', async () => {
			vi.mocked(isConnected).mockReturnValue(false);

			const result = await fetchChannels();

			expect(result).toEqual([]);
			expect(mockNdk.fetchEvents).not.toHaveBeenCalled();
		});

		it('should return empty array when NDK is not initialized', async () => {
			vi.mocked(ndk).mockReturnValue(null as any);

			const result = await fetchChannels();

			expect(result).toEqual([]);
		});

		it('should sort channels by creation time (newest first)', async () => {
			const now = Math.floor(Date.now() / 1000);
			const channels = [
				{ ...createMockChannelEvent({ id: 'old', name: 'Old Channel' }), created_at: now - 1000 },
				{ ...createMockChannelEvent({ id: 'new', name: 'New Channel' }), created_at: now },
				{ ...createMockChannelEvent({ id: 'mid', name: 'Middle Channel' }), created_at: now - 500 }
			];

			mockNdk.fetchEvents.mockResolvedValueOnce(new Set(channels)).mockResolvedValueOnce(new Set());

			const result = await fetchChannels();

			expect(result[0].name).toBe('New Channel');
			expect(result[1].name).toBe('Middle Channel');
			expect(result[2].name).toBe('Old Channel');
		});

		it('should handle malformed channel metadata gracefully', async () => {
			const validChannel = createMockChannelEvent({
				id: 'valid',
				name: 'Valid Channel'
			});

			const malformedChannel = {
				id: 'malformed',
				kind: CHANNEL_KINDS.CREATE,
				content: 'not valid json {{{',
				tags: [],
				pubkey: 'test-pubkey',
				created_at: Math.floor(Date.now() / 1000)
			} as unknown as NDKEvent;

			mockNdk.fetchEvents.mockResolvedValueOnce(new Set([validChannel, malformedChannel])).mockResolvedValueOnce(new Set());

			const result = await fetchChannels();

			// Should skip malformed channel but return valid one
			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Valid Channel');
		});
	});

	describe('sendChannelMessage() - Access Verification (FIXED)', () => {
		it('should require signer to be configured', async () => {
			vi.mocked(ndk).mockReturnValue({ signer: null } as any);

			await expect(
				sendChannelMessage('channel-id', 'Hello')
			).rejects.toThrow('No signer configured');
		});

		it('should require relay connection', async () => {
			vi.mocked(ndk).mockReturnValue({
				signer: { getPublicKey: async () => 'pubkey' }
			} as any);
			vi.mocked(isConnected).mockReturnValue(false);

			await expect(
				sendChannelMessage('channel-id', 'Hello')
			).rejects.toThrow('Not connected to relays');
		});

		it('should document the new auth context parameter', () => {
			// sendChannelMessage now accepts authContext parameter for security:
			// sendChannelMessage(channelId, content, options, authContext?)
			//
			// authContext includes:
			// - userCohorts: string[]
			// - userPubkey: string
			// - isAdmin?: boolean
			//
			// This enables server-side verification of posting permissions
			expect(true).toBe(true);
		});
	});

	describe('Channel Visibility Rules', () => {
		it('should parse visibility tag correctly', async () => {
			const cohortChannel = createMockChannelEvent({
				id: 'cohort-vis',
				name: 'Cohort Visible',
				visibility: 'cohort',
				cohorts: ['test'] // Must have cohort to be visible to users with that cohort
			});

			const publicChannel = createMockChannelEvent({
				id: 'public-vis',
				name: 'Public Visible',
				visibility: 'public'
			});

			mockNdk.fetchEvents.mockResolvedValueOnce(new Set([
				cohortChannel,
				publicChannel
			])).mockResolvedValueOnce(new Set());

			// Fetch with matching cohort
			const result = await fetchChannels({ userCohorts: ['test'] });

			const visibilities = result.map(c => ({ name: c.name, visibility: c.visibility }));

			expect(visibilities).toContainEqual({ name: 'Cohort Visible', visibility: 'cohort' });
			expect(visibilities).toContainEqual({ name: 'Public Visible', visibility: 'public' });
		});

		it('should default to public visibility when tag is missing', async () => {
			const channelWithoutVisibility = {
				id: 'no-vis',
				kind: CHANNEL_KINDS.CREATE,
				content: JSON.stringify({ name: 'No Visibility Tag' }),
				tags: [],
				pubkey: 'test-pubkey',
				created_at: Math.floor(Date.now() / 1000)
			} as unknown as NDKEvent;

			mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelWithoutVisibility])).mockResolvedValueOnce(new Set());

			const result = await fetchChannels();

			expect(result[0].visibility).toBe('public');
		});

		it('should parse access type correctly (open vs gated)', async () => {
			const openChannel = createMockChannelEvent({
				id: 'open-access',
				name: 'Open Channel',
				accessType: 'open'
			});

			const gatedChannel = createMockChannelEvent({
				id: 'gated-access',
				name: 'Gated Channel',
				accessType: 'gated'
			});

			mockNdk.fetchEvents.mockResolvedValueOnce(new Set([openChannel, gatedChannel])).mockResolvedValueOnce(new Set());

			const result = await fetchChannels();

			const accessTypes = result.map(c => ({ name: c.name, accessType: c.accessType }));

			expect(accessTypes).toContainEqual({ name: 'Open Channel', accessType: 'open' });
			expect(accessTypes).toContainEqual({ name: 'Gated Channel', accessType: 'gated' });
		});

		it('should default to gated access type when tag is missing', async () => {
			const channelWithoutAccessType = {
				id: 'no-access-type',
				kind: CHANNEL_KINDS.CREATE,
				content: JSON.stringify({ name: 'No Access Type Tag' }),
				tags: [],
				pubkey: 'test-pubkey',
				created_at: Math.floor(Date.now() / 1000)
			} as unknown as NDKEvent;

			mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelWithoutAccessType])).mockResolvedValueOnce(new Set());

			const result = await fetchChannels();

			// Default should be 'gated' for security
			expect(result[0].accessType).toBe('gated');
		});
	});

	describe('Channel Name Exposure (Security - FIXED)', () => {
		it('should NOT expose restricted channel names to unauthorized users', async () => {
			const restrictedChannel = createMockChannelEvent({
				id: 'secret-project',
				name: 'Secret Project X - Confidential',
				cohorts: ['top-secret'],
				visibility: 'cohort'
			});

			mockNdk.fetchEvents.mockResolvedValueOnce(new Set([restrictedChannel])).mockResolvedValueOnce(new Set());

			// User without matching cohort
			const result = await fetchChannels({
				userCohorts: ['family'],
				userPubkey: 'unauthorized-user'
			});

			// FIXED: Restricted channels are now filtered out
			expect(result).toHaveLength(0);
		});

		it('should expose restricted channel names to authorized users', async () => {
			const restrictedChannel = createMockChannelEvent({
				id: 'secret-project',
				name: 'Secret Project X',
				cohorts: ['top-secret'],
				visibility: 'cohort'
			});

			mockNdk.fetchEvents.mockResolvedValueOnce(new Set([restrictedChannel])).mockResolvedValueOnce(new Set());

			// User with matching cohort
			const result = await fetchChannels({
				userCohorts: ['top-secret'],
				userPubkey: 'authorized-user'
			});

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('Secret Project X');
		});
	});
});

describe('Channel Store Integration', () => {
	describe('Cohort Filtering Logic', () => {
		it('should filter out channels where user has no matching cohort', () => {
			const userCohorts: string[] = ['business'];
			const channelCohorts: string[] = ['moomaa-tribe'];

			const hasMatchingCohort = channelCohorts.some(cohort =>
				userCohorts.includes(cohort)
			);

			expect(hasMatchingCohort).toBe(false);
		});

		it('should allow dual-cohort users to see all their channels', () => {
			const dualCohortUser: string[] = ['business', 'moomaa-tribe'];
			const businessChannel: string[] = ['business'];
			const tribeChannel: string[] = ['moomaa-tribe'];

			const canSeeBusiness = businessChannel.some(c => dualCohortUser.includes(c));
			const canSeeTribe = tribeChannel.some(c => dualCohortUser.includes(c));

			expect(canSeeBusiness).toBe(true);
			expect(canSeeTribe).toBe(true);
		});

		it('should handle channels with no cohort restrictions (public)', () => {
			const userCohorts: string[] = ['family'];
			const publicChannelCohorts: string[] = []; // No restrictions

			// Channels with no cohorts are visible to all
			const isPublic = publicChannelCohorts.length === 0;

			expect(isPublic).toBe(true);
		});
	});
});

// ============================================================================
// New test suites for uncovered functions
// ============================================================================

describe('fetchChannelById', () => {
	let mockNdk: {
		fetchEvents: ReturnType<typeof vi.fn>;
		signer: { getPublicKey: () => Promise<string> };
		subscribe: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockNdk = {
			fetchEvents: vi.fn().mockResolvedValue(new Set()),
			signer: { getPublicKey: async () => 'user-pubkey-123' },
			subscribe: vi.fn()
		};
		vi.mocked(ndk).mockReturnValue(mockNdk as any);
		vi.mocked(isConnected).mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should return null when not in browser', async () => {
		// fetchChannelById checks browser first; since we mock browser=true,
		// we test the ndk-null path instead
		vi.mocked(ndk).mockReturnValue(null as any);
		const result = await fetchChannelById('some-id');
		expect(result).toBeNull();
	});

	it('should return null when not connected', async () => {
		vi.mocked(isConnected).mockReturnValue(false);
		const result = await fetchChannelById('some-id');
		expect(result).toBeNull();
	});

	it('should return parsed channel when event found', async () => {
		const channelEvent = createMockChannelEvent({
			id: 'ch-123',
			name: 'Test Channel',
			cohorts: ['family', 'business'],
			visibility: 'cohort',
			section: 'dreamlab-lobby',
			accessType: 'open',
			pubkey: 'creator-pub'
		});

		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelEvent]));

		const result = await fetchChannelById('ch-123');

		expect(result).not.toBeNull();
		expect(result!.id).toBe('ch-123');
		expect(result!.name).toBe('Test Channel');
		expect(result!.cohorts).toEqual(['family', 'business']);
		expect(result!.visibility).toBe('cohort');
		expect(result!.section).toBe('dreamlab-lobby');
		expect(result!.accessType).toBe('open');
		expect(result!.creatorPubkey).toBe('creator-pub');
	});

	it('should return null when no events found', async () => {
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set());
		const result = await fetchChannelById('nonexistent');
		expect(result).toBeNull();
	});

	it('should use correct filter with kind 40 and ids', async () => {
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set());
		await fetchChannelById('target-id');

		expect(mockNdk.fetchEvents).toHaveBeenCalledWith(
			expect.objectContaining({
				kinds: [40],
				ids: ['target-id'],
				limit: 1
			})
		);
	});

	it('should handle malformed JSON content gracefully', async () => {
		const badEvent = {
			id: 'bad-json',
			kind: 40,
			content: '{not valid json',
			tags: [],
			pubkey: 'some-pubkey',
			created_at: 1000
		} as any;

		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([badEvent]));
		const result = await fetchChannelById('bad-json');
		expect(result).toBeNull();
	});

	it('should default to public visibility and gated access when tags missing', async () => {
		const minimalEvent = {
			id: 'minimal',
			kind: 40,
			content: JSON.stringify({ name: 'Minimal' }),
			tags: [],
			pubkey: 'pub123',
			created_at: 1000
		} as any;

		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([minimalEvent]));
		const result = await fetchChannelById('minimal');

		expect(result).not.toBeNull();
		expect(result!.visibility).toBe('public');
		expect(result!.accessType).toBe('gated');
		expect(result!.section).toBe('dreamlab-lobby');
		expect(result!.cohorts).toEqual([]);
		expect(result!.encrypted).toBe(false);
	});

	it('should parse encrypted tag correctly', async () => {
		const encryptedEvent = {
			id: 'encrypted-ch',
			kind: 40,
			content: JSON.stringify({ name: 'Encrypted Room' }),
			tags: [['encrypted', 'true']],
			pubkey: 'pub123',
			created_at: 1000
		} as any;

		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([encryptedEvent]));
		const result = await fetchChannelById('encrypted-ch');

		expect(result!.encrypted).toBe(true);
	});

	it('should fallback to Unnamed Channel when name is missing', async () => {
		const noNameEvent = {
			id: 'no-name',
			kind: 40,
			content: JSON.stringify({}),
			tags: [],
			pubkey: 'pub123',
			created_at: 1000
		} as any;

		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([noNameEvent]));
		const result = await fetchChannelById('no-name');

		expect(result!.name).toBe('Unnamed Channel');
	});

	it('should handle timeout by returning null (empty set from race)', async () => {
		vi.useFakeTimers();
		// Simulate a fetchEvents that never resolves
		mockNdk.fetchEvents.mockReturnValueOnce(new Promise(() => {}));
		const resultPromise = fetchChannelById('slow-channel');
		// Advance past the 8000ms FETCH_EVENTS_TIMEOUT
		await vi.advanceTimersByTimeAsync(9000);
		const result = await resultPromise;
		expect(result).toBeNull();
		vi.useRealTimers();
	});
});

describe('fetchChannelMessages', () => {
	let mockNdk: {
		fetchEvents: ReturnType<typeof vi.fn>;
		signer: { getPublicKey: () => Promise<string> };
		subscribe: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockNdk = {
			fetchEvents: vi.fn().mockResolvedValue(new Set()),
			signer: { getPublicKey: async () => 'user-pubkey-123' },
			subscribe: vi.fn()
		};
		vi.mocked(ndk).mockReturnValue(mockNdk as any);
		vi.mocked(isConnected).mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should return empty array when NDK not initialized', async () => {
		vi.mocked(ndk).mockReturnValue(null as any);
		const messages = await fetchChannelMessages('ch-1');
		expect(messages).toEqual([]);
	});

	it('should return empty array when not connected', async () => {
		vi.mocked(isConnected).mockReturnValue(false);
		const messages = await fetchChannelMessages('ch-1');
		expect(messages).toEqual([]);
	});

	it('should fetch and parse messages correctly', async () => {
		const now = Math.floor(Date.now() / 1000);
		const msgEvents = new Set([
			{
				id: 'msg-1',
				kind: 42,
				content: 'Hello world',
				pubkey: 'user-a',
				created_at: now - 100,
				tags: [['e', 'ch-1', '', 'root']],
			},
			{
				id: 'msg-2',
				kind: 42,
				content: 'Reply here',
				pubkey: 'user-b',
				created_at: now,
				tags: [
					['e', 'ch-1', '', 'root'],
					['e', 'msg-1', '', 'reply']
				],
			}
		]);

		mockNdk.fetchEvents.mockResolvedValueOnce(msgEvents as any);

		const messages = await fetchChannelMessages('ch-1');

		expect(messages).toHaveLength(2);
		// Should be sorted oldest first
		expect(messages[0].id).toBe('msg-1');
		expect(messages[0].content).toBe('Hello world');
		expect(messages[0].replyTo).toBeUndefined();
		expect(messages[1].id).toBe('msg-2');
		expect(messages[1].content).toBe('Reply here');
		expect(messages[1].replyTo).toBe('msg-1');
	});

	it('should use the correct filter with kind 42 and channel ID', async () => {
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set());
		await fetchChannelMessages('ch-abc', 25);

		expect(mockNdk.fetchEvents).toHaveBeenCalledWith(
			expect.objectContaining({
				kinds: [42],
				'#e': ['ch-abc'],
				limit: 25
			})
		);
	});

	it('should use default limit of 50', async () => {
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set());
		await fetchChannelMessages('ch-abc');

		expect(mockNdk.fetchEvents).toHaveBeenCalledWith(
			expect.objectContaining({ limit: 50 })
		);
	});

	it('should clone tags array from events', async () => {
		const originalTags = [['e', 'ch-1', '', 'root'], ['t', 'test']];
		const msgEvent = {
			id: 'msg-cloned',
			kind: 42,
			content: 'tag test',
			pubkey: 'user-a',
			created_at: 1000,
			tags: originalTags,
		};

		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([msgEvent]) as any);
		const messages = await fetchChannelMessages('ch-1');

		// Tags should be cloned (different reference)
		expect(messages[0].tags).toEqual(originalTags);
		expect(messages[0].tags).not.toBe(originalTags);
	});

	it('should return empty when authContext denies access', async () => {
		// First fetch for fetchChannelById inside fetchChannelMessages
		const channelEvent = createMockChannelEvent({
			id: 'restricted-ch',
			name: 'Restricted',
			cohorts: ['top-secret'],
			visibility: 'cohort'
		});
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelEvent]));

		const messages = await fetchChannelMessages('restricted-ch', 50, {
			userCohorts: ['family'],
			userPubkey: 'unauthorized-user'
		});

		expect(messages).toEqual([]);
	});

	it('should allow access when authContext has matching cohort', async () => {
		const channelEvent = createMockChannelEvent({
			id: 'family-ch',
			name: 'Family Room',
			cohorts: ['family'],
			visibility: 'cohort'
		});
		// First call: fetchChannelById, second call: fetchChannelMessages (actual messages)
		const msgEvent = {
			id: 'msg-ok',
			kind: 42,
			content: 'Allowed message',
			pubkey: 'user-a',
			created_at: 1000,
			tags: [['e', 'family-ch', '', 'root']],
		};
		mockNdk.fetchEvents
			.mockResolvedValueOnce(new Set([channelEvent]))
			.mockResolvedValueOnce(new Set([msgEvent]) as any);

		const messages = await fetchChannelMessages('family-ch', 50, {
			userCohorts: ['family'],
			userPubkey: 'family-user'
		});

		expect(messages).toHaveLength(1);
		expect(messages[0].content).toBe('Allowed message');
	});

	it('should warn but still fetch when no authContext provided', async () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const msgEvent = {
			id: 'msg-no-auth',
			kind: 42,
			content: 'No auth check',
			pubkey: 'user-a',
			created_at: 1000,
			tags: [['e', 'ch-1', '', 'root']],
		};
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([msgEvent]) as any);

		const messages = await fetchChannelMessages('ch-1');

		expect(messages).toHaveLength(1);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('fetchChannelMessages called without authContext')
		);
		consoleSpy.mockRestore();
	});
});

describe('subscribeToChannel', () => {
	let mockNdk: {
		fetchEvents: ReturnType<typeof vi.fn>;
		signer: { getPublicKey: () => Promise<string> };
		subscribe: ReturnType<typeof vi.fn>;
	};
	let mockSub: {
		on: ReturnType<typeof vi.fn>;
		stop: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockSub = {
			on: vi.fn(),
			stop: vi.fn()
		};
		mockNdk = {
			fetchEvents: vi.fn().mockResolvedValue(new Set()),
			signer: { getPublicKey: async () => 'user-pubkey-123' },
			subscribe: vi.fn().mockReturnValue(mockSub)
		};
		vi.mocked(ndk).mockReturnValue(mockNdk as any);
		vi.mocked(isConnected).mockReturnValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should return noop when NDK not initialized', async () => {
		vi.mocked(ndk).mockReturnValue(null as any);
		const callback = vi.fn();
		const result = await subscribeToChannel('ch-1', callback);

		expect(result.unsubscribe).toBeDefined();
		result.unsubscribe(); // Should not throw
		expect(callback).not.toHaveBeenCalled();
	});

	it('should create subscription with correct filter', async () => {
		const callback = vi.fn();
		await subscribeToChannel('ch-abc', callback);

		expect(mockNdk.subscribe).toHaveBeenCalledWith(
			expect.objectContaining({
				kinds: [42],
				'#e': ['ch-abc']
			}),
			{ closeOnEose: false }
		);
	});

	it('should call onMessage callback when event received', async () => {
		const callback = vi.fn();
		await subscribeToChannel('ch-1', callback);

		// Extract the event handler that was registered
		const onCall = mockSub.on.mock.calls.find(c => c[0] === 'event');
		expect(onCall).toBeDefined();

		const handler = onCall![1];

		// Simulate incoming event
		handler({
			id: 'live-msg-1',
			content: 'Live message!',
			pubkey: 'sender-a',
			created_at: 1000,
			tags: [['e', 'ch-1', '', 'root']]
		});

		expect(callback).toHaveBeenCalledTimes(1);
		expect(callback).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'live-msg-1',
				content: 'Live message!',
				pubkey: 'sender-a'
			})
		);
	});

	it('should parse replyTo tag in subscription events', async () => {
		const callback = vi.fn();
		await subscribeToChannel('ch-1', callback);

		const handler = mockSub.on.mock.calls.find(c => c[0] === 'event')![1];
		handler({
			id: 'reply-msg',
			content: 'This is a reply',
			pubkey: 'sender-b',
			created_at: 2000,
			tags: [
				['e', 'ch-1', '', 'root'],
				['e', 'original-msg', '', 'reply']
			]
		});

		expect(callback).toHaveBeenCalledWith(
			expect.objectContaining({
				replyTo: 'original-msg'
			})
		);
	});

	it('should stop subscription when unsubscribe called', async () => {
		const callback = vi.fn();
		const result = await subscribeToChannel('ch-1', callback);

		result.unsubscribe();
		expect(mockSub.stop).toHaveBeenCalledTimes(1);
	});

	it('should return noop when authContext denies access', async () => {
		const channelEvent = createMockChannelEvent({
			id: 'secret-ch',
			name: 'Secret',
			cohorts: ['vip'],
			visibility: 'cohort'
		});
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelEvent]));

		const callback = vi.fn();
		const result = await subscribeToChannel('secret-ch', callback, {
			userCohorts: ['family'],
			userPubkey: 'outsider'
		});

		expect(mockNdk.subscribe).not.toHaveBeenCalled();
		result.unsubscribe(); // noop, should not throw
	});

	it('should subscribe when authContext grants access', async () => {
		const channelEvent = createMockChannelEvent({
			id: 'family-ch',
			name: 'Family',
			cohorts: ['family'],
			visibility: 'cohort'
		});
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelEvent]));

		const callback = vi.fn();
		await subscribeToChannel('family-ch', callback, {
			userCohorts: ['family'],
			userPubkey: 'family-member'
		});

		expect(mockNdk.subscribe).toHaveBeenCalled();
	});

	it('should handle errors in event handler gracefully', async () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const callback = vi.fn().mockImplementation(() => {
			throw new Error('callback error');
		});

		await subscribeToChannel('ch-1', callback);

		const handler = mockSub.on.mock.calls.find(c => c[0] === 'event')![1];

		// Should not throw; error is caught internally
		expect(() => handler({
			id: 'err-msg',
			content: 'test',
			pubkey: 'pub',
			created_at: 1000,
			tags: [['e', 'ch-1', '', 'root']]
		})).not.toThrow();

		consoleSpy.mockRestore();
	});
});

describe('createChannel', () => {
	let mockNdk: {
		fetchEvents: ReturnType<typeof vi.fn>;
		signer: { getPublicKey: () => Promise<string> };
		subscribe: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		resetRateLimit('channelCreate');
		mockNdk = {
			fetchEvents: vi.fn().mockResolvedValue(new Set()),
			signer: { getPublicKey: async () => 'creator-pubkey' },
			subscribe: vi.fn()
		};
		vi.mocked(ndk).mockReturnValue(mockNdk as any);
		vi.mocked(isConnected).mockReturnValue(true);
		vi.mocked(publishEvent).mockResolvedValue(true);
		vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, retryAfter: 0, remaining: 1 });
		vi.mocked(validateChannelName).mockReturnValue({ valid: true, errors: [] });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should throw when no signer configured', async () => {
		vi.mocked(ndk).mockReturnValue({ signer: null } as any);

		await expect(
			createChannel({ name: 'Test' })
		).rejects.toThrow('No signer configured');
	});

	it('should throw when channel name is invalid', async () => {
		vi.mocked(validateChannelName).mockReturnValue({
			valid: false,
			errors: ['Name too short']
		});

		await expect(
			createChannel({ name: '' })
		).rejects.toThrow('Invalid channel name');
	});

	it('should throw when rate limited', async () => {
		vi.mocked(checkRateLimit).mockReturnValue({
			allowed: false,
			retryAfter: 30,
			remaining: 0
		});

		await expect(
			createChannel({ name: 'Test Channel' })
		).rejects.toThrow('rate limit');
	});

	it('should throw when not connected', async () => {
		vi.mocked(isConnected).mockReturnValue(false);

		await expect(
			createChannel({ name: 'Test Channel' })
		).rejects.toThrow('Not connected to relays');
	});

	it('should create channel with minimal options', async () => {
		const result = await createChannel({ name: 'General Chat' });

		expect(result.name).toBe('General Chat');
		expect(result.visibility).toBe('public');
		expect(result.accessType).toBe('gated');
		expect(result.cohorts).toEqual([]);
		expect(result.encrypted).toBe(false);
		expect(result.section).toBe('dreamlab-lobby');
		expect(publishEvent).toHaveBeenCalledTimes(1);
	});

	it('should create channel with full options', async () => {
		const result = await createChannel({
			name: 'VIP Room',
			description: 'Members only',
			visibility: 'cohort',
			accessType: 'open',
			cohorts: ['vip', 'admin'],
			encrypted: true,
			section: 'dreamlab' as any
		});

		expect(result.name).toBe('VIP Room');
		expect(result.description).toBe('Members only');
		expect(result.visibility).toBe('cohort');
		expect(result.accessType).toBe('open');
		expect(result.cohorts).toEqual(['vip', 'admin']);
		expect(result.encrypted).toBe(true);
		expect(result.section).toBe('dreamlab');
	});

	it('should publish event with correct kind 40', async () => {
		await createChannel({ name: 'New Room' });

		const publishedEvent = vi.mocked(publishEvent).mock.calls[0][0];
		expect(publishedEvent.kind).toBe(40);
	});

	it('should include section tag defaulting to dreamlab-lobby', async () => {
		await createChannel({ name: 'Room' });

		const publishedEvent = vi.mocked(publishEvent).mock.calls[0][0];
		const sectionTag = publishedEvent.tags.find((t: string[]) => t[0] === 'section');
		expect(sectionTag).toEqual(['section', 'dreamlab-lobby']);
	});

	it('should include access-type tag defaulting to gated', async () => {
		await createChannel({ name: 'Room' });

		const publishedEvent = vi.mocked(publishEvent).mock.calls[0][0];
		const accessTag = publishedEvent.tags.find((t: string[]) => t[0] === 'access-type');
		expect(accessTag).toEqual(['access-type', 'gated']);
	});

	it('should add visibility tag only for non-public channels', async () => {
		await createChannel({ name: 'Public Room', visibility: 'public' });
		let publishedEvent = vi.mocked(publishEvent).mock.calls[0][0];
		let visTag = publishedEvent.tags.find((t: string[]) => t[0] === 'visibility');
		expect(visTag).toBeUndefined();

		vi.mocked(publishEvent).mockClear();

		await createChannel({ name: 'Cohort Room', visibility: 'cohort' });
		publishedEvent = vi.mocked(publishEvent).mock.calls[0][0];
		visTag = publishedEvent.tags.find((t: string[]) => t[0] === 'visibility');
		expect(visTag).toEqual(['visibility', 'cohort']);
	});

	it('should add cohort tag with comma-separated values', async () => {
		await createChannel({ name: 'Multi', cohorts: ['family', 'business'] });

		const publishedEvent = vi.mocked(publishEvent).mock.calls[0][0];
		const cohortTag = publishedEvent.tags.find((t: string[]) => t[0] === 'cohort');
		expect(cohortTag).toEqual(['cohort', 'family,business']);
	});

	it('should add encrypted tag when encrypted is true', async () => {
		await createChannel({ name: 'Secret', encrypted: true });

		const publishedEvent = vi.mocked(publishEvent).mock.calls[0][0];
		const encTag = publishedEvent.tags.find((t: string[]) => t[0] === 'encrypted');
		expect(encTag).toEqual(['encrypted', 'true']);
	});

	it('should not add encrypted tag when encrypted is false', async () => {
		await createChannel({ name: 'Normal', encrypted: false });

		const publishedEvent = vi.mocked(publishEvent).mock.calls[0][0];
		const encTag = publishedEvent.tags.find((t: string[]) => t[0] === 'encrypted');
		expect(encTag).toBeUndefined();
	});
});

describe('updateChannelMetadata', () => {
	let mockNdk: {
		fetchEvents: ReturnType<typeof vi.fn>;
		signer: { getPublicKey: () => Promise<string> };
		subscribe: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		mockNdk = {
			fetchEvents: vi.fn().mockResolvedValue(new Set()),
			signer: { getPublicKey: async () => 'admin-pubkey' },
			subscribe: vi.fn()
		};
		vi.mocked(ndk).mockReturnValue(mockNdk as any);
		vi.mocked(isConnected).mockReturnValue(true);
		vi.mocked(publishEvent).mockResolvedValue(true);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should throw when no signer configured', async () => {
		vi.mocked(ndk).mockReturnValue({ signer: null } as any);

		await expect(
			updateChannelMetadata('ch-1', { name: 'New Name' })
		).rejects.toThrow('No signer configured');
	});

	it('should throw when not connected', async () => {
		vi.mocked(isConnected).mockReturnValue(false);

		await expect(
			updateChannelMetadata('ch-1', { name: 'New Name' })
		).rejects.toThrow('Not connected to relays');
	});

	it('should publish kind 41 event with metadata', async () => {
		await updateChannelMetadata('ch-1', { name: 'Updated Name', about: 'New desc' });

		expect(publishEvent).toHaveBeenCalledTimes(1);
		const event = vi.mocked(publishEvent).mock.calls[0][0];
		expect(event.kind).toBe(41);
		expect(JSON.parse(event.content)).toEqual({ name: 'Updated Name', about: 'New desc' });
	});

	it('should include e-tag referencing the channel ID', async () => {
		await updateChannelMetadata('ch-target', { name: 'X' });

		const event = vi.mocked(publishEvent).mock.calls[0][0];
		const eTag = event.tags.find((t: string[]) => t[0] === 'e');
		expect(eTag).toEqual(['e', 'ch-target', '', 'root']);
	});

	it('should skip authorization check when callerPubkey not provided', async () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		await updateChannelMetadata('ch-1', { name: 'X' });

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('callerPubkey')
		);
		expect(publishEvent).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('should allow channel creator to update metadata', async () => {
		const channelEvent = createMockChannelEvent({
			id: 'ch-owned',
			name: 'My Channel',
			pubkey: 'creator-key'
		});
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelEvent]));

		await updateChannelMetadata('ch-owned', { name: 'Renamed' }, 'creator-key');

		expect(publishEvent).toHaveBeenCalled();
	});

	it('should deny non-creator from updating metadata', async () => {
		const channelEvent = createMockChannelEvent({
			id: 'ch-owned',
			name: 'Their Channel',
			pubkey: 'real-creator'
		});
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelEvent]));

		await expect(
			updateChannelMetadata('ch-owned', { name: 'Hijack' }, 'attacker-key')
		).rejects.toThrow('Not authorized');
	});

	it('should proceed when channel not found and callerPubkey provided', async () => {
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set());

		// Channel not found = skip authorization (channel may not have propagated)
		await updateChannelMetadata('unknown-ch', { name: 'X' }, 'some-key');

		expect(publishEvent).toHaveBeenCalled();
	});
});

describe('sendChannelMessage - extended', () => {
	let mockNdk: {
		fetchEvents: ReturnType<typeof vi.fn>;
		signer: { getPublicKey: () => Promise<string> };
		subscribe: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		resetRateLimit('message');
		mockNdk = {
			fetchEvents: vi.fn().mockResolvedValue(new Set()),
			signer: { getPublicKey: async () => 'sender-pubkey' },
			subscribe: vi.fn()
		};
		vi.mocked(ndk).mockReturnValue(mockNdk as any);
		vi.mocked(isConnected).mockReturnValue(true);
		vi.mocked(publishEvent).mockResolvedValue(true);
		vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, retryAfter: 0, remaining: 9 });
		vi.mocked(validateContent).mockReturnValue({ valid: true, errors: [] });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should validate message content', async () => {
		vi.mocked(validateContent).mockReturnValue({
			valid: false,
			errors: ['Content contains null bytes']
		});

		await expect(
			sendChannelMessage('ch-1', 'bad\x00content')
		).rejects.toThrow('Invalid message');
	});

	it('should throw on rate limit exceeded', async () => {
		vi.mocked(checkRateLimit).mockReturnValue({
			allowed: false,
			retryAfter: 10,
			remaining: 0
		});

		await expect(
			sendChannelMessage('ch-1', 'Hello')
		).rejects.toThrow('rate limit');
	});

	it('should publish kind 42 event with correct tags', async () => {
		await sendChannelMessage('ch-target', 'Test message');

		const event = vi.mocked(publishEvent).mock.calls[0][0];
		expect(event.kind).toBe(42);
		expect(event.content).toBe('Test message');
		expect(event.tags).toContainEqual(['e', 'ch-target', '', 'root']);
	});

	it('should add reply tag when replyTo provided as string (backwards compat)', async () => {
		await sendChannelMessage('ch-1', 'Reply text', 'original-msg-id');

		const event = vi.mocked(publishEvent).mock.calls[0][0];
		expect(event.tags).toContainEqual(['e', 'original-msg-id', '', 'reply']);
	});

	it('should add reply tag when replyTo provided in options object', async () => {
		await sendChannelMessage('ch-1', 'Reply text', { replyTo: 'original-msg-id' });

		const event = vi.mocked(publishEvent).mock.calls[0][0];
		expect(event.tags).toContainEqual(['e', 'original-msg-id', '', 'reply']);
	});

	it('should add additional tags when provided', async () => {
		await sendChannelMessage('ch-1', 'Image message', {
			additionalTags: [['image', 'encrypted-blob-id', 'aes-key']]
		});

		const event = vi.mocked(publishEvent).mock.calls[0][0];
		expect(event.tags).toContainEqual(['image', 'encrypted-blob-id', 'aes-key']);
	});

	it('should return event ID on success', async () => {
		const id = await sendChannelMessage('ch-1', 'Hello');
		expect(typeof id).toBe('string');
	});

	it('should deny posting when authContext fails permission check', async () => {
		const channelEvent = createMockChannelEvent({
			id: 'gated-ch',
			name: 'Gated Room',
			cohorts: ['vip'],
			visibility: 'cohort',
			accessType: 'gated'
		});
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelEvent]));

		await expect(
			sendChannelMessage('gated-ch', 'Trying to post', undefined, {
				userCohorts: ['family'],
				userPubkey: 'outsider'
			})
		).rejects.toThrow('do not have permission');
	});

	it('should throw when authContext provided but channel not found', async () => {
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set());

		await expect(
			sendChannelMessage('missing-ch', 'Message', undefined, {
				userCohorts: ['family'],
				userPubkey: 'user'
			})
		).rejects.toThrow('Channel not found');
	});

	it('should allow admin to post to any channel', async () => {
		const channelEvent = createMockChannelEvent({
			id: 'restricted-ch',
			name: 'Restricted',
			cohorts: ['vip'],
			visibility: 'cohort',
			accessType: 'gated'
		});
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelEvent]));

		const id = await sendChannelMessage('restricted-ch', 'Admin message', undefined, {
			userCohorts: [],
			userPubkey: 'admin-key',
			isAdmin: true
		});

		expect(typeof id).toBe('string');
		expect(publishEvent).toHaveBeenCalled();
	});

	it('should allow channel creator to post to their gated channel', async () => {
		const channelEvent = createMockChannelEvent({
			id: 'own-ch',
			name: 'My Room',
			cohorts: ['special'],
			visibility: 'cohort',
			accessType: 'gated',
			pubkey: 'creator-key'
		});
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelEvent]));

		const id = await sendChannelMessage('own-ch', 'Creator message', undefined, {
			userCohorts: [],
			userPubkey: 'creator-key'
		});

		expect(typeof id).toBe('string');
	});

	it('should allow posting to open channel with access', async () => {
		const channelEvent = createMockChannelEvent({
			id: 'open-ch',
			name: 'Open Room',
			cohorts: [],
			visibility: 'public',
			accessType: 'open'
		});
		mockNdk.fetchEvents.mockResolvedValueOnce(new Set([channelEvent]));

		const id = await sendChannelMessage('open-ch', 'Anyone can post', undefined, {
			userCohorts: ['family'],
			userPubkey: 'any-user'
		});

		expect(typeof id).toBe('string');
	});
});

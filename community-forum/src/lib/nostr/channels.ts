/**
 * Channel Service - Nostr channel operations using NDK
 * Implements NIP-28 (Public Chat) event kinds
 */
import { NDKEvent, type NDKFilter } from '@nostr-dev-kit/ndk';
import { ndk, isConnected } from './relay';
import { browser } from '$app/environment';
import type { ChannelSection, ChannelAccessType } from '$lib/types/channel';
import { validateContent, validateChannelName } from '$lib/utils/validation';
import { checkRateLimit, RateLimitError } from '$lib/utils/rateLimit';
import { getSectionWithCategory } from '$lib/config';

/** Timeout for fetchEvents calls (ms). Prevents indefinite hangs when relay is unresponsive. */
const FETCH_EVENTS_TIMEOUT = 8000;

// NIP-28 Event Kinds for Public Chat
export const CHANNEL_KINDS = {
	CREATE: 40,      // Channel creation
	METADATA: 41,    // Channel metadata
	MESSAGE: 42,     // Channel message
	HIDE_MESSAGE: 43, // Hide message
	MUTE_USER: 44,   // Mute user in channel
} as const;

export interface ChannelMetadata {
	name: string;
	about?: string;
	picture?: string;
	relays?: string[];
}

export interface ChannelCreateOptions {
	name: string;
	description?: string;
	visibility?: 'public' | 'cohort' | 'private';
	accessType?: ChannelAccessType;  // open = anyone can post, gated = members only
	cohorts?: string[];
	encrypted?: boolean;
	section?: ChannelSection;
}

export interface CreatedChannel {
	id: string;
	name: string;
	description?: string;
	visibility: 'public' | 'cohort' | 'private';
	accessType: ChannelAccessType;  // open = anyone can post, gated = members only
	cohorts: string[];
	encrypted: boolean;
	section: ChannelSection;
	createdAt: number;
	creatorPubkey: string;
}

/**
 * Options for filtering channels based on user permissions
 */
export interface FetchChannelOptions {
	/** User's cohorts from whitelist (for filtering) */
	userCohorts?: string[];
	/** User's public key (for creator access) */
	userPubkey?: string;
	/** If true, bypass cohort filtering (for admin views) */
	isAdmin?: boolean;
	/** Limit number of channels returned */
	limit?: number;
}

/**
 * Create a new channel (NIP-28 kind 40)
 */
export async function createChannel(options: ChannelCreateOptions): Promise<CreatedChannel> {
	if (!browser) {
		throw new Error('Channel creation requires browser environment');
	}

	const ndkInstance = ndk();
	if (!ndkInstance?.signer) {
		throw new Error('No signer configured. Please login first.');
	}

	// Validate channel name
	const nameValidation = validateChannelName(options.name);
	if (!nameValidation.valid) {
		throw new Error(`Invalid channel name: ${nameValidation.errors.join(', ')}`);
	}

	// Check rate limit for channel creation
	const rateLimit = checkRateLimit('channelCreate');
	if (!rateLimit.allowed) {
		throw new RateLimitError(
			`Channel creation rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`,
			rateLimit.retryAfter
		);
	}

	// Check if connected
	if (!isConnected()) {
		throw new Error('Not connected to relays. Please wait for connection.');
	}

	// Build channel metadata
	const metadata: ChannelMetadata = {
		name: options.name,
		about: options.description,
	};

	// Create the event
	const event = new NDKEvent(ndk()!);
	event.kind = CHANNEL_KINDS.CREATE;
	event.content = JSON.stringify(metadata);

	// Add custom tags for visibility/cohorts
	if (options.visibility && options.visibility !== 'public') {
		event.tags.push(['visibility', options.visibility]);
	}

	if (options.cohorts && options.cohorts.length > 0) {
		event.tags.push(['cohort', options.cohorts.join(',')]);
	}

	if (options.encrypted) {
		event.tags.push(['encrypted', 'true']);
	}

	// Add section tag (default to public-lobby)
	const section = options.section || 'public-lobby';
	event.tags.push(['section', section]);

	// Add access type tag (default to gated for safety)
	const accessType = options.accessType || 'gated';
	event.tags.push(['access-type', accessType]);

	// Sign and publish
	await event.sign();
	await event.publish();

	return {
		id: event.id,
		name: options.name,
		description: options.description,
		visibility: options.visibility || 'public',
		accessType: accessType,
		cohorts: options.cohorts || [],
		encrypted: options.encrypted || false,
		section: section,
		createdAt: event.created_at || Math.floor(Date.now() / 1000),
		creatorPubkey: event.pubkey,
	};
}

/**
 * Update channel metadata (NIP-28 kind 41)
 *
 * SECURITY: When callerPubkey is provided, verifies that the caller is the
 * channel creator or an admin before publishing the metadata update.
 *
 * @param channelId - Channel ID to update
 * @param metadata - Partial metadata to update
 * @param callerPubkey - Optional pubkey of the caller for authorization check
 */
export async function updateChannelMetadata(
	channelId: string,
	metadata: Partial<ChannelMetadata>,
	callerPubkey?: string
): Promise<void> {
	if (!browser) {
		throw new Error('Channel operations require browser environment');
	}

	const ndkInstance = ndk();
	if (!ndkInstance?.signer) {
		throw new Error('No signer configured. Please login first.');
	}

	if (!isConnected()) {
		throw new Error('Not connected to relays. Please wait for connection.');
	}

	// SECURITY: Verify caller is the channel creator or an admin
	if (callerPubkey) {
		const channel = await fetchChannelById(channelId);
		if (channel) {
			const isCreator = channel.creatorPubkey === callerPubkey;
			// Check admin status via section config (admins have cross-access)
			const adminSection = getSectionWithCategory(channel.section);
			const isAdmin = adminSection?.category?.access?.visibleToCohorts?.includes('admin') ?? false;
			// Simple admin check: if the caller is not the creator, deny unless
			// they have a recognized admin role. Since we don't have cohort info here,
			// we only allow the creator to update.
			if (!isCreator) {
				throw new Error(
					'Not authorized: only the channel creator can update channel metadata.'
				);
			}
		}
	} else {
		console.warn(
			'[channels] updateChannelMetadata called without callerPubkey — ' +
			'creator authorization check skipped. Pass callerPubkey to enforce security.'
		);
	}

	const event = new NDKEvent(ndk()!);
	event.kind = CHANNEL_KINDS.METADATA;
	event.content = JSON.stringify(metadata);
	event.tags.push(['e', channelId, '', 'root']);

	await event.sign();
	await event.publish();
}

/**
 * Options for sending channel messages
 */
export interface ChannelMessageOptions {
	/** Reply to a specific message ID */
	replyTo?: string;
	/** Additional tags (e.g., encrypted image tags) */
	additionalTags?: string[][];
}

/**
 * Authorization context for message operations
 */
export interface MessageAuthContext {
	/** User's cohorts from whitelist */
	userCohorts: string[];
	/** User's public key */
	userPubkey: string;
	/** Whether user is admin (bypass restrictions) */
	isAdmin?: boolean;
}

/**
 * Check if user can post to a channel
 * @param channel - Channel to check
 * @param authContext - User's authorization context
 * @returns true if user can post to this channel
 */
function canPostToChannel(
	channel: CreatedChannel,
	authContext: MessageAuthContext
): boolean {
	const { userCohorts, userPubkey, isAdmin = false } = authContext;

	// Admins can post anywhere
	if (isAdmin) {
		return true;
	}

	// Channel creator can always post
	if (channel.creatorPubkey === userPubkey) {
		return true;
	}

	// First check if user can even see the channel
	if (!canAccessChannel(channel, userCohorts, userPubkey, isAdmin)) {
		return false;
	}

	// For open channels, anyone who can see can post
	if (channel.accessType === 'open') {
		return true;
	}

	// For gated channels (default), user must have matching cohorts
	// If channel has no cohorts, it's effectively open
	if (channel.cohorts.length === 0) {
		return true;
	}

	// User must have at least one matching cohort to post
	return channel.cohorts.some(cohort => userCohorts.includes(cohort));
}

/**
 * Fetch a single channel by ID (internal helper)
 */
async function fetchChannelById(channelId: string): Promise<CreatedChannel | null> {
	if (!browser) {
		return null;
	}

	const ndkInstance = ndk();
	if (!ndkInstance || !isConnected()) {
		return null;
	}

	const filter: NDKFilter = {
		kinds: [CHANNEL_KINDS.CREATE],
		ids: [channelId],
		limit: 1,
	};

	const events = await ndkInstance.fetchEvents(filter);

	for (const event of events) {
		try {
			const metadata = JSON.parse(event.content) as ChannelMetadata;
			const visibilityTag = event.tags.find(t => t[0] === 'visibility');
			const accessTypeTag = event.tags.find(t => t[0] === 'access-type');
			const cohortTag = event.tags.find(t => t[0] === 'cohort');
			const encryptedTag = event.tags.find(t => t[0] === 'encrypted');
			const sectionTag = event.tags.find(t => t[0] === 'section');

			return {
				id: event.id,
				name: metadata.name || 'Unnamed Channel',
				description: metadata.about,
				visibility: (visibilityTag?.[1] as any) || 'public',
				accessType: (accessTypeTag?.[1] as ChannelAccessType) || 'gated',
				cohorts: cohortTag?.[1]?.split(',').filter(Boolean) || [],
				encrypted: encryptedTag?.[1] === 'true',
				section: (sectionTag?.[1] as ChannelSection) || 'public-lobby',
				createdAt: event.created_at || 0,
				creatorPubkey: event.pubkey,
			};
		} catch (e) {
			console.error('Failed to parse channel event:', e);
		}
	}

	return null;
}

/**
 * Send a message to a channel (NIP-28 kind 42)
 *
 * SECURITY: This function verifies the user has permission to post to the channel
 * before sending the message. Authorization is based on cohorts and access type.
 *
 * @param channelId - Channel ID
 * @param content - Message content
 * @param options - Optional message options (replyTo, additionalTags for encrypted images)
 * @param authContext - Authorization context (required for security - cohorts, pubkey, isAdmin)
 */
export async function sendChannelMessage(
	channelId: string,
	content: string,
	options?: ChannelMessageOptions | string, // string for backwards compat (replyTo)
	authContext?: MessageAuthContext
): Promise<string> {
	if (!browser) {
		throw new Error('Channel operations require browser environment');
	}

	const ndkInstance = ndk();
	if (!ndkInstance?.signer) {
		throw new Error('No signer configured. Please login first.');
	}

	// Validate message content
	const contentValidation = validateContent(content);
	if (!contentValidation.valid) {
		throw new Error(`Invalid message: ${contentValidation.errors.join(', ')}`);
	}

	// Check rate limit for message sending
	const rateLimit = checkRateLimit('message');
	if (!rateLimit.allowed) {
		throw new RateLimitError(
			`Message rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`,
			rateLimit.retryAfter
		);
	}

	if (!isConnected()) {
		throw new Error('Not connected to relays. Please wait for connection.');
	}

	// SECURITY: Verify user has permission to post to this channel
	if (authContext) {
		const channel = await fetchChannelById(channelId);
		if (!channel) {
			throw new Error('Channel not found. Cannot verify posting permissions.');
		}

		if (!canPostToChannel(channel, authContext)) {
			throw new Error('You do not have permission to post in this channel.');
		}
	} else {
		console.warn(
			'[channels] sendChannelMessage called without authContext — ' +
			'posting permission checks skipped. Pass authContext to enforce security.'
		);
	}

	// Handle backwards compatibility: string = replyTo
	const opts: ChannelMessageOptions = typeof options === 'string'
		? { replyTo: options }
		: options || {};

	const event = new NDKEvent(ndk()!);
	event.kind = CHANNEL_KINDS.MESSAGE;
	event.content = content;
	event.tags.push(['e', channelId, '', 'root']);

	if (opts.replyTo) {
		event.tags.push(['e', opts.replyTo, '', 'reply']);
	}

	// Add additional tags (encrypted image tags, etc.)
	if (opts.additionalTags) {
		for (const tag of opts.additionalTags) {
			event.tags.push(tag);
		}
	}

	await event.sign();
	await event.publish();

	return event.id;
}

/**
 * Check if user can access the zone (category) that contains a channel's section.
 * Enforces category-level visibleToCohorts and hiddenFromCohorts even on the flat /chat view.
 */
function canAccessChannelZone(
	channel: CreatedChannel,
	userCohorts: string[],
	isAdmin: boolean
): boolean {
	if (isAdmin) return true;

	const sectionInfo = getSectionWithCategory(channel.section);
	if (!sectionInfo) return true; // Unknown section — don't filter

	const { category } = sectionInfo;
	if (!category.access) return true; // No access config = visible to all

	// cross-access cohort can access all categories
	if (userCohorts.includes('cross-access')) return true;

	// Check hiddenFromCohorts — deny if user has any hidden cohort
	if (category.access.hiddenFromCohorts?.length) {
		const isHidden = category.access.hiddenFromCohorts.some((cohort: string) =>
			userCohorts.includes(cohort)
		);
		if (isHidden) return false;
	}

	// Check visibleToCohorts — user must have at least one matching cohort
	if (category.access.visibleToCohorts?.length) {
		return category.access.visibleToCohorts.some((cohort: string) =>
			userCohorts.includes(cohort)
		);
	}

	return true;
}

/**
 * Check if user can access a channel based on cohorts
 * @param channel - Channel to check
 * @param userCohorts - User's cohorts from whitelist
 * @param userPubkey - User's public key
 * @param isAdmin - Whether user is admin (bypass filtering)
 * @returns true if user can see this channel
 */
function canAccessChannel(
	channel: CreatedChannel,
	userCohorts: string[],
	userPubkey: string | undefined,
	isAdmin: boolean
): boolean {
	// Admins can see all channels
	if (isAdmin) {
		return true;
	}

	// Channel creator can always see their own channel
	if (userPubkey && channel.creatorPubkey === userPubkey) {
		return true;
	}

	// Public channels (no cohort restrictions) are visible to all
	if (channel.visibility === 'public' || channel.cohorts.length === 0) {
		return true;
	}

	// Cohort-restricted channels: user must have at least one matching cohort
	if (channel.cohorts.length > 0 && userCohorts.length > 0) {
		const hasMatchingCohort = channel.cohorts.some(cohort =>
			userCohorts.includes(cohort)
		);
		return hasMatchingCohort;
	}

	// No matching cohorts - deny access
	return false;
}

/**
 * Fetch channels from relays with cohort-based access filtering
 *
 * SECURITY: Channels are filtered based on user's cohorts from whitelist.
 * Only channels where user has matching cohorts will be returned.
 *
 * @param options - Filtering options (userCohorts, isAdmin, limit)
 * @returns Promise<CreatedChannel[]> - Filtered channels user can access
 */
export async function fetchChannels(options: FetchChannelOptions = {}): Promise<CreatedChannel[]> {
	const { userCohorts = [], userPubkey, isAdmin = false, limit = 100 } = options;

	if (!browser) {
		return [];
	}

	const ndkInstance = ndk();
	if (!ndkInstance) {
		return [];
	}

	if (!isConnected()) {
		return [];
	}

	const filter: NDKFilter = {
		kinds: [CHANNEL_KINDS.CREATE],
		limit,
	};

	// Race fetchEvents against a timeout so loading never hangs indefinitely
	// when the relay is slow or never sends EOSE.
	const fetchTimeout = new Promise<Set<NDKEvent>>((resolve) => {
		setTimeout(() => resolve(new Set()), FETCH_EVENTS_TIMEOUT);
	});
	const events = await Promise.race([ndkInstance.fetchEvents(filter), fetchTimeout]);
	const channels: CreatedChannel[] = [];

	for (const event of events) {
		try {
			const metadata = JSON.parse(event.content) as ChannelMetadata;
			const visibilityTag = event.tags.find(t => t[0] === 'visibility');
			const accessTypeTag = event.tags.find(t => t[0] === 'access-type');
			const cohortTag = event.tags.find(t => t[0] === 'cohort');
			const encryptedTag = event.tags.find(t => t[0] === 'encrypted');
			const sectionTag = event.tags.find(t => t[0] === 'section');

			const channel: CreatedChannel = {
				id: event.id,
				name: metadata.name || 'Unnamed Channel',
				description: metadata.about,
				visibility: (visibilityTag?.[1] as any) || 'public',
				accessType: (accessTypeTag?.[1] as ChannelAccessType) || 'gated',
				cohorts: cohortTag?.[1]?.split(',').filter(Boolean) || [],
				encrypted: encryptedTag?.[1] === 'true',
				section: (sectionTag?.[1] as ChannelSection) || 'public-lobby',
				createdAt: event.created_at || 0,
				creatorPubkey: event.pubkey,
			};

			// SECURITY: Filter channels based on user cohorts AND zone visibility
			if (canAccessChannel(channel, userCohorts, userPubkey, isAdmin) &&
				canAccessChannelZone(channel, userCohorts, isAdmin)) {
				channels.push(channel);
			}
		} catch (e) {
			console.error('Failed to parse channel event:', e);
		}
	}

	// Fetch the latest message timestamp per channel for activity-based sorting.
	// Build a single filter that asks for recent kind-42 events across all channel IDs.
	const channelIds = channels.map(c => c.id);
	const lastActivityMap = new Map<string, number>();

	if (channelIds.length > 0) {
		try {
			const msgFilter: NDKFilter = {
				kinds: [CHANNEL_KINDS.MESSAGE],
				'#e': channelIds,
				limit: channelIds.length * 2, // Heuristic: ~2 recent msgs per channel
			};
			const msgFetchTimeout = new Promise<Set<NDKEvent>>((resolve) => {
				setTimeout(() => resolve(new Set()), FETCH_EVENTS_TIMEOUT);
			});
			const msgEvents = await Promise.race([ndkInstance.fetchEvents(msgFilter), msgFetchTimeout]);

			for (const event of msgEvents) {
				const rootTag = event.tags.find(t => t[0] === 'e' && (t[3] === 'root' || !t[3]));
				const chId = rootTag?.[1];
				if (chId) {
					const ts = event.created_at || 0;
					const current = lastActivityMap.get(chId) || 0;
					if (ts > current) {
						lastActivityMap.set(chId, ts);
					}
				}
			}
		} catch (e) {
			// Non-fatal: fall back to createdAt sorting
			console.warn('Failed to fetch last activity for channel sorting:', e);
		}
	}

	// Sort by last activity (newest first), falling back to createdAt
	channels.sort((a, b) => {
		const aActivity = lastActivityMap.get(a.id) || a.createdAt;
		const bActivity = lastActivityMap.get(b.id) || b.createdAt;
		return bActivity - aActivity;
	});

	return channels;
}

/**
 * Channel message with full metadata including tags for encrypted images
 */
export interface ChannelMessage {
	id: string;
	content: string;
	pubkey: string;
	createdAt: number;
	replyTo?: string;
	/** All event tags (for encrypted images, etc.) */
	tags: string[][];
}

/**
 * Fetch messages for a channel
 *
 * SECURITY: When authContext is provided, verifies the user has access to the
 * channel (cohort + zone checks) before returning messages. Without authContext,
 * messages are returned with a deprecation warning — callers should migrate to
 * always providing authContext.
 *
 * @param channelId - Channel to fetch messages from
 * @param limit - Max messages to return (default 50)
 * @param authContext - Optional auth context for access verification
 */
export async function fetchChannelMessages(
	channelId: string,
	limit = 50,
	authContext?: MessageAuthContext
): Promise<ChannelMessage[]> {
	if (!browser) {
		return [];
	}

	const ndkInstance = ndk();
	if (!ndkInstance) {
		return [];
	}

	if (!isConnected()) {
		return [];
	}

	// SECURITY: Verify channel access before fetching messages
	if (authContext) {
		const channel = await fetchChannelById(channelId);
		if (channel) {
			const { userCohorts, userPubkey, isAdmin = false } = authContext;
			if (!canAccessChannel(channel, userCohorts, userPubkey, isAdmin) ||
				!canAccessChannelZone(channel, userCohorts, isAdmin)) {
				return [];
			}
		}
		// If channel metadata not found, allow fetch — channel may exist but
		// the kind-40 event hasn't propagated yet. The relay itself is the
		// final gatekeeper.
	} else {
		console.warn(
			'[channels] fetchChannelMessages called without authContext — ' +
			'channel access checks skipped. Pass authContext to enforce security.'
		);
	}

	const filter: NDKFilter = {
		kinds: [CHANNEL_KINDS.MESSAGE],
		'#e': [channelId],
		limit,
	};

	const events = await ndkInstance.fetchEvents(filter);
	const messages: ChannelMessage[] = [];

	for (const event of events) {
		const replyTag = event.tags.find(t => t[0] === 'e' && t[3] === 'reply');

		messages.push({
			id: event.id,
			content: event.content,
			pubkey: event.pubkey,
			createdAt: event.created_at || 0,
			replyTo: replyTag?.[1],
			tags: event.tags.map(t => [...t]), // Clone tags array
		});
	}

	// Sort by creation time (oldest first for messages)
	messages.sort((a, b) => a.createdAt - b.createdAt);

	return messages;
}

/**
 * Subscribe to channel messages in real-time
 *
 * SECURITY: When authContext is provided, verifies the user has access to the
 * channel before setting up the subscription. If access is denied, returns a
 * no-op cleanup function without subscribing. Without authContext, subscribes
 * with a deprecation warning.
 *
 * @param channelId - Channel to subscribe to
 * @param onMessage - Callback for incoming messages
 * @param authContext - Optional auth context for access verification
 */
export async function subscribeToChannel(
	channelId: string,
	onMessage: (message: ChannelMessage) => void,
	authContext?: MessageAuthContext
): Promise<{ unsubscribe: () => void }> {
	const noopResult = { unsubscribe: () => {} };

	if (!browser) {
		return noopResult;
	}

	const ndkInstance = ndk();
	if (!ndkInstance) {
		return noopResult;
	}

	// SECURITY: Verify channel access before subscribing
	if (authContext) {
		const channel = await fetchChannelById(channelId);
		if (channel) {
			const { userCohorts, userPubkey, isAdmin = false } = authContext;
			if (!canAccessChannel(channel, userCohorts, userPubkey, isAdmin) ||
				!canAccessChannelZone(channel, userCohorts, isAdmin)) {
				return noopResult;
			}
		}
	} else {
		console.warn(
			'[channels] subscribeToChannel called without authContext — ' +
			'channel access checks skipped. Pass authContext to enforce security.'
		);
	}

	const filter: NDKFilter = {
		kinds: [CHANNEL_KINDS.MESSAGE],
		'#e': [channelId],
		since: Math.floor(Date.now() / 1000),
	};

	const sub = ndkInstance.subscribe(filter, { closeOnEose: false });

	sub.on('event', (event: NDKEvent) => {
		const replyTag = event.tags.find(t => t[0] === 'e' && t[3] === 'reply');

		onMessage({
			id: event.id,
			content: event.content,
			pubkey: event.pubkey,
			createdAt: event.created_at || 0,
			replyTo: replyTag?.[1],
			tags: event.tags.map(t => [...t]), // Clone tags array
		});
	});

	return {
		unsubscribe: () => {
			sub.stop();
		},
	};
}

import { writable, derived, get, type Readable, type Writable } from 'svelte/store';
import type { Channel, Message, JoinRequest, MemberStatus } from '$lib/types/channel';
import type NDK from '@nostr-dev-kit/ndk';
import type { NDKEvent, NDKFilter } from '@nostr-dev-kit/ndk';
import type { ChannelSection, ChannelVisibility, ChannelAccessType } from '$lib/types/channel';

// ============================================================================
// NIP-29 Channel interface (relay-driven, used by fetchChannels)
// ============================================================================

/** NIP-29 relay-driven channel representation */
export interface NIP29Channel {
  id: string;                                    // h tag value (group ID)
  name: string;                                  // From kind 39000 metadata
  description: string;
  picture?: string;                              // Avatar URL
  cohorts: string[];
  section: ChannelSection;                       // Section category
  visibility: ChannelVisibility;                 // Visibility within section
  accessType: ChannelAccessType;                 // open = anyone can post, gated = members only
  isEncrypted: boolean;                          // E2E vs transport only
  memberCount: number;
  createdAt: number;

  // User-specific state
  isMember: boolean;
  hasRequestPending: boolean;
}

// NIP-29 event kinds
const KIND_GROUP_METADATA = 39000;    // Group metadata event
const KIND_GROUP_MEMBERS = 39002;     // Group member list
const KIND_JOIN_REQUEST = 9021;       // Custom: user join requests

// ============================================================================
// Store state and core store
// ============================================================================

interface ChannelState {
  channels: Channel[];
  messages: Record<string, Message[]>;
  selectedChannelId: string | null;
  joinRequests: JoinRequest[];
  isLoading: boolean;
  // NIP-29 relay-driven channels (separate from legacy Channel[])
  nip29Channels: NIP29Channel[];
  nip29Loading: boolean;
  nip29Error: string | null;
  nip29CurrentChannel: NIP29Channel | null;
}

const initialState: ChannelState = {
  channels: [],
  messages: {},
  selectedChannelId: null,
  joinRequests: [],
  isLoading: false,
  nip29Channels: [],
  nip29Loading: false,
  nip29Error: null,
  nip29CurrentChannel: null,
};

// Create the base writable store
const store: Writable<ChannelState> = writable<ChannelState>(initialState);

// Helper to get current state
function getState(): ChannelState {
  return get(store);
}

// ============================================================================
// NIP-29 relay fetch logic (migrated from stores/channels.ts)
// ============================================================================

/**
 * Fetch all channels from relay with cohort filtering (NIP-29)
 *
 * @param ndk - NDK instance connected to relay
 * @param userPubkey - Current user's public key
 * @param userCohorts - User's cohort tags (business, moomaa-tribe, or both)
 * @returns Promise<NIP29Channel[]>
 */
export async function fetchNIP29Channels(
  ndk: NDK,
  userPubkey: string,
  userCohorts: string[]
): Promise<NIP29Channel[]> {
  store.update(state => ({ ...state, nip29Loading: true, nip29Error: null }));

  try {
    // 1. Fetch all group metadata events (kind 39000)
    const metadataFilter: NDKFilter = {
      kinds: [KIND_GROUP_METADATA],
    };

    const metadataEvents = await ndk.fetchEvents(metadataFilter);
    const metadataArray = Array.from(metadataEvents);

    // 2. Fetch all member lists (kind 39002)
    const memberFilter: NDKFilter = {
      kinds: [KIND_GROUP_MEMBERS],
    };

    const memberEvents = await ndk.fetchEvents(memberFilter);
    const memberArray = Array.from(memberEvents);

    // 3. Fetch user's pending join requests (kind 9021)
    const requestFilter: NDKFilter = {
      kinds: [KIND_JOIN_REQUEST],
      authors: [userPubkey],
    };

    const pendingRequests = await ndk.fetchEvents(requestFilter);
    const requestArray = Array.from(pendingRequests);

    // 4. Build Channel objects
    const channels: NIP29Channel[] = [];

    for (const metaEvent of metadataArray) {
      const channel = buildChannelFromEvents(
        metaEvent,
        memberArray,
        requestArray,
        userPubkey,
        userCohorts
      );

      if (channel) {
        channels.push(channel);
      }
    }

    // 5. Update store with fetched channels
    store.update(state => ({
      ...state,
      nip29Channels: channels,
      nip29Loading: false,
      nip29Error: null,
    }));

    return channels;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch channels';

    store.update(state => ({
      ...state,
      nip29Loading: false,
      nip29Error: errorMessage,
    }));

    throw error;
  }
}

/**
 * Build a NIP29Channel from relay events with cohort filtering
 */
function buildChannelFromEvents(
  metaEvent: NDKEvent,
  memberEvents: NDKEvent[],
  requestEvents: NDKEvent[],
  userPubkey: string,
  userCohorts: string[]
): NIP29Channel | null {
  // Extract group ID from 'd' tag
  const groupId = metaEvent.tags.find(t => t[0] === 'd')?.[1];
  if (!groupId) return null;

  // Extract cohort tags
  const channelCohorts = metaEvent.tags
    .filter(t => t[0] === 'cohort')
    .map(t => t[1]);

  // Apply cohort filtering logic
  const hasMatchingCohort = channelCohorts.some(channelCohort =>
    userCohorts.includes(channelCohort)
  );

  // If no cohort match and user isn't dual-cohort, filter out
  if (!hasMatchingCohort && channelCohorts.length > 0) {
    return null;
  }

  // Parse metadata content
  let metadata: {
    name?: string;
    about?: string;
    picture?: string;
  } = {};

  try {
    metadata = JSON.parse(metaEvent.content);
  } catch {
    metadata = {};
  }

  // Find matching member list event
  const memberEvent = memberEvents.find(m => {
    const memberGroupId = m.tags.find(t => t[0] === 'd')?.[1];
    return memberGroupId === groupId;
  });

  // Extract member pubkeys
  const memberPubkeys = memberEvent?.tags
    .filter(t => t[0] === 'p')
    .map(t => t[1]) || [];

  const memberCount = memberPubkeys.length;
  const isMember = memberPubkeys.includes(userPubkey);

  // Check if user has pending request for this channel
  const hasRequestPending = requestEvents.some(r => {
    const requestChannelId = r.tags.find(t => t[0] === 'h')?.[1];
    return requestChannelId === groupId;
  });

  // Extract section tag (default to dreamlab-lobby)
  const sectionTag = metaEvent.tags.find(t => t[0] === 'section')?.[1];
  const section = (sectionTag as ChannelSection) || 'dreamlab-lobby';

  // Extract visibility setting (default to public)
  const visibilityTag = metaEvent.tags.find(t => t[0] === 'visibility')?.[1];
  const visibility = (visibilityTag as ChannelVisibility) || 'public';

  // Extract access type setting (default to gated for security)
  const accessTypeTag = metaEvent.tags.find(t => t[0] === 'access-type')?.[1];
  const accessType = (accessTypeTag as ChannelAccessType) || 'gated';

  // Check if channel is encrypted (E2E)
  const isEncrypted = metaEvent.tags.some(t => t[0] === 'encrypted');

  // Handle visibility filtering for non-members
  if (!isMember && visibility === 'cohort') {
    return null;
  }

  return {
    id: groupId,
    name: metadata.name || 'Unnamed Channel',
    description: metadata.about || '',
    picture: metadata.picture,
    cohorts: channelCohorts,
    section,
    visibility,
    accessType,
    isEncrypted,
    memberCount,
    createdAt: metaEvent.created_at || 0,
    isMember,
    hasRequestPending,
  };
}

/**
 * Set the current active NIP-29 channel
 */
export function setNIP29CurrentChannel(channel: NIP29Channel | null): void {
  store.update(state => ({
    ...state,
    nip29CurrentChannel: channel,
  }));
}

/**
 * Get current NIP-29 channel (synchronous)
 */
export function getNIP29CurrentChannel(): NIP29Channel | null {
  return getState().nip29CurrentChannel;
}

/**
 * Filter NIP-29 channels by cohort
 */
export function getNIP29ChannelsByCohort(cohort: string): NIP29Channel[] {
  const state = getState();
  return state.nip29Channels.filter(c => c.cohorts.includes(cohort));
}

/**
 * Filter NIP-29 channels by section
 */
export function getNIP29ChannelsBySection(section: ChannelSection): NIP29Channel[] {
  const state = getState();
  return state.nip29Channels.filter(c => c.section === section);
}

/**
 * Clear all NIP-29 channels
 */
export function clearNIP29Channels(): void {
  store.update(state => ({
    ...state,
    nip29Channels: [],
    nip29Loading: false,
    nip29Error: null,
    nip29CurrentChannel: null,
  }));
}

/**
 * Update a single NIP-29 channel in the store
 */
export function updateNIP29Channel(channelId: string, updates: Partial<NIP29Channel>): void {
  store.update(state => ({
    ...state,
    nip29Channels: state.nip29Channels.map(c =>
      c.id === channelId ? { ...c, ...updates } : c
    ),
  }));
}

/**
 * Remove a NIP-29 channel from the store
 */
export function removeNIP29Channel(channelId: string): void {
  store.update(state => ({
    ...state,
    nip29Channels: state.nip29Channels.filter(c => c.id !== channelId),
    nip29CurrentChannel: state.nip29CurrentChannel?.id === channelId ? null : state.nip29CurrentChannel,
  }));
}

// ============================================================================
// Legacy channel store methods (for UI components using Channel from types)
// ============================================================================

// Export the channel store with methods
export const channelStore = {
  subscribe: store.subscribe,

  setChannels: (channels: Channel[]) => {
    store.update(state => ({ ...state, channels }));
  },

  addChannel: (channel: Channel) => {
    store.update(state => ({
      ...state,
      channels: [...state.channels, channel]
    }));
  },

  selectChannel: (channelId: string | null) => {
    store.update(state => ({ ...state, selectedChannelId: channelId }));
  },

  setMessages: (channelId: string, messages: Message[]) => {
    store.update(state => ({
      ...state,
      messages: {
        ...state.messages,
        [channelId]: messages
      }
    }));
  },

  addMessage: (message: Message) => {
    store.update(state => {
      const channelMessages = state.messages[message.channelId] || [];
      return {
        ...state,
        messages: {
          ...state.messages,
          [message.channelId]: [...channelMessages, message]
        }
      };
    });
  },

  deleteMessage: (channelId: string, messageId: string) => {
    store.update(state => ({
      ...state,
      messages: {
        ...state.messages,
        [channelId]: (state.messages[channelId] || []).filter(m => m.id !== messageId)
      }
    }));
  },

  requestJoin: (channelId: string, requesterPubkey: string) => {
    const request: JoinRequest = {
      channelId,
      requesterPubkey,
      status: 'pending',
      createdAt: Date.now()
    };
    store.update(state => ({
      ...state,
      joinRequests: [...state.joinRequests, request]
    }));
  },

  getMemberStatus: (channelId: string, userPubkey: string | null): MemberStatus => {
    if (!userPubkey) return 'non-member';

    const state = getState();
    const channel = state.channels.find(c => c.id === channelId);

    if (!channel) return 'non-member';
    if (channel.admins.includes(userPubkey)) return 'admin';
    if (channel.members.includes(userPubkey)) return 'member';
    if (channel.pendingRequests.includes(userPubkey)) return 'pending';

    return 'non-member';
  },

  approveMember: (channelId: string, memberPubkey: string) => {
    store.update(state => ({
      ...state,
      channels: state.channels.map(channel => {
        if (channel.id !== channelId) return channel;
        return {
          ...channel,
          members: channel.members.includes(memberPubkey)
            ? channel.members
            : [...channel.members, memberPubkey],
          pendingRequests: channel.pendingRequests.filter(pk => pk !== memberPubkey)
        };
      })
    }));
  },

  setLoading: (isLoading: boolean) => {
    store.update(state => ({ ...state, isLoading }));
  },

  // NIP-29 methods exposed on store object for backward compatibility
  set: store.set,
  update: store.update,
  fetchChannels: fetchNIP29Channels,
  setCurrentChannel: setNIP29CurrentChannel,
  getCurrentChannel: getNIP29CurrentChannel,
  getChannelsByCohort: getNIP29ChannelsByCohort,
  getChannelsBySection: getNIP29ChannelsBySection,
  clearChannels: clearNIP29Channels,
  updateChannel: updateNIP29Channel,
  removeChannel: removeNIP29Channel,
};

// ============================================================================
// Derived stores
// ============================================================================

// Lazy-initialized derived stores to avoid circular dependency issues
let _selectedChannel: Readable<Channel | null> | null = null;
let _selectedMessages: Readable<Message[]> | null = null;
let _userMemberStatus: Readable<MemberStatus> | null = null;

// NIP-29 derived stores
let _nip29MemberChannels: ReturnType<typeof derived<typeof store, NIP29Channel[]>> | null = null;
let _nip29AvailableChannels: ReturnType<typeof derived<typeof store, NIP29Channel[]>> | null = null;

export function getSelectedChannel(): Readable<Channel | null> {
  if (!_selectedChannel) {
    _selectedChannel = derived(store, $state =>
      $state.channels.find(c => c.id === $state.selectedChannelId) || null
    );
  }
  return _selectedChannel;
}

export function getSelectedMessages(): Readable<Message[]> {
  if (!_selectedMessages) {
    _selectedMessages = derived(store, $state => {
      if (!$state.selectedChannelId) return [];
      return $state.messages[$state.selectedChannelId] || [];
    });
  }
  return _selectedMessages;
}

export function getUserMemberStatus(): Readable<MemberStatus> {
  if (!_userMemberStatus) {
    // Import authStore dynamically to avoid circular dependency
    import('./auth').then(({ authStore }) => {
      const selChan = getSelectedChannel();
      _userMemberStatus = derived(
        [selChan, authStore],
        ([$selectedChannel, $authStore]) => {
          if (!$selectedChannel || !$authStore.publicKey) return 'non-member' as MemberStatus;

          const userPubkey = $authStore.publicKey;
          if ($selectedChannel.admins.includes(userPubkey)) return 'admin' as MemberStatus;
          if ($selectedChannel.members.includes(userPubkey)) return 'member' as MemberStatus;
          if ($selectedChannel.pendingRequests.includes(userPubkey)) return 'pending' as MemberStatus;

          return 'non-member' as MemberStatus;
        }
      );
    });
    // Return a temporary store while async import resolves
    return writable<MemberStatus>('non-member');
  }
  return _userMemberStatus;
}

/**
 * NIP-29: Filter channels by membership status (lazy initialization)
 */
export function getNIP29MemberChannels() {
  if (!_nip29MemberChannels) {
    _nip29MemberChannels = derived(store, $state => $state.nip29Channels.filter(c => c.isMember));
  }
  return _nip29MemberChannels;
}

/**
 * NIP-29: Filter channels by non-membership (lazy initialization)
 */
export function getNIP29AvailableChannels() {
  if (!_nip29AvailableChannels) {
    _nip29AvailableChannels = derived(store, $state => $state.nip29Channels.filter(c => !c.isMember && c.visibility === 'public'));
  }
  return _nip29AvailableChannels;
}

// ============================================================================
// Backwards-compatible exports
// ============================================================================

export const selectedChannel = {
  subscribe: (fn: (value: Channel | null) => void) => getSelectedChannel().subscribe(fn)
};

export const selectedMessages = {
  subscribe: (fn: (value: Message[]) => void) => getSelectedMessages().subscribe(fn)
};

export const userMemberStatus = {
  subscribe: (fn: (value: MemberStatus) => void) => getUserMemberStatus().subscribe(fn)
};

// NIP-29 backwards-compatible derived store exports
export const memberChannels = {
  subscribe: (fn: (value: NIP29Channel[]) => void) => getNIP29MemberChannels().subscribe(fn)
};

export const availableChannels = {
  subscribe: (fn: (value: NIP29Channel[]) => void) => getNIP29AvailableChannels().subscribe(fn)
};

// Re-export Channel type from types for convenience
export type { Channel } from '$lib/types/channel';

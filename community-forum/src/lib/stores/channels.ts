/**
 * @deprecated Use imports from '$lib/stores/channelStore' directly.
 * This file re-exports for backward compatibility only.
 *
 * The canonical channel store is channelStore.ts, which contains:
 * - Legacy Channel store (message management, join requests, member status)
 * - NIP-29 relay-driven channel store (fetchChannels, cohort filtering)
 */

// Re-export the unified store and its types
export {
  channelStore,
  type NIP29Channel as Channel,
  type NIP29Channel,
  // NIP-29 functions (backward compatible names)
  fetchNIP29Channels as fetchChannels,
  setNIP29CurrentChannel as setCurrentChannel,
  getNIP29CurrentChannel as getCurrentChannel,
  getNIP29ChannelsByCohort as getChannelsByCohort,
  getNIP29ChannelsBySection as getChannelsBySection,
  clearNIP29Channels as clearChannels,
  updateNIP29Channel as updateChannel,
  removeNIP29Channel as removeChannel,
  // Derived stores
  memberChannels,
  availableChannels,
  // Legacy derived stores
  selectedChannel,
  selectedMessages,
  userMemberStatus,
  getSelectedChannel,
  getSelectedMessages,
  getUserMemberStatus,
} from './channelStore';

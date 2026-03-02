/**
 * Unit Tests: Channel Store
 *
 * Tests for the channel management store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  channelStore,
  getSelectedChannel,
  getSelectedMessages
} from '$lib/stores/channelStore';
import type { Channel, Message } from '$lib/types/channel';

const makeChannel = (overrides: Partial<Channel> = {}): Channel => ({
  id: 'ch1',
  name: 'General',
  description: 'Test channel',
  section: 'dreamlab-lobby' as any,
  visibility: 'public',
  cohorts: [],
  isEncrypted: false,
  members: [],
  admins: [],
  pendingRequests: [],
  createdAt: 1000,
  creatorPubkey: 'creator1',
  ...overrides
} as Channel);

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg1',
  channelId: 'ch1',
  pubkey: 'user1',
  content: 'Hello',
  createdAt: 1000,
  ...overrides
} as Message);

describe('channelStore', () => {
  beforeEach(() => {
    channelStore.setChannels([]);
    channelStore.selectChannel(null);
    // Clear messages by setting an empty state via setMessages for any channel
    // The store appends, so we need a fresh baseline
    channelStore.setMessages('ch1', []);
    channelStore.setMessages('ch2', []);
  });

  describe('setChannels()', () => {
    it('should set channels', () => {
      channelStore.setChannels([makeChannel()]);
      const state = get(channelStore);
      expect(state.channels).toHaveLength(1);
    });
  });

  describe('addChannel()', () => {
    it('should add a channel to the list', () => {
      channelStore.addChannel(makeChannel({ id: 'ch1' }));
      channelStore.addChannel(makeChannel({ id: 'ch2' }));
      expect(get(channelStore).channels).toHaveLength(2);
    });
  });

  describe('selectChannel()', () => {
    it('should set selected channel ID', () => {
      channelStore.selectChannel('ch1');
      expect(get(channelStore).selectedChannelId).toBe('ch1');
    });

    it('should clear with null', () => {
      channelStore.selectChannel('ch1');
      channelStore.selectChannel(null);
      expect(get(channelStore).selectedChannelId).toBeNull();
    });
  });

  describe('setMessages()', () => {
    it('should set messages for a channel', () => {
      channelStore.setMessages('ch1', [makeMessage()]);
      expect(get(channelStore).messages['ch1']).toHaveLength(1);
    });
  });

  describe('addMessage()', () => {
    it('should add a message to the correct channel', () => {
      channelStore.addMessage(makeMessage({ id: 'msg1', channelId: 'ch1' }));
      channelStore.addMessage(makeMessage({ id: 'msg2', channelId: 'ch1' }));
      expect(get(channelStore).messages['ch1']).toHaveLength(2);
    });

    it('should initialize channel messages if empty', () => {
      channelStore.addMessage(makeMessage({ channelId: 'ch2' }));
      expect(get(channelStore).messages['ch2']).toHaveLength(1);
    });
  });

  describe('deleteMessage()', () => {
    it('should remove message from channel', () => {
      channelStore.setMessages('ch1', [
        makeMessage({ id: 'msg1' }),
        makeMessage({ id: 'msg2' })
      ]);
      channelStore.deleteMessage('ch1', 'msg1');
      expect(get(channelStore).messages['ch1']).toHaveLength(1);
      expect(get(channelStore).messages['ch1'][0].id).toBe('msg2');
    });
  });

  describe('requestJoin()', () => {
    it('should add a join request', () => {
      channelStore.requestJoin('ch1', 'pk1');
      const state = get(channelStore);
      expect(state.joinRequests).toHaveLength(1);
      expect(state.joinRequests[0].status).toBe('pending');
    });
  });

  describe('getMemberStatus()', () => {
    it('should return non-member for null userPubkey', () => {
      expect(channelStore.getMemberStatus('ch1', null)).toBe('non-member');
    });

    it('should return non-member for unknown channel', () => {
      expect(channelStore.getMemberStatus('unknown', 'pk1')).toBe('non-member');
    });

    it('should return admin for admins', () => {
      channelStore.setChannels([makeChannel({ id: 'ch1', admins: ['pk1'] })]);
      expect(channelStore.getMemberStatus('ch1', 'pk1')).toBe('admin');
    });

    it('should return member for members', () => {
      channelStore.setChannels([makeChannel({ id: 'ch1', members: ['pk1'] })]);
      expect(channelStore.getMemberStatus('ch1', 'pk1')).toBe('member');
    });

    it('should return pending for pending requests', () => {
      channelStore.setChannels([makeChannel({ id: 'ch1', pendingRequests: ['pk1'] })]);
      expect(channelStore.getMemberStatus('ch1', 'pk1')).toBe('pending');
    });
  });

  describe('approveMember()', () => {
    it('should move user from pending to members', () => {
      channelStore.setChannels([
        makeChannel({ id: 'ch1', members: [], pendingRequests: ['pk1'] })
      ]);
      channelStore.approveMember('ch1', 'pk1');
      const channel = get(channelStore).channels[0];
      expect(channel.members).toContain('pk1');
      expect(channel.pendingRequests).not.toContain('pk1');
    });

    it('should not duplicate if already member', () => {
      channelStore.setChannels([
        makeChannel({ id: 'ch1', members: ['pk1'], pendingRequests: ['pk1'] })
      ]);
      channelStore.approveMember('ch1', 'pk1');
      const channel = get(channelStore).channels[0];
      expect(channel.members.filter(m => m === 'pk1')).toHaveLength(1);
    });
  });

  describe('setLoading()', () => {
    it('should set loading state', () => {
      channelStore.setLoading(true);
      expect(get(channelStore).isLoading).toBe(true);
      channelStore.setLoading(false);
      expect(get(channelStore).isLoading).toBe(false);
    });
  });

  describe('derived: getSelectedChannel', () => {
    it('should return null when no channel selected', () => {
      channelStore.setChannels([makeChannel()]);
      channelStore.selectChannel(null);
      expect(get(getSelectedChannel())).toBeNull();
    });

    it('should return selected channel', () => {
      channelStore.setChannels([makeChannel({ id: 'ch1', name: 'General' })]);
      channelStore.selectChannel('ch1');
      const selected = get(getSelectedChannel());
      expect(selected!.name).toBe('General');
    });
  });

  describe('derived: getSelectedMessages', () => {
    it('should return empty array when no channel selected', () => {
      channelStore.selectChannel(null);
      expect(get(getSelectedMessages())).toHaveLength(0);
    });

    it('should return messages for selected channel', () => {
      channelStore.setMessages('ch1', [makeMessage(), makeMessage({ id: 'msg2' })]);
      channelStore.selectChannel('ch1');
      expect(get(getSelectedMessages())).toHaveLength(2);
    });
  });
});

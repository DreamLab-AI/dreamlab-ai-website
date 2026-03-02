import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all Svelte stores and external dependencies before importing
vi.mock('$lib/stores/notifications', () => {
	const addNotification = vi.fn();
	return {
		notificationStore: { addNotification },
		shouldNotify: vi.fn().mockReturnValue(true)
	};
});

vi.mock('$lib/stores/messages', () => ({
	messageStore: {
		subscribe: vi.fn((cb: Function) => {
			// Store the callback for later invocation
			return () => {};
		})
	}
}));

vi.mock('svelte/store', () => ({
	get: vi.fn().mockReturnValue(null),
	derived: vi.fn(),
	writable: vi.fn()
}));

vi.mock('$lib/db', () => ({
	db: {
		getChannel: vi.fn().mockResolvedValue({ name: 'Test Channel' })
	}
}));

vi.mock('$lib/stores/user', () => ({
	currentPubkey: { subscribe: vi.fn() }
}));

import {
	setActiveChannel,
	getActiveChannel,
	notifyNewDM,
	notifyJoinRequest,
	notifySystem
} from '$lib/utils/notificationIntegration';
import { notificationStore } from '$lib/stores/notifications';

describe('notificationIntegration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('setActiveChannel / getActiveChannel', () => {
		it('sets and gets the active channel', () => {
			setActiveChannel('channel-123');
			expect(getActiveChannel()).toBe('channel-123');
		});

		it('sets active channel to null', () => {
			setActiveChannel('channel-123');
			setActiveChannel(null);
			expect(getActiveChannel()).toBeNull();
		});

		it('overwrites previous channel', () => {
			setActiveChannel('channel-1');
			setActiveChannel('channel-2');
			expect(getActiveChannel()).toBe('channel-2');
		});
	});

	describe('notifyNewDM', () => {
		it('sends a DM notification', () => {
			notifyNewDM('sender-pubkey', 'Alice', 'Hello there');

			expect(notificationStore.addNotification).toHaveBeenCalledWith(
				'dm',
				'New message from Alice',
				expect.objectContaining({
					senderPubkey: 'sender-pubkey',
					senderName: 'Alice',
					url: '/dm?user=sender-pubkey'
				})
			);
		});

		it('includes sender pubkey in URL', () => {
			const pubkey = 'abc123def456';
			notifyNewDM(pubkey, 'Bob', 'preview text');

			expect(notificationStore.addNotification).toHaveBeenCalledWith(
				'dm',
				expect.any(String),
				expect.objectContaining({
					url: `/dm?user=${pubkey}`
				})
			);
		});
	});

	describe('notifyJoinRequest', () => {
		it('sends a join request notification', () => {
			notifyJoinRequest('ch-1', 'General', 'req-pub', 'Charlie');

			expect(notificationStore.addNotification).toHaveBeenCalledWith(
				'join-request',
				'Charlie wants to join General',
				expect.objectContaining({
					channelId: 'ch-1',
					channelName: 'General',
					senderPubkey: 'req-pub',
					senderName: 'Charlie',
					url: '/admin?tab=requests&channel=ch-1'
				})
			);
		});
	});

	describe('notifySystem', () => {
		it('sends a system notification with message', () => {
			notifySystem('System update available');

			expect(notificationStore.addNotification).toHaveBeenCalledWith(
				'system',
				'System update available',
				expect.objectContaining({ url: undefined })
			);
		});

		it('includes URL when provided', () => {
			notifySystem('Click here for details', '/updates');

			expect(notificationStore.addNotification).toHaveBeenCalledWith(
				'system',
				'Click here for details',
				expect.objectContaining({ url: '/updates' })
			);
		});
	});
});

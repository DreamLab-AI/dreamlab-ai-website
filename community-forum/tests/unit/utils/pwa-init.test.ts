import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock references are available inside vi.mock factories
const {
	mockInitPWA,
	mockRegisterServiceWorker,
	mockGetQueuedMessages,
	mockIsOnline,
	mockTriggerBackgroundSync,
	mockQueueMessage,
	mockGet
} = vi.hoisted(() => ({
	mockInitPWA: vi.fn(),
	mockRegisterServiceWorker: vi.fn().mockResolvedValue(null),
	mockGetQueuedMessages: vi.fn().mockResolvedValue([]),
	mockIsOnline: { subscribe: vi.fn() },
	mockTriggerBackgroundSync: vi.fn().mockResolvedValue(undefined),
	mockQueueMessage: vi.fn().mockResolvedValue(undefined),
	mockGet: vi.fn().mockReturnValue(true) // default: online
}));

vi.mock('$lib/stores/pwa', () => ({
	initPWA: mockInitPWA,
	registerServiceWorker: mockRegisterServiceWorker,
	getQueuedMessages: mockGetQueuedMessages,
	isOnline: mockIsOnline,
	triggerBackgroundSync: mockTriggerBackgroundSync,
	queueMessage: mockQueueMessage
}));

vi.mock('svelte/store', () => ({
	get: mockGet
}));

import { initializePWA, sendMessageWithOfflineSupport } from '$lib/utils/pwa-init';
import { get } from 'svelte/store';

describe('pwa-init', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('initializePWA', () => {
		it('calls initPWA and registerServiceWorker', async () => {
			await initializePWA();
			expect(mockInitPWA).toHaveBeenCalled();
			expect(mockRegisterServiceWorker).toHaveBeenCalled();
		});

		it('checks for queued messages when registration succeeds', async () => {
			mockRegisterServiceWorker.mockResolvedValueOnce({ active: true });
			await initializePWA();
			expect(mockGetQueuedMessages).toHaveBeenCalled();
		});

		it('triggers background sync when online and messages are queued', async () => {
			mockRegisterServiceWorker.mockResolvedValueOnce({ active: true });
			mockGetQueuedMessages.mockResolvedValueOnce([{ id: '1' }, { id: '2' }]);
			mockGet.mockReturnValue(true); // online

			await initializePWA();

			expect(mockTriggerBackgroundSync).toHaveBeenCalled();
		});

		it('does not trigger sync when no messages are queued', async () => {
			mockRegisterServiceWorker.mockResolvedValueOnce({ active: true });
			mockGetQueuedMessages.mockResolvedValueOnce([]);

			await initializePWA();

			expect(mockTriggerBackgroundSync).not.toHaveBeenCalled();
		});

		it('does not check messages when registration returns null', async () => {
			mockRegisterServiceWorker.mockResolvedValueOnce(null);

			await initializePWA();

			expect(mockGetQueuedMessages).not.toHaveBeenCalled();
		});

		it('handles getQueuedMessages errors gracefully', async () => {
			mockRegisterServiceWorker.mockResolvedValueOnce({ active: true });
			mockGetQueuedMessages.mockRejectedValueOnce(new Error('DB error'));

			// Should not throw
			await expect(initializePWA()).resolves.not.toThrow();
		});
	});

	describe('sendMessageWithOfflineSupport', () => {
		const mockEvent = {
			kind: 1,
			created_at: 1234567890,
			tags: [],
			content: 'test',
			pubkey: 'abc'
		};
		const relayUrls = ['wss://relay.example.com'];
		const mockSendFn = vi.fn().mockResolvedValue(undefined);

		it('sends immediately when online', async () => {
			mockGet.mockReturnValue(true);

			await sendMessageWithOfflineSupport(mockEvent, relayUrls, mockSendFn);

			expect(mockSendFn).toHaveBeenCalledWith(mockEvent, relayUrls);
		});

		it('queues message when offline', async () => {
			mockGet.mockReturnValue(false);

			await sendMessageWithOfflineSupport(mockEvent, relayUrls, mockSendFn);

			expect(mockSendFn).not.toHaveBeenCalled();
			// queueMessage is dynamically imported, so we check via mockQueueMessage
			expect(mockQueueMessage).toHaveBeenCalledWith(mockEvent, relayUrls);
		});

		it('queues message when send fails while online', async () => {
			mockGet.mockReturnValue(true);
			mockSendFn.mockRejectedValueOnce(new Error('Network error'));

			await sendMessageWithOfflineSupport(mockEvent, relayUrls, mockSendFn);

			expect(mockQueueMessage).toHaveBeenCalledWith(mockEvent, relayUrls);
		});
	});
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to ensure mock ref is available inside vi.mock factory
const { mockInitializeSearchIndex } = vi.hoisted(() => ({
	mockInitializeSearchIndex: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('$lib/utils/buildSearchIndex', () => ({
	initializeSearchIndex: mockInitializeSearchIndex
}));

import { initSearch, resetSearchInit } from '$lib/init/searchInit';

describe('searchInit', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetSearchInit();
	});

	describe('initSearch', () => {
		it('calls initializeSearchIndex in browser environment', async () => {
			await initSearch();
			expect(mockInitializeSearchIndex).toHaveBeenCalledTimes(1);
		});

		it('only initializes once', async () => {
			await initSearch();
			await initSearch();
			expect(mockInitializeSearchIndex).toHaveBeenCalledTimes(1);
		});

		it('handles initialization errors gracefully', async () => {
			mockInitializeSearchIndex.mockRejectedValueOnce(new Error('Init failed'));
			await expect(initSearch()).resolves.not.toThrow();
		});

		it('resets initialized flag on error so retry is possible', async () => {
			mockInitializeSearchIndex.mockRejectedValueOnce(new Error('Init failed'));
			await initSearch();

			// After error, initialized is reset to false, so another call should work
			mockInitializeSearchIndex.mockResolvedValueOnce(undefined);
			await initSearch();
			expect(mockInitializeSearchIndex).toHaveBeenCalledTimes(2);
		});
	});

	describe('resetSearchInit', () => {
		it('allows re-initialization after reset', async () => {
			await initSearch();
			expect(mockInitializeSearchIndex).toHaveBeenCalledTimes(1);

			resetSearchInit();
			await initSearch();
			expect(mockInitializeSearchIndex).toHaveBeenCalledTimes(2);
		});
	});
});

import { describe, it, expect } from 'vitest';
import { formatUnreadCount } from '$lib/utils/readPosition';

describe('readPosition', () => {
	describe('formatUnreadCount', () => {
		it('returns empty string for zero', () => {
			expect(formatUnreadCount(0)).toBe('');
		});

		it('returns count as string for 1-99', () => {
			expect(formatUnreadCount(1)).toBe('1');
			expect(formatUnreadCount(50)).toBe('50');
			expect(formatUnreadCount(99)).toBe('99');
		});

		it('returns 99+ for counts over 99', () => {
			expect(formatUnreadCount(100)).toBe('99+');
			expect(formatUnreadCount(999)).toBe('99+');
			expect(formatUnreadCount(10000)).toBe('99+');
		});
	});
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	isHapticsSupported,
	haptic,
	hapticTap,
	hapticSelect,
	hapticSuccess,
	hapticWarning,
	hapticError,
	hapticCustom,
	hapticStop
} from '$lib/utils/haptics';

describe('haptics', () => {
	let vibrateSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vibrateSpy = vi.fn();
		Object.defineProperty(navigator, 'vibrate', {
			value: vibrateSpy,
			writable: true,
			configurable: true
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('isHapticsSupported', () => {
		it('returns true when vibrate API is available', () => {
			expect(isHapticsSupported()).toBe(true);
		});

		it('returns false when vibrate API is missing', () => {
			// Save the original descriptor and delete the property entirely
			// ('vibrate' in navigator) must be false, not just undefined
			const descriptor = Object.getOwnPropertyDescriptor(navigator, 'vibrate');
			delete (navigator as any).vibrate;
			expect(isHapticsSupported()).toBe(false);
			// Restore
			if (descriptor) {
				Object.defineProperty(navigator, 'vibrate', descriptor);
			}
		});
	});

	describe('haptic', () => {
		it('triggers light vibration by default', () => {
			haptic();
			expect(vibrateSpy).toHaveBeenCalledWith(10);
		});

		it('triggers medium vibration', () => {
			haptic('medium');
			expect(vibrateSpy).toHaveBeenCalledWith(25);
		});

		it('triggers heavy vibration', () => {
			haptic('heavy');
			expect(vibrateSpy).toHaveBeenCalledWith(50);
		});

		it('triggers success pattern', () => {
			haptic('success');
			expect(vibrateSpy).toHaveBeenCalledWith([10, 50, 10]);
		});

		it('triggers warning pattern', () => {
			haptic('warning');
			expect(vibrateSpy).toHaveBeenCalledWith([25, 50, 25]);
		});

		it('triggers error pattern', () => {
			haptic('error');
			expect(vibrateSpy).toHaveBeenCalledWith([50, 100, 50]);
		});

		it('triggers selection pattern', () => {
			haptic('selection');
			expect(vibrateSpy).toHaveBeenCalledWith(5);
		});

		it('does nothing when haptics not supported', () => {
			const descriptor = Object.getOwnPropertyDescriptor(navigator, 'vibrate');
			delete (navigator as any).vibrate;
			haptic('light');
			if (descriptor) Object.defineProperty(navigator, 'vibrate', descriptor);
		});

		it('silently catches errors from vibrate', () => {
			vibrateSpy.mockImplementation(() => {
				throw new Error('Vibration failed');
			});
			// Should not throw
			expect(() => haptic('light')).not.toThrow();
		});
	});

	describe('convenience functions', () => {
		it('hapticTap calls vibrate with light pattern', () => {
			hapticTap();
			expect(vibrateSpy).toHaveBeenCalledWith(10);
		});

		it('hapticSelect calls vibrate with selection pattern', () => {
			hapticSelect();
			expect(vibrateSpy).toHaveBeenCalledWith(5);
		});

		it('hapticSuccess calls vibrate with success pattern', () => {
			hapticSuccess();
			expect(vibrateSpy).toHaveBeenCalledWith([10, 50, 10]);
		});

		it('hapticWarning calls vibrate with warning pattern', () => {
			hapticWarning();
			expect(vibrateSpy).toHaveBeenCalledWith([25, 50, 25]);
		});

		it('hapticError calls vibrate with error pattern', () => {
			hapticError();
			expect(vibrateSpy).toHaveBeenCalledWith([50, 100, 50]);
		});
	});

	describe('hapticCustom', () => {
		it('triggers custom single-value pattern', () => {
			hapticCustom(100);
			expect(vibrateSpy).toHaveBeenCalledWith(100);
		});

		it('triggers custom array pattern', () => {
			hapticCustom([100, 200, 300]);
			expect(vibrateSpy).toHaveBeenCalledWith([100, 200, 300]);
		});

		it('does nothing when haptics not supported', () => {
			const descriptor = Object.getOwnPropertyDescriptor(navigator, 'vibrate');
			delete (navigator as any).vibrate;
			hapticCustom(100);
			if (descriptor) Object.defineProperty(navigator, 'vibrate', descriptor);
		});

		it('silently catches errors', () => {
			vibrateSpy.mockImplementation(() => {
				throw new Error('Vibration failed');
			});
			expect(() => hapticCustom(100)).not.toThrow();
		});
	});

	describe('hapticStop', () => {
		it('calls vibrate with 0 to stop vibration', () => {
			hapticStop();
			expect(vibrateSpy).toHaveBeenCalledWith(0);
		});

		it('does nothing when haptics not supported', () => {
			const descriptor = Object.getOwnPropertyDescriptor(navigator, 'vibrate');
			delete (navigator as any).vibrate;
			hapticStop();
			if (descriptor) Object.defineProperty(navigator, 'vibrate', descriptor);
		});

		it('silently catches errors', () => {
			vibrateSpy.mockImplementation(() => {
				throw new Error('Vibration failed');
			});
			expect(() => hapticStop()).not.toThrow();
		});
	});
});

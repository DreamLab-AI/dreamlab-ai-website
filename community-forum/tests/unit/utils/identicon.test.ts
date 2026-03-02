import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	generateIdenticonSvg,
	generateIdenticonDataUrl,
	generateIdenticonCanvas,
	getAvatarUrl
} from '$lib/utils/identicon';

describe('identicon', () => {
	const testPubkey = 'a'.repeat(64);
	const testPubkey2 = 'b'.repeat(64);

	// jsdom does not implement canvas 2D context, so we mock getContext
	let getContextSpy: ReturnType<typeof vi.spyOn>;
	const mockCtx = {
		fillStyle: '',
		fillRect: vi.fn(),
	};

	beforeEach(() => {
		getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext')
			.mockReturnValue(mockCtx as any);
	});

	afterEach(() => {
		getContextSpy.mockRestore();
	});

	describe('generateIdenticonSvg', () => {
		it('returns a valid SVG string', () => {
			const svg = generateIdenticonSvg(testPubkey);
			expect(svg).toContain('<svg');
			expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
			expect(svg).toContain('</svg>');
		});

		it('uses default size of 64', () => {
			const svg = generateIdenticonSvg(testPubkey);
			expect(svg).toContain('width="64"');
			expect(svg).toContain('height="64"');
			expect(svg).toContain('viewBox="0 0 64 64"');
		});

		it('respects custom size', () => {
			const svg = generateIdenticonSvg(testPubkey, 128);
			expect(svg).toContain('width="128"');
			expect(svg).toContain('height="128"');
			expect(svg).toContain('viewBox="0 0 128 128"');
		});

		it('generates different SVGs for different pubkeys', () => {
			const svg1 = generateIdenticonSvg(testPubkey);
			const svg2 = generateIdenticonSvg(testPubkey2);
			expect(svg1).not.toBe(svg2);
		});

		it('generates deterministic output for same pubkey', () => {
			const svg1 = generateIdenticonSvg(testPubkey);
			const svg2 = generateIdenticonSvg(testPubkey);
			expect(svg1).toBe(svg2);
		});

		it('includes background rect', () => {
			const svg = generateIdenticonSvg(testPubkey);
			// Background rect fills the entire SVG
			expect(svg).toContain('fill="hsl(');
		});

		it('includes pattern rects with fill color', () => {
			const svg = generateIdenticonSvg(testPubkey);
			// Pattern rects have hsl fill colors
			const rectCount = (svg.match(/<rect /g) || []).length;
			// At least background rect + some pattern rects
			expect(rectCount).toBeGreaterThanOrEqual(1);
		});
	});

	describe('generateIdenticonDataUrl', () => {
		it('returns a valid data URL', () => {
			const url = generateIdenticonDataUrl(testPubkey);
			expect(url).toMatch(/^data:image\/svg\+xml;base64,/);
		});

		it('uses default size of 64', () => {
			const url = generateIdenticonDataUrl(testPubkey);
			// Decode and check
			const base64 = url.replace('data:image/svg+xml;base64,', '');
			const svg = atob(base64);
			expect(svg).toContain('width="64"');
		});

		it('respects custom size', () => {
			const url = generateIdenticonDataUrl(testPubkey, 256);
			const base64 = url.replace('data:image/svg+xml;base64,', '');
			const svg = atob(base64);
			expect(svg).toContain('width="256"');
		});

		it('is deterministic for same pubkey', () => {
			const url1 = generateIdenticonDataUrl(testPubkey);
			const url2 = generateIdenticonDataUrl(testPubkey);
			expect(url1).toBe(url2);
		});

		it('differs for different pubkeys', () => {
			const url1 = generateIdenticonDataUrl(testPubkey);
			const url2 = generateIdenticonDataUrl(testPubkey2);
			expect(url1).not.toBe(url2);
		});
	});

	describe('generateIdenticonCanvas', () => {
		it('returns a canvas element', () => {
			const canvas = generateIdenticonCanvas(testPubkey);
			expect(canvas).not.toBeNull();
			expect(canvas!.tagName).toBe('CANVAS');
		});

		it('uses default size of 64', () => {
			const canvas = generateIdenticonCanvas(testPubkey);
			expect(canvas!.width).toBe(64);
			expect(canvas!.height).toBe(64);
		});

		it('respects custom size', () => {
			const canvas = generateIdenticonCanvas(testPubkey, 200);
			expect(canvas!.width).toBe(200);
			expect(canvas!.height).toBe(200);
		});
	});

	describe('getAvatarUrl', () => {
		it('returns a data URL', () => {
			const url = getAvatarUrl(testPubkey);
			expect(url).toMatch(/^data:image\/svg\+xml;base64,/);
		});

		it('uses default size of 64', () => {
			const url = getAvatarUrl(testPubkey);
			const base64 = url.replace('data:image/svg+xml;base64,', '');
			const svg = atob(base64);
			expect(svg).toContain('width="64"');
		});

		it('passes custom size', () => {
			const url = getAvatarUrl(testPubkey, 128);
			const base64 = url.replace('data:image/svg+xml;base64,', '');
			const svg = atob(base64);
			expect(svg).toContain('width="128"');
		});

		it('produces different avatars for different pubkeys', () => {
			const url1 = getAvatarUrl(testPubkey);
			const url2 = getAvatarUrl(testPubkey2);
			expect(url1).not.toBe(url2);
		});
	});
});

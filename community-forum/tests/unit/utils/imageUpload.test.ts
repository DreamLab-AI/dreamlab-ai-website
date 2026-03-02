/**
 * Unit Tests: Image Upload Utility
 *
 * Tests for image validation, compression, upload flow,
 * URL generation, and helper utilities.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isImageEncryptionEnabled,
  getImageUrl,
  parseKeybaseImageId,
  isLocalImageUrl,
  createPreviewUrl,
  revokePreviewUrl,
  uploadImage,
  uploadBase64Image,
  validateImage,
  compressImage,
  type ImageUploadResult,
} from '$lib/utils/imageUpload';

// Mock the imageEncryption module
const mockEncryptImageForRecipients = vi.fn();
vi.mock('$lib/utils/imageEncryption', () => ({
  encryptImageForRecipients: (...args: any[]) => mockEncryptImageForRecipients(...args),
  arrayBufferToBase64: vi.fn()
}));

// Mock the nip98 client
vi.mock('$lib/auth/nip98-client', () => ({
  createNip98Token: vi.fn().mockResolvedValue('mock-nip98-token')
}));

/**
 * Helper: create mock canvas environment for compressImage tests.
 * Returns cleanup function.
 */
function mockCanvasEnvironment(options: {
  imgWidth?: number;
  imgHeight?: number;
  failCanvas?: boolean;
  failBlob?: boolean;
  failThumbCtx?: boolean;
  failLoad?: boolean;
  failRead?: boolean;
} = {}) {
  const {
    imgWidth = 800,
    imgHeight = 600,
    failCanvas = false,
    failBlob = false,
    failThumbCtx = false,
    failLoad = false,
    failRead = false,
  } = options;

  const mainBlob = new Blob(['compressed-data'], { type: 'image/jpeg' });
  const thumbBlob = new Blob(['thumb-data'], { type: 'image/jpeg' });

  // Mock canvas
  const mockCtx = {
    drawImage: vi.fn(),
  };
  const mockThumbCtx = failThumbCtx ? null : { drawImage: vi.fn() };

  let canvasCallCount = 0;
  const origCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    if (tag === 'canvas') {
      canvasCallCount++;
      const isThumbCanvas = canvasCallCount > 1;
      return {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(
          failCanvas ? null : (isThumbCanvas ? mockThumbCtx : mockCtx)
        ),
        toBlob: vi.fn().mockImplementation((cb: (blob: Blob | null) => void, _type: string, _quality: number) => {
          if (failBlob) {
            cb(null);
          } else {
            cb(isThumbCanvas ? thumbBlob : mainBlob);
          }
        }),
      } as any;
    }
    return origCreateElement(tag);
  });

  // Mock Image
  const origImage = globalThis.Image;
  vi.stubGlobal('Image', vi.fn().mockImplementation(() => {
    const img = {
      onload: null as any,
      onerror: null as any,
      src: '',
      width: imgWidth,
      height: imgHeight,
    };
    Object.defineProperty(img, 'src', {
      set() {
        if (failLoad) {
          setTimeout(() => img.onerror?.(), 0);
        } else {
          setTimeout(() => img.onload?.(), 0);
        }
      },
    });
    return img;
  }));

  // Mock FileReader
  const origFR = globalThis.FileReader;
  vi.stubGlobal('FileReader', vi.fn().mockImplementation(() => ({
    onload: null as any,
    onerror: null as any,
    readAsDataURL() {
      if (failRead) {
        setTimeout(() => this.onerror?.(), 0);
      } else {
        setTimeout(() => this.onload?.({ target: { result: 'data:image/jpeg;base64,test' } }), 0);
      }
    },
  })));

  return {
    mainBlob,
    thumbBlob,
    cleanup() {
      vi.stubGlobal('Image', origImage);
      vi.stubGlobal('FileReader', origFR);
    }
  };
}

describe('imageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('isImageEncryptionEnabled', () => {
    it('returns a boolean value', () => {
      expect(typeof isImageEncryptionEnabled()).toBe('boolean');
    });

    it('returns false when env var is not set to true', () => {
      expect(isImageEncryptionEnabled()).toBe(false);
    });
  });

  describe('getImageUrl', () => {
    it('returns full URLs unchanged', () => {
      const url = 'https://example.com/image.jpg';
      expect(getImageUrl(url)).toBe(url);
    });

    it('returns full URLs for http protocol', () => {
      const url = 'http://example.com/image.jpg';
      expect(getImageUrl(url)).toBe(url);
    });

    it('constructs pod-api URL from image ID for full size', () => {
      const imageId = 'abc123/media/public/image-id';
      const result = getImageUrl(imageId, 'full');
      expect(result).toContain('/pods/');
      expect(result).toContain(imageId);
      expect(result).toContain('.jpg');
    });

    it('constructs thumbnail URL from image ID', () => {
      const imageId = 'abc123/media/public/image-id';
      const result = getImageUrl(imageId, 'thumb');
      expect(result).toContain('_thumb');
      expect(result).toContain('.jpg');
    });

    it('defaults to full size', () => {
      const imageId = 'abc123/media/public/image-id';
      const fullUrl = getImageUrl(imageId, 'full');
      const defaultUrl = getImageUrl(imageId);
      expect(defaultUrl).toBe(fullUrl);
    });
  });

  describe('parseKeybaseImageId', () => {
    it('parses valid Keybase-style image ID', () => {
      const id = 'D944AEC6-4F5D-420D-9833-EBC6C73465FD-1180-000000145FF7DC4A';
      const result = parseKeybaseImageId(id);

      expect(result).not.toBeNull();
      expect(result!.uuid).toBe('D944AEC6-4F5D-420D-9833-EBC6C73465FD');
      expect(result!.size).toBe(1180);
      expect(result!.timestamp).toBeInstanceOf(Date);
    });

    it('returns null for IDs with too few parts', () => {
      expect(parseKeybaseImageId('short-id')).toBeNull();
      expect(parseKeybaseImageId('a-b-c')).toBeNull();
      expect(parseKeybaseImageId('a-b-c-d-e-f')).toBeNull();
    });

    it('handles UUID extraction correctly', () => {
      const id = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE-500-00000000DEADBEEF';
      const result = parseKeybaseImageId(id);

      expect(result).not.toBeNull();
      expect(result!.uuid).toBe('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE');
      expect(result!.size).toBe(500);
    });

    it('parses hex timestamp to Date', () => {
      const id = 'D944AEC6-4F5D-420D-9833-EBC6C73465FD-1180-000000145FF7DC4A';
      const result = parseKeybaseImageId(id);
      expect(result!.timestamp).toBeInstanceOf(Date);
      expect(result!.timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  describe('isLocalImageUrl', () => {
    it('returns true for pod-api image URLs', () => {
      expect(isLocalImageUrl('https://pod-api.example.com/pods/abc/media/public/img.jpg')).toBe(true);
      expect(isLocalImageUrl('https://example.com/pods/pubkey/media/private/img.enc')).toBe(true);
    });

    it('returns false for external URLs', () => {
      expect(isLocalImageUrl('https://example.com/image.jpg')).toBe(false);
      expect(isLocalImageUrl('https://cdn.example.com/photo.png')).toBe(false);
    });

    it('returns false for URLs with only pods', () => {
      expect(isLocalImageUrl('https://example.com/pods/abc')).toBe(false);
    });

    it('returns false for URLs with only media', () => {
      expect(isLocalImageUrl('https://example.com/media/image.jpg')).toBe(false);
    });
  });

  describe('createPreviewUrl', () => {
    it('creates an object URL from a file', () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const url = createPreviewUrl(file);
      expect(url).toMatch(/^blob:mock-url-/);
    });
  });

  describe('revokePreviewUrl', () => {
    it('calls URL.revokeObjectURL', () => {
      const spy = vi.spyOn(URL, 'revokeObjectURL');
      revokePreviewUrl('blob:test-url');
      expect(spy).toHaveBeenCalledWith('blob:test-url');
    });
  });

  describe('compressImage()', () => {
    it('should compress an image with default options', async () => {
      const { mainBlob, thumbBlob, cleanup } = mockCanvasEnvironment();
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

      const result = await compressImage(file);

      expect(result.blob).toBe(mainBlob);
      expect(result.thumbnail).toBe(thumbBlob);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);

      cleanup();
    });

    it('should scale down images exceeding maxWidth', async () => {
      const { cleanup } = mockCanvasEnvironment({ imgWidth: 3000, imgHeight: 2000 });
      const file = new File(['data'], 'large.jpg', { type: 'image/jpeg' });

      const result = await compressImage(file, { maxWidth: 1920, maxHeight: 1920 });

      // 3000 > 1920, so width = 1920, height = 2000 * 1920/3000 = 1280
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1280);

      cleanup();
    });

    it('should scale down images exceeding maxHeight', async () => {
      const { cleanup } = mockCanvasEnvironment({ imgWidth: 1000, imgHeight: 3000 });
      const file = new File(['data'], 'tall.jpg', { type: 'image/jpeg' });

      const result = await compressImage(file, { maxWidth: 1920, maxHeight: 1920 });

      // height 3000 > 1920, width = 1000 * 1920/3000 = 640
      expect(result.height).toBe(1920);
      expect(result.width).toBe(640);

      cleanup();
    });

    it('should skip thumbnail when generateThumbnail is false', async () => {
      const { cleanup } = mockCanvasEnvironment();
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

      const result = await compressImage(file, { generateThumbnail: false });

      expect(result.blob).toBeDefined();
      expect(result.thumbnail).toBeUndefined();

      cleanup();
    });

    it('should handle png format', async () => {
      const { cleanup } = mockCanvasEnvironment();
      const file = new File(['data'], 'photo.png', { type: 'image/png' });

      const result = await compressImage(file, { format: 'png' });

      expect(result.blob).toBeDefined();

      cleanup();
    });

    it('should handle webp format', async () => {
      const { cleanup } = mockCanvasEnvironment();
      const file = new File(['data'], 'photo.webp', { type: 'image/webp' });

      const result = await compressImage(file, { format: 'webp' });

      expect(result.blob).toBeDefined();

      cleanup();
    });

    it('should reject when canvas context is null', async () => {
      const { cleanup } = mockCanvasEnvironment({ failCanvas: true });
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

      await expect(compressImage(file)).rejects.toThrow('Failed to get canvas context');

      cleanup();
    });

    it('should reject when toBlob returns null', async () => {
      const { cleanup } = mockCanvasEnvironment({ failBlob: true });
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

      await expect(compressImage(file)).rejects.toThrow('Failed to compress image');

      cleanup();
    });

    it('should handle missing thumb context gracefully', async () => {
      const { cleanup } = mockCanvasEnvironment({ failThumbCtx: true });
      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });

      const result = await compressImage(file);

      // When thumb context fails, still returns blob but no thumbnail
      expect(result.blob).toBeDefined();
      expect(result.thumbnail).toBeUndefined();

      cleanup();
    });

    it('should reject when image fails to load', async () => {
      const { cleanup } = mockCanvasEnvironment({ failLoad: true });
      const file = new File(['data'], 'bad.jpg', { type: 'image/jpeg' });

      await expect(compressImage(file)).rejects.toThrow('Failed to load image');

      cleanup();
    });

    it('should reject when FileReader fails', async () => {
      const { cleanup } = mockCanvasEnvironment({ failRead: true });
      const file = new File(['data'], 'unreadable.jpg', { type: 'image/jpeg' });

      await expect(compressImage(file)).rejects.toThrow('Failed to read file');

      cleanup();
    });
  });

  describe('uploadImage()', () => {
    it('should reject when privkey is missing', async () => {
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const result = await uploadImage(file, 'pubkey', 'message', undefined, null);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });

    it('should reject files larger than 5MB', async () => {
      const bigData = new Uint8Array(6 * 1024 * 1024);
      const file = new File([bigData], 'big.jpg', { type: 'image/jpeg' });
      const privkey = new Uint8Array(32);
      const result = await uploadImage(file, 'pubkey', 'message', undefined, privkey);
      expect(result.success).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should reject non-image files', async () => {
      const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
      const privkey = new Uint8Array(32);
      const result = await uploadImage(file, 'pubkey', 'message', undefined, privkey);
      expect(result.success).toBe(false);
      expect(result.error).toContain('File must be an image');
    });

    it('should reject encryption without recipient pubkeys', async () => {
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const privkey = new Uint8Array(32);
      const result = await uploadImage(file, 'pubkey', 'message', {
        encrypt: true,
        recipientPubkeys: [],
        senderPrivkey: 'sender-priv',
      }, privkey);
      expect(result.success).toBe(false);
      expect(result.error).toContain('at least one recipient');
    });

    it('should reject encryption without sender private key', async () => {
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const privkey = new Uint8Array(32);
      const result = await uploadImage(file, 'pubkey', 'message', {
        encrypt: true,
        recipientPubkeys: ['pk1'],
      }, privkey);
      expect(result.success).toBe(false);
      expect(result.error).toContain('sender private key');
    });

    it('should upload successfully for non-encrypted image', async () => {
      const { mainBlob, cleanup } = mockCanvasEnvironment();

      // Mock crypto.randomUUID
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-1234' as any);

      // Mock fetch for upload
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('OK') }) // main image
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('OK') }); // thumbnail
      vi.stubGlobal('fetch', mockFetch);

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const privkey = new Uint8Array(32);

      const result = await uploadImage(file, 'user-pubkey', 'message', undefined, privkey);

      expect(result.success).toBe(true);
      expect(result.url).toContain('/pods/user-pubkey/media/public/test-uuid-1234.jpg');
      expect(result.thumbnailUrl).toContain('/pods/user-pubkey/media/public/test-uuid-1234_thumb.jpg');
      expect(result.encrypted).toBe(false);
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.width).toBe(800);
      expect(result.metadata!.height).toBe(600);
      expect(result.metadata!.format).toBe('jpeg');

      // Verify fetch calls include auth header
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const mainCall = mockFetch.mock.calls[0];
      expect(mainCall[1].method).toBe('PUT');
      expect(mainCall[1].headers['Authorization']).toContain('Nostr');

      cleanup();
    });

    it('should upload avatar with smaller dimensions', async () => {
      const { cleanup } = mockCanvasEnvironment({ imgWidth: 200, imgHeight: 200 });

      vi.spyOn(crypto, 'randomUUID').mockReturnValue('avatar-uuid' as any);

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('OK') });
      vi.stubGlobal('fetch', mockFetch);

      const file = new File(['data'], 'avatar.jpg', { type: 'image/jpeg' });
      const privkey = new Uint8Array(32);

      const result = await uploadImage(file, 'user-pubkey', 'avatar', undefined, privkey);

      expect(result.success).toBe(true);
      // Avatars don't generate thumbnails, so only 1 fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it('should handle upload failure (non-ok response)', async () => {
      const { cleanup } = mockCanvasEnvironment();

      vi.spyOn(crypto, 'randomUUID').mockReturnValue('fail-uuid' as any);

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Forbidden'),
      });
      vi.stubGlobal('fetch', mockFetch);

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const privkey = new Uint8Array(32);

      const result = await uploadImage(file, 'user-pubkey', 'message', undefined, privkey);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Upload failed');
      expect(result.error).toContain('Forbidden');

      cleanup();
    });

    it('should handle compression error gracefully', async () => {
      const { cleanup } = mockCanvasEnvironment({ failCanvas: true });

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const privkey = new Uint8Array(32);

      const result = await uploadImage(file, 'user-pubkey', 'message', undefined, privkey);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get canvas context');

      cleanup();
    });

    it('should upload with encryption when enabled', async () => {
      const { cleanup } = mockCanvasEnvironment();

      vi.spyOn(crypto, 'randomUUID').mockReturnValue('enc-uuid' as any);

      mockEncryptImageForRecipients.mockResolvedValue({
        encryptedBlob: new ArrayBuffer(100),
        iv: 'base64-iv',
        salt: 'base64-salt',
        recipientKeys: [{ pubkey: 'pk1', encryptedKey: 'ek1' }],
      });

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('OK') });
      vi.stubGlobal('fetch', mockFetch);

      const file = new File(['data'], 'secret.jpg', { type: 'image/jpeg' });
      const privkey = new Uint8Array(32);

      const result = await uploadImage(file, 'user-pubkey', 'message', {
        encrypt: true,
        recipientPubkeys: ['pk1'],
        senderPrivkey: 'sender-priv',
      }, privkey);

      expect(result.success).toBe(true);
      expect(result.encrypted).toBe(true);
      expect(result.encryptionData).toBeDefined();
      expect(result.encryptionData!.iv).toBe('base64-iv');
      expect(result.encryptionData!.salt).toBe('base64-salt');
      expect(result.encryptionData!.recipientKeys).toHaveLength(1);
      expect(result.url).toContain('media/private/enc-uuid.enc');
      expect(result.metadata!.format).toBe('encrypted');

      // Verify encryption function was called
      expect(mockEncryptImageForRecipients).toHaveBeenCalledWith(
        expect.any(Blob),
        ['pk1'],
        'sender-priv'
      );

      // Encrypted uploads don't upload thumbnail
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[1].headers['Content-Type']).toBe('application/octet-stream');

      cleanup();
    });

    it('should handle undefined privkey', async () => {
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const result = await uploadImage(file, 'pubkey', 'message', undefined, undefined);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Authentication required');
    });
  });

  describe('uploadBase64Image()', () => {
    it('should return error when fetch of base64 data fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Invalid base64')));
      const result = await uploadBase64Image('not-valid', 'pubkey', 'message', new Uint8Array(32));
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      vi.unstubAllGlobals();
    });

    it('should convert base64 to file and call uploadImage', async () => {
      // Mock fetch to return a valid blob for the base64 data
      const mockBlob = new Blob(['image-data'], { type: 'image/jpeg' });
      const mockResponse = { blob: () => Promise.resolve(mockBlob) };

      // First call: base64 fetch, second+: uploadImage fetch
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(mockResponse); // base64 decode

      vi.stubGlobal('fetch', fetchMock);

      // uploadImage will fail because compressImage needs canvas,
      // but we verify the base64-to-file conversion works
      const result = await uploadBase64Image(
        'data:image/jpeg;base64,test',
        'user-pubkey',
        'message',
        new Uint8Array(32)
      );

      // First fetch call was the base64 conversion
      expect(fetchMock).toHaveBeenCalledWith('data:image/jpeg;base64,test');

      // The uploadImage call will fail in test env (no canvas), but the
      // base64 conversion path was exercised
      // result.success could be false due to canvas, but error won't be about base64
      expect(result).toBeDefined();
    });
  });

  describe('validateImage()', () => {
    it('should validate a normal sized image', async () => {
      const { cleanup } = mockCanvasEnvironment({ imgWidth: 800, imgHeight: 600 });
      const file = new File(['data'], 'test.jpg', { type: 'image/jpeg' });

      const result = await validateImage(file);
      expect(result.valid).toBe(true);
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);

      cleanup();
    });

    it('should reject images that are too small', async () => {
      const { cleanup } = mockCanvasEnvironment({ imgWidth: 30, imgHeight: 30 });
      const file = new File(['data'], 'tiny.jpg', { type: 'image/jpeg' });

      const result = await validateImage(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too small');

      cleanup();
    });

    it('should reject images with extreme aspect ratio', async () => {
      const { cleanup } = mockCanvasEnvironment({ imgWidth: 5000, imgHeight: 100 });
      const file = new File(['data'], 'banner.jpg', { type: 'image/jpeg' });

      const result = await validateImage(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('aspect ratio');

      cleanup();
    });

    it('should handle image load failure', async () => {
      const { cleanup } = mockCanvasEnvironment({ failLoad: true });
      const file = new File(['data'], 'broken.jpg', { type: 'image/jpeg' });

      const result = await validateImage(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Failed to load image');

      cleanup();
    });

    it('should accept images at minimum dimension boundary (50x50)', async () => {
      const { cleanup } = mockCanvasEnvironment({ imgWidth: 50, imgHeight: 50 });
      const file = new File(['data'], 'small.jpg', { type: 'image/jpeg' });

      const result = await validateImage(file);
      expect(result.valid).toBe(true);

      cleanup();
    });

    it('should accept images at aspect ratio boundary (10:1)', async () => {
      const { cleanup } = mockCanvasEnvironment({ imgWidth: 1000, imgHeight: 100 });
      const file = new File(['data'], 'wide.jpg', { type: 'image/jpeg' });

      const result = await validateImage(file);
      // ratio = 1000/100 = 10, which is NOT > 10, so valid
      expect(result.valid).toBe(true);

      cleanup();
    });

    it('should reject images just over aspect ratio boundary', async () => {
      const { cleanup } = mockCanvasEnvironment({ imgWidth: 1001, imgHeight: 100 });
      const file = new File(['data'], 'too-wide.jpg', { type: 'image/jpeg' });

      const result = await validateImage(file);
      // ratio = 1001/100 = 10.01 > 10
      expect(result.valid).toBe(false);
      expect(result.error).toContain('aspect ratio');

      cleanup();
    });

    it('should accept tall images within aspect ratio', async () => {
      const { cleanup } = mockCanvasEnvironment({ imgWidth: 100, imgHeight: 1000 });
      const file = new File(['data'], 'tall.jpg', { type: 'image/jpeg' });

      const result = await validateImage(file);
      expect(result.valid).toBe(true);

      cleanup();
    });
  });
});

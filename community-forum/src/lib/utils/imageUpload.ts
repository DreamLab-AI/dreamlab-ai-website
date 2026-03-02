/**
 * Image Upload Utility
 * Client-side image compression and upload to pod-api (Cloudflare Worker + R2)
 * Supports optional client-side encryption for private channels/DMs
 */

import {
  encryptImageForRecipients,
  arrayBufferToBase64,
  type RecipientKey,
} from './imageEncryption';
import { createNip98Token } from '$lib/auth/nip98-client';

// Re-export RecipientKey for use by encryptedImageTags.ts
export type { RecipientKey } from './imageEncryption';

// Configuration from environment
const POD_API_URL = import.meta.env.VITE_POD_API_URL || 'https://dreamlab-pod-api.solitary-paper-764d.workers.dev';
const IMAGE_ENCRYPTION_ENABLED = import.meta.env.VITE_IMAGE_ENCRYPTION_ENABLED === 'true';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB original limit
const MAX_DIMENSION = 1920; // Max width/height
const JPEG_QUALITY = 0.85;
const THUMBNAIL_SIZE = 200;

/**
 * Check if image encryption feature is enabled
 */
export function isImageEncryptionEnabled(): boolean {
  return IMAGE_ENCRYPTION_ENABLED;
}

/**
 * Encryption metadata for encrypted images
 */
export interface EncryptedImageMetadata {
  /** Base64 IV for AES-GCM */
  iv: string;
  /** Base64 salt */
  salt: string;
  /** Per-recipient encrypted AES keys */
  recipientKeys: RecipientKey[];
}

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  thumbnailUrl?: string;
  error?: string;
  /** Present when image is encrypted */
  encrypted?: boolean;
  /** Present when image is encrypted */
  encryptionData?: EncryptedImageMetadata;
  metadata?: {
    originalSize: number;
    compressedSize: number;
    width: number;
    height: number;
    format: string;
  };
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
  generateThumbnail?: boolean;
}

/**
 * Compress an image file using canvas
 * Supports JPEG, PNG, WebP output
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; thumbnail?: Blob; width: number; height: number }> {
  const {
    maxWidth = MAX_DIMENSION,
    maxHeight = MAX_DIMENSION,
    quality = JPEG_QUALITY,
    format = 'jpeg',
    generateThumbnail = true
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Round dimensions
      width = Math.round(width);
      height = Math.round(height);

      // Draw main image
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Get mime type
      const mimeType = format === 'png' ? 'image/png' :
                       format === 'webp' ? 'image/webp' : 'image/jpeg';

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          // Generate thumbnail if requested
          if (generateThumbnail) {
            const thumbCanvas = document.createElement('canvas');
            const thumbCtx = thumbCanvas.getContext('2d');

            if (thumbCtx) {
              // Calculate thumbnail dimensions (square crop from center)
              const size = Math.min(img.width, img.height);
              const sx = (img.width - size) / 2;
              const sy = (img.height - size) / 2;

              thumbCanvas.width = THUMBNAIL_SIZE;
              thumbCanvas.height = THUMBNAIL_SIZE;
              thumbCtx.drawImage(img, sx, sy, size, size, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

              thumbCanvas.toBlob(
                (thumbBlob) => {
                  resolve({ blob, thumbnail: thumbBlob || undefined, width, height });
                },
                mimeType,
                quality
              );
            } else {
              resolve({ blob, width, height });
            }
          } else {
            resolve({ blob, width, height });
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Encryption options for private image uploads
 */
export interface EncryptionOptions {
  /** Enable client-side encryption */
  encrypt: boolean;
  /** Recipient public keys (required if encrypt is true) */
  recipientPubkeys?: string[];
  /** Sender's private key for key distribution (required if encrypt is true) */
  senderPrivkey?: string;
}

/**
 * Upload compressed image to pod-api (Cloudflare Worker + R2)
 * Optionally encrypts before upload for private channels/DMs
 *
 * @param file - Image file to upload
 * @param userPubkey - Nostr hex pubkey of the uploader
 * @param category - Image category (avatar, message, channel)
 * @param encryptionOptions - Optional encryption for private images
 * @param privkey - Nostr private key (Uint8Array) for NIP-98 auth; required for upload
 */
export async function uploadImage(
  file: File,
  userPubkey: string,
  category: 'avatar' | 'message' | 'channel' = 'message',
  encryptionOptions?: EncryptionOptions,
  privkey?: Uint8Array | null
): Promise<ImageUploadResult> {
  if (!POD_API_URL) {
    return { success: false, error: 'Pod API not configured. Please set VITE_POD_API_URL.' };
  }

  if (!privkey) {
    return { success: false, error: 'Authentication required. Please log in to upload images.' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { success: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` };
  }

  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'File must be an image' };
  }

  const shouldEncrypt = encryptionOptions?.encrypt === true;
  if (shouldEncrypt) {
    if (!encryptionOptions.recipientPubkeys || encryptionOptions.recipientPubkeys.length === 0) {
      return { success: false, error: 'Encryption requires at least one recipient public key' };
    }
    if (!encryptionOptions.senderPrivkey) {
      return { success: false, error: 'Encryption requires sender private key' };
    }
  }

  try {
    const { blob, thumbnail, width, height } = await compressImage(file, {
      maxWidth: category === 'avatar' ? 400 : MAX_DIMENSION,
      maxHeight: category === 'avatar' ? 400 : MAX_DIMENSION,
      quality: category === 'avatar' ? 0.9 : JPEG_QUALITY,
      format: 'jpeg',
      generateThumbnail: category !== 'avatar' && !shouldEncrypt
    });

    const imageId = crypto.randomUUID();
    let uploadBlob: Blob = blob;
    let encryptionData: EncryptedImageMetadata | undefined;

    if (shouldEncrypt && encryptionOptions?.recipientPubkeys && encryptionOptions?.senderPrivkey) {
      const encrypted = await encryptImageForRecipients(
        blob,
        encryptionOptions.recipientPubkeys,
        encryptionOptions.senderPrivkey
      );
      uploadBlob = new Blob([encrypted.encryptedBlob], { type: 'application/octet-stream' });
      encryptionData = {
        iv: encrypted.iv,
        salt: encrypted.salt,
        recipientKeys: encrypted.recipientKeys,
      };
    }

    const mediaPath = shouldEncrypt
      ? `media/private/${imageId}.enc`
      : `media/public/${imageId}.jpg`;
    const contentType = shouldEncrypt ? 'application/octet-stream' : 'image/jpeg';
    const putUrl = `${POD_API_URL}/pods/${userPubkey}/${mediaPath}`;

    // NIP-98 auth header
    const token = await createNip98Token(privkey, putUrl, 'PUT');
    const authHeader = `Nostr ${token}`;

    const response = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Authorization': authHeader,
      },
      body: uploadBlob,
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Upload failed: ${error}` };
    }

    // Upload thumbnail if available
    let thumbnailUrl: string | undefined;
    if (thumbnail && !shouldEncrypt) {
      const thumbPath = `media/public/${imageId}_thumb.jpg`;
      const thumbUrl = `${POD_API_URL}/pods/${userPubkey}/${thumbPath}`;
      const thumbToken = await createNip98Token(privkey, thumbUrl, 'PUT');

      await fetch(thumbUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/jpeg',
          'Authorization': `Nostr ${thumbToken}`,
        },
        body: thumbnail,
      });
      thumbnailUrl = thumbUrl;
    }

    return {
      success: true,
      url: putUrl,
      thumbnailUrl,
      encrypted: shouldEncrypt,
      encryptionData,
      metadata: {
        originalSize: file.size,
        compressedSize: uploadBlob.size,
        width,
        height,
        format: shouldEncrypt ? 'encrypted' : 'jpeg'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

/**
 * Upload image directly from base64 data
 */
export async function uploadBase64Image(
  base64Data: string,
  userPubkey: string,
  category: 'avatar' | 'message' | 'channel' = 'message',
  privkey?: Uint8Array | null
): Promise<ImageUploadResult> {
  try {
    // Convert base64 to blob
    const response = await fetch(base64Data);
    const blob = await response.blob();
    const file = new File([blob], 'image.jpg', { type: blob.type });

    return uploadImage(file, userPubkey, category, undefined, privkey);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process image'
    };
  }
}

/**
 * Get image URL for a stored image
 * imageId format: {pubkey}/media/public/{uuid}.jpg or a full URL
 */
export function getImageUrl(imageId: string, size: 'full' | 'thumb' = 'full'): string {
  // Pod-api serves images directly — if already a full URL, return it
  if (imageId.startsWith('http')) return imageId;
  const suffix = size === 'thumb' ? '_thumb' : '';
  return `${POD_API_URL}/pods/${imageId}${suffix}.jpg`;
}

/**
 * Parse Keybase-style image ID
 * Format: UUID-SIZE-TIMESTAMP_HEX
 * Example: D944AEC6-4F5D-420D-9833-EBC6C73465FD-1180-000000145FF7DC4A
 */
export function parseKeybaseImageId(id: string): {
  uuid: string;
  size: number;
  timestamp: Date;
} | null {
  const parts = id.split('-');
  if (parts.length < 7) return null;

  // Reconstruct UUID (first 5 parts)
  const uuid = parts.slice(0, 5).join('-');

  // Size is 6th part
  const size = parseInt(parts[5], 10);

  // Timestamp is 7th part (hex to decimal)
  const timestampMs = parseInt(parts[6], 16);
  const timestamp = new Date(timestampMs);

  return { uuid, size, timestamp };
}

/**
 * Check if a URL is a local image upload URL (pod-api hosted)
 */
export function isLocalImageUrl(url: string): boolean {
  return url.includes('/pods/') && url.includes('/media/');
}

/**
 * Validate image dimensions before upload
 */
export async function validateImage(file: File): Promise<{
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
}> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      // Check minimum dimensions
      if (img.width < 50 || img.height < 50) {
        resolve({
          valid: false,
          error: 'Image too small. Minimum size is 50x50 pixels'
        });
        return;
      }

      // Check aspect ratio (prevent extreme dimensions)
      const ratio = Math.max(img.width, img.height) / Math.min(img.width, img.height);
      if (ratio > 10) {
        resolve({
          valid: false,
          error: 'Image aspect ratio too extreme'
        });
        return;
      }

      resolve({
        valid: true,
        width: img.width,
        height: img.height
      });
    };

    img.onerror = () => {
      resolve({
        valid: false,
        error: 'Failed to load image'
      });
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Create a preview URL for local display before upload
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

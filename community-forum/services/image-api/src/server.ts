/**
 * Image Upload API for Nostr BBS
 * Cloud Run service that handles image compression and GCS storage
 *
 * Security: Implements NIP-98 HTTP Auth for cryptographic verification
 * of the sender's pubkey before accepting uploads.
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

const app = express();
const PORT = process.env.PORT || 8080;

// GCS Configuration
const BUCKET_NAME = process.env.GCS_BUCKET || 'minimoonoir-images';
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'cumbriadreamlab';

// Initialize GCS client
const storage = new Storage({ projectId: PROJECT_ID });
const bucket = storage.bucket(BUCKET_NAME);

// Multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 2 // image + optional thumbnail
  },
  fileFilter: (_req: express.Request, file: { mimetype: string }, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// CORS configuration
const corsOptions = {
  origin: [
    'https://jjohare.github.io',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'image-api', timestamp: new Date().toISOString() });
});

/**
 * Image compression settings by category
 */
const COMPRESSION_SETTINGS = {
  avatar: {
    maxWidth: 400,
    maxHeight: 400,
    quality: 90,
    format: 'jpeg' as const
  },
  message: {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 85,
    format: 'jpeg' as const
  },
  channel: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 85,
    format: 'jpeg' as const
  },
  thumbnail: {
    maxWidth: 200,
    maxHeight: 200,
    quality: 80,
    format: 'jpeg' as const
  }
};

/**
 * Generate Keybase-style file URI
 * Format: UUID-SIZE-TIMESTAMP_HEX
 * Example: D944AEC6-4F5D-420D-9833-EBC6C73465FD-1180-000000145FF7DC4A
 */
function generateKeybaseStyleId(buffer: Buffer): string {
  // Generate UUID (uppercase, with hyphens)
  const uuid = uuidv4().toUpperCase();

  // File size component (in bytes, 4 digits padded)
  const size = buffer.length;
  const sizeComponent = size.toString().slice(0, 4).padStart(4, '0');

  // Timestamp as hex (16 chars, zero-padded)
  const timestamp = Date.now();
  const timestampHex = timestamp.toString(16).toUpperCase().padStart(16, '0');

  return `${uuid}-${sizeComponent}-${timestampHex}`;
}

/**
 * Parse Keybase-style file URI back to components
 */
function parseKeybaseStyleId(id: string): {
  uuid: string;
  size: number;
  timestamp: number;
} | null {
  const parts = id.split('-');
  if (parts.length < 7) return null;

  // Reconstruct UUID (first 5 parts)
  const uuid = parts.slice(0, 5).join('-');

  // Size is 6th part
  const size = parseInt(parts[5], 10);

  // Timestamp is 7th part (hex)
  const timestamp = parseInt(parts[6], 16);

  return { uuid, size, timestamp };
}

/**
 * Compress image using sharp
 */
async function compressImage(
  buffer: Buffer,
  settings: typeof COMPRESSION_SETTINGS[keyof typeof COMPRESSION_SETTINGS]
): Promise<Buffer> {
  let processor = sharp(buffer)
    .resize(settings.maxWidth, settings.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true
    });

  if (settings.format === 'jpeg') {
    processor = processor.jpeg({ quality: settings.quality, progressive: true });
  } else if (settings.format === 'webp') {
    processor = processor.webp({ quality: settings.quality });
  } else {
    processor = processor.png({ compressionLevel: 9 });
  }

  return processor.toBuffer();
}

/**
 * Upload buffer to GCS
 */
async function uploadToGCS(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const file = bucket.file(filename);

  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public, max-age=31536000' // 1 year cache
    }
  });

  // Make publicly accessible
  await file.makePublic();

  return `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`;
}

/**
 * Main upload endpoint
 * Requires NIP-98 HTTP Auth for cryptographic verification of sender
 */
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    // Verify NIP-98 authentication
    const requestUrl = getRequestUrl(req);
    const authResult = await verifyNip98Auth(
      req.headers.authorization,
      requestUrl,
      'POST'
    );

    if (!authResult.valid) {
      return res.status(401).json({
        error: 'NIP-98 authentication required',
        details: authResult.error,
        hint: 'Include Authorization header: Nostr <base64-encoded-kind-27235-event>'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Use cryptographically verified pubkey from NIP-98, not from body
    const pubkey = authResult.pubkey!;
    const category = (req.body.category || 'message') as keyof typeof COMPRESSION_SETTINGS;

    // Validate category
    if (!COMPRESSION_SETTINGS[category]) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const settings = COMPRESSION_SETTINGS[category];

    // Get image metadata
    const metadata = await sharp(req.file.buffer).metadata();
    const originalSize = req.file.size;

    // Compress main image
    const compressedBuffer = await compressImage(req.file.buffer, settings);
    const compressedSize = compressedBuffer.length;

    // Generate Keybase-style unique ID
    const imageId = generateKeybaseStyleId(compressedBuffer);
    const filename = `${category}/${pubkey.slice(0, 8)}/${imageId}.jpg`;

    // Upload main image
    const url = await uploadToGCS(compressedBuffer, filename, 'image/jpeg');

    // Generate and upload thumbnail for non-avatar images
    let thumbnailUrl: string | undefined;
    if (category !== 'avatar') {
      const thumbBuffer = await compressImage(req.file.buffer, COMPRESSION_SETTINGS.thumbnail);
      const thumbFilename = `${category}/${pubkey.slice(0, 8)}/${imageId}_thumb.jpg`;
      thumbnailUrl = await uploadToGCS(thumbBuffer, thumbFilename, 'image/jpeg');
    }

    // Log upload
    console.log(`Image uploaded: ${filename} (${originalSize} -> ${compressedSize} bytes)`);

    res.json({
      success: true,
      url,
      thumbnailUrl,
      imageId,
      metadata: {
        originalSize,
        compressedSize,
        compressionRatio: (1 - compressedSize / originalSize).toFixed(2),
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

/**
 * Batch upload endpoint (for multiple images)
 * Requires NIP-98 HTTP Auth for cryptographic verification of sender
 */
app.post('/upload-batch', upload.array('images', 10), async (req, res) => {
  try {
    // Verify NIP-98 authentication
    const requestUrl = getRequestUrl(req);
    const authResult = await verifyNip98Auth(
      req.headers.authorization,
      requestUrl,
      'POST'
    );

    if (!authResult.valid) {
      return res.status(401).json({
        error: 'NIP-98 authentication required',
        details: authResult.error,
        hint: 'Include Authorization header: Nostr <base64-encoded-kind-27235-event>'
      });
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    // Use cryptographically verified pubkey from NIP-98, not from body
    const pubkey = authResult.pubkey!;
    const category = (req.body.category || 'message') as keyof typeof COMPRESSION_SETTINGS;
    const settings = COMPRESSION_SETTINGS[category];

    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const compressedBuffer = await compressImage(file.buffer, settings);
          const imageId = generateKeybaseStyleId(compressedBuffer);
          const filename = `${category}/${pubkey.slice(0, 8)}/${imageId}.jpg`;
          const url = await uploadToGCS(compressedBuffer, filename, 'image/jpeg');

          return { success: true, url, imageId };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed'
          };
        }
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('Batch upload error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Batch upload failed'
    });
  }
});

/**
 * Delete image endpoint (requires NIP-98 authentication)
 */
app.delete('/image/:imageId', async (req, res) => {
  try {
    // Verify NIP-98 authentication — DELETE has no body, pass empty Buffer so the
    // payload tag (if any) is verified against sha256("").
    const requestUrl = getRequestUrl(req);
    const authResult = await verifyNip98Auth(
      req.headers.authorization,
      requestUrl,
      'DELETE',
      Buffer.alloc(0)
    );

    if (!authResult.valid) {
      return res.status(401).json({
        error: 'NIP-98 authentication required',
        details: authResult.error,
        hint: 'Include Authorization header: Nostr <base64-encoded-kind-27235-event>'
      });
    }

    const { imageId } = req.params;
    const pubkey = authResult.pubkey!;

    // Find and delete the file (only files owned by authenticated user)
    const [files] = await bucket.getFiles({
      prefix: `message/${pubkey.slice(0, 8)}/${imageId}`
    });

    if (files.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    await Promise.all(files.map(file => file.delete()));

    res.json({ success: true, deleted: files.length });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Delete failed'
    });
  }
});

/**
 * Get image info endpoint
 */
app.get('/info/:category/:pubkey/:imageId', async (req, res) => {
  try {
    const { category, pubkey, imageId } = req.params;
    const filename = `${category}/${pubkey}/${imageId}.jpg`;

    const file = bucket.file(filename);
    const [exists] = await file.exists();

    if (!exists) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const [metadata] = await file.getMetadata();

    res.json({
      url: `https://storage.googleapis.com/${BUCKET_NAME}/${filename}`,
      size: metadata.size,
      contentType: metadata.contentType,
      created: metadata.timeCreated,
      cacheControl: metadata.cacheControl
    });
  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get image info'
    });
  }
});

// =============================================================================
// NIP-98 HTTP Authentication
// =============================================================================

interface Nip98Event {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * Verify NIP-98 HTTP Auth event
 * @see https://github.com/nostr-protocol/nips/blob/master/98.md
 */
async function verifyNip98Auth(
  authHeader: string | undefined,
  requestUrl: string,
  method: string,
  rawBody?: Buffer  // pass Buffer.alloc(0) for bodyless requests; undefined = skip (multipart)
): Promise<{ valid: boolean; pubkey?: string; error?: string }> {
  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header' };
  }

  // Parse "Nostr <base64-encoded-event>"
  const match = authHeader.match(/^Nostr\s+(.+)$/i);
  if (!match) {
    return { valid: false, error: 'Invalid Authorization header format. Expected: Nostr <base64>' };
  }

  let event: Nip98Event;
  try {
    const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
    event = JSON.parse(decoded);
  } catch {
    return { valid: false, error: 'Failed to decode/parse NIP-98 event' };
  }

  // Validate event structure
  if (event.kind !== 27235) {
    return { valid: false, error: `Invalid event kind: ${event.kind}. Expected 27235` };
  }

  // Check timestamp (must be within 60 seconds)
  const now = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(now - event.created_at);
  if (timeDiff > 60) {
    return { valid: false, error: `Event timestamp too old or in future: ${timeDiff}s drift` };
  }

  // Validate required tags
  const urlTag = event.tags.find(t => t[0] === 'u');
  const methodTag = event.tags.find(t => t[0] === 'method');

  if (!urlTag || !urlTag[1]) {
    return { valid: false, error: 'Missing "u" (URL) tag in NIP-98 event' };
  }

  if (!methodTag || !methodTag[1]) {
    return { valid: false, error: 'Missing "method" tag in NIP-98 event' };
  }

  // Verify URL matches (normalize trailing slashes)
  const normalizeUrl = (u: string) => u.replace(/\/+$/, '').toLowerCase();
  if (normalizeUrl(urlTag[1]) !== normalizeUrl(requestUrl)) {
    return { valid: false, error: `URL mismatch: event has ${urlTag[1]}, request is ${requestUrl}` };
  }

  // Verify method matches
  if (methodTag[1].toUpperCase() !== method.toUpperCase()) {
    return { valid: false, error: `Method mismatch: event has ${methodTag[1]}, request is ${method}` };
  }

  // Verify event ID (hash of serialized event)
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content
  ]);
  const expectedId = bytesToHex(sha256(new TextEncoder().encode(serialized)));

  if (event.id !== expectedId) {
    return { valid: false, error: 'Invalid event ID (hash mismatch)' };
  }

  // Verify Schnorr signature
  try {
    const sigBytes = hexToBytes(event.sig);
    const idBytes = hexToBytes(event.id);
    const pubkeyBytes = hexToBytes(event.pubkey);

    const isValid = schnorr.verify(sigBytes, idBytes, pubkeyBytes);
    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }
  } catch (err) {
    return { valid: false, error: `Signature verification failed: ${err}` };
  }

  // Verify payload hash when raw body bytes are provided.
  // rawBody === undefined means multipart — payload verification is skipped because
  // multer has already consumed the stream and we cannot recompute the body hash.
  const payloadTag = event.tags.find(t => t[0] === 'payload');
  if (rawBody !== undefined) {
    const expectedPayload = bytesToHex(sha256(new Uint8Array(rawBody)));
    if (rawBody.length > 0) {
      if (!payloadTag || !payloadTag[1]) {
        return { valid: false, error: 'Missing payload tag for non-empty request body' };
      }
      if (payloadTag[1] !== expectedPayload) {
        return { valid: false, error: 'Payload hash mismatch' };
      }
    } else {
      // Empty body (e.g. DELETE) — payload tag should be absent or match sha256("")
      if (payloadTag && payloadTag[1] !== expectedPayload) {
        return { valid: false, error: 'Unexpected payload tag for empty body' };
      }
    }
  }

  return { valid: true, pubkey: event.pubkey };
}

/**
 * Get full request URL for NIP-98 verification
 */
function getRequestUrl(req: express.Request): string {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  return `${proto}://${host}${req.originalUrl}`;
}

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Image API server running on port ${PORT}`);
  console.log(`GCS Bucket: ${BUCKET_NAME}`);
  console.log(`Project: ${PROJECT_ID}`);
});

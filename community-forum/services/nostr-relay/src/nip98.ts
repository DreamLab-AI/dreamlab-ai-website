/**
 * NIP-98 HTTP Auth for nostr-relay — uses shared packages/nip98 module.
 * Retains: Basic nostr: header fallback, URL prefix matching, method wildcard,
 * pubkeyToDidNostr(), and createNip98Middleware().
 */

import { verifyNip98 as sharedVerify, hasNostrAuth as sharedHasNostrAuth } from '../../../packages/nip98/verify.js';

interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body?: string | Buffer | object;
  protocol?: string;
  hostname?: string;
}

interface AuthResult {
  pubkey: string | null;
  didNostr: string | null;
  error: string | null;
}

/**
 * Check if request has Nostr authentication
 * Supports both "Nostr <token>" and "Basic <base64(nostr:token)>" formats
 */
export function hasNostrAuth(headers: Record<string, string | string[] | undefined>): boolean {
  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader) return false;
  const auth = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  return sharedHasNostrAuth(auth);
}

/**
 * Convert Nostr pubkey to did:nostr URI
 */
export function pubkeyToDidNostr(pubkey: string): string {
  return `did:nostr:${pubkey.toLowerCase()}`;
}

/**
 * Verify NIP-98 authentication and return pubkey
 */
export async function verifyNostrAuth(request: HttpRequest): Promise<AuthResult> {
  const authHeader = request.headers.authorization || request.headers.Authorization;
  const auth = Array.isArray(authHeader) ? authHeader[0] : authHeader;

  if (!auth) {
    return { pubkey: null, didNostr: null, error: 'Missing Nostr token' };
  }

  // Build full URL for validation
  const protocol = request.protocol || 'http';
  const host = request.headers.host || request.hostname;
  const fullUrl = `${protocol}://${host}${request.url}`;

  const result = await sharedVerify(auth, {
    url: fullUrl,
    method: request.method,
    allowBasicNostr: true,
    allowMethodWildcard: true,
    allowUrlPrefix: true,
  });

  if (!result) {
    return { pubkey: null, didNostr: null, error: 'NIP-98 verification failed' };
  }

  return { pubkey: result.pubkey, didNostr: result.didNostr, error: null };
}

/**
 * Create NIP-98 auth middleware for HTTP endpoints
 */
export function createNip98Middleware() {
  return async (req: HttpRequest): Promise<AuthResult> => {
    if (!hasNostrAuth(req.headers)) {
      return { pubkey: null, didNostr: null, error: null }; // No auth attempted
    }
    return verifyNostrAuth(req);
  };
}

// Re-export extractNostrToken for backward compatibility
export function extractNostrToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  if (authHeader.startsWith('Nostr ')) return authHeader.slice(6).trim();
  if (authHeader.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
      if (decoded.startsWith('nostr:')) return decoded.slice(6);
    } catch { /* ignore */ }
  }
  return null;
}

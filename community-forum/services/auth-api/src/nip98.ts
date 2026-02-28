/**
 * NIP-98 HTTP Auth verification for auth-api — uses shared packages/nip98 module.
 * Retains RP_ORIGIN anti-SSRF URL reconstruction and raw body payload hashing.
 */

import type { Request } from 'express';
import { verifyNip98 as sharedVerify } from '../../../packages/nip98/verify.js';

/**
 * Verify NIP-98 Authorization header on an Express request.
 * Returns `{ pubkey }` on success, or `null` if authentication fails or is absent.
 */
export async function verifyNip98(req: Request): Promise<{ pubkey: string } | null> {
  const rawAuth = req.headers.authorization;
  if (!rawAuth) return null;

  // M-5: Reconstruct full request URL from the pre-configured RP_ORIGIN rather than
  // trusting x-forwarded-host, which an attacker could spoof to bypass URL validation.
  const rpOrigin = process.env.RP_ORIGIN || '';
  let baseOrigin: string;
  if (rpOrigin) {
    baseOrigin = rpOrigin.replace(/\/$/, '');
  } else {
    const protocol = req.protocol || 'http';
    const host = req.headers.host || 'localhost';
    baseOrigin = `${protocol}://${host}`;
  }
  const fullUrl = `${baseOrigin}${req.originalUrl}`;

  // Use raw body bytes for payload hash verification (not JSON.stringify)
  const rawBody: Buffer | undefined = (req as Record<string, unknown>).rawBody as Buffer | undefined;

  const result = await sharedVerify(rawAuth, {
    url: fullUrl,
    method: req.method,
    rawBody: rawBody ? new Uint8Array(rawBody) : undefined,
  });

  return result ? { pubkey: result.pubkey } : null;
}

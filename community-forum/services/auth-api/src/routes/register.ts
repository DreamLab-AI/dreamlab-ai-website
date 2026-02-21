import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';
import {
  generateRegistrationOpts,
  verifyRegistration,
} from '../webauthn.js';
import {
  storeChallenge,
  consumeChallenge,
  getCredentialByPubkey,
  storeCredential,
} from '../db.js';
import { provisionPod } from '../jss-client.js';

const router = Router();

// Validate a 64-char lowercase hex Nostr pubkey
function isValidPubkey(pubkey: unknown): pubkey is string {
  return typeof pubkey === 'string' && /^[0-9a-f]{64}$/.test(pubkey);
}

/**
 * POST /auth/register/options
 * Body: { pubkey: string }
 *
 * Returns WebAuthn registration options for the given Nostr pubkey.
 */
router.post('/options', async (req: Request, res: Response): Promise<void> => {
  const { pubkey } = req.body as { pubkey?: unknown };

  if (!isValidPubkey(pubkey)) {
    res.status(400).json({ error: 'Invalid pubkey: must be 64 hex characters' });
    return;
  }

  // Reject if already registered
  const existing = await getCredentialByPubkey(pubkey).catch(() => null);
  if (existing) {
    res.status(409).json({ error: 'Pubkey already registered' });
    return;
  }

  const rpId = process.env.RP_ID!;
  const rpName = process.env.RP_NAME!;
  const origin = process.env.RP_ORIGIN!;

  let options: Awaited<ReturnType<typeof generateRegistrationOpts>>['options'];
  let challenge: string;

  const prfSalt = crypto.randomBytes(32);

  try {
    ({ options, challenge } = await generateRegistrationOpts(rpId, rpName, origin));
  } catch (err) {
    console.error('[register/options] Failed to generate options:', err);
    res.status(500).json({ error: 'Failed to generate registration options' });
    return;
  }

  try {
    await storeChallenge(challenge, pubkey, prfSalt);
  } catch (err) {
    console.error('[register/options] Failed to store challenge:', err);
    res.status(500).json({ error: 'Failed to store challenge' });
    return;
  }

  res.json({ ...options, prfSalt });
});

/**
 * POST /auth/register/verify
 * Body: { response: RegistrationResponseJSON, pubkey: string, webId?: string }
 *
 * Verifies the WebAuthn registration, provisions a Solid pod, stores credential.
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  const { response, pubkey, webId: rawClientWebId } = req.body as {
    response?: RegistrationResponseJSON;
    pubkey?: unknown;
    webId?: string;
  };

  if (!isValidPubkey(pubkey)) {
    res.status(400).json({ error: 'Invalid pubkey: must be 64 hex characters' });
    return;
  }

  if (!response || typeof response !== 'object') {
    res.status(400).json({ error: 'Missing or invalid WebAuthn response' });
    return;
  }

  // Sanitize client-supplied webId
  let sanitizedClientWebId: string | null = null;
  if (rawClientWebId != null) {
    try {
      const parsed = new URL(rawClientWebId);
      if (parsed.protocol !== 'https:') {
        res.status(400).json({ error: 'webId must use the https scheme' });
        return;
      }
      if (rawClientWebId.includes('..') || rawClientWebId.includes('%2e%2e') || rawClientWebId.includes('%2E%2E')) {
        res.status(400).json({ error: 'webId contains invalid path sequences' });
        return;
      }
      sanitizedClientWebId = parsed.toString();
    } catch {
      res.status(400).json({ error: 'webId is not a valid URL' });
      return;
    }
  }

  const rpId = process.env.RP_ID!;
  const origin = process.env.RP_ORIGIN!;

  // Look up the pending challenge for this pubkey
  // The challenge is embedded in the response's clientDataJSON
  let challengeBase64: string;
  try {
    const clientDataRaw = Buffer.from(response.response.clientDataJSON, 'base64').toString('utf8');
    const clientData = JSON.parse(clientDataRaw) as { challenge?: string };
    if (!clientData.challenge) {
      res.status(400).json({ error: 'Missing challenge in clientDataJSON' });
      return;
    }
    // clientDataJSON challenge is base64url-encoded
    challengeBase64 = clientData.challenge;
  } catch {
    res.status(400).json({ error: 'Failed to parse clientDataJSON' });
    return;
  }

  const challengeRow = await consumeChallenge(challengeBase64).catch(() => null);
  if (!challengeRow) {
    res.status(400).json({ error: 'Challenge not found, expired, or already used' });
    return;
  }

  // Ensure the challenge was issued for this pubkey
  if (challengeRow.pubkey && challengeRow.pubkey !== pubkey) {
    res.status(400).json({ error: 'Challenge pubkey mismatch' });
    return;
  }

  let verification: Awaited<ReturnType<typeof verifyRegistration>>;
  try {
    verification = await verifyRegistration(response, challengeBase64, rpId, origin);
  } catch (err) {
    console.error('[register/verify] Verification failed:', err);
    res.status(400).json({ error: 'WebAuthn verification failed' });
    return;
  }

  if (!verification.verified || !verification.registrationInfo) {
    res.status(400).json({ error: 'Registration not verified' });
    return;
  }

  const {
    credentialID,
    credentialPublicKey,
    counter,
    credentialDeviceType,
    credentialBackedUp,
  } = verification.registrationInfo;

  const didNostr = `did:nostr:${pubkey}`;

  // Retrieve stored prfSalt from challenge row
  const prfSalt: Buffer = challengeRow.prf_salt ?? crypto.randomBytes(32);

  // Provision Solid pod (non-blocking failure — pod is optional)
  let webId: string | null = sanitizedClientWebId;
  let podUrl: string | null = null;

  const pod = await provisionPod(pubkey).catch((err) => {
    console.error('[register/verify] Pod provisioning error:', err);
    return null;
  });

  if (pod) {
    webId = pod.webId;
    podUrl = pod.podUrl;
  }

  try {
    await storeCredential({
      credentialId: credentialID,
      pubkey,
      didNostr,
      webId,
      podUrl,
      publicKeyBytes: Buffer.from(credentialPublicKey),
      counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: response.response.transports ?? null,
      prfSalt,
    });
  } catch (err) {
    console.error('[register/verify] Failed to store credential:', err);
    res.status(500).json({ error: 'Failed to store credential' });
    return;
  }

  res.status(201).json({
    ok: true,
    pubkey,
    didNostr,
    webId,
    podUrl,
  });
});

export { router as registerRouter };

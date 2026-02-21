import { Router, type Request, type Response } from 'express';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import {
  generateAuthenticationOpts,
  verifyAuthentication,
} from '../webauthn.js';
import {
  storeChallenge,
  consumeChallenge,
  getCredentialByPubkey,
  updateCredentialCounter,
} from '../db.js';
import { verifyNip98 } from '../nip98.js';

const router = Router();

function isValidPubkey(pubkey: unknown): pubkey is string {
  return typeof pubkey === 'string' && /^[0-9a-f]{64}$/.test(pubkey);
}

/**
 * POST /auth/login/options
 * Body: { pubkey: string }
 *
 * Returns WebAuthn authentication options for the given Nostr pubkey.
 */
router.post('/options', async (req: Request, res: Response): Promise<void> => {
  const { pubkey } = req.body as { pubkey?: unknown };

  if (!isValidPubkey(pubkey)) {
    res.status(400).json({ error: 'Invalid pubkey: must be 64 hex characters' });
    return;
  }

  const credential = await getCredentialByPubkey(pubkey).catch(() => null);
  if (!credential) {
    res.status(404).json({ error: 'Pubkey not registered' });
    return;
  }

  const storedPrfSalt = credential.prf_salt;

  const rpId = process.env.RP_ID!;

  let options: Awaited<ReturnType<typeof generateAuthenticationOpts>>['options'];
  let challenge: string;

  try {
    ({ options, challenge } = await generateAuthenticationOpts(rpId, credential.credential_id, new Uint8Array(storedPrfSalt)));
  } catch (err) {
    console.error('[login/options] Failed to generate options:', err);
    res.status(500).json({ error: 'Failed to generate authentication options' });
    return;
  }

  try {
    await storeChallenge(challenge, pubkey);
  } catch (err) {
    console.error('[login/options] Failed to store challenge:', err);
    res.status(500).json({ error: 'Failed to store challenge' });
    return;
  }

  res.json({ options, prfSalt: storedPrfSalt.toString('base64url') });
});

/**
 * POST /auth/login/verify
 * Body: { response: AuthenticationResponseJSON, pubkey: string }
 *
 * Protected by NIP-98 — the Authorization header must contain a valid
 * kind-27235 event signed by the same pubkey, confirming key ownership.
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  // NIP-98 check: confirms the caller controls the Nostr privkey
  const nip98Result = await verifyNip98(req).catch(() => null);
  if (!nip98Result) {
    res.status(401).json({ error: 'NIP-98 authorization required' });
    return;
  }

  const { response, pubkey } = req.body as {
    response?: AuthenticationResponseJSON;
    pubkey?: unknown;
  };

  if (!isValidPubkey(pubkey)) {
    res.status(400).json({ error: 'Invalid pubkey: must be 64 hex characters' });
    return;
  }

  // NIP-98 pubkey must match the claimed pubkey
  if (nip98Result.pubkey !== pubkey) {
    res.status(403).json({ error: 'NIP-98 pubkey does not match request pubkey' });
    return;
  }

  if (!response || typeof response !== 'object') {
    res.status(400).json({ error: 'Missing or invalid WebAuthn response' });
    return;
  }

  // Extract challenge from clientDataJSON
  let challengeBase64: string;
  try {
    const clientDataRaw = Buffer.from(response.response.clientDataJSON, 'base64').toString('utf8');
    const clientData = JSON.parse(clientDataRaw) as { challenge?: string };
    if (!clientData.challenge) {
      res.status(400).json({ error: 'Missing challenge in clientDataJSON' });
      return;
    }
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

  if (challengeRow.pubkey && challengeRow.pubkey !== pubkey) {
    res.status(400).json({ error: 'Challenge pubkey mismatch' });
    return;
  }

  const credential = await getCredentialByPubkey(pubkey).catch(() => null);
  if (!credential) {
    res.status(404).json({ error: 'Credential not found' });
    return;
  }

  const rpId = process.env.RP_ID!;
  const origin = process.env.RP_ORIGIN!;

  let verification: Awaited<ReturnType<typeof verifyAuthentication>>;
  try {
    verification = await verifyAuthentication(
      response,
      challengeBase64,
      {
        credentialId: credential.credential_id,
        publicKeyBytes: credential.public_key_bytes,
        counter: Number(credential.counter),
      },
      rpId,
      origin
    );
  } catch (err) {
    console.error('[login/verify] Verification failed:', err);
    res.status(400).json({ error: 'WebAuthn verification failed' });
    return;
  }

  if (!verification.verified) {
    res.status(400).json({ error: 'Authentication not verified' });
    return;
  }

  // Counter validation: reject if counter did not advance (replay attack)
  const newCounter = verification.authenticationInfo.newCounter;
  if (newCounter <= Number(credential.counter)) {
    res.status(401).json({ error: 'Credential counter did not advance' });
    return;
  }

  // Update stored counter — propagate errors as 500
  try {
    await updateCredentialCounter(credential.credential_id, newCounter);
  } catch (err) {
    console.error('[login/verify] Failed to update counter:', err);
    res.status(500).json({ error: 'Failed to update credential counter' });
    return;
  }

  res.json({
    ok: true,
    pubkey: credential.pubkey,
    didNostr: credential.did_nostr,
    webId: credential.webid,
    podUrl: credential.pod_url,
  });
});

export { router as authenticateRouter };

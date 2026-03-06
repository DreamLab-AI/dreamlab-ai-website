/**
 * DreamLab auth-api Worker
 * WebAuthn registration/authentication + NIP-98 verification
 * Replaces the Express-based Cloud Run auth-api service
 */

import { verifyNip98 } from '../shared/nip98';

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  POD_META: KVNamespace;
  PODS: R2Bucket;
  RP_ID: string;
  RP_NAME: string;
  EXPECTED_ORIGIN: string;
}

// CORS headers — restricted to expected origin (not wildcard)
function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.EXPECTED_ORIGIN || 'https://dreamlab-ai.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(data: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

function arrayToBase64url(arr: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check
      if (path === '/health') {
        return jsonResponse({ status: 'ok', service: 'auth-api', runtime: 'workers' }, 200, env);
      }

      // WebAuthn Registration - Generate options
      if (path === '/auth/register/options' && request.method === 'POST') {
        return await handleRegisterOptions(request, env);
      }

      // WebAuthn Registration - Verify
      if (path === '/auth/register/verify' && request.method === 'POST') {
        return await handleRegisterVerify(request, env);
      }

      // WebAuthn Authentication - Generate options
      if (path === '/auth/login/options' && request.method === 'POST') {
        return await handleLoginOptions(request, env);
      }

      // WebAuthn Authentication - Verify
      if (path === '/auth/login/verify' && request.method === 'POST') {
        return await handleLoginVerify(request, env);
      }

      // Credential lookup (for discoverable login when userHandle isn't the pubkey)
      if (path === '/auth/lookup' && request.method === 'POST') {
        return await handleCredentialLookup(request, env);
      }

      // NIP-98 protected endpoints
      if (path.startsWith('/api/')) {
        const auth = request.headers.get('Authorization');
        if (!auth) return jsonResponse({ error: 'Authorization required' }, 401, env);

        const requestUrl = `${env.EXPECTED_ORIGIN}${path}`;
        const result = await verifyNip98(auth, {
          url: requestUrl,
          method: request.method,
          rawBody: request.body ? await request.arrayBuffer() : undefined,
        });

        if (!result) return jsonResponse({ error: 'Invalid NIP-98 token' }, 401, env);

        // Route authenticated requests
        if (path === '/api/profile' && request.method === 'GET') {
          return await handleProfile(result.pubkey, env);
        }
      }

      return jsonResponse({ error: 'Not found' }, 404, env);
    } catch (err) {
      if (err instanceof SyntaxError) {
        return jsonResponse({ error: 'Invalid JSON body' }, 400, env);
      }
      console.error('Worker error:', err);
      return jsonResponse({ error: 'Internal server error' }, 500, env);
    }
  },

  // Cron keep-warm: prevents cold starts by running every 5 minutes
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await env.DB.prepare('SELECT 1').first();
  },
};

async function handleRegisterOptions(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { displayName?: string };
  const displayName = (typeof body.displayName === 'string' && body.displayName.trim())
    ? body.displayName.trim() : 'Nostr User';

  // Generate challenge
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const challengeB64 = arrayToBase64url(challenge);

  // Server-controlled PRF salt — stored with credential during verify
  const prfSalt = crypto.getRandomValues(new Uint8Array(32));
  const prfSaltB64 = arrayToBase64url(prfSalt);

  // Temporary user ID for the WebAuthn ceremony. The real pubkey is derived
  // from the PRF output AFTER credential creation, so it can't be user.id.
  const tempUserId = crypto.getRandomValues(new Uint8Array(16));
  const tempUserIdB64 = arrayToBase64url(tempUserId);

  // Clean expired challenges and store new one keyed by challenge value
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM challenges WHERE created_at < ?').bind(fiveMinAgo),
    env.DB.prepare('INSERT INTO challenges (pubkey, challenge, created_at) VALUES (?, ?, ?)')
      .bind(challengeB64, challengeB64, Date.now()),
  ]);

  return jsonResponse({
    options: {
      rp: { name: env.RP_NAME || 'DreamLab AI', id: env.RP_ID || 'dreamlab-ai.com' },
      user: { id: tempUserIdB64, name: displayName, displayName },
      challenge: challengeB64,
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' },
      ],
      timeout: 60000,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
      excludeCredentials: [],
    },
    prfSalt: prfSaltB64,
  }, 200, env);
}

async function handleRegisterVerify(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const pubkey = body.pubkey as string;

  if (!pubkey || typeof pubkey !== 'string' || !/^[0-9a-f]{64}$/i.test(pubkey)) {
    return jsonResponse({ error: 'Invalid pubkey' }, 400, env);
  }

  // Verify a non-expired challenge exists
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const challengeRow = await env.DB.prepare(
    'SELECT challenge FROM challenges WHERE created_at > ? LIMIT 1'
  ).bind(fiveMinAgo).first();

  if (!challengeRow) {
    return jsonResponse({ error: 'No pending challenge or challenge expired' }, 400, env);
  }

  // Extract credential data — accept both nested (response.id) and flat (credentialId) formats
  const credential = body.response as Record<string, unknown> | undefined;
  const credentialId = (credential?.id as string) ?? (body.credentialId as string);
  const credentialResponse = credential?.response as Record<string, unknown> | undefined;
  const attestation = (credentialResponse?.attestationObject as string) ?? (body.publicKey as string);

  if (!credentialId) {
    return jsonResponse({ error: 'Missing credential data' }, 400, env);
  }

  // PRF salt generated by server during options, sent back by client
  const prfSalt = typeof body.prfSalt === 'string' ? body.prfSalt : null;

  // Store credential
  await env.DB.prepare(
    `INSERT INTO webauthn_credentials (pubkey, credential_id, public_key, counter, prf_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    pubkey,
    credentialId,
    attestation || credentialId,
    0,
    prfSalt,
    Date.now(),
  ).run();

  // Provision pod
  const podInfo = await provisionPod(pubkey, env);

  // Clean up used challenge
  await env.DB.prepare('DELETE FROM challenges WHERE challenge = ?')
    .bind(challengeRow.challenge as string).run();

  return jsonResponse({
    verified: true,
    pubkey,
    didNostr: `did:nostr:${pubkey}`,
    ...podInfo,
  }, 200, env);
}

async function handleLoginOptions(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { pubkey?: string };

  // Generate challenge
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const challengeB64 = arrayToBase64url(challenge);

  const pubkey = body.pubkey;
  let prfSalt: string | null = null;
  let allowCredentials: { id: string; type: string }[] = [];

  if (pubkey) {
    const cred = await env.DB.prepare(
      'SELECT credential_id, prf_salt FROM webauthn_credentials WHERE pubkey = ? LIMIT 1'
    ).bind(pubkey).first();

    if (!cred) {
      // No passkey credential registered — user must use private key login or register a passkey
      return jsonResponse({
        error: 'No passkey registered for this account. Use private key login or create a new passkey.',
        code: 'NO_CREDENTIAL',
      }, 404, env);
    }

    prfSalt = (cred.prf_salt as string) ?? null;
    if (cred.credential_id) {
      allowCredentials = [{ id: cred.credential_id as string, type: 'public-key' }];
    }
  }

  // Always store challenge (supports discoverable credential flows without pubkey)
  const challengePubkey = pubkey || '__discoverable__';
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM challenges WHERE created_at < ?').bind(fiveMinAgo),
    env.DB.prepare('INSERT INTO challenges (pubkey, challenge, created_at) VALUES (?, ?, ?)')
      .bind(challengePubkey, challengeB64, Date.now()),
  ]);

  return jsonResponse({
    options: {
      challenge: challengeB64,
      rpId: env.RP_ID || 'dreamlab-ai.com',
      timeout: 60000,
      userVerification: 'required',
      allowCredentials,
    },
    prfSalt,
  }, 200, env);
}

async function handleLoginVerify(request: Request, env: Env): Promise<Response> {
  // Read raw body — needed for both JSON parsing and NIP-98 payload hash verification
  const rawBody = await request.arrayBuffer();
  const body = JSON.parse(new TextDecoder().decode(rawBody)) as Record<string, unknown>;
  const pubkey = body.pubkey as string;

  if (!pubkey || typeof pubkey !== 'string' || !/^[0-9a-f]{64}$/i.test(pubkey)) {
    return jsonResponse({ error: 'Invalid pubkey' }, 400, env);
  }

  // 1. Verify NIP-98 Authorization — proves caller controls the Nostr private key
  //    (which is only derivable from a valid WebAuthn PRF ceremony)
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'NIP-98 Authorization required' }, 401, env);
  }
  const nip98Result = await verifyNip98(authHeader, {
    url: request.url,
    method: 'POST',
    rawBody,
  });
  if (!nip98Result) {
    return jsonResponse({ error: 'Invalid NIP-98 token' }, 401, env);
  }
  if (nip98Result.pubkey !== pubkey) {
    return jsonResponse({ error: 'NIP-98 pubkey mismatch' }, 401, env);
  }

  // 2. Look up stored credential
  const cred = await env.DB.prepare(
    'SELECT credential_id, public_key, counter FROM webauthn_credentials WHERE pubkey = ? LIMIT 1'
  ).bind(pubkey).first();
  if (!cred) return jsonResponse({ error: 'No registered credential' }, 400, env);

  // 3. Extract assertion response (sent by client via encodeAssertionResponse)
  const assertionData = body.response as Record<string, unknown> | undefined;
  const innerResponse = assertionData?.response as Record<string, unknown> | undefined;

  if (!assertionData || !innerResponse) {
    return jsonResponse({ error: 'Missing assertion response' }, 400, env);
  }

  // Verify credential ID matches stored credential
  if (assertionData.id !== cred.credential_id) {
    return jsonResponse({ error: 'Credential mismatch' }, 400, env);
  }

  // 4. Verify clientDataJSON — proves the ceremony used our challenge and origin
  const clientDataB64 = innerResponse.clientDataJSON as string;
  if (!clientDataB64 || typeof clientDataB64 !== 'string') {
    return jsonResponse({ error: 'Missing clientDataJSON' }, 400, env);
  }
  let clientData: { type?: string; challenge?: string; origin?: string };
  try {
    clientData = JSON.parse(new TextDecoder().decode(base64urlDecode(clientDataB64)));
  } catch {
    return jsonResponse({ error: 'Invalid clientDataJSON' }, 400, env);
  }
  if (clientData.type !== 'webauthn.get') {
    return jsonResponse({ error: 'Invalid ceremony type' }, 400, env);
  }
  const expectedOrigin = env.EXPECTED_ORIGIN || 'https://dreamlab-ai.com';
  if (clientData.origin !== expectedOrigin) {
    return jsonResponse({ error: 'Origin mismatch' }, 400, env);
  }

  // Verify challenge was issued by this server and hasn't expired
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const challengeRow = await env.DB.prepare(
    'SELECT 1 FROM challenges WHERE challenge = ? AND created_at > ?'
  ).bind(clientData.challenge, fiveMinAgo).first();
  if (!challengeRow) {
    return jsonResponse({ error: 'Invalid or expired challenge' }, 400, env);
  }

  // 5. Verify authenticatorData — rpIdHash, flags, counter
  const authDataB64 = innerResponse.authenticatorData as string;
  if (!authDataB64 || typeof authDataB64 !== 'string') {
    return jsonResponse({ error: 'Missing authenticatorData' }, 400, env);
  }
  const authData = new Uint8Array(base64urlDecode(authDataB64));
  if (authData.length < 37) {
    return jsonResponse({ error: 'authenticatorData too short' }, 400, env);
  }

  // First 32 bytes = SHA-256(rpId) — verify RP identity
  const rpId = env.RP_ID || 'dreamlab-ai.com';
  const rpIdHash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rpId))
  );
  if (!constantTimeEqual(rpIdHash, authData.slice(0, 32))) {
    return jsonResponse({ error: 'RP ID mismatch' }, 400, env);
  }

  // Byte 32 = flags: bit 0 = UP (user present), bit 2 = UV (user verified)
  const flags = authData[32];
  if (!(flags & 0x01)) {
    return jsonResponse({ error: 'User presence not verified' }, 400, env);
  }
  if (!(flags & 0x04)) {
    return jsonResponse({ error: 'User verification not performed' }, 400, env);
  }

  // Bytes 33-36 = sign counter (big-endian uint32)
  const signCount = new DataView(authData.buffer, authData.byteOffset + 33, 4).getUint32(0);
  const storedCounter = cred.counter as number;
  // signCount 0 means authenticator doesn't support counters — skip check
  if (signCount !== 0 && signCount <= storedCounter) {
    return jsonResponse({ error: 'Credential replay detected' }, 400, env);
  }

  // 6. All checks passed — update counter and consume challenge
  await env.DB.batch([
    env.DB.prepare('UPDATE webauthn_credentials SET counter = ? WHERE pubkey = ?')
      .bind(signCount, pubkey),
    env.DB.prepare('DELETE FROM challenges WHERE challenge = ?')
      .bind(clientData.challenge),
  ]);

  return jsonResponse({
    verified: true,
    pubkey,
    didNostr: `did:nostr:${pubkey}`,
  }, 200, env);
}

async function handleCredentialLookup(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { credentialId?: string };
  if (!body.credentialId || typeof body.credentialId !== 'string') {
    return jsonResponse({ error: 'Missing credentialId' }, 400, env);
  }

  const cred = await env.DB.prepare(
    'SELECT pubkey FROM webauthn_credentials WHERE credential_id = ? LIMIT 1'
  ).bind(body.credentialId).first();

  if (!cred) {
    return jsonResponse({ error: 'Credential not found' }, 404, env);
  }

  return jsonResponse({ pubkey: cred.pubkey }, 200, env);
}

async function handleProfile(pubkey: string, env: Env): Promise<Response> {
  const profile = await env.PODS.get(`pods/${pubkey}/profile/card`);
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404, env);

  const body = await profile.text();
  return new Response(body, {
    headers: { 'Content-Type': 'application/ld+json', ...corsHeaders(env) },
  });
}

async function provisionPod(pubkey: string, env: Env): Promise<{ webId: string; podUrl: string }> {
  const defaultAcl = {
    '@context': {
      acl: 'http://www.w3.org/ns/auth/acl#',
      foaf: 'http://xmlns.com/foaf/0.1/',
    },
    '@graph': [
      {
        '@id': '#owner',
        '@type': 'acl:Authorization',
        'acl:agent': { '@id': `did:nostr:${pubkey}` },
        'acl:accessTo': { '@id': './' },
        'acl:default': { '@id': './' },
        'acl:mode': [
          { '@id': 'acl:Read' },
          { '@id': 'acl:Write' },
          { '@id': 'acl:Control' },
        ],
      },
      {
        '@id': '#public',
        '@type': 'acl:Authorization',
        'acl:agentClass': { '@id': 'foaf:Agent' },
        'acl:accessTo': { '@id': './profile/' },
        'acl:mode': [{ '@id': 'acl:Read' }],
      },
      {
        '@id': '#media-public',
        '@type': 'acl:Authorization',
        'acl:agentClass': { '@id': 'foaf:Agent' },
        'acl:accessTo': { '@id': './media/public/' },
        'acl:mode': [{ '@id': 'acl:Read' }],
      },
    ],
  };

  const profileCard = {
    '@context': {
      foaf: 'http://xmlns.com/foaf/0.1/',
    },
    '@id': `did:nostr:${pubkey}`,
    '@type': 'foaf:Person',
  };

  await Promise.all([
    env.POD_META.put(`acl:${pubkey}`, JSON.stringify(defaultAcl)),
    env.PODS.put(`pods/${pubkey}/profile/card`, JSON.stringify(profileCard), {
      httpMetadata: { contentType: 'application/ld+json' },
    }),
    env.POD_META.put(`meta:${pubkey}`, JSON.stringify({
      created: Date.now(),
      storageUsed: 0,
    })),
  ]);

  return {
    webId: `https://pods.dreamlab-ai.com/${pubkey}/profile/card#me`,
    podUrl: `https://pods.dreamlab-ai.com/${pubkey}/`,
  };
}

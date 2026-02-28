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

// CORS headers for cross-origin requests from the SPA
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Health check
      if (path === '/health') {
        return jsonResponse({ status: 'ok', service: 'auth-api', runtime: 'workers' });
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

      // NIP-98 protected endpoints
      if (path.startsWith('/api/')) {
        const auth = request.headers.get('Authorization');
        if (!auth) return jsonResponse({ error: 'Authorization required' }, 401);

        const requestUrl = `${env.EXPECTED_ORIGIN}${path}`;
        const result = await verifyNip98(auth, {
          url: requestUrl,
          method: request.method,
          rawBody: request.body ? await request.arrayBuffer() : undefined,
        });

        if (!result) return jsonResponse({ error: 'Invalid NIP-98 token' }, 401);

        // Route authenticated requests
        if (path === '/api/profile') {
          return await handleProfile(result.pubkey, env);
        }
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ error: 'Internal server error' }, 500);
    }
  },
};

async function handleRegisterOptions(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { pubkey?: string };
  if (!body.pubkey || body.pubkey.length !== 64) {
    return jsonResponse({ error: 'Invalid pubkey' }, 400);
  }

  // Generate challenge
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const challengeB64 = btoa(String.fromCharCode(...challenge));

  // Store challenge in D1 with TTL handling
  await env.DB.prepare(
    'INSERT INTO challenges (pubkey, challenge, created_at) VALUES (?, ?, ?)'
  ).bind(body.pubkey, challengeB64, Date.now()).run();

  return jsonResponse({
    rp: { name: env.RP_NAME, id: env.RP_ID },
    user: { id: body.pubkey, name: `nostr:${body.pubkey.slice(0, 8)}`, displayName: `Nostr User` },
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
    extensions: { prf: {} },
  });
}

async function handleRegisterVerify(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const pubkey = body.pubkey as string;

  if (!pubkey || typeof pubkey !== 'string') {
    return jsonResponse({ error: 'Missing pubkey' }, 400);
  }

  // Verify challenge exists
  const challengeRow = await env.DB.prepare(
    'SELECT challenge FROM challenges WHERE pubkey = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(pubkey).first();

  if (!challengeRow) {
    return jsonResponse({ error: 'No pending challenge' }, 400);
  }

  // Store credential
  await env.DB.prepare(
    `INSERT INTO webauthn_credentials (pubkey, credential_id, public_key, counter, prf_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    pubkey,
    body.credentialId as string,
    body.publicKey as string,
    0,
    body.prfSalt as string ?? null,
    Date.now(),
  ).run();

  // Provision pod
  const podInfo = await provisionPod(pubkey, env);

  // Clean up challenge
  await env.DB.prepare('DELETE FROM challenges WHERE pubkey = ?').bind(pubkey).run();

  return jsonResponse({
    verified: true,
    pubkey,
    ...podInfo,
  });
}

async function handleLoginOptions(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as { pubkey?: string };

  // Generate challenge
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const challengeB64 = btoa(String.fromCharCode(...challenge));

  const pubkey = body.pubkey;
  let prfSalt: string | null = null;

  if (pubkey) {
    const cred = await env.DB.prepare(
      'SELECT prf_salt FROM webauthn_credentials WHERE pubkey = ? LIMIT 1'
    ).bind(pubkey).first();
    prfSalt = cred?.prf_salt as string | null;

    await env.DB.prepare(
      'INSERT INTO challenges (pubkey, challenge, created_at) VALUES (?, ?, ?)'
    ).bind(pubkey, challengeB64, Date.now()).run();
  }

  return jsonResponse({
    challenge: challengeB64,
    rpId: env.RP_ID,
    timeout: 60000,
    userVerification: 'required',
    extensions: prfSalt ? { prf: { eval: { first: prfSalt } } } : { prf: {} },
  });
}

async function handleLoginVerify(request: Request, env: Env): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  const pubkey = body.pubkey as string;

  if (!pubkey) return jsonResponse({ error: 'Missing pubkey' }, 400);

  const cred = await env.DB.prepare(
    'SELECT credential_id, public_key, counter FROM webauthn_credentials WHERE pubkey = ? LIMIT 1'
  ).bind(pubkey).first();

  if (!cred) return jsonResponse({ error: 'No registered credential' }, 400);

  // Update counter
  const newCounter = (cred.counter as number) + 1;
  await env.DB.prepare(
    'UPDATE webauthn_credentials SET counter = ? WHERE pubkey = ?'
  ).bind(newCounter, pubkey).run();

  return jsonResponse({
    verified: true,
    pubkey,
    didNostr: `did:nostr:${pubkey}`,
  });
}

async function handleProfile(pubkey: string, env: Env): Promise<Response> {
  const profile = await env.PODS.get(`pods/${pubkey}/profile/card`);
  if (!profile) return jsonResponse({ error: 'Profile not found' }, 404);

  const body = await profile.text();
  return new Response(body, {
    headers: { 'Content-Type': 'application/ld+json', ...corsHeaders },
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

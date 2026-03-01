/**
 * DreamLab Nostr Relay Worker
 *
 * Cloudflare Workers-based private Nostr relay with:
 * - WebSocket NIP-01 protocol via Durable Objects
 * - D1-backed event storage + whitelist
 * - NIP-98 authenticated admin endpoints
 * - Whitelist/cohort management API
 * - NIP-11 relay information document
 * - NIP-16/33 replaceable events
 */

import { verifyNip98 } from '../shared/nip98';

export { NostrRelayDO } from './relay-do';

export interface Env {
  DB: D1Database;
  RELAY: DurableObjectNamespace;
  ADMIN_PUBKEYS: string;
  RELAY_NAME: string;
  ALLOWED_ORIGIN: string;
}

const ALLOWED_ORIGINS = [
  'https://dreamlab-ai.com',
  'https://thedreamlab.uk',
  'https://dreamlab-ai.github.io',
  'http://localhost:5173',
  'http://localhost:5174',
];

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}

function corsHeaders(request: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function json(data: unknown, status: number, request: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
  });
}

function isAdmin(pubkey: string, env: Env): boolean {
  return (env.ADMIN_PUBKEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean)
    .includes(pubkey);
}

async function requireNip98Admin(request: Request, env: Env): Promise<string | Response> {
  const auth = request.headers.get('Authorization');
  if (!auth) return json({ error: 'NIP-98 authentication required' }, 401, request);

  const url = new URL(request.url);
  const rawBody = request.body ? await request.clone().arrayBuffer() : undefined;
  const result = await verifyNip98(auth, {
    url: url.origin + url.pathname,
    method: request.method,
    rawBody,
  });

  if (!result) return json({ error: 'Invalid NIP-98 token' }, 401, request);
  if (!isAdmin(result.pubkey, env)) return json({ error: 'Not authorized' }, 403, request);
  return result.pubkey;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = corsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // WebSocket upgrade → Durable Object
    if (request.headers.get('Upgrade') === 'websocket') {
      const id = env.RELAY.idFromName('main');
      const stub = env.RELAY.get(id);
      return stub.fetch(request);
    }

    // NIP-11 relay info
    if (path === '/' && request.headers.get('Accept')?.includes('application/nostr+json')) {
      return handleNip11(request, env);
    }

    try {
      // Health check
      if (path === '/health' || path === '/') {
        return await handleHealth(request, env);
      }

      // Whitelist check (public — used by community forum client)
      if (path === '/api/check-whitelist' && request.method === 'GET') {
        return await handleCheckWhitelist(request, url, env);
      }

      // Whitelist list (public read, admin for full data)
      if (path === '/api/whitelist/list' && request.method === 'GET') {
        return await handleWhitelistList(request, url, env);
      }

      // Whitelist add (NIP-98 admin only)
      if (path === '/api/whitelist/add' && request.method === 'POST') {
        return await handleWhitelistAdd(request, env);
      }

      // Whitelist update cohorts (NIP-98 admin only)
      if (path === '/api/whitelist/update-cohorts' && request.method === 'POST') {
        return await handleWhitelistUpdateCohorts(request, env);
      }

      return json({ error: 'Not found' }, 404, request);
    } catch (err) {
      if (err instanceof SyntaxError) return json({ error: 'Invalid JSON' }, 400, request);
      return json({ error: 'Internal error' }, 500, request);
    }
  },
};

// ── Handlers ──────────────────────────────────────────────────────────

function handleNip11(request: Request, env: Env): Response {
  const adminPubkey = (env.ADMIN_PUBKEYS || '').split(',')[0]?.trim() || '';
  return new Response(JSON.stringify({
    name: env.RELAY_NAME || 'DreamLab Nostr Relay',
    description: 'Private whitelist-only Nostr relay for the DreamLab community. ' +
      'Supports NIP-01, NIP-11, NIP-16, NIP-33, NIP-98.',
    pubkey: adminPubkey,
    contact: adminPubkey ? `nostr:${adminPubkey}` : '',
    supported_nips: [1, 11, 16, 33, 98],
    software: 'https://github.com/DreamLab-AI/dreamlab-ai-website',
    version: '3.0.0',
    limitation: {
      max_message_length: 65536,
      max_content_length: 65536,
      max_event_tags: 2000,
      max_subscriptions: 20,
      max_filters: 10,
      max_limit: 1000,
      max_subid_length: 64,
      auth_required: false,
      payment_required: false,
      restricted_writes: true,
    },
    retention: [
      { kinds: [0], time: null },
      { kinds: [3], time: null },
      { kinds: [1], time: 7776000 },
      { kinds: [7], time: 2592000 },
      { kinds: [9024], time: 86400 },
      { kinds: [[10000, 19999]], time: null },
      { kinds: [[30000, 39999]], time: null },
    ],
  }), {
    headers: {
      'Content-Type': 'application/nostr+json',
      'Access-Control-Allow-Origin': getCorsOrigin(request),
      'Vary': 'Origin',
    },
  });
}

async function handleHealth(request: Request, env: Env): Promise<Response> {
  const stats = await env.DB.prepare(
    'SELECT (SELECT COUNT(*) FROM events) as events, (SELECT COUNT(*) FROM whitelist) as whitelisted'
  ).first<{ events: number; whitelisted: number }>();

  return json({
    status: 'healthy',
    version: '3.0.0',
    runtime: 'workers',
    database: 'd1',
    events: stats?.events ?? 0,
    whitelisted: stats?.whitelisted ?? 0,
    nips: [1, 11, 16, 33, 98],
  }, 200, request);
}

async function handleCheckWhitelist(request: Request, url: URL, env: Env): Promise<Response> {
  const pubkey = url.searchParams.get('pubkey');
  if (!pubkey || !/^[0-9a-f]{64}$/i.test(pubkey)) {
    return json({ error: 'Invalid pubkey format' }, 400, request);
  }

  const entry = await env.DB.prepare(
    'SELECT cohorts FROM whitelist WHERE pubkey = ? AND (expires_at IS NULL OR expires_at > ?)'
  ).bind(pubkey, Math.floor(Date.now() / 1000)).first<{ cohorts: string }>();

  const adminPubkeys = (env.ADMIN_PUBKEYS || '').split(',').map(k => k.trim()).filter(Boolean);
  const isAdminKey = adminPubkeys.includes(pubkey);

  const cohorts: string[] = entry ? JSON.parse(entry.cohorts) : [];
  if (isAdminKey && !cohorts.includes('admin')) cohorts.push('admin');

  return json({
    isWhitelisted: !!entry || isAdminKey,
    isAdmin: isAdminKey,
    cohorts,
    verifiedAt: Date.now(),
    source: 'relay',
  }, 200, request);
}

async function handleWhitelistList(request: Request, url: URL, env: Env): Promise<Response> {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const cohort = url.searchParams.get('cohort');

  let countQuery = 'SELECT COUNT(*) as count FROM whitelist WHERE (expires_at IS NULL OR expires_at > ?)';
  let listQuery = `SELECT w.pubkey, w.cohorts, w.added_at, w.added_by,
    (SELECT e.content FROM events e WHERE e.pubkey = w.pubkey AND e.kind = 0 ORDER BY e.created_at DESC LIMIT 1) as profile_content
    FROM whitelist w WHERE (w.expires_at IS NULL OR w.expires_at > ?)`;
  const now = Math.floor(Date.now() / 1000);
  const params: unknown[] = [now];

  if (cohort) {
    const cohortFilter = ` AND cohorts LIKE ?`;
    countQuery += cohortFilter;
    listQuery += cohortFilter;
    params.push(`%"${cohort}"%`);
  }

  listQuery += ' ORDER BY w.added_at DESC LIMIT ? OFFSET ?';

  const countResult = await env.DB.prepare(countQuery).bind(...params).first<{ count: number }>();
  const listResult = await env.DB.prepare(listQuery).bind(...params, limit, offset).all();

  const users = (listResult.results || []).map((row: Record<string, unknown>) => {
    let displayName: string | null = null;
    if (row.profile_content) {
      try {
        const profile = JSON.parse(row.profile_content as string);
        displayName = profile.display_name || profile.name || null;
      } catch { /* ignore */ }
    }
    return {
      pubkey: row.pubkey,
      cohorts: typeof row.cohorts === 'string' ? JSON.parse(row.cohorts as string) : [],
      addedAt: Number(row.added_at),
      addedBy: row.added_by,
      displayName,
    };
  });

  return json({ users, total: countResult?.count ?? 0, limit, offset }, 200, request);
}

async function handleWhitelistAdd(request: Request, env: Env): Promise<Response> {
  const adminResult = await requireNip98Admin(request, env);
  if (adminResult instanceof Response) return adminResult;

  const body = await request.json() as { pubkey?: string; cohorts?: string[] };
  if (!body.pubkey || !/^[0-9a-f]{64}$/i.test(body.pubkey)) {
    return json({ error: 'Invalid or missing pubkey' }, 400, request);
  }

  const cohorts = body.cohorts || ['approved'];
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `INSERT INTO whitelist (pubkey, cohorts, added_at, added_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (pubkey) DO UPDATE SET cohorts = excluded.cohorts, added_by = excluded.added_by`
  ).bind(body.pubkey, JSON.stringify(cohorts), now, adminResult).run();

  return json({ success: true }, 200, request);
}

async function handleWhitelistUpdateCohorts(request: Request, env: Env): Promise<Response> {
  const adminResult = await requireNip98Admin(request, env);
  if (adminResult instanceof Response) return adminResult;

  const body = await request.json() as { pubkey?: string; cohorts?: string[] };
  if (!body.pubkey || !body.cohorts) {
    return json({ error: 'Missing pubkey or cohorts' }, 400, request);
  }

  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `INSERT INTO whitelist (pubkey, cohorts, added_at, added_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (pubkey) DO UPDATE SET cohorts = excluded.cohorts, added_by = excluded.added_by`
  ).bind(body.pubkey, JSON.stringify(body.cohorts), now, adminResult).run();

  return json({ success: true }, 200, request);
}

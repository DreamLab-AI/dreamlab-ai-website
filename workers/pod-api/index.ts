/**
 * DreamLab pod-api Worker
 * Per-user Solid pod storage backed by R2 + KV
 * NIP-98 authenticated, WAC-enforced access control
 */

import { verifyNip98 } from '../shared/nip98';
import { evaluateAccess, type AccessMode } from './acl';

export interface Env {
  PODS: R2Bucket;
  POD_META: KVNamespace;
  EXPECTED_ORIGIN: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function methodToMode(method: string): AccessMode {
  switch (method.toUpperCase()) {
    case 'GET':
    case 'HEAD':
      return 'Read';
    case 'PUT':
    case 'DELETE':
      return 'Write';
    case 'POST':
      return 'Append';
    default:
      return 'Read';
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Health check
    if (path === '/health') {
      return Response.json({ status: 'ok', service: 'pod-api' }, { headers: corsHeaders });
    }

    // Route: /pods/{pubkey}/...
    const podMatch = path.match(/^\/pods\/([a-f0-9]{64})(\/.*)?$/);
    if (!podMatch) {
      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
    }

    const ownerPubkey = podMatch[1];
    const resourcePath = podMatch[2] || '/';

    // Authenticate via NIP-98
    let requesterPubkey: string | null = null;
    const auth = request.headers.get('Authorization');
    if (auth) {
      const requestUrl = `${env.EXPECTED_ORIGIN}${path}`;
      const result = await verifyNip98(auth, {
        url: requestUrl,
        method: request.method,
        rawBody: request.body ? await request.arrayBuffer() : undefined,
      });
      requesterPubkey = result?.pubkey ?? null;
    }

    // ACL check
    const requiredMode = methodToMode(request.method);
    const aclDoc = await env.POD_META.get(`acl:${ownerPubkey}`);
    const hasAccess = evaluateAccess(
      aclDoc ? JSON.parse(aclDoc) : null,
      requesterPubkey ? `did:nostr:${requesterPubkey}` : null,
      resourcePath,
      requiredMode,
    );

    if (!hasAccess) {
      const status = requesterPubkey ? 403 : 401;
      return Response.json(
        { error: requesterPubkey ? 'Forbidden' : 'Authentication required' },
        { status, headers: corsHeaders },
      );
    }

    const r2Key = `pods/${ownerPubkey}${resourcePath}`;

    switch (request.method.toUpperCase()) {
      case 'GET':
      case 'HEAD': {
        const object = await env.PODS.get(r2Key);
        if (!object) {
          return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
        }
        const headers = new Headers(corsHeaders);
        headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
        headers.set('ETag', object.etag);
        if (request.method === 'HEAD') {
          return new Response(null, { headers });
        }
        return new Response(object.body, { headers });
      }

      case 'PUT':
      case 'POST': {
        const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
        const MAX_BODY_SIZE = 50 * 1024 * 1024; // 50MB
        if (contentLength > MAX_BODY_SIZE) {
          return Response.json({ error: `Body exceeds ${MAX_BODY_SIZE} byte limit` }, { status: 413, headers: corsHeaders });
        }
        const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
        await env.PODS.put(r2Key, request.body, {
          httpMetadata: { contentType },
        });
        return Response.json({ status: 'ok', key: r2Key }, { status: 201, headers: corsHeaders });
      }

      case 'DELETE': {
        await env.PODS.delete(r2Key);
        return Response.json({ status: 'deleted' }, { headers: corsHeaders });
      }

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }
  },
};

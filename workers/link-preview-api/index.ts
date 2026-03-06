/**
 * DreamLab link-preview-api Worker
 * Proxies requests to fetch OpenGraph metadata, bypassing CORS.
 * Replaces the Fastify-based Cloud Run link-preview-api service.
 *
 * Endpoints:
 *   GET /preview?url=...  -- fetch OG metadata or Twitter oEmbed
 *   GET /health           -- health check
 *   GET /stats            -- cache statistics (CF Cache API)
 */

export interface Env {
  ALLOWED_ORIGIN: string;
}

const TIMEOUT_MS = 10_000;
const TWITTER_OEMBED_URL = 'https://publish.twitter.com/oembed';
const CACHE_TTL_OG = 10 * 24 * 60 * 60;      // 10 days (seconds)
const CACHE_TTL_TWITTER = 24 * 60 * 60;       // 1 day  (seconds)

// ── CORS ──────────────────────────────────────────────────────────────

function corsHeaders(env: Env): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://dreamlab-ai.com',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data: unknown, status: number, env: Env, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env), ...extra },
  });
}

// ── SSRF protection ───────────────────────────────────────────────────

function isPrivateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow HTTP(S) outbound
    if (!['http:', 'https:'].includes(parsed.protocol)) return true;

    const hostname = parsed.hostname.toLowerCase();

    // Block non-standard IP obfuscation (integer/hex) that may bypass
    // the dotted-decimal regex on URL implementations that don't normalize them.
    if (/^\d+$/.test(hostname)) return true;           // pure integer (e.g., 2130706433 = 127.0.0.1)
    if (/^0x[0-9a-f]+$/i.test(hostname)) return true;  // pure hex (e.g., 0x7f000001)

    // Loopback / localhost
    if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;

    // GCP / cloud metadata endpoints
    if (
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      hostname === 'metadata.goog'
    ) return true;

    // Plain IPv4 -- block private, loopback, and link-local ranges
    const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
      if (a === 10) return true;                              // 10.0.0.0/8
      if (a === 127) return true;                             // 127.0.0.0/8 loopback
      if (a === 172 && b >= 16 && b <= 31) return true;      // 172.16.0.0/12
      if (a === 192 && b === 168) return true;                // 192.168.0.0/16
      if (a === 169 && b === 254) return true;                // 169.254.0.0/16 link-local
      if (a === 0) return true;                               // 0.0.0.0/8
      if (a >= 240) return true;                              // 240.0.0.0/4 reserved
    }

    // IPv6 loopback / ULA / link-local (bracket form)
    const host = hostname.replace(/^\[/, '').replace(/\]$/, '');
    if (host === '::1') return true;
    if (host.startsWith('fc') || host.startsWith('fd')) return true; // ULA fc00::/7
    if (host.startsWith('fe80')) return true;                         // link-local

    // IPv4-mapped IPv6 (::ffff:a.b.c.d) -- check embedded IPv4 against private ranges
    const v4mapped = host.match(/^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i);
    if (v4mapped) {
      const [a, b] = [Number(v4mapped[1]), Number(v4mapped[2])];
      if (a === 10) return true;
      if (a === 127) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 169 && b === 254) return true;
      if (a === 0) return true;
      if (a >= 240) return true;
      return false; // Public IPv4-mapped address -- allow
    }
    // Hex-form mapped addresses (::ffff:7f00:1) that didn't match dotted-decimal above
    // -- block since we can't reliably parse hex octets without a full IPv6 parser
    if (/^::ffff:/i.test(host)) return true;

    return false;
  } catch {
    return true; // unparseable URL -> block
  }
}

// ── Twitter detection ─────────────────────────────────────────────────

function isTwitterUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return [
      'twitter.com', 'x.com',
      'www.twitter.com', 'www.x.com',
      'mobile.twitter.com', 'mobile.x.com',
    ].includes(parsed.hostname);
  } catch {
    return false;
  }
}

// ── HTML helpers ──────────────────────────────────────────────────────

function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'gi'), char);
  }

  decoded = decoded.replace(/&#(\d+);/g, (_, num) => {
    const code = parseInt(num, 10);
    return code > 0 && code < 0x10FFFF ? String.fromCodePoint(code) : '';
  });

  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    const code = parseInt(hex, 16);
    return code > 0 && code < 0x10FFFF ? String.fromCodePoint(code) : '';
  });

  return decoded;
}

function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl;
  }
}

// ── OG parser ─────────────────────────────────────────────────────────

interface OgPreview {
  url: string;
  domain: string;
  favicon: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

function parseOpenGraphTags(html: string, url: string): OgPreview {
  const domain = new URL(url).hostname.replace(/^www\./, '');
  const preview: OgPreview = {
    url,
    domain,
    favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
  };

  const extractMeta = (pattern: RegExp): string | undefined => {
    const match = html.match(pattern);
    return match ? decodeHtmlEntities(match[1]) : undefined;
  };

  preview.title =
    extractMeta(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
    extractMeta(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i) ||
    extractMeta(/<title>([^<]+)<\/title>/i);

  preview.description =
    extractMeta(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
    extractMeta(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i) ||
    extractMeta(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);

  const imageUrl =
    extractMeta(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
    extractMeta(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (imageUrl) {
    preview.image = resolveUrl(imageUrl, url);
  }

  preview.siteName =
    extractMeta(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);

  return preview;
}

// ── Fetch helpers ─────────────────────────────────────────────────────

interface TwitterEmbed {
  type: 'twitter';
  url: string;
  html: string;
  author_name: string;
  author_url: string;
  provider_name: string;
}

async function fetchTwitterEmbed(url: string): Promise<TwitterEmbed> {
  const oembedUrl = new URL(TWITTER_OEMBED_URL);
  oembedUrl.searchParams.set('url', url);
  oembedUrl.searchParams.set('omit_script', 'true');
  oembedUrl.searchParams.set('dnt', 'true');
  oembedUrl.searchParams.set('theme', 'dark');

  const response = await fetch(oembedUrl.toString(), {
    headers: { Accept: 'application/json', 'User-Agent': 'LinkPreviewAPI/1.0' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) throw new Error(`Twitter oEmbed failed: ${response.status}`);

  const data = await response.json() as Record<string, string>;
  return {
    type: 'twitter',
    url,
    html: data.html,
    author_name: data.author_name,
    author_url: data.author_url,
    provider_name: data.provider_name || 'X',
  };
}

interface OgResult extends OgPreview {
  type: 'opengraph';
}

async function fetchOpenGraphData(url: string): Promise<OgResult> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'LinkPreviewAPI/1.0 (Link Preview Bot)',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  });

  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

  const html = await response.text();
  return { type: 'opengraph', ...parseOpenGraphTags(html, url) };
}

// ── Cache helpers (CF Cache API) ──────────────────────────────────────

/**
 * Build a deterministic cache key URL from the target URL.
 * The Cache API requires a valid URL as key; we namespace under
 * a synthetic host so keys never collide with real requests.
 */
function cacheKey(targetUrl: string): string {
  return `https://link-preview-cache.internal/v1?url=${encodeURIComponent(targetUrl)}`;
}

async function getFromCache(targetUrl: string): Promise<Response | undefined> {
  const cache = caches.default;
  const key = new Request(cacheKey(targetUrl));
  return await cache.match(key);
}

async function putToCache(targetUrl: string, body: unknown, ttl: number, env: Env): Promise<void> {
  const cache = caches.default;
  const key = new Request(cacheKey(targetUrl));
  const response = new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${ttl}`,
      ...corsHeaders(env),
    },
  });
  await cache.put(key, response);
}

// ── Handlers ──────────────────────────────────────────────────────────

async function handlePreview(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return json({ error: 'Missing url parameter' }, 400, env);
  }

  try {
    new URL(targetUrl);
  } catch {
    return json({ error: 'Invalid URL' }, 400, env);
  }

  if (isPrivateUrl(targetUrl)) {
    return json({ error: 'URL not allowed (private or internal address)' }, 400, env);
  }

  const isTwitter = isTwitterUrl(targetUrl);

  // Check CF Cache API
  const cached = await getFromCache(targetUrl);
  if (cached) {
    const data = await cached.json();
    return json({ ...data as object, cached: true }, 200, env, { 'X-Cache': 'HIT' });
  }

  try {
    let data: TwitterEmbed | OgResult;
    let ttl: number;

    if (isTwitter) {
      data = await fetchTwitterEmbed(targetUrl);
      ttl = CACHE_TTL_TWITTER;
    } else {
      data = await fetchOpenGraphData(targetUrl);
      ttl = CACHE_TTL_OG;
    }

    // Store in CF Cache API (fire-and-forget)
    await putToCache(targetUrl, data, ttl, env);

    return json({ ...data, cached: false }, 200, env, { 'X-Cache': 'MISS' });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Fetch failed' }, 500, env);
  }
}

function handleHealth(env: Env): Response {
  return json({ status: 'ok', service: 'link-preview-api', runtime: 'workers' }, 200, env);
}

function handleStats(env: Env): Response {
  // CF Cache API doesn't expose per-key metrics; return runtime info only.
  return json({
    cache: 'cf-cache-api',
    note: 'Per-key hit stats are available in Cloudflare Analytics dashboard',
  }, 200, env);
}

// ── Router ────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    const path = new URL(request.url).pathname;

    try {
      if (path === '/preview' && request.method === 'GET') return await handlePreview(request, env);
      if (path === '/health' && request.method === 'GET') return handleHealth(env);
      if (path === '/stats' && request.method === 'GET') return handleStats(env);
      return json({ error: 'Not found' }, 404, env);
    } catch (err) {
      console.error('Worker error:', err);
      return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500, env);
    }
  },

  // Cron keep-warm: prevents cold starts by running every 5 minutes
  async scheduled(_event: ScheduledEvent, _env: Env, _ctx: ExecutionContext): Promise<void> {
    // No persistent storage to touch — the cron itself keeps the isolate warm
  },
};

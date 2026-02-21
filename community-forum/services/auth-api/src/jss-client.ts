import crypto from 'crypto';

export interface PodInfo {
  webId: string;
  podUrl: string;
}

/**
 * Provision a Solid pod via CSS 7.x (Community Solid Server) for a given Nostr pubkey.
 * Uses the CSS 7.x /.account/ REST API (replaces the CSS 6.x /idp/register/ endpoint).
 * If JSS_BASE_URL is not configured, returns null (pod provisioning is optional in dev).
 *
 * Flow:
 *   1. GET  /.account/                                      → discover controls.account.create
 *   2. POST controls.account.create  {}                     → { authorization, controls }
 *   3. POST controls.password.create { email, password }    → add password login
 *   4. POST controls.account.pod     { name }               → { pod, webId }
 */
export async function provisionPod(pubkey: string): Promise<PodInfo | null> {
  const jssBaseUrl = process.env.JSS_BASE_URL;
  if (!jssBaseUrl) {
    console.warn('[jss-client] JSS_BASE_URL is not set — skipping pod provisioning');
    return null;
  }

  const base = jssBaseUrl.replace(/\/$/, '');
  const email = `nostr-${pubkey}@pod.dreamlab-ai.com`;
  const password = crypto.randomBytes(24).toString('base64url');
  const podName = pubkey;

  // M-4: validate that CSS-returned URLs use http(s) and originate from the expected host.
  const expectedHost = new URL(jssBaseUrl).host;
  function validateCssUrl(raw: unknown, label: string): string {
    if (typeof raw !== 'string') throw new Error(`CSS returned non-string ${label}`);
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error(`CSS returned invalid URL for ${label}: ${raw}`);
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error(`CSS returned non-http(s) scheme for ${label}: ${parsed.protocol}`);
    }
    if (parsed.host !== expectedHost) {
      throw new Error(`CSS returned unexpected host for ${label}: ${parsed.host} (expected ${expectedHost})`);
    }
    return parsed.toString();
  }

  // Step 1: Discover the /.account/ API controls (unauthenticated).
  let createAccountUrl: string;
  try {
    const res = await fetch(`${base}/.account/`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[jss-client] GET /.account/ failed (${res.status})`);
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    const ctrl = (data.controls as Record<string, unknown>) || {};
    createAccountUrl = ((ctrl.account as Record<string, unknown>)?.create as string) || '';
    if (!createAccountUrl) {
      console.error('[jss-client] CSS /.account/ did not return controls.account.create');
      return null;
    }
  } catch (err) {
    console.error('[jss-client] Failed to reach CSS /.account/:', err);
    return null;
  }

  // Step 2: Create an account; receive a CSS-Account-Token and per-account controls.
  let accountToken: string;
  let passwordCreateUrl: string;
  let podCreateUrl: string;
  try {
    const res = await fetch(createAccountUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '<unreadable>');
      console.error(`[jss-client] Create account failed (${res.status}): ${body}`);
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    accountToken = (data.authorization as string) || '';
    if (!accountToken) {
      console.error('[jss-client] CSS did not return authorization token');
      return null;
    }
    const ctrl = (data.controls as Record<string, unknown>) || {};
    passwordCreateUrl = ((ctrl.password as Record<string, unknown>)?.create as string) || '';
    podCreateUrl = ((ctrl.account as Record<string, unknown>)?.pod as string) || '';
  } catch (err) {
    console.error('[jss-client] Failed to create CSS account:', err);
    return null;
  }

  // Step 2b: If per-account controls were not included in the create response,
  // fetch them via an authenticated GET /.account/.
  if (!passwordCreateUrl || !podCreateUrl) {
    try {
      const res = await fetch(`${base}/.account/`, {
        headers: { Authorization: `CSS-Account-Token ${accountToken}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        console.error(`[jss-client] Authenticated GET /.account/ failed (${res.status})`);
        return null;
      }
      const data = (await res.json()) as Record<string, unknown>;
      const ctrl = (data.controls as Record<string, unknown>) || {};
      if (!passwordCreateUrl) {
        passwordCreateUrl = ((ctrl.password as Record<string, unknown>)?.create as string) || '';
      }
      if (!podCreateUrl) {
        podCreateUrl = ((ctrl.account as Record<string, unknown>)?.pod as string) || '';
      }
    } catch (err) {
      console.error('[jss-client] Failed to fetch per-account controls:', err);
      return null;
    }
  }

  if (!passwordCreateUrl || !podCreateUrl) {
    console.error('[jss-client] CSS did not return password.create or account.pod controls');
    return null;
  }

  // Step 3: Register email/password credentials for this account.
  try {
    const res = await fetch(passwordCreateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `CSS-Account-Token ${accountToken}`,
      },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '<unreadable>');
      console.error(`[jss-client] Password registration failed (${res.status}): ${body}`);
      return null;
    }
  } catch (err) {
    console.error('[jss-client] Failed to register CSS password:', err);
    return null;
  }

  // Step 4: Create the pod.
  let rawWebId: string | undefined;
  let rawPodUrl: string | undefined;
  try {
    const res = await fetch(podCreateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `CSS-Account-Token ${accountToken}`,
      },
      body: JSON.stringify({ name: podName, settings: { template: 'filesystem.json' } }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '<unreadable>');
      console.error(`[jss-client] Pod creation failed (${res.status}): ${body}`);
      return null;
    }
    const data = (await res.json()) as Record<string, unknown>;
    rawPodUrl = (data.pod as string) || (data.podBaseUrl as string) || (data.podUrl as string);
    rawWebId = (data.webId as string) || (data.webid as string);
  } catch (err) {
    console.error('[jss-client] Failed to create CSS pod:', err);
    return null;
  }

  // Fall back to derived URLs if CSS did not return them.
  if (!rawPodUrl) rawPodUrl = `${base}/${podName}/`;
  if (!rawWebId) rawWebId = `${base}/${podName}/profile/card#me`;

  let webId: string;
  let podUrl: string;
  try {
    webId = validateCssUrl(rawWebId, 'webId');
    podUrl = validateCssUrl(rawPodUrl, 'podUrl');
  } catch (err) {
    console.error('[jss-client] CSS URL validation failed:', err);
    return null;
  }

  return { webId, podUrl };
}

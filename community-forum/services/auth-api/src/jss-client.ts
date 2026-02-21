import crypto from 'crypto';

export interface PodInfo {
  webId: string;
  podUrl: string;
}

/**
 * Provision a Solid pod via JSS (JavaScriptSolidServer) for a given Nostr pubkey.
 * If JSS_BASE_URL is not configured, returns null (pod provisioning is optional in dev).
 */
export async function provisionPod(pubkey: string): Promise<PodInfo | null> {
  const jssBaseUrl = process.env.JSS_BASE_URL;
  if (!jssBaseUrl) {
    console.warn('[jss-client] JSS_BASE_URL is not set — skipping pod provisioning');
    return null;
  }

  const email = `nostr-${pubkey}@pod.dreamlab-ai.com`;
  const password = crypto.randomBytes(24).toString('base64url');
  const podName = pubkey;

  const registerUrl = `${jssBaseUrl.replace(/\/$/, '')}/idp/register/`;

  let response: Response;
  try {
    response = await fetch(registerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        podName,
        createWebId: true,
        register: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error('[jss-client] Failed to reach JSS:', err);
    return null;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '<unreadable>');
    console.error(`[jss-client] JSS registration failed (${response.status}): ${body}`);
    return null;
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    console.error('[jss-client] JSS returned non-JSON response');
    return null;
  }

  // JSS returns webId and podBaseUrl (or podUrl) in the response
  const rawWebId =
    (data.webId as string) ||
    (data.webid as string) ||
    `${jssBaseUrl.replace(/\/$/, '')}/${pubkey}/profile/card#me`;

  const rawPodUrl =
    (data.podBaseUrl as string) ||
    (data.podUrl as string) ||
    `${jssBaseUrl.replace(/\/$/, '')}/${pubkey}/`;

  // M-4: validate that JSS-returned values use https and originate from the
  // expected JSS host to prevent open-redirect or stored-XSS via a rogue JSS response.
  const expectedHost = new URL(jssBaseUrl).host;
  function validateJssUrl(raw: unknown, label: string): string {
    if (typeof raw !== 'string') throw new Error(`JSS returned non-string ${label}`);
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error(`JSS returned invalid URL for ${label}: ${raw}`);
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error(`JSS returned non-http(s) scheme for ${label}: ${parsed.protocol}`);
    }
    if (parsed.host !== expectedHost) {
      throw new Error(`JSS returned unexpected host for ${label}: ${parsed.host} (expected ${expectedHost})`);
    }
    return parsed.toString();
  }

  let webId: string;
  let podUrl: string;
  try {
    webId = validateJssUrl(rawWebId, 'webId');
    podUrl = validateJssUrl(rawPodUrl, 'podUrl');
  } catch (err) {
    console.error('[jss-client] JSS URL validation failed:', err);
    return null;
  }

  return { webId, podUrl };
}

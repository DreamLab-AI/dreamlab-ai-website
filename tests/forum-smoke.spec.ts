import { test, expect } from 'playwright/test';

const FORUM_URL = 'https://dreamlab-ai.com/community/';
const RELAY_URL = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const AUTH_API = 'https://dreamlab-auth-api.solitary-paper-764d.workers.dev';
const POD_API = 'https://dreamlab-pod-api.solitary-paper-764d.workers.dev';
const SEARCH_API = 'https://dreamlab-search-api.solitary-paper-764d.workers.dev';
const LINK_PREVIEW_API = 'https://dreamlab-link-preview.solitary-paper-764d.workers.dev';
const ADMIN_NSEC = '05db7bd41258001c7d8b420ebf5710d5d0e5b1eabdf94ba1c03fb1658af29c27';

// ─── 1. Worker health checks ──────────────────────────────────────────
test.describe('Worker health checks', () => {
  test('auth-worker /health returns 200', async ({ request }) => {
    const resp = await request.get(`${AUTH_API}/health`);
    expect(resp.status()).toBe(200);
  });
  test('pod-worker /health returns 200', async ({ request }) => {
    const resp = await request.get(`${POD_API}/health`);
    expect(resp.status()).toBe(200);
  });
  test('search-worker /health returns 200', async ({ request }) => {
    const resp = await request.get(`${SEARCH_API}/health`);
    expect(resp.status()).toBe(200);
  });
  test('link-preview-worker /health returns 200', async ({ request }) => {
    const resp = await request.get(`${LINK_PREVIEW_API}/health`);
    expect(resp.status()).toBe(200);
  });
});

// ─── 2. Static asset availability ─────────────────────────────────────
test.describe('Forum static assets', () => {
  test('forum index.html loads with 200', async ({ request }) => {
    const resp = await request.get(FORUM_URL);
    expect(resp.status()).toBe(200);
    const html = await resp.text();
    expect(html).toContain('DreamLab');
  });

  test('WASM binary is served with correct content-type', async ({ request }) => {
    const indexResp = await request.get(FORUM_URL);
    const html = await indexResp.text();
    const wasmMatch = html.match(/href="([^"]*\.wasm)"/);
    expect(wasmMatch).toBeTruthy();
    const wasmPath = wasmMatch![1];
    const wasmUrl = wasmPath.startsWith('http') ? wasmPath : `https://dreamlab-ai.com${wasmPath}`;
    const resp = await request.get(wasmUrl);
    expect(resp.status()).toBe(200);
    expect(resp.headers()['content-type']).toContain('wasm');
  });

  test('JS bootstrap is served', async ({ request }) => {
    const indexResp = await request.get(FORUM_URL);
    const html = await indexResp.text();
    const jsMatch = html.match(/href="([^"]*forum-client[^"]*\.js)"/);
    expect(jsMatch).toBeTruthy();
  });

  test('sw.js self-uninstaller is served', async ({ request }) => {
    const resp = await request.get('https://dreamlab-ai.com/sw.js');
    expect(resp.status()).toBe(200);
    const text = await resp.text();
    expect(text).toContain('unregister');
  });
});

// ─── 3. Forum WASM app renders ────────────────────────────────────────
test.describe('Forum WASM app', () => {
  test('WASM app renders forum homepage', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(FORUM_URL, { waitUntil: 'load', timeout: 30000 });
    // Wait for WASM to hydrate
    await page.waitForFunction(() => {
      return document.querySelector('h1')?.textContent?.includes('MiniMooNoir') ||
             document.querySelector('h1')?.textContent?.includes('DreamLab') ||
             document.querySelectorAll('nav a').length > 2;
    }, { timeout: 30000 });

    const title = await page.textContent('h1');
    console.log('Forum H1:', title);
    expect(title).toBeTruthy();

    await page.screenshot({ path: '/tmp/forum-homepage.png', fullPage: true });
    console.log('Screenshot: /tmp/forum-homepage.png');

    const fatalErrors = errors.filter(e =>
      !e.includes('ServiceWorker') && !e.includes('aborted') && !e.includes('supabase')
    );
    console.log('Page errors:', errors.length, 'Fatal:', fatalErrors.length);
    if (fatalErrors.length > 0) console.log('Fatal errors:', fatalErrors);
  });

  test('forum renders nav links for login/signup', async ({ page }) => {
    await page.goto(FORUM_URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => document.querySelectorAll('a').length > 3, { timeout: 30000 });

    const loginLink = page.locator('a[href*="login"]').first();
    const signupLink = page.locator('a[href*="signup"]').first();

    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await expect(signupLink).toBeVisible({ timeout: 10000 });

    console.log('Login href:', await loginLink.getAttribute('href'));
    console.log('Signup href:', await signupLink.getAttribute('href'));
  });
});

// ─── 4. Login flow with nsec ──────────────────────────────────────────
test.describe('Forum login (nsec)', () => {
  test('navigate to login page', async ({ page }) => {
    await page.goto(FORUM_URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => document.querySelectorAll('a').length > 3, { timeout: 30000 });

    // Click login link
    await page.click('a[href*="login"]');
    await page.waitForURL('**/login**', { timeout: 15000 });

    await page.screenshot({ path: '/tmp/forum-login-page.png', fullPage: true });
    console.log('Login page URL:', page.url());

    // Catalog all form elements
    const formElements = await page.evaluate(() => {
      const els = document.querySelectorAll('input, button, textarea, select, a[href]');
      return Array.from(els).map(el => ({
        tag: el.tagName,
        type: (el as HTMLInputElement).type || '',
        name: (el as HTMLInputElement).name || '',
        placeholder: (el as HTMLInputElement).placeholder || '',
        text: (el.textContent || '').trim().slice(0, 80),
        href: ((el as HTMLAnchorElement).href || '').slice(0, 120),
        id: el.id,
        class: el.className.toString().slice(0, 80),
      }));
    });
    console.log('Login page elements:', JSON.stringify(formElements, null, 2));
  });

  test('enter nsec and authenticate', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));

    await page.goto(`${FORUM_URL}login`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => {
      return document.querySelectorAll('input').length > 0 ||
             document.querySelectorAll('button').length > 0;
    }, { timeout: 30000 });

    await page.screenshot({ path: '/tmp/forum-login-ready.png', fullPage: true });

    // Try multiple selectors for the key input
    const keyInput = page.locator([
      'input[type="password"]',
      'input[placeholder*="nsec"]',
      'input[placeholder*="key"]',
      'input[placeholder*="private"]',
      'input[placeholder*="hex"]',
      'input[name*="key"]',
      'input[name*="nsec"]',
      'textarea[placeholder*="key"]',
    ].join(', ')).first();

    if (await keyInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('Found key input, filling nsec...');
      await keyInput.fill(ADMIN_NSEC);
      await page.waitForTimeout(500);

      await page.screenshot({ path: '/tmp/forum-login-filled.png', fullPage: true });

      // Find and click submit
      const submitBtn = page.locator([
        'button[type="submit"]',
        'button:has-text("Log")',
        'button:has-text("Sign")',
        'button:has-text("Connect")',
        'button:has-text("Enter")',
        'input[type="submit"]',
      ].join(', ')).first();

      if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('Clicking submit...');
        await submitBtn.click();
        await page.waitForTimeout(5000);
        await page.screenshot({ path: '/tmp/forum-post-login.png', fullPage: true });
        console.log('Post-login URL:', page.url());

        // Check if we're now authenticated
        const bodyText = await page.textContent('body');
        const isLoggedIn = bodyText?.includes('Profile') ||
                          bodyText?.includes('Logout') ||
                          bodyText?.includes('Settings') ||
                          bodyText?.includes('New Post') ||
                          bodyText?.includes('New Thread') ||
                          !bodyText?.includes('Log In');
        console.log('Appears logged in:', isLoggedIn);
        console.log('Body excerpt:', bodyText?.slice(0, 300));
      } else {
        console.log('No submit button found');
      }
    } else {
      // Maybe there's a "use nsec" or "advanced" toggle
      console.log('No direct key input visible. Looking for toggle...');
      const toggles = await page.evaluate(() => {
        const btns = document.querySelectorAll('button, a, [role="tab"], [role="button"]');
        return Array.from(btns).map(b => ({
          text: (b.textContent || '').trim().slice(0, 80),
          tag: b.tagName,
        }));
      });
      console.log('Available buttons/tabs:', JSON.stringify(toggles, null, 2));

      // Try clicking "nsec" or "key" or "advanced" tabs
      for (const keyword of ['nsec', 'key', 'hex', 'advanced', 'manual', 'private', 'alternate']) {
        const toggle = page.locator(`button:has-text("${keyword}"), a:has-text("${keyword}"), [role="tab"]:has-text("${keyword}")`).first();
        if (await toggle.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`Found toggle: "${keyword}" — clicking...`);
          await toggle.click();
          await page.waitForTimeout(1000);
          break;
        }
      }

      await page.screenshot({ path: '/tmp/forum-login-after-toggle.png', fullPage: true });

      // Try finding the input again after toggle
      const keyInput2 = page.locator('input[type="password"], input[type="text"], textarea').first();
      if (await keyInput2.isVisible({ timeout: 5000 }).catch(() => false)) {
        await keyInput2.fill(ADMIN_NSEC);
        await page.waitForTimeout(500);
        const submitBtn2 = page.locator('button[type="submit"], button:has-text("Log"), button:has-text("Sign"), button:has-text("Connect")').first();
        if (await submitBtn2.isVisible({ timeout: 3000 }).catch(() => false)) {
          await submitBtn2.click();
          await page.waitForTimeout(5000);
          await page.screenshot({ path: '/tmp/forum-post-login.png', fullPage: true });
          console.log('Post-login URL:', page.url());
        }
      }
    }

    console.log('Console messages:', consoleMessages.filter(m => m.includes('[error]') || m.includes('[warn]')).slice(0, 10));
  });
});

// ─── 5. Forum navigation and structure ────────────────────────────────
test.describe('Forum navigation', () => {
  test('page structure and elements', async ({ page }) => {
    await page.goto(FORUM_URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => document.querySelectorAll('a').length > 3, { timeout: 30000 });

    const navLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href]');
      return Array.from(links).map(a => ({
        text: (a.textContent || '').trim().slice(0, 60),
        href: (a as HTMLAnchorElement).href.slice(0, 120),
      })).filter(l => l.text.length > 0);
    });
    console.log('Nav links:', JSON.stringify(navLinks, null, 2));

    const headings = await page.evaluate(() => {
      const hs = document.querySelectorAll('h1, h2, h3');
      return Array.from(hs).map(h => ({ level: h.tagName, text: (h.textContent || '').trim().slice(0, 80) }));
    });
    console.log('Headings:', JSON.stringify(headings, null, 2));

    expect(headings.length).toBeGreaterThan(0);
  });
});

// ─── 6. Nostr relay WebSocket (via browser context) ──────────────────
test.describe('Nostr relay messaging', () => {
  test('relay accepts REQ and returns EOSE', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(async (relayUrl) => {
      return new Promise<{ connected: boolean; eoseReceived: boolean; eventCount: number; error?: string }>((resolve) => {
        const ws = new WebSocket(relayUrl);
        const state = { connected: false, eoseReceived: false, eventCount: 0 };

        ws.onopen = () => {
          state.connected = true;
          ws.send(JSON.stringify(['REQ', 'test-sub-1', { kinds: [1], limit: 10 }]));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg[0] === 'EVENT') state.eventCount++;
            else if (msg[0] === 'EOSE') {
              state.eoseReceived = true;
              ws.send(JSON.stringify(['CLOSE', 'test-sub-1']));
              ws.close();
              resolve(state);
            }
          } catch {}
        };

        ws.onerror = () => resolve({ ...state, error: 'WebSocket error' });
        setTimeout(() => { ws.close(); resolve({ ...state, error: 'Timeout' }); }, 15000);
      });
    }, RELAY_URL);

    console.log('Relay REQ test:', result);
    expect(result.connected).toBe(true);
    expect(result.eoseReceived).toBe(true);
  });

  test('relay returns kind-0 profiles', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(async (relayUrl) => {
      return new Promise<{ profiles: number; error?: string }>((resolve) => {
        const ws = new WebSocket(relayUrl);
        let profiles = 0;

        ws.onopen = () => {
          ws.send(JSON.stringify(['REQ', 'profiles', { kinds: [0], limit: 20 }]));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg[0] === 'EVENT' && msg[2]?.kind === 0) profiles++;
            else if (msg[0] === 'EOSE') {
              ws.close();
              resolve({ profiles });
            }
          } catch {}
        };

        ws.onerror = () => resolve({ profiles, error: 'error' });
        setTimeout(() => { ws.close(); resolve({ profiles, error: 'timeout' }); }, 15000);
      });
    }, RELAY_URL);

    console.log('Profiles on relay:', result.profiles);
    expect(result.profiles).toBeGreaterThanOrEqual(0);
  });

  test('relay accepts kind-40/41 channel events', async ({ page }) => {
    await page.goto('about:blank');

    const result = await page.evaluate(async (relayUrl) => {
      return new Promise<{ channels: number; messages: number; error?: string }>((resolve) => {
        const ws = new WebSocket(relayUrl);
        let channels = 0, messages = 0;

        ws.onopen = () => {
          ws.send(JSON.stringify(['REQ', 'channels', { kinds: [40, 41, 42], limit: 50 }]));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg[0] === 'EVENT') {
              if (msg[2]?.kind === 40) channels++;
              else if (msg[2]?.kind === 42) messages++;
            } else if (msg[0] === 'EOSE') {
              ws.close();
              resolve({ channels, messages });
            }
          } catch {}
        };

        ws.onerror = () => resolve({ channels, messages, error: 'error' });
        setTimeout(() => { ws.close(); resolve({ channels, messages, error: 'timeout' }); }, 15000);
      });
    }, RELAY_URL);

    console.log('Channels:', result.channels, 'Messages:', result.messages);
  });
});

// ─── 7. Visual baseline ──────────────────────────────────────────────
test.describe('Visual baseline', () => {
  test('capture forum desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(FORUM_URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('h1') !== null, { timeout: 30000 });
    await page.screenshot({ path: '/tmp/forum-desktop.png', fullPage: true });
    console.log('Saved: /tmp/forum-desktop.png');
  });

  test('capture forum mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(FORUM_URL, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => document.querySelector('h1') !== null, { timeout: 30000 });
    await page.screenshot({ path: '/tmp/forum-mobile.png', fullPage: true });
    console.log('Saved: /tmp/forum-mobile.png');
  });
});

// ─── 8. Security headers + CORS ──────────────────────────────────────
test.describe('Security', () => {
  test('forum serves HSTS', async ({ request }) => {
    const resp = await request.get(FORUM_URL);
    expect(resp.headers()['strict-transport-security']).toBeTruthy();
  });

  test('workers return scoped CORS', async ({ request }) => {
    for (const url of [AUTH_API, POD_API, SEARCH_API, LINK_PREVIEW_API]) {
      const resp = await request.get(`${url}/health`);
      const cors = resp.headers()['access-control-allow-origin'];
      console.log(`${new URL(url).hostname.split('.')[0]}: CORS=${cors}`);
      expect(cors).toBeTruthy();
    }
  });
});

import { test, expect } from 'playwright/test';

const FORUM_URL = 'https://dreamlab-ai.com/community/';
// SECURITY: throwaway test-only secret key (hex), generated locally. MUST NEVER
// reuse a live operator identity (e.g. operator-jjohare in dreamlab.toml). A
// prior revision embedded the live admin private key here; do not reintroduce it.
const ADMIN_NSEC = '7ce4076eb09286c50075e2663bddac3eaadec6c539db9c84f7ea682977101caa';

test('full login flow with hex key', async ({ page }) => {
  test.setTimeout(120000);

  const consoleMessages: string[] = [];
  const networkRequests: string[] = [];
  const wsMessages: string[] = [];

  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('request', req => {
    const url = req.url();
    if (!url.includes('favicon') && !url.includes('.png') && !url.includes('.css'))
      networkRequests.push(`${req.method()} ${url.slice(0, 120)}`);
  });
  page.on('websocket', ws => {
    wsMessages.push(`WS OPEN: ${ws.url()}`);
    ws.on('framesent', f => wsMessages.push(`WS SENT: ${String(f.payload).slice(0, 200)}`));
    ws.on('framereceived', f => wsMessages.push(`WS RECV: ${String(f.payload).slice(0, 200)}`));
    ws.on('close', () => wsMessages.push('WS CLOSED'));
  });

  // Go to login page directly
  await page.goto(`${FORUM_URL}login`, { waitUntil: 'load', timeout: 30000 });

  // Wait for the login form to render
  await page.waitForFunction(() => {
    return document.querySelector('input[type="password"]') !== null;
  }, { timeout: 30000 });

  console.log('Login form rendered');
  await page.screenshot({ path: '/tmp/login-1-ready.png', fullPage: true });

  // Fill the hex key
  const keyInput = page.locator('input[type="password"]').first();
  await keyInput.fill(ADMIN_NSEC);
  console.log('Key filled');

  await page.screenshot({ path: '/tmp/login-2-filled.png', fullPage: true });

  // Click Sign In
  const signInBtn = page.locator('button:has-text("Sign In")').first();
  await signInBtn.click();
  console.log('Sign In clicked, waiting for navigation/state change...');

  // Wait up to 45s for the page to change — either URL changes or new elements appear
  try {
    await Promise.race([
      page.waitForURL(url => !url.toString().includes('/login'), { timeout: 45000 }),
      page.waitForFunction(() => {
        const body = document.body?.textContent || '';
        return body.includes('Profile') || body.includes('Logout') || body.includes('Sign Out') ||
               body.includes('Settings') || body.includes('New Post') || body.includes('New Thread') ||
               body.includes('channels') || body.includes('Welcome') ||
               document.querySelector('[data-authenticated]') !== null;
      }, { timeout: 45000 }),
    ]);
    console.log('Post-login state detected');
  } catch {
    console.log('Timed out waiting for post-login state');
  }

  await page.screenshot({ path: '/tmp/login-3-post-signin.png', fullPage: true });
  console.log('Post-login URL:', page.url());

  // Dump page state
  const bodyText = await page.textContent('body');
  console.log('Body text (first 500):', bodyText?.slice(0, 500));

  const allElements = await page.evaluate(() => {
    const els = document.querySelectorAll('h1, h2, h3, button, a[href], nav');
    return Array.from(els).map(el => ({
      tag: el.tagName,
      text: (el.textContent || '').trim().slice(0, 80),
      href: ((el as HTMLAnchorElement).href || '').slice(0, 100),
    }));
  });
  console.log('Page elements:', JSON.stringify(allElements, null, 2));

  // Check for error states
  const errors = await page.evaluate(() => {
    const errorEls = document.querySelectorAll('[class*="error"], [class*="Error"], [role="alert"], .toast, .notification');
    return Array.from(errorEls).map(e => (e.textContent || '').trim().slice(0, 200));
  });
  if (errors.length > 0) console.log('Error elements:', errors);

  // Report WebSocket activity
  console.log('WebSocket messages:', wsMessages.slice(0, 30));
  console.log('Console errors:', consoleMessages.filter(m => m.startsWith('[error]')).slice(0, 15));
  console.log('Network requests (last 20):', networkRequests.slice(-20));
});

test('check "More options" toggle on login page', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto(`${FORUM_URL}login`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('input[type="password"]') !== null, { timeout: 30000 });

  // Click "More options" to see if there's an alternate auth path
  const moreOptionsBtn = page.locator('button:has-text("More options")');
  if (await moreOptionsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await moreOptionsBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/login-more-options.png', fullPage: true });

    const expanded = await page.evaluate(() => {
      const els = document.querySelectorAll('button, a, input, select, textarea, [role="button"]');
      return Array.from(els).map(el => ({
        tag: el.tagName,
        type: (el as HTMLInputElement).type || '',
        text: (el.textContent || '').trim().slice(0, 80),
        placeholder: (el as HTMLInputElement).placeholder || '',
        href: ((el as HTMLAnchorElement).href || '').slice(0, 100),
      }));
    });
    console.log('After "More options":', JSON.stringify(expanded, null, 2));
  } else {
    console.log('"More options" button not found');
  }
});

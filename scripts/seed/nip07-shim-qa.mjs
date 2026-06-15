// QA shim: inject a NIP-07 `window.nostr` provider into the browsercontainer
// Chrome BEFORE the forum boots, backed by the operator key, so the forum-client
// runs its NIP-07 code path (has_nip07_extension()==true, get_signer()==Nip07Signer).
//
// Purpose: reproduce + verify the two NIP-07-only forum bugs on the DEPLOYED build
//   BUG 1 — DMs not surfaced for NIP-07 sessions (gift-wrap decrypt via window.nostr.nip44)
//   BUG 2 — notification bell badge count != expanded center list
//
// The private key is read from agentbox/.env INSIDE this process and used only to
// build the in-page shim functions; it is injected into the page context via CDP
// addScriptToEvaluateOnNewDocument. The secret never passes through an MCP tool or
// stdout (we print only the public key + observations).
//
//   node scripts/seed/nip07-shim-qa.mjs
//   FORUM_ORIGIN=https://dreamlab-ai.com/community/ node scripts/seed/nip07-shim-qa.mjs
//
// The forum-client NIP-07 session schema (auth/session.rs StoredSession):
//   localStorage.nostr_bbs_keys = StoredSession{ isNip07:true, publicKey, ... }
// and restore_session() re-installs Nip07Signer when window.nostr is present.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { nip04, nip44 } from 'nostr-tools';
import WebSocket from 'ws';

const CDP = process.env.BROWSER_CDP || 'browsercontainer:9223';
const ORIGIN = process.env.FORUM_ORIGIN || 'https://dreamlab-ai.com/community/';
const ENV_FILE = process.env.AGENTBOX_ENV || '/home/devuser/workspace/project/agentbox/.env';

const sk = readFileSync(ENV_FILE, 'utf8').match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)?.[1];
if (!sk) { console.error('AGENTBOX_PRIVKEY_HEX not found in', ENV_FILE); process.exit(1); }
const skBytes = Buffer.from(sk, 'hex');
const pubkey = getPublicKey(skBytes);

const cdpGet = (path) => new Promise((res, rej) => {
  const [host, port] = CDP.split(':');
  http.get({ host, port, path, headers: { Host: 'localhost' } }, (r) => {
    let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res(JSON.parse(b)));
  }).on('error', rej);
});

// The shim body runs IN THE PAGE; the page has no node modules, so it cannot do
// the secret-key crypto itself. Instead the shim *proxies* every nip44/nip04/
// signEvent call back over CDP to THIS Node process, which answers with
// nostr-tools using the operator key. The key never enters the page — only the
// resolved ciphertext/plaintext/signature crosses the bridge.
//
// Mechanism: the shim calls a CDP binding (`Runtime.addBinding` -> `nip07bridge`)
// with a JSON {id, op, args} payload; Node computes the result and resolves the
// page-side promise by evaluating `window.__nip07_resolve(id, ok, val)`.
// CDP bindings are the canonical way to call back into the driver from the page.
const SHIM = (PK) => `(() => {
  if (window.__nip07_installed) return;
  window.__nip07_installed = true;
  window.__nip07_seq = 0;
  window.__nip07_pending = {};
  const call = (op, args) => new Promise((resolve, reject) => {
    const id = ++window.__nip07_seq;
    window.__nip07_pending[id] = { resolve, reject };
    // nip07bridge is a CDP binding: calling it delivers the payload to the driver.
    window.nip07bridge(JSON.stringify({ id, op, args }));
  });
  window.__nip07_resolve = (id, ok, val) => {
    const p = window.__nip07_pending[id];
    if (!p) return;
    delete window.__nip07_pending[id];
    ok ? p.resolve(val) : p.reject(new Error(val));
  };
  window.nostr = {
    _isQaShim: true,
    name: 'QA NIP-07 Shim',
    getPublicKey: async () => ${JSON.stringify(PK)},
    signEvent: async (e) => call('signEvent', e),
    nip44: {
      encrypt: async (pk, pt) => call('nip44.encrypt', { pk, pt }),
      decrypt: async (pk, ct) => call('nip44.decrypt', { pk, ct }),
    },
    nip04: {
      encrypt: async (pk, pt) => call('nip04.encrypt', { pk, pt }),
      decrypt: async (pk, ct) => call('nip04.decrypt', { pk, ct }),
    },
  };
})();`;

async function main() {
  const list = await cdpGet('/json/list');
  let page = list.find((p) => p.type === 'page');
  if (!page) page = await cdpGet('/json/new?' + encodeURIComponent(ORIGIN));
  const wsUrl = page.webSocketDebuggerUrl.replace(/ws:\/\/[^/]+/, `ws://${CDP}`);
  const ws = new WebSocket(wsUrl, { headers: { Host: 'localhost' } });

  let id = 0; const pending = new Map();
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const consoleLines = [];
  ws.on('message', (m) => {
    const msg = JSON.parse(m);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); return; }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
      consoleLines.push(`[${msg.params.type}] ${text}`);
    }
    if (msg.method === 'Runtime.bindingCalled' && msg.params.name === 'nip07bridge') {
      handleBridge(JSON.parse(msg.params.payload));
    }
  });
  await new Promise((res) => ws.once('open', res));

  await send('Page.enable');
  await send('Runtime.enable');

  // Answer page-side nostr crypto calls in Node with the operator key.
  const handleBridge = async ({ id: rid, op, args }) => {
    let ok = true, val;
    try {
      if (op === 'signEvent') {
        const e = { ...args, pubkey };
        val = finalizeEvent({ kind: e.kind, created_at: e.created_at, tags: e.tags, content: e.content }, skBytes);
      } else if (op === 'nip44.encrypt') {
        const ck = nip44.v2.utils.getConversationKey(skBytes, args.pk);
        val = nip44.v2.encrypt(args.pt, ck);
      } else if (op === 'nip44.decrypt') {
        const ck = nip44.v2.utils.getConversationKey(skBytes, args.pk);
        val = nip44.v2.decrypt(args.ct, ck);
      } else if (op === 'nip04.encrypt') {
        val = await nip04.encrypt(skBytes, args.pk, args.pt);
      } else if (op === 'nip04.decrypt') {
        val = await nip04.decrypt(skBytes, args.pk, args.ct);
      } else {
        throw new Error('unknown op ' + op);
      }
    } catch (e) { ok = false; val = e.message; }
    const payload = typeof val === 'string' ? JSON.stringify(val) : JSON.stringify(val);
    await send('Runtime.evaluate', {
      expression: `window.__nip07_resolve(${rid}, ${ok}, ${ok ? payload : JSON.stringify(val)})`,
    });
  };

  // Register the CDP binding the shim calls back through.
  await send('Runtime.addBinding', { name: 'nip07bridge' });
  // Install the shim BEFORE any document script runs (this is the crux: the WASM
  // forum reads window.nostr during boot for has_nip07_extension()).
  await send('Page.addScriptToEvaluateOnNewDocument', { source: SHIM(pubkey) });

  // Persist a NIP-07 session so restore_session() re-installs Nip07Signer.
  const session = JSON.stringify({
    _v: 2, publicKey: pubkey, isNip07: true, isPasskey: false, isLocalKey: false,
    extensionName: 'QA NIP-07 Shim', nickname: 'john', avatar: null,
    accountStatus: 'complete', nsecBackedUp: true,
  });

  // Land on origin, set the session, then navigate so the shim+session boot together.
  await send('Page.navigate', { url: ORIGIN });
  await new Promise((r) => setTimeout(r, 1500));
  await send('Runtime.evaluate', { expression: `(() => {
    localStorage.removeItem('nostr_bbs_sk');
    localStorage.setItem('nostr_bbs_keys', ${JSON.stringify(JSON.stringify(session))});
    localStorage.setItem('nostr_bbs_remember', 'true');
    return 'session-set';
  })()`, returnByValue: true });

  // Navigate to DM list — addScriptToEvaluateOnNewDocument re-runs the shim here.
  await send('Page.navigate', { url: ORIGIN.replace(/\/$/, '') + '/dm' });
  await new Promise((r) => setTimeout(r, 9000));

  const dmProbe = await send('Runtime.evaluate', {
    expression: `(() => {
      const shim = !!(window.nostr && window.nostr._isQaShim);
      const rows = document.querySelectorAll('a[href*="/dm/"]').length;
      const emptyState = !!document.querySelector('*')
        && Array.from(document.querySelectorAll('*')).some(e => /No conversations yet/i.test(e.textContent||''));
      const errBanner = Array.from(document.querySelectorAll('*'))
        .map(e => e.textContent||'').find(t => /Could not establish|Could not send|not supported/i.test(t)) || null;
      return { shim, dmRows: rows, emptyState, errBanner: errBanner ? errBanner.slice(0,160) : null, url: location.href };
    })()`,
    returnByValue: true,
  });

  // Now check the notification bell + center parity.
  const bellProbe = await send('Runtime.evaluate', {
    expression: `(() => {
      const badgeEl = document.querySelector('.notification-badge');
      const badge = badgeEl ? badgeEl.textContent.trim() : null;
      const bellBtn = document.querySelector('[data-notification-bell] button');
      return { badge, hasBell: !!bellBtn };
    })()`,
    returnByValue: true,
  });
  // Open the center.
  await send('Runtime.evaluate', { expression: `document.querySelector('[data-notification-bell] button')?.click()` });
  await new Promise((r) => setTimeout(r, 800));
  const centerProbe = await send('Runtime.evaluate', {
    expression: `(() => {
      const noneEl = Array.from(document.querySelectorAll('*')).some(e => /No notifications/i.test(e.textContent||''));
      // Rows in the center have border-b border-gray-800/50 and a title span.
      const rows = document.querySelectorAll('.overflow-y-auto > div').length;
      return { centerEmpty: noneEl, centerRows: rows };
    })()`,
    returnByValue: true,
  });

  console.log('pubkey       :', pubkey);
  console.log('DM probe     :', JSON.stringify(dmProbe?.result?.value));
  console.log('Bell probe   :', JSON.stringify(bellProbe?.result?.value));
  console.log('Center probe :', JSON.stringify(centerProbe?.result?.value));
  console.log('--- console (nip44/DM/notif relevant) ---');
  for (const l of consoleLines) {
    if (/nip44|nip07|DM|Gift|notif|AUTH|Relay|decrypt|signer/i.test(l)) console.log(l);
  }
  ws.close();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

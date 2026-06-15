// QA helper: log the browsercontainer Chrome into the Minimoonoir forum as the
// operator (local-key session), so authenticated/gated zones are visible for
// browser-automation QA.
//
// The private key is read from agentbox/.env *inside this process* and injected
// straight into the page's localStorage over raw CDP — it never passes through
// an MCP tool call, so it is not written to any transcript or the session mirror.
// stdout prints only the (public) pubkey + status.
//
//   node scripts/seed/browser-login.mjs            # default origin dreamlab-ai.com
//   FORUM_ORIGIN=https://dreamlab-ai.com/community/ node scripts/seed/browser-login.mjs
//
// Mirrors the forum-client local-key session schema (auth/session.rs):
//   localStorage.nostr_bbs_sk   = <privkey hex>
//   localStorage.nostr_bbs_keys = StoredSession{ isLocalKey:true, publicKey, ... }
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { getPublicKey } from 'nostr-tools/pure';
import WebSocket from 'ws';

const CDP = process.env.BROWSER_CDP || 'browsercontainer:9223';
const ORIGIN = process.env.FORUM_ORIGIN || 'https://dreamlab-ai.com/community/';
const ENV_FILE = process.env.AGENTBOX_ENV || '/home/devuser/workspace/project/agentbox/.env';

const sk = readFileSync(ENV_FILE, 'utf8').match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)?.[1];
if (!sk) { console.error('AGENTBOX_PRIVKEY_HEX not found in', ENV_FILE); process.exit(1); }
const pubkey = getPublicKey(Buffer.from(sk, 'hex'));

const cdpGet = (path) => new Promise((res, rej) => {
  const [host, port] = CDP.split(':');
  http.get({ host, port, path, headers: { Host: 'localhost' } }, (r) => {
    let b = ''; r.on('data', (c) => (b += c)); r.on('end', () => res(JSON.parse(b)));
  }).on('error', rej);
});

async function main() {
  const list = await cdpGet('/json/list');
  let page = list.find((p) => p.type === 'page');
  if (!page) page = await cdpGet('/json/new?' + encodeURIComponent(ORIGIN));
  const wsUrl = page.webSocketDebuggerUrl.replace(/ws:\/\/[^/]+/, `ws://${CDP}`);
  const ws = new WebSocket(wsUrl, { headers: { Host: 'localhost' } });

  let id = 0; const pending = new Map();
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const events = {};
  ws.on('message', (m) => {
    const msg = JSON.parse(m);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
    else if (msg.method) { (events[msg.method] ||= []).push(msg.params); }
  });
  await new Promise((res) => ws.once('open', res));

  await send('Page.enable');
  await send('Runtime.enable');
  // 1) land on the origin so localStorage is scoped correctly
  await send('Page.navigate', { url: ORIGIN });
  await new Promise((r) => setTimeout(r, 2500));
  // 2) inject the local-key session (privkey stays in this expression only)
  const session = JSON.stringify({
    _v: 2, publicKey: pubkey, isNip07: false, isPasskey: false, isLocalKey: true,
    extensionName: null, nickname: 'operator', avatar: null,
    accountStatus: 'complete', nsecBackedUp: true,
  });
  // nostr_bbs_keys is read via gloo LocalStorage::get::<String> -> it expects the
  // gloo DOUBLE-encoded form (a JSON string whose content is the object JSON), i.e.
  // JSON.stringify(JSON.stringify(session)). nostr_bbs_sk is read raw via web_sys.
  const inject = `(() => { try {
    localStorage.setItem('nostr_bbs_sk', ${JSON.stringify(sk)});
    localStorage.setItem('nostr_bbs_keys', ${JSON.stringify(JSON.stringify(session))});
    localStorage.setItem('nostr_bbs_remember', 'true');
    return 'set:' + (localStorage.getItem('nostr_bbs_sk') ? 'ok' : 'fail');
  } catch (e) { return 'err:' + e.message; } })()`;
  const r1 = await send('Runtime.evaluate', { expression: inject, returnByValue: true });
  // 3) reload so restore_session() picks up the local-key session
  await send('Page.reload', {});
  await new Promise((r) => setTimeout(r, 4000));
  const r2 = await send('Runtime.evaluate', {
    expression: `({ url: location.href, hasSk: !!localStorage.getItem('nostr_bbs_sk'), keys: localStorage.getItem('nostr_bbs_keys') })`,
    returnByValue: true,
  });

  console.log('pubkey      :', pubkey);
  console.log('inject      :', r1?.result?.value);
  console.log('post-reload :', r2?.result?.value?.url);
  console.log('session set :', r2?.result?.value?.hasSk);
  ws.close();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });

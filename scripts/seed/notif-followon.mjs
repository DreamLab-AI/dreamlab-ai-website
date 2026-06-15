// Follow-on: assumes the page is ALREADY authed (run nip07-shim-qa.mjs first,
// which lands authed on /dm). Does NOT touch the session. Re-attaches the
// nip07 bridge, navigates to /forums, lets sync settle, publishes a foreign
// kind-42 live, and reports whether a notification appeared.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { getPublicKey, finalizeEvent } from 'nostr-tools/pure';
import { nip04, nip44 } from 'nostr-tools';
import WebSocket from 'ws';

const CDP = process.env.BROWSER_CDP || 'browsercontainer:9223';
const ORIGIN = process.env.FORUM_ORIGIN || 'https://dreamlab-ai.com/community/';
const ENV_FILE = '/home/devuser/workspace/project/agentbox/.env';
const RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const CHANNEL = '04d6fd408977bdd1fb515b4bd97881da1ac7f27291b9539184e12ca974b1bf2f';

const env = readFileSync(ENV_FILE, 'utf8');
const opSk = Buffer.from(env.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex');
const opPub = getPublicKey(opSk);
const jjSk = Uint8Array.from(Buffer.from(env.match(/^JUNKIEJARVIS_PRIVKEY_HEX=([0-9a-f]{64})/m)[1], 'hex'));
const now = () => Math.floor(Date.now() / 1000);
const MARK = `FOLLOWON-${Date.now()}`;

const cdpGet = (p) => new Promise((res, rej) => { const [h, port] = CDP.split(':'); http.get({ host:h, port, path:p, headers:{Host:'localhost'} }, (r)=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>res(JSON.parse(b)));}).on('error',rej); });
const SHIM = (PK) => `(()=>{if(window.__nip07_installed)return;window.__nip07_installed=true;window.__nip07_seq=0;window.__nip07_pending={};const call=(op,args)=>new Promise((resolve,reject)=>{const id=++window.__nip07_seq;window.__nip07_pending[id]={resolve,reject};window.nip07bridge(JSON.stringify({id,op,args}));});window.__nip07_resolve=(id,ok,val)=>{const p=window.__nip07_pending[id];if(!p)return;delete window.__nip07_pending[id];ok?p.resolve(val):p.reject(new Error(val));};window.nostr={_isQaShim:true,name:'QA',getPublicKey:async()=>${JSON.stringify(PK)},signEvent:async(e)=>call('signEvent',e),nip44:{encrypt:async(pk,pt)=>call('nip44.encrypt',{pk,pt}),decrypt:async(pk,ct)=>call('nip44.decrypt',{pk,ct})},nip04:{encrypt:async(pk,pt)=>call('nip04.encrypt',{pk,pt}),decrypt:async(pk,ct)=>call('nip04.decrypt',{pk,ct})}};})();`;

function publishForeign() {
  return new Promise((resolve) => {
    const ws = new WebSocket(RELAY);
    const ev = finalizeEvent({ kind: 42, created_at: now(), tags: [['e', CHANNEL, '', 'root']], content: `${MARK} foreign reply — please notify` }, jjSk);
    const t = setTimeout(()=>{ws.close();resolve({ok:false,id:ev.id});},12000);
    ws.on('message',(raw)=>{const d=JSON.parse(raw);
      if(d[0]==='AUTH'){ws.send(JSON.stringify(['AUTH',finalizeEvent({kind:22242,created_at:now(),tags:[['relay',RELAY],['challenge',d[1]]],content:''},jjSk)]));setTimeout(()=>ws.send(JSON.stringify(['EVENT',ev])),400);}
      else if(d[0]==='OK'&&d[1]===ev.id){clearTimeout(t);ws.close();resolve({ok:d[2],id:ev.id});}});
    ws.on('error',()=>{clearTimeout(t);resolve({ok:false,id:ev.id});});
  });
}

async function main() {
  const list = await cdpGet('/json/list');
  const page = list.find(p=>p.type==='page');
  const wsUrl = page.webSocketDebuggerUrl.replace(/ws:\/\/[^/]+/, `ws://${CDP}`);
  const ws = new WebSocket(wsUrl,{headers:{Host:'localhost'}});
  let id=0; const pending=new Map();
  const send=(m,p={})=>new Promise(res=>{const i=++id;pending.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
  const evalp=async(e)=>(await send('Runtime.evaluate',{expression:e,returnByValue:true}))?.result?.value;
  ws.on('message',(m)=>{const msg=JSON.parse(m);
    if(msg.id&&pending.has(msg.id)){pending.get(msg.id)(msg.result);pending.delete(msg.id);return;}
    if(msg.method==='Runtime.bindingCalled'&&msg.params.name==='nip07bridge')hb(JSON.parse(msg.params.payload));});
  await new Promise(res=>ws.once('open',res));
  await send('Page.enable'); await send('Runtime.enable');
  const hb=async({id:rid,op,args})=>{let ok=true,val;try{
    if(op==='signEvent')val=finalizeEvent({kind:args.kind,created_at:args.created_at,tags:args.tags,content:args.content},opSk);
    else if(op==='nip44.encrypt')val=nip44.v2.encrypt(args.pt,nip44.v2.utils.getConversationKey(opSk,args.pk));
    else if(op==='nip44.decrypt')val=nip44.v2.decrypt(args.ct,nip44.v2.utils.getConversationKey(opSk,args.pk));
    else if(op==='nip04.encrypt')val=await nip04.encrypt(opSk,args.pk,args.pt);
    else if(op==='nip04.decrypt')val=await nip04.decrypt(opSk,args.pk,args.ct);
    else throw new Error('op '+op);}catch(e){ok=false;val=e.message;}
    await send('Runtime.evaluate',{expression:`window.__nip07_resolve(${rid}, ${ok}, ${JSON.stringify(val)})`});};
  await send('Runtime.addBinding',{name:'nip07bridge'});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:SHIM(opPub)});

  // Confirm we start authed (from the prior canonical-shim run). Do NOT reset session.
  const start = await evalp(`(()=>({url:location.href,authed:!location.href.includes('/login'),keys:!!localStorage.getItem('nostr_bbs_keys')}))()`);
  // Clear ONLY the notification list so the badge delta is unambiguous (keep read_positions
  // so we exercise the real read-state path; business chat was never opened so read_ts=0).
  await evalp(`localStorage.removeItem('nostrbbs:notifications')`);
  await send('Page.navigate',{url:ORIGIN.replace(/\/$/,'')+'/forums'}); await new Promise(r=>setTimeout(r,13000));
  const onForums = await evalp(`(()=>({url:location.href,authed:!location.href.includes('/login'),bodyLen:(document.body.innerText||'').length}))()`);

  const before = await evalp(`(()=>{const b=document.querySelector('.notification-badge');return{badge:b?b.textContent.trim():null,notif:localStorage.getItem('nostrbbs:notifications')};})()`);
  const pub = await publishForeign();
  await new Promise(r=>setTimeout(r,9000));
  const after = await evalp(`(()=>{const b=document.querySelector('.notification-badge');return{badge:b?b.textContent.trim():null,notif:localStorage.getItem('nostrbbs:notifications')};})()`);
  await evalp(`document.querySelector('[data-notification-bell] button')?.click()`);
  await new Promise(r=>setTimeout(r,1200));
  const center = await evalp(`(()=>{const none=Array.from(document.querySelectorAll('*')).some(e=>/No notifications/i.test(e.textContent||''));const links=Array.from(document.querySelectorAll('a[href*="/chat/"]')).map(a=>({href:a.getAttribute('href'),text:(a.textContent||'').replace(/\\s+/g,' ').slice(0,90)}));return{centerEmpty:none,chatLinks:links.slice(0,6)};})()`);

  console.log('start        :', JSON.stringify(start));
  console.log('on forums    :', JSON.stringify(onForums));
  console.log('foreign pub  :', JSON.stringify(pub));
  console.log('BEFORE       :', JSON.stringify(before));
  console.log('AFTER        :', JSON.stringify(after));
  console.log('center       :', JSON.stringify(center));
  console.log('NOTIFIED     :', after.notif && after.notif !== '{"items":[]}' ? 'YES' : 'NO');
  ws.close();
}
main().catch(e=>{console.error('FATAL',e);process.exit(1);});

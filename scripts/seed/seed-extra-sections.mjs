// Add 2 sections per zone (the BBS reads properly with >=2 sections each),
// map them to zones, and start one topic in a few of them.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
const RELAY_WS = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const RELAY_HTTP = 'https://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const env = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');
const adminSk = Uint8Array.from(Buffer.from(env.match(/^AGENTBOX_PRIVKEY_HEX=["']?([0-9a-f]{64})/m)[1], 'hex'));
const now = () => Math.floor(Date.now() / 1000);
function nip98(url, method, body) { const tags=[['u',url],['method',method]]; if(body)tags.push(['payload',createHash('sha256').update(body).digest('hex')]); return 'Nostr '+Buffer.from(JSON.stringify(finalizeEvent({kind:27235,created_at:now(),tags,content:''},adminSk))).toString('base64'); }
async function adminPost(path, obj) { const url=RELAY_HTTP+path; const body=JSON.stringify(obj); const r=await fetch(url,{method:'POST',headers:{Authorization:nip98(url,'POST',body),'Content-Type':'application/json'},body}); return r.status; }
function publish(events) { return new Promise((resolve,reject)=>{ const ws=new WebSocket(RELAY_WS); const acks=new Map(); const t=setTimeout(()=>{ws.close();reject(new Error('timeout '+JSON.stringify([...acks])));},20000);
  ws.onmessage=(m)=>{const d=JSON.parse(m.data);
    if(d[0]==='AUTH'){ws.send(JSON.stringify(['AUTH',finalizeEvent({kind:22242,created_at:now(),tags:[['relay',RELAY_WS],['challenge',d[1]]],content:''},adminSk)]));setTimeout(()=>{for(const ev of events)ws.send(JSON.stringify(['EVENT',ev]));},500);}
    else if(d[0]==='OK'){acks.set(d[1],d[2]); if(acks.size===events.length){clearTimeout(t);ws.close();resolve(acks);}}};
  ws.onerror=(e)=>{clearTimeout(t);reject(e);}; });
}
const SECTIONS = [
  { zone:'public',   slug:'public-introductions', name:'Introductions',      about:'Say hello — who you are and what you make' },
  { zone:'public',   slug:'public-showcase',      name:'Showcase',            about:'Show off projects, art, and builds' },
  { zone:'friends',  slug:'friends-events',       name:'Events & Nights Out', about:'Plan meetups, gigs, and nights out' },
  { zone:'friends',  slug:'friends-music',        name:'Music & Vinyl',       about:'Listening nights, records, recommendations' },
  { zone:'family',   slug:'family-photos',        name:'Photos',              about:'Family photos and moments' },
  { zone:'family',   slug:'family-planning',      name:'Planning',            about:'Holidays, visits, and logistics' },
  { zone:'business', slug:'business-projects',    name:'Projects',            about:'Active project discussion' },
  { zone:'business', slug:'business-leads',       name:'Leads & Contacts',    about:'Opportunities and introductions' },
];
const chanEvents = SECTIONS.map(s => { const ev = finalizeEvent({ kind:40, created_at:now(), tags:[['section',s.slug]], content: JSON.stringify({name:s.name, about:s.about, picture:''}) }, adminSk); s.id = ev.id; return ev; });
const acks = await publish(chanEvents);
console.log('channels:', SECTIONS.map(s=>`${s.slug}:${acks.get(s.id)?'ok':'FAIL'}`).join(' '));
for (const s of SECTIONS) { const st = await adminPost('/api/admin/channel-zone', { channel_id: s.id, zone: s.zone }); if (st!==200) console.log('map FAIL', s.slug, st); }
console.log('zone mappings done');
// starter topics (kind-42 roots) in three sections
const topics = [
  { slug:'friends-music',  text:'First vinyl night of the summer — what are we spinning? Drop your picks.' },
  { slug:'public-introductions', text:'Welcome to the DreamLab forum — introduce yourself here.' },
  { slug:'business-projects', text:'Q3 project board — post one thread per active project.' },
];
const topicEvents = topics.map(t => { const s = SECTIONS.find(x=>x.slug===t.slug); return finalizeEvent({ kind:42, created_at:now(), tags:[['e',s.id,RELAY_WS,'root'],['section',t.slug]], content:t.text }, adminSk); });
const tacks = await publish(topicEvents);
console.log('topics:', [...tacks.values()].filter(Boolean).length + '/' + topics.length, 'accepted');

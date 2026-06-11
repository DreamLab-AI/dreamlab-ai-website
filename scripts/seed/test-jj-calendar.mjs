import { readFileSync } from 'node:fs';
import { finalizeEvent, getPublicKey } from 'nostr-tools/pure';
const RELAY = 'wss://dreamlab-nostr-relay.solitary-paper-764d.workers.dev';
const JJ = '2de44d5622eef79519ac078f6e227a85aecbaefd561e4e50c5f51dfadbf916e9';
const CH = '0bf49b70d978d50a9a6679e8ebff85f163d84e8641ff6b9cd7d42897f4d977b9';
const keys = JSON.parse(readFileSync(new URL('./.test-keys.json', import.meta.url), 'utf8'));
const sk = Uint8Array.from(Buffer.from(keys['friends-carol'].privkey, 'hex'));
const me = getPublicKey(sk);
const now = () => Math.floor(Date.now()/1000);
const ws = new WebSocket(RELAY);
let sent=false, gotReply=false, gotEvent=false;
setTimeout(()=>{ console.log(`\nRESULT: reply=${gotReply} calendarEvent=${gotEvent}`); process.exit(gotReply?0:1); }, 40000);
ws.onmessage=(m)=>{const d=JSON.parse(m.data);
  if(d[0]==='AUTH'){ws.send(JSON.stringify(['AUTH',finalizeEvent({kind:22242,created_at:now(),tags:[['relay',RELAY],['challenge',d[1]]],content:''},sk)]));
    setTimeout(()=>{ ws.send(JSON.stringify(['REQ','r',{kinds:[42],authors:[JJ],since:now()-2}])); ws.send(JSON.stringify(['REQ','cal',{kinds:[31923],authors:[JJ],since:now()-2}]));
      const ev=finalizeEvent({kind:42,created_at:now(),tags:[['e',CH,RELAY,'root'],['section','friends'],['p',JJ]],content:'@junkiejarvis please create a vinyl listening night next Friday 7pm at dreamlab for the friends'},sk);
      ws.send(JSON.stringify(['EVENT',ev])); sent=true; console.log('carol asked JJ to create the event:',ev.id.slice(0,8)); },700);}
  else if(d[0]==='EVENT'&&d[1]==='r'){const e=d[2]; gotReply=true; console.log(`\nJJ REPLY (+chat): ${JSON.stringify(e.content)}`);}
  else if(d[0]==='EVENT'&&d[1]==='cal'){const e=d[2]; gotEvent=true;
    const g=(k)=>(e.tags.find(t=>t[0]===k)||[])[1];
    console.log(`\nJJ CREATED CALENDAR EVENT (kind 31923):`);
    console.log('  title:',g('title'),'| start:',g('start'),'('+new Date(g('start')*1000).toUTCString()+')','| zone:',g('zone'),'| venue:',g('venue'));
    process.exit(0);}
};

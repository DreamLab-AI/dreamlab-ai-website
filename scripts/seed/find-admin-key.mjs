// Locates which env var in agentbox/.env holds the privkey for the admin
// pubkey, without ever printing secret material. Prints: VAR_NAME or NOT_FOUND.
import { readFileSync } from 'node:fs';
import { getPublicKey } from 'nostr-tools/pure';

const ADMIN_PUB = '11ed64225dd5e2c5e18f61ad43d5ad9272d08739d3a20dd25886197b0738663c';
const envText = readFileSync('/home/devuser/workspace/project/agentbox/.env', 'utf8');

for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=["']?([0-9a-fA-F]{64})["']?\s*$/);
  if (!m) continue;
  try {
    const pk = getPublicKey(Uint8Array.from(Buffer.from(m[2], 'hex')));
    if (pk === ADMIN_PUB) {
      console.log(m[1]);
      process.exit(0);
    }
  } catch { /* not a valid key — skip */ }
}
console.log('NOT_FOUND');

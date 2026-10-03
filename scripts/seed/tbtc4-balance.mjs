// Testnet4 L1 balance of a Nostr key: the key's x-only pubkey as a BIP-86
// style taproot key-path output (tweaked with an empty script tree), encoded
// bech32m `tb1p…`, queried on mempool.space's testnet4 API.
//
//   node scripts/seed/tbtc4-balance.mjs < keyfile      (64 hex or nsec1…)
//   printf '%s' "$HEX" | node scripts/seed/tbtc4-balance.mjs
//
// The key is read from stdin only and never printed.
import { readFileSync } from 'node:fs';
import { schnorr, secp256k1 } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bech32m, bech32 } from '@scure/base';

const raw = readFileSync(0, 'utf8').trim();
let sk;
if (/^[0-9a-f]{64}$/i.test(raw)) sk = Buffer.from(raw, 'hex');
else if (raw.startsWith('nsec1')) sk = Buffer.from(bech32.fromWords(bech32.decode(raw, 90).words));
else { console.error('expected 64 hex chars or nsec1… on stdin'); process.exit(2); }

const tagged = (tag, ...msgs) => { const h = sha256(Buffer.from(tag)); return sha256(Buffer.concat([h, h, ...msgs])); };
const internal = schnorr.getPublicKey(sk);                         // x-only, 32 bytes
const tweak = tagged('TapTweak', internal);
const P = secp256k1.ProjectivePoint.fromHex(Buffer.concat([Buffer.from([2]), internal]));  // even-y lift
const Q = P.add(secp256k1.ProjectivePoint.BASE.multiply(BigInt('0x' + Buffer.from(tweak).toString('hex'))));
const output = Q.toRawBytes(true).slice(1);                        // x-only of Q
const addr = bech32m.encode('tb', [1, ...bech32m.toWords(output)], 90);

const r = await fetch(`https://mempool.space/testnet4/api/address/${addr}`);
if (!r.ok) { console.error(`mempool.space ${r.status}`); process.exit(1); }
const j = await r.json();
const c = j.chain_stats, m = j.mempool_stats;
console.log(`address   ${addr}`);
console.log(`confirmed ${c.funded_txo_sum - c.spent_txo_sum} sats (${c.tx_count} txs)`);
console.log(`mempool   ${m.funded_txo_sum - m.spent_txo_sum} sats (${m.tx_count} txs)`);

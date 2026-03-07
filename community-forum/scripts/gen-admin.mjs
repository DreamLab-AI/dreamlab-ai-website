#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateMnemonic, mnemonicToSeed } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { getPublicKey, nip19 } from 'nostr-tools';

// Generate 128 bits of entropy (12 words)
const mnemonic = generateMnemonic(wordlist, 128);

// Derive keys using NIP-06 path
const seed = await mnemonicToSeed(mnemonic, '');
const root = HDKey.fromMasterSeed(seed);
const path = "m/44'/1237'/0'/0/0"; // NIP-06 standard
const derived = root.derive(path);

if (!derived.privateKey) {
  throw new Error('Failed to derive private key');
}

const privkeyHex = bytesToHex(derived.privateKey);
const pubkeyHex = getPublicKey(hexToBytes(privkeyHex));

// Convert to Nostr formats (following project pattern from src/lib/nostr/keys.ts)
const nsec = nip19.nsecEncode(hexToBytes(privkeyHex));
const npub = nip19.npubEncode(pubkeyHex);

const printSecrets = process.argv.includes('--print-secrets');

console.log('=== NEW ADMIN CREDENTIALS ===');
console.log('');
console.log('PUBLIC KEY (hex):');
console.log(pubkeyHex);
console.log('');
console.log('NPUB (public key bech32):');
console.log(npub);
console.log('');
console.log('.env file:');
console.log(`VITE_ADMIN_PUBKEY=${pubkeyHex}`);
console.log('');
console.log('GitHub Repository Variable:');
console.log(`ADMIN_PUBKEY=${pubkeyHex}`);

// Write secrets to file by default
const secretsFile = join(process.cwd(), `.admin-secrets-${pubkeyHex.slice(0, 8)}.txt`);
const secretsContent = [
  'ADMIN SECRETS — DESTROY AFTER SECURE BACKUP',
  '=============================================',
  '',
  `MNEMONIC: ${mnemonic}`,
  `NSEC: ${nsec}`,
  `PRIVATE KEY (hex): ${privkeyHex}`,
  `PUBLIC KEY (hex): ${pubkeyHex}`,
  `NPUB: ${npub}`,
  '',
  `Generated: ${new Date().toISOString()}`,
].join('\n');

writeFileSync(secretsFile, secretsContent, { mode: 0o600 });
console.log('');
console.log(`Secrets written to: ${secretsFile} (mode 0600)`);
console.log('Transfer this file securely, then delete it.');

if (printSecrets) {
  console.log('');
  console.log('========================================');
  console.log('WARNING: SECRETS DISPLAYED ON SCREEN');
  console.log('========================================');
  console.log('');
  console.log('MNEMONIC (12 words - BACKUP SECURELY):');
  console.log(mnemonic);
  console.log('');
  console.log('NSEC (private key bech32 - NEVER SHARE):');
  console.log(nsec);
  console.log('');
  console.log('PRIVATE KEY (hex - NEVER SHARE):');
  console.log(privkeyHex);
}

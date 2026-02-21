// WebAuthn PRF-based Nostr key derivation

import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { getPublicKey } from 'nostr-tools';
import { browser } from '$app/environment';

const PRF_LABEL = new TextEncoder().encode('dreamlab-nostr-key-v1');
const AUTH_API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTH_API_URL) ?? '';
const RP_ID = 'dreamlab-ai.com';

export interface PasskeyRegistrationResult {
  pubkey: string;       // hex
  privkey: Uint8Array;  // 32 bytes, in memory only
  credentialId: string; // base64url
  webId: string | null;
  podUrl: string | null;
  didNostr: string;
}

export interface PasskeyAuthResult {
  pubkey: string;
  privkey: Uint8Array;
  didNostr: string;
  webId: string | null;
}

/** Check if browser supports WebAuthn PRF extension */
export async function isPrfSupported(): Promise<boolean> {
  if (!browser || typeof window === 'undefined' || !window.PublicKeyCredential) return false;
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.() ?? false;
}

/** Derive PRF salt: sha256("dreamlab-nostr-key-v1") */
function getPrfSalt(): ArrayBuffer {
  return sha256(PRF_LABEL).buffer as ArrayBuffer;
}

/**
 * Derive a secp256k1 private key from a WebAuthn PRF output using HKDF-SHA-256.
 * Using raw PRF bytes directly as a privkey is unsafe because the PRF output
 * may not be uniformly distributed in the secp256k1 scalar field.
 */
async function derivePrivkeyFromPrf(prfOutput: ArrayBuffer): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', prfOutput, 'HKDF', false, ['deriveBits']
  );
  const privkeyBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode('nostr-secp256k1-v1'),
    },
    keyMaterial,
    256
  );
  return new Uint8Array(privkeyBits);
}

/**
 * Register a new passkey and derive Nostr keypair from PRF output.
 * Sends registration to auth-api, which provisions a Solid pod.
 *
 * Flow:
 * 1. Fetch registration options from auth-api
 * 2. navigator.credentials.create() with PRF extension
 * 3. Extract PRF output → derive privkey → derive pubkey
 * 4. Send verify request with registration response + pubkey
 */
export async function registerPasskey(displayName: string): Promise<PasskeyRegistrationResult> {
  if (!browser) throw new Error('Browser environment required');

  // Step 1: Get options from server (includes per-user prfSalt as base64url)
  const optRes = await fetch(`${AUTH_API_BASE}/auth/register/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  if (!optRes.ok) throw new Error(`Registration options failed: ${optRes.statusText}`);
  const { options: optionsJSON, prfSalt: prfSaltB64 } = await optRes.json() as { options: any; prfSalt: string };
  if (!prfSaltB64) throw new Error('Server did not return prfSalt in registration options');

  // Step 2: Create passkey with server-provided PRF salt
  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    ...decodeCreationOptions(optionsJSON),
    extensions: {
      prf: { eval: { first: base64urlToBuffer(prfSaltB64) } },
    } as AuthenticationExtensionsClientInputs,
  };

  const credential = (await navigator.credentials.create({
    publicKey: publicKeyOptions,
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error('Passkey creation cancelled or failed');

  // Step 3: Extract PRF output → derive privkey → pubkey
  const extensions = credential.getClientExtensionResults() as AuthenticationExtensionsClientOutputs & {
    prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } };
  };

  if (!extensions.prf?.enabled) {
    throw new Error('PRF extension not supported by this authenticator. Use a FIDO2 authenticator with PRF support (not Windows Hello or cross-device QR).');
  }

  const prfOutput = extensions.prf?.results?.first;
  if (!prfOutput) {
    throw new Error(
      'PRF extension not supported by this authenticator. Please use a modern browser (Chrome 116+, Safari 17.4+).',
    );
  }

  const privkey = await derivePrivkeyFromPrf(prfOutput);
  const pubkey = getPublicKey(privkey);

  // Step 4: Send verify to server
  const verifyRes = await fetch(`${AUTH_API_BASE}/auth/register/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      response: encodeCredentialResponse(credential),
      pubkey,
    }),
  });
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Registration verification failed: ${verifyRes.statusText}`);
  }

  const { didNostr, webId, podUrl } = await verifyRes.json() as {
    didNostr: string;
    webId?: string;
    podUrl?: string;
  };

  return {
    pubkey,
    privkey,
    credentialId: credential.id,
    webId: webId ?? null,
    podUrl: podUrl ?? null,
    didNostr,
  };
}

/**
 * Authenticate with an existing passkey, re-deriving the Nostr privkey from PRF.
 */
export async function authenticatePasskey(pubkey?: string): Promise<PasskeyAuthResult> {
  if (!browser) throw new Error('Browser environment required');

  // Get authentication options (includes stored per-user prfSalt as base64url)
  const optRes = await fetch(`${AUTH_API_BASE}/auth/login/options`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pubkey: pubkey ?? '' }),
  });
  if (!optRes.ok) throw new Error(`Login options failed: ${optRes.statusText}`);
  const { options: optionsJSON, prfSalt: prfSaltB64 } = await optRes.json() as { options: any; prfSalt: string };
  if (!prfSaltB64) throw new Error('Server did not return prfSalt in login options');

  // Authenticate with the same PRF salt used during registration
  const publicKeyOptions: PublicKeyCredentialRequestOptions = {
    ...decodeRequestOptions(optionsJSON),
    extensions: {
      prf: { eval: { first: base64urlToBuffer(prfSaltB64) } },
    } as AuthenticationExtensionsClientInputs,
  };

  const assertion = (await navigator.credentials.get({
    publicKey: publicKeyOptions,
  })) as PublicKeyCredential | null;
  if (!assertion) throw new Error('Passkey authentication cancelled');

  if ((assertion as any).authenticatorAttachment === 'cross-platform') {
    throw new Error('Cross-device QR authentication will produce a different PRF output and cannot derive your Nostr key. Use the same device/authenticator used during registration.');
  }

  // Extract PRF output → privkey → pubkey
  const extensions = assertion.getClientExtensionResults() as AuthenticationExtensionsClientOutputs & {
    prf?: { results?: { first?: ArrayBuffer } };
  };

  const prfOutput = extensions.prf?.results?.first;
  if (!prfOutput) throw new Error('PRF extension not available on this credential');

  const privkey = await derivePrivkeyFromPrf(prfOutput);
  const derivedPubkey = getPublicKey(privkey);

  // Verify with server
  const verifyRes = await fetch(`${AUTH_API_BASE}/auth/login/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      response: encodeAssertionResponse(assertion),
      pubkey: derivedPubkey,
    }),
  });
  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? `Login failed: ${verifyRes.statusText}`);
  }

  const { didNostr, webId } = await verifyRes.json() as {
    didNostr: string;
    webId?: string;
  };

  return { pubkey: derivedPubkey, privkey, didNostr, webId: webId ?? null };
}

// ── Codec helpers ────────────────────────────────────────────────────────────

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function decodeCreationOptions(json: any): PublicKeyCredentialCreationOptions {
  return {
    ...json,
    challenge: base64urlToBuffer(json.challenge as string),
    user: {
      ...json.user,
      id: base64urlToBuffer(json.user.id as string),
    },
    excludeCredentials: ((json.excludeCredentials as any[]) ?? []).map((c: any) => ({
      ...c,
      id: base64urlToBuffer(c.id as string),
    })),
  } as unknown as PublicKeyCredentialCreationOptions;
}

function decodeRequestOptions(json: any): PublicKeyCredentialRequestOptions {
  return {
    ...json,
    challenge: base64urlToBuffer(json.challenge as string),
    allowCredentials: ((json.allowCredentials as any[]) ?? []).map((c: any) => ({
      ...c,
      id: base64urlToBuffer(c.id as string),
    })),
  } as unknown as PublicKeyCredentialRequestOptions;
}

function encodeCredentialResponse(credential: PublicKeyCredential): Record<string, unknown> {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      attestationObject: bufferToBase64url(response.attestationObject),
      transports: response.getTransports?.() ?? [],
    },
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

function encodeAssertionResponse(assertion: PublicKeyCredential): Record<string, unknown> {
  const response = assertion.response as AuthenticatorAssertionResponse;
  return {
    id: assertion.id,
    rawId: bufferToBase64url(assertion.rawId),
    response: {
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      authenticatorData: bufferToBase64url(response.authenticatorData),
      signature: bufferToBase64url(response.signature),
      userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : undefined,
    },
    type: assertion.type,
    clientExtensionResults: assertion.getClientExtensionResults(),
  };
}

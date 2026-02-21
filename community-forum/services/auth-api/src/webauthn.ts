import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
  VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

export type { VerifiedRegistrationResponse, VerifiedAuthenticationResponse };
export type { RegistrationResponseJSON, AuthenticationResponseJSON };
export type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON };

/**
 * Generate WebAuthn registration options.
 * Returns the options JSON and the challenge string to be stored server-side.
 */
export async function generateRegistrationOpts(
  rpId: string,
  rpName: string,
  _origin: string,
  displayName?: string
): Promise<{ options: PublicKeyCredentialCreationOptionsJSON; challenge: string }> {
  const { randomBytes } = await import('crypto');
  // Convert Buffer to strict Uint8Array backed by ArrayBuffer (required by simplewebauthn)
  const buf = randomBytes(32);
  const userId = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const userHandle = `nostr-user-${Buffer.from(userId).toString('hex').slice(0, 8)}`;

  const options = await generateRegistrationOptions({
    rpName,
    rpID: rpId,
    userID: userId,
    userName: userHandle,
    userDisplayName: displayName ?? 'DreamLab Community User',
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
    extensions: {
      prf: {
        eval: {
          first: new Uint8Array(Buffer.from('dreamlab-nostr-key-derivation', 'utf8')),
        },
      },
    } as Record<string, unknown>,
    supportedAlgorithmIDs: [-7, -257],
  });

  return { options, challenge: options.challenge };
}

/**
 * Verify a WebAuthn registration response from the client.
 */
export async function verifyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string,
  rpId: string,
  origin: string
): Promise<VerifiedRegistrationResponse> {
  return verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedRPID: rpId,
    expectedOrigin: origin,
    requireUserVerification: true,
  });
}

/**
 * Generate WebAuthn authentication options for a specific credential.
 */
export async function generateAuthenticationOpts(
  rpId: string,
  credentialId?: string
): Promise<{ options: PublicKeyCredentialRequestOptionsJSON; challenge: string }> {
  const allowCredentials: GenerateAuthenticationOptionsOptsAllowCredentials =
    credentialId ? [{ id: credentialId }] : [];

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials,
    userVerification: 'required',
    extensions: {
      prf: {
        eval: {
          first: new Uint8Array(Buffer.from('dreamlab-nostr-key-derivation', 'utf8')),
        },
      },
    } as Record<string, unknown>,
  });

  return { options, challenge: options.challenge };
}

type GenerateAuthenticationOptionsOptsAllowCredentials = NonNullable<
  Parameters<typeof generateAuthenticationOptions>[0]['allowCredentials']
>;

/**
 * Verify a WebAuthn authentication response.
 */
export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credential: { credentialId: string; publicKeyBytes: Buffer; counter: number },
  rpId: string,
  origin: string
): Promise<VerifiedAuthenticationResponse> {
  const opts: VerifyAuthenticationResponseOpts = {
    response,
    expectedChallenge,
    expectedRPID: rpId,
    expectedOrigin: origin,
    requireUserVerification: true,
    authenticator: {
      credentialID: credential.credentialId,
      credentialPublicKey: new Uint8Array(credential.publicKeyBytes),
      counter: credential.counter,
    },
  };
  return verifyAuthenticationResponse(opts);
}

import { writable, derived, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { browser } from '$app/environment';
import { base } from '$app/paths';
import { isPWAInstalled, checkIfPWA } from '$lib/stores/pwa';
import { hasNip07Extension, getPublicKeyFromExtension, getExtensionName, waitForNip07 } from '$lib/nostr/nip07';
import { setNip07Signer, clearSigner } from '$lib/nostr/relay';
import { registerPasskey, authenticatePasskey } from '$lib/auth/passkey';
import type { PasskeyRegistrationResult, PasskeyAuthResult } from '$lib/auth/passkey';
import { bytesToHex } from '@noble/hashes/utils';

export interface AuthState {
  state: 'unauthenticated' | 'authenticating' | 'authenticated';
  pubkey: string | null;
  isAuthenticated: boolean;
  publicKey: string | null;
  /** Hex-encoded private key for relay connections and signing. In-memory only — never persisted. */
  privateKey: string | null;
  nickname: string | null;
  avatar: string | null;
  isPending: boolean;
  error: string | null;
  accountStatus: 'incomplete' | 'complete';
  nsecBackedUp: boolean;
  isReady: boolean;
  /** Whether using NIP-07 browser extension for signing */
  isNip07: boolean;
  /** Whether authenticated via PRF passkey (privkey lives in memory only) */
  isPasskey: boolean;
  /** Whether authenticated via local key (privkey in sessionStorage or localStorage) */
  isLocalKey: boolean;
  /** Name of the NIP-07 extension if available */
  extensionName: string | null;
}

const initialState: AuthState = {
  state: 'unauthenticated',
  pubkey: null,
  isAuthenticated: false,
  publicKey: null,
  privateKey: null,
  nickname: null,
  avatar: null,
  isPending: false,
  error: null,
  accountStatus: 'incomplete',
  nsecBackedUp: false,
  isReady: false,
  isNip07: false,
  isPasskey: false,
  isLocalKey: false,
  extensionName: null,
};

// Stores only non-secret profile/status fields — never keys
const STORAGE_KEY = 'nostr_bbs_keys';
const COOKIE_KEY = 'nostr_bbs_auth';
const KEEP_SIGNED_IN_KEY = 'nostr_bbs_keep_signed_in';

function isRunningAsPWA(): boolean {
  if (!browser) return false;
  return get(isPWAInstalled) || checkIfPWA() || localStorage.getItem('nostr_bbs_pwa_mode') === 'true';
}

function setCookie(name: string, value: string, days: number): void {
  if (!browser) return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict; Secure`;
}

function getCookie(name: string): string | null {
  if (!browser) return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name: string): void {
  if (!browser) return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict; Secure`;
}

function shouldKeepSignedIn(): boolean {
  if (!browser) return false;
  return localStorage.getItem(KEEP_SIGNED_IN_KEY) !== 'false';
}

function createAuthStore() {
  const { subscribe, set, update }: Writable<AuthState> = writable(initialState);

  // In-memory private key — never persisted to disk, storage, or any external location
  let _privkeyMem: Uint8Array | null = null;

  let readyPromise: Promise<void> | null = null;
  let _pagehideListenerRegistered = false;

  function syncStateFields(updates: Partial<AuthState>): Partial<AuthState> {
    const result = { ...updates };
    if (updates.isAuthenticated !== undefined) {
      result.state = updates.isAuthenticated ? 'authenticated' : 'unauthenticated';
    }
    if (updates.publicKey !== undefined) {
      result.pubkey = updates.publicKey;
    }
    return result;
  }

  /**
   * Wire up pagehide to zero-fill the in-memory private key when the page is
   * being unloaded (navigation away, tab/window close). Uses pagehide rather
   * than visibilitychange to avoid clearing the key on every tab switch while
   * the user is still actively using the page.
   */
  function clearPrivkeyOnPageHide(): void {
    if (!browser || _pagehideListenerRegistered) return;
    _pagehideListenerRegistered = true;

    window.addEventListener('pagehide', () => {
      if (_privkeyMem) {
        _privkeyMem.fill(0);
        _privkeyMem = null;
      }
      update((s) => ({ ...s, privateKey: null }));
    });
  }

  /**
   * Restore session on page load.
   * Only pubkey and profile metadata are restored from localStorage.
   * Passkey users must re-authenticate to re-derive the privkey.
   */
  async function restoreSession(): Promise<void> {
    if (!browser) {
      update((s) => ({ ...s, ...syncStateFields({ isReady: true }) }));
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      update((s) => ({ ...s, ...syncStateFields({ isReady: true }) }));
      return;
    }

    try {
      const parsed = JSON.parse(stored) as {
        publicKey?: string;
        isNip07?: boolean;
        isPasskey?: boolean;
        isLocalKey?: boolean;
        extensionName?: string;
        nickname?: string;
        avatar?: string;
        accountStatus?: 'incomplete' | 'complete';
        nsecBackedUp?: boolean;
      };

      // NIP-07 extension path — re-verify extension is still reachable
      if (parsed.isNip07 && parsed.publicKey) {
        const extensionReady = await waitForNip07(1000);
        if (extensionReady) {
          try {
            const currentPubkey = await getPublicKeyFromExtension();
            if (currentPubkey === parsed.publicKey) {
              setNip07Signer();
              update((s) => ({
                ...s,
                ...syncStateFields({
                  publicKey: parsed.publicKey ?? null,
                  nickname: parsed.nickname ?? null,
                  avatar: parsed.avatar ?? null,
                  isAuthenticated: true,
                  accountStatus: parsed.accountStatus ?? 'complete',
                  nsecBackedUp: true,
                  isNip07: true,
                  isPasskey: false,
                  extensionName: getExtensionName(),
                  isReady: true,
                }),
              }));
              return;
            }
          } catch {
            // Extension denied or pubkey mismatch — fall through
          }
        }
        // Extension unavailable or mismatched
        update((s) => ({
          ...s,
          ...syncStateFields({
            publicKey: parsed.publicKey ?? null,
            nickname: parsed.nickname ?? null,
            avatar: parsed.avatar ?? null,
            isAuthenticated: false,
            isNip07: false,
            isPasskey: false,
            error: 'Nostr extension not detected. Please unlock your extension or sign in again.',
            isReady: true,
          }),
        }));
        return;
      }

      // Passkey path — restore profile metadata only; privkey not available until re-auth
      if (parsed.isPasskey && parsed.publicKey) {
        update((s) => ({
          ...s,
          ...syncStateFields({
            publicKey: parsed.publicKey ?? null,
            nickname: parsed.nickname ?? null,
            avatar: parsed.avatar ?? null,
            isAuthenticated: false,
            isPasskey: false,
            isNip07: false,
            isLocalKey: false,
            accountStatus: parsed.accountStatus ?? 'incomplete',
            nsecBackedUp: parsed.nsecBackedUp ?? false,
            error: null,
            isReady: true,
          }),
        }));
        return;
      }

      // Local Key path — restore privkey from session/localStorage
      if (parsed.isLocalKey && parsed.publicKey) {
        const privkeyHex = sessionStorage.getItem('nostr_bbs_session_privkey') || localStorage.getItem('nostr_bbs_local_privkey');
        if (privkeyHex) {
          const { hexToBytes } = await import('@noble/hashes/utils');
          _privkeyMem = hexToBytes(privkeyHex);
          update((s) => ({
            ...s,
            ...syncStateFields({
              publicKey: parsed.publicKey ?? null,
              privateKey: privkeyHex,
              nickname: parsed.nickname ?? null,
              avatar: parsed.avatar ?? null,
              isAuthenticated: true,
              accountStatus: parsed.accountStatus ?? 'complete',
              nsecBackedUp: parsed.nsecBackedUp ?? false,
              isNip07: false,
              isPasskey: false,
              isLocalKey: true,
              error: null,
              isReady: true,
            }),
          }));
          return;
        } else {
          // Key lost from storage, demote to unauthenticated
          update((s) => ({
            ...s,
            ...syncStateFields({
              isAuthenticated: false,
              isReady: true,
              error: 'Local session expired. Please log in again.'
            })
          }));
          return;
        }
      }

      // Unknown or legacy state — clear and start fresh
      update((s) => ({ ...s, ...syncStateFields({ isReady: true }) }));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      update((s) => ({ ...s, ...syncStateFields({ isReady: true }) }));
    }
  }

  if (browser) {
    readyPromise = restoreSession();
    clearPrivkeyOnPageHide();
  } else {
    readyPromise = Promise.resolve();
  }

  return {
    subscribe,

    /** Wait for the auth store to be ready (session restored) */
    waitForReady: (): Promise<void> => readyPromise ?? Promise.resolve(),

    /**
     * Get the in-memory private key (passkey path only).
     * Returns null if not authenticated via passkey, or after page hide.
     */
    getPrivkey: (): Uint8Array | null => _privkeyMem,

    /**
     * Set keys from a completed passkey PRF derivation.
     * Persists pubkey and profile metadata to localStorage — the privkey is never written.
     */
    setKeysFromPasskey: (
      pubkey: string,
      privkey: Uint8Array,
      meta: {
        nickname?: string | null;
        avatar?: string | null;
        accountStatus?: 'incomplete' | 'complete';
        nsecBackedUp?: boolean;
        didNostr?: string;
        webId?: string | null;
        podUrl?: string | null;
      } = {},
    ): void => {
      _privkeyMem = privkey;
      clearPrivkeyOnPageHide();

      if (browser) {
        const existing = localStorage.getItem(STORAGE_KEY);
        let existingData: { nickname?: string; avatar?: string; accountStatus?: string; nsecBackedUp?: boolean } = {};
        if (existing) {
          try { existingData = JSON.parse(existing); } catch { /* ignore */ }
        }
        const storageData = {
          publicKey: pubkey,
          isPasskey: true,
          isNip07: false,
          nickname: meta.nickname ?? existingData.nickname ?? null,
          avatar: meta.avatar ?? existingData.avatar ?? null,
          accountStatus: meta.accountStatus ?? existingData.accountStatus ?? 'incomplete',
          nsecBackedUp: meta.nsecBackedUp ?? existingData.nsecBackedUp ?? false,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        if (shouldKeepSignedIn()) {
          setCookie(COOKIE_KEY, pubkey, 30);
        }
      }

      update((s) => ({
        ...s,
        ...syncStateFields({
          publicKey: pubkey,
          privateKey: bytesToHex(privkey),
          nickname: meta.nickname ?? s.nickname,
          avatar: meta.avatar ?? s.avatar,
          isAuthenticated: true,
          isPending: false,
          error: null,
          accountStatus: meta.accountStatus ?? s.accountStatus,
          nsecBackedUp: meta.nsecBackedUp ?? s.nsecBackedUp,
          isNip07: false,
          isPasskey: true,
        }),
      }));
    },

    /**
     * Register a new passkey and derive Nostr keypair from PRF output.
     * The privkey is held in memory only and never written to any storage.
     */
    registerWithPasskey: async (displayName: string): Promise<PasskeyRegistrationResult> => {
      if (!browser) throw new Error('Browser environment required');

      update((s) => ({ ...s, isPending: true, error: null, state: 'authenticating' as const }));

      try {
        const result = await registerPasskey(displayName);
        _privkeyMem = result.privkey;

        const existing = localStorage.getItem(STORAGE_KEY);
        let existingNickname: string | null = displayName;
        let existingAvatar: string | null = null;
        if (existing) {
          try {
            const d = JSON.parse(existing) as { nickname?: string; avatar?: string };
            existingNickname = d.nickname ?? displayName;
            existingAvatar = d.avatar ?? null;
          } catch { /* ignore */ }
        }

        const storageData = {
          publicKey: result.pubkey,
          isPasskey: true,
          isNip07: false,
          nickname: existingNickname,
          avatar: existingAvatar,
          accountStatus: 'incomplete' as const,
          nsecBackedUp: false,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));

        if (shouldKeepSignedIn()) {
          setCookie(COOKIE_KEY, result.pubkey, 30);
        }

        update((s) => ({
          ...s,
          ...syncStateFields({
            publicKey: result.pubkey,
            privateKey: bytesToHex(result.privkey),
            nickname: existingNickname,
            avatar: existingAvatar,
            isAuthenticated: true,
            isPending: false,
            error: null,
            accountStatus: 'incomplete',
            nsecBackedUp: false,
            isNip07: false,
            isPasskey: true,
          }),
        }));

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Passkey registration failed';
        update((s) => ({ ...s, isPending: false, error: message, state: 'unauthenticated' as const }));
        throw error;
      }
    },

    /**
     * Authenticate with an existing passkey, re-deriving the Nostr privkey from PRF.
     * The privkey is held in memory only and never written to any storage.
     */
    loginWithPasskey: async (pubkey?: string): Promise<PasskeyAuthResult> => {
      if (!browser) throw new Error('Browser environment required');

      update((s) => ({ ...s, isPending: true, error: null, state: 'authenticating' as const }));

      try {
        const result = await authenticatePasskey(pubkey);
        _privkeyMem = result.privkey;
        clearPrivkeyOnPageHide();

        const existing = localStorage.getItem(STORAGE_KEY);
        let existingData: {
          nickname?: string;
          avatar?: string;
          accountStatus?: 'incomplete' | 'complete';
          nsecBackedUp?: boolean;
        } = {};
        if (existing) {
          try { existingData = JSON.parse(existing); } catch { /* ignore */ }
        }

        const storageData = {
          publicKey: result.pubkey,
          isPasskey: true,
          isNip07: false,
          nickname: existingData.nickname ?? null,
          avatar: existingData.avatar ?? null,
          accountStatus: existingData.accountStatus ?? 'incomplete',
          nsecBackedUp: existingData.nsecBackedUp ?? false,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));

        if (shouldKeepSignedIn()) {
          setCookie(COOKIE_KEY, result.pubkey, 30);
        }

        update((s) => ({
          ...s,
          ...syncStateFields({
            publicKey: result.pubkey,
            privateKey: bytesToHex(result.privkey),
            nickname: storageData.nickname,
            avatar: storageData.avatar,
            isAuthenticated: true,
            isPending: false,
            error: null,
            accountStatus: storageData.accountStatus,
            nsecBackedUp: storageData.nsecBackedUp,
            isNip07: false,
            isPasskey: true,
          }),
        }));

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Passkey authentication failed';
        update((s) => ({ ...s, isPending: false, error: message, state: 'unauthenticated' as const }));
        throw error;
      }
    },

    /**
     * Authenticate with a local key (session or local storage)
     */
    loginWithLocalKey: async (privkeyHex: string, rememberMe: boolean = false): Promise<{ publicKey: string }> => {
      if (!browser) throw new Error('Browser environment required');
      update((s) => ({ ...s, isPending: true, error: null, state: 'authenticating' as const }));

      try {
        const { restoreFromNsecOrHex } = await import('$lib/nostr/keys');
        const { hexToBytes } = await import('@noble/hashes/utils');

        const { publicKey, privateKey } = restoreFromNsecOrHex(privkeyHex);
        _privkeyMem = hexToBytes(privateKey);

        const existing = localStorage.getItem(STORAGE_KEY);
        let existingData: { nickname?: string; avatar?: string; accountStatus?: string; nsecBackedUp?: boolean } = {};
        if (existing) {
          try { existingData = JSON.parse(existing); } catch { /* ignore */ }
        }

        const storageData = {
          publicKey,
          isPasskey: false,
          isNip07: false,
          isLocalKey: true,
          nickname: existingData.nickname ?? null,
          avatar: existingData.avatar ?? null,
          accountStatus: existingData.accountStatus ?? 'complete',
          nsecBackedUp: true,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));

        if (rememberMe) {
          localStorage.setItem('nostr_bbs_local_privkey', privateKey);
          sessionStorage.removeItem('nostr_bbs_session_privkey');
        } else {
          sessionStorage.setItem('nostr_bbs_session_privkey', privateKey);
          localStorage.removeItem('nostr_bbs_local_privkey');
        }

        if (shouldKeepSignedIn()) {
          setCookie(COOKIE_KEY, publicKey, 30);
        }

        update((s) => ({
          ...s,
          ...syncStateFields({
            publicKey,
            privateKey: privateKey,
            nickname: storageData.nickname,
            avatar: storageData.avatar,
            isAuthenticated: true,
            isPending: false,
            error: null,
            accountStatus: storageData.accountStatus as 'incomplete' | 'complete',
            nsecBackedUp: true,
            isNip07: false,
            isPasskey: false,
            isLocalKey: true,
          }),
        }));

        return { publicKey };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Local key authentication failed';
        update((s) => ({ ...s, isPending: false, error: message, state: 'unauthenticated' as const }));
        throw error;
      }
    },

    /**
     * Register a new account using a local key
     */
    registerWithLocalKey: async (displayName: string): Promise<{ pubkey: string; privkeyHex: string }> => {
      if (!browser) throw new Error('Browser environment required');
      update((s) => ({ ...s, isPending: true, error: null, state: 'authenticating' as const }));

      try {
        const { generateSimpleKeys } = await import('$lib/nostr/keys');
        const { hexToBytes } = await import('@noble/hashes/utils');

        const { publicKey, privateKey } = generateSimpleKeys();
        _privkeyMem = hexToBytes(privateKey);

        const storageData = {
          publicKey,
          isPasskey: false,
          isNip07: false,
          isLocalKey: true,
          nickname: displayName,
          avatar: null,
          accountStatus: 'incomplete' as const,
          nsecBackedUp: false,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        // Default to session storage until user explicitly chooses "remember me" on login
        sessionStorage.setItem('nostr_bbs_session_privkey', privateKey);
        localStorage.removeItem('nostr_bbs_local_privkey');

        if (shouldKeepSignedIn()) {
          setCookie(COOKIE_KEY, publicKey, 30);
        }

        update((s) => ({
          ...s,
          ...syncStateFields({
            publicKey,
            privateKey: privateKey,
            nickname: displayName,
            avatar: null,
            isAuthenticated: true,
            isPending: false,
            error: null,
            accountStatus: 'incomplete',
            nsecBackedUp: false,
            isNip07: false,
            isPasskey: false,
            isLocalKey: true,
          }),
        }));

        return { pubkey: publicKey, privkeyHex: privateKey };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Local key registration failed';
        update((s) => ({ ...s, isPending: false, error: message, state: 'unauthenticated' as const }));
        throw error;
      }
    },

    /** Login using NIP-07 browser extension */
    loginWithExtension: async (): Promise<{ publicKey: string }> => {
      if (!browser) throw new Error('Browser environment required');

      const extensionReady = await waitForNip07(2000);
      if (!extensionReady) {
        throw new Error('No NIP-07 extension found. Please install Alby, nos2x, or another Nostr signer.');
      }

      try {
        const publicKey = await getPublicKeyFromExtension();
        const extensionName = getExtensionName();

        const storageData = {
          publicKey,
          isNip07: true,
          isPasskey: false,
          extensionName,
          accountStatus: 'complete' as const,
          nsecBackedUp: true,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        setNip07Signer();

        update((s) => ({
          ...s,
          ...syncStateFields({
            publicKey,
            isAuthenticated: true,
            isPending: false,
            error: null,
            accountStatus: 'complete',
            nsecBackedUp: true,
            isNip07: true,
            isPasskey: false,
            extensionName,
          }),
        }));

        return { publicKey };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to connect to extension';
        update((s) => ({ ...s, error: message }));
        throw error;
      }
    },

    /** Check if NIP-07 extension is available */
    hasExtension: (): boolean => hasNip07Extension(),

    /**
     * Set keys for the NIP-07 path (pubkey only — no private key stored).
     * Retained for backward compatibility with callers that set keys post-extension sign-in.
     * The privateKey parameter is accepted but never stored.
     */
    setKeys: async (
      publicKey: string,
      _privateKey: string,
      accountStatus: 'incomplete' | 'complete' = 'incomplete',
      nsecBackedUp = false,
    ): Promise<void> => {
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        if (_privateKey) {
          console.warn('[Auth] setKeys called with privateKey param - this is ignored in passkey mode. Use setKeysFromPasskey() instead.');
        }
      }

      if (browser) {
        const existing = localStorage.getItem(STORAGE_KEY);
        let existingData: { nickname?: string; avatar?: string } = {};
        if (existing) {
          try { existingData = JSON.parse(existing); } catch { /* ignore */ }
        }
        const storageData = {
          publicKey,
          isNip07: false,
          isPasskey: false,
          nickname: existingData.nickname ?? null,
          avatar: existingData.avatar ?? null,
          accountStatus,
          nsecBackedUp,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
        if (shouldKeepSignedIn()) {
          setCookie(COOKIE_KEY, publicKey, 30);
        }
      }

      update((s) => ({
        ...s,
        ...syncStateFields({
          publicKey,
          isAuthenticated: true,
          isPending: false,
          error: null,
          accountStatus,
          nsecBackedUp,
          isNip07: false,
          isPasskey: false,
        }),
      }));
    },

    /** Mark nsec as backed up */
    confirmNsecBackup: (): void => {
      update((s) => ({ ...s, nsecBackedUp: true }));
      if (browser) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            data.nsecBackedUp = true;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } catch { /* ignore */ }
        }
      }
    },

    /** Mark account signup as complete */
    completeSignup: (): void => {
      update((s) => ({ ...s, accountStatus: 'complete' }));
      if (browser) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            data.accountStatus = 'complete';
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } catch { /* ignore */ }
        }
      }
    },

    setProfile: (nickname: string | null, avatar: string | null): void => {
      if (browser) {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            data.nickname = nickname;
            data.avatar = avatar;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          } catch { /* ignore */ }
        }
      }
      update((s) => ({ ...s, nickname, avatar }));
    },

    setPending: (isPending: boolean): void => {
      update((s) => ({ ...s, isPending }));
    },

    setError: (error: string): void => {
      update((s) => ({ ...s, error }));
    },

    clearError: (): void => {
      update((s) => ({ ...s, error: null }));
    },

    logout: async (): Promise<void> => {
      // Zero-fill private key before clearing reference
      if (_privkeyMem) {
        _privkeyMem.fill(0);
        _privkeyMem = null;
      }

      set(initialState);

      if (browser) {
        clearSigner();
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('nostr_bbs_local_privkey');
        sessionStorage.removeItem('nostr_bbs_session_privkey');
        deleteCookie(COOKIE_KEY);

        // Clear dependent stores to prevent stale admin/cohort data leaking
        // to the next user session. Dynamic imports avoid circular dependencies
        // since user.ts and sections.ts both import from auth.ts.
        const [
          { whitelistStatusStore },
          { sectionStore },
          { clearWhitelistCache },
          { channelStore },
          { adminStore },
          { profileCache },
        ] = await Promise.all([
          import('./user'),
          import('./sections'),
          import('$lib/nostr/whitelist'),
          import('./channels'),
          import('./admin'),
          import('./profiles'),
        ]);
        whitelistStatusStore.set(null);
        sectionStore.clear();
        clearWhitelistCache();
        channelStore.clearChannels();
        adminStore.reset();
        profileCache.clear();

        const { goto } = await import('$app/navigation');
        goto(`${base}/`);
      }
    },

    reset: (): void => {
      if (_privkeyMem) {
        _privkeyMem.fill(0);
        _privkeyMem = null;
      }
      set(initialState);
    },
  };
}

export const authStore = createAuthStore();
export const isAuthenticated = derived(authStore, ($auth) => $auth.isAuthenticated);
export const isReady = derived(authStore, ($auth) => $auth.isReady);
export const isReadOnly = derived(authStore, ($auth) => $auth.accountStatus === 'incomplete');
export const accountStatus = derived(authStore, ($auth) => $auth.accountStatus);

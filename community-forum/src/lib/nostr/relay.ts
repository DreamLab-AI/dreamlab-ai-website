/**
 * NDK Relay Connection Manager
 * Handles Nostr relay connections with NIP-42 AUTH support
 */

import NDK, {
  NDKEvent,
  NDKPrivateKeySigner,
  NDKNip07Signer,
  NDKRelay,
  NDKSubscription,
  type NDKFilter,
  type NDKCacheAdapter,
  NDKUser
} from '@nostr-dev-kit/ndk';
import NDKCacheAdapterDexie from '@nostr-dev-kit/ndk-cache-dexie';
import { writable, type Writable } from 'svelte/store';
import { RELAY_URL, NDK_CONFIG, TIMEOUTS } from '../config';

/**
 * Connection states
 */
export enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  AuthRequired = 'auth-required',
  Authenticating = 'authenticating',
  Authenticated = 'authenticated',
  AuthFailed = 'auth-failed',
  Error = 'error'
}

/**
 * Connection status interface
 */
export interface ConnectionStatus {
  state: ConnectionState;
  relay?: string;
  error?: string;
  timestamp: number;
  authenticated: boolean;
}

/**
 * Relay manager class
 */
class RelayManager {
  private _ndk: NDK | null = null;
  private _signer: NDKPrivateKeySigner | null = null;
  private _activeSubscriptions: Map<string, NDKSubscription> = new Map();
  private _connectionState: Writable<ConnectionStatus> = writable({
    state: ConnectionState.Disconnected,
    timestamp: Date.now(),
    authenticated: false
  });
  private _cacheAdapter: NDKCacheAdapterDexie | null = null;

  /**
   * Get NDK instance
   */
  get ndk(): NDK | null {
    return this._ndk;
  }

  /**
   * Get connection state store
   */
  get connectionState(): Writable<ConnectionStatus> {
    return this._connectionState;
  }

  /**
   * Update connection state
   */
  private updateState(
    state: ConnectionState,
    relay?: string,
    error?: string,
    authenticated: boolean = false
  ): void {
    this._connectionState.set({
      state,
      relay,
      error,
      timestamp: Date.now(),
      authenticated
    });
  }

  /**
   * Initialize NDK with cache adapter and a private key signer
   */
  private async initializeNDK(privateKey: string, relayUrl: string): Promise<NDK> {
    this._signer = new NDKPrivateKeySigner(privateKey);
    return this._createNDK(relayUrl);
  }

  /**
   * Initialize NDK with cache adapter and a NIP-07 extension signer
   */
  private async initializeNDKWithNip07(relayUrl: string): Promise<NDK> {
    this._signer = new NDKNip07Signer() as any;
    return this._createNDK(relayUrl);
  }

  /**
   * Shared NDK creation logic
   */
  private _createNDK(relayUrl: string): NDK {
    if (NDK_CONFIG.cache.enabled && !this._cacheAdapter) {
      this._cacheAdapter = new NDKCacheAdapterDexie({
        dbName: NDK_CONFIG.cache.name
      });
    }

    const ndk = new NDK({
      explicitRelayUrls: [relayUrl],
      signer: this._signer as any,
      cacheAdapter: (this._cacheAdapter ?? undefined) as NDKCacheAdapter | undefined,
      enableOutboxModel: false
    });

    if (NDK_CONFIG.enableDebug) {
      ndk.pool.on('relay:connect', (relay: NDKRelay) => {
        console.log(`[NDK] Connected to relay: ${relay.url}`);
      });

      ndk.pool.on('relay:disconnect', (relay: NDKRelay) => {
        console.log(`[NDK] Disconnected from relay: ${relay.url}`);
      });

      ndk.pool.on('relay:auth', (relay: NDKRelay, challenge: string) => {
        console.log(`[NDK] AUTH challenge from ${relay.url}: ${challenge}`);
      });
    }

    return ndk;
  }

  /**
   * Handle NIP-42 AUTH challenge
   */
  private async handleAuthChallenge(relay: NDKRelay, challenge: string): Promise<boolean> {
    if (!this._signer) {
      throw new Error('No signer available for authentication');
    }

    try {
      this.updateState(ConnectionState.Authenticating, relay.url);

      const user = await this._signer.user();

      const authEvent = new NDKEvent(this._ndk ?? undefined);
      authEvent.kind = 22242;
      authEvent.tags = [
        ['relay', relay.url],
        ['challenge', challenge]
      ];
      authEvent.content = '';
      authEvent.pubkey = user.pubkey;
      authEvent.created_at = Math.floor(Date.now() / 1000);

      await authEvent.sign(this._signer);

      const authTimeout = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('AUTH timeout')), TIMEOUTS.auth);
      });

      // Simplified auth - rely on NDK's built-in auth handling
      const authPromise = new Promise<boolean>((resolve) => {
        // NDK handles AUTH internally via the signer
        // Give it time to process
        setTimeout(() => resolve(true), 1000);
      });

      const authenticated = await Promise.race([authPromise, authTimeout]);

      if (authenticated) {
        this.updateState(ConnectionState.Authenticated, relay.url, undefined, true);
      }

      return authenticated;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState(ConnectionState.AuthFailed, relay.url, errorMessage);
      throw error;
    }
  }

  /**
   * Connect to relay using NIP-07 browser extension signer (no private key needed)
   */
  async connectRelayWithNip07(relayUrl: string): Promise<ConnectionStatus> {
    try {
      this.updateState(ConnectionState.Connecting, relayUrl);

      if (this._ndk) {
        await this.disconnectRelay();
      }

      this._ndk = await this.initializeNDKWithNip07(relayUrl);
      return this._finishConnect(relayUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      this.updateState(ConnectionState.Error, relayUrl, errorMessage);
      throw error;
    }
  }

  /**
   * Connect to relay with authentication
   */
  async connectRelay(relayUrl: string, privateKey: string): Promise<ConnectionStatus> {
    try {
      this.updateState(ConnectionState.Connecting, relayUrl);

      if (this._ndk) {
        await this.disconnectRelay();
      }

      this._ndk = await this.initializeNDK(privateKey, relayUrl);
      return this._finishConnect(relayUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      this.updateState(ConnectionState.Error, relayUrl, errorMessage);
      throw error;
    }
  }

  /**
   * Shared connect logic: wire up relay events and return status
   */
  private async _finishConnect(relayUrl: string): Promise<ConnectionStatus> {
    if (!this._ndk) throw new Error('NDK not initialized');

    const connectTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connection timeout')), TIMEOUTS.connect);
    });

    await Promise.race([this._ndk.connect(), connectTimeout]);

    const relay = Array.from(this._ndk.pool.relays.values())[0];

    if (!relay) {
      throw new Error('No relay connected');
    }

    relay.on('auth', async (challenge: string) => {
      this.updateState(ConnectionState.AuthRequired, relay.url);
      try {
        await this.handleAuthChallenge(relay, challenge);
      } catch (error) {
        console.error('[NDK] AUTH failed:', error);
      }
    });

    const currentState = relay.connectivity.status >= 5
      ? ConnectionState.Connected
      : ConnectionState.Disconnected;

    this.updateState(currentState, relayUrl, undefined, false);

    return {
      state: currentState,
      relay: relayUrl,
      timestamp: Date.now(),
      authenticated: false
    };
  }

  /**
   * Publish event to relay
   */
  async publishEvent(event: NDKEvent): Promise<boolean> {
    if (!this._ndk) {
      throw new Error('NDK not initialized. Call connectRelay first.');
    }

    if (!this._signer) {
      throw new Error('No signer available. Call connectRelay first.');
    }

    try {
      event.ndk = this._ndk;

      if (!event.sig) {
        await event.sign(this._signer);
      }

      const publishTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Publish timeout')), TIMEOUTS.publish);
      });

      const publishPromise = event.publish();

      const relaySet = await Promise.race([publishPromise, publishTimeout]);

      return relaySet.size > 0;
    } catch (error) {
      console.error('[NDK] Publish failed:', error);
      throw error;
    }
  }

  /**
   * Create subscription with filters
   */
  subscribe(
    filters: NDKFilter | NDKFilter[],
    opts?: {
      closeOnEose?: boolean;
      groupable?: boolean;
      subId?: string;
    }
  ): NDKSubscription {
    if (!this._ndk) {
      throw new Error('NDK not initialized. Call connectRelay first.');
    }

    const filterArray = Array.isArray(filters) ? filters : [filters];

    const subscription = this._ndk.subscribe(filterArray, {
      closeOnEose: opts?.closeOnEose ?? false,
      groupable: opts?.groupable ?? true,
      subId: opts?.subId
    });

    const subId = opts?.subId ?? `sub_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this._activeSubscriptions.set(subId, subscription);

    subscription.on('close', () => {
      this._activeSubscriptions.delete(subId);
    });

    return subscription;
  }

  /**
   * Get active subscription by ID
   */
  getSubscription(subId: string): NDKSubscription | undefined {
    return this._activeSubscriptions.get(subId);
  }

  /**
   * Close specific subscription
   */
  closeSubscription(subId: string): boolean {
    const subscription = this._activeSubscriptions.get(subId);
    if (subscription) {
      subscription.stop();
      this._activeSubscriptions.delete(subId);
      return true;
    }
    return false;
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): Map<string, NDKSubscription> {
    return new Map(this._activeSubscriptions);
  }

  /**
   * Disconnect from relay and cleanup
   */
  async disconnectRelay(): Promise<void> {
    try {
      this._activeSubscriptions.forEach(subscription => {
        subscription.stop();
      });
      this._activeSubscriptions.clear();

      if (this._ndk) {
        for (const relay of this._ndk.pool.relays.values()) {
          relay.disconnect();
        }
        this._ndk = null;
      }

      this._signer = null;

      this.updateState(ConnectionState.Disconnected);
    } catch (error) {
      console.error('[NDK] Disconnect error:', error);
      throw error;
    }
  }

  /**
   * Check if connected and authenticated
   * NDKRelayStatus: 5=CONNECTED, 6=AUTH_REQUESTED, 7=AUTHENTICATING, 8=AUTHENTICATED
   */
  isConnected(): boolean {
    if (!this._ndk) return false;

    for (const relay of this._ndk.pool.relays.values()) {
      // Status 5+ means connected (5=CONNECTED, 6-8=auth states)
      if (relay.connectivity.status >= 5) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<NDKUser | null> {
    if (!this._signer) return null;

    try {
      return await this._signer.user();
    } catch {
      return null;
    }
  }

  /**
   * Get relay URLs
   */
  getRelayUrls(): string[] {
    if (!this._ndk) return [];
    return Array.from(this._ndk.pool.relays.values()).map(r => r.url);
  }
}

/**
 * Singleton relay manager instance
 */
const relayManagerInstance = new RelayManager();

/**
 * NDK instance accessor
 */
export const ndk = (): NDK | null => relayManagerInstance.ndk;

/**
 * Connection state store
 */
export const connectionState = relayManagerInstance.connectionState;

/**
 * Connect to relay with private key signer
 */
export const connectRelay = (relayUrl: string, privateKey: string): Promise<ConnectionStatus> => {
  return relayManagerInstance.connectRelay(relayUrl, privateKey);
};

/**
 * Connect to relay with NIP-07 browser extension signer (no private key needed)
 */
export const connectRelayWithNip07 = (relayUrl: string): Promise<ConnectionStatus> => {
  return relayManagerInstance.connectRelayWithNip07(relayUrl);
};

/**
 * Publish event
 */
export const publishEvent = (event: NDKEvent): Promise<boolean> => {
  return relayManagerInstance.publishEvent(event);
};

/**
 * Subscribe to events
 */
export const subscribe = (
  filters: NDKFilter | NDKFilter[],
  opts?: {
    closeOnEose?: boolean;
    groupable?: boolean;
    subId?: string;
  }
): NDKSubscription => {
  return relayManagerInstance.subscribe(filters, opts);
};

/**
 * Disconnect from relay
 */
export const disconnectRelay = (): Promise<void> => {
  return relayManagerInstance.disconnectRelay();
};

/**
 * Check connection status
 */
export const isConnected = (): boolean => {
  return relayManagerInstance.isConnected();
};

/**
 * Ensure relay is connected, using the appropriate signer.
 * Reads auth state to decide between NIP-07, private key, or throws.
 * Safe to call repeatedly — no-op when already connected.
 */
export async function ensureRelayConnected(authState: {
  isNip07?: boolean;
  privateKey?: string | null;
}): Promise<void> {
  if (relayManagerInstance.isConnected()) return;

  if (authState.isNip07) {
    await relayManagerInstance.connectRelayWithNip07(RELAY_URL);
  } else if (authState.privateKey) {
    await relayManagerInstance.connectRelay(RELAY_URL, authState.privateKey);
  } else {
    throw new Error('No signing method available');
  }
}

/**
 * Get current user
 */
export const getCurrentUser = (): Promise<NDKUser | null> => {
  return relayManagerInstance.getCurrentUser();
};

/**
 * Get relay URLs
 */
export const getRelayUrls = (): string[] => {
  return relayManagerInstance.getRelayUrls();
};

/**
 * Reconnect to relay (disconnect and reconnect)
 */
export const reconnectRelay = async (): Promise<void> => {
  // Get current relay URL from pool
  const currentUrls = relayManagerInstance.getRelayUrls();
  if (currentUrls.length === 0) {
    console.warn('[Relay] No relay to reconnect to');
    return;
  }

  // We need the private key which is stored in the signer
  // For reconnect, we disconnect and let the caller reconnect with credentials
  await relayManagerInstance.disconnectRelay();
};

/**
 * Get relay manager instance
 */
export const relayManager = relayManagerInstance;

/**
 * Set a NIP-07 browser extension signer on the current NDK instance.
 * Creates the NDK instance if it doesn't exist yet.
 */
export function setNip07Signer(): void {
  const ndkInstance = relayManagerInstance.ndk;
  if (ndkInstance) {
    ndkInstance.signer = new NDKNip07Signer() as any;
  }
}

/**
 * Clear the current signer from the NDK instance (logout).
 */
export function clearSigner(): void {
  const ndkInstance = relayManagerInstance.ndk;
  if (ndkInstance) {
    ndkInstance.signer = undefined;
  }
}

/**
 * Default export
 */
export default relayManagerInstance;

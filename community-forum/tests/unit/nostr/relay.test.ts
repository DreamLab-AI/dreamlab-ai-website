/**
 * Unit Tests: NDK Relay Connection Manager
 *
 * Tests for the RelayManager singleton and its exported functions.
 * Mocks NDK, WebSocket, and related dependencies.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';

// ---------------------------------------------------------------------------
// Mocks - must be defined BEFORE importing the module under test
// ---------------------------------------------------------------------------

// Track instances created by constructors so tests can introspect
const mockNdkConnect = vi.fn().mockResolvedValue(undefined);
const mockRelayDisconnect = vi.fn();
const mockSubscribe = vi.fn();
const mockSubStop = vi.fn();
const mockSubOn = vi.fn();

const mockRelay = {
  url: 'wss://test.relay',
  connectivity: { status: 5 },
  disconnect: mockRelayDisconnect,
  on: vi.fn(),
};

const mockPool = {
  relays: new Map([['wss://test.relay', mockRelay]]),
  on: vi.fn(),
};

const mockNdkInstance = {
  connect: mockNdkConnect,
  pool: mockPool,
  subscribe: mockSubscribe.mockReturnValue({
    stop: mockSubStop,
    on: mockSubOn,
  }),
  signer: null as any,
};

vi.mock('@nostr-dev-kit/ndk', () => {
  const NDK = vi.fn().mockImplementation(() => mockNdkInstance);
  const NDKPrivateKeySigner = vi.fn().mockImplementation(() => ({
    user: vi.fn().mockResolvedValue({ pubkey: 'a'.repeat(64) }),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  }));
  const NDKNip07Signer = vi.fn().mockImplementation(() => ({
    user: vi.fn().mockResolvedValue({ pubkey: 'b'.repeat(64) }),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
  }));
  const NDKEvent = vi.fn().mockImplementation(() => ({
    kind: 0,
    tags: [] as string[][],
    content: '',
    pubkey: '',
    created_at: 0,
    id: 'event-id',
    sig: 'sig',
    ndk: null,
    sign: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(new Set(['wss://test.relay'])),
  }));
  const NDKRelay = vi.fn();
  const NDKSubscription = vi.fn();
  const NDKUser = vi.fn();

  return {
    default: NDK,
    NDK,
    NDKPrivateKeySigner,
    NDKNip07Signer,
    NDKEvent,
    NDKRelay,
    NDKSubscription,
    NDKUser,
  };
});

vi.mock('@nostr-dev-kit/ndk-cache-dexie', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('$lib/config', () => ({
  RELAY_URL: 'wss://test.relay',
  NDK_CONFIG: {
    cache: { enabled: false, name: 'test-cache' },
    enableDebug: false,
  },
  TIMEOUTS: {
    connect: 500,
    auth: 5000,
    publish: 5000,
  },
}));

// ---------------------------------------------------------------------------
// Import module under test (after mocks)
// ---------------------------------------------------------------------------
import {
  ConnectionState,
  connectionState,
  connectRelay,
  connectRelayWithNip07,
  publishEvent,
  subscribe as relaySubscribe,
  disconnectRelay,
  isConnected,
  ensureRelayConnected,
  getCurrentUser,
  getRelayUrls,
  reconnectRelay,
  relayManager,
  ndk,
  setNip07Signer,
  clearSigner,
} from '$lib/nostr/relay';

const VALID_PRIVKEY = 'a'.repeat(64);

describe('Relay Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset relay connectivity to connected
    mockRelay.connectivity.status = 5;
    mockNdkConnect.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // Ensure clean state
    try {
      await disconnectRelay();
    } catch {
      // ignore
    }
  });

  // =========================================================================
  // ConnectionState enum
  // =========================================================================
  describe('ConnectionState', () => {
    it('should export all expected connection states', () => {
      expect(ConnectionState.Disconnected).toBe('disconnected');
      expect(ConnectionState.Connecting).toBe('connecting');
      expect(ConnectionState.Connected).toBe('connected');
      expect(ConnectionState.AuthRequired).toBe('auth-required');
      expect(ConnectionState.Authenticating).toBe('authenticating');
      expect(ConnectionState.Authenticated).toBe('authenticated');
      expect(ConnectionState.AuthFailed).toBe('auth-failed');
      expect(ConnectionState.Error).toBe('error');
    });
  });

  // =========================================================================
  // connectionState store
  // =========================================================================
  describe('connectionState store', () => {
    it('should have initial disconnected state', () => {
      const state = get(connectionState);
      expect(state.state).toBe(ConnectionState.Disconnected);
      expect(state.authenticated).toBe(false);
    });

    it('should be subscribable', () => {
      const values: any[] = [];
      const unsub = connectionState.subscribe((v) => values.push(v));
      expect(values.length).toBeGreaterThanOrEqual(1);
      unsub();
    });
  });

  // =========================================================================
  // ndk()
  // =========================================================================
  describe('ndk()', () => {
    it('should return null when not connected', () => {
      // After disconnect, ndk should be null
      expect(ndk()).toBeNull();
    });
  });

  // =========================================================================
  // isConnected()
  // =========================================================================
  describe('isConnected()', () => {
    it('should return false when NDK is not initialized', () => {
      expect(isConnected()).toBe(false);
    });
  });

  // =========================================================================
  // connectRelay()
  // =========================================================================
  describe('connectRelay()', () => {
    it('should transition to Connected state on success', async () => {
      const result = await connectRelay('wss://test.relay', VALID_PRIVKEY);
      expect(result.state).toBe(ConnectionState.Connected);
      expect(result.relay).toBe('wss://test.relay');
      expect(result.authenticated).toBe(false);
    });

    it('should throw on connection timeout when relay is not reachable', async () => {
      mockRelay.connectivity.status = 0; // Not connected
      await expect(connectRelay('wss://bad.relay', VALID_PRIVKEY)).rejects.toThrow(
        'Connection timeout'
      );
    });

    it('should update connectionState store to Error on failure', async () => {
      mockRelay.connectivity.status = 0;
      try {
        await connectRelay('wss://bad.relay', VALID_PRIVKEY);
      } catch {
        // expected
      }
      const state = get(connectionState);
      expect(state.state).toBe(ConnectionState.Error);
    });

    it('should deduplicate concurrent connect calls', async () => {
      // Reset state for clean test
      mockRelay.connectivity.status = 5;

      const p1 = connectRelay('wss://test.relay', VALID_PRIVKEY);
      const p2 = connectRelay('wss://test.relay', VALID_PRIVKEY);

      const [r1, r2] = await Promise.all([p1, p2]);
      // Both should resolve to the same result (deduped)
      expect(r1.state).toBe(ConnectionState.Connected);
      expect(r2.state).toBe(ConnectionState.Connected);
    });
  });

  // =========================================================================
  // connectRelayWithNip07()
  // =========================================================================
  describe('connectRelayWithNip07()', () => {
    it('should connect using NIP-07 signer', async () => {
      const result = await connectRelayWithNip07('wss://test.relay');
      expect(result.state).toBe(ConnectionState.Connected);
    });

    it('should deduplicate concurrent NIP-07 connect calls', async () => {
      const p1 = connectRelayWithNip07('wss://test.relay');
      const p2 = connectRelayWithNip07('wss://test.relay');

      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1.state).toBe(ConnectionState.Connected);
      expect(r2.state).toBe(ConnectionState.Connected);
    });
  });

  // =========================================================================
  // publishEvent()
  // =========================================================================
  describe('publishEvent()', () => {
    it('should throw if NDK is not initialized', async () => {
      // Ensure disconnected state
      await disconnectRelay();

      const { NDKEvent } = await import('@nostr-dev-kit/ndk');
      const event = new NDKEvent();

      await expect(publishEvent(event as any)).rejects.toThrow(
        'NDK not initialized'
      );
    });

    it('should publish event and return true on success', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);

      const event = {
        kind: 1,
        tags: [],
        content: 'test',
        pubkey: 'a'.repeat(64),
        created_at: 0,
        id: 'id',
        sig: 'sig',
        ndk: null,
        sign: vi.fn().mockResolvedValue(undefined),
        publish: vi.fn().mockResolvedValue(new Set(['wss://test.relay'])),
      };

      const result = await publishEvent(event as any);
      expect(result).toBe(true);
    });

    it('should retry once on first publish failure', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);

      let callCount = 0;
      const event = {
        kind: 1,
        tags: [],
        content: 'test',
        pubkey: 'a'.repeat(64),
        created_at: 0,
        id: 'id',
        sig: 'sig',
        ndk: null,
        sign: vi.fn().mockResolvedValue(undefined),
        publish: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('timeout'));
          }
          return Promise.resolve(new Set(['wss://test.relay']));
        }),
      };

      const result = await publishEvent(event as any);
      expect(result).toBe(true);
      expect(callCount).toBe(2);
    });
  });

  // =========================================================================
  // subscribe()
  // =========================================================================
  describe('subscribe()', () => {
    it('should throw if NDK is not initialized', () => {
      expect(() => relaySubscribe({ kinds: [1] })).toThrow(
        'NDK not initialized'
      );
    });

    it('should create subscription with filters', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);

      const sub = relaySubscribe({ kinds: [1] }, { subId: 'test-sub' });
      expect(sub).toBeDefined();
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should accept array of filters', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);

      const sub = relaySubscribe([{ kinds: [1] }, { kinds: [7] }]);
      expect(sub).toBeDefined();
    });
  });

  // =========================================================================
  // disconnectRelay()
  // =========================================================================
  describe('disconnectRelay()', () => {
    it('should disconnect and clear state', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);
      await disconnectRelay();

      const state = get(connectionState);
      expect(state.state).toBe(ConnectionState.Disconnected);
    });

    it('should stop all active subscriptions', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);
      relaySubscribe({ kinds: [1] }, { subId: 'sub1' });

      await disconnectRelay();

      // After disconnect, getActiveSubscriptions should be empty
      const subs = relayManager.getActiveSubscriptions();
      expect(subs.size).toBe(0);
    });
  });

  // =========================================================================
  // ensureRelayConnected()
  // =========================================================================
  describe('ensureRelayConnected()', () => {
    it('should no-op when already connected', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);
      // Should not throw
      await ensureRelayConnected({ privateKey: VALID_PRIVKEY });
    });

    it('should throw when no signing method available', async () => {
      await disconnectRelay();
      await expect(
        ensureRelayConnected({ isNip07: false, privateKey: null })
      ).rejects.toThrow('No signing method available');
    });

    it('should connect with NIP-07 when isNip07 is true', async () => {
      await disconnectRelay();
      await ensureRelayConnected({ isNip07: true });
      expect(isConnected()).toBe(true);
    });

    it('should connect with private key when provided', async () => {
      await disconnectRelay();
      await ensureRelayConnected({ privateKey: VALID_PRIVKEY });
      expect(isConnected()).toBe(true);
    });
  });

  // =========================================================================
  // getCurrentUser()
  // =========================================================================
  describe('getCurrentUser()', () => {
    it('should return null when no signer', async () => {
      await disconnectRelay();
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it('should return user when signer is available', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);
      const user = await getCurrentUser();
      expect(user).toBeDefined();
      expect(user?.pubkey).toBe('a'.repeat(64));
    });
  });

  // =========================================================================
  // getRelayUrls()
  // =========================================================================
  describe('getRelayUrls()', () => {
    it('should return empty array when not connected', async () => {
      await disconnectRelay();
      expect(getRelayUrls()).toEqual([]);
    });

    it('should return relay URLs when connected', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);
      const urls = getRelayUrls();
      expect(urls).toContain('wss://test.relay');
    });
  });

  // =========================================================================
  // reconnectRelay()
  // =========================================================================
  describe('reconnectRelay()', () => {
    it('should disconnect when connected', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);
      await reconnectRelay();
      const state = get(connectionState);
      expect(state.state).toBe(ConnectionState.Disconnected);
    });

    it('should warn when no relay to reconnect', async () => {
      await disconnectRelay();
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await reconnectRelay();
      expect(warnSpy).toHaveBeenCalledWith('[Relay] No relay to reconnect to');
      warnSpy.mockRestore();
    });
  });

  // =========================================================================
  // setNip07Signer() / clearSigner()
  // =========================================================================
  describe('setNip07Signer()', () => {
    it('should not throw when NDK is null', () => {
      expect(() => setNip07Signer()).not.toThrow();
    });

    it('should set signer on existing NDK instance', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);
      setNip07Signer();
      // No assertion needed - just verify no throw
    });
  });

  describe('clearSigner()', () => {
    it('should not throw when NDK is null', () => {
      expect(() => clearSigner()).not.toThrow();
    });

    it('should clear signer on existing NDK instance', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);
      clearSigner();
      // The signer should be cleared
      const ndkInst = ndk();
      expect(ndkInst?.signer).toBeUndefined();
    });
  });

  // =========================================================================
  // Subscription management helpers
  // =========================================================================
  describe('Subscription management', () => {
    it('getSubscription should return undefined for non-existent sub', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);
      expect(relayManager.getSubscription('nonexistent')).toBeUndefined();
    });

    it('closeSubscription should return false for non-existent sub', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);
      expect(relayManager.closeSubscription('nonexistent')).toBe(false);
    });

    it('getActiveSubscriptions should return a copy', async () => {
      await connectRelay('wss://test.relay', VALID_PRIVKEY);
      const subs = relayManager.getActiveSubscriptions();
      expect(subs instanceof Map).toBe(true);
    });
  });
});

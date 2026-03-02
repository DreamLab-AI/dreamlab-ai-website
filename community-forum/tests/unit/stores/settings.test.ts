/**
 * Unit Tests: Settings Store
 *
 * Tests for the application settings store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock import.meta.env before importing the module
vi.stubEnv('VITE_RELAY_URL', 'wss://test-relay.example.com');

describe('settingsStore', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
  });

  it('should initialize with default settings', async () => {
    const { settingsStore } = await import('$lib/stores/settings');
    const settings = get(settingsStore);
    expect(settings.relayMode).toBe('private');
    expect(settings.federatedRelays).toBeInstanceOf(Array);
    expect(settings.federatedRelays.length).toBeGreaterThan(0);
  });

  it('setRelayMode should update mode', async () => {
    const { settingsStore } = await import('$lib/stores/settings');
    settingsStore.setRelayMode('federated');
    expect(get(settingsStore).relayMode).toBe('federated');
  });

  it('setRelayMode should persist to localStorage', async () => {
    const { settingsStore } = await import('$lib/stores/settings');
    settingsStore.setRelayMode('federated');
    const stored = JSON.parse(localStorage.getItem('Nostr-BBS-settings')!);
    expect(stored.relayMode).toBe('federated');
  });

  it('setPrivateRelayUrl should update URL', async () => {
    const { settingsStore } = await import('$lib/stores/settings');
    settingsStore.setPrivateRelayUrl('wss://custom-relay.example.com');
    expect(get(settingsStore).privateRelayUrl).toBe('wss://custom-relay.example.com');
  });

  it('setFederatedRelays should update relay list', async () => {
    const { settingsStore } = await import('$lib/stores/settings');
    const relays = ['wss://relay1.example.com', 'wss://relay2.example.com'];
    settingsStore.setFederatedRelays(relays);
    expect(get(settingsStore).federatedRelays).toEqual(relays);
  });

  it('reset should restore defaults', async () => {
    const { settingsStore } = await import('$lib/stores/settings');
    settingsStore.setRelayMode('federated');
    settingsStore.reset();
    expect(get(settingsStore).relayMode).toBe('private');
  });

  describe('getActiveRelays()', () => {
    it('should return private relay URL in private mode', async () => {
      const { settingsStore, getActiveRelays } = await import('$lib/stores/settings');
      settingsStore.setRelayMode('private');
      const relays = getActiveRelays();
      expect(relays).toHaveLength(1);
    });

    it('should return federated relays in federated mode', async () => {
      const { settingsStore, getActiveRelays } = await import('$lib/stores/settings');
      settingsStore.setRelayMode('federated');
      const relays = getActiveRelays();
      expect(relays.length).toBeGreaterThan(1);
    });
  });

  describe('isPrivateMode()', () => {
    it('should return true when in private mode', async () => {
      const { settingsStore, isPrivateMode } = await import('$lib/stores/settings');
      settingsStore.setRelayMode('private');
      expect(isPrivateMode()).toBe(true);
    });

    it('should return false when in federated mode', async () => {
      const { settingsStore, isPrivateMode } = await import('$lib/stores/settings');
      settingsStore.setRelayMode('federated');
      expect(isPrivateMode()).toBe(false);
    });
  });

  describe('localStorage loading', () => {
    it('should load stored settings on init', async () => {
      localStorage.setItem('Nostr-BBS-settings', JSON.stringify({
        relayMode: 'federated',
        federatedRelays: ['wss://custom.relay']
      }));

      vi.resetModules();
      const { settingsStore } = await import('$lib/stores/settings');
      const settings = get(settingsStore);
      expect(settings.relayMode).toBe('federated');
      expect(settings.federatedRelays).toEqual(['wss://custom.relay']);
    });

    it('should handle corrupted localStorage gracefully', async () => {
      localStorage.setItem('Nostr-BBS-settings', 'not-json');
      vi.resetModules();
      const { settingsStore } = await import('$lib/stores/settings');
      const settings = get(settingsStore);
      expect(settings.relayMode).toBe('private');
    });
  });
});

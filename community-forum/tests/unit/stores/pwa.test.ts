/**
 * Unit Tests: PWA Store
 *
 * Tests for PWA state management, service worker registration,
 * online/offline handling, install prompt, and message queuing.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock $app/paths (used by registerServiceWorker for sw path)
vi.mock('$app/paths', () => ({
  base: ''
}));

import {
  installPrompt,
  updateAvailable,
  isOnline,
  swRegistration,
  isPWAInstalled,
  queuedMessageCount,
  canInstall,
  checkIfPWA,
  initPWA,
  triggerInstall,
  registerServiceWorker,
  checkForUpdates,
  updateServiceWorker,
  queueMessage,
  getQueuedMessages,
  clearMessageQueue,
  triggerBackgroundSync,
} from '$lib/stores/pwa';

/**
 * Helper to ensure matchMedia is always mocked properly.
 * setup.ts only sets it in beforeAll, but vi.restoreAllMocks/spyOn
 * can remove it. This helper restores it.
 */
function ensureMatchMedia(matchFn?: (query: string) => boolean) {
  const defaultMatch = matchFn || (() => false);
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: defaultMatch(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('PWA Store', () => {
  beforeEach(() => {
    // Reset stores to defaults
    installPrompt.set(null);
    updateAvailable.set(false);
    isOnline.set(true);
    swRegistration.set(null);
    isPWAInstalled.set(false);
    queuedMessageCount.set(0);
    vi.clearAllMocks();
    localStorage.clear();
    ensureMatchMedia();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Re-ensure matchMedia after restoreAllMocks
    ensureMatchMedia();
  });

  describe('store initialization', () => {
    it('should have installPrompt as null', () => {
      expect(get(installPrompt)).toBeNull();
    });

    it('should have updateAvailable as false', () => {
      expect(get(updateAvailable)).toBe(false);
    });

    it('should have isOnline reflecting navigator.onLine', () => {
      expect(get(isOnline)).toBe(true);
    });

    it('should have swRegistration as null', () => {
      expect(get(swRegistration)).toBeNull();
    });

    it('should have isPWAInstalled as false', () => {
      expect(get(isPWAInstalled)).toBe(false);
    });

    it('should have queuedMessageCount as 0', () => {
      expect(get(queuedMessageCount)).toBe(0);
    });
  });

  describe('canInstall derived store', () => {
    it('should be false when no install prompt', () => {
      installPrompt.set(null);
      isPWAInstalled.set(false);
      expect(get(canInstall)).toBe(false);
    });

    it('should be false when already installed', () => {
      const mockEvent = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' as const }) } as any;
      installPrompt.set(mockEvent);
      isPWAInstalled.set(true);
      expect(get(canInstall)).toBe(false);
    });

    it('should be true when prompt available and not installed', () => {
      const mockEvent = { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' as const }) } as any;
      installPrompt.set(mockEvent);
      isPWAInstalled.set(false);
      expect(get(canInstall)).toBe(true);
    });
  });

  describe('checkIfPWA()', () => {
    it('should return false when no PWA indicators are present', () => {
      ensureMatchMedia();
      expect(checkIfPWA()).toBe(false);
    });

    it('should return true when display-mode standalone matches', () => {
      ensureMatchMedia(q => q === '(display-mode: standalone)');
      expect(checkIfPWA()).toBe(true);
    });

    it('should return true when display-mode fullscreen matches', () => {
      ensureMatchMedia(q => q === '(display-mode: fullscreen)');
      expect(checkIfPWA()).toBe(true);
    });

    it('should return true when display-mode minimal-ui matches', () => {
      ensureMatchMedia(q => q === '(display-mode: minimal-ui)');
      expect(checkIfPWA()).toBe(true);
    });

    it('should return true for iOS standalone mode', () => {
      ensureMatchMedia();
      Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
      expect(checkIfPWA()).toBe(true);
      Object.defineProperty(navigator, 'standalone', { value: undefined, configurable: true });
    });

    it('should return true when referrer contains android-app://', () => {
      ensureMatchMedia();
      Object.defineProperty(document, 'referrer', { value: 'android-app://com.example', configurable: true });
      expect(checkIfPWA()).toBe(true);
      Object.defineProperty(document, 'referrer', { value: '', configurable: true });
    });
  });

  describe('initPWA()', () => {
    it('should register online event listener', () => {
      const addEventSpy = vi.spyOn(window, 'addEventListener');
      initPWA();
      expect(addEventSpy).toHaveBeenCalledWith('online', expect.any(Function));
    });

    it('should register offline event listener', () => {
      const addEventSpy = vi.spyOn(window, 'addEventListener');
      initPWA();
      expect(addEventSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should register beforeinstallprompt listener', () => {
      const addEventSpy = vi.spyOn(window, 'addEventListener');
      initPWA();
      expect(addEventSpy).toHaveBeenCalledWith('beforeinstallprompt', expect.any(Function));
    });

    it('should register appinstalled listener', () => {
      const addEventSpy = vi.spyOn(window, 'addEventListener');
      initPWA();
      expect(addEventSpy).toHaveBeenCalledWith('appinstalled', expect.any(Function));
    });

    it('should set isOnline to true when online event fires', () => {
      isOnline.set(false);
      initPWA();
      window.dispatchEvent(new Event('online'));
      expect(get(isOnline)).toBe(true);
    });

    it('should set isOnline to false when offline event fires', () => {
      isOnline.set(true);
      initPWA();
      window.dispatchEvent(new Event('offline'));
      expect(get(isOnline)).toBe(false);
    });

    it('should capture install prompt from beforeinstallprompt', () => {
      initPWA();
      const mockEvent = new Event('beforeinstallprompt');
      (mockEvent as any).prompt = vi.fn();
      (mockEvent as any).userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(mockEvent);
      expect(get(installPrompt)).not.toBeNull();
    });

    it('should set isPWAInstalled on appinstalled event', () => {
      initPWA();
      window.dispatchEvent(new Event('appinstalled'));
      expect(get(isPWAInstalled)).toBe(true);
      expect(get(installPrompt)).toBeNull();
      expect(localStorage.getItem('nostr_bbs_pwa_mode')).toBe('true');
    });

    it('should detect previously installed PWA from localStorage', () => {
      localStorage.setItem('nostr_bbs_pwa_mode', 'true');
      initPWA();
      expect(get(isPWAInstalled)).toBe(true);
    });
  });

  describe('triggerInstall()', () => {
    it('should return false when no prompt available', async () => {
      installPrompt.set(null);
      const result = await triggerInstall();
      expect(result).toBe(false);
    });

    it('should return true when user accepts install', async () => {
      const mockPrompt = {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted' as const }),
      } as any;
      installPrompt.set(mockPrompt);

      const result = await triggerInstall();
      expect(result).toBe(true);
      expect(get(isPWAInstalled)).toBe(true);
      expect(get(installPrompt)).toBeNull();
    });

    it('should return false when user dismisses install', async () => {
      const mockPrompt = {
        prompt: vi.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
      } as any;
      installPrompt.set(mockPrompt);

      const result = await triggerInstall();
      expect(result).toBe(false);
    });

    it('should return false when prompt throws', async () => {
      // Create the rejected promise and immediately handle it to prevent unhandled rejection
      const rejectedChoice = Promise.reject(new Error('Prompt failed'));
      rejectedChoice.catch(() => {}); // prevent unhandled rejection

      const mockPrompt = {
        prompt: vi.fn().mockRejectedValue(new Error('Prompt failed')),
        userChoice: rejectedChoice,
      } as any;
      installPrompt.set(mockPrompt);

      const result = await triggerInstall();
      expect(result).toBe(false);
    });
  });

  describe('registerServiceWorker()', () => {
    it('should return null when service workers not supported', async () => {
      const origSW = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
      Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true });

      const result = await registerServiceWorker();
      expect(result).toBeNull();

      if (origSW) {
        Object.defineProperty(navigator, 'serviceWorker', origSW);
      }
    });

    it('should register service worker and store registration', async () => {
      const mockRegistration = {
        installing: null,
        waiting: null,
        active: null,
        addEventListener: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
      };

      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockResolvedValue(mockRegistration),
          addEventListener: vi.fn(),
          controller: null,
        },
        configurable: true,
      });

      const result = await registerServiceWorker();
      expect(result).toBe(mockRegistration);
      expect(get(swRegistration)).toBe(mockRegistration);
    });

    it('should return null when registration fails', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: vi.fn().mockRejectedValue(new Error('Registration failed')),
          addEventListener: vi.fn(),
        },
        configurable: true,
      });

      const result = await registerServiceWorker();
      expect(result).toBeNull();
    });
  });

  describe('checkForUpdates()', () => {
    it('should do nothing when no registration available', async () => {
      swRegistration.set(null);
      await checkForUpdates();
      // Should not throw
    });

    it('should call registration.update()', async () => {
      const mockReg = {
        update: vi.fn().mockResolvedValue(undefined),
      } as any;
      swRegistration.set(mockReg);

      await checkForUpdates();
      expect(mockReg.update).toHaveBeenCalled();
    });

    it('should accept explicit registration parameter', async () => {
      const mockReg = {
        update: vi.fn().mockResolvedValue(undefined),
      } as any;

      await checkForUpdates(mockReg);
      expect(mockReg.update).toHaveBeenCalled();
    });

    it('should handle update check failure gracefully', async () => {
      const mockReg = {
        update: vi.fn().mockRejectedValue(new Error('Network error')),
      } as any;
      swRegistration.set(mockReg);

      // Should not throw
      await checkForUpdates();
    });
  });

  describe('updateServiceWorker()', () => {
    it('should do nothing when no waiting worker', async () => {
      swRegistration.set({ waiting: null } as any);
      await updateServiceWorker();
      // Should not throw
    });

    it('should do nothing when no registration', async () => {
      swRegistration.set(null);
      await updateServiceWorker();
    });

    it('should send SKIP_WAITING message to waiting worker', async () => {
      const mockPostMessage = vi.fn();
      const mockReg = {
        waiting: { postMessage: mockPostMessage },
      } as any;
      swRegistration.set(mockReg);

      Object.defineProperty(navigator, 'serviceWorker', {
        value: { addEventListener: vi.fn() },
        configurable: true,
      });

      await updateServiceWorker();
      expect(mockPostMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });
  });

  describe('queueMessage()', () => {
    it('should throw when service worker not active', async () => {
      swRegistration.set(null);
      const event = { kind: 1, created_at: 0, tags: [], content: '', pubkey: '' };
      await expect(queueMessage(event, ['wss://relay'])).rejects.toThrow('Service worker not active');
    });

    it('should throw when registration has no active worker', async () => {
      swRegistration.set({ active: null } as any);
      const event = { kind: 1, created_at: 0, tags: [], content: '', pubkey: '' };
      await expect(queueMessage(event, ['wss://relay'])).rejects.toThrow('Service worker not active');
    });

    it('should resolve and increment queue count on success', async () => {
      const mockPostMessage = vi.fn();
      const mockReg = {
        active: { postMessage: mockPostMessage },
      } as any;
      swRegistration.set(mockReg);

      const mockPort1 = { onmessage: null as any, close: vi.fn() };
      const mockPort2 = {};
      vi.stubGlobal('MessageChannel', vi.fn(() => ({
        port1: mockPort1,
        port2: mockPort2,
      })));

      const event = { kind: 1, created_at: 0, tags: [], content: 'test', pubkey: 'abc' };
      const promise = queueMessage(event, ['wss://relay']);

      mockPort1.onmessage({ data: { success: true } });

      await promise;
      expect(get(queuedMessageCount)).toBe(1);
    });

    it('should reject with error message on failure', async () => {
      const mockPostMessage = vi.fn();
      const mockReg = {
        active: { postMessage: mockPostMessage },
      } as any;
      swRegistration.set(mockReg);

      const mockPort1 = { onmessage: null as any, close: vi.fn() };
      const mockPort2 = {};
      vi.stubGlobal('MessageChannel', vi.fn(() => ({
        port1: mockPort1,
        port2: mockPort2,
      })));

      const event = { kind: 1, created_at: 0, tags: [], content: 'test', pubkey: 'abc' };
      const promise = queueMessage(event, ['wss://relay']);

      mockPort1.onmessage({ data: { success: false, error: 'Queue full' } });

      await expect(promise).rejects.toThrow('Queue full');
    });
  });

  describe('getQueuedMessages()', () => {
    it('should return empty array when no active worker', async () => {
      swRegistration.set(null);
      const result = await getQueuedMessages();
      expect(result).toEqual([]);
    });

    it('should return empty array when registration has no active worker', async () => {
      swRegistration.set({ active: null } as any);
      const result = await getQueuedMessages();
      expect(result).toEqual([]);
    });

    it('should return messages and update count', async () => {
      const mockPostMessage = vi.fn();
      const mockReg = {
        active: { postMessage: mockPostMessage },
      } as any;
      swRegistration.set(mockReg);

      const mockPort1 = { onmessage: null as any, close: vi.fn() };
      const mockPort2 = {};
      vi.stubGlobal('MessageChannel', vi.fn(() => ({
        port1: mockPort1,
        port2: mockPort2,
      })));

      const messages = [
        { id: '1', timestamp: 100, event: {} as any, relayUrls: [] },
        { id: '2', timestamp: 200, event: {} as any, relayUrls: [] },
      ];
      const promise = getQueuedMessages();
      mockPort1.onmessage({ data: { messages } });

      const result = await promise;
      expect(result).toEqual(messages);
      expect(get(queuedMessageCount)).toBe(2);
    });

    it('should reject on error', async () => {
      const mockPostMessage = vi.fn();
      const mockReg = {
        active: { postMessage: mockPostMessage },
      } as any;
      swRegistration.set(mockReg);

      const mockPort1 = { onmessage: null as any, close: vi.fn() };
      const mockPort2 = {};
      vi.stubGlobal('MessageChannel', vi.fn(() => ({
        port1: mockPort1,
        port2: mockPort2,
      })));

      const promise = getQueuedMessages();
      mockPort1.onmessage({ data: { error: 'IDB read error' } });

      await expect(promise).rejects.toThrow('IDB read error');
    });
  });

  describe('clearMessageQueue()', () => {
    it('should do nothing when no active worker', async () => {
      swRegistration.set(null);
      await clearMessageQueue();
    });

    it('should do nothing when registration has no active worker', async () => {
      swRegistration.set({ active: null } as any);
      await clearMessageQueue();
    });

    it('should clear queue and reset count on success', async () => {
      queuedMessageCount.set(5);
      const mockPostMessage = vi.fn();
      const mockReg = {
        active: { postMessage: mockPostMessage },
      } as any;
      swRegistration.set(mockReg);

      const mockPort1 = { onmessage: null as any, close: vi.fn() };
      const mockPort2 = {};
      vi.stubGlobal('MessageChannel', vi.fn(() => ({
        port1: mockPort1,
        port2: mockPort2,
      })));

      const promise = clearMessageQueue();
      mockPort1.onmessage({ data: { success: true } });

      await promise;
      expect(get(queuedMessageCount)).toBe(0);
    });
  });

  describe('triggerBackgroundSync()', () => {
    it('should do nothing when no registration', async () => {
      swRegistration.set(null);
      await triggerBackgroundSync();
    });

    it('should do nothing when sync not supported', async () => {
      const mockReg = {} as any;
      swRegistration.set(mockReg);
      await triggerBackgroundSync();
    });

    it('should register background sync when supported', async () => {
      const mockRegister = vi.fn().mockResolvedValue(undefined);
      const mockReg = {
        sync: { register: mockRegister },
      } as any;
      swRegistration.set(mockReg);

      await triggerBackgroundSync();
      expect(mockRegister).toHaveBeenCalledWith('sync-messages');
    });

    it('should handle sync registration failure gracefully', async () => {
      const mockReg = {
        sync: { register: vi.fn().mockRejectedValue(new Error('Sync failed')) },
      } as any;
      swRegistration.set(mockReg);

      await triggerBackgroundSync();
    });
  });
});

/**
 * Unit Tests: Preferences Store
 *
 * Tests for the user preferences store.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { preferencesStore } from '$lib/stores/preferences';

describe('preferencesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    preferencesStore.reset();
  });

  describe('defaults', () => {
    it('should start with default values', () => {
      const prefs = get(preferencesStore);
      expect(prefs.linkPreviewsEnabled).toBe(true);
      expect(prefs.mediaAutoPlay).toBe(false);
      expect(prefs.theme).toBe('auto');
      expect(prefs.notificationsEnabled).toBe(true);
      expect(prefs.soundEnabled).toBe(true);
    });
  });

  describe('toggleLinkPreviews()', () => {
    it('should toggle link previews off', () => {
      preferencesStore.toggleLinkPreviews();
      expect(get(preferencesStore).linkPreviewsEnabled).toBe(false);
    });

    it('should toggle back on', () => {
      preferencesStore.toggleLinkPreviews();
      preferencesStore.toggleLinkPreviews();
      expect(get(preferencesStore).linkPreviewsEnabled).toBe(true);
    });

    it('should persist to localStorage', () => {
      preferencesStore.toggleLinkPreviews();
      const stored = JSON.parse(localStorage.getItem('Nostr-BBS-user-preferences')!);
      expect(stored.linkPreviewsEnabled).toBe(false);
    });
  });

  describe('toggleMediaAutoPlay()', () => {
    it('should toggle media auto play', () => {
      preferencesStore.toggleMediaAutoPlay();
      expect(get(preferencesStore).mediaAutoPlay).toBe(true);
    });
  });

  describe('setTheme()', () => {
    it('should set theme to dark', () => {
      preferencesStore.setTheme('dark');
      expect(get(preferencesStore).theme).toBe('dark');
    });

    it('should set theme to light', () => {
      preferencesStore.setTheme('light');
      expect(get(preferencesStore).theme).toBe('light');
    });

    it('should persist theme change', () => {
      preferencesStore.setTheme('dark');
      const stored = JSON.parse(localStorage.getItem('Nostr-BBS-user-preferences')!);
      expect(stored.theme).toBe('dark');
    });
  });

  describe('toggleNotifications()', () => {
    it('should toggle notifications', () => {
      preferencesStore.toggleNotifications();
      expect(get(preferencesStore).notificationsEnabled).toBe(false);
    });
  });

  describe('toggleSound()', () => {
    it('should toggle sound', () => {
      preferencesStore.toggleSound();
      expect(get(preferencesStore).soundEnabled).toBe(false);
    });
  });

  describe('set()', () => {
    it('should set entire preferences object', () => {
      preferencesStore.set({
        linkPreviewsEnabled: false,
        mediaAutoPlay: true,
        theme: 'dark',
        notificationsEnabled: false,
        soundEnabled: false
      });
      const prefs = get(preferencesStore);
      expect(prefs.linkPreviewsEnabled).toBe(false);
      expect(prefs.mediaAutoPlay).toBe(true);
      expect(prefs.theme).toBe('dark');
    });
  });

  describe('update()', () => {
    it('should update preferences with updater function', () => {
      preferencesStore.update(current => ({
        ...current,
        theme: 'light',
        soundEnabled: false
      }));
      const prefs = get(preferencesStore);
      expect(prefs.theme).toBe('light');
      expect(prefs.soundEnabled).toBe(false);
      // Unchanged values should stay the same
      expect(prefs.linkPreviewsEnabled).toBe(true);
    });
  });

  describe('reset()', () => {
    it('should restore defaults', () => {
      preferencesStore.setTheme('dark');
      preferencesStore.toggleSound();
      preferencesStore.reset();
      const prefs = get(preferencesStore);
      expect(prefs.theme).toBe('auto');
      expect(prefs.soundEnabled).toBe(true);
    });
  });
});

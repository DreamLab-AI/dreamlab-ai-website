/**
 * Unit Tests: Drafts Store
 *
 * Tests for the message draft store.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { draftStore } from '$lib/stores/drafts';

describe('draftStore', () => {
  beforeEach(() => {
    localStorage.clear();
    draftStore.clearAllDrafts();
  });

  describe('saveDraft()', () => {
    it('should save a draft for a channel', () => {
      draftStore.saveDraft('ch1', 'Hello world');
      expect(draftStore.getDraft('ch1')).toBe('Hello world');
    });

    it('should persist to localStorage', () => {
      draftStore.saveDraft('ch1', 'Persisted');
      const stored = localStorage.getItem('Nostr-BBS-drafts');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.ch1.content).toBe('Persisted');
    });

    it('should remove draft when content is empty', () => {
      draftStore.saveDraft('ch1', 'Exists');
      expect(draftStore.hasDraft('ch1')).toBe(true);
      draftStore.saveDraft('ch1', '   ');
      expect(draftStore.hasDraft('ch1')).toBe(false);
    });

    it('should mark DM drafts with isDM flag', () => {
      draftStore.saveDraft('pubkey123', 'DM draft', true);
      const state = get(draftStore);
      const draft = state.drafts.get('pubkey123');
      expect(draft!.isDM).toBe(true);
    });

    it('should update timestamp on save', () => {
      draftStore.saveDraft('ch1', 'v1');
      const state1 = get(draftStore);
      const t1 = state1.drafts.get('ch1')!.updatedAt;

      draftStore.saveDraft('ch1', 'v2');
      const state2 = get(draftStore);
      const t2 = state2.drafts.get('ch1')!.updatedAt;

      expect(t2).toBeGreaterThanOrEqual(t1);
    });
  });

  describe('getDraft()', () => {
    it('should return null for non-existent draft', () => {
      expect(draftStore.getDraft('nonexistent')).toBeNull();
    });

    it('should return content of existing draft', () => {
      draftStore.saveDraft('ch1', 'Content');
      expect(draftStore.getDraft('ch1')).toBe('Content');
    });
  });

  describe('clearDraft()', () => {
    it('should remove a specific draft', () => {
      draftStore.saveDraft('ch1', 'Draft 1');
      draftStore.saveDraft('ch2', 'Draft 2');
      draftStore.clearDraft('ch1');
      expect(draftStore.hasDraft('ch1')).toBe(false);
      expect(draftStore.hasDraft('ch2')).toBe(true);
    });
  });

  describe('getDraftChannels()', () => {
    it('should return all channel IDs with drafts', () => {
      draftStore.saveDraft('ch1', 'Draft 1');
      draftStore.saveDraft('ch2', 'Draft 2');
      const channels = draftStore.getDraftChannels();
      expect(channels).toContain('ch1');
      expect(channels).toContain('ch2');
      expect(channels).toHaveLength(2);
    });

    it('should return empty array when no drafts', () => {
      expect(draftStore.getDraftChannels()).toHaveLength(0);
    });
  });

  describe('hasDraft()', () => {
    it('should return true for existing draft', () => {
      draftStore.saveDraft('ch1', 'Exists');
      expect(draftStore.hasDraft('ch1')).toBe(true);
    });

    it('should return false for non-existent draft', () => {
      expect(draftStore.hasDraft('nope')).toBe(false);
    });
  });

  describe('getDraftPreview()', () => {
    it('should return null for non-existent draft', () => {
      expect(draftStore.getDraftPreview('nope')).toBeNull();
    });

    it('should return full content for short drafts', () => {
      draftStore.saveDraft('ch1', 'Short');
      expect(draftStore.getDraftPreview('ch1')).toBe('Short');
    });

    it('should truncate long drafts to 50 chars with ellipsis', () => {
      const long = 'A'.repeat(100);
      draftStore.saveDraft('ch1', long);
      const preview = draftStore.getDraftPreview('ch1');
      expect(preview).toBe('A'.repeat(50) + '...');
    });
  });

  describe('clearAllDrafts()', () => {
    it('should remove all drafts', () => {
      draftStore.saveDraft('ch1', 'Draft 1');
      draftStore.saveDraft('ch2', 'Draft 2');
      draftStore.clearAllDrafts();
      expect(draftStore.getDraftChannels()).toHaveLength(0);
    });
  });
});

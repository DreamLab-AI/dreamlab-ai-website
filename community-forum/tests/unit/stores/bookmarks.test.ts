/**
 * Unit Tests: Bookmarks Store
 *
 * Tests for the message bookmark store.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { bookmarkStore, isBookmarked, bookmarkCount } from '$lib/stores/bookmarks';

describe('bookmarkStore', () => {
  beforeEach(() => {
    localStorage.clear();
    bookmarkStore.clearAll();
  });

  describe('addBookmark()', () => {
    it('should add a bookmark', () => {
      bookmarkStore.addBookmark('msg1', 'ch1', 'Hello', 'author1', 1000);
      const state = get(bookmarkStore);
      expect(state.bookmarks['msg1']).toBeDefined();
      expect(state.bookmarks['msg1'].content).toBe('Hello');
    });

    it('should persist to localStorage', () => {
      bookmarkStore.addBookmark('msg1', 'ch1', 'test', 'author1', 1000);
      const stored = localStorage.getItem('Nostr-BBS-bookmarks');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!).msg1).toBeDefined();
    });

    it('should include channelName when provided', () => {
      bookmarkStore.addBookmark('msg1', 'ch1', 'test', 'author1', 1000, 'General');
      const state = get(bookmarkStore);
      expect(state.bookmarks['msg1'].channelName).toBe('General');
    });

    it('should set createdAt timestamp', () => {
      const before = Date.now();
      bookmarkStore.addBookmark('msg1', 'ch1', 'test', 'author1', 1000);
      const state = get(bookmarkStore);
      expect(state.bookmarks['msg1'].createdAt).toBeGreaterThanOrEqual(before);
    });
  });

  describe('removeBookmark()', () => {
    it('should remove a bookmark', () => {
      bookmarkStore.addBookmark('msg1', 'ch1', 'test', 'author1', 1000);
      bookmarkStore.removeBookmark('msg1');
      const state = get(bookmarkStore);
      expect(state.bookmarks['msg1']).toBeUndefined();
    });

    it('should not affect other bookmarks', () => {
      bookmarkStore.addBookmark('msg1', 'ch1', 'test1', 'author1', 1000);
      bookmarkStore.addBookmark('msg2', 'ch1', 'test2', 'author1', 2000);
      bookmarkStore.removeBookmark('msg1');
      const state = get(bookmarkStore);
      expect(state.bookmarks['msg2']).toBeDefined();
    });
  });

  describe('toggleBookmark()', () => {
    it('should add bookmark if not bookmarked', () => {
      bookmarkStore.toggleBookmark('msg1', 'ch1', 'test', 'author1', 1000);
      expect(get(bookmarkStore).bookmarks['msg1']).toBeDefined();
    });

    it('should remove bookmark if already bookmarked', () => {
      bookmarkStore.addBookmark('msg1', 'ch1', 'test', 'author1', 1000);
      bookmarkStore.toggleBookmark('msg1', 'ch1', 'test', 'author1', 1000);
      expect(get(bookmarkStore).bookmarks['msg1']).toBeUndefined();
    });
  });

  describe('getBookmarks()', () => {
    it('should return empty array when no bookmarks', () => {
      expect(bookmarkStore.getBookmarks()).toHaveLength(0);
    });

    it('should return bookmarks sorted by createdAt descending', () => {
      bookmarkStore.addBookmark('msg1', 'ch1', 'first', 'a1', 1000);
      bookmarkStore.addBookmark('msg2', 'ch1', 'second', 'a1', 2000);
      const bookmarks = bookmarkStore.getBookmarks();
      expect(bookmarks).toHaveLength(2);
      expect(bookmarks[0].createdAt).toBeGreaterThanOrEqual(bookmarks[1].createdAt);
    });
  });

  describe('clearAll()', () => {
    it('should remove all bookmarks', () => {
      bookmarkStore.addBookmark('msg1', 'ch1', 'test1', 'a1', 1000);
      bookmarkStore.addBookmark('msg2', 'ch1', 'test2', 'a1', 2000);
      bookmarkStore.clearAll();
      expect(bookmarkStore.getBookmarks()).toHaveLength(0);
    });
  });

  describe('derived stores', () => {
    it('isBookmarked should return true for bookmarked message', () => {
      bookmarkStore.addBookmark('msg1', 'ch1', 'test', 'a1', 1000);
      expect(get(isBookmarked('msg1'))).toBe(true);
    });

    it('isBookmarked should return false for non-bookmarked message', () => {
      expect(get(isBookmarked('nonexistent'))).toBe(false);
    });

    it('bookmarkCount should track count', () => {
      expect(get(bookmarkCount)).toBe(0);
      bookmarkStore.addBookmark('msg1', 'ch1', 'test', 'a1', 1000);
      expect(get(bookmarkCount)).toBe(1);
      bookmarkStore.addBookmark('msg2', 'ch1', 'test', 'a1', 2000);
      expect(get(bookmarkCount)).toBe(2);
    });
  });
});

/**
 * Unit Tests: Toast Store
 *
 * Tests for the toast notification store.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { toast } from '$lib/stores/toast';

describe('toast store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toast.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    toast.clear();
  });

  describe('success()', () => {
    it('should add a success toast', () => {
      toast.success('Done!');
      const state = get(toast);
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].variant).toBe('success');
      expect(state.toasts[0].message).toBe('Done!');
    });

    it('should auto-dismiss after duration', () => {
      toast.success('Auto dismiss', 3000);
      expect(get(toast).toasts).toHaveLength(1);
      vi.advanceTimersByTime(3000);
      expect(get(toast).toasts).toHaveLength(0);
    });
  });

  describe('error()', () => {
    it('should add an error toast', () => {
      toast.error('Failed!');
      const state = get(toast);
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].variant).toBe('error');
    });

    it('should support action option', () => {
      const callback = vi.fn();
      toast.error('Failed!', 7000, { label: 'Retry', callback });
      const state = get(toast);
      expect(state.toasts[0].action).toBeDefined();
      expect(state.toasts[0].action!.label).toBe('Retry');
    });
  });

  describe('info()', () => {
    it('should add an info toast', () => {
      toast.info('FYI');
      const state = get(toast);
      expect(state.toasts[0].variant).toBe('info');
    });
  });

  describe('warning()', () => {
    it('should add a warning toast', () => {
      toast.warning('Careful');
      const state = get(toast);
      expect(state.toasts[0].variant).toBe('warning');
    });
  });

  describe('remove()', () => {
    it('should remove a specific toast by id', () => {
      const id = toast.success('test');
      expect(get(toast).toasts).toHaveLength(1);
      toast.remove(id);
      expect(get(toast).toasts).toHaveLength(0);
    });

    it('should clear timeout when removing', () => {
      const id = toast.success('test', 10000);
      toast.remove(id);
      vi.advanceTimersByTime(10000);
      expect(get(toast).toasts).toHaveLength(0);
    });
  });

  describe('clear()', () => {
    it('should remove all toasts', () => {
      toast.success('one');
      toast.error('two');
      toast.info('three');
      expect(get(toast).toasts).toHaveLength(3);
      toast.clear();
      expect(get(toast).toasts).toHaveLength(0);
    });
  });

  describe('max toasts limit', () => {
    it('should limit to 3 toasts, removing oldest', () => {
      toast.success('one');
      toast.success('two');
      toast.success('three');
      toast.success('four');
      const state = get(toast);
      expect(state.toasts).toHaveLength(3);
      expect(state.toasts[0].message).toBe('two');
      expect(state.toasts[2].message).toBe('four');
    });
  });

  describe('error-specific helpers', () => {
    it('networkError should create an error toast', () => {
      toast.networkError();
      const state = get(toast);
      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].variant).toBe('error');
      expect(state.toasts[0].message).toContain('Connection lost');
    });

    it('networkError should include retry action when callback provided', () => {
      const retry = vi.fn();
      toast.networkError(retry);
      const state = get(toast);
      expect(state.toasts[0].action).toBeDefined();
      expect(state.toasts[0].action!.label).toBe('Retry');
    });

    it('rateLimitError should create a warning toast', () => {
      toast.rateLimitError(60);
      const state = get(toast);
      expect(state.toasts[0].variant).toBe('warning');
      expect(state.toasts[0].message).toContain('60 seconds');
    });

    it('permissionError should create error toast', () => {
      toast.permissionError();
      const state = get(toast);
      expect(state.toasts[0].variant).toBe('error');
      expect(state.toasts[0].message).toContain('permission');
    });

    it('validationError should create warning toast', () => {
      toast.validationError('Invalid email');
      const state = get(toast);
      expect(state.toasts[0].variant).toBe('warning');
      expect(state.toasts[0].message).toBe('Invalid email');
    });

    it('serverError should create error toast', () => {
      toast.serverError();
      const state = get(toast);
      expect(state.toasts[0].variant).toBe('error');
      expect(state.toasts[0].message).toContain('Server error');
    });
  });

  describe('success-specific helpers', () => {
    it('messageSent should create success toast', () => {
      toast.messageSent();
      expect(get(toast).toasts[0].variant).toBe('success');
    });

    it('profileUpdated should create success toast', () => {
      toast.profileUpdated();
      expect(get(toast).toasts[0].variant).toBe('success');
    });

    it('saved should create success toast', () => {
      toast.saved();
      expect(get(toast).toasts[0].variant).toBe('success');
    });

    it('deleted should create success toast', () => {
      toast.deleted();
      expect(get(toast).toasts[0].variant).toBe('success');
    });

    it('copied should create success toast', () => {
      toast.copied();
      expect(get(toast).toasts[0].variant).toBe('success');
    });
  });

  describe('toast id uniqueness', () => {
    it('should return unique ids for each toast', () => {
      const id1 = toast.success('one');
      const id2 = toast.success('two');
      expect(id1).not.toBe(id2);
    });
  });

  describe('zero duration', () => {
    it('should not auto-dismiss when duration is 0', () => {
      toast.error('persist', 0);
      vi.advanceTimersByTime(100000);
      expect(get(toast).toasts).toHaveLength(1);
    });
  });
});

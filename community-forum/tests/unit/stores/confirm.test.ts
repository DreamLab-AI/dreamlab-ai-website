/**
 * Unit Tests: Confirm Store
 *
 * Tests for the confirmation dialog store.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { confirmStore, confirm } from '$lib/stores/confirm';

describe('confirmStore', () => {
  beforeEach(() => {
    // Reset state by cancelling any open dialog
    confirmStore.close();
  });

  describe('initial state', () => {
    it('should start with open false', () => {
      const state = get(confirmStore);
      expect(state.open).toBe(false);
      expect(state.options).toBeNull();
      expect(state.resolve).toBeNull();
    });
  });

  describe('confirm()', () => {
    it('should open dialog with provided options', () => {
      confirmStore.confirm({ title: 'Delete', message: 'Are you sure?' });
      const state = get(confirmStore);
      expect(state.open).toBe(true);
      expect(state.options!.title).toBe('Delete');
      expect(state.options!.message).toBe('Are you sure?');
    });

    it('should set default confirmLabel and cancelLabel', () => {
      confirmStore.confirm({ title: 'Test', message: 'msg' });
      const state = get(confirmStore);
      expect(state.options!.confirmLabel).toBe('Confirm');
      expect(state.options!.cancelLabel).toBe('Cancel');
    });

    it('should set default variant to danger', () => {
      confirmStore.confirm({ title: 'Test', message: 'msg' });
      const state = get(confirmStore);
      expect(state.options!.variant).toBe('danger');
    });

    it('should override defaults with provided values', () => {
      confirmStore.confirm({
        title: 'Custom',
        message: 'msg',
        confirmLabel: 'Yes',
        cancelLabel: 'No',
        variant: 'warning'
      });
      const state = get(confirmStore);
      expect(state.options!.confirmLabel).toBe('Yes');
      expect(state.options!.cancelLabel).toBe('No');
      expect(state.options!.variant).toBe('warning');
    });

    it('should return a promise', () => {
      const result = confirmStore.confirm({ title: 'T', message: 'M' });
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('handleConfirm()', () => {
    it('should resolve promise with true', async () => {
      const promise = confirmStore.confirm({ title: 'T', message: 'M' });
      confirmStore.handleConfirm();
      const result = await promise;
      expect(result).toBe(true);
    });

    it('should close dialog after confirm', () => {
      confirmStore.confirm({ title: 'T', message: 'M' });
      confirmStore.handleConfirm();
      const state = get(confirmStore);
      expect(state.open).toBe(false);
      expect(state.options).toBeNull();
      expect(state.resolve).toBeNull();
    });
  });

  describe('handleCancel()', () => {
    it('should resolve promise with false', async () => {
      const promise = confirmStore.confirm({ title: 'T', message: 'M' });
      confirmStore.handleCancel();
      const result = await promise;
      expect(result).toBe(false);
    });

    it('should close dialog after cancel', () => {
      confirmStore.confirm({ title: 'T', message: 'M' });
      confirmStore.handleCancel();
      const state = get(confirmStore);
      expect(state.open).toBe(false);
    });
  });

  describe('close()', () => {
    it('should resolve promise with false', async () => {
      const promise = confirmStore.confirm({ title: 'T', message: 'M' });
      confirmStore.close();
      const result = await promise;
      expect(result).toBe(false);
    });

    it('should reset state', () => {
      confirmStore.confirm({ title: 'T', message: 'M' });
      confirmStore.close();
      const state = get(confirmStore);
      expect(state.open).toBe(false);
      expect(state.options).toBeNull();
      expect(state.resolve).toBeNull();
    });
  });

  describe('convenience confirm() function', () => {
    it('should delegate to confirmStore.confirm', async () => {
      const promise = confirm({ title: 'Shortcut', message: 'test' });
      const state = get(confirmStore);
      expect(state.open).toBe(true);
      expect(state.options!.title).toBe('Shortcut');
      confirmStore.handleConfirm();
      expect(await promise).toBe(true);
    });
  });
});

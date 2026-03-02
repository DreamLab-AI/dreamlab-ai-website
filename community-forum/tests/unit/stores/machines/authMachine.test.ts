import { describe, it, expect, vi } from 'vitest';
import {
	authReducer,
	createAuthMachine,
	isAuthenticatedState,
	isErrorState,
	isLoadingState,
	extractPubkey,
	canTransition
} from '$lib/stores/machines/authMachine';
import type { AuthState, AuthEvent, AuthEffect } from '$lib/stores/machines/authMachine';
import { get } from 'svelte/store';

describe('authMachine', () => {
	describe('authReducer', () => {
		describe('idle state', () => {
			const idleState: AuthState = { state: 'idle' };

			it('transitions to loading on INIT', () => {
				const result = authReducer(idleState, { type: 'INIT' });
				expect(result.state).toEqual({ state: 'loading' });
			});

			it('stays idle on RESET', () => {
				const result = authReducer(idleState, { type: 'RESET' });
				expect(result.state).toEqual({ state: 'idle' });
			});

			it('ignores unknown events', () => {
				const result = authReducer(idleState, { type: 'LOGOUT' });
				expect(result.state).toBe(idleState);
			});
		});

		describe('loading state', () => {
			const loadingState: AuthState = { state: 'loading' };

			it('transitions to authenticated on RESTORE_SESSION', () => {
				const result = authReducer(loadingState, {
					type: 'RESTORE_SESSION',
					pubkey: 'pk1',
					privateKey: 'sk1'
				});
				expect(result.state).toEqual({
					state: 'authenticated',
					pubkey: 'pk1',
					privateKey: 'sk1'
				});
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'CONNECT_RELAY' })
				);
			});

			it('transitions to unauthenticated on ERROR', () => {
				const result = authReducer(loadingState, { type: 'ERROR', error: 'fail' });
				expect(result.state).toEqual({ state: 'unauthenticated' });
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'NOTIFY', level: 'error' })
				);
			});

			it('transitions to authenticated on LOGIN', () => {
				const result = authReducer(loadingState, {
					type: 'LOGIN',
					pubkey: 'pk1',
					privateKey: 'sk1'
				});
				expect(result.state).toEqual({
					state: 'authenticated',
					pubkey: 'pk1',
					privateKey: 'sk1'
				});
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'PERSIST_SESSION' })
				);
			});

			it('transitions to idle on RESET', () => {
				const result = authReducer(loadingState, { type: 'RESET' });
				expect(result.state).toEqual({ state: 'idle' });
			});

			it('transitions to unauthenticated on INIT (no session found)', () => {
				const result = authReducer(loadingState, { type: 'INIT' });
				expect(result.state).toEqual({ state: 'unauthenticated' });
			});
		});

		describe('unauthenticated state', () => {
			const unauthedState: AuthState = { state: 'unauthenticated' };

			it('transitions to authenticating on LOGIN_START', () => {
				const result = authReducer(unauthedState, {
					type: 'LOGIN_START',
					pubkey: 'pk1'
				});
				expect(result.state).toEqual({
					state: 'authenticating',
					pubkey: 'pk1'
				});
			});

			it('transitions directly to authenticated on LOGIN', () => {
				const result = authReducer(unauthedState, {
					type: 'LOGIN',
					pubkey: 'pk1',
					privateKey: 'sk1'
				});
				expect(result.state).toEqual({
					state: 'authenticated',
					pubkey: 'pk1',
					privateKey: 'sk1'
				});
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'PERSIST_SESSION' })
				);
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'NOTIFY', level: 'success' })
				);
			});

			it('transitions to error on ERROR', () => {
				const result = authReducer(unauthedState, {
					type: 'ERROR',
					error: 'Something went wrong'
				});
				expect(result.state).toEqual({
					state: 'error',
					error: 'Something went wrong',
					previousState: unauthedState
				});
			});

			it('transitions to idle on RESET', () => {
				const result = authReducer(unauthedState, { type: 'RESET' });
				expect(result.state).toEqual({ state: 'idle' });
			});

			it('ignores LOGOUT', () => {
				const result = authReducer(unauthedState, { type: 'LOGOUT' });
				expect(result.state).toBe(unauthedState);
			});
		});

		describe('authenticating state', () => {
			const authingState: AuthState = { state: 'authenticating', pubkey: 'pk1' };

			it('transitions to authenticated on LOGIN_SUCCESS', () => {
				const result = authReducer(authingState, {
					type: 'LOGIN_SUCCESS',
					pubkey: 'pk1',
					privateKey: 'sk1'
				});
				expect(result.state).toEqual({
					state: 'authenticated',
					pubkey: 'pk1',
					privateKey: 'sk1'
				});
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'PERSIST_SESSION' })
				);
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'CONNECT_RELAY' })
				);
			});

			it('transitions to error on LOGIN_FAILURE', () => {
				const result = authReducer(authingState, {
					type: 'LOGIN_FAILURE',
					error: 'Invalid credentials'
				});
				expect(result.state).toEqual({
					state: 'error',
					error: 'Invalid credentials',
					previousState: authingState
				});
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'NOTIFY', level: 'error' })
				);
			});

			it('transitions to unauthenticated on LOGOUT', () => {
				const result = authReducer(authingState, { type: 'LOGOUT' });
				expect(result.state).toEqual({ state: 'unauthenticated' });
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'CLEAR_SESSION' })
				);
			});

			it('transitions to unauthenticated on RESET', () => {
				const result = authReducer(authingState, { type: 'RESET' });
				expect(result.state).toEqual({ state: 'unauthenticated' });
			});

			it('ignores unrelated events', () => {
				const result = authReducer(authingState, { type: 'INIT' });
				expect(result.state).toBe(authingState);
			});
		});

		describe('authenticated state', () => {
			const authedState: AuthState = {
				state: 'authenticated',
				pubkey: 'pk1',
				privateKey: 'sk1'
			};

			it('transitions to unauthenticated on LOGOUT', () => {
				const result = authReducer(authedState, { type: 'LOGOUT' });
				expect(result.state).toEqual({ state: 'unauthenticated' });
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'CLEAR_SESSION' })
				);
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'DISCONNECT_RELAY' })
				);
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'NOTIFY', level: 'info' })
				);
			});

			it('transitions to error on ERROR', () => {
				const result = authReducer(authedState, {
					type: 'ERROR',
					error: 'Session expired'
				});
				expect(result.state).toEqual({
					state: 'error',
					error: 'Session expired',
					previousState: authedState
				});
			});

			it('transitions to idle on RESET with cleanup', () => {
				const result = authReducer(authedState, { type: 'RESET' });
				expect(result.state).toEqual({ state: 'idle' });
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'CLEAR_SESSION' })
				);
				expect(result.effects).toContainEqual(
					expect.objectContaining({ type: 'DISCONNECT_RELAY' })
				);
			});

			it('ignores LOGIN_START', () => {
				const result = authReducer(authedState, {
					type: 'LOGIN_START',
					pubkey: 'pk2'
				});
				expect(result.state).toBe(authedState);
			});
		});

		describe('error state', () => {
			const errorState: AuthState = {
				state: 'error',
				error: 'Test error'
			};

			const errorWithPrevAuth: AuthState = {
				state: 'error',
				error: 'Test error',
				previousState: {
					state: 'authenticated',
					pubkey: 'pk1',
					privateKey: 'sk1'
				}
			};

			it('transitions to unauthenticated on CLEAR_ERROR', () => {
				const result = authReducer(errorState, { type: 'CLEAR_ERROR' });
				expect(result.state).toEqual({ state: 'unauthenticated' });
			});

			it('returns to previous authenticated state on CLEAR_ERROR if available', () => {
				const result = authReducer(errorWithPrevAuth, { type: 'CLEAR_ERROR' });
				expect(result.state).toEqual({
					state: 'authenticated',
					pubkey: 'pk1',
					privateKey: 'sk1'
				});
			});

			it('transitions to authenticated on LOGIN', () => {
				const result = authReducer(errorState, {
					type: 'LOGIN',
					pubkey: 'pk1',
					privateKey: 'sk1'
				});
				expect(result.state).toEqual({
					state: 'authenticated',
					pubkey: 'pk1',
					privateKey: 'sk1'
				});
			});

			it('transitions to authenticating on LOGIN_START', () => {
				const result = authReducer(errorState, {
					type: 'LOGIN_START',
					pubkey: 'pk1'
				});
				expect(result.state).toEqual({
					state: 'authenticating',
					pubkey: 'pk1'
				});
			});

			it('transitions to idle on RESET', () => {
				const result = authReducer(errorState, { type: 'RESET' });
				expect(result.state).toEqual({ state: 'idle' });
			});

			it('ignores LOGOUT', () => {
				const result = authReducer(errorState, { type: 'LOGOUT' });
				expect(result.state).toBe(errorState);
			});
		});
	});

	describe('createAuthMachine', () => {
		it('starts in idle state', () => {
			const machine = createAuthMachine();
			expect(machine.getState()).toEqual({ state: 'idle' });
		});

		it('sends events and transitions state', () => {
			const machine = createAuthMachine();
			machine.send({ type: 'INIT' });
			expect(machine.getState().state).toBe('loading');
		});

		it('provides isAuthenticated derived store', () => {
			const machine = createAuthMachine();
			expect(get(machine.isAuthenticated)).toBe(false);

			machine.send({ type: 'INIT' });
			machine.send({
				type: 'RESTORE_SESSION',
				pubkey: 'pk1',
				privateKey: 'sk1'
			});

			expect(get(machine.isAuthenticated)).toBe(true);
		});

		it('provides pubkey derived store', () => {
			const machine = createAuthMachine();
			expect(get(machine.pubkey)).toBeNull();

			machine.send({ type: 'INIT' });
			machine.send({
				type: 'RESTORE_SESSION',
				pubkey: 'test-pubkey',
				privateKey: 'sk1'
			});

			expect(get(machine.pubkey)).toBe('test-pubkey');
		});

		it('provides error derived store', () => {
			const machine = createAuthMachine();
			expect(get(machine.error)).toBeNull();

			machine.send({ type: 'INIT' });
			machine.send({ type: 'ERROR', error: 'test error' });

			// After error in loading state, goes to unauthenticated (not error)
			// Let's trigger from unauthenticated
			machine.send({ type: 'ERROR', error: 'from unauthed' });
			expect(get(machine.error)).toBe('from unauthed');
		});

		it('provides isLoading derived store', () => {
			const machine = createAuthMachine();
			expect(get(machine.isLoading)).toBe(false);

			machine.send({ type: 'INIT' });
			expect(get(machine.isLoading)).toBe(true);
		});

		it('calls effect handler on transitions', async () => {
			const effectHandler = vi.fn();
			const machine = createAuthMachine(effectHandler);

			machine.send({ type: 'INIT' });
			machine.send({
				type: 'RESTORE_SESSION',
				pubkey: 'pk1',
				privateKey: 'sk1'
			});

			// Wait for async effects
			await new Promise(resolve => setTimeout(resolve, 10));
			expect(effectHandler).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'CONNECT_RELAY' })
			);
		});

		it('handles effect handler errors gracefully', async () => {
			const effectHandler = vi.fn().mockRejectedValue(new Error('Effect failed'));
			const machine = createAuthMachine(effectHandler);

			machine.send({ type: 'INIT' });
			machine.send({
				type: 'LOGIN',
				pubkey: 'pk1',
				privateKey: 'sk1'
			});

			// Should not throw, effects are caught internally
			await new Promise(resolve => setTimeout(resolve, 10));
			expect(machine.getState().state).toBe('authenticated');
		});

		it('subscribe provides state updates', () => {
			const machine = createAuthMachine();
			const states: AuthState[] = [];
			const unsub = machine.subscribe(state => states.push(state));

			machine.send({ type: 'INIT' });
			machine.send({ type: 'ERROR', error: 'fail' });

			unsub();
			// idle + loading + unauthenticated (error in loading transitions to unauthenticated)
			expect(states.length).toBeGreaterThanOrEqual(3);
		});

		it('complete login flow works end-to-end', () => {
			const machine = createAuthMachine();

			machine.send({ type: 'INIT' });
			expect(machine.getState().state).toBe('loading');

			machine.send({ type: 'INIT' }); // No session found
			expect(machine.getState().state).toBe('unauthenticated');

			machine.send({ type: 'LOGIN_START', pubkey: 'pk1' });
			expect(machine.getState().state).toBe('authenticating');

			machine.send({
				type: 'LOGIN_SUCCESS',
				pubkey: 'pk1',
				privateKey: 'sk1'
			});
			expect(machine.getState().state).toBe('authenticated');

			machine.send({ type: 'LOGOUT' });
			expect(machine.getState().state).toBe('unauthenticated');
		});
	});

	describe('type guards', () => {
		it('isAuthenticatedState returns true for authenticated', () => {
			const state: AuthState = { state: 'authenticated', pubkey: 'pk', privateKey: 'sk' };
			expect(isAuthenticatedState(state)).toBe(true);
		});

		it('isAuthenticatedState returns false for other states', () => {
			expect(isAuthenticatedState({ state: 'idle' })).toBe(false);
			expect(isAuthenticatedState({ state: 'loading' })).toBe(false);
			expect(isAuthenticatedState({ state: 'unauthenticated' })).toBe(false);
		});

		it('isErrorState returns true for error', () => {
			const state: AuthState = { state: 'error', error: 'test' };
			expect(isErrorState(state)).toBe(true);
		});

		it('isErrorState returns false for other states', () => {
			expect(isErrorState({ state: 'idle' })).toBe(false);
			expect(isErrorState({ state: 'authenticated', pubkey: 'pk', privateKey: 'sk' })).toBe(false);
		});

		it('isLoadingState returns true for loading and authenticating', () => {
			expect(isLoadingState({ state: 'loading' })).toBe(true);
			expect(isLoadingState({ state: 'authenticating', pubkey: 'pk' })).toBe(true);
		});

		it('isLoadingState returns false for other states', () => {
			expect(isLoadingState({ state: 'idle' })).toBe(false);
			expect(isLoadingState({ state: 'authenticated', pubkey: 'pk', privateKey: 'sk' })).toBe(false);
			expect(isLoadingState({ state: 'error', error: 'e' })).toBe(false);
		});
	});

	describe('extractPubkey', () => {
		it('extracts pubkey from authenticated state', () => {
			expect(extractPubkey({ state: 'authenticated', pubkey: 'pk1', privateKey: 'sk1' })).toBe('pk1');
		});

		it('extracts pubkey from authenticating state', () => {
			expect(extractPubkey({ state: 'authenticating', pubkey: 'pk2' })).toBe('pk2');
		});

		it('returns null for states without pubkey', () => {
			expect(extractPubkey({ state: 'idle' })).toBeNull();
			expect(extractPubkey({ state: 'loading' })).toBeNull();
			expect(extractPubkey({ state: 'unauthenticated' })).toBeNull();
			expect(extractPubkey({ state: 'error', error: 'test' })).toBeNull();
		});
	});

	describe('canTransition', () => {
		it('returns true for valid transitions from idle', () => {
			expect(canTransition({ state: 'idle' }, 'INIT')).toBe(true);
			expect(canTransition({ state: 'idle' }, 'RESET')).toBe(true);
		});

		it('returns false for invalid transitions from idle', () => {
			expect(canTransition({ state: 'idle' }, 'LOGOUT')).toBe(false);
			expect(canTransition({ state: 'idle' }, 'LOGIN_SUCCESS')).toBe(false);
		});

		it('returns true for valid transitions from loading', () => {
			expect(canTransition({ state: 'loading' }, 'RESTORE_SESSION')).toBe(true);
			expect(canTransition({ state: 'loading' }, 'ERROR')).toBe(true);
			expect(canTransition({ state: 'loading' }, 'LOGIN')).toBe(true);
			expect(canTransition({ state: 'loading' }, 'RESET')).toBe(true);
		});

		it('returns true for valid transitions from unauthenticated', () => {
			expect(canTransition({ state: 'unauthenticated' }, 'LOGIN_START')).toBe(true);
			expect(canTransition({ state: 'unauthenticated' }, 'LOGIN')).toBe(true);
			expect(canTransition({ state: 'unauthenticated' }, 'ERROR')).toBe(true);
		});

		it('returns true for valid transitions from authenticating', () => {
			const s: AuthState = { state: 'authenticating', pubkey: 'pk' };
			expect(canTransition(s, 'LOGIN_SUCCESS')).toBe(true);
			expect(canTransition(s, 'LOGIN_FAILURE')).toBe(true);
			expect(canTransition(s, 'LOGOUT')).toBe(true);
		});

		it('returns true for valid transitions from authenticated', () => {
			const s: AuthState = { state: 'authenticated', pubkey: 'pk', privateKey: 'sk' };
			expect(canTransition(s, 'LOGOUT')).toBe(true);
			expect(canTransition(s, 'ERROR')).toBe(true);
			expect(canTransition(s, 'RESET')).toBe(true);
		});

		it('returns true for valid transitions from error', () => {
			const s: AuthState = { state: 'error', error: 'e' };
			expect(canTransition(s, 'CLEAR_ERROR')).toBe(true);
			expect(canTransition(s, 'LOGIN')).toBe(true);
			expect(canTransition(s, 'LOGIN_START')).toBe(true);
			expect(canTransition(s, 'RESET')).toBe(true);
		});

		it('returns false for invalid transitions from authenticated', () => {
			const s: AuthState = { state: 'authenticated', pubkey: 'pk', privateKey: 'sk' };
			expect(canTransition(s, 'LOGIN_START')).toBe(false);
			expect(canTransition(s, 'RESTORE_SESSION')).toBe(false);
		});
	});
});

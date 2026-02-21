<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { restoreFromNsecOrHex } from '$lib/nostr/keys';
  import { authStore } from '$lib/stores/auth';
  import { checkWhitelistStatus } from '$lib/nostr/whitelist';
  import { waitForNip07 } from '$lib/nostr/nip07';
  import InfoTooltip from '$lib/components/ui/InfoTooltip.svelte';

  function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  const dispatch = createEventDispatcher<{
    success: { publicKey: string };
    pending: { publicKey: string };
    signup: void;
  }>();

  let privateKeyInput = '';
  let isLoggingInPasskey = false;
  let isConnectingExtension = false;
  let isRestoring = false;
  let validationError = '';
  let isCheckingWhitelist = false;
  let hasExtension = false;

  onMount(async () => {
    if (browser) {
      hasExtension = await waitForNip07(1000);
    }
  });

  async function handlePasskeyLogin() {
    isLoggingInPasskey = true;
    validationError = '';
    authStore.clearError();

    try {
      const result = await authStore.loginWithPasskey();
      const publicKey = result.pubkey;

      isCheckingWhitelist = true;
      const whitelistStatus = await checkWhitelistStatus(publicKey);
      isCheckingWhitelist = false;

      if (whitelistStatus.isApproved || whitelistStatus.isAdmin) {
        dispatch('success', { publicKey });
      } else {
        dispatch('pending', { publicKey });
      }
    } catch (error) {
      validationError = error instanceof Error ? error.message : 'Passkey sign-in failed';
    } finally {
      isLoggingInPasskey = false;
      isCheckingWhitelist = false;
    }
  }

  async function handleExtensionLogin() {
    isConnectingExtension = true;
    validationError = '';
    authStore.clearError();

    try {
      const { publicKey } = await authStore.loginWithExtension();

      isCheckingWhitelist = true;
      const whitelistStatus = await checkWhitelistStatus(publicKey);
      isCheckingWhitelist = false;

      if (whitelistStatus.isApproved || whitelistStatus.isAdmin) {
        dispatch('success', { publicKey });
      } else {
        dispatch('pending', { publicKey });
      }
    } catch (error) {
      validationError = error instanceof Error ? error.message : 'Failed to connect to extension';
    } finally {
      isConnectingExtension = false;
      isCheckingWhitelist = false;
    }
  }

  async function handleNsecRestore() {
    isRestoring = true;
    validationError = '';
    authStore.clearError();

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!privateKeyInput.trim()) {
        validationError = 'Please enter your private key (nsec or hex format)';
        return;
      }

      const { publicKey, privateKey } = restoreFromNsecOrHex(privateKeyInput);
      privateKeyInput = '';

      isCheckingWhitelist = true;
      const whitelistStatus = await checkWhitelistStatus(publicKey);
      isCheckingWhitelist = false;

      // Store the private key in memory via setKeysFromPasskey so signing works.
      const privkeyBytes = hexToBytes(privateKey);
      const accountStatus = (whitelistStatus.isApproved || whitelistStatus.isAdmin) ? 'complete' : 'incomplete';
      const nsecBackedUp = whitelistStatus.isApproved || whitelistStatus.isAdmin;
      authStore.setKeysFromPasskey(publicKey, privkeyBytes, { accountStatus, nsecBackedUp });

      if (whitelistStatus.isApproved || whitelistStatus.isAdmin) {
        dispatch('success', { publicKey });
      } else {
        dispatch('pending', { publicKey });
      }
    } catch (error) {
      validationError = error instanceof Error ? error.message : 'Invalid private key';
      authStore.setError(validationError);
    } finally {
      isRestoring = false;
      isCheckingWhitelist = false;
    }
  }

  $: isBusy = isLoggingInPasskey || isConnectingExtension || isRestoring || isCheckingWhitelist;
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-4 bg-base-200 gradient-mesh">
  <div class="card w-full max-w-md bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title text-2xl justify-center mb-4">Log In</h2>

      <!-- Primary: Passkey -->
      <div class="mb-4">
        <button
          class="btn btn-primary btn-lg w-full gap-2"
          on:click={handlePasskeyLogin}
          disabled={isBusy}
          aria-busy={isLoggingInPasskey || (isCheckingWhitelist && !isConnectingExtension && !isRestoring)}
        >
          {#if isLoggingInPasskey}
            <span class="loading loading-spinner" aria-hidden="true"></span>
            <span>Authenticating...</span>
          {:else if isCheckingWhitelist && !isConnectingExtension && !isRestoring}
            <span class="loading loading-spinner" aria-hidden="true"></span>
            <span>Checking approval status...</span>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
            Sign in with passkey
          {/if}
        </button>
      </div>

      <!-- Secondary: NIP-07 Extension (shown when extension detected) -->
      {#if hasExtension}
        <div class="mb-4">
          <button
            class="btn btn-outline w-full gap-2"
            on:click={handleExtensionLogin}
            disabled={isBusy}
            aria-busy={isConnectingExtension}
          >
            {#if isConnectingExtension}
              <span class="loading loading-spinner" aria-hidden="true"></span>
              <span>Connecting to extension...</span>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Sign in with Nostr extension
            {/if}
          </button>
          <p class="text-xs text-center text-base-content/60 mt-1">
            Use your browser extension (Alby, nos2x, etc.)
          </p>
        </div>
      {/if}

      <!-- Tertiary: Advanced nsec (collapsed) -->
      <details class="mb-4">
        <summary class="cursor-pointer text-sm text-base-content/60 hover:text-base-content transition-colors select-none">
          Advanced: sign in with private key
        </summary>
        <div class="mt-4">
          <div class="alert alert-info mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-xs">Enter your private key (nsec or hex) to access your account</span>
          </div>

          <div class="form-control mb-3">
            <label class="label" for="private-key-input">
              <span class="label-text font-medium flex items-center gap-2">
                Private Key
                <InfoTooltip
                  text="Your private key (nsec) is the secret credential that proves you own your account. It starts with 'nsec1' or can be 64 hex characters. NEVER share this with anyone."
                  position="top"
                  maxWidth="350px"
                  inline={true}
                />
              </span>
            </label>
            <input
              id="private-key-input"
              type="password"
              class="input input-bordered font-mono"
              placeholder="nsec1... or 64-character hex"
              bind:value={privateKeyInput}
              disabled={isBusy}
              autocomplete="off"
              aria-describedby="private-key-hint"
              on:keypress={(e) => e.key === 'Enter' && handleNsecRestore()}
            />
            <label class="label">
              <span id="private-key-hint" class="label-text-alt text-base-content/50">
                Supports nsec format (nsec1...) or raw 64-character hex
              </span>
            </label>
          </div>

          <button
            class="btn btn-primary w-full"
            on:click={handleNsecRestore}
            disabled={isBusy}
            aria-busy={isRestoring}
          >
            {#if isRestoring && !isCheckingWhitelist}
              <span class="loading loading-spinner" aria-hidden="true"></span>
              <span>Validating key...</span>
            {:else if isCheckingWhitelist && isRestoring}
              <span class="loading loading-spinner" aria-hidden="true"></span>
              <span>Checking approval status...</span>
            {:else}
              Log In with Private Key
            {/if}
          </button>
        </div>
      </details>

      <!-- Error display -->
      {#if validationError || $authStore.error}
        <div class="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{validationError || $authStore.error}</span>
        </div>
      {/if}

      <div class="divider">OR</div>

      <button
        class="btn btn-ghost btn-sm"
        on:click={() => dispatch('signup')}
      >
        Create an account
      </button>
    </div>
  </div>
</div>

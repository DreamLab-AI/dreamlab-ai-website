<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { nip19 } from 'nostr-tools';
  import { bytesToHex } from '@noble/hashes/utils';
  import { authStore } from '$lib/stores/auth';
  import { getAppConfig } from '$lib/config/loader';
  import WelcomeModal from '$lib/components/ui/WelcomeModal.svelte';

  const appConfig = getAppConfig();
  const appName = appConfig.name.split(' - ')[0];

  const dispatch = createEventDispatcher<{ next: { publicKey: string } }>();

  type Step = 'idle' | 'registering' | 'download' | 'done';

  let step: Step = 'idle';
  let displayName = '';
  let publicKey = '';   // hex pubkey from registration result
  let prfUnsupported = false;

  $: npub = publicKey ? nip19.npubEncode(publicKey) : '';
  $: npubShort = npub ? npub.slice(0, 12) + '...' + npub.slice(-6) : '';

  async function handleCreateAccount() {
    if (!displayName.trim()) {
      displayName = 'New User';
    }
    step = 'registering';
    authStore.clearError();
    prfUnsupported = false;

    try {
      const result = await authStore.registerWithPasskey(displayName.trim());
      publicKey = result.pubkey;
      step = 'download';
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Registration failed';
      if (msg.toLowerCase().includes('prf')) {
        prfUnsupported = true;
      }
      authStore.setError(msg);
      step = 'idle';
    }
  }

  async function handleCreateLocalAccount() {
    if (!displayName.trim()) {
      displayName = 'New User';
    }
    step = 'registering';
    authStore.clearError();
    prfUnsupported = false;

    try {
      const result = await authStore.registerWithLocalKey(displayName.trim());
      publicKey = result.pubkey;
      step = 'download';
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Registration failed';
      authStore.setError(msg);
      step = 'idle';
    }
  }

  function downloadPrivkey() {
    const privkeyBytes = authStore.getPrivkey();
    if (!privkeyBytes) return;

    const privkeyHex = bytesToHex(privkeyBytes);
    const nsec = nip19.nsecEncode(privkeyBytes);
    const content = `DreamLab Community - Identity Backup
Public key: ${npub}
Public key (hex): ${publicKey}
Private key: ${nsec}
Private key (hex): ${privkeyHex}
Generated: ${new Date().toISOString()}
KEEP THIS FILE SECURE. Never share the private key.
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dreamlab-${npubShort.replace(/\.\./g, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleProceed() {
    authStore.confirmNsecBackup();
    dispatch('next', { publicKey });
  }
</script>

<WelcomeModal />

<div class="flex flex-col items-center justify-center min-h-screen p-4 bg-base-200 gradient-mesh">
  <div class="card w-full max-w-md bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title text-2xl justify-center mb-4">Welcome to {appName}</h2>

      {#if step === 'idle'}
        <div class="alert alert-info mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-sm">Your private key is derived from your passkey — no password needed</span>
        </div>

        {#if prfUnsupported}
          <div class="alert alert-warning mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div class="text-sm">
              <p class="font-bold">Passkey PRF not supported</p>
              <p>
                Your browser or authenticator does not support the PRF extension required for passkey-based accounts.
                Try <strong>Create account with local key</strong> below, or use an existing account on the login page.
              </p>
            </div>
          </div>
        {/if}

        {#if $authStore.error && !prfUnsupported}
          <div class="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{$authStore.error}</span>
          </div>
        {/if}

        <div class="form-control mb-4">
          <label class="label" for="display-name-input">
            <span class="label-text font-medium">Display name</span>
            <span class="label-text-alt text-base-content/50">shown publicly</span>
          </label>
          <input
            id="display-name-input"
            type="text"
            class="input input-bordered"
            placeholder="e.g. Alice"
            bind:value={displayName}
            maxlength="50"
            on:keydown={(e) => e.key === 'Enter' && handleCreateAccount()}
          />
        </div>

        <div class="card-actions justify-center mt-2">
          <button
            class="btn btn-primary btn-lg w-full gap-2"
            on:click={handleCreateAccount}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
            </svg>
            Create account with passkey
          </button>
        </div>

        <div class="divider">OR</div>

        <div class="card-actions justify-center">
          <button
            class="btn btn-outline btn-warning w-full gap-2"
            on:click={handleCreateLocalAccount}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Create account with local key
          </button>
          <p class="text-xs text-base-content/50 mt-1 text-center">
            Generates a standard key pair. Your private key will be cached in this browser.
          </p>
        </div>

        <div class="mt-4 text-center">
          <button
            class="btn btn-ghost btn-sm"
            on:click={() => dispatch('next', { publicKey: '' })}
          >
            Already have an account?
          </button>
        </div>

      {:else if step === 'registering'}
        <div class="flex flex-col items-center gap-4 py-6">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="text-center text-base-content/70">Creating your cryptographic identity...</p>
        </div>

      {:else if step === 'download'}
        <div class="alert alert-warning mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div class="text-sm">
            <p class="font-bold">Save your backup key</p>
            <p>You'll need it if you lose access to your passkey. This download is only available now.</p>
          </div>
        </div>

        <div class="bg-base-200 rounded-lg p-4 mb-4">
          <p class="text-xs text-base-content/60 mb-1">Your public key</p>
          <p class="font-mono text-xs break-all">{npub}</p>
        </div>

        <div class="card-actions flex-col gap-3 mt-2">
          <button
            class="btn btn-warning w-full gap-2"
            on:click={downloadPrivkey}
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download private key
          </button>

          <button
            class="btn btn-primary w-full"
            on:click={handleProceed}
          >
            I've saved my key →
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

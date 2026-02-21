<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { nip19 } from 'nostr-tools';
  import { bytesToHex } from '@noble/hashes/utils';
  import { authStore } from '$lib/stores/auth';

  export let publicKey: string; // hex

  const dispatch = createEventDispatcher<{ continue: void }>();

  $: npub = publicKey ? nip19.npubEncode(publicKey) : '';
  $: npubShort = npub ? npub.slice(0, 8) + '...' + npub.slice(-6) : '';

  function downloadBackup() {
    if (!browser) return;
    const privkeyBytes = authStore.getPrivkey();
    if (!privkeyBytes) return;

    const privkeyHex = bytesToHex(privkeyBytes);
    const nsec = nip19.nsecEncode(privkeyBytes);

    const content = `DreamLab Community - Nostr Identity Backup
Public key (npub): ${npub}
Public key (hex): ${publicKey}
Private key (nsec): ${nsec}
Private key (hex): ${privkeyHex}
Generated: ${new Date().toISOString()}
KEEP THIS FILE SECURE. Never share the private key.
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dreamlab-backup-${npubShort.replace(/\.\./g, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleContinue() {
    authStore.confirmNsecBackup();
    dispatch('continue');
  }
</script>

<div class="flex flex-col items-center justify-center min-h-screen p-4 bg-base-200">
  <div class="card w-full max-w-lg bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title text-2xl justify-center mb-4">Store this backup securely</h2>

      <!-- Warning card -->
      <div class="alert bg-warning/10 border-2 border-warning mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-warning shrink-0 h-8 w-8" fill="none" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div class="text-sm">
          <p class="font-bold mb-1">One-time backup opportunity</p>
          <p>Your Nostr private key is derived from your passkey. This download is the only copy. If you lose your passkey AND this file, you cannot recover your account.</p>
        </div>
      </div>

      <!-- Public key display -->
      <div class="bg-base-200 rounded-lg p-4 mb-6">
        <p class="text-xs text-base-content/60 mb-1 font-medium">Your public key (npub)</p>
        <p class="font-mono text-xs break-all">{npub}</p>
      </div>

      <!-- Actions -->
      <div class="card-actions flex-col gap-3">
        <button
          class="btn btn-warning w-full gap-2"
          on:click={downloadBackup}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download backup key
        </button>

        <button
          class="btn btn-primary w-full"
          on:click={handleContinue}
        >
          I've saved my backup, continue →
        </button>
      </div>
    </div>
  </div>
</div>

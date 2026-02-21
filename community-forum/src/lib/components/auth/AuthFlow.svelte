<script lang="ts">
  /**
   * AuthFlow - Multi-step authentication flow for signup and login
   *
   * Flow steps:
   * Signup: PasskeySignup → (download inline in Signup) → NicknameSetup → PendingApproval
   * Login:  PasskeyLogin | NIP-07 | nsec (advanced) → chat
   */
  import { createEventDispatcher } from 'svelte';
  import { authStore } from '$lib/stores/auth';
  import Signup from './Signup.svelte';
  import NicknameSetup from './NicknameSetup.svelte';
  import Login from './Login.svelte';
  import PendingApproval from './PendingApproval.svelte';

  export let initialStep: 'signup' | 'login' = 'signup';

  type FlowStep = 'signup' | 'nickname' | 'login' | 'pending-approval';

  let currentStep: FlowStep = initialStep;
  let currentPublicKey = '';

  const dispatch = createEventDispatcher<{ complete: { publicKey: string } }>();

  function handleSignupNext(event: CustomEvent<{ publicKey: string }>) {
    const { publicKey } = event.detail;

    if (publicKey) {
      currentPublicKey = publicKey;
      currentStep = 'nickname';
    } else {
      // Empty publicKey signals "already have an account" — go to login
      currentStep = 'login';
    }
  }

  async function handleNicknameContinue() {
    if (!currentPublicKey) return;

    try {
      const { checkWhitelistStatus } = await import('$lib/nostr/whitelist');
      const status = await checkWhitelistStatus(currentPublicKey);
      if (status.isApproved || status.isAdmin) {
        dispatch('complete', { publicKey: currentPublicKey });
        return;
      }
    } catch (e) {
      console.warn('[AuthFlow] Failed to check whitelist status:', e);
    }

    authStore.setPending(true);
    currentStep = 'pending-approval';
  }

  async function handleLoginSuccess(event: CustomEvent<{ publicKey: string }>) {
    const { publicKey } = event.detail;

    if (publicKey) {
      currentPublicKey = publicKey;

      try {
        const { checkWhitelistStatus } = await import('$lib/nostr/whitelist');
        const status = await checkWhitelistStatus(publicKey);
        if (status.isApproved || status.isAdmin) {
          dispatch('complete', { publicKey });
          return;
        }
      } catch (e) {
        console.warn('[AuthFlow] Failed to check whitelist status:', e);
      }

      currentStep = 'pending-approval';
    } else {
      currentStep = 'signup';
    }
  }

  function handleLoginPending(event: CustomEvent<{ publicKey: string }>) {
    const { publicKey } = event.detail;
    currentPublicKey = publicKey;
    authStore.setPending(true);
    currentStep = 'pending-approval';
  }

  async function handleApproved() {
    authStore.setPending(false);
    dispatch('complete', { publicKey: currentPublicKey });
  }
</script>

{#if currentStep === 'signup'}
  <Signup on:next={handleSignupNext} />
{:else if currentStep === 'nickname' && currentPublicKey}
  <NicknameSetup
    publicKey={currentPublicKey}
    on:continue={handleNicknameContinue}
  />
{:else if currentStep === 'login'}
  <Login
    on:success={handleLoginSuccess}
    on:pending={handleLoginPending}
    on:signup={() => { currentStep = 'signup'; }}
  />
{:else if currentStep === 'pending-approval' && currentPublicKey}
  <PendingApproval publicKey={currentPublicKey} on:approved={handleApproved} />
{/if}

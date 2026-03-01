<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { authStore } from '$lib/stores/auth';
  import { dmStore, sortedConversations } from '$lib/stores/dm';
  import { hexToBytes } from '@noble/hashes/utils.js';
  import { getAppConfig } from '$lib/config/loader';
  import NewDMDialog from '$lib/components/dm/NewDMDialog.svelte';

  const appConfig = getAppConfig();

  /** Timeout (ms) before we stop showing the spinner and show empty state */
  const LOAD_TIMEOUT_MS = 8000;

  $: conversations = $sortedConversations;
  $: loading = $dmStore.isLoading;
  $: error = $dmStore.error;

  let unsubscribe: (() => void) | null = null;
  let loadTimer: ReturnType<typeof setTimeout> | null = null;
  let showNewDMDialog = false;

  onMount(async () => {
    // Wait for auth store to be ready before checking authentication
    await authStore.waitForReady();

    if (!$authStore.isAuthenticated || !$authStore.privateKey) {
      goto(`${base}/`);
      return;
    }

    // Safety timeout: if fetchConversations hangs, force loading to false
    loadTimer = setTimeout(() => {
      if ($dmStore.isLoading) {
        dmStore.clearError();
        // Force the store out of loading state
        dmStore.forceLoadingComplete();
      }
    }, LOAD_TIMEOUT_MS);

    // Load DM conversations from relay
    try {
      const privkeyBytes = hexToBytes($authStore.privateKey);

      // Dummy relay object - actual relay calls happen via NDK inside dmStore
      const dummyRelay = {
        publish: async () => {}
      };

      await dmStore.fetchConversations(dummyRelay, privkeyBytes);

      // Subscribe to real-time DMs
      unsubscribe = await dmStore.subscribeToIncoming(privkeyBytes);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (loadTimer) {
        clearTimeout(loadTimer);
        loadTimer = null;
      }
    }
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    if (loadTimer) {
      clearTimeout(loadTimer);
    }
  });

  function handleNewDMStart(event: CustomEvent<{ pubkey: string }>) {
    goto(`${base}/dm/${event.detail.pubkey}`);
  }

  function formatPubkey(pubkey: string): string {
    return pubkey.slice(0, 12) + '...' + pubkey.slice(-8);
  }

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }

  function openConversation(pubkey: string) {
    goto(`${base}/dm/${pubkey}`);
  }
</script>

<svelte:head>
  <title>Direct Messages - {appConfig.name}</title>
</svelte:head>

<div class="container mx-auto p-4 max-w-2xl">
  <div class="flex items-start justify-between mb-6">
    <div>
      <h1 class="text-4xl font-bold gradient-text mb-2">Direct Messages</h1>
      <p class="text-base-content/70">Private encrypted conversations</p>
    </div>
    <button
      class="btn btn-primary gap-2"
      on:click={() => (showNewDMDialog = true)}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      New Message
    </button>
  </div>

  {#if error}
    <div class="alert alert-error mb-4">
      <span>{error}</span>
      <button class="btn btn-sm" on:click={() => dmStore.clearError()}>Dismiss</button>
    </div>
  {/if}

  {#if loading}
    <div class="flex flex-col justify-center items-center min-h-[400px] gap-3">
      <div class="loading loading-spinner loading-lg text-primary"></div>
      <p class="text-sm text-base-content/50">Loading conversations...</p>
    </div>
  {:else if conversations.length === 0}
    <div class="card bg-base-200">
      <div class="card-body items-center text-center py-16">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16 text-base-content/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <h3 class="text-lg font-semibold text-base-content mb-2">No conversations yet</h3>
        <p class="text-base-content/60 mb-6 max-w-sm">
          Start a private, encrypted conversation by sending a message to someone using their public ID.
        </p>
        <button
          class="btn btn-primary gap-2"
          on:click={() => (showNewDMDialog = true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Start a Conversation
        </button>
      </div>
    </div>
  {:else}
    <div class="space-y-2">
      {#each conversations as conv (conv.pubkey)}
        <button
          class="card bg-base-200 hover:bg-base-300 transition-base cursor-pointer w-full text-left"
          on:click={() => openConversation(conv.pubkey)}
        >
          <div class="card-body p-4">
            <div class="flex items-center gap-3">
              <div class="avatar placeholder">
                <div class="bg-primary text-primary-content rounded-full w-12">
                  <span class="text-xl">{conv.name.charAt(0).toUpperCase()}</span>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start mb-1">
                  <h3 class="font-semibold">{conv.name}</h3>
                  <span class="text-xs text-base-content/60">
                    {formatTime(conv.lastMessageTimestamp)}
                  </span>
                </div>
                <p class="text-sm text-base-content/70 truncate">
                  {conv.lastMessage}
                </p>
              </div>
              {#if conv.unreadCount > 0}
                <div class="badge badge-primary badge-sm">{conv.unreadCount}</div>
              {/if}
            </div>
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<NewDMDialog
  bind:open={showNewDMDialog}
  on:start={handleNewDMStart}
/>

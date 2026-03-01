<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth';
  import { userPermissionsStore } from '$lib/stores/userPermissions';
  import { whitelistStatusStore, isAdminVerified } from '$lib/stores/user';
  import { get } from 'svelte/store';
  import { ensureRelayConnected, isConnected, connectionState, ConnectionState } from '$lib/nostr/relay';
  import { fetchChannels, type CreatedChannel } from '$lib/nostr/channels';
  import { getSection, getSections } from '$lib/config';
  import { canCreateChannel } from '$lib/config/permissions';

  // Forum components
  import BoardStats from '$lib/components/forum/BoardStats.svelte';
  import TopPosters from '$lib/components/forum/TopPosters.svelte';
  import WelcomeBack from '$lib/components/forum/WelcomeBack.svelte';
  import TodaysActivity from '$lib/components/forum/TodaysActivity.svelte';
  import ChannelCard from '$lib/components/forum/ChannelCard.svelte';
  import MarkAllRead from '$lib/components/forum/MarkAllRead.svelte';
  import ModeratorTeam from '$lib/components/forum/ModeratorTeam.svelte';

  // UI components
  import { SkeletonLoader, EmptyState } from '$lib/components/ui';

  // Semantic search
  import { SemanticSearch } from '$lib/semantic';
  import { getAppConfig } from '$lib/config/loader';

  const appConfig = getAppConfig();

  let allChannels: CreatedChannel[] = [];
  let loading = true;
  let error: string | null = null;
  let showSearch = false;
  let retryCount = 0;
  let retrying = false;
  const MAX_RETRIES = 3;
  const LOADING_TIMEOUT_MS = 6000;
  let loadingTimer: ReturnType<typeof setTimeout> | null = null;

  // Get active section from URL query params
  $: activeSection = $page.url.searchParams.get('section');
  $: sectionConfig = activeSection ? getSection(activeSection) : null;

  // Filter channels by active section
  $: channels = activeSection
    ? allChannels.filter(c => c.section === activeSection)
    : allChannels;

  // Dynamic title based on section
  $: pageTitle = sectionConfig ? sectionConfig.name : 'Channels';
  $: pageDescription = sectionConfig
    ? sectionConfig.description
    : 'Join conversations in public channels';

  // Check if user can create channels in any section
  $: canCreateInAnySection = (() => {
    const perms = $userPermissionsStore;
    if (!perms) return false;
    return getSections().some(s => canCreateChannel(perms, s.id));
  })();

  // Connection status for UI feedback
  $: connState = $connectionState;
  $: isConnectionError = connState.state === ConnectionState.Error ||
                         connState.state === ConnectionState.AuthFailed;

  async function handleSearchSelect(noteId: string) {
    // Search for the message in channels and navigate to it
    showSearch = false;

    // Find which channel contains this message by checking channel messages
    for (const channel of channels) {
      // Navigate to channel - the channel page will handle scrolling to the message
      // if the noteId is passed as a query parameter
      if (channel.id) {
        goto(`${base}/chat/${channel.id}?highlight=${noteId}`);
        return;
      }
    }

    // Fallback: log if message not found in any loaded channel
    console.warn('Message not found in loaded channels:', noteId);
  }

  async function loadChannels() {
    try {
      // Connect to relay with authentication (NIP-07 or private key)
      await ensureRelayConnected($authStore);

      // Get user's cohorts from whitelist for channel filtering
      const whitelistStatus = get(whitelistStatusStore);
      const userCohorts = whitelistStatus?.cohorts ?? [];
      const isAdmin = whitelistStatus?.isAdmin ?? false;

      // Fetch NIP-28 channels (kind 40) with cohort filtering
      allChannels = await fetchChannels({
        userCohorts,
        userPubkey: $authStore.publicKey ?? undefined,
        isAdmin
      });

      // Clear any previous error on success
      error = null;
      retryCount = 0;
    } catch (e) {
      console.error('Failed to load channels:', e);
      error = e instanceof Error ? e.message : 'Failed to load channels';

      // Show user-friendly error messages
      if (error.includes('timeout') || error.includes('Timeout')) {
        error = 'Connection timed out. The server may be temporarily unavailable.';
      } else if (error.includes('Invalid private key')) {
        error = 'Authentication failed. Please try logging out and back in.';
      }
    } finally {
      // Always clear loading state so the UI transitions from skeleton to
      // either channels, empty state, or error — never stuck on shimmer.
      loading = false;
      clearLoadingTimer();
    }
  }

  function startLoadingTimer() {
    clearLoadingTimer();
    loadingTimer = setTimeout(() => {
      if (loading) {
        loading = false;
      }
    }, LOADING_TIMEOUT_MS);
  }

  function clearLoadingTimer() {
    if (loadingTimer) {
      clearTimeout(loadingTimer);
      loadingTimer = null;
    }
  }

  async function retryConnection() {
    if (retrying || retryCount >= MAX_RETRIES) return;

    retrying = true;
    retryCount++;
    error = null;

    try {
      await loadChannels();
    } finally {
      retrying = false;
    }
  }

  onMount(async () => {
    // Wait for auth store to be ready before checking authentication
    await authStore.waitForReady();

    if (!$authStore.isAuthenticated || !$authStore.publicKey) {
      goto(`${base}/`);
      return;
    }

    // Open registration: no pending approval check needed
    // Users get minimoonoir welcome level access by default

    // Start a safety timer so shimmer never persists indefinitely.
    // loadChannels() clears loading in its finally block, but if it
    // hangs (e.g. fetchEvents never resolves), the timer ensures the
    // UI transitions to empty state after LOADING_TIMEOUT_MS.
    startLoadingTimer();
    await loadChannels();
  });

  onDestroy(() => {
    clearLoadingTimer();
  });

  function formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString();
  }
</script>

<svelte:head>
  <title>{pageTitle} - {appConfig.name}</title>
</svelte:head>

<div class="container mx-auto p-4 max-w-6xl">
  <!-- Welcome Back Banner -->
  <div class="mb-4">
    <WelcomeBack />
  </div>

  <div class="flex flex-col lg:flex-row gap-6">
    <!-- Main Content -->
    <div class="flex-1">
      <div class="mb-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-4xl font-bold gradient-text mb-2">{pageTitle}</h1>
            <p class="text-base-content/70">{pageDescription}</p>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="btn btn-ghost btn-sm"
              on:click={() => showSearch = !showSearch}
              title="Semantic Search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span class="hidden sm:inline">Search</span>
            </button>
            <MarkAllRead />
          </div>
        </div>
      </div>

      <!-- Semantic Search Panel -->
      {#if showSearch}
        <div class="card bg-base-200 shadow-lg mb-6">
          <div class="card-body p-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-lg font-semibold">Semantic Search</h3>
              <button class="btn btn-ghost btn-sm btn-circle" on:click={() => showSearch = false}>
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p class="text-sm text-base-content/70 mb-3">
              Search by meaning, not just keywords. Find messages that are semantically similar to your query.
            </p>
            <SemanticSearch onSelect={handleSearchSelect} placeholder="Search messages by meaning..." />
          </div>
        </div>
      {/if}

      {#if loading}
        <div class="space-y-3">
          <SkeletonLoader variant="channel" count={5} />
        </div>
      {:else if error}
        <div class="card bg-base-200 shadow-lg">
          <div class="card-body text-center py-8">
            <div class="text-6xl mb-4">
              {#if error.includes('timed out') || error.includes('unavailable')}
                <span class="opacity-50">&#128268;</span>
              {:else if error.includes('Authentication')}
                <span class="opacity-50">&#128274;</span>
              {:else}
                <span class="opacity-50">&#9888;&#65039;</span>
              {/if}
            </div>
            <h3 class="text-lg font-semibold text-error mb-2">Connection Issue</h3>
            <p class="text-base-content/70 mb-4 max-w-md mx-auto">{error}</p>
            <div class="flex flex-col sm:flex-row gap-2 justify-center">
              {#if retryCount < MAX_RETRIES}
                <button
                  class="btn btn-primary btn-sm"
                  on:click={retryConnection}
                  disabled={retrying}
                >
                  {#if retrying}
                    <span class="loading loading-spinner loading-xs"></span>
                    Retrying...
                  {:else}
                    Retry Connection
                  {/if}
                </button>
              {:else}
                <p class="text-sm text-base-content/65">Max retries reached. Please refresh the page.</p>
              {/if}
              <a href="{base}/" class="btn btn-ghost btn-sm">Back to Home</a>
            </div>
            {#if retryCount > 0}
              <p class="text-xs text-base-content/60 mt-2">Retry attempt {retryCount} of {MAX_RETRIES}</p>
            {/if}
          </div>
        </div>
      {:else if channels.length === 0}
        <div class="text-center">
          <EmptyState
            icon="💬"
            title={activeSection ? `No channels in ${pageTitle}` : "No channels yet"}
            description={activeSection
              ? "This section doesn't have any channels yet. Check back later or browse all channels."
              : "Channels are where conversations happen. Browse existing channels or ask an admin to create one."}
          />
          <div class="flex flex-wrap gap-2 justify-center mt-2">
            {#if activeSection}
              <a href="{base}/chat" class="btn btn-primary btn-sm">View All Channels</a>
            {/if}
            {#if canCreateInAnySection}
              <a href="{base}/admin" class="btn btn-primary btn-sm gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Create Channel
              </a>
            {/if}
          </div>
        </div>
      {:else}
        <div class="space-y-3">
          {#each channels as channel (channel.id)}
            <ChannelCard {channel} />
          {/each}
        </div>
      {/if}
    </div>

    <!-- Sidebar -->
    <div class="hidden lg:block lg:w-80 space-y-4">
      <BoardStats />
      <TodaysActivity />
      <TopPosters />
      <ModeratorTeam />
    </div>
  </div>
</div>

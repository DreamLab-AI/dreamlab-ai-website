<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth';
  import { userPermissionsStore, permissionsReady, waitForPermissions } from '$lib/stores/userPermissions';
  import { ndk, ensureRelayConnected, isConnected } from '$lib/nostr/relay';
  import { getSectionWithCategory, getBreadcrumbs } from '$lib/config';
  import { canCreateChannel, canAccessSection } from '$lib/config/permissions';
  import { createChannel } from '$lib/nostr/channels';
  import Breadcrumb from '$lib/components/navigation/Breadcrumb.svelte';
  import ChannelCard from '$lib/components/forum/ChannelCard.svelte';
  import ZoneHero from '$lib/components/zones/ZoneHero.svelte';
  import type { NDKFilter, NDKEvent } from '@nostr-dev-kit/ndk';
  import { getAppConfig } from '$lib/config/loader';

  const appConfig = getAppConfig();

  interface Forum {
    id: string;
    name: string;
    about: string;
    picture?: string;
    createdAt: number;
    pubkey: string;
  }

  let loading = true;
  let error: string | null = null;
  let forums: Forum[] = [];
  let ready = false;
  let loadedSectionId: string | null = null;

  // Create forum modal state
  let showCreateModal = false;
  let newForumName = '';
  let newForumDescription = '';
  let creating = false;

  $: categoryId = $page.params.category;
  $: sectionId = $page.params.section;
  $: sectionInfo = getSectionWithCategory(sectionId);
  $: section = sectionInfo?.section;
  $: category = sectionInfo?.category;
  $: breadcrumbs = section && category ? getBreadcrumbs(categoryId, sectionId) : [];
  $: permissions = $userPermissionsStore;
  $: hasAccess = ($permissionsReady && permissions) ? canAccessSection(permissions, sectionId) : true;

  // Check if current user can create forums in this section
  $: canCreate = ($permissionsReady && $userPermissionsStore)
    ? canCreateChannel($userPermissionsStore, sectionId)
    : false;

  // Reload forums when section changes via client-side navigation
  $: if (ready && sectionId && sectionId !== loadedSectionId) {
    reloadSection(sectionId);
  }

  async function reloadSection(sid: string) {
    loading = true;
    error = null;
    forums = [];
    const info = getSectionWithCategory(sid);
    if (!info?.section || !info?.category) {
      error = `Section "${sid}" not found`;
      loading = false;
      return;
    }
    if (info.category.id !== categoryId) {
      error = `Section "${sid}" is not in category "${categoryId}"`;
      loading = false;
      return;
    }
    try {
      await loadForums(sid);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load forums';
    } finally {
      loadedSectionId = sid;
      loading = false;
    }
  }

  async function loadForums(sid?: string) {
    const ndkInstance = ndk();
    if (!ndkInstance) return;

    const targetSection = sid || sectionId;

    try {
      const filter: NDKFilter = {
        kinds: [40],
        '#section': [targetSection],
        limit: 50
      };

      const events = await ndkInstance.fetchEvents(filter);

      forums = Array.from(events).map((event: NDKEvent) => {
        let metadata = { name: 'Unnamed Forum', about: '', picture: '' };
        try {
          metadata = JSON.parse(event.content);
        } catch {}

        return {
          id: event.id,
          name: metadata.name || 'Unnamed Forum',
          about: metadata.about || '',
          picture: metadata.picture,
          createdAt: event.created_at ?? 0,
          pubkey: event.pubkey
        };
      });

      forums.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error('Failed to load forums:', e);
      error = e instanceof Error ? e.message : 'Failed to load forums';
    }
  }

  async function handleCreateForum() {
    if (!newForumName.trim()) return;
    creating = true;
    try {
      const channel = await createChannel({
        name: newForumName.trim(),
        description: newForumDescription.trim(),
        section: sectionId,
        visibility: 'public'
      });
      // Reload forums to show the new one
      await loadForums();
      showCreateModal = false;
      newForumName = '';
      newForumDescription = '';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to create forum';
    } finally {
      creating = false;
    }
  }

  onMount(async () => {
    await authStore.waitForReady();

    if (!$authStore.isAuthenticated || !$authStore.publicKey) {
      goto(`${base}/`);
      return;
    }

    if (!section || !category) {
      error = `Section "${sectionId}" not found`;
      loading = false;
      return;
    }

    if (category.id !== categoryId) {
      error = `Section "${sectionId}" is not in category "${categoryId}"`;
      loading = false;
      return;
    }

    const perms = await waitForPermissions();
    if (perms && !canAccessSection(perms, sectionId)) {
      error = 'You do not have access to this section';
      loading = false;
      return;
    }

    try {
      await ensureRelayConnected($authStore);
      await loadForums();
      loadedSectionId = sectionId;
    } catch (e) {
      console.error('Failed to connect:', e);
      error = e instanceof Error ? e.message : 'Connection failed';
    } finally {
      ready = true;
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>{section?.name ?? 'Section'} - {appConfig.name}</title>
</svelte:head>

<div class="container mx-auto p-4 max-w-6xl">
  {#if loading}
    <div class="flex justify-center items-center min-h-[400px]">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>
  {:else if error}
    <div class="alert alert-error">
      <span>{error}</span>
      <a href="{base}/{categoryId}" class="btn btn-sm btn-ghost">Back to Category</a>
    </div>
  {:else if section && category}
    <Breadcrumb items={breadcrumbs} />

    <div class="mt-6">
      <!-- Compact Zone Hero -->
      <ZoneHero {category} compact={true} />

      <div class="flex items-start justify-between gap-4 mb-6">
        <div class="flex items-center gap-4">
          <div class="text-4xl">{section.icon}</div>
          <div>
            <h2 class="text-2xl font-bold">{section.name}</h2>
            <p class="text-base-content/70 mt-1">{section.description}</p>
          </div>
        </div>

        <div class="flex gap-2">
          {#if section.calendar?.access !== 'none'}
            <a href="{base}/{categoryId}/{sectionId}/calendar" class="btn btn-outline btn-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendar
            </a>
          {/if}
          {#if canCreate}
            <button class="btn btn-primary" on:click={() => showCreateModal = true}>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              New Forum
            </button>
          {/if}
        </div>
      </div>

      <div class="divider"></div>

      {#if forums.length === 0}
        <div class="card bg-base-200">
          <div class="card-body text-center">
            <p class="text-base-content/70">No forums in this section yet.</p>
            {#if canCreate}
              <p class="text-sm text-base-content/50 mt-2">Be the first to create one!</p>
            {/if}
          </div>
        </div>
      {:else}
        <div class="space-y-3">
          {#each forums as forum (forum.id)}
            <a
              href="{base}/{categoryId}/{sectionId}/{forum.id}"
              class="card bg-base-100 shadow hover:shadow-md transition-shadow cursor-pointer block"
            >
              <div class="card-body p-4">
                <div class="flex items-center gap-3">
                  {#if forum.picture}
                    <img src={forum.picture} alt="" class="w-12 h-12 rounded-lg object-cover" />
                  {:else}
                    <div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                      </svg>
                    </div>
                  {/if}
                  <div class="flex-1">
                    <h3 class="font-bold">{forum.name}</h3>
                    {#if forum.about}
                      <p class="text-sm text-base-content/70 line-clamp-1">{forum.about}</p>
                    {/if}
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-base-content/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </a>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Create Forum Modal -->
{#if showCreateModal}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Create New Forum</h3>
      <p class="text-sm text-base-content/60 mt-1">in {section?.name ?? sectionId}</p>
      <div class="form-control mt-4">
        <label class="label" for="forum-name">
          <span class="label-text">Forum Name</span>
        </label>
        <input
          id="forum-name"
          type="text"
          placeholder="e.g. Weekly Discussion"
          class="input input-bordered"
          bind:value={newForumName}
          disabled={creating}
        />
      </div>
      <div class="form-control mt-2">
        <label class="label" for="forum-desc">
          <span class="label-text">Description (optional)</span>
        </label>
        <textarea
          id="forum-desc"
          placeholder="What is this forum about?"
          class="textarea textarea-bordered"
          bind:value={newForumDescription}
          disabled={creating}
        ></textarea>
      </div>
      <div class="modal-action">
        <button class="btn btn-ghost" on:click={() => showCreateModal = false} disabled={creating}>Cancel</button>
        <button
          class="btn btn-primary"
          on:click={handleCreateForum}
          disabled={creating || !newForumName.trim()}
        >
          {#if creating}
            <span class="loading loading-spinner loading-sm"></span>
          {/if}
          Create
        </button>
      </div>
    </div>
    <div class="modal-backdrop" on:click={() => showCreateModal = false} on:keydown></div>
  </div>
{/if}

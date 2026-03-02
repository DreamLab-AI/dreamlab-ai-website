<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { authStore } from '$lib/stores/auth';
  import { userPermissionsStore, permissionsReady, waitForPermissions } from '$lib/stores/userPermissions';
  import { getCategory, getBreadcrumbs } from '$lib/config';
  import { canAccessSection, canAccessCategory } from '$lib/config/permissions';
  import Breadcrumb from '$lib/components/navigation/Breadcrumb.svelte';
  import SectionListCard from '$lib/components/navigation/SectionListCard.svelte';
  import ZoneHero from '$lib/components/zones/ZoneHero.svelte';
  import type { SectionConfig } from '$lib/config/types';
  import { getAppConfig } from '$lib/config/loader';

  const appConfig = getAppConfig();

  let loading = true;
  let error: string | null = null;

  $: categoryId = $page.params.category;
  $: category = getCategory(categoryId);
  $: breadcrumbs = category ? getBreadcrumbs(categoryId) : [];
  $: sections = category?.sections ?? [];
  $: permissions = $userPermissionsStore;
  $: canViewCategory = ($permissionsReady && permissions) ? canAccessCategory(permissions, categoryId) : true;

  function getSectionAccessStatus(section: SectionConfig): 'approved' | 'pending' | 'none' {
    if (!$permissionsReady || !permissions) return 'approved'; // optimistic while loading
    if (canAccessSection(permissions, section.id)) return 'approved';
    if (!section.access?.requiresApproval) return 'approved';
    return 'none';
  }

  onMount(async () => {
    await authStore.waitForReady();

    if (!$authStore.isAuthenticated || !$authStore.publicKey) {
      goto(`${base}/`);
      return;
    }

    if (!category) {
      error = `Category "${categoryId}" not found`;
    }

    // Wait for whitelist verification before rendering access decisions
    await waitForPermissions();

    loading = false;
  });
</script>

<svelte:head>
  <title>{category?.name ?? 'Category'} - {appConfig.name}</title>
</svelte:head>

<div class="container mx-auto p-4 max-w-6xl">
  {#if loading}
    <div class="flex justify-center items-center min-h-[400px]">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>
  {:else if error}
    <div class="alert alert-error">
      <span>{error}</span>
      <a href="{base}/chat" class="btn btn-sm btn-ghost">Go to Channels</a>
    </div>
  {:else if !canViewCategory}
    <div class="alert alert-warning">
      <span>You do not have access to this category.</span>
      <a href="{base}/forums" class="btn btn-sm btn-ghost">Back to Forums</a>
    </div>
  {:else if category}
    <Breadcrumb items={breadcrumbs} />

    <div class="mt-6">
      <!-- Zone Hero with branding -->
      <ZoneHero {category} />

      <div class="divider"></div>

      {#if sections.length === 0}
        <div class="card bg-base-200">
          <div class="card-body text-center">
            <p class="text-base-content/70">No sections in this category yet.</p>
          </div>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each sections as section (section.id)}
            <SectionListCard
              {section}
              {categoryId}
              accessStatus={getSectionAccessStatus(section)}
            />
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

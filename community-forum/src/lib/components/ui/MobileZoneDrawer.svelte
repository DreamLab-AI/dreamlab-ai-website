<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { getCategories } from '$lib/config';
	import { userStore, whitelistStatusStore } from '$lib/stores/user';
	import { fade, fly } from 'svelte/transition';
	import type { CategoryConfig } from '$lib/config/types';

	export let isOpen = false;
	export let onClose: () => void;

	$: categories = getCategories();
	$: userCohorts = $whitelistStatusStore?.cohorts ?? $userStore.profile?.cohorts ?? [];
	$: isAdmin = $whitelistStatusStore?.isAdmin ?? $userStore.profile?.isAdmin ?? false;
	$: isApproved = $whitelistStatusStore?.isWhitelisted ?? $userStore.profile?.isApproved ?? false;

	// Extract current category/section from URL (with null safety)
	$: pathname = $page?.url?.pathname ?? '';
	$: pathParts = pathname ? pathname.replace(base || '', '').split('/').filter(Boolean) : [];
	$: currentCategoryId = pathParts[0] || null;
	$: currentSectionId = pathParts[1] || null;

	function hasZoneAccess(cat: CategoryConfig): boolean {
		if (isAdmin) return true;
		if (!isApproved) return false;

		const visibleTo = cat.access?.visibleToCohorts || [];
		const hiddenFrom = cat.access?.hiddenFromCohorts || [];

		if (visibleTo.length === 0 && hiddenFrom.length === 0) return true;

		const userCohortStrings = userCohorts as string[];
		if (hiddenFrom.some(c => userCohortStrings.includes(c))) return false;

		if (visibleTo.length === 0) return true;
		return visibleTo.some(c => userCohortStrings.includes(c) || c === 'cross-access');
	}

	function getCategoryColor(cat: CategoryConfig): string {
		return cat.branding?.primaryColor || cat.ui?.color || '#6366f1';
	}

	function handleNavClick() {
		onClose();
	}

	function handleBackdropClick() {
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/50 z-50 md:hidden"
		transition:fade={{ duration: 200 }}
		on:click={handleBackdropClick}
		on:keydown={(e) => e.key === 'Enter' && handleBackdropClick()}
		role="button"
		tabindex="0"
		aria-label="Close zones drawer"
	></div>

	<!-- Bottom Sheet Drawer -->
	<div
		class="fixed inset-x-0 bottom-0 z-50 bg-base-100 rounded-t-2xl shadow-2xl md:hidden max-h-[80vh] flex flex-col"
		transition:fly={{ y: 300, duration: 300 }}
		role="dialog"
		aria-modal="true"
		aria-label="Zones navigation"
	>
		<!-- Handle bar -->
		<div class="flex justify-center py-3">
			<div class="w-12 h-1.5 bg-base-content/20 rounded-full"></div>
		</div>

		<!-- Header -->
		<div class="flex items-center justify-between px-4 pb-3 border-b border-base-300">
			<h2 class="text-lg font-bold">Zones</h2>
			<button
				class="btn btn-ghost btn-sm btn-circle"
				on:click={onClose}
				aria-label="Close"
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Scrollable zones list -->
		<div class="overflow-y-auto flex-1 px-2 py-3 pb-safe">
			{#each categories as category}
				{@const color = getCategoryColor(category)}
				{@const hasAccess = hasZoneAccess(category)}
				{@const displayName = category.branding?.displayName || category.name}
				{@const isActive = currentCategoryId === category.id}

				<div class="mb-3">
					<!-- Category header -->
					<div
						class="flex items-center gap-3 px-3 py-2 rounded-lg"
						class:bg-base-200={isActive && hasAccess}
						class:opacity-50={!hasAccess}
						style={isActive && hasAccess ? `border-left: 3px solid ${color};` : ''}
					>
						{#if hasAccess}
							<span class="text-xl" style="color: {color};">{category.icon}</span>
							<span class="font-semibold">{displayName}</span>
						{:else}
							<span class="text-xl">🔐</span>
							<span class="font-semibold text-base-content/50">{displayName}</span>
							<span class="badge badge-xs badge-ghost ml-auto">Locked</span>
						{/if}
					</div>

					<!-- Sections -->
					{#if hasAccess}
						<ul class="ml-6 mt-1 space-y-1">
							{#each category.sections as section}
								{@const secActive = currentSectionId === section.id && currentCategoryId === category.id}
								<li>
									<a
										href="{base}/{category.id}/{section.id}"
										class="flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors {secActive ? 'bg-primary/10 text-primary' : ''}"
										on:click={handleNavClick}
									>
										<span class="text-lg">{section.icon}</span>
										<span class="flex-1">{section.name}</span>
										{#if secActive}
											<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
										{/if}
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}

			{#if categories.length === 0}
				<div class="text-center py-8 text-base-content/50">
					<p>No zones available</p>
					<p class="text-sm mt-1">Contact admin for access</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.pb-safe {
		padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0));
	}
</style>

<script lang="ts">
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { isAdminVerified } from '$lib/stores/user';
	import { createEventDispatcher } from 'svelte';

	export let onZonesClick: () => void;
	export let onProfileClick: () => void;

	$: isChat = $page.url.pathname.startsWith(`${base}/chat`) ||
	            $page.url.pathname.match(new RegExp(`^${base}/[^/]+/[^/]+$`));
	$: isDM = $page.url.pathname.startsWith(`${base}/dm`);
	$: isAdmin = $page.url.pathname === `${base}/admin`;
</script>

<!-- Mobile Bottom Navigation - Fixed at bottom, always visible -->
<nav class="btm-nav btm-nav-md bg-base-200 border-t border-base-300 md:hidden z-40" role="navigation" aria-label="Mobile navigation">
	<!-- Zones/Menu -->
	<button
		class="text-base-content/70 hover:text-primary transition-colors"
		class:active={false}
		on:click={onZonesClick}
		aria-label="Open zones menu"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
		</svg>
		<span class="btm-nav-label text-xs">Zones</span>
	</button>

	<!-- Channels -->
	<a
		href="{base}/chat"
		class="text-base-content/70 hover:text-primary transition-colors"
		class:active={isChat}
		aria-label="Go to channels"
		aria-current={isChat ? 'page' : undefined}
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
		</svg>
		<span class="btm-nav-label text-xs">Chat</span>
	</a>

	<!-- Messages -->
	<a
		href="{base}/dm"
		class="text-base-content/70 hover:text-primary transition-colors"
		class:active={isDM}
		aria-label="Go to direct messages"
		aria-current={isDM ? 'page' : undefined}
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
		</svg>
		<span class="btm-nav-label text-xs">Messages</span>
	</a>

	{#if $isAdminVerified}
		<!-- Admin -->
		<a
			href="{base}/admin"
			class="text-base-content/70 hover:text-primary transition-colors"
			class:active={isAdmin}
			aria-label="Go to admin"
			aria-current={isAdmin ? 'page' : undefined}
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
			</svg>
			<span class="btm-nav-label text-xs">Admin</span>
		</a>
	{/if}

	<!-- Profile -->
	<button
		class="text-base-content/70 hover:text-primary transition-colors"
		on:click={onProfileClick}
		aria-label="Open profile"
	>
		<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
		</svg>
		<span class="btm-nav-label text-xs">Profile</span>
	</button>
</nav>

<style>
	.btm-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		padding-bottom: env(safe-area-inset-bottom, 0);
	}

	.btm-nav-label {
		font-size: 0.625rem;
		margin-top: 0.125rem;
	}

	.btm-nav button,
	.btm-nav a {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 0;
		min-height: 4rem;
	}

	.btm-nav .active {
		color: oklch(var(--p));
		border-top: 2px solid oklch(var(--p));
	}
</style>

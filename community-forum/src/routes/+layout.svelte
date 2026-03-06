<script lang="ts">
	import '../app.css';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import { authStore, isAuthenticated } from '$lib/stores/auth';
	import { userStore } from '$lib/stores/user';
	import { connectRelay, connectRelayWithNip07, isConnected, connectionState, ConnectionState } from '$lib/nostr/relay';
	import { RELAY_URL } from '$lib/config';
	import { sessionStore } from '$lib/stores/session';
	import { calendarStore, sidebarVisible, sidebarExpanded } from '$lib/stores/calendar';
	import { isOnline } from '$lib/stores/pwa';
	import { initializeNotificationListeners } from '$lib/utils/notificationIntegration';
	import { notificationStore } from '$lib/stores/notifications';
	import { initSearch } from '$lib/init/searchInit';
	import { getAppConfig } from '$lib/config/loader';
	import Toast from '$lib/components/ui/Toast.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import SessionTimeoutWarning from '$lib/components/ui/SessionTimeoutWarning.svelte';
	import Navigation from '$lib/components/ui/Navigation.svelte';
	import MyProfileModal from '$lib/components/user/MyProfileModal.svelte';
	import ScreenReaderAnnouncer from '$lib/components/ui/ScreenReaderAnnouncer.svelte';
	import CalendarSidebar from '$lib/components/calendar/CalendarSidebar.svelte';
	import CalendarSheet from '$lib/components/calendar/CalendarSheet.svelte';
	import ZoneNav from '$lib/components/zones/ZoneNav.svelte';
	import MobileBottomNav from '$lib/components/ui/MobileBottomNav.svelte';
	import MobileZoneDrawer from '$lib/components/ui/MobileZoneDrawer.svelte';

	const appConfig = getAppConfig();
	const appName = appConfig.name.split(' - ')[0];

	let mounted = false;
	let themePreference: 'dark' | 'light' = 'dark';
	// PWA install/update banners removed (offline features deprecated)
	let showProfileModal = false;
	let sessionCleanup: (() => void) | undefined = undefined;
	// Initialize isMobile from browser check if available (SSR-safe)
	let isMobile = browser ? window.innerWidth < 768 : false;
	let calendarSheetOpen = false;
	let zoneNavCollapsed = false;
	let calendarCollapsed = true;
	let mobileZoneDrawerOpen = false;
	let relayConnecting = false;

	// Subscribe to userStore at the layout level so it always runs.
	// userStore is a lazy derived store — without a subscriber, its loadProfile()
	// callback never executes, meaning whitelistStatusStore never gets set and
	// isAdminVerified stays false. This line forces the subscription.
	$: void $userStore;

	// Connect to Nostr relay when authenticated.
	// Uses private key signer for passkey/local-key users, NIP-07 signer for extension users.
	// Runs at the layout level so every page has NDK available without
	// needing its own connectRelay() call in onMount.
	// Subscribe to connectionState store so Svelte re-evaluates when the relay
	// disconnects (isConnected() alone is a plain function call, not tracked).
	$: connStatus = $connectionState;
	$: if (browser && $authStore.isAuthenticated && !isConnected() && !relayConnecting &&
		(connStatus.state === ConnectionState.Disconnected || connStatus.state === ConnectionState.Error)) {
		relayConnecting = true;
		const connectPromise = $authStore.isNip07
			? connectRelayWithNip07(RELAY_URL)
			: $authStore.privateKey
				? connectRelay(RELAY_URL, $authStore.privateKey)
				: Promise.reject(new Error('No signing method available'));
		connectPromise
			.catch((err: unknown) => {
				console.error('[Layout] Relay connection failed:', err);
			})
			.finally(() => {
				relayConnecting = false;
			});
	}

	// Safe pathname access with fallbacks
	$: pathname = $page?.url?.pathname ?? '';
	$: showNav = pathname !== `${base}/` && pathname !== base && pathname !== `${base}/signup` && pathname !== `${base}/login` && pathname !== `${base}/pending` && pathname !== '';

	// Extract current category and section from URL (with null checks)
	$: pathParts = pathname ? pathname.replace(base || '', '').split('/').filter(Boolean) : [];
	$: currentCategoryId = pathParts[0] || null;
	$: currentSectionId = pathParts[1] || null;

	// Start session monitoring when authenticated
	$: if (browser && $isAuthenticated && !sessionCleanup) {
		sessionCleanup = sessionStore.start(() => {
			// Session timed out - logout
			authStore.logout();
		});
	} else if (browser && !$isAuthenticated && sessionCleanup) {
		sessionCleanup();
		sessionCleanup = undefined;
		sessionStore.stop();
	}


	onMount(() => {
		mounted = true;

		if (!browser) {
			return;
		}

		// Handle GitHub Pages SPA redirect
		// When 404.html redirects to /community/, it stores the original path in sessionStorage
		try {
			const redirect = sessionStorage.getItem('redirect');
			if (redirect && typeof redirect === 'string') {
				sessionStorage.removeItem('redirect');
				// Extract path relative to base and navigate using SvelteKit router
				const basePath = base || '/community';
				const currentPath = $page?.url?.pathname ?? '';
				if (redirect.startsWith(basePath) && redirect !== currentPath) {
					const targetPath = redirect.slice(basePath.length) || '/';
					// Use replaceState to avoid adding to history
					goto(`${base}${targetPath}`, { replaceState: true });
				}
			}
		} catch (e) {
			console.warn('SPA redirect handling failed:', e);
		}

		const savedTheme = localStorage.getItem('theme');
		themePreference = savedTheme === 'light' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', themePreference);

		// Initialize notification system
		initializeNotificationListeners();

		// Request notification permission if not already granted
		if ('Notification' in window && Notification.permission === 'default') {
			notificationStore.requestPermission();
		}

		// Initialize search index (async, don't block app startup)
		initSearch();

		// Check for mobile viewport
		const checkMobile = () => {
			isMobile = window.innerWidth < 768;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);

		// Initialize calendar store (fetch upcoming events)
		calendarStore.fetchUpcomingEvents(14);

		return () => {
			window.removeEventListener('resize', checkMobile);
		};
	});

	onDestroy(() => {
		if (sessionCleanup) {
			sessionCleanup();
			sessionCleanup = undefined;
		}
	});

	function toggleTheme() {
		if (!browser) return;

		themePreference = themePreference === 'dark' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', themePreference);
		localStorage.setItem('theme', themePreference);
	}

	function toggleProfileModal() {
		showProfileModal = !showProfileModal;
	}

</script>

<svelte:head>
	<title>{appConfig.name}</title>
</svelte:head>

<!-- Skip to main content link for accessibility -->
<a href="#main-content" class="skip-to-main">Skip to main content</a>

<!-- PWA banners removed — offline/install features deprecated -->

<!-- Profile Modal -->
<MyProfileModal bind:open={showProfileModal} />

<div class="min-h-screen w-full transition-base">
	{#if mounted}
		{#if showNav && $isAuthenticated}
			<Navigation
				{themePreference}
				onThemeToggle={toggleTheme}
				onProfileClick={toggleProfileModal}
			/>
		{/if}

		<div class="flex">
			<!-- Left Sidebar: Zones + Calendar (Desktop) -->
			{#if showNav && $isAuthenticated && !isMobile}
				<aside
					class="flex-shrink-0 flex flex-col border-r border-base-300 bg-base-100 overflow-y-auto"
					class:w-72={!zoneNavCollapsed || !calendarCollapsed}
					class:w-16={zoneNavCollapsed && calendarCollapsed}
					style="max-height: calc(100vh - 64px - env(safe-area-inset-top, 0px)); transition: width 0.3s ease-in-out;"
					aria-label="Navigation sidebar"
				>
					<!-- Zones Section -->
					<ZoneNav
						{currentCategoryId}
						{currentSectionId}
						collapsed={zoneNavCollapsed}
						onToggle={() => zoneNavCollapsed = !zoneNavCollapsed}
					/>

					<!-- Calendar Section (below zones) -->
					{#if $sidebarVisible}
						<div class="border-t border-base-300">
							<CalendarSidebar
								isExpanded={!calendarCollapsed}
								isVisible={$sidebarVisible}
								onToggle={() => calendarCollapsed = !calendarCollapsed}
								compact={true}
							/>
						</div>
					{/if}
				</aside>
			{/if}

			<!-- Main Content -->
			{#key pathname}
				<main
					id="main-content"
					role="main"
					tabindex="-1"
					class="flex-1 min-w-0 {isMobile && showNav && $isAuthenticated ? 'pb-20' : ''}"
					in:fade={{ duration: 150, delay: 75 }}
					out:fade={{ duration: 75 }}
				>
					<slot />
				</main>
			{/key}
		</div>

		<!-- Calendar Sheet (Mobile) -->
		{#if showNav && $isAuthenticated && isMobile}
			<CalendarSheet bind:isOpen={calendarSheetOpen} />
		{/if}

		<!-- Mobile Bottom Navigation -->
		{#if showNav && $isAuthenticated && isMobile}
			<MobileBottomNav
				onZonesClick={() => mobileZoneDrawerOpen = true}
				onProfileClick={toggleProfileModal}
			/>
			<MobileZoneDrawer
				isOpen={mobileZoneDrawerOpen}
				onClose={() => mobileZoneDrawerOpen = false}
			/>
		{/if}
	{:else}
		<div class="flex items-center justify-center min-h-screen" role="status" aria-live="polite" aria-label="Loading application">
			<div class="loading loading-spinner loading-lg text-primary"></div>
			<span class="sr-only">Loading application...</span>
		</div>
	{/if}
</div>

<Toast />
<ConfirmDialog />
<SessionTimeoutWarning />

<style>
	:global(body) {
		overscroll-behavior: none;
	}

	/* Skip to main content link — aligned with DreamLab cyan */
	.skip-to-main {
		position: absolute;
		top: -40px;
		left: 0;
		background: #0ea5e9;
		color: white;
		padding: 8px 16px;
		text-decoration: none;
		z-index: 100;
		border-radius: 0 0 4px 0;
		font-weight: 500;
	}

	.skip-to-main:focus {
		top: 0;
		outline: 3px solid #a855f7;
		outline-offset: 2px;
	}

	/* Screen reader only content */
	:global(.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	/* Focus visible styles — aligned with DreamLab purple accent */
	:global(*:focus-visible) {
		outline: 2px solid #a855f7;
		outline-offset: 2px;
		border-radius: 2px;
	}
</style>

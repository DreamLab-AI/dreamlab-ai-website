<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { isAuthenticated, authStore } from '$lib/stores/auth';
	import { restoreFromMnemonic, restoreFromNsecOrHex } from '$lib/nostr/keys';
	import { getAppConfig } from '$lib/config/loader';

	const appConfig = getAppConfig();
	const appNameParts = appConfig.name.split(' - ');
	const primaryName = appNameParts[0];
	const subtitle = appNameParts.slice(1).join(' - ') || 'Nostr Community';

	// Dev mode credentials - MUST be set via environment variables, no hardcoded fallbacks
	const ADMIN_NSEC = import.meta.env.VITE_DEV_ADMIN_NSEC || '';
	const ADMIN_SEED = import.meta.env.VITE_DEV_ADMIN_SEED || '';
	const hasDevCredentials = Boolean(ADMIN_NSEC || ADMIN_SEED);

	let devLoading = false;
	let devError = '';
	let showDevMode = false;

	onMount(() => {
		// Dev mode only enabled when: (1) in Vite dev server OR ?dev param, AND (2) credentials are configured
		const urlParams = new URLSearchParams(window.location.search);
		const devModeRequested = import.meta.env.DEV || urlParams.has('dev');
		showDevMode = devModeRequested && hasDevCredentials;

		if ($isAuthenticated) {
			goto(`${base}/chat`);
		}
	});

	async function devLoginAsAdmin() {
		if (!showDevMode) return;
		devLoading = true;
		devError = '';

		try {
			// Try nsec first (faster), fall back to mnemonic
			let publicKey: string;
			let privateKey: string;

			try {
				const result = restoreFromNsecOrHex(ADMIN_NSEC);
				publicKey = result.publicKey;
				privateKey = result.privateKey;
			} catch {
				// Fall back to mnemonic
				const result = await restoreFromMnemonic(ADMIN_SEED);
				publicKey = result.publicKey;
				privateKey = result.privateKey;
			}

			await authStore.setKeys(publicKey, privateKey);
			goto(`${base}/chat`);
		} catch (error) {
			devError = error instanceof Error ? error.message : 'Dev login failed';
			console.error('Dev login error:', error);
		} finally {
			devLoading = false;
		}
	}

	async function devLoginAsTestUser() {
		if (!showDevMode) return;
		devLoading = true;
		devError = '';

		try {
			// Generate a deterministic test user from a fixed seed
			const testSeed = 'test user seed phrase for development only not secure at all okay';
			const result = await restoreFromMnemonic('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
			await authStore.setKeys(result.publicKey, result.privateKey);
			goto(`${base}/chat`);
		} catch (error) {
			devError = error instanceof Error ? error.message : 'Dev login failed';
			console.error('Dev login error:', error);
		} finally {
			devLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{appConfig.name}</title>
</svelte:head>

<div class="flex flex-col items-center justify-center min-h-screen p-4 gradient-hero">
	<div class="max-w-2xl w-full space-y-8 text-center">
		<!-- Back to main site -->
		<a href="/" class="inline-flex items-center gap-2 text-sm text-base-content/50 hover:text-base-content/80 transition-colors">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-4 h-4">
				<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
			</svg>
			dreamlab-ai.com
		</a>

		<div class="space-y-4">
			<h1 class="text-5xl md:text-6xl font-bold gradient-text">
				{primaryName}
			</h1>
			<p class="text-xl text-base-content/70">
				{subtitle}
			</p>
		</div>

		<div class="card bg-base-200/80 backdrop-blur border border-base-300/50 shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-2xl justify-center">Community Forum</h2>
				<p class="text-base-content/70">
					A private, encrypted space for DreamLab trainees and the wider collective to connect, share knowledge, and collaborate.
				</p>
				<div class="card-actions justify-center mt-4 flex-wrap gap-3">
					<a href="{base}/signup" class="btn btn-primary btn-lg">
						Join the community
					</a>
					<a href="{base}/login" class="btn btn-outline btn-lg">
						Sign in
					</a>
				</div>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
			<div class="card bg-base-200/80 backdrop-blur border border-base-300/30">
				<div class="card-body items-center text-center">
					<div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-5 h-5 text-primary">
							<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
						</svg>
					</div>
					<h3 class="card-title text-lg">Cohort channels</h3>
					<p class="text-sm text-base-content/70">
						Private spaces organised by training programme and interest.
					</p>
				</div>
			</div>

			<div class="card bg-base-200/80 backdrop-blur border border-base-300/30">
				<div class="card-body items-center text-center">
					<div class="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mb-2">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-5 h-5 text-secondary">
							<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
						</svg>
					</div>
					<h3 class="card-title text-lg">Encrypted messaging</h3>
					<p class="text-sm text-base-content/70">
						End-to-end encrypted DMs built on the Nostr protocol.
					</p>
				</div>
			</div>

			<div class="card bg-base-200/80 backdrop-blur border border-base-300/30">
				<div class="card-body items-center text-center">
					<div class="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mb-2">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-5 h-5 text-accent">
							<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
						</svg>
					</div>
					<h3 class="card-title text-lg">Events and calendar</h3>
					<p class="text-sm text-base-content/70">
						Training sessions, meetups, and community events.
					</p>
				</div>
			</div>
		</div>

		{#if showDevMode}
			<div class="card bg-warning/10 border border-warning/30 mt-8">
				<div class="card-body">
					<h3 class="card-title text-warning text-lg justify-center">
						🛠️ Development Mode
					</h3>
					<p class="text-sm text-center text-base-content/70 mb-4">
						Quick login for testing (only visible in dev mode)
					</p>
					{#if devError}
						<div class="alert alert-error mb-4">
							<span>{devError}</span>
						</div>
					{/if}
					<div class="flex flex-wrap gap-3 justify-center">
						<button
							class="btn btn-warning"
							on:click={devLoginAsAdmin}
							disabled={devLoading}
						>
							{#if devLoading}
								<span class="loading loading-spinner loading-sm"></span>
							{/if}
							Login as Admin
						</button>
						<button
							class="btn btn-outline btn-warning"
							on:click={devLoginAsTestUser}
							disabled={devLoading}
						>
							{#if devLoading}
								<span class="loading loading-spinner loading-sm"></span>
							{/if}
							Login as Test User
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

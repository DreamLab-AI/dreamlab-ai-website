<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import AuthFlow from '$lib/components/auth/AuthFlow.svelte';

  function handleComplete(event: CustomEvent<{ publicKey: string }>) {
    goto(`${base}/chat`);
  }
</script>

<svelte:head>
  <title>Login - DreamLab Community</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-mesh p-4">
  <div class="w-full max-w-lg">
    <AuthFlow initialStep="login" on:complete={handleComplete} />
  </div>
</div>

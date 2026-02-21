<script lang="ts">
  import { goto } from '$app/navigation';
  import AuthFlow from '$lib/components/auth/AuthFlow.svelte';

  function handleComplete(event: CustomEvent<{ publicKey: string }>) {
    goto('/');
  }
</script>

<svelte:head>
  <title>Sign Up - DreamLab Community</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-mesh p-4">
  <AuthFlow on:complete={handleComplete} />
</div>

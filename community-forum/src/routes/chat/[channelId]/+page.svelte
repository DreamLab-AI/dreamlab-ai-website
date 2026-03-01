<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { authStore } from '$lib/stores/auth';
  import { whitelistStatusStore } from '$lib/stores/user';
  import { get } from 'svelte/store';
  import { connectRelay, isConnected } from '$lib/nostr/relay';
  import { RELAY_URL } from '$lib/config';
  import {
    fetchChannelById,
    fetchChannelMessages,
    sendChannelMessage,
    subscribeToChannel,
    type CreatedChannel
  } from '$lib/nostr/channels';
  import { getAvatarUrl } from '$lib/utils/identicon';
  import { lastReadStore } from '$lib/stores/readPosition';
  import PinnedMessages from '$lib/components/chat/PinnedMessages.svelte';
  import ChannelStats from '$lib/components/forum/ChannelStats.svelte';
  import MessageItem from '$lib/components/chat/MessageItem.svelte';
  import Breadcrumb from '$lib/components/navigation/Breadcrumb.svelte';
  import { getSectionWithCategory, getBreadcrumbs } from '$lib/config';
  import type { BreadcrumbItem } from '$lib/config/types';
  import type { Message } from '$lib/types/channel';
  import { getActiveRelays } from '$lib/stores/settings';
  import { getAppConfig } from '$lib/config/loader';

  const appConfig = getAppConfig();

  $: channelId = $page.params.channelId;

  let channel: CreatedChannel | null = null;
  let messages: Array<{
    id: string;
    content: string;
    pubkey: string;
    createdAt: number;
    replyTo?: string;
  }> = [];
  let messageInput = '';
  let loading = true;
  let sending = false;
  let error: string | null = null;
  let messagesContainer: HTMLDivElement;
  let unsubscribe: (() => void) | null = null;

  // New feature state
  let showScrollButton = false;
  let isTyping = false;
  let typingTimeout: ReturnType<typeof setTimeout> | null = null;
  let messageCount = 0;
  let timeUpdateInterval: ReturnType<typeof setInterval> | null = null;
  let markReadTimeout: ReturnType<typeof setTimeout> | null = null;
  let wasAtBottom = true;
  let showStats = false;

  /**
   * Wait for the relay to be connected, with a timeout.
   * The root layout initiates the connection reactively, so this just
   * polls until isConnected() returns true or the deadline expires.
   */
  async function waitForRelayConnection(timeoutMs: number = 10000): Promise<boolean> {
    if (isConnected()) return true;

    // If layout hasn't triggered connection yet, connect directly as fallback
    if ($authStore.privateKey && !isConnected()) {
      try {
        await connectRelay(RELAY_URL, $authStore.privateKey);
        return true;
      } catch {
        // Fall through to polling
      }
    }

    const start = Date.now();
    return new Promise<boolean>((resolve) => {
      const check = () => {
        if (isConnected()) {
          resolve(true);
        } else if (Date.now() - start >= timeoutMs) {
          resolve(false);
        } else {
          setTimeout(check, 200);
        }
      };
      check();
    });
  }

  onMount(async () => {
    // Wait for auth store to be ready before checking authentication
    await authStore.waitForReady();

    if (!$authStore.isAuthenticated || !$authStore.publicKey) {
      goto(`${base}/`);
      return;
    }

    try {
      // Wait for relay connection (initiated by root layout or fallback here)
      const connected = await waitForRelayConnection();
      if (!connected) {
        error = 'Could not connect to relay. Please try again.';
        loading = false;
        return;
      }

      // Get user's cohorts from whitelist for channel filtering
      const whitelistStatus = get(whitelistStatusStore);
      const userCohorts = whitelistStatus?.cohorts ?? [];
      const isAdmin = whitelistStatus?.isAdmin ?? false;

      // Fetch the specific channel by ID directly (more reliable than fetching all)
      const fetchedChannel = await fetchChannelById(channelId);
      if (!fetchedChannel) {
        error = 'Channel not found';
        loading = false;
        return;
      }
      channel = fetchedChannel;

      // Build auth context for channel access checks
      const authContext = {
        userCohorts,
        userPubkey: $authStore.publicKey ?? '',
        isAdmin
      };

      // Fetch existing messages (SECURITY: passes authContext for access verification)
      messages = await fetchChannelMessages(channelId, 50, authContext);
      messageCount = messages.length;

      // Subscribe to new messages (SECURITY: passes authContext for access verification)
      const sub = await subscribeToChannel(channelId, (newMessage) => {
        // Avoid duplicates
        if (!messages.find(m => m.id === newMessage.id)) {
          messages = [...messages, newMessage];
          messageCount = messages.length;

          // Auto-scroll and mark read if at bottom
          if (wasAtBottom) {
            scrollToBottom();
            scheduleMarkAsRead();
          }
        }
      }, authContext);
      unsubscribe = sub.unsubscribe;

      // Mark as read after brief delay
      scheduleMarkAsRead();

      // Set up time update interval for relative timestamps
      timeUpdateInterval = setInterval(() => {
        messages = [...messages]; // Trigger reactivity for timestamp updates
      }, 60000); // Update every minute

    } catch (e) {
      console.error('Error loading channel:', e);
      error = e instanceof Error ? e.message : 'Failed to load channel';
    } finally {
      loading = false;
    }
  });

  onDestroy(() => {
    // Save last read position before leaving
    if (messages.length > 0) {
      const latestTimestamp = Math.max(...messages.map(m => m.createdAt));
      lastReadStore.setLastRead(channelId, latestTimestamp);
    }

    if (unsubscribe) {
      unsubscribe();
    }
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    if (timeUpdateInterval) {
      clearInterval(timeUpdateInterval);
    }
    if (markReadTimeout) {
      clearTimeout(markReadTimeout);
    }
  });

  async function sendMessage() {
    if (!messageInput.trim() || sending || !channel) return;

    sending = true;
    const content = messageInput;
    messageInput = '';

    try {
      // SECURITY: Pass authorization context to verify posting permissions
      const whitelistStatus = get(whitelistStatusStore);
      const authContext = {
        userCohorts: whitelistStatus?.cohorts ?? [],
        userPubkey: $authStore.publicKey ?? '',
        isAdmin: whitelistStatus?.isAdmin ?? false
      };

      await sendChannelMessage(channelId, content, undefined, authContext);
      scrollToBottom();
    } catch (e) {
      console.error('Error sending message:', e);
      messageInput = content; // Restore on error
      error = e instanceof Error ? e.message : 'Failed to send message';
    } finally {
      sending = false;
    }
  }

  function scrollToBottom() {
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }
  }

  function handleScroll() {
    if (messagesContainer) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      showScrollButton = distanceFromBottom > 100;
      wasAtBottom = distanceFromBottom < 50;

      // Mark as read when scrolled to bottom
      if (wasAtBottom) {
        scheduleMarkAsRead();
      }
    }
  }

  function scheduleMarkAsRead() {
    if (markReadTimeout) {
      clearTimeout(markReadTimeout);
    }

    markReadTimeout = setTimeout(() => {
      if (messages.length > 0) {
        const latestTimestamp = Math.max(...messages.map(m => m.createdAt));
        lastReadStore.setLastRead(channelId, latestTimestamp);
      }
    }, 1000); // 1 second delay
  }

  function handleInput() {
    isTyping = true;
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    typingTimeout = setTimeout(() => {
      isTyping = false;
    }, 2000);
  }

  function formatRelativeTime(timestamp: number): string {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;

    if (diff < 60) return 'just now';
    if (diff < 3600) {
      const mins = Math.floor(diff / 60);
      return `${mins}m ago`;
    }
    if (diff < 86400) {
      const hours = Math.floor(diff / 3600);
      return `${hours}h ago`;
    }
    if (diff < 604800) {
      const days = Math.floor(diff / 86400);
      return `${days}d ago`;
    }

    return new Date(timestamp * 1000).toLocaleDateString([], {
      month: 'short',
      day: 'numeric'
    });
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function shortenPubkey(pubkey: string): string {
    return pubkey.slice(0, 8) + '...' + pubkey.slice(-4);
  }

  function getAvatarUrlForPubkey(pubkey: string): string {
    // Use local identicon generation to protect user privacy
    return getAvatarUrl(pubkey, 80);
  }

  function handleScrollToMessage(event: CustomEvent<{ messageId: string }>) {
    const messageElement = document.getElementById(`message-${event.detail.messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Highlight the message briefly
      messageElement.classList.add('highlight-flash');
      setTimeout(() => {
        messageElement.classList.remove('highlight-flash');
      }, 2000);
    }
  }

  // Get relay URL for reactions
  $: relayUrl = getActiveRelays()[0] || '';

  // Convert messages to proper Message type for MessageItem component
  $: formattedMessages = messages.map(msg => ({
    id: msg.id,
    channelId: channelId,
    authorPubkey: msg.pubkey,
    content: msg.content,
    createdAt: msg.createdAt * 1000, // Convert to milliseconds
    isEncrypted: false,
    decryptedContent: undefined,
    replyTo: msg.replyTo
  } as Message));

  // Build breadcrumbs from channel's section tag: Home > Zone > Section > Channel Name
  $: breadcrumbItems = (() => {
    if (!channel) return [];
    const sectionInfo = getSectionWithCategory(channel.section);
    if (sectionInfo) {
      const { section, category } = sectionInfo;
      const crumbs: BreadcrumbItem[] = getBreadcrumbs(category.id, section.id);
      crumbs.push({ label: channel.name, path: `/chat/${channel.id}` });
      return crumbs;
    }
    // Fallback: just Channels > Channel Name
    return [
      { label: 'Channels', path: '/chat' },
      { label: channel.name, path: `/chat/${channel.id}` }
    ] as BreadcrumbItem[];
  })();
</script>

<svelte:head>
  <title>{channel?.name || 'Channel'} - {appConfig.name}</title>
</svelte:head>

{#if loading}
  <div class="flex justify-center items-center h-[calc(100vh-64px)]">
    <div class="loading loading-spinner loading-lg text-primary"></div>
  </div>
{:else if error && !channel}
  <div class="container mx-auto p-4 max-w-4xl">
    <button class="btn btn-ghost btn-sm mb-4" on:click={() => goto(`${base}/chat`)}>
      ← Back to Channels
    </button>
    <div class="alert alert-error">
      <span>{error}</span>
    </div>
  </div>
{:else if channel}
  <div class="flex flex-col h-[calc(100vh-64px)]">
    <div class="bg-base-200 border-b border-base-300 p-4">
      <div class="container mx-auto max-w-4xl">
        <div class="mb-2">
          <Breadcrumb items={breadcrumbItems} />
        </div>
        <h1 class="text-2xl font-bold">{channel.name}</h1>
        {#if channel.description}
          <p class="text-base-content/70 text-sm">{channel.description}</p>
        {/if}
        <div class="flex items-center gap-2 mt-1">
          <span class="badge badge-sm badge-ghost">{channel.visibility}</span>
          {#if channel.encrypted}
            <span class="badge badge-sm badge-primary">Encrypted</span>
          {/if}
          <span class="badge badge-sm badge-outline">{messageCount} messages</span>
          <button
            class="btn btn-ghost btn-sm"
            on:click={() => showStats = !showStats}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
            {showStats ? 'Hide' : 'Show'} Stats
          </button>
        </div>
      </div>
    </div>

    <ChannelStats channelId={channelId} isExpanded={showStats} />

    <PinnedMessages
      channelId={channelId}
      messages={formattedMessages}
      on:scrollTo={handleScrollToMessage}
    />

    {#if error}
      <div class="container mx-auto max-w-4xl p-2">
        <div class="alert alert-warning alert-sm">
          <span>{error}</span>
          <button class="btn btn-ghost btn-xs" on:click={() => error = null}>✕</button>
        </div>
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto p-4 bg-base-100 relative" bind:this={messagesContainer} on:scroll={handleScroll}>
      <div class="container mx-auto max-w-4xl">
        {#if messages.length === 0}
          <div class="flex items-center justify-center h-full text-base-content/50">
            <p>No messages yet. Start the conversation!</p>
          </div>
        {:else}
          <div class="space-y-4">
            {#each formattedMessages as message (message.id)}
              <MessageItem
                {message}
                channelName={channel?.name}
                {relayUrl}
              />
            {/each}
          </div>
        {/if}
      </div>

      {#if showScrollButton}
        <button
          class="absolute bottom-4 right-4 btn btn-circle btn-primary shadow-lg"
          on:click={scrollToBottom}
          aria-label="Scroll to bottom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      {/if}
    </div>

    <div class="bg-base-200 border-t border-base-300 p-4">
      <div class="container mx-auto max-w-4xl">
        <form on:submit|preventDefault={sendMessage} class="flex gap-2">
          <input
            type="text"
            class="input input-bordered flex-1 text-base-content"
            placeholder="Type a message..."
            bind:value={messageInput}
            on:input={handleInput}
            disabled={sending}
          />
          <button
            type="submit"
            class="btn btn-primary"
            disabled={sending || !messageInput.trim()}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(.highlight-flash) {
    animation: highlight 2s ease-in-out;
  }

  @keyframes highlight {
    0%, 100% {
      background-color: transparent;
    }
    50% {
      background-color: rgba(251, 191, 36, 0.2);
    }
  }
</style>

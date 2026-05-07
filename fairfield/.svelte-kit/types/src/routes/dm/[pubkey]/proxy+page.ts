// @ts-nocheck
import type { PageLoad } from './$types';

// Dynamic routes can't be prerendered
export const prerender = false;

export const load = async ({ params }: Parameters<PageLoad>[0]) => {
  // Data loading happens in component to avoid SSR issues
  return { recipientPubkey: params.pubkey, messages: [] };
};

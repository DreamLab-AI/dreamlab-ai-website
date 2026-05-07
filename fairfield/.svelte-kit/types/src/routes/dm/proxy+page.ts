// @ts-nocheck
import type { PageLoad } from './$types';

// Allow prerendering - data is loaded in component
export const prerender = true;

export const load = async () => {
  // All data loading happens in the component to avoid SSR/prerender issues
  return { conversations: [] };
};
;null as any as PageLoad;
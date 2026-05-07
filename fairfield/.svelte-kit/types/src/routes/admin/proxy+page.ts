// @ts-nocheck
import type { PageLoad } from './$types';

// Allow prerendering - auth check happens in component
export const prerender = true;

export const load = async () => {
  // Auth and admin check handled in component
  return { stats: null };
};
;null as any as PageLoad;
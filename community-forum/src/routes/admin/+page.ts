import type { PageLoad } from './$types';

// Disable prerendering - admin dashboard should not be statically generated
// This prevents leaking admin layout/menu structure to unauthenticated users
export const prerender = false;

export const load: PageLoad = async () => {
  // Auth and admin check handled in component
  return { stats: null };
};



export const index = 22;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/setup/_page.svelte.js')).default;
export const universal = {
  "prerender": true,
  "ssr": false
};
export const universal_id = "src/routes/setup/+page.ts";
export const imports = ["_app/immutable/nodes/22.BeOZTuLv.js","_app/immutable/chunks/CwRy9Tox.js","_app/immutable/chunks/BFk-VQ8S.js","_app/immutable/chunks/D-vqeeah.js","_app/immutable/chunks/BZgxvzt3.js","_app/immutable/chunks/D-ho1sXg.js","_app/immutable/chunks/CEc-lP5l.js","_app/immutable/chunks/BToyndCo.js"];
export const stylesheets = [];
export const fonts = [];

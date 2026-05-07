

export const index = 15;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/dm/_page.svelte.js')).default;
export const universal = {
  "prerender": true,
  "ssr": false,
  "load": null
};
export const universal_id = "src/routes/dm/+page.ts";
export const imports = ["_app/immutable/nodes/15.DINrM6E6.js","_app/immutable/chunks/CwRy9Tox.js","_app/immutable/chunks/BFk-VQ8S.js","_app/immutable/chunks/D-vqeeah.js","_app/immutable/chunks/BZgxvzt3.js","_app/immutable/chunks/D-ho1sXg.js","_app/immutable/chunks/CEc-lP5l.js","_app/immutable/chunks/BVL4R8vY.js","_app/immutable/chunks/CmsKOCeN.js","_app/immutable/chunks/BToyndCo.js","_app/immutable/chunks/DxhvQVPD.js","_app/immutable/chunks/BzOJhCVF.js","_app/immutable/chunks/D6fDNJPE.js","_app/immutable/chunks/CF7zP8uE.js","_app/immutable/chunks/ofNpoJHj.js","_app/immutable/chunks/CsmHjMo3.js","_app/immutable/chunks/DvahnuOm.js"];
export const stylesheets = [];
export const fonts = [];

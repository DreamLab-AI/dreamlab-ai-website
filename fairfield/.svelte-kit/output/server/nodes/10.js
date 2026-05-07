

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/admin/_page.svelte.js')).default;
export const universal = {
  "prerender": true,
  "ssr": false,
  "load": null
};
export const universal_id = "src/routes/admin/+page.ts";
export const imports = ["_app/immutable/nodes/10.t-gzJp2y.js","_app/immutable/chunks/CmsKOCeN.js","_app/immutable/chunks/CwRy9Tox.js","_app/immutable/chunks/D-vqeeah.js","_app/immutable/chunks/BZgxvzt3.js","_app/immutable/chunks/D-ho1sXg.js","_app/immutable/chunks/CEc-lP5l.js","_app/immutable/chunks/BVL4R8vY.js","_app/immutable/chunks/BToyndCo.js","_app/immutable/chunks/B0CCWat9.js","_app/immutable/chunks/BnIToiQU.js","_app/immutable/chunks/CF7zP8uE.js","_app/immutable/chunks/C6CkZ1yh.js","_app/immutable/chunks/BzOJhCVF.js","_app/immutable/chunks/C5CT8Vb6.js","_app/immutable/chunks/vhWFhqVY.js","_app/immutable/chunks/9tEgXtNp.js","_app/immutable/chunks/CJcYv5Rm.js","_app/immutable/chunks/D6fDNJPE.js","_app/immutable/chunks/BFk-VQ8S.js"];
export const stylesheets = ["_app/immutable/assets/UserDisplay.DBwfNe3u.css","_app/immutable/assets/Avatar.BY0jTnLk.css"];
export const fonts = [];

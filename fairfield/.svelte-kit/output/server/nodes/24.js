

export const index = 24;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/view/_noteId_/_page.svelte.js')).default;
export const universal = {
  "prerender": false,
  "ssr": false,
  "load": null
};
export const universal_id = "src/routes/view/[noteId]/+page.ts";
export const imports = ["_app/immutable/nodes/24.C4yy7iiQ.js","_app/immutable/chunks/CwRy9Tox.js","_app/immutable/chunks/D-vqeeah.js","_app/immutable/chunks/BZgxvzt3.js","_app/immutable/chunks/D-ho1sXg.js","_app/immutable/chunks/CEc-lP5l.js","_app/immutable/chunks/DapKZiAA.js","_app/immutable/chunks/BVL4R8vY.js","_app/immutable/chunks/CmsKOCeN.js","_app/immutable/chunks/BToyndCo.js","_app/immutable/chunks/CF7zP8uE.js","_app/immutable/chunks/ofNpoJHj.js","_app/immutable/chunks/CsmHjMo3.js","_app/immutable/chunks/DvahnuOm.js","_app/immutable/chunks/9tEgXtNp.js","_app/immutable/chunks/CJcYv5Rm.js","_app/immutable/chunks/D6fDNJPE.js"];
export const stylesheets = ["_app/immutable/assets/UserDisplay.DBwfNe3u.css","_app/immutable/assets/Avatar.BY0jTnLk.css"];
export const fonts = [];

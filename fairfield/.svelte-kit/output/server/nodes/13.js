

export const index = 13;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/chat/_page.svelte.js')).default;
export const universal = {
  "prerender": true,
  "ssr": false,
  "load": null
};
export const universal_id = "src/routes/chat/+page.ts";
export const imports = ["_app/immutable/nodes/13.DNFHrh06.js","_app/immutable/chunks/CwRy9Tox.js","_app/immutable/chunks/D-vqeeah.js","_app/immutable/chunks/BFk-VQ8S.js","_app/immutable/chunks/BZgxvzt3.js","_app/immutable/chunks/D-ho1sXg.js","_app/immutable/chunks/CEc-lP5l.js","_app/immutable/chunks/DapKZiAA.js","_app/immutable/chunks/BVL4R8vY.js","_app/immutable/chunks/CmsKOCeN.js","_app/immutable/chunks/BToyndCo.js","_app/immutable/chunks/Bg-sgm6J.js","_app/immutable/chunks/B0CCWat9.js","_app/immutable/chunks/BnIToiQU.js","_app/immutable/chunks/CF7zP8uE.js","_app/immutable/chunks/C6CkZ1yh.js","_app/immutable/chunks/BzOJhCVF.js","_app/immutable/chunks/1I_oneSF.js","_app/immutable/chunks/9tEgXtNp.js","_app/immutable/chunks/CezI6rSZ.js","_app/immutable/chunks/B5Ec7LqV.js","_app/immutable/chunks/BvU0z6gS.js","_app/immutable/chunks/DFgagrHC.js","_app/immutable/chunks/BVXA5lDO.js"];
export const stylesheets = ["_app/immutable/assets/ModeratorTeam.DGnaTJYY.css","_app/immutable/assets/Toast.C4J9ClzN.css","_app/immutable/assets/13.CeGtfOJy.css","_app/immutable/assets/Modal.kJ4MdHVi.css","_app/immutable/assets/Avatar.BY0jTnLk.css"];
export const fonts = [];



export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/chat/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.C0I4VRjW.js","_app/immutable/chunks/CwRy9Tox.js","_app/immutable/chunks/D-vqeeah.js"];
export const stylesheets = ["_app/immutable/assets/2.DkUNwtL3.css"];
export const fonts = [];

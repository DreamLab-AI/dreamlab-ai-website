// Uninstall stale service worker — no PWA caching is used by this site.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => {
  self.clients.matchAll({ type: 'window' }).then(clients =>
    clients.forEach(c => c.navigate(c.url))
  );
  self.registration.unregister();
});

// Minimal service worker required by browsers to mark the app as installable.
// We deliberately avoid caching the shell so updates to index.html / the JS
// bundle reach users immediately — Firebase Hosting already serves static
// assets with good caching headers.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // No-op: let the browser handle the request normally.
});

// Mercao Service Worker
const CACHE = 'mercao-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// On fetch: if navigating to root with no params, check cache for saved params
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Only intercept navigation to root page
  if (e.request.mode === 'navigate' &&
      (url.pathname === '/lista-compra' || url.pathname === '/lista-compra/') &&
      !url.search) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const saved = await cache.match('mercao-params');
        if (saved) {
          const params = await saved.text();
          if (params) {
            // Redirect to URL with params
            return Response.redirect(url.pathname + params, 302);
          }
        }
        return fetch(e.request);
      })
    );
  }
});

// Listen for messages to save params
self.addEventListener('message', e => {
  if (e.data?.type === 'SAVE_PARAMS') {
    caches.open(CACHE).then(cache => {
      cache.put('mercao-params', new Response(e.data.params));
    });
  }
});

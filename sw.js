// Mercao Service Worker
const CACHE = 'mercao-v3';
const SHELL = [
  './',
  './index.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Navegación al root sin params: si hay params guardados, redirige.
  if (e.request.mode === 'navigate' &&
      (url.pathname === '/lista-compra' || url.pathname === '/lista-compra/' || url.pathname === '/' || url.pathname === '/index.html') &&
      !url.search) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const saved = await cache.match('mercao-params');
        if (saved) {
          const params = await saved.text();
          if (params) return Response.redirect(url.pathname + params, 302);
        }
        // Sin params: sirve el shell desde caché con fallback a red.
        try {
          const fresh = await fetch(e.request);
          cache.put(e.request, fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await cache.match('./index.html') || await cache.match('./');
          if (cached) return cached;
          throw err;
        }
      })
    );
    return;
  }

  // Navegación con params: intenta red, cae a caché.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) || (await cache.match('./')) || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // Recursos same-origin: cache-first con actualización en segundo plano.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        const fetching = fetch(e.request).then(res => {
          if (res && res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetching;
      })
    );
  }
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SAVE_PARAMS') {
    caches.open(CACHE).then(cache => {
      cache.put('mercao-params', new Response(e.data.params));
    });
  }
});

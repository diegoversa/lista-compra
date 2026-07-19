// Mercao Service Worker
const CACHE = 'mercao-v6';
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

  // Navegación: siempre intenta red primero (para traer HTML fresco) y cae a caché
  // si no hay conexión. YA NO redirigimos a los params guardados: la app tiene su
  // propio menú de selección de sala y necesita ver la URL limpia para mostrarlo.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res && res.ok) {
          caches.open(CACHE).then(cache => cache.put(e.request, res.clone()));
        }
        return res;
      }).catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(e.request)) ||
               (await cache.match('./index.html')) ||
               (await cache.match('./')) ||
               new Response('Offline', { status: 503 });
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

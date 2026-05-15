// MoMar Admin · Service Worker
// Estrategia: stale-while-revalidate para assets, network-first para HTML
const CACHE = 'momar-admin-v1-20260515';

const PRECACHE = [
  './',
  './index.html',
  './pedidos.html',
  './productos.html',
  './clientes.html',
  './banners.html',
  './ofertas.html',
  './estadisticas.html',
  './configuracion.html',
  './login.html',
  './css/admin-2026-05-15.css',
  './js/admin-shell-2026-05-15.js',
  './js/admin-data-2026-05-15.js',
  '../js/products.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(err => {
      // Si algún archivo falla, no rompe el SW — sigue con los que pudo
      console.warn('[SW] Algunos assets no se pudieron cachear:', err);
    }))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // No cachear nada que no sea del mismo origen (Google Fonts, Unsplash CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // HTML: network-first (siempre intentamos la versión más fresca)
  if (req.mode === 'navigate' || (req.destination === '' && req.headers.get('accept')?.includes('text/html'))) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // CSS / JS / imágenes: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// Permitir desde la app actualizar el SW manualmente
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

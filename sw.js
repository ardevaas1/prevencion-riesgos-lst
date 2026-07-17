const CACHE_NAME = 'lst-prevencion-shell-v4';
const APP_SHELL = [
  './', './index.html', './style.css', './config.js', './app.js',
  './manifest.json', './logo.png', './logo-white.png', './icon-192.png', './icon-512.png',
  './plantillas/charla_5min.pdf', './plantillas/investigacion_accidente.pdf', './plantillas/hcr.pdf',
  './vendor/pdf-lib.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(event.request);
        if (fresh && fresh.status === 200) cache.put(event.request, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await cache.match(event.request);
        return cached || new Response(
          '<h1>Sin conexión</h1><p>No se pudo cargar esta página y no hay una copia guardada.</p>',
          { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
        );
      }
    })()
  );
});

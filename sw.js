const CACHE_NAME = 'lst-prevencion-shell-v7';
const APP_SHELL = [
  './', './index.html', './style.css', './config.js', './app.js',
  './manifest.json', './logo.png', './logo-white.png', './icon-192.png', './icon-512.png',
  './plantillas/charla_5min.pdf', './plantillas/investigacion_accidente.pdf', './plantillas/hcr.pdf',
  './plantillas/diat.pdf', './vendor/pdf-lib.min.js', './vendor/pdf.min.mjs', './vendor/pdf.worker.min.mjs',
  './plantillas/charlas/SGSST-RG-001_Maquinaria_Pesada.pdf',
  './plantillas/charlas/SGSST-RG-002_Pausas_Activas.pdf',
  './plantillas/charlas/SGSST-RG-003_Trabajo_en_Equipo.pdf',
  './plantillas/charlas/SGSST-RG-004_Actos_Inseguros.pdf',
  './plantillas/charlas/SGSST-RG-005_Alcohol_y_Drogas.pdf',
  './plantillas/charlas/SGSST-RG-006_Uso_de_los_EPP.pdf',
  './plantillas/charlas/SGSST-RG-007_Herramientas_y_Partes_en_Movimiento.pdf',
  './plantillas/charlas/SGSST-RG-008_Manejo_Manual_de_Carga.pdf',
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

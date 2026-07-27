const CACHE_NAME = 'lst-prevencion-shell-v15';
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
  './plantillas/charlas/SGSST-RG-009_Proteccion_Respiratoria.pdf',
  './plantillas/charlas/SGSST-RG-010_Radiacion_UV.pdf',
  './plantillas/charlas/SGSST-RG-011_Ruido.pdf',
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

// Stale-while-revalidate: responde al toque con lo que haya en caché (carga
// instantánea) y en paralelo pide la versión fresca a la red para dejarla
// lista para la PRÓXIMA carga — antes era "network-first" (esperaba la red
// siempre, y el caché era solo un respaldo para cuando no había conexión).
// Esto no arriesga mostrar datos de negocio viejos: los datos reales
// (Sheets/Drive) son fetches cross-origin que ni pasan por acá (ver el
// chequeo de origin más abajo), esto solo cachea el shell estático de la app
// (HTML/CSS/JS/PDFs de plantilla).
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      const actualizarEnSegundoPlano = fetch(event.request)
        .then((fresh) => { if (fresh && fresh.status === 200) cache.put(event.request, fresh.clone()); return fresh; })
        .catch(() => null);

      if (cached) {
        event.waitUntil(actualizarEnSegundoPlano);
        return cached;
      }
      return (await actualizarEnSegundoPlano) || new Response(
        '<h1>Sin conexión</h1><p>No se pudo cargar esta página y no hay una copia guardada.</p>',
        { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
      );
    })()
  );
});

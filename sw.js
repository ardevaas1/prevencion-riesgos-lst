const CACHE_NAME = 'lst-prevencion-shell-v18';
// Archivos de código/shell: cambian seguido mientras se sigue desarrollando
// la app — necesitan "network-first" (siempre intentar la versión más
// nueva) para que un cambio recién publicado se vea de inmediato con un
// solo reload, en vez de quedar pegado en una versión cacheada vieja hasta
// el SEGUNDO reload (eso fue justo lo que pasó al pasar todo a
// stale-while-revalidate: "Programas personalizados" no se veía porque el
// navegador seguía sirviendo el app.js de antes del cambio).
const ARCHIVOS_CODIGO = ['./', './index.html', './style.css', './config.js', './app.js', './manifest.json'];
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
  './plantillas/charlas/SGSST-RG-012_Silice.pdf',
  './plantillas/charlas/SGSST-RG-013_Accidente_de_Trayecto.pdf',
  './plantillas/charlas/SGSST-RG-014_Arnes_de_Seguridad.pdf',
  './plantillas/charlas/SGSST-RG-015_Calzado_de_Seguridad.pdf',
  './plantillas/charlas/SGSST-RG-016_Extintor.pdf',
  './plantillas/charlas/SGSST-RG-017_Incidente.pdf',
  './plantillas/charlas/SGSST-RG-018_Orden_y_Aseo.pdf',
  './plantillas/charlas/SGSST-RG-019_Musculos_de_Espalda_y_Huesos.pdf',
  './plantillas/charlas/SGSST-RG-020_Prevencion_de_Caidas.pdf',
  './plantillas/programas/SGSST-PER-001_Inspeccion_Observacion.pdf',
  './plantillas/programas/SGSST-PER-002_Check_List_Orden_y_Aseo.pdf',
  './plantillas/programas/SGSST-PER-003_Observacion_de_Conducta.pdf',
  './plantillas/programas/SGSST-PER-004_Inspeccion_Seguridad_Andamios.pdf',
  './plantillas/programas/SGSST-PER-005_Inspeccion_de_EPP.pdf',
  './plantillas/programas/SGSST-PER-006_Autorizacion_Trabajos_en_Altura.pdf',
  './plantillas/programas/SGSST-PER-007_Inspeccion_Elementos_de_Izaje.pdf',
  './plantillas/programas/SGSST-PER-008_Inspeccion_Seguridad_Excavacion.pdf',
  './plantillas/programas/SGSST-PER-009_Inspeccion_Seguridad_Esmeril_Angular.pdf',
  './plantillas/programas/SGSST-PER-010_Charla_de_Seguridad.pdf',
  './plantillas/programas/SGSST-PER-011_Hoja_de_Control_de_Riesgos_HCR.pdf',
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

  const esArchivoDeCodigo = event.request.mode === 'navigate'
    || ARCHIVOS_CODIGO.some((a) => url.pathname.endsWith(a.replace('./', '/')));

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      if (esArchivoDeCodigo) {
        // Network-first: intenta siempre la red primero, para que un
        // cambio recién publicado se vea con un solo reload. El caché
        // queda solo como respaldo para cuando no hay conexión.
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
      }

      // Stale-while-revalidate para el resto (PDFs de plantilla, librerías
      // vendorizadas): responde al toque con lo que haya en caché y
      // actualiza en segundo plano para la próxima carga — son archivos
      // pesados que casi no cambian, no vale la pena esperar la red cada vez.
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

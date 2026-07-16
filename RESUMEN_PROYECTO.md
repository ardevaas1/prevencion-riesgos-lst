# Resumen del proyecto — Prevención de Riesgos LST

Contexto para retomar este proyecto en Claude Code sin perder las decisiones
tomadas durante el desarrollo con Claude (chat).

## Qué es

App web (PWA) para el área de Prevención de Riesgos de Constructora LST.
Hermana de otra app ya existente ("LST Flota") de la misma empresa —
reutiliza su mismo estilo visual y arquitectura, pero es un proyecto y
repositorio de GitHub **separado**.

## Arquitectura (igual que la app de Flota)

- **Sin servidor propio.** Todo corre en el navegador: HTML/CSS/JS estático
  servido por GitHub Pages.
- **Autenticación:** Google Identity Services (OAuth 2.0), cada usuario entra
  con su propia cuenta de Google.
- **Base de datos:** Google Sheets, vía Sheets API v4, leído/escrito directo
  desde el navegador con el token OAuth del usuario (`fetchSheet`,
  `appendSheet` en `app.js`).
- **Archivos (fotos, firmas, PDFs):** Google Drive API, subida directa
  multipart desde el navegador (`uploadFileToFolder` en `app.js`), a
  subcarpetas que se crean solas la primera vez que se necesitan. Dos formas
  de resolver la carpeta destino:
  - `uploadFile(file, nombreModulo, prefijo, ext)` → sube a `Root/{nombreModulo}/`
    (una carpeta plana por módulo: `Inspecciones`, `Procedimientos`,
    `Incidentes-Accidentes` cuando el incidente no tiene trabajador asociado).
  - `uploadFileTrabajador(file, nombreTrabajador, prefijo, ext)` → sube a
    `Root/Trabajadores/{nombre del trabajador}/`, una **carpeta por
    trabajador** donde quedan juntos todos sus archivos: foto de perfil,
    contrato, examen de altura, firmas de EPP, y fotos/respaldo de
    incidentes cuando el incidente sí tiene un trabajador seleccionado.
    Decisión explícita para que Drive no se vea desordenado con todo
    mezclado por tipo de documento en vez de por persona.
  - Las carpetas antiguas `Trabajadores-Documentos` y `Entrega EPP - Firmas`
    quedaron en desuso para archivos nuevos (los que ya estaban ahí de antes
    del cambio NO se movieron, no hay migración automática).
- El Sheet y la carpeta de Drive son de **otro correo dueño** (no el mismo
  proyecto/cuenta de Google Cloud que Flota) — pero **reutiliza el mismo
  API Key / Client ID de Google Cloud** de la app de Flota (ver
  `INSTRUCCIONES_SETUP.md` para el porqué: las credenciales identifican a la
  app web, no al dueño de los datos).

## Archivos del proyecto

- `index.html` — toda la estructura: login, splash de entrada, layout móvil
  (nav inferior) y layout de escritorio (sidebar + panel central), paneles
  de formularios.
- `app.js` — toda la lógica: auth, Sheets, Drive, render de cada módulo.
- `style.css` — copiado de Flota y adaptado (mismo sistema de diseño:
  tarjetas, paneles deslizantes, badges, feedback táctil).
- `config.js` — IDs reales ya cargados (Sheet ID, Drive Folder ID, API Key,
  Client ID). **Contiene datos sensibles del cliente, cuidado si se comparte
  el repo.**
- `manifest.json`, `sw.js` — PWA (instalable en celular) + caché offline básica.
- `icon-192.png`, `icon-512.png` — ícono de la app (logo LST sobre fondo
  amarillo/naranjo, generado con Python/Pillow, no a mano).
- `logo.png`, `logo-white.png`, `logo-transparent.png` — logos LST heredados
  de Flota, cada uno usado en un lugar distinto (ver abajo).
- `APPS_SCRIPT_INIT.js` — se pega una sola vez en el Apps Script del Sheet
  nuevo para crear las 7 pestañas con encabezados. No se sube a GitHub, es
  de uso único.
- `INSTRUCCIONES_SETUP.md` — guía paso a paso de configuración inicial
  (crear Sheet, carpeta Drive, credenciales Google Cloud, GitHub Pages).

## Estructura de datos (Google Sheet, 7 pestañas)

`TRABAJADORES`, `INSPECCIONES`, `CHARLAS`, `INCIDENTES`, `PROCEDIMIENTOS`,
`ENTREGA_EPP`, `USUARIOS` (esta última creada pero sin usar todavía — pensada
a futuro para roles admin/prevencionista/viewer, no implementado).

Columnas agregadas después del lanzamiento inicial (ver `rowToX` en `app.js`
para el mapeo exacto de índices):
- `TRABAJADORES`: `Obra` (J), `Fecha Inicio Contrato` (K), `Fecha Término
  Contrato` (L, vacío = indefinido), `Archivo Contrato` (M), `Fecha Vigencia
  Examen Altura` (N), `Archivo Examen Altura` (O).
- `INSPECCIONES`: `Obra` (M).
- `INCIDENTES`: `Respaldo Cierre` (N), `Obra` (O), `Días Perdidos` (P).
- `CHARLAS`: `Relator` (H), `Obra` (I), `Hora` (J), `Riesgos` (K), `Medidas
  de Control` (L), `Asistentes` (M, texto "Nombre (Rut); Nombre (Rut)..."),
  `PDF` (N, link al documento generado). Columna `Responsable` (G) ahora se
  usa: se llena con el correo del usuario logueado al completar la charla
  (distinto del `Relator`, que es quien dicta la charla y puede no tener
  cuenta en la app).

Si el Sheet real ya existía antes de estos cambios, hay que agregar los
encabezados a mano en la fila 1 de cada pestaña (la API escribe igual aunque
falte el encabezado, pero para que se vea prolijo conviene completarlo).
"Obra" no tiene una lista fija: se detecta automáticamente leyendo los
valores ya usados en Trabajadores/Inspecciones/Incidentes, igual que el
patrón de "+ Escribir otro tipo..." de EPP (`opcionesObraSelectHTML` en
`app.js`) — cada Inspección e Incidente tiene su propia Obra (independiente
de la obra del trabajador), porque un trabajador puede rotar entre obras.
Ojo: si el select solo tiene la opción "+ Escribir otra obra..." (porque
todavía no hay ninguna Obra cargada en el Sheet), el navegador la deja
seleccionada por defecto sin disparar `onchange` — por eso `abrirForm*`
llama a `onCambioObraSelect(...)` a mano justo después de rellenar el
select, para que el input de texto quede visible desde el principio en
vez de esperar un cambio que nunca ocurre.

## Módulos de la app

1. **Inspecciones** — foto de registro. Al guardar, **genera automáticamente
   una alerta de charla** sobre el tema elegido (dropdown fijo de 12 temas)
   y la deja "Pendiente" en el módulo Charlas.
2. **Incidentes y Accidentes** — foto de registro, con Obra y Días perdidos
   (relevante para accidentes). Al guardar, un **motor de palabras clave**
   (`sugerirPlanAccion` en `app.js`, que combina `REGLAS_SUGERENCIA_CHARLA`,
   `REGLAS_SUGERENCIA_EPP`, `PALABRAS_MANTENCION` y un cruce con
   `allProcedimientos`) analiza la descripción/causas y sugiere el plan de
   acción más relacionado, en este orden de prioridad:
   1. **Reponer/entregar EPP** si el texto indica EPP dañado/faltante (ej.
      "sin guantes", "casco dañado") → botón directo a Entrega de EPP con el
      trabajador e ítem prellenados.
   2. **Derivar a mantención** si menciona herramienta/equipo en mal estado
      (ej. "esmeril dañado", "no funciona") — solo queda como aviso, la app
      no tiene módulo de mantención donde registrarlo.
   3. **Revisar procedimiento (PTS)** si el Área del incidente coincide con
      el Área de un procedimiento Vigente ya cargado.
   4. **Charla de seguridad** (motor original) como respaldo general — se
      crea automáticamente "Pendiente" en el módulo Charlas, igual que antes.
   **Importante:** sigue sin ser IA real, mismo motivo de seguridad/costos
   que antes (exponer una API key de LLM en código client-side es un riesgo
   si el repo es público). Si se quiere una sugerencia con LLM real hay que
   agregar un backend (Apps Script o Cloud Function) que guarde la key del
   lado del servidor.
   Tiene botón "Cerrar caso" (Estado Abierto → Cerrado), que abre un panel
   para adjuntar opcionalmente un **respaldo del cierre** (foto o PDF, sube
   a la misma subcarpeta de Drive `Incidentes-Accidentes`) — columna
   `Respaldo Cierre` (N) en la pestaña INCIDENTES del Sheet.
   La tarjeta de la lista muestra solo lo esencial (tipo, trabajador, fecha,
   área, gravedad, estado); al tocarla se abre una **ficha de detalle**
   (`abrirDetalleIncidente` en `app.js`, panel `panel-detalle-incidente`)
   con todos los campos — descripción, causas, obra, días perdidos, acciones
   correctivas, fecha de registro, quién lo reportó, foto y respaldo — y ahí
   vive el botón "Cerrar caso" (se sacó de la tarjeta de la lista).
3. **Procedimientos de Trabajo Seguro** — sube PDF a Drive.
4. **Entrega de EPP** — **checklist tipo menú**: se muestran todos los tipos
   de EPP con checkbox + cantidad al lado, se marcan los que correspondan
   (varios a la vez) y se firma una vez al final → se guarda una fila por
   ítem marcado en el Sheet, todas compartiendo la misma firma
   (`recolectarItemsEpp` en `app.js`). Se reemplazó el flujo anterior de
   "carrito" (agregar ítem por ítem, uno a la vez) por este checklist directo
   porque es más rápido para marcar varios ítems de una entrega. Tiene campo
   "+ Escribir otro tipo..." — los tipos personalizados quedan disponibles
   solos en el checklist la próxima vez (se detectan leyendo el historial ya
   guardado, no hay una lista separada que mantener). `abrirFormEpp(item,
   trabajador)` acepta parámetros opcionales de prellenado, usados por la
   sugerencia de "reponer EPP" de Incidentes.
5. **Trabajadores** — alta de nómina, con Obra. Al tocar un trabajador se abre
   su **ficha con historial**: EPP entregado, incidentes relacionados, y dos
   secciones nuevas — **Contrato de trabajo** (fecha inicio/término o
   "Indefinido", badge Vigente/Vencido, subir/ver PDF) y **Examen de altura
   física** (fecha de vigencia, badge Vigente/Vencido, subir/ver PDF) — cada
   una con su propio panel de edición (`panel-editar-contrato` /
   `panel-editar-altura`). Replica el patrón de ficha de equipo de Flota.
6. **Charlas de Seguridad** — lista de alertas generadas (por inspecciones o
   incidentes), con botón "Marcar realizada".

Inspecciones también tiene botón "Cerrar inspección" (Abierta → Cerrada).

## Dashboard: estadísticas de seguridad (Inicio)

En la pantalla de Inicio (mobile y desktop), arriba de "Módulos", hay un
selector de **Obra** ("Todas las obras" + cada obra detectada) y 3
indicadores (`calcularEstadisticasSeguridad` en `app.js`), con las fórmulas
estándar de Mutualidad/DS40:

- **Tasa de Accidentabilidad** = (N° accidentes con tiempo perdido / N°
  trabajadores activos de la obra) × 100
- **Índice de Frecuencia** = (N° accidentes con tiempo perdido / Horas
  Hombre Trabajadas) × 1.000.000
- **Índice de Gravedad** = (N° días perdidos / Horas Hombre Trabajadas) ×
  1.000.000

Se consideran "accidente con tiempo perdido" los Incidentes con tipo
`Accidente Leve/Grave/Fatal` (no cuentan Cuasiaccidente ni Incidente).
"Días perdidos" es el campo manual que se ingresa al registrar el incidente.

**Horas Hombre Trabajadas** se estima a partir de la vigencia del contrato
de cada trabajador (Fecha Inicio/Término en su ficha) × una jornada diaria
estándar (`HORAS_JORNADA_DIARIA = 8`, ajustable en `app.js`) — la app no
registra asistencia real, así que esto es una aproximación explícitamente
decidida así (no hay otra fuente de horas trabajadas). Si un trabajador
activo no tiene fecha de inicio de contrato cargada, sus horas no se cuentan
y aparece un aviso bajo los indicadores avisando cuántos trabajadores están
en esa situación.

El período de cálculo es **acumulado del año calendario actual** (1 de enero
a hoy) — no hay selector de rango de fechas, es una decisión para mantenerlo
simple; si más adelante se quiere comparar años o meses hay que agregar un
selector de período además del de obra.

Cada Inspección e Incidente tiene su propia Obra (no se hereda del
trabajador involucrado), pero las Horas Hombre se calculan agrupando
Trabajadores por su propia Obra — o sea, la Obra de un trabajador y la Obra
de un incidente son campos independientes que hay que llenar por separado.

Los 3 índices se muestran como **gráfico de barras** (`graficoIndice` en
`app.js`), comparando el acumulado del año actual contra el mismo período
(1 de enero → hoy) del año anterior — barra tenue = año anterior, barra
sólida = año actual, altura normalizada al mayor de los dos valores.
`calcularEstadisticasSeguridad(obraSel, offsetAnios)` acepta un offset de
años para poder calcular ambos períodos con la misma lógica.

## Generación de PDFs rellenados (Charla de 5 min)

El cliente entregó un PDF real de "Charla Diaria de Seguridad" (formato
D.S. 44/2024) y pidió que la app junte los datos y genere ese mismo
documento ya lleno, con firmas, listo para archivar. Es la primera de tres
plantillas pedidas (Charla, Investigación de Accidente, HCR) — se implementó
primero Charla como prueba de concepto antes de replicar el patrón en las
otras dos (**pendiente**, ver abajo).

- **El PDF original NO tiene campos de formulario rellenables** (es plano,
  probablemente exportado de Word) — no hay AcroForm/Widgets. Por eso no se
  puede "rellenar" en el sentido típico: se **dibuja texto y firmas encima**
  de la plantilla, en las coordenadas exactas de cada campo. Esas coordenadas
  se midieron a mano con `pdfplumber` (extrae `x0/top/x1/bottom` de cada
  palabra y línea de la tabla) sobre el PDF de ejemplo que mandó el cliente,
  no hay forma de que la app las calcule solas — si el cliente cambia el
  diseño del PDF en el futuro, hay que volver a medir coordenadas.
- **Librería:** `pdf-lib`, **empaquetada localmente** en `vendor/pdf-lib.min.js`
  (no CDN) para que funcione offline como el resto de la PWA y para que el
  Service Worker la pueda cachear (`sw.js` solo cachea same-origin). Expone
  el global `PDFLib` (`PDFDocument`, `rgb`, `StandardFonts`).
- **Plantilla:** `plantillas/charla_5min.pdf`, se carga con `fetch()` en el
  momento de generar el documento (también precacheada por el Service Worker).
- **Pie de página de la plantilla original** ("LUIS ANDRES SAEZ THIELEMAN ~
  RUT...", branding de quien generó el PDF de origen, no de LST) se tapa con
  un rectángulo blanco en cada página al generar — decisión explícita del
  cliente, no debe aparecer en los documentos de la app.
- **Fecha del encabezado** ("Fecha:" arriba a la derecha): la plantilla ya
  trae una fecha impresa (de cuando se exportó el PDF de muestra) — se tapa
  y se reescribe con la fecha real de generación en cada documento nuevo.
- **Dos formas de entrar al flujo:** botón "Marcar realizada" de una charla
  "Pendiente" generada automáticamente (`abrirRealizarCharla(fila)`, al
  terminar actualiza esa misma fila de `CHARLAS`), o botón "+" en el módulo
  Charlas para una **charla hecha por iniciativa propia**, sin que una
  Inspección o Incidente la haya disparado (`abrirNuevaCharla()`, al
  terminar agrega una fila nueva completa con `Origen = Manual`). Mismo
  formulario y mismo flujo de firmas en ambos casos — `charlaEnProceso.fila`
  es `null` en el caso manual, eso es lo que decide en `finalizarCharla()`
  si hay que hacer `PUT` (actualizar) o `appendSheet` (fila nueva).
- **Flujo en la app:**
  1. `panel-realizar-charla`: Relator + firma del relator, Obra, Fecha/Hora,
     Tema (prellenado con el tema de la alerta si viene de una pendiente,
     vacío con placeholder de ejemplo si es manual), Riesgos, Medidas de
     control, y checklist de asistentes (nómina de trabajadores activos,
     multi-selección tipo EPP).
  2. `panel-firmar-asistente`: firma en cadena, uno por uno — muestra nombre
     y RUT del asistente actual con un canvas grande, botones "Firmar y
     continuar" o "Saltar (sin firma)". Se repite hasta terminar la lista.
  3. `generarYSubirPdfCharla`: genera el PDF (texto envuelto en las líneas
     disponibles de Tema/Riesgos/Medidas vía `wrapLines`/`textBlock`, firmas
     como imágenes PNG embebidas desde el canvas), lo sube a Drive en la
     carpeta de módulo `Charlas`, y guarda el link + todos los datos en la
     fila de la hoja `CHARLAS` (marca `Estado = Realizada`).
  - Tabla de asistentes: filas 1-12 en página 1, 13-35 en página 2 de la
    plantilla (35 firmas máximo — si hay más asistentes que eso, los que
    sobran simplemente no se dibujan, no hay página adicional dinámica).
  - Firma del relator y de cada trabajador se capturan con el mismo pad de
    firma que ya usaba EPP (`initFirmaPad(canvasId)`, ahora recibe el id del
    canvas porque hay tres paneles distintos con su propio `<canvas>`:
    `firma-canvas` de EPP, `firma-canvas-relator`, `firma-canvas-asistente`).
- Las clases CSS del checklist (`.chk-row`, `.chk-row-label`,
  `.chk-row-checkbox-wrap`, `.chk-row-checkbox`) se generalizaron desde
  `.epp-item-*` para reutilizarlas también en el checklist de asistentes de
  Charla — cualquier lista futura de "marcar varios de una nómina" puede
  reusar el mismo patrón.

## Decisiones de diseño visuales (por qué se ve como se ve)

- **Color principal:** `#e58d17` (naranjo/amarillo vivo), con `--accent-dark:
  #9b570c` y gradientes que van de `#c06f0a` a `#ffb462`. Se probó primero un
  mostaza oscuro y luego se ajustó a este tono porque el cliente lo pidió
  "más vivo, sin sombreado negro" — evitar volver a meter tonos casi negros
  (`#4d2a08` fue descartado) en los gradientes de headers.
- Los íconos de los 6 módulos en Inicio usan **colores distintos entre sí**
  (azul, rojo, café, verde, naranjo — clases `.modulo-icon--flota/and/cont/
  mov/inv`, heredadas de Flota) — el cliente prefirió esto a que todos fueran
  del mismo color. Los íconos dentro son **blancos** (`color:#fff` en
  `.modulo-icon`) para contraste.
- Las tarjetas de las listas (Trabajadores, Inspecciones, Incidentes,
  Procedimientos, EPP, Charlas) reutilizan ese mismo ícono + color por
  módulo dentro de un cuadrado `.card-icon` (36px, antes solo se usaba en
  Flota y quedaba sin usar acá) — cada tarjeta ahora se ve como una mini
  versión de su tile de Inicio en vez de solo texto plano.
- **Sin emojis en ningún lado** — todos los íconos son SVG de línea estilo
  Flota (`stroke="currentColor"`, viewBox 24x24, sin relleno), definidos como
  constantes `ICONS` en `app.js` + inline en `index.html`.
- **Fuente:** Inter, cargada desde Google Fonts — si se nota "distinta" a
  Flota, revisar que el `<link>` de fonts.googleapis.com esté presente en
  `<head>` (se había olvidado una vez y se notaba).
- **Logo del login:** `logo-white.png` (el mismo que usa Flota en su login),
  NO `logo-transparent.png` ni `logo.png` — se probaron los otros dos y no
  gustaron (uno se veía con fondo blanco feo, el otro medio verde).
- **Ícono de instalación (PWA):** generado con Python/Pillow componiendo
  `logo-white.png` sobre un fondo cuadrado redondeado con el gradiente de
  marca — el objetivo explícito es que se vea **distinto al ícono de Flota**
  en la pantalla de inicio del celular, para no confundirlas.

## Decisiones de comportamiento

- **Login automático tipo Flota:** primera vez pide elegir cuenta de Google
  (`prompt: 'select_account'`). Después, mientras no se cierre sesión, se
  reconecta sola en segundo plano (`prompt: '', login_hint: email guardado`)
  cada vez que el token expira — el usuario nunca vuelve a ver el selector de
  cuentas salvo que toque "Cerrar sesión" (con confirmación). Flag clave:
  `localStorage['lst_pr_had_login']`.
- **Splash de entrada:** al arrancar, se muestra una pantalla con logo +
  barra de progreso (`splash()` en `app.js`) mientras carga el Sheet, y la
  app aparece con una animación de fade/scale (`.app-enter`) — se pidió
  explícitamente evitar que la interfaz "apareciera de golpe".
- **Paneles (formularios) con slide real:** usan la técnica de doble
  `requestAnimationFrame` + transform inline (`openPanel`/`closePanel` en
  `app.js`) porque con solo CSS `:not(.hidden)` el navegador saltaba
  directo al estado final sin animar.
- **Feedback táctil:** todo elemento clickeable debe sentirse "presionado".
  Los botones grandes (tarjetas, FAB) ya lo tenían con `transform:
  scale(0.96)`; se agregó explícitamente un resaltado de **fondo** a
  elementos de texto/ícono pequeños (`.pnl-back`, `.nav-item`,
  `.desktop-nav-item`, `.desktop-refresh-btn`) porque el scale solo no se
  notaba en ellos.
- **Botones "Cerrar" (`action-btn`) van DENTRO de `.card-body`**, no como
  hermano — si van como hermano, `.card` (que es `display:flex;
  align-items:center`) los pone en fila en vez de apilarlos debajo del
  contenido. Ojo si se agregan más botones de acción a futuro.

## Layout de escritorio (≥900px)

Sidebar fijo a la izquierda (`#desktop-sidebar`, clase `.dt-oculto` cuando
no hay sesión) + panel central (`#desktop-main`) con las mismas listas que
la vista móvil, alimentadas por los mismos datos vía atributo `data-list`
(función `setListHTML(nombre, html)` actualiza **todos** los elementos con
ese `data-list`, sea la versión móvil o la de escritorio — evita duplicar
lógica de render). Los formularios se abren como panel lateral (drawer)
con overlay oscuro detrás, en vez de pantalla completa.

## Pendiente / ideas no implementadas

- Roles de usuario (hoja `USUARIOS` existe pero no se usa para permisos).
- Sugerencia de charlas/plan de acción con IA real (actualmente es motor de
  palabras clave por las razones de seguridad explicadas arriba).
- Grupos de EPP en la lista se arman por coincidencia exacta de
  `fecha+trabajador+firma` — si dos entregas distintas del mismo trabajador
  caen el mismo día, podrían agruparse por error (caso borde no resuelto).
- Selector de período en el dashboard de estadísticas (hoy es fijo: acumulado
  del año calendario actual).
- Horas Hombre Trabajadas es una aproximación (jornada estándar × vigencia de
  contrato), no asistencia real — si se necesita mayor precisión habría que
  agregar registro de asistencia/turnos.
- La sugerencia de "Derivar a mantención" (Incidentes) es solo un aviso: la
  app no tiene un módulo de mantención donde registrar/hacer seguimiento del
  equipo derivado.
- **Generación de PDF para Investigación de Accidente**: pendiente, mismo
  patrón que Charla (coordenadas medidas a mano + `pdf-lib`). El cliente
  pidió que se dispare automáticamente al registrar cualquier accidente
  (sin importar su categoría) — falta definir el disparador exacto y medir
  coordenadas del PDF real entregado (`investigacion_de_accidente.pdf`),
  documento mucho más denso que Charla (~60 campos, muchos checkboxes).
- **Módulo nuevo HCR (Hoja de Control de Riesgos)**: pendiente, el cliente
  pidió que sea un módulo separado del resto, con el mismo mecanismo de
  generar PDF (más de 100 checkboxes en 4 páginas — el más grande de los
  tres documentos, con diferencia).

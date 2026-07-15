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
  multipart desde el navegador (`uploadFile` en `app.js`), a subcarpetas que
  se crean solas la primera vez que se necesitan.
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

## Módulos de la app

1. **Inspecciones** — foto de registro. Al guardar, **genera automáticamente
   una alerta de charla** sobre el tema elegido (dropdown fijo de 12 temas)
   y la deja "Pendiente" en el módulo Charlas.
2. **Incidentes y Accidentes** — foto de registro. Al guardar, un **motor de
   palabras clave** (`REGLAS_SUGERENCIA_CHARLA` en `app.js`) analiza la
   descripción/causas y sugiere automáticamente una charla relacionada (ej.
   "desorden" → *Orden y limpieza*). **Importante:** esto NO es una llamada a
   una API de IA real — se decidió así a propósito porque exponer una API
   key de un modelo de IA en código client-side (público en GitHub) sería
   un riesgo de seguridad/costos. Si en algún momento se quiere una sugerencia
   con LLM real, hay que agregar un backend (Apps Script o Cloud Function)
   que guarde la key del lado del servidor.
   Tiene botón "Cerrar caso" (Estado Abierto → Cerrado), que abre un panel
   para adjuntar opcionalmente un **respaldo del cierre** (foto o PDF, sube
   a la misma subcarpeta de Drive `Incidentes-Accidentes`) — columna nueva
   `Respaldo Cierre` (N) en la pestaña INCIDENTES del Sheet. Si el Sheet ya
   existe en producción, hay que agregar el encabezado a mano en la celda
   N1 (la API lo escribe igual aunque falte, pero para que se vea prolijo).
3. **Procedimientos de Trabajo Seguro** — sube PDF a Drive.
4. **Entrega de EPP** — permite **varios ítems en una sola entrega** (carrito:
   agregar ítem + cantidad, repetir, firmar una vez al final → se guardan
   varias filas en el Sheet compartiendo la misma firma). Tiene opción
   "+ Escribir otro tipo..." — los tipos personalizados quedan disponibles
   solos en el dropdown la próxima vez (se detectan leyendo el historial ya
   guardado, no hay una lista separada que mantener).
5. **Trabajadores** — alta de nómina. Al tocar un trabajador se abre su
   **ficha con historial** (EPP entregado + incidentes relacionados),
   replicando el patrón de ficha de equipo de Flota.
6. **Charlas de Seguridad** — lista de alertas generadas (por inspecciones o
   incidentes), con botón "Marcar realizada".

Inspecciones también tiene botón "Cerrar inspección" (Abierta → Cerrada).

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
- Sugerencia de charlas con IA real (actualmente es motor de palabras clave
  por las razones de seguridad explicadas arriba).
- Grupos de EPP en la lista se arman por coincidencia exacta de
  `fecha+trabajador+firma` — si dos entregas distintas del mismo trabajador
  caen el mismo día, podrían agruparse por error (caso borde no resuelto).

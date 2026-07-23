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
  - **Bug de Sheets, no de la app:** cada vez que se agrega una fila nueva
    por la API, Google Sheets le extiende el formato del encabezado (verde
    con letra blanca/negrita) a esa fila — pasa siempre, no es algo que
    ocurrió una sola vez. `appendSheet` ahora limpia el formato de la fila
    recién escrita en cada llamada (`limpiarFormatoFilaNueva`, deja fondo
    blanco y letra negra normal), en vez de solo una vez al ejecutar
    `APPS_SCRIPT_INIT.js` (que sigue sirviendo para limpiar filas viejas de
    antes de este fix, pero no evitaba que las nuevas volvieran a salir
    verdes). Como la API de formato pide el `sheetId` numérico (no el
    nombre de la pestaña), se cachea un mapeo nombre→ID la primera vez
    (`obtenerSheetIds`). Se dispara sin esperar la respuesta (fire-and-forget,
    envuelto en try/catch) para no demorar el guardado por algo puramente
    estético.
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
- `APPS_SCRIPT_INIT.js` — se pega en el Apps Script del Sheet para crear las
  13 pestañas con encabezados. Es seguro volver a ejecutarlo cuando se agregan
  columnas/pestañas nuevas (no borra datos existentes).
- `APPS_SCRIPT_WEBAPP_SUBCONTRATISTAS.js` — **opcional**: Web App de Apps
  Script que evita tener que darle acceso de Editor del Sheet/Drive a cada
  cuenta subcontratista (ver "Módulo Subcontratistas" más abajo). Se
  despliega aparte (no se pega junto con `APPS_SCRIPT_INIT.js`, aunque puede
  vivir en el mismo proyecto de Apps Script), y su URL se pega en
  `config.js` → `SUBCONTRATISTAS_WEBAPP_URL`.
- `INSTRUCCIONES_SETUP.md` — guía paso a paso de configuración inicial
  (crear Sheet, carpeta Drive, credenciales Google Cloud, GitHub Pages).
- `plantillas/` — PDFs originales del cliente usados como base para la
  generación de documentos (`charla_5min.pdf`, `investigacion_accidente.pdf`,
  `hcr.pdf`, `diat.pdf`), cacheados por el Service Worker. La Declaración de
  rechazo de atención médica es la única que NO usa plantilla (se genera en
  blanco desde cero). `plantillas/charlas/` — biblioteca de charlas ya
  escritas del cliente (ver "Plantillas de Charla" más abajo).
- `vendor/pdf-lib.min.js` — librería `pdf-lib` empaquetada localmente (no
  CDN) para generación de PDF offline.
- `vendor/pdf.min.mjs` + `vendor/pdf.worker.min.mjs` — pdf.js (Mozilla),
  empaquetado localmente, usado solo para **leer** texto de las charlas de
  la biblioteca (pdf-lib solo sabe escribir) — ver "Plantillas de Charla"
  más abajo.

## Estructura de datos (Google Sheet, 13 pestañas)

`TRABAJADORES`, `INSPECCIONES`, `CHARLAS`, `INCIDENTES`, `INVESTIGACIONES`,
`HCR`, `DIAT`, `PROCEDIMIENTOS`, `ENTREGA_EPP`, `USUARIOS`, `SUBCONTRATISTAS`,
`SUBCONTRATISTAS_DOCS`.

`USUARIOS` (`Email`, `Rol`, `Nombre`, `Empresa`) estaba creada pero sin usar
desde el lanzamiento inicial — recién con el módulo Subcontratistas se
empezó a leer de verdad: una fila con `Rol="subcontratista"` (y `Empresa`
con el nombre de la empresa) activa el modo restringido para ese correo (ver
"Módulo Subcontratistas" más abajo). Los roles `admin`/`prevencionista`/
`viewer` siguen sin aplicar restricciones — cualquier correo que NO
aparezca en `USUARIOS`, o que aparezca con otro Rol, tiene acceso normal
completo a la app (compatibilidad con todo el personal actual, que nunca
estuvo en esta hoja).

Columnas agregadas después del lanzamiento inicial (ver `rowToX` en `app.js`
para el mapeo exacto de índices):
- `TRABAJADORES`: `Obra` (J), `Fecha Inicio Contrato` (K), `Fecha Término
  Contrato` (L, vacío = indefinido), `Archivo Contrato` (M), `Fecha Vigencia
  Examen Altura` (N), `Archivo Examen Altura` (O), `Es Supervisor` (P, "Sí"
  o vacío) — ver "Supervisor de obra" en Módulos de la app. `Fecha
  Nacimiento` (Q), `Sexo` (R), `Nacionalidad` (S), `Dirección` (T), `Comuna`
  (U), `Teléfono` (V), `Pueblo Originario` (W), `Tipo Contrato` (X), `Tipo
  Ingreso` (Y), `Categoría Ocupacional` (Z) — datos personales estáticos
  (no cambian entre incidentes), ver "Datos personales del trabajador
  (prellenado de DIAT/Investigación)" más abajo.
- `INSPECCIONES`: `Obra` (M).
- `INCIDENTES`: `Respaldo Cierre` (N), `Obra` (O), `Días Perdidos` (P),
  `Investigación Estado` (Q), `Investigación Responsable` (R), `Investigación
  Fecha` (S), `Investigación PDF` (T), `Atención Médica Estado` (U),
  `Atención Médica PDF` (V) — ver secciones "Generación de PDFs rellenados
  (Investigación de Accidente)" y "...(DIAT / Declaración)" más abajo.
- `INVESTIGACIONES`: pestaña nueva completa (46 columnas, `A:AT`), ver
  sección "Generación de PDFs rellenados (Investigación de Accidente)".
- `DIAT`: pestaña nueva completa (53 columnas, `A:BA`), ver sección
  "Generación de PDFs rellenados (DIAT / Declaración)".
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
   `REGLAS_SUGERENCIA_EPP` y `PALABRAS_MANTENCION`) analiza la descripción/
   causas y sugiere el plan de acción más relacionado, en este orden de
   prioridad:
   1. **Reponer/entregar EPP** si el texto indica EPP dañado/faltante (ej.
      "sin guantes", "casco dañado") → botón directo a Entrega de EPP con el
      trabajador e ítem prellenados.
   2. **Derivar a mantención** si menciona herramienta/equipo en mal estado
      (ej. "esmeril dañado", "no funciona") — solo queda como aviso, la app
      no tiene módulo de mantención donde registrarlo.
   3. **Charla de seguridad** (motor original) como respaldo general — se
      crea automáticamente "Pendiente" en el módulo Charlas, igual que antes.
   **Se sacó** la sugerencia de "Revisar procedimiento (PTS)" que cruzaba
   el Área del incidente con el Área de un procedimiento Vigente
   (`sugerirProcedimientoRelacionado`, ya no existe) — el cliente pidió
   quitarla porque el calce era solo texto plano (`includes()` en ambos
   sentidos, sin lista fija de áreas) y podía sugerir el procedimiento
   equivocado cuando dos PTS compartían palabras parecidas en su campo
   Área.
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
   **Atención médica e investigación de accidente:** si el tipo es
   `Accidente Leve/Grave/Fatal`, al guardar queda automáticamente
   `Atención Médica Estado = Pendiente` — tarjeta y ficha muestran badge
   "Atención médica: por definir" y botón "Definir atención médica" que
   pregunta si el trabajador necesita atención médica: si Sí, abre el
   formulario de la DIAT; si No, abre la declaración simple de rechazo.
   Recién al resolver esa pregunta (cualquiera de las dos opciones) se
   marca `Investigación Estado = Pendiente` y aparece el botón "Realizar
   investigación" — la investigación queda deliberadamente supeditada a
   resolver primero la atención médica. Ver sección de PDFs más abajo. No
   se fuerza a completar nada al momento del registro, igual que las
   alertas de Charla.
3. **Procedimientos de Trabajo Seguro** — sube PDF a Drive. Tiene buscador
   solo por nombre del PTS (`onBuscarProcedimientos` en `app.js`) — al
   principio filtraba también por código y área, pero como muchos PTS
   comparten la misma área (ej. "Autocontrol"), buscar algo como "jornal"
   traía casi todos los procedimientos de esa área en vez de encontrar el
   específico.
4. **Entrega de EPP** — **checklist tipo menú**: se muestran todos los tipos
   de EPP con checkbox + cantidad al lado, se marcan los que correspondan
   (varios a la vez) y se firma una vez al final → se guarda **una sola fila
   por entrega** en el Sheet, con todos los ítems juntos en la columna "EPP
   Entregado" (ej. "Casco (1); Guantes (2)"), igual que "Asistentes" en
   Charlas (`recolectarItemsEpp` + `itemsDeFilaEpp` en `app.js`). Antes cada
   ítem marcado generaba su propia fila (misma fecha/trabajador/firma
   repetidos en todas), así que una sola entrega de 3 ítems se veía como 3
   entregas separadas tanto en el Sheet como en los listados de la app — el
   cliente pidió juntarlas. La columna "Cantidad" queda vacía en las filas
   nuevas (la cantidad ahora va embebida en el texto de cada ítem);
   `itemsDeFilaEpp(fila)` sabe leer ambos formatos (separa la celda
   combinada nueva, o toma ítem+cantidad de las columnas separadas si es
   una fila antigua de antes de este cambio) — de ahí lo usan tanto
   `opcionesEppDisponibles()` (catálogo de tipos, para que no se cuele el
   texto combinado como si fuera un tipo de EPP) como el listado y la ficha
   del trabajador (que igual mantienen su agrupado por fecha+trabajador+
   firma, ahora solo relevante para leer filas antiguas). Se reemplazó el
   flujo anterior de "carrito" (agregar ítem por ítem, uno a la vez) por
   este checklist directo porque es más rápido para marcar varios ítems de
   una entrega. Tiene campo "+ Escribir otro tipo..." — los tipos
   personalizados quedan disponibles solos en el checklist la próxima vez
   (se detectan leyendo el historial ya guardado, no hay una lista separada
   que mantener). `abrirFormEpp(item, trabajador)` acepta parámetros
   opcionales de prellenado, usados por la sugerencia de "reponer EPP" de
   Incidentes — **ojo**: como el botón `+` (FAB) asigna la función directo a
   `onclick`, el navegador le pasa el `PointerEvent` del clic como
   `prefillItem` si no se envuelve en una función sin argumentos (bug real
   que hacía aparecer el texto "[object PointerEvent]" en el campo "+
   Escribir otro tipo..." al abrir el formulario con el botón +, ya
   corregido en `irPagina()` en `index.html`).
   El archivo de la firma (a diferencia de Charla/HCR/Investigación, acá no
   va dentro de un PDF con más contexto alrededor — es la única firma de la
   app que se sube como imagen suelta) se compone con `firmaConIdentificacion`
   antes de subirse: agrega "Nombre — RUT" en una franja blanca debajo del
   trazo, para que quien abra el archivo directo sepa de quién es sin tener
   que cruzarlo con la fila del Sheet.
5. **Trabajadores** — alta de nómina, con Obra. **La lista se ordena
   alfabéticamente por nombre** (`localeCompare('es')`, ignorando
   tildes/mayúsculas — Ñ queda entre N y O, como corresponde en español),
   agrupada con un encabezado de letra pegajoso (`position: sticky`) que
   queda fijo arriba mientras se hace scroll por ese grupo. Al lado, un
   **índice A-Z fijo** (`.az-index`, mismo patrón que Contactos/WhatsApp)
   permite saltar directo a una letra — las letras sin ningún trabajador
   quedan atenuadas y no son clickeables. Si se filtra por el buscador, el
   índice y los encabezados se recalculan sobre el resultado filtrado. Al
   tocar un trabajador se abre
   su **ficha con historial**: EPP entregado, incidentes relacionados, y dos
   secciones nuevas — **Contrato de trabajo** (fecha inicio/término o
   "Indefinido", badge Vigente/Vencido, subir/ver PDF) y **Examen de altura
   física** (fecha de vigencia, badge Vigente/Vencido, subir/ver PDF) — cada
   una con su propio panel de edición (`panel-editar-contrato` /
   `panel-editar-altura`). Replica el patrón de ficha de equipo de Flota.
   **Supervisor de obra:** un trabajador se puede marcar como supervisor
   (checkbox al crearlo, o botón "Marcar como supervisor de esta obra" /
   "Quitar rol de supervisor" en su ficha — `toggleSupervisor` en `app.js`).
   No hay asignación individual de a quién supervisa: **un supervisor queda
   a cargo automáticamente de todos los trabajadores Activos de su misma
   Obra** (`supervisorDeObra(obra)` / `trabajadoresACargoDe(supervisor)` en
   `app.js`), mismo patrón simple de "Obra" que ya usa el resto de la app —
   decisión tomada para no tener que mantener una lista de asignaciones
   aparte. Efectos concretos de marcar a alguien como supervisor:
   - Su ficha muestra la sección **"Trabajadores a cargo"**: lista de sus
     compañeros de obra con la cantidad de incidentes abiertos de cada uno,
     y el total histórico del equipo.
   - La ficha de cada trabajador a su cargo muestra "Supervisado por
     [nombre]".
   - Al **registrar una Charla** y elegir la Obra, si esa obra tiene
     supervisor su nombre se sugiere automáticamente como Relator (solo si
     el campo estaba vacío, no pisa algo ya escrito) — `onCambioObraCharla`
     en `app.js`.
   - El **detalle de un Incidente** muestra quién es el "Supervisor
     responsable" (según la Obra del trabajador involucrado).
   - **No hay control de acceso/permisos real todavía** (la hoja `USUARIOS`
     sigue sin usarse para eso, ver "Pendiente" más abajo) — "tener la
     facultad de hacer charlas" se implementó como sugerencia/prellenado,
     no como restricción de quién puede crear una Charla en la app;
     cualquiera logueado puede seguir haciéndolo igual que antes.
6. **Charlas de Seguridad** — lista de alertas generadas (por inspecciones o
   incidentes), con botón "Marcar realizada".
7. **Hoja de Control de Riesgos (HCR)** — módulo completamente separado del
   resto (a pedido explícito del cliente), sin relación con Incidentes ni
   Charlas. Ver sección "Generación de PDFs rellenados (HCR)" más abajo.
8. **Subcontratistas** — para que empresas subcontratistas suban su propia
   documentación (Carpeta de Empresa, Control Mensual, Control de
   Herramientas). Cada empresa tiene su propia cuenta restringida, que
   **no** puede entrar a ningún otro módulo ni ver los documentos de otra
   empresa. Ver sección "Módulo Subcontratistas" más abajo.

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

## Plantillas de Charla (biblioteca de charlas ya escritas del cliente)

El cliente tiene ~48 charlas reales ya redactadas (formato oficial "CHARLA
DE SEGURIDAD", D.S. 44/2024 — distinto del formato genérico "Charla Diaria
de Seguridad" de `charla_5min.pdf` usado en "Escribir desde cero"), cada una
con su propio código (ej. `SGSST-RG-001`) y su Tema/Riesgos/Medidas ya
escritos dentro del documento (en una tabla Significado/Factores de
riesgo/Recomendaciones), más un casillero `OBRA/TEMA/ACTIVIDAD/DICTADA
POR/FECHA/DURACION/FIRMA` y una tabla `NOMBRE/RUT/FIRMA` de asistentes, todo
en blanco. El pedido: que la app use esos archivos reales y que, al elegir
uno para dictar una charla, pida **solo** los datos que ese documento deja
en blanco — no volver a escribir contenido que ya existe, y que las firmas
queden dibujadas en el mismo documento, no en una hoja aparte.

**Tres versiones descartadas** antes de llegar al diseño actual (quedan
documentadas porque explican por qué el diseño es como es):
1. Cargaba el PDF subido tal cual y le agregaba una página nueva al final
   con la hoja de asistencia y firmas — el cliente corrigió que las firmas
   debían quedar en el mismo formato de la charla, no en una hoja aparte.
2. El usuario escribía Tema/Riesgos/Medidas a mano una vez al subir la
   plantilla (reutilizando el mismo `charla_5min.pdf` genérico para
   generar) — al mostrarle archivos reales del cliente, quedó claro que las
   48 charlas ya vienen completamente escritas y con **su propio** formato
   oficial (no el genérico de la app), así que ni siquiera hay que escribir
   Tema/Riesgos/Medidas: hay que leer/usar el archivo real tal cual y
   dibujar sobre él.
3. Cada usuario podía subir charlas nuevas desde la app (formulario "Subir
   charla" con archivo → Google Drive/Sheets). El cliente pidió quitar esa
   función: las charlas del catálogo las maneja él (te las manda a ti, el
   desarrollador) y no deben poder agregarse desde el celular de cualquiera
   — solo "Escribir desde cero" queda libre, para una charla puntual que no
   está en el catálogo. Ver diseño actual abajo.

**Diseño actual — catálogo estático en el repo, coordenadas ubicadas
dinámicamente:**

- **Los PDFs son archivos del proyecto**, no contenido subido por el
  usuario: viven en `plantillas/charlas/` (ej.
  `SGSST-RG-001_Maquinaria_Pesada.pdf`) y están listados a mano en el array
  `CHARLAS_BIBLIOTECA` en `app.js` (`{ codigo, nombre, archivo }`). Para
  agregar una charla nueva que mande el cliente: copiar el PDF a esa carpeta,
  agregar su fila al array, y agregar la ruta a `APP_SHELL` en `sw.js` para
  que quede cacheada offline. No depende de Google Sheets ni Drive para
  nada — se lee con `fetch()` directo, igual que `charla_5min.pdf`.
- **Panel "Charlas ya subidas"** (`abrirPlantillasCharla` /
  `renderPlantillasCharla`) es de solo lectura: lista `CHARLAS_BIBLIOTECA`
  con un link "Ver archivo" a cada PDF. No tiene botón "+" ni existe ya un
  formulario de subida — la única forma de agregar una charla al catálogo es
  que el desarrollador la agregue al código.
- **Al realizar una charla:** un `<select>` opcional "Cargar desde una
  charla ya subida" (`poblarSelectorPlantillaCharla`, listado por Código —
  Nombre, sourced de `CHARLAS_BIBLIOTECA`). Elegir una oculta el bloque
  Hora/Tema/Riesgos/Medidas (`grupo-charla-desde-cero`, no aplican — ya
  están en el documento) y muestra Cargo del relator/Actividad/Duración
  (`grupo-charla-plantilla-real`, los campos que el documento real sí deja
  en blanco). Volver a "— Escribir desde cero —" hace lo inverso, para una
  charla que no está en el catálogo (usa `generarYSubirPdfCharla` sobre
  `charla_5min.pdf`, sin cambios respecto al diseño original). En ambos
  modos el flujo de firma en cadena de asistentes (`panel-firmar-asistente`)
  es idéntico y obligatorio.
- **Coordenadas ubicadas dinámicamente, no fijas:** al medir varios archivos
  reales del cliente se confirmó que todos comparten el mismo layout, pero
  la posición exacta de cada campo varía unos pocos puntos entre documentos
  — e incluso entre páginas de un mismo documento (ej. la etiqueta de firma
  del relator aparece como `"FIRMA"` en una página y `"FIRMA:"` en otra del
  mismo PDF). Coordenadas fijas (medidas a mano, como se hizo para
  DIAT/Investigación/HCR/Charla genérica) no son confiables acá porque cada
  archivo lo redactó una persona distinta en Word. La solución: **leer el
  texto real de cada PDF al momento de generar** y ubicar cada campo por su
  etiqueta, en vez de asumir píxeles fijos.
  - `vendor/pdf.min.mjs` + `vendor/pdf.worker.min.mjs` (pdf.js de Mozilla,
    vendorizados igual que `pdf-lib.min.js` — cacheados por el Service
    Worker). Primera vez que la app necesita **leer** texto de un PDF (todo
    lo anterior con pdf-lib es solo escritura) — pdf-lib no tiene esa
    capacidad. Se carga con `import()` dinámico (`cargarPdfJs()`) porque
    `app.js` es un script clásico, no un módulo.
  - `extraerTextoPdfJs(bytes)`: abre el PDF con pdf.js y devuelve, por
    página, cada fragmento de texto con su posición real (`x, y` — pdf.js
    usa el mismo sistema de coordenadas de origen abajo-izquierda que
    pdf-lib, así que las posiciones se reusan tal cual, sin conversión).
  - `ubicarCamposCharlaSGSST(paginas)`: busca, en cada página donde
    aparezcan, las etiquetas `OBRA/DICTADA POR/Cargo:/ACTIVIDAD/FECHA/DURACION`
    y calcula la posición del valor a partir del **`":"` real** que trae
    cada etiqueta como elemento de texto aparte (no pegado a la palabra —
    por eso "OBRA" y "ACTIVIDAD", de largos distintos, quedan con el `:`
    alineado en la misma columna). La etiqueta de firma del relator se
    ubica por posición (misma fila que DURACION, más a la derecha) en vez
    de por texto exacto, porque el texto real varía (`"FIRMA"` vs
    `"FIRMA:"`). Para la tabla de asistentes: ubica la fila con
    `NOMBRE`+`RUT`+`FIRMA` como encabezados y usa la posición real de cada
    número de fila (`"1."` a `"21."`) como ancla — el nombre del asistente
    se pega justo después de ESE número (no del encabezado "NOMBRE", que
    queda centrado en la columna), para que quede pegado a la izquierda y
    no le falte espacio a un nombre largo.
  - **Choque entre campos vecinos**: dos de los archivos reales
    (`SGSST-RG-003` y, solo en su página 1, `SGSST-RG-004`) tenían
    "DURACION :" y "FIRMA:" casi pegados en el documento original, sin
    espacio real para un valor en el medio (defecto del Word original del
    cliente, no de la app — el cliente terminó re-exportando esos 2 archivos
    con más espacio y se reemplazaron en `plantillas/charlas/`).
    `ubicarCamposCharlaSGSST` calcula un `limite` por campo (la posición del
    siguiente texto de esa misma fila) y `escribir()` achica la letra hasta
    un mínimo razonable y, si de plano no entra, no dibuja nada ahí en vez de
    escribirse encima de la etiqueta de al lado — el dato igual queda
    guardado en la fila de `CHARLAS` aunque no haya podido imprimirse en ese
    documento puntual. Como el choque puede darse en una sola página del
    documento y no en la otra (el mismo casillero repetido puede quedar con
    espaciados distintos entre página y página), el `limite` se calcula por
    cada aparición del campo por separado, no una vez por documento.
  - **Fragmentos de texto pegados**: en `SGSST-RG-010` pdf.js entregó la
    etiqueta de firma partida en dos fragmentos separados ("F" + "IRMA:",
    con ~0.1pt de separación entre ellos — un detalle de cómo el PDF
    codifica esos glifos, no algo controlable) — sin reconstruirla, el
    patrón `/^FIRMA:?$/` nunca calzaba y la firma del relator no se dibujaba
    en esa página. `fusionarFragmentosPegados` (dentro de
    `extraerTextoPdfJs`) une fragmentos de una misma fila cuyo espacio entre
    uno y el siguiente es casi cero, antes de buscar cualquier etiqueta —
    protege contra este tipo de particionado en cualquier documento futuro,
    no solo en el que lo mostró.
  - Firmas (relator y cada asistente) se centran verticalmente en su línea
    con la misma fórmula ya usada en DIAT/Investigación
    (`baseline + capHeight/2`, acá aproximado como `baseline + 3.5`), en vez
    de apoyarse directo en el baseline — quedaban "flotando" muy arriba.
- **`generarPdfCharlaSobrePlantilla(datos, plantilla)`**: descarga el PDF
  con `fetch(plantilla.archivo)` (archivo del propio proyecto, no hace
  falta token ni Drive para leerlo), lo analiza con `extraerTextoPdfJs`
  (**usando una copia del buffer** — pdf.js transfiere el `ArrayBuffer` a su
  Web Worker y lo deja "detached", así que hay que copiarlo antes con
  `.slice(0)` o `PDFDocument.load` después falla), y con `pdf-lib` dibuja
  Obra/Dictada por/Cargo/Actividad/Fecha/Duración/Firma del relator y la
  tabla de asistentes **directamente sobre las páginas reales del
  documento**, en todas las páginas donde cada campo aparezca (el casillero
  se repite en cada página). El PDF resultante se sube a Drive tal cual —
  mismo número de páginas que el original, sin agregar ni quitar ninguna.

## Módulo Subcontratistas

Módulo para que empresas subcontratistas suban su propia documentación de
seguridad, sin que una empresa pueda ver los documentos de otra ni entrar a
ningún otro módulo de la app.

- **Cómo se autoriza una cuenta subcontratista:** el admin agrega la empresa
  desde el botón "+" del módulo (`abrirFormSubcontratista` → `guardarSubcontratista`
  en `app.js`) — nombre de la empresa + correos autorizados (uno por línea).
  Esto escribe una fila en `SUBCONTRATISTAS` y una fila por correo en
  `USUARIOS` (`Rol="subcontratista"`, `Empresa=<nombre>`). Se puede agregar
  más correos después desde el detalle de la empresa (formulario "+ Agregar"
  al final de la vista, junto a "Correos autorizados").
- **Modo restringido:** `cargarTodo()` (`app.js`) lee `USUARIOS` primero que
  cualquier otra hoja y busca el correo logueado. Si tiene
  `Rol="subcontratista"`, guarda su empresa en `miEmpresaSubcontratista` y
  **no** carga el resto de las hojas de la operación (Trabajadores,
  Incidentes, etc. — ni falta que hacen, esa cuenta nunca las va a ver).
  `arrancarApp()` entonces la manda directo a `mostrarModoSubcontratista()`,
  una pantalla fija e independiente (`#subcontratista-root` en
  `index.html`) que reemplaza por completo a `#main`/`#desktop-home`/
  `#desktop-sidebar` — no hay sidebar, no hay Inicio, no hay ningún botón
  que lleve a otro módulo. Un correo que NO está en `USUARIOS` (o que está
  con otro Rol) entra normal, con acceso completo, igual que siempre.
- **Aislamiento — importante entender su alcance real:** los documentos se
  guardan en el mismo Drive y el mismo Sheet que usa el resto de la app (así
  lo pidió el cliente, en vez de una carpeta de Drive separada por empresa
  con permisos de Google). El aislamiento entre subcontratistas es **a nivel
  de la interfaz**: la pantalla de cada empresa solo muestra/permite subir
  sus propios documentos, y una cuenta subcontratista jamás ve el resto de
  la app. Si a esa cuenta se le da acceso de Editor directo al Sheet/Drive
  (como a cualquier cuenta interna), alguien con conocimientos técnicos que
  abriera las herramientas de desarrollador de su navegador podría, en
  teoría, leer/escribir directamente por la API cualquier pestaña del Sheet
  (no solo `SUBCONTRATISTAS_DOCS`).
- **Cómo evitar darle ese acceso directo — Web App de Apps Script como
  proxy** (`APPS_SCRIPT_WEBAPP_SUBCONTRATISTAS.js`, opcional): el cliente
  prefirió no tener que otorgarle acceso de Editor del Sheet/Drive a cada
  subcontratista. Se agregó un endpoint de Apps Script que corre siempre
  con los permisos de quien lo despliega (el admin), sin importar qué
  cuenta lo llame — así una cuenta subcontratista no necesita NINGÚN
  permiso directo sobre el Sheet ni el Drive.
  - `cargarTodo()` (`app.js`) intenta primero el camino de siempre
    (`fetchSheet` directo sobre `USUARIOS`). Si esa cuenta no tiene acceso
    (falla con 403) y hay una `SUBCONTRATISTAS_WEBAPP_URL` configurada en
    `config.js`, cae automáticamente al proxy: llama a la Web App
    (`llamarWebAppSubcontratista('verificarAcceso', ...)`) para confirmar
    que es un subcontratista legítimo y obtener su empresa, y de ahí en
    adelante toda la sesión (`subcontratistaUsaProxy = true`) usa la Web
    App tanto para leer documentos (`listarDocumentos`) como para subir
    archivos nuevos (`subirDocumento`, mandando el archivo en base64) —
    nunca intenta la API de Sheets/Drive directo de nuevo. Si NO hay Web
    App configurada, o la cuenta sí tiene acceso directo, todo sigue
    funcionando exactamente igual que antes (cero cambios para cuentas
    internas ni para subcontratistas a las que sí se les dio acceso
    directo).
  - **Nivel de seguridad del proxy:** no valida criptográficamente que
    quien llama es realmente el correo que dice ser (no verifica un token
    firmado de Google) — solo confía en el correo que manda la app, y antes
    de hacer cualquier cosa confirma que ese correo esté registrado como
    `subcontratista` en `USUARIOS` con la empresa que está pidiendo. Es un
    nivel razonable para este caso de uso, documentado explícitamente en el
    propio archivo del script.
  - Alternativa que se consideró y se descartó: aislamiento real a nivel de
    Google (carpeta de Drive separada por empresa, compartida solo con esa
    cuenta) — es técnicamente posible pero exige que cada subcontratista
    "conecte" su carpeta una vez vía Google Picker (el scope `drive.file`
    no permite crear archivos en una carpeta ajena que la cuenta no abrió
    antes con la app), lo que agrega fricción de uso; el proxy de Apps
    Script resuelve el mismo problema (no depender de la confianza en el
    Sheet compartido) sin esa fricción.
- **Las 3 carpetas de cada empresa** (checklist fijo, definido por el
  cliente — `SUBCONT_CARPETA_EMPRESA`/`SUBCONT_CONTROL_MENSUAL` en
  `app.js`):
  - **Carpeta de Empresa** (una sola vez): Reglamento, Certificados
    mutualidad, Miper, Procedimientos, Certificados EPP, Exámenes
    ocupacionales.
  - **Control Mensual** (se repite cada mes — selector `<input type="month">`,
    mismo ítem con `Periodo="AAAA-MM"` distinto): Capacitaciones
    específicas, Charlas diarias, Recambio EPP, Inspecciones, AST,
    Cronograma, Certificados, Exámenes ocupacionales, Informe Mensual,
    Listado de trabajadores.
  - **Control de Herramientas y Extensiones Eléctricas**: sin checklist fijo
    (a pedido explícito del cliente) — solo una carpeta libre donde se van
    acumulando los archivos que suban.
  - Además, **Reglamento de Subcontratista** y **Programa personalizado**:
    un solo documento de cada uno, compartido por todas las empresas (los
    sube el admin, `empresa="__GLOBAL__"` en `SUBCONTRATISTAS_DOCS`); las
    cuentas subcontratistas solo pueden verlos, no reemplazarlos.
- **Historial de subidas:** cada subida es una fila nueva en
  `SUBCONTRATISTAS_DOCS` (no se sobrescribe la anterior) — la interfaz
  siempre muestra la más reciente por ítem/período
  (`ultimoDocSubcontratista`), pero el historial completo queda en el Sheet.
- **Vista compartida:** el mismo HTML (`renderSubcontratistaDetalleHTML`) se
  usa tanto para la cuenta subcontratista (pantalla fija, sin la sección
  "Correos autorizados") como para el admin, que entra por el listado de
  empresas del módulo y ve el detalle en un panel deslizante — así el admin
  puede revisar o subir documentos por una empresa si hace falta.
- **Diseño de las secciones (`.subcont-section` en `style.css`):** cada
  sección (Documentos generales, Carpeta de Empresa, Control Mensual,
  Control de Herramientas, Correos autorizados) va en su propia tarjeta
  blanca separada, en vez de filas sueltas flotando directo sobre el fondo.
  Cada ítem de checklist tiene un círculo de estado (`iconoEstadoDoc` —
  check verde si ya se subió algo, círculo vacío si no) y las secciones con
  checklist fijo (Carpeta de Empresa, Control Mensual) muestran un badge de
  avance tipo "3/6" (`progresoBadgeSubcontratista`, se pone verde
  "completo" cuando llega al total) para ver de un vistazo cuánto falta sin
  tener que leer cada fila.

## Generación de PDFs rellenados (Investigación de Accidente)

Segunda de las tres plantillas pedidas (después de Charla). Se activa
**solo** para Incidentes tipo `Accidente Leve`, `Accidente Grave` o
`Accidente Fatal` (no para `Cuasiaccidente` ni `Incidente`,
`requiereInvestigacion(tipo)` en `app.js`) — decisión confirmada con el
cliente. Al guardar un incidente de esos tres tipos, la fila de
`INCIDENTES` queda con `Investigación Estado = Pendiente` automáticamente
(igual que las alertas de Charla), sin forzar a completarla en el momento.

- **Mismo enfoque que Charla:** el PDF original (`plantillas/
  investigacion_accidente.pdf`) tampoco tiene campos rellenables — todo el
  texto y las "X" de los checkbox se dibujan encima en coordenadas exactas,
  medidas con `pdfplumber` sobre el PDF que mandó el cliente. A diferencia
  de Charla, esta plantilla es tamaño A4 (`H = 841.8`) y no trae el pie de
  página con branding de terceros, así que no hace falta taparlo.
- **Checkbox:** la función `checkX(page, x, cellCenterTop, size)` centra la
  "X" usando la altura de mayúscula de la fuente (`capHeight = size*0.72`)
  en vez de un offset a ojo — esto se descubrió necesario durante Charla (ver
  historial de commits) y se aplicó desde el principio acá. Cada grupo de
  checkbox está definido como una lista de opciones con su `{ label, x, top,
  page }` ya medido (`INV_TIPO_SINIESTRO`, `INV_EMPRESA`, `INV_DANOS`,
  `INV_POTENCIAL`, `INV_TIPO_INCIDENTE` (16), `INV_CAUSAS_INMEDIATAS` (21),
  `INV_CAUSAS_BASICAS` (14) en `app.js`) — la misma lista se usa tanto para
  pintar el checklist en el formulario (`renderChecklistInv`) como para
  dibujar las "X" en el PDF, así no hay dos fuentes de verdad para las
  opciones.
- **Grupos de una sola opción** (Tipo de Siniestro, Empresa afectada,
  Potencial) usan `<input type="radio">`; el resto son checkbox
  multi-selección — se agregó `.chk-row-radio` en `style.css` (círculo en
  vez de cuadrado) reutilizando el mismo `.chk-row-checkbox-wrap`.
- **Campos "Otros (especifique)"** (Daños, Tipo de Incidente, causas
  subestándar) tienen su propio input de texto libre en el formulario, que
  se dibuja en la línea en blanco correspondiente del PDF si viene con
  contenido.
- **Firma:** solo hay un firmante (quien investiga) — se dibuja en el
  espacio en blanco a la derecha de "NOMBRE Y RUT DE QUIEN INVESTIGA" /
  "CARGO" en la página 2 (ese documento no tiene una línea de firma
  dedicada como Charla, así que se usa el espacio libre de esa fila).
- **Flujo en la app:** botón "Realizar investigación" en la tarjeta o en la
  ficha de detalle de un Incidente con `Investigación Estado = Pendiente`
  (`abrirInvestigacion(filaIncidente)`) → un único formulario largo,
  seccionado igual que el PDF (organización, antecedentes, checkbox de
  clasificación, datos del trabajador/testigo, descripción, tipo de
  incidente, causas inmediatas/básicas, medidas de control (hasta 3 filas),
  observaciones, y firma de quien investiga) → `guardarInvestigacion(ev)`
  genera el PDF, lo sube a Drive (carpeta del trabajador si hay uno
  asociado), agrega una fila nueva a la pestaña `INVESTIGACIONES` (46
  columnas — casi todos los campos del formulario, con los grupos de
  checkbox guardados como texto separado por `;`), y actualiza la fila del
  Incidente en `INCIDENTES` (`Investigación Estado = Completada`,
  `Responsable`, `Fecha`, `PDF`) con un `PUT` a las columnas Q:T.
- **Pestaña nueva `INVESTIGACIONES`:** no viene en el Sheet original — hay
  que volver a ejecutar `inicializarPlanilla` desde Apps Script (menú
  Extensiones → Apps Script → ejecutar `inicializarPlanilla`) para que se
  cree; es seguro volver a ejecutarla, no borra datos existentes en las
  pestañas que ya existen, solo agrega las que faltan y reescribe los
  encabezados de la fila 1.

## Generación de PDFs rellenados (HCR)

Tercera y última de las plantillas pedidas, y la más grande con diferencia:
`plantillas/hcr.pdf`, **4 páginas con tamaños mixtos** — páginas 1 y 2 en
A4 apaisado (`H=595.2`), páginas 3 y 4 en carta vertical (`H=792`) — con
más de 130 checkbox solo en la página 1. A pedido explícito del cliente
("quiero que esto sea otro modulo para separarlo de todo"), HCR es un
**módulo independiente**: no se dispara desde Incidentes ni Charlas, tiene
su propia entrada en el menú/Inicio (`irPagina('hcr')`), su propio botón
"+" (`abrirNuevoHcr`) y su propia pestaña `HCR` en el Sheet.

- **Mismo enfoque de overlay que Charla/Investigación**, pero la página 1
  tiene una particularidad: los ~130 checkbox NO están alineados por fila
  dentro de cada sección — en cambio, **una misma franja vertical de
  checkbox se reutiliza para varias secciones apiladas** en la misma columna
  de la página (ej. la franja de checkbox de "1. Peligros/Seguridad
  columna 1" es exactamente la misma franja x que usa más abajo
  "3. Riesgos/Seguridad"). Esto se descubrió midiendo con `pdfplumber` los
  bordes de las celdas (`rects` con `width<2.5` = borde vertical de la
  franja de checkbox), no fue una suposición: cada sección define su lista
  de opciones con un `top` propio pero comparte la constante `x` de su
  columna (`HCR_CX.col1/col2/col3` en `app.js`).
- **Filas de altura no uniforme:** algunas filas del PDF original son más
  altas que el resto (ej. "CONDICIONES METEREOLOGICAS ADVERSAS" en Peligros/
  Seguridad) — el centro vertical de cada checkbox se calculó individualmente
  a partir de los bordes reales de esa fila específica, no con un alto de
  fila fijo aplicado a ciegas.
- **Sección 7 "Verificación de comunicación" y "Registros adicionales"**
  son preguntas de una sola respuesta (Sí/No/N.A.), no checkbox
  independientes — se renderizan como 3 radios por pregunta
  (`HCR_VERIF_PREGUNTAS`, `HCR_REGISTROS_ADIC`), reutilizando 3 franjas de
  checkbox angostas (`HCR_CX.si/no/na`).
- **Página 2** trae los datos generales (Actividad, Área, Fecha, HH de
  capacitación) y una tabla libre "Tareas / Riesgos / Medidas para el
  control de los riesgos" que en el PDF original es un área en blanco sin
  grilla interna (pensada para escribir a mano); en la app se ofrecen 4
  filas fijas repartidas en alturas iguales dentro de esa área. También
  trae los 3 campos de **firma de jefatura** (Supervisor, Jefe de Obra/Jefe
  Terreno, Prevención de Riesgos) — como la caja de cada firma es angosta y
  la plantilla ya imprime la etiqueta a media altura, no se escribe un
  nombre tipeado ahí (se probó y se superponía con la etiqueta impresa):
  solo se dibuja la firma debajo. Esa misma caja de firmas jefatura se
  repite al final de la página 4, y se dibujan ahí las mismas 3 firmas.
- **Páginas 3 y 4** son el registro de firmas de la cuadrilla (mismo patrón
  de "firma en cadena, una por una" que Charla), con capacidad para 42
  trabajadores (23 filas en página 3 + 19 en página 4 — la plantilla
  original salta el número "20" en su numeración impresa, un detalle del
  documento del cliente que se dejó tal cual, no es un bug de la app).
- **Múltiples pads de firma simultáneos:** a diferencia de Charla/
  Investigación (un solo canvas de firma visible a la vez), el formulario de
  HCR muestra **3 canvas de firma al mismo tiempo** (supervisor, jefe de
  obra, prevención). Esto expuso un bug real en `initFirmaPad`/`firmaCtx`:
  las funciones de dibujo usaban variables globales compartidas
  (`firmaCtx`/`firmaActiva`), así que inicializar el segundo o tercer
  canvas "robaba" el contexto de dibujo del primero (dibujar en el canvas A
  terminaba pintando en el canvas B). Se corrigió haciendo que cada llamada
  a `initFirmaPad` use un `ctx`/`activa` **local** a esa closure — las
  variables globales se mantienen solo por compatibilidad con
  `limpiarFirma()` (usada en los flujos de un solo canvas). Se agregó
  `limpiarFirmaId(canvasId)` para borrar un canvas específico sin depender
  del estado global, usado por los 3 botones "Borrar firma" del HCR.
- **Pestaña nueva `HCR`:** tampoco viene en el Sheet original — igual que
  `INVESTIGACIONES`, hay que volver a ejecutar `inicializarPlanilla` desde
  Apps Script para que se cree (22 columnas, `A:V`).

## Generación de PDFs rellenados (DIAT / Declaración de rechazo)

A pedido del cliente: al registrar un `Accidente Leve/Grave/Fatal` se
pregunta si el trabajador necesita atención médica **antes** de habilitar
la Investigación (ver "Atención médica e investigación de accidente" en
Módulos de la app). Según la respuesta se generan documentos muy distintos:

- **Si Sí → DIAT** (Denuncia Individual de Accidente del Trabajo,
  formulario oficial de la Mutual de Seguridad). Mismo enfoque de overlay
  que Investigación/HCR: `plantillas/diat.pdf` no tiene campos rellenables,
  se mide con `pdfplumber` y se dibuja encima. A diferencia de los otros
  tres documentos, acá los 61 checkbox del PDF **sí son rects individuales**
  (cuadrados de ~7.9pt de ancho/alto, no franjas compartidas como en HCR),
  así que se pudieron extraer todos de una vez emparejando cada rect con la
  palabra más cercana a su derecha en la misma fila — mucho más rápido que
  medir uno por uno. Los campos de texto (Nombre, RUT, Dirección, etc.) no
  tienen bordes rectos (son curvas/rutas Bézier para las esquinas
  redondeadas), así que sus coordenadas se estimaron a partir de la
  posición de la etiqueta impresa y se ajustaron con el ciclo habitual de
  generar → renderizar a imagen → revisar → corregir.
  - Prellenado automático desde el Incidente/Trabajador: nombre y RUT del
    trabajador, su profesión/cargo, fecha del accidente, lugar, descripción,
    y la Clasificación del Accidente (Grave/Fatal/Otro) según el tipo ya
    registrado — el resto (identificación del empleador, datos del
    trabajador, denunciante, checkboxes de clasificación, etc.) se completa
    a mano en un formulario largo, seccionado igual que el PDF (A/B/C/D).
  - El campo "Firma" del denunciante (sección D) se deja en blanco a
    propósito — no se implementó firma digital para la DIAT porque, igual
    que la Declaración, es un documento que termina imprimiéndose/
    entregándose a la Mutual con firma física.
  - Se guarda en una pestaña nueva `DIAT` (53 columnas, `A:BA`) y sube el
    PDF a Drive (carpeta del trabajador).
- **Si No → Declaración simple de rechazo.** A pedido explícito del
  cliente, **sin plantilla ni formato**: no se dibuja sobre ningún PDF
  base, se genera una página en blanco nueva (`PDFDocument.create()`) con
  un título, trabajador, fecha, y el texto que se haya escrito completo en
  un textarea — tal cual, sin agregar ni completar nada por la app. **Sin
  firma**: el cliente fue explícito en que no debe llevar firma digital
  porque la firma real se hace a mano, en persona, después — capturarla acá
  no tendría sentido. Es la función más simple de las cuatro plantillas de
  este proyecto (`generarPdfDeclaracion` en `app.js`), útil como referencia
  de cómo generar un PDF "desde cero" con pdf-lib sin depender de una
  plantilla externa.
- **Pestaña nueva `DIAT`:** igual que `INVESTIGACIONES`/`HCR`, hay que
  volver a ejecutar `inicializarPlanilla` para que se cree.

## Datos personales del trabajador (prellenado de DIAT/Investigación)

El cliente pidió que los datos que **no cambian entre incidentes** (fecha
de nacimiento, dirección, tipo de contrato, etc.) vivan en la ficha del
trabajador y se usen para rellenar solos los formularios que los piden
(hoy: DIAT; también se aprovechó para Investigación de Accidente), en vez
de escribirlos de cero cada vez.

- **Columnas nuevas en `TRABAJADORES`** (`Q:Z`, ver arriba): `Fecha
  Nacimiento`, `Sexo`, `Nacionalidad`, `Dirección`, `Comuna`, `Teléfono`,
  `Pueblo Originario`, `Tipo Contrato`, `Tipo Ingreso`, `Categoría
  Ocupacional`. Se reutilizan las mismas etiquetas que ya usaban los
  checklists del DIAT (`DIAT_SEXO`, `DIAT_PUEBLO_ORIGINARIO`,
  `DIAT_TIPO_CONTRATO`, `DIAT_TIPO_INGRESO`, `DIAT_CATEGORIA_OCUPACIONAL`
  en `app.js`) para que el valor guardado calce exacto con el radio que
  hay que marcar al prellenar (`marcarRadioPorLabel(name, catalogo,
  label)`, nuevo, busca el índice cuyo `.label` coincide).
- **Formulario "Nuevo trabajador"**: se agregó una sección "Datos
  personales" con estos 10 campos (todos opcionales, no bloquean guardar
  al trabajador si quedan vacíos).
- **Ficha del trabajador**: nueva sección "Datos personales" con badge
  "Completos"/"Incompletos" y botón "Completar/Actualizar datos
  personales" — abre `panel-editar-personales` (`abrirEditarDatosPersonales`
  / `guardarDatosPersonales` en `app.js`, mismo patrón que Contrato/Examen
  de Altura: `PUT` acotado a `TRABAJADORES!Q{fila}:Z{fila}`, no reescribe
  la fila completa). Esto es lo que permite completar los datos de
  trabajadores que ya existían antes de este cambio.
- **`Fecha Ingreso`** (columna F, ya existía) y **`Fecha Nacimiento`**
  (nueva) no se guardan como "antigüedad"/"edad" fijas — se **calculan al
  vuelo** cada vez que se abre un formulario, relativas a la fecha del
  evento (`calcularEdad`/`calcularAntiguedad` en `app.js`), así no quedan
  desactualizadas con el paso del tiempo. `calcularAntiguedad` devuelve
  `{ valor, unidad }` en Días/Meses/Años según corresponda (< 30 días →
  Días, < 365 → Meses, si no → Años) — ese `unidad` es literalmente uno
  de los labels de `DIAT_ANTIGUEDAD_UNIDAD`, así que también sirve para
  marcar el radio directamente.
- **`abrirFormDiat()`**: si el incidente tiene un trabajador asociado con
  datos personales cargados, prellena Dirección/Comuna/Teléfono/Fecha de
  Nacimiento/Edad/Antigüedad (calculada) y marca los radios de
  Sexo/Pueblo Originario/Tipo de Contrato/Tipo de Ingreso/Categoría
  Ocupacional/Unidad de Antigüedad — todo sigue siendo editable en el
  formulario por si algo cambió puntualmente para ese accidente.
- **`abrirInvestigacion()`**: prellena Rut y Cargo del trabajador, y
  "Antigüedad en la empresa" como texto (ej. "3 años") calculado igual que
  en el DIAT. "Antigüedad en el cargo" queda sin prellenar a propósito —
  no hay un dato de "fecha de inicio en el cargo actual" guardado (solo
  fecha de ingreso a la empresa), y asumir que son lo mismo sería
  incorrecto para alguien que cambió de cargo.

## Navegación móvil: Inicio como única entrada (se sacó la barra inferior)

El cliente pidió que la navegación funcione "como en Flota": un menú
principal (Inicio) con la grilla de módulos como forma de entrar a cada
uno, en vez de una barra de tabs fija. Se optó por la opción recomendada
(vs. mantener la barra y arreglar "Más"):

- Se **eliminó por completo** la barra inferior `.nav` (5 tabs: Inicio /
  Inspecc. / Incident. / EPP / Más) del HTML, su CSS (`.nav`, `.nav-item`,
  `.nv-ic`, `.nv-lb`, `.nav-dot`) y las líneas de `irPagina()` que la
  manejaban. Antes "Más" saltaba directo a Trabajadores, dejando
  Procedimientos, Charlas y HCR alcanzables solo indirectamente — ese
  problema desaparece porque ahora los 8 módulos son botones directos en
  la grilla de Inicio.
- El header móvil ahora es **dinámico** en vez de estático: en Inicio
  muestra el logo (`#header-logo-badge`) + título fijo "Prevención de
  Riesgos"; en cualquier otra página muestra un botón "‹ Volver a Inicio"
  (`#header-back`, nuevo, circular translúcido igual que `.header-btn`)
  + el título de esa página (reutiliza el objeto `TITULOS_PAGINA` que ya
  existía para el título del sidebar de escritorio). El toggle está en
  `irPagina()` en `index.html`.
- `.fab-btn` (botón + flotante) bajó su `bottom` de `72px` (dejaba espacio
  para la barra) a `20px`, y `.page` bajó su `padding-bottom` de `90px` a
  `24px` por la misma razón.
- Esto fue solo para **móvil**; en ese momento el cliente no había pedido
  nada sobre escritorio. Ver la sección siguiente — poco después pidió el
  mismo patrón (Inicio de página completa + sidebar solo dentro de un
  módulo) también para escritorio, calcado de Flota.

## Escritorio: Inicio de página completa + sidebar solo dentro de un módulo

Igual que el cambio anterior pero para escritorio: el cliente mandó dos
capturas de Flota en PC — la pantalla de Inicio (header centrado con logo
en placa blanca + "Constructora LST" / "Gestión de Recursos", grilla de
módulos en una fila, chip de cuenta + botones abajo, **sin sidebar**) y la
vista dentro de un módulo (sidebar angosto a la izquierda con header de
**color según el módulo**, ahí sí con navegación). Pidió replicar
exactamente ese comportamiento, punto que además ya coincidía con el
propio "look Flota" que se le había dado a esta app antes.

Antes de implementar se preguntó explícitamente (porque nuestros módulos
no tienen sub-secciones internas como "Registrar/Pendientes/Historial" de
Movimientos en Flota) si el sidebar dentro de un módulo debía mostrar solo
ese módulo + "Volver al inicio", o mantener la lista completa de los N
módulos para saltar entre ellos sin volver a Inicio. El cliente eligió
al principio **mantener la lista completa** (más rápido para el uso
diario), pero después de agregar el módulo Subcontratistas (8 módulos en
total, la lista ya no entraba completa en pantallas más bajas y necesitaba
scroll) pidió **lo contrario**: que no se pueda saltar de un módulo a otro
directamente, que haya que volver a Inicio primero — como en Flota. Se
revirtió: el sidebar dentro de un módulo ahora muestra **solo** un botón
"‹ Volver a Inicio" (`.desktop-nav-back` en `index.html`), sin lista de
módulos ni los accesos rápidos de estadísticas que antes también dejaban
saltar directo a otro módulo (se sacó el bloque `.desktop-stats` clickeable
del sidebar — esas mismas estadísticas ya se ven en `#desktop-home`, no se
perdió información, solo el atajo). El mobile nunca tuvo este problema: no
tiene barra de navegación inferior, así que ya obligaba a volver a Inicio.

Cambios concretos:
- **Nuevo `#desktop-home`** (`index.html`): página de escritorio completa,
  sin sidebar, que reemplaza lo que antes vivía dentro de
  `dt-page-inicio`. Header centrado con `.logo-badge` + título
  "Prevención de Riesgos" + subtítulo "Constructora LST", con esquinas
  inferiores redondeadas (28px) y el gradiente naranjo de siempre. Debajo:
  fila de 4 estadísticas rápidas (Trabajadores / Inspecc. abiertas /
  Incidentes / Charlas pend. — antes solo estaban en el sidebar, que ahora
  se oculta en Inicio, así que se agregaron aquí para no perder esa
  info), "Estadísticas de seguridad", la grilla de módulos
  (`data-list="modulos-home"`, en fila con `repeat(auto-fit, minmax(190px,1fr))`
  — antes este layout en fila estaba roto: el CSS apuntaba a un
  `#modulos-home` que no existía en el HTML, así que en escritorio los
  módulos se veían en grid de 2 columnas como en móvil) y al final el
  chip de cuenta + "Actualizar datos"/"Cerrar sesión".
- **`dt-page-inicio` se eliminó** de `#desktop-main` (quedó reemplazado
  por `#desktop-home`, que vive fuera del sidebar).
- **`irPagina()`** ahora decide en escritorio entre mostrar `#desktop-home`
  (si `nombre === 'inicio'`) o el par `#desktop-sidebar` + `#desktop-main`
  (cualquier otro módulo), alternando la clase `dt-oculto`.
- **Header con color por módulo** (sidebar de escritorio Y header móvil,
  ver sección siguiente para el detalle del fundido): reciben una capa
  con clase `header--flota/inv/cont/mov/and` (mismo esquema de colores
  que ya usaban las tarjetas de módulo en Inicio) que `irPagina()`
  aplica según el módulo activo — se agregó `.header--flota` (azul) en
  `style.css`, que no existía porque ningún módulo propio usaba ese
  color de header hasta ahora. El mapeo módulo → color vive en
  `MODULOS_COLOR` (`app.js`, nuevo, top-level), compartido entre
  `renderModulosHome()` y `irPagina()`.
- `arrancarApp()` ya no revela `desktop-sidebar`/`desktop-main`
  directamente; llama a `irPagina('inicio')` (que decide mostrar
  `desktop-home`) y anima ese contenedor en vez de los otros dos. `signOut()`
  también oculta `desktop-home` ahora, además de sidebar/main.

## Headers: cambio de color con fundido (no de golpe)

El cliente pidió dos cosas seguidas: que el header **móvil** también
cambiara de color por módulo (antes solo se hizo en el sidebar de
escritorio) y que el cambio de color tuviera una **transición**, "para
que no sea tan de golpe", como en Flota.

Lo primero (agregar color al header móvil) fue directo: se le sacó la
clase fija `header--pr` que tenía siempre y ahora usa el mismo mecanismo
que el sidebar (`MODULOS_COLOR` + `irPagina()`), quedando naranjo en
Inicio y con el color del módulo en cualquier otra página. El header
móvil (`#header-movil`) además ganó `position:relative;overflow:hidden`
+ `border-radius`/`padding-bottom` que antes vivían en una clase aparte
`.header--pr` con el mismo gradiente hardcodeado (se sacó esa
duplicación).

Lo segundo (la transición) resultó más complicado de lo esperado:
`transition: background 0.35s` **no anima gradientes** — se probó
directamente (leyendo `getComputedStyle(...).backgroundImage` un frame
después de cambiar la clase) y el valor salta instantáneo al gradiente
nuevo, sin ningún paso intermedio. Los navegadores no interpolan entre
dos `linear-gradient()` distintos con una transición simple.

La solución fue un **fundido cruzado (crossfade) con dos capas**: cada
header (`#header-movil` y `#desktop-sidebar-header`) tiene ahora dos
`div.header-bg` hijos, superpuestos con `position:absolute;inset:0`,
cada uno con su propio `transition: opacity 0.35s ease`. `aplicarColorHeader()`
(`index.html`) lleva un registro de cuál de las dos capas está "al
frente" (`headerEl.__bgFront`), le pone al otro div (el de atrás) la
clase de color nueva, fuerza un reflow (`void back.offsetWidth`) para
que el navegador registre el `opacity:0` de partida, y recién ahí anima
ese div a `opacity:1` mientras el que estaba al frente baja a `opacity:0`
— como `opacity` sí es animable de forma nativa y confiable en todos los
navegadores, el cruce se ve como un fundido real en vez de un salto.
El contenido del header (logo, título, botones) quedó con
`position:relative;z-index:1` para pintarse siempre por encima de las
capas de color.

De paso se agregó una animación `pageFade` (`opacity` + `translateY(6px)`
sutil, 0.28s) a `.page.active` y `.dt-page.active`, para que el
contenido de cada página también entre con un pequeño fundido al
navegar, en vez de aparecer de golpe.

## Fichas de detalle (Trabajador / Incidente) con look Flota

El cliente mandó dos capturas comparando la Ficha del Trabajador de esta
app con la ficha de un vehículo en Flota: en Flota cada sección
("Información general", etc.) va en su propia tarjeta blanca con
sombra y esquinas redondeadas, separada de las demás; en esta app todo
el contenido (RUT, Empresa, Obra, Datos personales, Contrato...) iba
suelto sobre el fondo gris, uno debajo del otro sin separación visual,
salvo la tarjeta del encabezado (`.ficha-hero`).

La solución fue casi gratis: `style.css` ya tenía las clases
`.ficha-section`/`.ficha-sec-title` con exactamente el look de Flota
(tarjeta blanca, borde, radio 12px) — quedaron sin usar desde que se
copió el CSS de Flota al arrancar el proyecto. Solo hacía falta
envolver cada sección de `abrirFichaTrabajador()` y
`abrirDetalleIncidente()` (`app.js`) en un `<div class="ficha-section">`
con su `<div class="ficha-sec-title">` como título, en vez de dejar los
`field-row` sueltos con un `sec-label`. Se agregó `box-shadow` tanto a
`.ficha-section` como a `.ficha-hero` (que ya existía pero sin sombra)
para terminar de calzar con la referencia.

De paso:
- El header de ambos paneles (`#pnl-title-ficha-trabajador` /
  `#pnl-title-detalle-incidente`, IDs nuevos) ahora muestra el nombre del
  trabajador o el tipo de incidente en vez de un título genérico fijo
  ("Ficha del trabajador" / "Detalle del registro"), igual que Flota
  muestra la patente/nombre del vehículo en su header.
- El hero de ambas fichas ganó una fila de badges de estado justo bajo
  el nombre (`.ficha-hero-badges`, clase nueva) — Activo/Inactivo y
  Supervisor de obra en Trabajador; Gravedad y Estado en Incidente —
  calcado del patrón de Flota (ahí se ven "Con observaciones"/"OK" en el
  mismo lugar). Antes esos datos vivían como un `field-row` más, mezclados
  con el resto.
- La Ficha del Trabajador quedó reorganizada en 7 tarjetas:
  Información general, Rol (+ equipo si es supervisor), Datos
  personales, Contrato de trabajo, Examen de altura física, Historial de
  EPP entregado, Incidentes relacionados — cada botón de acción
  ("Completar datos personales", "Subir contrato", etc.) quedó dentro de
  la tarjeta de su propia sección, no suelto al final.
- El Detalle de Incidente quedó en: Información general, Descripción
  (+ Causas + Acciones correctivas juntas), Registro, Atención médica
  (condicional) e Investigación de accidente (condicional) — los botones
  de acción (Definir atención médica / Realizar investigación / Cerrar
  caso) se dejaron fuera de las tarjetas, al final, porque son acciones
  de flujo (no pertenecen a una sección de datos en particular).

## Accesos directos a Drive y Sheets (Inicio)

El cliente pidió dos botones en Inicio para abrir directo la carpeta de
Drive y el Google Sheet que usa la app (sin tener que ir a buscarlos a
mano). Se agregaron en la sección "Accesos directos" (nueva, arriba de
"Sesión") tanto en el Inicio móvil como en `#desktop-home`:
"Abrir carpeta de Drive" → `https://drive.google.com/drive/folders/{CONFIG.DRIVE_ROOT_FOLDER}`,
"Abrir Google Sheet" → `https://docs.google.com/spreadsheets/d/{CONFIG.SHEET_ID}/edit`,
ambos con `target="_blank"`. Los `href` se arman en `configurarAccesosDirectos()`
(`app.js`, llamada desde `arrancarApp()`) en vez de hardcodearlos en el
HTML, para no duplicar los IDs de `config.js` en dos archivos.

Son `<a>` estilados como `.action-btn`/`.desktop-refresh-btn` (los mismos
botones que "Actualizar datos"/"Cerrar sesión") en vez de `<button>` — como
esas clases nunca se habían usado en un link, se les agregó
`display:flex;justify-content:center` a la versión `a.` de cada una en
`style.css` (un `<a>` es inline por defecto, así que `width:100%` solo no
alcanza para centrar el contenido). Se agregaron dos íconos nuevos al
catálogo `ICONS` (`carpeta`, `hoja`) para los botones.

- **"Look Flota" en el home (header + tarjetas de módulo + pie de sesión),
  pero en naranjo, no en azul.** El cliente pidió mostrarle el mismo estilo
  que la app de Flota (header curvo con logo en placa blanca, tarjetas de
  módulo con círculos decorativos de fondo, chip de cuenta + botones
  "Actualizar datos"/"Cerrar sesión" al pie) — pero se mantuvo el naranjo
  de esta app **a propósito**, porque el color distinto a Flota fue una
  decisión explícita anterior para no confundir las dos apps en el celular
  (ver ícono de instalación PWA más abajo). Cambios concretos:
  - `.logo-badge`: el logo queda dentro de una placa blanca redondeada
    (12px) en vez de flotar directo sobre el gradiente — usa `logo.png`
    (el logo a color, NO `logo-white.png`) porque sobre fondo blanco el
    logo blanco queda invisible. Se usa tanto en el header móvil como en
    el header del sidebar de escritorio.
  - `.header--pr` ahora tiene **esquinas inferiores redondeadas** (22px) en
    vez de terminar en línea recta.
  - `.account-chip`: avatar circular azul con "G" (estilo cuenta de
    Google) + correo, arriba de los botones "Actualizar datos"/"Cerrar
    sesión" — se agregó tanto en la sección "Sesión" del Inicio móvil como
    en el pie del sidebar de escritorio (antes el sidebar de escritorio
    solo tenía los 2 botones, sin chip; y el móvil solo tenía "Cerrar
    sesión", sin "Actualizar datos" ahí — ahora ambos quedan iguales).
  - Los círculos decorativos de fondo en las tarjetas de módulo
    (`.modulo-card::before`, ya existía en el CSS heredado de Flota, con
    ~7% de opacidad) **no se estaban viendo** porque el color venía de
    clases `.modulo-card--flota/inv/cont/mov/and` que nunca se aplicaban
    a la tarjeta en sí (solo al ícono cuadrado de adentro, vía
    `.modulo-icon--X`). Se agregó la clase `modulo-card--${color}`
    correspondiente en `renderModulosHome()` (`app.js`) para activarlos —
    no hizo falta CSS nuevo, solo faltaba conectar la clase.
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
- **Hover en escritorio:** en mobile el toque ya "avisa" con `:active`, pero
  en desktop (con mouse) faltaba saber por dónde iba el puntero antes de
  hacer clic. Se revisó qué clases realmente se usan en el HTML/JS (varias
  clases heredadas de Flota como `.and-card`/`.cont-card`/`.equipo-card`/
  `.movh-card`/`.inv-card` tenían reglas de hover pero **cero** uso real en
  esta app — CSS muerto) y se agregó `:hover` donde faltaba en clases que sí
  se usan: `.card` (toda fila de lista: Trabajadores, Incidentes,
  Inspecciones, Procedimientos, EPP, Charlas, HCR), `.az-item` (índice A-Z),
  `.header-btn`, `.pnl-back`, `.btn-add`, `.login-btn`, `.upload-label`/
  `.doc-file-label`. El índice A-Z también quedó con `transition` (antes el
  cambio de color/tamaño al presionar era instantáneo, sin animar) y un
  `transform: scale(0.8)` más marcado en `:active` para que se sienta el
  "apretón".
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
- La tabla "Tareas / Riesgos / Medidas" del HCR soporta hasta 4 filas fijas
  en el formulario (la plantilla original es un área en blanco sin grilla,
  pensada para escribir a mano cualquier cantidad de líneas) — si en la
  práctica casi siempre se necesitan más de 4, se puede ampliar agregando
  más `tareaN`/`riesgoN`/`medidaN` en el formulario y el arreglo
  `filasMedidas`-equivalente de `generarYSubirPdfHcr`.
- El roster de firmas del HCR soporta hasta 42 trabajadores (23 en página 3
  + 19 en página 4, límite físico de la plantilla) — si una cuadrilla tiene
  más integrantes que eso, los que sobran no se dibujan (mismo
  comportamiento ya aceptado en la tabla de asistentes de Charla).

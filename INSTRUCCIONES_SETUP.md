# Prevención de Riesgos LST — Guía de puesta en marcha

Esta app funciona igual que tu app de Flota: **no tiene servidor propio**, se
conecta directo desde el navegador a Google Sheets y Google Drive usando la
cuenta de Google de quien la usa. Por eso, para dejarla funcionando hay que
hacer una configuración una sola vez.

Como me dijiste que el Sheet y el Drive van a pertenecer a **otro correo**
(no el mismo de la app de Flota), todos los pasos de creación de Sheet/Drive
los debe hacer esa cuenta (o dártelos a ti con permiso de Editor).

---

## PASO 1 — Crear el Google Sheet nuevo

1. Con la cuenta que va a ser la dueña, entra a [sheets.google.com](https://sheets.google.com) → **Hoja de cálculo en blanco**.
2. Nómbrala, por ejemplo: `LST - Prevención de Riesgos (Base de Datos)`.
3. Copia el ID del Sheet desde la URL:
   `https://docs.google.com/spreadsheets/d/`**`ESTE_ES_EL_ID`**`/edit`
4. Ve a **Extensiones → Apps Script**, borra el contenido de `Code.gs` y pega
   todo el archivo `APPS_SCRIPT_INIT.js` que te dejé en el proyecto.
5. Guarda, selecciona la función `inicializarPlanilla` en el menú desplegable
   de arriba, y presiona **▶ Ejecutar**. Acepta los permisos que pida (son
   sobre tu propio Sheet). Esto crea automáticamente las 7 pestañas con sus
   columnas: `TRABAJADORES`, `INSPECCIONES`, `CHARLAS`, `INCIDENTES`,
   `PROCEDIMIENTOS`, `ENTREGA_EPP`, `USUARIOS`.
6. **Comparte el Sheet** con quienes van a usar la app (botón "Compartir",
   arriba a la derecha), como mínimo con acceso de **Editor**. Sin esto,
   aunque configuren bien la app, no van a poder guardar nada.

---

## PASO 2 — Crear la carpeta en Google Drive para las fotos

1. Con la misma cuenta dueña, entra a [drive.google.com](https://drive.google.com).
2. Crea una carpeta nueva, por ejemplo: `LST - Prevención de Riesgos (Fotos y Documentos)`.
3. Ábrela y copia el ID desde la URL:
   `https://drive.google.com/drive/folders/`**`ESTE_ES_EL_ID`**
4. **Comparte esta carpeta** con los mismos correos que compartiste el Sheet,
   con acceso de **Editor**.

   No necesitas crear las subcarpetas a mano — la app las crea solas la
   primera vez que alguien sube una foto (`Inspecciones`, `Incidentes-Accidentes`,
   `Procedimientos`, `Entrega EPP - Firmas`, `Trabajadores`), todas dentro de
   esta carpeta raíz.

---

## PASO 3 — Credenciales de Google Cloud (API Key + Client ID)

La app necesita "presentarse" ante Google como una aplicación autorizada.
Tienes dos caminos:

### Opción A (más simple): reutilizar el mismo proyecto de Google Cloud de la app de Flota
Si ya tienes un `API_KEY` y `CLIENT_ID` funcionando en la app de Flota, **puedes
usar los mismos** — solo hay que agregar el nuevo dominio donde publiques esta
app (ej: `https://tuusuario.github.io`) a los "orígenes autorizados" de ese
Client ID, en Google Cloud Console → APIs y servicios → Credenciales.
Esto es válido aunque el Sheet/Drive nuevos sean de otro correo: las
credenciales solo identifican a la *aplicación web*, no al dueño de los datos;
el dueño de los datos simplemente tiene que compartir el Sheet/Drive como
Editor con las cuentas que usarán la app (Paso 1.6 y 2.4).

### Opción B: crear un proyecto de Google Cloud nuevo
1. Ve a [console.cloud.google.com](https://console.cloud.google.com) → crea un proyecto nuevo.
2. **APIs y servicios → Biblioteca**: activa "Google Sheets API" y "Google Drive API".
3. **APIs y servicios → Pantalla de consentimiento OAuth**: tipo "Externo",
   completa nombre de la app y correo; agrega como "usuarios de prueba" los
   correos de las personas que usarán la app (mientras no la publiques).
4. **APIs y servicios → Credenciales → Crear credenciales**:
   - **Clave de API** → cópiala → va en `config.js` como `API_KEY`.
   - **ID de cliente de OAuth** tipo **"Aplicación web"** → en "Orígenes de
     JavaScript autorizados" agrega la URL donde publicarás la app (ej:
     `https://tuusuario.github.io`) → cópiala → va en `config.js` como `CLIENT_ID`.

---

## PASO 4 — Completar `config.js`

Abre `config.js` y reemplaza:
```js
API_KEY:    'tu API Key',
CLIENT_ID:  'tu Client ID.apps.googleusercontent.com',
SHEET_ID:   'el ID del Sheet del Paso 1',
DRIVE_ROOT_FOLDER: 'el ID de la carpeta del Paso 2',
```

---

## PASO 5 — Publicar la app (igual que hiciste con Flota)

1. Sube los archivos (`index.html`, `style.css`, `app.js`, `config.js`,
   `manifest.json`, `sw.js`, `logo.png`, `logo-white.png`) a un repositorio
   de GitHub Pages, o a la misma carpeta donde tienes la app de Flota (en
   una subcarpeta distinta, ej. `/prevencion`).
2. Actívalo en **Settings → Pages**.
3. Abre la URL, instala en el celular como hiciste con la otra app
   ("Agregar a pantalla de inicio").

---

## PASO 6 — Agregar a los usuarios que podrán usar la app

Solo necesitan:
1. Tener acceso de **Editor** al Sheet (Paso 1.6) y a la carpeta de Drive (Paso 2.4).
2. Entrar a la URL de la app e iniciar sesión con Google.

No hace falta nada más de configuración por usuario — el rol (`USUARIOS`) es
opcional por ahora; lo dejé creado en la planilla para el futuro, por si más
adelante quieres restringir qué puede hacer cada persona (por ejemplo, que
solo el prevencionista pueda cerrar incidentes).

---

## Cómo queda organizado el Drive

```
LST - Prevención de Riesgos (carpeta raíz)
 ├─ Inspecciones/              → fotos de cada inspección
 ├─ Incidentes-Accidentes/     → fotos de cada incidente o accidente
 ├─ Procedimientos/            → PDFs de los PTS
 ├─ Entrega EPP - Firmas/      → imagen de la firma de cada entrega
 └─ Trabajadores/              → foto de cada trabajador (opcional)
```
Todo esto se crea solo, automáticamente, la primera vez que alguien sube un
archivo de cada tipo — no tienes que crear nada a mano.

---

## Qué hace cada módulo

- **Inspecciones**: registra fecha, área, hallazgo, nivel de riesgo y foto.
  Al guardar, la app **genera automáticamente una alerta de charla** sobre el
  tema elegido (ej. "Trabajo en altura") y la deja como *Pendiente* en el
  módulo "Charlas de Seguridad", para que el prevencionista la programe.
- **Incidentes y Accidentes**: fecha, tipo, trabajador, causas, gravedad,
  acciones correctivas y foto.
- **Procedimientos de Trabajo Seguro**: código, nombre, versión y el PDF
  del procedimiento, guardado en Drive.
- **Entrega de EPP**: selecciona trabajador y EPP entregado, y el trabajador
  firma con el dedo en la pantalla — la firma se guarda como imagen en Drive.
- **Trabajadores**: alta de nueva nómina, con foto opcional. Se usa como
  lista desplegable en los módulos de Incidentes y EPP.

---

## Si algo falla

- **"Sin permiso sobre el Sheet/Drive"** → falta compartir el Sheet o la
  carpeta de Drive como Editor con esa cuenta (Pasos 1.6 / 2.4).
- **"No se encontró la hoja o carpeta"** → revisa que los IDs en `config.js`
  estén bien copiados (sin espacios, sin `https://` incluido).
- **El botón de Google no hace nada** → revisa que el dominio donde publicaste
  la app esté en "Orígenes de JavaScript autorizados" del Client ID (Paso 3).

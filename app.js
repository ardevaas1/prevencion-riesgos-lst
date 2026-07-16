// ============================================
// PREVENCIÓN DE RIESGOS — Constructora LST
// ============================================

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_UP    = 'https://www.googleapis.com/upload/drive/v3';

// ── Catálogos ────────────────────────────────────────────────
const TEMAS_CHARLA = [
  'Orden y limpieza', 'Trabajo en altura', 'Uso correcto de EPP',
  'Manejo de herramientas y equipos', 'Riesgo eléctrico', 'Espacios confinados',
  'Izaje de cargas', 'Excavaciones y zanjas', 'Manejo manual de materiales',
  'Extintores y emergencias', 'Señalización y demarcación', 'Vehículos y maquinaria', 'Otro'
];
const NIVELES_RIESGO = [
  { value: 'Bajo',  color: 'green' },
  { value: 'Medio', color: 'amber' },
  { value: 'Alto',  color: 'red'   },
];
const TIPOS_EVENTO_INC = ['Cuasiaccidente', 'Incidente', 'Accidente Leve', 'Accidente Grave', 'Accidente Fatal'];
const EPP_ITEMS = [
  'Casco', 'Lentes de seguridad', 'Guantes', 'Zapatos de seguridad',
  'Chaleco reflectante', 'Protección auditiva', 'Arnés de seguridad',
  'Mascarilla / Respirador', 'Careta facial', 'Ropa de agua', 'Otro'
];

// ── Sugerencia automática de charla según el texto del incidente ──────
// Motor de palabras clave (no llama a una IA externa: conectar una API de
// IA real desde el navegador expondría la clave a cualquiera que abra el
// código fuente de la página). Detecta el tema de charla más relacionado
// analizando la descripción y las causas del incidente.
const REGLAS_SUGERENCIA_CHARLA = [
  { tema: 'Orden y limpieza', palabras: ['orden', 'desorden', 'limpieza', 'desorganiz', 'obstru', 'objetos en el paso', 'suciedad'] },
  { tema: 'Trabajo en altura', palabras: ['altura', 'andamio', 'caida de altura', 'caída de altura', 'escalera', 'techumbre', 'borde', 'baranda'] },
  { tema: 'Uso correcto de EPP', palabras: ['epp', 'proteccion personal', 'protección personal', 'casco', 'guantes', 'lentes de seguridad', 'sin proteccion', 'sin protección'] },
  { tema: 'Manejo de herramientas y equipos', palabras: ['herramienta', 'equipo defectuoso', 'maquina', 'máquina', 'corte', 'sierra', 'esmeril', 'taladro'] },
  { tema: 'Riesgo eléctrico', palabras: ['electric', 'eléctric', 'cortocircuito', 'cable', 'enchufe', 'tablero electrico', 'tablero eléctrico'] },
  { tema: 'Espacios confinados', palabras: ['espacio confinado', 'confinado', 'ventilacion', 'ventilación', 'pozo', 'camara', 'cámara'] },
  { tema: 'Izaje de cargas', palabras: ['izaje', 'grua', 'grúa', 'carga suspendida', 'eslinga', 'gancho', 'polipasto'] },
  { tema: 'Excavaciones y zanjas', palabras: ['excavacion', 'excavación', 'zanja', 'derrumbe', 'entibacion', 'entibación'] },
  { tema: 'Manejo manual de materiales', palabras: ['manejo manual', 'levant', 'sobreesfuerzo', 'peso', 'postura', 'espalda', 'carga manual'] },
  { tema: 'Extintores y emergencias', palabras: ['incendio', 'fuego', 'extintor', 'emergencia', 'humo', 'quemadura'] },
  { tema: 'Señalización y demarcación', palabras: ['señal', 'demarcacion', 'demarcación', 'cinta de seguridad', 'letrero'] },
  { tema: 'Vehículos y maquinaria', palabras: ['vehiculo', 'vehículo', 'camion', 'camión', 'atropell', 'retroceso', 'maquinaria pesada'] },
];
function sugerirTemaCharla(texto) {
  const t = (texto || '').toLowerCase();
  for (const regla of REGLAS_SUGERENCIA_CHARLA) {
    if (regla.palabras.some(p => t.includes(p))) return regla.tema;
  }
  return null;
}

// ── Sugerencia ampliada de plan de acción (Incidentes) ─────────────────
// Mismo motor de palabras clave: antes de caer en "sugerir una charla" se
// revisa si el incidente es más bien un tema de EPP dañado/faltante
// (reponer EPP), de herramienta/equipo en mal estado (mantención), o si
// existe un Procedimiento de Trabajo Seguro vigente para esa área (revisarlo).
const REGLAS_SUGERENCIA_EPP = [
  { item: 'Casco', palabras: ['sin casco', 'casco dañado', 'casco roto', 'no tenia casco', 'no tenía casco', 'falta casco', 'casco malo'] },
  { item: 'Lentes de seguridad', palabras: ['sin lentes', 'lentes rayados', 'lentes rotos', 'lentes dañados', 'falta lentes'] },
  { item: 'Guantes', palabras: ['sin guantes', 'guantes rotos', 'guantes dañados', 'falta guantes', 'guantes en mal estado'] },
  { item: 'Zapatos de seguridad', palabras: ['sin zapatos de seguridad', 'zapatos dañados', 'zapatos rotos', 'zapatos en mal estado'] },
  { item: 'Chaleco reflectante', palabras: ['sin chaleco', 'chaleco roto', 'chaleco dañado'] },
  { item: 'Protección auditiva', palabras: ['sin proteccion auditiva', 'sin protección auditiva', 'tapones dañados'] },
  { item: 'Arnés de seguridad', palabras: ['sin arnes', 'sin arnés', 'arnes dañado', 'arnés dañado', 'arnes roto', 'arnés roto', 'arnes en mal estado'] },
  { item: 'Mascarilla / Respirador', palabras: ['sin mascarilla', 'mascarilla rota', 'sin respirador', 'respirador dañado'] },
  { item: 'Careta facial', palabras: ['sin careta', 'careta rota', 'careta dañada'] },
];
function sugerirReposicionEpp(texto) {
  const t = (texto || '').toLowerCase();
  for (const regla of REGLAS_SUGERENCIA_EPP) {
    if (regla.palabras.some(p => t.includes(p))) return regla.item;
  }
  if (t.includes('epp') && /(sin |falta|dañad|roto|rota|perdio|perdió|no tenia|no tenía)/.test(t)) return 'EPP';
  return null;
}
const PALABRAS_MANTENCION = [
  'herramienta dañada', 'herramienta en mal estado', 'equipo defectuoso', 'equipo dañado',
  'equipo en mal estado', 'maquina dañada', 'máquina dañada', 'maquina defectuosa', 'máquina defectuosa',
  'no funciona', 'esmeril malo', 'esmeril dañado', 'taladro dañado', 'sierra dañada', 'cable pelado',
];
function sugerirMantencion(texto) {
  const t = (texto || '').toLowerCase();
  return PALABRAS_MANTENCION.some(p => t.includes(p)) ? 'Revisar y dar mantención al equipo/herramienta involucrada' : null;
}
function sugerirProcedimientoRelacionado(area) {
  const a = (area || '').toLowerCase().trim();
  if (!a) return null;
  return allProcedimientos.find(p => p.estado === 'Vigente' && p.area &&
    (a.includes(p.area.toLowerCase()) || p.area.toLowerCase().includes(a))) || null;
}
function sugerirPlanAccion(descripcion, causas, area) {
  const texto = `${descripcion || ''} ${causas || ''}`;
  const itemEpp = sugerirReposicionEpp(texto);
  if (itemEpp) return { tipo: 'epp', valor: itemEpp };
  const mantencion = sugerirMantencion(texto);
  if (mantencion) return { tipo: 'mantencion', valor: mantencion };
  const pts = sugerirProcedimientoRelacionado(area);
  if (pts) return { tipo: 'procedimiento', valor: pts };
  const tema = sugerirTemaCharla(texto);
  if (tema) return { tipo: 'charla', valor: tema };
  return null;
}

let userEmail = null;
let userRole  = null; // admin | prevencionista | viewer

// ── OAuth / Google Identity Services ───────────────────────────
let tokenClient = null;
let accessToken = null;
let tokenExpiry = 0;
const TOKEN_KEY   = 'lst_pr_token';
const EXPIRY_KEY  = 'lst_pr_expiry';
const EMAIL_KEY   = 'lst_pr_email';
const HADLOGIN_KEY = 'lst_pr_had_login'; // se mantiene aunque el token expire; solo se borra al Cerrar sesión

function saveToken(token, expiresIn) {
  accessToken = token;
  tokenExpiry = Date.now() + ((expiresIn - 60) * 1000); // 60s de margen
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRY_KEY, String(tokenExpiry));
}
function loadStoredToken() {
  const t = localStorage.getItem(TOKEN_KEY);
  const e = parseInt(localStorage.getItem(EXPIRY_KEY) || '0', 10);
  const em = localStorage.getItem(EMAIL_KEY);
  if (t && e > Date.now()) { accessToken = t; tokenExpiry = e; userEmail = em; return true; }
  return false;
}
function clearToken() {
  accessToken = null; tokenExpiry = 0;
  localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(EXPIRY_KEY);
}
function tokenValido() { return accessToken && tokenExpiry > Date.now(); }

function initOAuth() {
  if (typeof google === 'undefined') { setTimeout(initOAuth, 300); return; }
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CONFIG.CLIENT_ID,
    scope: CONFIG.SCOPES + ' https://www.googleapis.com/auth/userinfo.email',
    callback: async (resp) => {
      if (resp.error) { mostrarLogin('Error: ' + resp.error); return; }
      saveToken(resp.access_token, resp.expires_in || 3600);
      localStorage.setItem(HADLOGIN_KEY, '1');
      await obtenerEmailUsuario();
      arrancarApp();
    },
  });
}

async function obtenerEmailUsuario() {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + encodeURIComponent(accessToken));
    if (res.ok) {
      const d = await res.json();
      userEmail = (d.email || '').toLowerCase();
      localStorage.setItem(EMAIL_KEY, userEmail);
    }
  } catch (e) { console.warn('No se pudo obtener email', e); }
}

// Botón "Iniciar sesión con Google": si ya inició sesión antes en este
// dispositivo, reutiliza esa misma cuenta en silencio (sin mostrar el
// selector de cuentas). El selector de cuentas solo aparece la primera
// vez, o después de tocar "Cerrar sesión".
function signIn() {
  mostrarLogin('Conectando...', true);
  if (!tokenClient) { initOAuth(); setTimeout(signIn, 500); return; }
  const hadLogin   = localStorage.getItem(HADLOGIN_KEY);
  const savedEmail = localStorage.getItem(EMAIL_KEY) || '';
  const opts = hadLogin
    ? { prompt: '', login_hint: savedEmail }
    : { prompt: 'select_account' };

  if (hadLogin) {
    // Si el intento silencioso no responde en unos segundos (puede pasar
    // en Safari/iOS), se reintenta pidiendo elegir cuenta para no dejar
    // a la persona con el botón pegado en "Conectando...".
    let resuelto = false;
    const prevCb = tokenClient.callback;
    const watchdog = setTimeout(() => {
      if (resuelto) return;
      resuelto = true;
      tokenClient.callback = prevCb;
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    }, 6000);
    tokenClient.callback = (resp) => {
      if (resuelto) return;
      resuelto = true;
      clearTimeout(watchdog);
      tokenClient.callback = prevCb;
      prevCb(resp);
    };
  }
  tokenClient.requestAccessToken(opts);
}

function mostrarLogin(hint, conectando) {
  document.getElementById('login-hint').textContent = hint || 'Usa tu cuenta corporativa autorizada';
  document.getElementById('login-btn').classList.toggle('hidden', !!conectando);
  document.getElementById('login-spinner').classList.toggle('hidden', !conectando);
  document.getElementById('login-screen').classList.remove('hidden');
}

function signOut() {
  if (!confirm('¿Cerrar sesión? Vas a tener que elegir tu cuenta de Google de nuevo para volver a entrar.')) return;
  if (accessToken && typeof google !== 'undefined' && google.accounts?.oauth2) {
    google.accounts.oauth2.revoke(accessToken, () => {});
  }
  clearToken();
  localStorage.removeItem(HADLOGIN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  userEmail = null; userRole = null;
  document.getElementById('main').classList.add('hidden');
  document.getElementById('desktop-sidebar').classList.add('dt-oculto');
  document.getElementById('desktop-main').classList.add('dt-oculto');
  mostrarLogin('Usa tu cuenta corporativa autorizada', false);
}

async function ensureToken() {
  if (tokenValido()) return;
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject(new Error('Sesión no iniciada')); return; }
    const prevCb = tokenClient.callback;
    tokenClient.callback = (resp) => {
      tokenClient.callback = prevCb;
      if (resp.error) { reject(new Error(resp.error)); return; }
      saveToken(resp.access_token, resp.expires_in || 3600);
      resolve();
    };
    const savedEmail = localStorage.getItem(EMAIL_KEY) || '';
    tokenClient.requestAccessToken({ prompt: '', login_hint: savedEmail });
  });
}
function authHeader() { return { Authorization: 'Bearer ' + accessToken }; }

// ── Sheets API ───────────────────────────────────────────────
function friendlyErr(status, body) {
  let msg = ''; try { msg = JSON.parse(body).error.message; } catch (e) {}
  if (status === 403) return 'Sin permiso sobre el Sheet/Drive. Verifica que tu cuenta tenga acceso de Editor.';
  if (status === 401) return 'Sesión expirada. Vuelve a iniciar sesión.';
  if (status === 404) return 'No se encontró la hoja o carpeta (revisa los IDs en config.js).';
  return `Error ${status} de Google${msg ? ': ' + msg : ''}`;
}
async function fetchSheet(range) {
  await ensureToken();
  const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) throw new Error(friendlyErr(res.status, await res.text()));
  return (await res.json()).values || [];
}
async function appendSheet(range, values) {
  await ensureToken();
  const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });
  if (!res.ok) throw new Error(friendlyErr(res.status, await res.text()));
  return res.json();
}

// ── Drive API — carpetas y subida de archivos ──────────────────
let driveFolderCache = {};

async function findOrCreateFolder(name, parentId) {
  await ensureToken();
  const key = parentId + '/' + name;
  if (driveFolderCache[key]) return driveFolderCache[key];
  const q = encodeURIComponent(`'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, { headers: authHeader() });
  if (!searchRes.ok) throw new Error(friendlyErr(searchRes.status, await searchRes.text()));
  const data = await searchRes.json();
  if (data.files && data.files.length > 0) { driveFolderCache[key] = data.files[0].id; return data.files[0].id; }

  const boundary = 'lstpr_' + Date.now();
  const metadata = JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] });
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}--`;
  const createRes = await fetch(`${DRIVE_UP}/files?uploadType=multipart`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'multipart/related; boundary=' + boundary },
    body,
  });
  if (!createRes.ok) throw new Error(friendlyErr(createRes.status, await createRes.text()));
  const folder = await createRes.json();
  driveFolderCache[key] = folder.id;
  return folder.id;
}

async function getModuloFolder(nombreModulo) {
  return findOrCreateFolder(nombreModulo, CONFIG.DRIVE_ROOT_FOLDER);
}
// Carpeta personal del trabajador (Trabajadores/{nombre}/) — ahí quedan juntos
// todos sus archivos (foto, contrato, examen de altura, firmas de EPP, etc.)
// en vez de mezclados con los de todos los demás en carpetas por tipo de dato.
async function getTrabajadorFolder(nombreTrabajador) {
  const raiz = await getModuloFolder('Trabajadores');
  return findOrCreateFolder(nombreTrabajador, raiz);
}

// Sube un archivo (File o Blob) a una carpeta de Drive ya resuelta. Devuelve {id, name, link}
async function uploadFileToFolder(fileOrBlob, folderId, prefixName, ext) {
  await ensureToken();
  toast('Subiendo archivo...');
  const fecha = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
  const hora = new Date().toTimeString().slice(0,5).replace(':','');
  const extension = ext || (fileOrBlob.name ? fileOrBlob.name.split('.').pop() : 'jpg');
  const fileName = `${prefixName}_${fecha}_${hora}.${extension}`;
  const mimeType = fileOrBlob.type || 'application/octet-stream';

  const b64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(fileOrBlob);
  });

  const boundary = 'lstpr_' + Date.now();
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const body = [
    '--' + boundary, 'Content-Type: application/json; charset=UTF-8', '', metadata,
    '--' + boundary, 'Content-Type: ' + mimeType, 'Content-Transfer-Encoding: base64', '', b64,
    '--' + boundary + '--'
  ].join('\r\n');

  const res = await fetch(`${DRIVE_UP}/files?uploadType=multipart`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'multipart/related; boundary=' + boundary },
    body,
  });
  if (!res.ok) throw new Error(friendlyErr(res.status, await res.text()));
  const result = await res.json();
  toast('Archivo subido ✓', 'ok');
  return { id: result.id, name: result.name, link: `https://drive.google.com/file/d/${result.id}/view` };
}
// Sube un archivo a una subcarpeta del módulo (Root/{nombreModulo}/)
async function uploadFile(fileOrBlob, nombreModulo, prefixName, ext) {
  const folderId = await getModuloFolder(nombreModulo);
  return uploadFileToFolder(fileOrBlob, folderId, prefixName, ext);
}
// Sube un archivo a la carpeta personal del trabajador (Root/Trabajadores/{nombre}/)
async function uploadFileTrabajador(fileOrBlob, nombreTrabajador, prefixName, ext) {
  const folderId = await getTrabajadorFolder(nombreTrabajador);
  return uploadFileToFolder(fileOrBlob, folderId, prefixName, ext);
}

// ── UI helpers ───────────────────────────────────────────────
function splash(pct, hint) {
  const fill = document.getElementById('splash-progress');
  if (!fill) return;
  if (pct > 0) fill.classList.remove('splash-waiting');
  fill.style.width = pct + '%';
  if (hint) document.getElementById('splash-hint').textContent = hint;
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 2600);
}
// ── Íconos SVG minimalistas (mismo estilo de línea que la app de Flota) ──
const ICONS = {
  inspecciones: '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M9 4V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4" stroke="currentColor" stroke-width="1.7"/><path d="M9 12.5l1.8 1.8L15 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 17h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  incidentes: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 2 20h20L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9.5v4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>',
  procedimientos: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 3v4h4" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.5 12h6M9.5 15.5h6M9.5 8.5h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  epp: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 16.5a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 6.5v3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="2" y="16.5" width="20" height="3" rx="1.3" stroke="currentColor" stroke-width="1.7"/></svg>',
  trabajadores: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7.5" r="3.5" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  charlas: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-4 4v-4H4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 9h8M8 12.3h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  camara: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 8a1 1 0 0 1 1-1h2l1.2-2h7.6L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" stroke="currentColor" stroke-width="1.7"/></svg>',
  documento: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3v4h4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  firma: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 17c2.5-1 4.5-1 6.5 0s4.5 1 6.5 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6 13.5 15 4.5a1.7 1.7 0 0 1 2.4 2.4L8.4 15.9l-3 0.7.6-3.1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  obra: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 21V8l6-4 6 4v13" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 21v-7h6v7" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 10h.01M12 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  lupa: '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};
function ic(name, size) { return ICONS[name].replace('<svg ', `<svg style="width:${size||14}px;height:${size||14}px;vertical-align:-3px;flex-shrink:0" `); }

function renderModulosHome() {
  const modulos = [
    { key: 'inspecciones', nombre: 'Inspecciones', desc: 'Con foto y alerta de charla automática', color: 'flota' },
    { key: 'incidentes', nombre: 'Incidentes y Accidentes', desc: 'Registro con evidencia fotográfica', color: 'and' },
    { key: 'procedimientos', nombre: 'Procedimientos de Trabajo Seguro', desc: 'PTS vigentes de la obra', color: 'cont' },
    { key: 'epp', nombre: 'Entrega de EPP', desc: 'Con firma digital del trabajador', color: 'mov' },
    { key: 'trabajadores', nombre: 'Trabajadores', desc: 'Nómina de la obra', color: 'inv' },
    { key: 'charlas', nombre: 'Charlas de Seguridad', desc: 'Alertas generadas por inspecciones', color: 'flota' },
  ];
  setListHTML('modulos-home', modulos.map(m => `
    <div class="modulo-card" onclick="irPagina('${m.key}')">
      <div class="modulo-icon modulo-icon--${m.color}">${ICONS[m.key]}</div>
      <div class="modulo-info"><div class="modulo-nombre">${m.nombre}</div><div class="modulo-desc">${m.desc}</div></div>
    </div>`).join(''));
}

function setListHTML(name, html) {
  document.querySelectorAll(`[data-list="${name}"]`).forEach(el => el.innerHTML = html);
}
function setStat(name, value) {
  document.querySelectorAll(`[data-stat="${name}"]`).forEach(el => el.textContent = value);
}
function openPanel(id) {
  const el = document.getElementById(id);
  // Fuerza la posición inicial ANTES de mostrar el panel, para que el
  // navegador tenga un punto de partida real desde el cual animar
  // (si no, la primera apertura no se desliza: aparece de golpe).
  el.style.transform = 'translateX(100%)';
  el.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transform = 'translateX(0)'; }));

  if (window.innerWidth >= 900 && !document.getElementById('panel-overlay')) {
    const ov = document.createElement('div');
    ov.id = 'panel-overlay';
    ov.className = 'panel-overlay';
    ov.onclick = () => {
      const visible = [...document.querySelectorAll('.panel:not(.hidden)')].pop();
      if (visible) closePanel(visible.id);
    };
    document.getElementById('app').appendChild(ov);
  }
}
function closePanel(id) {
  const el = document.getElementById(id);
  el.style.transform = 'translateX(100%)';
  let cerrado = false;
  function onEnd() {
    if (cerrado) return;
    cerrado = true;
    el.removeEventListener('transitionend', onEnd);
    el.classList.add('hidden');
    if (window.innerWidth >= 900) {
      const quedan = document.querySelectorAll('.panel:not(.hidden)').length;
      if (!quedan) { const ov = document.getElementById('panel-overlay'); if (ov) ov.remove(); }
    }
  }
  el.addEventListener('transitionend', onEnd, { once: true });
  setTimeout(onEnd, 320);
}
function fmtFecha(d) { return new Date(d).toLocaleDateString('es-CL'); }
function hoyISO() { return new Date().toISOString().slice(0,10); }

// ============================================================
// DATOS EN MEMORIA
// ============================================================
let allTrabajadores = [];
let allInspecciones = [];
let allIncidentes = [];
let allProcedimientos = [];
let allEpp = [];
let allCharlas = [];

async function cargarTodo(silencioso) {
  if (!silencioso) { splash(20, 'Conectando con Google Sheets...'); }
  else { toast('Actualizando datos...'); }
  try {
    if (!silencioso) splash(45, 'Cargando información...');
    const [trab, insp, inc, proc, epp, charlas] = await Promise.all([
      fetchSheet(`'${CONFIG.SHEET_TRABAJADORES}'!A2:O2000`),
      fetchSheet(`'${CONFIG.SHEET_INSPECCIONES}'!A2:M2000`),
      fetchSheet(`'${CONFIG.SHEET_INCIDENTES}'!A2:P2000`),
      fetchSheet(`'${CONFIG.SHEET_PROCEDIMIENTOS}'!A2:I2000`),
      fetchSheet(`'${CONFIG.SHEET_EPP}'!A2:I2000`),
      fetchSheet(`'${CONFIG.SHEET_CHARLAS}'!A2:G2000`),
    ]);
    if (!silencioso) splash(85, 'Preparando la app...');
    allTrabajadores = trab.map((r,i) => rowToTrabajador(r,i));
    allInspecciones = insp.map((r,i) => rowToInspeccion(r,i));
    allIncidentes = inc.map((r,i) => rowToIncidente(r,i));
    allProcedimientos = proc.map((r,i) => rowToProcedimiento(r,i));
    allEpp = epp.map((r,i) => rowToEpp(r,i));
    allCharlas = charlas.map((r,i) => rowToCharla(r,i));
    renderDashboard();
    renderTrabajadores(); renderInspecciones(); renderIncidentes(); renderProcedimientos(); renderEpp(); renderCharlas();
    if (!silencioso) splash(100, '¡Listo!');
    else toast('Datos actualizados ✓', 'ok');
  } catch (e) {
    console.error(e);
    if (!silencioso) splash(100, 'Hubo un problema al cargar');
    toast(e.message, 'error');
  }
}

// ── Mapeo de filas ───────────────────────────────────────────
function rowToTrabajador(r, i) {
  return { fila: i+2, n: r[0]||'', nombre: r[1]||'', rut: r[2]||'', cargo: r[3]||'', empresa: r[4]||'',
    fechaIngreso: r[5]||'', estado: r[6]||'Activo', foto: r[7]||'', fechaRegistro: r[8]||'',
    obra: r[9]||'', contratoInicio: r[10]||'', contratoTermino: r[11]||'', contratoArchivo: r[12]||'',
    alturaVigencia: r[13]||'', alturaArchivo: r[14]||'' };
}
function rowToInspeccion(r, i) {
  return { fila: i+2, n: r[0]||'', fecha: r[1]||'', tipo: r[2]||'', area: r[3]||'', inspector: r[4]||'',
    tema: r[5]||'', hallazgos: r[6]||'', riesgo: r[7]||'Bajo', foto: r[8]||'', accion: r[9]||'',
    estado: r[10]||'Abierta', fechaRegistro: r[11]||'', obra: r[12]||'' };
}
function rowToIncidente(r, i) {
  return { fila: i+2, n: r[0]||'', fecha: r[1]||'', tipo: r[2]||'', trabajador: r[3]||'', area: r[4]||'',
    descripcion: r[5]||'', causas: r[6]||'', gravedad: r[7]||'', foto: r[8]||'', accion: r[9]||'',
    estado: r[10]||'Abierto', fechaRegistro: r[11]||'', reportadoPor: r[12]||'', respaldo: r[13]||'',
    obra: r[14]||'', diasPerdidos: parseInt(r[15],10) || 0 };
}
function rowToProcedimiento(r, i) {
  return { fila: i+2, n: r[0]||'', codigo: r[1]||'', nombre: r[2]||'', area: r[3]||'', version: r[4]||'',
    fechaEmision: r[5]||'', archivo: r[6]||'', estado: r[7]||'Vigente', fechaRegistro: r[8]||'' };
}
function rowToEpp(r, i) {
  return { fila: i+2, n: r[0]||'', fecha: r[1]||'', trabajador: r[2]||'', rut: r[3]||'', epp: r[4]||'',
    cantidad: r[5]||'', firma: r[6]||'', responsable: r[7]||'', fechaRegistro: r[8]||'' };
}
function rowToCharla(r, i) {
  return { fila: i+2, n: r[0]||'', fecha: r[1]||'', tema: r[2]||'', origen: r[3]||'', estado: r[4]||'Pendiente',
    fechaRealizada: r[5]||'', responsable: r[6]||'' };
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const abiertas = allInspecciones.filter(i => i.estado !== 'Cerrada').length;
  const incAbiertos = allIncidentes.filter(i => i.estado !== 'Cerrado').length;
  const charlasPend = allCharlas.filter(c => c.estado === 'Pendiente').length;
  setStat('trabajadores', allTrabajadores.filter(t=>t.estado==='Activo').length);
  setStat('inspecciones', abiertas);
  setStat('incidentes', incAbiertos);
  setStat('charlas', charlasPend);
  renderEstadisticasSeguridad();
}

// ── Obras (catálogo dinámico, mismo patrón que "Otro" en EPP) ──────────
function opcionesObrasDisponibles() {
  const obras = new Set([
    ...allTrabajadores.map(t => t.obra),
    ...allInspecciones.map(i => i.obra),
    ...allIncidentes.map(i => i.obra),
  ].filter(Boolean));
  return [...obras].sort((a, b) => a.localeCompare(b, 'es'));
}
function opcionesObraSelectHTML(actual) {
  return opcionesObrasDisponibles().map(o => `<option ${o===actual?'selected':''}>${esc(o)}</option>`).join('')
    + '<option value="__otra__">+ Escribir otra obra...</option>';
}
function onCambioObraSelect(selEl, otroId) {
  document.getElementById(otroId).classList.toggle('hidden', selEl.value !== '__otra__');
}
function valorObra(selEl, otroId) {
  if (selEl.value === '__otra__') return document.getElementById(otroId).value.trim();
  return selEl.value;
}

// ── Índices de seguridad (fórmulas DS40 / Mutualidad) ──────────────────
// Horas Hombre Trabajadas: se estima desde la vigencia del contrato de cada
// trabajador (fecha inicio/término) × jornada diaria estándar, porque la app
// no registra asistencia real. Ajustar HORAS_JORNADA_DIARIA si la jornada
// real de la obra es distinta.
const HORAS_JORNADA_DIARIA = 8;
let obraDashboardSel = 'todas';

function onCambioObraDashboard() {
  obraDashboardSel = document.getElementById('sel-obra-dashboard').value;
  renderEstadisticasSeguridad();
}
function esAccidenteConTiempoPerdido(inc) {
  return inc.tipo === 'Accidente Leve' || inc.tipo === 'Accidente Grave' || inc.tipo === 'Accidente Fatal';
}
function fechaISO(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
// offsetAnios permite calcular el mismo período (1 de enero → hoy) de un año anterior,
// para comparar el año actual contra el mismo punto del año pasado (año vs año).
function calcularEstadisticasSeguridad(obraSel, offsetAnios = 0) {
  const hoyReal = new Date();
  const anio = hoyReal.getFullYear() - offsetAnios;
  const hoy = new Date(anio, hoyReal.getMonth(), hoyReal.getDate());
  const inicioPeriodo = new Date(anio, 0, 1);
  const inicioPeriodoStr = `${anio}-01-01`;
  const hoyStr = fechaISO(hoy);

  const trabajadoresObra = allTrabajadores.filter(t => obraSel === 'todas' || t.obra === obraSel);
  let horasHombre = 0, sinContrato = 0;
  trabajadoresObra.forEach(t => {
    if (!t.contratoInicio) { sinContrato++; return; }
    const ini = new Date(t.contratoInicio + 'T00:00:00');
    const fin = t.contratoTermino ? new Date(t.contratoTermino + 'T00:00:00') : hoy;
    const desde = ini > inicioPeriodo ? ini : inicioPeriodo;
    const hasta = fin < hoy ? fin : hoy;
    if (hasta >= desde) {
      const dias = Math.floor((hasta - desde) / 86400000) + 1;
      horasHombre += dias * HORAS_JORNADA_DIARIA;
    }
  });

  const incidentesPeriodo = allIncidentes.filter(i =>
    (obraSel === 'todas' || i.obra === obraSel) && esAccidenteConTiempoPerdido(i) &&
    i.fecha >= inicioPeriodoStr && i.fecha <= hoyStr);
  const nAccidentes = incidentesPeriodo.length;
  const diasPerdidos = incidentesPeriodo.reduce((s, i) => s + (i.diasPerdidos || 0), 0);
  const nTrabajadoresActivos = trabajadoresObra.filter(t => t.estado === 'Activo').length;

  return {
    anio: hoy.getFullYear(), nAccidentes, diasPerdidos, horasHombre, sinContrato,
    tasaAccidentabilidad: nTrabajadoresActivos > 0 ? (nAccidentes / nTrabajadoresActivos) * 100 : 0,
    indiceFrecuencia: horasHombre > 0 ? (nAccidentes / horasHombre) * 1000000 : 0,
    indiceGravedad: horasHombre > 0 ? (diasPerdidos / horasHombre) * 1000000 : 0,
  };
}
// Tarjeta de índice con gráfico de barras comparando el mismo período del
// año anterior contra el año actual (en vez de solo mostrar el número).
function graficoIndice(nombre, color, valorActual, valorPrev, anioActual, formato) {
  const max = Math.max(valorActual, valorPrev, 0.0001);
  const hActual = Math.max(6, Math.round((valorActual / max) * 100));
  const hPrev = Math.max(6, Math.round((valorPrev / max) * 100));
  return `
    <div class="indice-card">
      <div class="indice-nombre">${nombre}</div>
      <div class="indice-valor ${color}">${formato(valorActual)}</div>
      <div class="indice-chart">
        <div class="indice-bar-col">
          <div class="indice-bar-track"><div class="indice-bar ${color}" style="height:${hPrev}%"></div></div>
          <span class="indice-bar-y">${anioActual - 1}</span>
        </div>
        <div class="indice-bar-col">
          <div class="indice-bar-track"><div class="indice-bar ${color} indice-bar--actual" style="height:${hActual}%"></div></div>
          <span class="indice-bar-y">${anioActual}</span>
        </div>
      </div>
    </div>`;
}
function renderEstadisticasSeguridad() {
  const obras = opcionesObrasDisponibles();
  if (obraDashboardSel !== 'todas' && !obras.includes(obraDashboardSel)) obraDashboardSel = 'todas';
  const st = calcularEstadisticasSeguridad(obraDashboardSel, 0);
  const stPrev = calcularEstadisticasSeguridad(obraDashboardSel, 1);

  setListHTML('stats-seguridad', `
    <div class="stats-obra-bar">${ic('obra',16)}
      <select id="sel-obra-dashboard" class="obra-selector" onchange="onCambioObraDashboard()">
        <option value="todas" ${obraDashboardSel==='todas'?'selected':''}>Todas las obras</option>
        ${obras.map(o => `<option ${o===obraDashboardSel?'selected':''}>${esc(o)}</option>`).join('')}
      </select>
    </div>
    <div class="indices-grid">
      ${graficoIndice('Tasa Accidentabilidad', 'blue', st.tasaAccidentabilidad, stPrev.tasaAccidentabilidad, st.anio, v => v.toFixed(1)+'%')}
      ${graficoIndice('Índice Frecuencia', 'amber', st.indiceFrecuencia, stPrev.indiceFrecuencia, st.anio, v => Math.round(v))}
      ${graficoIndice('Índice Gravedad', 'red', st.indiceGravedad, stPrev.indiceGravedad, st.anio, v => Math.round(v))}
    </div>
    <div class="stats-caption">Acumulado ${st.anio} vs. mismo período ${st.anio-1} · ${st.nAccidentes} accidente(s) con tiempo perdido · ${Math.round(st.horasHombre).toLocaleString('es-CL')} HH trabajadas (estimadas)</div>
    ${st.sinContrato > 0 ? `<div class="stats-aviso">${st.sinContrato} trabajador(es) sin fecha de contrato registrada — sus horas no se cuentan en los índices.</div>` : ''}
  `);
}

// ============================================================
// MÓDULO: TRABAJADORES
// ============================================================
let filtroTrabajadores = '';
// Sin tildes/diacríticos, para que buscar "gonzalez" encuentre "González"
// (en un teclado de celular es más natural escribir sin tilde).
function sinTildes(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function onBuscarTrabajadores(v) {
  filtroTrabajadores = sinTildes((v || '').trim().toLowerCase());
  renderTrabajadores();
}
function renderTrabajadores() {
  let activos = [...allTrabajadores].reverse();
  if (filtroTrabajadores) {
    activos = activos.filter(t => [t.nombre, t.rut, t.cargo, t.empresa, t.obra]
      .some(v => sinTildes((v || '').toLowerCase()).includes(filtroTrabajadores)));
  }
  if (activos.length === 0) { setListHTML('trabajadores', emptyState(filtroTrabajadores ? 'Sin resultados' : 'Sin trabajadores', filtroTrabajadores ? 'Prueba con otro nombre, RUT o cargo' : 'Agrega el primer trabajador')); return; }
  setListHTML('trabajadores', activos.map(t => `
    <div class="card card--default" onclick="abrirFichaTrabajador('${esc(t.nombre).replace(/'/g,"\\'")}')">
      <div class="card-icon modulo-icon--inv">${ic('trabajadores',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(t.nombre)}</div>
        <div class="card-sub">${esc(t.cargo)} · ${esc(t.rut)}</div>
        <div class="badge-row"><span class="badge ${t.estado==='Activo'?'green':'gray'}">${esc(t.estado)}</span>
        <span class="badge blue">${esc(t.empresa)}</span>
        ${t.obra ? `<span class="badge gray">${ic('obra',11)} ${esc(t.obra)}</span>` : ''}</div>
      </div>
      <div class="card-arrow">›</div>
    </div>`).join(''));
}

function abrirFichaTrabajador(nombre) {
  const t = allTrabajadores.find(x => x.nombre === nombre);
  if (!t) { toast('No se encontró el trabajador', 'error'); return; }

  const eppDeEste = allEpp.filter(e => e.trabajador === nombre);
  const grupos = {};
  const orden = [];
  eppDeEste.forEach(e => {
    const key = e.fecha + '|' + e.firma;
    if (!grupos[key]) { grupos[key] = { fecha: e.fecha, firma: e.firma, items: [] }; orden.push(key); }
    grupos[key].items.push(`${e.epp} (${e.cantidad})`);
  });
  const entregasHtml = orden.length === 0
    ? '<div class="card-sub" style="padding:6px 2px;">Sin entregas de EPP registradas.</div>'
    : orden.reverse().map(k => grupos[k]).map(g => `
        <div class="field-row">
          <span>${esc(g.fecha)}<br><span style="color:#888;font-size:12px;">${esc(g.items.join(' · '))}</span></span>
          ${g.firma ? `<a href="${esc(g.firma)}" target="_blank" class="badge blue">${ic('firma',12)} Firma</a>` : ''}
        </div>`).join('');

  const incDeEste = allIncidentes.filter(i => i.trabajador === nombre).reverse();
  const incidentesHtml = incDeEste.length === 0
    ? '<div class="card-sub" style="padding:6px 2px;">Sin incidentes registrados.</div>'
    : incDeEste.map(i => `
        <div class="field-row">
          <span>${esc(i.fecha)} — ${esc(i.tipo)}<br><span style="color:#888;font-size:12px;">${esc(i.area)}</span></span>
          <span class="badge ${i.estado==='Cerrado'?'green':'red'}">${esc(i.estado)}</span>
        </div>`).join('');

  const contratoBadge = !t.contratoInicio
    ? `<span class="badge gray">Sin registrar</span>`
    : !t.contratoTermino
      ? `<span class="badge green">Vigente (indefinido)</span>`
      : t.contratoTermino < hoyISO() ? `<span class="badge red">Vencido</span>` : `<span class="badge green">Vigente</span>`;
  const alturaBadge = !t.alturaVigencia
    ? `<span class="badge gray">Sin registrar</span>`
    : t.alturaVigencia < hoyISO() ? `<span class="badge red">Vencido</span>` : `<span class="badge green">Vigente</span>`;

  document.getElementById('ficha-trabajador-body').innerHTML = `
    <div class="ficha-hero">
      <div class="ficha-hero-icon">${ic('trabajadores',32)}</div>
      <div class="ficha-hero-info">
        <div class="ficha-hero-type">${esc(t.cargo)}</div>
        <div class="ficha-hero-name">${esc(t.nombre)}</div>
      </div>
    </div>
    <div class="field-row"><span>RUT</span><b>${esc(t.rut)}</b></div>
    <div class="field-row"><span>Empresa / Contratista</span><b>${esc(t.empresa)}</b></div>
    <div class="field-row"><span>Obra</span><b>${esc(t.obra || '—')}</b></div>
    <div class="field-row"><span>Fecha de ingreso</span><b>${esc(t.fechaIngreso || '—')}</b></div>
    <div class="field-row"><span>Estado</span><span class="badge ${t.estado==='Activo'?'green':'gray'}">${esc(t.estado)}</span></div>
    ${t.foto ? `<div class="field-row"><span>Foto</span><a href="${esc(t.foto)}" target="_blank" class="badge blue">${ic('camara',12)} Ver foto</a></div>` : ''}

    <div class="sec-label" style="margin-top:20px;">Contrato de trabajo</div>
    <div class="field-row"><span>Inicio</span><b>${esc(t.contratoInicio || '—')}</b></div>
    <div class="field-row"><span>Término</span><b>${esc(t.contratoTermino || 'Indefinido')}</b></div>
    <div class="field-row"><span>Estado</span>${contratoBadge}</div>
    ${t.contratoArchivo ? `<div class="field-row"><span>Documento</span><a href="${esc(t.contratoArchivo)}" target="_blank" class="badge blue">${ic('documento',12)} Ver contrato</a></div>` : ''}
    <button class="action-btn" onclick="abrirEditarContrato(${t.fila})">${t.contratoInicio ? 'Actualizar contrato' : 'Subir contrato'}</button>

    <div class="sec-label" style="margin-top:20px;">Examen de altura física</div>
    <div class="field-row"><span>Vigencia</span><b>${esc(t.alturaVigencia || '—')}</b></div>
    <div class="field-row"><span>Estado</span>${alturaBadge}</div>
    ${t.alturaArchivo ? `<div class="field-row"><span>Documento</span><a href="${esc(t.alturaArchivo)}" target="_blank" class="badge blue">${ic('documento',12)} Ver examen</a></div>` : ''}
    <button class="action-btn" onclick="abrirEditarAltura(${t.fila})">${t.alturaVigencia ? 'Actualizar examen' : 'Subir examen'}</button>

    <div class="sec-label" style="margin-top:20px;">Historial de EPP entregado</div>
    ${entregasHtml}

    <div class="sec-label" style="margin-top:20px;">Incidentes relacionados</div>
    ${incidentesHtml}
  `;
  openPanel('panel-ficha-trabajador');
}
function abrirEditarContrato(fila) {
  const t = allTrabajadores.find(x => x.fila === fila);
  if (!t) return;
  const f = document.getElementById('form-editar-contrato');
  f.reset();
  f.fila.value = fila;
  f.inicio.value = t.contratoInicio || '';
  f.termino.value = t.contratoTermino || '';
  openPanel('panel-editar-contrato');
}
async function guardarContrato(ev) {
  ev.preventDefault();
  const f = ev.target;
  const fila = f.fila.value;
  const t = allTrabajadores.find(x => String(x.fila) === String(fila));
  try {
    let archivoLink = t ? t.contratoArchivo : '';
    const archivoFile = f.archivo.files[0];
    if (archivoFile) {
      const up = t ? await uploadFileTrabajador(archivoFile, t.nombre, 'contrato')
                   : await uploadFile(archivoFile, 'Trabajadores-Documentos', 'contrato_' + fila);
      archivoLink = up.link;
    }
    await ensureToken();
    const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_TRABAJADORES}'!K${fila}:M${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[f.inicio.value, f.termino.value, archivoLink]] }) });
    toast('Contrato actualizado ✓', 'ok');
    closePanel('panel-editar-contrato');
    await cargarTodo(true);
    if (t) abrirFichaTrabajador(t.nombre);
  } catch (e) { toast(e.message, 'error'); }
}
function abrirEditarAltura(fila) {
  const t = allTrabajadores.find(x => x.fila === fila);
  if (!t) return;
  const f = document.getElementById('form-editar-altura');
  f.reset();
  f.fila.value = fila;
  f.vigencia.value = t.alturaVigencia || '';
  openPanel('panel-editar-altura');
}
async function guardarAltura(ev) {
  ev.preventDefault();
  const f = ev.target;
  const fila = f.fila.value;
  const t = allTrabajadores.find(x => String(x.fila) === String(fila));
  try {
    let archivoLink = t ? t.alturaArchivo : '';
    const archivoFile = f.archivo.files[0];
    if (archivoFile) {
      const up = t ? await uploadFileTrabajador(archivoFile, t.nombre, 'examen_altura')
                   : await uploadFile(archivoFile, 'Trabajadores-Documentos', 'examen_altura_' + fila);
      archivoLink = up.link;
    }
    await ensureToken();
    const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_TRABAJADORES}'!N${fila}:O${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[f.vigencia.value, archivoLink]] }) });
    toast('Examen de altura actualizado ✓', 'ok');
    closePanel('panel-editar-altura');
    await cargarTodo(true);
    if (t) abrirFichaTrabajador(t.nombre);
  } catch (e) { toast(e.message, 'error'); }
}
function selectTrabajadoresOptions() {
  return allTrabajadores.filter(t=>t.estado==='Activo').map(t => `<option value="${esc(t.nombre)}|${esc(t.rut)}">${esc(t.nombre)} — ${esc(t.rut)}</option>`).join('');
}
function abrirFormTrabajador() {
  const f = document.getElementById('form-trabajador');
  f.reset();
  const selObra = document.getElementById('sel-obra-trabajador');
  selObra.innerHTML = opcionesObraSelectHTML('');
  onCambioObraSelect(selObra, 'input-trabajador-obra-otra');
  openPanel('panel-form-trabajador');
}
async function guardarTrabajador(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    let fotoLink = '';
    const fotoFile = f.foto.files[0];
    if (fotoFile) {
      const up = await uploadFileTrabajador(fotoFile, f.nombre.value, 'foto');
      fotoLink = up.link;
    }
    const n = allTrabajadores.length + 1;
    const obra = valorObra(f.obra, 'input-trabajador-obra-otra');
    await appendSheet(`'${CONFIG.SHEET_TRABAJADORES}'!A:O`, [[
      n, f.nombre.value, f.rut.value, f.cargo.value, f.empresa.value,
      f.fechaIngreso.value, f.estado.value, fotoLink, new Date().toLocaleString('es-CL'),
      obra, '', '', '', '', ''
    ]]);
    toast('Trabajador agregado ✓', 'ok');
    closePanel('panel-form-trabajador');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// MÓDULO: INSPECCIONES (con foto + alerta de charla)
// ============================================================
function renderInspecciones() {
  const items = [...allInspecciones].reverse();
  if (items.length === 0) { setListHTML('inspecciones', emptyState('Sin inspecciones', 'Registra la primera inspección')); return; }
  setListHTML('inspecciones', items.map(i => {
    const meta = NIVELES_RIESGO.find(n=>n.value===i.riesgo) || NIVELES_RIESGO[0];
    return `<div class="card card--default">
      <div class="card-icon modulo-icon--flota">${ic('inspecciones',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(i.tipo)} — ${esc(i.area)}</div>
        <div class="card-sub">${esc(i.fecha)} · ${esc(i.inspector)} · Tema: ${esc(i.tema)}</div>
        <div class="badge-row"><span class="badge ${meta.color}">Riesgo ${esc(i.riesgo)}</span>
        <span class="badge ${i.estado==='Cerrada'?'green':'gray'}">${esc(i.estado)}</span>
        ${i.foto ? `<a href="${esc(i.foto)}" target="_blank" class="badge blue">${ic('camara',12)} Foto</a>` : ''}</div>
        ${i.estado !== 'Cerrada' ? `<button class="action-btn" onclick="marcarInspeccionCerrada(${i.fila})">Cerrar inspección</button>` : ''}
      </div>
    </div>`;
  }).join(''));
}
async function marcarInspeccionCerrada(fila) {
  try {
    await ensureToken();
    const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_INSPECCIONES}'!K${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [['Cerrada']] }) });
    toast('Inspección cerrada ✓', 'ok');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}
function abrirFormInspeccion() {
  const f = document.getElementById('form-inspeccion');
  f.reset();
  f.fecha.value = hoyISO();
  document.getElementById('sel-tema-inspeccion').innerHTML = TEMAS_CHARLA.map(t=>`<option>${t}</option>`).join('');
  const selObra = document.getElementById('sel-obra-inspeccion');
  selObra.innerHTML = opcionesObraSelectHTML('');
  onCambioObraSelect(selObra, 'input-inspeccion-obra-otra');
  openPanel('panel-form-inspeccion');
}
async function guardarInspeccion(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    let fotoLink = '';
    const fotoFile = f.foto.files[0];
    if (fotoFile) {
      const up = await uploadFile(fotoFile, 'Inspecciones', 'inspeccion_' + f.area.value.replace(/\s+/g,'_'));
      fotoLink = up.link;
    }
    const n = allInspecciones.length + 1;
    const obra = valorObra(f.obra, 'input-inspeccion-obra-otra');
    await appendSheet(`'${CONFIG.SHEET_INSPECCIONES}'!A:M`, [[
      n, f.fecha.value, f.tipo.value, f.area.value, f.inspector.value, f.tema.value,
      f.hallazgos.value, f.riesgo.value, fotoLink, f.accion.value || '', 'Abierta',
      new Date().toLocaleString('es-CL'), obra
    ]]);

    // Generar alerta de charla automáticamente
    const nCharla = allCharlas.length + 1;
    await appendSheet(`'${CONFIG.SHEET_CHARLAS}'!A:G`, [[
      nCharla, hoyISO(), f.tema.value, 'Inspección #' + n, 'Pendiente', '', ''
    ]]);

    toast('Inspección guardada ✓', 'ok');
    closePanel('panel-form-inspeccion');
    await cargarTodo(true);
    mostrarAlertaCharla(f.tema.value, f.area.value);
  } catch (e) { toast(e.message, 'error'); }
}
function mostrarAlertaCharla(tema, area) {
  document.getElementById('alerta-charla-tema').textContent = tema;
  document.getElementById('alerta-charla-area').textContent = area;
  openPanel('modal-alerta-charla');
}

// ============================================================
// MÓDULO: CHARLAS (alertas generadas por inspecciones)
// ============================================================
function renderCharlas() {
  const items = [...allCharlas].reverse();
  if (items.length === 0) { setListHTML('charlas', emptyState('Sin charlas pendientes', '')); return; }
  setListHTML('charlas', items.map(c => `
    <div class="card card--default">
      <div class="card-icon modulo-icon--flota">${ic('charlas',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(c.tema)}</div>
        <div class="card-sub">${esc(c.origen)} · Generada ${esc(c.fecha)}</div>
        <div class="badge-row"><span class="badge ${c.estado==='Pendiente'?'amber':'green'}">${esc(c.estado)}</span></div>
        ${c.estado==='Pendiente' ? `<button class="action-btn" onclick="marcarCharlaRealizada(${c.fila})">Marcar realizada</button>` : ''}
      </div>
    </div>`).join(''));
}
async function marcarCharlaRealizada(fila) {
  try {
    await ensureToken();
    const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_CHARLAS}'!E${fila}:F${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [['Realizada', hoyISO()]] }) });
    toast('Charla marcada como realizada ✓', 'ok');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// MÓDULO: INCIDENTES Y ACCIDENTES (con foto)
// ============================================================
function renderIncidentes() {
  const items = [...allIncidentes].reverse();
  if (items.length === 0) { setListHTML('incidentes', emptyState('Sin incidentes registrados', '')); return; }
  setListHTML('incidentes', items.map(i => `
    <div class="card card--default" onclick="abrirDetalleIncidente(${i.fila})">
      <div class="card-icon modulo-icon--and">${ic('incidentes',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(i.tipo)}${i.trabajador ? ' — ' + esc(i.trabajador) : ''}</div>
        <div class="card-sub">${esc(i.fecha)} · ${esc(i.area)}${i.obra ? ' · ' + esc(i.obra) : ''}</div>
        <div class="badge-row"><span class="badge red">${esc(i.gravedad)}</span>
        <span class="badge ${i.estado==='Cerrado'?'green':'gray'}">${esc(i.estado)}</span></div>
      </div>
      <div class="card-arrow">›</div>
    </div>`).join(''));
}
function abrirDetalleIncidente(fila) {
  const i = allIncidentes.find(x => x.fila === fila);
  if (!i) { toast('No se encontró el registro', 'error'); return; }
  document.getElementById('detalle-incidente-body').innerHTML = `
    <div class="ficha-hero">
      <div class="ficha-hero-icon">${ic('incidentes',32)}</div>
      <div class="ficha-hero-info">
        <div class="ficha-hero-type">${esc(i.tipo)}</div>
        <div class="ficha-hero-name">${esc(i.area)}</div>
      </div>
    </div>
    <div class="field-row"><span>Fecha</span><b>${esc(i.fecha)}</b></div>
    ${i.trabajador ? `<div class="field-row"><span>Trabajador</span><b>${esc(i.trabajador)}</b></div>` : ''}
    <div class="field-row"><span>Obra</span><b>${esc(i.obra || '—')}</b></div>
    <div class="field-row"><span>Gravedad</span><span class="badge red">${esc(i.gravedad)}</span></div>
    <div class="field-row"><span>Días perdidos</span><b>${i.diasPerdidos || 0}</b></div>
    <div class="field-row"><span>Estado</span><span class="badge ${i.estado==='Cerrado'?'green':'gray'}">${esc(i.estado)}</span></div>

    <div class="sec-label" style="margin-top:20px;">Descripción</div>
    <div class="card-sub" style="white-space:normal;">${esc(i.descripcion) || '—'}</div>

    ${i.causas ? `<div class="sec-label" style="margin-top:20px;">Causas</div><div class="card-sub" style="white-space:normal;">${esc(i.causas)}</div>` : ''}
    ${i.accion ? `<div class="sec-label" style="margin-top:20px;">Acciones correctivas</div><div class="card-sub" style="white-space:normal;">${esc(i.accion)}</div>` : ''}

    <div class="sec-label" style="margin-top:20px;">Registro</div>
    <div class="field-row"><span>Fecha de registro</span><b>${esc(i.fechaRegistro || '—')}</b></div>
    <div class="field-row"><span>Reportado por</span><b>${esc(i.reportadoPor || '—')}</b></div>
    ${i.foto ? `<div class="field-row"><span>Foto</span><a href="${esc(i.foto)}" target="_blank" class="badge blue">${ic('camara',12)} Ver foto</a></div>` : ''}
    ${i.respaldo ? `<div class="field-row"><span>Respaldo de cierre</span><a href="${esc(i.respaldo)}" target="_blank" class="badge blue">${ic('documento',12)} Ver respaldo</a></div>` : ''}

    ${i.estado !== 'Cerrado' ? `<button class="action-btn" onclick="closePanel('panel-detalle-incidente'); abrirCerrarIncidente(${i.fila})">Cerrar caso</button>` : ''}
  `;
  openPanel('panel-detalle-incidente');
}
function abrirFormIncidente() {
  const f = document.getElementById('form-incidente');
  f.reset();
  f.fecha.value = hoyISO();
  document.getElementById('sel-trabajador-incidente').innerHTML =
    '<option value="">— Selecciona (opcional) —</option>' + selectTrabajadoresOptions();
  const selObra = document.getElementById('sel-obra-incidente');
  selObra.innerHTML = opcionesObraSelectHTML('');
  onCambioObraSelect(selObra, 'input-incidente-obra-otra');
  openPanel('panel-form-incidente');
}
async function guardarIncidente(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    const trabNombre = f.trabajador.value ? f.trabajador.value.split('|')[0] : '';
    let fotoLink = '';
    const fotoFile = f.foto.files[0];
    if (fotoFile) {
      const up = trabNombre
        ? await uploadFileTrabajador(fotoFile, trabNombre, 'incidente_' + f.area.value.replace(/\s+/g,'_'))
        : await uploadFile(fotoFile, 'Incidentes-Accidentes', 'incidente_' + f.area.value.replace(/\s+/g,'_'));
      fotoLink = up.link;
    }
    const n = allIncidentes.length + 1;
    const obra = valorObra(f.obra, 'input-incidente-obra-otra');
    const diasPerdidos = parseInt(f.diasPerdidos.value, 10) || 0;
    await appendSheet(`'${CONFIG.SHEET_INCIDENTES}'!A:P`, [[
      n, f.fecha.value, f.tipo.value, trabNombre, f.area.value, f.descripcion.value,
      f.causas.value, f.gravedad.value, fotoLink, f.accion.value || '', 'Abierto',
      new Date().toLocaleString('es-CL'), userEmail || '', '', obra, diasPerdidos
    ]]);

    // Sugerencia automática de plan de acción según lo descrito en el incidente
    const plan = sugerirPlanAccion(f.descripcion.value, f.causas.value, f.area.value);

    toast('Registro guardado ✓', 'ok');
    closePanel('panel-form-incidente');
    await cargarTodo(true);

    if (plan) {
      if (plan.tipo === 'charla') {
        const nCharla = allCharlas.length + 1;
        await appendSheet(`'${CONFIG.SHEET_CHARLAS}'!A:G`, [[
          nCharla, hoyISO(), plan.valor, 'Incidente #' + n, 'Pendiente', '', ''
        ]]);
        cargarTodo(true);
      }
      mostrarAlertaPlan(plan, f.area.value, trabNombre);
    }
  } catch (e) { toast(e.message, 'error'); }
}
function mostrarAlertaPlan(plan, area, trabajador) {
  const textos = {
    charla: {
      titulo: 'Charla de seguridad sugerida',
      cuerpo: `Se recomienda realizar una <b>charla de seguridad</b> sobre:<br><span class="alerta-charla-tema">${esc(plan.valor)}</span>`,
      nota: 'Esta charla quedó registrada como <b>Pendiente</b> en el módulo "Charlas de Seguridad".',
      boton: 'Ver charlas pendientes',
    },
    epp: {
      titulo: 'Reposición de EPP sugerida',
      cuerpo: `Se recomienda <b>reponer/entregar</b>:<br><span class="alerta-charla-tema">${esc(plan.valor)}${trabajador ? ' — ' + esc(trabajador) : ''}</span>`,
      nota: 'Puedes registrar la entrega ahora mismo en el módulo de Entrega de EPP.',
      boton: 'Entregar EPP ahora',
    },
    procedimiento: {
      titulo: 'Procedimiento relacionado',
      cuerpo: `Este incidente está relacionado con el procedimiento:<br><span class="alerta-charla-tema">${esc(plan.valor.nombre)}</span>`,
      nota: 'Revisa si sigue vigente o si hay que actualizarlo.',
      boton: 'Ver procedimientos',
    },
    mantencion: {
      titulo: 'Mantención sugerida',
      cuerpo: `Se recomienda:<br><span class="alerta-charla-tema">${esc(plan.valor)}</span>`,
      nota: 'Este tipo de seguimiento aún no se registra dentro de la app — coordina la mantención directamente.',
      boton: 'Entendido',
    },
  };
  const acciones = {
    charla: () => irPagina('charlas'),
    epp: () => { irPagina('epp'); abrirFormEpp(plan.valor, trabajador); },
    procedimiento: () => { irPagina('procedimientos'); if (plan.valor.archivo) window.open(plan.valor.archivo, '_blank'); },
    mantencion: () => {},
  };
  const t = textos[plan.tipo];
  document.getElementById('alerta-plan-titulo').textContent = t.titulo;
  document.getElementById('alerta-plan-cuerpo').innerHTML = t.cuerpo;
  document.getElementById('alerta-plan-nota').innerHTML = t.nota;
  document.getElementById('alerta-plan-area').textContent = area || '—';
  const btn = document.getElementById('alerta-plan-btn');
  btn.textContent = t.boton;
  btn.onclick = () => { closePanel('modal-alerta-plan'); acciones[plan.tipo](); };
  openPanel('modal-alerta-plan');
}
function abrirCerrarIncidente(fila) {
  const f = document.getElementById('form-cerrar-incidente');
  f.reset();
  f.fila.value = fila;
  openPanel('panel-cerrar-incidente');
}
async function guardarCierreIncidente(ev) {
  ev.preventDefault();
  const f = ev.target;
  const fila = f.fila.value;
  try {
    const inc = allIncidentes.find(x => String(x.fila) === String(fila));
    let respaldoLink = '';
    const respaldoFile = f.respaldo.files[0];
    if (respaldoFile) {
      const up = (inc && inc.trabajador)
        ? await uploadFileTrabajador(respaldoFile, inc.trabajador, 'respaldo_cierre')
        : await uploadFile(respaldoFile, 'Incidentes-Accidentes', 'respaldo_cierre');
      respaldoLink = up.link;
    }
    await ensureToken();
    const urlEstado = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_INCIDENTES}'!K${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(urlEstado, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [['Cerrado']] }) });
    if (respaldoLink) {
      const urlRespaldo = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_INCIDENTES}'!N${fila}`)}?valueInputOption=USER_ENTERED`;
      await fetch(urlRespaldo, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
        body: JSON.stringify({ values: [[respaldoLink]] }) });
    }
    toast('Caso cerrado ✓', 'ok');
    closePanel('panel-cerrar-incidente');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// MÓDULO: PROCEDIMIENTOS DE TRABAJO SEGURO
// ============================================================
function renderProcedimientos() {
  const items = [...allProcedimientos].reverse();
  if (items.length === 0) { setListHTML('procedimientos', emptyState('Sin procedimientos', 'Sube el primer PTS')); return; }
  setListHTML('procedimientos', items.map(p => `
    <div class="card card--default">
      <div class="card-icon modulo-icon--cont">${ic('procedimientos',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(p.nombre)}</div>
        <div class="card-sub">${esc(p.codigo)} · v${esc(p.version)} · ${esc(p.area)}</div>
        <div class="badge-row"><span class="badge ${p.estado==='Vigente'?'green':'gray'}">${esc(p.estado)}</span>
        ${p.archivo ? `<a href="${esc(p.archivo)}" target="_blank" class="badge blue">${ic('documento',12)} Ver documento</a>` : ''}</div>
      </div>
    </div>`).join(''));
}
function abrirFormProcedimiento() {
  const f = document.getElementById('form-procedimiento');
  f.reset();
  f.fechaEmision.value = hoyISO();
  openPanel('panel-form-procedimiento');
}
async function guardarProcedimiento(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    let archivoLink = '';
    const archivo = f.archivo.files[0];
    if (archivo) {
      const up = await uploadFile(archivo, 'Procedimientos', 'PTS_' + f.codigo.value);
      archivoLink = up.link;
    }
    const n = allProcedimientos.length + 1;
    await appendSheet(`'${CONFIG.SHEET_PROCEDIMIENTOS}'!A:I`, [[
      n, f.codigo.value, f.nombre.value, f.area.value, f.version.value,
      f.fechaEmision.value, archivoLink, 'Vigente', new Date().toLocaleString('es-CL')
    ]]);
    toast('Procedimiento guardado ✓', 'ok');
    closePanel('panel-form-procedimiento');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// MÓDULO: ENTREGA DE EPP (con firma)
// ============================================================
function opcionesEppDisponibles() {
  // Catálogo base + cualquier tipo "Otro" que alguien haya escrito antes
  // (se detecta automáticamente porque ya quedó guardado en entregas previas)
  const historicos = [...new Set(allEpp.map(e => e.epp).filter(Boolean))];
  const todos = [...new Set([...EPP_ITEMS.filter(x => x !== 'Otro'), ...historicos])];
  todos.sort((a, b) => a.localeCompare(b, 'es'));
  return todos;
}

function renderEpp() {
  if (allEpp.length === 0) { setListHTML('epp', emptyState('Sin entregas registradas', '')); return; }
  // Agrupa las filas que pertenecen a la misma entrega (misma fecha + trabajador + firma)
  const grupos = {};
  const orden = [];
  allEpp.forEach(e => {
    const key = e.fecha + '|' + e.trabajador + '|' + e.firma;
    if (!grupos[key]) { grupos[key] = { fecha: e.fecha, trabajador: e.trabajador, firma: e.firma, items: [] }; orden.push(key); }
    grupos[key].items.push(`${e.epp} (${e.cantidad})`);
  });
  const items = orden.map(k => grupos[k]).reverse();
  setListHTML('epp', items.map(g => `
    <div class="card card--default">
      <div class="card-icon modulo-icon--mov">${ic('epp',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(g.trabajador)}</div>
        <div class="card-sub">${esc(g.fecha)}</div>
        <div class="card-sub">${esc(g.items.join(' · '))}</div>
        <div class="badge-row">${g.firma ? `<a href="${esc(g.firma)}" target="_blank" class="badge blue">${ic('firma',12)} Ver firma</a>` : '<span class="badge gray">Sin firma</span>'}</div>
      </div>
    </div>`).join(''));
}

let firmaCtx = null, firmaActiva = false;

function renderChecklistEpp() {
  document.getElementById('checklist-epp').innerHTML = opcionesEppDisponibles().map(item => `
    <div class="epp-item-row" data-item="${esc(item)}">
      <label class="epp-item-label">
        <span class="epp-item-checkbox-wrap">
          <input type="checkbox" class="epp-item-chk" onchange="onToggleEppItem(this)">
          <span class="epp-item-checkbox"></span>
        </span>
        <span>${esc(item)}</span>
      </label>
      <input type="number" class="epp-item-qty hidden" min="1" value="1">
    </div>`).join('');
}
function onToggleEppItem(chk) {
  chk.closest('.epp-item-row').querySelector('.epp-item-qty').classList.toggle('hidden', !chk.checked);
}
function onCambioEppOtro() {
  const nombre = document.getElementById('input-epp-otro').value.trim();
  document.getElementById('grupo-epp-otro-qty').classList.toggle('hidden', !nombre);
}
function recolectarItemsEpp() {
  const items = [];
  document.querySelectorAll('#checklist-epp .epp-item-row').forEach(row => {
    const chk = row.querySelector('.epp-item-chk');
    if (chk.checked) {
      const cantidad = parseInt(row.querySelector('.epp-item-qty').value, 10) || 1;
      items.push({ item: row.dataset.item, cantidad });
    }
  });
  const otroNombre = document.getElementById('input-epp-otro').value.trim();
  if (otroNombre) {
    const cantidad = parseInt(document.getElementById('input-epp-otro-cantidad').value, 10) || 1;
    items.push({ item: otroNombre, cantidad });
  }
  return items;
}

// prefillItem/prefillTrabajador: usados por la sugerencia de "reponer EPP" al cerrar un incidente
function abrirFormEpp(prefillItem, prefillTrabajador) {
  const f = document.getElementById('form-epp');
  f.reset();
  f.fecha.value = hoyISO();
  document.getElementById('sel-trabajador-epp').innerHTML =
    '<option value="">— Selecciona un trabajador —</option>' + selectTrabajadoresOptions();
  const trab = prefillTrabajador && allTrabajadores.find(x => x.nombre === prefillTrabajador);
  if (trab) f.trabajador.value = `${trab.nombre}|${trab.rut}`;

  renderChecklistEpp();
  document.getElementById('input-epp-otro').value = '';
  document.getElementById('grupo-epp-otro-qty').classList.add('hidden');
  if (prefillItem) {
    const row = document.querySelector(`#checklist-epp .epp-item-row[data-item="${CSS.escape(prefillItem)}"]`);
    if (row) {
      const chk = row.querySelector('.epp-item-chk');
      chk.checked = true;
      onToggleEppItem(chk);
    } else {
      document.getElementById('input-epp-otro').value = prefillItem;
      document.getElementById('grupo-epp-otro-qty').classList.remove('hidden');
    }
  }
  openPanel('panel-form-epp');
  setTimeout(initFirmaPad, 80);
}
function initFirmaPad() {
  const canvas = document.getElementById('firma-canvas');
  canvas.width = canvas.clientWidth; canvas.height = 180;
  firmaCtx = canvas.getContext('2d');
  firmaCtx.strokeStyle = '#1a1a1a'; firmaCtx.lineWidth = 2.2; firmaCtx.lineCap = 'round';
  firmaActiva = false;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const start = (e) => { e.preventDefault(); firmaActiva = true; const p = pos(e); firmaCtx.beginPath(); firmaCtx.moveTo(p.x, p.y); };
  const move = (e) => { if (!firmaActiva) return; e.preventDefault(); const p = pos(e); firmaCtx.lineTo(p.x, p.y); firmaCtx.stroke(); };
  const end = () => { firmaActiva = false; };
  canvas.onmousedown = start; canvas.onmousemove = move; canvas.onmouseup = end; canvas.onmouseleave = end;
  canvas.ontouchstart = start; canvas.ontouchmove = move; canvas.ontouchend = end;
}
function limpiarFirma() {
  const canvas = document.getElementById('firma-canvas');
  firmaCtx.clearRect(0, 0, canvas.width, canvas.height);
}
async function guardarEpp(ev) {
  ev.preventDefault();
  const f = ev.target;
  const canvas = document.getElementById('firma-canvas');
  try {
    if (!f.trabajador.value) { toast('Selecciona un trabajador', 'error'); return; }
    const itemsEpp = recolectarItemsEpp();
    if (itemsEpp.length === 0) { toast('Marca al menos un ítem a entregar', 'error'); return; }

    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const trabNombre = f.trabajador.value.split('|')[0];
    const trabRut = f.trabajador.value.split('|')[1] || '';
    let firmaLink = '';
    if (blob) {
      const up = await uploadFileTrabajador(blob, trabNombre, 'firma', 'png');
      firmaLink = up.link;
    }
    const fechaRegistro = new Date().toLocaleString('es-CL');
    const filas = itemsEpp.map((it, i) => [
      allEpp.length + 1 + i, f.fecha.value, trabNombre, trabRut, it.item, it.cantidad,
      firmaLink, userEmail || f.responsable.value, fechaRegistro
    ]);
    await appendSheet(`'${CONFIG.SHEET_EPP}'!A:I`, filas);
    toast(`Entrega registrada ✓ (${filas.length} ítem${filas.length>1?'s':''})`, 'ok');
    closePanel('panel-form-epp');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Utilidades ───────────────────────────────────────────────
function emptyState(title, sub) {
  return `<div class="empty"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" style="width:30px;height:30px"><rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M9 4V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4" stroke="currentColor" stroke-width="1.6"/><path d="M9 12h6M9 15.5h6M9 8.5h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></div><div class="empty-title">${esc(title)}</div><div class="empty-sub">${esc(sub)}</div></div>`;
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// ============================================================
// ARRANQUE
// ============================================================
async function arrancarApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('splash').classList.remove('hidden');
  document.getElementById('splash-progress').classList.add('splash-waiting');
  document.getElementById('chip-email').textContent = userEmail || '';
  document.getElementById('dt-chip-email').textContent = userEmail || '';
  renderModulosHome();

  await cargarTodo();

  // Revela la app con una pequeña animación de aparición, en vez de
  // que todo salte de golpe apenas termina de cargar
  const main = document.getElementById('main');
  const sidebar = document.getElementById('desktop-sidebar');
  const dtMain = document.getElementById('desktop-main');
  main.classList.remove('hidden');
  sidebar.classList.remove('dt-oculto');
  dtMain.classList.remove('dt-oculto');
  [main, sidebar, dtMain].forEach(el => el.classList.add('app-enter'));
  setTimeout(() => [main, sidebar, dtMain].forEach(el => el.classList.remove('app-enter')), 500);

  const splashEl = document.getElementById('splash');
  splashEl.style.opacity = '0';
  setTimeout(() => { splashEl.classList.add('hidden'); splashEl.style.opacity = ''; }, 380);
}
window.addEventListener('DOMContentLoaded', () => {
  initOAuth();

  // Caso 1: token todavía válido → directo a la app, sin mostrar login
  if (loadStoredToken()) { arrancarApp(); return; }

  // Caso 2: ya había iniciado sesión antes (token vencido) → reconectar
  // en silencio con la misma cuenta, sin mostrar el selector de cuentas
  const hadLogin = localStorage.getItem(HADLOGIN_KEY);
  if (hadLogin) {
    mostrarLogin('Conectando...', true);
    let intentos = 0;
    function intentarSilencioso() {
      intentos++;
      if (!tokenClient) {
        if (intentos < 10) { setTimeout(intentarSilencioso, 300); }
        else { mostrarLogin('Usa tu cuenta corporativa autorizada', false); }
        return;
      }
      let resuelto = false;
      const prevCb = tokenClient.callback;
      const watchdog = setTimeout(() => {
        if (resuelto) return;
        resuelto = true;
        tokenClient.callback = prevCb;
        if (intentos < 3) { setTimeout(intentarSilencioso, 1200); }
        else { mostrarLogin('Usa tu cuenta corporativa autorizada', false); }
      }, 6000);
      tokenClient.callback = async (resp) => {
        if (resuelto) return;
        resuelto = true;
        clearTimeout(watchdog);
        tokenClient.callback = prevCb;
        if (resp.error) {
          if (intentos < 3 && resp.error !== 'access_denied') { setTimeout(intentarSilencioso, 1200); }
          else { mostrarLogin('Usa tu cuenta corporativa autorizada', false); }
          return;
        }
        saveToken(resp.access_token, resp.expires_in || 3600);
        userEmail = localStorage.getItem(EMAIL_KEY) || '';
        arrancarApp();
      };
      const savedEmail = localStorage.getItem(EMAIL_KEY) || '';
      tokenClient.requestAccessToken({ prompt: '', login_hint: savedEmail });
    }
    setTimeout(intentarSilencioso, 300);
    return;
  }

  // Caso 3: primera vez → mostrar login normal con botón
  mostrarLogin('Usa tu cuenta corporativa autorizada', false);
});

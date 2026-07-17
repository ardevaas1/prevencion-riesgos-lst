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
  hcr: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 2 20h20L12 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.5 16h5M12 9v4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
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
    { key: 'hcr', nombre: 'Hoja de Control de Riesgos (HCR)', desc: 'Registro diario por cuadrilla, antes de ejecutar el trabajo', color: 'and' },
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
function horaActual() { return new Date().toTimeString().slice(0,5); }

// ============================================================
// DATOS EN MEMORIA
// ============================================================
let allTrabajadores = [];
let allInspecciones = [];
let allIncidentes = [];
let allProcedimientos = [];
let allEpp = [];
let allCharlas = [];
let allInvestigaciones = [];
let allHcr = [];
let allDiat = [];

async function cargarTodo(silencioso) {
  if (!silencioso) { splash(20, 'Conectando con Google Sheets...'); }
  else { toast('Actualizando datos...'); }
  try {
    if (!silencioso) splash(45, 'Cargando información...');
    const [trab, insp, inc, proc, epp, charlas, invest, hcr, diat] = await Promise.all([
      fetchSheet(`'${CONFIG.SHEET_TRABAJADORES}'!A2:O2000`),
      fetchSheet(`'${CONFIG.SHEET_INSPECCIONES}'!A2:M2000`),
      fetchSheet(`'${CONFIG.SHEET_INCIDENTES}'!A2:V2000`),
      fetchSheet(`'${CONFIG.SHEET_PROCEDIMIENTOS}'!A2:I2000`),
      fetchSheet(`'${CONFIG.SHEET_EPP}'!A2:I2000`),
      fetchSheet(`'${CONFIG.SHEET_CHARLAS}'!A2:N2000`),
      fetchSheet(`'${CONFIG.SHEET_INVESTIGACIONES}'!A2:AT2000`),
      fetchSheet(`'${CONFIG.SHEET_HCR}'!A2:V2000`),
      fetchSheet(`'${CONFIG.SHEET_DIAT}'!A2:BA2000`),
    ]);
    if (!silencioso) splash(85, 'Preparando la app...');
    allTrabajadores = trab.map((r,i) => rowToTrabajador(r,i));
    allInspecciones = insp.map((r,i) => rowToInspeccion(r,i));
    allIncidentes = inc.map((r,i) => rowToIncidente(r,i));
    allProcedimientos = proc.map((r,i) => rowToProcedimiento(r,i));
    allEpp = epp.map((r,i) => rowToEpp(r,i));
    allCharlas = charlas.map((r,i) => rowToCharla(r,i));
    allInvestigaciones = invest.map((r,i) => ({ fila: i+2, n: r[0]||'' }));
    allHcr = hcr.map((r,i) => ({ fila: i+2, n: r[0]||'', fecha: r[1]||'', obra: r[2]||'', actividad: r[3]||'', area: r[4]||'', pdf: r[19]||'' }));
    allDiat = diat.map((r,i) => ({ fila: i+2, n: r[0]||'' }));
    renderDashboard();
    renderTrabajadores(); renderInspecciones(); renderIncidentes(); renderProcedimientos(); renderEpp(); renderCharlas(); renderHcr();
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
    obra: r[14]||'', diasPerdidos: parseInt(r[15],10) || 0,
    investigacionEstado: r[16]||'', investigacionResponsable: r[17]||'', investigacionFecha: r[18]||'', investigacionPdf: r[19]||'',
    atencionMedicaEstado: r[20]||'', atencionMedicaPdf: r[21]||'' };
}
// Se abre investigación formal (y se pregunta por atención médica) solo
// para accidentes reales (no Cuasiaccidente/Incidente)
function requiereInvestigacion(tipoIncidente) {
  return tipoIncidente === 'Accidente Leve' || tipoIncidente === 'Accidente Grave' || tipoIncidente === 'Accidente Fatal';
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
    fechaRealizada: r[5]||'', responsable: r[6]||'', relator: r[7]||'', obra: r[8]||'', hora: r[9]||'',
    riesgos: r[10]||'', medidas: r[11]||'', asistentes: r[12]||'', pdf: r[13]||'' };
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
  if (items.length === 0) { setListHTML('charlas', emptyState('Sin charlas registradas', 'Toca "+" para registrar una charla')); return; }
  setListHTML('charlas', items.map(c => `
    <div class="card card--default">
      <div class="card-icon modulo-icon--flota">${ic('charlas',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(c.tema)}</div>
        <div class="card-sub">${esc(c.origen)} · Generada ${esc(c.fecha)}</div>
        <div class="badge-row"><span class="badge ${c.estado==='Pendiente'?'amber':'green'}">${esc(c.estado)}</span>
        ${c.pdf ? `<a href="${esc(c.pdf)}" target="_blank" class="badge blue">${ic('documento',12)} Ver documento</a>` : ''}</div>
        ${c.estado==='Pendiente' ? `<button class="action-btn" onclick="abrirRealizarCharla(${c.fila})">Marcar realizada</button>` : ''}
      </div>
    </div>`).join(''));
}

// ── Realizar charla: paso 1 (datos) → paso 2 (firma de asistentes) → PDF ──
let charlaEnProceso = null;

function renderChecklistAsistentesCharla() {
  const activos = allTrabajadores.filter(t => t.estado === 'Activo');
  document.getElementById('checklist-asistentes-charla').innerHTML = activos.map(t => `
    <div class="chk-row" data-nombre="${esc(t.nombre)}" data-rut="${esc(t.rut)}">
      <label class="chk-row-label">
        <span class="chk-row-checkbox-wrap">
          <input type="checkbox" class="chk-row-input">
          <span class="chk-row-checkbox"></span>
        </span>
        <span>${esc(t.nombre)} <span style="color:#888;">· ${esc(t.rut)}</span></span>
      </label>
    </div>`).join('');
}
function abrirRealizarCharla(fila) {
  const c = allCharlas.find(x => x.fila === fila);
  if (!c) return;
  charlaEnProceso = { fila };
  const f = document.getElementById('form-realizar-charla');
  f.reset();
  f.fecha.value = hoyISO();
  f.hora.value = horaActual();
  f.tema.value = c.tema;
  const selObraCharla1 = document.getElementById('sel-obra-charla');
  selObraCharla1.innerHTML = opcionesObraSelectHTML('');
  onCambioObraSelect(selObraCharla1, 'input-charla-obra-otra');
  document.getElementById('panel-realizar-charla-titulo').textContent = 'Realizar charla';
  renderChecklistAsistentesCharla();
  openPanel('panel-realizar-charla');
  setTimeout(() => initFirmaPad('firma-canvas-relator'), 80);
}
// Charla hecha "porque sí" (recorrido rutinario, decisión del prevencionista,
// etc.), sin que una Inspección o Incidente la haya generado como alerta.
function abrirNuevaCharla() {
  charlaEnProceso = { fila: null };
  const f = document.getElementById('form-realizar-charla');
  f.reset();
  f.fecha.value = hoyISO();
  f.hora.value = horaActual();
  const selObraCharla2 = document.getElementById('sel-obra-charla');
  selObraCharla2.innerHTML = opcionesObraSelectHTML('');
  onCambioObraSelect(selObraCharla2, 'input-charla-obra-otra');
  document.getElementById('panel-realizar-charla-titulo').textContent = 'Nueva charla';
  renderChecklistAsistentesCharla();
  openPanel('panel-realizar-charla');
  setTimeout(() => initFirmaPad('firma-canvas-relator'), 80);
}
function guardarDatosCharla(ev) {
  ev.preventDefault();
  const f = ev.target;
  if (firmaEstaVacia('firma-canvas-relator')) { toast('Falta la firma del relator', 'error'); return; }
  const asistentes = [...document.querySelectorAll('#checklist-asistentes-charla .chk-row')]
    .filter(row => row.querySelector('.chk-row-input').checked)
    .map(row => ({ nombre: row.dataset.nombre, rut: row.dataset.rut, firma: null }));

  const canvasRelator = document.getElementById('firma-canvas-relator');
  charlaEnProceso = {
    ...charlaEnProceso,
    relator: f.relator.value,
    firmaRelator: canvasRelator.toDataURL('image/png'),
    obra: valorObra(f.obra, 'input-charla-obra-otra'),
    fecha: f.fecha.value, hora: f.hora.value,
    tema: f.tema.value, riesgos: f.riesgos.value, medidas: f.medidas.value,
    asistentes, asistenteActual: 0,
  };
  closePanel('panel-realizar-charla');
  if (asistentes.length === 0) { finalizarCharla(); return; }
  setTimeout(() => { openPanel('panel-firmar-asistente'); mostrarFirmaAsistenteActual(); }, 260);
}
function mostrarFirmaAsistenteActual() {
  const { asistentes, asistenteActual } = charlaEnProceso;
  const a = asistentes[asistenteActual];
  document.getElementById('firmar-asistente-progreso').textContent = `Firma ${asistenteActual + 1} de ${asistentes.length}`;
  document.getElementById('firmar-asistente-nombre').textContent = a.nombre;
  document.getElementById('firmar-asistente-rut').textContent = a.rut;
  setTimeout(() => initFirmaPad('firma-canvas-asistente'), 80);
}
function avanzarAsistente() {
  charlaEnProceso.asistenteActual++;
  if (charlaEnProceso.asistenteActual >= charlaEnProceso.asistentes.length) {
    closePanel('panel-firmar-asistente');
    setTimeout(finalizarCharla, 260);
  } else {
    mostrarFirmaAsistenteActual();
  }
}
function confirmarFirmaAsistente() {
  if (firmaEstaVacia('firma-canvas-asistente')) { toast('Falta la firma', 'error'); return; }
  const canvas = document.getElementById('firma-canvas-asistente');
  charlaEnProceso.asistentes[charlaEnProceso.asistenteActual].firma = canvas.toDataURL('image/png');
  avanzarAsistente();
}
function saltarFirmaAsistente() { avanzarAsistente(); }
function cancelarFirmaAsistentes() {
  closePanel('panel-firmar-asistente');
  charlaEnProceso = null;
  toast('Registro de charla cancelado', 'error');
}
async function finalizarCharla() {
  try {
    toast('Generando documento...');
    const pdfLink = await generarYSubirPdfCharla(charlaEnProceso);
    const asistentesTxto = charlaEnProceso.asistentes.map(a => `${a.nombre} (${a.rut})`).join('; ');
    await ensureToken();
    if (charlaEnProceso.fila) {
      // Charla que ya existía como alerta "Pendiente" (generada por Inspección/Incidente): actualiza esa fila
      const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_CHARLAS}'!E${charlaEnProceso.fila}:N${charlaEnProceso.fila}`)}?valueInputOption=USER_ENTERED`;
      await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
        body: JSON.stringify({ values: [[
          'Realizada', hoyISO(), userEmail || '', charlaEnProceso.relator, charlaEnProceso.obra, charlaEnProceso.hora,
          charlaEnProceso.riesgos, charlaEnProceso.medidas, asistentesTxto, pdfLink,
        ]] }) });
    } else {
      // Charla hecha por iniciativa propia, sin alerta previa: se agrega una fila completa nueva
      const n = allCharlas.length + 1;
      await appendSheet(`'${CONFIG.SHEET_CHARLAS}'!A:N`, [[
        n, hoyISO(), charlaEnProceso.tema, 'Manual', 'Realizada', hoyISO(), userEmail || '',
        charlaEnProceso.relator, charlaEnProceso.obra, charlaEnProceso.hora,
        charlaEnProceso.riesgos, charlaEnProceso.medidas, asistentesTxto, pdfLink,
      ]]);
    }
    toast('Charla registrada y documento generado ✓', 'ok');
    charlaEnProceso = null;
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Generación del PDF de Charla (plantilla plana, sin campos rellenables:
// se dibuja el texto/las firmas encima en las coordenadas exactas de cada
// campo, medidas a mano sobre la plantilla original) ──────────────────
function ddmmyyyy(iso) { return (iso || hoyISO()).split('-').reverse().join('-'); }
async function generarYSubirPdfCharla(datos) {
  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const templateBytes = await fetch('plantillas/charla_5min.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const [p1, p2] = pdfDoc.getPages();
  const H = 792;

  function cover(page, x0, top0, x1, top1) {
    page.drawRectangle({ x: x0, y: H - top1, width: x1 - x0, height: top1 - top0, color: rgb(1,1,1) });
  }
  function text(page, str, x, top, size) {
    page.drawText(str || '', { x, y: H - top, size: size || 9, font, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  function textBlock(page, str, x, tops, maxWidth, size) {
    wrapLines(str, maxWidth, size || 9).slice(0, tops.length).forEach((line, i) => text(page, line, x, tops[i], size));
  }
  async function drawSig(page, dataUrl, x, top, w, h) {
    if (!dataUrl) return;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);
    const dims = img.scaleToFit(w, h);
    page.drawImage(img, { x, y: H - top - dims.height, width: dims.width, height: dims.height });
  }

  // Tapar pie de página de la plantilla original y la fecha de generación vieja
  [p1, p2].forEach(p => {
    cover(p, 200, 770, 400, 790);
    cover(p, 503, 15, 560, 29);
    text(p, ddmmyyyy(hoyISO()), 504, 26);
  });

  // Encabezado
  text(p1, datos.relator, 155, 109, 10);
  text(p1, datos.obra, 155, 138.5, 10);
  text(p1, ddmmyyyy(datos.fecha), 155, 154, 10);
  text(p1, datos.hora, 422, 154, 10);
  await drawSig(p1, datos.firmaRelator, 422, 97, 130, 26);

  // Tema / Riesgos / Medidas (se reparte en las líneas disponibles de la plantilla)
  textBlock(p1, datos.tema, 52, [196, 210.6, 225.2], 505);
  textBlock(p1, datos.riesgos, 52, [266.9, 281.5, 296.1, 310.9], 505);
  textBlock(p1, datos.medidas, 52, [353.5, 368.1, 382.9, 396.2, 409.6], 505);

  // Tabla de asistentes: filas 1-12 en la página 1, 13-35 en la página 2
  const filasP1 = [453.2,478.4,503.4,528.4,553.4,578.6,603.6,628.6,653.6,678.9,703.9,728.9];
  const filasP2 = [117.3,142.3,167.3,192.3,217.5,242.6,267.6,292.5,317.8,342.8,367.8,392.8,418.0,443.0,468.0,493.0,518.0,543.2,568.2,593.2,618.2,643.4,668.4];
  for (let i = 0; i < datos.asistentes.length && i < filasP1.length; i++) {
    const a = datos.asistentes[i], top = filasP1[i];
    text(p1, a.nombre, 85, top + 8);
    text(p1, a.rut, 365, top + 8);
    await drawSig(p1, a.firma, 488, top - 1, 65, 23);
  }
  for (let i = filasP1.length; i < datos.asistentes.length && i < filasP1.length + filasP2.length; i++) {
    const a = datos.asistentes[i], top = filasP2[i - filasP1.length];
    text(p2, a.nombre, 85, top + 8);
    text(p2, a.rut, 365, top + 8);
    await drawSig(p2, a.firma, 488, top - 1, 65, 23);
  }

  // Nombre y firma del relator (línea final, página 2)
  text(p2, datos.relator, 215, 731, 10);

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const up = await uploadFile(blob, 'Charlas', 'charla_' + (datos.obra || 'obra').replace(/\s+/g,'_'), 'pdf');
  return up.link;
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
        <span class="badge ${i.estado==='Cerrado'?'green':'gray'}">${esc(i.estado)}</span>
        ${i.atencionMedicaEstado==='Pendiente' ? '<span class="badge amber">Atención médica: por definir</span>' : ''}
        ${i.atencionMedicaEstado && i.atencionMedicaEstado!=='Pendiente' ? `<span class="badge green">${esc(i.atencionMedicaEstado)}</span>` : ''}
        ${i.investigacionEstado==='Pendiente' ? '<span class="badge amber">Investigación pendiente</span>' : ''}
        ${i.investigacionEstado==='Completada' ? '<span class="badge green">Investigación completada</span>' : ''}</div>
        ${i.atencionMedicaEstado==='Pendiente' ? `<button class="action-btn" onclick="event.stopPropagation(); abrirPreguntaAtencionMedica(${i.fila})">Definir atención médica</button>` : ''}
        ${i.investigacionEstado==='Pendiente' ? `<button class="action-btn" onclick="event.stopPropagation(); abrirInvestigacion(${i.fila})">Realizar investigación</button>` : ''}
        ${i.investigacionEstado==='Completada' && i.investigacionPdf ? `<a href="${esc(i.investigacionPdf)}" target="_blank" class="badge blue" onclick="event.stopPropagation();">${ic('documento',12)} Ver informe</a>` : ''}
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

    ${i.atencionMedicaEstado ? `
    <div class="sec-label" style="margin-top:20px;">Atención médica</div>
    <div class="field-row"><span>Estado</span><span class="badge ${i.atencionMedicaEstado==='Pendiente'?'amber':'green'}">${esc(i.atencionMedicaEstado)}</span></div>
    ${i.atencionMedicaPdf ? `<div class="field-row"><span>Documento</span><a href="${esc(i.atencionMedicaPdf)}" target="_blank" class="badge blue">${ic('documento',12)} Ver documento</a></div>` : ''}
    ` : ''}

    ${i.investigacionEstado ? `
    <div class="sec-label" style="margin-top:20px;">Investigación de accidente</div>
    <div class="field-row"><span>Estado</span><span class="badge ${i.investigacionEstado==='Completada'?'green':'amber'}">${esc(i.investigacionEstado)}</span></div>
    ${i.investigacionResponsable ? `<div class="field-row"><span>Responsable</span><b>${esc(i.investigacionResponsable)}</b></div>` : ''}
    ${i.investigacionFecha ? `<div class="field-row"><span>Fecha</span><b>${esc(i.investigacionFecha)}</b></div>` : ''}
    ${i.investigacionPdf ? `<div class="field-row"><span>Informe</span><a href="${esc(i.investigacionPdf)}" target="_blank" class="badge blue">${ic('documento',12)} Ver informe</a></div>` : ''}
    ` : ''}

    ${i.atencionMedicaEstado === 'Pendiente' ? `<button class="action-btn" onclick="closePanel('panel-detalle-incidente'); abrirPreguntaAtencionMedica(${i.fila})">Definir atención médica</button>` : ''}
    ${i.investigacionEstado === 'Pendiente' ? `<button class="action-btn" onclick="closePanel('panel-detalle-incidente'); abrirInvestigacion(${i.fila})">Realizar investigación</button>` : ''}
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
    // La investigación queda supeditada a resolver primero la pregunta de
    // atención médica (DIAT si es Sí, Declaración simple si es No) — no se
    // marca "Pendiente" de inmediato, se habilita recién al resolver eso.
    const atencionMedicaEstado = requiereInvestigacion(f.tipo.value) ? 'Pendiente' : '';
    await appendSheet(`'${CONFIG.SHEET_INCIDENTES}'!A:V`, [[
      n, f.fecha.value, f.tipo.value, trabNombre, f.area.value, f.descripcion.value,
      f.causas.value, f.gravedad.value, fotoLink, f.accion.value || '', 'Abierto',
      new Date().toLocaleString('es-CL'), userEmail || '', '', obra, diasPerdidos,
      '', '', '', '', atencionMedicaEstado, ''
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
// MÓDULO: ATENCIÓN MÉDICA (DIAT / Declaración de rechazo)
// Al registrar un Accidente Leve/Grave/Fatal, antes de habilitar la
// Investigación se pregunta si el trabajador necesitó atención médica:
// si Sí, se llena la DIAT (Denuncia Individual de Accidente del Trabajo,
// formulario oficial de la Mutual); si No, se genera una declaración simple
// en que el trabajador manifiesta su rechazo — sin firma digital, porque
// esa se hace a mano, en persona, después.
// ============================================================
let atencionMedicaFilaIncidente = null;
function abrirPreguntaAtencionMedica(filaIncidente) {
  atencionMedicaFilaIncidente = filaIncidente;
  openPanel('panel-pregunta-atencion-medica');
}
function elegirAtencionMedica(necesitaAtencion) {
  closePanel('panel-pregunta-atencion-medica');
  setTimeout(() => {
    if (necesitaAtencion) abrirFormDiat();
    else abrirFormDeclaracion();
  }, 260);
}

// ── DIAT (Denuncia Individual de Accidente del Trabajo) ──────────────────
const DIAT_CX = {}; // los checkbox de este documento no comparten franjas, cada uno mide su propio centro
const DIAT_PROPIEDAD_EMPRESA = [
  { label: 'Pública', x: 513.2, top: 225.9 }, { label: 'Privada', x: 553.7, top: 225.9 },
];
const DIAT_TIPO_EMPRESA = [
  { label: 'Principal', x: 53.0, top: 261.1 }, { label: 'Contratista', x: 112.0, top: 261.1 },
  { label: 'Subcontratista', x: 179.7, top: 261.1 }, { label: 'De Servicios Transitorios', x: 258.3, top: 261.1 },
];
const DIAT_SEXO = [{ label: 'Hombre', x: 53.2, top: 403.9 }, { label: 'Mujer', x: 107.4, top: 403.9 }];
const DIAT_PUEBLO_ORIGINARIO = [
  { label: 'Alacalufe', x: 310.5, top: 410.5 }, { label: 'Colla', x: 374.3, top: 410.3 },
  { label: 'Quechua', x: 439.3, top: 410.6 }, { label: 'Otro', x: 521.2, top: 409.2 },
  { label: 'Atacameño', x: 310.5, top: 424.2 }, { label: 'Diaguita', x: 374.2, top: 424.1 },
  { label: 'Rapanui', x: 439.2, top: 424.3 }, { label: 'Aimara', x: 310.5, top: 438.7 },
  { label: 'Mapuche', x: 374.2, top: 438.6 }, { label: 'Yamana (Yagán)', x: 439.2, top: 438.8 },
  { label: 'Ninguno', x: 521.2, top: 438.9 },
];
const DIAT_ANTIGUEDAD_UNIDAD = [
  { label: 'Días', x: 75.3, top: 469.8 }, { label: 'Meses', x: 108.4, top: 469.5 }, { label: 'Años', x: 146.9, top: 469.5 },
];
const DIAT_TIPO_CONTRATO = [
  { label: 'Indefinido', x: 195.4, top: 470.0 }, { label: 'Plazo Fijo', x: 258.1, top: 470.0 },
  { label: 'Por Obra o Faena', x: 322.5, top: 469.5 }, { label: 'Temporada', x: 414.1, top: 470.1 },
];
const DIAT_TIPO_INGRESO = [
  { label: 'Remuneración Fija', x: 491.5, top: 478.7 }, { label: 'Remuneración Variable', x: 491.4, top: 491.7 },
  { label: 'Honorarios', x: 491.3, top: 504.7 },
];
const DIAT_CATEGORIA_OCUPACIONAL = [
  { label: 'Empleador', x: 52.9, top: 503.2 }, { label: 'Trabajador Dependiente', x: 105.0, top: 503.2 },
  { label: 'Trabajador Independiente', x: 197.9, top: 503.2 }, { label: 'Familiar no Remunerado', x: 296.3, top: 503.2 },
  { label: 'Trabajador Voluntario', x: 391.8, top: 503.2 },
];
const DIAT_AMPM_ACCIDENTE = [{ label: 'A.M.', x: 311.0, top: 551.2 }, { label: 'P.M.', x: 340.5, top: 551.2 }];
const DIAT_AMPM_INGRESO = [{ label: 'A.M.', x: 421.7, top: 551.3 }, { label: 'P.M.', x: 451.2, top: 551.3 }];
const DIAT_AMPM_SALIDA = [{ label: 'A.M.', x: 531.9, top: 551.5 }, { label: 'P.M.', x: 561.4, top: 551.5 }];
const DIAT_DESARROLLABA_HABITUAL = [{ label: 'Sí', x: 540.9, top: 719.8 }, { label: 'No', x: 564.4, top: 719.8 }];
const DIAT_CLASIFICACION_ACCIDENTE = [
  { label: 'Grave', x: 52.1, top: 757.8 }, { label: 'Fatal', x: 87.6, top: 757.8 }, { label: 'Otro', x: 120.0, top: 757.8 },
];
const DIAT_TIPO_ACCIDENTE = [{ label: 'Trabajo', x: 163.2, top: 755.0 }, { label: 'Trayecto', x: 222.9, top: 755.0 }];
const DIAT_TIPO_ACCIDENTE_TRAYECTO = [
  { label: 'Domicilio - Trabajo', x: 479.3, top: 754.1 }, { label: 'Trabajo - Domicilio', x: 479.2, top: 767.0 },
  { label: 'Entre dos Trabajos', x: 479.2, top: 779.6 },
];
const DIAT_MEDIO_PRUEBA = [
  { label: 'Parte de Carabineros', x: 51.4, top: 780.5 }, { label: 'Declaración', x: 137.4, top: 780.5 },
  { label: 'Testigos', x: 195.7, top: 780.5 }, { label: 'Otro', x: 245.5, top: 780.5 },
];
const DIAT_CLASIFICACION_DENUNCIANTE = [
  { label: 'Empleador', x: 177.5, top: 881.8 }, { label: 'Trabajador/a', x: 248.4, top: 881.7 },
  { label: 'Familiar', x: 319.8, top: 881.5 }, { label: 'Médico Tratante', x: 374.9, top: 881.6 },
  { label: 'Comité Paritario', x: 177.5, top: 896.0 }, { label: 'Empresa Usuaria', x: 272.3, top: 896.0 },
  { label: 'Otro', x: 374.9, top: 895.9 },
];

function renderChecklistsDiat() {
  renderChecklistInv('chk-diat-propiedad', DIAT_PROPIEDAD_EMPRESA, 'radio', 'diatPropiedad');
  renderChecklistInv('chk-diat-tipoempresa', DIAT_TIPO_EMPRESA, 'radio', 'diatTipoEmpresa');
  renderChecklistInv('chk-diat-sexo', DIAT_SEXO, 'radio', 'diatSexo');
  renderChecklistInv('chk-diat-pueblo', DIAT_PUEBLO_ORIGINARIO, 'radio', 'diatPueblo');
  renderChecklistInv('chk-diat-antiguedadunidad', DIAT_ANTIGUEDAD_UNIDAD, 'radio', 'diatAntiguedadUnidad');
  renderChecklistInv('chk-diat-tipocontrato', DIAT_TIPO_CONTRATO, 'radio', 'diatTipoContrato');
  renderChecklistInv('chk-diat-tipoingreso', DIAT_TIPO_INGRESO, 'radio', 'diatTipoIngreso');
  renderChecklistInv('chk-diat-categoria', DIAT_CATEGORIA_OCUPACIONAL, 'radio', 'diatCategoria');
  renderChecklistInv('chk-diat-ampm-accidente', DIAT_AMPM_ACCIDENTE, 'radio', 'diatAmpmAccidente');
  renderChecklistInv('chk-diat-ampm-ingreso', DIAT_AMPM_INGRESO, 'radio', 'diatAmpmIngreso');
  renderChecklistInv('chk-diat-ampm-salida', DIAT_AMPM_SALIDA, 'radio', 'diatAmpmSalida');
  renderChecklistInv('chk-diat-desarrollaba', DIAT_DESARROLLABA_HABITUAL, 'radio', 'diatDesarrollaba');
  renderChecklistInv('chk-diat-clasificacion', DIAT_CLASIFICACION_ACCIDENTE, 'radio', 'diatClasificacion');
  renderChecklistInv('chk-diat-tipoaccidente', DIAT_TIPO_ACCIDENTE, 'radio', 'diatTipoAccidente');
  renderChecklistInv('chk-diat-trayecto', DIAT_TIPO_ACCIDENTE_TRAYECTO, 'radio', 'diatTrayecto');
  renderChecklistInv('chk-diat-medioprueba', DIAT_MEDIO_PRUEBA, 'radio', 'diatMedioPrueba');
  renderChecklistInv('chk-diat-denunciante', DIAT_CLASIFICACION_DENUNCIANTE, 'radio', 'diatDenunciante');
}
function seleccionadoRadioInv(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? parseInt(el.value, 10) : -1;
}

function abrirFormDiat() {
  const inc = allIncidentes.find(x => x.fila === atencionMedicaFilaIncidente);
  if (!inc) { toast('No se encontró el registro', 'error'); return; }
  const trab = inc.trabajador && allTrabajadores.find(x => x.nombre === inc.trabajador);
  const f = document.getElementById('form-diat');
  f.reset();
  f.empleadorNombre.value = 'Constructora LST SpA';
  f.trabajadorNombre.value = inc.trabajador || '';
  f.trabajadorRun.value = trab ? trab.rut : '';
  f.profesionOficio.value = trab ? trab.cargo : '';
  f.nacionalidad.value = 'Chilena';
  f.fechaAccidente.value = inc.fecha || hoyISO();
  f.lugarAccidente.value = inc.area || '';
  f.direccionAccidente.value = inc.obra || '';
  f.descripcionAccidente.value = inc.descripcion || '';
  renderChecklistsDiat();
  openPanel('panel-form-diat');
  // Clasificación del accidente prellenada según el tipo ya registrado
  // (renderChecklistsDiat ya insertó los radios de forma síncrona arriba)
  const idxClasificacion = inc.tipo === 'Accidente Grave' ? 0 : inc.tipo === 'Accidente Fatal' ? 1 : 2;
  const elClasificacion = document.querySelector(`input[name="diatClasificacion"][value="${idxClasificacion}"]`);
  if (elClasificacion) elClasificacion.checked = true;
}
async function guardarDiat(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    toast('Generando documento...');
    const datos = {
      empleadorNombre: f.empleadorNombre.value, empleadorRut: f.empleadorRut.value,
      empleadorDireccion: f.empleadorDireccion.value, empleadorComuna: f.empleadorComuna.value,
      empleadorTelefono: f.empleadorTelefono.value,
      nTrabHombres: f.nTrabHombres.value, nTrabMujeres: f.nTrabMujeres.value,
      propiedadEmpresa: seleccionadoRadioInv('diatPropiedad'), tipoEmpresa: seleccionadoRadioInv('diatTipoEmpresa'),
      actividadEconomica: f.actividadEconomica.value, actividadEconomicaPrincipal: f.actividadEconomicaPrincipal.value,
      trabajadorNombre: f.trabajadorNombre.value, trabajadorRun: f.trabajadorRun.value,
      trabajadorDireccion: f.trabajadorDireccion.value, trabajadorComuna: f.trabajadorComuna.value,
      trabajadorTelefono: f.trabajadorTelefono.value,
      sexo: seleccionadoRadioInv('diatSexo'), edad: f.edad.value, fechaNacimiento: f.fechaNacimiento.value,
      pueblo: seleccionadoRadioInv('diatPueblo'), nacionalidad: f.nacionalidad.value, profesionOficio: f.profesionOficio.value,
      antiguedadValor: f.antiguedadValor.value, antiguedadUnidad: seleccionadoRadioInv('diatAntiguedadUnidad'),
      tipoContrato: seleccionadoRadioInv('diatTipoContrato'), tipoIngreso: seleccionadoRadioInv('diatTipoIngreso'),
      categoria: seleccionadoRadioInv('diatCategoria'),
      fechaAccidente: f.fechaAccidente.value,
      horaAccidente: f.horaAccidente.value, ampmAccidente: seleccionadoRadioInv('diatAmpmAccidente'),
      horaIngreso: f.horaIngreso.value, ampmIngreso: seleccionadoRadioInv('diatAmpmIngreso'),
      horaSalida: f.horaSalida.value, ampmSalida: seleccionadoRadioInv('diatAmpmSalida'),
      direccionAccidente: f.direccionAccidente.value, comunaAccidente: f.comunaAccidente.value,
      queHacia: f.queHacia.value, lugarAccidente: f.lugarAccidente.value, descripcionAccidente: f.descripcionAccidente.value,
      trabajoHabitual: f.trabajoHabitual.value, desarrollaba: seleccionadoRadioInv('diatDesarrollaba'),
      clasificacion: seleccionadoRadioInv('diatClasificacion'), tipoAccidente: seleccionadoRadioInv('diatTipoAccidente'),
      trayecto: seleccionadoRadioInv('diatTrayecto'), medioPrueba: seleccionadoRadioInv('diatMedioPrueba'),
      detalleMedioPrueba: f.detalleMedioPrueba.value,
      denuncianteNombre: f.denuncianteNombre.value, denuncianteRun: f.denuncianteRun.value,
      denuncianteTelefono: f.denuncianteTelefono.value, denunciante: seleccionadoRadioInv('diatDenunciante'),
    };
    const pdfLink = await generarYSubirPdfDiat(datos);

    const n = allDiat.length + 1;
    await appendSheet(`'${CONFIG.SHEET_DIAT}'!A:BA`, [[
      n, hoyISO(), atencionMedicaFilaIncidente,
      datos.empleadorNombre, datos.empleadorRut, datos.empleadorDireccion, datos.empleadorComuna, datos.empleadorTelefono,
      datos.nTrabHombres, datos.nTrabMujeres,
      datos.propiedadEmpresa>=0 ? DIAT_PROPIEDAD_EMPRESA[datos.propiedadEmpresa].label : '',
      datos.tipoEmpresa>=0 ? DIAT_TIPO_EMPRESA[datos.tipoEmpresa].label : '',
      datos.actividadEconomica, datos.actividadEconomicaPrincipal,
      datos.trabajadorNombre, datos.trabajadorRun, datos.trabajadorDireccion, datos.trabajadorComuna, datos.trabajadorTelefono,
      datos.sexo>=0 ? DIAT_SEXO[datos.sexo].label : '', datos.edad, datos.fechaNacimiento,
      datos.pueblo>=0 ? DIAT_PUEBLO_ORIGINARIO[datos.pueblo].label : '', datos.nacionalidad, datos.profesionOficio,
      datos.antiguedadValor, datos.antiguedadUnidad>=0 ? DIAT_ANTIGUEDAD_UNIDAD[datos.antiguedadUnidad].label : '',
      datos.tipoContrato>=0 ? DIAT_TIPO_CONTRATO[datos.tipoContrato].label : '',
      datos.tipoIngreso>=0 ? DIAT_TIPO_INGRESO[datos.tipoIngreso].label : '',
      datos.categoria>=0 ? DIAT_CATEGORIA_OCUPACIONAL[datos.categoria].label : '',
      datos.fechaAccidente,
      `${datos.horaAccidente||''} ${datos.ampmAccidente>=0?DIAT_AMPM_ACCIDENTE[datos.ampmAccidente].label:''}`,
      `${datos.horaIngreso||''} ${datos.ampmIngreso>=0?DIAT_AMPM_INGRESO[datos.ampmIngreso].label:''}`,
      `${datos.horaSalida||''} ${datos.ampmSalida>=0?DIAT_AMPM_SALIDA[datos.ampmSalida].label:''}`,
      datos.direccionAccidente, datos.comunaAccidente, datos.queHacia, datos.lugarAccidente, datos.descripcionAccidente,
      datos.trabajoHabitual, datos.desarrollaba>=0 ? DIAT_DESARROLLABA_HABITUAL[datos.desarrollaba].label : '',
      datos.clasificacion>=0 ? DIAT_CLASIFICACION_ACCIDENTE[datos.clasificacion].label : '',
      datos.tipoAccidente>=0 ? DIAT_TIPO_ACCIDENTE[datos.tipoAccidente].label : '',
      datos.trayecto>=0 ? DIAT_TIPO_ACCIDENTE_TRAYECTO[datos.trayecto].label : '',
      datos.medioPrueba>=0 ? DIAT_MEDIO_PRUEBA[datos.medioPrueba].label : '', datos.detalleMedioPrueba,
      datos.denuncianteNombre, datos.denuncianteRun, datos.denuncianteTelefono,
      datos.denunciante>=0 ? DIAT_CLASIFICACION_DENUNCIANTE[datos.denunciante].label : '',
      pdfLink, userEmail || '', new Date().toLocaleString('es-CL'),
    ]]);

    await guardarResultadoAtencionMedica('Con atención médica (DIAT)', pdfLink);
    toast('DIAT registrada y documento generado ✓', 'ok');
    closePanel('panel-form-diat');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// Actualiza la fila del Incidente: marca la atención médica como resuelta y
// habilita recién ahí la Investigación (columnas Q:V de INCIDENTES).
async function guardarResultadoAtencionMedica(estado, pdfLink) {
  await ensureToken();
  const fila = atencionMedicaFilaIncidente;
  const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_INCIDENTES}'!Q${fila}:V${fila}`)}?valueInputOption=USER_ENTERED`;
  await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
    body: JSON.stringify({ values: [['Pendiente', '', '', '', estado, pdfLink]] }) });
  atencionMedicaFilaIncidente = null;
}

async function generarYSubirPdfDiat(datos) {
  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const templateBytes = await fetch('plantillas/diat.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const [p1] = pdfDoc.getPages();
  const H = 935.434;

  function text(str, x, top, size, bold) {
    p1.drawText(str || '', { x, y: H - top, size: size || 7, font: bold ? fontBold : font, color: rgb(0,0,0) });
  }
  function checkX(x, cellCenterTop, size) {
    const s = size || 7.5;
    const capHeight = s * 0.72;
    const baselineTop = cellCenterTop + capHeight / 2;
    p1.drawText('X', { x: x - s * 0.33, y: H - baselineTop, size: s, font: fontBold, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = []; let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  function textBlock(str, x, tops, maxWidth, size) {
    wrapLines(str, maxWidth, size || 7).slice(0, tops.length).forEach((l, i) => text(l, x, tops[i], size));
  }
  function marcar(grupo, idx, extraTexto) {
    if (idx == null || idx < 0) return;
    checkX(grupo[idx].x, grupo[idx].top);
  }

  // A. Identificación del Empleador
  text(datos.empleadorNombre, 90, 165, 7.5);
  text(datos.empleadorRut, 515, 165, 7.5);
  text(datos.empleadorDireccion, 90, 200, 7);
  text(datos.empleadorComuna, 417, 200, 7);
  text(datos.empleadorTelefono, 510, 200, 7);
  text(String(datos.nTrabHombres||''), 411, 220, 7);
  text(String(datos.nTrabMujeres||''), 469, 220, 7);
  marcar(DIAT_PROPIEDAD_EMPRESA, datos.propiedadEmpresa);
  text(datos.actividadEconomica, 45, 235, 7);
  marcar(DIAT_TIPO_EMPRESA, datos.tipoEmpresa);
  textBlock(datos.actividadEconomicaPrincipal, 386, [268, 277], 200, 7);

  // B. Identificación del Trabajador/a
  text(datos.trabajadorNombre, 90, 345, 7.5);
  text(datos.trabajadorRun, 515, 345, 7.5);
  text(datos.trabajadorDireccion, 90, 380, 7);
  text(datos.trabajadorComuna, 422, 380, 7);
  text(datos.trabajadorTelefono, 511, 380, 7);
  marcar(DIAT_SEXO, datos.sexo);
  text(datos.edad, 163, 413, 7.5);
  text(datos.fechaNacimiento ? ddmmyyyy(datos.fechaNacimiento) : '', 210, 413, 7);
  marcar(DIAT_PUEBLO_ORIGINARIO, datos.pueblo);
  text(datos.nacionalidad, 70, 446, 7);
  text(datos.profesionOficio, 190, 446, 7);
  text(datos.antiguedadValor, 44, 474, 7);
  marcar(DIAT_ANTIGUEDAD_UNIDAD, datos.antiguedadUnidad);
  marcar(DIAT_TIPO_CONTRATO, datos.tipoContrato);
  marcar(DIAT_TIPO_INGRESO, datos.tipoIngreso);
  marcar(DIAT_CATEGORIA_OCUPACIONAL, datos.categoria);

  // C. Datos del Accidente
  text(datos.fechaAccidente ? ddmmyyyy(datos.fechaAccidente) : '', 178, 545, 7.5);
  text(datos.horaAccidente, 282, 545, 7);
  marcar(DIAT_AMPM_ACCIDENTE, datos.ampmAccidente);
  text(datos.horaIngreso, 393, 545, 7);
  marcar(DIAT_AMPM_INGRESO, datos.ampmIngreso);
  text(datos.horaSalida, 502, 545, 7);
  marcar(DIAT_AMPM_SALIDA, datos.ampmSalida);
  text(datos.direccionAccidente, 45, 594, 7);
  text(datos.comunaAccidente, 508, 594, 7);
  textBlock(datos.queHacia, 45, [630, 638.5], 240, 6.5);
  textBlock(datos.lugarAccidente, 322, [630, 638.5], 250, 6.5);
  textBlock(datos.descripcionAccidente, 45, [670, 678.6, 687.2, 695.8, 704.4], 530, 7);
  text(datos.trabajoHabitual, 174, 719, 7);
  marcar(DIAT_DESARROLLABA_HABITUAL, datos.desarrollaba);
  marcar(DIAT_CLASIFICACION_ACCIDENTE, datos.clasificacion);
  marcar(DIAT_TIPO_ACCIDENTE, datos.tipoAccidente);
  marcar(DIAT_TIPO_ACCIDENTE_TRAYECTO, datos.trayecto);
  marcar(DIAT_MEDIO_PRUEBA, datos.medioPrueba);
  text(datos.detalleMedioPrueba, 318, 791, 6.5);

  // D. Identificación del Denunciante
  text(datos.denuncianteNombre, 107, 848, 7.5);
  text(datos.denuncianteRun, 389, 848, 7.5);
  text(datos.denuncianteTelefono, 61, 881, 7);
  marcar(DIAT_CLASIFICACION_DENUNCIANTE, datos.denunciante);

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const nombreArchivo = 'diat_' + (datos.trabajadorNombre || 'accidente').replace(/\s+/g, '_');
  const up = datos.trabajadorNombre
    ? await uploadFileTrabajador(blob, datos.trabajadorNombre, nombreArchivo, 'pdf')
    : await uploadFile(blob, 'DIAT', nombreArchivo, 'pdf');
  return up.link;
}

// ── Declaración simple de rechazo de atención médica ──────────────────────
// A pedido del cliente: sin plantilla, sin formato — solo lo que el
// trabajador escriba, tal cual, generado como PDF en blanco (no se dibuja
// sobre ningún documento base). Sin firma: se firma a mano, en persona,
// después — no tiene sentido capturar una firma digital acá.
function abrirFormDeclaracion() {
  const inc = allIncidentes.find(x => x.fila === atencionMedicaFilaIncidente);
  if (!inc) { toast('No se encontró el registro', 'error'); return; }
  const f = document.getElementById('form-declaracion');
  f.reset();
  f.trabajadorNombre.value = inc.trabajador || '';
  f.fecha.value = hoyISO();
  openPanel('panel-form-declaracion');
}
async function guardarDeclaracion(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    toast('Generando documento...');
    const datos = { trabajadorNombre: f.trabajadorNombre.value, fecha: f.fecha.value, texto: f.texto.value };
    const pdfLink = await generarPdfDeclaracion(datos);
    await guardarResultadoAtencionMedica('Sin atención médica (Declaración)', pdfLink);
    toast('Declaración registrada y documento generado ✓', 'ok');
    closePanel('panel-form-declaracion');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}
async function generarPdfDeclaracion(datos) {
  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([612, 792]);
  const H = 792;
  let y = H - 72;

  page.drawText('DECLARACIÓN VOLUNTARIA DE RECHAZO DE ATENCIÓN MÉDICA', { x: 56, y, size: 13, font: fontBold, color: rgb(0,0,0) });
  y -= 26;
  page.drawText(`Trabajador: ${datos.trabajadorNombre || ''}`, { x: 56, y, size: 10, font, color: rgb(0,0,0) });
  y -= 16;
  page.drawText(`Fecha: ${ddmmyyyy(datos.fecha)}`, { x: 56, y, size: 10, font, color: rgb(0,0,0) });
  y -= 34;

  const maxWidth = 500, size = 11, lineHeight = 16;
  const words = (datos.texto || '').split(/\s+/).filter(Boolean);
  let current = '';
  const lines = [];
  for (const w of words) {
    const test = current ? current + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
    else current = test;
  }
  if (current) lines.push(current);
  for (const line of lines) {
    if (y < 80) break;
    page.drawText(line, { x: 56, y, size, font, color: rgb(0,0,0) });
    y -= lineHeight;
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const nombreArchivo = 'declaracion_rechazo_' + (datos.trabajadorNombre || 'trabajador').replace(/\s+/g, '_');
  const up = datos.trabajadorNombre
    ? await uploadFileTrabajador(blob, datos.trabajadorNombre, nombreArchivo, 'pdf')
    : await uploadFile(blob, 'Declaraciones', nombreArchivo, 'pdf');
  return up.link;
}

// ============================================================
// MÓDULO: INVESTIGACIÓN DE ACCIDENTE
// (se activa solo para Accidente Leve/Grave/Fatal; genera el
// "Informe de Investigación de Accidente y Enfermedad Profesional"
// como PDF, con la misma técnica de overlay de coordenadas que Charlas)
// ============================================================

// Centros X de checkbox reutilizados en todo el documento (medidos con pdfplumber)
const INV_CX = { c1: 116.3, c2: 276.9, c3: 369.5, c4: 465.7, cGraveFatal: 434.8 };

const INV_TIPO_SINIESTRO = [
  { label: 'Accidente de trabajo', x: INV_CX.c2, top: 231.3, page: 'p1' },
  { label: 'Accidente de trayecto', x: INV_CX.c3, top: 231.3, page: 'p1' },
  { label: 'Accidente común', x: INV_CX.c4, top: 231.3, page: 'p1' },
  { label: 'Enfermedad profesional', x: INV_CX.c1, top: 231.3, page: 'p1' },
];
const INV_EMPRESA = [
  { label: 'Empresa Mandante', x: INV_CX.c1, top: 253.1, page: 'p1' },
  { label: 'Empresa Contratista', x: INV_CX.c2, top: 253.1, page: 'p1' },
  { label: 'Subcontrato', x: INV_CX.c3, top: 253.1, page: 'p1' },
];
const INV_DANOS = [
  { label: 'A las personas', x: INV_CX.c1, top: 278.1, page: 'p1' },
  { label: 'A los materiales', x: INV_CX.c2, top: 278.1, page: 'p1' },
  { label: 'Al medio ambiente', x: INV_CX.c3, top: 278.1, page: 'p1' },
  { label: 'Externos/Clientes', x: INV_CX.c4, top: 278.1, page: 'p1' },
  { label: 'Otros (especifique)', x: 133, top: 290.7, page: 'p1' },
];
const INV_POTENCIAL = [
  { label: 'Bajo', x: INV_CX.c1, top: 307.3, page: 'p1' },
  { label: 'Menos Grave', x: INV_CX.c2, top: 307.3, page: 'p1' },
  { label: 'Grave/Fatal', x: INV_CX.cGraveFatal, top: 307.3, page: 'p1' },
];
const INV_TIPO_INCIDENTE = [
  { label: 'Golpe con (objetos manejados por el mismo accidentado)', x: INV_CX.c2, top: 488.5, page: 'p1' },
  { label: 'Contacto con (la persona hace contacto con algún objeto o sustancia que le inflige lesión no producida por la fuerza)', x: INV_CX.c4, top: 488.5, page: 'p1' },
  { label: 'Golpe por (objetos o materiales ajenos al accidentado)', x: INV_CX.c2, top: 510.0, page: 'p1' },
  { label: 'Contacto eléctrico', x: INV_CX.c4, top: 510.0, page: 'p1' },
  { label: 'Golpe contra (la persona se golpea con objeto de su medio ambiente)', x: INV_CX.c2, top: 523.9, page: 'p1' },
  { label: 'Arco eléctrico', x: INV_CX.c4, top: 523.9, page: 'p1' },
  { label: 'Caída del mismo nivel', x: INV_CX.c2, top: 540.1, page: 'p1' },
  { label: 'Tránsito (choque o colisión en que la persona tuvo una activa participación)', x: INV_CX.c4, top: 540.1, page: 'p1' },
  { label: 'Caída de distinto nivel', x: INV_CX.c2, top: 561.2, page: 'p1' },
  { label: 'Tránsito por terceros, choque en que la persona no tuvo participación activa', x: INV_CX.c4, top: 561.2, page: 'p1' },
  { label: 'Atrapamiento (la persona es oprimida, aplastada, apretada o comprimida entre objetos)', x: INV_CX.c2, top: 581.95, page: 'p1' },
  { label: 'Mordedura de perros', x: INV_CX.c4, top: 581.95, page: 'p1' },
  { label: 'Aprisionamiento (la persona queda encerrada en algún recinto, ej. espacio confinado)', x: INV_CX.c2, top: 597.8, page: 'p1' },
  { label: 'Asalto', x: INV_CX.c4, top: 597.8, page: 'p1' },
  { label: 'Sobreesfuerzo (esfuerzo mal realizado o por sobre la capacidad)', x: INV_CX.c2, top: 616.55, page: 'p1' },
  { label: 'Otros', x: INV_CX.c4, top: 616.55, page: 'p1' },
];
const INV_CAUSAS_INMEDIATAS = [
  { label: 'Asumir posiciones o posturas inseguras', x: INV_CX.c2, top: 648.45, page: 'p1' },
  { label: 'Almacenamiento deficiente', x: INV_CX.c4, top: 648.45, page: 'p1' },
  { label: 'Dejar inoperantes los dispositivos de seguridad', x: INV_CX.c2, top: 657.05, page: 'p1' },
  { label: 'Congestión y espacio libre insuficiente', x: INV_CX.c4, top: 657.05, page: 'p1' },
  { label: 'Desviarse de procedimientos de trabajo recomendados', x: INV_CX.c2, top: 665.65, page: 'p1' },
  { label: 'Defectos de maquinarias, materiales o herramientas', x: INV_CX.c4, top: 665.65, page: 'p1' },
  { label: 'Distraerse en juegos u otros', x: INV_CX.c2, top: 674.3, page: 'p1' },
  { label: 'Equipos sin protección', x: INV_CX.c4, top: 674.3, page: 'p1' },
  { label: 'No advertir o señalar riesgos según se requiera', x: INV_CX.c2, top: 682.9, page: 'p1' },
  { label: 'Falta de adecuados sistemas de seguridad', x: INV_CX.c4, top: 682.9, page: 'p1' },
  { label: 'Operar a velocidad insegura', x: INV_CX.c2, top: 691.5, page: 'p1' },
  { label: 'Falta de orden y aseo', x: INV_CX.c4, top: 691.5, page: 'p1' },
  { label: 'Operar máquinas / equipos sin autorización', x: INV_CX.c2, top: 700.1, page: 'p1' },
  { label: 'Objetos que sobresalen', x: INV_CX.c4, top: 700.1, page: 'p1' },
  { label: 'Reparar, conducir equipos sin considerar los riesgos', x: INV_CX.c2, top: 708.7, page: 'p1' },
  { label: 'Propensión a arder o explotar', x: INV_CX.c4, top: 708.7, page: 'p1' },
  { label: 'Usar en forma insegura materiales, equipos, herramientas', x: INV_CX.c2, top: 717.3, page: 'p1' },
  { label: 'No se detectó condición subestándar', x: INV_CX.c4, top: 717.3, page: 'p1' },
  { label: 'Usar herramientas instrumental y/o equipos inseguros', x: INV_CX.c2, top: 725.9, page: 'p1' },
  { label: 'Otras condiciones subestándar (especifique)', x: INV_CX.c4, top: 725.9, page: 'p1' },
  { label: 'No se detectó acción subestándar', x: INV_CX.c2, top: 734.7, page: 'p1' },
];
const INV_CAUSAS_BASICAS = [
  { label: 'Capacidad física disminuida', x: INV_CX.c2, top: 124.3, page: 'p2' },
  { label: 'Supervisión y liderazgo deficiente', x: INV_CX.c4, top: 124.3, page: 'p2' },
  { label: 'Capacidad mental / sicológica inadecuada', x: INV_CX.c2, top: 132.9, page: 'p2' },
  { label: 'Ingeniería inadecuada', x: INV_CX.c4, top: 132.9, page: 'p2' },
  { label: 'Tensión mental o fisiológica', x: INV_CX.c2, top: 141.5, page: 'p2' },
  { label: 'Deficiencia en las adquisiciones', x: INV_CX.c4, top: 141.5, page: 'p2' },
  { label: 'Falta de conocimiento', x: INV_CX.c2, top: 150.1, page: 'p2' },
  { label: 'Mantención deficiente', x: INV_CX.c4, top: 150.1, page: 'p2' },
  { label: 'Falta de habilidad', x: INV_CX.c2, top: 158.7, page: 'p2' },
  { label: 'Herramientas y equipos inadecuados', x: INV_CX.c4, top: 158.7, page: 'p2' },
  { label: 'Motivación inadecuada', x: INV_CX.c2, top: 167.3, page: 'p2' },
  { label: 'Estándares deficientes de trabajo', x: INV_CX.c4, top: 167.3, page: 'p2' },
  { label: 'Uso y desgaste', x: INV_CX.c2, top: 175.9, page: 'p2' },
  { label: 'Condiciones ambientales adversas', x: INV_CX.c4, top: 175.9, page: 'p2' },
];

function renderChecklistInv(contId, opciones, tipo, name) {
  document.getElementById(contId).innerHTML = opciones.map((o, i) => `
    <div class="chk-row">
      <label class="chk-row-label">
        <span class="chk-row-checkbox-wrap">
          <input type="${tipo}" name="${name}" class="chk-row-input" value="${i}">
          <span class="chk-row-checkbox${tipo === 'radio' ? ' chk-row-radio' : ''}"></span>
        </span>
        <span>${esc(o.label)}</span>
      </label>
    </div>`).join('');
}
function renderChecklistsInvestigacion() {
  renderChecklistInv('chk-inv-tiposiniestro', INV_TIPO_SINIESTRO, 'radio', 'tiposiniestro');
  renderChecklistInv('chk-inv-empresa', INV_EMPRESA, 'radio', 'empresainv');
  renderChecklistInv('chk-inv-danos', INV_DANOS, 'checkbox', 'danos');
  renderChecklistInv('chk-inv-potencial', INV_POTENCIAL, 'radio', 'potencial');
  renderChecklistInv('chk-inv-tipoincidente', INV_TIPO_INCIDENTE, 'checkbox', 'tipoincidente');
  renderChecklistInv('chk-inv-causasinmediatas', INV_CAUSAS_INMEDIATAS, 'checkbox', 'causasinmediatas');
  renderChecklistInv('chk-inv-causasbasicas', INV_CAUSAS_BASICAS, 'checkbox', 'causasbasicas');
}
function seleccionadosInv(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => parseInt(el.value, 10));
}

let investigacionEnProceso = null;
function abrirInvestigacion(filaIncidente) {
  const inc = allIncidentes.find(x => x.fila === filaIncidente);
  if (!inc) { toast('No se encontró el registro', 'error'); return; }
  investigacionEnProceso = { filaIncidente };
  const f = document.getElementById('form-investigacion');
  f.reset();
  f.empresaMandante.value = 'Constructora LST SpA';
  f.area.value = inc.area || '';
  f.fechaSiniestro.value = inc.fecha || hoyISO();
  f.lugar.value = inc.area || '';
  f.trabajadorNombre.value = inc.trabajador || '';
  f.descripcionEvento.value = inc.descripcion || '';
  renderChecklistsInvestigacion();
  openPanel('panel-form-investigacion');
  setTimeout(() => initFirmaPad('firma-canvas-investigador'), 80);
}
async function guardarInvestigacion(ev) {
  ev.preventDefault();
  const f = ev.target;
  if (firmaEstaVacia('firma-canvas-investigador')) { toast('Falta la firma de quien investiga', 'error'); return; }
  try {
    toast('Generando informe...');
    const datos = {
      empresaMandante: f.empresaMandante.value, empresaContratista: f.empresaContratista.value,
      area: f.area.value, asesorPrevencion: f.asesorPrevencion.value, jefaturaDepto: f.jefaturaDepto.value,
      fechaSiniestro: f.fechaSiniestro.value, horaSiniestro: f.horaSiniestro.value,
      lugar: f.lugar.value, jefaturaDirecta: f.jefaturaDirecta.value, supervisorDirecto: f.supervisorDirecto.value,
      tipoSiniestro: seleccionadosInv('tiposiniestro'), empresa: seleccionadosInv('empresainv'),
      danos: seleccionadosInv('danos'), danosOtroTexto: f.danosOtroTexto.value,
      potencial: seleccionadosInv('potencial'),
      trabajadorNombre: f.trabajadorNombre.value, trabajadorRut: f.trabajadorRut.value,
      trabajadorCargo: f.trabajadorCargo.value, trabajadorAntiguedadCargo: f.trabajadorAntiguedadCargo.value,
      trabajadorAntiguedadEmpresa: f.trabajadorAntiguedadEmpresa.value, trabajadorHorasTurno: f.trabajadorHorasTurno.value,
      trabajadorEstado: f.trabajadorEstado.value, trabajadorObservacion: f.trabajadorObservacion.value,
      testigoNombre: f.testigoNombre.value, testigoRut: f.testigoRut.value,
      testigoCargo: f.testigoCargo.value, testigoTiempoCargo: f.testigoTiempoCargo.value,
      testigoActividad: f.testigoActividad.value, testigoObservacion: f.testigoObservacion.value,
      descripcionEvento: f.descripcionEvento.value, localizacion: f.localizacion.value,
      tipoIncidente: seleccionadosInv('tipoincidente'), tipoIncidenteOtroTexto: f.tipoIncidenteOtroTexto.value,
      causasInmediatas: seleccionadosInv('causasinmediatas'), causasInmediatasOtroTexto: f.causasInmediatasOtroTexto.value,
      causasBasicas: seleccionadosInv('causasbasicas'),
      medida1: f.medida1.value, responsable1: f.responsable1.value, fechaImpl1: f.fechaImpl1.value,
      medida2: f.medida2.value, responsable2: f.responsable2.value, fechaImpl2: f.fechaImpl2.value,
      medida3: f.medida3.value, responsable3: f.responsable3.value, fechaImpl3: f.fechaImpl3.value,
      observaciones: f.observaciones.value,
      investigadorNombreRut: f.investigadorNombreRut.value, investigadorCargo: f.investigadorCargo.value,
      firmaInvestigador: document.getElementById('firma-canvas-investigador').toDataURL('image/png'),
    };
    const pdfLink = await generarYSubirPdfInvestigacion(datos);

    const n = allInvestigaciones.length + 1;
    await appendSheet(`'${CONFIG.SHEET_INVESTIGACIONES}'!A:AT`, [[
      n, hoyISO(), investigacionEnProceso.filaIncidente,
      datos.empresaMandante, datos.empresaContratista, datos.area, datos.asesorPrevencion, datos.jefaturaDepto,
      datos.fechaSiniestro, datos.horaSiniestro, datos.lugar, datos.jefaturaDirecta, datos.supervisorDirecto,
      datos.tipoSiniestro.map(i => INV_TIPO_SINIESTRO[i].label).join('; '),
      datos.empresa.map(i => INV_EMPRESA[i].label).join('; '),
      datos.danos.map(i => INV_DANOS[i].label).join('; '), datos.danosOtroTexto,
      datos.potencial.map(i => INV_POTENCIAL[i].label).join('; '),
      datos.trabajadorNombre, datos.trabajadorRut, datos.trabajadorCargo, datos.trabajadorAntiguedadCargo,
      datos.trabajadorAntiguedadEmpresa, datos.trabajadorHorasTurno, datos.trabajadorEstado, datos.trabajadorObservacion,
      datos.testigoNombre, datos.testigoRut, datos.testigoCargo, datos.testigoTiempoCargo,
      datos.testigoActividad, datos.testigoObservacion,
      datos.descripcionEvento, datos.localizacion,
      datos.tipoIncidente.map(i => INV_TIPO_INCIDENTE[i].label).join('; '), datos.tipoIncidenteOtroTexto,
      datos.causasInmediatas.map(i => INV_CAUSAS_INMEDIATAS[i].label).join('; '), datos.causasInmediatasOtroTexto,
      datos.causasBasicas.map(i => INV_CAUSAS_BASICAS[i].label).join('; '),
      `${datos.medida1} | ${datos.responsable1} | ${datos.fechaImpl1}; ${datos.medida2} | ${datos.responsable2} | ${datos.fechaImpl2}; ${datos.medida3} | ${datos.responsable3} | ${datos.fechaImpl3}`,
      datos.observaciones, datos.investigadorNombreRut, datos.investigadorCargo,
      pdfLink, userEmail || '', new Date().toLocaleString('es-CL'),
    ]]);

    await ensureToken();
    const fila = investigacionEnProceso.filaIncidente;
    const urlEstado = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_INCIDENTES}'!Q${fila}:T${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(urlEstado, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [['Completada', userEmail || '', hoyISO(), pdfLink]] }) });

    toast('Investigación registrada y documento generado ✓', 'ok');
    closePanel('panel-form-investigacion');
    investigacionEnProceso = null;
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Generación del PDF de Investigación (misma técnica de overlay que Charla:
// checkX() centra la "X" en el centro vertical real de la celda del checkbox,
// medido con pdfplumber sobre la plantilla, usando la altura de mayúscula de
// la fuente para el offset del baseline en vez de un valor a ojo) ──────────
async function generarYSubirPdfInvestigacion(datos) {
  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const templateBytes = await fetch('plantillas/investigacion_accidente.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const [p1, p2] = pdfDoc.getPages();
  const H = 841.8;

  function cover(page, x0, top0, x1, top1) {
    page.drawRectangle({ x: x0, y: H - top1, width: x1 - x0, height: top1 - top0, color: rgb(1,1,1) });
  }
  function text(page, str, x, top, size, bold) {
    page.drawText(str || '', { x, y: H - top, size: size || 6.5, font: bold ? fontBold : font, color: rgb(0,0,0) });
  }
  function checkX(page, x, cellCenterTop, size) {
    const s = size || 7.5;
    const capHeight = s * 0.72;
    const baselineTop = cellCenterTop + capHeight / 2;
    page.drawText('X', { x: x - s * 0.33, y: H - baselineTop, size: s, font: fontBold, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = []; let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  function textBlock(page, str, x, tops, maxWidth, size) {
    wrapLines(str, maxWidth, size || 6.5).slice(0, tops.length).forEach((l, i) => text(page, l, x, tops[i], size));
  }
  async function drawSig(page, dataUrl, x, top, w, h) {
    if (!dataUrl) return;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);
    const dims = img.scaleToFit(w, h);
    page.drawImage(img, { x, y: H - top - dims.height, width: dims.width, height: dims.height });
  }
  const pages = { p1, p2 };

  // Encabezado (solo existe en la página 1)
  cover(p1, 412, 95, 445, 102.8);
  text(p1, ddmmyyyy(hoyISO()), 413, 101, 6.5);

  // Información de la organización
  text(p1, datos.empresaMandante, 145, 142, 6.5);
  text(p1, datos.empresaContratista, 190, 149.4, 6.5);
  text(p1, datos.area, 70, 157.6, 6.5);
  text(p1, datos.asesorPrevencion, 142, 165.8, 6.5);
  text(p1, datos.jefaturaDepto, 172, 174.2, 6.5);

  // Antecedentes del siniestro
  text(p1, ddmmyyyy(datos.fechaSiniestro), 73, 191.4, 6.5);
  text(p1, datos.horaSiniestro, 311, 191.4, 6.5);
  text(p1, datos.lugar, 72, 199.6, 6.5);
  text(p1, datos.jefaturaDirecta, 339, 199.6, 6.5);
  text(p1, datos.supervisorDirecto, 105, 208.0, 6.5);

  // Grupos de checkbox de una sola fila
  datos.tipoSiniestro.forEach(i => checkX(p1, INV_TIPO_SINIESTRO[i].x, INV_TIPO_SINIESTRO[i].top));
  datos.empresa.forEach(i => checkX(p1, INV_EMPRESA[i].x, INV_EMPRESA[i].top));
  datos.danos.forEach(i => checkX(p1, INV_DANOS[i].x, INV_DANOS[i].top));
  if (datos.danosOtroTexto) text(p1, datos.danosOtroTexto, 178, 290, 6.5);
  datos.potencial.forEach(i => checkX(p1, INV_POTENCIAL[i].x, INV_POTENCIAL[i].top));

  // Datos del trabajador involucrado
  text(p1, datos.trabajadorNombre, 118, 326.6, 6.5);
  text(p1, datos.trabajadorRut, 308, 326.6, 6.5);
  text(p1, datos.trabajadorCargo, 98, 334.8, 6.5);
  text(p1, datos.trabajadorAntiguedadCargo, 358, 334.8, 6.5);
  text(p1, datos.trabajadorAntiguedadEmpresa, 126, 343, 6.5);
  text(p1, datos.trabajadorHorasTurno, 372, 343, 6.5);
  text(p1, datos.trabajadorEstado, 113, 351.4, 6.5);
  text(p1, datos.trabajadorObservacion, 331, 351.4, 6.5);

  // Datos testigos
  text(p1, datos.testigoNombre, 118, 368.4, 6.5);
  text(p1, datos.testigoRut, 308, 368.4, 6.5);
  text(p1, datos.testigoCargo, 98, 376.6, 6.5);
  text(p1, datos.testigoTiempoCargo, 358, 376.6, 6.5);
  text(p1, datos.testigoActividad, 118, 384, 6.5);
  text(p1, datos.testigoObservacion, 331, 384, 6.5);

  // Descripción del evento (5 líneas disponibles)
  textBlock(p1, datos.descripcionEvento, 52, [402.25, 410.45, 418.65, 426.85, 435.05], 430, 6.5);

  // Localización del siniestro
  text(p1, datos.localizacion, 55, 452, 6.5);

  // Tipo de incidente / Causas inmediatas / Causas básicas (checkbox múltiples)
  datos.tipoIncidente.forEach(i => {
    const o = INV_TIPO_INCIDENTE[i];
    checkX(pages[o.page], o.x, o.top);
  });
  if (datos.tipoIncidenteOtroTexto) text(p1, datos.tipoIncidenteOtroTexto, 311, 619, 6.5);
  datos.causasInmediatas.forEach(i => {
    const o = INV_CAUSAS_INMEDIATAS[i];
    checkX(pages[o.page], o.x, o.top);
  });
  if (datos.causasInmediatasOtroTexto) text(p2, datos.causasInmediatasOtroTexto, 123, 102, 6.5);
  datos.causasBasicas.forEach(i => {
    const o = INV_CAUSAS_BASICAS[i];
    checkX(pages[o.page], o.x, o.top);
  });

  // Medidas de control implementadas (tabla de hasta 3 filas)
  const filasMedidas = [
    [datos.medida1, datos.responsable1, datos.fechaImpl1, 212],
    [datos.medida2, datos.responsable2, datos.fechaImpl2, 228],
    [datos.medida3, datos.responsable3, datos.fechaImpl3, 244],
  ];
  filasMedidas.forEach(([medida, responsable, fecha, top]) => {
    if (!medida) return;
    text(p2, medida, 55, top, 6.5);
    text(p2, responsable, 295, top, 6.5);
    text(p2, fecha ? ddmmyyyy(fecha) : '', 388, top, 6.5);
  });

  // Observaciones
  textBlock(p2, datos.observaciones, 55, [262, 270.2, 278.4, 286.6, 294.8], 425, 6.5);

  // Nombre y rut de quien investiga / cargo / firma
  text(p2, datos.investigadorNombreRut, 55, 322, 6.5);
  text(p2, datos.investigadorCargo, 76, 340, 6.5);
  await drawSig(p2, datos.firmaInvestigador, 300, 300, 160, 40);

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const nombreArchivo = 'investigacion_' + (datos.trabajadorNombre || 'accidente').replace(/\s+/g, '_');
  const up = datos.trabajadorNombre
    ? await uploadFileTrabajador(blob, datos.trabajadorNombre, nombreArchivo, 'pdf')
    : await uploadFile(blob, 'Investigaciones', nombreArchivo, 'pdf');
  return up.link;
}

// ============================================================
// MÓDULO: HOJA DE CONTROL DE RIESGOS (HCR)
// Módulo separado del resto (a pedido del cliente): se llena a diario por
// cuadrilla, antes de ejecutar el trabajo. Mismo mecanismo de overlay de
// coordenadas que Charla/Investigación, pero sobre una plantilla de 4
// páginas con tamaños mixtos (p1/p2 A4 apaisado, p3/p4 carta) y ~130
// checkbox en la página 1.
// ============================================================

// Centros X de checkbox reutilizados en toda la página 1 (medidos con
// pdfplumber: cada franja de checkbox se comparte entre varias secciones
// apiladas verticalmente en la misma columna de la página).
const HCR_CX = { col1: 257.5, col2: 457.1, col3: 695.8, si: 676.2, no: 689.2, na: 702.4 };

const HCR_PELIGROS_SEG_COL1 = [
  { label: 'Excavaciones', top: 136.85 }, { label: 'Explosivos', top: 145.15 },
  { label: 'Trabajos marinos / submarinos', top: 153.7 }, { label: 'Acopios / materiales (pilas, rumas)', top: 162.35 },
  { label: 'Trabajos en altura', top: 170.95 }, { label: 'Espacios confinados', top: 179.55 },
  { label: 'Carga suspendida', top: 188.15 }, { label: 'Transito de vehiculos', top: 196.75 },
  { label: 'Fauna (animales)', top: 205.4 }, { label: 'Condiciones metereologicas adversas', top: 217.4 },
  { label: 'Exposicion a radiacion solar', top: 229.4 }, { label: 'Entorno social peligroso', top: 238.0 },
  { label: 'Trabajos en presencia de napa', top: 246.6 }, { label: 'Flora (arboles, espinos, etc)', top: 255.0 },
].map(o => ({ ...o, x: HCR_CX.col1, page: 'p1' }));

const HCR_PELIGROS_SEG_COL2 = [
  { label: 'Movimiento de maquinaria', top: 136.85 }, { label: 'Herramientas / equipos electricos', top: 145.15 },
  { label: 'Herramientas / equipos a combustion', top: 153.7 }, { label: 'Herramientas / equipos a explosion', top: 162.35 },
  { label: 'Gases comprimidos', top: 170.95 }, { label: 'Partes en movimiento (correas, etc)', top: 179.55 },
  { label: 'Sustancia explosiva', top: 188.15 }, { label: 'Sustancia inflamable', top: 196.75 },
  { label: 'Sustancia corrosiva', top: 205.4 }, { label: 'Interferencias aereas (tendidos)', top: 217.4 },
  { label: 'Interferencias subterranea', top: 229.4 }, { label: 'Terreno desnivelado / estrecho / irregular', top: 238.0 },
  { label: 'Falta o deficiencia de iluminacion', top: 246.6 }, { label: 'Falta o deficiencia de ventilaciòn', top: 255.0 },
].map(o => ({ ...o, x: HCR_CX.col2, page: 'p1' }));

const HCR_PELIGROS_SALUD = [
  { label: 'Ruido', top: 145.15 }, { label: 'Vibraciones', top: 153.7 }, { label: 'Polvos', top: 162.35 },
  { label: 'Temperatura extrema (calor)', top: 170.95 }, { label: 'Temperatura extrema (frio)', top: 179.55 },
  { label: 'Plagas (roedores, insectos)', top: 196.75 }, { label: 'Aguas servidas', top: 205.4 },
  { label: 'Sustancia toxica', top: 229.4 }, { label: 'Sustancia venenosa', top: 238.0 },
  { label: 'Radiacion ionizante (densimetro nuclear)', top: 255.0 },
].map(o => ({ ...o, x: HCR_CX.col3, page: 'p1' }));

const HCR_RIESGOS_SEG = [
  { label: 'Aplastamiento', top: 272.8 }, { label: 'Atrapamiento', top: 281.4 }, { label: 'Atropellamiento', top: 290.0 },
  { label: 'Contacto con', top: 298.6 }, { label: 'Caida a nivel', top: 307.2 }, { label: 'Caida a desnivel', top: 315.8 },
  { label: 'Electrocusion', top: 324.4 }, { label: 'Golpeado por', top: 333.0 }, { label: 'Golpeado contra', top: 341.6 },
  { label: 'Quemadura', top: 350.2 }, { label: 'Sobreesfuerzo', top: 358.8 }, { label: 'Otros: especifique', top: 367.2 },
].map(o => ({ ...o, x: HCR_CX.col1, page: 'p1' }));

const HCR_RIESGOS_MAT = [
  { label: 'Asentamiento', top: 272.8 }, { label: 'Contaminacion', top: 281.4 }, { label: 'Colision', top: 290.0 },
  { label: 'Desplome', top: 298.6 }, { label: 'Derrumbe', top: 307.2 }, { label: 'Desgaste', top: 315.8 },
  { label: 'Explosion', top: 324.4 }, { label: 'Incendio', top: 333.0 }, { label: 'Inundacion', top: 341.6 },
  { label: 'Robo', top: 350.2 }, { label: 'Socavamiento', top: 358.8 }, { label: 'Volcamiento', top: 367.2 },
].map(o => ({ ...o, x: HCR_CX.col2, page: 'p1' }));

const HCR_RIESGOS_SALUD = [
  { label: 'Alteracion del sistema nervioso', top: 272.8 }, { label: 'Asfixia', top: 281.4 }, { label: 'Conjuntivitis', top: 290.0 },
  { label: 'Dermatitis', top: 298.6 }, { label: 'Hipotermia', top: 307.2 }, { label: 'Intoxicacion', top: 315.8 },
  { label: 'Infeccion', top: 324.4 }, { label: 'Insolacion', top: 333.0 }, { label: 'Enfermedades respiratorias', top: 341.6 },
  { label: 'Sordera', top: 350.2 }, { label: 'Tendinitis', top: 358.8 }, { label: 'Irradiacion', top: 367.2 },
].map(o => ({ ...o, x: HCR_CX.col3, page: 'p1' }));

const HCR_EPP_COLA = [
  { label: 'Casco', top: 394.4 }, { label: 'Zapato de seguridad', top: 403.0 }, { label: 'Lente de seguridad', top: 411.6 },
  { label: 'Chaleco o buzo con reflectante', top: 420.05 },
  { label: 'Proteccion en las manos', top: 436.15 }, { label: 'Proteccion auditiva', top: 444.4 },
  { label: 'Proteccion respiratoria', top: 453.0 }, { label: 'Proteccion facial (careta)', top: 461.6 },
  { label: 'Proteccion contra caida (arnès)', top: 470.25 }, { label: 'Ropa termica', top: 478.9 },
  { label: 'Ropa soldador (traje completo de cuero)', top: 487.5 }, { label: 'Pierneras', top: 495.9 },
].map(o => ({ ...o, x: HCR_CX.col1, page: 'p1' }));

const HCR_EPP_COLB = [
  { label: 'Traje desechable', top: 386.0 }, { label: 'Ropa de agua', top: 394.4 },
  { label: 'Bota de agua o cubrecalzado', top: 403.0 }, { label: 'Protector solar', top: 411.45 },
  { label: 'Señalizacion de peligros interior faena', top: 428.35 }, { label: 'Señalizacion vial reglamentaria', top: 436.1 },
  { label: 'Proteccion rigida (barandas-tapas)', top: 444.4 }, { label: 'Cinta de peligro', top: 453.0 },
  { label: 'Alarma sonora', top: 461.6 }, { label: 'Alarma luminosa (baliza)', top: 470.25 },
  { label: 'Conos - cono tambo', top: 478.9 }, { label: 'Lineas de vida', top: 487.5 },
  { label: 'Banderero o loro vivo', top: 495.9 },
].map(o => ({ ...o, x: HCR_CX.col2, page: 'p1' }));

const HCR_EPP_COLC = [
  { label: 'Bloqueo de equipo', top: 386.0 }, { label: 'Tarjeta de autorizaciòn (andamio y plataforma)', top: 394.4 },
  { label: 'Pantallas o biombos', top: 403.0 }, { label: 'Pertigas', top: 411.6 }, { label: 'Medicion de atmosfera', top: 420.05 },
].map(o => ({ ...o, x: HCR_CX.col3, page: 'p1' }));

const HCR_VERIF_PREGUNTAS = [
  { label: '¿Conoce el inventario de riesgos para esta actividad?', top: 444.1 },
  { label: '¿Conoce el procedimiento o instructivo relacionado?', top: 452.7 },
];
const HCR_REGISTROS_ADIC = [
  { label: 'Charla especifica de procedimiento o instructivo', top: 469.85 },
  { label: 'Inspeccion a equipo / herramienta / area', top: 478.45 },
  { label: 'Observacion', top: 487.1 },
  { label: 'Lista de chequeo diaria vehiculo / maquinaria', top: 495.7 },
];

function renderChecklistsHcr() {
  renderChecklistInv('chk-hcr-peligros-seg-col1', HCR_PELIGROS_SEG_COL1, 'checkbox', 'peligrosSegCol1');
  renderChecklistInv('chk-hcr-peligros-seg-col2', HCR_PELIGROS_SEG_COL2, 'checkbox', 'peligrosSegCol2');
  renderChecklistInv('chk-hcr-peligros-salud', HCR_PELIGROS_SALUD, 'checkbox', 'peligrosSalud');
  renderChecklistInv('chk-hcr-riesgos-seg', HCR_RIESGOS_SEG, 'checkbox', 'riesgosSeg');
  renderChecklistInv('chk-hcr-riesgos-mat', HCR_RIESGOS_MAT, 'checkbox', 'riesgosMat');
  renderChecklistInv('chk-hcr-riesgos-salud', HCR_RIESGOS_SALUD, 'checkbox', 'riesgosSalud');
  renderChecklistInv('chk-hcr-epp-cola', HCR_EPP_COLA, 'checkbox', 'eppColA');
  renderChecklistInv('chk-hcr-epp-colb', HCR_EPP_COLB, 'checkbox', 'eppColB');
  renderChecklistInv('chk-hcr-epp-colc', HCR_EPP_COLC, 'checkbox', 'eppColC');
  document.getElementById('chk-hcr-verif').innerHTML = HCR_VERIF_PREGUNTAS.map((p, i) => `
    <div class="chk-row"><label class="chk-row-label" style="flex:1;"><span>${esc(p.label)}</span></label>
      <div style="display:flex;gap:14px;">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="radio" name="verif${i}" value="si"> Sí</label>
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="radio" name="verif${i}" value="no"> No</label>
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="radio" name="verif${i}" value="na"> N/A</label>
      </div>
    </div>`).join('');
  document.getElementById('chk-hcr-registros').innerHTML = HCR_REGISTROS_ADIC.map((p, i) => `
    <div class="chk-row"><label class="chk-row-label" style="flex:1;"><span>${esc(p.label)}</span></label>
      <div style="display:flex;gap:14px;">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="radio" name="reg${i}" value="si"> Sí</label>
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="radio" name="reg${i}" value="no"> No</label>
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="radio" name="reg${i}" value="na"> N/A</label>
      </div>
    </div>`).join('');
}

function renderHcr() {
  const items = [...allHcr].reverse();
  if (items.length === 0) { setListHTML('hcr', emptyState('Sin HCR registradas', 'Toca "+" para registrar una')); return; }
  setListHTML('hcr', items.map(h => `
    <div class="card card--default">
      <div class="card-icon modulo-icon--and">${ic('hcr',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(h.actividad)}</div>
        <div class="card-sub">${esc(h.fecha)} · ${esc(h.obra)}${h.area ? ' · ' + esc(h.area) : ''}</div>
        ${h.pdf ? `<a href="${esc(h.pdf)}" target="_blank" class="badge blue">${ic('documento',12)} Ver documento</a>` : ''}
      </div>
    </div>`).join(''));
}

let hcrEnProceso = null;
function renderChecklistTrabajadoresHcr() {
  const activos = allTrabajadores.filter(t => t.estado === 'Activo');
  document.getElementById('checklist-trabajadores-hcr').innerHTML = activos.map(t => `
    <div class="chk-row" data-nombre="${esc(t.nombre)}" data-rut="${esc(t.rut)}">
      <label class="chk-row-label">
        <span class="chk-row-checkbox-wrap">
          <input type="checkbox" class="chk-row-input">
          <span class="chk-row-checkbox"></span>
        </span>
        <span>${esc(t.nombre)} <span style="color:#888;">· ${esc(t.rut)}</span></span>
      </label>
    </div>`).join('');
}
function abrirNuevoHcr() {
  hcrEnProceso = null;
  const f = document.getElementById('form-hcr');
  f.reset();
  f.fecha.value = hoyISO();
  const selObraHcr = document.getElementById('sel-obra-hcr');
  selObraHcr.innerHTML = opcionesObraSelectHTML('');
  onCambioObraSelect(selObraHcr, 'input-hcr-obra-otra');
  renderChecklistsHcr();
  renderChecklistTrabajadoresHcr();
  openPanel('panel-form-hcr');
  setTimeout(() => {
    initFirmaPad('firma-canvas-hcr-supervisor');
    initFirmaPad('firma-canvas-hcr-jefeobra');
    initFirmaPad('firma-canvas-hcr-prevencion');
  }, 80);
}
function seleccionadosHcrRadio(prefix, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const el = document.querySelector(`input[name="${prefix}${i}"]:checked`);
    out.push(el ? el.value : '');
  }
  return out;
}
function guardarDatosHcr(ev) {
  ev.preventDefault();
  const f = ev.target;
  if (firmaEstaVacia('firma-canvas-hcr-supervisor')) { toast('Falta la firma del supervisor', 'error'); return; }
  const asistentes = [...document.querySelectorAll('#checklist-trabajadores-hcr .chk-row')]
    .filter(row => row.querySelector('.chk-row-input').checked)
    .map(row => ({ nombre: row.dataset.nombre, rut: row.dataset.rut, firma: null }));

  hcrEnProceso = {
    obra: valorObra(f.obra, 'input-hcr-obra-otra'),
    fecha: f.fecha.value,
    actividad: f.actividad.value, area: f.area.value, hhCapacitacion: f.hhCapacitacion.value,
    peligrosSegCol1: seleccionadosInv('peligrosSegCol1'), peligrosSegCol2: seleccionadosInv('peligrosSegCol2'),
    peligrosSalud: seleccionadosInv('peligrosSalud'),
    riesgosSeg: seleccionadosInv('riesgosSeg'), riesgosSegOtroTexto: f.riesgosSegOtroTexto.value,
    riesgosMat: seleccionadosInv('riesgosMat'), riesgosSalud: seleccionadosInv('riesgosSalud'),
    eppColA: seleccionadosInv('eppColA'), eppColB: seleccionadosInv('eppColB'), eppColC: seleccionadosInv('eppColC'),
    verif: seleccionadosHcrRadio('verif', HCR_VERIF_PREGUNTAS.length),
    registros: seleccionadosHcrRadio('reg', HCR_REGISTROS_ADIC.length),
    tareas: [1,2,3,4].map(i => ({ tarea: f['tarea'+i].value, riesgo: f['riesgo'+i].value, medida: f['medida'+i].value })),
    supervisorNombre: f.supervisorNombre.value,
    firmaSupervisor: document.getElementById('firma-canvas-hcr-supervisor').toDataURL('image/png'),
    firmaJefeObra: document.getElementById('firma-canvas-hcr-jefeobra').toDataURL('image/png'),
    firmaPrevencion: document.getElementById('firma-canvas-hcr-prevencion').toDataURL('image/png'),
    asistentes, asistenteActual: 0,
  };
  closePanel('panel-form-hcr');
  if (asistentes.length === 0) { finalizarHcr(); return; }
  setTimeout(() => { openPanel('panel-firmar-trabajador-hcr'); mostrarFirmaTrabajadorHcrActual(); }, 260);
}
function mostrarFirmaTrabajadorHcrActual() {
  const { asistentes, asistenteActual } = hcrEnProceso;
  const a = asistentes[asistenteActual];
  document.getElementById('firmar-trabajador-hcr-progreso').textContent = `Firma ${asistenteActual + 1} de ${asistentes.length}`;
  document.getElementById('firmar-trabajador-hcr-nombre').textContent = a.nombre;
  document.getElementById('firmar-trabajador-hcr-rut').textContent = a.rut;
  setTimeout(() => initFirmaPad('firma-canvas-trabajador-hcr'), 80);
}
function avanzarTrabajadorHcr() {
  hcrEnProceso.asistenteActual++;
  if (hcrEnProceso.asistenteActual >= hcrEnProceso.asistentes.length) {
    closePanel('panel-firmar-trabajador-hcr');
    setTimeout(finalizarHcr, 260);
  } else {
    mostrarFirmaTrabajadorHcrActual();
  }
}
function confirmarFirmaTrabajadorHcr() {
  if (firmaEstaVacia('firma-canvas-trabajador-hcr')) { toast('Falta la firma', 'error'); return; }
  const canvas = document.getElementById('firma-canvas-trabajador-hcr');
  hcrEnProceso.asistentes[hcrEnProceso.asistenteActual].firma = canvas.toDataURL('image/png');
  avanzarTrabajadorHcr();
}
function saltarFirmaTrabajadorHcr() { avanzarTrabajadorHcr(); }
function cancelarFirmaTrabajadoresHcr() {
  closePanel('panel-firmar-trabajador-hcr');
  hcrEnProceso = null;
  toast('Registro de HCR cancelado', 'error');
}
async function finalizarHcr() {
  try {
    toast('Generando documento...');
    const pdfLink = await generarYSubirPdfHcr(hcrEnProceso);
    const n = allHcr.length + 1;
    await appendSheet(`'${CONFIG.SHEET_HCR}'!A:V`, [[
      n, hcrEnProceso.fecha, hcrEnProceso.obra, hcrEnProceso.actividad, hcrEnProceso.area, hcrEnProceso.hhCapacitacion,
      hcrEnProceso.peligrosSegCol1.map(i => HCR_PELIGROS_SEG_COL1[i].label).concat(hcrEnProceso.peligrosSegCol2.map(i => HCR_PELIGROS_SEG_COL2[i].label)).join('; '),
      hcrEnProceso.peligrosSalud.map(i => HCR_PELIGROS_SALUD[i].label).join('; '),
      hcrEnProceso.riesgosSeg.map(i => HCR_RIESGOS_SEG[i].label).join('; '),
      hcrEnProceso.riesgosMat.map(i => HCR_RIESGOS_MAT[i].label).join('; '),
      hcrEnProceso.riesgosSalud.map(i => HCR_RIESGOS_SALUD[i].label).join('; '),
      hcrEnProceso.eppColA.map(i => HCR_EPP_COLA[i].label).concat(hcrEnProceso.eppColB.map(i => HCR_EPP_COLB[i].label)).concat(hcrEnProceso.eppColC.map(i => HCR_EPP_COLC[i].label)).join('; '),
      hcrEnProceso.verif.join('; '), hcrEnProceso.registros.join('; '),
      hcrEnProceso.tareas.map(t => `${t.tarea} | ${t.riesgo} | ${t.medida}`).filter(s => s.trim() !== ' |  | ').join(' // '),
      hcrEnProceso.supervisorNombre, '', '',
      hcrEnProceso.asistentes.map(a => `${a.nombre} (${a.rut})`).join('; '),
      pdfLink, userEmail || '', new Date().toLocaleString('es-CL'),
    ]]);
    toast('HCR registrada y documento generado ✓', 'ok');
    hcrEnProceso = null;
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Generación del PDF de HCR: plantilla de 4 páginas, p1/p2 A4 apaisado
// (H=595.2) y p3/p4 carta (H=792). Mismo checkX()/textBlock() ya validados
// en Investigación, coordenadas medidas con pdfplumber (franjas de checkbox
// compartidas entre secciones apiladas en la misma columna). ──────────────
async function generarYSubirPdfHcr(datos) {
  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const templateBytes = await fetch('plantillas/hcr.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const [p1, p2, p3, p4] = pdfDoc.getPages();
  const H1 = 595.2, H2 = 792;

  function cover(page, H, x0, top0, x1, top1) {
    page.drawRectangle({ x: x0, y: H - top1, width: x1 - x0, height: top1 - top0, color: rgb(1,1,1) });
  }
  function text(page, H, str, x, top, size, bold) {
    page.drawText(str || '', { x, y: H - top, size: size || 6.5, font: bold ? fontBold : font, color: rgb(0,0,0) });
  }
  function checkX(page, H, x, cellCenterTop, size) {
    const s = size || 7.5;
    const capHeight = s * 0.72;
    const baselineTop = cellCenterTop + capHeight / 2;
    page.drawText('X', { x: x - s * 0.33, y: H - baselineTop, size: s, font: fontBold, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = []; let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  function textBlock(page, H, str, x, tops, maxWidth, size) {
    wrapLines(str, maxWidth, size || 6.5).slice(0, tops.length).forEach((l, i) => text(page, H, l, x, tops[i], size));
  }
  async function drawSig(page, H, dataUrl, x, top, w, h) {
    if (!dataUrl) return;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);
    const dims = img.scaleToFit(w, h);
    page.drawImage(img, { x, y: H - top - dims.height, width: dims.width, height: dims.height });
  }

  // Pie de página de la plantilla original (branding de terceros) sólo
  // existe en p3/p4 — se tapa igual que en Charla/HCR original.
  [p3, p4].forEach(p => cover(p, H2, 220, 767, 392, 782));

  // Encabezado AÑO (páginas 1 y 2, cada una trae su propia caja AÑO/VERSION/PAGINA)
  cover(p1, H1, 630, 53, 709, 62.5);
  text(p1, H1, ddmmyyyy(hoyISO()), 638, 61, 6.5);
  cover(p2, H1, 566, 70.6, 657, 78.6);
  text(p2, H1, ddmmyyyy(hoyISO()), 567, 77, 6.5);

  // 1. Peligros/Seguridad + 2. Peligros/Salud
  datos.peligrosSegCol1.forEach(i => checkX(p1, H1, HCR_PELIGROS_SEG_COL1[i].x, HCR_PELIGROS_SEG_COL1[i].top));
  datos.peligrosSegCol2.forEach(i => checkX(p1, H1, HCR_PELIGROS_SEG_COL2[i].x, HCR_PELIGROS_SEG_COL2[i].top));
  datos.peligrosSalud.forEach(i => checkX(p1, H1, HCR_PELIGROS_SALUD[i].x, HCR_PELIGROS_SALUD[i].top));

  // 3/4/5. Riesgos
  datos.riesgosSeg.forEach(i => checkX(p1, H1, HCR_RIESGOS_SEG[i].x, HCR_RIESGOS_SEG[i].top));
  if (datos.riesgosSegOtroTexto) text(p1, H1, datos.riesgosSegOtroTexto, 145, 369, 6);
  datos.riesgosMat.forEach(i => checkX(p1, H1, HCR_RIESGOS_MAT[i].x, HCR_RIESGOS_MAT[i].top));
  datos.riesgosSalud.forEach(i => checkX(p1, H1, HCR_RIESGOS_SALUD[i].x, HCR_RIESGOS_SALUD[i].top));

  // 6. EPP y medios de apoyo
  datos.eppColA.forEach(i => checkX(p1, H1, HCR_EPP_COLA[i].x, HCR_EPP_COLA[i].top));
  datos.eppColB.forEach(i => checkX(p1, H1, HCR_EPP_COLB[i].x, HCR_EPP_COLB[i].top));
  datos.eppColC.forEach(i => checkX(p1, H1, HCR_EPP_COLC[i].x, HCR_EPP_COLC[i].top));

  // 7. Verificación de comunicación + registros adicionales (SI/NO/NA)
  const colXSiNoNa = { si: HCR_CX.si, no: HCR_CX.no, na: HCR_CX.na };
  HCR_VERIF_PREGUNTAS.forEach((p, i) => { if (datos.verif[i]) checkX(p1, H1, colXSiNoNa[datos.verif[i]], p.top); });
  HCR_REGISTROS_ADIC.forEach((p, i) => { if (datos.registros[i]) checkX(p1, H1, colXSiNoNa[datos.registros[i]], p.top); });

  // Página 2: encabezado (Actividad/Área/Fecha/HH capacitación)
  text(p2, H1, datos.actividad, 70, 109, 6.5);
  text(p2, H1, datos.hhCapacitacion, 460, 109, 6.5);
  text(p2, H1, datos.area, 65, 120, 6.5);
  text(p2, H1, ddmmyyyy(datos.fecha), 418, 120, 6.5);

  // Tabla Tareas / Riesgos / Medidas para el control de los riesgos
  const filaAltura = (482.0 - 135.5) / 4;
  datos.tareas.forEach((t, i) => {
    if (!t.tarea && !t.riesgo && !t.medida) return;
    const topBase = 135.5 + i * filaAltura + 10;
    textBlock(p2, H1, t.tarea, 38, [topBase, topBase+8.6, topBase+17.2], 165, 6.5);
    textBlock(p2, H1, t.riesgo, 213, [topBase, topBase+8.6, topBase+17.2], 143, 6.5);
    textBlock(p2, H1, t.medida, 366, [topBase, topBase+8.6, topBase+17.2], 285, 6.5);
  });

  // Firmas jefatura (la caja es angosta y la plantilla ya trae impresas las
  // etiquetas "SUPERVISOR:"/"JEFE DE OBRA..."/"PREVENCION DE RIESGOS" a media
  // altura de cada columna; sólo se dibuja la firma debajo, sin nombre
  // tipeado encima para no superponerse con esas etiquetas)
  await drawSig(p2, H1, datos.firmaSupervisor, 365, 510, 110, 22);
  await drawSig(p2, H1, datos.firmaJefeObra, 486, 510, 75, 20);
  await drawSig(p2, H1, datos.firmaPrevencion, 569, 510, 85, 20);

  // Fecha en encabezado de páginas 3 y 4 (registro de firmas)
  [p3, p4].forEach(p => {
    cover(p, H2, 488, 35, 546, 50);
    text(p, H2, ddmmyyyy(hoyISO()), 490, 47, 8);
  });

  // La página 4 repite al final su propia caja "FIRMAS JEFATURA" (idéntica a
  // la de la página 2) — se dibujan las mismas 3 firmas ahí también.
  await drawSig(p4, H2, datos.firmaSupervisor, 35, 668, 185, 38);
  await drawSig(p4, H2, datos.firmaJefeObra, 233, 668, 140, 38);
  await drawSig(p4, H2, datos.firmaPrevencion, 386, 668, 175, 38);

  // Roster de firmas de la cuadrilla: filas 1-23 en página 3, 24-42 en página 4
  const filasP3 = [122.0,149.4,178.4,202.8,232.6,255.6,284.0,308.4,338.2,361.2,389.6,413.4,443.9,469.9,495.3,518.3,546.5,570.3,597.9,625.1,649.7,674.3,698.9];
  const filasP4 = [122.0,149.4,178.4,202.8,232.6,255.6,284.0,308.4,338.2,361.2,389.6,413.4,443.9,469.9,495.3,518.3,546.5,570.3,597.9];
  for (let i = 0; i < datos.asistentes.length && i < filasP3.length; i++) {
    const a = datos.asistentes[i], top = filasP3[i];
    text(p3, H2, a.nombre, 63, top + 8, 8);
    text(p3, H2, a.rut, 270, top + 8, 8);
    await drawSig(p3, H2, a.firma, 382, top - 1, 175, 24);
  }
  for (let i = filasP3.length; i < datos.asistentes.length && i < filasP3.length + filasP4.length; i++) {
    const a = datos.asistentes[i], top = filasP4[i - filasP3.length];
    text(p4, H2, a.nombre, 63, top + 8, 8);
    text(p4, H2, a.rut, 270, top + 8, 8);
    await drawSig(p4, H2, a.firma, 382, top - 1, 175, 24);
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const up = await uploadFile(blob, 'HCR', 'hcr_' + (datos.obra || 'obra').replace(/\s+/g,'_'), 'pdf');
  return up.link;
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
    <div class="chk-row" data-item="${esc(item)}">
      <label class="chk-row-label">
        <span class="chk-row-checkbox-wrap">
          <input type="checkbox" class="chk-row-input" onchange="onToggleEppItem(this)">
          <span class="chk-row-checkbox"></span>
        </span>
        <span>${esc(item)}</span>
      </label>
      <input type="number" class="epp-item-qty hidden" min="1" value="1">
    </div>`).join('');
}
function onToggleEppItem(chk) {
  chk.closest('.chk-row').querySelector('.epp-item-qty').classList.toggle('hidden', !chk.checked);
}
function onCambioEppOtro() {
  const nombre = document.getElementById('input-epp-otro').value.trim();
  document.getElementById('grupo-epp-otro-qty').classList.toggle('hidden', !nombre);
}
function recolectarItemsEpp() {
  const items = [];
  document.querySelectorAll('#checklist-epp .chk-row').forEach(row => {
    const chk = row.querySelector('.chk-row-input');
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
    const row = document.querySelector(`#checklist-epp .chk-row[data-item="${CSS.escape(prefillItem)}"]`);
    if (row) {
      const chk = row.querySelector('.chk-row-input');
      chk.checked = true;
      onToggleEppItem(chk);
    } else {
      document.getElementById('input-epp-otro').value = prefillItem;
      document.getElementById('grupo-epp-otro-qty').classList.remove('hidden');
    }
  }
  openPanel('panel-form-epp');
  setTimeout(() => initFirmaPad('firma-canvas'), 80);
}
// canvasId: distintos paneles con firma (EPP, relator de charla, asistente de
// charla) tienen su propio <canvas> — solo uno está visible a la vez, así que
// basta con recordar cuál es el activo en firmaCanvasId.
let firmaCanvasId = 'firma-canvas';
// Nota: start/move/end usan `ctx`/`activa` locales a cada canvas (no las
// globales firmaCtx/firmaActiva) para que varios pads de firma puedan
// coexistir a la vez en un mismo panel (ej. las 3 firmas de jefatura del
// HCR) sin pisarse el contexto de dibujo entre sí.
function initFirmaPad(canvasId) {
  const id = canvasId || 'firma-canvas';
  firmaCanvasId = id;
  const canvas = document.getElementById(id);
  canvas.width = canvas.clientWidth; canvas.height = 180;
  const ctx = canvas.getContext('2d');
  firmaCtx = ctx;
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  let activa = false;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const start = (e) => { e.preventDefault(); activa = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e) => { if (!activa) return; e.preventDefault(); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const end = () => { activa = false; };
  canvas.onmousedown = start; canvas.onmousemove = move; canvas.onmouseup = end; canvas.onmouseleave = end;
  canvas.ontouchstart = start; canvas.ontouchmove = move; canvas.ontouchend = end;
}
function limpiarFirmaId(canvasId) {
  const canvas = document.getElementById(canvasId);
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}
function limpiarFirma() { limpiarFirmaId(firmaCanvasId); }
function firmaEstaVacia(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return false;
  return true;
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

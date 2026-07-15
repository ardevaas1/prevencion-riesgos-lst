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
const TIPOS_EVENTO_INC = ['Casi Accidente', 'Incidente', 'Accidente Leve', 'Accidente Grave', 'Accidente Fatal'];
const EPP_ITEMS = [
  'Casco', 'Lentes de seguridad', 'Guantes', 'Zapatos de seguridad',
  'Chaleco reflectante', 'Protección auditiva', 'Arnés de seguridad',
  'Mascarilla / Respirador', 'Careta facial', 'Ropa de agua', 'Otro'
];

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

// Sube un archivo (File o Blob) a una subcarpeta del módulo. Devuelve {id, name, link}
async function uploadFile(fileOrBlob, nombreModulo, prefixName, ext) {
  await ensureToken();
  toast('Subiendo archivo...');
  const folderId = await getModuloFolder(nombreModulo);
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

// ── UI helpers ───────────────────────────────────────────────
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
};
function ic(name, size) { return ICONS[name].replace('<svg ', `<svg style="width:${size||14}px;height:${size||14}px;vertical-align:-3px;flex-shrink:0" `); }

function renderModulosHome() {
  const modulos = [
    { key: 'inspecciones', nombre: 'Inspecciones', desc: 'Con foto y alerta de charla automática' },
    { key: 'incidentes', nombre: 'Incidentes y Accidentes', desc: 'Registro con evidencia fotográfica' },
    { key: 'procedimientos', nombre: 'Procedimientos de Trabajo Seguro', desc: 'PTS vigentes de la obra' },
    { key: 'epp', nombre: 'Entrega de EPP', desc: 'Con firma digital del trabajador' },
    { key: 'trabajadores', nombre: 'Trabajadores', desc: 'Nómina de la obra' },
    { key: 'charlas', nombre: 'Charlas de Seguridad', desc: 'Alertas generadas por inspecciones' },
  ];
  setListHTML('modulos-home', modulos.map(m => `
    <div class="modulo-card" onclick="irPagina('${m.key}')">
      <div class="modulo-icon modulo-icon--pr">${ICONS[m.key]}</div>
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

async function cargarTodo() {
  toast('Cargando datos...');
  try {
    const [trab, insp, inc, proc, epp, charlas] = await Promise.all([
      fetchSheet(`'${CONFIG.SHEET_TRABAJADORES}'!A2:I2000`),
      fetchSheet(`'${CONFIG.SHEET_INSPECCIONES}'!A2:L2000`),
      fetchSheet(`'${CONFIG.SHEET_INCIDENTES}'!A2:M2000`),
      fetchSheet(`'${CONFIG.SHEET_PROCEDIMIENTOS}'!A2:I2000`),
      fetchSheet(`'${CONFIG.SHEET_EPP}'!A2:I2000`),
      fetchSheet(`'${CONFIG.SHEET_CHARLAS}'!A2:G2000`),
    ]);
    allTrabajadores = trab.map((r,i) => rowToTrabajador(r,i));
    allInspecciones = insp.map((r,i) => rowToInspeccion(r,i));
    allIncidentes = inc.map((r,i) => rowToIncidente(r,i));
    allProcedimientos = proc.map((r,i) => rowToProcedimiento(r,i));
    allEpp = epp.map((r,i) => rowToEpp(r,i));
    allCharlas = charlas.map((r,i) => rowToCharla(r,i));
    renderDashboard();
    renderTrabajadores(); renderInspecciones(); renderIncidentes(); renderProcedimientos(); renderEpp(); renderCharlas();
  } catch (e) {
    console.error(e);
    toast(e.message, 'error');
  }
}

// ── Mapeo de filas ───────────────────────────────────────────
function rowToTrabajador(r, i) {
  return { fila: i+2, n: r[0]||'', nombre: r[1]||'', rut: r[2]||'', cargo: r[3]||'', empresa: r[4]||'',
    fechaIngreso: r[5]||'', estado: r[6]||'Activo', foto: r[7]||'', fechaRegistro: r[8]||'' };
}
function rowToInspeccion(r, i) {
  return { fila: i+2, n: r[0]||'', fecha: r[1]||'', tipo: r[2]||'', area: r[3]||'', inspector: r[4]||'',
    tema: r[5]||'', hallazgos: r[6]||'', riesgo: r[7]||'Bajo', foto: r[8]||'', accion: r[9]||'',
    estado: r[10]||'Abierta', fechaRegistro: r[11]||'' };
}
function rowToIncidente(r, i) {
  return { fila: i+2, n: r[0]||'', fecha: r[1]||'', tipo: r[2]||'', trabajador: r[3]||'', area: r[4]||'',
    descripcion: r[5]||'', causas: r[6]||'', gravedad: r[7]||'', foto: r[8]||'', accion: r[9]||'',
    estado: r[10]||'Abierto', fechaRegistro: r[11]||'', reportadoPor: r[12]||'' };
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
}

// ============================================================
// MÓDULO: TRABAJADORES
// ============================================================
function renderTrabajadores() {
  const activos = [...allTrabajadores].reverse();
  if (activos.length === 0) { setListHTML('trabajadores', emptyState('Sin trabajadores', 'Agrega el primer trabajador')); return; }
  setListHTML('trabajadores', activos.map(t => `
    <div class="card card--default">
      <div class="card-body">
        <div class="card-title">${esc(t.nombre)}</div>
        <div class="card-sub">${esc(t.cargo)} · ${esc(t.rut)}</div>
        <div class="badge-row"><span class="badge ${t.estado==='Activo'?'green':'gray'}">${esc(t.estado)}</span>
        <span class="badge blue">${esc(t.empresa)}</span></div>
      </div>
    </div>`).join(''));
}
function selectTrabajadoresOptions() {
  return allTrabajadores.filter(t=>t.estado==='Activo').map(t => `<option value="${esc(t.nombre)}|${esc(t.rut)}">${esc(t.nombre)} — ${esc(t.rut)}</option>`).join('');
}
function abrirFormTrabajador() {
  document.getElementById('form-trabajador').reset();
  openPanel('panel-form-trabajador');
}
async function guardarTrabajador(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    let fotoLink = '';
    const fotoFile = f.foto.files[0];
    if (fotoFile) {
      const up = await uploadFile(fotoFile, 'Trabajadores', 'foto_' + f.nombre.value.replace(/\s+/g,'_'));
      fotoLink = up.link;
    }
    const n = allTrabajadores.length + 1;
    await appendSheet(`'${CONFIG.SHEET_TRABAJADORES}'!A:I`, [[
      n, f.nombre.value, f.rut.value, f.cargo.value, f.empresa.value,
      f.fechaIngreso.value, f.estado.value, fotoLink, new Date().toLocaleString('es-CL')
    ]]);
    toast('Trabajador agregado ✓', 'ok');
    closePanel('panel-form-trabajador');
    cargarTodo();
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
      <div class="card-body">
        <div class="card-title">${esc(i.tipo)} — ${esc(i.area)}</div>
        <div class="card-sub">${esc(i.fecha)} · ${esc(i.inspector)} · Tema: ${esc(i.tema)}</div>
        <div class="badge-row"><span class="badge ${meta.color}">Riesgo ${esc(i.riesgo)}</span>
        <span class="badge gray">${esc(i.estado)}</span>
        ${i.foto ? `<a href="${esc(i.foto)}" target="_blank" class="badge blue">${ic('camara',12)} Foto</a>` : ''}</div>
      </div>
    </div>`;
  }).join(''));
}
function abrirFormInspeccion() {
  const f = document.getElementById('form-inspeccion');
  f.reset();
  f.fecha.value = hoyISO();
  document.getElementById('sel-tema-inspeccion').innerHTML = TEMAS_CHARLA.map(t=>`<option>${t}</option>`).join('');
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
    await appendSheet(`'${CONFIG.SHEET_INSPECCIONES}'!A:L`, [[
      n, f.fecha.value, f.tipo.value, f.area.value, f.inspector.value, f.tema.value,
      f.hallazgos.value, f.riesgo.value, fotoLink, f.accion.value || '', 'Abierta',
      new Date().toLocaleString('es-CL')
    ]]);

    // Generar alerta de charla automáticamente
    const nCharla = allCharlas.length + 1;
    await appendSheet(`'${CONFIG.SHEET_CHARLAS}'!A:G`, [[
      nCharla, hoyISO(), f.tema.value, 'Inspección #' + n, 'Pendiente', '', ''
    ]]);

    toast('Inspección guardada ✓', 'ok');
    closePanel('panel-form-inspeccion');
    await cargarTodo();
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
      <div class="card-body">
        <div class="card-title">${esc(c.tema)}</div>
        <div class="card-sub">${esc(c.origen)} · Generada ${esc(c.fecha)}</div>
        <div class="badge-row"><span class="badge ${c.estado==='Pendiente'?'amber':'green'}">${esc(c.estado)}</span></div>
      </div>
      ${c.estado==='Pendiente' ? `<button class="action-btn" onclick="marcarCharlaRealizada(${c.fila})">Marcar realizada</button>` : ''}
    </div>`).join(''));
}
async function marcarCharlaRealizada(fila) {
  try {
    await ensureToken();
    const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_CHARLAS}'!E${fila}:F${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [['Realizada', hoyISO()]] }) });
    toast('Charla marcada como realizada ✓', 'ok');
    cargarTodo();
  } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// MÓDULO: INCIDENTES Y ACCIDENTES (con foto)
// ============================================================
function renderIncidentes() {
  const items = [...allIncidentes].reverse();
  if (items.length === 0) { setListHTML('incidentes', emptyState('Sin incidentes registrados', '')); return; }
  setListHTML('incidentes', items.map(i => `
    <div class="card card--default">
      <div class="card-body">
        <div class="card-title">${esc(i.tipo)} — ${esc(i.trabajador)}</div>
        <div class="card-sub">${esc(i.fecha)} · ${esc(i.area)}</div>
        <div class="card-sub">${esc(i.descripcion)}</div>
        <div class="badge-row"><span class="badge red">${esc(i.gravedad)}</span>
        <span class="badge gray">${esc(i.estado)}</span>
        ${i.foto ? `<a href="${esc(i.foto)}" target="_blank" class="badge blue">${ic('camara',12)} Foto</a>` : ''}</div>
      </div>
    </div>`).join(''));
}
function abrirFormIncidente() {
  const f = document.getElementById('form-incidente');
  f.reset();
  f.fecha.value = hoyISO();
  document.getElementById('sel-trabajador-incidente').innerHTML =
    '<option value="">— Selecciona (opcional) —</option>' + selectTrabajadoresOptions();
  openPanel('panel-form-incidente');
}
async function guardarIncidente(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    let fotoLink = '';
    const fotoFile = f.foto.files[0];
    if (fotoFile) {
      const up = await uploadFile(fotoFile, 'Incidentes-Accidentes', 'incidente_' + f.area.value.replace(/\s+/g,'_'));
      fotoLink = up.link;
    }
    const trabNombre = f.trabajador.value ? f.trabajador.value.split('|')[0] : '';
    const n = allIncidentes.length + 1;
    await appendSheet(`'${CONFIG.SHEET_INCIDENTES}'!A:M`, [[
      n, f.fecha.value, f.tipo.value, trabNombre, f.area.value, f.descripcion.value,
      f.causas.value, f.gravedad.value, fotoLink, f.accion.value || '', 'Abierto',
      new Date().toLocaleString('es-CL'), userEmail || ''
    ]]);
    toast('Registro guardado ✓', 'ok');
    closePanel('panel-form-incidente');
    cargarTodo();
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
    cargarTodo();
  } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// MÓDULO: ENTREGA DE EPP (con firma)
// ============================================================
function renderEpp() {
  const items = [...allEpp].reverse();
  if (items.length === 0) { setListHTML('epp', emptyState('Sin entregas registradas', '')); return; }
  setListHTML('epp', items.map(e => `
    <div class="card card--default">
      <div class="card-body">
        <div class="card-title">${esc(e.trabajador)}</div>
        <div class="card-sub">${esc(e.fecha)} · ${esc(e.epp)} (${esc(e.cantidad)})</div>
        <div class="badge-row">${e.firma ? `<a href="${esc(e.firma)}" target="_blank" class="badge blue">${ic('firma',12)} Ver firma</a>` : '<span class="badge gray">Sin firma</span>'}</div>
      </div>
    </div>`).join(''));
}
let firmaCtx = null, firmaActiva = false, firmaUltimo = null;
function abrirFormEpp() {
  const f = document.getElementById('form-epp');
  f.reset();
  f.fecha.value = hoyISO();
  document.getElementById('sel-trabajador-epp').innerHTML =
    '<option value="">— Selecciona un trabajador —</option>' + selectTrabajadoresOptions();
  document.getElementById('sel-epp-item').innerHTML = EPP_ITEMS.map(x=>`<option>${x}</option>`).join('');
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
    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    const trabNombre = f.trabajador.value.split('|')[0];
    const trabRut = f.trabajador.value.split('|')[1] || '';
    let firmaLink = '';
    if (blob) {
      const up = await uploadFile(blob, 'Entrega EPP - Firmas', 'firma_' + trabNombre.replace(/\s+/g,'_'), 'png');
      firmaLink = up.link;
    }
    const n = allEpp.length + 1;
    await appendSheet(`'${CONFIG.SHEET_EPP}'!A:I`, [[
      n, f.fecha.value, trabNombre, trabRut, f.epp.value, f.cantidad.value,
      firmaLink, userEmail || f.responsable.value, new Date().toLocaleString('es-CL')
    ]]);
    toast('Entrega registrada ✓', 'ok');
    closePanel('panel-form-epp');
    cargarTodo();
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
  document.getElementById('main').classList.remove('hidden');
  document.getElementById('desktop-sidebar').classList.remove('dt-oculto');
  document.getElementById('desktop-main').classList.remove('dt-oculto');
  document.getElementById('chip-email').textContent = userEmail || '';
  document.getElementById('dt-chip-email').textContent = userEmail || '';
  renderModulosHome();
  await cargarTodo();
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

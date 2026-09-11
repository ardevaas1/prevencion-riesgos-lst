// ============================================================
// WEB APP — Subcontratistas (proxy para que las cuentas subcontratistas
// NO necesiten acceso directo al Sheet ni al Drive)
// ------------------------------------------------------------
// QUÉ HACE: expone un endpoint HTTP que lee/escribe los datos del módulo
// Subcontratistas usando SIEMPRE los permisos de quien despliega este
// script (tú), sin importar qué cuenta de Google esté llamando. Así una
// empresa subcontratista puede subir sus documentos sin que le tengas que
// dar acceso de Editor al Sheet ni al Drive — la app cae automáticamente a
// este camino cuando detecta que la cuenta no tiene ese acceso directo.
//
// Si NO despliegas esto (o dejas SUBCONTRATISTAS_WEBAPP_URL vacío en
// config.js), la app sigue funcionando igual, pero cada cuenta
// subcontratista sí necesita que le des acceso de Editor al Sheet y al
// Drive, como cualquier otra persona que usa la app.
//
// CÓMO DESPLEGARLO:
// 1. Ve a tu Sheet → Extensiones → Apps Script (puede ser el MISMO
//    proyecto donde ya pegaste APPS_SCRIPT_INIT.js, en un archivo nuevo).
// 2. Crea un archivo nuevo (ícono "+" al lado de "Archivos") y pega este
//    código completo ahí.
// 3. Reemplaza RAIZ_DRIVE_ID más abajo por el mismo ID que tienes en
//    config.js → DRIVE_ROOT_FOLDER.
// 4. Arriba a la derecha, botón "Implementar" → "Nueva implementación".
//    - Tipo: "Aplicación web".
//    - Ejecutar como: "Yo" (tu cuenta).
//    - Quién tiene acceso: "Cualquier usuario".
// 5. Implementar. La primera vez te va a pedir autorizar el script (acepta
//    los permisos sobre tu propio Sheet/Drive).
// 6. Copia la URL que te da (termina en "/exec") y pégala en config.js, en
//    SUBCONTRATISTAS_WEBAPP_URL.
// 7. Ojo: cada vez que cambies este código hay que crear una NUEVA VERSIÓN
//    de la implementación (Implementar → Gestionar implementaciones →
//    ✏️ → "Nueva versión") para que los cambios se apliquen — la URL no
//    cambia, así que no hay que tocar config.js de nuevo.
//
// IMPORTANTE — qué tan seguro es esto: este endpoint NO verifica de forma
// criptográfica que quien llama es realmente el correo que dice ser (no
// valida un token firmado de Google, solo confía en el dato que manda la
// app). Antes de hacer cualquier cosa, sí revisa que ese correo esté
// registrado como "subcontratista" en la hoja USUARIOS y que la empresa
// que pide coincida con la suya — así que alguien necesitaría además
// adivinar un correo+empresa realmente dados de alta para poder escribir
// algo. Es un nivel de seguridad razonable para documentación de
// subcontratistas dentro de una constructora, pero no lo uses para datos
// más sensibles sin agregar una verificación más fuerte (ej. validar el ID
// token de Google Identity Services).
// ============================================================

const RAIZ_DRIVE_ID = 'PON_AQUI_EL_MISMO_ID_DE_config.js_DRIVE_ROOT_FOLDER';

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return respuesta({ error: 'Cuerpo de la petición inválido' }); }

  const accion = body.accion;

  // Login con RUT+PIN (ver "Login de subcontratista" más abajo) — a
  // diferencia de todo lo demás, todavía no hay un correo (es justo lo que
  // este llamado va a averiguar), así que se resuelve antes de exigirlo.
  if (accion === 'loginRutPin') {
    try { return respuesta(loginRutPin(body.rut, body.pin)); }
    catch (err) { return respuesta({ error: String(err.message || err) }); }
  }

  const correo = (body.correo || '').toString().trim().toLowerCase();
  if (!correo) return respuesta({ error: 'Falta el correo' });

  try {
    if (accion === 'verificarAcceso') return respuesta(verificarAcceso(correo));
    if (accion === 'listarDocumentos') return respuesta(listarDocumentos(correo, body.empresa));
    if (accion === 'listarTrabajadores') return respuesta(listarTrabajadores(correo, body.empresa));
    if (accion === 'subirDocumento') return respuesta(subirDocumento(correo, body));
    return respuesta({ error: 'Acción desconocida: ' + accion });
  } catch (err) {
    return respuesta({ error: String(err.message || err) });
  }
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function hojaUsuarios() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USUARIOS'); }
function hojaSubDocs() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SUBCONTRATISTAS_DOCS'); }
function hojaTrabajadores() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('TRABAJADORES'); }

// Busca la fila de USUARIOS para ese correo y confirma que su Rol es
// "subcontratista". Devuelve su Empresa (columna D) o null si no calza.
function buscarUsuarioSubcontratista(correo) {
  const datos = hojaUsuarios().getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const filaCorreo = (fila[0] || '').toString().trim().toLowerCase();
    const filaRol = (fila[1] || '').toString().trim().toLowerCase();
    if (filaCorreo === correo && filaRol === 'subcontratista') {
      return { empresa: (fila[3] || '').toString() };
    }
  }
  return null;
}

// "12.345.678-9" / "12345678-9" / "123456789" → "12345678-9" (sin puntos,
// con guion, dígito verificador en mayúscula) — para poder comparar RUTs
// escritos de cualquier forma.
function normalizarRut(rut) {
  const limpio = (rut || '').toString().replace(/[.\s]/g, '').toUpperCase();
  if (limpio.indexOf('-') !== -1) return limpio;
  if (limpio.length < 2) return limpio;
  return limpio.slice(0, -1) + '-' + limpio.slice(-1);
}

// Login de subcontratista con RUT+PIN (columnas E y F de USUARIOS) — una
// alternativa al correo de Google para cuentas subcontratistas: ver
// "Login de subcontratista" en app.js. Devuelve el correo asociado a esa
// fila para que, de ahí en más, la sesión funcione exactamente igual que
// si hubiera entrado con ese correo (mismo verificarAcceso/listarDocumentos/
// etc., sin tocar nada de esa parte).
function loginRutPin(rut, pin) {
  const rutNorm = normalizarRut(rut);
  const pinNorm = (pin || '').toString().trim();
  if (!rutNorm || !pinNorm) throw new Error('Falta el RUT o el PIN');
  const datos = hojaUsuarios().getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const filaRol = (fila[1] || '').toString().trim().toLowerCase();
    if (filaRol !== 'subcontratista') continue;
    const filaRut = normalizarRut(fila[4]);
    if (!filaRut || filaRut !== rutNorm) continue;
    const filaPin = (fila[5] || '').toString().trim();
    if (!filaPin || filaPin !== pinNorm) break; // el RUT es único: si no calza el PIN, no sigue buscando
    return {
      correo: (fila[0] || '').toString().trim().toLowerCase(),
      empresa: (fila[3] || '').toString(),
      nombre: (fila[2] || '').toString(),
    };
  }
  // Frena un poco cualquier intento de probar PIN a la fuerza — no es una
  // protección fuerte (ver nota de seguridad arriba del archivo), pero
  // hace que adivinar a fuerza bruta sea mucho más lento.
  Utilities.sleep(1200);
  throw new Error('RUT o PIN incorrecto');
}

function verificarAcceso(correo) {
  const u = buscarUsuarioSubcontratista(correo);
  return u ? { subcontratista: true, empresa: u.empresa } : { subcontratista: false };
}

// Confirma que el correo realmente pertenece a la empresa que está
// pidiendo — evita que alguien lea o suba documentos de una empresa que no
// es la suya.
function verificarPertenece(correo, empresa) {
  const u = buscarUsuarioSubcontratista(correo);
  if (!u || u.empresa !== empresa) throw new Error('Esta cuenta no tiene acceso a esa empresa');
}

function listarDocumentos(correo, empresa) {
  verificarPertenece(correo, empresa);
  const datos = hojaSubDocs().getDataRange().getValues();
  const filas = [];
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if (fila[0] === empresa || fila[0] === '__GLOBAL__') filas.push(fila);
  }
  return { filas: filas };
}

// Trabajadores de esa empresa (columna E = Empresa) — se usan para armar el
// checklist de Exámenes ocupacionales por trabajador. Devuelve las filas
// completas (mismas columnas que TRABAJADORES) para que la app las lea con
// el mismo mapeo que usa el resto de la app (rowToTrabajador).
function listarTrabajadores(correo, empresa) {
  verificarPertenece(correo, empresa);
  const datos = hojaTrabajadores().getDataRange().getValues();
  const filas = [];
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if ((fila[4] || '').toString() === empresa) filas.push(fila);
  }
  return { filas: filas };
}

// Todos los correos dados de alta como "subcontratista" de una empresa —
// se usa para compartir cada documento recién subido con quien corresponda
// (ver subirDocumento).
function correosSubcontratistaDeEmpresa(empresa) {
  const datos = hojaUsuarios().getDataRange().getValues();
  const correos = [];
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const rol = (fila[1] || '').toString().trim().toLowerCase();
    const filaEmpresa = (fila[3] || '').toString();
    if (rol === 'subcontratista' && filaEmpresa === empresa) correos.push((fila[0] || '').toString().trim().toLowerCase());
  }
  return correos;
}

function obtenerOCrearCarpetaDrive(nombre, padre) {
  const iter = padre.getFoldersByName(nombre);
  if (iter.hasNext()) return iter.next();
  return padre.createFolder(nombre);
}

function subirDocumento(correo, body) {
  const empresa = body.empresa;
  verificarPertenece(correo, empresa);
  if (!body.contenidoBase64 || !body.nombreArchivo) throw new Error('Falta el archivo');

  const raiz = DriveApp.getFolderById(RAIZ_DRIVE_ID);
  const carpetaSub = obtenerOCrearCarpetaDrive('Subcontratistas', raiz);
  const carpetaEmpresa = obtenerOCrearCarpetaDrive(empresa, carpetaSub);
  // Subcarpeta por documento (mismo criterio que el resto de la app — ver
  // uploadFileSubcontratista en app.js): así no queda todo suelto mezclado
  // en la carpeta de la empresa.
  const carpetaDestino = body.subcarpeta ? obtenerOCrearCarpetaDrive(body.subcarpeta, carpetaEmpresa) : carpetaEmpresa;

  const bytes = Utilities.base64Decode(body.contenidoBase64);
  const blob = Utilities.newBlob(bytes, body.mimeType || 'application/octet-stream', body.nombreArchivo);
  const archivo = carpetaDestino.createFile(blob);
  const link = 'https://drive.google.com/file/d/' + archivo.getId() + '/view';

  // Comparte el archivo puntual (solo lectura) con las cuentas de esta
  // empresa — sin esto, una cuenta subcontratista sin acceso directo al
  // Drive (que es justo el caso de quien pasa por este proxy) no podría
  // abrir su propio "Ver" del documento que acaba de subir.
  correosSubcontratistaDeEmpresa(empresa).forEach(function (correoDestino) {
    try { archivo.addViewer(correoDestino); } catch (e) { /* best-effort */ }
  });

  hojaSubDocs().appendRow([
    empresa, body.categoria || '', body.item || '', body.periodo || '',
    archivo.getName(), link, new Date().toLocaleString('es-CL'), correo
  ]);

  return { nombre: archivo.getName(), link: link };
}

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
  const correo = (body.correo || '').toString().trim().toLowerCase();
  if (!correo) return respuesta({ error: 'Falta el correo' });

  try {
    if (accion === 'verificarAcceso') return respuesta(verificarAcceso(correo));
    if (accion === 'listarDocumentos') return respuesta(listarDocumentos(correo, body.empresa));
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

  const bytes = Utilities.base64Decode(body.contenidoBase64);
  const blob = Utilities.newBlob(bytes, body.mimeType || 'application/octet-stream', body.nombreArchivo);
  const archivo = carpetaEmpresa.createFile(blob);
  const link = 'https://drive.google.com/file/d/' + archivo.getId() + '/view';

  hojaSubDocs().appendRow([
    empresa, body.categoria || '', body.item || '', body.periodo || '',
    archivo.getName(), link, new Date().toLocaleString('es-CL'), correo
  ]);

  return { nombre: archivo.getName(), link: link };
}

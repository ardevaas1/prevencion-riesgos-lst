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
//    config.js → DRIVE_ROOT_FOLDER. Opcional: completa también APP_URL con
//    la URL pública de la app, para que el correo de bienvenida a un
//    contacto nuevo (ver notificarContacto) incluya el link directo.
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
// URL pública donde está publicada la app (ej: "https://tuusuario.github.io")
// — se usa solo para armar el link del correo de bienvenida (ver
// notificarContacto). Si la dejas vacía, el correo se manda igual, solo que
// sin el link directo.
const APP_URL = '';

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return respuesta({ error: 'Cuerpo de la petición inválido' }); }

  const accion = body.accion;

  try {
    // Acciones para trabajadores que entran solo con su RUT (sin cuenta de
    // Google ni fila en USUARIOS) — ver "Firmar Charlas" más abajo. Van
    // antes de exigir "correo" porque estas no lo usan para nada.
    if (accion === 'verificarTrabajadorPorRut') return respuesta(verificarTrabajadorPorRut(body.rut));
    if (accion === 'misPendientesFirmar') return respuesta(misPendientesFirmar(body.rut));
    if (accion === 'firmarPendiente') return respuesta(firmarPendiente(body.idCharla, body.rut, body.firmaBase64));

    const correo = (body.correo || '').toString().trim().toLowerCase();
    if (!correo) return respuesta({ error: 'Falta el correo' });

    if (accion === 'verificarAcceso') return respuesta(verificarAcceso(correo));
    if (accion === 'listarDocumentos') return respuesta(listarDocumentos(correo, body.empresa));
    if (accion === 'listarTrabajadores') return respuesta(listarTrabajadores(correo, body.empresa));
    if (accion === 'subirDocumento') return respuesta(subirDocumento(correo, body));
    if (accion === 'notificarContacto') return respuesta(notificarContacto(body.correoDestino, body.empresa));
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

// Correo de bienvenida cuando el admin agrega un contacto nuevo (ver
// guardarSubcontratista/onAgregarCorreoSubcontratista en app.js). Solo
// manda si ese correo+empresa ya están realmente en USUARIOS — así este
// endpoint no sirve para mandar correo a cualquier dirección arbitraria.
function notificarContacto(correoDestino, empresa) {
  const correo = (correoDestino || '').toString().trim().toLowerCase();
  if (!correo || !empresa) throw new Error('Falta el correo o la empresa');
  const datos = hojaUsuarios().getDataRange().getValues();
  const existe = datos.some(function (fila, i) {
    if (i === 0) return false;
    return (fila[0] || '').toString().trim().toLowerCase() === correo &&
      (fila[1] || '').toString().trim().toLowerCase() === 'subcontratista' &&
      (fila[3] || '').toString() === empresa;
  });
  if (!existe) throw new Error('Ese correo no está registrado para esa empresa');

  const asunto = 'Ahora tienes acceso a la app de Prevención de Riesgos — ' + empresa;
  const cuerpo = 'Hola,\n\n' +
    'Te agregamos como contacto autorizado de "' + empresa + '" en la app de Prevención de Riesgos de Constructora LST.\n\n' +
    (APP_URL ? 'Puedes entrar a la app aquí: ' + APP_URL + '\n\n' : '') +
    'Ingresa con tu cuenta de Google (' + correo + '), usando el botón "Iniciar sesión con Google".\n\n' +
    'Ahí vas a poder ver y subir la documentación pendiente de tu empresa.\n\n' +
    'Saludos,\nConstructora LST';
  MailApp.sendEmail(correo, asunto, cuerpo);
  return { enviado: true };
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

// ============================================================
// FIRMAR CHARLAS — trabajadores que entran solo con su RUT
// ------------------------------------------------------------
// Un trabajador no tiene cuenta de Google ni fila en USUARIOS, así que no
// puede pasar por verificarPertenece como los subcontratistas — acá basta
// con que el RUT que escribe exista en TRABAJADORES. No es un login
// realmente seguro (cualquiera que sepa el RUT de alguien podría entrar a
// firmar por esa persona) pero es el mismo nivel de fricción que pedía el
// cliente: sin contraseña, solo el RUT, para que sea rápido de usar en el
// momento de la charla desde el celular de cada uno.
// ============================================================

function hojaCharlasPendientes() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CHARLAS_PENDIENTES'); }

// Deja el RUT solo con dígitos y el dígito verificador (sin puntos, guión
// ni espacios) para poder comparar dos RUT escritos de forma distinta.
function normalizarRut(rut) {
  return (rut || '').toString().toUpperCase().replace(/[^0-9K]/g, '');
}

function verificarTrabajadorPorRut(rutEntrada) {
  const rut = normalizarRut(rutEntrada);
  if (!rut) throw new Error('Falta el RUT');
  const datos = hojaTrabajadores().getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if (normalizarRut(fila[2]) === rut) return { encontrado: true, nombre: (fila[1] || '').toString() };
  }
  return { encontrado: false };
}

// Todas las charlas en curso donde este RUT figura como asistente y todavía
// no firmó — de a una fila por charla (IdCharla), aunque haya más de una
// fila coincidente no debería pasar (un trabajador aparece una sola vez por
// charla).
function misPendientesFirmar(rutEntrada) {
  const rut = normalizarRut(rutEntrada);
  if (!rut) throw new Error('Falta el RUT');
  const datos = hojaCharlasPendientes().getDataRange().getValues();
  const vistos = {};
  const pendientes = [];
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const firmado = (fila[7] || '').toString().trim().toLowerCase();
    if (normalizarRut(fila[5]) === rut && firmado !== 'sí' && firmado !== 'si') {
      const idCharla = (fila[0] || '').toString();
      if (vistos[idCharla]) continue;
      vistos[idCharla] = true;
      pendientes.push({
        idCharla: idCharla, obra: (fila[1] || '').toString(), fecha: (fila[2] || '').toString(),
        tema: (fila[3] || '').toString(), relator: (fila[4] || '').toString(),
      });
    }
  }
  return { pendientes: pendientes };
}

// Marca esa fila puntual de CHARLAS_PENDIENTES como firmada, guardando la
// firma tal cual (dataURL "data:image/png;base64,...") en la misma celda —
// no como archivo aparte en Drive — porque el generador de PDF de la Charla
// (generarYSubirPdfCharla/generarPdfCharlaSobrePlantilla en app.js) necesita
// esa firma en ese mismo formato para incrustarla en el documento final,
// igual que cuando se firma en persona en el dispositivo del admin. Una
// firma recortada (ver recortarFirma en app.js) pesa unos pocos KB en
// base64, muy por debajo del límite de 50.000 caracteres por celda de
// Sheets. Quien llama (la app) es responsable de revisar después si con
// esta firma ya quedaron todos los asistentes de esa charla completos, para
// generar el PDF final — este endpoint solo registra UNA firma a la vez.
function firmarPendiente(idCharla, rutEntrada, firmaBase64) {
  const rut = normalizarRut(rutEntrada);
  if (!idCharla || !rut) throw new Error('Falta la charla o el RUT');
  if (!firmaBase64) throw new Error('Falta la firma');

  const sh = hojaCharlasPendientes();
  const datos = sh.getDataRange().getValues();
  let filaEncontrada = -1;
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if ((fila[0] || '').toString() === idCharla.toString() && normalizarRut(fila[5]) === rut) {
      filaEncontrada = i + 1; // fila real en el Sheet (encabezado = fila 1)
      break;
    }
  }
  if (filaEncontrada === -1) throw new Error('No se encontró una firma pendiente para ese RUT en esa charla');
  const firmadoActual = (sh.getRange(filaEncontrada, 8).getValue() || '').toString().trim().toLowerCase();
  if (firmadoActual === 'sí' || firmadoActual === 'si') throw new Error('Esa charla ya estaba firmada');

  sh.getRange(filaEncontrada, 8, 1, 3).setValues([['Sí', firmaBase64.toString(), new Date().toLocaleString('es-CL')]]);
  return { ok: true };
}

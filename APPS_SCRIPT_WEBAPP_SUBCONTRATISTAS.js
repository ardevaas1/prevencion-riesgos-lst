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
// 4. Activa el servicio avanzado de Drive (lo usa compartirArchivoSinNotificar
//    para compartir archivos sin mandar el correo nativo de Drive "te
//    compartieron un archivo", y también convertirExcelATabla para poder leer
//    el Excel de "Listado de trabajadores"): en el panel izquierdo, ícono "+"
//    al lado de "Servicios" → busca "Drive API" → Agregar. Si no haces este
//    paso, subirDocumento falla con "Drive no está definido".
// 5. Arriba a la derecha, botón "Implementar" → "Nueva implementación".
//    - Tipo: "Aplicación web".
//    - Ejecutar como: "Yo" (tu cuenta).
//    - Quién tiene acceso: "Cualquier usuario".
// 6. Implementar. La primera vez te va a pedir autorizar el script (acepta
//    los permisos sobre tu propio Sheet/Drive).
// 7. Copia la URL que te da (termina en "/exec") y pégala en config.js, en
//    SUBCONTRATISTAS_WEBAPP_URL.
// 8. Ojo: cada vez que cambies este código hay que crear una NUEVA VERSIÓN
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

const RAIZ_DRIVE_ID = '1evnqIfGtNCO_hQq9rwgBWMZgk647zMIe'; // mismo ID que DRIVE_ROOT_FOLDER en config.js
// URL pública donde está publicada la app (ej: "https://tuusuario.github.io")
// — se usa solo para armar el link del correo de bienvenida (ver
// notificarContacto). Si la dejas vacía, el correo se manda igual, solo que
// sin el link directo.
const APP_URL = '';
// Empresa mandante — MISMOS valores que EMPRESA_PRINCIPAL_NOMBRE/RUT en
// config.js (Apps Script no puede leer ese archivo, así que se duplica
// acá). Usado por el portal de fiscalización (buscarDocumentosFiscalizacion)
// para resolver el RUT que escriba el fiscalizador también cuando es el de
// la empresa mandante, no solo el de un subcontratista.
const EMPRESA_PRINCIPAL_NOMBRE = 'Constructora LST';
const EMPRESA_PRINCIPAL_RUT = '';

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
    if (accion === 'firmarPendiente') return respuesta(firmarPendiente(body.idDocumento, body.rut, body.firmaBase64, body.pin));
    if (accion === 'registrarConsentimientoRut') return respuesta(registrarConsentimientoRut(body.rut));
    if (accion === 'crearPinTrabajador') return respuesta(crearPinTrabajador(body.rut, body.pin));
    if (accion === 'enviarComprobante') return respuesta(enviarComprobanteTrabajador(body.correoTrabajador, body.nombreArchivo, body.pdfBase64, body.asunto, body.cuerpo));
    // Portal de fiscalización DT (Ordinario 767) — lo usa un fiscalizador
    // externo, sin cuenta en la app, así que tampoco pasa por "correo".
    if (accion === 'buscarDocumentosFiscalizacion') return respuesta(buscarDocumentosFiscalizacion(body.rutFiscalizador, body.rutEmpresa, body.fechaDesde, body.fechaHasta));
    if (accion === 'crearPinFiscalizador') return respuesta(crearPinFiscalizador(body.rutFiscalizador, body.nombreFiscalizador, body.pin));
    if (accion === 'ratificarComoFiscalizador') return respuesta(ratificarComoFiscalizador(body.rutFiscalizador, body.nombreFiscalizador, body.tipoDocumento, body.idDocumento, body.tituloDocumento, body.pin));

    const correo = (body.correo || '').toString().trim().toLowerCase();
    if (!correo) return respuesta({ error: 'Falta el correo' });

    if (accion === 'verificarAcceso') return respuesta(verificarAcceso(correo));
    if (accion === 'cargarInicial') return respuesta(cargarInicial(correo));
    if (accion === 'listarDocumentos') return respuesta(listarDocumentos(correo, body.empresa));
    if (accion === 'listarTrabajadores') return respuesta(listarTrabajadores(correo, body.empresa));
    if (accion === 'subirDocumento') return respuesta(subirDocumento(correo, body));
    if (accion === 'agregarTrabajador') return respuesta(agregarTrabajador(correo, body));
    if (accion === 'importarListadoTrabajadores') return respuesta(importarListadoTrabajadores(correo, body));
    if (accion === 'notificarContacto') return respuesta(notificarContacto(body.correoDestino, body.empresa));
    if (accion === 'notificarRechazoDocumento') return respuesta(notificarRechazoDocumento(body.empresa, body.item, body.motivo));
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

// Normaliza un nombre de empresa SOLO para compararlo (nunca para guardarlo
// ni mostrarlo) — quita espacios de más al inicio/final, junta espacios
// dobles y pasa a minúscula. Un caso real: dos cuentas con "SEJEM" en
// USUARIOS que a simple vista se veían idénticas, pero una de las dos
// celdas tenía un espacio de más — esa cuenta veía "Sin trabajadores" aunque
// los datos sí existían, porque TRABAJADORES/SUBCONTRATISTAS_DOCS comparaba
// la Empresa letra por letra contra el valor (sin recortar) de USUARIOS.
function normalizarEmpresa(e) { return (e || '').toString().trim().replace(/\s+/g, ' ').toLowerCase(); }

// La columna Periodo (Control mensual, ej. "2026-10") se guarda como texto
// plano desde la app, pero Google Sheets a veces detecta solo ese texto
// como si fuera una fecha y la convierte en un valor de fecha interno al
// escribirlo — ahí getValues() (acá en Apps Script) devuelve un objeto
// Date, NO el string "2026-10", mientras que la API REST que usa el resto
// de la app (fetchSheet) sí lo muestra como texto formateado. Resultado:
// un documento con Periodo "transformado" así nunca calzaba con el mes
// elegido (comparación exacta de texto) para una cuenta que pasa por este
// proxy, aunque en el Sheet se viera perfecto y el admin sí lo viera bien
// (caso real: "Listado de trabajadores" de SEJEM, octubre 2026). Se
// reconstruye el string "AAAA-MM" a partir de la fecha para que calce
// igual que si nunca se hubiera convertido.
function normalizarPeriodo(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') {
    const mes = ('0' + (v.getMonth() + 1)).slice(-2);
    return v.getFullYear() + '-' + mes;
  }
  return (v || '').toString();
}

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
  if (!u || normalizarEmpresa(u.empresa) !== normalizarEmpresa(empresa)) throw new Error('Esta cuenta no tiene acceso a esa empresa');
}

function listarDocumentos(correo, empresa) {
  verificarPertenece(correo, empresa);
  const datos = hojaSubDocs().getDataRange().getValues();
  const filas = [];
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if (normalizarEmpresa(fila[0]) === normalizarEmpresa(empresa) || fila[0] === '__GLOBAL__') {
      fila[3] = normalizarPeriodo(fila[3]); // Periodo — ver normalizarPeriodo
      filas.push(fila);
    }
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
    if (normalizarEmpresa(fila[4]) === normalizarEmpresa(empresa)) filas.push(fila);
  }
  return { filas: filas };
}

// Todo lo que necesita la pantalla inicial de una cuenta subcontratista en
// UNA sola llamada, en vez de que la app tenga que hacer tres viajes de red
// seguidos (verificarAcceso → listarDocumentos → listarTrabajadores) — cada
// uno paga aparte el costo fijo de invocar este Web App (más notorio
// todavía si el script estaba "frío"), así que juntarlos en uno recorta el
// tiempo de carga a la tercera parte. Si esta acción no existe porque
// todavía no se redesplegó esta versión, la app (ver
// cargarDatosProxySubcontratista en app.js) cae sola al camino viejo de 3
// llamadas — no hace falta coordinar el despliegue con nada más.
function cargarInicial(correo) {
  const u = buscarUsuarioSubcontratista(correo);
  if (!u) return { subcontratista: false };
  const empresa = u.empresa;

  const datosDocs = hojaSubDocs().getDataRange().getValues();
  const filasDocs = [];
  for (let i = 1; i < datosDocs.length; i++) {
    const fila = datosDocs[i];
    if (normalizarEmpresa(fila[0]) === normalizarEmpresa(empresa) || fila[0] === '__GLOBAL__') {
      fila[3] = normalizarPeriodo(fila[3]); // Periodo — ver normalizarPeriodo
      filasDocs.push(fila);
    }
  }

  const datosTrab = hojaTrabajadores().getDataRange().getValues();
  const filasTrab = [];
  for (let i = 1; i < datosTrab.length; i++) {
    const fila = datosTrab[i];
    if (normalizarEmpresa(fila[4]) === normalizarEmpresa(empresa)) filasTrab.push(fila);
  }

  return { subcontratista: true, empresa: empresa, documentos: filasDocs, trabajadores: filasTrab };
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
    if (rol === 'subcontratista' && normalizarEmpresa(filaEmpresa) === normalizarEmpresa(empresa)) correos.push((fila[0] || '').toString().trim().toLowerCase());
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
      normalizarEmpresa(fila[3]) === normalizarEmpresa(empresa);
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

// Avisa por correo a todas las cuentas subcontratista de una empresa cuando
// el admin rechaza uno de sus documentos (ver rechazarDocSubcontratista en
// app.js) — quien llama es siempre el admin (tiene acceso directo al
// Sheet/Drive, nunca pasa por verificarPertenece), así que no hace falta
// validar que el correo que llama pertenezca a esa empresa, a diferencia de
// listarDocumentos/subirDocumento. Si la empresa no tiene ningún correo
// registrado todavía, no manda nada (no es un error, solo no hay a quién
// avisarle).
function notificarRechazoDocumento(empresa, item, motivo) {
  if (!empresa || !motivo) throw new Error('Falta la empresa o el motivo');
  const destinatarios = correosSubcontratistaDeEmpresa(empresa);
  if (!destinatarios.length) return { enviado: false };

  const asunto = 'Documento rechazado — ' + (item || 'Subcontratistas') + ' (' + empresa + ')';
  const cuerpo = 'Hola,\n\n' +
    'El documento "' + (item || 'sin nombre') + '" de "' + empresa + '" fue rechazado por Constructora LST.\n\n' +
    'Motivo del rechazo: ' + motivo + '\n\n' +
    (APP_URL ? 'Ingresa a la app para revisarlo y volver a subir el documento corregido: ' + APP_URL + '\n\n' : 'Por favor vuelve a subir el documento corregido en la app.\n\n') +
    'Saludos,\nConstructora LST';
  destinatarios.forEach(function (correoDestino) {
    try { MailApp.sendEmail(correoDestino, asunto, cuerpo); } catch (e) { /* best-effort */ }
  });
  return { enviado: true };
}

// Comparte un archivo con varios correos (solo lectura) SIN el correo nativo
// de Drive "te compartieron un archivo" — DriveApp.addViewer() no tiene forma
// de apagar ese aviso, por eso se usa el servicio avanzado Drive API
// (Drive.Permissions.create con sendNotificationEmail:false). Requiere
// activar ese servicio en el proyecto: ⚙️ Servicios (ícono "+" al lado de
// "Servicios" en el panel izquierdo) → busca "Drive API" → Agregar.
function compartirArchivoSinNotificar(fileId, correos) {
  correos.forEach(function (correoDestino) {
    try {
      Drive.Permissions.create(
        { role: 'reader', type: 'user', emailAddress: correoDestino },
        fileId,
        { sendNotificationEmail: false }
      );
    } catch (e) { /* best-effort */ }
  });
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
  // en la carpeta de la empresa. body.carpetaTrabajador (checklist de 18
  // ítems por trabajador y PDF de respaldo — ver onSubirDocSubcontratista/
  // onSubirRespaldoTrabajador en app.js) usa en cambio una carpeta propia
  // por trabajador dentro de Trabajadores/; si además viene body.subcarpeta
  // (el ítem del checklist), se abre una subcarpeta más DENTRO de la del
  // trabajador, para no mezclar los documentos de un mismo ítem entre
  // distintos trabajadores de la empresa.
  let carpetaDestino;
  if (body.carpetaTrabajador) {
    const carpetaTrabajadores = obtenerOCrearCarpetaDrive('Trabajadores', carpetaEmpresa);
    const carpetaPersona = obtenerOCrearCarpetaDrive(body.carpetaTrabajador, carpetaTrabajadores);
    carpetaDestino = body.subcarpeta ? obtenerOCrearCarpetaDrive(body.subcarpeta, carpetaPersona) : carpetaPersona;
  } else {
    carpetaDestino = body.subcarpeta ? obtenerOCrearCarpetaDrive(body.subcarpeta, carpetaEmpresa) : carpetaEmpresa;
  }

  const bytes = Utilities.base64Decode(body.contenidoBase64);
  const blob = Utilities.newBlob(bytes, body.mimeType || 'application/octet-stream', body.nombreArchivo);
  const archivo = carpetaDestino.createFile(blob);
  const link = 'https://drive.google.com/file/d/' + archivo.getId() + '/view';

  // Comparte el archivo puntual (solo lectura) con las cuentas de esta
  // empresa — sin esto, una cuenta subcontratista sin acceso directo al
  // Drive (que es justo el caso de quien pasa por este proxy) no podría
  // abrir su propio "Ver" del documento que acaba de subir. Usa el
  // servicio avanzado de Drive (no DriveApp.addViewer) para poder apagar
  // el correo nativo de "te compartieron un archivo" que manda Google
  // automáticamente — ese correo no dice nada sobre aprobado/rechazado,
  // solo generaba confusión con el correo de verdad (ver
  // notificarRechazoDocumento más abajo).
  compartirArchivoSinNotificar(archivo.getId(), correosSubcontratistaDeEmpresa(empresa));

  hojaSubDocs().appendRow([
    empresa, body.categoria || '', body.item || '', body.periodo || '',
    archivo.getName(), link, new Date().toLocaleString('es-CL'), correo
  ]);

  return { nombre: archivo.getName(), link: link };
}

// Agrega un trabajador nuevo a TRABAJADORES desde la vista restringida de
// Subcontratista (ver guardarTrabajadorSubcontratista en app.js) — mismas
// 29 columnas que escribe el alta normal de un admin (guardarTrabajador en
// app.js), dejando vacíos los campos que ese formulario simplificado no
// pide (Contrato, Examen de Altura, datos personales, etc.); el admin los
// puede completar después desde la ficha del trabajador. La foto, si viene,
// se sube con el mismo criterio de carpeta que usa el resto de la app
// (Root/Trabajadores/{nombre}/, ver getTrabajadorFolder en app.js).
function agregarTrabajador(correo, body) {
  const empresa = body.empresa;
  verificarPertenece(correo, empresa);
  if (!body.nombre || !body.rut) throw new Error('Falta el nombre o el RUT');

  let fotoLink = '';
  if (body.fotoBase64 && body.fotoNombreArchivo) {
    const raiz = DriveApp.getFolderById(RAIZ_DRIVE_ID);
    const carpetaTrab = obtenerOCrearCarpetaDrive('Trabajadores', raiz);
    const carpetaPersona = obtenerOCrearCarpetaDrive(body.nombre, carpetaTrab);
    const bytes = Utilities.base64Decode(body.fotoBase64);
    const blob = Utilities.newBlob(bytes, body.fotoMimeType || 'image/jpeg', body.fotoNombreArchivo);
    const archivo = carpetaPersona.createFile(blob);
    fotoLink = 'https://drive.google.com/file/d/' + archivo.getId() + '/view';
  }

  const sh = hojaTrabajadores();
  const n = sh.getLastRow(); // encabezado = fila 1, así que esto ya es el próximo correlativo
  sh.appendRow([
    n, body.nombre, body.rut, body.cargo || '', empresa,
    body.fechaIngreso || '', 'Activo', fotoLink, new Date().toLocaleString('es-CL'),
    body.obra || '', '', '', '', '', '', '',
    '', '', '', '', '', '', '', '', '', '',
    body.correo || '', '', '',
    body.sinCorreo ? 'Sí' : '', '', ''
  ]);
  return { ok: true };
}

// Quita tildes/mayúsculas/espacios de un encabezado de columna para poder
// reconocerlo aunque la planilla real lo haya escrito distinto (ej. "Rut"
// vs "RUT", "Fecha Ingreso" vs "Fecha de ingreso") — mismo criterio que
// normalizarHeaderExcel en app.js.
function normalizarHeaderTexto(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}
function indiceColumnaTexto(headers, candidatos) {
  const normalizados = headers.map(normalizarHeaderTexto);
  for (let i = 0; i < candidatos.length; i++) {
    const idx = normalizados.indexOf(normalizarHeaderTexto(candidatos[i]));
    if (idx !== -1) return idx;
  }
  return -1;
}
// Muchas planillas reales no empiezan con la fila de encabezados: traen
// antes 2-3 filas de título/metadata (ej. "LISTADO DE TRABAJADORES",
// "Empresa: ...", "Obra: ..."). Se busca entre las primeras `maxFilas` la
// primera fila que tenga tanto "Nombre" como "RUT" reconocibles, en vez de
// asumir siempre que es la fila 0 — mismo criterio que
// buscarFilaEncabezadosExcel en app.js.
function buscarFilaEncabezadosTexto(valores, maxFilas) {
  var limite = Math.min(valores.length, maxFilas || 10);
  for (var i = 0; i < limite; i++) {
    var headers = valores[i];
    if (indiceColumnaTexto(headers, ['Nombre', 'Nombre completo', 'Nombre trabajador']) !== -1
      && indiceColumnaTexto(headers, ['RUT', 'Rut']) !== -1) return i;
  }
  return -1;
}
// Convierte el Excel a una Hoja de Google TEMPORAL (Drive lo hace solo con
// pedir ese mimeType al crear el archivo) para poder leer sus filas con
// SpreadsheetApp — se borra apenas se terminó de leer, nunca queda en el
// Drive real. Requiere el servicio avanzado "Drive API" (el mismo que ya
// pide compartirArchivoSinNotificar más arriba).
function convertirExcelATabla(blob) {
  const archivoTemp = Drive.Files.create({ name: 'temp_import_' + Date.now(), mimeType: MimeType.GOOGLE_SHEETS }, blob);
  try {
    return SpreadsheetApp.openById(archivoTemp.id).getSheets()[0].getDataRange().getValues();
  } finally {
    // Borrado permanente (no papelera): es un archivo descartable que solo
    // existió para poder leerlo.
    try { Drive.Files.remove(archivoTemp.id); } catch (e) { /* best-effort */ }
  }
}
// Lee el Excel de "Listado de trabajadores" (ver onSubirDocSubcontratista/
// importarListadoTrabajadores en app.js — mismo criterio, versión server
// para cuentas sin acceso directo al Sheet/Drive) y da de alta en
// TRABAJADORES a cada fila que traiga al menos Nombre y RUT, saltándose los
// que ya existen para esa empresa (comparando por RUT normalizado). Si el
// archivo no se puede leer como planilla, o no trae esos dos encabezados,
// no es un error — solo no se da de alta a nadie (el documento ya se
// guardó aparte, en subirDocumento).
function importarListadoTrabajadores(correo, body) {
  const empresa = body.empresa;
  verificarPertenece(correo, empresa);
  if (!body.contenidoBase64 || !body.nombreArchivo) throw new Error('Falta el archivo');

  const bytes = Utilities.base64Decode(body.contenidoBase64);
  const blob = Utilities.newBlob(bytes, body.mimeType || 'application/octet-stream', body.nombreArchivo);

  let valores;
  try { valores = convertirExcelATabla(blob); }
  catch (e) { return { creados: 0, omitidos: 0, sinLeer: true }; }
  if (!valores || valores.length < 2) return { creados: 0, omitidos: 0, sinLeer: true };

  const filaEncabezados = buscarFilaEncabezadosTexto(valores, 10);
  if (filaEncabezados === -1) return { creados: 0, omitidos: 0, sinLeer: true };
  const headers = valores[filaEncabezados];
  const iNombre = indiceColumnaTexto(headers, ['Nombre', 'Nombre completo', 'Nombre trabajador']);
  const iRut = indiceColumnaTexto(headers, ['RUT', 'Rut']);
  const iCargo = indiceColumnaTexto(headers, ['Cargo']);
  const iObra = indiceColumnaTexto(headers, ['Obra']);
  const iFechaIngreso = indiceColumnaTexto(headers, ['Fecha de ingreso', 'Fecha ingreso']);
  const iCorreo = indiceColumnaTexto(headers, ['Correo', 'Email', 'Correo electronico', 'Correo electrónico']);

  const sh = hojaTrabajadores();
  const datosExistentes = sh.getDataRange().getValues();
  const existentes = {};
  for (let i = 1; i < datosExistentes.length; i++) {
    const fila = datosExistentes[i];
    if (normalizarEmpresa(fila[4]) === normalizarEmpresa(empresa)) existentes[normalizarRut(fila[2])] = true;
  }

  let n = sh.getLastRow(); // encabezado = fila 1, así que esto ya es el próximo correlativo
  const nuevas = [];
  let omitidos = 0;
  for (let i = filaEncabezados + 1; i < valores.length; i++) {
    const fila = valores[i];
    const nombre = (fila[iNombre] || '').toString().trim();
    const rut = (fila[iRut] || '').toString().trim();
    if (!nombre || !rut) continue;
    const rutNorm = normalizarRut(rut);
    if (existentes[rutNorm]) { omitidos++; continue; }
    existentes[rutNorm] = true;
    n++;
    nuevas.push([
      n, nombre, rut, iCargo !== -1 ? (fila[iCargo] || '').toString().trim() : '', empresa,
      iFechaIngreso !== -1 ? (fila[iFechaIngreso] || '').toString().trim() : '', 'Activo', '', new Date().toLocaleString('es-CL'),
      iObra !== -1 ? (fila[iObra] || '').toString().trim() : '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '',
      iCorreo !== -1 ? (fila[iCorreo] || '').toString().trim() : '', '', ''
    ]);
  }
  if (nuevas.length) sh.getRange(sh.getLastRow() + 1, 1, nuevas.length, 29).setValues(nuevas);
  return { creados: nuevas.length, omitidos: omitidos, sinLeer: false };
}

// ============================================================
// FIRMAR DOCUMENTOS — trabajadores que entran solo con su RUT
// ------------------------------------------------------------
// Un trabajador no tiene cuenta de Google ni fila en USUARIOS, así que no
// puede pasar por verificarPertenece como los subcontratistas — acá basta
// con que el RUT que escribe exista en TRABAJADORES. No es un login
// realmente seguro (cualquiera que sepa el RUT de alguien podría entrar a
// firmar por esa persona) pero es el mismo nivel de fricción que pedía el
// cliente: sin contraseña, solo el RUT, para que sea rápido de usar en el
// momento (de una Charla, un HCR, una Entrega de EPP, etc.) desde el
// celular de cada uno. Genérico para varios módulos — ver DOCUMENTOS_PENDIENTES
// en APPS_SCRIPT_INIT.js — no solo Charlas.
// ============================================================

function hojaDocumentosPendientes() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DOCUMENTOS_PENDIENTES'); }

// Deja el RUT solo con dígitos y el dígito verificador (sin puntos, guión
// ni espacios) para poder comparar dos RUT escritos de forma distinta.
function normalizarRut(rut) {
  return (rut || '').toString().toUpperCase().replace(/[^0-9K]/g, '');
}

// Hash del PIN (nunca se guarda en texto plano). Se usa el RUT normalizado
// como "sal" — ya está disponible en la misma fila, no hace falta guardar
// una sal aparte, y evita que dos personas con el mismo PIN tengan el
// mismo hash guardado.
function hashPin(pin, salRut) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pin + ':' + salRut);
  return bytes.map(function (b) { return ((b < 0 ? b + 256 : b)).toString(16).padStart(2, '0'); }).join('');
}
function validarFormatoPin(pin) {
  if (!/^[0-9]{4,6}$/.test(pin || '')) throw new Error('El PIN debe tener entre 4 y 6 números');
}

function verificarTrabajadorPorRut(rutEntrada) {
  const rut = normalizarRut(rutEntrada);
  if (!rut) throw new Error('Falta el RUT');
  const datos = hojaTrabajadores().getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if (normalizarRut(fila[2]) === rut) return {
      encontrado: true, nombre: (fila[1] || '').toString(),
      correo: (fila[26] || '').toString(),
      consentimiento: (fila[30] || '') === 'Sí',
      tienePin: !!(fila[32] || '').toString()
    };
  }
  return { encontrado: false };
}

// El trabajador acepta (desde la pantalla de consentimiento previa a ver
// sus documentos pendientes) que su documentación laboral se procese de
// forma electrónica — jurisprudencia DT exige este consentimiento expreso,
// y que quede registrado con fecha (ver Dictamen 0789/15).
function registrarConsentimientoRut(rutEntrada) {
  const rut = normalizarRut(rutEntrada);
  if (!rut) throw new Error('Falta el RUT');
  const sh = hojaTrabajadores();
  const datos = sh.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (normalizarRut(datos[i][2]) === rut) {
      sh.getRange(i + 1, 31).setValue('Sí'); // columna AE
      sh.getRange(i + 1, 32).setValue(new Date().toLocaleString('es-CL')); // columna AF
      return { ok: true };
    }
  }
  throw new Error('No se encontró un trabajador con ese RUT');
}

// Crea el PIN de firma del trabajador — reemplaza el dibujo a mano por un
// PIN de 4-6 dígitos (igual al enfoque de la app de referencia que mandó
// el cliente). Solo se guarda el hash (ver hashPin), nunca el PIN en
// texto plano. Se puede llamar de nuevo para cambiarlo (no hay "ya tiene
// uno, no se puede tocar" — si alguien lo olvida, puede rehacerlo).
function crearPinTrabajador(rutEntrada, pin) {
  const rut = normalizarRut(rutEntrada);
  if (!rut) throw new Error('Falta el RUT');
  validarFormatoPin(pin);
  const sh = hojaTrabajadores();
  const datos = sh.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (normalizarRut(datos[i][2]) === rut) {
      sh.getRange(i + 1, 33).setValue(hashPin(pin, rut)); // columna AG
      return { ok: true };
    }
  }
  throw new Error('No se encontró un trabajador con ese RUT');
}

// Envía por correo el comprobante/documento ya firmado al correo PERSONAL
// del propio trabajador (nunca el institucional — ver Dictamen 0789/15: si
// pierde el acceso corporativo al desvincularse, perdería también sus
// documentos laborales). Se llama justo después de firmar, solo si el
// trabajador tiene correo declarado y dio su consentimiento.
function enviarComprobanteTrabajador(correoTrabajador, nombreArchivo, pdfBase64, asunto, cuerpo) {
  const correo = (correoTrabajador || '').toString().trim();
  if (!correo || !pdfBase64) throw new Error('Falta el correo del trabajador o el PDF');
  const bytes = Utilities.base64Decode(pdfBase64);
  const blob = Utilities.newBlob(bytes, 'application/pdf', nombreArchivo || 'comprobante.pdf');
  MailApp.sendEmail({
    to: correo,
    subject: asunto || 'Comprobante firmado — Constructora LST',
    body: cuerpo || 'Hola,\n\nAdjuntamos tu comprobante firmado.\n\nSaludos,\nConstructora LST',
    attachments: [blob],
  });
  return { enviado: true };
}

// Todos los documentos en curso (de cualquier tipo — Charla, HCR, EPP...)
// donde este RUT figura como pendiente de firmar — de a una fila por
// documento (IdDocumento), aunque haya más de una fila coincidente no
// debería pasar (un trabajador aparece una sola vez por documento).
function misPendientesFirmar(rutEntrada) {
  const rut = normalizarRut(rutEntrada);
  if (!rut) throw new Error('Falta el RUT');
  const datos = hojaDocumentosPendientes().getDataRange().getValues();
  const vistos = {};
  const pendientes = [];
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const firmado = (fila[8] || '').toString().trim().toLowerCase();
    if (normalizarRut(fila[6]) === rut && firmado !== 'sí' && firmado !== 'si') {
      const idDocumento = (fila[0] || '').toString();
      if (vistos[idDocumento]) continue;
      vistos[idDocumento] = true;
      pendientes.push({
        idDocumento: idDocumento, tipo: (fila[1] || '').toString(), obra: (fila[2] || '').toString(),
        fecha: (fila[3] || '').toString(), titulo: (fila[4] || '').toString(), responsable: (fila[5] || '').toString(),
      });
    }
  }
  return { pendientes: pendientes };
}

// Marca esa fila puntual de DOCUMENTOS_PENDIENTES como firmada. Acepta DOS
// formas de firmar, excluyentes:
// - firmaBase64: el dibujo a mano de siempre (dataURL "data:image/...") —
//   se sigue soportando para lo que no pasó a PIN (ver drawSig en app.js).
// - pin: el PIN de 4-6 dígitos del trabajador (reemplaza el dibujo) — se
//   verifica contra el hash guardado en TRABAJADORES (ver crearPinTrabajador)
//   y, si coincide, queda guardado el literal 'PIN' en la celda de Firma
//   en vez de una imagen — los generadores de PDF (ver drawSig en app.js)
//   reconocen ese valor y estampan un sello de texto en su lugar.
// Quien llama (la app) es responsable de revisar después si con esta
// firma ya quedaron todos los trabajadores de ese IdDocumento completos,
// para generar el documento final — este endpoint solo registra UNA
// firma a la vez.
function firmarPendiente(idDocumento, rutEntrada, firmaBase64, pin) {
  const rut = normalizarRut(rutEntrada);
  if (!idDocumento || !rut) throw new Error('Falta el documento o el RUT');
  if (!firmaBase64 && !pin) throw new Error('Falta la firma');

  if (pin) {
    const datosTrab = hojaTrabajadores().getDataRange().getValues();
    let hashGuardado = '';
    for (let i = 1; i < datosTrab.length; i++) {
      if (normalizarRut(datosTrab[i][2]) === rut) { hashGuardado = (datosTrab[i][32] || '').toString(); break; }
    }
    if (!hashGuardado) throw new Error('Todavía no has creado tu PIN');
    if (hashPin(pin, rut) !== hashGuardado) throw new Error('PIN incorrecto');
  }

  const sh = hojaDocumentosPendientes();
  const datos = sh.getDataRange().getValues();
  let filaEncontrada = -1;
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    if ((fila[0] || '').toString() === idDocumento.toString() && normalizarRut(fila[6]) === rut) {
      filaEncontrada = i + 1; // fila real en el Sheet (encabezado = fila 1)
      break;
    }
  }
  if (filaEncontrada === -1) throw new Error('No se encontró una firma pendiente para ese RUT en ese documento');
  const firmadoActual = (sh.getRange(filaEncontrada, 9).getValue() || '').toString().trim().toLowerCase();
  if (firmadoActual === 'sí' || firmadoActual === 'si') throw new Error('Ese documento ya estaba firmado');
  const valorFirma = pin ? 'PIN' : firmaBase64.toString();

  sh.getRange(filaEncontrada, 9, 1, 3).setValues([['Sí', valorFirma, new Date().toLocaleString('es-CL')]]);
  return { ok: true };
}

// ============================================================
// PORTAL DE FISCALIZACIÓN DT (Ordinario 767/2023, Pilar 3)
// ------------------------------------------------------------
// Acceso público (sin cuenta de la app), por RUT de la empresa
// inspeccionada — ver doPost más arriba. Letra (a): consulta directa por
// RUT del empleador. Letra (b): la medida de seguridad acordada con el
// empleador es el rate-limiting de verificarLimiteFiscalizacion, que NUNCA
// bloquea una consulta puntual (solo frena ráfagas tipo scraping) — así no
// se convierte en un "impedimento o restricción" al acceso, que la propia
// Ordinario 767 prohíbe. Letra (c): es el mismo portal, no hay red ni
// computador especial. Letra (d): cada resultado trae el link al PDF ya
// firmado, listo para abrir/imprimir. Letra (e): ver
// ratificarComoFiscalizador más abajo.
// ============================================================
function hojaSubcontratistas() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SUBCONTRATISTAS'); }
function hojaCharlas() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('CHARLAS'); }
function hojaHcr() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('HCR'); }
function hojaEpp() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ENTREGA_EPP'); }
function hojaFiscalizacionAccesos() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('FISCALIZACION_ACCESOS'); }
function hojaFiscalizacionFirmas() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('FISCALIZACION_FIRMAS'); }
function hojaIntegridadDocumentos() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('INTEGRIDAD_DOCUMENTOS'); }
function hojaFiscalizadoresPin() { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('FISCALIZADORES_PIN'); }

// El fiscalizador no tiene ficha previa en la app (es un visitante
// externo) — su PIN se crea solo, la primera vez que lo necesita, en esta
// misma hoja (distinta de TRABAJADORES).
function tienePinFiscalizador(rutEntrada) {
  const rut = normalizarRut(rutEntrada);
  const datos = hojaFiscalizadoresPin().getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (normalizarRut(datos[i][0]) === rut) return true;
  }
  return false;
}
function crearPinFiscalizador(rutEntrada, nombre, pin) {
  const rut = normalizarRut(rutEntrada);
  if (!rut) throw new Error('Falta tu RUT');
  validarFormatoPin(pin);
  if (tienePinFiscalizador(rutEntrada)) throw new Error('Ya existe un PIN para este RUT');
  hojaFiscalizadoresPin().appendRow([rutEntrada, nombre || '', hashPin(pin, rut), new Date().toLocaleString('es-CL')]);
  return { ok: true };
}
function verificarPinFiscalizador(rutEntrada, pin) {
  const rut = normalizarRut(rutEntrada);
  const datos = hojaFiscalizadoresPin().getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (normalizarRut(datos[i][0]) === rut) return hashPin(pin, rut) === (datos[i][2] || '').toString();
  }
  return false;
}

// Mapa Link → Hash SHA-256 (ver registrarIntegridadDocumento en app.js) —
// se arma una sola vez por búsqueda y se cruza con cada documento por su
// link de Drive, que es el identificador único ya disponible en ambos
// lados. Documentos generados antes de este feature no tienen hash
// (quedan con '' — no es un error, simplemente no se calculó entonces).
function hashesPorLink() {
  const sh = hojaIntegridadDocumentos();
  if (!sh) return {};
  const datos = sh.getDataRange().getValues();
  const mapa = {};
  for (let i = 1; i < datos.length; i++) {
    const link = (datos[i][3] || '').toString();
    if (link) mapa[link] = (datos[i][4] || '').toString();
  }
  return mapa;
}

// Como máximo 20 búsquedas por minuto por fiscalizador (identificado por su
// propio RUT) — alcanza de sobra para uso humano normal, pero frena un
// script intentando barrer RUTs de empresa uno por uno.
function verificarLimiteFiscalizacion(rutFiscalizador) {
  const cache = CacheService.getScriptCache();
  const clave = 'fisc_' + rutFiscalizador;
  const actual = Number(cache.get(clave) || '0');
  if (actual >= 20) throw new Error('Demasiadas consultas seguidas — espera un minuto e intenta de nuevo.');
  cache.put(clave, String(actual + 1), 60);
}

function rutsDeTrabajadoresDeEmpresa(empresa) {
  const empresaNorm = normalizarEmpresa(empresa);
  const datos = hojaTrabajadores().getDataRange().getValues();
  const ruts = {};
  for (let i = 1; i < datos.length; i++) {
    if (normalizarEmpresa(datos[i][4]) === empresaNorm) ruts[normalizarRut(datos[i][2])] = true;
  }
  return ruts;
}

// Las Charlas/HCR no tienen una columna RUT por fila (son documentos
// grupales): el RUT de cada asistente queda embebido en el texto
// "Nombre (RUT); Nombre (RUT)" de la columna Asistentes — se extrae con
// esta regex en vez de necesitar una columna aparte.
function extraerRutsDeAsistentes(texto) {
  const ruts = [];
  const re = /\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(texto || ''))) ruts.push(normalizarRut(m[1]));
  return ruts;
}

// Una celda escrita como texto "AAAA-MM-DD" (ej. por hoyISO()) con
// valueInputOption=USER_ENTERED queda guardada por Sheets como una fecha
// de verdad, no como texto — así que getValues() la devuelve acá como un
// objeto Date, no como el string original (mismo fenómeno ya documentado
// para la columna Periodo, ver normalizarPeriodo). Sin esto, el filtro
// por rango de fechas y lo que se le muestra al fiscalizador se rompían en
// silencio apenas una fila tuviera la fecha en formato Date.
function fechaComoTexto(valor) {
  if (valor instanceof Date) return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return (valor || '').toString();
}

function dentroDeRango(fecha, desde, hasta) {
  const f = fechaComoTexto(fecha);
  if (!f) return false;
  if (desde && f < desde) return false;
  if (hasta && f > hasta) return false;
  return true;
}

// Un documento "pertenece" a una empresa si al menos uno de sus firmantes
// trabaja para ella — Charla/HCR/EPP se organizan por Obra (pueden mezclar
// trabajadores de varias empresas en una misma obra), no por empresa.
function buscarEnEpp(rutsEmpresa, desde, hasta) {
  const datos = hojaEpp().getDataRange().getValues();
  const out = [];
  for (let i = 1; i < datos.length; i++) {
    const r = datos[i];
    if (!rutsEmpresa[normalizarRut(r[3])]) continue;
    const fecha = fechaComoTexto(r[1]);
    if (!dentroDeRango(fecha, desde, hasta)) continue;
    out.push({ tipo: 'epp', idDocumento: 'epp:' + (i + 1), titulo: 'Entrega de EPP — ' + (r[2] || ''), fecha: fecha, pdfLink: r[9] || '' });
  }
  return out;
}
function buscarEnCharlas(rutsEmpresa, desde, hasta) {
  const datos = hojaCharlas().getDataRange().getValues();
  const out = [];
  for (let i = 1; i < datos.length; i++) {
    const r = datos[i];
    const ruts = extraerRutsDeAsistentes(r[12]);
    if (!ruts.some(function (x) { return rutsEmpresa[x]; })) continue;
    const fecha = fechaComoTexto(r[5] || r[1]);
    if (!dentroDeRango(fecha, desde, hasta)) continue;
    out.push({ tipo: 'charla', idDocumento: 'charla:' + (i + 1), titulo: 'Charla — ' + (r[2] || ''), fecha: fecha, pdfLink: r[13] || '' });
  }
  return out;
}
function buscarEnHcr(rutsEmpresa, desde, hasta) {
  const datos = hojaHcr().getDataRange().getValues();
  const out = [];
  for (let i = 1; i < datos.length; i++) {
    const r = datos[i];
    const ruts = extraerRutsDeAsistentes(r[18]);
    if (!ruts.some(function (x) { return rutsEmpresa[x]; })) continue;
    const fecha = fechaComoTexto(r[1]);
    if (!dentroDeRango(fecha, desde, hasta)) continue;
    out.push({ tipo: 'hcr', idDocumento: 'hcr:' + (i + 1), titulo: 'HCR — ' + (r[3] || ''), fecha: fecha, pdfLink: r[19] || '' });
  }
  return out;
}

function registrarAccesoFiscalizacion(rutFiscalizador, rutEmpresaConsulta, empresaEncontrada, desde, hasta, cantidadResultados) {
  try {
    hojaFiscalizacionAccesos().appendRow([
      new Date().toLocaleString('es-CL'), rutFiscalizador, rutEmpresaConsulta, empresaEncontrada || '',
      desde || '', hasta || '', cantidadResultados
    ]);
  } catch (e) { /* nunca debe tumbar la búsqueda si el registro de auditoría falla */ }
}

function buscarDocumentosFiscalizacion(rutFiscalizadorEntrada, rutEmpresaEntrada, fechaDesde, fechaHasta) {
  const rutFisc = normalizarRut(rutFiscalizadorEntrada);
  const rutEmp = normalizarRut(rutEmpresaEntrada);
  if (!rutFisc) throw new Error('Falta tu RUT');
  if (!rutEmp) throw new Error('Falta el RUT de la empresa a consultar');
  verificarLimiteFiscalizacion(rutFisc);

  let empresaEncontrada = '';
  if (EMPRESA_PRINCIPAL_RUT && normalizarRut(EMPRESA_PRINCIPAL_RUT) === rutEmp) {
    empresaEncontrada = EMPRESA_PRINCIPAL_NOMBRE;
  } else {
    const datosSub = hojaSubcontratistas().getDataRange().getValues();
    for (let i = 1; i < datosSub.length; i++) {
      if (normalizarRut(datosSub[i][2]) === rutEmp) { empresaEncontrada = (datosSub[i][0] || '').toString(); break; }
    }
  }

  let documentos = [];
  if (empresaEncontrada) {
    const rutsEmpresa = rutsDeTrabajadoresDeEmpresa(empresaEncontrada);
    documentos = buscarEnEpp(rutsEmpresa, fechaDesde, fechaHasta)
      .concat(buscarEnCharlas(rutsEmpresa, fechaDesde, fechaHasta))
      .concat(buscarEnHcr(rutsEmpresa, fechaDesde, fechaHasta))
      .sort(function (a, b) { return b.fecha < a.fecha ? -1 : 1; });
    const hashes = hashesPorLink();
    documentos.forEach(function (d) { d.hash = (d.pdfLink && hashes[d.pdfLink]) || ''; });
  }

  registrarAccesoFiscalizacion(rutFiscalizadorEntrada, rutEmpresaEntrada, empresaEncontrada, fechaDesde, fechaHasta, documentos.length);
  return { empresaEncontrada: empresaEncontrada, documentos: documentos, tienePin: tienePinFiscalizador(rutFiscalizadorEntrada) };
}

// Letra (e) del Ordinario 767: el fiscalizador ratifica lo revisado con su
// propia firma electrónica, identificándose solo con su propio RUT (no
// necesita clave del empleador ni cuenta en la app) — ahora vía PIN en vez
// de dibujo, verificado contra el PIN que creó en FISCALIZADORES_PIN.
function ratificarComoFiscalizador(rutFiscalizadorEntrada, nombreFiscalizador, tipoDocumento, idDocumento, tituloDocumento, pin) {
  const rutFisc = normalizarRut(rutFiscalizadorEntrada);
  if (!rutFisc) throw new Error('Falta tu RUT');
  if (!pin) throw new Error('Falta tu PIN');
  if (!idDocumento) throw new Error('Falta el documento a ratificar');
  if (!verificarPinFiscalizador(rutFiscalizadorEntrada, pin)) throw new Error('PIN incorrecto');
  hojaFiscalizacionFirmas().appendRow([
    new Date().toLocaleString('es-CL'), rutFiscalizadorEntrada, nombreFiscalizador || '',
    tipoDocumento || '', idDocumento, tituloDocumento || '', 'PIN'
  ]);
  return { ok: true };
}

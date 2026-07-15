// ============================================================
// INICIALIZADOR — Prevención de Riesgos LST
// ------------------------------------------------------------
// QUÉ HACE: crea (si no existen) todas las pestañas que la app
// necesita, con sus encabezados correctos, dentro del Sheet NUEVO.
//
// CÓMO USARLO:
// 1. Ve a tu Sheet nuevo → Extensiones → Apps Script
// 2. Borra todo el contenido y pega este archivo completo
// 3. Guarda (ícono de disquete)
// 4. En el menú de funciones (arriba, al lado de "Depurar") elige
//    "inicializarPlanilla" y presiona ▶ Ejecutar
// 5. La primera vez te pedirá autorización — acéptala (es tu propia
//    cuenta actuando sobre tu propio Sheet)
// 6. Revisa el Sheet: deberían aparecer todas las pestañas con
//    encabezados en negrita en la fila 1
// ============================================================

function inicializarPlanilla() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  crearHoja(ss, 'TRABAJADORES', [
    'N°', 'Nombre', 'RUT', 'Cargo', 'Empresa/Contratista', 'Fecha Ingreso', 'Estado', 'Foto', 'Fecha Registro',
    'Obra', 'Fecha Inicio Contrato', 'Fecha Término Contrato', 'Archivo Contrato',
    'Fecha Vigencia Examen Altura', 'Archivo Examen Altura'
  ]);

  crearHoja(ss, 'INSPECCIONES', [
    'N°', 'Fecha', 'Tipo Inspección', 'Área/Lugar', 'Inspector', 'Tema/Categoría',
    'Hallazgos', 'Nivel Riesgo', 'Foto', 'Acción Correctiva', 'Estado', 'Fecha Registro', 'Obra'
  ]);

  crearHoja(ss, 'CHARLAS', [
    'N°', 'Fecha Generada', 'Tema', 'Origen', 'Estado', 'Fecha Realizada', 'Responsable'
  ]);

  crearHoja(ss, 'INCIDENTES', [
    'N°', 'Fecha', 'Tipo', 'Trabajador Involucrado', 'Área', 'Descripción', 'Causas',
    'Gravedad', 'Foto', 'Acciones Correctivas', 'Estado', 'Fecha Registro', 'Reportado Por',
    'Respaldo Cierre', 'Obra', 'Días Perdidos'
  ]);

  crearHoja(ss, 'PROCEDIMIENTOS', [
    'N°', 'Código', 'Nombre PTS', 'Área/Actividad', 'Versión', 'Fecha Emisión', 'Archivo', 'Estado', 'Fecha Registro'
  ]);

  crearHoja(ss, 'ENTREGA_EPP', [
    'N°', 'Fecha', 'Trabajador', 'RUT', 'EPP Entregado', 'Cantidad', 'Firma', 'Responsable Entrega', 'Fecha Registro'
  ]);

  crearHoja(ss, 'USUARIOS', [
    'Email', 'Rol', 'Nombre'
  ]);

  // Elimina la hoja "Hoja 1" / "Sheet1" default si quedó vacía
  const porDefecto = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (porDefecto && porDefecto.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(porDefecto);
  }

  SpreadsheetApp.getUi().alert('Listo ✅ Todas las pestañas fueron creadas con sus encabezados.');
}

function crearHoja(ss, nombre, encabezados) {
  let sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  const rango = sh.getRange(1, 1, 1, encabezados.length);
  rango.setValues([encabezados]);
  rango.setFontWeight('bold').setBackground('#1f6b39').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.autoResizeColumns(1, encabezados.length);
}

// ------------------------------------------------------------
// OPCIONAL: agrégate a ti mismo como admin en la hoja USUARIOS
// para poder usar la app apenas la despliegues. Cambia el correo
// de abajo por el que vas a usar para entrar a la app y ejecuta
// esta función una vez (menú de funciones → agregarmeComoAdmin).
// ------------------------------------------------------------
function agregarmeComoAdmin() {
  const MI_CORREO = 'PON_AQUI_TU_CORREO@gmail.com'; // ← cámbialo
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('USUARIOS');
  sh.appendRow([MI_CORREO.toLowerCase(), 'admin', '']);
  SpreadsheetApp.getUi().alert('Agregado como admin: ' + MI_CORREO);
}

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
    'Fecha Vigencia Examen Altura', 'Archivo Examen Altura', 'Es Supervisor',
    'Fecha Nacimiento', 'Sexo', 'Nacionalidad', 'Dirección', 'Comuna', 'Teléfono',
    'Pueblo Originario', 'Tipo Contrato', 'Tipo Ingreso', 'Categoría Ocupacional'
  ]);

  crearHoja(ss, 'INSPECCIONES', [
    'N°', 'Fecha', 'Tipo Inspección', 'Área/Lugar', 'Inspector', 'Tema/Categoría',
    'Hallazgos', 'Nivel Riesgo', 'Foto', 'Acción Correctiva', 'Estado', 'Fecha Registro', 'Obra'
  ]);

  crearHoja(ss, 'CHARLAS', [
    'N°', 'Fecha Generada', 'Tema', 'Origen', 'Estado', 'Fecha Realizada', 'Responsable',
    'Relator', 'Obra', 'Hora', 'Riesgos', 'Medidas de Control', 'Asistentes', 'PDF'
  ]);

  crearHoja(ss, 'INCIDENTES', [
    'N°', 'Fecha', 'Tipo', 'Trabajador Involucrado', 'Área', 'Descripción', 'Causas',
    'Gravedad', 'Foto', 'Acciones Correctivas', 'Estado', 'Fecha Registro', 'Reportado Por',
    'Respaldo Cierre', 'Obra', 'Días Perdidos',
    'Investigación Estado', 'Investigación Responsable', 'Investigación Fecha', 'Investigación PDF',
    'Atención Médica Estado', 'Atención Médica PDF'
  ]);

  crearHoja(ss, 'INVESTIGACIONES', [
    'N°', 'Fecha', 'Incidente (fila)', 'Empresa Mandante', 'Empresa Contratista', 'Área',
    'Asesor Prevención', 'Jefatura Departamento', 'Fecha Siniestro', 'Hora Siniestro', 'Lugar',
    'Jefatura Directa', 'Supervisor Directo', 'Tipo Siniestro', 'Empresa Afectada', 'Daños',
    'Daños Otro', 'Potencial', 'Trabajador Nombre', 'Trabajador Rut', 'Trabajador Cargo',
    'Trabajador Antigüedad Cargo', 'Trabajador Antigüedad Empresa', 'Trabajador Horas Turno',
    'Trabajador Estado', 'Trabajador Observación', 'Testigo Nombre', 'Testigo Rut', 'Testigo Cargo',
    'Testigo Tiempo Cargo', 'Testigo Actividad', 'Testigo Observación', 'Descripción del Evento',
    'Localización', 'Tipo de Incidente', 'Tipo de Incidente Otro', 'Causas Inmediatas',
    'Causas Inmediatas Otro', 'Causas Básicas', 'Medidas de Control', 'Observaciones',
    'Investigador Nombre y Rut', 'Investigador Cargo', 'PDF', 'Registrado Por', 'Fecha Registro'
  ]);

  crearHoja(ss, 'HCR', [
    'N°', 'Fecha', 'Obra', 'Actividad', 'Área(s)', 'HH Capacitación',
    'Peligros', 'Peligros Salud', 'Riesgos Seguridad', 'Riesgos Materiales', 'Riesgos Salud',
    'EPP y Medios de Apoyo', 'Verificación Comunicación', 'Registros Adicionales',
    'Tareas / Riesgos / Medidas', 'Supervisor', '(reservado)', '(reservado)',
    'Asistentes', 'PDF', 'Registrado Por', 'Fecha Registro'
  ]);

  crearHoja(ss, 'DIAT', [
    'N°', 'Fecha', 'Incidente (fila)', 'Empleador Nombre', 'Empleador Rut', 'Empleador Dirección',
    'Empleador Comuna', 'Empleador Teléfono', 'N Trabajadores Hombres', 'N Trabajadores Mujeres',
    'Propiedad Empresa', 'Tipo Empresa', 'Actividad Económica', 'Actividad Económica Empresa Principal',
    'Trabajador Nombre', 'Trabajador Run', 'Trabajador Dirección', 'Trabajador Comuna', 'Trabajador Teléfono',
    'Sexo', 'Edad', 'Fecha Nacimiento', 'Pueblo Originario', 'Nacionalidad', 'Profesión u Oficio',
    'Antigüedad Valor', 'Antigüedad Unidad', 'Tipo Contrato', 'Tipo Ingreso', 'Categoría Ocupacional',
    'Fecha Accidente', 'Hora Accidente', 'Hora Ingreso Trabajo', 'Hora Salida Trabajo',
    'Dirección Accidente', 'Comuna Accidente', 'Qué Hacía el Trabajador', 'Lugar Accidente',
    'Descripción Accidente', 'Trabajo Habitual', 'Desarrollaba Trabajo Habitual', 'Clasificación Accidente',
    'Tipo Accidente', 'Tipo Accidente Trayecto', 'Medio de Prueba', 'Detalle Medio de Prueba',
    'Denunciante Nombre', 'Denunciante Run', 'Denunciante Teléfono', 'Clasificación Denunciante',
    'PDF', 'Registrado Por', 'Fecha Registro'
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

  crearHoja(ss, 'PLANTILLAS_CHARLA', [
    'N°', 'Código', 'Nombre', 'Versión', 'Fecha Emisión', 'Riesgos', 'Medidas de Control',
    'Archivo', 'Archivo ID', 'Tipo Archivo', 'Fecha Registro', 'Registrado Por'
  ]);

  // Elimina la hoja "Hoja 1" / "Sheet1" default si quedó vacía
  const porDefecto = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (porDefecto && porDefecto.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(porDefecto);
  }

  // El popup de confirmación puede fallar según cómo se abrió el editor de
  // Apps Script (no siempre hay UI disponible) — no debe hacer fallar el
  // resto del script, que para entonces ya terminó de crear/actualizar
  // todas las pestañas.
  try { SpreadsheetApp.getUi().alert('Listo ✅ Todas las pestañas fueron creadas con sus encabezados.'); }
  catch (e) { Logger.log('Listo ✅ Todas las pestañas fueron creadas con sus encabezados.'); }
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
  try { SpreadsheetApp.getUi().alert('Agregado como admin: ' + MI_CORREO); }
  catch (e) { Logger.log('Agregado como admin: ' + MI_CORREO); }
}

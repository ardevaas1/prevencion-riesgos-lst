// ============================================
// CONFIGURACIÓN — Prevención de Riesgos LST
// ============================================
// Rellena estos valores siguiendo la guía "INSTRUCCIONES_SETUP.md"
const CONFIG = {
  // API Key de Google Cloud (solo lectura pública) — puedes reutilizar
  // la misma que ya tienes, o crear una nueva.
  API_KEY:    'PEGA_AQUI_TU_API_KEY',

  // Client ID de OAuth 2.0 (tipo "Aplicación web") — puedes reutilizar
  // el mismo que ya tienes en el proyecto de Flota, o crear uno nuevo.
  CLIENT_ID:  'PEGA_AQUI_TU_CLIENT_ID.apps.googleusercontent.com',

  // ID de la planilla NUEVA de Google Sheets (Prevención de Riesgos)
  // Se obtiene de la URL: https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
  SHEET_ID:   'PEGA_AQUI_EL_ID_DEL_SHEET_NUEVO',

  // Nombres de las pestañas dentro del Sheet (no cambiar salvo que
  // también cambies APPS_SCRIPT_INIT.js)
  SHEET_TRABAJADORES:  'TRABAJADORES',
  SHEET_INSPECCIONES:  'INSPECCIONES',
  SHEET_CHARLAS:       'CHARLAS',
  SHEET_INCIDENTES:    'INCIDENTES',
  SHEET_PROCEDIMIENTOS:'PROCEDIMIENTOS',
  SHEET_EPP:           'ENTREGA_EPP',
  SHEET_USUARIOS:      'USUARIOS',

  // ID de la carpeta RAÍZ en Google Drive donde se guardarán todas las
  // fotos, firmas y documentos (PROPIEDAD del correo dueño de la app).
  // Se obtiene de la URL de la carpeta en Drive.
  DRIVE_ROOT_FOLDER: 'PEGA_AQUI_EL_ID_DE_LA_CARPETA_DRIVE',

  // Scopes necesarios para leer/escribir Sheets y subir archivos a Drive
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
};

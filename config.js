// ============================================
// CONFIGURACIÓN — Prevención de Riesgos LST
// ============================================
const CONFIG = {
  // API Key de Google Cloud (reutilizada del proyecto de Flota)
  API_KEY:    'AIzaSyBrl65H73GABw9rjO3Q2y_LOkJrjqotI5g',

  // Client ID de OAuth 2.0 (reutilizado del proyecto de Flota)
  CLIENT_ID:  '78544254698-m4a6olivjpgg12fl0m8uh1bhhf0ku0le.apps.googleusercontent.com',

  // ID de la planilla NUEVA de Google Sheets (Prevención de Riesgos)
  SHEET_ID:   '1HzECKZTMU59zAr7k_c9-vPv_8qvqBU1uVvI3aNpedpc',

  // Nombres de las pestañas dentro del Sheet
  SHEET_TRABAJADORES:  'TRABAJADORES',
  SHEET_INSPECCIONES:  'INSPECCIONES',
  SHEET_CHARLAS:       'CHARLAS',
  SHEET_INCIDENTES:    'INCIDENTES',
  SHEET_PROCEDIMIENTOS:'PROCEDIMIENTOS',
  SHEET_EPP:           'ENTREGA_EPP',
  SHEET_USUARIOS:      'USUARIOS',

  // ID de la carpeta RAÍZ en Google Drive (fotos, firmas y documentos)
  DRIVE_ROOT_FOLDER: '1evnqIfGtNCO_hQq9rwgBWMZgk647zMIe',

  // Scopes necesarios para leer/escribir Sheets y subir archivos a Drive
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
};

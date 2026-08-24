// ============================================================
// WEB APP — Sugerencias con IA para la Matriz de Riesgos (MIPER)
// ------------------------------------------------------------
// QUÉ HACE: el supervisor completa a mano Proceso/Puesto de Trabajo/Tarea
// (Levantamiento) y Equipos (al agregar una fila de la matriz) — eso NO lo
// toca este script. Con esos 4 datos como contexto, este endpoint le pide a
// Gemini (la IA de Google, tier gratis) que elija del CATÁLOGO DE RIESGOS
// YA VIGENTE (el mismo que usa el resto de la app — no inventa riesgos
// nuevos) cuáles aplican a esa tarea puntual, con una Probabilidad y
// Consecuencia sugeridas. La app prellena el formulario con esas
// sugerencias — el supervisor las revisa, ajusta o borra las que no
// correspondan, y recién ahí guarda. Nada se guarda automáticamente: es un
// prellenado, no un autoguardado.
//
// COSTO: $0. Se usa el tier gratis de la API de Gemini (modelo
// gemini-3.5-flash-lite), que alcanza de sobra para este uso (cada
// sugerencia es una llamada puntual al armar una fila del MIPER, no algo
// de alto volumen). Ojo: en el tier gratis, Google puede usar los datos
// enviados (proceso/puesto/tarea/equipos — descripciones de tareas de
// obra, no datos personales) para mejorar sus modelos. Si eso no te
// acomoda, revisa el tier pagado de Gemini o no uses esta función.
//
// CÓMO DESPLEGARLO:
// 1. Consigue una API key gratis en https://aistudio.google.com/apikey
//    (con tu cuenta de Google, sin tarjeta de crédito).
// 2. Ve a tu Sheet → Extensiones → Apps Script (puede ser el MISMO proyecto
//    donde ya pegaste APPS_SCRIPT_INIT.js, en un archivo nuevo).
// 3. Crea un archivo nuevo (ícono "+" al lado de "Archivos") y pega este
//    código completo ahí.
// 4. Ve a "Configuración del proyecto" (ícono de tuerca, panel izquierdo) →
//    "Propiedades de secuencia de comandos" → "Añadir propiedad de
//    secuencia de comandos". Propiedad: GEMINI_API_KEY — Valor: tu API key
//    (así queda guardada del lado del servidor, nunca expuesta en el
//    navegador).
// 5. Arriba a la derecha, botón "Implementar" → "Nueva implementación".
//    - Tipo: "Aplicación web".
//    - Ejecutar como: "Yo" (tu cuenta).
//    - Quién tiene acceso: "Cualquier usuario".
// 6. Implementar. La primera vez te va a pedir autorizar el script.
// 7. Copia la URL que te da (termina en "/exec") y pégala en config.js, en
//    MIPER_IA_WEBAPP_URL. Si lo dejas vacío, el botón "Sugerencia
//    automática" simplemente no aparece — el resto de la app sigue
//    funcionando igual.
// 8. Ojo: cada vez que cambies este código hay que crear una NUEVA VERSIÓN
//    de la implementación (Implementar → Gestionar implementaciones →
//    ✏️ → "Nueva versión") para que los cambios se apliquen.
// ============================================================

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return respuesta({ error: 'Cuerpo de la petición inválido' }); }

  try {
    if (body.accion === 'sugerirRiesgos') return respuesta(sugerirRiesgos(body));
    return respuesta({ error: 'Acción desconocida: ' + body.accion });
  } catch (err) {
    return respuesta({ error: String(err.message || err) });
  }
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sugerirRiesgos(body) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('Falta configurar GEMINI_API_KEY en las propiedades del script');

  const proceso = (body.proceso || '').toString().trim();
  const puesto = (body.puesto || '').toString().trim();
  const tarea = (body.tarea || '').toString().trim();
  const equipos = (body.equipos || '').toString().trim();
  const catalogo = Array.isArray(body.catalogo) ? body.catalogo : [];
  if (!tarea) throw new Error('Falta la tarea');
  if (catalogo.length === 0) throw new Error('Falta el catálogo de riesgos');

  // Solo mandamos código+riesgo+familia+definición a la IA (sin las
  // medidas preventivas, que pueden ser varios párrafos por riesgo) para
  // no inflar el prompt — la app ya resuelve las medidas por código
  // cuando arma la fila final, no hace falta que la IA las repita.
  const catalogoCompacto = catalogo.map(r => ({
    codigo: r.codigo, riesgo: r.riesgo, familia: r.familia, definicion: r.definicion,
  }));

  const systemPrompt = `Eres un experto en prevención de riesgos laborales chileno, ayudando a completar una Matriz de Identificación de Peligros y Evaluación de Riesgos (MIPER) según el DS44.
Se te da el contexto de una tarea real de una obra de construcción y un catálogo de riesgos YA VIGENTE (con su código). Tu trabajo es elegir del catálogo los riesgos que realmente aplican a esa tarea puntual — normalmente entre 2 y 6, los más relevantes y probables, no todos los que remotamente podrían aplicar — y para cada uno describir el PELIGRO concreto (la situación/acto específico de ESTA tarea que puede causar ese riesgo, no una definición genérica) y estimar Probabilidad (1=Baja, 2=Media, 4=Alta) y Consecuencia (1=Ligeramente Dañino, 2=Dañino, 4=Extremadamente Dañino) según la realidad de una obra de construcción chilena.
Responde EXCLUSIVAMENTE con un array JSON válido, sin texto antes ni después, con este formato exacto:
[{"codigo":"A1","peligro":"texto concreto del peligro","probabilidad":2,"consecuencia":2}]
El "codigo" DEBE ser uno de los códigos del catálogo que se te da — nunca inventes un código que no esté en la lista.`;

  const userPrompt = `Proceso: ${proceso}\nPuesto de trabajo: ${puesto}\nTarea: ${tarea}\nEquipos, máquinas y herramientas: ${equipos}\n\nCatálogo de riesgos disponible:\n${JSON.stringify(catalogoCompacto)}`;

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-goog-api-key': apiKey },
    payload: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
    muteHttpExceptions: true,
  });

  const status = res.getResponseCode();
  const data = JSON.parse(res.getContentText());
  if (status !== 200) throw new Error('Error de la API de Gemini: ' + (data.error && data.error.message || res.getContentText()));

  const candidato = data.candidates && data.candidates[0];
  const textoRespuesta = (candidato && candidato.content && candidato.content.parts && candidato.content.parts[0] && candidato.content.parts[0].text) || '';
  let sugerencias;
  try {
    // Por si la IA igual agrega texto alrededor pese a responseMimeType, se
    // recorta al primer '[' y último ']' antes de parsear.
    const ini = textoRespuesta.indexOf('[');
    const fin = textoRespuesta.lastIndexOf(']');
    sugerencias = JSON.parse(textoRespuesta.slice(ini, fin + 1));
  } catch (err) {
    throw new Error('La IA no devolvió un JSON válido: ' + textoRespuesta.slice(0, 200));
  }

  // Filtra cualquier sugerencia con un código que no esté realmente en el
  // catálogo (por si la IA se equivocó pese a la instrucción) — mejor
  // menos sugerencias que una fila con un código inexistente.
  const codigosValidos = new Set(catalogo.map(r => r.codigo));
  sugerencias = sugerencias.filter(s => s && codigosValidos.has(s.codigo));

  return { sugerencias: sugerencias };
}

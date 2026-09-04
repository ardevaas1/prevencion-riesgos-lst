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
// Frecuencia esperada de cada actividad del Programa Personalizado — define
// cuántas veces al mes debería marcarse (ver ocurrenciasEsperadas).
const PROGRAMA_FRECUENCIAS = ['Diaria', 'Semanal', 'Quincenal', 'Mensual'];
// Charlas ya escritas por el cliente (formato oficial "CHARLA DE SEGURIDAD",
// distinto del genérico charla_5min.pdf usado en "Escribir desde cero") —
// empaquetadas como archivos del proyecto en vez de subirse desde la app:
// el cliente decidió mandarlas directamente y que esta lista se actualice
// acá cada vez, en vez de dejar que cualquiera suba charlas nuevas desde el
// celular. Para agregar una nueva: copiar el PDF a plantillas/charlas/ y
// agregar su fila acá (y a la lista de cacheo de sw.js).
const CHARLAS_BIBLIOTECA = [
  { codigo: 'SGSST-RG-001', nombre: 'Maquinaria Pesada', archivo: 'plantillas/charlas/SGSST-RG-001_Maquinaria_Pesada.pdf' },
  { codigo: 'SGSST-RG-002', nombre: 'Pausas Activas', archivo: 'plantillas/charlas/SGSST-RG-002_Pausas_Activas.pdf' },
  { codigo: 'SGSST-RG-003', nombre: 'Trabajo en Equipo', archivo: 'plantillas/charlas/SGSST-RG-003_Trabajo_en_Equipo.pdf' },
  { codigo: 'SGSST-RG-004', nombre: 'Actos Inseguros', archivo: 'plantillas/charlas/SGSST-RG-004_Actos_Inseguros.pdf' },
  { codigo: 'SGSST-RG-005', nombre: 'Alcohol y Drogas', archivo: 'plantillas/charlas/SGSST-RG-005_Alcohol_y_Drogas.pdf' },
  { codigo: 'SGSST-RG-006', nombre: 'Uso de los EPP', archivo: 'plantillas/charlas/SGSST-RG-006_Uso_de_los_EPP.pdf' },
  { codigo: 'SGSST-RG-007', nombre: 'Herramientas y Partes en Movimiento', archivo: 'plantillas/charlas/SGSST-RG-007_Herramientas_y_Partes_en_Movimiento.pdf' },
  { codigo: 'SGSST-RG-008', nombre: 'Manejo Manual de Carga', archivo: 'plantillas/charlas/SGSST-RG-008_Manejo_Manual_de_Carga.pdf' },
  { codigo: 'SGSST-RG-009', nombre: 'Protección Respiratoria', archivo: 'plantillas/charlas/SGSST-RG-009_Proteccion_Respiratoria.pdf' },
  { codigo: 'SGSST-RG-010', nombre: 'Radiación UV', archivo: 'plantillas/charlas/SGSST-RG-010_Radiacion_UV.pdf' },
  { codigo: 'SGSST-RG-011', nombre: 'Ruido', archivo: 'plantillas/charlas/SGSST-RG-011_Ruido.pdf' },
  { codigo: 'SGSST-RG-012', nombre: 'Sílice', archivo: 'plantillas/charlas/SGSST-RG-012_Silice.pdf' },
  { codigo: 'SGSST-RG-013', nombre: 'Accidente de Trayecto', archivo: 'plantillas/charlas/SGSST-RG-013_Accidente_de_Trayecto.pdf' },
  { codigo: 'SGSST-RG-014', nombre: 'Arnés de Seguridad', archivo: 'plantillas/charlas/SGSST-RG-014_Arnes_de_Seguridad.pdf' },
  { codigo: 'SGSST-RG-015', nombre: 'Calzado de Seguridad', archivo: 'plantillas/charlas/SGSST-RG-015_Calzado_de_Seguridad.pdf' },
  { codigo: 'SGSST-RG-016', nombre: 'Extintor', archivo: 'plantillas/charlas/SGSST-RG-016_Extintor.pdf' },
  { codigo: 'SGSST-RG-017', nombre: 'Incidente', archivo: 'plantillas/charlas/SGSST-RG-017_Incidente.pdf' },
  { codigo: 'SGSST-RG-018', nombre: 'Orden y Aseo', archivo: 'plantillas/charlas/SGSST-RG-018_Orden_y_Aseo.pdf' },
  { codigo: 'SGSST-RG-019', nombre: 'Músculos de Espalda y Huesos', archivo: 'plantillas/charlas/SGSST-RG-019_Musculos_de_Espalda_y_Huesos.pdf' },
  { codigo: 'SGSST-RG-020', nombre: 'Prevención de Caídas', archivo: 'plantillas/charlas/SGSST-RG-020_Prevencion_de_Caidas.pdf' },
];
// Formatos/programas personalizados de LST (formularios en blanco: pautas de
// inspección, autorizaciones, registro de asistencia, etc.) que el cliente
// quiere disponibles para que cualquier subcontratista los pueda descargar
// — mismo patrón que CHARLAS_BIBLIOTECA: catálogo estático empaquetado en el
// repo (plantillas/programas/), sin pasar por Sheets/Drive. Para agregar uno
// nuevo: copiar el PDF a esa carpeta, agregar su fila acá y a la lista de
// cacheo de sw.js.
// "tipo" liga cada formato a su motor de llenado digital (ver
// formatoDeActividad/abrirLlenarFormatoPrograma):
//  - 'checklist_generico': tabla fija de ítems SI/NO/N/A + firmas — un solo
//    motor (generarPdfChecklistGenerico + CHECKLIST_GENERICO_CONFIG) sirve
//    para los 4 formatos que comparten esa estructura.
//  - 'cubierto_charla'/'cubierto_hcr': el documento real ya lo generan los
//    módulos Charlas ("Escribir desde cero") y HCR — no se duplica un motor
//    nuevo, "hacer" esta actividad manda directo a esos módulos.
//  - sin tipo (o tipo aún no implementado): la actividad sigue con el
//    marcado manual de días de siempre (checkbox simple, sin PDF).
const PROGRAMAS_PERSONALIZADOS = [
  { codigo: 'SGSST-PER-001', nombre: 'Inspección - Observación', archivo: 'plantillas/programas/SGSST-PER-001_Inspeccion_Observacion.pdf', tipo: 'inspeccion_observacion' },
  { codigo: 'SGSST-PER-002', nombre: 'Check List Orden y Aseo', archivo: 'plantillas/programas/SGSST-PER-002_Check_List_Orden_y_Aseo.pdf', tipo: 'checklist_mensual' },
  { codigo: 'SGSST-PER-003', nombre: 'Observación de Conducta', archivo: 'plantillas/programas/SGSST-PER-003_Observacion_de_Conducta.pdf', tipo: 'observacion_conducta' },
  { codigo: 'SGSST-PER-004', nombre: 'Inspección de Seguridad — Andamios', archivo: 'plantillas/programas/SGSST-PER-004_Inspeccion_Seguridad_Andamios.pdf', tipo: 'checklist_generico' },
  { codigo: 'SGSST-PER-005', nombre: 'Inspección de EPP', archivo: 'plantillas/programas/SGSST-PER-005_Inspeccion_de_EPP.pdf', tipo: 'inspeccion_epp' },
  { codigo: 'SGSST-PER-006', nombre: 'Autorización de Trabajos en Altura', archivo: 'plantillas/programas/SGSST-PER-006_Autorizacion_Trabajos_en_Altura.pdf', tipo: 'autorizacion_altura' },
  { codigo: 'SGSST-PER-007', nombre: 'Inspección de Elementos de Izaje', archivo: 'plantillas/programas/SGSST-PER-007_Inspeccion_Elementos_de_Izaje.pdf', tipo: 'checklist_generico' },
  { codigo: 'SGSST-PER-008', nombre: 'Inspección de Seguridad — Excavación', archivo: 'plantillas/programas/SGSST-PER-008_Inspeccion_Seguridad_Excavacion.pdf', tipo: 'checklist_generico' },
  { codigo: 'SGSST-PER-009', nombre: 'Inspección de Seguridad — Esmeril Angular', archivo: 'plantillas/programas/SGSST-PER-009_Inspeccion_Seguridad_Esmeril_Angular.pdf', tipo: 'checklist_generico' },
  { codigo: 'SGSST-PER-010', nombre: 'Charla de Seguridad', archivo: 'plantillas/programas/SGSST-PER-010_Charla_de_Seguridad.pdf', tipo: 'cubierto_charla' },
  { codigo: 'SGSST-PER-011', nombre: 'Hoja de Control de Riesgos (HCR)', archivo: 'plantillas/programas/SGSST-PER-011_Hoja_de_Control_de_Riesgos_HCR.pdf', tipo: 'cubierto_hcr' },
];

// ── Matriz IPER (DS44) ──────────────────────────────────────
// Catálogo fijo de riesgos (Anexos 2 a 5 del Excel original: Seguridad,
// Higiene, Músculo-Esquelético, Psicosocial) — 23 riesgos con su definición,
// código y medidas preventivas ya redactadas. Los riesgos que un supervisor
// agregue a mano en la Matriz que NO estén acá se guardan en la hoja
// MIPER_RIESGOS_CUSTOM y se suman a esta lista en memoria al cargar datos
// (ver cargarTodo → allMiperRiesgosCustom / miperCatalogoCompleto()).
const MIPER_CATALOGO_RIESGOS = [
  { familia: "SEGURIDAD", riesgo: "Caída al mismo nivel", definicion: "Caída que se produce en el mismo plano de sustentación, por ejemplo: caídas en lugares de tránsito o superficies de trabajo, caídas sobre o contra objetos", codigo: "A1", medidas: ["Transitar por áreas habilitadas, despejadas y libres de obstáculos", "Mantener el área de trabajo limpia y ordenada", "No transitar con las manos en los bolsillos", "No correr por las áreas de tránsito", "No utilizar ropa o cordones sueltos o sin abrochar", "No dejar cables a nivel de piso, manténgalos en forma aérea o señalizados", "Transitar por lugares iluminados natural o artificialmente", "No utilizar elementos distractores como teléfono celular", "No transitar con la vista bloqueada u obstruida", "No pisar o caminar retrocediendo, sin antes observar el área de transito"] },
  { familia: "SEGURIDAD", riesgo: "Caida a distinto nivel", definicion: "Caída a un plano inferior de sustentación desde una altura no superior a 1,8 m, (incluye caídas en profundidades no mayores a 1,8 m. en excavaciones, agujeros, zanjas, etc.).", codigo: "A2", medidas: ["Chequee el buen estado de la silla y mobiliario", "Al subir o bajar de equipos, utilice 3 puntos de apoyo", "Al subir o bajar por escala portatil, utilice 3 puntos de apoyo", "Utilizar pasamanos al transitar por escaleras", "No sentarse en vanos de ventanas o pasamanos de escaleras, o lugares que puedan generar una caída", "Mantener vanos o aberturas cerradas, segregadas y señalizadas", "No retire barandas, diagonales, tapas o elementos dispuestos para proteger desniveles o vanos", "No saltar excavaciones, vanos o aberturas", "Utilice plataformas autorizadas y en buen estado, no improvise con el objetivo de ahorrar tiempo"] },
  { familia: "SEGURIDAD", riesgo: "Caida desde altura fisica", definicion: "Caída a un plano inferior de sustentación, desde una altura superior a 1,8 m. Caídas desde alturas (incluye caídas en profundidades mayores a 1,8 m).", codigo: "A3", medidas: ["Mantener examen de altura fisica vigente", "Todo trabajador que realice trabajos sobre el 1.8 mt. deberá estar capacitado y autorizado por el supervisor", "Uso obligatorio de arnés de seguridad, caboS de vida (doble cola), casco y barbiquejo", "Anclar mosqueton a punto de anclaje estructural", "No utilizar telefono celular al transitar sobre plataformas en altura fisica", "No improvise plataformas de trabajo para alcanzar mayor altura", "No retire barandas, diagonales, tapas o elementos dispuestos para proteger desniveles o vanos.", "Mantenga siempre las excavaciones, cámaras o zanjas señalizadas y protegidas perimetralmente con barreras fisicas", "No salte excavaciones o zanjas de un lado a otro, privilegie transitar por sectores habilitados.", "Los cabos de vida deberán tener un mosquetón con doble seguro tipo gancho escala, queda prohibido ahorcar el cabo de vida.", "Si sufre de vértigo o está en tratamiento psiquiátrico, o psicológico no realice trabajos en altura física.", "No utilice equipos de altura que hayan sufrido una caída. Se deben dar de baja por la empresa", "Las líneas horizontales se afianzaran con 3 prensas o candados Crosby en cada extremo a bastón metálico, cáncamo o punto de anclaje estructural certificado, las cuales podrán ser de perlón o de acero.", "Las líneas de vida horizontales deben ser usadas por 2 trabajadores como máximo", "Las líneas verticales, deben ser utilizadas por 1 solo trabajador a la vez", "Utilice 3 puntos de apoyo al subir o bajar de equipos"] },
  { familia: "SEGURIDAD", riesgo: "Atrapamientos", definicion: "Enganche o aprisionamiento del cuerpo, o parte de éste, por mecanismos de las máquinas, objetos, piezas, materiales, equipos o vehículos que han perdido su estabilidad.", codigo: "B1", medidas: ["Mantener partes móviles protegidas o encapsuladas. No retirar protecciones", "Realizar inspecciones periódicas de los equipos para detectar y reparar cualquier daño o desgaste", "No utilizar ropa o pelo suelto, así como joyas", "Utilizar señales de advertencia y delimitación de áreas para indicar los peligros y las zonas restringidas", "Instalar dispositivos de parada de emergencia de fácil acceso", "Al realizar mantenciones o cambios de elementos móviles, realizar siempre con el equipo apagado y desenergizado", "Realice el aislamiento y bloqueo de fuentes de energía, antes de intervenir equipos en movimiento.", "No exponer las manos a puntos de atrapamientos, bajo o entre cargas", "No exponga las manos o extremidades a partes móviles", "No exponga sus manos a puntos de atrapamientos, como abertura o cierre de puertas, cajones o mobiliario", "No exponga sus manos a puntos de atrapamientos, como abertura o cierre de escotillas de andamios", "Utilice guantes de seguridad, dependiendo el tipo de actividad y riesgo a cubrir."] },
  { familia: "SEGURIDAD", riesgo: "Caida de objetos", definicion: "Caída de elementos que golpean al cuerpo, por ejemplo, materiales, herramientas, estructuras, etc.", codigo: "B2", medidas: ["Mantenga el área de trabajo segregada perimetralmente, por medio de conos, cadenas plásticas al realizar trabajos en altura", "Proteja niveles inferiores donde exista tránsito de trabajadores o peatones, por medio de placas estructurales o elementos capaces de contener la caída de materiales o herramientas", "No realice trabajos en la misma vertical con otra especialidad, realice una coordinación entre supervisión y trabajadores", "Utilice coleto o morral, para transportar herramientas en altura", "Implemente señalética de trabajos en altura y caída de materiales", "Suba y baje el material con un cordel de perlón con mosquetón gancho escala o roldana (pasteca), no se exponga bajo la carga suspendida que eventualmente podría caer a niveles inferiores", "No deje materiales o herramientas en bordes de las plataformas de trabajo o sobre estructuras"] },
  { familia: "SEGURIDAD", riesgo: "Cortes por objetos / herramientas cortopunzantes", definicion: "Cortes y/o punzaciones generadas en parte del cuerpo debido al contacto de éste con objetos cortantes, punzantes y/o abrasivos.", codigo: "B3", medidas: ["No exponer las manos a línea de fuego durante el uso de herramientas manuales o cartoneros", "Realizar cortes o dimensionado de materiales, sobre bancos de trabajo y no en voladizo", "Realizar cortes de materiales manteniendo una distancia mínima de 20 Cm. Con el punto de corte", "Utilice las herramientas, de acuerdo a lo indicado por el fabricante. No improvise con hechizas", "Retire clavos, tornillos o cantos vivos anormales, de materiales en desuso", "Se prohíbe utilizar herramientas de corte sin sus protecciones o retirar de equipos o herramientas", "Las herramientas eléctricas, como: sierra circular, esmeril angular, taladro percutor, u otra herramienta critica, se deben operar o utilizar con ambas manos para controlar la exposición de extremidades", "Verifique el buen estado de discos de corte, los cuales no se deben de utilizar excediendo sus RPM", "Acopie elementos metálicos en forma horizontal, controlando que no se levanten con el viento", "Utilizar guantes dependiendo la actividad o especialidad (cabretilla, palma látex o anticorte)", "Mantenga puntas expuestas de fierro protegidas con madera u otro elemento protector", "Emplear recipientes de desecho resistentes a las perforaciones y con cierre hermético", "Utilice ropa manga larga, para controlar la exposición de brazos y piernas a elementos cortantes", "Utilizar señales de advertencia para identificar las áreas donde se manipulan elementos cortopunzantes", "Utilizar cuchillos con mangos antideslizantes y hojas de acero inoxidable.", "Utilice ventosas para la manipulación de cristales o termopaneles, los cuales deben estar secos para evitar deslizamiento"] },
  { familia: "SEGURIDAD", riesgo: "Aplastamiento por carga suspendida", definicion: "Caída de elementos que son levantados, izados o mantenidos por medio equipos manuales como tecles, roldanas o elementos mecanicos como camión pluma o grúas", codigo: "B4", medidas: ["No trabajar bajo carga suspendida", "Elaborar plan de izaje de cargas, según tabla de carga del equipo", "Chequear el buen estado de los elementos de izaje", "Verificar factor de seguridad 5:1 de aparejos", "No sobrepasar la capacidad de carga de los aparejos", "Realizar izaje en terreno estable y nivelado", "Capacitar a los trabajadores sobre los riesgos asociados a la manipulación de cargas y las técnicas de levantamiento seguras", "Mantener el área de trabajo segregada perimetralmente y señalizada", "Establecer una comunicación clara y efectiva entre los trabajadores involucrados en las operaciones de izaje", "Realizar un mantenimiento preventivo de los equipos, para evitar fallas que puedan provocar accidentes"] },
  { familia: "SEGURIDAD", riesgo: "Golpeado por o contra", definicion: "Encuentro violento del cuerpo, o de una parte de éste, con uno o varios objetos, estén éstos en movimiento o no", codigo: "B5", medidas: ["Utilizar guantes y lentes de seguridad", "Manipule las herramientas desde sus azas, no las retire o las deje de utilizar por comodidad", "Estibe las cargas correctamente y amarre con cordel o fajas en al menos 3 puntos de contacto", "Utilice casco y calzado de protección."] },
  { familia: "SEGURIDAD", riesgo: "Volcamiento de plataforma", definicion: "Encuentro violento del cuerpo, o de una parte de éste, con uno o varios objetos, estén éstos en movimiento o no", codigo: "B6", medidas: ["Las plataformas fijas o móviles, como andamios, carreras, banquillos, alza hombres, entre otros, deben ser chequeadas previo a su uso, verificando el buen estado y con todas sus partes y piezas", "Utilice plataformas de trabajo autorizadas, los andamios deben tener su tarjeta de aprobación o prohibición de uso", "En maniobras de izaje, utilice las bases o almohadillas para estabilizadores, además el terreno debe ser nivelado y estable", "Evaluar las condiciones del terreno donde se utilizará la plataforma, como pendientes, suelo blando, obstáculos y posibles inestabilidades", "Rechazar cualquier plataforma que presente algún tipo de daño o desgaste que pueda comprometer su estabilidad", "Asegurarse de que los estabilizadores estén completamente extendidos y firmemente apoyados sobre una superficie nivelada antes de operar la plataforma.", "Distribuir la carga de manera uniforme sobre la plataforma para evitar desequilibrios", "Evitar sobrecargar la plataforma más allá de su capacidad nominal", "Respetar los límites de velocidad establecidos por el fabricante", "Evitar operar la plataforma en condiciones de viento superior a 35 Km/hr", "No operar la plataforma sobre superficies resbaladizas o mojadas", "Respetar el ángulo máximo de inclinación permitido por el fabricante", "Al trabajar sobre escalera portatil, asegure que se encuentra amarrada en nivel superior y que su angulo de trabajo es 1:4", "Asegurarse de que el contrapeso esté correctamente posicionado"] },
  { familia: "SEGURIDAD", riesgo: "Contacto con personas", definicion: "Lesiones recibidas en el cuerpo, o parte de éste (agresiones, patadas, mordiscos, etc.) debido a la acción de otras personas", codigo: "C1", medidas: ["Mantenga siempre la calma", "En caso de sufrir un asalto, no oponga resistencia", "En presencia de delincuentes, no ejecute acciones que pueden poner en riesgo su vida o la de otras personas", "Una vez que se encuentre en un lugar seguro, llame a carabineros (133) si su supervisor se lo indica", "Si presenta una lesión producto del asalto, asista a un establecimiento de salud indicado por su supervisor", "Si las instalaciones del centro de trabajo o los elementos de seguridad presentan daños, informe a su supervisor", "Mantén bien iluminado el lugar, especialmente en la entrada y el perímetro exterior", "Las cámaras de vigilancia evitan a los delincuentes y pueden servir como evidencia en caso de robo"] },
  { familia: "SEGURIDAD", riesgo: "Contacto termico por calor", definicion: "Acción y efecto de hacer contacto físico con superficies o productos calientes", codigo: "D1", medidas: ["No transite con objetos o agua caliente por pasillo o escaleras, utilice cafeteria o casino para consumir liquidos calientes", "Utilice ropa de cuero y guantes mosqueteros, al soldar, esmerilar o chispas incandescentes", "Observe la presencia de equipo con partes calientes, evitando la exposición de extremidades"] },
  { familia: "SEGURIDAD", riesgo: "Comtacto accidental con 220 o 380 volts", definicion: "Es todo contacto de las personas con masas puestas accidentalmente en tensión", codigo: "E1", medidas: ["No intervenir circuitos o herramientas eléctricas.", "No amarre extensiones en andamios o estructuras metálicas (aísle mediante madera o pvc)", "Antes de utilizar un equipo o herramienta eléctrico, se debe verificar que todas sus componentes se encuentren en buen estado, por ejemplo: enchufe, cordón o cable alimentador, pantalla, teclado.", "Los equipos se deberán conectar a red de alimentación que tenga protección diferencial. No sobrecargas circuitos.", "No trabajar nunca con energía viva, con cables o cordones con el alambre expuesto", "Para desconectar un equipo, manipule desde su enchufe y no del cable o cordón alimentador", "No se debe utilizar ningún equipo ni instalación eléctrica cuando esté mojada; así como el personal que manipule un equipo, deberá estar con las manos y guantes secos.", "En caso de identificar líneas eléctricas, no se podrá trabajar a menos de 1,5 Mts. de distancia, para lo cual se deberá saber si las líneas se encuentran energizadas, el voltaje y el radio de seguridad, en ningún caso se aproxime con plataformas metálicas fijas o móviles a líneas eléctricas", "La mantención, reparación y/o intervención de las herramientas, extensiones o tableros eléctricos solo debe ser realizada por el personal eléctrico autorizado", "No realizar ningún tipo de trabajo con herramientas eléctricas bajo lluvia", "Chequee el perímetro de trabajo y desplazamiento de la plataforma fija o móvil, con el objetivo de identificar y controlar las líneas energizadas"] },
  { familia: "SEGURIDAD", riesgo: "Proyección de fragmentos y/o particulas", definicion: "Contacto violento del cuerpo, o una parte de éste, con elementos proyectados como: piezas, fragmentos, partículas o líquido.", codigo: "F1", medidas: ["Utilice lentes de seguridad mica transparente para trabajos interiores y mica oscura para trabajos al exterior", "Utilice careta facial en generación de chispas incandescentes", "No deben manipularse, ni alterarse los elementos de seguridad y resguardos de las máquinas o herramientas a utilizar", "Evitar el uso de herramientas de corte o abrasión cerca de personas no protegidas", "Utilizar biombos o encerramientos para controlar la proyección de particulas", "En el uso de discos se debe comprobar el buen estado de los discos, desechando aquellos que se encuentren desgastados o agrietados, además de no sobrepasar las revoluciones establecidas por el fabricante con respecto al equipo donde será utilizado"] },
  { familia: "SEGURIDAD", riesgo: "Atropello o golpe con vehiculo", definicion: "Impacto entre un peatón y un vehículo en movimiento", codigo: "G1", medidas: ["No hable o manipule el teléfono celular mientras conduce", "No desplace personal en pick up o carrocerías de los vehículos o equipos", "Mantener una conducta de peatón siempre a la defensiva", "Cruce en sectores autorizados y habilitados, como esquinas y paso de cebra", "Al bajar de su vehículo, verifique que este se encuentre enganchado, parqueado y con motor aoagado", "Verifique que el conductor siempre lo visualice; no se exponga a puntos ciegos del vehículo o equipo", "Utilizar señales de advertencia y delimitación de áreas para indicar los peligros y las zonas restringidas", "Instalar espejos convexos en puntos ciegos", "Establecer límites de velocidad adecuados para las zonas de trabajo", "Asegurar una iluminación adecuada en las áreas de trabajo, especialmente en las zonas de circulación de vehículos y peatones", "Capacitar a los trabajadores sobre los riesgos de atropello, las normas de seguridad vial", "Realizar un mantenimiento preventivo regular de los vehículos para garantizar su buen estado de funcionamiento.", "Utilizar chaleco reflectante como última capa, donde exista desplazamiento de equipos"] },
  { familia: "SEGURIDAD", riesgo: "Choque, colision o volcamiento", definicion: "Lesiones generadas en el cuerpo de un conductor o pasajero de un vehículo cuando éste se vuelca o impacta con otro vehículo y/o estructura externa", codigo: "G2", medidas: ["Operar o conducir equipos por personal autorizado y con licencia municipal vigente", "Mantener una conducta a la defensiva en la conducción. No conduzca fatigado o cansado", "Usar cinturón de seguridad para todos los pasajeros del vehículo", "De cumplimiento a lo establecido en la ley de tránsito N°18290, Ley Emilia", "Transitar con luces encendidas del vehículo", "Mantenga una distancia prudente entre usted y el vehículo que va delante (ley de los 3 segundos)", "Verifique que el vehículo o equipo se encuentre en buen estado, caso contrario no lo utilice, de aviso", "Realizar un mantenimiento preventivo regular de los vehículos (frenos, neumáticos, dirección, luces, etc)", "No conducir bajo los efectos del alcohol o drogas", "Adaptar la velocidad a las condiciones de la vía", "Evitar distracciones al conducir (teléfono móvil, lectura, sacar ropa, fumar)", "Asegurar la carga de los vehículos de forma adecuada para evitar desplazamientos durante la marcha", "Conduzca con ambas manos al volante", "No transitar con cargas que generen la vista bloqueada u obstruida"] },
  { familia: "SEGURIDAD", riesgo: "Exposicion a radiaciones no ionizantes", definicion: "Exposición de un trabajador a altas dosis de radiaciones no ionizantes - ultravioleta (UV) exposición como accidente.", codigo: "H1", medidas: ["Aplicar o protector solar (Factor 30 como mínimo), 20 minutos antes de empezar los trabajos expuestos directamente a radiación UV (Aplicar bloqueador cada 3 horas).", "Mantener una hidratación permanente, bebiendo al menos 2, 5 lts. De agua diario", "Utilice lentes de protección UV, gorro legionario, además de ropa manga larga", "Utilizar estructuras o materiales que proporcionen sombra, como toldos, sombrillas o carpas", "En caso de ser posible, programar las tareas que requieren exposición al sol durante las horas de menor radiación", "Rotar a los trabajadores expuestos a la radiación UV con otros que realizan tareas en interiores", "Establecer límites de tiempo de exposición al sol", "Instalar señalización que advierta sobre los riesgos de la radiación UV y las medidas de protección."] },
  { familia: "SEGURIDAD", riesgo: "Generación de amagos de incendio", definicion: "Conjunto de condiciones (combustibles, comburentes y fuentes de ignición) cuya conjunción en un momento determinado, pueden originar un fuego incontrolado. Sus efectos son generalmente no deseados, produciendo lesiones personales por el humo (gases tóxicos y altas temperaturas) y daños materiales", codigo: "I1", medidas: ["Mantener extintor visible en el lugar de trabajo (PQS o CO2)", "Estar capacitado o instruido en el manejo de extintor", "No generar proyección de partículas a sectores con productos inflamables o combustibles", "No fumar o realizar en lugares habilitados y autorizados", "No dejar calefactores eléctricos volcados o tapados", "Inspeccionar y mantener regularmente equipos eléctricos, maquinaria y sistemas de calefacción para prevenir sobrecalentamientos", "Mantener el lugar de trabajo limpio y ordenado, eliminando acumulaciones de polvo y residuos que puedan ser combustibles", "Mantener en buen estado los equipos de protección contra incendios, como mangueras y boquillas"] },
  { familia: "HIGIENE", riesgo: "Exposicion a ruido", definicion: "Permanencia en un ambiente de trabajo con presencia continua de altos niveles de presión sonora (en forma estable o fluctuante), con la potencialidad de alterar el órgano de la audición", codigo: "O1", medidas: ["Utilizar protección auditiva en ambos oídos, sobre los 82 decibeles (DB)", "Rodear las fuentes de ruido con barreras acústicas para evitar su propagación", "Instalar pantallas entre la fuente de ruido y los trabajadores", "Utilizar materiales absorbentes en paredes, techos y suelos para reducir la reverberación del sonido", "Realizar evaluaciones auditivas periódicas a los trabajadores expuestos", "Instruir a los trabajadores sobre los riesgos del ruido, las medidas de prevención y el uso correcto de los protectores auditivos"] },
  { familia: "HIGIENE", riesgo: "Exposición a vibraciones", definicion: "Permanencia en un ambiente de trabajo con presencia de energía vibratoria que se transfiere al componente mano-brazo, el cual actúa como receptor de energía mecánica", codigo: "O2", medidas: ["Realice una rotación o pausas en el puesto de trabajo, cuando utilice herramientas que generen vibraciones, como martillo kango, equipos de compactación, entre otros. La actividad, no debe superar los 30 minutos continuos de operación", "Realizar un mantenimiento preventivo regular para reducir la vibración", "Optimizar la ergonomía de los puestos de trabajo para reducir la transmisión de vibraciones al cuerpo", "Utilizar herramientas con empuñaduras antideslizantes y de tamaño adecuado", "Establecer pausas frecuentes para permitir que los músculos se recuperen", "Capacitar a los trabajadores sobre los riesgos de la exposición a vibraciones y las medidas de prevención", "Utilizar guantes antivibratorios"] },
  { familia: "HIGIENE", riesgo: "Exposicion a silice", definicion: "Permanencia en un ambiente de trabajo con presencia de partículas sólidas en suspensión como Sílice", codigo: "P1", medidas: ["Realizar limpiezas frecuentes con métodos húmedos para evitar la suspensión del polvo", "Instalar señalización que advierta sobre la presencia de sílice y las medidas de seguridad", "Proporcionar a los trabajadores equipos de protección respiratoria - respirador doble vía con filtros para polvo P100", "Reemplazar materiales que contienen sílice cristalina por alternativas más seguras cuando sea posible.", "Aislar las operaciones que generan polvo de sílice en cabinas o cuartos cerrados con ventilación local"] },
  { familia: "MUSCULO_ESQUELETICO", riesgo: "Sobrecarga física debido a la manipulación manual de cargas", definicion: "Trabajos en donde se deban levantar, descender o transportar manualmente objetos de más de 3 kilos. Trabajos en donde se deban empujar o arrastrar objetos utilizando 1 o 2 manos.", codigo: "R1", medidas: ["El trabajador debe estar instruido en una adecuada postura ergonómica y técnicas de levantamiento de carga", "Mantener una correcta postura ergonómica al levantar o manejar cargas, manteniendo los pies separados, rodillas flectadas, espalda recta, carga cerca del cuerpo y sujeción firme", "El trabajador debe aplicar en todo momento las técnicas de levantamiento de carga", "Disponer y utilizar ayuda mecánica para el traslado de cargas, según corresponda", "El personal debe estar informado del peso de la carga a manipular", "No levantar más de 25 Kg. por trabajador hombre y 20 Kg. por trabajadora mujer", "Se prohíbe la manipulación de cargas por mujeres embarazadas", "Conozca o estime el peso de una carga. Solicite ayuda en caso de ser necesario.", "Instruir en la realización de una rutina de elongación y calentamiento muscular previo al inicio de la tarea"] },
  { familia: "MUSCULO_ESQUELETICO", riesgo: "Sobrecarga física debido al trabajo repetitivo de miembros superiores", definicion: "Tarea donde se involucra los miembros superiores (hombro, brazo, antebrazo, mano), caracterizada por tareas durante las cuales las mismas acciones de trabajo son repetidas por más del 50% de la duración de éstas, y/o el tiempo de ciclo es inferior a 30 segundos, y con una duración total de una hora o más durante la jornada laboral y con un tiempo total de 5 o más horas a la semana", codigo: "R2", medidas: ["Ajustar la altura de las mesas, sillas y equipos para permitir una postura de trabajo cómoda y neutral", "Organizar el espacio de trabajo de manera que se minimicen los movimientos innecesarios y se eviten las posturas forzadas", "Rotar a los trabajadores entre diferentes tareas para reducir la exposición a movimientos repetitivos", "Establecer pausas cortas y frecuentes durante la jornada laboral para permitir que los músculos se relajen", "Capacitar en postura correcta y ergonómica, técnicas de levantamiento cargas y riesgos asociados a movimientos repetitivos.", "Realizar mantencion de equipos y herramientas para garantizar el correcto funcionamiento y minimizar la carga de trabajo", "Instruir en la realización de una rutina de elongación y calentamiento muscular previo al inicio de la tarea", "El trabajador durante la tarea de 1 hora, debe realizar una pausa de descanso e hidratación de 10 minutos"] },
  { familia: "PSICOSOCIAL", riesgo: "Carga de trabajo", definicion: "La carga de trabajo son las exigencias que se le hacen a los trabajadores y trabajadoras para que cumplan con un determinado objetivo o tarea en un tiempo acotado o limitado. Es decir, en la carga de trabajo existe una relación entre la cantidad de tareas y el tiempo en que se deben realizar, que puede ser desde minutos hasta semanas o más", codigo: "S1", medidas: ["Crear un ambiente de trabajo donde se valore la diversidad, la igualdad y el respeto mutuo.", "Capacitar a los trabajadores sobre acoso laboral, sus consecuencias y cómo identificarlo.", "Garantizar la confidencialidad de las personas que denuncian el acoso", "Contar con un Protocolo de Acoso, que los trabajadores estén en conocimiento", "Contar con un Procedimiento de Denuncias", "Contar con un Procedimiento de Investigación de Acoso", "Expresar tus necesidades y preocupaciones de manera clara y respetuosa", "Aprender a decir \"no\" cuando sea necesario"] },
];
// Protocolos de Vigilancia Epidemiológica MINSAL (Anexo 6) — checklist fijo,
// se marca por obra cuáles aplican según los riesgos identificados.
const MIPER_PROTOCOLOS = [
  "Protocolo de Vigilancia del Ambiente de Trabajo y de la Salud de los Trabajadores con Exposición a Sílice",
  "Protocolo de Exposición Ocupacional a Ruido PREXOR",
  "Protocolo de Vigilancia para Trabajadores Expuestos a Factores de Riesgo de Trastornos Musculo-Esqueléticos de Extremidades Superiores Relacionas con el Trabajo (TMERTEESS)",
  "Protocolo de Vigilancia de Riesgos Psicosociales en el Trabajo",
  "Guía Técnica sobre Radiación Ultravioleta de Origen Solar",
];

// Probabilidad × Consecuencia = VEP; el VEP determina el Nivel de Riesgo
// (tabla "VEP" del Excel original). Con probabilidad y consecuencia acotadas
// a {1,2,4} el VEP solo puede dar 1,2,4,8 o 16 — de ahí el corte "≤2".
const MIPER_PROBABILIDAD = [
  { valor: 1, nombre: 'Baja', desc: 'El daño ocurrirá rara vez o en contadas ocasiones (posibilidad remota).' },
  { valor: 2, nombre: 'Media', desc: 'El daño ocurrirá en varias ocasiones (posibilidad mediana, puede pasar).' },
  { valor: 4, nombre: 'Alta', desc: 'El daño ocurrirá siempre o casi siempre (posibilidad inmediata).' },
];
const MIPER_CONSECUENCIA = [
  { valor: 1, nombre: 'Ligeramente Dañino', desc: 'Pequeñas lesiones o daños superficiales, con recuperación rápida.' },
  { valor: 2, nombre: 'Dañino', desc: 'Lesiones que pueden causar incapacidad temporal, con recuperación considerable.' },
  { valor: 4, nombre: 'Extremadamente Dañino', desc: 'Amputaciones, fracturas mayores, lesiones múltiples o fatales.' },
];
const MIPER_VEP = [
  { max: 2,  nombre: 'Tolerable',   color: 'green', accion: 'No se necesita mejorar la acción preventiva. Requiere comprobaciones periódicas para asegurar que se mantiene la eficacia de las medidas de control.' },
  { max: 4,  nombre: 'Moderado',    color: 'amber', accion: 'Se deben hacer esfuerzos para reducir el riesgo, determinando las inversiones precisas, en un período determinado.' },
  { max: 8,  nombre: 'Importante',  color: 'orange',accion: 'No se debe comenzar ni continuar el trabajo hasta que se haya reducido el riesgo (pueden precisarse recursos considerables).' },
  { max: 16, nombre: 'Intolerable', color: 'red',   accion: 'No debe comenzar ni continuar el trabajo hasta que se reduzca el riesgo. Si no es posible reducirlo, se debe prohibir el trabajo.' },
];
function miperNivelRiesgo(probabilidad, consecuencia) {
  const vep = (Number(probabilidad)||0) * (Number(consecuencia)||0);
  const nivel = MIPER_VEP.find(v => vep <= v.max) || MIPER_VEP[MIPER_VEP.length-1];
  return { vep, nivel: nivel.nombre, color: nivel.color, accion: nivel.accion };
}
// Catálogo fijo + riesgos agregados a mano por cualquier obra (persistidos en
// MIPER_RIESGOS_CUSTOM) — se recalcula cada vez que cambian los datos.
let allMiperRiesgosCustom = [];
function miperCatalogoCompleto() {
  const custom = allMiperRiesgosCustom.map(c => ({
    familia: c.familia, riesgo: c.riesgo, definicion: c.definicion, codigo: c.codigo,
    medidas: c.medidas ? c.medidas.split(' | ').filter(Boolean) : [], custom: true,
  }));
  return [...MIPER_CATALOGO_RIESGOS, ...custom];
}
// Coordenadas medidas directamente sobre cada PDF real (pypdfium2, puntos
// PDF con origen abajo-izquierda — mismo sistema que pdf-lib, se usan tal
// cual sin conversión). Motor compartido: generarPdfChecklistGenerico.
const CHECKLIST_GENERICO_CONFIG = {
  'SGSST-PER-004': {
    campos: [
      { key: 'empresa', label: 'Empresa', x: 95, y: 619, w: 250 },
      { key: 'obra', label: 'Obra', x: 385, y: 619, w: 185 },
      { key: 'representante', label: 'Representante en la obra', x: 168, y: 602, w: 175 },
      { key: 'cargoRepresentante', label: 'Cargo', x: 390, y: 602, w: 180 },
      { key: 'etapaObra', label: 'Etapa de la obra', x: 133, y: 585, w: 210 },
      { key: 'fechaInspeccion', label: 'Fecha de inspección', x: 457, y: 585, w: 110, tipo: 'fecha' },
      { key: 'manzanaTorre', label: 'Manzana o torre', x: 136, y: 570, w: 208 },
      { key: 'nVivienda', label: 'N° Vivienda', x: 413, y: 570, w: 155 },
    ],
    tabla: {
      xItem: 46, xSI: 224, xNO: 251, xNA: 279, xObs: 298, xResp: 460, xFecha: 526, xFin: 576.6, xIni: 42.4,
      filas: [
        { y0: 415.1, y1: 395.1, texto: 'La base de apoyo se encuentra nivelada y sobre un apoyo firme (tablón, solera)' },
        { y0: 395.1, y1: 375.9, texto: 'La estructura se encuentra aplomada y alineada.' },
        { y0: 375.9, y1: 356.5, texto: 'Posee todas las piezas indicadas por el proveedor o fabricante.' },
        { y0: 356.5, y1: 337.3, texto: 'Las plataformas de trabajo son de 70 cm. como mínimo y antideslizantes' },
        { y0: 337.3, y1: 318.1, texto: 'Las plataformas poseen baranda superior e intermedia y rodapiés.' },
        { y0: 318.1, y1: 289.9, texto: 'El andamio se encuentra amarrado a la estructura en la forma y condiciones dadas por el proveedor.' },
        { y0: 289.9, y1: 270.7, texto: 'Las plataformas están ordenadas, sin sobrepeso y limpias.' },
        { y0: 270.7, y1: 251.5, texto: 'Los trabajadores acceden al andamio por un sistema específico o por el edificio.' },
        { y0: 251.5, y1: 232.2, texto: 'Se encuentra libre de extensiones eléctricas' },
        { y0: 232.2, y1: 204.2, texto: 'Los trabajadores utilizan casco, zapatos de seguridad, guantes y arnés de seguridad.' },
        { y0: 204.2, y1: 185.1, texto: 'Se conoce la resistencia del andamio.' },
        { y0: 185.1, y1: 165.9, texto: 'Diagonales completas (crucetas)' },
      ],
    },
    firmas: [
      { key: 'realiza', label: 'Profesional que realiza la evaluación', xNombre: 195, yNombre: 124, xCargo: 76, yCargo: 109, xProfesion: 127, yProfesion: 96, xFirma: 48, yFirma: 60, wFirma: 260, hFirma: 42 },
      { key: 'revisa', label: 'Profesional que revisa la evaluación', xNombre: 495, yNombre: 125, xCargo: 376, yCargo: 109, xFecha: 375, yFecha: 96, xFirma: 348, yFirma: 60, wFirma: 220, hFirma: 42 },
    ],
  },
  'SGSST-PER-007': {
    campos: [
      { key: 'obra', label: 'Obra', x: 70, y: 683, w: 200 },
      { key: 'ubicacion', label: 'Ubicación', x: 92, y: 669, w: 175 },
      { key: 'sector', label: 'Sector', x: 316, y: 669, w: 200 },
      { key: 'empresa', label: 'Empresa', x: 86, y: 653, w: 350 },
    ],
    // Sin columnas Responsable/Fecha por ítem (a diferencia de 004/008/009)
    // — el motor las omite solo con no traer xResp/xFecha acá.
    tabla: {
      xItem: 80, xSI: 361.8, xNO: 383.5, xNA: 410, xObs: 428, xFin: 567,
      filas: [
        { y0: 623.5, y1: 596.2, seccion: '1. Estrobos', texto: 'El estrobo es adecuado para la carga a soportar (Según fabricante)' },
        { y0: 596.2, y1: 582.3, texto: 'Los estrobos presentan picaduras en hebras.' },
        { y0: 582.3, y1: 568.3, texto: 'Tienen dispositivos de acoplamiento sueltos.' },
        { y0: 568.3, y1: 554.3, texto: 'Se han inspeccionado prensas. Están bien sujetas.' },
        { y0: 554.3, y1: 540.5, texto: 'No tienen partes destorcidas' },
        { y0: 540.5, y1: 526.5, texto: 'Los estrobos dados de baja son destruidos.' },
        { y0: 499.1, y1: 471.9, seccion: '2. Eslingas (si la respuesta es negativa, retire la eslinga y reemplace)', texto: 'No contiene sustancias abrasivas que lo puedan dañar (solventes, pinturas, aceites, etc)' },
        { y0: 471.9, y1: 457.9, texto: 'No tiene roturas en más de 3 hilos' },
        { y0: 457.9, y1: 443.9, texto: 'No presentan ningún nudo' },
        { y0: 443.9, y1: 430.1, texto: 'No cuentan con picaduras de soldadura' },
        { y0: 430.1, y1: 416.0, texto: 'Costuras no se presentan rotas o desgastadas' },
        { y0: 402.1, y1: 388.3, seccion: '3. Cadenas', texto: 'No cuenta con eslabones soldados o sometidos a calor' },
        { y0: 388.3, y1: 374.3, texto: 'Eslabones totalmente cerrados y sin deformaciones.' },
        { y0: 374.3, y1: 333.5, texto: 'Ganchos terminales cuentan con seguros en buen estado, sin aseguramientos hechizos por medio de clavos doblados o alambres' },
        { y0: 333.5, y1: 306.1, texto: 'Cuenta con etiqueta que indica claramente la capacidad de levante, (legible)' },
        { y0: 306.1, y1: 278.9, texto: 'Se usan separadores entre la carga y el piso para depositar la carga' },
        { y0: 278.9, y1: 251.5, texto: 'El ángulo de carga está entre 30° y 60° (respecto a la horizontal)' },
      ],
    },
    firmas: [
      { key: 'realiza', label: 'Realizó', xNombre: 97, yNombre: 212, xCargo: 100, yCargo: 198, xFecha: 94, yFecha: 186, xFirma: 45, yFirma: 150, wFirma: 260, hFirma: 30 },
      { key: 'revisa', label: 'Revisó', xNombre: 387, yNombre: 212, xCargo: 378, yCargo: 198, xFecha: 382, yFecha: 186, xFirma: 340, yFirma: 150, wFirma: 220, hFirma: 30 },
    ],
  },
  'SGSST-PER-008': {
    // "Empresa" viene pre-impresa en la plantilla (no es un campo en
    // blanco) — el único dato de encabezado editable acá es Supervisor.
    campos: [
      { key: 'supervisor', label: 'Supervisor', x: 400, y: 630, w: 165 },
      { key: 'obra', label: 'Obra', x: 76, y: 616, w: 260 },
      { key: 'fecha', label: 'Fecha', x: 380, y: 616, w: 190, tipo: 'fecha' },
      { key: 'etapaObra', label: 'Etapa de la obra', x: 130, y: 600, w: 210 },
    ],
    tabla: {
      xItem: 46, xSI: 222.5, xNO: 249.5, xNA: 279.5, xObs: 298, xResp: 460, xFecha: 529, xFin: 576.6,
      filas: [
        { y0: 446.3, y1: 410.3, texto: 'El acopio de material y tránsito, se encuentra a una distancia del borde mínimo de 1 m.' },
        { y0: 410.3, y1: 386.7, texto: 'Está señalizado o protegido el borde' },
        { y0: 386.7, y1: 363.3, texto: 'Las redes de servicios están señalizadas' },
        { y0: 363.3, y1: 348.5, texto: 'El talud es el natural del terreno' },
        { y0: 348.5, y1: 325.1, texto: 'Las entibaciones están construidas de acuerdo a cálculo' },
        { y0: 325.1, y1: 297.7, texto: 'Las paredes se observan sin presencia de humedad' },
        { y0: 297.7, y1: 271.3, texto: 'Se observan socavamientos o fallas en las paredes' },
        { y0: 271.3, y1: 244.5, texto: 'Existen escalas y pasarelas para el acceso y tránsito del personal' },
        { y0: 244.5, y1: 209.4, texto: 'Los trabajadores utilizan sus Elementos de Protección Personal' },
        { y0: 209.4, y1: 182.4, texto: 'Barandas en zonas de tránsito al borde de la excavación.' },
      ],
    },
    firmas: [
      // Los títulos "Profesional que realiza/revisa la evaluación:" ocupan
      // casi todo el ancho de su franja azul (terminan en x≈225/523) — el
      // nombre se escribe pegado al final, con letra chica para que quepa.
      { key: 'realiza', label: 'Profesional que realiza la evaluación', xNombre: 229, yNombre: 141, sizeNombre: 7, xCargo: 76, yCargo: 127, xFirma: 48, yFirma: 40, wFirma: 260, hFirma: 45 },
      { key: 'revisa', label: 'Profesional que revisa la evaluación', xNombre: 527, yNombre: 141, sizeNombre: 6, xCargo: 376, yCargo: 127, xFecha: 375, yFecha: 112, xFirma: 348, yFirma: 40, wFirma: 220, hFirma: 40 },
    ],
  },
  'SGSST-PER-009': {
    // "Empresa" viene pre-impresa ("LUIS SAEZ THIELEMANN") — igual que 008,
    // no es un campo en blanco.
    campos: [
      { key: 'nombreTrabajador', label: 'Nombre del trabajador', x: 380, y: 644, w: 185 },
      { key: 'obra', label: 'Obra', x: 74, y: 619, w: 195 },
      { key: 'fecha', label: 'Fecha', x: 312, y: 619, w: 250, tipo: 'fecha' },
    ],
    // Responsable y Fecha de Cumplimiento vienen fusionados en una sola
    // columna angosta acá (a diferencia de 004/008) — solo se define
    // xResp, sin xFecha (ver generarPdfChecklistGenerico).
    tabla: {
      xItem: 38, xSI: 243.7, xNO: 275.6, xNA: 311.0, xObs: 332, xResp: 502, xFin: 577.0,
      filas: [
        { y0: 548.5, y1: 513.1, texto: '¿El esmeril cuenta con una cubierta o casquete de protección del disco y se encuentra bien instalada?' },
        { y0: 513.1, y1: 477.5, texto: '¿Se mantiene una adecuada presión sobre la herramienta, evitando golpes y torsiones?' },
        { y0: 477.5, y1: 453.7, texto: '¿La velocidad máxima indicada en el disco en r.p.m es igual al esmeril angular?' },
        { y0: 453.7, y1: 429.9, texto: '¿Esmeril queda guardado en la bodega en un lugar limpio y seco?' },
        { y0: 429.9, y1: 406.1, texto: '¿El tipo de disco es el adecuado?: Corte o desbaste' },
        { y0: 406.1, y1: 382.1, texto: '¿El montaje del disco es el correcto para evitar trizaduras y destrucciones bruscas?' },
        { y0: 382.1, y1: 346.7, texto: '¿El cable de alimentación se mantiene en buenas condiciones eléctricas que protejan la vida del trabajador?' },
        { y0: 346.7, y1: 299.5, texto: '¿El operador usa ropa ajustada y adecuada, evitando empleo de mangas largas, ropa suelta, pelo largo, anillos, aros etc?' },
        { y0: 299.5, y1: 275.7, texto: '¿El operador utiliza todos los EPP?' },
        { y0: 275.7, y1: 251.9, texto: '¿El operador para la máquina antes de posarla?' },
        { y0: 251.9, y1: 228.1, texto: '¿Al momento de cambiar el disco, se corta el suministro de energía?' },
        { y0: 228.1, y1: 204.1, texto: '¿El operador está entrenado y capacitado para utilizar la herramienta?' },
        { y0: 204.1, y1: 180.2, texto: '¿La herramienta es revisada en mantención mensualmente?' },
      ],
    },
    firmas: [
      { key: 'realiza', label: 'Profesional que realiza la evaluación', xNombre: 205, yNombre: 145, xCargo: 70, yCargo: 130, xProfesion: 132, yProfesion: 117, xFirma: 35, yFirma: 50, wFirma: 245, hFirma: 40 },
      { key: 'revisa', label: 'Profesional que revisa la evaluación', xNombre: 475, yNombre: 145, xCargo: 340, yCargo: 130, xFecha: 338, yFecha: 117, xFirma: 306, yFirma: 50, wFirma: 255, hFirma: 40 },
    ],
  },
};
// Devuelve el catálogo (PROGRAMAS_PERSONALIZADOS) que coincide con el
// nombre de una actividad del Programa Personalizado (comparación
// tolerante — sin tildes/mayúsculas — porque el campo sigue siendo texto
// libre con un datalist de sugerencias, no un select estricto).
function formatoDeActividad(actividad) {
  const norm = sinTildes((actividad || '').trim().toLowerCase());
  return PROGRAMAS_PERSONALIZADOS.find(p => sinTildes(p.nombre.toLowerCase()) === norm) || null;
}
// Checklist fijo de documentos del módulo Subcontratistas — mismo listado
// para todas las empresas (definido por el cliente, ver carpetas reales de
// Drive que usan hoy). "Carpeta de Empresa" se sube una sola vez; "Control
// Mensual" se repite mes a mes (mismo ítem, distinto Período "AAAA-MM").
// "Control de Herramientas" no tiene checklist: es una carpeta libre.
const SUBCONT_CARPETA_EMPRESA = [
  'Reglamento', 'Certificados mutualidad', 'Miper', 'Procedimientos',
  'Certificados EPP', 'Exámenes ocupacionales',
];
const SUBCONT_CONTROL_MENSUAL = [
  'Capacitaciones específicas', 'Charlas diarias', 'Recambio EPP', 'Inspecciones',
  'AST', 'Cronograma', 'Certificados', 'Exámenes ocupacionales',
  'Informe Mensual', 'Listado de trabajadores',
];

const NIVELES_RIESGO = [
  { value: 'Bajo',  color: 'green' },
  { value: 'Medio', color: 'amber' },
  { value: 'Alto',  color: 'red'   },
];
const TIPOS_EVENTO_INC = ['Cuasiaccidente', 'Incidente', 'Accidente Leve', 'Accidente Grave', 'Accidente Fatal'];
// Catálogo completo entregado por el cliente (reemplaza la lista plana que
// había antes). Cada ítem puede tener `tipos` (detalle/variante — se elige
// de una lista fija, ej. color del casco o tipo de guante) y/o `talla`
// (talla o N°, se escribe a mano porque varía por trabajador). Ninguno de
// los dos es obligatorio para entregar el ítem — se puede marcar solo el
// ítem sin elegir tipo ni escribir talla si no corresponde detallarlo.
const EPP_ITEMS = [
  { nombre: 'Casco de seguridad', tipoLabel: 'Color', tipos: ['Amarillo', 'Rojo', 'Azul', 'Blanco', 'Naranjo', 'Verde', 'Gris'] },
  { nombre: 'Protector auditivo', tipoLabel: 'Tipo', tipos: ['Tapón auditivo', 'Fono auditivo para casco', 'Fono auditivo tipo cintillo'] },
  { nombre: 'Guantes', tipoLabel: 'Tipo', tipos: ['Guante Multiflex', 'Guante Cabritilla', 'Guante PU', 'Guante de Albañil', 'Guante Antivibración', 'Guante de Aseo', 'Guante Quirúrgico', 'Guante de Soldador', 'Guante Hycrom'] },
  { nombre: 'Calzado de seguridad', tipoLabel: 'Tipo', tipos: ['Zapatos básicos', 'Zapatos de supervisor'], talla: true, tallaLabel: 'N°' },
  { nombre: 'Barbiquejo' },
  { nombre: 'Antiparras de seguridad', tipoLabel: 'Tipo', tipos: ['Lente claro', 'Lente oscuro', 'Cubre lentes claro', 'Cubre lentes oscuro', 'Antiparra con goma negra', 'Antiparra con goma blanca'] },
  { nombre: 'Mascarilla', tipoLabel: 'Tipo', tipos: ['Mascarilla desechable 3 pliegues', 'Mascarilla KN95', 'Mascarilla doble filtro'] },
  { nombre: 'Filtros', tipoLabel: 'Tipo', tipos: ['Rosado (polvo)', 'Amarillo (gases y vapores)'] },
  { nombre: 'Traje de agua', tipoLabel: 'Tipo', tipos: ['PVC', 'Ejecutivo'], talla: true, tallaLabel: 'Talla' },
  { nombre: 'Botas', tipoLabel: 'Tipo', tipos: ['Básica', 'Supervisor'] },
  { nombre: 'Chaleco reflectante' },
  { nombre: 'Geólogo', tipoLabel: 'Color', tipos: ['Azul', 'Rojo', 'Naranjo', 'Verde flúor'] },
  { nombre: 'Arnés de seguridad', talla: true, tallaLabel: 'Talla' },
  { nombre: 'Cabos de vida', tipoLabel: 'Tipo', tipos: ['Tipo Y', 'Simple'] },
  { nombre: 'Legionario' },
  { nombre: 'Rodilleras' },
  { nombre: 'Careta facial' },
  { nombre: 'Traje Tyvek' },
  { nombre: 'Bloqueador solar factor 50+' },
];

// ── Sugerencia automática de charla según el texto del incidente ──────
// Motor de palabras clave (no llama a una IA externa: conectar una API de
// IA real desde el navegador expondría la clave a cualquiera que abra el
// código fuente de la página). Detecta el tema de charla más relacionado
// analizando la descripción y las causas del incidente.
const REGLAS_SUGERENCIA_CHARLA = [
  { tema: 'Orden y limpieza', palabras: ['orden', 'desorden', 'limpieza', 'desorganiz', 'obstru', 'objetos en el paso', 'suciedad'] },
  { tema: 'Trabajo en altura', palabras: ['altura', 'andamio', 'caida de altura', 'caída de altura', 'escalera', 'techumbre', 'borde', 'baranda'] },
  { tema: 'Uso correcto de EPP', palabras: ['epp', 'proteccion personal', 'protección personal', 'casco', 'guantes', 'lentes de seguridad', 'sin proteccion', 'sin protección'] },
  { tema: 'Manejo de herramientas y equipos', palabras: ['herramienta', 'equipo defectuoso', 'maquina', 'máquina', 'corte', 'sierra', 'esmeril', 'taladro'] },
  { tema: 'Riesgo eléctrico', palabras: ['electric', 'eléctric', 'cortocircuito', 'cable', 'enchufe', 'tablero electrico', 'tablero eléctrico'] },
  { tema: 'Espacios confinados', palabras: ['espacio confinado', 'confinado', 'ventilacion', 'ventilación', 'pozo', 'camara', 'cámara'] },
  { tema: 'Izaje de cargas', palabras: ['izaje', 'grua', 'grúa', 'carga suspendida', 'eslinga', 'gancho', 'polipasto'] },
  { tema: 'Excavaciones y zanjas', palabras: ['excavacion', 'excavación', 'zanja', 'derrumbe', 'entibacion', 'entibación'] },
  { tema: 'Manejo manual de materiales', palabras: ['manejo manual', 'levant', 'sobreesfuerzo', 'peso', 'postura', 'espalda', 'carga manual'] },
  { tema: 'Extintores y emergencias', palabras: ['incendio', 'fuego', 'extintor', 'emergencia', 'humo', 'quemadura'] },
  { tema: 'Señalización y demarcación', palabras: ['señal', 'demarcacion', 'demarcación', 'cinta de seguridad', 'letrero'] },
  { tema: 'Vehículos y maquinaria', palabras: ['vehiculo', 'vehículo', 'camion', 'camión', 'atropell', 'retroceso', 'maquinaria pesada'] },
];
function sugerirTemaCharla(texto) {
  const t = (texto || '').toLowerCase();
  for (const regla of REGLAS_SUGERENCIA_CHARLA) {
    if (regla.palabras.some(p => t.includes(p))) return regla.tema;
  }
  return null;
}

// ── Sugerencia ampliada de plan de acción (Incidentes) ─────────────────
// Mismo motor de palabras clave: antes de caer en "sugerir una charla" se
// revisa si el incidente es más bien un tema de EPP dañado/faltante
// (reponer EPP), de herramienta/equipo en mal estado (mantención), o si
// existe un Procedimiento de Trabajo Seguro vigente para esa área (revisarlo).
const REGLAS_SUGERENCIA_EPP = [
  { item: 'Casco de seguridad', palabras: ['sin casco', 'casco dañado', 'casco roto', 'no tenia casco', 'no tenía casco', 'falta casco', 'casco malo'] },
  { item: 'Antiparras de seguridad', palabras: ['sin lentes', 'lentes rayados', 'lentes rotos', 'lentes dañados', 'falta lentes'] },
  { item: 'Guantes', palabras: ['sin guantes', 'guantes rotos', 'guantes dañados', 'falta guantes', 'guantes en mal estado'] },
  { item: 'Calzado de seguridad', palabras: ['sin zapatos de seguridad', 'zapatos dañados', 'zapatos rotos', 'zapatos en mal estado'] },
  { item: 'Chaleco reflectante', palabras: ['sin chaleco', 'chaleco roto', 'chaleco dañado'] },
  { item: 'Protector auditivo', palabras: ['sin proteccion auditiva', 'sin protección auditiva', 'tapones dañados'] },
  { item: 'Arnés de seguridad', palabras: ['sin arnes', 'sin arnés', 'arnes dañado', 'arnés dañado', 'arnes roto', 'arnés roto', 'arnes en mal estado'] },
  { item: 'Mascarilla', palabras: ['sin mascarilla', 'mascarilla rota', 'sin respirador', 'respirador dañado'] },
  { item: 'Careta facial', palabras: ['sin careta', 'careta rota', 'careta dañada'] },
];
function sugerirReposicionEpp(texto) {
  const t = (texto || '').toLowerCase();
  for (const regla of REGLAS_SUGERENCIA_EPP) {
    if (regla.palabras.some(p => t.includes(p))) return regla.item;
  }
  if (t.includes('epp') && /(sin |falta|dañad|roto|rota|perdio|perdió|no tenia|no tenía)/.test(t)) return 'EPP';
  return null;
}
const PALABRAS_MANTENCION = [
  'herramienta dañada', 'herramienta en mal estado', 'equipo defectuoso', 'equipo dañado',
  'equipo en mal estado', 'maquina dañada', 'máquina dañada', 'maquina defectuosa', 'máquina defectuosa',
  'no funciona', 'esmeril malo', 'esmeril dañado', 'taladro dañado', 'sierra dañada', 'cable pelado',
];
function sugerirMantencion(texto) {
  const t = (texto || '').toLowerCase();
  return PALABRAS_MANTENCION.some(p => t.includes(p)) ? 'Revisar y dar mantención al equipo/herramienta involucrada' : null;
}
function sugerirPlanAccion(descripcion, causas) {
  const texto = `${descripcion || ''} ${causas || ''}`;
  const itemEpp = sugerirReposicionEpp(texto);
  if (itemEpp) return { tipo: 'epp', valor: itemEpp };
  const mantencion = sugerirMantencion(texto);
  if (mantencion) return { tipo: 'mantencion', valor: mantencion };
  const tema = sugerirTemaCharla(texto);
  if (tema) return { tipo: 'charla', valor: tema };
  return null;
}

let userEmail = null;
let userRole  = null; // admin | prevencionista | viewer

// Si el correo logueado aparece en USUARIOS con Rol="subcontratista", queda
// aquí el nombre de SU empresa (no null) — eso activa el modo restringido:
// la app muestra únicamente la pantalla fija de esa empresa (mostrarModoSubcontratista),
// sin sidebar, sin Inicio y sin acceso a ningún otro módulo (ver arrancarApp).
let miEmpresaSubcontratista = null;
// true cuando esta cuenta no tiene acceso directo de Editor al Sheet/Drive
// y en vez de eso se está usando la Web App de Apps Script como proxy
// (ver llamarWebAppSubcontratista) — se detecta solo, no hay que
// configurar nada aparte de SUBCONTRATISTAS_WEBAPP_URL en config.js.
let subcontratistaUsaProxy = false;
// Si el correo logueado coincide con el Correo de un trabajador marcado
// "Es Supervisor" (Activo), queda acá su ficha completa — activa el modo
// restringido de supervisor: solo ve lo de su propia obra y, dentro de los
// módulos con datos de trabajadores, solo lo relacionado a su equipo
// asignado (Trabajador.Supervisor Asignado) — ver
// detectarModoSupervisor()/miEquipoActual() y los render* de cada módulo.
// A diferencia de Subcontratistas, SÍ ve el resto de la UI (sidebar,
// Inicio, etc.), solo cambia qué datos le llegan filtrados.
let miSupervisorPerfil = null;

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
  localStorage.removeItem(OBRA_ACTIVA_KEY);
  userEmail = null; userRole = null; miEmpresaSubcontratista = null; subcontratistaUsaProxy = false;
  obraActiva = null;
  document.getElementById('main').classList.add('hidden');
  document.getElementById('desktop-home').classList.add('dt-oculto');
  document.getElementById('desktop-sidebar').classList.add('dt-oculto');
  document.getElementById('desktop-main').classList.add('dt-oculto');
  document.getElementById('subcontratista-root').classList.add('hidden');
  mostrarLogin('Usa tu cuenta corporativa autorizada', false);
}

// pdf-lib.min.js (≈525KB) solo hace falta al generar un PDF (Charla, DIAT,
// Investigación, HCR) — antes se cargaba en un <script> bloqueante en TODA
// carga de la app. Se carga bajo demanda, una sola vez, justo antes del
// primer uso real.
let pdfLibPromise = null;
function cargarPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  if (!pdfLibPromise) {
    pdfLibPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/pdf-lib.min.js';
      s.onload = () => resolve(window.PDFLib);
      s.onerror = () => { pdfLibPromise = null; reject(new Error('No se pudo cargar pdf-lib')); };
      document.head.appendChild(s);
    });
  }
  return pdfLibPromise;
}
// vendor/exceljs.min.js (≈925KB) solo hace falta al generar el Excel de la
// Matriz IPER — mismo patrón de carga bajo demanda que cargarPdfLib. Se
// usa ExcelJS (no xlsx/SheetJS) porque es la única librería vendorizable
// que sabe ESCRIBIR celdas con color/relleno — necesario para que el Excel
// generado se vea igual al Excel original del cliente.
let exceljsLibPromise = null;
function cargarExcelJsLib() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  if (!exceljsLibPromise) {
    exceljsLibPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/exceljs.min.js';
      s.onload = () => resolve(window.ExcelJS);
      s.onerror = () => { exceljsLibPromise = null; reject(new Error('No se pudo cargar ExcelJS')); };
      document.head.appendChild(s);
    });
  }
  return exceljsLibPromise;
}
// vendor/miper-banco.js (≈240KB) trae el banco histórico de la Matriz IPER
// (filas Proceso/Tarea/Peligro/Riesgo ya usadas en obras anteriores, para
// copiar en vez de re-tipear) — solo hace falta al abrir ese buscador.
let miperBancoPromise = null;
function cargarMiperBanco() {
  if (window.MIPER_BANCO_HISTORICO) return Promise.resolve(window.MIPER_BANCO_HISTORICO);
  if (!miperBancoPromise) {
    miperBancoPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/miper-banco.js';
      s.onload = () => resolve(window.MIPER_BANCO_HISTORICO || []);
      s.onerror = () => { miperBancoPromise = null; reject(new Error('No se pudo cargar el banco histórico')); };
      document.head.appendChild(s);
    });
  }
  return miperBancoPromise;
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
// Trae varios rangos en una sola llamada HTTP (values:batchGet) en vez de
// una request por hoja — cargarTodo() pedía hasta 11 hojas por separado;
// agrupadas así el arranque de la app pasa de ~11 round-trips a 1 sola.
async function fetchSheetsBatch(ranges) {
  await ensureToken();
  const query = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values:batchGet?${query}`;
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) throw new Error(friendlyErr(res.status, await res.text()));
  const data = await res.json();
  return ranges.map((r, i) => (data.valueRanges[i] && data.valueRanges[i].values) || []);
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
  const data = await res.json();
  // Google Sheets le pega el formato del encabezado (verde/negrita) a
  // cualquier fila nueva agregada por la API — no es algo de una sola vez
  // (crearHoja en APPS_SCRIPT_INIT.js limpia lo ya existente, pero cada
  // fila NUEVA sale igual verde). Se limpia acá, en cada append, sin
  // esperar la respuesta (es solo estética — no debe demorar el guardado
  // ni bloquear si falla).
  if (data.updates && data.updates.updatedRange) limpiarFormatoFilaNueva(data.updates.updatedRange);
  return data;
}

// Mapa nombre-de-hoja → sheetId numérico (la API de formato lo pide por
// ID, no por nombre) — se pide una sola vez y se reutiliza.
let sheetIdsCache = null;
async function obtenerSheetIds() {
  if (sheetIdsCache) return sheetIdsCache;
  await ensureToken();
  const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}?fields=sheets.properties(sheetId,title)`;
  const res = await fetch(url, { headers: authHeader() });
  if (!res.ok) throw new Error(friendlyErr(res.status, await res.text()));
  const data = await res.json();
  sheetIdsCache = {};
  data.sheets.forEach(s => { sheetIdsCache[s.properties.title] = s.properties.sheetId; });
  return sheetIdsCache;
}
async function limpiarFormatoFilaNueva(updatedRange) {
  try {
    const m = /^'?([^'!]+)'?!([A-Za-z]+)(\d+)(?::([A-Za-z]+)(\d+))?$/.exec(updatedRange);
    if (!m) return;
    const nombreHoja = m[1], filaInicio = m[3], filaFin = m[5] || m[3];
    const ids = await obtenerSheetIds();
    const sheetId = ids[nombreHoja];
    if (sheetId == null) return;
    await ensureToken();
    await fetch(`${SHEETS_BASE}/${CONFIG.SHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        requests: [{
          repeatCell: {
            range: { sheetId, startRowIndex: parseInt(filaInicio, 10) - 1, endRowIndex: parseInt(filaFin, 10) },
            cell: { userEnteredFormat: {
              backgroundColor: { red: 1, green: 1, blue: 1 },
              textFormat: { foregroundColor: { red: 0, green: 0, blue: 0 }, bold: false },
            } },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        }],
      }),
    });
  } catch (e) { console.warn('No se pudo limpiar el formato de la fila nueva', e); }
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
// Carpeta personal del trabajador (Trabajadores/{nombre}/) — ahí quedan juntos
// todos sus archivos (foto, contrato, examen de altura, firmas de EPP, etc.)
// en vez de mezclados con los de todos los demás en carpetas por tipo de dato.
async function getTrabajadorFolder(nombreTrabajador) {
  const raiz = await getModuloFolder('Trabajadores');
  return findOrCreateFolder(nombreTrabajador, raiz);
}

// Sube un archivo (File o Blob) a una carpeta de Drive ya resuelta, con el
// nombre exacto indicado. Devuelve {id, name, link}
async function subirBytesADrive(fileOrBlob, folderId, fileName) {
  await ensureToken();
  toast('Subiendo archivo...');
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
// Sube un archivo (File o Blob) a una carpeta de Drive ya resuelta, con un
// nombre generado a partir de un prefijo + fecha/hora. Devuelve {id, name, link}
async function uploadFileToFolder(fileOrBlob, folderId, prefixName, ext) {
  const fecha = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
  const hora = new Date().toTimeString().slice(0,5).replace(':','');
  const extension = ext || (fileOrBlob.name ? fileOrBlob.name.split('.').pop() : 'jpg');
  const fileName = `${prefixName}_${fecha}_${hora}.${extension}`;
  return subirBytesADrive(fileOrBlob, folderId, fileName);
}
// Sube un archivo a una subcarpeta del módulo (Root/{nombreModulo}/)
async function uploadFile(fileOrBlob, nombreModulo, prefixName, ext) {
  const folderId = await getModuloFolder(nombreModulo);
  return uploadFileToFolder(fileOrBlob, folderId, prefixName, ext);
}
// Sube un archivo a la carpeta personal del trabajador (Root/Trabajadores/{nombre}/)
async function uploadFileTrabajador(fileOrBlob, nombreTrabajador, prefixName, ext) {
  const folderId = await getTrabajadorFolder(nombreTrabajador);
  return uploadFileToFolder(fileOrBlob, folderId, prefixName, ext);
}
// Carpeta de cada subcontratista (Root/Subcontratistas/{empresa}/) — mismo
// Drive que usa el resto de la app (así lo pidió el cliente); el
// aislamiento entre empresas es a nivel de la interfaz y de a quién se le
// entrega el correo/USUARIOS, igual que ya funciona hoy el resto de la app.
async function getSubcontratistaFolder(empresa) {
  const raiz = await getModuloFolder('Subcontratistas');
  return findOrCreateFolder(empresa, raiz);
}
async function uploadFileSubcontratista(fileOrBlob, empresa, prefixName, ext) {
  const folderId = await getSubcontratistaFolder(empresa);
  return uploadFileToFolder(fileOrBlob, folderId, prefixName, ext);
}

// Llama a la Web App de Apps Script (ver APPS_SCRIPT_WEBAPP_SUBCONTRATISTAS.js)
// para cuentas subcontratistas SIN acceso directo al Sheet/Drive — el
// script corre siempre con los permisos de quien lo desplegó, así que esta
// llamada no necesita ningún token ni scope de Google por parte de quien
// la hace. Content-Type "text/plain" a propósito (no "application/json"):
// Apps Script no responde al preflight OPTIONS que el navegador manda
// para JSON, así que hay que mandarlo como "simple request" para evitar
// el error de CORS.
async function llamarWebAppSubcontratista(accion, datos) {
  if (!CONFIG.SUBCONTRATISTAS_WEBAPP_URL) throw new Error('Falta configurar SUBCONTRATISTAS_WEBAPP_URL en config.js');
  const res = await fetch(CONFIG.SUBCONTRATISTAS_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion, correo: userEmail, ...datos }),
  });
  if (!res.ok) throw new Error('Error ' + res.status + ' llamando a la Web App de Subcontratistas');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// Sugerencias con IA para la Matriz de Riesgos (MIPER) — ver
// APPS_SCRIPT_WEBAPP_MIPER_IA.js. Mismo motivo de Content-Type
// "text/plain" que llamarWebAppSubcontratista (evita el preflight OPTIONS
// que Apps Script no responde).
async function llamarWebAppMiperIa(datos) {
  if (!CONFIG.MIPER_IA_WEBAPP_URL) throw new Error('Falta configurar MIPER_IA_WEBAPP_URL en config.js');
  const res = await fetch(CONFIG.MIPER_IA_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion: 'sugerirRiesgos', ...datos }),
  });
  if (!res.ok) throw new Error('Error ' + res.status + ' llamando a la Web App de sugerencias IA');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// ── UI helpers ───────────────────────────────────────────────
function splash(pct, hint) {
  const fill = document.getElementById('splash-progress');
  if (!fill) return;
  if (pct > 0) fill.classList.remove('splash-waiting');
  fill.style.width = pct + '%';
  if (hint) document.getElementById('splash-hint').textContent = hint;
}

function toast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 2600);
  // Si el guardado falló, el botón "Guardando..." (ver el listener de
  // submit más arriba) se reactiva para que el usuario pueda reintentar.
  if (type === 'error') reactivarBotonesGuardar();
}
// ── Íconos SVG minimalistas (mismo estilo de línea que la app de Flota) ──
const ICONS = {
  inspecciones: '<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="4" width="12" height="17" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M9 4V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4" stroke="currentColor" stroke-width="1.7"/><path d="M9 12.5l1.8 1.8L15 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 17h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  incidentes: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 2 20h20L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9.5v4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17" r="1" fill="currentColor"/></svg>',
  procedimientos: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 3v4h4" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.5 12h6M9.5 15.5h6M9.5 8.5h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  epp: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 16.5a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 6.5v3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="2" y="16.5" width="20" height="3" rx="1.3" stroke="currentColor" stroke-width="1.7"/></svg>',
  trabajadores: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="7.5" r="3.5" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  charlas: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 5h16v11H9l-4 4v-4H4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 9h8M8 12.3h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  hcr: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3 2 20h20L12 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.5 16h5M12 9v4.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  camara: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 8a1 1 0 0 1 1-1h2l1.2-2h7.6L17 7h2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.4" stroke="currentColor" stroke-width="1.7"/></svg>',
  documento: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3h7l4 4v14H7Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M14 3v4h4" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  firma: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 17c2.5-1 4.5-1 6.5 0s4.5 1 6.5 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6 13.5 15 4.5a1.7 1.7 0 0 1 2.4 2.4L8.4 15.9l-3 0.7.6-3.1Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  obra: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 21V8l6-4 6 4v13" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M14 21v-7h6v7" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 10h.01M12 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  lupa: '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  carpeta: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 6.5a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  hoja: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="3.5" width="16" height="17" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M4 9h16M4 14.5h16M9.5 9v11.5" stroke="currentColor" stroke-width="1.5"/></svg>',
  subcontratistas: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 21V6a1 1 0 0 1 1-1h6v16" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M11 10.5h8a1 1 0 0 1 1 1V21h-9" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M7 8h.01M7 11h.01M7 14h.01M7 17h.01M14.5 13.5h.01M14.5 16.5h.01M17.5 13.5h.01M17.5 16.5h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  refrescar: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 0 1 13.66-5.66M20 12a8 8 0 0 1-13.66 5.66" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 3v4h-4M7 21v-4h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  salir: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  programapersonalizado: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="17" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 2.5v3M16 2.5v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4 9.5h16" stroke="currentColor" stroke-width="1.5"/><path d="M8 13.5l2 2 4-4.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  miper: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2 3 6.5v6C3 17 6.9 20.7 12 22c5.1-1.3 9-5 9-9.5v-6L12 2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 8v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>',
  capacitacion: '<svg viewBox="0 0 24 24" fill="none"><path d="M2 8l10-4 10 4-10 4L2 8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6 10.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-5.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M21 8v6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M8 12.3l2.5 2.5L16 9.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};
// La tarjeta de Capacitación DS44 en el home usa la misma clave que su
// color (`capacitacionds44`, ver MODULOS_COLOR) — nunca se le había
// agregado un ícono propio a ICONS, así que la tarjeta mostraba el texto
// "undefined" en vez de un ícono. Reusa el birrete de ICONS.capacitacion.
ICONS.capacitacionds44 = ICONS.capacitacion;
function ic(name, size) { return ICONS[name].replace('<svg ', `<svg style="width:${size||14}px;height:${size||14}px;vertical-align:-3px;flex-shrink:0" `); }

// Color de cada módulo — se usa tanto para las tarjetas de Inicio como
// para el header del sidebar de escritorio (cambia de color según el
// módulo activo, igual que en Flota).
// Cada módulo tiene su propio color, sin repetir ninguno (antes solo
// había 5 colores para 11 módulos y se repetían — a pedido del cliente,
// que no lograba distinguir bien las tarjetas del mismo color).
const MODULOS_COLOR = {
  inspecciones: 'flota', incidentes: 'and', procedimientos: 'cont',
  epp: 'mov', trabajadores: 'inv', charlas: 'teal', hcr: 'purpura',
  subcontratistas: 'indigo', programapersonalizado: 'rosa', miper: 'oliva',
  capacitacionds44: 'gris',
};

function renderModulosHome() {
  const modulos = [
    { key: 'inspecciones', nombre: 'Inspecciones', desc: 'Con foto y alerta de charla automática' },
    { key: 'incidentes', nombre: 'Incidentes y Accidentes', desc: 'Registro con evidencia fotográfica' },
    { key: 'procedimientos', nombre: 'Procedimientos de Trabajo Seguro', desc: 'PTS vigentes de la obra' },
    { key: 'epp', nombre: 'Entrega de EPP', desc: 'Con firma digital del trabajador' },
    { key: 'trabajadores', nombre: 'Trabajadores', desc: 'Nómina de la obra' },
    { key: 'charlas', nombre: 'Charlas de Seguridad', desc: 'Alertas generadas por inspecciones' },
    { key: 'hcr', nombre: 'Hoja de Control de Riesgos (HCR)', desc: 'Registro diario por cuadrilla, antes de ejecutar el trabajo' },
    { key: 'subcontratistas', nombre: 'Subcontratistas', desc: 'Documentación y control por empresa' },
    { key: 'programapersonalizado', nombre: 'Programa Personalizado', desc: 'Cumplimiento mensual por supervisor' },
    { key: 'miper', nombre: 'Matriz de Riesgos (IPER)', desc: 'Identificación de peligros y evaluación de riesgos DS44' },
    { key: 'capacitacionds44', nombre: 'Capacitación DS44 (8 hrs)', desc: 'Curso obligatorio art.16 — vigencia 2 años' },
  ]
    // Un supervisor logueado (ver miSupervisorPerfil) no ve Entrega de EPP
    // en absoluto — a pedido explícito, ese módulo queda fuera de su vista.
    .filter(m => !(miSupervisorPerfil && m.key === 'epp'))
    .map(m => ({ ...m, color: MODULOS_COLOR[m.key] }));
  setListHTML('modulos-home', modulos.map(m => `
    <div class="modulo-card modulo-card--${m.color}" onclick="irPagina('${m.key}')">
      <div class="modulo-icon modulo-icon--${m.color}">${ICONS[m.key]}</div>
      <div class="modulo-info"><div class="modulo-nombre">${m.nombre}</div><div class="modulo-desc">${m.desc}</div></div>
    </div>`).join(''));
}
// Enlaces directos a la carpeta de Drive y al Google Sheet que usa la app
// (Inicio, móvil y escritorio) — útiles para revisar archivos/datos crudos
// sin tener que pasar por la app.
function configurarAccesosDirectos() {
  const driveUrl = `https://drive.google.com/drive/folders/${CONFIG.DRIVE_ROOT_FOLDER}`;
  const sheetsUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/edit`;
  const drive = `${ic('carpeta', 14)} Abrir carpeta de Drive`;
  const sheets = `${ic('hoja', 14)} Abrir Google Sheet`;
  ['link-drive', 'dt-link-drive'].forEach(id => {
    const el = document.getElementById(id);
    el.href = driveUrl; el.innerHTML = drive;
  });
  ['link-sheets', 'dt-link-sheets'].forEach(id => {
    const el = document.getElementById(id);
    el.href = sheetsUrl; el.innerHTML = sheets;
  });
}

function setListHTML(name, html) {
  document.querySelectorAll(`[data-list="${name}"]`).forEach(el => el.innerHTML = html);
}
function setStat(name, value) {
  document.querySelectorAll(`[data-stat="${name}"]`).forEach(el => el.textContent = value);
}

// ── Evita guardados duplicados por doble clic ───────────────────────────
// A pedido explícito: algunos usuarios aprietan varias veces "Guardar"
// porque no ven feedback inmediato, y terminan creando filas duplicadas.
// Solución genérica para TODA la app (no solo un formulario): apenas se
// envía cualquier <form>, se desactiva su botón de submit al vuelo (con
// texto "Guardando..." para que quede claro que el clic sí se registró) —
// así un segundo/tercer clic mientras la llamada a Sheets está en curso
// no dispara otro guardado. No hace falta tocar cada guardarXxx() para
// esto: se reactiva solo (ver reactivarBotonesGuardar) si el guardado
// falla (toast de error) o si el panel se vuelve a abrir — los casos de
// éxito no necesitan reactivarlo porque el panel se cierra o la vista se
// refresca. Captura en fase de "capture" para desactivar el botón ANTES
// de que corra el onsubmit="guardarXxx(event)" del formulario.
document.addEventListener('submit', (ev) => {
  const form = ev.target;
  if (!(form instanceof HTMLFormElement)) return;
  const btn = form.querySelector('button[type="submit"]');
  if (!btn || btn.disabled) return;
  btn.dataset.textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Guardando...';
}, true);
function reactivarBotonesGuardar(scope) {
  (scope || document).querySelectorAll('button[type="submit"]:disabled').forEach(btn => {
    btn.disabled = false;
    if (btn.dataset.textoOriginal !== undefined) { btn.textContent = btn.dataset.textoOriginal; delete btn.dataset.textoOriginal; }
  });
}
function openPanel(id) {
  const el = document.getElementById(id);
  // Red de seguridad extra contra el botón "Guardando..." que pudiera
  // quedar pegado (ver listener de submit más arriba): cada vez que se
  // abre un panel, sus botones de guardar quedan frescos y listos.
  reactivarBotonesGuardar(el);
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
// Escala una firma para su casillero en un PDF, priorizando aprovechar el
// ANCHO completo del casillero en vez de ajustarla entera adentro
// (img.scaleToFit clásico): la mayoría de los casilleros de firma son
// mucho más anchos que altos, pero el trazo de una firma real suele ser
// más parecido a un cuadrado — ajustarla solo por alto dejaba mucho ancho
// sin usar y se veía chica, aunque el trazo ya viniera recortado al área
// real de tinta (ver recortarFirma). Se permite pasarse del alto del
// casillero hasta 1.8x (a pedido explícito: mejor que se note un poco
// más grande, aunque se pase un poco hacia arriba/abajo de la línea, en
// vez de verse diminuta) — sigue centrada en la línea por quien la dibuja.
function escalarFirmaCasillero(img, w, h) {
  const porAncho = w / img.width;
  const alturaConAncho = img.height * porAncho;
  const alturaMaxima = h * 1.8;
  if (alturaConAncho <= alturaMaxima) return { width: w, height: alturaConAncho };
  const escala = alturaMaxima / img.height;
  return { width: img.width * escala, height: alturaMaxima };
}
function fmtFecha(d) { return new Date(d).toLocaleDateString('es-CL'); }
function hoyISO() { return new Date().toISOString().slice(0,10); }
function horaActual() { return new Date().toTimeString().slice(0,5); }

// Edad y antigüedad calculadas al vuelo a partir de los datos estáticos del
// trabajador (fecha de nacimiento / fecha de ingreso), en vez de pedirlas de
// nuevo cada vez que se llena un documento (DIAT, Investigación, etc.).
function calcularEdad(fechaNacimiento, fechaRef) {
  if (!fechaNacimiento) return '';
  const nac = new Date(fechaNacimiento + 'T00:00:00');
  const ref = new Date((fechaRef || hoyISO()) + 'T00:00:00');
  let edad = ref.getFullYear() - nac.getFullYear();
  const m = ref.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < nac.getDate())) edad--;
  return edad >= 0 ? edad : '';
}
function calcularAntiguedad(fechaInicio, fechaRef) {
  if (!fechaInicio) return null;
  const d1 = new Date(fechaInicio + 'T00:00:00');
  const d2 = new Date((fechaRef || hoyISO()) + 'T00:00:00');
  const dias = Math.round((d2 - d1) / 86400000);
  if (dias < 0) return null;
  if (dias >= 365) return { valor: Math.floor(dias / 365), unidad: 'Años' };
  if (dias >= 30) return { valor: Math.floor(dias / 30), unidad: 'Meses' };
  return { valor: dias, unidad: 'Días' };
}

// ============================================================
// DATOS EN MEMORIA
// ============================================================
let allTrabajadores = [];
let allInspecciones = [];
let allIncidentes = [];
let allProcedimientos = [];
let allEpp = [];
let allCharlas = [];
let allInvestigaciones = [];
let allHcr = [];
let allDiat = [];
let allUsuarios = [];
let allSubcontratistas = [];
let allSubDocs = [];
let allProgramaPersonalizado = [];
let allMiperLevantamiento = [];
let allMiperMatriz = [];
let allMiperDocumentos = [];
let allMiperPrograma = [];
let allCapacitacionDs44 = [];

// Renderiza todos los módulos "principales" de una sola vez — se llama tanto
// al terminar de cargar datos como al elegir/cambiar la Obra activa (ver
// "Selector de Obra activa" más abajo), para no repetir esta lista en los
// dos lugares. Subcontratistas y Procedimientos NO se filtran por obra (ver
// esos render*): Subcontratistas es por diseño un módulo aparte, ajeno a la
// Obra; Procedimientos es una biblioteca general de documentos que hoy no
// tiene ese campo en el modelo de datos.
function renderModulosPrincipales() {
  renderModulosHome();
  renderDashboard();
  renderTrabajadores(); renderInspecciones(); renderIncidentes(); renderProcedimientos(); renderEpp(); renderCharlas(); renderHcr();
  renderSubcontratistas();
  renderProgramaPersonalizado();
  renderMiper();
  renderCapacitacionDs44();
}

async function cargarTodo(silencioso) {
  if (!silencioso) { splash(15, 'Verificando acceso...'); }
  else { toast('Actualizando datos...'); }
  try {
    // Si en una carga anterior ya detectamos que esta cuenta no tiene
    // acceso directo al Sheet (ver más abajo), no hace falta repetir ese
    // intento fallido cada vez — se va derecho por la Web App.
    if (subcontratistaUsaProxy) {
      const chequeo = await llamarWebAppSubcontratista('verificarAcceso', {});
      if (!chequeo.subcontratista) throw new Error('Esta cuenta ya no tiene acceso.');
      miEmpresaSubcontratista = chequeo.empresa;
      const { filas } = await llamarWebAppSubcontratista('listarDocumentos', { empresa: miEmpresaSubcontratista });
      allSubDocs = filas.map((r,i) => rowToSubDoc(r,i));
      if (!silencioso) splash(100, '¡Listo!'); else toast('Datos actualizados ✓', 'ok');
      return;
    }

    // USUARIOS se lee primero y aparte: determina si esta cuenta es un
    // subcontratista restringido, ANTES de decidir qué más hace falta
    // cargar (a una cuenta restringida no le pedimos el resto de las hojas
    // de la operación de LST — más rápido y evita traer al navegador datos
    // que esa cuenta de todas formas nunca va a ver en la interfaz).
    let usuarios;
    try {
      usuarios = await fetchSheet(`'${CONFIG.SHEET_USUARIOS}'!A2:D2000`);
    } catch (errAccesoDirecto) {
      // Sin acceso directo al Sheet: si hay una Web App configurada
      // (ver config.js SUBCONTRATISTAS_WEBAPP_URL), puede que esta cuenta
      // sea justo un subcontratista al que a propósito no se le dio acceso
      // de Editor — se verifica por ahí antes de darnos por vencidos.
      if (!CONFIG.SUBCONTRATISTAS_WEBAPP_URL) throw errAccesoDirecto;
      const chequeo = await llamarWebAppSubcontratista('verificarAcceso', {});
      if (!chequeo.subcontratista) throw errAccesoDirecto;
      subcontratistaUsaProxy = true;
      miEmpresaSubcontratista = chequeo.empresa;
      const { filas } = await llamarWebAppSubcontratista('listarDocumentos', { empresa: miEmpresaSubcontratista });
      allSubDocs = filas.map((r,i) => rowToSubDoc(r,i));
      if (!silencioso) splash(100, '¡Listo!'); else toast('Datos actualizados ✓', 'ok');
      return;
    }
    allUsuarios = usuarios.map((r,i) => rowToUsuario(r,i));
    const cuenta = allUsuarios.find(u => u.correo === (userEmail||'').toLowerCase());
    miEmpresaSubcontratista = (cuenta && cuenta.rol === 'subcontratista') ? cuenta.empresa : null;

    if (!silencioso) splash(40, 'Cargando información...');

    if (miEmpresaSubcontratista) {
      const [subs, docs] = await fetchSheetsBatch([
        `'${CONFIG.SHEET_SUBCONTRATISTAS}'!A2:B2000`,
        `'${CONFIG.SHEET_SUBCONTRATISTAS_DOCS}'!A2:H2000`,
      ]);
      allSubcontratistas = subs.map((r,i) => rowToSubcontratista(r,i));
      allSubDocs = docs.map((r,i) => rowToSubDoc(r,i));
      if (!silencioso) splash(100, '¡Listo!');
      else toast('Datos actualizados ✓', 'ok');
      return;
    }

    const [trab, insp, inc, proc, epp, charlas, invest, hcr, diat, subs, docs, prog, miperLev, miperMat, miperRiesgos, miperDocs, miperProg, capDs44] = await fetchSheetsBatch([
      `'${CONFIG.SHEET_TRABAJADORES}'!A2:AC2000`,
      `'${CONFIG.SHEET_INSPECCIONES}'!A2:M2000`,
      `'${CONFIG.SHEET_INCIDENTES}'!A2:V2000`,
      `'${CONFIG.SHEET_PROCEDIMIENTOS}'!A2:I2000`,
      `'${CONFIG.SHEET_EPP}'!A2:J2000`,
      `'${CONFIG.SHEET_CHARLAS}'!A2:N2000`,
      `'${CONFIG.SHEET_INVESTIGACIONES}'!A2:AT2000`,
      `'${CONFIG.SHEET_HCR}'!A2:V2000`,
      `'${CONFIG.SHEET_DIAT}'!A2:BA2000`,
      `'${CONFIG.SHEET_SUBCONTRATISTAS}'!A2:B2000`,
      `'${CONFIG.SHEET_SUBCONTRATISTAS_DOCS}'!A2:H2000`,
      `'${CONFIG.SHEET_PROGRAMA_PERSONALIZADO}'!A2:L4000`,
      `'${CONFIG.SHEET_MIPER_LEVANTAMIENTO}'!A2:L2000`,
      `'${CONFIG.SHEET_MIPER_MATRIZ}'!A2:R4000`,
      `'${CONFIG.SHEET_MIPER_RIESGOS_CUSTOM}'!A2:H500`,
      `'${CONFIG.SHEET_MIPER_DOCUMENTOS}'!A2:P500`,
      `'${CONFIG.SHEET_MIPER_PROGRAMA}'!A2:H4000`,
      `'${CONFIG.SHEET_CAPACITACION_DS44}'!A2:M3000`,
    ]);
    if (!silencioso) splash(85, 'Preparando la app...');
    allTrabajadores = trab.map((r,i) => rowToTrabajador(r,i));
    detectarModoSupervisor();
    allInspecciones = insp.map((r,i) => rowToInspeccion(r,i));
    allIncidentes = inc.map((r,i) => rowToIncidente(r,i));
    allProcedimientos = proc.map((r,i) => rowToProcedimiento(r,i));
    allEpp = epp.map((r,i) => rowToEpp(r,i));
    allCharlas = charlas.map((r,i) => rowToCharla(r,i));
    allInvestigaciones = invest.map((r,i) => ({ fila: i+2, n: r[0]||'' }));
    allHcr = hcr.map((r,i) => ({ fila: i+2, n: r[0]||'', fecha: r[1]||'', obra: r[2]||'', actividad: r[3]||'', area: r[4]||'', supervisor: r[15]||'', pdf: r[19]||'' }));
    allDiat = diat.map((r,i) => ({ fila: i+2, n: r[0]||'' }));
    allSubcontratistas = subs.map((r,i) => rowToSubcontratista(r,i));
    allSubDocs = docs.map((r,i) => rowToSubDoc(r,i));
    allProgramaPersonalizado = prog.map((r,i) => rowToProgramaPersonalizado(r,i));
    allMiperLevantamiento = miperLev.map((r,i) => rowToMiperLevantamiento(r,i));
    allMiperMatriz = miperMat.map((r,i) => rowToMiperMatriz(r,i));
    allMiperRiesgosCustom = miperRiesgos.map((r,i) => rowToMiperRiesgoCustom(r,i));
    allMiperDocumentos = miperDocs.map((r,i) => rowToMiperDocumento(r,i));
    allMiperPrograma = miperProg.map((r,i) => rowToMiperPrograma(r,i));
    allCapacitacionDs44 = capDs44.map((r,i) => rowToCapacitacionDs44(r,i));
    renderModulosPrincipales();
    if (!silencioso) splash(100, '¡Listo!');
    else toast('Datos actualizados ✓', 'ok');
  } catch (e) {
    console.error(e);
    if (!silencioso) splash(100, 'Hubo un problema al cargar');
    toast(e.message, 'error');
  }
}

// ── Mapeo de filas ───────────────────────────────────────────
function rowToTrabajador(r, i) {
  return { fila: i+2, n: r[0]||'', nombre: r[1]||'', rut: r[2]||'', cargo: r[3]||'', empresa: r[4]||'',
    fechaIngreso: r[5]||'', estado: r[6]||'Activo', foto: r[7]||'', fechaRegistro: r[8]||'',
    obra: r[9]||'', contratoInicio: r[10]||'', contratoTermino: r[11]||'', contratoArchivo: r[12]||'',
    alturaVigencia: r[13]||'', alturaArchivo: r[14]||'', esSupervisor: r[15]==='Sí',
    // Datos personales estáticos — no cambian entre incidentes, se usan para
    // prellenar documentos legales (DIAT, Investigación de Accidente, etc.)
    fechaNacimiento: r[16]||'', sexo: r[17]||'', nacionalidad: r[18]||'', direccion: r[19]||'',
    comuna: r[20]||'', telefono: r[21]||'', puebloOriginario: r[22]||'', tipoContrato: r[23]||'',
    tipoIngreso: r[24]||'', categoriaOcupacional: r[25]||'', correo: r[26]||'',
    especialidadesSupervisor: (r[27]||'').split(';').map(x=>x.trim()).filter(Boolean),
    supervisorAsignado: r[28]||'' };
}
// Especialidades que puede cubrir un supervisor (mismo catálogo que Temas de
// Charla/Inspección, para poder cruzarlas directamente). "Otro" no aplica
// como especialidad puntual, se excluye.
const ESPECIALIDADES_SUPERVISOR = TEMAS_CHARLA.filter(t => t !== 'Otro');
// Un trabajador es "supervisor de obra" de todos los demás trabajadores
// activos de su misma Obra (no hay asignación individual: se sigue el
// mismo patrón simple de "Obra" ya usado en el resto de la app). Si se pasa
// un "tema" (especialidad), se prioriza al supervisor de esa obra cuyas
// especialidades lo incluyan; si nadie calza se cae a un supervisor
// "general" (sin especialidades marcadas, cubre cualquier tema) y, si
// tampoco hay, al primer supervisor activo de la obra.
function supervisorDeObra(obra, tema) {
  if (!obra) return null;
  const sups = allTrabajadores.filter(t => t.esSupervisor && t.obra === obra && t.estado === 'Activo');
  if (sups.length === 0) return null;
  if (tema) {
    const porEspecialidad = sups.find(t => t.especialidadesSupervisor.includes(tema));
    if (porEspecialidad) return porEspecialidad;
  }
  return sups.find(t => t.especialidadesSupervisor.length === 0) || sups[0];
}
// "A cargo" ahora es una asignación manual real (Trabajador.Supervisor
// Asignado, ver abrirAsignarSupervisor/abrirEditarEquipoSupervisor) — antes
// era simplemente "todos los demás activos de la misma Obra", lo que hacía
// que dos supervisores de una misma obra compartieran exactamente el mismo
// equipo y las mismas métricas de EPP/personal nuevo duplicadas.
function trabajadoresACargoDe(supervisor) {
  return allTrabajadores.filter(t => t.estado === 'Activo' && t.supervisorAsignado === supervisor.nombre);
}
// Detecta si la cuenta logueada es un supervisor (correo coincide con el
// de un trabajador "Es Supervisor" Activo) — ver miSupervisorPerfil.
function detectarModoSupervisor() {
  const correo = (userEmail || '').trim().toLowerCase();
  miSupervisorPerfil = correo
    ? allTrabajadores.find(t => t.esSupervisor && t.estado === 'Activo' && (t.correo||'').trim().toLowerCase() === correo) || null
    : null;
}
// Set con los nombres del equipo del supervisor logueado, o null si esta
// cuenta no está en modo supervisor — usarlo así: `equipo && equipo.has(nombre)`.
function miEquipoActual() {
  return miSupervisorPerfil ? new Set(trabajadoresACargoDe(miSupervisorPerfil).map(t => t.nombre)) : null;
}
function rowToInspeccion(r, i) {
  return { fila: i+2, n: r[0]||'', fecha: r[1]||'', tipo: r[2]||'', area: r[3]||'', inspector: r[4]||'',
    tema: r[5]||'', hallazgos: r[6]||'', riesgo: r[7]||'Bajo', foto: r[8]||'', accion: r[9]||'',
    estado: r[10]||'Abierta', fechaRegistro: r[11]||'', obra: r[12]||'' };
}
function rowToIncidente(r, i) {
  return { fila: i+2, n: r[0]||'', fecha: r[1]||'', tipo: r[2]||'', trabajador: r[3]||'', area: r[4]||'',
    descripcion: r[5]||'', causas: r[6]||'', gravedad: r[7]||'', foto: r[8]||'', accion: r[9]||'',
    estado: r[10]||'Abierto', fechaRegistro: r[11]||'', reportadoPor: r[12]||'', respaldo: r[13]||'',
    obra: r[14]||'', diasPerdidos: parseInt(r[15],10) || 0,
    investigacionEstado: r[16]||'', investigacionResponsable: r[17]||'', investigacionFecha: r[18]||'', investigacionPdf: r[19]||'',
    atencionMedicaEstado: r[20]||'', atencionMedicaPdf: r[21]||'' };
}
// Se abre investigación formal (y se pregunta por atención médica) solo
// para accidentes reales (no Cuasiaccidente/Incidente)
function requiereInvestigacion(tipoIncidente) {
  return tipoIncidente === 'Accidente Leve' || tipoIncidente === 'Accidente Grave' || tipoIncidente === 'Accidente Fatal';
}
function rowToProcedimiento(r, i) {
  return { fila: i+2, n: r[0]||'', codigo: r[1]||'', nombre: r[2]||'', area: r[3]||'', version: r[4]||'',
    fechaEmision: r[5]||'', archivo: r[6]||'', estado: r[7]||'Vigente', fechaRegistro: r[8]||'' };
}
function rowToEpp(r, i) {
  return { fila: i+2, n: r[0]||'', fecha: r[1]||'', trabajador: r[2]||'', rut: r[3]||'', epp: r[4]||'',
    cantidad: r[5]||'', firma: r[6]||'', responsable: r[7]||'', fechaRegistro: r[8]||'', documento: r[9]||'' };
}
function rowToUsuario(r, i) {
  return { fila: i+2, correo: (r[0]||'').trim().toLowerCase(), rol: (r[1]||'').trim().toLowerCase(),
    nombre: r[2]||'', empresa: r[3]||'' };
}
function rowToSubcontratista(r, i) {
  return { fila: i+2, empresa: r[0]||'', fechaAlta: r[1]||'' };
}
function rowToSubDoc(r, i) {
  return { fila: i+2, empresa: r[0]||'', categoria: r[1]||'', item: r[2]||'', periodo: r[3]||'',
    archivo: r[4]||'', link: r[5]||'', fecha: r[6]||'', subidoPor: r[7]||'' };
}
// Una fila = una actividad del "Programa Personalizado" de UN supervisor en
// UN mes (ej. "Charla 5 minutos", frecuencia Diaria) — Dias Marcados guarda
// los días del mes en que se cumplió, separados por coma ("1,2,5,9,...").
// "Registros PDF" (columna K): un registro por día llenado digitalmente
// sobre uno de los formatos de PROGRAMAS_PERSONALIZADOS (ver
// abrirLlenarFormatoPrograma) — "dia:link" separados por "|". A diferencia
// de diasMarcados (que un supervisor puede tildar a mano sin respaldo), un
// día con registro acá SIEMPRE tiene un PDF real generado y subido a Drive.
function parseRegistrosPdfPrograma(str) {
  const map = {};
  (str || '').split('|').filter(Boolean).forEach(par => {
    const i = par.indexOf(':');
    if (i === -1) return;
    const dia = parseInt(par.slice(0, i), 10);
    if (!isNaN(dia)) map[dia] = par.slice(i + 1);
  });
  return map;
}
// Columna L ("Datos Checklist Mensual"): solo usada por SGSST-PER-002 (tipo
// checklist_mensual) — JSON con el estado completo del documento mensual
// (sector, firmas, EPP, observaciones y la grilla de 23 ítems × 31 días),
// ver generarPdfChecklistOrdenAseo. El resto de las actividades deja esta
// columna vacía.
function parseDatosChecklistMensual(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch (e) { return null; }
}
function rowToMiperLevantamiento(r, i) {
  return { fila: i+2, n: r[0]||'', obra: r[1]||'', proceso: r[2]||'', puesto: r[3]||'', tarea: r[4]||'',
    rutinaria: r[5]||'Rutinaria', lugar: r[6]||'', nPersonas: r[7]||'', sexo: r[8]||'',
    observaciones: r[9]||'', fechaRegistro: r[10]||'', registradoPor: r[11]||'' };
}
function rowToMiperMatriz(r, i) {
  return { fila: i+2, n: r[0]||'', obra: r[1]||'', proceso: r[2]||'', puesto: r[3]||'', tarea: r[4]||'',
    equipos: r[5]||'', peligro: r[6]||'', riesgo: r[7]||'', codigoRiesgo: r[8]||'', familiaRiesgo: r[9]||'',
    probabilidad: Number(r[10])||0, consecuencia: Number(r[11])||0, vep: Number(r[12])||0,
    nivelRiesgo: r[13]||'', medidasCodigo: r[14]||'', anexo: r[15]||'',
    fechaRegistro: r[16]||'', registradoPor: r[17]||'' };
}
function rowToMiperRiesgoCustom(r, i) {
  return { fila: i+2, n: r[0]||'', familia: r[1]||'', riesgo: r[2]||'', definicion: r[3]||'', codigo: r[4]||'',
    medidas: r[5]||'', fechaRegistro: r[6]||'', registradoPor: r[7]||'' };
}
function rowToMiperDocumento(r, i) {
  return { fila: i+2, n: r[0]||'', obra: r[1]||'', entidadEmpleadora: r[2]||'', sucursal: r[3]||'',
    responsableLevantamiento: r[4]||'', fecha: r[5]||'', revision: Number(r[6])||0, proximaRevision: r[7]||'',
    protocolos: (() => { try { return JSON.parse(r[8]||'[]'); } catch(e) { return []; } })(),
    nombreElaboro: r[9]||'', nombreReviso: r[10]||'', nombreAprobo: r[11]||'',
    pdf: r[12]||'', excel: r[13]||'', fechaRegistro: r[14]||'', registradoPor: r[15]||'' };
}
function rowToMiperPrograma(r, i) {
  return { fila: i+2, n: r[0]||'', obra: r[1]||'', item: r[2]||'', proceso: r[3]||'', tarea: r[4]||'',
    unidad: r[5]||'', fechaRegistro: r[6]||'', registradoPor: r[7]||'' };
}
function rowToCapacitacionDs44(r, i) {
  return { fila: i+2, n: r[0]||'', trabajador: r[1]||'', rut: r[2]||'', obra: r[3]||'',
    fechaInicio: r[4]||'',
    modulosCompletados: (() => { try { return JSON.parse(r[5]||'[]'); } catch(e) { return []; } })(),
    fechaCompletado: r[6]||'', fechaVencimiento: r[7]||'',
    facilitadorSincronico: r[8]||'', fechaSincronico: r[9]||'',
    certificado: r[10]||'', fechaRegistro: r[11]||'', registradoPor: r[12]||'' };
}
function rowToProgramaPersonalizado(r, i) {
  return { fila: i+2, n: r[0]||'', obra: r[1]||'', mes: r[2]||'', supervisor: r[3]||'', cargo: r[4]||'',
    actividad: r[5]||'', frecuencia: r[6]||'',
    diasMarcados: (r[7]||'').split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n)),
    fechaRegistro: r[8]||'', registradoPor: r[9]||'', registrosPdf: parseRegistrosPdfPrograma(r[10]),
    datosChecklistMensual: parseDatosChecklistMensual(r[11]) };
}
// Una entrega de EPP es UNA fila con todos los ítems juntos en la columna
// "EPP Entregado" (ej. "Casco (1); Guantes (2)"), igual que "Asistentes"
// en Charlas — antes cada ítem quedaba en su propia fila (misma fecha/
// trabajador/firma repetidos), lo que hacía ver una sola entrega como
// varias filas/entregas duplicadas en el Sheet. Esta función separa esa
// celda combinada en ítems individuales; también entiende filas antiguas
// (antes del cambio), donde el ítem y la cantidad iban en columnas propias.
function itemsDeFilaEpp(e) {
  if (e.cantidad) return [{ item: e.epp, cantidad: e.cantidad }];
  return (e.epp || '').split(';').map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(.*)\((\d+)\)$/);
    return m ? { item: m[1].trim(), cantidad: m[2] } : { item: s, cantidad: '' };
  });
}
function rowToCharla(r, i) {
  return { fila: i+2, n: r[0]||'', fecha: r[1]||'', tema: r[2]||'', origen: r[3]||'', estado: r[4]||'Pendiente',
    fechaRealizada: r[5]||'', responsable: r[6]||'', relator: r[7]||'', obra: r[8]||'', hora: r[9]||'',
    riesgos: r[10]||'', medidas: r[11]||'', asistentes: r[12]||'', pdf: r[13]||'' };
}
// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard() {
  const obraSel = obraFiltroActivo();
  let trab = obraSel ? allTrabajadores.filter(t => t.obra === obraSel) : allTrabajadores;
  let insp = obraSel ? allInspecciones.filter(i => i.obra === obraSel) : allInspecciones;
  let inc = obraSel ? allIncidentes.filter(i => i.obra === obraSel) : allIncidentes;
  let cha = obraSel ? allCharlas.filter(c => c.obra === obraSel) : allCharlas;
  // Los números de Inicio también quedan acotados a lo que le compete a un
  // supervisor logueado, para que no digan "15 trabajadores" cuando su
  // propio módulo Trabajadores solo lista a los 5 de su equipo.
  const equipo = miEquipoActual();
  if (equipo) {
    trab = trab.filter(t => equipo.has(t.nombre));
    insp = insp.filter(i => i.inspector === miSupervisorPerfil.nombre);
    inc = inc.filter(i => equipo.has(i.trabajador));
    cha = cha.filter(c => c.relator === miSupervisorPerfil.nombre);
  }
  setStat('trabajadores', trab.filter(t=>t.estado==='Activo').length);
  setStat('inspecciones', insp.filter(i => i.estado !== 'Cerrada').length);
  setStat('incidentes', inc.filter(i => i.estado !== 'Cerrado').length);
  setStat('charlas', cha.filter(c => c.estado === 'Pendiente').length);
  renderEstadisticasSeguridad();
}

// ── Obras (catálogo dinámico, mismo patrón que "Otro" en EPP) ──────────
function opcionesObrasDisponibles() {
  const obras = new Set([
    ...allTrabajadores.map(t => t.obra),
    ...allInspecciones.map(i => i.obra),
    ...allIncidentes.map(i => i.obra),
  ].filter(Boolean));
  return [...obras].sort((a, b) => a.localeCompare(b, 'es'));
}
function opcionesObraSelectHTML(actual) {
  return opcionesObrasDisponibles().map(o => `<option ${o===actual?'selected':''}>${esc(o)}</option>`).join('')
    + '<option value="__otra__">+ Escribir otra obra...</option>';
}
function onCambioObraSelect(selEl, otroId) {
  document.getElementById(otroId).classList.toggle('hidden', selEl.value !== '__otra__');
}

// ── Obra activa (filtro global de toda la app) ─────────────────────────
// Al entrar (cuenta interna, no subcontratista) se elige una Obra una sola
// vez — renderSelectorObraActiva() desde arrancarApp() — y desde ahí TODOS los
// módulos muestran solo lo de esa Obra, salvo Subcontratistas (módulo aparte
// por diseño) y Procedimientos (biblioteca general, sin campo Obra en el
// modelo de datos). Queda guardada en localStorage para no volver a
// preguntar la próxima vez; se puede cambiar después desde "Cambiar obra"
// en la sección Sesión. 'todas' = sin filtro (ve todo, como antes de esta
// función existir).
const OBRA_ACTIVA_KEY = 'obraActiva';
let obraActiva = localStorage.getItem(OBRA_ACTIVA_KEY) || null;
// Devuelve la obra por la que hay que filtrar, o null si no corresponde
// filtrar (todavía no se eligió ninguna, o se eligió "todas").
function obraFiltroActivo() {
  return (obraActiva && obraActiva !== 'todas') ? obraActiva : null;
}
// Para preseleccionar el <select> de Obra en los formularios de "Nuevo/a X"
// cuando ya hay una Obra activa — así no hay que volver a elegirla a mano.
function obraPreseleccionada() { return obraFiltroActivo() || ''; }
function actualizarChipObraActiva() {
  const texto = obraFiltroActivo() || 'Todas las obras';
  // Franja "Obra: ..." con acción "Cambiar obra ›" — vive arriba (móvil,
  // sidebar de escritorio e Inicio de escritorio), siempre visible en
  // cualquier módulo, para que se note y quede claro qué se puede hacer
  // (antes era un botón de solo ícono, difícil de notar).
  document.querySelectorAll('.obra-bar-nombre-actual').forEach(el => { el.textContent = texto; });
  // Un supervisor logueado está fijo a su propia obra — se oculta la acción
  // "Cambiar ›" (abrirSelectorObraActiva también la bloquea, por si acaso).
  document.querySelectorAll('.btn-obra-activa').forEach(el => { el.classList.toggle('obra-bar--fijo', !!miSupervisorPerfil); });
}
// permiteCancelar=true cuando se reabre después (botón "Cambiar obra" con
// la app ya visible) — muestra un botón para cerrar sin cambiar nada. En la
// elección inicial (justo después de cargarTodo(), #main todavía oculto) no
// hay nada que cancelar: hay que elegir sí o sí para poder seguir.
function renderSelectorObraActiva(permiteCancelar) {
  document.getElementById('btn-cerrar-elegir-obra').classList.toggle('hidden', !permiteCancelar);
  const obras = opcionesObrasDisponibles();
  // "Todas las obras" queda fijo arriba (con su propio color, para
  // distinguirla del resto) en vez de al final de la lista — si hay muchas
  // obras, antes había que scrollear toda la lista para llegar a ella.
  document.getElementById('lista-elegir-obra').innerHTML = `
    <button type="button" class="elegir-obra-item elegir-obra-item--todas" data-obra="todas" onclick="seleccionarObraActiva(this.dataset.obra)">
      <div class="elegir-obra-icon elegir-obra-icon--todas">${ic('obra',18)}</div>
      <div class="elegir-obra-nombre">Todas las obras</div>
      <div class="card-arrow">›</div>
    </button>
    ${obras.length ? '<div class="elegir-obra-divider"></div>' : ''}
    ${obras.map(o => `
    <button type="button" class="elegir-obra-item" data-obra="${esc(o)}" onclick="seleccionarObraActiva(this.dataset.obra)">
      <div class="elegir-obra-icon">${ic('obra',18)}</div>
      <div class="elegir-obra-nombre">${esc(o)}</div>
      <div class="card-arrow">›</div>
    </button>`).join('')}
  `;
  const pantalla = document.getElementById('pantalla-elegir-obra');
  pantalla.classList.remove('hidden');
  pantalla.classList.add('app-enter');
  setTimeout(() => pantalla.classList.remove('app-enter'), 500);
}
function abrirSelectorObraActiva() {
  if (miSupervisorPerfil) { toast('Tu cuenta está fija a la obra ' + miSupervisorPerfil.obra, 'ok'); return; }
  renderSelectorObraActiva(true);
}
function cerrarSelectorObraActiva() { document.getElementById('pantalla-elegir-obra').classList.add('hidden'); }
function seleccionarObraActiva(obra) {
  obraActiva = obra;
  localStorage.setItem(OBRA_ACTIVA_KEY, obra);
  actualizarChipObraActiva();
  renderModulosPrincipales();
  cerrarSelectorObraActiva();
  // Siempre se entra (o se vuelve a entrar) por Inicio, scrolleado arriba
  // del todo — tanto la primera vez (recién ahora se revela la app) como en
  // un cambio posterior (ya se estaba viendo otro módulo). Con animación de
  // aparición en los dos casos, para que se sienta como un "entrar" y no un
  // simple refresco silencioso de datos.
  const main = document.getElementById('main');
  const dtHome = document.getElementById('desktop-home');
  irPagina('inicio');
  main.classList.remove('hidden');
  [main, dtHome].forEach(el => el.classList.add('app-enter'));
  setTimeout(() => [main, dtHome].forEach(el => el.classList.remove('app-enter')), 500);
}
// Al elegir la Obra en el formulario de Charla, si esa obra tiene un
// supervisor asignado se sugiere su nombre como Relator (solo si el campo
// todavía está vacío, para no pisar algo ya escrito a mano).
function onCambioObraCharla(selEl) {
  onCambioObraSelect(selEl, 'input-charla-obra-otra');
  const f = selEl.form;
  if (f && !f.relator.value) {
    const sup = supervisorDeObra(selEl.value);
    if (sup) f.relator.value = sup.nombre;
  }
}
function valorObra(selEl, otroId) {
  if (selEl.value === '__otra__') return document.getElementById(otroId).value.trim();
  return selEl.value;
}

// Versión genérica del patrón select+"otro" (usado en Obra) para cualquier
// otro campo con lista sugerida + opción de escribir libre (ver Proceso/
// Tarea del Levantamiento MIPER cuando la obra tiene Programa Edificio
// importado).
function onCambioSelectConOtro(selEl, otroId) {
  document.getElementById(otroId).classList.toggle('hidden', selEl.value !== '__otro__');
}
function valorConOtro(selEl, otroId) {
  if (selEl.value === '__otro__') return document.getElementById(otroId).value.trim();
  return selEl.value;
}

// ── Índices de seguridad (fórmulas DS40 / Mutualidad) ──────────────────
// Horas Hombre Trabajadas: se estima desde la vigencia del contrato de cada
// trabajador (fecha inicio/término) × jornada diaria estándar, porque la app
// no registra asistencia real. Ajustar HORAS_JORNADA_DIARIA si la jornada
// real de la obra es distinta.
const HORAS_JORNADA_DIARIA = 8;
let obraDashboardSel = 'todas';

function onCambioObraDashboard() {
  obraDashboardSel = document.getElementById('sel-obra-dashboard').value;
  renderEstadisticasSeguridad();
}
function esAccidenteConTiempoPerdido(inc) {
  return inc.tipo === 'Accidente Leve' || inc.tipo === 'Accidente Grave' || inc.tipo === 'Accidente Fatal';
}
function fechaISO(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
// offsetAnios permite calcular el mismo período (1 de enero → hoy) de un año anterior,
// para comparar el año actual contra el mismo punto del año pasado (año vs año).
function calcularEstadisticasSeguridad(obraSel, offsetAnios = 0) {
  const hoyReal = new Date();
  const anio = hoyReal.getFullYear() - offsetAnios;
  const hoy = new Date(anio, hoyReal.getMonth(), hoyReal.getDate());
  const inicioPeriodo = new Date(anio, 0, 1);
  const inicioPeriodoStr = `${anio}-01-01`;
  const hoyStr = fechaISO(hoy);

  const trabajadoresObra = allTrabajadores.filter(t => obraSel === 'todas' || t.obra === obraSel);
  let horasHombre = 0, sinContrato = 0;
  trabajadoresObra.forEach(t => {
    if (!t.contratoInicio) { sinContrato++; return; }
    const ini = new Date(t.contratoInicio + 'T00:00:00');
    const fin = t.contratoTermino ? new Date(t.contratoTermino + 'T00:00:00') : hoy;
    const desde = ini > inicioPeriodo ? ini : inicioPeriodo;
    const hasta = fin < hoy ? fin : hoy;
    if (hasta >= desde) {
      const dias = Math.floor((hasta - desde) / 86400000) + 1;
      horasHombre += dias * HORAS_JORNADA_DIARIA;
    }
  });

  const incidentesPeriodo = allIncidentes.filter(i =>
    (obraSel === 'todas' || i.obra === obraSel) && esAccidenteConTiempoPerdido(i) &&
    i.fecha >= inicioPeriodoStr && i.fecha <= hoyStr);
  const nAccidentes = incidentesPeriodo.length;
  const diasPerdidos = incidentesPeriodo.reduce((s, i) => s + (i.diasPerdidos || 0), 0);
  const nTrabajadoresActivos = trabajadoresObra.filter(t => t.estado === 'Activo').length;

  return {
    anio: hoy.getFullYear(), nAccidentes, diasPerdidos, horasHombre, sinContrato,
    tasaAccidentabilidad: nTrabajadoresActivos > 0 ? (nAccidentes / nTrabajadoresActivos) * 100 : 0,
    indiceFrecuencia: horasHombre > 0 ? (nAccidentes / horasHombre) * 1000000 : 0,
    indiceGravedad: horasHombre > 0 ? (diasPerdidos / horasHombre) * 1000000 : 0,
  };
}
// Tarjeta de índice con gráfico de barras comparando el mismo período del
// año anterior contra el año actual (en vez de solo mostrar el número).
function graficoIndice(nombre, color, valorActual, valorPrev, anioActual, formato) {
  const max = Math.max(valorActual, valorPrev, 0.0001);
  const hActual = Math.max(6, Math.round((valorActual / max) * 100));
  const hPrev = Math.max(6, Math.round((valorPrev / max) * 100));
  return `
    <div class="indice-card">
      <div class="indice-nombre">${nombre}</div>
      <div class="indice-valor ${color}">${formato(valorActual)}</div>
      <div class="indice-chart">
        <div class="indice-bar-col">
          <div class="indice-bar-track"><div class="indice-bar ${color}" style="height:${hPrev}%"></div></div>
          <span class="indice-bar-y">${anioActual - 1}</span>
        </div>
        <div class="indice-bar-col">
          <div class="indice-bar-track"><div class="indice-bar ${color} indice-bar--actual" style="height:${hActual}%"></div></div>
          <span class="indice-bar-y">${anioActual}</span>
        </div>
      </div>
    </div>`;
}
function renderEstadisticasSeguridad() {
  // Si hay una Obra activa global, los índices quedan fijos en esa obra —
  // el selector propio de este panel (para comparar obras entre sí) solo
  // tiene sentido cuando se está viendo "Todas las obras".
  const obraGlobal = obraFiltroActivo();
  if (obraGlobal) obraDashboardSel = obraGlobal;
  const obras = opcionesObrasDisponibles();
  if (obraDashboardSel !== 'todas' && !obras.includes(obraDashboardSel)) obraDashboardSel = 'todas';
  const st = calcularEstadisticasSeguridad(obraDashboardSel, 0);
  const stPrev = calcularEstadisticasSeguridad(obraDashboardSel, 1);

  setListHTML('stats-seguridad', `
    ${obraGlobal ? '' : `
    <div class="stats-obra-bar">${ic('obra',16)}
      <select id="sel-obra-dashboard" class="obra-selector" onchange="onCambioObraDashboard()">
        <option value="todas" ${obraDashboardSel==='todas'?'selected':''}>Todas las obras</option>
        ${obras.map(o => `<option ${o===obraDashboardSel?'selected':''}>${esc(o)}</option>`).join('')}
      </select>
    </div>`}
    <div class="indices-grid">
      ${graficoIndice('Tasa Accidentabilidad', 'blue', st.tasaAccidentabilidad, stPrev.tasaAccidentabilidad, st.anio, v => v.toFixed(1)+'%')}
      ${graficoIndice('Índice Frecuencia', 'amber', st.indiceFrecuencia, stPrev.indiceFrecuencia, st.anio, v => Math.round(v))}
      ${graficoIndice('Índice Gravedad', 'red', st.indiceGravedad, stPrev.indiceGravedad, st.anio, v => Math.round(v))}
    </div>
    <div class="stats-caption">Acumulado ${st.anio} vs. mismo período ${st.anio-1} · ${st.nAccidentes} accidente(s) con tiempo perdido · ${Math.round(st.horasHombre).toLocaleString('es-CL')} HH trabajadas (estimadas)</div>
    ${st.sinContrato > 0 ? `<div class="stats-aviso">${st.sinContrato} trabajador(es) sin fecha de contrato registrada — sus horas no se cuentan en los índices.</div>` : ''}
  `);
}

// ============================================================
// MÓDULO: TRABAJADORES
// ============================================================
let filtroTrabajadores = '';
// Sin tildes/diacríticos, para que buscar "gonzalez" encuentre "González"
// (en un teclado de celular es más natural escribir sin tilde).
function sinTildes(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function onBuscarTrabajadores(v) {
  filtroTrabajadores = sinTildes((v || '').trim().toLowerCase());
  renderTrabajadores();
}
// A-Z de las 26 letras del abecedario (sin Ñ aparte — se agrupa con N,
// como ordena localeCompare('es')) para el índice lateral de Trabajadores.
const LETRAS_INDICE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
function renderTrabajadores() {
  const obraSel = obraFiltroActivo();
  let activos = obraSel ? allTrabajadores.filter(t => t.obra === obraSel) : [...allTrabajadores];
  const equipo = miEquipoActual();
  // Se incluye al propio supervisor en la lista (aunque no sea "de su
  // equipo") para que pueda entrar a su ficha y gestionar su equipo desde
  // ahí — si no, quedaría sin forma de llegar a ese botón.
  if (equipo) activos = activos.filter(t => equipo.has(t.nombre) || t.nombre === miSupervisorPerfil.nombre);
  if (filtroTrabajadores) {
    activos = activos.filter(t => [t.nombre, t.rut, t.cargo, t.empresa, t.obra]
      .some(v => sinTildes((v || '').toLowerCase()).includes(filtroTrabajadores)));
  }
  activos.sort((a, b) => sinTildes(a.nombre).localeCompare(sinTildes(b.nombre), 'es', { sensitivity: 'base' }));
  if (activos.length === 0) {
    setListHTML('trabajadores', emptyState(filtroTrabajadores ? 'Sin resultados' : 'Sin trabajadores', filtroTrabajadores ? 'Prueba con otro nombre, RUT o cargo' : 'Agrega el primer trabajador'));
    renderIndiceAlfabeticoTrabajadores(new Set());
    return;
  }
  const letrasConDatos = new Set();
  let letraAnterior = null;
  setListHTML('trabajadores', activos.map(t => {
    const inicial = sinTildes(t.nombre.trim().charAt(0).toUpperCase());
    const letra = LETRAS_INDICE.includes(inicial) ? inicial : '#';
    letrasConDatos.add(letra);
    const header = letra !== letraAnterior ? `<div class="letra-header" data-letra="${letra}">${letra}</div>` : '';
    letraAnterior = letra;
    return header + `
    <div class="card card--default" onclick="abrirFichaTrabajador('${esc(t.nombre).replace(/'/g,"\\'")}')">
      <div class="card-icon modulo-icon--inv">${ic('trabajadores',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(t.nombre)}</div>
        <div class="card-sub">${esc(t.cargo)} · ${esc(t.rut)}</div>
        <div class="badge-row"><span class="badge ${t.estado==='Activo'?'green':'gray'}">${esc(t.estado)}</span>
        <span class="badge blue">${esc(t.empresa)}</span>
        ${t.obra ? `<span class="badge gray">${ic('obra',11)} ${esc(t.obra)}</span>` : ''}</div>
      </div>
      <div class="card-arrow">›</div>
    </div>`;
  }).join(''));
  renderIndiceAlfabeticoTrabajadores(letrasConDatos);
}
// Índice lateral A-Z (mismo patrón que Contactos/WhatsApp): las letras sin
// ningún trabajador quedan atenuadas y no son clickeables; al tocar una
// letra activa, salta al encabezado correspondiente en la lista visible
// (mobile o escritorio, el que esté realmente en pantalla en ese momento).
function renderIndiceAlfabeticoTrabajadores(letrasConDatos) {
  const html = LETRAS_INDICE.map(l => letrasConDatos.has(l)
    ? `<span class="az-item" onclick="saltarALetraTrabajador('${l}')">${l}</span>`
    : `<span class="az-item az-item--vacia">${l}</span>`).join('');
  document.querySelectorAll('[data-azindex="trabajadores"]').forEach(el => el.innerHTML = html);
}
function saltarALetraTrabajador(letra) {
  const candidatos = document.querySelectorAll(`[data-list="trabajadores"] [data-letra="${letra}"]`);
  for (const el of candidatos) {
    if (el.offsetParent !== null) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); break; }
  }
}

function abrirFichaTrabajador(nombre) {
  const t = allTrabajadores.find(x => x.nombre === nombre);
  if (!t) { toast('No se encontró el trabajador', 'error'); return; }

  const eppDeEste = allEpp.filter(e => e.trabajador === nombre);
  const grupos = {};
  const orden = [];
  eppDeEste.forEach(e => {
    const key = e.fecha + '|' + e.firma;
    if (!grupos[key]) { grupos[key] = { fecha: e.fecha, firma: e.firma, documento: e.documento, items: [] }; orden.push(key); }
    grupos[key].items.push(...itemsDeFilaEpp(e).map(x => `${x.item} (${x.cantidad})`));
  });
  const entregasHtml = orden.length === 0
    ? '<div class="card-sub" style="padding:6px 2px;">Sin entregas de EPP registradas.</div>'
    : orden.reverse().map(k => grupos[k]).map(g => `
        <div class="field-row">
          <span>${esc(g.fecha)}<br><span style="color:#888;font-size:12px;">${esc(g.items.join(' · '))}</span></span>
          <span class="badge-row" style="justify-content:flex-end;">
            ${g.documento ? `<a href="${esc(g.documento)}" target="_blank" class="badge blue">${ic('documento',12)} Documento</a>` : ''}
            ${g.firma ? `<a href="${esc(g.firma)}" target="_blank" class="badge blue">${ic('firma',12)} Firma</a>` : ''}
          </span>
        </div>`).join('');

  const incDeEste = allIncidentes.filter(i => i.trabajador === nombre).reverse();
  const incidentesHtml = incDeEste.length === 0
    ? '<div class="card-sub" style="padding:6px 2px;">Sin incidentes registrados.</div>'
    : incDeEste.map(i => `
        <div class="field-row">
          <span>${esc(i.fecha)} — ${esc(i.tipo)}<br><span style="color:#888;font-size:12px;">${esc(i.area)}</span></span>
          <span class="badge ${i.estado==='Cerrado'?'green':'red'}">${esc(i.estado)}</span>
        </div>`).join('');

  // Supervisor de este trabajador: prioriza la asignación manual real
  // (Supervisor Asignado); si todavía no se asignó a nadie, cae al viejo
  // criterio automático (supervisorDeObra) para no dejar el campo vacío de
  // golpe en trabajadores que aún no se han reasignado a mano.
  const supervisorDeEsteAsignado = t.supervisorAsignado && allTrabajadores.find(s => s.nombre === t.supervisorAsignado && s.esSupervisor);
  const supervisorDeEste = !t.esSupervisor ? (supervisorDeEsteAsignado || supervisorDeObra(t.obra)) : null;
  let equipoHtml = '';
  if (t.esSupervisor) {
    const equipo = trabajadoresACargoDe(t);
    const incidentesEquipo = allIncidentes.filter(i => equipo.some(w => w.nombre === i.trabajador));
    equipoHtml = `
    <div class="sec-label" style="margin-top:20px;">Trabajadores a cargo (${equipo.length})</div>
    ${equipo.length === 0 ? '<div class="card-sub" style="padding:6px 2px;">Todavía no le has asignado trabajadores. Usa el botón de abajo para armar su equipo.</div>' : equipo.map(w => {
      const incW = allIncidentes.filter(i => i.trabajador === w.nombre && i.estado !== 'Cerrado');
      return `<div class="field-row" style="cursor:pointer;" onclick="closePanel('panel-ficha-trabajador'); abrirFichaTrabajador('${esc(w.nombre).replace(/'/g,"\\'")}')">
        <span>${esc(w.nombre)}<br><span style="color:#888;font-size:12px;">${esc(w.cargo)}</span></span>
        ${incW.length > 0 ? `<span class="badge red">${incW.length} incidente${incW.length>1?'s':''} abierto${incW.length>1?'s':''}</span>` : '<span class="badge green">Sin incidentes abiertos</span>'}
      </div>`;
    }).join('')}
    ${incidentesEquipo.length > 0 ? `<div class="card-sub" style="padding:6px 2px;">Total histórico del equipo: ${incidentesEquipo.length} incidente${incidentesEquipo.length>1?'s':''} registrado${incidentesEquipo.length>1?'s':''}.</div>` : ''}
    <button class="action-btn" style="margin-top:8px;" onclick="abrirEditarEquipoSupervisor(${t.fila})">Editar equipo a cargo</button>
    `;
  }

  const contratoBadge = !t.contratoInicio
    ? `<span class="badge gray">Sin registrar</span>`
    : !t.contratoTermino
      ? `<span class="badge green">Vigente (indefinido)</span>`
      : t.contratoTermino < hoyISO() ? `<span class="badge red">Vencido</span>` : `<span class="badge green">Vigente</span>`;
  const alturaBadge = !t.alturaVigencia
    ? `<span class="badge gray">Sin registrar</span>`
    : t.alturaVigencia < hoyISO() ? `<span class="badge red">Vencido</span>` : `<span class="badge green">Vigente</span>`;
  const datosPersonalesCompletos = t.fechaNacimiento && t.sexo && t.direccion && t.comuna && t.telefono && t.tipoContrato;

  document.getElementById('pnl-title-ficha-trabajador').textContent = t.nombre;
  document.getElementById('ficha-trabajador-body').innerHTML = `
    <div class="ficha-hero">
      <div class="ficha-hero-icon">${ic('trabajadores',32)}</div>
      <div class="ficha-hero-info">
        <div class="ficha-hero-type">${esc(t.cargo)}</div>
        <div class="ficha-hero-name">${esc(t.nombre)}</div>
        <div class="ficha-hero-badges">
          <span class="badge ${t.estado==='Activo'?'green':'gray'}">${esc(t.estado)}</span>
          ${t.esSupervisor ? '<span class="badge amber">Supervisor de obra</span>' : ''}
        </div>
      </div>
    </div>

    <div class="ficha-section">
      <div class="ficha-sec-title">Información general</div>
      <div class="field-row"><span class="fl">RUT</span><span class="fv">${esc(t.rut)}</span></div>
      <div class="field-row"><span class="fl">Empresa / Contratista</span><span class="fv">${esc(t.empresa)}</span></div>
      <div class="field-row"><span class="fl">Obra</span><span class="fv">${esc(t.obra || '—')}</span></div>
      <div class="field-row"><span class="fl">Fecha de ingreso</span><span class="fv">${esc(t.fechaIngreso || '—')}</span></div>
      ${t.foto ? `<div class="field-row"><span class="fl">Foto</span><a href="${esc(t.foto)}" target="_blank" class="badge blue">${ic('camara',12)} Ver foto</a></div>` : ''}
    </div>

    <div class="ficha-section">
      <div class="ficha-sec-title">Rol</div>
      <div class="field-row"><span class="fl">Rol</span>${t.esSupervisor ? '<span class="badge amber">Supervisor de obra</span>' : supervisorDeEste ? `<span>Supervisado por <span class="fv">${esc(supervisorDeEste.nombre)}</span></span>` : '<span class="badge gray">Trabajador</span>'}</div>
      ${t.esSupervisor ? `<div class="field-row"><span class="fl">Especialidades</span><span class="fv">${t.especialidadesSupervisor.length ? esc(t.especialidadesSupervisor.join(', ')) : 'Supervisor general (todos los temas)'}</span></div>` : ''}
      <button class="action-btn" onclick="abrirEditarSupervisor(${t.fila})">${t.esSupervisor ? 'Editar rol de supervisor' : 'Marcar como supervisor de esta obra'}</button>
      ${!t.esSupervisor ? `<div class="field-row"><span class="fl">Supervisor asignado</span><span class="fv">${supervisorDeEsteAsignado ? esc(supervisorDeEsteAsignado.nombre) : 'Sin asignar'}</span></div>
      <button class="action-btn" onclick="abrirAsignarSupervisor(${t.fila})">Cambiar supervisor asignado</button>` : ''}
      ${equipoHtml}
    </div>

    <div class="ficha-section">
      <div class="ficha-sec-title">Datos personales</div>
      <div class="field-row"><span class="fl">Estado</span>${datosPersonalesCompletos ? '<span class="badge green">Completos</span>' : '<span class="badge amber">Incompletos</span>'}</div>
      <div class="field-row"><span class="fl">Fecha de nacimiento</span><span class="fv">${esc(t.fechaNacimiento || '—')}</span></div>
      <div class="field-row"><span class="fl">Sexo</span><span class="fv">${esc(t.sexo || '—')}</span></div>
      <div class="field-row"><span class="fl">Nacionalidad</span><span class="fv">${esc(t.nacionalidad || '—')}</span></div>
      <div class="field-row"><span class="fl">Dirección</span><span class="fv">${esc(t.direccion || '—')}</span></div>
      <div class="field-row"><span class="fl">Comuna</span><span class="fv">${esc(t.comuna || '—')}</span></div>
      <div class="field-row"><span class="fl">Teléfono</span><span class="fv">${esc(t.telefono || '—')}</span></div>
      <div class="field-row"><span class="fl">Pueblo originario</span><span class="fv">${esc(t.puebloOriginario || '—')}</span></div>
      <div class="field-row"><span class="fl">Tipo de contrato</span><span class="fv">${esc(t.tipoContrato || '—')}</span></div>
      <div class="field-row"><span class="fl">Tipo de remuneración</span><span class="fv">${esc(t.tipoIngreso || '—')}</span></div>
      <div class="field-row"><span class="fl">Categoría ocupacional</span><span class="fv">${esc(t.categoriaOcupacional || '—')}</span></div>
      <button class="action-btn" onclick="abrirEditarDatosPersonales(${t.fila})">${datosPersonalesCompletos ? 'Actualizar datos personales' : 'Completar datos personales'}</button>
    </div>

    <div class="ficha-section">
      <div class="ficha-sec-title">Contrato de trabajo</div>
      <div class="field-row"><span class="fl">Inicio</span><span class="fv">${esc(t.contratoInicio || '—')}</span></div>
      <div class="field-row"><span class="fl">Término</span><span class="fv">${esc(t.contratoTermino || 'Indefinido')}</span></div>
      <div class="field-row"><span class="fl">Estado</span>${contratoBadge}</div>
      ${t.contratoArchivo ? `<div class="field-row"><span class="fl">Documento</span><a href="${esc(t.contratoArchivo)}" target="_blank" class="badge blue">${ic('documento',12)} Ver contrato</a></div>` : ''}
      <button class="action-btn" onclick="abrirEditarContrato(${t.fila})">${t.contratoInicio ? 'Actualizar contrato' : 'Subir contrato'}</button>
    </div>

    <div class="ficha-section">
      <div class="ficha-sec-title">Examen de altura física</div>
      <div class="field-row"><span class="fl">Vigencia</span><span class="fv">${esc(t.alturaVigencia || '—')}</span></div>
      <div class="field-row"><span class="fl">Estado</span>${alturaBadge}</div>
      ${t.alturaArchivo ? `<div class="field-row"><span class="fl">Documento</span><a href="${esc(t.alturaArchivo)}" target="_blank" class="badge blue">${ic('documento',12)} Ver examen</a></div>` : ''}
      <button class="action-btn" onclick="abrirEditarAltura(${t.fila})">${t.alturaVigencia ? 'Actualizar examen' : 'Subir examen'}</button>
    </div>

    ${t.obra ? (() => {
      const recDs44 = capacitacionDs44RecordDe(t.nombre, t.obra);
      const estadoDs44 = ds44Estado(recDs44);
      return `
    <div class="ficha-section">
      <div class="ficha-sec-title">Capacitación DS44 (8 hrs)</div>
      <div class="field-row"><span class="fl">Vigencia</span><span class="fv">${esc(recDs44 && recDs44.fechaVencimiento || '—')}</span></div>
      <div class="field-row"><span class="fl">Estado</span><span class="badge ${estadoDs44.badge}">${esc(estadoDs44.label)}</span></div>
      ${recDs44 && recDs44.certificado ? `<div class="field-row"><span class="fl">Documento</span><a href="${esc(recDs44.certificado)}" target="_blank" class="badge blue">${ic('documento',12)} Ver certificado</a></div>` : ''}
      <button class="action-btn" onclick="abrirEditarDs44('${esc(t.nombre).replace(/'/g,"\\'")}','${esc(t.obra).replace(/'/g,"\\'")}')">${recDs44 && recDs44.fechaVencimiento ? 'Actualizar certificado' : 'Subir certificado'}</button>
    </div>`;
    })() : ''}

    ${miSupervisorPerfil ? '' : `
    <div class="ficha-section">
      <div class="ficha-sec-title">Historial de EPP entregado</div>
      ${entregasHtml}
    </div>`}

    <div class="ficha-section">
      <div class="ficha-sec-title">Incidentes relacionados</div>
      ${incidentesHtml}
    </div>
  `;
  openPanel('panel-ficha-trabajador');
}
function abrirEditarContrato(fila) {
  const t = allTrabajadores.find(x => x.fila === fila);
  if (!t) return;
  const f = document.getElementById('form-editar-contrato');
  f.reset();
  f.fila.value = fila;
  f.inicio.value = t.contratoInicio || '';
  f.termino.value = t.contratoTermino || '';
  openPanel('panel-editar-contrato');
}
async function guardarContrato(ev) {
  ev.preventDefault();
  const f = ev.target;
  const fila = f.fila.value;
  const t = allTrabajadores.find(x => String(x.fila) === String(fila));
  try {
    let archivoLink = t ? t.contratoArchivo : '';
    const archivoFile = f.archivo.files[0];
    if (archivoFile) {
      const up = t ? await uploadFileTrabajador(archivoFile, t.nombre, 'contrato')
                   : await uploadFile(archivoFile, 'Trabajadores-Documentos', 'contrato_' + fila);
      archivoLink = up.link;
    }
    await ensureToken();
    const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_TRABAJADORES}'!K${fila}:M${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[f.inicio.value, f.termino.value, archivoLink]] }) });
    toast('Contrato actualizado ✓', 'ok');
    closePanel('panel-editar-contrato');
    await cargarTodo(true);
    if (t) abrirFichaTrabajador(t.nombre);
  } catch (e) { toast(e.message, 'error'); }
}
function abrirEditarAltura(fila) {
  const t = allTrabajadores.find(x => x.fila === fila);
  if (!t) return;
  const f = document.getElementById('form-editar-altura');
  f.reset();
  f.fila.value = fila;
  f.vigencia.value = t.alturaVigencia || '';
  openPanel('panel-editar-altura');
}
async function guardarAltura(ev) {
  ev.preventDefault();
  const f = ev.target;
  const fila = f.fila.value;
  const t = allTrabajadores.find(x => String(x.fila) === String(fila));
  try {
    let archivoLink = t ? t.alturaArchivo : '';
    const archivoFile = f.archivo.files[0];
    if (archivoFile) {
      const up = t ? await uploadFileTrabajador(archivoFile, t.nombre, 'examen_altura')
                   : await uploadFile(archivoFile, 'Trabajadores-Documentos', 'examen_altura_' + fila);
      archivoLink = up.link;
    }
    await ensureToken();
    const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_TRABAJADORES}'!N${fila}:O${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[f.vigencia.value, archivoLink]] }) });
    toast('Examen de altura actualizado ✓', 'ok');
    closePanel('panel-editar-altura');
    await cargarTodo(true);
    if (t) abrirFichaTrabajador(t.nombre);
  } catch (e) { toast(e.message, 'error'); }
}
function abrirEditarDatosPersonales(fila) {
  const t = allTrabajadores.find(x => x.fila === fila);
  if (!t) return;
  const f = document.getElementById('form-editar-personales');
  f.reset();
  f.fila.value = fila;
  f.fechaNacimiento.value = t.fechaNacimiento || '';
  f.sexo.value = t.sexo || '';
  f.nacionalidad.value = t.nacionalidad || 'Chilena';
  f.direccion.value = t.direccion || '';
  f.comuna.value = t.comuna || '';
  f.telefono.value = t.telefono || '';
  f.puebloOriginario.value = t.puebloOriginario || 'Ninguno';
  f.tipoContrato.value = t.tipoContrato || '';
  f.tipoIngreso.value = t.tipoIngreso || '';
  f.categoriaOcupacional.value = t.categoriaOcupacional || '';
  openPanel('panel-editar-personales');
}
async function guardarDatosPersonales(ev) {
  ev.preventDefault();
  const f = ev.target;
  const fila = f.fila.value;
  const t = allTrabajadores.find(x => String(x.fila) === String(fila));
  try {
    await ensureToken();
    const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_TRABAJADORES}'!Q${fila}:Z${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[
        f.fechaNacimiento.value, f.sexo.value, f.nacionalidad.value, f.direccion.value,
        f.comuna.value, f.telefono.value, f.puebloOriginario.value, f.tipoContrato.value,
        f.tipoIngreso.value, f.categoriaOcupacional.value
      ]] }) });
    toast('Datos personales actualizados ✓', 'ok');
    closePanel('panel-editar-personales');
    await cargarTodo(true);
    if (t) abrirFichaTrabajador(t.nombre);
  } catch (e) { toast(e.message, 'error'); }
}
function selectTrabajadoresOptions() {
  const obraSel = obraFiltroActivo();
  return allTrabajadores.filter(t => t.estado==='Activo' && (!obraSel || t.obra === obraSel))
    .map(t => `<option value="${esc(t.nombre)}|${esc(t.rut)}">${esc(t.nombre)} — ${esc(t.rut)}</option>`).join('');
}
function onCambioObraFormTrabajador(selEl) {
  onCambioObraSelect(selEl, 'input-trabajador-obra-otra');
  const obra = valorObra(selEl, 'input-trabajador-obra-otra');
  const sups = allTrabajadores.filter(s => s.esSupervisor && s.obra === obra && s.estado === 'Activo');
  document.getElementById('sel-supervisor-trabajador').innerHTML = '<option value="">— Sin asignar —</option>' +
    sups.map(s => `<option value="${esc(s.nombre)}">${esc(s.nombre)}</option>`).join('');
}
function abrirFormTrabajador() {
  const f = document.getElementById('form-trabajador');
  f.reset();
  const selObra = document.getElementById('sel-obra-trabajador');
  selObra.innerHTML = opcionesObraSelectHTML(obraPreseleccionada());
  onCambioObraFormTrabajador(selObra);
  renderChecklistEspecialidades('checklist-especialidades-trabajador');
  document.getElementById('grupo-especialidades-trabajador').classList.add('hidden');
  openPanel('panel-form-trabajador');
}
async function guardarTrabajador(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    let fotoLink = '';
    const fotoFile = f.foto.files[0];
    if (fotoFile) {
      const up = await uploadFileTrabajador(fotoFile, f.nombre.value, 'foto');
      fotoLink = up.link;
    }
    const n = allTrabajadores.length + 1;
    const obra = valorObra(f.obra, 'input-trabajador-obra-otra');
    const especialidades = f.esSupervisor.checked ? recolectarEspecialidades('checklist-especialidades-trabajador').join('; ') : '';
    await appendSheet(`'${CONFIG.SHEET_TRABAJADORES}'!A:AC`, [[
      n, f.nombre.value, f.rut.value, f.cargo.value, f.empresa.value,
      f.fechaIngreso.value, f.estado.value, fotoLink, new Date().toLocaleString('es-CL'),
      obra, '', '', '', '', '', f.esSupervisor.checked ? 'Sí' : '',
      f.fechaNacimiento.value, f.sexo.value, f.nacionalidad.value, f.direccion.value,
      f.comuna.value, f.telefono.value, f.puebloOriginario.value, f.tipoContrato.value,
      f.tipoIngreso.value, f.categoriaOcupacional.value, f.correo.value, especialidades,
      f.supervisorAsignado.value
    ]]);
    toast('Trabajador agregado ✓', 'ok');
    closePanel('panel-form-trabajador');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}
function renderChecklistEspecialidades(contId, seleccionadas) {
  const sel = seleccionadas || [];
  document.getElementById(contId).innerHTML = ESPECIALIDADES_SUPERVISOR.map(esp => `
    <div class="chk-row" data-item="${esc(esp)}">
      <label class="chk-row-label">
        <span class="chk-row-checkbox-wrap">
          <input type="checkbox" class="chk-row-input" ${sel.includes(esp) ? 'checked' : ''}>
          <span class="chk-row-checkbox"></span>
        </span>
        <span>${esc(esp)}</span>
      </label>
    </div>`).join('');
}
function recolectarEspecialidades(contId) {
  return [...document.querySelectorAll(`#${contId} .chk-row`)]
    .filter(row => row.querySelector('.chk-row-input').checked)
    .map(row => row.dataset.item);
}
function onToggleEsSupervisorForm(chk, grupoId) {
  document.getElementById(grupoId).classList.toggle('hidden', !chk.checked);
}
function abrirEditarSupervisor(fila) {
  const t = allTrabajadores.find(x => x.fila === fila);
  if (!t) return;
  const f = document.getElementById('form-editar-supervisor');
  f.reset();
  f.fila.value = fila;
  f.esSupervisor.checked = t.esSupervisor;
  renderChecklistEspecialidades('checklist-especialidades-supervisor', t.especialidadesSupervisor);
  document.getElementById('grupo-especialidades-supervisor').classList.toggle('hidden', !t.esSupervisor);
  openPanel('panel-editar-supervisor');
}
async function guardarSupervisor(ev) {
  ev.preventDefault();
  const f = ev.target;
  const fila = f.fila.value;
  const t = allTrabajadores.find(x => String(x.fila) === String(fila));
  try {
    await ensureToken();
    const esSup = f.esSupervisor.checked;
    const especialidades = esSup ? recolectarEspecialidades('checklist-especialidades-supervisor').join('; ') : '';
    const urlSup = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_TRABAJADORES}'!P${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(urlSup, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[esSup ? 'Sí' : '']] }) });
    const urlEsp = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_TRABAJADORES}'!AB${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(urlEsp, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[especialidades]] }) });
    toast(esSup ? 'Rol de supervisor actualizado ✓' : 'Ya no es supervisor de obra', 'ok');
    closePanel('panel-editar-supervisor');
    await cargarTodo(true);
    if (t) abrirFichaTrabajador(t.nombre);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Asignación manual de supervisor por trabajador (columna AC) ─────────
// Dos formas de cargar el mismo dato (Trabajador.Supervisor Asignado): acá,
// campo por trabajador; o en bloque desde abrirEditarEquipoSupervisor.
function abrirAsignarSupervisor(fila) {
  const t = allTrabajadores.find(x => x.fila === fila);
  if (!t) return;
  const f = document.getElementById('form-asignar-supervisor');
  f.reset();
  f.fila.value = fila;
  const sups = allTrabajadores.filter(s => s.esSupervisor && s.obra === t.obra && s.estado === 'Activo');
  f.supervisor.innerHTML = '<option value="">— Sin asignar —</option>' +
    sups.map(s => `<option value="${esc(s.nombre)}" ${s.nombre===t.supervisorAsignado?'selected':''}>${esc(s.nombre)}</option>`).join('');
  openPanel('panel-asignar-supervisor');
}
async function guardarAsignarSupervisor(ev) {
  ev.preventDefault();
  const f = ev.target;
  const fila = f.fila.value;
  const t = allTrabajadores.find(x => String(x.fila) === String(fila));
  try {
    await ensureToken();
    const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_TRABAJADORES}'!AC${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[f.supervisor.value]] }) });
    toast(f.supervisor.value ? 'Supervisor asignado ✓' : 'Se quitó la asignación', 'ok');
    closePanel('panel-asignar-supervisor');
    await cargarTodo(true);
    if (t) abrirFichaTrabajador(t.nombre);
  } catch (e) { toast(e.message, 'error'); }
}
// Checklist de equipo desde la ficha del supervisor — asigna/desasigna
// varios trabajadores de una vez (mismo campo de fondo que arriba).
function abrirEditarEquipoSupervisor(fila) {
  const t = allTrabajadores.find(x => x.fila === fila);
  if (!t) return;
  document.getElementById('form-equipo-supervisor').fila.value = fila;
  document.getElementById('pnl-title-equipo-supervisor').textContent = `Equipo de ${t.nombre}`;
  const candidatos = allTrabajadores.filter(w => w.obra === t.obra && w.estado === 'Activo' && !w.esSupervisor);
  document.getElementById('checklist-equipo-supervisor').innerHTML = candidatos.length === 0
    ? '<div class="card-sub" style="padding:6px 2px;">No hay trabajadores (no supervisores) activos en esta obra.</div>'
    : candidatos.map(w => `
    <div class="chk-row" data-fila="${w.fila}">
      <label class="chk-row-label">
        <span class="chk-row-checkbox-wrap">
          <input type="checkbox" class="chk-row-input" ${w.supervisorAsignado===t.nombre?'checked':''}>
          <span class="chk-row-checkbox"></span>
        </span>
        <span>${esc(w.nombre)}<br><span style="color:#888;font-size:12px;">${esc(w.cargo)}${w.supervisorAsignado && w.supervisorAsignado!==t.nombre ? ' · actualmente con ' + esc(w.supervisorAsignado) : ''}</span></span>
      </label>
    </div>`).join('');
  openPanel('panel-editar-equipo-supervisor');
}
async function guardarEquipoSupervisor() {
  const fila = document.getElementById('form-equipo-supervisor').fila.value;
  const t = allTrabajadores.find(x => String(x.fila) === String(fila));
  if (!t) return;
  try {
    await ensureToken();
    const filas = [...document.querySelectorAll('#checklist-equipo-supervisor .chk-row')];
    const cambios = filas.filter(row => {
      const w = allTrabajadores.find(x => String(x.fila) === row.dataset.fila);
      const marcado = row.querySelector('.chk-row-input').checked;
      const yaAsignado = w && w.supervisorAsignado === t.nombre;
      return marcado !== yaAsignado;
    });
    await Promise.all(cambios.map(row => {
      const marcado = row.querySelector('.chk-row-input').checked;
      const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_TRABAJADORES}'!AC${row.dataset.fila}`)}?valueInputOption=USER_ENTERED`;
      return fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
        body: JSON.stringify({ values: [[marcado ? t.nombre : '']] }) });
    }));
    toast(cambios.length ? 'Equipo actualizado ✓' : 'Sin cambios', 'ok');
    closePanel('panel-editar-equipo-supervisor');
    await cargarTodo(true);
    abrirFichaTrabajador(t.nombre);
  } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// MÓDULO: INSPECCIONES (con foto + alerta de charla)
// ============================================================
function renderInspecciones() {
  const obraSel = obraFiltroActivo();
  let items = obraSel ? allInspecciones.filter(i => i.obra === obraSel) : [...allInspecciones];
  // Inspecciones no tiene un trabajador asociado (es por área/tema), así que
  // "lo que le compete" a un supervisor son las que él mismo hizo.
  if (miSupervisorPerfil) items = items.filter(i => i.inspector === miSupervisorPerfil.nombre);
  items = items.reverse();
  if (items.length === 0) { setListHTML('inspecciones', emptyState('Sin inspecciones', 'Registra la primera inspección')); return; }
  setListHTML('inspecciones', items.map(i => {
    const meta = NIVELES_RIESGO.find(n=>n.value===i.riesgo) || NIVELES_RIESGO[0];
    return `<div class="card card--default">
      <div class="card-icon modulo-icon--flota">${ic('inspecciones',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(i.tipo)} — ${esc(i.area)}</div>
        <div class="card-sub">${esc(i.fecha)} · ${esc(i.inspector)} · Tema: ${esc(i.tema)}</div>
        <div class="badge-row"><span class="badge ${meta.color}">Riesgo ${esc(i.riesgo)}</span>
        <span class="badge ${i.estado==='Cerrada'?'green':'gray'}">${esc(i.estado)}</span>
        ${i.foto ? `<a href="${esc(i.foto)}" target="_blank" class="badge blue">${ic('camara',12)} Foto</a>` : ''}</div>
        ${i.estado !== 'Cerrada' ? `<button class="action-btn" onclick="marcarInspeccionCerrada(${i.fila})">Cerrar inspección</button>` : ''}
      </div>
    </div>`;
  }).join(''));
}
async function marcarInspeccionCerrada(fila) {
  try {
    await ensureToken();
    const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_INSPECCIONES}'!K${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [['Cerrada']] }) });
    toast('Inspección cerrada ✓', 'ok');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}
function abrirFormInspeccion() {
  const f = document.getElementById('form-inspeccion');
  f.reset();
  f.fecha.value = hoyISO();
  document.getElementById('sel-tema-inspeccion').innerHTML = TEMAS_CHARLA.map(t=>`<option>${t}</option>`).join('');
  const selObra = document.getElementById('sel-obra-inspeccion');
  selObra.innerHTML = opcionesObraSelectHTML(obraPreseleccionada());
  onCambioObraSelect(selObra, 'input-inspeccion-obra-otra');
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
    const obra = valorObra(f.obra, 'input-inspeccion-obra-otra');
    await appendSheet(`'${CONFIG.SHEET_INSPECCIONES}'!A:M`, [[
      n, f.fecha.value, f.tipo.value, f.area.value, f.inspector.value, f.tema.value,
      f.hallazgos.value, f.riesgo.value, fotoLink, f.accion.value || '', 'Abierta',
      new Date().toLocaleString('es-CL'), obra
    ]]);

    // Generar alerta de charla automáticamente
    const nCharla = allCharlas.length + 1;
    await appendSheet(`'${CONFIG.SHEET_CHARLAS}'!A:G`, [[
      nCharla, hoyISO(), f.tema.value, 'Inspección #' + n, 'Pendiente', '', ''
    ]]);

    toast('Inspección guardada ✓', 'ok');
    closePanel('panel-form-inspeccion');
    await cargarTodo(true);
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
  const obraSel = obraFiltroActivo();
  let items = obraSel ? allCharlas.filter(c => c.obra === obraSel) : [...allCharlas];
  // Charlas no tiene un trabajador asociado (es del relator hacia varios
  // asistentes), así que "lo que le compete" a un supervisor son las que
  // él mismo dicta (Relator).
  if (miSupervisorPerfil) items = items.filter(c => c.relator === miSupervisorPerfil.nombre);
  items = items.reverse();
  if (items.length === 0) { setListHTML('charlas', emptyState('Sin charlas registradas', 'Toca "+" para registrar una charla')); return; }
  setListHTML('charlas', items.map(c => `
    <div class="card card--default">
      <div class="card-icon modulo-icon--flota">${ic('charlas',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(c.tema)}</div>
        <div class="card-sub">${esc(c.origen)} · Generada ${esc(c.fecha)}</div>
        <div class="badge-row"><span class="badge ${c.estado==='Pendiente'?'amber':'green'}">${esc(c.estado)}</span>
        ${c.pdf ? `<a href="${esc(c.pdf)}" target="_blank" class="badge blue">${ic('documento',12)} Ver documento</a>` : ''}</div>
        ${c.estado==='Pendiente' ? `<button class="action-btn" onclick="abrirRealizarCharla(${c.fila})">Marcar realizada</button>` : ''}
      </div>
    </div>`).join(''));
}

// ── Charlas ya subidas ("biblioteca"): charlas oficiales que el cliente ya
// tiene escritas, empaquetadas como archivos del proyecto (ver
// CHARLAS_BIBLIOTECA arriba) — ya no se suben desde la app, así que esta
// lista es de solo lectura.
function actualizarContadorPlantillasCharla() {
  document.querySelectorAll('[data-count="plantillas-charla"]').forEach(el => el.textContent = CHARLAS_BIBLIOTECA.length);
}
function abrirPlantillasCharla() {
  renderPlantillasCharla();
  openPanel('panel-plantillas-charla');
}
function renderPlantillasCharla() {
  const cont = document.getElementById('lista-plantillas-charla');
  cont.innerHTML = CHARLAS_BIBLIOTECA.map(p => `
    <div class="card card--default">
      <div class="card-icon modulo-icon--flota">${ic('charlas',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(p.nombre)}</div>
        <div class="card-sub">${esc(p.codigo)}</div>
        <div class="badge-row"><a href="${esc(p.archivo)}" target="_blank" class="badge blue">${ic('documento',12)} Ver archivo</a></div>
      </div>
    </div>`).join('');
}

// ── Realizar charla: paso 1 (datos) → paso 2 (firma de asistentes) → PDF ──
let charlaEnProceso = null;

function renderChecklistAsistentesCharla() {
  const obraSel = obraFiltroActivo();
  const activos = allTrabajadores.filter(t => t.estado === 'Activo' && (!obraSel || t.obra === obraSel));
  document.getElementById('checklist-asistentes-charla').innerHTML = activos.map(t => `
    <div class="chk-row" data-nombre="${esc(t.nombre)}" data-rut="${esc(t.rut)}">
      <label class="chk-row-label">
        <span class="chk-row-checkbox-wrap">
          <input type="checkbox" class="chk-row-input">
          <span class="chk-row-checkbox"></span>
        </span>
        <span>${esc(t.nombre)} <span style="color:#888;">· ${esc(t.rut)}</span></span>
      </label>
    </div>`).join('');
}
// Selector opcional para elegir una de las charlas ya subidas (ver arriba).
// Esas charlas ya traen el Tema/Riesgos/Medidas escritos dentro del propio
// documento, así que al elegir una se esconden esos campos (no aplican) y en
// su lugar se piden solo los datos que ese documento deja en blanco: Cargo
// del relator, Actividad y Duración (además de Relator+firma, Obra, Fecha y
// Asistentes+firmas, que son comunes a los dos modos). Si se elige "Escribir
// desde cero" se vuelve al formulario de siempre (Hora, Tema, Riesgos,
// Medidas), para una charla que no está en la biblioteca.
function poblarSelectorPlantillaCharla() {
  const sel = document.getElementById('sel-plantilla-charla');
  sel.innerHTML = '<option value="">— Escribir desde cero —</option>' +
    CHARLAS_BIBLIOTECA.map((p, i) => `<option value="${i}">${esc(p.codigo)} — ${esc(p.nombre)}</option>`).join('');
  sel.value = '';
  onElegirPlantillaCharla(sel);
}
function onElegirPlantillaCharla(sel) {
  const p = CHARLAS_BIBLIOTECA[sel.value] || null;
  document.getElementById('grupo-charla-desde-cero').classList.toggle('hidden', !!p);
  document.getElementById('grupo-charla-plantilla-real').classList.toggle('hidden', !p);
}
function abrirRealizarCharla(fila) {
  const c = allCharlas.find(x => x.fila === fila);
  if (!c) return;
  charlaEnProceso = { fila };
  const f = document.getElementById('form-realizar-charla');
  f.reset();
  f.fecha.value = hoyISO();
  f.hora.value = horaActual();
  const selObraCharla1 = document.getElementById('sel-obra-charla');
  selObraCharla1.innerHTML = opcionesObraSelectHTML(obraPreseleccionada());
  onCambioObraSelect(selObraCharla1, 'input-charla-obra-otra');
  document.getElementById('panel-realizar-charla-titulo').textContent = 'Realizar charla';
  renderChecklistAsistentesCharla();
  poblarSelectorPlantillaCharla();
  f.tema.value = c.tema;
  openPanel('panel-realizar-charla');
  setTimeout(() => initFirmaPad('firma-canvas-relator'), 80);
}
// Charla hecha "porque sí" (recorrido rutinario, decisión del prevencionista,
// etc.), sin que una Inspección o Incidente la haya generado como alerta.
function abrirNuevaCharla() {
  charlaEnProceso = { fila: null };
  const f = document.getElementById('form-realizar-charla');
  f.reset();
  f.fecha.value = hoyISO();
  f.hora.value = horaActual();
  const selObraCharla2 = document.getElementById('sel-obra-charla');
  selObraCharla2.innerHTML = opcionesObraSelectHTML(obraPreseleccionada());
  onCambioObraSelect(selObraCharla2, 'input-charla-obra-otra');
  document.getElementById('panel-realizar-charla-titulo').textContent = 'Nueva charla';
  renderChecklistAsistentesCharla();
  poblarSelectorPlantillaCharla();
  openPanel('panel-realizar-charla');
  setTimeout(() => initFirmaPad('firma-canvas-relator'), 80);
}
function guardarDatosCharla(ev) {
  ev.preventDefault();
  const f = ev.target;
  if (firmaEstaVacia('firma-canvas-relator')) { toast('Falta la firma del relator', 'error'); return; }
  const sel = document.getElementById('sel-plantilla-charla');
  const plantilla = CHARLAS_BIBLIOTECA[sel.value] || null;
  if (!plantilla && !f.tema.value) { toast('Escribe el tema tratado', 'error'); return; }
  const asistentes = [...document.querySelectorAll('#checklist-asistentes-charla .chk-row')]
    .filter(row => row.querySelector('.chk-row-input').checked)
    .map(row => ({ nombre: row.dataset.nombre, rut: row.dataset.rut, firma: null }));

  charlaEnProceso = {
    ...charlaEnProceso,
    plantilla,
    relator: f.relator.value,
    firmaRelator: firmaCanvasADataURL('firma-canvas-relator'),
    obra: valorObra(f.obra, 'input-charla-obra-otra'),
    fecha: f.fecha.value,
    hora: plantilla ? '' : f.hora.value,
    tema: plantilla ? plantilla.nombre : f.tema.value,
    riesgos: plantilla ? '' : f.riesgos.value,
    medidas: plantilla ? '' : f.medidas.value,
    cargoRelator: plantilla ? f.cargoRelator.value : '',
    actividad: plantilla ? f.actividad.value : '',
    duracion: plantilla ? f.duracion.value : '',
    asistentes, asistenteActual: 0,
  };
  closePanel('panel-realizar-charla');
  if (asistentes.length === 0) { finalizarCharla(); return; }
  setTimeout(() => { openPanel('panel-firmar-asistente'); mostrarFirmaAsistenteActual(); }, 260);
}
function mostrarFirmaAsistenteActual() {
  const { asistentes, asistenteActual } = charlaEnProceso;
  const a = asistentes[asistenteActual];
  document.getElementById('firmar-asistente-progreso').textContent = `Firma ${asistenteActual + 1} de ${asistentes.length}`;
  document.getElementById('firmar-asistente-nombre').textContent = a.nombre;
  document.getElementById('firmar-asistente-rut').textContent = a.rut;
  setTimeout(() => initFirmaPad('firma-canvas-asistente'), 80);
}
function avanzarAsistente() {
  charlaEnProceso.asistenteActual++;
  if (charlaEnProceso.asistenteActual >= charlaEnProceso.asistentes.length) {
    closePanel('panel-firmar-asistente');
    setTimeout(finalizarCharla, 260);
  } else {
    mostrarFirmaAsistenteActual();
  }
}
function confirmarFirmaAsistente() {
  if (firmaEstaVacia('firma-canvas-asistente')) { toast('Falta la firma', 'error'); return; }
  charlaEnProceso.asistentes[charlaEnProceso.asistenteActual].firma = firmaCanvasADataURL('firma-canvas-asistente');
  avanzarAsistente();
}
function saltarFirmaAsistente() { avanzarAsistente(); }
function cancelarFirmaAsistentes() {
  closePanel('panel-firmar-asistente');
  charlaEnProceso = null;
  toast('Registro de charla cancelado', 'error');
}
async function finalizarCharla() {
  try {
    toast('Generando documento...');
    const pdfLink = charlaEnProceso.plantilla
      ? await generarPdfCharlaSobrePlantilla(charlaEnProceso, charlaEnProceso.plantilla)
      : await generarYSubirPdfCharla(charlaEnProceso);
    const asistentesTxto = charlaEnProceso.asistentes.map(a => `${a.nombre} (${a.rut})`).join('; ');
    await ensureToken();
    if (charlaEnProceso.fila) {
      // Charla que ya existía como alerta "Pendiente" (generada por Inspección/Incidente): actualiza esa fila
      const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_CHARLAS}'!E${charlaEnProceso.fila}:N${charlaEnProceso.fila}`)}?valueInputOption=USER_ENTERED`;
      await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
        body: JSON.stringify({ values: [[
          'Realizada', hoyISO(), userEmail || '', charlaEnProceso.relator, charlaEnProceso.obra, charlaEnProceso.hora,
          charlaEnProceso.riesgos, charlaEnProceso.medidas, asistentesTxto, pdfLink,
        ]] }) });
    } else {
      // Charla hecha por iniciativa propia, sin alerta previa: se agrega una fila completa nueva
      const n = allCharlas.length + 1;
      await appendSheet(`'${CONFIG.SHEET_CHARLAS}'!A:N`, [[
        n, hoyISO(), charlaEnProceso.tema, 'Manual', 'Realizada', hoyISO(), userEmail || '',
        charlaEnProceso.relator, charlaEnProceso.obra, charlaEnProceso.hora,
        charlaEnProceso.riesgos, charlaEnProceso.medidas, asistentesTxto, pdfLink,
      ]]);
    }
    toast('Charla registrada y documento generado ✓', 'ok');
    charlaEnProceso = null;
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Generación del PDF de Charla (plantilla plana, sin campos rellenables:
// se dibuja el texto/las firmas encima en las coordenadas exactas de cada
// campo, medidas a mano sobre la plantilla original) ──────────────────
function ddmmyyyy(iso) { return (iso || hoyISO()).split('-').reverse().join('-'); }
async function generarYSubirPdfCharla(datos) {
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const templateBytes = await fetch('plantillas/charla_5min.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const [p1, p2] = pdfDoc.getPages();
  const H = 792;

  function cover(page, x0, top0, x1, top1) {
    page.drawRectangle({ x: x0, y: H - top1, width: x1 - x0, height: top1 - top0, color: rgb(1,1,1) });
  }
  function text(page, str, x, top, size) {
    page.drawText(str || '', { x, y: H - top, size: size || 9, font, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  function textBlock(page, str, x, tops, maxWidth, size) {
    wrapLines(str, maxWidth, size || 9).slice(0, tops.length).forEach((line, i) => text(page, line, x, tops[i], size));
  }
  async function drawSig(page, dataUrl, x, top, w, h) {
    if (!dataUrl) return;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);
    const dims = escalarFirmaCasillero(img, w, h);
    page.drawImage(img, { x, y: H - top - dims.height, width: dims.width, height: dims.height });
  }

  // Tapar pie de página de la plantilla original y la fecha de generación vieja
  [p1, p2].forEach(p => {
    cover(p, 200, 770, 400, 790);
    cover(p, 503, 15, 560, 29);
    text(p, ddmmyyyy(hoyISO()), 504, 26);
  });

  // Encabezado
  text(p1, datos.relator, 155, 109, 10);
  text(p1, datos.obra, 155, 138.5, 10);
  text(p1, ddmmyyyy(datos.fecha), 155, 154, 10);
  text(p1, datos.hora, 422, 154, 10);
  await drawSig(p1, datos.firmaRelator, 422, 97, 130, 26);

  // Tema / Riesgos / Medidas (se reparte en las líneas disponibles de la plantilla)
  textBlock(p1, datos.tema, 52, [196, 210.6, 225.2], 505);
  textBlock(p1, datos.riesgos, 52, [266.9, 281.5, 296.1, 310.9], 505);
  textBlock(p1, datos.medidas, 52, [353.5, 368.1, 382.9, 396.2, 409.6], 505);

  // Tabla de asistentes: filas 1-12 en la página 1, 13-35 en la página 2
  const filasP1 = [453.2,478.4,503.4,528.4,553.4,578.6,603.6,628.6,653.6,678.9,703.9,728.9];
  const filasP2 = [117.3,142.3,167.3,192.3,217.5,242.6,267.6,292.5,317.8,342.8,367.8,392.8,418.0,443.0,468.0,493.0,518.0,543.2,568.2,593.2,618.2,643.4,668.4];
  for (let i = 0; i < datos.asistentes.length && i < filasP1.length; i++) {
    const a = datos.asistentes[i], top = filasP1[i];
    text(p1, a.nombre, 85, top + 8);
    text(p1, a.rut, 365, top + 8);
    await drawSig(p1, a.firma, 488, top - 1, 65, 23);
  }
  for (let i = filasP1.length; i < datos.asistentes.length && i < filasP1.length + filasP2.length; i++) {
    const a = datos.asistentes[i], top = filasP2[i - filasP1.length];
    text(p2, a.nombre, 85, top + 8);
    text(p2, a.rut, 365, top + 8);
    await drawSig(p2, a.firma, 488, top - 1, 65, 23);
  }

  // Nombre y firma del relator (línea final, página 2)
  text(p2, datos.relator, 215, 731, 10);

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const up = await uploadFile(blob, 'Charlas', 'charla_' + (datos.obra || 'obra').replace(/\s+/g,'_'), 'pdf');
  return up.link;
}

// ── Charla sobre un archivo de la biblioteca (charlas reales del cliente,
// formato oficial "CHARLA DE SEGURIDAD" con casillero OBRA/TEMA/ACTIVIDAD/
// DICTADA POR/FECHA/DURACION/FIRMA + tabla NOMBRE/RUT/FIRMA de asistentes):
// el Tema/Riesgos/Medidas ya vienen escritos en el documento, así que en vez
// de escribir contenido nuevo, se dibuja solo en los espacios que ese mismo
// documento trae en blanco. Como cada archivo lo manda el cliente por
// separado, no se puede asumir que esos espacios estén siempre en el mismo
// píxel exacto (se comprobó que hasta dentro de un mismo documento la fila
// puede correrse unos pocos puntos entre página y página) — por eso se
// ubica cada campo leyendo el texto real del PDF con pdf.js en vez de
// coordenadas fijas.
let _pdfjsLib = null;
async function cargarPdfJs() {
  if (_pdfjsLib) return _pdfjsLib;
  const lib = await import('./vendor/pdf.min.mjs');
  lib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.mjs';
  _pdfjsLib = lib;
  return lib;
}
// Extrae, por página, cada fragmento de texto con su posición real (x, y en
// coordenadas PDF de origen abajo-izquierda — el mismo sistema que usa
// pdf-lib para dibujar, así que las posiciones se pueden reusar tal cual).
// Algunos PDFs traen una misma palabra partida en dos fragmentos de texto
// pegados sin espacio real entre ellos (ej. "F" + "IRMA:", visto en uno de
// los archivos reales — un detalle de cómo Word/el exportador separó los
// glifos, no algo que dependa de la app) — si no se reconstruyen, la
// etiqueta "FIRMA:" completa nunca calza con el patrón que se busca más
// abajo. Se fusionan los fragmentos de una misma fila cuyo espacio entre
// uno y el siguiente es casi cero (bien distinto del espacio real entre
// palabras separadas, de varios puntos).
function fusionarFragmentosPegados(items) {
  const ordenados = [...items].sort((a, b) => a.y !== b.y ? b.y - a.y : a.x - b.x);
  const resultado = [];
  for (const it of ordenados) {
    const anterior = resultado[resultado.length - 1];
    if (anterior && Math.abs(anterior.y - it.y) < 0.5 && (it.x - (anterior.x + anterior.ancho)) < 1) {
      anterior.texto += it.texto;
      anterior.ancho = (it.x + it.ancho) - anterior.x;
    } else {
      resultado.push({ ...it });
    }
  }
  return resultado;
}
async function extraerTextoPdfJs(bytes) {
  const pdfjsLib = await cargarPdfJs();
  const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
  const paginas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const contenido = await page.getTextContent();
    const items = contenido.items.map(it => ({
      texto: (it.str || '').trim(), x: it.transform[4], y: it.transform[5], ancho: it.width,
    })).filter(it => it.texto);
    paginas.push(fusionarFragmentosPegados(items));
  }
  return paginas;
}
// Ubica, en cada página donde aparezcan, las etiquetas del formato oficial
// de charla y calcula dónde debería ir el valor de cada una (mismo alto que
// la etiqueta, un poco a la derecha de su ancho real). Devuelve listas (una
// posición por cada página en que la etiqueta aparece, porque el casillero
// se repite igual en todas las páginas del documento) más la ubicación de
// la tabla de asistentes (página + columnas + la fila real de cada N°).
function ubicarCamposCharlaSGSST(paginas) {
  const campos = { obra: [], dictadaPor: [], cargo: [], actividad: [], fecha: [], duracion: [], firmaRelator: [], asistentes: null };
  const GAP = 8;
  paginas.forEach((items, pageIdx) => {
    const buscar = (txt) => items.find(it => it.texto === txt);
    // Las etiquetas OBRA/ACTIVIDAD/DICTADA POR/FECHA/DURACION tienen su ":"
    // como un elemento de texto aparte, más a la derecha (para que quede
    // alineado aunque las etiquetas tengan largos distintos) — hay que
    // ubicar el valor después de ESE ":", no pegado a la etiqueta.
    const buscarDosPuntos = (labelItem) => {
      if (!labelItem) return null;
      return items.find(it => it.texto === ':' && Math.abs(it.y - labelItem.y) < 2 && it.x > labelItem.x) || labelItem;
    };
    // Algunos documentos reales tienen poco espacio entre un campo y el
    // siguiente (ej. "DURACION :" y "FIRMA:" quedaron casi pegados en uno de
    // los archivos del cliente, sin espacio real para escribir la duración
    // en el medio) — se guarda hasta dónde se puede escribir sin invadir el
    // siguiente texto de esa misma fila, para que `escribir()` pueda achicar
    // la letra o, si de plano no entra, no dibujar nada ahí en vez de
    // encimarse con la etiqueta de al lado.
    const limiteDerecho = (inicio, y) => {
      let limite = inicio + 400;
      items.forEach(it => { if (Math.abs(it.y - y) < 2 && it.x > inicio + 1 && it.x < limite) limite = it.x; });
      return limite;
    };
    const agregar = (lista, labelItem) => {
      if (!labelItem) return;
      const ancla = buscarDosPuntos(labelItem);
      const inicio = ancla.x + ancla.ancho;
      // El límite se calcula desde el final "crudo" del ancla (antes de
      // aplicar el GAP) — si se calculara después del GAP, un GAP que ya se
      // pase de largo (como pasó con "DURACION :" seguido de "FIRMA:" casi
      // pegado en uno de los documentos) haría que el siguiente texto de la
      // fila quedara ANTES del punto de partida y el choque nunca se detectara.
      const limite = limiteDerecho(inicio, labelItem.y);
      const x = Math.min(inicio + GAP, limite - 2);
      lista.push({ page: pageIdx, x, y: labelItem.y, limite });
    };
    agregar(campos.obra, buscar('OBRA'));
    agregar(campos.dictadaPor, buscar('DICTADA POR'));
    agregar(campos.cargo, buscar('Cargo:'));
    agregar(campos.actividad, buscar('ACTIVIDAD'));
    agregar(campos.fecha, buscar('FECHA'));
    const duracionItem = buscar('DURACION');
    agregar(campos.duracion, duracionItem);
    // La etiqueta de la firma del relator viene en la misma fila que
    // DURACION, pero el texto puede venir como "FIRMA" o "FIRMA:" según el
    // documento (se vio incluso distinto entre página 1 y 2 del mismo PDF) —
    // se ubica por posición (misma fila, más a la derecha), no por texto exacto.
    if (duracionItem) {
      const firmaLabel = items.find(it => /^FIRMA:?$/.test(it.texto) && Math.abs(it.y - duracionItem.y) < 2 && it.x > duracionItem.x + 100);
      if (firmaLabel) campos.firmaRelator.push({ page: pageIdx, x: firmaLabel.x + firmaLabel.ancho + GAP, y: firmaLabel.y });
    }
    const nombreH = buscar('NOMBRE'), rutH = buscar('RUT'), firmaH = buscar('FIRMA');
    if (nombreH && rutH && firmaH && !campos.asistentes) {
      const filas = items.filter(it => /^\d+\.$/.test(it.texto)).sort((a, b) => b.y - a.y);
      if (filas.length) campos.asistentes = { page: pageIdx, rutX: rutH.x, firmaX: firmaH.x, filas };
    }
  });
  return campos;
}
async function generarPdfCharlaSobrePlantilla(datos, plantilla) {
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const bytes = await fetch(plantilla.archivo).then(r => r.arrayBuffer());
  // pdf.js transfiere este buffer a su worker (queda "detached"), así que
  // hay que copiarlo antes de leerlo — pdf-lib necesita su propia copia intacta.
  const paginasTexto = await extraerTextoPdfJs(bytes.slice(0));
  const campos = ubicarCamposCharlaSGSST(paginasTexto);

  const pdfDoc = await PDFDocument.load(bytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const paginas = pdfDoc.getPages();

  // El punto (x,y) de cada campo es la posición base (baseline) del texto
  // vecino que se usó como ancla, no el centro de su casilla — para que la
  // firma quede centrada en la línea (y no "flotando" muy arriba) hay que
  // bajarla un poco: se centra su alto alrededor de baseline + capHeight/2
  // (mismo criterio ya usado para centrar texto en DIAT/Investigación).
  function escribir(lista, valor, sizeBase) {
    if (!valor) return;
    lista.forEach(pos => {
      const disponible = (pos.limite != null ? pos.limite : Infinity) - pos.x - 2;
      let size = sizeBase || 9;
      let texto = valor;
      // Si el documento no deja suficiente espacio antes del siguiente
      // texto de la fila (ver limiteDerecho más arriba), se achica la letra
      // hasta un mínimo razonable y, si aun así no entra, se recorta con
      // "…" en vez de escribir encima de la etiqueta de al lado.
      while (size > 6 && font.widthOfTextAtSize(texto, size) > disponible) size -= 0.5;
      if (font.widthOfTextAtSize(texto, size) > disponible) {
        while (texto.length > 0 && font.widthOfTextAtSize(texto + '…', size) > disponible) texto = texto.slice(0, -1);
        texto = texto ? texto + '…' : '';
      }
      if (!texto) return;
      paginas[pos.page].drawText(texto, { x: pos.x, y: pos.y, size, font, color: rgb(0,0,0) });
    });
  }
  async function firmar(lista, dataUrl, w, h) {
    if (!dataUrl) return;
    const imgBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    const img = await pdfDoc.embedPng(imgBytes);
    const dims = escalarFirmaCasillero(img, w, h);
    lista.forEach(pos => {
      const centroLinea = pos.y + 3.5;
      paginas[pos.page].drawImage(img, { x: pos.x, y: centroLinea - dims.height / 2, width: dims.width, height: dims.height });
    });
  }

  escribir(campos.obra, datos.obra);
  escribir(campos.dictadaPor, datos.relator);
  escribir(campos.cargo, datos.cargoRelator);
  escribir(campos.actividad, datos.actividad);
  escribir(campos.fecha, ddmmyyyy(datos.fecha));
  escribir(campos.duracion, datos.duracion);
  await firmar(campos.firmaRelator, datos.firmaRelator, 80, 14);

  if (campos.asistentes) {
    const { page, rutX, firmaX, filas } = campos.asistentes;
    const p = paginas[page];
    for (let i = 0; i < datos.asistentes.length && i < filas.length; i++) {
      const a = datos.asistentes[i], fila = filas[i];
      // El nombre se pega justo después del número de fila ("1.", "2.", ...)
      // en vez de alinearse con el encabezado "NOMBRE" (que queda centrado
      // en la columna) — así un nombre largo tiene todo el ancho de la
      // columna disponible para la derecha, en vez de arrancar ya corrido.
      const nombreX = fila.x + fila.ancho + 8;
      p.drawText(a.nombre, { x: nombreX, y: fila.y, size: 9, font, color: rgb(0,0,0) });
      p.drawText(a.rut, { x: rutX, y: fila.y, size: 9, font, color: rgb(0,0,0) });
      if (a.firma) {
        const imgBytes = Uint8Array.from(atob(a.firma.split(',')[1]), c => c.charCodeAt(0));
        const img = await pdfDoc.embedPng(imgBytes);
        const dims = escalarFirmaCasillero(img, 70, 14);
        const centroLinea = fila.y + 3.5;
        p.drawImage(img, { x: firmaX, y: centroLinea - dims.height / 2, width: dims.width, height: dims.height });
      }
    }
  }

  const outBytes = await pdfDoc.save();
  const blob = new Blob([outBytes], { type: 'application/pdf' });
  const up = await uploadFile(blob, 'Charlas', 'charla_' + (datos.obra || 'obra').replace(/\s+/g,'_'), 'pdf');
  return up.link;
}

// ============================================================
// MÓDULO: INCIDENTES Y ACCIDENTES (con foto)
// ============================================================
function renderIncidentes() {
  const obraSel = obraFiltroActivo();
  let items = obraSel ? allIncidentes.filter(i => i.obra === obraSel) : [...allIncidentes];
  const equipo = miEquipoActual();
  if (equipo) items = items.filter(i => equipo.has(i.trabajador));
  items = items.reverse();
  if (items.length === 0) { setListHTML('incidentes', emptyState('Sin incidentes registrados', '')); return; }
  setListHTML('incidentes', items.map(i => `
    <div class="card card--default" onclick="abrirDetalleIncidente(${i.fila})">
      <div class="card-icon modulo-icon--and">${ic('incidentes',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(i.tipo)}${i.trabajador ? ' — ' + esc(i.trabajador) : ''}</div>
        <div class="card-sub">${esc(i.fecha)} · ${esc(i.area)}${i.obra ? ' · ' + esc(i.obra) : ''}</div>
        <div class="badge-row"><span class="badge red">${esc(i.gravedad)}</span>
        <span class="badge ${i.estado==='Cerrado'?'green':'gray'}">${esc(i.estado)}</span>
        ${i.atencionMedicaEstado==='Pendiente' ? '<span class="badge amber">Atención médica: por definir</span>' : ''}
        ${i.atencionMedicaEstado && i.atencionMedicaEstado!=='Pendiente' ? `<span class="badge green">${esc(i.atencionMedicaEstado)}</span>` : ''}
        ${i.investigacionEstado==='Pendiente' ? '<span class="badge amber">Investigación pendiente</span>' : ''}
        ${i.investigacionEstado==='Completada' ? '<span class="badge green">Investigación completada</span>' : ''}</div>
        ${i.atencionMedicaEstado==='Pendiente' ? `<button class="action-btn" onclick="event.stopPropagation(); abrirPreguntaAtencionMedica(${i.fila})">Definir atención médica</button>` : ''}
        ${i.investigacionEstado==='Pendiente' ? `<button class="action-btn" onclick="event.stopPropagation(); abrirInvestigacion(${i.fila})">Realizar investigación</button>` : ''}
        ${i.investigacionEstado==='Completada' && i.investigacionPdf ? `<a href="${esc(i.investigacionPdf)}" target="_blank" class="badge blue" onclick="event.stopPropagation();">${ic('documento',12)} Ver informe</a>` : ''}
      </div>
      <div class="card-arrow">›</div>
    </div>`).join(''));
}
function abrirDetalleIncidente(fila) {
  const i = allIncidentes.find(x => x.fila === fila);
  if (!i) { toast('No se encontró el registro', 'error'); return; }
  // Supervisor responsable: el supervisor de la Obra del trabajador
  // involucrado (o de la Obra del incidente, si no hay trabajador asociado),
  // priorizando al que tenga la especialidad del incidente (se adivina del
  // texto igual que la sugerencia de charla, ya que Incidentes no tiene un
  // campo de Tema propio).
  const trabInvolucrado = i.trabajador && allTrabajadores.find(x => x.nombre === i.trabajador);
  const obraParaSupervisor = (trabInvolucrado && trabInvolucrado.obra) || i.obra;
  const temaIncidente = sugerirTemaCharla(`${i.descripcion} ${i.causas} ${i.area}`);
  const supervisorResponsable = supervisorDeObra(obraParaSupervisor, temaIncidente);
  document.getElementById('pnl-title-detalle-incidente').textContent = i.tipo;
  document.getElementById('detalle-incidente-body').innerHTML = `
    <div class="ficha-hero">
      <div class="ficha-hero-icon">${ic('incidentes',32)}</div>
      <div class="ficha-hero-info">
        <div class="ficha-hero-type">${esc(i.tipo)}</div>
        <div class="ficha-hero-name">${esc(i.area)}</div>
        <div class="ficha-hero-badges">
          <span class="badge red">${esc(i.gravedad)}</span>
          <span class="badge ${i.estado==='Cerrado'?'green':'gray'}">${esc(i.estado)}</span>
        </div>
      </div>
    </div>

    <div class="ficha-section">
      <div class="ficha-sec-title">Información general</div>
      <div class="field-row"><span class="fl">Fecha</span><span class="fv">${esc(i.fecha)}</span></div>
      ${i.trabajador ? `<div class="field-row"><span class="fl">Trabajador</span><span class="fv">${esc(i.trabajador)}</span></div>` : ''}
      <div class="field-row"><span class="fl">Obra</span><span class="fv">${esc(i.obra || '—')}</span></div>
      ${supervisorResponsable && supervisorResponsable.nombre !== i.trabajador ? `<div class="field-row"><span class="fl">Supervisor responsable</span><span class="fv">${esc(supervisorResponsable.nombre)}</span></div>` : ''}
      <div class="field-row"><span class="fl">Días perdidos</span><span class="fv">${i.diasPerdidos || 0}</span></div>
    </div>

    <div class="ficha-section">
      <div class="ficha-sec-title">Descripción</div>
      <div class="card-sub" style="white-space:normal;">${esc(i.descripcion) || '—'}</div>
      ${i.causas ? `<div class="sec-label" style="margin-top:14px;">Causas</div><div class="card-sub" style="white-space:normal;">${esc(i.causas)}</div>` : ''}
      ${i.accion ? `<div class="sec-label" style="margin-top:14px;">Acciones correctivas</div><div class="card-sub" style="white-space:normal;">${esc(i.accion)}</div>` : ''}
    </div>

    <div class="ficha-section">
      <div class="ficha-sec-title">Registro</div>
      <div class="field-row"><span class="fl">Fecha de registro</span><span class="fv">${esc(i.fechaRegistro || '—')}</span></div>
      <div class="field-row"><span class="fl">Reportado por</span><span class="fv">${esc(i.reportadoPor || '—')}</span></div>
      ${i.foto ? `<div class="field-row"><span class="fl">Foto</span><a href="${esc(i.foto)}" target="_blank" class="badge blue">${ic('camara',12)} Ver foto</a></div>` : ''}
      ${i.respaldo ? `<div class="field-row"><span class="fl">Respaldo de cierre</span><a href="${esc(i.respaldo)}" target="_blank" class="badge blue">${ic('documento',12)} Ver respaldo</a></div>` : ''}
    </div>

    ${i.atencionMedicaEstado ? `
    <div class="ficha-section">
      <div class="ficha-sec-title">Atención médica</div>
      <div class="field-row"><span class="fl">Estado</span><span class="badge ${i.atencionMedicaEstado==='Pendiente'?'amber':'green'}">${esc(i.atencionMedicaEstado)}</span></div>
      ${i.atencionMedicaPdf ? `<div class="field-row"><span class="fl">Documento</span><a href="${esc(i.atencionMedicaPdf)}" target="_blank" class="badge blue">${ic('documento',12)} Ver documento</a></div>` : ''}
    </div>` : ''}

    ${i.investigacionEstado ? `
    <div class="ficha-section">
      <div class="ficha-sec-title">Investigación de accidente</div>
      <div class="field-row"><span class="fl">Estado</span><span class="badge ${i.investigacionEstado==='Completada'?'green':'amber'}">${esc(i.investigacionEstado)}</span></div>
      ${i.investigacionResponsable ? `<div class="field-row"><span class="fl">Responsable</span><span class="fv">${esc(i.investigacionResponsable)}</span></div>` : ''}
      ${i.investigacionFecha ? `<div class="field-row"><span class="fl">Fecha</span><span class="fv">${esc(i.investigacionFecha)}</span></div>` : ''}
      ${i.investigacionPdf ? `<div class="field-row"><span class="fl">Informe</span><a href="${esc(i.investigacionPdf)}" target="_blank" class="badge blue">${ic('documento',12)} Ver informe</a></div>` : ''}
    </div>` : ''}

    ${i.atencionMedicaEstado === 'Pendiente' ? `<button class="action-btn" onclick="closePanel('panel-detalle-incidente'); abrirPreguntaAtencionMedica(${i.fila})">Definir atención médica</button>` : ''}
    ${i.investigacionEstado === 'Pendiente' ? `<button class="action-btn" onclick="closePanel('panel-detalle-incidente'); abrirInvestigacion(${i.fila})">Realizar investigación</button>` : ''}
    ${i.estado !== 'Cerrado' ? `<button class="action-btn" onclick="closePanel('panel-detalle-incidente'); abrirCerrarIncidente(${i.fila})">Cerrar caso</button>` : ''}
  `;
  openPanel('panel-detalle-incidente');
}
function abrirFormIncidente() {
  const f = document.getElementById('form-incidente');
  f.reset();
  f.fecha.value = hoyISO();
  document.getElementById('sel-trabajador-incidente').innerHTML =
    '<option value="">— Selecciona (opcional) —</option>' + selectTrabajadoresOptions();
  const selObra = document.getElementById('sel-obra-incidente');
  selObra.innerHTML = opcionesObraSelectHTML(obraPreseleccionada());
  onCambioObraSelect(selObra, 'input-incidente-obra-otra');
  openPanel('panel-form-incidente');
}
async function guardarIncidente(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    const trabNombre = f.trabajador.value ? f.trabajador.value.split('|')[0] : '';
    let fotoLink = '';
    const fotoFile = f.foto.files[0];
    if (fotoFile) {
      const up = trabNombre
        ? await uploadFileTrabajador(fotoFile, trabNombre, 'incidente_' + f.area.value.replace(/\s+/g,'_'))
        : await uploadFile(fotoFile, 'Incidentes-Accidentes', 'incidente_' + f.area.value.replace(/\s+/g,'_'));
      fotoLink = up.link;
    }
    const n = allIncidentes.length + 1;
    const obra = valorObra(f.obra, 'input-incidente-obra-otra');
    const diasPerdidos = parseInt(f.diasPerdidos.value, 10) || 0;
    // La investigación queda supeditada a resolver primero la pregunta de
    // atención médica (DIAT si es Sí, Declaración simple si es No) — no se
    // marca "Pendiente" de inmediato, se habilita recién al resolver eso.
    const atencionMedicaEstado = requiereInvestigacion(f.tipo.value) ? 'Pendiente' : '';
    await appendSheet(`'${CONFIG.SHEET_INCIDENTES}'!A:V`, [[
      n, f.fecha.value, f.tipo.value, trabNombre, f.area.value, f.descripcion.value,
      f.causas.value, f.gravedad.value, fotoLink, f.accion.value || '', 'Abierto',
      new Date().toLocaleString('es-CL'), userEmail || '', '', obra, diasPerdidos,
      '', '', '', '', atencionMedicaEstado, ''
    ]]);

    // Sugerencia automática de plan de acción según lo descrito en el incidente
    const plan = sugerirPlanAccion(f.descripcion.value, f.causas.value);

    toast('Registro guardado ✓', 'ok');
    closePanel('panel-form-incidente');
    await cargarTodo(true);

    if (plan) {
      if (plan.tipo === 'charla') {
        const nCharla = allCharlas.length + 1;
        await appendSheet(`'${CONFIG.SHEET_CHARLAS}'!A:G`, [[
          nCharla, hoyISO(), plan.valor, 'Incidente #' + n, 'Pendiente', '', ''
        ]]);
        cargarTodo(true);
      }
      mostrarAlertaPlan(plan, f.area.value, trabNombre);
    }
  } catch (e) { toast(e.message, 'error'); }
}
function mostrarAlertaPlan(plan, area, trabajador) {
  const textos = {
    charla: {
      titulo: 'Charla de seguridad sugerida',
      cuerpo: `Se recomienda realizar una <b>charla de seguridad</b> sobre:<br><span class="alerta-charla-tema">${esc(plan.valor)}</span>`,
      nota: 'Esta charla quedó registrada como <b>Pendiente</b> en el módulo "Charlas de Seguridad".',
      boton: 'Ver charlas pendientes',
    },
    epp: {
      titulo: 'Reposición de EPP sugerida',
      cuerpo: `Se recomienda <b>reponer/entregar</b>:<br><span class="alerta-charla-tema">${esc(plan.valor)}${trabajador ? ' — ' + esc(trabajador) : ''}</span>`,
      nota: 'Puedes registrar la entrega ahora mismo en el módulo de Entrega de EPP.',
      boton: 'Entregar EPP ahora',
    },
    mantencion: {
      titulo: 'Mantención sugerida',
      cuerpo: `Se recomienda:<br><span class="alerta-charla-tema">${esc(plan.valor)}</span>`,
      nota: 'Este tipo de seguimiento aún no se registra dentro de la app — coordina la mantención directamente.',
      boton: 'Entendido',
    },
  };
  const acciones = {
    charla: () => irPagina('charlas'),
    epp: () => { irPagina('epp'); abrirFormEpp(plan.valor, trabajador); },
    mantencion: () => {},
  };
  const t = textos[plan.tipo];
  document.getElementById('alerta-plan-titulo').textContent = t.titulo;
  document.getElementById('alerta-plan-cuerpo').innerHTML = t.cuerpo;
  document.getElementById('alerta-plan-nota').innerHTML = t.nota;
  document.getElementById('alerta-plan-area').textContent = area || '—';
  const btn = document.getElementById('alerta-plan-btn');
  btn.textContent = t.boton;
  btn.onclick = () => { closePanel('modal-alerta-plan'); acciones[plan.tipo](); };
  openPanel('modal-alerta-plan');
}
function abrirCerrarIncidente(fila) {
  const f = document.getElementById('form-cerrar-incidente');
  f.reset();
  f.fila.value = fila;
  openPanel('panel-cerrar-incidente');
}
async function guardarCierreIncidente(ev) {
  ev.preventDefault();
  const f = ev.target;
  const fila = f.fila.value;
  try {
    const inc = allIncidentes.find(x => String(x.fila) === String(fila));
    let respaldoLink = '';
    const respaldoFile = f.respaldo.files[0];
    if (respaldoFile) {
      const up = (inc && inc.trabajador)
        ? await uploadFileTrabajador(respaldoFile, inc.trabajador, 'respaldo_cierre')
        : await uploadFile(respaldoFile, 'Incidentes-Accidentes', 'respaldo_cierre');
      respaldoLink = up.link;
    }
    await ensureToken();
    const urlEstado = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_INCIDENTES}'!K${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(urlEstado, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [['Cerrado']] }) });
    if (respaldoLink) {
      const urlRespaldo = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_INCIDENTES}'!N${fila}`)}?valueInputOption=USER_ENTERED`;
      await fetch(urlRespaldo, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
        body: JSON.stringify({ values: [[respaldoLink]] }) });
    }
    toast('Caso cerrado ✓', 'ok');
    closePanel('panel-cerrar-incidente');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// MÓDULO: ATENCIÓN MÉDICA (DIAT / Declaración de rechazo)
// Al registrar un Accidente Leve/Grave/Fatal, antes de habilitar la
// Investigación se pregunta si el trabajador necesita atención médica:
// si Sí, se llena la DIAT (Denuncia Individual de Accidente del Trabajo,
// formulario oficial de la Mutual); si No, se genera una declaración simple
// en que el trabajador manifiesta su rechazo — sin firma digital, porque
// esa se hace a mano, en persona, después.
// ============================================================
let atencionMedicaFilaIncidente = null;
function abrirPreguntaAtencionMedica(filaIncidente) {
  atencionMedicaFilaIncidente = filaIncidente;
  openPanel('panel-pregunta-atencion-medica');
}
function elegirAtencionMedica(necesitaAtencion) {
  closePanel('panel-pregunta-atencion-medica');
  setTimeout(() => {
    if (necesitaAtencion) abrirFormDiat();
    else abrirFormDeclaracion();
  }, 260);
}

// ── DIAT (Denuncia Individual de Accidente del Trabajo) ──────────────────
const DIAT_CX = {}; // los checkbox de este documento no comparten franjas, cada uno mide su propio centro
const DIAT_PROPIEDAD_EMPRESA = [
  { label: 'Pública', x: 513.2, top: 225.9 }, { label: 'Privada', x: 553.7, top: 225.9 },
];
const DIAT_TIPO_EMPRESA = [
  { label: 'Principal', x: 53.0, top: 261.1 }, { label: 'Contratista', x: 112.0, top: 261.1 },
  { label: 'Subcontratista', x: 179.7, top: 261.1 }, { label: 'De Servicios Transitorios', x: 258.3, top: 261.1 },
];
const DIAT_SEXO = [{ label: 'Hombre', x: 53.2, top: 403.9 }, { label: 'Mujer', x: 107.4, top: 403.9 }];
const DIAT_PUEBLO_ORIGINARIO = [
  { label: 'Alacalufe', x: 310.5, top: 410.5 }, { label: 'Colla', x: 374.3, top: 410.3 },
  { label: 'Quechua', x: 439.3, top: 410.6 }, { label: 'Otro', x: 521.2, top: 409.2 },
  { label: 'Atacameño', x: 310.5, top: 424.2 }, { label: 'Diaguita', x: 374.2, top: 424.1 },
  { label: 'Rapanui', x: 439.2, top: 424.3 }, { label: 'Aimara', x: 310.5, top: 438.7 },
  { label: 'Mapuche', x: 374.2, top: 438.6 }, { label: 'Yamana (Yagán)', x: 439.2, top: 438.8 },
  { label: 'Ninguno', x: 521.2, top: 438.9 },
];
const DIAT_ANTIGUEDAD_UNIDAD = [
  { label: 'Días', x: 75.3, top: 469.8 }, { label: 'Meses', x: 108.4, top: 469.5 }, { label: 'Años', x: 146.9, top: 469.5 },
];
const DIAT_TIPO_CONTRATO = [
  { label: 'Indefinido', x: 195.4, top: 470.0 }, { label: 'Plazo Fijo', x: 258.1, top: 470.0 },
  { label: 'Por Obra o Faena', x: 322.5, top: 469.5 }, { label: 'Temporada', x: 414.1, top: 470.1 },
];
const DIAT_TIPO_INGRESO = [
  { label: 'Remuneración Fija', x: 491.5, top: 478.7 }, { label: 'Remuneración Variable', x: 491.4, top: 491.7 },
  { label: 'Honorarios', x: 491.3, top: 504.7 },
];
const DIAT_CATEGORIA_OCUPACIONAL = [
  { label: 'Empleador', x: 52.9, top: 503.2 }, { label: 'Trabajador Dependiente', x: 105.0, top: 503.2 },
  { label: 'Trabajador Independiente', x: 197.9, top: 503.2 }, { label: 'Familiar no Remunerado', x: 296.3, top: 503.2 },
  { label: 'Trabajador Voluntario', x: 391.8, top: 503.2 },
];
const DIAT_AMPM_ACCIDENTE = [{ label: 'A.M.', x: 311.0, top: 551.2 }, { label: 'P.M.', x: 340.5, top: 551.2 }];
const DIAT_AMPM_INGRESO = [{ label: 'A.M.', x: 421.7, top: 551.3 }, { label: 'P.M.', x: 451.2, top: 551.3 }];
const DIAT_AMPM_SALIDA = [{ label: 'A.M.', x: 531.9, top: 551.5 }, { label: 'P.M.', x: 561.4, top: 551.5 }];
const DIAT_DESARROLLABA_HABITUAL = [{ label: 'Sí', x: 540.9, top: 719.8 }, { label: 'No', x: 564.4, top: 719.8 }];
const DIAT_CLASIFICACION_ACCIDENTE = [
  { label: 'Grave', x: 52.1, top: 757.8 }, { label: 'Fatal', x: 87.6, top: 757.8 }, { label: 'Otro', x: 120.0, top: 757.8 },
];
const DIAT_TIPO_ACCIDENTE = [{ label: 'Trabajo', x: 163.2, top: 755.0 }, { label: 'Trayecto', x: 222.9, top: 755.0 }];
const DIAT_TIPO_ACCIDENTE_TRAYECTO = [
  { label: 'Domicilio - Trabajo', x: 479.3, top: 754.1 }, { label: 'Trabajo - Domicilio', x: 479.2, top: 767.0 },
  { label: 'Entre dos Trabajos', x: 479.2, top: 779.6 },
];
const DIAT_MEDIO_PRUEBA = [
  { label: 'Parte de Carabineros', x: 51.4, top: 780.5 }, { label: 'Declaración', x: 137.4, top: 780.5 },
  { label: 'Testigos', x: 195.7, top: 780.5 }, { label: 'Otro', x: 245.5, top: 780.5 },
];
const DIAT_CLASIFICACION_DENUNCIANTE = [
  { label: 'Empleador', x: 177.5, top: 881.8 }, { label: 'Trabajador/a', x: 248.4, top: 881.7 },
  { label: 'Familiar', x: 319.8, top: 881.5 }, { label: 'Médico Tratante', x: 374.9, top: 881.6 },
  { label: 'Comité Paritario', x: 177.5, top: 896.0 }, { label: 'Empresa Usuaria', x: 272.3, top: 896.0 },
  { label: 'Otro', x: 374.9, top: 895.9 },
];

function renderChecklistsDiat() {
  renderChecklistInv('chk-diat-propiedad', DIAT_PROPIEDAD_EMPRESA, 'radio', 'diatPropiedad');
  renderChecklistInv('chk-diat-tipoempresa', DIAT_TIPO_EMPRESA, 'radio', 'diatTipoEmpresa');
  renderChecklistInv('chk-diat-sexo', DIAT_SEXO, 'radio', 'diatSexo');
  renderChecklistInv('chk-diat-pueblo', DIAT_PUEBLO_ORIGINARIO, 'radio', 'diatPueblo');
  renderChecklistInv('chk-diat-antiguedadunidad', DIAT_ANTIGUEDAD_UNIDAD, 'radio', 'diatAntiguedadUnidad');
  renderChecklistInv('chk-diat-tipocontrato', DIAT_TIPO_CONTRATO, 'radio', 'diatTipoContrato');
  renderChecklistInv('chk-diat-tipoingreso', DIAT_TIPO_INGRESO, 'radio', 'diatTipoIngreso');
  renderChecklistInv('chk-diat-categoria', DIAT_CATEGORIA_OCUPACIONAL, 'radio', 'diatCategoria');
  renderChecklistInv('chk-diat-ampm-accidente', DIAT_AMPM_ACCIDENTE, 'radio', 'diatAmpmAccidente');
  renderChecklistInv('chk-diat-ampm-ingreso', DIAT_AMPM_INGRESO, 'radio', 'diatAmpmIngreso');
  renderChecklistInv('chk-diat-ampm-salida', DIAT_AMPM_SALIDA, 'radio', 'diatAmpmSalida');
  renderChecklistInv('chk-diat-desarrollaba', DIAT_DESARROLLABA_HABITUAL, 'radio', 'diatDesarrollaba');
  renderChecklistInv('chk-diat-clasificacion', DIAT_CLASIFICACION_ACCIDENTE, 'radio', 'diatClasificacion');
  renderChecklistInv('chk-diat-tipoaccidente', DIAT_TIPO_ACCIDENTE, 'radio', 'diatTipoAccidente');
  renderChecklistInv('chk-diat-trayecto', DIAT_TIPO_ACCIDENTE_TRAYECTO, 'radio', 'diatTrayecto');
  renderChecklistInv('chk-diat-medioprueba', DIAT_MEDIO_PRUEBA, 'radio', 'diatMedioPrueba');
  renderChecklistInv('chk-diat-denunciante', DIAT_CLASIFICACION_DENUNCIANTE, 'radio', 'diatDenunciante');
}
function seleccionadoRadioInv(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? parseInt(el.value, 10) : -1;
}
// Marca el radio de un checklist DIAT/Investigación buscando el índice cuyo
// label calza con un valor guardado (ej. el Sexo o el Tipo de Contrato del
// trabajador) — usado para prellenar desde los datos personales guardados.
function marcarRadioPorLabel(name, catalogo, label) {
  if (!label) return;
  const idx = catalogo.findIndex(o => o.label === label);
  if (idx < 0) return;
  const el = document.querySelector(`input[name="${name}"][value="${idx}"]`);
  if (el) el.checked = true;
}

function abrirFormDiat() {
  const inc = allIncidentes.find(x => x.fila === atencionMedicaFilaIncidente);
  if (!inc) { toast('No se encontró el registro', 'error'); return; }
  const trab = inc.trabajador && allTrabajadores.find(x => x.nombre === inc.trabajador);
  const f = document.getElementById('form-diat');
  f.reset();
  f.empleadorNombre.value = 'Constructora LST SpA';
  f.trabajadorNombre.value = inc.trabajador || '';
  f.trabajadorRun.value = trab ? trab.rut : '';
  f.profesionOficio.value = trab ? trab.cargo : '';
  f.nacionalidad.value = (trab && trab.nacionalidad) || 'Chilena';
  f.fechaAccidente.value = inc.fecha || hoyISO();
  f.lugarAccidente.value = inc.area || '';
  f.direccionAccidente.value = inc.obra || '';
  f.descripcionAccidente.value = inc.descripcion || '';

  // Datos personales del trabajador (fila TRABAJADORES) — se rellenan solos
  // si ya están cargados en su ficha, en vez de escribirlos de nuevo cada
  // vez que se llena un DIAT.
  if (trab) {
    f.trabajadorDireccion.value = trab.direccion || '';
    f.trabajadorComuna.value = trab.comuna || '';
    f.trabajadorTelefono.value = trab.telefono || '';
    f.fechaNacimiento.value = trab.fechaNacimiento || '';
    f.edad.value = calcularEdad(trab.fechaNacimiento, inc.fecha);
    const antiguedad = calcularAntiguedad(trab.fechaIngreso, inc.fecha);
    if (antiguedad) f.antiguedadValor.value = antiguedad.valor;
  }

  renderChecklistsDiat();
  openPanel('panel-form-diat');
  // Los radios recién se pueden marcar después de renderChecklistsDiat()
  // (se insertan de forma síncrona arriba, así que ya existen en el DOM).
  if (trab) {
    marcarRadioPorLabel('diatSexo', DIAT_SEXO, trab.sexo);
    marcarRadioPorLabel('diatPueblo', DIAT_PUEBLO_ORIGINARIO, trab.puebloOriginario);
    marcarRadioPorLabel('diatTipoContrato', DIAT_TIPO_CONTRATO, trab.tipoContrato);
    marcarRadioPorLabel('diatTipoIngreso', DIAT_TIPO_INGRESO, trab.tipoIngreso);
    marcarRadioPorLabel('diatCategoria', DIAT_CATEGORIA_OCUPACIONAL, trab.categoriaOcupacional);
    const antiguedad = calcularAntiguedad(trab.fechaIngreso, inc.fecha);
    if (antiguedad) marcarRadioPorLabel('diatAntiguedadUnidad', DIAT_ANTIGUEDAD_UNIDAD, antiguedad.unidad);
  }
  // Clasificación del accidente prellenada según el tipo ya registrado
  const idxClasificacion = inc.tipo === 'Accidente Grave' ? 0 : inc.tipo === 'Accidente Fatal' ? 1 : 2;
  const elClasificacion = document.querySelector(`input[name="diatClasificacion"][value="${idxClasificacion}"]`);
  if (elClasificacion) elClasificacion.checked = true;
}
async function guardarDiat(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    toast('Generando documento...');
    const datos = {
      empleadorNombre: f.empleadorNombre.value, empleadorRut: f.empleadorRut.value,
      empleadorDireccion: f.empleadorDireccion.value, empleadorComuna: f.empleadorComuna.value,
      empleadorTelefono: f.empleadorTelefono.value,
      nTrabHombres: f.nTrabHombres.value, nTrabMujeres: f.nTrabMujeres.value,
      propiedadEmpresa: seleccionadoRadioInv('diatPropiedad'), tipoEmpresa: seleccionadoRadioInv('diatTipoEmpresa'),
      actividadEconomica: f.actividadEconomica.value, actividadEconomicaPrincipal: f.actividadEconomicaPrincipal.value,
      trabajadorNombre: f.trabajadorNombre.value, trabajadorRun: f.trabajadorRun.value,
      trabajadorDireccion: f.trabajadorDireccion.value, trabajadorComuna: f.trabajadorComuna.value,
      trabajadorTelefono: f.trabajadorTelefono.value,
      sexo: seleccionadoRadioInv('diatSexo'), edad: f.edad.value, fechaNacimiento: f.fechaNacimiento.value,
      pueblo: seleccionadoRadioInv('diatPueblo'), nacionalidad: f.nacionalidad.value, profesionOficio: f.profesionOficio.value,
      antiguedadValor: f.antiguedadValor.value, antiguedadUnidad: seleccionadoRadioInv('diatAntiguedadUnidad'),
      tipoContrato: seleccionadoRadioInv('diatTipoContrato'), tipoIngreso: seleccionadoRadioInv('diatTipoIngreso'),
      categoria: seleccionadoRadioInv('diatCategoria'),
      fechaAccidente: f.fechaAccidente.value,
      horaAccidente: f.horaAccidente.value, ampmAccidente: seleccionadoRadioInv('diatAmpmAccidente'),
      horaIngreso: f.horaIngreso.value, ampmIngreso: seleccionadoRadioInv('diatAmpmIngreso'),
      horaSalida: f.horaSalida.value, ampmSalida: seleccionadoRadioInv('diatAmpmSalida'),
      direccionAccidente: f.direccionAccidente.value, comunaAccidente: f.comunaAccidente.value,
      queHacia: f.queHacia.value, lugarAccidente: f.lugarAccidente.value, descripcionAccidente: f.descripcionAccidente.value,
      trabajoHabitual: f.trabajoHabitual.value, desarrollaba: seleccionadoRadioInv('diatDesarrollaba'),
      clasificacion: seleccionadoRadioInv('diatClasificacion'), tipoAccidente: seleccionadoRadioInv('diatTipoAccidente'),
      trayecto: seleccionadoRadioInv('diatTrayecto'), medioPrueba: seleccionadoRadioInv('diatMedioPrueba'),
      detalleMedioPrueba: f.detalleMedioPrueba.value,
      denuncianteNombre: f.denuncianteNombre.value, denuncianteRun: f.denuncianteRun.value,
      denuncianteTelefono: f.denuncianteTelefono.value, denunciante: seleccionadoRadioInv('diatDenunciante'),
    };
    const pdfLink = await generarYSubirPdfDiat(datos);

    const n = allDiat.length + 1;
    await appendSheet(`'${CONFIG.SHEET_DIAT}'!A:BA`, [[
      n, hoyISO(), atencionMedicaFilaIncidente,
      datos.empleadorNombre, datos.empleadorRut, datos.empleadorDireccion, datos.empleadorComuna, datos.empleadorTelefono,
      datos.nTrabHombres, datos.nTrabMujeres,
      datos.propiedadEmpresa>=0 ? DIAT_PROPIEDAD_EMPRESA[datos.propiedadEmpresa].label : '',
      datos.tipoEmpresa>=0 ? DIAT_TIPO_EMPRESA[datos.tipoEmpresa].label : '',
      datos.actividadEconomica, datos.actividadEconomicaPrincipal,
      datos.trabajadorNombre, datos.trabajadorRun, datos.trabajadorDireccion, datos.trabajadorComuna, datos.trabajadorTelefono,
      datos.sexo>=0 ? DIAT_SEXO[datos.sexo].label : '', datos.edad, datos.fechaNacimiento,
      datos.pueblo>=0 ? DIAT_PUEBLO_ORIGINARIO[datos.pueblo].label : '', datos.nacionalidad, datos.profesionOficio,
      datos.antiguedadValor, datos.antiguedadUnidad>=0 ? DIAT_ANTIGUEDAD_UNIDAD[datos.antiguedadUnidad].label : '',
      datos.tipoContrato>=0 ? DIAT_TIPO_CONTRATO[datos.tipoContrato].label : '',
      datos.tipoIngreso>=0 ? DIAT_TIPO_INGRESO[datos.tipoIngreso].label : '',
      datos.categoria>=0 ? DIAT_CATEGORIA_OCUPACIONAL[datos.categoria].label : '',
      datos.fechaAccidente,
      `${datos.horaAccidente||''} ${datos.ampmAccidente>=0?DIAT_AMPM_ACCIDENTE[datos.ampmAccidente].label:''}`,
      `${datos.horaIngreso||''} ${datos.ampmIngreso>=0?DIAT_AMPM_INGRESO[datos.ampmIngreso].label:''}`,
      `${datos.horaSalida||''} ${datos.ampmSalida>=0?DIAT_AMPM_SALIDA[datos.ampmSalida].label:''}`,
      datos.direccionAccidente, datos.comunaAccidente, datos.queHacia, datos.lugarAccidente, datos.descripcionAccidente,
      datos.trabajoHabitual, datos.desarrollaba>=0 ? DIAT_DESARROLLABA_HABITUAL[datos.desarrollaba].label : '',
      datos.clasificacion>=0 ? DIAT_CLASIFICACION_ACCIDENTE[datos.clasificacion].label : '',
      datos.tipoAccidente>=0 ? DIAT_TIPO_ACCIDENTE[datos.tipoAccidente].label : '',
      datos.trayecto>=0 ? DIAT_TIPO_ACCIDENTE_TRAYECTO[datos.trayecto].label : '',
      datos.medioPrueba>=0 ? DIAT_MEDIO_PRUEBA[datos.medioPrueba].label : '', datos.detalleMedioPrueba,
      datos.denuncianteNombre, datos.denuncianteRun, datos.denuncianteTelefono,
      datos.denunciante>=0 ? DIAT_CLASIFICACION_DENUNCIANTE[datos.denunciante].label : '',
      pdfLink, userEmail || '', new Date().toLocaleString('es-CL'),
    ]]);

    await guardarResultadoAtencionMedica('Con atención médica (DIAT)', pdfLink);
    toast('DIAT registrada y documento generado ✓', 'ok');
    closePanel('panel-form-diat');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// Actualiza la fila del Incidente: marca la atención médica como resuelta y
// habilita recién ahí la Investigación (columnas Q:V de INCIDENTES).
async function guardarResultadoAtencionMedica(estado, pdfLink) {
  await ensureToken();
  const fila = atencionMedicaFilaIncidente;
  const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_INCIDENTES}'!Q${fila}:V${fila}`)}?valueInputOption=USER_ENTERED`;
  await fetch(url, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
    body: JSON.stringify({ values: [['Pendiente', '', '', '', estado, pdfLink]] }) });
  atencionMedicaFilaIncidente = null;
}

async function generarYSubirPdfDiat(datos) {
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const templateBytes = await fetch('plantillas/diat.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const [p1] = pdfDoc.getPages();
  const H = 935.434;

  function text(str, x, top, size, bold) {
    p1.drawText(str || '', { x, y: H - top, size: size || 7, font: bold ? fontBold : font, color: rgb(0,0,0) });
  }
  // Tapa con blanco el contenido pre-impreso de una celda (ej. las barras
  // "/" guía de un campo de fecha) antes de escribir encima, para que no
  // quede el texto mezclado/montado con esas marcas.
  function blank(x0, top0, x1, top1) {
    p1.drawRectangle({ x: x0, y: H - top1, width: x1 - x0, height: top1 - top0, color: rgb(1,1,1) });
  }
  function checkX(x, cellCenterTop, size) {
    const s = size || 7.5;
    const capHeight = s * 0.72;
    const baselineTop = cellCenterTop + capHeight / 2;
    p1.drawText('X', { x: x - s * 0.33, y: H - baselineTop, size: s, font: fontBold, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = []; let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  function textBlock(str, x, tops, maxWidth, size) {
    wrapLines(str, maxWidth, size || 7).slice(0, tops.length).forEach((l, i) => text(l, x, tops[i], size));
  }
  function marcar(grupo, idx, extraTexto) {
    if (idx == null || idx < 0) return;
    checkX(grupo[idx].x, grupo[idx].top);
  }

  // Coordenadas "top" recalculadas para que el texto quede centrado
  // verticalmente en cada casilla (mismo criterio que ya usaba checkX()
  // para las X de los checkboxes: centro de la celda + mitad del alto de
  // la letra), en vez del criterio anterior de pegarlo cerca del borde
  // inferior — se veía todo el texto "muy abajo" dentro del espacio
  // en blanco.

  // A. Identificación del Empleador
  text(datos.empleadorNombre, 90, 158.5, 7.5);
  text(datos.empleadorRut, 515, 158.5, 7.5);
  text(datos.empleadorDireccion, 90, 193.5, 7);
  text(datos.empleadorComuna, 417, 193.5, 7);
  text(datos.empleadorTelefono, 510, 193.5, 7);
  // "N° de Trabajadores": los números van DENTRO de las cajitas verdes
  // (387-409 y 443.7-465.7), no junto a la etiqueta "Hombres"/"Mujeres" —
  // antes quedaban flotando fuera de la caja, encima del borde.
  text(String(datos.nTrabHombres||''), 393, 228.4, 7);
  text(String(datos.nTrabMujeres||''), 449, 228.4, 7);
  marcar(DIAT_PROPIEDAD_EMPRESA, datos.propiedadEmpresa);
  text(datos.actividadEconomica, 45, 228.5, 7);
  marcar(DIAT_TIPO_EMPRESA, datos.tipoEmpresa);
  textBlock(datos.actividadEconomicaPrincipal, 386, [268, 277], 200, 7);

  // B. Identificación del Trabajador/a
  text(datos.trabajadorNombre, 90, 338, 7.5);
  text(datos.trabajadorRun, 515, 338, 7.5);
  text(datos.trabajadorDireccion, 90, 372.3, 7);
  text(datos.trabajadorComuna, 422, 372.3, 7);
  text(datos.trabajadorTelefono, 511, 372.3, 7);
  marcar(DIAT_SEXO, datos.sexo);
  text(datos.edad, 163, 406.6, 7.5);
  // La celda de Fecha de Nacimiento trae 2 barras "/" pre-impresas como
  // guía (día/mes/año); si se escribe la fecha completa encima queda
  // montada con esas barras — se tapan primero con blanco.
  if (datos.fechaNacimiento) {
    blank(201.2, 393.3, 290.5, 414.5);
    text(ddmmyyyy(datos.fechaNacimiento), 210, 406.4, 7);
  }
  marcar(DIAT_PUEBLO_ORIGINARIO, datos.pueblo);
  text(datos.nacionalidad, 70, 439.2, 7);
  text(datos.profesionOficio, 190, 439.2, 7);
  text(datos.antiguedadValor, 44, 472.2, 7);
  marcar(DIAT_ANTIGUEDAD_UNIDAD, datos.antiguedadUnidad);
  marcar(DIAT_TIPO_CONTRATO, datos.tipoContrato);
  marcar(DIAT_TIPO_INGRESO, datos.tipoIngreso);
  marcar(DIAT_CATEGORIA_OCUPACIONAL, datos.categoria);

  // C. Datos del Accidente
  // Misma celda con barras "/" pre-impresas que Fecha de Nacimiento — se
  // tapan antes de escribir.
  if (datos.fechaAccidente) {
    blank(167.7, 540.6, 257.0, 561.9);
    text(ddmmyyyy(datos.fechaAccidente), 178, 554, 7.5);
  }
  text(datos.horaAccidente, 282, 553.9, 7);
  marcar(DIAT_AMPM_ACCIDENTE, datos.ampmAccidente);
  text(datos.horaIngreso, 393, 554, 7);
  marcar(DIAT_AMPM_INGRESO, datos.ampmIngreso);
  text(datos.horaSalida, 502, 554.3, 7);
  marcar(DIAT_AMPM_SALIDA, datos.ampmSalida);
  text(datos.direccionAccidente, 45, 587.3, 7);
  text(datos.comunaAccidente, 508, 587.3, 7);
  textBlock(datos.queHacia, 45, [630, 638.5], 240, 6.5);
  textBlock(datos.lugarAccidente, 322, [630, 638.5], 250, 6.5);
  textBlock(datos.descripcionAccidente, 45, [670, 678.6, 687.2, 695.8, 704.4], 530, 7);
  text(datos.trabajoHabitual, 174, 722.7, 7);
  marcar(DIAT_DESARROLLABA_HABITUAL, datos.desarrollaba);
  marcar(DIAT_CLASIFICACION_ACCIDENTE, datos.clasificacion);
  marcar(DIAT_TIPO_ACCIDENTE, datos.tipoAccidente);
  marcar(DIAT_TIPO_ACCIDENTE_TRAYECTO, datos.trayecto);
  marcar(DIAT_MEDIO_PRUEBA, datos.medioPrueba);
  text(datos.detalleMedioPrueba, 318, 784, 6.5);

  // D. Identificación del Denunciante
  text(datos.denuncianteNombre, 107, 840.6, 7.5);
  text(datos.denuncianteRun, 389, 840.6, 7.5);
  text(datos.denuncianteTelefono, 61, 873.6, 7);
  marcar(DIAT_CLASIFICACION_DENUNCIANTE, datos.denunciante);

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const nombreArchivo = 'diat_' + (datos.trabajadorNombre || 'accidente').replace(/\s+/g, '_');
  const up = datos.trabajadorNombre
    ? await uploadFileTrabajador(blob, datos.trabajadorNombre, nombreArchivo, 'pdf')
    : await uploadFile(blob, 'DIAT', nombreArchivo, 'pdf');
  return up.link;
}

// ── Declaración simple de rechazo de atención médica ──────────────────────
// A pedido del cliente: sin plantilla, sin formato — solo lo que el
// trabajador escriba, tal cual, generado como PDF en blanco (no se dibuja
// sobre ningún documento base). Sin firma: se firma a mano, en persona,
// después — no tiene sentido capturar una firma digital acá.
function abrirFormDeclaracion() {
  const inc = allIncidentes.find(x => x.fila === atencionMedicaFilaIncidente);
  if (!inc) { toast('No se encontró el registro', 'error'); return; }
  const f = document.getElementById('form-declaracion');
  f.reset();
  f.trabajadorNombre.value = inc.trabajador || '';
  f.fecha.value = hoyISO();
  openPanel('panel-form-declaracion');
}
async function guardarDeclaracion(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    toast('Generando documento...');
    const datos = { trabajadorNombre: f.trabajadorNombre.value, fecha: f.fecha.value, texto: f.texto.value };
    const pdfLink = await generarPdfDeclaracion(datos);
    await guardarResultadoAtencionMedica('Sin atención médica (Declaración)', pdfLink);
    toast('Declaración registrada y documento generado ✓', 'ok');
    closePanel('panel-form-declaracion');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}
async function generarPdfDeclaracion(datos) {
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.addPage([612, 792]);
  const H = 792;
  let y = H - 72;

  page.drawText('DECLARACIÓN VOLUNTARIA DE RECHAZO DE ATENCIÓN MÉDICA', { x: 56, y, size: 13, font: fontBold, color: rgb(0,0,0) });
  y -= 26;
  page.drawText(`Trabajador: ${datos.trabajadorNombre || ''}`, { x: 56, y, size: 10, font, color: rgb(0,0,0) });
  y -= 16;
  page.drawText(`Fecha: ${ddmmyyyy(datos.fecha)}`, { x: 56, y, size: 10, font, color: rgb(0,0,0) });
  y -= 34;

  const maxWidth = 500, size = 11, lineHeight = 16;
  const words = (datos.texto || '').split(/\s+/).filter(Boolean);
  let current = '';
  const lines = [];
  for (const w of words) {
    const test = current ? current + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
    else current = test;
  }
  if (current) lines.push(current);
  for (const line of lines) {
    if (y < 80) break;
    page.drawText(line, { x: 56, y, size, font, color: rgb(0,0,0) });
    y -= lineHeight;
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const nombreArchivo = 'declaracion_rechazo_' + (datos.trabajadorNombre || 'trabajador').replace(/\s+/g, '_');
  const up = datos.trabajadorNombre
    ? await uploadFileTrabajador(blob, datos.trabajadorNombre, nombreArchivo, 'pdf')
    : await uploadFile(blob, 'Declaraciones', nombreArchivo, 'pdf');
  return up.link;
}

// ============================================================
// MÓDULO: INVESTIGACIÓN DE ACCIDENTE
// (se activa solo para Accidente Leve/Grave/Fatal; genera el
// "Informe de Investigación de Accidente y Enfermedad Profesional"
// como PDF, con la misma técnica de overlay de coordenadas que Charlas)
// ============================================================

// Centros X de checkbox reutilizados en todo el documento (medidos con pdfplumber)
const INV_CX = { c1: 116.3, c2: 276.9, c3: 369.5, c4: 465.7, cGraveFatal: 434.8 };

const INV_TIPO_SINIESTRO = [
  { label: 'Accidente de trabajo', x: INV_CX.c2, top: 231.3, page: 'p1' },
  { label: 'Accidente de trayecto', x: INV_CX.c3, top: 231.3, page: 'p1' },
  { label: 'Accidente común', x: INV_CX.c4, top: 231.3, page: 'p1' },
  { label: 'Enfermedad profesional', x: INV_CX.c1, top: 231.3, page: 'p1' },
];
const INV_EMPRESA = [
  { label: 'Empresa Mandante', x: INV_CX.c1, top: 253.1, page: 'p1' },
  { label: 'Empresa Contratista', x: INV_CX.c2, top: 253.1, page: 'p1' },
  { label: 'Subcontrato', x: INV_CX.c3, top: 253.1, page: 'p1' },
];
const INV_DANOS = [
  { label: 'A las personas', x: INV_CX.c1, top: 278.1, page: 'p1' },
  { label: 'A los materiales', x: INV_CX.c2, top: 278.1, page: 'p1' },
  { label: 'Al medio ambiente', x: INV_CX.c3, top: 278.1, page: 'p1' },
  { label: 'Externos/Clientes', x: INV_CX.c4, top: 278.1, page: 'p1' },
  { label: 'Otros (especifique)', x: 133, top: 290.7, page: 'p1' },
];
const INV_POTENCIAL = [
  { label: 'Bajo', x: INV_CX.c1, top: 307.3, page: 'p1' },
  { label: 'Menos Grave', x: INV_CX.c2, top: 307.3, page: 'p1' },
  { label: 'Grave/Fatal', x: INV_CX.cGraveFatal, top: 307.3, page: 'p1' },
];
const INV_TIPO_INCIDENTE = [
  { label: 'Golpe con (objetos manejados por el mismo accidentado)', x: INV_CX.c2, top: 488.5, page: 'p1' },
  { label: 'Contacto con (la persona hace contacto con algún objeto o sustancia que le inflige lesión no producida por la fuerza)', x: INV_CX.c4, top: 488.5, page: 'p1' },
  { label: 'Golpe por (objetos o materiales ajenos al accidentado)', x: INV_CX.c2, top: 510.0, page: 'p1' },
  { label: 'Contacto eléctrico', x: INV_CX.c4, top: 510.0, page: 'p1' },
  { label: 'Golpe contra (la persona se golpea con objeto de su medio ambiente)', x: INV_CX.c2, top: 523.9, page: 'p1' },
  { label: 'Arco eléctrico', x: INV_CX.c4, top: 523.9, page: 'p1' },
  { label: 'Caída del mismo nivel', x: INV_CX.c2, top: 540.1, page: 'p1' },
  { label: 'Tránsito (choque o colisión en que la persona tuvo una activa participación)', x: INV_CX.c4, top: 540.1, page: 'p1' },
  { label: 'Caída de distinto nivel', x: INV_CX.c2, top: 561.2, page: 'p1' },
  { label: 'Tránsito por terceros, choque en que la persona no tuvo participación activa', x: INV_CX.c4, top: 561.2, page: 'p1' },
  { label: 'Atrapamiento (la persona es oprimida, aplastada, apretada o comprimida entre objetos)', x: INV_CX.c2, top: 581.95, page: 'p1' },
  { label: 'Mordedura de perros', x: INV_CX.c4, top: 581.95, page: 'p1' },
  { label: 'Aprisionamiento (la persona queda encerrada en algún recinto, ej. espacio confinado)', x: INV_CX.c2, top: 597.8, page: 'p1' },
  { label: 'Asalto', x: INV_CX.c4, top: 597.8, page: 'p1' },
  { label: 'Sobreesfuerzo (esfuerzo mal realizado o por sobre la capacidad)', x: INV_CX.c2, top: 616.55, page: 'p1' },
  { label: 'Otros', x: INV_CX.c4, top: 616.55, page: 'p1' },
];
const INV_CAUSAS_INMEDIATAS = [
  { label: 'Asumir posiciones o posturas inseguras', x: INV_CX.c2, top: 648.45, page: 'p1' },
  { label: 'Almacenamiento deficiente', x: INV_CX.c4, top: 648.45, page: 'p1' },
  { label: 'Dejar inoperantes los dispositivos de seguridad', x: INV_CX.c2, top: 657.05, page: 'p1' },
  { label: 'Congestión y espacio libre insuficiente', x: INV_CX.c4, top: 657.05, page: 'p1' },
  { label: 'Desviarse de procedimientos de trabajo recomendados', x: INV_CX.c2, top: 665.65, page: 'p1' },
  { label: 'Defectos de maquinarias, materiales o herramientas', x: INV_CX.c4, top: 665.65, page: 'p1' },
  { label: 'Distraerse en juegos u otros', x: INV_CX.c2, top: 674.3, page: 'p1' },
  { label: 'Equipos sin protección', x: INV_CX.c4, top: 674.3, page: 'p1' },
  { label: 'No advertir o señalar riesgos según se requiera', x: INV_CX.c2, top: 682.9, page: 'p1' },
  { label: 'Falta de adecuados sistemas de seguridad', x: INV_CX.c4, top: 682.9, page: 'p1' },
  { label: 'Operar a velocidad insegura', x: INV_CX.c2, top: 691.5, page: 'p1' },
  { label: 'Falta de orden y aseo', x: INV_CX.c4, top: 691.5, page: 'p1' },
  { label: 'Operar máquinas / equipos sin autorización', x: INV_CX.c2, top: 700.1, page: 'p1' },
  { label: 'Objetos que sobresalen', x: INV_CX.c4, top: 700.1, page: 'p1' },
  { label: 'Reparar, conducir equipos sin considerar los riesgos', x: INV_CX.c2, top: 708.7, page: 'p1' },
  { label: 'Propensión a arder o explotar', x: INV_CX.c4, top: 708.7, page: 'p1' },
  { label: 'Usar en forma insegura materiales, equipos, herramientas', x: INV_CX.c2, top: 717.3, page: 'p1' },
  { label: 'No se detectó condición subestándar', x: INV_CX.c4, top: 717.3, page: 'p1' },
  { label: 'Usar herramientas instrumental y/o equipos inseguros', x: INV_CX.c2, top: 725.9, page: 'p1' },
  { label: 'Otras condiciones subestándar (especifique)', x: INV_CX.c4, top: 725.9, page: 'p1' },
  { label: 'No se detectó acción subestándar', x: INV_CX.c2, top: 734.7, page: 'p1' },
];
const INV_CAUSAS_BASICAS = [
  { label: 'Capacidad física disminuida', x: INV_CX.c2, top: 124.3, page: 'p2' },
  { label: 'Supervisión y liderazgo deficiente', x: INV_CX.c4, top: 124.3, page: 'p2' },
  { label: 'Capacidad mental / sicológica inadecuada', x: INV_CX.c2, top: 132.9, page: 'p2' },
  { label: 'Ingeniería inadecuada', x: INV_CX.c4, top: 132.9, page: 'p2' },
  { label: 'Tensión mental o fisiológica', x: INV_CX.c2, top: 141.5, page: 'p2' },
  { label: 'Deficiencia en las adquisiciones', x: INV_CX.c4, top: 141.5, page: 'p2' },
  { label: 'Falta de conocimiento', x: INV_CX.c2, top: 150.1, page: 'p2' },
  { label: 'Mantención deficiente', x: INV_CX.c4, top: 150.1, page: 'p2' },
  { label: 'Falta de habilidad', x: INV_CX.c2, top: 158.7, page: 'p2' },
  { label: 'Herramientas y equipos inadecuados', x: INV_CX.c4, top: 158.7, page: 'p2' },
  { label: 'Motivación inadecuada', x: INV_CX.c2, top: 167.3, page: 'p2' },
  { label: 'Estándares deficientes de trabajo', x: INV_CX.c4, top: 167.3, page: 'p2' },
  { label: 'Uso y desgaste', x: INV_CX.c2, top: 175.9, page: 'p2' },
  { label: 'Condiciones ambientales adversas', x: INV_CX.c4, top: 175.9, page: 'p2' },
];

function renderChecklistInv(contId, opciones, tipo, name) {
  document.getElementById(contId).innerHTML = opciones.map((o, i) => `
    <div class="chk-row">
      <label class="chk-row-label">
        <span class="chk-row-checkbox-wrap">
          <input type="${tipo}" name="${name}" class="chk-row-input" value="${i}">
          <span class="chk-row-checkbox${tipo === 'radio' ? ' chk-row-radio' : ''}"></span>
        </span>
        <span>${esc(o.label)}</span>
      </label>
    </div>`).join('');
}
function renderChecklistsInvestigacion() {
  renderChecklistInv('chk-inv-tiposiniestro', INV_TIPO_SINIESTRO, 'radio', 'tiposiniestro');
  renderChecklistInv('chk-inv-empresa', INV_EMPRESA, 'radio', 'empresainv');
  renderChecklistInv('chk-inv-danos', INV_DANOS, 'checkbox', 'danos');
  renderChecklistInv('chk-inv-potencial', INV_POTENCIAL, 'radio', 'potencial');
  renderChecklistInv('chk-inv-tipoincidente', INV_TIPO_INCIDENTE, 'checkbox', 'tipoincidente');
  renderChecklistInv('chk-inv-causasinmediatas', INV_CAUSAS_INMEDIATAS, 'checkbox', 'causasinmediatas');
  renderChecklistInv('chk-inv-causasbasicas', INV_CAUSAS_BASICAS, 'checkbox', 'causasbasicas');
}
function seleccionadosInv(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(el => parseInt(el.value, 10));
}

let investigacionEnProceso = null;
function abrirInvestigacion(filaIncidente) {
  const inc = allIncidentes.find(x => x.fila === filaIncidente);
  if (!inc) { toast('No se encontró el registro', 'error'); return; }
  const trab = inc.trabajador && allTrabajadores.find(x => x.nombre === inc.trabajador);
  investigacionEnProceso = { filaIncidente };
  const f = document.getElementById('form-investigacion');
  f.reset();
  f.empresaMandante.value = 'Constructora LST SpA';
  f.area.value = inc.area || '';
  f.fechaSiniestro.value = inc.fecha || hoyISO();
  f.lugar.value = inc.area || '';
  f.trabajadorNombre.value = inc.trabajador || '';
  f.descripcionEvento.value = inc.descripcion || '';
  if (trab) {
    f.trabajadorRut.value = trab.rut || '';
    f.trabajadorCargo.value = trab.cargo || '';
    const antiguedad = calcularAntiguedad(trab.fechaIngreso, inc.fecha);
    if (antiguedad) f.trabajadorAntiguedadEmpresa.value = `${antiguedad.valor} ${antiguedad.unidad.toLowerCase()}`;
  }
  renderChecklistsInvestigacion();
  openPanel('panel-form-investigacion');
  setTimeout(() => initFirmaPad('firma-canvas-investigador'), 80);
}
async function guardarInvestigacion(ev) {
  ev.preventDefault();
  const f = ev.target;
  if (firmaEstaVacia('firma-canvas-investigador')) { toast('Falta la firma de quien investiga', 'error'); return; }
  try {
    toast('Generando informe...');
    const datos = {
      empresaMandante: f.empresaMandante.value, empresaContratista: f.empresaContratista.value,
      area: f.area.value, asesorPrevencion: f.asesorPrevencion.value, jefaturaDepto: f.jefaturaDepto.value,
      fechaSiniestro: f.fechaSiniestro.value, horaSiniestro: f.horaSiniestro.value,
      lugar: f.lugar.value, jefaturaDirecta: f.jefaturaDirecta.value, supervisorDirecto: f.supervisorDirecto.value,
      tipoSiniestro: seleccionadosInv('tiposiniestro'), empresa: seleccionadosInv('empresainv'),
      danos: seleccionadosInv('danos'), danosOtroTexto: f.danosOtroTexto.value,
      potencial: seleccionadosInv('potencial'),
      trabajadorNombre: f.trabajadorNombre.value, trabajadorRut: f.trabajadorRut.value,
      trabajadorCargo: f.trabajadorCargo.value, trabajadorAntiguedadCargo: f.trabajadorAntiguedadCargo.value,
      trabajadorAntiguedadEmpresa: f.trabajadorAntiguedadEmpresa.value, trabajadorHorasTurno: f.trabajadorHorasTurno.value,
      trabajadorEstado: f.trabajadorEstado.value, trabajadorObservacion: f.trabajadorObservacion.value,
      testigoNombre: f.testigoNombre.value, testigoRut: f.testigoRut.value,
      testigoCargo: f.testigoCargo.value, testigoTiempoCargo: f.testigoTiempoCargo.value,
      testigoActividad: f.testigoActividad.value, testigoObservacion: f.testigoObservacion.value,
      descripcionEvento: f.descripcionEvento.value, localizacion: f.localizacion.value,
      tipoIncidente: seleccionadosInv('tipoincidente'), tipoIncidenteOtroTexto: f.tipoIncidenteOtroTexto.value,
      causasInmediatas: seleccionadosInv('causasinmediatas'), causasInmediatasOtroTexto: f.causasInmediatasOtroTexto.value,
      causasBasicas: seleccionadosInv('causasbasicas'),
      medida1: f.medida1.value, responsable1: f.responsable1.value, fechaImpl1: f.fechaImpl1.value,
      medida2: f.medida2.value, responsable2: f.responsable2.value, fechaImpl2: f.fechaImpl2.value,
      medida3: f.medida3.value, responsable3: f.responsable3.value, fechaImpl3: f.fechaImpl3.value,
      observaciones: f.observaciones.value,
      investigadorNombreRut: f.investigadorNombreRut.value, investigadorCargo: f.investigadorCargo.value,
      firmaInvestigador: firmaCanvasADataURL('firma-canvas-investigador'),
    };
    const pdfLink = await generarYSubirPdfInvestigacion(datos);

    const n = allInvestigaciones.length + 1;
    await appendSheet(`'${CONFIG.SHEET_INVESTIGACIONES}'!A:AT`, [[
      n, hoyISO(), investigacionEnProceso.filaIncidente,
      datos.empresaMandante, datos.empresaContratista, datos.area, datos.asesorPrevencion, datos.jefaturaDepto,
      datos.fechaSiniestro, datos.horaSiniestro, datos.lugar, datos.jefaturaDirecta, datos.supervisorDirecto,
      datos.tipoSiniestro.map(i => INV_TIPO_SINIESTRO[i].label).join('; '),
      datos.empresa.map(i => INV_EMPRESA[i].label).join('; '),
      datos.danos.map(i => INV_DANOS[i].label).join('; '), datos.danosOtroTexto,
      datos.potencial.map(i => INV_POTENCIAL[i].label).join('; '),
      datos.trabajadorNombre, datos.trabajadorRut, datos.trabajadorCargo, datos.trabajadorAntiguedadCargo,
      datos.trabajadorAntiguedadEmpresa, datos.trabajadorHorasTurno, datos.trabajadorEstado, datos.trabajadorObservacion,
      datos.testigoNombre, datos.testigoRut, datos.testigoCargo, datos.testigoTiempoCargo,
      datos.testigoActividad, datos.testigoObservacion,
      datos.descripcionEvento, datos.localizacion,
      datos.tipoIncidente.map(i => INV_TIPO_INCIDENTE[i].label).join('; '), datos.tipoIncidenteOtroTexto,
      datos.causasInmediatas.map(i => INV_CAUSAS_INMEDIATAS[i].label).join('; '), datos.causasInmediatasOtroTexto,
      datos.causasBasicas.map(i => INV_CAUSAS_BASICAS[i].label).join('; '),
      `${datos.medida1} | ${datos.responsable1} | ${datos.fechaImpl1}; ${datos.medida2} | ${datos.responsable2} | ${datos.fechaImpl2}; ${datos.medida3} | ${datos.responsable3} | ${datos.fechaImpl3}`,
      datos.observaciones, datos.investigadorNombreRut, datos.investigadorCargo,
      pdfLink, userEmail || '', new Date().toLocaleString('es-CL'),
    ]]);

    await ensureToken();
    const fila = investigacionEnProceso.filaIncidente;
    const urlEstado = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_INCIDENTES}'!Q${fila}:T${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(urlEstado, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [['Completada', userEmail || '', hoyISO(), pdfLink]] }) });

    toast('Investigación registrada y documento generado ✓', 'ok');
    closePanel('panel-form-investigacion');
    investigacionEnProceso = null;
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Generación del PDF de Investigación (misma técnica de overlay que Charla:
// checkX() centra la "X" en el centro vertical real de la celda del checkbox,
// medido con pdfplumber sobre la plantilla, usando la altura de mayúscula de
// la fuente para el offset del baseline en vez de un valor a ojo) ──────────
async function generarYSubirPdfInvestigacion(datos) {
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const templateBytes = await fetch('plantillas/investigacion_accidente.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const [p1, p2] = pdfDoc.getPages();
  const H = 841.8;

  function cover(page, x0, top0, x1, top1) {
    page.drawRectangle({ x: x0, y: H - top1, width: x1 - x0, height: top1 - top0, color: rgb(1,1,1) });
  }
  function text(page, str, x, top, size, bold) {
    page.drawText(str || '', { x, y: H - top, size: size || 6.5, font: bold ? fontBold : font, color: rgb(0,0,0) });
  }
  function checkX(page, x, cellCenterTop, size) {
    const s = size || 7.5;
    const capHeight = s * 0.72;
    const baselineTop = cellCenterTop + capHeight / 2;
    page.drawText('X', { x: x - s * 0.33, y: H - baselineTop, size: s, font: fontBold, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = []; let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  function textBlock(page, str, x, tops, maxWidth, size) {
    wrapLines(str, maxWidth, size || 6.5).slice(0, tops.length).forEach((l, i) => text(page, l, x, tops[i], size));
  }
  async function drawSig(page, dataUrl, x, top, w, h) {
    if (!dataUrl) return;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);
    const dims = escalarFirmaCasillero(img, w, h);
    page.drawImage(img, { x, y: H - top - dims.height, width: dims.width, height: dims.height });
  }
  const pages = { p1, p2 };

  // Encabezado (solo existe en la página 1)
  cover(p1, 412, 95, 445, 102.8);
  text(p1, ddmmyyyy(hoyISO()), 413, 101, 6.5);

  // Información de la organización
  text(p1, datos.empresaMandante, 145, 142, 6.5);
  text(p1, datos.empresaContratista, 190, 149.4, 6.5);
  text(p1, datos.area, 70, 157.6, 6.5);
  text(p1, datos.asesorPrevencion, 142, 165.8, 6.5);
  text(p1, datos.jefaturaDepto, 172, 174.2, 6.5);

  // Antecedentes del siniestro
  text(p1, ddmmyyyy(datos.fechaSiniestro), 73, 191.4, 6.5);
  text(p1, datos.horaSiniestro, 311, 191.4, 6.5);
  text(p1, datos.lugar, 72, 199.6, 6.5);
  text(p1, datos.jefaturaDirecta, 339, 199.6, 6.5);
  text(p1, datos.supervisorDirecto, 105, 208.0, 6.5);

  // Grupos de checkbox de una sola fila
  datos.tipoSiniestro.forEach(i => checkX(p1, INV_TIPO_SINIESTRO[i].x, INV_TIPO_SINIESTRO[i].top));
  datos.empresa.forEach(i => checkX(p1, INV_EMPRESA[i].x, INV_EMPRESA[i].top));
  datos.danos.forEach(i => checkX(p1, INV_DANOS[i].x, INV_DANOS[i].top));
  if (datos.danosOtroTexto) text(p1, datos.danosOtroTexto, 178, 290, 6.5);
  datos.potencial.forEach(i => checkX(p1, INV_POTENCIAL[i].x, INV_POTENCIAL[i].top));

  // Datos del trabajador involucrado
  text(p1, datos.trabajadorNombre, 118, 326.6, 6.5);
  text(p1, datos.trabajadorRut, 308, 326.6, 6.5);
  text(p1, datos.trabajadorCargo, 98, 334.8, 6.5);
  text(p1, datos.trabajadorAntiguedadCargo, 358, 334.8, 6.5);
  text(p1, datos.trabajadorAntiguedadEmpresa, 126, 343, 6.5);
  text(p1, datos.trabajadorHorasTurno, 372, 343, 6.5);
  text(p1, datos.trabajadorEstado, 113, 351.4, 6.5);
  text(p1, datos.trabajadorObservacion, 331, 351.4, 6.5);

  // Datos testigos
  text(p1, datos.testigoNombre, 118, 368.4, 6.5);
  text(p1, datos.testigoRut, 308, 368.4, 6.5);
  text(p1, datos.testigoCargo, 98, 376.6, 6.5);
  text(p1, datos.testigoTiempoCargo, 358, 376.6, 6.5);
  text(p1, datos.testigoActividad, 118, 384, 6.5);
  text(p1, datos.testigoObservacion, 331, 384, 6.5);

  // Descripción del evento (5 líneas disponibles)
  textBlock(p1, datos.descripcionEvento, 52, [402.25, 410.45, 418.65, 426.85, 435.05], 430, 6.5);

  // Localización del siniestro
  text(p1, datos.localizacion, 55, 452, 6.5);

  // Tipo de incidente / Causas inmediatas / Causas básicas (checkbox múltiples)
  datos.tipoIncidente.forEach(i => {
    const o = INV_TIPO_INCIDENTE[i];
    checkX(pages[o.page], o.x, o.top);
  });
  if (datos.tipoIncidenteOtroTexto) text(p1, datos.tipoIncidenteOtroTexto, 311, 619, 6.5);
  datos.causasInmediatas.forEach(i => {
    const o = INV_CAUSAS_INMEDIATAS[i];
    checkX(pages[o.page], o.x, o.top);
  });
  if (datos.causasInmediatasOtroTexto) text(p2, datos.causasInmediatasOtroTexto, 123, 102, 6.5);
  datos.causasBasicas.forEach(i => {
    const o = INV_CAUSAS_BASICAS[i];
    checkX(pages[o.page], o.x, o.top);
  });

  // Medidas de control implementadas (tabla de hasta 3 filas)
  const filasMedidas = [
    [datos.medida1, datos.responsable1, datos.fechaImpl1, 212],
    [datos.medida2, datos.responsable2, datos.fechaImpl2, 228],
    [datos.medida3, datos.responsable3, datos.fechaImpl3, 244],
  ];
  filasMedidas.forEach(([medida, responsable, fecha, top]) => {
    if (!medida) return;
    text(p2, medida, 55, top, 6.5);
    text(p2, responsable, 295, top, 6.5);
    text(p2, fecha ? ddmmyyyy(fecha) : '', 388, top, 6.5);
  });

  // Observaciones
  textBlock(p2, datos.observaciones, 55, [262, 270.2, 278.4, 286.6, 294.8], 425, 6.5);

  // Nombre y rut de quien investiga / cargo / firma
  text(p2, datos.investigadorNombreRut, 55, 322, 6.5);
  text(p2, datos.investigadorCargo, 76, 340, 6.5);
  await drawSig(p2, datos.firmaInvestigador, 300, 300, 160, 40);

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const nombreArchivo = 'investigacion_' + (datos.trabajadorNombre || 'accidente').replace(/\s+/g, '_');
  const up = datos.trabajadorNombre
    ? await uploadFileTrabajador(blob, datos.trabajadorNombre, nombreArchivo, 'pdf')
    : await uploadFile(blob, 'Investigaciones', nombreArchivo, 'pdf');
  return up.link;
}

// ============================================================
// MÓDULO: HOJA DE CONTROL DE RIESGOS (HCR)
// Módulo separado del resto (a pedido del cliente): se llena a diario por
// cuadrilla, antes de ejecutar el trabajo. Mismo mecanismo de overlay de
// coordenadas que Charla/Investigación, pero sobre una plantilla de 4
// páginas con tamaños mixtos (p1/p2 A4 apaisado, p3/p4 carta) y ~130
// checkbox en la página 1.
// ============================================================

// Centros X de checkbox reutilizados en toda la página 1 (medidos con
// pdfplumber: cada franja de checkbox se comparte entre varias secciones
// apiladas verticalmente en la misma columna de la página).
const HCR_CX = { col1: 257.5, col2: 457.1, col3: 695.8, si: 676.2, no: 689.2, na: 702.4 };

const HCR_PELIGROS_SEG_COL1 = [
  { label: 'Excavaciones', top: 136.85 }, { label: 'Explosivos', top: 145.15 },
  { label: 'Trabajos marinos / submarinos', top: 153.7 }, { label: 'Acopios / materiales (pilas, rumas)', top: 162.35 },
  { label: 'Trabajos en altura', top: 170.95 }, { label: 'Espacios confinados', top: 179.55 },
  { label: 'Carga suspendida', top: 188.15 }, { label: 'Transito de vehiculos', top: 196.75 },
  { label: 'Fauna (animales)', top: 205.4 }, { label: 'Condiciones metereologicas adversas', top: 217.4 },
  { label: 'Exposicion a radiacion solar', top: 229.4 }, { label: 'Entorno social peligroso', top: 238.0 },
  { label: 'Trabajos en presencia de napa', top: 246.6 }, { label: 'Flora (arboles, espinos, etc)', top: 255.0 },
].map(o => ({ ...o, x: HCR_CX.col1, page: 'p1' }));

const HCR_PELIGROS_SEG_COL2 = [
  { label: 'Movimiento de maquinaria', top: 136.85 }, { label: 'Herramientas / equipos electricos', top: 145.15 },
  { label: 'Herramientas / equipos a combustion', top: 153.7 }, { label: 'Herramientas / equipos a explosion', top: 162.35 },
  { label: 'Gases comprimidos', top: 170.95 }, { label: 'Partes en movimiento (correas, etc)', top: 179.55 },
  { label: 'Sustancia explosiva', top: 188.15 }, { label: 'Sustancia inflamable', top: 196.75 },
  { label: 'Sustancia corrosiva', top: 205.4 }, { label: 'Interferencias aereas (tendidos)', top: 217.4 },
  { label: 'Interferencias subterranea', top: 229.4 }, { label: 'Terreno desnivelado / estrecho / irregular', top: 238.0 },
  { label: 'Falta o deficiencia de iluminacion', top: 246.6 }, { label: 'Falta o deficiencia de ventilaciòn', top: 255.0 },
].map(o => ({ ...o, x: HCR_CX.col2, page: 'p1' }));

const HCR_PELIGROS_SALUD = [
  { label: 'Ruido', top: 145.15 }, { label: 'Vibraciones', top: 153.7 }, { label: 'Polvos', top: 162.35 },
  { label: 'Temperatura extrema (calor)', top: 170.95 }, { label: 'Temperatura extrema (frio)', top: 179.55 },
  { label: 'Plagas (roedores, insectos)', top: 196.75 }, { label: 'Aguas servidas', top: 205.4 },
  { label: 'Sustancia toxica', top: 229.4 }, { label: 'Sustancia venenosa', top: 238.0 },
  { label: 'Radiacion ionizante (densimetro nuclear)', top: 255.0 },
].map(o => ({ ...o, x: HCR_CX.col3, page: 'p1' }));

const HCR_RIESGOS_SEG = [
  { label: 'Aplastamiento', top: 272.8 }, { label: 'Atrapamiento', top: 281.4 }, { label: 'Atropellamiento', top: 290.0 },
  { label: 'Contacto con', top: 298.6 }, { label: 'Caida a nivel', top: 307.2 }, { label: 'Caida a desnivel', top: 315.8 },
  { label: 'Electrocusion', top: 324.4 }, { label: 'Golpeado por', top: 333.0 }, { label: 'Golpeado contra', top: 341.6 },
  { label: 'Quemadura', top: 350.2 }, { label: 'Sobreesfuerzo', top: 358.8 }, { label: 'Otros: especifique', top: 367.2 },
].map(o => ({ ...o, x: HCR_CX.col1, page: 'p1' }));

const HCR_RIESGOS_MAT = [
  { label: 'Asentamiento', top: 272.8 }, { label: 'Contaminacion', top: 281.4 }, { label: 'Colision', top: 290.0 },
  { label: 'Desplome', top: 298.6 }, { label: 'Derrumbe', top: 307.2 }, { label: 'Desgaste', top: 315.8 },
  { label: 'Explosion', top: 324.4 }, { label: 'Incendio', top: 333.0 }, { label: 'Inundacion', top: 341.6 },
  { label: 'Robo', top: 350.2 }, { label: 'Socavamiento', top: 358.8 }, { label: 'Volcamiento', top: 367.2 },
].map(o => ({ ...o, x: HCR_CX.col2, page: 'p1' }));

const HCR_RIESGOS_SALUD = [
  { label: 'Alteracion del sistema nervioso', top: 272.8 }, { label: 'Asfixia', top: 281.4 }, { label: 'Conjuntivitis', top: 290.0 },
  { label: 'Dermatitis', top: 298.6 }, { label: 'Hipotermia', top: 307.2 }, { label: 'Intoxicacion', top: 315.8 },
  { label: 'Infeccion', top: 324.4 }, { label: 'Insolacion', top: 333.0 }, { label: 'Enfermedades respiratorias', top: 341.6 },
  { label: 'Sordera', top: 350.2 }, { label: 'Tendinitis', top: 358.8 }, { label: 'Irradiacion', top: 367.2 },
].map(o => ({ ...o, x: HCR_CX.col3, page: 'p1' }));

const HCR_EPP_COLA = [
  { label: 'Casco', top: 394.4 }, { label: 'Zapato de seguridad', top: 403.0 }, { label: 'Lente de seguridad', top: 411.6 },
  { label: 'Chaleco o buzo con reflectante', top: 420.05 },
  { label: 'Proteccion en las manos', top: 436.15 }, { label: 'Proteccion auditiva', top: 444.4 },
  { label: 'Proteccion respiratoria', top: 453.0 }, { label: 'Proteccion facial (careta)', top: 461.6 },
  { label: 'Proteccion contra caida (arnès)', top: 470.25 }, { label: 'Ropa termica', top: 478.9 },
  { label: 'Ropa soldador (traje completo de cuero)', top: 487.5 }, { label: 'Pierneras', top: 495.9 },
].map(o => ({ ...o, x: HCR_CX.col1, page: 'p1' }));

const HCR_EPP_COLB = [
  { label: 'Traje desechable', top: 386.0 }, { label: 'Ropa de agua', top: 394.4 },
  { label: 'Bota de agua o cubrecalzado', top: 403.0 }, { label: 'Protector solar', top: 411.45 },
  { label: 'Señalizacion de peligros interior faena', top: 428.35 }, { label: 'Señalizacion vial reglamentaria', top: 436.1 },
  { label: 'Proteccion rigida (barandas-tapas)', top: 444.4 }, { label: 'Cinta de peligro', top: 453.0 },
  { label: 'Alarma sonora', top: 461.6 }, { label: 'Alarma luminosa (baliza)', top: 470.25 },
  { label: 'Conos - cono tambo', top: 478.9 }, { label: 'Lineas de vida', top: 487.5 },
  { label: 'Banderero o loro vivo', top: 495.9 },
].map(o => ({ ...o, x: HCR_CX.col2, page: 'p1' }));

const HCR_EPP_COLC = [
  { label: 'Bloqueo de equipo', top: 386.0 }, { label: 'Tarjeta de autorizaciòn (andamio y plataforma)', top: 394.4 },
  { label: 'Pantallas o biombos', top: 403.0 }, { label: 'Pertigas', top: 411.6 }, { label: 'Medicion de atmosfera', top: 420.05 },
].map(o => ({ ...o, x: HCR_CX.col3, page: 'p1' }));

const HCR_VERIF_PREGUNTAS = [
  { label: '¿Conoce el inventario de riesgos para esta actividad?', top: 444.1 },
  { label: '¿Conoce el procedimiento o instructivo relacionado?', top: 452.7 },
];
const HCR_REGISTROS_ADIC = [
  { label: 'Charla especifica de procedimiento o instructivo', top: 469.85 },
  { label: 'Inspeccion a equipo / herramienta / area', top: 478.45 },
  { label: 'Observacion', top: 487.1 },
  { label: 'Lista de chequeo diaria vehiculo / maquinaria', top: 495.7 },
];

function renderChecklistsHcr() {
  renderChecklistInv('chk-hcr-peligros-seg-col1', HCR_PELIGROS_SEG_COL1, 'checkbox', 'peligrosSegCol1');
  renderChecklistInv('chk-hcr-peligros-seg-col2', HCR_PELIGROS_SEG_COL2, 'checkbox', 'peligrosSegCol2');
  renderChecklistInv('chk-hcr-peligros-salud', HCR_PELIGROS_SALUD, 'checkbox', 'peligrosSalud');
  renderChecklistInv('chk-hcr-riesgos-seg', HCR_RIESGOS_SEG, 'checkbox', 'riesgosSeg');
  renderChecklistInv('chk-hcr-riesgos-mat', HCR_RIESGOS_MAT, 'checkbox', 'riesgosMat');
  renderChecklistInv('chk-hcr-riesgos-salud', HCR_RIESGOS_SALUD, 'checkbox', 'riesgosSalud');
  renderChecklistInv('chk-hcr-epp-cola', HCR_EPP_COLA, 'checkbox', 'eppColA');
  renderChecklistInv('chk-hcr-epp-colb', HCR_EPP_COLB, 'checkbox', 'eppColB');
  renderChecklistInv('chk-hcr-epp-colc', HCR_EPP_COLC, 'checkbox', 'eppColC');
  document.getElementById('chk-hcr-verif').innerHTML = HCR_VERIF_PREGUNTAS.map((p, i) => `
    <div class="chk-row"><label class="chk-row-label" style="flex:1;"><span>${esc(p.label)}</span></label>
      <div style="display:flex;gap:14px;">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="radio" name="verif${i}" value="si"> Sí</label>
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="radio" name="verif${i}" value="no"> No</label>
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="radio" name="verif${i}" value="na"> N/A</label>
      </div>
    </div>`).join('');
  document.getElementById('chk-hcr-registros').innerHTML = HCR_REGISTROS_ADIC.map((p, i) => `
    <div class="chk-row"><label class="chk-row-label" style="flex:1;"><span>${esc(p.label)}</span></label>
      <div style="display:flex;gap:14px;">
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="radio" name="reg${i}" value="si"> Sí</label>
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="radio" name="reg${i}" value="no"> No</label>
        <label style="display:flex;align-items:center;gap:4px;font-size:12px;"><input type="radio" name="reg${i}" value="na"> N/A</label>
      </div>
    </div>`).join('');
}

function renderHcr() {
  const obraSel = obraFiltroActivo();
  let items = obraSel ? allHcr.filter(h => h.obra === obraSel) : [...allHcr];
  if (miSupervisorPerfil) items = items.filter(h => h.supervisor === miSupervisorPerfil.nombre);
  items = items.reverse();
  if (items.length === 0) { setListHTML('hcr', emptyState('Sin HCR registradas', 'Toca "+" para registrar una')); return; }
  setListHTML('hcr', items.map(h => `
    <div class="card card--default">
      <div class="card-icon modulo-icon--and">${ic('hcr',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(h.actividad)}</div>
        <div class="card-sub">${esc(h.fecha)} · ${esc(h.obra)}${h.area ? ' · ' + esc(h.area) : ''}</div>
        ${h.pdf ? `<a href="${esc(h.pdf)}" target="_blank" class="badge blue">${ic('documento',12)} Ver documento</a>` : ''}
      </div>
    </div>`).join(''));
}

let hcrEnProceso = null;
function renderChecklistTrabajadoresHcr() {
  const obraSel = obraFiltroActivo();
  const activos = allTrabajadores.filter(t => t.estado === 'Activo' && (!obraSel || t.obra === obraSel));
  document.getElementById('checklist-trabajadores-hcr').innerHTML = activos.map(t => `
    <div class="chk-row" data-nombre="${esc(t.nombre)}" data-rut="${esc(t.rut)}">
      <label class="chk-row-label">
        <span class="chk-row-checkbox-wrap">
          <input type="checkbox" class="chk-row-input">
          <span class="chk-row-checkbox"></span>
        </span>
        <span>${esc(t.nombre)} <span style="color:#888;">· ${esc(t.rut)}</span></span>
      </label>
    </div>`).join('');
}
function abrirNuevoHcr() {
  hcrEnProceso = null;
  const f = document.getElementById('form-hcr');
  f.reset();
  f.fecha.value = hoyISO();
  const selObraHcr = document.getElementById('sel-obra-hcr');
  selObraHcr.innerHTML = opcionesObraSelectHTML(obraPreseleccionada());
  onCambioObraSelect(selObraHcr, 'input-hcr-obra-otra');
  renderChecklistsHcr();
  renderChecklistTrabajadoresHcr();
  openPanel('panel-form-hcr');
  setTimeout(() => {
    initFirmaPad('firma-canvas-hcr-supervisor');
    initFirmaPad('firma-canvas-hcr-jefeobra');
    initFirmaPad('firma-canvas-hcr-prevencion');
  }, 80);
}
function seleccionadosHcrRadio(prefix, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const el = document.querySelector(`input[name="${prefix}${i}"]:checked`);
    out.push(el ? el.value : '');
  }
  return out;
}
function guardarDatosHcr(ev) {
  ev.preventDefault();
  const f = ev.target;
  if (firmaEstaVacia('firma-canvas-hcr-supervisor')) { toast('Falta la firma del supervisor', 'error'); return; }
  const asistentes = [...document.querySelectorAll('#checklist-trabajadores-hcr .chk-row')]
    .filter(row => row.querySelector('.chk-row-input').checked)
    .map(row => ({ nombre: row.dataset.nombre, rut: row.dataset.rut, firma: null }));

  hcrEnProceso = {
    obra: valorObra(f.obra, 'input-hcr-obra-otra'),
    fecha: f.fecha.value,
    actividad: f.actividad.value, area: f.area.value, hhCapacitacion: f.hhCapacitacion.value,
    peligrosSegCol1: seleccionadosInv('peligrosSegCol1'), peligrosSegCol2: seleccionadosInv('peligrosSegCol2'),
    peligrosSalud: seleccionadosInv('peligrosSalud'),
    riesgosSeg: seleccionadosInv('riesgosSeg'), riesgosSegOtroTexto: f.riesgosSegOtroTexto.value,
    riesgosMat: seleccionadosInv('riesgosMat'), riesgosSalud: seleccionadosInv('riesgosSalud'),
    eppColA: seleccionadosInv('eppColA'), eppColB: seleccionadosInv('eppColB'), eppColC: seleccionadosInv('eppColC'),
    verif: seleccionadosHcrRadio('verif', HCR_VERIF_PREGUNTAS.length),
    registros: seleccionadosHcrRadio('reg', HCR_REGISTROS_ADIC.length),
    tareas: [1,2,3,4].map(i => ({ tarea: f['tarea'+i].value, riesgo: f['riesgo'+i].value, medida: f['medida'+i].value })),
    supervisorNombre: f.supervisorNombre.value,
    firmaSupervisor: firmaCanvasADataURL('firma-canvas-hcr-supervisor'),
    firmaJefeObra: firmaCanvasADataURL('firma-canvas-hcr-jefeobra'),
    firmaPrevencion: firmaCanvasADataURL('firma-canvas-hcr-prevencion'),
    asistentes, asistenteActual: 0,
  };
  closePanel('panel-form-hcr');
  if (asistentes.length === 0) { finalizarHcr(); return; }
  setTimeout(() => { openPanel('panel-firmar-trabajador-hcr'); mostrarFirmaTrabajadorHcrActual(); }, 260);
}
function mostrarFirmaTrabajadorHcrActual() {
  const { asistentes, asistenteActual } = hcrEnProceso;
  const a = asistentes[asistenteActual];
  document.getElementById('firmar-trabajador-hcr-progreso').textContent = `Firma ${asistenteActual + 1} de ${asistentes.length}`;
  document.getElementById('firmar-trabajador-hcr-nombre').textContent = a.nombre;
  document.getElementById('firmar-trabajador-hcr-rut').textContent = a.rut;
  setTimeout(() => initFirmaPad('firma-canvas-trabajador-hcr'), 80);
}
function avanzarTrabajadorHcr() {
  hcrEnProceso.asistenteActual++;
  if (hcrEnProceso.asistenteActual >= hcrEnProceso.asistentes.length) {
    closePanel('panel-firmar-trabajador-hcr');
    setTimeout(finalizarHcr, 260);
  } else {
    mostrarFirmaTrabajadorHcrActual();
  }
}
function confirmarFirmaTrabajadorHcr() {
  if (firmaEstaVacia('firma-canvas-trabajador-hcr')) { toast('Falta la firma', 'error'); return; }
  hcrEnProceso.asistentes[hcrEnProceso.asistenteActual].firma = firmaCanvasADataURL('firma-canvas-trabajador-hcr');
  avanzarTrabajadorHcr();
}
function saltarFirmaTrabajadorHcr() { avanzarTrabajadorHcr(); }
function cancelarFirmaTrabajadoresHcr() {
  closePanel('panel-firmar-trabajador-hcr');
  hcrEnProceso = null;
  toast('Registro de HCR cancelado', 'error');
}
async function finalizarHcr() {
  try {
    toast('Generando documento...');
    const pdfLink = await generarYSubirPdfHcr(hcrEnProceso);
    const n = allHcr.length + 1;
    await appendSheet(`'${CONFIG.SHEET_HCR}'!A:V`, [[
      n, hcrEnProceso.fecha, hcrEnProceso.obra, hcrEnProceso.actividad, hcrEnProceso.area, hcrEnProceso.hhCapacitacion,
      hcrEnProceso.peligrosSegCol1.map(i => HCR_PELIGROS_SEG_COL1[i].label).concat(hcrEnProceso.peligrosSegCol2.map(i => HCR_PELIGROS_SEG_COL2[i].label)).join('; '),
      hcrEnProceso.peligrosSalud.map(i => HCR_PELIGROS_SALUD[i].label).join('; '),
      hcrEnProceso.riesgosSeg.map(i => HCR_RIESGOS_SEG[i].label).join('; '),
      hcrEnProceso.riesgosMat.map(i => HCR_RIESGOS_MAT[i].label).join('; '),
      hcrEnProceso.riesgosSalud.map(i => HCR_RIESGOS_SALUD[i].label).join('; '),
      hcrEnProceso.eppColA.map(i => HCR_EPP_COLA[i].label).concat(hcrEnProceso.eppColB.map(i => HCR_EPP_COLB[i].label)).concat(hcrEnProceso.eppColC.map(i => HCR_EPP_COLC[i].label)).join('; '),
      hcrEnProceso.verif.join('; '), hcrEnProceso.registros.join('; '),
      hcrEnProceso.tareas.map(t => `${t.tarea} | ${t.riesgo} | ${t.medida}`).filter(s => s.trim() !== ' |  | ').join(' // '),
      hcrEnProceso.supervisorNombre, '', '',
      hcrEnProceso.asistentes.map(a => `${a.nombre} (${a.rut})`).join('; '),
      pdfLink, userEmail || '', new Date().toLocaleString('es-CL'),
    ]]);
    toast('HCR registrada y documento generado ✓', 'ok');
    hcrEnProceso = null;
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Generación del PDF de HCR: plantilla de 4 páginas, p1/p2 A4 apaisado
// (H=595.2) y p3/p4 carta (H=792). Mismo checkX()/textBlock() ya validados
// en Investigación, coordenadas medidas con pdfplumber (franjas de checkbox
// compartidas entre secciones apiladas en la misma columna). ──────────────
async function generarYSubirPdfHcr(datos) {
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const templateBytes = await fetch('plantillas/hcr.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const [p1, p2, p3, p4] = pdfDoc.getPages();
  const H1 = 595.2, H2 = 792;

  function cover(page, H, x0, top0, x1, top1) {
    page.drawRectangle({ x: x0, y: H - top1, width: x1 - x0, height: top1 - top0, color: rgb(1,1,1) });
  }
  function text(page, H, str, x, top, size, bold) {
    page.drawText(str || '', { x, y: H - top, size: size || 6.5, font: bold ? fontBold : font, color: rgb(0,0,0) });
  }
  function checkX(page, H, x, cellCenterTop, size) {
    const s = size || 7.5;
    const capHeight = s * 0.72;
    const baselineTop = cellCenterTop + capHeight / 2;
    page.drawText('X', { x: x - s * 0.33, y: H - baselineTop, size: s, font: fontBold, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = []; let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  function textBlock(page, H, str, x, tops, maxWidth, size) {
    wrapLines(str, maxWidth, size || 6.5).slice(0, tops.length).forEach((l, i) => text(page, H, l, x, tops[i], size));
  }
  async function drawSig(page, H, dataUrl, x, top, w, h) {
    if (!dataUrl) return;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);
    const dims = escalarFirmaCasillero(img, w, h);
    page.drawImage(img, { x, y: H - top - dims.height, width: dims.width, height: dims.height });
  }

  // Pie de página de la plantilla original (branding de terceros) sólo
  // existe en p3/p4 — se tapa igual que en Charla/HCR original.
  [p3, p4].forEach(p => cover(p, H2, 220, 767, 392, 782));

  // Encabezado AÑO (páginas 1 y 2, cada una trae su propia caja AÑO/VERSION/PAGINA)
  cover(p1, H1, 630, 53, 709, 62.5);
  text(p1, H1, ddmmyyyy(hoyISO()), 638, 61, 6.5);
  cover(p2, H1, 566, 70.6, 657, 78.6);
  text(p2, H1, ddmmyyyy(hoyISO()), 567, 77, 6.5);

  // 1. Peligros/Seguridad + 2. Peligros/Salud
  datos.peligrosSegCol1.forEach(i => checkX(p1, H1, HCR_PELIGROS_SEG_COL1[i].x, HCR_PELIGROS_SEG_COL1[i].top));
  datos.peligrosSegCol2.forEach(i => checkX(p1, H1, HCR_PELIGROS_SEG_COL2[i].x, HCR_PELIGROS_SEG_COL2[i].top));
  datos.peligrosSalud.forEach(i => checkX(p1, H1, HCR_PELIGROS_SALUD[i].x, HCR_PELIGROS_SALUD[i].top));

  // 3/4/5. Riesgos
  datos.riesgosSeg.forEach(i => checkX(p1, H1, HCR_RIESGOS_SEG[i].x, HCR_RIESGOS_SEG[i].top));
  if (datos.riesgosSegOtroTexto) text(p1, H1, datos.riesgosSegOtroTexto, 145, 369, 6);
  datos.riesgosMat.forEach(i => checkX(p1, H1, HCR_RIESGOS_MAT[i].x, HCR_RIESGOS_MAT[i].top));
  datos.riesgosSalud.forEach(i => checkX(p1, H1, HCR_RIESGOS_SALUD[i].x, HCR_RIESGOS_SALUD[i].top));

  // 6. EPP y medios de apoyo
  datos.eppColA.forEach(i => checkX(p1, H1, HCR_EPP_COLA[i].x, HCR_EPP_COLA[i].top));
  datos.eppColB.forEach(i => checkX(p1, H1, HCR_EPP_COLB[i].x, HCR_EPP_COLB[i].top));
  datos.eppColC.forEach(i => checkX(p1, H1, HCR_EPP_COLC[i].x, HCR_EPP_COLC[i].top));

  // 7. Verificación de comunicación + registros adicionales (SI/NO/NA)
  const colXSiNoNa = { si: HCR_CX.si, no: HCR_CX.no, na: HCR_CX.na };
  HCR_VERIF_PREGUNTAS.forEach((p, i) => { if (datos.verif[i]) checkX(p1, H1, colXSiNoNa[datos.verif[i]], p.top); });
  HCR_REGISTROS_ADIC.forEach((p, i) => { if (datos.registros[i]) checkX(p1, H1, colXSiNoNa[datos.registros[i]], p.top); });

  // Página 2: encabezado (Actividad/Área/Fecha/HH capacitación)
  text(p2, H1, datos.actividad, 70, 109, 6.5);
  text(p2, H1, datos.hhCapacitacion, 460, 109, 6.5);
  text(p2, H1, datos.area, 65, 120, 6.5);
  text(p2, H1, ddmmyyyy(datos.fecha), 418, 120, 6.5);

  // Tabla Tareas / Riesgos / Medidas para el control de los riesgos
  const filaAltura = (482.0 - 135.5) / 4;
  datos.tareas.forEach((t, i) => {
    if (!t.tarea && !t.riesgo && !t.medida) return;
    const topBase = 135.5 + i * filaAltura + 10;
    textBlock(p2, H1, t.tarea, 38, [topBase, topBase+8.6, topBase+17.2], 165, 6.5);
    textBlock(p2, H1, t.riesgo, 213, [topBase, topBase+8.6, topBase+17.2], 143, 6.5);
    textBlock(p2, H1, t.medida, 366, [topBase, topBase+8.6, topBase+17.2], 285, 6.5);
  });

  // Firmas jefatura (la caja es angosta y la plantilla ya trae impresas las
  // etiquetas "SUPERVISOR:"/"JEFE DE OBRA..."/"PREVENCION DE RIESGOS" a media
  // altura de cada columna; sólo se dibuja la firma debajo, sin nombre
  // tipeado encima para no superponerse con esas etiquetas)
  await drawSig(p2, H1, datos.firmaSupervisor, 365, 510, 110, 22);
  await drawSig(p2, H1, datos.firmaJefeObra, 486, 510, 75, 20);
  await drawSig(p2, H1, datos.firmaPrevencion, 569, 510, 85, 20);

  // Fecha en encabezado de páginas 3 y 4 (registro de firmas)
  [p3, p4].forEach(p => {
    cover(p, H2, 488, 35, 546, 50);
    text(p, H2, ddmmyyyy(hoyISO()), 490, 47, 8);
  });

  // La página 4 repite al final su propia caja "FIRMAS JEFATURA" (idéntica a
  // la de la página 2) — se dibujan las mismas 3 firmas ahí también.
  await drawSig(p4, H2, datos.firmaSupervisor, 35, 668, 185, 38);
  await drawSig(p4, H2, datos.firmaJefeObra, 233, 668, 140, 38);
  await drawSig(p4, H2, datos.firmaPrevencion, 386, 668, 175, 38);

  // Roster de firmas de la cuadrilla: filas 1-23 en página 3, 24-42 en página 4
  const filasP3 = [122.0,149.4,178.4,202.8,232.6,255.6,284.0,308.4,338.2,361.2,389.6,413.4,443.9,469.9,495.3,518.3,546.5,570.3,597.9,625.1,649.7,674.3,698.9];
  const filasP4 = [122.0,149.4,178.4,202.8,232.6,255.6,284.0,308.4,338.2,361.2,389.6,413.4,443.9,469.9,495.3,518.3,546.5,570.3,597.9];
  for (let i = 0; i < datos.asistentes.length && i < filasP3.length; i++) {
    const a = datos.asistentes[i], top = filasP3[i];
    text(p3, H2, a.nombre, 63, top + 8, 8);
    text(p3, H2, a.rut, 270, top + 8, 8);
    await drawSig(p3, H2, a.firma, 382, top - 1, 175, 24);
  }
  for (let i = filasP3.length; i < datos.asistentes.length && i < filasP3.length + filasP4.length; i++) {
    const a = datos.asistentes[i], top = filasP4[i - filasP3.length];
    text(p4, H2, a.nombre, 63, top + 8, 8);
    text(p4, H2, a.rut, 270, top + 8, 8);
    await drawSig(p4, H2, a.firma, 382, top - 1, 175, 24);
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const up = await uploadFile(blob, 'HCR', 'hcr_' + (datos.obra || 'obra').replace(/\s+/g,'_'), 'pdf');
  return up.link;
}

// ============================================================
// MÓDULO: PROCEDIMIENTOS DE TRABAJO SEGURO
// ============================================================
let filtroProcedimientos = '';
function onBuscarProcedimientos(v) {
  filtroProcedimientos = sinTildes((v || '').trim().toLowerCase());
  renderProcedimientos();
}
function renderProcedimientos() {
  let items = [...allProcedimientos].reverse();
  if (filtroProcedimientos) {
    items = items.filter(p => sinTildes((p.nombre || '').toLowerCase()).includes(filtroProcedimientos));
  }
  if (items.length === 0) { setListHTML('procedimientos', emptyState(filtroProcedimientos ? 'Sin resultados' : 'Sin procedimientos', filtroProcedimientos ? 'Prueba con otro nombre' : 'Sube el primer PTS')); return; }
  setListHTML('procedimientos', items.map(p => `
    <div class="card card--default">
      <div class="card-icon modulo-icon--cont">${ic('procedimientos',18)}</div>
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
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// MÓDULO: SUBCONTRATISTAS
// ------------------------------------------------------------
// Dos vistas comparten el mismo HTML (renderSubcontratistaDetalleHTML):
//  - Admin (interno): entra por el listado de empresas (renderSubcontratistas,
//    página normal del módulo) y ve el detalle dentro de un panel deslizante.
//  - Cuenta subcontratista (USUARIOS.Rol="subcontratista"): NUNCA ve el
//    listado ni ningún otro módulo — arrancarApp() la manda directo a
//    mostrarModoSubcontratista(), una pantalla fija aparte (#subcontratista-root)
//    con SOLO la empresa que le corresponde.
// ============================================================
function renderSubcontratistas() {
  if (allSubcontratistas.length === 0) {
    setListHTML('subcontratistas', emptyState('Sin subcontratistas', 'Agrega el primero con el botón +'));
    return;
  }
  setListHTML('subcontratistas', allSubcontratistas.map(s => {
    const correos = allUsuarios.filter(u => u.empresa === s.empresa && u.rol === 'subcontratista').length;
    return `
    <div class="card card--default" onclick="abrirDetalleSubcontratista('${esc(s.empresa)}')">
      <div class="card-icon modulo-icon--cont">${ic('subcontratistas',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(s.empresa)}</div>
        <div class="card-sub">${correos} correo(s) autorizado(s)</div>
      </div>
      <div class="card-chevron"><svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
    </div>`;
  }).join(''));
}

function abrirFormSubcontratista() {
  const f = document.getElementById('form-subcontratista');
  f.reset();
  openPanel('panel-form-subcontratista');
}
async function guardarSubcontratista(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    const empresa = f.empresa.value.trim();
    if (allSubcontratistas.some(s => s.empresa.toLowerCase() === empresa.toLowerCase())) {
      toast('Ya existe un subcontratista con ese nombre', 'error');
      return;
    }
    const correos = f.correos.value.split('\n').map(s => s.trim()).filter(Boolean);
    await appendSheet(`'${CONFIG.SHEET_SUBCONTRATISTAS}'!A:B`, [[empresa, new Date().toLocaleString('es-CL')]]);
    if (correos.length) {
      await appendSheet(`'${CONFIG.SHEET_USUARIOS}'!A:D`, correos.map(c => [c.toLowerCase(), 'subcontratista', '', empresa]));
    }
    toast('Subcontratista agregado ✓', 'ok');
    closePanel('panel-form-subcontratista');
    await cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

let empresaSubcontratistaActual = null;
let mesControlSubcontratista = new Date().toISOString().slice(0,7);

function abrirDetalleSubcontratista(empresa) {
  empresaSubcontratistaActual = empresa;
  document.getElementById('pnl-title-detalle-subcontratista').textContent = empresa;
  document.getElementById('detalle-subcontratista-body').innerHTML = renderSubcontratistaDetalleHTML(empresa, false);
  openPanel('panel-detalle-subcontratista');
}
// Pantalla fija de la cuenta subcontratista — sin panel, sin "Volver"
// (no hay a dónde volver: esta ES toda su app).
function mostrarModoSubcontratista(empresa) {
  document.getElementById('subcontratista-root').classList.remove('hidden');
  document.getElementById('subcontratista-root-empresa').textContent = empresa;
  document.getElementById('subcontratista-root-email').textContent = userEmail || '';
  document.getElementById('subcontratista-root-email-2').textContent = userEmail || '';
  document.getElementById('subcontratista-root-body').innerHTML = renderSubcontratistaDetalleHTML(empresa, true);
}

function docsSubcontratista(empresa, categoria, item, periodo) {
  return allSubDocs.filter(d => d.empresa === empresa && d.categoria === categoria &&
    (item == null || d.item === item) && (periodo == null || d.periodo === periodo));
}
// Cada subida nueva se agrega como fila aparte (queda historial en el
// Sheet); para mostrar el estado del ítem alcanza con la más reciente.
function ultimoDocSubcontratista(lista) { return lista.length ? lista[lista.length - 1] : null; }

// Círculo de estado (check verde si ya se subió algo, vacío si no) — mismo
// lenguaje visual en todos los ítems de checklist del módulo, para que se
// note de un vistazo qué falta sin tener que leer cada fila.
function iconoEstadoDoc(subido) {
  return `<div class="subcont-row-icon${subido ? ' ok' : ''}">${subido
    ? '<svg viewBox="0 0 24 24" fill="none" style="width:14px;height:14px"><path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" style="width:8px;height:8px"><circle cx="12" cy="12" r="8" fill="currentColor"/></svg>'}</div>`;
}
function filaChecklistSubcontratista(empresa, categoria, item, periodo) {
  const doc = ultimoDocSubcontratista(docsSubcontratista(empresa, categoria, item, periodo));
  return `
    <div class="subcont-row">
      ${iconoEstadoDoc(!!doc)}
      <div class="subcont-row-body">
        <div class="subcont-row-nombre">${esc(item)}</div>
        <div class="subcont-row-fecha">${doc ? 'Subido ' + esc((doc.fecha||'').split(',')[0] || doc.fecha) : 'Pendiente'}</div>
      </div>
      <div class="subcont-row-actions">
        ${doc ? `<a class="badge blue" href="${esc(doc.link)}" target="_blank">${ic('documento',12)} Ver</a>` : ''}
        <label class="doc-file-label${doc ? ' selected' : ''}" style="width:auto;padding:6px 12px;font-size:12px;">
          ${doc ? 'Reemplazar' : '+ Subir'}
          <input type="file" style="display:none" onchange="onSubirDocSubcontratista(this,'${esc(empresa)}','${categoria}','${esc(item)}','${periodo||''}')">
        </label>
      </div>
    </div>`;
}
function filaGlobalSubcontratista(item, doc, esRestringido) {
  return `
    <div class="subcont-row">
      ${iconoEstadoDoc(!!doc)}
      <div class="subcont-row-body">
        <div class="subcont-row-nombre">${esc(item)}</div>
        <div class="subcont-row-fecha">${doc ? 'Subido ' + esc((doc.fecha||'').split(',')[0] || doc.fecha) : 'Pendiente'}</div>
      </div>
      <div class="subcont-row-actions">
        ${doc ? `<a class="badge blue" href="${esc(doc.link)}" target="_blank">${ic('documento',12)} Ver</a>` : ''}
        ${!esRestringido ? `<label class="doc-file-label${doc ? ' selected' : ''}" style="width:auto;padding:6px 12px;font-size:12px;">${doc ? 'Reemplazar' : '+ Subir'}<input type="file" style="display:none" onchange="onSubirDocGlobalSubcontratista(this,'${esc(item)}')"></label>` : ''}
      </div>
    </div>`;
}
function onSeleccionarProgramaPersonalizado(sel) {
  const preview = sel.closest('.subcont-row').querySelector('.programa-preview');
  if (!sel.value) { preview.innerHTML = ''; return; }
  const p = PROGRAMAS_PERSONALIZADOS.find(x => x.archivo === sel.value);
  if (!p) { preview.innerHTML = ''; return; }
  preview.innerHTML = `
    <div class="subcont-row" style="margin-top:8px;padding:10px;background:var(--neutral-soft);border-radius:10px;border-bottom:none;">
      ${iconoEstadoDoc(true)}
      <div class="subcont-row-body">
        <div class="subcont-row-nombre">${esc(p.nombre)}</div>
        <div class="subcont-row-fecha">${esc(p.codigo)}</div>
      </div>
      <div class="subcont-row-actions">
        <a class="badge blue" href="${esc(p.archivo)}" target="_blank">${ic('documento',12)} Abrir</a>
      </div>
    </div>`;
}
function contarSubidosSubcontratista(empresa, categoria, items, periodo) {
  return items.filter(item => ultimoDocSubcontratista(docsSubcontratista(empresa, categoria, item, periodo))).length;
}
function progresoBadgeSubcontratista(subidos, total) {
  return `<span class="subcont-progress${subidos === total ? ' completo' : ''}">${subidos}/${total}</span>`;
}

function renderSubcontratistaDetalleHTML(empresa, esRestringido) {
  const reglamento = ultimoDocSubcontratista(docsSubcontratista('__GLOBAL__', 'global', 'Reglamento de Subcontratista'));
  const correos = allUsuarios.filter(u => u.empresa === empresa && u.rol === 'subcontratista');
  const herramientas = docsSubcontratista(empresa, 'herramientas').slice().reverse();
  const subidosEmpresa = contarSubidosSubcontratista(empresa, 'empresa', SUBCONT_CARPETA_EMPRESA, null);
  const subidosMensual = contarSubidosSubcontratista(empresa, 'mensual', SUBCONT_CONTROL_MENSUAL, mesControlSubcontratista);

  return `
    <div class="subcont-section">
      <div class="subcont-section-head"><div class="subcont-section-title">Documentos generales</div></div>
      ${filaGlobalSubcontratista('Reglamento de Subcontratista', reglamento, esRestringido)}
      <div class="subcont-row" style="display:block;">
        <div class="subcont-row-nombre">Programa personalizado</div>
        <div class="form-group" style="margin:8px 0 0;">
          <select onchange="onSeleccionarProgramaPersonalizado(this)">
            <option value="">— Selecciona uno para ver —</option>
            ${PROGRAMAS_PERSONALIZADOS.map(p => `<option value="${esc(p.archivo)}">${esc(p.codigo)} — ${esc(p.nombre)}</option>`).join('')}
          </select>
        </div>
        <div class="programa-preview"></div>
      </div>
    </div>

    <div class="subcont-section">
      <div class="subcont-section-head">
        <div class="subcont-section-title">Carpeta de empresa</div>
        ${progresoBadgeSubcontratista(subidosEmpresa, SUBCONT_CARPETA_EMPRESA.length)}
      </div>
      ${SUBCONT_CARPETA_EMPRESA.map(item => filaChecklistSubcontratista(empresa, 'empresa', item, null)).join('')}
    </div>

    <div class="subcont-section">
      <div class="subcont-section-head">
        <div class="subcont-section-title">Control mensual</div>
        ${progresoBadgeSubcontratista(subidosMensual, SUBCONT_CONTROL_MENSUAL.length)}
      </div>
      <div class="subcont-mes-picker">
        <svg viewBox="0 0 24 24" fill="none" style="width:16px;height:16px;color:var(--ink-soft);flex-shrink:0"><path d="M4 21V8l8-5 8 5v13" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M4 11h16" stroke="currentColor" stroke-width="1.5"/></svg>
        <input type="month" value="${mesControlSubcontratista}" onchange="onCambioMesSubcontratista(this.value,'${esc(empresa)}',${esRestringido})">
      </div>
      ${SUBCONT_CONTROL_MENSUAL.map(item => filaChecklistSubcontratista(empresa, 'mensual', item, mesControlSubcontratista)).join('')}
    </div>

    <div class="subcont-section">
      <div class="subcont-section-head"><div class="subcont-section-title">Control de herramientas y extensiones eléctricas</div></div>
      ${herramientas.length ? herramientas.map(d => `
        <div class="doc-row"><a class="badge blue" href="${esc(d.link)}" target="_blank">${ic('documento',12)} ${esc(d.archivo)}</a><span style="font-size:11px;color:#888;">${esc((d.fecha||'').split(',')[0] || d.fecha)}</span></div>
      `).join('') : '<div class="empty-sub" style="padding:8px 0;">Sin archivos subidos</div>'}
      <label class="upload-label" style="margin-top:10px;">+ Subir archivo<input type="file" style="display:none" onchange="onSubirDocSubcontratista(this,'${esc(empresa)}','herramientas','','')"></label>
    </div>

    ${!esRestringido ? `
    <div class="subcont-section">
      <div class="subcont-section-head"><div class="subcont-section-title">Correos autorizados</div></div>
      ${correos.map(c => `<div class="doc-row"><span>${esc(c.correo)}</span></div>`).join('') || '<div class="empty-sub">Sin correos asignados todavía</div>'}
      <form onsubmit="onAgregarCorreoSubcontratista(event,'${esc(empresa)}')" style="display:flex;gap:8px;margin-top:10px;">
        <input name="correo" type="email" placeholder="correo@empresa.com" required style="flex:1;padding:10px;border:1.5px solid var(--line);border-radius:8px;font-family:inherit;">
        <button class="btn-add" type="submit" style="width:auto;padding:10px 16px;">+ Agregar</button>
      </form>
    </div>` : ''}
  `;
}

async function onSubirDocSubcontratista(inputEl, empresa, categoria, item, periodo) {
  const file = inputEl.files[0];
  if (!file) return;
  try {
    const prefix = [categoria, item, periodo].filter(Boolean).join('_').replace(/\s+/g, '-');
    if (subcontratistaUsaProxy) {
      // Esta cuenta no tiene acceso directo al Sheet/Drive: el archivo se
      // manda en base64 a la Web App, que hace la subida real con sus
      // propios permisos (ver APPS_SCRIPT_WEBAPP_SUBCONTRATISTAS.js).
      const b64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const fecha = new Date().toLocaleDateString('es-CL').replace(/\//g, '-');
      const hora = new Date().toTimeString().slice(0,5).replace(':','');
      const extension = file.name.split('.').pop() || 'bin';
      toast('Subiendo archivo...');
      await llamarWebAppSubcontratista('subirDocumento', {
        empresa, categoria, item: item || '', periodo: periodo || '',
        nombreArchivo: `${prefix}_${fecha}_${hora}.${extension}`,
        mimeType: file.type || 'application/octet-stream', contenidoBase64: b64,
      });
    } else {
      const up = await uploadFileSubcontratista(file, empresa, prefix);
      await appendSheet(`'${CONFIG.SHEET_SUBCONTRATISTAS_DOCS}'!A:H`, [[
        empresa, categoria, item || '', periodo || '', up.name, up.link,
        new Date().toLocaleString('es-CL'), userEmail || ''
      ]]);
    }
    toast('Documento subido ✓', 'ok');
    await cargarTodo(true);
    if (miEmpresaSubcontratista) mostrarModoSubcontratista(empresa); else abrirDetalleSubcontratista(empresa);
  } catch (e) { toast(e.message, 'error'); }
}
async function onSubirDocGlobalSubcontratista(inputEl, item) {
  const file = inputEl.files[0];
  if (!file) return;
  try {
    const up = await uploadFileSubcontratista(file, '__GLOBAL__', item.replace(/\s+/g, '-'));
    await appendSheet(`'${CONFIG.SHEET_SUBCONTRATISTAS_DOCS}'!A:H`, [[
      '__GLOBAL__', 'global', item, '', up.name, up.link,
      new Date().toLocaleString('es-CL'), userEmail || ''
    ]]);
    toast('Documento actualizado ✓', 'ok');
    await cargarTodo(true);
    if (empresaSubcontratistaActual) abrirDetalleSubcontratista(empresaSubcontratistaActual);
  } catch (e) { toast(e.message, 'error'); }
}
function onCambioMesSubcontratista(valor, empresa, esRestringido) {
  mesControlSubcontratista = valor;
  if (esRestringido) mostrarModoSubcontratista(empresa); else abrirDetalleSubcontratista(empresa);
}
async function onAgregarCorreoSubcontratista(ev, empresa) {
  ev.preventDefault();
  const correo = ev.target.correo.value.trim().toLowerCase();
  try {
    await appendSheet(`'${CONFIG.SHEET_USUARIOS}'!A:D`, [[correo, 'subcontratista', '', empresa]]);
    toast('Correo agregado ✓', 'ok');
    await cargarTodo(true);
    abrirDetalleSubcontratista(empresa);
  } catch (e) { toast(e.message, 'error'); }
}

// ============================================================
// MÓDULO: ENTREGA DE EPP (con firma)
// ============================================================
// Un nombre guardado "pertenece" al catálogo si es exactamente un ítem
// base, o si viene compuesto con su tipo/talla (ver nombreCompletoEpp) —
// en ese caso NO se agrega como fila histórica aparte, porque ya está
// cubierto por el ítem base + su selector de tipo/talla.
function perteneceACatalogoEpp(nombre) {
  return EPP_ITEMS.some(it => nombre === it.nombre || nombre.startsWith(it.nombre + ' - ') || nombre.startsWith(it.nombre + ' N°') || nombre.startsWith(it.nombre + ' Talla '));
}
function opcionesEppDisponibles() {
  // Catálogo base (con sus tipos/talla) + cualquier ítem escrito en "+
  // Escribir otro tipo de EPP" que no esté ya cubierto por el catálogo
  // (se detecta automáticamente porque ya quedó guardado en entregas
  // previas) — esos quedan como checkbox simple, sin tipo/talla propios.
  const historicos = [...new Set(allEpp.flatMap(e => itemsDeFilaEpp(e).map(x => x.item)).filter(Boolean))]
    .filter(nombre => !perteneceACatalogoEpp(nombre));
  historicos.sort((a, b) => a.localeCompare(b, 'es'));
  return [...EPP_ITEMS, ...historicos.map(nombre => ({ nombre }))];
}

function renderEpp() {
  // EPP no tiene su propia columna Obra — se filtra por la Obra del
  // trabajador al que se le entregó (buscado por nombre, igual que el resto
  // de la app cruza Trabajadores por nombre en vez de un ID).
  const obraSel = obraFiltroActivo();
  const eppObra = obraSel
    ? allEpp.filter(e => { const t = allTrabajadores.find(x => x.nombre === e.trabajador); return t && t.obra === obraSel; })
    : allEpp;
  if (eppObra.length === 0) { setListHTML('epp', emptyState('Sin entregas registradas', '')); return; }
  // Cada fila ya es una entrega completa (todos sus ítems juntos); se
  // mantiene el agrupado por fecha+trabajador+firma solo por compatibilidad
  // con filas antiguas, de antes de combinar los ítems en una sola fila.
  const grupos = {};
  const orden = [];
  eppObra.forEach(e => {
    const key = e.fecha + '|' + e.trabajador + '|' + e.firma;
    if (!grupos[key]) { grupos[key] = { fecha: e.fecha, trabajador: e.trabajador, firma: e.firma, documento: e.documento, items: [] }; orden.push(key); }
    grupos[key].items.push(...itemsDeFilaEpp(e).map(x => `${x.item} (${x.cantidad})`));
  });
  const items = orden.map(k => grupos[k]).reverse();
  setListHTML('epp', items.map(g => `
    <div class="card card--default">
      <div class="card-icon modulo-icon--mov">${ic('epp',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(g.trabajador)}</div>
        <div class="card-sub">${esc(g.fecha)}</div>
        <div class="card-sub">${esc(g.items.join(' · '))}</div>
        <div class="badge-row">
          ${g.documento ? `<a href="${esc(g.documento)}" target="_blank" class="badge blue">${ic('documento',12)} Ver documento</a>` : '<span class="badge gray">Sin documento</span>'}
        </div>
      </div>
    </div>`).join(''));
}

let firmaCtx = null, firmaActiva = false;

function renderChecklistEpp() {
  document.getElementById('checklist-epp').innerHTML = opcionesEppDisponibles().map(item => `
    <div class="chk-row" data-item="${esc(item.nombre)}" ${item.tallaLabel ? `data-talla-label="${esc(item.tallaLabel)}"` : ''}>
      <label class="chk-row-label">
        <span class="chk-row-checkbox-wrap">
          <input type="checkbox" class="chk-row-input" onchange="onToggleEppItem(this)">
          <span class="chk-row-checkbox"></span>
        </span>
        <span>${esc(item.nombre)}</span>
      </label>
      <input type="number" class="epp-item-qty hidden" min="1" value="1">
      ${item.tipos || item.talla ? `
      <div class="epp-item-variantes hidden">
        ${item.tipos ? `<select class="epp-item-tipo">
          <option value="">${esc(item.tipoLabel || 'Tipo')}...</option>
          ${item.tipos.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
        </select>` : ''}
        ${item.talla ? `<input class="epp-item-talla" placeholder="${esc(item.tallaLabel || 'Talla')}">` : ''}
      </div>` : ''}
    </div>`).join('');
}
function onToggleEppItem(chk) {
  const row = chk.closest('.chk-row');
  row.querySelector('.epp-item-qty').classList.toggle('hidden', !chk.checked);
  const variantes = row.querySelector('.epp-item-variantes');
  if (variantes) variantes.classList.toggle('hidden', !chk.checked);
}
function onCambioEppOtro() {
  const nombre = document.getElementById('input-epp-otro').value.trim();
  document.getElementById('grupo-epp-otro-qty').classList.toggle('hidden', !nombre);
}
// Compone el nombre final del ítem con su tipo/talla elegidos (ej. "Casco
// de seguridad - Amarillo", "Calzado de seguridad - Zapatos básicos N°42")
// — así queda todo en un solo string, igual que el resto de la app guarda
// los ítems de EPP (sin necesitar columnas nuevas en el Sheet).
function nombreCompletoEpp(row) {
  let nombre = row.dataset.item;
  const tipoSel = row.querySelector('.epp-item-tipo');
  if (tipoSel && tipoSel.value) nombre += ' - ' + tipoSel.value;
  const tallaInput = row.querySelector('.epp-item-talla');
  if (tallaInput && tallaInput.value.trim()) {
    const label = row.dataset.tallaLabel || 'Talla';
    nombre += label === 'N°' ? ` N°${tallaInput.value.trim()}` : ` ${label} ${tallaInput.value.trim()}`;
  }
  return nombre;
}
function recolectarItemsEpp() {
  const items = [];
  document.querySelectorAll('#checklist-epp .chk-row').forEach(row => {
    const chk = row.querySelector('.chk-row-input');
    if (chk.checked) {
      const cantidad = parseInt(row.querySelector('.epp-item-qty').value, 10) || 1;
      items.push({ item: nombreCompletoEpp(row), cantidad });
    }
  });
  const otroNombre = document.getElementById('input-epp-otro').value.trim();
  if (otroNombre) {
    const cantidad = parseInt(document.getElementById('input-epp-otro-cantidad').value, 10) || 1;
    items.push({ item: otroNombre, cantidad });
  }
  return items;
}

// prefillItem/prefillTrabajador: usados por la sugerencia de "reponer EPP" al cerrar un incidente
function abrirFormEpp(prefillItem, prefillTrabajador) {
  const f = document.getElementById('form-epp');
  f.reset();
  f.fecha.value = hoyISO();
  document.getElementById('sel-trabajador-epp').innerHTML =
    '<option value="">— Selecciona un trabajador —</option>' + selectTrabajadoresOptions();
  const trab = prefillTrabajador && allTrabajadores.find(x => x.nombre === prefillTrabajador);
  if (trab) f.trabajador.value = `${trab.nombre}|${trab.rut}`;

  renderChecklistEpp();
  document.getElementById('input-epp-otro').value = '';
  document.getElementById('grupo-epp-otro-qty').classList.add('hidden');
  if (prefillItem) {
    const row = document.querySelector(`#checklist-epp .chk-row[data-item="${CSS.escape(prefillItem)}"]`);
    if (row) {
      const chk = row.querySelector('.chk-row-input');
      chk.checked = true;
      onToggleEppItem(chk);
    } else {
      document.getElementById('input-epp-otro').value = prefillItem;
      document.getElementById('grupo-epp-otro-qty').classList.remove('hidden');
    }
  }
  openPanel('panel-form-epp');
  setTimeout(() => initFirmaPad('firma-canvas'), 80);
}
// canvasId: distintos paneles con firma (EPP, relator de charla, asistente de
// charla) tienen su propio <canvas> — solo uno está visible a la vez, así que
// basta con recordar cuál es el activo en firmaCanvasId.
let firmaCanvasId = 'firma-canvas';
// Nota: start/move/end usan `ctx`/`activa` locales a cada canvas (no las
// globales firmaCtx/firmaActiva) para que varios pads de firma puedan
// coexistir a la vez en un mismo panel (ej. las 3 firmas de jefatura del
// HCR) sin pisarse el contexto de dibujo entre sí.
function initFirmaPad(canvasId) {
  const id = canvasId || 'firma-canvas';
  firmaCanvasId = id;
  const canvas = document.getElementById(id);
  if (!canvas) return;
  // El canvas puede llegar acá todavía sin layout (ej. justo después de
  // reemplazar el HTML del panel, con varias firmas inicializándose casi
  // en paralelo) — con ancho 0 quedaría un canvas inválido (getImageData
  // revienta al firmar). Si pasa, se reintenta en el próximo frame en vez
  // de dejarlo así.
  if (canvas.clientWidth === 0) { requestAnimationFrame(() => initFirmaPad(id)); return; }
  canvas.width = canvas.clientWidth; canvas.height = 180;
  const ctx = canvas.getContext('2d');
  firmaCtx = ctx;
  // Azul tinta de lápiz Bic — se pidió explícitamente que TODAS las firmas
  // de la app (Charla, Investigación, HCR, EPP) se vean con este color,
  // no negro/gris. Como initFirmaPad es el único lugar que inicializa
  // cualquier canvas de firma, cambiar acá alcanza para todas. Trazo un
  // poco más grueso que antes (2.2 → 3), también a pedido explícito.
  ctx.strokeStyle = '#1a2f6b'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  let activa = false;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  };
  const start = (e) => { e.preventDefault(); activa = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e) => { if (!activa) return; e.preventDefault(); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  const end = () => { activa = false; };
  canvas.onmousedown = start; canvas.onmousemove = move; canvas.onmouseup = end; canvas.onmouseleave = end;
  canvas.ontouchstart = start; canvas.ontouchmove = move; canvas.ontouchend = end;
}
function limpiarFirmaId(canvasId) {
  const canvas = document.getElementById(canvasId);
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}
function limpiarFirma() { limpiarFirmaId(firmaCanvasId); }
function firmaEstaVacia(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || canvas.width === 0 || canvas.height === 0) return true;
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) return false;
  return true;
}
// El canvas de firma es grande (para poder firmar cómodo con el dedo),
// pero el trazo real ocupa solo una parte chica de ese espacio — al
// insertarla en el PDF, pdf-lib escala la imagen COMPLETA (con todo el
// margen vacío alrededor) al tamaño del casillero, así que la firma se
// veía diminuta aunque el casillero fuera chico. Esto recorta el canvas al
// rectángulo real donde hay trazo (con un margen chico alrededor), para
// que al escalar al mismo casillero de siempre la firma se vea bastante
// más grande y notoria — sin agrandar el casillero ni arriesgar que se
// meta encima de las etiquetas vecinas.
function recortarFirma(canvas) {
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return canvas; // canvas vacío, nada que recortar
  const pad = 6;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad);
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const recortado = document.createElement('canvas');
  recortado.width = w; recortado.height = h;
  recortado.getContext('2d').drawImage(canvas, minX, minY, w, h, 0, 0, w, h);
  return recortado;
}
function firmaCanvasADataURL(canvasId) {
  return recortarFirma(document.getElementById(canvasId)).toDataURL('image/png');
}
// El archivo de la firma de EPP se sube solo (no va dentro de un PDF con
// más contexto alrededor, a diferencia de las firmas de Charla/HCR/
// Investigación) — así que se le agrega nombre, RUT, fecha y hora debajo
// del trazo, para que el archivo sea auto-explicativo y quede más
// robusto como respaldo si se abre suelto, sin tener que cruzarlo con el
// Sheet para saber cuándo y de quién es.
function firmaConIdentificacion(canvasOriginal, nombre, rut, fecha, hora) {
  const franjaTexto = 40;
  const c = document.createElement('canvas');
  c.width = canvasOriginal.width;
  c.height = canvasOriginal.height + franjaTexto;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(canvasOriginal, 0, 0);
  ctx.fillStyle = '#000';
  ctx.font = '13px Arial, sans-serif';
  ctx.fillText(`${nombre}${rut ? ' — RUT ' + rut : ''}`, 8, canvasOriginal.height + 18);
  const fechaHora = [fecha ? ddmmyyyy(fecha) : '', hora].filter(Boolean).join(' — ');
  if (fechaHora) {
    ctx.font = '11px Arial, sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText(fechaHora, 8, canvasOriginal.height + 34);
  }
  return c;
}
async function guardarEpp(ev) {
  ev.preventDefault();
  const f = ev.target;
  const canvas = document.getElementById('firma-canvas');
  try {
    if (!f.trabajador.value) { toast('Selecciona un trabajador', 'error'); return; }
    const itemsEpp = recolectarItemsEpp();
    if (itemsEpp.length === 0) { toast('Marca al menos un ítem a entregar', 'error'); return; }

    const trabNombre = f.trabajador.value.split('|')[0];
    const trabRut = f.trabajador.value.split('|')[1] || '';
    const trab = allTrabajadores.find(t => t.nombre === trabNombre);
    const ahora = new Date();
    const fechaRegistro = ahora.toLocaleString('es-CL');
    const horaRegistro = ahora.toTimeString().slice(0, 5);
    const responsable = userEmail || f.responsable.value;

    const canvasFirma = firmaConIdentificacion(recortarFirma(canvas), trabNombre, trabRut, f.fecha.value, horaRegistro);
    const blob = await new Promise(res => canvasFirma.toBlob(res, 'image/png'));
    let firmaLink = '';
    if (blob) {
      const up = await uploadFileTrabajador(blob, trabNombre, 'firma', 'png');
      firmaLink = up.link;
    }

    // Además de la firma suelta (de siempre), se genera el documento
    // "Entrega de EPP" completo (formato del cliente) con el detalle de
    // esta entrega y se guarda en la carpeta del trabajador — si algo
    // falla generándolo, la entrega igual se guarda (no bloquea el
    // registro por un problema al armar el PDF).
    let documentoLink = '';
    try {
      const pdfBlob = await generarPdfEntregaEpp({
        obra: trab ? trab.obra : '', trabajador: trabNombre, rut: trabRut, cargo: trab ? trab.cargo : '',
        fecha: f.fecha.value, items: itemsEpp, firmaDataUrl: firmaCanvasADataURL('firma-canvas'),
        responsable, fechaHoraRegistro: fechaRegistro,
      });
      const upDoc = await uploadFileTrabajador(pdfBlob, trabNombre, 'entrega_epp', 'pdf');
      documentoLink = upDoc.link;
    } catch (e) { console.error('No se pudo generar el documento de Entrega de EPP:', e); }

    // Todos los ítems de una misma entrega van en UNA sola fila (columna
    // "EPP Entregado" combinada, ej. "Casco (1); Guantes (2)"), igual que
    // "Asistentes" en Charlas — antes cada ítem generaba su propia fila
    // (misma fecha/trabajador/firma repetidos), y una sola entrega se veía
    // como varias entregas duplicadas.
    const itemsTexto = itemsEpp.map(it => `${it.item} (${it.cantidad})`).join('; ');
    await appendSheet(`'${CONFIG.SHEET_EPP}'!A:J`, [[
      allEpp.length + 1, f.fecha.value, trabNombre, trabRut, itemsTexto, '',
      firmaLink, responsable, fechaRegistro, documentoLink
    ]]);
    toast(`Entrega registrada ✓ (${itemsEpp.length} ítem${itemsEpp.length>1?'s':''})`, 'ok');
    closePanel('panel-form-epp');
    cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// Genera el documento "Entrega de Elementos de Protección Personal", desde
// cero con pdf-lib, calcado del formato real del cliente (mismo
// encabezado OBRA/NOMBRE/RUT/CARGO/FECHA, mismo párrafo de compromiso, y
// tabla ITEM/DETALLE/CANTIDAD/FIRMA RECIBIDO). A diferencia del formato
// original (que trae los ~19 ítems del catálogo completo, con blancos
// para lo no entregado), acá la tabla lista SOLO lo que efectivamente se
// entregó en `datos.items` — a pedido explícito del cliente, para no
// alargar el documento con filas vacías. La firma (una sola, capturada
// una vez por entrega) se dibuja repetida en la columna "FIRMA RECIBIDO"
// de cada fila entregada, tal como se ve en el formato original.
async function generarPdfEntregaEpp(datos) {
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const negro = rgb(0.1, 0.1, 0.1), gris = rgb(0.4, 0.4, 0.4), grisClaro = rgb(0.92, 0.92, 0.92), borde = rgb(0.55, 0.55, 0.55);
  const W = 595, xIni = 50, xFin = 545, anchoTabla = xFin - xIni;
  let y = 842 - 50;

  function wrapLines(str, maxWidth, size) {
    const palabras = (str || '').split(' ');
    const lines = []; let current = '';
    palabras.forEach(p => {
      const prueba = current ? current + ' ' + p : p;
      if (font.widthOfTextAtSize(prueba, size) > maxWidth) { if (current) lines.push(current); current = p; }
      else current = prueba;
    });
    if (current) lines.push(current);
    return lines;
  }
  const centrado = (texto, yy, size, f, color) => {
    const w = f.widthOfTextAtSize(texto, size);
    page.drawText(texto, { x: (W - w) / 2, y: yy, size, font: f, color: color || negro });
  };

  centrado('ENTREGA DE ELEMENTOS DE PROTECCIÓN PERSONAL', y, 14, fontBold, negro);
  y -= 30;

  [
    ['OBRA', datos.obra || '—'],
    ['NOMBRE DEL TRABAJADOR', datos.trabajador || '—'],
    ['RUT', datos.rut || '—'],
    ['CARGO', datos.cargo || '—'],
    ['FECHA', datos.fecha ? ddmmyyyy(datos.fecha) : '—'],
  ].forEach(([label, valor]) => {
    y = dibujarFilaTabla(page, xIni, y, [
      { w: 160, text: label, bold: true, size: 9 },
      { w: anchoTabla - 160, text: valor, size: 9 },
    ], font, fontBold, 18, null, negro, borde);
  });

  y -= 10;
  const parrafo = 'El trabajador se compromete a utilizar adecuadamente durante la jornada laboral los equipos y elementos de protección personal recibidos por parte de la empresa, LUIS ANDRES SAEZ THIELEMANN, dando cumplimiento a las normas de salud ocupacional que contribuyen a su bien estar físico, psicológico y social. Además, el trabajador se compromete a mantener los elementos de Protección personal en buen estado, almacenándolos en los casilleros asignados especialmente para esta función y declara haberlos recibido en forma gratuita. A su vez declara que ha recibido información sobre el uso adecuado de los mismos.';
  wrapLines(parrafo, anchoTabla, 9).forEach(linea => { page.drawText(linea, { x: xIni, y, size: 9, font, color: negro }); y -= 12; });

  y -= 8;
  page.drawRectangle({ x: xIni, y: y - 18, width: anchoTabla, height: 18, color: grisClaro, borderColor: borde, borderWidth: 0.6 });
  centrado('ELEMENTOS DE PROTECCIÓN PERSONAL ENTREGADOS', y - 13, 9.5, fontBold, negro);
  y -= 18;

  const colItem = 28, colDetalle = 258, colCantidad = 60, colFirma = anchoTabla - colItem - colDetalle - colCantidad;
  y = dibujarFilaTabla(page, xIni, y, [
    { w: colItem, text: 'ITEM', bold: true, align: 'center', size: 8.5 },
    { w: colDetalle, text: 'DETALLE DE ELEMENTOS ENTREGADOS', bold: true, size: 8.5 },
    { w: colCantidad, text: 'CANTIDAD', bold: true, align: 'center', size: 8.5 },
    { w: colFirma, text: 'FIRMA RECIBIDO', bold: true, align: 'center', size: 8.5 },
  ], font, fontBold, 18, grisClaro, negro, borde);

  let firmaImg = null;
  if (datos.firmaDataUrl) {
    const bytes = Uint8Array.from(atob(datos.firmaDataUrl.split(',')[1]), c => c.charCodeAt(0));
    firmaImg = await pdfDoc.embedPng(bytes);
  }

  (datos.items || []).forEach((it, idx) => {
    const detalleLineas = wrapLines(it.item, colDetalle - 8, 8.5);
    const rowH = Math.max(20, detalleLineas.length * 10 + 10);
    const filaY = y;
    y = dibujarFilaTabla(page, xIni, y, [
      { w: colItem, text: String(idx + 1), align: 'center', size: 8.5 },
      { w: colDetalle, text: '', size: 8.5 },
      { w: colCantidad, text: String(it.cantidad), align: 'center', size: 8.5 },
      { w: colFirma, text: '', align: 'center', size: 8.5 },
    ], font, fontBold, rowH, null, negro, borde);
    let ty = filaY - (rowH - detalleLineas.length * 10) / 2 - 8;
    detalleLineas.forEach(linea => { page.drawText(linea, { x: xIni + colItem + 4, y: ty, size: 8.5, font, color: negro }); ty -= 10; });
    if (firmaImg) {
      const dims = escalarFirmaCasillero(firmaImg, colFirma - 14, rowH - 6);
      const xFirma = xIni + colItem + colDetalle + colCantidad + (colFirma - dims.width) / 2;
      page.drawImage(firmaImg, { x: xFirma, y: filaY - rowH + (rowH - dims.height) / 2, width: dims.width, height: dims.height });
    }
  });

  y -= 24;
  page.drawLine({ start: { x: xIni, y }, end: { x: xFin, y }, thickness: 0.8, color: gris });
  y -= 14;
  page.drawText(`Documento generado el ${datos.fechaHoraRegistro || ''} — registrado por ${datos.responsable || '—'}.`, { x: xIni, y, size: 8, font, color: gris });

  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

// ============================================================
// MÓDULO: PROGRAMA PERSONALIZADO (cumplimiento mensual por supervisor)
// ============================================================
// Carga manual mes a mes (no se calcula solo, a pedido explícito): cada
// actividad del programa de un supervisor es una fila en
// PROGRAMA_PERSONALIZADO, y "Dias Marcados" guarda los días del mes en que
// se cumplió. El % de cada actividad sale de comparar los días marcados
// contra los que le tocaban según su frecuencia (ver ocurrenciasEsperadas);
// el % del supervisor es el promedio de sus actividades, y el % total del
// programa el promedio entre supervisores — mismo criterio que el informe
// en Excel que se está digitalizando acá.
function mesActualISO() { return new Date().toISOString().slice(0,7); }
function diasEnMes(mesISO) {
  const [a, m] = mesISO.split('-').map(Number);
  return new Date(a, m, 0).getDate();
}
const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
function nombreMes(mesISO) {
  const [a, m] = mesISO.split('-').map(Number);
  return `${NOMBRES_MES[m-1]} ${a}`;
}
// Día de la semana de un día del mes, 0=Lunes...6=Domingo (Date.getDay()
// da 0=Domingo, se corrige para que la semana empiece el lunes como en
// cualquier calendario chileno).
function diaDeLaSemana(mesISO, dia) {
  const [a, m] = mesISO.split('-').map(Number);
  return (new Date(a, m - 1, dia).getDay() + 6) % 7;
}
function esFinDeSemana(mesISO, dia) {
  const dow = diaDeLaSemana(mesISO, dia);
  return dow === 5 || dow === 6;
}
// Feriados legales de Chile — igual que el fin de semana, un supervisor no
// puede "perder" cumplimiento de una actividad Diaria por un día en que la
// obra no opera por feriado. Lista de 2026 verificada cruzando varias
// fuentes chilenas de feriados (calendarr.com, feriadolegal.cl,
// assistcard.com, entre otras) — el acceso directo a la fuente oficial
// (interior.gob.cl) no está disponible desde este entorno. Son los 16
// feriados nacionales fijos del año; quedan afuera los feriados SOLO
// regionales (ej. 20 de agosto en Chillán) y cualquier feriado especial
// que se decrete después (ej. plebiscitos), que no se pueden anticipar acá.
// Hay que sumar los años siguientes a mano cuando se conozcan — algunos
// (29 de junio, 12 de octubre) se trasladan al lunes más cercano por ley y
// no son 100% predecibles de un año a otro sin la fuente oficial.
const FERIADOS_CHILE = new Set([
  // 2026
  '2026-01-01', // Año Nuevo
  '2026-04-03', // Viernes Santo
  '2026-04-04', // Sábado Santo
  '2026-05-01', // Día del Trabajo
  '2026-05-21', // Día de las Glorias Navales
  '2026-06-21', // Día Nacional de los Pueblos Indígenas
  '2026-06-29', // San Pedro y San Pablo
  '2026-07-16', // Virgen del Carmen
  '2026-08-15', // Asunción de la Virgen
  '2026-09-18', // Independencia Nacional
  '2026-09-19', // Día de las Glorias del Ejército
  '2026-10-12', // Encuentro de Dos Mundos
  '2026-10-31', // Día de las Iglesias Evangélicas y Protestantes
  '2026-11-01', // Día de Todos los Santos
  '2026-12-08', // Inmaculada Concepción
  '2026-12-25', // Navidad
]);
function esFeriado(mesISO, dia) {
  return FERIADOS_CHILE.has(`${mesISO}-${String(dia).padStart(2, '0')}`);
}
// Fin de semana O feriado — el criterio combinado que se usa en todos
// lados donde antes solo se miraba el fin de semana (sombreado de
// calendario, cálculo de días hábiles esperados).
function esDiaNoHabil(mesISO, dia) {
  return esFinDeSemana(mesISO, dia) || esFeriado(mesISO, dia);
}
const DIAS_SEMANA_CORTO = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DIAS_SEMANA_LETRA = ['L','M','X','J','V','S','D'];
// Días hábiles del mes (lunes a viernes, sin feriados) — una actividad
// "Diaria" no puede exigir días en que la obra no opera, así que la meta
// de cumplimiento se mide contra los días hábiles, no contra el mes entero.
function diasHabilesDelMes(mesISO) {
  const total = diasEnMes(mesISO);
  let n = 0;
  for (let d = 1; d <= total; d++) if (!esDiaNoHabil(mesISO, d)) n++;
  return n;
}
function ocurrenciasEsperadas(frecuencia, mesISO) {
  const dias = diasEnMes(mesISO);
  if (frecuencia === 'Semanal') return Math.ceil(dias / 7);
  if (frecuencia === 'Quincenal') return 2;
  if (frecuencia === 'Mensual') return 1;
  return diasHabilesDelMes(mesISO); // Diaria: solo días hábiles
}
function cumplimientoActividad(act) {
  const esperadas = ocurrenciasEsperadas(act.frecuencia, act.mes);
  if (esperadas <= 0) return 0;
  return Math.min(100, Math.round((act.diasMarcados.length / esperadas) * 100));
}
function resultadoPrograma(pct) {
  if (pct >= 81) return { label: 'Excelente', color: 'green' };
  if (pct >= 61) return { label: 'Bueno', color: 'blue' };
  if (pct >= 41) return { label: 'Regular', color: 'amber' };
  if (pct >= 21) return { label: 'Malo', color: 'amber' };
  return { label: 'Muy Malo', color: 'red' };
}
function actividadesPrograma(obra, mes) {
  return allProgramaPersonalizado.filter(a => a.obra === obra && a.mes === mes);
}
// Agrupa las actividades de una Obra/Mes por supervisor, con su % de
// cumplimiento (promedio de sus actividades) y las métricas de EPP/personal
// nuevo del período (ver eppEntregadoSupervisorMes / personalNuevoSupervisorMes).
function agruparProgramaPorSupervisor(obra, mes) {
  const acts = actividadesPrograma(obra, mes);
  const porSupervisor = {};
  const orden = [];
  acts.forEach(a => {
    if (!porSupervisor[a.supervisor]) { porSupervisor[a.supervisor] = { supervisor: a.supervisor, cargo: a.cargo, actividades: [] }; orden.push(a.supervisor); }
    porSupervisor[a.supervisor].actividades.push(a);
  });
  return orden.map(nombre => {
    const g = porSupervisor[nombre];
    const pcts = g.actividades.map(cumplimientoActividad);
    g.pct = pcts.length ? Math.round(pcts.reduce((s,v)=>s+v,0) / pcts.length) : 0;
    g.resultado = resultadoPrograma(g.pct);
    const trabSup = allTrabajadores.find(t => t.nombre === nombre && t.obra === obra);
    g.epp = trabSup ? eppEntregadoSupervisorMes(trabSup, mes) : 0;
    g.nuevos = trabSup ? personalNuevoSupervisorMes(trabSup, mes) : 0;
    return g;
  });
}
function pctTotalPrograma(grupos) {
  if (!grupos.length) return 0;
  return Math.round(grupos.reduce((s,g)=>s+g.pct,0) / grupos.length);
}

// ── Métricas de EPP y personal nuevo por supervisor ("a cargo" = mismos
// trabajadores activos de su Obra, ver trabajadoresACargoDe) ──────────────
function eppEntregadoSupervisorMes(supervisor, mes) {
  const nombresACargo = new Set(trabajadoresACargoDe(supervisor).map(t => t.nombre));
  return allEpp.filter(e => nombresACargo.has(e.trabajador) && (e.fecha||'').slice(0,7) === mes).length;
}
function personalNuevoSupervisorMes(supervisor, mes) {
  return trabajadoresACargoDe(supervisor).filter(t => (t.fechaIngreso||'').slice(0,7) === mes).length;
}
// Totales reales de la Obra (sin duplicar): como "a cargo" de un supervisor
// hoy es todo el resto de la obra (no hay asignación 1 a 1 por supervisor,
// ver trabajadoresACargoDe), sumar el EPP/personal nuevo de cada supervisor
// cuenta la misma entrega varias veces si hay más de un supervisor en la
// obra. Estas dos funciones dan el total real de la obra, una sola vez.
function eppEntregadoObraMes(obra, mes) {
  const nombresObra = new Set(allTrabajadores.filter(t => t.obra === obra).map(t => t.nombre));
  return allEpp.filter(e => nombresObra.has(e.trabajador) && (e.fecha||'').slice(0,7) === mes).length;
}
function personalNuevoObraMes(obra, mes) {
  return allTrabajadores.filter(t => t.obra === obra && (t.fechaIngreso||'').slice(0,7) === mes).length;
}
// Desglose por tipo de EPP entregado en la obra durante el mes (para el
// informe) — reutiliza itemsDeFilaEpp, que ya separa la celda combinada
// "Casco (1); Guantes (2)" de cada entrega en ítems individuales.
function itemsEppObraMes(obra, mes) {
  const nombresObra = new Set(allTrabajadores.filter(t => t.obra === obra).map(t => t.nombre));
  const entregas = allEpp.filter(e => nombresObra.has(e.trabajador) && (e.fecha||'').slice(0,7) === mes);
  const conteo = {};
  entregas.forEach(e => itemsDeFilaEpp(e).forEach(it => {
    const cant = parseInt(it.cantidad, 10) || 1;
    conteo[it.item] = (conteo[it.item] || 0) + cant;
  }));
  const totalItems = Object.values(conteo).reduce((s, v) => s + v, 0);
  return { entregas: entregas.length, items: conteo, totalItems };
}

// ── Render del módulo ──────────────────────────────────────────────────
let mesProgramaSel = mesActualISO();
let obraProgramaSel = 'todas';
// Nombre de quien genera el informe (para la portada del PDF, "Realizado
// por") — se recuerda en localStorage para no tener que volver a escribirlo
// cada vez que se genera un informe nuevo.
const RESPONSABLE_INFORME_KEY = 'programaResponsableInforme';
function onCambioResponsableInforme(v) { localStorage.setItem(RESPONSABLE_INFORME_KEY, v.trim()); }
function onCambioMesPrograma(v) { mesProgramaSel = v; renderProgramaPersonalizado(); }
function onCambioObraPrograma(v) { obraProgramaSel = v; renderProgramaPersonalizado(); }
function renderProgramaPersonalizado() {
  // Un supervisor logueado no ve el listado del resto de supervisores de la
  // obra ni el botón de informe (es un reporte de gestión de toda la obra,
  // no "lo que le compete a él") — va directo a su propio detalle, con el
  // mismo contenido que ve un admin al entrar a la ficha de un supervisor.
  if (miSupervisorPerfil) {
    setListHTML('programapersonalizado', `
      <div class="stats-obra-bar">${ic('programapersonalizado',16)}
        <input type="month" class="obra-selector" value="${mesProgramaSel}" onchange="onCambioMesPrograma(this.value)">
      </div>
      ${contenidoDetalleProgramaSupervisor(miSupervisorPerfil.obra, mesProgramaSel, miSupervisorPerfil.nombre)}
    `);
    return;
  }
  const obraGlobal = obraFiltroActivo();
  const obras = opcionesObrasDisponibles();
  const obraEfectiva = obraGlobal || (obraProgramaSel !== 'todas' && obras.includes(obraProgramaSel) ? obraProgramaSel : null);

  const selectorObraHtml = obraGlobal ? '' : `
    <div class="stats-obra-bar">${ic('obra',16)}
      <select class="obra-selector" onchange="onCambioObraPrograma(this.value)">
        <option value="todas">Elige una obra...</option>
        ${obras.map(o => `<option value="${esc(o)}" ${o===obraProgramaSel?'selected':''}>${esc(o)}</option>`).join('')}
      </select>
    </div>`;
  const selectorMesHtml = `
    <div class="stats-obra-bar">${ic('programapersonalizado',16)}
      <input type="month" class="obra-selector" value="${mesProgramaSel}" onchange="onCambioMesPrograma(this.value)">
    </div>`;

  if (!obraEfectiva) {
    setListHTML('programapersonalizado', selectorObraHtml + selectorMesHtml + emptyState('Elige una obra', 'Selecciona una obra arriba para ver su Programa Personalizado'));
    return;
  }

  const grupos = agruparProgramaPorSupervisor(obraEfectiva, mesProgramaSel);
  if (grupos.length === 0) {
    setListHTML('programapersonalizado', selectorObraHtml + selectorMesHtml + emptyState('Sin actividades cargadas', `Agrega las actividades del programa de ${nombreMes(mesProgramaSel)} con el botón +`));
    return;
  }
  const total = pctTotalPrograma(grupos);
  const resultadoTotal = resultadoPrograma(total);
  const eppObra = eppEntregadoObraMes(obraEfectiva, mesProgramaSel);
  const nuevosObra = personalNuevoObraMes(obraEfectiva, mesProgramaSel);
  const responsableGuardado = localStorage.getItem(RESPONSABLE_INFORME_KEY) || '';
  setListHTML('programapersonalizado', `
    ${selectorObraHtml}${selectorMesHtml}
    <div class="card card--default">
      <div class="card-icon modulo-icon--mov">${ic('programapersonalizado',18)}</div>
      <div class="card-body">
        <div class="card-title">Cumplimiento total — ${esc(nombreMes(mesProgramaSel))}</div>
        <div class="card-sub">${grupos.length} supervisor(es) con programa cargado</div>
        <div class="badge-row">
          <span class="badge ${resultadoTotal.color}">${total}% · ${resultadoTotal.label}</span>
          <span class="badge blue">${ic('epp',11)} ${eppObra} EPP entregado(s) en la obra</span>
          <span class="badge gray">${ic('trabajadores',11)} ${nuevosObra} ingreso(s) nuevo(s)</span>
        </div>
      </div>
    </div>
    <div class="form-group" style="margin-top:14px;">
      <label>Responsable del informe (aparece en la portada del PDF)</label>
      <input id="input-responsable-informe" value="${esc(responsableGuardado)}" placeholder="Nombre de quien realiza el informe" oninput="onCambioResponsableInforme(this.value)">
    </div>
    <button class="action-btn" onclick="generarInformeProgramaPersonalizado('${esc(obraEfectiva)}','${mesProgramaSel}', document.getElementById('input-responsable-informe').value)">${ic('documento',14)} Generar informe PDF</button>
    <div class="sec-label" style="margin-top:14px;">Por supervisor</div>
    ${grupos.map(g => `
    <div class="card card--default" onclick="abrirDetalleProgramaSupervisor('${esc(obraEfectiva)}','${mesProgramaSel}','${esc(g.supervisor).replace(/'/g,"\\'")}')">
      <div class="card-icon modulo-icon--mov">${ic('trabajadores',18)}</div>
      <div class="card-body">
        <div class="card-title">${esc(g.supervisor)}</div>
        <div class="card-sub">${esc(g.cargo)} · ${g.actividades.length} actividad(es)</div>
        <div class="badge-row">
          <span class="badge ${g.resultado.color}">${g.pct}% · ${g.resultado.label}</span>
          <span class="badge blue">${ic('epp',11)} ${g.epp} EPP</span>
          <span class="badge gray">${ic('trabajadores',11)} ${g.nuevos} nuevo(s)</span>
        </div>
      </div>
      <div class="card-arrow">›</div>
    </div>`).join('')}
  `);
}

// ── Detalle por supervisor ──────────────────────────────────────────────
let programaDetalleCtx = null; // { obra, mes, supervisor }
function abrirDetalleProgramaSupervisor(obra, mes, supervisor) {
  programaDetalleCtx = { obra, mes, supervisor };
  document.getElementById('pnl-title-detalle-programa').textContent = supervisor;
  renderDetalleProgramaSupervisor();
  openPanel('panel-detalle-programa');
}
function contenidoDetalleProgramaSupervisor(obra, mes, supervisor) {
  const acts = actividadesPrograma(obra, mes).filter(a => a.supervisor === supervisor);
  const trabSup = allTrabajadores.find(t => t.nombre === supervisor && t.obra === obra);
  const epp = trabSup ? eppEntregadoSupervisorMes(trabSup, mes) : 0;
  const nuevos = trabSup ? personalNuevoSupervisorMes(trabSup, mes) : 0;
  return `
    <div class="badge-row" style="margin-bottom:12px;">
      <span class="badge blue">${ic('epp',11)} ${epp} EPP entregado(s) en ${esc(nombreMes(mes))}</span>
      <span class="badge gray">${ic('trabajadores',11)} ${nuevos} ingreso(s) nuevo(s)</span>
    </div>
    <button class="action-btn" onclick="abrirFormActividadPrograma('${esc(obra)}','${esc(mes)}','${esc(supervisor).replace(/'/g,"\\'")}')">+ Agregar actividad</button>
    <div class="sec-label" style="margin-top:14px;">Actividades</div>
    ${acts.length === 0 ? emptyState('Sin actividades', 'Agrega la primera actividad del programa') : acts.map(a => {
      const pct = cumplimientoActividad(a);
      const r = resultadoPrograma(pct);
      return `
      <div class="card card--default" onclick="abrirMarcarDias(${a.fila})">
        <div class="card-icon modulo-icon--mov">${ic('programapersonalizado',18)}</div>
        <div class="card-body">
          <div class="card-title">${esc(a.actividad)}</div>
          <div class="card-sub">${esc(a.frecuencia)} · ${a.diasMarcados.length}/${ocurrenciasEsperadas(a.frecuencia, a.mes)} días marcados</div>
          <div class="badge-row"><span class="badge ${r.color}">${pct}%</span></div>
        </div>
        <div class="card-arrow">›</div>
      </div>`;
    }).join('')}
  `;
}
function renderDetalleProgramaSupervisor() {
  const { obra, mes, supervisor } = programaDetalleCtx;
  document.getElementById('detalle-programa-body').innerHTML = contenidoDetalleProgramaSupervisor(obra, mes, supervisor);
}

// ── Agregar actividad ────────────────────────────────────────────────
function abrirFormActividadPrograma(obra, mes, supervisor) {
  const f = document.getElementById('form-actividad-programa');
  f.reset();
  // La lista de sugerencias son los nombres exactos del catálogo
  // PROGRAMAS_PERSONALIZADOS (para que formatoDeActividad los reconozca y
  // active, si corresponde, el llenado digital al marcar días) más
  // "Reunión de coordinación", que no tiene documento asociado y sigue
  // siendo 100% manual.
  document.getElementById('lista-actividades-programa').innerHTML =
    PROGRAMAS_PERSONALIZADOS.map(p => `<option value="${esc(p.nombre)}"></option>`).join('') +
    '<option value="Reunión de coordinación"></option>';
  const obraDefault = obra || (programaDetalleCtx && programaDetalleCtx.obra) || obraFiltroActivo() || (obraProgramaSel !== 'todas' ? obraProgramaSel : '');
  const mesDefault = mes || (programaDetalleCtx && programaDetalleCtx.mes) || mesProgramaSel;
  f.obra.innerHTML = opcionesObraSelectHTML(obraDefault);
  f.obra.disabled = !!miSupervisorPerfil;
  f.mes.value = mesDefault;
  onCambioObraProgramaForm(f.obra);
  // Un supervisor logueado solo carga actividades para sí mismo — el
  // selector de supervisor queda fijo y bloqueado, no puede elegir a otro.
  const supervisorFijo = miSupervisorPerfil ? miSupervisorPerfil.nombre : supervisor;
  if (supervisorFijo) setTimeout(() => { f.supervisor.value = supervisorFijo; onCambioSupervisorPrograma(f.supervisor); }, 0);
  f.supervisor.disabled = !!miSupervisorPerfil;
  openPanel('panel-form-actividad-programa');
}
function onCambioObraProgramaForm(selEl) {
  onCambioObraSelect(selEl, 'input-actividad-obra-otra');
  const f = selEl.form;
  const obra = valorObra(selEl, 'input-actividad-obra-otra');
  const sups = allTrabajadores.filter(t => t.esSupervisor && t.obra === obra && t.estado === 'Activo');
  f.supervisor.innerHTML = '<option value="">— Selecciona un supervisor —</option>' +
    sups.map(s => `<option value="${esc(s.nombre)}">${esc(s.nombre)}</option>`).join('');
  f.cargo.value = '';
}
function onCambioSupervisorPrograma(selEl) {
  const f = selEl.form;
  const obra = valorObra(f.obra, 'input-actividad-obra-otra');
  const t = allTrabajadores.find(x => x.nombre === selEl.value && x.obra === obra);
  f.cargo.value = t ? t.cargo : '';
}
async function guardarActividadPrograma(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    const obra = valorObra(f.obra, 'input-actividad-obra-otra');
    if (!obra) { toast('Selecciona la obra', 'error'); return; }
    if (!f.supervisor.value) { toast('Selecciona el supervisor', 'error'); return; }
    const actividad = f.actividad.value.trim();
    if (!actividad) { toast('Escribe la actividad', 'error'); return; }
    await appendSheet(`'${CONFIG.SHEET_PROGRAMA_PERSONALIZADO}'!A:L`, [[
      allProgramaPersonalizado.length + 1, obra, f.mes.value, f.supervisor.value, f.cargo.value,
      actividad, f.frecuencia.value, '', new Date().toLocaleString('es-CL'), userEmail || '', '', ''
    ]]);
    toast('Actividad agregada ✓', 'ok');
    closePanel('panel-form-actividad-programa');
    obraProgramaSel = obra; mesProgramaSel = f.mes.value;
    await cargarTodo(true);
    if (programaDetalleCtx) renderDetalleProgramaSupervisor();
  } catch (e) { toast(e.message, 'error'); }
}

// ── Marcar días cumplidos de una actividad ──────────────────────────────
// Cruce automático con otros módulos que SÍ registran una fecha real de
// ejecución (Charlas, HCR, Inspecciones) — solo una sugerencia (ver
// abrirMarcarDias): si el nombre de la actividad menciona alguna de esas
// palabras clave, se buscan registros reales de ese supervisor en esa obra
// durante el mes, y esos días quedan pre-marcados (pero se pueden
// desmarcar). Actividades sin módulo equivalente (ej. "Reunión de
// coordinación") no tienen de dónde sacarse solas y siguen siendo 100%
// manuales.
function diasConEvidenciaActividad(a) {
  const texto = sinTildes(a.actividad.toLowerCase());
  const enMes = (fecha) => !!fecha && fecha.slice(0,7) === a.mes;
  const dias = new Set();
  if (texto.includes('charla')) {
    allCharlas.filter(c => c.obra === a.obra && c.relator === a.supervisor && enMes(c.fechaRealizada))
      .forEach(c => dias.add(parseInt(c.fechaRealizada.slice(8,10), 10)));
  }
  if (texto.includes('hcr')) {
    allHcr.filter(h => h.obra === a.obra && h.supervisor === a.supervisor && enMes(h.fecha))
      .forEach(h => dias.add(parseInt(h.fecha.slice(8,10), 10)));
  }
  if (texto.includes('inspec')) {
    allInspecciones.filter(i => i.obra === a.obra && i.inspector === a.supervisor && enMes(i.fecha))
      .forEach(i => dias.add(parseInt(i.fecha.slice(8,10), 10)));
  }
  return dias;
}
function fechaDia(mesISO, dia) { return `${mesISO}-${String(dia).padStart(2, '0')}`; }
let marcarDiasFila = null;
function abrirMarcarDias(fila) {
  const a = allProgramaPersonalizado.find(x => x.fila === fila);
  if (!a) return;
  // Si la actividad calza con uno de los formatos de PROGRAMAS_PERSONALIZADOS
  // Y ese formato ya tiene motor de llenado digital (CHECKLIST_GENERICO_CONFIG,
  // por ahora), el día deja de ser un simple checkbox: hay que llenar el
  // documento real (abrirLlenarFormatoPrograma) para que quede marcado. El
  // cumplimiento del informe pasa a reflejar documentos reales, no un tilde
  // manual sin respaldo.
  const formato = formatoDeActividad(a.actividad);
  // SGSST-PER-002 no encaja en "un PDF por día" — es una grilla mensual
  // acumulada (23 ítems × N días en un solo documento), así que tiene su
  // propio panel en vez de la cuadrícula de días.
  if (formato && formato.tipo === 'checklist_mensual') { abrirChecklistMensual(fila); return; }
  marcarDiasFila = fila;
  document.getElementById('pnl-title-marcar-dias').textContent = a.actividad;
  document.getElementById('marcar-dias-info').textContent = `${a.supervisor} · ${a.frecuencia} · ${nombreMes(a.mes)}`;
  const dias = diasEnMes(a.mes);
  const marcadosGuardados = new Set(a.diasMarcados);
  const diasEvidencia = diasConEvidenciaActividad(a);
  document.getElementById('marcar-dias-aviso').classList.toggle('hidden', diasEvidencia.size === 0);
  const motor = motorDigitalDe(formato);
  // Calendario real del mes: encabezado Lun-Dom y celdas vacías antes del
  // día 1 para que cada día caiga en su columna real — así se ve de un
  // vistazo qué días son fin de semana (no se trabaja) sin tener que
  // contar manualmente desde el 1.
  const offset = diaDeLaSemana(a.mes, 1);
  const headerHtml = DIAS_SEMANA_CORTO.map(n => `<div class="marcar-dia-header">${n}</div>`).join('');
  const vaciosHtml = Array.from({length: offset}, () => '<div class="marcar-dia marcar-dia--vacio"></div>').join('');
  let diasHtml;
  if (motor) {
    diasHtml = Array.from({length: dias}, (_, i) => i+1).map(d => {
      const finde = esDiaNoHabil(a.mes, d);
      const link = a.registrosPdf[d];
      return `
      <div class="marcar-dia marcar-dia--digital${link ? ' checked' : ''}${finde ? ' finde' : ''}">
        <button type="button" class="marcar-dia-num" onclick="abrirLlenarFormatoPrograma(${d})">${d}</button>
        ${link ? `<a href="${esc(link)}" target="_blank" class="marcar-dia-ver" title="Ver documento generado" onclick="event.stopPropagation()">${ic('documento',11)}</a>` : ''}
      </div>`;
    }).join('');
  } else {
    diasHtml = Array.from({length: dias}, (_, i) => i+1).map(d => {
      const auto = diasEvidencia.has(d) && !marcadosGuardados.has(d);
      const checked = marcadosGuardados.has(d) || diasEvidencia.has(d);
      const finde = esDiaNoHabil(a.mes, d);
      return `
      <label class="marcar-dia${checked ? ' checked' : ''}${auto ? ' auto' : ''}${finde ? ' finde' : ''}">
        <input type="checkbox" value="${d}" ${checked ? 'checked' : ''} onchange="this.closest('.marcar-dia').classList.toggle('checked', this.checked)">
        <span>${d}</span>
      </label>`;
    }).join('');
  }
  document.getElementById('marcar-dias-grid').innerHTML = headerHtml + vaciosHtml + diasHtml;
  document.getElementById('marcar-dias-guardar').classList.toggle('hidden', !!motor);
  document.getElementById('marcar-dias-nota-digital').classList.toggle('hidden', !motor);
  openPanel('panel-marcar-dias');
}
async function guardarMarcarDias() {
  try {
    const dias = [...document.querySelectorAll('#marcar-dias-grid input:checked')].map(i => i.value);
    await ensureToken();
    const urlDias = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_PROGRAMA_PERSONALIZADO}'!H${marcarDiasFila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(urlDias, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[dias.join(',')]] }) });
    const urlFecha = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_PROGRAMA_PERSONALIZADO}'!I${marcarDiasFila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(urlFecha, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[new Date().toLocaleString('es-CL')]] }) });
    toast('Días guardados ✓', 'ok');
    closePanel('panel-marcar-dias');
    await cargarTodo(true);
    if (programaDetalleCtx) renderDetalleProgramaSupervisor();
  } catch (e) { toast(e.message, 'error'); }
}

// ── Llenado digital de un formato SGSST-PER sobre un día del Programa
// Personalizado (motor genérico "checklist_generico": tabla fija de ítems
// SI/NO/N/A + firmas — ver CHECKLIST_GENERICO_CONFIG) ─────────────────────
let llenarFormatoCtx = null; // { filaActividad, dia, formato, config }
function htmlFormularioChecklistGenerico(a, config) {
  const camposHtml = config.campos.map(c => `
    <div class="form-group"><label>${esc(c.label)}</label>
      <input name="campo_${c.key}" type="${c.tipo === 'fecha' ? 'date' : 'text'}" value="${c.tipo === 'fecha' ? esc(a.__fechaDia) : ''}">
    </div>`).join('');
  // Algunos formatos (ej. Izaje) no tienen columna Responsable/Fecha por
  // ítem en el PDF real — esos campos del formulario solo se muestran si
  // la config trae dónde dibujarlos (config.tabla.xResp/xFecha).
  const conRespFecha = !!(config.tabla.xResp || config.tabla.xFecha);
  const itemsHtml = config.tabla.filas.map((f, i) => `
    ${f.seccion ? `<div class="sec-label" style="margin-top:16px;">${esc(f.seccion)}</div>` : ''}
    <div class="checklist-generico-item">
      <div class="checklist-generico-item-texto">${i+1}. ${esc(f.texto)}</div>
      <div class="checklist-generico-sino">
        <label><input type="radio" name="item_${i}_resultado" value="SI"> SI</label>
        <label><input type="radio" name="item_${i}_resultado" value="NO"> NO</label>
        <label><input type="radio" name="item_${i}_resultado" value="NA"> N/A</label>
      </div>
      <input name="item_${i}_observacion" placeholder="Observación (opcional)">
      ${conRespFecha ? `
      <div class="checklist-generico-item-fila2">
        <input name="item_${i}_responsable" placeholder="Responsable a cargo">
        <input name="item_${i}_fecha" type="date" placeholder="Fecha de solución">
      </div>` : ''}
    </div>`).join('');
  const firmasHtml = config.firmas.map((f, i) => `
    <div class="sec-label" style="margin-top:18px;">${esc(f.label)}</div>
    <div class="form-group"><label>Nombre</label><input name="firma_${i}_nombre"></div>
    <div class="form-group"><label>Cargo</label><input name="firma_${i}_cargo"></div>
    ${f.xProfesion ? `<div class="form-group"><label>Profesión / Actividad</label><input name="firma_${i}_profesion"></div>` : ''}
    ${f.xFecha ? `<div class="form-group"><label>Fecha</label><input name="firma_${i}_fecha" type="date"></div>` : ''}
    <div class="form-group">
      <label>Firma</label>
      <div class="firma-box"><canvas id="firma-formato-${i}"></canvas></div>
      <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-formato-${i}')">Borrar firma</button></div>
    </div>`).join('');
  return `
    <div class="sec-label">Datos generales</div>
    ${camposHtml}
    <div class="sec-label" style="margin-top:18px;">Ítems a inspeccionar</div>
    ${itemsHtml}
    ${firmasHtml}
    <button class="btn-add" style="margin-top:16px;" onclick="guardarFormatoPrograma()">Generar documento y marcar día</button>`;
}
// Recolecta un canvas de firma como dataURL, o '' si el usuario no dibujó
// nada — mismo helper para cualquier motor.
function recolectarFirmaCanvas(canvasId) {
  return firmaEstaVacia(canvasId) ? '' : document.getElementById(canvasId).toDataURL('image/png');
}
function recolectarChecklistGenerico(body, a, formato) {
  const config = CHECKLIST_GENERICO_CONFIG[formato.codigo];
  const val = (name) => (body.querySelector(`[name="${name}"]`) || {}).value || '';
  const datos = { obra: a.obra, __fechaDia: a.__fechaDia };
  config.campos.forEach(c => { datos[c.key] = val(`campo_${c.key}`); });
  if (!datos.obra) datos.obra = a.obra;
  datos.items = config.tabla.filas.map((f, i) => ({
    resultado: (body.querySelector(`[name="item_${i}_resultado"]:checked`) || {}).value || '',
    observacion: val(`item_${i}_observacion`),
    responsable: val(`item_${i}_responsable`),
    fecha: val(`item_${i}_fecha`),
  }));
  datos.firmas = config.firmas.map((f, i) => ({
    nombre: val(`firma_${i}_nombre`), cargo: val(`firma_${i}_cargo`),
    profesion: val(`firma_${i}_profesion`), fecha: val(`firma_${i}_fecha`),
    firma: recolectarFirmaCanvas(`firma-formato-${i}`),
  }));
  return datos;
}
// Registro de motores de llenado digital, uno por "tipo" de
// PROGRAMAS_PERSONALIZADOS — agregar un formato nuevo (que no calce con
// ninguno existente) es agregar una entrada acá con sus 4 funciones,
// sin tocar abrirMarcarDias/abrirLlenarFormatoPrograma/guardarFormatoPrograma.
const MOTORES_FORMATO_PROGRAMA = {
  checklist_generico: {
    html: (a, formato) => htmlFormularioChecklistGenerico(a, CHECKLIST_GENERICO_CONFIG[formato.codigo]),
    initFirmas: (formato) => CHECKLIST_GENERICO_CONFIG[formato.codigo].firmas.forEach((f, i) => setTimeout(() => initFirmaPad(`firma-formato-${i}`), 80)),
    recolectar: (body, a, formato) => recolectarChecklistGenerico(body, a, formato),
    generarPdf: (formato, datos) => generarPdfChecklistGenerico(formato.codigo, datos),
  },
  inspeccion_observacion: {
    html: (a) => htmlFormularioInspeccionObservacion(a),
    initFirmas: () => INSPECCION_OBSERVACION_CONFIG.firmas.forEach((f, i) => setTimeout(() => initFirmaPad(`firma-formato-${i}`), 80)),
    recolectar: (body, a) => recolectarInspeccionObservacion(body, a),
    generarPdf: (formato, datos) => generarPdfInspeccionObservacion(datos),
  },
  observacion_conducta: {
    html: (a) => htmlFormularioObservacionConducta(a),
    initFirmas: () => [0, 1].forEach(i => setTimeout(() => initFirmaPad(`firma-formato-${i}`), 80)),
    recolectar: (body, a) => recolectarObservacionConducta(body, a),
    generarPdf: (formato, datos) => generarPdfObservacionConducta(datos),
  },
  inspeccion_epp: {
    html: (a) => htmlFormularioInspeccionEpp(a),
    initFirmas: () => [0, 1].forEach(i => setTimeout(() => initFirmaPad(`firma-formato-${i}`), 80)),
    recolectar: (body, a) => recolectarInspeccionEpp(body, a),
    generarPdf: (formato, datos) => generarPdfInspeccionEpp(datos),
  },
  autorizacion_altura: {
    html: (a) => htmlFormularioAutorizacionAltura(a),
    initFirmas: () => {
      [0, 1].forEach(i => setTimeout(() => initFirmaPad(`firma-formato-${i}`), 80));
      for (let i = 0; i < AUTORIZACION_ALTURA_CONFIG.trabajadores.filas; i++) setTimeout(() => initFirmaPad(`firma-trab-${i}`), 80);
    },
    recolectar: (body, a) => recolectarAutorizacionAltura(body, a),
    generarPdf: (formato, datos) => generarPdfAutorizacionAltura(datos),
  },
};
function motorDigitalDe(formato) {
  return formato && MOTORES_FORMATO_PROGRAMA[formato.tipo];
}
function abrirLlenarFormatoPrograma(dia) {
  const a = allProgramaPersonalizado.find(x => x.fila === marcarDiasFila);
  if (!a) return;
  const formato = formatoDeActividad(a.actividad);
  const motor = motorDigitalDe(formato);
  if (!motor) { toast('Este formato todavía no tiene llenado digital', 'error'); return; }
  llenarFormatoCtx = { filaActividad: a.fila, dia, formato, motor };
  document.getElementById('pnl-title-llenar-formato').textContent = `${formato.nombre} — ${fechaDia(a.mes, dia)}`;
  document.getElementById('llenar-formato-body').innerHTML =
    motor.html({ ...a, __fechaDia: fechaDia(a.mes, dia) }, formato);
  motor.initFirmas(formato);
  openPanel('panel-llenar-formato-programa');
}
async function guardarFormatoPrograma() {
  if (!llenarFormatoCtx) return;
  const { filaActividad, dia, formato, motor } = llenarFormatoCtx;
  const a = allProgramaPersonalizado.find(x => x.fila === filaActividad);
  if (!a) return;
  const body = document.getElementById('llenar-formato-body');
  try {
    const datos = motor.recolectar(body, { ...a, __fechaDia: fechaDia(a.mes, dia) }, formato);
    toast('Generando documento...', 'ok');
    const link = await motor.generarPdf(formato, datos);
    await ensureToken();
    const nuevosRegistros = { ...a.registrosPdf, [dia]: link };
    const strRegistros = Object.entries(nuevosRegistros).map(([d, l]) => `${d}:${l}`).join('|');
    const urlReg = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_PROGRAMA_PERSONALIZADO}'!K${filaActividad}`)}?valueInputOption=USER_ENTERED`;
    await fetch(urlReg, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[strRegistros]] }) });
    const diasSet = new Set(a.diasMarcados); diasSet.add(dia);
    const urlDias = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_PROGRAMA_PERSONALIZADO}'!H${filaActividad}`)}?valueInputOption=USER_ENTERED`;
    await fetch(urlDias, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[[...diasSet].join(',')]] }) });
    toast('Documento generado y día marcado ✓', 'ok');
    closePanel('panel-llenar-formato-programa');
    await cargarTodo(true);
    abrirMarcarDias(filaActividad);
    if (programaDetalleCtx) renderDetalleProgramaSupervisor();
  } catch (e) { toast(e.message, 'error'); }
}
// Motor compartido por los formatos "checklist_generico" (tabla fija de
// ítems SI/NO/N/A + firmas) — dibuja sobre el PDF real del formato
// (PROGRAMAS_PERSONALIZADOS) con las coordenadas medidas en
// CHECKLIST_GENERICO_CONFIG. Un solo generador sirve para todos los
// formatos de este tipo, solo cambia la config.
async function generarPdfChecklistGenerico(codigo, datos) {
  const formato = PROGRAMAS_PERSONALIZADOS.find(p => p.codigo === codigo);
  const config = CHECKLIST_GENERICO_CONFIG[codigo];
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const templateBytes = await fetch(formato.archivo).then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];

  function text(str, x, y, size, bold) {
    if (!str) return;
    page.drawText(String(str), { x, y, size: size || 8, font: bold ? fontBold : font, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = []; let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  function checkX(xCenter, yCenter, size) {
    const s = size || 9;
    page.drawText('X', { x: xCenter - s * 0.32, y: yCenter - s * 0.35, size: s, font: fontBold, color: rgb(0,0,0) });
  }
  async function drawSig(dataUrl, x, y, w, h) {
    if (!dataUrl) return;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);
    const dims = escalarFirmaCasillero(img, w, h);
    page.drawImage(img, { x, y, width: dims.width, height: dims.height });
  }

  config.campos.forEach(c => text(c.tipo === 'fecha' ? ddmmyyyy(datos[c.key]) : datos[c.key], c.x, c.y, 8));

  const t = config.tabla;
  config.tabla.filas.forEach((f, i) => {
    const it = datos.items[i] || {};
    // f.y0/f.y1 no vienen garantizados en un orden fijo (se copiaron tal
    // cual de la medición de las líneas de la grilla) — se normalizan acá
    // para no volver a mezclar cuál es el borde de arriba y cuál el de abajo.
    const yTop = Math.max(f.y0, f.y1), yBottom = Math.min(f.y0, f.y1);
    const yc = (yTop + yBottom) / 2;
    if (it.resultado === 'SI') checkX(t.xSI, yc, 8);
    else if (it.resultado === 'NO') checkX(t.xNO, yc, 8);
    else if (it.resultado === 'NA') checkX(t.xNA, yc, 8);
    if (it.observacion) {
      const lineH = 7.5;
      const obsAncho = (t.xResp || t.xFin) - t.xObs - 6;
      const maxLines = Math.max(1, Math.floor((yTop - yBottom - 3) / lineH));
      const lineas = wrapLines(it.observacion, obsAncho, 6.5).slice(0, maxLines);
      lineas.forEach((l, li) => text(l, t.xObs + 3, yTop - 8 - li * lineH, 6.5));
    }
    if (it.responsable && t.xResp) {
      // Algunos formatos (ej. Esmeril Angular) traen Responsable y Fecha
      // fusionados en una sola columna angosta — ahí no hay xFecha propio,
      // así que la fecha se agrega pegada al responsable en vez de perderse.
      const linea = it.fecha && !t.xFecha ? `${it.responsable} (${ddmmyyyy(it.fecha)})` : it.responsable;
      text(linea, t.xResp + 3, yc - 3, t.xFecha ? 6.5 : 5.5);
    }
    if (it.fecha && t.xFecha) text(ddmmyyyy(it.fecha), t.xFecha + 3, yc - 3, 6.5);
  });

  for (let i = 0; i < config.firmas.length; i++) {
    const cfg = config.firmas[i], fdat = datos.firmas[i] || {};
    text(fdat.nombre, cfg.xNombre, cfg.yNombre, cfg.sizeNombre || 8);
    if (cfg.xCargo) text(fdat.cargo, cfg.xCargo, cfg.yCargo, 8);
    if (cfg.xProfesion) text(fdat.profesion, cfg.xProfesion, cfg.yProfesion, 8);
    if (cfg.xFecha) text(ddmmyyyy(fdat.fecha), cfg.xFecha, cfg.yFecha, 8);
    await drawSig(fdat.firma, cfg.xFirma, cfg.yFirma, cfg.wFirma, cfg.hFirma);
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const up = await uploadFile(blob, 'Programa Personalizado', formato.codigo + '_' + (datos.obra || 'obra').replace(/\s+/g,'_') + '_' + datos.__fechaDia, 'pdf');
  return up.link;
}

// ── SGSST-PER-001 (Inspección/Observación de Seguridad) — motor propio:
// identificación + 9 checkboxes de tipo (single-select) + descripción
// libre sobre 5 líneas en blanco + tabla de 3 acciones correctivas +
// 3 firmas (Realizado por / Informado a / Cerrado por). Coordenadas
// medidas igual que CHECKLIST_GENERICO_CONFIG (pypdfium2, puntos PDF).
const INSPECCION_OBSERVACION_CONFIG = {
  campos: [
    { key: 'nombreCargo', label: 'Nombre y cargo (quien inspecciona)', x: 236, y: 660 },
    { key: 'fecha', label: 'Fecha', x: 90, y: 639, tipo: 'fecha' },
    { key: 'areaObra', label: 'Área / Obra', x: 410, y: 639 },
    { key: 'responsableArea', label: 'Responsable del área', x: 172, y: 617 },
  ],
  tipos: [
    { key: 'terreno', label: 'Inspección terreno', x: 216.1, y: 552.0 },
    { key: 'oficina', label: 'Inspección oficina', x: 396.8, y: 552.0 },
    { key: 'mAmbiente', label: 'Inspección M. Ambiente', x: 563.5, y: 552.0 },
    { key: 'maquinaria', label: 'Inspección maquinaria', x: 216.1, y: 531.4 },
    { key: 'trabajadores', label: 'Observación trabajadores', x: 396.8, y: 531.4 },
    { key: 'general', label: 'Inspección general', x: 563.5, y: 531.4 },
    { key: 'comedores', label: 'Inspección comedores', x: 216.1, y: 514.0 },
    { key: 'instalacionFaena', label: 'Inspección instalación de faena', x: 396.8, y: 514.0 },
    { key: 'otra', label: 'Otra', x: 563.5, y: 514.0 },
  ],
  descripcion: { x: 53, xFin: 575, filas: [
    { y0: 434.5, y1: 413.9 }, { y0: 413.9, y1: 393.3 }, { y0: 393.3, y1: 372.7 },
    { y0: 372.7, y1: 351.9 }, { y0: 351.9, y1: 331.5 },
  ] },
  acciones: {
    xDesc: 49.4, xPlazo: 323.3, xResp: 407.9, xEstado: 484.0, xFin: 581.2,
    filas: [ { y0: 249.7, y1: 229.1 }, { y0: 229.1, y1: 208.4 }, { y0: 208.4, y1: 187.9 } ],
  },
  firmas: [
    { key: 'realizado', label: 'Realizado por (firma)', xNombre: 60, yNombre: 152, xFirma: 55, yFirma: 92, wFirma: 165, hFirma: 35 },
    { key: 'informado', label: 'Informado a (nombre y firma)', xNombre: 236, yNombre: 152, xFirma: 231, yFirma: 128, wFirma: 145, hFirma: 30 },
    { key: 'cerrado', label: 'Cerrado por (nombre y firma)', xNombre: 389, yNombre: 152, xFirma: 384, yFirma: 92, wFirma: 190, hFirma: 35 },
  ],
};
function htmlFormularioInspeccionObservacion(a) {
  const c = INSPECCION_OBSERVACION_CONFIG;
  const camposHtml = c.campos.map(cf => `
    <div class="form-group"><label>${esc(cf.label)}</label>
      <input name="campo_${cf.key}" type="${cf.tipo === 'fecha' ? 'date' : 'text'}" value="${cf.tipo === 'fecha' ? esc(a.__fechaDia) : ''}">
    </div>`).join('');
  const tiposHtml = c.tipos.map(t => `
    <label style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
      <input type="radio" name="tipoInspeccion" value="${t.key}"> <span>${esc(t.label)}</span>
    </label>`).join('');
  const accionesHtml = c.acciones.filas.map((f, i) => `
    <div class="checklist-generico-item">
      <div class="checklist-generico-item-texto">Acción correctiva/preventiva ${i+1}</div>
      <input name="accion_${i}_descripcion" placeholder="Descripción">
      <div class="checklist-generico-item-fila2">
        <input name="accion_${i}_plazo" type="date" placeholder="Plazo de cumplimiento">
        <input name="accion_${i}_responsable" placeholder="Responsable">
      </div>
      <input name="accion_${i}_estado" placeholder="Estado (ej. Pendiente, En curso, Cerrado)">
    </div>`).join('');
  const firmasHtml = c.firmas.map((f, i) => `
    <div class="sec-label" style="margin-top:18px;">${esc(f.label)}</div>
    <div class="form-group"><label>Nombre</label><input name="firma_${i}_nombre"></div>
    <div class="form-group">
      <label>Firma</label>
      <div class="firma-box"><canvas id="firma-formato-${i}"></canvas></div>
      <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-formato-${i}')">Borrar firma</button></div>
    </div>`).join('');
  return `
    <div class="sec-label">Identificación</div>
    ${camposHtml}
    <div class="sec-label" style="margin-top:18px;">Tipo de inspección/observación</div>
    ${tiposHtml}
    <div class="sec-label" style="margin-top:18px;">Descripción</div>
    <div class="form-group"><textarea name="descripcion" rows="5" placeholder="Describe lo observado"></textarea></div>
    <div class="sec-label" style="margin-top:18px;">Recomendaciones y/o acciones correctivas/preventivas</div>
    ${accionesHtml}
    ${firmasHtml}
    <button class="btn-add" style="margin-top:16px;" onclick="guardarFormatoPrograma()">Generar documento y marcar día</button>`;
}
function recolectarInspeccionObservacion(body, a) {
  const c = INSPECCION_OBSERVACION_CONFIG;
  const val = (name) => (body.querySelector(`[name="${name}"]`) || {}).value || '';
  const datos = { obra: a.obra, __fechaDia: a.__fechaDia };
  c.campos.forEach(cf => { datos[cf.key] = val(`campo_${cf.key}`); });
  if (!datos.areaObra) datos.areaObra = a.obra;
  datos.tipoInspeccion = (body.querySelector('[name="tipoInspeccion"]:checked') || {}).value || '';
  datos.descripcion = (body.querySelector('[name="descripcion"]') || {}).value || '';
  datos.acciones = c.acciones.filas.map((f, i) => ({
    descripcion: val(`accion_${i}_descripcion`), plazo: val(`accion_${i}_plazo`),
    responsable: val(`accion_${i}_responsable`), estado: val(`accion_${i}_estado`),
  }));
  datos.firmas = c.firmas.map((f, i) => ({
    nombre: val(`firma_${i}_nombre`), firma: recolectarFirmaCanvas(`firma-formato-${i}`),
  }));
  return datos;
}
async function generarPdfInspeccionObservacion(datos) {
  const c = INSPECCION_OBSERVACION_CONFIG;
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const templateBytes = await fetch('plantillas/programas/SGSST-PER-001_Inspeccion_Observacion.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];

  function text(str, x, y, size, bold) {
    if (!str) return;
    page.drawText(String(str), { x, y, size: size || 8, font: bold ? fontBold : font, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = []; let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  function checkX(xCenter, yCenter, size) {
    const s = size || 9;
    page.drawText('X', { x: xCenter - s * 0.32, y: yCenter - s * 0.35, size: s, font: fontBold, color: rgb(0,0,0) });
  }
  async function drawSig(dataUrl, x, y, w, h) {
    if (!dataUrl) return;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), ch => ch.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);
    const dims = escalarFirmaCasillero(img, w, h);
    page.drawImage(img, { x, y, width: dims.width, height: dims.height });
  }

  c.campos.forEach(cf => text(cf.tipo === 'fecha' ? ddmmyyyy(datos[cf.key]) : datos[cf.key], cf.x, cf.y, 8));

  const tipoSel = c.tipos.find(t => t.key === datos.tipoInspeccion);
  if (tipoSel) checkX(tipoSel.x, tipoSel.y, 8);

  // Descripción: se envuelve sobre las 5 líneas en blanco del PDF real.
  const lineasDesc = wrapLines(datos.descripcion, c.descripcion.xFin - c.descripcion.x - 4, 8.5).slice(0, c.descripcion.filas.length);
  lineasDesc.forEach((l, i) => {
    const f = c.descripcion.filas[i];
    text(l, c.descripcion.x, Math.max(f.y0, f.y1) - 8, 8.5);
  });

  // Tabla de acciones correctivas/preventivas (filas vacías se omiten).
  c.acciones.filas.forEach((f, i) => {
    const acc = datos.acciones[i] || {};
    if (!acc.descripcion && !acc.plazo && !acc.responsable && !acc.estado) return;
    const yTop = Math.max(f.y0, f.y1), yBottom = Math.min(f.y0, f.y1);
    const yc = (yTop + yBottom) / 2;
    if (acc.descripcion) {
      const lineH = 7.5;
      const maxLines = Math.max(1, Math.floor((yTop - yBottom - 3) / lineH));
      wrapLines(acc.descripcion, c.acciones.xPlazo - c.acciones.xDesc - 6, 6.5).slice(0, maxLines)
        .forEach((l, li) => text(l, c.acciones.xDesc + 3, yTop - 8 - li * lineH, 6.5));
    }
    if (acc.plazo) text(ddmmyyyy(acc.plazo), c.acciones.xPlazo + 3, yc - 3, 6.5);
    if (acc.responsable) text(acc.responsable, c.acciones.xResp + 3, yc - 3, 6.5);
    if (acc.estado) text(acc.estado, c.acciones.xEstado + 3, yc - 3, 6.5);
  });

  // Firmas (solo nombre + dibujo — este formato no trae Cargo/Fecha por firmante).
  c.firmas.forEach((f, i) => text((datos.firmas[i] || {}).nombre, f.xNombre, f.yNombre, 7));
  for (let i = 0; i < c.firmas.length; i++) {
    await drawSig((datos.firmas[i] || {}).firma, c.firmas[i].xFirma, c.firmas[i].yFirma, c.firmas[i].wFirma, c.firmas[i].hFirma);
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const up = await uploadFile(blob, 'Programa Personalizado', 'SGSST-PER-001_' + (datos.obra || 'obra').replace(/\s+/g,'_') + '_' + datos.__fechaDia, 'pdf');
  return up.link;
}

// ── SGSST-PER-003 (Observación de Conducta) — motor propio: encabezado con
// firma chica del observador + identificación del trabajador observado +
// dos bloques de texto libre (Observaciones/Recomendaciones, envueltos
// sobre las líneas en blanco reales) + firma grande del trabajador (toma
// de conocimiento) + tabla de seguimiento (hasta 4 filas nota+fecha). Esta
// plantilla es tamaño A4 (595.2×841.8), a diferencia de las demás (Carta) —
// no cambia nada del código, las coordenadas ya vienen medidas para esa hoja.
const OBSERVACION_CONDUCTA_CONFIG = {
  campos: [
    { key: 'proyecto', label: 'Proyecto', x: 138, y: 692 },
    { key: 'realizadoPor', label: 'Realizado por', x: 138, y: 677 },
    { key: 'cargoRealiza', label: 'Cargo (de quien realiza)', x: 347, y: 677 },
    { key: 'area', label: 'Área', x: 138, y: 663 },
    { key: 'fecha', label: 'Fecha', x: 347, y: 663, tipo: 'fecha' },
    { key: 'lugar', label: 'Lugar', x: 138, y: 647 },
  ],
  trabajador: {
    nombre: { key: 'nombreTrabajador', label: 'Nombre del trabajador observado', x: 138, y: 594 },
    cargo: { key: 'cargoTrabajador', label: 'Cargo', x: 138, y: 578 },
    especialidad: { key: 'especialidadTrabajador', label: 'Especialidad', x: 90, y: 563.5 },
  },
  observaciones: { x: 22, xFin: 573, filas: Array.from({length: 11}, (_, i) => ({ y0: 542.3 - i*12.6, y1: 542.3 - (i+1)*12.6 })) },
  recomendaciones: { x: 22, xFin: 573, filas: Array.from({length: 8}, (_, i) => ({ y0: 387.3 - i*15.9, y1: 387.3 - (i+1)*15.9 })) },
  firmaRealiza: { x: 347, y: 645, w: 90, h: 13 },
  firmaTrabajador: { x: 370, y: 232, w: 185, h: 26 },
  seguimiento: {
    xNota: 22, xFecha: 460,
    filas: [ { y0: 195.9, y1: 178.1 }, { y0: 178.1, y1: 162.2 }, { y0: 162.2, y1: 146.4 }, { y0: 146.4, y1: 126.8 } ],
  },
};
function htmlFormularioObservacionConducta(a) {
  const c = OBSERVACION_CONDUCTA_CONFIG;
  const camposHtml = c.campos.map(cf => `
    <div class="form-group"><label>${esc(cf.label)}</label>
      <input name="campo_${cf.key}" type="${cf.tipo === 'fecha' ? 'date' : 'text'}" value="${cf.tipo === 'fecha' ? esc(a.__fechaDia) : ''}">
    </div>`).join('');
  const seguimientoHtml = c.seguimiento.filas.map((f, i) => `
    <div class="checklist-generico-item-fila2" style="margin-bottom:8px;">
      <input name="seguimiento_${i}_nota" placeholder="Seguimiento ${i+1}">
      <input name="seguimiento_${i}_fecha" type="date">
    </div>`).join('');
  return `
    <div class="sec-label">Identificación</div>
    ${camposHtml}
    <div class="form-group">
      <label>Firma de quien realiza (chica en el encabezado)</label>
      <div class="firma-box"><canvas id="firma-formato-0"></canvas></div>
      <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-formato-0')">Borrar firma</button></div>
    </div>
    <div class="sec-label" style="margin-top:18px;">Trabajador observado</div>
    <div class="form-group"><label>${esc(c.trabajador.nombre.label)}</label><input name="campo_nombreTrabajador"></div>
    <div class="form-group"><label>${esc(c.trabajador.cargo.label)}</label><input name="campo_cargoTrabajador"></div>
    <div class="form-group"><label>${esc(c.trabajador.especialidad.label)}</label><input name="campo_especialidadTrabajador"></div>
    <div class="sec-label" style="margin-top:18px;">Observaciones</div>
    <div class="form-group"><textarea name="observaciones" rows="5" placeholder="Qué se observó (conducta positiva o negativa)"></textarea></div>
    <div class="sec-label" style="margin-top:18px;">Recomendaciones</div>
    <div class="form-group"><textarea name="recomendaciones" rows="4" placeholder="Recomendaciones para el trabajador"></textarea></div>
    <div class="sec-label" style="margin-top:18px;">Toma de conocimiento — firma del trabajador</div>
    <div class="form-group">
      <div class="firma-box"><canvas id="firma-formato-1"></canvas></div>
      <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-formato-1')">Borrar firma</button></div>
    </div>
    <div class="sec-label" style="margin-top:18px;">Seguimiento (opcional)</div>
    ${seguimientoHtml}
    <button class="btn-add" style="margin-top:16px;" onclick="guardarFormatoPrograma()">Generar documento y marcar día</button>`;
}
function recolectarObservacionConducta(body, a) {
  const c = OBSERVACION_CONDUCTA_CONFIG;
  const val = (name) => (body.querySelector(`[name="${name}"]`) || {}).value || '';
  const datos = { obra: a.obra, __fechaDia: a.__fechaDia };
  c.campos.forEach(cf => { datos[cf.key] = val(`campo_${cf.key}`); });
  if (!datos.proyecto) datos.proyecto = a.obra;
  datos.nombreTrabajador = val('campo_nombreTrabajador');
  datos.cargoTrabajador = val('campo_cargoTrabajador');
  datos.especialidadTrabajador = val('campo_especialidadTrabajador');
  datos.observaciones = val('observaciones');
  datos.recomendaciones = val('recomendaciones');
  datos.firmaRealiza = recolectarFirmaCanvas('firma-formato-0');
  datos.firmaTrabajador = recolectarFirmaCanvas('firma-formato-1');
  datos.seguimiento = c.seguimiento.filas.map((f, i) => ({ nota: val(`seguimiento_${i}_nota`), fecha: val(`seguimiento_${i}_fecha`) }));
  return datos;
}
async function generarPdfObservacionConducta(datos) {
  const c = OBSERVACION_CONDUCTA_CONFIG;
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const templateBytes = await fetch('plantillas/programas/SGSST-PER-003_Observacion_de_Conducta.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.getPages()[0];

  function text(str, x, y, size) {
    if (!str) return;
    page.drawText(String(str), { x, y, size: size || 8, font, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = []; let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  function textoEnLineas(str, cfg, size) {
    wrapLines(str, cfg.xFin - cfg.x - 4, size).slice(0, cfg.filas.length)
      .forEach((l, i) => text(l, cfg.x, Math.max(cfg.filas[i].y0, cfg.filas[i].y1) - (size + 2), size));
  }
  async function drawSig(dataUrl, x, y, w, h) {
    if (!dataUrl) return;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), ch => ch.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);
    const dims = escalarFirmaCasillero(img, w, h);
    page.drawImage(img, { x, y, width: dims.width, height: dims.height });
  }

  c.campos.forEach(cf => text(cf.tipo === 'fecha' ? ddmmyyyy(datos[cf.key]) : datos[cf.key], cf.x, cf.y, 8));
  text(datos.nombreTrabajador, c.trabajador.nombre.x, c.trabajador.nombre.y, 8);
  text(datos.cargoTrabajador, c.trabajador.cargo.x, c.trabajador.cargo.y, 8);
  text(datos.especialidadTrabajador, c.trabajador.especialidad.x, c.trabajador.especialidad.y, 8);

  textoEnLineas(datos.observaciones, c.observaciones, 8);
  textoEnLineas(datos.recomendaciones, c.recomendaciones, 8);

  await drawSig(datos.firmaRealiza, c.firmaRealiza.x, c.firmaRealiza.y, c.firmaRealiza.w, c.firmaRealiza.h);
  await drawSig(datos.firmaTrabajador, c.firmaTrabajador.x, c.firmaTrabajador.y, c.firmaTrabajador.w, c.firmaTrabajador.h);

  c.seguimiento.filas.forEach((f, i) => {
    const s = datos.seguimiento[i] || {};
    const yc = (Math.max(f.y0,f.y1) + Math.min(f.y0,f.y1)) / 2;
    if (s.nota) text(s.nota, c.seguimiento.xNota + 2, yc - 3, 7.5);
    if (s.fecha) text(ddmmyyyy(s.fecha), c.seguimiento.xFecha + 2, yc - 3, 7.5);
  });

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const up = await uploadFile(blob, 'Programa Personalizado', 'SGSST-PER-003_' + (datos.obra || 'obra').replace(/\s+/g,'_') + '_' + datos.__fechaDia, 'pdf');
  return up.link;
}

// ── SGSST-PER-005 (Inspección de EPP) — motor propio: matriz de hasta 10
// trabajadores × 9 tipos de EPP (columnas USA/ESTADO cada uno) + Realizada
// por / Revisado por (con firma) + Observaciones. Plantilla apaisada
// (792×612) — no cambia nada del código, las coordenadas ya vienen medidas
// para esa orientación.
const INSPECCION_EPP_CONFIG = {
  filasTrabajador: 11,
  xNombre: 58, xCargo: 148,
  epp: [
    { key: 'casco', label: 'Casco', xUsa: 211.85, xEstado: 241.95 },
    { key: 'zapatos', label: 'Zapatos', xUsa: 276.3, xEstado: 312.35 },
    { key: 'guantes', label: 'Guantes', xUsa: 347.9, xEstado: 381.35 },
    { key: 'antiparra', label: 'Antiparra', xUsa: 409.9, xEstado: 439.95 },
    { key: 'protAudit', label: 'Protector auditivo', xUsa: 469.5, xEstado: 497.2 },
    { key: 'arnes', label: 'Arnés de seguridad', xUsa: 526.7, xEstado: 557.8 },
    { key: 'caboVida', label: 'Cabo de vida', xUsa: 588.75, xEstado: 617.65 },
    { key: 'respirador', label: 'Respirador', xUsa: 646.55, xEstado: 676.65 },
    { key: 'filtros', label: 'Filtros', xUsa: 713.2, xEstado: 750.65 },
  ],
  filas: [
    { y0: 479.0, y1: 455.5 }, { y0: 455.5, y1: 432.0 }, { y0: 432.0, y1: 408.5 }, { y0: 408.5, y1: 384.9 },
    { y0: 384.9, y1: 361.5 }, { y0: 361.5, y1: 337.9 }, { y0: 337.9, y1: 314.5 }, { y0: 314.5, y1: 290.9 },
    { y0: 290.9, y1: 267.5 }, { y0: 267.5, y1: 243.9 }, { y0: 243.9, y1: 220.5 },
  ],
  realizadaPor: { xNombre: 110, yNombre: 166, xCargo: 68, yCargo: 154, xFirma: 28, yFirma: 105, wFirma: 100, hFirma: 40, xFecha: 170, yFecha: 97 },
  revisadoPor: { xNombre: 340, yNombre: 166, xCargo: 300, yCargo: 154, xFirma: 262, yFirma: 105, wFirma: 95, hFirma: 40, xFecha: 398, yFecha: 97 },
  // El label "OBSERVACIONES:" está impreso a y≈163.7-170.5. Debajo hay dos
  // líneas horizontales de la tabla que cruzan TODO el ancho (son el borde
  // de las filas "CARGO:"/"FIRMA" de las otras dos columnas, a y=149.4 y
  // y=92.2) — si el texto las cruza queda con una línea encima (se ve
  // tachado). Las filas de acá saltan esas dos alturas a propósito.
  observaciones: { x: 456, xFin: 765, filas: [
    { y0: 149.4, y1: 135.4 }, { y0: 135.4, y1: 121.4 }, { y0: 121.4, y1: 107.4 }, { y0: 107.4, y1: 93.4 },
    { y0: 92.2, y1: 78.2 }, { y0: 78.2, y1: 64.2 }, { y0: 64.2, y1: 50.2 }, { y0: 50.2, y1: 36.2 },
  ] },
};
// Cada EPP por trabajador es un solo select: si no se registra queda vacío
// (no se dibuja nada), "Usa - Bueno/Regular/Malo" marca USA=S y ESTADO con
// la letra correspondiente, "No usa" marca solo USA=N.
const OPCIONES_ESTADO_EPP = [
  { value: '', label: '—' },
  { value: 'usaB', label: 'Usa — Bueno' },
  { value: 'usaR', label: 'Usa — Regular' },
  { value: 'usaM', label: 'Usa — Malo' },
  { value: 'no', label: 'No usa' },
];
function htmlFormularioInspeccionEpp(a) {
  const c = INSPECCION_EPP_CONFIG;
  const filaTrabajadorHtml = (i) => `
    <div class="checklist-generico-item">
      <div class="checklist-generico-item-texto">Trabajador ${i+1}</div>
      <div class="checklist-generico-item-fila2">
        <input name="trab_${i}_nombre" placeholder="Nombre">
        <input name="trab_${i}_cargo" placeholder="Cargo">
      </div>
      ${c.epp.map(e => `
      <div class="form-group" style="margin-top:6px;">
        <label>${esc(e.label)}</label>
        <select name="trab_${i}_epp_${e.key}">
          ${OPCIONES_ESTADO_EPP.map(o => `<option value="${o.value}">${esc(o.label)}</option>`).join('')}
        </select>
      </div>`).join('')}
    </div>`;
  const filasHtml = Array.from({length: c.filasTrabajador}, (_, i) => filaTrabajadorHtml(i)).join('');
  return `
    <div class="sec-label">Trabajadores inspeccionados</div>
    <div class="card-sub" style="padding:6px 2px;">Deja el nombre en blanco en los trabajadores que no correspondan — se omiten al generar el documento.</div>
    ${filasHtml}
    <div class="sec-label" style="margin-top:18px;">Realizada por</div>
    <div class="form-group"><label>Nombre</label><input name="realizadaPor_nombre"></div>
    <div class="form-group"><label>Cargo</label><input name="realizadaPor_cargo"></div>
    <div class="form-group">
      <label>Firma</label>
      <div class="firma-box"><canvas id="firma-formato-0"></canvas></div>
      <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-formato-0')">Borrar firma</button></div>
    </div>
    <div class="sec-label" style="margin-top:18px;">Revisado por</div>
    <div class="form-group"><label>Nombre</label><input name="revisadoPor_nombre"></div>
    <div class="form-group"><label>Cargo</label><input name="revisadoPor_cargo"></div>
    <div class="form-group">
      <label>Firma</label>
      <div class="firma-box"><canvas id="firma-formato-1"></canvas></div>
      <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-formato-1')">Borrar firma</button></div>
    </div>
    <div class="sec-label" style="margin-top:18px;">Observaciones</div>
    <div class="form-group"><textarea name="observaciones" rows="4"></textarea></div>
    <button class="btn-add" style="margin-top:16px;" onclick="guardarFormatoPrograma()">Generar documento y marcar día</button>`;
}
function recolectarInspeccionEpp(body, a) {
  const c = INSPECCION_EPP_CONFIG;
  const val = (name) => (body.querySelector(`[name="${name}"]`) || {}).value || '';
  const datos = { obra: a.obra, __fechaDia: a.__fechaDia };
  datos.trabajadores = Array.from({length: c.filasTrabajador}, (_, i) => ({
    nombre: val(`trab_${i}_nombre`), cargo: val(`trab_${i}_cargo`),
    epp: Object.fromEntries(c.epp.map(e => [e.key, val(`trab_${i}_epp_${e.key}`)])),
  }));
  datos.realizadaPorNombre = val('realizadaPor_nombre');
  datos.realizadaPorCargo = val('realizadaPor_cargo');
  datos.revisadoPorNombre = val('revisadoPor_nombre');
  datos.revisadoPorCargo = val('revisadoPor_cargo');
  datos.firmaRealizada = recolectarFirmaCanvas('firma-formato-0');
  datos.firmaRevisado = recolectarFirmaCanvas('firma-formato-1');
  datos.observaciones = val('observaciones');
  return datos;
}
async function generarPdfInspeccionEpp(datos) {
  const c = INSPECCION_EPP_CONFIG;
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const templateBytes = await fetch('plantillas/programas/SGSST-PER-005_Inspeccion_de_EPP.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];

  function text(str, x, y, size) {
    if (!str) return;
    page.drawText(String(str), { x, y, size: size || 7.5, font, color: rgb(0,0,0) });
  }
  function letra(x, yCenter, ch, size) {
    const s = size || 7.5;
    page.drawText(ch, { x: x - s * 0.3, y: yCenter - s * 0.35, size: s, font: fontBold, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = []; let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  async function drawSig(dataUrl, x, y, w, h) {
    if (!dataUrl) return;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), ch => ch.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);
    const dims = escalarFirmaCasillero(img, w, h);
    page.drawImage(img, { x, y, width: dims.width, height: dims.height });
  }

  c.filas.forEach((f, i) => {
    const t = datos.trabajadores[i];
    if (!t || !t.nombre) return;
    const yTop = Math.max(f.y0, f.y1), yBottom = Math.min(f.y0, f.y1), yc = (yTop + yBottom) / 2;
    text(t.nombre, c.xNombre, yc - 3, 7.5);
    text(t.cargo, c.xCargo, yc - 3, 7.5);
    c.epp.forEach(e => {
      const v = t.epp[e.key];
      if (!v) return;
      if (v === 'no') { letra(e.xUsa, yc, 'N'); return; }
      letra(e.xUsa, yc, 'S');
      letra(e.xEstado, yc, v === 'usaB' ? 'B' : v === 'usaR' ? 'R' : 'M');
    });
  });

  text(datos.realizadaPorNombre, c.realizadaPor.xNombre, c.realizadaPor.yNombre, 7.5);
  text(datos.realizadaPorCargo, c.realizadaPor.xCargo, c.realizadaPor.yCargo, 7.5);
  await drawSig(datos.firmaRealizada, c.realizadaPor.xFirma, c.realizadaPor.yFirma, c.realizadaPor.wFirma, c.realizadaPor.hFirma);
  text(ddmmyyyy(datos.__fechaDia), c.realizadaPor.xFecha, c.realizadaPor.yFecha, 7.5);

  text(datos.revisadoPorNombre, c.revisadoPor.xNombre, c.revisadoPor.yNombre, 7.5);
  text(datos.revisadoPorCargo, c.revisadoPor.xCargo, c.revisadoPor.yCargo, 7.5);
  await drawSig(datos.firmaRevisado, c.revisadoPor.xFirma, c.revisadoPor.yFirma, c.revisadoPor.wFirma, c.revisadoPor.hFirma);
  text(ddmmyyyy(datos.__fechaDia), c.revisadoPor.xFecha, c.revisadoPor.yFecha, 7.5);

  wrapLines(datos.observaciones, c.observaciones.xFin - c.observaciones.x - 4, 7.5).slice(0, c.observaciones.filas.length)
    .forEach((l, i) => text(l, c.observaciones.x, Math.max(c.observaciones.filas[i].y0, c.observaciones.filas[i].y1) - 9, 7.5));

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const up = await uploadFile(blob, 'Programa Personalizado', 'SGSST-PER-005_' + (datos.obra || 'obra').replace(/\s+/g,'_') + '_' + datos.__fechaDia, 'pdf');
  return up.link;
}

// ── SGSST-PER-006 (Autorización de Trabajos en Altura) — motor propio, 2
// páginas. Página 1: información general + autorización/responsable (con
// firma) + altura a la que trabajará (selección única) + EPP y Lista de
// Verificación (S/N por ítem, comparten columna) + Peligros Potenciales y
// Sistema de Acceso (checkboxes múltiples, comparten filas de la grilla) +
// Condiciones Meteorológicas y Evaluación de Riesgos (selección única en
// una sola fila cada una) + Medidas Correctivas (9 líneas de texto libre)
// + Finalización del Trabajo (selección única) + Fecha/Periodo de validez.
// Página 2: roster de hasta 19 trabajadores autorizados (nombre, RUT,
// examen de altura S/N, cargo, firma). Plantilla apaisada (841.8×595.2) en
// ambas páginas — coordenadas medidas con pypdfium2 sobre el PDF real.
const AUTORIZACION_ALTURA_CONFIG = {
  campos: [
    { key: 'ubicacion', x: 15, y: 506, w: 224 },
    { key: 'area', x: 270, y: 507, w: 161 },
  ],
  descripcion: { x: 15, y: 472, w: 416 },
  procedimiento: { x: 136, y: 464, w: 295 },
  checkList: { x: 480, y: 464, w: 287 },
  autorizadaPor: { xNombre: 483, yNombre: 521, xFirma: 612, yFirma: 510, wFirma: 145, hFirma: 5 },
  responsableEjecutar: { xNombre: 513, yNombre: 502, xFirma: 612, yFirma: 500, wFirma: 145, hFirma: 4 },
  altura: [
    { key: 'op18', label: '1.8 mts', x: 587.25, y: 484.7 },
    { key: 'op6', label: '< a 6 mts', x: 737.5, y: 484.7 },
    { key: 'op5', label: '> a 5 mts', x: 587.25, y: 474.9 },
    { key: 'otros', label: 'Otros', x: 737.5, y: 474.9 },
  ],
  eppCols: { xS: 337.3, xN: 356.0 },
  epp: [
    { key: 'casco', label: 'Casco- barbiquejo', y0: 405.1, y1: 393.1 },
    { key: 'lentes', label: 'Lentes de seguridad', y0: 393.1, y1: 381.1 },
    { key: 'protectorAuditivo', label: 'Protector auditivo', y0: 381.1, y1: 369.1 },
    { key: 'arnes', label: 'Arnés de seguridad con su cabo de vida doble', y0: 369.1, y1: 357.1 },
    { key: 'lineaVida', label: 'Linea de vida', y0: 357.1, y1: 347.3 },
    { key: 'guantes', label: 'Guantes de seguridad', y0: 347.3, y1: 333.7 },
  ],
  peligrosFilas: [
    { y0: 417.0, y1: 405.1 }, { y0: 405.1, y1: 393.1 }, { y0: 393.1, y1: 381.1 }, { y0: 381.1, y1: 369.1 },
    { y0: 369.1, y1: 357.1 }, { y0: 357.1, y1: 347.3 }, { y0: 347.3, y1: 333.7 },
  ],
  peligrosIzq: { x: 527.3, items: [
    { key: 'choque', label: 'Choque o golpes contra objetos' },
    { key: 'caidaDistinto', label: 'Caida distinto nivel' },
    { key: 'caidaMismo', label: 'Caida mismo nivel' },
    { key: 'caidaObjetos', label: 'Caida de objetos' },
    { key: 'pisadaObjetos', label: 'Pisada sobre objetos' },
    { key: 'contactoLinea', label: 'Contacto con linea energizada' },
    { key: 'exposicionUV', label: 'Exposicion a radiación UV' },
  ] },
  peligrosDer: { x: 737.5, items: [
    { key: 'cortesPor', label: 'Cortes por' },
    { key: 'caidaEstructura', label: 'Caida de estructura' },
    { key: 'proyeccionParticulas', label: 'Proyección de particulas' },
    { key: 'atrapamiento', label: 'Atrapamiento por o entre objetos' },
    { key: 'sobreesfuerzo', label: 'Sobreesfuerzo' },
    { key: 'contactoCon', label: 'Contacto con' },
    { key: 'otros', label: 'Otros' },
  ] },
  listaSistemaFilas: [
    { y0: 308.1, y1: 295.5 }, { y0: 295.5, y1: 281.1 }, { y0: 281.1, y1: 271.3 }, { y0: 271.3, y1: 261.5 },
    { y0: 261.5, y1: 251.7 }, { y0: 251.7, y1: 241.9 }, { y0: 241.9, y1: 232.1 }, { y0: 232.1, y1: 222.3 },
    { y0: 222.3, y1: 212.5 },
  ],
  listaCols: { xS: 337.3, xN: 356.0 },
  // El ítem 8 de la grilla (banda 232.1-222.3) queda vacío para esta lista
  // (no tiene ítem propio ahí, "otros" cae en la banda 9 junto con Sistema
  // de Acceso) — por eso hay un `null` en la posición 8.
  lista: [
    { key: 'herramienta', label: 'Herramienta y equipo adecuados para el trabajo' },
    { key: 'andamiosTablones', label: 'Andamios-tablones-escaleras' },
    { key: 'conocimientoEquipo', label: 'Conocimiento del equipo de trabajo y procedimiento' },
    { key: 'aplicacionBloqueo', label: 'Aplicación del procedimiento de bloqueo y etiquetado' },
    { key: 'lugarLineaVida', label: 'Lugar de trabajo puede asegurarse con una linea de vida' },
    { key: 'estadoHerramientas', label: 'Estado de herramientas estan en buen estado' },
    { key: 'arnesCaboVida', label: 'Arnes de seguridad- cabo de vida' },
    null,
    { key: 'otros', label: 'otros' },
  ],
  sistemaCol: { x: 587.25 },
  sistemaAcceso: [
    { key: 'escalerasFijasGato', label: 'Escaleras fijas tipo gato' },
    { key: 'escalerasPortatilesExt', label: 'Escaleras portatiles de extensión' },
    { key: 'escaleraTijera', label: 'Escalera portatil de tijera' },
    { key: 'elevador', label: 'Elevador electrico/ hidraulico' },
    { key: 'andamioTubular', label: 'Andamio tubular' },
    { key: 'andamioColgante', label: 'Andamio colgante' },
    { key: 'andamioEuro', label: 'Andamio euro' },
    { key: 'escalerasFijasEstruct', label: 'Escaleras fijas estructurales' },
    { key: 'otros', label: 'Otros' },
  ],
  meteorologicasY: 197.8,
  meteorologicas: [
    { key: 'lluvia', label: 'LLUVIA INTENSA', x: 337.3 },
    { key: 'vientos', label: 'VIENTOS FUERTES', x: 445.4 },
    { key: 'granizos', label: 'GRANISOS', x: 527.3 },
    { key: 'otras', label: 'OTRAS', x: 737.5 },
  ],
  evaluacionRiesgoY: 178.15,
  evaluacionRiesgo: [
    { key: 'aceptable', label: 'ACEPTABLE', x: 337.3 },
    { key: 'moderado', label: 'MODERADO', x: 445.4 },
    { key: 'alto', label: 'ALTO', x: 527.3 },
    { key: 'muyAlto', label: 'MUY ALTO', x: 737.5 },
  ],
  medidas: { filas: [
    { x: 147, y: 156 }, { x: 15, y: 146.2 }, { x: 15, y: 136.5 }, { x: 15, y: 126.7 },
    { x: 15, y: 116.8 }, { x: 15, y: 107.0 }, { x: 15, y: 97.2 }, { x: 15, y: 87.4 }, { x: 15, y: 77.6 },
  ] },
  finalizacionY: 40.9,
  finalizacion: [
    { key: 'completado', label: 'COMPLETADO', x: 32.6 },
    { key: 'cancelado', label: 'CANCELADO', x: 192.85 },
    { key: 'suspendido', label: 'SUSPENDIDO', x: 356.0 },
  ],
  fechaValidez: { x: 460, y: 30 },
  periodoValidez: { x: 618, y: 30 },
  trabajadores: {
    filas: 19,
    xNombre: 94, xRut: 283, xExamenSI: 393.2, xExamenNO: 452.1, xCargo: 487,
    xFirma: 618, wFirma: 114, hFirma: 7,
    filasY: [
      { y0: 498.8, y1: 477.0 }, { y0: 477.0, y1: 455.1 }, { y0: 455.1, y1: 433.4 }, { y0: 433.4, y1: 411.5 },
      { y0: 411.5, y1: 389.7 }, { y0: 389.7, y1: 367.9 }, { y0: 367.9, y1: 346.1 }, { y0: 346.1, y1: 324.3 },
      { y0: 324.3, y1: 302.5 }, { y0: 302.5, y1: 280.7 }, { y0: 280.7, y1: 258.9 }, { y0: 258.9, y1: 237.1 },
      { y0: 237.1, y1: 215.3 }, { y0: 215.3, y1: 193.5 }, { y0: 193.5, y1: 171.6 }, { y0: 171.6, y1: 149.9 },
      { y0: 149.9, y1: 128.1 }, { y0: 128.1, y1: 105.6 }, { y0: 105.6, y1: 83.2 },
    ],
  },
};
function htmlFormularioAutorizacionAltura(a) {
  const c = AUTORIZACION_ALTURA_CONFIG;
  const checkboxRow = (name, label) => `
    <label style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
      <input type="checkbox" name="${name}"> <span>${esc(label)}</span>
    </label>`;
  const radioRow = (name, value, label) => `
    <label style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
      <input type="radio" name="${name}" value="${value}"> <span>${esc(label)}</span>
    </label>`;
  const siNoSelect = (name) => `
    <select name="${name}">
      <option value="">—</option>
      <option value="si">Sí</option>
      <option value="no">No</option>
    </select>`;
  const eppHtml = c.epp.map(e => `
    <div class="form-group" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <label style="margin:0;">${esc(e.label)}</label>${siNoSelect('epp_' + e.key)}
    </div>`).join('');
  const listaHtml = c.lista.filter(Boolean).map(it => `
    <div class="form-group" style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
      <label style="margin:0;">${esc(it.label)}</label>${siNoSelect('lista_' + it.key)}
    </div>`).join('');
  const sistemaHtml = c.sistemaAcceso.map(it => checkboxRow('sistema_' + it.key, it.label)).join('');
  const peligrosHtml = [...c.peligrosIzq.items, ...c.peligrosDer.items].map(it => checkboxRow('peligro_' + it.key, it.label)).join('');
  const meteoHtml = c.meteorologicas.map(it => checkboxRow('meteo_' + it.key, it.label)).join('');
  const riesgoHtml = c.evaluacionRiesgo.map(it => radioRow('evaluacionRiesgo', it.key, it.label)).join('');
  const alturaHtml = c.altura.map(it => radioRow('altura', it.key, it.label)).join('');
  const finalHtml = c.finalizacion.map(it => radioRow('finalizacion', it.key, it.label)).join('');
  const trabHtml = Array.from({length: c.trabajadores.filas}, (_, i) => `
    <div class="checklist-generico-item">
      <div class="checklist-generico-item-texto">Trabajador ${i+1}</div>
      <div class="checklist-generico-item-fila2">
        <input name="trab_${i}_nombre" placeholder="Nombre">
        <input name="trab_${i}_rut" placeholder="RUT">
      </div>
      <div class="checklist-generico-item-fila2">
        <input name="trab_${i}_cargo" placeholder="Cargo">
        <select name="trab_${i}_examen">
          <option value="">Examen de altura — sin registrar</option>
          <option value="si">Examen de altura — Sí</option>
          <option value="no">Examen de altura — No</option>
        </select>
      </div>
      <div class="form-group">
        <label>Firma</label>
        <div class="firma-box"><canvas id="firma-trab-${i}"></canvas></div>
        <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-trab-${i}')">Borrar firma</button></div>
      </div>
    </div>`).join('');
  return `
    <div class="sec-label">Información general</div>
    <div class="form-group"><label>Ubicación del trabajo</label><input name="ubicacion"></div>
    <div class="form-group"><label>Área</label><input name="area"></div>
    <div class="form-group"><label>Descripción de actividades a realizar</label><input name="descripcion"></div>
    <div class="sec-label" style="margin-top:12px;">Altura a la que trabajará</div>
    ${alturaHtml}
    <div class="form-group" style="margin-top:8px;"><label>Procedimiento de trabajo seguro</label><input name="procedimiento"></div>
    <div class="form-group"><label>Check list</label><input name="checkList"></div>
    <div class="sec-label" style="margin-top:18px;">Autorizada por</div>
    <div class="form-group"><label>Nombre</label><input name="autorizadaPorNombre"></div>
    <div class="form-group">
      <label>Firma</label>
      <div class="firma-box"><canvas id="firma-formato-0"></canvas></div>
      <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-formato-0')">Borrar firma</button></div>
    </div>
    <div class="sec-label" style="margin-top:18px;">Responsable a ejecutar</div>
    <div class="form-group"><label>Nombre</label><input name="responsableEjecutarNombre"></div>
    <div class="form-group">
      <label>Firma</label>
      <div class="firma-box"><canvas id="firma-formato-1"></canvas></div>
      <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-formato-1')">Borrar firma</button></div>
    </div>
    <div class="sec-label" style="margin-top:18px;">Elementos de protección personal (S/N)</div>
    ${eppHtml}
    <div class="sec-label" style="margin-top:18px;">Peligros potenciales (marca todos los que apliquen)</div>
    ${peligrosHtml}
    <div class="sec-label" style="margin-top:18px;">Lista de verificación (S/N)</div>
    ${listaHtml}
    <div class="sec-label" style="margin-top:18px;">Sistema de acceso (marca todos los que apliquen)</div>
    ${sistemaHtml}
    <div class="sec-label" style="margin-top:18px;">Condiciones meteorológicas (marca todas las que apliquen)</div>
    ${meteoHtml}
    <div class="sec-label" style="margin-top:18px;">Evaluación de los riesgos</div>
    ${riesgoHtml}
    <div class="sec-label" style="margin-top:18px;">Medidas correctivas</div>
    <div class="form-group"><textarea name="medidasCorrectivas" rows="5" placeholder="Se reparte automáticamente en las 9 líneas del documento"></textarea></div>
    <div class="sec-label" style="margin-top:18px;">Finalización del trabajo</div>
    ${finalHtml}
    <div class="form-group"><label>Fecha de validez</label><input name="fechaValidez" type="date" value="${esc(a.__fechaDia)}"></div>
    <div class="form-group"><label>Periodo de validez</label><input name="periodoValidez" placeholder="Ej: turno día, 8 horas"></div>
    <div class="sec-label" style="margin-top:18px;">Registro del personal autorizado (hasta ${c.trabajadores.filas} trabajadores)</div>
    <div class="card-sub" style="padding:6px 2px;">Deja el nombre en blanco en los trabajadores que no correspondan — se omiten al generar el documento.</div>
    ${trabHtml}
    <button class="btn-add" style="margin-top:16px;" onclick="guardarFormatoPrograma()">Generar documento y marcar día</button>`;
}
function recolectarAutorizacionAltura(body, a) {
  const c = AUTORIZACION_ALTURA_CONFIG;
  const val = (name) => (body.querySelector(`[name="${name}"]`) || {}).value || '';
  const checked = (name) => !!(body.querySelector(`[name="${name}"]`) || {}).checked;
  const datos = { obra: a.obra, __fechaDia: a.__fechaDia };
  datos.ubicacion = val('ubicacion');
  datos.area = val('area');
  datos.descripcion = val('descripcion');
  datos.altura = (body.querySelector('[name="altura"]:checked') || {}).value || '';
  datos.procedimiento = val('procedimiento');
  datos.checkList = val('checkList');
  datos.autorizadaPorNombre = val('autorizadaPorNombre');
  datos.firmaAutorizada = recolectarFirmaCanvas('firma-formato-0');
  datos.responsableEjecutarNombre = val('responsableEjecutarNombre');
  datos.firmaResponsable = recolectarFirmaCanvas('firma-formato-1');
  datos.epp = Object.fromEntries(c.epp.map(e => [e.key, val('epp_' + e.key)]));
  datos.peligros = Object.fromEntries([...c.peligrosIzq.items, ...c.peligrosDer.items].map(it => [it.key, checked('peligro_' + it.key)]));
  datos.lista = Object.fromEntries(c.lista.filter(Boolean).map(it => [it.key, val('lista_' + it.key)]));
  datos.sistemaAcceso = Object.fromEntries(c.sistemaAcceso.map(it => [it.key, checked('sistema_' + it.key)]));
  datos.meteorologicas = Object.fromEntries(c.meteorologicas.map(it => [it.key, checked('meteo_' + it.key)]));
  datos.evaluacionRiesgo = (body.querySelector('[name="evaluacionRiesgo"]:checked') || {}).value || '';
  datos.medidasCorrectivas = val('medidasCorrectivas');
  datos.finalizacion = (body.querySelector('[name="finalizacion"]:checked') || {}).value || '';
  datos.fechaValidez = val('fechaValidez');
  datos.periodoValidez = val('periodoValidez');
  datos.trabajadores = Array.from({length: c.trabajadores.filas}, (_, i) => ({
    nombre: val(`trab_${i}_nombre`), rut: val(`trab_${i}_rut`),
    cargo: val(`trab_${i}_cargo`), examen: val(`trab_${i}_examen`),
    firma: recolectarFirmaCanvas(`firma-trab-${i}`),
  }));
  return datos;
}
async function generarPdfAutorizacionAltura(datos) {
  const c = AUTORIZACION_ALTURA_CONFIG;
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const templateBytes = await fetch('plantillas/programas/SGSST-PER-006_Autorizacion_Trabajos_en_Altura.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const p1 = pdfDoc.getPages()[0];
  const p2 = pdfDoc.getPages()[1];

  function text(page, str, x, y, size, bold) {
    if (!str) return;
    page.drawText(String(str), { x, y, size: size || 7.5, font: bold ? fontBold : font, color: rgb(0,0,0) });
  }
  function checkX(page, xCenter, yCenter, size) {
    const s = size || 8;
    page.drawText('X', { x: xCenter - s * 0.32, y: yCenter - s * 0.35, size: s, font: fontBold, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = []; let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  async function drawSig(page, dataUrl, x, y, w, h) {
    if (!dataUrl) return;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), ch => ch.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);
    const dims = escalarFirmaCasillero(img, w, h);
    page.drawImage(img, { x, y, width: dims.width, height: dims.height });
  }

  // 1.- Información general
  wrapLines(datos.ubicacion, c.campos[0].w, 7).slice(0, 1).forEach(l => text(p1, l, c.campos[0].x, c.campos[0].y, 7));
  wrapLines(datos.area, c.campos[1].w, 7).slice(0, 1).forEach(l => text(p1, l, c.campos[1].x, c.campos[1].y, 7));
  wrapLines(datos.descripcion, c.descripcion.w, 7).slice(0, 1).forEach(l => text(p1, l, c.descripcion.x, c.descripcion.y, 7));
  wrapLines(datos.procedimiento, c.procedimiento.w, 7).slice(0, 1).forEach(l => text(p1, l, c.procedimiento.x, c.procedimiento.y, 7));
  wrapLines(datos.checkList, c.checkList.w, 7).slice(0, 1).forEach(l => text(p1, l, c.checkList.x, c.checkList.y, 7));

  text(p1, datos.autorizadaPorNombre, c.autorizadaPor.xNombre, c.autorizadaPor.yNombre, 7);
  await drawSig(p1, datos.firmaAutorizada, c.autorizadaPor.xFirma, c.autorizadaPor.yFirma, c.autorizadaPor.wFirma, c.autorizadaPor.hFirma);
  text(p1, datos.responsableEjecutarNombre, c.responsableEjecutar.xNombre, c.responsableEjecutar.yNombre, 7);
  await drawSig(p1, datos.firmaResponsable, c.responsableEjecutar.xFirma, c.responsableEjecutar.yFirma, c.responsableEjecutar.wFirma, c.responsableEjecutar.hFirma);

  const alturaSel = c.altura.find(o => o.key === datos.altura);
  if (alturaSel) checkX(p1, alturaSel.x, alturaSel.y, 8);

  // 2.- EPP (S/N por ítem)
  c.epp.forEach(e => {
    const v = (datos.epp || {})[e.key];
    if (!v) return;
    const yc = (Math.max(e.y0, e.y1) + Math.min(e.y0, e.y1)) / 2;
    checkX(p1, v === 'si' ? c.eppCols.xS : c.eppCols.xN, yc, 7.5);
  });

  // 3.- Peligros potenciales (multi-select, 2 columnas comparten filas)
  c.peligrosFilas.forEach((f, i) => {
    const yc = (Math.max(f.y0, f.y1) + Math.min(f.y0, f.y1)) / 2;
    const itIzq = c.peligrosIzq.items[i];
    if (itIzq && (datos.peligros || {})[itIzq.key]) checkX(p1, c.peligrosIzq.x, yc, 7.5);
    const itDer = c.peligrosDer.items[i];
    if (itDer && (datos.peligros || {})[itDer.key]) checkX(p1, c.peligrosDer.x, yc, 7.5);
  });

  // 4.- Lista de verificación (S/N) + 5.- Sistema de acceso (multi-select) —
  // comparten la misma grilla de filas.
  c.listaSistemaFilas.forEach((f, i) => {
    const yc = (Math.max(f.y0, f.y1) + Math.min(f.y0, f.y1)) / 2;
    const itLista = c.lista[i];
    if (itLista) {
      const v = (datos.lista || {})[itLista.key];
      if (v) checkX(p1, v === 'si' ? c.listaCols.xS : c.listaCols.xN, yc, 7.5);
    }
    const itSistema = c.sistemaAcceso[i];
    if (itSistema && (datos.sistemaAcceso || {})[itSistema.key]) checkX(p1, c.sistemaCol.x, yc, 7.5);
  });

  // 6.- Condiciones meteorológicas (multi-select, una sola fila)
  c.meteorologicas.forEach(m => {
    if ((datos.meteorologicas || {})[m.key]) checkX(p1, m.x, c.meteorologicasY, 7.5);
  });

  // 7.- Evaluación de los riesgos (selección única, una sola fila)
  const riesgoSel = c.evaluacionRiesgo.find(o => o.key === datos.evaluacionRiesgo);
  if (riesgoSel) checkX(p1, riesgoSel.x, c.evaluacionRiesgoY, 8);

  // 8.- Medidas correctivas (hasta 9 líneas de texto libre)
  wrapLines(datos.medidasCorrectivas, 605, 7).slice(0, c.medidas.filas.length)
    .forEach((l, i) => text(p1, l, c.medidas.filas[i].x, c.medidas.filas[i].y, 7));

  // 9.- Finalización del trabajo (selección única) + validez
  const finalSel = c.finalizacion.find(o => o.key === datos.finalizacion);
  if (finalSel) checkX(p1, finalSel.x, c.finalizacionY, 8);
  if (datos.fechaValidez) text(p1, ddmmyyyy(datos.fechaValidez), c.fechaValidez.x, c.fechaValidez.y, 7.5);
  text(p1, datos.periodoValidez, c.periodoValidez.x, c.periodoValidez.y, 7.5);

  // 10.- Registro del personal autorizado (página 2) — filas vacías (sin
  // nombre) se omiten.
  for (let i = 0; i < c.trabajadores.filasY.length; i++) {
    const t = datos.trabajadores[i];
    if (!t || !t.nombre) continue;
    const f = c.trabajadores.filasY[i];
    const yTop = Math.max(f.y0, f.y1), yBottom = Math.min(f.y0, f.y1), yc = (yTop + yBottom) / 2;
    text(p2, t.nombre, c.trabajadores.xNombre, yc - 3, 7.5);
    text(p2, t.rut, c.trabajadores.xRut, yc - 3, 7.5);
    if (t.examen === 'si') checkX(p2, c.trabajadores.xExamenSI, yc, 7.5);
    else if (t.examen === 'no') checkX(p2, c.trabajadores.xExamenNO, yc, 7.5);
    text(p2, t.cargo, c.trabajadores.xCargo, yc - 3, 7.5);
    await drawSig(p2, t.firma, c.trabajadores.xFirma, yBottom + 2, c.trabajadores.wFirma, c.trabajadores.hFirma);
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const up = await uploadFile(blob, 'Programa Personalizado', 'SGSST-PER-006_' + (datos.obra || 'obra').replace(/\s+/g,'_') + '_' + datos.__fechaDia, 'pdf');
  return up.link;
}

// ── SGSST-PER-002 (Check List Orden y Aseo) — el único formato que NO sigue
// el modelo "un PDF por día" del resto: es una grilla mensual acumulada, 23
// ítems de chequeo × hasta 31 días (V=Operativo/X=No operativo/N/A=No
// aplica) en UN solo documento por obra+mes, que se regenera y sobrescribe
// cada vez que se edita cualquier día. Por eso NO tiene entrada en
// MOTORES_FORMATO_PROGRAMA (motorDigitalDe no lo reconoce a propósito) —
// abrirMarcarDias lo detecta por tipo === 'checklist_mensual' y abre
// panel-checklist-mensual en vez de la cuadrícula de días. El estado
// completo (sector, EPP requerido, firmas, observaciones y la grilla) se
// persiste como JSON en la columna L ("Datos Checklist Mensual") — es la
// única forma de reconstruir el documento completo en cada edición, ya que
// cada click en una celda solo cambia UN día pero el PDF hay que dibujarlo
// entero de nuevo. Un día cuenta como "cumplido" (para diasMarcados / el
// informe) solo cuando sus 23 ítems tienen los 23 marcados — no basta con
// uno solo.
const CHECKLIST_ORDEN_ASEO_CONFIG = {
  mes: { x: 580, y: 488.0 },
  anio: { x: 580, y: 481.0 },
  sector: { x: 618, y: 474.0 },
  eppX: 371.9,
  epp: [
    { key: 'casco', label: 'Casco de seguridad', y: 490.6 },
    { key: 'zapatos', label: 'Zapatos de seguridad', y: 483.6 },
    { key: 'lentes', label: 'Lentes de seguridad', y: 476.6 },
    { key: 'guantes', label: 'Guantes de seguridad', y: 469.55 },
    { key: 'otros', label: 'Otros', y: 462.5 },
  ],
  firmaSupervisor: { x: 632, y: 452, w: 78, h: 3.5 },
  firmaAsesor: { x: 602, y: 438, w: 108, h: 3.5 },
  observaciones: { x: 170, y: 136, w: 655 },
  // Ítem 17 ("Los accesos...") es donde empieza la banda separadora teal
  // "ACCESOS Y PASILLOS" impresa en la plantilla — solo informativo para el
  // formulario, la banda ya está impresa en el PDF.
  seccionDesdeItem: 17,
  itemsLabels: [
    'El almacenamiento de elementos y materiales está bien ubicados',
    'Existen almacenamieno o apilamiento de materiales que obstruyen el área',
    'El almacenamiento de elementos y materiales corresponde al lugar donde está',
    'Existe espacio necesario para realizar trabajos',
    'Las herramientas estan bien almacenadas y ordenadas',
    'Los equipos se encuentran bien almacenados y ordenados',
    'Los equipos y maquinarias estan limpios',
    'Los pisos se encuentran limpios',
    'Los materiales de despunte y desperdicios tienen su lugar de almacenamiento',
    'Se realiza aseo periodico al area de trabajo',
    'Se retiran periodicamente los escombros y desperdicios de area de trabajo',
    'Los cables electricos tienen tendido aereo',
    'El area de trabajo cuenta con escobillones y palas',
    'Los bidones o tambores de liquidos (agua, combustible, desmoldante etc,) se encuentran almacenados',
    'Los bidones o tambores de liquidos (agua, combustible, desmoldante etc,) se encuentran señalizados',
    'La iluminacion es suficiente en el lugar de trabajo',
    'Los accesos se encuentran libres de elementos, materiales o escombros',
    'Los accesos se encuentran delimitados',
    'Los pisos se encuentra limpios',
    'Se realiza aseo periodico a los accesos y pasillos',
    'Los pasillos se encuentran señalizados',
    'Los pasillos se encuentran con iluminacion sufuciente',
    'OTROS:',
  ],
  // Banda y0/y1 de cada uno de los 23 ítems, medida sobre el PDF real —
  // como siempre, sin garantía de cuál es el borde de arriba (se normaliza
  // con Math.max/min al dibujar).
  filas: [
    { y0: 423.1, y1: 402.4 }, { y0: 402.4, y1: 387.1 }, { y0: 387.1, y1: 372.3 }, { y0: 372.3, y1: 362.9 },
    { y0: 362.9, y1: 347.7 }, { y0: 347.7, y1: 333.9 }, { y0: 333.9, y1: 323.7 }, { y0: 323.7, y1: 316.9 },
    { y0: 316.9, y1: 302.5 }, { y0: 302.5, y1: 295.7 }, { y0: 295.7, y1: 282.5 }, { y0: 282.5, y1: 275.7 },
    { y0: 275.7, y1: 268.7 }, { y0: 268.7, y1: 248.3 }, { y0: 248.3, y1: 233.1 }, { y0: 233.1, y1: 223.7 },
    { y0: 216.9, y1: 203.1 }, { y0: 203.1, y1: 196.3 }, { y0: 196.3, y1: 189.4 }, { y0: 189.4, y1: 175.2 },
    { y0: 175.2, y1: 168.4 }, { y0: 168.4, y1: 154.2 }, { y0: 154.2, y1: 147.2 },
  ],
  // Límites de las 31 columnas de días (32 valores → 31 columnas) — NO son
  // parejo: el día 25 en la plantilla real es casi el doble de ancho que el
  // resto (defecto del documento original de Excel), así que se usan las
  // posiciones medidas tal cual en vez de repartir el ancho en partes
  // iguales.
  columnas: [
    296.6, 310.2, 323.8, 337.4, 351.0, 364.6, 378.2, 391.8, 405.4, 419.0, 432.6, 446.2, 459.8, 473.4, 487.0,
    500.6, 514.2, 527.8, 541.4, 555.0, 568.6, 582.3, 595.9, 609.4, 623.1, 647.1, 660.6, 674.3, 687.9, 701.5,
    715.1, 728.6,
  ],
};
function gridVacioChecklistMensual() { return Array.from({length: 23}, () => '.'.repeat(31)); }
let checklistMensualCtx = null; // { fila }
let checklistMensualDatos = null; // copia de trabajo — las celdas la mutan directo al click, sin re-render
function htmlChecklistMensual(a, datos) {
  const c = CHECKLIST_ORDEN_ASEO_CONFIG;
  const dias = diasEnMes(a.mes);
  const eppHtml = c.epp.map(e => `
    <label style="display:flex;gap:8px;align-items:center;margin-bottom:6px;">
      <input type="checkbox" name="cm_epp_${e.key}" ${datos.epp && datos.epp[e.key] ? 'checked' : ''}> <span>${esc(e.label)}</span>
    </label>`).join('');
  const headerDias = Array.from({length: dias}, (_, i) => `<th>${i+1}</th>`).join('');
  const filasHtml = c.itemsLabels.map((label, i) => {
    const seccion = (i + 1 === c.seccionDesdeItem)
      ? `<tr class="cm-seccion-row"><td colspan="${dias + 2}">ACCESOS Y PASILLOS</td></tr>` : '';
    const filaGrid = datos.grid[i] || '.'.repeat(31);
    const celdas = Array.from({length: dias}, (_, d) => {
      const val = filaGrid[d] || '.';
      const cls = val !== '.' ? ` cm-cell--${val.toLowerCase()}` : '';
      return `<td><button type="button" class="cm-cell${cls}" data-item="${i}" data-day="${d+1}" onclick="cmCellClick(this)">${val === '.' ? '' : val}</button></td>`;
    }).join('');
    return `${seccion}<tr><td class="cm-item-num">${i+1}</td><td class="cm-item-label">${esc(label)}</td>${celdas}</tr>`;
  }).join('');
  return `
    <div class="sec-label">Datos del mes</div>
    <div class="card-sub" style="margin-bottom:8px;">${esc(nombreMes(a.mes))} · ${esc(a.obra)}</div>
    ${datos.link ? `<a href="${esc(datos.link)}" target="_blank" class="card-sub">Ver último documento generado ↗</a>` : ''}
    <div class="form-group"><label>Sector de trabajo</label><input name="cm_sector" value="${esc(datos.sector || '')}"></div>
    <div class="sec-label" style="margin-top:14px;">EPP requerido (marca lo que aplique)</div>
    ${eppHtml}
    <div class="sec-label" style="margin-top:18px;">Ítems de chequeo — toca una celda para ciclar entre V (operativo) / X (no operativo) / N/A</div>
    <div class="cm-table-wrap">
      <table class="cm-table">
        <thead><tr><th></th><th>Ítem</th>${headerDias}</tr></thead>
        <tbody>${filasHtml}</tbody>
      </table>
    </div>
    <div class="card-sub" style="margin:8px 0;">Referencias: V = Operativo · X = No operativo · N/A = No aplica</div>
    <div class="sec-label" style="margin-top:14px;">Observaciones</div>
    <div class="form-group"><textarea name="cm_observaciones" rows="3">${esc(datos.observaciones || '')}</textarea></div>
    <div class="sec-label" style="margin-top:18px;">Firma del supervisor</div>
    ${datos.firmaSupervisor ? '<div class="card-sub">Ya hay una firma guardada — dibuja una nueva solo si quieres reemplazarla.</div>' : ''}
    <div class="form-group">
      <div class="firma-box"><canvas id="firma-mensual-supervisor"></canvas></div>
      <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-mensual-supervisor')">Borrar firma</button></div>
    </div>
    <div class="sec-label" style="margin-top:18px;">Firma de asesor prevención</div>
    ${datos.firmaAsesor ? '<div class="card-sub">Ya hay una firma guardada — dibuja una nueva solo si quieres reemplazarla.</div>' : ''}
    <div class="form-group">
      <div class="firma-box"><canvas id="firma-mensual-asesor"></canvas></div>
      <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-mensual-asesor')">Borrar firma</button></div>
    </div>
    <button class="btn-add" style="margin-top:16px;" onclick="guardarChecklistMensual()">Generar / actualizar documento</button>`;
}
function cmCellClick(btn) {
  const i = parseInt(btn.dataset.item, 10), d = parseInt(btn.dataset.day, 10);
  const orden = ['.', 'V', 'X', 'A'];
  const fila = checklistMensualDatos.grid[i] || '.'.repeat(31);
  const cur = fila[d-1] || '.';
  const next = orden[(orden.indexOf(cur) + 1) % orden.length];
  checklistMensualDatos.grid[i] = fila.slice(0, d-1) + next + fila.slice(d);
  btn.textContent = next === '.' ? '' : next;
  btn.className = 'cm-cell' + (next !== '.' ? ' cm-cell--' + next.toLowerCase() : '');
}
function abrirChecklistMensual(fila) {
  const a = allProgramaPersonalizado.find(x => x.fila === fila);
  if (!a) return;
  checklistMensualCtx = { fila };
  const guardados = a.datosChecklistMensual || {};
  checklistMensualDatos = {
    sector: guardados.sector || '', observaciones: guardados.observaciones || '',
    epp: guardados.epp || {}, firmaSupervisor: guardados.firmaSupervisor || '', firmaAsesor: guardados.firmaAsesor || '',
    link: guardados.link || '',
    grid: (guardados.grid && guardados.grid.length === 23) ? guardados.grid.slice() : gridVacioChecklistMensual(),
  };
  document.getElementById('pnl-title-checklist-mensual').textContent = `${a.actividad} — ${nombreMes(a.mes)}`;
  document.getElementById('checklist-mensual-body').innerHTML = htmlChecklistMensual(a, checklistMensualDatos);
  setTimeout(() => { initFirmaPad('firma-mensual-supervisor'); initFirmaPad('firma-mensual-asesor'); }, 80);
  openPanel('panel-checklist-mensual');
}
function recolectarChecklistMensual(body) {
  const c = CHECKLIST_ORDEN_ASEO_CONFIG;
  const val = (name) => (body.querySelector(`[name="${name}"]`) || {}).value || '';
  const checked = (name) => !!(body.querySelector(`[name="${name}"]`) || {}).checked;
  const nuevaFirmaSup = recolectarFirmaCanvas('firma-mensual-supervisor');
  const nuevaFirmaAse = recolectarFirmaCanvas('firma-mensual-asesor');
  return {
    sector: val('cm_sector'),
    observaciones: val('cm_observaciones'),
    epp: Object.fromEntries(c.epp.map(e => [e.key, checked('cm_epp_' + e.key)])),
    firmaSupervisor: nuevaFirmaSup || checklistMensualDatos.firmaSupervisor || '',
    firmaAsesor: nuevaFirmaAse || checklistMensualDatos.firmaAsesor || '',
    grid: checklistMensualDatos.grid,
  };
}
async function generarPdfChecklistOrdenAseo(a, datos) {
  const c = CHECKLIST_ORDEN_ASEO_CONFIG;
  const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
  const templateBytes = await fetch('plantillas/programas/SGSST-PER-002_Check_List_Orden_y_Aseo.pdf').then(r => r.arrayBuffer());
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];

  function text(str, x, y, size) {
    if (!str) return;
    page.drawText(String(str), { x, y, size: size || 7.5, font, color: rgb(0,0,0) });
  }
  function checkX(x, yCenter, size) {
    const s = size || 7.5;
    page.drawText('X', { x: x - s * 0.32, y: yCenter - s * 0.35, size: s, font: fontBold, color: rgb(0,0,0) });
  }
  function marcaCelda(xc, yc, val) {
    const txt = val === 'A' ? 'N/A' : val;
    const s = val === 'A' ? 5.3 : 7.5;
    const w = fontBold.widthOfTextAtSize(txt, s);
    page.drawText(txt, { x: xc - w / 2, y: yc - s * 0.35, size: s, font: fontBold, color: rgb(0,0,0) });
  }
  function wrapLines(str, maxWidth, size) {
    const words = (str || '').split(/\s+/).filter(Boolean);
    const lines = []; let current = '';
    for (const w of words) {
      const test = current ? current + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; }
      else current = test;
    }
    if (current) lines.push(current);
    return lines;
  }
  async function drawSig(dataUrl, x, y, w, h) {
    if (!dataUrl) return;
    const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), ch => ch.charCodeAt(0));
    const img = await pdfDoc.embedPng(bytes);
    const dims = escalarFirmaCasillero(img, w, h);
    page.drawImage(img, { x, y, width: dims.width, height: dims.height });
  }

  const [anio, mesNum] = a.mes.split('-');
  text(NOMBRES_MES[parseInt(mesNum, 10) - 1], c.mes.x, c.mes.y, 5.5);
  text(anio, c.anio.x, c.anio.y, 5.5);
  text(datos.sector, c.sector.x, c.sector.y, 5.5);

  c.epp.forEach(e => { if ((datos.epp || {})[e.key]) checkX(c.eppX, e.y, 7); });

  await drawSig(datos.firmaSupervisor, c.firmaSupervisor.x, c.firmaSupervisor.y, c.firmaSupervisor.w, c.firmaSupervisor.h);
  await drawSig(datos.firmaAsesor, c.firmaAsesor.x, c.firmaAsesor.y, c.firmaAsesor.w, c.firmaAsesor.h);

  const dias = diasEnMes(a.mes);
  c.filas.forEach((f, i) => {
    const fila = datos.grid[i] || '.'.repeat(31);
    const yc = (Math.max(f.y0, f.y1) + Math.min(f.y0, f.y1)) / 2;
    for (let d = 0; d < dias; d++) {
      const val = fila[d];
      if (!val || val === '.') continue;
      const xc = (c.columnas[d] + c.columnas[d + 1]) / 2;
      marcaCelda(xc, yc, val);
    }
  });

  wrapLines(datos.observaciones, c.observaciones.w, 7.5).slice(0, 1)
    .forEach(l => text(l, c.observaciones.x, c.observaciones.y, 7.5));

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const up = await uploadFile(blob, 'Programa Personalizado', 'SGSST-PER-002_' + (a.obra || 'obra').replace(/\s+/g,'_') + '_' + a.mes, 'pdf');
  return up.link;
}
async function guardarChecklistMensual() {
  if (!checklistMensualCtx) return;
  const { fila } = checklistMensualCtx;
  const a = allProgramaPersonalizado.find(x => x.fila === fila);
  if (!a) return;
  const body = document.getElementById('checklist-mensual-body');
  try {
    const datos = recolectarChecklistMensual(body);
    toast('Generando documento...', 'ok');
    datos.link = await generarPdfChecklistOrdenAseo(a, datos);
    await ensureToken();
    const urlDatos = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_PROGRAMA_PERSONALIZADO}'!L${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(urlDatos, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[JSON.stringify(datos)]] }) });
    // Un día cuenta como cumplido cuando sus 23 ítems tienen algún valor
    // (V/X/N-A) — marcar uno solo de los ítems no basta.
    const dias = diasEnMes(a.mes);
    const diasCompletos = [];
    for (let d = 1; d <= dias; d++) {
      if (datos.grid.every(f => (f[d-1] || '.') !== '.')) diasCompletos.push(d);
    }
    const urlDias = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_PROGRAMA_PERSONALIZADO}'!H${fila}`)}?valueInputOption=USER_ENTERED`;
    await fetch(urlDias, { method:'PUT', headers:{ 'Content-Type':'application/json', ...authHeader() },
      body: JSON.stringify({ values: [[diasCompletos.join(',')]] }) });
    toast('Documento generado ✓', 'ok');
    closePanel('panel-checklist-mensual');
    await cargarTodo(true);
    if (programaDetalleCtx) renderDetalleProgramaSupervisor();
  } catch (e) { toast(e.message, 'error'); }
}

// ── Generador del informe PDF (portada + objetivos + resumen + índices +
// grilla día a día por supervisor) — desde cero con pdf-lib, sin plantilla
// (a diferencia de Charla/DIAT/Investigación/HCR, este informe no viene de
// un PDF del cliente que se pueda rellenar por encima). Usa logo.png (el
// logo azul actual — logo-transparent.png tiene el logo verde antiguo y no
// debe usarse), embebido con embedJpg porque logo.png está codificado como
// JPEG pese a su extensión.
function dibujarFilaTabla(page, x, y, cols, font, fontBold, rowH, fillColor, textColorDefault, borderColor) {
  let cx = x;
  cols.forEach(c => {
    if (fillColor) page.drawRectangle({ x: cx, y: y - rowH, width: c.w, height: rowH, color: fillColor });
    page.drawRectangle({ x: cx, y: y - rowH, width: c.w, height: rowH, borderColor, borderWidth: 0.6 });
    const useFont = c.bold ? fontBold : font;
    const size = c.size || 9;
    const txt = String(c.text ?? '');
    const tw = useFont.widthOfTextAtSize(txt, size);
    let tx = cx + 4;
    if (c.align === 'center') tx = cx + (c.w - tw) / 2;
    if (c.align === 'right') tx = cx + c.w - tw - 4;
    page.drawText(txt, { x: tx, y: y - rowH + (rowH - size) / 2 + 1, size, font: useFont, color: c.color || textColorDefault });
    cx += c.w;
  });
  return y - rowH;
}
async function dibujarPaginaGrillaSupervisor(pdfDoc, ctx, encabezadoFn, obra, mes, g) {
  const { font, fontBold, negro, gris, grisLinea, colorResultado, rgb } = ctx;
  const W = 792, H = 612;
  const page = pdfDoc.addPage([W, H]);
  encabezadoFn(page, W, H);
  let y = H - 74;
  page.drawText(`PROGRAMA DE ACTIVIDADES — ${g.supervisor}`, { x: 40, y, size: 12, font: fontBold, color: negro });
  y -= 15;
  page.drawText(`${g.cargo || ''} - Obra: ${obra} - Mes: ${nombreMes(mes)}`, { x: 40, y, size: 9, font, color: gris });
  y -= 20;

  const dias = diasEnMes(mes);
  const colAct = 140, colFrec = 55, colPct = 42;
  const anchoDias = W - 80 - colAct - colFrec - colPct;
  const colDia = anchoDias / dias;
  const xDiasInicio = 40 + colAct + colFrec;

  // Sombreado de las columnas de sábado/domingo/feriado, dibujado ANTES de
  // la tabla (detrás) para que se note de un vistazo qué días no son
  // hábiles — la tabla se dibuja encima con celdas sin relleno propio, así
  // que el gris se ve a través de las filas de actividades.
  const alturaTabla = 16 + g.actividades.length * 13 + 16;
  for (let i = 0; i < dias; i++) {
    if (esDiaNoHabil(mes, i + 1)) {
      page.drawRectangle({ x: xDiasInicio + i * colDia, y: y - alturaTabla, width: colDia, height: alturaTabla, color: rgb(0.9,0.9,0.9) });
    }
  }

  const headerCols = [
    { w: colAct, text: 'Actividad', bold: true },
    { w: colFrec, text: 'Frecuencia', bold: true, align: 'center', size: 7 },
    ...Array.from({length: dias}, (_, i) => ({ w: colDia, text: `${i+1}${DIAS_SEMANA_LETRA[diaDeLaSemana(mes, i+1)]}`, bold: true, align: 'center', size: 6 })),
    { w: colPct, text: '%', bold: true, align: 'center' },
  ];
  y = dibujarFilaTabla(page, 40, y, headerCols, font, fontBold, 16, rgb(0.94,0.94,0.94), negro, grisLinea);

  g.actividades.forEach(a => {
    const pct = cumplimientoActividad(a);
    const marcados = new Set(a.diasMarcados);
    const cols = [
      { w: colAct, text: a.actividad, size: 7 },
      { w: colFrec, text: a.frecuencia, align: 'center', size: 6.5 },
      ...Array.from({length: dias}, (_, i) => ({ w: colDia, text: marcados.has(i+1) ? 'X' : '', align: 'center', size: 6.5 })),
      { w: colPct, text: pct + '%', align: 'center', size: 7 },
    ];
    y = dibujarFilaTabla(page, 40, y, cols, font, fontBold, 13, null, negro, grisLinea);
  });

  const r = g.resultado;
  const totalCols = [
    { w: colAct + colFrec, text: 'TOTAL', bold: true },
    ...Array.from({length: dias}, () => ({ w: colDia, text: '' })),
    { w: colPct, text: g.pct + '%', bold: true, align: 'center', color: colorResultado[r.color] },
  ];
  y = dibujarFilaTabla(page, 40, y, totalCols, font, fontBold, 16, rgb(0.94,0.94,0.94), negro, grisLinea);
  page.drawText('Columnas sombreadas = sábado, domingo o feriado (no cuentan como día hábil esperado en actividades Diarias).', { x: 40, y: y - 14, size: 7.5, font, color: gris });
}
async function generarInformeProgramaPersonalizado(obra, mes, responsable) {
  toast('Generando informe...', 'ok');
  try {
    const { PDFDocument, rgb, StandardFonts } = await cargarPdfLib();
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const logoBytes = await fetch('logo.png').then(r => r.arrayBuffer());
    const logoImg = await pdfDoc.embedJpg(logoBytes);
    const logoDim = logoImg.scale(26 / logoImg.height);

    const grupos = agruparProgramaPorSupervisor(obra, mes);
    const total = pctTotalPrograma(grupos);
    const resultadoTotal = resultadoPrograma(total);
    // Totales reales de la obra (no la suma de lo que muestra cada
    // supervisor, que se repite entre ellos — ver eppEntregadoObraMes).
    // eppEntregadoObraMes cuenta ENTREGAS (mismo criterio que la columna
    // "EPP" por supervisor); itemsEppObraMes desglosa por tipo de EPP, para
    // la sección aparte con el detalle.
    const eppEntregasObra = eppEntregadoObraMes(obra, mes);
    const eppItemsObra = itemsEppObraMes(obra, mes);
    const nuevosObra = personalNuevoObraMes(obra, mes);
    const nombreResponsable = (responsable || '').trim() || 'Prevención de Riesgos';
    const negro = rgb(0,0,0), gris = rgb(0.4,0.4,0.4), grisLinea = rgb(0.75,0.75,0.75), grisClaro = rgb(0.85,0.85,0.85);
    const colorResultado = { green: rgb(0.18,0.49,0.2), blue: rgb(0.08,0.4,0.75), amber: rgb(0.9,0.35,0), red: rgb(0.78,0.16,0.16) };

    // Aro de progreso circular — pdf-lib no trae gráficos nativos, se arma
    // encadenando segmentos de línea alrededor de una circunferencia (con
    // 72 segmentos ya se ve como un círculo liso a esta escala) en vez de
    // usar arcos SVG, para no depender de cómo pdf-lib interpreta el
    // sistema de coordenadas de un <path> — así todo el trazado queda en
    // el mismo sistema (origen abajo-izquierda) que el resto del PDF, sin
    // sorpresas. Arranca arriba (12 en punto) y avanza en sentido horario.
    function dibujarAnilloProgreso(page, cx, cy, radio, grosor, pct, colorFondo, colorProgreso) {
      const pasos = 72;
      for (let i = 0; i < pasos; i++) {
        const a0 = (i / pasos) * 2 * Math.PI, a1 = ((i + 1) / pasos) * 2 * Math.PI;
        page.drawLine({
          start: { x: cx + radio * Math.cos(a0), y: cy + radio * Math.sin(a0) },
          end: { x: cx + radio * Math.cos(a1), y: cy + radio * Math.sin(a1) },
          thickness: grosor, color: colorFondo,
        });
      }
      const pasosProgreso = Math.round(pasos * (Math.max(0, Math.min(100, pct)) / 100));
      const anguloInicio = -Math.PI / 2;
      for (let i = 0; i < pasosProgreso; i++) {
        const a0 = anguloInicio + (i / pasos) * 2 * Math.PI, a1 = anguloInicio + ((i + 1) / pasos) * 2 * Math.PI;
        page.drawLine({
          start: { x: cx + radio * Math.cos(a0), y: cy + radio * Math.sin(a0) },
          end: { x: cx + radio * Math.cos(a1), y: cy + radio * Math.sin(a1) },
          thickness: grosor, color: colorProgreso,
        });
      }
    }
    // Cumplimiento por supervisor: un aro de progreso por supervisor (en
    // vez de barras) con el % al centro y el nombre debajo.
    function dibujarBarrasCumplimiento(page, x, yBase, gruposChart) {
      const radio = 30, grosor = 8, gap = 24;
      let cx = x + radio;
      const cy = yBase + radio + 16;
      page.drawText('CUMPLIMIENTO POR SUPERVISOR', { x, y: cy + radio + 30, size: 11, font: fontBold, color: negro });
      gruposChart.forEach(g => {
        dibujarAnilloProgreso(page, cx, cy, radio, grosor, g.pct, grisClaro, colorResultado[g.resultado.color]);
        const valTxt = g.pct + '%';
        const valW = fontBold.widthOfTextAtSize(valTxt, 13);
        page.drawText(valTxt, { x: cx - valW / 2, y: cy - 5, size: 13, font: fontBold, color: negro });
        const partes = g.supervisor.split(' ');
        [partes[0] || '', partes.slice(1).join(' ')].forEach((linea, i) => {
          const lw = font.widthOfTextAtSize(linea, 7.5);
          page.drawText(linea, { x: cx - lw / 2, y: cy - radio - 14 - i * 10, size: 7.5, font, color: gris });
        });
        cx += radio * 2 + gap;
      });
    }
    // Comparativo año actual vs. año anterior para un índice de seguridad:
    // una medalla circular sólida con el valor actual al centro y, debajo,
    // el valor del año anterior con la tendencia en palabras (nunca con
    // flechas ▲▼ — esos glyphs no existen en la fuente estándar que usa
    // pdf-lib y salen como recuadros vacíos en algunos lectores de PDF,
    // el mismo problema que ya se corrigió con el separador "·"). En estos
    // 3 índices menos es mejor, así que una baja se pinta en verde.
    function dibujarComparativoIndice(page, x, yBase, opts) {
      const { nombre, actual, prev, anioActual, color, fmt } = opts;
      const radio = 32;
      const anchoGrupo = radio * 2 + 16;
      const cx = x + anchoGrupo / 2;
      const cy = yBase + radio + 20;
      const nombreW = fontBold.widthOfTextAtSize(nombre, 9);
      page.drawText(nombre, { x: cx - nombreW / 2, y: cy + radio + 30, size: 9, font: fontBold, color: negro });
      page.drawCircle({ x: cx, y: cy, size: radio, color });
      const actTxt = fmt(actual);
      const actW = fontBold.widthOfTextAtSize(actTxt, 14);
      page.drawText(actTxt, { x: cx - actW / 2, y: cy - 5, size: 14, font: fontBold, color: rgb(1,1,1) });
      const cambio = actual - prev;
      const igual = Math.abs(cambio) < 0.0001;
      const mejoro = cambio < 0;
      const colorTendencia = igual ? gris : (mejoro ? rgb(0.18,0.49,0.2) : rgb(0.78,0.16,0.16));
      const tendenciaTxt = igual ? 'igual' : (mejoro ? 'bajó' : 'subió');
      const prevTxt = `${anioActual - 1}: ${fmt(prev)} (${tendenciaTxt})`;
      const prevW = font.widthOfTextAtSize(prevTxt, 8);
      page.drawText(prevTxt, { x: cx - prevW / 2, y: cy - radio - 16, size: 8, font, color: colorTendencia });
    }
    // Lista de barras horizontales genérica (label + barra + cantidad),
    // reutilizada para cada desglose de "Estado general de la obra" y para
    // el detalle de EPP — pares ya viene ordenado de mayor a menor. Las
    // barras son "píldora" (puntas redondas) en vez de rectángulos rectos.
    function dibujarListaBarras(page, x, y, anchoCol, pares, colorBarra) {
      if (pares.length === 0) {
        page.drawText('Sin datos en el período.', { x, y, size: 8.5, font, color: gris });
        return y - 14;
      }
      const xBarraOffset = Math.min(120, anchoCol * 0.45);
      const anchoMaxBarra = anchoCol - xBarraOffset - 26;
      const max = Math.max(...pares.map(([, c]) => c));
      const altoBarra = 9, radioBarra = altoBarra / 2;
      pares.forEach(([label, cantidad]) => {
        const labelCorto = font.widthOfTextAtSize(label, 8.5) > xBarraOffset - 6
          ? label.slice(0, Math.floor((xBarraOffset - 6) / 4.6)) + '…' : label;
        page.drawText(labelCorto, { x, y: y + 1, size: 8.5, font, color: negro });
        const w = Math.max(altoBarra, (cantidad / max) * anchoMaxBarra);
        const xBarra = x + xBarraOffset, yc = y + radioBarra;
        page.drawCircle({ x: xBarra + radioBarra, y: yc, size: radioBarra, color: colorBarra });
        page.drawCircle({ x: xBarra + w - radioBarra, y: yc, size: radioBarra, color: colorBarra });
        page.drawRectangle({ x: xBarra + radioBarra, y, width: Math.max(0, w - altoBarra), height: altoBarra, color: colorBarra });
        page.drawText(String(cantidad), { x: xBarra + w + 5, y: y + 1, size: 8.5, font: fontBold, color: negro });
        y -= 15;
      });
      return y;
    }

    function encabezado(page, W, H) {
      page.drawImage(logoImg, { x: 40, y: H - 46, width: logoDim.width, height: logoDim.height });
      const tituloTxt = 'INFORME PROGRAMA PERSONALIZADO';
      page.drawText(tituloTxt, { x: W/2 - fontBold.widthOfTextAtSize(tituloTxt, 13)/2, y: H - 40, size: 13, font: fontBold, color: negro });
      const info = `${obra} - ${nombreMes(mes)}`;
      page.drawText(info, { x: W - 40 - font.widthOfTextAtSize(info, 9), y: H - 40, size: 9, font, color: gris });
      page.drawLine({ start: { x: 40, y: H - 58 }, end: { x: W - 40, y: H - 58 }, thickness: 1, color: grisLinea });
    }

    // ---- Página 1: Portada ----
    let page = pdfDoc.addPage([612, 792]);
    encabezado(page, 612, 792);
    let y = 792 - 220;
    const titulo = 'INFORME PROGRAMA PERSONALIZADO';
    page.drawText(titulo, { x: 306 - fontBold.widthOfTextAtSize(titulo, 22)/2, y, size: 22, font: fontBold, color: negro });
    y -= 30;
    const sub = `${obra} — ${nombreMes(mes)}`;
    page.drawText(sub, { x: 306 - font.widthOfTextAtSize(sub, 13)/2, y, size: 13, font, color: gris });
    y -= 60;
    // Aro grande con el % total del período como imagen principal de la
    // portada, en vez de solo texto — el color ya comunica el resultado
    // (verde/azul/ámbar/rojo) antes de leer la palabra.
    const radioPortada = 52;
    const colorPortada = colorResultado[resultadoTotal.color] || negro;
    dibujarAnilloProgreso(page, 306, y - radioPortada, radioPortada, 13, total, grisClaro, colorPortada);
    const totalTxt = total + '%';
    const totalW = fontBold.widthOfTextAtSize(totalTxt, 22);
    page.drawText(totalTxt, { x: 306 - totalW / 2, y: y - radioPortada - 8, size: 22, font: fontBold, color: negro });
    y -= radioPortada * 2 + 26;
    const resTxt = `Resultado del período: ${resultadoTotal.label}`;
    page.drawText(resTxt, { x: 306 - fontBold.widthOfTextAtSize(resTxt, 13)/2, y, size: 13, font: fontBold, color: colorPortada });
    y -= 100;
    page.drawText('REALIZADO POR', { x: 80, y, size: 9, font: fontBold, color: gris });
    page.drawLine({ start: { x: 80, y: y - 24 }, end: { x: 280, y: y - 24 }, thickness: 0.8, color: negro });
    page.drawText(nombreResponsable, { x: 80, y: y - 36, size: 9, font, color: gris });
    page.drawText('REVISADO Y APROBADO POR', { x: 332, y, size: 9, font: fontBold, color: gris });
    page.drawLine({ start: { x: 332, y: y - 24 }, end: { x: 532, y: y - 24 }, thickness: 0.8, color: negro });
    page.drawText('Jefatura de Obra', { x: 332, y: y - 36, size: 9, font, color: gris });

    // ---- Página 2: Objetivo / alcance ----
    page = pdfDoc.addPage([612, 792]);
    encabezado(page, 612, 792);
    y = 792 - 90;
    function parrafo(tituloTxt, texto) {
      page.drawText(tituloTxt, { x: 40, y, size: 11, font: fontBold, color: negro });
      y -= 18;
      const maxWidth = 532, size = 10, lineHeight = 14;
      const words = texto.split(/\s+/);
      let current = '';
      const lines = [];
      for (const w of words) {
        const test = current ? current + ' ' + w : w;
        if (font.widthOfTextAtSize(test, size) > maxWidth && current) { lines.push(current); current = w; } else current = test;
      }
      if (current) lines.push(current);
      lines.forEach(line => { page.drawText(line, { x: 40, y, size, font, color: negro }); y -= lineHeight; });
      y -= 16;
    }
    parrafo('1. Objetivo General', `Presentar la situación general de prevención de riesgos de la obra ${obra} durante ${nombreMes(mes)}, junto con el cumplimiento del Programa Personalizado de actividades de cada supervisor.`);
    parrafo('2. Objetivo Específico', `Medir el porcentaje de cumplimiento de cada actividad comprometida por cada supervisor según su frecuencia (diaria, semanal, quincenal o mensual), evidenciando su aporte individual a la gestión preventiva.`);
    parrafo('3. Alcance', `Este informe cubre la dotación, inspecciones, incidentes y accidentes, charlas y HCR de la obra ${obra} durante ${nombreMes(mes)}, además del cumplimiento del programa personalizado, la entrega de EPP, el ingreso de personal nuevo y los índices de seguridad vigentes de la obra.`);

    // ---- Página 3: Estado general de la obra ----
    page = pdfDoc.addPage([612, 792]);
    encabezado(page, 612, 792);
    y = 792 - 90;
    page.drawText('ESTADO GENERAL DE LA OBRA', { x: 40, y, size: 12, font: fontBold, color: negro });
    y -= 10;
    page.drawText(`${obra} - ${nombreMes(mes)}`, { x: 40, y: y - 10, size: 9, font, color: gris });

    const trabajadoresObraLista = allTrabajadores.filter(t => t.obra === obra && t.estado === 'Activo');
    const porCargo = Object.entries(trabajadoresObraLista.reduce((acc, t) => {
      const c = t.cargo || 'Sin cargo'; acc[c] = (acc[c] || 0) + 1; return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const inspMes = allInspecciones.filter(i => i.obra === obra && (i.fecha || '').slice(0, 7) === mes);
    const inspAbiertas = inspMes.filter(i => i.estado !== 'Cerrada').length;
    const porRiesgo = Object.entries(inspMes.reduce((acc, i) => {
      const r = i.riesgo || 'Sin dato'; acc[r] = (acc[r] || 0) + 1; return acc;
    }, {})).sort((a, b) => b[1] - a[1]);

    const incMes = allIncidentes.filter(i => i.obra === obra && (i.fecha || '').slice(0, 7) === mes);
    const diasPerdidosMes = incMes.reduce((s, i) => s + (i.diasPerdidos || 0), 0);
    const porTipoIncidente = Object.entries(incMes.reduce((acc, i) => {
      const t = i.tipo || 'Sin tipo'; acc[t] = (acc[t] || 0) + 1; return acc;
    }, {})).sort((a, b) => b[1] - a[1]);

    const charlasRealizadasMes = allCharlas.filter(c => c.obra === obra && c.estado === 'Realizada' && (c.fechaRealizada || '').slice(0, 7) === mes).length;
    const charlasPendientes = allCharlas.filter(c => c.obra === obra && c.estado === 'Pendiente').length;
    const hcrMes = allHcr.filter(h => h.obra === obra && (h.fecha || '').slice(0, 7) === mes).length;

    const colIzq = 40, colDer = 326, anchoCol = 246;
    let yFila1 = y - 40;
    // Dotación (arriba-izquierda)
    page.drawText('DOTACIÓN DE LA OBRA', { x: colIzq, y: yFila1, size: 10, font: fontBold, color: negro });
    let yc = yFila1 - 18;
    page.drawText(`Trabajadores activos: ${trabajadoresObraLista.length}`, { x: colIzq, y: yc, size: 9, font, color: negro }); yc -= 13;
    page.drawText(`Ingresos nuevos este mes: ${nuevosObra}`, { x: colIzq, y: yc, size: 9, font, color: negro }); yc -= 16;
    page.drawText('Por cargo:', { x: colIzq, y: yc, size: 8.5, font: fontBold, color: gris }); yc -= 13;
    dibujarListaBarras(page, colIzq, yc, anchoCol, porCargo, colorResultado.blue);

    // Inspecciones (arriba-derecha)
    page.drawText('INSPECCIONES DEL MES', { x: colDer, y: yFila1, size: 10, font: fontBold, color: negro });
    yc = yFila1 - 18;
    page.drawText(`Total: ${inspMes.length}   Abiertas: ${inspAbiertas}   Cerradas: ${inspMes.length - inspAbiertas}`, { x: colDer, y: yc, size: 9, font, color: negro }); yc -= 16;
    page.drawText('Por nivel de riesgo:', { x: colDer, y: yc, size: 8.5, font: fontBold, color: gris }); yc -= 13;
    dibujarListaBarras(page, colDer, yc, anchoCol, porRiesgo, colorResultado.amber);

    let yFila2 = yFila1 - 230;
    // Incidentes y accidentes (abajo-izquierda)
    page.drawText('INCIDENTES Y ACCIDENTES DEL MES', { x: colIzq, y: yFila2, size: 10, font: fontBold, color: negro });
    yc = yFila2 - 18;
    page.drawText(`Total: ${incMes.length}   Días perdidos: ${diasPerdidosMes}`, { x: colIzq, y: yc, size: 9, font, color: negro }); yc -= 16;
    page.drawText('Por tipo:', { x: colIzq, y: yc, size: 8.5, font: fontBold, color: gris }); yc -= 13;
    dibujarListaBarras(page, colIzq, yc, anchoCol, porTipoIncidente, colorResultado.red);

    // Charlas y HCR (abajo-derecha)
    page.drawText('CHARLAS Y HCR', { x: colDer, y: yFila2, size: 10, font: fontBold, color: negro });
    yc = yFila2 - 18;
    page.drawText(`Charlas dictadas este mes: ${charlasRealizadasMes}`, { x: colDer, y: yc, size: 9, font, color: negro }); yc -= 13;
    page.drawText(`Charlas pendientes: ${charlasPendientes}`, { x: colDer, y: yc, size: 9, font, color: negro }); yc -= 13;
    page.drawText(`HCR registrados este mes: ${hcrMes}`, { x: colDer, y: yc, size: 9, font, color: negro }); yc -= 16;
    dibujarListaBarras(page, colDer, yc, anchoCol, [['Charlas', charlasRealizadasMes], ['HCR', hcrMes]].filter(([, c]) => c > 0), colorResultado.green);

    // ---- Página 4: Resumen del Programa Personalizado ----
    page = pdfDoc.addPage([612, 792]);
    encabezado(page, 612, 792);
    y = 792 - 90;
    page.drawText('ACTIVIDADES CONTROL PREVENTIVO EN OBRA', { x: 40, y, size: 12, font: fontBold, color: negro });
    y -= 16;
    page.drawText('Meta: cumplir con el 95% del programa personalizado de cada supervisor.', { x: 40, y, size: 9, font, color: gris });
    y -= 24;

    const colsResumen = [
      { w: 150, text: 'Supervisor', bold: true },
      { w: 80, text: nombreMes(mes).split(' ')[0] + ' %', bold: true, align: 'center' },
      { w: 60, text: 'EPP', bold: true, align: 'center' },
      { w: 60, text: 'Nuevos', bold: true, align: 'center' },
      { w: 122, text: 'Resultado', bold: true, align: 'center' },
    ];
    y = dibujarFilaTabla(page, 40, y, colsResumen, font, fontBold, 20, rgb(0.94,0.94,0.94), negro, grisLinea);
    grupos.forEach(g => {
      y = dibujarFilaTabla(page, 40, y, [
        { w: 150, text: g.supervisor },
        { w: 80, text: g.pct + '%', align: 'center' },
        { w: 60, text: String(g.epp), align: 'center' },
        { w: 60, text: String(g.nuevos), align: 'center' },
        { w: 122, text: g.resultado.label, align: 'center', color: colorResultado[g.resultado.color] },
      ], font, fontBold, 18, null, negro, grisLinea);
    });
    y = dibujarFilaTabla(page, 40, y, [
      { w: 150, text: 'TOTAL OBRA', bold: true },
      { w: 80, text: total + '%', bold: true, align: 'center' },
      { w: 60, text: String(eppEntregasObra), bold: true, align: 'center' },
      { w: 60, text: String(nuevosObra), bold: true, align: 'center' },
      { w: 122, text: resultadoTotal.label, bold: true, align: 'center', color: colorResultado[resultadoTotal.color] },
    ], font, fontBold, 20, rgb(0.94,0.94,0.94), negro, grisLinea);

    y -= 20;
    page.drawText('Escala de resultado:', { x: 40, y, size: 9, font: fontBold, color: negro });
    y -= 14;
    const leyenda = [['81-100','Excelente','green'],['61-80','Bueno','blue'],['41-60','Regular','amber'],['21-40','Malo','amber'],['Menor a 20','Muy Malo','red']];
    leyenda.forEach(([rango, label, color]) => {
      page.drawRectangle({ x: 40, y: y - 8, width: 8, height: 8, color: colorResultado[color] });
      page.drawText(`${rango}: ${label}`, { x: 54, y: y - 8, size: 8, font, color: gris });
      y -= 12;
    });
    y -= 14;
    // Conclusión automática — se redacta sola a partir de los mismos
    // números de arriba (no es un texto fijo): cambia si cambian los datos.
    parrafo('Conclusión', `En resumen, el cumplimiento con las actividades de prevención del programa personalizado durante ${nombreMes(mes)} es de un ${total}% (${resultadoTotal.label}), considerando que cada uno de los ${grupos.length} supervisor(es) de la obra ${obra} responde por su propio programa de actividades. En el período se entregaron ${eppItemsObra.totalItems} implemento(s) de protección personal (en ${eppItemsObra.entregas} entrega(s)) y se incorporaron ${nuevosObra} trabajador(es) nuevo(s) a la obra.`);

    y -= 20;
    dibujarBarrasCumplimiento(page, 40, y - 130, grupos);

    // ---- Página 5: Índices de seguridad de la obra ----
    page = pdfDoc.addPage([612, 792]);
    encabezado(page, 612, 792);
    y = 792 - 90;
    page.drawText('ÍNDICES DE SEGURIDAD DE LA OBRA', { x: 40, y, size: 12, font: fontBold, color: negro });
    y -= 24;
    const st = calcularEstadisticasSeguridad(obra, 0);
    const stPrev = calcularEstadisticasSeguridad(obra, 1);
    [
      ['Tasa Accidentabilidad', st.tasaAccidentabilidad.toFixed(1) + '%'],
      ['Índice de Frecuencia', String(Math.round(st.indiceFrecuencia))],
      ['Índice de Gravedad', String(Math.round(st.indiceGravedad))],
      ['Horas Hombre Trabajadas (estimadas)', Math.round(st.horasHombre).toLocaleString('es-CL')],
    ].forEach(([label, valor]) => {
      page.drawText(label, { x: 40, y, size: 11, font, color: negro });
      page.drawText(valor, { x: 420, y, size: 11, font: fontBold, color: negro });
      y -= 20;
    });
    y -= 6;
    page.drawText(`Acumulado ${st.anio} - ${st.nAccidentes} accidente(s) con tiempo perdido.`, { x: 40, y, size: 9, font, color: gris });

    y -= 40;
    const yBaseIndices = y - 90;
    dibujarComparativoIndice(page, 40, yBaseIndices, { nombre: 'Tasa Accident.', actual: st.tasaAccidentabilidad, prev: stPrev.tasaAccidentabilidad, anioActual: st.anio, color: colorResultado.blue, fmt: v => v.toFixed(1) + '%' });
    dibujarComparativoIndice(page, 200, yBaseIndices, { nombre: 'Índice Frecuencia', actual: st.indiceFrecuencia, prev: stPrev.indiceFrecuencia, anioActual: st.anio, color: colorResultado.amber, fmt: v => String(Math.round(v)) });
    dibujarComparativoIndice(page, 360, yBaseIndices, { nombre: 'Índice Gravedad', actual: st.indiceGravedad, prev: stPrev.indiceGravedad, anioActual: st.anio, color: colorResultado.red, fmt: v => String(Math.round(v)) });

    y = yBaseIndices - 40;
    page.drawText('ENTREGA DE EPP EN LA OBRA', { x: 40, y, size: 12, font: fontBold, color: negro });
    y -= 20;
    page.drawText(`${eppItemsObra.entregas} entrega(s) registrada(s) en ${nombreMes(mes)} - ${eppItemsObra.totalItems} implemento(s) en total.`, { x: 40, y, size: 10, font, color: negro });
    y -= 22;
    const itemsOrdenados = Object.entries(eppItemsObra.items).sort((a, b) => b[1] - a[1]);
    if (itemsOrdenados.length === 0) {
      page.drawText('Sin entregas de EPP registradas en el período.', { x: 40, y, size: 9, font, color: gris });
    } else {
      // Barras horizontales: ancho proporcional a la cantidad, con el
      // nombre del ítem a la izquierda y el número al final de la barra.
      const maxCantidad = Math.max(...itemsOrdenados.map(([, c]) => c));
      const anchoMaxBarra = 260, xBarras = 190;
      itemsOrdenados.forEach(([item, cantidad]) => {
        page.drawText(item, { x: 40, y: y + 2, size: 9, font, color: negro });
        const w = Math.max(4, (cantidad / maxCantidad) * anchoMaxBarra);
        page.drawRectangle({ x: xBarras, y, width: w, height: 10, color: colorResultado.blue });
        page.drawText(String(cantidad), { x: xBarras + w + 6, y: y + 2, size: 9, font: fontBold, color: negro });
        y -= 17;
      });
    }

    // ---- Páginas 6+: grilla día a día por supervisor (horizontal, para que
    // entren los 28-31 días como columnas) ----
    const ctx = { font, fontBold, negro, gris, grisLinea, colorResultado, rgb };
    for (const g of grupos) {
      await dibujarPaginaGrillaSupervisor(pdfDoc, ctx, encabezado, obra, mes, g);
    }

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const nombreArchivo = `programa_personalizado_${obra}_${mes}`.replace(/\s+/g, '_');
    const up = await uploadFile(blob, 'Programa Personalizado', nombreArchivo, 'pdf');
    window.open(up.link, '_blank');
    toast('Informe generado ✓', 'ok');
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
  document.getElementById('splash').classList.remove('hidden');
  document.getElementById('splash-progress').classList.add('splash-waiting');
  document.getElementById('chip-email').textContent = userEmail || '';
  document.getElementById('dt-chip-email').textContent = userEmail || '';
  document.getElementById('chip-footer-email').textContent = userEmail || '';
  document.getElementById('dt-footer-email').textContent = userEmail || '';
  document.getElementById('dt-home-email').textContent = userEmail || '';
  renderModulosHome();
  configurarAccesosDirectos();
  actualizarContadorPlantillasCharla();

  await cargarTodo();

  const splashEl = document.getElementById('splash');

  // Una cuenta subcontratista (USUARIOS.Rol="subcontratista") nunca ve
  // Inicio ni el resto de los módulos — cargarTodo() ya detectó esto y dejó
  // el nombre de su empresa en miEmpresaSubcontratista. Se le muestra
  // directamente su pantalla fija (#subcontratista-root) en vez de #main/
  // #desktop-home, que quedan ocultos igual que si nunca hubieran existido.
  // Un supervisor logueado (ver miSupervisorPerfil) está fijo a la Obra de
  // su propia ficha — no elige obra ni la puede cambiar (el botón "Cambiar
  // obra" queda oculto, ver actualizarChipObraActiva).
  if (miSupervisorPerfil) {
    obraActiva = miSupervisorPerfil.obra;
    localStorage.setItem(OBRA_ACTIVA_KEY, obraActiva);
  }

  if (miEmpresaSubcontratista) {
    mostrarModoSubcontratista(miEmpresaSubcontratista);
    const root = document.getElementById('subcontratista-root');
    root.classList.add('app-enter');
    setTimeout(() => root.classList.remove('app-enter'), 500);
  } else if (!obraActiva) {
    // Primera vez que esta cuenta entra (o cerró sesión/cambió de
    // dispositivo): hay que elegir la Obra activa antes de ver la app.
    // seleccionarObraActiva() es quien revela #main una vez elegida.
    renderSelectorObraActiva(false);
  } else {
    actualizarChipObraActiva();
    // Revela la app con una pequeña animación de aparición, en vez de
    // que todo salte de golpe apenas termina de cargar. Siempre arranca en
    // Inicio: en escritorio esa es la página completa sin sidebar
    // (desktop-home); el sidebar + panel central solo aparecen al entrar
    // a un módulo (ver irPagina en index.html).
    const main = document.getElementById('main');
    const dtHome = document.getElementById('desktop-home');
    irPagina('inicio');
    main.classList.remove('hidden');
    [main, dtHome].forEach(el => el.classList.add('app-enter'));
    setTimeout(() => [main, dtHome].forEach(el => el.classList.remove('app-enter')), 500);
  }

  splashEl.style.opacity = '0';
  setTimeout(() => { splashEl.classList.add('hidden'); splashEl.style.opacity = ''; }, 380);
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
      // Si el navegador bloquea el popup del intento silencioso (puede pasar
      // porque este intento arranca solo, sin un tap directo del usuario que
      // lo autorice — algunos navegadores/dispositivos bloquean cualquier
      // popup que no venga pegado a un gesto real), reintentar con el mismo
      // truco tampoco sirve: el navegador lo va a volver a bloquear. Por eso
      // acá se reintenta como máximo una vez (antes eran 2, ~20s de espera)
      // y con timeouts más cortos, para llegar rápido al botón manual
      // "Iniciar sesión" — un tap real sí abre el popup sin que lo bloqueen.
      const watchdog = setTimeout(() => {
        if (resuelto) return;
        resuelto = true;
        tokenClient.callback = prevCb;
        if (intentos < 2) { setTimeout(intentarSilencioso, 600); }
        else { mostrarLogin('Usa tu cuenta corporativa autorizada', false); }
      }, 3000);
      tokenClient.callback = async (resp) => {
        if (resuelto) return;
        resuelto = true;
        clearTimeout(watchdog);
        tokenClient.callback = prevCb;
        if (resp.error) {
          if (intentos < 2 && resp.error !== 'access_denied') { setTimeout(intentarSilencioso, 600); }
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

// ============================================================
// MÓDULO: MATRIZ DE RIESGOS (IPER, DS44)
// ------------------------------------------------------------
// Automatiza el Excel "Miper DS44": Anexo 1 (Levantamiento de procesos y
// tareas) alimenta la Matriz de Riesgos (Anexo 2-5 = catálogo de riesgos,
// Probabilidad × Consecuencia = VEP → Nivel de Riesgo automático), Anexo 6
// queda como checklist de Protocolos MINSAL, y el encabezado + 3 firmas +
// Revisión/Próxima Revisión se genera como documento PDF y/o Excel.
// ============================================================
const MIPER_FAMILIA_LABEL = {
  SEGURIDAD: 'Seguridad', HIGIENE: 'Higiene',
  MUSCULO_ESQUELETICO: 'Músculo-Esquelético', PSICOSOCIAL: 'Psicosocial',
};

let obraMiperSel = 'todas';
function obraMiperEfectiva() {
  const obraGlobal = obraFiltroActivo();
  const obras = opcionesObrasDisponibles();
  return obraGlobal || (obraMiperSel !== 'todas' && obras.includes(obraMiperSel) ? obraMiperSel : null);
}
function onCambioObraMiper(v) { obraMiperSel = v; renderMiper(); }

function renderMiper() {
  const obraGlobal = obraFiltroActivo();
  const obras = opcionesObrasDisponibles();
  const obraEfectiva = obraMiperEfectiva();
  const selectorObraHtml = obraGlobal ? '' : `
    <div class="stats-obra-bar">${ic('obra',16)}
      <select class="obra-selector" onchange="onCambioObraMiper(this.value)">
        <option value="todas">Elige una obra...</option>
        ${obras.map(o => `<option value="${esc(o)}" ${o===obraMiperSel?'selected':''}>${esc(o)}</option>`).join('')}
      </select>
    </div>`;
  if (!obraEfectiva) {
    setListHTML('miper', selectorObraHtml + emptyState('Elige una obra', 'Selecciona una obra arriba para ver su Matriz de Riesgos (IPER)'));
    return;
  }

  const tareas = allMiperLevantamiento.filter(t => t.obra === obraEfectiva);
  const filas = allMiperMatriz.filter(f => f.obra === obraEfectiva);
  const docs = allMiperDocumentos.filter(d => d.obra === obraEfectiva).sort((a,b) => b.fila - a.fila);
  const ultimoDoc = docs[0] || null;

  const conteoNivel = { Tolerable: 0, Moderado: 0, Importante: 0, Intolerable: 0 };
  filas.forEach(f => { if (conteoNivel[f.nivelRiesgo] !== undefined) conteoNivel[f.nivelRiesgo]++; });
  const nivelBadges = MIPER_VEP.map(v => `<span class="badge ${v.color}">${conteoNivel[v.nombre]} ${v.nombre}</span>`).join('');

  let avisoRevision = '';
  if (ultimoDoc && ultimoDoc.proximaRevision) {
    const dias = Math.round((new Date(ultimoDoc.proximaRevision) - new Date(hoyISO())) / 86400000);
    if (dias < 0) avisoRevision = `<span class="badge red">Revisión vencida hace ${Math.abs(dias)} día(s)</span>`;
    else if (dias <= 30) avisoRevision = `<span class="badge amber">Próxima revisión en ${dias} día(s)</span>`;
    else avisoRevision = `<span class="badge green">Próxima revisión: ${ddmmyyyy(ultimoDoc.proximaRevision)}</span>`;
  }

  setListHTML('miper', `
    ${selectorObraHtml}
    <div class="card card--default">
      <div class="card-icon modulo-icon--and">${ic('miper',18)}</div>
      <div class="card-body">
        <div class="card-title">${tareas.length} tarea(s) levantada(s) · ${filas.length} riesgo(s) evaluado(s)</div>
        <div class="badge-row">${filas.length ? nivelBadges : '<span class="badge gray">Sin riesgos evaluados todavía</span>'}</div>
      </div>
    </div>

    <div class="sec-label" style="margin-top:14px;">Levantamiento de procesos y tareas</div>
    ${(() => {
      const nPartidas = allMiperPrograma.filter(p => p.obra === obraEfectiva).length;
      return `<div class="card-sub" style="margin-bottom:8px;">${nPartidas
        ? `${nPartidas} partida(s) del Programa Edificio importadas — el Proceso/Tarea se eligen de esa lista.`
        : 'Sin Programa Edificio importado — el Proceso/Tarea se escriben libres.'}</div>
      <button class="action-btn" onclick="abrirImportarProgramaMiper()">${ic('hoja',14)} ${nPartidas ? 'Reimportar' : 'Importar'} Programa Edificio (Excel)</button>`;
    })()}
    <button class="action-btn" onclick="abrirFormMiperTarea()">${ic('hoja',14)} Agregar tarea</button>
    ${tareas.length === 0 ? emptyState('Sin tareas levantadas', 'Agrega la primera tarea con el botón de arriba') :
      tareas.slice().reverse().map(t => `
      <div class="card card--default">
        <div class="card-body">
          <div class="card-title">${esc(t.proceso)} — ${esc(t.tarea)}</div>
          <div class="card-sub">${esc(t.puesto)} · ${esc(t.rutinaria)}${t.lugar ? ' · ' + esc(t.lugar) : ''}</div>
          <div class="badge-row"><span class="badge blue">${t.nPersonas || 0} persona(s)</span>${t.sexo ? `<span class="badge gray">${esc(t.sexo)}</span>` : ''}</div>
        </div>
      </div>`).join('')}

    <div class="sec-label" style="margin-top:14px;">Matriz de riesgos</div>
    <button class="action-btn" onclick="${tareas.length ? "abrirFormMiperFila()" : "toast('Primero agrega una tarea en el Levantamiento','error')"}">${ic('miper',14)} Agregar riesgo</button>
    ${filas.length === 0 ? emptyState('Sin riesgos en la matriz', 'Agrega el primer riesgo evaluado con el botón de arriba') :
      filas.slice().reverse().map(f => {
        const nivel = MIPER_VEP.find(v => v.nombre === f.nivelRiesgo) || MIPER_VEP[0];
        return `
      <div class="card card--default">
        <div class="card-body">
          <div class="card-title">${esc(f.riesgo)}</div>
          <div class="card-sub">${esc(f.proceso)} — ${esc(f.tarea)}</div>
          <div class="card-sub">${esc(f.peligro)}</div>
          <div class="badge-row"><span class="badge ${nivel.color}">${esc(f.nivelRiesgo)} · VEP ${f.vep}</span>${f.codigoRiesgo ? `<span class="badge gray">${esc(f.codigoRiesgo)}</span>` : ''}</div>
        </div>
      </div>`;
      }).join('')}

    <div class="sec-label" style="margin-top:14px;">Documento</div>
    <div class="card card--default" onclick="abrirDocumentoMiper()">
      <div class="card-icon modulo-icon--and">${ic('documento',18)}</div>
      <div class="card-body">
        <div class="card-title">${ultimoDoc ? `Revisión ${ultimoDoc.revision}` : 'Sin documento generado todavía'}</div>
        <div class="card-sub">${ultimoDoc ? `Generado el ${esc(ultimoDoc.fecha)}` : 'Completa el encabezado, firmas y protocolos para generar el PDF/Excel'}</div>
        ${avisoRevision ? `<div class="badge-row">${avisoRevision}</div>` : ''}
      </div>
      <div class="card-arrow">›</div>
    </div>
  `);
}

// ── Botón "+" del módulo: siempre abre Levantamiento (paso obligatorio
// antes de poder agregar filas a la matriz) ──
function abrirMenuAgregarMiper() {
  if (!obraMiperEfectiva()) { toast('Elige una obra primero', 'error'); return; }
  abrirFormMiperTarea();
}

// ── Programa Edificio: cada obra puede importar su propio programa real
// (el Excel de programación con las partidas de la obra) para que el
// Levantamiento (Anexo 1) elija Proceso/Tarea de esa lista real en vez de
// texto libre — a pedido explícito del cliente, mostrando como ejemplo su
// archivo "PROGRAMA EDIFICIO – RENDIMIENTOS REALES DE TERRENO": cada fila
// de partida trae un código ITEM + nombre + unidad; las filas que solo
// tienen ITEM (sin nombre de partida) son encabezados de sección
// ("A.1 INSTALACION DE FAENAS...") y se usan como Proceso para las
// partidas que vienen debajo, hasta el próximo encabezado.
function limpiarNombreProcesoPrograma(texto) {
  return texto.replace(/^[A-Z]{1,4}\.[A-Z0-9.]*-?\s+/, '').trim() || texto.trim();
}
function abrirImportarProgramaMiper() {
  const obraEfectiva = obraMiperEfectiva() || obraPreseleccionada();
  document.getElementById('miper-programa-body').innerHTML = `
    <div class="card-sub" style="margin-bottom:12px;">
      Sube el Excel de programación de la obra (el mismo que usa la oficina técnica). Así, al agregar una tarea vas a poder elegir el Proceso y la Tarea de una lista real, en vez de escribirlos a mano. Si no lo tienes a mano, no pasa nada: puedes seguir sin este paso y escribirlo directo.
    </div>
    <div class="form-group"><label>Obra</label>
      <select id="select-miper-programa-obra" onchange="onCambioObraSelect(this,'input-miper-programa-obra-otra')">${opcionesObraSelectHTML(obraEfectiva)}</select>
      <input type="text" id="input-miper-programa-obra-otra" class="hidden" placeholder="Nombre de la obra" style="margin-top:8px;">
    </div>
    <div class="form-group"><label>Archivo Excel del programa</label>
      <input type="file" id="input-miper-programa-archivo" accept=".xlsx" onchange="procesarArchivoProgramaMiper(this)">
    </div>
    <div id="miper-programa-preview"></div>
  `;
  const selObra = document.getElementById('select-miper-programa-obra');
  onCambioObraSelect(selObra, 'input-miper-programa-obra-otra');
  miperProgramaParseado = null;
  openPanel('panel-miper-programa');
}
let miperProgramaParseado = null;
async function procesarArchivoProgramaMiper(inputEl) {
  const file = inputEl.files[0];
  if (!file) return;
  const preview = document.getElementById('miper-programa-preview');
  preview.innerHTML = '<div class="card-sub">Leyendo archivo...</div>';
  try {
    const ExcelJS = await cargarExcelJsLib();
    const buf = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets.find(w => /programa/i.test(w.name)) ||
      wb.worksheets.reduce((mejor, w) => (!mejor || w.rowCount > mejor.rowCount ? w : mejor), null);
    if (!ws) throw new Error('El archivo no tiene hojas.');
    let colItem = null, colPartida = null, colUnidad = null, filaHeader = null;
    ws.eachRow((row) => {
      if (filaHeader) return;
      row.eachCell((cell, colNumber) => {
        const v = String(cell.value || '').trim().toUpperCase();
        if (v === 'ITEM') colItem = colNumber;
        if (v === 'PARTIDA') colPartida = colNumber;
        if (v === 'UN') colUnidad = colNumber;
      });
      if (colItem && colPartida) filaHeader = row.number;
    });
    if (!colItem || !colPartida) throw new Error('No se encontraron las columnas "ITEM" y "PARTIDA" — revisa que sea el formato correcto.');
    const partidas = [];
    let procesoActual = '';
    for (let r = filaHeader + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const itemVal = String(row.getCell(colItem).value || '').trim();
      const partidaVal = String(row.getCell(colPartida).value || '').trim();
      if (!itemVal && !partidaVal) continue;
      // Fila de encabezado de sección: solo tiene texto en la columna ITEM
      // (sin PARTIDA) — pero si esa fila usa una celda combinada que abarca
      // también la columna PARTIDA (común en este formato, para el título
      // de la sección), ExcelJS devuelve el mismo texto en ambas columnas;
      // por eso también cuenta como encabezado cuando itemVal===partidaVal.
      if (itemVal && (!partidaVal || partidaVal === itemVal)) { procesoActual = limpiarNombreProcesoPrograma(itemVal); continue; }
      partidas.push({
        item: itemVal, proceso: procesoActual || '(Sin proceso)', tarea: partidaVal,
        unidad: colUnidad ? String(row.getCell(colUnidad).value || '').trim() : '',
      });
    }
    if (partidas.length === 0) throw new Error('No se detectaron partidas en el archivo.');
    miperProgramaParseado = partidas;
    const procesos = [...new Set(partidas.map(p => p.proceso))];
    preview.innerHTML = `
      <div class="card card--default">
        <div class="card-body">
          <div class="card-title">${partidas.length} partida(s) detectadas en ${procesos.length} proceso(s)</div>
          <div class="card-sub">${procesos.slice(0, 6).map(esc).join(' · ')}${procesos.length > 6 ? '…' : ''}</div>
        </div>
      </div>
      <button class="btn-add" type="button" onclick="confirmarImportarProgramaMiper()">Importar ${partidas.length} partida(s)</button>
    `;
  } catch (e) {
    preview.innerHTML = `<div class="card-sub" style="color:#c0392b">${esc(e.message)}</div>`;
  }
}
async function confirmarImportarProgramaMiper() {
  if (!miperProgramaParseado || !miperProgramaParseado.length) return;
  try {
    const obra = valorObra(document.getElementById('select-miper-programa-obra'), 'input-miper-programa-obra-otra');
    if (!obra) { toast('Selecciona la obra', 'error'); return; }
    const ahora = new Date().toLocaleString('es-CL');
    const filas = miperProgramaParseado.map((p, i) => [
      allMiperPrograma.length + i + 1, obra, p.item, p.proceso, p.tarea, p.unidad, ahora, userEmail || ''
    ]);
    await appendSheet(`'${CONFIG.SHEET_MIPER_PROGRAMA}'!A:H`, filas);
    toast(`${filas.length} partida(s) importadas ✓`, 'ok');
    miperProgramaParseado = null;
    closePanel('panel-miper-programa');
    await cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Anexo 1: Levantamiento de procesos y tareas ─────────────────────────
function procesosSugeridosMiper() {
  return [...new Set(allMiperLevantamiento.map(t => t.proceso).filter(Boolean))].sort((a,b) => a.localeCompare(b,'es'));
}
function puestosSugeridosMiper() {
  return [...new Set(allTrabajadores.map(t => t.cargo).filter(Boolean))].sort((a,b) => a.localeCompare(b,'es'));
}
// Match best-effort: no hay relación estructurada entre "Puesto" (texto
// libre, a veces varios cargos juntos, ej. "Jefe de obra, supervisor,
// jornales") y el campo Cargo de cada trabajador — se cuenta cualquier
// trabajador activo de la obra cuyo cargo aparezca (como substring, en
// cualquier dirección) dentro del puesto escrito.
function trabajadoresPorPuestoMiper(obra, puesto) {
  const p = (puesto || '').toLowerCase();
  if (!p) return [];
  return allTrabajadores.filter(t => t.estado === 'Activo' && t.obra === obra && t.cargo &&
    (p.includes(t.cargo.toLowerCase()) || t.cargo.toLowerCase().includes(p)));
}
// Si la obra tiene un Programa Edificio importado, Proceso y Tarea se
// eligen de esas partidas reales (con opción "Otro" para escribir libre);
// si no, quedan como texto libre con sugerencias (comportamiento anterior).
let miperProgramaObraActual = [];
function camposProcesoTareaMiperTarea(programaObra) {
  if (!programaObra.length) {
    return `
      <div class="form-group"><label>Proceso</label><input name="proceso" required list="dl-miper-procesos" placeholder="Ej: Excavaciones"></div>
      <datalist id="dl-miper-procesos">${procesosSugeridosMiper().map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      <div class="form-group"><label>Puesto de trabajo</label><input name="puesto" required list="dl-miper-puestos" placeholder="Ej: Jornal, Enfierrador"></div>
      <datalist id="dl-miper-puestos">${puestosSugeridosMiper().map(p => `<option value="${esc(p)}">`).join('')}</datalist>
      <div class="form-group"><label>Tarea</label><input name="tarea" required placeholder="Ej: Armado de moldaje"></div>`;
  }
  const procesos = [...new Set(programaObra.map(p => p.proceso))];
  return `
    <div class="form-group"><label>Proceso</label>
      <select name="proceso" onchange="onCambioSelectConOtro(this,'input-miper-tarea-proceso-otro'); onCambioProcesoMiperTarea(this)">
        <option value="">Elige un proceso del Programa Edificio...</option>
        ${procesos.map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}
        <option value="__otro__">Otro (escribir)</option>
      </select>
      <input type="text" id="input-miper-tarea-proceso-otro" class="hidden" placeholder="Proceso" style="margin-top:8px;">
    </div>
    <div class="form-group"><label>Puesto de trabajo</label><input name="puesto" required list="dl-miper-puestos" placeholder="Ej: Jornal, Enfierrador"></div>
    <datalist id="dl-miper-puestos">${puestosSugeridosMiper().map(p => `<option value="${esc(p)}">`).join('')}</datalist>
    <div class="form-group"><label>Tarea</label>
      <select name="tarea" id="select-miper-tarea-tarea" onchange="onCambioSelectConOtro(this,'input-miper-tarea-tarea-otro')">
        <option value="">Elige un proceso primero (o "Otro")</option>
        <option value="__otro__">Otro (escribir)</option>
      </select>
      <input type="text" id="input-miper-tarea-tarea-otro" class="hidden" placeholder="Tarea" style="margin-top:8px;">
    </div>`;
}
function onCambioProcesoMiperTarea(selEl) {
  const tareaSel = document.getElementById('select-miper-tarea-tarea');
  if (!tareaSel) return;
  const proceso = selEl.value;
  const tareas = (proceso && proceso !== '__otro__')
    ? [...new Set(miperProgramaObraActual.filter(p => p.proceso === proceso).map(p => p.tarea))] : [];
  tareaSel.innerHTML = `
    <option value="">${tareas.length ? 'Elige una tarea...' : 'Elige un proceso primero (o "Otro")'}</option>
    ${tareas.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
    <option value="__otro__">Otro (escribir)</option>`;
  document.getElementById('input-miper-tarea-tarea-otro').classList.add('hidden');
}
function abrirFormMiperTarea() {
  const obraEfectiva = obraMiperEfectiva() || obraPreseleccionada();
  miperProgramaObraActual = allMiperPrograma.filter(p => p.obra === obraEfectiva);
  document.getElementById('miper-tarea-body').innerHTML = `
    <form id="form-miper-tarea" onsubmit="guardarMiperTarea(event)">
      <div class="form-group"><label>Obra</label>
        <select name="obra" onchange="onCambioObraSelect(this,'input-miper-tarea-obra-otra')" required>${opcionesObraSelectHTML(obraEfectiva)}</select>
        <input type="text" id="input-miper-tarea-obra-otra" class="hidden" placeholder="Nombre de la obra" style="margin-top:8px;">
      </div>
      ${camposProcesoTareaMiperTarea(miperProgramaObraActual)}
      <div class="form-group"><label>Tipo</label><select name="rutinaria"><option>Rutinaria</option><option>No Rutinaria</option></select></div>
      <div class="form-group"><label>Lugar donde se realiza la tarea</label><input name="lugar" placeholder="Ej: Interior y exterior de obra"></div>
      <div class="form-group"><label>Observaciones</label><textarea name="observaciones" rows="2"></textarea></div>
      <div class="card-sub" style="margin:6px 0 14px;">El N° de personas y el sexo se calculan solos contando los trabajadores activos de la obra cuyo cargo coincide con el puesto que escribiste arriba — revisa el resultado en la lista después de guardar y ajusta el puesto si no calzó bien.</div>
      <button class="btn-add" type="submit">Guardar tarea</button>
    </form>`;
  const selObra = document.getElementById('form-miper-tarea').obra;
  onCambioObraSelect(selObra, 'input-miper-tarea-obra-otra');
  openPanel('panel-miper-tarea');
}
function valorProcesoOTareaMiperTarea(el, otroId) {
  if (el.tagName === 'SELECT') return valorConOtro(el, otroId);
  return el.value.trim();
}
async function guardarMiperTarea(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    const obra = valorObra(f.obra, 'input-miper-tarea-obra-otra');
    if (!obra) { toast('Selecciona la obra', 'error'); return; }
    const proceso = valorProcesoOTareaMiperTarea(f.proceso, 'input-miper-tarea-proceso-otro');
    const puesto = f.puesto.value.trim();
    const tarea = valorProcesoOTareaMiperTarea(f.tarea, 'input-miper-tarea-tarea-otro');
    if (!proceso || !puesto || !tarea) { toast('Completa proceso, puesto y tarea', 'error'); return; }
    const match = trabajadoresPorPuestoMiper(obra, puesto);
    const nPersonas = match.length;
    const sexos = [...new Set(match.map(t => t.sexo).filter(Boolean))];
    const sexo = sexos.length === 0 ? '' : sexos.length === 1 ? sexos[0] : 'Mixto';
    await appendSheet(`'${CONFIG.SHEET_MIPER_LEVANTAMIENTO}'!A:L`, [[
      allMiperLevantamiento.length + 1, obra, proceso, puesto, tarea, f.rutinaria.value, f.lugar.value.trim(),
      nPersonas, sexo, f.observaciones.value.trim(), new Date().toLocaleString('es-CL'), userEmail || ''
    ]]);
    toast('Tarea agregada ✓', 'ok');
    closePanel('panel-miper-tarea');
    await cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Matriz de riesgos: agregar fila ─────────────────────────────────────
// Una tarea real casi siempre tiene VARIOS peligros, cada uno con su propio
// riesgo — el formulario deja agregar N bloques de Peligro+Riesgo+Evaluación
// de una sola vez (uno por defecto, "+ Agregar otro" suma más) y los guarda
// todos juntos como filas separadas de la matriz al enviar.
let miperBloqueContador = 0;
function abrirFormMiperFila() {
  const obra = obraMiperEfectiva();
  if (!obra) { toast('Elige una obra primero', 'error'); return; }
  const tareas = allMiperLevantamiento.filter(t => t.obra === obra);
  if (tareas.length === 0) { toast('Primero agrega una tarea en el Levantamiento', 'error'); return; }
  miperBloqueContador = 0;
  document.getElementById('miper-fila-body').innerHTML = `
    <form id="form-miper-fila" onsubmit="guardarMiperFila(event)">
      <input type="hidden" name="obra" value="${esc(obra)}">
      <div class="form-group"><label>Tarea</label>
        <select name="tareaIdx" required onchange="onCambioTareaMiperFila(this)">
          <option value="">Elige una tarea...</option>
          ${tareas.map((t,i) => `<option value="${i}">${esc(t.proceso)} — ${esc(t.tarea)}</option>`).join('')}
        </select>
      </div>
      <div class="card-sub" id="miper-fila-tarea-info"></div>
      <div class="form-group"><label>Equipos, máquinas y herramientas</label><input name="equipos" placeholder="Ej: Taladro, esmeril, andamio"></div>
      ${CONFIG.MIPER_IA_WEBAPP_URL ? `
      <button type="button" class="action-btn" style="margin-bottom:14px;" onclick="sugerirRiesgosIaMiper()">${ic('miper',14)} Sugerencia automática (revisa antes de guardar)</button>` : ''}

      <div class="sec-label" style="margin-top:10px;">Peligros y riesgos de esta tarea</div>
      <div class="card-sub" style="margin-bottom:10px;">Agrega todos los peligros que apliquen — cada uno con su propio riesgo, probabilidad y consecuencia. Se guardan todos juntos como filas de la matriz.</div>
      <div id="miper-bloques-peligro"></div>
      <button type="button" class="action-btn" style="margin:6px 0;" onclick="agregarBloquePeligroMiper()">${ic('miper',14)} Agregar otro peligro / riesgo</button>
      <button type="button" class="action-btn" style="margin-bottom:14px;" onclick="abrirBuscadorMiperBanco()">${ic('lupa',14)} Buscar en banco histórico</button>

      <button class="btn-add" type="submit">Guardar en la matriz</button>
    </form>
  `;
  agregarBloquePeligroMiper();
  openPanel('panel-miper-fila');
}
// Le pide a la IA (vía APPS_SCRIPT_WEBAPP_MIPER_IA.js) que sugiera
// Peligro/Riesgo/Probabilidad/Consecuencia para la Tarea+Equipos ya
// elegidos a mano — Proceso/Puesto/Tarea/Equipos siempre quedan como los
// escribió el supervisor, la IA solo elige riesgos del catálogo YA
// VIGENTE (nunca inventa uno nuevo) y arma los bloques con
// agregarBloquePeligroMiper(prefill), el mismo mecanismo que ya usa el
// buscador del banco histórico — el supervisor los revisa/edita/borra
// como cualquier bloque normal antes de "Guardar en la matriz": no se
// guarda nada solo por pedir la sugerencia.
async function sugerirRiesgosIaMiper() {
  const f = document.getElementById('form-miper-fila');
  if (!f.tareaIdx.value) { toast('Elige una tarea primero', 'error'); return; }
  const tareas = allMiperLevantamiento.filter(t => t.obra === f.obra.value);
  const t = tareas[f.tareaIdx.value];
  const equipos = f.equipos.value.trim();
  const catalogo = miperCatalogoCompleto();
  toast('Pidiendo sugerencias a la IA...');
  try {
    const data = await llamarWebAppMiperIa({
      proceso: t.proceso, puesto: t.puesto, tarea: t.tarea, equipos,
      catalogo: catalogo.map(r => ({ codigo: r.codigo, riesgo: r.riesgo, familia: r.familia, definicion: r.definicion })),
    });
    const sugerencias = (data.sugerencias || []).map(s => ({ ...s, riesgoIdx: catalogo.findIndex(r => r.codigo === s.codigo) }))
      .filter(s => s.riesgoIdx !== -1);
    if (sugerencias.length === 0) { toast('La IA no encontró sugerencias — completa a mano', 'error'); return; }
    document.getElementById('miper-bloques-peligro').innerHTML = '';
    miperBloqueContador = 0;
    sugerencias.forEach(s => agregarBloquePeligroMiper(s));
    toast(`${sugerencias.length} sugerencias agregadas — revísalas antes de guardar`, 'ok');
  } catch (e) {
    toast('Error pidiendo sugerencias: ' + e.message, 'error');
  }
}
function bloquePeligroHtmlMiper(idx, prefill) {
  const catalogo = miperCatalogoCompleto();
  const familias = [...new Set(catalogo.map(r => r.familia))];
  const p = prefill || {};
  return `
  <div class="card card--default miper-bloque-peligro" data-idx="${idx}" style="flex-direction:column;align-items:stretch;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <div class="card-title">Peligro y riesgo</div>
      <button type="button" class="btn-quitar-bloque hidden" onclick="quitarBloquePeligroMiper(${idx})" style="background:none;border:none;color:#c0392b;font-size:12px;font-weight:600;cursor:pointer;padding:4px;">✕ Quitar</button>
    </div>
    <div class="form-group"><label>Peligro / factor de riesgo</label><input data-field="peligro" required placeholder="Ej: No usar EPP, desorden en el área" value="${esc(p.peligro || '')}"></div>
    <div class="form-group"><label>Riesgo</label>
      <select data-field="riesgoIdx" required onchange="onCambioRiesgoMiperFilaBloque(this)">
        <option value="">Elige un riesgo del catálogo...</option>
        ${familias.map(fam => `<optgroup label="${esc(MIPER_FAMILIA_LABEL[fam] || fam)}">
          ${catalogo.map((r,i) => r.familia === fam ? `<option value="${i}" ${p.riesgoIdx === i ? 'selected' : ''}>${esc(r.riesgo)}${r.codigo ? ` (${esc(r.codigo)})` : ''}</option>` : '').join('')}
        </optgroup>`).join('')}
        <option value="__nuevo__">+ Agregar riesgo nuevo...</option>
      </select>
    </div>
    <div data-field="riesgoDetalle" class="card-sub hidden"></div>
    <div data-field="riesgoNuevoWrap" class="hidden">
      <div class="form-group"><label>Familia del riesgo</label>
        <select data-field="familiaNueva">
          <option value="SEGURIDAD">Seguridad</option><option value="HIGIENE">Higiene</option>
          <option value="MUSCULO_ESQUELETICO">Músculo-Esquelético</option><option value="PSICOSOCIAL">Psicosocial</option>
        </select>
      </div>
      <div class="form-group"><label>Nombre del riesgo</label><input data-field="riesgoNuevoNombre" placeholder="Ej: Contacto con sustancia química"></div>
      <div class="form-group"><label>Definición</label><textarea data-field="definicionNueva" rows="2"></textarea></div>
      <div class="form-group"><label>Código</label><input data-field="codigoNuevo" placeholder="Ej: X1"></div>
      <div class="form-group"><label>Medidas preventivas (una por línea)</label><textarea data-field="medidasNuevas" rows="3" placeholder="Una medida por línea"></textarea></div>
      <div class="card-sub" style="margin-bottom:10px;">Este riesgo queda disponible para elegir en cualquier obra de ahí en adelante.</div>
    </div>
    <div class="form-group"><label>Probabilidad</label>
      <select data-field="probabilidad" required onchange="actualizarVepMiperFilaBloque(this)">
        <option value="">—</option>
        ${MIPER_PROBABILIDAD.map(pr => `<option value="${pr.valor}" ${p.probabilidad == pr.valor ? 'selected' : ''}>${pr.nombre}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label>Consecuencia</label>
      <select data-field="consecuencia" required onchange="actualizarVepMiperFilaBloque(this)">
        <option value="">—</option>
        ${MIPER_CONSECUENCIA.map(c => `<option value="${c.valor}" ${p.consecuencia == c.valor ? 'selected' : ''}>${c.nombre}</option>`).join('')}
      </select>
    </div>
    <div class="card card--default" data-field="vepResultado">
      <div class="card-body"><div class="card-title">VEP y Nivel de Riesgo</div><div class="card-sub">Elige probabilidad y consecuencia</div></div>
    </div>
  </div>`;
}
function agregarBloquePeligroMiper(prefill) {
  const cont = document.getElementById('miper-bloques-peligro');
  const idx = miperBloqueContador++;
  cont.insertAdjacentHTML('beforeend', bloquePeligroHtmlMiper(idx, prefill));
  actualizarBotonesQuitarBloqueMiper();
  const bloque = cont.querySelector(`[data-idx="${idx}"]`);
  if (prefill) {
    if (prefill.riesgoIdx !== undefined) onCambioRiesgoMiperFilaBloque(bloque.querySelector('[data-field="riesgoIdx"]'));
    if (prefill.probabilidad !== undefined || prefill.consecuencia !== undefined) actualizarVepMiperFilaBloque(bloque.querySelector('[data-field="probabilidad"]'));
  }
  return bloque;
}
function quitarBloquePeligroMiper(idx) {
  const cont = document.getElementById('miper-bloques-peligro');
  if (cont.children.length <= 1) { toast('Debe quedar al menos un peligro/riesgo', 'error'); return; }
  const el = cont.querySelector(`[data-idx="${idx}"]`);
  if (el) el.remove();
  actualizarBotonesQuitarBloqueMiper();
}
function actualizarBotonesQuitarBloqueMiper() {
  const cont = document.getElementById('miper-bloques-peligro');
  const soloUno = cont.children.length <= 1;
  cont.querySelectorAll('.btn-quitar-bloque').forEach(b => b.classList.toggle('hidden', soloUno));
}
function onCambioTareaMiperFila(selEl) {
  const f = selEl.form;
  const tareas = allMiperLevantamiento.filter(t => t.obra === f.obra.value);
  const t = tareas[selEl.value];
  document.getElementById('miper-fila-tarea-info').textContent = t ? `Puesto: ${t.puesto} — ${t.rutinaria}` : '';
}
function onCambioRiesgoMiperFilaBloque(selEl) {
  const bloque = selEl.closest('.miper-bloque-peligro');
  const esNuevo = selEl.value === '__nuevo__';
  bloque.querySelector('[data-field="riesgoNuevoWrap"]').classList.toggle('hidden', !esNuevo);
  const detalle = bloque.querySelector('[data-field="riesgoDetalle"]');
  if (esNuevo || selEl.value === '') { detalle.classList.add('hidden'); detalle.innerHTML = ''; return; }
  const r = miperCatalogoCompleto()[selEl.value];
  if (!r) { detalle.classList.add('hidden'); return; }
  detalle.classList.remove('hidden');
  detalle.innerHTML = `<b>${esc(r.codigo || '')}</b> ${esc(r.definicion || '')}` +
    (r.medidas && r.medidas.length ? `<br><br><b>Medidas preventivas:</b><ul style="margin:4px 0 0 16px;padding:0;">${r.medidas.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : '');
}
function actualizarVepMiperFilaBloque(selEl) {
  const bloque = selEl.closest('.miper-bloque-peligro');
  const prob = bloque.querySelector('[data-field="probabilidad"]').value;
  const cons = bloque.querySelector('[data-field="consecuencia"]').value;
  const el = bloque.querySelector('[data-field="vepResultado"]');
  if (!prob || !cons) {
    el.innerHTML = `<div class="card-body"><div class="card-title">VEP y Nivel de Riesgo</div><div class="card-sub">Elige probabilidad y consecuencia</div></div>`;
    return;
  }
  const r = miperNivelRiesgo(prob, cons);
  el.innerHTML = `<div class="card-body"><div class="card-title">VEP = ${r.vep} <span class="badge ${r.color}">${r.nivel}</span></div><div class="card-sub">${esc(r.accion)}</div></div>`;
}
async function guardarMiperFila(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    const obra = f.obra.value;
    const tareas = allMiperLevantamiento.filter(t => t.obra === obra);
    const t = tareas[f.tareaIdx.value];
    if (!t) { toast('Elige la tarea', 'error'); return; }
    const equipos = f.equipos.value.trim();

    const bloques = [...document.querySelectorAll('#miper-bloques-peligro .miper-bloque-peligro')];
    if (bloques.length === 0) { toast('Agrega al menos un peligro', 'error'); return; }

    const filasNuevas = [];
    const riesgosCustomNuevos = [];
    for (const bloque of bloques) {
      const peligro = bloque.querySelector('[data-field="peligro"]').value.trim();
      if (!peligro) { toast('Describe el peligro en todos los bloques', 'error'); return; }
      const riesgoIdxVal = bloque.querySelector('[data-field="riesgoIdx"]').value;
      if (!riesgoIdxVal) { toast('Elige un riesgo en todos los bloques', 'error'); return; }
      const probabilidad = bloque.querySelector('[data-field="probabilidad"]').value;
      const consecuencia = bloque.querySelector('[data-field="consecuencia"]').value;
      if (!probabilidad || !consecuencia) { toast('Elige probabilidad y consecuencia en todos los bloques', 'error'); return; }

      let riesgoNombre, codigo, familia;
      if (riesgoIdxVal === '__nuevo__') {
        riesgoNombre = bloque.querySelector('[data-field="riesgoNuevoNombre"]').value.trim();
        if (!riesgoNombre) { toast('Escribe el nombre del riesgo nuevo en todos los bloques que lo requieran', 'error'); return; }
        familia = bloque.querySelector('[data-field="familiaNueva"]').value;
        codigo = bloque.querySelector('[data-field="codigoNuevo"]').value.trim();
        const definicion = bloque.querySelector('[data-field="definicionNueva"]').value.trim();
        const medidas = bloque.querySelector('[data-field="medidasNuevas"]').value.split('\n').map(s => s.trim()).filter(Boolean);
        riesgosCustomNuevos.push({ familia, riesgoNombre, definicion, codigo, medidas });
      } else {
        const r = miperCatalogoCompleto()[riesgoIdxVal];
        if (!r) { toast('Elige un riesgo válido', 'error'); return; }
        riesgoNombre = r.riesgo; codigo = r.codigo; familia = r.familia;
      }

      const { vep, nivel } = miperNivelRiesgo(probabilidad, consecuencia);
      filasNuevas.push({ peligro, riesgoNombre, codigo, familia, probabilidad, consecuencia, vep, nivel });
    }

    // Los riesgos custom se guardan uno por uno para numerarlos bien en la
    // hoja (varios bloques del mismo envío pueden traer riesgos nuevos).
    for (const rc of riesgosCustomNuevos) {
      await appendSheet(`'${CONFIG.SHEET_MIPER_RIESGOS_CUSTOM}'!A:H`, [[
        allMiperRiesgosCustom.length + 1, rc.familia, rc.riesgoNombre, rc.definicion, rc.codigo,
        rc.medidas.join(' | '), new Date().toLocaleString('es-CL'), userEmail || ''
      ]]);
      allMiperRiesgosCustom.push({ fila: 0, n: '', familia: rc.familia, riesgo: rc.riesgoNombre, definicion: rc.definicion,
        codigo: rc.codigo, medidas: rc.medidas.join(' | '), fechaRegistro: '', registradoPor: userEmail || '' });
    }

    const fechaRegistro = new Date().toLocaleString('es-CL');
    const filas = filasNuevas.map((fn, i) => [
      allMiperMatriz.length + 1 + i, obra, t.proceso, t.puesto, t.tarea, equipos, fn.peligro,
      fn.riesgoNombre, fn.codigo, fn.familia, fn.probabilidad, fn.consecuencia, fn.vep, fn.nivel,
      fn.codigo, MIPER_FAMILIA_LABEL[fn.familia] || fn.familia, fechaRegistro, userEmail || ''
    ]);
    await appendSheet(`'${CONFIG.SHEET_MIPER_MATRIZ}'!A:R`, filas);

    toast(`${filas.length} riesgo(s) agregado(s) a la matriz ✓`, 'ok');
    closePanel('panel-miper-fila');
    await cargarTodo(true);
  } catch (e) { toast(e.message, 'error'); }
}

// ── Banco histórico (filas de obras anteriores, ver vendor/miper-banco.js) ──
let miperBancoCache = [];
async function abrirBuscadorMiperBanco() {
  document.getElementById('miper-banco-body').innerHTML = `<div class="card-sub">Cargando banco histórico...</div>`;
  openPanel('panel-miper-banco');
  try {
    miperBancoCache = await cargarMiperBanco();
    renderBuscadorMiperBanco('');
  } catch (e) {
    document.getElementById('miper-banco-body').innerHTML = `<div class="card-sub">${esc(e.message)}</div>`;
  }
}
function renderBuscadorMiperBanco(q) {
  const query = (q || '').toLowerCase().trim();
  const resultados = !query ? miperBancoCache.slice(0, 40) : miperBancoCache.filter(r =>
    `${r.proceso} ${r.tarea} ${r.riesgo} ${r.peligro}`.toLowerCase().includes(query)
  ).slice(0, 60);
  document.getElementById('miper-banco-body').innerHTML = `
    <div class="search-area"><div class="searchbox"><span class="search-ic">${ic('lupa',16)}</span>
      <input type="text" placeholder="Busca por proceso, tarea o riesgo..." value="${esc(q || '')}" oninput="renderBuscadorMiperBanco(this.value)"></div></div>
    <div class="card-sub" style="margin-bottom:8px;">${resultados.length} resultado(s)${query ? '' : ' — mostrando los primeros 40, escribe para filtrar'}</div>
    ${resultados.map(r => {
      const nivel = MIPER_VEP.find(v => v.nombre === r.nivel) || MIPER_VEP.find(v => r.vep <= v.max) || MIPER_VEP[0];
      const idx = miperBancoCache.indexOf(r);
      return `
      <div class="card card--default" onclick="usarFilaBancoMiper(${idx})">
        <div class="card-body">
          <div class="card-title">${esc(r.riesgo)}</div>
          <div class="card-sub">${esc(r.proceso)} — ${esc(r.tarea)}</div>
          <div class="card-sub">${esc(r.peligro)}</div>
          <div class="badge-row"><span class="badge ${nivel.color}">${esc(r.nivel)}</span>${r.medidasCodigo ? `<span class="badge gray">${esc(r.medidasCodigo)}</span>` : ''}</div>
        </div>
      </div>`;
    }).join('') || emptyState('Sin resultados', 'Prueba con otra palabra')}
  `;
}
function usarFilaBancoMiper(idx) {
  const r = miperBancoCache[idx];
  if (!r) return;
  closePanel('panel-miper-banco');
  aplicarPrefillMiperFila(r);
}
function aplicarPrefillMiperFila(r) {
  const f = document.getElementById('form-miper-fila');
  if (!f) return;
  const tareas = allMiperLevantamiento.filter(t => t.obra === f.obra.value);
  const tIdx = tareas.findIndex(t => t.proceso.toLowerCase() === String(r.proceso||'').toLowerCase() && t.tarea.toLowerCase() === String(r.tarea||'').toLowerCase());
  if (tIdx >= 0 && !f.tareaIdx.value) { f.tareaIdx.value = tIdx; onCambioTareaMiperFila(f.tareaIdx); }
  if (!f.equipos.value && r.equipos) f.equipos.value = r.equipos;

  const catalogo = miperCatalogoCompleto();
  const rIdx = catalogo.findIndex(c => c.riesgo.toLowerCase() === String(r.riesgo||'').toLowerCase());
  const probOpt = MIPER_PROBABILIDAD.find(p => p.valor === Number(r.probabilidad));
  const consOpt = MIPER_CONSECUENCIA.find(c => c.valor === Number(r.consecuencia));
  const prefill = {
    peligro: r.peligro || '',
    riesgoIdx: rIdx >= 0 ? rIdx : undefined,
    probabilidad: probOpt ? probOpt.valor : undefined,
    consecuencia: consOpt ? consOpt.valor : undefined,
  };

  // Si el último bloque todavía está vacío (recién se abrió el formulario y
  // nadie escribió nada ahí), se rellena ese mismo en vez de sumar uno de
  // más que quedaría vacío y haría fallar el guardado.
  const bloques = [...document.querySelectorAll('#miper-bloques-peligro .miper-bloque-peligro')];
  const ultimo = bloques[bloques.length - 1];
  const ultimoVacio = ultimo && !ultimo.querySelector('[data-field="peligro"]').value.trim();
  if (ultimoVacio) {
    ultimo.querySelector('[data-field="peligro"]').value = prefill.peligro;
    if (prefill.riesgoIdx !== undefined) {
      const sel = ultimo.querySelector('[data-field="riesgoIdx"]');
      sel.value = prefill.riesgoIdx; onCambioRiesgoMiperFilaBloque(sel);
    }
    if (prefill.probabilidad !== undefined) ultimo.querySelector('[data-field="probabilidad"]').value = prefill.probabilidad;
    if (prefill.consecuencia !== undefined) {
      const consSel = ultimo.querySelector('[data-field="consecuencia"]');
      consSel.value = prefill.consecuencia; actualizarVepMiperFilaBloque(consSel);
    }
  } else {
    agregarBloquePeligroMiper(prefill);
  }
  if (rIdx < 0 && r.riesgo) toast(`"${r.riesgo}" no está en el catálogo — elígelo como "+ Agregar riesgo nuevo..." en el bloque que se completó`, 'ok');
  else toast('Peligro agregado desde el banco — revisa y guarda', 'ok');
}

// ── Documento: encabezado + protocolos + firmas + Revisión/Próxima Revisión ──
function abrirDocumentoMiper() {
  const obra = obraMiperEfectiva();
  if (!obra) { toast('Elige una obra primero', 'error'); return; }
  const filas = allMiperMatriz.filter(f => f.obra === obra);
  if (filas.length === 0) { toast('Agrega al menos un riesgo a la matriz antes de generar el documento', 'error'); return; }
  const docs = allMiperDocumentos.filter(d => d.obra === obra).sort((a,b) => b.fila - a.fila);
  const ultimo = docs[0] || null;
  const revisionSiguiente = ultimo ? ultimo.revision + 1 : 0;
  document.getElementById('miper-documento-body').innerHTML = `
    <form id="form-miper-documento" onsubmit="generarDocumentoMiper(event)">
      <div class="form-group"><label>Entidad Empleadora</label><input name="entidadEmpleadora" required value="${esc(ultimo ? ultimo.entidadEmpleadora : '')}"></div>
      <div class="form-group"><label>Sucursal</label><input name="sucursal" required value="${esc(ultimo ? ultimo.sucursal : obra)}"></div>
      <div class="form-group"><label>Responsable del levantamiento</label><input name="responsableLevantamiento" required value="${esc(ultimo ? ultimo.responsableLevantamiento : '')}"></div>
      <div class="form-group"><label>Fecha</label><input type="date" name="fecha" required value="${hoyISO()}"></div>
      <div class="form-group"><label>Revisión</label><input value="${revisionSiguiente}" readonly></div>
      <div class="form-group"><label>Próxima revisión</label><input type="date" name="proximaRevision" required></div>

      <div class="sec-label">Protocolos de Vigilancia MINSAL aplicables</div>
      ${MIPER_PROTOCOLOS.map((p,i) => `
        <label style="display:flex;gap:8px;align-items:flex-start;margin-bottom:10px;font-size:13.5px;line-height:1.4;">
          <input type="checkbox" name="protocolo" value="${i}" style="margin-top:3px;flex-shrink:0;" ${ultimo && ultimo.protocolos.includes(i) ? 'checked' : ''}>
          <span>${esc(p)}</span>
        </label>
      `).join('')}

      <div class="sec-label" style="margin-top:14px;">Firmas</div>
      <div class="form-group"><label>Elaboró — nombre</label><input name="nombreElaboro" required value="${esc(ultimo ? ultimo.nombreElaboro : '')}"></div>
      <div class="form-group"><label>Firma de quien elabora</label>
        <div class="firma-box"><canvas id="firma-canvas-miper-elaboro"></canvas></div>
        <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-canvas-miper-elaboro')">Borrar firma</button></div>
      </div>
      <div class="form-group"><label>Revisó — nombre</label><input name="nombreReviso" value="${esc(ultimo ? ultimo.nombreReviso : '')}"></div>
      <div class="form-group"><label>Firma de quien revisa</label>
        <div class="firma-box"><canvas id="firma-canvas-miper-reviso"></canvas></div>
        <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-canvas-miper-reviso')">Borrar firma</button></div>
      </div>
      <div class="form-group"><label>Aprobó — nombre</label><input name="nombreAprobo" value="${esc(ultimo ? ultimo.nombreAprobo : '')}"></div>
      <div class="form-group"><label>Firma de quien aprueba</label>
        <div class="firma-box"><canvas id="firma-canvas-miper-aprobo"></canvas></div>
        <div class="firma-actions"><button type="button" onclick="limpiarFirmaId('firma-canvas-miper-aprobo')">Borrar firma</button></div>
      </div>

      <button class="btn-add" type="submit">Generar Excel</button>
    </form>
    ${docs.length ? `<div class="sec-label" style="margin-top:18px;">Documentos anteriores</div>${docs.map(d => `
      <div class="card card--default">
        <div class="card-body">
          <div class="card-title">Revisión ${d.revision}</div>
          <div class="card-sub">${esc(d.fecha)}</div>
          <div class="badge-row">
            ${d.excel ? `<a class="badge green" href="${esc(d.excel)}" target="_blank" rel="noopener">Ver Excel</a>` : ''}
          </div>
        </div>
      </div>`).join('')}` : ''}
  `;
  setTimeout(() => {
    initFirmaPad('firma-canvas-miper-elaboro');
    initFirmaPad('firma-canvas-miper-reviso');
    initFirmaPad('firma-canvas-miper-aprobo');
  }, 80);
  openPanel('panel-miper-documento');
}
async function generarDocumentoMiper(ev) {
  ev.preventDefault();
  const f = ev.target;
  try {
    const obra = obraMiperEfectiva();
    const filas = allMiperMatriz.filter(x => x.obra === obra);
    if (filas.length === 0) { toast('No hay filas en la matriz', 'error'); return; }
    if (firmaEstaVacia('firma-canvas-miper-elaboro')) { toast('Falta la firma de quien elabora', 'error'); return; }
    if (!f.nombreElaboro.value.trim()) { toast('Falta el nombre de quien elabora', 'error'); return; }

    const protocolosSel = Array.from(f.querySelectorAll('input[name="protocolo"]:checked')).map(el => Number(el.value));
    const docsPrevios = allMiperDocumentos.filter(d => d.obra === obra).sort((a,b) => b.fila - a.fila);
    const revision = docsPrevios[0] ? docsPrevios[0].revision + 1 : 0;

    const datos = {
      obra, entidadEmpleadora: f.entidadEmpleadora.value.trim(), sucursal: f.sucursal.value.trim(),
      responsableLevantamiento: f.responsableLevantamiento.value.trim(), fecha: f.fecha.value,
      revision, proximaRevision: f.proximaRevision.value, protocolosSel,
      nombreElaboro: f.nombreElaboro.value.trim(),
      firmaElaboroUrl: firmaCanvasADataURL('firma-canvas-miper-elaboro'),
      nombreReviso: f.nombreReviso.value.trim(),
      firmaRevisoUrl: firmaEstaVacia('firma-canvas-miper-reviso') ? null : firmaCanvasADataURL('firma-canvas-miper-reviso'),
      nombreAprobo: f.nombreAprobo.value.trim(),
      firmaAproboUrl: firmaEstaVacia('firma-canvas-miper-aprobo') ? null : firmaCanvasADataURL('firma-canvas-miper-aprobo'),
      filas,
      tareas: allMiperLevantamiento.filter(t => t.obra === obra),
    };

    const folderId = await getModuloFolder('Matriz de Riesgos');
    const nombreBase = `Matriz_IPER_${obra}_Rev${revision}`.replace(/\s+/g, '_');
    const excelBlob = await generarExcelMiper(datos);
    const up = await subirBytesADrive(excelBlob, folderId, `${nombreBase}.xlsx`);
    const excelLink = up.link;

    await appendSheet(`'${CONFIG.SHEET_MIPER_DOCUMENTOS}'!A:P`, [[
      allMiperDocumentos.length + 1, obra, datos.entidadEmpleadora, datos.sucursal, datos.responsableLevantamiento,
      datos.fecha, revision, datos.proximaRevision, JSON.stringify(protocolosSel),
      datos.nombreElaboro, datos.nombreReviso, datos.nombreAprobo,
      '', excelLink, new Date().toLocaleString('es-CL'), userEmail || ''
    ]]);
    toast('Excel generado ✓', 'ok');
    closePanel('panel-miper-documento');
    await cargarTodo(true);
  } catch (e) { console.error(e); toast(e.message, 'error'); }
}

// ── Generador Excel ──────────────────────────────────────────────────────
// Se arma el workbook ENTERO desde cero con ExcelJS (no se parte de un
// archivo .xlsx existente) — se probó partir de una plantilla derivada del
// Excel original del cliente (plantillas/miper_plantilla.xlsx) pero el
// archivo resultante quedaba dañado al abrirlo en Excel real (con o sin
// logo agregado) y no se logró aislar la causa exacta con las herramientas
// de validación disponibles en este entorno (Excel real no está disponible
// acá para depurarlo directamente). Construir todo desde cero con ExcelJS
// es el camino que la librería sí soporta de forma confiable. El contenido
// de cada pestaña (catálogo de riesgos, banco histórico, VEP, etc.) se
// toma de los mismos datos ya usados en la app (MIPER_CATALOGO_RIESGOS,
// MIPER_PROTOCOLOS, MIPER_VEP, banco histórico) y los colores se
// replican midiéndolos directamente sobre el Excel que mandó el cliente.
const MIPER_COLOR_NIVEL_EXCEL = {
  Tolerable: 'FF66FF33', Moderado: 'FFFFFF00', Importante: 'FFFFC000', Intolerable: 'FFFF0000',
};
const MIPER_COLOR_BLOQUE_TAREA_EXCEL = 'FF92D050';

async function generarExcelMiper(datos) {
  const ExcelJS = await cargarExcelJsLib();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Prevención de Riesgos LST';

  const bordeFino = { style: 'thin', color: { argb: 'FF999999' } };
  const borde = { top: bordeFino, left: bordeFino, bottom: bordeFino, right: bordeFino };
  const NCOLS = 12;
  // Anchos y textos de encabezado medidos directamente sobre el Excel del
  // cliente (incluido el error de tipeo "MAQUINRIAS" — se replica tal cual
  // porque así está en el documento original). Los anchos son
  // proporcionales al ancho combinado real de cada columna en el Excel
  // original (que usa muchas columnas angostas combinadas, ej. Equipos son
  // 18 columnas combinadas, Proceso son solo 4) traducido a una grilla más
  // simple de 12 columnas — misma proporción visual, sin las miles de
  // combinaciones de celda del archivo original.
  // Anchos ajustados para que se lea bien con contenido real (procesos
  // largos importados del Programa Edificio, ej. "INST. SIST. EVACUACION
  // DE DESECHOS SOLIDOS") sin dejar de mantener Equipos/Peligro como las
  // columnas más anchas, igual que en el Excel original.
  const ANCHOS_TABLA = [22, 18, 28, 38, 42, 17, 9, 9, 7, 10, 11, 13];
  const TXT_EQUIPOS = 'EQUIPOS MAQUINRIAS Y HERRAMIENTAS';

  // Encabezado de tabla (4 filas: PROCESO/PUESTO/TAREA/EQUIPOS/PELIGRO/
  // RIESGO/MEDIDAS/ANEXO combinados sobre las 4, EVALUACION DE RIESGOS con
  // su subtítulo "DE SEGURIDAD / EMERGENCIA" y las 4 subcolumnas
  // Probabilidad/Consecuencia/VEP/Nivel de Riesgo) — igual estructura y
  // texto que MATRIZ DE RIESGOS/OBRAS PREVIAS en el Excel original.
  function escribirEncabezadoTabla(ws, filaHead1) {
    const f2 = filaHead1 + 1, f3 = filaHead1 + 2, f4 = filaHead1 + 3;
    const centrado = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    const principales = ['PROCESO', 'PUESTO DE TRABAJO', 'TAREA', TXT_EQUIPOS,
      'IDENTIFICACION DE PELIGROS / FACTORES DE RIESGO', 'RIESGO'];
    principales.forEach((h, i) => {
      const c = i + 1;
      const cell = ws.getCell(filaHead1, c);
      cell.value = h; cell.font = { name: 'Calibri', bold: true, size: 10 }; cell.alignment = centrado;
      ws.mergeCells(filaHead1, c, f4, c);
    });
    const evalCell = ws.getCell(filaHead1, 7);
    evalCell.value = 'EVALUACION DE RIESGOS'; evalCell.font = { name: 'Calibri', bold: true, size: 10 }; evalCell.alignment = centrado;
    ws.mergeCells(filaHead1, 7, filaHead1, 10);
    const subEvalCell = ws.getCell(f2, 7);
    subEvalCell.value = 'DE SEGURIDAD / EMERGENCIA'; subEvalCell.font = { name: 'Calibri', bold: true, size: 9 }; subEvalCell.alignment = centrado;
    ws.mergeCells(f2, 7, f2, 10);
    ['PROBABILIDAD', 'CONSECUENCIA', 'VEP', 'NIVEL DE\nRIESGO'].forEach((h, i) => {
      const c = 7 + i;
      const cell = ws.getCell(f3, c);
      cell.value = h; cell.font = { name: 'Calibri', bold: true, size: 9 }; cell.alignment = centrado;
      ws.mergeCells(f3, c, f4, c);
    });
    const medCell = ws.getCell(filaHead1, 11);
    medCell.value = 'MEDIDAS\nPREVENTIVAS - CODIGO'; medCell.font = { name: 'Calibri', bold: true, size: 10 }; medCell.alignment = centrado;
    ws.mergeCells(filaHead1, 11, f4, 11);
    const anexoCell = ws.getCell(filaHead1, 12);
    anexoCell.value = 'ANEXO'; anexoCell.font = { name: 'Calibri', bold: true, size: 10 }; anexoCell.alignment = centrado;
    ws.mergeCells(filaHead1, 12, f4, 12);
    [filaHead1, f2, f3, f4].forEach(rr => {
      for (let c = 1; c <= NCOLS; c++) ws.getCell(rr, c).border = borde;
      ws.getRow(rr).height = 15;
    });
    return f4 + 1;
  }
  // Filas de datos — Proceso/Puesto/Tarea/Equipos combinados y en verde
  // cuando se repiten en filas consecutivas (una tarea con varios
  // peligros), Nivel de Riesgo coloreado como semáforo — igual que el
  // Excel original. Fuente/alineación de cada columna calcada del Excel
  // original: Proceso/Puesto en 12pt negrita centrado, el resto en 10pt
  // normal (Peligro/Riesgo alineados a la izquierda, el resto centrado).
  function escribirFilasTabla(ws, filaInicio, filas) {
    const fuenteGrupo = { name: 'Calibri', bold: true, size: 12 };
    const fuenteDato = { name: 'Calibri', size: 10 };
    const alinCentro = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    const alinIzq = { wrapText: true, vertical: 'middle', horizontal: 'left' };
    let r = filaInicio, i = 0;
    while (i < filas.length) {
      let j = i;
      while (j + 1 < filas.length &&
        filas[j+1].proceso === filas[i].proceso && filas[j+1].puesto === filas[i].puesto &&
        filas[j+1].tarea === filas[i].tarea && filas[j+1].equipos === filas[i].equipos) j++;
      const filaGrupoInicio = r;
      for (let k = i; k <= j; k++) {
        const f = filas[k];
        ws.getCell(r, 5).value = f.peligro; ws.getCell(r, 5).font = fuenteDato; ws.getCell(r, 5).alignment = alinIzq;
        ws.getCell(r, 6).value = f.riesgo; ws.getCell(r, 6).font = fuenteDato; ws.getCell(r, 6).alignment = alinIzq;
        ws.getCell(r, 7).value = f.probabilidad; ws.getCell(r, 7).font = fuenteDato; ws.getCell(r, 7).alignment = alinCentro;
        ws.getCell(r, 8).value = f.consecuencia; ws.getCell(r, 8).font = fuenteDato; ws.getCell(r, 8).alignment = alinCentro;
        ws.getCell(r, 9).value = f.vep; ws.getCell(r, 9).font = fuenteDato; ws.getCell(r, 9).alignment = alinCentro;
        const nivel = f.nivelRiesgo || f.nivel;
        const nivelCell = ws.getCell(r, 10);
        nivelCell.value = nivel; nivelCell.font = fuenteDato; nivelCell.alignment = alinCentro;
        nivelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MIPER_COLOR_NIVEL_EXCEL[nivel] || 'FFFFFFFF' } };
        ws.getCell(r, 11).value = f.medidasCodigo; ws.getCell(r, 11).font = fuenteDato; ws.getCell(r, 11).alignment = alinCentro;
        ws.getCell(r, 12).value = f.anexo; ws.getCell(r, 12).font = fuenteDato; ws.getCell(r, 12).alignment = alinCentro;
        for (let c = 1; c <= NCOLS; c++) ws.getCell(r, c).border = borde;
        r++;
      }
      const filaGrupoFin = r - 1;
      const f0 = filas[i];
      ws.getCell(filaGrupoInicio, 1).value = f0.proceso;
      ws.getCell(filaGrupoInicio, 2).value = f0.puesto;
      ws.getCell(filaGrupoInicio, 3).value = f0.tarea;
      ws.getCell(filaGrupoInicio, 4).value = f0.equipos;
      if (filaGrupoFin > filaGrupoInicio) [1, 2, 3, 4].forEach(c => ws.mergeCells(filaGrupoInicio, c, filaGrupoFin, c));
      [1, 2].forEach(c => {
        const cell = ws.getCell(filaGrupoInicio, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MIPER_COLOR_BLOQUE_TAREA_EXCEL } };
        cell.font = fuenteGrupo; cell.alignment = alinCentro;
      });
      [3, 4].forEach(c => {
        const cell = ws.getCell(filaGrupoInicio, c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MIPER_COLOR_BLOQUE_TAREA_EXCEL } };
        cell.font = fuenteDato; cell.alignment = alinCentro;
      });
      i = j + 1;
    }
    return r;
  }
  function anchoColumnas(ws, anchos) {
    ws.columns = anchos.map(w => ({ width: w }));
  }

  // ---- Hoja 1: OBRAS PREVIAS (única hoja de matriz — no hay una hoja
  // "MATRIZ DE RIESGOS" aparte: la tabla que se edita/crece es esta. Trae
  // el encabezado (entidad/firmas/protocolos) del documento que se está
  // generando y, en la tabla, el banco histórico completo seguido de las
  // filas nuevas de esta obra al final — así queda como un registro único
  // que se sigue extendiendo, igual que en el Excel del cliente). ----
  const wsPrevias = wb.addWorksheet('OBRAS PREVIAS');
  let r = 1;
  // Columnas 1-3 quedan libres para el logo (arriba a la izquierda); el
  // título parte en la columna 4.
  wsPrevias.mergeCells(r, 4, r, NCOLS);
  const titulo = wsPrevias.getCell(r, 4);
  titulo.value = 'MATRIZ DE IDENTIFICACION DE PELIGROS / FACTORES DE RIESGOS y EVALUACION DE RIESGOS';
  titulo.font = { bold: true, size: 14 };
  titulo.alignment = { vertical: 'middle', wrapText: true };
  wsPrevias.getRow(r).height = 34;
  r += 2;
  function campoIzq(fila, label, value) {
    wsPrevias.getCell(fila, 1).value = label; wsPrevias.getCell(fila, 1).font = { bold: true };
    wsPrevias.mergeCells(fila, 2, fila, 5); wsPrevias.getCell(fila, 2).value = value;
  }
  function campoDer(fila, label, value) {
    wsPrevias.getCell(fila, 7).value = label; wsPrevias.getCell(fila, 7).font = { bold: true };
    wsPrevias.mergeCells(fila, 8, fila, NCOLS); wsPrevias.getCell(fila, 8).value = value;
  }
  campoIzq(r, 'ENTIDAD EMPLEADORA', datos.entidadEmpleadora);
  campoDer(r, 'NOMBRE Y FIRMA ELABORO', datos.nombreElaboro); r++;
  campoIzq(r, 'SUCURSAL', datos.sucursal);
  campoDer(r, 'NOMBRE Y FIRMA REVISION', datos.nombreReviso); r++;
  campoIzq(r, 'RESPONSABLE LEVANTAMIENTO', datos.responsableLevantamiento);
  campoDer(r, 'NOMBRE Y FIRMA APROBACION', datos.nombreAprobo); r++;
  wsPrevias.getCell(r, 1).value = 'FECHA'; wsPrevias.getCell(r, 1).font = { bold: true };
  wsPrevias.getCell(r, 2).value = ddmmyyyy(datos.fecha);
  wsPrevias.getCell(r, 4).value = 'REVISION'; wsPrevias.getCell(r, 4).font = { bold: true };
  wsPrevias.getCell(r, 5).value = datos.revision;
  campoDer(r, 'PROXIMA REVISION', datos.proximaRevision ? ddmmyyyy(datos.proximaRevision) : '');
  r += 2;
  wsPrevias.mergeCells(r, 1, r, NCOLS);
  wsPrevias.getCell(r, 1).value = 'PROTOCOLOS DE VIGILANCIA MINSAL APLICABLES';
  wsPrevias.getCell(r, 1).font = { bold: true };
  r++;
  if (datos.protocolosSel.length === 0) {
    wsPrevias.mergeCells(r, 1, r, NCOLS); wsPrevias.getCell(r, 1).value = 'Ninguno marcado como aplicable'; r++;
  } else {
    datos.protocolosSel.forEach(i => {
      wsPrevias.mergeCells(r, 1, r, NCOLS); wsPrevias.getCell(r, 1).value = '- ' + MIPER_PROTOCOLOS[i]; r++;
    });
  }
  r++;
  r = escribirEncabezadoTabla(wsPrevias, r);
  let banco = [];
  try { banco = await cargarMiperBanco(); } catch (e) { /* si no carga el banco histórico, solo quedan las filas nuevas */ }
  escribirFilasTabla(wsPrevias, r, [...banco, ...datos.filas]);
  anchoColumnas(wsPrevias, ANCHOS_TABLA);

  // ---- Hoja 3: ANEXO 1 - LEVANTAMIENTO PROCESO (tareas levantadas de la obra) ----
  // Encabezado con "Tarea" como grupo sobre 2 subcolumnas (Nombre /
  // Rutinaria-No Rutinaria) y las etiquetas textuales exactas del Excel
  // original (incluida "Identidad Sexogenérica").
  const wsAnexo1 = wb.addWorksheet('ANEXO 1 - LEVANTAMIENTO PROCESO');
  const centrado1 = { wrapText: true, vertical: 'middle', horizontal: 'center' };
  wsAnexo1.mergeCells(1, 1, 1, 8);
  wsAnexo1.getCell(1, 1).value = 'LEVANTAMIENTO DE PROCESOS';
  wsAnexo1.getCell(1, 1).font = { name: 'Calibri', bold: true, size: 14 };
  const encAnexo1_1 = ['Proceso', 'Puesto de trabajo(s) involucrado(s)', 'Tarea', '', 'Lugar especifico de trabajo',
    'N° de personas trabajadoras', 'Identidad Sexogenérica', 'Observaciones'];
  encAnexo1_1.forEach((h, i) => {
    const c = i + 1;
    if (c === 4) return;
    const cell = wsAnexo1.getCell(3, c);
    cell.value = h; cell.font = { name: 'Calibri', bold: true, size: 10 }; cell.alignment = centrado1; cell.border = borde;
    if (c !== 3) wsAnexo1.mergeCells(3, c, 4, c);
  });
  wsAnexo1.mergeCells(3, 3, 3, 4);
  ['Nombre', 'Rutinaria /\nNo Rutinaria'].forEach((h, i) => {
    const cell = wsAnexo1.getCell(4, 3 + i);
    cell.value = h; cell.font = { name: 'Calibri', bold: true, size: 9 }; cell.alignment = centrado1; cell.border = borde;
  });
  [3, 4].forEach(rr => { for (let c = 1; c <= 8; c++) wsAnexo1.getCell(rr, c).border = borde; wsAnexo1.getRow(rr).height = 15; });
  (datos.tareas || []).forEach((t, i) => {
    const fr = 5 + i;
    const vals = [t.proceso, t.puesto, t.tarea, t.rutinaria, t.lugar, t.nPersonas, t.sexo, t.observaciones];
    vals.forEach((v, ci) => {
      const c = wsAnexo1.getCell(fr, ci + 1);
      c.value = v; c.font = { name: 'Calibri', size: 10 }; c.border = borde; c.alignment = centrado1;
    });
  });
  wsAnexo1.columns = [{width:24},{width:22},{width:26},{width:16},{width:20},{width:11},{width:10},{width:26}];

  // ---- Hojas ANEXO 2-5: catálogo de riesgos por familia ----
  const FAMILIAS_ANEXO = [
    ['ANEXO 2 - RIESGO SEGURIDAD', 'RIESGOS DE SEGURIDAD', 'SEGURIDAD'],
    ['ANEXO 3 - RIESGO HIGIENE', 'RIESGOS DE HIGIENE', 'HIGIENE'],
    ['ANEXO 4 - RIESGO MUSCULO ESQ.', 'RIESGOS DE MUSCULO ESQUELETICOS', 'MUSCULO_ESQUELETICO'],
    ['ANEXO 5 - RIESGO PSICOSOCIALES', 'RIESGOS PSICOSOCIALES', 'PSICOSOCIAL'],
  ];
  const catalogoCompleto = miperCatalogoCompleto();
  const centradoAnexo = { wrapText: true, vertical: 'middle', horizontal: 'center' };
  const izqAnexo = { wrapText: true, vertical: 'middle', horizontal: 'left' };
  FAMILIAS_ANEXO.forEach(([nombreHoja, subtitulo, familia]) => {
    const ws = wb.addWorksheet(nombreHoja);
    ws.mergeCells(1, 1, 1, 5);
    ws.getCell(1, 1).value = 'CODIFICACION DE RIESGOS LABORALES';
    ws.getCell(1, 1).font = { bold: true, size: 14 };
    ws.mergeCells(2, 1, 2, 5);
    ws.getCell(2, 1).value = subtitulo;
    ws.getCell(2, 1).font = { bold: true, size: 12 };
    const enc = ['FAMILIA DE RIESGO', 'RIESGO ESPECIFICO', 'DEFINICION', 'CODIGO', 'MEDIDAS PREVENTIVAS O DE CONTROL'];
    enc.forEach((h, i) => {
      const c = ws.getCell(4, i + 1); c.value = h; c.font = { bold: true }; c.alignment = centradoAnexo; c.border = borde;
    });
    ws.getRow(4).height = 15;
    let rr = 5;
    catalogoCompleto.filter(x => x.familia === familia).forEach(riesgo => {
      const medidas = riesgo.medidas && riesgo.medidas.length ? riesgo.medidas : [''];
      const filaInicioRiesgo = rr;
      medidas.forEach((medida, mi) => {
        ws.getCell(rr, 5).value = medida;
        ws.getCell(rr, 5).font = { size: 10 };
        ws.getCell(rr, 5).alignment = izqAnexo;
        for (let c = 1; c <= 5; c++) ws.getCell(rr, c).border = borde;
        rr++;
      });
      const filaFinRiesgo = rr - 1;
      const cFamilia = ws.getCell(filaInicioRiesgo, 1);
      cFamilia.value = MIPER_FAMILIA_LABEL[riesgo.familia] || riesgo.familia;
      cFamilia.font = { bold: true, size: 12 }; cFamilia.alignment = centradoAnexo;
      const cRiesgo = ws.getCell(filaInicioRiesgo, 2);
      cRiesgo.value = riesgo.riesgo; cRiesgo.font = { size: 10 }; cRiesgo.alignment = centradoAnexo;
      const cDef = ws.getCell(filaInicioRiesgo, 3);
      cDef.value = riesgo.definicion; cDef.font = { size: 10 }; cDef.alignment = izqAnexo;
      const cCod = ws.getCell(filaInicioRiesgo, 4);
      cCod.value = riesgo.codigo; cCod.font = { size: 10 }; cCod.alignment = centradoAnexo;
      if (filaFinRiesgo > filaInicioRiesgo) [1, 2, 3, 4].forEach(c => ws.mergeCells(filaInicioRiesgo, c, filaFinRiesgo, c));
    });
    ws.columns = [{width:16},{width:18},{width:32},{width:11},{width:75}];
  });

  // ---- Hoja ANEXO 6: Protocolos MINSAL ----
  const wsAnexo6 = wb.addWorksheet('ANEXO 6 - PROTOCOLOS VIGILANCIA');
  wsAnexo6.mergeCells(1, 1, 1, 3);
  wsAnexo6.getCell(1, 1).value = 'PROTOCOLOS DE VIGILANCIA EPIDEMIOLOGICA MINSAL';
  wsAnexo6.getCell(1, 1).font = { bold: true, size: 14 };
  ['N°', 'NOMBRE DEL PROTOCOLO', 'APLICA EN ESTA OBRA'].forEach((h, i) => {
    const c = wsAnexo6.getCell(3, i + 1); c.value = h; c.font = { bold: true }; c.border = borde;
  });
  MIPER_PROTOCOLOS.forEach((p, i) => {
    const fr = 4 + i;
    wsAnexo6.getCell(fr, 1).value = i + 1; wsAnexo6.getCell(fr, 1).border = borde;
    wsAnexo6.getCell(fr, 2).value = p; wsAnexo6.getCell(fr, 2).border = borde; wsAnexo6.getCell(fr, 2).alignment = { wrapText: true };
    wsAnexo6.getCell(fr, 3).value = datos.protocolosSel.includes(i) ? 'Sí' : 'No'; wsAnexo6.getCell(fr, 3).border = borde;
  });
  wsAnexo6.columns = [{width:6},{width:75},{width:16}];

  // ---- Hoja VEP ----
  const wsVep = wb.addWorksheet('VEP');
  ['VEP', 'NIVELES DE RIESGO', 'ACCION y TEMPORIZACION'].forEach((h, i) => {
    const c = wsVep.getCell(1, i + 1); c.value = h; c.font = { bold: true }; c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  MIPER_VEP.forEach((v, i) => {
    const fr = 2 + i;
    const color = MIPER_COLOR_NIVEL_EXCEL[v.nombre] || 'FFFFFFFF';
    wsVep.getCell(fr, 1).value = v.max === 2 ? '2 o menos' : v.max;
    wsVep.getCell(fr, 2).value = v.nombre;
    wsVep.getCell(fr, 3).value = v.accion;
    [1, 2, 3].forEach(c => {
      const cell = wsVep.getCell(fr, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      cell.border = borde;
      cell.alignment = c === 3 ? { wrapText: true, vertical: 'middle' } : { horizontal: 'center', vertical: 'middle', wrapText: true };
    });
  });
  wsVep.columns = [{width:12},{width:16},{width:80}];

  // ---- Hoja PROBABILIDAD ----
  const wsProb = wb.addWorksheet('PROBABILIDAD');
  ['Clasificación', 'Probabilidad de ocurrencia', '', '', '', 'Puntaje'].forEach((h, i) => {
    if (!h) return; const c = wsProb.getCell(1, i + 1); c.value = h; c.font = { bold: true };
  });
  MIPER_PROBABILIDAD.forEach((p, i) => {
    const fr = 2 + i;
    wsProb.getCell(fr, 1).value = p.nombre.toUpperCase(); wsProb.getCell(fr, 1).font = { bold: true }; wsProb.getCell(fr,1).border = borde;
    wsProb.mergeCells(fr, 2, fr, 5);
    wsProb.getCell(fr, 2).value = p.desc; wsProb.getCell(fr, 2).alignment = { wrapText: true }; wsProb.getCell(fr,2).border = borde;
    wsProb.getCell(fr, 6).value = p.valor; wsProb.getCell(fr,6).border = borde;
  });
  wsProb.columns = [{width:12},{width:22},{width:22},{width:22},{width:22},{width:10}];

  // ---- Hoja CONSECUENCIA o SEVERIDAD ----
  const wsCons = wb.addWorksheet('CONSECUENCIA o SEVERIDAD');
  ['Clasificación', 'Severidad o Gravedad', '', '', '', 'Puntaje'].forEach((h, i) => {
    if (!h) return; const c = wsCons.getCell(1, i + 1); c.value = h; c.font = { bold: true };
  });
  MIPER_CONSECUENCIA.forEach((cse, i) => {
    const fr = 2 + i;
    wsCons.getCell(fr, 1).value = cse.nombre; wsCons.getCell(fr, 1).font = { bold: true }; wsCons.getCell(fr,1).border = borde;
    wsCons.mergeCells(fr, 2, fr, 5);
    wsCons.getCell(fr, 2).value = cse.desc; wsCons.getCell(fr, 2).alignment = { wrapText: true }; wsCons.getCell(fr,2).border = borde;
    wsCons.getCell(fr, 6).value = cse.valor; wsCons.getCell(fr,6).border = borde;
  });
  wsCons.columns = [{width:20},{width:22},{width:22},{width:22},{width:22},{width:10}];

  // Logo LST — solo en la hoja principal (OBRAS PREVIAS), arriba a la
  // izquierda (columnas 1-3, que el título deja libres a propósito) para
  // no superponer ni tocar ninguna celda/combinación del contenido real.
  // logo.png es el logo azul vigente (aunque el archivo está codificado
  // como JPEG pese a la extensión .png — igual que en
  // generarPdfInvestigacion — por eso se declara extension:'jpeg'). Si no
  // carga, el documento se genera igual.
  try {
    const logoBuf = await fetch('logo.png').then(r => { if (!r.ok) throw new Error('logo.png no disponible'); return r.arrayBuffer(); });
    const logoId = wb.addImage({ buffer: logoBuf, extension: 'jpeg' });
    wsPrevias.addImage(logoId, { tl: { col: 0.15, row: 0.1 }, ext: { width: 65, height: 52 } });
  } catch (e) { /* sin logo, el Excel se genera igual */ }

  wb.views = [{ activeTab: 0 }];

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ============================================================
// MÓDULO: Capacitación DS44 art.16 (8 hrs obligatorias)
// ============================================================
// La capacitación se dicta aparte (a cargo de un experto en prevención de
// riesgos de LST) — acá solo se registra el resultado: fecha de vigencia +
// el certificado subido. Mismo patrón simple que Examen de Altura en la
// ficha del trabajador (ver abrirEditarAltura/guardarAltura).
let obraCapDs44Sel = 'todas';
function obraCapDs44Efectiva() {
  const obraGlobal = obraFiltroActivo();
  const obras = opcionesObrasDisponibles();
  return obraGlobal || (obraCapDs44Sel !== 'todas' && obras.includes(obraCapDs44Sel) ? obraCapDs44Sel : null);
}
function onCambioObraCapDs44(v) { obraCapDs44Sel = v; renderCapacitacionDs44(); }

function capacitacionDs44RecordDe(trabajador, obra) {
  return allCapacitacionDs44.find(r => r.trabajador === trabajador && r.obra === obra) || null;
}
function ds44Estado(rec) {
  if (!rec || !rec.fechaVencimiento) return { label: 'Sin registrar', badge: 'gray' };
  const vencido = rec.fechaVencimiento < hoyISO();
  return vencido
    ? { label: `Vencido (venció ${ddmmyyyy(rec.fechaVencimiento)})`, badge: 'red' }
    : { label: `Vigente hasta ${ddmmyyyy(rec.fechaVencimiento)}`, badge: 'green' };
}

function renderCapacitacionDs44() {
  const obraGlobal = obraFiltroActivo();
  const obras = opcionesObrasDisponibles();
  const obraEfectiva = obraCapDs44Efectiva();
  const selectorObraHtml = obraGlobal ? '' : `
    <div class="stats-obra-bar">${ic('obra',16)}
      <select class="obra-selector" onchange="onCambioObraCapDs44(this.value)">
        <option value="todas">Elige una obra...</option>
        ${obras.map(o => `<option value="${esc(o)}" ${o===obraCapDs44Sel?'selected':''}>${esc(o)}</option>`).join('')}
      </select>
    </div>`;
  if (!obraEfectiva) {
    setListHTML('capacitacionds44', selectorObraHtml + emptyState('Elige una obra', 'Selecciona una obra arriba para ver la capacitación DS44 de sus trabajadores'));
    return;
  }
  const trabajadores = allTrabajadores.filter(t => t.estado === 'Activo' && t.obra === obraEfectiva)
    .slice().sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));

  setListHTML('capacitacionds44', `
    ${selectorObraHtml}
    <div class="card card--default">
      <div class="card-icon modulo-icon--inv">${ic('capacitacion',18)}</div>
      <div class="card-body">
        <div class="card-title">Capacitación DS44 art.16 — 8 horas obligatorias</div>
        <div class="card-sub">Vigencia 2 años. Elige un trabajador para subir o actualizar su certificado.</div>
      </div>
    </div>
    ${trabajadores.length === 0 ? emptyState('Sin trabajadores activos', 'No hay trabajadores activos en esta obra') :
      trabajadores.map(t => {
        const rec = capacitacionDs44RecordDe(t.nombre, obraEfectiva);
        const estado = ds44Estado(rec);
        return `
      <div class="card card--default" onclick="abrirEditarDs44('${esc(t.nombre)}','${esc(obraEfectiva)}')">
        <div class="card-body">
          <div class="card-title">${esc(t.nombre)}</div>
          <div class="card-sub">${esc(t.cargo || '')}</div>
          <div class="badge-row"><span class="badge ${estado.badge}">${estado.label}</span></div>
        </div>
        <div class="card-arrow">›</div>
      </div>`;
      }).join('')}
  `);
}

async function obtenerOCrearCapacitacionDs44(trabajador, obra) {
  let rec = capacitacionDs44RecordDe(trabajador, obra);
  if (rec) return rec;
  const trab = allTrabajadores.find(t => t.nombre === trabajador);
  const ahora = new Date().toLocaleString('es-CL');
  const data = await appendSheet(`'${CONFIG.SHEET_CAPACITACION_DS44}'!A:M`, [[
    allCapacitacionDs44.length + 1, trabajador, trab ? trab.rut : '', obra, ahora, '[]',
    '', '', '', '', '', ahora, userEmail || ''
  ]]);
  const m = /![A-Za-z]+(\d+)/.exec((data.updates && data.updates.updatedRange) || '');
  const fila = m ? parseInt(m[1], 10) : null;
  rec = { fila, n: allCapacitacionDs44.length + 1, trabajador, rut: trab ? trab.rut : '', obra,
    fechaInicio: ahora, modulosCompletados: [], fechaCompletado: '', fechaVencimiento: '',
    facilitadorSincronico: '', fechaSincronico: '', certificado: '', fechaRegistro: ahora, registradoPor: userEmail || '' };
  allCapacitacionDs44.push(rec);
  return rec;
}
async function actualizarCeldaDs44(fila, col, valor) {
  await ensureToken();
  const url = `${SHEETS_BASE}/${CONFIG.SHEET_ID}/values/${encodeURIComponent(`'${CONFIG.SHEET_CAPACITACION_DS44}'!${col}${fila}`)}?valueInputOption=USER_ENTERED`;
  await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ values: [[valor]] }) });
}

function abrirEditarDs44(trabajador, obra) {
  const rec = capacitacionDs44RecordDe(trabajador, obra);
  const f = document.getElementById('form-editar-ds44');
  f.reset();
  f.trabajador.value = trabajador;
  f.obra.value = obra;
  f.vigencia.value = rec ? rec.fechaVencimiento || '' : '';
  openPanel('panel-editar-ds44');
}
async function guardarCertificadoDs44(ev) {
  ev.preventDefault();
  const f = ev.target;
  const trabajador = f.trabajador.value;
  const obra = f.obra.value;
  try {
    const rec = await obtenerOCrearCapacitacionDs44(trabajador, obra);
    const archivoFile = f.archivo.files[0];
    if (archivoFile) {
      const up = await uploadFileTrabajador(archivoFile, trabajador, 'certificado_ds44');
      rec.certificado = up.link;
      await actualizarCeldaDs44(rec.fila, 'K', rec.certificado);
    }
    rec.fechaVencimiento = f.vigencia.value;
    await actualizarCeldaDs44(rec.fila, 'H', rec.fechaVencimiento);
    toast('Certificado DS44 actualizado ✓', 'ok');
    closePanel('panel-editar-ds44');
    await cargarTodo(true);
    if (!document.getElementById('panel-ficha-trabajador').classList.contains('hidden')) abrirFichaTrabajador(trabajador);
    renderCapacitacionDs44();
  } catch (e) { toast(e.message, 'error'); }
}


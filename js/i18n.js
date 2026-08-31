/**
 * Bilingual layer (English / Spanish) for the SIMPLE Field Station.
 *
 * Two kinds of text are handled here.
 *
 *   1. Static markup. Elements in index.html carry data-i18n attributes. The
 *      English already written into the HTML is harvested into the `en`
 *      dictionary on first load, so English is never duplicated and switching
 *      back to it restores the original wording exactly.
 *
 *   2. Text built by JavaScript — parameter labels, growth stages, trials,
 *      chart axes. Those live in the dictionaries below, keyed by the stable
 *      ids already used in data.js / explorer.js. Where a key is missing the
 *      caller's own string is used, so an untranslated string degrades to
 *      English instead of showing a raw key.
 *
 * Parameter symbols (RUE, HI, Tsum, I50A, f_Solar, ARID, S_CO2) are deliberately
 * NOT translated: they are the notation of Zhao et al. (2019) and of the Python
 * parameter files, and they have to keep matching the paper.
 *
 * Spanish is Latin American, matching the CGIAR/CIAT audience.
 */

const I18N = (function () {

/* ==========================================================================
   Spanish dictionary
   ========================================================================== */

const ES = {

/* ---- chrome ---------------------------------------------------------- */
'meta.title': 'Modelo de cultivo SIMPLE — Estación de Campo',
'meta.desc': 'Una lección interactiva de modelación de cultivos basada en procesos: mueva un parámetro y observe cómo responden la biomasa y la planta.',
'brand.name': 'Estación de Campo',
'nav.aria': 'Secciones',
'nav.learn': 'Aprender',
'nav.grow': 'Cultivar',
'nav.analyse': 'Analizar',
'nav.trials': 'Ensayos',
'lang.aria': 'Idioma',
'lang.switch': 'Cambiar idioma',

/* ---- ribbon ---------------------------------------------------------- */
'ribbon.play': 'Reproducir la temporada',
'ribbon.rewind': 'Volver a la siembra',
'ribbon.scrub': 'Día de la temporada',
'ribbon.dayTag': 'Día de la temporada',
'ribbon.jumpTo': 'Ir a {stage}',

/* ---- learn ----------------------------------------------------------- */
'learn.lede': 'Un modelo de cultivo es un argumento sobre qué limita a una planta. SIMPLE plantea ese argumento en una sola línea de aritmética, repetida una vez al día, desde la siembra hasta la madurez.',
'learn.eq3note': 'Zhao et al. (2019), Ecuación 3. Todo lo que hace esta aplicación es una exploración de ese producto.',
'learn.p1': 'Léala de izquierda a derecha. La <strong>radiación</strong> es lo que ofrece el cielo. <strong>f<sub>Solar</sub></strong> es la fracción que el dosel realmente intercepta. <strong>RUE</strong> es la eficiencia con que el cultivo convierte esa luz en materia seca. Los términos restantes son todos fracciones entre 0 y 1: solo pueden restar.',
'learn.p2': 'Fíjese en el <strong>min[ ]</strong>. El calor y la sequía no se suman. Cualquier día dado, al cultivo lo frena el peor de los dos, siguiendo la ley del mínimo de Liebig. Esa sola decisión explica buena parte de lo que verá en el simulador.',
'learn.h2.three': 'Tres cosas deciden un rendimiento',
'learn.three.p': 'Los controles de esta aplicación están agrupados como realmente piensan los agrónomos sobre un lote: el marco G &times; A &times; M (genotipo, ambiente, manejo).',
'learn.li.g': '<strong>G — la semilla.</strong> Lo que el fitomejorador fijó antes de que empezara la temporada: eficiencia en el uso de la radiación, índice de cosecha, qué tan rápido cierra el dosel, cuánto tarda en madurar, qué temperaturas tolera el cultivo.',
'learn.li.e': '<strong>A — el cielo y el suelo.</strong> Lo que entrega la temporada y lo que retiene el lote: temperatura, lluvia, radiación, CO<sub>2</sub> y la capacidad del suelo de almacenar agua entre aguaceros.',
'learn.li.m': '<strong>M — el agricultor.</strong> Lo que se decide en campo: fecha de siembra, densidad de plantas, si se riega o no.',
'learn.three.p2': 'Un parámetro que domina en una combinación apenas importa en otra. La sección <strong>Analizar</strong> los ordena para la situación que usted haya configurado, lo cual es más útil que cualquier lista fija.',
'learn.h2.timing': 'Cómo se mide el tiempo de la temporada',
'learn.timing.p1': 'SIMPLE no tiene calendario. Tiene un termómetro. Cada día acumula la temperatura media por encima de un umbral base, y el cultivo madura cuando lo acumulado alcanza T<sub>sum</sub>:',
'learn.timing.p2': 'Por eso el calentamiento no es simplemente bueno o malo. Una temporada más cálida llena el banco térmico más rápido, así que el cultivo madura antes: menos días captando luz, menos biomasa, incluso antes de que ocurra cualquier daño por calor. Mueva el control de temperatura y verá caer la duración de la temporada antes de que el contador de estrés por calor se mueva siquiera.',
'learn.h2.canopy': 'Cómo se abre y se cierra el dosel',
'learn.canopy.p1': 'f<sub>Solar</sub> son dos curvas logísticas que se encuentran en un mínimo: una de expansión y otra de senescencia.',
'learn.canopy.p2': '<strong>I50A</strong> determina qué tan rápido se construye el dosel; <strong>I50B</strong>, cuánto tiempo se mantiene. Y I50B no es constante: cada día de calor o de sequía se le suma, lo que adelanta la senescencia:',
'learn.canopy.p3': 'Esta es la memoria del modelo. Una ola de calor en la cuarta semana le sigue costando luz en la décima, porque el dosel envejeció.',
'learn.callout1.tag': 'Por qué f<sub>Solar</sub> y no área foliar',
'learn.callout1.body': 'SIMPLE sigue deliberadamente la <em>luz</em> interceptada en lugar del índice de área foliar, lo que elimina toda una capa de parámetros. La planta 3D de la sección Cultivar recorre esa decisión al revés — invirtiendo Beer-Lambert, IAF = &minus;ln(1 &minus; f<sub>Solar</sub>) / k — para recuperar un área foliar que pueda dibujar. La planta es un retrato del estado del modelo, no una simulación aparte.',
'learn.h2.water': 'De dónde viene el agua',
'learn.water.p1': 'La lluvia que cae no es la lluvia que se aprovecha. Un paso de número de curva descuenta la escorrentía, un paso de drenaje descuenta lo que el suelo no puede retener, y lo que queda está disponible para la transpiración. El déficit entre lo que el cultivo quería y lo que recibió es el índice ARID, y de él se deriva f(Agua):',
'learn.water.p2': 'S<sub>water</sub> es un rasgo de especie. El maíz está en 1.2 y el trigo en 0.4: la misma sequía les cuesta cantidades muy distintas.',
'learn.h2.gap': 'La brecha que vale la pena medir',
'learn.gap.p': 'Correr el mismo cultivo dos veces — una con limitación hídrica y otra sin ella — da dos números que enmarcan cualquier conversación sobre rendimiento:',
'learn.gap.li1': '<strong>Y<sub>p</sub>, rendimiento potencial.</strong> El agua nunca limita. Lo fijan la radiación, la temperatura, el CO<sub>2</sub> y la genética.',
'learn.gap.li2': '<strong>Y<sub>w</sub>, rendimiento limitado por agua.</strong> El cultivo vive de la lluvia y de lo que el suelo haya almacenado.',
'learn.gap.li3': '<strong>La brecha de rendimiento</strong> es la diferencia, y le dice si la restricción que tiene enfrente es el agua o algo que el riego no puede resolver.',
'learn.callout2.tag': 'Una advertencia sobre las cifras',
'learn.callout2.body': 'El clima aquí se genera con funciones estacionales suaves, no con registros medidos, y algunos valores de T<sub>sum</sub> por cultivar se recalibraron para ajustarse a esos climas sintéticos. Tome cada rendimiento absoluto como ilustrativo. Las <em>relaciones</em> — la dirección y la forma de cada respuesta — son para lo que sirve esta aplicación.',

/* ---- grow ------------------------------------------------------------ */
'grow.controls': 'Controles',
'grow.notes': 'Notas',
'grow.notes.title': 'Mostrar una nota bajo cada control',
'grow.reset': 'Reiniciar',
'grow.crop': 'Cultivo',
'grow.crop.aria': 'Especie de cultivo',
'grow.cultivar': 'Cultivar',
'grow.climate': 'Clima',
'grow.climate.aria': 'Zona climática',
'grow.climate.tropical': 'Tropical — lluvia bimodal',
'grow.climate.subtropical': 'Subtropical — lluvia de verano',
'grow.climate.semi_arid': 'Semiárido — lluvia de invierno',
'grow.climate.cool_temperate': 'Templado frío',
'grow.soil': 'Textura del suelo',
'grow.soil.aria': 'Textura del suelo',
'grow.irrigation.aria': 'Riego',
'grow.rainfed': 'Secano &mdash; mostrando Y<sub>w</sub>',
'grow.irrigated': 'Con riego &mdash; mostrando Y<sub>p</sub>',
'grow.plant': 'La planta',
'grow.vpmode.aria': 'Vista de la planta',
'grow.vp.single': 'Individual',
'grow.vp.compare': 'Secano vs. riego',
'grow.vp.field': 'Población',
'grow.rays': 'Rayos de luz',
'grow.rays.title': 'Lanzar rayos para mostrar la intercepción de luz',
'grow.vp.note': 'Geometría derivada del estado del modelo<br>(TT, f<sub>Solar</sub>, f<sub>water</sub>, f<sub>heat</sub>) &mdash; no es morfología simulada',
'grow.season': 'Trayectoria de la temporada',
'grow.chart.aria': 'Gráfico',
'grow.chart.biomass': 'Biomasa',
'grow.chart.canopy': 'Dosel',
'grow.chart.stress': 'Estrés',
'grow.chart.weather': 'Clima',
'grow.chart.water': 'Agua del suelo',

/* ---- analyse --------------------------------------------------------- */
'an.today': 'A dónde fue el crecimiento de hoy',
'an.wf.note': 'Cada barra es la tasa de crecimiento después de aplicar un factor más. La referencia de arriba es un dosel cerrado sin limitación de temperatura, calor ni agua, bajo la misma radiación y el mismo CO<sub>2</sub>. Arrastre la cinta para recorrer la temporada.',
'an.season': 'A dónde fue la temporada',
'an.tornado': 'Qué parámetro pesa más, aquí',
'an.perturbation': 'Perturbación',
'an.perturbation.aria': 'Tamaño de la perturbación',
'an.pct5': '&plusmn;5% del rango',
'an.pct15': '&plusmn;15% del rango',
'an.pct30': '&plusmn;30% del rango',
'an.metric.aria': 'Métrica del tornado',
'an.metric.biomass': 'Biomasa',
'an.metric.yield': 'Rendimiento',
'an.tornado.note': 'Cada parámetro se mueve hacia arriba y hacia abajo en la misma fracción de su propio rango plausible, y el modelo se vuelve a correr cada vez. El orden es específico del cultivo, el clima y el suelo que haya configurado: cambie cualquiera de ellos y el orden cambia.',
'an.sweep': 'Curva de respuesta',
'an.sweep.aria': 'Parámetro a barrer',
'an.surface': 'Superficie de respuesta',
'an.surface.x': 'Eje X de la superficie',
'an.surface.y': 'Eje Y de la superficie',
'an.compare': 'Comparar dos escenarios',
'an.saveA': 'Guardar como A',
'an.saveB': 'Guardar como B',
'an.clear': 'Limpiar',
'an.scenA': 'Escenario A',
'an.scenB': 'Escenario B',
'an.emptyA': 'Configure una corrida en Cultivar y guárdela aquí.',
'an.emptyB': 'Cambie algo y guarde la segunda corrida.',
'an.th.metric': 'Métrica',
'an.th.a': 'Escenario A',
'an.th.b': 'Escenario B',
'an.th.diff': 'Diferencia',

/* ---- trials ---------------------------------------------------------- */
'tr.h2': 'Ensayos guiados',
'tr.p': 'Cada ensayo carga una configuración y plantea una pregunta. Cárguelo y luego vaya a <strong>Cultivar</strong> para ver la temporada, o a <strong>Analizar</strong> para ver qué parámetro está impulsando el resultado.',
'tr.load': 'Cargar este ensayo',

/* ---- footer ---------------------------------------------------------- */
'ft.model': '<strong>Modelo.</strong> Zhao, C., Liu, B., Xiao, L., Hoogenboom, G., Boote, K. J., Kassie, B. T., Pavan, W., Shelia, V., Kim, K. S., Hernandez-Ochoa, I. M., Wallach, D., Porter, C. H., Stockle, C. O., Zhu, Y., &amp; Asseng, S. (2019). A SIMPLE crop model. <em>European Journal of Agronomy</em>, 104, 97&ndash;106.',
'ft.water': '<strong>Balance hídrico.</strong> Woli, P., Jones, J. W., Ingram, K. T., &amp; Fraisse, C. W. (2012). Agricultural Reference Index for Drought (ARID). <em>Agronomy Journal</em>, 104(2), 287&ndash;300.',
'ft.staging': '<strong>Estados fenológicos del frijol.</strong> Escala de estados de desarrollo del CIAT para <em>Phaseolus vulgaris</em> (Fern&aacute;ndez, Gepts &amp; L&oacute;pez).',
'ft.caution': 'El clima es sintético. Los rendimientos absolutos son ilustrativos; la forma de cada respuesta es la lección.',

/* ---- crops ----------------------------------------------------------- */
'crop.wheat': 'Trigo (C3)',
'crop.rice': 'Arroz (C3)',
'crop.maize': 'Maíz (C4)',
'crop.soybean': 'Soya (C3)',
'crop.potato': 'Papa (C3)',
'crop.tomato': 'Tomate (C3)',
'crop.cotton': 'Algodón (C3)',
'crop.cassava': 'Yuca (C3)',
'crop.drybean': 'Frijol común — grano seco (C3)',
'crop.grbean': 'Frijol común — vaina verde (C3)',

/* ---- soils ----------------------------------------------------------- */
'soil.sand': 'Arena',
'soil.sandy_loam': 'Franco arenoso',
'soil.loam': 'Franco',
'soil.clay_loam': 'Franco arcilloso',
'soil.clay': 'Arcilla',

/* ---- cultivar notes -------------------------------------------------- */
'cv.porrillo.note': 'Frijol negro mesoamericano, hábito indeterminado postrado. La variedad testigo de referencia del CIAT.',
'cv.calima.note': 'Frijol andino rojo moteado, de arbusto. Determinado, ciclo corto, grano grande.',
'cv.bat477.note': 'Línea del CIAT tolerante a sequía. Raíz profunda, mantiene el dosel bajo déficit hídrico.',
'cv.g2333.note': 'Frijol volubre, se siembra con tutor o asociado con maíz. Ciclo largo, alta biomasa, menor índice de cosecha.',
'cv.bronco.note': 'Frijol de vaina determinado, de arbusto. Se cosecha en llenado de vaina, antes de que madure el grano.',
'cv.recal': 'Tsum recalibrado a {tsum} °C·d para los climas sintéticos; Zhao et al. (2019), Tabla 1a, da Tsum {paper}{also}.',

/* ---- bean growth habits ---------------------------------------------- */
'habit.I': 'Tipo I — arbustivo determinado',
'habit.II': 'Tipo II — arbustivo indeterminado',
'habit.III': 'Tipo III — postrado indeterminado',
'habit.IV': 'Tipo IV — volubre indeterminado',
'habit.type': 'Tipo',

/* ---- parameter groups ------------------------------------------------ */
'grp.seed.title': 'La Semilla',
'grp.seed.sub': 'lo que elige el fitomejorador',
'grp.sky.title': 'Clima',
'grp.sky.sub': 'lo que entrega la temporada',
'grp.ground.title': 'El Suelo',
'grp.ground.sub': 'lo que retiene el lote',
'grp.farmer.title': 'Manejo',
'grp.farmer.sub': 'lo que usted decide',

/* ---- parameters ------------------------------------------------------ */
'p.RUE.label': 'Eficiencia en el uso de la radiación',
'p.RUE.help': 'Gramos de biomasa producidos por megajulio de radiación interceptada. El motor de todo el modelo.',
'p.HI.label': 'Índice de cosecha',
'p.HI.help': 'Fracción de la biomasa total que termina en el órgano cosechado. Se aplica una sola vez, a la madurez.',
'p.Tsum.label': 'Tiempo térmico hasta la madurez',
'p.Tsum.help': 'Temperatura media acumulada por encima de Tbase necesaria para alcanzar la madurez. Define la duración de la temporada.',
'p.I50A.label': 'Construcción del dosel',
'p.I50A.help': 'Tiempo térmico necesario para interceptar el 50% de la radiación durante el cierre del dosel. Menor valor, dosel más rápido.',
'p.I50B.label': 'Duración de la senescencia',
'p.I50B.help': 'Tiempo térmico antes de la madurez en que el dosel cae al 50%. Define cuánto tiempo permanece verde el cultivo.',
'p.Tbase.label': 'Temperatura base',
'p.Tbase.help': 'Temperatura por debajo de la cual no hay desarrollo ni crecimiento.',
'p.Topt.label': 'Temperatura óptima',
'p.Topt.help': 'Temperatura a la que el crecimiento alcanza su tasa máxima. Por debajo, f(Temp) baja linealmente.',
'p.MaxT.label': 'Umbral de estrés por calor',
'p.MaxT.help': 'Temperatura máxima diaria por encima de la cual el calor empieza a recortar la tasa de crecimiento.',
'p.ExtremeT.label': 'Temperatura letal',
'p.ExtremeT.help': 'Máxima diaria a la que el crecimiento se detiene por completo. El borde del precipicio de la función de calor.',
'p.S_Water.label': 'Sensibilidad a la sequía',
'p.S_Water.help': 'Con qué fuerza muerde el índice de sequía ARID. El maíz está en 1.2 y el trigo en 0.4.',
'p.CO2_RUE.label': 'Respuesta al CO2',
'p.CO2_RUE.help': 'Ganancia porcentual en RUE por ppm de CO2. Los cultivos C3 rondan 0.08 y los C4, 0.01.',
'p.I50maxH.label': 'Envejecimiento por calor',
'p.I50maxH.help': 'Cuánto acelera la senescencia del dosel un día de estrés por calor.',
'p.I50maxW.label': 'Envejecimiento por sequía',
'p.I50maxW.help': 'Cuánto acelera la senescencia del dosel un día de estrés hídrico.',
'p.tempShift.label': 'Desplazamiento de temperatura',
'p.tempShift.help': 'Calentamiento o enfriamiento uniforme aplicado a todos los días de la temporada.',
'p.rainScale.label': 'Multiplicador de lluvia',
'p.rainScale.help': 'Escala cada evento de lluvia. Cero es una temporada de pérdida total.',
'p.sradScale.label': 'Multiplicador de radiación',
'p.sradScale.help': 'Escala la radiación solar incidente: cielos más nublados o más despejados.',
'p.co2.label': 'Concentración de CO2',
'p.co2.help': 'CO2 atmosférico. La respuesta del modelo se satura por encima de 700 ppm.',
'p.awc.label': 'Capacidad de agua disponible',
'p.awc.help': 'Agua que el suelo retiene por unidad de profundidad frente al drenaje.',
'p.rcn.label': 'Número de curva de escorrentía',
'p.rcn.help': 'Número de curva del SCS. Más alto significa que más lluvia escurre en vez de infiltrarse.',
'p.rzd.label': 'Profundidad de la zona radical',
'p.rzd.help': 'Profundidad de suelo desde la que el cultivo extrae agua. Raíces más profundas amortiguan las rachas secas.',
'p.sowingDay.label': 'Fecha de siembra',
'p.sowingDay.help': 'Cuándo entra el cultivo al suelo. Desplaza toda la temporada frente al clima.',
'p.fSolarMax.label': 'Densidad de siembra',
'p.fSolarMax.help': 'Fracción máxima de radiación que puede interceptar un dosel cerrado. El artículo la trata como una decisión de manejo, no como un rasgo del cultivo: surcos más anchos, techo más bajo.',

/* ---- units ----------------------------------------------------------- */
'u.day of year': 'día del año',

/* ---- phenology, bean (CIAT scale) ------------------------------------ */
'st.VE.label': 'Emergencia',
'st.VE.detail': 'Cotiledones en la superficie, hipocótilo enderezándose.',
'st.V1.label': 'Hojas primarias',
'st.V1.detail': 'Se abren las dos hojas simples opuestas.',
'st.V3.label': 'Tercera trifoliada',
'st.V3.detail': 'Se acelera la construcción del dosel; I50A gobierna el ritmo.',
'st.V4.label': 'Ramificación',
'st.V4.detail': 'Aparecen las ramas laterales, el dosel se acerca al cierre.',
'st.R5.label': 'Prefloración',
'st.R5.detail': 'Primeros botones florales visibles en los racimos.',
'st.R6.label': 'Floración',
'st.R6.detail': 'Primera flor abierta. El calor aquí cuesta vainas directamente.',
'st.R7.label': 'Formación de vainas',
'st.R7.detail': 'Las vainas se alargan; la demanda de asimilados pasa a la reproducción.',
'st.R8.label': 'Llenado de vainas',
'st.R8.detail': 'El grano gana peso. Empieza la senescencia del dosel (I50B).',
'st.R9.label': 'Madurez',
'st.R9.detail': 'Las vainas se secan, caen las hojas. El crecimiento se detiene en Tsum.',

/* ---- phenology, generic ---------------------------------------------- */
'st.EM.label': 'Emergencia',
'st.EM.detail': 'La plántula alcanza la superficie.',
'st.CB.label': 'Construcción del dosel',
'st.CB.detail': 'El área foliar se expande; I50A fija la tasa.',
'st.FC.label': 'Dosel pleno',
'st.FC.detail': 'f_solar se acerca a f_solar_max: la captura de luz es máxima.',
'st.FL.label': 'Floración',
'st.FL.detail': 'Transición reproductiva.',
'st.GF.label': 'Llenado de grano',
'st.GF.detail': 'Los asimilados van al órgano cosechado.',
'st.MA.label': 'Madurez',
'st.MA.detail': 'Se completa la senescencia; se alcanza Tsum.',

/* ---- readout --------------------------------------------------------- */
'ro.biomass': 'Biomasa',
'ro.yield': 'Rendimiento',
'ro.light': 'Luz captada',
'ro.lai': 'Área foliar',
'ro.tt': 'Tiempo térmico',
'ro.limiting': 'Limitante',
'ro.limit.water': 'agua',
'ro.limit.heat': 'calor',
'ro.yw': 'Y<sub>w</sub> secano',
'ro.yp': 'Y<sub>p</sub> con riego',
'ro.gap': 'Brecha de rendimiento',
'ro.season': 'Temporada',
'ro.days': 'días',
'ro.lai.unit': 'IAF',

/* ---- 3D viewport ----------------------------------------------------- */
'vp.rays.hit': '<span class="ray-num">{measured}</span> de los rayos tocó una hoja. El modelo dice f<sub>Solar</sub> = <span class="ray-num">{modelled}</span>.',
'vp.rays.agree': ' <em>Coinciden: este dosel está lo bastante cerrado para que Beer-Lambert se sostenga.</em>',
'vp.rays.disagree': ' <em>Una planta sola se queda corta: casi todo su cuadro de suelo está desnudo. Cambie a Población y convergen.</em>',
'vp.fail.start': 'La vista 3D no pudo iniciarse en este navegador. Todo lo demás en esta página sigue funcionando.',
'vp.fail.load': 'La vista 3D necesita la biblioteca three.js, que no se pudo cargar. Revise la conexión de red — el resto de la página funciona sin conexión.',
'vp.schematic.note': 'Intercepción de luz leída del modelo. La planta 3D representa frijol común.',
'vp.groundCover': 'cobertura del suelo',
'vp.intercepted': 'interceptado',
'vp.toSoil': 'al suelo',
'vp.label.rainfed': 'Secano',
'vp.label.irrigated': 'Con riego',

/* ---- charts ---------------------------------------------------------- */
'ch.dayOfSeason': 'Día de la temporada',
'ch.biomass.irr': 'Biomasa — con riego',
'ch.biomass.rain': 'Biomasa — secano',
'ch.yield': 'Rendimiento',
'ch.fsolar': 'f_solar — luz interceptada',
'ch.lai': 'IAF (derivado)',
'ch.tt': 'Tiempo térmico',
'ch.multiplier': 'multiplicador (1 = sin limitación)',
'ch.rain': 'Lluvia',
'ch.radiation': 'Radiación',
'ch.storedWater': 'Agua almacenada en el suelo',
'ch.capacity': 'Capacidad',
'ch.arid': 'Índice de sequía ARID',
'ch.cumBiomass': 'Biomasa acumulada (t/ha)',
'ch.biomassLabel': 'Biomasa',

/* ---- waterfall & losses ---------------------------------------------- */
'wf.day': 'Día {n}',
'wf.reference': 'Referencia',
'wf.canopy': '− dosel',
'wf.temperature': '− temperatura',
'wf.heat': '− calor',
'wf.water': '− agua',
'wf.achieved': 'Logrado',
'ls.achieved': 'Biomasa lograda',
'ls.canopy': 'Perdido por dosel abierto',
'ls.temp': 'Perdido por temperatura',
'ls.heat': 'Perdido por calor',
'ls.water': 'Perdido por agua',
'ls.axis': 't/ha de biomasa potencial',
'ls.sentence': 'Frente a un dosel totalmente cerrado y sin estrés, esta temporada alcanzó <strong>{got} t/ha</strong> de las <strong>{could} t/ha</strong> que su radiación habría podido sostener. El mayor déficit individual fue <strong>{cause}</strong>, con {amount} t/ha.',
'ls.none': 'Esta temporada transcurrió sin ninguna limitación medible.',
'ls.cause.canopy': 'dosel abierto',
'ls.cause.temp': 'temperatura',
'ls.cause.heat': 'calor',
'ls.cause.water': 'agua',

/* ---- tornado / sweep / surface ---------------------------------------- */
'to.param': 'parám.',
'to.legend': '← menor &nbsp;&nbsp; base {base} &nbsp;&nbsp; mayor →',
'sw.best': 'Rendimiento más alto en <strong>{sym} = {val} {unit}</strong> ({yield} t/ha). La línea punteada marca su ajuste actual, {current}.',
'su.same': 'Elija dos parámetros distintos para ver cómo interactúan.',
'su.computing': 'Calculando {n} corridas…',
'su.note': 'Rendimiento a lo largo de <strong>{x}</strong> (horizontal) y <strong>{y}</strong> (vertical, {ymin} abajo). El anillo marca su ajuste actual. Una superficie plana en una dirección significa que ese parámetro no tiene incidencia en esta situación.',

/* ---- scenarios -------------------------------------------------------- */
'sc.irrigated': 'con riego',
'sc.rainfed': 'secano',
'sc.sownDoy': 'sembrado DDA {doy}',
'sc.weather': 'ΔT {dt}°C, lluvia ×{rain}, CO₂ {co2} ppm',
'sc.climate.tropical': 'tropical',
'sc.climate.subtropical': 'subtropical',
'sc.climate.semi_arid': 'semiárido',
'sc.climate.cool_temperate': 'templado frío',
'sc.row.yield': 'Rendimiento',
'sc.row.biomass': 'Biomasa',
'sc.row.season': 'Duración de la temporada',
'sc.row.peakF': 'Captura máxima de luz',
'sc.row.peakLAI': 'Área foliar máxima',
'sc.row.waterDays': 'Días con estrés hídrico',
'sc.row.heatDays': 'Días con estrés por calor',

/* ---- guided trials ---------------------------------------------------- */
't1.eyebrow': 'Ensayo 01 · Calentamiento',
't1.title': 'Por qué +3 °C cuesta rendimiento dos veces',
't1.body': 'El calentamiento acorta la temporada antes siquiera de quemar una hoja. El cultivo acumula tiempo térmico más rápido, llega a T<sub>sum</sub> antes y simplemente tiene menos días para interceptar luz. El estrés por calor llega encima de eso.',
't1.look': 'Vea caer la duración de la temporada en el tablero y luego revise el tornado: ¿ΔT actúa a través de T<sub>sum</sub> o de T<sub>heat</sub>?',
't2.eyebrow': 'Ensayo 02 · CO₂',
't2.title': 'El C3 gana, el C4 se encoge de hombros',
't2.body': 'El aumento de CO₂ eleva la eficiencia en el uso de la radiación, pero solo tanto como lo permita la ruta fotosintética del cultivo. El frijol tiene S<sub>CO2</sub> = 0.07; el maíz, 0.01.',
't2.look': 'Corra la curva de respuesta al CO₂ para frijol, luego cambie el cultivo a maíz y córrala de nuevo. El mismo eje, una pendiente muy distinta.',
't3.eyebrow': 'Ensayo 03 · Sequía',
't3.title': 'El suelo es el amortiguador',
't3.body': 'La misma lluvia, sobre arena y sobre franco arcilloso, produce cultivos distintos. La capacidad de agua disponible y la profundidad radical deciden cuántos días secos puede sobrellevar el cultivo entre aguaceros.',
't3.look': 'Compare arena contra franco arcilloso con lluvia ×0.4, luego abra la superficie de respuesta de AWC contra profundidad de la zona radical.',
't4.eyebrow': 'Ensayo 04 · Fitomejoramiento',
't4.title': '¿Motor más grande o mejor tubería?',
't4.body': 'Un fitomejorador puede empujar la eficiencia en el uso de la radiación, que genera más biomasa, o el índice de cosecha, que lleva más de esa biomasa a la vaina. El tornado le dirá cuál rinde más en este ambiente.',
't4.look': 'Compare las barras de RUE y HI. Luego cambie el clima y mire otra vez: la respuesta se mueve.',
't5.eyebrow': 'Ensayo 05 · Dosel',
't5.title': 'Cerrar el dosel antes',
't5.body': 'I50A define qué tan rápido llega el dosel a la mitad de la intercepción. Cada día de suelo descubierto es radiación cayendo sobre tierra en lugar de hojas: el mayor término de pérdida en la mayoría de las temporadas.',
't5.look': 'Observe la barra de «perdido por dosel abierto» en la atribución de la temporada mientras baja I50A. Luego mire la planta: las hojas aparecen antes y más grandes.',
't6.eyebrow': 'Ensayo 06 · Densidad',
't6.title': 'Qué tan tupido sembrar',
't6.body': 'f<sub>Solar_max</sub> es un parámetro de manejo, no un rasgo del cultivo. Surcos más anchos significan un techo más bajo de intercepción por vigorosa que sea la variedad.',
't6.look': 'Cambie la vista de la planta a Población y mueva el control de densidad. El espaciamiento en la vista 3D sigue al parámetro.',
't7.eyebrow': 'Ensayo 07 · Hábito',
't7.title': 'Frijol arbustivo contra volubre',
't7.body': 'Calima es de tipo arbustivo determinado y ciclo corto. G 2333 trepa, dura mucho más, construye mucha más biomasa — y destina una fracción menor de ella a grano.',
't7.look': 'Cargue esto, anote el rendimiento y luego cambie el cultivar a Calima. Más biomasa no significa automáticamente más frijol.',
't8.eyebrow': 'Ensayo 08 · Oportunidad',
't8.title': 'Encontrar la ventana de siembra',
't8.body': 'La fecha de siembra no cambia el cultivo, solo dónde queda la temporada frente a la lluvia y al calor. En un clima tropical bimodal esa suele ser la mayor palanca que un agricultor realmente controla.',
't8.look': 'Abra la curva de respuesta de la fecha de siembra. Los picos coinciden con las temporadas lluviosas; el valle es un cultivo floreciendo dentro de la racha seca.'
};

/* ==========================================================================
   Machinery
   ========================================================================== */

const DICT = { en: {}, es: ES };
const SUPPORTED = ['en', 'es'];
const STORE_KEY = 'simple-field-station-lang';

function detect() {
    let saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* private mode */ }
    if (saved && SUPPORTED.indexOf(saved) >= 0) return saved;
    const nav = (navigator.language || 'en').toLowerCase();
    return nav.indexOf('es') === 0 ? 'es' : 'en';
}

let lang = detect();
const listeners = [];

/** Substitute {name} placeholders. */
function interp(str, vars) {
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
}

/**
 * Look up a key. `fallback` is the caller's own string, used when the key is
 * absent from the active dictionary — so an untranslated label shows English
 * rather than a raw key.
 */
function t(key, vars, fallback) {
    const d = DICT[lang] || {};
    let s = d[key];
    if (s == null) s = DICT.en[key];
    if (s == null) s = (fallback != null ? fallback : key);
    return interp(s, vars);
}

/* ---- static markup ---------------------------------------------------- */

const ATTR_MAP = [
    ['data-i18n',       'text'],
    ['data-i18n-html',  'html'],
    ['data-i18n-title', 'title'],
    ['data-i18n-aria',  'aria-label'],
    ['data-i18n-ph',    'placeholder']
];

function eachTagged(fn) {
    ATTR_MAP.forEach(([attr, kind]) => {
        document.querySelectorAll('[' + attr + ']').forEach(node => {
            fn(node, node.getAttribute(attr), kind);
        });
    });
}

/**
 * Harvest the English already written into index.html. Runs once, before any
 * translation is applied, so `en` needs no hand-maintained copy of the prose.
 */
function captureEnglish() {
    eachTagged((node, key, kind) => {
        if (DICT.en[key] != null) return;
        DICT.en[key] =
            kind === 'html' ? node.innerHTML :
            kind === 'text' ? node.textContent :
            node.getAttribute(kind === 'aria-label' ? 'aria-label' : kind) || '';
    });
    // The document title and description carry no element to tag, so take them
    // from the head directly — otherwise switching back to English would show
    // the raw key.
    DICT.en['meta.title'] = document.title;
    const md = document.querySelector('meta[name="description"]');
    DICT.en['meta.desc'] = md ? md.getAttribute('content') : '';
}

function applyStatic() {
    eachTagged((node, key, kind) => {
        const v = t(key);
        if (kind === 'html') node.innerHTML = v;
        else if (kind === 'text') node.textContent = v;
        else node.setAttribute(kind === 'aria-label' ? 'aria-label' : kind, v);
    });
    document.documentElement.lang = lang;
    document.title = t('meta.title');
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', t('meta.desc'));
}

function setLang(next) {
    if (SUPPORTED.indexOf(next) < 0 || next === lang) return;
    lang = next;
    try { localStorage.setItem(STORE_KEY, next); } catch (e) { /* private mode */ }
    applyStatic();
    paintSwitch();
    listeners.forEach(fn => { try { fn(lang); } catch (e) { console.error(e); } });
}

function paintSwitch() {
    document.querySelectorAll('#lang-switch button').forEach(b => {
        b.setAttribute('aria-selected', String(b.dataset.lang === lang));
    });
}

function wireSwitch() {
    const host = document.getElementById('lang-switch');
    if (!host) return;
    host.querySelectorAll('button').forEach(b => {
        b.addEventListener('click', () => setLang(b.dataset.lang));
    });
    paintSwitch();
}

/** Run before the app builds anything, so the first paint is already correct. */
function boot() {
    captureEnglish();
    applyStatic();
    wireSwitch();
}

return {
    t: t,
    get lang() { return lang; },
    setLang: setLang,
    boot: boot,
    onChange: fn => listeners.push(fn)
};

})();

/* Short alias used throughout the interface code. Deliberately not named `t`:
   app.js already binds a local `t` in drawTornado, buildTrials and stageGlyph,
   and a global of the same name would be silently shadowed there. */
const txt = I18N.t;

/* ==========================================================================
   Accessors for text that lives in the data files
   --------------------------------------------------------------------------
   Each falls back to the English already in data.js / explorer.js, so a key
   that has not been translated yet degrades to English rather than to a
   visible key string.
   ========================================================================== */

const cropName   = k  => txt('crop.' + k, null, (CROP_SPECIES_DATA[k] || {}).name || k);
const soilName   = k  => txt('soil.' + k, null, (SOIL_TEXTURE_DATA[k] || {}).name || k);
const habitLabel = h  => txt('habit.' + h, null, (BEAN_HABITS[h] || {}).label || h);
const cultivarNote = cv => cv && cv.note ? txt('cv.' + cv.id + '.note', null, cv.note) : '';

const paramLabel = p => txt('p.' + p.id + '.label', null, p.label);
const paramHelp  = p => txt('p.' + p.id + '.help',  null, p.help);

/* explorer.js stores units ASCII-safe. Render them properly; most are the same
   in both languages, so only the ones that differ carry a dictionary entry. */
const UNIT_DISPLAY = {
    'degC': '°C',
    'degC.d': '°C·d',
    'm3/m3': 'm³/m³',
    'x': '×'
};
const paramUnit = p => (p.unit ? txt('u.' + p.unit, null, UNIT_DISPLAY[p.unit] || p.unit) : '');

const groupTitle = g => txt('grp.' + g.id + '.title', null, g.title);
const groupSub   = g => txt('grp.' + g.id + '.sub',   null, g.subtitle.split('—')[1].trim());

const stageLabel  = st => txt('st.' + st.code + '.label',  null, st.label);
const stageDetail = st => txt('st.' + st.code + '.detail', null, st.detail);

const trialText = (tr, field) => txt(tr.id + '.' + field, null, tr[field]);

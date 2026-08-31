/**
 * Biomass Explorer — parameter registry and sensitivity engine.
 *
 * Pure computation, no DOM. Everything here operates on a plain `state`
 * object that fully describes one simulation, so a run can be reproduced,
 * perturbed, swept or gridded without touching the interface.
 *
 * The parameter registry is organised by the G x E x M framing used
 * throughout the app: what the breeder chooses (the seed), what the season
 * delivers (the sky, the ground), and what the farmer decides.
 */

/* ==========================================================================
   Parameter registry
   ========================================================================== */

const PARAM_GROUPS = {
    seed:   { id: 'seed',   letter: 'G', title: 'The Seed',   subtitle: 'Genetics — what the breeder chooses' },
    sky:    { id: 'sky',    letter: 'E', title: 'The Sky',    subtitle: 'Atmosphere — what the season delivers' },
    ground: { id: 'ground', letter: 'E', title: 'The Ground', subtitle: 'Soil — what the field holds' },
    farmer: { id: 'farmer', letter: 'M', title: 'The Farmer', subtitle: 'Management — what you decide' }
};

/**
 * target: which part of the run the value is written into
 *   'species'  -> species coefficient
 *   'cultivar' -> cultivar trait
 *   'option'   -> simulation option
 *   'soil'     -> soil property
 */
const PARAM_REGISTRY = [
    // --- G: the seed ------------------------------------------------------
    { id: 'RUE',      target: 'species',  group: 'seed', symbol: 'RUE',        label: 'Radiation use efficiency',
      unit: 'g/MJ', min: 0.4, max: 3.0, step: 0.02, decimals: 2, core: true,
      help: 'Grams of biomass produced per megajoule of intercepted radiation. The engine of the whole model.' },
    { id: 'HI',       target: 'cultivar', group: 'seed', symbol: 'HI',         label: 'Harvest index',
      unit: '', min: 0.05, max: 0.95, step: 0.01, decimals: 2, core: true,
      help: 'Fraction of total biomass that ends up in the harvested organ. Applied once, at maturity.' },
    { id: 'Tsum',     target: 'cultivar', group: 'seed', symbol: 'Tsum',       label: 'Thermal time to maturity',
      unit: 'degC.d', min: 800, max: 5000, step: 25, decimals: 0, core: true,
      help: 'Accumulated mean temperature above Tbase required to reach maturity. Sets season length.' },
    { id: 'I50A',     target: 'cultivar', group: 'seed', symbol: 'I50A',       label: 'Canopy build-up',
      unit: 'degC.d', min: 100, max: 1200, step: 10, decimals: 0, core: true,
      help: 'Thermal time needed to intercept 50% of radiation on the way up. Lower means a faster canopy.' },
    { id: 'I50B',     target: 'cultivar', group: 'seed', symbol: 'I50B',       label: 'Senescence duration',
      unit: 'degC.d', min: 20, max: 900, step: 10, decimals: 0, core: true,
      help: 'Thermal time before maturity at which the canopy falls back to 50%. Sets how long the crop stays green.' },
    { id: 'Tbase',    target: 'species',  group: 'seed', symbol: 'Tbase',      label: 'Base temperature',
      unit: 'degC', min: 0, max: 18, step: 0.5, decimals: 1, core: true,
      help: 'Temperature below which no development and no growth occur.' },
    { id: 'Topt',     target: 'species',  group: 'seed', symbol: 'Topt',       label: 'Optimum temperature',
      unit: 'degC', min: 10, max: 35, step: 0.5, decimals: 1, core: true,
      help: 'Temperature at which growth reaches full rate. Below it, f(temp) scales down linearly.' },
    { id: 'MaxT',     target: 'species',  group: 'seed', symbol: 'Theat',      label: 'Heat stress threshold',
      unit: 'degC', min: 20, max: 45, step: 0.5, decimals: 1, core: true,
      help: 'Daily maximum temperature above which heat begins to cut the growth rate.' },
    { id: 'ExtremeT', target: 'species',  group: 'seed', symbol: 'Textreme',   label: 'Lethal temperature',
      unit: 'degC', min: 30, max: 58, step: 0.5, decimals: 1,
      help: 'Daily maximum at which growth stops entirely. The cliff edge of the heat function.' },
    { id: 'S_Water',  target: 'species',  group: 'seed', symbol: 'S_water',    label: 'Drought sensitivity',
      unit: '', min: 0, max: 3.0, step: 0.05, decimals: 2,
      help: 'How hard the ARID drought index bites. Maize sits at 1.2, wheat at 0.4.' },
    { id: 'CO2_RUE',  target: 'species',  group: 'seed', symbol: 'S_CO2',      label: 'CO2 response',
      unit: '%/ppm', min: 0, max: 0.15, step: 0.005, decimals: 3,
      help: 'Percentage gain in RUE per ppm of CO2. C3 crops sit near 0.08, C4 crops near 0.01.' },
    { id: 'I50maxH',  target: 'species',  group: 'seed', symbol: 'I50maxH',    label: 'Heat ageing',
      unit: 'degC.d', min: 0, max: 220, step: 5, decimals: 0,
      help: 'How much a day of heat stress accelerates canopy senescence.' },
    { id: 'I50maxW',  target: 'species',  group: 'seed', symbol: 'I50maxW',    label: 'Drought ageing',
      unit: 'degC.d', min: 0, max: 120, step: 2, decimals: 0,
      help: 'How much a day of water stress accelerates canopy senescence.' },

    // --- E: the sky -------------------------------------------------------
    { id: 'tempShift', target: 'option', group: 'sky', symbol: 'dT',  label: 'Temperature shift',
      unit: 'degC', min: -5, max: 10, step: 0.25, decimals: 2, core: true,
      help: 'Uniform warming or cooling applied to every day of the season.' },
    { id: 'rainScale', target: 'option', group: 'sky', symbol: 'xRain', label: 'Rainfall multiplier',
      unit: 'x', min: 0, max: 2.5, step: 0.05, decimals: 2, core: true,
      help: 'Scales every rainfall event. Zero is a total-failure season.' },
    { id: 'sradScale', target: 'option', group: 'sky', symbol: 'xSrad', label: 'Radiation multiplier',
      unit: 'x', min: 0.5, max: 1.5, step: 0.02, decimals: 2, core: true,
      help: 'Scales incoming solar radiation — cloudier or clearer skies.' },
    { id: 'co2',       target: 'option', group: 'sky', symbol: 'CO2',   label: 'CO2 concentration',
      unit: 'ppm', min: 300, max: 900, step: 5, decimals: 0, core: true,
      help: 'Atmospheric CO2. The model response saturates above 700 ppm.' },

    // --- E: the ground ----------------------------------------------------
    { id: 'awc', target: 'soil',   group: 'ground', symbol: 'AWC', label: 'Available water capacity',
      unit: 'm3/m3', min: 0.04, max: 0.22, step: 0.005, decimals: 3, core: true,
      help: 'Water the soil can hold per unit depth against drainage.' },
    { id: 'rcn', target: 'soil',   group: 'ground', symbol: 'RCN', label: 'Runoff curve number',
      unit: '', min: 50, max: 95, step: 1, decimals: 0, core: true,
      help: 'SCS curve number. Higher means more rain runs off instead of infiltrating.' },
    { id: 'rzd', target: 'option', group: 'ground', symbol: 'RZD', label: 'Root zone depth',
      unit: 'mm', min: 200, max: 2000, step: 25, decimals: 0, core: true,
      help: 'Depth of soil the crop draws water from. Deeper roots buffer dry spells.' },

    // --- M: the farmer ----------------------------------------------------
    { id: 'sowingDay', target: 'option', group: 'farmer', symbol: 'DOY', label: 'Sowing date',
      unit: 'day of year', min: 1, max: 360, step: 1, decimals: 0, core: true,
      help: 'When the crop goes in the ground. Shifts the whole season against the climate.' },
    { id: 'fSolarMax', target: 'option', group: 'farmer', symbol: 'fSolar_max', label: 'Plant density',
      unit: '', min: 0.30, max: 0.98, step: 0.01, decimals: 2, core: true,
      help: 'Maximum fraction of radiation a closed canopy can intercept. The paper treats this as a management choice, not a crop trait: wider rows, lower ceiling.' }
];

const PARAM_BY_ID = PARAM_REGISTRY.reduce((m, p) => { m[p.id] = p; return m; }, {});

function paramsInGroup(groupId) {
    return PARAM_REGISTRY.filter(p => p.group === groupId);
}

/* ==========================================================================
   State -> run
   ========================================================================== */

const _weatherCache = {};
function cachedWeather(zone) {
    if (!_weatherCache[zone]) _weatherCache[zone] = generateClimateZoneWeather(zone);
    return _weatherCache[zone];
}

/**
 * Build a complete default state for a species/cultivar pairing.
 */
function makeDefaultState(speciesKey, cultivarId, climateZone, soilKey) {
    const sp = CROP_SPECIES_DATA[speciesKey];
    const cvList = CROP_CULTIVARS_DATA[speciesKey] || [];
    const cv = cvList.find(c => c.id === cultivarId) || cvList[0];
    const soil = SOIL_TEXTURE_DATA[soilKey] || SOIL_TEXTURE_DATA.loam;
    const arch = getArchitecture(speciesKey);

    return {
        speciesKey, cultivarId: cv ? cv.id : null, climateZone, soilKey,

        RUE: sp.RUE, Tbase: sp.Tbase, Topt: sp.Topt, MaxT: sp.MaxT,
        ExtremeT: sp.ExtremeT, CO2_RUE: sp.CO2_RUE, S_Water: sp.S_Water,
        I50maxH: sp.I50maxH, I50maxW: sp.I50maxW,

        Tsum: cv.Tsum, HI: cv.HI, I50A: cv.I50A, I50B: cv.I50B,

        sowingDay: sp.defaultSowingDay || 1,
        tempShift: 0, rainScale: 1.0, sradScale: 1.0, co2: 420,

        awc: soil.awc, rcn: soil.rcn, rzd: Math.round(arch.rootDepthMax * 1000),
        fSolarMax: 0.95,
        isIrrigated: false
    };
}

/** Split a state into the four arguments the engine expects. */
function buildRun(state) {
    const sp = CROP_SPECIES_DATA[state.speciesKey];
    const arch = getArchitecture(state.speciesKey);

    const species = {
        ...sp,
        RUE: state.RUE, Tbase: state.Tbase, Topt: state.Topt, MaxT: state.MaxT,
        // A lethal threshold below the stress threshold is physically
        // meaningless and divides by zero in Eq. 8.
        ExtremeT: Math.max(state.ExtremeT, state.MaxT + 0.5),
        CO2_RUE: state.CO2_RUE, S_Water: state.S_Water,
        I50maxH: state.I50maxH, I50maxW: state.I50maxW
    };

    const cvList = CROP_CULTIVARS_DATA[state.speciesKey] || [];
    const cvBase = cvList.find(c => c.id === state.cultivarId) || cvList[0] || {};
    const cultivar = { ...cvBase, Tsum: state.Tsum, HI: state.HI, I50A: state.I50A, I50B: state.I50B };

    const scale = getPhenologyScale(state.speciesKey);
    const fillIdx = scale.findIndex(s => s.code === 'R7' || s.code === 'GF');
    const fillStart = fillIdx >= 0 ? scale[fillIdx].frac : 0.6;

    const options = {
        sowingDay: state.sowingDay,
        tempShift: state.tempShift,
        rainScale: state.rainScale,
        sradScale: state.sradScale,
        co2: state.co2,
        isIrrigated: state.isIrrigated,
        soil: { awc: state.awc, rcn: state.rcn },
        rzd: state.rzd,
        fSolarMax: state.fSolarMax,
        kExt: arch.k_ext,
        fillStart: fillStart,
        fillEnd: 0.97
    };

    return { species, cultivar, weather: cachedWeather(state.climateZone), options };
}

/* ==========================================================================
   Sensitivity engine
   ========================================================================== */

class BiomassExplorer {
    constructor(engine) {
        this.engine = engine;
    }

    /**
     * @param {boolean} summaryOnly skip the per-day record. Sweeps only read
     *        `summary`, and building day objects is ~90% of a run's cost.
     */
    run(state, summaryOnly = false) {
        const r = buildRun(state);
        if (summaryOnly) r.options.summaryOnly = true;
        return this.engine.simulate(r.species, r.cultivar, r.weather, r.options);
    }

    /** Run with one parameter overridden. */
    runWith(state, paramId, value, summaryOnly = false) {
        return this.run({ ...state, [paramId]: value }, summaryOnly);
    }

    /**
     * Sweep one parameter across its range.
     * @returns {{param, values: number[], biomass: number[], yield: number[], maturity: number[], current: number}}
     */
    sweep1D(state, paramId, samples = 40) {
        const p = PARAM_BY_ID[paramId];
        if (!p) throw new Error('Unknown parameter: ' + paramId);

        const out = { param: p, values: [], biomass: [], yield: [], maturity: [] , current: state[paramId] };
        for (let i = 0; i < samples; i++) {
            const v = p.min + (p.max - p.min) * (i / (samples - 1));
            const res = this.runWith(state, paramId, v, true);
            out.values.push(+v.toFixed(4));
            out.biomass.push(res.summary.finalBiomassTha);
            out.yield.push(res.summary.finalYieldTha);
            out.maturity.push(res.summary.maturityDay);
        }
        return out;
    }

    /**
     * Grid two parameters against each other.
     * @returns {{paramX, paramY, x: number[], y: number[], z: number[][], metric: string}}
     */
    sweep2D(state, idX, idY, nx = 28, ny = 28, metric = 'yield') {
        const px = PARAM_BY_ID[idX], py = PARAM_BY_ID[idY];
        if (!px || !py) throw new Error('Unknown parameter in 2D sweep');

        const x = [], y = [], z = [];
        for (let i = 0; i < nx; i++) x.push(px.min + (px.max - px.min) * (i / (nx - 1)));
        for (let j = 0; j < ny; j++) y.push(py.min + (py.max - py.min) * (j / (ny - 1)));

        let zMin = Infinity, zMax = -Infinity;
        for (let j = 0; j < ny; j++) {
            const row = [];
            for (let i = 0; i < nx; i++) {
                const res = this.run({ ...state, [idX]: x[i], [idY]: y[j] }, true);
                const v = metric === 'biomass' ? res.summary.finalBiomassTha
                        : metric === 'maturity' ? res.summary.maturityDay
                        : res.summary.finalYieldTha;
                row.push(v);
                if (v < zMin) zMin = v;
                if (v > zMax) zMax = v;
            }
            z.push(row);
        }
        return { paramX: px, paramY: py, x, y, z, zMin, zMax, metric,
                 currentX: state[idX], currentY: state[idY] };
    }

    /**
     * One-at-a-time sensitivity. Each parameter is nudged up and down by
     * `pct` of its own range, and the change in the chosen metric recorded.
     * Ranking is by the larger of the two absolute deltas.
     */
    tornado(state, paramIds = null, pct = 0.15, metric = 'biomass') {
        const ids = paramIds || PARAM_REGISTRY.filter(p => p.core).map(p => p.id);
        const base = this.run(state, true);
        const baseVal = metric === 'yield' ? base.summary.finalYieldTha : base.summary.finalBiomassTha;

        const rows = ids.map(id => {
            const p = PARAM_BY_ID[id];
            const span = (p.max - p.min) * pct;
            const lo = Math.max(p.min, state[id] - span);
            const hi = Math.min(p.max, state[id] + span);

            const pick = res => metric === 'yield' ? res.summary.finalYieldTha : res.summary.finalBiomassTha;
            const vLo = pick(this.runWith(state, id, lo, true));
            const vHi = pick(this.runWith(state, id, hi, true));

            return {
                param: p,
                low: lo, high: hi,
                deltaLow: +(vLo - baseVal).toFixed(3),
                deltaHigh: +(vHi - baseVal).toFixed(3),
                swing: +Math.max(Math.abs(vLo - baseVal), Math.abs(vHi - baseVal)).toFixed(3)
            };
        });

        rows.sort((a, b) => b.swing - a.swing);
        return { base: +baseVal.toFixed(3), metric, pct, rows };
    }
}

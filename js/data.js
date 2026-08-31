/**
 * SIMPLE Crop Model Data File
 * Contains crop species parameters, cultivar traits, soil properties, and synthetic weather generators.
 * Data source: Zhao et al. (2019) European Journal of Agronomy 104:97-106 and simple_model Python package.
 */

const CROP_SPECIES_DATA = {
    wheat: {
        name: "Wheat (C3)",
        Tbase: 0,
        Topt: 15,
        RUE: 1.24,
        I50maxH: 100,
        I50maxW: 25,
        MaxT: 34,
        ExtremeT: 45,
        CO2_RUE: 0.08,
        S_Water: 0.4,
        isC4: false,
        defaultSowingDay: 30 // Late winter / early spring
    },
    rice: {
        name: "Rice (C3)",
        Tbase: 9,
        Topt: 26,
        RUE: 1.24,
        I50maxH: 100,
        I50maxW: 10,
        MaxT: 34,
        ExtremeT: 50,
        CO2_RUE: 0.08,
        S_Water: 1.0,
        isC4: false,
        defaultSowingDay: 110 // Late Spring (April/May)
    },
    maize: {
        name: "Maize (C4)",
        Tbase: 8,
        Topt: 28,
        RUE: 2.10,
        I50maxH: 100,
        I50maxW: 12,
        MaxT: 34,
        ExtremeT: 50,
        CO2_RUE: 0.01,
        S_Water: 1.2,
        isC4: true,
        defaultSowingDay: 100 // Spring (April)
    },
    soybean: {
        name: "Soybean (C3)",
        Tbase: 6,
        Topt: 27,
        RUE: 0.86,
        I50maxH: 120,
        I50maxW: 20,
        MaxT: 36,
        ExtremeT: 50,
        CO2_RUE: 0.07,
        S_Water: 0.9,
        isC4: false,
        defaultSowingDay: 110 // Spring (May)
    },
    potato: {
        name: "Potato (C3)",
        Tbase: 4,
        Topt: 22,
        RUE: 1.30,
        I50maxH: 50,
        I50maxW: 30,
        MaxT: 34,
        ExtremeT: 45,
        CO2_RUE: 0.10,
        S_Water: 0.4,
        isC4: false,
        defaultSowingDay: 75 // Early Spring (March)
    },
    tomato: {
        name: "Tomato (C3)",
        Tbase: 6,
        Topt: 26,
        RUE: 1.00,
        I50maxH: 100,
        I50maxW: 5,
        MaxT: 32,
        ExtremeT: 45,
        CO2_RUE: 0.07,
        S_Water: 2.5,
        isC4: false,
        defaultSowingDay: 90 // Spring (April)
    },
    cotton: {
        name: "Cotton (C3)",
        Tbase: 11,
        Topt: 28,
        RUE: 0.85,
        I50maxH: 40,
        I50maxW: 10,
        MaxT: 35,
        ExtremeT: 50,
        CO2_RUE: 0.09,
        S_Water: 1.2,
        isC4: false,
        defaultSowingDay: 100 // Spring (April)
    },
    cassava: {
        name: "Cassava (C3)",
        Tbase: 12,
        Topt: 28,
        RUE: 1.10,
        I50maxH: 100,
        I50maxW: 15,
        MaxT: 38,
        ExtremeT: 50,
        CO2_RUE: 0.07,
        S_Water: 1.0,
        isC4: false,
        defaultSowingDay: 60 // Early Spring (March)
    }
};

const CROP_CULTIVARS_DATA = {
    wheat: [
        { id: "yecora_rojo", name: "Yecora Rojo", Tsum: 2200, HI: 0.36, I50A: 480, I50B: 200 },
        { id: "batten", name: "Batten", Tsum: 2150, HI: 0.34, I50A: 280, I50B: 50 }
    ],
    rice: [
        { id: "ir72", name: "IR72", Tsum: 1550, TsumPaper: 2300, HI: 0.47, I50A: 550, I50APaper: 850, I50B: 150, I50BPaper: 200 } // Standard 110-125d Rice Tsum (Tbase=9C)
    ],
    maize: [
        { id: "mccurdy_84aa", name: "McCurdy 84aa", Tsum: 2050, HI: 0.50, I50A: 500, I50B: 50 }
    ],
    soybean: [
        { id: "bragg", name: "Bragg", Tsum: 2200, TsumPaper: 2500, HI: 0.35, I50A: 600, I50APaper: 680, I50B: 250, I50BPaper: 300 },
        { id: "williams82", name: "Williams 82", Tsum: 2050, TsumPaper: 2350, HI: 0.40, I50A: 520, I50APaper: 600, I50B: 180, I50BPaper: 200 }
    ],
    potato: [
        { id: "sebago", name: "Sebago", Tsum: 1900, TsumPaper: 2400, HI: 0.85, I50A: 450, I50APaper: 500, I50B: 250, I50BPaper: 350 },
        { id: "russet_burbank", name: "Russet Burbank", Tsum: 1850, TsumPaper: 2300, HI: 0.90, I50A: 450, I50APaper: 500, I50B: 300, I50BPaper: 400 }
    ],
    tomato: [
        { id: "agriset761", name: "Agriset 761", Tsum: 1900, TsumPaper: 2300, HI: 0.50, I50A: 480, I50APaper: 550, I50B: 220, I50BPaper: 300 },
        { id: "sunnysd", name: "Sunny SD", Tsum: 2200, TsumPaper: 2800, HI: 0.68, I50A: 520, I50B: 300, I50BPaper: 400 }
    ],
    cotton: [
        { id: "deltapine77", name: "Deltapine 77", Tsum: 3200, TsumPaper: 4600, HI: 0.40, I50A: 580, I50APaper: 680, I50B: 200 }
    ],
    cassava: [
        { id: "mcol_1684", name: "MCol-1684", Tsum: 4200, TsumPaper: 5400, HI: 0.65, I50A: 650, I50B: 300 }
    ]
};

const SOIL_TEXTURE_DATA = {
    sand: { name: "Sand", awc: 0.07, rcn: 68, description: "Coarse texture, low water retention, fast drainage" },
    sandy_loam: { name: "Sandy Loam", awc: 0.11, rcn: 72, description: "Light texture, moderate water retention" },
    loam: { name: "Loam", awc: 0.14, rcn: 77, description: "Ideal texture, high water holding capacity" },
    clay_loam: { name: "Clay Loam", awc: 0.16, rcn: 82, description: "Fine texture, high water holding capacity & runoff" },
    clay: { name: "Clay", awc: 0.15, rcn: 86, description: "Heavy texture, high runoff, restricted drainage" }
};

/**
 * Generates synthetic daily weather data for a 365-day year based on climate zone characteristics.
 * Calibrated with Northern Hemisphere seasonality (Summer peak in June/July, Winter in Jan/Dec).
 */
function generateClimateZoneWeather(zone = 'subtropical') {
    const weather = [];
    
    for (let day = 1; day <= 365; day++) {
        let Tmin, Tmax, srad, rain, eto;
        const radDay = (day / 365) * 2 * Math.PI;

        if (zone === 'subtropical') {
            // Subtropical (e.g. South US / South Brazil / East Asia)
            // Summer peak in June/July (day 170-200, Tmean ~ 26-30C), Winter in Jan (day 1, Tmean ~ 10-14C)
            const seasonalTemp = 20 - 9 * Math.cos(radDay); 
            const noiseT = (Math.sin(day * 0.7) * 2.0 + Math.cos(day * 0.3) * 1.0);
            Tmax = seasonalTemp + 6 + noiseT;
            Tmin = seasonalTemp - 5 + noiseT * 0.7;
            
            srad = 22 - 7 * Math.cos(radDay) + (Math.sin(day * 1.1) * 2.5);
            srad = Math.max(8, Math.min(30, srad));

            // Rainfall events (summer wet season)
            const rainChance = Math.sin(day * 0.15) * 0.25 + 0.35;
            rain = (Math.sin(day * 3.7) > (1 - rainChance)) ? Math.abs(Math.sin(day * 2.1)) * 20 : 0;
            if (rain > 0 && Math.sin(day * 5.3) > 0.6) rain += 15;

        } else if (zone === 'tropical') {
            // Tropical Savanna / Intertropical (e.g. Colombia / East Africa)
            // Warm temperatures (Tmean ~ 24-28C year-round)
            Tmax = 30 + Math.sin(day * 0.05) * 1.5 + Math.sin(day * 0.8) * 1.0;
            Tmin = 20 + Math.cos(day * 0.05) * 1.0 + Math.cos(day * 0.4) * 0.8;
            
            srad = 22 + Math.sin(day * 0.08) * 2.5;
            srad = Math.max(12, Math.min(28, srad));

            // Bimodal rain (April-May & Oct-Nov)
            const rainSeason1 = Math.exp(-Math.pow((day - 110) / 30, 2)) * 18;
            const rainSeason2 = Math.exp(-Math.pow((day - 290) / 30, 2)) * 22;
            const dryBase = (Math.sin(day * 4.1) > 0.7) ? 4 : 0;
            rain = (rainSeason1 + rainSeason2 > 3) ? (rainSeason1 + rainSeason2) * (0.5 + Math.abs(Math.sin(day * 1.9))) : dryBase;

        } else if (zone === 'semi_arid') {
            // Semi-Arid / Mediterranean (Hot dry summer, cool wet winter)
            const seasonalTemp = 21 - 11 * Math.cos(radDay);
            Tmax = seasonalTemp + 7 + Math.sin(day * 0.5) * 2;
            Tmin = seasonalTemp - 5 + Math.cos(day * 0.5) * 2;

            srad = 24 - 9 * Math.cos(radDay) + Math.sin(day * 0.9) * 2;

            const winterWeight = (day < 100 || day > 260) ? 1.0 : 0.05;
            rain = (Math.sin(day * 2.3) > 0.5) ? winterWeight * Math.abs(Math.sin(day * 1.7)) * 25 : 0;

        } else {
            // Cool Temperate (e.g. Northern US / Europe)
            const seasonalTemp = 14 - 13 * Math.cos(radDay);
            Tmax = seasonalTemp + 5 + Math.sin(day * 0.4) * 2.5;
            Tmin = seasonalTemp - 4 + Math.cos(day * 0.4) * 2;

            srad = 18 - 10 * Math.cos(radDay) + Math.sin(day * 1.2) * 2;
            srad = Math.max(4, Math.min(26, srad));

            rain = (Math.sin(day * 1.4) > 0.4) ? Math.abs(Math.cos(day * 2.5)) * 14 : 0;
        }

        // Hargreaves-Samani potential evapotranspiration estimate ETo (mm/day)
        const Tmean = (Tmax + Tmin) / 2;
        const TD = Math.max(1, Tmax - Tmin);
        eto = 0.0023 * (Tmean + 17.8) * Math.sqrt(TD) * (srad * 0.408);
        eto = Math.max(0.8, Math.min(10.0, eto));

        weather.push({
            day: day,
            Tmin: parseFloat(Tmin.toFixed(1)),
            Tmax: parseFloat(Tmax.toFixed(1)),
            Tmean: parseFloat(Tmean.toFixed(1)),
            srad: parseFloat(srad.toFixed(1)),
            rain: parseFloat(rain.toFixed(1)),
            eto: parseFloat(eto.toFixed(2))
        });
    }

    return weather;
}


/* ==========================================================================
   EXTENSION — Common bean (Phaseolus vulgaris) + plant architecture
   --------------------------------------------------------------------------
   Species coefficients are taken verbatim from simple_model/parameters/Species.csv
   (the Zhao et al. 2019 calibration set).

   NOTE ON Tsum: the cultivar Tsum values in Cultivar.csv were fitted to the
   specific field sites of the original paper. This web app runs on *synthetic*
   climate zones, so cultivar Tsum has been recalibrated to give realistic
   season lengths here. Both numbers are carried: `Tsum` is what the app runs,
   `TsumPaper` is the published value, and `I50APaper` / `I50BPaper` likewise
   where the canopy timing was rescaled with it. Rice, soybean, potato, tomato,
   cotton and cassava carry the same treatment.
   ========================================================================== */

Object.assign(CROP_SPECIES_DATA, {
    drybean: {
        name: "Common Bean — dry (C3)",
        Tbase: 5,
        Topt: 27,
        RUE: 0.80,
        I50maxH: 90,
        I50maxW: 20,
        MaxT: 32,
        ExtremeT: 45,
        CO2_RUE: 0.07,
        S_Water: 0.9,
        isC4: false,
        defaultSowingDay: 120
    },
    grbean: {
        name: "Common Bean — green/snap (C3)",
        Tbase: 5,
        Topt: 27,
        RUE: 0.86,
        I50maxH: 100,
        I50maxW: 10,
        MaxT: 32,
        ExtremeT: 45,
        CO2_RUE: 0.07,
        S_Water: 0.4,
        isC4: false,
        defaultSowingDay: 120
    }
});

Object.assign(CROP_CULTIVARS_DATA, {
    drybean: [
        {
            id: "porrillo",
            name: "Porrillo Sintético",
            Tsum: 1750, TsumPaper: 2700, HI: 0.40, I50A: 450, I50B: 400,
            habit: "III",
            note: "Mesoamerican black bean, indeterminate prostrate. The CIAT reference check variety."
        },
        {
            id: "calima",
            name: "Calima",
            Tsum: 1500, HI: 0.42, I50A: 380, I50B: 280,
            habit: "I",
            note: "Andean red-mottled bush bean. Determinate, short cycle, large seed."
        },
        {
            id: "bat477",
            name: "BAT 477",
            Tsum: 1700, HI: 0.38, I50A: 420, I50B: 380,
            habit: "II",
            note: "CIAT drought-tolerant line. Deep rooting, holds canopy under water deficit."
        },
        {
            id: "g2333",
            name: "G 2333",
            Tsum: 2300, HI: 0.32, I50A: 520, I50B: 500,
            habit: "IV",
            note: "Climbing bean, grown on stakes or with maize. Long cycle, high biomass, lower HI."
        }
    ],
    grbean: [
        {
            id: "bronco",
            name: "Bronco Habit 1",
            Tsum: 1450, TsumPaper: 1600, HI: 0.45, I50A: 370, I50B: 300,
            habit: "I",
            note: "Determinate bush snap bean. Harvested at pod fill, before seeds mature."
        }
    ]
});

/**
 * Bean growth-habit descriptions (CIAT / Singh classification).
 * Drives stem elongation, branching and support in the 3D plant.
 */
const BEAN_HABITS = {
    I:   { label: "Type I — determinate bush",          maxNodes: 7,  climbing: false, branchSpread: 0.55, apexFlowers: true  },
    II:  { label: "Type II — indeterminate bush",       maxNodes: 10, climbing: false, branchSpread: 0.45, apexFlowers: false },
    III: { label: "Type III — indeterminate prostrate", maxNodes: 12, climbing: false, branchSpread: 0.95, apexFlowers: false },
    IV:  { label: "Type IV — indeterminate climbing",   maxNodes: 22, climbing: true,  branchSpread: 0.25, apexFlowers: false }
};

/**
 * Plant architecture parameters for the 3D viewer.
 *
 * IMPORTANT: the SIMPLE model has no organ-level state — it never computes
 * leaves, nodes or pods. These coefficients form a *visualisation layer* that
 * turns SIMPLE's daily outputs (TT, f_solar, biomass, stress factors) into
 * plant geometry using published allometry. The 3D plant is a faithful picture
 * of the model's state, not an independent simulation of morphology.
 *
 *   k_ext        Beer-Lambert extinction coefficient — used to invert f_solar
 *                into LAI:  LAI = -ln(1 - f_solar) / k_ext
 *   phyllochron  thermal time (°C·d) between successive node appearances
 *   plant3d      true only where the 3D viewer genuinely models the plant.
 *                Its geometry is common bean — trifoliate leaflets, branching
 *                by CIAT growth habit, pods — which is wrong for a grass and
 *                meaningless for a tuber. Crops without the flag get the
 *                canopy & light schematic in js/canopy2d.js instead. Setting
 *                the flag on another entry is all it takes to opt it in.
 */
const PLANT_ARCHITECTURE = {
    drybean: {
        displayName: "Common bean", latin: "Phaseolus vulgaris", form: "bean",
        plant3d: true,
        k_ext: 0.60, phyllochron: 38, maxNodes: 14,
        internodeLen: 0.034, leafletLen: 0.105, leafletWidth: 0.082,
        stemBaseRadius: 0.0035, plantsPerM2: 20,
        podLen: 0.105, podWidth: 0.010, podsPerPlantMax: 16, seedsPerPod: 5,
        rowSpacing: 0.60, rootDepthMax: 0.90
    },
    grbean: {
        displayName: "Snap bean", latin: "Phaseolus vulgaris", form: "bean",
        plant3d: true,
        k_ext: 0.62, phyllochron: 36, maxNodes: 10,
        internodeLen: 0.033, leafletLen: 0.108, leafletWidth: 0.086,
        stemBaseRadius: 0.0035, plantsPerM2: 24,
        podLen: 0.125, podWidth: 0.009, podsPerPlantMax: 14, seedsPerPod: 6,
        rowSpacing: 0.50, rootDepthMax: 0.70
    },
    soybean: {
        displayName: "Soybean", latin: "Glycine max", form: "bean",
        k_ext: 0.58, phyllochron: 45, maxNodes: 16,
        internodeLen: 0.036, leafletLen: 0.092, leafletWidth: 0.072,
        stemBaseRadius: 0.0045, plantsPerM2: 35,
        podLen: 0.045, podWidth: 0.011, podsPerPlantMax: 60, seedsPerPod: 3,
        rowSpacing: 0.45, rootDepthMax: 1.20
    },
    maize: {
        displayName: "Maize", latin: "Zea mays", form: "grass",
        k_ext: 0.55, phyllochron: 55, maxNodes: 18,
        internodeLen: 0.130, leafletLen: 0.750, leafletWidth: 0.085,
        stemBaseRadius: 0.0130, plantsPerM2: 7,
        podLen: 0.200, podWidth: 0.048, podsPerPlantMax: 1, seedsPerPod: 500,
        rowSpacing: 0.75, rootDepthMax: 1.50
    },
    wheat: {
        displayName: "Wheat", latin: "Triticum aestivum", form: "grass",
        k_ext: 0.45, phyllochron: 100, maxNodes: 9,
        internodeLen: 0.075, leafletLen: 0.220, leafletWidth: 0.012,
        stemBaseRadius: 0.0022, plantsPerM2: 250,
        podLen: 0.080, podWidth: 0.012, podsPerPlantMax: 3, seedsPerPod: 40,
        rowSpacing: 0.17, rootDepthMax: 1.20
    },
    rice: {
        displayName: "Rice", latin: "Oryza sativa", form: "grass",
        k_ext: 0.50, phyllochron: 80, maxNodes: 12,
        internodeLen: 0.070, leafletLen: 0.400, leafletWidth: 0.014,
        stemBaseRadius: 0.0025, plantsPerM2: 200,
        podLen: 0.220, podWidth: 0.014, podsPerPlantMax: 4, seedsPerPod: 90,
        rowSpacing: 0.20, rootDepthMax: 0.60
    }
};

/** Fallback architecture for species without a dedicated entry. */
const DEFAULT_ARCHITECTURE = {
    displayName: "Generic crop", latin: "", form: "herb",
    k_ext: 0.55, phyllochron: 50, maxNodes: 14,
    internodeLen: 0.055, leafletLen: 0.120, leafletWidth: 0.070,
    stemBaseRadius: 0.0050, plantsPerM2: 12,
    podLen: 0.070, podWidth: 0.020, podsPerPlantMax: 15, seedsPerPod: 4,
    rowSpacing: 0.60, rootDepthMax: 1.00
};

function getArchitecture(speciesKey) {
    return PLANT_ARCHITECTURE[speciesKey] || DEFAULT_ARCHITECTURE;
}

/**
 * Botanical names for crops with no dedicated architecture entry. Kept
 * separate on purpose: makeDefaultState() reads `rootDepthMax` off the
 * architecture to set the root zone depth, so adding entries there to carry a
 * display name would quietly move the water balance.
 */
const CROP_LATIN = {
    potato:  'Solanum tuberosum',
    tomato:  'Solanum lycopersicum',
    cotton:  'Gossypium hirsutum',
    cassava: 'Manihot esculenta'
};

function cropLatin(speciesKey) {
    return getArchitecture(speciesKey).latin || CROP_LATIN[speciesKey] || '';
}

/**
 * Phenological stage keys, expressed as fractions of Tsum.
 *
 * Bean staging follows the CIAT / Fernández et al. scale, the standard for
 * Phaseolus vulgaris. Other crops use a generic cereal/legume equivalent.
 * `frac` is the fraction of Tsum at which the stage begins.
 */
const PHENOLOGY_SCALES = {
    bean: [
        { code: "VE", frac: 0.00, label: "Emergence",        detail: "Cotyledons at the surface, hypocotyl straightening." },
        { code: "V1", frac: 0.08, label: "Primary leaves",   detail: "The two simple opposite leaves open." },
        { code: "V3", frac: 0.18, label: "Third trifoliate", detail: "Canopy build-up accelerates; I50A governs the pace." },
        { code: "V4", frac: 0.32, label: "Branching",        detail: "Lateral branches appear, canopy approaching closure." },
        { code: "R5", frac: 0.46, label: "Pre-flowering",    detail: "First flower buds visible in the racemes." },
        { code: "R6", frac: 0.56, label: "Flowering",        detail: "First open flower. Heat here costs pods directly." },
        { code: "R7", frac: 0.66, label: "Pod formation",    detail: "Pods elongate; assimilate demand shifts to reproduction." },
        { code: "R8", frac: 0.76, label: "Pod filling",      detail: "Seeds gain weight. Canopy senescence begins (I50B)." },
        { code: "R9", frac: 0.93, label: "Maturity",         detail: "Pods dry down, leaves shed. Growth stops at Tsum." }
    ],
    generic: [
        { code: "EM", frac: 0.00, label: "Emergence",     detail: "Seedling reaches the surface." },
        { code: "CB", frac: 0.12, label: "Canopy build",  detail: "Leaf area expands; I50A sets the rate." },
        { code: "FC", frac: 0.35, label: "Full canopy",   detail: "f_solar approaches f_solar_max — light capture is maximal." },
        { code: "FL", frac: 0.52, label: "Flowering",     detail: "Reproductive transition." },
        { code: "GF", frac: 0.68, label: "Grain fill",    detail: "Assimilate moves to the harvested organ." },
        { code: "MA", frac: 0.92, label: "Maturity",      detail: "Senescence completes; Tsum reached." }
    ]
};

function getPhenologyScale(speciesKey) {
    const arch = getArchitecture(speciesKey);
    return arch.form === "bean" ? PHENOLOGY_SCALES.bean : PHENOLOGY_SCALES.generic;
}

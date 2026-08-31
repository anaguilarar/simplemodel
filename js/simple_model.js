/**
 * SIMPLE Crop Model Execution Engine
 * Pure JavaScript implementation of SIMPLE (Simulating with Simple Model)
 * and ARID (Agricultural Reference Index for Drought).
 *
 * Reference: Zhao et al. (2019) European Journal of Agronomy 104:97-106
 *            Woli et al. (2012) Agronomy Journal 104:287-300
 *
 * Beyond the published model this engine also emits, per day:
 *   - a multiplicative waterfall decomposition of the biomass rate, so the
 *     contribution of each limiting factor can be read off directly;
 *   - LAI, obtained by inverting Beer-Lambert on f_solar;
 *   - a phenological progress fraction derived from TT/Tsum;
 *   - a progressive harvest-fill fraction.
 *
 * The last three are a VISUALISATION LAYER. SIMPLE itself carries no
 * organ-level state; these quantities are derived from model outputs using
 * published allometry and are labelled as such in the interface. At maturity
 * the progressive yield converges exactly on the SIMPLE result, Biomass x HI.
 */

class SimpleCropModelEngine {
    constructor() {
        this.f_solar_max_default = 0.95;
        this.initial_f_solar = 0.001;
    }

    /**
     * @param {Object} speciesParams Tbase, Topt, RUE, I50maxH, I50maxW, MaxT,
     *        ExtremeT, CO2_RUE, S_Water
     * @param {Object} cultivarParams Tsum, HI, I50A, I50B
     * @param {Array}  rawWeather [{day, Tmin, Tmax, srad, rain, eto}, ...]
     * @param {Object} options
     *        sowingDay   day of year to sow (1-365)
     *        tempShift   temperature shift, deg C
     *        sradScale   solar radiation multiplier
     *        rainScale   rainfall multiplier
     *        co2         atmospheric CO2, ppm
     *        isIrrigated true removes all water limitation
     *        soil        {awc, rcn}
     *        rzd         root zone depth, mm
     *        ddc         deep drainage coefficient
     *        wuc         water uptake coefficient
     *        fSolarMax   max fraction of radiation intercepted (plant density)
     *        kExt        Beer-Lambert extinction coefficient, for the LAI proxy
     *        fillStart   TT fraction at which harvest organ filling begins
     *        fillEnd     TT fraction at which filling completes
     *        summaryOnly skip building the per-day record. Sweeps and
     *                    sensitivity runs only read `summary`, and building
     *                    365 rounded day objects dominates their cost.
     */
    simulate(speciesParams, cultivarParams, rawWeather, options = {}) {
        // Sweeps and sensitivity runs pass continuous values, so the sowing
        // day has to be snapped back onto a real calendar day before it is
        // used as an array index.
        const sowingDay   = Math.min(365, Math.max(1, Math.round(options.sowingDay || 1)));
        const tempShift   = options.tempShift || 0;
        const sradScale   = options.sradScale !== undefined ? options.sradScale : 1.0;
        const rainScale   = options.rainScale !== undefined ? options.rainScale : 1.0;
        const co2         = options.co2 || 381;
        const isIrrigated = options.isIrrigated !== undefined ? options.isIrrigated : false;

        const soil = options.soil || { awc: 0.13, rcn: 75 };
        const rzd  = options.rzd !== undefined ? options.rzd : 1000;
        const ddc  = options.ddc !== undefined ? options.ddc : 0.55;
        const wuc  = options.wuc !== undefined ? options.wuc : 0.096;

        const fSolarMax = options.fSolarMax !== undefined ? options.fSolarMax : this.f_solar_max_default;
        const kExt      = options.kExt !== undefined ? options.kExt : 0.55;
        const fillStart = options.fillStart !== undefined ? options.fillStart : 0.55;
        const fillEnd   = options.fillEnd !== undefined ? options.fillEnd : 0.95;
        const summaryOnly = options.summaryOnly === true;

        // ---- Weather slice: 365 days from sowing, with climate adjustments ----
        const totalDaysAvailable = rawWeather.length;
        const weatherSlice = [];
        for (let i = 0; i < 365; i++) {
            const w = rawWeather[(sowingDay - 1 + i) % totalDaysAvailable];

            const adjTmin  = w.Tmin + tempShift;
            const adjTmax  = w.Tmax + tempShift;
            const adjTmean = (adjTmin + adjTmax) / 2;
            const adjSrad  = Math.max(1, w.srad * sradScale);
            const adjRain  = Math.max(0, w.rain * rainScale);

            // Hargreaves-Samani ETo recomputed under the shifted climate
            const TD = Math.max(1, adjTmax - adjTmin);
            const adjEto = 0.0023 * (adjTmean + 17.8) * Math.sqrt(TD) * (adjSrad * 0.408);

            weatherSlice.push({
                dayOfSeason: i + 1,
                calendarDay: ((sowingDay - 1 + i) % 365) + 1,
                Tmin: adjTmin, Tmax: adjTmax, Tmean: adjTmean,
                srad: adjSrad, rain: adjRain,
                eto: Math.max(0.5, adjEto)
            });
        }

        // ---- State ----
        let TT = 0;
        let i50b_current = cultivarParams.I50B;
        let prev_wat = rzd * soil.awc;

        let cumulativeBiomass = 0;              // g/m2
        let maturityDay = weatherSlice.length;
        let reachedMaturity = false;

        const dailyResults = [];
        let totalWaterStressDays = 0;
        let totalHeatStressDays  = 0;
        let peakLAI = 0, peakFsolar = 0, lastFill = 0;

        // Season-long loss attribution, g/m2
        const losses = { canopy: 0, temp: 0, heat: 0, water: 0, realised: 0 };

        for (let d = 0; d < weatherSlice.length; d++) {
            if (reachedMaturity) break;
            const w = weatherSlice[d];

            // 1. Thermal time  (Eq. 1 & 2)
            const dTT = Math.max(0, w.Tmean - speciesParams.Tbase);
            TT += dTT;

            // 2. Temperature impact  (Eq. 7)
            let f_temp;
            if (w.Tmean < speciesParams.Tbase) {
                f_temp = 0;
            } else if (w.Tmean < speciesParams.Topt) {
                f_temp = (w.Tmean - speciesParams.Tbase) / (speciesParams.Topt - speciesParams.Tbase);
            } else {
                f_temp = 1.0;
            }

            // 3. Heat stress  (Eq. 8)
            let f_heat = 1.0;
            if (w.Tmax > speciesParams.MaxT) {
                f_heat = (w.Tmax >= speciesParams.ExtremeT)
                    ? 0.0
                    : 1.0 - (w.Tmax - speciesParams.MaxT) / (speciesParams.ExtremeT - speciesParams.MaxT);
            }
            f_heat = Math.max(0, Math.min(1.0, f_heat));
            if (f_heat < 0.95) totalHeatStressDays++;

            // 4. CO2 impact  (Eq. 10)
            let f_co2 = 1.0;
            if (co2 >= 350 && co2 < 700) {
                f_co2 = 1.0 + (speciesParams.CO2_RUE / 100.0) * (co2 - 350);
            } else if (co2 >= 700) {
                f_co2 = 1.0 + (speciesParams.CO2_RUE / 100.0) * 350;
            }

            // 5. Soil water balance & ARID drought index
            let ARID_val = 0;
            let current_wat = prev_wat;
            let f_water = 1.0;
            let runoff = 0, drainage = 0, transp = 0;

            if (!isIrrigated) {
                const S  = (25400 / soil.rcn) - 254;   // SCS curve-number retention
                const Ia = 0.2 * S;
                if (w.rain > Ia) {
                    runoff = Math.pow(w.rain - Ia, 2) / (w.rain + 0.8 * S);
                }

                const awrz = prev_wat + (w.rain - runoff);

                if ((awrz / rzd) > soil.awc) {
                    drainage = rzd * ddc * ((awrz / rzd) - soil.awc);
                }

                const wad = awrz - drainage;
                transp = Math.min(wuc * rzd * (wad / rzd), w.eto);

                current_wat = Math.max(0, wad - transp);
                prev_wat = current_wat;

                ARID_val = w.eto > 0 ? Math.max(0, Math.min(1.0, 1.0 - (transp / w.eto))) : 0;
                f_water = Math.max(0, 1.0 - speciesParams.S_Water * ARID_val);
            } else {
                current_wat = rzd * soil.awc;
                prev_wat = current_wat;
                transp = w.eto;
            }

            if (f_water < 0.95) totalWaterStressDays++;

            // Severe drought also suppresses canopy expansion
            const f_solarwater = f_water < 0.1 ? (0.9 + f_water) : 1.0;

            // 6. Stress-accelerated canopy senescence  (Eq. 9)
            if (d > 0) {
                i50b_current += speciesParams.I50maxH * (1.0 - f_heat)
                              + speciesParams.I50maxW * (1.0 - f_water);
            }

            // 7. Canopy light interception  (Eq. 6)
            const fsolar1 = Math.min(fSolarMax, fSolarMax / (1 + Math.exp(-0.01 * (TT - cultivarParams.I50A))));
            const fsolar2 = Math.min(fSolarMax, fSolarMax / (1 + Math.exp( 0.01 * (TT - (cultivarParams.Tsum - i50b_current)))));
            const f_solar = Math.min(fsolar1, fsolar2) * Math.min(f_solarwater, 1.0);

            const senescing = fsolar2 < fsolar1;

            if (TT >= cultivarParams.Tsum || (d > 30 && f_solar <= this.initial_f_solar && senescing)) {
                maturityDay = d + 1;
                reachedMaturity = true;
            }

            // 8. Biomass growth  (Eq. 3 & 4)
            const f_stress = Math.min(f_heat, f_water);
            const biomassRate = w.srad * f_solar * speciesParams.RUE * f_co2 * f_temp * f_stress;
            cumulativeBiomass += biomassRate;

            // --- Waterfall decomposition of the daily rate ------------------
            // Reference = a fully closed canopy with no temperature, heat or
            // water limitation, under the radiation and CO2 of this same day.
            const wf0 = w.srad * speciesParams.RUE * f_co2 * fSolarMax;
            const wf1 = w.srad * speciesParams.RUE * f_co2 * f_solar;
            const wf2 = wf1 * f_temp;
            const wf3 = wf2 * f_stress;

            const lossCanopy = wf0 - wf1;
            const lossTemp   = wf1 - wf2;
            const lossStress = wf2 - wf3;
            const heatIsLimiting = f_heat <= f_water;

            losses.canopy   += lossCanopy;
            losses.temp     += lossTemp;
            losses.heat     += heatIsLimiting ? lossStress : 0;
            losses.water    += heatIsLimiting ? 0 : lossStress;
            losses.realised += wf3;

            // --- Visualisation layer ---------------------------------------
            const ttFrac = Math.min(1, TT / cultivarParams.Tsum);
            const LAI = -Math.log(Math.max(0.001, 1 - Math.min(f_solar, 0.99))) / kExt;

            // Harvest-organ filling: smoothstep between fillStart and fillEnd.
            let fillProgress = 0;
            if (ttFrac > fillStart) {
                const u = Math.min(1, (ttFrac - fillStart) / Math.max(1e-6, fillEnd - fillStart));
                fillProgress = u * u * (3 - 2 * u);
            }

            const cumBiomassTha = cumulativeBiomass * 0.01;   // 1 g/m2 = 0.01 t/ha

            if (LAI > peakLAI) peakLAI = LAI;
            if (f_solar > peakFsolar) peakFsolar = f_solar;
            lastFill = fillProgress;

            if (summaryOnly) continue;

            dailyResults.push({
                dayOfSeason: d + 1,
                calendarDay: w.calendarDay,
                TT: +TT.toFixed(1),
                ttFrac: +ttFrac.toFixed(4),
                f_solar: +f_solar.toFixed(4),
                f_temp: +f_temp.toFixed(3),
                f_heat: +f_heat.toFixed(3),
                f_water: +f_water.toFixed(3),
                f_co2: +f_co2.toFixed(3),
                ARID: +ARID_val.toFixed(3),
                senescing: senescing,
                LAI: +LAI.toFixed(3),
                fillProgress: +fillProgress.toFixed(4),
                biomassRate: +biomassRate.toFixed(2),
                cumBiomassGm2: +cumulativeBiomass.toFixed(1),
                cumBiomassTha: +cumBiomassTha.toFixed(3),
                cumYieldTha: +(cumBiomassTha * cultivarParams.HI * fillProgress).toFixed(3),
                waterfall: {
                    reference: +wf0.toFixed(3),
                    afterCanopy: +wf1.toFixed(3),
                    afterTemp: +wf2.toFixed(3),
                    actual: +wf3.toFixed(3),
                    lossCanopy: +lossCanopy.toFixed(3),
                    lossTemp: +lossTemp.toFixed(3),
                    lossHeat: +(heatIsLimiting ? lossStress : 0).toFixed(3),
                    lossWater: +(heatIsLimiting ? 0 : lossStress).toFixed(3)
                },
                soilWaterMm: +current_wat.toFixed(1),
                runoffMm: +runoff.toFixed(2),
                drainageMm: +drainage.toFixed(2),
                transpMm: +transp.toFixed(2),
                Tmean: w.Tmean, Tmax: w.Tmax, Tmin: w.Tmin,
                srad: w.srad, rain: w.rain, eto: w.eto
            });
        }

        const finalBiomassTha = cumulativeBiomass * 0.01;
        const finalYieldTha = finalBiomassTha * cultivarParams.HI;

        // The last simulated day carries the exact SIMPLE yield, so that the
        // progressive fill curve lands on the published result.
        if (dailyResults.length) {
            const last = dailyResults[dailyResults.length - 1];
            last.fillProgress = 1;
            last.cumYieldTha = +finalYieldTha.toFixed(3);
        }

        const toTha = v => +(v * 0.01).toFixed(3);

        return {
            daily: dailyResults,
            losses: {
                canopyTha:   toTha(losses.canopy),
                tempTha:     toTha(losses.temp),
                heatTha:     toTha(losses.heat),
                waterTha:    toTha(losses.water),
                realisedTha: toTha(losses.realised),
                referenceTha: toTha(losses.canopy + losses.temp + losses.heat + losses.water + losses.realised)
            },
            summary: {
                maturityDay: maturityDay,
                totalTT: +TT.toFixed(1),
                finalBiomassTha: +finalBiomassTha.toFixed(2),
                finalYieldTha: +finalYieldTha.toFixed(2),
                finalYieldKgha: +(finalYieldTha * 1000).toFixed(0),
                peakLAI: +peakLAI.toFixed(3),
                peakFsolar: +peakFsolar.toFixed(3),
                waterStressDays: totalWaterStressDays,
                heatStressDays: totalHeatStressDays,
                harvestIndex: cultivarParams.HI,
                isIrrigated: isIrrigated
            }
        };
    }
}

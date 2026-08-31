/**
 * SIMPLE Crop Model — interface controller.
 *
 * One `state` object describes the whole simulation and is shared by every
 * view: the rail writes to it, Grow animates it, Analyse perturbs it. All
 * parameter controls are generated from PARAM_REGISTRY, so adding a knob is
 * a data change, not a UI change.
 */

(function () {
'use strict';

/* ==========================================================================
   Palette — mirrors css/style.css
   ========================================================================== */

const P = {
    ink: '#1A1712', ink2: '#4A4034', ink3: '#6E6455', ink4: '#948B7A',
    rule: '#C9CCBB', ruleSoft: '#DDDFD2', sheet: '#FAFAF5', sheet2: '#F2F3E9',
    canopy: '#46702A', canopyDeep: '#2F5019',
    ochre: '#B0742A', irrigation: '#1F5F73', oxide: '#A33B20',
    radiance: '#D9A518', violet: '#6B4E7A'
};

const GROUP_COLOR = {
    seed: P.canopy, sky: P.irrigation, ground: P.ochre, farmer: P.violet
};

/* ==========================================================================
   Chart.js defaults
   ========================================================================== */

if (window.Chart) {
    Chart.defaults.font.family = "'IBM Plex Mono', monospace";
    Chart.defaults.font.size = 10;
    Chart.defaults.color = P.ink3;
    Chart.defaults.borderColor = P.ruleSoft;
    Chart.defaults.animation = false;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.labels.boxWidth = 9;
    Chart.defaults.plugins.legend.labels.boxHeight = 9;
    Chart.defaults.plugins.legend.labels.padding = 12;
    Chart.defaults.plugins.legend.labels.font = { size: 10.5 };
}

/** Marks the currently scrubbed day on any season chart. */
const dayMarkerPlugin = {
    id: 'dayMarker',
    afterDatasetsDraw(chart, args, opts) {
        const idx = opts && opts.index;
        if (idx == null || idx < 0) return;
        const x = chart.scales.x.getPixelForValue(idx);
        if (!isFinite(x)) return;
        const { top, bottom } = chart.chartArea;
        const c = chart.ctx;
        c.save();
        c.strokeStyle = P.oxide;
        c.lineWidth = 1;
        c.setLineDash([3, 3]);
        c.beginPath(); c.moveTo(x, top); c.lineTo(x, bottom); c.stroke();
        c.restore();
    }
};
if (window.Chart) Chart.register(dayMarkerPlugin);

/* ==========================================================================
   Small helpers
   ========================================================================== */

const $ = id => document.getElementById(id);
const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (v, d) => Number(v).toFixed(d);

const irrigationLabel = on => on
    ? txt('grow.irrigated', null, 'Irrigated &mdash; showing Y<sub>p</sub>')
    : txt('grow.rainfed',   null, 'Rainfed &mdash; showing Y<sub>w</sub>');

function debounce(fn, ms) {
    let t;
    return function () {
        clearTimeout(t);
        const a = arguments;
        t = setTimeout(() => fn.apply(null, a), ms);
    };
}

/* ==========================================================================
   Application
   ========================================================================== */

const engine = new SimpleCropModelEngine();
const explorer = new BiomassExplorer(engine);

const App = {
    state: null,
    resYw: null, resYp: null, active: null,
    day: 0,
    playing: false,
    chartKind: 'biomass',
    vpMode: 'single',
    scene: null, scenePlants: [],
    scenarios: { A: null, B: null },
    charts: {},

    init() {
        // Opening scenario: a bean sown into the second tropical rains on a
        // sandy loam. About 240 mm falls on the crop, which leaves a ~30%
        // yield gap and some real water stress without stripping the canopy
        // before the pods fill. Rainfall is left at its natural 1.0 so the
        // multiplier reads as untouched.
        this.state = makeDefaultState('drybean', 'porrillo', 'tropical', 'sandy_loam');
        this.state.sowingDay = 180;
        this.state.co2 = 420;

        this.buildSpeciesSelect();
        this.buildSoilSelect();
        this.buildCultivarSelect();
        this.buildRail();
        this.buildAnalyseSelects();
        this.buildTrials();
        this.wireEvents();

        this.run(true);
        this.initScene();
    },

    /* ---- selects ------------------------------------------------------- */

    buildSpeciesSelect() {
        // Beans lead: they are the crop the 3D viewer models in detail.
        const order = ['drybean', 'grbean', 'soybean', 'maize', 'wheat', 'rice',
                       'potato', 'tomato', 'cotton', 'cassava'];
        const sel = $('sel-species');
        sel.innerHTML = '';
        order.filter(k => CROP_SPECIES_DATA[k]).forEach(k => {
            const o = el('option'); o.value = k; o.textContent = cropName(k);
            sel.appendChild(o);
        });
        sel.value = this.state.speciesKey;
    },

    buildSoilSelect() {
        const sel = $('sel-soil');
        sel.innerHTML = '';
        Object.keys(SOIL_TEXTURE_DATA).forEach(k => {
            const s = SOIL_TEXTURE_DATA[k];
            const o = el('option'); o.value = k;
            o.textContent = soilName(k) + ' — AWC ' + s.awc + ', CN ' + s.rcn;
            sel.appendChild(o);
        });
        sel.value = this.state.soilKey;
    },

    buildCultivarSelect() {
        const list = CROP_CULTIVARS_DATA[this.state.speciesKey] || [];
        const sel = $('sel-cultivar');
        sel.innerHTML = '';
        list.forEach(c => {
            const o = el('option'); o.value = c.id;
            o.textContent = c.name +
                (c.habit ? '  (' + txt('habit.type', null, 'Type') + ' ' + c.habit + ')' : '');
            sel.appendChild(o);
        });
        sel.value = this.state.cultivarId;
        this.updateCultivarNote();
    },

    updateCultivarNote() {
        const cv = this.cultivar();
        const bits = [];
        if (cv && cv.note) bits.push(cultivarNote(cv));
        if (cv && cv.TsumPaper && cv.TsumPaper !== cv.Tsum) {
            const also = [];
            if (cv.I50APaper && cv.I50APaper !== cv.I50A) also.push('I50A ' + cv.I50APaper);
            if (cv.I50BPaper && cv.I50BPaper !== cv.I50B) also.push('I50B ' + cv.I50BPaper);
            bits.push(txt('cv.recal',
                { tsum: cv.Tsum, paper: cv.TsumPaper, also: also.length ? ', ' + also.join(', ') : '' },
                'Tsum recalibrated to {tsum} °C·d for the synthetic climates; '
                + 'Zhao et al. (2019) Table 1a gives Tsum {paper}{also}.'));
        }
        $('cultivar-note').textContent = bits.join(' ');

        const latin = cropLatin(this.state.speciesKey);
        $('brand-context').textContent = latin
            ? latin + (cv ? ' · ' + cv.name : '')
            : cropName(this.state.speciesKey);
    },

    cultivar() {
        const list = CROP_CULTIVARS_DATA[this.state.speciesKey] || [];
        return list.find(c => c.id === this.state.cultivarId) || list[0];
    },

    /** The 3D viewer draws common bean; everything else gets the schematic. */
    has3D() {
        if (this._no3D) return false;          // three.js never loaded
        return !!getArchitecture(this.state.speciesKey).plant3d;
    },

    /**
     * Show whichever of the two plant views applies, and hide the controls that
     * only mean something for the 3D one. 'Stand' needs real geometry; the ray
     * cast is a property of that geometry. 'Rainfed vs irrigated' works in both.
     */
    syncPlantPanel() {
        const on = this.has3D();

        const stand = document.querySelector('#seg-vpmode button[data-vpmode="field"]');
        if (stand) stand.style.display = on ? '' : 'none';
        $('btn-rays').style.display = on ? '' : 'none';

        // A crop switch out of bean can leave the mode on a 3D-only option.
        if (!on && this.vpMode === 'field') {
            this.vpMode = 'single';
            document.querySelectorAll('#seg-vpmode button').forEach(b =>
                b.setAttribute('aria-selected', String(b.dataset.vpmode === 'single')));
        }
        if (!on && this.scene && this.scene.showRays) {
            this.scene.setRaysVisible(false);
            $('btn-rays').setAttribute('aria-pressed', 'false');
        }

        if (this.scene) this.scene.setVisible(on);
        if (this.canopy) this.canopy.setVisible(!on);
        $('vp-rays').classList.toggle('hide', !on);
    },

    /** Redraw the schematic from the current day. */
    updateCanopy(reframe) {
        if (!this.canopy || this.has3D()) return;
        const pair = this.vpMode === 'compare';

        const labels = pair
            ? [txt('vp.label.rainfed', null, 'Rainfed'), txt('vp.label.irrigated', null, 'Irrigated')]
            : null;
        this.canopy.setMode(pair ? 'compare' : 'single', labels);
        if (reframe || pair) this.canopy.setCaptions(labels);

        let records;
        if (pair) {
            const a = this.resYw.daily, b = this.resYp.daily;
            records = [a[clamp(this.day, 0, a.length - 1)], b[clamp(this.day, 0, b.length - 1)]];
        } else {
            records = [this.today()];
        }

        const latin = cropLatin(this.state.speciesKey);
        this.canopy.setMeta(
            '<strong>' + cropName(this.state.speciesKey) + '</strong>' +
            (latin ? ' <em>' + latin + '</em>' : '') +
            '<span>' + txt('vp.schematic.note', null,
                'Light interception read from the model. The 3D plant models common bean.') +
            '</span>');

        this.canopy.update(records, {
            coverTag: txt('vp.groundCover', null, 'ground cover'),
            bandTag: txt('vp.intercepted', null, 'intercepted'),
            soilTag: txt('vp.toSoil', null, 'to soil')
        });

        this.paintOverlay();
    },

    /* ---- control rail --------------------------------------------------- */

    buildRail() {
        const host = $('param-groups');
        host.innerHTML = '';

        Object.keys(PARAM_GROUPS).forEach((gid, gi) => {
            const g = PARAM_GROUPS[gid];
            const wrap = el('div', 'pgroup' + (gi === 0 ? ' open' : ''));
            wrap.dataset.group = gid;

            const head = el('button', 'pgroup-head');
            head.type = 'button';
            head.setAttribute('aria-expanded', gi === 0 ? 'true' : 'false');
            head.innerHTML =
                '<span class="gletter">' + g.letter + '</span>' +
                '<span class="pgroup-title">' + groupTitle(g) + '</span>' +
                '<span class="pgroup-sub">' + groupSub(g) + '</span>' +
                '<svg class="pgroup-caret" width="10" height="10" viewBox="0 0 10 10"><path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
            head.addEventListener('click', () => {
                wrap.classList.toggle('open');
                head.setAttribute('aria-expanded', wrap.classList.contains('open') ? 'true' : 'false');
            });
            wrap.appendChild(head);

            const body = el('div', 'pgroup-body');
            paramsInGroup(gid).forEach(p => body.appendChild(this.buildControl(p)));
            wrap.appendChild(body);
            host.appendChild(wrap);
        });
    },

    buildControl(p) {
        const row = el('div', 'ctrl');
        row.dataset.param = p.id;

        const top = el('div', 'ctrl-top');
        top.innerHTML =
            '<span class="ctrl-sym">' + p.symbol + '</span>' +
            '<span class="ctrl-label">' + paramLabel(p) + '</span>' +
            '<span class="ctrl-val" data-val>' + fmt(this.state[p.id], p.decimals) +
            (p.unit ? ' <span class="ctrl-unit">' + paramUnit(p) + '</span>' : '') + '</span>';
        row.appendChild(top);

        const input = el('input');
        input.type = 'range';
        input.min = p.min; input.max = p.max; input.step = p.step;
        input.value = this.state[p.id];
        input.setAttribute('aria-label', paramLabel(p) + (p.unit ? ' — ' + paramUnit(p) : ''));
        input.addEventListener('input', () => {
            this.state[p.id] = parseFloat(input.value);
            this.paintControl(row, p);
            this.run();
        });
        row.appendChild(input);

        row.appendChild(el('div', 'ctrl-help', paramHelp(p)));
        this.paintControl(row, p);
        return row;
    },

    paintControl(row, p) {
        const input = row.querySelector('input[type=range]');
        const val = row.querySelector('[data-val]');
        const v = this.state[p.id];
        if (input) {
            input.value = v;
            const pct = ((v - p.min) / (p.max - p.min)) * 100;
            input.style.setProperty('--pct', clamp(pct, 0, 100) + '%');
        }
        if (val) {
            val.innerHTML = fmt(v, p.decimals) +
                (p.unit ? ' <span class="ctrl-unit">' + paramUnit(p) + '</span>' : '');
        }
    },

    /** Push state back into every slider — after a preset or a crop change. */
    repaintRail() {
        PARAM_REGISTRY.forEach(p => {
            const row = document.querySelector('.ctrl[data-param="' + p.id + '"]');
            if (row) this.paintControl(row, p);
        });
    },

    /* ---- analyse selects ------------------------------------------------ */

    buildAnalyseSelects() {
        const opts = PARAM_REGISTRY.map(p =>
            '<option value="' + p.id + '">' + p.symbol + ' — ' + paramLabel(p) + '</option>').join('');
        $('sel-sweep').innerHTML = opts;
        $('sel-sweep').value = 'sowingDay';
        $('sel-surf-x').innerHTML = opts;
        $('sel-surf-x').value = 'co2';
        $('sel-surf-y').innerHTML = opts;
        $('sel-surf-y').value = 'rainScale';
    },

    /* ---- events --------------------------------------------------------- */

    wireEvents() {
        // view switching
        document.querySelectorAll('.mode-btn').forEach(b => {
            b.addEventListener('click', () => this.showView(b.dataset.view));
        });

        $('sel-species').addEventListener('change', e => {
            const arch = getArchitecture(e.target.value);
            const first = (CROP_CULTIVARS_DATA[e.target.value] || [])[0];
            this.state = makeDefaultState(e.target.value, first ? first.id : null,
                this.state.climateZone, this.state.soilKey);
            this.state.co2 = 420;
            this.buildCultivarSelect();
            this.repaintRail();
            this.run(true);
            this.rebuildPlants();
        });

        $('sel-cultivar').addEventListener('change', e => {
            const cv = (CROP_CULTIVARS_DATA[this.state.speciesKey] || []).find(c => c.id === e.target.value);
            if (!cv) return;
            this.state.cultivarId = cv.id;
            this.state.Tsum = cv.Tsum; this.state.HI = cv.HI;
            this.state.I50A = cv.I50A; this.state.I50B = cv.I50B;
            this.updateCultivarNote();
            this.repaintRail();
            this.run(true);
            this.rebuildPlants();
        });

        $('sel-climate').addEventListener('change', e => {
            this.state.climateZone = e.target.value;
            this.run(true);
        });

        $('sel-soil').addEventListener('change', e => {
            const s = SOIL_TEXTURE_DATA[e.target.value];
            this.state.soilKey = e.target.value;
            this.state.awc = s.awc; this.state.rcn = s.rcn;
            this.repaintRail();
            this.run(true);
        });

        const sw = $('sw-irrigation');
        sw.addEventListener('click', () => {
            this.state.isIrrigated = !this.state.isIrrigated;
            sw.setAttribute('aria-checked', String(this.state.isIrrigated));
            $('irrigation-label').innerHTML = irrigationLabel(this.state.isIrrigated);
            this.run();
        });

        $('btn-reset').addEventListener('click', () => {
            const s = this.state;
            this.state = makeDefaultState(s.speciesKey, s.cultivarId, s.climateZone, s.soilKey);
            this.state.co2 = 420;
            this.repaintRail();
            $('sw-irrigation').setAttribute('aria-checked', 'false');
            $('irrigation-label').innerHTML = irrigationLabel(false);
            this.run(true);
        });

        const bx = $('btn-explain');
        bx.addEventListener('click', () => {
            const on = bx.getAttribute('aria-pressed') !== 'true';
            bx.setAttribute('aria-pressed', String(on));
            document.querySelectorAll('.ctrl').forEach(c => c.classList.toggle('explain', on));
        });

        // ribbon transport
        $('scrub').addEventListener('input', e => {
            this.stop();
            this.setDay(parseInt(e.target.value, 10) - 1);
        });
        $('btn-play').addEventListener('click', () => this.playing ? this.stop() : this.play());
        $('btn-rewind').addEventListener('click', () => { this.stop(); this.setDay(0); });

        // chart switch
        document.querySelectorAll('#seg-chart button').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('#seg-chart button')
                    .forEach(x => x.setAttribute('aria-selected', String(x === b)));
                this.chartKind = b.dataset.chart;
                this.drawMainChart();
            });
        });

        // 3D view mode
        document.querySelectorAll('#seg-vpmode button').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('#seg-vpmode button')
                    .forEach(x => x.setAttribute('aria-selected', String(x === b)));
                this.vpMode = b.dataset.vpmode;
                this.rebuildPlants();
            });
        });

        const br = $('btn-rays');
        br.addEventListener('click', () => {
            const on = br.getAttribute('aria-pressed') !== 'true';
            br.setAttribute('aria-pressed', String(on));
            if (this.scene) this.scene.setRaysVisible(on);
            this.paintOverlay();
        });

        // analyse controls
        $('tor-pct').addEventListener('change', () => this.drawTornado());
        document.querySelectorAll('#seg-tormetric button').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('#seg-tormetric button')
                    .forEach(x => x.setAttribute('aria-selected', String(x === b)));
                this.torMetric = b.dataset.metric;
                this.drawTornado();
            });
        });
        $('sel-sweep').addEventListener('change', e => { this._sweepId = e.target.value; this.drawSweep(); });
        $('sel-surf-x').addEventListener('change', e => { this._surfX = e.target.value; this.drawSurface(); });
        $('sel-surf-y').addEventListener('change', e => { this._surfY = e.target.value; this.drawSurface(); });

        $('btn-save-a').addEventListener('click', () => this.saveScenario('A'));
        $('btn-save-b').addEventListener('click', () => this.saveScenario('B'));
        $('btn-clear-scen').addEventListener('click', () => {
            this.scenarios = { A: null, B: null };
            this.drawCompare();
        });

        // keyboard scrubbing
        document.addEventListener('keydown', e => {
            if (e.target.matches('input, select, textarea')) return;
            if (e.key === 'ArrowRight') { this.stop(); this.setDay(this.day + 1); }
            else if (e.key === 'ArrowLeft') { this.stop(); this.setDay(this.day - 1); }
            else if (e.key === ' ' && $('view-grow').classList.contains('active')) {
                e.preventDefault();
                this.playing ? this.stop() : this.play();
            }
        });
    },

    showView(id) {
        document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === id));
        document.querySelectorAll('.mode-btn').forEach(b =>
            b.setAttribute('aria-selected', String(b.dataset.view === id)));

        // The ribbon is a day scrubber; it only means something where a day is shown.
        $('ribbon').style.display = (id === 'view-grow' || id === 'view-analyze') ? '' : 'none';

        if (id === 'view-analyze') this.refreshAnalyse();
        if (id === 'view-grow' && this.scene) this.scene._resize();
        syncStickyTop();
    },

    /* ---- the run -------------------------------------------------------- */

    run(reframe) {
        const s = this.state;
        this.resYw = explorer.run({ ...s, isIrrigated: false });
        this.resYp = explorer.run({ ...s, isIrrigated: true });
        this.active = s.isIrrigated ? this.resYp : this.resYw;

        const n = this.active.daily.length;
        $('scrub').max = Math.max(1, n);
        $('day-of').textContent = ' / ' + n;

        if (reframe || this.day >= n) this.day = n - 1;
        this.day = clamp(this.day, 0, n - 1);
        $('scrub').value = this.day + 1;

        this.buildRibbon();
        this.setDay(this.day);
        this.drawMainChart();

        if ($('view-analyze').classList.contains('active')) this.refreshAnalyse();
        else this.analyseStale = true;
    },

    today() { return this.active.daily[clamp(this.day, 0, this.active.daily.length - 1)]; },

    setDay(i) {
        const n = this.active.daily.length;
        this.day = clamp(i, 0, n - 1);
        $('scrub').value = this.day + 1;
        $('day-num').textContent = this.day + 1;

        this.paintRibbonHead();
        this.paintReadout();
        this.paintStageCard();
        this.updateScene();
        this.drawMainChart();

        if ($('view-analyze').classList.contains('active')) {
            this.drawWaterfall();
            $('wf-day-label').textContent = txt('wf.day', { n: this.day + 1 }, 'Day {n}');
        }
    },

    play() {
        if (this.playing) return;
        this.playing = true;
        $('btn-play').setAttribute('aria-pressed', 'true');
        $('play-icon').innerHTML = '<path d="M3 2h4v12H3zM9 2h4v12H9z"/>';

        let last = performance.now(), acc = 0;
        const perDay = 1000 / 14;          // 14 days per second
        const step = now => {
            if (!this.playing) return;
            acc += now - last; last = now;
            while (acc >= perDay) {
                acc -= perDay;
                if (this.day >= this.active.daily.length - 1) { this.stop(); return; }
                this.setDay(this.day + 1);
            }
            this._raf = requestAnimationFrame(step);
        };
        this._raf = requestAnimationFrame(step);
    },

    stop() {
        this.playing = false;
        if (this._raf) cancelAnimationFrame(this._raf);
        $('btn-play').setAttribute('aria-pressed', 'false');
        $('play-icon').innerHTML = '<path d="M3 1.5v13l11-6.5z"/>';
    },

    /* ---- phenology ribbon ------------------------------------------------ */

    buildRibbon() {
        const scale = getPhenologyScale(this.state.speciesKey);
        const host = $('stage-nodes');
        host.innerHTML = '';
        this.stages = scale;

        scale.forEach((st, i) => {
            const b = el('button', 'stage');
            b.type = 'button';
            b.style.left = (st.frac * 100) + '%';
            b.title = stageLabel(st) + ' — ' + stageDetail(st);
            b.setAttribute('aria-label', txt('ribbon.jumpTo', { stage: stageLabel(st) }, 'Jump to {stage}'));
            b.innerHTML =
                '<span class="stage-glyph">' + stageGlyph(i, scale.length) + '</span>' +
                '<span class="stage-code">' + st.code + '</span>' +
                '<span class="stage-dot"></span>';
            b.addEventListener('click', () => {
                this.stop();
                const target = this.active.daily.findIndex(d => d.ttFrac >= st.frac);
                this.setDay(target >= 0 ? target : 0);
            });
            host.appendChild(b);
        });
    },

    paintRibbonHead() {
        const d = this.today();
        const pct = clamp(d.ttFrac * 100, 0, 100);
        $('ribbon-fill').style.width = pct + '%';
        $('ribbon-head').style.left = pct + '%';

        const nodes = $('stage-nodes').children;
        let currentIdx = 0;
        this.stages.forEach((st, i) => { if (d.ttFrac >= st.frac) currentIdx = i; });
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].classList.toggle('reached', d.ttFrac >= this.stages[i].frac);
            nodes[i].classList.toggle('current', i === currentIdx);
        }
        this.currentStage = this.stages[currentIdx];
    },

    paintStageCard() {
        const st = this.currentStage;
        if (!st) return;
        $('vp-stage-code').textContent = st.code;
        $('vp-stage-label').textContent = stageLabel(st);
        $('vp-stage-detail').textContent = stageDetail(st);
    },

    /* ---- readout --------------------------------------------------------- */

    paintReadout() {
        const d = this.today();
        const yp = this.resYp.summary, yw = this.resYw.summary;
        const gap = yp.finalYieldTha > 0
            ? ((yp.finalYieldTha - yw.finalYieldTha) / yp.finalYieldTha) * 100 : 0;
        const limiting = d.f_water < d.f_heat ? 'water' : (d.f_heat < 0.999 ? 'heat' : 'none');

        const laiUnit = txt('ro.lai.unit', null, 'LAI');
        const cells = [
            [txt('ro.biomass', null, 'Biomass'), fmt(d.cumBiomassTha, 2), 't/ha', 'canopy'],
            [txt('ro.yield', null, 'Yield'), fmt(d.cumYieldTha, 2), 't/ha', 'canopy'],
            [txt('ro.light', null, 'Light caught'), fmt(d.f_solar, 2), 'f_solar', 'radiance'],
            [txt('ro.lai', null, 'Leaf area'), fmt(d.LAI, 2), laiUnit, 'canopy'],
            [txt('ro.tt', null, 'Thermal time'), fmt(d.TT, 0), '°C·d', 'ochre'],
            [txt('ro.limiting', null, 'Limiting'),
             limiting === 'none' ? '—' : txt('ro.limit.' + limiting, null, limiting), '',
             limiting === 'water' ? 'irrigation' : 'oxide'],
            [txt('ro.yw', null, 'Y<sub>w</sub> rainfed'), fmt(yw.finalYieldTha, 2), 't/ha', 'canopy'],
            [txt('ro.yp', null, 'Y<sub>p</sub> irrigated'), fmt(yp.finalYieldTha, 2), 't/ha', 'irrigation'],
            [txt('ro.gap', null, 'Yield gap'), fmt(gap, 0), '%', gap > 15 ? 'oxide' : 'ochre'],
            [txt('ro.season', null, 'Season'), String(this.active.summary.maturityDay),
             txt('ro.days', null, 'days'), 'ochre']
        ];

        $('readout').innerHTML = cells.map(c =>
            '<div class="ro" data-accent="' + c[3] + '">' +
            '<span class="tag">' + c[0] + '</span>' +
            '<div class="ro-val">' + c[1] + (c[2] ? '<small>' + c[2] + '</small>' : '') + '</div></div>'
        ).join('');
    },

    paintOverlay() {
        const d = this.today();
        const bits = [
            'f<sub>Solar</sub> <b>' + fmt(d.f_solar, 2) + '</b>',
            'LAI <b>' + fmt(d.LAI, 2) + '</b>',
            'f<sub>water</sub> <b>' + fmt(d.f_water, 2) + '</b>',
            'f<sub>heat</sub> <b>' + fmt(d.f_heat, 2) + '</b>'
        ];
        $('vp-overlay').innerHTML = bits.map(b => '<span class="vp-chip">' + b + '</span>').join('');

        // When the rays are on, put the geometry's own answer next to the
        // model's. In a stand the two agree closely, which is the point:
        // Beer-Lambert assumes a closed canopy. One plant on its own always
        // undershoots, because most of its ground square is bare.
        const hint = $('vp-rays');
        if (this.has3D() && this.scene && this.scene.showRays && this.scene.measuredInterception != null) {
            const m = this.scene.measuredInterception;
            const agrees = Math.abs(m - d.f_solar) < 0.12;
            hint.innerHTML =
                txt('vp.rays.hit', { measured: fmt(m, 2), modelled: fmt(d.f_solar, 2) },
                    '<span class="ray-num">{measured}</span> of the rays hit a leaf. ' +
                    'The model says f<sub>Solar</sub> = <span class="ray-num">{modelled}</span>.') +
                (agrees
                    ? txt('vp.rays.agree', null,
                          ' <em>They agree — this canopy is closed enough for Beer-Lambert to hold.</em>')
                    : txt('vp.rays.disagree', null,
                          ' <em>One plant alone undershoots: most of its ground square is bare. Switch to Stand and they converge.</em>'));
            hint.classList.remove('hide');
        } else {
            hint.classList.add('hide');
        }
    },

    /* ---- 3D scene -------------------------------------------------------- */

    initScene() {
        // The schematic needs no WebGL, so it is built immediately and is the
        // fallback if three.js never arrives.
        this.canopy = new CanopyDiagram($('viewport'));
        this.syncPlantPanel();
        this.updateCanopy(true);

        const start = () => {
            if (!window.PlantScene) return;
            try {
                this.scene = new PlantScene($('viewport'));
                this.rebuildPlants();
            } catch (err) {
                this.sceneFailed(txt('vp.fail.start', null,
                    'The 3D view could not start in this browser. Everything else on this page still works.'));
                console.error(err);
            }
        };
        if (window.PlantScene) start();
        else {
            window.addEventListener('plant3d-ready', start, { once: true });
            // If the module never arrives (offline, CDN blocked), say so plainly.
            setTimeout(() => {
                if (!this.scene) {
                    this.sceneFailed(txt('vp.fail.load', null,
                        'The 3D view needs the three.js library, which could not be loaded. '
                        + 'Check the network connection — the rest of the page works offline.'));
                }
            }, 6000);
        }
    },

    sceneFailed(msg) {
        // Without three.js the schematic is the only plant view there is, so
        // show it for every crop and only then explain what is missing.
        this._no3D = true;
        if (this.canopy) {
            this.syncPlantPanel();
            this.updateCanopy(true);
        }
        if ($('viewport').querySelector('.vp-fallback')) return;
        $('viewport').appendChild(el('div', 'vp-fallback', '<p>' + msg + '</p>'));
    },

    rebuildPlants() {
        this.syncPlantPanel();
        if (!this.has3D()) { this.updateCanopy(true); return; }
        if (!this.scene) return;
        const arch = getArchitecture(this.state.speciesKey);
        const cv = this.cultivar();
        const habit = (cv && cv.habit) ? BEAN_HABITS[cv.habit] : null;

        let specs;
        if (this.vpMode === 'compare') {
            specs = [
                { arch, habit, label: txt('vp.label.rainfed', null, 'Rainfed'), offsetX: -0.16 },
                { arch, habit, label: txt('vp.label.irrigated', null, 'Irrigated'), offsetX: 0.16 }
            ];
            this._standSpread = 0.16;
        } else if (this.vpMode === 'field') {
            // Spacing follows the plant-density control, so f_solar_max reads
            // as a spatial fact rather than an abstract ceiling.
            const gap = 0.10 + (1 - this.state.fSolarMax) * 0.26;
            this._standSpread = gap;
            specs = [];
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    specs.push({ arch, habit, offsetX: i * gap, offsetZ: j * gap,
                                 detail: (i === 0 && j === 0) ? 'full' : 'simple' });
                }
            }
        } else {
            specs = [{ arch, habit }];
        }

        this.scenePlants = this.scene.setPlants(specs, this.vpMode);
        this.updateScene(true);
    },

    updateScene(reframe) {
        if (!this.has3D()) { this.updateCanopy(reframe); return; }
        if (!this.scene || !this.scenePlants.length) return;
        const arch = getArchitecture(this.state.speciesKey);

        // The 3D plant flowers exactly when the stage scale says it does, so
        // the ribbon and the plant can never tell different stories.
        const scale = getPhenologyScale(this.state.speciesKey);
        const fracOf = codes => {
            const hit = scale.find(st => codes.indexOf(st.code) >= 0);
            return hit ? hit.frac : null;
        };
        const flowerFrom = fracOf(['R6', 'FL']) ?? 0.56;
        const flowerTo = fracOf(['R8', 'GF']) ?? 0.76;

        // Node appearance should finish around flowering. Deriving the
        // phyllochron from Tsum keeps that true for a 1450 degC.d snap bean
        // and a 2300 degC.d climber alike, instead of freezing the plant's
        // structure a third of the way through a long season.
        const cv = this.cultivar();
        const habit = (cv && cv.habit) ? BEAN_HABITS[cv.habit] : null;
        const nodes = Math.min(habit ? habit.maxNodes : arch.maxNodes, arch.maxNodes);
        const phyllochron = (this.state.Tsum * flowerFrom) / Math.max(3, nodes);

        const ctx = {
            plantsPerM2: arch.plantsPerM2,
            phyllochron: phyllochron,
            peakFsolar: this.active.summary.peakFsolar,
            flowerFrom: flowerFrom,
            flowerTo: flowerTo,
            awc: this.state.awc,
            rzd: this.state.rzd
        };

        let records;
        if (this.vpMode === 'compare') {
            const a = this.resYw.daily, b = this.resYp.daily;
            records = [a[clamp(this.day, 0, a.length - 1)], b[clamp(this.day, 0, b.length - 1)]];
        } else {
            records = this.scenePlants.map(() => this.today());
        }

        this.scene.setDay(records, ctx);
        this.scene.setSunAngle(this.today().ttFrac);
        if (reframe) {
            const p0 = this.scenePlants[0];
            const spread = this.vpMode === 'single' ? 0 : this._standSpread || 0;
            this.scene.frameCamera(p0.height, p0.radius, spread);
        }
        this.paintOverlay();
    },

    /* ---- main season chart ------------------------------------------------ */

    drawMainChart() {
        const c = $('chart-main');
        if (!c || !window.Chart) return;
        if (this.charts.main) this.charts.main.destroy();

        const A = this.active.daily;
        const labels = A.map(d => d.dayOfSeason);
        const line = (label, data, color, opts) => Object.assign({
            label, data, borderColor: color, backgroundColor: color + '22',
            borderWidth: 2, pointRadius: 0, tension: 0.25
        }, opts || {});

        const DAY = txt('ch.dayOfSeason', null, 'Day of season');

        let cfg;
        if (this.chartKind === 'biomass') {
            const P_ = this.resYp.daily;
            cfg = { type: 'line', data: { labels, datasets: [
                line(txt('ch.biomass.irr', null, 'Biomass — irrigated'), P_.map(d => d.cumBiomassTha), P.irrigation, { borderDash: [4, 3], borderWidth: 1.5 }),
                line(txt('ch.biomass.rain', null, 'Biomass — rainfed'), A.map(d => d.cumBiomassTha), P.canopy, { fill: true }),
                line(txt('ch.yield', null, 'Yield'), A.map(d => d.cumYieldTha), P.ochre, { borderWidth: 2.5 })
            ] }, options: { scales: {
                x: { title: { display: true, text: DAY }, ticks: { maxTicksLimit: 12 } },
                y: { beginAtZero: true, title: { display: true, text: 't/ha' } } } } };

        } else if (this.chartKind === 'canopy') {
            cfg = { type: 'line', data: { labels, datasets: [
                line(txt('ch.fsolar', null, 'f_solar — light intercepted'), A.map(d => d.f_solar), P.canopy, { fill: true, yAxisID: 'y' }),
                line(txt('ch.lai', null, 'LAI (derived)'), A.map(d => d.LAI), P.violet, { yAxisID: 'y2', borderDash: [2, 2] }),
                line(txt('ch.tt', null, 'Thermal time'), A.map(d => d.TT), P.ochre, { yAxisID: 'y1', borderDash: [5, 3] })
            ] }, options: { scales: {
                x: { title: { display: true, text: DAY }, ticks: { maxTicksLimit: 12 } },
                y: { min: 0, max: 1, title: { display: true, text: 'f_solar' } },
                y2: { display: false, min: 0 },
                y1: { position: 'right', beginAtZero: true, title: { display: true, text: '°C·d' }, grid: { drawOnChartArea: false } } } } };

        } else if (this.chartKind === 'stress') {
            cfg = { type: 'line', data: { labels, datasets: [
                line('f(water)', A.map(d => d.f_water), P.irrigation),
                line('f(heat)', A.map(d => d.f_heat), P.oxide),
                line('f(temp)', A.map(d => d.f_temp), P.canopy),
                line('f(CO₂)', A.map(d => d.f_co2), P.violet, { borderDash: [3, 3] })
            ] }, options: { scales: {
                x: { title: { display: true, text: DAY }, ticks: { maxTicksLimit: 12 } },
                y: { min: 0, suggestedMax: 1.3, title: { display: true, text: txt('ch.multiplier', null, 'multiplier (1 = no limitation)') } } } } };

        } else if (this.chartKind === 'weather') {
            cfg = { type: 'bar', data: { labels, datasets: [
                { type: 'bar', label: txt('ch.rain', null, 'Rainfall'), data: A.map(d => d.rain),
                  backgroundColor: P.irrigation + '55', borderColor: P.irrigation, borderWidth: 0, yAxisID: 'y1' },
                Object.assign(line('Tmax', A.map(d => d.Tmax), P.oxide), { type: 'line' }),
                Object.assign(line('Tmin', A.map(d => d.Tmin), P.irrigation), { type: 'line' }),
                Object.assign(line(txt('ch.radiation', null, 'Radiation'), A.map(d => d.srad), P.radiance), { type: 'line', borderDash: [3, 3] })
            ] }, options: { scales: {
                x: { title: { display: true, text: DAY }, ticks: { maxTicksLimit: 12 } },
                y: { title: { display: true, text: '°C  /  MJ m⁻² d⁻¹' } },
                y1: { position: 'right', beginAtZero: true, title: { display: true, text: 'mm' }, grid: { drawOnChartArea: false } } } } };

        } else {
            const cap = this.state.rzd * this.state.awc;
            cfg = { type: 'bar', data: { labels, datasets: [
                { type: 'bar', label: txt('ch.rain', null, 'Rainfall'), data: A.map(d => d.rain),
                  backgroundColor: P.irrigation + '44', yAxisID: 'y1' },
                Object.assign(line(txt('ch.storedWater', null, 'Stored soil water'), A.map(d => d.soilWaterMm), P.ochre, { fill: true }), { type: 'line' }),
                Object.assign(line(txt('ch.capacity', null, 'Capacity'), A.map(() => cap), P.ink4, { borderDash: [4, 4], borderWidth: 1 }), { type: 'line' }),
                Object.assign(line(txt('ch.arid', null, 'ARID drought index'), A.map(d => d.ARID), P.oxide, { yAxisID: 'y2' }), { type: 'line' })
            ] }, options: { scales: {
                x: { title: { display: true, text: DAY }, ticks: { maxTicksLimit: 12 } },
                y: { beginAtZero: true, title: { display: true, text: 'mm' } },
                y1: { display: false, beginAtZero: true },
                y2: { position: 'right', min: 0, max: 1, title: { display: true, text: 'ARID' }, grid: { drawOnChartArea: false } } } } };
        }

        cfg.options = cfg.options || {};
        cfg.options.plugins = Object.assign({ dayMarker: { index: this.day } }, cfg.options.plugins);
        cfg.options.interaction = { mode: 'index', intersect: false };
        this.charts.main = new Chart(c.getContext('2d'), cfg);
    },

    /* ---- analyse --------------------------------------------------------- */

    refreshAnalyse() {
        this.drawWaterfall();
        this.drawLosses();
        this.drawTornado();
        this.drawSweep();
        this.drawSurface();
        this.drawCompare();
        $('wf-day-label').textContent = txt('wf.day', { n: this.day + 1 }, 'Day {n}');
        this.analyseStale = false;
    },

    drawWaterfall() {
        const d = this.today();
        const w = d.waterfall;
        const max = Math.max(w.reference, 0.001);

        const rows = [
            { name: txt('wf.reference', null, 'Reference'), from: 0, to: w.reference, color: P.ink4, kind: 'ref' },
            { name: txt('wf.canopy', null, '− canopy'), from: w.afterCanopy, to: w.reference, color: P.canopy, kind: 'loss', amt: -w.lossCanopy },
            { name: txt('wf.temperature', null, '− temperature'), from: w.afterTemp, to: w.afterCanopy, color: P.ochre, kind: 'loss', amt: -w.lossTemp },
            { name: txt('wf.heat', null, '− heat'), from: w.actual, to: w.afterTemp, color: P.oxide, kind: 'loss', amt: -w.lossHeat },
            { name: txt('wf.water', null, '− water'), from: w.actual, to: w.afterTemp, color: P.irrigation, kind: 'loss', amt: -w.lossWater },
            { name: txt('wf.achieved', null, 'Achieved'), from: 0, to: w.actual, color: P.canopyDeep, kind: 'total' }
        ].filter(r => r.kind !== 'loss' || Math.abs(r.amt) > 0.0005);

        $('waterfall').innerHTML = rows.map(r => {
            const left = (Math.min(r.from, r.to) / max) * 100;
            const width = (Math.abs(r.to - r.from) / max) * 100;
            const amt = r.kind === 'loss' ? fmt(r.amt, 2) : fmt(r.to, 2);
            return '<div class="wf-row ' + (r.kind === 'loss' ? 'is-loss' : (r.kind === 'total' ? 'is-total' : '')) + '">' +
                '<span class="wf-name">' + r.name + '</span>' +
                '<span class="wf-bar-track"><span class="wf-bar" style="left:' + left + '%;width:' + Math.max(0.6, width) + '%;background:' + r.color + '"></span></span>' +
                '<span class="wf-amt">' + amt + '</span></div>';
        }).join('') +
        '<div class="wf-row"><span class="wf-name tag">g m⁻² d⁻¹</span><span></span><span></span></div>';
    },

    drawLosses() {
        const c = $('chart-losses');
        if (!c || !window.Chart) return;
        if (this.charts.losses) this.charts.losses.destroy();

        const L = this.active.losses;
        // [label, value, colour, cause key for the summary sentence]
        const parts = [
            [txt('ls.achieved', null, 'Achieved biomass'), L.realisedTha, P.canopy, null],
            [txt('ls.canopy', null, 'Lost to open canopy'), L.canopyTha, P.ink4, 'canopy'],
            [txt('ls.temp', null, 'Lost to temperature'), L.tempTha, P.ochre, 'temp'],
            [txt('ls.heat', null, 'Lost to heat'), L.heatTha, P.oxide, 'heat'],
            [txt('ls.water', null, 'Lost to water'), L.waterTha, P.irrigation, 'water']
        ].filter(p => p[1] > 0.001);

        this.charts.losses = new Chart(c.getContext('2d'), {
            type: 'bar',
            data: {
                labels: [''],
                datasets: parts.map(p => ({ label: p[0], data: [p[1]], backgroundColor: p[2], borderWidth: 0 }))
            },
            options: {
                indexAxis: 'y',
                scales: {
                    x: { stacked: true, beginAtZero: true, title: { display: true, text: txt('ls.axis', null, 't/ha of potential biomass') } },
                    y: { stacked: true, display: false }
                },
                plugins: { legend: { position: 'bottom' } }
            }
        });

        const biggest = parts.filter(p => p[3]).sort((a, b) => b[1] - a[1])[0];
        const total = L.referenceTha || 1;
        const CAUSE_EN = { canopy: 'open canopy', temp: 'temperature', heat: 'heat', water: 'water' };
        $('loss-sentence').innerHTML = biggest
            ? txt('ls.sentence', {
                    got: fmt(L.realisedTha, 2),
                    could: fmt(total, 2),
                    cause: txt('ls.cause.' + biggest[3], null, CAUSE_EN[biggest[3]]),
                    amount: fmt(biggest[1], 2)
                },
                'Against a fully closed, unstressed canopy, this season reached <strong>{got} t/ha</strong> '
                + 'of the <strong>{could} t/ha</strong> its radiation could have supported. '
                + 'The largest single shortfall was <strong>{cause}</strong>, at {amount} t/ha.')
            : txt('ls.none', null, 'This season ran without any measurable limitation.');
    },

    drawTornado() {
        const pct = parseFloat($('tor-pct').value);
        const metric = this.torMetric || 'biomass';
        const t = explorer.tornado(this.state, null, pct, metric);
        const max = Math.max(0.001, ...t.rows.map(r => r.swing));

        $('tornado').innerHTML = t.rows.map(r => {
            const seg = (v, cls) => {
                const w = (Math.abs(v) / max) * 50;
                const left = v < 0 ? 50 - w : 50;
                return '<span class="tor-bar ' + cls + '" style="left:' + left + '%;width:' + w + '%"></span>';
            };
            return '<div class="tor-row" title="' + paramLabel(r.param) + ': ' + fmt(r.low, r.param.decimals) +
                ' → ' + fmt(r.high, r.param.decimals) + ' ' + paramUnit(r.param) + '">' +
                '<span class="tor-name">' + r.param.symbol + '</span>' +
                '<span class="tor-track"><span class="tor-mid"></span>' +
                seg(r.deltaLow, r.deltaLow < 0 ? 'neg' : 'pos') +
                seg(r.deltaHigh, r.deltaHigh < 0 ? 'neg' : 'pos') +
                '</span>' +
                '<span class="tor-swing">' + fmt(r.swing, 2) + '</span></div>';
        }).join('') +
        '<div class="tor-row" style="margin-top:6px">' +
        '<span class="tor-name tag">' + txt('to.param', null, 'param') + '</span>' +
        '<span class="tag" style="text-align:center">' +
        txt('to.legend', { base: fmt(t.base, 2) }, '← lower &nbsp;&nbsp; base {base} &nbsp;&nbsp; higher →') +
        '</span><span class="tor-swing tag">t/ha</span></div>';
    },

    drawSweep() {
        const c = $('chart-sweep');
        if (!c || !window.Chart) return;
        const id = $('sel-sweep').value;
        const sw = explorer.sweep1D(this.state, id, 36);
        if (this.charts.sweep) this.charts.sweep.destroy();

        const p = sw.param;
        const curIdx = sw.values.reduce((best, v, i) =>
            Math.abs(v - sw.current) < Math.abs(sw.values[best] - sw.current) ? i : best, 0);

        this.charts.sweep = new Chart(c.getContext('2d'), {
            type: 'line',
            data: {
                labels: sw.values.map(v => fmt(v, p.decimals)),
                datasets: [
                    { label: txt('ch.biomassLabel', null, 'Biomass'), data: sw.biomass, borderColor: P.canopy,
                      backgroundColor: P.canopy + '20', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.2 },
                    { label: txt('ch.yield', null, 'Yield'), data: sw.yield, borderColor: P.ochre,
                      borderWidth: 2.5, pointRadius: 0, tension: 0.2 }
                ]
            },
            options: {
                scales: {
                    x: { title: { display: true, text: paramLabel(p) + (p.unit ? ' (' + paramUnit(p) + ')' : '') }, ticks: { maxTicksLimit: 9 } },
                    y: { beginAtZero: true, title: { display: true, text: 't/ha' } }
                },
                plugins: { dayMarker: { index: curIdx } }
            }
        });

        const best = sw.yield.indexOf(Math.max(...sw.yield));
        $('sweep-note').innerHTML = txt('sw.best', {
            sym: p.symbol, val: fmt(sw.values[best], p.decimals), unit: paramUnit(p),
            yield: fmt(sw.yield[best], 2), current: fmt(sw.current, p.decimals)
        }, 'Highest yield at <strong>{sym} = {val} {unit}</strong> ({yield} t/ha). '
         + 'The dashed line marks your current setting, {current}.');
    },

    /**
     * Response surface. Computed a row at a time across animation frames so a
     * 900-run grid never blocks the interface.
     */
    drawSurface() {
        const idX = $('sel-surf-x').value, idY = $('sel-surf-y').value;
        const px = PARAM_BY_ID[idX], py = PARAM_BY_ID[idY];
        const canvas = $('surface');
        const ctx2d = canvas.getContext('2d');
        const N = 26;

        if (idX === idY) {
            ctx2d.clearRect(0, 0, canvas.width, canvas.height);
            $('surf-note').textContent = txt('su.same', null,
                'Choose two different parameters to see how they interact.');
            return;
        }

        if (this._surfToken) cancelAnimationFrame(this._surfToken);
        const token = {};
        this._surfActive = token;

        const xs = [], ys = [];
        for (let i = 0; i < N; i++) xs.push(px.min + (px.max - px.min) * (i / (N - 1)));
        for (let j = 0; j < N; j++) ys.push(py.min + (py.max - py.min) * (j / (N - 1)));

        const z = [];
        let row = 0;
        $('surf-note').textContent = txt('su.computing', { n: N * N }, 'Computing {n} runs…');

        const stepRow = () => {
            if (this._surfActive !== token) return;
            const t0 = performance.now();
            while (row < N && performance.now() - t0 < 12) {
                const r = [];
                for (let i = 0; i < N; i++) {
                    const res = explorer.run({ ...this.state, [idX]: xs[i], [idY]: ys[row] }, true);
                    r.push(res.summary.finalYieldTha);
                }
                z.push(r);
                row++;
            }
            if (row < N) { this._surfToken = requestAnimationFrame(stepRow); return; }

            // --- paint ---
            let zMin = Infinity, zMax = -Infinity;
            for (const r of z) for (const v of r) { if (v < zMin) zMin = v; if (v > zMax) zMax = v; }

            const cw = canvas.width, ch = canvas.height;
            const img = ctx2d.createImageData(cw, ch);
            for (let py_ = 0; py_ < ch; py_++) {
                const j = Math.min(N - 1, Math.floor((1 - py_ / ch) * N));
                for (let px_ = 0; px_ < cw; px_++) {
                    const i = Math.min(N - 1, Math.floor((px_ / cw) * N));
                    const f = (z[j][i] - zMin) / Math.max(1e-9, zMax - zMin);
                    const col = surfaceColor(f);
                    const o = (py_ * cw + px_) * 4;
                    img.data[o] = col[0]; img.data[o + 1] = col[1];
                    img.data[o + 2] = col[2]; img.data[o + 3] = 255;
                }
            }
            ctx2d.putImageData(img, 0, 0);

            // current setting
            const cx = ((this.state[idX] - px.min) / (px.max - px.min)) * cw;
            const cy = (1 - (this.state[idY] - py.min) / (py.max - py.min)) * ch;
            ctx2d.strokeStyle = '#FAFAF5'; ctx2d.lineWidth = 2;
            ctx2d.beginPath(); ctx2d.arc(cx, cy, 5, 0, Math.PI * 2); ctx2d.stroke();
            ctx2d.strokeStyle = P.ink; ctx2d.lineWidth = 1;
            ctx2d.beginPath(); ctx2d.arc(cx, cy, 5, 0, Math.PI * 2); ctx2d.stroke();

            $('surf-x-label').textContent = px.symbol + ' — ' + paramLabel(px) +
                ' (' + fmt(px.min, px.decimals) + ' → ' + fmt(px.max, px.decimals) + ' ' + paramUnit(px) + ')';
            $('surf-min').textContent = fmt(zMin, 2);
            $('surf-max').textContent = fmt(zMax, 2) + ' t/ha';
            $('surf-grad').style.background = surfaceGradientCss();
            $('surf-note').innerHTML = txt('su.note',
                { x: px.symbol, y: py.symbol, ymin: fmt(py.min, py.decimals) },
                'Yield across <strong>{x}</strong> (horizontal) and <strong>{y}</strong> (vertical, '
                + '{ymin} at the bottom). The ring marks your current setting. A surface that is flat '
                + 'in one direction means that parameter has no leverage in this situation.');
        };
        this._surfToken = requestAnimationFrame(stepRow);
    },

    /* ---- scenarios ------------------------------------------------------- */

    saveScenario(slot) {
        const s = this.state;
        const cv = this.cultivar();
        this.scenarios[slot] = {
            label: cropName(s.speciesKey) + ' · ' + (cv ? cv.name : ''),
            meta: [
                txt('sc.climate.' + s.climateZone, null, s.climateZone.replace('_', ' ')) +
                    ', ' + soilName(s.soilKey),
                (s.isIrrigated ? txt('sc.irrigated', null, 'irrigated') : txt('sc.rainfed', null, 'rainfed')) +
                    ', ' + txt('sc.sownDoy', { doy: s.sowingDay }, 'sown DOY {doy}'),
                txt('sc.weather',
                    { dt: fmt(s.tempShift, 1), rain: fmt(s.rainScale, 2), co2: s.co2 },
                    'ΔT {dt}°C, rain ×{rain}, CO₂ {co2} ppm'),
                'RUE ' + fmt(s.RUE, 2) + ', HI ' + fmt(s.HI, 2) + ', Tsum ' + fmt(s.Tsum, 0)
            ],
            res: this.active,
            state: { ...s }
        };
        this.drawCompare();
    },

    drawCompare() {
        const A = this.scenarios.A, B = this.scenarios.B;

        const paint = (slot, sc) => {
            const host = $('scen-' + slot.toLowerCase());
            if (!sc) {
                host.innerHTML = '<span class="scen-empty">' +
                    (slot === 'A' ? txt('an.emptyA', null, 'Set up a run in Grow, then save it here.')
                                  : txt('an.emptyB', null, 'Change something, then save the second run.')) +
                    '</span>';
                return;
            }
            host.innerHTML = '<strong style="font-family:var(--display);font-size:13px">' + sc.label +
                '</strong><br>' + sc.meta.join('<br>');
        };
        paint('A', A); paint('B', B);

        const c = $('chart-compare');
        if (this.charts.cmp) { this.charts.cmp.destroy(); this.charts.cmp = null; }
        $('cmp-table').innerHTML = '';
        if (!A || !B) {
            $('cmp-box').style.display = 'none';
            return;
        }
        $('cmp-box').style.display = '';

        const maxLen = Math.max(A.res.daily.length, B.res.daily.length);
        const series = res => {
            const out = [];
            for (let i = 0; i < maxLen; i++) out.push(i < res.daily.length ? res.daily[i].cumBiomassTha : null);
            return out;
        };

        this.charts.cmp = new Chart(c.getContext('2d'), {
            type: 'line',
            data: {
                labels: Array.from({ length: maxLen }, (_, i) => i + 1),
                datasets: [
                    { label: 'A — ' + A.label, data: series(A.res), borderColor: P.canopy,
                      backgroundColor: P.canopy + '20', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.2 },
                    { label: 'B — ' + B.label, data: series(B.res), borderColor: P.irrigation,
                      backgroundColor: P.irrigation + '20', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.2 }
                ]
            },
            options: { scales: {
                x: { title: { display: true, text: txt('ch.dayOfSeason', null, 'Day of season') }, ticks: { maxTicksLimit: 12 } },
                y: { beginAtZero: true, title: { display: true, text: txt('ch.cumBiomass', null, 'Cumulative biomass (t/ha)') } } } }
        });

        const rows = [
            [txt('sc.row.yield', null, 'Yield'), 'finalYieldTha', 2, 't/ha'],
            [txt('sc.row.biomass', null, 'Biomass'), 'finalBiomassTha', 2, 't/ha'],
            [txt('sc.row.season', null, 'Season length'), 'maturityDay', 0, 'd'],
            [txt('sc.row.peakF', null, 'Peak light capture'), 'peakFsolar', 2, 'f_solar'],
            [txt('sc.row.peakLAI', null, 'Peak leaf area'), 'peakLAI', 2, txt('ro.lai.unit', null, 'LAI')],
            [txt('sc.row.waterDays', null, 'Water stress days'), 'waterStressDays', 0, 'd'],
            [txt('sc.row.heatDays', null, 'Heat stress days'), 'heatStressDays', 0, 'd']
        ];
        $('cmp-table').innerHTML = rows.map(r => {
            const a = A.res.summary[r[1]], b = B.res.summary[r[1]];
            const diff = b - a;
            const pctTxt = a ? ' (' + (diff >= 0 ? '+' : '') + fmt((diff / a) * 100, 0) + '%)' : '';
            const col = Math.abs(diff) < 1e-9 ? P.ink3 : (diff > 0 ? P.canopy : P.oxide);
            return '<tr><td>' + r[0] + '</td><td class="num">' + fmt(a, r[2]) + ' ' + r[3] +
                '</td><td class="num">' + fmt(b, r[2]) + ' ' + r[3] +
                '</td><td class="num" style="color:' + col + ';font-weight:600">' +
                (diff >= 0 ? '+' : '') + fmt(diff, r[2]) + pctTxt + '</td></tr>';
        }).join('');
    },

    /* ---- trials ---------------------------------------------------------- */

    buildTrials() {
        const host = $('exp-grid');
        host.innerHTML = '';
        TRIALS.forEach(t => {
            const card = el('div', 'exp');
            card.style.setProperty('--ec', P[t.accent] || P.canopy);
            card.innerHTML =
                '<span class="exp-q">' + trialText(t, 'eyebrow') + '</span>' +
                '<div class="exp-title">' + trialText(t, 'title') + '</div>' +
                '<div class="exp-body">' + trialText(t, 'body') + '</div>' +
                '<div class="exp-look">' + trialText(t, 'look') + '</div>';
            const btn = el('button', 'btn btn-primary', txt('tr.load', null, 'Load this trial'));
            btn.addEventListener('click', () => {
                const s = makeDefaultState(t.species, t.cultivar, t.climate, t.soil);
                Object.assign(s, t.set || {});
                this.state = s;
                $('sel-species').value = s.speciesKey;
                this.buildCultivarSelect();
                $('sel-climate').value = s.climateZone;
                $('sel-soil').value = s.soilKey;
                $('sw-irrigation').setAttribute('aria-checked', String(!!s.isIrrigated));
                $('irrigation-label').innerHTML = irrigationLabel(s.isIrrigated);
                this.repaintRail();
                this.run(true);
                this.rebuildPlants();
                if (t.sweep) $('sel-sweep').value = t.sweep;
                if (t.surf) { $('sel-surf-x').value = t.surf[0]; $('sel-surf-y').value = t.surf[1]; }
                // Grow is where the trial's changes are visible, so every trial
                // lands there. The sweep and surface selections above are still
                // primed for whenever the user moves on to Analyse.
                this.showView('view-grow');
                scrollTo({ top: 0, behavior: 'smooth' });
            });
            card.appendChild(btn);
            host.appendChild(card);
        });
    }
};

/* ==========================================================================
   Stage glyphs — small plant silhouettes, in the manner of a BBCH chart
   ========================================================================== */

function stageGlyph(i, n) {
    const t = n > 1 ? i / (n - 1) : 0;
    const H = 30, W = 26, base = 28, cx = W / 2;
    const stemH = 5 + t * 17;
    const top = base - stemH;
    const parts = [];

    parts.push('<line x1="' + cx + '" y1="' + base + '" x2="' + cx + '" y2="' + top +
        '" stroke="currentColor" stroke-width="1.4"/>');

    // leaves appear and then thin out again as the crop dries down
    const leafN = Math.max(1, Math.round((t < 0.82 ? t : 0.82 - (t - 0.82) * 2.4) * 5) + 1);
    for (let k = 0; k < leafN; k++) {
        const y = base - 3 - k * (stemH / (leafN + 0.4));
        const side = k % 2 ? 1 : -1;
        const L = 3.4 + t * 3.2;
        parts.push('<path d="M' + cx + ' ' + y + ' q' + (side * L) + ' ' + (-L * 0.75) + ' ' +
            (side * L * 1.7) + ' ' + (L * 0.15) + ' q' + (-side * L * 0.7) + ' ' + (L * 0.8) + ' ' +
            (-side * L * 1.7) + ' ' + (-L * 0.15) + 'z" fill="currentColor"/>');
    }

    if (t > 0.44 && t < 0.72) {
        parts.push('<circle cx="' + (cx + 4) + '" cy="' + (top + 3) + '" r="1.7" fill="currentColor" opacity=".55"/>');
        parts.push('<circle cx="' + (cx - 4) + '" cy="' + (top + 6) + '" r="1.4" fill="currentColor" opacity=".55"/>');
    }
    if (t >= 0.62) {
        const swell = Math.min(1, (t - 0.62) / 0.3);
        for (let k = 0; k < 2; k++) {
            const y = top + 5 + k * 6;
            const side = k % 2 ? 1 : -1;
            parts.push('<rect x="' + (cx + side * 2.4 - 1) + '" y="' + y + '" rx="1.1" ' +
                'width="' + (2 + swell * 1.4) + '" height="' + (5 + swell * 3.5) + '" ' +
                'fill="currentColor" transform="rotate(' + (side * 22) + ' ' + cx + ' ' + y + ')"/>');
        }
    }

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
        parts.join('') + '</svg>';
}

/* ==========================================================================
   Surface colour ramp — parched ochre through to canopy green
   ========================================================================== */

const RAMP = [
    [0.00, [122, 74, 40]],
    [0.30, [176, 116, 42]],
    [0.55, [214, 178, 90]],
    [0.78, [138, 160, 74]],
    [1.00, [47, 80, 25]]
];

function surfaceColor(f) {
    f = clamp(f, 0, 1);
    for (let i = 1; i < RAMP.length; i++) {
        if (f <= RAMP[i][0]) {
            const a = RAMP[i - 1], b = RAMP[i];
            const t = (f - a[0]) / (b[0] - a[0]);
            return [0, 1, 2].map(k => Math.round(a[1][k] + (b[1][k] - a[1][k]) * t));
        }
    }
    return RAMP[RAMP.length - 1][1];
}

function surfaceGradientCss() {
    return 'linear-gradient(to right,' + RAMP.map(s =>
        'rgb(' + s[1].join(',') + ') ' + (s[0] * 100) + '%').join(',') + ')';
}

/* ==========================================================================
   Guided trials
   ========================================================================== */

const TRIALS = [
    {
        id: 't1',
        eyebrow: 'Trial 01 · Warming', accent: 'oxide',
        title: 'Why +3 °C costs yield twice',
        body: 'Warming shortens the season before it ever scorches a leaf. The crop banks thermal time faster, reaches T<sub>sum</sub> sooner, and simply has fewer days to intercept light. Heat stress then arrives on top of that.',
        look: 'Watch season length fall in the readout, then check the tornado: is ΔT acting through T<sub>sum</sub> or through T<sub>heat</sub>?',
        species: 'drybean', cultivar: 'porrillo', climate: 'tropical', soil: 'loam',
        set: { sowingDay: 120, tempShift: 3, isIrrigated: true }, sweep: 'tempShift'
    },
    {
        id: 't2',
        eyebrow: 'Trial 02 · CO₂', accent: 'canopy',
        title: 'C3 gains, C4 shrugs',
        body: 'Rising CO₂ lifts radiation use efficiency, but only as much as a crop\'s photosynthetic pathway allows. Bean carries S<sub>CO2</sub> = 0.07; maize carries 0.01.',
        look: 'Run the CO₂ response curve for bean, then switch the crop to maize and run it again. Same axis, very different slope.',
        species: 'drybean', cultivar: 'porrillo', climate: 'tropical', soil: 'loam',
        set: { sowingDay: 120, co2: 700, isIrrigated: true }, sweep: 'co2'
    },
    {
        id: 't3',
        eyebrow: 'Trial 03 · Drought', accent: 'irrigation',
        title: 'The soil is the buffer',
        body: 'The same rainfall, on sand and on clay loam, produces different crops. Available water capacity and root depth decide how many dry days the crop can ride out between showers.',
        look: 'Compare sand against clay loam at rain ×0.4, then open the response surface for AWC against root zone depth.',
        species: 'drybean', cultivar: 'porrillo', climate: 'tropical', soil: 'sand',
        set: { sowingDay: 120, rainScale: 0.4 }, sweep: 'awc', surf: ['awc', 'rzd']
    },
    {
        id: 't4',
        eyebrow: 'Trial 04 · Breeding', accent: 'violet',
        title: 'Bigger engine or better plumbing?',
        body: 'A breeder can push radiation use efficiency, which makes more biomass, or harvest index, which moves more of that biomass into the pod. The tornado will tell you which buys more in this environment.',
        look: 'Compare the RUE and HI bars. Then change the climate and look again — the answer moves.',
        species: 'drybean', cultivar: 'porrillo', climate: 'tropical', soil: 'loam',
        set: { sowingDay: 120, isIrrigated: true }, surf: ['RUE', 'HI']
    },
    {
        id: 't5',
        eyebrow: 'Trial 05 · Canopy', accent: 'canopy',
        title: 'Close the canopy sooner',
        body: 'I50A sets how fast the canopy reaches half interception. Every day of open ground is radiation falling on soil instead of leaves — the single largest loss term in most seasons.',
        look: 'Watch the "lost to open canopy" bar in the season attribution as you drop I50A. Then look at the plant: leaves appear earlier and bigger.',
        species: 'drybean', cultivar: 'porrillo', climate: 'tropical', soil: 'loam',
        set: { sowingDay: 120, I50A: 300, isIrrigated: true }, sweep: 'I50A'
    },
    {
        id: 't6',
        eyebrow: 'Trial 06 · Density', accent: 'ochre',
        title: 'How thick to sow',
        body: 'f<sub>Solar_max</sub> is a management parameter, not a crop trait. Wider rows mean a lower ceiling on interception no matter how vigorous the variety.',
        look: 'Switch the plant view to Stand and move the plant-density slider. The spacing in the 3D view follows the parameter.',
        species: 'drybean', cultivar: 'porrillo', climate: 'tropical', soil: 'loam',
        set: { sowingDay: 120, fSolarMax: 0.6, isIrrigated: true }, sweep: 'fSolarMax'
    },
    {
        id: 't7',
        eyebrow: 'Trial 07 · Habit', accent: 'violet',
        title: 'Bush against climbing bean',
        body: 'Calima is a determinate bush type with a short cycle. G 2333 climbs, runs far longer, builds much more biomass — and puts a smaller share of it into seed.',
        look: 'Load this, note the yield, then switch the cultivar to Calima. More biomass does not automatically mean more beans.',
        species: 'drybean', cultivar: 'g2333', climate: 'tropical', soil: 'loam',
        set: { sowingDay: 120, isIrrigated: true }
    },
    {
        id: 't8',
        eyebrow: 'Trial 08 · Timing', accent: 'radiance',
        title: 'Finding the sowing window',
        body: 'Sowing date does not change the crop, only where the season sits against the rain and the heat. In a bimodal tropical climate that is often the largest lever a farmer actually controls.',
        look: 'Open the sowing-date response curve. The peaks line up with the rainy seasons; the trough is a crop flowering into the dry spell.',
        species: 'drybean', cultivar: 'porrillo', climate: 'tropical', soil: 'sandy_loam',
        set: { rainScale: 0.8 }, sweep: 'sowingDay'
    }
];

/* ========================================================================== */

/* --------------------------------------------------------------------------
   Sticky readout offset. The readout parks directly under whatever chrome is
   actually sticky above it. On the narrow breakpoint the ribbon turns static
   and the header wraps to two rows, so the offset is measured rather than
   assumed from the CSS variables.
   -------------------------------------------------------------------------- */

function syncStickyTop() {
    let top = 0;
    for (const el of [document.querySelector('.app-header'), $('ribbon')]) {
        if (el && getComputedStyle(el).position === 'sticky') top += el.offsetHeight;
    }
    document.documentElement.style.setProperty('--stick-top', top + 'px');
    const ro = $('readout');
    if (ro) ro.classList.toggle('is-stuck', ro.getBoundingClientRect().top <= top + 1);
}

document.addEventListener('DOMContentLoaded', () => {
    I18N.boot();
    App.init();

    syncStickyTop();
    addEventListener('scroll', syncStickyTop, { passive: true });
    addEventListener('resize', syncStickyTop);

    // Every label the app draws itself has to be rebuilt on a language change;
    // the model state and the current day are untouched, so the view does not
    // jump when the user switches.
    I18N.onChange(() => {
        const day = App.day;
        App.buildSpeciesSelect();
        App.buildSoilSelect();
        App.buildCultivarSelect();
        App.buildRail();
        App.buildAnalyseSelects();
        App.buildTrials();
        $('sel-sweep').value = App._sweepId || 'sowingDay';
        $('sel-surf-x').value = App._surfX || 'co2';
        $('sel-surf-y').value = App._surfY || 'rainScale';
        $('irrigation-label').innerHTML = irrigationLabel(App.state.isIrrigated);
        App.run(false);
        App.setDay(day);
        if (App.canopy) { App.canopy.mode = null; App.updateCanopy(true); }
        if ($('view-analyze').classList.contains('active')) App.refreshAnalyse();
    });
});
window.App = App;

})();

/**
 * Canopy & light schematic — the stand-in for the 3D plant.
 *
 * The 3D viewer draws common bean: trifoliate leaflets, branching by CIAT
 * growth habit, pods. That geometry is wrong for a grass and meaningless for a
 * tuber, so any crop whose architecture entry does not set `plant3d: true` gets
 * this instead.
 *
 * It is deliberately a schematic, not a plant. Every quantity on it is read
 * straight off the model:
 *
 *   - rays intercepted / total   = f_Solar          (Eq. 6)
 *   - canopy band depth          = LAI, itself back-calculated from f_Solar
 *   - canopy tint                = min[f(Heat), f(Water)], the limiting factor
 *   - ground-cover bar           = f_Solar as plan-view cover
 *
 * The ray count mirrors the 3D "light rays" mode, so the two views are making
 * the same statement about interception in the same visual language.
 *
 * No external dependencies: plain SVG, built once and then only mutated.
 */

/* Mirrors the palette in css/style.css. */
const CANOPY_PALETTE = {
    sun: '#D9A518',
    ray: '#C9A94A',
    rayLost: '#B9BCA8',
    canopy: '#46702A',
    canopyDeep: '#2F5019',
    canopyStressed: '#8A7B33',
    soil: '#B0742A',
    soilDeep: '#7A4A28',
    ink3: '#6E6455',
    ink4: '#948B7A'
};

const RAY_COUNT = 24;

class CanopyDiagram {
    /**
     * @param {HTMLElement} container the viewport element
     */
    constructor(container) {
        this.container = container;
        this.host = document.createElement('div');
        this.host.className = 'vp-canopy';
        this.host.style.display = 'none';
        container.appendChild(this.host);
        this.panels = [];
        this.mode = null;
    }

    /** One panel per column: 'single' draws one, 'compare' draws two. */
    setMode(mode, labels) {
        if (this.mode === mode) return;
        this.mode = mode;
        this.host.innerHTML = '';
        this.panels = [];

        const n = mode === 'compare' ? 2 : 1;
        const wrap = document.createElement('div');
        wrap.className = 'vp-canopy-row' + (n === 2 ? ' is-pair' : '');
        for (let i = 0; i < n; i++) {
            this.panels.push(this._buildPanel(wrap, n === 2 ? (labels ? labels[i] : '') : ''));
        }
        this.host.appendChild(wrap);
    }

    _buildPanel(parent, caption) {
        const NS = 'http://www.w3.org/2000/svg';
        const gradId = 'cnpy-grad-' + (CanopyDiagram._seq = (CanopyDiagram._seq || 0) + 1);
        const mk = (tag, attrs) => {
            const n = document.createElementNS(NS, tag);
            for (const k in attrs) n.setAttribute(k, attrs[k]);
            return n;
        };

        const cell = document.createElement('div');
        cell.className = 'vp-canopy-cell';

        // 0..100 wide, 0..100 tall. Sky 0-46, canopy band centred on ~56,
        // soil surface at 78.
        const svg = mk('svg', {
            viewBox: '0 0 100 100', preserveAspectRatio: 'xMidYMid meet',
            class: 'vp-canopy-svg', role: 'img'
        });

        const P = CANOPY_PALETTE;
        const defs = mk('defs', {});
        // A soft vertical wash so the canopy band reads as depth, not a slab.
        const grad = mk('linearGradient', { id: gradId, x1: '0', y1: '0', x2: '0', y2: '1' });
        const gs1 = mk('stop', { offset: '0%',   'stop-color': P.canopy });
        const gs2 = mk('stop', { offset: '100%', 'stop-color': P.canopyDeep });
        grad.appendChild(gs1); grad.appendChild(gs2);
        defs.appendChild(grad);
        svg.appendChild(defs);

        // --- sun -----------------------------------------------------------
        const sun = mk('circle', { cx: 50, cy: 8, r: 4.2, fill: P.sun, opacity: 0.9 });
        svg.appendChild(sun);
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            svg.appendChild(mk('line', {
                x1: 50 + Math.cos(a) * 5.6, y1: 8 + Math.sin(a) * 5.6,
                x2: 50 + Math.cos(a) * 7.4, y2: 8 + Math.sin(a) * 7.4,
                stroke: P.sun, 'stroke-width': 0.7, 'stroke-linecap': 'round', opacity: 0.75
            }));
        }

        // --- rays ------------------------------------------------------------
        const rays = [];
        const rayGroup = mk('g', {});
        for (let i = 0; i < RAY_COUNT; i++) {
            const x = 8 + (i + 0.5) * (84 / RAY_COUNT);
            const line = mk('line', {
                x1: x, y1: 18, x2: x, y2: 50,
                stroke: P.ray, 'stroke-width': 0.75, 'stroke-linecap': 'round'
            });
            const tip = mk('circle', { cx: x, cy: 50, r: 0.9, fill: P.canopyDeep });
            rayGroup.appendChild(line);
            rayGroup.appendChild(tip);
            rays.push({ line, tip, x });
        }
        svg.appendChild(rayGroup);

        // --- canopy band -----------------------------------------------------
        const band = mk('rect', {
            x: 6, y: 48, width: 88, height: 16, rx: 5,
            fill: 'url(#' + gradId + ')', opacity: 0.9
        });
        svg.appendChild(band);

        // --- soil -------------------------------------------------------------
        svg.appendChild(mk('rect', { x: 6, y: 78, width: 88, height: 1.1, fill: P.soilDeep, opacity: 0.55 }));
        svg.appendChild(mk('rect', { x: 6, y: 79.1, width: 88, height: 7, rx: 1, fill: P.soil, opacity: 0.22 }));

        const soilLabel = mk('text', {
            x: 94, y: 75.4, 'text-anchor': 'end', class: 'vp-canopy-num', fill: P.ink3
        });
        svg.appendChild(soilLabel);

        const bandLabel = mk('text', {
            x: 94, y: 45.2, 'text-anchor': 'end', class: 'vp-canopy-num', fill: P.canopyDeep
        });
        svg.appendChild(bandLabel);

        // --- ground-cover bar (plan view) --------------------------------------
        svg.appendChild(mk('rect', {
            x: 6, y: 90, width: 88, height: 5, rx: 1.4,
            fill: 'none', stroke: P.ink4, 'stroke-width': 0.5, opacity: 0.7
        }));
        const coverFill = mk('rect', { x: 6, y: 90, width: 44, height: 5, rx: 1.4, fill: P.canopy, opacity: 0.85 });
        svg.appendChild(coverFill);
        const coverLabel = mk('text', { x: 6, y: 88.2, class: 'vp-canopy-tag', fill: P.ink4 });
        svg.appendChild(coverLabel);

        cell.appendChild(svg);

        const cap = document.createElement('div');
        cap.className = 'vp-canopy-cap';
        cap.textContent = caption || '';
        if (!caption) cap.style.display = 'none';
        cell.appendChild(cap);

        parent.appendChild(cell);
        return { svg, rays, band, gradFill: 'url(#' + gradId + ')',
                 soilLabel, bandLabel, coverFill, coverLabel, cap };
    }

    /**
     * @param {Array}  records one day record per panel
     * @param {Object} info    { coverTag, bandTag, soilTag } - the caption is
     *                         owned by setMeta(), not by this method.
     */
    update(records, info) {
        const P = CANOPY_PALETTE;
        this.panels.forEach((panel, i) => {
            const d = records[Math.min(i, records.length - 1)];
            if (!d) return;

            const f = Math.max(0, Math.min(1, d.f_solar));
            const stress = Math.max(0, Math.min(1, Math.min(d.f_heat, d.f_water)));

            // Rays: the first round(f * N) are intercepted, the rest pass through.
            // Spreading the intercepted ones evenly rather than filling from the
            // left keeps the canopy reading as porous instead of half-empty.
            const nHit = Math.round(f * RAY_COUNT);
            const stride = nHit > 0 ? RAY_COUNT / nHit : Infinity;
            let taken = 0;
            const hitFlags = new Array(RAY_COUNT).fill(false);
            for (let k = 0; k < RAY_COUNT && taken < nHit; k++) {
                if (Math.floor(taken * stride) <= k) { hitFlags[k] = true; taken++; }
            }

            // Canopy depth follows LAI, which is where the model's leaf area
            // actually lives. Clamped so a bare or a rank canopy both stay legible.
            const depth = 5 + Math.min(1, d.LAI / 5) * 17;
            const top = 64 - depth;
            panel.band.setAttribute('y', top);
            panel.band.setAttribute('height', depth);
            panel.band.setAttribute('opacity', (0.28 + 0.62 * f).toFixed(3));

            // Heat or drought tints the canopy toward straw.
            panel.band.setAttribute('fill', stress > 0.92 ? panel.gradFill : P.canopyStressed);

            panel.rays.forEach((r, k) => {
                const hit = hitFlags[k];
                r.line.setAttribute('y2', hit ? top : 78);
                r.line.setAttribute('stroke', hit ? P.ray : P.rayLost);
                r.line.setAttribute('opacity', hit ? 0.95 : 0.45);
                r.line.setAttribute('stroke-dasharray', hit ? 'none' : '1.6 1.4');
                r.tip.setAttribute('cy', hit ? top : 78);
                r.tip.setAttribute('r', hit ? 1.0 : 0.7);
                r.tip.setAttribute('fill', hit ? P.canopyDeep : P.soilDeep);
                r.tip.setAttribute('opacity', hit ? 1 : 0.5);
            });

            const pct = Math.round(f * 100);
            panel.bandLabel.textContent = (info.bandTag || 'intercepted') + ' ' + pct + '%';
            panel.soilLabel.textContent = (100 - pct) + '% ' + (info.soilTag || 'to soil');
            panel.coverFill.setAttribute('width', (88 * f).toFixed(2));
            panel.coverLabel.textContent = info.coverTag || 'ground cover';
        });
    }

    /** Caption + provenance line under the diagram. */
    setMeta(html) {
        let meta = this.host.querySelector('.vp-canopy-meta');
        if (!meta) {
            meta = document.createElement('div');
            meta.className = 'vp-canopy-meta';
            this.host.appendChild(meta);
        }
        meta.innerHTML = html;
    }

    setCaptions(labels) {
        this.panels.forEach((p, i) => {
            const v = labels && labels[i];
            p.cap.textContent = v || '';
            p.cap.style.display = v ? '' : 'none';
        });
    }

    setVisible(on) {
        this.host.style.display = on ? '' : 'none';
    }
}

window.CanopyDiagram = CanopyDiagram;

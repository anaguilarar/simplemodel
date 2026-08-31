/**
 * 3D plant viewer — turns SIMPLE model state into plant geometry.
 *
 * WHAT THIS IS: a visualisation layer. SIMPLE carries no organ-level state.
 * It never computes a leaf, a node or a pod. Everything drawn here is derived
 * from four model outputs plus published allometry:
 *
 *   TT / Tsum   -> phenological stage, node number, stem height
 *   f_solar     -> leaf area, by inverting Beer-Lambert:  LAI = -ln(1-f)/k
 *   f_water     -> leaflet droop (turgor) and leaf yellowing
 *   f_heat      -> scorch, and via I50B the pace of leaf shedding
 *   fillProgress-> pod number, pod swelling and dry-down colour
 *
 * The plant is therefore a faithful picture of the model's state, not an
 * independent simulation of morphology. The interface says so on the panel.
 *
 * Organs are pooled at construction and only their transforms, colours and
 * visibility change per day, so scrubbing the timeline stays smooth.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ==========================================================================
   Palette — shared with the CSS, kept in sync by hand
   ========================================================================== */

const C = {
    leafYoung:   new THREE.Color(0x86A94F),
    leafMature:  new THREE.Color(0x3D6B23),
    leafStress:  new THREE.Color(0xC2A63C),
    leafSenesce: new THREE.Color(0x8A6733),
    leafScorch:  new THREE.Color(0x9A4A24),
    stem:        new THREE.Color(0x4F7A2C),
    stemOld:     new THREE.Color(0x7C6A3E),
    podGreen:    new THREE.Color(0x6F9B3E),
    podMature:   new THREE.Color(0xC7AE6E),
    flower:      new THREE.Color(0xF3EADA),
    flowerLilac: new THREE.Color(0xC9B6D4),
    soil:        new THREE.Color(0x6B4E2F),
    soilDry:     new THREE.Color(0x9C7B52),
    soilWet:     new THREE.Color(0x46341F)
};

/* ==========================================================================
   Geometry helpers
   ========================================================================== */

/** Ovate, acuminate bean leaflet lying in the XY plane, tip toward +Y. */
function makeLeafletGeometry(len, width, segments = 14) {
    const s = new THREE.Shape();
    const W = width / 2;
    s.moveTo(0, 0);
    s.bezierCurveTo(W * 1.10, len * 0.14, W * 1.00, len * 0.74, 0, len);
    s.bezierCurveTo(-W * 1.00, len * 0.74, -W * 1.10, len * 0.14, 0, 0);

    const g = new THREE.ShapeGeometry(s, segments);

    // Arch the blade so it catches light instead of reading as a flat card.
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        const along = Math.min(1, Math.max(0, y / len));
        const cup = -Math.pow(x / Math.max(1e-6, W), 2) * len * 0.10;
        const droopTip = -Math.pow(along, 2) * len * 0.16;
        pos.setZ(i, cup + droopTip);
    }
    g.computeVertexNormals();
    return g;
}

/** Bean pod: a capsule with seed bulges along its length. */
function makePodGeometry(len, radius) {
    const g = new THREE.CapsuleGeometry(radius, len - radius * 2, 4, 10);
    const pos = g.attributes.position;
    const seeds = 5;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const t = (y + len / 2) / len;
        const bulge = 1 + 0.16 * Math.abs(Math.sin(t * Math.PI * seeds));
        const bend = Math.pow(t - 0.5, 2) * len * 0.10;
        pos.setX(i, x * bulge + bend);
        pos.setZ(i, z * bulge);
    }
    g.computeVertexNormals();
    return g;
}

/** A single papilionaceous flower: banner petal plus keel. */
function makeFlowerGroup(scale, color) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });

    const banner = new THREE.Mesh(new THREE.CircleGeometry(scale, 8), mat);
    banner.scale.set(1, 0.8, 1);
    g.add(banner);

    const keel = new THREE.Mesh(new THREE.SphereGeometry(scale * 0.45, 6, 5), mat);
    keel.position.set(0, -scale * 0.5, scale * 0.25);
    keel.scale.set(1, 0.7, 1.4);
    g.add(keel);

    return g;
}

function lerpColor(out, a, b, t) {
    return out.copy(a).lerp(b, Math.min(1, Math.max(0, t)));
}

/* ==========================================================================
   One plant
   ========================================================================== */
/* ==========================================================================
   One plant
   --------------------------------------------------------------------------
   A plant is a set of AXES. Axis 0 is the main stem; the rest are branches
   that spring from low nodes of the main stem. Branching is what separates a
   Type I bush from a Type IV climber, so it is modelled explicitly rather
   than faked with a lean.

   Each axis is a THREE.Group placed at its origin node and tilted; its own
   nodes then stack along the group's local +Y. That keeps the maths local
   and avoids any world-space bookkeeping.
   ========================================================================== */

class Plant {
    /**
     * @param {Object} arch  entry from PLANT_ARCHITECTURE
     * @param {Object} habit entry from BEAN_HABITS (may be null)
     * @param {Object} opts  { detail: 'full' | 'simple' }
     */
    constructor(arch, habit, opts = {}) {
        this.arch = arch;
        this.habit = habit || {
            maxNodes: arch.maxNodes, climbing: false, branchSpread: 0.5, apexFlowers: false
        };
        this.detail = opts.detail || 'full';
        this.group = new THREE.Group();

        this.mainNodes = Math.min(this.habit.maxNodes, arch.maxNodes);
        this.isGrass = arch.form === 'grass';
        this._tmpColor = new THREE.Color();

        this._planAxes();
        this._buildPool();
    }

    /** Decide how many branches there are and where they come from. */
    _planAxes() {
        const h = this.habit;
        this.axisPlan = [{ nodes: this.mainNodes, originAxis: -1, originNode: 0, yaw: 0, tilt: 0, scale: 1 }];

        if (this.isGrass || h.climbing) return;   // tillers/climbers stay single-axis here

        // Bush and prostrate types branch from the lowest nodes. The more
        // prostrate the habit, the more branches and the flatter their tilt.
        const nBranch = h.branchSpread > 0.8 ? 5 : (h.branchSpread > 0.5 ? 4 : 3);
        const tilt = 0.38 + h.branchSpread * 0.42;      // radians from vertical

        for (let b = 0; b < nBranch; b++) {
            this.axisPlan.push({
                // Branches carry most of a bush bean's leaf; they are not stubs.
                nodes: Math.max(4, Math.round(this.mainNodes * (0.78 - b * 0.07))),
                originAxis: 0,
                // spread the insertions up the lower half of the stem
                originNode: 1 + Math.floor(b * (this.mainNodes * 0.34) / nBranch),
                yaw: (b / nBranch) * Math.PI * 2 + 0.6,
                tilt: tilt * (0.88 + 0.24 * ((b % 2) ? 1 : 0)),
                scale: 0.9 - b * 0.05
            });
        }
    }

    _buildPool() {
        const a = this.arch;
        const full = this.detail === 'full';

        // Shared geometries — allocated once for the whole plant
        this.leafletGeo = makeLeafletGeometry(a.leafletLen, a.leafletWidth, full ? 12 : 4);
        this.stemGeo = new THREE.CylinderGeometry(1, 1, 1, full ? 7 : 4);
        this.podGeo = full ? makePodGeometry(a.podLen, a.podWidth / 2) : null;

        const leafletsPerNode = this.isGrass ? 1 : 3;
        // A cultivar has one flower colour, not a mix. Climbing Andean types
        // tend to lilac; Mesoamerican bush types to cream.
        this.flowerColor = this.habit.climbing ? C.flowerLilac.clone() : C.flower.clone();
        this.axes = [];

        this.axisPlan.forEach((plan, ai) => {
            const axis = { plan, group: new THREE.Group(), nodes: [] };
            // Only the main axis carries pods and flowers at full detail on
            // branches too, but branches get fewer of each.
            const podsPerNode = full ? Math.ceil(a.podsPerPlantMax / (this.mainNodes * 1.4)) + 1 : 0;

            for (let i = 0; i < plan.nodes; i++) {
                const node = { index: i, group: new THREE.Group(), leaflets: [], flowers: [], pods: [] };

                node.stem = new THREE.Mesh(this.stemGeo,
                    new THREE.MeshLambertMaterial({ color: C.stem.clone() }));
                node.group.add(node.stem);

                node.leafGroup = new THREE.Group();
                for (let k = 0; k < leafletsPerNode; k++) {
                    const m = new THREE.Mesh(this.leafletGeo, new THREE.MeshLambertMaterial({
                        color: C.leafMature.clone(), side: THREE.DoubleSide
                    }));
                    node.leaflets.push(m);
                    node.leafGroup.add(m);
                }
                node.group.add(node.leafGroup);

                if (full) {
                    for (let f = 0; f < 2; f++) {
                        const fl = makeFlowerGroup(a.leafletLen * 0.15, this.flowerColor);
                        fl.visible = false;
                        node.flowers.push(fl);
                        node.group.add(fl);
                    }
                    for (let p = 0; p < podsPerNode; p++) {
                        const pod = new THREE.Mesh(this.podGeo,
                            new THREE.MeshLambertMaterial({ color: C.podGreen.clone() }));
                        pod.visible = false;
                        node.pods.push(pod);
                        node.group.add(pod);
                    }
                }

                axis.group.add(node.group);
                axis.nodes.push(node);
            }

            // 'YXZ' applies the tilt about local X first and the yaw about Y
            // second. With the default 'XYZ' the yaw is applied first and every
            // branch ends up leaning the same way instead of radiating.
            axis.group.rotation.order = 'YXZ';
            axis.group.rotation.set(plan.tilt, plan.yaw, 0);
            this.group.add(axis.group);
            this.axes.push(axis);
        });

        if (this.habit.climbing && full) {
            const h = this.mainNodes * this.arch.internodeLen * 1.3;
            this.stake = new THREE.Mesh(
                new THREE.CylinderGeometry(0.005, 0.007, h, 6),
                new THREE.MeshLambertMaterial({ color: 0x9A8358 })
            );
            this.stake.position.y = h / 2;
            this.group.add(this.stake);
        }
    }

    /**
     * Drive the whole plant from one day of model output.
     * @param {Object} d   daily record from the engine
     * @param {Object} ctx { plantsPerM2, peakFsolar }
     */
    update(d, ctx) {
        const a = this.arch;
        const tt = d.TT;
        const ttFrac = d.ttFrac;
        const climbing = this.habit.climbing;
        // Thermal time between successive nodes. The caller derives it from
        // Tsum so that the last node appears around flowering, whatever the
        // cultivar's cycle length; arch.phyllochron is only a fallback.
        const phyl = Math.max(8, ctx.phyllochron || a.phyllochron);

        // --- stress expression, shared by every organ --------------------
        const droop = (1 - d.f_water) * 0.55;
        const yellowing = 1 - d.f_water;
        const scorch = 1 - d.f_heat;
        const declineFrac = ctx.peakFsolar > 0 ? Math.max(0, 1 - d.f_solar / ctx.peakFsolar) : 0;
        const shed = d.senescing ? declineFrac : 0;

        // --- how much leaf there is, from the model's own f_solar ---------
        // Count the leaflets that will actually be showing, so the target
        // area is spread over the right number of blades.
        let liveLeaflets = 0;
        for (const axis of this.axes) {
            const n = Math.min(axis.plan.nodes,
                Math.max(0, Math.floor((tt - axis.plan.originNode * phyl) / phyl) + 1));
            liveLeaflets += Math.max(0, n) * (this.isGrass ? 1 : 3);
        }
        liveLeaflets = Math.max(1, liveLeaflets);

        const areaPerPlant = d.LAI / Math.max(1, ctx.plantsPerM2);      // m2
        const nominalArea = 0.62 * a.leafletLen * a.leafletWidth;       // m2 at scale 1
        let leafScale = Math.sqrt(areaPerPlant / (liveLeaflets * nominalArea));
        leafScale = Math.min(1.8, Math.max(0.06, leafScale));

        // --- walk the axes ------------------------------------------------
        let maxY = 0, maxR = 0;
        this._axisTipY = [];

        for (let ai = 0; ai < this.axes.length; ai++) {
            const axis = this.axes[ai];
            const plan = axis.plan;

            // A branch only starts once its origin node exists.
            const ttHere = tt - plan.originNode * phyl * (ai === 0 ? 0 : 1.6);
            const nodesShown = clamp3(Math.floor(ttHere / phyl) + 1, 0, plan.nodes);
            axis.group.visible = nodesShown > 0;

            // Seat the branch on its parent
            if (plan.originAxis >= 0) {
                const parentY = this._axisTipY[plan.originAxis] || [];
                axis.group.position.set(0, parentY[plan.originNode] || 0, 0);
            }

            let y = 0;
            const tipY = [0];

            for (let i = 0; i < plan.nodes; i++) {
                const node = axis.nodes[i];
                const active = i < nodesShown;
                node.group.visible = active;
                if (!active) { tipY.push(y); continue; }

                const nodeAge = clamp3((ttHere - i * phyl) / phyl, 0, 1);

                // --- internode -------------------------------------------
                const len = a.internodeLen * nodeAge * plan.scale * (climbing ? 1.15 : 1.0);
                const radius = a.stemBaseRadius * plan.scale
                    * (1 - i / (plan.nodes * 1.7))
                    * (0.55 + 0.45 * Math.min(1, d.cumBiomassTha / 4));

                node.stem.scale.set(Math.max(0.0008, radius), Math.max(0.0008, len), Math.max(0.0008, radius));
                node.stem.position.set(0, len / 2, 0);

                // gentle spiral so the axis is not a perfect ruler
                const twist = i * (climbing ? 0.9 : 0.62) + plan.yaw;
                const wobble = climbing ? 0.010 : 0.006;
                node.group.position.set(Math.cos(twist) * wobble, y, Math.sin(twist) * wobble);
                y += len;
                tipY.push(y);

                // --- leaves ----------------------------------------------
                const shedThreshold = (i + 0.5) / plan.nodes;
                const isShed = shed > (1 - shedThreshold) + 0.05;
                node.leafGroup.visible = !isShed && nodeAge > 0.12;
                node.leafGroup.position.set(0, len, 0);
                node.leafGroup.rotation.y = twist + Math.PI / 5;

                if (node.leafGroup.visible) {
                    for (let k = 0; k < node.leaflets.length; k++) {
                        const m = node.leaflets[k];
                        const s = leafScale * (0.7 + 0.3 * nodeAge) * (k === 0 ? 1.0 : 0.86);
                        m.scale.setScalar(s);

                        if (this.isGrass) {
                            m.rotation.set(-Math.PI / 2 + 0.5 - droop * 0.5, 0, 0);
                            m.position.set(0, 0, 0);
                        } else {
                            // one terminal leaflet forward, two laterals splayed,
                            // all held out on a petiole that scales with the blade
                            const yaw = k === 0 ? 0 : (k === 1 ? 1.15 : -1.15);
                            const petiole = a.leafletLen * 0.9 * s;
                            // Branch leaves sit flatter; the axis tilt already
                            // carries them outward.
                            const pitch = -Math.PI / 2 + 0.42 - droop - plan.tilt * 0.30;
                            m.rotation.set(pitch, yaw, 0);
                            m.position.set(Math.sin(yaw) * petiole * 0.75, 0, Math.cos(yaw) * petiole);
                        }

                        // --- colour -------------------------------------
                        const col = this._tmpColor;
                        col.copy(C.leafYoung).lerp(C.leafMature, nodeAge);
                        const senesceHere = Math.max(yellowing * 0.7, shed > 0 ? shedThreshold * shed * 1.4 : 0);
                        col.lerp(C.leafStress, Math.min(0.85, senesceHere));
                        if (ttFrac > 0.85) col.lerp(C.leafSenesce, ((ttFrac - 0.85) / 0.15) * 0.8);
                        if (scorch > 0.05) col.lerp(C.leafScorch, Math.min(0.7, scorch));
                        m.material.color.copy(col);

                        const reach = Math.abs(m.position.z) + a.leafletLen * s;
                        if (reach > maxR) maxR = reach;
                    }
                }

                // --- stem colour ------------------------------------------
                this._tmpColor.copy(C.stem).lerp(C.stemOld,
                    Math.max(ttFrac > 0.8 ? (ttFrac - 0.8) / 0.2 : 0, scorch * 0.5));
                node.stem.material.color.copy(this._tmpColor);

                if (this.detail !== 'full') continue;

                // --- flowers ----------------------------------------------
                // The flowering window is whatever the crop's own stage scale
                // says it is, so the plant and the ribbon never disagree.
                const f0 = ctx.flowerFrom, f1 = ctx.flowerTo;
                const flowerIntensity = (ttFrac > f0 && ttFrac < f1)
                    ? Math.sin(((ttFrac - f0) / (f1 - f0)) * Math.PI) : 0;
                // Beans flower on racemes in the upper part of each axis, and
                // determinate types finish at the apex.
                const bearing = this.habit.apexFlowers
                    ? (i >= nodesShown - 3)
                    : (i > plan.nodes * 0.45);
                // Racemes are borne on alternate nodes of the main stem and the
                // strongest branches, not on every node of every branch.
                const raceme = bearing && ai < 3 && (i % 2 === 0);

                for (let f = 0; f < node.flowers.length; f++) {
                    const fl = node.flowers[f];
                    // the second flower on a node only opens at peak anthesis
                    const show = raceme && !isShed &&
                        flowerIntensity > (f === 0 ? 0.3 : 0.8);
                    fl.visible = show;
                    if (!show) continue;
                    const ang = twist + (f === 0 ? 0.9 : -0.9);
                    const r = a.leafletLen * 0.26;
                    fl.position.set(Math.cos(ang) * r, len * 0.8, Math.sin(ang) * r);
                    fl.rotation.order = 'YXZ';
                    fl.rotation.set(0.6, ang, 0);
                    fl.scale.setScalar(0.5 + flowerIntensity * 0.9);
                }

                // --- pods --------------------------------------------------
                const podFrac = Math.min(1, d.fillProgress * 1.35);
                const podsHere = Math.round(node.pods.length * podFrac);
                for (let p = 0; p < node.pods.length; p++) {
                    const pod = node.pods[p];
                    const show = d.fillProgress > 0.04 && p < podsHere && raceme;
                    pod.visible = show;
                    if (!show) continue;

                    const swell = 0.34 + 0.66 * d.fillProgress;
                    pod.scale.set(swell, 0.4 + 0.6 * Math.min(1, d.fillProgress * 1.6), swell);
                    const ang = twist + p * 1.9 + 0.5;
                    const r = a.leafletLen * 0.20;
                    pod.position.set(Math.cos(ang) * r, len * 0.35, Math.sin(ang) * r);
                    // Filled pods hang: past horizontal, angled down and out,
                    // and heavier as they fill.
                    pod.rotation.order = 'YXZ';
                    pod.rotation.set(1.15 + d.fillProgress * 0.55 + p * 0.12, ang, 0.15);

                    const dry = ttFrac > 0.82 ? (ttFrac - 0.82) / 0.18 : 0;
                    this._tmpColor.copy(C.podGreen).lerp(C.podMature, Math.min(1, dry));
                    pod.material.color.copy(this._tmpColor);
                }
            }

            this._axisTipY[ai] = tipY;

            // Track the plant's extent for camera framing.
            const tilt = plan.tilt;
            const reachY = Math.cos(tilt) * y + (plan.originAxis >= 0 ? axis.group.position.y : 0);
            const reachR = Math.sin(tilt) * y;
            if (reachY > maxY) maxY = reachY;
            if (reachR > maxR) maxR = reachR;
        }

        this.height = Math.max(0.05, maxY);
        this.radius = Math.max(0.05, maxR);
        if (this.stake) this.stake.visible = climbing && this.axes[0].nodes[2].group.visible;
    }

    /** Every visible leaflet mesh, for ray interception tests. */
    leafMeshes() {
        const out = [];
        for (const axis of this.axes) {
            if (!axis.group.visible) continue;
            for (const n of axis.nodes) {
                if (!n.group.visible || !n.leafGroup.visible) continue;
                for (const m of n.leaflets) out.push(m);
            }
        }
        return out;
    }

    dispose() {
        this.leafletGeo.dispose();
        this.stemGeo.dispose();
        if (this.podGeo) this.podGeo.dispose();
        this.group.traverse(o => { if (o.material) o.material.dispose(); });
    }
}

function clamp3(v, a, b) { return Math.min(b, Math.max(a, v)); }

/* ==========================================================================
   Scene
   ========================================================================== */

class PlantScene {
    constructor(container) {
        this.container = container;
        this.mode = 'single';
        this.showRays = false;
        this.showRoots = false;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xDCDFD0);
        this.scene.fog = new THREE.Fog(0xDCDFD0, 0.55, 2.0);

        this.camera = new THREE.PerspectiveCamera(42, 1, 0.01, 40);
        this.camera.position.set(0.62, 0.46, 0.72);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 0.18;
        this.controls.maxDistance = 4.0;
        this.controls.maxPolarAngle = Math.PI * 0.52;
        this.controls.target.set(0, 0.16, 0);

        this._buildLights();
        this._buildGround();

        this.plantRoot = new THREE.Group();
        this.scene.add(this.plantRoot);

        this.rayGroup = new THREE.Group();
        this.scene.add(this.rayGroup);
        this.raycaster = new THREE.Raycaster();

        this.plants = [];
        this.labelHost = document.createElement('div');
        this.labelHost.className = 'vp-labels';
        container.appendChild(this.labelHost);
        this._resizeObserver = new ResizeObserver(() => this._resize());
        this._resizeObserver.observe(container);
        this._resize();

        this._running = true;
        this._loop = this._loop.bind(this);
        this.renderer.setAnimationLoop(this._loop);
    }

    _buildLights() {
        this.scene.add(new THREE.HemisphereLight(0xFFF6DF, 0x6B5A3E, 1.5));
        this.sun = new THREE.DirectionalLight(0xFFF0CC, 2.1);
        this.sun.position.set(0.7, 1.5, 0.5);
        this.scene.add(this.sun);
        const fill = new THREE.DirectionalLight(0xCFE0FF, 0.45);
        fill.position.set(-0.8, 0.5, -0.7);
        this.scene.add(fill);
    }

    _buildGround() {
        this.ground = new THREE.Mesh(
            new THREE.PlaneGeometry(9, 9, 1, 1),
            new THREE.MeshLambertMaterial({ color: C.soil.clone() })
        );
        this.ground.rotation.x = -Math.PI / 2;
        this.scene.add(this.ground);

        // Faint row lines, so plant density reads spatially.
        const g = new THREE.BufferGeometry();
        const pts = [];
        for (let i = -14; i <= 14; i++) {
            pts.push(-2.0, 0.001, i * 0.075, 2.0, 0.001, i * 0.075);
        }
        g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        this.rows = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x5A4A33 }));
        this.scene.add(this.rows);
    }

    _resize() {
        const w = this.container.clientWidth || 1;
        const h = this.container.clientHeight || 1;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    _loop() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this._positionLabels();
    }

    /**
     * Project each labelled plant to screen space so its caption follows it
     * as the camera orbits, instead of sitting at a fixed corner.
     */
    _positionLabels() {
        if (!this._labelEls || !this._labelEls.length) return;
        const w = this.container.clientWidth, h = this.container.clientHeight;
        for (const item of this._labelEls) {
            const p = item.plant;
            this._v.set(0, (p.height || 0.2) * 1.06, 0);
            p.group.localToWorld(this._v);
            this._v.project(this.camera);
            const x = (this._v.x * 0.5 + 0.5) * w;
            const y = (-this._v.y * 0.5 + 0.5) * h;
            const onScreen = this._v.z < 1;
            item.el.style.transform = 'translate(-50%,-100%) translate(' + x + 'px,' + y + 'px)';
            item.el.style.opacity = onScreen ? '1' : '0';
        }
    }

    /* ---- configuration ------------------------------------------------- */

    /**
     * Rebuild the plant pool. Call when species, cultivar or view mode change.
     * @param {Array} specs [{arch, habit, label, offsetX}]
     */
    setPlants(specs, mode = 'single') {
        this.mode = mode;
        for (const p of this.plants) { this.plantRoot.remove(p.group); p.dispose(); }
        this.plants = [];

        const detail = mode === 'field' ? 'simple' : 'full';

        for (const spec of specs) {
            const p = new Plant(spec.arch, spec.habit, { detail: spec.detail || detail });
            p.group.position.set(spec.offsetX || 0, 0, spec.offsetZ || 0);
            p.label = spec.label;
            this.plantRoot.add(p.group);
            this.plants.push(p);
        }

        this.labelHost.innerHTML = '';
        this._labelEls = [];
        this._v = this._v || new THREE.Vector3();
        for (const p of this.plants) {
            if (!p.label) continue;
            const d = document.createElement('div');
            d.className = 'vp-label';
            d.textContent = p.label;
            this.labelHost.appendChild(d);
            this._labelEls.push({ el: d, plant: p });
        }
        return this.plants;
    }

    /** Update every plant from its own day record. */
    setDay(records, ctx) {
        // Half-width of the ray sample square: the ground area one plant owns.
        if (ctx && ctx.plantsPerM2) {
            this.sampleExtent = Math.sqrt(1 / ctx.plantsPerM2) / 2;
        }
        for (let i = 0; i < this.plants.length; i++) {
            const rec = Array.isArray(records) ? (records[i] || records[0]) : records;
            if (rec) this.plants[i].update(rec, ctx);
        }

        // Soil colour tracks stored water, so the ground reads as wet or parched.
        const rec0 = Array.isArray(records) ? records[0] : records;
        if (rec0 && ctx.awc && ctx.rzd) {
            const fill = Math.min(1, rec0.soilWaterMm / (ctx.rzd * ctx.awc));
            this.ground.material.color.copy(C.soilDry).lerp(C.soil, fill);
        }

        if (this.showRays) this._updateRays();
    }

    setSunAngle(fracOfSeason) {
        const a = 0.7 + Math.sin(fracOfSeason * Math.PI) * 0.5;
        this.sun.position.set(Math.cos(a) * 1.4, 1.5, Math.sin(a) * 0.8);
    }

    /* ---- light interception ray view ------------------------------------ */

    setRaysVisible(on) {
        this.showRays = on;
        this.rayGroup.visible = on;
        if (on) this._updateRays();
    }

    /**
     * Cast a grid of vertical rays and colour them by whether a leaf stopped
     * them. Returns the measured interception fraction, which should track
     * the model's f_solar — that agreement is the point of the view.
     */
    _updateRays() {
        while (this.rayGroup.children.length) {
            const c = this.rayGroup.children.pop();
            c.geometry.dispose();
        }

        // setDay() runs outside the render loop, so the leaf transforms set a
        // moment ago are not yet baked into world matrices. Without this the
        // rays test against last frame's geometry and almost all of them miss.
        this.scene.updateMatrixWorld(true);

        const targets = [];
        for (const p of this.plants) targets.push(...p.leafMeshes());
        if (!targets.length) return 0;

        const N = 15;
        const extent = this.sampleExtent || 0.12;
        const top = 1.2;
        const hitPts = [], missPts = [];
        let hits = 0, total = 0;

        this.raycaster.far = 2.0;
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                const x = -extent + (2 * extent) * (i / (N - 1));
                const z = -extent + (2 * extent) * (j / (N - 1));
                this.raycaster.set(new THREE.Vector3(x, top, z), new THREE.Vector3(0, -1, 0));
                const hit = this.raycaster.intersectObjects(targets, false)[0];
                total++;
                if (hit) {
                    hits++;
                    hitPts.push(x, top, z, x, hit.point.y, z);
                } else {
                    missPts.push(x, top, z, x, 0, z);
                }
            }
        }

        const add = (arr, color, opacity) => {
            if (!arr.length) return;
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
            this.rayGroup.add(new THREE.LineSegments(g,
                new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
        };
        add(hitPts, 0xE0A92A, 0.85);   // intercepted
        add(missPts, 0xB9BCA8, 0.30);  // reached the soil

        this.measuredInterception = total ? hits / total : 0;
        return this.measuredInterception;
    }

    /**
     * Frame the plant from its actual extent. Distance follows the larger of
     * height and spread so a wide bush and a tall climber both sit in frame.
     */
    frameCamera(height, radius, spread) {
        const h = Math.max(0.12, height || 0.3);
        const r = Math.max(0.10, radius || 0.15) + (spread || 0);
        const reach = Math.max(h, r * 1.6);
        const dist = reach * 2.1 + 0.16;

        this.controls.target.set(0, h * 0.45, 0);
        this.camera.position.set(dist * 0.52, h * 0.62 + reach * 0.78, dist * 0.72);
        this.controls.update();
    }

    /**
     * Show or hide the whole 3D view. Crops the renderer does not model get the
     * canopy schematic instead, and there is no reason to keep a WebGL render
     * loop running behind a hidden canvas, so the loop is parked too.
     */
    setVisible(on) {
        this.renderer.domElement.style.display = on ? '' : 'none';
        this.labelHost.style.display = on ? '' : 'none';
        if (on && !this._running) {
            this._running = true;
            this.renderer.setAnimationLoop(this._loop);
            this._resize();
        } else if (!on && this._running) {
            this._running = false;
            this.renderer.setAnimationLoop(null);
        }
    }

    dispose() {
        this._running = false;
        this.renderer.setAnimationLoop(null);
        this._resizeObserver.disconnect();
        for (const p of this.plants) p.dispose();
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
}

window.PlantScene = PlantScene;
window.dispatchEvent(new Event('plant3d-ready'));

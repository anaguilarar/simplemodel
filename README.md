# SIMPLE Crop Model — Field Station

An interactive lesson in process-based crop modelling. Turn a parameter, watch the biomass
respond — and watch a 3D bean plant grow through the season under exactly the same model state.

Built on the **SIMPLE** model (*Zhao et al., 2019, European Journal of Agronomy*) and the
**ARID** drought index (*Woli et al., 2012, Agronomy Journal*). No build step, no dependencies
to install: it is static HTML, CSS and JavaScript, and it deploys to GitHub Pages as-is.

**Bilingual.** The whole interface runs in English or Spanish — the `EN / ES` switch sits at the
right of the header, and the choice is remembered. A first-time visitor whose browser is set to
Spanish lands in Spanish. Parameter symbols (`RUE`, `HI`, `Tsum`, `I50A`, `f_Solar`, `ARID`,
`S_CO2`) are the same in both languages, so the app keeps mapping onto the paper and onto
`simple_model/parameters/*.csv`. Translations live in `js/i18n.js`; the English is harvested from
`index.html` at load, so there is only ever one copy of it.

---

## The idea

The whole model is one line of arithmetic, repeated once a day:

```
Biomass_rate = Radiation × f_Solar × RUE × f(CO₂) × f(Temp) × min[ f(Heat), f(Water) ]
```

Everything in this app is an exploration of that product — which term is costing you biomass
today, which parameter has leverage in *this* environment, and what the plant looks like while
it happens.

## The four sections

### Learn
The model explained in prose: how thermal time replaces the calendar, how the canopy opens and
closes, why heat and drought do not stack, and why a heat wave in week four is still costing
light in week ten.

### Grow
The simulator. Controls on the left, a 3D plant in the middle, the season trajectory below.

Parameters are grouped by the **G × E × M** framing rather than by data type:

| Group | Covers |
|---|---|
| **G — The Seed** | RUE, HI, Tsum, I50A, I50B, Tbase, Topt, Theat, Textreme, S_water, S_CO2, I50maxH, I50maxW |
| **E — The Sky** | Temperature shift, rainfall multiplier, radiation multiplier, CO₂ |
| **E — The Ground** | Available water capacity, runoff curve number, root zone depth |
| **M — The Farmer** | Sowing date, plant density (f_Solar_max), irrigation |

Twenty-two parameters in all. Nine of them were locked in the original build — `I50A`, `I50B`,
`I50maxH`, `I50maxW`, `S_Water`, `ExtremeT`, `CO2_RUE`, `sradScale` and `f_solar_max` — and are
now exposed. `f_solar_max` in particular is a *management* parameter in the paper, not a crop
trait, so it is grouped with the farmer's decisions and drives the spacing in the stand view.

**The phenology ribbon** across the top is both a growth-stage key and the time scrubber. Bean
staging follows the CIAT scale for *Phaseolus vulgaris* (VE · V1 · V3 · V4 · R5 · R6 · R7 · R8 · R9);
other crops use a generic equivalent. Click a stage to jump to it, drag to scrub, or press space
to play the season.

**Plant views:**
- **Single** — one plant, orbit and zoom freely
- **Rainfed vs irrigated** — the same cultivar grown twice, side by side. The yield gap made visible.
- **Stand** — nine plants, spaced by the plant-density parameter, so canopy closure is spatial
- **Light rays** — casts a grid of rays and colours them by whether a leaf stopped them

**Crops other than bean.** The 3D geometry is common bean — trifoliate leaflets, branching by
CIAT growth habit, pods — which is wrong for a grass and meaningless for a tuber. Those crops get
a **canopy & light schematic** instead (`js/canopy2d.js`): 24 rays fall from the sun, the fraction
stopped by the canopy is `f_Solar`, the rest reach bare soil; the canopy band's depth follows LAI
and it tints toward straw under heat or drought; a plan-view bar reads ground cover. It is a
schematic of interception, not invented morphology, and it responds to the ribbon exactly as the
plant does. Rainfed-vs-irrigated works there too. Opting a crop into the 3D view is one flag:
`plant3d: true` on its `PLANT_ARCHITECTURE` entry.

### Analyse
- **Where today's growth went** — a waterfall decomposition of the daily biomass rate. Each bar is
  the rate after one more factor is applied, against a reference of a closed, unstressed canopy.
- **Where the season went** — the same attribution integrated over the season, in t/ha.
- **Which parameter matters most, here** — a tornado plot. Every parameter is nudged up and down
  by the same fraction of its own range and the model re-run. The ranking is specific to the crop,
  climate and soil you have set.
- **Response curve** — sweep any single parameter across its range.
- **Response surface** — grid any two parameters against each other (676 runs, computed across
  animation frames so the interface never blocks).
- **Compare two scenarios** — save two runs and diff them.

### Trials
Eight guided experiments, each loading a configuration and posing a question: warming, CO₂ and
the C3/C4 contrast, drought and soil texture, breeding for RUE vs HI, canopy closure speed,
plant density, bush vs climbing habit, and finding the sowing window.

---

## Common bean

`Species.csv` always carried `drybean` and `grbean`, but the web app never imported them. It does
now, with four dry-bean cultivars spanning the CIAT growth-habit classification:

| Cultivar | Habit | Notes |
|---|---|---|
| Porrillo Sintético | III — indeterminate prostrate | Mesoamerican black bean, the CIAT reference check |
| Calima | I — determinate bush | Andean red-mottled, short cycle, large seed |
| BAT 477 | II — indeterminate bush | CIAT drought-tolerant line |
| G 2333 | IV — indeterminate climbing | Grown on stakes or with maize; long cycle, high biomass, lower HI |

Growth habit is not cosmetic — it drives branching, node number, height and whether the plant
climbs a stake in the 3D view.

---

## What the 3D plant is, and is not

**SIMPLE has no organ-level state.** It never computes a leaf, a node or a pod. The 3D plant is
a *visualisation layer* that derives geometry from model outputs plus published allometry:

| Plant feature | Derived from |
|---|---|
| Stage, node number, height | `TT / Tsum`, with the phyllochron scaled so the last node appears near flowering |
| **Leaf area** | **Inverting Beer-Lambert on the model's own f_solar: `LAI = −ln(1 − f_solar) / k`** |
| Leaflet droop, yellowing | `f_water` |
| Scorch, accelerated shedding | `f_heat`, and I50B through it |
| Pod number, swelling, dry-down | progressive fill fraction, converging on `Biomass × HI` at maturity |
| Soil colour | stored soil water against capacity |

So the plant is a faithful picture of the model's state, not an independent simulation of
morphology. The interface says so on the panel.

The **light rays** view is the one place where the geometry answers back. Cast over a single
plant it measures far less interception than `f_solar` claims — because Beer-Lambert assumes a
closed canopy and most of a lone plant's ground square is bare. Switch to **Stand** and the two
converge to within a few percent. That disagreement, and its resolution, is the point of the view.

---

## A caution about the numbers

Weather is **generated from smooth seasonal functions, not measured records**. Some cultivar
`Tsum` values have been recalibrated to suit those synthetic climates — the original app author
had already done this for rice, cotton, cassava and soybean, and the bean cultivars follow the
same convention. Where a published value differs it is carried alongside as `TsumPaper` and shown
in the cultivar note.

Treat every absolute yield as illustrative. The *relationships* — the direction and shape of each
response — are what this app is for.

---

## Running it

Any static server will do:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Or open `index.html` directly — though a server is preferable, since the ES-module import of
three.js is subject to CORS rules under `file://`.

### Deploying to GitHub Pages

```bash
git add .
git commit -m "Interactive SIMPLE crop model lesson"
git push -u origin main
```

Then **Settings → Pages → Deploy from a branch → `main` / root**.

### External dependencies

Loaded from CDN at runtime, not vendored:

- [Chart.js](https://www.chartjs.org/) 4.4.3 — season charts
- [three.js](https://threejs.org/) 0.169 — the 3D plant, via an ES-module import map
- Google Fonts — Bricolage Grotesque, Newsreader, IBM Plex Mono

If three.js cannot be reached the 3D panel shows a plain message and everything else keeps working.

---

## Layout

```
index.html              markup for the four sections
css/style.css           the "Field Station" design system
js/data.js              species, cultivars, soils, plant architecture, phenology scales
js/simple_model.js      the SIMPLE + ARID engine
js/explorer.js          parameter registry and the sensitivity engine (no DOM)
js/plant3d.js           three.js plant builder and scene (ES module)
js/app.js               interface controller
simple_model/           the original Python reference implementation
asimplemodel.pdf        Zhao et al. (2019)
```

`js/explorer.js` is pure computation and holds the parameter registry, so **adding a control is a
data change, not a UI change** — append an entry to `PARAM_REGISTRY` and the slider, the tornado
row and both sweep dropdowns appear on their own.

---

## References

- **Zhao, C., Liu, B., Xiao, L., Hoogenboom, G., Boote, K. J., Kassie, B. T., Pavan, W., Shelia, V.,
  Kim, K. S., Hernandez-Ochoa, I. M., Wallach, D., Porter, C. H., Stockle, C. O., Zhu, Y., &
  Asseng, S. (2019).** A SIMPLE crop model. *European Journal of Agronomy*, 104, 97–106.
  [doi:10.1016/j.eja.2019.01.009](https://doi.org/10.1016/j.eja.2019.01.009)
- **Woli, P., Jones, J. W., Ingram, K. T., & Fraisse, C. W. (2012).** Agricultural Reference Index
  for Drought (ARID). *Agronomy Journal*, 104(2), 287–300.
- **CIAT growth-stage scale** for *Phaseolus vulgaris* (Fernández, Gepts & López).

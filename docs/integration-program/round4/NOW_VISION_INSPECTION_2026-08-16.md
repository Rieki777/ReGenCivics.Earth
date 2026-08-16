# Now | Vision inspection (grounds-v0.html at 135db66) with adversarial verification, 2026-08-16

## Inspection
**Scope note.** `drawStruct` (G:1745-1836) is dead code: it is defined once and never called (only hit is its definition). Structures render as DOM emblems/sprites (`makePoi` G:2247, `paintPoiArt` G:2225, per-frame class sync G:3287-3312), so the real Now/Vision behaviour lives in `mode` checks scattered across the render loop, CSS, and the DOM sync. `G` = `docs/prototypes/grounds-v0.html`.

## 1. What the buttons do

Handler G:3478 `$('lyNow').onclick=()=>setMode('now');$('lyVision').onclick=()=>setMode('vision');`
G:3486-3488:
```
function setMode(m){mode=m;$('lyNow').classList.toggle('on',m==='now');$('lyVision').classList.toggle('on',m==='vision');
  if(m==='vision'){maiaSay(`This is the <b>Vision</b>, the whole masterplan at full build-out. The blue ghosts are the gap ...`)}
  mmDirty=true}
```
`mode` declared G:1838 (`mode='now'`). Other entry points: key `v` toggles (G:3653), Maia intent regex `/vision|master ?plan|future|dream/` (G:3580), tooltip copy G:5573-5574 ("Now: only what is. Every icon traces to something true." / "Vision: the whole masterplan. Blueprint ghosts are the fundable gap."), Welcome Walk stop G:3629. On pocket the whole `#layers` bar is hidden (G:601), so phones are permanently Now.

Every branch that reads `mode`:
- G:1521, 1534-1536, 1549-1553, 1569, 1576 (`drawFeatures`, live raster).
- G:1874 (`camBounds`: vision_bound joins clamp extents).
- G:1916, 1918 (`hitStruct`: blueprints unclickable in Now unless build mode).
- G:1966 (org halos skip blueprints in Now); G:1971 (`visF` for flows).
- G:2050-2054 mist/sheen; G:2057-2061 vision_bound line.
- G:3107 (district KIN skips blueprints in Now); G:3290 `hideP`; G:3325 label iconPts; G:3336 label hide; G:3339 `ghosted` banner.
- G:3467 minimap skips blueprints in Now.
- G:4070 `editingVision()`; G:4142 boundary button label.

## 2. Fields that drive it

Structure fields: `phase` (1|2|3), `state` (derived), `fund` (0..1 or null), `act` (`high|low|steady`), `event`. There is no `vision`, `planned`, `built`, `under_construction`, or `dream` flag anywhere; the only vision-specific datum is `SCENE.vision_bound` (G:1427, default null; export G:3815; restore G:4565-4566). Features carry `phase` only; ghost = `phase>1` (G:1511).

`state` is derived, never stored (G:1261-1266):
```
if(s.fund!=null&&s.fund<1){if(s.fund<=0&&s.phase>=3)return 'blueprint';return s.fund<.5?'funding':'building'}
if(s.phase>=3)return 'blueprint';
return s.act==='high'?'thriving':(s.act==='low'?'dormant':'active')
```
Labels G:1260 (`blueprint:"Blueprint · in the Vision", funding:"Gathering the pool", building:"Under construction", active:"Alive", thriving, dormant`). Phase names G:1430 `{1:'Built',2:'Building',3:'Planned'}` (founder-renamable vocabulary).

Seeded structures (G:1105-1170, 22 total, counted by hand from the literal list; derivation confirmed against the rules):
- phase 1: 13, phase 2: 6, phase 3: 3.
- state after derivation: active 9, thriving 3 (ponds, community, spring3), building 3 (library p1 fund .6, foodforest p2 .8, ridgeA p2 .72), funding 4 (market .35, possiblespring 0, ridgeB .35, sanctuary .18), blueprint 3 (guest, healing, trailhead; all phase 3, fund null).
- Note the phase/state mismatch: `library` is phase 1 ("Built") yet state "Under construction". `possiblespring` is phase 2 with fund 0 and still `funding` (only phase>=3 with fund<=0 becomes blueprint).

Seeded features (G:1276-1290; 25): roads 10 (phase 1: 6 incl. 2 public paved, phase 2: 2, phase 3: 2), creeks 3 (p1), ponds 2 (p1), sanctuary pools 3 (p2), zones 7 (p1: 4, p2: 2, p3: 1). No seeded `structure-area` footprints.

Validator `shared/mapScene.ts`: envelope-only, stores verbatim (mapScene.ts:12-31, 148-170). It enumerates no phase or state values; the only mode-adjacent items are the edit verbs `phase`, `fund`, `vision-boundary-seed` (mapScene.ts:235, 240, 261). New palette placements default to `phase:2,state:'funding',fund:0` (G:3696).

## 3. What each mode draws

Now (default), structures:
- `blueprint` (phase 3): hidden. `hideP` G:3290 sets `display:none`; banner hidden G:3336; minimap skip G:3467; hit-test skip G:1916-1918; org halo skip G:1966; flows `visF` G:1971. Exception: build mode shows them.
- `funding` and `building`: drawn as full DOM emblems/sprites with the state class (`poi st-funding` G:2248, 4295). CSS: progress ring shown for both (G:58), plate at .72 opacity for funding (G:59). Because `phase===2` also toggles `.ph2` (G:3292), the painted sprite is swapped for the unfinished twin `sprite-wip` (G:779-780) or, for families without one, the scaffold lattice (G:450, 453). `.ph2` opacity .92 (G:448). Everything else (active/thriving) full sprite, night glow, figures, light pools (G:2011-2029).
- Canvas: phase-1 roads faint hint alpha .16 (G:1549); planned roads not drawn (G:1552 is vision-only); zones not drawn (G:1520-1524 vision-only); water areas only ghost outlines when `phase>1` (G:1534); water lines not drawn (G:1569); structure-areas of blueprints skipped (G:1576).

Vision, changes:
- Blueprints appear as ghost emblems: `st-blueprint` plate .42, dashed ghost ring and icon (G:60-62), sprite and iso forced off (G:76, 773, 781), `.ph3` opacity .62 (G:448). Their banners appear dashed blue (`ghosted` G:39, 3339). Funding banners also go `ghosted` in Vision only (G:3339). Funding/building POIs themselves are unchanged.
- Canvas: all zones filled/stroked (gold for phase 1, blue dashed for ghost, G:1521-1524); water areas filled (G:1536); phase-1 road hint jumps to alpha .75 and planned roads appear blue dashed (G:1549-1553); water lines drawn (G:1569); blueprint footprints drawn (G:1576); minimap draws blueprint dots blue (G:3468, funding dots are blue in both modes); org halos and flow edges of blueprints appear; `vision_bound` dashed gold line if set (G:2057-2061, null in seed); camera clamp widens (G:1873-1876).
- Bug: the "vision blueprint sheen" `rgba(120,180,255,.05)` full-map fill is in the `else` of `mode==='now'&&SKIN.mist` (G:2050-2054). `SKIN.mist` defaults false (G:5032), so Now paints the Vision sheen too. Nothing that Now draws is removed in Vision.

Net difference between the two modes in the seed: 3 ghost emblems, geometry overlays (zones/roads/water) shown, 4 funding banners dashed. Six of the seven "future" buildings look identical in both.

## 4. Why Now already shows the future

Now hides only `state==='blueprint'`, and blueprint requires `phase>=3` (or phase>=3 with fund 0). Every phase-2 structure, including four with pools at 0 to 35 percent (market, possiblespring, ridgeB, sanctuary), is drawn in Now with a WIP sprite/scaffold and a progress ring, and any building the founder places in build mode is born phase 2 (G:3696) so it also shows in Now. Phase 2 roads/pools are ghost-outlined in Now too (G:1534). So Now already reads as "built plus being built plus planned-and-staked", and Vision only adds three far-south ghosts and some overlay lines. The tooltip promise "only what is" (G:5573) is not what the code does. FIXES_TO_MAKE_2026-08-08.md:192 states the intended asymmetry ("Now stays honest and Vision does the revealing"), which was applied to the terrain bake but never to the structure layer.

## 5. Other time/phase controls

- Day/night `dayBtn` (G:3489): time of day only, no phase interplay.
- Phase radios and pool slider in the inspect card (G:4352-4355, 4397-4401) and drafting phase radios (G:977-979): they set `phase`/`fund` per item, so a founder can move things between modes, but there is no timeline, year, or slider over the whole scene.
- PR #12 "overlays, plates and journey": "plates" are name plates (label collision, `platePlace`, commit ff59889), "overlays" is the bottom band layout for toasts/Maia (`bandLayout`, commit 8047473), and "journeys" are camera walks over `SCENE.journeys` (`playJourney` G:4996, guard fix 88c367a). None is a time control; the only overlap is one Welcome Walk stop that tells the visitor to flip Vision (G:3629). `SKIN.mist` (G:5098) is a Now-only dressing over the phase-3 south.

## 6. Existing coverage

- `qa/secA.js:137-146` (blueprint clickable in Vision, panel opens), `secA.js:195-200` (toggle Now/Vision, reads `mode`, screenshots), `secA.js:245-253` (blueprints stay emblematic).
- `qa/secD.js:80-90` (derived state from phase and pool), `secD.js:323-330` (paint plate in both modes, blueprint counts).
- `qa/secE.js:120-130, 152-155` (flows lens with blueprint edges; seed has 0 such edges).
- `qa/verify_features.js:803-813` and `qa/_probe_vb.js` (vision_bound seed, export, restore, camera reach); `qa/check-schema.js:32-34`.
- No test asserts what Now hides beyond blueprints, none asserts funding/phase-2 visibility, none checks the sheen. No e2e/vitest coverage of modes (`shared/mapScene.test.ts`, `server/lib/mapScene.test.ts` are envelope tests).

## 7. Candidate models

**A. Now = ground truth, Vision = everything dreamed.** Now draws only structures with `fund>=1` or `fund==null` and phase 1 (active/thriving/dormant), plus phase-1 features. Vision draws all. Anything with a pool below 100 or phase>=2 becomes a Vision ghost. Transition: pool reaches 100 (or founder sets phase 1). Simple, but it removes the live "watch it become walls" story from the default view, and Vision becomes crowded with two different kinds of future.

**B. Three tiers, two views, gated promotion (recommended).** Keep phase as the founder's tier and make Now/Vision agree with it: Now = phase 1 built and phase 2 "in motion" (fund>0 or an active quest/build day) drawn as WIP; Vision = the same plus phase 3 ghosts, phase 2 with fund 0 as ghosts (not WIP), and the vision_bound. Add a `vision` block on the structure: `objectives:[{text,metric,target,current,done}]` and `trigger:{pool_pct, objectives_all_done, by:date|null}`. Promotion 3 to 2 requires all objectives done (or an explicit founder override that is logged via `logEdit('phase',...)`); 2 to 1 requires `fund>=1` and a "built" objective. Ghosts in Vision show the objectives list and a "what would make this real" line in the panel (extends G:3417). Interacts with journeys: a Vision journey walks the ghosts in dependency order; plates unchanged. Fixes the sheen bug and the tooltip. This keeps the current WIP art meaningful, makes Vision non-redundant (it shows only what has not started), and gives each vision an exit condition so it cannot sit as a forever future.

**C. Timeline slider.** Replace the toggle with a year slider using per-structure `target_year`; Now is the current position. Richest, but it needs a new field on 22 structures and 25 features, changes every `mode` branch above, and phones currently have no layer bar at all.

Test plan for B (Playwright, `docs/prototypes/qa/`, `source ./env.sh`): new `verify_modes.js` at 1600x1000 (lib2 default), 1480x1180 (verify_features), and pocket 390x844 hasTouch. Probes: (1) in Now, every visible POI has phase 1, or phase 2 with fund>0; count hidden equals count of phase 3 plus phase 2 fund 0; (2) in Vision those reappear with `st-blueprint`, banners `ghosted`, minimap dot count rises by the same number; (3) the sheen: sample canvas pixel alpha in Now equals the mist-off baseline; (4) derived state: phase 2 fund 0 becomes blueprint, promotion blocked until objectives done, override writes an EDITS row; (5) export/restore round-trip carries the `vision` block (extend `check-schema.js`); (6) pocket has no toggle and stays Now; (7) hitStruct and flows `visF` match visibility; (8) zero page errors. Add rows to secA §7 asserting the tooltip text matches behaviour.
## Verification (a second agent tried to refute every factual claim)
**Verdict summary: 6 items checked; most claims CONFIRMED. Four factual points REFUTED or narrowed (marked below). `G` = `docs/prototypes/grounds-v0.html` (6159 lines).**

**Scope note (drawStruct dead code)** — CONFIRMED. `drawStruct` defined G:1745, only hit is the definition (`grep -n "drawStruct("` returns G:1745 only). Structures are DOM: `makePoi` G:2247, `paintPoiArt` G:2225, per-frame sync G:3287-3295.

## 1. Handlers — CONFIRMED with one narrowing
- G:3478 handlers, G:3486-3488 `setMode` body, G:1838 `mode='now'`, key `v` G:3653, Maia regex G:3580, tooltip G:5573-5574, Welcome Walk stop G:3629, pocket hides `#layers` G:601: all CONFIRMED verbatim.
- Branch list CONFIRMED (G:1521,1534,1536,1549,1552,1569,1576,1874,1916,1918,1966,1971,2050,2057,3107,3290,3325,3336,3339,3467,4070,4142). Omits only dead-code reads G:1747/1756 and the pass-through G:1956.
- **REFUTED (narrowed): "phones are permanently Now."** Pocket hides the bar (G:601) but `#maia` is shown on pocket via `.msheet` (G:605), and the Maia intent `/vision|master ?plan|future|dream/` (G:3580) still calls `setMode('vision')`; so do the `v` key (G:3653) and any script. Correct fact: pocket has no toggle button, but mode is still flippable.

## 2. Fields — CONFIRMED with nuances
- `derivedState` G:1262-1265, `STATE_LABEL` G:1260, phase names G:1430, `vision_bound` G:1427 / export G:3815 / restore G:4565-4566, features `ghost=f.phase>1` G:1511, palette default `phase:2,state:'funding',fund:0` G:3696: CONFIRMED.
- `act` values `high|low|steady`: CONFIRMED (`'steady'` at G:3773, 4354, 4533).
- "state is derived, never stored": CONFIRMED for the export/restore contract (export writes `derived_state` + note G:3773-3774; restore recomputes G:4530-4536). Nuance: the seed literals DO carry `state:"..."` (G:1105-1170) and G:1266 uses it only to seed `act` before overwriting.
- "no vision/planned/built/under_construction/dream flag": CONFIRMED for structure visibility. Nuance: export carries a constant `vision_of:null` (G:3812) and per-door state `'future'`/`when-built` exists (G:4405, 4541, 4991); neither drives mode.
- Seed counts: 22 structures, phase 1/2/3 = 13/6/3, states active 9 / thriving 3 / building 3 / funding 4 / blueprint 3: CONFIRMED by hand from G:1105-1170. Library p1 building, possiblespring p2 fund 0 funding: CONFIRMED.
- Features 25 = roads 10 (RP `[1,1,1,2,2,3,3,1]` G:1274 + 2 public p1 G:1279-1281 → p1 6, p2 2, p3 2), creeks 3, ponds 2, sanct pools 3 (p2), zones 7 (ZP `[1,1,1,2,2,3,1]` G:1288 → 4/2/1): CONFIRMED (arrays G:1079-1103). No seeded `structure-area`: CONFIRMED (only referenced in code paths G:1505+, none in `migrateFeatures`).
- `shared/mapScene.ts` envelope-only (lines 12-31, 148-170), verbs `phase`:235, `fund`:240, `vision-boundary-seed`:261: CONFIRMED.

## 3. What each mode draws — mostly CONFIRMED, two REFUTED
- CSS refs G:39, 58-62, 76, 448, 450, 453, 773, 779-781: all CONFIRMED verbatim. `poi st-` class G:2248 / G:4295, `.ph2`/`.ph3` toggles G:3292, `hideP` G:3290→3295, banner G:3336/3339, minimap G:3467-3468, hit-test G:1916-1918, halos G:1966, `visF` G:1971, camBounds G:1874-1876, vision_bound line G:2057-2061, figures/light pools G:2005-2024: CONFIRMED.
- Sheen bug: CONFIRMED (G:2050-2054 `else` branch, `SKIN.mist:false` G:5032).
- "Exception: build mode shows them [blueprints in Now]": narrowed. True for `hideP` G:3290, hit-test G:1916/1918, district G:3107, `visF` G:1971, footprints G:1576; NOT for label points G:3325, banner hide G:3336, minimap G:3467, halos G:1966 (no buildMode check).
- **REFUTED (scope): canvas claims for Now ("zones not drawn", "planned roads not drawn", "water lines not drawn") hold only on the sat/paint live raster.** In Vector terrain mode (`data-tm="vector"` G:825) `activePlate()` is null (G:1586), the frame blits the `terrain` bake (G:1950) and skips `drawFeatures(...'live')` (G:1951-1956 is inside `if(_pl)`); the bake (G:1601, 1626-1629) draws phase-1 zones/water/roads/lines fully AND phase>1 ghosts as blue dashed (zones G:1518-1519, water areas G:1532-1533, roads G:1546-1547, water lines G:1567-1568) regardless of `mode`. Default is `terrainMode='sat'` (G:1585), so the report is right for the default.
- **REFUTED (arithmetic): "Six of the seven 'future' buildings look identical in both."** The 7 with fund<1 (library, market, foodforest, possiblespring, ridgeA, ridgeB, sanctuary) have identical POI emblems in both modes; 4 of them (the `funding` ones) get a `ghosted` banner in Vision (G:3339). So 7/7 identical by emblem or 3/7 identical counting banners; "6 of 7" matches neither.
- "Nothing that Now draws is removed in Vision": CONFIRMED under default skin (mist off); with `SKIN.mist` on, mist is Now-only (G:2050).

## 4. Why Now shows the future — one REFUTED
- Now hides only `state==='blueprint'`; phase-2 structures with fund 0-.35 draw in Now; palette births phase 2 (G:3696): CONFIRMED.
- **REFUTED: "Phase 2 roads/pools are ghost-outlined in Now too (G:1534)."** Pools yes (water areas G:1534: `mode==='vision'||ghost`). Roads no on the live raster: ghost roads are `else if(mode==='vision')` only (G:1552-1553), which the report itself states in item 3. (Vector-mode bake draws them in both modes, see item 3.)
- FIXES doc ref: file is `docs/prototypes/FIXES_TO_MAKE_2026-08-08.md:192` (not repo root); the quoted sentence is there. CONFIRMED.

## 5. Other time controls — CONFIRMED
`dayBtn` G:3489; inspect phase radios G:4352, `iAct` G:4354, pool slider G:4355 with handlers G:4397-4401; drafting `dPhase` radios G:977-979; `playJourney` G:4996; `platePlace` G:2807; `bandLayout` G:5454; commits ff59889 (43 `platePlace` hits), 8047473 (21 `bandLayout` hits), 88c367a (journey guard) all exist; PR #12 = merge 25f08eb; `skMist` G:5098. No scene-wide timeline found.

## 6. Coverage — CONFIRMED
`qa/secA.js:137-146, 195-200, 245-253`; `secD.js:80-90, 323-330`; `secE.js:120-130, 152-155`; `verify_features.js:803-813`; `_probe_vb.js`; `check-schema.js:32-34`: all present as described. Seed flows (G:1198-1222) touch no blueprint key: 0 blueprint edges CONFIRMED. No qa file references `st-funding`/`'funding'` or the sheen colour; `shared/mapScene.test.ts` and `server/lib/mapScene.test.ts` contain no `lyVision`/mode refs. CONFIRMED.

## 7. Proposals
Model A/B/C reasoning rests on facts that stand, except: (a) the test-plan probe "pocket has no toggle and stays Now" should read "no toggle button" (Maia intent/`v` key still flip it); (b) any Now/Vision canvas assertion must be scoped to sat/paint terrain, or Vector mode will fail it; (c) B's "phase 2 roads ghost in Now" premise is wrong for the live raster.
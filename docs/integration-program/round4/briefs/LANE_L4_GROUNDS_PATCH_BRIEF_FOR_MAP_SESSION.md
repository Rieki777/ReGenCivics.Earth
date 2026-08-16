# Lane L4: two grounds-side patches for the map-prototype session (handover)

Coordinator brief, 2026-08-16. A HANDOVER, not a dispatched lane: Rye's map-prototype session owns `docs/prototypes/grounds-v0.html` and its `patch_*.py` series and applies these patches on its own tip, in its own numbering, once its in-flight g/h patch sets land. Measured at game-amora `135db66`; `origin/main` has moved since (PR #16 and #17 merged, main `3c295b8`), so line numbers are hints and anchors are by content.

## Objective

Ship two patches to the living map, each a numbered `patch_*.py` editing the artifact plus probes under `docs/prototypes/qa/`: (A) the nine capitals on the Flows overlay with radiation rings per R28; (B) Now | Vision model B, so Now shows what is or is in motion and Vision shows the rest as ghosts with exit conditions. Both stay inside the artifact ratchet and fix reduced motion and tab hide.

## Why

Proposal §3 and §8 items 20 to 22 for A; §10.3 and `NOW_VISION_INSPECTION_2026-08-16.md` for B. Rulings: R28 ("yes if not mentioned" over §8, item 13 amended to always-on rings), R29 (model B, N1; shared `vision` block, N2), R30 (defaults hold until struck). Q14's default: the grounds patch goes to your session, so two sessions never edit the artifact at once.

## Boundaries

- May edit: `docs/prototypes/grounds-v0.html`, new `docs/prototypes/patch_*.py`, `docs/prototypes/qa/**` (new probes; `check-schema.js` extension).
- May read: `shared/mapScene.ts` (envelope validator, verbatim storage, families `v0.7`, `v0.8`), `shared/capitals.ts` once L3 lands it, `scripts/check-artifact-budget.mjs`, `.github/workflows/ci.yml`, the `round4/` memos.
- May NOT touch: `shared/**`, `server/**`, `client/**` (L2, L3, L1 own the org map, `resources`, the library), `scripts/**`, `drizzle/**`. Wanting one is a written request to the coordinator.

## Design

**Patch A: capitals on Flows.**
1. Vocabulary. Nine ids `financial, material, living, intellectual, experiential, social, cultural, spiritual, health`. Legend labels plain first (Money, Materials, Living things, Knowledge, Experience, Relationships, Culture, Spirit, Health), formal name in the tooltip (§8 item 20). Ship a literal `window.CAPITALS_SEED` beside `window.MEDIA_SEED` (`{key,name,formal,color,glyph}`) with a `TODO: read shared/capitals.ts (L3)`; the artifact is self-contained HTML, so "read" means a probe diffing the literal against the shared file once it exists (`qa/verify_capitals_vocab.js`).
2. Defaults medium to capital, so old scenes need no edit: water, energy, materials-raw, materials-finished to `material`; food-raw, food-prepared, compost to `living`; money to `financial`; care to `social`. Per-flow override `capital`; unknowns self-heal as `mediaOf` does.
3. Per-structure `gives:[capitalId...]`, declared in the inspector (beside `iPhase`, `#iAct`, `#iFund`), logged `logEdit('gives','structure:'+s.key,{to:[...]})`. Exported inside `bindings` (`gives:[]` when empty) by `buildExportJSON`, restored by `restoreScene`; one new `check-schema.js` row.
4. Materials | Capitals switch inside Flows: a two-chip sub-band under `#layers`, visible only while `flowsOn`. Capitals view keeps the three travelling marks per edge; `flowMark` draws the capital glyph in the capital hue. Measured: `flowsOn` is assigned only at its `let` and in `$('lyFlows').onclick`, no key, no Maia intent, and pocket hides `#layers`; add a Maia intent (`/flow|capital|metabolism/i`) and key `f`, or a phone cannot reach the lens.
5. Radiation, R28 item 13 verbatim: every producing sprite always has a ring: one icon of each capital at once when it gives several, several of the one icon when it gives one. Ring in the canvas flows block (radius clear of the org halo at 46); icons rise about 28 px, drift, shrink and fade over about 1.6 s, phase-offset. Caps 24 live icons desktop, 10 when `body.pocket`; viewport cull first, then nearest the camera centre; zoom LOD below a `cam.z` threshold collapses to a static badge row under the building (§8 item 21); a legend chip filters to one capital.
6. Icons: inline SVG paths in `GLYPH_PATH` style, one hue per capital, drawn once to an offscreen sprite (`flowSprite` pattern), plus a 20 px legend version; zero image budget.
7. Motion harms: `matchMedia('(prefers-reduced-motion: reduce)')` draws static icons and legend, no rise, no marks (measured: no `matchMedia` in the script; the only reduced-motion rule is CSS); `visibilitychange` pauses `frame` while `document.hidden`, resuming with `tPrev` reset (measured: no `document.hidden` anywhere; `frame` re-arms itself with `requestAnimationFrame(frame)`).

**Patch B: Now | Vision model B.**
1. Now = phase 1, plus phase 2 in motion (`fund>0`, or an active build quest or build day) drawn as WIP as today. Vision = that plus phase 3 ghosts, idle phase 2 (`fund<=0`, nothing active) as ghosts, plus `vision_bound`. Implement in `derivedState` (idle phase 2 becomes `blueprint`) so every existing branch (`hideP`, banner hide and `ghosted`, minimap, `hitStruct`, org halos, `visF`, district KIN) follows unchanged. Note the palette birth `phase:2,state:'funding',fund:0`: a fresh placement then hides in Now outside build mode (`hideP` already exempts build mode).
2. `vision` block per structure, same shape as L2's: `{objectives:[{text,metric,target,current,source:'measured'|'declared',done}], trigger:{all_objectives_done, by}}`. Export beside `state_inputs`, restore verbatim; `check-schema.js` asserts shape or absence.
3. Gated promotion in the inspector: 3 to 2 needs every objective done, 2 to 1 needs `fund>=1` and a done "built" objective; a founder override writes `logEdit('phase-override', ...)` with the unmet list in `diff`.
4. Ghost panel: extend the blueprint paragraph in `openPanel` ("This one lives in the Vision...") with the objectives and a "what would make this real" line. A Vision journey walks ghosts in dependency order (undone-objective count, then declared `after` keys; hypothesis).
5. Fixes on the way: the sheen `else` after `mode==='now'&&window.SKIN&&window.SKIN.mist` becomes `else if(mode==='vision')`; `TIPS.lyNow`/`lyVision` say what the modes now do; the seed's `library` (`phase:1, fund:.6`, so "Under construction") gets a phase and pool that agree.
6. Copy: Maia lines, tips, legend and panel text follow the voice rules; no CI gate scans `docs/prototypes` (measured: check-voice roots exclude it, brand guard exempts `docs/`, dash guard walks `client/src`).

## Steps

1. Read the inspection memo, both halves; run `qa/verify_features.js` on your tip for the inherited reds.
2. Patch A part 1: vocabulary, defaults, `gives[]`, export/restore, schema row, `verify_capitals_vocab.js`. Commit.
3. Patch A part 2: switch, ring, caps, cull, LOD, legend filter, icons, reduced motion, tab pause, Maia intent and key; probes at 1600x1000, 1480x1180, 390x844 hasTouch. Commit.
4. Patch B: `derivedState`, `vision` block, gates, panel, journey, sheen, tips, seed fix, `verify_modes.js`. Commit.
5. Version stamp last: `window.BUILD_VERSION` stays in the `v0.8` family (`mapScene.ts` pins families). Commit, push, PR, merge commit.

## Gates and harm metrics

Artifact ratchet `MAX_RAW_BYTES 7,000,000 / MAX_WIRE_BYTES 5,000,000`; at `135db66` the file is 5,495,663 raw / 3,932,226 gzipped (79% of both); both patches add under 60 KB raw. CI verify at `135db66` has fourteen `run:` steps: Install, Typecheck, Typecheck tests, Brand guard, Voice guard, Dash guard, Auth guard, Living map artifact budget, Doc link guard, Image budget, Build, Test, Bundle budget, Dependency audit.

Harm metrics: (a) pocket-profile frame time with Capitals on and 22 seeded structures within 1.5x of Flows-off, by `performance.now()` deltas; (b) under `page.emulateMedia({reducedMotion:'reduce'})` two consecutive samples of the flows layer are byte-identical; (c) `document.hidden` true stops the loop (frame counter flat for 1 s); (d) live icons never exceed 24 / 10; (e) in Now every visible POI is phase 1 or in-motion phase 2, hidden count = phase 3 + idle phase 2; in Vision they reappear as `st-blueprint`, banners `ghosted`, minimap dots up by the same number; (f) Now sheen alpha equals the mist-off baseline on sat/paint; (g) export/restore round-trips `gives` and `vision`; (h) zero page errors; (i) tooltip text matches behaviour. Test plan verbatim from the memo: three viewports including pocket 390x844; canvas assertions scoped to sat/paint terrain (Vector blits a bake that draws ghosts in both modes); pocket has no toggle button but the mode still flips via the `v` key and the Maia intent, so probes flip it that way and never assume "phones stay Now". A NaN band passes everything: `Number.isFinite` before every comparison.

## Non-findings

- `drawStruct` is dead code; leave it. The org halo radius, `plateBudget`, districts and the h8 top band are your in-flight work; adopt, never reformat.
- `verify_features` D5.3 asserts `!window.JWALK`, permanently undefined: a gate defect, report it, do not fix here.
- `map_flows` and `map_structures` have no tables (`scripts/import-map-scene.ts` skips them); the importer does not change. `shared/capitals.ts`, `resources` and the org-map lens are L3; the power map's `vision` block is L2; shape disagreements go to the coordinator.

## Tools

Playwright via `qa/env.sh` (`GROUNDS_FILE` derived from the tree you run in), `qa/lib2.js`, `verify_*.js` (PASS/FAIL, non-zero exit), `_shot_e_pocket.js` (pocket context: hasTouch alone, `isMobile` lies), `scripts/check-artifact-budget.mjs --json`, `patch_*.py` with exact-count anchors and a re-run skip guard.

## Rules

- Worktree: one fresh worktree per lane cut from origin/main AT DISPATCH (after the other session lands PR #16 and its five dirty worktrees), name and branch given below; commit with git add -p or explicit paths at every milestone, never git add -A; push the branch; land by PR with a merge commit (gh pr merge N --merge), never fast-forward; a push is not a green.
- Zone: edit ONLY the files/blocks listed under Boundaries; anything else is a written request to the coordinator. server/index.ts and Admin.tsx are shared with other lanes: anchor by route string / component name, keep diffs local, never reformat.
- Gates (game-amora CI = the verify job's FOURTEEN run: steps at 135db66, enumerate .github/workflows/ci.yml before reporting, never trust a count): pnpm check; rm -f node_modules/typescript/tsbuildinfo && npx tsc -p tsconfig.tests.json --noEmit; brand ratchet 63/63 zero headroom (never --update-baseline); check-voice (parses shared/ string literals: platform language, no village brand, no dashes, no "not X but Y"); dash guard; check-auth-fetch; living-map artifact budget (raw <= 7,000,000 / wire <= 5,000,000 bytes); doc-links; image budget (WebP only under client/public, 400 KB per file, total may only fall unless the brief says the ratchet is raised once with the reason in the commit body); pnpm build (watch the libuv teardown crash leaving dist/index.js stale); pnpm test whole files never -t, TEST_DATABASE_URL set or DB suites skip while the summary says passed: read the skip count and duration; pnpm audit --prod --audit-level high; bundle 700/6000 KB (new pages lazy). Mutex C:/Users/taren/Desktop/Amora/.test-lock: skip the local full suite only when it is held AND CI is green on your tip; release only locks you acquired.
- Migrations: the number given below is pre-allocated (0083 L2, 0084 L3, 0085 L5a, 0086 L7, 0087 L6, 0088 L5b); never renumber; hand-written drizzle/NNNN_*.sql + schema.ts types; run via the project's runner; the coordinator re-runs the four-way scan at dispatch.
- Reporting: a lane reporting done gives the tip SHA, every gate's output, the test skip count and duration, and for anything user-visible a live probe after merge; CODED / VERIFIED / DONE (DONE = CI verify green on THAT SHA + /health build marker matches + live probe). Targets are HARM metrics, not counts. Root causes stated in this brief are hypotheses to measure.
- Voice: no em-dashes, no "not X but Y" framing, plain words; every user-facing string in shared/ or client/ is subject to check-voice and the brand ratchet.
- Security: any new credential, token, webhook, external fetch or upload path goes through the security-review checklist before merge (rate limits, revocation, audit rows, SSRF guard, secrets never printed or persisted, PII reports carry field names only). Never guess legal/tax/contract answers.
- Live is read/render only: no accounts, forms, enables or production DB use by a lane; test admin integration-qa exists (token minted by the coordinator, <= 24 h, never on disk).
- Playwright hazards: networkidle never fires (use domcontentloaded + ~3.5 s); mobile = WebKit iPhone 14 DPR3 at 390x844 / 390x664 / 375x812 (+360); safe-area reads 0; force scroll-behavior:auto; a NaN band passes everything, make probe failure loud.

Worktree and branch for this handover: your session's own worktree and patch series; migration: none. The "one fresh worktree" line is for dispatched lanes; here it means your tip, never a second checkout of the artifact.

## Report format

One message to the coordinator: patch file names in order; commit and merge-commit SHAs; `check-artifact-budget --json` before and after; the fourteen gate outputs on the tip (test skip count and duration); probe output for `verify_capitals_vocab.js`, the capitals probe and `verify_modes.js` at all three viewports; screenshots per viewport (Materials, Capitals, Now, Vision, pocket Vision via `v`); inherited reds left alone; the live `/map` probe after merge with the `/health` build marker. Status CODED / VERIFIED / DONE per the rule above.

## Coordinator amendments (post-review, 2026-08-16, binding)

1. Design A5 (radiation), one sentence that reconciles the ruling with the budget: **the ring itself is never culled or capped: every producing sprite always shows its ring, one icon of each capital it gives (or several of its one capital); the 24-desktop / 10-pocket caps, the viewport cull and the zoom-LOD collapse to a static badge row apply to the RISING icons only.** R28 item 13 is Rye's verbatim ruling; this sentence is how it stays true on a phone.
2. R28 "item 13" is the RULINGS LIST item 13 (radiation), which is what you implemented; ignore any reading that maps it to proposal §8 item 13 (images).

# Lane L1a: Module Library catalog art (eighteen painted places)

Worktree `wt-r4-art`, branch `wt/r4-art`, cut from game-amora `origin/main` at dispatch. Migration: none.
Facts below were measured at `135db66`; line numbers are hints, anchor by content.

## Objective

Paint eighteen 640x400 WebP images, one per module id in `shared/modules.ts`, each a place in the village
in the grounds map's own painted style, at or under 25 KB each, saved to
`client/public/images/modules/<id>.webp`. Raise `scripts/image-budget-baseline.json` once, in the same commit,
with the ruling quoted in the commit body. Ship a three-sample style sheet for coordinator approval before the
batch. Lane L1 renders these on the `/modules` cards; this lane only makes the files.

## Why

Proposal §1 item 7: "one illustrated set, a designed fallback, and a village override" at
`client/public/images/modules/<id>.webp`, "baseline raised once in the same commit with the reason in the
commit body". §8 item 13 (a) sets the style: "places in the village painted in the grounds map's own style
(Events = the commons at dusk with lanterns; Material Library = the tool shed; Stays = the guest cabin; How Power
Is Held = the council fire)"; (b) the home: "Recommend bundle: forks stay self-contained and R19's WebP
standard holds; the ratchet raise is a ruling, not a habit", at "~25 KB x 18 = ~450 KB". R28 ("yes if not
mentioned") ratifies §7 item 4 (Q4: the lane generates all eighteen with `nano-banana-pro`, WebP) and §8 item 13.
R29 (§9.1: the power map "takes the painted world's palette") is the same style choice from the other side.
R30 sets timing: dispatch after PR #16 and the five dirty worktrees land.

## Boundaries

May edit: `client/public/images/modules/**` (eighteen `.webp` plus a `manifest.json` in the
`images/avatars/manifest.json` shape) and `scripts/image-budget-baseline.json`. Nothing else.

May read: `shared/modules.ts` (`MODULES` array), `scripts/check-image-budget.mjs`,
`scripts/compress-static-images.mjs` (scoped to `client/public/assets/images`, it will not touch our folder;
read it for the sharp settings), `scripts/gen_avatars.py` (the repo's generation discipline: pinned model,
key from env only, resume-safe, `--samples` gate, manifest as truth), `docs/prototypes/grounds-v0.html`
(`window.SPRITES`, `CIRCLE_COL`, `THEMES.emerald`; never edit), `.github/workflows/ci.yml`.

May NOT touch: `docs/prototypes/grounds-v0.html` (the other session), `client/src/**` and `shared/**`
(L1: card, detail page, fallback art, `moduleCatalog.ts`), `server/index.ts` (L1 and housing),
`scripts/*.mjs|py` (a checked-in generator is a written request), any other image folder.

## Design

1. **Ids and names.** Exactly the eighteen `id:` strings in `MODULES` (`shared/modules.ts`, `export const
   MODULES: ModuleDef[]`): quests, gratitude, progression, profiles, map, forum, feed, messaging, stays,
   automation, health, library, badges, exchange, commerce, network, tools, events. Filename = id. No other
   files, no other names.
2. **Style anchor, measured.** `window.SPRITES` (one line after the `/*SPRITES_DATA*/` marker) holds 30
   base64 PNG sprites keyed by place (barn, bath, bighall, bridge, fire, gate, hall, kitchen, lab, library,
   market, store, tank, tools, tower, ...; 30 to 90 KB each). Extract `fire`, `tools`, `library` to the scratchpad with
   a node one-liner (`Buffer.from(base64)`), never by editing the file. What they are: hand-painted, soft cel
   shading, three-quarter view, curved living timber, living roofs, tropical planting, warm gold light,
   transparent ground. Palette from `THEMES.emerald` (`--parch #f3e6c8`, `--gold #c9a25e`, `--t-accent
   #e8a13c`, `--t-surface #20372a`) and `CIRCLE_COL`. Our images are landscape scenes with painted ground and
   sky in that same hand; the reference sheet proves the match.
3. **Place per module** (§8 item 13 fixes four; the rest are the lane's proposal, coordinator may swap):
   events = the commons at dusk with lanterns; library = the tool shed; stays = the guest cabin; map = the
   council fire; quests = a wooden notice board with pinned cards by the hall porch; gratitude = the spring
   with offering bowls under a full moon; progression = the trailhead path with stone waymarkers climbing to
   the hall; profiles = a member's cabin porch with a journal and hanging tokens; forum = the big hall, door
   open, benches in a ring; feed = the kitchen chalkboard at morning; messaging = the footbridge with lantern
   posts; automation = the bell tower; health = the ridge weather station (rain gauge, water tank, young
   trees); badges = the school porch wall of woven badges; exchange = the village store counter with token
   jars; commerce = a market stall with a donation bowl; network = the gate with signposts to other villages;
   tools = the lab workbench with radio, maps and instruments. No people, no faces, no legible text or signage,
   no logo, no village name (brand ratchet 63/63 sees `client/**` json; images carry nothing to read).
4. **Composition rule for the card.** L1's card box is a hypothesis until L1 lands (`object-fit: cover`,
   full card width, roughly 328 px inside a 360 px viewport). Keep the subject inside the central 80% and
   nothing that matters within 8% of the top or bottom edge, so a 16:9 or 3:2 crop still shows the whole
   subject.
5. **Generation.** `nano-banana-pro` skill (`generate_image.py`, model `nano-banana-pro-preview`), key from
   `GEMINI_API_KEY` in the environment; if absent, stop and report, never fabricate or substitute art. One
   shared style prefix, one place clause per id, `aspectRatio "16:9"` at 1K, PNGs kept in the scratchpad.
   Mirror `gen_avatars.py`: pinned model, resume-safe, no fallback model, key never on disk or in a log.
6. **Delivery.** Centre-crop to 16:10, resize to 640x400, encode WebP with `sharp` from the app's
   `node_modules` (`quality` 55 to 72, `effort 6`) or PIL `method=6`; stop lowering at quality 50; a file that
   will not fit under 25 KB at 50 is reported, never shipped over. `manifest.json` per id: `file`, `model`,
   `at`, `bytes`, `promptHash` (no prompt text, no village words).
7. **Baseline.** Today `check-image-budget.mjs` walks 38 raster files, 1,813,710 bytes, equal to the
   baseline. `--update-baseline` refuses to raise, so the raise is a hand edit to the exact `total` printed by
   `node scripts/check-image-budget.mjs --json` (`files` field too). Ceiling: 1,813,710 + 18 x 25,600 =
   2,274,510 bytes; the committed number is the measured total, lower than that.
8. **Serving fact for L1 (hypothesis, not our zone).** `client/public` is served by `express.static(staticPath)`
   without `immutable`; only `/api/*` and `/assets/*` 404 explicitly, so a missing `/images/modules/x.webp`
   returns the SPA's HTML with 200. `<img onError>` still fires. Tell L1.

## Steps

1. Cut `wt-r4-art` from `origin/main`; `git log 135db66..HEAD` to note drift; re-read `MODULES` ids and the
   baseline; enumerate the `run:` steps in `.github/workflows/ci.yml`. Extract the three sprites. No commit.
2. Style sheet: generate the `map`, `library`, `events` samples; compose one sheet in the scratchpad with the
   three sprites beside them; send the path to the coordinator; wait for approval. On approval commit the
   three `.webp` + `manifest.json` + the baseline raised once (body quotes §8 item 13 (b) and R28). Push.
   Commit A.
3. Batch: the remaining fifteen, resume-safe, same prefix. Measure every file. Lower the baseline to the
   measured total with `--update-baseline` (downward, allowed). Commit B, explicit paths. Push.
4. Gates (below), whole suite unless the mutex rule applies. Fix, commit, push.
5. PR, merge commit after CI verify is green on the tip. Live probe. Report.

## Gates and harm metrics

DONE = CI verify green on the tip SHA (all fourteen steps, enumerated in the report) + `/health` build marker
matches + live probe. Local: `pnpm check`; `rm -f node_modules/typescript/tsbuildinfo && npx tsc -p
tsconfig.tests.json --noEmit`; brand refs 63/63; check-voice; dash guard; check-auth-fetch; artifact budget;
doc-links; `node scripts/check-image-budget.mjs` passing with the raised baseline; `pnpm build`; `pnpm test`
(skip count and duration read); `pnpm audit --prod --audit-level high`; bundle 700/6000 KB (adding under 460 KB
to `dist/public`, state the total).

Harm metrics: eighteen files present, every one WebP, 640x400, at or under 25,600 bytes, total bytes stated;
each renders on the `/modules` card at 360 px wide (WebKit iPhone profile, 390x844 and 360, `domcontentloaded`
+ 3.5 s, `scroll-behavior:auto`) with the subject uncropped; if L1 has not landed, a scratchpad harness with
L1's card box, stated as such; live `curl -sI /images/modules/<id>.webp` for all eighteen: 200,
`image/webp`, content-length under 25,600. A probe that returns NaN or an empty list fails loudly.

## Non-findings

The designed fallback (hue gradient + emblem) and the village `imageUrl` override: L1. Card layout, aspect,
`object-fit`: L1. `compress-static-images.mjs` ignoring our folder: leave it, note it. The SPA returning HTML
200 for missing images: report to L1 and the coordinator, do not patch `server/index.ts`. Sprite defects seen
while extracting: written note to the grounds session. Avatars at 50 to 103 KB: out of scope. A reusable
`scripts/gen_module_art.py`: request it, do not add it.

## Tools

`nano-banana-pro` skill (`~/.claude/skills/nano-banana-pro/scripts/generate_image.py`, `--api-key` or
`GEMINI_API_KEY`); `sharp` (app dependency) or PIL; `node scripts/check-image-budget.mjs [--json|
--update-baseline]`; Playwright WebKit for the card probe; `curl` for live; `gh pr merge N --merge`.

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

This lane's values: worktree `wt-r4-art`, branch `wt/r4-art`, migration none. The image ratchet is raised
once, in commit A, reason in the body; commit B may only lower it.

## Report format

Status CODED / VERIFIED / DONE. Tip SHA, PR number. Style-sheet approval: who, when. Eighteen rows: id,
place, bytes, quality, 640x400 yes/no. Total bytes, old and new baseline. Fourteen CI steps named with
pass/fail; local gate outputs; test skip count and duration; mutex use. Card probe: viewport, source (live
`/modules` or scratchpad harness), screenshot paths. Live curl table for all eighteen. Facts for L1: Design 4
and 8. Anything not measured, and why, as the last line.

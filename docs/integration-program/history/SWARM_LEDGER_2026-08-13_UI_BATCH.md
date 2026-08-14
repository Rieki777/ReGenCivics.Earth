# Swarm ledger — Amora UI batch, 2026-08-13

Round G. Seventeen items from Rye's Telegram screenshots, 2026-08-12 12:44 through 23:11.
A NEW ledger. `SWARM_LEDGER.md` (~1600 lines) is the previous round's and is not edited here.

## THE PROTOCOL

Every claim carries the ref it was measured at. "The dock overlaps" is unusable.
"`#maia` sets `bottom:64px` at `grounds-v0.html:605` while `#pbar` holds `bottom:0 height:60px`
at `:607`" is actionable and falsifiable.

## 0 · State, measured 2026-08-13

| | |
|---|---|
| trunk | `6dd5343` "edited_at stops being a column that promises a feature nobody built" |
| at survey time | `e8e8dc9` — **the artifact blob is byte-identical at both**, so every survey line ref still holds |
| deployed | `2026-07-28-wave1-e8e8dc9`, artifact `/grounds/grounds-a1d87aa9f562.html`, 5,459,166 B |
| lane bases | `wt-map-{overlays,org,inspector,geometry}` all fast-forwarded to `6dd5343` |
| discovery | `wf_34d95e41-c3f` — 15 agents, 0 errors, 2.30 M tokens, 59 min |

## 1 · The branch audit, closed

Rye asked to "put those 92+ commits onto main in a healthy way." **The direction was inverted:
`main` was 92 commits AHEAD of `ga-map`.** Across the whole repo only 15 commits on 6 branches
sat outside main, and **every one of them was already landed by content**:

| Branch | Verdict | Proof |
|---|---|---|
| `wt/publish-integrate` | on main | artifact is `v0.8-publish`; `undoPublish`×4, "Live since"×2 |
| `voice-sweep-2026-08-01` | on main | migration `0068` present, messaging present, `nanoid` gone |
| `wt/map-events` | on main | all 7 map files present incl. `patch_d8_publish.py` |
| `claude/auth-token-signing` | on main | HMAC at `server/index.ts:1195`, `timingSafeEqual`×3 |
| `backup/roles-model-c62f614` | on main | identical patch-id (`git cherry` `-`) |
| `claude/sad-dewdney-85cdd8` | **1 docs paragraph unlanded** | `docs/SECURITY_ADVISORIES.md`, 8+/11− |

`ga-map`'s uncommitted work was a **byte-identical duplicate** of landed work, comments and all.

**Done:** `ga-map` reset to trunk (`wt/map-events-retired-2026-08-13`); uncommitted diff preserved
at `scratchpad/ga-map-uncommitted-2026-08-13.patch` (56,783 B); `wt/publish-integrate`,
`claude/auth-token-signing`, `backup/roles-model-c62f614` deleted after their SHAs were recorded
below. `voice-sweep-2026-08-01` could not be deleted, it is checked out by the `game-amora`
worktree, which is the one that holds the Railway link.

**Recoverable SHAs:** `aa34666` · `79b6636` · `19842af` · `93106a7` · `c62f614` ·
`6240a69` (kept, carries the docs paragraph)

**Decision taken:** the docs paragraph rides along with the first UI landing rather than
triggering an eleven-gate run and a production deploy on its own.

## 2 · Rules

1. One lane owns a file. Contamination is per-HUNK. **In `grounds-v0.html`, "hunk" means
   ANCHOR TEXT.** Two lanes are safe there if and only if their anchors are disjoint.
2. **Nothing is hand-edited in `grounds-v0.html`.** Every change lands through a python patch
   script with exact-count anchors: `n=src.count(old); assert n==count; src=src.replace(old,new,count)`.
   An anchor matching zero or two times aborts before a byte is written. That assert is this
   round's conflict detector and is why concurrent lanes are safe at all.
3. Anchor on **code and CSS, never player copy.** Copy is rewritten by voice passes.
4. Scripts guard **per edit, not per script.**
5. `node check_blocks.mjs grounds-v0.html` after every patch.
6. Content attributes a commit. Never timing, never topic.
7. `git merge-base --is-ancestor <sha> origin/main` before declaring work missing.
8. Never `git checkout --` a file you edited but did not stage.
9. Stage files **by name, never a directory.**
10. Land in queue order (§5).

## 3 · Lane registry — six lanes

Grouped by **anchor disjointness**, which here is the operational form of "who must hold the
context". Bases at `6dd5343`.

| Lane | Items | Owns | Blocked on |
|---|---|---|---|
| **L1 Doors & destinations** | 1, 16 | `MODULES` · `DOOR_DEFS` · `openDoor/openModule/doorBtns/doorClick/seedDoors` · `siteNav/siteHref` · all 32 `modules[]` pairs · `homeSheet` JS · `window.LOTS` · App.tsx routes · Housing.tsx · reservation migration | **D-3, D-8, D-9** |
| **L2 Overlay stack** | 2, 3, 4 | **the whole z-index scale (46 literals)** · `#toasts` · `#walkCard` CSS position · `body.pocket.msheet #maia` · `#restoreBar`/`#draftBar` · the pocket block :601-641 · `TOAST_MAX` · the news generator | **D-7, D-11** |
| **L3 Inspector** | 5, 14, 15 | `renderInspect` :3996-4049 · `bindInspect` :4052-4190 · `seatCombo` · all 19 static `<select>` · `#iScale` (write side) · `#iDAdd` door editor · the tips IIFE :5006-5049 · `#inspect` CSS :671-698 | **D-10, D-13** |
| **L4 Land render** | 7, 8 | `PLATE_LEASH` · `platePlace` · `plateBudget` · `solveRotations` · **all of `syncBanners` :2928-3015** · `FAM_SCALE` · `setGScale` · `s.scale` **read** side | **D-18** (item 7 only; **item 8 is clear**) |
| **L5 Roles on the land** | 6, 9, 10, 11, 12, 13 | `refreshBadges` · `BADGE_SLOT`/`badgeRing`/`RING_ROT` · badge CSS :499-537 · the org halo loop · `CIRCLE_COL`/`CIRCLE_HOMES`/`circleHome` · `buildOrgMap` · **`restoreScene` + the export whitelist** · `applyHand` · `orgChart.ts` · `characters.ts` | **D-1, D-2, D-4, D-14..D-17** |
| **L6 Maia** | 17 | `TOUR` · `maiaSay` · `conciergeMatch` · `WALK_SEED`/walkSteps · the intro ceremony · dock **content** · `openPanel`/`goto` · `assistant.ts` · `knowledge.ts` · `check-voice.mjs` SCAN_ROOTS | **D-5, D-6** |

**Deliberately not split** (splitting these costs more than merging them):
- **Items 6, 9, 10, 11, 12, 13 are one decision.** Three roles on Spring Four become three
  satellites whose fill state reads differently. Splitting puts three lanes on `refreshBadges`,
  the seat mark, `CIRCLE_COL`, `buildOrgMap` and one bridge payload. **L5 is the biggest lane
  on purpose.** Its server half and artifact half do not split either: the payload shape is
  the coupling, and two lanes would build opposite ends of one wire.
- **Items 1 and 16 share one anchor set** — the same `modules[]` array, the same `homeSheet`,
  the same `openDoor` link line, the same `MODULES` table.
- **The ACTIVITY dropdown is one item, not two.** Its symptom is an overlay; its anchors are
  all in `renderInspect`. It goes where the anchors are. This dedupe is what makes 18 asks
  into 17 items.

**Item 7 is the one clean split:** the write side is an inspector input (L3), the read side is
a render-loop const (L4), and the two anchors share nothing.

## 4 · Resource registry — one owner each

| Resource | Owner | Verified |
|---|---|---|
| **Patch script family** | **`patch_g*`** — L1 `g1`, L2 `g2`, L3 `g3`, L4 `g4`, L5 `g5`, L6 `g6` | **CORRECTION:** this ledger first said `f`. On disk: **d=19, e=11, f=3, 41 scripts**. `patch_f*` would have collided on its first write. `g` is free (0 matches). |
| **The z-index scale** | **L2, sole authority.** No other lane adds or changes a z value; it requests one. | 46 bare literals, zero custom properties |
| Migration numbers | **L7** (housing availability is the only migration this wave) | **CORRECTION: 0076 IS TAKEN. Next free is 0077.** This ledger first published 0076 as free after checking remote refs, local refs and `Desktop/Amora/*/drizzle/`, and all three said 0075 max. `0076_voice_rates_and_settled.sql` was sitting untracked in **another session's scratchpad** (`…/Temp/claude/C--Users-taren-Desktop-Amora/28150f4a-…/scratchpad/ga-foundation/drizzle/`), outside every worktree, invisible to all three mechanisms. **A fourth holding place exists and the sweep must include every session's scratchpad.** Found by the L7 contract agent before a byte was written. Re-sweep at file-creation time, not at planning time: there is no locking. `drizzle/` is also non-contiguous (gaps at 0064/0065), so `ls \| wc` lies. |
| New CSS class prefixes | L2 `band-` · L3 `insp-` · L4 `plate-` · L5 `role-` · L6 `tour-` · L1 none | |
| SCENE field names | **L5**, because L5 owns the round-trip whitelist | |
| Bridge door names | preflight registers ALL of them in `verify_bridge_doors.js` `COVERED_HERE` at once | it is an allowlist; two lanes appending to one array is the collision |
| `window.BUILD_VERSION` | **no lane's patch script touches it.** Coordinator bumps the point release per landing window. Family pin `v0.8` never changes. | main is `v0.8-publish` |
| `LivingMap.tsx` | `pushConfig` + listener → L6 · `pushHand` → L5 · `siteNav` shim → L1 | |

### 4a · The three traps every lane is briefed on

1. **`restoreScene` (:4193) is a field-by-field whitelist with a far side.** It reconstructs
   each structure from an explicit key list and runs on **every** shell scene push via
   `applyScene`. `scale` survives only because line 4203 says
   `if(r.scale&&r.scale!==1)s.scale=r.scale;`. **Any new per-structure field added without a
   matching line at :4197-4210 is silently dropped on the first publish/restore round trip.**
   Verified by reading the function. This is the highest-risk region in the file and **L5 owns
   it**; every other lane files a field request rather than writing there.
2. **The boot affine rewrites coordinates destructively.** `AF={sx:0.58,sy:0.72,dx:800,dy:110}`
   and `migrate()` overwrite `s.x`/`s.y` at boot, **anisotropically**. The x/y literals in
   `SCENE.structures` are NOT what anything draws at. Any ring or spacing geometry computed
   from the source literals is wrong by 1.39x–1.72x depending on direction. **L4 and L5 both
   need this before writing a line.** Verified at :1235-1249.
3. **`$('restoreBar').style.display='flex'` appears TWICE.** Never anchor on it. Use
   ``restoreMsg').textContent=`Saved work found`` for owner A and
   `restoreYes').textContent='Open my draft'` for owner B.

## 5 · Landing queue

**0 · PREFLIGHT (coordinator, not a lane).** Register every new bridge door name in
`qa/verify_bridge_doors.js` `COVERED_HERE`; allocate the migration number; reserve `patch_g*`.
*Forced first because two lanes each add a bridge door and would otherwise edit one array, and
because a migration collision has already shipped once here.*

| # | Lane | Why this position |
|---|---|---|
| 1 | **L2** Overlay stack | no dependencies. **Must precede L6** — if L6 lands first it invents a fourth `bottom:` literal in the band L2 is about to replace |
| 2 | **L4** Land render | no dependencies. **Should precede L5** — L4 owns `syncBanners` including the badge-plane offset and the near/far gate; landing after L5 moves the geometry L5 tuned against. Plate drift also makes every later screenshot readable, so it pays for itself |
| 3 | **L3** Inspector | no code dependency. Gated only on D-10 and on somebody taking the ACTIVITY screenshot |
| 4 | **L1** Doors | artifact half unblocked once D-3 lands; site half needs the migration number and D-8 |
| 5 | **L5** Roles | needs preflight, L4, and D-1/D-2/D-4. Internal order forced: server payload → bridge → artifact render |
| 6 | **L6** Maia | needs L2's band, preflight, and D-5. Lands last: it is the only lane whose output is a new surface sitting inside someone else's fixed layout |

## 5a · Wave 1 outcome and the two coordinator rulings

| Lane | Verdict | Why |
|---|---|---|
| **L2 overlays** | **ACCEPT, integrated at `836ee24`** | 26px overlap becomes an 8px gap on WebKit at 390x844 |
| L1 doors | REJECT | **XSS sink**: `bindDoor` stores the RAW route while `realRoute` canonicalises only for the membership test, and the new card interpolates it into both an `href` and an `onclick`. A stored-payload shape, since `restoreScene:4204` reads it on every shell push. Plus: the 17 data edits live only in the seed literal, so **a village that already published gets all 16 broken routes back**; and 19 of 32 founder label boxes now show machine keys that silently unbind when edited, which the new gate cannot see because it never asserts how many doors are bound. |
| L3 inspector | REJECT | **An 8th gate nobody ran.** `qa/verify_publish.js` is RED (exit 1, 2 FAIL): the action name is built by concatenation so the gate's source-literal scrape sees a verbless prefix, and the new verbs went into the artifact's `EDIT_VERBS` but not the site's in `shared/mapScene.ts:227`. Plus `SCENE.housing` is **destroyed** by `restoreScene`, not stale, on every shell push. |
| L7 housing | REJECT | `allRows` returns the EFFECTIVE taken and the PUT writes it back as STORED, so renaming a hamlet **destroys the founder's typed number**, and a reservations row whose live count exceeds total becomes **permanently un-editable** (the only input that could reduce it is disabled). Plus the public reservation POST is an unauthenticated unbounded INSERT while `POST /api/forms/submit` 8,600 lines above has both a honeypot and a rate limit. |

**RULING 1.** `restoreScene :4197-4210` is L5's, and **L5 has not started**. L3 is granted the single
whitelist line for `SCENE.housing`, and only that line. No other lane writes there.

**RULING 2.** `server/lib/housing.ts` is L7's and its defect is inherited by L3's builder-mode
fields. Agreed contract so both build in parallel: **`HousingRow` gains `storedTaken`**, the
founder's typed number; `taken` stays the effective value for display; **both founder surfaces write
`storedTaken`, never `taken`.**

## 5b · The test-suite crisis, root-caused and fixed 2026-08-14

**It was infrastructure, not test code.** `TEST_DATABASE_URL` pointed at a **remote Railway MySQL**
(`sakura.proxy.rlwy.net:50483`): 47 ms average RTT, 408-836 ms per TCP connect. Every DB-backed
suite provisions a fresh scratch schema and applies all 73 migrations before its first assertion.

```
server/ledger.test.ts, 21 tests, identical pass on both engines
    remote Railway MySQL   168 s
    local MariaDB :3307     16 s        10.5x
all 73 migrations, ONE pooled connection (how migrate.ts runs)
    remote  46.8 s  ->  local 6.1 s     7.6x, 40 s saved per provisioning
```

Installed `MariaDB.Server` 12.3.2 via winget on **port 3307** (avoiding any 3306 collision), and
repointed all nine worktrees, each keeping its previous value as `.env.remote-backup`.

**Checked before switching, not assumed:** all **73 migrations apply to MariaDB, zero failures**;
migrations declare only `CHARSET=utf8mb4` and pin no `COLLATE`; nothing uses MySQL-8-only syntax.

**THE CAVEAT, same shape as the Node 22 vs 25 one:** production and CI are **MySQL 9.4.0 with
`utf8mb4_0900_ai_ci`**; MariaDB 12.3 defaults to `utf8mb4_uca1400_ai_ci` and cannot provide MySQL's
collation at all. **A local green is not a CI green for anything collation- or engine-specific.**
Point `.env` back at `.env.remote-backup` to confirm against the real engine.

**Second cause, smaller and being fixed by the TS lane:** 109 fixed `waitForTimeout` calls totalling
**76.9 s** across the 8 artifact suites against 3 state-waits, so roughly half of their 146 s wall
clock is literally sleeping. The `until()` helper already exists in `verify_doors.js`.

**Paid, by me, benchmarking it:** the first measurement spawned a fresh `mariadb` client per file
and so measured process startup, reporting a misleading 3x. `migrate.ts` uses ONE pooled connection.
Measure the thing the way the code runs it.

## 5c · Foundation lane

Its session went idle with **5 commits, 2027 insertions, 0 behind main**: `voiceClaim.ts` (597),
`voiceClaim.test.ts` (637), migration `0076_voice_rates_and_settled.sql`, `Mint.tsx` +257,
`server/index.ts` +217, `shared/gameVariables.ts` +55. All absent from main by content; `0076` does
not collide.

Its worktree lives in **another session's scratchpad**
(`…/28150f4a-…/scratchpad/ga-foundation`), which is exactly why the migration sweep could not see
`0076` and why that session held the only `.env` with `TEST_DATABASE_URL`. I cut `wt/foundation-land`
at the same tip rather than touching its tree, and copied the `.env` in — **without it the 637-line
economy test would have skipped silently while printing a pass**, landing 597 lines of untested
ledger code against invariants that must hold (per token, SUM(balance) over all accounts ≡ 0;
`token_balances` recomputed, never incremented; faucet-issued tokens never swappable).

## 6 · Open blockers

| # | Blocker | On whom | Needs |
|---|---|---|---|
| **B0** | **Alchemy RPC key** on the public home page for eleven days. Leak closed, row redacted, **key still not rotated.** Carried from `FOR_RYE_2026-08-11.md` §0. | Rye | rotation |
| B1 | **20 decisions** block five of six lanes. Full list in `FOR_RYE_2026-08-13.md`. | Rye | answers, or "all recommendations" |
| B2 | **D-11 is one console line** and decides whether L2's pocket work aims at a state that was never active | Rye | `document.body.classList.contains('pocket')` |
| B3 | **D-13 needs a screenshot** nothing can automate — the native select popup renders in the OS top layer, outside the document | Rye | one screenshot at ≥1400px |
| ~~B4~~ | ~~`check-hyphen-dash.mjs` not wired into CI~~ **CLOSED** at `bc56e36` on `wt/map-org`, awaiting landing | — | — |

## 7 · Gate set

Read from `.github/workflows/ci.yml` at `e8e8dc9`, 2026-08-13. **Eleven gates, all must pass.**

```
pnpm install --frozen-lockfile
pnpm check                                # tsc --noEmit, EXCLUDES **/*.test.ts
npx tsc -p tsconfig.tests.json --noEmit   # the tests pnpm check cannot see
node scripts/check-brand-refs.mjs         # read the EXIT CODE, its last line is blank on failure
node scripts/check-voice.mjs
node scripts/check-auth-fetch.mjs
node scripts/check-artifact-budget.mjs    # the living map stays out of dist
pnpm build
pnpm test
<inline bundle budget>                    # MAX_MAIN_JS_KB 700 · MAX_TOTAL_DIST_KB 6000 · MAX_SINGLE_IMAGE_KB 400
pnpm audit --prod --audit-level high
```

**CI runs Node 22; this machine runs 25.x.** Every local gate therefore runs three majors from
the one that decides. Check `npm view <pkg> type` alongside `engines` before adding a
dependency, and treat any ESM-only package as needing a CI run before it is believed.

### The artifact's own gates, which CI does not run

```
cd docs/prototypes && source qa/env.sh
node check_blocks.mjs grounds-v0.html   # all 3 inline script blocks parse
node qa/verify_doors.js · verify_features.js · verify_badges.js · verify_loom.js
node qa/verify_skin_bridge.js · verify_vocab_bridge.js · verify_bridge_doors.js
node qa/_dump_scene.js out.json && node qa/check-schema.js out.json
```

`verify_bridge_doors.js` section D **fails on any message door no gate drives.** Deliberate.
These suites hold 111 `waitForTimeout` calls and zero `waitForFunction` outside three fixed
spots; copy the `until()` helper from `verify_doors.js` when you are in one.

## 8 · Changelog

| ref | what | proof |
|---|---|---|
| — | round opened | trunk `e8e8dc9`, live `wave1-e8e8dc9`, artifact 5,459,166 B, read 03:44 |
| — | branch audit closed | 6 branches content-attributed; 3 deleted, `ga-map` reset, 1 docs paragraph held |
| — | discovery landed | `wf_34d95e41-c3f`: 150 findings, 36 refuted, 44 unmeasured, 46 questions deduped to 20 |
| — | trunk moved | `e8e8dc9` → `6dd5343` → `1428603`; artifact blob identical at all three, so no survey ref invalidated |
| — | deploy provenance **PROVEN** | the deployed artifact's sha256 is `a1d87aa9f562…`, byte-identical to `origin/main`'s blob, and the served filename `grounds-a1d87aa9f562.html` IS its own hash prefix. Previously listed as unproven. |
| `bc56e36` | dash guard wired into CI, on `wt/map-org`, not yet landed | watched RED first: a probe carrying `covenant-a`, `sustain-we`, `matters-not` returns exit 1 and names all three; `well-being`/`decision-making` stay clean; `thank-you` allowlist holds; exit 0 after removal. Repo clean at this ref. |

## 9 · Paid lessons, this round

- **A worktree's name says nothing about its ref.** `ga-map` is the map lane's worktree and was
  the worst possible base for map work. One command caught it: compare the artifact blob size
  against `origin/main`.
- **Read the direction of `git rev-list --left-right --count A...B`.** `92  2` meant main was
  ahead. Reading it backwards would have inverted the whole round.
- **`--stat A...B` diffs from the merge base, so its numbers include work the OTHER side gained.**
  A 3,190-line stat read as "3,190 lines missing from main" when the true answer was zero.
  `git cherry` matches by patch-id and is the right instrument; then confirm each `+` by content,
  because a rebased or squashed landing still shows `+`.
- **Git Bash mangles `ref:path`.** `git show origin/main:.github/workflows/ci.yml` turned the
  colon into a semicolon and returned nothing — the gate set came back EMPTY and would have read
  as "no gates". Use PowerShell with `git cat-file -p`.
- **`grep` on this artifact prints megabytes of base64.** Filter `awk 'length($0)<400'` first.
- **A resource registry entry written from a handoff rather than from disk is a guess.** This
  ledger assigned `patch_f*` from the map handoff's list of `d1..d8`. Disk held 11 `e` scripts
  and 3 `f` scripts. The first lane to write would have collided on filename.
- **A migration number has a FOURTH holding place: another session's scratchpad.** All three
  documented mechanisms said 0075. `0076` was held by an untracked file in a different session's
  temp checkout, outside every worktree, so `git worktree list` could not reach it and a
  `Desktop/Amora/*/drizzle/` glob could not see it. **A sweep that misses a mechanism does not
  report uncertainty; it reports a free number.** Sweep every session scratchpad, and sweep again
  at file-creation time rather than at planning time, because nothing locks a number in between.
- **A VALUE WITH A FALLBACK CANNOT FAIL VISIBLY, AND THE COORDINATOR'S OWN PROBE PROVED IT.**
  L2's band publishes `--band-b-toasts` / `--band-b-maia` on the root, and the tenants read them
  with **the old hard-coded literals as fallbacks**. My verification probe drove the pocket pile,
  measured the rects, found them byte-identical to pristine, and reported **"NO CHANGE, L2 did not
  move this"** against a fix that works. Unset and set-to-the-old-value render identically.
  Calling `window.bandLayout()` explicitly published `357px` / `70px` and the 26px overlap became
  an 8px gap. Two rules, both general: **assert on the VAR, never only on the rendered result**;
  and **a synthetic drive that sets `style.display` bypasses whatever the real opener triggers** —
  drive through the app's own entry point or state plainly that you did not. The probe now reports
  an unset var as UNMEASURED rather than as no-change.
- **A FIX MIGRATES ITS DEFECT INTO THE LAYER THE METRIC CANNOT SEE.** L4 has now been rejected
  three times and the shape is identical each time. Pass 1 optimised distance-to-ANCHOR when the
  complaint was gap-to-the-BUILDING. Pass 2 fixed that honestly (gIcon 12.5 to 0.25, verified to
  the decimal by two reviewers) and buried the defect one layer out: **nothing had a viewport
  term**, so plates walked off the right edge of the phone, 17 readable plates became entirely
  invisible, and **the metric scored an off-screen plate as a perfect 0.0** because it had no
  viewport term either. Burial under the bar traded for burial past the edge.
  **The rule this produces: when a measurement and the thing it measures are both authored by the
  same pass, the measurement's blind spot IS the next defect's hiding place.** Pass 3 was ordered
  to fix the metric first and re-score the previous pass with it, before writing a line of code.
- **"Computed, saved, never printed" recurred in the report written to answer it.** Pass 1 was
  rejected partly for computing `gIcon` and printing none of it. Pass 2 printed `gIcon` in full,
  then did exactly the same thing with `ink`: printed only its max, which fell, while the per-frame
  value ROSE in 70 of 120 frames. An aggregate that hides its distribution is the same defect
  wearing a different hat.
- **The adversarial pass earns its cost on mechanically perfect work.** L4 pass 1 had verified
  anchor counts, re-runnability proven from the pristine blob to a byte-identical hash, zero
  boundary violations and six green gates, and it was still rejected twice: it optimised
  distance-to-anchor when the complaint was gap-to-the-building, and it buried a district plate
  97% under the vitals bar. **The gate suite was byte-for-byte insensitive to the whole diff**
  (112 PASS / 0 FAIL identically before and after), so the only evidence available was the
  measurement, and the measurement had quietly dropped the column that mattered.
- **Seven of eight agents in the first build wave died on a weekly usage limit, not on the work.**
  A workflow resumed with `resumeFromRunId` replays completed agents from cache, so the one that
  finished (the housing contract) cost nothing the second time. Check the failure reason before
  re-planning: a quota failure looks nothing like a task failure and needs no redesign.

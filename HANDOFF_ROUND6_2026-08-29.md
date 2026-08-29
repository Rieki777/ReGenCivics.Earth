# HANDOFF — round 6, written 2026-08-29 at dispatch

**Everything below is verified, not remembered. Re-verify anything older than an hour.** Read
`INTEGRATION_LEDGER.md` first: §7 changelog newest at the top, §8 rulings R1 to R60, §9 paid lessons.
This file is the volatile state a summary would drop.

---

## 1 · State at writing

- **game-amora `origin/main` = `b5bed01`.** Live `/health` reports build `2026-07-28-wave1-b5bed01`,
  so **live and the tree agree exactly.** Measured 18:35 UTC.
- **No PR is open.** Round 5 merged #62 through #90 and nothing has merged since.
- **The four branches `git branch -r --no-merged` reports are stale checkouts, and NOTHING IS LOST.
  Checked and closed 2026-08-29.** `origin/wt/doors` and `origin/wt/housing` are content-identical
  to main by `git cherry`. `origin/wt/r5-budget` carried one commit `git cherry` marked `+`
  (`a063ee8`, the CI budget logging), and **its unique content is in main by grep against a
  known-present control** (its `::warning::du -sk says` line and its `the script modelled` line each
  appear once in main's `ci.yml`, control `MAX_TOTAL_DIST_KB` appears five times). `origin/wt-r4-qa-2`
  holds round-4 persona probe scripts that were never meant to land. **Do not re-open this.**
- Coordinator home unchanged: `C:/Users/taren/Downloads/regen-integration` on `wt/integration`,
  docs only, pushed. **NEVER work in the primary `game-amora` checkout** — it is parked on
  `voice-sweep-2026-08-01`, runs far behind main, and carries seventeen dirty files. Read
  `origin/main` with `git show origin/main:PATH`.
- **No node processes were running at session open**, so round 5 left no orphaned background jobs
  behind. `.test-lock` was free. Local MySQL is up on **3307**.

## 2 · Lanes, as of 2026-08-29 late

**The three R60 QA passes are COMPLETE.** All twenty-two of their findings are routed in
`docs/integration-program/round6/QA_TRIAGE_2026-08-29.md`, which is the file to read before
touching any of this. **Nothing is unrouted.**

| Lane | Worktree / branch | State |
|---|---|---|
| QA-1 the member's eyes | `wt-r5-qa1` @ `b5bed01` | **REPORTED.** 2 HIGH / 5 MED / 4 LOW. Probes at `3e9774b`, `26365a1`, unpushed |
| QA-2 the adversary | `wt-r5-qa2` @ `b5bed01` | **REPORTED.** 4 HIGH / 1 MED, 72 attacks over 8 invariants. Probes at `5b9ac86`, unpushed |
| QA-3 the operator and fork | `wt-r5-qa3` @ `b5bed01` | **REPORTED.** 3 HIGH / 4 MED / 4 LOW. Probes at `a8eb803`, `99fe007`, unpushed |
| INVESTOR | `wt-r6-investor` / `wt/r6-investor` | **VERIFIED. PR #91, CI green on `bf2387c` (both runs), MERGEABLE CLEAN. HELD on landing authority.** Migration 0104 taken |
| G-D the record and the seat | `wt-r6-gd` / `wt/r6-gd` | **VERIFIED. PR #92, CI green on `0152eda` (both runs), MERGEABLE CLEAN. HELD.** 22 found / 15 fixed / 1 refused / 1 deferred / 5 left alone. **Must land BEFORE G-E** |
| G-E lineage, not credit | `wt-r6-ge` / `wt/r6-ge` | Running. Migration **0102**. Two addenda |
| CYCLE | `wt-r6-cycle` / `wt/r6-cycle` | Running. Migration **0105**. The two-cycle-id split |
| MINT | `wt-r6-mint` / `wt/r6-mint` | Running. Migration **0106**. One addendum (renamed token) |
| FORK | `wt-r6-fork` / `wt/r6-fork` | Running. Migration **0107** if needed. Two addenda (bootstrap + runbook, the four broken images) |
| SIGNPOST | `wt-r6-signpost` / `wt/r6-signpost` | Running. **No migration.** One addendum |

Plus `wt-r6-base`, detached at `b5bed01`, the coordinator's clean measuring instrument. **It has no
lane and must stay pristine.**

**Migration allocations this round: 0102 G-E, 0103 SKIPPED FOREVER, 0104 INVESTOR (taken), 0105
CYCLE, 0106 MINT, 0107 FORK if needed. Next free is 0108.**

**A lane broke the `.test-lock` and deleted a sibling's, causing a cascade between roughly 19:10 and
19:28 UTC.** It disclosed this itself. G-D and G-E were warned. Any suite failure in that window is
contention, not a regression.

## 3 · The measured baseline. Judge no lane against anything else

Run cold on the pristine `wt-r6-base` worktree at `b5bed01`, 2026-08-29. **All fourteen script gates
PASS, and every one reports a non-zero check count**, so none is silently seeing nothing.

```
check-brand-refs          60 legacy reference(s) in code, BASELINE 63   <- THREE OF HEADROOM
check-voice               clean across 626 file(s), 2 waiver(s)
check-hyphen-dash         0 hyphen(s) standing in for a dash
check-auth-fetch          339 route prefixes refuse strangers with 401
check-admin-reach         0 orphan admin write route(s)
check-save-honesty        5 waiver(s), 7 call(s) whose method this CANNOT READ
check-repo-payloads       every payload names every column its table requires
check-mirror-annotations  every hand-kept map keyed on a server union is annotated
check-upload-strip        clean across 114 server file(s)
check-artifact-budget     disk 81% of budget, wire 80%
check-doc-links           38 reference(s) across 6 document(s) all resolve
check-route-reachability  every route has 2 or more ways in
check-map-routes          SITE_PAGES and the router agree, route for route
check-image-budget        55 WebP or AVIF, 2 allowed exceptions, per-file cap 400 KB
```

**Four were watched going red on a deliberate violation naming the exact probe, then green again:**
`check-upload-strip`, `check-hyphen-dash`, `check-doc-links`, `check-voice`. The other ten rest on
their non-zero counts alone, which is weaker.

**CLOSED 2026-08-29 by #91 and #92's green pull_request runs, which build the branch already merged with main and so exercised the whole set over trunk twice from two branches. Previously recorded as NOT MEASURED:** `pnpm check`,
`tsc -p tsconfig.tests.json`, `pnpm build`, `pnpm test`, the bundle budget, and `pnpm audit`. They
were skipped deliberately, because a full suite from the coordinator while six lanes share one local
MySQL and one machine is the exact cascade the round-5 lessons warn about. **Somebody must measure
them on a quiet tree before this round closes.**

**Full CI gate list at `b5bed01`: eighteen `run:` steps plus the bundle block.** The ledger's §5 has
been corrected; `node scripts/module-facts.mjs` is the authority over both.

## 4 · What I corrected on the way in, so nobody re-inherits it

Five claims this program was carrying that are false at `b5bed01`:

1. **The investor packet's document links are NOT cached one-year-immutable.** That branch covers
   `image/`, `font/` and `audio/` only; PDFs and unknown types get `private, no-cache`. **The leak
   itself is real and verified** — `investorDocsRepo.all()` unfiltered, emailed to whoever fills a
   public form.
2. **The brand ratchet has 3 of headroom, not zero.** 60 against a baseline of 63; round-5 lanes
   removed three. Every brief in this program has said "63/63, zero headroom" since `1428603`.
3. **`check-hyphen-dash` is not an em-dash gate.** It catches a hyphen standing in for a dash
   (`word-not`) in `client/src` only. The no-em-dash rule belongs to `check-voice`, which scans
   `shared/` literals, `server/seeds/**.json` and `docs/knowledge/*.md` and deliberately leaves
   every other `docs/` file alone.
4. **`DB_HEAVY = 420_000` in `server/voiceClaim.test.ts` is a documented ceiling, not an
   un-reverted workaround.** There is no TODO. The comment says *"Raised, never lowered. A local
   override BELOW the global is the trap that cost another lane a day."* **Lowering it would re-pay
   that.** What is stale is its justification, which cites a Railway proxy at ~240ms while the suite
   now runs on local MySQL. Fix the comment when a lane is next in the file.
5. **The Base token name and symbol ARE read live from Base.** `server/lib/base-reads.ts`
   `readTokenIdentity()` does three `readContract` calls, refuses an implausible `decimals()` and a
   blank name or symbol, and has callers in `server/index.ts` plus seven references in
   `hypha.test.ts` (proven against a `readOnchainBalance` control in the same command). Only the
   mainnet path is unexercised, and that needs a key from the founder.

**And the trap I paid for myself:** three of my four gate-falsification probes were wrong before one
was right, and **each wrong one produced a clean green that read exactly like a hole in the gate.**
A falsification that stays green is a claim about your probe first. Compounding it, my first pass
measured gate output with `wc -l`, which returns 0 for a single line with no trailing newline, so I
read six gates as printing nothing when each printed its count. **The instrument I was using to hunt
silent zeros was producing one.**

## 5 · Addenda sent to running lanes (R51: add to the lane that holds the file)

| Lane | Addendum | Content |
|---|---|---|
| QA-1 | 1 | Two known non-findings: the profile's absent inventory is deliberate; the two gratitude routes with different caps are an open founder decision |
| QA-2 | 1 | Probe **co-signed manual grants** (over 100 or any self-grant should need a second steward, specified and recorded unbuilt). And: if the two gratitude routes let anyone exceed both caps, that IS a high finding |
| QA-3 | 1 | Add a fifth class **NEVER BUILT**, distinct from a screen that lies. The Mint's token-type editor is the named example |
| QA-3 | 2 | `check-save-honesty` names its own blind spot in its passing line: 7 calls whose method it cannot read. Find them |
| INVESTOR | 1 | The measured baseline; `check-upload-strip` is proven live and will catch you |
| G-D | 1 | The ratchet has headroom; **neither voice gate scans `client/src` prose**, so the copy rewrite has no automatic check behind it |
| G-E | 1 | Four worked examples of a gate proven red-on-violation; and suspect your probe before you suspect your gate |

## 6 · Migration numbers, allocated by the coordinator

Four-way scan on 2026-08-29 found **only `0101_module_usage.sql`** in the 01xx range: on
`origin/main`, on every remote ref, on every local ref, and in the drizzle directory of every `wt-*`
worktree on disk.

- **0102** → Lane G-E, `0102_objection_lineage.sql`.
- **0103** → **DELIBERATELY SKIPPED AND NEVER TO BE ALLOCATED.** The r5-eight / r5-glass sweep
  labelled itself "0103" in about forty `server/index.ts` comments and in
  `glassHandle.routes.e2e.test.ts`; a migration by that number would read as that sweep's migration
  to every future reader. Gaps cost nothing (0094 and 0100 are already gaps) because the applied
  ledger keys on filename.
- **0104** → Lane INVESTOR, only if a new column is genuinely needed.
- **Next free after this round: 0105.**

## 7 · Hazards specific to right now

- **`scripts/qa-scratch-db.mjs` hardcodes `SCHEMA = "village_qa"`.** Three parallel QA passes running
  it as shipped would drop each other's database. The lanes run their own copies against
  `village_qa6_1/2/3`. **Drop only an exact schema name, never a `LIKE` pattern.**
- **Three lanes are inside `server/index.ts` at once** (28,650 lines), in zones the briefs name by
  route string. INVESTOR: `/api/admin/investor-docs` through `/api/admin/investor-summary`. G-E: the
  objection routes plus `mechanics/:id/open-ballot`. G-D: the org/seat region,
  `/api/game/progression`, and `GET /api/governance/ballots/:id`. **Expect the second and third
  merges to need a resolve pass, and route each back to the lane that owns the semantics.**
- **`Admin.tsx` is ~9,000 lines** and INVESTOR holds one tab of it.
- **`pnpm build` can return exit 0 while the libuv abort fires**, leaving `dist/index.js` at the
  previous commit. Only honest check: `grep -c "$(git rev-parse --short HEAD)" dist/index.js`.

## 8 · Owed at close-out, in order

1. **The three QA reports triaged into a fix wave with disjoint zones**, then the fixes landed. R60
   says the session closes only when their findings are fixed.
2. **The gates §3 lists as NOT MEASURED, measured on a quiet tree.**
3. **Drop the leftover scratch schemas `village_examples` and `village_probe` and delete
   `.demo-db-url`** from the primary checkout. Deferred deliberately: dropping schemas while six
   lanes hold three of their own is how a sibling's database gets eaten. Do it when the tree is
   quiet, by exact name.
4. **Sweep for orphaned background processes by CREATION DATE**, never by name or command line. On
   Windows a `CommandLine` filter always matches the process asking, so filter on
   `Name = 'node.exe'`. There were none at session open; a day-long swarm leaves them every time.
5. **§3b of `docs/FOUNDATION_HANDOFF_2026-08-11.md` still needs a lane** for the three items not
   folded into QA-2: the profile inventory question, the Moon Ledger recap card, and the Mint's
   token-type editor. Related spec material is in `docs/prototypes/FOUNDATION_BUILD_2026-08-10.md`,
   `PROFILE_BUILD_1_2026-08-10.md` and `SITE_ECONOMY_PROFILE_2026-08-09.md`. **This item was raised
   to a coordinator four times in round 5 and dropped silently each time, because nobody could find
   the document. It is found now.**
6. **The founder's fourteen open decisions**, listed in the session report and unchanged until he
   answers.

## 9 · Everything else that is unbuilt or found-and-not-fixed

Unchanged from the round-5 handoff and the round-6 opening prompt: the copy editor (Part B of the
round-4 plan, still the systematic fix for a dozen pages a founder cannot touch), the audio layer's
missing CC0 assets, `member.vouch` gating nothing, the refusal on transferring `ballot.vote` **which
is correct and must not be "fixed" without reading its reasoning**, the reader half of the payload
class having no static gate, `ProjectHistory`'s localStorage-only fields, the four hand-rolled
sign-in cards' `loading` bug, the four core modules being unmetered, and the map's badge-over-roof
tap which is **left deliberately** because 44px is the accessibility floor.

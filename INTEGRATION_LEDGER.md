# INTEGRATION_LEDGER — ReGen Civics module library program

Long-lived, committed, spans rounds. Volatile session state lives in `HANDOFF_NEXT_COORDINATOR.md`.
Program documents: `docs/integration-program/INDEX.md`.

> **THE PROTOCOL: every claim carries the ref it was measured at.** "Lane C is done" is unusable.
> "C1 landed at a1b2c3d, eleven gates green, 794 passed / 19 skipped against a pre-change baseline
> of 19, CI run 12345 green on that SHA" is actionable and falsifiable.

> **Done-vocabulary** (house, from regen-ship-gate): **CODED** = edit in the file, read back.
> **VERIFIED** = behaviour confirmed, all gates green, evidence attached. **DONE** = observed live.
> No evidence means the status stays CODED. "Agent reported success" is not evidence.

---

## §0 State, measured 2026-08-14 19:53 EDT

| Repo | Checkout | Trunk ref | Fetched | Deployed marker | CI file blob | Coordinator worktree |
|---|---|---|---|---|---|---|
| ReGenCivics.Earth (hub) | `C:/Users/taren/Downloads/regen-civics-clean` (primary, on `ship-rite-truth`, 87 dirty — DO NOT WORK THERE) | origin/main `55cff89` | 2026-08-14 (worktree script) | NOT PROBED this session (`pnpm railway:deploys` to measure) | ci.yml `8b68747` | `C:/Users/taren/Downloads/regen-integration` @ `55cff89`, branch `wt/integration`, clean, `.env` present, node_modules PARTIAL (install interrupted by machine sleep — rerun `pnpm install --prefer-offline` before any hub gate run) |
| Amora-Game (game-amora) | `C:/Users/taren/Desktop/Amora/game-amora` (primary, on `voice-sweep-2026-08-01` @ 79b6636, 52 dirty — DO NOT WORK THERE) | origin/main `28dace2` | 2026-08-14 ~19:20 EDT (FETCH_OK) | NOT PROBED this session | ci.yml blob `ac1b1e9` @ 28dace2 | n/a (coordinator never edits game-amora) |

**Lane base refs:** lanes A/C/S cut from `origin/main` = **`28dace2`**. UPDATE 2026-08-14 ~22:20:
main is now **`8e02dd0`** (Lane A landed, rebased over docs-only `8f46c00`). Lane C rebases onto
this at its landing turn.

**Base drift, measured:** program docs were verified at `1428603`. `1428603..28dace2` = 6 commits
(voice/mint/messaging + collation pinning). Changed among lane-critical files: `server/index.ts`
(+279 lines — **every line-number anchor in the lane specs for that file is suspect; re-locate by
content**) and `drizzle/0076` (foundation-economy merged). Byte-unchanged: `CLAUDE.md`,
`.github/workflows/ci.yml`, `scripts/check-brand-refs.mjs`, `shared/modules.ts`,
`server/lib/assistant.ts`, `secrets.ts`, `villageReaders.ts`, `villageBrain.ts`, `knowledge.ts`.

game-amora worktree count at measurement: **30** (includes other sessions' scratchpad worktrees —
they count as migration-number holders, §3).

**UPDATE 2026-08-16 08:13 EDT (round 4 open, coordinator re-measured):** game-amora `origin/main` = **`135db66`**
(PR #15 e2e-audit-race, on top of `25f08eb` map overlays/plates/journey PR #12), live `/health` build
`2026-07-28-wave1-135db66` MATCHES. Hub `origin/main` = `cbec306` (unchanged since handoff). `gh pr list`
game-amora: none open. game-amora worktree count **52**. **Concurrent session ACTIVE**: `wt-doors` (26 dirty),
`wt-housing` (13 dirty, carries `drizzle/0077_housing_availability.sql`, the gap number), `wt-map-inspector`
(11), `wt-map-org` (3), `wt-map-overlays` (3), `wt-map-geometry` (2), `wt-maia` (0), all cut at `25f08eb`
07:51–08:08 EDT, none pushed, patching `docs/prototypes/grounds-v0.html` (= live `/map`, served by
`server/index.ts:18524`). Nothing of ours in flight. Read-only scout worktree `wt-r4-scout` (detached at
`135db66`) created for round-4 grounding; remove it at dispatch. Migration numbers: main ends `0082`; `0077`
gap being filled by wt-housing; `0080` reserved; round 4 allocates from `0083+` after the four-way scan.

**UPDATE 2026-08-16 12:56 EDT (90-minute check, R30):** game-amora `origin/main` = **`3c295b8`** (PR #16 inspector
+ PR #17 size dial merged), live `/health` build `2026-07-28-wave1-3c295b8` MATCHES. `gh pr list`: none open.
The other session's worktrees were REBASED onto `3c295b8` and are still being worked (dirty counts grew):
`wt-doors` 29, `wt-map-org` 28, `wt-housing` 14, `wt-map-overlays` 7 (all at `3c295b8`); `wt-map-geometry` 2
and `wt-map-inspector` 11 still at `25f08eb` (inspector is spent, its tracked edits merged in #16). No go
signal received. Scout worktree `wt-r4-scout` re-cut to `3c295b8`. Round-4 briefs (10) drafted under
`docs/integration-program/round4/briefs/`; the cross-brief review agent hit the session limit and is re-run
before the colliding lanes dispatch (R32).

---

## §1 Rules

House (from the swarm-supervisor skill, verbatim):
1. One lane owns a file. Contamination is per-HUNK, not per-file: disjoint hunks are safe.
2. Content attributes a commit. Never timing, never topic.
3. `git merge-base --is-ancestor <sha> <trunk>` before declaring work missing.
4. A green covers only the steps that actually reached. Read skip counts and durations.
5. Land in queue order (§4). Rebase, never delete another lane's work.

Program (Addendum 1 §3):
6. No lane commits to both repos. A cross-repo item is two items with an ordering constraint.
7. No listing advances past a stage whose exit-gate artifact cell in §3a is blank.
8. Commit by pathspec (`git add <paths>` / `git add -p`), never `git add -A` or `git add .`.

Standing guards (Addendum 1 §5):
9. **Stale-base re-dispatch:** no dispatch and no "not implemented" claim without a grep against
   `origin/main` at a named SHA recorded in §0.
10. **Coordinator is not a lane.** Sanctioned coordinator writes are enumerated in §8-R4. Every
    other write is a rule violation logged in §9.
11. **Evidence-free done:** the done-vocabulary above. Lane reports carry file:line, the literal
    gate output line, and the ref.
12. **Reverting another lane:** per-hunk contamination check, pathspec staging, ask the Owns
    column before planning a change to a contended file.
13. **Vendor conversation outruns its gate:** refuse to schedule build work for a listing whose
    §3a stage-1 and stage-3 cells are empty, and say so to Rye in writing.
14. **Stale gate set:** §5 blocks are SHA-stamped and re-read at every session open. Do not take
    the gate list from anyone's memory, including this ledger's previous author.
15. **Attribution confidence rule** (Addendum 2 fix 3): attribution requires a recorded fact that
    discriminates between outcomes. If two or more outcomes are consistent with the evidence, or
    the newest relevant record is older than the liveness window, state what was observed, decline
    to attribute, route to ReGen Civics. **Never route to a vendor on inference.**

---

## §2 Lane registry

| Lane | Repo | Worktree / branch | Session | Owns | Status | Last ref | Liveness verified |
|---|---|---|---|---|---|---|---|
| Coordinator | hub | `regen-integration` / `wt/integration` | this session | ledger, handoff, decision list, `docs/integration-program/`, ADR-49 + DOMAIN-LANGUAGE entries | active | 55cff89 | 2026-08-14 19:53 |
| **L1a — catalog art** (round 4) | game-amora | `C:/Users/taren/Desktop/Amora/wt-r4-art` / `wt/r4-art` | background agent, dispatched 2026-08-16 ~13:05 EDT from `3c295b8` | `client/public/images/modules/**`, `scripts/image-budget-baseline.json` (raised once, R28 item 4) | dispatched | 3c295b8 (base) | — |
| **L5a — calendar core** (round 4) | game-amora | `C:/Users/taren/Desktop/Amora/wt-r4-calendar` / `wt/r4-calendar` | background agent, dispatched 2026-08-16 ~13:05 EDT from `3c295b8` | brief `round4/briefs/LANE_L5A_CALENDAR_CORE.md` Boundaries; migration **0085** | dispatched | 3c295b8 (base) | — |
| A — memory foundation | game-amora | `wt-memory` / `wt/memory-foundation` | reported + landed 2026-08-14 | `server/lib/assistant.ts`, `villageReaders.ts`, `villageBrain.ts`, `knowledge.ts`, `assistantUsage.ts` (new), migration **0078**, index.ts zones (re-located anchor table in lane report), `JourneyToLaunch.tsx` citation line | **DONE** — main `8e02dd0`, both CI runs green (31857342849 main, 31857348465 branch), live `/health` reports build `2026-07-28-wave1-8e02dd0` (boot-time migration runner is fail-loud, so 0078 applied clean in production). Remaining: the live token-spend acceptance run (Rye's list item 8) | 8e02dd0 | 2026-08-14 21:49 EDT (live probe) |
| C — module library platform | game-amora | `wt-library` / `wt/module-library` | reported + landed 2026-08-14 | `shared/modules.ts`, `server/lib/modules.ts`, `secrets.ts`, `integrations.ts` + `memberDrivers.ts` + `moduleDocProvenance.ts` (new), migration **0079**, catalog + Integrations UI, `NotifyPrefsPanel.tsx` (C2 member-facing farewell), index.ts zones per its anchor table | **DONE** — main `d14b160`, both CI runs green (31858421775 main, 31857713087 branch), live `/health` reports build `d14b160` (fail-loud boot runner → migration 0079 applied in production). 11 gates, 1062/0/0 vs 0 baseline | d14b160 | 2026-08-14 22:12 EDT (live probe) |
| S — Saberra listing | game-amora (stages 0–5 are not code) | none yet (build stage will use `wt-signals` / `wt/saberra-signals`) | reported 2026-08-14 20:21 | stages 0–5 artifacts (DRAFTED, adopted at `docs/integration-program/lane-s/`); later: the driver file, registry entry `signals`, `signals.read` capability, migration **0080** | **stages 1–5 drafted; stage 0 BLOCKED on tenant credential (B5, letter ready)** | artifacts verified on disk | 2026-08-14 20:21 (final report) |
| M — module store (round 2) | game-amora | `wt-store` / `wt/module-store` | reported + landed 2026-08-15 | as dispatched; NO migration (nothing needed state beyond registry + module_settings — 0081 not claimed) | **LANDED on main `da46358`** (fast-forward; cherry = 1, 11-file surface, no forbidden files). 11 gates cold post-rebase: 1126/0/0, 6.4 min, brand 63/63, JS 502/700, dist 5615/6000. Built: catalog+detail+search, ModulePricing + priceLine + licence pill, `withdrawn` state w/ 409 naming successor + no orphans, member-pii⇒member-driver launch requirement, BUILDING_A_MODULE.md, validate-module.mjs (calls the same `moduleListingProblems` boot uses). Both Maia strings in its zone fixed. Mobile-first classes verified compiled but **layout never browser-rendered — L/V audit it**. **DONE**: both CI runs green (31866020352 main, 31865926530 branch); live build marker had already advanced to `5f3cf0b` (another session's commit landed on top, CI green on it too, `da46358` is its ancestor — verified) | da46358 (live in 5f3cf0b) | 2026-08-15 01:12 EDT (live probe) |
| Q — QA-fault fixes (round 2) | game-amora | `wt-qa-fixes` / `wt/qa-fixes` | reported + landed 2026-08-15 | eight defects; 7 VERIFIED + defect 6 at 4-of-5 (the fifth string moved into Lane M's zone in Lane C's landing — routed to M along with a newly found sixth at index.ts:8485) | **DONE** — main `18a7e61`, both CI runs green (31864908785 main, 31864840812 branch), live `/health` reports build `18a7e61`. 11 gates, 1096/0/0 | 18a7e61 | 2026-08-15 00:41 EDT (live probe) |
| L — full live test (round 2) | live deployment (build `5f3cf0b`) | audit-only; local build in `wt-liveqa` (founder on scratch `amora_lanel`, ready for fix phase) | reported 2026-08-15 ~01:50 EDT | AUDIT: 56 routes × 2 viewports | **REPORTED — 0 HIGH / 6 MED / 7 LOW**; all round-2 focus verdicts CLEAN or by-design (federated docs byte-checked w/ control; 404/401/503 semantics proven by lifecycle writes + reboot); 8 could-not-measure incl. the citation line (never rendered anywhere — needs a key); 3 tooling lies self-caught. Report adopted at `docs/integration-program/round2-qa/LANE_L_REPORT_2026-08-15.md`. **Fixes held until V reports** (overlap on Admin.tsx + forms) | 5f3cf0b | 2026-08-15 (final report) |
| V — mobile-first QA (round 2, R14) | live deployment (build `5f3cf0b`) | audit-only (scratch schema dropped, nothing pushed) | reported 2026-08-15 ~02:20 EDT | AUDIT: 16 routes × 3 viewports + 390×664 URL-bar pass; 21/21 detector validation | **REPORTED — 4 HIGH / 5 MED (1 retracted by coordinator) / 4 LOW.** HIGH: `/login` Sign In covered by the tab bar at first paint (tap → Gratitude); `/map` removes all in-app nav; map iframe overflows 2× with off-screen close controls; CTAs on 3 more routes tap-stolen (19 thefts/13 routes). Report adopted at `round2-qa/LANE_V_REPORT_2026-08-15.md`; 99 screenshots in scratchpad `lane-v/`. 14 could-not-measure (safe-area insets read 0 on WebKit-Windows; no CPU throttling in WebKit; non-included store tiers never rendered) | 5f3cf0b | 2026-08-15 (final report) |
| F1 — mobile shell + public pages (fix) | game-amora | `wt-fix-mobile` / `wt/fix-mobile-shell` | reported 2026-08-15 ~13:20 EDT | 25 client files (+290/−98): mobile components, Layout, index.css, mobileNav, public pages | **REPORTED at `d051909`** (rebased on 15f378d; 2 commits; surface verified clean; branch CI running). **Root-cause CORRECTION**: the Layout spacer was never missing — an opaque fixed bar owns the last 65px of the visual viewport at every offset incl. first paint; padding at the end of a 2100px document cannot fix scrollY=0. Fix: `BARE_ROUTES` (login/register/set-password/forgot-password render no bar, header menu keeps nav) + `--tabbar-h` token + padding trims. **The 19→0 line is NOT reachable and the lane proved why** (an inner scroll container would pin the viewport at 664 — the exact H1 condition): tab-bar thefts 22→12 (V's viewports), first-paint 7→2, centre-stolen-at-first-paint 3→1; the residual 13 are footer links passing under the bar mid-scroll (transient); the harm-mapped metrics are green: every named CTA at scrollY=0 owns its centre at 390×664/390×844/375×812; 1,714 controls, **0 with no tappable position**. V-M8: V measured the border box, a 44px `::after` hit area already existed — the real defect was row pitch (feed 3/10, quests 6/14 under 44) → 10/10, 14/14. V-L13 half not a defect (tap-highlight already shipped). L-M5 44→0 unnamed controls. L-L3 4→0. L-L4 6.86:1. Alt-detector conflict resolved: **V's detector erred** (`!img.alt` treats `alt=""` — the REQUIRED decorative markup — as missing). Gates green, 1137/0/0, 15.3 min; **no pre-edit baseline** (mutex held + outage) — stated. Flags: Admin sign-in form lacks autocomplete/labels (queue); GameMechanics fixed z-70 proposal bar covers the tab bar when a change is staged (queue). **DONE**: main `d051909`, CI green ×2 (31896704892 main, 31896492846 branch), live `/health` → build `d051909` | d051909 | 2026-08-15 12:56 EDT (live probe) |
| F2 — map shell escape (fix) | game-amora | `wt-fix-map` / `wt/fix-map-shell` | reported + landed 2026-08-15 ~04:30 EDT | `LivingMap.tsx` ONLY (+59/−4) | **LANDED on main `9632450`** (fast-forward; cherry = 1, single file, branch CI green). V-H2 closed: "Back to the village" control, fixed, 190×44, `max(safe-area-top, 44px)` clearing the artifact's 35px vitals strip, reuses the shell's single `exitApp` path so button/back-gesture/artifact-exit cannot disagree; WebKit proof at 390×844, 390×664, 1280×800 + deep-link hash contract preserved. 11 gates green, 1131/0/0. **DONE**: CI green ×2 (31890257763 main, 31889379897 branch), live `/health` → build `9632450` | 9632450 | 2026-08-15 10:37 EDT (live probe) |
| F3 — store surface (fix) | game-amora | `wt-fix-store` / `wt/fix-store-surface` | reported + landed 2026-08-15 ~11:40 EDT | `Admin.tsx` only (+106/−44, 3 commits) | **LANDED on main `efdf7da`** (fast-forward; cherry = 3, single file, branch CI 31891724084 green). L-M4 contrast 20/183 → 0/183 failures (measured; e.g. `always on` 2.49→7.23), L-M6 search named, V-M6 360px overflow 20px → 0 (lifecycle row min-content root cause), V-M8 toggles ≥44; all 28 Admin.tsx `d.error` sites → `refusal()` (skips falsy, trims — a bare `??` would have blanked toasts on empty bodies). 4 suite runs 1131/0/0, no pre-edit baseline (mutex held; accepted). **DONE**: CI green ×2 (31891975360 main, 31891724084 branch), live `/health` → build `efdf7da` | efdf7da | 2026-08-15 11:14 EDT (live probe) |
| I — images (round 3) | game-amora + Railway volume | `wt-images` / `wt/images-webp` | PR #8 merged 2026-08-15 ~17:40 EDT (lane killed by power loss AFTER pushing; report = the PR body) | Part A: 14 posters re-encoded 1600×900→1280×720 WebP q75 (1.63 MB → 894 KB, −45%) and copied via `railway ssh` in base64 chunks with md5 verified both sides → all 14 live URLs 200, `/health` uploads 0→14, survived two redeploys; Part B: 8 brand marks 1000px PNG → 320px WebP (197 KB → 101 KB), 30 avatars correctly left alone (already WebP at 2× hero), favicon stays PNG (PWA manifest labels non-SVG icons `image/png`) resized 1000→512; **the rename made safe instead of refused**: `/assets/images/<name>.png` falls back to `.webp` so a brand path an admin TYPED years ago still resolves (proven incl. real 404s and `..` traversal refused); Part C: `client/src/lib/imagePrep.ts` canvas→WebP, returns the ORIGINAL for SVG/GIF/already-cheap/canvas-returns-PNG (old Safari) — detected from the blob type, never UA sniffing; 20 tests on decisions not pixels; wired into IdentityPackPanel; Part D: `scripts/check-image-budget.mjs` — no non-WebP raster, 400 KB/file, total ratchet with `--update-baseline` refusing to raise; exemptions DERIVED from gameConfig + index.html (never a typed list, which the brand ratchet would refuse); proven both ways; wired into ci.yml (**thirteen gates now**), CLAUDE.md, runbook | **MERGED — PR #8 → main `4aa867d`** (verify green ×2 at 56482a1 incl. the new Image budget step; 71 files / 1210 tests / 0 skipped; brand 63/63; dist 5523/6000). **DONE**: CI 31909898776 green on the merge; live `/health` → `4aa867d` at 17:40 EDT (P's pool code and I's image gate both live). Follow-ups queued: wire `prepareImageForUpload` into `Admin.tsx:8003` (brand image) and `WorkWithUs.tsx:224` (attachment — that route does NO server-side compression, writes originals up to 10 MB) | 4aa867d | 17:40 EDT (merged) |
| D — builder pathway + intake (round 3) | game-amora | `wt-builder` / `wt/builder-pathway` | reported + merged 2026-08-15 ~13:30 EDT | 16 files (+2324/−1): START_HERE, HOW_TO_START_A_SESSION, module-facts.mjs, check-doc-links.mjs (new CI gate; found real rot), validate-module.mjs +6 static security checks each proven firing, PR template, module-intake workflow, CODEOWNERS, REVIEW_CHECKLIST, DD_ASSISTANT, key-gated review-agent, contract v1.1 with built/building/policy appendix, store card (44px/16px verified at 375×812) | **MERGED — PR #6 → main `e18b380`** (merge commit; `verify` green on tip 586ff12; branch CI 1137/0/0 in 3m20s — the lane never won the local mutex, CI was the authoritative suite). **DEFECT found at merge**: D's own intake workflow FAILED on its own PR — the stage-5 classifier greps bare `clause 14` and matches the validator's informational "pool is not a field yet" line → follow-up fix PR requested (D resumed). Also flagged: `MODULE_LIBRARY_CONTRACT_VERSION` constant still "1.0" (routed to P); review-agent skips without `ANTHROPIC_API_KEY` (Rye adds it = money); code-owner review must stay OFF until a second maintainer. **DONE**: main CI 31898395931 green on the merge commit; live `/health` → build `e18b380` | e18b380 | 2026-08-15 13:32 EDT (live probe) |
| K1 — assistant cost: router + prefetch + caching (round 3) | game-amora | `wt-cost` / `wt/assistant-cost` | reported + merged 2026-08-15 ~14:15 EDT | 10 files: `assistantRouter.ts` (routes only within the caller's catalog), `assistantTemplates.ts` (8 renderers), `assistant.ts` prefetch (tools OFF, one POST), `assistantUsage.ts` `path`, migration **0081** (four-way scan; 0080 left for Saberra), organize route body, no-tools prompt line, `loop.e2e.test.ts` (forced: its tool-loop question now takes the cheap road — question changed, cheap-road acceptance test added) | **MERGED — PR #9 → main `79cf20a`** (merge commit; `verify` green ×2 on 6207c86; 1190/0/0 vs 1137 baseline). **Caching NOT taken, measured**: natural cacheable prefix 969 tokens (best reordering 1,238) vs Haiku 4.5 minimum 4,096 — no padding, per ruling. **The ten questions**: 10/10 deterministic → **$0.0807 → $0.0000** (empty record, the live state); with a populated record 9/10 deterministic + 1 prefetch → **$0.0033 (95.9% saved)**; blended **$0.00807 → $0.00033**. Roads measured: prefetch 1 POST/2,853 in/$0.00355; no-tools 1 POST/$0.00323; loop unchanged $0.00807. **Two design defects found+fixed**: a NARROWED question ("about quiet hours") is not a lookup — a template would have answered it confidently, free, and wrong (was live in two e2e fixtures); an empty shelf answers a narrowed question, not an advisory one. Deterministic road returns before the per-IP guard and needs no key — a keyless/budget-exhausted village still reads its own record. Unproven: Lane R's verbatim questions were not on disk (reconstructions, same 8 readers, same 7+3 split); no live run until deployed; `no-tools` records as `path='loop'` (a 4th enum value would sharpen the metric). **DONE, MEASURED LIVE by the coordinator**: CI 31899919136 green on the merge; `/health` → `79cf20a` (migration 0081 applied via the fail-loud boot runner); two real organize calls with the standing test admin: "Which seats did we leave vacant?" → `path: deterministic`, reader `seats.vacant`, real answer (4 vacant roles named), 1,473 ms; "What did we decide about membership?" → `path: deterministic`, `record.decisions`, "Your decision log is empty.", 1,219 ms — zero model calls, zero cost, on production | 79cf20a | 2026-08-15 14:04 EDT (live probe) + 14:12 EDT (live calls) |
| K2 — synthesis → Batch API (round 3) | game-amora | `wt-batch` / `wt/synthesis-batch` | reported + merged 2026-08-15 ~18:20 EDT (killed by power loss with 3 commits unpushed; resumed from disk) | `synthesisBatch.ts` (client: enqueue/poll/handleResult), `synthesisWriter.ts` (the extracted shared writer — sync route's only change is the call), migration **0082** (scan run three times; 0080 still reserved), job at index.ts ~4015, `assistant.synthesis_batch` game variable (founder ring, **default false**), `path` union gains `batch`, runbook, unit + e2e (own port range 8800–9199 after colliding with mapPromise's) | **MERGED — PR #11 → main `72a7fca`** (5 commits; 13/13 CI steps green at fe3fa29; local 1202/0/0 pre-rebase, two files re-run post-rebase, CI authoritative). **FINDING: there was NO scheduled synthesis path** — the only trigger is `POST /api/admin/recordings/:id/synthesize`; the batch road exists and the scheduled path ships OFF (turning it on changes what synthesis IS: `callSynthesis.ts` header says nothing here runs on a schedule; the automation module promises nothing applies itself). Idempotency two layers (conditional claim on (batch_id, custom_id) + `call_syntheses.recording_id` UNIQUE, ER_DUP_ENTRY read as already-written; results returned reversed in the stub so position-keying fails). Two self-caught defects: the poll job would have INSERTED a rate_hit 288×/day against the 600 cap (gate is now check-only; hits charged per submitted request); e2e port range collision. Saving honestly small: ~$0.008/synthesis, pennies/month at Amora's volume — structural value (a batch road for the next non-interactive job; synthesis no longer competes with interactive budget). No pre-edit baseline (mutex) — stated. **DONE**: CI 31911037403 green on the merge; live `/health` → `72a7fca` (migration 0082 applied via the fail-loud boot runner) | 72a7fca | 2026-08-15 18:06 EDT (live probe) |
| HS — hub PII exposure fix (security) | ReGenCivics.Earth | `regen-pii-fix` / `wt/pii-fix` | dispatched ~14:40 EDT; killed by power loss with players.ts + a PII test uncommitted; RESUMED ~17:40 EDT with WIDENED scope | PR 1: the two originals + **all TEN HIGH** from the sweep (public projections, status filters, projected whole-row helper variants, keys-allowlist tests, enum-mismatch fix if one-liner); PR 2: the eleven MEDIUM | **PR 1 MERGED — hub #42 → hub main `45e7737`** (both blocking jobs green: Typecheck·Test·Build 3m32s, Integration real-MySQL 1m59s; contrast pre-existing broken; local 1324 passed / 10 DB-guarded skips, the 13 filename-excluded DB suites covered by the CI integration job). TWELVE procedures projected: playerProfiles.getByHandle/getById/leaderboard (whole row → 21 public fields; withheld: email, wallet/base name, hypha URL, github ids, all location fields, eight token balances, prefs, trust/contribution scores; owner+admin keep the full row), playerProfiles.list → adminProcedure, events.list/getBySeason/getById (checkinToken gone for everyone; room URLs members-only), seedsClaims.lookup (id/status/createdAt), localFood.list/getById, videoSuggestions.list, tools.list/getBySlug (+userId off endorsements), hyphaBridge.get (+ `buildRedirectUrl` GATED to initiator/admin — the one judgement call), plus structural note 3 fixed (`"admin_only"` vs enum → stored `''` → abuse reasons public; two lines). New helper `server/lib/public-projection.ts` (`pickPublic`/`canSeeFullRecord`) + keys-allowlist tests. Reported not fixed: localFood.submitApplication INSERT uses snake_case against camelCase columns (pre-existing write-path bug); ToolDetail.tsx reads six non-columns and white-screens `/tools/:slug`; whole-row helpers still return full rows (tests catch a future spread). **PR 2 MERGED — hub #43 → hub main `cbec306`** (both blocking jobs green; local 1351 passed / 10 DB-gated skips): eleven MEDIUM procedures projected + four extras in the same files (govProposals.getById, plays.list, toolsLibraryEntries reads, campaigns.myCampaigns — where creators were handed reviewer notes about their own project); status filters where an enumerable id reached unpublished rows (campaigns draft/pending/rejected → creator+admins; govProposals draft/withdrawn → author+admins; plays.getBySlug approved only). Judgement calls: **votes stay unattributed** (ADR-27/28 posture: the hub is aggregate-only, never a shadow voting system; getById already publishes a tally; listVotes has zero callers); **coordinates to 3 decimals** (~110 m) not 2 (0.01° = ~230 px at ShipMap zoom 15 would snap plantings to a visible 1 km lattice); `PlayDetail` ownership moved server-side as a boolean rather than putting creator ids back. Reported not fixed: `ContributorCard.tsx:18` falls back to a now-withheld `suggestedTier` (no visible loss today; a null `finalTier` on a published row would show no badge). Five of the eleven had zero callers; the claims pages live in `apps/gov/` Next routes via `fetchFromMainSite` — a `client/` grep alone would have missed them. **HS COMPLETE — PR 2 VERIFIED LIVE 19:38 EDT** (`activityFeed.list` actorId/metadata keys 0, `campaigns.list` adminNotes keys 0). Token rotation → Rye (item 18, due) | hub cbec306 (live) | 19:38 EDT (live probe) |
| V2 — mobile closing re-run (round 2 proof) | live `c09c172` (residuals re-run on `72a7fca`) | audit-only | reported 2026-08-15 ~18:30 EDT (restarted after power loss) | per-finding BEFORE→AFTER; 34/34 detector validation; three harness defects self-caught (ancestor `owns()`, async smooth-scroll, a bad fixture) | **REPORTED — report adopted at `round2-qa/LANE_V2_CLOSING_REPORT_2026-08-15.md`.** CLOSED: V-H1 login, V-H2 map escape (tap + deep link), M6 toggles/search/contrast, M7 autocomplete, M8 targets (HIT areas measured), L-M5/L3/L4, alt (14/14 posters resolve), L-M1 headers, L-M3 mint, L-L1 robots/sitemap. Reachability PASS (1,710 → 0 unreachable). RESIDUAL: `/quests` Propose CTA wholly under the bar at 375×812 (tap → /gratitude); `/feed` first-card actions wholly under at 390×844 → R26 (below effective fold, reachable; still routed as a cheap layout move → F1 resumed). REGRESSION: store 360 overflow 20→10 px, cards fixed at 298 (F3 had 272) — suspect D's #10 store-card additions → F3 resumed. Admin sign-in still bare (queue 27) → F3. UNCHANGED: map prototype overflow (B8, map owner). 11 could-not-measure | 72a7fca | 18:30 EDT |
| R — live acceptance run + test admin (round 3) | live village | none | **DONE** 2026-08-15 12:00 EDT | as briefed | **DONE.** Test admin `integration-qa` created (user `user-1786809208124-iuzo2`, role founder, via the platform's own register route; password discarded); token recipe adopted at `docs/integration-program/tools/mint-test-token.mjs` (secret by name via `railway variables`, never on disk). Preflight: **the corpus is EMPTY for a structural reason** — all 7 forum threads are seeded examples; the village has zero member-authored governance content; the derive job HAD fired (jobs run 15s after boot, not after one interval — brief assumption corrected) with `0 decided, 0 filed`. Ten questions: 10/10 hit a reader; the 3 decision questions got the honest "your decision log is empty", the 7 reader-backed ones got real facts. Screenshots (desktop + iPhone) show the citation line — Lane A's missing deliverable, delivered. Numbers: tool answer **$0.00808** vs plain **$0.00346** (2.34×, Haiku 4.5 at $1/$5); **14/14 organize answers call a reader** (no cheap path — organize's 50/day ≈ 25 answers); `rate_hits` = `SUM(iterations)` exactly (31=31). Spend **$0.127 vs ~$0.10 authorized** — overage disclosed (re-shoot + comparators). Two findings queued: `.invalid` test email counts as a real member in health snapshots; `PLATFORM_ASSISTANT_KEY` unset on live (village key pays every call) | live 15f378d | 12:00 EDT (report) |
| P — $ReGen builders' pool (round 3) | hub (`regen-pool` / `wt/pool`) + game-amora (`wt-pool` / `wt/module-pool`) | two worktrees | reported 2026-08-15 ~14:30 EDT | hub: `docs/MODULE_POOL_DESIGN.md` (434 lines), **ADR-50**, 5 DOMAIN-LANGUAGE terms, `shared/modulePool.ts`, `shared/moduleBuilders.ts` (ships EMPTY), `shared/lunar.ts` +2 fns (restored after an accidental overwrite), `server/jobs/moduleBuildersPool.ts`, `server/routes/modulePool.ts`, cron `POST /api/cron/module-pool-statement`, migration **0227** (hub), `BuildersPool.tsx` + `AdminBuildersPool.tsx`, 41 tests; game-amora: `shared/modulePool.ts` (`poolStatus`, `modulePayoutProblems`), `builtByAccount`, `pool` projected into both module payloads, contract constant → "1.1", 21 tests; federation byte-identical proof (sha256 equal on both SHAs) | **MERGED BOTH**: game-amora #5 rebased to `268fb4e` → main `c09c172` (verify green ×2; local suite 1165/0 with DB suites at c80e654; intake showed a SECOND false positive — the validator greps whole changed files, not added lines — proven by 0 flagged patterns in P's 335 added index.ts lines; merged on the evidence, fix routed to D); hub #41 → hub main `37c61d2` (real-MySQL integration job applied 0227 + schema-drift check GREEN; the 10 skips are DB-guarded suites unrelated to the pool with `DATABASE_URL` pointing at PRODUCTION behind a BOM — P correctly refused to use it and proved 0227 + the statement SQL on a scratch MariaDB schema instead; `Contrast Audit` and `Lighthouse CI` fail on EVERY hub branch since 2026-08-03 — pre-existing broken workflows, not P). Note: `.env` BOM hid the production DATABASE_URL from a key-grep; the hub worktree points at production by default. Sample statement on a fixture roster balances (5000 = 3000 payable + 2000 accrued no-address). `pool.regen_per_cycle` ships at **0** so nothing pays until Rye sets it. Three self-corrections (lunar overwrite restored; `$?` after a pipe; 3-cycle accrual doc≠code → roll-and-resplit). Two chips filed: orphan second lunar clock (6.79 h off, zero callers); hub `playerProfiles` publicProcedures spread PII → **Lane HS dispatched** | ga c80e654 / hub cc9753e | 14:30 EDT (report) | hub: design ADR, cycle statement job, statement tables + export, public counts page, `pool.regen_per_cycle`; game-amora: `shared/modulePool.ts` derived `poolStatus`, `builtBy.payout`, payload projection, federation byte-identical proof | dispatched; game-amora branch lands before D; PR flow | hub 0b705f8 / ga ≥9632450 | at dispatch |
| F4 — server hygiene (fix) | game-amora | `wt-fix-server` / `wt/fix-server-hygiene` | reported 2026-08-15 ~04:10 EDT | index.ts header/route-shell zones, seeds, Mint page, + 16 client `d.error` sites (R16) | **DONE — LANDED main `3d1e57b`** (fast-forward after branch CI 31901241483 green; main CI 31901409455 green; live `/health` → `3d1e57b` at 14:36 EDT). Final surface 19 files +799/−365 rebased clean over F3/F1/D/K1 (organize route was never contested: K1 added no 401 site). Suite: local 1149/0/0 on the e18b380 rebase; final tree covered by CI (coordinator clearance, mutex pathological). Earlier state: `278df75` (2 commits, 4 files, clean; 70 files / 1143 tests / 0 skipped; +12-case hygiene e2e). L-M1 VERIFIED (5 headers, x-powered-by gone, frame-ancestors self, map iframe proven; HSTS deliberately unset → Rye 10); L-M2 seed→null (live rows → Rye 11); L-M3 VERIFIED; L-L5 VERIFIED (319 sites; 3 credential-verification families correctly excluded) — **consequence sweep in progress per R16**; L-L1 robots+sitemap VERIFIED, soft-404 DEFERRED (reason recorded); L-L6 no change (opacity comment added). **Sweep DONE at `3cb6331`** (3 commits, rebased on F2 `9632450`, 70/1143/0, gates green): 15 files / 24 sites + 5 branches → `d.message ?? d.error ?? fallback`; `ExampleRefusal.tsx` deliberately skipped (409 `example_immutable`, no message — a `??` that can never fire reads like a case that can); **found + fixed a real bug its own L5 change created** (`OnchainCard.tsx` guarded the wallet flow on `!ch.message`; after L5 the 401 carries `message:"Sign in first"` so a signed-out member's wallet would have been asked to SIGN the words "Sign in first" — guard now reads `chRes.ok`); S9 item confirmed untouched by diff. **Awaits F3 + F1 landing, then one more rebase + cold gates** | 3cb6331 | 2026-08-15 ~11:00 EDT (report) |
| H — hub side of Managed | hub | not created | NOT dispatched | shared vendor account, per-fork roster, billing line item, entity block wiring | queued (§4 item 9) | — | — |
| O — Orbit | — | — | FROZEN at stage 1 (anonymous vendor) | nothing; `provides` field lands as data with Lane C so Orbit never migrates a registry entry | frozen | — | — |

Standing warning: a session that has exhausted its context will accept an assignment and never do
it. Verify liveness by output, not by acknowledgement.

---

## §3 Resource registry

A number can be held **four** ways: a remote ref, a local ref in another worktree, an untracked
file on disk, another session's scratchpad worktree. Entries from a handoff are GUESS until
confirmed from disk.

| Resource | Value | Held by | Verified |
|---|---|---|---|
| game-amora migration 0076 | `0076_voice_rates_and_settled.sql` | IN origin/main (foundation-economy merged) | 28dace2, 4-way scan 2026-08-14 19:35 |
| game-amora migration 0077 | `0077_housing_availability.sql` | UNTRACKED on `wt-housing` disk only | disk scan 2026-08-14 19:35 |
| game-amora migration **0078** | assistant_usage | **Lane A** | allocated, scan-confirmed free |
| game-amora migration **0079** | module library (if needed) | **Lane C** | allocated, scan-confirmed free |
| game-amora migration **0080** | signals (build stage, if needed) | **Lane S** | allocated, scan-confirmed free |
| Hub ADR number **49** | Managed credential exception | Coordinator | DECISIONS.md has 48 ADRs, read 2026-08-14 |
| Module id `signals` | Saberra listing | Lane S | free at 28dace2 (`shared/modules.ts` unchanged since 1428603) |
| Capability `signals.read` | Saberra listing | Lane S | free at 28dace2 |
| Domain `signals` | risks, tensions, commitments | platform; Saberra sole driver on listing | ruled (tiers doc; retrospectives EXCLUDED per Lane S brief) |
| Domains `people` / `leads` | crm split | platform-owned / vendor-drivable | Rye confirmed (§8-R7.1) |
| Branch `wt/integration` (hub) | coordinator home | Coordinator | created 2026-08-14 |
| Branches `wt/memory-foundation`, `wt/module-library` (game-amora) | Lanes A, C | verified absent from `git branch -a` at fetch | at dispatch |
| Env var (future) Saberra platform key | Managed plane, env-only | blocked on ADR-49 + stage 5 | — |

---

## §3a Vendor and listing registry

**A blank cell is a hard stop for the NEXT stage, not a TODO.**

| Field | Saberra | Orbit |
|---|---|---|
| Listing id | `signals` | (would be `leads`) |
| Vendor legal name | **BLANK — stage 1 owes it in writing** | BLANK (vendor anonymous; about page 404s) |
| Jurisdiction | BLANK | BLANK |
| Named human + email | Rye knows the people; **not in writing** | NONE FOUND |
| Product URL | BLANK — stage 1 (their API/docs URLs exist in package; exact product URL owed) | `orbitdao.io` ASSUMED, unconfirmed (`orbitdao.com` is a parked HugeDomains listing — never write it anywhere) |
| Terms URL / status page | BLANK / BLANK | BLANK / BLANK |
| Current stage | **0 — BLOCKED: no tenant credential has ever been issued** (their doc 07:19 lists it under "what we would need to give you"; confirmed by exhaustive local search 2026-08-14). Stage 1–5 artifact DRAFTS exist at `docs/integration-program/lane-s/`. Audit gates A/B/C pre-committed before data exists. **Stage-5 finding: does NOT clear Managed on today's evidence** (7 of 12 gate rows empty; their cap "never blocks" by their own docs). **No hard-delete endpoint exists at all** — largest vendor-side ask, blocks stage 3/4 exits. Sandbox tenant already live (cheapens stage 4) | **1 — FROZEN** |
| Artifact satisfying last exit gate | none yet (stage 0 exit = the numbers report) | none |
| Tier sought | Managed (slot 1 of 2) | Connected if ever listed; never Managed |
| Who bills | CORE bills village; Saberra invoices CORE | village direct (no reseller terms exist) |
| dataClass | `member-pii` (Risks carry Collapse Pattern taxonomy against named individuals) | would be member-pii-adjacent; `leads` scoped to never receive member PII |
| Domain provides | `signals` | `leads` only, never `people` |
| Write surface | write-mostly, fire-and-forget; no outbound events; enumerated at stage 2 | webhook-first (44 events) — needs generic receiver, idempotency, identity map |
| DPA state | NONE. Required before go-live: signed DPA naming Notion, Anthropic, AWS SES, Railway, Google; retention per class; hard-delete endpoint; deletion turnaround | — |
| Contract version accepted under | none (v1.0 not yet sent) | — |
| Withdrawal terms recorded | no | — |
| Support volume band + first-response time (stage 5, Addendum 2 fix 6) | BLANK | — |

---

## §3b Credential registry

| Key | Held by | Plane | Rotation owner | lastSuccessAt | lastFailureAt | ADR authorising platform-hold |
|---|---|---|---|---|---|---|
| `PLATFORM_ASSISTANT_KEY` | platform | fork deployment env only; never in `SECRET_KEYS`; never returned, not even masked | Rye | not instrumented (integration_health lands in C1) | — | shipped precedent (pre-dates ADR log for game-amora); cited in ADR-49 |
| Saberra platform key (name TBD by Lane S build) | platform | env-only, PLATFORM_ASSISTANT_KEY posture | Rye | — | — | ADR-49 (**Accepted** 2026-08-14) |
| Test admin `integration-qa` (live village) | platform (coordinator-created, R23) | user row `user-1786809208124-iuzo2`, role founder; **no stored password**; lanes mint ≤24h JWTs from `AUTH_TOKEN_SECRET` at call time: `railway variables -s "Amora Game" --json \| node docs/integration-program/tools/mint-test-token.mjs` (secret never on disk) | coordinator | verified 2026-08-15 (profile 200, admin 200, wrong-secret 401) | — | R23; standing test identity for Lanes L/V/R; NOTE queue 24 (its `.invalid` email counts in health snapshots until excluded) |
| Village-held keys (Connected/Included) | village | `SECRET_KEYS`: write-only to browser, read by server, masked to last4, admin-beats-env | village admin | — | — | n/a — never platform-held |

---

## §3c Contracting entity block

| Field | Value |
|---|---|
| Contracting party | Church of the Regenerative Earth (CORE), 508(c)(1)(A) |
| EIN | UNRESOLVED |
| Jurisdiction / registered address | UNRESOLVED |
| Signatory + authority | UNRESOLVED (Rye, under CORE's coordination function — needs confirming in writing) |
| Bank account | exists (per charter) |

Open counsel questions and what each blocks:
1. CORE's standing to contract as vendor counterparty (entity docs, signatory authority) — **blocks CORE signing anything** (Saberra stage 3/5 signatures).
2. DPA counterparty structure (CORE as controller/processor posture) — **blocks CORE signing the DPA** (stage 3 exit).
3. Managed billing: resale vs agency — **blocks the invoice template**, default agency until counsel says otherwise.
4. **UBIT**: margin on resold third-party software modules sold to villages that are not church members — 508(c)(1)(A) is still 501(c)(3)-described and still UBIT-subject; answer may be "yes, report on 990-T," may mean a different entity — **blocks the FIRST INVOICE only. Building and piloting proceed; billing does not.** Do not guess; do not let a lane guess.
   4b (added 2026-08-15, R20): the $ReGen builders' pool pays individual builders in a token valued at $0.10 — payouts over $600/yr per person are 1099-reportable (NEC or MISC?); and does a grant-shaped payout to non-members touch the same UBIT analysis or is it plainly an expense? Same accountant, one more line.
   4a (added 2026-08-15, R13): the developer marketplace adds one line to the same ask — if CORE ever takes a margin or listing fee on third-party DEVELOPER modules (not just SaaS vendors), same analysis? V1 avoids it entirely (developers bill forks directly, Connected economics); this gates only a future platform-billed rail.

---

## §4 Landing queue (Addendum 2 §C, verbatim order)

| # | Item | Blocked by | Status |
|---|---|---|---|
| 1 | Lane A (memory foundation) — merges first | — | **DONE**: main `8e02dd0`, CI green ×2, live build marker matches |
| 2 | Lane C phase C1 (catalog, tier metadata, 503 lapse, dynamic secret slots, registry-driven cards, tier stamped at enable, **+ integration_health + correlation-id driver wrapper + liveness-window field** — promoted, §8-R6) | — | **DONE**: main `d14b160`, CI green ×2, live build marker matches |
| 3 | Hub ADR-49 (Managed credential) — precedes any Managed credential code | — | **ACCEPTED by Rye 2026-08-14.** Managed-plane code is authorized |
| 4 | Lane C phase C2 (forgetMember/exportMember driver registry) — gates the first paid listing | — | **LANDED** with C1 in `d14b160`; wired into anonymizeMember + profile export + delete-account UI, refusal proven visible |
| 5 | Incident log (`integration_calls`) + liveness probe — ahead of the first Connected listing | 2 | queued, own dispatch |
| 6 | Diagnostic path (reader, four outcomes, two answer tiers, no-model fallback, escape hatch via feedback relay) | 1, 2, 5 | queued; the eight sentences on Rye's list |
| 7 | Lane S stages 0–5 (not code, not blocked) | — | dispatched |
| 8 | Lane S build | 2 (C1+C2), 3, 4; and stage gates §3a rule 7 | queued |
| 9 | Lane H: hub side of Managed (shared vendor account, per-fork roster, billing line item, entity block) | ~~3~~ (ADR-49 accepted); §3c Q1–3 for signatures | queued |
| 10 | Publish MODULE_LIBRARY_CONTRACT v1.0 on a public URL (hub page; version-stamped, since listings are accepted against a version) — Rye ruled publish, R11 | 2, 5 (clauses 9–12 must be mechanically true first) | queued |
| 11 | Small defect (found by Lane A, CONFIRMED by Lane C as outside its landed scope): `PUT /api/admin/email-config` (~12508) silently drops empty-string values, so a stored key can never be CLEARED via that route | own small dispatch, with item 13 | queued |
| 13 | Wire `sectionCitation` provenance rendering: one-line change in `knowledge.ts` (was Lane A's file, lane closed), written out in `server/lib/moduleDocProvenance.ts`'s header + ARCHITECTURE checklist | own small dispatch, with item 11 | **folded into Lane Q** (round 2) with item 11 |
| 14 | **Lane Q** (round 2): the eight-defect fix list (incl. items 11+13, orgUpdatedAt, fencing, Maia strings, capability filter, forgery guard, mid-loop usage) | — | **DONE**: main `18a7e61`, CI green ×2, live marker matches; items 11/12/13 CLOSED |
| 15 | **Lane M** (round 2): store research → design → build (catalog UX, pricing data, withdrawn state, member-pii driver gate, builder guide + validate-module script) | — | **DONE**: main `da46358`, CI green ×2, live in `5f3cf0b` |
| 16 | **Lane L** (round 2): live QA — AUDIT phase | — | dispatched 2026-08-15; fixes routed after triage |
| 17 | **Lane V** (round 2, R14): mobile-first Safari QA — AUDIT phase | — | dispatched 2026-08-15 with L; fixes routed after triage |
| 18 | **Round-2 QA fixes** — triage at `round2-qa/TRIAGE_AND_FIX_ROUTING_2026-08-15.md`; four disjoint lanes F1–F4 dispatched; land order F2 → F3 → F4 → F1; then Lane V re-runs occlusion + overflow sweeps on the deployed SHA as closing proof | — | dispatched 2026-08-15 |
| 19 | Map prototype internal overflow (V-H3: 790px doc in 390px frame, off-screen ✕ controls, 38px CTA) — routed to the map owner ("SWARM COORDINATOR" session) by message; not fixed by QA lanes | map lane | **BLOCKER B8** on the map lane; open |
| 22 | **CI flake mechanism found by F2**: `GET /api/admin/audit` returns only the last 200 events; `loop.e2e.test.ts` S9 (~1008) sits late in a 64-test order-dependent file, so its mint row can fall outside the window; unchanged re-runs pass | **Rye's separate session** ("Fix flaky S9 audit assertion in loop.e2e.test.ts") | withdrawn from F4 (confirmed untouched by diff); coordinator lands that session's branch when it reports |
| 24 | `server/lib/health.ts` excludes only `%anonymized.invalid` from `members_total`; the standing test account `integration-qa@amora.invalid` will be counted as a real member in every frozen snapshot (never recomputed). Fix: exclude any `.invalid` TLD (RFC 2606) — small server change; land before the next cycle close | next server lane | queued, small |
| ~~29~~ | ~~Intake classifier false positive~~ **DONE — PR #7 merged → main `58902fa`**: classifier extracted from YAML to `scripts/intake-classify.mjs` (13 assertions, clean case first), reads only `<-- VIOLATION` lines, version mismatch is a warning, uncheckables prefixed `[not checked]`. The YAML wiring proves out on the next module PR (intake triggers on pull_request only) — P's PR is that proof | — | closed |
| ~~30~~ | ~~contract constant 1.0 → 1.1~~ **DONE** in P's #5 (`268fb4e`); D's version-mismatch warning went silent on its own once code and doc agreed | — | closed |
| ~~35~~ | ~~Validator whole-file greps (second false positive)~~ **DONE — PR #10 → main `bd16b7f`**: `scripts/contribution-scan.mjs` attributes hits to added lines (24 assertions in a throwaway-repo test; the trailing-newline diff artifact caught and written down); the 41 pre-existing index.ts hits that blocked P are now `[pre-existing, not yours]`; **the intake gate ran on this PR and PASSED** — first fully-corrected run. Also in #10: pool strings on the store card, validator pool rule via P's real functions with the pinned paid⇒not-eligible implication, guide + contract appendix (clause 14 → Built, partly) | — | closed |
| 27 | Admin sign-in form (`Admin.tsx:671-686`): no `autocomplete`, no accessible names (placeholder only), password-reveal button unlabelled with no explicit hit area — F3 has landed, so this is unowned; small a11y fix | next client lane | queued (from F1) |
| 28 | `GameMechanics.tsx:814` renders a `fixed bottom-0 z-[70]` proposal bar that covers the entire mobile tab bar whenever a change is staged — pre-existing, outside F1's routes | next mobile lane | queued (from F1) |
| 38 | Hub `localFood.submitApplication` INSERT uses snake_case column names against camelCase live columns (pre-existing; a WRITE path HS deliberately did not widen a security PR to touch) — the form cannot succeed today | hub hygiene lane | queued (from HS) |
| 39 | Hub `ToolDetail.tsx` reads six field names that are not columns → `/tools/:slug` white-screens on any real tool row | hub hygiene lane | queued (from HS) |
| 40 | Hub whole-row helpers (`getUsersByIds`, `getPlayerProfileByUserId`, `getUserById`, `getUserProfile`, `getPlayerProfilesByUserIds`) still return full rows; add projected public variants (HS structural note 1; the new tests catch a future spread meanwhile) | HS PR 2 or hygiene | queued |
| ~~36~~ | ~~`/quests` CTA under the bar~~ **DONE — PR #14 → main `68f832e`**: CTA moved from the hero to its own section between the sticky filters and the board; measured clear at 390×844 / 390×664 / 375×812 (a nudge was measured and rejected — the only window clearing all three heights is 15 px). One wholly-under (non-deceptive) theft moves to the first filter pill at 390×664 only; the deceptive first-paint set is unchanged. `/feed` reactions ACCEPTED (position is a function of the first post's length, not layout). One S9 flake on the PR run, identical re-run green (queue 22, Rye's session). Harness bug recorded (parseFloat of an unresolved `calc()` = NaN → zero band → everything clear) | — | closed |
| ~~37~~ | ~~Store 360 overflow + admin sign-in a11y~~ **DONE — PR #13 → main `1889a04`.** ROOT CAUSE CORRECTED: not D's #10 (its pool line is inside the collapsed detail); a 39-char game-variable name in the lifecycle hint (`feed.max_hearts_per_recipient_per_cycle`, dot ≠ break opportunity) sets the shared grid column's min-content floor, and that hint renders only for non-core modules that are ON — F3's earlier zero was measured with every non-core module off. Fix `min-w-0 break-words` on the card as a pair; 360 → 360/360, cards 272/287/302 responsive. Admin sign-in: `autocomplete username/current-password`, aria-labels, reveal button named + 44×44, ≥3:1 | — | closed |
| ~~27~~ | ~~Admin sign-in a11y~~ DONE in #13 | — | closed |
| 33 | Wire `prepareImageForUpload` into the two remaining upload sites: `client/src/pages/Admin.tsx:8003` (brand image → `/api/admin/brand/image`, `{maxEdge:2000, quality:82}`) and **`client/src/pages/WorkWithUs.tsx:224`** (`/api/work-with-us/attachment` — no server-side compression at all, originals written to disk up to 10 MB; helper returns PDFs untouched so the call is safe; `maxEdge:1600`) | small client lane | queued (from I) |
| 34 | `loop.e2e.test.ts:1015` pre-existing race (Lane I saw one red CI on an earlier SHA, identical re-run green; written up in PR #8 comments, filed for the economy lane) — a second flake mechanism beside S9 | economy lane | queued (from I) |
| 32 | **Hub `Contrast Audit` + `Lighthouse CI` workflows are broken** — Contrast dies at `pnpm add -D puppeteer` (ERR_PNPM_ADDING_TO_ROOT, needs `-w`/a workspace target); Lighthouse fails whole-site assertions (color-contrast, total-byte-weight, unused JS, source maps) on every branch since 2026-08-03. Both are noise until fixed; neither is a required check | a hub hygiene lane | queued |
| 31 | **Next cost lever is the shelf, not the model** (K1 closing finding): a no-tools organize prompt is 2,537 input tokens, ~2,200 of them BM25 corpus excerpts; tools are 911. A deterministic pre-step that picks fewer/shorter excerpts (or none for questions the router already classified as lookups) is the remaining ~85% of the model path. Measure with `count_tokens` before and after; do not cut relevance blind | a later assistant lane | queued |
| 26 | **Lanes K1 + K2** (R24): deterministic router + prefetch + caching measurement + `path` column (K1); Batch API for the scheduled synthesis path (K2). Land by PR after F1/F4/I/D/P | — | dispatched 2026-08-15 |
| 25 | `organize` has no cheap path: 14/14 answers open a reader → **being fixed by K1** (router `no-tools` + prompt line + deterministic/prefetch paths) (even "what is consent vs consensus" opened `roles.all`), so `dailyBudget: 50` ≈ 25 answers/day. Consider letting the model skip tools when the question is not about the village (prompt guidance), or raising organize's budget — Rye's call on the number (his key pays) | Rye + a later assistant lane | queued |
| 23 | Desktop map: the new escape control may overlap the artifact's `#buildBtn` (`left:14, top:52`, editors only, `display:none` otherwise) — unmeasured for a member who CAN edit the map on desktop; 1px overlap with `#mapSel` at 1280 confirmed harmless | map lane / F2 follow-up | queued, low |
| 20 | Store perf: `/admin` ships 863.6 KB JS (328 KB Admin chunk over the store); code-split the store panel after F3 lands; needs a baseline first | F3 | queued |
| 21 | Lane V re-run for non-included tiers the day the first Connected/Managed listing exists (vendor pills/support lines never rendered on mobile) | first real listing | queued |
| 12 | Usage-capture gap (named by Lane A, deliberate per spec ordering): a loop that exhausts the day budget MID-flight returns 503 and records no usage row (writer sits after the ok-guard); currently console.warn only. Revisit when billing reads `assistant_usage` | after item 5 | queued |

Merge order inside game-amora: **A first**, C rebases and reconciles `server/index.ts` by hunk, S
last. Before any merge: `git cherry main <branch>`, never `--stat A...B`.

---

## §5 Gate sets — verbatim, SHA-stamped. Re-read at session open.

**game-amora** — read from `.github/workflows/ci.yml` at `28dace2` (blob `ac1b1e9`), 2026-08-14;
**GREW on 2026-08-15 at `e18b380` (Lane D, PR #6): a Doc link guard step before the build.**
**Thirteen** now (Lane I's `check-image-budget.mjs` landed at `4aa867d`), in CI order, run cold —
every lane must enumerate `ci.yml`'s `run:` steps, never trust this count:

```
pnpm check
rm -f node_modules/typescript/tsbuildinfo && npx tsc -p tsconfig.tests.json --noEmit
node scripts/check-brand-refs.mjs
node scripts/check-voice.mjs
node scripts/check-auth-fetch.mjs
node scripts/check-artifact-budget.mjs
node scripts/check-doc-links.mjs          # NEW at e18b380 — every relative path in the builder docs resolves
node scripts/check-image-budget.mjs       # NEW at 4aa867d — WebP-only rasters, 400 KB/file, total ratchet
pnpm build
pnpm test
pnpm audit --prod --audit-level high
```

Plus the bundle budget in ci.yml: MAX_MAIN_JS_KB=700, MAX_TOTAL_DIST_KB=6000.
Notes: `tsconfig.tests.json` is a blocking CI gate CLAUDE.md omits; run it COLD. Brand ratchet
is at **63/63 — zero headroom** (measured at 1428603; script unchanged to 28dace2); read `$?`,
never the last line; never `--update-baseline`. Hollow-green check: `.env` with
`TEST_DATABASE_URL`, vitest Duration in minutes, skip count vs pre-edit baseline (19/60 files
skip without the env var). A push is not a green: read the CI run on the SHA afterwards (`gh` is
installed).

**hub** — read from `.github/workflows/ci.yml` blob `8b68747` at `55cff89`, 2026-08-14. House
gates per CLAUDE.md + regen-ship-gate:

```
pnpm gate                                  # truncation audit + typecheck
node scripts/check-migration-numbers.mjs   # BLOCKING in CI, omitted by CLAUDE.md (Lane P, 2026-08-15)
node scripts/check-env-example.mjs         # BLOCKING in CI, omitted by CLAUDE.md (Lane P, 2026-08-15)
pnpm test                                  # + pnpm test:integration when server logic changed
pnpm build                                 # anything affecting the bundle
pnpm audit --audit-level moderate          # ADVISORY (`|| true`) — never blocks
```

CORRECTION 2026-08-15 (Lane P read `.github/workflows/` directly): the hub has **no
bundle-budget gate** — that belongs to game-amora only; the coordinator's memory that "bundle
budget and dependency audit both block" was wrong for the hub. Every hub lane enumerates the
workflow's `run:` steps itself.

Plus `/ship` (GOLDEN_RULE) before any push to main; push to main auto-deploys via Railway — poll
`pnpm railway:deploys` to SUCCESS afterwards. Coordinator's own commits on `wt/integration` are
docs-only and do not touch main.

---

## §6 Open blockers

| # | Blocker | On whom | Since | Blocks |
|---|---|---|---|---|
| ~~B1~~ | ~~ADR-49 ruling~~ **RESOLVED 2026-08-14: Rye approved.** Managed-plane code in C2, Lane S build, and Lane H are no longer ADR-blocked (Lane S build still waits on its stage gates and C1/C2; Lane H still waits on §3c Q1–3 for signatures) | — | — | — |
| ~~B6~~ | ~~Contract publish-vs-private~~ **RESOLVED 2026-08-14: Rye ruled contracts are published on a URL** (R11). The sequencing constraint survives as queue item 10: nothing publishes until C1 + the incident log land, because clauses 9–12 describe machinery that does not exist yet | — | — | — |
| B2 | Contracting entity Q1–Q3 (§3c) | Rye + counsel | 2026-08-14 | CORE signing anything (Saberra DPA, vendor agreement) |
| B3 | UBIT (§3c Q4) | Rye's accountant/counsel | 2026-08-14 | the first invoice only |
| B4 | Saberra commercial terms — **the ask is DRAFTED and ready to send**: `docs/integration-program/lane-s/STAGE1_DILIGENCE_REQUEST_LETTER.md` | **Rye sends it** | 2026-08-14 | whether Lane S build is worth scheduling |
| B5 | Saberra tenant credential — **CONFIRMED never issued** (their doc 07:19; exhaustive local search negative: 5 .env files, 32 worktrees, Railway, Windows env, MCP auth stores, mailbox). Ask: `SERA_API_SECRET` bearer for `GET /backup` + `GET /stats` at `amora-api.saberra.com`, read-scoped if they can mint it | **Rye obtains from Saberra** (folded into the stage-1 letter) | 2026-08-14 | every stage-0 number; the go/no-go on the whole listing |
| B8 | **Map prototype mobile overflow** (V-H3): `docs/prototypes/grounds-v0.html` renders 790px wide in a 390px frame; ✕ controls off-screen; "Enter the Land" 167×38. Message sent to the SWARM COORDINATOR session with measurements + screenshots 2026-08-15 | map lane owner | 2026-08-15 | a fix SHA reported back; the coordinator closes it in the ledger |
| B7 | **Saberra has no hard-delete endpoint** — deletion appears nowhere in their API docs; Sera can archive/merge only inside a conversation, which is not callable as a contract. Contract term 2 and stage-3/4 exit gates are unmeetable until they build it | Saberra (asked via the stage-1 letter) | 2026-08-14 | stage 3 exit, stage 4 `forgetMember` proof, any go-live |

---

## §7 Changelog

- 2026-08-14 · `wt/integration` created at hub `55cff89` via `scripts/new-worktree.sh integration`. Proof: `git worktree list` shows it; `.env` present; clean tree.
- 2026-08-14 · Program docs adopted: 10 program files + 3 history files + 8-file Saberra package into `docs/integration-program/` with INDEX.md. Proof: `ls` output in session transcript.
- 2026-08-14 · §0 state measured: hub 55cff89, game-amora 28dace2, 30 worktrees, 4-way migration scan → 0078/0079/0080 free. Proof: scan output in transcript.
- 2026-08-14 · ADR-49 appended to `.ai/docs/DECISIONS.md` as PROPOSED; six terms registered in DOMAIN-LANGUAGE.md.
- 2026-08-14 · Lanes A, C, S dispatched as background agents (opus), briefs amended per §8-R5/R6.
- 2026-08-14 · **ADR-49 accepted by Rye** (in-session, after the opening brief). Status flipped in DECISIONS.md; blocker B1 resolved; Lane C notified that Managed-plane C2 artifacts are authorized, not merely designed-under-assumption. Committed `f22a07d`.
- 2026-08-14 · **Contract publication ruled by Rye: published on a URL** (R11). B6 resolved; queue item 10 added (publish after C1 + incident log). Committed `ede6c2a`.
- 2026-08-14 20:21 · **Lane S reported: stages 1–5 drafted, stage 0 blocked** — no tenant credential has ever been issued (confirmed from their own doc 07:19 + exhaustive local search). Six artifacts verified on disk and adopted at `docs/integration-program/lane-s/`. Findings: no hard-delete endpoint exists (B7); Managed gate fails 7/12 rows on current evidence; sandbox tenant already live; Sacred Pause (Aug–Sep) confounds the 90-day window — bucket by week when the data lands. No code written, nothing sent to Saberra, four unauthenticated /health-class GETs total. Committed `70c3c8e`.
- 2026-08-16 ~13:05 EDT · **90-minute check (R30): main `3c295b8` live; other session rebased, still dirty, no go. R31/R32 recorded. Ten round-4 briefs committed (`round4/briefs/`); L1a and L5a DISPATCHED (disjoint zones, R32); L1/L2/L3/L6/L7 held; L4 handover ready to send; next check 60 min.** Brief-drafting workflow: 10/10 files written; 8 agents and the review agent died on the session limit AFTER writing (files complete, review to re-run).
- 2026-08-16 ~11:00 EDT · **R27–R29 recorded; workflow lane re-measured game-amora and researched the map.** Facts: main STILL `135db66` (nothing landed from the other session), PR #16 open (grounds inspector, MERGEABLE), five dirty unpushed worktrees hold their real work (`wt-doors`, `wt-map-org` incl. `orgChart.ts` archetypes, `wt-map-overlays`, `wt-map-geometry`, `wt-housing` incl. untracked `0077`), CI = 14 steps, `0083+` free on every ref. Sociocracy-map research → 14-point interaction spec for `/map/circles` (adopted into L2). Now|Vision inspection verified: Now hides only phase-3 blueprints, so phase-2 pools at 0–35% show as WIP and Vision adds three ghosts + overlays; sheen paints in Now (defect); tooltip promise untrue; model B (three tiers, gated promotion, shared "vision with exit conditions" block) recommended. Proposal §10 + `round4/` memos committed. Waiting on Rye's N1–N8 and on the other session's landings (R27).
- 2026-08-16 ~08:45 EDT · **Round 4 opened (Amora): five asks from Rye by Telegram, improved and grounded before dispatch, NOTHING DISPATCHED.** Two read-only scouts at `135db66` + two research lanes (Agent Village digest, every link followed; community + lunar calendar research with `astronomy-engine` measurements) → `docs/integration-program/ROUND4_PROPOSAL_2026-08-16.md` (asks 1–5: as-built, improvements, 24 numbered questions with defaults, draft lane plan L1–L7) + `round4/AGENT_VILLAGE_DIGEST_2026-08-16.md`, `round4/CALENDAR_RESEARCH_2026-08-16.md`, `round4/moons-2025-2028.mjs`. Facts that reshape the asks: enabled and published are ONE lifecycle enum; Admin nav ignores module state; no image field; `/library` is the Material Library; live `/map` is the grounds artifact another session is patching now; the eight capitals exist only in an unbuilt spec while the map has nine *media* glyphs; the calendar is a UTC list with no recurrence/.ics and the village TZ drives seasons only; `CycleClock` moon ring never fills (0–1 phase divided by 29.53 again); `shared/lunar.ts` is a ±14 h mean clock shared by gratitude, pool and now the calendar. Waiting on Rye's rulings (R27+).
- 2026-08-15 19:38 EDT · **Hub PR 2 VERIFIED LIVE** — projections observed on regencivics.earth (actorId/metadata and adminNotes keys gone). Both security PRs are DONE by the program's definition. **The program has nothing in flight and nothing unverified.**
- 2026-08-15 ~19:45 EDT · **HUB SECURITY PR 2 MERGED (#43 → hub main `cbec306`) — Lane HS COMPLETE.** All ten HIGH + eleven MEDIUM + four extras projected across two PRs; the check-in token abuse path is closed and verified live; three judgement calls reasoned from the hub's own ADRs (votes unattributed; 3-decimal coordinates; server-side ownership boolean). Every lane of rounds 1–3, the cost programme, the fix set, and the security work is now merged; nothing is in flight. Rye's rotation (item 18) is the open action.
- 2026-08-15 19:29 EDT · **PR #14 DONE live at `68f832e`** — CI green, build marker matches. game-amora is fully deployed through the last small fix; only HS PR 2 (hub) remains in flight.
- 2026-08-15 ~19:25 EDT · **Hub security fix VERIFIED LIVE + PR #14 merged (main `68f832e`).** Live probes of regencivics.earth: `events.list` 21 events, `checkinToken` key absent, all room URLs null; suggestions/tools carry no emails → **Rye's token rotation (item 18) is NOW DUE.** F1's `/quests` CTA move landed (measured clear at all three viewports; the nudge window was 15 px and rejected on arithmetic); the last R26 residual (`/feed`) accepted with the number that shows why. One S9 flake on the PR run, re-run green — the mechanism Rye's session owns.
- 2026-08-15 ~19:15 EDT · **PR #13 MERGED → main `1889a04`** (F3 resume): the store's 360px overflow closed for real — root cause corrected from the coordinator's suspect (D's #10) to a data-gated long token in the lifecycle hint; card hardened with `min-w-0 break-words`; admin sign-in labelled and autocompleted (queue 27 closed). Lesson in §9: measure with the modules on. K2 confirmed clean (no leaked mutex, tree clean). CI + live probe running.
- 2026-08-15 ~18:50 EDT · **HUB SECURITY PR 1 MERGED (#42 → hub main `45e7737`).** Twelve public procedures now return public projections; the event check-in token no longer leaves the server on any public read; the activity-feed enum bug that leaked abuse-flag reasons is fixed. HS resumed on PR 2 (eleven MEDIUM) cut from PR 1's branch. Waiting on the Railway deploy of hub main to tell Rye to rotate tokens (item 18). Three pre-existing hub defects HS found are queued (38–40); its one judgement call (`buildRedirectUrl` gate) is on Rye's list (19).
- 2026-08-15 ~18:30 EDT · **Lane V2 REPORTED — round-2 mobile fixes CLOSED on the harm metrics (R26).** Login, map escape, targets, autocomplete, contrast, labels, headings, headers, mint, robots/sitemap, posters: all measured closed on the live build. Two residuals (wholly-under-the-bar CTAs on `/quests` 375 and `/feed` 844) ruled below-effective-fold and routed as cheap layout moves (F1); one regression (store 360 overflow back to 10 px after D's store-card additions) routed to F3 with the admin sign-in a11y. V2 caught three defects in its own harness before trusting any zero — lessons in §9.
- 2026-08-15 18:06 EDT · **K2 DONE live at `72a7fca`** — every game-amora lane of rounds 1–3 and the cost programme is now deployed. Outstanding on game-amora: only the V2 closing audit (report-only). Outstanding on the hub: HS (security), and hub main carries P's pool merge. Handoff to be refreshed.
- 2026-08-15 18:02 EDT · **PR #10 DONE live at `bd16b7f`** (D's added-line scan + pool strings on the store card + validator pool rule) — CI green, build marker matches. Round 3's game-amora landings I, D, P are all live; K2 follows.
- 2026-08-15 ~18:20 EDT · **Lane K2 MERGED via PR #11 → main `72a7fca`.** The cost programme is complete on main: K1 (deterministic/prefetch, live and measured) + K2 (batch road, off by default, R25). K2 caught two of its own defects before shipping — a timer that would have consumed half the village's daily assistant budget just by ticking, and a port-range collision. CI + live probe running.
- 2026-08-15 ~18:05 EDT · **PR #10 MERGED → main `bd16b7f`** (D's follow-up: added-line contribution scan, pool strings on the store card, validator pool rule, docs). `intake: SUCCESS` on its own PR — the gate D shipped, broke twice, and fixed twice now passes a real module-shaped change end to end. D's own summing-up, worth keeping: both times this lane shipped something wrong, the wrong part lived where no test could reach it. CI + live probe running.
- 2026-08-15 17:40 EDT · **Lane I DONE live at `4aa867d`** (also carries P's game-amora pool code) — CI green, build marker matches. Rounds 2 and 3 on game-amora are now fully deployed except K2 (batch) and D's follow-up (validator scoping + pool strings).
- 2026-08-15 ~17:45 EDT · **HUB SECURITY: the PII sweep is much wider than two procedures.** HS's sweep subagent (orphaned by the power loss, reported to the coordinator) found 10 HIGH + 11 MEDIUM public procedures on the hub leaking emails, wallet addresses, coordinates, admin notes — and `events.checkinToken`, which is an abuse path (write attendance + mint a ledger credit with any email). HS resumed with widened scope (PR 1 all HIGH; PR 2 MEDIUM). Token rotation + ledger audit added to Rye's list at priority 2. Table adopted under `round3-security/`.
- 2026-08-15 ~17:35 EDT · **POWER LOSS killed five lanes mid-flight (D, I, K2, HS, V2).** Recovery from disk, per the standing lesson: measured every worktree's committed/pushed state before touching anything. I: fully pushed, PR #8 green — merged on the PR body as its report (main `4aa867d`). K2: three commits unpushed + one dirty test → resumed. D: pool section pushed (8c444b0); validator added-lines scoping in progress on disk (two new scan files, validate-module.mjs, and an unexplained server/index.ts edit — asked) → resumed. HS: players.ts modified + new PII test uncommitted → resumed. V2: 3 scratch files → restarted. Nothing re-dispatched over pushed work.
- 2026-08-15 ~14:50 EDT · **All four fix lanes DONE (F4 live at `3d1e57b`); Lane P MERGED on both sides (game-amora #5 → `c09c172`, hub #41 → `37c61d2`); Lane V2 dispatched as the closing proof.** The fixed intake classifier exposed a SECOND validator false positive on P's PR (whole-file greps) — merged on proof (0 flagged patterns in P's added lines), fix routed to D alongside the pool strings. Hub merge decision: the real gates (typecheck·test·build + real-MySQL integration applying 0227 with drift check) are green; `Contrast Audit`/`Lighthouse CI` have failed on every hub branch since 08-03 (broken workflows) → queued as a hub hygiene item, not a P defect. P proved 0227 + the statement job on a scratch schema rather than touch the production `DATABASE_URL` its worktree carries.
- 2026-08-15 ~14:40 EDT · **Lane P REPORTED — two PRs open, held pending proofs.** Design + ADR-50 + a working statement job with a balancing fixture run; game-amora side small (poolStatus, builtByAccount, contract 1.1); hub side large (20 files) incl. migration 0227 that has NEVER touched a database and a suite with 10 skips → coordinator asked for the DB proof before merging #41 (hollow-green rule); game-amora #5 asked to rebase so the FIXED intake gate runs on it (the proof D said P's PR would be). Three self-corrections logged. P's chip about `playerProfiles` publicProcedures spreading emails/wallets/coordinates to anonymous callers → **Lane HS dispatched immediately** (production PII). Rye's list gains three pool decisions (amount, escrow, orphan clock). Hub gate set in §5 corrected from P's reading of ci.yml.
- 2026-08-15 ~14:20 EDT · **K1 is DONE and measured on the live surface**: CI green on the merge, live build `79cf20a`, and two coordinator-run organize questions through the real route with the standing test admin both returned `path: deterministic` with correct answers (vacant seats named; decision log honestly empty) at ~1.3 s and $0. The cost programme's interactive half is live in production. Note for future lanes: `railway variables` needs `--service "Amora Game"` in a project-linked dir (K1's `-s` note confirmed).
- 2026-08-15 ~14:15 EDT · **Lane K1 MERGED via PR #9 → main `79cf20a`.** The cost programme's interactive half is on main: deterministic router (catalog-scoped), eight templated renderers, single-POST prefetch, the no-tools line, `path` on `assistant_usage` (migration 0081). Measured on the ten-question set: **$0.0807 → $0** against the empty live record; **$0.0033 (−95.9%)** with a populated one; blended per question $0.00807 → $0.00033. Caching measured and correctly declined (969-token prefix vs 4,096 minimum). Two design defects caught by the build (narrowed ≠ lookup; empty shelf ≠ advisory) — lesson in §9. Open PRs seen: #8 (Lane I, `verify` FAILURE — awaiting I's report), #5 (Lane P, intake false-positive from the pre-fix workflow; `verify` green — awaiting P's report). F4 cleared to skip the pathological local mutex (D's precedent) and rebase onto 79cf20a; CI authoritative.
- 2026-08-15 13:56 EDT · **PR #7 (intake classifier fix) DONE live** — CI 31899521833 green on `58902fa`; `/health` → build `58902fa`. Main now carries D + fix; the deployed village serves the builder front door with a tested intake gate.
- 2026-08-15 ~13:35 EDT · **Lane D MERGED via PR #6 → main `e18b380`** (first PR-flow landing under R21; merge commit; `verify` green; D correctly declined to open the PR itself). At merge, D's own `module-intake` check FAILED on its own PR — classifier greps bare `clause 14` and matched an informational line → fix PR requested (queue 29), lesson in §9. Contract-version constant bump routed to P (queue 30). F4 rebased clean at 9260886 (both VillageMap/Forum edits verified by content), waiting on the mutex for its final suite; told the quest-image item is closed and its final rebase target is ≥ e18b380. CI + live probe on e18b380 running.
- 2026-08-15 12:56 EDT · **F1 is DONE, observed live** (CI green ×2; `/health` → `d051909`). The same probe showed the uploads volume at 14 files / 1 MB (was 0 on every prior probe): coordinator verified all 14 live quest-poster URLs return 200 at 43–101 KB — Lane I's Part A (optimize → Railway volume, identical filenames, no DB change) has landed on live ahead of its report; L-M2 closed on the live surface; Rye's item 11 closed. F4 rebasing for the last fix landing.
- 2026-08-15 ~13:10 EDT · **Lanes K1 + K2 dispatched (R24)** on Rye's "dispatch lanes to do all that": K1 = router/templates/prefetch/`path` column/caching-if-≥4096/ten-question before-after in the assistant + organize surfaces (migration 0081); K2 = Batch API for the scheduled synthesis path with idempotent bookkeeping tables (migration 0082), a poll job, and a kill-switch variable; sync admin synthesis untouched. Disjoint zones; both PR flow; both rebase over the fix and round-3 lanes still landing. In flight now: F1, F4 (holding), I, D, P, K1, K2 — seven lanes; the full-suite mutex is the only shared resource.
- 2026-08-15 ~12:35 EDT · **Lane R DONE — the memory demo is proven live, and the corpus finding changes the negotiation.** Screenshots delivered to Rye (desktop + iPhone) showing "Read from the village record: seats.vacant" under a real answer — Lane A's one unproduced deliverable and Lane L's could-not-measure #3, closed. Test admin created; token recipe adopted (no secrets). THE FINDING: Amora's village has zero member-authored governance content — every forum thread is a seeded example, so `village_record` is structurally empty and the three "what did we decide" questions were answered honestly with "your decision log is empty" while seven reader-backed questions returned real facts (11 circles, 4 vacant seats, 14 quests…). This is the number the memory-module plan said to measure first: the past-tense memory product is worth exactly as much as the governance record a village keeps. Cost: $0.0081 per tool answer vs $0.0035 plain (2.34×); every organize answer opens a reader (queue 25); rate counter and usage ledger agree 1:1. Spend $0.127 vs ~$0.10 authorized, disclosed with cause. Main moved to `15f378d` (token session: name-clash guard + e2e fixture; no F1/F4 overlap). Queue 24 added (.invalid email in health snapshots).
- 2026-08-15 ~12:20 EDT · **Network outage killed I, D, P mid-work (F1 survived, F4 holding); all three resumed after worktree inspection** (P had 4 uncommitted files → commit-first; D and I had not written yet). Rye's four follow-ups recorded as R23: coordinator creates the test admin (Lane R dispatched — credential-minimal: discarded password, JWTs minted from the server secret at call time); a signing HUMAN suffices as counterparty; pool payout identity = ReGen Civics account + linked Hypha/Base address (P re-briefed); branch protection SET by the coordinator via API (PR required, 0 approvals, `verify`, admin bypass) — the pre-existing rule had `verify` + admin bypass and no PR requirement, which is why direct pushes had landed before CI. F3 DONE live at `efdf7da`.
- 2026-08-15 ~11:45 EDT · **Rye ruled round 3 (R18–R22); Lanes I, D, P dispatched; F3 LANDED on main `efdf7da`.** Rye's answers: all ten store decisions ruled (rev-share 0% with the $ReGen pool as the primary incentive; no payment processing; no fee; automate the SLA where possible; anyone can be a builder — coordinator holds one carve-out: paid/member-pii listings still need a signable counterparty; price to members; automate withdrawal where possible; 8/9/10 yes) and all seven new ones (test account yes; PR-only intake + Claude-assisted DD; branch protection yes; security invariant yes; WebP standard + ratchet yes; client-side upload optimization; pathway yes). New design: the $ReGen builders' pool (R20 defaults; R22 Rye confirmed $ReGen is the hub's Game token). Dispatched: Lane I (posters → volume, WebP sweep, upload helper, image ratchet), Lane D (START_HERE + facts script + link check + intake workflow + CODEOWNERS + review checklist/validator security + review-agent + contract v1.1), Lane P (hub pool design/build + game-amora `poolStatus`/payout). F3 verified (cherry 3, Admin.tsx only, CI green) and landed; F1 next, then F4; then I/D/P by PR (R21). Still on Rye: create the test admin account + choose the token-handling mode (blocks the live run); set branch protection.
- 2026-08-15 ~11:00 EDT · **F2 DONE (live at 9632450); F4 sweep complete at `3cb6331`, waiting on F3 + F1 to land first; F3 interim: all four store defects VERIFIED (contrast 20→0 failures, 360px overflow gone, toggles ≥44, search named), told to take all 28 `d.error` sites in Admin.tsx (F1 does not touch that file); Rye opened a separate session for the S9 flake — item 22 withdrawn from F4.** F4's sweep surfaced a real bug its own change created (OnchainCard wallet-sign guard) — fixed, lesson in §9. Rye asked for round-3 review before dispatch; coordinator delivered the ten store decisions + seven new ones + three blocking questions (test admin account; PR-only intake + branch protection; client-side vs sharp upload optimization). Awaiting answers.
- 2026-08-15 ~04:30 EDT · **Lane F2 LANDED on main `9632450`** (fast-forward; cherry = 1; `LivingMap.tsx` only; branch CI run 31889379897 green after one S9-flake re-run — mechanism found and routed to F4 as item 22). V-H2 CLOSED with a WebKit proof at three viewports and the deep-link hash contract intact. R17 ratifies landing on `/` for consistency across all three exit triggers. F3, F1, F4 messaged with the new base and the flake note. CI + live probe running.
- 2026-08-15 ~04:10 EDT · **Lane F4 REPORTED and HELD (R16).** All items verified on a local production build at `f9624d9`/`278df75`: five security headers on every response, `x-powered-by` gone, `frame-ancestors 'self'` with the map iframe proven still loading; geolocation denied after a zero-hit grep; HSTS deliberately unset with a test asserting it stays unset (→ Rye 10); quest seed → null and the 14 real files located in a gitignored uploads volume (→ Rye 11); `/admin/mint` gated on session; robots.txt + sitemap.xml generated per request from the footer nav; 319 401-bodies unified with three verification families excluded. F4's own handoff flagged the 57 `d.error` renderers → the coordinator held the landing and routed the sweep (16 files to F4, 5 to F1/F3); land order now F2 → F3 → F1 → F4.
- 2026-08-15 ~03:40 EDT · **All four fix lanes stalled simultaneously (infra watchdog), all recovered.** Worktree inspection: F2 `LivingMap.tsx` dirty (was at "now the gates"); F3 `Admin.tsx` dirty (mid-verify); F4 `Mint.tsx` + `index.ts` + `quests-seed.json` dirty (was starting L5); F1 seven files dirty incl. `MobileTabBar.tsx`, `Layout.tsx`, `mobileNav.ts`, `index.css`, `Register.tsx`, `Feedback.tsx` (was at the Layout spacer). Nothing pushed, mutex free. Each resumed from its own transcript with a commit-first instruction; F4 re-reminded of the L6 retraction; F1 re-reminded it lands last and must rebase onto whatever main is. Paid lesson added to §9.
- 2026-08-15 ~02:55 EDT · **CORRECTION from Lane L (self-review of its citations):** finding L6 RETRACTED — the `/api/network/published` gate is deliberately stricter (members-rank floor so `preview` never publishes needs/offers to peers), applied consistently at `/api/platform/info` and `village.json`; that floor is the *mechanism* behind the clean federated-docs verdict, not an accident of an all-`public` registry. Lane F4 messaged mid-flight: do NOT replace that gate; body-shape only, if opacity is preserved. Off-by-one on the vendor-gate line (5664, comment "A no-op today: nothing is above `included`") — strengthens the by-design verdict. Report + triage docs amended.
- 2026-08-15 ~02:40 EDT · **Lane V REPORTED; triage done; four fix lanes dispatched.** V's headline: **four HIGH findings on a phone that desktop QA could not see** — the `/login` Sign In button is covered by the fixed tab bar at first paint with the URL bar visible (a tap lands on "Gratitude"; control tap proved it), CTAs on `/quests` `/login` `/feed` are tap-stolen the same way (19 thefts / 13 routes, one root cause: no reserved page-bottom space), `/map` strips every in-app nav path on mobile, and the map prototype's own document is 2× the viewport with its close controls off-screen. Coordinator RETRACTED V-M5 (safe-area padding exists at `MobileTabBar.tsx:29`; WebKit-on-Windows reports insets as 0 — recorded as V's own could-not-measure). Ownership resolved: the map is `docs/prototypes/grounds-v0.html`, the map lane's active artifact → H3 messaged to the SWARM COORDINATOR session as blocker B8; H2 fixed shell-side (LivingMap.tsx). Both reports + `TRIAGE_AND_FIX_ROUTING_2026-08-15.md` adopted under `round2-qa/`. Lanes F2 (map shell), F3 (store surface), F4 (server hygiene), F1 (mobile shell + forms, HIGH) dispatched concurrently on disjoint zones; land order F2→F3→F4→F1; V re-runs its sweeps as the closing proof. Handle order recorded at dispatch.
- 2026-08-15 ~01:50 EDT · **Lane L REPORTED** (report adopted at `round2-qa/LANE_L_REPORT_2026-08-15.md`). Headline: **no HIGH findings on any public signed-out path at `5f3cf0b`.** MED: no security response headers (framable — compounds with the `/map` iframe); 14 seed quest images 404 on live AND fresh local build (build defect); `/admin/mint` renders 404 signed-out while calling admin endpoints; 12 store-surface contrast failures (2.49:1 pills, 2.60:1 sidebar labels, 4.39:1 Core); unlabelled form controls on 10 routes; store search box lacks aria-label. LOW ×7 (soft-404s + no robots/sitemap; off-module title/body mismatch; heading skips; one marginal contrast; four 401 body shapes; a hand-copied module gate at index.ts:8976; 0077 absent = allocation, not loss). Round-2 focus ALL CLEAN or by design, each with a control. Could-not-measure: 8, most notably the JourneyToLaunch citation line has never been rendered anywhere (needs an assistant key — reinforces Rye's item 8) and 921 contrast nodes unmeasured, not counted as passes. Coordinator holds fixes until Lane V reports: M4/M6 (Admin.tsx) and M5 (form components) will overlap with V's mobile findings in the same files.
- 2026-08-15 01:15 EDT · **Lane M is DONE; Lanes L + V dispatched (audit-only phase).** Both CI runs on `da46358` green; live `/health` already reports `5f3cf0b` — another session's commit ("Circles keep their birth date, and one number decides when a boot has failed": store-db round-trip test, vitest config) landed on top with CI green; `merge-base --is-ancestor da46358 5f3cf0b` = yes, so the store is live. QA target set to `5f3cf0b`. Coordinator ruling: **L and V audit only, no fixes** in this phase — two lanes fixing concurrently from overlapping findings (shared components, Admin.tsx) would collide; the coordinator dedupes and triages, then routes fixes (queue item 18). Handle→lane mapping recorded at dispatch this time (first = L, second = V).
- 2026-08-15 · **Lane M LANDED on main `da46358`** (fast-forward; coordinator-verified cherry + 11-file in-ownership surface + no forbidden files + no migration claimed). Research: STORE_BEST_PRACTICES.md (5 ecosystems, [P]/[S]/[U] provenance marks; corrected three stale premises incl. that Salesforce's famous 15%/25% is not on any live primary source). Design: STORE_DESIGN.md, credential-is-the-licence as the enforcement spine, §7 decision table → Rye (§10 item 9). Built: catalog/detail/search, pricing + licence pill, `withdrawn` (409 names successor; withdrawn listings resolve, never orphan), member-pii⇒member-driver requirement, builder guide, validate-module.mjs sharing boot's own validator. Fixture proofs ×10 incl. both federated docs projecting only {id,lifecycle}; fixture deleted. **Epistemics note:** M refused to transcribe the coordinator's compressed research relay because one claim conflicted with a primary source — and it was right: the Atlassian 90-day figure is KB retirement POLICY, the contract gives 45-day takedown + license survival; the coordinator's relay conflated the sources. Recorded as [R] in its §6b. Mobile-first classes verified compiled; **layout never browser-rendered — Lanes L/V audit it.** CI + live probe running.
- 2026-08-15 00:41 EDT · **Lane Q is DONE, observed live.** Both CI runs on `18a7e61` green; live `/health` → build `18a7e61`. Queue items 11, 12, 13 closed. Only Lane M remains in flight in round 2; L+V dispatch on its DONE.
- 2026-08-15 · **Lane Q LANDED on main `18a7e61`** (fast-forward; coordinator-verified cherry + 9-file surface + no forbidden files). Seven of eight defects VERIFIED with proofs; defect 6 (Maia hardcodes) is 4-of-5 because Lane C's landing had moved the fifth string into the PLATFORM_CARDS array (~index.ts:12679, Lane M's zone) — routed to M, plus a sixth instance Q found at index.ts:8485. Mid-flight, another session landed a 3-commit token-registry batch (d14b160→fa2551c; gate set verified UNCHANGED — no ci.yml/check-* edits); Q self-rebased onto it and re-ran all eleven gates cold (1096 tests / 0 skipped / 431.9s). CI on 18a7e61 + live probe running. **CORRECTION, coordinator's own:** the two earlier "Lane M" guidance messages had been misrouted to Lane Q (handles swapped from a two-dispatch block); both re-sent to the true Lane M in full, with the rebase warning (Q's index.ts + the token session's Admin.tsx both moved under it) and the mutex release. Paid lesson added to §9.
- 2026-08-15 · **Round 2 opened on Rye's mandate (R13).** Lane M (store research+design+build) and Lane Q (eight-defect fix list) dispatched concurrently with disjoint index.ts zones and a shared full-suite mutex (`.test-lock`); Lane L (live test) queued behind their deploys. The Saberra letter handed to the "Saberra-Amora game integration" session (`local_2b77f6c4…`) with review context (B5 credential, B7 hard-delete, Managed-gate finding, keep-it-answerable constraints) — that session delivers the final letter to Rye; nothing goes to Saberra from any session. UBIT note extended in §3c: a CORE margin on third-party DEVELOPER modules raises the same unrelated-business-income question as vendor margins — same counsel ask, one more line.
- 2026-08-14 22:12 EDT · **Lane C is DONE, observed live.** Both CI runs on `d14b160` completed success (`ci [main] 31858421775`, `ci [wt/module-library] 31857713087`); live `/health` → `{"status":"ok","build":"2026-07-28-wave1-d14b160"}` — deploy auto-triggered, migration 0079 applied through the fail-loud boot runner. §0 deployed marker: `d14b160` live at 22:12 EDT. **The opening round is closed: all three lanes through their first phase, two observed live in production.**
- 2026-08-14 ~22:10 EDT · **Lane C LANDED on main `d14b160`** (fast-forward of its single rebased commit). Coordinator verification: `git cherry` = exactly one `+`; 29-file surface, all in-ownership (the one unclaimed file, `NotifyPrefsPanel.tsx`, verified from content as C2's member-facing "never told deleted when a store did not confirm" panel); no Lane A or tripwire files touched. Lane evidence: 11 gates green cold (brand 63/63, main JS 503/700 KB, dist 5119/6000 KB), 1062 passed / 0 skipped vs 0 baseline, 10.3 min. C1 as amended (integration_health + correlation id + liveness verdicts) AND C2 (member drivers, refusal proven visible end-to-end) in one commit. Two self-caught defects fixed pre-ship: the tier stamp would have emptied forum categories via the config-vs-default fallback (now listings-only + seeds defaults underneath, regression-covered); a NUL byte in a map key made `integrations.ts` read as binary to ripgrep (every future grep would have silently skipped the file). Byte-identical federation proof done properly: same scratch schema, pre-edit dist vs new build, 45-byte delta fully accounted as `{id,lifecycle}`. Contract-gap list adopted as `docs/integration-program/CONTRACT_ENFORCEMENT_GAPS_2026-08-14.md`. Migration 0079 inherits collation (matches 28dace2's convention, reasoned from the commit itself). CI on d14b160 + live probe running; result appended when read.
- 2026-08-14 21:49 EDT · **Lane A is DONE, observed live.** Both CI runs on `8e02dd0` completed success (`ci [main] 31857342849`, `ci [wt/memory-foundation] 31857348465` — two runs because the same commit was pushed to both refs). Live probe: `GET https://amora.regencivics.earth/health` → `{"status":"ok","build":"2026-07-28-wave1-8e02dd0"}` — the deploy auto-triggered and the build marker carries the landed SHA; a healthy boot with the fail-loud migration runner proves 0078 applied in production. §0 deployed-marker cell for game-amora is now MEASURED: `8e02dd0` live at 21:49 EDT.
- 2026-08-14 ~22:20 · **Lane A LANDED on main `8e02dd0`** (branch `c4e8260` rebased over docs-only `8f46c00`; branch ref force-updated to match). Coordinator verification before merge: change surface 14 files / +1354 −57, all inside Lane A ownership; drift 28dace2..8f46c00 confirmed docs-only. Lane evidence: 11 gates green cold (brand 63/63, main JS 502/700 KB, dist 5603/6000 KB), 1010 passed / 0 skipped / 0 failed vs pre-edit baseline 0 skipped, Duration 9.8 min on local :3307 MySQL. Spec correction proven both ways: the organize route failed LOUD (JSON 500 via patched async forwarding), not silent-hang; dead since 0028 either way, now fixed (500-before/working-after over HTTP against the built server). Five negotiation numbers measured on scratch schema (no prod DB or key on this box): tool-answer $0.0105 vs plain $0.0050 (+112%), 6/10 questions used a tool, budget 50 = 50 upstream calls ≈ 31 questions/day. NOT proven: browser screenshot of the citation line (e2e proves the payload; SPA boot needed a key — right call), live-village numbers (need Rye's key = money decision). CI run on 8e02dd0 being read; result goes here when it completes.
- 2026-08-14 ~21:40 · **CORRECTION (Lane S, self-caught): three of its credential searches were hollow negatives** (rg exit 127 read as no-matches; a find that scanned 0 files; a partial indexed Grep). The lane re-ran with a shape-based search (`[0-9a-f]{64}` over all 29 env files, pipeline proven on a known-present pattern first). **Conclusion unchanged** — no Saberra credential anywhere reachable-at-call-time; one narrow residual gap (a secret pasted deep in a worktree outside env files) now stated in the artifact instead of papered over. Stage-0 artifact re-adopted; paid lesson added to §9.

---

## §8 Coordinator rulings

- **R1** (2026-08-14): Home is `Downloads/regen-integration` on `wt/integration` via the hub's own
  `scripts/new-worktree.sh`, superseding the charter's raw-git `regen-integrator` /
  `wt/integration-program` command. Reason: Addendum 1 §1; the script fetches, branches from
  origin/main, copies `.env`, installs.
- **R2** (2026-08-14): Program docs **copied**, not moved, from the Desktop. Reason: all three lane
  briefs reference Desktop paths; moving would break them mid-flight. Desktop originals retire to a
  pointer README only after all three lanes land.
- **R3** (2026-08-14): The contract splits per Addendum 1: the vendor-facing
  `MODULE_LIBRARY_CONTRACT.md` lives in the HUB (`docs/integration-program/`); game-amora receives
  the module-framework spec work (ARCHITECTURE checklist, module-framework.md corrections,
  provenance marker, FORK_RUNBOOK lines) and NOT the vendor contract. Lane C's brief task 9 is
  amended accordingly at dispatch.
- **R4** (2026-08-14): Sanctioned coordinator writes: `INTEGRATION_LEDGER.md`,
  `HANDOFF_NEXT_COORDINATOR.md`, the dated decision list (§10), `docs/integration-program/` adoption
  + INDEX, and ADR-49 + DOMAIN-LANGUAGE entries (explicitly instructed by Addendum 1 §2). Every
  other write goes through a lane; violations log in §9.
- **R5** (2026-08-14): Lane base is `28dace2`, which is 6 commits past the docs' verification SHA
  `1428603`. Only `server/index.ts` (+279 lines) and `drizzle/0076` moved among lane-critical
  files. Every lane's step 0 includes re-locating its `server/index.ts` anchors **by content**;
  line numbers from the specs are hints, not addresses.
- **R6** (2026-08-14): Lane C phase C1 is amended per Addendum 2 fixes 1/2/5: it now also carries
  the `integration_health` record per (module, operation) written by the driver wrapper, the
  correlation-id header on every outbound driver call, and the liveness-window registry field. The
  `integration_calls` incident log and the scheduled probe stay OUT of C1 (queue item 5). The
  diagnostic layer never asserts credential health from `secretStatus.setAt`.
- **R7** (2026-08-14): Rye's six decisions from Addendum 2 §A recorded as settled: (1) crm splits
  into `people` (platform, no vendor driver in v1) and `leads` (vendor-drivable); (2) support
  routing is a mechanism — support URL + email are required registry fields at every tier; (3)
  routing keys on who SUPPORTS: Included/Managed → ReGen Civics, Connected → vendor; (4) Maia
  performs the diagnosis, deterministic-first, she renders rather than decides; (5) triage remains
  ReGen Civics' obligation in all three tiers; (6) Managed cap is two slots, the second explicitly
  a transition slot, ratcheting on evidence (clean quarter, measured tickets, someone other than
  Rye answering).
- **R8** (2026-08-14): Full-suite mutex: all `.env`s share one MySQL host. During development lanes
  run scoped test files; the full cold gate sequence runs at the lane's landing turn, in queue
  order, one lane at a time. First "Hook timed out" on a full run = load; re-run that file alone
  once before debugging as code.
- **R9** (2026-08-14): Migration allocation A=0078, C=0079, S=0080 confirmed by 4-way scan (remote
  refs via `git log --all`, primary disk, all-30-worktree disk including scratchpads) at 28dace2.
  Never renumber: the ledger keys on filename and a rename replays the file.
- **R18** (2026-08-15): **Rye ruled the store's ten decisions** (his words in brackets):
  1 rev-share 0% [yes; the $ReGen distribution is the primary incentive; paid modules may add
  direct payment]; 2 CORE processes no third-party payments [yes]; 3 no listing fee [none];
  4 review SLA [asked "can we automate?" → yes, partly: automated first response within
  minutes naming the blocking stage (validator + gates + a Claude review pass on the PR);
  human judgement stages within ten working days]; 5 who may be a vendor [**"Anyone can be a
  vendor - no legal entity required"** — implemented as: BUILDERS of free modules need a name +
  contact only; ONE CARVE-OUT the coordinator holds unless overruled: a listing that is paid or
  `member-pii` still needs a signable counterparty because a DPA cannot be signed by nobody —
  law, not policy; contract clause 1 becomes tiered in v1.1]; 6 price shown to members too
  [yes — in-app only; federated documents still carry nothing]; 7 withdrawal owes 90 days +
  data return + withdrawn-forever [asked "automatically?" → notice, banner, countdown and
  day-90 block are automatable now from `withdrawn.since`; the data return needs a
  village-level driver export — design item; contract keeps the promise, code follows];
  8 change of control reviewable + announced [yes]; 9 published numeric quality bar [yes;
  needs the probe, queue 5]; 10 reserved takeover power narrow and named [yes — coordinator
  names three triggers for the contract: confirmed malicious code; unpatched critical
  vulnerability past its SLA; builder unreachable 90 days with a live security issue].
- **R19** (2026-08-15): **Rye ruled the seven new decisions**: N1 test account [yes — Rye
  creates it; token-handling mode still to choose]; N2 PR-only intake [yes, "along with
  support from claude to do DD and testing" → a review-agent GitHub Action + DD assistant];
  N3 branch protection [yes — settings handed to Rye; coordinator switches to PR landings with
  merge commits so lane SHAs survive]; N4 security-review invariant [yes → contract clause 13];
  N5 image byte ratchet + WebP standard [yes]; N6 upload optimization ["whichever causes less
  friction for the user" → **client-side canvas → WebP before upload**: no wait on the server,
  less mobile bandwidth, no native dependency]; N7 pathway location/audience [yes].
- **R32** (2026-08-16, coordinator ruling at the 90-minute check, Rye may override): **start the lanes whose
  zones no dirty worktree touches; hold the rest.** At 12:56 EDT the other session had not landed and had
  sent no go (its five worktrees were rebased onto `3c295b8` and are still growing). Rye's instruction was to
  "see if it finished and get started" at 90 minutes; R27's reason was fewer conflicts. Reconciled: dispatch
  now **L1a (catalog art: `client/public/images/modules/**` + the image baseline only)** and **L5a (calendar
  core: `gatherings.ts`, new `calendar*.ts`, `shared/lunar*`, `wheel.ts`, `Events.tsx` + new calendar
  components, `CycleClock.tsx`, the `/api/events` block, `events-admin` tab body, `0085`)**, which the
  12:56 measurement shows no dirty worktree touching (housing's `server/index.ts` hunks are in `/api/housing`,
  map-org's are in `/api/org` and `orgChart.ts`; git merges non-overlapping hunks). HOLD L1 (Admin.tsx nav +
  App.tsx routes collide with `wt-housing`), L2 (`orgChart.ts` + `LivingMap.tsx` collide with `wt-map-org`),
  L3 (depends on L2), L7/L6 (Admin tab + `server/index.ts` new blocks: low risk, but the cross-brief review
  has not run yet), L4 (handover to that session, sent when it reports), L8 (after everything). Next check
  in 60 minutes; the held lanes dispatch when housing and map-org land, or on Rye's word to accept the
  rebase cost. Both dispatched briefs were read in full by the coordinator before dispatch; the other eight
  are drafted and await the review pass.
- **R31** (2026-08-16): **Closing phase of round 4: three persona QA passes on live, mobile first.** Rye's
  words: ["After all your lanes pass and our live, we're gonna run three comprehensive QA passes against
  the live site with three unique perspectives for how to navigate the site and what they're looking for
  so that we get a full and robust test preference for mobile as that will be our main platform that
  people are using to explore the site to ensure the highest quality look for any ways that we can improve
  improvement any design improvements, any routing improvements anyways that people can navigate the site
  in a more effective way anything that can make it easier for them making sure we're taking care of all
  bugs and overlapping buttons and design things that just aren't of the highest standard we're releasing
  a world class platform here I wanna demonstrate as being a world class and the QA passes are to identify
  ways to make that possible"]. Coordinator reading: three report-only QA lanes (the round-2 L/V shape,
  `LANE_L_AND_V_LIVE_QA_BRIEFS.md`), each a distinct persona with its own goals and navigation habits
  (e.g. a first-time visitor on a phone deciding whether to visit; a new member finding their seat, the
  calendar and the map; a founder administering modules on a phone), against live after every round-4
  lane is DONE; verdicts as harm metrics plus ranked improvement lists (design, routing, navigation,
  overlapping controls, polish); coordinator triages into fix lanes with disjoint zones. Mobile is the
  primary viewport set (WebKit iPhone 14 DPR3 390×844 / 390×664 / 375×812, +360), desktop secondary.
- **R30** (2026-08-16): **Go signal and defaults.** Rye's words: ["Excellent! The other session will let
  you know when to start building! If the other session doesn't check back in 90 minutes to see if it
  finished and get started"]. Consequence: dispatch starts on a message from the other session, or at the
  90-minute check (one-shot scheduled 12:56 EDT) if PR #16 has merged and the five dirty worktrees are
  landed or clean; never over dirty worktrees (R27). N1–N8 of proposal §10.6 stand at their defaults
  under R28's "yes if not mentioned" (N8: the coordinator may message the other session through the
  session bridge with the landing list). Briefs are drafted now so dispatch is immediate.
- **R29** (2026-08-16): **Rye ruled the ask-2/4/5 conversation** (proposal §9), his words in brackets.
  Ask 2 reframed: [this module is going to be an improvement on map/circles (which right now is very
  poorly done - research some better sociocracy maps and see the interaction of those maps and how they
  work - like simple things like zooming in on a circle when clicked to more complex things like the
  open/partial/filled roles along with graphics and details and so many ways we can make this map more
  useful)]. New item: [We also need an agent to go through and fix/test the Now | Vision buttons on the
  map as right now the "now" shows buildings being built and planned already so the vision button seems
  redundant and not useful unless we improve how it's working (let's talk this out too)].
  P1 [Yes we can have an optional Now and Vision for the governance and power too (to represent the very
  common reality where now power may be concentrated but the vision is more democratic and the "vision"
  should have the clear objectives/metrics that need to be met before it triggers so that it doesn't
  just stay a forever future vision)]. P2 [Yes circles and domains and the overall (3 layers of different
  decision making possible and having a lens for that too)]. P3 [Yes]. P4 [It ships pre-filled with all
  variables in Admin to be renamed/set by the founder]. P5 [Yes]. P6 [Yes]. P7 [Yes - always a deep link
  to Hypha if that is the decider]. P8 [Use Swiss Francs as the universal default currency and have a
  admin toggle to choose whatever currency they want - always default to the country the map is located
  in (so for Amora it will be set to CRC for Costa Rica). But have a site-wide toggle for a user to choose
  which currency they want to see]. P9 not mentioned → default list stands. P10 [Admins plus whomever is
  elected to represent a circle/domain etc].
  Ask 4: [Love all the lessons our app should ship with the ability in everyone's profile to connect
  their own LLM agent to serve them and support them - we provide the harness and the foundations for
  each member to connect their own agent!] → bring-your-own-agent is a first-class profile feature
  (harness + foundations), not an afterthought; A1–A7 defaults stand.
  Ask 5: [Make sure we have only 1 calendar and source of truth per village where all dates live] → one
  calendar per village; every dated thing appears there through providers; external calendars feed INTO
  it, never beside it; C1–C4 defaults stand.
- **R28** (2026-08-16): **Rye ruled the round-4 list** (`ROUND4_PROPOSAL_2026-08-16.md` §7 + §8 amended
  items 1–26), his words: ["Final list to rule on - yes if not mentioned"], with three amendments in his
  words: item 8 ["also have an 'other' section"] (shape and decides-by each gain an Other entry with a
  required one-line description shown in the legend); item 13 ["radiation (if a sprite is having all 9
  forms radiating it should show one icon of each at the same time radiating out - if it's just 1 it can
  have a few of those one type radiating out so that every sprite has a radiation ring if it's producing
  one)"] (supersedes the coordinator's one-icon-at-a-time cycling: every producing building always shows a
  ring; N distinct capitals → one icon of each at once; one capital → several of that icon; caps and LOD
  keep the frame budget); ask 5 ["make sure all the events, quests (that are date specific), and more is
  found in the calendar - then have an events section in admin where a founder can attached a google
  calendar (etc) to populate the calendar"] (the calendar aggregates every dated thing in the village
  through per-module providers, and Admin gains an Events section that subscribes external calendars).
  Asks 2 and 4 stay open for design conversation before briefs are written.
- **R27** (2026-08-16): **Round 4 does not dispatch until the other coordinator session lands.** Rye's
  words: ["We'll wait for the other coordinator session to finish before starting this one so there
  should be less worktrees and conflicts with the codebase - so we'll continue planning right now"].
  Consequence: no lane is cut while `wt-doors`, `wt-housing`, `wt-map-*`, `wt-maia` are dirty; the
  coordinator re-measures worktrees and main before the first dispatch; planning continues meanwhile.
- **R26** (2026-08-15): **The mobile harm class is "partially visible and dead"** — a control whose top edge shows above the fixed bar while its centre is under it (the original login shape). A control WHOLLY under the bar at first paint is below the effective fold: not visible, reachable by scroll (V2 measured 0 unreachable), not the login harm. V2's two residuals are that second kind and are routed as cheap UX layout moves, not as harm. The closing verdict for round 2's mobile fixes is therefore PASS on both harm metrics as defined, with the `/quests` 375 CTA and store 360 regression as follow-ups.
- **R25** (2026-08-15): K2's decision RATIFIED — the batch synthesis path ships **off by default** (`assistant.synthesis_batch=false`, founder ring). There was no scheduled synthesis to move; adding one that runs itself would break the automation module's promise that nothing applies itself. The road exists; a village turns it on. Also ratified: the poll job's budget gate is check-only (a timer must never charge the interactive day budget by merely ticking).
- **R24** (2026-08-15): **Assistant cost programme** (Rye: "can we bring that cost down more by
  creating deterministic protocols that give answers and only using a model (and the cheapest
  ones for things that need querying)" → "dispatch lanes to do all that"). Coordinator design,
  grounded in the claude-api reference (cached 2026-06-24) and Lane R's live numbers: (1)
  deterministic answers at zero tokens for structured lookups via a keyword router that selects
  only from `readerCatalog(viewer)` so refusals stay in `callReader` (never a second permission
  system); (2) prefetch the router's readers and answer in ONE POST (halves upstream calls —
  the "server-side pre-step" Saberra's doc 07 already proposed); (3) prompt caching ONLY if the
  natural stable prefix clears Haiku 4.5's **4,096-token** cache minimum — measured with the
  free count-tokens endpoint first, never padded to cross it; (4) the model lever is spent —
  Haiku 4.5 ($1/$5) is the cheapest current model (Haiku 3 retires 2026-04-19; 3.5 retired);
  (5) Batch API at 50% for the non-interactive synthesis path only, admin on-demand synthesis
  stays synchronous. Every path writes a usage row with `path` (deterministic/prefetch/loop/
  batch) so the mix is measurable — a computed-but-never-written metric is the classic tell.
  Migrations: K1 = 0081, K2 = 0082 (0080 reserved for Saberra), both after the four-way scan.
  Expected (to be measured): $0.0081 → ~$0.004–0.005 per tool answer with prefetch; blended
  ~$0.002–0.003 with a deterministic layer catching half; organize's 50 = ~50 questions again.
- **R23** (2026-08-15): **Rye's four follow-up rulings**, his words in brackets. (1) ["I don't
  want to create the test admin account, I want you to."] → Lane R creates `integration-qa`
  through the platform's own registration path with a discarded random password; lanes
  authenticate with short-lived JWTs signed at call time from `AUTH_TOKEN_SECRET` read via the
  Railway CLI — no password or secret is ever printed, persisted, or pasted; the account is the
  standing test identity for L/V. (2) ["a human can be the signing counterparty, no need for a
  business"] → the coordinator's carve-out stands with that amendment: paid/member-pii listings
  need a NAMED HUMAN who signs personally; no legal entity required at any tier (R18 item 5
  amended; contract v1.1 clause 1 tiers builder vs signing-human). (3) ["for lane P in order for
  builders to get paid $ReGen they need a regen civics account and a Hypha account with their
  base address linked (the same thing we encourage in profile setup in ReGen civics)"] →
  supersedes R20(e): payout identity is the builder's ReGen Civics account with its linked
  Hypha/Base address, resolved by the hub at statement time; no raw address in the registry.
  (4) ["While we're building before we go fully public I want you to be able to accept PRs"] →
  branch protection on Amora-Game `main` set BY THE COORDINATOR via the GitHub API at Rye's
  instruction: require PR, 0 approvals, required check `verify` (pre-existing), code-owner
  review OFF, admin bypass kept (`enforce_admins:false`) so nothing can lock the program out.
  Verified by reading the rule back. Decision item 13 closes; item 12 (test account) moves to
  Lane R.
- **R21** (2026-08-15): **Landing mechanics after N3.** The three in-flight fix lanes
  (F3, F1, F4) land by fast-forward as briefed — the exact tested SHA reaches main, which is
  the stronger evidence. Round-3 lanes (I, D, P) and everything after land by PR with a MERGE
  commit (`gh pr merge --merge`) so lane SHAs survive and CI is a required check rather than a
  post-push read; branch protection itself is Rye's console setting (settings handed to him:
  require PR, require CI status checks, 0 required approvals for now, code-owner review OFF
  until a second maintainer exists — else the account that opens PRs cannot approve them and
  every landing blocks on Rye; admins may bypass).
- **R22** (2026-08-15): Rye confirmed (his words) "$ReGen exists as the main 'Game' token of
  regencivics.earth and the distributor of the custom games" — the builders' pool is a native
  use of the hub's own token; Lane P told to reuse the hub's existing $ReGen distribution
  mechanics, cycle and human-execution conventions rather than invent parallel ones.
- **R20** (2026-08-15): **The $ReGen builders' pool** (Rye's design, his words: "ReGen Civics
  pays $ReGen monthly (every lunar cycle) to the most used modules ... similar to the gratitude
  module ... this is the default and only goes away if the builder chooses to have their module
  paid ... we hope this would encourage all builders to just use the $ReGen distribution").
  Coordinator's defaults for the design lane, each overrulable: (a) payer = ReGen Civics/CORE
  from treasury, on-chain $ReGen on Base — the hub's existing invariant "read-only Base
  queries, no wallet, no signing" HOLDS: the hub COMPUTES a signed distribution statement +
  public page each lunar cycle; a human/treasury EXECUTES the transfer (value moves by a human
  act, as everywhere else); (b) eligible = third-party (`builtBy` ≠ platform), FREE (no
  `pricing`), merged and not withdrawn, at lifecycle ≥ members in a village; paid modules are
  excluded by construction (pricing ⇒ opted out), platform-built and core modules excluded
  (else the pool pays CORE itself); (c) usage metric v1 = number of KNOWN villages running it
  (the hub's roster of real communities × the module ids those villages already publish at
  members+ in `/api/platform/info` — consented, read-only, no new telemetry, gaming-resistant
  because fake forks are not on the roster); v2 activity-weighted via an opt-in relay summary
  (counts, never people); (d) share = plain proportional to usage share of a hub setting
  `pool.regen_per_cycle`, with a dust floor; (e) builder payout identity = optional
  `builtBy.payout {chain:"base", address}` in the registry entry; missing address accrues
  unpaid and the statement says so; (f) counsel line added to §3c: builder payouts over
  $600/yr per person are 1099-reportable — same accountant ask, one more line.
- **R17** (2026-08-15): F2's deviation RATIFIED — the map escape control always lands on `/`
  rather than "the previous in-app location" as briefed, because the shell's `exitApp` +
  `popstate` contract already replaces the map's history marker with `/`, all three exit
  triggers share it, and wouter keeps no route stack (a global tracker would be outside the
  lane's zone). Consistency across the three triggers beats the literal brief. Recorded as
  a candidate follow-up only if members report wanting to return to where they were.
- **R16** (2026-08-15): **The lane that changes a contract closes its consequence.** Lane F4
  unified 319 401-bodies to `{error:"auth_required", message:"<sentence>"}` and correctly
  flagged that ~57 client sites render `d.error` verbatim — landing F4 alone would show members
  the string `auth_required`. Ruling: F4 is HELD, not landed; F4 sweeps `d.message ?? d.error`
  in the 16 client files no other lane owns; F1 and F3 get the same one-line instruction for
  their 5 files (Admin, Feed, Feedback, SetPassword, WorkWithUs); land order becomes
  **F2 → F3 → F1 → F4** so F4 rebases over the shared-file edits. Also ratified from F4: HSTS
  deliberately NOT set (Railway hostname inventory unverifiable from here — a wrong max-age is
  irreversible; test asserts it stays unset); L6 body kept as `Not found` for opacity with the
  reasoning now in a comment; soft-404 deferred (route table lives in App.tsx; a server copy
  drifts in the dangerous direction).
- **R15** (2026-08-15): Lane Q's judgement call RATIFIED: the provenance citation is a genuine
  SUFFIX (title then author), matching `provenanceSuffix`'s own docstring over the ordering
  implied by `moduleDocProvenance.ts`'s header comment; the header's example was the error.
  Also ratified: leaving the PLATFORM_CARDS Maia string untouched (it sits in Lane M's zone) —
  correct boundary discipline; the fix is routed to M with the newly found index.ts:8485 twin.
- **R14** (2026-08-15): **Rye added a mobile-first QA lane** (his words: "ensuring we have
  another QA lane that's mobile first - as most of our audience will be mobile on safari").
  Lane V is a first-class lane beside Lane L, not a viewport pass inside it. Engine ruling:
  Playwright WebKit at iPhone device profiles — the Safari engine, the closest true-to-audience
  runtime on this machine; what WebKit cannot reproduce (real iOS chrome, dynamic URL bar,
  software keyboard) is counted in the could-not-measure list, never silently skipped. Both
  briefs staged at `docs/integration-program/LANE_L_AND_V_LIVE_QA_BRIEFS.md` with a production
  write discipline: read/render QA only against live; write-path QA against a local build of
  the same SHA.
- **R13** (2026-08-15): **Rye opened round 2 with a developer-monetization mandate** (his words:
  study app-store best practices, improve the module store, "developers should be able to charge
  a price for other forks to use their modules", "fully functional and beautiful", then fix all
  QA faults, then a full live test, then route the Saberra letter through the Saberra-Amora
  session). This EXTENDS the vendor concept to module developers; it does not reopen the
  single-biller decision — Connected-tier economics (developer bills the fork directly) is the
  v1 rail, platform-billed is design-only pending counsel (UBIT, §3c). Coordinator sequencing
  ruling: Lane Q (small fixes) lands BEFORE Lane M (store) despite Rye's listing order — the
  "then"s sequence his asks, the landing queue is the coordinator's, and landing small verified
  work first shrinks nothing but risk. Lane L (live test) dispatches only after M+Q are observed
  live. Letter handoff executed immediately (independent, was already priority 1).
- **R12** (2026-08-14): Lane C's four flagged decisions RATIFIED at landing: (a) `error` carries
  the human sentence, `reason` carries the machine code — six client pages render `d.error`
  verbatim and a member must never read `vendor_unavailable`; (b) `/api/modules` carries tier,
  dataClass, provides and support at module visibility — the 503 tells the same viewer the same
  vendor name a second later, a support address a member cannot see does not work, and the
  federated documents carry nothing; (c) `PLATFORM_SUPPORT_URL`/`_EMAIL` as env vars, not a
  hardcoded operator name — white-label discipline; (d) `requireVendor` deliberately has no
  try/catch — a 500 about a boot bug is more honest than a 503 blaming a vendor. Also noted and
  accepted: `provides`/`dataClass` rendered nowhere yet (data-now by instruction).
- **R10** (2026-08-14): **Rye approved ADR-49** (his words in-session: "approve ADR-49"). The
  Managed credential plane — platform-owned, env-only, never in `SECRET_KEYS`, never returned,
  in-product disclosure per listing, cap two with a transition slot, data-return on exit — is now
  settled policy. Do not reopen without new evidence.
- **R11** (2026-08-14): **Rye ruled the contract is published on a URL** (his words: "contracts
  are published on a url"), converting the negotiating position into a standard. Sequencing
  constraint preserved as queue item 10: publication waits for C1 + the incident log, because
  clauses 9–12 promise machinery that does not exist yet; and the published page is
  version-stamped, since listings are accepted against a contract version.

---

## §9 Paid lessons (seeded; append the day they happen)

- A worktree's name says nothing about its ref (`wt-integrate` ≠ integration home; `gov-overflow`
  sits detached at 1428603).
- A registry entry written from a handoff is a guess until confirmed from disk.
- A migration number has a FOURTH holding place: another session's scratchpad worktree.
  `git worktree list` enumerates them; scan them all.
- A green suite is a sample: read the skip count and the Duration, never the badge.
- The docs' verification SHA is not the dispatch SHA. Six commits landed between 1428603 and
  28dace2 while the program was being written; +279 lines in `server/index.ts` made every line
  anchor stale. Re-measure at dispatch, always.
- A background agent dies with the machine's sleep; a committed ledger and an on-disk worktree
  survive. Write state before starting anything long.
- **Grep the whole monorepo for callers, not `client/`** (HS PR 2): the hub's claims contributor pages are Next.js routes under `apps/gov/` reading through `fetchFromMainSite`; a `client/` grep alone would have projected them blind. Before withholding a field, enumerate callers across every app that reaches the procedure.
- **A probe that fails open reports success** (F1 resume, self-caught): reading `--tabbar-h` off the root gives the UNRESOLVED string `calc(4rem + 1px + env(...))`; `parseFloat` → NaN → `NaN || 0` → a zero-height band → every control "clear", including the one the lane was sent to fix. Measure the rendered element, and make a probe's failure loud (a NaN band is a bug, not a pass). Also: WebKit-on-Windows reads safe-area insets as 0, so any measured band is the OPTIMISTIC edge — clearances must hold with room.
- **Measure with the modules ON** (F3, 2026-08-15, self-caught on its own closing proof): the store's 360px overflow is data-gated — the lifecycle hint that carries the long token renders only for a non-core module that is not off; a scratch seed with everything off cannot show it, so F3's "0 overflow" at its HEAD was true of the wrong state. Same lesson as `page.route`, one layer up: prove the control APPLIED (the hint line is on screen) before believing a zero; give scratch schemas live's lifecycle shape. Also: any listing field can be one long token — harden the shared column, not the one paragraph.
- **`elementFromPoint` ownership must be strict** (V2 harness, self-caught): `hit.contains(el)` accepts an ancestor, so `<body>` "owns" every probe and every hit area measures the whole viewport. Use `hit === el || el.contains(hit)`.
- **`scrollIntoView` is async under `scroll-behavior: smooth`** (V2, self-caught): a rect read right after is stale and every probe point clips — 36/46 landing controls were falsely flagged unreachable (true: 0). Force `scroll-behavior:auto` in the harness; never flag a control that got zero probe points. Also `locator.click()` times out on `/map` (animating canvas defeats actionability) — use raw `mouse.click`.
- **A timer must not charge a click's budget** (K2, self-caught): `assistantDailyCapReached` calls `overLimit`, which INSERTS a `rate_hits` row — right for a request, wrong for a poll running 288×/day against a 600 cap; the job would have eaten half the village's assistant budget by ticking. Gate on a read; charge per submitted request.
- **The scratchpad is not lane-isolated** (K2): a generic `baseline.txt` there belonged to another lane and was nearly clobbered — every lane writes under its own subdirectory.
- **A contribution check greps ADDED lines, not changed files** (validate-module.mjs, caught on P's PR #5 after the classifier fix exposed it): the six security greps ran over every file the diff touched, so P's 335 clean added lines in `server/index.ts` were blamed for 41 pre-existing raw queries elsewhere in the same 18k-line file — every server PR would block at stage 6. Scope tracked-file greps to `git diff -U0` `^+` lines; whole-file only for NEW files; surface pre-existing debt as informational. Same shape as F1's lesson: measure what THIS change did, not what the file contains.
- **A hub `.env` may point at production, and a BOM can hide it from a key-grep** (Lane P): the hub worktree's `.env` carried `DATABASE_URL` → the production proxy behind a UTF-8 BOM; a `^[A-Za-z_]` grep missed it. Vitest does not load `.env`, which is the only reason the DB suites skipped instead of running against production. Strip the BOM in the grep, and never let a hub lane run DB suites without first checking which host `DATABASE_URL` names.
- **`$?` after a pipe is the pipe's last command** (Lane P, 2026-08-15, self-caught; the same trap as `tsc | head` in the failure catalogue): P's first gate script read `$?` after `cmd | tail`, reporting `tail`'s exit for every gate. Capture the exit before the pipe (`set -o pipefail` or `${PIPESTATUS[0]}`), and treat any gate table produced by a script that pipes as suspect until that is shown.
- **A narrowed question is not a lookup** (K1, 2026-08-15): "what did we decide" and "what did
  we decide about quiet hours" scored identically in the router; a template listing every
  decision would have answered the second confidently, for free, and wrongly — and it was live
  in two e2e fixtures. Deterministic answers must detect scope narrowing and hand narrowed
  questions to the model with the data prefetched. Corollary: an empty shelf honestly answers
  "what did we decide about X" (nothing recorded) but must NOT answer an advisory question
  ("how should we structure our circles") — that is not a record lookup at all.
- **The gate set grows under you — enumerate `ci.yml`, never trust the brief's count** (F4,
  2026-08-15, applied correctly): its brief said eleven; Lane D's merge had just added a twelfth
  (doc-link guard). F4 listed every `run:` step in the file it was about to be judged by and ran
  the new one. The ledger's §5 now says so in its own header, and Lane I's image ratchet will
  make it thirteen.
- **The seed fix and the volume copy are both needed** (F4, clarifying the record): Lane I's
  copy fixes LIVE (rows already carry the paths); the seed at `imageUrl: null` is what keeps a
  FRESH fork from inheriting 14 dead paths (its volume is empty). Different halves of one
  finding; neither replaces the other.
- **A gate must classify on markers, never on prose — and it must live where it can be tested**
  (Lane D's intake workflow, caught at merge of PR #6, fixed in #7): the blocking-stage
  classifier grepped the bare string `clause 14`; an informational validator line contained it,
  and the workflow failed its own PR. D's deeper diagnosis: the classifier lived in YAML, so it
  only ran when a PR ran it — it shipped a proof that violations block and NO proof that a clean
  tree passes, and the same author wrote both the gate and its measurement. Rule: decide on
  structured output; extract gate logic to a script with a test whose FIRST case is the clean
  path; prove both directions.
- **Release only the lock you acquired** (Lane F4, self-caught): a mutex helper that runs
  `rmdir .test-lock` unconditionally after a timed-out poll tries to delete another lane's
  lock; F4's survived only because K2 writes a marker file inside the directory. Track
  acquisition; release only then; write your own marker.
- **`!img.alt` is not "missing alt"** (Lane V's detector, caught by F1): a truthiness test
  cannot tell "attribute absent" from "attribute present and empty", and `alt=""` is the
  REQUIRED markup for a decorative image — the check inverts the standard it enforces. Test
  `hasAttribute('alt')`. Two detectors disagreed (L: 0 missing; V: 6); the DOM settled it.
- **A brief's root-cause hypothesis is a hypothesis** (F1, 2026-08-15): the coordinator's
  brief said "the spacer is missing or bypassed"; F1 measured that it applies on every route
  and could never fix first paint, found the real cause (a fixed bar owning viewport pixels at
  every offset), and proved the literal target (19→0) unreachable without recreating the
  original defect. Write the target as the HARM metric (named CTAs own their centre at first
  paint; zero controls unreachable), not as a count that a sampled sweep happens to produce.
- **A control that cannot fail loudly is not a control** (Lane F3, 2026-08-15): under
  Playwright WebKit, `page.route` interception fired zero handlers while the request still
  went out, so the "control payload" run reported a clean result it had never applied;
  Chromium was unaffected, which made it plausible. Fix: patch the page's own `fetch` and hard-
  assert the control reached the DOM (`control landed: true`). Any injected control needs a
  positive assertion that it was injected.
- **`||` and `??` are not interchangeable in a sweep** (Lane F3): the `d.error || "..."` sites
  used a falsy fallback; a mechanical `d.message ?? d.error` returns `""` for an empty-string
  body — a blank toast where the call site's own words used to be. Read the operator you are
  replacing, not just the field.
- **A contract change's sweep covers every READER of the field, not the reported sites**
  (Lane F4, 2026-08-15): the coordinator routed the 57 `d.error` renderers; F4 also swept
  every client read of `.message` on a response body and found `OnchainCard.tsx` using
  `!ch.message` as a proxy for "challenge failed" — after 401s gained a `message`, a
  signed-out member's wallet would have been asked to sign the string "Sign in first". The
  reported list is a floor. When you change what a field means, grep for every consumer of
  every field you touched, including the ones you added.
- **A simultaneous stall across every lane is infrastructure, and the worktrees survive it**
  (coordinator, 2026-08-15): all four fix lanes hit "no progress for 600s" within the same
  minute — machine sleep / connection loss, not four code failures. Recovery that worked:
  inspect every worktree BEFORE resuming anything (HEAD, ahead-of-main, remote ref, dirty
  files); every lane had real uncommitted work in its zone and nothing pushed; resume each
  from its own transcript with "commit your work first with `git add -p`, then continue."
  Never re-dispatch fresh over a worktree with dirty files — that is how work gets done twice
  or reverted. Also brief every long lane to COMMIT (not push) at each milestone so a drop
  costs minutes, not the lane.
- **`networkidle` never fires on this app** (Lane V, 2026-08-15): `/api/game/pulse` and the
  notification poller keep the connection busy, so any Playwright navigation awaiting
  `networkidle` burns its full timeout on every route (Lane L saw the same on `/map`). Use
  `domcontentloaded` + a fixed settle (~3.5s), write results incrementally per viewport so a
  stall can never cost a whole run, and never read a missing results file as a clean pass.
  Put this in every future live-QA brief.
- **Verify the recipient before messaging a lane** (coordinator, 2026-08-15, self-caught via
  Lane Q's report): two mid-flight guidance messages (mobile-first design input; the research
  relay) were sent to Lane Q's handle believing it was Lane M — two same-block dispatches
  return handles in call order and I read them swapped. Cost: Lane M worked without its
  design input for one phase; Lane Q correctly ignored both and reported the misroute. Rule:
  before any SendMessage to a lane, confirm the handle against the dispatch result's task
  description, not against memory. (Both messages re-sent to the true Lane M in full.)
- **A search's silence is not a negative** (Lane S, 2026-08-14, self-caught): `rg` missing from
  PATH died at exit 127 and its empty output read as "no matches"; a `find` that scanned zero
  files returned exit 0; an indexed Grep returned 1 file when a bounded search proved at least 7
  contain the string. Rule: before trusting any negative, prove the same pipeline returns matches
  on a known-present pattern, and prefer shape-based searches (the credential's format) over
  name-based ones (the variable you guessed).
- **Relay research verbatim with its source, never compressed into a claim** (coordinator,
  2026-08-15): my relay to Lane M merged Atlassian's knowledge-base policy figure (90 days) and
  a contract clause (45-day takedown) into one sentence; M correctly refused to transcribe it.
  A lane refusing a coordinator relay is a control working; ratify the refusal.
- **Hazards are per-repo** (coordinator, 2026-08-15): I briefed Lane P (hub) with the
  game-amora memory "CI has two gates CLAUDE.md omits" (bundle budget + audit); the hub has no
  bundle budget and its audit is advisory. Any remembered fact about "the CI" names which CI.
- **The gate count in a brief is stale the moment a lane merges** (coordinator, 2026-08-15):
  F4's brief said eleven while D's merge had made it twelve; F4 caught it by enumerating
  `ci.yml`. §5's header now says enumerate; briefs say "this list may have grown".
- **Two coordinators now share `wt/integration`** (2026-08-16): a round-4 session committed
  five times to this branch while the round-3 session was still open. Rule for both: pull
  before every write, edit the ledger and handoff by hunk (never wholesale `Write` from an
  in-memory copy), stage by path, and leave the other session's files alone. The
  swarm-supervisor skill (v1.1.0, 2026-08-16) and `PROMPT_NEXT_COORDINATOR.md` carry every
  lesson in this section in generic form.

---

## §10 Decision list for Rye — regenerated 2026-08-14

See the session brief (delivered in-conversation) for the same list with full context. Sorted by
what only Rye can do; every item has a default so nothing blocks.

| # | Item | Owner | Priority | Default | Done when |
|---|---|---|---|---|---|
| ~~1~~ | ~~Rule on ADR-49~~ **DONE 2026-08-14: approved.** | — | — | — | status flipped Accepted in DECISIONS.md |
| 2 | Send counsel the **§3c questions** (entity standing, DPA posture, agency-vs-resale, **UBIT**) | Rye | 2 | Ask accountant/counsel this week; Q4 blocks only the first invoice | written answers land in §3c |
| 3 | **Send the stage-1 letter to Saberra** — it is ready at `docs/integration-program/lane-s/STAGE1_DILIGENCE_REQUEST_LETTER.md` and carries BOTH asks: the tenant credential (`SERA_API_SECRET`, read-scoped, for the stage-0 audit their own doc 07:19 acknowledged owing) and the commercial numbers | Rye sends | **1** | send as-is; every stage-0 number and the go/no-go waits on it | credential in hand + numbers recorded in §3a |
| 4 | Read the stage-5 gate table finding: **Saberra does not clear Managed on today's evidence** (7/12 rows empty; their cap "never blocks"; no hard-delete endpoint). No decision needed yet — stage 5 exists to negotiate exactly these terms — but the tier expectation should not harden until the table fills | Rye (awareness) | 2 | hold Managed as the *sought* tier; the letter asks for what would clear it | stage-5 table fills after their reply |
| ~~5~~ | ~~Contract publish vs private~~ **DONE 2026-08-14: publish on a URL** (R11; publication itself is queue item 10) | — | — | — | — |
| 7 | **Per-user daily token ceiling** (Lane A's question, spec decision 7): measured mean is 7,465 tokens per organize question, max 9,542 | Rye | 5 | keep measure-only now; when enforcement comes, ~150k tokens/user/day (≈20 questions) binds almost nobody while capping a runaway | number recorded; enforcement is its own later task |
| ~~12~~ | ~~Create the test admin account~~ **Rye: "I want you to" → Lane R creating it (R23)** | — | — | — | — |
| ~~13~~ | ~~Branch protection~~ **DONE by coordinator at Rye's instruction (R23): PR required, 0 approvals, `verify` check, admin bypass kept** | — | — | — | — |
| 12-old | ~~Create the test admin account~~ (you said yes) and pick how a lane authenticates: (a) authorize minting its token from the server secret via the Railway CLI — no password crosses chat, **recommended**; or (b) paste the account's JWT here. Then the $0.10 live run dispatches the same hour, and Lanes L/V get signed-in coverage on future runs | Rye | **1** | register on live, promote to admin, name it something obvious like `integration-qa`, then choose (a) | the live-run lane reports 10 questions, `assistant_usage` rows, the citation screenshot |
| 13 | **Branch protection on `main`** (Amora-Game): Settings → Branches → Add rule `main`: require a pull request before merging (required approvals **0** for now); require status checks to pass (`ci`); do NOT enable "require review from Code Owners" until a second maintainer exists; allow admins to bypass. Same for ReGenCivics.Earth if wanted | Rye (GitHub console) | 3 | set as above; the coordinator already lands round-3 work by PR (R21) | rule visible; a direct push to main is refused |
| 19 | **`hyphaBridge.buildRedirectUrl` is now initiator-or-admin only** (HS's one judgement call in PR #42): it rebuilt recipient wallet + payouts into Hypha prefill query params, so projecting `get` alone was cosmetic. If a bridge link is ever meant to be continued by someone other than its initiator, this gate is wrong and should become a projection instead — say which | Rye | 4 | keep the gate unless a real flow needs handoff | recorded |
| 18 | **NOW DUE — Rotate hub event check-in tokens.** HS PR 1 is DEPLOYED and VERIFIED LIVE (2026-08-15 19:07 EDT: `events.list` returns 21 events with `checkinToken` key ABSENT and all room URLs null for anonymous; `videoSuggestions.list`/`tools.list` carry no emails). The fix stops new reads; tokens already taken remain valid until rotated. Rotate hub event check-in tokens after Lane HS's PR 1 deploys — `events.checkinToken` has been readable by anonymous callers via `events.list`; with any email, `events.checkin` writes attendance and mints a `regen_token_ledger` credit. Also review recent `event_attendance` + ledger credits for abuse (counts only) | Rye (or a hub admin lane on his go) | **2** | rotate all tokens the day the fix is live; audit the ledger since the earliest event with a public token | tokens rotated; audit result recorded |
| 15 | **Pool amount per cycle** (P's D1): `pool.regen_per_cycle` ships at **0** — nothing pays until you set it. P proposes **5,000 $ReGen/cycle** (half of gratitude's 10,000; ≈$500 at $0.10) | Rye | 3 | start at 5,000 once the first free third-party module is listed; it is a hub setting, changeable any cycle | setting non-zero; first statement produced |
| 16 | **Escrow the pool or pay from treasury each cycle** (P's D6) | Rye | 4 | pay from treasury per statement (no escrow) until volume justifies one | recorded in ADR-50 |
| 17 | **Delete the orphan second lunar clock** in the hub (`server/lib/lunar.ts`, zero callers, epoch 6.79 h off the one gratitude uses; offset now pinned in a test) (P's D7) | Rye | 5 | delete it — two clocks with different epochs is a latent settlement bug | file removed in a small hub PR |
| 14 | **Review-agent API key** (Lane D): the `module-review-agent` workflow runs a Claude review pass on every module PR only if a repository secret `ANTHROPIC_API_KEY` exists — that is your money per PR; without it the job SKIPS with a notice and never fails a listing | Rye (GitHub → Settings → Secrets) | 3 | add a key with a spend limit when the first outside module PR is expected; until then the intake automation still runs (validator + gates + first-response comment) | the review job stops skipping |
| 10 | **HSTS**: Lane F4 verified `http://amora.regencivics.earth` 301s to https but cannot enumerate the Railway-generated hostname or any other attached domain from here; a wrong `max-age` is irreversible, so it is unset. Needs the Railway domain inventory | Rye (Railway console) | 4 | confirm every hostname is TLS-terminated, then set HSTS conditionally on `x-forwarded-proto === "https"` (avoids poisoning localhost); a lane can wire it once the list is known | header set on the deployed site |
| ~~11~~ | ~~14 quest images on LIVE~~ **DONE 2026-08-15 12:58 EDT — coordinator-verified: all 14 `/api/uploads/quest-NN-*.webp` return 200 on live (43–101 KB each, recompressed); `/health` uploads volume 0 → 14 files / 1 MB. Lane I's Part A landed ahead of its report** | — | — | — | — |
| 11-old | ~~14 quest images on LIVE~~: the seed fix (`imageUrl: null`) stops fresh forks emitting 404s, but live rows were written by a one-shot backfill (`runOnce("quest-posters-2026-08-10")`) that never repeats. The 14 files exist (1.63 MB) in `game-amora/data/uploads/` on this machine, gitignored; they cannot ship in `dist/` (would overrun the 6000 KB budget by ~1.2 MB — CI's own error text says "uploads volume instead") | Rye | 4 | **copy the 14 files into the Railway uploads volume** (keeps the posters) — else clear `image_url` on the 14 live rows (cards fall back to the designed gradient) | `/quests` on live emits zero 404s |
| 9 | **The store decision table** — 10 rows in `docs/integration-program-research/STORE_DESIGN.md` §7 (in game-amora at `da46358`). The four headline defaults: rev-share **0% in v1** (Salesforce is the honest comparison — we cannot technically enforce a share either); **CORE never processes payments pending counsel** (UBIT + 1099-NEC at the $600 threshold, not $20k); **no listing fee**; **ten working days to a first response naming the blocking stage** (Apple's ~2% appeal-reinstatement rate is the cautionary tale — the rejection message must do the work). Six more rows: vendor identity, price visibility, withdrawal terms, change of control, quality bar, reserved takeover power | Rye | 3 | accept all ten defaults; every one is reversible by a later ruling | rulings recorded in §8; none guessed into code meanwhile |
| 8 | **Live acceptance run** of the memory demo (ask "what did we decide about X" in JourneyToLaunch against the real village, screenshot the citation line): needs the production key and spends real tokens (~$0.01/question) | Rye or a lane with his go-ahead | 4 | run it after the deploy that carries `8e02dd0`; ~10 questions ≈ $0.10 | screenshot + `assistant_usage` rows from the live DB |
| 6 | The **eight diagnostic sentences** (4 outcomes × 2 tiers) | Rye approves; a lane drafts | 5 (not yet due) | lane drafts at queue item 6; Rye yes/no's | copy in repo passing check-voice |

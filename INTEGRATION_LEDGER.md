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
| A — memory foundation | game-amora | `wt-memory` / `wt/memory-foundation` | reported + landed 2026-08-14 | `server/lib/assistant.ts`, `villageReaders.ts`, `villageBrain.ts`, `knowledge.ts`, `assistantUsage.ts` (new), migration **0078**, index.ts zones (re-located anchor table in lane report), `JourneyToLaunch.tsx` citation line | **DONE** — main `8e02dd0`, both CI runs green (31857342849 main, 31857348465 branch), live `/health` reports build `2026-07-28-wave1-8e02dd0` (boot-time migration runner is fail-loud, so 0078 applied clean in production). Remaining: the live token-spend acceptance run (Rye's list item 8) | 8e02dd0 | 2026-08-14 21:49 EDT (live probe) |
| C — module library platform | game-amora | `wt-library` / `wt/module-library` | reported + landed 2026-08-14 | `shared/modules.ts`, `server/lib/modules.ts`, `secrets.ts`, `integrations.ts` + `memberDrivers.ts` + `moduleDocProvenance.ts` (new), migration **0079**, catalog + Integrations UI, `NotifyPrefsPanel.tsx` (C2 member-facing farewell), index.ts zones per its anchor table | **DONE** — main `d14b160`, both CI runs green (31858421775 main, 31857713087 branch), live `/health` reports build `d14b160` (fail-loud boot runner → migration 0079 applied in production). 11 gates, 1062/0/0 vs 0 baseline | d14b160 | 2026-08-14 22:12 EDT (live probe) |
| S — Saberra listing | game-amora (stages 0–5 are not code) | none yet (build stage will use `wt-signals` / `wt/saberra-signals`) | reported 2026-08-14 20:21 | stages 0–5 artifacts (DRAFTED, adopted at `docs/integration-program/lane-s/`); later: the driver file, registry entry `signals`, `signals.read` capability, migration **0080** | **stages 1–5 drafted; stage 0 BLOCKED on tenant credential (B5, letter ready)** | artifacts verified on disk | 2026-08-14 20:21 (final report) |
| M — module store (round 2) | game-amora | `wt-store` / `wt/module-store` | reported + landed 2026-08-15 | as dispatched; NO migration (nothing needed state beyond registry + module_settings — 0081 not claimed) | **LANDED on main `da46358`** (fast-forward; cherry = 1, 11-file surface, no forbidden files). 11 gates cold post-rebase: 1126/0/0, 6.4 min, brand 63/63, JS 502/700, dist 5615/6000. Built: catalog+detail+search, ModulePricing + priceLine + licence pill, `withdrawn` state w/ 409 naming successor + no orphans, member-pii⇒member-driver launch requirement, BUILDING_A_MODULE.md, validate-module.mjs (calls the same `moduleListingProblems` boot uses). Both Maia strings in its zone fixed. Mobile-first classes verified compiled but **layout never browser-rendered — L/V audit it**. **DONE**: both CI runs green (31866020352 main, 31865926530 branch); live build marker had already advanced to `5f3cf0b` (another session's commit landed on top, CI green on it too, `da46358` is its ancestor — verified) | da46358 (live in 5f3cf0b) | 2026-08-15 01:12 EDT (live probe) |
| Q — QA-fault fixes (round 2) | game-amora | `wt-qa-fixes` / `wt/qa-fixes` | reported + landed 2026-08-15 | eight defects; 7 VERIFIED + defect 6 at 4-of-5 (the fifth string moved into Lane M's zone in Lane C's landing — routed to M along with a newly found sixth at index.ts:8485) | **DONE** — main `18a7e61`, both CI runs green (31864908785 main, 31864840812 branch), live `/health` reports build `18a7e61`. 11 gates, 1096/0/0 | 18a7e61 | 2026-08-15 00:41 EDT (live probe) |
| L — full live test (round 2) | live deployment (build `5f3cf0b`) | audit-only; local build in `wt-liveqa` (founder on scratch `amora_lanel`, ready for fix phase) | reported 2026-08-15 ~01:50 EDT | AUDIT: 56 routes × 2 viewports | **REPORTED — 0 HIGH / 6 MED / 7 LOW**; all round-2 focus verdicts CLEAN or by-design (federated docs byte-checked w/ control; 404/401/503 semantics proven by lifecycle writes + reboot); 8 could-not-measure incl. the citation line (never rendered anywhere — needs a key); 3 tooling lies self-caught. Report adopted at `docs/integration-program/round2-qa/LANE_L_REPORT_2026-08-15.md`. **Fixes held until V reports** (overlap on Admin.tsx + forms) | 5f3cf0b | 2026-08-15 (final report) |
| V — mobile-first QA (round 2, R14) | live deployment (build `5f3cf0b`) | audit-only (scratch schema dropped, nothing pushed) | reported 2026-08-15 ~02:20 EDT | AUDIT: 16 routes × 3 viewports + 390×664 URL-bar pass; 21/21 detector validation | **REPORTED — 4 HIGH / 5 MED (1 retracted by coordinator) / 4 LOW.** HIGH: `/login` Sign In covered by the tab bar at first paint (tap → Gratitude); `/map` removes all in-app nav; map iframe overflows 2× with off-screen close controls; CTAs on 3 more routes tap-stolen (19 thefts/13 routes). Report adopted at `round2-qa/LANE_V_REPORT_2026-08-15.md`; 99 screenshots in scratchpad `lane-v/`. 14 could-not-measure (safe-area insets read 0 on WebKit-Windows; no CPU throttling in WebKit; non-included store tiers never rendered) | 5f3cf0b | 2026-08-15 (final report) |
| F1 — mobile shell + public pages (fix) | game-amora | `wt-fix-mobile` / `wt/fix-mobile-shell` | dispatched 2026-08-15 ~02:40 EDT (**4th handle** of the F2/F3/F4/F1 block) | MobileTabBar/Fab, Layout spacer, index.css, public page files (Login/Register/Quests/Feed/forms/etc.) | dispatched; **HIGH** (V-H1/H4 root cause) + V-M7/M8/L13, L-M5/L3/L4, alt-detector conflict; lands LAST | ≥5f3cf0b | at dispatch |
| F2 — map shell escape (fix) | game-amora | `wt-fix-map` / `wt/fix-map-shell` | reported + landed 2026-08-15 ~04:30 EDT | `LivingMap.tsx` ONLY (+59/−4) | **LANDED on main `9632450`** (fast-forward; cherry = 1, single file, branch CI green). V-H2 closed: "Back to the village" control, fixed, 190×44, `max(safe-area-top, 44px)` clearing the artifact's 35px vitals strip, reuses the shell's single `exitApp` path so button/back-gesture/artifact-exit cannot disagree; WebKit proof at 390×844, 390×664, 1280×800 + deep-link hash contract preserved. 11 gates green, 1131/0/0. **DONE**: CI green ×2 (31890257763 main, 31889379897 branch), live `/health` → build `9632450` | 9632450 | 2026-08-15 10:37 EDT (live probe) |
| F3 — store surface (fix) | game-amora | `wt-fix-store` / `wt/fix-store-surface` | dispatched ~02:40 EDT (**2nd handle**) | `Admin.tsx` store region + sidebar labels | dispatched; L-M4/M6, V-M6/M8-store | ≥5f3cf0b | at dispatch |
| F4 — server hygiene (fix) | game-amora | `wt-fix-server` / `wt/fix-server-hygiene` | reported 2026-08-15 ~04:10 EDT | index.ts header/route-shell zones, seeds, Mint page, + 16 client `d.error` sites (R16) | **REPORTED, HELD** at `278df75` (2 commits, 4 files, clean; 70 files / 1143 tests / 0 skipped; +12-case hygiene e2e). L-M1 VERIFIED (5 headers, x-powered-by gone, frame-ancestors self, map iframe proven; HSTS deliberately unset → Rye 10); L-M2 seed→null (live rows → Rye 11); L-M3 VERIFIED; L-L5 VERIFIED (319 sites; 3 credential-verification families correctly excluded) — **consequence sweep in progress per R16**; L-L1 robots+sitemap VERIFIED, soft-404 DEFERRED (reason recorded); L-L6 no change (opacity comment added). **Sweep DONE at `3cb6331`** (3 commits, rebased on F2 `9632450`, 70/1143/0, gates green): 15 files / 24 sites + 5 branches → `d.message ?? d.error ?? fallback`; `ExampleRefusal.tsx` deliberately skipped (409 `example_immutable`, no message — a `??` that can never fire reads like a case that can); **found + fixed a real bug its own L5 change created** (`OnchainCard.tsx` guarded the wallet flow on `!ch.message`; after L5 the 401 carries `message:"Sign in first"` so a signed-out member's wallet would have been asked to SIGN the words "Sign in first" — guard now reads `chRes.ok`); S9 item confirmed untouched by diff. **Awaits F3 + F1 landing, then one more rebase + cold gates** | 3cb6331 | 2026-08-15 ~11:00 EDT (report) |
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
| 23 | Desktop map: the new escape control may overlap the artifact's `#buildBtn` (`left:14, top:52`, editors only, `display:none` otherwise) — unmeasured for a member who CAN edit the map on desktop; 1px overlap with `#mapSel` at 1280 confirmed harmless | map lane / F2 follow-up | queued, low |
| 20 | Store perf: `/admin` ships 863.6 KB JS (328 KB Admin chunk over the store); code-split the store panel after F3 lands; needs a baseline first | F3 | queued |
| 21 | Lane V re-run for non-included tiers the day the first Connected/Managed listing exists (vendor pills/support lines never rendered on mobile) | first real listing | queued |
| 12 | Usage-capture gap (named by Lane A, deliberate per spec ordering): a loop that exhausts the day budget MID-flight returns 503 and records no usage row (writer sits after the ok-guard); currently console.warn only. Revisit when billing reads `assistant_usage` | after item 5 | queued |

Merge order inside game-amora: **A first**, C rebases and reconciles `server/index.ts` by hunk, S
last. Before any merge: `git cherry main <branch>`, never `--stat A...B`.

---

## §5 Gate sets — verbatim, SHA-stamped. Re-read at session open.

**game-amora** — read from `.github/workflows/ci.yml` blob `ac1b1e9` at `28dace2`, 2026-08-14.
Eleven, in CI order, run cold:

```
pnpm check
rm -f node_modules/typescript/tsbuildinfo && npx tsc -p tsconfig.tests.json --noEmit
node scripts/check-brand-refs.mjs
node scripts/check-voice.mjs
node scripts/check-auth-fetch.mjs
node scripts/check-artifact-budget.mjs
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
pnpm gate        # truncation audit + typecheck
pnpm test        # + pnpm test:integration when server logic changed
pnpm build       # anything affecting the bundle
```

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
| 10 | **HSTS**: Lane F4 verified `http://amora.regencivics.earth` 301s to https but cannot enumerate the Railway-generated hostname or any other attached domain from here; a wrong `max-age` is irreversible, so it is unset. Needs the Railway domain inventory | Rye (Railway console) | 4 | confirm every hostname is TLS-terminated, then set HSTS conditionally on `x-forwarded-proto === "https"` (avoids poisoning localhost); a lane can wire it once the list is known | header set on the deployed site |
| 11 | **14 quest images on LIVE**: the seed fix (`imageUrl: null`) stops fresh forks emitting 404s, but live rows were written by a one-shot backfill (`runOnce("quest-posters-2026-08-10")`) that never repeats. The 14 files exist (1.63 MB) in `game-amora/data/uploads/` on this machine, gitignored; they cannot ship in `dist/` (would overrun the 6000 KB budget by ~1.2 MB — CI's own error text says "uploads volume instead") | Rye | 4 | **copy the 14 files into the Railway uploads volume** (keeps the posters) — else clear `image_url` on the 14 live rows (cards fall back to the designed gradient) | `/quests` on live emits zero 404s |
| 9 | **The store decision table** — 10 rows in `docs/integration-program-research/STORE_DESIGN.md` §7 (in game-amora at `da46358`). The four headline defaults: rev-share **0% in v1** (Salesforce is the honest comparison — we cannot technically enforce a share either); **CORE never processes payments pending counsel** (UBIT + 1099-NEC at the $600 threshold, not $20k); **no listing fee**; **ten working days to a first response naming the blocking stage** (Apple's ~2% appeal-reinstatement rate is the cautionary tale — the rejection message must do the work). Six more rows: vendor identity, price visibility, withdrawal terms, change of control, quality bar, reserved takeover power | Rye | 3 | accept all ten defaults; every one is reversible by a later ruling | rulings recorded in §8; none guessed into code meanwhile |
| 8 | **Live acceptance run** of the memory demo (ask "what did we decide about X" in JourneyToLaunch against the real village, screenshot the citation line): needs the production key and spends real tokens (~$0.01/question) | Rye or a lane with his go-ahead | 4 | run it after the deploy that carries `8e02dd0`; ~10 questions ≈ $0.10 | screenshot + `assistant_usage` rows from the live DB |
| 6 | The **eight diagnostic sentences** (4 outcomes × 2 tiers) | Rye approves; a lane drafts | 5 (not yet due) | lane drafts at queue item 6; Rye yes/no's | copy in repo passing check-voice |

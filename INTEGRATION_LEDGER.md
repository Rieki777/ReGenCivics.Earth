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
| C — module library platform | game-amora | `wt-library` / `wt/module-library` (to be created by lane) | dispatched 2026-08-14 (background agent, opus) | `shared/modules.ts`, `server/lib/modules.ts`, `server/lib/secrets.ts`, catalog + Integrations UI, migration **0079**, index.ts zones: secrets boot block OUTSIDE Lane A's wiring range, admin integrations routes | dispatched | 28dace2 (base) | at dispatch |
| S — Saberra listing | game-amora (stages 0–5 are not code) | none yet (build stage will use `wt-signals` / `wt/saberra-signals`) | reported 2026-08-14 20:21 | stages 0–5 artifacts (DRAFTED, adopted at `docs/integration-program/lane-s/`); later: the driver file, registry entry `signals`, `signals.read` capability, migration **0080** | **stages 1–5 drafted; stage 0 BLOCKED on tenant credential (B5, letter ready)** | artifacts verified on disk | 2026-08-14 20:21 (final report) |
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

---

## §4 Landing queue (Addendum 2 §C, verbatim order)

| # | Item | Blocked by | Status |
|---|---|---|---|
| 1 | Lane A (memory foundation) — merges first | — | **DONE**: main `8e02dd0`, CI green ×2, live build marker matches |
| 2 | Lane C phase C1 (catalog, tier metadata, 503 lapse, dynamic secret slots, registry-driven cards, tier stamped at enable, **+ integration_health + correlation-id driver wrapper + liveness-window field** — promoted, §8-R6) | rebases on 1 at merge | dispatched |
| 3 | Hub ADR-49 (Managed credential) — precedes any Managed credential code | — | **ACCEPTED by Rye 2026-08-14.** Managed-plane code is authorized |
| 4 | Lane C phase C2 (forgetMember/exportMember driver registry) — gates the first paid listing | 2, 3 | in Lane C brief; C2 code that touches the Managed plane waits on 3 |
| 5 | Incident log (`integration_calls`) + liveness probe — ahead of the first Connected listing | 2 | queued, own dispatch |
| 6 | Diagnostic path (reader, four outcomes, two answer tiers, no-model fallback, escape hatch via feedback relay) | 1, 2, 5 | queued; the eight sentences on Rye's list |
| 7 | Lane S stages 0–5 (not code, not blocked) | — | dispatched |
| 8 | Lane S build | 2 (C1+C2), 3, 4; and stage gates §3a rule 7 | queued |
| 9 | Lane H: hub side of Managed (shared vendor account, per-fork roster, billing line item, entity block) | ~~3~~ (ADR-49 accepted); §3c Q1–3 for signatures | queued |
| 10 | Publish MODULE_LIBRARY_CONTRACT v1.0 on a public URL (hub page; version-stamped, since listings are accepted against a version) — Rye ruled publish, R11 | 2, 5 (clauses 9–12 must be mechanically true first) | queued |
| 11 | Small defect (found by Lane A, in Lane C's zone): `PUT /api/admin/email-config` silently drops empty-string values, so a stored key can never be CLEARED via that route (also defeats test cleanup, e.g. S54's finally). Fix in Lane C if its secret-slots work touches that handler; else own dispatch | Lane C landing review | queued |
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
| 8 | **Live acceptance run** of the memory demo (ask "what did we decide about X" in JourneyToLaunch against the real village, screenshot the citation line): needs the production key and spends real tokens (~$0.01/question) | Rye or a lane with his go-ahead | 4 | run it after the deploy that carries `8e02dd0`; ~10 questions ≈ $0.10 | screenshot + `assistant_usage` rows from the live DB |
| 6 | The **eight diagnostic sentences** (4 outcomes × 2 tiers) | Rye approves; a lane drafts | 5 (not yet due) | lane drafts at queue item 6; Rye yes/no's | copy in repo passing check-voice |

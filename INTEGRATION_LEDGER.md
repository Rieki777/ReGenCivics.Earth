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

**Lane base refs:** every game-amora lane cuts from `origin/main` = **`28dace2`**.

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
| A — memory foundation | game-amora | `wt-memory` / `wt/memory-foundation` (to be created by lane) | dispatched 2026-08-14 (background agent, opus) | `server/lib/assistant.ts`, `villageReaders.ts`, `villageBrain.ts`, `knowledge.ts`, new usage-writer lib, migration **0078**, index.ts zones: wiring 1047–1062-equivalent, job block after recording-rss, five callAssistant sites, organize body, raw synthesis path (all re-located by content at 28dace2) | dispatched | 28dace2 (base) | at dispatch |
| C — module library platform | game-amora | `wt-library` / `wt/module-library` (to be created by lane) | dispatched 2026-08-14 (background agent, opus) | `shared/modules.ts`, `server/lib/modules.ts`, `server/lib/secrets.ts`, catalog + Integrations UI, migration **0079**, index.ts zones: secrets boot block OUTSIDE Lane A's wiring range, admin integrations routes | dispatched | 28dace2 (base) | at dispatch |
| S — Saberra listing | game-amora (stages 0–5 are not code) | none yet (build stage will use `wt-signals` / `wt/saberra-signals`) | dispatched 2026-08-14 (background agent, opus) | stages 0–5 artifacts; later: the driver file, registry entry `signals`, `signals.read` capability, migration **0080** | dispatched (stages 0–5 only) | n/a | at dispatch |
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
| Current stage | **0 (data audit) — dispatched 2026-08-14** | **1 — FROZEN** |
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
| Saberra platform key (name TBD by Lane S build) | platform (proposed) | env-only, PLATFORM_ASSISTANT_KEY posture | Rye | — | — | **ADR-49 (PROPOSED — Rye has not ruled)** |
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
| 1 | Lane A (memory foundation) — merges first | — | dispatched |
| 2 | Lane C phase C1 (catalog, tier metadata, 503 lapse, dynamic secret slots, registry-driven cards, tier stamped at enable, **+ integration_health + correlation-id driver wrapper + liveness-window field** — promoted, §8-R6) | rebases on 1 at merge | dispatched |
| 3 | Hub ADR-49 (Managed credential) — precedes any Managed credential code | Rye's ruling | DRAFTED this session; on Rye's list at priority 1 |
| 4 | Lane C phase C2 (forgetMember/exportMember driver registry) — gates the first paid listing | 2, 3 | in Lane C brief; C2 code that touches the Managed plane waits on 3 |
| 5 | Incident log (`integration_calls`) + liveness probe — ahead of the first Connected listing | 2 | queued, own dispatch |
| 6 | Diagnostic path (reader, four outcomes, two answer tiers, no-model fallback, escape hatch via feedback relay) | 1, 2, 5 | queued; the eight sentences on Rye's list |
| 7 | Lane S stages 0–5 (not code, not blocked) | — | dispatched |
| 8 | Lane S build | 2 (C1+C2), 3, 4; and stage gates §3a rule 7 | queued |
| 9 | Lane H: hub side of Managed (shared vendor account, per-fork roster, billing line item, entity block) | 3; §3c Q1–3 for signatures | queued |

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
| B1 | ADR-49 ruling (Managed credential exception) | Rye | 2026-08-14 | Managed-credential code (C2 Managed plane, Lane S build, Lane H); NOT C1, NOT Lane A, NOT Lane S stages 0–5 |
| B2 | Contracting entity Q1–Q3 (§3c) | Rye + counsel | 2026-08-14 | CORE signing anything (Saberra DPA, vendor agreement) |
| B3 | UBIT (§3c Q4) | Rye's accountant/counsel | 2026-08-14 | the first invoice only |
| B4 | Saberra commercial terms (today's price, after-price, per-village floor, model+caching, measured cost per /ask) | Rye to ask; Lane S stage 1 drafts the ask | 2026-08-14 | whether Lane S build is worth scheduling |
| B5 | Saberra tenant credential/API access for stage 0 (`GET /backup`, `GET /stats`) | Lane S searches env/config first; escalates to Rye only if absent | 2026-08-14 | Lane S stage 0 numbers |
| B6 | Contract publish-vs-private | Rye | 2026-08-14 | nothing until C1 + item 5 land (clauses 9–12 describe unbuilt machinery); then sending to any second vendor |

---

## §7 Changelog

- 2026-08-14 · `wt/integration` created at hub `55cff89` via `scripts/new-worktree.sh integration`. Proof: `git worktree list` shows it; `.env` present; clean tree.
- 2026-08-14 · Program docs adopted: 10 program files + 3 history files + 8-file Saberra package into `docs/integration-program/` with INDEX.md. Proof: `ls` output in session transcript.
- 2026-08-14 · §0 state measured: hub 55cff89, game-amora 28dace2, 30 worktrees, 4-way migration scan → 0078/0079/0080 free. Proof: scan output in transcript.
- 2026-08-14 · ADR-49 appended to `.ai/docs/DECISIONS.md` as PROPOSED; six terms registered in DOMAIN-LANGUAGE.md.
- 2026-08-14 · Lanes A, C, S dispatched as background agents (opus), briefs amended per §8-R5/R6.

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

---

## §10 Decision list for Rye — regenerated 2026-08-14

See the session brief (delivered in-conversation) for the same list with full context. Sorted by
what only Rye can do; every item has a default so nothing blocks.

| # | Item | Owner | Priority | Default | Done when |
|---|---|---|---|---|---|
| 1 | Rule on **ADR-49** (platform-held env-only Managed credential; scoped exception to CUSTOM_GAMES_MASTER_PLAN locked decision 1) | Rye | 1 | **Approve.** It generalises the shipped `PLATFORM_ASSISTANT_KEY` posture; disclosure ships in-product; nothing at rest in any DB | ADR-49 status flips Accepted (or Rejected + Managed tier redesigned) |
| 2 | Send counsel the **§3c questions** (entity standing, DPA posture, agency-vs-resale, **UBIT**) | Rye | 2 | Ask accountant/counsel this week; Q4 blocks only the first invoice | written answers land in §3c |
| 3 | Send Saberra the **commercial-terms ask** (Lane S stage 1 drafts it: today's Amora price, after-price, per-village floor, model + caching, measured cost per /ask) | Rye sends | 2 | send when Lane S hands the draft | numbers recorded in §3a |
| 4 | **Saberra tenant access** for stage 0 if Lane S cannot find a credential in env/config | Rye | 3 (only if asked) | provide the tenant API credential or run the two GETs himself | stage 0 numbers exist |
| 5 | **Contract publish vs private** | Rye | 4 | publish on a URL — it converts a negotiating position into a standard — but only after C1 + incident log land | decision recorded; page ships or not |
| 6 | The **eight diagnostic sentences** (4 outcomes × 2 tiers) | Rye approves; a lane drafts | 5 (not yet due) | lane drafts at queue item 6; Rye yes/no's | copy in repo passing check-voice |

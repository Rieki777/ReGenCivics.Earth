# Lane TESTRUN — watch a whole cycle turn before you bet a village on it

**Read `../round6/BUILD_HOUSE_RULES.md` first.** It binds.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-testrun`, branch `wt/r7-testrun`, from `origin/main` at
**`855075a`**, deps installed, `.env` present.
**Migration `0116` if you need one. Only 0116.**

---

## 1 · The ruling

**R86.** Rye: [**we also need a "test the village" option where all the cycles can run rapidly so we
can test how they are all working. Lets build this now and then we can (say) but a lunar cycle on a 1
min cycle and we can see how everything runs, which we should do anyway before going live. So the
"journey to launch" has this as the second to last button to run a quick test over all settings to
see if they would work in production or break in some way.**]

**Why the placement is the point.** The last button on that page opens the launch ballot, which needs
every member to agree and turns on token issuance for good. **This is the last moment anybody can
find out that a setting breaks.** A founder should be able to watch a full turn of their Game in
minutes and see what it does.

## 2 · What you are starting from, measured at `855075a`

**Two seams already exist and they are the reason this is a feature rather than a refactor.**

- **`cycleWindow(at: Date = new Date())`** in `server/lib/economy.ts:225` already takes an injected
  instant. **Ten call sites; at least three already thread `at` through.** The rest take the default.
- **Jobs register through `registerJob(name, intervalMs, fn)`** (`server/index.ts` near 4939), so the
  cadence of the recurring work is already a number in a registry rather than a hardcoded timer.

**Both of those are my measurements and both are hypotheses. Check them.** In particular: **find the
call sites that do NOT thread an instant**, because those are the ones that will read the wall clock
during a compressed run and produce results that look right and are not. **That list is the real
scope of this lane and I do not know its length.**

## 3 · What to build

**A dry run a founder can start, watch, and end, that changes nothing real.**

1. **Compressed cycles.** The founder picks a compression (his example: a lunar cycle in one minute)
   and the machinery runs turn after turn at that pace.
2. **It exercises the settings that are actually configured**, so it tells the founder about THEIR
   Game rather than about a default one.
3. **It reports what happened**, in a form somebody can read: what was issued, to whom, what each
   job did, and **what refused or failed.** The failures are the entire product here. A dry run that
   only shows success has told the founder nothing they needed.
4. **It ends and leaves no trace.** See §4, which is the hard part.

## 4 · The constraint the whole lane turns on

**A test run must not create real value, and R81 is now absolute about this.**

The founder has ruled that **all minting goes through governance after launch** (R81), and that
**before launch nothing issues at all** (R67). A dry run that mints test tokens into real balances
would be the platform issuing value with no vote behind it, which is the exact act the last month of
rulings exists to prevent.

**So decide, deliberately, and say which you chose and why:**

- **A separate scratch space** the run writes into and which is discarded, so the real ledger is
  never touched.
- **A simulation** that computes what would happen and writes nothing.
- **Something else you can defend.**

**Whatever you choose, these must hold and you must prove each one:**

- **The real ledger has the same contents after the run as before.** Assert it, do not reason about
  it. `token_ledger` row count and every faucet balance, before and after.
- **`server/lib/gameStart.ts` still refuses issuance** for a village that has not launched, during
  and after a test run. **A test mode that switches off the gate has removed the gate.**
- **A test run leaves no row that a later reader could mistake for real history.** Look hard at
  anything append-only: the ledger, the gratitude log, module usage, the audit trail.
- **It cannot be started on a launched village by accident**, or if it can, that is a deliberate
  decision you state in your report.

**This is the item where a plausible-looking build is most expensive.** If you cannot satisfy those
properties, **build the furthest honest version and say exactly what it does not cover.** A dry run
that is clear about testing three of five subsystems is worth more than one that silently tests two
and looks complete.

## 5 · The page

**Second-to-last button on `/journey-to-launch`, immediately before the launch card.**

**Read what Lane GAMESTART built there first** (merged as #102). That page changed shape this round:
the Launch button now opens a ballot at 100% unity and 100% quorum with a floor of three members,
rather than setting a flag. **Your button sits directly above that and every line number in this
brief will have moved.**

**R55 binds:** a village that has not launched is young, not failing. This is a tool a founder
reaches for, never a step they are behind on. **R56 binds:** say what the run will do and what it
will not, before they start it.

**One small item comes with the file.** `client/src/pages/JourneyToLaunch.tsx:494` has link text
reading "Project history" pointing at `/project-history`, which is called **Command Centre**
everywhere it has been fixed. **Rename that string. Do not rename the route.** Lane DOORS is doing
the other three sites and has been told to leave this file to you. If DOORS reports naming sites in
this file beyond line 494, I will pass them to you.

## 6 · Your zone

**Yours:** `client/src/pages/JourneyToLaunch.tsx` (the whole file), the job registry and cycle-driving
code in `server/index.ts` and `server/lib/economy.ts`, whatever new module the test run needs,
`drizzle/0116_*.sql` if needed.

**Live lanes:** DIALS holds `client/src/pages/GameMechanics.tsx` and the `platform.feedback_relay`
entry in `shared/gameVariables.ts`. GUARDS holds `shared/capabilities.ts` and parts of
`server/index.ts` (the visit-config link validation and the seat-history route). DOORS holds the
module cards, `Modules.tsx`, `ModuleDetail.tsx`, `ProjectHistory.tsx` and `App.tsx`. CAPS is
mid-flight in the gratitude dials. **`server/index.ts` is shared with GUARDS: your hunks and theirs
must be disjoint, so tell me what you are touching if it goes near either of their areas.**

**A read-only audit is sweeping every token-issuing path in this repo right now** and will report
soon. **If its findings change what you need to know, I will send them to you as an addendum.**

## 7 · Gates and reporting

Standard set, enumerated from `.github/workflows/` yourself.

**Write the tests first and watch them fail.** The four that matter are the four properties in §4,
and **the ledger-unchanged one is the one to write first**, because everything else is negotiable and
that one is not.

Report in the house-rules block, plus:

- **Every cycle-driven behaviour you found, and whether the compressed run actually exercises it.**
  Name the ones it does not.
- **Which isolation approach you chose and why.**
- **What a founder learns from a run, stated as the sentences the report actually shows them.**

Status stops at **CODED**. Nothing pushed or merged without me.

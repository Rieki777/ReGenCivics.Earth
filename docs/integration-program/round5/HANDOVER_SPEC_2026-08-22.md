# SPEC — THE HANDOVER TEN

**Base:** `origin/main` = `0aa7a8e9a6165e4d7e438b45955887da751ee6dc` (verified). Latest migration on main: `drizzle/0091_proposal_drafts.sql`.

**Line-number convention:** every number below was read with `git show origin/main:FILE | sed -n` or `| grep -n`, which agrees with the blob. `git grep -n … origin/main -- server/index.ts` reports numbers ~210 lower — do not mix the two. (I re-verified four load-bearing claims myself: `ballots.subject_type` is `varchar(24) NOT NULL` with no CHECK and no enum, 0089:20; the one gate's `if (ctx.isAdmin) return true;` is the first line of `hasCapability`, `shared/capabilities.ts`; the close route's `else` branch writes `mechanics_proposals.status='failed'` for `no_quorum` at index 21521; `PUT /api/admin/roles/:id` at index 8831 destructures exactly `{ circleId, seats }`. All four scout claims hold.)

---

## CONTEXT — three sentences a lane must not build without

These villages are meant to be taken over by their electorate, so the admin panel is scaffolding to be dismantled, and the design test for anything here is *does this move a power toward the village, or entrench the scaffolding?* (R54). The handover is a journey to celebrate and never a scorecard to fail: a village holding two powers is young, not behind, so nothing in this work may render as a percentage, a countdown, a nag, or a comparison between villages (R55). The concrete test for every surface: **would a two-year-old village and a two-week-old village both feel good opening this?**

---

## THE TEN, RE-RANKED BY WHAT THE CODE ACTUALLY SUPPORTS

Three of the ten turned out cheaper than the framing suggested, one turned out to be **not buildable as stated**, one turned out to be **aimed at the wrong end of the problem**, and one is the weakest of the set. That re-ranking is the most useful thing in this document:

| # | Idea | Verdict | Cost |
|---|---|---|---|
| 1 | Advisory votes | **Cheapest thing in the engine.** Zero SQL. Build first; three others lean on it | ~1 route, 4 config entries |
| 7 | Graceful no-quorum | **A live defect, not a feature.** A no-quorum ballot currently *kills* its subject terminally | 1 `else if` + 1 ALTER |
| 9 | Succession as achievement | **Already served and rendered by nobody.** One member-gated route with zero client callers | client only, + 1-line bug fix |
| 8 | Decision archaeology | All data retained; nothing renders the story | reads + links, zero schema |
| 3 | Per-decision handover | Pattern already shipping 21 times; runway missing | the big one |
| 4 | Scaffolding names itself | More exists than expected; highest R55 booby-trap | registry + 1 route |
| 5 | Transfer as its own type | Config-shaped once idea 3 exists; **meaningless before it** | 1 config + 1 route + 1 branch |
| 10 | Objection credit | **Weakest of the ten as framed.** Reframe to lineage | 1 column |
| 6 | Quorum that understands size | **Framing is inverted.** Build the real gap instead | 1 dial, zero SQL |
| 2 | The counterfactual | **Not buildable as stated without inventing votes. Refused, and replaced.** | see below |

---

# PER IDEA

## 1. ADVISORY VOTES — build first, zero schema

### What exists
`ballots.subject_type` is `varchar(24) NOT NULL` with **no CHECK, no enum, no union in TypeScript** (`OpenBallotInput.subjectType: string`, `server/lib/ballots.ts:121`). `openBallot()` never validates it. The post-close executor is a single `if (b.subjectType === "mechanics")` at index 21479. A passed ballot with an unrecognised subject type closes cleanly, writes its outcome, writes its Pulse line, notifies the whole frozen roll, skips the `if`, and returns `applied: []` — **no throw, no orphan, no half-state.** The UI was built subject-agnostic: `subjectNoun()` falls back to `"Decision"` (`wizardConfig.ts:548`), `Decision.tsx` never fetches or branches on the subject, `Decisions.tsx` contains zero references to `subjectType`.

**The engine already conducts a decision that decides nothing. It just has no door to walk in through.**

### What is missing
One opening route. `POST /api/governance/mechanics/:id/open-ballot` is the sole caller of `openBallot` and hardcodes `subjectType: "mechanics"` at index 21236.

### DESIGN
- **Data:** none. No migration, no column, no `evaluateBallot` change.
- **Route:** `POST /api/governance/advisory`, inside the existing `requireModule("governance")` block. Generates `subject_ref = adv-<ts>-<rand>` (so `open_key` uniqueness gives exactly one open advisory ballot per question; `"advisory"(8)+1+24 = 33` of 120 chars). Takes title + `doc_markdown` from the wizard payload. Resolves method and dials through the same `dialsForMethod` call, `weightModeNow()`, `buildElectorate()`. Calls `openBallot({ subjectType: "advisory", … })` with **no `onOpen`** — there is no subject table to flip.
- **Gate:** opening an advisory ballot requires `proposal.open`, the same key as any other proposal. It must **not** require `proposal.decide` and must **not** be admin-only. An advisory vote an admin has to authorise is not practice, it is permission.
- **Executor:** replace the bare `if` at index 21479 with a **named dispatch map** in a new file `server/lib/ballotExecutors.ts`: `{ mechanics: applyMechanicsOutcome, advisory: NOTHING_EXECUTES }`, and an explicit `default:` that logs an admin-audience audit row for an unknown type. Today "unhandled" and "advisory" are the same code path; that is the one place a defect can hide, and it must be made intentional rather than incidental.
- **Lockstep:** `"advisory"` into `WIZARD_TYPES` **and** `CONDUCTABLE_TYPES` in `server/lib/proposalDrafts.ts` and into client `wizardConfig.ts` in the same commit — `wizardConfig.test.ts` fails if the two lists drift.
- **Copy — required, not optional.** `SUBJECT_NOUN.advisory = "Advisory vote"`. And `DecisionOutcome.tsx`'s `OUTCOME.passed` carries `law: true` (lines 32-38), which renders "Carried" plus *"…and it stands until the village decides otherwise"* and fires the `moment`-intensity `Celebration`. **That sentence is false for an advisory vote.** `law` must become a function of the ballot, not of the status. An advisory pass reads: *"The village said yes. Nothing changes because of it — this was the village hearing itself."* Intensity: `whisper`, not `moment`. The `moment` ration is four events (see §What Not To Build); an advisory vote is practice and practice is not a landmark.
- **Wizard framing:** the type card's consequence line says what it does *and does not* do, in the register `TypeCards` already uses. Something like *"Ask the village a question and record the answer. Nothing changes because of it. Villages often do this once before they do it for real."* Never *"before you're ready for a real vote"* — that implies a bar.

### Harm metric (a thing that becomes true)
**A village can hold a real vote, with a real roll and real weights, that binds nobody — and no surface anywhere calls the result law.** Proven by: a test that closes a passed advisory ballot and asserts every subject table is byte-identical before and after, plus a snapshot test that `DecisionOutcome` for an advisory pass contains neither the word "Carried" nor the stands-until sentence.

### Dependencies
None. This is the root of the tree.

---

## 2. THE COUNTERFACTUAL — **refused as framed, and replaced**

### Say this loudly
The founder's framing is: *"after an admin decides something the village could have voted on, show what the village WOULD have decided."* **That is not computable and we will not fake it.** Scout A checked every candidate source: there is no uncast-vote data of any kind. `mechanics_proposal_backers` is support-only — no opposition, no abstain, no weight — so it can produce a one-sided count and never a tally. `governance_supports` is created by 0089 and **never read or written anywhere in `server/**` or `client/**`** (grepped against a present control in the same command). GOV_DESIGN §9 explicitly defers the 5-scale temperature poll. Any number rendered next to an admin decision as "what the village would have said" would be a simulation wearing a governance surface, and in a system whose whole claim is *this is what we actually decided*, that is the single most corrosive thing this spec could ship.

### What IS computable, exactly, with zero invention

Two things, and they are genuinely valuable:

**(a) Re-reading a real closed ballot under different dials.** `evaluateBallot`, `unityPctOf` and `quorumPctOf` are pure and take every dial as an argument; nothing in `shared/governanceEngine.ts` reads a registry or a variable. `tallies {yesW,noW,abstainW}`, `totalWeight`, `unityPct`, `quorumPct`, `method` and `electorateCount` are already on the wire from `serveBallot` (index 21146). **The client already imports and runs `evaluateBallot`** — `CloseBeat.tsx:27`. So *"with a 60% bar this would have carried; with ours it did not"* is a pure function call in the browser today, on data the page already has. **Zero server, zero SQL.**

**(b) Equal-weight re-reading of a weighted ballot.** Each roll member weighs 1, `totalWeight` becomes `electorate_count`, per-voter choices come from `ballot_votes`. One read-only `GROUP BY v.choice, COUNT(*)` alongside the existing weighted sums. Honest, exact. This is the interesting one: *"under one-person-one-vote this same vote would also have carried."*

**Explicitly NOT computable, do not attempt:** token↔custom re-weighting. Historical token balances at that instant were never stored anywhere except `ballot_electorate.weight` for the mode that was actually live. Re-weighting a past token ballot as a custom one requires inventing numbers.

### The replacement design
The real answer to *"confidence is the blocker to handover"* is **idea 1 composed with idea 3**, not a simulation. When an admin is about to take a decision the village could hold, the per-decision handover path (idea 3) offers *"put this to the village instead"* — and its weaker sibling, available to any admin at any time, is **"ask the village first."** That opens an advisory ballot on the same question. The admin then decides, and the two facts sit next to each other on the record: what the village said, and what was done. **That is a counterfactual made of real votes.** It is also the honest version of the founder's instinct: the fear isn't arithmetic, it's *would they have got it right* — and the only evidence that answers that is the village actually answering.

### DESIGN
- **Surface:** a `WhatIfPanel` on **closed ballots only**, collapsed by default, below `DecisionOutcome` and above the frozen document. Two readings: method-variation (client-side, pure) and equal-weight (one route). No panel on an open ballot — reading your own live vote under other rules is how a village learns to game its dials.
- **Copy intent:** the village learning about its own dials, never a verdict on its choice. *"This village asks for 80% agreement. Under a simple majority this would have carried; under ours it did not."* Never *"you would have decided better under X."* Never comparative across villages.
- **The advisory-first path:** one admin-side affordance, `POST /api/governance/advisory` with a `relatedTo` note in the doc markdown. No new plumbing.

### Harm metric
**No number anywhere in the product is presented as a vote that was not cast.** Proven by: there is no code path from `mechanics_proposal_backers` or `governance_supports` into any tally-shaped display, and a lint-style test asserts the counterfactual panel's inputs come only from `ballot_votes`/`ballot_electorate` of a `status != 'open'` ballot.

### Dependencies
Idea 1 for the honest version of the admin-decision case. The dial-variation panel depends on nothing.

---

## 3. PER-DECISION HANDOVER — the big one, and the pattern is already shipping

### What exists (more than expected)
**21 of the 159 admin write routes already run through the one gate rather than `isAdmin`.** `mayManageEvents` (`event.manage`, 7 routes), `resourcesViewerFor`/`mayDeclareResources` (`org.declare` **or this circle's speaking seat**, 6), `canManageExchange` (`exchange.manage`, 5), `health.record` (1), `consentActor` (`quest.consent`, 1), and the seating route under `proposal.decide` + a no-self-appointment guard (1). Every one has the shape `if (await isAdmin(req)) return true;` then `hasCapability(K, await capabilityCtx(user))`. The `health.regen` rationale comment is the frame already written into the codebase: *"The path stays under /api/admin for continuity; the gate is what changed."*

`CAPABILITY_CONSEQUENCE` (`shared/draftKinds.ts:149-172`) already has a member-legible sentence for all 22 keys, written on the explicit principle that *"they say the consequence and never the key."* `capabilityCtx` runs on effectively every authenticated request. `hasCapability` is pure and identical on client and server.

### What is missing
1. 138 of 159 admin writes have no capability behind them and no key that could name them.
2. **There is no route that adds a capability to an existing role.** Verified: `PUT /api/admin/roles/:id` (index 8831) destructures exactly `{ circleId, seats }`. The only writes to role capabilities are the boot seed (index 1629, `rolesRepo.replaceAll` from `server/seeds/roles-seed.json`) and `POST /api/admin/drafts/:id/accept` (index 12660, `rolesRepo.insert` — *creates* a role). To hand a power to the Steward Circle today you either walk the AI draft queue or edit a seed file and redeploy. **The handover has no runway.**
3. Only 12 of 22 keys generate a `progression.unlock.<cap>` variable; the 10 appointment-only keys are not village-tunable at all.
4. No way to say a power has *moved* rather than been *shared* (see Hard Question A).

### DESIGN
**Do not add 138 capability keys.** Pick the smallest set that names powers a village would actually want and that already have surfaces. Proposed first set of five, each covering a cluster of existing routes:

| New key | Covers | Routes today |
|---|---|---|
| `org.seat` | seating and unseating holders | 22506, 22676, 23024 (already partly gated) |
| `intake.moderate` | submissions, forum reports, message reports, pulse deletion | 6120, 6136, 7859, 8399, 23060 |
| `library.keep` | library approve/edit/loans/adjust | 14104…14311 |
| `story.tell` | what the village says about itself: content, brand, FAQs, milestones, training | 6308, 16376, 17103, 16841…16999 |
| `dial.set` | `PUT /api/admin/variables/:key` **for open-ring keys only** | 20113 |

`dial.set` is the load-bearing one and carries a hard rule: **it must respect `ringOf(def)`.** Today the ring is enforced on the proposal path (`server/lib/mechanics.ts:84` and index 20796, *"This dial is no longer community-governable"*) and **not at all** on `PUT /api/admin/variables/:key`. That asymmetry — the ring is a ceiling on the village and never a floor under it — is the handover problem written in one function. `dial.set` must be refused for founder-ring keys the same way the proposal path refuses them.

**The runway route:** `PUT /api/admin/roles/:id/capabilities`, carrying the **escalation-checkbox pattern**, which is a stronger model than the kind-change 409 and its sentences are already written. Precedent: `Admin.tsx:4377-4511` + `applyEscalationChoices` (index 12588). *"Any capability a proposed role asks for that no existing role already grants is listed as its own checkbox, in a sentence about what a holder could DO. Anything left unticked is stripped… silence is refusal."* Write through `rolesRepo.replaceAll`, never raw SQL — a raw `UPDATE` here would be invisible until reboot (known trap: raw SQL bypasses store caches).

**The per-decision affordance itself:** on any admin surface whose route is capability-gated, one line and one path — *"This is a power the village can hold."* → opens the transfer proposal (idea 5) or, before that exists, the advisory vote (idea 1). Once per surface, stated flatly, never repeated, never with a due date.

### Harm metric
**A village can move a named power out of the admin panel and onto a role, and the person who now holds it can act without anyone typing an admin password.** Proven by an e2e that grants `intake.moderate` to a non-admin role and has that holder resolve a report end-to-end.

### Dependencies
Nothing hard, but it is the substrate for ideas 4 and 5 and should land before both.

---

## 4. THE SCAFFOLDING NAMES ITSELF — cheap, and the most dangerous surface in this spec

### What exists
`GET /api/admin/members/:id/capabilities` (index 12234) runs the real `hasCapability` over all 22 keys and reports the **deciding source** for each — `"admin"`, `"denied by warning badge"`, `"role"`, `"badge"`, `` `stage (${STAGE_UNLOCKS[cap]})` ``, `"not granted"` — mirroring the gate's own order. `GET /api/governance/standing` (index 21700) already does the member-facing version for one capability. `TypeCards.tsx:51` already says in words what this village cannot open yet, and keeps the card visible *"because hiding it would make the village's own governance look smaller than it is"* — R55-shaped writing that predates R55.

### What is missing
The explainer is admin-only and per-member; it reports *who holds what*, never *what this screen is gated on*. No inverse index (capability → the routes and screens it opens). No village-facing view at all.

### DESIGN
- Give each gate helper a declared key and build a **registry from the helpers, not hand-typed** (`server/lib/capabilityRegistry.ts`): `{ capability, routes[], surfaceLabel, consequenceSentence }`, the sentence sourced from `CAPABILITY_CONSEQUENCE`.
- One read route, `GET /api/governance/powers`, member-gated, serving a **list of named powers, each with a holder**.
- Render on the admin surface as one plain sentence: *"Putting a gathering on the calendar: the village's calendar-keepers, or an admin."*
- Render on the village side as a list in the register `structuralLoad`'s note already uses (`server/lib/orgChart.ts:~560`, *"Carrying a lot is a load and not a fault"*). A power still with the scaffolding is a power **not yet grown into**, and the sentence must read that way.

### THE R55 TRAP, NAMED
**The inverse index is exactly the artifact that becomes a scorecard if rendered carelessly.** "2 of 12 · 17%" is one careless afternoon away. The rule for this surface, and it is not negotiable:

- No fraction. No denominator. No total. No progress bar. No `MoonProgress mode="progress"`.
- Never sorted by held-vs-not, which visually manufactures a completion bar.
- Never a phase label derived from a count ("you are a sprout because you hold 3"). Phases from `docs/modules/natural-interface.md` may name a *stage of a single power's journey*, never a village's aggregate.
- The list renders identically for a village holding zero powers and one holding all twelve — same layout, same tone, different holders.

### Harm metric
**A member can open one page and read, in sentences, which powers exist, who holds each, and how one moves — and there is no number on that page.** Proven by a snapshot test asserting the rendered page contains no `%` character and no `N of M` pattern.

### Dependencies
Idea 3 (there is little to narrate before the key set exists).

---

## 5. TRANSFER AS ITS OWN PROPOSAL TYPE — build after 3, and two rulings are load-bearing

### What exists
The wizard is genuinely declarative and says so: *"Adding a proposal type is an entry in this file. It is never a new component and never a new route."* `ballots.subject_type` is free text. `closeBallot` is one guarded `UPDATE … WHERE status='open'` — zero rows means someone else closed it, execute nothing. The snapshot law freezes method, dials, electorate and weights inside the open transaction, **so a transfer landing mid-ballot cannot change that ballot's own arithmetic.** `applyMechanicsProposal` is the model for an idempotent, partially-failable apply that notifies admins on refusal.

`badge_grant` is the cautionary tale: full client config, working pickers, server-side draft persistence, a `SUBJECT_NOUN` entry, named in 0089 — and **`POST /api/governance/badge-grants` does not exist**, `CONDUCTABLE_TYPES` is `["mechanics"]`, and on pass **nothing happens**. Do not repeat that shape.

### RULING 1 — a transfer proposal may be opened only by the village, never by an admin
Requires `proposal.open`; the route refuses when the actor's only path to it is `ctx.isAdmin`. Reason: R54's design test fails on its own instrument if the scaffolding can hand itself a ceremony. An admin who wants to encourage a transfer opens an **advisory** vote (idea 1) and lets a member carry it.

### RULING 2 — the badge review's refusal list belongs on `badge_grant`, not on the transfer type, and the reason it gives must be re-stated
The review's condition 1 says `badge_grant` must refuse `ballot.vote` and `member.vouch`, arguing *"an electorate that can vote to hand `ballot.vote` to chosen people is an electorate that can vote to enlarge itself, one ballot at a time."* **Under R54 that stated risk is the stated destination.** The real risk is not enlargement, it is **capture**: a badge naming three individuals is enlargement by the scaffolding wearing the village's clothes. So:

- `badge_grant` refuses the governance keys — it names *people*.
- The **transfer type may move any transferable capability including `ballot.vote`** — it names a *power*, and the whole electorate votes on it.

That distinction is the entire design, and it satisfies the review's actual safety concern while honouring R54's actual destination.

### DESIGN
Six mechanical pieces, all of which already have a template: an entry in `wizardConfig.ts` (id `power_transfer`, group "The village's own powers", `changeSet`-adjacent field kind for picking the capability); the id in `WIZARD_TYPES` and `CONDUCTABLE_TYPES`; `POST /api/governance/power-transfers`; a `SUBJECT_NOUN` entry; and **one entry in the executor map from Lane G-A**, not a second `if`. On pass: one row in `capability_holding` (see Hard Question A) and one `moment` celebration.

**Ceremony, not a form.** The wizard's own consequence line, in the village's voice: *"The village asks to hold this."* The document snapshot says what the power does (from `CAPABILITY_CONSEQUENCE`), who holds it today, and what changes on the day it crosses. On carrying: a `dawn` `moment` celebration — and this is the one addition this spec makes to the rationed list (see §What Not To Build).

### Harm metric
**A power crosses to the village by a vote the whole electorate held, and the crossing has a date, an author, an outcome sentence and a permanent row behind it.**

### Dependencies
Idea 3 (`capability_holding` and the gate change must exist first — a transfer type with nothing to transfer is a wizard walking members toward a route nobody mounted, which is precisely what `CONDUCTABLE_TYPES` exists to prevent). Idea 1 (executor map).

---

## 6. QUORUM THAT UNDERSTANDS SIZE — **the framing is inverted; build the other thing**

### SAY THIS LOUDLY
A flat 20% quorum is **already gentle at the small end and hard at the large end**, not the other way round. Under `equal` mode, voters needed = `ceil(0.20 × N)`: N=3 → **1 voter**; N=5 → **1**; N=200 → **40**. The thing that breaks with size is the *big* village. "A village of five is not a failed village of fifty" describes a problem the arithmetic does not have — and worse, building a size curve and framing it as easing the bar for young villages would tell a young village it is being given a handicap, which is an R55 violation manufactured out of a non-problem.

### The real gap, which is sharp
**In `token` and `custom` weight mode, quorum is weight-based only, so one large holder can meet quorum alone.** `electorate_count` sits on the row (frozen at open, index 21139) and is consulted by nothing: grepped, it appears only in display payloads, `Decision.tsx:182`, `VoteResult.tsx:158` and two e2e assertions. It enters no threshold and no formula.

### DESIGN
One new Ring-2 dial, `governance.quorum_heads_min` (int, 0–100, default **0** = off, so nothing changes for any existing village until it chooses). Add `electorateCount` and `votedCount` to `EvaluateInput`/`MethodDials`. Quorum is met when the weight bar is met **and** at least `quorum_heads_min` distinct people voted. `votedCount` is `COUNT(*)` on `ballot_votes` — already joined by `talliesFor`. **Zero SQL** (the dial is a registry entry; `unity_pct`/`quorum_pct` are already `decimal(5,2)` snapshots).

**One real edit, not a no-op:** `dialsForMethod` is called at index 21214 and `buildElectorate()` at index 21223 — **the dials are computed before the electorate exists.** Any size-aware dial requires swapping those two, which also moves the token-mode guard at 21219-21222. Do it carefully; it is inside the open transaction's setup.

**Copy:** the dial's own description says what it is for — *"a floor of people, however they weigh"* — and never mentions village size.

### Harm metric
**A ballot cannot reach quorum on one person's weight alone in a village that has set a head floor.** Proven by a unit test on `evaluateBallot` with one voter holding 90% of `total_weight`.

### Dependencies
None. Lives with Lane G-A because it touches `shared/governanceEngine.ts` and the open route.

---

## 7. GRACEFUL NO-QUORUM — **this is a live defect, and it is the second-highest-value item here**

### What exists, and what is broken
The framing layer is already right, which makes the data layer worse rather than better. `DecisionOutcome.tsx:46` words it **"Too few spoke"**, grey frame, `law: false`. `notifyRoll` (index 21558) words it **"Closed without quorum"** and the comment above it says explicitly: *"`no_quorum` is worded as its own thing and never folded into 'did not pass'. Too few people answered is a different fact from the village saying no."*

**And five lines earlier, the same route does exactly that.** Verified at index 21521: `no_quorum` falls into the same `else` as `failed`, writes `mechanics_proposals.status = 'failed'`, and notifies the proposer **"The village vote did not pass"**. `failed` is terminal — `open-ballot` requires `status='open'` (21192), the apply route requires a passed status (20840), and **no route anywhere moves a failed mechanics proposal back to open.** The member must re-author the whole proposal and re-gather supporters because too few neighbours happened to be around that week.

That is the single most R55-violating behaviour in the shipped engine.

### What makes the fix nearly free
`open_key` is freed at close by the `CONCAT(open_key,':',id)` rewrite. Supports live in `mechanics_proposal_backers` and are untouched by a close. The per-cycle proposal ceiling gates *creation*, not re-opening. `ballotsFor(subjectType, subjectRef)` (`ballots.ts:112`) already returns every ballot on a subject newest-first, and `GET /api/governance/ballots?subjectType=&subjectRef=` already serves it.

### DESIGN
- Split the `else` at index 21521 on `result.outcome === "no_quorum"`. Set the proposal to a new status and `ballot_id = NULL`. Keep the existing `WHERE … AND status='onsite_vote'` guard exactly as it is — it is what makes a double close a no-op.
- **Take the migration.** One `ALTER TABLE mechanics_proposals MODIFY status enum(… ,'awaiting_quorum', …)` — the same pattern 0089's own last line uses (verified, 0089:142). New file, never a renumber (renaming replays the file and `ADD COLUMN` then bricks boot). Reason for spending a migration rather than reverting to plain `'open'`: *"nobody has voted yet"* and *"we tried and too few of us were there"* are different facts, and that difference is precisely what R55 wants preserved. Deriving it from a ballots subquery on the hot proposal-list route is the wrong trade.
- **Re-open ceiling:** `governance.reopen_limit`, Ring 2, int 0–10, default **2**. Without one a subject bounces forever. Count re-opens from `ballotsFor()` — no new column.
- The second ballot is a genuinely new ballot: fresh `buildElectorate()`, fresh dials, its own snapshot. Correct under the snapshot law, and it must be *said on the page*: **"The roll may be different this time."**
- **Copy:** the proposer's notification becomes *"Not enough of us were there. Your proposal is still standing, and the village can take it up again."* The proposal card reads *"Waiting to be heard."*

### THE NAGGING RULE
`ballot-watch` (index 4244) already gets restraint right for live ballots: one nudge per member per ballot, dedupe-keyed, **and people who have already voted are never pinged again**. A re-openable proposal **must inherit that job's discipline and must not spawn a new one.** There is to be no recurring "your village still hasn't reached quorum" reminder, ever. A waiting proposal waits silently until a member acts.

### Harm metric
**A proposal that too few people answered is still there tomorrow, and no one has to re-author it or re-gather supporters.** Proven by an e2e: open a ballot, let it close under quorum, re-open it, and assert the backers table is unchanged and the second ballot opens without a new proposal row.

### Dependencies
None. Ship it early; it is a bug fix wearing a feature's clothes.

---

## 8. DECISION ARCHAEOLOGY — all the data is there, none of the story is

### What is retained (materially richer than an audit log)
Every column survives close; nothing is nulled or deleted. `doc_markdown` (**the whole proposal text, verbatim, frozen at open**), `outcome_note` (required on every close, refused if blank, `ballots.ts:409`), `closed_by`/`closed_at`, `opened_by`/`opens_at`/`closes_at`, the rules it ran under (`method`, `unity_pct`, `quorum_pct`, `weight_mode`, `weight_token` — *the village's rules at that date*), the full frozen `ballot_electorate`, named votes with reasons and `cast_at`/`updated_at`, objections with `ruled_by`/`ruled_at`/`ruling_note`. **Nothing anywhere deletes from any ballot table** (grepped `DELETE FROM ballot%` / `TRUNCATE` across `server/**`; the only hits are a comment and a lint regex).

Tallies are **not stored** — `talliesFor()` recomputes on every read by joining votes to the frozen weights, which is safe and is a true historical tally.

**The ballot↔amendment join already exists and is already correct.** Index 20790:
```
const proposalRef = `gm:${p.id}${p.hyphaRef ? ` ${p.hyphaRef}` : ""}${p.ballotId ? ` bal:${p.ballotId}` : ""}`.slice(0, 255);
```
plus `mechanics_proposals.ballot_id` from 0089. Both halves pinned by `server/loop.e2e.test.ts:5254-5255`.

### What is missing
1. **Nothing renders the revisit chain.** `ballotsFor()` returns it, unlimited, and no surface calls it. This is the biggest missing beat and it needs no column.
2. **`DecisionOutcome`'s "What changed" exists only in the session that closed the ballot** — `applied`/`held` come from the close response and are never re-fetched. Open a carried mechanics decision tomorrow and the card cannot tell you what it changed. The most interesting kind of passed proposal is the one whose consequence evaporates on reload.
3. `proposalRef` renders as dead monospace `gm:xyz bal:bal-123` in `GameMechanics.tsx`, not a link.
4. `ballot_votes.updated_at` is SELECTed by `votesFor()` and dropped in the map. *"Someone changed their mind during the debate"* is in the database and has never been shown.
5. The record list is flat, `ORDER BY created_at DESC LIMIT 100`, ungrouped. A four-year village silently loses its oldest decisions.
6. `withdrawn` is in the schema, the TS union and `DecisionOutcome`'s map, and **no route writes it.** A history renderer must not promise a state the engine cannot produce.

### DESIGN (zero schema)
1. **"The village has decided this before"** strip on `Decision.tsx`, from `ballotsFor(subjectType, subjectRef)`. Each prior attempt with its date and outcome sentence.
2. **Make "What changed" derivable on any load:** serve `applied` from the amendment ledger — `mechanics_changes WHERE proposal_ref LIKE '%bal:<id>%'` — instead of only from the close response. One read.
3. Parse the `bal:` segment already in `proposalRef` into a `/decisions/<id>` link in `GameMechanics.tsx`.
4. Add `changedAt` to `votesFor`'s mapped output so the roll can say *"changed their vote on the 14th."*
5. **Group the decided list by season/year from `closed_at`** — a chronicle, not a table. Raise the API cap and page it; a village must not lose its own founding decisions to a `LIMIT 100`.
6. Remove `withdrawn` from the renderable outcome map until something writes it, or make Lane G-A write it (a proposer withdrawing their own open ballot is a small, honest addition — the only `UPDATE ballots` today is the close at `ballots.ts:439`).

**R55:** grouping by time is developmental. No "X of Y decisions", no cadence target, no "your village decides less often than…".

### Harm metric
**A member can open a decision the village made two years ago and read the document it voted on, the sentence it closed with, who was asked, what each person said, what it changed, and every time the village has revisited it since.**

### Dependencies
None.

---

## 9. SUCCESSION AS ACHIEVEMENT — the second-cheapest win, plus one genuine bug

### What exists
`org_role_assignments` (0049) retains `holder_kind` (member | **documented**), `focus`, `note`, `season_id`, `term_ends_at`, `started_at`, `ended_at`, `ended_reason`, `granted_by`, and a generated `active_holder_key` whose whole purpose is that **one person may hold a seat, leave it, and hold it again years later without colliding with their own history.** Rows are **ended, never deleted** (`endSeating()`, `orgChart.ts:764`). Even anonymisation keeps `focus`, *"which is a fact about the seat."*

`orgRoleHistory(pool, orgRoleId)` (`orgChart.ts:279`) returns every seating DESC including ended ones, and `GET /api/org/roles/:id/history` (index 22655) serves `{name, kind, focus, startedAt, endedAt, endedReason}` behind **`map.viewPeople` — a member capability, not admin.**

**It has no client caller.** Grepping `client/src` returns nothing. The seat's own story is served, member-gated, and rendered by nobody.

### THE BUG
`POST /api/admin/org/roles/:id/holders` (index 23024) passes `userId, displayName, focus, note, seasonId, grantedBy` to `seatHolder()` — **and not `termEndsAt`**, even though `seatHolder` accepts it and inserts the column. The only writer in the tree is `orgDrafts.ts:491` copying an existing value on a revert. So `term_ends_at` is NULL everywhere, and **four downstream features are silently inert**: the amber `TermArc`, the `seat-term` calendar source, the "ends in N days" branch of `term-watch`, and the term branch of `isLapsed()`. Flag this to whoever owns succession regardless of what else ships.

### The register already exists in this codebase
Two precedents the spec cites rather than reinventing. `structuralLoad`'s note (`orgChart.ts:~560`): *"Carrying a lot is a load and not a fault, and a seat one person carries alone is the first candidate to grow into a circle"*, and for a founding village *"One person holds every seat. That is what a founding looks like, not a finding."* That is R55 written by someone who had not read R55. And `term-watch`'s body copy (index 4196) is the best-framed governance copy in the tree — *"You are still holding the seat and nothing has been taken away."* **Do not touch it.**

Its one gap: it is entirely second-person and entirely about the holder's obligation. Nothing anywhere says the thing R54/R55 want said — *the seat outlives its holder, and the village is proving it does not depend on one person.*

### DESIGN
1. **Render `/api/org/roles/:id/history` on the seat card.** *"This seat has been held by Ada, then Tomás, then Wren"*, with dates and each holder's `focus`. **Zero server work. This alone is the succession story.**
2. **Pass `termEndsAt` through the holders route** into `seatHolder`. One line; lights up four dead features.
3. **Rewrite the two deficit words.** `HolderCard.tsx:167` renders `· overdue` and `termWords()` (line 27) returns `"term ran out"`. These are the **only public deficit language in the succession model**, they sit on a shared surface attached to a named person, and the developmental vocabulary from `natural-interface.md` applies: a seat waiting to be re-chosen is not a failing seat. Replace with something like *"ready to be re-chosen."*
4. **The handover is the milestone, not the lapse.** An `ended_at` on one seating followed by a `started_at` on another for the same `org_role_id` **is** the story — *"the seat passed from Ada to Wren, and the village kept going."* Derivable from existing rows, zero storage, and it is the celebration-worthy event.
5. **Nothing revokes.** `isLapsed` is derived on every read and writes nothing, by design: *"A lapsed holding is still a holding."* No lane may add a revocation sweeper.

### Harm metric
**A member, without admin, can see every person who has held a seat and when it passed between them — and the surface never describes a lapsed term as a failure.**

### Dependencies
None. **R54 check:** every move here reads power toward members (the history route is `map.viewPeople`), and none entrenches the admin panel, which is where the whole succession model currently lives alone.

---

## 10. OBJECTION CREDIT — **the weakest of the ten as framed; reframe it to lineage**

### Say this plainly
"Credit" is a scoring word, this is the idea most likely to become a scoreboard, and its reach is narrower than it sounds: objections exist **only on consent-method ballots** (`fileObjection` refuses others with *"On a voting ballot, vote no and say why"*), and `serveBallot` returns them **only when `b.method === "consent"`** (index 21100). A village on `custom` or `majority` — the default is `custom` — will never see this feature at all.

### One trap that must be in the spec or a lane will invert the engine
`OBJECTION_RULINGS = ["integrated","concern","withdrawn"]`, and **`standingObjectionCount` counts `('open','integrated')` as BLOCKING** (`ballots.ts:245-251`). **`integrated` means "the objection stands and the proposal must change."** That is the inverse of the everyday reading. Only `concern` and `withdrawn` clear the path. A spec sentence saying "integrated objections have been dealt with" would invert the engine.

### What exists, and it is a lot
Objector identity, exact words, ruling, who ruled, **why** they ruled that way (a note is required — blank is refused, `ballots.ts:355`), both timestamps. One-shot and irreversible (`WHERE id=? AND status='open'`). All permanent, already served, with `mine` computed server-side. The hard part — attributed, explained, immutable — is done.

### What is missing
Exactly one edge, and the chain is currently broken end to end: an `integrated` objection makes the consent ballot fail → the close route's `else` sets the proposal to `failed` (terminal) → the amended proposal is a **brand-new row with a brand-new ballot and nothing pointing backwards**. `mechanics_proposals` has no `supersedes` column; `ballots` has none; `ballot_objections` has no forward reference. No query anywhere aggregates objections by member.

### DESIGN — lineage on the artifact, never a score on the person
- **One nullable column:** `ALTER TABLE ballot_objections ADD COLUMN led_to_ballot_id varchar(40) NULL;` Populated at the successor ballot's open, when the proposer names which objection they are answering (an optional field on the open call).
- **Surface it on the objection**, in `ObjectionPanel`: *"The proposal changed after this."* Attached to the objection, on the decision page, **never on a person's profile**.
- **Forbidden, explicitly:** any `GROUP BY user_id` on this column, any per-member count, any "most helpful objector", any badge.
- The rejected alternative: overloading `governance_supports` with `('objection_credit', …)`. It fits (objection ids ≈ 24 chars of 64) and needs no migration, but that table's own comment declares it the sensing/staging generalization, and overloading it makes the first honest reader wrong. **Take the column.**

### R54 note worth putting in the ruling
Objection ruling currently requires `proposal.decide`, which in the shipped ladder is scaffolding-adjacent. Making integrated objections visibly load-bearing makes the facilitator's judgment auditable by the people who were asked — and `proposal.decide` should be named as one of the powers that ought to cross over.

### Harm metric
**An objection that changed a proposal says so on its own page, and no surface anywhere counts objections per member.**

### Dependencies
Idea 7 (without the graceful path, the objection's successor is a hand-rebuilt proposal with no relationship to walk).

---

## INHERITED ITEM — FIRST-TIME MOMENTS (Scout C's idea 11)

Not one of the ten, but Scout C grounded it and it is nearly free, so fold it in as optional in Lane G-D. **Derive, do not store.** `cast_at` defaults to `CURRENT_TIMESTAMP` and `updated_at` is the separate `ON UPDATE` column, so re-voting does **not** move `cast_at` — first vote is `MIN(cast_at) FROM ballot_votes WHERE user_id=?`, exact. Same for first objection and first seat (`MIN(started_at)`, protected by `active_holder_key`). **"First proposal of any kind" is NOT derivable** — only mechanics has a proposal table; the other four wizard types have no unified home and `proposal_drafts` is deleted on publish. Render alongside stage crossings in `ProfileJourney` (the proven pattern). For the live moment, one `COUNT(*)` before the upsert in `castVote` returns `firstEver: true` and the client plays a **`whisper`, not a `moment`.** **Do not extend `EARNED_METRICS`** — a badge is a public artefact and a first vote is a private milestone; conflating them manufactures the cross-member comparison R55 forbids.

---

# THE HARD QUESTIONS

## (a) Can a power ever truly leave admin, given admin short-circuits the one gate?

**Today: no, not anywhere, in any form.** I verified the gate myself. `if (ctx.isAdmin) return true;` is the first line of `hasCapability`, and its own comment declares the order *is* the policy. `ctx.isAdmin` is set in exactly one place, `capabilityCtx` (index 2856), from `user.role === "admin" || "founder"` — a real column, not a parallel path. Nothing about the *capability* can influence it: `Capability` is a bare string literal type and `ALL_CAPABILITIES` is a flat array with no metadata. `stageUnlockOverrides` only parameterizes step 5, so `progression.unlock.<cap> = "none"` closes the stage path and leaves steps 1, 3 and 4 untouched. And admin outranks the roll: `buildElectorate` (index 21013) runs `hasCapability("ballot.vote", ctx)` over every sign-in-able member, so **every admin and founder is automatically in the electorate of every ballot**, with weight, whether or not they hold the key by any other path. There is no admin-abstain and no observer mode.

**The answer should be: yes, with a witness. Ship Scott B's option 2, and nothing stronger.**

```
1. if (ctx.isAdmin) {
     if (!isVillageHeld(cap, ctx.holdings)) return true;   // unchanged for everything not transferred
     if (ctx.override === true) { audit(); notifyVillage(); return true; }
     return false;                                          // fall through to 2-5
   }
```

- A code-level `TRANSFERABLE` map beside `ALL_CAPABILITIES` declares which keys may ever move (plumbing keys never can).
- One table, `capability_holding(capability, holder, moved_by_ballot_id, moved_at)`, written only by a passed transfer ballot (and, before Lane G-C ships, by one admin route so G-C has something to act on). **Read live per request**, in the same shape as `badgeGrantsFor` — one indexed join, no cache above it — because a store cache here would let a hand-written `UPDATE` go live invisibly (known trap: raw SQL bypasses store caches).
- **Break-glass:** an admin override on a village-held key requires an explicit `override: true` in the body, writes its own audit row naming the capability and the actor, and **notifies the village, not just the admins.**

**Why not stronger.** Genuinely irrevocable transfer (no route un-does it) means losing the ability to unwind a capture — and the platform ships to forks whose operator did not choose it and may not be able to pull a redeploy-with-migration. **The platform is also the custodian of the deployment for people who did not choose it**, so option 4 is refused on those grounds, not on paternalism.

**Why not weaker.** A ceiling with no witness is a speed bump: the admin who loses their own grant restores it in one write. The notify is what makes the transfer *feel* real to the village, and it is what makes each crossing a dateable, celebratable event with a row behind it — exactly what R55's milestone needs.

**One escalation for Rye, not for a lane:** should a founder-role user (as distinct from `admin`) be subject to the same fall-through? The gate treats them identically today. My recommendation is **yes, same rule, same break-glass** — R54 says the destination is the admins out of a job, and a founder exemption reintroduces the tier by another name. But it changes what a founder experiences in their own village and is a taste call.

## (b) Is a counterfactual computable from real data, or does it require inventing votes?

**Both, depending on which counterfactual.** Answered in full under idea 2. In short: re-reading a real closed ballot under different dials or under equal weights is **exact, from stored columns, with zero invention** — and the dial version is a pure function the browser already imports. Re-weighting a past token ballot as custom is **not computable** (historical balances were never stored). A decision nobody voted on is **not computable and we will not fake it** — there is no uncast-vote data anywhere, `governance_supports` is empty, and `mechanics_proposal_backers` is one-sided support. The founder's stated version of idea 2 is therefore refused and replaced by advisory-vote-then-decide, which produces the same reassurance out of real votes.

## (c) Does an advisory ballot need schema, and if so how little?

**None. Zero SQL, verified.** `subject_type` is `varchar(24) NOT NULL` with no CHECK and no enum (0089:20); the TypeScript type is `string`; `openBallot` never validates it; the executor is one `if` that skips unknown types with no half-state and no orphan; and the UI's `SUBJECT_NOUN[…] ?? "Decision"` fallback already renders it. What it costs is **one route (~40 lines), four array entries in lockstep, one explicit executor entry so the skip is intentional rather than incidental, and two copy edits** — of which the `OUTCOME.passed.law` fix is mandatory, because otherwise an advisory pass tells the village it is law.

---

# WHAT NOT TO BUILD

Every item here is tempting, and several are one careless afternoon from shipping.

1. **Handover rendered as a fraction, percentage, progress bar, or `MoonProgress mode="progress"`.** `mode="progress"` is a *completion* vocabulary with an implied 100%; `value={2/12}` is a 17% readout of a village's life. `VoteResult.tsx`'s header already refuses the moon for this exact reason — *"Neither of these is a completion display. Each is a value read against a THRESHOLD, and the threshold is the information"* — and the argument transfers verbatim. If the moon appears at all it is **one power = one moon at full**, or `mode="lunation"`, never a fraction of a target.
2. **Any cross-village comparison.** No "villages like yours", no median time to handover, no percentile, no network-wide anything. R55: *NO cross-village ranking ever.*
3. **A readiness score, governance-health index, or maturity composite.** Any single number that summarises a village's governance is a scorecard regardless of what it is called.
4. **A phase label derived from a count.** Seed/sprout/sapling/rooted tree may describe *one power's* journey. A village's phase computed from how many powers it holds is percentage-incomplete with nicer nouns.
5. **Countdowns and nudges.** No "your village has not held a vote in N days", no "you could hold this power by X", no recurring quorum reminder. The re-open path (idea 7) must **inherit `ballot-watch`'s discipline and must not spawn a new job**. `ballot-watch` never pings someone who already voted; anything new obeys the same rule.
6. **Per-member participation stats.** No "you voted in 3 of 11", no turnout-per-member, no objection leaderboard, no most-helpful-objector. `TurnoutCard` is the one sanctioned village-level aggregate and it works because it is an average of *actual* participation with no denominator anyone can feel behind on, and it renders nothing when there are no closed votes. Copy that shape or build nothing.
7. **Extending `EARNED_METRICS` with a governance metric.** Badges are public artefacts; a first vote is private.
8. **A simulated counterfactual.** See (b).
9. **A transfer proposal an admin can open.** See idea 5, Ruling 1.
10. **Auto-revocation of a lapsed seat, and the words "overdue" / "term ran out."** `isLapsed` writes nothing by design.
11. **Auto-closing a ballot.** `ballot-watch` nudges and **never closes**. Closing is a human act, on purpose, and no lane may make it a job.
12. **Rendering `withdrawn` as an outcome** until something writes it.
13. **Widening the `moment` celebration ration beyond one addition.** The doc's list is exhaustive — a stage advance, a quest consented, a ballot carrying, a need delivered — and its argument is *"a celebration on every action becomes wallpaper within a session, and once it is wallpaper the rare event has nothing left to say with."* **This spec adds exactly one: a power crossing to the village.** That addition must be made **explicitly, as an argued edit to `docs/modules/natural-interface.md` in Lane G-C**, never implicitly by a component reaching for `intensity="moment"`. An advisory pass is a `whisper`. A first vote is a `whisper`. A seat passing between holders is a `whisper`.

---

# THE LANE SPLIT

Five lanes. **Strictly ordered by dependency.** Two shared files (`client/src/components/governance/wizardConfig.ts`, `server/lib/proposalDrafts.ts`) are touched by two lanes each; the ordering rule below is what keeps them from colliding.

**Migration numbers: this spec needs THREE. Placeholders `NNNN-A`, `NNNN-B`, `NNNN-E`. The coordinator allocates them at brief time, together, in one pass — numbers are held across ~8 worktrees, on remote refs, on local refs invisible to other worktrees, and as untracked files on disk, each invisible to the other two. `ls drizzle/` lies. Two lanes collided on 0090 today because each scanned correctly and neither could see the other. No lane may pick its own number, and no lane may renumber or rename a shipped migration — the ledger keys on filename, so a renumber replays the file and an `ADD COLUMN` then bricks boot.**

---

### LANE G-A — "The village asks itself"
**Ideas 1, 2, 6, 7. Depends on: nothing. Migrations: 1 (`NNNN-A`).**

**Owns:**
- `server/lib/ballots.ts`
- `shared/governanceEngine.ts`
- **new** `server/lib/ballotExecutors.ts` (extracts the executor switch from index 21479 into a named dispatch map; every later lane adds an entry here rather than another `if`)
- `server/lib/proposalDrafts.ts` (`WIZARD_TYPES` + `CONDUCTABLE_TYPES`)
- `server/index.ts` **governance block only, index 20986–21780** — no edits outside it
- `client/src/components/governance/wizardConfig.ts` (adds `advisory`)
- `client/src/components/governance/DecisionOutcome.tsx`, `CloseBeat.tsx`
- **new** `client/src/components/governance/WhatIfPanel.tsx`
- `drizzle/NNNN-A_awaiting_quorum.sql` (one `ALTER … MODIFY` on `mechanics_proposals.status`)

**Harm metrics:** (1) A village can hold a vote that binds nobody and no surface calls it law. (2) A proposal too few people answered is still there tomorrow without re-authoring. (3) No number in the product is presented as a vote that was not cast. (4) A ballot cannot reach quorum on one person's weight in a village that set a head floor.

**Gates:** `ballots.test.ts` including the existing snapshot-law test (`ballots.test.ts:140`) unmodified and green; a new test asserting a closed advisory ballot leaves every subject table byte-identical; a re-open e2e asserting `mechanics_proposal_backers` is unchanged; `wizardConfig.test.ts`; `pnpm check` **plus** `tsconfig.tests.json` run **COLD** (the incremental cache lies); the loop e2e run against a freshly **built** `dist/index.js`, unfiltered (never `-t`).

---

### LANE G-B — "The gate names its holder"
**Ideas 3, 4, plus task 30's badge-edit gap. Depends on: nothing, but is the substrate for G-C. Migrations: 1 (`NNNN-B`).**

**Owns:**
- `shared/capabilities.ts` (new keys, `TRANSFERABLE` map, the gate's fall-through)
- `shared/draftKinds.ts` (consequence sentences for the new keys — note the local copy is STALE; committing it wholesale deletes two of main's entries, so stage by hunk)
- **new** `server/lib/capabilityHolding.ts`, **new** `server/lib/capabilityRegistry.ts`
- `server/lib/badges.ts` (the notify + escalation on definition edit)
- `server/index.ts` **admin block and `capabilityCtx` only** — must not touch 20986–21780
- `client/src/pages/Admin.tsx`
- `drizzle/NNNN-B_capability_holding.sql`

**Harm metrics:** (1) A village can move a named power onto a role and the holder acts without an admin password. (2) An admin acting on a village-held power leaves a record the village itself can see. (3) Editing a badge definition that holders answer to tells those holders. (4) A member can read which powers exist and who holds each, in sentences, with no number on the page.

**Gates:** the existing "admin outranks everything, including a deny" test must be **updated, not deleted**, and its replacement must assert the new order explicitly for both a transferred and an untransferred key; a test that the break-glass writes both the audit row and the village notification; a snapshot test that the powers page contains no `%` and no `N of M`; a test that `dial.set` refuses founder-ring keys; **and the break-glass must ship in the same commit as the gate change** — a gate that can lock an operator out of a live village must never exist without its escape hatch, not even for one commit.

---

### LANE G-C — "The village asks to hold this"
**Idea 5. Depends on: G-A merged (executor map, wizard entry) AND G-B merged (`capability_holding`, the gate). Migrations: 0.**

**Owns:**
- one entry in `server/lib/ballotExecutors.ts`
- one entry each in `wizardConfig.ts`, `WIZARD_TYPES`, `CONDUCTABLE_TYPES` — **rebased onto G-A's, staged hunk-by-hunk, never `git add .`**
- `POST /api/governance/power-transfers` in the governance block of `server/index.ts` (G-A has merged by then; the block is free)
- **new** `client/src/components/governance/TransferCeremony.tsx`
- `docs/modules/natural-interface.md` — the argued one-line addition to the `moment` ration

**Harm metric:** A power crosses to the village by a vote the whole electorate held, and that crossing has a date, an author, an outcome sentence and a permanent row.

**Gates:** a test that the route refuses an actor whose only path to `proposal.open` is `isAdmin`; a test that `badge_grant`'s refusal list blocks `ballot.vote` while the transfer type permits it; a test that a passed transfer writes exactly one `capability_holding` row and is idempotent on double close; the bundle budget (`MAX_MAIN_JS_KB` 700, `MAX_TOTAL_DIST_KB` 6600 — recent builds sit near the total ceiling, and no local `pnpm test` reproduces this gate).

---

### LANE G-D — "The record and the seat"
**Ideas 8, 9, and the optional first-time moments. Depends on: nothing. Runs in parallel with G-A/G-B. Migrations: 0.**

**Owns:**
- `client/src/pages/Decisions.tsx`, `client/src/pages/Decision.tsx`, `client/src/pages/GameMechanics.tsx`, `client/src/pages/Roles.tsx`
- `client/src/components/power/**` (`HolderCard.tsx`, `TermMarkers.tsx`)
- `client/src/components/ProfileJourney.tsx`
- `server/lib/orgChart.ts`
- `server/index.ts` **org/seat region only, index ~22466–23060**, and the `/api/game/progression` handler

**Boundary note:** the `votesFor` `changedAt` mapping lives in `server/lib/ballots.ts`, which **G-A owns**. G-A ships that one-line map addition on G-D's behalf; G-D consumes it.

**Harm metrics:** (1) A member without admin can see every person who has held a seat and when it passed between them. (2) A passed mechanics decision still shows what it changed a year later. (3) No succession surface describes a lapsed term as a failure.

**Gates:** a test that `POST /api/admin/org/roles/:id/holders` now persists `term_ends_at` (this is a real bug fix, and four dead features light up with it); a grep-style test that the strings "overdue" and "term ran out" no longer appear in `client/src/components/power/**`; a test that "What changed" renders on a cold load of a closed mechanics ballot; the brand ratchet (red there is baseline drift against committed client pages, **never clear it with `--update-baseline`**).

---

### LANE G-E — "Lineage, not credit"
**Idea 10. Depends on: G-A merged (the graceful path is what gives a successor something to point back to). Migrations: 1 (`NNNN-E`).**

**Owns:**
- `drizzle/NNNN-E_objection_lineage.sql`
- the objection routes inside the governance block of `server/index.ts` (free after G-A)
- `client/src/components/governance/ObjectionPanel.tsx`

**Harm metric:** An objection that changed a proposal says so on its own page, and no surface anywhere counts objections per member.

**Gates:** a test that `standingObjectionCount` still treats `integrated` as **blocking** (this is the inversion trap; a lane that "fixes" it breaks consent); a lint-style test that no query in `server/**` does `GROUP BY user_id` on `ballot_objections`; `pnpm check` cold.

---

# RISKS

**This is governance. A defect here is not a bug — it is a village's decision being wrong or lost.** Four things must never break, and each lane proves it did not.

### 1. The snapshot law
*"A vote is counted against the day it opened"* (`shared/constitution.ts:79`). Every dial, weight and roll member is frozen inside the open transaction and never re-read. It is enforced, not asserted: `evaluateBallot`, `unityPctOf` and `quorumPctOf` are pure and take every dial as an argument, and `ballots.test.ts:140` pins it.

**The lane that endangers it is G-A**, because idea 6 requires **swapping the order of `dialsForMethod` (index 21214) and `buildElectorate()` (index 21223)** inside the open path, and moving the token-mode guard at 21219-21222 with them. **Proof required:** `ballots.test.ts:140` runs unmodified and green, plus a new test that changes a dial and a weight between electorate-build and INSERT and asserts the stored snapshot matches the pre-change values.

**The lane that could quietly endanger it is G-C**, because a transfer landing mid-ballot could in principle change who is in an already-open roll. It cannot — the roll is a table, not a query — but the test must exist: open a ballot, pass a transfer that changes `ballot.vote`'s holder, close the first ballot, assert its roll and tallies are unchanged.

### 2. The append-only weight trail
`governance_weights` + `governance_weight_changes`. **Nothing in the codebase deletes from any ballot or weight table** — verified by grep against a present control. No lane may add a `DELETE`, a `TRUNCATE`, or a destructive `UPDATE` to `ballot_electorate`, `ballot_votes`, `ballot_objections` or `governance_weight_changes`. **Proof:** the existing lint regex in `resources.test.ts` extended to cover the governance tables, run in every lane's gate.

Related and already broken: `PUT /api/admin/governance/weights/:userId` and `/bulk` (index 21365, 21383) require a written reason and store it in the append-only trail, and **notify nobody.** Neither route contains a `notify` or `recordEvent` call. **Lane G-B fixes this alongside the badge-edit gap — the same defect class, the same fix.**

### 3. Closing as a human act
`ballot-watch` (index 4244) nudges hourly and **never closes**. `closeBallot` requires a human, requires a non-blank `outcome_note`, and is one guarded `UPDATE … WHERE id=? AND status='open'` — zero rows affected means someone else closed it and nothing executes. No lane may add auto-close, and no lane may make `outcome_note` optional. **Proof:** a test that a double-close executes exactly once and the second returns cleanly.

### 4. The gate change is the highest-blast-radius edit in this document
`hasCapability` is pure, shared, and runs on effectively every authenticated request on both client and server. A wrong fall-through locks a real operator out of a real village with no way back in through the UI. Mitigations, all mandatory: the break-glass ships in the same commit; the `TRANSFERABLE` map defaults every key to non-transferable so an unclassified key behaves exactly as today; `capability_holding` is empty on every existing deployment so the new branch is unreachable until a village acts; and a boot assertion in the shape of `assertBadgeInvariants` (`badges.ts:173`, called at index 4427) refuses to serve if the holding table names a capability that is not in `TRANSFERABLE` — because a hand-written `UPDATE` is otherwise invisible.

### Environment risks every lane inherits
- **CI has two gates CLAUDE.md omits**, both BLOCKING and neither reproducible by a local `pnpm test`: the bundle budget (total dist 6 MB, and recent builds sit near it) and the dependency audit. The natural kit is all SVG drawn from arithmetic — no image, no font, no audio, no animation library — and everything new here follows.
- **`pnpm check` does not typecheck tests** (tsconfig excludes `**/*.test.ts`). `tsconfig.tests.json` is clean, so a red is yours — but run it **cold**.
- **A green local suite is a sample.** CI is MySQL 9.4; a local green is not a CI green for collation, and 7 migrations pin CHARSET while 35 inherit.
- **A hollow green** in a fresh worktree: no `.env` means the DB suites SKIP while the summary still says passed. **Read the skip count and the duration**, every time.
- **`pnpm build` can tick green while Node aborts on teardown and `dist/index.js` stays stale.** The loop e2e runs the built file. Look for `built @ <sha>`.

---

# SEQUENCING AGAINST TASK 30

Task 30 already carries three things that overlap this spec: **(i) making appointment-only capabilities votable, (ii) the handover surface itself, (iii) closing the silent badge-edit gap.** Fold, do not duplicate:

- **(i) → Lane G-C, not `badge_grant`.** This is the biggest change to task 30. Making appointment-only keys votable through `badge_grant` names *people*; through the transfer type it names a *power* and the whole electorate votes. Task 30 should route (i) into the transfer type, and `badge_grant` should keep the governance-key refusal — for the capture reason, not the enlargement reason. The founder's R54 ruling means the badge review's stated rationale needs rewriting in task 30's brief even though its conclusion survives.
- **(ii) → Lane G-B's `GET /api/governance/powers` + Lane G-D's rendering.** Task 30's handover surface must adopt the R55 constraints in §What Not To Build item 1 and idea 4's trap section verbatim: list of named powers with holders, no fraction, no total, no ordering by held-vs-not, identical layout at zero powers and at twelve.
- **(iii) → Lane G-B, with two amendments.** Use the **escalation-checkbox pattern** (`Admin.tsx:4377-4511` + `applyEscalationChoices`, index 12588) rather than the kind-change 409 flag: per-capability, in `CAPABILITY_CONSEQUENCE` sentences, **silence is refusal**. And ship the **notify** the kind-change pattern is also missing — dedupe-keyed per (badge edit, member), following the stable-key discipline stated at index 14690, not a `Date.now()` key. Two mitigating facts that lower this item's priority relative to (i) and (ii) but do not remove it: the shipped Admin UI never sends `capabilities` on PUT (`Admin.tsx:6562` sends only `{ active }`), and `PUT /api/admin/roles/:id` cannot rewrite role capabilities at all — so this is the *only* live silent-rewrite surface for granted power, reachable by API and by any future badge-edit screen.

**Two additions to task 30's ordering:**

1. **Lane G-A ships before task 30's handover surface.** A village that has never held a vote should be able to practise before a surface tells it what it could hold. Advisory-first is the whole shape of the trajectory the founder described, and it costs one route.
2. **Lane G-A's no-quorum fix is not a feature and should not wait for the handover work at all.** Today a proposal dies because too few neighbours were around that week, and the member re-authors from scratch. Ship it as soon as a migration number exists.

**Also fold in, as free riders on lanes already opened:** the `term_ends_at` bug (Lane G-D, one line, lights up four dead features), the two deficit words in `HolderCard.tsx` (Lane G-D), the weight-change routes that notify nobody (Lane G-B, same defect class as (iii)), and the unenforced variable ring on `PUT /api/admin/variables/:key` (Lane G-B, via `dial.set`).

**And one thing to stop pretending:** `CONDUCTABLE_TYPES` claims *"the review step refuses what is not in it."* It does not — `ProposalWizard.tsx`'s `publish()` (line 224) checks only `problems.length`, `continueDraft()` (188) restores a type without consulting `conductable`, and `draftProblem` validates against `WIZARD_TYPES` (all five). A `badge_grant` draft created by API and resumed reaches a live "Put it in front of the village" button that POSTs to a 404. Not exploitable today because the card is disabled — but the comment is ahead of the code, and Lane G-A owns that file. Make the comment true.
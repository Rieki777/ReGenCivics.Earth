# Lane G-D — "The record and the seat"

**Read `../BUILD_HOUSE_RULES.md` first. Both files bind.**

Worktree: `C:/Users/taren/Desktop/Amora/wt-r6-gd`, branch `wt/r6-gd`, cut from `origin/main` at
`b5bed01`, deps installed, `.env` present. **Migrations: none. Do not take a number.**

**Your source spec is `docs/integration-program/round5/HANDOVER_SPEC_2026-08-22.md` in the hub
(`C:/Users/taren/Downloads/regen-integration`). Read ideas 8 and 9 in full, the inherited item on
first-time moments, the LANE G-D section, and the RISKS section. Read the whole spec, not only those
parts.** It was adopted at `d533308`. **Every line number in it is certainly wrong** — it was written
against a tree twenty-nine PRs ago. Anchor by content.

G-A, G-B and G-C are built and merged (PRs #65/#71/#76, #75, #83). G-D depends on nothing and was
never dispatched.

---

## 1 · The three harm metrics. These are the objective

1. **A member without admin can see every person who has held a seat and when it passed between
   them.**
2. **A passed mechanics decision still shows what it changed a year later**, on a cold load, in a
   fresh session.
3. **No succession surface describes a lapsed term as a failure.**

## 2 · What the spec says is there, and what you must verify first

The spec's central claim, which makes most of this nearly free: **the data is all retained and
already served, and nothing renders it.**

- `orgRoleHistory(pool, orgRoleId)` in `server/lib/orgChart.ts` returns every seating including
  ended ones, and `GET /api/org/roles/:id/history` serves `{name, kind, focus, startedAt, endedAt,
  endedReason}` **behind `map.viewPeople`, which is a member capability rather than an admin one.**
  The spec says it has **no client caller anywhere**. **Verify that with a control in the same
  command** (`git grep` matches nothing on a leading slash, so search `api/org/roles`, and prove the
  negative against a string you know is present).
- **THE BUG:** `POST /api/admin/org/roles/:id/holders` passes `userId, displayName, focus, note,
  seasonId, grantedBy` to `seatHolder()` **and not `termEndsAt`**, even though `seatHolder` accepts
  it and inserts the column. So `term_ends_at` is NULL everywhere and **four features are silently
  inert**: the amber `TermArc`, the `seat-term` calendar source, the "ends in N days" branch of
  `term-watch`, and the term branch of `isLapsed()`. **One line. Verify the claim, then fix it, and
  check all four features actually light up rather than asserting that they do.**
- Ballot history: every column survives close and nothing is nulled or deleted. `doc_markdown` holds
  the whole proposal text frozen at open; `outcome_note` is required on close; the frozen
  `ballot_electorate` is kept; votes carry reasons and both timestamps. Tallies are recomputed on
  read by `talliesFor()`, which is a true historical tally.
- The ballot-to-amendment join already exists and is already correct:
  `` proposalRef = `gm:${p.id}...${p.ballotId ? ` bal:${p.ballotId}` : ""}` `` plus
  `mechanics_proposals.ballot_id`.

## 3 · What to build

**Idea 8, decision archaeology. Zero schema.**

1. **"The village has decided this before"** on the decision page, from
   `ballotsFor(subjectType, subjectRef)`, which already returns the chain and which no surface
   calls. Each prior attempt with its date and its outcome sentence. **This is the biggest missing
   beat in the spec and it needs no column.**
2. **Make "What changed" derivable on any load.** Today `applied`/`held` come from the close
   response and are never re-fetched, so **open a carried mechanics decision tomorrow and the card
   cannot tell you what it changed.** Serve `applied` from the amendment ledger
   (`mechanics_changes WHERE proposal_ref LIKE '%bal:<id>%'`) instead of only from the close
   response. One read.
3. **Parse the `bal:` segment already inside `proposalRef` into a `/decisions/<id>` link** in
   `GameMechanics.tsx`. Today it renders as dead monospace.
4. **Add `changedAt` to `votesFor`'s mapped output** so the roll can say "changed their vote on the
   14th". `ballot_votes.updated_at` is already SELECTed and dropped in the map. **The spec says G-A
   would ship this one-line map addition on your behalf; G-A has merged, so check whether it did.
   If it did not, it is yours** — `server/lib/ballots.ts` is free now that G-A has landed.
5. **Group the decided list by season or year from `closed_at`** — a chronicle rather than a table.
   The list is `ORDER BY created_at DESC LIMIT 100` today, so **a four-year village silently loses
   its oldest decisions.** Raise the API cap and page it.
6. **`withdrawn` is in the schema, the TS union and `DecisionOutcome`'s map, and the spec says no
   route writes it.** G-A may have changed that (PR #65 shipped "a vote can be called off"). **Check
   before you act.** If nothing writes it, remove it from the renderable outcome map: **a history
   renderer must not promise a state the engine cannot produce.** If G-A now writes it, leave it and
   say so.

**Idea 9, succession.**

7. **Render `/api/org/roles/:id/history` on the seat card.** "This seat has been held by Ada, then
   Tomás, then Wren", with dates and each holder's `focus`. **Zero server work. This alone is the
   succession story.**
8. **The `termEndsAt` bug in §2.** One line, four features.
9. **Rewrite the two deficit words.** `HolderCard.tsx` renders `· overdue` and `termWords()` returns
   `"term ran out"`. These are **the only public deficit language in the succession model**, they sit
   on a shared surface attached to a named person, and the developmental vocabulary in
   `docs/modules/natural-interface.md` applies. A seat waiting to be re-chosen is not a failing seat.
10. **The handover is the milestone, not the lapse.** An `ended_at` on one seating followed by a
    `started_at` on another for the same `org_role_id` **is** the story. Derivable from existing
    rows, zero storage. Per R52 this is a **`whisper`**, not a `moment`: the only addition to the
    moment ration this program has authorised is a power crossing to the village.

**Optional, only if the rest is done and green — first-time moments.**

11. **Derive, do not store.** `cast_at` defaults to `CURRENT_TIMESTAMP` and `updated_at` is the
    separate `ON UPDATE` column, so re-voting does **not** move `cast_at`: first vote is
    `MIN(cast_at) FROM ballot_votes WHERE user_id=?`, exact. Same for first objection and first seat
    (`MIN(started_at)`). **"First proposal of any kind" is NOT derivable** — only mechanics has a
    proposal table. Render alongside stage crossings in `ProfileJourney`. For the live moment, one
    `COUNT(*)` before the upsert in `castVote` returns `firstEver: true` and the client plays a
    **`whisper`**. **Do not extend `EARNED_METRICS`**: a badge is a public artefact and a first vote
    is a private milestone, and conflating them manufactures the cross-member comparison R55 forbids.

## 4 · Two refusals the spec makes, which are design and not gaps

- **Nothing revokes.** `isLapsed` is derived on every read and writes nothing, deliberately: *"A
  lapsed holding is still a holding."* **No revocation sweeper. Do not add one.**
- **`term-watch`'s body copy is the best-framed governance copy in the tree** — *"You are still
  holding the seat and nothing has been taken away."* **Do not touch it.**

And one register the spec cites rather than reinventing: `structuralLoad`'s note in `orgChart.ts`,
*"Carrying a lot is a load and not a fault, and a seat one person carries alone is the first
candidate to grow into a circle"*, and for a founding village *"One person holds every seat. That is
what a founding looks like, not a finding."* **That is R55 written by someone who had not read R55.
Match that voice.**

## 5 · Your zone

**Yours:**
- `client/src/pages/Decisions.tsx`, `Decision.tsx`, `GameMechanics.tsx`, `Roles.tsx`
- `client/src/components/power/**` (`HolderCard.tsx`, `TermMarkers.tsx`)
- `client/src/components/ProfileJourney.tsx`
- `server/lib/orgChart.ts`, and `server/lib/ballots.ts` (free since G-A merged)
- `server/index.ts`: the **org/seat region** (anchor from `app.get("/api/org/roles/:id/history"`
  through `app.post("/api/admin/org/seatings/:id/forget"`), the `/api/game/progression` handler,
  and `GET /api/governance/ballots/:id` — **and nothing else in the governance block.**

**NOT yours. Two other lanes are inside `server/index.ts` right now:**
- **Lane G-E owns the objection routes and the mechanics open-ballot handler**: everything from the
  anchor `app.post("/api/governance/ballots/:id/objections"` through the ruling route, plus
  `app.post("/api/governance/mechanics/:id/open-ballot"`. **Do not edit those hunks.**
- Lane INVESTOR owns the investor region (`/api/admin/investor-docs` through
  `/api/admin/investor-summary`) and the investor tab of `Admin.tsx`.
- `client/src/components/governance/ObjectionPanel.tsx` is G-E's.

If you need a hunk outside your zone, **send the coordinator a written request** rather than taking
it. A shared artifact cost this program an entire regeneration cycle once.

## 6 · Risks you must prove you did not break

**This is governance. A defect here is not a bug, it is a village's decision being wrong or lost.**

- **The snapshot law.** *"A vote is counted against the day it opened"* (`shared/constitution.ts`).
  Every dial, weight and roll member is frozen inside the open transaction and never re-read.
  `ballots.test.ts` pins it. **Run it unmodified and green**, and if you touch anything in the open
  or close path, add a test that changes a dial and a weight between electorate-build and INSERT and
  asserts the stored snapshot matches the pre-change values.
- **The append-only weight trail** and **closing as a human act** are guards protecting THE RECORD.
  R54 says guard the record, never the village's freedom to decide. Do not weaken either.

## 7 · Gates specific to this lane

Beyond the standard set:

- A test that `POST /api/admin/org/roles/:id/holders` **now persists `term_ends_at`**.
- A test that the strings **"overdue"** and **"term ran out"** no longer appear anywhere in
  `client/src/components/power/**`.
- A test that **"What changed" renders on a COLD load** of a closed mechanics ballot, in a session
  that did not close it.
- A test that the decided list does not lose a village's oldest decisions at 100 rows.
- The **brand ratchet**: red there is baseline drift against committed client pages. **Read `$?`,
  never the last line, and never clear it with `--update-baseline`.**
- **R55 check, and state it explicitly in your report:** at zero prior attempts, at zero holders and
  at zero decisions, does every surface you touched read as young rather than as failing? No
  fraction, no total, no "N of M", no countdown.

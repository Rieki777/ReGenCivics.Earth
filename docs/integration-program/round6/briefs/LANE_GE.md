# Lane G-E — "Lineage, not credit"

**Read `../BUILD_HOUSE_RULES.md` first. Both files bind.**

Worktree: `C:/Users/taren/Desktop/Amora/wt-r6-ge`, branch `wt/r6-ge`, cut from `origin/main` at
`b5bed01`, deps installed, `.env` present.
**Migration number allocated: `0102`.** Name it `drizzle/0102_objection_lineage.sql`. **Do not take
another number and never renumber** — the applied-migrations ledger keys on filename, so a renumber
re-runs the file.

**Your source spec is `docs/integration-program/round5/HANDOVER_SPEC_2026-08-22.md` in the hub
(`C:/Users/taren/Downloads/regen-integration`). Read idea 10 in full, the LANE G-E section, and the
RISKS section. Read the whole spec, not only those parts.** Adopted at `d533308`. **Every line number
in it is certainly wrong.** Anchor by content.

G-A has merged (PRs #65, #71, #76), which is this lane's stated dependency: the graceful no-quorum
path is what gives a successor proposal something to point back to.

---

## 1 · The objective, as a harm metric

**An objection that changed a proposal says so on its own page, and no surface anywhere counts
objections per member.**

## 2 · Read this before you write a line, because a lane that gets it wrong inverts the engine

`OBJECTION_RULINGS = ["integrated", "concern", "withdrawn"]`, and **`standingObjectionCount` counts
`('open','integrated')` as BLOCKING** (`server/lib/ballots.ts`).

**`integrated` means "the objection stands and the proposal must change."** That is the inverse of
the everyday English reading. Only `concern` and `withdrawn` clear the path. **A sentence anywhere
saying "integrated objections have been dealt with" would invert consent.** Verify this yourself
before building on it, and if the code has changed since the spec was written, say so.

## 3 · The reach of this feature is narrower than its name, and the spec says to say so plainly

Objections exist **only on consent-method ballots**. `fileObjection` refuses others with *"On a
voting ballot, vote no and say why"*, and `serveBallot` returns objections **only when
`b.method === "consent"`**. **A village on `custom` or `majority` will never see this feature at
all, and `custom` is the default.** Do not build anything whose value depends on every village
seeing it.

## 4 · What already exists, and it is most of the hard part

Objector identity, their exact words, the ruling, who ruled, **why** they ruled that way (a note is
required and blank is refused), and both timestamps. One-shot and irreversible
(`WHERE id=? AND status='open'`). All permanent, already served, with `mine` computed server-side.
**Attributed, explained and immutable is done.**

## 5 · What is missing: exactly one edge

The chain is broken end to end. An `integrated` objection makes the consent ballot fail, the close
route's `else` sets the proposal to `failed` which is terminal, and the amended proposal is **a brand
new row with a brand new ballot and nothing pointing backwards.** `mechanics_proposals` has no
`supersedes`, `ballots` has none, `ballot_objections` has no forward reference. **No query anywhere
aggregates objections by member, and none ever may.**

## 6 · The design

1. **One nullable column, in `0102`:**
   `ALTER TABLE ballot_objections ADD COLUMN led_to_ballot_id varchar(40) NULL;`
   plus the type in `server/db/schema.ts`.
2. **Populate it at the successor ballot's open**, when the proposer names which objection they are
   answering. An **optional** field on the open call. Optional is load-bearing: a proposer who does
   not name one must still be able to open.
3. **Surface it on the objection** in `ObjectionPanel`: *"The proposal changed after this."*
   Attached to the objection, on the decision page, **never on a person's profile.**
4. **Forbidden, explicitly, and a gate must enforce it:** any `GROUP BY user_id` on this column, any
   per-member count, any "most helpful objector", any badge. **"Credit" is a scoring word and this is
   the idea most likely to become a scoreboard.** R55 forbids the comparison it would manufacture.
5. **The rejected alternative, recorded so nobody rebuilds it:** overloading `governance_supports`
   with `('objection_credit', ...)`. It fits — objection ids are about 24 characters of 64 — and
   needs no migration. **It was turned down because that table's own comment declares it the
   sensing and staging generalization, and overloading it makes the first honest reader wrong.**
   Take the column. **Put this paragraph in the migration's header comment**: a rejected approach
   with its cost written down is worth as much as the thing that shipped.

## 7 · Your zone

**Yours:**
- `drizzle/0102_objection_lineage.sql` and the `ballotObjections` table in `server/db/schema.ts`
- `server/index.ts`: **the objection routes** (anchor from
  `app.post("/api/governance/ballots/:id/objections"` through the
  `.../objections/:objectionId/rule` handler) **and**
  `app.post("/api/governance/mechanics/:id/open-ballot"` (the optional "answers this objection"
  field on open). **Nothing else in `server/index.ts`.**
- `client/src/components/governance/ObjectionPanel.tsx`
- `server/lib/ballots.ts` **read-only** unless you find the successor link genuinely cannot be
  written without it, in which case tell the coordinator: **Lane G-D holds that file this round.**

**NOT yours. Two other lanes are inside `server/index.ts` right now:**
- **Lane G-D** owns `server/lib/ballots.ts`, `server/lib/orgChart.ts`, the org/seat region of
  `server/index.ts`, `/api/game/progression`, `GET /api/governance/ballots/:id`, and the client
  pages `Decisions.tsx`, `Decision.tsx`, `GameMechanics.tsx`, `Roles.tsx`, `ProfileJourney.tsx`,
  `components/power/**`. **G-D is rendering the decision page while you are changing what an
  objection says on it. Coordinate through the coordinator, never by editing each other's files.**
- **Lane INVESTOR** owns the investor region and the investor tab of `Admin.tsx`.

If you need a hunk outside your zone, send the coordinator a written request rather than taking it.

## 8 · Risks you must prove you did not break

**This is governance. A defect here is a village's decision being wrong or lost.**

- **`standingObjectionCount` must still treat `integrated` as BLOCKING.** This is the inversion trap
  in §2. **A test that pins it is a required gate**, because the next lane to read this code will
  read `integrated` as "resolved" and "fix" it.
- **The snapshot law.** *"A vote is counted against the day it opened."* You are touching the open
  path for the optional successor field. **Run `ballots.test.ts` unmodified and green**, and add a
  test that opening with the new field does not disturb the frozen dials, weights or roll.
- **One-shot and irreversible ruling.** `WHERE id=? AND status='open'` must stay.
- **A transfer landing mid-ballot cannot change an already-open roll**, because the roll is a table
  rather than a query. Not your change, but if you touch the open path, do not make it one.

## 9 · Gates specific to this lane

Beyond the standard set:

- A test that **`standingObjectionCount` still counts `integrated` as blocking**.
- A **lint-style test that no query in `server/**` does `GROUP BY user_id` on `ballot_objections`**,
  and that no client surface renders a per-member objection count. Write it so it goes red on a
  deliberate violation and green on the clean tree: **a gate whose first run catches a real
  violation is the standard, and a gate must be watched going red on the defect it was built for.**
- `pnpm check` cold.
- A test that a successor ballot opened **without** naming an objection still opens.
- **Verify the migration applies to a scratch schema and that the app boots on it**, then verify a
  second run of the runner is a no-op.

## 10 · One R54 note the spec asks to carry into the record

Objection ruling currently requires `proposal.decide`, which in the shipped ladder is
scaffolding-adjacent. Making integrated objections visibly load-bearing makes the facilitator's
judgment auditable by the people who were asked, and **`proposal.decide` should be named as one of
the powers that ought to cross over to the village.** You are not making that change; report whether
`proposal.decide` is currently transferable, so the coordinator can put it to the founder.

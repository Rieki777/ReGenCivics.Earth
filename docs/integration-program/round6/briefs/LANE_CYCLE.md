# Lane CYCLE — "one cycle, one name, and nothing falls out of the settlement"

**Read `../BUILD_HOUSE_RULES.md` first. Both files bind.**

Worktree: `C:/Users/taren/Desktop/Amora/wt-r6-cycle`, branch `wt/r6-cycle`, cut from `origin/main` at
`b5bed01`, deps installed, `.env` present.
**Migration number allocated: `0105`.** Only 0105. Never renumber.

This lane exists because QA-2 measured it. Read its report first:
`docs/integration-program/round6/qa/qa-2/REPORT_2026-08-29.md`, findings **QA2-01 and QA2-02**.

---

## 1 · The root cause, confirmed by the coordinator at `b5bed01`

**There are two cycle-id formatters, and they write different strings into the same `cycle_id`
column.**

- `server/lib/gratitude-cycles.ts` → `` `lunar-${String(cycleNumber).padStart(6, "0")}` `` → `lunar-000329`
- `server/lib/economy.ts` → `` `moon-${cycleBoundsFor(at).cycleNumber}` `` → `moon-329`

Both are the same cycle. Neither knows about the other. Two consequences were **measured, not
inferred**, by QA-2 against a local build at this SHA:

**QA2-01, the caps do not see each other.** The acknowledgement route's budget check filters on
`cycle_id = ?`, so it never sees the rows the other route wrote. One member spent the 30 Hearts
allowance to exhaustion; `GET /api/game/gratitude/me` then reported `spent: 0, remaining: 100`, and
100 more went through. **130 spent in one cycle against caps of 100 and 30.**

**QA2-02, the settlement cannot see half its own rows.** `settleCycle` only matches `lunar-*`, and
`parseCycleId` returns null for `moon-329`. Running the product's own settlement over the product's
own rows lost **39 of 140 units**, every settlement row read `receivedHearts: 0`, and a Hearts-only
cycle was never listed as due for closing.

**RE-VERIFY ALL OF THIS BEFORE YOU FIX IT.** Reproduce both, in your own scratch schema, and say what
you actually saw. A cause handed down is a hypothesis, and this one came through two hands.

## 2 · Objective, as a harm metric

**A member's spending is counted once against one allowance whatever door they came through, and a
settlement can see every unit the village earned in that cycle.**

## 3 · What to build, and the judgement I want from you

1. **One canonical cycle id.** `lunar-NNNNNN` is the older, zero-padded, sort-correct form and its
   own comment says the padding exists so it "sorts correctly", so it is the obvious survivor. **But
   check which format more rows actually carry before you choose**, and say why you chose.
2. **Normalise the existing rows in `0105`.** There are live rows in both formats. **A migration
   that rewrites identifiers is the most dangerous thing in this round**: write it so it is
   idempotent, so a second run is a no-op, and so it cannot collide two different cycles onto one
   id. State in the migration header what you checked to be sure the mapping is one to one.
3. **Make a second formatter impossible rather than merely absent.** One exported function, one
   caller path, and the other module imports it. **A fix that leaves two functions agreeing today is
   a fix that breaks again the first time somebody edits one of them.** If you can add a cheap gate
   or a test that fails when a second cycle-id literal appears, do.
4. **The settlement must fail loudly on an id it cannot parse**, never silently skip it. `parseCycleId`
   returning null and the row quietly vanishing from the settlement is the fallback-is-a-claim defect
   in its most expensive form: **the village's own economy was wrong and nothing said so.**
5. **Audit what else keys on `cycle_id`.** The coordinator found `cycle_id` referenced in
   `server/db/schema.ts`, `server/lib/badges.ts`, `server/lib/economy.ts`, `server/lib/health.ts` and
   `server/lib/library.ts` at minimum. **Every one of those is a reader that may have been half-blind
   for as long as the split has existed.** The list is a floor, not a ceiling. Report what you found
   and what you fixed as two numbers.

## 4 · What is NOT yours, and it is the interesting half

**Which cap should apply is the founder's decision, not yours.** Two live routes offer different
allowances (`/api/game/gratitude/send` at 100 scaled by stage counting SENDS, `/api/gratitude` at 30
flat counting GRATITUDE). **Do not pick one. Do not merge them. Do not change either number.**

Your job is that whichever policy he chooses is actually enforced, instead of being silently bypassed
by an id mismatch. **Make the two routes count against the same ledger truthfully**, and if that
means a member now meets a refusal they did not meet yesterday, that is the fix working. Say clearly
in your report what a member's experience becomes under today's numbers, so he can rule on it with
the real behaviour in front of him.

## 5 · Your zone

**Yours:**
- `server/lib/economy.ts`, `server/lib/gratitude-cycles.ts`
- `server/index.ts`: the gratitude and cycle block **only** — anchor from
  `app.post("/api/game/gratitude/send"` through `app.post("/api/admin/cycles/close"`, plus
  `app.get("/api/game/gratitude/flows"`.
- `drizzle/0105_*.sql` and the touched tables in `server/db/schema.ts`
- The readers in §3.5 **that you prove are affected**, hunk-local, no reformatting
- Tests in the existing gratitude and cycle suites

**NOT yours. Five other lanes are live:**
- **`/api/game/gratitude/flows` sits about 24 lines from `/api/game/progression`, which is Lane
  G-D's.** Take the `flows` handler and nothing below it. **Do not touch `/api/game/progression`.**
- **G-D also owns `server/lib/ballots.ts`, `server/lib/orgChart.ts`** and the org/seat region.
- **G-E** owns the objection routes and `mechanics/:id/open-ballot`.
- **INVESTOR** owns `/api/admin/investor-docs` through `/api/admin/investor-summary`.
- **MINT** owns the admin tokens block (`app.get("/api/admin/tokens"` through
  `app.post("/api/admin/tokens/:slug/mint"`) and `meterUserId` in `server/index.ts`.
  **If your fix needs the mint path, ask me. Do not take it.**

## 6 · Gates specific to this lane

Beyond the standard set, and the baseline in the house rules §2:

- **A test that reproduces the 130-against-100-and-30 overspend and then shows it refused.** Write it
  first, watch it fail at `b5bed01`, then fix.
- **A test that a settlement over rows written by BOTH routes counts every unit.** QA-2's number was
  39 of 140 invisible; your test should be able to state a number.
- **A test that an unparseable cycle id is a loud failure**, not a skipped row.
- **The migration applied to a scratch schema, the app booted on it, and the runner run a second
  time proving it is a no-op.**
- `check-repo-payloads.mjs` if you touch any insert.

## 7 · Report additionally

- **How many rows exist in each format on production**, read-only, counts only. The founder needs to
  know the size of what was miscounted.
- **Whether any member's balance is wrong today** as a result, and by how much, or that you could not
  determine it and why.
- The two numbers from §3.5: readers examined, readers affected.

# Gratitude System Audit — 2026-07-28

Audited against the stated intent: *every lunar cycle a player's balance resets to what they
can give away; unsent gratitude is lost, not banked; gratitude is a signal that decides who
gets a share of the community currency, not a currency itself.*

**Verdict: the model you described is built, and the lunar implementation matches it closely.
It is not running in production, and an older system that contradicts it is still live
alongside it.**

Files audited: `server/lib/gratitude-cycles.ts`, `server/routes/gratitude.ts`,
`server/routes/game.ts`, `server/routes/batchJobs.ts`, `server/lib/citizenship.ts`,
`server/_core/index.ts`, `drizzle/schema.ts`, `GRATITUDE_SYSTEM_SPEC.md`,
`server/gratitudeCycles.test.ts`, and the four client gratitude components.

---

## How it actually works today

There is no stored gratitude balance anywhere in the lunar model. Nothing is debited when you
send. The sequence is:

1. **Budget.** On your first acknowledgment of a cycle, `getOrCreateCycleBudget` writes one row
   to `gratitude_cycle_budgets` snapshotting your tier, multiplier and streak:
   `effectiveBudget = base(100) × tierMultiplier(1/2/3/5) × (1 + streakBonus ≤ 0.30)`.
2. **Sending.** `gratitude.send` inserts a row in `gratitudeLog` with `weight = NULL`. No tokens
   move. One acknowledgment per person per cycle, enforced by `uniq_ack_per_cycle`.
3. **Close.** `closeDueCycles` splits your budget equally across the unique people you
   acknowledged and stamps that share onto each row as `weight`.
4. **Distribution.** Each recipient's summed weight is their proportional claim on a fixed
   `poolPerCycle` (10,000 $ReGen). That, and only that, hits `user_token_ledger`.

So against your three criteria:

| Your intent | Reality |
|---|---|
| Balance resets every lunar cycle | **Yes.** Budgets are per-cycle rows, recomputed from tier and streak, never carried. |
| Use it or lose it | **Partly.** Send to nobody and the whole budget evaporates. But you cannot *partially* lose it: acknowledge one person and your entire budget is deployed to them. It is all-or-nothing, not a spend-down. |
| A signal, not a currency | **Yes, in the lunar model.** Gratitude never enters the ledger. Only the end-of-cycle $ReGen distribution does. **No, in the old model**, which is still live (Fix 2). |

---

## Fix 1 — Cycles never close in production (Critical)

**Status:** HUMAN STEP REQUIRED after code fix

**Symptom:** No $ReGen ever reaches recipients. `gratitude_cycles` rows accumulate with
`status = 'open'`, `weight` stays NULL on every `gratitudeLog` row, `gratitude_distributions`
stays empty.

**Root cause:** `closeDueCycles` has exactly two callers, and neither runs on a schedule:

- `batchJobs.runNightly` — an `adminProcedure`, reachable only by a human clicking in
  `AdminCitizenshipTiers.tsx`.
- `gratitude.closeCycles` — an `adminProcedure` with **no client caller at all**.

The Railway cron endpoint `/api/cron/nightly-batch` (`server/_core/index.ts:1106`) runs only
four steps: citizenship tiers, event status sweep, crowdpool claim expiry, partner hydration.
It does not import or call `closeDueCycles`. The comment above it at line 1102 claims it "runs
the same steps as the admin-triggered runNightly procedure" — that is not true, and the drift
is what hides the bug.

**Fix:** Add the gratitude step to the cron endpoint. Better: give it its own hourly endpoint so
a cycle closes near its new moon instead of up to 24 hours late.

**Files:** `server/_core/index.ts`

---

## Fix 2 — Two gratitude systems are live at once (High)

**Status:** CODED (needs decision + removal)

**Symptom:** Depending on which button a player presses, gratitude behaves in two incompatible
ways.

**Root cause:** The 2026-07-03 economy cutover (noted in the `server/routes/gratitude.ts`
header) added the lunar model but never removed the seasonal one.

| | New (lunar) | Old (seasonal) |
|---|---|---|
| Endpoint | `trpc.gratitude.send` | `trpc.game.sendGratitude` |
| UI | `GratitudeButton`, `SendGratitudeModal` | `GratitudeDrawer`, mounted in `bounty/RecentlyCompleted.tsx` |
| Tables | `gratitudeLog`, `gratitude_cycles`, `gratitude_cycle_budgets` | `gratitude_transactions`, `gratitude_budgets` |
| Period | Lunar cycle | Season |
| Model | Free acknowledgment, weight at close | **Spend-down**: `amount` per send, `gratitude_budgets.spent += amount` |
| Payout | Proportional share of a fixed pool at close | **Immediate +5 $ReGen to the recipient, per send** |

The old path is a spend-down transfer that mints tokens on every send. It is the exact opposite
of "a signal, not a currency", and it is reachable today from the bounty board.

**Fix:** Delete `game.sendGratitude`, swap `GratitudeDrawer` for `GratitudeButton` with
`sourceType: "bounty"`, and archive the two legacy tables.

**Files:** `server/routes/game.ts`, `client/src/components/game/GratitudeDrawer.tsx`,
`client/src/components/bounty/RecentlyCompleted.tsx`

---

## Fix 3 — Tier promotion reads the dead table, so budgets silently flatten (High)

**Status:** CODED (needs repoint)

**Symptom:** Over time every player stays Explorer, so every budget stays at 100 and the
1× / 2× / 3× / 5× tier design collapses to flat.

**Root cause:** `server/lib/citizenship.ts:48-49` derives promotion inputs from the **old**
table:

```sql
(SELECT COUNT(*) FROM gratitude_transactions gt WHERE gt.senderId = pp.userId)   as gratitudeSent,
(SELECT COUNT(*) FROM gratitude_transactions gt WHERE gt.receiverId = pp.userId) as gratitudeReceived
```

Steward requires `gratitudeReceived >= 10`; Co-Creator requires `gratitudeSent >= 5`. New-model
acknowledgments land in `gratitudeLog`, which citizenship never reads. The tier then feeds
straight back into `getOrCreateCycleBudget` as the budget multiplier. So the moment the old path
stops being used, the new model's whole tier ladder quietly dies.

This one is nasty because nothing errors. It just gets flatter.

**Fix:** Repoint both subqueries at `gratitudeLog` (sent) and `gratitude_distributions` or
`gratitudeLog` (received).

**Files:** `server/lib/citizenship.ts`

---

## Fix 4 — A nightly step does dead work against a missing table (Medium)

**Status:** CODED (delete or repoint)

**Root cause:** `updateGratitudeMultipliers` (`batchJobs.ts:263`, Step 5 of `runNightly`) reads
`gratitude_transactions` and writes `gratitude.multiplier.*` at **1.0 / 1.2 / 1.5 / 2.0**. The
cycle engine explicitly does not read that key — `gratitude-cycles.ts` uses
`gratitude.budget_multiplier.*` at 1 / 2 / 3 / 5, with a comment warning they are different
things. `gratitude_transactions` is not in `drizzle/schema.ts` and has no migration, so this
step is either a no-op or throws into the swallowed `errors[]` array every run.

**Fix:** Delete the step, or repoint it if the trust-graph bonus is still wanted.

---

## Fix 5 — The spec documents variable names the code does not read (Medium)

**Status:** CODED (doc + seed reconciliation)

| `GRATITUDE_SYSTEM_SPEC.md` says | Code actually reads | Effect |
|---|---|---|
| `gratitude.multiplier.explorer` … | `gratitude.budget_multiplier.*` | Admin edits the documented key, nothing changes |
| `gratitude.regen_distribution.pool_per_cycle` | `gratitude.pool_per_cycle` | Same |
| `claim_threshold = 333` | default `1000` | Docs understate the gate by 3× |

**Fix:** Update the spec to the canonical keys, seed them explicitly rather than relying on
code defaults.

---

## Fix 6 — "The sweet spot is 10" is mathematically false (Medium, and the most interesting one)

**Status:** DESIGN DECISION NEEDED

The spec says: *"Below 10, you're leaving impact on the table because unspent signals just
reset."* Under equal splitting that is not what happens.

Your total emitted weight is `effectiveBudget` whenever you acknowledge **at least one** person.
Recipient count changes *concentration*, never your total influence:

| Recipients | Each gets (300 budget) | Total emitted |
|---|---|---|
| 1 | 300 | 300 |
| 5 | 60 | 300 |
| 10 | 30 | 300 |
| 20 | 15 | 300 |

Acknowledging 5 people does not leave impact on the table — it concentrates it. The only real
consequence of missing 10 is losing the streak bonus (3% per cycle, max 30%). But the UI
returns `fullPowerRemaining` on every send, which teaches players the wrong model.

**This is also where your "use it or lose it" intent is not actually implemented.** There is no
partial loss anywhere in the system.

**Recommended fix — one line, and it makes the spec true:**

```ts
export function computePerPersonShare(effectiveBudget: number, uniqueRecipients: number): number {
  if (uniqueRecipients <= 0) return 0;                      // was: return effectiveBudget
  return effectiveBudget / Math.max(uniqueRecipients, FULL_POWER_THRESHOLD);
}
```

Now each of the first 10 acknowledgments carries the full per-person share, acknowledging fewer
than 10 genuinely forfeits the remainder, and past 10 the dilution story is unchanged. That is
literally "use it or lose it", and it gives the 10-person sweet spot real teeth.

Note the second change: `uniqueRecipients <= 0` currently returns the **whole budget**, which is
only ever used for a preview but is a live footgun if it is ever called on a real close.

---

## Fix 7 — No way to express intensity (Low, design)

One acknowledgment per person per cycle, split equally, means a player cannot say "Ana carried
the water system all month, Yara helped once." Consider letting people assign 1–3 weights per
person out of a fixed total, keeping the budget constant but letting shape vary.

---

## Fix 8 — The pool is capturable in a quiet cycle (Medium, economic)

`poolPerCycle` is a flat 10,000 $ReGen regardless of participation. Two colluding Sages who
acknowledge only each other in a low-activity cycle split the entire pool. Existing defences are
a 30-sends-per-hour spam cap and a self-send block — neither addresses collusion.

**Options:** scale the pool by participation (`pool × min(1, participants / target)`), cap any
single sender→recipient pair's contribution to one recipient's total, or damp reciprocal pairs
the way trust graphs do.

---

## Fix 9 — Floor remainder is silently burned (Low)

`computePoolShares` floors each credit so the pool is never over-minted (correct), but the
remainder is not carried. Over many cycles that is a slow leak out of the community budget.
Carry it into the next cycle's pool.

---

## Fix 10 — PLATFORM_DECK.html misrepresents the model (Low, my error)

The deck's ledger panel shows gratitude as a conserved double-entry transfer
(`Gratitude sent: Yara +12 / Ana −12`) and the hero preview shows a "38 of 60 sent" budget
meter. Both describe the **old** seasonal model. Under the real model gratitude never touches
the ledger; only the end-of-cycle $ReGen distribution does. I will correct the deck.

---

## Priority order

1. Fix 1 — nothing pays out until the close runs on a schedule.
2. Fix 3 — silent, compounding, and hard to notice later.
3. Fix 2 — two live models is the thing that will confuse players and your own team.
4. Fix 6 — decide the design before more people learn the wrong mental model.
5. Fixes 4, 5, 8, 9, 10 — cleanup and hardening.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Confirm whether `gratitude_transactions` and `gratitude_budgets` still exist and hold rows | Railway DB is unreachable from the Cowork VM | `SELECT COUNT(*) FROM gratitude_transactions; SELECT COUNT(*) FROM gratitude_budgets;` |
| 2 | Check how many cycles are stuck open | Same | `SELECT id, cycleNumber, status, endsAt FROM gratitude_cycles ORDER BY cycleNumber DESC LIMIT 10;` |
| 3 | Decide Fix 6 (keep equal-split, or adopt `max(n, 10)` use-it-or-lose-it) | Product decision, not a code decision | — |
| 4 | Decide Fix 8 (pool scaling vs pair caps vs leave as is) | Economic policy | — |
| 5 | Add the Railway cron job once the endpoint exists | Railway dashboard login | Railway → cron → `POST /api/cron/gratitude-cycles` with the `CRON_SECRET` bearer |
| 6 | Run the first close manually to clear the backlog | Admin session in the browser | Admin panel → Citizenship Tiers → Run Nightly Batch |
| 7 | `git add -A && git commit && git push` | Claude Code holds `.git/index.lock` on this mount | — |

### CLAUDE CODE — can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Add `closeDueCycles` to `/api/cron/nightly-batch` and add a dedicated `/api/cron/gratitude-cycles` hourly endpoint | READY TO CODE |
| 2 | Repoint `citizenship.ts` at `gratitudeLog` / `gratitude_distributions` | READY TO CODE |
| 3 | Delete `game.sendGratitude`, swap `GratitudeDrawer` for `GratitudeButton` | READY TO CODE |
| 4 | Delete or repoint `updateGratitudeMultipliers` | READY TO CODE |
| 5 | Reconcile `GRATITUDE_SYSTEM_SPEC.md` variable names and the 333 vs 1000 threshold | READY TO CODE |
| 6 | Implement Fix 6 once you decide, plus a unit test for the forfeit case | BLOCKED on decision 3 |
| 7 | Pool carry-forward for the floor remainder | READY TO CODE |
| 8 | Correct the gratitude panel in `PLATFORM_DECK.html` | READY TO CODE |
| 9 | Fix the false comment at `server/_core/index.ts:1102` | READY TO CODE |

### WAITING ON YOU before Claude Code can proceed

- Fix 6 implementation is blocked on your call between equal-split and `max(n, 10)`.
- Fix 8 implementation is blocked on your choice of anti-collusion mechanism.
- Any migration that archives `gratitude_transactions` / `gratitude_budgets` is blocked on
  item 1 above, since it depends on whether those tables hold data worth keeping.

# The Gratitude System — Full Overview

State as of 2026-07-28, after the audit fixes and the payout cap.
Migration: `drizzle/0223_gratitude_payout_cap.sql` (renumbered from 0219 on 2026-08-01 after
`0219_application_season.sql` landed on main first; the runner tracks by filename).

Companion documents: `GRATITUDE_AUDIT_2026-07-28.md` (what was broken),
`GRATITUDE_SYSTEM_SPEC.md` (the canonical spec, now reconciled with the code).

---

## 1. What gratitude is

Gratitude is a **signal**, not a currency. It has no balance you can hold, no way to buy it,
and it never appears in `user_token_ledger`. Its only job is to decide how a fixed pot of
community currency gets shared out at the end of each lunar cycle.

Three rules follow from that, and everything else is machinery:

1. **Everyone gets a fresh budget each lunar cycle.** It is computed from your tier and your
   streak, never carried over.
2. **Use it or lose it.** Whatever you do not give away is forfeited at the new moon.
3. **Receiving gratitude earns you $ReGen**, from a fixed pool, capped per person.

---

## 2. The cycle, end to end

### Step 1 — Your budget appears

The first time you acknowledge someone in a cycle, a row is written to
`gratitude_cycle_budgets` snapshotting your tier, multiplier and streak:

```
effectiveBudget = base_budget x tier_multiplier x (1 + streak_bonus)
```

| Tier | Multiplier | Budget (base 100) |
|---|---|---|
| Explorer | 1.0x | 100 |
| Co-Creator | 2.0x | 200 |
| Steward | 3.0x | 300 |
| Sage | 5.0x | 500 |

Streak adds 3% per consecutive cycle in which you reached the full-power threshold, capped at
30%. A Steward on a 10-cycle streak carries 390.

### Step 2 — You acknowledge people

A send is a row in `gratitudeLog` with a required message and `weight = NULL`. **No tokens
move.** One acknowledgment per person per cycle, enforced by `uniq_ack_per_cycle`; thanking
the same person twice does not add weight, it is refused.

Guards on the send path: no self-gratitude, no sends to system or team accounts, one
acknowledgment per source (you cannot thank the same forum post twice), and a 30-per-hour
ceiling to stop bots.

### Step 3 — The cycle closes

An hourly cron (`POST /api/cron/gratitude-cycles`) closes any cycle whose new moon has passed.
Your budget is divided and stamped onto each acknowledgment as its `weight`:

```
weight per person = effectiveBudget / max(uniqueRecipients, full_power_threshold)
```

**The divisor is the larger of the two numbers, and that is the whole use-it-or-lose-it rule.**
With a 300 budget and a threshold of 10:

| People you thanked | Each receives | You deployed | You forfeited |
|---|---|---|---|
| 0 | – | 0 | 300 |
| 1 | 30 | 30 | 270 |
| 5 | 30 | 150 | 150 |
| 10 | 30 | 300 | 0 |
| 20 | 15 | 300 | 0 |
| 30 | 10 | 300 | 0 |

Under 10 you lose the remainder. At 10 you deploy everything. Past 10 you still deploy
everything, spread thinner. There is now a real reason to reach the threshold and a real cost
to ignoring the system.

### Step 4 — The pool is distributed

Every recipient's weights are summed. Each takes a proportional cut of `pool_per_cycle`,
then two ceilings apply:

```
rawShare = (weightReceived / totalWeight) x pool_per_cycle
credited = min(floor(rawShare), max_payout_per_person)
```

Credits land in `user_token_ledger` as $ReGen with an idempotency key. `gratitude_distributions`
records one row per recipient per cycle, and `gratitude_cycles.distributedTotal` records what
the cycle actually minted.

**The pool is a ceiling on issuance, not a promise to issue.** Anything the cap or the flooring
holds back is never created and does not roll forward.

### Step 5 — Claiming

Accumulated $ReGen from gratitude shows on the Gratitude tab as a ring filling toward
`claim_threshold` (1000, aligned with the live `governance.claim_threshold_regen` gate). At the
threshold a player can make a formal claim on Hypha DAO to receive it on-chain.

---

## 3. The new payout cap

`gratitude.max_payout_per_person` (default **1000**) is the most $ReGen one person can be
credited from a single cycle, however much gratitude they received.

This is the answer to the collusion problem. Before it, the pool was distributed in full no
matter how few people took part, so two people acknowledging only each other in a quiet cycle
walked away with 5,000 each.

| Scenario | Pool | Cap | Actually minted |
|---|---|---|---|
| 2 people, acknowledging only each other | 10,000 | 1,000 | **2,000** |
| 1 whale + 2 others (90/5/5 weight) | 10,000 | 1,000 | **2,000** (whale capped from 9,000) |
| 20 active people, evenly spread | 10,000 | 1,000 | **10,000** (nobody hits the cap) |
| Any cycle | 10,000 | 0 (disabled) | up to 10,000 |

The freed amount is **not** redistributed to people under the cap. Capping a whale does not
enrich everyone else; it simply means the community currency was not issued that cycle. That
keeps the mechanism honest: the cap is a brake on issuance, not a redistribution lever.

Set the cap to 0 to disable it entirely. Like every other game variable it is editable in the
admin panel, visible on the Game Mechanics page, and governable by proposal.

---

## 4. Every game variable

| Key | Default | What it does |
|---|---|---|
| `gratitude.base_budget` | 100 | Points everyone starts a cycle with, before tier and streak |
| `gratitude.full_power_threshold` | 10 | The minimum divisor. Thank fewer people and the rest is forfeited |
| `gratitude.streak_bonus_per_cycle` | 0.03 | Budget bonus per consecutive full-power cycle |
| `gratitude.streak_bonus_max` | 0.30 | Ceiling on the streak bonus |
| `gratitude.budget_multiplier.explorer` | 1.0 | Tier multiplier on the budget |
| `gratitude.budget_multiplier.co_creator` | 2.0 | " |
| `gratitude.budget_multiplier.steward` | 3.0 | " |
| `gratitude.budget_multiplier.sage` | 5.0 | " |
| `gratitude.pool_per_cycle` | 10000 | $ReGen ceiling the cycle can mint |
| `gratitude.max_payout_per_person` | 1000 | **New.** Most one person can be credited in a cycle |
| `gratitude.claim_threshold` | 1000 | Accumulated $ReGen needed before a Hypha claim |

`gratitude.multiplier.*` (1.0 / 1.2 / 1.5 / 2.0) is a **different, legacy** family belonging to
the old trust-graph weighting. The cycle engine has never read it. Editing it does not change
budgets. It is now flagged as such everywhere it appears.

---

## 5. Data model

| Table | Holds |
|---|---|
| `gratitudeLog` | One row per acknowledgment: sender, recipient, message, source, cycleId, weight (written at close) |
| `gratitude_cycles` | One row per lunation: bounds, pool, status (open → distributing → closed), totalWeight, **distributedTotal** |
| `gratitude_cycle_budgets` | Per user per cycle: tier, multiplier, streak, effectiveBudget, uniqueRecipients |
| `gratitude_distributions` | Per recipient per cycle: weightReceived, poolShare, creditedAmount |
| `user_token_ledger` | The only place tokens exist. Gratitude touches it once per cycle, at close |

Cycle numbers come from `shared/lunar.ts`, counted from the 2000-01-06 reference new moon, so
every environment derives the same key for the same lunation.

---

## 6. What changed on 2026-07-28

| # | Change | Why |
|---|---|---|
| 1 | **Payout cap added** (`gratitude.max_payout_per_person`), applied in `computePoolShares`, surfaced on Game Mechanics, seeded in migration 0223, plus `gratitude_cycles.distributedTotal` | A small colluding group could take an entire cycle's pool |
| 2 | **Cycle close now runs on a schedule**: new hourly `POST /api/cron/gratitude-cycles`, plus a safety net inside the nightly batch | `closeDueCycles` had two admin-only callers and no cron. No cycle had ever closed in production, so no $ReGen had ever been distributed |
| 3 | **`computePerPersonShare` divides by `max(n, threshold)`**, and returns 0 for zero recipients | Dividing by n alone meant nothing was ever forfeited; the "sweet spot is 10" story in the spec was mathematically false |
| 4 | **Citizenship repointed to `gratitudeLog`** | It counted from the retired `gratitude_transactions`, so post-cutover nobody would ever promote and every budget would flatten to Explorer/100 |
| 5 | **Seasonal gratitude removed**: `game.sendGratitude`, `game.myGratitudeBudget`, and `GratitudeDrawer` deleted; the bounty board now uses `GratitudeButton` | A spend-down model minting a flat 5 $ReGen per send was live at the same time as the lunar model, and directly contradicted it |
| 6 | **`updateGratitudeMultipliers` deleted** from the nightly batch | Read a table not in the schema and wrote a variable the engine does not read. Dead work that threw into a swallowed error array every run |
| 7 | **Spec and variable names reconciled**; `GameMechanics` fixed to read `gratitude.base_budget` (it read `gratitude.budget_base`, which does not exist) | Admins editing documented keys were changing nothing |
| 8 | **Bounty gratitude tally repointed** to count `gratitudeLog` acknowledgments | It summed ledger rows the retired path minted, so it would have frozen |
| 9 | **UI copy corrected**: per-person figure is gratitude, not $ReGen; forfeited budget now shown | The tab told players their gratitude share was a $ReGen amount |
| 10 | **Platform deck corrected** | Its ledger panel showed gratitude as a double-entry token transfer, which is the retired model |

---

## 7. Verification

- 13 unit tests pass over the pure math, including all four cap scenarios in section 3 and the
  forfeit cases in section 2. The repo's own vitest cannot run over the Cowork mount (pnpm
  symlinks do not resolve), so these were executed against the extracted pure module.
- All 14 modified TypeScript and TSX files parse clean under esbuild.
- Full `tsc` has **not** been run: the toolchain cannot resolve node/vite type roots over the
  mount. Run `pnpm check` locally before pushing.

---

## 8. Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Run `pnpm check` and the full test suite locally | Toolchain cannot run over the Cowork mount | `pnpm check && pnpm test` |
| 2 | Apply migration 0223 to Railway | DB unreachable from the VM | Your normal migration runner |
| 3 | Add the hourly cron job | Railway dashboard login | Railway → cron → hourly → `POST https://regencivics.earth/api/cron/gratitude-cycles` with `Authorization: Bearer $CRON_SECRET` |
| 4 | Close the backlog of open cycles once | Admin session | Admin → Citizenship Tiers → Run Nightly Batch, or hit the new endpoint once manually |
| 5 | Check what the backlog will pay out **before** step 4 | Every historical open cycle closes at once and mints $ReGen | `SELECT id, cycleNumber, status, endsAt FROM gratitude_cycles WHERE status = 'open';` |
| 6 | Decide whether to archive `gratitude_transactions` / `gratitude_budgets` | Depends on whether they hold data worth keeping | `SELECT COUNT(*) FROM gratitude_transactions; SELECT COUNT(*) FROM gratitude_budgets;` |
| 7 | Empty `_to_delete/` | device_bash cannot delete on your machine | `regen-civics-clean/_to_delete/` |
| 8 | `git add -A && git commit && git push` | Claude Code holds `.git/index.lock` on this mount | — |

### CLAUDE CODE — already done

| # | Task | Status |
|---|------|--------|
| 1 | Payout cap in `computePoolShares` + `distributedTotal` column | CODED |
| 2 | Migration `drizzle/0223_gratitude_payout_cap.sql` | CODED |
| 3 | Hourly cron endpoint + nightly-batch safety net + corrected comment | CODED |
| 4 | `max(n, threshold)` split rule | CODED |
| 5 | Citizenship repointed to `gratitudeLog` | CODED |
| 6 | Seasonal gratitude path removed end to end | CODED |
| 7 | `updateGratitudeMultipliers` deleted | CODED |
| 8 | Spec + variable names reconciled, GameMechanics key fixed | CODED |
| 9 | Game Mechanics: cap slider, explainer, role map, corrected simulator math | CODED |
| 10 | Bounty tally repointed; Gratitude tab copy corrected | CODED |
| 11 | 13 unit tests, all passing | VERIFIED |
| 12 | Platform deck gratitude panel corrected | VERIFIED |

### WAITING ON YOU before Claude Code can proceed

- Nothing is blocked. Steps 5 and 6 above are informational checks that may lead to follow-up
  work (a backlog-throttling flag, or an archive migration), but neither blocks deploying what
  is coded.

---

## 9. Worth considering next

- **Intensity.** One acknowledgment per person, equal shares. A player cannot say "Ana carried
  the water system all month, Yara helped once." Allocating 1–3 weights per person out of a
  fixed total would keep the budget constant and let shape vary.
- **Backlog throttling.** When you close the historical backlog, every open cycle distributes
  at once. The cap bounds each cycle, but several cycles will mint together. Consider closing
  them one at a time and watching the first.
- **Reciprocity damping.** The cap bounds how much a colluding pair can extract per cycle, but
  they can still do it every cycle. If that shows up in the data, damp mutual pairs the way
  trust graphs do.
- **Participation-scaled pool.** Complementary to the cap: scale the pool itself by how many
  people took part, so a quiet cycle is small at both ends.

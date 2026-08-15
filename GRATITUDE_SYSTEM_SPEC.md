# Gratitude System Spec

Written 2026-04-03. Revised 2026-07-28 after a full code audit (GRATITUDE_AUDIT_2026-07-28.md).
Canonical reference for the ReGen Civics gratitude mechanic. Supersedes all prior gratitude
descriptions in CITIZENSHIP_TIERS_SPEC.md and SEEDS_VISION_IMPLEMENTATION_SPEC.md.

---

## Core Mechanic: Proportional Budget Splitting

Every lunar cycle (~29.5 days, new moon to new moon), each player receives a gratitude budget based on their citizenship tier. The budget is a pool of gratitude points that must be distributed to other players by acknowledging them. Unspent gratitude resets at the start of the next cycle. There is no pot or treasury involved in gratitude itself. Gratitude is a signal, not a currency transfer.

When you acknowledge someone, your budget is divided by **the number of unique people you have acknowledged, or the full-power threshold, whichever is larger**. With a 300 budget and a threshold of 10: acknowledge 10 people and each gets 30; acknowledge 20 and each gets 15; acknowledge 5 and each still gets 30, with the remaining 150 forfeited. Acknowledging the same person again in a cycle does not add a recipient. One person = one acknowledgment per cycle.

**The sweet spot is 10 recipients.** Each of the first 10 acknowledgments carries a full-power share (budget / 10). Past 10, every extra acknowledgment dilutes everyone. Below 10, the unused part of your budget is genuinely lost: it is not concentrated on the people you did thank, and it does not carry over.

> Corrected 2026-07-28. Until then the divisor was the recipient count alone, so thanking 5 people gave them 60 each and the sender still emitted their whole budget. Recipient count changed only concentration, never total influence, which made this paragraph false and "use it or lose it" untrue. `computePerPersonShare` now divides by `max(n, threshold)`.

Every acknowledgment includes a required message explaining why you're grateful. This message is visible on the recipient's profile as part of their Gratitude Journal.

---

## Budgets by Tier

| Tier | Budget per Cycle | Tier Multiplier | Effective Budget |
|------|-----------------|-----------------|------------------|
| Explorer | 100 | 1.0x | 100 |
| Co-Creator | 100 | 2.0x | 200 |
| Steward | 100 | 3.0x | 300 |
| Sage | 100 | 5.0x | 500 |

Base budget is 100 for all tiers. Multiplier scales it. This keeps the base simple and lets the multiplier do the work. Higher-tier players have more impact per acknowledgment when spread across 10 people.

**Streak Bonus:** For every consecutive cycle where a player acknowledges 10+ unique people, they earn a 3% bonus to their effective budget, up to a maximum of 30% (10 consecutive cycles). Streak resets to 0 if they fail to hit 10 unique people in any cycle.

| Streak Cycles | Bonus | Example (Steward, 300 base) |
|--------------|-------|----------------------------|
| 0 | 0% | 300 |
| 1 | 3% | 309 |
| 5 | 15% | 345 |
| 10+ | 30% (max) | 390 |

---

## Game Variables

All variables are editable in the admin panel and visible on the Game Mechanics page.

These are the keys the code actually reads. Earlier drafts of this spec listed
`gratitude.multiplier.*` and `gratitude.regen_distribution.*`, which the cycle engine has
never read: `gratitude.multiplier.*` belongs to the legacy trust-graph weighting and holds
different values (1.0 / 1.2 / 1.5 / 2.0). Editing those changed nothing.

```
gratitude.base_budget = 100
gratitude.full_power_threshold = 10
gratitude.streak_bonus_per_cycle = 0.03
gratitude.streak_bonus_max = 0.30

gratitude.budget_multiplier.explorer = 1.0
gratitude.budget_multiplier.co_creator = 2.0
gratitude.budget_multiplier.steward = 3.0
gratitude.budget_multiplier.sage = 5.0

gratitude.pool_per_cycle = 10000
gratitude.max_payout_per_person = 1000
gratitude.claim_threshold = 1000
```

**`gratitude.max_payout_per_person`** (added 2026-07-28) is the ceiling on what any one
person can be credited from a single cycle. The pool is a ceiling on issuance, not a promise
to issue: with a 10,000 pool and a 1,000 cap, a cycle where only two people are acknowledged
mints 2,000 and the other 8,000 is never created. Nothing rolls forward. This is what stops a
small group acknowledging only each other from taking a whole cycle's pool. Set it to 0 to
disable the cap.

---

## $ReGen Distribution (End-of-Cycle Calculation)

At the end of each lunar cycle, an internal batch job runs:

1. Tally all gratitude received by each player during the cycle.
2. Calculate each player's share of the $ReGen distribution pool proportionally to gratitude received.
3. Credit internal $ReGen balances (not on-chain).
4. Players accumulate $ReGen from gratitude over time.
5. When a player's accumulated gratitude-earned $ReGen reaches the claim threshold (1000, aligned with the live `governance.claim_threshold_regen` gate), they can make a formal claim on Hypha DAO to receive it on-chain.

**Why the threshold:** Claiming on Hypha is a governance action with overhead. Setting a minimum reduces burden on the community until the process can be automated.

**Formula:**
```
rawShare    = (weightReceivedThisCycle / totalWeightAllPlayers) * poolPerCycle
credited    = min(floor(rawShare), maxPayoutPerPerson)
```
The difference between `rawShare` and `credited` is never minted. `gratitude_cycles.distributedTotal`
records what a cycle actually issued.

Gratitude received is weighted by the sender's effective budget split. A Sage who acknowledges 10 people sends 50 per person. An Explorer who acknowledges 10 sends 10 per person. The Sage's acknowledgment carries 5x the weight in the distribution calculation.

---

## Profile UI: Gratitude Section

Three new boxes in the profile stats grid, plus a journal and CTA.

### Box 1: Gratitude Sends (This Cycle)
- **Primary number:** People acknowledged this cycle (e.g., "7")
- **Power meter:** Visual bar showing full-power status
  - Green zone: 0-10 recipients (full power)
  - Yellow zone: 11-20 (diluting)
  - Faded zone: 20+ (spread thin)
  - Markers at 0, 5, and 10
  - Text below: "3 of 10 full-power sends remaining"
- **CTA link below box:** "Go Express some Gratitude" linking to the forum

### Box 2: Gratitude Received
- **Primary number:** People who acknowledged you last cycle
- **Secondary:** "Lifetime: 47 people across 12 cycles"
- Tracks number of people and number of times (not raw token amounts, which are background data)

### Box 3: $ReGen Earned from Gratitude
- **Progress ring:** Circular progress bar filling toward 333
- **Text inside ring:** Current accumulated amount (e.g., "187")
- **Below ring:** "146 more to claim on Hypha"
- When threshold reached: ring turns gold, "Claim on Hypha" button appears
- **Footnote:** "Wait until you reach 333 earned to make a formal claim. This reduces governance burden until we can safely automate this process."

### Gratitude Journal
Below the three boxes, a scrollable journal section:
- **Sent:** Your acknowledgments this cycle with messages and recipient names
- **Received:** Acknowledgments from others with their messages and sender names
- Entries sorted by most recent first
- Each entry shows: sender/recipient name, message text, date

---

## Moon Phase Integration

The profile gratitude section shows a small moon phase icon reflecting the current point in the lunar cycle. Near the new moon (cycle reset), show "Cycle ends in [N] days" to encourage last-minute sends.

---

## Existing Code Changes Required

### server/routes/game.ts
- `sendGratitude`: Remove the `amount` input (1-5 tokens). Each send is now just an acknowledgment of a unique person with a message. The system handles proportional splitting internally. Enforce one acknowledgment per recipient per cycle (reject duplicates with a clear message like "You've already acknowledged this person this cycle").
- `myGratitudeBudget`: Return budget, people acknowledged, full-power remaining, streak count, $ReGen earned from gratitude.
- New procedure: `myGratitudeJournal`: Returns sent and received acknowledgments with messages.
- New procedure: `gratitudeDistributionStatus`: Returns accumulated $ReGen from gratitude, claim threshold, claim eligibility.

### GratitudeDrawer.tsx
- Remove the leaf token selector (1-5). Each acknowledgment is binary: you either acknowledge someone or you don't.
- Keep the message field (required).
- Show "You've acknowledged X people this cycle. Y full-power sends remaining."

### ProfileStats.tsx
- Add three new boxes (Gratitude Sends, Gratitude Received, $ReGen from Gratitude).
- Add power meter component.
- Add Gratitude Journal section below stats.

### GameMechanics.tsx
- Add all `gratitude.*` variables to the live variables dashboard.
- Update simulator to use new budget/multiplier/streak model.

### Navigation.tsx + SiteFooter.tsx
- Add "Game Mechanics" link to Explore + Connect dropdown and footer.

### Batch Jobs
- New lunar cycle job: calculate $ReGen distribution from gratitude at cycle end.
- Reset gratitude budgets and acknowledgment counts at cycle start.
- Update streak counters.

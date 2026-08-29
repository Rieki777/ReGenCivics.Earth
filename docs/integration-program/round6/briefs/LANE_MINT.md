# Lane MINT — "nobody grants themselves power alone"

**Read `../BUILD_HOUSE_RULES.md` first. Both files bind.**

Worktree: `C:/Users/taren/Desktop/Amora/wt-r6-mint`, branch `wt/r6-mint`, cut from `origin/main` at
`b5bed01`, deps installed, `.env` present.
**Migration number allocated: `0106`.** Only 0106. Never renumber.

Two items. Read QA-2's report first:
`docs/integration-program/round6/qa/qa-2/REPORT_2026-08-29.md`, findings **QA2-03 and QA2-05**.

---

## Item 1 · A lone admin can mint themselves voting weight (QA2-03, HIGH)

### What QA-2 measured, which you must reproduce before you fix

`POST /api/admin/tokens/:slug/mint` has **no co-signature and no second steward**. A single admin:

- self-granted 25, taking their own ledger balance from 20 to 45
- granted 101 in one call
- self-minted 500 of each of four other platform tokens in the same cycle

**The only ceiling is `ledger.admin_mint_cycle_cap` = 10000, and it is PER TOKEN.**

**The sharp edge, and it is why this is the first item:** `village-voice` is the token that becomes
voting weight when `weight_mode = token`. So the scaffolding can mint itself the electorate.

### Why this is not new, and what that means for the design

This was **specified and recorded as unbuilt** eighteen days ago.
`docs/FOUNDATION_HANDOFF_2026-08-11.md` §3b: *"Co-signed manual grants. Specified in the build doc,
not built. Grants over 100 or any self-grant need a second steward."* **Find the build doc that
specified it and follow what it says** rather than inventing a scheme. If the two disagree, say so
and follow the one you can defend.

The two triggers in that sentence are the design: **any self-grant**, and **any grant over 100**.

### The design, and the ruling it must obey

**R54: admin is scaffolding, not a tier, and the destination is a village that governs itself.** So
the second steward is not "another admin" if there is a way to make it the village. Read the
capability model before choosing:

1. **A self-grant is the sharpest case and it may deserve a flat refusal rather than a co-signature.**
   "You cannot mint to yourself; ask someone else to" is simpler, unambiguous, needs no second-party
   flow, and cannot be defeated by two admins taking turns. **Weigh it against co-signature and say
   which you chose and why.** If you refuse self-grants outright, check there is no legitimate case
   you are breaking, and say what you checked.
2. **Grants over 100 need a second person.** Whatever mechanism you choose must record **who** the
   second was, **when**, and **what exact amount and token they approved**, immutably. An approval
   that does not pin the amount is an approval of nothing.
3. **The record must be one nobody can act around.** The check belongs where the mint happens, not
   in the client.
4. **`village-voice` deserves its own consideration.** Minting the token that becomes voting weight
   is a governance act, not an accounting one. **Say whether you think it belongs behind the ordinary
   rule or something stricter, and leave the stricter choice to the founder if you are unsure** —
   do not quietly make it stricter without saying so.
5. **`ledger.admin_mint_cycle_cap` at 10000 per token** is a dial. R56 says villages set their own
   dials and the platform does not argue with them. **Do not change its value.** Report whether the
   per-token rather than per-cycle-total scoping is intended, and leave the answer to the founder.

**A refusal here is a good outcome.** If you find a co-signature cannot be built honestly on this
schema, or that it would lock a single-admin village out of its own token system with no way back,
**say so and build the narrower thing instead.** Round 5's strongest lane refused seven of eight
conversions for exactly that reason: flipping the eighth would have refused an admin with no way back.

## Item 2 · A revoked session still writes usage marks (QA2-05, MED)

`meterUserId` in `server/index.ts` (anchor: `meterUserId: (req) =>`) **skips the `tokenVersion`
check** that the rest of the auth path performs. QA-2 measured it: the same token got 401 from
`/api/profile` and 200 from a module route, **and a usage mark was written**.

This matters beyond hygiene: **module usage is what R59's economics pay out on.** A revoked session
that can still move the meter is a way to move money, even if slowly.

Ship this one **first**, because it is small and it stands alone. Then take item 1.

## Your zone

**Yours:**
- `server/index.ts`: the admin tokens block **only** — anchor from `app.get("/api/admin/tokens"`
  through `app.post("/api/admin/tokens/:slug/mint"` — and the `meterUserId` definition.
- `server/lib/modules.ts` for the metering seam, if item 2 needs it there
- The ledger and token library files you prove you need, hunk-local
- `drizzle/0106_*.sql` and the touched tables in `server/db/schema.ts`
- The admin tokens surface in `client/src/pages/Admin.tsx` — **that tab's own hunks only.**
  `Admin.tsx` is ~9,000 lines and **Lane INVESTOR holds its investor tab.**

**NOT yours. Five other lanes are live:**
- **CYCLE** owns the gratitude and cycle block (`/api/game/gratitude/send` through
  `/api/admin/cycles/close`, plus `/api/game/gratitude/flows`) and `server/lib/economy.ts` and
  `server/lib/gratitude-cycles.ts`. **You will both be near the ledger. If you need a hunk in
  `economy.ts`, ask me.**
- **G-D**: `server/lib/ballots.ts`, `server/lib/orgChart.ts`, the org/seat region,
  `/api/game/progression`, `GET /api/governance/ballots/:id`, and the decision pages.
- **G-E**: the objection routes and `mechanics/:id/open-ballot`.
- **INVESTOR**: `/api/admin/investor-docs` through `/api/admin/investor-summary` and the investor
  tab of `Admin.tsx`.

## Gates specific to this lane

Beyond the standard set and the baseline in house rules §2:

- **A test that a self-grant is refused (or requires a second steward), written first and watched
  failing at `b5bed01`.**
- **A test that a grant over 100 cannot complete with one person**, and that the record names the
  second person, the amount and the token.
- **A test that a revoked token writes no usage mark**, with a control showing a live token does.
- **`check-admin-reach.mjs` reports "0 orphan admin write route(s)" on trunk.** If your co-signature
  flow adds a route, it needs a way in or that gate will catch you, correctly.
- **`check-save-honesty.mjs`** if you add an admin control.
- Migration applied to a scratch schema, app booted, runner re-run proving a no-op.

## Report additionally

- **Whether any self-grant or over-100 grant exists in the production ledger today**, counts only, no
  names. The founder needs to know whether this was ever used, not only that it was possible.
- Your recommendation on the two questions left to the founder: `village-voice`'s handling, and
  whether `admin_mint_cycle_cap` being per-token is intended.

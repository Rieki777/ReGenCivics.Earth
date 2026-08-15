# Claude Code Prompt — 2026-07-18 — ReGen Ship feedback fixes (verify, test, ship)

READ THIS FIRST. Ten rounds of Rye feedback on the ReGen Ship pages were **already applied to the working tree in a Cowork session** (uncommitted). Your job is not to redo them. Your job is to **verify them, run the full gate + tests, apply one DB migration, and ship to a green Railway deploy** per `docs/GOLDEN_RULE.md`.

Everything below is `FIXED` in source. The Cowork VM could not run `pnpm` (missing node type defs, read-only FS) or reach Railway, so the typecheck, the test run, the migration, and the deploy are what remain. Do those, fix anything red, then ship.

## Autonomous calls made for Rye (flagged, easy to change if he objects)

- **Full rate starts Mon 2027-04-05** (first bookable Monday in April 2027). Every week before is the 50%-off trial. `SHIP_YEAR2_START_YMD` moved from `2027-07-26` to `2027-04-05`.
- **Trial nightly nudged $149 → $150** so the trial is *exactly* half the $600 anchor ($300/night, $2,100/voyage) and "50% off" is honest. Rental + offering are now $150 + $150.
- **The Ship's Cook** got a playful new title, **"the Ship's Nourishment Engineer"** (she works raw, barely cooks). "Ask the Ship's Cook" stays as her nickname / the AI feature name.
- **Year-two gear** = electric bike + paddle ball (Rye also said "adventure kits", which was vague; paddleboard and hammocks stay aboard). Adjust the `comingYear2` flags if he means more.

---

## The fixes (all FIXED in source)

### Fix 1 — Booking: per-person price + "+ applicable taxes" (`ShipBook.tsx`)
The selection summary now shows a per-person price (`total / guests`) and a "Plus applicable taxes" line. Per Rye: the site does not take payment (rental is on the external platform, the offering is a church donation), so taxes are surfaced as a line, not calculated here.

### Fix 2 — Nav card: green shimmer CTA vs gold current-page (`shipShared.tsx`, `index.css`)
The booking/primary card now wears a **bright green shimmer** (`.ship-nav-book` in `index.css`) with the badge **"Grab your spot"** (was gold "Start here"). The **pure gold ring is now reserved for the current page** (`active` wins over `primary`), so the two markers never look the same. Reduced-motion users get no animation.

### Fix 3 — Inventory ×2 badge overlap (`ShipInventory.tsx`)
The quantity badge used `absolute mt-14 ml-14` and overlapped the item name. The tile is now `relative` and the badge is a top-right corner pill.

### Fix 4 — Galley: interactive section first (`Galley.tsx`)
The "What's aboard? / Remix it" section (`GalleyRemixer`) moved to the top, directly under the nav, above all the descriptive sections. Verify `GalleyRemixer` appears exactly once.

### Fix 5 — Ship's Cook reframed as Nourishment Engineer (`Galley.tsx`)
Eyebrow → "The Ship's Nourishment Engineer"; heading → "She engineers delicious nourishment out of living food"; intro rewritten (she barely cooks, composes raw food). Removed the old contrast-framed "cooks from a tradition, not a trend" (also a STEERING §1 violation).

### Fix 6 — Straining/juicing → the Vitamix (`shared/galleyCards.ts`, `server/lib/ship-cook.ts`)
The Morning Green Tonic no longer says "Blend and strain, or run it through a juicer" (it blends whole in the Vitamix). The Ship's Cook AI persona (`COOK_VOICE`) now has a rule: no juicer, no strainer, blend in the Vitamix.

### Fix 7 — Inventory corrections (`schema.ts`, migration `0208`, `ShipInventory.tsx`, seed scripts, `Ship.tsx`, `ShipTheme.tsx`)
- "Gravity drinking-water filter" → **"In-line drinking-water filter"** (slug unchanged, image kept).
- New `comingYear2` boolean column + a **"Year two"** badge on the tile and dialog. Electric bike + paddle ball flagged.
- New item **"The Love Your Body kit"** (a loving massage kit), aboard now.
- Perk + theme copy updated (in-line filter; adventure pack notes the year-two gear + the Love Your Body kit).

### Fix 8 — Proof dashboard baselines (`ship-config.ts`, `routes/ship.ts`)
`stateOfShip` now adds `SEEDS_PLANTED_BASELINE` (489) and `VOYAGES_SAILED_BASELINE` (1) on top of live DB counts. Overridable at runtime with game variables `ship.seeds_planted_base` / `ship.voyages_sailed_base` (no deploy). No DB change needed for this one.

### Fix 9 — Pricing: 50% discount display + April 2027 full rate (`ship-config.ts`, `ship-logic.ts`, `shipShared.tsx`, `ShipBook.tsx`)
Full $600/night ($4,200/voyage) shown struck through, the half-price rate shown, a "50% off" badge, and the dollars saved, on both the week cards (trial weeks only; full-rate weeks show plain price) and the `PriceTag`. Trial is now exactly 50%. `windowLabel` for full-rate weeks changed from "Year two, full rate" to "Full rate".

### Fix 10 — "On passage" (answered, copy tightened, `ShipBook.tsx`)
Rye asked what it means: it is the week she repositions between bioregions, so she is sailing and cannot host. Already explained in "Reading the calendar"; that copy was tightened to name the half-price cutoff.

### Fix 11 — Aboard the ship: interior photos (`Ship.tsx`, `shipShared.tsx`, 7 new images)
New `ShipInteriorCard` (captioned photo, degrades to the "coming soon" placeholder if a file is missing). The "Aboard the ship" grid now shows real interior photos:
`ship-interior-{living,bedroom,bath,bedroom-2,shower,bath-sink,altar}.jpg` (in `client/public/images/ship/`) plus the existing `ship-galley-table.webp` for the galley. **No kitchen/galley photo existed in Rye's set** (galley uses the existing food-table webp); the living-room card uses the dinette/Starlink shot.

---

## Do this now (the ship flow you own end to end)

1. **Typecheck + truncation gate:** `pnpm gate` (or `py scripts/audit-truncation.py` + `pnpm check`). Must be exit 0 / TRUNCATED 0.
2. **Per-new-class gate:** `rg -g '*.css' 'ship-nav-book' client/src/` (confirms the green-shimmer class is wired, not truncated).
3. **Tests:** `pnpm test`, plus `pnpm test:integration` (server pricing/config/cook changed). The pricing assertions in `server/ship.test.ts` were already updated to the new numbers ($300, "Full rate"). If anything else is red, fix it, do not weaken it.
4. **Build:** `pnpm build` (bundle-affecting client changes).
5. **Apply the migration:** `npx tsx scripts/run-migration.ts --all` then `--status` to confirm `0208_ship_inventory_corrections` applied. It adds a `NOT NULL DEFAULT false` column (safe on the populated table), renames the filter, flags the year-two gear, and inserts the Love Your Body kit. **Deploys do not run migrations — apply it before/at ship.**
6. **Ship gate + push:** `/ship`, then commit (`type(scope): subject`) and push to `main`. Rye has standing authorization.
7. **Verify the deploy:** poll `pnpm railway:deploys` until the newest leaves `BUILDING` and reaches `SUCCESS`. If `FAILED`/`CRASHED`, pull `pnpm railway:logs`, fix, repeat.
8. **Spot-check production** at a phone width: nav booking card is green shimmer (gold only on the current page), the ×2 badge is clear of item names, the Galley leads with Remix, the booking cards show the struck price + "50% off" + per-person + taxes, the bag shows the in-line filter + "Year two" badges + Love Your Body kit, and the "Aboard the ship" photos render.

Optional / low priority: re-run `scripts/seed-ship-knowledge.ts` (Rye, needs DATABASE_URL) so the shipwright knowledge base says "in-line" instead of "gravity" filter. Not blocking.

---

## Handoff Breakdown — Who Does What

### CLAUDE CODE — already done, or do without Rye

| # | Task | Status |
|---|------|--------|
| 1 | Per-person price + taxes line (ShipBook) | FIXED |
| 2 | Nav green shimmer CTA + gold current-page | FIXED |
| 3 | Inventory ×2 badge overlap | FIXED |
| 4 | Galley interactive-first reorder | FIXED |
| 5 | Ship's Cook → Nourishment Engineer | FIXED |
| 6 | Straining/juicing → Vitamix (data + AI persona) | FIXED |
| 7 | Inventory: in-line filter, year-two flags, massage kit (schema + migration + UI + seed) | CODED (migration must be applied) |
| 8 | Proof baselines seeds 489 / voyages 1 | FIXED |
| 9 | 50% discount display + Apr 2027 full rate | FIXED |
| 10 | "On passage" copy tightened | FIXED |
| 11 | Interior photos placed + wired | FIXED |
| 12 | Update pricing tests in `server/ship.test.ts` | FIXED |
| 13 | Run gate + tests + build | TODO |
| 14 | Apply migration `0208` (Claude Code runs it on Windows, has DATABASE_URL) | TODO |
| 15 | `/ship`, commit, push, verify Railway deploy green | TODO |

### YOU (Rye) — only if you want to

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 16 | Confirm the two autonomous calls (Apr 5 2027 cutoff, $150 nightly) | Pricing/policy | `server/lib/ship-config.ts` |
| 17 | Adjust which gear is "year two" if "adventure kits" meant more than e-bike + paddle ball | Product intent | `scripts/seed-ship-inventory.ts` + a follow-up UPDATE, or ask Claude Code |
| 18 | (Optional) re-seed the shipwright knowledge base wording | Needs DATABASE_URL | `npx tsx scripts/seed-ship-knowledge.ts` |

### WAITING ON YOU before Claude Code can proceed

Nothing. The migration runner and the deploy both run from your Windows machine where Claude Code lives, so Claude Code can carry this to a green deploy without you.

---

## Full file manifest (all uncommitted in the working tree)

**Client:** `index.css`, `pages/ship/shipShared.tsx`, `pages/ship/Ship.tsx`, `pages/ship/ShipBook.tsx`, `pages/ship/Galley.tsx`, `pages/ship/ShipTheme.tsx`, `components/ship/ShipInventory.tsx`, `data/blogPosts.ts`, `public/images/ship/ship-interior-{living,bedroom,bath,bedroom-2,shower,bath-sink,altar}.jpg` (7 new)
**Server:** `lib/ship-config.ts`, `routes/ship.ts`, `lib/ship-logic.ts`, `lib/ship-cook.ts`, `ship.test.ts`
**Shared:** `galleyCards.ts`
**DB:** `drizzle/schema.ts`, `drizzle/0208_ship_inventory_corrections.sql` (new)
**Scripts:** `scripts/seed-ship-inventory.ts`, `scripts/seed-ship-knowledge.ts`

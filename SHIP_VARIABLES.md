# ReGen Ship — Variables Reference

Every number, policy, and setting the ReGen Ship uses, and where to change each one. These will shift over time, so this is the map of what is a constant in code, what is an environment variable, and what is editable live in admin. Last updated 2026-07-10 at launch.

## 1. Pricing (trial year)

All of these are constants in `server/lib/ship-config.ts`. Change them there and both the site and the emails update together. The strikethrough display on the site reads from `client/src/pages/ship/shipShared.tsx` (`ANCHOR_NIGHTLY`, `TRIAL_NIGHTLY`), so keep those two in sync with the server file if you change prices.

**Pricing is per voyage now, not nightly** (confirmed by Rye 2026-07-11). The nightly numbers are the derivation basis; a voyage bills a 7-night tank cycle, so the per-voyage totals are seven times these. The $600/night anchor stays as the struck-through reference everywhere (per voyage that reads $4,200).

| Variable | Value | Meaning |
|---|---|---|
| `ANCHOR_NIGHTLY_USD` | $600 | The per-night anchor value, struck through as the reference. |
| `ANCHOR_VOYAGE_USD` | $4,200 | The per-voyage anchor ($600 × 7), struck through on the site. |
| `TRIAL_RENTAL_NIGHTLY_USD` | $149 | Per-night basis of the insured platform rental. |
| `TRIAL_OFFERING_NIGHTLY_USD` | $150 | Per-night basis of the suggested church offering. |
| `TRIAL_TOTAL_NIGHTLY_USD` | $299 | Per-night basis of the two combined. |
| `TRIAL_RENTAL_VOYAGE_USD` | $1,043 | Trial-year platform rental for one voyage week. |
| `TRIAL_OFFERING_VOYAGE_USD` | $1,050 | Trial-year suggested offering for one voyage week. |
| `TRIAL_TOTAL_VOYAGE_USD` | $2,093 | Trial-year total ask per voyage week (~$2,100). |
| `VOYAGE_NIGHTS` | 7 | One tank cycle (the pricing slot). Bookings must be whole multiples of this. |
| `YEAR2_PRICE_MULTIPLIER` | 2 | Year-two weeks bill at double the trial (~$4,200, her full rate). |
| `SHIP_YEAR2_START_YMD` | 2027-07-26 | First Monday of year two; weeks on/after it bill at the full rate. |
| `KEEPER_PAY_USD` | $200 | Flat Ship Keeper pay per turnover. |
| `FLEET_BUYBACK_PCT` | 10% | Share of church ship revenue routed to RV token buyback. |

**Voyage cycle (confirmed 2026-07-11):** each voyage boards **Monday 3pm** and returns the following **Sunday 11am**; turnover runs Sunday afternoon into Monday morning. The grid anchors on Monday `SHIP_SEASON_START_YMD` (2026-07-27) and runs `SHIP_BOOKING_HORIZON_WEEKS` (104, through the end of year two). All in `server/lib/ship-config.ts`.

Seasonal multipliers (peak +25%, shoulder -20%, event weeks) are NOT constants. They are rows in `ship_pricing_windows`, editable live in admin at `/admin/ship` under Pricing. The year-two multiplier composes with any seasonal window.

## 2. Policy defaults (Section 13 of the spec)

These currently live in page copy (`client/src/pages/ship/ShipQuestRules.tsx`, `ShipBook.tsx`, `Ship.tsx`) and in `ship-config.ts` where a number is referenced in logic. Change the copy where the policy is stated to the guest.

| Policy | Default | Where stated |
|---|---|---|
| Minimum driver age | 25, platform-verified driver | `MIN_DRIVER_AGE` in ship-config; ShipQuestRules copy |
| Guests per voyage | Up to 4 aboard, or 5 when at least 3 are children | `isValidCrewSize(adults, children)` in ship-config (`MAX_GUESTS` 4, `MAX_GUESTS_WITH_KIDS` 5, `MIN_CHILDREN_FOR_FIVE` 3); enforced in the booking form + server. `ship_bookings.children` records the split. |
| Smoking | Never, anywhere | policy copy (not yet on a page; add if needed) |
| Pets | No pets year 1 | policy copy |
| Mileage | 1,000 included, then $0.50/mile | `MILES_INCLUDED` / `OVERAGE_PER_MILE_USD` in ship-config |
| Generator | Included, fair use | policy copy |
| Towing | Not permitted | policy copy |
| Cancellation | Moderate platform policy; offering always refundable | ShipBook + email copy |
| Free voyages | Maiden voyage free, plus 1 per 20% booked, up to 6 | See "Free-voyage giveaway" below |

## 3. Program-specific settings

| Setting | Default | Where |
|---|---|---|
| Winter host income share | 25% (suggested range 20 to 30%) | `WINTER_HOST_SHARE_DEFAULT_PCT` in ship-config; stated in `ShipWinter.tsx`. Recorded per agreement by admin on acceptance. |
| Quest close behavior | Open through the first sailing year; no hard end date | Stated in `ShipQuestRules.tsx`. |

### Free-voyage giveaway (booking-volume driven)

Constants in `server/lib/ship-config.ts`. Completing the quest puts a crew in the draw; each free voyage is awarded by random draw from all completers (ties random too). The maiden voyage is free at launch, and one more free voyage unlocks for every 20% of the first year booked, up to six at 100%.

| Variable | Value | Meaning |
|---|---|---|
| `MAIDEN_FREE_VOYAGES` | 1 | Free voyages at launch (the maiden voyage). |
| `FREE_VOYAGE_MILESTONE_PCT` | 20 | Each this-percent booked unlocks one more free voyage. |
| `MAX_FREE_VOYAGES` | 6 | The cap at a fully booked first year. |
| `MAIDEN_YEAR_VOYAGE_TARGET` | 40 | Voyages that count as 100% booked. **Edit this to pace the giveaways** (it is the denominator for the percent-booked meter on `/ship/quest`). |

Admin holds the draws at `/admin/ship` under Quest ("Draw a free-voyage winner"). The draw picks at random from crews who completed the quest and have not already won, and emails the winner. The public meter (`ship.quest.freeVoyageStatus`) shows voyages unlocked, percent booked, and how many crews are in the draw.
| Maiden voyage weeks | Early-to-mid August 2026 (placeholder) | Shown as copy; set real weeks by adding availability / blackouts in `/admin/ship`. |
| Platform pending expiry | 72 hours | `PLATFORM_PENDING_EXPIRY_HOURS` in ship-config (for the future auto-expire job). |
| Passport GPS proximity | 2 km of the pin | `PASSPORT_PROXIMITY_M` in `server/routes/ship.ts`. |

## 4. Environment variables (set on Railway)

Every one of these is optional. The feature it gates renders a graceful fallback until the variable is set (isConfigured guards in `server/lib/ship-config.ts`).

| Env var | Gates | Fallback when unset |
|---|---|---|
| `OPENROUTER_API_KEY` (or `ANTHROPIC_API_KEY`) | The AI concierge | Concierge shows a "not aboard yet" message; the rest of the ship works. |
| `AI_MODEL` | The model used on the OpenRouter path | Defaults to `openrouter/auto`. |
| `SHIP_ZEFFY_OFFERING_URL` | The suggested voyage offering form | Falls back to the general Zeffy/Stripe donation path. |
| `SHIP_ZEFFY_GIFT_URL` | Gift a Voyage (2x offering) | Falls back to the general donation path. |
| `SHIP_OUTDOORSY_LISTING_URL` | The platform listing link in the booking page + approved email | The email says the link will follow. |
| `SHIP_GPS_TRACKER_API_URL` + `SHIP_GPS_TRACKER_API_KEY` | The live position pin v2 (auto) | Manual position pings from `/admin/ship` still work. |
| `RESEND_API_KEY` | All ship emails | Emails are logged and skipped (no crash). |

## 5. Editable live in admin (`/admin/ship`, no deploy needed)

- Bookings: approve, mark platform complete (paste the platform booking ref), cancel, set status.
- Treasure map: verify or unverify suggested locations.
- Quest: verify or reject pending completions (crediting $ReGen on verify).
- Seed plantings: verify (so they appear on the map).
- Nominations: shortlist or select.
- Applications: view keeper, fleet, and winter host applications.
- Position: post a manual "she sails here" ping (lat, lng, note).
- Pricing: add or remove seasonal multiplier windows and blackout dates.

## 6. Data seeds (re-runnable, idempotent)

- `npx tsx scripts/seed-ship-locations.ts` — 30 starter Cascadia locations. Public natural landmarks are seeded verified; springs, boondocks, land projects, seed sites, and the anchorage are seeded unverified pending your review in admin.
- `npx tsx scripts/seed-ship-quest.ts` — the 7 quest actions. The Food Foresting action links to quest-14; the referral action auto-verifies on Season 2 shortlist; the map action auto-verifies when a user's suggested location is verified.
- `npx tsx scripts/seed-ship-inventory.ts` — the 16 starter Ship's Inventory items (the bag). Idempotent by slug. Icons attach later via the pipeline below.
- `npx tsx scripts/seed-ship-knowledge.ts` — the Shipwright knowledge base seed. General class-A operation + safety guidance is approved; model-specific Fleetwood/Spartan notes are seeded unapproved (forum_wisdom) pending your review in admin, so nothing unverified is ever served as fact.

All accept `--dry-run`.

## 7. New feature surfaces (this build, 2026-07-12)

- **Ship's Inventory (the bag):** `/ship` grid, `ship_inventory_items`, admin CRUD at `/admin/ship`. Icon pipeline: `npx tsx scripts/generate-ship-item-icon.ts --slug <slug> --item "<subject>"` (needs `GEMINI_API_KEY`; `--print` shows the locked style template).
- **The Shipwright (maintainer AI):** "Ask the Shipwright" on `/ship/guide` and in the Captain's Book; `ship_knowledge_chunks` + `ship_maintenance_cases`. Safety rails (propane, brakes, steering, chassis air, burning smell, fire, CO) are hard-coded server-side and never coach DIY. Admin: cases queue, resolve, approve-into-KB.
- **The Captain's Book:** `/ship/voyage`, unlocked while a booking is confirmed/active. Crew roles + pre-sail checklist stored on `ship_bookings` (`crewRoles`, `preSailLog`).
- **State of the Ship:** public trust dashboard on `/ship` (`ship.stateOfShip`). RV-token ownership % and carbon-tree count need an asset-value variable + token ledger (not yet built).
- **Orientation gate:** a booking cannot go `active` until `admin.completeOrientation` is run (columns `orientationCompletedAt` / `orientationKeeperId`); admin override is logged.
- **Basemap:** the live map renders Esri satellite tiles (ADR-36). The `ship/basemap.pmtiles` archive (ADR-34, offline/fallback) still needs uploading once from a stable connection: `railway run -s "ReGenCivics.Earth" -- npx tsx scripts/build-ship-basemap.ts --skip-extract` (the 2GB extract is already cached at `scripts/.cache/ship-basemap.pmtiles`).

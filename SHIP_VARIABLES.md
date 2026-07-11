# ReGen Ship — Variables Reference

Every number, policy, and setting the ReGen Ship uses, and where to change each one. These will shift over time, so this is the map of what is a constant in code, what is an environment variable, and what is editable live in admin. Last updated 2026-07-10 at launch.

## 1. Pricing (trial year)

All of these are constants in `server/lib/ship-config.ts`. Change them there and both the site and the emails update together. The strikethrough display on the site reads from `client/src/pages/ship/shipShared.tsx` (`ANCHOR_NIGHTLY`, `TRIAL_NIGHTLY`), so keep those two in sync with the server file if you change prices.

| Variable | Value | Meaning |
|---|---|---|
| `ANCHOR_NIGHTLY_USD` | $600 | The listed anchor price, shown struck through everywhere. |
| `TRIAL_RENTAL_NIGHTLY_USD` | $149 | The insured platform rental (custom offer). |
| `TRIAL_OFFERING_NIGHTLY_USD` | $150 | The suggested voyage offering to the church. |
| `TRIAL_TOTAL_NIGHTLY_USD` | $299 | The two combined (display total). |
| `VOYAGE_NIGHTS` | 7 | One tank cycle. Bookings must be whole multiples of this. |
| `KEEPER_PAY_USD` | $200 | Flat Ship Keeper pay per turnover. |
| `FLEET_BUYBACK_PCT` | 10% | Share of church ship revenue routed to RV token buyback. |

Seasonal multipliers (peak +25%, shoulder -20%, event weeks) are NOT constants. They are rows in `ship_pricing_windows`, editable live in admin at `/admin/ship` under Pricing.

## 2. Policy defaults (Section 13 of the spec)

These currently live in page copy (`client/src/pages/ship/ShipQuestRules.tsx`, `ShipBook.tsx`, `Ship.tsx`) and in `ship-config.ts` where a number is referenced in logic. Change the copy where the policy is stated to the guest.

| Policy | Default | Where stated |
|---|---|---|
| Minimum driver age | 25, platform-verified driver | `MIN_DRIVER_AGE` in ship-config; ShipQuestRules copy |
| Guests per voyage | 1 to 4 | `MIN_GUESTS` / `MAX_GUESTS` in ship-config (enforced in the booking form + server) |
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

Both accept `--dry-run`.

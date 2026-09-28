# CLAUDE CODE PROMPT: Ship v5, The Flywheel Five (2026-07-11)

**Status:** Ready to build. Five approved upgrades that protect the asset and compound the growth loop. Extends the Captain's Book (`SHIP_MAINTAINER_INVENTORY` Section 1.5) and the voyage lifecycle.

## Kickoff prompt (paste into Claude Code)

> Read CLAUDE_CODE_PROMPT_2026-07-11_SHIP_V5_FLYWHEEL.md at the repo root and execute it: the gear manifest checks, the Homecoming recap pages, the State of the Ship dashboard, the crew list capture, the orientation gate, and the Keeper's Deck (the role and workspace that make the Keeper real). Ship gate, commit, push, verify Railway SUCCESS, update SHIPPED_LOG.md and SHIP_BUILD_INDEX.md, report with a Handoff Breakdown.

---

## 1. The Gear Manifest (protect what makes her special)

Platform coverage protects the vehicle; this protects the e-bike, SUP, Starlink, staff, and chest.

- **Boarding check and return check** in the Captain's Book: a photo-verified checklist of high-value gear (sourced from `ship_inventory_items` where category in adventure/connectivity/magic/tools, flag `isGearChecked`). Keeper and Captain walk it together at orientation; Captain re-runs it at return
- Schema: `ship_gear_checks` (id, bookingId, phase enum(boarding, return), items json [{itemId, present, condition enum(good, worn, damaged, missing), photoUrl}], completedByUserId, witnessedByKeeperId nullable, createdAt)
- Discrepancies at return surface to admin with the boarding photos side by side; resolution notes tie to the platform security deposit process (manual, documented)
- Ten minutes per voyage; the copy keeps it warm ("She counts her treasures before and after every sail")

## 2. The Homecoming page (the marketing engine)

Every completed voyage auto-compiles into a beautiful public recap page: `/ship/log/{voyage-slug}`.

- Contents, auto-assembled: crew names (as they chose to display), voyage dates and route (VoyageRoute map render), log entries with photos, seed plantings pinned, passport stamps earned, a closing line in the ship's voice
- **Ship's Bell baked in:** the page footer carries the crew's referral code and a "Sail her yourself" CTA; the homecoming email now links THIS page as its centerpiece ("Your voyage, told")
- Crews can hide individual entries or the whole page (privacy toggle per entry already exists; add page-level)
- OG image generated per voyage (existing og route patterns) so shares look gorgeous
- The `/ship/log` timeline links every voyage's page; this is her living history made shareable

## 3. State of the Ship (public trust dashboard)

A section on `/ship` (and linked from CORE Transparency): the collective-ownership story, live and provable.

- Tiles: percent of year-1 voyage weeks booked (the same data feeding the milestone chests, rendered as a rising tide), next free-voyage drawing progress, seeds planted count (verified `ship_seed_plantings`), RV tokens in community hands (sum of `ship_rv_token_ledger` as % of asset value; **asset value CONFIRMED by Rye: $220,000**, seeded as the admin-editable variable), voyages sailed, trees planted for carbon
- Church revenue transparency links to the existing CORE Reconciliation/Transparency views rather than duplicating them
- Public, cached (5-minute staleTime), no auth
- One line of copy anchors it: "She belongs to the movement, and here is the proof, live"

## 4. The Crew List (capture the demand you'd otherwise lose)

- Every non-open week card (booked, turnover, migration) gets **"Join the crew list"**: email capture with interest tags (any week / this season / winter voyages / year 2 / when prices change)
- Schema: `ship_crew_list_signups` (id, email, userId nullable, interests json, source, unsubscribeToken, createdAt). Rate limited, double-opt-in per existing newsletter conventions, one-click unsubscribe
- Triggers (nightly job): a matching week opens (cancellation), winter weeks land after the migration vote resolves, year-2 pricing events. Each email is short, in the ship's voice, with one CTA
- Admin: signup counts by interest on the coverage/bookings view (demand signal for pricing and fleet decisions)

## 5. The Orientation Gate (the cheapest insurance)

- `ship_bookings` gains `orientationCompletedAt` + `orientationKeeperId`. The Keeper (role-gated) marks orientation complete in their view after the 2-hour walkthrough and a first pre-sail checklist run together
- Until then, the Captain's Book shows preparation chapters only; driving-day features (pre-sail checklist self-serve, maintenance log, gear return check) unlock at completion. The booking cannot move to `active` without it
- Admin override exists (logged, with reason) for edge cases
- Copy frames it as ceremony, not compliance: "No captain sails her without the handing of the keys"

## 6. The Keeper's Deck (the role, made real)

The Keeper is referenced across the specs (turnover, orientation gate, gear witnessing, Shipwright KB approval) but has no role or workspace yet. Build both:

- **The role:** grant via the existing role-holder conventions (follow the `church_role_holders` / roles patterns already in the codebase; a `ship_keeper` role assignable in admin by Rye). Multiple keepers possible (future fleet); each grant is logged
- **The Deck (`/ship/keeper-deck`, role-gated):** the Keeper's whole job on one page:
  1. **Turnovers:** upcoming returns and boardings on the voyage calendar; each turnover is a checklist (clean, reset systems, restock ship soaps and pantry commons, water/propane status, laundry) that completes with a timestamp
  2. **Orientation:** the orientation-complete button per booking (Section 5), run after the 2-hour walkthrough and joint pre-sail checklist
  3. **Gear checks:** witness boarding checks, review return checks, flag discrepancies (Section 1)
  4. **Maintenance:** the continuous maintenance log across voyages, open Shipwright cases, and the KB approval queue (Rye AND Keeper both hold approval, per the maintainer doc)
  5. **Position:** post a manual ship position ping
  6. **The ledger:** completed turnovers listed with the flat $200 each, running total per month, so pay reconciliation is one glance (payment itself stays human, via the church)
- **Notifications:** email the Keeper on new booking confirmations, returns due, and escalated Shipwright cases
- The Keeper does NOT see general admin: no bookings approval, pricing, quest verification, or donations. Scope the role tightly

## Tests

Gear check requires all flagged items answered before completion; return discrepancies open an admin item; homecoming page respects privacy toggles and renders with zero log entries (graceful); state tiles compute from fixtures (community-owned % uses the $220,000 asset value); crew list double-opt-in + unsubscribe; orientation gate blocks `active` status and the override logs; the keeper role can complete orientation and approve KB chunks but CANNOT reach bookings approval, pricing, quest verification, or donations (explicit authorization tests).

## Handoff Breakdown

### YOU (Rye)
| # | Task | Why |
|---|------|-----|
| 1 | Grant the `ship_keeper` role to your hired Keeper once the Deck ships, and walk them through it once | Human handoff |

(Asset value answered: $220,000, seeded in the build.)

### CLAUDE CODE
Everything above, autonomously, through a green deploy.

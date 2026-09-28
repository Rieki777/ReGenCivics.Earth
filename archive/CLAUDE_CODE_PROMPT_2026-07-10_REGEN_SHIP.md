# CLAUDE CODE PROMPT: The ReGen Ship (2026-07-10, v2)

> **SUPERSESSION LEDGER (read before trusting any number below).** Later docs override this one where they conflict:
> - Prize structure: top-3 replaced by milestone drawings (`SHIP_V3`), then by the 150-point threshold + weighted tickets + nominations + crew profiles (`SHIP_QUEST_V2`)
> - Capacity: 1 to 4 replaced by **4 max, or 5 when at least 3 are children** (`SHIP_V4_LOVE`)
> - Voyage cycle: 7-night/any-start replaced by **Monday 3pm to Sunday 11am, turnover Sunday into Monday**; pricing is **per voyage**, not nightly (`SHIP_MAINTAINER_INVENTORY` Section 4, confirmed by Rye)
> - Winter: stationary anchorage replaced by **Winter Migration + housing fallback** (`SHIP_V3`)
> - Anchor price: $600/night equivalent, strikethrough display everywhere (`SHIP_QC_WORLDCLASS` and later)
> - Concierge: named **the First Mate**, ship section only, bioregion-specific persona (`FIRST_MATE_COMPANIONS`)
> - Booking window: first TWO years open now, year 2 at full rate (`SHIP_MAINTAINER_INVENTORY` Section 3)
> - Keep `SHIP_VARIABLES.md` as the live single source of truth for every price and policy; update it with each build

**Status:** Ready to build. This document is the complete spec for the ReGen Ship system.
**Entity:** This is a **CORE (Church of the Regenerative Earth)** program. The church receives voyage proceeds. It lives on regencivics.earth with a program listing on core.regencivics.earth.
**Owner:** Rye (Rieki Cordon)
**Companion doc:** `RYE_BROWSER_TASKS_REGEN_SHIP.md` (step-by-step guides for every human task, written for a Cowork browser session)

## Kickoff prompt (paste this into Claude Code)

> Read CLAUDE_CODE_PROMPT_2026-07-10_REGEN_SHIP.md at the repo root and execute it end to end per Section 14: read-first docs and ADRs, schema and migration, ship tRPC router with tests, all /ship pages plus the CORE Programs card, treasure map with the location seed script, the OpenRouter-backed concierge, the Maiden Voyage Quest system, the Ship's Manifest emails, and the photo gallery from ship-photos/ (Section 5.11). Build every env-dependent feature behind isConfigured guards so nothing blocks. Then run the ship gate, commit, push to main, verify the Railway deploy reaches SUCCESS, update SHIPPED_LOG.md, and finish with a Handoff Breakdown status report.

## Read first (in order)

1. `CLAUDE.md` (repo root)
2. `.ai/docs/STEERING.md` (hard constraints: writing rules, token model section 5, ship gate section 3)
3. `.ai/docs/DOMAIN-LANGUAGE.md` (add new terms per section 5.9)
4. `.ai/docs/security/AI-AUTOMATION-RISKS.md` (the concierge sends user content to an LLM)
5. `.ai/docs/security/BUILD-PLAYBOOK.md` (new tRPC procedures, public forms, env vars)
6. `CONTEXT_THE_TWO_GAMES.md` (before writing any token or governance copy)

---

## 1. The Vision

**The ReGen Ship** is a regenerative pirate ship, complete with your treasure chest of SEEDS.

**Primary tagline:** "Visiting the most beautiful places on earth in reverence and regeneration."

The ship is a **2006 Fleetwood Revolution LE, 40 ft class A diesel pusher on a Spartan chassis**, luxury edition: all wood, stone trim, and a beautiful custom-designed interior. 3 slide-outs, 2 bedrooms, 2 bathrooms, full kitchen (microwave removed for space), full-size washing machine with drying stand, propane cooking and hot water, generator plus electrical system meeting 100% of energy needs, Starlink internet, spring water collection tanks, whole-RV chlorine filtration plus filtered showers, and a spring-water intake pump that draws from springs up to ~50 ft away (longer with extra hose). The interior was intentionally chosen over off-gassing modern plastics; it is staged and maintained 100% organic. **Designed for a couple, and hosts two couples extremely comfortably** (adventure equipment for 2, shared aboard a two-couple crew).

**The adventure pack:** electric bike, stand-up paddleboard, paddle ball, and the treasure chest: a literal chest of seeds chosen for maximum collective ecosystem impact. The regenerative heart of the fleet is recreating the abundance described in the ReGen Civics article [The Great American Chestnut Abundance](https://regencivics.earth/blog/great-american-chestnut-abundance): turning monoculture pine plantations back into the food forests they were before colonization, so the land meets more and more of all our needs, the way the ship already meets so many.

**The experience:** voyagers follow a personalized digital treasure map through Cascadia, visiting land projects, springs, waterfalls, food forests, and seed-planting sites. They plant seeds everywhere they go, save seeds from local organic fruit they eat, buy local, and return after their week to the anchorage where they plant their saved seeds in the healing hole. Bookings run in one-week cycles (tank capacity). Multi-week bookings require the guest to dump and reset systems mid-voyage. All voyagers commit to a regenerative vegan diet aboard and to the ship's water doctrine (Section 9). On unpleasant days the living room is big enough for yoga; on beautiful days, the earth is the studio.

**The bigger story:** this flagship is the first ship of the **ReGen Fleet**, a traveling festival that moves from land project to land project building natural homes, planting food forests, healing waterways, converting pine plantations, hosting markets, performances, and gatherings. Modeled on the large RV caravans already doing this in New Zealand. Anchorage: The Sanctuary / Tao Hermitage, Ashland, Oregon (no website yet; name only). First bioregion: Cascadia. Maiden voyage: early-to-mid August 2026. 10% of revenue buys RV tokens (fractional ownership of the asset through the ship's DAO), a replicating model so other RV owners can raise their flag and add ships to the fleet. Every voyage plants trees to more than offset its carbon.

---

## 2. Decisions Locked

| Decision | Choice |
|---|---|
| Entity | CORE program. Church receives proceeds |
| Web home | regencivics.earth `/ship/*`, plus a program card on core.regencivics.earth Programs |
| Booking | Hybrid from day 1: our calendar is source of truth; insured rental charge through Outdoorsy; suggested voyage offering to CORE (Section 3) |
| Platform exposure | Listing priced at $600/night, instant book OFF, all dates blocked; approved guests get a custom offer (Section 3.4) |
| Treasure map | Interactive map + database with AI concierge on top, day 1 |
| Pricing display | Every price shown as a discount from the $600/night rate (Section 4) |
| Quest prize | **Top 3** finishers win maiden voyage slots |
| Keeper pay | Flat $200 per turnover |
| Maiden voyage | Early-to-mid August 2026 |
| Capacity | 1 to 4 guests (one couple by design, two couples comfortably) |
| Water return | Private consenting land only, currently the anchorage, under the water doctrine (Section 9) |

---

## 3. Money Flow: The Hybrid Structure

### 3.1 How it works

The total voyage ask has two parts, kept legally separate:

1. **The rental charge, paid on Outdoorsy.** The full legal charge for renting the vehicle. It activates the platform's $1M liability and up to $300,000 comprehensive and collision coverage. Outdoorsy is the right platform: it is the only major platform that covers rigs older than 15 years for both physical damage and liability, which the 2006 ship requires
2. **A suggested voyage offering to CORE**, made directly to the church through the existing church donation infrastructure (Zeffy preferred at 0% fees, Stripe Checkout fallback). Culturally this is how crews keep the ship sailing. Legally it is a voluntary donation, not a rental charge

### 3.2 Research findings that shape the split

- Outdoorsy has **no minimum listing price** for insurance eligibility. Coverage activates on host verification, a passed inspection (tires, brakes, LP, gas within 90 days of departure), handing keys to a verified driver, and TOS compliance. Comp/collision protects the RV's stated value, not the nightly rate
- Host fee: 25% (20% above $20k trailing revenue), $15/night minimum fee for drivables

### 3.3 The guardrails that make this structure hold

Outdoorsy's TOS lets them deny insurance and terminate accounts over off-platform payments **that are required for the rental**. The offering is defensible exactly to the degree it is genuinely voluntary. Absolute rules:

- Booking is never denied, cancelled, or degraded because a guest did not make the offering. Nothing about the rental itself is withheld
- The offering is presented **after** the platform booking is confirmed, in the welcome email and on the site, as a separate transaction to CORE
- The Outdoorsy listing and all messages sent through Outdoorsy never mention the offering or any off-platform amount (their message scanning looks for circumvention)
- On our site, pricing is two transparent lines, never one combined price: the rental on Outdoorsy, and the suggested crew offering to the church
- The offering culturally covers church program gifts (seed chest, treasure map and concierge, healing hole ceremony, fleet building), not rental components
- Receipts follow churchDonations conventions; deductibility language stays conservative pending counsel review

**Residual risk, stated once:** if the offering drifts into effectively-required territory, Outdoorsy can treat it as circumvention. The guardrails keep the church's asset protection intact. Hold them.

### 3.4 Platform exposure control (so strangers don't book the steal rate)

The trial rate would be a steal on the open marketplace. The listing is therefore a checkout and insurance rail, not a discovery channel:

- **List at $600/night** (the true anchor price, coherent with our site's strikethrough display)
- **Instant book OFF.** Every request requires host approval
- **All dates blocked by default.** When we approve a booking on our site, send the guest an Outdoorsy **custom offer** for their exact week at the trial rental rate ($149/night); if custom offers are unavailable for a listing, unblock the week just before they check out and re-block after
- Unsolicited platform requests get a polite decline or a custom quote at the full $600/night. Never mention our site, the program, or any off-platform arrangement in Outdoorsy messages
- Bonus: anyone who finds the listing organically and pays $600/night is pure upside, fully insured

### 3.5 The split and margins

| | Per night | Per 7-night voyage |
|---|---|---|
| Listed anchor price | ~~$600~~ | ~~$4,200~~ |
| Outdoorsy rental (insured charge, custom offer) | $149 | $1,043 |
| Suggested voyage offering to CORE | $150 | $1,050 |
| **Trial-year total ask** | **$299** | **~$2,100** |

Church receives ~$782/voyage from Outdoorsy (after 25%) + $1,050 offering via Zeffy (0% fees) = **~$1,832/voyage**.

Fixed costs $1,150/mo ($150 insurance + $1,000 loan); turnover $200/voyage (Keeper's flat rate):

| Voyages/month | Total ask gross | Net after platform, turnover, fixed | Margin |
|---|---|---|---|
| 1 | $2,100 | ~$480 | 23% |
| 2 | $4,200 | ~$2,115 | 50% |
| 3 | $6,300 | ~$3,745 | 59% |

10% of church ship revenue routes to RV token buyback (Section 10).

---

## 4. Pricing and price display

- **Anchor price: $600/night.** This is the rate the ship is worth and the rate year 2+ moves toward as upgrades land. It is the listed price on Outdoorsy and the strikethrough price everywhere on our site
- **Trial year: $299/night total ask** (7-night minimum), always displayed as a discount: "~~$600~~ $299/night, trial year." Framing: the community trial year; those with abundance are asked to wait for year 2
- **Market context:** Class A comps run $175 to $275/night (big diesel pushers to ~$500). $600 is aspirational and that is fine; it prices the experience and the story, not the chassis, and it is the anchor, not the ask
- **$500/week:** below cost. Never
- **Seasonal multipliers (build in):** peak summer +25%, shoulder season -20%, event weeks premium. Admin-editable multiplier on date ranges
- **Winners' voyages (quest prizes):** still booked through Outdoorsy for insurance, via a nominal custom offer whose cost the church covers. Winners pay nothing; no offering expected from winners
- **Year 2 direct shift:** with CORE's own commercial rental insurance (Roamly or MBA Insurance), direct Stripe booking becomes primary and the platform becomes an optional acquisition channel at $600/night

---

## 5. Build Spec

Reuse before you build: `churchDonations` (Stripe/Zeffy), `invokeLLM` from `server/_core/llm` (pattern: `server/routes/elderChat.ts`, `server/lib/regenGuide.ts`), the quest system in `server/routes/players.ts` (the existing **Food Foresting quest** is part of the Maiden Voyage checklist), the Season 2 `applications` system (shortlist status drives referral verification), the `events` table, the bounty engine, `checkRateLimit`, and `db.creditPrivateTokens`.

### 5.1 Pages (client/src/pages, register in client/src/App.tsx wouter routes)

| Route | Page | Purpose |
|---|---|---|
| `/ship` | `Ship.tsx` | Announcement/landing. Hero, taglines, story, the offering, gallery, strikethrough pricing, quest CTA, fleet CTA |
| `/ship/book` | `ShipBook.tsx` | Availability calendar (source of truth), booking request form (1 to 4 guests), week-cycle rules, diet + water doctrine commitment checkboxes, how the two-part payment works |
| `/ship/map` | `ShipMap.tsx` | Treasure map (5.5), including the live ship position pin |
| `/ship/concierge` | `ShipConcierge.tsx` | AI concierge intake + chat + itinerary (5.6) |
| `/ship/quest` | `ShipQuest.tsx` | Maiden Voyage Quest: full story, checklist, live leaderboard, entry (5.7) |
| `/ship/quest/rules` | `ShipQuestRules.tsx` | Official contest rules (5.7) |
| `/ship/nominate` | `ShipNominate.tsx` | Nomination form, including self-nomination |
| `/ship/fleet` | `ShipFleet.tsx` | ReGen Fleet vision, RV DAO/token model, raise-your-flag application |
| `/ship/keeper` | `ShipKeeper.tsx` | Ship Keeper application ($200/turnover role) |
| `/ship/winter` | `ShipWinter.tsx` | Winter Anchorage program for land projects (5.13) |
| `/ship/log` | `ShipLog.tsx` | Public voyage log: crews, daily entries, seed plantings, passport stamps |
| `/ship/guide` | `ShipGuide.tsx` | The voyage guide: how to run the ship. Built now with structured sections and placeholder blocks for Rye's video walkthrough and article (empty-state: "Captain's walkthrough coming aboard soon") |
| Admin | extend `Admin.tsx` | Bookings, locations, quest verification, nominations, applications, winter hosts, position updates, seasonal pricing multipliers |
| CORE | extend `client/src/pages/core/Programs.tsx` | ReGen Ship program card linking to regencivics.earth/ship |

Styling: match `DESIGN_SYSTEM.md`, mobile-first, accessible. Pirate flavor via copy, iconography, and map pins, not a novel theme.

### 5.2 Database schema (append to drizzle/schema.ts; hand-write drizzle/NNNN_regen_ship.sql at the next number; apply via `npx tsx scripts/run-migration.ts --all`)

Follow existing naming (snake_case tables, camelCase columns). Add `$inferSelect`/`$inferInsert` exports.

```
ship_locations: id, name, slug unique, type enum(land_project, spring, waterfall,
  lake, geology, forest, food_forest, seed_site, boondock, event_venue), lat, lng,
  bioregion default 'cascadia', description text, websiteUrl, imageUrl,
  isVerified bool default false, addedByUserId, linkedEventId (nullable FK -> events),
  linkedApplicationId (nullable), createdAt, updatedAt.
  Indexes: type, isVerified, bioregion

ship_bookings: id, userId, startDate date, endDate date, guests int (1-4),
  status enum(requested, approved, platform_pending, confirmed, active, completed,
  cancelled), platformBookingRef, dietCommitmentAt timestamp,
  waterDoctrineCommitmentAt timestamp, offeringDonationId (nullable FK ->
  church_donations), referredByUserId (nullable, Ship's Bell), isWinnerVoyage bool
  default false, isGifted bool default false, notes text, createdAt, updatedAt.
  Indexes: status, startDate

ship_blackout_dates: id, startDate, endDate, reason
ship_pricing_windows: id, startDate, endDate, multiplier decimal, label

ship_quest_actions: id, slug unique, title, description text, points int,
  isRequired bool, proofType enum(link, photo, referral_shortlisted, game_quest,
  forum), linkedQuestId (nullable, e.g. the Food Foresting quest id),
  forumPostId (nullable), sortOrder

ship_quest_completions: id, userId, actionId FK, proofUrl, note text,
  status enum(pending, verified, rejected), verifiedByUserId, verifiedAt,
  createdAt. Unique (userId, actionId)

ship_nominations: id, nominatorUserId, nomineeName, nomineeContact, reason text,
  isSelfNomination bool, status enum(submitted, shortlisted, selected), createdAt

ship_keeper_applications: id, name, email, location, experience text,
  availability text, status enum(submitted, interviewing, accepted, declined), createdAt

ship_fleet_applications: id, ownerName, email, rvYearMakeModel, location,
  message text, status enum(submitted, in_conversation, joined), createdAt

ship_winter_host_applications: id, projectName, contactName, email, location,
  powerHookup bool, freezeProtectionPlan text, siteDescription text,
  proposedShare text, status enum(submitted, in_conversation, accepted, declined),
  createdAt   -- see 5.13 for requirements

ship_concierge_sessions: id, userId nullable, bookingId nullable,
  profileAnswers json, itinerary json, messages json, createdAt, updatedAt

ship_seed_plantings: id, userId, bookingId nullable, locationId (nullable FK),
  lat, lng, species varchar, photoUrl, notes text, isVerified bool, plantedAt, createdAt

ship_log_entries: id, bookingId, userId, dayNumber int, title, content text,
  photoUrl, isPublic bool default true, createdAt   -- the daily/bi-daily crew log

ship_passport_stamps: id, userId, locationId FK, bookingId nullable, photoUrl,
  stampedAt. Unique (userId, locationId)   -- digital passport, physical later

ship_position_pings: id, lat, lng, source enum(manual, tracker), note, createdAt
```

Also: add nullable `referredByUserId` (or a `ref` code column) to the Season 2 application flow so quest referrals are attributable (`/apply?ref=<handle>`); verified when that application reaches **shortlisted** status.

### 5.3 tRPC router (server/routes/ship.ts, register as `ship` in server/routers.ts)

- `ship.availability` (public): confirmed bookings + blackouts + turnover days
- `ship.requestBooking` (protected, rate limited): validates 7-night multiples, guests 1 to 4, no overlaps, both commitments checked; captures `?ref=` referral
- `ship.myBookings`, `ship.myVoyage` (current voyage: itinerary, log entries, passport, seed plantings)
- `ship.map.list` (public, filters), `ship.map.get`, `ship.map.suggest` (protected, rate limited), `ship.map.position` (public: latest ping)
- `ship.quest.actions`, `ship.quest.myProgress`, `ship.quest.submit` (rate limited), `ship.quest.leaderboard` (public: verified points, finish order, top-3 winner flags)
- `ship.nominate`, `ship.applyKeeper`, `ship.applyFleet`, `ship.applyWinterHost` (public, rate limited, sanitized)
- `ship.concierge.*` (start, answer, generate, chat, getSession; rate limited; 5.6)
- `ship.seeds.log` (protected; from the chest QR card flow in 5.6), `ship.seeds.listVerified`
- `ship.log.create`, `ship.log.list` (public entries), `ship.passport.stamp` (protected: locationId + optional photo; GPS proximity check when coords provided), `ship.passport.mine`
- Admin procedures: approve/cancel bookings, markPlatformComplete, verify locations/completions/plantings, review nominations and all applications, postPosition (manual ping), manage pricing windows and blackouts

BUILD-PLAYBOOK checklist for every public procedure: zod validation, length caps, rate limits, sanitization.

### 5.4 Booking lifecycle (end to end)

1. **Discover:** `/ship` announcement, quest, socials, newsletter
2. **Request:** guest picks an open week on `/ship/book`, commits to diet + water doctrine, submits (with any referral code)
3. **Approve:** admin approves; email sends Outdoorsy custom-offer instructions (3.4). Status `platform_pending`, auto-expire 72h (nightly job)
4. **Confirm:** admin pastes the platform booking ref. Status `confirmed`. Welcome email: voyage guide link, concierge invite, suggested voyage offering link (guardrails 3.3). Ship's Manifest sequence begins (5.8)
5. **Prepare:** concierge intake, itinerary generated, packing guidance (what NOT to bring per Section 9)
6. **Embark:** Keeper orientation (2-hour systems walkthrough), keys to the verified driver, status `active`
7. **Voyage:** daily/bi-daily log entries (prompted in-app and by mid-voyage email), passport stamps at treasure map pins, seed plantings logged via the chest card, bounties completed at land projects, live position pin
8. **Return:** healing hole ceremony at the anchorage, saved seeds planted, status `completed`
9. **Homecoming:** recap email compiles their voyage log page, Ship's Bell referral code issued, gratitude for any offering, invitation to review on the platform
10. **Turnover:** Keeper cleans and resets ($200), calendar reopens

Offering payments reuse `churchDonations` with a `program` tag (`regen_ship`, and `regen_ship_gift` for sponsorships) so Transparency/Reconciliation segment ship revenue; dedicated Zeffy form URLs via new optional env vars following the isZeffyConfigured pattern (Stripe fallback when absent). **Gift a Voyage:** a second donation option at twice the regular voyage offering, sponsoring a land steward or healer's voyage; sponsored voyages are flagged `isGifted` and recipients chosen by church council. If the platform listing exposes an iCal feed, poll hourly to auto-block; otherwise admin blocks manually. Our calendar must never show available what the platform has booked.

### 5.5 Treasure map

- New `ShipTreasureMap` component using **Leaflet + react-leaflet + OpenStreetMap tiles** (add deps; no API key). GlobeMap stays untouched; record the ADR
- Custom pin icons per type (X-marks, springs, seed chests), filter pills, popups with description, image, links, linked upcoming events
- **Ship position pin** ("She sails here"): latest `ship_position_pings` entry, styled as the ship. v1 manual updates by Keeper/crew from admin or a simple authenticated ping form; v2 reads a GPS tracker API (tracker purchase is a Rye task)
- Passport stamps and verified seed plantings render as celebration layers
- "Suggest a location" feeds admin verification
- Seed script `scripts/seed-ship-locations.ts` (mysql2/promise, idempotent upserts by slug, --dry-run) with 30+ starter Cascadia locations: The Sanctuary / Tao Hermitage anchorage (no website; name only), land projects from existing map data, researched springs, waterfalls, boondocking sites (isVerified=false pending Rye's review)

### 5.6 AI concierge (day 1)

- Intake: ~10 questions (pace, physical activity, spring water, food forests, events, spiritual practice, skills to gift land projects, diet details, must-sees, group makeup)
- Server-side `invokeLLM` (elderChat/regenGuide pattern) composes a 7-day itinerary **strictly from verified ship_locations rows passed as context**; validate returned location IDs against the DB before saving. Refinable via chat
- **LLM provider:** `invokeLLM` already routes through **OpenRouter** when `OPENROUTER_API_KEY` is set (cheaper than direct Anthropic; model via `AI_MODEL`, falls back to `ANTHROPIC_API_KEY`). No new provider work needed; gate the concierge on the existing `isLLMConfigured()`
- Security per AI-AUTOMATION-RISKS: user text is untrusted, kept out of system-prompt position, length caps, rate limits, no tool use
- Ship's voice: warm pirate captain ("Ahoy, welcome aboard"), no AI-isms
- **Seed logging, the easy way (no per-packet QR):** one laminated card in the chest lid with a single QR to `/ship/concierge` in "log a planting" mode. The crew tells the concierge what they planted and where (species dropdown from the chest manifest, GPS from the device, optional photo). One QR total, printed once. Plantings save to `ship_seed_plantings` and appear on the map once verified
- A second QR placard by the door links to `/ship/guide`

### 5.7 The Maiden Voyage Quest (the heart of the announcement; build this section of the site richly)

**The story:** the ship sets sail on her maiden voyage in early-to-mid August 2026, through Cascadia, anchored at The Sanctuary in Ashland. Her first crews are not chosen. They are earned. The quest is open to everyone, and every action in it grows the movement: it announces ReGen Civics, launches Season 2, and fills the treasure map.

**The prize:** the **first 3 people** to complete the full checklist win a maiden-voyage-season voyage, free.
- Finisher #1 picks their week first. If they cannot sail, they may gift their slot to anyone or promote another winner, then pick a later week that works
- Finishers #2 and #3 pick remaining weeks in finish order
- Finish order = timestamp of the last **verified** required action
- Winner voyages run through the platform via nominal custom offer (church covers cost); no offering expected

**The checklist (7 required actions):**

| # | Action | Points | Proof / verification |
|---|---|---|---|
| 1 | Share the ReGen Ship announcement on a social channel | 25 | link, admin verified |
| 2 | Write your regenerative origin story on the quest forum thread | 25 | forum post detected |
| 3 | Refer a land project that gets **shortlisted** for Season 2 | 100 | `/apply?ref=` attribution; auto-verifies when the application reaches shortlisted status |
| 4 | Refer an event or workshop partner for the treasure map | 50 | admin confirms the partner conversation |
| 5 | Complete the existing **Food Foresting quest** once | 50 | auto-verified from `quest_completions` |
| 6 | Add a location that gets verified onto the treasure map | 50 | auto-verifies on admin location verification |
| 7 | Attend or host a partner event or land project workshop | 50 | photo/link, admin verified |

Rewards beyond the prize: each verified action credits $ReGen via `db.creditPrivateTokens` with new source tag `ship_quest` (STEERING section 5: private writes only, copy the `quest_completion` pattern). Points persist on the long-term **Quest Board**: sustained quest leaders eventually earn fleet access itself (the future where top questers live aboard while serving the movement), so questing now compounds. Each action anchors to a forum post per existing quest conventions, seeded with 2 to 3 starter comments.

**Leaderboard page elements:** progress bars per contender, live finish ticker, "3 crews will sail" countdown of remaining slots, recent verified actions feed, nomination track callout.

**Nomination track (parallel):** anyone can nominate anyone, including themselves, who would be a vital resource touring a bioregion (builders, mediators, food forest designers, storytellers). Church council selects one nominee for a bonus crew slot. Surfaces people the leaderboard would miss.

**Official rules (`/ship/quest/rules`):** skill-based contest (no purchase, no chance), eligibility 18+, valid driver requirements to captain the ship (winners who cannot drive may bring a qualified driver or gift the slot), dates (opens at announcement, closes when 3 finish), how ties and verification disputes resolve (admin verification timestamps govern), prize approximate retail value, church as sponsor, one entry per person, right to disqualify gamed proofs. Counsel skims before launch (Rye task).

### 5.8 Emails: the Ship's Manifest sequence (Resend, existing template conventions; capture the full story of Section 1 across the arc)

| # | Trigger | Content |
|---|---|---|
| 0 | Booking confirmed | **Welcome Aboard.** The ship's story (pirate ship, seeds, fleet), voyage guide link, video walkthrough embed placeholder, what happens next |
| 1 | T-14 days | **Your Treasure Map.** Concierge intake invite, map tour, land project events during their window, bounties available on their route |
| 2 | T-7 days | **The Ship Herself.** Systems overview (video placeholders), the water doctrine: use only the soaps and cleaning materials aboard, bring no chemical body products, why this keeps the water a regenerative force. Diet commitment refresher. Packing list, including what NOT to bring |
| 3 | T-2 days | **Setting Sail.** Keeper orientation details, driving the 40 ft ship, spring water collection how-to, the seed chest and the [chestnut abundance](https://regencivics.earth/blog/great-american-chestnut-abundance) story, log + passport intro |
| 4 | Day 3 of voyage | **The Captain's Log.** Reminder to log entries, stamp the passport, log plantings via the chest card, nearby pins and events |
| 5 | T+1 day after return | **Homecoming.** Their compiled voyage log page, healing hole recap, Ship's Bell referral code, gratitude, platform review invitation |

Plus operational emails: request received, approved + custom-offer instructions, quest action verified, quest winner, applications received (keeper, fleet, winter host), nomination received.

### 5.9 Domain language additions (.ai/docs/DOMAIN-LANGUAGE.md)

**ReGen Ship**, **ReGen Fleet**, **Voyage** (one 7-night cycle), **Ship Keeper**, **Treasure Map**, **Voyage Offering** (suggested donation to CORE, legally voluntary), **Healing Hole**, **Anchorage**, **Ship's Bell** (referral program), **Ship's Manifest** (pre-voyage sequence), **Water Doctrine** (Section 9), **Winter Anchorage** (off-season hosting program), **Passport** (digital land project stamp book).

### 5.10 ADRs to append (.ai/docs/DECISIONS.md)

1. ReGen Ship as CORE program with hybrid platform + offering money flow and platform exposure control
2. Leaflet/react-leaflet regional treasure map alongside GlobeMap
3. `ship_*` table family, `ship_quest` token source tag, Season 2 application referral attribution

### 5.11 Photo assets (staged and ready)

Seven exterior photos and two clips are staged at **`ship-photos/`** (repo root) with descriptive names. Process them through the existing image pipeline (`IMAGE_ARCHITECTURE.md` / `IMAGE_UPLOAD_PROCESS.md`: R2 upload, serve via `/api/img` with resize + caching). Usage map:

| File | Shot | Use |
|---|---|---|
| `ship-zion-redrock-hero.jpg` | Ship beneath red rock cliffs, crisp daylight | `/ship` hero |
| `ship-cascadia-forest.jpg` | Ship nestled in old-growth conifers | Cascadia/treasure map section |
| `ship-tipis-prairie.jpg` | Ship between two tipis, big sky | Reverence/community section |
| `ship-double-rainbow.jpg` | Double rainbow over the ship | Quest page header |
| `ship-campfire-dusk.jpg` | Fire ring, chairs, moon at dusk | Evenings aboard / voyage log |
| `ship-desert-sunset-boondock.jpg` | Sunset silhouette, open desert | Off-grid/boondocking section |
| `ship-lake-powell-overlook.jpg` | Ship above a lake vista | "Most beautiful places on earth" band |
| `ship-clip-zion.mp4`, `ship-clip-sunset.mp4` | Short clips | Hero background or social cuts |

Interior photos and the walkthrough video are still coming (Rye Task 5); build interior gallery slots with placeholders. Convert/resize to the pipeline's formats; keep originals in R2.

### 5.12 Perks and listing copy ("Everything you need for an epic regenerative adventure")

Two versions of the perks copy. The **site version** (below) runs on `/ship` as the amenities/perks section. The **platform-safe version** lives in the companion doc Task 1 (same perks, zero mention of the church, the offering, our site, or off-platform anything).

> **Everything you need for an epic regenerative adventure.**
>
> We book a small number of voyages each season, exclusively, for people who care about what they eat, what they breathe, and what touches their skin.
>
> **The healthiest coach on the road.** We chose a 2006 luxury build on purpose: real wood and stone trim, cured decades past off-gassing, instead of the new-RV plastics that never stop smelling like chemicals. She does not stink; she breathes. Every detail aboard has been optimized for health: 100% organic linens and towels, cast iron and natural cookware, organic soaps and body products stocked for you (the only ones used aboard), and the microwave removed for a more spacious galley.
>
> **Water like nowhere else.** Whole-coach filtration strips chlorine from any city fill. Filtered showers. Gravity-filtered drinking water. And the part nobody else has: a spring-water intake pump that fills your tanks straight from a living spring up to 50 feet away. Bathe in spring water in the wild.
>
> **Fully off-grid, fully connected.** Generator and electrical system meet 100% of your energy needs. Starlink internet anywhere on earth. Propane cooking and hot water. A full-size washing machine with drying stand: your whole home, traveling with you.
>
> **The adventure pack.** Electric bike. Stand-up paddleboard. Paddle ball. Hammocks. Cascadia field guides, instruments, and games.
>
> **Room to live.** Forty feet, three slide-outs, two bedrooms, two bathrooms, and a living room big enough for morning yoga. Designed for a couple; hosts two couples in comfort.
>
> **The treasure.** A chest of seeds, a personalized treasure map, and a ship's concierge that plots your voyage through springs, waterfalls, food forests, and the land projects regenerating Cascadia.

Health claims stay factual (materials, filtration, organic supplies); no medical claims anywhere.

### 5.13 Winter Anchorage program (`/ship/winter`)

Off-season, the ship becomes stationary sanctuary housing at a host land project: extra housing for the project, income share for hosting her, and the ship earns through dead months.

- **Application (land projects):** site description, power hookup availability, freeze protection plan, proposed income share
- **Hard requirement, stated on the page:** the ship must never sit below freezing for more than 30 to 60 minutes. Hosts must provide either heated/sheltered parking or reliable powered heaters for the vital components (wet bay, plumbing, tanks), with a power failure plan
- **Income share model:** host receives a share of winter residency revenue (suggested starting point 20 to 30%, church council sets per agreement; admin records the agreed share on acceptance)
- Winter residencies are stationary bookings (no driving): lower price, no platform driving insurance needed if the ship does not move, though counsel confirms the stationary-stay insurance posture (Rye task)

---

## 6. Announcement copy (draft for /ship; refine with STEERING section 1 writing rules)

> **The ReGen Ship has raised her flag.**
>
> She is a regenerative pirate ship, complete with your treasure chest of SEEDS. She is also a 40-foot land yacht, a 2006 Fleetwood Revolution LE: all wood and stone trim inside, two bedrooms, two bathrooms, a galley that cooks real food, a living room big enough for morning yoga, a full washing machine, Starlink overhead, and spring water in her tanks. Built for a couple. Hosts two couples in comfort.
>
> You do not just rent her. You take her on a voyage. Your treasure map is drawn for you by the ship herself: land projects to serve, springs to drink from, waterfalls, food forests, and the places where past crews planted their seeds. You sail Cascadia visiting the most beautiful places on earth in reverence and regeneration.
>
> Everywhere you go, you plant. The treasure chest is a chest of seeds chosen to turn pine plantations back into the food forests they once were, the great abundance this land knew before. Eat local fruit, save the seeds, and when you sail home to her anchorage at The Sanctuary in Ashland, plant your harvest in the healing hole and watch a food forest grow from every crew that ever sailed.
>
> She is the flagship of the ReGen Fleet, a program of the Church of the Regenerative Earth. Ten percent of every voyage buys the ship herself back into community ownership. This is her trial year: ~~$600~~ **$299 a night**, one-week voyages, for the crew who get here first.
>
> **The maiden voyage sails this August. Want aboard? Win it.** The Maiden Voyage Quest is open to everyone. The first three to complete it sail free.

Link the [chestnut abundance article](https://regencivics.earth/blog/great-american-chestnut-abundance) from the seeds section.

## 7. Equipment and supplies

**Before first voyage:** PFDs for SUP use (legally required), e-bike helmet + heavy lock, fire extinguishers + CO/propane detectors checked, first aid + roadside kit + headlamps, 50A surge protector, leveling blocks, wheel chocks, tire pressure monitoring system, **GPS tracker with API access** (position pin + asset security; models in the companion doc), extra spring-intake hose + spare filters, gravity drinking-water filter, cast iron + full organic cookware set, 2 full sets organic linens/towels, **full stock of ship-approved soaps, cleaners, shampoos, sunscreens, and bug repellents** (the only ones allowed aboard, Section 9), laminated guest guide + systems quick-start cards, the seed chest (wooden chest, labeled packets, chest manifest list, planting guide, one QR log card in the lid), hammocks, Cascadia field guides, instruments and games, QR guide placard by the door.

**Year 2 upgrades (justify the climb toward $600):** lithium battery bank + solar expansion, composting toilet conversion, outdoor shower, awning lounge, second e-bike or e-cargo bike, projector for outdoor cinema at land project events, sauna tent.

## 8. Operations

- **Cycle:** 7-night voyages, turnover day at the anchorage between voyages. Multi-week: guest resets systems per the guide
- **Ship Keeper:** `/ship/keeper` applications; cleaning, turnover, upkeep; **flat $200 per turnover**; runs the 2-hour orientation with every first-time crew (cuts damage, the real margin killer, and hands off the culture)
- **Healing hole ritual:** every returning crew plants their saved seeds at the anchorage and is taught the practice
- **Carbon:** every voyage includes tree planting that more than offsets the diesel burned (~125 gal per 1,000 miles). Conscious net-positive practice, not a certified offset
- **Voyage guide (`/ship/guide`):** structured now with placeholders; Rye records the full video walkthrough and article, then they slot in (companion doc has the shot list)

## 9. The Water Doctrine

Black and gray water return happens **only on privately owned land at land projects that have explicitly accepted it**, currently the anchorage at The Sanctuary / Tao Hermitage. The practice is designed as a regenerative force for the ecosystems receiving it, which requires strict input control:

- **Only the soaps and cleaning materials that come with the ship may be used aboard. Crews bring none of their own**
- **No chemical body products that wash into the system:** no conventional sunscreens, bug sprays, perfumes, or medicated washes. The ship stocks approved alternatives (Section 7)
- Vegan-diet-only inputs, absolute ban on chemical cleaners and toxins
- These rules appear in the booking commitment checkbox, the guest guide, Manifest email 2, and a placard at the sinks and shower

Guardrail, stated once: Oregon DEQ regulates sewage disposal even on private land, and gray water reuse has a permit pathway. To protect CORE and the land partners: pursue the DEQ gray water permit for the anchorage, design the blackwater practice with a soil steward toward a permitted composting system (the year 2 composting toilet conversion makes this clean), keep the practice in the guest guide and land-partner agreements rather than public marketing copy, and have counsel review the land-partner agreement. Operational doctrine, not website copy.

## 10. The ReGen Fleet and the ship's DAO

- The ship has its own DAO reflecting total ownership of the asset. Rye owns the RV outright and lends it to the church for this program
- 10% of church ship revenue buys RV tokens: fractional shares buying the asset into community ownership over time. A replicating model for every future ship
- On-chain handoffs go through the **Hypha Bridge module** (`server/lib/hypha-bridge/`) with a new intent type; never hand-roll redirects (STEERING section 6). Phase it: ledger-tracked allocation over tagged church revenue first, on-chain issuance later via existing claim-bridge patterns
- `/ship/fleet` invites RV owners to raise their flag: join the quest to regenerate Cascadia, then replicate across bioregions. The fleet is the traveling festival. Announce **the Regatta** (annual fleet convergence festival at one land project) at fleet launch to give owners a reason to join now

## 11. Marketing and campaign

1. **The quest is the campaign.** Every action spreads the announcement, shortlists land projects for Season 2, or fills the treasure map. The prize markets the rental; the rental markets the quest
2. Announcement across forum, newsletter, socials (regen-content-repurposing skill for channel versions): launch thread, quest explainer, ship tour reel script placeholder (awaits Rye's video)
3. Cross-promotion with land project events via linked map pins from day 1; partnership announcements later
4. The nomination program doubles as outreach; every nomination email tells someone new about the ship
5. **Voyage logs are the flywheel:** every crew's public log page, daily entries, plantings, and stamps become the ongoing story. Homecoming email hands them the Ship's Bell referral code; referred bookings earn $ReGen (source `ship_referral`) and quest board points
6. **Gift a Voyage** gives donors a way in without sailing; church council awards sponsored voyages to land stewards and healers

## 12. Vision upgrades (all approved, all in the build above)

1. **Voyage Log** with prompted daily/bi-daily entries (5.2 ship_log_entries, Manifest email 4, `/ship/log`)
2. **Ship's Bell referrals** (referral codes, `ship_referral` credits, quest board points)
3. **One-QR seed chest logging** via the concierge (5.6): no per-packet printing, one laminated card in the chest lid
4. **Bounty voyages:** concierge itineraries and Manifest email 1 surface open bounties at land projects on the route; crews earn while living their best lives
5. **Gift a Voyage** at twice the regular offering (`regen_ship_gift` program tag)
6. **Winter Anchorage program** (5.13) with the freeze-protection hard requirement
7. **Voyage guide with walkthrough placeholders** (`/ship/guide`) awaiting Rye's video
8. **Seasonal pricing multipliers** (ship_pricing_windows, admin editable)
9. **Ship's Manifest sequence** (5.8), carrying the full story across six emails
10. **Digital passport** (ship_passport_stamps), physical stamp book later
11. **Live ship position** (ship_position_pings; manual v1, GPS tracker v2; tracker purchase in companion doc)
12. **The Regatta**, announced at fleet launch

## 13. Policies (recommended defaults; Rye can veto any)

| Policy | Default |
|---|---|
| Minimum driver age | 25, platform-verified driver only |
| Smoking | Never, anywhere |
| Pets | No pets year 1 (organic interior); revisit with fleet |
| Mileage | 1,000 miles included per voyage, $0.50/mile after |
| Generator | Included, fair use |
| Towing | Not permitted |
| Festivals/burn events | Only with prior approval (dust and ecosystem wear) |
| Cancellation | Moderate platform policy; offering refundable on request, always |
| Security deposit | Per platform standard |

## 14. Execution order (one session, green deploy)

1. Read the docs in "Read first". Add domain language entries and ADRs (5.9, 5.10)
2. Schema + migration (5.2), apply via `npx tsx scripts/run-migration.ts --all`
3. `server/routes/ship.ts` + registration + rate limits + tests (`server/ship.test.ts`: booking overlap rejection, guest count bounds, quest finish-order and top-3 logic, shortlist-referral auto-verification, concierge location-ID validation, donation program tagging, passport stamp uniqueness)
4. Pages (5.1) + App.tsx routes + nav entry + CORE Programs card
5. Treasure map + position pin + seed script (5.5), run seed script
6. Concierge + chest QR flow (5.6)
7. Quest system + rules page + forum anchor seed script (5.7)
8. Ship's Manifest emails + operational emails (5.8)
9. **Ship gate** (STEERING section 3): `python3 scripts/audit-truncation.py`, rg every new className, `pnpm typecheck`. Then `pnpm check`, `pnpm test`, `pnpm build`
10. Commit (`feat(ship): ...`), push to main (standing authorization), poll `pnpm railway:deploys` to SUCCESS; fix and repeat if FAILED
11. Update `SHIPPED_LOG.md`; refresh the Handoff Breakdown statuses

Build anything env-dependent (concierge key, Zeffy ship forms, tracker API) behind isConfigured guards so everything ships and features light up when vars land.

## 15. Remaining open questions (none block the build)

1. Confirm or veto the policy defaults in Section 13 (especially pets and mileage)
2. Winter host income share starting percentage (suggested 20 to 30%)
3. Quest close behavior if 3 finishers take long: hard end date, or open until 3 finish (spec assumes open until 3 finish)
4. Exact maiden voyage week options to show winners

## Handoff Breakdown: Who Does What

Every YOU task below has a matching step-by-step browser-session guide in **`RYE_BROWSER_TASKS_REGEN_SHIP.md`**. Paste the relevant task block into a fresh Cowork session and it will drive or direct each step.

### YOU (Rye): things only you can do

| # | Task | Why only you | Guide |
|---|------|-------------|-------|
| 1 | Outdoorsy listing: $600/night, instant book off, all dates blocked, verification + inspection | Account owner, physical vehicle | Companion Task 1 |
| 2 | Zeffy forms: voyage offering + Gift a Voyage (2x); share URLs for env vars | Zeffy dashboard | Companion Task 2 |
| 3 | Railway env vars (ship Zeffy URLs; confirm OPENROUTER_API_KEY present) | Railway dashboard | Companion Task 3 |
| 4 | Buy + install the GPS tracker | Purchase, physical install | Companion Task 4 |
| 5 | Photo shoot + video walkthrough for `/ship` gallery and `/ship/guide` | Physical presence | Companion Task 5 |
| 6 | Roamly + MBA quotes (year 2 direct insurance; winter stationary posture) | Account/identity | Companion Task 6 |
| 7 | DEQ gray water permit inquiry for the anchorage | Government interaction | Companion Task 7 |
| 8 | Counsel review packet: offering language, contest rules, land-partner water agreement, receipts | Legal judgment | Companion Task 8 |
| 9 | Hire the Ship Keeper; agree winter host share policy | Human judgment | Companion Task 9 |
| 10 | Answer Section 15 questions | Owner decisions | reply in chat |

### CLAUDE CODE: the entire build (Section 14), autonomously

Per CLAUDE.md, Claude Code owns tests, migrations, ship gate, commit, push to main, and Railway deploy verification end to end. Only pause for Rye on failing tests implying design changes, risky migrations, or security questions.

### WAITING ON YOU before features go fully live

- Outdoorsy listing URL (custom-offer emails; build with placeholder env var)
- Zeffy form URLs (offering + gift flows render fallback until set)
- Interior photos and the walkthrough video (7 exterior shots + 2 clips already staged in `ship-photos/`, Section 5.11; interiors and guide video still to come)
- GPS tracker API details (position pin runs on manual pings until then)



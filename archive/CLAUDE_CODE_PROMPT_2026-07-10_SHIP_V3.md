# CLAUDE CODE PROMPT: ReGen Ship v3 (2026-07-10)

**Status:** Ready to build. Winter Migration + voting, land project stops, the ownership/UBI model, map contribution rewards, the Experience Library, and the new giveaway structure.
**Supersedes:** the prize structure in `CLAUDE_CODE_PROMPT_2026-07-10_REGEN_SHIP.md` Section 5.7 (top-3 winners is replaced; update all built pages and copy).
**Companions:** `CLAUDE_CODE_PROMPT_2026-07-10_SHIP_MAP_V2.md` (map rebuild), `RYE_BROWSER_TASKS_REGEN_SHIP.md`.

## Kickoff prompt (paste into Claude Code)

> Read CLAUDE_CODE_PROMPT_2026-07-10_SHIP_V3.md at the repo root and execute it end to end: Winter Migration program with weighted voting, land project stops and offerings with concierge matching, the expanded fleet/ownership page with generated storybook images, RV token contribution rewards and the Experience Library, the new booking-milestone giveaway structure across all quest pages and copy, and the story article draft. Then ship gate, commit, push to main, verify Railway deploy SUCCESS, update SHIPPED_LOG.md, and report with a Handoff Breakdown.

## Decisions locked (Rye, 2026-07-10)

| Decision | Choice |
|---|---|
| Winter | Migration to a southern bioregion (endless summer); stationary anchorage housing remains a paid down-season fallback |
| Migration vote | All signed-in members 1x; anyone with a confirmed booking 50x; San Diego and Austin as seeded options plus community write-ins promotable to official options |
| Prize structure | Maiden voyage to the first quest completer (cannot complete in under 7 days). Then one free-voyage drawing among all quest completers at every 20% of year-one capacity booked. Capacity = 40 voyage weeks, so a drawing every 8 booked weeks; 6 free voyages total at 100%. Ties resolved randomly |
| Contribution rewards | $5 of RV tokens per accepted map location (every category), $20 per accepted Experience. Uncapped, quality-gated by admin acceptance |
| Images | Painterly storybook style |
| Model section | Expand `/ship/fleet` |

---

## 1. Winter Migration (replaces winter storage; housing fallback stays)

**Concept:** she never winters in a driveway. Each winter the ship migrates to a southern bioregion and keeps sailing peak-season voyages. It is always peak season wherever she is, and the booking page says so.

### 1.1 The vote

- New section on `/ship` + dedicated block on `/ship/fleet`: **"Where does she winter?"**
- Seeded options: **San Diego bioregion** and **Austin, Texas bioregion**. Members may submit write-in bioregions; admin can promote a write-in to an official option
- Weighting: every signed-in member votes with weight 1; any member with a booking in status confirmed/active/completed votes with weight 50. One vote per member, changeable until the window closes
- Schema: `ship_migration_votes` (id, userId unique per window, optionId, weight snapshot, createdAt), `ship_migration_options` (id, name, slug, description, isWriteIn, status), `ship_migration_windows` (id, title, opensAt, closesAt, status)
- Results: live weighted bar chart, count of crew (50x) votes shown separately ("the crews have spoken")
- Admin: open/close windows, promote write-ins, resolve the winner

### 1.2 The comparison (researched; render on the vote page, evenhanded)

| | San Diego bioregion | Austin, Texas bioregion |
|---|---|---|
| Winter weather | 65 to 75°F, sunny, coastal | 60s to 70s, mild, occasional cold snaps |
| Boondocking | Weak near the city; Anza-Borrego desert BLM within reach | Texas is a private-land state; limited public boondocking; more host-parking dependent |
| Springs + water | Coastal, few springs | Hill Country spring paradise: Barton Springs, Jacob's Well, Krause Springs, Hamilton Pool |
| Community | Surf/wellness culture, year-round outdoor living | Big music, festival, and community scene; budget-friendly "Winter Texan" tradition |
| Distance from Ashland | ~750 mi (2 drive days; ~$450 diesel at 8 mpg) | ~2,000 mi (4+ drive days; ~$1,200 diesel) |
| Snowbird demand | Strong | Strong |

### 1.3 Endless summer on the booking page

- `/ship/book` gets a **seasonal location band**: a 12-month strip showing projected bioregions (Cascadia spring through fall, winner-bioregion winter, migration drive weeks blocked)
- Winter-month bookings show the projected bioregion and a note that the final call is the community vote, weighted by crews
- Migration drive weeks appear as blocked "she sails south/north" ranges; optionally offer them later as crewed relocation voyages (out of scope now, leave a TODO)
- The stationary Winter Anchorage program (`/ship/winter`) remains as the fallback when a down season is wanted: copy updated to say the default is migration, and hosting applications are for bioregions she winters in or for paid stationary stays when the fleet needs one

---

## 2. Land project stops and offerings (`/ship/stops`)

Land projects apply to become an **anchor or stop** on the treasure map and post what they offer and what they need, so the concierge designs voyages around real exchange.

- **Application form:** project name, location (map-pick), 40-ft parking/turnaround confirmation, hookups/water, contact; then three repeatable lists: **Offerings** (workshops, produce, springs access, sauna, skills teaching), **Needs** (labor, skills, materials, seeds), **Gifts** (what they freely share with crews)
- Schema: `ship_stops` (id, locationId FK -> ship_locations, applicationContact, parkingNotes, maxRigLengthFt, status enum(applied, accepted, anchor, paused), createdAt) + `ship_stop_items` (id, stopId, kind enum(offering, need, gift), title, description, isActive)
- Accepted stops render as land_project pins with offerings/needs/gifts in the map detail drawer
- **Concierge matching:** intake already asks what gifts/skills the voyager brings and what journey they seek; itinerary generation now weights stops whose active Needs match the voyager's gifts and whose Offerings match their journey type. Pass stop items into the LLM context alongside locations; same validate-IDs rule
- **Outreach list:** compile `SHIP_STOPS_OUTREACH.md` (repo root) with 30+ Cascadia candidates for Rye to invite: pull from the ic.org communities directory, WWOOF-USA (OR/WA), Global Ecovillage Network map, the Regenerate Cascadia network, permaculture institutes (Aprovecho, Lost Valley, Breitenbush and similar), and any project already in our applications/map data. Columns: name, place, why they fit, best contact/link, suggested first offering/need

---

## 3. The ownership and UBI model (`/ship/fleet` expansion)

The fleet page becomes the full story of the collectively owned, collectively governed fleet. Sections in order:

1. **The idle fleet in America's driveways:** 8.1 million US households own an RV; the median RV is used 30 days a year (335 days anchored); 16.9 million more households want one (RVIA 2025 owner profile). "America's driveways are full of anchored ships"
2. **The model, win-win-win:** an owner raises their flag and their RV joins the fleet → the church program books it into voyages → the land projects get crews, seeds, and support → voyagers live the most beautiful days of their lives → the owner earns a revenue share that, fully booked, approaches a UBI. Whoever brings a ship into the fleet can be paid to be full-time in the Renaissance. People still working and transitioning get a bridge: their asset funds their becoming
3. **Scaling logic:** when demand outruns the fleet, the economics are sound enough to mortgage new ships into existence; 10% of every voyage buys each ship into community ownership (RV tokens); contribution rewards (Section 4) mean the community is earning ownership of the fleet by building the map itself
4. **Governance:** each ship has a DAO reflecting total ownership; the fleet is the network of ship DAOs; legal and economic game design is the craft here, done with counsel (link the win-win-win language, keep token-sale language out per CONTEXT_THE_TWO_GAMES and STEERING; these are contribution rewards and revenue buybacks, not investments; add the standard disclaimer line)
5. **Join CTAs:** raise your flag (fleet application), sponsor a voyage, start questing

### 3.1 Generated images (painterly storybook, nano-banana-pro skill, run locally where GEMINI_API_KEY lives)

Generate at 2K, save to `ship-photos/`, run through the image pipeline like the others:

1. `ship-art-fleet-festival.png`: "Painterly storybook illustration, warm golden light: a caravan of vintage RVs led by a majestic brown-and-cream diesel pusher motorhome flying a small green pirate flag, arriving at a regenerative farm village in the Pacific Northwest. People planting fruit trees in a young food forest, colorful market stalls, musicians playing, tipis and natural timber homes, misty evergreen mountains behind. Hand-painted children's book style, rich texture, hopeful and epic. No text."
2. `ship-art-winwinwin-flywheel.png`: "Painterly storybook illustration of a circular flow diagram on aged parchment: an RV parked idle in a suburban driveway at the top, arrows flowing clockwise to the same RV sailing with a green pirate flag through evergreen forests, to travelers planting trees beside a thriving village food forest, to a small wooden treasure chest sprouting golden coins and seeds that flow back to the RV owner's family, completing the circle. Tiny hand-lettered labels only: idle ship, sets sail, regenerates land, earns for its owner. Warm watercolor treasure-map aesthetic."
3. `ship-art-winter-migration.png`: "Painterly storybook map illustration: a stylized west coast of North America in aged parchment treasure-map style, a brown-and-cream motorhome with a green pirate flag traveling a dotted route south from misty evergreen mountains toward a sunny golden southern coast, a flock of geese flying alongside, small suns and campfires marking stops along the way. Warm watercolor storybook style. No text."
4. `ship-art-perfect-day.png`: "Painterly storybook illustration of one perfect day in nature woven into a single flowing dreamlike scene: friends summiting a small mountain peak at sunrise, a waterfall pool where one swims, a natural spring where a woman fills a glass jug, wild blueberry and blackberry bushes harvested into a basket, and a hammock between pines under early evening stars. Warm hand-painted children's book style, rich color, joyful. No text."

Placement: 1 on `/ship/fleet` hero, 2 in the model section, 3 on the migration/vote block, 4 on the Experience Library page. If image generation is unavailable in the session, build with placeholders and list the four commands for Rye.

---

## 4. Contribution rewards and the Experience Library

### 4.1 Map contributions earn ownership

- **$5 of RV tokens per accepted map location**, every category. New location types to add: `wild_foraging`, `water_restoration`, `community_support` (alongside existing land_project, spring, waterfall, lake, geology, forest, food_forest, seed_site, boondock, event_venue)
- Uncapped, quality-gated: the admin acceptance bar is the control (real, beautiful, useful, accurately placed; imported bulk pins do not earn; only original crew/member submissions)
- On acceptance: ledger credit + notification. Quest action #6 ($ReGen) still applies separately for the Maiden Voyage Quest
- Schema: `ship_rv_token_ledger` (id, userId, amountUsdCents, source enum(map_contribution, experience_contribution, revenue_buyback, manual), refType, refId, note, createdAt). Append-only, mirroring `user_token_ledger` conventions. Balance shown on the player profile ("Your share of the ship") and summed on `/ship/fleet` ("community-owned so far"). On-chain conversion later via the Hypha Bridge with a new intent type; ledger is source of truth until then

### 4.2 The Experience Library (`/ship/experiences`)

Members design **full-day experiences**: "climb this peak at sunrise, dip in this river, drink from this spring, harvest this berry patch, hammock here for the stars."

- Schema: `ship_experiences` (id, authorUserId, title, slug, description, region, bestSeason, durationHours, difficulty enum(gentle, moderate, epic), status enum(submitted, accepted, rejected, featured), heroImageUrl, createdAt) + `ship_experience_steps` (id, experienceId, stepOrder, locationId nullable FK, title, description, timeOfDay)
- Steps link to map pins where possible; an experience renders as a mini-route on the treasure map plus a beautiful day-plan card
- **$20 of RV tokens per accepted experience** (ledger source experience_contribution). Featured tier for the very best
- Concierge integration: accepted experiences are passed into itinerary context; a voyage day can BE an experience ("Day 3: The Umpqua Perfect Day")
- Submission flow mirrors add-to-map: signed in, rate limited, admin review queue

---

## 5. The new giveaway structure (supersedes top-3 everywhere)

**The Maiden Voyage:** the first person to complete the full quest checklist wins the maiden voyage. Completion is paced: a player's quest cannot be marked complete less than 7 days after their first verified action (enforce in the finish-order logic; surface it in copy: "she cannot be won in a sprint, so take your week and do it beautifully"). Ties on the final timestamp resolve by random draw.

**Booking-milestone drawings:** year-one capacity is **40 voyage weeks**. Every time cumulative confirmed booked weeks cross a 20% milestone (8, 16, 24, 32, 40), one free voyage is drawn **randomly among everyone who has completed the quest** by that moment. Default: previous winners are excluded so six different crews sail free (flag for Rye; flip to re-entry if he prefers). Total: 6 free voyages at 100% booked (1 maiden + 5 drawings).

**Why it works (say this on the page):** every completer stays invested in spreading the word, because every booking pushes the next drawing closer. Getting the word out IS the win condition.

**Build:**
- `ship_giveaway_drawings` (id, milestonePercent, bookedWeeksAtDraw, winnerUserId, drawnAt, seed) with an auditable random selection (log the eligible set and seed)
- **Milestone tracker component** on `/ship` and `/ship/quest`: booked-weeks progress bar with treasure-chest markers at 8/16/24/32/40, "next free voyage unlocks in N booked weeks", drawn winners celebrated
- Admin: trigger drawing when a milestone is crossed (auto-detect from confirmed bookings, admin confirms the draw)
- Update ALL prize copy: `/ship` announcement, `/ship/quest`, `/ship/quest/rules` (eligibility, milestones, random selection, exclusion default, ties), leaderboard framing (finish order still shown; first completer takes the maiden voyage)
- Winner voyages still book through the platform via nominal custom offer (church covers), per the main doc

---

## 6. The story article

Draft the blog article telling the whole story of the ReGen Ship for `/blog` (repo has the blog system; check `blog-drafts/` conventions): the pirate ship reborn, the seed chest and the chestnut abundance link, the treasure map and concierge, the quest and exactly how the maiden voyage and the milestone drawings work, the fleet and the ownership model, the migration and the vote. It is the promotional main page in article form; the giveaway mechanics must be inside it, explained beautifully. Rye's voice, STEERING writing rules, no AI-isms. Save as a draft for Rye's review; do not publish without him.

---

## 7. Execution order

1. ADR + domain language additions (Winter Migration, Stop, Offering/Need/Gift, Experience, RV Token Ledger, Milestone Drawing)
2. Migrations: migration vote tables, stops tables, experiences tables, rv token ledger, giveaway drawings, new location types enum extension
3. tRPC: `ship.migration.*` (options, vote, results, admin), `ship.stops.*` (apply, items, list, admin), `ship.experiences.*` (submit, list, get, admin), `ship.rvTokens.myBalance`, `ship.giveaways.*` (status, history, admin draw)
4. Pages/components: vote block + comparison, seasonal location band on booking, `/ship/stops`, `/ship/experiences`, fleet page expansion, milestone tracker, prize copy updates everywhere, profile share balance
5. Concierge: stop items + experiences into context; matching weights
6. Images (Section 3.1) or placeholders + commands
7. Outreach list `SHIP_STOPS_OUTREACH.md` (research pass)
8. Article draft
9. Tests: vote weighting (1x/50x, one vote per member per window), milestone crossing detection, drawing eligibility + exclusion + auditable seed, 7-day completion pacing, ledger append-only math, experience step ordering
10. Ship gate, commit, push, verify Railway SUCCESS, SHIPPED_LOG.md, Handoff Breakdown report

## 8. Handoff Breakdown: Who Does What

### YOU (Rye)

| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Confirm or flip the winner-exclusion default (six different winners vs re-entry) | Owner call | reply in chat |
| 2 | If image generation lacks a key in the session, run the four listed nano-banana-pro commands (or paste a GEMINI_API_KEY) | Key holder | terminal |
| 3 | Send the stop invitations from `SHIP_STOPS_OUTREACH.md` (warm intros beat cold forms) | Relationships | email/DMs |
| 4 | Counsel: add the RV token contribution rewards + giveaway rules to the Task 8 review packet (contribution rewards and buybacks, not securities; milestone sweepstakes mechanics) | Legal judgment | attorney |
| 5 | Open the first migration vote window when the announcement goes out | Timing call | admin panel |

### CLAUDE CODE

Everything else in Sections 1 through 7, autonomously, through a green deploy.

### WAITING ON YOU

- Nothing blocks the build. Images and outreach sends land whenever ready.

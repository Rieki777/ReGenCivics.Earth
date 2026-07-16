# ReGen Ship: Rye's Task Guides (for Cowork browser sessions)

Each task below is self-contained. Open a fresh Cowork session, paste one task block, and Claude will drive your browser where it can and direct you where it cannot (logins, payments, physical steps). Source of truth for the whole program: `CLAUDE_CODE_PROMPT_2026-07-10_REGEN_SHIP.md`.

---

## Task 1: Create the Outdoorsy listing

**Goal:** a live listing at $600/night, instant book OFF, all dates blocked, host verification started.

**Have ready:** RV title/registration info, VIN, photos (Task 5, or use phone shots as placeholders), bank account for payouts (the church account), driver's license.

**Steps:**
1. Go to outdoorsy.com, create a host account (use the church's email identity)
2. List the vehicle: 2006 Fleetwood Revolution LE, 40 ft class A diesel pusher, sleeps 4, 2 bedrooms, 2 bathrooms, 3 slide-outs
3. Paste this description (platform-safe; it must never mention the church offering, our site's booking flow, or any off-platform payment):

> **Everything you need for an epic regenerative adventure.**
>
> The ReGen Ship is a 40-foot luxury diesel pusher unlike anything else on this platform, booked exclusively for a small number of voyages each season and intended for people who care deeply about what they eat, what they breathe, and what touches their skin.
>
> **The healthiest coach on the road.** We chose this 2006 luxury build on purpose: real wood and stone trim, cured decades past off-gassing, instead of the new-RV plastics that never stop smelling like chemicals. She does not stink; she breathes. Every detail has been optimized for health: 100% organic linens and towels, cast iron and natural cookware, organic soaps and body products stocked aboard (the only ones used on the ship), and the microwave removed for a more spacious galley.
>
> **Water like nowhere else.** Whole-coach filtration strips chlorine from any city fill. Filtered showers. Gravity-filtered drinking water. And the part nobody else has: a spring-water intake pump that fills your tanks straight from a living spring up to 50 feet away.
>
> **Fully off-grid, fully connected.** Generator and electrical system meet 100% of your energy needs. Starlink internet anywhere. Propane cooking and hot water. Full-size washing machine with drying stand.
>
> **The adventure pack.** Electric bike, stand-up paddleboard, paddle ball, hammocks, field guides, instruments, and games.
>
> **Room to live.** Three slide-outs, two bedrooms, two bathrooms, and a living room big enough for morning yoga. Designed for a couple; hosts two couples in comfort. Week-long rentals.
>
> We are 100% organic aboard: crews use only the natural products we stock and commit to a plant-based galley. Request to book and tell us about your voyage.

4. Set pricing: $600/night listed, minimum stay one voyage week (check-in Monday, check-out Sunday; set the platform minimum to 6 nights and restrict check-in to Mondays if the platform supports it)
5. Turn instant book OFF (request to book only)
6. Block ALL calendar dates (approved guests get custom offers for their week)
7. Complete host/insurance verification; note the inspection requirement (tires, brakes, LP, gas within 90 days of any departure) and book one with a local mobile RV tech
8. Check whether the host dashboard offers an iCal calendar feed URL; copy it if so
9. Copy the listing URL

**Done when:** listing is live, dates blocked, verification submitted. Save the listing URL and iCal URL (if any) for Task 3.

---

## Task 2: Create the Zeffy donation forms

**Goal:** two Zeffy forms with share URLs: the Voyage Offering and Gift a Voyage.

**Steps:**
1. Log into the existing CORE Zeffy dashboard (zeffy.com)
2. Create form 1, "ReGen Ship Voyage Offering": suggested amount $1,050 (editable by donor), one-time, description: "A voluntary offering to the Church of the Regenerative Earth to keep the ReGen Ship sailing: the seed chest, the treasure map, the healing hole, and the growing fleet. This offering is not a rental payment and is never required to sail."
3. Create form 2, "Gift a Voyage": suggested amount $2,100, description: "Sponsor a land steward or healer's voyage aboard the ReGen Ship. The church council awards gifted voyages to those serving the Regenerative Renaissance."
4. Copy both share URLs

**Done when:** both URLs saved for Task 3. Deductibility wording stays off both forms until counsel review (Task 8) clears language.

---

## Task 3: Railway environment variables

**Goal:** the ship features light up in production.

**Steps:**
1. Log into railway.app, open the ReGen Civics production project, service `ReGenCivics.Earth`, Variables tab
2. Confirm `OPENROUTER_API_KEY` already exists (it powers elderChat and all LLM features through OpenRouter; `AI_MODEL` sets the model). The concierge uses the same key
3. Add the variables the build's handoff names, expected: `SHIP_ZEFFY_OFFERING_URL`, `SHIP_ZEFFY_GIFT_URL`, `SHIP_OUTDOORSY_LISTING_URL`, `SHIP_OUTDOORSY_ICAL_URL` (if Task 1 found one)
4. Redeploy if Railway prompts

**Done when:** variables set and the deploy is green (`pnpm railway:deploys` from the repo also confirms).

---

## Task 4: Buy and install the GPS tracker

**Goal:** live ship position for the treasure map and asset security.

**Criteria:** 4G LTE, hardwire kit (constant power from the coach), and either a public API or webhook/geofence alerts the site can consume. Candidates to compare: Tracki Pro, LandAirSea Overdrive/54, Spytec GL300. Verify API access before buying; if the winner has no API, geofence email alerts still work for security and the map runs on manual pings.

**Steps:**
1. Compare the candidates on 4G coverage in rural Oregon, hardwire kit availability, API/webhook docs, subscription cost
2. Buy the winner + hardwire kit
3. Install concealed with constant power (or have the mobile RV tech from Task 1 do it during inspection)
4. Save API credentials for the build's tracker integration

**Done when:** tracker reports position and credentials are saved.

---

## Task 5: Photo shoot and video walkthrough

**Goal:** the `/ship` gallery and the `/ship/guide` walkthrough content.

**Already done:** 7 exterior beauty shots + 2 clips are staged in the repo at `ship-photos/` (Zion red rock, Cascadia forest, tipis, double rainbow, campfire dusk, desert sunset, Lake Powell overlook). Exteriors are covered.

**Remaining shot list (interiors, golden hour where possible):** living room wide (yoga space) with slides out, both bedrooms, both bathrooms, kitchen with the extra galley space, washing machine; adventure pack staged (e-bike, SUP, paddle ball); the seed chest open; Starlink dish; spring water intake in action at a creek if possible; drone establishing shot at the anchorage.

**Video walkthrough chapters (systems half):** power (shore, generator, inverter), water (city fill, spring pump, filters, tank monitor), propane (cooking, hot water), slides and leveling, washing machine, Starlink, dump procedure at a licensed station, what to do if something beeps.

**Video walkthrough chapters (culture half):** the ship's story, the seed chest and how to log plantings (one QR card in the lid), the water doctrine (only the products aboard, nothing chemical on your body), the plant-based galley, the healing hole homecoming.

**Done when:** photos uploaded through the site's existing image pipeline and video files delivered; Claude Code slots them into the built placeholders.

---

## Task 6: Insurance quotes (year 2 direct + winter posture)

**Goal:** priced path off the platform for year 2, and clarity on winter stationary stays.

**Steps:**
1. roamly.com: request a commercial RV rental quote (2006 Fleetwood Revolution LE, Ashland OR, ~2 to 4 rentals/month seasonal)
2. mbainsurance.net: request their per-rental motorhome rental policy quote
3. Ask both: does coverage differ for stationary on-site stays where the vehicle does not move (the Winter Anchorage program)?
4. Save quotes and answers

**Done when:** both quotes and the stationary-stay answers are saved for the year 2 decision.

---

## Task 7: Oregon DEQ gray water inquiry

**Goal:** the permit pathway for the anchorage's water return practice.

**Steps:**
1. Search "Oregon DEQ graywater reuse and disposal system permit" and read the tier system (Tier 1 is the simple end)
2. Find the DEQ Western Region / Medford office contact (Ashland is Jackson County)
3. Ask: what permit tier fits a single private land site receiving gray water from one RV, and what does the blackwater/composting pathway require?
4. Note requirements and costs; do not commit to anything yet

**Done when:** you know the tier, requirements, and contact for the anchorage's site plan.

---

## Task 8: Counsel review packet

**Goal:** one email to your attorney with everything needing review.

**Assemble (Claude can draft the email from these):**
1. The Voyage Offering structure and guardrails (plan Section 3.3), asking: does our voluntary-offering framing hold, and what receipt/deductibility language should we use?
2. The Maiden Voyage Quest official rules draft (plan Section 5.7): skill contest compliance, any state registration needs
3. The land-partner water agreement points (plan Section 9) and the DEQ findings from Task 7
4. The owner-to-church vehicle use arrangement (Rye owns, church operates)
5. The Winter Anchorage host agreement outline (freeze protection duty, income share)

**Done when:** packet sent; answers folded back into the site copy via a follow-up Claude Code session.

---

## Task 9: Hire the Keeper, set the winter share

**Goal:** a Ship Keeper on the $200/turnover rate and a winter host share policy.

**Steps:**
1. Once `/ship/keeper` is live and applications arrive, review them in the admin panel
2. Interview shortlist (suggested questions: RV systems experience, availability for turnover days, comfort teaching the 2-hour orientation, relationship to the movement)
3. Trial: one paid supervised turnover ($200)
4. Decide the winter host income share starting point (plan suggests 20 to 30%) and tell Claude Code to record it in the winter program copy

**Done when:** Keeper hired and the share policy is answered (plan Section 15).

---

## Task 10: Map data partnerships (you know all of these people)

**Goal:** official data for the treasure map from the orgs already doing this work. All open-source-friendly; a warm message from you unlocks what scraping should not.

**Steps:**
1. **Regenerate Cascadia / Cascadia Department of Bioregion:** ask for the Cascadia bioregion boundary and the nine-regions boundaries as GeoJSON or shapefile (their sites credit "open source GIS data"; the McCloskey shape via the Cascadia Institute is the canonical one). Offer a credit line on `/ship/map`
2. **Find a Spring Foundation:** ask for a Cascadia springs export (or blessing to cross-reference their pages from our pins). Offer: our crews submit their spring updates and water tests back to them
3. **Falling Fruit:** their data is open (CC BY-NC-SA); tell them a church program's free community map is using their Cascadia food-forest data with attribution and ask for their blessing plus any bulk-export guidance. Offer contributions back from crew discoveries
4. Send whatever files arrive to a Claude Code session: "Import these into ship_locations per CLAUDE_CODE_PROMPT_2026-07-10_SHIP_MAP_V2.md Section 6, source-stamped"

**Done when:** boundary file swapped in, springs data flowing, attributions live on the map.

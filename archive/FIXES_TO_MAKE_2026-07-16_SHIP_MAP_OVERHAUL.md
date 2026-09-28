# Fixes to Make: 2026-07-16, Ship Map Overhaul

Scope: https://regencivics.earth/ship/map (the treasure map). Full live-data audit, removal of dead and unclickable elements, and a prioritized improvement plan measured against the strongest map products in this domain.

---

## Part 1: Audit findings (live production data, pulled 2026-07-16)

All numbers came from the public tRPC endpoints on regencivics.earth (anonymous view, so iOverlander crew-gated pins are excluded).

### The data on the board

| Measure | Value |
|---|---|
| Total pins served to the map | 3,260 |
| Verified pins | 47 (1.4%) |
| Unverified pins | 3,213 |
| Source: osm_overpass (bulk import) | 3,198 (98.1%) |
| Source: curated | 19 |
| Source: findaspring_ref | 2 |
| Source: crew / base seeds | 41 |
| Pins with fully generic names ("Spring", "Waterfall", etc.) | 1,744 |
| Springs literally named "Spring" | 1,213 |
| Pins rendered beyond the horizon as dimmed, unclickable ghosts | 1,358 (41.7%) |
| Ship position (`ship.map.position`) | null, so the ⛵ marker never renders |
| Verified seed plantings (`ship.seeds.listVerified`) | 0, so the toggle showed an empty layer |
| Pins matching the "Has water tests" filter | 0, so the pill emptied the board |

By type: 1,690 springs, 1,143 waterfalls, 381 commercial boondocks, 20 boondocks, 6 lakes, 5 geology, 4 land projects, 4 food forests, 3 forests, 2 event venues, 2 seed sites.

### Detail-drawer quality sample

Ten OSM-imported pins sampled at random across the set: zero had a description, website, image, or access notes. The drawer for a bulk OSM pin shows an emoji, a name (often just "Spring"), and the action buttons. Clickable, and close to empty.

### What was dead or unclickable, specifically

1. **Fog ghosts (unclickable by design).** 1,358 pins and their clusters rendered at 30% opacity, grayscaled, `interactive: false`. Pure visual noise: they invited a click and could never receive one.
2. **Seed plantings toggle (dead control).** Zero verified plantings exist, so checking the box did nothing visible.
3. **"Has water tests" pill (dead filter).** Zero pins have a `waterQualityUrl`, so activating it blanked the board.
4. **Empty OSM drawers (dead-feeling data).** 98% of pins open a drawer with no content beyond a name. These stayed on the map because the click does work (voyage building, confirm, flag all function). They are the core data-quality problem and drive most of Part 3.
5. **PMTiles fallback basemap (known carryover).** `ship/basemap.pmtiles` still is not on R2. The live basemap is Esri satellite (ADR-36) and renders fine; the offline fallback remains unshipped (see SHIPPED_LOG 2026-07 entry and RYE_COWORK_TASKS_SHIP_MAP.md).

---

## Part 2: Fixes made today

## Fix 1: Remove unclickable fog-ghost pins and clusters (High)

**Status:** CODED

**Symptom:** 1,358 dimmed tokens and ghost clusters ringed the board and could not be clicked.

**Root cause:** `ClusterLayer` intentionally built a second supercluster index for beyond-horizon pins and rendered them `interactive: false`.

**Fix:** The beyond-horizon board is gone. Only pins within the voyage range render; the fog stays as scenery. Removed the `indexOut` index, the ghost render pass, and the `beyondHorizon` params on `pinIcon` / `clusterIcon`.

**Files changed:** `client/src/pages/ship/shipMapLayers.tsx` (ClusterLayer, pinIcon, clusterIcon)

**Evidence:** `rg -n "indexOut|beyondHorizon" client/src/pages/ship/` returns no matches. Isolated `tsc --noEmit --noResolve` parse of the file: clean.

## Fix 2: Data-gate the Seed plantings toggle (Medium)

**Status:** CODED

**Symptom:** A "Seed plantings" checkbox that changed nothing (0 verified plantings in production).

**Fix:** The toggle only renders when `plantings.data` has at least one entry. It reappears by itself the day the first planting is verified.

**Files changed:** `client/src/pages/ship/ShipMap.tsx` (layer toggles row)

## Fix 3: Data-gate the "Has water tests" filter pill (Medium)

**Status:** CODED

**Symptom:** Activating the pill emptied the board every time (0 matching pins).

**Fix:** New `visibleBoolFilters` memo hides any filter that can never match the live data; today that hides `hasWater`. It reappears when the first water test lands.

**Files changed:** `client/src/pages/ship/ShipMap.tsx` (`visibleBoolFilters`, filter row)

## Fix 4: Copy updates for the cleaned board (Low)

**Status:** CODED

**Fix:** The count line now reads "N more wait past the horizon and join the board when the anchorage moves", and the legend line about dimmed fog tokens now says places past the horizon rest in the fog, off the board. Matches the new rendering truth.

**Files changed:** `client/src/pages/ship/ShipMap.tsx` (count line, legend)

## Fix 5: Every pin opens in Google Maps and Apple Maps (High)

**Status:** CODED

**Symptom:** A pin's detail drawer offered no way to navigate to the place. Only whole-voyage export existed.

**Fix:** Two buttons in the detail drawer of every pin: "Google Maps" (`https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`) and "Apple Maps" (`https://maps.apple.com/?daddr={lat},{lng}&q={name}`). Both open turn-by-turn directions to the pin in a new tab, and on phones the OS hands off to the native app. The voyage panel keeps its existing multi-stop "Open in Google Maps" export (Apple Maps has no reliable multi-stop URL scheme, so route export stays Google + GPX).

**Files changed:** `client/src/pages/ship/ShipMap.tsx` (DetailDrawer actions row)

---

## Part 3: The improvement plan, measured against the best in class

### Who sets the bar

The treasure map competes for trust with four kinds of product:

- **iOverlander** (ioverlander.com): the reference for overlanding POI maps. Its strengths: real places by real travelers, offline support, freshness through check-ins. Its 2024 rebuild (iOverlander 2) added subscriptions and a clunky download flow that pushed users toward alternatives, which shows the bar is trust and simplicity, and that incumbents can fumble it.
- **FreeRoam**: the public-land overlay (BLM / national forest / private, at a glance) is its killer feature, plus crowd ratings on cell signal and road condition.
- **Campendium**: wins on review depth per location: rig size limits, road conditions, carrier-specific cell data.
- **findaspring.org**: the model for springs specifically. Community verification through comments, photos, flow-rate notes, and posted water test results. Our schema already has `waterQualityUrl` waiting for exactly this.

On the engine side, the 2026 consensus (MapLibre docs, jawg.io, Geoapify library statistics): Leaflet remains the right tool for raster tiles plus a moderate number of markers; MapLibre GL JS is the modern default when you need vector tiles, WebGL rendering of tens of thousands of features, data-driven styling, rotation, or 3D terrain. Our current stack (Leaflet + Esri raster + supercluster) is architecturally sound at 3,000 pins. The framework is not the bottleneck. The data is.

### The one-line diagnosis

The map looks rich and plays poor: 98% of its treasure is unverified bulk import with empty drawers, while the 62 genuinely curated places (the actual treasure) drown in them. Every improvement below either turns dead data into gameplay or adds the layers that decide real voyages.

### Tier 1: Data is the product (do these first)

1. **Treasure-first display.** Default the board to verified + curated + crew pins (the ~62 real places), with bulk OSM pins revealed by zoom level or a "show unconfirmed finds" toggle. The board instantly reads as curated treasure instead of OSM noise. Small client change, no schema change.
2. **Verification as gameplay.** The strongest regen-civics-native move available: field verification becomes a quest. A crew visits an unverified spring, confirms it flows, adds a photo and a note, earns $ReGen through the existing quest/bounty rails. The `confirm` endpoint, `verifiedCount`, freshness dates, and flag queue already exist; this is a quest wrapper plus a reward hook. It converts 3,213 dead pins into a live game economy and is exactly how findaspring and iOverlander built trust, except they could not pay their verifiers.
3. **Name enrichment script.** 1,213 springs named "Spring" is unusable in lists, search, and the First Mate. A one-shot script reverse-geocodes each generic-named pin to "Spring near {nearest place / forest}" and stores it. Nominatim or offline gazetteer, rate-limited, source-stamped.
4. **Backfill drawers from OSM tags honestly.** The import kept only name and coordinates. OSM nodes carry elevation, access, seasonal flow, drinking-water legality. Re-run the Overpass import to enrich `description` / `accessNotes` with a "from OpenStreetMap" credit. Zero-content drawers become minimally useful.
5. **Prune what can never matter.** 381 "commercial boondock" pins (rest areas, big-box lots) from OSM within a board meant for regenerative voyaging deserve a look: keep the ~20 within a day of the anchorage, or gate the type behind its filter pill by default.

### Tier 2: The layers that decide real voyages

6. **Public-land overlay.** FreeRoam's most-loved feature. A BLM / USFS / state-land tile layer (PAD-US data, self-hostable as raster or vector tiles) answers the question every boondocker actually has: can I legally sleep here. High impact, moderate effort.
7. **Finish offline.** Upload the already-built PMTiles archive to R2 (one command, listed in the handoff), then cache pins in a service worker beyond the current localStorage seed. Offline is iOverlander's most defended moat and our crews sail out of coverage constantly.
8. **Real drive-time rings.** The gold day-rings are crow-flies circles with a 1.3 road factor. Precomputed isochrones (OSRM or Valhalla, run once per anchorage move) would make "Day 2" mean an actual day of driving through actual mountains. The board becomes honest.
9. **Search on the map.** There is no way to find a pin by name today; the First Mate partially covers this. A small search box over the pins (client-side, the data is already loaded) is cheap and expected.
10. **Cell-coverage hints.** Campendium's carrier data is the model; the FCC broadband map data can approximate it per pin at import time. Valuable for remote-work crews.

### Tier 3: The map's role in the game

11. **Photos and comments on pins.** The review loop is what turned Campendium and findaspring into institutions. Schema addition (`ship_location_reviews`), drawer section, and it compounds with the verification quests in item 2.
12. **Stale-pin quests.** Pins fade at 18 months (already coded). Surface the fading ones as "treasure gone cold" quests so freshness maintains itself.
13. **One network, two maps.** The globe map (/map) holds the alliance and land-project network; the ship map holds 4 land projects. Cascadia-based alliance orgs and land projects belong on the ship board, and verified ship land-projects belong on the globe. One shared source of locations, two lenses.
14. **The anchorage moves.** Everything is already parameterized on `ANCHORAGE`; when the ship position row is finally set, the board, rings, fog, and the 1,358 hidden pins all follow her. Wire `ship.map.position` into `VoyageRangeLayer` and the horizon becomes the living heart of the game.
15. **MapLibre GL migration, when earned.** Trigger conditions: pin count past ~20k, need for rotation / terrain / data-driven styling, or shipping the offline vector basemap as the primary layer. The PMTiles work (ADR-34) already points this direction. Until then Leaflet is the right boat.

### Suggested order

Quick wins this week: 1, 3, 9 (client + one script). The strategic move this season: 2 (verification quests, fully specced in Part 4 below). Highest new-capability value: 6 and 7. Everything else rides behind those.

---

## Part 4: Field Verification Quest, full build spec

Working name: **Ground-Truth the Treasure**. This takes Tier 1 item 2 from strategy to build-ready. It is designed on rails that already exist in the codebase, and each section below says which rail it reuses.

### What already exists (verified in source, 2026-07-16)

| Rail | Where | State |
|---|---|---|
| Quest actions + completions with pending/verified/rejected review | `ship_quest_actions`, `ship_quest_completions`, `ship.quest.submit` | Live. One completion per (user, action), so it cannot host repeatable per-pin work on its own |
| $ReGen payout on verified completion, idempotent, private-ledger only | `rewardVerifiedCompletion` in `server/routes/ship.ts` (source `SHIP_QUEST_SOURCE`, key `ship_quest:{completionId}`), `creditPrivateTokens` in `server/db/tokens.ts` | Live |
| Freshness tap ("Confirmed, still true") | `ship.map.confirm`: bumps `lastVerifiedAt` + `verifiedCount`, rate-limited | Live, unrewarded, no proof |
| Problem flags + admin queue table | `ship_location_flags`, `ship.map.flag` | Live |
| Photo upload to R2 | `campaigns.uploadImage` pattern (base64 in, `storagePut`, URL out) | Live, reusable |
| Auto-verify hook pattern | `awardGalleyQuest(userId, slug, note)`: safe no-op when action unseeded | Live |
| Reward email | `emailQuestActionVerified` | Live |
| Tunable game numbers | `game_variables` | Live |

### The loop, player's view

1. Open any unverified (dashed) pin. The drawer shows **"Verify this treasure · earn $ReGen"** alongside the new Google/Apple Maps buttons that get the crew there.
2. At the place, the crew taps it: photo required, short note required ("flowing strong, pipe at head height"), GPS grabbed silently from `navigator.geolocation` when permitted.
3. Submission lands as pending. The pin immediately shows "a crew has been here, review underway" so effort is visible.
4. A keeper approves it in the admin queue. The crew gets $ReGen in their private ledger, an email, and their name on the pin ("ground-truthed by @handle, July 2026"). The pin flips to verified (solid token) and its freshness clock resets.
5. First-ever verification of a pin pays a frontier bonus. Re-verifying a stale pin (18+ months, the fade threshold already in `shipMapLayers.tsx`) pays a freshness bonus. The map maintains itself.

### Schema (one migration)

```sql
-- drizzle/NNNN_ship_location_verifications.sql
CREATE TABLE ship_location_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  locationId INT NOT NULL,
  userId INT NOT NULL,
  photoUrl VARCHAR(512) NOT NULL,
  note VARCHAR(2000) NOT NULL,
  gpsLat DOUBLE NULL,
  gpsLng DOUBLE NULL,
  distanceMi DOUBLE NULL,             -- haversine(gps, pin) computed at submit
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewNote VARCHAR(500) NULL,
  reviewedByUserId INT NULL,
  reviewedAt TIMESTAMP NULL,
  rewardAmount INT NULL,              -- $ReGen actually paid, for the record
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY ship_loc_verify_once (locationId, userId),
  INDEX ship_loc_verify_status_idx (status),
  INDEX ship_loc_verify_location_idx (locationId)
);
```

The UNIQUE key is the core anti-farm guard: one rewarded verification per crew per place, forever, enforced at the DB layer like the ledger's idempotency key.

### Server (two procedures + one admin procedure)

**`ship.map.verifySubmit`** (protected, rate-limited `ship_map_verify`, reuse `checkRateLimit`):
input `{ id, photoUrl (required, url), note (min 10, max 2000), gpsLat?, gpsLng? }`.
Checks, in order: location exists; no existing row for (location, user); daily cap (count today's submissions by user < `ship_verify_daily_cap`, default 5); if GPS present, compute `distanceMi` with the `haversineMiles` already in `shipMapConfig.ts` (move or mirror server-side) and store it. Insert pending. Never reject on distance at submit time; store it and let the reviewer see "submitted 212 mi from the pin" (people verify from camp wifi later, and hard geo-gates punish honest crews).

**`ship.map.verifyReview`** (admin): input `{ id, approve, reviewNote? }`. On approve, inside one flow:
1. `creditPrivateTokens({ userId, tokenType: "regen", amount, source: "ship_field_verify", sourceId: verificationId, idempotencyKey: "ship_field_verify:" + verificationId, description: "Ground-truthed: {location.name}" })`. Private ledger only, per STEERING section 5.
2. Update the location: `lastVerifiedAt = NOW()`, `verifiedCount + 1`, `isVerified = true` (first approval flips it; policy can later demand two).
3. If the submission included a usable photo and the location has no `imageUrl`, set it (photo credit in the drawer).
4. `awardGalleyQuest(userId, "verify-first-treasure", location.name)`: the one-time Maiden Voyage action (seed row below) auto-verifies on the first approval, bridging into the existing draw without violating the (user, action) uniqueness.
5. Notify: `emailQuestActionVerified`-style email with amount and pin link.

Reward amount at approval time: `base × frontier × freshness` where base = `game_variables.ship_verify_base_regen` (suggest 10), frontier ×2 when `verifiedCount` was 0, freshness ×1.5 when the pin was stale (or never verified and older than 18 months). Cap per Rye's economy: `ship_verify_season_budget` checked as a running SUM over the ledger source tag before crediting; when the pool is dry, approvals still land but pay 0 and say so (the game stays honest).

**Reject path:** status `rejected` + `reviewNote`, no payout, user notified. Repeat-offender signal: 3 rejections puts the user on the existing admin radar (reuse the flags queue view).

**`ship.map.get` addition:** return approved verifications (handle, date, photo) so the drawer can show the ground-truth trail.

### Client

1. **Drawer (`ShipMap.tsx` DetailDrawer):** replace the bare "Confirmed, still true" button with "Verify this treasure · earn $ReGen" for signed-in crews (keep the old tap as a secondary, unrewarded freshness action for already-verified pins). Form: photo picker uploading through the `campaigns.uploadImage` base64 pattern (new `ship.map.uploadVerifyPhoto` or a generalized upload procedure), note field, silent geolocation attempt, submit → toast "Your proof is in. A keeper will review it."
2. **Pin badge:** pending verification renders a small hourglass chip on the drawer; approved history renders "ground-truthed by @handle · {month year}".
3. **Quest surface (`ShipQuest.tsx`):** one seeded action row (below) appears in the Maiden Voyage list; the repeatable earnings live in the drawer flow, shown on the profile ledger like every other `$ReGen` source.
4. **Map affordance:** the "Verified only" filter already exists; verified tokens already render solid. No new map layer work needed.

### Seeds and variables (Rye-run, one script + values)

- `shipQuestActions` row: slug `verify-first-treasure`, title "Ground-truth your first treasure", proofType `photo`, points per Rye (suggest 15), isRequired false.
- `game_variables`: `ship_verify_base_regen` (10), `ship_verify_daily_cap` (5), `ship_verify_season_budget` (Rye's call, e.g. 5,000).

### Anti-fraud summary

DB-unique (location, user); daily submission cap; photo + note required; GPS distance recorded and shown to the reviewer, never auto-rejected; human approval on every payout; idempotent ledger credit; season budget ceiling; rejection trail. This matches the trust model that findaspring and iOverlander run on community review, with the addition that ours pays and ours has a human gate before money moves.

### What this is NOT (scope guards)

No auto-approval in v1 (trusted-verifier fast lane is a v2 lever once patterns are visible). No reward for `flag` (flags are civic duty; paying for problem reports invites invented problems). No reward for the lightweight "still true" tap (it stays as the zero-friction freshness signal). No public wall of pending photos (only approved proof renders).

### Build estimate

Migration + two procedures + admin queue section + drawer form: one focused Claude Code session. Rye's part: run the migration, seed the action + variables, approve the first submissions, tune the numbers.

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| H1 | Run `pnpm check` on the repo, then commit and push the changed files + this doc | The Cowork sandbox reads this repo's files through a mount that truncates recently edited files, so typecheck and git must run on your machine (committing from the sandbox risks committing truncated content) | `pnpm check` then `git add client/src/pages/ship/ShipMap.tsx client/src/pages/ship/shipMapLayers.tsx FIXES_TO_MAKE_2026-07-16_SHIP_MAP_OVERHAUL.md && git commit -m "fix(ship-map): remove unclickable fog ghosts and dead controls, add per-pin Google/Apple Maps buttons" && git push` |
| H2 | Verify the deploy on production | Browser + Railway | Hard-reload https://regencivics.earth/ship/map: no dimmed tokens outside the gold ring, no "Seed plantings" checkbox, no "Has water tests" pill |
| H3 | (Carryover) Upload the offline basemap once from a stable connection | R2 creds are Railway-only, upload kept failing from the VM | `railway run -s "ReGenCivics.Earth" -- npx tsx scripts/build-ship-basemap.ts --skip-extract` |

### CLAUDE CODE: already done or can be done without you

| # | Task | Status | Evidence |
|---|------|--------|----------|
| C1 | Live-data audit of all 3,260 pins, sources, verification, name quality, drawer content | DONE | Part 1 tables; endpoints `ship.map.list` / `ship.map.get` queried 2026-07-16 |
| C2 | Remove fog-ghost pins and clusters from rendering | CODED | `shipMapLayers.tsx`; `rg -n "indexOut|beyondHorizon" client/src/pages/ship/` returns nothing |
| C3 | Data-gate Seed plantings toggle and Has water tests pill | CODED | `ShipMap.tsx` (`visibleBoolFilters`, conditional label) |
| C4 | Update board copy and legend to match | CODED | `ShipMap.tsx` count line + legend |
| C5 | Framework and competitor research grounding Part 3 | DONE | Sources at the end of this doc |
| C6 | Tier 1 items 1, 3, 4, 5 and Tier 2 item 9 (code + scripts) | Ready to build on request | |
| C7 | Google Maps + Apple Maps buttons on every pin drawer | CODED | `ShipMap.tsx` DetailDrawer actions row |
| C8 | Field Verification Quest: migration, `verifySubmit` / `verifyReview` procedures, drawer form, admin queue | Ready to build (full spec in Part 4) | |

### WAITING ON YOU before Claude Code can proceed

- H1 (typecheck + push) gates everything in Part 2 reaching production.
- Any Tier 1 script that writes to the database (name enrichment, OSM re-import) will be written to run on your machine with your `DATABASE_URL`, per the usual split.

---

## Sources for Part 3

- MapLibre vs Leaflet guidance: https://blog.jawg.io/maplibre-gl-vs-leaflet-choosing-the-right-tool-for-your-interactive-map/ , https://www.geoapify.com/map-libraries-comparison-leaflet-vs-maplibre-gl-vs-openlayers-trends-and-statistics/ , https://maplibre.org/maplibre-gl-js/docs/guides/leaflet-migration-guide/ , https://www.pkgpulse.com/guides/mapbox-vs-leaflet-vs-maplibre-interactive-maps-2026
- Boondocking app landscape 2026 (iOverlander 2 backlash, FreeRoam public-land overlay, Campendium review depth): https://dispersedapp.com/blog/best-ioverlander-alternatives/ , https://www.rvmapper.com/blog/best-free-camping-apps , https://boondockorbust.com/boondocking-guide/the-best-apps-for-finding-free-campsites/ , https://ioverlander.com/
- Community spring verification model: https://findaspring.org/ , https://findaspring.org/submit/

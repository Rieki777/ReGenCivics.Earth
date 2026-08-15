# CLAUDE CODE PROMPT: Ship Treasure Map v2 (2026-07-10)

**Status:** Ready to build. Fixes the broken map and rebuilds it as a self-hosted, data-rich Cascadia treasure map.
**Context:** Follows `CLAUDE_CODE_PROMPT_2026-07-10_REGEN_SHIP.md` (the ship shipped; the map is broken in production).

## Kickoff prompt (paste into Claude Code)

> Read CLAUDE_CODE_PROMPT_2026-07-10_SHIP_MAP_V2.md at the repo root and execute it end to end: self-hosted PMTiles basemap on R2, Cascadia bounds and boundary overlay, schema extensions, the Overpass and open-data importers, the add-to-map flow, clustering and the UX upgrades, and the coverage admin view. Then ship gate, commit, push to main, verify the Railway deploy reaches SUCCESS, and report with a Handoff Breakdown.

---

## 1. Why the map is broken (diagnosed)

`ShipMap.tsx` requests raster tiles from `https://{s}.tile.openstreetmap.org/...`, but the CSP in `server/_core/security.ts` line ~71 does not include that domain in `img-src`. The browser blocks every tile request. Pins render (local DOM), tiles never load: the gray box in production.

**The structural fix (decision locked): self-host the basemap immediately.** No OSM tile dependency, no CSP widening. Tiles come from our own R2 (`assets.regencivics.earth`), which `img-src` and `connect-src` already allow. Faster, private, offline-capable later, ~$0 bandwidth (R2 has no egress fees).

## 2. Decisions locked (Rye, 2026-07-10)

| Decision | Choice |
|---|---|
| Basemap | Self-hosted PMTiles on R2, immediately, no OSM interim |
| Data import | Hybrid: bulk open-data import (styled unverified) + hand-curated verified tier |
| Partnerships | Pull whatever is openly accessible from Regenerate Cascadia, Find a Spring, Falling Fruit, Cascadia Department of Bioregion now; Rye gets private permissions where needed (companion Task 10) |
| Map extent | Cascadia bioregion, **US side only for now** |
| Coverage priority | Radiate from Ashland; year 1 operating range is about a 4-day journey, roughly Ashland to Portland, coast to Cascades |

## 3. Self-hosted basemap (PMTiles on R2)

1. **Extract:** script `scripts/build-ship-basemap.ts` downloads the `go-pmtiles` binary and runs `pmtiles extract` against the latest daily build (`build.protomaps.com`) with the US-Cascadia bbox `[-126.0, 39.5, -110.5, 49.5]` (Cape Mendocino to the Canadian border, coast to the continental divide). Expect a 1 to 3 GB file
2. **Upload:** same script uploads `ship/basemap.pmtiles` to R2, following the `scripts/process-core-assets.ts` S3Client pattern and existing R2 creds; use multipart upload for the large file; `--dry-run` flag supported
3. **Serve:** static from `assets.regencivics.earth/ship/basemap.pmtiles`. PMTiles reads via HTTP range requests; confirm R2 serves ranges through the CDN (it does by default; verify the custom-domain cache settings don't strip Range)
4. **Render:** keep react-leaflet; add `pmtiles` + `protomaps-leaflet` and replace the `TileLayer` with the protomaps-leaflet layer reading the R2 URL. Use the light theme with a custom accent tuned to the site palette (parchment/deep green treasure-map feel where cheap to do). Note in the ADR: protomaps-leaflet is in maintenance mode; MapLibre GL is the future upgrade path if we outgrow it
5. **CSP:** no new origins needed (`connect-src` already allows `https://*.regencivics.earth`). Remove the dead OSM tile URL
6. **Attribution:** "© OpenStreetMap contributors, Protomaps" in the map corner (required by both licenses)
7. **Refresh:** re-run the extract quarterly or when the region needs newer OSM edits; document the command in `drizzle/README.md`-style comments at the top of the script

## 4. Cascadia bounds and boundary

- **Lock the viewport:** `maxBounds` to the bbox above (small padding), `minZoom` ~5, `maxZoom` ~15. The map is Cascadia; you cannot scroll to Kansas
- **Boundary overlay:** render the Cascadia bioregion boundary as a styled GeoJSON overlay (soft line, subtle fill outside-mask so the bioregion glows and the rest dims). Store at `shared/data/cascadia-boundary.geojson`
- **Boundary source:** the canonical shape is David McCloskey's (Cascadia Institute), surfaced by the Cascadia Department of Bioregion ("open source GIS data"). Try in order: (1) the CDoB/Regenerate Cascadia public GIS layers (an ArcGIS layer exists), (2) a watershed-composite approximation from USGS HUC boundaries clipped to the bbox, (3) a hand-simplified polygon traced from the published maps, marked `approximate: true`. Rye can get the official shapefile via partnership (companion Task 10); swap it in when it lands
- **Nine regions layer (toggle, off by default):** CDoB publishes simplified nine-region boundaries; import when available via the same partnership. Build the layer toggle now, data later
- US-side only for now: clip display data to US extent; keep the schema bioregion-wide

## 5. Schema extensions (migration at next number, `NNNN_ship_map_v2.sql`)

Add to `ship_locations`:

```
source varchar            -- 'osm_overpass', 'falling_fruit', 'noaa_thermal',
                          --  'curated', 'crew', 'regenerate_cascadia', 'findaspring_ref'
sourceUrl varchar         -- deep link to the origin record (attribution + detail)
sourceLicense varchar     -- 'ODbL', 'CC-BY-NC-SA', 'public_domain', 'original'
externalId varchar        -- origin ID for idempotent re-imports (unique with source)
maxRigLengthFt int        -- boondocks: largest rig confirmed; filter "fits 40 ft"
accessNotes text          -- road quality, turn-around space, cell signal, gates
waterQualityUrl varchar   -- springs: test results link
lastVerifiedAt timestamp  -- most recent human confirmation
verifiedCount int default 0
region varchar            -- nine-regions slug when the layer data lands
```

Composite unique index `(source, externalId)` so importers are safe to re-run.

## 6. Data importers (scripts/, mysql2 pattern, --dry-run on all, source + license stamped on every row)

1. **OSM Overpass (`seed-ship-springs-osm.ts`):** query `natural=spring`, `waterway=waterfall`, and `amenity=drinking_water` within the bbox via the Overpass API (batch by sub-region to respect rate limits). Import as type spring/waterfall, `isVerified=false`, source `osm_overpass`, license ODbL, sourceUrl to the OSM node. Expect hundreds of pins
2. **NOAA/USGS thermal springs (`seed-ship-hotsprings.ts`):** the NOAA/NGDC thermal springs inventory is public domain; filter to the bbox, import as spring with `hot spring` noted in description
3. **Falling Fruit (`seed-ship-foodforest-ff.ts`):** pull the open dataset (CC BY-NC-SA) for the bbox, filter to meaningful clusters (orchards, food forests, notable stands, not single street trees); import as food_forest, attribution preserved. Flag in the script header: license is non-commercial; the map is a free community feature of a church program, and Rye is getting explicit blessing via partnership (companion Task 10)
4. **Curated verified tier (`seed-ship-curated.ts`):** a hand-maintained TS/CSV data file with the quality layer: the anchorage, known land projects (join against existing map/application data), the best springs (each with its findaspring.org reference link as `findaspring_ref` until export permission lands), and **40-ft-confirmed boondocks** researched from USFS/BLM dispersed camping sources, seeded for coverage Tier 1 and 2 (Section 8). Every curated boondock gets maxRigLengthFt, accessNotes, and a gorgeousness bar: only beautiful spots make the treasure map
5. All importers idempotent via `(source, externalId)` upserts

## 7. Add-to-map flow (the button)

- **Prominent "Add to the map" FAB** on `/ship/map` (and a matching action in the concierge chat)
- Tap → crosshair mode → tap the map to drop the pin (or "use my location") → quick form: type, name, one photo, short description, access notes (+ rig length for boondocks) → submits as `crew`-sourced, unverified
- Requires sign-in (existing auth); rate limited; sanitized
- Feeds the existing admin verification queue; verification auto-completes Maiden Voyage Quest action #6 for the contributor and credits `ship_quest` $ReGen
- Unverified pins render translucent/dashed so contributors see their pin instantly without polluting the verified layer

## 8. Coverage plan (the 1-hour goal)

Goal: a beautiful, 40-ft-capable free boondock within a 1-hour drive of anywhere a voyage goes.

- **Tier 1 (seed now):** 60-mile ring around Ashland
- **Tier 2 (seed now):** the year-1 voyage zone, Ashland to Portland: I-5 corridor, southern/central Oregon coast, Cascades volcanic arc (Crater Lake, Umpqua, Willamette NF, Mt Hood)
- **Tier 3 (later):** rest of US Cascadia (WA, ID panhandle, W MT, NorCal)
- **Gap view (admin):** admin map mode drawing 60-min drive proxies (50 mi radius circles v1) around verified boondocks over the Tier 1+2 zone, so gaps are visible and research is targeted. Isochrones (OSRM/Valhalla) are a later upgrade

## 9. Map UX upgrades (build all)

1. **Marker clustering** (leaflet.markercluster or supercluster) so pins never stack into blobs like the screenshot
2. **Detail drawer** on pin tap: photo, description, source attribution + link, access notes, rig fit, water quality link, last-verified date, linked events, "Add to my voyage"
3. **Filter upgrades:** type pills (existing) + "fits 40 ft", "verified only", "has water tests", "free camping"
4. **Voyage route overlay:** the concierge itinerary draws as an ordered dashed route with day numbers; "Add to my voyage" from any pin
5. **Verify-in-the-field:** signed-in crews can tap "Confirmed, still true" (bumps lastVerifiedAt/verifiedCount) or flag a problem; stale pins (18+ months) fade slightly
6. **Ship position pin** (already built) styled distinctly and always on top, "She sails here"
7. **Offline groundwork:** PMTiles + service worker caching of the basemap and pin data for the voyage zone, so the map works where boondocks actually are (no signal). Ship the cache-on-visit basics now, full PWA later
8. **GPX/Google Maps export** per itinerary day so crews can navigate in their nav app
9. **Seed plantings and passport stamps** as celebration layers (toggles), plantings clustered with a bloom animation on verify
10. **Legend + story strip:** collapsible legend explaining pin types in treasure-map language ("Springs: fill her tanks from living water")
11. **Deep links:** `/ship/map?pin=<slug>` and `?type=spring` shareable URLs; og-image for pins later
12. **Performance:** pin data served from a cached tRPC query (5-min staleTime), importer-sized payloads paginated or clustered server-side past ~2,000 pins

## 10. Execution order

1. ADR: self-hosted PMTiles basemap; schema migration (Section 5)
2. Basemap script, run extract + upload (use existing R2 creds; if creds are absent in the local env, emit the exact command for Rye and continue building against the OSM URL behind a dev-only flag)
3. ShipMap rewrite: protomaps-leaflet layer, bounds, boundary overlay, clustering, detail drawer, filters, FAB add-flow, route overlay
4. Importers (Section 6), run with --dry-run, then live; verify counts
5. Admin: verification queue upgrades, gap view, position pin already present
6. Tests: importer idempotency, bbox filtering, add-flow validation, rig-length filter
7. Ship gate, commit, push, verify Railway deploy SUCCESS, update SHIPPED_LOG.md, Handoff Breakdown report

## 11. Handoff Breakdown: Who Does What

### YOU (Rye)

| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Data partnership permissions: Regenerate Cascadia (boundary + nine regions shapefiles), Find a Spring Foundation (Cascadia export or cross-reference blessing), Falling Fruit (blessing for use in a church program), Cascadia Institute (McCloskey shape) | Personal relationships; you know them all | Companion Task 10 |
| 2 | If R2 creds are not in the local env when the basemap script runs, execute the emitted upload command once | Credential holder | terminal, one command |
| 3 | Ground-truth the Tier 1 curated boondocks over time (the 40 ft confirmations only a driver can make) | Physical verification | ongoing, with the Keeper |

### CLAUDE CODE

Everything else in Sections 3 through 10, autonomously, through a green deploy.

### WAITING ON YOU

- Nothing blocks the build. Partnership data (official boundary, FAS export, nine regions) swaps in when it arrives.

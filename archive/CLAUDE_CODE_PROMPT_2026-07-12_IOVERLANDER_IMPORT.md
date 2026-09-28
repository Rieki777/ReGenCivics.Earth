# CLAUDE CODE PROMPT: iOverlander import for the treasure map (2026-07-12)

**Status:** Ready once Rye drops the CSV export(s) into `data/ioverlander/`. Everything else is autonomous.

## Kickoff prompt (paste into Claude Code)

> Read CLAUDE_CODE_PROMPT_2026-07-12_IOVERLANDER_IMPORT.md at the repo root. Build the iOverlander importer for the ship treasure map (Section 2), honoring the permission scope (Section 1). If `data/ioverlander/` has no CSV yet, build and unit-test everything, then stop and tell Rye exactly what to export. If the CSV is there, dry-run, then run live, then verify counts on the map. Ship gate, commit, push, verify Railway SUCCESS, update SHIPPED_LOG.md, report with a Handoff Breakdown.

## 1. Permission + scope (read first)

Rye secured permission from iOverlander on 2026-07-12. The scope is personal use and people we know, so honor it in three ways:

- **Never commit their data.** Add `data/ioverlander/` to `.gitignore` before anything else. The CSV lives only on this machine and in the production DB.
- **Crew-gate the pins.** `ship.map.list` must return `source = "ioverlander"` rows only to authenticated users (signed-in crew are "people we know"). Anonymous visitors never receive them. Same guard on `map.get` for those rows. Keep the filter server-side; do not ship them to the client and hide them there.
- **Credit them.** `source = "ioverlander"`, `sourceLicense = "Used with permission"`, `sourceUrl` linking back to ioverlander.com (per-place URL if the CSV carries an id, site root otherwise). The detail drawer already renders attribution. Add one legend line: "Some places are shared with permission from iOverlander and visible to signed-in crew."

Everything stays removable in one query by `source`, which is the standing promise on all partner data (ADR-35).

## 2. The importer

New script `scripts/seed-ship-ioverlander.ts`, same shape as `seed-ship-commercial-osm.ts` (dry-run flag, `runImport`, idempotent on `(source, externalId)`).

- **Input:** every `*.csv` in `data/ioverlander/`. Parse with `csv-parse` (already a devDep). Inspect the real header before mapping columns; expect at least Name, Category, Description, Latitude, Longitude, plus amenity columns. If the export has a place id column, use it for `externalId` (`ioverlander/<id>`) and the per-place `sourceUrl`; otherwise derive `externalId` from `round(lat,5)/round(lng,5)/slug(name)` so re-imports stay idempotent.
- **Category mapping** (pure helper `classifyIoverlander` in `scripts/ship-import-lib.ts`, unit-tested in `server/ship-map.test.ts`):
  - Wild Camping, Informal Campsite → `boondock`
  - Established Campground → `boondock`, with "established campground, may charge a fee" in accessNotes
  - Walmart, Casino, big-lot categories → `commercial_boondock` (reuse `commercialAccessNote("walmart")` wording for lots)
  - Water, Drinking Water → `spring`
  - Hot Springs → `spring`, keep "hot springs" in the description
  - Everything else (fuel, propane, dump station, laundromat, mechanic, medical, restaurant, wifi, showers, shopping, tourist attraction) → skip; they are services, not treasure
- **Fields:** `isVerified = false` (crews promote the good ones), description from their Description (sanitized, 500 cap), accessNotes from amenity columns worth keeping (Open year-round, max rig length if present maps to `maxRigLengthFt`).
- **Clip** to `inCascadiaPolygon` + bbox like every importer.
- **Run:** `npx tsx scripts/seed-ship-ioverlander.ts --dry-run`, eyeball 25 rows for category sanity (watch for miscategorized services), then live. Report inserted counts by type.

## 3. Verify

- Unit tests green (`npx cross-env NODE_ENV=test vitest run server/ship-map.test.ts`); note the machine's global `NODE_ENV=production` breaks vitest without cross-env.
- Signed-out `map.list` response contains zero `ioverlander` rows (integration-style guard test alongside the existing router guards).
- Live map: signed in shows the new pins; a private window does not.
- Standard flow after that: ship gate, commit `feat(ship-map): ...`, push to main, poll `pnpm railway:deploys` to SUCCESS. SHIPPED_LOG entry. (The `-s "ReGenCivics.Earth"` workaround this line used to spell out is now baked into the `railway:*` scripts in package.json.)

## 4. Also waiting in this area (do not block on them)

- **Four chakra nodes**: when Rye names the lands for sacral, solar plexus, throat, and third eye, fill place/lat/lng in `CHAKRA_POINTS` (`client/src/pages/ship/shipMapConfig.ts`). One edit lights each node on the map, the energy line, and the Inner Compass poster.
- **Voyage range**: currently 125 road mi/day × 3 days. Raising `ROAD_MILES_PER_DAY` reopens the board when she is ready to range farther.

## Handoff Breakdown

### YOU (Rye)
| # | Task | Why |
|---|------|-----|
| 1 | Log into app.ioverlander.com (Unlimited plan) and export CSV for the region: United States is fine, or OR / WA / CA / ID separately. Save into `data/ioverlander/` at the repo root | Export needs your account |
| 2 | Confirm crew-gating matches what you agreed with iOverlander (Section 1). If they blessed fully public display, say so and Claude Code drops the auth filter | Only you know the conversation |

### CLAUDE CODE
Everything else: gitignore, importer + tests, gated `map.list`/`map.get`, legend line, dry-run, live import, verification, ship gate, deploy, SHIPPED_LOG.

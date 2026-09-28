# CLAUDE CODE PROMPT: Ship Map Addendum, Basemap Upload + First Mate + Dataset Door (2026-07-10)

**Status:** Three items. Item 1 is the blocking production fix; do it first.

## Kickoff prompt (paste into Claude Code)

> Read CLAUDE_CODE_PROMPT_2026-07-10_SHIP_MAP_ADDENDUM.md at the repo root. FIRST run the basemap upload via `railway run` so the live treasure map renders (Section 1) and verify it on the live site. Then build the First Mate voyage-planning section on the map page (Section 2) and the "add your database to the map" flow (Section 3). Ship gate, commit, push, verify Railway SUCCESS, update SHIPPED_LOG.md, report with a Handoff Breakdown.

---

## 1. FIRST: upload the basemap (why the map is gray)

The map v2 code is correct and deployed; `assets.regencivics.earth/ship/basemap.pmtiles` was simply never uploaded (R2 creds are Railway-only; the shipped log recorded this carryover). protomaps-leaflet fetches a file that 404s and draws nothing.

**The fix, one command from repo root** (Railway CLI is logged in; `railway run` injects the service env vars, including the five AWS_* R2 creds, into the local process):

```bash
railway run -- npx tsx scripts/build-ship-basemap.ts
```

Notes: the extract downloads 1 to 3 GB from build.protomaps.com and then multipart-uploads to R2; allow 15 to 45 minutes. If `railway run` misbehaves on Windows, fallback: copy AWS_BUCKET_NAME, AWS_REGION, AWS_ENDPOINT_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY from the Railway dashboard into `.env`, run `npx tsx scripts/build-ship-basemap.ts`, then remove them from `.env`.

**Verify:** no deploy needed. Hard-reload https://regencivics.earth/ship/map and confirm terrain renders inside the bioregion glow. Also confirm the archive answers range requests (the browser network tab should show 206 responses on basemap.pmtiles).

## 2. The First Mate: plan your voyage on the map

Rye wants the concierge present ON the map page as a voyage-planning companion, and named.

- **Rename the concierge persona to "the First Mate"** everywhere (page copy, chat greeting, nav label stays /ship/concierge). Add to DOMAIN-LANGUAGE.md. She greets: "Ahoy. I'm your First Mate. Tell me who you are and I'll chart your voyage."
- **Map page section:** under the map, a "Plan your voyage with the First Mate" band: short invitation copy + either an embedded compact chat panel (reuse the ShipConcierge components in a drawer that slides over the map on mobile, side panel on desktop) or, if reuse is heavy, a strong CTA into /ship/concierge with `?return=map`
- **Grounded in the whole database:** the First Mate's context already includes verified locations and stop offerings; ensure it also receives experiences, events, and the new categories (wild_foraging, water_restoration, community_support) as they land, and mention in her intro that the database is community-grown and always growing
- **Route on the map:** when the First Mate produces an itinerary, draw it live via the existing VoyageRoute layer and pan to it; "My voyage" and her plan share the same state

## 3. The dataset door: "Add your database to the map"

A button at the bottom of the map page: **"Have a project or network in the Regenerative Renaissance? Add your database to the map."**

- Opens a short form: organization/network name, contact name + email, what the dataset holds (free text), approximate number of places, a link to the data or its home, license/permission statement (checkbox: "we have the right to share this data and welcome its use on the treasure map, with attribution")
- Schema: `ship_dataset_offers` (id, orgName, contactName, email, description, approxCount, dataUrl, licenseNote, status enum(submitted, reviewing, imported, declined), createdAt). Public, rate limited, sanitized per BUILD-PLAYBOOK
- Admin queue tab; on acceptance, the data flows through the existing source-stamped importer conventions (source = org slug, sourceUrl, sourceLicense) so every partner dataset is idempotent and attributed on the pins
- Confirmation email thanks them and sets expectations; notify Rye
- Attribution promise on the form and in the map legend: partner datasets get a credit line

## Handoff Breakdown

### YOU (Rye)
| # | Task | Why |
|---|------|-----|
| 1 | Nothing for items 2 and 3. For item 1, only if `railway run` fails on this machine: paste the five AWS_* values from Railway into .env for one run | Credential holder |

### CLAUDE CODE
All three sections, autonomously, through a green deploy. Item 1 requires no deploy; verify it live immediately.

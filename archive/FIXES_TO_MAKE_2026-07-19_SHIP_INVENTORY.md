# Ship Inventory — Build & Handoff (2026-07-19)

Raw RV walkthrough videos → transcribed → structured 118-item inventory →
published as a live page at **/ship/inventory**, backed by a new `ship_inventory`
table on Railway.

---

## What shipped

**Source videos** (`C:\Users\taren\Downloads\Photos-1-001.zip`) — a 2006 Fleetwood
Revolution LE walkthrough, narrated inventory:

| Video | Length | What it covers |
|-------|--------|----------------|
| IMG_1048.MOV | 6:24 | Power, water, adventure gear ("part 1") |
| IMG_1051.MOV | 14:33 | Tools & mechanical (indoor + outdoor tool bags) |
| IMG_1053.MOV | 1:54 | Exterior bays / containers |
| **Total** | **~22:51** | **118 distinct items** |

**Transcription:** faster-whisper `small.en` (CPU, int8), English, with `[mm:ss]`
timestamps. 295 segments total.

**Structure:** one record per named item — `{ id, name, quantity, unit, category,
zone, location, condition, notes, source_video, timestamp, confidence }`. No items
invented; unclear audio flagged `confidence: low`. 76 high / 38 medium / 4 low.

---

## Local output files

| File | Path |
|------|------|
| Full transcript (all 3 videos) | `C:\Users\taren\Downloads\rv-inventory-output\rv_transcripts_full.txt` |
| Per-video transcripts | `rv-inventory-output\transcript_IMG_10{48,51,53}.txt` |
| Per-video segment JSON | `rv-inventory-output\segments_IMG_10{48,51,53}.json` + `rv_segments_all.json` |
| Structured inventory (JSON) | `rv-inventory-output\rv_inventory.json` |
| Readable checklist (Markdown) | `rv-inventory-output\rv_inventory.md` |
| Seed source-of-truth (in repo) | `regen-civics-clean\data\rv_inventory.json` |

---

## Code changes — branch `ship-inventory-manifest` (commit `79fc0ca`)

9 files, targeted `git add` (the working tree had unrelated uncommitted work from
other sessions — none of it was swept into this commit).

**New files**

- `drizzle/0208_ship_inventory.sql` — creates `ship_inventory` (id PK, name, quantity,
  unit, category, zone, location, itemCondition, notes, sourceVideo, sourceTimestamp,
  confidence, createdAt, updatedAt).
- `scripts/seed-ship-inventory-manifest.ts` — idempotent upsert-on-`id` seed reading
  `data/rv_inventory.json`. Flags: `--dry-run`, `--reset`.
- `server/routes/shipManifest.ts` — `shipManifest.list` public tRPC query.
- `client/src/pages/ship/ShipManifest.tsx` — the `/ship/inventory` page (zone grouping,
  category filter, search box). `source_video`/`timestamp` stored but not shown.
- `data/rv_inventory.json` — 118 items.

**Modified files**

- `drizzle/schema.ts` — `shipInventory` Drizzle table (appended at end).
- `server/routers.ts` — registered `shipManifest` router.
- `client/src/App.tsx` — lazy import + `<Route path="/ship/inventory">`.
- `client/src/pages/ship/Ship.tsx` — link from `/ship` to the full inventory.

**Design notes**

- This is a **new, separate** table/feature from the existing gamified
  `ship_inventory_items` ("the bag" on `/ship`, migration 0183). Different data,
  different purpose. Nothing about the bag was changed.
- DB column names use the repo's camelCase convention; two record fields were renamed
  to dodge MySQL reserved words: `condition → itemCondition`, `timestamp →
  sourceTimestamp`, plus `source_video → sourceVideo`. The JSON keeps the original
  field names; the seed maps them.
- Migration numbered `0208` to match repo convention (duplicate numbers are normal
  here). A separate, unrelated `0208_ship_inventory_corrections.sql` (another session's
  work on the *bag*) also exists — they don't collide.

---

## Verification done this session

| Check | Result |
|-------|--------|
| `tsc --noEmit` (`pnpm check`) | PASS — zero type errors |
| `vite build` client bundle | PASS — 4939 modules, `ShipManifest-*.js` chunk emitted |
| Migration `0208_ship_inventory.sql` | APPLIED to Railway (live) |
| Seed (118 rows) | APPLIED to Railway — `ship_inventory` now has 118 rows |

Note: the full `vite build` stops at the very end on the PWA/workbox
service-worker step — this is the known **local-only** workbox failure (documented
in the repo's Windows dev gotchas); it does not occur on Railway and did not touch
the bundle, which completed and emitted the page chunk.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Push the branch | Claude can't `git push` (credentials/remote) | `git push -u origin ship-inventory-manifest` |
| 2 | Open PR & merge to `main` (or merge locally) | Repo ownership / review | GitHub PR from `ship-inventory-manifest`, or `git checkout main; git merge ship-inventory-manifest` |
| 3 | Deploy | Railway deploy is yours | `pnpm railway:deploy` (`railway up -s "ReGenCivics.Earth"`) or auto-deploy on merge |
| 4 | Verify live | Browser action | Visit `https://regencivics.earth/ship/inventory` — should list 118 items by zone; check the link from `/ship` |

### CLAUDE CODE — already done

| # | Task | Status |
|---|------|--------|
| 5 | Transcribe 3 videos with timestamps | DONE |
| 6 | Structure 118-item inventory (JSON + MD) | DONE |
| 7 | `ship_inventory` table + migration 0208 | DONE + APPLIED (Railway) |
| 8 | Idempotent seed script | DONE + RAN (118 rows on Railway) |
| 9 | `/ship/inventory` page + route + `/ship` link + tRPC query | CODED (compiles + bundles) |
| 10 | Commit on branch `ship-inventory-manifest` (`79fc0ca`) | DONE |

### WAITING ON YOU before anything else

- Nothing blocks the feature — the DB is already seeded on production. Only **push +
  deploy** (steps 1–3) stand between here and it being live. The data will appear the
  moment the code deploys.

### Optional follow-ups

- **`Photos-2-001.zip`** — in video 3 the narrator says the *water section* was
  "covered in a previous video." That earlier video is almost certainly in
  `Photos-2-001.zip` (also in your Downloads). Say the word and I'll transcribe it and
  extend the inventory (the seed is idempotent, so re-running just adds/updates rows).
- If you'd rather this feed the existing "bag" UI instead of a separate page, that's a
  different merge — happy to do it.
- Re-seed after any edits to `data/rv_inventory.json`:
  `pnpm exec tsx scripts/seed-ship-inventory-manifest.ts` (add `--dry-run` to preview).

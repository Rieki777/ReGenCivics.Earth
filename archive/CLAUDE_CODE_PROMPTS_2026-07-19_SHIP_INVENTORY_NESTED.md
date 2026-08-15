# Ship Inventory → Nested + Mechanic-aware — 4 pass-off prompts

Pass these to Claude Code **in order**. Prompt 1 is the foundation; 2, 3, and 4 each
only need Prompt 1 done. This supersedes the earlier single-file prompt.

## Shared context (applies to every prompt)

- **Repo:** regencivics.earth. **Branch:** continue on `ship-inventory-manifest`
  (commit `79fc0ca`, not pushed). Use skills `regen-database-sql` + `regen-fixes-handoff`.
- **Guardrails:** other Claude sessions edit this repo — use **targeted `git add`**,
  never `-A`. Don't push, don't deploy, no destructive SQL. `pnpm check` = tsc. The
  local `vite build` fails only at the workbox step (known, ignore). End every pass
  with a Handoff Breakdown.
- **Goal:** merge the 118-item physical manifest (`data/rv_inventory.json`, seeded this
  session into a standalone `ship_inventory` table) **into the gamified bag**
  (`ship_inventory_items`) as a **nested tree**. The `/ship` overview shows ~20–30
  beautiful **top-level icon cards** (building on the current 17). Clicking a card that
  has contents opens a **breadcrumbed sub-page** with a **category-grouped list** of its
  items — each shown with a **real photo pulled from the walkthrough video** (no
  per-item generated icons). Only the ~20–30 top-level cards get polished generated icons.
- **Existing `ship_inventory_items` columns:** id(int PK), name, slug(unique),
  category enum(adventure,galley,water,power,connectivity,tools,magic,comfort,safety),
  description, lore, iconUrl, photoUrl, quantity, storagePlace, activityTags(json),
  isVisible, isGearChecked, sortOrder, createdAt, updatedAt (+ `comingYear2` from the
  in-flight `0208_ship_inventory_corrections.sql`). Public read: `ship.inventory.list`.
  Admin CRUD: `ship.inventory.upsertInventory` / `deleteInventory` (adminProcedure).
  Bag UI: `client/src/components/ship/ShipInventory.tsx`; admin at `/admin/ship`.
- **Owner gate:** the inline add/edit button and all writes are for the owner
  (`rieki.cordon@gmail.com`) / admins — reuse the same owner-gating the Harvest uses.

================================================================================
## ▶ PROMPT 1 of 4 — Data model, merge seed, tree API (backend foundation)
================================================================================
Phases 0–3. Do this first.

**Phase 0 — retire the standalone path.** Remove `server/routes/shipManifest.ts` + its
registration in `server/routers.ts`; remove the standalone `ship_inventory` Drizzle
table from `drizzle/schema.ts`; the `/ship/inventory` route will be rebuilt in Prompt 2.
Keep `data/rv_inventory.json` as the source of truth. Leave the already-applied
`ship_inventory` DB table in place (note in handoff that Rye may drop it later — no
destructive migration).

**Phase 1 — schema (new migration, next unused number; check `ls drizzle/ | sort | tail`,
likely `0209_ship_inventory_nesting.sql`; dup numbers are fine here).** Add to
`ship_inventory_items`, mirrored in `drizzle/schema.ts`:
`parentId int NULL` (self-FK, indexed), `isContainer boolean NOT NULL DEFAULT false`,
`provenance enum('curated','transcribed','curator_added') NOT NULL DEFAULT 'curated'`,
`zone varchar(40)`, `unit varchar(40)`, `itemCondition varchar(60)`,
`confidence varchar(12)`, `sourceVideo varchar(120)`, `sourceTimestamp varchar(12)`,
`frameUrl varchar(512)` (real photo; overview uses iconUrl, detail uses frameUrl),
`manifestCategory varchar(40)` (keep the 15-value manifest taxonomy here; don't remap
lossily into the 9-value enum). If `comingYear2` isn't in `schema.ts` yet, add it too.

**Phase 2 — merge seed.** Rewrite `scripts/seed-ship-inventory-manifest.ts` to upsert the
118 items **into `ship_inventory_items`** (idempotent **by slug**; slug from name). Map:
location→storagePlace, condition→itemCondition, plus zone/unit/confidence/sourceVideo/
sourceTimestamp/manifestCategory/quantity, provenance='transcribed', and map
manifestCategory→closest `category` enum for glyph fallback. Then build the tree:
- **Promote container nodes to top-level** so the overview reaches ~20–30 hero cards
  (provenance='curator_added', isContainer=true, isVisible=true, top-level = parentId
  NULL): the **Indoor tool bag** (inside RV: upper cupboards + main galley), **Outdoor
  tool bag** (passenger-side tool section), **Exterior bottom cupboard** (last exterior
  door, bottom), **Power system**, **Water & sewer kit**, **Sealants, adhesives & tape
  kit**, **Screw & fastener box**, **Long-term storage bay**, **Exterior storage bays**.
- **Parent the transcribed items** under those via zone/location (auto-suggest);
  anything ambiguous → parentId NULL + flag for admin review; print inserted/merged/
  parented/review counts.
- **Merge into existing curated cards (no duplicates):** nest the real kit under
  `stand-up-paddleboard` — **the two paddles, the boards, the pump, the ankle leashes,
  and three fins each** (Rye-supplied). Dedupe `starlink-dish`, `hammocks`, `tool-bag`
  (make it the parent of the tool bags), `spring-water-intake-pump`, the in-line
  drinking-water filter, `generator`, `safety-kit` against their manifest twins.
- Within each tool bag, the items are grouped by `manifestCategory` (4+ categories) —
  no schema work, the UI groups them in Prompt 2.

**Phase 3 — tree API.** Extend `ship.inventory.list` (public) to also return `parentId`,
`frameUrl`, `manifestCategory`, `storagePlace`, `isContainer`. Add
`ship.inventory.get` (public): input `{ slug }` → `{ item, children, breadcrumb[] }`
(walk up parentId). Extend admin `upsertInventory` to accept `parentId` + the new fields.

**Verify:** `pnpm check`; `pnpm db:migrate:status`; seed `--dry-run`; confirm top-level
count ~20–30 and total children parented. **Handoff:** Rye runs the migration + seed.

================================================================================
## ▶ PROMPT 2 of 4 — UI: overview grid + drill-down lists + inline admin editor
================================================================================
Phases 4 + 6. Needs Prompt 1.

**Overview** (`/ship` bag section in `ShipInventory.tsx` and the `/ship/inventory` root):
render **top-level nodes only** (parentId NULL) as the existing beautiful icon cards.
Container cards get a **gold ring**, a **"×N inside"** count badge, and a chevron; leaf
cards get no ring. Cards are real links/buttons (keyboard + aria correct). Overview uses
`iconUrl` (glyph fallback) — never frames.

**Detail sub-page** `/ship/inventory/:slug` (breadcrumb trail, e.g. RV ▸ Tool section ▸
Outdoor tool bag):
- If children are themselves containers (e.g. Tools → the 3 bags) → show them as
  drillable cards.
- If children are leaf items → a **list grouped by `manifestCategory`** (the "4+
  categories per bag"), each row = **real photo thumbnail** (`frameUrl`, glyph fallback)
  + name + qty/unit + storagePlace + condition/notes. Not an icon grid; no generated
  per-item images.
- **Search pierces the tree** (match nested items, show their breadcrumb path); category
  filter flattens across levels.
- Repurpose `ShipManifest.tsx` for this; keep the `/ship/inventory` route; each `/ship`
  bag card links to its detail page.

**Inline admin editor (Phase 6):** when the logged-in user is the owner
(`rieki.cordon@gmail.com`) / admin, show **"+ Add gear"** and **"Edit"** buttons right in
the inventory (overview + detail). Modal form: name, parent (container dropdown),
category + manifestCategory, quantity/unit, storagePlace/zone, description/notes,
isVisible, comingYear2, and image upload (icon for top-level, photo/frame otherwise).
Wire to the admin `upsertInventory`/`deleteInventory` (owner/admin-gated). Reuse the
Harvest's owner-gating so the buttons never show when logged out.

**Verify:** `pnpm check`; vite bundles the pages; buttons hidden when not owner; drill
paths + search work. **Handoff:** Rye deploys + eyeballs `/ship/inventory`.

================================================================================
## ▶ PROMPT 3 of 4 — Real video-frame photos + top-level icons (Rye-run scripts)
================================================================================
Phase 5. Needs Prompt 1.

Add `scripts/extract-ship-frames.ts`: for each `provenance='transcribed'` item with
`sourceVideo` + `sourceTimestamp`, ffmpeg-grab the frame at that timestamp from the
walkthrough MOV in `C:\Users\taren\Downloads\rv-inventory-work\`, upload to R2
(`regen-civics-assets`, served at `assets.regencivics.earth` — see R2 routing notes) or
`client/public/ship/frames/`, and set `frameUrl`. Idempotent (skip if set); reasonable
JPG size. Generate polished icons **only for the ~20–30 top-level nodes** via
`scripts/generate-ship-item-icon.ts` — never 118 icons.

**Verify:** frames exist + `frameUrl` populated; overview shows icons, detail shows real
photos. **Handoff:** Rye runs both (needs the local videos + R2 creds).

================================================================================
## ▶ PROMPT 4 of 4 — Mechanic (Shipwright) tool-awareness
================================================================================
Phase 7. Needs Prompt 1.

Make the maintenance AI know what tools are aboard and where. Add a helper
(`server/lib/ship-inventory-context.ts`) that returns repair-relevant inventory —
items whose `manifestCategory`/`category` is tools/electrical/plumbing/safety — as a
compact, token-bounded list of `{ name, quantity, location }`, where `location` is the
full breadcrumb path ("Outdoor tool bag ▸ Tool section, passenger side"). Inject it into
the Shipwright: find the `askShipwright(` call in `server/routes/ship.ts` and pass this
tool context, mirroring the concierge's inventory injection (search the comment "The
First Mate knows the bag"). Update the Shipwright prompt in
`server/lib/ship-shipwright.ts` so it (a) suggests tools **only** from the provided list,
(b) tells the user **where** each one is stored, and (c) never invents tools not aboard.

**Verify:** extend `server/ship-shipwright.test.ts` — a repair question returns a reply
naming a real tool + its storage location; `pnpm check`. **Handoff:** none extra.

--------------------------------------------------------------------------------
## Combined Handoff Breakdown

### YOU (Rye)
| # | Task | Command / Where |
|---|------|-----------------|
| 1 | Run nesting migration (after Prompt 1) | `pnpm db:migrate drizzle/0209_ship_inventory_nesting.sql` |
| 2 | Run merge seed | `pnpm exec tsx scripts/seed-ship-inventory-manifest.ts` (`--dry-run` first) |
| 3 | Extract frames + generate top-level icons (after Prompt 3) | `pnpm exec tsx scripts/extract-ship-frames.ts` |
| 4 | Curate nesting via the inline editor | `/ship/inventory` while logged in as owner |
| 5 | Push + PR + deploy + verify | `git push`; Railway; check `/ship/inventory` + ask the Shipwright a repair question |

### CLAUDE CODE (per pass)
| Pass | Deliverable | Status |
|------|-------------|--------|
| 1 | Schema + merge seed + tree API | to build |
| 2 | Overview + drill-down lists + inline owner editor | to build |
| 3 | Frame-extraction + top-level icon scripts | to build |
| 4 | Shipwright tool-awareness | to build |

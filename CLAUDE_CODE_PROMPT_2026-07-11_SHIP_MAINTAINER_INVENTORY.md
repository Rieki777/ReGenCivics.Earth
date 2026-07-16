# CLAUDE CODE PROMPT: The Shipwright, the Captain's Book, the Inventory Bag + Booking Windows (2026-07-11)

**Status:** Ready to build. The ship maintainer AI, the Captain's Book for active voyagers, the game-style inventory, the driving doctrine, year-2 bookings open now, and the new voyage cycle.

## Kickoff prompt (paste into Claude Code)

> Read CLAUDE_CODE_PROMPT_2026-07-11_SHIP_MAINTAINER_INVENTORY.md at the repo root and execute it: the Shipwright maintainer companion with its knowledge base and learning case log, the Captain's Book active-voyager hub (maintenance log, crew roles, pre-sail checklist, captains' timeline), the Ship's Inventory system with the icon pipeline and activity search, the driving doctrine copy (MCS, captain framing, cannabis rule, her quirks), the two-year booking window with year-2 pricing, and the Sunday-into-Monday turnover cycle. Ship gate, commit, push, verify Railway SUCCESS, update SHIPPED_LOG.md, report with a Handoff Breakdown.

---

## 1. The Shipwright: the ship maintainer AI

A dedicated maintainer companion grounded in everything knowable about the 2006 Fleetwood Revolution LE on the Spartan chassis. Voyagers with a problem talk to it (photos welcome); every resolved case makes it smarter for the next crew.

### 1.1 Persona

**The Shipwright** (placeholder name, Rye can rename): sleeves rolled, knows every bolt on her. Portrait via nano-banana-pro, same painterly style: "Painterly storybook portrait, head and shoulders, of a capable woman in her 50s in oil-stained canvas overalls, a wrench in her breast pocket and reading glasses pushed up into gray-streaked hair, the warm interior of a vintage motorhome engine bay glowing behind her, hand-painted children's book style, confident kind expression. No text." Filename `persona-shipwright.png`.

### 1.2 Architecture: retrieval, not training

No fine-tuning. The Shipwright is `invokeLLM` (OpenRouter, vision-capable model for photos; set `AI_MODEL` accordingly or use a per-feature model override) + retrieval over two growing stores:

```
ship_knowledge_chunks: id, title, content text, system enum(chassis, engine, propane,
  electrical, plumbing, slides, generator, appliances, starlink, water_filtration,
  tires_brakes, hvac, general), sourceType enum(manual, service_bulletin, forum_wisdom,
  resolved_case), sourceRef, tags json, isApproved bool, createdAt

ship_maintenance_cases: id, bookingId nullable, reportedByUserId, system enum (same),
  title, description text, photoUrls json, conversation json, status enum(open,
  advised, resolved, escalated), resolution text, whatWorked text,
  approvedIntoKb bool default false, createdAt, resolvedAt
```

- **Retrieval v1:** MySQL FULLTEXT index on `ship_knowledge_chunks.content` + system/tag filtering; the Shipwright's context gets the top matching approved chunks plus similar resolved cases (same system, keyword overlap). Embeddings are a v2 upgrade; build the retrieval behind an interface so swapping is config, not rewrite
- **Photos:** voyagers attach photos (existing image upload pipeline); passed to the vision model with the question
- **The learning loop:** when a case resolves, the Shipwright drafts a knowledge chunk (symptom, cause, fix, what worked) from the case; it enters the KB **only after human approval** (admin queue; Rye or the Keeper approves). Bad advice must never compound automatically
- **Seed the KB:** research pass in this build: public documentation for the 2006 Fleetwood Revolution LE and Spartan Mountain Master chassis (owner manual sections, Spartan chassis guides, common issues from iRV2/forum wisdom for this model family: slide-out motors, Aqua-Hot if fitted, generator transfer switch, chassis air systems), chunked by system with sourceRef links. Mark all `isApproved=true` only for manufacturer-manual content; forum wisdom enters as `isApproved=false` pending review

### 1.3 Safety rails (non-negotiable)

- **Escalation systems:** propane smell or leak, brake behavior, steering, chassis air loss, electrical burning smell, fire, CO alarm: the Shipwright gives immediate make-safe steps only (shut off, ventilate, pull over, exit) and escalates to the Keeper hotline + professional service. It never coaches DIY repair on these systems. Hard-code the trigger list server-side, not just in the prompt
- Every answer footer: "If anything feels unsafe, stop and call your Keeper."
- Case log shows escalations prominently in admin

### 1.4 Surfaces

- `/ship/guide` gains "Ask the Shipwright" (and the QR placard copy mentions her)
- Mid-voyage: the First Mate hands off maintenance questions to the Shipwright in character
- Admin: cases queue, approve-into-KB flow, escalations view

## 1.5 The Captain's Book (the active voyager's hub)

Rework the active-voyage surface (`/ship/voyage` or equivalent of "my current voyage") into **the Captain's Book**: everything a crew needs mid-journey, unlocked while a booking is `active` (and visible read-only to past captains for their own voyages).

**Chapters:**

1. **The Shipwright:** ask-a-question entry (Section 1) front and center
2. **The Maintenance Log:** easy to reach, easy to add. Every entry: system, note, optional photos, severity. Entries feed `ship_maintenance_cases`; the Keeper and admin see the running log across voyages, so the ship's health has a continuous history
3. **The Captain's Manual:** Rye's videos, recordings, and articles about running her (structured placeholders now, slots fill as he records; reuse the /ship/guide content architecture so nothing is written twice)
4. **The Log itself:** the crew's voyage log (existing ship_log_entries) with photo uploads, presented as a beautiful captain's journal. Public timeline of every captain who has ever sailed her lives on `/ship/log`, newest voyage first, so the Book is also her living history
5. **Crew roles:** every voyage assigns roles, playfully but truly:
   - **The Captain:** the driver, head of the ship, fully responsible for her: damage, accidents, everything aboard while under way
   - **The Navigator:** right seat, captain's assistant. Charts the route, works the treasure map, watches points of interest, handles anything the ship needs during the drive, keeps good order. Road snacks permitted, though the ship's way is stopping to make food and share a view
   - **The Quartermaster** (crews of 3+): provisions, water levels, tanks, the inventory bag, take-and-replenish of the pantry
   - **The Bosun** (crews of 3+): setup and breakdown: slides, jacks, hookups, awning, securing the deck
   - **The Seed Keeper** (any crew, often a kid): guards the treasure chest, logs every planting, stamps the passport
   Solo couples wear multiple hats; the Book shows who holds what for this voyage (simple picker, stored on the booking)
6. **The Pre-Sail Checklist:** interactive tap-through before every drive, in her voice ("You're about to take your house through an earthquake. Secure everything that can fall, because it will"): exterior doors locked, windows closed, roof vents down, jacks retracted (one is manual, see quirks), slides in, counters and surfaces cleared, loose items stowed, water/propane/power disconnected, walk-around done. Checklist completion is logged per drive (timestamp, who), which also protects the crew and the church on damage questions

## 1.6 The driving doctrine (copy woven into the Captain's Book, the guide, rules Section 4, and Manifest email 3)

- **You are the captain of a ship, and that is the point.** She is 40 feet long. The ship language exists to break the "just another car" mindset, because that mindset is dangerous in an RV. Wide turns. Steer toward the center. She is an entirely different beast, and captaining her differently is what keeps everyone safe
- **MCS: Mindful, Careful, Slow.** Mindful: your full mind aware, conscious of your surroundings, fully present. Careful: your heart present, centered, and joyful; never take the captain's seat angry, anxious, or overwhelmed. Slow: take it easy; an accident causes far more traffic than you ever will by going gently
- **The cannabis rule, plainly:** we sail Oregon, Washington, and California, where the sacrament is legal, and driving after partaking is never okay. You are liable for damages and the insurance deductible. Arrive, set up fully, confirm the ship will not move again today, and then enjoy what you enjoy
- **Her quirks, honestly:** she is 20+ years old, and like every ship her age she has quirks; right now one leveling jack needs manual operation (you do not strictly need the jacks; they are a nice touch). Quirks like these are exactly why the trial year is discounted, and trial-year revenue funds the year-2 upgrades. None of it stands between you and an epic voyage
- Add to the booking Q&A: **"Is there food aboard?"** There is. It is your responsibility: if you take, please replenish for the next crew. The pantry is a commons

## 2. The Ship's Inventory (the bag)

A World-of-Warcraft-style inventory section under the RV explanation on `/ship`: everything she carries, as beautiful item slots in the solarpunk elven-futuristic regenerative style.

### 2.1 Schema and foundations

```
ship_inventory_items: id, name, slug unique, category enum(adventure, galley, water,
  power, connectivity, tools, magic, comfort, safety), description text (practical),
  lore text (the game-flavor line), iconUrl, photoUrl nullable, quantity int,
  storagePlace varchar (where she's stowed), activityTags json, isVisible bool,
  sortOrder, createdAt, updatedAt
```

- **The grid:** item slots with icon, name on hover/tap opens the item card: icon large, lore line, practical description, where it's stowed, activity tags. Rarity-style ring colors by category (subtle, tasteful)
- **Search + activity filter:** text search plus "What are you up to?" chips (lake day, forest walk, spring run, rainy day, hosting dinner, planting, repairs). Chips filter by activityTags: lake day surfaces the paddleboard, PFDs, towels
- **The First Mate knows the bag:** inventory passed into her context so "what should we bring to the lake" answers from real inventory

### 2.2 The icon pipeline (the process for every future item)

- Script `scripts/generate-ship-item-icon.ts` wrapping the nano-banana-pro skill with a locked style template so every icon matches: "Game inventory icon of [ITEM], solarpunk elven-futuristic regenerative style, painterly, glowing accents of living green and warm gold, centered on a deep forest-green background in a rounded-square slot with a thin gold rim, no text, 1:1"
- Admin item CRUD includes an "icon prompt" field prefilled from the template; generating + attaching an icon is one admin action away (or the listed CLI command)
- Document the process at the top of the script: add item row, run script, review icon, publish

### 2.3 Seed inventory (from the vision so far; Rye adds more later)

The regenerative walking staff (lore: "a Gandalf staff for the Renaissance: glows softly in the dark, and the crown holds SEEDS, so every walk can plant a forest"; category magic), copper dowsing rods (lore: "for finding water, and for asking after lost things"; magic), the treasure chest of SEEDS (magic), Starlink dish (connectivity), stand-up paddleboard + PFDs (adventure), electric bike + helmet (adventure), paddle ball set (adventure), hammocks (comfort), spring-water intake pump + hoses (water), gravity drinking-water filter (water), cast iron cookware set (galley), full-size washing machine + drying stand (comfort), the tool bag (tools; contents "to be inventoried by the captain"), field guides + instruments + games (comfort), first aid kit + fire extinguishers + CO/propane detectors (safety), generator (power). Generate icons for all seeds via the pipeline.

## 3. Booking window: the first two years, open now

- Voyage week cards extend through **the end of year 2**
- Year 1 weeks: trial pricing as shipped. **Year 2 weeks: double the trial, $598/night equivalent, displayed as her full rate** (strikethrough anchor stays $600, so year 2 shows essentially full price; keep the exact figure consistent with SHIP_VARIABLES.md conventions)
- Year-2 rows in `ship_pricing_windows` seeded now; copy on the booking page: "Her trial year is almost spoken for. Year two sails at her full rate, and the calendar is open"
- Winter weeks in both years show the migration note (projected southern bioregion, community vote pending)

## 4. The voyage cycle: Sunday into Monday turnover

Rye's reasoning: the turnover window must include a weekday morning because services (propane fills and similar) are closed Sundays.

**CONFIRMED by Rye (2026-07-11):** check-in **Monday 3pm**, check-out the following **Sunday 11am**. Turnover runs Sunday afternoon into Monday morning, with Monday-morning service access before the next crew boards. Pricing is **per voyage** (the quoted voyage totals are unchanged: trial year ~$2,100 total ask per voyage, split ~$1,043 platform rental + ~$1,050 offering; year 2 ~$4,200). Sweep ALL nightly-rate copy to per-voyage framing; where a nightly figure must appear (the platform listing), it derives from the voyage total.

- Week cards regenerate on this cycle ("Board Mon Jul 27, 3pm. Return Sun Aug 2, 11am")
- `ship.availability` and the overlap tests update; multi-week chains keep the mid-voyage reset note
- All copy that says "7-night" gets swept to "one voyage week"

## Handoff Breakdown

### YOU (Rye)

| # | Task | Why | Where |
|---|------|-----|-------|
| 1 | Approve resolved cases into the KB as they come (you and the Keeper both hold approval; CONFIRMED 2026-07-11) | Safety judgment | admin queue |

Answered by Rye 2026-07-11: voyage cycle confirmed as written above; the Shipwright's knowledge base is seeded from ONLINE manuals and public documentation only (Rye's manuals are physical; do a thorough research pass for the 2006 Fleetwood Revolution LE and Spartan chassis docs, iRV2 and IRV forum wisdom, and cite sourceRef links); approvers are Rye AND the Keeper (both get the admin approval permission).

### CLAUDE CODE

Everything in Sections 1 through 4, autonomously, through a green deploy. Public-doc research for the KB seed happens in-session; `ship-manuals/` ingestion runs whenever the folder appears.

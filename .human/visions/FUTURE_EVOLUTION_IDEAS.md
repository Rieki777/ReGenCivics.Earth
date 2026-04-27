# Future Evolution Ideas

**Status:** PARKED (not in current sprint)
**Source:** Moved from `FIXES_TO_MAKE_2026-04-18.md` on 2026-04-17 by request
**Why parked:** These ideas are excellent. Rye wants to keep them in mind for future evolution without cluttering the active polish sprint.

---

These six ideas were originally in the "World-Class Polish Sprint 4" document as ideas 8, 9, 15, 16, 21, and 22. They are parked here so the main fixes doc can stay focused on ship-ready polish, while these remain on the record for a later beauty pass.

---

## Idea 8: Bioregion-aware theming

**Concept:** The site subtly changes its tint, accent imagery, and micro-copy based on the visitor's approximate bioregion. Someone loading from Cascadia sees a cedar-and-sword-fern palette. Someone from the Sonoran desert sees ochre and saguaro silhouettes. Someone from the Appalachian foothills sees bluestone and mountain laurel.

**Why later:** Requires an IP-to-bioregion lookup (or opt-in location), a curated bioregion color + imagery set, and a theming layer that does not conflict with the seasonal tint system already running. Nontrivial surface area for a feature that is delightful but not blocking conversion.

**Dependencies:**
- Expanded `useSeasonTint` into a compound `useBioregionTint` hook
- A bioregion dataset (either our own or a license-cleared source like Cascadia Institute's maps or One Earth's 185 bioregions)
- Per-bioregion asset set (at minimum 10 to 20 regions for phase one)

**When to revisit:** After the incubator has real land projects mapped across multiple bioregions. Use those as the anchor regions first.

---

## Idea 9: Seasonal background texture swap

**Concept:** A subtle, slow-drifting background texture behind the page content that shifts each season: winter frost crystals in January, spring moss in April, summer pollen in July, autumn leaf silhouettes in October. Extremely low opacity (2 to 5 percent), parallax on scroll, respects `prefers-reduced-motion`.

**Why later:** The seasonal tint already communicates season at the palette level. Adding a background texture layer requires four hand-made tileable textures, a loading strategy that does not hurt LCP, and careful testing against all page types to avoid clashing with hero imagery.

**Dependencies:**
- Four tileable WebP textures (20 KB each maximum)
- A background component that respects reduced motion and only loads the texture for the current season
- Visual review across every top-level route

**When to revisit:** After the Living Tree visualization is done. The Tree becomes the primary seasonal cue on the homepage, and a background texture pairs nicely with it.

---

## Idea 15: Voice-witness clips on quest pages

**Concept:** Players record 10 to 30 second audio clips about how a quest changed their view or their land. Surface the clip on the quest page with a waveform and play button. Auto-caption using a small Whisper model server-side for accessibility. Real voices build trust faster than prose.

**Why later:** Spans four surfaces (record, upload, caption, moderate) and needs both an object-storage bucket (R2) and a captioning API (Whisper). A full shipment also needs a moderation queue so a bad recording does not auto-publish. Too many unresolved dependencies for the current polish sprint.

**Dependencies:**
- R2 bucket provisioned and credentials added to Railway env
- Whisper API key or equivalent captioning provider (OpenAI or self-hosted)
- Moderation queue UI and admin role wiring
- Database table `quest_voice_witnesses` (migration already sketched in SPEC_04 archive)
- MediaRecorder fallback for mobile Safari (tricky)

**Possible v1 scope cut (for when we revisit):**
A simpler "upload-only v1" ships sooner: player uploads an audio file (no in-browser recording), no captions, visible immediately without moderation. Risk: unmoderated audio in public view. Acceptable only if a trust model is already in place (tier-gated, Cultivator+).

**When to revisit:** After the incubator is full of quality projects with real voices to capture. Pair with a "stories" section that can hold the clips outside individual quest pages, and with a trust model that supports unmoderated uploads from specific tiers.

---

## Idea 16: Player contribution calendar grid

**Concept:** A GitHub-style contribution calendar on the player profile showing Seeds planted, Harvests contributed, quests completed, forum posts written, and recordings attended across the year. Each day is a small tinted square. Hovering a square reveals what happened that day.

**Why later:** We have partial data (quest completions, forum activity) but not all of it is timestamped in a way that groups cleanly into day buckets. Would require a new aggregate query and a caching layer to not hammer the DB on every profile view.

**Dependencies:**
- Aggregate daily-activity view or query
- Caching (Redis or in-memory)
- Profile page layout pass to find a home for the calendar without pushing key info below the fold

**When to revisit:** After the Living Tree is live. The calendar becomes the player-specific counterpart to the site-wide Living Tree.

---

## Idea 21: Seasonal stamina bar on dashboard

**Concept:** On the player dashboard, show a seasonal "stamina" bar: progress through the quests appropriate for this season, plus a subtle suggestion for the next quest to take on. Refreshes each season.

**Why later:** The current dashboard is already dense. Adding a stamina bar needs a layout pass and clarity on what counts as the "season's quest set." That is a product-design conversation before it is a spec.

**Dependencies:**
- Define the season quest set (mapping between current quests and the 4 seasons)
- Dashboard layout pass
- Copy for the stamina labels

**When to revisit:** As part of a dedicated dashboard sprint, alongside the Living Tree and the contribution calendar.

---

## Idea 22: Reading comfort side-panel

**Concept:** A small side button on long reading pages (Governance Blueprint, Economy essays, the Living Constitution) that opens a panel with three controls: font size, line height, and reading-background tint (cream, dark, neutral). Preferences persist in localStorage.

**Why later:** The current typographic defaults are already tuned for readability. This is a nice-to-have for marathon readers. Three controls also means three ways to break the layout if the page uses tight grids.

**Dependencies:**
- CSS variables for font-size, line-height, and bg tint
- A small toolbar component
- Careful testing on every long-form page

**When to revisit:** After analytics show us which pages have the longest average read time. Those pages earn the side-panel first.

---

## How to resurrect an idea

When the team wants to pick one of these back up:

1. Open this file.
2. Move the idea back into the current `FIXES_TO_MAKE_*.md` or start a new `SPEC_*.md` for it.
3. Add a line here under the idea: `**Activated:** YYYY-MM-DD, see [spec link]`.
4. Do not delete the entry, so we keep the history of when it was parked and why.

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| F1 | Decide when to resurrect any of these | Product direction | This file |

### CLAUDE CODE: can be done without you

| # | Task | Status |
|---|------|--------|
| F2 | Reference this file when either of us reopens one of these ideas | DONE |

### WAITING ON YOU before Claude Code can proceed

None. This is a parking lot.

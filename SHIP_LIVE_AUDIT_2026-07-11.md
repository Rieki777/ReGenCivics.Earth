# SHIP LIVE AUDIT (2026-07-11, automated overnight run)

**What this is:** a live-production audit of every ship page on regencivics.earth against the specs in CLAUDE_CODE_PROMPT_2026-07-10_SHIP_QC_WORLDCLASS.md (Section 3 checklist), REGEN_SHIP.md, SHIP_MAP_V2.md, SHIP_V3.md, and SHIP_V4_LOVE.md, plus a creative layer proposal for making the whole experience feel like a beautiful, playful game.

**Method:** Claude in Chrome browser session against production. Every page visited, full page text extracted, screenshots taken, network and console inspected on the map page, and a direct fetch probe run against the basemap file. One limitation, noted honestly: the browser window resize to 390px did not take effect in this session, so the mobile pass still needs the Playwright run the QC doc calls for. Everything else below is verified against the live site.

**Run date:** July 10, 2026, late evening.

---

## PART 1: FINDINGS

### The headline

The core ship (v1) is live and mostly beautiful. The v2 map rebuild is live in code but broken in production because the basemap file is missing from R2. Most of v3 and essentially all of v4 have not shipped: five spec'd surfaces 404 or are absent. The voice is strong everywhere that exists. No em-dash violations and no AI-isms were found in any page copy sampled.

### Critical

**C1. The treasure map has no basemap in production. The gray box is live right now.**
- Page: /ship/map
- Expected: self-hosted PMTiles basemap rendering Cascadia terrain, per SHIP_MAP_V2.md Section 3
- Observed: pins, clustering, filters, boundary mask, and the Add to the map FAB all render, but the base layer is a flat gray void. The page requests `https://assets.regencivics.earth/ship/basemap.pmtiles` and gets **404**, twice per load
- Evidence: network log shows `GET https://assets.regencivics.earth/ship/basemap.pmtiles -> 404` (x2); a direct fetch probe from page context returned `{status: 404, type: "text/html"}`; screenshots ss_0917wtb4a and ss_893825ky3 show clusters floating on gray
- Diagnosis: the code side of Map V2 shipped (protomaps-leaflet is wired, attribution reads "Leaflet | © OpenStreetMap contributors, Protomaps"), but the extract-and-upload script never landed the file in R2. This is Map V2 Handoff item 2: the upload needs R2 credentials
- Also: there is no in-world error state when the basemap fails. The crew just gets gray

**C2. The v4 Love Weave is not deployed. /ship/honeymoon is a 404.**
- Pages: /ship/honeymoon, /ship, /ship/book, /ship/concierge
- Expected per SHIP_V4_LOVE.md: honeymoon page live, love band and Choose Your Voyage cards on /ship, love sentence in the hero, capacity rule 4 max or 5 when at least 3 are children with an adults/children split in the form, concierge journey-type gains a love voyage option
- Observed: /ship/honeymoon returns the 404 page ("This path hasn't been cleared yet"). /ship has no love band, no Choose Your Voyage section, no love sentence. The booking form has a plain Guests dropdown of 1 to 4 with no adults/children split. The concierge intake has ten questions and none is the journey-type / love voyage question. The copy "Built for a couple. Hosts two couples in comfort" appears twice on /ship, which v4 explicitly supersedes
- Evidence: page text captures for all four pages; screenshot ss_5333n3d43 (honeymoon 404)

**C3. The v3 surfaces are missing: stops, experiences, migration vote, fleet expansion.**
- Pages: /ship/stops (404), /ship/experiences (404), /ship (no vote block), /ship/fleet (missing sections), /ship/winter (old framing)
- Expected per SHIP_V3.md: land project stops page with offerings/needs/gifts, Experience Library, "Where does she winter?" vote block with the San Diego vs Austin comparison on /ship and /ship/fleet, fleet page expanded with the idle-fleet RVIA stats (8.1M households, 30 days a year, 16.9M more want one), the win-win-win model, the UBI framing, contribution rewards ($5 per accepted location, $20 per accepted experience), and a community-owned-so-far sum
- Observed: /ship/stops and /ship/experiences both 404. No migration vote anywhere. The fleet page has the DAO model, the 10% buyback, the owner-made-whole card, the Regatta, and the raise-your-flag form, but none of the idle-fleet stats, no UBI language, no contribution rewards, no ownership sum. /ship/winter still opens with "When the voyages stop for the season," where v3 says the default is migration and she never stops
- Evidence: 404 page text for both routes; full fleet and winter page text captures
- Note: parts of v3 DID ship: the giveaway ladder on /ship/quest, the drawing language in the rules, and the milestone chip. The v3 deploy appears partial

### High

**H1. The booking page still uses the raw date picker. The voyage week cards were never built.**
- Page: /ship/book
- Expected per QC 2.4: a scrollable grid of voyage week cards ("Sail Sat Jul 25 → Sat Aug 1"), projected bioregion, price line, state per week, turnover-derived valid start days, chained multi-week selection, accessible list fallback, datepicker killed
- Observed: a native mm/dd/yyyy date input labeled Start date, a Weeks dropdown, and a Guests dropdown. The guest must deduce the week-cycle logic themselves. No seasonal location band (v3 1.3 endless-summer strip) either
- Evidence: screenshot ss_8933cdauq; page text shows "Start date / Weeks / 1 week (7 nights)"

**H2. The prize copy misdescribes the maiden voyage on every surface that mentions it.**
- Pages: /ship/quest, /ship/quest/rules, /ship (maiden voyage band), blog teaser for the ship article
- Expected per SHIP_V3.md Section 5: the FIRST person to complete the quest wins the maiden voyage, with the 7-day pacing; the random drawings are only for the five milestone voyages at every 20% of 40 bookable weeks; ties random
- Observed: the rules page says "The maiden voyage is drawn at launch" and "each free voyage is then awarded by a random draw." The quest page says "Everyone who completes the quest goes in the draw. The maiden voyage sails free." Nowhere does any page say the first completer wins the maiden voyage. Note the rules line is also internally impossible: at launch nobody has completed the quest, so there is nobody to draw from
- The good news: no leftover "top 3" or "top 5" copy anywhere, the 7-day pacing is present ("It takes at least a week to complete, on purpose"), win-once exclusion is stated, and ties-random is stated
- Evidence: quest and rules page text captures
- Decision needed: if Rye has actually evolved the structure to all-drawings, the spec should be updated instead; but as specs stand, the live copy is wrong

**H3. The rules driving section is missing the two new lines.**
- Page: /ship/quest/rules, Section 4
- Expected per QC 2.2: after the existing bullets, add "The driver must be capable of driving a 40-foot vehicle on the route of your choosing" and "It is highly advisable to stay on the main roads and use the bikes to get around towns"
- Observed: only the three original bullets (25 or older, valid license, platform verified). Neither new line is present on the rules page. The /ship/guide driving section also lacks the main-roads-and-bikes advice
- Evidence: rules page text capture

**H4. The offering copy is missing the real-costs line and the strong encouragement.**
- Pages: /ship/book (How the two-part payment works, item 3) and /ship (How a voyage is arranged)
- Expected per QC 2.3: "...covers the seed chest, the treasure map, the concierge, the fleet building, and the real costs of keeping her sailing: maintenance, cleaning, and everything it takes to run this program. We strongly encourage giving at least the suggested offering... It is a gift, always voluntary, and your booking never depends on it"
- Observed on /ship/book: "covers the seed chest, the treasure map, the concierge, and the fleet building. It is a gift, always voluntary, and your booking never depends on it." The guardrail sentence IS present and verbatim, which is the most important part. The maintenance/cleaning/running-costs clause and the strong encouragement sentence are missing
- Evidence: booking page text capture

**H5. The honeymoon article is not published and not staged.**
- Pages: /blog index, /blog/more-than-one-honeymoon
- Expected per QC Section 1 (the FIRST action of that doc): publish "You're Allowed to Have More Than One Honeymoon" and link it from /ship/honeymoon and the love band
- Observed: the blog index does not list it, and the direct slug returns "Post Not Found." The ship story article IS live ("The ReGen Ship: A Pirate Ship, a Chest of Seeds, and a Voyage You Can Win," 2026-07-10), which is v3 Section 6 delivered
- Evidence: blog index text capture; direct slug fetch

### Medium

**M1. Ship images bypass the /api/img pipeline.**
- Pages: all ship pages
- Expected per REGEN_SHIP 5.11 and QC checklist 5: every image through /api/img (R2, resize, caching)
- Observed: all ship photos serve from static `/images/ship/*.jpg` paths (e.g. `regencivics.earth/images/ship/ship-zion-redrock-hero.jpg` at natural width 1920). Only the user avatar uses /api/img. Full-size JPGs ship to every viewport with no resizing
- The good news: alt text is present and thoughtfully written on every image sampled ("The ReGen Ship beneath red rock cliffs in crisp daylight")
- Evidence: DOM image audit on /ship listing 21 images with src and alt

**M2. The hero image is lazy-loaded and the headline sits below the fold on shorter screens.**
- Page: /ship
- Observed: the hero img has loading="lazy" (it should be eager with a preload hint, per QC checklist 11), and at a 784px-tall viewport the first paint is sky and cliffs with no headline or CTA visible; "raised her flag" and the two CTAs only appear after scrolling. QC checklist 1 asks for the story in 3 seconds and the action in 10
- Evidence: screenshots ss_2374cnfnp (no headline visible) and ss_2328l3su9 (headline cut at top after scrolling); DOM audit shows loading="lazy" on the hero

**M3. The ship subnav cards pop in late, leaving a blank band at the top of subpages.**
- Pages: /ship/book, /ship/quest, /ship/quest/rules (observed), likely all subpages
- Observed: the image-card subnav (The Ship / Book / Treasure Map / The Quest / The Fleet / Voyage Log) renders as an empty dark band for the first seconds; screenshots of three pages caught it entirely blank while the concierge page caught it fully painted. This reads as a broken hero and risks CLS
- Fix direction: fixed card dimensions, eager-load the six thumbnails (they are small), or fade them in from a solid card with the label visible immediately
- Evidence: screenshots ss_8933cdauq, ss_0683n8rkb, ss_8260ei383 (blank band) vs ss_15007v5me (painted cards)

**M4. Fleet page scroll-reveal leaves in-viewport text nearly invisible.**
- Page: /ship/fleet
- Observed: on load, the intro paragraphs sit at very low opacity (a fade-in that has not triggered) while inside the viewport, failing the contrast bar until the animation fires. Screenshot shows body copy barely distinguishable from the background
- Evidence: screenshot ss_2145rcf4n

**M5. The map has no in-world failure or loading state.**
- Page: /ship/map
- Expected per QC checklist 7: every async view stays in-world ("The map is unrolling...")
- Observed: when the basemap 404s, the map silently shows gray. No message, no fallback
- Fix direction: detect tile-source failure and show a parchment overlay: "The map is still being inked. The pins are true; the terrain is on its way"

**M6. The rules hero is still the rainbow-hill image.**
- Page: /ship/quest/rules
- Expected per QC 2.1: replace with the generated arrival-welcome art (ship-art-arrival-welcome.png)
- Observed: the painterly rainbow-over-the-valley banner (ship-quest-banner.jpg) is the hero. None of the four v3 storybook art files (fleet-festival, winwinwin-flywheel, winter-migration, perfect-day) appear anywhere on the site either, and they are placement targets for fleet, migration, and experiences surfaces
- Evidence: screenshot ss_8260ei383; DOM image audit

**M7. The milestone tracker is missing from /ship.**
- Page: /ship
- Expected per v3 Section 5: milestone tracker on /ship AND /ship/quest, booked-weeks progress with treasure-chest markers at 8/16/24/32/40
- Observed: /ship/quest has a lovely free-voyage ladder (drag interaction, "Bookings this year: 0%", "1 of 6 unlocked"), but /ship has only a text paragraph. Also the ladder speaks in percentages, not booked weeks with chest markers
- Evidence: /ship and /ship/quest page text; heading inventory of /ship shows no tracker section

**M8. Fleet token language could use the standard disclaimer line.**
- Page: /ship/fleet
- Observed: "Those tokens are fractional shares that buy the asset into community ownership" with no disclaimer sentence. v3 Section 3 asks to keep token-sale language out and add the standard disclaimer (contribution rewards and revenue buybacks, not investments)
- Severity kept at Medium because the surrounding copy is buyback-framed, but counsel-facing language deserves the line

### Low

**L1. Map scroll-wheel hijacks page scroll.** Scrolling the page while the cursor crosses the map zooms the map out to minimum instead. Consider requiring focus or ctrl+scroll to zoom, which also helps the mobile experience.

**L2. Concierge intake has no autosave or progress indication.** Ten free-text questions with a single Chart my voyage button at the end. A shipwheel progress indicator and per-question chips would lower abandonment. (The intake questions themselves match spec beautifully.)

**L3. Mobile pass incomplete in this session.** The browser resize tool did not take effect, so thumb-reach, week-card swipe, and map controls at 390px remain unverified. Run the QC doc's Playwright pass.

### What is verifiably good (so it does not get broken)

- Voice: every page sampled is in Rye's voice, no em-dashes, no AI-isms, no rhetorical openers. "Request this week" beats Submit, exactly as the QC doc asked
- Empty states are in-world: "No crews yet. Be the first to set sail." / "The first crews are about to sail." / "Captain's walkthrough coming aboard soon" / the 404 "This path hasn't been cleared yet"
- The concierge page is the best page on the site: painterly concierge portrait, warm "Ahoy, welcome aboard," ten intake questions matching spec 5.6 exactly, "Chart my voyage"
- The quest checklist matches spec 5.7's seven actions with correct points (25/25/100/50/50/50/50)
- The map (minus its missing basemap) shipped clustering, ten type pills, four filter upgrades including Fits 40 ft, the bioregion mask, seed plantings toggle, My voyage, the Add to the map FAB, a legend link, and 2,868 seeded places, which far exceeds the 30-location v1 seed
- CORE Programs card is live with "Board the ship" and "Win the maiden voyage" CTAs and correct church framing
- The ship story article is published on the blog, dated 2026-07-10
- The rules page covers sponsor, eligibility, driver rules, dates, ties, ARV ($4,200), fair play, and the counsel note, in plain warm language
- Alt text is everywhere and descriptive

---

## PART 2: THE CREATIVE LAYER

Ranked proposals from the world-of-the-ship. Every one is CSS/SVG-first, respects prefers-reduced-motion (animations collapse to their final frame), adds no heavy libraries, and stays painterly pirate mythos, never casino. Effort: S = under an hour, M = a session chunk, L = a full feature.

**1. The map unrolls. (/ship/map, map load-in)** While tiles load (and as the in-world error state if they fail), show an aged-parchment texture with a slowly tracing dashed route line and the words "The map is unrolling..." When tiles arrive, the parchment peels back with a CSS clip-path wipe. Feeling: opening a treasure map instead of watching a spinner. Effort: M. This doubles as the fix for M5.

**2. She sails here: a gently bobbing ship pin. (/ship/map, position pin)** The ship position pin gets a 3s ease-in-out bob (translateY 2px) and a soft wake-ripple ring that expands and fades every 6s. Always on top, per spec. Feeling: she is alive out there right now. Effort: S.

**3. Treasure chests on the booked-weeks tide. (/ship and /ship/quest, milestone tracker)** Rebuild the tracker as a horizontal tide line filling with watercolor sea toward five small closed chests at 8/16/24/32/40 weeks. As the tide nears a chest it glints (2-frame sparkle, CSS keyframes). When a milestone is crossed, the chest creaks open in a 3-step sprite and stays open with the winner's crew name on a small scroll. Feeling: the whole community watches the tide rise together; getting the word out IS the game. Effort: M. This also delivers M7.

**4. Quest checkmarks that sprout. (/ship/quest, checklist)** On verification, the checkbox draws itself (SVG stroke-dashoffset) and a two-leaf sprout unfurls from the check's tail, 400ms, then settles. Points chip counts up. Feeling: every completed action literally grows something. Effort: S.

**5. Pins that bloom when verified. (/ship/map, celebration layers)** When a crew's suggested location or seed planting flips to verified, its pin drops with a single bounce and a watercolor bloom ring opens under it (scale + fade, one 600ms pass). The spec already names this; build it as a shared "bloom" keyframe used by plantings, stamps, and newly verified pins. Feeling: the map is a living garden the community is painting. Effort: S.

**6. The captain's journal voyage log. (/ship/log, entry list)** Style entries as journal pages: a faint ruled-paper texture, a handwritten-style date stamp, a small wax-seal avatar, and a passport-stamp strip along the margin for that day's stamps. New entries slide in like a page turning (single 3D rotateY on the entering card only). Feeling: reading the fleet's storybook, one hand to the next. Effort: M.

**7. Painterly empty-wall art set. (four spots)** Ready-to-run nano-banana-pro prompts, 2K, painterly storybook, no text, saved to ship-photos/ and run through the pipeline:
   - /ship/book hero (currently the emptiest page): "Painterly storybook illustration: a warm candlelit ship's chart table seen from above, an aged parchment calendar of weeks laid out beside a brass compass, dried flowers, a small wooden treasure chest of seed packets, and two steaming mugs, soft evening light through a wood-framed window. Hand-painted children's book style, rich texture, inviting. No text."
   - /ship/log empty state: "Painterly storybook illustration: an open leather captain's journal on a driftwood table at dusk beside a campfire ring, blank pages glowing softly in firelight, a fountain pen resting in the crease, fireflies drifting. Warm hand-painted style. No text."
   - /ship/keeper hero: "Painterly storybook illustration: a friendly ship keeper polishing the wooden galley of a vintage motorhome, morning light, folded organic linens in a neat stack, a small green pirate flag hanging by the door. Warm children's book style. No text."
   - /ship/winter hero: "Painterly storybook illustration: a brown-and-cream vintage motorhome resting under a timber shelter at a snowy homestead, warm golden windows, a family carrying firewood, evergreens and soft falling snow. Cozy hand-painted style. No text."
   Feeling: no dead walls anywhere in the ship's world. Effort: S each once the key is present (Rye runs the commands if the session lacks GEMINI_API_KEY).

**8. Seeds on the section breaks. (/ship, between bands)** A sparse SVG scatter of 3 to 5 seed silhouettes drifting slowly downward across section boundaries (translateY via scroll-linked animation or a 20s loop at 0.15 opacity). Feeling: the wind carrying the mission through the page. Effort: S.

**9. Flag ripple on hover. (site-wide, ship CTAs)** The primary ship CTAs (Win the maiden voyage, Request this week, Raise your flag) get a tiny green pirate-flag icon whose cloth ripples once on hover (2-keyframe skew). Feeling: every action is raising the flag. Effort: S.

**10. The compass cursor. (/ship/map)** Over the map, the cursor becomes a small compass rose (CSS cursor swap with SVG data-URI); the needle is static (no JS chasing) but the rose rotates 15 degrees on click. Feeling: navigating, not browsing. Effort: S.

**11. Finish-line ticker for the crews. (/ship/quest, leaderboard)** When crews exist, the recent-verified-actions feed becomes a nautical ticker: a thin rope line where each verified action slides in as a signal flag with the player's initials, and the current leader's flag flies at the mast top. First completer hoists a gold flag. Feeling: a regatta you can watch. Effort: M.

**12. The healing hole homecoming moment. (/ship/log, completed voyages)** A completed voyage's log page ends with a small animated vignette: a seed drops into a painted hole, a sprout unfurls, and the crew's total plantings count grows the sprout by one leaf per planting (SVG, capped). Feeling: closure and legacy; the voyage literally ends in growth. Effort: M.

**13. Week cards that feel like tide tables. (/ship/book, the new week picker)** When H1 is built, give each voyage week card a thin watercolor wave footer whose height reflects demand state (open = calm line, requested = rising, booked = full with a small anchor). Selecting consecutive weeks draws a rope between the cards. Feeling: reading the sea, choosing your window. Effort: M (rides on the week-picker build).

**14. Konami seed rain. (site-wide Easter egg)** The classic key sequence (or ten taps on the ship logo on mobile) triggers a 4-second gentle rain of seed and leaf SVGs that pile briefly at the page footer, then fade. Announce nothing. Feeling: a wink for the playful. Effort: S.

**15. The pirate blessing on the 404. (site-wide 404)** The 404 already says "This path hasn't been cleared yet." Add, in small italic below, a rotating pirate blessing: "May your tanks be full of spring water and your map full of X's." A tiny flag plants itself beside the text (one 500ms animation). Feeling: even lostness is in-world. Effort: S.

**16. Page transitions in the ship's world. (/ship/* navigation)** Between ship pages, a 250ms crossfade with a faint dashed-route line briefly tracing across the top of the viewport, as if hopping pins on the map. View Transitions API where available, plain fade otherwise. Feeling: every page is a stop on one voyage. Effort: M.

**17. The concierge writes like a quill. (/ship/concierge, itinerary reveal)** When the itinerary generates, day cards appear one by one with the day title typing on in a script-adjacent font (CSS steps animation on a clipped width) and a small pin-drop on the map preview per day. Feeling: the ship herself is drawing your map. Effort: M.

**18. Chest-lid hover on the perks. (/ship, What sails with you)** Each perk card lifts 2px on hover and its icon tilts like a chest lid cracking open with a 1-frame gold glint beneath. Feeling: everything aboard is treasure. Effort: S.

---

## READY-TO-PASTE CLAUDE CODE KICKOFF PROMPT

> Read SHIP_LIVE_AUDIT_2026-07-11.md at the repo root. It is a verified production audit dated 2026-07-11. Execute it as follows, in order. FIRST, restore the treasure map: run scripts/build-ship-basemap.ts (extract + R2 upload); if R2 credentials are absent in your environment, emit the exact one-line command for Rye, and in the same session ship the in-world map loading/failure state (Part 2 idea 1) so production never shows a gray void again. SECOND, deploy the missing v4 Love Weave per CLAUDE_CODE_PROMPT_2026-07-10_SHIP_V4_LOVE.md: /ship/honeymoon, the love band and Choose Your Voyage cards on /ship, the adults/children capacity rule in the booking form and server validation, the concierge love-voyage journey question, and the capacity copy sweep replacing every "two couples" line, then stage blog-drafts/more-than-one-honeymoon.md into the blog system unpublished and tell Rye it awaits his publish. THIRD, deploy the missing v3 surfaces per CLAUDE_CODE_PROMPT_2026-07-10_SHIP_V3.md: /ship/stops, /ship/experiences, the migration vote block with the San Diego vs Austin comparison on /ship and /ship/fleet, the fleet page expansion (RVIA idle-fleet stats, win-win-win, UBI framing, contribution rewards, community-owned sum, disclaimer line), and the migration-default rewrite of /ship/winter. FOURTH, fix the prize copy everywhere: the first quest completer wins the maiden voyage (7-day pacing, ties random), and the random drawings are only the five milestone voyages at 8/16/24/32/40 booked weeks; correct /ship/quest, /ship/quest/rules ("The maiden voyage is drawn at launch" must go), the /ship band, and the blog teaser. FIFTH, apply the QC review fixes still outstanding: the voyage week card picker replacing the raw datepicker (QC 2.4), the two driving lines on the rules page (QC 2.2: capable of driving a 40-foot vehicle on the route of your choosing; stay on main roads and use the bikes in towns), and the full offering copy with maintenance, cleaning, and running costs plus the strong encouragement, keeping the voluntary guardrail sentence verbatim (QC 2.3). SIXTH, quality pass: route all /images/ship/* through the /api/img pipeline with responsive sizes, make the hero eager-loaded and preloaded, give the ship subnav cards fixed dimensions and instant labels so the top of subpages never renders blank, fix the fleet page scroll-reveal so in-viewport text is never low-opacity on load, and add the milestone tracker to /ship. SEVENTH, build the top creative upgrades from Part 2 in this order: 1 (map unroll + failure state), 2 (bobbing ship pin), 3 (treasure-chest milestone tide), 4 (sprouting quest checkmarks), 5 (verified pin bloom), 9 (flag ripple on ship CTAs), 15 (404 pirate blessing), 8 (drifting seeds on section breaks), 6 (captain's journal log styling), 16 (ship-world page transitions); all CSS/SVG-first, all honoring prefers-reduced-motion. Generate the QC 2.1 arrival-welcome hero and the four v3 storybook images via the nano-banana-pro skill if a key is present; otherwise emit the five commands for Rye. Then run the Playwright mobile pass at 390px across every ship page per the QC doc and fix what it catches. Ship gate, commit in coherent chunks, push to main, verify Railway SUCCESS, update SHIPPED_LOG.md, and report with a Handoff Breakdown per the regen-fixes-handoff SOP.

---

## HANDOFF BREAKDOWN: WHO DOES WHAT

### CLAUDE CODE (autonomous, no waiting)

| # | Task | Source finding |
|---|------|----------------|
| 1 | Run the basemap extract + upload script (if R2 creds are in env); ship the map loading/failure state either way | C1, M5 |
| 2 | Deploy v4 Love Weave end to end, including capacity rule + copy sweep; stage the honeymoon article unpublished | C2, H5 |
| 3 | Deploy v3 missing surfaces: stops, experiences, migration vote, fleet expansion, winter rewrite | C3 |
| 4 | Prize copy correction on all four surfaces | H2 |
| 5 | Voyage week card picker, killing the raw datepicker; seasonal location band | H1 |
| 6 | Rules driving lines + full offering copy (guardrail verbatim) | H3, H4 |
| 7 | Image pipeline routing, hero preload, subnav card fix, fleet reveal fix, /ship milestone tracker | M1, M2, M3, M4, M7 |
| 8 | Fleet disclaimer line | M8 |
| 9 | Creative layer top 10 (ideas 1, 2, 3, 4, 5, 6, 8, 9, 15, 16) | Part 2 |
| 10 | Playwright 390px mobile pass and fixes | L3 |
| 11 | Ship gate, push, Railway SUCCESS, SHIPPED_LOG.md | SOP |

### RYE (only you can)

| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | If R2 creds are not in the Claude Code env, run the emitted basemap upload command once. This unbricks the map | Credential holder | terminal, one command |
| 2 | Confirm the prize structure: first completer wins the maiden voyage (per v3 spec) vs the all-drawings framing currently live. The copy fix in H2 assumes the spec | Owner call | reply in chat |
| 3 | Review and publish the honeymoon article once staged | Your voice, your call | blog admin |
| 4 | If no GEMINI_API_KEY in session, run the five listed nano-banana-pro commands (QC 2.1 arrival art + four v3 storybook images) | Key holder | terminal |
| 5 | Bless or veto the creative layer list before build (10 minutes; it will color the whole site) | Aesthetic owner | this doc, Part 2 |

### WAITING ON YOU

- Item 1 (only if creds are absent) blocks the map basemap. Everything else proceeds without you.

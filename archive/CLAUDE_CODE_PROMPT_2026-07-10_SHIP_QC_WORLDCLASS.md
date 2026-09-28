# CLAUDE CODE PROMPT: Ship QC + World-Class Design Pass (2026-07-10)

**Status:** Ready to execute. Four immediate fixes from Rye's review, then a full quality and beauty audit of the entire ship experience, acting as the world's best designer of epic regenerative games.

## Kickoff prompt (paste into Claude Code)

> Read CLAUDE_CODE_PROMPT_2026-07-10_SHIP_QC_WORLDCLASS.md at the repo root. FIRST publish the honeymoon article so Rye can see it live. Then apply the four review fixes (rules hero image, driving copy, offering copy, voyage week picker). Then run the full world-class audit in Section 3 across every ship page with Playwright screenshots at mobile and desktop, fix everything fixable in-session, and record findings with evidence in SHIP_QC_AUDIT_2026-07-10.md. Ship gate, commit, push, verify Railway SUCCESS, update SHIPPED_LOG.md, report with a Handoff Breakdown.

---

## 1. FIRST ACTION: publish the article

`blog-drafts/more-than-one-honeymoon.md` goes live in the blog system now (follow existing blog publish conventions; hero image: `ship-campfire-dusk.jpg` until the storybook art lands). Link it from `/ship/honeymoon` and the `/ship` love band. Tell Rye the live URL in the report. He wants to see it published, not staged.

## 2. Review fixes (from Rye's screenshots)

### 2.1 Quest rules hero image

Replace the rainbow-hill image. Generate with the nano-banana-pro skill (2K, save to `ship-photos/`, run through the image pipeline):

> "Painterly storybook illustration: a brown-and-cream vintage diesel pusher motorhome flying a small green pirate flag arriving down a country lane into a regenerative village, smiling community members waving happily, children running alongside, orchards and young food forest gardens on both sides, golden evening light, misty evergreen mountains behind. Warm hand-painted children's book style, rich texture, joyful. No text."

Filename: `ship-art-arrival-welcome.png`. Use on `/ship/quest/rules` hero; consider reusing on the stops page. If generation is unavailable in-session, use `ship-tipis-prairie.jpg` as interim and list the command for Rye.

### 2.2 Rules section 4, "Driving the ship": add these lines

After the existing three bullets, add:

- The driver must be capable of driving a 40-foot vehicle on the route of your choosing
- It is highly advisable to stay on the main roads and use the bikes to get around towns

### 2.3 Offering copy (rules "how it works" item 3): replace with

> After the platform booking, a suggested voyage offering to the church covers the seed chest, the treasure map, the concierge, the fleet building, and the real costs of keeping her sailing: maintenance, cleaning, and everything it takes to run this program. We strongly encourage giving at least the suggested offering so the program can keep running. Every gift is received with deep appreciation and used with utmost care, as with all funds, to serve the Regenerative Renaissance and CORE's spiritual mission. It is a gift, always voluntary, and your booking never depends on it.

The final sentence is a compliance guardrail (main doc Section 3.3). It stays, verbatim, wherever this copy appears.

### 2.4 Booking: replace the date picker with a voyage week picker

The generic calendar hides the week-cycle logic. Replace it:

- **Voyage week cards**, not a date field: a scrollable grid of upcoming bookable weeks, each card showing "Board Mon Jul 27, 3pm → Return Sun Aug 2, 11am" (the confirmed Monday-to-Sunday cycle), the projected bioregion (seasonal band data), the per-voyage price, and state: open / requested by others / booked / turnover / migration
- Valid start days derive from the turnover schedule (one turnover day after each voyage; start day is the day after turnover completes). Encode the rule server-side and render only valid weeks; never make the guest deduce it
- Multi-week: selecting consecutive open cards chains them (with the mid-voyage reset note appearing)
- Keep an accessible fallback list view. Kill the raw datepicker entirely
- The old calendar's availability logic moves into `ship.availability` returning week objects, not date ranges

## 3. The world-class audit (every ship page, mobile first)

Act as the world's best designer of epic regenerative games. The bar: a person landing on any ship page should feel the story in 3 seconds, find their action in 10, and hit zero ugly moments. Audit and upgrade, in this order: `/ship`, `/ship/book`, `/ship/quest`, `/ship/quest/rules`, `/ship/map`, `/ship/concierge`, `/ship/honeymoon`, `/ship/experiences`, `/ship/stops`, `/ship/fleet`, `/ship/log`, `/ship/guide`, `/ship/keeper`, `/ship/winter`, `/ship/nominate`, plus the ship blocks in Admin and the CORE Programs card.

**Method:** use the webapp-testing skill (Playwright) against a local dev run. Screenshot every page at 390px and 1440px, light and dark if the site supports both. Attach screenshot paths as evidence in the audit doc. No claim without evidence (ship gate discipline).

**Checklist per page:**

1. **Story hierarchy:** one clear hero message, one primary CTA above the fold, supporting actions visually secondary. No competing headlines
2. **Rhythm and space:** consistent section spacing per DESIGN_SYSTEM.md; no cramped bands; images breathe
3. **Type:** scale consistent with the rest of the site; line lengths under ~70ch; no orphan headings
4. **Contrast and color:** meet the prior contrast-audit standards (see CONTRAST_AUDIT docs); pirate palette accents without murk; test text-over-image blocks
5. **Imagery:** every image through `/api/img` with proper sizes; consistent painterly/photo treatment per section; alt text everywhere; no stretched or letterboxed images
6. **Microcopy:** every string in Rye's voice, STEERING writing rules (no em-dashes, no AI-isms, no rhetorical openers). Sweep especially form labels, empty states, buttons ("Request this week" beats "Submit")
7. **States:** every async view has loading, empty, and error states that stay in-world ("The map is unrolling..." / "No crews have logged this yet. Be the first"). No raw spinners on white, no dead-end errors
8. **Forms:** field-level validation messages, sensible defaults, keyboard order, autocomplete attrs, disabled-until-valid submit with reason shown
9. **Mobile:** thumb-reach CTAs, no horizontal scroll, map controls usable, week cards swipeable, tables become cards
10. **Accessibility:** focus states visible, aria labels on icon buttons, map has a list alternative, color never the only signal
11. **Performance quick wins:** lazy-load below-fold imagery, preload the hero, check CLS on image bands and the week grid, defer the map bundle until visible
12. **Game feel:** progress must be felt. Quest checklist ticks with a satisfying animation; milestone chest markers glint as bookings approach a drawing; verified map pins drop with a bounce; seed plantings bloom; leaderboard finish ticker feels alive. Small, tasteful, never gimmicky
13. **Cross-page consistency:** shared ship nav/subnav, consistent card components, one voice, one pin iconography, the flag motif used sparingly and well

**Deliverable:** `SHIP_QC_AUDIT_2026-07-10.md` in FIXES-doc format: finding, severity, fix applied (or deferred), evidence (screenshot path / file:line / grep). Fix everything fixable in-session; defer only what needs Rye (content decisions, image choices), listed in the Handoff Breakdown per the regen-fixes-handoff SOP.

## 4. Execution order

1. Publish the article (Section 1)
2. Review fixes 2.1 through 2.4
3. Audit + fix sweep (Section 3), page by page, committing in coherent chunks
4. Ship gate, push, verify Railway SUCCESS
5. SHIPPED_LOG.md + audit doc + Handoff Breakdown report with the article's live URL first

## Handoff Breakdown: Who Does What

### YOU (Rye)

| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Read the published article and bless or tweak it | Your voice | live URL in the report |
| 2 | If image generation lacks a key in-session, run the listed command for the arrival-welcome hero | Key holder | terminal |
| 3 | Review the audit doc's deferred items (content and aesthetic calls) | Owner judgment | SHIP_QC_AUDIT_2026-07-10.md |

### CLAUDE CODE

Everything else: publish, fixes, full audit and upgrade pass, green deploy.

### WAITING ON YOU

- Nothing blocks. Deferred aesthetic calls collect in the audit doc for one review pass.

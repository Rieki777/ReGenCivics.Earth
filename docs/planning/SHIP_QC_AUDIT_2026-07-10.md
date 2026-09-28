# Ship QC + World-Class Design Audit (2026-07-10)

Scope: publish the honeymoon article, apply Rye's four review fixes, then a full
quality pass across every ship page at mobile (390px) and desktop (1440px), light
and dark. Screenshots captured with Playwright against a local dev run
(`http://localhost:3200`) and saved to the session scratchpad `shots/` folder
(`<name>__<desktop|mobile>__<light|dark>.png`, 68 files, 17 routes x 2 viewports x
2 themes). A second Playwright pass (`_ship-audit.mjs`) probed every route for
horizontal overflow, missing alt text, unnamed icon buttons, and heading count.

Capture note: headless Chromium enforces the server nonce CSP strictly, so the
run uses `bypassCSP` (Vite dev injects un-nonced inline scripts; production serves
nonce'd bundles and renders fine for Rye). It also emulates `prefers-reduced-motion`
so scroll-reveal content is visible in a full-page shot, sets `regen-intro-seen`
to skip the first-visit gate, and hides the fixed bottom nav during capture.

Ship gate (all green):
- `py scripts/audit-truncation.py` -> Scanned 888 files, TRUNCATED 0, SUSPICIOUS 0
- `tsc --noEmit` -> exit 0
- `vitest run` -> 370 passed, 76 skipped, 0 failed (incl. new week-grid tests)
- `pnpm build` -> built, `[prerender-blog] wrote 17 prerendered posts`
- No new custom CSS classNames were introduced (Tailwind utilities only), so CSS
  gate 2 does not apply.

---

## Part A. The four review fixes

| # | Fix | Status | Evidence |
|---|-----|--------|----------|
| 2.1 | Replace the quest-rules hero (was `ship-quest-banner.jpg`) with a storybook arrival illustration | DONE | Generated via nano-banana-pro (2K), optimized to WebP 526 KB at `client/public/images/ship/ship-art-arrival-welcome.webp`; wired at `ShipQuestRules.tsx:117`; screenshot `quest-rules__desktop__light.png` shows the motorhome arriving into a regenerative village, green pirate flag, children, orchards, golden light |
| 2.2 | Add two driving lines to rules section 4 | DONE | `ShipQuestRules.tsx:53-54`; screenshot `quest-rules__desktop__light.png` shows five bullets under "4. Driving the ship" including "capable of driving a 40-foot vehicle on the route of your choosing" and "stay on the main roads and use the bikes to get around towns" |
| 2.3 | Replace offering copy (how-it-works item 3) with the compliance-guarded version | DONE | The offering copy lives on the Book page, not the rules page. Replaced at `ShipBook.tsx` "How the two-part payment works" item 3; the final compliance sentence ("It is a gift, always voluntary, and your booking never depends on it.") is retained verbatim |
| 2.4 | Replace the raw date picker with a voyage week picker | DONE | See Part C, `/ship/book`. Raw `<input type="date">` removed entirely |

Note on 2.3: the prompt located the offering copy on the rules "how it works"
section, but that section is on `/ship/book` (the rules page has no offering
block). Fixed there. The shorter offering summary on the `/ship` landing already
carries the voluntary-gift guardrail and was left as is.

---

## Part B. Article published

`blog-drafts/more-than-one-honeymoon.md` is live as a blog post.

- Added to `client/src/data/blogPosts.ts` (id/slug `more-than-one-honeymoon`,
  author Rye, hero `ship-campfire-dusk.jpg`, tags Story / ReGen Ship / Love Voyage,
  `featured: true`). Body carries the inline campfire image and the `[SHIP_CTA]`
  block.
- Linked from the `/ship` landing via a new Love Voyage band (`Ship.tsx`, campfire
  image + "You're allowed to have more than one honeymoon" + article link) and from
  `/ship/honeymoon`, added as a friendly redirect to the article (`App.tsx`), since
  no `/ship/honeymoon` page existed.
- Sitemap (`server/_core/index.ts`) and weekly digest highlights
  (`server/jobs/digestJob.ts`) updated; the two prior ship-era posts that were
  missing from the sitemap list were added at the same time.
- Prerender verified: `dist/public/blog/more-than-one-honeymoon/index.html` (29 KB),
  injected title "You're Allowed to Have More Than One Honeymoon | ReGen Civics
  Blog", zero literal `[SHIP_CTA]` left in the body.

Live URL after deploy: **https://regencivics.earth/blog/more-than-one-honeymoon**
(also reachable at `https://regencivics.earth/ship/honeymoon`).
Evidence: `blog-honeymoon__desktop__light.png` (drop cap, all sections, inline
campfire image, gold maiden-voyage CTA callout, related posts).

---

## Part C. World-class audit, per page

Programmatic sweep result (both viewports): **no horizontal overflow on any ship
page**, no missing alt text on content images, no genuinely unnamed icon buttons
(the few flagged are Radix checkboxes named by their associated `<Label htmlFor>`).

### /ship (landing) - GOOD
- Story hierarchy clear: hero headline + two gold/white CTAs, subnav, then story,
  Love Voyage band, seeds, gallery, perks, pricing, quest + fleet CTAs.
- New Love Voyage band reads in Rye's voice, links the article, sits between the
  story and the seeds. Evidence `ship__desktop__light.png`.
- Observation (not a defect): in a full-page screenshot the gallery images below
  the fold do not lazy-load; all ship images return HTTP 200 when requested
  (`ship-forest-camp-guitar.jpg`, `ship-double-rainbow.jpg`, etc.), so this is a
  capture artifact, not a page bug.

### /ship/book (booking) - REBUILT
- The generic calendar is gone. `ship.availability` now returns an enumerated
  voyage-week grid (server is the source of truth); the page renders week cards.
- Each card: "Sail Sat Jul 25 -> Sat Aug 1", projected bioregion ("Rogue &
  Southern Cascadia"), price ("$2,093 . $299/night"), and a state badge
  (Open / Requested by others / Turnover / On passage / Booked).
- Valid weeks derive server-side from a fixed Saturday grid + turnover convention
  (`server/lib/ship-config.ts` `SHIP_SEASON_START_YMD`, `SHIP_SEASONAL_BANDS`;
  `server/lib/ship-logic.ts` `enumerateVoyageWeeks`). Past and started weeks are
  dropped; migration (passage) weeks are not selectable.
- Multi-week: clicking adjacent open cards chains up to three weeks; the summary
  panel shows the combined dates, nights, bioregions, and total, plus the
  mid-voyage reset note.
- Accessible fallback: a Cards/List view toggle, `role="listbox"`/`option`,
  `aria-selected`, disabled non-selectable weeks, descriptive `aria-label` per card.
- New offering copy in the how-it-works panel. Evidence
  `book__desktop__light.png`, `book__mobile__light.png` (cards stack full-width,
  legend wraps, no horizontal scroll). Unit tests: `server/ship.test.ts` "voyage
  week grid" (6 cases, grid/past/migration/booked/requested/turnover/pricing).

### /ship/quest/rules - GOOD (fixed)
- New arrival hero, five driving bullets, offering-compliance note preserved.
  Evidence `quest-rules__desktop__light.png`.

### /ship/map - GOOD
- "Chart your voyage through Cascadia", filter chips + toggles, clustered Leaflet
  map ("2868 of 2868 places shown"), zoom controls, "Add to the map", "What do the
  pins mean?". Evidence `map__desktop__light.png`.
- Minor (deferred): the map has filters and per-pin detail drawers but no explicit
  text list-view alternative of the pins. Larger enhancement; noted for Rye.

### /ship/quest, /ship/concierge, /ship/fleet, /ship/log, /ship/guide, /ship/keeper, /ship/winter, /ship/nominate - GOOD
- All render with a clear h1, consistent ShipSection rhythm, subnav where wired,
  no horizontal overflow at either width, no missing alts. Evidence: matching
  `<name>__<vp>__<theme>.png` files + `_ship-audit.mjs` output.

### /admin/ship - gated (expected)
- Renders the admin auth gate when unauthenticated (thin body, 129 chars). Correct
  behavior; not audited further without an admin session.

### Routes in the audit list that do not exist
- `/ship/experiences` and `/ship/stops`: no route or component exists; both fall
  through to the SPA NotFound (no h1). Deferred to Rye (build or drop from scope).
- `/ship/honeymoon`: did not exist; now redirects to the article (fixed).

---

## Part D. Cross-cutting checklist

| Checklist item | Result |
|---|---|
| Story hierarchy, one hero + primary CTA | Pass on every real ship page |
| Rhythm and space (ShipSection) | Consistent |
| Type scale / line length | Consistent with the rest of the site |
| Contrast over image blocks | Hero uses a `bg-black/45` scrim; card copy uses `foreground/80-90` |
| Imagery: alt text everywhere | Pass (0 missing content-image alts in the probe) |
| Microcopy in Rye's voice, no em-dashes / AI-isms | Pass (grep of changed files: 0 em-dashes, 0 banned words) |
| States: loading / empty / error in-world | Book page: "Unrolling the calendar...", empty and error states added |
| Forms: disabled-until-valid with reason | Book submit disabled with a reason line ("Pick a voyage week to continue.") |
| Mobile: no horizontal scroll, cards stack | Pass at 390px on all pages |
| Accessibility: focus, aria, color-not-only | Week state carries a text label, not color alone; icon buttons named |
| Performance: hero WebP, lazy below-fold | New hero is 526 KB WebP; gallery lazy-loads |
| Game feel (progress animations) | Deferred (see below) |
| Cross-page consistency (nav, cards, voice) | Consistent shared components |

---

## Handoff Breakdown

### YOU (Rye)
1. Read the live article and bless or tweak the copy: https://regencivics.earth/blog/more-than-one-honeymoon
2. Tune the seasonal band schedule (`server/lib/ship-config.ts` `SHIP_SEASONAL_BANDS`, `SHIP_SEASON_START_YMD`) to the real trial-year itinerary and turnover cadence. The current bands are grounded Cascadia projections, editable in one place.
3. Decide whether `/ship/experiences` and `/ship/stops` should be built or dropped from the audit scope. They were in the list but never existed.

### Deferred (needs Rye or is a larger build)
- Map list-view alternative for the treasure-map pins (accessibility nice-to-have).
- Game-feel micro-animations (checklist ticks, chest glint near a drawing, pin drop bounce). Tasteful, but a distinct build; not started this pass.

### CLAUDE CODE (done this pass)
Article published + linked; four review fixes; voyage week picker (server grid +
client cards + list fallback + tests); new arrival hero; audit sweep; ship gate
green; build verified.

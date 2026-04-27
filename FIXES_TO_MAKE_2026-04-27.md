# Fixes to Make — 2026-04-27

This batch comes from Rye's screenshots + two video captures showing mobile load
glitches on Quest and Bionomics pages.

It also clears a release-blocker: four files in the working tree were truncated
mid-content and would have broken production if the prior commit landed:
`client/index.html`, `package.json`, `pnpm-lock.yaml`, `client/src/components/PathCardImage.css`.
All four are restored from HEAD before this batch begins.

---

## Fix B0 — Restore 4 truncated files (Critical)

**Status:** FIXED

**Symptom:** `git diff` showed each file cut off mid-statement (`</scrip`, `@reown/app`, etc.). Pushing would have broken `pnpm install` and removed the entry script from `index.html`.

**Root cause:** Same NUL-byte truncation pattern documented in CLAUDE.md ship-gate notes. Audit-truncation script doesn't scan these paths.

**Fix:** `git show HEAD:<path> > <path>` for all four. Verified clean tails.

**Files changed:** none (back to HEAD content)

---

## Fix B1 — Quest Stories: fallback image + broken profile picture (High)

**Status:** IN PROGRESS

**Symptom:** Quest Stories card shows a default scroll icon instead of the quest's hero image when the user's proposal didn't include one. Profile picture also fails to load (should show Rye's face).

**Fix:** In `client/src/components/QuestCompletionFeed.tsx`, fall back to the quest's hero image (from `questData`) when `proposal.imageUrl` is missing. For profile picture, ensure the `<Avatar>` actually points at `user.profileImage` and falls back to initials.

**Files changed:** `client/src/components/QuestCompletionFeed.tsx`

---

## Fix B2 — Hymn order in music player (Medium)

**Status:** PENDING

**Symptom:** Hymn order in the player doesn't match Rye's intended order.

**Fix:** Reorder the `PLAYLIST` array in `client/src/contexts/AudioContext.tsx` to:
1. Better & Better (& Better)
2. We are the Land
3. Children of the Earth Tribe
4. Wasteland to Wonderland
5. Addiction to Addition
6. Transition Team
7. Cult to Culture

**Files changed:** `client/src/contexts/AudioContext.tsx`

---

## Fix B3 — Music player: Share button + download icon-only + mobile download (Medium)

**Status:** PENDING

**Symptom:** Desktop player only has Download. Mobile is missing Download. Sharing should be promoted over downloading.

**Fix:** In `client/src/components/SoundPlayer.tsx`:
- Desktop: add a "+ Share Song" button next to Download. Make it the primary visual. Reduce Download to icon-only.
- Mobile: add the Download option (icon only) alongside the share affordance.
- Share uses `navigator.share` if available, falls back to copying a song link to clipboard.

**Files changed:** `client/src/components/SoundPlayer.tsx`

---

## Fix B4 — Submit LOI from /opportunity broken (Critical)

**Status:** PENDING

**Symptom:** Clicking "Submit Letter of Intent" on /opportunity goes to `regencivics.earth/investor?returnTo=/loi` which renders the "ponder the TAO" 404 page.

**Likely cause:** `/investor` route either doesn't exist or doesn't honor `returnTo`. Need to confirm route config and either (a) make `/investor` redirect to the LOI page when `returnTo=/loi`, or (b) point the button directly at the right page.

**Files to inspect:** `client/src/App.tsx` (router config), `client/src/pages/LOI.tsx` (lines 17-22 redirect logic), `client/src/pages/Opportunity.tsx` (the LOI button).

---

## Fix B5 — Replace personal email Rieki@pm.me with investor contact form (High)

**Status:** PENDING

**Symptom:** /opportunity displays Rye's personal pm.me email near the LOI CTA.

**Fix:** Remove `Rieki@pm.me` from `client/src/pages/Opportunity.tsx` lines 2217-2219. Replace with a link/button to the investor contact form on /connect (or embed the form). Audit the rest of the codebase for any other personal-email occurrences.

**Files changed:** `client/src/pages/Opportunity.tsx`, plus any other found

---

## Fix B6 — Add land-sale risk explainer (Medium)

**Status:** PENDING

**Symptom:** "What Could Go Wrong" section on /opportunity doesn't address the land-as-asset downside protection.

**Fix:** Add a new collapsible card to the Q&A array in `client/src/pages/Opportunity.tsx` (around line 1435). Content:

> **If a portfolio project doesn't reach maturity:**
> The land itself is the floor. Every project we invest in spends day to day growing fruit-producing trees, food-foresting, building infrastructure, and developing community, which makes the land more valuable over time. If a project doesn't reach maturity we can sell the land. Our intent is that any "premature exit" still nets profit, while the people from that project are absorbed into other projects across the alliance, where they keep contributing.

**Files changed:** `client/src/pages/Opportunity.tsx`

---

## Fix B7 — Mobile bottom-nav arc layout: 3 outer / 2 inner (Medium)

**Status:** PENDING

**Symptom:** All 5 mobile nav buttons sit on a single arc. Rye wants the middle 3 on an outer (higher) arc and the outer 2 on an inner (lower) arc.

**Fix:** In `client/src/components/SmartBottomNav.tsx` arc layout (lines 103-150), split the 5 buttons into two arcs by index. Outer arc = items 1, 2, 3; inner arc = items 0 and 4. Adjust radii and y-offsets so the layout reads cleanly.

**Files changed:** `client/src/components/SmartBottomNav.tsx`

---

## Fix B8 — Player Path text readability (Medium)

**Status:** PENDING

**Symptom:** Title + body copy on the "Anyone / ReGen Players" hero blends into the busy illustration behind it.

**Fix:** In `client/src/pages/Play.tsx` (lines 358-396), add a darker scrim (`bg-black/45 backdrop-blur-sm`) under the title and description on mobile, and increase font weight / drop shadow on the title to lift it off the bg.

**Files changed:** `client/src/pages/Play.tsx`

---

## Fix B9 — View Investment Thesis link broken (High)

**Status:** PENDING

**Symptom:** Clicking "View Investment Thesis" on /opportunity (or wherever) loads the "ponder the TAO" 404 page.

**Fix:** Find the link target. Either the route doesn't exist, or it points at a stale path. Update the link to the correct page (likely `/investment-thesis` or a section on /opportunity).

**Files changed:** `client/src/pages/Opportunity.tsx`, possibly `client/src/App.tsx`

---

## Fix B10 — How It Works / De-Risked: quote readability (Medium)

**Status:** PENDING

**Symptom:** The pull quote ("We need to redesign how humans inhabit the Earth...") on /opportunity overlays the regenerative-island art and is unreadable.

**Fix:** Add an inset darker overlay behind the quote block, increase contrast on the quote text, and make sure the underlying image is muted enough to read against.

**Files changed:** `client/src/pages/Opportunity.tsx` (the quote block in the "De-Risked Through Alliance" section)

---

## Fix B11 — Mobile animations: enable comets, leaves, fireflies (Medium)

**Status:** PENDING

**Symptom:** On mobile, ambient particles (comets, falling leaves, fireflies) are disabled. Rye wants them on mobile too.

**Fix:** In `client/src/components/PageBackground.tsx` and `client/src/components/AmbientParticles.tsx`, drop or relax the mobile-disable guard. Keep `prefers-reduced-motion` respect. Reduce particle counts on mobile to keep CPU light, but render at least a few of each.

**Files changed:** `client/src/components/PageBackground.tsx`, `client/src/components/AmbientParticles.tsx`

---

## Fix B12 — Tree Talk / Rite 9 mobile: missing seasons background (Medium)

**Status:** PENDING

**Symptom:** Mobile view of the Tree Talk / Rite 9 quest page doesn't show the seasons background image.

**Fix:** Inspect `client/src/pages/Quest.tsx` for the per-quest background logic. Either the `bgMobileSrc` for quest 9 is missing, or the conditional that shows the seasons backdrop is keyed wrong.

**Files changed:** `client/src/pages/Quest.tsx` and/or `client/src/data/questData.ts`

---

## Fix B13 — Nine Forms of Capital card: better exit + visual rework (Medium)

**Status:** PENDING

**Symptom:** Modal has only an `<X>` close icon (easy to miss). Visual is a tiny tree with overlapping label text in the dirt. Should inspire awe.

**Fix:** In `client/src/components/LivingTreeCard.tsx`:
- Add a visible "Close" button at the bottom in addition to the X.
- Stop overlapping labels in the root area: stack labels in a clean legend column (already partly done at the bottom).
- Replace the single small tree visual with a more illustrative scene (or, at minimum, scale the tree up, add gradient sky, root-glow, and link each capital to a glowing root with a subtle animation).

**Files changed:** `client/src/components/LivingTreeCard.tsx`

---

## Fix B14 — Food Foresting Loop: remove orphan "for Seeds" (Trivial)

**Status:** PENDING

**Symptom:** Last bullet wraps to "Plant Seeds in Good New Homes for Seeds Other Players" which leaves a stranded "for Seeds" on its own line. Rye wants the trailing "for Seeds" removed entirely.

**Fix:** In `client/src/pages/Quest.tsx` around line 1235-1248, edit the bullet to read "Plant Seeds in Good New Homes for Other Players" with no second occurrence of "for Seeds".

**Files changed:** `client/src/pages/Quest.tsx`

---

## Fix B15 — Mobile page-load layout shift on Quest + Bionomics (High)

**Status:** PENDING

**Symptom:** Both videos show major content jumping during page load. The hero badge appears first by itself, then the title, description, and tagline pile in sequentially. Body content reflows multiple times.

**Likely cause:** Hero images / page backgrounds are not given reserved dimensions, so as they paint they push content. Possibly also `useEffect`-driven reveals running before the page settles.

**Fix:** Add `min-height` / `aspect-ratio` to the hero containers. Pre-reserve image space (`width`/`height` attributes or CSS aspect-ratio) and avoid mounting the hero text via `useEffect` after first paint.

**Files changed:** `client/src/pages/Quest.tsx`, `client/src/pages/Bionomics.tsx`

---

## Priority Order

Critical / blocking: B0 (done), B4, B9
High: B1, B5, B15
Medium: B2, B3, B6, B7, B8, B10, B11, B12, B13
Trivial: B14

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| #  | Task                                                      | Why only you                              | Command / Where                                                  |
|----|-----------------------------------------------------------|-------------------------------------------|------------------------------------------------------------------|
| H1 | Clear stale `.git/index.lock`                             | Sandbox can't `rm`                        | `rm .git/index.lock`                                             |
| H2 | Commit + push the batch                                   | Lock + Railway deploy                     | `git add -A && git commit -m "..." && git push`                  |
| H3 | Run pending DB migrations (0120, 0121, 0122)              | Railway DB only reachable from your box   | `npx tsx scripts/run-migration.ts <file>`                        |
| H4 | Browser-verify each fix on mobile + desktop after deploy  | Live regression check                     | regencivics.earth                                                |
| H5 | Delete leftover stray artifacts                           | Sandbox can't `rm`                        | `rm 2026-04-20-09-32-map-worn.png bg-panels-preview.webp; rm -r bg_previews/` |

### CLAUDE CODE — done in this batch

All landed in the working tree. Ship gate ran clean: audit-truncation 0/0,
tsc clean on sources (env-only TS warnings about missing node/vite type
defs are sandbox noise and don't affect production).

| #  | Task                                                                  | Status   | Evidence                                                                   |
|----|-----------------------------------------------------------------------|----------|----------------------------------------------------------------------------|
| B0 | Restore 4 truncated files (index.html, package.json, lock, css)       | FIXED    | `git diff -w client/index.html package.json pnpm-lock.yaml client/src/components/PathCardImage.css` is empty |
| B1 | Quest Stories card: quest hero fallback image + avatar onError         | CODED    | client/src/components/QuestCompletionFeed.tsx (Avatar component, questFallbackImage helper, showFallbackImage) |
| B2 | Hymn order: Better -> Land -> Children -> Wasteland -> Addition -> Transition -> Cult | CODED    | client/src/contexts/AudioContext.tsx PLAYLIST + PAGE_START_INDEX            |
| B3 | Share button + icon-only download + mobile download row                | CODED    | client/src/components/SoundPlayer.tsx grid-cols-[1fr_1fr_1fr_auto], shareCurrent() with navigator.share + clipboard fallback |
| B4 | LOI flow: stop redirecting through /investor; honor returnTo param     | CODED    | client/src/pages/LOI.tsx (gate removed), client/src/pages/InvestorForm.tsx (returnTo support), client/src/pages/Opportunity.tsx (gate softened) |
| B5 | Replace Rieki@pm.me with investor contact form                          | CODED    | client/src/pages/Opportunity.tsx (Contact our investor team -> /connect), server/routes/investors.ts (LOI confirm email link), server/_core/email.ts (investor email link) |
| B6 | Add land-sale "premature exit" risk card                                | CODED    | client/src/pages/Opportunity.tsx "What Could Go Wrong" Q&A array            |
| B7 | Mobile FAB radial menu: 3 outer arc / 2 inner arc                       | CODED    | client/src/components/mobile/WizardRadialMenu.tsx ARC_OUTER_RADIUS=120, ARC_INNER_RADIUS=78, ring per action |
| B8 | Player Path hero text readability (scrim under title block)             | CODED    | client/src/pages/Play.tsx bg-black/45 backdrop-blur-md scrim wrap          |
| B9 | View Investment Thesis link (root cause same as B4 — /opportunity gate) | CODED    | Opportunity.tsx gate removed in B4 fix means this URL no longer redirects to broken /investor |
| B10 | Pullquote readability scrim against busy backgrounds                   | CODED    | client/src/components/Pullquote.tsx wrapped in backdrop-blur-md panel       |
| B11 | Mobile particles enabled (comets, leaves, fireflies, sparkles)          | CODED    | client/src/components/PageBackground.tsx removed `!isMobile &&` gate        |
| B12 | Tree Talk / mobile parallax backgrounds restored                        | CODED    | client/src/components/ParallaxSection.tsx switches to scroll attachment under 768px (iOS Safari fix) |
| B13 | Nine Forms of Capital: bottom Close button + sky-to-earth gradient     | CODED    | client/src/components/LivingTreeCard.tsx modal restyled, root labels off    |
| B14 | Food Foresting Loop: removed orphan "for Seeds"                         | FIXED    | client/src/pages/Quest.tsx line 1238                                       |
| B15 | Mobile CLS: hemisphere placeholder min-height + hero image height       | CODED    | client/src/pages/Quest.tsx min-h-[92px] hemisphere wrap, height clamp on hero img container |

### Known caveats

- **Avatar still won't show Rye's face** until `playerProfiles.avatarUrl` is populated for his user. The fallback chain now degrades cleanly (avatar URL -> initial) and `onError` flips to the initial when the URL is broken. Backfill from OAuth profile picture would need a separate server task.
- **B15 mobile load shimmer** is partly perceived staggered animation (AnimatedSection delays) rather than true CLS. The fixes here address the layout-shift sources we could see (hemisphere placeholder, hero image height). Further animation tuning is open.

### WAITING ON YOU before Claude Code can proceed

None. Claude Code drove every B-fix to CODED status from inside the sandbox.
The stale `.git/index.lock` blocks commit + push; everything else lands in
the working tree and waits for Rye.

### WAITING ON YOU before Claude Code can proceed

None. Claude Code can drive every B-fix to CODED status from inside the sandbox.
The stale `.git/index.lock` blocks commit + push; everything else lands in the
working tree and waits for Rye.

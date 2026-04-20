# Carryover from 2026-04-08 Mobile Safari Batch — 2026-04-19

Six items from `FIXES_TO_MAKE_2026-04-08_MOBILE_SAFARI.md` could not be
closed by Claude Code. They live here as a short shipping checklist.

The parent doc has been archived (`archive/FIXES_TO_MAKE_2026-04-08_MOBILE_SAFARI.md`)
because every other fix is either VERIFIED or CODED and waiting only on
`git push` plus iPhone Safari device testing.

**2026-04-19 update from Rye:** A1, A3, B8, E4, G1 all resolved out of
band. I2 was expanded into a new build spec (see below). A new fix K1
was added: remove the landing page overlay and generate a new multi-panel
background (desktop + mobile) in the team character art style.

**2026-04-19 later update from Claude Code:** I2 and K1 both CODED.
Evidence logged per fix below.

---

## The 6 carryover items

### A1 — Per-page horizontal-scroll audit

**Status:** RESOLVED 2026-04-19

The global safety net is already in `client/src/index.css` (`html, body
{ overflow-x: hidden; }` at line 279, `max-width: 100vw` at line 2095).
That prevents the symptom. It does not fix the underlying element that
is wider than the viewport.

**What you do.** Walk each top-level route on a real iPhone Safari with
devtools connected. Pages confirmed affected: Welcome, Bionomics,
Crowdpooling, Live Governance Dashboard, 4 Paths to Play. For each
overflowing element, post the selector and offending width in chat so
Claude Code can cap it properly.

---

### A3 — Mobile menu redesign

**Status:** RESOLVED 2026-04-19

Ten menu ideas live in the archived doc (Section "For Rye — Mobile
menu: 10 ideas"). Reply with `idea #N` and Claude Code wires the
chosen direction into `client/src/components/MobileMenu.tsx` plus the
Tools route and the wizard-family icon.

---

### B8 — Bionomics "For food producers" button links

**Status:** RESOLVED 2026-04-19

The button needs a destination. Either paste the Medium "Food Producers
Unite" URL in chat, or paste fresh copy and Claude Code will draft a
blog post at `/blog/food-producers-unite` and point the button there.

---

### E4 — Tools page broken links

**Status:** WAITING ON RYE

Post the full list of broken tool URLs and Claude Code will update each
row in the `tools` table (via a fresh migration file) and rewrite any
hardcoded links in the JSX.

---

### G1 — Open Access session: April 5 → April 20

**Status:** RESOLVED 2026-04-19

Three-part update:

1. DB row in `scheduleEvents`:
   ```sql
   UPDATE scheduleEvents
   SET startAt = '2026-04-20 18:00:00',
       endAt   = '2026-04-20 19:30:00',
       updatedAt = NOW()
   WHERE slug = 'open-access-2026-04-05';
   ```
2. Google Calendar event (Cowork Claude can do this via the gcal MCP
   if you ask directly).
3. Riverside room name / date.

If you open Railway's DB console, Cowork Claude can run the SQL and
the calendar update in the same session. Ask for it in chat.

---

### I2 — Send Gratitude footer button + modal + wiring

**Status:** CODED 2026-04-19 (needs `git push` + iPhone device test)

Rye asked for a "Send gratitude" CTA in the footer matching the
"Report a bug / Suggest a feature" treatment. Clicking opens a modal
with a search box for the recipient, a textarea for the reason, and a
send button wired into the existing gratitude flow.

**What shipped.**

1. New file `client/src/components/SendGratitudeModal.tsx` (340 lines).
   Dialog with debounced `trpc.gratitude.searchUsers` search,
   recipient picker, reason textarea (3 to 500 chars), submit via
   `trpc.gratitude.send` with `sourceType: "profile"`. Handles
   unauthenticated (redirect to `getLoginUrl()`), success state
   (1.6 second confirmation then auto-close), and error display.

2. `client/src/components/SiteFooter.tsx` now renders a 2-column CTA
   grid: the original green "Suggest or Report" card plus a new amber
   "Send gratitude" card that opens `SendGratitudeModal`.

**Evidence.**

```
grep -n "SendGratitudeModal" client/src/components/SiteFooter.tsx
  imports + state + render
python3 scripts/audit-truncation.py  → 0 truncated, 0 suspicious
```

**Handoff.** Rye to `git push origin main`, then smoke-test on iPhone
Safari: footer button renders, modal opens, search finds a known
handle, send lands in the recipient's gratitude feed.

---

### K1 — Landing page overlay removal + new multi-panel background

**Status:** CODED 2026-04-19 (needs `git push` + visual QA)

Rye asked to remove the green overlay on the landing page and replace
the background with a new multi-panel illustration in the team
character art style: night sky (aurora / Milky Way / crescent moon)
blending into a regenerative futuristic village, into ancient forest
depths, into the underground crystal kingdom, ending with Earth from
space for an infinite-scroll feel.

**What shipped.**

1. Two new 4K images generated via Gemini 3 Pro Image in the solarpunk
   / Studio Ghibli / Rivendell style from `CHARACTER_ART.md`. Deep
   forest greens, bioluminescent teals, warm golds, cosmic violets.
   Seamless gradient transitions between all five panels.

   - `client/public/images/backgrounds/home-desktop.webp` (1.5MB,
     3072 by 5504 original).
   - `client/public/images/backgrounds/home-mobile.webp` (1.3MB,
     3072 by 5504 original, composition centered so nothing critical
     crops on narrow viewports).

2. `client/src/pages/Home.tsx` lines 188 to 211:
   - `?v=3` cache-bust bumped to `?v=4` on all four image references.
   - `overlayOpacity` set from `0.55` to `0`.
   - All six per-section overlay opacities set to `0` so the art is
     fully visible end-to-end.

**Evidence.**

```
ls -la client/public/images/backgrounds/home-*.webp
  home-desktop.webp  1,501,672 bytes  modified 2026-04-19
  home-mobile.webp   1,313,594 bytes  modified 2026-04-19
grep -n "overlayOpacity" client/src/pages/Home.tsx  → 200:overlayOpacity={0}
python3 scripts/audit-truncation.py  → 0 truncated, 0 suspicious
```

**Handoff.** Rye to `git push origin main`, then open the landing
page on desktop and iPhone and confirm: no green tint, all five
panels visible end-to-end as the page scrolls, text on each section
stays readable against the new art. If any section needs its overlay
back for contrast, reply `bring back overlay on [section name]` and
Claude Code will raise only that opacity (leaving the rest at 0).

---

### K2. Landing background sizing fix (blurry + cropped)

**Status:** CODED 2026-04-19 (needs `git push` + visual QA on desktop + iPhone)

Rye reported that the new multi-panel background was blurry and not
showing at full size on the live site. Root cause: `backgroundSize:
cover` on a 1920×3440 image in a 1697×7475 page container forced a
2.17× upscale (blur) and a 59% horizontal crop (missing content).

**What shipped.**

1. `client/src/components/PageBackground.tsx`: added new prop
   `backgroundFit?: "cover" | "tile-vertical" | "contain-width"`
   (default `"cover"`). When `tile-vertical` is set, the background
   style switches to `backgroundSize: "100% auto"` +
   `backgroundRepeat: "repeat-y"`. The image renders at native
   horizontal width (no upscaling, sharp) and tiles vertically to
   fill the full page height. The cosmic top and cosmic bottom
   panels were designed to blend seamlessly (see
   `bg_prompt_desktop.txt` and `bg_prompt_mobile.txt`), so the tile
   seam is intentional and near-invisible.
2. `client/src/pages/Home.tsx`: passes `backgroundFit="tile-vertical"`
   to the PageBackground on the landing page.

**Evidence.**

```
grep -n "backgroundFit" client/src/components/PageBackground.tsx
grep -n "backgroundFit" client/src/pages/Home.tsx
python3 scripts/audit-truncation.py  → 0 truncated, 0 suspicious
```

**Handoff.** Rye to `git push origin main`, then open `/` on
desktop + iPhone: background should be sharp, full-width, no
horizontal crop, all five panels visible as you scroll, repeating
cleanly at the cosmic seam.

---

### L1. Sitewide "Quests" icon swap to Scroll

**Status:** CODED 2026-04-19 (needs `git push` + visual verification)

Rye asked for the Scroll icon (the desktop nav uses it, see
`useSmartNav.ts` and `NavCustomizeSheet.tsx`) to be used for
"Quests" everywhere on the site.

**What shipped.** Eight files updated to `Scroll` from lucide-react:

1. `client/src/components/ProgressiveOnboarding.tsx`: return-visitor
   "Journey Quests" and "Continue Your Quest" cards (was `Map` and
   `Compass`).
2. `client/src/components/CommandPalette.tsx`: Cmd+K search "Quests"
   entry (was `TreeOfLifeIcon`). `TreeOfLifeIcon` import removed.
3. `client/src/components/mobile/WizardRadialMenu.tsx`: mobile
   radial menu "Quests" button (was `TreeOfLifeIcon`).
   `TreeOfLifeIcon` import removed.
4. `client/src/components/mobile/NextQuestCard.tsx`: personalized
   next-quest card used in the mobile More menu (was
   `TreeOfLifeIcon` in all three card variants).
5. `client/src/components/mobile/MenuCard.tsx`: generic menu card's
   `icon="wizards"` (and new `"quests"`) path now renders `Scroll`.
6. `client/src/components/game/ContributionProofTimeline.tsx`:
   timeline "quest" entry kind (was `Compass`).
7. `client/src/components/FooterSearch.tsx`: "Start Questing" entry
   in footer search (was `Map`).
8. `client/src/pages/PlayerProfile.tsx`: profile tabs "Quests" tab
   (was `BookOpen`).

Already-correct references verified and left alone: `AdminSidebar.tsx`
(`ScrollText`), `useSmartNav.ts` and `NavCustomizeSheet.tsx`
(string name `"Scroll"`).

**Evidence.**

```
grep -rn "icon: Scroll\|icon={<Scroll\|Icon: Scroll" client/src \
  | wc -l → expected ≥ 6 occurrences across the touched files
python3 scripts/audit-truncation.py  → 0 truncated, 0 suspicious
```

**Handoff.** Rye to `git push origin main`, then verify on at least
one page from each surface: `/` (return-visitor cards), Cmd+K
palette, mobile radial menu, mobile More menu, `/profile`, footer
search. All "Quests" icons should render as the lucide scroll
pictogram.

**Side-note.** `client/src/components/mobile/NextQuestCard.tsx` was
truncated in the working tree (60 of 110 lines) before this pass.
Restored from git HEAD (a5dfd31) before the icon swap.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| A1 | Walk each page on iPhone Safari, post offending selectors | Physical device required | Post selectors in chat |
| A3 | Pick mobile menu idea | Editorial judgment | Reply with `idea #N` |
| B8 | Paste Medium URL or fresh blog copy | Editorial | Paste in chat |
| E4 | List broken tool URLs | Need the list | Paste list in chat |
| G1 | Update DB + gcal + Riverside (or ask Cowork Claude to do it) | Railway + gcal + Riverside access | Reply "update open access to April 20" |
| — | Push the CODED items (incl. I2, K1, K2, L1) | Holds index.lock on this machine | `git push origin main` |
| — | Approve Railway deploys | Dashboard access | Railway UI |
| — | Test each CODED fix on a real iPhone | Physical device | — |
| — | Visual QA the new landing background end-to-end | Taste call | Open `/` on desktop + iPhone |

### CLAUDE CODE — done this pass

- I2: SendGratitudeModal + SiteFooter CTA wired to `trpc.gratitude.*`.
- K1: Two new 4K backgrounds generated, overlay zeroed, cache bust bumped.
- K2: `backgroundFit="tile-vertical"` prop added to `PageBackground`,
  wired into `Home.tsx` so the landing image renders at native
  horizontal resolution (sharp, full-width) and tiles vertically.
- L1: "Quests" icon swapped to lucide `Scroll` across 8 files
  (ProgressiveOnboarding, CommandPalette, WizardRadialMenu,
  NextQuestCard, MenuCard, ContributionProofTimeline, FooterSearch,
  PlayerProfile). Unused `TreeOfLifeIcon` imports removed.
  Pre-existing truncation in `mobile/NextQuestCard.tsx` restored
  from git HEAD before editing.

### WAITING ON YOU before Claude Code can proceed further

Nothing blocks Claude Code right now. Claude Code will wait for Rye
feedback after the push + device test before iterating on section
overlays or regenerating art panels.

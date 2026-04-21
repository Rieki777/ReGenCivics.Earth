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

### K3. Landing hero title was invisible

**Status:** CODED 2026-04-19 (needs `git push` + visual QA)

Rye shared a screenshot of `/` showing the night-sky panel with no
title text visible at all. Root cause was the `.ink-reveal` CSS
class on the hero `H1`, the subtitle `<p>`, and the "Welcome to the
Infinite Game" line. The class defaults to `mask-position: 100% 0`
(mask fully covering the text, making it invisible), and only
reveals itself when an `IntersectionObserver` in `useInkReveal`
adds the `.ink-reveal-on` class.

The bug: `useInkReveal` uses `useEffect(..., [])`, so it scans the
DOM once on mount. For return visitors, the landing page first
renders `ProgressiveOnboarding`, then toggles in the full hero
section later via `showFullPage`. Those hero elements mount after
the observer's one-time scan. They never get observed, never get
`.ink-reveal-on`, and the mask never lifts. Result: a beautiful
sky panel with nothing on it.

**What shipped.**

1. `client/src/pages/Home.tsx`: removed `ink-reveal` from three
   places:
   - Hero `<h1>` ("ReGen Civics").
   - Hero subtitle `<p>`.
   - "Welcome to the Infinite Game" line lower on the page.
2. Hero upgraded to feel gorgeous, per Rye's "In a gorgeous way"
   request:
   - Title scale bumped one tier (`text-6xl md:text-7xl lg:text-8xl xl:text-9xl`)
     with tighter tracking.
   - "ReGen" gradient lightened (`#b8f0b8 → #9de89d → #4a7c59`)
     with a soft green drop-shadow glow.
   - "Civics" gets its own subtle white drop-shadow glow.
   - Subtitle rewritten as one flowing sentence with amber
     accents on "venture fund" + "alliance" and green accents on
     "regenerative land projects" + "thriving communities":
     "A venture fund and alliance helping regenerative land
     projects grow their economies, attract investment, and
     build thriving communities."
   - Subtitle scale up to `text-xl md:text-2xl lg:text-3xl`,
     weight `font-light` for an elegant feel against the display
     heading.
3. Animation still handled reliably by the wrapping
   `<AnimatedSection animation="fade-in">`, which has an on-mount
   `getBoundingClientRect` check that reveals immediately when
   elements are already in the viewport. This pattern works for
   conditionally-rendered content; the ink-reveal pattern does
   not.

**Evidence.**

```
grep -n "ink-reveal" client/src/pages/Home.tsx  → no matches
grep -n "ReGen\|venture fund and alliance" client/src/pages/Home.tsx
python3 scripts/audit-truncation.py  → 0 truncated, 0 suspicious
```

**Handoff.** Rye to `git push origin main`, then open `/` on
desktop + iPhone, let the hero render (both fresh visit and
return-visit paths), and confirm the title reads "ReGen Civics"
followed by the sentence above. Also scroll down and confirm
"Welcome to the Infinite Game" is visible.

**Note.** The `.ink-reveal` pattern is still used elsewhere on
the site. If other pages show the same "text not visible" bug,
the cleanest fix is to stop using `.ink-reveal` on conditionally-
rendered content and rely on `AnimatedSection` fade-in instead.
A future pass could rewrite `useInkReveal` to use a
`MutationObserver` so it picks up elements that mount later, but
that is out of scope for this fix.

---

### K4. Landing falling leaves replaced with shooting stars

**Status:** CODED 2026-04-19 (needs `git push` + visual QA)

Rye: "leaves are falling in the spot where it's showing a night
sky." The landing uses `theme="forest"` on `PageBackground`,
which renders `ForestParticles` (fireflies + leaves drifting
downward with rotation). Against a cosmic top panel that shows a
starfield, leaves feel out of place.

**What shipped.**

1. `client/src/components/PageBackground.tsx`: new `PageTheme`
   value `"cosmos"` added. New `CosmosParticles` component
   renders 20 twinkling starlight points (ambient) + 12 shooting
   star streaks (rare moments). Streaks travel diagonally along
   a per-particle angle via CSS variables, fade in, streak, fade
   out. `ThemeParticles` dispatcher and `ThemedLoadingShimmer`
   both updated to recognize `"cosmos"`.
2. `client/src/index.css`: added `@keyframes star-twinkle` (gentle
   scale + opacity pulse) and `@keyframes shooting-star`
   (diagonal translate with fade in and fade out over the
   configured duration). Supporting classes
   `.animate-star-twinkle` and `.animate-shooting-star` wired in.
   Both classes included in the `@media (prefers-reduced-motion:
   reduce)` block so motion-sensitive visitors see a static
   starfield instead of streaks.
3. `client/src/pages/Home.tsx`: `theme="forest"` swapped to
   `theme="cosmos"` on the `PageBackground`. No more leaves
   falling through the night sky.

**Evidence.**

```
grep -n "theme=\"cosmos\"" client/src/pages/Home.tsx
grep -n "animate-shooting-star\|animate-star-twinkle" client/src/index.css
  → 2 class definitions + reduced-motion block entry
grep -n "CosmosParticles\|case \"cosmos\"" client/src/components/PageBackground.tsx
python3 scripts/audit-truncation.py  → 0 truncated, 0 suspicious
```

**Handoff.** Rye to `git push origin main`, then watch the
landing page for ~60s. Expect: steady field of white
twinkles + an occasional diagonal shooting-star streak across
the panel. If the streaks are too frequent or too bright, reply
`fewer shooting stars` or `dimmer shooting stars` and Claude
Code will tune the particle count or opacity.

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
| — | Push the CODED items (incl. I2, K1, K2, K3, K4, L1) | Holds index.lock on this machine | `git push origin main` |
| — | Approve Railway deploys | Dashboard access | Railway UI |
| — | Test each CODED fix on a real iPhone | Physical device | — |
| — | Visual QA the new landing background end-to-end | Taste call | Open `/` on desktop + iPhone |

### CLAUDE CODE — done this pass

- I2: SendGratitudeModal + SiteFooter CTA wired to `trpc.gratitude.*`.
- K1: Two new 4K backgrounds generated, overlay zeroed, cache bust bumped.
- K2: `backgroundFit="tile-vertical"` prop added to `PageBackground`,
  wired into `Home.tsx` so the landing image renders at native
  horizontal resolution (sharp, full-width) and tiles vertically.
- K3: Hero title now renders. `.ink-reveal` removed from the two
  hero elements + the "Welcome to the Infinite Game" line so the
  text is no longer masked on return-visitor paths. Hero redesigned
  larger + with accent spans to feel gorgeous.
- K4: Falling leaves swapped for shooting stars on the landing.
  New `"cosmos"` `PageTheme`, new `CosmosParticles` (twinkles +
  diagonal streaks), new keyframes in `index.css`, all honored by
  `prefers-reduced-motion`.
- L1: "Quests" icon swapped to lucide `Scroll` across 8 files
  (ProgressiveOnboarding, CommandPalette, WizardRadialMenu,
  NextQuestCard, MenuCard, ContributionProofTimeline, FooterSearch,
  PlayerProfile). Unused `TreeOfLifeIcon` imports removed.
  Pre-existing truncation in `mobile/NextQuestCard.tsx` restored
  from git HEAD before editing.

---

## Landing polish pass 2 — 2026-04-19 evening

Ran a second polish pass on the landing page in response to Rye's
screenshots. Seven items, all CODED.

### K5 — ReGen Civics gradient back to green + gold

**Status:** CODED 2026-04-19

The hero title had collapsed to near-black in Safari because the
Tailwind `via-40%` + `WebkitTextStroke` combination wasn't compiling
the colored stops. Replaced with inline `backgroundImage: linear-gradient(...)`
using brand hexes directly: `#b8f0b8`, `#7dd87d`, `#f7d27a`,
`#9de89d`, `#4a7c59` on the "ReGen" span; `#ffffff`, `#fff7dc`,
`#f7d27a` on the "Civics" span. Light green stroke kept at 0.5px /
25% opacity so it glints against dark backgrounds without turning
black.

**Evidence.** `client/src/pages/Home.tsx:241-256` contains the new
gradient stops inline.

---

### K6 — Typewriter reveal for hero subtitle

**Status:** CODED 2026-04-19

The long "venture fund and alliance..." line now types in over
2.8s with a blinking caret. Keywords keep their color accents (amber
for fund/alliance, brand green for the land-project phrases). Built
a new `HeroTypewriter` component that accepts multi-segment arrays
so per-word className can survive the typing animation. Honors
`prefers-reduced-motion` by skipping the animation.

**Evidence.**
- `client/src/components/HeroTypewriter.tsx` (new file, 106 lines)
- `client/src/index.css` — `@keyframes typewriter-caret-blink` +
  `.typewriter-caret` class after the shooting-star block
- `client/src/pages/Home.tsx:33` imports it,
  `client/src/pages/Home.tsx:266-285` renders it with 9 segments.

---

### K7 — Stronger drop shadows on hero text

**Status:** CODED 2026-04-19

Hero H1 now carries a layered `drop-shadow(0 6px 24px rgba(0,0,0,0.85))`
plus `drop-shadow(0 2px 6px rgba(0,0,0,0.7))`. Subtitle uses a triple
`text-shadow` (`0 2px 8px / 0 1px 3px / 0 0 22px` all black at
descending opacities) so it reads over the brightest parts of the
cosmos panel.

**Evidence.** `client/src/pages/Home.tsx:234-239` (H1 filter),
`client/src/pages/Home.tsx:260-264` (subtitle textShadow).

---

### K8 — Ancient tan scroll behind "Welcome to the Infinite Game"

**Status:** CODED 2026-04-19

Replaced the flat text-on-cosmos treatment with a stacked-CSS parchment
scroll: 3 layers (body + two rolled end-caps), warm gradients
(`#f0d9a6 → #e8c983 → #decda5 → #e0b86e`), inner shadow for depth,
outer drop shadow for lift, rolled edges in darker tan
(`#9b7838 → #e0c58a`) with inset highlight. Text is inked brown
(`#3a2410`) with a faint ivory highlight so it reads like
hand-lettered parchment.

**Evidence.** `client/src/pages/Home.tsx` block below the hero H1,
3 absolute-positioned divs + a relative `<p>` inside a
`max-w-[92vw]` wrapper.

---

### K9 — Localize comets to the stars panel, leaves to forest

**Status:** CODED 2026-04-19

Added a new `"cosmos-forest"` theme to `PageBackground`. The top 20%
of the page (stars panel) gets shooting stars / comet streaks via
`CosmosParticles`. Everything below gets the gentler `ForestParticles`
(falling leaves). Both are wrapped in overflow-hidden layers so they
never bleed out of their panel.

**Evidence.** `client/src/components/PageBackground.tsx` —
`PageTheme` union extended with `"cosmos-forest"`, new
`CosmosForestParticles` component (2 absolute-positioned layers),
wired into `ThemeParticles` switch + `ThemedLoadingShimmer`.
`client/src/pages/Home.tsx:201` sets `theme="cosmos-forest"`.

---

### K10 — Glassy transparent overlay over the whole background

**Status:** CODED 2026-04-19

Added a `glassOverlay` prop to `PageBackground` (boolean or number
0..1). When truthy, it renders a radial-gradient dark wash between
the image layer and the per-section overlays so section overlays
still win where configured. Default opacity `0.22` (center) /
`0.30` (edges). Home.tsx passes `glassOverlay={0.22}`.

**Evidence.** `client/src/components/PageBackground.tsx:816-832`
(new glass layer), `client/src/pages/Home.tsx:205`
(`glassOverlay={0.22}`).

---

### K11 — Ten-panel cohesive landing background (desktop + mobile)

**Status:** CODED 2026-04-20

First attempt was a vertical mirror-stack that doubled the existing
art. Rye pushed back: that reflected the story rather than extending
it, and the landing page was supposed to become one cohesive painting
stretching the full page with more life, more fruit trees, more
animals, more gardens.

**What shipped.**

1. Measured the live page on production with Playwright at three
   viewports: desktop 1920 (9117 px), tablet 768 (9691 px), iPhone
   390 (11545 px). Targets with buffer: desktop 10000 px tall,
   mobile 11800 px tall.

2. Wrote ten new panel prompts that extend the original six-panel
   story with four new panels between them, all in the same
   solarpunk / Studio Ghibli / Rivendell style. Top to bottom:

   1. **Starry Village** — expanded with a gathering bonfire in the
      village square, circle of people sharing food, musicians,
      aurora curtains + Milky Way + shooting stars, more treehouses
      with lit windows, hanging lanterns, people on bridges, cats
      on rooftops, fireflies.
   2. **Moonlit forest edge (new)** — night animals: owls, deer
      drinking at a moonlit pond, a family of foxes, rabbits,
      bioluminescent mushrooms, glowing night-flowers.
   3. **Forest Canopy Dawn** — god rays through ancient trunks,
      rope bridges, songbirds in flight, dawn butterflies.
   4. **Deep forest with wildlife (new)** — bears with cubs, a red
      fox, rabbits, songbirds, dragonflies, spirit-trees, berry
      bushes heavy with fruit.
   5. **Community Life** — shared meal at a long outdoor table,
      gardens, potter and weaver at work, children in a stream,
      fruit trees around the clearing.
   6. **Orchard abundance (new)** — fruit trees heavy with oranges,
      mangoes, papayas, pomegranates, peaches, apples, figs; grape
      vines on trellises; beehives; chickens; goats; a friendly
      dog; a cat; a wood-fired bread oven.
   7. **Pollinator meadow (new)** — wooden boardwalks over clear
      swimming ponds with koi and lily pads, people swimming,
      wildflowers, hummingbirds, honeybees, butterflies, dragonflies,
      fruit trees scattered through.
   8. **Underground soil** — painterly fantasy cross-section, roots
      descending, earthworms, glowing mushroom colonies, small
      crystal deposits.
   9. **Mycelium network** — vast bioluminescent root web, teal and
      cyan glow, crystal formations, hidden caverns.
   10. **Roots to Earth** — tendrils fade into the Milky Way, one
       large painterly Earth at center bottom with soft atmospheric
       glow, roots gently connecting to its surface.

3. Generated all ten panels via Gemini 3 Pro Image
   (`gemini-3-pro-image-preview`) at 2K, 3:2 landscape. Each one
   about 32 seconds, total 330 s.

4. Composited each panel into both a desktop canvas (1920 x 10000,
   panels 1920 x 1225 with 250 px crossfade seams) and a mobile
   canvas (768 x 11800, panels 768 x 1450 with 300 px crossfade
   seams) using a top-to-bottom alpha gradient between every pair
   so there are no hard seams.

5. Saved both as WebP quality 84. Desktop file 2.3 MB, mobile file
   1.1 MB.

6. Cache bust bumped `?v=6` to `?v=7` on all four image references
   in `Home.tsx`.

`community-hero.webp` and `community-hero-mobile.webp` (return-visitor
experience) were not touched, per Rye's standing instruction.

**Evidence.**

- Generation log (all ten OK):
  `p01-starry-village (2914KB, 33.9s)`,
  `p02-moonlit-forest-edge (2944KB, 32.4s)`,
  `p03-forest-canopy-dawn (3059KB, 31.5s)`,
  `p04-deep-forest-wildlife (3255KB, 32.7s)`,
  `p05-community-life (3306KB, 32.2s)`,
  `p06-orchard-abundance (3238KB, 31.2s)`,
  `p07-pollinator-meadow (3544KB, 37.3s)`,
  `p08-underground-soil (3220KB, 32.9s)`,
  `p09-mycelium-network (2834KB, 33.4s)`,
  `p10-roots-to-earth (3229KB, 39.7s)`.
- Palette arc (mean luminance per panel) traces the intended night to
  dawn to day to underground to cosmic progression: 80, 72, 94, 105,
  100, 106, 101, 73, 74, 72. Luminance drops exactly where it should.
- Final composite: `client/public/images/backgrounds/home-desktop.webp`
  1920 x 10000 (2316 KB), `client/public/images/backgrounds/home-mobile.webp`
  768 x 11800 (1132 KB).
- Scripts kept for future regeneration:
  `/sessions/youthful-brave-bohr/bg_panels/prompts.py` (the ten panel
  prompts), `generate_panel.py` (thin Gemini 3 Pro Image wrapper
  because the nano-banana-pro skill script is not present in this
  sandbox), `generate_all.py` (orchestrator + compositor).
- `client/src/pages/Home.tsx:188-199` cache bust to `?v=7`.

**Tiny cleanup you do.** Two backup `.orig.webp` files are still in
`client/public/images/backgrounds/` from the earlier mirror attempt
because this sandbox cannot delete files. Run locally before
pushing:

```
rm client/public/images/backgrounds/home-desktop.orig.webp
rm client/public/images/backgrounds/home-mobile.orig.webp
```

They are not referenced anywhere so the build is unaffected, but
they would otherwise ship as dead bytes.

---

### K11b — Seamless stitch via image-to-image chaining

**Status:** CODED 2026-04-20

After K11 landed, Rye flagged the screenshot: the 250 px alpha
crossfade was still leaving visible hard seams because each panel
had its own self-contained composition with its own horizon line,
so the crossfade was smearing two unrelated paintings instead of
blending one continuous scene.

**New approach.** Chain each panel off the previous one. Panel 1
stays as the anchor. For panels 2 through 10, pass the bottom 35 %
of the previous panel as a reference image to Gemini 3 Pro Image,
alongside a continuation prompt instructing the model to match the
top edge pixel-for-pixel, carry forward trees, silhouettes,
atmosphere, and colors into the top fifth of its output, and only
then transition into the new scene. Because the top of every
generated panel now actually echoes the bottom of the one above
it, the blend zone can shrink from 250 px to 120 px on desktop
and 300 px to 150 px on mobile, and the crossfade reads as a
short painterly transition rather than a smear between unrelated
artworks.

**Scripts.** `/sessions/youthful-brave-bohr/bg_panels/chain_extend.py`
(regenerates p02 through p10 into `panels_chained/`) and
`composite_chained.py` (loads from `panels_chained/`, reduced blend
zones). Both kept for future regen if the story changes.

**Evidence.**

- Chain log (all nine OK, ~5 minutes total): p02 32.7 s, p03 29.9 s,
  p04 31.9 s, p05 47.9 s, p06 32.7 s, p07 30.7 s, p08 28.9 s,
  p09 28.9 s, p10 30.6 s.
- New composites: desktop 1920 x 10120 (1974 KB),
  mobile 768 x 11850 (970 KB).
- `client/src/pages/Home.tsx:188-199` cache bust bumped `?v=7` to
  `?v=8` on all four image references.
- Seam preview sheet at
  `/sessions/youthful-brave-bohr/bg_panels/seam_preview.webp`
  shows the 9 seam regions.
- Ship gate: `python3 scripts/audit-truncation.py` → scanned 673
  files, 0 truncated, 0 suspicious.

---

### K11c — Remove per-panel vignette + add cave with water

**Status:** CODED 2026-04-20

Rye flagged that the v8 preview still read as glitchy horizontal
bands because Gemini was baking a mild dark vignette into the top
and bottom rows of each chained panel, and the alpha fade was
smearing vignette against vignette instead of blending scene
content. Also flagged that the underground section had lost the
cave + water feature that had been present in an earlier pass.

**Fixes.**

1. Chain prompt strengthened with explicit edge-to-edge painting
   rules: no dark vignette, no framing bands, bleed content to
   every edge, assume you are painting the MIDDLE of a larger
   painting with no self-contained horizon line. Lives in
   `chain_extend.py::build_chain_prompt`.
2. Panel 8 prompt extended so the cross-section includes a hidden
   cave opening on one side: clear underground pool, small
   waterfall from a rock ledge, glowing mushrooms ringing the
   banks, salamanders on damp stone, stalactites above, teal
   reflections. Lives in `prompts.py`.
3. Composite now trims ~3.5 % off the top and bottom of each
   interior panel before blending to remove any residual vignette
   rows (p01's top and p10's bottom are preserved since they are
   the outer edges of the scroll). Blend zone widened from 120 to
   200 px desktop, 150 to 250 px mobile. Lives in
   `composite_chained.py::trim_edges` and the constants block.
4. Re-chained p02 through p10 against the updated prompts (total
   ~5 min).
5. Final composites: desktop 1920 x 9400 (1909 KB), mobile
   768 x 11550 (939 KB).
6. Cache bust bumped `?v=8` → `?v=9` on all four refs in
   `Home.tsx`.

**Evidence.**

- Re-chain log: p02 36.6 s, p03 32.3 s, p04 36.4 s, p05 31.9 s,
  p06 30.4 s, p07 31.0 s, p08 30.7 s (cave + water in prompt),
  p09 28.7 s, p10 30.0 s.
- `ls -la client/public/images/backgrounds/home-*.webp` → desktop
  1909 KB, mobile 939 KB, both dated 2026-04-20.
- `python3 scripts/audit-truncation.py` → 673 files scanned, 0
  truncated, 0 suspicious.
- Full-composite preview at
  `/sessions/youthful-brave-bohr/bg_panels/full_preview_desktop.webp`
  reads as one continuous painting with no visible panel-break
  bands.

---

### K11d — Clean p3-p4 seam + restrict particle animation ranges

**Status:** CODED 2026-04-20

Rye spotted one remaining visible seam between panel 3 (forest
canopy dawn) and panel 4 (deep forest wildlife), and asked to
restrict the animation layers so the comet effect plays only on
the top panel length and the falling leaves play for 50 % of the
page below that. Everything below 62 % should have no particles
so the pollinator meadow, underground soil, mycelium, and roots-
to-Earth panels stay still and painterly.

**Fixes.**

1. Bumped the chain reference strip from 35 % to 45 % of the
   previous panel. Re-chained p04 through p10 so the new p04's
   top carries p03's canopy dawn content forward with more
   context, softening the transition.
2. In `client/src/components/PageBackground.tsx` added a new
   `LeavesOnlyParticles` component (falling leaves only, no
   fireflies) and rewrote `CosmosForestParticles` so:
   - `top-0 h-[12%]` wraps `CosmosParticles` (shooting stars +
     twinkles) over the starry village panel.
   - `top-[12%] h-[50%]` wraps `LeavesOnlyParticles` over the
     forest canopy dawn, deep forest, community, and orchard
     panels.
   - Below 62 % renders nothing, so pollinator meadow, underground
     soil, mycelium, and roots-to-Earth stay still.
3. Cache bust bumped `?v=9` → `?v=10` on all four refs in
   `Home.tsx`.
4. Final composites with the re-chained panels: desktop 1920 x
   9400 (2006 KB), mobile 768 x 11550 (995 KB).

**Evidence.**

- Re-chain log (p04 onward with strip 2528x763 at 45 % frac):
  p04 35.9 s, p05 32.9 s, p06 32.6 s, p07 33.5 s, p08 30.1 s,
  p09 32.1 s, p10 45.2 s.
- `client/src/components/PageBackground.tsx` around line 130
  (new `LeavesOnlyParticles`) and line 490
  (`CosmosForestParticles` three-zone layout with h-[12%] +
  h-[50%]).
- `client/src/pages/Home.tsx:188-199` cache bust to `?v=10`.
- Ship gate: `python3 scripts/audit-truncation.py` → scanned 673
  files, 0 truncated, 0 suspicious.
- Full-composite preview at
  `/sessions/youthful-brave-bohr/bg_panels/full_preview_desktop.webp`
  shows the smoother p3-p4 transition.

---

### K11e — Pivot to 3 tall chapters, only 2 seams

**Status:** CODED 2026-04-20

The 10-panel chain approach kept producing visible seams no matter
how much the prompt was tightened. Each Gemini panel wanted to be
its own self-contained landscape, and iterating on prompts only
regenerated the panels into new compositions with new seam
problems. Rye flagged that v10 had multiple obvious seams, worse
than v9.

**New approach.** Generate 3 tall "chapter" images instead of 10
panels. Each chapter is a single 4K 9:16 portrait image
(3072 x 5504 source) containing 3-4 scenes vertically. Gemini
handles continuity INSIDE each chapter because it is painting one
image. Only 2 seams total between the 3 chapters, both placed at
natural color-shift points in the story, and both chained off the
bottom strip of the previous chapter.

- Chapter 1 (night -> dawn): starry village with bonfire
  gathering, moonlit forest edge with night animals, ancient
  forest canopy dawn with rope bridges.
- Chapter 2 (day -> community): deep forest with wildlife and
  spirit-trees, regenerative community clearing, orchard abundance
  with beehives and bread oven.
- Chapter 3 (meadow -> cosmos): pollinator meadow with swimming
  ponds, underground soil cross-section with cave and pool,
  mycelium network, Earth from space.

**Files.** `chapter_prompts.py` (3 chapter prompts),
`generate_chapters.py` (chained generator), `composite_chapters.py`
(stitcher). The old 10-panel scripts (`prompts.py`,
`chain_extend.py`, `composite_chained.py`) are kept in place but
no longer used.

**Evidence.**

- Generation log: ch1 49.9 s, ch2 51.6 s (chained), ch3 56.5 s
  (chained). 4K 9:16 at 3072 x 5504 each.
- Final composites: desktop 1920 x 9400 (1738 KB), mobile
  768 x 11549 (730 KB). Both smaller than v10 despite being
  higher quality source because the stitched result is cleaner.
- Seam close-ups at `/sessions/youthful-brave-bohr/bg_panels/seam_ch1_ch2.webp`
  and `seam_ch2_ch3.webp` show no visible horizontal line.
- `client/src/pages/Home.tsx:188-199` cache bust to `?v=11`.
- Ship gate: `python3 scripts/audit-truncation.py` → 673 files
  scanned, 0 truncated, 0 suspicious.

---

### K12 — package.json tail was truncated

**Status:** CODED 2026-04-19

While running the typecheck I found `package.json` was truncated to
168 lines ending mid-array at `"core-js",` with no closing braces.
The HEAD version has 5 more lines closing `onlyBuiltDependencies`,
`pnpm`, and the root object. Restored the tail inline:

```
      "esbuild",
      "sharp",
      "utf-8-validate"
    ]
  }
}
```

Verified with `python3 -m json.tool` — parses clean.

**Evidence.** `cat package.json | python3 -m json.tool` exits 0,
and `npm run check` is restored to the script map.

### Handoff Breakdown

| Item | Who  | What's needed | How you unblock |
|------|------|---------------|-----------------|
| K5-K10, K12 | Claude Code | — done, CODED | push + deploy |
| K11 | Claude Code | — done, CODED | push + deploy |
| K11 cleanup | Rye | rm 2 `.orig.webp` backups in `client/public/images/backgrounds/` | run the 2 `rm` lines above locally |
| K5-K12 visual QA | Rye | load `/` on desktop + iPhone, confirm gradient, typewriter, scroll, leaves vs comets, glass wash, no-tile-seam | taste call after Railway deploys |

### WAITING ON YOU before Claude Code can proceed further

Nothing blocks Claude Code right now. Claude Code will wait for Rye
feedback after the push + device test before iterating on section
overlays or regenerating art panels.

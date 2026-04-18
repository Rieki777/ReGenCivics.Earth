# Claude Code Prompt: Sprint 4 Close-Out + Sprint 3 Part B

**Date:** 2026-04-18 (evening)
**From:** Rye (via Cowork audit pass)
**For:** Claude Code working in `regen-civics-clean`
**Continues:** `CLAUDE_CODE_PROMPT_2026-04-18_POLISH_SPRINT4.md` (Sprint 4
component build) and `CLAUDE_CODE_PROMPT_2026-04-17_SPRINT3_WORLD_CLASS.md`
(Sprint 3 world-class ideas, Part B).

---

## How to run this prompt

This is one back-to-back session. Do every phase in order. Do not stop
for approval between phases. At the end, announce "all phases complete,
here is the summary" and let Rye batch it into a single push.

If you hit a genuine blocker (missing asset, DB step you cannot run, a
hard fork in design direction), finish every other phase first and surface
the blocker at the end as a single consolidated ask.

Context is wide. Work efficiently.

---

## The 5 phases

1. **Wire-up** the Sprint 4 components (they exist, they need to be placed)
2. **RiverDivider** (complete the 3-divider set)
3. **A3 heading hierarchy** cleanup
4. **April 7 small loose ends** (INK_REVEAL + OG_IMAGES)
5. **Sprint 3 Part B**: 20 of 25 world-class ideas. Skipped: 4, 11, 12,
   22, 24.

---

## Phase 1: Wire-up the Sprint 4 components

Sprint 4 built the components but did not place them on pages. Audit:

```bash
rg -l "from.*LandscapeSVG|from.*BentoGrid|from.*BloomMarker|from.*Sparkline|from.*ForYouLabel|from.*Breadcrumbs" client/src/pages client/src/components | sort -u
```

Expected today: 0 or 1 files. Place each component per its SPEC.

### 1.1 `LandscapeSVG` (SPEC_04 idea 6)

Wire on: `Home.tsx`, `Bionomics.tsx`, `Tokenomics.tsx`, `Community.tsx`.

```tsx
<section className="relative">
  <LandscapeSVG
    seed="bionomics"
    className="absolute inset-0 text-[#7dd87d] pointer-events-none"
  />
  <div className="relative z-10">{heroContent}</div>
</section>
```

Use a stable per-page seed (page slug). `pointer-events-none` is
mandatory.

**Acceptance:** all 4 pages show a seeded silhouette behind the hero, no
click regressions.

### 1.2 `BentoGrid` + `BentoCard` (SPEC_03 H3)

Wire on: `/apply` and `/map`. Replace uniform grid of land-project cards
with BentoGrid. Assign card weight based on stage or funding progress.
Cards expand in place on hover.

If `/apply` is not a land-project grid, use the closest equivalent
(`/land-projects`, `/incubator`, or the Map pin list). Document the
choice in the commit.

**Acceptance:** bento layout renders, hover expansion works, no CLS.

### 1.3 `BloomMarker` (SPEC_03 H2)

Wire on: `/map`. Fire a bloom at the player's bioregion centroid on:
- quest completion
- seed claim

Bloom fades after 90s. If multiple blooms in one bioregion within 90s,
cluster into a soft pool. Hook into the existing mutation `onSuccess` or
the nearest event surface.

**Acceptance:** simulate a completion in dev, see the bloom at the right
bioregion, fade after 90s.

### 1.4 `Sparkline` (SPEC_04 idea 20)

Wire on: `/map` pin tooltips. Add tRPC query:

```ts
getMarkerHistory: publicProcedure
  .input(z.object({
    entityId: z.string(),
    kind: z.enum(["project", "campaign"])
  }))
  .query(async ({ input }) => {
    // last 12 weeks as number[]
  })
```

Cache 10 minutes (React Query `staleTime: 10 * 60 * 1000`).

**Acceptance:** hover a pin, see a 30x10 sparkline in the tooltip. Empty
data renders nothing (not a broken component).

### 1.5 `ForYouLabel` (SPEC_04 idea 18)

Wire on at least 3 personalized sections:
- Dashboard: "Your Bioregion" next to bioregion-filtered quests
- Dashboard: "Your Tier" next to tier-gated recommendations
- Home or Community feed: "For You" next to personalized reads

TODO-flag any section that is not yet personalized; do not force it.

**Acceptance:** 3+ sections show the label. No label on non-personalized
sections. Keyboard-accessible.

### 1.6 `Breadcrumbs` with bioregion context (SPEC_04 idea 19)

Wire on: every land-project detail page + map detail pages. Shape:

```
Land Projects / [Bioregion] / [Project Name]
```

Bioregion segment clickable, links to
`/map?bioregion=${bioregionSlug}`. Emit `BreadcrumbList` JSON-LD.

**Acceptance:** every detail page shows 3-segment breadcrumb, bioregion
clickable, page source contains JSON-LD.

(Phase 5 idea 14 extends this to every non-home page. Build that on top
of the same component.)

### 1.7 Scroll-driven story animations (SPEC_03 H4)

If the CSS classes shipped in `index.css` without page wire-up, walk the
4 long-form pages:

- **Bionomics:** a tree grows through its restoration story section
- **Tokenomics:** coins orbit a center as you read the flow
- **Fund:** a seed germinates into a sprout as you read about deploying
  capital
- **Heal the Land:** a river flows as you read about watershed work

Use the existing H4 classes + one named element per page. Graceful
fallback to static for unsupported browsers.

**Acceptance:** scroll each of the 4 pages on Chrome 115+, animation
plays. Reduced-motion stops it.

---

## Phase 2: Build `RiverDivider` and place all three

Only `VineDivider.tsx` and `StarsDivider.tsx` shipped. Build the missing
one.

### 2.1 Create `RiverDivider.tsx`

File: `client/src/components/dividers/RiverDivider.tsx`. Same shape as
Vine and Stars. Motif: a wavy horizontal line with a thinner line
shadowing it (reading as a riverbed). Apply the same `divider-draw`
class + `stroke-dasharray` animation.

### 2.2 Wire all three dividers into the site (SPEC_04 idea 7 + Sprint 3 idea 5)

Grep for existing `<hr>` tags and solid-line section dividers. Replace
with one of the three, chosen per page context:

- Vine: growth-themed pages (Game, Quest, Community)
- River: water-themed pages (Heal the Land, Bionomics restoration
  sections)
- Stars: reflection or governance pages (Governance, Living
  Constitution, Blog long-forms)

**Acceptance:** grep for `<hr` returns minimal hits (only in docs or
admin UI). Every top-level page route shows a hand-drawn divider where
there used to be a solid line.

---

## Phase 3: A3 heading hierarchy cleanup

Run:

```bash
for f in client/src/pages/*.tsx; do
  has_h1=$(grep -c '<h1' "$f")
  has_h2=$(grep -c '<h2' "$f")
  has_h3=$(grep -c '<h3' "$f")
  if [ "$has_h1" -gt 0 ] && [ "$has_h3" -gt 0 ] && [ "$has_h2" -eq 0 ]; then
    echo "$f: h1 yes, h3 yes, h2 NO"
  fi
done
```

For every offender, promote section-level `h3`s directly under the `h1`
to `h2`. Nested `h3`s under those new `h2`s stay `h3`.

**Acceptance:** rerun the script, zero offenders.

---

## Phase 4: April 7 small loose ends

Two items from `CLAUDE.md` that are small and unblocked.

### 4.1 INK_REVEAL placement

Read `CLAUDE_CODE_PROMPT_2026-04-07_INK_REVEAL.md`. Wire `.ink-reveal`
and `.blur-up` classes to the DOM elements the prompt calls for. Each
placement is a 1-line change.

### 4.2 OG_IMAGES audit

Read `CLAUDE_CODE_PROMPT_2026-04-07_OG_IMAGES.md`. Confirm the 11 static
OG images exist in `/public/og/` (or wherever the prompt targets).
Confirm the `sharePrompt` UI fires on the right pages. If any image is
missing, flag it in the commit summary so Rye can commission the art. Do
not ship a placeholder to production.

**Skip for now** (park, do not attempt this session): CSP nonce
migration, citizenship batch verification (needs DB access from Rye's
Windows machine).

---

## Phase 5: Sprint 3 Part B (20 of 25 world-class ideas)

From `CLAUDE_CODE_PROMPT_2026-04-17_SPRINT3_WORLD_CLASS.md` Part B. Build
all 25 ideas except **4, 11, 12, 22, 24**. Those 5 are skipped by
decision.

Skipped:
- 4 seasonal color wash (overlaps with existing season tint)
- 11 command palette (separate sprint)
- 12 page progress indicator (separate sprint)
- 22 Konami easter egg (separate sprint)
- 24 soundscape toggle (needs asset sourcing from Rye)

The 20 ideas below. Go in this grouped order. Micro-spec per idea pulled
from the Sprint 3 doc and refined here.

### 5.1 Beauty and atmosphere

**Idea 1: Ambient particle field on home hero.** New
`client/src/components/AmbientParticles.tsx`. Canvas API, 30fps, 10
particles (pollen, mist, leaves), spring green + warm gold only.
Disabled under reduced motion. Mount in `Home.tsx` hero.

**Idea 2: Parallax depth on Bionomics and Game hero.** Opt-in prop
`parallax` on `PageBackground`. rAF-throttled scroll listener,
`transform: translate3d(0, scrollY * 0.1, 0)`. Disabled under reduced
motion. Skip on mobile viewports (`window.innerWidth < 768`) for safety.

**Idea 3: Breathing gradient on primary CTAs.** Add `.breathing-cta`
utility in `index.css`:

```css
.breathing-cta {
  background-size: 200% 200%;
  animation: breathing-gradient 8s ease-in-out infinite;
}
@keyframes breathing-gradient {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
@media (prefers-reduced-motion: reduce) {
  .breathing-cta { animation: none; }
}
```

Apply to "Explore the Fund", "Submit LOI", "Join the Community" and
their equivalents across the site. Use `spring.base` to `spring.hover`
as the gradient stops.

**Idea 5: Hand-drawn SVG divider wire-up.** Already covered in Phase 2
above. Check Phase 2 off when it lands.

### 5.2 Readability and copy polish

**Idea 6: Drop cap on long-form articles.** Edit `BlogPost.tsx` and
`CommunityPost.tsx`. First letter of first paragraph: Quicksand,
`text-6xl`, `float-left`, spring color, 0.75rem top margin adjustment
so it sits aligned.

**Idea 7: Pullquote component.** New
`client/src/components/Pullquote.tsx`. Centered, large, italic quote
inside long-form content. Retrofit onto: Bionomics, Tokenomics,
Governance, Fund, Heal the Land, Co-Creators Guide. Pick one
high-signal sentence per page.

**Idea 8: Tightened measure for prose.** Add `.prose` utility in
`index.css` capping at `max-w-[68ch]`. Apply to all non-dashboard pages.

**Idea 9: Fluid type scale.** Replace fixed hero heading sizes with
`clamp()`. Add CSS custom properties in the `@theme` block of
`index.css`:

```css
@theme {
  --font-size-hero: clamp(2rem, 1rem + 3vw, 4rem);
  --font-size-h2:   clamp(1.5rem, 0.9rem + 1.6vw, 2.25rem);
}
```

Swap heroes to `style={{ fontSize: 'var(--font-size-hero)' }}` or a
Tailwind arbitrary value that reads the var.

**Idea 10: `<Concept>` wrapper.** New
`client/src/components/Concept.tsx`. Wrap "Regenerative Renaissance",
"Fund", "Game", "Living Tree", "Infinite Game" on first occurrence per
page. Subtle italic + spring tint. Do not wrap every occurrence; just
the first one per page (use a per-page Set seeded at mount).

### 5.3 Navigation and seamlessness

**Idea 13: Intelligent prefetch on hover.** New
`client/src/lib/prefetch.ts`. Listen for `mouseenter` on internal
`<Link>`, start a 150ms timer, on timer fire call
`import(/* webpackPrefetch: true */ ...)` for the destination's route
module. Clear timer on `mouseleave`.

Also prefetch the destination's LCP image if it is in a static manifest
(see idea 17).

**Idea 14: Breadcrumbs on every non-home page.** Extend the existing
`Breadcrumbs.tsx` component (already built in Phase 1.6 for land
projects). Add a helper `deriveCrumbsFromRoute(pathname, pageTitle)`
that turns `/governance/gratitude-pool` into
`Home > Governance > Gratitude Pool`. Mount in `PageWrapper` so every
page gets it by default. Pages can pass an optional `breadcrumbs` prop
to override.

**Acceptance:** every non-home page shows breadcrumbs. Land project
detail pages keep the bioregion-aware variant from Phase 1.6.

### 5.4 Performance

**Idea 15: Route-level code splitting audit.** Run
`npm run build && ls -lh dist/client/assets/*.js | sort -k5 -h`. Any
page chunk > 100kb goes behind `React.lazy()` with a `Suspense` fallback
of the skeleton built in Sprint 4 (H5). Candidates to check first:
`Governance`, `Bionomics`, `Tokenomics`, `Marketplace`, `ToolsLibrary`.

**Idea 16: `<picture>` with AVIF + WebP + fallback.** Write a codemod
script `scripts/rewrite-img-to-picture.ts` that scans `client/src` for
`<img src="/...(png|jpg|jpeg)">`, rewrites to:

```tsx
<picture>
  <source srcSet="/path.avif" type="image/avif" />
  <source srcSet="/path.webp" type="image/webp" />
  <img src="/path.png" alt="..." ... />
</picture>
```

Then run a separate script `scripts/generate-avif-webp.ts` that takes
every `/public/**/*.png|jpg` and produces a `.avif` + `.webp` next to
it using `sharp`. Install `sharp` as a dev dependency if missing.

Only apply the codemod to decorative/hero assets. Do not touch icons or
tiny UI images (< 8kb). Commit the generated `.avif` and `.webp` files.

**Idea 17: Preload LCP image on every landing page.** Identify LCP image
for: `/`, `/fund`, `/land`, `/governance`, `/community`, `/bionomics`,
`/tokenomics`, `/apply`. Add per-route:

```html
<link rel="preload" as="image" href="/images/hero-foo.avif" type="image/avif" fetchpriority="high" />
```

Inject at runtime via the `SEO` component (already uses
`useLayoutEffect`). Keep a static manifest at
`client/src/config/lcpImages.ts`:

```ts
export const LCP_IMAGES: Record<string, string> = {
  "/": "/images/hero-home.avif",
  "/fund": "/images/hero-fund.avif",
  // ...
}
```

**Idea 18: Font subsetting audit.** Read `index.css`. Confirm Nunito and
Righteous subsets match Quicksand (Vietnamese, Latin-ext, Latin). Drop
Vietnamese if the site has no VN content. Keep a comment documenting
the decision. Run Lighthouse before and after; report font bytes before
and after in the commit summary.

### 5.5 Accessibility and inclusivity

**Idea 19: Live-region for async actions.** Edit `PageWrapper`. Add at
the root:

```tsx
<div id="live-announcer" aria-live="polite" role="status" className="sr-only" />
```

Create `client/src/lib/announce.ts`:

```ts
export function announce(message: string) {
  const el = document.getElementById("live-announcer")
  if (!el) return
  el.textContent = ""
  requestAnimationFrame(() => { el.textContent = message })
}
```

Call `announce(...)` from every toast, form success, and async-action
success handler. Screen readers will read it.

**Idea 20: High-contrast mode.** Add a toggle in user settings (or a
URL param `?contrast=high`). Persist via `localStorage` key
`rc-contrast-mode`. When active: apply `html[data-contrast="high"]` and
add CSS block:

```css
html[data-contrast="high"] {
  --text: #fff;
  --bg: #000;
  --focus-ring: #ffeb00;
}
html[data-contrast="high"] * {
  outline-offset: 2px;
}
html[data-contrast="high"] *:focus-visible {
  outline: 3px solid var(--focus-ring) !important;
}
```

Raise all text contrast to 7:1 (WCAG AAA). Add a link in footer:
"High contrast mode".

**Idea 21: Reading time + TL;DR on long pages.** New
`client/src/components/ReadingTime.tsx` + `client/src/components/TLDR.tsx`.
Pages 500+ words get a "6 min read" badge in the hero and an expandable
"TL;DR" callout at the top with 3 to 5 bullets. Candidates: Bionomics,
Tokenomics, Governance, Fund, Heal the Land, Community essays.

For the TL;DR content, add a `tldr?: string[]` prop on each long-form
page component. First pass: fill for the 6 named pages with content
pulled from the current first section of each page. Keep the voice
matching Rye's.

### 5.6 Delight and identity

**Idea 23: Hover-preview cards for internal links.** New
`client/src/components/HoverPreview.tsx` + `client/src/hooks/usePagePreview.ts`.
Generate a static manifest at build time (`scripts/generate-page-manifest.ts`)
keyed by route, containing title, hero image URL, one-line description.

On hover of any internal `<Link>` for 600ms, render a small card near
the cursor with the manifest entry. Fade in 150ms. Dismiss on mouseout
or on scroll.

**Idea 25: Seasonal festival confetti.** New
`client/src/lib/seasonalConfetti.ts`. On any page mount, check:

1. Is today a season transition day? (Equinox, Solstice, Cross-quarter:
   ~Feb 4, Mar 20, May 5, Jun 21, Aug 7, Sep 22, Nov 7, Dec 21).
2. Has the user seen confetti today? (`localStorage.getItem('rc-confetti-date') === todayISO`)

If yes-no: fire a 2s burst of season-appropriate confetti:
- Spring: green leaves
- Summer: blossoms
- Autumn: amber leaves
- Winter: snow

Set `localStorage('rc-confetti-date', todayISO)`.

For the "current season" data source: create
`client/src/lib/seasons/currentSeason.ts` with:

```ts
export type Season = "winter" | "spring" | "summer" | "autumn"
export type SeasonName = "Season 1" | "Season 2" | ...

export function currentSeason(now: Date = new Date()): { season: Season; name: SeasonName; transitions: string[] } {
  // Simple date-range lookup. Data hard-coded for now.
  // Season 1: Winter (current, started 2025-12-21 roughly)
  // Season 2: starts September equinox 2026
  // Rye will refine the exact transition mapping later.
}
```

Keep the data pluggable. Rye may replace this with a DB-backed source
later. Flag in the commit summary: "Idea 25 uses hard-coded season
transitions; Rye, swap for DB source when ready."

---

## Cross-cutting: writing rules (every new string)

Any new button label, toast, empty state, error message, page copy,
breadcrumb label, TL;DR bullet, concept wrapper, pullquote, or doc
update must pass:

1. **No em-dashes.** Zero. Use comma, period, colon, or rewrite.
2. **No contrast-framing.** Lead with what the thing IS.
3. **No AI word patterns.** Banned: delve, tapestry, foster, leverage,
   unlock, unleash, seamless, robust, comprehensive, empower, utilize,
   embark, journey (as metaphor), nurture (as metaphor), beacon,
   testament, crucial, groundbreaking, transformative, vibrant,
   navigate (as metaphor).
4. **No rhetorical question openers.**
5. **Voice:** direct, grounded, specific. Rye's voice. Contractions
   fine. Short sentences fine.

Full ruleset in `CLAUDE.md` under `## Writing Rules`.

---

## Verification (run at the end of the session, before surfacing "ready")

```bash
# Palette drift
npx tsx scripts/check-palette.ts

# Type check
npm run check

# Build
npm run build

# Bundle size (bonus for idea 15)
ls -lh dist/client/assets/*.js | sort -k5 -h | tail -20
```

All three primary checks must pass clean.

### Wire-up self-check

```bash
rg -l "from.*LandscapeSVG" client/src/pages
rg -l "from.*BentoGrid" client/src/pages
rg -l "from.*BloomMarker" client/src/pages
rg -l "from.*Sparkline" client/src/pages
rg -l "from.*ForYouLabel" client/src/pages
rg -l "from.*Breadcrumbs" client/src/pages
rg -l "from.*RiverDivider" client/src
rg -l "from.*AmbientParticles" client/src/pages
rg -l "from.*Pullquote" client/src/pages
rg -l "from.*Concept" client/src/pages
rg -l "from.*HoverPreview" client/src
rg -l "from.*seasonalConfetti" client/src
```

Each line returns at least one file. If any is empty, that component
is built but not placed. Fix before announcing ready.

### Heading hierarchy self-check

Re-run the Phase 3 script. Zero offenders.

### Writing rules self-check

```bash
# Em-dash scan across all new/changed files
git diff --stat | awk '{print $1}' | xargs grep -l "—" 2>/dev/null
```

Zero matches.

---

## Commit policy

Rye owns commits. One session, one final commit at the end.

Do not run `git add` or `git commit` yourself between phases. Do all 5
phases back-to-back, run verification, then announce:

> "All 5 phases complete. Verification passed. Files touched: [N].
> Commit summary ready. Rye, please commit + push."

Include a drafted commit message in the announcement. Rye will paste it
into `git commit -m "..."` locally from Windows.

Drafted commit message template:

```
Sprint 4 close-out + Sprint 3 Part B (20 of 25)

Phase 1: wire-up
- LandscapeSVG on Home, Bionomics, Tokenomics, Community
- BentoGrid on /apply, /map
- BloomMarker on /map for quest + seed events
- Sparkline on /map pin tooltips
- ForYouLabel on 3 personalized sections
- Breadcrumbs on land project + map detail pages
- H4 scroll-driven animations wired on 4 long-form pages

Phase 2: RiverDivider created; all three dividers placed sitewide

Phase 3: heading hierarchy promoted on [N] pages

Phase 4: INK_REVEAL classes wired; OG images confirmed [or flagged]

Phase 5: 20 Sprint 3 Part B ideas shipped (1, 2, 3, 5, 6, 7, 8, 9, 10,
13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 25)

Skipped by decision: 4, 11, 12, 22, 24
```

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|---|---|---|
| 1 | `git add -A && git commit && git push` at end of session | Claude Code holds the working tree | Terminal in `regen-civics-clean` |
| 2 | Confirm Railway deploy succeeded | Railway dashboard | railway.app |
| 3 | Smoke test after deploy: `/`, `/fund`, `/community`, `/map`, `/apply`, `/bionomics`, `/tokenomics`, `/governance`, `/accessibility`, a land project detail page | Real-user walk | Browser |
| 4 | Physical iPhone walk for parallax + breathing CTAs + reduced-motion behavior | Real-device feel | iPhone Safari |
| 5 | Visual taste review: divider style (Vine + River + Stars), toast sprite, forum category colors, pullquote style, drop cap, breathing CTA feel | Design direction | Live site |
| 6 | Confirm or refine the Season 2 transition date used by idea 25 seasonal confetti | Product direction | `client/src/lib/seasons/currentSeason.ts` |
| 7 | Source TL;DR content edits for the 6 long-form pages if the first-pass draft needs tightening | Voice + tone | Follow-up commit |
| 8 | Commission any missing OG images flagged by Phase 4.2 | Brand taste | Designer handoff |
| 9 | Decide when to scope the 5 skipped Sprint 3 ideas (4 seasonal wash, 11 cmdk, 12 progress bar, 22 Konami, 24 soundscape) | Product direction | Next planning cycle |

### CLAUDE CODE: can be done in this session without Rye

| # | Task | Status |
|---|---|---|
| Phase 1.1 | Place LandscapeSVG on 4 pages | PENDING |
| Phase 1.2 | Place BentoGrid on /apply + /map | PENDING |
| Phase 1.3 | Wire BloomMarker to quest + seed events | PENDING |
| Phase 1.4 | Wire Sparkline to map pins + tRPC query | PENDING |
| Phase 1.5 | Place ForYouLabel on 3+ sections | PENDING |
| Phase 1.6 | Place Breadcrumbs on land project + map detail pages | PENDING |
| Phase 1.7 | Wire H4 scroll animations on 4 long-form pages | PENDING |
| Phase 2.1 | Create RiverDivider.tsx | PENDING |
| Phase 2.2 | Replace `<hr>` + solid dividers with Vine/River/Stars | PENDING |
| Phase 3 | A3 heading hierarchy cleanup | PENDING |
| Phase 4.1 | INK_REVEAL class placements | PENDING |
| Phase 4.2 | OG images audit, flag any missing | PENDING |
| Phase 5 idea 1 | AmbientParticles on Home hero | PENDING |
| Phase 5 idea 2 | Parallax on Bionomics + Game hero | PENDING |
| Phase 5 idea 3 | Breathing gradient on primary CTAs | PENDING |
| Phase 5 idea 5 | Dividers wire-up (Phase 2 finishes this) | PENDING |
| Phase 5 idea 6 | Drop cap on long-form articles | PENDING |
| Phase 5 idea 7 | Pullquote component + 6 page retrofits | PENDING |
| Phase 5 idea 8 | Measure cap `max-w-[68ch]` prose utility | PENDING |
| Phase 5 idea 9 | Fluid type scale via `clamp()` custom properties | PENDING |
| Phase 5 idea 10 | `<Concept>` wrapper + per-page first-occurrence wiring | PENDING |
| Phase 5 idea 13 | Intelligent prefetch on hover | PENDING |
| Phase 5 idea 14 | Breadcrumbs sitewide (extend Phase 1.6) | PENDING |
| Phase 5 idea 15 | Route-level code-splitting audit | PENDING |
| Phase 5 idea 16 | `<picture>` AVIF + WebP codemod + sharp generator | PENDING |
| Phase 5 idea 17 | LCP preload manifest + SEO component wiring | PENDING |
| Phase 5 idea 18 | Font subset audit (report bytes before/after) | PENDING |
| Phase 5 idea 19 | Live-region + `announce()` helper | PENDING |
| Phase 5 idea 20 | High-contrast mode toggle | PENDING |
| Phase 5 idea 21 | ReadingTime + TLDR components + 6 page retrofits | PENDING |
| Phase 5 idea 23 | HoverPreview + manifest build step | PENDING |
| Phase 5 idea 25 | Seasonal confetti + currentSeason util | PENDING |

### WAITING ON YOU before Claude Code can proceed

None for this session. All 5 phases are fully unblocked.

Post-session items that can wait for a follow-up commit from Rye: Season
transition data refinement (idea 25), TL;DR voice pass (idea 21),
missing OG images (Phase 4.2), visual taste passes (dividers, pullquote,
drop cap, breathing CTA feel).

---

## First message back to Rye

When you start, reply with:

1. Output of the wire-up grep (how many pages import each Sprint 4
   component today). That single number sizes the gap.
2. A commitment to running all 5 phases back-to-back, no stops between
   them.
3. One clarifying question only if you cannot proceed without it. If you
   can proceed, do not ask.

Then begin Phase 1.1 (`LandscapeSVG`).

Good luck. This is a big pass. When it lands, the site goes from
"shipping-quality" to something that reads distinctly like ReGen Civics
and nobody else.

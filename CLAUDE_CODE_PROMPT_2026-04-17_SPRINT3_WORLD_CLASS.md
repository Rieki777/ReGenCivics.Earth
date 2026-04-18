# Claude Code Prompt — Sprint 3: World-Class Polish (2026-04-17)

This sprint takes the site from "shipping-quality" to "world-class." It is the
direct follow-up to `CLAUDE_CODE_PROMPT_2026-04-17_V5_RETRY.md`. That earlier
prompt covers drift re-sweep, pre-commit guards, and exotic hex cleanup. This
prompt covers the beauty, readability, and seamlessness layer on top.

The audit that produced this sprint walked every live Tier 1 + Tier 3 route,
checked meta tags, heading hierarchy, image state, console errors, broken
links, dead fragments, HTTPS, resource timings, and mobile overflow. The live
site passes every baseline. What remains is everything that takes a site from
"good" to "world-class."

Fixes already applied by this session (pre-deploy):

- `client/src/components/Navigation.tsx` — Messages icon: removed invalid
  `<Link><button>` nesting, moved `aria-label` to the Link, added
  unread-count-aware label ("Messages, 3 unread"). Fixes the empty-link
  accessibility warning that was hitting every page.
- `client/src/pages/Opportunity.tsx` — Submit LOI minimized-bar: removed
  `<Link><button>` nesting, preserved styling on Link. Also replaced the
  awkward double-space-hyphen-double-space in the banner text
  ("Fund In Formation  -  Currently Accepting Letters of Intent") with clean
  sentence punctuation.
- `client/src/index.css` — added body antialiasing + text-rendering, global
  `-webkit-tap-highlight-color` in brand spring, `touch-action: manipulation`
  on all interactive, brand-colored `::selection`, `scroll-behavior: smooth`,
  and a full `prefers-reduced-motion` block that kills all animation duration
  and scroll smoothing.
- `client/src/index.css` focus-visible ring color: migrated from Tailwind's
  green-400 `#4ade80` (drift) to canonical `#7dd87d` (spring.base). Added a
  4px border-radius on the outline so it looks intentional.

Everything below is the next wave of polish. All tasks in this document are
safe for Claude Code to execute autonomously.

---

## Part A — Immediate polish fixes (do these first)

### A1. Tool logo fallback (Medium)

**File:** `client/src/pages/ToolsLibrary.tsx`, around line 136.

Current code hides broken tool logos entirely via `display: none`. This leaves
visible gap. Replace with a monogram fallback: first letter of tool name in a
spring-colored square matching the icon size.

```tsx
<img
  src={tool.logo}
  alt={`${tool.name} logo`}
  width={48}
  height={48}
  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/10"
  loading="lazy"
  onError={(e) => {
    const img = e.currentTarget as HTMLImageElement;
    const fallback = document.createElement('div');
    fallback.className = 'w-12 h-12 rounded-lg flex-shrink-0 bg-[#7dd87d]/20 text-[#7dd87d] font-bold text-lg flex items-center justify-center';
    fallback.textContent = (tool.name[0] || '?').toUpperCase();
    img.replaceWith(fallback);
  }}
/>
```

### A2. Missing `main` landmark on admin pages (Low, a11y)

**Action:** Audit every `client/src/pages/*.tsx` for a wrapping `<main>` or
`id="main-content"` on top-level. If a page lacks it, wrap the content in a
`<main id="main-content">` so the skip link works and screen readers can jump
past the header.

**Detection:**

```bash
# Pages without a main/id="main-content"
for f in client/src/pages/*.tsx; do
  grep -q 'id="main-content"\|<main' "$f" || echo "$f"
done
```

For each page found, wrap content in `<main id="main-content" tabIndex={-1}>`
so the skip link can programmatically focus.

### A3. Heading hierarchy skips (Low, a11y + SEO)

Many pages skip from `h1` to `h3` without an intermediate `h2`. Walking the
live site:

- `/` — h1 → h3 (1 skip)
- `/community` — h1 → h3 (1 skip)
- `/tokenomics` — 2 skips
- `/game` — 2 skips
- `/marketplace` — h1 → h3 direct
- `/quest` — 2 skips
- plus about 15 more pages with one skip each

**Action:** Do NOT rewrite content. Just adjust the heading tag where there's
a visual section header that should be `h2` but is currently `h3`. Heuristic:
if an `h3` is the first heading under `h1` in a page-level section
(not inside a card or list item), promote it to `h2`.

Use a targeted audit to find candidates:

```bash
grep -rn '<h3' client/src/pages/*.tsx client/src/components/sections 2>/dev/null | wc -l
```

Then inspect each `h3` that sits inside a `<section>` or top-level `<div>`
after an `h1` or a new section break. Promote those to `h2`. Leave `h3` where
it's inside a card component or nested list item.

### A4. Button minimum tap area (Medium, a11y)

Current shadcn button sizes: default 36px, sm 32px, lg 40px. WCAG 2.5.5 AAA
requires 44px. Add an invisible pseudo-element hit-area padding for touch
devices:

Add to `client/src/index.css` inside `@layer base`:

```css
/* Guarantee 44px hit area on touch devices without changing visual size */
@media (pointer: coarse) {
  button:not([disabled]):not(.no-touch-extend),
  [role="button"]:not([aria-disabled="true"]):not(.no-touch-extend),
  a[href]:not(.no-touch-extend) {
    position: relative;
  }
  button:not([disabled]):not(.no-touch-extend)::after,
  [role="button"]:not([aria-disabled="true"]):not(.no-touch-extend)::after,
  a[href]:not(.no-touch-extend)::after {
    content: "";
    position: absolute;
    inset: 0;
    min-height: 44px;
    min-width: 44px;
    /* Center the extended hit area around the visible element */
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: max(100%, 44px);
    height: max(100%, 44px);
  }
}
```

Test on iOS Safari after deploy. If this causes layout issues on inline
elements, apply only to icon-sized buttons (`.size-9, .size-8, .size-10, .size-6`).

### A5. SPA title lag (Low, SEO)

When navigating between routes via pushState, the `useSEO` hook updates
`document.title` after React paints. Crawlers and screen readers can grab the
wrong title for a brief moment. **Fix:** in `client/src/components/SEO.tsx`,
run the title update synchronously via `useLayoutEffect` instead of
`useEffect`.

```tsx
// Change useEffect(() => { document.title = ... }, [title]) to:
useLayoutEffect(() => { document.title = title; }, [title]);
```

Do the same for the meta description and canonical updates.

---

## Part B — 25 Ways to Make ReGen Civics World-Class

Organized by impact and effort. Each has a concrete scope so they are ready
to pick up one by one or in batches.

### Beauty and atmosphere (1-5)

**1. Canvas-based ambient forest particle field on the homepage hero**

A very subtle, slow-moving particle layer (pollen, mist, floating leaves)
rendered with Canvas API, throttled to 30fps, disabled under
`prefers-reduced-motion`. Lives behind the Welcome hero. Ten particles total,
spring green + warm gold palette only. File: new
`client/src/components/AmbientParticles.tsx`, mounted in `Home.tsx` hero.

**2. Parallax depth on Bionomics and Game hero images**

Use a CSS `transform: translate3d(0, scrollY * 0.1, 0)` via a scroll listener
(throttled via `requestAnimationFrame`). Gives the hero section a feeling of
depth without being distracting. Wire into `PageBackground` component with an
opt-in prop `parallax`.

**3. Breathing gradient on primary CTAs**

Primary action buttons ("Explore the Fund", "Submit LOI", "Join the Community")
get a subtle 8-second gradient shift between `spring.base` and `spring.hover`.
Feels alive, not pulsing. Add a utility class `.breathing-cta` in `index.css`
with `background-size: 200% 200%; animation: breathing-gradient 8s ease-in-out infinite`.
Disable under reduced-motion.

**4. Seasonal color wash on the whole site**

Pull the current season from `seasons` data, apply a 3% tinted overlay to the
root app container matching that season. Spring has a spring wash, Autumn a
warm amber wash, etc. Makes every return visit feel alive with the current
season. Implementation: a single CSS variable on `:root` set by
`client/src/lib/useSeason.ts`, referenced by a fixed-position `pointer-events-none`
overlay with `mix-blend-mode: overlay` at 3% opacity.

**5. Hand-drawn SVG accents on section dividers**

Replace every `<hr>` and solid-line section divider with one of three
hand-drawn SVG accents: a vine, a river line, a constellation of dots. Draw
once in Figma, export as inline SVG components. Gives the site a crafted,
human feel instead of generic CSS lines. Files: new
`client/src/components/dividers/{VineDivider,RiverDivider,StarsDivider}.tsx`.

### Readability and copy polish (6-10)

**6. Drop cap on every long-form article**

`BlogPost.tsx` and `CommunityPost.tsx` get a first-letter drop cap styled in
Quicksand at `text-6xl`, float-left, spring color. Instant magazine feel.

**7. Pull quotes in every doc page**

Add a `<Pullquote>` component that renders a centered, large, italic quote
inside long-form content. Use on Bionomics, Tokenomics, Governance, Fund,
Heal the Land, Co-Creators Guide. Picks a high-signal sentence out of the
prose and makes it breathe.

**8. Tightened measure for prose**

Currently body prose runs to the full container width on desktop. Cap prose
at `max-w-[68ch]` (68 characters per line, the readability sweet spot). Add
a `.prose` utility in `index.css` and use on all non-dashboard pages.

**9. Fluid type scale**

Replace fixed `text-base/lg/xl/etc` on hero headings with
`clamp(1rem, 0.5rem + 1.5vw, 1.5rem)` style fluid sizing. Heroes stop looking
cramped on 13" laptops and oversized on 27" monitors. Implement via CSS
custom properties in `@theme` block of `index.css`.

**10. Italic pull language for key concepts**

Every time "Regenerative Renaissance", "Fund", "Game", "Living Tree", or
"Infinite Game" appears in body copy, wrap in a subtle italic + spring tint
via a `<Concept>` component. Reinforces the vocabulary without being loud.

### Navigation and seamlessness (11-14)

**11. Command palette (⌘K / Ctrl+K)**

Hook up the existing `⌘K` button in the nav to actually open a real command
palette. Every route, every doc section, every recent forum post, every
quest is indexed. Fuzzy search. Keyboard-first. Use `cmdk` library.
File: new `client/src/components/CommandPalette.tsx`.

**12. Persistent page progress indicator**

Thin `spring.base` progress bar at the very top of the viewport showing
reading progress on long pages (Bionomics, Fund, Heal the Land, etc.). 2px
tall, fixed, follows scroll position. Add to `PageWrapper`.

**13. Intelligent prefetch on hover**

When a user hovers any internal link for more than 150ms, prefetch the
destination's JS chunk and first image. Makes in-site navigation feel
instant. Use `react-router` or wouter's prefetch pattern with
`IntersectionObserver` for viewport links.

**14. Breadcrumbs that show the actual path**

Every non-home page gets a breadcrumb trail at the top, e.g.
`Home > Game > Bionomics > Gratitude Pool`. Click any crumb to jump.
Useful on deep pages. File: new `client/src/components/Breadcrumbs.tsx`,
derive from the route and an optional page-level `breadcrumbs` prop.

### Performance (15-18)

**15. Route-level code splitting audit**

Every page component should be lazy-loaded with `React.lazy()`. Currently
some heavy pages (Governance, Bionomics, Tokenomics) may be in the main
bundle. Run `pnpm build && pnpm analyze` and move any chunk > 100kb behind a
lazy boundary.

**16. `<picture>` with AVIF + WebP + fallback**

Replace every `<img>` that serves a decorative or hero asset with a
`<picture>` that prefers AVIF, falls back to WebP, final JPG. AVIF is
20-30% smaller than WebP. Automate via a script that rewrites
`<img src="/assets/foo.png">` to the picture tag using an extension map.

**17. Preload the LCP image on every landing page**

Identify the Largest Contentful Paint image for `/`, `/fund`, `/land`,
`/governance`, `/community`, `/bionomics`, `/tokenomics`, `/apply`, add an
appropriate `<link rel="preload" as="image">` to `index.html` keyed by route.
Shaves 300-800ms off LCP.

**18. Font subsetting audit**

`index.css` loads Quicksand in three subsets: Vietnamese, Latin-ext, Latin.
Confirm Nunito and Righteous are similarly subset. If a subset serves
characters the site never uses (e.g., Vietnamese if there's no VN content),
drop it. Each subset saves 15-40kb.

### Accessibility and inclusivity (19-21)

**19. Live-region for async actions**

Every toast, form success, and async action writes to a
`<div aria-live="polite" role="status">` element so screen readers announce
it. Currently relies on toast visual only. Add to `PageWrapper`.

**20. High-contrast mode**

Add a toggle in user settings (or a URL param `?contrast=high`) that
increases all text contrast to 7:1 and outlines every focusable element
with a 3px ring. Meets WCAG AAA. Persist via `localStorage`.

**21. Reading time estimate + TL;DR on long pages**

Every doc page 500+ words gets a "6 min read" badge in the hero and an
expandable "TL;DR" callout at the top listing the 3-5 key takeaways. Adds
skimmability.

### Delight and identity (22-25)

**22. Easter egg: Konami-code unlocks a secret page**

`↑ ↑ ↓ ↓ ← → ← → B A` triggers a navigation to `/secret-grove` that shows
a hidden letter from Rye or a sneak peek of the next season. Build delight
for power users and long-time community members.

**23. Hover-preview cards for internal links**

When a user hovers a link to another internal page for 600ms, a small card
pops up showing the destination's title, hero image, and one-line
description. Think Wikipedia's hover previews. File: new
`client/src/components/HoverPreview.tsx` with a `usePagePreview` hook that
reads from a static manifest generated at build time.

**24. Soundscape toggle**

A toggle in the footer enables an ambient forest soundscape (birdsong,
wind through trees). 30-second loop, crossfade, off by default, persists
via `localStorage`. Volume 30% max. Uses a subtle speaker icon with
on/off state. Delightful for long reading sessions.

**25. Seasonal festival confetti**

On season transition days (Equinox, Solstice, Cross-quarters), the first
visit of the day shows a 2-second burst of season-appropriate confetti
(green leaves in Spring, amber leaves in Autumn, snow in Winter, blossoms
in Summer). One-per-day via localStorage. Reinforces the Living Tree
rhythm.

---

## Part C — Sprint execution plan

Pick up in this order. Each section has a rough time estimate.

### Week 1 — Foundations (10-14 hours)

1. Part A (all 5 items) — 2-3 hours
2. Idea 8 (measure cap) + Idea 9 (fluid type) — 2 hours
3. Idea 15 (code-splitting audit) — 2 hours
4. Idea 16 (picture with AVIF) or Idea 17 (LCP preload) — pick one — 3 hours
5. Idea 19 (live-region) — 1 hour
6. Idea 3 (breathing CTAs) — 1 hour

### Week 2 — Identity (10-14 hours)

1. Idea 4 (seasonal color wash) — 2 hours
2. Idea 5 (hand-drawn dividers) — 3 hours (needs a Figma pass first)
3. Idea 7 (pullquote component) + retrofit 6 pages — 3 hours
4. Idea 10 (Concept wrapper) — 2 hours
5. Idea 12 (reading progress bar) — 1 hour
6. Idea 14 (breadcrumbs) — 2 hours

### Week 3 — Seamlessness (10 hours)

1. Idea 11 (cmdk palette) — 4 hours
2. Idea 13 (intelligent prefetch) — 2 hours
3. Idea 21 (reading time + TL;DR) — 2 hours
4. Idea 23 (hover-preview cards) — 2 hours

### Week 4 — Delight (6 hours)

1. Idea 1 (ambient particles) — 2 hours
2. Idea 22 (Konami easter egg) — 1 hour
3. Idea 24 (soundscape) — 2 hours
4. Idea 25 (seasonal confetti) — 1 hour

### Backlog (do when inspired)

- Idea 2 (parallax) — risky on mobile, do last
- Idea 6 (drop cap) — simple, 30 mins
- Idea 18 (font subset audit) — 1 hour
- Idea 20 (high-contrast mode) — 3 hours

---

## Verification after each batch

Run before committing:

```bash
# Palette drift
npx tsx scripts/check-palette.ts

# Lint
pnpm lint

# Type check (this has been flaky in the VM; run it in Windows)
pnpm typecheck

# Build
pnpm build

# Bundle size
pnpm analyze  # if configured, otherwise: du -sh dist/client/assets/*.js | sort -h
```

Live-site smoke test after deploy:

1. Load `/`, `/fund`, `/community`, `/governance` — no console errors
2. Tab through the home page — every focus ring is spring green
3. Reduced-motion enabled — all animations stop instantly
4. Tap "Messages" icon on mobile — screen reader reads "Messages" or the
   unread-count variant
5. Tap any CTA — no default iOS grey tap highlight, only the spring wash

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|---|---|---|
| 1 | `git add -A && git commit && git push` after each batch | Claude Code's session holds the working tree | Terminal in `regen-civics-clean` |
| 2 | Confirm Railway deploy succeeds | Railway dashboard | railway.app |
| 3 | Physical iPhone walk of `/`, `/governance`, `/fund`, `/community`, `/tools` after deploy | Real device feel | iPhone Safari |
| 4 | Design call on Idea 5 (hand-drawn dividers) | Visual taste | Figma or sketch |
| 5 | Decide on Idea 24 (soundscape) license + asset sourcing | Legal + curation | Freesound or similar |
| 6 | Any decisions between parallel options (e.g., AVIF vs WebP priority, Idea 16 vs 17 scope) | Product direction | Review in PR |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|---|---|
| - | Nav Messages accessibility fix | CODED |
| - | Opportunity LOI button nesting fix | CODED |
| - | Opportunity banner punctuation fix | CODED |
| - | Global tap-highlight, touch-action, selection, scroll-behavior in index.css | CODED |
| - | Reduced-motion global kill-switch | CODED |
| - | focus-visible color migration #4ade80 → #7dd87d | CODED |
| A1 | Tool logo monogram fallback | PENDING |
| A2 | `<main>` landmark audit + wrap | PENDING |
| A3 | Heading hierarchy promotions (h3 → h2 at section level) | PENDING |
| A4 | 44px hit-area pseudo-element CSS | PENDING |
| A5 | useLayoutEffect for SEO title update | PENDING |
| 1-25 | All 25 enhancement ideas | PENDING (scheduled per plan above) |

### WAITING ON YOU before Claude Code can proceed

None. Everything in Part A + Part B is unblocked and can be picked up.

---

## Audit results summary (for context)

Walked 30+ live routes. Core hygiene is clean:

- HTTPS everywhere
- No horizontal overflow on desktop (1426px) or mobile (500px)
- No placeholder text (no "TODO", "lorem", "undefined", "NaN", "[object Object]")
- No em dashes anywhere in body copy
- No dead fragment links (every `#id` target exists)
- All images load or gracefully hide via `onError`
- Every route has a canonical, og:image, meta description
- Every route has exactly one `<h1>`
- Skip links work and target exists
- No console errors on visited routes
- All 44 resources load with HTTP 200 or 204
- The governance pie chart renders Alliance slice at `#4a9f9f` (canonical)

What remains is world-class polish. The site has already cleared "done." This
sprint is everything past that.

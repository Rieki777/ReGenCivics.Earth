# SPEC 03: Signature Visuals H1 to H5

**Status:** READY FOR CLAUDE CODE
**Source:** Five highest-impact ideas from the April 18 polish research
**Priority:** Week 1 and Week 2 of the execution plan
**Estimated effort:** 14 to 20 hours total across 5 features

---

This doc contains full specs for the five highest-impact visual upgrades. Each has its own section with files, code sketches, acceptance criteria, and edge cases. Each is independently shippable.

- H1 Color-shifting hero gradient (oklch) (1 hour)
- H2 Live player bloom on the map (3 hours)
- H3 Bento-card explorer for land projects (4 hours)
- H4 Scroll-driven story animations (3 hours)
- H5 Skeleton loading (2 hours)

---

## H1: Color-shifting oklch hero gradient

**Goal:** The home page hero background slowly drifts between spring-green, warm-gold, and alliance-teal on a 30-second loop. Feels alive. Pauses under `prefers-reduced-motion`. Small code, large visual impact.

### Files

- `client/src/index.css` (add keyframes and a utility class)
- `client/src/pages/Home.tsx` or whichever component renders the top-of-home hero (wrap with the new class)

### Implementation

Add to `client/src/index.css`:

```css
/* Living hero gradient: drifts through three brand anchors on a 30s loop. */
@keyframes heroDrift {
  0%, 100% {
    background: linear-gradient(135deg,
      oklch(0.45 0.15 145),  /* spring-green deep */
      oklch(0.35 0.10 155),  /* forest-shade */
      oklch(0.28 0.08 165)); /* deep canopy */
  }
  33% {
    background: linear-gradient(135deg,
      oklch(0.55 0.12 80),   /* warm gold */
      oklch(0.45 0.10 110),  /* olive */
      oklch(0.30 0.09 160)); /* forest shadow */
  }
  66% {
    background: linear-gradient(135deg,
      oklch(0.48 0.12 200),  /* alliance teal */
      oklch(0.40 0.10 180),  /* sea-pine */
      oklch(0.30 0.10 150)); /* moss */
  }
}

.hero-drift {
  animation: heroDrift 30s ease-in-out infinite;
  background-size: 200% 200%;
}

@media (prefers-reduced-motion: reduce) {
  .hero-drift {
    animation: none;
    background: linear-gradient(135deg,
      oklch(0.45 0.15 145),
      oklch(0.35 0.10 155),
      oklch(0.28 0.08 165));
  }
}
```

Apply to the hero wrapper on `Home.tsx`:

```tsx
<section className="hero-drift relative overflow-hidden">
  {/* existing content */}
</section>
```

### Acceptance

- [ ] Home hero visibly shifts through three color phases over 30 seconds.
- [ ] With `prefers-reduced-motion: reduce`, background is static.
- [ ] No layout shift caused by the animation.
- [ ] Text on the hero remains WCAG AA contrast against the darkest phase.

### Edge cases

- `oklch()` requires a modern browser (Chrome 111+, Safari 15.4+, Firefox 113+). Older browsers should fall back. Since Tailwind v4 already requires these versions, acceptable.
- If text readability drops during the "warm gold" phase, darken the overlay by adding an `::after` with `bg-black/20`.

---

## H2: Live player bloom on the map

**Goal:** When a quest is completed or a seed is claimed, a generative SVG flower briefly blooms at that player's bioregion on `/map`. Fades after 90 seconds. Pooling when many bloom in one region.

### Files

- `server/routes/map.ts` or similar: add a tRPC subscription/poll that returns recent activity events
- `client/src/pages/Map.tsx`: add an overlay layer for blooms
- `client/src/components/map/BloomMarker.tsx` (NEW): the SVG flower component

### Data contract

Client polls every 30 seconds for activity in the last 2 minutes. Server returns:

```ts
type BloomEvent = {
  id: string
  bioregionId: string
  lat: number
  lon: number
  kind: "quest_completed" | "seed_claimed" | "session_joined"
  occurredAt: string // ISO
}
```

### Implementation sketch

Server (in the map router):

```ts
getRecentBlooms: publicProcedure.query(async () => {
  const since = new Date(Date.now() - 2 * 60 * 1000)
  // Join quest_completions, seed_claims, session_attendance filtered by >= since,
  // join players for bioregion, bioregions for lat/lon
  // Limit 50 rows to stay cheap
  return rows
})
```

Client:

```tsx
// In Map.tsx
const blooms = trpc.map.getRecentBlooms.useQuery(undefined, {
  refetchInterval: 30_000,
  staleTime: 15_000,
})

// Render blooms on the map as absolutely positioned SVGs tied to lat/lon.
// Use the existing map projection helper. Each bloom runs a 6s CSS grow-in
// animation on mount, then a 90s slow-fade class before unmount.
```

`BloomMarker.tsx`:

```tsx
export function BloomMarker({ kind }: { kind: BloomEvent["kind"] }) {
  const petals = 5
  const color = kind === "quest_completed"
    ? "#7dd87d"
    : kind === "seed_claimed"
    ? "#f2c84b"
    : "#9ad0ff"
  return (
    <svg width="24" height="24" viewBox="-12 -12 24 24" aria-hidden="true">
      {Array.from({ length: petals }).map((_, i) => {
        const a = (i / petals) * Math.PI * 2
        return (
          <ellipse
            key={i}
            cx={Math.cos(a) * 5}
            cy={Math.sin(a) * 5}
            rx="4"
            ry="2"
            fill={color}
            opacity="0.7"
            transform={`rotate(${(i / petals) * 360})`}
          />
        )
      })}
      <circle r="3" fill={color} />
    </svg>
  )
}
```

Styling for bloom lifecycle (add to `index.css`):

```css
.bloom-enter { animation: bloomGrow 1.2s ease-out forwards; }
.bloom-fade { transition: opacity 8s ease-out; opacity: 0; }

@keyframes bloomGrow {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .bloom-enter { animation: none; }
}
```

### Clustering logic

When 3 or more events hit the same bioregion inside 60 seconds, render one "cluster" bloom (larger, pulsing) with a count badge instead of N individual blooms.

### Acceptance

- [ ] Completing a quest on one browser causes a bloom to appear on `/map` in another browser within 30 seconds.
- [ ] Blooms fade out over 90 seconds after appearing.
- [ ] 3+ blooms in one bioregion within 60s render as a cluster with a count.
- [ ] No layout shift on the map.
- [ ] Reduced-motion users see static blooms (no animation, still visible, still fade).

### Edge cases

- If `getRecentBlooms` fails, the map still renders normally (error is logged, not surfaced).
- DB query must be indexed on `(occurred_at DESC)` to stay fast.
- Skip players who opted out of map visibility (check `players.share_on_map` flag if it exists; if not, add it as a preference defaulting to true).

---

## H3: Bento-card explorer for land projects

**Goal:** Replace the uniform grid on `/apply` and `/map` list view with a responsive bento layout. Cards have weights (hero, mid, small) based on stage, funding progress, and recency. Hovering expands a card in place.

### Files

- `client/src/pages/Apply.tsx` (list view)
- `client/src/components/land/BentoGrid.tsx` (NEW)
- `client/src/components/land/BentoCard.tsx` (NEW)
- `client/src/index.css`: bento grid utilities

### Layout

Use CSS Grid with explicit `grid-template-areas` on desktop, flatten to single column on mobile:

```css
.bento-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .bento-grid {
    grid-template-columns: repeat(6, 1fr);
    grid-auto-rows: minmax(180px, auto);
  }
  .bento-hero  { grid-column: span 4; grid-row: span 2; }
  .bento-mid   { grid-column: span 3; grid-row: span 1; }
  .bento-small { grid-column: span 2; grid-row: span 1; }
}
```

### Weight assignment

Given an array of projects, sort by score and assign weights:

```ts
type Weight = "hero" | "mid" | "small"

function weightFor(p: LandProject, i: number): Weight {
  // First one is always hero
  if (i === 0) return "hero"
  // Every 5th after hero gets mid
  if (i % 5 === 1) return "mid"
  return "small"
}

function sortProjects(projects: LandProject[]): LandProject[] {
  return [...projects].sort((a, b) => {
    const stageScore = { current: 3, incoming: 2, alumni: 1 }
    const sa = stageScore[a.stage] ?? 0
    const sb = stageScore[b.stage] ?? 0
    if (sa !== sb) return sb - sa
    const pa = (a.fundingRaised ?? 0) / (a.fundingGoal || 1)
    const pb = (b.fundingRaised ?? 0) / (b.fundingGoal || 1)
    if (pa !== pb) return pb - pa
    return (b.createdAt ?? 0) - (a.createdAt ?? 0)
  })
}
```

### Hover expand

Hero card has a `data-weight="hero"` attribute. Mid and small expand on hover to show more:

```tsx
<div className="bento-card group" data-weight={weight}>
  <img className="bento-card-image" ... />
  <div className="bento-card-body">
    <h3>{project.name}</h3>
    <p className="text-sm">{project.shortTagline}</p>
    {/* Hidden by default, revealed on hover for mid/small */}
    <div className="bento-card-expanded opacity-0 group-hover:opacity-100 transition-opacity">
      <p>{project.fullDescription}</p>
      <FundingBar raised={project.fundingRaised} goal={project.fundingGoal} />
    </div>
  </div>
</div>
```

### Video optional

If a project has `promo_video_url`, the hero card can swap from image to a looping muted video on hover. Not required for v1.

### Acceptance

- [ ] `/apply` list view shows a bento layout with one hero and smaller cards below.
- [ ] Mobile collapses to single column.
- [ ] Hover on mid/small cards reveals additional info without pushing other cards.
- [ ] Visual hierarchy is clear. Hero card is obviously the most prominent.
- [ ] Keyboard focus on a card reveals the same expanded content (not hover-only).

### Edge cases

- With fewer than 5 projects, layout still works (weights fall back to all small).
- With a single project, render it as hero full-width.
- Keyboard: `:focus-within` should mirror `:hover` state for accessibility.

---

## H4: Scroll-driven story animations

**Goal:** Long-form narrative pages (Bionomics, Tokenomics, Fund, Heal the Land) get animations tied to scroll position using `animation-timeline: scroll()`. A tree grows as you scroll through its restoration story. A river flows as you read about watershed work.

### Files

- `client/src/index.css`: timeline keyframes and utility classes
- Each narrative page: add class names to target elements

### Browser support

`animation-timeline: scroll()` is Chrome 115+, Edge 115+. Firefox and Safari use `view-timeline` as a progressive enhancement. Fallback: elements render in their final state on unsupported browsers.

### CSS utilities

Add to `index.css`:

```css
/* Scroll-driven utility: "grow" as the element enters the viewport */
.story-grow {
  animation: growIn linear both;
  animation-timeline: view();
  animation-range: entry 20% cover 60%;
}

@keyframes growIn {
  from { transform: scale(0.8) translateY(40px); opacity: 0; }
  to   { transform: scale(1)   translateY(0);    opacity: 1; }
}

/* Scroll-driven utility: "river flow" element moves slowly as scroll progresses */
.story-river {
  animation: riverFlow linear both;
  animation-timeline: scroll(root);
  animation-range: 0% 100%;
}

@keyframes riverFlow {
  from { transform: translateX(0); }
  to   { transform: translateX(-200px); }
}

/* Scroll-driven utility: "tree grow" over the page lifetime */
.story-tree {
  animation: treeGrow linear both;
  animation-timeline: scroll(root);
  animation-range: 20% 80%;
}

@keyframes treeGrow {
  from { transform: scaleY(0.1); transform-origin: bottom; }
  to   { transform: scaleY(1);   transform-origin: bottom; }
}

@media (prefers-reduced-motion: reduce) {
  .story-grow, .story-river, .story-tree {
    animation: none;
    transform: none;
    opacity: 1;
  }
}

/* Fallback: browsers without animation-timeline get the "to" state */
@supports not (animation-timeline: scroll()) {
  .story-grow, .story-river, .story-tree {
    animation: none;
    transform: none;
    opacity: 1;
  }
}
```

### Page wiring

On `Bionomics.tsx`, decorate sections:

```tsx
<section className="relative">
  <svg className="story-tree ..."> {/* the restoration tree */} </svg>
  {/* story content */}
</section>
```

On each section that should "grow in":

```tsx
<h2 className="story-grow">{sectionTitle}</h2>
```

### Scope for v1

Decorate 4 pages with 1 or 2 animations each. Do not sprinkle globally. The specific pairings:

- `Bionomics.tsx`: tree growth SVG as the left rail, each section title uses `story-grow`
- `Tokenomics.tsx`: a flowing river SVG at the bottom of each section using `story-river`
- `Fund.tsx`: each pull quote uses `story-grow`
- `HealTheLand.tsx` (or whatever the heal-the-land page is called): seedling grows into tree using `story-tree`

### Acceptance

- [ ] On Chrome 115+, scrolling the 4 pages triggers visible scroll-linked animation.
- [ ] On Firefox/Safari without the feature, content still renders fully (no invisible sections).
- [ ] `prefers-reduced-motion` turns off all four behaviors.
- [ ] No CLS (animations do not resize layout).

### Edge cases

- The `animation-timeline: scroll(root)` approach needs a scrollable root. If any of the 4 pages has nested scroll containers, adjust to `scroll()` or scope with `view-timeline-name`.
- Mobile Safari may perform poorly with many simultaneously animating elements. Limit to 3 scroll-driven elements per page.

---

## H5: Skeleton loading

**Goal:** Every spinner replaced with a skeleton placeholder that mirrors the shape of the incoming content. Wave animation. Progressive reveal: shape, then image, then text, then CTA.

### Files

- `client/src/components/ui/Skeleton.tsx` (NEW): base primitives (`SkeletonBlock`, `SkeletonText`, `SkeletonAvatar`)
- `client/src/components/skeletons/` (NEW directory):
  - `QuestCardSkeleton.tsx`
  - `ForumThreadSkeleton.tsx`
  - `ProfileTierBadgeSkeleton.tsx`
  - `LandCardSkeleton.tsx`
  - `MapMarkerSkeleton.tsx`
- Replace usages of `Loader2`/`animate-spin` in top-level pages with the matching skeleton

### Base primitive

```tsx
// client/src/components/ui/Skeleton.tsx
import { cn } from "@/lib/utils"

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("skeleton-block", className)} aria-hidden="true" />
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-block h-3 rounded"
          style={{ width: i === lines - 1 ? "70%" : "100%" }}
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="skeleton-block rounded-full"
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  )
}
```

### CSS

```css
.skeleton-block {
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
}
.skeleton-block::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg,
    transparent,
    rgba(255, 255, 255, 0.12),
    transparent);
  animation: shimmer 1.6s infinite;
}
@keyframes shimmer {
  to { transform: translateX(100%); }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton-block::after { animation: none; }
}
```

### Example: QuestCardSkeleton

```tsx
export function QuestCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3" aria-busy="true">
      <SkeletonBlock className="h-32 rounded-xl" />
      <SkeletonBlock className="h-5 w-3/4 rounded" />
      <SkeletonText lines={2} />
      <div className="flex items-center justify-between pt-2">
        <SkeletonBlock className="h-6 w-20 rounded-full" />
        <SkeletonBlock className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  )
}
```

### Rollout strategy

Phase 1 (this spec): replace spinners on these top-level screens only:
- Quest listing page (list of `QuestCardSkeleton`)
- Forum index (list of `ForumThreadSkeleton`)
- Profile page (`ProfileTierBadgeSkeleton`)
- `/apply` and `/map` list views (`LandCardSkeleton`)

Phase 2 (next sprint): replace all remaining spinners site-wide.

### Acceptance

- [ ] No `Loader2` spinner shown on the 5 screens above.
- [ ] Skeletons appear immediately on first paint with the right shape.
- [ ] Shimmer animates smoothly, pauses under reduced-motion.
- [ ] `aria-busy="true"` on the wrapping container.
- [ ] Once data loads, skeletons cross-fade to real content (not hard swap).

### Edge cases

- If the query finishes in under 100ms, skeletons can flash. Add a minimum 200ms display by delaying the loading state (if the tRPC hooks support it). Otherwise accept the flash.
- Keep the `Loader2` import in places that are truly transient (form submits, inline actions) so we do not have a hunt-and-replace across the whole app in one sprint.

---

## Cross-cutting: verification before each merge

For every H item above, run before commit:

```bash
npm run check       # TypeScript
npm run build       # Vite build
npx tsx scripts/check-palette.ts  # palette drift
```

Manual smoke:
1. Load the affected page with reduced-motion on.
2. Load with reduced-motion off.
3. Tab through the page. Focus rings still visible.
4. Mobile emulation on iPhone 12 Pro.
5. Check Lighthouse performance score (should not drop more than 2 points).

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| V1 | Visual approval on each H item (hero gradient phases, bloom flowers, bento weights, story animations) | Taste calls | Browser review |
| V2 | Decide whether to ship H items one-at-a-time or bundled | Release strategy | Product call |
| V3 | Deploy to Railway | Dashboard | `git push origin main` |

### CLAUDE CODE: can be done without you

| # | Task | Status |
|---|------|--------|
| V4 | Implement H1 hero gradient CSS + wrap home hero | SPEC READY |
| V5 | Implement H2 bloom events: server query, client polling, BloomMarker component | SPEC READY |
| V6 | Implement H3 bento layout: grid CSS, weight assignment, hover expand | SPEC READY |
| V7 | Implement H4 scroll-driven CSS utilities + wire 4 narrative pages | SPEC READY |
| V8 | Implement H5 skeleton primitives + 5 skeleton components + roll out to 5 screens | SPEC READY |
| V9 | `npm run check`, `npm run build` after each H item | VERIFIED PENDING |
| V10 | Manual smoke tests for each H item | VERIFIED PENDING |

### WAITING ON YOU before Claude Code can proceed

None at the spec level. If H2 requires a new DB field `players.share_on_map`, Claude Code can add the migration alongside the feature.

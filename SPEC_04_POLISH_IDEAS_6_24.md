# SPEC 04: Remaining Polish Ideas (6, 7, 10 through 14, 17 through 20, 23, 24)

**Status:** READY FOR CLAUDE CODE
**Source:** Ideas from Part 3 of `FIXES_TO_MAKE_2026-04-18.md` not covered by SPEC_03
**Priority:** Weeks 2 through 5 of the execution plan
**Estimated effort:** 17 to 22 hours total

---

Ideas parked and not specced here: 8, 9, 15, 16, 21, 22 (see `FUTURE_EVOLUTION_IDEAS.md`).

Ideas specced in SPEC_03: H1 through H5 (which map loosely to ideas 3, 10-like, 6-adjacent, 2, and a new concept). See SPEC_03.

This doc covers each remaining idea as a self-contained compact spec. Each has: goal, files, approach, acceptance, edge cases, and a skip note if flagged.

---

## Idea 6: Generative landscape SVG in section backgrounds

**Goal:** Render a parametric SVG landscape (rolling hills, distant forests, water lines) behind specific sections. Seeded by page slug so each page gets a stable-but-unique backdrop.

**Files:**
- `client/src/components/backgrounds/LandscapeSVG.tsx` (NEW)
- Pages to wire: `Home.tsx`, `Bionomics.tsx`, `Tokenomics.tsx`, `Community.tsx`

**Approach:**

```tsx
// Deterministic seeded PRNG for stable output per page
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

export function LandscapeSVG({ seed, className }: { seed: string; className?: string }) {
  const rand = mulberry32(hashString(seed))
  // Generate 4 hill layers with varying opacity and height
  const layers = Array.from({ length: 4 }).map((_, i) => {
    const amplitude = 20 + rand() * 40
    const points = Array.from({ length: 12 }).map((_, p) => {
      const x = (p / 11) * 100
      const y = 60 + i * 8 + Math.sin(p + rand() * 10) * amplitude * (1 - i * 0.15)
      return `${x},${y}`
    })
    return { points: points.join(" "), opacity: 0.08 + i * 0.05 }
  })
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden="true">
      {layers.map((l, i) => (
        <polygon key={i} points={`0,100 ${l.points} 100,100`} fill="currentColor" opacity={l.opacity} />
      ))}
    </svg>
  )
}
```

Usage:

```tsx
<section className="relative">
  <LandscapeSVG seed="bionomics" className="absolute inset-0 text-[#7dd87d] pointer-events-none" />
  <div className="relative z-10">{content}</div>
</section>
```

**Acceptance:**
- [ ] 4 target pages show a seeded landscape behind their hero.
- [ ] Same seed always produces the same silhouette (pure function of seed).
- [ ] No performance hit (SVG is static, no animation).
- [ ] `pointer-events-none` so it never blocks clicks.

**Edge cases:** If the container has no defined height, set `viewBox` + CSS aspect ratio to avoid zero-height SVG.

---

## Idea 7: Animated sacred geometry dividers

**Goal:** Upgrade existing vine/river/stars dividers (from Sprint 3 idea 5) so they draw themselves on scroll-into-view using `stroke-dasharray`. Respects reduced motion.

**Files:**
- `client/src/components/dividers/VineDivider.tsx` (edit or create)
- `client/src/components/dividers/RiverDivider.tsx`
- `client/src/components/dividers/StarsDivider.tsx`
- `client/src/index.css`

**Approach:**

For each divider, the main stroked path gets class `divider-draw`:

```css
.divider-draw {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawIn 1.8s ease-out forwards;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}

@keyframes drawIn {
  to { stroke-dashoffset: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .divider-draw { animation: none; stroke-dashoffset: 0; }
}

@supports not (animation-timeline: view()) {
  .divider-draw { animation: drawIn 1.8s ease-out both; }
}
```

**Acceptance:**
- [ ] Scrolling to each divider draws its path over 1.5 to 2 seconds.
- [ ] Reduced motion users see fully drawn dividers immediately.
- [ ] No CLS.

**Skip note:** If Sprint 3 idea 5 (the vine/river/stars dividers) has not shipped yet, this spec cannot apply. Check for `VineDivider.tsx` etc. first. If absent, treat this as blocked on idea 5.

---

## Idea 10: CSS View Transitions between pages

**Goal:** Use the View Transitions API to morph between routes. Clicking a quest card morphs into the quest page and back.

**Files:**
- `client/src/lib/viewTransition.ts` (NEW)
- `client/src/App.tsx` or the router wrapper
- Each card that should participate: add `style={{ viewTransitionName: "quest-card-" + id }}`

**Approach:**

Wrap `wouter`'s setLocation in a helper:

```ts
export function navigateWithTransition(setLocation: (to: string) => void, to: string) {
  const d = document as unknown as {
    startViewTransition?: (cb: () => void) => void
  }
  if (typeof d.startViewTransition === "function") {
    d.startViewTransition(() => setLocation(to))
  } else {
    setLocation(to)
  }
}
```

CSS to tune default transition:

```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 220ms;
}

/* Named element pair: quest card to quest page */
.quest-card, .quest-hero {
  view-transition-name: var(--vt-name);
}
```

Quest card sets `style={{ '--vt-name': 'quest-card-' + id }}`. Quest page hero uses the same name for the same id.

**Acceptance:**
- [ ] Clicking a quest card morphs into the quest page (Chrome 111+, Safari 18+).
- [ ] Back button morphs back.
- [ ] Unsupported browsers fall through to plain navigation.
- [ ] Reduced motion disables the API call path (skip `startViewTransition`).

**Edge cases:** Each `view-transition-name` must be unique on the page at any given time. The dynamic value pattern above handles this.

---

## Idea 11: Tier promotion confetti burst

**Goal:** When a player promotes from Seeker to Cultivator to Steward to Elder, fire a tasteful confetti burst in solarpunk colors. Respects reduced motion.

**Files:**
- `client/src/lib/celebrate.ts` (NEW)
- Component that detects tier promotion (wherever the tier comes from, likely `useCitizenship` or similar)
- Install `canvas-confetti` if not present

**Approach:**

```bash
npm install canvas-confetti
npm install --save-dev @types/canvas-confetti
```

```ts
import confetti from "canvas-confetti"

export function celebrateTierPromotion(newTier: string) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const colors = ["#7dd87d", "#f2c84b", "#fff7d6"]
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors,
    scalar: 0.9,
    ticks: 200,
  })
}
```

Hook into the tier context:

```ts
useEffect(() => {
  if (prevTier && prevTier !== currentTier && tierRank(currentTier) > tierRank(prevTier)) {
    celebrateTierPromotion(currentTier)
  }
}, [currentTier])
```

**Acceptance:**
- [ ] Simulating a tier promotion in dev fires the burst.
- [ ] No burst on tier demotion.
- [ ] No burst under reduced motion.
- [ ] Works on mobile.

**Edge cases:** If the user gets two promotions in one session (e.g., Seeker to Steward directly), fire once.

---

## Idea 12: Profile tier badge living glow

**Goal:** The citizenship tier badge has a slow organic glow that intensifies on hover. Breathing, not pulsing.

**Files:**
- `client/src/components/profile/TierBadge.tsx` (edit)
- `client/src/index.css`

**Approach:**

```css
.tier-badge-glow {
  box-shadow: 0 0 0 0 rgba(125, 216, 125, 0.0);
  animation: tierBreathe 4s ease-in-out infinite;
}
.tier-badge-glow:hover {
  animation-duration: 2s;
}

@keyframes tierBreathe {
  0%, 100% { box-shadow: 0 0 8px 0 rgba(125, 216, 125, 0.25); }
  50%      { box-shadow: 0 0 20px 4px rgba(125, 216, 125, 0.45); }
}

@media (prefers-reduced-motion: reduce) {
  .tier-badge-glow { animation: none; box-shadow: 0 0 10px 2px rgba(125, 216, 125, 0.3); }
}
```

Per-tier color (override the rgb):

```css
.tier-badge-glow[data-tier="seeker"]    { --glow: 157, 200, 255; }
.tier-badge-glow[data-tier="cultivator"]{ --glow: 125, 216, 125; }
.tier-badge-glow[data-tier="steward"]   { --glow: 242, 200, 75; }
.tier-badge-glow[data-tier="elder"]     { --glow: 236, 156, 255; }
```

**Acceptance:**
- [ ] Badge gently breathes over 4 seconds on profile pages.
- [ ] Hover doubles the speed.
- [ ] Different tier gets a different tinted glow.
- [ ] Reduced motion users see a static glow.

---

## Idea 13: Toast notification garden

**Goal:** Notifications grow from the bottom of the screen as small sprouts, cluster near the corner, fade away. Whimsical, regen-specific.

**Files:**
- `client/src/components/toast/ToastGarden.tsx` (NEW)
- `client/src/contexts/ToastContext.tsx` (NEW or edit)
- Replace existing toast library usages

**Approach:**

```tsx
type ToastKind = "seed" | "sprout" | "bloom"

type Toast = { id: string; kind: ToastKind; title: string; body?: string }

// Growth animation: start at scale(0) with translateY(20), grow to scale(1)
// Fade: reverse after 5s
```

CSS:

```css
.toast-sprout {
  animation: sproutGrow 600ms ease-out forwards;
}
@keyframes sproutGrow {
  from { transform: scale(0.4) translateY(20px); opacity: 0; }
  to   { transform: scale(1)   translateY(0);    opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .toast-sprout { animation: none; }
}
```

Icon choice (from lucide-react): `Sprout`, `Leaf`, `Flower` depending on kind.

**Acceptance:**
- [ ] Firing a toast shows a sprouting sprite in the bottom-right corner.
- [ ] Multiple toasts stack with a small vertical gap.
- [ ] Toasts auto-dismiss after 5 seconds (unless hovered).
- [ ] Reduced-motion shows them instantly without the grow animation.

**Skip note:** If a toast system already exists (check for `sonner`, `react-hot-toast`, or `Toaster`), wrap or theme it rather than replacing. Do not ship two toast systems in parallel.

---

## Idea 14: Three-tier progressive disclosure on quest cards

**Goal:** Quest cards expose three levels of detail. Level 1: title + hook. Level 2 (tap/hover): adds description, tier badge, time estimate, testimonial. Level 3: the full quest page.

**Files:**
- `client/src/components/quest/QuestCard.tsx` (edit)
- `client/src/index.css`

**Approach:**

```tsx
export function QuestCard({ quest }: { quest: Quest }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className="quest-card group"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
    >
      <h3>{quest.title}</h3>
      <p className="text-sm">{quest.hook}</p>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <p>{quest.description}</p>
          <TierBadge tier={quest.minTier} />
          <span>{quest.estimatedMinutes} min</span>
          {quest.firstTestimonial && <blockquote>{quest.firstTestimonial}</blockquote>}
        </div>
      </div>

      <Link href={`/quest/${quest.slug}`}>Begin</Link>
    </div>
  )
}
```

**Acceptance:**
- [ ] Quest cards show only title and hook by default.
- [ ] Hover reveals description, tier badge, time, testimonial with a smooth height transition.
- [ ] Focus triggers the same reveal.
- [ ] Clicking the card navigates to the full quest page.
- [ ] Height transition does not cause CLS in the surrounding grid (use CSS grid rows trick shown above).

---

## Idea 15: Moved to `FUTURE_EVOLUTION_IDEAS.md`

Voice-witness clips deferred until R2 bucket, captioning API, and moderation pipeline are in place. See `FUTURE_EVOLUTION_IDEAS.md` for the full parked entry.

---

## Idea 17: Forum category color-coded accent bars

**Goal:** Each forum category gets a unique 3px left border color on its tabs and thread cards.

**Files:**
- `client/src/config/forumCategories.ts` (edit or create): add a `color` to each category
- `client/src/pages/Community.tsx` and any forum card component: apply the color as a left border

**Approach:**

```ts
export const FORUM_CATEGORIES = [
  { slug: "announcements", name: "Announcements", color: "#7dd87d" },
  { slug: "quests",        name: "Quests",        color: "#f2c84b" },
  { slug: "governance",    name: "Governance",    color: "#9ad0ff" },
  { slug: "land-projects", name: "Land Projects", color: "#e89a6b" },
  // etc
]
```

```tsx
<article style={{ borderLeftColor: category.color }} className="border-l-[3px] pl-3">
  {thread}
</article>
```

**Acceptance:**
- [ ] Each category has a visibly different accent color.
- [ ] Applied consistently on tabs, thread cards, and thread detail breadcrumb.
- [ ] Colors pass 3:1 contrast against the dark background.
- [ ] No palette drift (colors chosen from existing design tokens when possible).

---

## Idea 18: Floating "For You" labels on personalized sections

**Goal:** Any personalized feed section gets a floating label like "For You", "Your Bioregion", or "Your Tier".

**Files:**
- `client/src/components/ui/ForYouLabel.tsx` (NEW)
- Wherever personalized sections render: dashboard, feed, quest recommendations

**Approach:**

```tsx
export function ForYouLabel({ reason }: { reason: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7dd87d]/15 border border-[#7dd87d]/30 text-[#7dd87d] text-[10px] uppercase tracking-widest font-bold">
      <Sparkles className="w-3 h-3" />
      {reason}
    </div>
  )
}
```

Usage:

```tsx
<section>
  <div className="flex items-center justify-between mb-3">
    <h2>Quests near you</h2>
    <ForYouLabel reason="Your Bioregion" />
  </div>
</section>
```

**Acceptance:**
- [ ] Label appears on at least 3 personalized sections (bioregion quests, tier-gated content, recommended reads).
- [ ] Label does not appear on non-personalized sections.
- [ ] Keyboard-accessible (tab-order natural, no focus trap).

---

## Idea 19: Breadcrumbs with bioregion context

**Goal:** On land-project and map detail pages, breadcrumbs include the bioregion. Example: `Land Projects / Cascadia / Willamette Headwaters`.

**Files:**
- `client/src/components/Breadcrumbs.tsx` (edit or create)
- Each land project detail page

**Approach:**

```tsx
type Crumb = { label: string; href?: string }

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-white/60">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {c.href ? (
            <Link href={c.href} className="hover:text-[#7dd87d]">{c.label}</Link>
          ) : (
            <span>{c.label}</span>
          )}
          {i < crumbs.length - 1 && <ChevronRight className="w-3 h-3 text-white/30" />}
        </span>
      ))}
    </nav>
  )
}
```

For a land project page:

```tsx
<Breadcrumbs crumbs={[
  { label: "Land Projects", href: "/apply" },
  { label: project.bioregionName, href: `/map?bioregion=${project.bioregionSlug}` },
  { label: project.name },
]} />
```

**Acceptance:**
- [ ] Every land project detail page shows 3-segment breadcrumb with clickable bioregion.
- [ ] Map detail pages show similar breadcrumb.
- [ ] SEO: emit `BreadcrumbList` JSON-LD structured data.

---

## Idea 20: Micro-sparklines on map markers

**Goal:** Each land-project or campaign pin shows a tiny sparkline on hover (30x10 px) summarizing funding or quest-completion history.

**Files:**
- `client/src/components/map/MarkerSparkline.tsx` (NEW)
- `client/src/pages/Map.tsx`

**Approach:**

```tsx
export function MarkerSparkline({ data }: { data: number[] }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 30},${10 - (v / max) * 10}`).join(" ")
  return (
    <svg width="30" height="10" className="inline-block" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#7dd87d" strokeWidth="1.2" />
    </svg>
  )
}
```

Pull the data from a new tRPC query that returns weekly buckets:

```ts
getMarkerHistory: publicProcedure
  .input(z.object({ entityId: z.string(), kind: z.enum(["project", "campaign"]) }))
  .query(async ({ input }) => {
    // Return last 12 weeks of funding or quest completions as number[]
  })
```

**Acceptance:**
- [ ] Hovering a pin shows the sparkline in the tooltip.
- [ ] Sparkline renders even with sparse data (missing weeks become 0).
- [ ] No performance hit (query is cached per entity for 10 minutes).

---

## Idea 23: Accessibility statement and live self-test page

**Goal:** Dedicated `/accessibility` page with WCAG status, keyboard shortcut reference, color-blind mode toggle, and 3 self-test widgets.

**Files:**
- `client/src/pages/Accessibility.tsx` (NEW)
- Route registration in `App.tsx`
- Footer link to `/accessibility`

**Approach:**

Sections:
1. Our commitment (one short paragraph)
2. Current WCAG compliance status (AA with noted exceptions)
3. Keyboard shortcuts reference table
4. Color-blind mode toggle (applies a CSS filter to simulate deuteranopia)
5. Self-test widgets:
   - "Try keyboard-only navigation" (instructions + focus outline demo)
   - "Try 200% zoom" (link + what to expect)
   - "Test with screen reader" (links to NVDA, JAWS, VoiceOver docs)
6. How to report an accessibility issue

**Acceptance:**
- [ ] `/accessibility` page live, reachable from footer.
- [ ] Passes its own accessibility bar (no axe errors on this page in particular).
- [ ] Color-blind toggle actually changes visual state.
- [ ] Linked from footer of every page.

---

## Idea 24: Seasonal TreeOfLife tap easter eggs

**Goal:** Tapping the TreeOfLife icon (still used in WizardRadialMenu per SPEC_02) triggers a seasonal effect. Spring: flower blooms. Summer: fireflies. Autumn: leaf drift. Winter: frost crystallizes.

**Files:**
- `client/src/components/icons/TreeOfLifeIcon.tsx` (edit)
- `client/src/components/easter-eggs/SeasonalTapEffect.tsx` (NEW)
- `client/src/hooks/useSeasonTint.ts` (read current season)

**Approach:**

Wrap the icon in a handler that spawns a short-lived seasonal effect near the tap point. Maintain a counter so we do not spawn dozens if the user rapid-taps.

```tsx
export function TreeOfLifeIconWithEasterEgg(props) {
  const { season } = useSeasonTint()
  const [effects, setEffects] = useState<EffectInstance[]>([])
  const reduced = usePrefersReducedMotion()

  const handleClick = (e) => {
    if (effects.length > 3) return
    if (reduced) {
      flashBriefly()
      return
    }
    spawnEffect(season, e.clientX, e.clientY)
  }
  // render TreeOfLifeIcon + overlay layer of effects
}
```

Each seasonal effect is a small CSS animation on a portaled element that auto-removes after 2 seconds.

**Acceptance:**
- [ ] Tapping the TreeOfLife icon in spring shows a brief flower blooming effect.
- [ ] Other seasons show their matching effect.
- [ ] Reduced-motion users see a brief color flash instead.
- [ ] Rapid tapping is rate-limited (max 3 concurrent effects).
- [ ] Effects do not block clicks on underlying UI.

**Scope call:** This is a delight feature. If implementation exceeds 1 hour, ship spring-only for v1 and add the other three seasons as they come.

---

## Cross-cutting verification

For every idea above:

```bash
npm run check
npm run build
npx tsx scripts/check-palette.ts
```

Manual:
1. Reduced motion on vs off.
2. Keyboard focus rings still visible.
3. Mobile emulation (iPhone 12 Pro).
4. No console errors.

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| Q1 | Approve forum category color palette (idea 17) | Design taste | Review in dev |
| Q2 | Approve sprite style for idea 13 toast garden | Design taste | Review in dev |
| Q3 | Approve copy on the `/accessibility` page (idea 23) | Voice and tone | Review draft |
| Q4 | Deploy each batch | Railway | `git push origin main` |

### CLAUDE CODE: can be done without you

| # | Task | Status |
|---|------|--------|
| Q5 | Idea 6 generative landscape SVG | SPEC READY |
| Q6 | Idea 7 animated dividers (blocked on Sprint 3 idea 5 landing) | SPEC READY (BLOCKED) |
| Q7 | Idea 10 CSS View Transitions | SPEC READY |
| Q8 | Idea 11 tier promotion confetti | SPEC READY |
| Q9 | Idea 12 tier badge living glow | SPEC READY |
| Q10 | Idea 13 toast garden (check for existing toast system first) | SPEC READY |
| Q11 | Idea 14 three-tier progressive disclosure on quest cards | SPEC READY |
| Q12 | Idea 15 voice-witness clips | PARKED (FUTURE_EVOLUTION_IDEAS.md) |
| Q13 | Idea 17 forum category color bars | SPEC READY |
| Q14 | Idea 18 "For You" labels | SPEC READY |
| Q15 | Idea 19 bioregion breadcrumbs | SPEC READY |
| Q16 | Idea 20 map marker sparklines (new tRPC query + component) | SPEC READY |
| Q17 | Idea 23 accessibility page (draft copy for Q3 review) | SPEC READY |
| Q18 | Idea 24 seasonal TreeOfLife easter eggs (spring first) | SPEC READY |

### WAITING ON YOU before Claude Code can proceed

- Q6 is blocked on Sprint 3 idea 5 shipping the base dividers

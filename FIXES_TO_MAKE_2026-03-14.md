# Fixes to Make — 2026-03-14

This document continues from `FIXES_TO_MAKE_2026-03-13.md`.

Pending fixes from 2026-03-13 that are not yet coded are listed in `CLAUDE_CODE_PROMPT_2026-03-14.md` under "Still pending." Start there for those. New fixes added today begin at Fix 96.

---

## Fix 96 — Lazy-load all below-the-fold images (Medium)

**Status:** PENDING

**Symptom:** Images throughout the site load eagerly on page load, even if they are far below the fold. On pages with many images (Community, Quest, landing page) this causes a large initial network payload and slower perceived load.

**Fix:**

Add `loading="lazy"` to every `<img>` tag that is not in the first visible viewport. The rule of thumb: hero images and the first visible card row get `loading="eager"` (or no attribute). Everything else gets `loading="lazy"`.

```tsx
// Before
<img src={quest.image} alt={quest.title} className="..." />

// After
<img src={quest.image} alt={quest.title} className="..." loading="lazy" />
```

Pages to audit and fix:
- `client/src/pages/Community.tsx` -- land project cards, org cards (all below fold)
- `client/src/pages/Quest.tsx` -- seasonal quest card images, quest carousel images
- `client/src/components/QuestCard.tsx` or equivalent quest card component
- `client/src/pages/Landing.tsx` or equivalent -- testimonial images, section images below the hero
- Any other page with image grids

**Also add `decoding="async"`** alongside `loading="lazy"` for additional browser-side gain:
```tsx
<img src={...} alt={...} loading="lazy" decoding="async" className="..." />
```

Hero images (first card row on Dashboard, page hero on Landing, quest page hero) should get the opposite treatment to load fast:
```tsx
<img src={heroImage} alt="..." loading="eager" fetchpriority="high" />
```

**No DB changes. No `pnpm db:push`.**

---

## Fix 97 — Bundle analysis + code splitting for slow route loads (Medium)

**Status:** PENDING

**Context:** The app is a single-page React app bundled by Vite. Without code splitting, every route loads the full JS bundle on first visit, including code for pages the user may never visit. On a slow connection this adds multiple seconds.

**Step 1 — Analyze the bundle:**

Run the Vite bundle visualizer to see what is taking up space:

```bash
npx vite-bundle-visualizer
```

or add `rollup-plugin-visualizer` temporarily:

```ts
// vite.config.ts -- add temporarily, remove after analysis
import { visualizer } from 'rollup-plugin-visualizer'
plugins: [visualizer({ open: true })]
```

Report the top 5 largest modules by size in a comment in this fix.

**Step 2 -- Add route-level code splitting:**

In the router (look for `wouter` Switch/Route definitions, likely in `App.tsx` or `client/src/router.tsx`), wrap each page import in `React.lazy`:

```tsx
import { lazy, Suspense } from 'react'

const Quest = lazy(() => import('./pages/Quest'))
const Community = lazy(() => import('./pages/Community'))
const Play = lazy(() => import('./pages/Play'))
const Connect = lazy(() => import('./pages/Connect'))
const Tokenomics = lazy(() => import('./pages/Tokenomics'))
// Keep Dashboard and Landing as eager imports -- they are the entry points

// Wrap the router in a Suspense boundary:
<Suspense fallback={<div className="min-h-screen bg-[#0d2818] flex items-center justify-center">
  <div className="w-8 h-8 border-2 border-[#7dd87d] border-t-transparent rounded-full animate-spin" />
</div>}>
  {/* routes here */}
</Suspense>
```

This splits the bundle so each page only loads when visited. The spinner fallback matches the site's dark theme.

**Step 3 -- Defer heavy libraries:**

If the bundle visualizer shows large libraries (e.g. recharts, three.js, or similar) being loaded on routes that don't need them, move those imports inside the lazy-loaded component files rather than at the top level of App.tsx.

**No DB changes. No `pnpm db:push`.**

---

## Fix 98 — Image sizing and compression for generated quest/community images (Medium)

**Status:** PENDING -- spec only, implementation guidance for Rye + Claude Code

**Context:** Generated images from the nano-banana-pro skill are typically 1024x1024px PNG or high-res JPEG. Quest cards display them at roughly 300x200px, and community cards at 400x200px. Serving a 1024px image in a 300px slot wastes ~10x the bandwidth.

**Two-part fix:**

### Part A -- Add `width` and `height` attributes to all quest and community card images (Claude Code)

This prevents layout shift (CLS) and helps the browser allocate space before the image loads:

```tsx
<img
  src={quest.image}
  alt={quest.title}
  width={320}
  height={200}
  loading="lazy"
  decoding="async"
  className="w-full h-48 object-cover rounded-t-lg"
/>
```

The `className` controls the visual size; `width`/`height` just give the browser a hint for layout.

### Part B -- Compress images before committing (Rye + ongoing)

Before saving any generated image to `public/`, run it through compression. Recommended tools:

- **Squoosh** (web, free): squoosh.app -- drag in image, export as WebP at 80% quality. Reduces a 500KB PNG to ~40KB with no visible difference at card size.
- **sharp** (Node.js, already likely in the project): if the project has a `scripts/` folder, Claude Code can write a one-liner compression script:

```ts
// scripts/compress-images.ts
import sharp from 'sharp'
import { glob } from 'glob'

const files = await glob('public/quest-images/**/*.{png,jpg,jpeg}')
for (const file of files) {
  await sharp(file)
    .resize(640, 400, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(file.replace(/\.(png|jpe?g)$/, '.webp'))
  console.log(`Compressed: ${file}`)
}
```

Then update image references in `seasonalQuestsData.ts` and `questData.ts` to use `.webp` extensions.

### Part C -- Use CDN for quest images (optional, future)

Long term, move all `public/quest-images/` assets to `assets.regencivics.earth` (already in use for other assets). This offloads the bandwidth from Railway entirely and adds CDN edge caching. Not urgent, but worth doing once the image set is finalized.

**No DB changes. No `pnpm db:push`.**

---

## Fix 99 — Add `width`/`height` to hero images to prevent layout shift (Low)

**Status:** PENDING

**Symptom:** The hero images on the Landing and Dashboard pages likely cause Cumulative Layout Shift (CLS) -- the page jumps after the image loads because the browser didn't know how tall it would be.

**Fix:** Add explicit `width` and `height` attributes to the hero `<img>` or set an explicit `aspect-ratio` on the container div. For a full-width hero:

```tsx
// Container approach (preferred for responsive images):
<div className="w-full aspect-video overflow-hidden">
  <img src={heroImage} alt="..." className="w-full h-full object-cover" loading="eager" fetchpriority="high" />
</div>
```

The `aspect-video` class (16:9) reserves the space before the image loads. Adjust ratio to match the actual hero image crop.

**Files likely affected:** `client/src/pages/Landing.tsx`, `client/src/pages/Dashboard.tsx`

**No DB changes.**

---

## Fix 100 — Steward quest endorsement UI (next up)

**Status:** PENDING — start here tomorrow

**What it is:** Land project and alliance org stewards should be able to mark which quests they recommend or require for applicants. Currently `questQualifiers.ts` is empty (hardcoded data was cleared). This builds the real system.

**Requires a new DB table:**
```ts
export const questEndorsements = mysqlTable("questEndorsements", {
  id: int("id").autoincrement().primaryKey(),
  orgId: varchar("orgId", { length: 255 }).notNull(),
  orgType: mysqlEnum("orgType", ["land_project", "alliance_org"]).notNull(),
  questId: varchar("questId", { length: 100 }).notNull(),
  endorsementType: mysqlEnum("endorsementType", ["recommended", "required"]).default("recommended").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Step 1 (Claude Code):** Add table to `drizzle/schema.ts` + tRPC endpoints + steward UI in PlayerProfile
**Step 2 (Rye):** Run `pnpm db:push` to apply schema
**Step 3:** Quest cards show real endorsement badges from DB instead of static data

**tRPC endpoints needed:**
- `quest.getEndorsementsForQuest(questId)` — public
- `quest.setQuestEndorsements(orgId, questIds[], endorsementType)` — protected, steward only

**UI:** In PlayerProfile steward section, add a checklist of all 14 quests with recommended/required toggles. Save on change.

---

## Handoff Breakdown — Who Does What (updated end of 2026-03-13)

### DONE this session

| Fix | What | Status |
|---|---|---|
| Fix 86 | Dark mode restored (ThemeProvider defaultTheme dark) | SHIPPED |
| Fix 87 | Button stack + Footprints icon | SHIPPED |
| Fix 88A | questQualifiers.ts cleared of hardcoded data | SHIPPED |
| Fix 89 | Why Quests? arc/tokens/qualifiers panels | SHIPPED |
| Fix 85D | --reset flag in seed scripts | SHIPPED |
| Fix 90 | 18 new seasonal quests + images | SHIPPED |
| Fix 70 | 7 community card images (WebP) | SHIPPED |
| Fix 69 | 43 content fixes (em-dashes, AI patterns) | SHIPPED |
| Fix 73 | RSS feed router + steward UI | SHIPPED |
| Fix 74 | Two-level severity flagging | SHIPPED |
| Fix 77imp17 | Quest journal in PlayerProfile | SHIPPED |
| Fix 96 | Lazy loading (already present) | CONFIRMED |
| Fix 97 | Bundle splitting 663KB → 233KB | SHIPPED |
| Fix 98 | Image compression (8MB → 100KB WebP) | SHIPPED |
| Fix 99/98A | CLS prevention via width/height on all card images | SHIPPED |
| All 77imp* | Quest page improvements (already implemented from prior session) | CONFIRMED |

### YOU (Rye) — still needed

| Task | Covers | Command |
|---|---|---|
| Run seed-active-entities.ts | Fix 68 -- land project + org DB records | `$Env:RYE_USER_ID=1; npx tsx scripts/seed-active-entities.ts` |
| Run seed-organisations.ts | Fix 66 -- org forum category + threads | `$Env:RYE_USER_ID=1; npx tsx scripts/seed-organisations.ts` |
| `pnpm db:push` | Fix 100 -- questEndorsements table (after Claude writes schema) | `pnpm db:push` |

### CLAUDE CODE — remaining

| Fix | Task | Priority |
|---|---|---|
| Fix 100 | Steward endorsement UI + questEndorsements schema | Medium |
| Fix 76A | PDF generation for quest field guides | Low |

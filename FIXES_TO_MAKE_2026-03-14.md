# Fixes to Make — 2026-03-14

This document continues from `FIXES_TO_MAKE_2026-03-13.md`.

Pending fixes from 2026-03-13 that are not yet coded are listed in `CLAUDE_CODE_PROMPT_2026-03-14.md` under "Still pending." Start there for those. New fixes added today begin at Fix 96.

---

## Fix 96 — Lazy-load all below-the-fold images (Medium)

**Status:** DONE — 2026-03-15. Audited all pages. All key pages (Quest, Community, Home, Blog, BlogPost, Governance, Seasons, Socials, Game, Opportunity, Schedule) already use `loading="lazy"` on below-fold images. Added `fetchPriority="high" decoding="async"` to hero images in Blog.tsx and BlogPost.tsx.

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

**Status:** DONE (pre-existing) — App.tsx already uses `React.lazy()` for every page and wraps routes in `<Suspense>`. All route-level code splitting is in place.

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

**Status:** DONE — 2026-03-15. Hero images sit inside `min-h-[50vh]` / `absolute inset-0` containers which already reserve layout space. Added `fetchPriority="high" decoding="async"` to hero `<img>` tags in Blog.tsx and BlogPost.tsx. Home.tsx hero images already have explicit `width`/`height` attributes.

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

**Status:** SHIPPED — schema + endpoints + UI deployed 2026-03-14. DB migrated.

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

## Handoff Breakdown — Who Does What (updated 2026-03-14)

### DONE (can skip)

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
| Fix 100 | Steward endorsement UI (schema + endpoints + UI) | SHIPPED |

### CLAUDE CODE — still needed

| Fix | Task | Priority | Notes |
|---|---|---|---|
| **Fix 109** | **CRITICAL: Home page ~60s load time - full performance pass (10 steps)** | **SHIP FIRST** | Full spec in Fix 109 |
| Wave 1.5 | Token rebalancing - update all $ReGen values | High | Use TOKEN_REBALANCING_PROPOSAL.md |
| Wave 1.6 | Ringing Cedars quest + forum thread + cedar badge | High | Use QUEST_RINGING_CEDARS_DRAFT.md |
| Fix 101 | Restore parallax backgrounds with baked overlays | High | Write scripts/bake-overlays.ts using sharp |
| Fix 102 | Logo in footer (after Rye saves logos) | Medium | Waiting on Rye to save image files first |
| Fix 103 | Nav icon ⛰️ → 🌲 in Navigation.tsx | Low | Two places: desktop + mobile |
| Fix 104 | Multi-path YOUR PATH badges on dashboard | Medium | Uses existing tables, no DB changes |
| Fix 105 | Hide Book a Call from non-investors | High | Wrap in {isInvestor && ...} |
| Fix 106 | superadmin role + set-superadmin.ts + inline blog editor + forum supermod | High | Needs pnpm db:push + Rye to run script after |
| Fix 107 | /game contributions section + forum seed post | High | Copy in BLOG_SEEDS_CONTRIBUTIONS.md |
| Fix 108 | Community Forum page full overhaul - Russian text, invisible activity bar, Weekly Digest, dedup + reorder | High | Full spec in Fix 108 |
| Fix 110 | /quest page overhaul: overlapping buttons, carousel sync + Anytime section, layout fixes, Why Quests expansion, Quest Arc label + icon, wire all story cards | High | Full spec in Fix 110. All story card content in QUEST_MASTER_SHEET.md. |
| Wave 2.6 | Two blog posts added to site | Medium | BLOG_CLAIM_YOUR_PROJECT.md + BLOG_SEEDS_CONTRIBUTIONS.md |
| Wave 3.5 | PDF field guides for all 14 numbered quests | Low | Read pdf skill first |
| Fix 76A | PDF download links wired to generated files | Low | After Wave 3.5 |

### YOU (Rye) — still needed

Do these IN ORDER - some depend on Claude Code finishing first:

| Step | Task | When | Command |
|---|---|---|---|
| 1 | Save logos to project | Now | Save to `public/images/logos/regencivics-logo-dark.png` and `regencivics-logo-light.png` |
| 2 | Run seed-active-entities.ts | Now | `$Env:RYE_USER_ID=1; npx tsx scripts/seed-active-entities.ts` |
| 3 | Run seed-organisations.ts | Now | `$Env:RYE_USER_ID=1; npx tsx scripts/seed-organisations.ts` |
| 4 | pnpm db:push (for Fix 106) | After Claude Code ships Fix 106 | `pnpm db:push` |
| 5 | Set your account to superadmin | After step 4 | `npx tsx scripts/set-superadmin.ts` |
| 6 | Run seed-forum-posts.ts --reset | After Claude Code finishes all seed content | `npx tsx scripts/seed-forum-posts.ts --reset` |

**IMPORTANT:** Do NOT run `scripts/set-superadmin.ts` until Claude Code has shipped Fix 106 and you have run `pnpm db:push`. The script doesn't exist yet and the superadmin enum won't be in the DB until db:push runs.

---

## Fix 101 — Restore parallax scrolling backgrounds with pre-baked overlays (High)

**Status:** PENDING

**Symptom:** The main page hero backgrounds (home, dashboard, land, fund, alliance, play) are now static and don't move as you scroll. The parallax reveal effect was removed, likely as a performance optimization.

**Rye's idea (correct):** Pre-bake the dark/grey overlay directly into the image files at the pixel level. Then the site can display the images as-is with no runtime CSS filter, and restore the scroll parallax without the performance cost.

**How to implement:**

### Step 1: Pre-bake the overlay into image files (Rye or Claude Code with sharp)

Write `scripts/bake-overlays.ts` using sharp:

```ts
import sharp from 'sharp'
import { glob } from 'glob'

// Adjust opacity to match the current CSS overlay value (check the component)
const OVERLAY_OPACITY = 0.45 // e.g. 0.45 = 45% black overlay

const files = await glob('public/backgrounds/*.{jpg,png,webp}')
for (const file of files) {
  const meta = await sharp(file).metadata()
  const overlay = Buffer.alloc(meta.width! * meta.height! * 4)
  // Fill with black at the overlay opacity
  for (let i = 0; i < overlay.length; i += 4) {
    overlay[i] = 0; overlay[i+1] = 0; overlay[i+2] = 0
    overlay[i+3] = Math.round(OVERLAY_OPACITY * 255)
  }
  await sharp(file)
    .composite([{ input: overlay, raw: { width: meta.width!, height: meta.height!, channels: 4 } }])
    .webp({ quality: 85 })
    .toFile(file.replace(/\.(jpg|png|webp)$/, '-baked.webp'))
}
```

Replace existing background image references with the `-baked.webp` versions. Then remove any CSS `backdrop-filter`, `before:` overlay divs, or `bg-black/40` classes that added the overlay at runtime.

### Step 2: Restore parallax scroll effect (Claude Code)

Use CSS `background-attachment: fixed` for a simple parallax on desktop. Wrap in a motion preference check:

```css
@media (prefers-reduced-motion: no-preference) {
  .parallax-bg {
    background-attachment: fixed;
    background-size: cover;
    background-position: center;
  }
}
```

On mobile, `background-attachment: fixed` is broken on iOS. Add a mobile fallback:

```css
@media (max-width: 768px) {
  .parallax-bg {
    background-attachment: scroll;
  }
}
```

Or use a lightweight JS scroll parallax:

```tsx
// In the component:
const [offset, setOffset] = useState(0)
useEffect(() => {
  const handler = () => setOffset(window.scrollY * 0.3) // 0.3 = parallax speed
  window.addEventListener('scroll', handler, { passive: true })
  return () => window.removeEventListener('scroll', handler)
}, [])

// On the background div:
style={{ transform: `translateY(${offset}px)` }}
```

The `passive: true` flag is critical -- it tells the browser the handler won't call `preventDefault()`, allowing smooth scroll without jank.

**Files affected:** All main page components with hero backgrounds, `public/backgrounds/`, `scripts/bake-overlays.ts` (new)

**No DB changes.**

---

## Fix 102 — Add logo to site footer (Medium)

**Status:** PENDING -- logos need to be saved to project first

**Two logos provided by Rye (visible in conversation, not yet saved as files):**

- **Logo A (dark backgrounds):** Black background, gold and dark-green line-art phoenix rising from a village scene, DNA helix strands forming a circular border, trees and small round-door houses at the base, "ReGen Civics" text in gold ("ReGen") and dark green ("Civics"). Use where background is dark green or black.
- **Logo B (light backgrounds):** White/cream background, full-colour red and gold phoenix, same DNA helix border in green/gold, apple trees and hobbit houses at base, flower of life symbol at the bottom centre, "ReGen Civics" text same colour scheme. Use where background is white or light.

**Rye: save these files as:**
- `public/images/logos/regencivics-logo-dark.png` (Logo A -- for dark backgrounds)
- `public/images/logos/regencivics-logo-light.png` (Logo B -- for light backgrounds)

**Always round the corners or remove the background when the context requires it.** Logo A already has a transparent-friendly black bg. Logo B has a white bg -- strip it if placing on a non-white surface.

**Footer implementation (Claude Code, after logos are saved):**

In `SiteFooter.tsx`, add the logo above or beside the existing footer content:

```tsx
<div className="flex flex-col items-center mb-6">
  <img
    src="/images/logos/regencivics-logo-dark.png"
    alt="ReGen Civics"
    width={120}
    height={120}
    className="rounded-full opacity-90"
  />
</div>
```

Use Logo A (dark version) in the footer since the site footer is dark-background. Rounded corners via `rounded-full` or `rounded-2xl` depending on how it looks. Size approximately 100-140px.

**No DB changes.**

---

## Fix 103 — Explore Quests nav icon: mountain to forest/park (Low)

**Status:** PENDING

**Current:** "Explore Quests" nav item uses ⛰️ (mountain emoji)
**Change to:** 🌲 (evergreen tree) or 🌳 (deciduous tree) or 🏕️ (camping/forest park)

Rye's preference: a forest park rather than a mountain. Best options: 🌲 (clean, forest) or 🌳 (lush, park feel). Use 🌲 unless Rye prefers otherwise.

**File:** `client/src/components/Navigation.tsx`
- Desktop nav: find `"Explore Quests"` with ⛰️ emoji (~line 219)
- Mobile nav: same change (~line 674)

Replace both instances.

**No DB changes.**


---

## Fix 104 — Dashboard "Your Path" badge: expand to multi-path detection (Medium)

**Status:** PENDING

**Current:** One card on the dashboard shows a single "YOUR PATH" badge based on detected user type.

**Change:** Detect all paths the user is actively engaged with and badge each relevant card. Up to 3 badges can show simultaneously. Rename badge text from "YOUR PATH" to "YOUR PATH" on a single match, or badge each card individually (keep "YOUR PATH" label on each, since each card is its own path).

**Detection logic per path:**

| Path | Card | Signal to check |
|---|---|---|
| Investor | Investors card | User has a submitted or approved record in the `applications` table with `type = 'investor'`, OR has filled out the investor form (check the form submissions table or equivalent) |
| Land Project | Land Projects card | User has a submitted or approved application in `applications` table with `type = 'land_project'`, OR has an approved `orgClaims` record with `entityType = 'land_project'` |
| Alliance Partner | Alliance Partners card | User has a submitted or approved `orgClaims` record with `entityType = 'organisation'` |
| ReGen Player | ReGen Players card | User has completed at least 1 quest (record in `questCompletions`) OR has a profile with any tokens earned |

**Implementation:**

In the dashboard component, replace the single-path detection with a multi-check:

```ts
// Derive which paths this user has engaged with
const userPaths = {
  investor: !!investorApplication || !!investorFormSubmission,
  landProject: !!landProjectApplication || !!approvedLandClaim,
  alliance: !!approvedAllianceClaim,
  player: questCompletionCount > 0 || totalTokens > 0,
}
```

Then on each persona card, show the badge if `userPaths[cardType]` is true:

```tsx
{userPaths.investor && (
  <span className="absolute top-3 right-3 bg-[#7dd87d] text-[#0d2818] text-xs font-bold px-2 py-1 rounded-full">
    YOUR PATH
  </span>
)}
```

**For Rye's account specifically:** should show on Investors, Land Projects, and ReGen Players based on existing interactions.

**No new DB tables needed.** Uses existing `applications`, `orgClaims`, `questCompletions` tables.

---

## Fix 105 — Dashboard: hide "Book a Discovery Call" card from non-investors (High)

**Status:** PENDING

**Context:** The "Book a Discovery Call" quick-nav card on the return user dashboard should only show for investors. Rye is only taking calls from investors right now.

**Fix:** In the dashboard component, wrap the "Book a Discovery Call" card in a conditional check:

```tsx
{isInvestor && (
  <QuickNavCard
    title="Book a Discovery Call"
    subtitle="Talk with the team"
    href="/book-call"
    icon={<Calendar />}
    image={discoveryCallImage}
  />
)}
```

Where `isInvestor` is derived from the same check as Fix 104: user has a submitted or approved investor application/form submission.

If no investor record exists yet (new user or non-investor), the card simply doesn't render. The remaining 3 quick-nav cards (Journey Quests, Back to the Forum, Seasonal Accelerator) still show for everyone.

**Files affected:** `client/src/pages/Dashboard.tsx` (or the equivalent return-user home page component)

**No DB changes.**

---

## Fix 106 — Master admin rights for rieki.cordon@gmail.com (High)

**Status:** PENDING — requires DB update for the role field

**Scope of master admin:**

1. **Forum moderation:** Can delete or edit ANY forum post or reply, regardless of author. Current mod tools only let users manage their own posts.
2. **Blog post editing:** Can edit any blog post from within the post itself (inline editor, not just in /admin). An "Edit" button appears on the post when viewed while logged in as admin.
3. **User management:** Can view and manage all user accounts in /admin.
4. **Quest completion review:** Can approve, reject, or edit any quest completion submission.
5. **Application review:** Already has admin access, but confirm full read/write on all applications.
6. **Claims review:** Can approve or reject any `orgClaims` record.
7. **Any other admin-gated action:** All future admin features should check for `role = 'superadmin'` in addition to `role = 'admin'`.

**Implementation:**

### Step 1: Add superadmin role to users table

In `drizzle/schema.ts`, update the `role` enum on the `users` table:

```ts
role: mysqlEnum("role", ["user", "moderator", "admin", "superadmin"]).default("user").notNull(),
```

### Step 2: Set Rye's account to superadmin (seed script)

```ts
// scripts/set-superadmin.ts
await db.update(users)
  .set({ role: 'superadmin' })
  .where(eq(users.email, 'rieki.cordon@gmail.com'))
```

**Rye runs:** `npx tsx scripts/set-superadmin.ts` (after `pnpm db:push`)

### Step 3: Inline blog post editor

On any `BlogPost.tsx` or equivalent component, when the logged-in user has `role = 'superadmin'`:
- Show an "Edit" button in the top-right of the post
- Clicking it switches the post body to an editable `<textarea>` or rich text editor (use a simple `contentEditable` div or integrate a lightweight editor like [tiptap](https://tiptap.dev))
- "Save" button posts to a `blogPost.update` tRPC endpoint

### Step 4: Forum supermod controls

On any forum post or reply, when user is superadmin, show delete and edit controls regardless of authorship. The existing moderator controls should check `role === 'superadmin' || role === 'moderator' || post.authorId === currentUser.id`.

**Requires `pnpm db:push`** to apply the enum change.

---

## Fix 107 — /game page: expand SEEDS callout + contributions framework (High)

**Status:** PENDING

**Two parts:**

### Part A: Update /game page SEEDS section copy

Find the section on `/game` that currently references SEEDS and update it to this broader framing:

**New headline:** "Your contributions to the Regenerative Renaissance can be tracked here."

**New body copy:**

> If you have been contributing to a regenerative mission and haven't been paid or otherwise given financial or equal capital in return, we are building the ecosystem to track and account for those contributions. Every form of capital counts: social, material, financial, living, intellectual, experiential, spiritual, and cultural.
>
> As you join this movement, you can make a historical proposal for your contributions and bring those contributions here. The point is not just the tokens -- it's that your contributions become part of the shared record of the Regenerative Renaissance. Visible. Valued. Available to the movement.
>
> For every token we give out, we receive an equal amount of value pooled here. Our collective contributions are the real value backing our tokens.

**Add two links below the body:**
1. "Use the 8 Forms of Capital calculator to count your contributions" -- link to: `https://docs.google.com/spreadsheets/d/1Z6V3DSRHpA7fIjE2JYi4L5L2-vH6TbOIYKXHYJp_mHY/` (or update to the correct calculator URL -- confirm with Rye)
2. "Join the discussion and start crafting your proposal" -- link to the forum thread seeded in Part B below

**Also:** Keep the original SEEDS context. Add a brief note: "If you contributed to SEEDS or other regenerative projects before finding ReGen Civics, those contributions count here too."

### Part B: Seed a forum post for contributions discussion

Add to `seed-forum-posts.ts` (or a dedicated seed):

**Thread category:** Fire (or create a new "Contributions" category if one exists)
**Thread title:** Tracking Your Contributions to the Regenerative Renaissance
**Post body:** (see `BLOG_SEEDS_CONTRIBUTIONS.md` for full copy -- mirror the key points in shorter forum format)

**Links from the forum post:**
- The 8 Forms of Capital calculator
- Hypha DAO tools for formal proposals: `https://hypha.earth`
- The /game page itself

**No new DB tables needed.** The forum post uses existing `forumPosts` structure.

---

## Fix 108 — Community Forum page full overhaul (High)

**Status:** PENDING

**Route:** `/community/` (the forum landing/index page)

Full audit by Rye on 2026-03-14. Covers 3 critical bugs and 9 UX improvements.

---

### Part A: Critical bugs (do these first)

**Bug 1 — Russian/Cyrillic hardcoded strings throughout the hero and page**

All of the following are hardcoded in Russian and must be replaced with English:

| Location | Russian | English |
|---|---|---|
| Hero badge | "Форум сообщества" | "Community Forum" |
| Hero H1 | "Роща встреч" | "Grove of Gatherings" |
| Hero stats | "71 темы" | "71 topics" |
| Hero stats | "12 разделы" | "12 sections" |
| Hero CTA button | "Начать обсуждение" | "Start a Discussion" |
| Search placeholder | "Поиск по темам..." | "Search threads..." |
| Community rules heading | "Правила сообщества" | "Community Guidelines" |
| Community rules body | (full Russian paragraph) | "This is a space for constructive dialogue about regeneration. Be respectful, share knowledge generously, and remember: we are all learning together. No spam, no hate, only growth." |

Search the entire component file for any remaining Cyrillic characters (`/[\u0400-\u04FF]/`) and replace them.

**Bug 2 — Activity bar ("71 posts this week") is invisible on light background**

The bar uses `text-white/70` but the page background is `bg-[#f8f5f0]` (cream), making white text invisible.

- Change text color to `text-[#1a472a]`
- Change bar background from `bg-[#7dd87d]/10` to `bg-[#7dd87d]/25`
- Green dot indicator stays `bg-[#7dd87d]`
- Add `animate-pulse` to the green dot

**Bug 3 — "Get the Weekly Digest" is a non-interactive div**

Currently a plain unstyled `<div>` with no interactivity. Replace with a real CTA section:

```tsx
<div className="bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-2xl p-6">
  <h3 className="text-[#1a472a] font-bold text-lg flex items-center gap-2">
    🌿 Get the Weekly Digest
  </h3>
  <p className="text-[#4a7c59] text-sm mt-1 mb-4">
    Stay updated with the best conversations from the week.
  </p>
  <div className="flex gap-2">
    <input
      type="email"
      placeholder="your@email.com"
      className="flex-1 border border-[#7dd87d]/40 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#7dd87d]"
    />
    <button className="bg-[#1a472a] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#4a7c59] transition-colors">
      Subscribe
    </button>
  </div>
</div>
```

Wire to existing email handler if one exists; otherwise `console.log` placeholder is fine for now.

---

### Part B: Information architecture fix (do this second)

**Problem:** Categories appear twice — once as flat cards, then again inside the elemental accordion sections (Earth/Water/Fire/Air). This is confusing.

**Fix:** Restructure the page layout:

1. Remove the flat duplicate category list. Each category should appear once only.
2. Reorder sections so elemental accordions come FIRST (they are the primary paths):
   - Earth - Land Projects
   - Water - Alliance Organisations
   - Fire - Quests and Challenges
   - Air - Hard Conversations
3. Add an **"All Threads"** accordion section AFTER the four elemental ones, collapsed by default, containing all categories as a flat power-user view.
4. Each elemental accordion contains its own sub-categories as nested links.
5. Default state for ALL accordions: collapsed on first load.

**Final section order (top to bottom):**
Earth accordion → Water accordion → Fire accordion → Air accordion → All Threads accordion (collapsed)

---

### Part C: UX enhancements (do these last)

**Empty states for 0-thread categories**

Categories with 0 threads should show:
- `opacity-60` on the card
- Replace thread count with "Be the first to post" in muted text
- When a user clicks into a 0-thread category, show: 🌱 heading "This space is waiting for its first seed" / subtext "Be the first to start a conversation here." / "Start a Discussion" button

**Tag/filter pills**

- Add a "Filter by:" label to the left of the pill row
- Add tooltip on hover explaining what each tag filters
- Add filled active/selected visual state when a tag is clicked

**Hero section polish**

- Hero stats: bump to `text-white/90` (currently too faint)
- CTA button hover: `hover:scale-105 hover:shadow-[0_0_20px_rgba(125,216,125,0.4)] transition-all duration-200`
- "Welcome to the Community Space" banner: add `bg-white/10 backdrop-blur-sm border border-[#7dd87d]/30` for better separation from dark background

**Back button**

Change from plain "← Back" to "← Back to Community" with a visible destination, styled to match nav aesthetic.

**Sticky activity bar**

Make the "posts this week" bar sticky at the top (below nav height) so users keep context while scrolling:

```css
position: sticky;
top: [nav-height]; /* match the site's nav height */
z-index: 10;
```

**Sort categories by activity**

Within the All Threads accordion, sort category cards by thread count descending (most active first).

---

**No DB changes. No `pnpm db:push`.**

**Files affected:** The `/community/` route component (likely `client/src/pages/Community.tsx` or `ForumIndex.tsx` -- check the router), plus any sub-components for category cards, accordion sections, and the activity bar.

**Verification:** After implementing, check the page on both desktop and mobile. Confirm no Cyrillic characters remain in any rendered text. Confirm the activity bar is legible on the cream background. Confirm the Weekly Digest section has a working input and button.

---

## Fix 109 — Critical performance: home page taking ~60 seconds to load (CRITICAL)

**Status:** PENDING

**Reported:** Home page tested on a fresh computer + fresh browser, took almost a full minute to load. This is a blocking issue for fundraising and incubator outreach - anyone we send to the site will bounce.

**Root cause hypothesis:** The app is likely shipping a monolithic JS bundle that includes code for ALL pages simultaneously. When the home page loads, it is downloading, parsing, and executing the JavaScript for the Quest page, the Community page, the Admin panel, and every other route - none of which the visitor needs on first visit. Fix 97 reduced the bundle from 663KB to 233KB but that may still be too large, and there may be additional issues:
- No compression (gzip/brotli) on Railway static assets
- Large hero images loading before JS
- tRPC queries running in parallel on page load for data the home page doesn't need
- No preload hints for critical resources
- Fonts blocking render

This fix is a full performance pass. Work through every section below in order.

---

### Step 1: Verify and strengthen route-level code splitting

Fix 97 added React.lazy but verify it is actually working. In `vite.config.ts`, confirm the build output shows multiple chunks:

```bash
pnpm build 2>&1 | grep -E "dist/assets/.+\.js" | sort -k3 -h
```

The output should show many small `.js` chunk files, not one large one. If all code is still in a single chunk, the lazy imports are not splitting correctly.

**The home/landing page and the dashboard must be the ONLY things in the initial chunk.** Everything else deferred. Check the entry point file (App.tsx or router.tsx) and confirm:

```tsx
// These two are the critical path - import eagerly
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'

// Everything else - lazy import
const Quest = lazy(() => import('./pages/Quest'))
const Community = lazy(() => import('./pages/Community'))
const Forum = lazy(() => import('./pages/Forum'))
const Play = lazy(() => import('./pages/Play'))
const Connect = lazy(() => import('./pages/Connect'))
const Tokenomics = lazy(() => import('./pages/Tokenomics'))
const Admin = lazy(() => import('./pages/Admin'))
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'))
const BlogPost = lazy(() => import('./pages/BlogPost'))
// ... every other page
```

If ANY heavy page is imported at the top of App.tsx without `lazy()`, it will be in the initial bundle.

**Also check for barrel imports.** A pattern like `import { QuestCard, ForumPost, AdminPanel } from '../components'` in Landing.tsx will pull in ALL those components even if only one is used. Replace with direct imports:

```tsx
// Bad - pulls in entire components barrel
import { QuestCard } from '../components'

// Good - only imports QuestCard
import QuestCard from '../components/QuestCard'
```

---

### Step 2: Run bundle visualizer and identify the largest modules

```bash
npx vite-bundle-visualizer --open false --filename bundle-report.html
```

Open `bundle-report.html` and identify the top 5 largest modules by size. Common culprits:
- `lucide-react` - if imported as `import * as icons from 'lucide-react'`, it includes all 1000+ icons. Fix: import only what is used: `import { Leaf, Mountain, Users } from 'lucide-react'`
- `recharts` or any charting library loaded on every page
- `@radix-ui` packages imported into the Landing page unnecessarily
- Large JSON data files (questData.ts, seasonalQuestsData.ts) bundled into the initial load

**If questData.ts is imported in Landing.tsx:** move it to a lazy-loaded component or fetch it via tRPC only when the Quest page loads.

Report findings as a comment in this fix doc once identified.

---

### Step 3: Enable server-side compression on Railway

The Railway deployment likely serves static assets without gzip/brotli compression. A 233KB JS file compressed with gzip becomes ~60-70KB. This is the single highest-leverage change.

**Option A (preferred) - Add compression middleware in the Express server:**

In the Node.js server file (likely `server/index.ts` or `server/main.ts`):

```ts
import compression from 'compression'

// Add BEFORE static file serving
app.use(compression({
  level: 6, // Balance between CPU and compression ratio
  threshold: 1024, // Only compress files > 1KB
}))
```

Install the package:
```bash
pnpm add compression
pnpm add -D @types/compression
```

**Option B - Add `vite-plugin-compression` for pre-compressed `.gz` and `.br` files:**

```ts
// vite.config.ts
import viteCompression from 'vite-plugin-compression'

plugins: [
  viteCompression({ algorithm: 'gzip' }),
  viteCompression({ algorithm: 'brotliCompress', ext: '.br' }),
]
```

```bash
pnpm add -D vite-plugin-compression
```

Then serve pre-compressed files from Express:

```ts
// Serve pre-compressed files
app.get('*.js', (req, res, next) => {
  if (req.headers['accept-encoding']?.includes('br')) {
    req.url += '.br'
    res.set('Content-Encoding', 'br')
    res.set('Content-Type', 'application/javascript')
  } else if (req.headers['accept-encoding']?.includes('gzip')) {
    req.url += '.gz'
    res.set('Content-Encoding', 'gzip')
    res.set('Content-Type', 'application/javascript')
  }
  next()
})
```

---

### Step 4: Add resource hints to index.html

In `index.html` (the Vite HTML entry point), add preconnect and DNS prefetch for external resources the site depends on:

```html
<head>
  <!-- Preconnect to CDN where assets live -->
  <link rel="preconnect" href="https://assets.regencivics.earth" crossorigin />
  <link rel="dns-prefetch" href="https://assets.regencivics.earth" />

  <!-- If using Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <!-- Preload the main font file (update URL to actual font) -->
  <link rel="preload" href="/fonts/main-font.woff2" as="font" type="font/woff2" crossorigin />
</head>
```

---

### Step 5: Fix font loading

If the site uses custom fonts (check index.css or the Tailwind config), they may be render-blocking. Add `font-display: swap` to all `@font-face` declarations:

```css
@font-face {
  font-family: 'YourFont';
  src: url('/fonts/yourfont.woff2') format('woff2');
  font-display: swap; /* Show fallback font immediately, swap when loaded */
}
```

If using Google Fonts, add `&display=swap` to the URL:
```html
<link href="https://fonts.googleapis.com/css2?family=YourFont&display=swap" rel="stylesheet" />
```

---

### Step 6: Audit tRPC queries on the home/landing page

The home page (Landing.tsx or Dashboard.tsx) may be making multiple tRPC API calls on mount, each taking 100-500ms to Railway and back. Audit what queries fire on the landing page and eliminate any that are not immediately visible:

- Any query that loads data for a section below the fold should be deferred until the section scrolls into view (use Intersection Observer or React Query's `enabled` flag)
- Example: if the landing page queries `communityPulse`, `activeThreads`, `landProjects`, and `questStats` all at once, that is 4 round trips to Railway before anything renders

```tsx
// Defer below-the-fold queries
const { data: communityPulse } = trpc.forum.communityPulse.useQuery(undefined, {
  enabled: isBelowFoldVisible, // only fetch when section scrolls into view
})
```

Also ensure queries use `staleTime` to avoid re-fetching on every navigation:

```tsx
const { data } = trpc.someEndpoint.useQuery(undefined, {
  staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
})
```

---

### Step 7: Idle preloading of other routes

After the home page is fully loaded and the user is exploring, silently preload the next likely routes using `requestIdleCallback`:

```tsx
// In Landing.tsx or a top-level layout component, after initial render:
useEffect(() => {
  const preload = () => {
    // Preload the most likely next destinations
    import('./pages/Quest')
    import('./pages/Community')
    import('./pages/Play')
  }

  if ('requestIdleCallback' in window) {
    requestIdleCallback(preload, { timeout: 3000 })
  } else {
    setTimeout(preload, 2000)
  }
}, [])
```

This means other pages will feel instant when the user navigates to them - they're already cached by the browser.

---

### Step 8: Hero image preloading

The hero background image on the landing page (if it is a large image) should be preloaded as high priority so it appears before the JS finishes:

```html
<!-- In index.html -->
<link rel="preload" as="image" href="/backgrounds/hero-baked.webp" fetchpriority="high" />
```

Or in the component, the hero image `<img>` should have:
```tsx
<img src={heroImage} loading="eager" fetchpriority="high" decoding="sync" />
```

---

### Step 9: Railway cold start check

Even with Railway Pro + 2 replicas, verify cold starts are eliminated. The first request to a sleeping instance adds 2-10 seconds. Check the Railway dashboard: if the service shows "sleeping" between requests, scale settings need adjustment.

This is a Rye task (Railway dashboard access), but Claude Code should add a simple health check endpoint if one doesn't exist:

```ts
// In server/routes/health.ts
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})
```

Then Rye can set up an uptime monitor (free via UptimeRobot or BetterUptime) to ping `/health` every 5 minutes, preventing cold starts.

---

### Step 10: Measure before + after

Before starting, measure the current load time using Lighthouse or WebPageTest:

```bash
npx lighthouse https://regencivics.earth --output json --output-path ./lighthouse-before.json --chrome-flags="--headless"
```

After each step, run again and record the improvement. Target: first contentful paint under 2 seconds, time to interactive under 4 seconds on a 4G mobile connection.

---

**Files affected:** `vite.config.ts`, `server/index.ts` or main server file, `client/src/App.tsx` or router file, `index.html`, potentially `Landing.tsx` and `Dashboard.tsx` for query deferral and idle preloading.

**No DB changes. No `pnpm db:push`.**

**Verification steps:**
1. Run `pnpm build` and confirm the output shows multiple small JS chunks (not one large file)
2. Check that the largest initial chunk is under 100KB gzipped
3. Run Lighthouse on the production URL after deploying - target LCP under 2.5s, TBT under 200ms
4. Test on a throttled mobile connection (Chrome DevTools > Network > Slow 4G) - page should be usable within 5 seconds
5. Confirm no other page's data is fetched when landing on the home page (check Network tab in DevTools - there should be no requests to `/api/quest`, `/api/community`, or `/api/forum` on the home page load)


---

## Fix 110 — /quest page: comprehensive layout, content, and UX overhaul (High)

**Status:** PENDING

**Route:** `/quest`

Full audit by Rye on 2026-03-14. Five confirmed fixes plus additional improvements found during review.

---

### Fix 110-A: Bottom-right floating buttons overlapping (Critical)

Four buttons are stacking on top of each other in the bottom-right corner. Likely culprits: the scroll-to-top arrow, the "From the Field" button, the "Show Me Around" tour button, and a fourth (possibly a chat or notification button). They all use `fixed bottom-X right-X` positioning with the same or overlapping coordinates.

**Fix:** Stack them with consistent vertical spacing. Use a single `fixed bottom-6 right-6` column container:

```tsx
<div className="fixed bottom-6 right-6 flex flex-col items-end gap-3 z-50">
  {/* Each button gets its own row, no overlapping */}
  <ScrollToTopButton />
  <FromTheFieldButton />
  {/* etc */}
</div>
```

Or offset each button's `bottom` value by ~56px increments (the height of each button + gap):
- Scroll-to-top: `bottom-6`
- From the Field: `bottom-[68px]`
- Show Me Around: `bottom-[132px]`
- Fourth button: `bottom-[196px]`

**Files:** Check `client/src/pages/Quest.tsx` and any floating button components imported there. Search for `fixed bottom` in those files to find all instances.

---

### Fix 110-B: Seasonal carousels missing quests that appear in "What's Alive" section

The "What's Alive This Fall" (and equivalent for other seasons) section surfaces a subset of seasonal quests but the fall/spring/summer/winter carousels below do not include all those quests. Every quest that appears in any "What's Alive" section for a season must also appear in that season's carousel.

**Fix:** The seasonal discovery feed (Fix 77imp14, `SeasonalQuestFeed`) and the seasonal carousel tabs must pull from the same data source: `seasonalQuestsData.ts`. Audit both components:

- `SeasonalQuestFeed` or equivalent "What's Alive" component: confirm it filters `seasonalQuestsData` by current season
- The carousel tab component: confirm it also filters from `seasonalQuestsData` by selected tab season (Spring/Summer/Fall/Winter)

If the carousel is using a different, smaller array, replace it with the full `seasonalQuestsData` filtered by season. Every quest in `seasonalQuestsData` with `season: 'fall'` should appear in the Fall tab. No exceptions.

**New Anytime section:** After the four seasonal carousel sections (Spring/Summer/Fall/Winter), add a new section for Anytime quests. Follow the exact visual design of the existing seasonal sections (parallax background image, seasonal color treatment, carousel). Use a neutral earthy tone or a starfield/cosmos aesthetic to distinguish it from the four elemental seasons.

- Background image prompt for nano-banana-pro: `An ancient stone path winding through a misty forest clearing, soft starlight filtering through tall trees, golden lanterns floating in the distance, photorealistic, timeless and serene atmosphere`
- Save to: `public/backgrounds/anytime-quests-bg.webp`
- Section heading: "Anytime Quests"
- Subheading: "No season required. Do these whenever you are ready."
- Carousel contains: all quests from `seasonalQuestsData` with `season: 'anytime'` (Decrease Expenses, Hermetic Seal, Start a Friend Pool, Present Parenting, The Fifth Agreement, Ringing Cedars)

---

### Fix 110-C: "Start Your Journey" section layout + "Why Quests" cleanup

**Part 1: Start Your Journey cards side by side**

The "Start Your Journey" persona path cards (Rites of Passage, Seasonal Explorer, Epic Quester, etc.) are currently stacked vertically, making the section too tall. Display them in a 2-up or 3-up grid:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {journeyCards.map(card => <JourneyCard key={card.id} {...card} />)}
</div>
```

This halves or thirds the vertical height of the section while keeping all cards accessible.

**Part 2: Hide "Earn Tokens, Gain Voice" box in Why Quests dropdown**

Inside the "Why Quests?" accordion/dropdown, there is a callout box about earning $ReGen and RGVoice tokens. Remove it (or comment it out) as the information is already presented on the quest cards themselves and in the token transparency tooltips. The Why Quests section should focus on the journey narrative, not repeat the mechanics shown elsewhere.

Find the component that renders the Why Quests accordion content and remove the token callout box.

---

### Fix 110-D: Expand "Why Quests?" dropdown with the full journey narrative

The current "Why Quests?" accordion repeats the introductory framing without giving the reader the depth they need to understand what they are embarking on. Replace the body content with an expanded version drawn from `QUEST_MASTER_SHEET.md` Parts 1 and 2.

**New content structure for the dropdown (use this text directly, clean up for the UI):**

**Opening:**
> What if healing ourselves and the Earth is actually a fun and Infinite Game?
>
> We are co-creating a new economic and financial system built on top of this question, distributing tokens throughout our movement while doing tasks that heal ourselves, our communities, our bioregions, and our Earth. Which, when you look closely, are all the same thing.

**The Arc (draw from QUEST_MASTER_SHEET.md Part 2 - "The Arc — How All Quests Connect"):**

Pull these paragraphs directly and render them as a flowing readable section. Key beats to include:
- We begin with Fire (letting go before building)
- Then we add life to our bodies (Potions, the three minds)
- Then we plant (Food Foresting, seeding the Earth with our own biology)
- Before we forest, we save (Seeds, the oldest human technology)
- We also heal the ground itself (Healing Whole, soil as extension of our digestive system)
- From there, the quests move outward into relationship and community (NVC)
- The seasonal quests deepen and diversify (a living library)
- The EPIC Quests are acts of collective transformation

**How quests connect to land projects and orgs:** Include a short version of the qualifier system explanation from Part 2 of the master sheet. This is important context for players who are thinking about joining or applying to land projects.

**Implementation:** The accordion content should be a scrollable rich-text section. Consider breaking it into collapsible sub-sections ("The Arc", "Seasonal Quests", "Epic Quests", "Quests as Qualifiers") if it gets long. Keep the total word count under 600 words for the accordion body.

---

### Fix 110-E: Quest Arc label and icon

**Label change:**
- Current: "Quest Arc — the full journey at a glance"
- New: "Quest Arc for the Rites of Passage: full journey!"

**Icon change for "View Quest Arc" button:**
- Current icon: whatever is there now (likely a compass or chart icon)
- New icon: `Map` from lucide-react

```tsx
import { Map } from 'lucide-react'
// ...
<button>
  <Map className="w-4 h-4" />
  View Quest Arc
</button>
```

Search for "Quest Arc" text and "view quest arc" button in `Quest.tsx` or `QuestArcMap.tsx`.

---

### Fix 110-F: Additional improvements found during audit

These are additional issues to fix while working on the quest page:

**1. Quest story cards missing (showing "Details coming soon")**
Many quest detail modals still show "Details coming soon" instead of the actual story card content from `QUEST_MASTER_SHEET.md`. All story cards are now written in the master sheet (see `QUEST_MASTER_SHEET.md` Part 3). Wire them up: the `questDetailsData.ts` file (or equivalent) needs to be populated with the story card text, how-to steps, deliverable, tips, resources, and connected-to info for each of the 14 numbered quests. Cross-reference `QUEST_MASTER_SHEET.md` Part 3 for the source content.

**2. Food Foresting showing wrong token amount**
The Food Foresting quest card still shows `+33 $Regen` instead of `+111 $Regen` (per Wave 1.5 token rebalancing). This should already be caught by the token rebalancing task but flag it here too.

**3. EPIC quests section content**
The existing EPIC quests section has some placeholder/generated quests. Keep them but also add the official EPIC quest content from `QUEST_MASTER_SHEET.md` Part 5 (Block Food Forest, Networked Community Garden, Bioregional Currency Launch, Cornfield to Cloud Forest, Pasture to Paradise, HOA to Village, Golf Course, Apartment Building, Startup Town). The three tiers (Easy/Hard/Expert) should be displayed as visual sub-sections or tabs within the EPIC section.

**4. Seasonal hero parallax backgrounds**
Once Fix 101 (parallax backgrounds) is shipped, the seasonal section hero backgrounds should also get the parallax treatment. Each seasonal section (Spring/Summer/Fall/Winter/Anytime) has its own background image. All of them should use `background-attachment: fixed` with the baked overlay versions from `scripts/bake-overlays.ts`.

**5. Quest filter tag state persistence**
When a user selects a seasonal filter tag (e.g., "Fall"), the quest feed above and the carousels below should both respond. Currently they appear to be independent. Wire them up so selecting a season tab in the carousel also updates the "What's Alive" section.

**6. Missing quest images**
Several seasonal quests are displaying placeholder or broken images. Check all quest cards in the carousel and confirm each has a valid image path that resolves. Any with missing images should get image generation added to the Wave 1.6 / Fix 90 queue.

---

**No DB changes. No `pnpm db:push`.**

**Files affected:** `client/src/pages/Quest.tsx`, `client/src/data/seasonalQuestsData.ts`, `client/src/data/questDetailsData.ts` (or equivalent story card data), `client/src/components/QuestArcMap.tsx`, any floating button components, `client/src/components/WhyQuests.tsx` or equivalent accordion component.

**Verification:** After implementing, check that:
- No buttons overlap in the bottom right at any viewport size
- Every seasonal quest that appears in "What's Alive" also appears in its season's carousel tab
- The Anytime section appears after the Winter section with its own parallax background
- "Start Your Journey" cards are displayed side by side (minimum 2 per row on desktop)
- "Earn Tokens" box is no longer visible in the Why Quests dropdown
- Why Quests dropdown has the full Arc narrative from the master sheet
- "Quest Arc for the Rites of Passage" label and Map icon are correct

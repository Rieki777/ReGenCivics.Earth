# Fixes to Make

---

## Automated Contrast Scanner

A reusable audit script lives at `scripts/check-contrast.mjs`. Run it to get a full contrast report across every page before and after making fixes.

```bash
# One-time setup (installs headless browser):
npx playwright install chromium

# Scan production:
node scripts/check-contrast.mjs

# Scan local dev server:
node scripts/check-contrast.mjs --local

# Also trigger interactive UI (dropdowns, popovers, modals):
node scripts/check-contrast.mjs --open

# Report is printed to console and saved to contrast-report.txt
```

The script uses axe-core WCAG AA contrast rules, scans all 29 public pages, and shows exact contrast ratios (`actual:1 vs required:1`), element selectors, and foreground/background color values for every failure. Run it again after each fix batch to verify pages are passing.

---

## 1. Form Readability — Low Contrast Across ALL Forms (Site-wide)

**Severity: High — affects every form on the site**

Every form uses the shared `Input` and `Textarea` UI components, which inherit these broken styles:
- `placeholder:text-muted-foreground` — placeholder text is nearly invisible against the light input background
- `--input: oklch(0.92 0.02 85)` (in `client/src/index.css`) — inputs render with a very light tan/beige background, and the medium-gray placeholder blends into it completely
- Labels styled with partial opacity like `text-[#1a472a]/70` or `text-white/50` fail contrast minimums

**Pages/forms confirmed affected:**
- `/profile` — Create Player Profile form (Display Name, Bio, Base Blockchain Account, Hypha Profile URL)
- `/apply` — Apply for Next Season multi-step form (Project Name, Project Type dropdown, Location, all subsequent steps)
- `/community/new` — New Thread form (Title input, Content textarea)
- `ProfileEditForm` — Edit profile form (Display Name, Location, Bio, Avatar URL, path-specific fields)
- Any other page using `<Input>` or `<Textarea>` components

**Specific elements to fix:**

1. In `client/src/index.css`, change `--muted-foreground` to a darker value that achieves WCAG AA contrast (4.5:1 minimum) against the `--input` background. The current value renders around 2.5:1 contrast ratio.

2. Alternatively, add explicit placeholder color overrides in `client/src/components/ui/input.tsx` and `textarea.tsx` — replace `placeholder:text-muted-foreground` with `placeholder:text-foreground/50` or a custom dark value.

3. In `PlayerProfile.tsx` `CreateProfileForm`, the labels inside the blockchain section use `text-[#1a472a]/70` — bump to `/90` or full opacity.

4. The "Optional" `<Badge variant="outline">` in the blockchain section is nearly invisible (very light border, light text on cream background). Make it legible with a stronger color: `text-[#1a472a]/80 border-[#1a472a]/40`.

5. The Apply form (`/apply`) field labels render in `text-[#1a472a]/60` or similar — audit and darken all label opacity values.

**Quick global fix approach:**
```css
/* client/src/index.css — in the :root block */
--muted-foreground: oklch(0.45 0.02 85); /* was ~0.65, darkened for contrast */
```

---

## 2. Player Profile Form — State Wiped on Navigation

**Severity: High — actively breaks the creation flow**

When a user is filling out the Create Player Profile form at `/profile` and navigates away (e.g., clicking "Create a Hypha account" to go to hypha.earth, or opening the help popover link, or going to any other page to look up their wallet address), the form unmounts and **all entered data is lost**. When they come back, the form is blank.

The root cause is that `CreateProfileForm` in `client/src/pages/PlayerProfile.tsx` uses local React `useState` only — no persistence across navigation.

**Fix: Persist form draft to `sessionStorage`**

In `CreateProfileForm`, save state on every field change and restore on mount:

```typescript
// On mount, restore draft
const [displayName, setDisplayName] = useState(() =>
  sessionStorage.getItem('playerProfileDraft_displayName') ?? ''
);
const [bio, setBio] = useState(() =>
  sessionStorage.getItem('playerProfileDraft_bio') ?? ''
);
const [baseAccountName, setBaseAccountName] = useState(() =>
  sessionStorage.getItem('playerProfileDraft_baseAccountName') ?? ''
);
const [hyphaProfileUrl, setHyphaProfileUrl] = useState(() =>
  sessionStorage.getItem('playerProfileDraft_hyphaProfileUrl') ?? ''
);

// On each change, persist
const handleDisplayNameChange = (val: string) => {
  setDisplayName(val);
  sessionStorage.setItem('playerProfileDraft_displayName', val);
};
// ... same pattern for other fields

// On successful creation, clear the draft
const createMutation = trpc.playerProfiles.create.useMutation({
  onSuccess: () => {
    sessionStorage.removeItem('playerProfileDraft_displayName');
    sessionStorage.removeItem('playerProfileDraft_bio');
    sessionStorage.removeItem('playerProfileDraft_baseAccountName');
    sessionStorage.removeItem('playerProfileDraft_hyphaProfileUrl');
    toast.success('Profile created successfully!');
    onSuccess();
  },
  // ...
});
```

Also consider showing a subtle "Draft saved" indicator so users know their input is preserved.

---

## 3. Player Profile Creation — Database Query Failure

**Severity: High — blocks profile creation entirely**

When the profile creation mutation fires (or immediately after on the `me` query refetch), the server throws:

```
Failed query: select `id`, `userId`, `displayName`, `email`, `bio`, `avatarUrl`,
`baseAccountName`, `hyphaProfileUrl`, `walletAddress`, `blockchainVerifiedAt`,
`verificationTxHash`, `badges`, `questsCompleted`, `totalContributionValue`,
`rvoiceBalance`, `rgenBalance`, `lastTokenSync`, `isVerified`, `isActive`,
`emailDigestFrequency`, `createdAt`, `updatedAt`
from `player_profiles` where `player_profiles`.`userId` = ? limit ? params: 1,1
```

**Most likely cause:** Migration `0037_player_profile_digest_frequency.sql` — which adds the `emailDigestFrequency` column to `player_profiles` — has not been applied to the production Railway database. The Drizzle schema expects the column, but the live table doesn't have it.

**Fix:**
1. SSH into the Railway service or use Railway CLI and run: `pnpm db:push`
2. Verify migrations 0037, 0038, and 0039 are applied. Check Railway DB directly:
   ```sql
   SHOW COLUMNS FROM player_profiles LIKE 'emailDigestFrequency';
   SHOW TABLES LIKE 'player_contributions';
   ```
3. If `db:push` is not safe to run (risk of data loss), generate the SQL diff and apply it manually via Railway's MySQL console.

---

## 4. Favicon — Still Showing Old Owl Logo, Not Seeds of Life

**Severity: Medium — branding inconsistency in browser tabs**

The `favicon.svg` file has already been updated with the Seeds of Life geometry, but:
- It has a **transparent background** (not the requested dark green `#1a472a` background)
- `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `icon-192.png`, `icon-512.png`, and `apple-touch-icon.png` **all still contain the old owl/circular tree logo**
- Most browsers prefer `.ico` and PNG formats over SVG, so the old favicon is what actually shows in tabs

**Requested design:** Dark green background (`#1a472a`) with gold (`#FFD700`) Flower of Life / Seeds of Life pattern — should pop in a browser tab.

**Fix:**

1. Update `client/public/favicon.svg` to add a dark green circle as background (not a rect — the background should be a circle so it looks clean in browser tabs):
   ```svg
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
     <!-- Dark green circle background -->
     <circle cx="50" cy="50" r="50" fill="#1a472a"/>
     <!-- Seeds of Life circles with gold strokes -->
     <circle cx="50" cy="50" r="20" fill="rgba(125,216,125,0.15)" stroke="#FFD700" stroke-width="2.5"/>
     <circle cx="70" cy="50"    r="20" fill="none" stroke="#FFD700" stroke-width="2.5"/>
     <circle cx="60" cy="67.32" r="20" fill="none" stroke="#FFD700" stroke-width="2.5"/>
     <circle cx="40" cy="67.32" r="20" fill="none" stroke="#FFD700" stroke-width="2.5"/>
     <circle cx="30" cy="50"    r="20" fill="none" stroke="#FFD700" stroke-width="2.5"/>
     <circle cx="40" cy="32.68" r="20" fill="none" stroke="#FFD700" stroke-width="2.5"/>
     <circle cx="60" cy="32.68" r="20" fill="none" stroke="#FFD700" stroke-width="2.5"/>
     <circle cx="50" cy="50" r="4" fill="#7dd87d"/>
   </svg>
   ```

2. Also regenerate `favicon.ico` — this was NOT updated in the last commit and still contains the old owl logo. Browsers typically prefer `.ico` over SVG, so it overrides the SVG in most tabs. Use `sharp` or a favicon generator to produce a new `.ico` with 16x16, 32x32, and 48x48 variants from the updated SVG.

3. Regenerate all remaining PNG sizes from this new SVG:
   - `favicon-16.png`
   - `favicon-32.png`
   - `icon-192.png`
   - `icon-512.png`
   - `apple-touch-icon.png` (180x180)

   Use `sharp`, `Inkscape`, or an online favicon generator (e.g., favicon.io) to export from the SVG.

4. Also update `client/public/manifest.json` icons array to reference the new PNGs.

---

## 5. Forum — Completely Empty on Production (Categories + Posts Never Seeded)

**Severity: High — the community page is broken for all users**

The `/community` page on production shows "No categories yet" with 0 threads and 0 topics. Two separate failures caused this:

### Root Cause A — `seed-forum.mjs` was never run against production

`seed-forum.mjs` exists in the repo root and defines 8 forum categories (General Discussion, Land Projects, Investment & Finance, Governance & DAO, Quests & Gameplay, Alliance Partners, Introductions, Resources & Learning). However, this script was **never executed against the Railway production database**. The live `forumCategories` table is empty.

**Fix:**
```bash
# Set DATABASE_URL to your Railway production MySQL connection string, then:
node seed-forum.mjs
```

Verify after running:
```sql
SELECT id, name, slug FROM forumCategories ORDER BY sortOrder;
```

### Root Cause B — No forum post seeding script exists at all

There is no script (and no admin endpoint) to seed starter posts. The original plan (referenced in `UPGRADE_TASKS.md`) called for:
- A pinned welcome/intro thread in each category
- One discussion thread per quest in the "Quests & Gameplay" category (quests 0–12 plus food-foresting)

None of these were ever created. The `forumPosts` table is empty.

**Fix: Create `seed-forum-posts.mjs`** that:

1. Looks up each category by slug (so it works whether seeded fresh or already populated)
2. Inserts a pinned welcome thread in each category
3. Inserts one discussion thread per quest in the `quests-gameplay` category

Skeleton:
```javascript
import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get category IDs
const [cats] = await conn.execute('SELECT id, slug FROM forumCategories');
const catMap = Object.fromEntries(cats.map(c => [c.slug, c.id]));

// System user — use the admin userId (OWNER_OPEN_ID maps to a users row)
// You may need to look up the admin user's numeric id: SELECT id FROM users LIMIT 1;
const ADMIN_USER_ID = 1;

const welcomePosts = [
  { categorySlug: 'general',           title: 'Welcome to General Discussion', content: 'This is the space for open conversations about regenerative living, systems thinking, and the movement. Introduce a topic, share a thought, or start a debate.' },
  { categorySlug: 'land-projects',     title: 'Share Your Land Project', content: 'Post updates on your regenerative land project here — what you\'re building, where you are, what you\'ve learned.' },
  { categorySlug: 'investment-finance',title: 'Regenerative Finance — Start Here', content: 'Welcome to the investment & finance category. Discuss impact investing, fund structures, and how capital can serve regeneration.' },
  { categorySlug: 'governance-dao',    title: 'Governance Models & Hypha DAO', content: 'Explore governance frameworks, Hypha DAO tooling, and decision-making approaches for regenerative orgs.' },
  { categorySlug: 'quests-gameplay',   title: 'Welcome to Quests & Gameplay', content: 'This category hosts discussion threads for each quest in the Regen Civics infinite game. Start a quest thread, share your progress, ask for help.' },
  { categorySlug: 'alliance-partners', title: 'Alliance Partners — Introductions', content: 'Alliance partners: introduce your organization here. Tell us what you\'re building and how you collaborate with the network.' },
  { categorySlug: 'introductions',     title: 'Introduce Yourself!', content: 'New here? Post a short introduction — who you are, where you\'re from, and what brought you to the regenerative civics movement.' },
  { categorySlug: 'resources-learning',title: 'Recommended Resources', content: 'Share books, articles, courses, podcasts, and tools that have shaped your thinking on regeneration, governance, and land stewardship.' },
];

for (const post of welcomePosts) {
  const catId = catMap[post.categorySlug];
  if (!catId) continue;
  await conn.execute(
    'INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE title=VALUES(title)',
    [catId, ADMIN_USER_ID, post.title, post.content]
  );
}

// One thread per quest in the quests-gameplay category
const questsCategory = catMap['quests-gameplay'];
const quests = [
  { id: 'quest-0',        title: 'Quest 0 — Welcome to the Infinite Game' },
  { id: 'quest-1',        title: 'Quest 1 — Discover Your Biome' },
  { id: 'quest-2',        title: 'Quest 2 — Saving Seeds' },
  { id: 'quest-3',        title: 'Quest 3 — Water Wisdom' },
  { id: 'quest-4',        title: 'Quest 4 — Soil Stewardship' },
  { id: 'quest-5',        title: 'Quest 5 — Food Forest Fundamentals' },
  { id: 'quest-6',        title: 'Quest 6 — Community Weaving' },
  { id: 'quest-7',        title: 'Quest 7 — Regenerative Finance Basics' },
  { id: 'quest-8',        title: 'Quest 8 — Governance & Decision Making' },
  { id: 'quest-9',        title: 'Quest 9 — Land Stewardship' },
  { id: 'quest-10',       title: 'Quest 10 — Alliance Building' },
  { id: 'quest-11',       title: 'Quest 11 — The Living Lab' },
  { id: 'quest-12',       title: 'Quest 12 — Season Completion' },
  { id: 'food-foresting', title: 'Food Foresting — Practitioner Discussion' },
];

for (const q of quests) {
  await conn.execute(
    'INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned) VALUES (?, ?, ?, ?, 0) ON DUPLICATE KEY UPDATE title=VALUES(title)',
    [questsCategory, ADMIN_USER_ID, q.title, `Discussion thread for ${q.title}. Share your experience, ask questions, and connect with others working on this quest.`]
  );
}

console.log('Forum posts seeded successfully');
await conn.end();
```

**Note:** Check the `forumPosts` schema in `drizzle/schema.ts` to confirm column names — especially `isPinned` vs `pinned`, and whether `authorId` is the correct foreign key name.

---

---

## 6. Profile Experience Overhaul

**Severity: High — the profile creation flow is the primary onboarding moment; it's currently broken and generic**

This is a multi-part upgrade to the `CreateProfileForm` in `client/src/pages/PlayerProfile.tsx`. Implement in the order listed below.

---

### 6a. Fix: DB Migration Not Applied to Production (Immediate Blocker)

**This is the same as Fix 3 but with a clearer error trail confirmed from the live site.**

The query error seen in production:

```
Failed query: select `id`, `userId`, `displayName`, `email`, `bio`, `avatarUrl`,
`baseAccountName`, `hyphaProfileUrl`, `walletAddress`, `blockchainVerifiedAt`,
`verificationTxHash`, `badges`, `questsCompleted`, `totalContributionValue`,
`rvoiceBalance`, `rgenBalance`, `lastTokenSync`, `isVerified`, `isActive`,
`emailDigestFrequency`, `createdAt`, `updatedAt` from `player_profiles`
where `player_profiles`.`userId` = ? limit ?
```

The column `emailDigestFrequency` was added by migration `0037_player_profile_digest_frequency.sql`, which has **never been applied to the Railway production database**. Migrations 0038 and 0039 are also likely unapplied.

**Fix:**
```bash
# In Railway shell or via local connection with prod DATABASE_URL:
pnpm db:push
# OR manually apply the migration SQL from drizzle/0037, 0038, 0039
```

**Verify the column exists after applying:**
```sql
DESCRIBE player_profiles;
-- Should show emailDigestFrequency column
```

---

### 6b. Copy Change — Profile Page Tagline

**File:** `client/src/pages/PlayerProfile.tsx`

Change the subtitle text that appears above the `CreateProfileForm`:

**Find:** `"Set up your profile to start earning badges and tracking contributions"`

**Replace with:** `"Your profile here and in Hypha is how you earn tokens and track contributions"`

---

### 6c. Remove `hyphaProfileUrl` Field — Use Account Name Instead

**Decision: Remove the Hypha Profile URL field. Keep `baseAccountName`.**

Here's the reasoning: `hyphaProfileUrl` (e.g. `https://hypha.earth/profile/yourname`) is redundant when you already have `baseAccountName` (the blockchain account address like `0xaAaF...354e`). The URL can be constructed programmatically from the account name or looked up via Hypha's API. Asking users to paste two different things from Hypha when one is sufficient is extra friction at the most sensitive moment in onboarding.

If you want to pull data from Hypha's UI in the future (avatar, bio, token balances), `baseAccountName` is the correct key for that query — not the profile URL. The URL adds no additional information.

**What to do:**
1. Remove the `hyphaProfileUrl` input from `CreateProfileForm` in `PlayerProfile.tsx`
2. Remove it from the edit form in `ProfileEditForm.tsx` (the "Hypha Profile URL" input)
3. In `server/routers.ts`, remove `hyphaProfileUrl` from the `create` and `update` input schemas (it can stay in the DB schema for now in case you want to add it back later as an auto-populated field)
4. On the profile display card (around line 512 in `PlayerProfile.tsx`), remove the `hyphaProfileUrl` link block — or replace it with a computed link: `https://hypha.earth/profile/${profile.baseAccountName}` if that URL format is valid

---

### 6d. Bio — Replace Free Text with 4 Structured Soul Questions

**File:** `client/src/pages/PlayerProfile.tsx` — `CreateProfileForm`

Replace the single `bio` textarea with 4 labeled prompts. Store as a JSON string in the existing `bio` column (no migration needed) using the format:

```json
{
  "role": "...",
  "soul": "...",
  "desires": "...",
  "gifts": "..."
}
```

**The four fields:**

| Field | Label | Placeholder |
|-------|-------|-------------|
| `role` | What's your role in this renaissance? | e.g., Land steward, investor, builder, artist... |
| `soul` | What's your soul's mission? | The deeper calling that brought you here... |
| `desires` | What are you looking to get from this ecosystem? | What would make this worth your time and energy? |
| `gifts` | What would you like to offer the ecosystem? | Skills, resources, wisdom, connections... |

**Implementation notes:**
- Each prompt gets its own `<Textarea>` with label + placeholder
- On submit, serialize to JSON: `JSON.stringify({ role, soul, desires, gifts })`
- On the profile display page, parse the JSON and render each field with its label — fall back to displaying the raw string if it isn't valid JSON (for existing profiles)
- In `ProfileEditForm.tsx`, parse the existing bio JSON on load and populate the four fields

---

### 6e. Multi-Step Profile Form (Industry Best-Practice Wizard)

**File:** `client/src/pages/PlayerProfile.tsx` — replace `CreateProfileForm` with a stepped version

**Why:** A single long form overwhelms new users and collapses the onboarding moment. Breaking it into 3 steps with a progress indicator and clear micro-copy dramatically increases completion rates.

**Three steps:**

**Step 1 — Who Are You?** (Name + Soul questions)
- Display Name (required)
- Role, Soul, Desires, Gifts (the 4 bio prompts from 6d)
- CTA: "Continue →"

**Step 2 — Link Your Hypha Account** (Blockchain identity, optional)
- Keep the existing Base Account Name input with the Popover help tooltip
- Mark clearly as optional with a "Skip for now" link that advances to Step 3
- CTA: "Continue →" or "Skip for now →"

**Step 3 — Review & Create**
- Show a preview card of the profile as it will appear (name, bio responses, account name if entered)
- "Looks good — create my profile" submit button
- "Go back" link

**Progress indicator:** A simple `Step 1 of 3 · Step 2 of 3 · Step 3 of 3` dot/bar indicator at the top, styled in forest green.

**State:** Use a `step` state variable (1, 2, 3). Keep all field state at the parent level so it persists across steps. Continue using `sessionStorage` for draft persistence across page navigations (from Fix 2).

**Validation:** Validate only the current step's required fields on "Continue" — don't block on optional fields.

---

### 6f. Organic Form-to-Quests Transition Animation

**File:** `client/src/pages/PlayerProfile.tsx` — the section around line 1694 where `CreateProfileForm` is rendered and `onSuccess` triggers re-render

**Concept:** After profile creation succeeds, the form doesn't hard-switch to quest cards. Instead it plays a brief organic animation sequence that feels like: the form compresses into a seed, which drops into soil and sprouts, then unfurls into the quest cards.

**Feasible implementation using CSS + Framer Motion (or pure CSS transitions):**

```
Phase 1 (0–400ms):  Form fades out + scales down to a small circle (the "seed")
Phase 2 (400–800ms): The seed pulses/glows with a subtle green light
Phase 3 (800–1200ms): A vertical green line shoots upward (the sprout)
Phase 4 (1200–1800ms): Quest cards fan out from the top of the sprout using staggered entrance (each card slides in from slightly below with opacity 0→1, 80ms stagger)
```

**How to build it:**

1. Add a `isTransitioning` state boolean to the parent component
2. On `onSuccess`, set `isTransitioning = true`
3. Render a `<TransitionOverlay>` component that plays the animation sequence using CSS keyframes or Framer Motion
4. After the animation completes (use `onAnimationComplete` or `setTimeout`), set `isTransitioning = false` and let the normal profile view render with quests visible

**Minimum viable version (if Framer Motion not installed):** Use CSS `@keyframes` with `animation-delay` for stagger. The "seed" is just a `div` with `border-radius: 50%` and `background: #1a472a` that appears as the form fades, then the quest cards slide up with `transform: translateY(20px)` → `translateY(0)` with opacity 0→1, staggered via inline `style={{ animationDelay: \`${index * 80}ms\`` }}`.

**The sprout line is optional** — even without it the form-to-cards transition with the seed micro-moment and staggered card entrance will feel meaningfully more alive than a hard swap.

---

---

## Fix 7 — /map: Rename "All Frequencies" + Move Filters Behind a Card

**Problem:** The search filter label "All Frequencies" doesn't communicate what the filter does to non-technical users. More importantly, all filter controls (country, meeting frequency, dietary preference, entity-type tabs) are exposed inline on the map page — this doesn't scale as more filter categories are added and it's not industry-standard UX.

**Solution:** Two changes:

1. **Rename** the `meetingFreqFilter` default option from "All Frequencies" to "All Community Engagement"
2. **Move all filter controls** behind a "Filters" button that opens a card/panel — search bar stays visible inline; everything else hides behind the button

**Why now:** The map already has country, frequency, and dietary filters. More will come. Addressing the pattern before it grows is faster than refactoring later. The Filters card pattern is standard on Airbnb, LinkedIn, Notion, etc.

**Files to change:**
- `client/src/components/GlobeMap.tsx` (primary — all filter logic lives here)

**Current state in GlobeMap.tsx:**
- Desktop sidebar: inline search input + `CountryFilter` + `meetingFreqFilter` select + `dietaryFilter` select + clear-filters button
- Mobile: same controls in a collapsible section
- Entity-type tabs: `absolute bottom-4 left-1/2 -translate-x-1/2` pills floating over the globe

**Implementation spec:**

**Step 1 — Rename (2 lines):**
```tsx
// Lines ~1220 and ~1393 in GlobeMap.tsx — both occurrences:
<option value="">All Frequencies</option>
// Change to:
<option value="">All Community Engagement</option>
```

**Step 2 — Add state:**
```tsx
const [showFilters, setShowFilters] = useState(false);
```

**Step 3 — Filters button (replace the inline filter block):**

In both desktop sidebar and mobile filter area, replace the current inline filter controls with:

```tsx
{/* Filters toggle button */}
<button
  onClick={() => setShowFilters(!showFilters)}
  className="flex items-center gap-2 text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-3 py-1.5 transition-colors"
>
  <SlidersHorizontal className="w-3.5 h-3.5" />
  Filters
  {hasActiveFilters && (
    <span className="bg-[#7dd87d] text-[#1a472a] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
      {[countryFilter, meetingFreqFilter, dietaryFilter, filter !== "all"].filter(Boolean).length}
    </span>
  )}
</button>

{/* Filters card — shown when open */}
{showFilters && (
  <div className="mt-2 p-3 bg-black/40 border border-white/10 rounded-xl space-y-3">
    {/* Entity type tabs — moved from globe overlay into card */}
    <div>
      <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1.5">Type</p>
      {/* existing entity-type pill buttons */}
    </div>

    {/* Country filter */}
    <div>
      <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Country</p>
      <CountryFilter value={countryFilter} onChange={setCountryFilter} />
    </div>

    {/* Community engagement frequency */}
    <div>
      <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Community Engagement</p>
      <select value={meetingFreqFilter} onChange={(e) => setMeetingFreqFilter(e.target.value)}
        className="text-xs bg-white/10 text-white border border-white/20 rounded-full px-2 py-1 cursor-pointer w-full">
        <option value="">All Community Engagement</option>
        {/* existing options */}
      </select>
    </div>

    {/* Dietary filter */}
    <div>
      <p className="text-white/50 text-[10px] uppercase tracking-widest mb-1">Diet</p>
      <select value={dietaryFilter} onChange={(e) => setDietaryFilter(e.target.value)}
        className="text-xs bg-white/10 text-white border border-white/20 rounded-full px-2 py-1 cursor-pointer w-full">
        {/* existing options */}
      </select>
    </div>

    {/* Clear button — only shown when filters active */}
    {hasActiveFilters && (
      <button onClick={clearFilters}
        className="text-xs text-[#7dd87d] hover:text-white underline">
        Clear all filters
      </button>
    )}
  </div>
)}
```

**Entity-type tabs:** Remove the `absolute bottom-4 left-1/2 -translate-x-1/2` floating pills from the globe overlay and move them into the filters card under a "Type" section. This declutters the globe view significantly.

**Search bar stays:** The search input remains inline above the Filters button — it's primary navigation, not a filter.

**Import to add:** `import { SlidersHorizontal } from "lucide-react"` (or use `Filter` icon — both are in lucide-react).

---

## Fix 8 — Move ReGen Guide Button to Left Side

**Problem:** The ReGen Guide floating button (`fixed bottom-4 right-4 z-[9999]`) visually covers the ScrollToTop back-to-top button (`fixed bottom-6 right-6 z-[90]`). Because ReGen Guide is z-[9999] vs z-[90], the Guide always renders on top, making the back-to-top button completely inaccessible.

**Left-side conflict check (already done):**
- `BackButton`: `fixed top-20 left-4 z-40` — top of page, no bottom conflict
- `CookieConsent`: `fixed bottom-0 left-0 right-0` — full-width bar, not a floating button
- No other `fixed bottom left` elements found in the codebase

Bottom-left is clear. Moving the Guide there resolves the conflict with zero side effects.

**File to change:** `client/src/components/ReGenGuide.tsx`

**Changes:**

```tsx
// BEFORE — Floating button (line ~173):
className={`fixed bottom-4 right-4 z-[9999] ...`}

// AFTER:
className={`fixed bottom-4 left-4 z-[9999] ...`}
```

```tsx
// BEFORE — Chat panel (line ~130):
<div className="fixed bottom-20 right-2 left-2 sm:left-auto sm:right-4 z-[9999] sm:w-[380px] ...">

// AFTER:
<div className="fixed bottom-20 right-2 left-2 sm:right-auto sm:left-4 z-[9999] sm:w-[380px] ...">
```

That's it — two className changes. The ScrollToTop button at `bottom-6 right-6` is no longer covered.

**Note on mobile:** On mobile the chat panel already uses `right-2 left-2` (full bleed), so the mobile experience is unaffected. On desktop sm+ the panel opens to the left of the button instead of to the right.

---

## Fix 9 — Golden Phoenix Favicon (Replaces Fix 4 / Seeds of Life)

> **Fix 4 is superseded.** The Seeds of Life favicon design described in Fix 4 is no longer wanted. Fix 9 replaces it entirely.

**Problem:** The current favicon is the old owl logo. A new Golden Phoenix favicon is needed — based on the phoenix from the ReGen Civics logo — that is bold, recognizable, and visible at 16×16px browser tab size.

**Design spec:**
- **Subject:** Phoenix only — no other logo elements (no circle border, no text, no Seeds of Life geometry)
- **Background:** Dark forest green circle (`#1a472a`) — same brand green used throughout the site
- **Phoenix color:** Gold / amber (`#FFD700` primary, `#d4a574` for depth/shadow) — the warm golden tone from the logo phoenix
- **Pose:** Wings spread wide and rising upward — the "ascending" pose that reads clearly even at 16px
- **Stroke weight:** Deliberately thick — thin detail lines disappear at favicon size; use bold simplified silhouette
- **Style:** Simplified version of the logo phoenix — capture the essential wing + body + tail shape without fine feather detail
- **Contrast:** High contrast gold-on-dark-green — must be legible in both light and dark browser chrome

**SVG structure approach (for the favicon SVG):**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- Background circle -->
  <circle cx="16" cy="16" r="16" fill="#1a472a"/>
  <!-- Phoenix body — simplified bold path -->
  <!-- Central body: teardrop shape rising from center -->
  <!-- Left wing: sweeping arc up-left -->
  <!-- Right wing: sweeping arc up-right -->
  <!-- Tail: flowing downward split -->
  <!-- Head: small circle or pointed oval at top -->
  <!-- All in gold #FFD700, with #d4a574 for secondary depth -->
</svg>
```

**Design notes for the actual SVG path work:**
- At 16×16, only ~8-10px available for the phoenix inside the circle margin — every pixel counts
- Wings should be the dominant visual element (they're the widest part and most recognizable)
- Body should be a single bold vertical stroke or teardrop
- Tail can be 2-3 downward strokes (suggesting feathers without fine detail)
- Avoid enclosed shapes that fill with colour and lose definition at small sizes — use thick open strokes instead

**Files to replace:**
- `client/public/favicon.svg` — create new SVG (primary source)
- `client/public/favicon.ico` — regenerate from SVG
- `client/public/favicon-16x16.png` — regenerate at 16×16
- `client/public/favicon-32x32.png` — regenerate at 32×32
- `client/public/apple-touch-icon.png` — regenerate at 180×180 (can have more detail at this size)
- `client/public/icon-192.png` and `icon-512.png` if they exist — regenerate

**How to generate PNGs from SVG:**
```bash
# Using sharp or Inkscape from the project root:
npx sharp-cli --input client/public/favicon.svg --output client/public/favicon-16x16.png --width 16 --height 16
npx sharp-cli --input client/public/favicon.svg --output client/public/favicon-32x32.png --width 32 --height 32
npx sharp-cli --input client/public/favicon.svg --output client/public/apple-touch-icon.png --width 180 --height 180
# Or use ImageMagick if available:
convert -background none client/public/favicon.svg -resize 32x32 client/public/favicon-32x32.png
```

**Reuse:** This phoenix SVG will also be used in other parts of the site (loading states, watermarks, decorative elements), so design it as a standalone reusable asset, not purely a favicon artifact.

---

## Fix 10 — /governance: Broken "Two Tokens" Infographic Image

**Problem:** The "RCVoice vs RGVoice — Two Tokens Coordinating Systemic Regeneration" infographic on the `/governance` page is broken. It uses a local path that doesn't exist:

```tsx
// Governance.tsx line 893 — currently broken:
src="/images/governance/rcvoice-vs-rgvoice.png"
```

The file `/images/governance/rcvoice-vs-rgvoice.png` does not exist in the public directory. The broken image appears in the "Two Tokens, Two Powers" section just above the `<TwoTokensSection />` component.

**The correct image** is already uploaded to Cloudflare R2 at:
```
bucket: regen-civics-assets
filename: Earned Through Quests (1).png
```

Based on the pattern of other images on the page (e.g. `https://assets.regencivics.earth/cSiqeQzVeKFgrJHp.png`), the public URL should be:
```
https://assets.regencivics.earth/Earned%20Through%20Quests%20(1).png
```

**File to change:** `client/src/pages/Governance.tsx`

**Fix (single line change at line 893):**

```tsx
// BEFORE:
src="/images/governance/rcvoice-vs-rgvoice.png"

// AFTER:
src="https://assets.regencivics.earth/Earned%20Through%20Quests%20(1).png"
```

Full context:
```tsx
<div className="flex justify-center mb-8">
  <img
    src="https://assets.regencivics.earth/Earned%20Through%20Quests%20(1).png"
    alt="RCVoice vs RGVoice  -  Two Tokens Coordinating Systemic Regeneration"
    className="w-full rounded-xl shadow-2xl"
    loading="lazy"
  />
</div>
```

**Verify the URL first** by opening `https://assets.regencivics.earth/Earned%20Through%20Quests%20(1).png` in a browser before deploying — confirm it loads the RCVoice vs RGVoice infographic. If the domain or path differs, check the R2 bucket's public URL settings for the exact address.

---

## Fix 11 — /blog: Add Land Steward Overview Video Near Top

**Problem:** The blog page has no video presence at the top. There's a conversational overview of the whole ReGen Civics project from the perspective of a land project steward on YouTube that should be the first thing visitors see — it gives new people context and voice before they read anything else.

**Video:** `https://youtu.be/Rbwb2I7RdFM` (YouTube ID: `Rbwb2I7RdFM`)

**Placement:** A new section between the hero (`</section>` at line 285) and the How-To's section (line 287). It should feel like a "start here" featured video — welcoming, grounding, not buried in the How-To grid.

**File to change:** `client/src/pages/Blog.tsx`

**Implementation — insert after the hero `</section>` closing tag:**

```tsx
{/* Featured Overview Video */}
<section className="py-12 px-4 bg-[#0d2818]/40">
  <div className="container mx-auto max-w-3xl">
    <AnimatedSection animation="slide-up">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-[#7dd87d]/20 px-3 py-1 rounded-full mb-3 border border-[#7dd87d]/30">
          <Play className="w-4 h-4 text-[#7dd87d]" />
          <span className="text-[#7dd87d] text-sm font-medium">Start Here</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          A Conversation with a Land Steward
        </h2>
        <p className="text-white/70 text-base max-w-xl mx-auto">
          A grounded overview of ReGen Civics from the perspective of someone stewarding a land project.
        </p>
      </div>

      <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl border border-[#7dd87d]/20"
           style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src="https://www.youtube.com/embed/Rbwb2I7RdFM"
          title="ReGen Civics Overview - Land Steward Perspective"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </AnimatedSection>
  </div>
</section>
```

**Notes:**
- The 16:9 aspect ratio wrapper (`paddingBottom: 56.25%`) makes the embed fully responsive at any width.
- `loading="lazy"` on the iframe defers loading until the user scrolls near it (reduces initial page weight).
- The "Start Here" badge pattern matches the existing pill badges used on the hero section of other pages.
- No new imports needed — `Play` and `AnimatedSection` are already imported in Blog.tsx.
- If the design feels too prominent, the `bg-[#0d2818]/40` section background can be removed to let it blend with the surrounding gradient.

---

## Summary Table

| # | Issue | File(s) | Priority |
|---|-------|---------|----------|
| 1 | Low contrast placeholders/labels across all forms | `client/src/index.css`, `components/ui/input.tsx`, `components/ui/textarea.tsx`, `pages/PlayerProfile.tsx`, `pages/Apply.tsx` | High |
| 2 | Profile form state wiped on navigation | `client/src/pages/PlayerProfile.tsx` — `CreateProfileForm` | High |
| 3 | DB query failure blocking profile creation | Railway production DB — run `pnpm db:push` to apply migrations 0037–0039 | **Critical** |
| 4 | ~~Favicon: Seeds of Life design~~ | *Superseded by Fix 9* | — |
| 5 | Forum completely empty — categories never seeded, no post seed script exists | `seed-forum.mjs` (run against prod), new `seed-forum-posts.mjs` (create + run) | High |
| 6a | DB migration 0037–0039 confirmed not applied — live site errors on every profile query | Railway DB — `pnpm db:push` immediately | **Critical** |
| 6b | Profile tagline copy change | `client/src/pages/PlayerProfile.tsx` | Low |
| 6c | Remove redundant `hyphaProfileUrl` field | `PlayerProfile.tsx`, `ProfileEditForm.tsx`, `server/routers.ts` | Medium |
| 6d | Bio → 4 soul questions (Role, Soul, Desires, Gifts) stored as JSON | `PlayerProfile.tsx`, `ProfileEditForm.tsx` | High |
| 6e | Multi-step profile form wizard (3 steps, progress indicator) | `client/src/pages/PlayerProfile.tsx` | High |
| 6f | Organic seed-to-tree-to-cards transition animation on profile creation | `client/src/pages/PlayerProfile.tsx` | Medium |
| 7 | /map: Rename "All Frequencies" → "All Community Engagement" + move filters behind a Filters card | `client/src/components/GlobeMap.tsx` | Medium |
| 8 | ReGen Guide button covers back-to-top button — move Guide to bottom-left | `client/src/components/ReGenGuide.tsx` | Low |
| 9 | Replace favicon with Golden Phoenix (supersedes Fix 4) | `client/public/favicon.*`, `icon-*.png`, `apple-touch-icon.png` | Medium |
| 10 | /governance broken infographic — local path doesn't exist, swap to Cloudflare URL | `client/src/pages/Governance.tsx` line 893 | High |
| 11 | /blog: Add land steward overview video (youtu.be/Rbwb2I7RdFM) between hero and How-To's | `client/src/pages/Blog.tsx` | Medium |
| 12 | Cloudflare Workers AI image generation pipeline — auto-generate themed images for forum posts, quests, campaigns, blog posts; store to R2 | `workers/image-gen/`, `server/_core/imageGeneration.ts`, `server/routers.ts`, Drizzle migrations | High |
| 13 | Validate Flux pipeline: generate blog overview video backdrop via Fix 14 admin studio, auto-wire into Blog.tsx — confirms Fix 12 + Fix 14 working end-to-end | `client/src/pages/Blog.tsx`, R2 bucket `regen-civics-assets` | Medium |
| 14 | /admin Image Studio tab — generate new images or edit existing by URL, select from 4 variations, upload to R2, find & replace usages across DB | `client/src/components/AdminImageStudio.tsx` (new), `server/_core/imageGeneration.ts`, `server/routers.ts`, `client/src/pages/Admin.tsx` | High |

---

## Fix 12 — Cloudflare Workers AI Image Generation Pipeline

**Goal:** Automatically generate atmospheric, on-brand images for user-created content (forum posts, quest completions, campaign creation, blog posts) using Cloudflare Workers AI (`flux-2-klein-9b`) and store them directly in the existing R2 bucket (`regen-civics-assets`). Images appear as header/card art for the content that triggered them.

**Model:** `@cf/black-forest-labs/flux-2-klein-9b`
- Text-to-image, returns base64 PNG
- Called via Cloudflare Workers AI REST API or AI binding
- ~$0.015 per 1MP image

**Architecture overview:**
```
Railway server (tRPC mutation fires)
  → HTTP POST to Cloudflare Worker (with auth secret)
      → Worker calls Workers AI (Flux) → generates image
      → Worker writes PNG directly to R2 bucket
      → Worker returns { key, url }
  → Railway stores URL in DB column
  → Frontend displays image
```

---

### Step 1 — Create the Cloudflare Worker

Create directory `workers/image-gen/` in the repo root.

**`workers/image-gen/wrangler.toml`:**
```toml
name = "regen-civics-image-gen"
main = "src/index.ts"
compatibility_date = "2024-11-01"

[ai]
binding = "AI"

[[r2_buckets]]
binding = "R2"
bucket_name = "regen-civics-assets"

# AUTH_SECRET is set via: npx wrangler secret put AUTH_SECRET
# Never put secrets in [vars] — that would commit them to source control
```

**`workers/image-gen/package.json`:**
```json
{
  "name": "regen-civics-image-gen",
  "version": "1.0.0",
  "devDependencies": {
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.0.0",
    "wrangler": "^3.0.0"
  }
}
```


**`workers/image-gen/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "lib": ["ESNext"],
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*.ts"]
}
```
**`workers/image-gen/src/index.ts`:**
```typescript
interface Env {
  AI: Ai;
  R2: R2Bucket;
  AUTH_SECRET: string;
}

// Base theme applied to ALL generated images — regenerative site identity
const BASE_THEME = [
  "regenerative", "organic", "healing", "forest", "magical",
  "lush green landscape", "warm golden light", "bioluminescent details",
  "fantasy illustration style", "ultra detailed", "4K quality",
  "storybook atmosphere", "mycorrhizal network patterns",
].join(", ");

// Content-type specific prompt prefixes
const CONTENT_PREFIXES: Record<string, string> = {
  forum:    "Community gathering space illustration —",
  quest:    "Epic quest scene illustration —",
  campaign: "Regenerative campaign poster illustration —",
  blog:     "Thoughtful editorial illustration —",
  profile:  "Portrait of a land steward illustration —",
  default:  "Regenerative landscape illustration —",
};

function buildPrompt(contentType: string, contextText: string): string {
  const prefix = CONTENT_PREFIXES[contentType] ?? CONTENT_PREFIXES.default;
  // Trim context to ~200 chars so prompt stays focused
  const trimmed = contextText.slice(0, 200).replace(/[^\w\s,.!?-]/g, " ");
  return `${prefix} ${trimmed}. Style: ${BASE_THEME}.`;
}

function generateKey(contentType: string, contentId: string | number): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `generated/${contentType}/${contentId}-${ts}.png`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only accept POST
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Auth check — Railway sends this secret in the Authorization header
    const auth = request.headers.get("Authorization");
    if (!auth || auth !== `Bearer ${env.AUTH_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    let body: { contentType: string; contentId: string | number; contextText: string };
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const { contentType, contentId, contextText } = body;
    if (!contentType || !contentId || !contextText) {
      return new Response("Missing required fields: contentType, contentId, contextText", { status: 400 });
    }

    const prompt = buildPrompt(contentType, contextText);
    const key = generateKey(contentType, contentId);

    // Generate image via Workers AI
    // NOTE: Flux models return a ReadableStream, NOT { image: string }
    let imageData: Uint8Array;
    try {
      const stream = await env.AI.run("@cf/black-forest-labs/flux-2-klein-9b", {
        prompt,
        num_steps: 8,  // 4-8 steps is the sweet spot for Flux schnell variants
      }) as ReadableStream;

      // Collect stream chunks into a single Uint8Array
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        done = d;
        if (value) chunks.push(value);
      }
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      imageData = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) { imageData.set(chunk, offset); offset += chunk.length; }
    } catch (err) {
      console.error("Workers AI generation failed:", err);
      return new Response(JSON.stringify({ error: "Image generation failed", detail: String(err) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Write directly to R2
    try {
      await env.R2.put(key, imageData, {
        httpMetadata: { contentType: "image/png" },
        customMetadata: { contentType, contentId: String(contentId), generatedAt: new Date().toISOString() },
      });
    } catch (err) {
      console.error("R2 write failed:", err);
      return new Response(JSON.stringify({ error: "Storage write failed", detail: String(err) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Return the public URL using the same pattern as other R2 assets on the site
    const publicUrl = `https://assets.regencivics.earth/${key}`;

    return new Response(JSON.stringify({ key, url: publicUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
};
```

**Deploy commands (run from `workers/image-gen/`):**
```bash
npm install
# Set the auth secret (one-time):
npx wrangler secret put AUTH_SECRET
# Deploy:
npx wrangler deploy
# Note the deployed URL — it will be https://regen-civics-image-gen.<your-subdomain>.workers.dev
```

---

### Step 2 — Update `server/_core/imageGeneration.ts`

Replace the stub with a real implementation that calls the Worker:

```typescript
// server/_core/imageGeneration.ts
import { ENV } from "./env";  // env.ts is in the same server/_core/ directory

export type GenerateImageOptions = {
  contentType: "forum" | "quest" | "campaign" | "blog" | "profile" | "default";
  contentId: string | number;
  contextText: string;
};

export type GenerateImageResponse = {
  key: string;
  url: string;
};

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  // Use ENV object — do NOT access process.env directly (project convention, see _core/env.ts)
  // IMPORTANT: also add imageGenWorkerUrl and imageGenSecret to _core/env.ts ENV object:
  //   imageGenWorkerUrl: process.env.IMAGE_GEN_WORKER_URL ?? "",
  //   imageGenSecret: process.env.IMAGE_GEN_SECRET ?? "",
  const workerUrl = ENV.imageGenWorkerUrl;
  const secret = ENV.imageGenSecret;

  if (!workerUrl || !secret) {
    throw new Error("Image generation not configured: missing IMAGE_GEN_WORKER_URL or IMAGE_GEN_SECRET");
  }

  const response = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${secret}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Image generation worker returned ${response.status}: ${detail}`);
  }

  return response.json() as Promise<GenerateImageResponse>;
}
```

---

### Step 3 — Add `generatedImageUrl` Columns via Drizzle Migration

Create a new migration file `drizzle/0041_generated_image_urls.sql` (**must be 0041 — 0040 already exists**). Use `pnpm db:generate` after schema changes:

**Schema changes in `drizzle/schema.ts`:**

```typescript
// In forumPosts table definition — add:
generatedImageUrl: varchar("generatedImageUrl", { length: 512 }),

// In campaigns table definition — add:
generatedImageUrl: varchar("generatedImageUrl", { length: 512 }),

// In quests table (if it exists as a DB table rather than static data) — add:
generatedImageUrl: varchar("generatedImageUrl", { length: 512 }),
```

**Run migration:**
```bash
pnpm db:generate  # generates the SQL migration file
pnpm db:push      # applies to Railway production DB
```

---

### Step 4 — Wire Auto-Triggers in tRPC Routers

**Forum post creation** — in `server/routers.ts` (monolithic router file — there is no `server/routers/` subdirectory):

```typescript
// After successfully inserting the forum post:
// postId is already available from: const postId = await db.createForumPost({...})
// NOTE: input.categoryName does NOT exist — categoryId is in input but not the name.
// Use title + content for context (sufficient for the prompt).

// Don't await — generate in background so the mutation returns fast
generateImage({
  contentType: "forum",
  contentId: postId,
  contextText: `${input.title}. ${input.content.slice(0, 150)}`,
}).then(({ url }) => {
  // Update the post row with the generated image URL
  return db.update(forumPosts)
    .set({ generatedImageUrl: url })
    .where(eq(forumPosts.id, postId));
}).catch((err) => {
  // Log but don't fail the mutation
  console.error(`Image generation failed for forum post ${postId}:`, err);
});
```

**Campaign creation** — same pattern in the campaign creation mutation:

```typescript
generateImage({
  contentType: "campaign",
  contentId: campaignId,
  contextText: `${input.title}. ${input.description?.slice(0, 200) ?? ""}`,
}).then(({ url }) => {
  return db.update(campaigns).set({ generatedImageUrl: url }).where(eq(campaigns.id, campaignId));
}).catch((err) => console.error(`Image generation failed for campaign ${campaignId}:`, err));
```

**Quest completion** — in the quest completion handler, generate a "completion card" image:

```typescript
generateImage({
  contentType: "quest",
  contentId: `${userId}-${questId}`,
  contextText: `Quest completed: ${questName}. A player has completed their journey through this regenerative quest.`,
}).then(({ url }) => {
  // Store on the playerProfile completion record or a quest_completions table
  console.log(`Quest completion image generated: ${url}`);
}).catch((err) => console.error(`Quest completion image failed:`, err));
```

**Blog posts** — blog posts are static data in `client/src/data/blogPosts.ts`, not DB-backed. There is no `createBlogPost` server mutation to hook into. Blog image generation is deferred — use the batch script pattern (Step 7) if desired, or a future admin trigger. Do NOT add a server-side trigger here.

---

### Step 5 — Expose Image URL in tRPC Query Responses

Wherever `forumPosts` or `campaigns` are queried and returned, include `generatedImageUrl` in the selected columns so the frontend can display them.

Example for forum list query:
```typescript
// Make sure generatedImageUrl is selected in the forum posts query:
db.select({
  id: forumPosts.id,
  title: forumPosts.title,
  // ... other fields ...
  generatedImageUrl: forumPosts.generatedImageUrl,  // ADD THIS
})
```

---

### Step 6 — Display Generated Images on Frontend

**Forum thread cards** — in the forum post list component, if `post.generatedImageUrl` exists, render it as a banner image at the top of the card:

```tsx
{post.generatedImageUrl && (
  <div className="w-full h-32 overflow-hidden rounded-t-lg">
    <img
      src={post.generatedImageUrl}
      alt={post.title}
      className="w-full h-full object-cover"
      loading="lazy"
    />
  </div>
)}
```

**Campaign cards** — same pattern on campaign list/detail pages.

---

### Step 7 — Batch Pre-Generate Quest Card Images (Optional but Recommended)

There are 13+ quests with static data. Create a one-time script `scripts/generate-quest-images.mjs` that calls the Worker for each quest:

```javascript
import 'dotenv/config';

const WORKER_URL = process.env.IMAGE_GEN_WORKER_URL;
const SECRET = process.env.IMAGE_GEN_SECRET;

const quests = [
  { id: 'quest-0',  name: 'Welcome to the Infinite Game', description: 'Begin your journey into regenerative civics.' },
  { id: 'quest-1',  name: 'Discover Your Biome',           description: 'Explore the living systems of your local bioregion.' },
  { id: 'quest-2',  name: 'Saving Seeds',                  description: 'Preserve genetic diversity and food sovereignty through seed saving.' },
  { id: 'quest-3',  name: 'Water Wisdom',                  description: 'Learn to work with water cycles and watershed health.' },
  { id: 'quest-4',  name: 'Soil Stewardship',              description: 'Build living soil and restore the foundation of all land health.' },
  { id: 'quest-5',  name: 'Food Forest Fundamentals',      description: 'Design and plant food forests that mimic natural ecosystems.' },
  { id: 'quest-6',  name: 'Community Weaving',             description: 'Build resilient community bonds and mutual aid networks.' },
  { id: 'quest-7',  name: 'Regenerative Finance Basics',   description: 'Learn how capital can serve regeneration rather than extraction.' },
  { id: 'quest-8',  name: 'Governance & Decision Making',  description: 'Explore consent-based governance and collective decision making.' },
  { id: 'quest-9',  name: 'Land Stewardship',              description: 'Develop long-term relationships with land and place.' },
  { id: 'quest-10', name: 'Alliance Building',             description: 'Connect with bioregional networks and movement partners.' },
  { id: 'quest-11', name: 'The Living Lab',                description: 'Turn your land into a living laboratory for regenerative practices.' },
  { id: 'quest-12', name: 'Season Completion',             description: 'Integrate the learning of a full season and pass the torch.' },
  { id: 'food-foresting', name: 'Food Foresting',          description: 'Deep practice in multi-strata food forest design and care.' },
];

for (const quest of quests) {
  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SECRET}` },
    body: JSON.stringify({
      contentType: 'quest',
      contentId: quest.id,
      contextText: `${quest.name}. ${quest.description}`,
    }),
  });

  const data = await res.json();
  console.log(`${quest.id}: ${data.url ?? data.error}`);

  // Rate limit — Flux is fast but be kind to the API
  await new Promise(r => setTimeout(r, 1500));
}
```

Run:
```bash
IMAGE_GEN_WORKER_URL=https://regen-civics-image-gen.<subdomain>.workers.dev \
IMAGE_GEN_SECRET=<your-secret> \
node scripts/generate-quest-images.mjs
```

Then update the quest static data in the frontend to include each image URL from the output.

---

### Step 8 — Required Environment Variables

**Railway (production server) — add to Railway environment:**
```
IMAGE_GEN_WORKER_URL=https://regen-civics-image-gen.<your-cf-subdomain>.workers.dev
IMAGE_GEN_SECRET=<generate a random 32-char secret, e.g. openssl rand -hex 16>
```

**Cloudflare Worker — set via `wrangler secret`:**
```bash
# From workers/image-gen/ directory:
npx wrangler secret put AUTH_SECRET
# Enter the same value as IMAGE_GEN_SECRET above
```

**Local dev `.env` (optional — for testing image gen locally):**
```
IMAGE_GEN_WORKER_URL=https://regen-civics-image-gen.<subdomain>.workers.dev
IMAGE_GEN_SECRET=<same secret>
```

**Note on Cloudflare account setup:**
- Workers AI must be enabled on your Cloudflare account (free tier includes limited usage)
- The R2 bucket `regen-civics-assets` must already exist (it does — it's live)
- The Worker needs R2 write access — the `[[r2_buckets]]` binding in `wrangler.toml` grants this automatically when deployed under the same Cloudflare account that owns the bucket
- The Worker's `CF_ACCOUNT_ID` is not needed as an env var — it's implied by which Cloudflare account you authenticate `wrangler` with

---

### Summary of files to create/modify

| Action | File | Notes |
|--------|------|-------|
| CREATE | `workers/image-gen/wrangler.toml` | No `nodejs_compat` flag; no `[vars]` block |
| CREATE | `workers/image-gen/package.json` | Dev deps: wrangler, typescript, @cloudflare/workers-types |
| CREATE | `workers/image-gen/tsconfig.json` | TS config for Worker (target ESNext) |
| CREATE | `workers/image-gen/src/index.ts` | Worker: stream-based Flux handling + R2 write |
| MODIFY | `server/_core/env.ts` | Add `imageGenWorkerUrl` and `imageGenSecret` to ENV object |
| MODIFY | `server/_core/imageGeneration.ts` | Replace stub; use ENV, not process.env directly |
| MODIFY | `drizzle/schema.ts` | Add `generatedImageUrl` to `forumPosts` + `campaigns` |
| CREATE | `drizzle/0041_generated_image_urls.sql` | **0041 not 0040** — run `pnpm db:generate` + `pnpm db:push` |
| MODIFY | `server/routers.ts` | Forum `createPost`: use `postId` directly; no `input.categoryName` |
| MODIFY | `server/routers.ts` | Campaign `create`: fire-and-forget using `campaignId` |
| MODIFY | forum + campaign tRPC queries | Include `generatedImageUrl` in SELECT |
| MODIFY | Frontend forum/campaign components | Render banner image if URL present |
| CREATE | `scripts/generate-quest-images.mjs` | One-time batch (quests + deferred blog posts) |


---

### Fix 12 — Production Readiness Review: Bugs & Corrections

A full read of the relevant codebase files against the Fix 12 plan found the following issues. Each must be corrected before handing off to Claude Code for implementation.

---

#### Bug 1 — Wrong migration number (CRITICAL)

**Problem:** Fix 12 Step 4 instructs creating `drizzle/0040_generated_image_urls.sql`. The file `drizzle/0040_early_darkstar.sql` already exists (creates `player_contributions` table, adds columns to `applications` and `player_profiles`).

**Fix:** The migration must be numbered `0041`. Use:
```
drizzle/0041_generated_image_urls.sql
```

Also update the summary table row under "CREATE migration SQL" to reflect `0041`.

---

#### Bug 2 — Wrong router file path (CRITICAL)

**Problem:** Fix 12 Steps 5 and 6 say to modify `server/routers/forum.ts`. This file does not exist. The codebase uses a single monolithic file: `server/routers.ts`. There is no `server/routers/` subdirectory.

**Fix:** Every reference to `server/routers/forum.ts` or `server/routers/campaign.ts` should read `server/routers.ts`. The forum `createPost` mutation and the campaign `create` mutation both live in that one file.

Also update the summary table row from `server/routers/forum.ts` to `server/routers.ts`.

---

#### Bug 3 — `insertResult.insertId` doesn't exist in the forum trigger (CRITICAL)

**Problem:** The forum trigger code in Fix 12 Step 5 references:
```typescript
const postId = insertResult.insertId;
```
But the actual `createPost` mutation in `server/routers.ts` already uses:
```typescript
const postId = await db.createForumPost({ ... });
return { id: postId };
```
There is no `insertResult` variable. The ID is available directly as `postId`.

**Fix:** Replace the trigger insertion point so it fires after the `createForumPost` call using `postId` directly:
```typescript
const postId = await db.createForumPost({ ... });
// Fire-and-forget image gen
generateImageForContent({ contentType: 'forum-post', contentId: postId, contextText: input.title }).catch(console.error);
return { id: postId };
```

---

#### Bug 4 — `input.categoryName` doesn't exist in the forum create input (CRITICAL)

**Problem:** The forum trigger prompt builder references `input.categoryName ?? ""`. The `createPost` input schema is:
```typescript
z.object({
  categoryId: z.number(),
  title: z.string().min(3).max(300),
  content: z.string().min(10).max(10000),
})
```
`categoryName` is not in the schema and will always be `undefined`.

**Fix:** Either drop the category name from the prompt (simplest), or look it up from `forumCategories` using `input.categoryId` before building the prompt. The prompt can work fine without the category name — the post title alone gives enough context.

---

#### Bug 5 — `process.env` accessed directly instead of through ENV object (HIGH)

**Problem:** Fix 12 Step 3's replacement `imageGeneration.ts` accesses:
```typescript
process.env.IMAGE_GEN_WORKER_URL
process.env.IMAGE_GEN_SECRET
```
The codebase uses a centralized `ENV` object in `server/_core/env.ts` for all env vars. Direct `process.env` access bypasses type safety and is inconsistent with the existing pattern.

**Fix:** Add the two new vars to `server/_core/env.ts`:
```typescript
export const ENV = {
  // ... existing vars ...
  imageGenWorkerUrl: process.env.IMAGE_GEN_WORKER_URL ?? "",
  imageGenSecret: process.env.IMAGE_GEN_SECRET ?? "",
};
```
Then use `ENV.imageGenWorkerUrl` and `ENV.imageGenSecret` in the updated `imageGeneration.ts`.

---

#### Bug 6 — Blog posts are static data, not DB-backed (HIGH)

**Problem:** Fix 12 includes blog post image generation as a trigger that fires after a `createBlogPost` server mutation. No such mutation exists. Blog posts are defined in `client/src/data/blogPosts.ts` — a static TypeScript file with no DB table and no server-side create endpoint.

**Fix:** Remove the blog post trigger from the server-side wiring steps. Blog post image generation (if desired) is a separate concern — either:
- A one-time build-time script (similar to the quest batch script), OR
- An admin-triggered manual generation endpoint added later as a separate feature

For now, scope Fix 12 to: forum posts, campaigns, and optionally quest completions only.

---

#### Bug 7 — Flux AI response format may not be `{ image: string }` (HIGH)

**Problem:** The Worker code casts the AI result as:
```typescript
const result = await c.env.AI.run("@cf/black-forest-labs/flux-2-klein-9b", { prompt }) as { image: string };
const imageData = Buffer.from(result.image, "base64");
```
Cloudflare Workers AI Flux models (`flux-1-schnell`, `flux-2-klein-9b`) return a `ReadableStream` — not a `{ image: string }` object. The base64 cast will fail at runtime.

**Fix:** Use the stream directly and convert it to a buffer:
```typescript
const stream = await c.env.AI.run("@cf/black-forest-labs/flux-2-klein-9b", { prompt }) as ReadableStream;
const reader = stream.getReader();
const chunks: Uint8Array[] = [];
let done = false;
while (!done) {
  const result = await reader.read();
  done = result.done;
  if (result.value) chunks.push(result.value);
}
const imageData = Buffer.concat(chunks);
```
Alternatively, verify the exact response shape in Cloudflare's Workers AI docs for this specific model before implementation, as the format may differ from other Flux variants.

---

#### Bug 8 — `workers/image-gen/tsconfig.json` missing from file list

**Problem:** The summary table at the end of Fix 12 does not include a `tsconfig.json` for the Worker. TypeScript compilation will fail without it.

**Fix:** Add to the summary table:
```
| CREATE | workers/image-gen/tsconfig.json | TS config for the Worker (extends base, target esnext) |
```

A minimal `tsconfig.json` for the Worker:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "lib": ["ESNext"],
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*.ts"]
}
```

---

#### Bug 9 — `nodejs_compat` flag is unnecessary and adds risk

**Problem:** `wrangler.toml` includes `compatibility_flags = ["nodejs_compat"]`. This flag emulates Node.js built-ins in the Workers runtime. The Worker only needs `atob` (natively available in Workers) and fetch — neither requires `nodejs_compat`. The flag can introduce bundle overhead and unexpected compatibility issues.

**Fix:** Remove the `compatibility_flags` line from `wrangler.toml` entirely. If `Buffer` is needed for byte manipulation, use a `Uint8Array`-based approach instead (Workers-native), or note that `Buffer` is available via `nodejs_compat` only if you intentionally keep the flag.

---

#### Bug 10 — No rate limiting on the Worker endpoint

**Problem:** The only protection on the Worker is the `AUTH_SECRET` header check. If the Railway server has a bug causing repeated retries (e.g., a retry loop, a migration failure causing re-fires), or if the secret leaks, there is no throttle on image generation costs. At ~$0.015/image, a runaway loop could accumulate costs quickly.

**Fix (recommended):** Add a simple in-Worker rate limiter using Cloudflare's `RateLimit` binding (Workers Rate Limiting API), or at minimum log every generation with timestamp and set a per-minute cap. A simple approach: add a `rateLimit` counter using a Workers KV binding with a 1-minute TTL. If this feels over-engineered for now, document it as a known risk and add a `console.log` for every generation event so costs are visible in the Workers logs.

---

#### Bug 11 — Quest completion image URL has nowhere to persist

**Problem:** The quest completion trigger in Fix 12 Step 6 only does `console.log(url)` after generating the image. Quest data is static (no `questCompletions` DB table is defined). The generated URL is never stored, making it impossible to display the image to the user.

**Fix:** Either:
- Skip quest completion triggers for now and include only forum posts and campaigns in the initial implementation (both have clear DB tables and columns to store the URL), OR
- Create a `quest_completion_images` table (or add a JSON blob to `playerProfiles.questsCompleted`) to store `{ questId, imageUrl }` per-player

Recommend deferring quest images to a follow-up fix. Scope Fix 12 to forum posts + campaigns only, where the storage target is clear.

---

#### Updated Summary Table for Fix 12

Replace the summary table at the end of Fix 12 with:

| Action | File | Notes |
|--------|------|-------|
| CREATE | `workers/image-gen/wrangler.toml` | Worker config — remove `nodejs_compat` flag |
| CREATE | `workers/image-gen/package.json` | Dev deps only (wrangler, TS, @cloudflare/workers-types) |
| CREATE | `workers/image-gen/tsconfig.json` | TS config for Worker (target ESNext) |
| CREATE | `workers/image-gen/src/index.ts` | Worker: Flux stream handling + R2 write |
| MODIFY | `server/_core/env.ts` | Add `imageGenWorkerUrl` and `imageGenSecret` to ENV object |
| MODIFY | `server/_core/imageGeneration.ts` | Replace stub with Worker HTTP call (use ENV, not process.env) |
| MODIFY | `drizzle/schema.ts` | Add `generatedImageUrl` to `forumPosts` + `campaigns` |
| CREATE | `drizzle/0041_generated_image_urls.sql` | **0041 not 0040** — `pnpm db:generate` + `pnpm db:push` |
| MODIFY | `server/routers.ts` | Forum `createPost`: fire-and-forget using `postId` (not `insertResult.insertId`), no `input.categoryName` |
| MODIFY | `server/routers.ts` | Campaign `create`: fire-and-forget using `campaignId` |
| MODIFY | forum + campaign tRPC queries | Include `generatedImageUrl` in SELECT |
| MODIFY | Frontend forum/campaign components | Render banner image if URL present |
| CREATE | `scripts/generate-quest-images.mjs` | One-time batch (deferred — scope TBD) |

---

## Fix 13 — Validate Blog Overview Video Backdrop via Fix 14 Admin Studio

**Goal:** Generate the on-brand visual backdrop for the blog overview video section (Fix 11) using the Flux pipeline, and confirm the end-to-end automated workflow (generation → R2 upload → Blog.tsx wiring) works correctly. This is the first real validation of Fix 12's Cloudflare Workers AI pipeline and Fix 14's admin Image Studio working together.

**Depends on:** Fix 12 (Flux Worker deployed) + Fix 14 (Admin Image Studio shipped)

---

### How this gets done

No manual steps. Once Fix 12 and Fix 14 are in place:

1. Open `/admin` → Images tab
2. Select content type: `video`
3. Enter title: `Land Steward Overview — A real conversation about regenerative stewardship on the ground`
4. Click **Generate** — the system builds the branded prompt using the `video` prefix + BASE_THEME, calls the Flux Worker 4 times in parallel, stores all 4 variations to R2 as temp files
5. Click to select the best variation
6. Click **Apply** — the system automatically:
   - Promotes the selected variation to a permanent R2 filename (`YYYY-MM-DD-HH-MM-SS-video-land-steward-overview.png`)
   - Deletes the 3 unselected temp variations from R2
   - Updates the `backgroundImage` URL in Blog.tsx

---

### What good output looks like

The video section backdrop should feel like stepping into the world behind the conversation. Check against:

- Warm golden light filtering through forest canopy — not cold, not clinical
- A path or opening that draws the eye forward, creating depth and invitation
- Works well with a dark overlay on top (the video embed sits over this — center area shouldn't be too visually busy)
- Real-looking land steward figure(s) present but not required — if present, must look genuinely human
- Bioluminescent mushrooms, mycorrhizal threads, fruiting trees — the full ReGen Civics world visible
- Feels like you're about to step into that conversation

**If output needs another pass:** Adjust the title field slightly in the admin studio to shift the prompt and regenerate. All iterations handled automatically — no manual uploads.

---

### Target Blog.tsx output (reference — auto-wired by Fix 14)

```tsx
{/* Land Steward Overview Video */}
<section className="py-16 bg-[#0f2419]">
  <div className="max-w-4xl mx-auto px-4">
    <AnimatedSection>
      <div className="rounded-2xl overflow-hidden shadow-2xl">
        <div
          className="relative bg-cover bg-center"
          style={{ backgroundImage: `url('https://assets.regencivics.earth/YYYY-MM-DD-HH-MM-SS-video-land-steward-overview.png')` }}
        >
          <div className="bg-black/60 p-8 flex flex-col items-center text-center gap-4">
            <h2 className="text-2xl font-bold text-white">Hear It From a Land Steward</h2>
            <p className="text-white/80 max-w-xl text-base">
              A real conversation about what regenerative land stewardship feels like on the ground.
            </p>
            <div className="w-full aspect-video rounded-xl overflow-hidden mt-2">
              <iframe
                src="https://www.youtube-nocookie.com/embed/Rbwb2I7RdFM"
                title="ReGen Civics — Land Steward Overview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  </div>
</section>
```

---

### This validates the full production pipeline

Fix 13 passing means: Fix 12's Flux Worker is generating on-brand images, Fix 14's admin studio is correctly wiring them into the frontend, and R2 upload + filename management is working end-to-end with zero manual steps.

---

## Fix 14 — /admin Image Studio: Create and Edit Site Images

**Goal:** Add an "Images" tab to `/admin` that acts as a fully automated image studio — generate new on-brand images for any content type, or replace existing site images with an updated version. The admin selects from generated variations and clicks Apply; the system handles R2 upload, filename management, and data source wiring automatically with zero manual steps.

---

### The Flow

**Creating a new image:**
1. Pick content type (blog, quest, campaign, forum, video, profile, default)
2. Enter title + optional description/tags
3. Click "Generate" — backend builds the branded prompt using the same `BASE_THEME` and prefix logic from the `regen-content-image` skill, calls the Flux Worker (`@cf/black-forest-labs/flux-2-klein-9b`) 4 times in parallel, stores all 4 variations to R2 as temp files
4. Admin clicks a variation to select it
5. Click "Apply" — system automatically:
   - Promotes the selected variation to a permanent R2 filename (`YYYY-MM-DD-HH-MM-SS-{contentType}-{slug}.png`)
   - Deletes the 3 unselected temp variations from R2
   - Returns the new public URL to display in the panel

**Editing an existing image:**
1. Paste the current image URL (e.g., `https://assets.regencivics.earth/aVsQKWGuwteoFgZN.jpg`)
2. The original image renders as a preview
3. Enter an edit prompt (e.g., "add children playing in the foreground" or "make it feel more like dusk")
4. Click "Generate Variations" — backend incorporates the edit prompt into a new Flux text prompt derived from the original title + edit instruction (Flux is text-to-image only — no pixel-level editing), calls the Flux Worker 4 times in parallel, stores all 4 as temp files
5. Admin clicks to select one
6. Click "Apply" — system automatically:
   - Promotes the selected variation to a permanent R2 filename
   - Deletes the 3 unselected temp variations from R2
   - Scans DB tables (blog_posts, forum_posts, campaigns, quests) for usages of the old filename
   - Updates all found records in a single transaction
   - Returns the new URL and a count of updated records

---

### Architecture

#### New component: `client/src/components/AdminImageStudio.tsx`

```tsx
// Full image studio UI — new tab content in Admin.tsx
// State:
//   mode: 'create' | 'edit'
//   contentType: ContentType
//   title: string
//   description: string
//   editUrl: string          // existing image URL when editing
//   editPrompt: string       // user's edit instruction
//   generating: boolean
//   variations: string[]     // array of generated image URLs (4 items)
//   selected: number | null  // index of selected variation
//   uploadedUrl: string | null
//   usages: ImageUsage[]     // found references to the old URL

// Sections:
// 1. Mode toggle: "Create New" | "Edit Existing"
// 2. CREATE mode: ContentType picker + Title + Description fields
// 3. EDIT mode: URL input + preview of original + Edit Prompt textarea
// 4. "Generate 4 Variations" button
// 5. 2x2 grid of variation previews (loading skeletons during generation)
// 6. Selected variation gets a green ring + "Apply" button
// 7. Post-apply: new public URL display + (EDIT mode) updated records count
```

#### New tRPC procedures in `server/routers.ts`

**`admin.generateImageVariations`**
```typescript
// Input:
//   mode: 'create' | 'edit'
//   contentType: ContentType
//   title: string
//   description?: string
//   tags?: string[]
//   editUrl?: string      // existing image URL (edit mode)
//   editPrompt?: string   // user's edit instruction (edit mode)
//   count?: number        // default 4

// What it does:
//   1. Builds the branded prompt using BASE_THEME + content-type prefix (same formula
//      as the regen-content-image skill, but server-side)
//   2. In edit mode: incorporates editPrompt into the text prompt — e.g.
//      buildImagePrompt(contentType, `${title} — ${editPrompt}`)
//      NOTE: @cf/black-forest-labs/flux-2-klein-9b is text-to-image only;
//      there is no img2img or reference image input. Edit mode works by
//      modifying the prompt text, not by passing pixel data.
//   3. Calls generateImage() (server/_core/imageGeneration.ts) count times in parallel
//      — Fix 12 implements this using @cf/black-forest-labs/flux-2-klein-9b via the
//      Cloudflare Worker; Fix 14 just calls the same function
//   4. Stores each result in R2 as a temp file, returns { variations: string[] } — array of temp R2 URLs

// Returns: { variations: string[] }
```

**`admin.applySelectedVariation`**
```typescript
// Input:
//   selectedTempUrl: string   // R2 temp URL of the chosen variation
//   allTempUrls: string[]     // all 4 temp URLs (to delete the 3 unselected)
//   contentType: ContentType
//   title: string
//   oldFilename?: string      // if replacing an existing image (edit mode)

// What it does:
//   1. Generates a permanent timestamped filename: YYYY-MM-DD-HH-MM-SS-{contentType}-{slug}.png
//   2. Copies selected temp object to the permanent key in R2 bucket regen-civics-assets
//   3. Deletes all temp objects (selected and unselected)
//   4. If oldFilename is provided: runs replaceImageInUsages automatically across all DB tables
//   5. Returns { filename, publicUrl, replaced } — replaced = count of DB records updated

// Returns: { filename: string, publicUrl: string, replaced: number }
```

**`admin.findImageUsages`**
```typescript
// Input:
//   filename: string  // just the filename, e.g. "aVsQKWGuwteoFgZN.jpg"

// What it does:
//   Scans all DB tables for this filename:
//   1. SELECT id, title FROM blog_posts WHERE image LIKE '%{filename}%'
//   2. SELECT id, title FROM forum_posts WHERE generated_image_url LIKE '%{filename}%'
//   3. SELECT id, title FROM campaigns WHERE generated_image_url LIKE '%{filename}%'
//   4. SELECT id, title FROM quests WHERE image LIKE '%{filename}%'
//   NOTE: blogPosts.ts is currently a static TypeScript file. Before Fix 14 can
//   auto-replace blog post images, blog post data must be migrated to the blog_posts
//   DB table (see Files to Create/Modify below). This migration is a prerequisite
//   for full automation — there is no manual fallback.

// Returns: { usages: Array<{ source: string, id: string, title: string }> }
```

**`admin.replaceImageInUsages`**
```typescript
// Input:
//   oldFilename: string
//   newFilename: string
//   usages: Array<{ source: string, id: string }>  // which records to update

// What it does:
//   Runs DB updates for each usage (UPDATE forum_posts SET generated_image_url = ...
//   WHERE id = ...)
//   Returns count of updated records

// Returns: { updated: number }
```

---

### Prompt Building (server-side)

Add `buildImagePrompt()` to `server/_core/imageGeneration.ts`:

```typescript
const BASE_THEME = `solarpunk regenerative world where ancient golden-age civilizations are overgrown with cascading life, massive ancient trees coated in moss and bioluminescent mycelium, glowing teal mushrooms, mycorrhizal network threadwork visible in soil and bark, fruiting plants and abundant layered gardens, birds and animals present at every scale, diverse life teeming at all levels, warm golden amber light emanating from within the canopy and from distant golden-spired living cities, deep forest green tones, golden accents and highlights, hyperrealistic magical realism, detailed fantasy concept art, photorealistic texture and specificity, ultra detailed, 4K, the scene feels real but more alive than reality — as if life's volume has been turned all the way up`;

const PREFIXES: Record<ContentType, string> = {
  blog: "A detailed magical realism scene depicting",
  quest: "A richly illustrated quest card scene showing a player in the act of",
  campaign: "A wide panoramic view of a regenerative landscape where",
  forum: "A real-looking gathering of diverse people in a living space where",
  video: "A cinematic landscape portal scene, as if the viewer is stepping through into",
  profile: "A photorealistic person standing within a regenerative landscape, surrounded by",
  default: "A lush regenerative scene within the ReGen Civics world, showing",
};

export function buildImagePrompt(
  contentType: ContentType,
  title: string,
  description?: string,
  tags?: string[]
): string {
  const prefix = PREFIXES[contentType];
  const context = [title, description?.slice(0, 150)].filter(Boolean).join(" — ");
  return `${prefix} ${context}, ${BASE_THEME}`;
}
```

---

### Adding the Tab to Admin.tsx

**Step 1 — Add to TAB_KEYS constant** (near line 2274):
```typescript
{ key: '0', desc: 'Jump to Images tab' },
// add to the TAB_KEYS array
```

**Step 2 — Add TabsTrigger** (after the last trigger, near line 2780):
```tsx
<TabsTrigger
  value="images"
  className="text-xs sm:text-sm px-3 py-2 rounded-md data-[state=active]:bg-[#1a472a] data-[state=active]:text-white"
>
  🖼️ Images
</TabsTrigger>
```

**Step 3 — Add TabsContent** (after `<TabsContent value="settings">`):
```tsx
<TabsContent value="images">
  <AdminImageStudio />
</TabsContent>
```

**Step 4 — Add import**:
```typescript
import { AdminImageStudio } from "@/components/AdminImageStudio";
```

---

### AdminImageStudio UI Layout

```
┌─────────────────────────────────────────────────┐
│  🖼️ Image Studio                                │
│                                                 │
│  [Create New]  [Edit Existing]                  │
│                                                 │
│  ── CREATE mode ──────────────────────────────  │
│  Content Type: [Blog ▼]                         │
│  Title: [________________________]              │
│  Description (optional): [____________]         │
│  Tags (optional): [____________]                │
│                                                 │
│  ── EDIT mode ─────────────────────────────── │
│  Image URL: [https://assets.regencivics.earth/] │
│  [Preview of original image]                    │
│  Edit prompt: [add children in the foreground]  │
│                                                 │
│  [Generate 4 Variations]                        │
│                                                 │
│  ┌──────────┐  ┌──────────┐                     │
│  │ var 1    │  │ var 2    │  ← click to select  │
│  └──────────┘  └──────────┘                     │
│  ┌──────────┐  ┌──────────┐                     │
│  │ var 3 ✓  │  │ var 4    │  ← green ring       │
│  └──────────┘  └──────────┘                     │
│                                                 │
│  [Apply]  ← uploads to R2, deletes temp files,  │
│             auto-replaces all DB usages (EDIT)  │
│                                                 │
│  ✅ Done: https://assets.regencivics.earth/     │
│           2026-03-10-14-23-05-blog-xyz.png      │
│           (EDIT mode) Updated 2 records         │
└─────────────────────────────────────────────────┘
```

---

### Dependency on Fix 12

Fix 14 calls `generateImage()` from `server/_core/imageGeneration.ts`. Fix 12 implements that function properly (replacing the current stub) using the Cloudflare Workers AI + `@cf/black-forest-labs/flux-2-klein-9b`. **Fix 12 must be completed before Fix 14's generation pipeline works end-to-end.** Fix 14's UI and tRPC procedures can be scaffolded independently — generation will throw "not configured" until Fix 12 lands — but there is no interim fallback. Fix 12 and Fix 14 should be shipped together.

---

### Files to Create / Modify

| Action | Path | Description |
|--------|------|-------------|
| CREATE | `client/src/components/AdminImageStudio.tsx` | Full image studio component |
| MODIFY | `server/_core/imageGeneration.ts` | Add `buildImagePrompt()` + `ContentType` type |
| MODIFY | `server/routers.ts` | Add 4 new admin procedures (`generateImageVariations`, `applySelectedVariation`, `findImageUsages`, `replaceImageInUsages`) |
| MODIFY | `client/src/pages/Admin.tsx` | Add Images tab trigger + content + import |
| MIGRATE | `client/src/data/blogPosts.ts` → DB `blog_posts` table | **Prerequisite for full automation** — move blog post data out of static TS file into the DB so `findImageUsages` and `replaceImageInUsages` can operate on blog images automatically |

---

### Priority Notes

- Fix 12 and Fix 14 must ship together — there is no fallback generation path
- The blogPosts.ts migration is a prerequisite for full automation on blog images; it should be treated as part of Fix 14's scope
- The Apply button doing everything in one click (generate → R2 → DB replace) is the core UX requirement — no intermediate copy/paste steps
- Generation speed: calling `generateImage()` 4 times in parallel adds latency; consider returning 2 variations initially with a "Generate More" option if this becomes a problem in practice
- Edit mode uses prompt modification only (Flux is text-to-image); if the team later wants true img2img editing, that would require a different model and is out of scope for Fix 14



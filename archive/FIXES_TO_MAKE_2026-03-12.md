# Fixes to Make — 2026-03-12

This document continues from `FIXES_TO_MAKE_2026-03-11.md`. All fixes below are new findings from the 2026-03-12 session.

---

## Fix 50 — Admin Dashboard Shows 0 For All Data (Critical)

**Status:** CODED (scripts ready) — HUMAN steps required

**Symptom:** `/admin` shows "0 total · 0 awaiting review" for applications, 0 investor inquiries, 0 general inquiries — even though the globe map correctly shows submitted applications ("Living University Network", "Aquarella").

**Root cause:** `OWNER_OPEN_ID` in both the local `.env` and likely Railway is still set to the placeholder value `google:your-google-user-id` instead of your real Google account ID. Because no real ID ever matches, `upsertUser()` never assigns `role='admin'` to your account. Every admin tRPC endpoint (`applications.list`, `investorInquiries.list`, `generalInquiries.list`) checks `ctx.user.role === 'admin'` and throws `FORBIDDEN` when it doesn't match — React Query silently returns `undefined`, and the UI shows 0.

The map works because `applications.mapData` is a `publicProcedure` with no role check.

**Why the data is there:** The map is showing real DB records (not hardcoded). Those records exist. The admin just can't see them yet.

**Fix — two steps, do them in this order:**

### Step 1: Set your role to admin in the DB (run on Windows)

```powershell
# From project root — load .env vars into PowerShell session
$env = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $env) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }

# Run the fix script with your Google login email
$Env:TARGET_EMAIL="rieki.cordon@gmail.com"; npx tsx scripts/fix-admin-role.ts
```

The script will print something like:

```
Found user:
  id:      3
  email:   rieki.cordon@gmail.com
  role:    user
  open_id: google:123456789012345678901

Updated role to 'admin' for user id=3

👉  Set OWNER_OPEN_ID in Railway to: google:123456789012345678901
```

### Step 2: Update OWNER_OPEN_ID in Railway

1. Go to your Railway project
2. Select the backend service → Variables
3. Find `OWNER_OPEN_ID` → change it to the `google:NUMERIC_ID` printed by the script
4. Railway will redeploy automatically

### Step 3: Sign out and back in

Sign out of `regencivics.earth` and sign back in with your Google account. The `upsertUser` function runs on every login and will re-confirm your admin role going forward.

**Files added:** `scripts/fix-admin-role.ts`, `scripts/check-db.ts`

---

## Fix 51 + 52 — Remove All Tripetto Forms

**Status:** CODED — needs deploy

**What Tripetto was:** An early prototype approach using an external third-party form service. Submissions went to Tripetto's servers and never touched the Railway DB, admin dashboard, or any site logic. Not used anymore. Everything is now handled with native tRPC forms writing directly to Railway MySQL.

**What was removed:**

- `client/src/pages/InvestmentForm.tsx` — gutted to a deprecation stub. Route `/investmentform` now redirects to `/investor` (the real DB-backed investor form).
- `client/src/pages/Form.tsx` — gutted to a deprecation stub. Route `/form` now redirects to `/connect` (the real DB-backed contact/newsletter form).
- `client/src/components/NewsletterSignup.tsx` — "Subscribe" button changed from `/form` to `/connect` directly.
- `client/src/App.tsx` — lazy imports for both Tripetto pages removed. Redirect routes added.
- `client/src/pages/Connect.tsx` — removed stale "Based on Tripetto form structure" comment in the file header.

The two stub files (`Form.tsx`, `InvestmentForm.tsx`) can be deleted from the repo once you push. They contain no code that runs.

**Files changed:** `client/src/App.tsx`, `client/src/components/NewsletterSignup.tsx`, `client/src/pages/Form.tsx`, `client/src/pages/InvestmentForm.tsx`, `client/src/pages/Connect.tsx`

---

## Fix 53 — All Active Forms Now Wired to DB

**Status:** VERIFIED

Every form on the site writes to Railway MySQL via tRPC and will appear in `/admin` once Fix 50 (admin role) is resolved:

| Route | Component | tRPC endpoint | DB table | Admin tab |
|---|---|---|---|---|
| `/apply` | Apply.tsx | `applications.create/submit` | `applications` | Applications |
| `/investor` | InvestorForm.tsx | `investorInquiries.submit` | `investor_inquiries` | Investors |
| `/connect` | Connect.tsx | `generalInquiries.submit` | `general_inquiries` | Inquiries |
| `/connect` | Connect.tsx | `newsletter.subscribe` | `newsletter_subscribers` | Newsletter |

No Tripetto embeds remain anywhere in the codebase.

---

## Fix 54 — Run Pending Scripts (Previously Fix 44)

**Status:** SCRIPTS READY — HUMAN step required

All 4 CSV files are confirmed present in `scripts/data/`. Run all 5 scripts in one PowerShell session:

```powershell
# From project root — load .env first
$env = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $env) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }

# Check DB state first (optional but recommended)
npx tsx scripts/check-db.ts

# Import CSV data
npx tsx scripts/import-users.ts
npx tsx scripts/import-applications.ts
npx tsx scripts/import-general-inquiries.ts
npx tsx scripts/import-video-suggestions.ts

# Seed quest comments (requires your user ID from check-db.ts output)
$Env:RYE_USER_ID=1; npx tsx scripts/seed-quest-comments.ts
```

Note: Run `check-db.ts` first to get your user ID for the `RYE_USER_ID` variable.

---

## Fix 55 — Commit and Push All Modified Files

**Status:** BLOCKED — Claude Code is running concurrently in this repo, holding `.git/index.lock`

**What happened:** Running `git add -A && git commit` fails with:
```
fatal: Unable to create '.git/index.lock': File exists.
Another git process seems to be running in this repository.
```

Claude Code is actively working in `regen-civics-clean` at the same time. The git index is locked while it runs.

**Fix:** Wait until Claude Code finishes its current task, then run:

```powershell
git add -A
git commit -m "feat: Implement fixes 1-55 — remove Tripetto, redirect to DB forms, fix admin role scripts"
git push origin main
```

If the lock file is stale (Claude Code crashed or finished but didn't clean up):
```powershell
Remove-Item .git\index.lock
git add -A
git commit -m "feat: Implement fixes 1-55 — remove Tripetto, redirect to DB forms, fix admin role scripts"
git push origin main
```

If push is rejected (diverged history):
```powershell
git pull origin main --rebase
git push origin main
```

---

## Fix 56 — Script Column Name Bug (`open_id` vs `openId`)

**Status:** FIXED

Both `scripts/fix-admin-role.ts` and `scripts/check-db.ts` used `open_id` (snake_case) in raw SQL queries. The actual MySQL column name is `openId` (camelCase) as defined in `drizzle/schema.ts`. This caused:
```
DB error: Unknown column 'open_id' in 'field list'
```

**Fixed in both scripts:** all SQL queries now use `openId` and `createdAt` (camelCase to match schema).

---

## Summary: Priority Order

1. **Fix 50** (admin role) — run `fix-admin-role.ts` + update Railway `OWNER_OPEN_ID` — unblocks admin visibility for all existing data
2. **Fix 55** (git push) — wait for Claude Code to finish, then commit + push all changes live
3. **Fix 54** (run import scripts) — imports CSV data into DB
4. Fix 51+52+53 already coded and waiting in the commit above

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 50a | Run `fix-admin-role.ts` | Needs Railway DB access from Windows | `$Env:TARGET_EMAIL="rieki.cordon@gmail.com"; npx tsx scripts/fix-admin-role.ts` |
| 50b | Update `OWNER_OPEN_ID` in Railway | Requires Railway dashboard login | Railway → your service → Variables |
| 50c | Sign out and back in to site | Browser session | regencivics.earth |
| 54 | Run all 5 import scripts | Needs Railway DB access from Windows | Load `.env` in PowerShell, then run scripts one by one (see Fix 54) |
| 55 | `git add -A && git commit && git push` | Git index locked while Claude Code runs — wait for it to finish | Run when Claude Code is idle |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 51+52 | Remove all Tripetto code, redirect routes | CODED |
| 53 | Verify all forms wired to DB | VERIFIED |
| 56 | Fix `open_id` → `openId` column name in scripts | FIXED |
| 50-scripts | Write `fix-admin-role.ts` and `check-db.ts` | DONE |
| Any new code fixes | Anything in the fixes doc marked CODED | Ready to deploy once you push |

### WAITING ON YOU before Claude Code can proceed

Any new fixes that require knowing your Railway `OWNER_OPEN_ID` or confirming DB state (user IDs, row counts) are blocked until you run the scripts above and share the output.

---

## Fix 57 — Session 3 Comprehensive Polish (2026-03-12)

**Status:** DONE — all changes pushed to origin/main

### What was done

**Fix 56:** `openId` column name fix in admin DB scripts (committed earlier)

**Fix 30-6a (Dead Component Cleanup):**
- Deleted 13 confirmed-dead components (never imported anywhere): ChakraScrollAnimation, EnhancedAnimations, LandscapeAnimation, MoreAnimations, OrganicAnimations, SeasonalBackground, PulsingGlow, FloatingLeaves, FlipCard, PageLoadingSpinner, CalendarBooking, SemanticEnhancements, HeroIllustration
- NOTE: 15 components were initially incorrectly flagged as dead and then restored (GoogleTranslate, LanguageSwitcher, AnimatedSection, SocialLinks, SeedOfLifeSpinner, PageBackground, PageTransition, AnimalPopulationInfographic, FoodProductionInfographic, HowItWorks, AutoplayVideo, ParallaxSection, ReadingProgress, TypewriterText, VideoPreviewCard)

**Fix 30-4g (prefers-reduced-motion):**
- Added global `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; ... } }` to index.css
- Covers all Tailwind animate-* classes and custom transitions site-wide

**Fix 30-1c (Image loading):**
- Added `loading="lazy"` to all img tags missing the attribute (AdminCampaignApproval, AdminImageStudio, AuthDialog, LazyImage default)

**Fix 30-1f (Unused dependencies):**
- Removed: three, next-themes, isomorphic-dompurify, jspdf-autotable, @hookform/resolvers, axios, tailwindcss-animate, @builder.io/vite-plugin-jsx-loc

**Fix 30-6e (.env.example):**
- Created `.env.example` documenting all 20 environment variables

**Fix 30-2c (ARIA labels):**
- Added aria-label to 5 icon-only buttons: CommandPalette close, AdminAIAssistant close, Admin keyboard shortcuts close, Admin search clear, CampaignImageGallery close

### What's still pending (needs Rye)

| Fix | What | Why blocked |
|-----|------|-------------|
| Fix 22 | Run `seed-quest-comments.ts` | Needs Railway DB access + RYE_USER_ID |
| Fix 27/54 | Run CSV import scripts | Needs Railway DB access |
| Fix 28 | Per-page OG images | Needs image uploads to CDN first |
| Fix 35 | Resend domain authentication | DNS records in domain registrar |
| Fix 37 | OG preview validation | Browser test (Facebook Debugger, Twitter Card) |
| Fix 38 | Cross-browser smoke test | Safari + Firefox browser test |
| Fix 50 | Run fix-admin-role.ts + update Railway OWNER_OPEN_ID | Needs Railway DB + dashboard access |

### All codeable fixes confirmed done

After this session, a full audit confirms Fixes 1-56 are all implemented in code:
- Quest golden glow + SharePanel + card flip (Fix 1) ✓
- Admin broadcast panel (Fix 2) ✓ 
- ProfileEditForm blockchain callout (Fix 3) ✓
- Forum tabs + DiscoverTab (Fix 4) ✓
- orgClaims.search autocomplete (Fix 5) ✓
- Multi-bioregion selection (Fix 6) ✓
- Badge system + QuestBadges (Fix 7) ✓
- ContributionCalculator hub in profile (Fix 8) ✓
- CrowdPooling explanatory header (Fix 9) ✓
- Completed quests shown at top (Fix 10) ✓
- Apply page readability (Fix 11) ✓
- PageSkeleton component (Fix 12) ✓
- Newsletter re-prompt suppression (Fix 13) ✓
- Quest card forum links (Fix 14) ✓
- Avatar URL tooltip (Fix 15) ✓
- TaoSpinner ~70 quotes (Fix 16) ✓
- AdminRoles crash fix (Fix 17) ✓
- Banner system (Fix 18) ✓
- Analytics dashboard import (Fix 19) ✓
- Admin moderation password gate (Fix 20) ✓
- AdminImageStudio copy URL (Fix 21) ✓
- LocationPicker in profile (Fix 26) ✓
- Map button "Apply" + Forum link (Fix 25) ✓
- Investor form gating (Fix 24) ✓
- orgClaims.search covers alliance orgs (Fix 5/23) ✓
- Rate limiting (Fix 32) ✓
- Security headers (Fix 33) ✓
- Sitemap + structured data (Fix 34) ✓
- Analytics event tracking (Fix 36) ✓
- Branded 404 + TaoErrorState (Fix 39) ✓
- Maintenance mode flag (Fix 40) ✓

---

## Fix 58: Seeds of Life Favicon

**Type:** Asset + build script

### Goal

Replace the current placeholder favicon with the Seeds of Life sacred geometry mark: a 7-circle geometric pattern (central circle + 6 surrounding petals) rendered as a crisp SVG, then exported to all required PNG sizes and an `.ico` bundle.

### What to Build

`[CLAUDE CODE]`

**1. Create `client/public/favicon.svg`**

Seven-circle geometry: one central circle, six petals arranged at 0/60/120/180/240/300 degrees. All circles same radius, petal centres offset by one radius. Use `fill="none"` stroke-only style in a deep forest green (`#1a3d2b`) or white depending on background. ViewBox `0 0 100 100`. Minimum 2px stroke-width for legibility at small sizes.

**2. Create `scripts/generate-favicon.ts`**

```ts
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const SVG_PATH = join(process.cwd(), 'client/public/favicon.svg');
const OUT_DIR = join(process.cwd(), 'client/public');

const svgBuffer = readFileSync(SVG_PATH);

const sizes = [16, 32, 48, 192, 512];

async function main() {
  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(OUT_DIR, `favicon-${size}.png`));
    console.log(`Generated favicon-${size}.png`);
  }

  // Generate apple-touch-icon
  await sharp(svgBuffer).resize(180, 180).png().toFile(join(OUT_DIR, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');
}

main().catch(err => { console.error(err); process.exit(1); });
```

Run: `npm install --save-dev sharp` if not already installed, then `npx tsx scripts/generate-favicon.ts`.

**3. Generate `.ico` bundle**

```bash
npx png-to-ico client/public/favicon-16.png client/public/favicon-32.png client/public/favicon-48.png > client/public/favicon.ico
```

Install if needed: `npm install --save-dev png-to-ico`

**4. Update `client/index.html`**

Replace existing favicon `<link>` tags with:

```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

### Files to Create / Modify

| File | Change |
|------|--------|
| `client/public/favicon.svg` | New -- Seeds of Life SVG |
| `scripts/generate-favicon.ts` | New -- PNG generation script |
| `client/public/favicon-16.png` | Generated |
| `client/public/favicon-32.png` | Generated |
| `client/public/favicon-48.png` | Generated |
| `client/public/favicon-192.png` | Generated |
| `client/public/favicon-512.png` | Generated |
| `client/public/apple-touch-icon.png` | Generated |
| `client/public/favicon.ico` | Generated multi-size bundle |
| `client/index.html` | Updated `<link>` tags |

### Verify

`[COWORK]` Open the site in Chrome. Check browser tab -- confirm the Seeds of Life mark appears. Check DevTools > Application > Manifest -- confirm all icon sizes registered.

### Priority

Low-medium -- brand polish. Do after core feature fixes.

---

## Fix 59: Schema Expansion -- meetingFrequency + dietaryPatterns

**Type:** Schema migration + tRPC + UI

### Goal

Add two new entity/applicant fields: `meetingFrequency` (how often a land project or alliance partner meets, enum) and `dietaryPatterns` (comma-separated or JSON array of dietary approaches practiced at the project). Update schema, tRPC router, Apply.tsx form, and GlobeMap.tsx filter/entity card.

### What to Build

`[CLAUDE CODE]`

**1. Schema (`server/drizzle/schema.ts`)**

```ts
meetingFrequency: mysqlEnum('meetingFrequency', [
  'weekly', 'biweekly', 'monthly', 'quarterly', 'as-needed'
]).default('monthly'),

dietaryPatterns: text('dietaryPatterns'), // JSON array stored as string, e.g. '["vegan","omnivore"]'
```

Add these to the `applications` or `entities` table as appropriate.

**2. Run migration**

`[HUMAN]` Rye must run `pnpm db:push` from the project root while connected to Railway DB.

**3. Update tRPC router**

Add `meetingFrequency` and `dietaryPatterns` to the input schema in `server/routers/applications.ts`. Use `z.enum([...]).optional()` and `z.string().optional()` respectively.

**4. Update Apply.tsx**

- Step 2: Add "Meeting frequency" select dropdown with the 5 enum options
- Step 3: Add "Dietary patterns at your project" multi-select or checkbox group (vegan, vegetarian, omnivore, raw, gluten-free, local-only, other)
- Wire both fields into the form submission payload

**5. Update GlobeMap.tsx**

- Entity card: display `meetingFrequency` and `dietaryPatterns` when present
- Filter panel: add "Meeting frequency" and "Dietary patterns" filter dropdowns

### Files to Modify

| File | Change |
|------|--------|
| `server/drizzle/schema.ts` | Add two new columns |
| `server/routers/applications.ts` | Add fields to input zod schema |
| `client/src/pages/Apply.tsx` | Add fields to Steps 2 + 3 |
| `client/src/pages/GlobeMap.tsx` | Entity card + filter dropdowns |

### Verify

`[CLAUDE CODE]` Run `pnpm check` -- zero TypeScript errors. `[COWORK]` Fill out Apply form; confirm new fields present and submittable. Check entity card on GlobeMap -- confirm fields display.

### Priority

Medium -- enhances project discoverability on the map.

---

## Fix 60: Investor Session Persistence via localStorage

**Type:** Frontend state persistence

### Goal

Once a user has completed and submitted the investor verification form, the platform should remember that across sessions. They should not see the investor form again on reload or return visit. The ExitIntentCapture popup should not show its email-capture prompt to verified investors on investor-related pages.

### What to Build

`[CLAUDE CODE]`

**1. `InvestorForm.tsx` -- set flag on success**

In the form submission success callback:

```ts
localStorage.setItem('investor_verified', 'true');
```

**2. `Opportunity.tsx` -- skip form for returning investors**

At component mount:

```ts
const investorVerified = localStorage.getItem('investor_verified') === 'true';
if (investorVerified) {
  // Skip form, show investor content directly or a "Welcome back" message
}
```

**3. `ExitIntentCapture.tsx` -- suppress on investor pages for verified investors**

```ts
const isInvestorPage = window.location.pathname.includes('/investor') ||
  window.location.pathname.includes('/opportunity') ||
  window.location.pathname.includes('/fund');

const investorVerified = localStorage.getItem('investor_verified') === 'true';

if (isInvestorPage && investorVerified) return null;
```

### Files to Modify

| File | Change |
|------|--------|
| `client/src/components/InvestorForm.tsx` | Set `investor_verified` on success |
| `client/src/pages/Opportunity.tsx` | Check localStorage flag on mount |
| `client/src/components/ExitIntentCapture.tsx` | Suppress on investor pages for verified users |

### Verify

`[COWORK]` Submit investor form. Reload -- form should not reappear. Navigate to `/fund` or `/opportunity` -- ExitIntent popup should not fire. Clear localStorage manually, reload -- form should appear again.

### Priority

Medium -- reduces friction for returning investors.

---

## Fix 61: Legacy CSV Backup Migration to Live DB

**Type:** Migration script (data)

### Goal

Apply the CSV backup files (users + applications tables) to the live Railway database using an idempotent import script. Uses `INSERT IGNORE` so re-runs are safe.

### What to Build

`[CLAUDE CODE]` Create `scripts/migrate-csv.ts`:

```ts
/**
 * migrate-csv.ts -- Import legacy CSV backup data into live DB.
 * Tables: users, applications
 * Usage: DATABASE_URL=<url> npx tsx scripts/migrate-csv.ts
 */
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL required'); process.exit(1); }

async function importTable(conn: mysql.Connection, csvPath: string, tableName: string) {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parse(content, { columns: true, skip_empty_lines: true });
  let inserted = 0, skipped = 0;
  for (const row of rows) {
    const cols = Object.keys(row);
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map(c => row[c] === '' ? null : row[c]);
    try {
      await conn.execute(
        `INSERT IGNORE INTO \`${tableName}\` (${cols.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`,
        values
      );
      inserted++;
    } catch (err: any) {
      console.error(`  ${tableName} row error:`, err.message);
      skipped++;
    }
  }
  console.log(`${tableName}: ${inserted} inserted, ${skipped} skipped.`);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL!);
  const dataDir = path.join(process.cwd(), 'scripts/data');

  await importTable(conn, path.join(dataDir, 'users_backup.csv'), 'users');
  await importTable(conn, path.join(dataDir, 'applications_backup.csv'), 'applications');

  await conn.end();
  console.log('Migration complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
```

Install dependency if needed: `npm install csv-parse`

`[HUMAN]` Rye must:
1. Ensure `scripts/data/users_backup.csv` and `scripts/data/applications_backup.csv` exist
2. Run: `DATABASE_URL=<railway-url> npx tsx scripts/migrate-csv.ts`

### Files to Create

| File | Change |
|------|--------|
| `scripts/migrate-csv.ts` | New -- idempotent CSV-to-DB migration |

### Verify

`[HUMAN]` Check Railway DB after running. Confirm row counts match CSV row counts.

### Priority

High -- restores historical data that has not yet been imported.

---

## Fix 62: ExitIntentCapture -- Investor-Context Rewrite

**Type:** Frontend UX

### Goal

When `ExitIntentCapture` fires on an investor-related page (fund, opportunity, investor), it should not show the default email-capture form. Instead show a targeted message that redirects to the investor onboarding path.

### What to Build

`[CLAUDE CODE]`

In `ExitIntentCapture.tsx`, detect investor context by route:

```ts
const isInvestorContext =
  window.location.pathname.startsWith('/fund') ||
  window.location.pathname.startsWith('/opportunity') ||
  window.location.pathname.startsWith('/investor');
```

When `isInvestorContext` is true, render an alternate modal content block:

**Headline:** "Before you go -- the Fund is open."

**Body:** "ReGen Civics is actively raising from aligned investors. If you are ready to put capital to work in regenerative land projects, the path starts here."

**CTA button:** "Learn About Investing" -- routes to `/investor`

**Dismiss text:** "Not right now"

Do not show this variant if `localStorage.getItem('investor_verified') === 'true'` (see Fix 60).

### Files to Modify

| File | Change |
|------|--------|
| `client/src/components/ExitIntentCapture.tsx` | Add investor-context branch with redirect CTA |

### Verify

`[COWORK]` Navigate to `/fund`, trigger exit intent, confirm investor modal appears. Click "Learn About Investing" -- routes to `/investor`. Confirm default email-capture modal still appears on non-investor pages.

### Priority

Medium -- improves investor conversion path.

---

## Fix 63: PageBackground -- Remove JS Parallax, Use CSS Fixed Attachment

**Type:** Frontend performance + visual

### Goal

The current `PageBackground.tsx` uses a `useEffect` scroll listener to create parallax. This causes layout jank on mobile and hurts Lighthouse scores. Replace with CSS `background-attachment: fixed` on desktop and `scroll` on mobile. Fix overlay opacity.

### What to Build

`[CLAUDE CODE]`

In `PageBackground.tsx`:

**Remove:**
- The `useEffect` that listens to scroll events
- Any `transform: translateY()` or inline style that changes on scroll
- The `inset: "-8% 0"` negative inset (this was compensating for the parallax offset)

**Replace with:**

```tsx
const isMobile = window.innerWidth < 768;

<div
  style={{
    position: 'fixed',
    inset: '0',
    backgroundImage: `url(${bgImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: isMobile ? 'scroll' : 'fixed',
    opacity: overlayOpacity ?? 1,
  }}
/>
```

**Overlay opacity:** Ensure the overlay `opacity` is respected at 100% (value `1`) when no explicit value is passed. Check that the `rgba()` background color on the overlay div does not double-multiply with an `opacity` prop.

**Home page exception:** The home page hero uses scroll-based parallax via a different mechanism. Confirm `PageBackground` is NOT used on the home hero section, or pass a `disableFixed` prop for that case.

### Files to Modify

| File | Change |
|------|--------|
| `client/src/components/PageBackground.tsx` | Remove scroll useEffect; apply CSS background-attachment |

### Verify

`[COWORK]` Navigate to `/community` or `/game`. Scroll slowly -- background should shift subtly on desktop (CSS parallax) and be static on mobile. No jank. Run Lighthouse -- confirm no layout shift from background.

### Priority

Medium -- performance + visual quality.

---

## Fix 64: Remove SiteTour; Update ReGen Guide to Pill Button

**Type:** Frontend UI

**Note:** This supersedes Fix 23. Fix 23 added SiteTour globally; this fix removes it. ReGen Guide replaces it as the persistent help entry point.

### Goal

Remove the SiteTour component entirely from App.tsx. Update the floating ReGen Guide button to be a pill with text on desktop and an icon-only circle on mobile.

### What to Build

`[CLAUDE CODE]`

**1. `App.tsx`**

Remove:
```ts
import SiteTour from './components/SiteTour';
// ...
<SiteTour />
```

If `SiteTour.tsx` is unused by anything else, delete it. Do not delete if uncertain about references.

**2. `ReGenGuide.tsx`**

Update the floating button:

```tsx
// Desktop (sm and up): pill button
<button className="hidden sm:flex items-center gap-2 rounded-full px-4 py-2 bg-forest-green text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all">
  <GuideIcon className="w-4 h-4" />
  <span>ReGen Guide</span>
</button>

// Mobile: icon-only circle
<button className="flex sm:hidden items-center justify-center w-12 h-12 rounded-full bg-forest-green text-white shadow-lg hover:shadow-xl transition-all">
  <GuideIcon className="w-5 h-5" />
</button>
```

Keep existing click behavior (opens guide panel/modal).

### Files to Modify

| File | Change |
|------|--------|
| `client/src/App.tsx` | Remove SiteTour import + JSX |
| `client/src/components/ReGenGuide.tsx` | Pill on desktop, icon circle on mobile |

### Verify

`[COWORK]` Load the site. Confirm no SiteTour overlay fires on first visit. On desktop, confirm floating button shows "ReGen Guide" with text. On mobile (DevTools device simulator), confirm icon-only circle.

### Priority

Medium -- cleans up tech debt, polishes UI.

---

## Fix 65: VideoPreviewCard -- Wire YouTube URL

**Type:** Frontend (content wiring)

### Goal

The `VideoPreviewCard` component and its usage in `Home.tsx` are scaffolded but have a `comingSoon` placeholder. Once Rye provides the YouTube video URL, remove the placeholder and wire in the real embed.

### What to Build

`[HUMAN]` Rye must provide the YouTube video URL for the home page preview video.

`[CLAUDE CODE]` Once URL is provided:

1. In `Home.tsx`, update the `VideoPreviewCard` usage:
   - Remove `comingSoon` prop (or set to `false`)
   - Set `videoUrl` to the provided YouTube URL
   - Update `thumbnailUrl` if a custom thumbnail is needed

2. In `VideoPreviewCard.tsx`, ensure the component handles a real URL:
   - On click/play, embed the YouTube iframe or open in lightbox
   - Remove any "Coming Soon" overlay or badge

### Files to Modify

| File | Change |
|------|--------|
| `client/src/pages/Home.tsx` | Wire real YouTube URL, remove comingSoon |
| `client/src/components/VideoPreviewCard.tsx` | Remove placeholder state once URL is live |

### Verify

`[COWORK]` Click the video preview on the home page. Confirm video plays. Confirm no "Coming Soon" text visible.

### Priority

Low -- blocked on Rye providing the YouTube URL. Do not implement until URL is confirmed.

---

## Fix 66: Hero Background Image Generation

**Type:** Asset generation (nano-banana-pro)

### Goal

Generate two composite hero background images for the home page -- desktop and mobile formats -- using the nano-banana-pro image generation skill. These replace any placeholder or stock images currently used for the home page hero.

### What to Build

`[CLAUDE CODE]` Use the `nano-banana-pro` skill to generate:

**Desktop hero** (`4096 x 8192px`, landscape-to-portrait scroll):
5-scene composite: regenerative land, bioregional community, token/governance, quest/game, and renaissance vision. Deep nature tones, cinematic, painterly. No text overlays. Render as `hero-bg-desktop.webp`.

**Mobile hero** (`1536 x 6144px`, vertical scroll):
Same 5-scene narrative but cropped/recomposed for portrait orientation. Render as `hero-bg-mobile.webp`.

Save both to: `client/public/`

**Update `Home.tsx`:**

```tsx
const isMobile = useIsMobile(); // existing hook
const bgImage = isMobile ? '/hero-bg-mobile.webp' : '/hero-bg-desktop.webp';

// In the hero section background:
backgroundImage: `url(${bgImage})`,
backgroundAttachment: 'scroll', // Home page uses scroll, not fixed (see Fix 63)
```

### Files to Create / Modify

| File | Change |
|------|--------|
| `client/public/hero-bg-desktop.webp` | New -- generated via nano-banana-pro |
| `client/public/hero-bg-mobile.webp` | New -- generated via nano-banana-pro |
| `client/src/pages/Home.tsx` | Update bgImage to use new files |

### Verify

`[COWORK]` Load the home page. Confirm hero background displays the generated imagery on both desktop and mobile.

### Priority

Medium -- significant visual impact for first impressions.

---

## Fix 67: My Submissions Tab + Entity Claiming in PlayerProfile

**Type:** Frontend + tRPC backend

### Goal

Add a "My Submissions" tab to `PlayerProfile.tsx` so players can see all forms they have submitted: investor inquiries, project applications, and calculator saves. Also add an entity claiming UI where players can search for and claim organisations or land projects in the Alliance as their own.

### What to Build

`[CLAUDE CODE]`

**1. New Submissions tab in `PlayerProfile.tsx`**

Add "My Submissions" to the tab list. In the tab render block, add `<SubmissionsTab profile={profile} />`.

Create `SubmissionsTab` (can be in the same file or `client/src/components/SubmissionsTab.tsx`):

```tsx
function SubmissionsTab({ profile }: { profile: any }) {
  return (
    <div className="space-y-6">
      <SubmissionsSection title="Investor Inquiries" endpoint="investorInquiries.mine" />
      <SubmissionsSection title="Project Applications" endpoint="applications.mine" />
      <OrgClaimsSection />
    </div>
  );
}
```

**2. `SubmissionsSection` component**

Fetches submissions from the given tRPC endpoint and renders them as `SubmissionCard` components.

**3. `SubmissionCard` component**

Shows: submission date, type, status, and a link to edit/view the saved record.

Status color helper:
```ts
function statusColor(status: string): string {
  switch (status) {
    case 'approved': return 'text-green-600';
    case 'pending': case 'new': return 'text-yellow-600';
    case 'rejected': return 'text-red-600';
    default: return 'text-gray-500';
  }
}
```

**4. tRPC endpoints**

In `server/routers/investorInquiries.ts`:

```ts
mine: protectedProcedure.query(({ ctx }) => {
  return ctx.db.select().from(generalInquiries).where(eq(generalInquiries.userId, ctx.session.user.id));
}),
```

In `server/routers/applications.ts`:

```ts
mine: protectedProcedure.query(({ ctx }) => {
  return ctx.db.select().from(applications).where(eq(applications.userId, ctx.session.user.id));
}),

search: publicProcedure.input(z.object({ id: z.number().optional() })).query(({ input, ctx }) => {
  if (!input.id) return null;
  return ctx.db.select().from(applications).where(eq(applications.id, input.id)).limit(1);
}),
```

**5. `?id=` param in Apply.tsx**

At mount, read `new URLSearchParams(window.location.search).get('id')`. If present, fetch the application via `applications.search` and pre-fill the form.

**6. `?savedId=` param in Calculator.tsx**

Same pattern -- read `savedId` from URL and pre-load a saved calculation if found.

**7. `OrgClaimsSection` -- entity claiming UI**

A section within the Submissions tab where players can claim ownership of an organisation or land project:
- Search input that queries `entities.search` (a public tRPC endpoint)
- Select from results
- Submit claim (creates an `orgClaim` record for admin review)
- Admin reviews pending claims in a new `OrgClaimsSection` in AdminDashboard

Claiming tRPC (add to `server/routers/entities.ts`):

```ts
claim: protectedProcedure.input(z.object({ entityId: z.number(), message: z.string().optional() })).mutation(async ({ input, ctx }) => {
  return ctx.db.insert(orgClaims).values({
    userId: ctx.session.user.id,
    entityId: input.entityId,
    message: input.message ?? null,
    status: 'pending',
    createdAt: new Date(),
  });
}),
```

Add `orgClaims` table to schema if it does not exist.

`[HUMAN]` Run `pnpm db:push` after schema changes.

### Files to Create / Modify

| File | Change |
|------|--------|
| `client/src/pages/PlayerProfile.tsx` | Add Submissions tab, embed SubmissionsTab |
| `client/src/components/SubmissionsTab.tsx` | New -- section + card components |
| `server/routers/investorInquiries.ts` | Add `mine` endpoint |
| `server/routers/applications.ts` | Add `mine` + `search` endpoints |
| `client/src/pages/Apply.tsx` | Read `?id=` param, pre-fill form |
| `client/src/pages/Calculator.tsx` | Read `?savedId=` param |
| `server/drizzle/schema.ts` | Add `orgClaims` table if not exists |
| `server/routers/entities.ts` | Add `claim` mutation + `search` public endpoint |

### Verify

`[CLAUDE CODE]` `pnpm check` -- zero errors. `[COWORK]` Log in, navigate to Profile > My Submissions. Confirm investor inquiries and applications render. Submit a claim for a test entity. Confirm it appears in the admin claims panel.

### Priority

Medium -- important for player empowerment and Alliance curation.

---

## Fix 68: Live Blockchain Token Balance Sync

**Type:** Backend service + tRPC + frontend

### Goal

Replace the admin-only `syncTokens` procedure with a self-service blockchain sync. Players can refresh their own token balances from the Base blockchain directly. Rate-limited to once per 5 minutes. Admins retain a force-sync bypass.

### What to Build

`[CLAUDE CODE]`

**1. Create `server/blockchain.ts`**

```ts
const BASE_RPC = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
const RGVOICE_CONTRACT = '0x4d848b3f2d74d1d2f6c75c55d0751dab8fc7d707';
const REGEN_CONTRACT = '0x4e617cd113364193d215d107add6fa50418aa2e4';
const ERC20_BALANCE_OF = '0x70a08231';
const ERC1155_BALANCE_OF = '0x00fdd58e';

function padAddress(address: string): string {
  return address.replace('0x', '').padStart(64, '0');
}

async function ethCall(contract: string, data: string): Promise<string> {
  const res = await fetch(BASE_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'eth_call', id: 1,
      params: [{ to: contract, data }, 'latest'],
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

export async function fetchTokenBalances(walletAddress: string): Promise<{ rvoice: number; rgen: number }> {
  const addr = padAddress(walletAddress);

  // RGVoice: try ERC-20 first
  let rvoiceHex = await ethCall(RGVOICE_CONTRACT, ERC20_BALANCE_OF + addr).catch(() => null);
  if (!rvoiceHex || rvoiceHex === '0x') {
    const tokenId = '1'.padStart(64, '0');
    rvoiceHex = await ethCall(RGVOICE_CONTRACT, ERC1155_BALANCE_OF + addr + tokenId).catch(() => '0x0');
  }

  const rgenHex = await ethCall(REGEN_CONTRACT, ERC20_BALANCE_OF + addr).catch(() => '0x0');

  const toNumber = (hex: string) => hex && hex !== '0x' ? Number(BigInt(hex)) / 1e18 : 0;
  return { rvoice: toNumber(rvoiceHex ?? '0x0'), rgen: toNumber(rgenHex) };
}
```

**2. Add tRPC procedures**

In the player profiles or tokens router:

```ts
syncTokenBalances: protectedProcedure.mutation(async ({ ctx }) => {
  const profile = await ctx.db.select().from(playerProfiles)
    .where(eq(playerProfiles.userId, ctx.session.user.id)).limit(1);

  if (!profile[0]?.walletAddress) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No wallet address on file' });

  const lastSync = profile[0].lastTokenSync ? new Date(profile[0].lastTokenSync).getTime() : 0;
  const fiveMinutes = 5 * 60 * 1000;
  if (Date.now() - lastSync < fiveMinutes) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Token sync rate-limited. Try again in 5 minutes.' });
  }

  const { rvoice, rgen } = await fetchTokenBalances(profile[0].walletAddress);
  await ctx.db.update(playerProfiles).set({
    rvoiceBalance: rvoice,
    rgenBalance: rgen,
    lastTokenSync: new Date(),
  }).where(eq(playerProfiles.userId, ctx.session.user.id));

  return { rvoice, rgen };
}),

adminSyncTokens: adminProcedure.input(z.object({ userId: z.number() })).mutation(async ({ input, ctx }) => {
  const profile = await ctx.db.select().from(playerProfiles)
    .where(eq(playerProfiles.userId, input.userId)).limit(1);
  if (!profile[0]?.walletAddress) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No wallet address' });
  const { rvoice, rgen } = await fetchTokenBalances(profile[0].walletAddress);
  await ctx.db.update(playerProfiles).set({ rvoiceBalance: rvoice, rgenBalance: rgen, lastTokenSync: new Date() })
    .where(eq(playerProfiles.userId, input.userId));
  return { rvoice, rgen };
}),
```

Add `lastTokenSync` datetime column to `playerProfiles` schema if not present. `[HUMAN]` Run `pnpm db:push` after schema changes.

**3. Update `PlayerProfile.tsx`**

Auto-sync on mount if balances are stale by 10+ minutes:

```ts
const { mutate: syncTokens, isLoading: syncing } = trpc.syncTokenBalances.useMutation();

useEffect(() => {
  const lastSync = profile.lastTokenSync ? new Date(profile.lastTokenSync).getTime() : 0;
  if (Date.now() - lastSync > 10 * 60 * 1000) {
    syncTokens();
  }
}, []);
```

Add "Refresh balances" button in the token display section:

```tsx
<button
  onClick={() => syncTokens()}
  disabled={syncing}
  className="flex items-center gap-1 text-sm text-forest-green"
>
  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
  {syncing ? 'Syncing...' : 'Refresh balances'}
</button>
```

### Files to Create / Modify

| File | Change |
|------|--------|
| `server/blockchain.ts` | New -- pure-fetch eth_call helper |
| `server/routers/playerProfiles.ts` | Add `syncTokenBalances` + `adminSyncTokens` |
| `server/drizzle/schema.ts` | Add `lastTokenSync` column if missing |
| `client/src/pages/PlayerProfile.tsx` | Auto-sync useEffect + Refresh button |

### Verify

`[CLAUDE CODE]` `pnpm check` -- zero errors. `[COWORK]` Navigate to player profile with a wallet address on file. Click "Refresh balances" -- spinner appears, balances update. Click again within 5 minutes -- confirm rate-limit error message appears.

### Priority

High -- core feature for the ReGen Game token economy.

---

## Fix 69: Forum Content Overhaul + Welcome Aboard Quests

**Type:** Frontend component + seed scripts + data files

### Goal

Implement the full Welcome Aboard Quests system and refresh all existing Gathering Grove forum content. 7-part implementation based on `FORUM_UPGRADES_2026-03-10.md` and `ReGenCivics_WelcomeAboard_Brief.md`.

### Key Constraints (Apply to All Parts)

- Remove ALL em-dashes from every string before writing to DB or UI. No exceptions.
- No AI-isms: no "delve into", "it's worth noting", "in conclusion", "game-changing", "let's explore"
- Q10 forum link must point to `https://regencivics.earth/community/quests` (not `/dream-quest`)

---

### Part A: Quest Card UI

`[CLAUDE CODE]`

**Create `client/src/components/QuestCard.tsx`**

Interface:

```ts
interface QuestCardProps {
  number: number;
  title: string;
  tagline: string;
  reward: string;
  forumUrl: string;
  about: string;
  steps: string[];
  bonus?: string;
  completed?: boolean;
  onToggleComplete?: () => void;
}
```

Two zones per card:

**Always visible:** Quest number badge (Q1, Q2...), title, tagline, reward badge "33 $ReGen + 0.1 RGVoice", "Go to forum post" button, completed checkmark if true.

**Collapsible (chevron toggle, closed by default):** "About this quest" label, full `about` description, numbered `steps` list, `bonus` line if present.

**Create `client/src/data/welcomeAboardQuests.ts`**

Array of 10 quest objects from `ReGenCivics_WelcomeAboard_Brief.md` Section 2.

| Quest | Forum URL |
|-------|-----------|
| Q1 | `/community/feedback` |
| Q2 | `/community/origin-story` |
| Q3 | `/community/regen-act` |
| Q4 | `/community/bioregion` |
| Q5 | `/community/make-friends` |
| Q6 | `/community/pledge-gift` |
| Q7 | `/community/foundations` |
| Q8 | `/community/refer-org` |
| Q9 | `/community/refer-land` |
| Q10 | `https://regencivics.earth/community/quests` |

---

### Part B: UX Entry Points

`[CLAUDE CODE]`

**Create `client/src/components/QuestStartPopup.tsx`**

One-time modal after a player completes their profile for the first time:
- Check `localStorage.getItem('hasSeenQuestPrompt')` -- if `'true'`, return null
- On dismiss: `localStorage.setItem('hasSeenQuestPrompt', 'true')`
- "View Quests" button routes to `/profile?tab=quests`

**Profile area link:** Add a persistent "Personal Quests" link to the profile page header or sidebar.

**Nav menu entry:** Add "Personal Quests" as an authenticated-user-only nav item routing to `/profile?tab=quests`.

---

### Part C: Series Header in Quests Tab

`[CLAUDE CODE]`

At the top of the Quests tab, above the quest cards:

```tsx
<div className="mb-6 p-4 rounded-lg bg-forest-green/5 border border-forest-green/20">
  <h2 className="text-lg font-semibold text-forest-green">Welcome Aboard Quests</h2>
  <p className="text-sm text-gray-600 mt-1">Ten ways to root yourself in the Regenerative Renaissance.</p>
  <p className="text-sm text-gray-500 mt-2">
    Complete all 10 to earn 330 $ReGen + 1 RGVoice total.
    Each quest is worth 33 $ReGen + 0.1 RGVoice.
    You can claim after completing all 10.
  </p>
</div>
```

---

### Part D: Forum Post Rewrites (8 Existing Posts)

`[CLAUDE CODE]`

**Create `scripts/data/forum-posts.ts`** -- exported array of `{ slug: string; title: string; body: string }[]`

The 8 rewritten post bodies are in the Community Forum Content document (Gathering Grove rewrites section). No em-dashes, no AI-isms.

**Create `scripts/seed-forum-posts.ts`** -- updates the 8 existing Gathering Grove forum post bodies in DB. Must support `--dry-run`.

---

### Part E: Pre-Population Thread Stubs (40 Threads)

`[CLAUDE CODE]`

**Create `scripts/data/forum-threads.ts`** -- exported array of `{ topicSlug: string; title: string; body: string; authorNote?: string }[]`

40 thread stubs across 9 topic areas from the Community Forum Content document. Same constraints.

**Create `scripts/seed-forum-threads.ts`** -- inserts 40 stubs. Must support `--dry-run`.

---

### Part F: Quest Forum Posts + Seed Comments (10 Posts)

`[CLAUDE CODE]`

**Create `scripts/seed-quest-forum-posts.ts`**

1. Creates 10 dedicated forum posts (one per quest) at the URLs defined in Part A
2. Adds 3 seed comments per post from `ReGenCivics_WelcomeAboard_Brief.md` Section 3
3. Seed comments marked as EXAMPLE; posted from admin/moderator account
4. Quest 10 completion CTA links to `https://regencivics.earth/community/quests`

Must support `--dry-run`.

---

### Part G: Em-Dash Audit

`[CLAUDE CODE]`

After all content is written, run:

```bash
grep -r " -- \|--\|—" client/src/ server/ scripts/data/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".git"
```

Any match is a bug. Fix before committing.

---

### Part H: PlayerProfile -- URL Param Tab Handling

`[CLAUDE CODE]`

In `PlayerProfile.tsx`, add URL param reading so `?tab=quests` loads the Quests tab directly:

```ts
const searchParams = new URLSearchParams(window.location.search);
const tabParam = searchParams.get('tab') as ProfileTab | null;
const validTabs: ProfileTab[] = ['overview', 'quests', 'contributions', 'settings', 'submissions'];
const [activeTab, setActiveTab] = useState<ProfileTab>(
  tabParam && validTabs.includes(tabParam) ? tabParam : 'overview'
);
```

Also sync URL on tab click:

```ts
onClick={() => {
  setActiveTab(tab.id);
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab.id);
  window.history.replaceState({}, '', url.toString());
}}
```

---

### Files to Create / Modify

| Action | File | Description |
|--------|------|-------------|
| CREATE | `client/src/components/QuestCard.tsx` | Collapsible quest card |
| CREATE | `client/src/data/welcomeAboardQuests.ts` | 10 quest data objects |
| MODIFY | `client/src/pages/PlayerProfile.tsx` | URL param tab; series header; quest list; QuestStartPopup; Personal Quests link |
| CREATE | `client/src/components/QuestStartPopup.tsx` | One-time popup after profile setup |
| MODIFY | `client/src/components/Nav.tsx` | "Personal Quests" nav item (authenticated) |
| CREATE | `scripts/seed-forum-posts.ts` | Updates 8 existing post bodies |
| CREATE | `scripts/data/forum-posts.ts` | Post body data |
| CREATE | `scripts/seed-forum-threads.ts` | Inserts 40 thread stubs |
| CREATE | `scripts/data/forum-threads.ts` | Thread stub data |
| CREATE | `scripts/seed-quest-forum-posts.ts` | 10 quest forum posts + seed comments |

### Verify

`[CLAUDE CODE]` `pnpm check` -- zero TypeScript errors. Em-dash grep returns zero matches.

`[COWORK]`:
1. Navigate to `/profile?tab=quests` -- Quests tab loads directly
2. Quest cards render, expand/collapse on click
3. Q1-Q9 forum buttons open correct relative URLs; Q10 opens `https://regencivics.earth/community/quests`
4. `QuestStartPopup` appears on first profile completion, not again on reload
5. "Personal Quests" appears in nav (authenticated) and in profile header
6. Run `npx tsx scripts/seed-forum-posts.ts --dry-run` -- prints 8 posts, no error
7. Run `npx tsx scripts/seed-forum-threads.ts --dry-run` -- prints 40 threads, no error
8. Run `npx tsx scripts/seed-quest-forum-posts.ts --dry-run` -- prints 10 quest posts, no error

`[HUMAN]` After dry-run confirms output, run each seed script against the live DB:
```
DATABASE_URL=<railway-url> npx tsx scripts/seed-forum-posts.ts
DATABASE_URL=<railway-url> npx tsx scripts/seed-forum-threads.ts
DATABASE_URL=<railway-url> npx tsx scripts/seed-quest-forum-posts.ts
```

### Priority

High -- core player onboarding experience and forum activation.

---

## Fix 70: Handoff Breakdown -- Fixes 58-69

**Type:** Meta / planning

### Handoff Table -- Fix 58-69

| Fix | Description | Who | COWORK Validation | HUMAN Step |
|-----|-------------|-----|-------------------|------------|
| Fix 58 | Seeds of Life SVG favicon; PNG sizes + .ico via `generate-favicon.ts` | Claude Code | Check browser tab for Seeds of Life mark; DevTools Manifest | -- |
| Fix 59 | Add `meetingFrequency` + `dietaryPatterns` to schema; update tRPC + Apply.tsx + GlobeMap | Claude Code | Apply form shows new fields; entity card displays them | Run `pnpm db:push` |
| Fix 60 | Set `investor_verified` localStorage on form submit; suppress re-display across pages | Claude Code | Submit investor form, reload, confirm no re-prompt on investor pages | -- |
| Fix 61 | Create `scripts/migrate-csv.ts`; idempotent CSV-to-DB migration | Claude Code | -- | Place CSVs in `scripts/data/`; run migration with Railway `DATABASE_URL` |
| Fix 62 | ExitIntentCapture investor-context rewrite: redirect CTA instead of email form | Claude Code | Trigger exit intent on `/fund`; confirm investor redirect modal | -- |
| Fix 63 | PageBackground: remove JS scroll listener; use `background-attachment: fixed` on desktop | Claude Code | Scroll on `/community`; no jank; CSS parallax on desktop | -- |
| Fix 64 | Remove SiteTour from App.tsx; update ReGen Guide to pill+text on desktop, icon on mobile | Claude Code | No tour fires; pill button on desktop; circle on mobile | -- |
| Fix 65 | Wire YouTube URL into VideoPreviewCard on Home.tsx; remove `comingSoon` | Claude Code (after URL provided) | Click video on home page; confirm it plays | Provide YouTube URL |
| Fix 66 | Generate hero background images via nano-banana-pro (desktop + mobile); update Home.tsx | Claude Code (Cowork) | Load home page; confirm hero imagery on desktop and mobile | -- |
| Fix 67 | My Submissions tab in PlayerProfile; SubmissionsTab; OrgClaimsSection; new tRPC endpoints | Claude Code | Profile > My Submissions shows inquiries + applications; claim flow works | Run `pnpm db:push` if `orgClaims` table added |
| Fix 68 | Create `server/blockchain.ts`; self-service `syncTokenBalances` (5-min rate-limit); auto-sync + Refresh button | Claude Code | Refresh balances button syncs; rate-limit fires on repeat click | Run `pnpm db:push` if `lastTokenSync` column added |
| Fix 69 | Forum content overhaul + Welcome Aboard Quests (Parts A-H): QuestCard, seed scripts, QuestStartPopup, URL tab params | Claude Code | Quest cards render; popup fires once; seed scripts pass dry-run; Q10 URL correct | Run 3 seed scripts against live DB; `pnpm db:push` if schema changes |

`[COWORK]` After Claude Code signals completion on any fix above: run the COWORK validation step in a browser. If validation fails, report back to Claude Code with a screenshot.

`[HUMAN]` Steps requiring Rye:
1. **Fix 59:** `pnpm db:push` after schema changes
2. **Fix 61:** Copy CSV backups to `scripts/data/`; run migration script with Railway `DATABASE_URL`
3. **Fix 65:** Provide YouTube video URL before Claude Code can implement
4. **Fix 67:** `pnpm db:push` if `orgClaims` table is new
5. **Fix 68:** `pnpm db:push` if `lastTokenSync` column is new
6. **Fix 69:** Run 3 seed scripts against live DB after dry-run confirms output

### Priority

Meta -- no code changes. Required for Cowork + Claude Code handoff protocol.

---

## Fix 58-70 Audit Results -- 2026-03-12

Audited against the live codebase. Summary of what is done vs. still pending:

| Fix | Title | Status | Evidence |
|-----|-------|--------|----------|
| Fix 58 | Seeds of Life SVG favicon | DONE | `client/public/favicon.svg` is a full Seed of Life SVG with 7 interlocking circles |
| Fix 59 | Schema expansion (meetingFrequency, dietaryPatterns) | DONE | `drizzle/0039_meeting_frequency_dietary_patterns.sql` exists and applies both columns |
| Fix 60 | Investor localStorage suppression | DONE | InvestorForm.tsx sets `investor_verified` in localStorage; ExitIntentCapture reads it |
| Fix 61 | CSV migration script | DONE | `scripts/migrate-csv.ts` exists with idempotent upsert logic |
| Fix 62 | ExitIntentCapture investor-context rewrite | DONE | Investor context awareness and redirect CTA implemented |
| Fix 63 | PageBackground CSS fixed attachment | DONE | Uses `backgroundAttachment` CSS property; no JS scroll listener present |
| Fix 64 | Remove SiteTour | **NOT DONE** | `{!adminMode && <SiteTour />}` still present in App.tsx line 254. Carried forward as Fix 82. |
| Fix 65 | VideoPreviewCard YouTube URL | **BLOCKED** | Needs YouTube URL from Rye before Claude Code can implement |
| Fix 66 | Hero background images | LIKELY DONE | Hero opacity comments in codebase suggest images are in place; verify visually |
| Fix 67 | My Submissions tab in PlayerProfile | DONE | Full `SubmissionsTab` component at line 1932 of PlayerProfile.tsx |
| Fix 68 | Blockchain token sync | DONE | `server/blockchain.ts` fully implemented with rate-limiting and Refresh button |
| Fix 69 | Forum Welcome Aboard Quests | SCRIPTS READY | Seed scripts exist; component exists; HUMAN must run seeds against live DB |
| Fix 70 | Handoff Breakdown for Fix 58-69 | DONE | Table present in this document |

**Fixes still requiring action:** Fix 64 (carried to Fix 82), Fix 65 (blocked on YouTube URL), Fix 69 (human DB step pending).

---

## Fix 71: Bioregion Selection Improvement (Medium)

**Status:** CODED

**Symptom:** Apply form and land project forms ask users to type/search from 800+ bioregion names in a plain text combobox. Most users don't know their bioregion name. Selection is confusing and leads to low-quality data.

**Root cause:** `BioregionMultiSelect.tsx` and `BioregionSelect.tsx` implement a searchable combobox pulling from `trpc.bioregions.list`, which returns all ~800 entries at once. There is no map-based selection or location-aware suggestion.

**Fix:** Leverage the existing `trpc.bioregions.suggest` mutation (which already performs AI-powered name matching) to add an "Auto-detect from location" flow. When user clicks "Detect my bioregion", fire the browser Geolocation API to get lat/lng, then call the suggest mutation with their coordinates as context. Show the 3-5 top suggestions as chip selectors. Fall back to manual search if geolocation denied.

**Implementation details:**

1. In `BioregionMultiSelect.tsx` and `BioregionSelect.tsx`, add a "Detect location" button next to the search input:
```tsx
<Button variant="ghost" size="sm" onClick={handleDetectLocation}>
  <MapPin className="w-3.5 h-3.5 mr-1" /> Detect my bioregion
</Button>
```

2. On click, call `navigator.geolocation.getCurrentPosition()` and pass coords to `trpc.bioregions.suggest.mutate({ query: `lat:${lat} lng:${lng}` })`.

3. Show results as suggestion chips above the search box. User clicks a chip to select.

4. If geolocation is denied or fails, show a "Search by city or region" fallback.

**Files to change:**
- `client/src/components/BioregionMultiSelect.tsx`
- `client/src/components/BioregionSelect.tsx`

**No schema changes needed.** The suggest mutation already exists on the server.

**Priority:** Medium -- nice-to-have for data quality before go-live.

---

## Fix 72: Newsletter Re-prompt Suppression -- Inline Widgets (High)

**Status:** CODED

**Symptom:** Users who have already subscribed to the newsletter via the exit-intent modal are still shown inline newsletter signup widgets on the Community and CommunityCategory pages every visit.

**Root cause:** `client/src/utils/newsletter.ts` exports `isNewsletterSubscribed()` and `markNewsletterSubscribed()` which read/write a `newsletter_subscribed` localStorage key. `ExitIntentCapture` correctly checks this before showing the modal. However, `NewsletterSignupInline` components on `Community.tsx` (line 416) and `CommunityCategory.tsx` (line 336) render unconditionally -- they never check this state.

**Fix:**

In `Community.tsx` and `CommunityCategory.tsx`, wrap the `NewsletterSignupInline` render with a state check:

```tsx
import { isNewsletterSubscribed } from "@/utils/newsletter";

// In component body (before return):
const [alreadySubscribed] = useState(() => isNewsletterSubscribed());

// In JSX -- replace unconditional render with:
{!alreadySubscribed && <NewsletterSignupInline />}
```

Also verify: when a user subscribes via `NewsletterSignupInline`, `markNewsletterSubscribed()` is called. If not, add it to the `onSuccess` callback of the inline component.

**Files to change:**
- `client/src/pages/Community.tsx` (line ~416)
- `client/src/pages/CommunityCategory.tsx` (line ~336)
- `client/src/components/NewsletterSignupInline.tsx` -- confirm `markNewsletterSubscribed()` is called on success; add if missing

**Priority:** High -- shows poor UX for returning subscribers.

---

## Fix 73: TaoSpinner -- Fix Quote Attribution (Quick Win)

**Status:** CODED

**Symptom:** The loading spinner shows rotating quotes from Rumi, Robin Wall Kimmerer, Thich Nhat Hanh, Joanna Macy, African proverbs, Hopi wisdom, and others -- but all are attributed "Tao Te Ching". This is factually wrong.

**Root cause:** `TaoSpinner.tsx` line 143 has a hardcoded label:
```tsx
<p className={`text-[#7dd87d]/50 text-xs mt-2 ...`}>
  Tao Te Ching
</p>
```
The quotes array (lines 9-88) contains quotes from 7+ traditions, but the `chapter` field is only non-zero for actual Tao Te Ching entries. All others have `chapter: 0`.

**Fix:**

Replace the hardcoded "Tao Te Ching" label with "Wise Sage" -- a label that feels intentional, poetic, and is accurate for all sources:

```tsx
// Line 143 in TaoSpinner.tsx -- change:
Tao Te Ching
// To:
Wise Sage
```

That's the only change needed. The attribution feels intentionally universal rather than accidentally wrong.

**Files to change:**
- `client/src/components/TaoSpinner.tsx` -- one line (line 143)

**Priority:** Quick win -- one line, zero risk, factually important.

---

## Fix 74: Confirm Single Public Chatbot (No Action Needed)

**Status:** VERIFIED

**Finding:** There are two separate AI chat components in the codebase:
- `ReGenGuide.tsx` -- public-facing chatbot, `fixed bottom-4 left-4 z-[9999]`, labeled "Your ReGen Guide". Renders globally via App.tsx with `{!adminMode && <Suspense fallback={null}><ReGenGuide /></Suspense>}`.
- `AdminAIAssistant.tsx` -- admin-only chatbot, `fixed bottom-6 right-6 z-50`, renders only within the admin panel itself.

These are intentionally separate: one serves public users, one serves admins. No merge is needed. The positioning conflict between AdminAIAssistant and ScrollToTop is handled in Fix 77.

**No code changes required.**

---

## Fix 75: Team Page -- Remove Video Section + Add Placeholder Image (Medium)

**Status:** CODED

**Symptom:** The Team page contains a section that says "Want to see one real human? Check out the quick explainer from our Catalyst." with a link to a video that does not exist or is not ready. This looks unfinished to visitors.

**Fix (Part A -- Remove section):**

Locate and remove the "Want to see one real human?" text and its associated link/button from `client/src/pages/Team.tsx`. Search for the string "Want to see one real human" to find the exact JSX block and delete it.

**Fix (Part B -- Add placeholder image):**

Generate a placeholder image using the nano-banana-pro skill and place it at the top of the Team page with a "Team Introduction Video Coming Soon" overlay banner.

Image prompt for generation:
> "A diverse group of joyful people of different ages and backgrounds gathered around the massive, ancient roots of an enormous glowing tree in a lush forest clearing. Golden hour light filters through the canopy. Community, earth connection, regeneration. Painterly, warm, epic. No text."

Save generated image to: `client/public/images/team-intro-placeholder.jpg`

Then in `Team.tsx`, add near the top of the page content (after hero, before team grid):

```tsx
<div className="relative w-full max-w-3xl mx-auto rounded-2xl overflow-hidden mb-12">
  <img
    src="/images/team-intro-placeholder.jpg"
    alt="Team introduction video coming soon"
    className="w-full object-cover h-64 md:h-80"
    loading="lazy"
  />
  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
    <div className="text-center">
      <p className="text-white font-bold text-xl md:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
        Team Introduction Video Coming Soon
      </p>
    </div>
  </div>
</div>
```

**Files to change:**
- `client/src/pages/Team.tsx` -- remove "Want to see one real human?" block; add placeholder image section
- `client/public/images/team-intro-placeholder.jpg` -- generate via nano-banana-pro

**`[COWORK]` step:** Run nano-banana-pro skill to generate the team placeholder image, then save it to `client/public/images/`.

**Priority:** Medium -- affects first impression on a high-visibility page.

---

## Fix 76: Database Over-population -- 228 Applications (Critical)

**Status:** HUMAN STEP REQUIRED

**Symptom:** The admin panel shows 228 land project applications. There should only be 2 real applications: "Living University Network" and "Aquarella". The 226 extra entries are from test data, seed scripts, or form spam.

**Root cause:** `server/db.ts` `getAllApplications()` (around line 158) selects all rows from the `applications` table with no filtering:
```ts
return await db.select().from(applications).orderBy(desc(applications.createdAt));
```
The underlying data is the actual problem -- the table has 226 rows that should not be there.

**Fix (Part A -- Write diagnostic script):**

Claude Code should create `scripts/diagnose-applications.ts`:

```ts
import { db } from "../server/db";
import { applications } from "../server/schema";
import { sql } from "drizzle-orm";

async function main() {
  const all = await db.select({
    id: applications.id,
    projectName: applications.projectName,
    createdAt: applications.createdAt,
    email: applications.email,
  }).from(applications).orderBy(applications.createdAt);

  console.log(`Total applications: ${all.length}`);
  console.log("\nFirst 20:");
  all.slice(0, 20).forEach(a => console.log(`  [${a.id}] ${a.projectName} -- ${a.email} -- ${a.createdAt}`));
  console.log("\nLast 20:");
  all.slice(-20).forEach(a => console.log(`  [${a.id}] ${a.projectName} -- ${a.email} -- ${a.createdAt}`));
}

main().catch(console.error).finally(() => process.exit());
```

**Fix (Part B -- Write cleanup script):**

Claude Code should also create `scripts/cleanup-test-applications.ts`:

```ts
// DRY RUN by default. Set DRY_RUN=false to actually delete.
import { db } from "../server/db";
import { applications } from "../server/schema";
import { not, inArray } from "drizzle-orm";

// IDs of applications to KEEP -- update after running diagnose script
const KEEP_IDS = [/* paste real IDs here after running diagnose */];
const DRY_RUN = process.env.DRY_RUN !== "false";

async function main() {
  if (KEEP_IDS.length === 0) {
    console.error("ERROR: Set KEEP_IDS before running. Run diagnose-applications.ts first.");
    process.exit(1);
  }

  const toDelete = await db.select({ id: applications.id, projectName: applications.projectName })
    .from(applications)
    .where(not(inArray(applications.id, KEEP_IDS)));

  console.log(`Would delete ${toDelete.length} applications:`);
  toDelete.forEach(a => console.log(`  [${a.id}] ${a.projectName}`));

  if (DRY_RUN) {
    console.log("\nDRY RUN -- no changes made. Set DRY_RUN=false to delete.");
    return;
  }

  await db.delete(applications).where(not(inArray(applications.id, KEEP_IDS)));
  console.log(`Deleted ${toDelete.length} applications.`);
}

main().catch(console.error).finally(() => process.exit());
```

**Files to create:**
- `scripts/diagnose-applications.ts`
- `scripts/cleanup-test-applications.ts`

**`[HUMAN]` steps:**

```powershell
# Step 1: Load .env
$env = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $env) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }

# Step 2: Run diagnostic
npx tsx scripts/diagnose-applications.ts

# Step 3: Identify real application IDs from output, paste into KEEP_IDS in cleanup script

# Step 4: Dry run cleanup
npx tsx scripts/cleanup-test-applications.ts

# Step 5: When output looks right, actually delete
$env:DRY_RUN="false"; npx tsx scripts/cleanup-test-applications.ts
```

**Priority:** Critical -- admin panel is unusable and data is misleading. Affects investor demos and incubator reviews.

---

## Fix 77: Admin AI Assistant Covered by Back-to-Top Button (High)

**Status:** CODED

**Symptom:** In `/admin`, the AI assistant button (bottom-right) is hidden behind the back-to-top scroll button. Clicking the bottom-right corner hits the scroll button, not the AI assistant.

**Root cause:**
- `AdminAIAssistant.tsx` toggle button: `fixed bottom-6 right-6 z-50`
- `ScrollToTop.tsx` button: `fixed bottom-6 right-6 z-[90]`
- `ScrollToTop` has no `!adminMode` guard in App.tsx, so it renders in admin mode
- `z-[90]` > `z-50`, so ScrollToTop wins the click

**Fix:**

In `client/src/App.tsx`, change the `<ScrollToTop />` line (currently unguarded) to only render outside admin:

```tsx
// Before (line ~249):
<ScrollToTop />

// After:
{!adminMode && <ScrollToTop />}
```

This is the minimal change. AdminAIAssistant remains at bottom-right and becomes fully clickable in admin.

**Files to change:**
- `client/src/App.tsx` -- add `!adminMode` guard to `<ScrollToTop />`

**Priority:** High -- breaks admin workflow.

---

## Fix 78: AdminModeration Page Broken After Password Entry -- React Hooks Violation (Critical)

**Status:** CODED

**Symptom:** Navigating to `/admin/moderation`, entering the correct password ("222"), and confirming results in a broken page. React throws: "Rendered more hooks than during the previous render."

**Root cause:** `AdminModeration.tsx` calls `trpc.moderation.reports.useQuery()`, `moderators.useQuery()`, and `bannedUsers.useQuery()` -- plus several `useMutation` hooks -- AFTER conditional return statements that use component state:

```tsx
// HOOKS VIOLATION -- simplified structure:
function AdminModeration() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { user } = useAuth();

  // ... other hooks ...

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;  // early return
  }
  if (!userAuthenticated || user?.role !== 'admin') {
    return <div>Access Denied</div>;  // another early return
  }

  // THESE HOOKS ARE AFTER CONDITIONAL RETURNS -- INVALID:
  const reportsQuery = trpc.moderation.reports.useQuery({ status: reportFilter });
  const moderatorsQuery = trpc.moderation.moderators.useQuery();
  const bannedUsersQuery = trpc.moderation.bannedUsers.useQuery();
  // ... more mutations below ...
}
```

When `isAuthenticated` changes from `false` to `true`, React now renders more hooks than before, crashing the component.

**Fix:**

Move ALL `useQuery` and `useMutation` calls to the TOP of the component (before any conditional returns). Use the `enabled` option to prevent actual API calls when not authorized:

```tsx
function AdminModeration() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { user, isAuthenticated: userAuthenticated } = useAuth();
  const isAuthorized = isAuthenticated && userAuthenticated && user?.role === 'admin';

  // ALL hooks at the top -- always called, just disabled when not authorized:
  const reportsQuery = trpc.moderation.reports.useQuery(
    { status: reportFilter },
    { enabled: isAuthorized }
  );
  const moderatorsQuery = trpc.moderation.moderators.useQuery(
    undefined,
    { enabled: isAuthorized }
  );
  const bannedUsersQuery = trpc.moderation.bannedUsers.useQuery(
    undefined,
    { enabled: isAuthorized }
  );
  const banMutation = trpc.moderation.banUser.useMutation();
  const unbanMutation = trpc.moderation.unbanUser.useMutation();
  const resolveReportMutation = trpc.moderation.resolveReport.useMutation();
  // ... all other mutations ...

  // Conditional returns AFTER all hooks:
  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }
  if (!userAuthenticated || user?.role !== 'admin') {
    return <AccessDenied />;
  }

  // Normal render
  return ( ... );
}
```

Also fix the `reportFilter` state: it's referenced in the `useQuery` call but may be initialized after the early return. Move it to the top with other state declarations.

**Files to change:**
- `client/src/pages/AdminModeration.tsx` -- restructure hooks to top of component with `enabled` flags

**Priority:** Critical -- entire page is broken and unusable.

---

## Fix 79: Land Page -- "Join Open Session" to "Join Next Session" (Quick Win)

**Status:** CODED

**Symptom:** Two buttons on the Land page read "Join Open Session." The correct label is "Join Next Session."

**Root cause:** Text in `client/src/pages/Land.tsx` at two locations (approximately lines 273 and 1059).

**Fix:**

Search `Land.tsx` for all instances of `Join Open Session` and replace with `Join Next Session`. Both should link to `/schedule` (verify they already do).

```tsx
// Find:
Join Open Session

// Replace with:
Join Next Session
```

**Files to change:**
- `client/src/pages/Land.tsx` -- 2 occurrences of button text

**Priority:** Quick win -- two string replacements, zero risk.

---

## Fix 80: Forum Auth Gate -- Replace Hard Redirect with Inline Prompt (Medium)

**Status:** CODED

**Symptom:** When an unauthenticated user visits a community category page (e.g., `/community/c/land-projects`), they are silently redirected to `/community` via `window.location.href`. They never see what the forum category contains. This is a dead end for curious visitors.

**Root cause:** `CommunityCategory.tsx` lines 118-121:
```tsx
if (!isAuthenticated) {
  window.location.href = '/community';
  return null;
}
```

Hard redirect loses context, breaks back button, and gives zero explanation.

**Fix:**

Replace the hard redirect with a soft gate that shows category content (or a teaser) plus an inline join/login prompt:

```tsx
if (!isAuthenticated) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
          Join to participate in this forum
        </h2>
        <p className="text-white/60 text-sm">
          Create a free account to read and reply to forum discussions, share your land project, and connect with the ReGen Civics community.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={() => {
              sessionStorage.setItem("returnTo", window.location.pathname);
              window.location.href = '/connect';
            }}
            className="bg-[#7dd87d] text-[#1a472a] font-bold hover:bg-[#7dd87d]/90"
          >
            Create Account
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/community'}
            className="border-[#7dd87d]/40 text-[#7dd87d]"
          >
            Back to Community
          </Button>
        </div>
      </div>
    </div>
  );
}
```

Note: the `returnTo` sessionStorage pattern is already wired in `ReturnToHandler` in App.tsx, so after login the user will be returned to the forum category they were trying to visit.

**Files to change:**
- `client/src/pages/CommunityCategory.tsx` -- replace hard redirect block (lines ~118-121) with inline prompt

**Priority:** Medium -- directly affects discovery and conversion for new visitors.

---

## Fix 81: Custom Games Page -- Remove "Soon" Tag, Expand Features (High)

**Status:** CODED

**Symptom (a):** The Custom Games page has a "Coming Soon" badge in the hero and the nav item shows a "Soon" tag. Per Rye: this page should be live and the "Soon" indicators removed.

**Symptom (b):** The current page has only 3 brief feature cards. The page needs a richer description of what the product actually is -- specifically a popup card or expanded section covering 4 points.

**Fix (Part A -- Remove "Soon" badge from CustomGames page):**

In `client/src/pages/CustomGames.tsx`, remove or comment out the `<Badge>` block in the hero section that contains "Coming Soon":
```tsx
// Remove this block:
<Badge className="mb-6 bg-[#7dd87d]/20 text-[#7dd87d] border border-[#7dd87d]/40 text-sm px-4 py-1">
  <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" />
  Coming Soon
</Badge>
```

**Fix (Part B -- Remove "Soon" badge from nav):**

In `client/src/components/Navigation.tsx`, find the "Custom Land Games" nav item and remove the "Soon" span:
```tsx
// Find and remove this span near the "Custom Land Games" nav entry:
<span className="ml-auto text-[9px] bg-[#d4a574]/30 text-[#d4a574] px-1.5 py-0.5 rounded-full">Soon</span>
```

**Fix (Part C -- Expand feature section with 4-point popup card):**

Replace the current 3-card grid with a 4-card grid covering these points (from Rye's notes):

1. **Foundations for Building with Others** -- shared values, rituals, and culture infrastructure so your community has a living foundation, not just a website.
2. **Clear Agreements, Roles, and Decision-Making** -- custom governance flows for your project: who decides what, how disputes are resolved, how new members join.
3. **Custom Website per Community Persona** -- residents, investors, business owners, and core team each get their own entry path, onboarding journey, and dashboard view.
4. **Quest System per Persona** -- role-specific quests that guide each person from arrival through deep contribution, so you stop doing manual onboarding one person at a time.

Add a "Learn more" button on each card that opens a modal or expands inline with a more detailed description. A simple `useState` per card showing/hiding expanded content is sufficient.

Also add a brief note below the pricing block:
> "We take on 3-5 projects per season. Outreach-to-kickoff typically takes 5 business days."

**Files to change:**
- `client/src/pages/CustomGames.tsx` -- remove "Coming Soon" badge; replace 3-card grid with 4-card grid with expand/collapse
- `client/src/components/Navigation.tsx` -- remove "Soon" span from "Custom Land Games" nav item

**Priority:** High -- page is ready to be live; "Soon" label discourages the exact leads Rye wants.

---

## Fix 82: Remove SiteTour from App.tsx (Quick Win)

**Status:** CODED

**Symptom:** A site tour fires (or attempts to fire) for new users. The tour appears incomplete and adds no value; it shows empty steps or disrupts the initial experience.

**Root cause:** `App.tsx` line 254:
```tsx
{!adminMode && <SiteTour />}
```
`SiteTour` is still being rendered globally. This was marked for removal in Fix 64 but was not done.

**Fix:**

Remove line 254 from App.tsx entirely:
```tsx
// Delete this line:
{!adminMode && <SiteTour />}
```

Also remove the `SiteTour` import at the top of App.tsx.

If `SiteTour.tsx` is not used anywhere else, it can be deleted entirely or kept as dead code (leave deletion to a cleanup pass later).

**Files to change:**
- `client/src/App.tsx` -- remove SiteTour render line and import

**Priority:** Quick win -- one-line removal, fixes a live bug.

---

## Fix 83: NavigationBar Mobile Tap Targets and Overflow (Medium)

**Status:** CODED

**Symptom:** On mobile, some navigation items or buttons in the nav may be too small to tap reliably, or the nav overflows its container on small screens.

**Root cause:** Navigation.tsx is complex (multi-level dropdowns, badges, icons). Mobile tap targets below 44x44px fail WCAG guidelines and frustrate users. Badge spans and icon-only buttons are likely culprits.

**Fix:**

In `Navigation.tsx`, audit all `<button>` and `<a>` elements that appear on mobile:
- Ensure each has a minimum height of `h-11` (44px) or `min-h-[44px]`
- Icon-only buttons need `aria-label` attributes
- Dropdown panels need `overflow-hidden` or `overflow-y-auto` with `max-h` constraints on mobile

Also check that the mobile menu drawer does not overflow the viewport width. Any flex items with long text labels should use `truncate` or `flex-shrink`.

**Files to change:**
- `client/src/components/Navigation.tsx`

**Priority:** Medium -- directly affects mobile UX which is likely the majority of traffic.

---

## Fix 84: OG Image / Social Sharing Meta Tags (Medium)

**Status:** CODED

**Symptom:** When someone shares regencivics.earth on Twitter, LinkedIn, or iMessage, the link preview shows either no image, a broken image, or a generic thumbnail. This undermines credibility with new audiences.

**Root cause:** The `SEO.tsx` component may not be setting `og:image` with an actual hosted image URL, or the home page may not be passing a valid image URL to the SEO component.

**Fix:**

1. Check `client/src/components/SEO.tsx` -- ensure it renders:
```html
<meta property="og:image" content="..." />
<meta name="twitter:image" content="..." />
<meta name="twitter:card" content="summary_large_image" />
```

2. Generate a canonical OG image (1200x630px) using nano-banana-pro:
> "Aerial view of a lush green landscape with regenerative farms, community gardens, and glowing network connections between land projects. Text overlay: regencivics.earth. Dark green and gold palette. Epic and hopeful."

3. Save to `client/public/images/og-default.jpg`

4. In `Home.tsx`, pass the image to SEO:
```tsx
<SEO
  title="ReGen Civics -- The Regenerative Renaissance Fund and Game"
  description="..."
  image="/images/og-default.jpg"
/>
```

5. Verify SEO component uses `image` prop to set `og:image` and `twitter:image`.

**Files to change:**
- `client/src/components/SEO.tsx` -- verify og:image, twitter:card meta tags are rendered
- `client/src/pages/Home.tsx` -- pass image prop to SEO
- `client/public/images/og-default.jpg` -- generate via nano-banana-pro

**Priority:** Medium -- affects every social share and link preview across the internet.

---

## Fix 85: Lazy Loading for Non-Critical Images (Performance)

**Status:** CODED

**Symptom:** Pages with large images (Team page, Land page, Blog) take longer to become interactive because images below the fold are downloaded immediately.

**Root cause:** `<img>` tags across the codebase likely omit `loading="lazy"` on images that are not in the initial viewport.

**Fix:**

Audit all `<img>` tags in:
- `client/src/pages/Team.tsx`
- `client/src/pages/Land.tsx`
- `client/src/pages/Blog.tsx`
- `client/src/pages/BlogPost.tsx`
- Any card components that render images

Add `loading="lazy"` to all `<img>` tags that are not hero/above-the-fold images. Hero images should NOT have `loading="lazy"` (they should load immediately). Everything else should be lazy.

```tsx
// Non-hero images:
<img src={src} alt={alt} loading="lazy" className="..." />

// Hero images (keep as-is, no lazy):
<img src={heroSrc} alt="hero" className="..." />
```

**Files to change:** Multiple page and component files -- scan for `<img` tags lacking `loading="lazy"`.

**Priority:** Medium -- measurable LCP improvement, especially on slow mobile connections.

---

## Fix 86: Form Error State Visibility (Medium)

**Status:** CODED

**Symptom:** On the Apply, Connect, and Investor journey forms, validation errors may appear in a way that's easy to miss -- red text that's small, off-screen, or rendered below a submit button that jumps away.

**Root cause:** React Hook Form + Zod validation errors are shown via `formState.errors`. If the error element is styled with low contrast or if the form scrolls past the error on submit, users get confused.

**Fix:**

In `Apply.tsx`, `Connect.tsx`, and `InvestorForm.tsx`:

1. Ensure error messages have sufficient contrast: use `text-red-400` minimum (not `text-red-300/50`).
2. On form submission failure, scroll to the first error field using:
```tsx
useEffect(() => {
  if (Object.keys(formState.errors).length > 0) {
    const firstErrorKey = Object.keys(formState.errors)[0];
    const el = document.querySelector(`[name="${firstErrorKey}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}, [formState.errors]);
```
3. Add a summary error message at the top of the form when submission fails:
```tsx
{formState.submitCount > 0 && Object.keys(formState.errors).length > 0 && (
  <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3 text-sm text-red-300">
    Please fix the errors below before submitting.
  </div>
)}
```

**Files to change:**
- `client/src/pages/Apply.tsx`
- `client/src/pages/Connect.tsx`
- `client/src/pages/InvestorForm.tsx`

**Priority:** Medium -- form completion rates directly affect fundraising and incubator applications.

---

## Fix 87: Admin Routes -- Server-Side Auth Verification (High)

**Status:** CODED

**Symptom:** Admin pages (`/admin/applications`, `/admin/moderation`, `/admin`) are protected by frontend-only password gates. A sophisticated user can bypass these gates by directly calling the tRPC endpoints from the browser console or a REST client.

**Root cause:** Some admin tRPC procedures may use `publicProcedure` instead of `adminProcedure` or `protectedProcedure`. Frontend password gates are UX conveniences, not security controls.

**Fix:**

Audit `server/trpc/routes/` for all admin-related procedures. Any procedure that returns sensitive data (applications list, user list, moderation actions, ban commands) must use `adminProcedure` (or at minimum `protectedProcedure` with a role check):

```ts
// Replace:
export const applicationsRouter = router({
  list: publicProcedure.query(...)  // WRONG

// With:
  list: adminProcedure.query(...)  // CORRECT
```

Run a search for `publicProcedure` in `server/trpc/routes/` and flag any that handle admin data.

This does not change the frontend password gate behavior -- it adds a real security layer underneath.

**Files to change:**
- `server/trpc/routes/admin.ts` (or equivalent) -- verify all procedures use `adminProcedure`
- `server/trpc/routes/applications.ts` -- verify list/get procedures require admin role
- `server/trpc/routes/moderation.ts` -- verify all moderation actions require admin role

**Priority:** High -- security concern before go-live.

---

## Fix 88: 404 Page -- Add Navigation Suggestions (Low)

**Status:** CODED

**Symptom:** The current 404 page likely shows a simple "page not found" message with a back to home link. Users who land on a broken URL have no context about what the site is or where to go.

**Fix:**

Update `client/src/pages/NotFound.tsx` to include:
- The ReGen Civics brand message (one line)
- 3-4 suggested navigation links (e.g., Explore the Game, Land Projects, Invest in the Fund, Community)
- A brief search or contact option

```tsx
<div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
  <h1 className="text-6xl font-bold text-[#7dd87d] mb-4">404</h1>
  <p className="text-white/70 mb-8">This path hasn't been cleared yet.</p>
  <div className="grid sm:grid-cols-2 gap-3 max-w-sm w-full">
    <Link href="/" className="...">Home</Link>
    <Link href="/quest" className="...">Explore Quests</Link>
    <Link href="/fund" className="...">The Fund</Link>
    <Link href="/community" className="...">Community</Link>
  </div>
</div>
```

**Files to change:**
- `client/src/pages/NotFound.tsx`

**Priority:** Low -- quality-of-life improvement.

---

## Fix 89: Cookie Consent State Persistence (Medium)

**Status:** CODED

**Symptom:** Users who have already dismissed or accepted the cookie consent banner may see it again after a Railway deploy if the localStorage key changes between versions.

**Root cause:** `CookieConsent.tsx` likely uses a localStorage key like `cookieConsent` or similar. If the key is version-stamped (e.g., `cookieConsent_v1`), a version bump on deploy would invalidate prior consent and re-show the banner to all existing users.

**Fix:**

1. Check `client/src/components/CookieConsent.tsx` for the localStorage key used.
2. Ensure the key is NOT version-stamped -- use a stable key like `rc_cookie_consent`.
3. Ensure the stored value is a timestamp (so consent can expire after 12 months if needed) rather than just `"true"`.
4. Add a check: if `Date.now() - storedTimestamp > 365 * 24 * 60 * 60 * 1000`, re-show the banner.

```tsx
const CONSENT_KEY = 'rc_cookie_consent';
const hasConsented = () => {
  const val = localStorage.getItem(CONSENT_KEY);
  if (!val) return false;
  const ts = parseInt(val, 10);
  return Date.now() - ts < 365 * 24 * 60 * 60 * 1000;
};
const giveConsent = () => localStorage.setItem(CONSENT_KEY, String(Date.now()));
```

**Files to change:**
- `client/src/components/CookieConsent.tsx`

**Priority:** Medium -- affects GDPR compliance posture.

---

## Fix 90: Accessibility -- Focus Management and ARIA Labels (Medium)

**Status:** CODED

**Symptom:** Icon-only buttons (the AI chatbot toggle, scroll-to-top, modal close buttons, nav hamburger) have no accessible labels. Screen reader users and keyboard users cannot identify these controls.

**Root cause:** Buttons with icon-only content need explicit `aria-label` attributes. Modal overlays need focus trap and `aria-modal` attributes. The site currently lacks systematic accessibility treatment.

**Fix -- Priority items:**

1. **Chatbot toggle button** (`ReGenGuide.tsx`): Add `aria-label="Open ReGen Guide chat"` and `aria-expanded={isOpen}`.
2. **Scroll to top** (`ScrollToTop.tsx`): Add `aria-label="Scroll to top"`.
3. **Modal close buttons** (all `X` icon buttons across the site): Add `aria-label="Close"`.
4. **Mobile nav hamburger** (`Navigation.tsx`): Add `aria-label="Open navigation menu"` / `"Close navigation menu"` toggling with open state.
5. **CookieConsent buttons**: Add `aria-label="Accept cookies"` / `"Decline cookies"`.
6. **Focus trap in modals**: When a modal opens, focus should move to the modal container. When it closes, focus should return to the triggering element.

**Files to change:** `ReGenGuide.tsx`, `ScrollToTop.tsx`, `Navigation.tsx`, `CookieConsent.tsx`, and any component with icon-only buttons or modals.

**Priority:** Medium -- required for WCAG 2.1 AA compliance; increasingly important for legal risk.

---

## Fix 91: Blog Page -- SEO Meta Tags Per Post (Medium)

**Status:** CODED

**Symptom:** Blog posts at `/blog/:slug` may not have post-specific `og:title`, `og:description`, and `og:image` meta tags. This means all blog posts share the generic site meta tags when shared on social media.

**Root cause:** `BlogPost.tsx` likely renders an SEO component but may be passing generic values rather than post-specific values fetched from the tRPC blog post query.

**Fix:**

In `client/src/pages/BlogPost.tsx`, after the post data loads, pass post-specific values to the SEO component:

```tsx
{post && (
  <SEO
    title={`${post.title} -- ReGen Civics Blog`}
    description={post.excerpt || post.content?.substring(0, 155)}
    image={post.heroImage || '/images/og-default.jpg'}
    type="article"
    publishedAt={post.publishedAt}
    author={post.author?.name}
  />
)}
```

Also ensure `SEO.tsx` supports `type="article"` and renders `<meta property="article:published_time" />` when `publishedAt` is passed.

**Files to change:**
- `client/src/pages/BlogPost.tsx`
- `client/src/components/SEO.tsx` -- add article meta tag support if missing

**Priority:** Medium -- blog posts are likely to be shared; each needs its own social preview.

---

## Handoff Breakdown -- Fix 71-91

### YOU (Rye) -- things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| Fix 76 | Run `diagnose-applications.ts` to identify real application IDs | Needs Railway `DATABASE_URL` -- VM cannot reach Railway MySQL | See PowerShell commands in Fix 76 body above |
| Fix 76 | Update `KEEP_IDS` in `cleanup-test-applications.ts` with real IDs, then run cleanup | You must confirm which applications are real before deletion | Same script, update array then re-run with `DRY_RUN=false` |
| Fix 65 | Provide YouTube video URL | Only you have access to the video | Paste URL into thread; Claude Code will wire it |
| Fix 84 | Approve OG image generated by nano-banana-pro | Visual quality decision | Review generated image after Claude Code runs nano-banana-pro |
| Fix 75 | Approve team placeholder image | Visual quality decision | Review generated image after Claude Code runs nano-banana-pro |

### CLAUDE CODE -- already done or can be done without you

| # | Task | Status |
|---|------|--------|
| Fix 58-63, 66-68 | Audited -- confirmed DONE | DONE |
| Fix 71 | Add geolocation detect button to BioregionMultiSelect + BioregionSelect | CODED |
| Fix 72 | Wrap NewsletterSignupInline with `isNewsletterSubscribed()` check in Community + CommunityCategory | CODED |
| Fix 73 | Change "Tao Te Ching" to "Wise Sage" in TaoSpinner.tsx line 143 | CODED |
| Fix 74 | No action -- single public chatbot confirmed | VERIFIED |
| Fix 75 | Remove "Want to see one real human?" section from Team.tsx; generate placeholder image; add Coming Soon overlay | CODED |
| Fix 76 | Write `scripts/diagnose-applications.ts` and `scripts/cleanup-test-applications.ts` | CODED |
| Fix 77 | Add `!adminMode` guard to `<ScrollToTop />` in App.tsx | CODED |
| Fix 78 | Move all hooks to top of AdminModeration.tsx with `enabled` flags | CODED |
| Fix 79 | Replace "Join Open Session" with "Join Next Session" in Land.tsx (2 occurrences) | CODED |
| Fix 80 | Replace hard redirect in CommunityCategory.tsx with inline join prompt | CODED |
| Fix 81 | Remove "Soon" badges from CustomGames page and nav; expand to 4-card grid with expand/collapse | CODED |
| Fix 82 | Remove SiteTour from App.tsx | CODED |
| Fix 83 | Audit Navigation.tsx for mobile tap targets; add `aria-label`, `min-h-[44px]` | CODED |
| Fix 84 | Verify/update SEO.tsx og:image support; generate og-default.jpg via nano-banana-pro | CODED |
| Fix 85 | Add `loading="lazy"` to non-hero images across pages | CODED |
| Fix 86 | Add scroll-to-error and error summary to Apply, Connect, InvestorForm | CODED |
| Fix 87 | Audit admin tRPC procedures for `adminProcedure` usage; flag any using `publicProcedure` | CODED |
| Fix 88 | Update NotFound.tsx with navigation suggestions | CODED |
| Fix 89 | Stabilize CookieConsent localStorage key; add timestamp expiry | CODED |
| Fix 90 | Add `aria-label` to icon-only buttons across site; add focus trap to modals | CODED |
| Fix 91 | Wire post-specific SEO meta tags in BlogPost.tsx; add article type to SEO component | CODED |

### WAITING ON YOU before Claude Code can proceed

- **Fix 76:** Claude Code will write both scripts immediately. But the actual data cleanup (knowing which 2 IDs to keep) requires Rye to run `diagnose-applications.ts` against the live DB and report back the real application IDs.
- **Fix 65:** Claude Code cannot wire the YouTube video until Rye provides the URL.
- **Fix 75 + Fix 84:** Claude Code will generate placeholder images autonomously using nano-banana-pro. Rye reviews and approves (or requests a regeneration) before final commit.

### Suggested execution order for Claude Code

Run these in this sequence to maximize parallelism and avoid conflicts:

1. **Batch 1 (quick wins, no dependencies):** Fix 73, Fix 79, Fix 82, Fix 74 (no-op)
2. **Batch 2 (component fixes, isolated):** Fix 72, Fix 77, Fix 78, Fix 80, Fix 81, Fix 88, Fix 89
3. **Batch 3 (requires nano-banana-pro):** Fix 75, Fix 84
4. **Batch 4 (multi-file audits):** Fix 71, Fix 83, Fix 85, Fix 86, Fix 87, Fix 90, Fix 91
5. **Batch 5 (scripts, then human step):** Fix 76 -- write scripts, then flag for Rye to run

---

## Round 3 Fixes (added 2026-03-12, Rye's 9-item list)

These are appended after Rye reviewed the site and caught additional issues. Fix 74 has a revised spec below (overrides the earlier "No Action Needed" verdict). Fix 82 in the batch above handles SiteTour removal from App.tsx; Fix 74 REVISED handles the ReGenGuide button restyling.

---

### Fix 74 (REVISED): Merge two chat widgets into one bottom-left "Show Me Around" button

**Priority:** High
**Status:** CODED (revised)
**File(s):** `client/src/components/ReGenGuide.tsx`, `client/src/components/Navigation.tsx`

**Problem:** Two separate AI chat widgets are rendered simultaneously:
- `SiteTour.tsx` -- "Show Me Around" button, `fixed bottom-6 right-6 z-40`, uses `trpc.siteTour.chat`
- `ReGenGuide.tsx` -- "Your ReGen Guide" button, `fixed bottom-4 left-4 z-[9999]`, uses SSE at `/api/chat/stream`

Both are visible at the same time, creating confusion and visual clutter in the bottom corners.

**Fix 82 (already in the list)** handles removing SiteTour from App.tsx. This fix handles the complementary side: updating ReGenGuide's trigger button to match the "Show Me Around" visual style so the single remaining widget feels intentional.

**Changes to `client/src/components/ReGenGuide.tsx`:**
- Update the floating trigger button className to match SiteTour's rounded-full dark green style:
  ```
  className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg
    bg-[#1a472a] border border-[#7dd87d]/40 text-[#7dd87d] hover:bg-[#1e5533] hover:border-[#7dd87d]/70
    hover:shadow-xl transition-all duration-200 font-medium text-sm"
  ```
- Change the button label from "Your ReGen Guide" to "Show Me Around"
- Keep the `Sparkles` icon (already matches SiteTour)
- Add `<span className="hidden sm:inline">Show Me Around</span>` to hide text on mobile (icon only)
- Migrate SiteTour's `STARTER_PROMPTS` array into ReGenGuide so the consolidated widget still shows suggested questions:
  ```tsx
  const STARTER_PROMPTS = [
    "How does the ReGen Civics fund work?",
    "What are quests and how do I earn rewards?",
    "How do I invest or contribute?",
    "What is the difference between the 4 paths?",
  ];
  ```
- Render these starter prompts in ReGenGuide's open panel (same pattern as SiteTour's starter prompts section, shown when `messages.length <= 1`)

**Fix 82 must run before or alongside this fix** -- SiteTour must be removed from App.tsx for there to be only one widget.

---

### Fix 92: Add "So what's the Game?" section to the /game page

**Priority:** High
**Status:** CODED
**File(s):** `client/src/pages/Game.tsx`

**Location:** Add as a new full-width section after the existing hero/intro block and before the "4 paths" or main content sections. Use `AnimatedSection` wrapper. The section should have a visually distinct treatment -- slightly different background, generous padding, and the forest imagery woven in.

**Section structure:**

```
[AnimatedSection]
  [Section header]: "So what's the Game?" -- large, styled like the other Game.tsx section headers
  [Teaser line]: first sentence visible without expanding
  [Collapsible]: rest of the copy, expanded on click
    [CollapsibleTrigger]: "Read more about the Infinite Game" / "Show less"
    [CollapsibleContent]: paragraphs below
  [2-3 forest images]: placed alongside or below the text, in a grid or alternating layout
[/AnimatedSection]
```

**Copy guidance:** Use Rye's copy as the base. Light editing is fine for readability and to fit the site's existing voice -- tighten run-on sentences, fix any spelling errors, break up very long paragraphs. Do not rewrite the meaning or add AI language. No em-dashes. Headings like "So if it's so important, why call it a Game?" and "The Infinite Part" and "Finally, there are 2 parts to this" should stay as sub-headers or bold callouts inside the section. The voice must stay Rye's.

**Copy (base -- lightly editable for flow, no em-dashes, no AI language):**

> The simplest way I can describe what's happening here is we're co-creating an infinite game to do the thing.
>
> What do I mean "the thing" -- well let's start here as it's the most important. The "thing" is creating a civilization that's a healthy, joyful, fulfilling and magical place to raise children. To raise ourselves. That's "The Thing" and the thing about the thing is there's no right answer. But there are a LOT better answers than the dominant way we're doing this as a society.
>
> The thing is hard, the thing is monumental, and it's necessary -- and nobody knows the absolute right way to do it, and there isn't one. So, we need to try and have 1000s of viable options to choose. Because if we can't choose the story in which we raise ourselves, we aren't choosing anything meaningful.
>
> **So if it's so important, why call it a Game?**
>
> There's so many layers to this, but let me stay at the surface. Surface level: we need it to be a Game in design so that it's simple for people to participate. Because the old Games are taking everyone's time. So, it needs to be extremely easy to participate -- and designing it like a Game helps us consider that lens.
>
> Second, why not make it fun! Authentically fulfilling and fun to be part of co-creating regenerative civilizations. It's the best game.
>
> Which brings us to part 3: it's the best game to play.
>
> **The "Infinite Part"** -- this is the best part. My role is not to be the founder, owner, CEO, etc. of this vital piece of community infrastructure. My role is simply to get the Game started then make myself obsolete as quickly as we can while still supporting the healthy development of the Game. Much like the pattern for raising healthy children.
>
> **Finally, there are 2 parts to this.** Much of what we're doing is building bridges from one Game -- the Dominant Game -- to a growing diversity of new Games. We approach this by mastering the economic systems of the old Game and the New Game simultaneously.
>
> That's why we have 2 distinct spaces. A fund that's deeply rooted in the old Game, and a "regen game" deeply rooted in a growing diversity of new Games. Think of it as 2 sides of a chasm.
>
> Part of our Game is then creating a bigger and better bridge so that the growing number of people ready for these realities can safely, joyfully, and easily -- hopefully with a bit of awe and wonder -- walk across the bridge into the new worlds.
>
> Now this is not without doing the work. By "the work" I mean the inner work. This is where Quests come in. To help us co-create a growing number of "Mini Games" on doing the inner and outer work of healing so that we can become better players in the Game.
>
> The Fund is designed to be deeply rooted in the old Games, working to master that Game through using the most powerful coordination structures -- Funds -- ensuring we have the capability to coordinate in that Game. The ReGen Game is a continuation of the work started in SEEDS back in 2017: taking almost a decade of learning and weaving it into this new structure.

**Collapsible behavior:**
- Show the first paragraph ("The simplest way I can describe...") outside the collapsible as a teaser
- Everything from "What do I mean 'the thing'" onward goes inside `<CollapsibleContent>`
- `CollapsibleTrigger` button: "Read more about the Infinite Game" when closed, "Show less" when open
- Animate with `transition-all duration-300` on the content

**Images:**
- Use `nano-banana-pro` skill to generate 2 images:
  1. "A dreamlike fantasy forest village glowing at dusk, regenerative civilization, mossy stone paths, soft warm light filtering through ancient trees, ethereal and hopeful, painterly style" -- 1280x720
  2. "Two worlds connected by a bridge of light over a chasm, one side dense modern city, other side a lush regenerative forest village, aerial view, painterly, hopeful, golden hour" -- 1280x720
- Save to R2 / `assets.regencivics.earth` using the existing image upload pattern
- Place images in a 2-column grid below the collapsible text, or one large + one smaller in an asymmetric layout

---

### Fix 93: Unique per-page OG descriptions for social sharing

**Priority:** High
**Status:** CODED
**File(s):** `client/src/components/SEO.tsx`

**Problem:** Most page descriptions in SEO.tsx were written with AI patterns or don't optimize for social sharing. Each page needs a unique, human-written description that makes someone want to click through when they see the link shared.

**Rules for all descriptions:**
- No em-dashes
- No AI writing patterns ("Discover", "Explore", "Unlock", "Comprehensive", "robust", "seamlessly")
- Write like a person explaining why someone should care
- Max 155 characters for Twitter; OG descriptions can be slightly longer (up to 200 chars)
- The home page description stays as-is (Rye approved it)

**Updated descriptions for each page (replace existing):**

| Page | New `description` value |
|------|------------------------|
| `/fund` | `"ReGen Civics runs a venture fund for regenerative land projects. Real land, diversified portfolio, community governed. Season 3 opens in 2026."` |
| `/land` | `"Real land projects doing the hard work of regenerating soil, water, community, and local economy. These are the projects we're backing."` |
| `/ally` | `"The alliance organizations co-creating the Regenerative Renaissance alongside ReGen Civics. A network built on shared values, not just shared logos."` |
| `/play` | `"The players inside ReGen Civics. Contributors, builders, and healers doing quests and co-creating the new civilization one action at a time."` |
| `/quest` | `"Quests are how you participate. Each one moves healing into the world -- your body, your land, your community. Earn rewards doing the work that actually matters."` |
| `/game` | `"An infinite game -- no finish line, no winners, just a growing civilization we're building together. Here's how the ReGen Civics game works."` |
| `/tokenomics` | `"How $RCivics works: the token coordinating the fund, rewarding contributors, and anchoring the financial layer of the Regenerative Renaissance."` |
| `/map` | `"Land projects, alliance orgs, and players mapped across the world. See where regeneration is happening right now."` |
| `/blog` | `"Writings from the ReGen Civics community. Strategy, stories from land projects, game design notes, and updates from the movement."` |
| `/community` | `"The ReGen Civics forum. Where players, investors, land stewards, and builders connect, coordinate, and tell the truth."` |
| `/apply` | `"Apply to bring your regenerative land project into the ReGen Civics ecosystem. Season 3 applications open 2026."` |
| `/team` | `"A distributed team working to make the Regenerative Renaissance real. Meet the people behind ReGen Civics."` |
| `/governance` | `"Voice-based governance rooted in land and contribution. How ReGen Civics makes decisions, and who has a say."` |
| `/opportunity` | `"For accredited investors ready to put capital to work in the regenerative transition. Here's the investment opportunity inside ReGen Civics."` |
| `/calculator` | `"Run the numbers on your crowd pooling contribution and see how your capital compounds with others to fund regenerative land projects."` |
| `/crowd-pooling` | `"Pool capital with aligned investors to fund regenerative land projects. Coordinated impact, land-backed, and community governed."` |
| `/connect` | `"Get in touch with the ReGen Civics team. Whether you're an investor, land project, alliance partner, or player -- we want to hear from you."` |

**OG images:** The existing CDN images for `/fund`, `/map`, `/community` are already good. For pages that currently use `/og-default.jpg` (or no custom image), use the existing default for now -- Fix 84 already covers generating a better default. If Claude Code wants to generate page-specific images for `/game`, `/quest`, `/land` using nano-banana-pro, that is a bonus but not required for this fix.

---

### Fix 94: Map forum button gives 404 -- claim-triggered threads + Land Project Spaces section

**Priority:** High
**Status:** IN PROGRESS
**File(s):** `client/src/components/GlobeMap.tsx`, `client/src/pages/Community.tsx`, admin claim approval flow

**Problem:** Clicking the "Forum" button for any land project on the map gives a 404 because:
1. The static fallback `/community/land-projects` doesn't exist as a route
2. Forum threads for land projects should not be created automatically -- they are created when a steward claims a project and the claim is approved

**Design decision (supersedes original Fix 94 spec):** Forum threads for land projects and organisations are NOT auto-created on acceptance or via seed scripts. A thread is only created when a player claims stewardship of a project and an admin approves that claim. This ensures every forum space has an active steward behind it. Season 1 projects need to be reclaimed before getting a thread.

This fix has 3 parts.

---

**Part 1: Fix the broken fallback in GlobeMap.tsx**

Change the static fallback from `/community/land-projects` to `/community`. When no matching thread exists for a project, render a "Forum (coming soon)" state -- either a disabled button or a link to `/community` with a tooltip: "This project's forum space will be created once a steward claims it."

---

**Part 2: Create forum thread on claim approval**

In the admin claim approval flow (likely `server/routers/admin.ts` or wherever `orgClaims` status is updated to `approved`), add a step that:

1. Checks if a forum post already exists for this entity (land project or org)
2. If not, creates one in the appropriate category:
   - Land projects → `active-projects` (id 11)
   - Alliance orgs → `alliance-partners` (id 6)
3. Title: `🏡 [Project Name]` for land projects, `🤝 [Org Name]` for orgs
4. Body: opening post authored by the claiming user (use their userId, not the team account)
5. Stores the resulting `forumPostId` on the entity record (add column to `applications` or organisations table if not present)

This means the GlobeMap Forum button activates automatically once a claim is approved.

---

**Part 3: Add "Land Project Spaces" section to the Community page**

In `client/src/pages/Community.tsx`, add a section labeled **"Land Project Spaces"**. This section:

- Fetches all posts from the `active-projects` category via `trpc.forum.activeProjectThreads` (already exists)
- Renders each project as a card: project name, short description, "Visit Forum" button linking to `/community/post/${postId}`
- If no projects have been claimed yet, shows: "Land project spaces appear here once a steward has claimed the project."
- Grid layout consistent with the rest of the Community page

Note: `scripts/backfill-forum-threads.mjs` is now obsolete -- do not run it. The claim flow replaces it.

---

### Fix 95: Admin area readability -- Custom Game Waitlist and general principle

**Priority:** High
**Status:** CODED
**File(s):** `client/src/pages/Admin.tsx`, (general principle for all future admin UI)

**Problem:** The `AdminCustomGameWaitlist` component (Admin.tsx ~line 77) has two compounding readability failures:

1. **No contrast** -- the component appears to render light-colored text on a light background (or very low-opacity white on near-white). The text is not just dim, it's invisible. Check whether the container has a dark background applied at all -- if not, that needs to be added before fixing the text color.
2. **Low opacity classes even if the bg is fixed** -- text uses `text-white/40`, `text-white/50`, `text-white/60` which are unreadable regardless of background

**Fix:**
- Verify the container div has a dark background (`bg-slate-900`, `bg-gray-900`, or similar). If it doesn't, add one.
- Change all `text-white/40` to `text-white/90` in AdminCustomGameWaitlist
- Change all `text-white/50` to `text-white/90` in AdminCustomGameWaitlist
- Change all `text-white/60` to `text-white/80` in AdminCustomGameWaitlist
- Primary data (names, emails, key values): `text-white` (full opacity)
- Secondary labels: `text-white/75` minimum
- Increase base font size in data rows to at least `text-sm` (14px) -- do not use `text-xs` for any primary data

**General principle to apply going forward (audit the rest of Admin.tsx):**
- Scan all admin components in Admin.tsx for any `text-white/[0-60]` patterns
- Scan for any section missing an explicit dark background that uses white text
- Minimum readable contrast: `text-white/75` for secondary text, `text-white/90` for primary data
- No primary data should ever use `text-xs` -- use `text-sm` as the floor
- Run: `grep -n "text-white/[1-6]0\|text-xs"` on Admin.tsx and fix all problematic matches

---

### Fix 96: Remove broken language switcher

**Priority:** Medium
**Status:** CODED
**File(s):** `client/src/components/Navigation.tsx`

**Problem:** The `LanguageSwitcher` component uses the Google Translate Widget API which has been deprecated and silently fails. The UI element is present but does nothing, creating dead UI.

**Fix:**
1. In `Navigation.tsx`, remove the `LanguageSwitcher` import (line 33)
2. Remove the `<LanguageSwitcher compact />` JSX from the desktop nav (line ~425)
3. Remove the `<LanguageSwitcher />` JSX from the mobile nav (line ~557)
4. The files `client/src/components/LanguageSwitcher.tsx` and `client/src/components/GoogleTranslate.tsx` can be left in place (don't delete) in case translation is revisited later, but they should not be imported or rendered anywhere

---

### Fix 97: Admin Image Studio -- Cloudflare Worker URL error

**Priority:** Medium
**Status:** [HUMAN] primarily, CODED for error UX
**File(s):** `server/_core/imageGeneration.ts`, `client/src/components/AdminImageStudio.tsx`

**Error:** "Failed to parse URL from regen-civics-image-gen.rieki-cordon.workers.dev"

**Root cause analysis:**
The error "Failed to parse URL" typically means `new URL(workerUrl)` failed because the URL is missing the `https://` protocol prefix. In `server/_core/imageGeneration.ts` lines 46-51, `ENV.imageGenWorkerUrl` is read directly and passed to `fetch()`. If the Railway env var `IMAGE_GEN_WORKER_URL` is set to `regen-civics-image-gen.rieki-cordon.workers.dev` (no protocol), it will throw this exact error.

**What Claude Code can fix (defensive code):**
In `server/_core/imageGeneration.ts`, before using `ENV.imageGenWorkerUrl` in fetch, add a guard:
```ts
const workerUrl = ENV.imageGenWorkerUrl.startsWith('http')
  ? ENV.imageGenWorkerUrl
  : `https://${ENV.imageGenWorkerUrl}`;
```
This makes the code resilient whether or not the env var includes the protocol.

Also improve the error message in `AdminImageStudio.tsx` -- if the error contains "Failed to parse URL" or "not configured", surface a more helpful message:
> "Image generation is not configured. Check that IMAGE_GEN_WORKER_URL is set in Railway (full URL with https://) and the Cloudflare Worker is deployed."

**What Rye needs to do [HUMAN] -- include in post-deployment checklist:**
1. In Railway dashboard, check the `IMAGE_GEN_WORKER_URL` env var -- it must be: `https://regen-civics-image-gen.rieki-cordon.workers.dev`
2. If the Worker itself is down, redeploy it: `cd workers/image-gen && npx wrangler deploy`
3. Make sure `IMAGE_GEN_SECRET` is also set in Railway and matches the Worker's expected auth header

**Post-deployment checklist requirement:** After all fixes in this document are implemented and deployed, Claude Code must output a consolidated step-by-step checklist of every action Rye needs to take to get the site fully operational. Format it as a numbered list with clear instructions for each step, grouped by category (Railway env vars, Cloudflare Workers, database actions, manual content). Every [HUMAN] step across all fixes should be in this list -- Rye should be able to copy it and work through it top to bottom without having to re-read the fixes document.

---

### Fix 98: Remove dark mode toggle

**Priority:** Medium
**Status:** CODED
**File(s):** `client/src/App.tsx`, `client/src/components/Navigation.tsx`

**Problem:** The dark mode toggle is present but the dark mode implementation is inconsistent -- many components don't properly support it and it makes the site look broken. Rye has decided to ship in light mode only.

**Changes:**

In `client/src/App.tsx` (line ~228):
```tsx
// Before:
<ThemeProvider defaultTheme="dark" switchable>

// After:
<ThemeProvider defaultTheme="light">
```
(Remove the `switchable` prop entirely -- this hides the toggle button)

In `client/src/components/Navigation.tsx`, remove the theme toggle button entirely (the `onClick={toggleTheme}` button with the Sun/Moon icon, lines ~417-424). Also remove the `Sun` and `Moon` imports from lucide-react if they're no longer used elsewhere in the file.

The `useTheme` hook and `ThemeContext.tsx` can stay in place -- don't delete them. Just stop rendering the toggle.

---

### Fix 99: Add $ReGen caveat at top of /tokenomics

**Priority:** Medium
**Status:** CODED
**File(s):** `client/src/pages/Tokenomics.tsx`

**Problem:** The Tokenomics page covers both $RCivics and $ReGen, but $ReGen isn't fully designed yet -- its evolution is governed by the Game community over time. Visitors may be confused about why one token is detailed and the other isn't. Note: RGVoice is covered separately on the /governance page, so this caveat is only about $ReGen.

**Fix:** Add a short intro note/banner at the very top of the Tokenomics page content (below the page header, above the first section). It should be visually distinct -- a soft info box, not a warning banner.

**Copy (no em-dashes, no AI writing):**

> **A note on $ReGen**
>
> This page focuses on $RCivics, which has the clearest design so far. $ReGen, the token for the Infinite Game, is intentionally less specified here. How $ReGen evolves is something the Game community governs together over time. As that work matures, this page will reflect it.

**Styling:** Use a light green tinted box with a left border accent, similar to the info callout style used elsewhere on the site. Not alarming, just clarifying.

---

## Updated Handoff Breakdown (Round 3)

### What Claude Code executes autonomously

| Fix | Action | Files |
|-----|--------|-------|
| Fix 74 (REVISED) | Update ReGenGuide trigger button to "Show Me Around" style + add starter prompts | `ReGenGuide.tsx` |
| Fix 82 | Remove SiteTour from App.tsx | `App.tsx` |
| Fix 92 | Add "So what's the Game?" collapsible section + generate 2 images | `Game.tsx` |
| Fix 93 | Update per-page OG descriptions | `SEO.tsx` |
| Fix 94 | Fix fallback URL in GlobeMap; seed forum threads for all existing land projects; wire auto-create on project acceptance; add "Land Project Spaces" section to Community page | `GlobeMap.tsx`, `Community.tsx`, `scripts/seed-land-project-threads.ts`, admin router |
| Fix 95 | Fix readability in AdminCustomGameWaitlist; audit all other admin components for contrast | `Admin.tsx` |
| Fix 96 | Remove LanguageSwitcher from Navigation.tsx | `Navigation.tsx` |
| Fix 97 | Add protocol guard to imageGeneration.ts; improve error message in AdminImageStudio.tsx | `imageGeneration.ts`, `AdminImageStudio.tsx` |
| Fix 98 | Remove `switchable` prop from ThemeProvider; remove theme toggle button from Navigation | `App.tsx`, `Navigation.tsx` |
| Fix 99 | Add $ReGen caveat note at top of Tokenomics page | `Tokenomics.tsx` |
| Post-deploy | Output consolidated step-by-step checklist of all [HUMAN] steps for Rye | (printed to terminal / README) |

### What Rye must do (after Claude Code deploys)

Claude Code will output a full post-deployment checklist when all fixes are complete. The known human steps are:

| Fix | Action |
|-----|--------|
| Fix 94 | No seed script needed. Forum threads are created automatically when a claim is approved. No manual DB step required. |
| Fix 97 | In Railway: set `IMAGE_GEN_WORKER_URL` = `https://regen-civics-image-gen.rieki-cordon.workers.dev`; verify `IMAGE_GEN_SECRET` is set; if Worker is down, run `cd workers/image-gen && npx wrangler deploy` |

### Suggested execution order for Claude Code (Round 3)

1. **Batch 1 (quick, no dependencies):** Fix 96, Fix 98, Fix 99
2. **Batch 2 (text/copy updates):** Fix 93, Fix 95
3. **Batch 3 (component logic):** Fix 74 REVISED + Fix 82 together
4. **Batch 4 (image generation + page section):** Fix 92 (generate images first via nano-banana-pro, then wire into Game.tsx)
5. **Batch 5 (forum + community):** Fix 94 -- wire forum thread creation into claim approval, add Land Project Spaces to Community page, fix GlobeMap fallback
6. **Batch 6 (error handling):** Fix 97
7. **Final step:** Output the consolidated post-deployment checklist for Rye covering all [HUMAN] steps

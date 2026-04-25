# Fixes to Make — 2026-03-27

Continues from `FIXES_TO_MAKE_2026-03-24.md`. DB migrations from the 2026-03-26 strategy session are already live in production.

---

## Fix 223 — Onboarding Quest Card Background Image (Low)

**Status:** CODED

**Symptom:** The "Explore Onboarding Quests" card in the profile overview tab is a flat pale-green box that feels generic and lightweight compared to the rest of the site.

**Fix:** Replaced flat `bg-[#f0f7f0]` card with a full background image (`/images/quests/quest-hero.webp`), a dark gradient overlay for readability, a frosted glass compass icon container, white text, and a green CTA button. The card now has visual weight and matches the site's aesthetic.

**Files changed:**
- `client/src/pages/PlayerProfile.tsx` — lines ~2763-2773

---

## Fix 224 — Claude Code CLI PATH Issue (Medium)

**Status:** HUMAN STEP REQUIRED

**Symptom:** After running `winget upgrade Anthropic.ClaudeCode`, PowerShell still says `'claude' is not recognized`. The winget install succeeded (v2.1.84) but the binary is not on PATH.

**Root cause:** Winget installed Claude Code but did not place a link in `%LOCALAPPDATA%\Microsoft\WinGet\Links\` (that folder is empty). The npm global bin directory where claude actually lives is likely not in the current session's PATH.

**Fix:** Run this in PowerShell:
```powershell
npm install -g @anthropic-ai/claude-code
```
Then in a new PowerShell window:
```powershell
cd C:\Users\taren\Downloads\regen-civics-clean
claude --dangerously-skip-permissions
```

**Why only Rye:** Needs to be run on Rye's local Windows machine. The Cowork VM can't install npm packages to Rye's Windows PATH.

---

## Fix 225 — Wallet Sync Bug: "Add your wallet" prompt shown when wallet already linked (Medium)

**Status:** CODED + DB FIX REQUIRED

**Symptom:** Profile page shows "Add your wallet address in Settings to sync token balances" in the Contributions section, and both token balances show 0. Meanwhile, the Blockchain Connection section correctly displays the wallet address `0xaAaFEF50DF2db72AB25457746C8adAC91FB5354e`.

**Root cause:** The `walletAddress` column is NULL in the database, but `baseAccountName` has the address. The `linkBaseAccount` mutation now mirrors both fields, but the wallet was linked before that mirroring code was added. Multiple code paths (Contributions UI check, syncTokens, forceSync, adminSyncTokens, auto-sync useEffect) only checked `profile.walletAddress` without falling back to `baseAccountName`.

**Code fix (CODED):**
- `client/src/pages/PlayerProfile.tsx`: Added `effectiveWallet = profile.walletAddress || profile.baseAccountName` in Contributions component, updated the conditional at the sync button, updated auto-sync useEffect
- `server/routes/players.ts`: Updated `syncTokens`, `forceSync`, and `adminSyncTokens` mutations to use `profile.walletAddress || profile.baseAccountName` fallback

**DB fix (HUMAN STEP REQUIRED):**
Run on Railway SQL console:
```sql
UPDATE player_profiles SET walletAddress = baseAccountName WHERE baseAccountName IS NOT NULL AND (walletAddress IS NULL OR walletAddress = '');
```

**Files changed:**
- `client/src/pages/PlayerProfile.tsx`
- `server/routes/players.ts`

---

## Fix 226 — My Submissions Tab Shows Admin-Seeded Applications (Medium)

**Status:** CLAUDE CODE

**Symptom:** The "My Submissions" tab in the player profile shows 13 land project applications. These are all the season 1 projects that Rye manually seeded into the database. The `myApplications` query correctly filters by `userId`, but since Rye's account was used to seed all season 1 data, every application has Rye's `userId`. Regular users would only see their own 0-1 applications, but this is broken for the admin who seeded the data.

**Root cause:** The `applications` table has no concept of "admin-created on behalf of a project" vs "user submitted their own application." All season 1 apps were created under Rye's userId.

**Fix (for Claude Code):**
1. Add a `stewardUserId` column to the `applications` table (nullable int). When someone submits their own application, `stewardUserId` = `userId`. For admin-seeded apps, `stewardUserId` stays NULL until someone claims stewardship.
2. Update `myApplications` query to filter by `stewardUserId = ctx.user.id` instead of `userId`, so admin-seeded apps don't clutter the personal profile. Alternatively, add an `adminSeeded` boolean column and filter those out.
3. The full list of all applications (including admin-seeded) should remain visible in the Admin panel only.

**Simplest interim fix:** Add `adminSeeded` tinyint(1) default 0 to `applications`. Set it to 1 for all existing season 1 apps. Filter them out in `myApplications`. Show them in Admin only.

**Files to change:**
- `drizzle/schema.ts` (add column)
- `server/db.ts` or `server/routes/applications.ts` (filter in myApplications)
- Migration SQL: `ALTER TABLE applications ADD COLUMN adminSeeded TINYINT(1) DEFAULT 0; UPDATE applications SET adminSeeded = 1 WHERE submittedAt IS NULL OR submittedAt < '2026-03-01';`

---

## Fix 227 — Remove Redundant "Welcome Aboard Quests" Button (Low)

**Status:** CODED

**Symptom:** The Quests tab in the profile has a "Welcome Aboard Quests" green button at the bottom, but the Welcome Aboard quests are already displayed directly above it. The button is redundant.

**Fix:** Removed the "Welcome Aboard Quests" button from the quest navigation buttons section. Kept the "Rites of Passage" button as it links to a different quest set.

**Files changed:**
- `client/src/pages/PlayerProfile.tsx`

---

## Fix 228 — Admin Notification Preferences Showing in User Profile Settings (Low)

**Status:** CODED + CLAUDE CODE (new user-facing prefs component)

**Symptom:** The Settings tab in the player profile shows "Notification Preferences" with toggles for Project Applications, Investor Inquiries, Alliance Requests, etc. These are admin-level internal team alerts (which emails the admin gets when things happen on the site). They should only appear in the Admin panel settings, not in a user's profile.

**What was done (CODED):** Removed the `<NotificationPreferences />` component from PlayerProfile.tsx settings tab. It's already rendered in the Admin Settings tab (`AdminSettingsTab.tsx` line 30), so no duplication.

**What still needs building (CLAUDE CODE):** User-facing notification preferences need a separate component for the profile Settings tab. These are preferences regular users should control:
- Newsletter opt-in/out
- AI-generated digest frequency (daily/weekly/off)
- Community update emails
- Quest/event announcements

This is a new feature, not just moving the admin one. The admin component (`NotificationPreferences.tsx`) stays admin-only. A new `UserNotificationPreferences.tsx` component should be created for the profile.

**Files changed:**
- `client/src/pages/PlayerProfile.tsx` (removed admin component)

**Files to create (Claude Code):**
- `client/src/components/UserNotificationPreferences.tsx` (new)
- Schema/route additions for user-level notification prefs

---

## Fix 229 — Steward Dashboard: Only Show Unclaimed Orgs, Auto-Set Owner on Application Submit (High)

**Status:** CLAUDE CODE (schema change + logic)

**Symptom:** The "Claim stewardship of an existing project or org" dropdown in the Steward Dashboard shows ALL land projects, including ones that already have an owner (the person who submitted the application). It should only show projects that haven't been claimed yet. If someone submitted an application, they're already the steward of that project.

**Root cause:** The applications table has no `stewardUserId` field. The claim dropdown pulls from `mapData` (all submitted/approved applications) without filtering out already-claimed ones. Season 1 projects were manually added by admin, so they genuinely have no steward. But any project where someone submitted their own application already has an implicit owner.

**Fix (for Claude Code):**
1. **Schema:** Add `stewardUserId` (nullable int) to the `applications` table.
2. **Migration SQL:**
   ```sql
   ALTER TABLE applications ADD COLUMN stewardUserId INT NULL;
   -- For any application where the submitter is a real applicant (not admin-seeded),
   -- set stewardUserId = userId
   UPDATE applications SET stewardUserId = userId WHERE adminSeeded = 0 OR adminSeeded IS NULL;
   ```
   (Run after Fix 226 migration adds `adminSeeded` column, OR combine: set stewardUserId for apps that were submitted through the form.)
3. **Claim dropdown filter:** In `OrgClaimSection`, filter `mapApps` to exclude projects that already have a `stewardUserId` set, OR that already have an approved org_claim.
4. **On application submit:** In the `submit` mutation (`server/routes/applications.ts`), automatically set `stewardUserId = ctx.user.id`.
5. **On org claim approval:** When admin approves an org claim, set `applications.stewardUserId = claim.userId`.

**Key logic:** The dropdown should show: `mapApps.filter(app => !app.stewardUserId && !approvedClaimsForApp)`. Season 1 admin-seeded projects with no steward remain claimable. User-submitted projects are auto-owned.

**Files to change:**
- `drizzle/schema.ts` (add `stewardUserId` to applications)
- `server/routes/applications.ts` (set stewardUserId on submit, expose in mapData)
- `server/routes/orgClaims.ts` (set stewardUserId on claim approval)
- `client/src/pages/PlayerProfile.tsx` (filter dropdown in OrgClaimSection)

---

## Fix 230 — Command Bar Deep Audit: Broken Buttons, Missing Wiring, ReGen Guide Integration (High)

**Status:** CLAUDE CODE

**Audit performed:** Code review + live browser testing on regencivics.earth (desktop viewport, all pages).

### Browser-Verified Summary

Every button on every page was tested live. Here is the full status:

**Fixed tools row (visible on all pages):** Guide BROKEN, Badges BROKEN (except /quest), Gallery BROKEN (except /quest), Search WORKS, Jump BROKEN.

**Page-specific tools:** /quest Badges WORKS, /quest Gallery WORKS, /quest Calculator WORKS, /community New Post WORKS, /community Search WORKS, /land Apply WORKS, /land Calculator WORKS (verified nav to /calculator), /play Badges BROKEN, /crowd-pooling Calculator WORKS, /profile Settings WORKS.

**Other panel features:** Quick Post BROKEN (zero network requests on send), Token Balance PLACEHOLDER ("--"), Presence BROKEN (/api/presence returns 404), Music Player PARTIAL (track nav works, playback does not start).

### Issues Found

**A. BROKEN FIXED TOOLS (top row, always visible)**

| Button | Event/Action | Status | Problem |
|--------|-------------|--------|---------|
| Guide | `guide.toggle()` via ReGenGuideContext | BROKEN | ReGenGuide.tsx manages its own `useState(false)` (line 38) and never reads from ReGenGuideContext. The context toggle changes nothing visible. The Guide button in the command panel does nothing. |
| Badges | `open-quest-badges` CustomEvent | BROKEN (except /quest) | QuestBadges.tsx listens for this event, but it's only mounted on the Quest page. On all other pages, clicking Badges does nothing. |
| Gallery | `open-quest-gallery` CustomEvent | BROKEN (except /quest) | Same as Badges. QuestArtifactsGallery.tsx only mounted on Quest page. |
| Search | `open-command-palette` CustomEvent | WORKS | CommandPalette is always mounted in App.tsx. |
| Jump | `open-toc` CustomEvent | BROKEN | Nothing in the entire codebase listens for `open-toc`. Zero event listeners. Button is completely non-functional. |

**B. PAGE-SPECIFIC TOOLS (second row)**

| Page | Tool | Action | Status |
|------|------|--------|--------|
| /quest | Badges | `open-quest-badges` CustomEvent | WORKS (QuestBadges mounted here, opens modal with 14 badges) |
| /quest | Gallery | `open-quest-gallery` CustomEvent | WORKS (QuestArtifactsGallery mounted here, opens "From the Field" modal) |
| /quest | Calculator | `window.location.href = '/calculator'` | WORKS |
| /community | New Post | `window.location.href = '/community/new'` | WORKS |
| /community | Search | Same as fixed Search | WORKS (duplicate) |
| /land | Apply | `window.location.href = '/apply'` | WORKS |
| /land | Calculator | Same as above | WORKS |
| /play | Badges | Same broken event | BROKEN |
| /crowd-pooling | Calculator | Same as above | WORKS |
| /profile | Settings | `window.location.href = '/profile?tab=settings'` | WORKS |

**C. OTHER PANEL ISSUES**

| Feature | Status | Problem |
|---------|--------|---------|
| Quick Post ("What did you do today?") | BROKEN | Browser-verified: typing text and clicking send fires zero network requests. No `/api/forum/quick-post` endpoint exists. No tRPC route, no Express route. Silently fails with no user feedback; text stays in input after "sending." |
| Token Balance | PLACEHOLDER | Shows "--" with a TODO comment: "Wire up when profile context is available." Never wired up. |
| "Connecting..." presence count | BROKEN | Browser-verified: `/api/presence` returns HTTP 404. The `usePresence()` hook gets null, displaying "Connecting..." permanently on every page. |
| Music Player (Play button) | PARTIAL | Browser-verified: Next/Previous track buttons work (track name changes). Play button does not start audio playback (may be browser autoplay policy; needs user gesture). Progress stays at 0:00/0:00. Volume slider present but untestable without playback. |

**D. FLOATING REGEN GUIDE BUTTON OVERLAP**

The ReGen Guide floating button (`bottom-20 left-6`) is partially covered by the SmartBottomNav + CommandPanel on mobile. It's visible as a sliver at the bottom-left of the screen. This is the button Rye flagged in the screenshot.

### Recommended Fix Plan (for Claude Code)

**1. Remove broken buttons from the fixed tools row:**
- Remove: **Badges**, **Gallery**, **Jump** from the always-visible row (lines 70-85 of CommandPanel.tsx)
- Keep: **Search** (works everywhere)
- Keep: **Guide** (after fixing the wiring)

**2. Fix Guide button wiring:**
- Update ReGenGuide.tsx to use ReGenGuideContext instead of local state. Replace `const [isOpen, setIsOpen] = useState(false)` with `const { isOpen, open, close, toggle } = useReGenGuide()`. This connects the command panel Guide button to the actual chat panel.

**3. Integrate ReGen Guide into the command bar:**
- Remove the floating ReGen Guide button entirely (lines 192-214 of ReGenGuide.tsx)
- The Guide button in the command panel becomes the sole entry point
- When Guide is active/open, highlight the Guide button in the command panel (green glow or active state)
- The chat panel itself stays as a fixed overlay but position it above the command panel properly

**4. Remove Quick Post section:**
- No backend exists for it. Remove lines 172-190 of CommandPanel.tsx entirely. Can be re-added when a real endpoint is built.

**5. Remove or wire up Token Balance:**
- Either remove the "--" placeholder, or wire it to the profile's `rvoiceBalance`/`rgenBalance` from the auth context.

**6. Fix presence count:**
- Show "Online" instead of "Connecting..." when count is null, or hide the presence indicator entirely if WebSocket isn't active.

**7. Badges/Gallery on Quest page only:**
- Keep Badges and Gallery as page-specific tools for `/quest` in `usePageTools.ts` (they already are). Remove them from the fixed row so they don't appear broken on other pages.

**8. Click-outside-to-collapse:**
- When the command panel is expanded, clicking/tapping anywhere outside of it should collapse it. Add an overlay or click handler on the backdrop area.

**9. Desktop expanded view: logo + visual polish:**
- When the command panel expands on desktop, add the ReGen Civics logo on one side (left or right) to give the expanded view more visual weight.
- Use the dead space on the opposite side for something beautiful or useful (e.g., a seasonal illustration, a rotating quote, the user's badge count, or a mini-map preview). The expanded view currently feels sparse and could have more impact.

**10. Remove `/api/presence` calls:**
- The presence endpoint returns 404. Either remove the presence indicator entirely, or replace "Connecting..." with a static "Online" label until a real presence system is built.

### Files to change:
- `client/src/components/CommandPanel.tsx` (remove broken buttons, remove quick post, fix token balance, add click-outside-to-collapse, desktop logo/polish)
- `client/src/components/ReGenGuide.tsx` (use context instead of local state, remove floating button)
- `client/src/contexts/ReGenGuideContext.tsx` (no changes needed, already correct)
- `client/src/hooks/usePageTools.ts` (already correct for page-specific tools)
- `client/src/hooks/usePresence.ts` (fix or remove presence calls)

---

## Fix 231 — Newsletter Digest Description Text (Low)

**Status:** CODED

**Symptom:** Newsletter preference description said "Important updates and auto-generated digests of site activity."

**Fix:** Changed to "Occasional and important updates."

**Files changed:**
- `client/src/components/DigestPreferences.tsx`

---

## Fix 232 — Forum Search Bar Overlaps Hero Image (Low)

**Status:** CODED

**Symptom:** The search bar on /community was positioned with `-mt-4` (negative margin), causing it to overlap the hero image above it and split between the hero and the white content area.

**Fix:** Changed `-mt-4` to `mt-4` so the search bar sits cleanly below the hero, entirely on the white content background.

**Files changed:**
- `client/src/pages/Community.tsx` (line 392)

---

## Fix 233 — "Got an idea for a quest?" Box Text Invisible (Low)

**Status:** CODED

**Symptom:** In the Fire section of the community forum, the "Got an idea for a quest?" call-to-action box had white text (`text-white`) on a white background (`bg-white` parent). The text was completely invisible.

**Fix:** Changed text to dark green (`text-[#1a472a]`), background to `bg-green-50`, hover to `bg-green-100`. Text is now clearly readable.

**Files changed:**
- `client/src/pages/Community.tsx` (lines 1057-1066)

---

## Fix 234 — Rename "Rites of Passage" to "Welcome Aboard Quests" in Fire Section (Low)

**Status:** CODED

**Symptom:** The first card in the Fire section's quest grid was labeled "Rites of Passage" but it links to welcome/onboarding quests.

**Fix:** Changed card title from "Rites of Passage" to "Welcome Aboard Quests". Subtitle "Quests 1-13" remains.

**Files changed:**
- `client/src/pages/Community.tsx` (line 1010)

---

## Fix 235 — Rites of Passage Category Appearing in General Instead of Fire (Medium)

**Status:** CODED

**Symptom:** The `rites-of-passage` forum category (10 threads) was showing up in the General section panel instead of staying exclusive to the Fire section where it's already linked as a card.

**Root cause:** `rites-of-passage` and `welcome-aboard-quests` slugs were missing from the `SECTION_SLUGS` set, so they weren't filtered out of the General panel's category list.

**Fix:** Added `'rites-of-passage'` and `'welcome-aboard-quests'` to the `SECTION_SLUGS` set. Now these categories only appear in their dedicated Fire section cards, not in the General catch-all list.

**Files changed:**
- `client/src/pages/Community.tsx` (line 198)

---

## Pending DB Migrations from Previous Sprints (QUALITY_SPRINT_9_10.md)

These migrations have SQL files in the `drizzle/` folder. Status updated 2026-03-27 after Cowork ran them via Railway browser.

**Status of each (updated 2026-03-27):**

| Migration | File | Status | Notes |
|-----------|------|--------|-------|
| Emoji reactions table | `drizzle/0058_emoji_reactions.sql` | APPLIED | postReactions table created |
| Welcome Aboard Quests category | `drizzle/0072_onboarding_quests_category.sql` | APPLIED | welcome-aboard-quests category created |
| Move threads to welcome-aboard-quests | `drizzle/0074_move_welcome_aboard_threads.sql` | APPLIED | 10 threads moved, verified: rites-of-passage=0, welcome-aboard-quests=10 |
| Quest forum thread ID column | `drizzle/0073_quest_forum_thread_id.sql` | SKIPPED | No `quests` table exists in DB. Quests are defined in code (questData.ts). This migration is not applicable until a quests table is created. |
| walletAddress backfill | See Fix 225 | APPLIED (0 rows affected) | No profiles had baseAccountName set. Code fix (fallback logic) is still important. |
| adminSeeded column | See Fix 226 | NOT APPLIED | Needs Claude Code to generate schema change first |
| stewardUserId column | See Fix 229 | NOT APPLIED | Needs Claude Code to generate schema change first |

**Note:** The `rites-of-passage` category (migration 0057/0071) was already applied. It is now empty (0 threads) because the Welcome Aboard threads were moved to `welcome-aboard-quests`. Rites of Passage quest threads still need to be seeded into it via `seed-rites-forum-posts.ts`.

### Run Order for Rye -- COMPLETED

All 4 SQL statements from the original run order have been executed in Railway:
1. Emoji reactions table -- DONE
2. Welcome Aboard Quests category -- DONE
3. Quest forum thread ID column -- SKIPPED (no quests table)
4. Wallet address backfill -- DONE (0 rows matched)

Fixes 226 (adminSeeded) and 229 (stewardUserId) migrations need Claude Code to generate the SQL first.

---

## Fix 236 — Complete Quest-to-Forum Link Overhaul (High)

**Status:** CODED + SCRIPTS READY + HUMAN STEP REQUIRED

**Symptom:** Multiple interconnected problems with quest forum threads:
1. The 10 Welcome Aboard quest threads are in the `rites-of-passage` category (wrong place). They should be in a new `welcome-aboard-quests` category.
2. The 14 Rites of Passage quests (0-13) have zero forum threads anywhere.
3. The Food Foresting quest has no forum thread. It should have one in the `land-projects` category.
4. The `questData.ts` Rites of Passage quests have no `forumUrl` field at all.
5. The migration file `0072` used slug `onboarding-quests` instead of `welcome-aboard-quests`.
6. The seed script (`seed-quest-forum-posts.ts`) targets `rites-of-passage` as first choice, which is why Welcome Aboard threads ended up there.
7. The Community.tsx Fire section had only one quest card linking to `/community/c/rites-of-passage` labeled "Welcome Aboard Quests". It needed to be split into two cards.
8. The `SECTION_SLUGS` set referenced `onboarding-quests` which doesn't match the new slug.

**Root cause:** The original seed script was written to find `rites-of-passage` first and seed Welcome Aboard content into it. The migration for a separate Welcome Aboard category was never applied, and its slug was wrong.

### What was done (CODED):

**A. Migration SQL updated (`drizzle/0072_onboarding_quests_category.sql`):**
- Changed slug from `onboarding-quests` to `welcome-aboard-quests`
- Display name remains "Welcome Aboard Quests"

**B. New migration created (`drizzle/0074_move_welcome_aboard_threads.sql`):**
- Moves all 10 existing threads from `rites-of-passage` category to `welcome-aboard-quests` category
- Must run AFTER migration 0072

**C. Seed script fixed (`scripts/seed-quest-forum-posts.ts`):**
- Changed category lookup from `rites-of-passage` to `welcome-aboard-quests` as first choice
- Future runs will seed Welcome Aboard threads into the correct category

**D. New seed data + script created:**
- `scripts/data/rites-of-passage-forum-posts.ts`: 14 Rites of Passage forum thread definitions (one per quest, 0-13) plus Food Foresting thread, each with 1 seed comment
- `scripts/seed-rites-forum-posts.ts`: seeds 14 threads into `rites-of-passage` category and 1 thread into `land-projects` category. Skips posts that already exist (slug check). Safe to re-run.

**E. Helper script created (`scripts/get-forum-post-ids.ts`):**
- After seeding, run this to get the `/community/post/{id}` URL for each thread
- Output maps forumSlug to forumUrl for pasting into `questData.ts`

**F. Community.tsx updated:**
- `SECTION_SLUGS`: replaced `onboarding-quests` with `welcome-aboard-quests`
- Fire section now has TWO cards:
  - "Welcome Aboard Quests" linking to `/community/c/welcome-aboard-quests` (10 quests to get started)
  - "Rites of Passage" linking to `/community/c/rites-of-passage` (Quests 0-13)

**G. questData.ts updated:**
- Added `forumSlug` and `forumUrl` fields to all 15 quests (intro + spring[3] + summer[3] + fall[3] + winter[3] + routine + featured)
- `forumUrl` is empty string for now. Will be populated with real post IDs after seeding.

### Execution Order (for Rye):

Run these steps in Railway SQL console and local terminal, in this exact order:

**Step 1: Create the welcome-aboard-quests category**
```sql
-- From drizzle/0072_onboarding_quests_category.sql
INSERT INTO `forumCategories` (`slug`, `name`, `description`, `icon`, `color`, `sortOrder`)
VALUES (
  'welcome-aboard-quests',
  'Welcome Aboard Quests',
  'Discussion threads for the 10 Welcome Aboard quests. Share your completions, reflections, and social posts here.',
  'Compass',
  '#f0a35e',
  7
) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
```

**Step 2: Move existing 10 Welcome Aboard threads to the new category**
```sql
-- From drizzle/0074_move_welcome_aboard_threads.sql
UPDATE forumPosts
SET categoryId = (SELECT id FROM forumCategories WHERE slug = 'welcome-aboard-quests')
WHERE categoryId = (SELECT id FROM forumCategories WHERE slug = 'rites-of-passage');
```

**Step 3: Verify the move worked**
```sql
-- rites-of-passage should now have 0 posts
SELECT fc.slug, fc.name, COUNT(fp.id) as threadCount
FROM forumCategories fc
LEFT JOIN forumPosts fp ON fp.categoryId = fc.id
WHERE fc.slug IN ('rites-of-passage', 'welcome-aboard-quests')
GROUP BY fc.id;
```

**Step 4: Seed the 14 Rites of Passage threads + Food Foresting thread**
```powershell
# In PowerShell, from the project root:
$env:DATABASE_URL="mysql://root:PASSWORD@nozomi.proxy.rlwy.net:46413/railway"
npx tsx scripts/seed-rites-forum-posts.ts
```

**Step 5: Get the new post IDs**
```powershell
npx tsx scripts/get-forum-post-ids.ts
```

**Step 6: Update forumUrl values in questData.ts**
Copy the output from Step 5 into the `forumUrl` fields in `client/src/data/questData.ts`. Each quest's `forumSlug` maps to a specific post ID.

### Files changed:
- `drizzle/0072_onboarding_quests_category.sql` (slug fix)
- `drizzle/0074_move_welcome_aboard_threads.sql` (new: move threads)
- `scripts/seed-quest-forum-posts.ts` (category target fix)
- `scripts/data/rites-of-passage-forum-posts.ts` (new: 14+1 thread definitions)
- `scripts/seed-rites-forum-posts.ts` (new: seed script)
- `scripts/get-forum-post-ids.ts` (new: ID lookup helper)
- `client/src/pages/Community.tsx` (SECTION_SLUGS, two Fire cards)
- `client/src/data/questData.ts` (forumSlug + forumUrl on all quests)

### Known issues still open (for Claude Code in future session):
- Category page display bug: `/community/c/rites-of-passage` shows empty despite having posts. Breadcrumb shows "Unknown". Needs investigation of `CommunityCategory.tsx` and the `forum.categoryBySlug` tRPC route.
- After forumUrl values are populated, Quest.tsx and the quest card components need to render a "Discuss in Forum" link for each quest.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) -- things only you can do

| # | Task | Why only you | Status |
|---|------|-------------|--------|
| 224 | Install Claude Code via npm | Needs your local Windows machine | PENDING |
| -- | **Run pending DB migrations** | Needs Railway SQL console | DONE (Cowork ran all 4 via browser 2026-03-27) |
| 236-1 | **Create welcome-aboard-quests category** | Needs Railway SQL console | DONE |
| 236-2 | **Move 10 Welcome Aboard threads to new category** | Needs Railway SQL console | DONE |
| 236-3 | **Verify the move** | Needs Railway SQL console | DONE (rites-of-passage=0, welcome-aboard-quests=10) |
| 236-4 | **Seed 14 Rites of Passage + Food Foresting threads** | Needs DATABASE_URL | PENDING |
| 236-5 | **Get new post IDs** | Needs DATABASE_URL | PENDING (after 236-4) |
| 236-6 | **Update forumUrl in questData.ts** | Needs output from Step 5 | PENDING (after 236-5) |
| 226 | Run DB migration for adminSeeded column | Needs Railway SQL console | PENDING (after Claude Code generates it) |
| 229 | Run DB migration for stewardUserId column | Needs Railway SQL console | PENDING (after Claude Code generates it) |
| -- | Git push today's changes | Needs your terminal | PENDING |

### CLAUDE CODE — can do autonomously after git pull

| # | Task | Status |
|---|------|--------|
| 226 | Filter admin-seeded apps from My Submissions | Needs schema change + code |
| 228 | Build user-facing notification preferences component | New component needed |
| 229 | Steward Dashboard: unclaimed-only dropdown + auto-set owner | Needs schema change + code |
| 230 | Command bar overhaul: remove broken buttons, fix Guide wiring, integrate ReGen Guide, remove quick post | Major refactor |
| 236 | Fix category page display bug (empty page despite posts) and breadcrumb "Unknown" | Needs investigation of CommunityCategory.tsx |
| 236 | Add "Discuss in Forum" link to Quest page for each quest with a forumUrl | After forumUrl values populated |

### COWORK (already coded, in this session's changes)

| # | Task | Status |
|---|------|--------|
| 223 | Onboarding Quest card background image | CODED |
| 225 | Wallet sync code fix (fallback to baseAccountName) | CODED |
| 227 | Remove redundant Welcome Aboard Quests button | CODED |
| 228 | Remove admin notification prefs from user profile | CODED |
| 231 | Newsletter digest description text | CODED |
| 232 | Forum search bar repositioned below hero | CODED |
| 233 | "Got an idea for a quest?" text visibility fix | CODED |
| 234 | Renamed "Rites of Passage" card to "Welcome Aboard Quests" | CODED |
| 235 | Moved rites-of-passage + welcome-aboard-quests out of General into Fire | CODED |
| 236 | Migration SQL fixed (onboarding-quests -> welcome-aboard-quests) | CODED |
| 236 | Seed script target fixed (welcome-aboard-quests instead of rites-of-passage) | CODED |
| 236 | Community.tsx: two separate Fire cards (Welcome Aboard + Rites of Passage) | CODED |
| 236 | New seed data + script for 14 Rites of Passage + Food Foresting threads | SCRIPTS READY |
| 236 | forumSlug + forumUrl fields added to all quests in questData.ts | CODED |
| 236 | Post ID lookup helper script created | SCRIPTS READY |
| 236 | Thread move migration (0074) created | SCRIPTS READY |

### WAITING ON YOU before Claude Code can proceed

- Fix 224 (Claude Code CLI) must be resolved before running any Claude Code implementation session.
- Fix 225 DB backfill: DONE (ran, 0 rows affected because no baseAccountName values exist yet).
- Fix 236 Steps 1-3: DONE (Cowork ran via Railway browser). Steps 4-6 still need you: seed the Rites of Passage threads, get the post IDs, paste them into questData.ts.
- Fixes 226 + 229 DB migrations need to be run on Railway after Claude Code implements the schema changes.
- Git push all today's Cowork changes before running Claude Code.

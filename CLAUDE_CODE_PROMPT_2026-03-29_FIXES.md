# Claude Code Session: Remaining Fixes (10, 12, 14, 15, 17)

**Date:** 2026-03-29
**Project:** regen-civics-clean
**Depends on:** `FIXES_TO_MAKE_2026-03-29.md` (full context for each fix)

**Read `CLAUDE.md` before writing any user-facing copy.** Writing rules are non-negotiable: zero em-dashes, no AI-isms, no contrast-framing, no rhetorical questions, no passive inspiration.

---

## Context

Fixes 1-9, 11, 13, and 16 were completed in commit `490518c`. This prompt covers the 5 remaining fixes. Run `pnpm build` after each fix to confirm no regressions.

---

## Fix 12: Forum Link Audit (Do This First)

**Why first:** Other fixes are independent, but this one creates forum threads the site depends on.

### What's broken

Three data files have hardcoded forum post IDs pointing to posts that no longer exist:

1. **`client/src/data/welcomeAboardQuests.ts`** - 10 broken links (IDs 591, 593, 596-603)
2. **`client/src/data/blogPosts.ts`** - 3 references to `/community/post/560`

### Current valid forum posts in the DB

IDs 604, 605, 607-621. Nothing below 604 exists.

### What to do

#### Step A: Create a seed script `scripts/seed-welcome-aboard-threads.ts`

This script creates 11 new forum threads via the tRPC API (or direct DB insert). Use the `forum.createPost` pattern from `server/routes/forum.ts`.

**10 Welcome Aboard threads** (category: find or create "Welcome Aboard" category, or use "General Discussion"):

| # | Title |
|---|-------|
| 1 | Share Your Experience and Give Constructive Feedback |
| 2 | Write Your Regenerative Origin Story |
| 3 | Do a Regenerative Act |
| 4 | Connect with Your Bioregion |
| 5 | Make Friends and Support |
| 6 | Pledge Your Gift |
| 7 | Explore Our Foundations |
| 8 | Refer an Organisation Project |
| 9 | Refer a Land Project |
| 10 | Dream Up a Regenerative Quest |

Each thread body should match the quest's `about` field from `welcomeAboardQuests.ts`. End each post body with:
```
This is the seed thread for Welcome Aboard Quest [N]. Complete the quest steps and share your experience here.
```

**1 Contributions Discussion thread** (category: "General Discussion"):
- Title: "Contributions Discussion: How We Value Each Other's Work"
- Body: "This is the community thread for discussing how we recognize and value contributions to the Regenerative Renaissance. Share your proposals, thoughts, and questions here."

#### Step B: Update the data files with new IDs

After creating the threads (either via seed script that logs IDs, or via direct DB insert), update:

1. **`client/src/data/welcomeAboardQuests.ts`**: Replace all 10 `forumUrl` values:
   - Line 21: `/community/post/600` -> `/community/post/{NEW_ID_1}`
   - Line 36: `/community/post/591` -> `/community/post/{NEW_ID_2}`
   - Line 51: `/community/post/601` -> `/community/post/{NEW_ID_3}`
   - Line 66: `/community/post/593` -> `/community/post/{NEW_ID_4}`
   - Line 81: `/community/post/602` -> `/community/post/{NEW_ID_5}`
   - Line 96: `/community/post/603` -> `/community/post/{NEW_ID_6}`
   - Line 111: `/community/post/596` -> `/community/post/{NEW_ID_7}`
   - Line 126: `/community/post/597` -> `/community/post/{NEW_ID_8}`
   - Line 142: `/community/post/598` -> `/community/post/{NEW_ID_9}`
   - Line 158: `/community/post/599` -> `/community/post/{NEW_ID_10}`

2. **`client/src/data/blogPosts.ts`**: Replace all 3 references to `/community/post/560` with `/community/post/{NEW_CONTRIBUTIONS_ID}`:
   - Line ~1179
   - Line ~1196
   - Line ~1216

**IMPORTANT:** The seed script needs to run against the live DB on Railway. Write it so Rye can run `npx tsx scripts/seed-welcome-aboard-threads.ts` from their machine. Use environment variable `DATABASE_URL` for the connection string. Print each created post's ID to stdout so Rye can verify. Alternatively, if you can construct a direct HTTP POST to the live site's tRPC endpoint, that works too, but the seed script approach is cleaner.

**Practical approach:** Write the seed script AND write the data file updates with placeholder IDs (e.g., `PLACEHOLDER_WA_1`). Add a comment at the top of each file: `// TODO: Run seed-welcome-aboard-threads.ts and replace PLACEHOLDER_WA_* with actual IDs`. This way Rye just needs to run the script and do a find-replace.

---

## Fix 10: Profile Page Overhaul

### What's broken
- Edit button may not toggle edit mode
- Photo upload broken (depends on Fix 9, which is now done)
- No village banner header concept
- Image generation was broken (Fix 9 fixed the worker, but deployment is still needed)

### What to do

#### A. Debug the edit button
In `client/src/pages/PlayerProfile.tsx`, find where the edit button is rendered. Confirm the click handler toggles an `editMode` state and that `ProfileEditForm` (imported at line 67, rendered at line 2922) appears when edit mode is active. If the state toggle works but the form doesn't render, check for conditional rendering bugs.

#### B. Photo upload flow
The upload flows through SmartImagePicker > base64 > trpc.files.upload. Fix 9 already corrected the Cloudflare Worker return type handling. Test that the base64 upload path works independently of the AI generation path. If there's a separate server-side issue in the upload route, fix it.

#### C. Village banner
1. **Schema:** Add `bannerUrl` field to the users table. Create migration `drizzle/0094_add_banner_url.sql`:
   ```sql
   ALTER TABLE users ADD COLUMN bannerUrl VARCHAR(500) DEFAULT NULL;
   ```
2. **Schema TS:** Add `bannerUrl: varchar("bannerUrl", { length: 500 })` to the users table in `drizzle/schema.ts`.
3. **Profile header:** In `client/src/components/profile/ProfileHeader.tsx` (or `PlayerProfile.tsx`), add a banner image area at the top (full-width, ~200px tall) that shows the user's `bannerUrl` if set, or a gradient placeholder if not.
4. **Banner upload:** Add a SmartImagePicker with `context="banner"` for uploading/generating banner images. Only show the upload option when in edit mode.
5. **Server route:** In `server/routes/users.ts` or wherever profile updates are handled, accept `bannerUrl` in the update mutation.

**Note:** Rye will need to run `npx drizzle-kit push` after you write the migration.

---

## Fix 14: Glossary Propose-a-Term (Frontend Only)

### What already exists
- **Schema:** `glossaryTerms` table at `drizzle/schema.ts:1435` (with status enum: proposed/accepted/declined)
- **Server routes:** `server/routes/knowledge.ts` has `glossaryRouter` with:
  - `glossary.list` (public, approved terms)
  - `glossary.listAll` (admin)
  - `glossary.approve` (admin)
  - `glossary.reject` (admin)
  - `glossary.add` (admin)
  - `glossary.propose` (auth, creates with status "proposed")
- **Glossary page:** `client/src/pages/Glossary.tsx` exists with route `/glossary`
- **Nav:** "Glossary" link was already added to the Explore + Connect dropdown (Fix 11)

### What to build

1. **Add a "Propose a Term" button** on the existing Glossary page (`client/src/pages/Glossary.tsx`). Place it near the top, next to the search/filter controls.

2. **Propose form** (inline or modal, not a separate page): fields for `term`, `definition`, and optional `sourceThreadUrl`. Submit calls `trpc.glossary.propose`. Show success message: "Your term has been submitted for community review."

3. **Show proposed terms** with a "Proposed" badge so users can see what's pending. Use `glossary.list` for approved terms (already working) and optionally show a "Pending proposals" section using a new public query or filter.

4. **Glossary page improvements:** If the current page has a large static array of hardcoded terms alongside the DB query, consider migrating the static terms to the DB via a seed script. This is optional if time is short.

---

## Fix 15: Propose a Feature (Frontend Only)

### What already exists
- **Schema:** `featureSuggestions` and `featureSuggestionVotes` tables in `drizzle/schema.ts:1458`
- **Server routes:** `server/routes/features.ts` has `featuresRouter` with:
  - `features.list` (public, sortable by votes or newest)
  - `features.myVotes` (auth)
  - `features.create` (auth, auto-creates forum thread in "air-conversations" category)
  - `features.toggleVote` (auth)
- **Migration:** `drizzle/0093_feature_suggestions.sql` exists

### What to build

1. **Create `client/src/pages/FeatureSuggestions.tsx`** - Clone the structure from `client/src/pages/QuestSuggestions.tsx`:
   - List of existing feature suggestions with vote counts
   - Vote toggle button (heart/thumbs-up)
   - Sort by votes or newest
   - Category filter (categories: Site, Quests, Forum, Map, Fund, Game, Events, Other)
   - "Propose a Feature" form (title, description, category dropdown)
   - Link to forum thread for each suggestion

2. **Add route** in `client/src/App.tsx`:
   ```tsx
   const FeatureSuggestions = lazy(() => import("./pages/FeatureSuggestions"));
   // In the Routes:
   <Route path="/community/features"><EB><FeatureSuggestions /></EB></Route>
   ```

3. **Add entry point** in `client/src/pages/Community.tsx`: Add a "Got an idea for a feature?" card alongside the existing quest suggestion card, linking to `/community/features`.

4. **Add to navigation:** Consider adding "Propose a Feature" to the CommandPanel's community tools.

---

## Fix 17: Quest Locking Audit (Verification Only)

**Prerequisite:** The quest locking system from `CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md` must have been implemented. Check if the `useQuestUnlocks` hook exists and is wired into the Quest page.

### What to verify

Run through each rule from `QUEST_PROGRESSION_SPEC.md`:

1. Fire quest (Quest 0) and Food Foresting are always unlocked
2. Completing Fire unlocks the current season's Rites
3. Completing 1 Rite in a season unlocks the next season
4. All 4 seasons complete unlocks Epics/Seasonals/Fasting
5. Locked quest cards show an emerald lock icon and greyed-out styling
6. Hero quest cards (Fire, Food Foresting) have background images
7. Season progress ring shows X/4 completion

### Output

Create `AUDIT_QUEST_LOCKING_2026-03-29.md` with:
- Each rule: PASS / FAIL / NOT IMPLEMENTED
- File + line references for each check
- Any bugs found with suggested fixes

If the locking system hasn't been implemented yet, skip this fix and note it as BLOCKED.

---

## Execution Order

1. **Fix 12** (forum links) - Write seed script + update data files
2. **Fix 15** (feature suggestions page) - Frontend only, backend is done
3. **Fix 14** (glossary propose UI) - Frontend only, backend is done
4. **Fix 10** (profile overhaul) - Needs schema migration file
5. **Fix 17** (quest locking audit) - Verification pass, do last

Run `pnpm build` after each fix.

---

## After You're Done

### Rye's steps (things Claude Code cannot do):

| # | Task | Command |
|---|------|---------|
| 12 | Run the seed script to create forum threads | `npx tsx scripts/seed-welcome-aboard-threads.ts` |
| 12 | Replace placeholder IDs in data files with actual IDs from script output | Find-replace `PLACEHOLDER_WA_*` |
| 10 | Run DB migration for bannerUrl | `npx drizzle-kit push` |
| 14-15 | Run DB migrations for glossary + features tables (if not already pushed) | `npx drizzle-kit push` |
| 9 | Deploy image-gen worker | `cd workers/image-gen && wrangler deploy` |
| ALL | Commit and push | `git add -A && git commit -m "feat: remaining fixes 10,12,14,15,17" && git push` |
| 7 | Final visual QA in browser | Visit regencivics.earth after deploy |

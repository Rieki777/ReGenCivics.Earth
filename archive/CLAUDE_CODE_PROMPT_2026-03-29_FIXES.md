# Claude Code Session: Remaining Fixes (10, 12, 14, 15, 17)

**Date:** 2026-03-29
**Project:** regen-civics-clean
**Depends on:** `FIXES_TO_MAKE_2026-03-29.md` (full context for each fix)

**Read `CLAUDE.md` before writing any user-facing copy.** Writing rules are non-negotiable: zero em-dashes, no AI-isms, no contrast-framing, no rhetorical questions, no passive inspiration.

---

## Context

Fixes 1-9, 11, 13, and 16 were completed in commit `490518c`. Fixes 14-15 backend (routes + schema + migration files) were completed in commit `e4820ce`. This prompt covers frontend work and remaining items. Run `pnpm build` after each fix to confirm no regressions.

---

## Fix 12: Forum Link Audit (MOSTLY DONE)

### Verified via live API

All Welcome Aboard quest forum posts **exist and are valid**:
- ID 600: "Share Your Experience and Give Constructive Feedback"
- ID 591: "Quest 2: Write Your Regenerative Origin Story"
- ID 601: "Do a Regenerative Act"
- ID 593: "Quest 4: Connect with Your Bioregion"
- ID 602: "Make Friends and Support"
- ID 603: "Pledge Your Gift"
- ID 596: "Quest 7: Explore Our Foundations"
- ID 597: "Quest 8: Refer an Organisation Project"
- ID 598: "Quest 9: Refer a Land Project"
- ID 599: "Quest 10: Dream Up a Regenerative Quest"

**`client/src/data/welcomeAboardQuests.ts`**: All 10 forum URLs are VALID. No changes needed.

### What was fixed

**`client/src/data/blogPosts.ts`**: 3 references to `/community/post/560` have been updated to `/community/post/622` (newly created "Contributions Discussion" thread). This is already done in the working tree.

### What's left for Claude Code

Nothing. Fix 12 is complete. Just verify the blogPosts.ts change is committed.

---

## Fix 15: Feature Suggestions Page (Frontend Only)

**IMPORTANT:** The `featureSuggestions` and `featureSuggestionVotes` DB tables do NOT exist yet. The migration file `drizzle/0093_feature_suggestions.sql` exists but has not been applied. The `/features` route and `FeatureSuggestions.tsx` page were created in commit `e4820ce`. However, the page will error until the migration is run. Rye will run the migration (see "Rye's steps" at bottom).

### Verify

1. Confirm `client/src/pages/FeatureSuggestions.tsx` exists and builds correctly
2. Confirm the route `/features` is in `client/src/App.tsx`
3. Confirm `server/routes/features.ts` has the `featuresRouter` wired into `server/routers.ts`
4. Add an entry point in `client/src/pages/Community.tsx`: a "Got an idea for a feature?" card linking to `/features`
5. Optionally add "Propose a Feature" to CommandPanel community tools

Run `pnpm build` to confirm no compile errors.

---

## Fix 14: Glossary Propose-a-Term (Frontend Only)

### What already exists
- **Schema:** `glossaryTerms` table (two definitions in schema.ts, lines ~1435 and ~1703)
- **Server routes:** `server/routes/knowledge.ts` has `glossaryRouter` with `glossary.propose` (auth, creates with status "proposed")
- **Glossary page:** `client/src/pages/Glossary.tsx` exists at route `/glossary`
- **Nav:** "Glossary" link in Explore + Connect dropdown (added in Fix 11)

### What to build

1. **Add a "Propose a Term" button** on the existing Glossary page. Place near the top, next to search/filter controls.

2. **Propose form** (inline or modal): fields for `term`, `definition`, and optional `sourceThreadUrl`. Submit calls `trpc.glossary.propose`. Show success message: "Your term has been submitted for community review."

3. **Show proposed terms** with a "Proposed" badge so users can see what's pending.

---

## Fix 10: Profile Page Overhaul

### What's broken
- Edit button may not toggle edit mode
- Photo upload broken (Fix 9 fixed the Cloudflare Worker, but deployment is needed)
- No village banner header concept

### What to do

#### A. Debug the edit button
In `client/src/pages/PlayerProfile.tsx`, find where the edit button triggers. `ProfileEditForm` is imported at line 67 and rendered at line 2922. Confirm clicking the edit button toggles state so the form appears.

#### B. Photo upload flow
The upload flows through SmartImagePicker > base64 > trpc.files.upload. Fix 9 corrected the Cloudflare Worker return type handling. Test that the base64 upload path works independently of the AI generation path.

#### C. Village banner
1. **Schema:** Add `bannerUrl` to the users table. Create `drizzle/0094_add_banner_url.sql`:
   ```sql
   ALTER TABLE users ADD COLUMN bannerUrl VARCHAR(500) DEFAULT NULL;
   ```
2. **Schema TS:** Add `bannerUrl: varchar("bannerUrl", { length: 500 })` to the users table in `drizzle/schema.ts`.
3. **Profile header:** Add a banner image area at the top (full-width, ~200px tall) showing user's `bannerUrl` or a gradient placeholder.
4. **Banner upload:** Add SmartImagePicker with `context="banner"` in edit mode.
5. **Server route:** Accept `bannerUrl` in the profile update mutation.

**Note:** Rye will run `npx drizzle-kit push` after you write the migration.

---

## Fix 17: Quest Locking Audit (Verification Only)

**Prerequisite:** Check if the `useQuestUnlocks` hook exists and is wired into the Quest page.

### What to verify (from `QUEST_PROGRESSION_SPEC.md`)

1. Fire quest (Quest 0) and Food Foresting are always unlocked
2. Completing Fire unlocks the current season's Rites
3. Completing 1 Rite in a season unlocks the next season
4. All 4 seasons complete unlocks Epics/Seasonals/Fasting
5. Locked quest cards show an emerald lock icon and greyed-out styling
6. Hero quest cards (Fire, Food Foresting) have background images
7. Season progress ring shows X/4 completion

### Output

Create `AUDIT_QUEST_LOCKING_2026-03-29.md` with PASS / FAIL / NOT IMPLEMENTED for each rule, plus file and line references.

If the locking system hasn't been implemented yet, skip and note as BLOCKED.

---

## Execution Order

1. **Fix 12** (forum links): DONE. Just commit the blogPosts.ts change.
2. **Fix 15** (feature suggestions): Verify page + add Community.tsx entry point
3. **Fix 14** (glossary propose): Add propose form to Glossary.tsx
4. **Fix 10** (profile overhaul): Debug edit, write migration, add banner UI
5. **Fix 17** (quest locking audit): Verification pass, do last

Run `pnpm build` after each fix.

---

## Rye's Steps (things Claude Code cannot do)

| # | Task | Command / Action |
|---|------|------------------|
| 15 | **Run feature suggestions migration** | `mysql -h <host> -u <user> -p < drizzle/0093_feature_suggestions.sql` OR `npx drizzle-kit push` |
| 10 | Run bannerUrl migration (after Claude Code writes it) | `npx drizzle-kit push` |
| 9 | Deploy image-gen worker | `cd workers/image-gen && wrangler deploy` |
| ALL | Commit and push | `git add -A && git commit && git push` |
| ALL | Final visual QA in browser | Visit regencivics.earth after deploy |

**Note:** The "Apply 1 change" banner in Railway has an error. Check what that staged change is and either deploy or discard it before deploying new code.

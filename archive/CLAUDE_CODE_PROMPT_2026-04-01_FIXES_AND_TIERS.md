# Claude Code Execution Prompt - 2026-04-01: Fixes + Citizenship Tier Foundation

## What This Is

Two jobs in one session, in this order:

**Part A:** 7 fixes from `FIXES_TO_MAKE_2026-04-01.md` (quick wins, do these first)
**Part B:** Citizenship Tier foundation build from `CITIZENSHIP_TIERS_SPEC.md` (the big one)

Read both docs fully before starting. Read CLAUDE.md for writing rules (no em-dashes, no AI words, no contrast-framing).

---

## PART A: FIXES (do these first, in priority order)

### Fix 5 - Gate admin sections on My Submissions tab (HIGH)

**File:** `client/src/pages/PlayerProfile.tsx` (SubmissionsTab component, ~lines 2399-2483)

**Task:** The "Land Project Applications" section and "Investor Inquiry" section on the My Submissions tab are visible to all users. They should only show for admin users.

**How:**
1. Find how `isAdmin` is determined elsewhere in PlayerProfile.tsx (search for existing admin checks in the file)
2. Wrap the "Land Project Applications" section (lines ~2408-2429) in an admin check: only render if user is admin
3. Wrap the "Investor Inquiry" section (lines ~2467-2479) in the same admin check
4. Keep "Incubator Season Campaigns," "Saved Contribution Profiles," and "Organization Claims" visible to all users
5. If the tab becomes empty for non-admin users (no campaigns, no saved profiles, no org claims), either hide the tab entirely or show a helpful message

---

### Fix 3 - Notification toggle visual not updating (HIGH)

**File:** `client/src/components/UserNotificationPreferences.tsx` (RecordingEmailToggle, ~lines 107-145)

**Task:** The Session Recording Updates toggle fires the mutation successfully (toast appears) but the visual toggle doesn't move.

**How:**
1. Find what `enabled` state reads from (line ~124). It's likely from a tRPC query.
2. In the mutation's `onSuccess` callback, invalidate the query that provides the `enabled` state, OR optimistically update local state
3. Test pattern: the other toggles in the same file (Community Updates, Quest & Event Announcements) likely work correctly. Compare their implementation to RecordingEmailToggle and make it consistent.

---

### Fix 2 - Add clickable links to On-Chain Tracking (MEDIUM)

**File:** `client/src/pages/PlayerProfile.tsx` (~lines 1703-1734)

**Task:** Make the Hypha DAO and Base Blockchain info boxes clickable with real links.

**Changes:**
- **Hypha DAO box:** If the player has `hyphaProfileUrl`, link to it. Otherwise link to `https://app.hypha.earth`. Add external link icon. `target="_blank" rel="noopener noreferrer"`
- **Base Blockchain box:** If the player has `walletAddress`, link to `https://basescan.org/address/{walletAddress}`. If no wallet, link to `https://basescan.org`. Add external link icon. `target="_blank" rel="noopener noreferrer"`
- Style both as clickable cards (hover state, cursor pointer)

---

### Fix 7 - Rename contribution tier "Steward" to "Cultivator" (MEDIUM)

**Task:** The 70th percentile contribution score tier is currently "Steward." Rename to "Cultivator" everywhere.

**How:**
1. In `server/routes/game.ts`, find `getTierFromPercentile()` function. Change the return value for the 70th percentile from `"Steward"` to `"Cultivator"`
2. Search the entire codebase for the string `"Steward"` in context of contribution tiers (not citizenship tiers). Update all references.
3. Check `TierBadge` component, any tier color mappings, any seed data that references contribution tier names
4. Do NOT rename any references to the citizenship tier "Steward" (those are correct and stay as "Steward")

---

### Fix 6 - Update OG description (MEDIUM, partial)

**Files:** `client/index.html` (lines 57-77), `client/src/components/SEO.tsx`

**Task:** Update the social sharing description. Do NOT change the OG image yet (Rye will provide a new one).

**Changes:**
1. In `client/index.html`, update the `og:description` (line 61) and `twitter:description` (line 73) from:
   "ReGen Civics is a fund for regenerative land projects, who also runs quests and games for real-world regeneration."
   To:
   "A fund and a game for regenerative land projects. Do quests, earn tokens, fund real-world regeneration."
2. Update the `og:title` (line 60) and `twitter:title` (line 72) from:
   "ReGen Civics: Fund and Game for Regenerative Land Projects"
   To:
   "ReGen Civics: Infinite Game for the Regenerative Renaissance"
3. In `client/src/components/SEO.tsx`, update the default title and description constants to match
4. Leave the OG image as-is for now

---

### Fix 4 - Quest 8 experience text (LOW)

**File:** `client/src/components/QuestFilter.tsx` (~line 254)

**Task:** Change the `experience` field for `"quest-8"` in QUEST_METADATA from `"A morning walk"` to `"An inner exploration"`.

One-line change.

---

### Fix 1 - Background image (MEDIUM, may be blocked)

**File:** `client/src/pages/Home.tsx` (lines 183-184, 191-192)

**Task:** Check if new homepage background images exist anywhere in the repo or in recent git history. The MEGABATCH prompt references `home-desktop-new.webp` and `home-mobile-new.webp` but they don't exist in `client/public/images/backgrounds/`.

**How:**
1. Search the repo: `git log --diff-filter=A --name-only -- "*home*new*"` and `find . -name "*home*new*"`
2. Check if images were generated but not committed
3. If found, copy to `client/public/images/backgrounds/` and update Home.tsx references
4. If NOT found, skip this fix and note it as BLOCKED (Rye needs to provide/regenerate the images)

---

## PART B: CITIZENSHIP TIER FOUNDATION BUILD

Read `CITIZENSHIP_TIERS_SPEC.md` fully before starting this section. That document is the single source of truth for everything below.

### Step 1: Database Schema Changes

**Add to `drizzle/schema.ts`:**

1. Add `citizenshipTier` enum field to `playerProfiles`:
   ```
   citizenshipTier: mysqlEnum('citizenshipTier', ['explorer', 'co_creator', 'steward', 'sage']).default('explorer').notNull()
   citizenshipTierUpdatedAt: datetime('citizenshipTierUpdatedAt')
   graceStartedAt: datetime('graceStartedAt')
   ```

2. Create `citizenshipTierHistory` table:
   ```
   id: serial primary key
   userId: int, FK to users
   fromTier: mysqlEnum(['explorer', 'co_creator', 'steward', 'sage'])
   toTier: mysqlEnum(['explorer', 'co_creator', 'steward', 'sage'])
   reason: mysqlEnum(['automatic', 'admin_override', 'nomination', 'grace_period_expired'])
   promotedBy: int, nullable, FK to users
   createdAt: datetime, default now
   ```

3. Create `seasonal_councils` table:
   ```
   id: serial primary key
   seasonId: int, FK to game_seasons
   status: mysqlEnum(['upcoming', 'active', 'completed']).default('upcoming')
   meetingDate: datetime, nullable
   notes: text, nullable
   createdAt: datetime, default now
   ```

4. Create `seasonal_council_members` table:
   ```
   id: serial primary key
   councilId: int, FK to seasonal_councils
   userId: int, FK to users
   role: mysqlEnum(['top_contributor', 'core_team', 'elected'])
   attendedAt: datetime, nullable
   createdAt: datetime, default now
   ```

5. Create `lunar_cycles` table:
   ```
   id: serial primary key
   startDate: datetime (astronomical new moon in GMT)
   endDate: datetime (next new moon in GMT)
   seasonId: int, nullable, FK to game_seasons
   name: varchar(100), nullable (e.g., "Worm Moon")
   status: mysqlEnum(['upcoming', 'active', 'completed']).default('upcoming')
   createdAt: datetime, default now
   ```

6. Create `batch_job_runs` table:
   ```
   id: serial primary key
   jobType: varchar(50)
   startedAt: datetime
   completedAt: datetime, nullable
   status: mysqlEnum(['running', 'success', 'partial_failure', 'failed']).default('running')
   promotions: int, default 0
   demotions: int, default 0
   playersProcessed: int, default 0
   errors: json, nullable
   triggeredBy: varchar(100)
   createdAt: datetime, default now
   ```

7. Add `endorserTierAtTime` varchar(20) nullable to `game_endorsements` table (snapshot of endorser's citizenship tier at endorsement time)

**Generate the migration** after adding all schema changes.

### Step 2: Seed Citizenship Game Variables

Create a seed script that inserts all citizenship-related Game Variables into the `game_variables` table. Use the existing pattern from other game variable seeds.

Variables to seed (see CITIZENSHIP_TIERS_SPEC.md for full list):
- All `citizenship.explorer.*` variables (9 variables)
- All `citizenship.co_creator.*` variables (9 power variables + 5 requirement variables)
- All `citizenship.steward.*` variables (9 power variables + 6 requirement variables)
- All `citizenship.sage.*` variables (9 power variables + 7 requirement variables)
- Grace period variables (4 variables)
- Trust graph variables (3 variables)

Category for all: `"citizenship"`

Check if variables already exist before inserting (upsert pattern).

### Step 3: Seed Lunar Cycles (2026-2027)

Create a seed script with astronomical new moon dates for the next 2 years (2026-04 through 2028-03). Use published astronomical data. Each lunar cycle is one new moon to the next.

New moon dates for 2026 (GMT):
- Apr 17, May 16, Jun 15, Jul 14, Aug 13, Sep 11, Oct 11, Nov 9, Dec 9

New moon dates for 2027 (GMT):
- Jan 7, Feb 6, Mar 8, Apr 6, May 6, Jun 4, Jul 4, Aug 2, Sep 1, Oct 1, Oct 30, Nov 29, Dec 28

New moon dates for 2028 (GMT):
- Jan 27, Feb 25, Mar 26

Set status based on current date. Link each lunar cycle to its parent season if seasons are seeded.

### Step 4: Nightly Batch Job (Server Route)

Create `server/routes/batchJobs.ts` (or add to an existing admin route file):

1. **Admin-only tRPC endpoint:** `batchJobs.runNightlyGameUpdate`
   - Creates a `batch_job_runs` entry with status 'running'
   - Runs the 6 steps in order (see SEEDS_VISION_IMPLEMENTATION_SPEC.md "RESOLVED: Nightly Batch Job Spec")
   - Step 1: Advance lunar cycles
   - Step 2: Recalculate contribution scores + percentiles (use existing scoring logic)
   - Step 3: Recalculate trust scores (use formula from spec)
   - Step 4: Check citizenship tier requirements, promote/demote with grace
   - Step 5: Update gratitude multipliers
   - Step 6: Log completion
   - Each step wrapped in try/catch. On error, log to errors array, continue.
   - Update batch_job_runs entry with final status, counts, completedAt.

2. **Admin-only tRPC endpoint:** `batchJobs.getJobHistory`
   - Returns recent batch_job_runs entries for admin dashboard

3. **Admin-only tRPC endpoint:** `batchJobs.getGracePeriodPlayers`
   - Returns players currently in grace period with their graceStartedAt and current tier

### Step 5: Citizenship Tier Checker Logic

The core function called by the nightly job (Step 4 above). For each active player:

```
function checkCitizenshipTier(player, gameVariables):
  // Check highest tier the player qualifies for
  qualifiesForSage = checkSageRequirements(player, gameVariables)
  qualifiesForSteward = checkStewardRequirements(player, gameVariables)
  qualifiesForCoCreator = checkCoCreatorRequirements(player, gameVariables)

  highestQualifiedTier = determine highest tier they qualify for

  if highestQualifiedTier > currentTier:
    promote(player, highestQualifiedTier, 'automatic')
    clear graceStartedAt
    return 'promoted'

  if highestQualifiedTier >= currentTier:
    clear graceStartedAt (they still qualify)
    return 'maintained'

  if highestQualifiedTier < currentTier:
    if graceStartedAt is null:
      set graceStartedAt = now
      return 'grace_started'
    if grace period has elapsed:
      demote(player, currentTier - 1 level, 'grace_period_expired')
      clear graceStartedAt
      return 'demoted'
    return 'in_grace'
```

Each requirement check reads thresholds from Game Variables (not hardcoded). The `endorsement_from_steward_or_sage` requirement checks the endorser's `citizenshipTier` at the time of endorsing (from `endorserTierAtTime` field).

### Step 6: Admin UI for Citizenship Tiers

Add a new admin page or section: **"Citizenship Tiers"**

**Layout:** 4-column comparison grid (Explorer | Co-Creator | Steward | Sage)

**Each column shows:**
- Tier name and icon
- Requirements (pulled from Game Variables, each editable inline or via modal)
- Powers (toggle switches, pulled from Game Variables)
- Gratitude budget + multiplier
- Harvest multiplier
- Current player count in this tier

**Additional admin controls:**
- "Override Player Tier" form: search player, select new tier, enter reason, submit
- "Grace Period" section: list players currently in grace, with option to exempt
- "Run Nightly Job" button with last run status

### Step 7: Update Endorsement to Capture Endorser Tier

In `server/routes/game.ts`, where endorsements are created: when saving a new endorsement to `game_endorsements`, also store the endorser's current `citizenshipTier` in the new `endorserTierAtTime` field.

### Step 8: Surface Citizenship Tier on Profile

In the player profile page, display the player's citizenship tier:
- Tier badge near the player name (use existing TierBadge component pattern, extend for citizenship tiers)
- If you're viewing your own profile and you're in grace period, show a gentle notification: "Your [tier] status requires [missing requirements]. You have [time remaining] to meet them."

---

## Completion Checklist

After all work is done, verify:

- [ ] Fix 5: My Submissions tab hides admin sections for non-admin users
- [ ] Fix 3: Notification toggle visually updates on click
- [ ] Fix 2: On-Chain Tracking links work (Hypha -> app.hypha.earth, Base -> basescan.org)
- [ ] Fix 7: "Steward" renamed to "Cultivator" in contribution score tiers only
- [ ] Fix 6: OG description and title updated
- [ ] Fix 4: Quest 8 experience says "An inner exploration"
- [ ] Fix 1: Background images updated (or noted as BLOCKED)
- [ ] Schema: All 6 new tables + field additions in drizzle/schema.ts
- [ ] Migration: Generated and ready to run
- [ ] Seed: Citizenship Game Variables seeded
- [ ] Seed: Lunar cycles seeded (2026-2028)
- [ ] Server: Nightly batch job endpoint working
- [ ] Server: Tier checker logic implemented with all requirement checks
- [ ] Server: Endorsement captures endorser tier at time of endorsing
- [ ] Admin: Citizenship Tiers admin page with comparison grid
- [ ] Admin: Nightly job dashboard widget with "Run Now"
- [ ] Profile: Citizenship tier badge displayed
- [ ] Profile: Grace period notification for at-risk players
- [ ] No hardcoded tier thresholds (all from Game Variables)
- [ ] No em-dashes in any content
- [ ] No AI word patterns in any user-facing text

---

## Reference Documents

- `CITIZENSHIP_TIERS_SPEC.md` - Single source of truth for tier definitions, powers, requirements, Game Variables
- `SEEDS_VISION_IMPLEMENTATION_SPEC.md` - Trust score formula, nightly job spec, gratitude multiplier mechanics, full gap analysis
- `FIXES_TO_MAKE_2026-04-01.md` - Detailed fix descriptions with file paths and line numbers
- `CLAUDE.md` - Writing rules, project conventions, all planning doc references

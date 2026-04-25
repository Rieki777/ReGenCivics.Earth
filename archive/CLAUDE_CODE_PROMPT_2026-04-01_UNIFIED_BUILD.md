# Claude Code Unified Build Prompt - 2026-04-01

## READ THIS FIRST

This prompt consolidates ALL outstanding work into one execution plan. It replaces:
- `CLAUDE_CODE_PROMPT_2026-04-01_FIXES_AND_TIERS.md` (absorbed into this prompt)
- `CLAUDE_CODE_PROMPT_2026-03-31_GAME_SYSTEM.md` (absorbed and updated)
- `CLAUDE_CODE_PROMPT_2026-03-31_MEGABATCH.md` (superseded)

Read ALL of the following before writing a single line of code:
- `CLAUDE.md` (writing rules, project conventions)
- `CITIZENSHIP_TIERS_SPEC.md` (tier system, single source of truth)
- `SEEDS_VISION_IMPLEMENTATION_SPEC.md` (33 features + gap analysis)
- `REGEN_GAMES_SPEC_V1.md` (game system, 24 features, 5 phases)
- `QUEST_PROGRESSION_SPEC.md` (quest locking, client-side)
- `LIVING_TREE_VISUALIZATION_SPEC.md` (tree visual spec)
- `DRAFT_GAME_AND_ECONOMY_PAGES.md` (economy page copy, needs tier name updates)
- `FIXES_TO_MAKE_2026-04-01.md` (7 fixes from screenshots)
- `SOCIAL_SHARING_SPEC.md` (12 social sharing initiatives, OG images, referral system)

---

## PRECEDENCE RULES (when specs conflict, follow this order)

1. `CITIZENSHIP_TIERS_SPEC.md` + `SEEDS_VISION_IMPLEMENTATION_SPEC.md` (newest, Rye's latest decisions)
2. `REGEN_GAMES_SPEC_V1.md` (game system foundation)
3. Everything else

---

## 10 CROSS-SPEC CONFLICTS AND THEIR RESOLUTIONS

Read these carefully. They override specific sections of older specs.

### Conflict 1: Trust Score System
- OLD (REGEN_GAMES_SPEC_V1 Part 6): Trust multiplier 0.5x-1.5x based on endorsements + account age + flags
- NEW (SEEDS_VISION gap analysis): Trust score 0.0-2.0 based on 7 inputs with Game Variable weights
- **RESOLUTION:** Use the NEW trust score system from SEEDS_VISION. Ignore the trust multiplier section in REGEN_GAMES_SPEC Part 6. The trust.weight.* Game Variables are the source of truth.

### Conflict 2: Gratitude Budget
- OLD (REGEN_GAMES_SPEC_V1 Part 4.2): Budget = base(5) + percentile*0.1, max 15 per season
- NEW (CITIZENSHIP_TIERS_SPEC): Flat per citizenship tier. Explorer:3, Co-Creator:5, Steward:8, Sage:13 per season
- **RESOLUTION:** Use the NEW tier-based budgets. Ignore the percentile-scaled budget formula in REGEN_GAMES_SPEC.

### Conflict 3: Citizenship Tier Names
- OLD (DRAFT_GAME_AND_ECONOMY_PAGES.md): Visitor / Resident / Citizen
- NEW (CITIZENSHIP_TIERS_SPEC): Explorer / Co-Creator / Steward / Sage
- **RESOLUTION:** When building any page that references tiers (especially /economy), use the NEW names. Replace all "Visitor" with "Explorer", "Resident" with "Co-Creator", "Citizen" with "Steward or Sage" (context-dependent). The DRAFT copy needs rewriting.

### Conflict 4: Seasonal Council Design
- OLD (REGEN_GAMES_SPEC_V1 Part 7.4): Formal voting system with council_proposals + council_votes tables, structured powers, binding/advisory toggle
- NEW (SEEDS_VISION): Internal advisory body. Top 7 + core team + elected. Informal. Will evolve.
- **RESOLUTION:** Use the NEW design. Drop `council_proposals` and `council_votes` tables from REGEN_GAMES_SPEC. Use `seasonal_councils` + `seasonal_council_members` from SEEDS_VISION instead. The council is informal for now; formal governance goes through Hypha.

### Conflict 5: Proposal System
- OLD (REGEN_GAMES_SPEC_V1): Proposals only inside seasonal councils
- NEW (SEEDS_VISION #16): Standalone proposals system. Any Co-Creator+ can submit. Community signals (upvotes). Threshold triggers move to Hypha. 8 templates.
- **RESOLUTION:** Use the NEW standalone proposals system. Build `proposals`, `proposalVotes`, `proposalUpdates` tables per SEEDS_VISION. Proposals are discussion/formation/signaling. Actual governance through Hypha.

### Conflict 6: Harvest Distribution
- OLD (REGEN_GAMES_SPEC_V1 Part 7.2): 10,000 $ReGen pool with power law curve, min 10th percentile
- NEW (SEEDS_VISION): 30/20/20/30 split (contributors/BFFs/orgs/treasury). Full distribution at Go Live.
- **RESOLUTION:** Use the NEW split. All harvest variables are Game Variables visible in admin and on Game Mechanics page. Full automated distribution does not run until Go Live thresholds are met (50 orgs, 500 players, 10 land projects). However, early seasons CAN distribute small amounts of $ReGen as testing rounds to validate the mechanics and give players a taste of how it works. Build the distribution logic so it can be triggered manually by admin with a configurable pool size. The `seasonal_harvests` snapshot table tracks season-end data regardless.

### Conflict 7: Contribution Score Tier at 70th Percentile
- OLD: "Steward" (REGEN_GAMES_SPEC, quest tier references)
- NEW: "Cultivator" (CITIZENSHIP_TIERS_SPEC)
- **RESOLUTION:** Rename to "Cultivator" in `getTierFromPercentile()` and all references. Quest unlock tier names that said "Steward tier" now say "Cultivator tier."

### Conflict 8: Co-Creator Requirements
- OLD (REGEN_GAMES_SPEC_V1 Part 8.6): 90th percentile threshold
- NEW (CITIZENSHIP_TIERS_SPEC): 15th percentile + Fire quest + 1 rite + 5 gratitude + 2 seasons active
- **RESOLUTION:** Use the NEW multi-requirement system. The old "90th percentile = Co-Creator invitation" feature is replaced by the citizenship tier progression.

### Conflict 9: Forum Reputation Weighting
- REGEN_GAMES_SPEC_V1 Part 8.9: Post reactions weighted by voter's contribution percentile (1x-2x)
- This does NOT conflict with "all governance through Hypha." Forum weighting is about post visibility, not governance voting. **KEEP AS-IS.**

### Conflict 10: Governance Voting Weight
- OLD (REGEN_GAMES_SPEC_V1 + DRAFT_GAME_AND_ECONOMY_PAGES): Per-tier voting weight (1x/2x/4x/8x)
- NEW (Rye's explicit direction): All formal governance through Hypha. Vote weight = RGVoice held. No per-tier voting weight.
- **RESOLUTION:** Remove all per-tier governance voting weight. Our proposal system is internal signaling only (simple upvotes). These internal signal tokens let the community form positions and gauge support. Players then take those signal results to Hypha to create real on-chain proposals, where voting power is based on RGVoice held and real blockchain token distribution happens. Our platform handles discussion, formation, and signaling. Hypha handles binding votes and execution.

### Tier Name Mapping Note
The new citizenship tier names map directly to the old names used in DRAFT_GAME_AND_ECONOMY_PAGES.md:
- Explorer = formerly "Visitor" (entry level)
- Co-Creator = formerly "Resident" (earned through participation)
- Steward = formerly "Citizen" (earned through sustained contribution)
- Sage = NEW tier (no old equivalent, earned through deep long-term contribution)

When updating copy in economy pages and anywhere else, use this mapping. "Sage" is an addition to the system, not a rename.

---

## BUILD ORDER (7 tracks, execute in order within each track, parallelize across tracks where noted)

### TRACK 0: QUICK FIXES (do first, ~30 minutes)

From `FIXES_TO_MAKE_2026-04-01.md`:

**Fix 5 - Gate admin sections on My Submissions tab (HIGH)**
File: `client/src/pages/PlayerProfile.tsx` (~line 2399, SubmissionsTab)
Gate "Land Project Applications" and "Investor Inquiry" sections behind admin check. Keep other sections visible to all users.

**Fix 3 - Notification toggle visual (HIGH)**
File: `client/src/components/UserNotificationPreferences.tsx` (~line 107)
Fix RecordingEmailToggle: after mutation succeeds, invalidate the query cache or optimistically update local state so the toggle visual moves.

**Fix 2 - On-Chain Tracking links (MEDIUM)**
File: `client/src/pages/PlayerProfile.tsx` (~line 1703)
Hypha DAO: Link to `https://app.hypha.earth` (or user's hyphaProfileUrl if linked). Base Blockchain: Link to `https://basescan.org/address/{walletAddress}` (or basescan.org if no wallet). Both clickable, external link icon, target="_blank".

**Fix 7 - Rename "Steward" to "Cultivator" (MEDIUM)**
File: `server/routes/game.ts` (getTierFromPercentile function)
Change 70th percentile return from "Steward" to "Cultivator". Search and update all references (TierBadge, seed data, UI strings). Do NOT rename citizenship tier "Steward."

**Fix 6 - OG description update (MEDIUM)**
Files: `client/index.html` (lines 57-77), `client/src/components/SEO.tsx`
Update og:description to: "A fund and a game for regenerative land projects. Do quests, earn tokens, fund real-world regeneration."
Update og:title to: "ReGen Civics: Infinite Game for the Regenerative Renaissance"
Leave OG image for now (generated separately).

**Fix 4 - Quest 8 experience text (LOW)**
File: `client/src/components/QuestFilter.tsx` (~line 254)
Change `experience: "A morning walk"` to `experience: "An inner exploration"` for quest-8 in QUEST_METADATA.

**Fix 1 - Homepage background image (MEDIUM)**
Generate a new homepage background using the image generation tool. Style direction: a lush regenerative village scene, but more futuristic and elven. Think: treehouse city integrated with nature, abundant fruit trees, diverse wildlife (deer, birds, small animals), children playing in gardens and streams, waterfalls, rope bridges between ancient trees, warm golden sunlight, bioluminescent accents, cobblestone paths winding through food forests. Rich greens, golds, and earth tones. Studio Ghibli meets elven architecture. Community gathering spaces visible. Not cartoonish, more painterly and warm. Two versions needed: desktop (wide, 1920x1080ish) and mobile (tall, 768x1200ish). Save as `home-desktop.webp` and `home-mobile.webp` in `client/public/images/backgrounds/`, replacing the old ones.

**OG Image Generation (MEDIUM)**
Generate a new OG image (1200x630, save as jpg). Same theme as the homepage background: regenerative elven village, children, fruit trees, animals, golden light. But composed for the OG safe zone (key content in center 800x400). Should work well at small preview sizes. Save as `client/public/og-default.jpg`, replacing the old one.

---

### TRACK 1: DATABASE FOUNDATION (do before any feature work)

All schema changes in one migration. Add to `drizzle/schema.ts`:

**New fields on existing tables:**

playerProfiles:
- `citizenshipTier` enum ('explorer','co_creator','steward','sage') default 'explorer'
- `citizenshipTierUpdatedAt` datetime nullable
- `graceStartedAt` datetime nullable
- `contributionScore` float default 0 (if not already present as column)
- `contributionScoreRaw` int default 0 (if not already present)
- `currentTier` varchar(50) default 'Seedling' (if not already present)
- `trustScore` float default 1.0 (already exists, just confirm)
- `scoreLastCalculatedAt` datetime nullable
- `seasonsCompleted` int default 0

game_endorsements:
- `endorserTierAtTime` varchar(20) nullable

playerContributions:
- extend capitalType enum to include 'health' if not already present
- `artifactType` varchar(50) nullable
- `artifactUrl` text nullable
- `artifactText` text nullable
- `visibility` enum ('public','community','private') default 'community'

applications (land projects):
- `projectStatus` enum ('applied','accepted','active','established','anchor') default 'applied'
- `projectStatusUpdatedAt` datetime nullable
- `endorsementCount` int default 0
- `contributionCount` int default 0
- `fundedCampaignCount` int default 0
- `seasonsActive` int default 0

postReactions:
- `reactionWeight` float default 1.0

organisations:
- `regenerativeScore` float nullable
- `regenerativeTier` enum ('regular','reputable','sustainable','regenerative','thriving') nullable
- `communityRatingsCount` int default 0

**New tables (create all):**

citizenshipTierHistory: id, userId (FK users), fromTier (enum), toTier (enum), reason (enum: 'automatic','admin_override','nomination','grace_period_expired'), promotedBy (int nullable FK users), createdAt

seasonal_councils: id, seasonId (FK game_seasons), status (enum: 'upcoming','active','completed') default 'upcoming', meetingDate (datetime nullable), notes (text nullable), createdAt

seasonal_council_members: id, councilId (FK), userId (FK), role (enum: 'top_contributor','core_team','elected'), attendedAt (datetime nullable), createdAt

lunar_cycles: id, startDate (datetime), endDate (datetime), seasonId (int nullable FK), name (varchar 100 nullable), status (enum: 'upcoming','active','completed') default 'upcoming', createdAt

batch_job_runs: id, jobType (varchar 50), startedAt (datetime), completedAt (datetime nullable), status (enum: 'running','success','partial_failure','failed') default 'running', promotions (int default 0), demotions (int default 0), playersProcessed (int default 0), errors (json nullable), triggeredBy (varchar 100), createdAt

proposals: id, authorId (FK users), title (varchar 200), description (text), category (enum: 'fund_allocation','game_variable','new_quest','food_economy','platform_feature','community','bff_initiative','partnership','community_agreement','other'), status (enum: 'idea','draft','signaling','threshold_reached','in_governance','passed','implemented','declined'), templateType (varchar 50 nullable), forumThreadId (int nullable FK), signalVoteCount (int default 0), bioregionId (int nullable FK), createdAt, updatedAt

proposalVotes: id, proposalId (FK), userId (FK), createdAt (unique constraint on proposalId + userId)

proposalUpdates: id, proposalId (FK), authorId (FK), content (text), createdAt

organisation_ratings: id, raterId (FK users), organisationId (FK organisations), soilScore (tinyint), biodiversityScore (tinyint), waterScore (tinyint), chemicalFreeScore (tinyint), communityScore (tinyint), workerWellbeingScore (tinyint), overallScore (float), note (text nullable), seasonId (FK), createdAt

localFoodApplications: id, producerName (varchar 200), contactEmail (varchar 200), contactName (varchar 200), bioregionId (int nullable FK), locationLat (float nullable), locationLng (float nullable), description (text), productsOffered (json), regenerativePractices (text), websiteUrl (varchar 500 nullable), localScaleProfileUrl (varchar 500 nullable), status (enum: 'submitted','under_review','approved','active','declined') default 'submitted', communityRatingsCount (int default 0), regenerativeScore (float nullable), createdAt, updatedAt

economicSuggestions: id, authorId (FK), title (varchar 200), description (text), category (varchar 100), status (enum: 'open','in_review','accepted','declined') default 'open', voteCount (int default 0), forumThreadId (int nullable), createdAt, updatedAt

economicSuggestionVotes: id, suggestionId (FK), userId (FK), createdAt

activity_feed_events: id, eventType (varchar 50), actorType (varchar 20), actorId (int), targetType (varchar 20 nullable), targetId (int nullable), metadata (json nullable), visibility (enum: 'public','community','admin') default 'community', createdAt

quest_unlock_tiers: id, name (varchar 100), minimumPercentile (int), requiresRitesComplete (boolean default false), createdAt

quest_tier_assignments: id, tierId (FK), questId (int), createdAt

seasonal_harvests: id, userId (FK), seasonId (FK), questsCompleted (int default 0), tokensEarned (float default 0), referralSignups (int default 0), newTier (varchar 50 nullable), scoreAtEnd (float default 0), percentileAtEnd (int default 0), createdAt

share_events: id, userId (FK), contentType (varchar 50), contentId (int), platform (varchar 50), sharedUrl (text), createdAt

referrals: id, referrerUserId (FK users), referredUserId (FK users nullable), referralCode (varchar 100), source (varchar 50), context (varchar 100), landingUrl (text nullable), signedUpAt (datetime nullable), firstQuestAt (datetime nullable), firstContributionAt (datetime nullable), rewardsEarned (float default 0), createdAt

NOTE: Do NOT create `council_proposals` or `council_votes` tables (from REGEN_GAMES_SPEC). Those are superseded by the standalone `proposals` system.

**Check for existing tables/columns first.** Many of these may already exist (game_variables, game_variable_history, gratitude_transactions, gratitude_budgets, endorsements, flags, seasons). Only add what's missing. Use Drizzle introspection or check schema.ts.

Generate the migration after all additions.

---

### TRACK 2: SEED DATA

**2A: Citizenship Game Variables**
Seed all citizenship.* variables from CITIZENSHIP_TIERS_SPEC.md (9 power variables x 4 tiers = 36 variables + requirement variables per tier + grace period variables). Category: "citizenship". Upsert pattern (don't duplicate if they exist).

**2B: Trust Score Game Variables**
Seed all trust.weight.* and trust.composting_rate variables from SEEDS_VISION spec. Category: "trust".

**2C: Harvest Distribution Game Variables**
Seed all harvest.* variables from SEEDS_VISION spec. Category: "harvest". Include harvest.test_pool_size (default 0, admin sets for early-season test distributions) and harvest.go_live_enabled (default false).

**2D: Gratitude Game Variables (update existing)**
Update gratitude budget variables to use citizenship tier values (Explorer:3, Co-Creator:5, Steward:8, Sage:13). Seed gratitude.trust_graph.* variables. Category: "gratitude".

**2E: Scoring Weight Variables**
Seed all scoring.weights.* from REGEN_GAMES_SPEC_V1 Part 1.4 (~30 variables). Category: "scoring". Upsert.

**2F: Lunar Cycles (2026-2028)**
Seed astronomical new moon dates (GMT). See SEEDS_VISION spec for dates.

**2G: Referral Reward Game Variables**
Seed referral reward variables. Category: "referral". Variables: referral.reward.signup (5), referral.reward.first_quest (10), referral.reward.seasonal_rite (15), referral.reward.crowdpooling (25), referral.reward.second_degree (5), referral.max_rewards_per_month (50), referral.max_second_degree_per_month (10). Upsert.

**2H: Contribution-Gated Quest Tiers**
Seed quest_unlock_tiers: Cultivator (70th percentile, rites required), Elder (85th, rites required), Guardian (95th, rites required).

---

### TRACK 3: SERVER-SIDE LOGIC

**3A: Nightly Batch Job**
Create `server/routes/batchJobs.ts` with admin-only tRPC endpoints per SEEDS_VISION "Nightly Batch Job Spec":
1. Advance lunar cycles
2. Recalculate contribution scores + percentiles (use REGEN_GAMES_SPEC scoring weights)
3. Recalculate trust scores (use SEEDS_VISION 7-input formula)
4. Check citizenship tier requirements + grace period demotion
5. Update gratitude multipliers (tier base + trust graph bonus)
6. Log completion to batch_job_runs
Plus: getJobHistory, getGracePeriodPlayers endpoints.

**3B: Citizenship Tier Checker**
Core function called by nightly job Step 4. For each player, check requirements per CITIZENSHIP_TIERS_SPEC against Game Variables. Promote/maintain/grace/demote. All requirement thresholds from Game Variables, nothing hardcoded.

**3C: Endorsement Tier Snapshot**
In game.ts endorsement creation: capture endorser's current citizenshipTier into endorserTierAtTime field.

**3D: Gratitude Multiplier Calculation**
Compute: tierBaseMultiplier + min(gratitudeReceivedPreviousSeason * trust_graph.received_weight, trust_graph.max_bonus). Store on player profile.

**3E: Proposals Router**
Create `server/routes/proposals.ts`: list, getById, create (Co-Creator+ only), signalVote (Co-Creator+ only), addUpdate, getByCategory, getByBioregion. Signal vote = simple upvote (one per user per proposal, internal signaling token). When signalVoteCount >= proposals.signal_threshold (Game Variable), set status to 'threshold_reached'. At that point, the proposal is ready for the community to take to Hypha for a real on-chain governance vote.

**3F: Local Food Applications Router**
Create `server/routes/localFood.ts`: list, apply, getById, updateStatus (admin), getByBioregion.

**3G: Economic Suggestions Router**
Create `server/routes/economicSuggestions.ts`: list, create, vote, getMyVotes. Same pattern as FeatureSuggestions.

**3H: Organisation Ratings Router**
Create `server/routes/orgRatings.ts`: rate (Co-Creator+ only per CITIZENSHIP_TIERS_SPEC), getForOrg, getMyRatings. Compute overallScore as average of 6 categories. Update organisation.regenerativeScore when minimum raters threshold met (Game Variable: org_rating.min_raters, default 5).

**3I: Activity Feed**
Add `logActivityEvent()` helper. Call it from endorsements, gratitude, quest completions, proposals, flags. Create `server/routes/activityFeed.ts` with list endpoint (admin view initially).

**3J: Forum Reputation Weighting**
In forum reaction logic: when recording a reaction, look up the voter's contribution percentile. Set reactionWeight = 1.0 + (percentile / 100). This means a Guardian (95th) gives ~1.95x weight on their reactions. A Seedling gives ~1.0x. Use for quality reply calculations.

**3K: Land Project Status Progression**
Nightly or on-endorsement: check each land project's endorsementCount, contributionCount, fundedCampaignCount, seasonsActive against thresholds (all Game Variables). Auto-advance projectStatus. Log changes.

---

### TRACK 4: CLIENT-SIDE FEATURES (can parallelize with Track 3)

**4A: Citizenship Tier Badge + Profile Display**
Create or extend TierBadge component to show citizenship tier (Explorer/Co-Creator/Steward/Sage) with distinct styling. Display on player profile near name. If viewing own profile in grace period, show gentle notification.

**4B: Living Tree Visualization**
Build per LIVING_TREE_VISUALIZATION_SPEC.md. React SVG component. Takes 9 capital values, season count, total score, seasonal palette. 6 life stages. Large version on profile, 32px icon version for forum/cards.

**4C: Contribution Compass**
Build per REGEN_GAMES_SPEC_V1 Part 8.1. 9-axis radar chart. Percentile-normalized. Shows on profile "Contributions" tab. "Strongest contribution" + "Where you could grow" labels.

**4D: Quest Progression (verify/complete)**
FIXES_2026-03-31 says quest locking was CODED. Verify it works per QUEST_PROGRESSION_SPEC.md. If anything's missing, complete it. Fire + Food Foresting hero cards, seasonal rite locking behind Fire, 4-season gate for seasonals/epics, SeasonProgressRing.

**4E: Gratitude Drawer Enhancement**
Add to existing GratitudeDrawer: "Your gratitude carries Xx weight this cycle" showing current multiplier. Hover/tap for breakdown. Budget display should show citizenship tier budget.

**4F: Admin: Citizenship Tiers Page**
4-column comparison grid. Each column: tier name, requirements (from Game Variables), powers (toggle switches), gratitude settings, harvest multiplier, current player count. Override button per player. Grace period dashboard. "Run Nightly Job" button.

**4G: Admin: Nightly Job Dashboard**
Widget showing last run status, promotions/demotions count, errors. Job history table. "Run Now" button.

**4H: Admin: Game Variables Panel**
If not already built: full CRUD for game_variables with categories, history log, search, inline editing. Per REGEN_GAMES_SPEC Part 1.3.

---

### TRACK 5: ECONOMY PAGES (after Tracks 1-3 foundation is in place)

**5A: Build /economy page**
Per DRAFT_GAME_AND_ECONOMY_PAGES.md Part 3, with these critical updates:
- Replace ALL "Visitor/Resident/Citizen" with "Explorer/Co-Creator/Steward/Sage"
- Replace "bioregional co-ops" with "Bioregional Financing Facilities (BFFs)"
- Replace "30% to citizens" with "30% to all contributors"
- Link marketplace references to LocalScale.org
- Link governance references to Hypha (app.hypha.earth)
- Include the first-person SEEDS origin story (Deliverable B from SEEDS_VISION spec)
- Include the "Day in the Life" walkthrough (Deliverable A from SEEDS_VISION spec)
- Add the "Exploitation vs Regeneration" comparison visual (#26 from SEEDS_VISION)
- Route: /economy, Nav: under "Play the Game"

**5B: Build /local-food-economy page**
Per DRAFT_GAME_AND_ECONOMY_PAGES.md Part 4, with updates:
- Replace "bioregional co-ops" with "BFFs"
- Remove any urgency stats (focus on the good)
- Link exchange functions to LocalScale.org
- Route: /local-food-economy, Nav: under "Play the Game"

**5C: Build /game-mechanics page**
Per SEEDS_VISION #9. Two sections:
- Section A: Live Variables Dashboard (read-only view of all game_variables, grouped by category)
- Section B: Game Simulator (client-side, sliders for key variables, projected outcomes, "Export as Proposal" button)
- Route: /game-mechanics, Nav: under "Play the Game"

**5D: Build /proposals page**
Per SEEDS_VISION #16. Card-based layout matching FeatureSuggestions pattern. Signal vote count. Status badges. Forum thread link. Template selector for new proposals (8 templates from SEEDS_VISION #19). Co-Creator+ only can submit/vote.
- Route: /proposals, Nav: under "Play the Game"

**5E: Hook Banners**
Per SEEDS_VISION #8. "If enough of us play the Game, it's real." Full-width band on homepage, /play, /quest, /game, /local-food-economy. 5 contextual versions. Link target: /economy.

**5F: Reframe Marketplace as Connection Hub**
Per SEEDS_VISION #1. Rewrite Marketplace page. Remove buying/selling language. Add LocalScale.org link. Reframe gifts as "What I can offer" and needs as "What I'm looking for help with."

**5G: Reframe Governance Page**
Per SEEDS_VISION #4. Add three-tool framing (Contribution Scores, Gratitude, Proposals). Cross-link to /economy and Hypha. Replace "citizen" references with tier names.

---

### TRACK 6: PROFILE ENHANCEMENTS (can parallelize with Track 5)

**6A: Surface Tier Badges Everywhere**
Per SEEDS_VISION #2. Add citizenship TierBadge next to author names in forum posts, marketplace listings, endorsements, community activity feed, DMs.

**6B: Contributions Dashboard Tab**
Per SEEDS_VISION #3. Bundle existing contribution data into a "Contributions" tab on profiles. Season summary, gratitude summary, harvest share estimate, contribution history, percentile rank.

**6C: Public Reputation Score**
Per SEEDS_VISION #20. Display trust score on profiles with context. Percentile, current multiplier, what builds/degrades it, trend arrow.

**6D: Reputation Composting Visibility**
Per SEEDS_VISION #22. Show composting rate, projected score if inactive, gentle fade on LivingTree.

**6E: Org Profiles with Regenerative Reputation**
Per SEEDS_VISION #23. Community-rated regenerative scores on org profiles. Rating UI (6 categories, 1-5 scale). Score tiers (Regular through Thriving).

**6F: Contribution Proof Timeline**
Per REGEN_GAMES_SPEC Part 8.3. Chronological feed merging quests + contributions. Artifact support (photo, text, link). Privacy controls per artifact.

**6G: Mycelium Network Visualization**
Per REGEN_GAMES_SPEC Part 8.4. d3-force network of referral connections. Profile page. Max 2 degrees, 50 nodes.

**6H: Seasonal Harvest Review**
Per REGEN_GAMES_SPEC Part 7.3. 7-card swipeable experience at season end. Quest summary, tokens earned, community impact, compass growth, score/tier, shareable card, gratitude summary.

---

### TRACK 7: SOCIAL SHARING SYSTEM (can parallelize with Tracks 5-6)

Per `SOCIAL_SHARING_SPEC.md`. This is audience-building infrastructure. Every link shared from the site should produce a preview card that makes people click through.

**7A: Static OG Image Foundation**
Generate unique 1200x630 Ghibli-style OG images for all main pages missing them (11 pages: /game, /quest, /seasons, /apply, /team, /opportunity, /schedule, /land, /governance, /tokenomics, /crowd-pooling). Fix dimension inconsistencies on existing 5 images. Save all as `.jpg` in `/client/public/og/`. Update `ROUTE_META` in `vite.ts` and `pageSEO` in `SEO.tsx` to reference local paths (not CDN, which returns 403 to crawlers). Safe zone: key content within center 800x400 pixels.

**7B: Dynamic OG Image Endpoint (`/api/og`)**
Build server endpoint using `satori` + `@resvg/resvg-js`. Returns PNG with cache headers. Supported types: forum post, quest card, quest completion, land project, crowd-pooling campaign, player profile, blog post. Each template: 1200x630, dark green background (#1a472a), Quicksand font, ReGen Civics watermark. Cache 24h (forum), 1h (campaigns), 7d (quest completions). Update `vite.ts` SSR to detect dynamic routes and set og:image to `/api/og?type={type}&id={id}`.

**7C: Share Prompt Component**
Build `<SharePrompt>` component. Appears at key moments: quest completion, application submitted, forum post published, crowd-pooling contribution, LOI submitted, first login, badge earned, season milestone. Copy is specific to the moment (not generic "share this"). Share targets in order: Copy link, Twitter/X, LinkedIn, WhatsApp, Telegram, Email. Uses Web Share API where available, falls back to `window.open`. Track share clicks: event `share_click` with moment, target, content_type, content_id.

**7D: Referral Tracking**
Add referral params to all shared links: `?ref={hashedUserId}&src={platform}&ctx={context}`. On page load, capture and store in session. Attribute signups, quest completions, and contributions to the referrer. Hash user IDs for privacy. Build referral display in player profile: "You've brought X people into the game."

**7E: Referral Rewards (Viral Loop)**
When referred user signs up: referrer earns 5 $ReGen. First quest: +10. Seasonal rite: +15. Crowd-pooling contribution: +25. 2nd-degree referral: +5. Anti-gaming: max 50 rewards/month, unique emails only, no self-referral. Notification on milestones. Optional seasonal leaderboard (opt-in).

**7F: Quest Completion Achievement Cards**
Dynamic OG template (builds on 7B). Personalized card: quest illustration, quest name, player name, $ReGen earned, season badge. Variations for first quest ("Welcome to the Game!"), season rites (seasonal border), epics (gold border), streaks.

**7G: Player Profile Shareable Cards**
Dynamic OG template. Avatar, display name, tier, member since, quests completed, $ReGen earned, referrals, season progress bar, personal tagline. Shareable from profile page and after milestone achievements. Seasonal wrap-up version at season end ("Your Season in ReGen Civics").

**7H: Admin Social Sharing Dashboard**
New admin tab or section within Analytics. Top-line cards: total shares, referral signups, conversion rate, top shared page, top referrer. Share activity chart (Recharts, 30/90 day). Referral funnel visualization. Per-content breakdown table. Per-referrer leaderboard. Platform breakdown chart. Uses existing Recharts patterns from AdminAnalyticsTab.

**7I: Text Overlay Variants**
For top 5 shared pages: create text overlay versions of OG images. Semi-transparent dark band at bottom, white Quicksand Bold text, ReGen Civics logo mark. Store both plain and overlay variants. Wire overlay as default.

**7J: Messaging App Optimization**
All OG images as `.jpg` (WhatsApp .webp issues). Titles under 60 chars. Descriptions under 120 chars. Add `og:image:type` meta tag. Append `?v={timestamp}` to og:image URLs on content update (busts WhatsApp aggressive cache). Test: WhatsApp, Telegram, Signal, iMessage, Slack.

---

## COMPLETION CHECKLIST

### Quick Fixes
- [ ] Fix 5: My Submissions admin-gated
- [ ] Fix 3: Notification toggle works visually
- [ ] Fix 2: On-Chain Tracking links functional
- [ ] Fix 7: "Cultivator" in all contribution tier references
- [ ] Fix 6: OG title and description updated
- [ ] Fix 4: Quest 8 says "An inner exploration"
- [ ] Fix 1: New homepage background images generated and deployed
- [ ] OG image regenerated

### Database
- [ ] All new tables created in schema.ts
- [ ] All new fields added to existing tables
- [ ] Migration generated
- [ ] All Game Variables seeded (citizenship, trust, harvest, gratitude, scoring)
- [ ] Lunar cycles seeded (2026-2028)
- [ ] Quest unlock tiers seeded

### Server
- [ ] Nightly batch job with 6 steps
- [ ] Citizenship tier checker
- [ ] Endorsement tier snapshot
- [ ] Gratitude multiplier calculation
- [ ] Proposals router
- [ ] Local food applications router
- [ ] Economic suggestions router
- [ ] Organisation ratings router
- [ ] Activity feed logger
- [ ] Forum reputation weighting
- [ ] Land project status progression

### Client
- [ ] Citizenship tier badge on profiles
- [ ] Living Tree visualization
- [ ] Contribution Compass (9-axis)
- [ ] Quest progression verified/complete
- [ ] Gratitude Drawer enhanced with multiplier display
- [ ] Admin: Citizenship Tiers page
- [ ] Admin: Nightly Job dashboard
- [ ] Admin: Game Variables panel

### Pages
- [ ] /economy page (with tier name updates, SEEDS origin story, Day in the Life)
- [ ] /local-food-economy page (with BFF framing, no urgency stats)
- [ ] /game-mechanics page (live variables + simulator)
- [ ] /proposals page (signaling system, 8 templates)
- [ ] Hook banners on 5 pages
- [ ] Marketplace reframed as Connection Hub
- [ ] Governance page reframed with three-tool language

### Profiles
- [ ] Tier badges on forum posts, cards, endorsements
- [ ] Contributions dashboard tab
- [ ] Public reputation score display
- [ ] Composting visibility
- [ ] Org regenerative reputation
- [ ] Contribution Proof Timeline
- [ ] Mycelium Network visualization
- [ ] Seasonal Harvest Review (7 cards)

### Social Sharing
- [ ] Unique OG images generated for all 11 missing pages (1200x630 .jpg)
- [ ] Existing OG image dimensions fixed
- [ ] Dynamic /api/og endpoint with satori + resvg (7 content types)
- [ ] SharePrompt component at all key moments (8 share moments)
- [ ] Referral tracking (URL params, attribution, profile display)
- [ ] Referral rewards system with anti-gaming measures
- [ ] Quest completion achievement cards (dynamic OG)
- [ ] Player profile shareable cards (dynamic OG)
- [ ] Admin Social Sharing dashboard
- [ ] Text overlay variants for top 5 pages
- [ ] Messaging app optimization (jpg, title/desc length, WhatsApp cache busting)
- [ ] share_events and referrals tables created
- [ ] SSR routes updated in vite.ts for dynamic OG

### Quality
- [ ] No em-dashes in any content
- [ ] No AI word patterns in user-facing text
- [ ] No hardcoded tier thresholds (all from Game Variables)
- [ ] All citizenship tier names correct (Explorer/Co-Creator/Steward/Sage)
- [ ] All contribution tier names correct (Seedling/Sprout/Sapling/Grower/Cultivator/Elder/Guardian)
- [ ] No "Visitor/Resident/Citizen" anywhere
- [ ] No per-tier governance voting weight
- [ ] All governance references point to Hypha

---

## REFERENCE DOCUMENTS

| Document | What it's for |
|----------|---------------|
| CITIZENSHIP_TIERS_SPEC.md | Tier definitions, powers, requirements, all Game Variables |
| SEEDS_VISION_IMPLEMENTATION_SPEC.md | 33 features, trust score formula, nightly job, gap analysis |
| REGEN_GAMES_SPEC_V1.md | Game system foundation (scoring, gratitude, endorsements, components) |
| QUEST_PROGRESSION_SPEC.md | Quest locking chain (client-side) |
| LIVING_TREE_VISUALIZATION_SPEC.md | Tree visual spec (6 stages, 9 roots, seasonal mechanics) |
| DRAFT_GAME_AND_ECONOMY_PAGES.md | Economy page copy (needs tier name updates!) |
| SITE_IMPROVEMENT_BRIEF_SEEDS_VISION.md | Content direction and messaging |
| SOCIAL_SHARING_SPEC.md | 12 social sharing initiatives, OG images, dynamic generation, referral system |
| FIXES_TO_MAKE_2026-04-01.md | 7 fixes with file paths and line numbers |
| CLAUDE.md | Writing rules, project conventions |

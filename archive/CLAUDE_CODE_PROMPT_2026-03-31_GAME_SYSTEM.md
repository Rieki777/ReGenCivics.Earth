# Claude Code Execution Prompt — ReGen Games System (Full Build)

Read these files before writing any code:
- `CLAUDE.md` (project rules, writing rules, tech stack)
- `REGEN_GAMES_SPEC_V1.md` (the complete game spec, 13 parts, your single source of truth)
- `LIVING_TREE_VISUALIZATION_SPEC.md` (detailed visual spec for the tree component)
- `CONTEXT_THE_TWO_GAMES.md` (Fund vs Game distinction)
- `drizzle/schema.ts` (current database schema, do not break anything that exists)

Build the entire game system in one consecutive run, all 5 phases, all 24 features, in the order specified below. Do not stop between phases. Do not ask for confirmation between phases. Complete everything start to finish.

---

## GROUND RULES

1. **Read the full spec first.** REGEN_GAMES_SPEC_V1.md is 1,362 lines. Read all 13 parts before writing any code. The spec contains exact table schemas, variable seed data, UI descriptions, edge cases, animation specs, color palettes, and compatibility notes. Follow them precisely.

2. **No hardcoded game numbers.** Every tunable value comes from the `game_variables` table via the `getGameVariable()` helper (spec Part 1.6). If you catch yourself typing a magic number for a threshold, multiplier, or point value, stop and use the helper instead.

3. **All new tables are additive.** Do not modify any existing column definitions. Only add new columns to existing tables. Only create new tables. The spec's Part 10 has exact SQL. The Compatibility Notes section lists every integration point.

4. **Earth palette.** All player-facing UI uses the color system from Part 12.1: warm cream (#FAF8F3), soft charcoal (#2D2A26), muted sage (#7C9A7E), warm clay (#C4785B), deep soil brown (#4A3728). No pure black. No pure white.

5. **Writing rules.** Zero em-dashes in any user-facing string. No banned AI words (see CLAUDE.md Writing Rules). These rules apply to button labels, tooltips, empty states, notification messages, everything.

6. **Respect prefers-reduced-motion.** Every animation must have a reduced-motion fallback (instant state change).

7. **Follow existing patterns.** The codebase uses Drizzle ORM, tRPC (publicProcedure, protectedProcedure, adminProcedure), React, Redis caching. Match the patterns in the existing code. Check how existing admin tabs are built before creating new ones.

---

## PHASE 1: Foundation

Build these four systems first. Everything else depends on them.

### 1A: Seasons table + helpers

Create the `seasons` table (spec Part 1.5). Build `getCurrentSeason()` helper that returns the season with status 'active'. Create a simple admin UI to create/edit seasons and set one as active. Seed an initial season (name it appropriately for the current period).

### 1B: Game Variables table + admin panel + seed data

Create `game_variables` and `game_variable_history` tables (spec Part 1.1, 1.2).

Build the `getGameVariable(key)` and `getGameVariables(keys[])` helpers with Redis caching and cache invalidation (spec Part 1.6).

Build the admin Game Variables panel (spec Part 1.3): left sidebar category filters, table of variables, edit drawer with min/max constraints, required change reason, "Recent Changes" view, "Reset to Default" button, "Export" button, search bar.

Seed ALL initial game variables from every table in Part 1.4 (scoring weights, trust multiplier settings, seasonal composting, harvest distribution, gratitude settings, land project status thresholds, forum reputation weighting, contribution-gated quest tiers, governance/seasonal councils). There are 60+ variables. Seed every one.

### 1C: Contribution score events + scoring logic

Create `contribution_score_events` table (spec Part 2.6).

Add new columns to `playerProfiles`: contributionScore, contributionScoreRaw, trustScore, trustScoreRaw, scoreLastCalculatedAt, trustLastCalculatedAt, currentTier, seasonsCompleted (spec Part 2.6).

Build the `recordScoreEvent()` helper function that reads the variable value via `getGameVariable()`, writes the score event row, and calls `logActivityEvent()`.

Build the percentile calculation job (spec Part 2.2): sum events, multiply by trust, rank, assign 0-99, store on profile. Handle the small-pool edge case (fewer than 3 players = everyone gets 50, spec Part 13.1).

Build tier label assignment from percentile bands (spec Part 2.3). Store tier labels in game_variables.

Add score + tier display to player profile pages and forum posts (spec Part 2.5). Design tier badges as organic shapes per Part 12.4.

Wire `recordScoreEvent()` into every existing mutation: quest completions, forum post/reply creation, event attendance, playerContributions creation, campaign contributions, referral tracking, badge awards. Each integration is one function call added to the existing mutation handler (spec Compatibility Notes).

### 1D: Activity feed + Living Ledger

Create `activity_feed_events` table (spec Part 9.1).

Build the `logActivityEvent()` helper. Wire it into the same mutations you just wired `recordScoreEvent()` into.

Build the Living Ledger admin tab (spec Part 9.1): real-time feed, filterable by action type/player/project/date, clickable entries, daily/weekly/monthly counts, pause button.

### 1E: Endorsements + Flags

Create `endorsements` and `flags` tables (spec Part 8.5).

Build the three endorsement directions: player-to-project, project-to-player, player-to-player. One endorsement per entity per player. Optional note (280 chars). Self-endorsement blocked.

Build flag submission (3 directions, admin-only visibility, required reason enum, optional description).

Build admin "Endorsements & Flags" section with two tabs (spec Part 8.5). Flags sorted by recency, unresolved first. Action buttons: Dismiss, Investigate, Take Action.

Wire endorsements into `recordScoreEvent()` (endorsement_from_project, endorsement_from_player, endorsement_given).

---

## PHASE 2: Trust and Gratitude

### 2A: Trust score calculation

Build the trust multiplier system (spec Part 6). Calculate from endorsements received (project weight 4, player weight 1), account age (0.5 per season), validated flags (-5). Normalize to 0.5-1.5 range with linear interpolation. New players default to 1.0.

Add trustScore and trustScoreRaw columns to playerProfiles (if not already added in 1C).

Wire trust into the percentile calculation job (multiply raw points by trust before ranking).

### 2B: Cascading consequences

When admin actions a flag (spec Part 6.3): apply flag_validated_penalty (-50) to the flagged entity, apply cascading_endorsement_penalty (-10) to every player who endorsed the flagged entity, mark endorsements as 'endorsed_entity_flagged'. Admin can waive cascade for individual endorsers.

### 2C: Gratitude system

Create `gratitude_transactions` and `gratitude_budgets` tables (spec Part 4.5).

Build budget calculation at season start (spec Part 4.1): base + (percentile * per_percentile), capped at max.

Build the gratitude drawer/modal (spec Part 4.1, the detailed UI description): recipient name/avatar/tier at top, leaf-shaped token selector (1-5), message textarea with character counter, remaining budget display, send animation (leaves arc toward recipient avatar, 800ms). One send per recipient per day.

Three send surfaces: player profile page button, forum gratitude icon on posts/replies, community page player card button.

Receiver notification: in-app + optional email.

Wire into `recordScoreEvent()`: gratitude_received (3 points) and gratitude_sent (1 point).

Build admin "Gratitude Flows" section (spec Part 4.3): top senders/receivers, gratitude network graph, volume over time, low-score-high-gratitude candidates.

### 2D: Forum reputation weighting

Add `reactionWeight` column to `postReactions` (spec Part 8.9).

When a player reacts: calculate their weight based on percentile (linear between forum.vote_weight_min and forum.vote_weight_max). Store the weight. Use weighted counts for quality reply thresholds.

---

## PHASE 3: Profile Experience

### 3A: Contribution Compass

Build the 9-axis radar chart (spec Part 8.1). Axes: Quests, Financial, Social, Cultural, Living, Intellectual, Experiential, Material, Health/Vital. Each axis scaled 0-100 (percentile among all players for that category). Hover shows raw score. Below chart: strongest + room to grow.

Add 'health' to the capitalType enum in playerContributions.

Empty state (spec Part 12.3): chart outline with all axes at zero, gentle pulse, center text "Your compass will fill in as you contribute. Start with a quest."

### 3B: Contribution Proof Timeline

Build vertical timeline on player profiles (spec Part 8.3). Merge quest completions, playerContributions, gratitude received, endorsements, badges into one feed. Each entry: date, artifact thumbnail, title, category badge, verified status.

Add artifact columns to playerContributions (spec Part 8.3): artifactType, artifactUrl, artifactText, visibility.

Privacy: per-artifact visibility (public, community-only, private). Default: community-only.

Empty state: dotted vertical line with seed icon, "Your first contribution will appear here," link to quest page.

### 3C: Living Tree Visualization

Build the `<LivingTree />` React component (spec Part 3.6, full visual spec in LIVING_TREE_VISUALIZATION_SPEC.md).

SVG-based, responsive. 6 life stages based on seasonsCompleted. 9 root arteries mapped to capital types. Trunk width from percentile. Seasonal visual cycle (spring/summer/autumn/winter based on current date or active season).

Large version (hero on profile, ~40% viewport on desktop). Small version (32px icon next to username in forum/community/leaderboard).

Animated: gentle pulses on recently-grown categories. Growth always animates from last state to current state (spec Part 12.2).

New player empty state: tiny seed in bare soil with breathing animation (scale 1.0 to 1.02, 3s cycle), tooltip on tap.

### 3D: Land project status progression

Add project status columns to `applications` table (spec Part 5.4): projectStatus enum, projectStatusUpdatedAt, endorsementCount, contributionCount, fundedCampaignCount, seasonsActive.

Build 5-level system (spec Part 5.1-5.3): Applied, Accepted, Active, Established, Anchor. All thresholds from game_variables. Benefits per level (visibility, endorsement weight multiplier, player bonus multiplier).

Nightly job checks each project against thresholds. Status can go up or down. Admin can override.

---

## PHASE 4: Seasonal Systems

### 4A: Score composting

Build seasonal decay logic (spec Part 7.2). Controlled by composting.is_active (default: off), composting.decay_rate (default: 10%), composting.minimum_floor (default: 100). Creates composting score events. The tree visualization never shrinks.

### 4B: Seasonal Harvest

Build token pool distribution (spec Part 7.1). Controlled by harvest.pool_size, harvest.is_active, harvest.min_score_percentile, harvest.distribution_curve. Distribution math in spec Part 7.1. Records in regenTokenLedger with reason 'seasonal_harvest'. Add 'seasonal_harvest' to the reason enum.

Create `seasonal_harvests` table (spec Part 7.3) for the review experience snapshots.

### 4C: Seasonal Harvest Review

Build the 7-card review experience (spec Part 7.3). Full-page, swipeable on mobile, click-through on desktop. Card content defined in spec. Card 4 shows the Living Tree animating from last season to current. Card 7 generates a shareable summary image.

Full-bleed seasonal illustrations per card (spec Part 12.4). Native share sheet on mobile.

### 4D: Mycelium Network

Build d3-force visualization of the player's referral network (spec Part 8.2). Player at center, first and second degree referrals. Max 2 degrees, max 50 nodes. Thread thickness = referred person's activity level. Green = active, fading = inactive. Nodes pulse on quest completion.

Mobile: simplified list view with connection lines.

Empty state: single node floating, "You're the first node. Share your referral link to grow your network."

Data source: existing referrals table.

---

## PHASE 5: Governance and Advanced

### 5A: Seasonal Councils

Create `seasonal_councils`, `council_seats`, `council_proposals`, `council_votes` tables (spec Part 7.4).

Build formation: top percentile players qualify (governance.council_min_score, governance.council_require_rites). Admin invites, players accept/decline.

Build proposal drafting by council members. Proposals go to all RGVoice holders for community vote. Full transparency: all proposals and outcomes published.

Admin controls: view council, create/edit proposals, view votes, archive past councils.

Councils cannot: vote on their own proposals, override Rye, make fund decisions, change game rules, remove players, set their own compensation.

### 5B: Contribution-gated quests

Create `quest_unlock_tiers` and `quest_tier_assignments` tables (spec Part 8.7).

Build admin UI: create tiers with name, minimum percentile, assigned quests. Quests in locked tiers are invisible (not greyed out). Player notification when they qualify. Quest page shows "More quests become available as you contribute."

Tier thresholds come from game_variables (quests.tier_steward_min = 70, quests.tier_elder_min = 85, quests.tier_guardian_min = 95). Must complete all 13 Rites of Passage if quests.require_rites_complete is true.

### 5C: Co-creator invitations

Build threshold-based eligibility (spec Part 8.6): contribution percentile crosses governance.cocreator_threshold_percentile (default: 90th).

Admin sees eligible-but-not-invited list. Invite with custom message. Player receives notification + email. If accepted: Co-Creator badge, private forum category access, early quest previews.

### 5D: Regenerative Resume

Build exportable player profile (spec Part 8.4). Three formats: web page at `/play/[username]/resume`, PDF download, OG card via /api/og.

Content: name, avatar, tier, member-since, score, compass (static image), top quests, key contributions with evidence, endorsements, badges, events, tokens earned.

Verification URL: `regencivics.earth/verify/[hash]`.

### 5E: Bioregional identity

Build bioregion selection on player profile (spec Part 8.8). Map or text field, stored in existing bioregionId.

Map page: show player density by bioregion alongside land projects. "Pacific Northwest: 14 players, 3 projects."

### 5F: Quiet Recognitions

Build admin "Player Recognition" section (spec Part 9.2). Auto-generated candidate list sorted by score gain, sharing activity, quest completions. Compose window: pre-filled context, personal message, optional token grant, optional badge. Send as notification, email, or both.

### 5G: Silent Sharing Score

Build background sharing tracker (spec Part 9.3). Admin "Silent Scores" section: ranked by sharing score, total shares, arrivals, signups, conversions. "Send Recognition" and "Grant Tokens" buttons per row. Admin notification when threshold crossed. Token grants never say "sharing reward."

### 5H: RGVoice Delegation Link

On player profile, next to RGVoice balance: "Delegate" button linking to `https://app.hypha.earth/en/dho/regen-games/members`. Simple external link. That's it.

---

## AFTER ALL 5 PHASES

1. Run the Drizzle migration to verify all schema changes apply cleanly.
2. Run `npm run build` and fix any TypeScript errors.
3. Run `npm run lint` and fix any lint errors.
4. Run the existing test suite and fix any failures.
5. Seed the game_variables table with all 60+ initial variables from the spec.
6. Seed an initial season record.
7. Verify the Game Variables admin panel loads and displays all seeded variables.
8. Verify the Living Ledger admin tab loads.
9. Verify player profile pages show the new score/tier/tree sections.
10. Commit everything with a clear message describing the full game system addition.

---

## IMPORTANT REMINDERS

- The spec has exact SQL CREATE TABLE statements in Part 10. Use them.
- The spec has exact seed data tables in Part 1.4. Seed every row.
- Part 12 has hex color codes, animation timings, and empty state copy. Use them verbatim.
- Part 13 has edge cases (small player pools, first season, inactive players). Handle them.
- The `getGameVariable()` helper with Redis caching is critical. Build it in 1B and use it everywhere.
- Four shared utility functions (spec Compatibility Notes): `getGameVariable()`, `logActivityEvent()`, `recordScoreEvent()`, `getCurrentSeason()`. Build these first, use them in every mutation.
- Do not stop between phases. Build the whole thing in one consecutive go.

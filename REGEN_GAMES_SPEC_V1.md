# ReGen Games: Complete Game Spec v1.0

This is the living game document for ReGen Civics. It defines every player-facing system, every admin-configurable variable, every database table, and every interaction that makes up the game layer of regencivics.earth. Built to be extended season by season. Designed with SEEDS as a reference architecture, adapted for a fund-backed real-world regenerative movement.

This spec replaces and supersedes PLAYER_EXPERIENCE_SPEC.md (which covered features 1-15 in draft form). All feedback from Rye has been integrated. All features reference the existing codebase schema and won't break current systems.

---

## How this document is organized

**Part 1: Game Variables Architecture** -- The admin backbone. Every tunable number in the game lives here.

**Part 2: Contribution Score System** -- How players earn standing. Percentile-based, multiplied by trust, composted over time.

**Part 3: Living Tree Visualization** -- The visual heart of the profile. Approved concept, full spec.

**Part 4: Gratitude System** -- Peer-to-peer recognition with full tracking.

**Part 5: Land Project Status Progression** -- Five-level ladder for projects.

**Part 6: Trust Score and Cascading Consequences** -- Reputation as a multiplier, not a number.

**Part 7: Seasonal Systems** -- Harvest, composting, councils, and the harvest review experience.

**Part 8: Community and Profile Features** -- Mycelium network, contribution compass, proof timeline, resume, endorsements/flags, co-creator invitations, gated quests, bioregional identity, forum reputation weighting.

**Part 9: Admin Systems** -- Living Ledger, Quiet Recognitions, Silent Sharing Score, delegation link.

**Part 10: Database Schema** -- Every new table, every column, every enum.

**Part 11: Implementation Priority** -- What to build first.

---

# Part 1: Game Variables Architecture

Every tunable number in the game is a Game Variable. They live in a single table, are editable in admin, and carry audit history. This is the foundation everything else builds on.

## 1.1 The game_variables table

```
game_variables:
  id: serial primary key
  category: varchar (e.g., 'scoring', 'trust', 'harvest', 'quests', 'forum', 'gratitude', 'projects', 'governance')
  subcategory: varchar (e.g., 'weights', 'thresholds', 'multipliers', 'decay', 'tiers')
  key: varchar, unique (e.g., 'scoring.weights.quest_routine')
  displayName: varchar (e.g., 'Quest Completion (Routine) Points')
  description: text (explains what this variable does, shown in admin tooltip)
  value: decimal (the current value)
  valueType: enum('integer', 'decimal', 'percentage', 'boolean', 'multiplier')
  minValue: decimal, nullable (floor constraint)
  maxValue: decimal, nullable (ceiling constraint)
  defaultValue: decimal (factory default, for reset)
  isActive: boolean, default true
  updatedAt: timestamp
  updatedBy: integer (userId of admin who last changed it)
  createdAt: timestamp
```

## 1.2 The game_variable_history table

Every change is logged. No exceptions.

```
game_variable_history:
  id: serial primary key
  variableId: integer (FK to game_variables)
  previousValue: decimal
  newValue: decimal
  changedBy: integer (userId)
  reason: text, nullable (admin can note why they changed it)
  createdAt: timestamp
```

## 1.3 Admin UI: Game Variables panel

New tab in admin: **"Game Variables"**

Layout: left sidebar with category filters (Scoring, Trust, Harvest, Quests, Forum, Gratitude, Projects, Governance). Main area shows a table of variables in that category.

Each row shows: display name, current value, type, last updated, who changed it. Clicking a row opens an edit drawer with: value input (with min/max constraints), description, change reason field (required), preview button (shows what the change would do to the top 20 players' scores before applying), save button.

Top of the page: a search bar that filters across all categories. A "Recent Changes" button that shows the last 20 changes from game_variable_history with diffs.

A "Reset to Default" button per variable (requires confirmation).

An "Export" button that dumps all current variables as JSON (for version control and backup).

## 1.4 Seed data: initial game variables

The following variables are seeded on first deploy. All values are admin-editable from day one.

### Scoring weights

| Key | Display Name | Default | Type | Description |
|-----|-------------|---------|------|-------------|
| scoring.weights.quest_routine | Quest (routine) points | 10 | integer | Points earned per routine quest completion |
| scoring.weights.quest_seasonal | Quest (seasonal rite) points | 25 | integer | Points earned per seasonal rite completion |
| scoring.weights.quest_epic | Quest (epic) points | 100 | integer | Points earned per epic quest completion |
| scoring.weights.quest_welcome | Quest (welcome aboard) points | 5 | integer | Points earned per welcome aboard quest |
| scoring.weights.forum_post | Forum post points | 5 | integer | Points for creating a forum post |
| scoring.weights.forum_quality_reply | Quality reply points | 3 | integer | Points for a reply with 3+ reactions |
| scoring.weights.forum_quality_threshold | Quality reply threshold | 3 | integer | Minimum reactions for a reply to count as quality |
| scoring.weights.event_attended | Event attendance points | 15 | integer | Points per event attended |
| scoring.weights.contribution_base | Contribution (base) points | 10 | integer | Minimum points for a logged contribution |
| scoring.weights.contribution_max | Contribution (max) points | 50 | integer | Maximum points for a high-value contribution |
| scoring.weights.contribution_verified_bonus | Verified contribution bonus | 25 | integer | Added on top when admin verifies |
| scoring.weights.crowdpool_contribution | Crowd-pooling contribution | 20 | integer | Points per crowd-pooling pledge |
| scoring.weights.referral_signup | Referral signup points | 10 | integer | When a referred user creates account |
| scoring.weights.referral_first_quest | Referral first quest bonus | 15 | integer | When referred user completes first quest |
| scoring.weights.endorsement_from_project | Endorsement from project | 20 | integer | Receiving endorsement from a land project |
| scoring.weights.endorsement_from_player | Endorsement from player | 5 | integer | Receiving endorsement from another player |
| scoring.weights.endorsement_given | Endorsement given | 2 | integer | Giving an endorsement |
| scoring.weights.badge_base | Badge earned (base) | 10 | integer | Minimum points for earning a badge |
| scoring.weights.badge_max | Badge earned (max) | 50 | integer | Maximum points for a high-tier badge |
| scoring.weights.lunar_streak | Lunar streak (per week) | 2 | integer | Compounds weekly for consecutive engagement |
| scoring.weights.gratitude_received | Gratitude received | 3 | integer | Points when receiving a gratitude token |
| scoring.weights.gratitude_sent | Gratitude sent | 1 | integer | Points for sending gratitude |
| scoring.weights.flag_validated_penalty | Validated flag penalty | -50 | integer | Score deduction when flagged and confirmed |
| scoring.weights.cascading_endorsement_penalty | Cascading endorsement penalty | -10 | integer | Score hit when you endorsed a flagged entity |

### Trust multiplier settings

| Key | Display Name | Default | Type | Description |
|-----|-------------|---------|------|-------------|
| trust.multiplier.min | Trust multiplier floor | 0.5 | multiplier | Lowest possible trust multiplier |
| trust.multiplier.max | Trust multiplier ceiling | 1.5 | multiplier | Highest possible trust multiplier |
| trust.multiplier.default | Default trust multiplier | 1.0 | multiplier | Applied to new players with no endorsements |
| trust.endorsement_project_weight | Project endorsement weight | 4 | integer | How much a project endorsement contributes to trust |
| trust.endorsement_player_weight | Player endorsement weight | 1 | integer | How much a player endorsement contributes to trust |
| trust.account_age_weight | Account age weight | 0.5 | decimal | Trust bonus per completed season |
| trust.flag_penalty_weight | Flag penalty weight | -5 | integer | Trust reduction per validated flag received |
| trust.endorsements_for_max | Endorsements needed for max | 10 | integer | Total weighted endorsements to reach 1.5x |

### Seasonal composting

| Key | Display Name | Default | Type | Description |
|-----|-------------|---------|------|-------------|
| composting.decay_rate | Seasonal decay rate | 10 | percentage | Percent of raw points that decay each season |
| composting.minimum_floor | Minimum retained points | 100 | integer | Points never decay below this floor |
| composting.is_active | Composting enabled | 0 | boolean | Toggle composting on/off (off for early seasons) |

### Harvest distribution

| Key | Display Name | Default | Type | Description |
|-----|-------------|---------|------|-------------|
| harvest.pool_size | Seasonal token pool | 10000 | integer | Total $ReGen distributed as Harvest each season |
| harvest.is_active | Harvest enabled | 0 | boolean | Toggle seasonal harvest on/off |
| harvest.min_score_percentile | Minimum percentile for harvest | 10 | integer | Players below this percentile get zero harvest |
| harvest.distribution_curve | Distribution curve exponent | 1.5 | decimal | Higher = more reward to top percentiles |

### Gratitude settings

| Key | Display Name | Default | Type | Description |
|-----|-------------|---------|------|-------------|
| gratitude.budget_base | Base gratitude budget | 5 | integer | Gratitude tokens each player gets per season |
| gratitude.budget_per_percentile | Bonus per percentile | 0.1 | decimal | Extra gratitude per contribution percentile point |
| gratitude.max_budget | Max gratitude budget | 15 | integer | Cap on gratitude tokens per season |
| gratitude.message_max_chars | Max message length | 280 | integer | Character limit for gratitude messages |

### Land project status thresholds

| Key | Display Name | Default | Type | Description |
|-----|-------------|---------|------|-------------|
| projects.status.active_endorsements | Active status: endorsements | 3 | integer | Player endorsements needed for Active |
| projects.status.active_contributions | Active status: contributions | 5 | integer | Logged contributions needed for Active |
| projects.status.established_endorsements | Established: endorsements | 10 | integer | Endorsements needed for Established |
| projects.status.established_campaigns | Established: funded campaigns | 1 | integer | Funded crowd-pooling campaigns for Established |
| projects.status.anchor_endorsements | Anchor: endorsements | 25 | integer | Endorsements needed for Anchor |
| projects.status.anchor_seasons | Anchor: active seasons | 4 | integer | Seasons active for Anchor status |

### Forum reputation weighting

| Key | Display Name | Default | Type | Description |
|-----|-------------|---------|------|-------------|
| forum.vote_weight_min | Min vote weight | 1.0 | multiplier | Vote weight for lowest-tier player |
| forum.vote_weight_max | Max vote weight | 2.0 | multiplier | Vote weight for Guardian-tier player |
| forum.quality_reply_min_reactions | Quality reply threshold | 3 | integer | Reactions needed for a reply to count as "quality" |

### Contribution-gated quest tiers

| Key | Display Name | Default | Type | Description |
|-----|-------------|---------|------|-------------|
| quests.tier_steward_min | Steward tier minimum score | 350 | integer | Percentile score needed (maps to ~60th percentile) |
| quests.tier_elder_min | Elder tier minimum score | 750 | integer | Higher quest tier threshold |
| quests.tier_guardian_min | Guardian tier minimum score | 1500 | integer | Highest quest tier threshold |
| quests.require_rites_complete | Require Rites of Passage | 1 | boolean | Must complete all 13 Rites before tier quests |

### Governance / Seasonal Councils

| Key | Display Name | Default | Type | Description |
|-----|-------------|---------|------|-------------|
| governance.council_seats | Council seats per season | 7 | integer | Number of seats on the seasonal council |
| governance.council_min_score | Council minimum score | 80 | integer | Minimum percentile to qualify for council |
| governance.council_require_rites | Council requires Rites | 1 | boolean | Must complete Rites to sit on council |
| governance.cocreator_threshold_percentile | Co-creator threshold | 90 | integer | Top N percentile eligible for co-creator invite |

---

# Part 2: Contribution Score System

## 2.1 How scores work

Every action a player takes on the site earns raw points. The point value for each action comes from the game_variables table (Part 1). Raw points are stored in a `contribution_score_events` table as an append-only audit trail.

The player's **total raw points** are the sum of all their events. But the number that appears on their profile, determines their tier, and controls what they can access is their **percentile score**: a 0-99 ranking against all other active players.

This percentile approach (borrowed directly from SEEDS) means:
- The gap between the #1 player and the #100 player is compressed to a maximum spread of 99 points
- Early adopters can't permanently lock out newcomers
- The score rewards ongoing contribution, not just historical accumulation
- Everyone's rank is relative, so the game stays competitive at every level

## 2.2 Calculating the percentile

A nightly job (or triggered after significant score changes):

1. Sum all contribution_score_events per player for the trailing scoring window
2. Multiply each player's raw total by their Trust Multiplier (Part 6)
3. Rank all active players by their multiplied total
4. Assign percentile scores 0-99 using linear interpolation
5. Store the percentile in playerProfiles.contributionScore
6. Store the raw total in playerProfiles.contributionScoreRaw
7. Store the timestamp in playerProfiles.scoreLastCalculatedAt

"Active player" means: has logged in within the last 2 seasons, or has any contribution_score_event in the last season.

## 2.3 Tier labels

Tiers map to percentile bands (not raw point thresholds):

| Percentile | Label |
|------------|-------|
| 0-14 | Seedling |
| 15-29 | Sprout |
| 30-49 | Sapling |
| 50-69 | Grower |
| 70-84 | Steward |
| 85-94 | Elder |
| 95-99 | Guardian |

Tier names and percentile boundaries are stored in game_variables and editable in admin.

## 2.4 Score inputs

Every action in this table creates a `contribution_score_events` row:

| Action | Variable Key | Default Points |
|--------|-------------|----------------|
| Quest completed (routine) | scoring.weights.quest_routine | 10 |
| Quest completed (seasonal rite) | scoring.weights.quest_seasonal | 25 |
| Quest completed (epic) | scoring.weights.quest_epic | 100 |
| Quest completed (welcome aboard) | scoring.weights.quest_welcome | 5 |
| Forum post created | scoring.weights.forum_post | 5 |
| Forum reply with 3+ reactions | scoring.weights.forum_quality_reply | 3 |
| Event attended | scoring.weights.event_attended | 15 |
| Contribution logged | scoring.weights.contribution_base to contribution_max | 10-50 |
| Contribution verified by admin | scoring.weights.contribution_verified_bonus | +25 |
| Crowd-pooling contribution | scoring.weights.crowdpool_contribution | 20 |
| Referral signup | scoring.weights.referral_signup | 10 |
| Referred user completes first quest | scoring.weights.referral_first_quest | 15 |
| Endorsement from land project | scoring.weights.endorsement_from_project | 20 |
| Endorsement from player | scoring.weights.endorsement_from_player | 5 |
| Endorsement given | scoring.weights.endorsement_given | 2 |
| Badge earned | scoring.weights.badge_base to badge_max | 10-50 |
| Lunar streak week | scoring.weights.lunar_streak | 2 (compounds) |
| Gratitude received | scoring.weights.gratitude_received | 3 |
| Gratitude sent | scoring.weights.gratitude_sent | 1 |
| Validated flag received | scoring.weights.flag_validated_penalty | -50 |
| Endorsed a flagged entity | scoring.weights.cascading_endorsement_penalty | -10 |

## 2.5 Where scores appear

- Player profile page: percentile number + tier label + tier badge
- Forum posts: small tier badge next to author name
- Community page player cards: tier badge
- Leaderboard: ranked by percentile (already exists, extend it)
- Admin panel: full table of all players with raw + percentile + tier

## 2.6 Database additions

Add to `playerProfiles`:
```
contributionScore: integer, default 0        -- the percentile (0-99)
contributionScoreRaw: integer, default 0     -- sum of all points
trustScore: decimal, default 1.0             -- the trust multiplier
scoreLastCalculatedAt: timestamp
currentTier: varchar, default 'Seedling'
seasonsCompleted: integer, default 0
```

New table `contribution_score_events`:
```
id: serial primary key
userId: integer (FK to users)
action: varchar (matches the action names above)
points: integer (value at time of award, pulled from game_variables)
variableKey: varchar (which game_variable was used)
referenceType: enum('quest', 'forum_post', 'forum_reply', 'event', 'contribution', 'referral', 'endorsement', 'badge', 'gratitude', 'flag', 'streak', 'crowdpool', 'composting')
referenceId: integer, nullable (FK to the relevant entity)
seasonId: integer, nullable (which season this belongs to)
createdAt: timestamp
```

---

# Part 3: Living Tree Visualization

Full concept approved by Rye. See LIVING_TREE_VISUALIZATION_SPEC.md for the detailed visual breakdown. Here's the implementation spec.

## 3.1 Life stages

| Stage | Seasons | Visual |
|-------|---------|--------|
| Seedling | 0-1 | Small sprout, single taproot, bare soil |
| Sapling | 1-2 | Thickened trunk, 8-12 leaves, 9 root arteries emerge (one per capital form) |
| Young Tree | 2-3 | Full canopy, textured trunk, seasonal rings, complex root system |
| Flowering | 3-5 | Blossoms appear (count = current season actions), color shifts seasonally |
| Fruiting | 6+ | Fruit grows (size = impact depth, count = volume, type = dominant capital) |
| Ancient | 10+ | Moss, birds, undergrowth, other players' mycelium attaches to roots |

## 3.2 Visual-to-data mapping

| Element | Data Source |
|---------|-------------|
| Trunk width | contributionScore (percentile) |
| 9 root arteries | Score per capital type from playerContributions + questCompletions |
| Root depth | Individual capital scores |
| Seasonal rings | seasonsCompleted |
| Flower count | contribution_score_events.count WHERE seasonId = current AND createdAt > season start |
| Flower color | Current season palette |
| Fruit size | Individual high-impact contribution values |
| Fruit count | Total sustained contributions (6+ seasons) |
| Fruit type | Dominant capital type (most points) |
| Canopy shape | Balance ratio across 9 capitals |
| Mycelium attachments | referrals table (players connected via referral chain) |

## 3.3 The 9 root arteries (forms of capital)

Extending the existing 8 in playerContributions with Health/Vital as the 9th:

1. **Intellectual** -- guides, proposals, governance
2. **Social** -- forum activity, community building
3. **Material** -- physical resources, tools, infrastructure
4. **Financial** -- crowd-pooling, fund contributions
5. **Living** -- land-based work, ecology
6. **Cultural** -- content, stories, blog posts
7. **Spiritual** -- practice and ceremony (defined by community)
8. **Experiential** -- events, sessions, mentoring
9. **Health/Vital** -- fitness coaching, diet guidance, wellness, healing practices

## 3.4 Root detail view

Tapping the root system opens a radial view: 9 labeled arteries with scores. This is the data layer of the Contribution Compass (Part 8.1). Same numbers, different presentation. The compass is the chart; the roots are the metaphor.

## 3.5 Seasonal visual cycle

Spring: new leaves and buds. Summer: full canopy, flowers peak. Autumn: warm colors, fruit ripens, leaves thin. Winter: bare branches show trunk structure and rings. The tree never dies or resets. An inactive season just means a quieter winter.

## 3.6 Implementation

- React component: `<LivingTree />` accepting 9 capital values, seasonsCompleted, contributionScore, currentSeasonActions
- SVG-based, responsive
- Animated with gentle pulses on recently-grown categories
- Large version: player profile page (hero position)
- Small version: 32px icon next to player name in forum posts, community cards, leaderboard
- Database: add `capitalType: 'health'` to the existing playerContributions enum

---

# Part 4: Gratitude System

Peer-to-peer recognition that creates trackable flows of appreciation. Every gratitude token has a sender, receiver, amount, date, and message. The data model supports building future features on top of gratitude flows (reciprocity tracking, gratitude networks, seasonal gratitude reports).

## 4.1 How it works

Each season, every player receives a gratitude budget. The budget size depends on their contribution score:

`budget = gratitude.budget_base + (contributionScore * gratitude.budget_per_percentile)`

Capped at `gratitude.max_budget`. Defaults: base 5, +0.1 per percentile point, max 15. So a player at the 50th percentile gets 10 gratitude tokens per season. A new player gets 5.

Players send gratitude from three places:
1. **Player profile page**: a "Send Gratitude" button next to the player's name
2. **Forum**: a gratitude icon on any post or reply (sends gratitude to the author)
3. **Player search / community page**: gratitude button on player cards

Each send requires: recipient (auto-filled from context), amount (1-5 tokens from their budget), and a message (max 280 characters, required). One send per recipient per day (prevent spam).

## 4.2 What the receiver sees

A notification (in-app + optional email): "[Player Name] sent you gratitude: '[message]'"

Gratitude appears on the receiver's Contribution Proof Timeline (Part 8.3) as a distinct entry type with the sender's name, message, and date.

## 4.3 What admin sees

In the Living Ledger (Part 9.1): all gratitude transactions in real time.

New admin section: **"Gratitude Flows"** showing:
- Top senders and receivers this season
- Gratitude network graph (who sends to whom, showing clusters)
- Total gratitude volume over time
- Players who received the most gratitude but have low contribution scores (potential recognition candidates)

## 4.4 Scoring impact

- Receiving gratitude: `scoring.weights.gratitude_received` points per token received (default: 3)
- Sending gratitude: `scoring.weights.gratitude_sent` points per token sent (default: 1)
- This feeds the Social capital root on the Living Tree

## 4.5 Database

```
gratitude_transactions:
  id: serial primary key
  senderId: integer (FK to users)
  receiverId: integer (FK to users)
  amount: integer (1-5, from sender's budget)
  message: varchar(280)
  seasonId: integer
  createdAt: timestamp

gratitude_budgets:
  id: serial primary key
  userId: integer (FK to users)
  seasonId: integer
  totalBudget: integer (calculated at season start)
  spent: integer, default 0
  createdAt: timestamp
```

## 4.6 Future building blocks

The gratitude_transactions table is designed to support:
- Reciprocity analysis (who sends back to people who sent to them)
- Gratitude clustering (groups that send gratitude within themselves)
- Seasonal gratitude reports in the Harvest review
- "Most appreciated" badges
- Gratitude-weighted endorsements (if someone you've exchanged gratitude with endorses you, it carries more weight)

---

# Part 5: Land Project Status Progression

Five status levels for land projects, each earned through measurable community engagement. Higher status means more visibility, stronger endorsement weight, and more player incentive to support the project.

## 5.1 Status levels

| Level | Name | Requirements |
|-------|------|-------------|
| 1 | Applied | Submitted an incubator application |
| 2 | Accepted | Application approved, project listed on platform |
| 3 | Active | N player endorsements received + N contributions logged against this project |
| 4 | Established | N endorsements + at least 1 funded crowd-pooling campaign + N contributions |
| 5 | Anchor | N endorsements + N seasons active on platform + demonstrated track record |

All thresholds come from game_variables (Part 1, projects.status.* keys). Admin-editable.

## 5.2 Benefits per level

| Level | Visibility | Endorsement Weight | Player Bonus |
|-------|-----------|-------------------|-------------|
| Applied | Application page only | n/a | n/a |
| Accepted | Map + project directory | 1x | Base points |
| Active | Featured in rotation on home page | 1.25x | 1.25x contribution points for players supporting this project |
| Established | Priority placement + "Established" badge | 1.5x | 1.5x contribution points |
| Anchor | Permanent home page presence + "Anchor" badge | 2x | 2x contribution points |

"Players supporting this project" means: endorsing it, contributing to its crowd-pooling campaign, or logging a contribution that names this project.

## 5.3 Status calculation

A nightly job checks each project against the thresholds. Status can go up or down (if endorsements are revoked or campaigns are cancelled). Admin can override (promote or freeze a project's status).

## 5.4 Database additions

Add to the `applications` table (or create a new `land_projects` view):
```
projectStatus: enum('applied', 'accepted', 'active', 'established', 'anchor'), default 'applied'
projectStatusUpdatedAt: timestamp
endorsementCount: integer, default 0 (cached, recalculated nightly)
contributionCount: integer, default 0 (cached)
fundedCampaignCount: integer, default 0 (cached)
seasonsActive: integer, default 0
```

---

# Part 6: Trust Score and Cascading Consequences

Trust is the most powerful lever in the game. It multiplies everything. Borrowed from SEEDS' reputation-as-multiplier concept, adapted for a smaller, relationship-based community.

## 6.1 How the trust multiplier works

Every player has a trust score between `trust.multiplier.min` (default 0.5) and `trust.multiplier.max` (default 1.5). It multiplies their raw contribution points before the percentile ranking is calculated.

A player with 1000 raw points and a 1.5x trust multiplier has an effective score of 1500. A player with 1000 raw points and a 0.5x trust multiplier has an effective score of 500. This means trust can double or halve your standing.

## 6.2 What feeds the trust score

Trust is calculated from:

1. **Endorsements received from land projects**: each one adds `trust.endorsement_project_weight` (default: 4 points)
2. **Endorsements received from players**: each one adds `trust.endorsement_player_weight` (default: 1 point)
3. **Account age**: `trust.account_age_weight` (default: 0.5) per completed season
4. **Validated flags received**: each one subtracts `trust.flag_penalty_weight` (default: 5 points)

The raw trust points are normalized to the multiplier range:
- 0 trust points = `trust.multiplier.min` (0.5x)
- `trust.endorsements_for_max` points (default: 10) = `trust.multiplier.max` (1.5x)
- Linear interpolation between them
- New players with no endorsements start at `trust.multiplier.default` (1.0x)

## 6.3 Cascading endorsement consequences

When a flag on a land project or player is validated by admin:

1. The flagged entity receives `scoring.weights.flag_validated_penalty` (default: -50 points)
2. Every player who endorsed that entity receives `scoring.weights.cascading_endorsement_penalty` (default: -10 points)
3. The endorsement is marked as "endorsed_entity_flagged" in the endorsements table
4. Admin can waive the cascade for individual endorsers (edge cases, good faith errors)

This makes endorsements meaningful. You're putting your reputation on the line when you vouch for someone.

## 6.4 Database additions

Add to `playerProfiles`:
```
trustScore: decimal, default 1.0
trustScoreRaw: integer, default 0  -- raw trust points before normalization
trustLastCalculatedAt: timestamp
```

---

# Part 7: Seasonal Systems

## 7.1 Seasonal Harvest

At the end of each season, a token pool is distributed to all active players proportional to their contribution score percentile.

**How it works:**

1. Admin sets `harvest.pool_size` (default: 10,000 $ReGen) and `harvest.is_active` (default: off, turn on when ready)
2. At season close, a batch job calculates each eligible player's share
3. Eligibility: contribution percentile >= `harvest.min_score_percentile` (default: 10th percentile)
4. Distribution follows a curve controlled by `harvest.distribution_curve` (default: 1.5 exponent). Higher exponent = more reward to top percentiles.
5. Each player's harvest is recorded in `regenTokenLedger` with reason: `seasonal_harvest`
6. The seasonal_harvests table stores a snapshot for the Harvest Review experience

**The math:**
```
share(player) = (player.contributionScore ^ harvest.distribution_curve) / sum(all_eligible_scores ^ harvest.distribution_curve)
harvest(player) = share(player) * harvest.pool_size
```

## 7.2 Score composting (seasonal decay)

At the end of each season (before the next score recalculation):

1. If `composting.is_active` is true (default: off for early seasons)
2. Each player's raw points from previous seasons decay by `composting.decay_rate` (default: 10%)
3. No player's raw total drops below `composting.minimum_floor` (default: 100)
4. A `contribution_score_events` entry with referenceType: 'composting' records the decay
5. The tree visualization never shrinks. The tree is your history; the score is your current standing.

This keeps the playing field fair for new players joining in later seasons.

## 7.3 Seasonal Harvest review experience

When a player logs in after a season closes, they get a full-page review. Swipeable cards on mobile, click-through on desktop.

**Card 1: Quest summary**
"This season you completed X quests."
Visual: completed quest icons stamp into a grid with animation. Seasonal rites highlighted.

**Card 2: Tokens earned**
"You earned Y $ReGen this season."
Counter animates from 0 to Y. Breakdown by source (quests, contributions, events, harvest, admin grants).

**Card 3: Community impact**
"Z people joined through your links. N of them completed their first quest."
If zero referrals: shows forum activity instead.

**Card 4: Your tree this season**
The Living Tree animating from last season's state to current state. Shows how the roots grew, which capital types deepened.

**Card 5: Gratitude**
"You received N gratitude tokens from M people this season."
Shows the top 3 gratitude messages received. Shows how many you sent.

**Card 6: Score and tier**
"Your contribution score grew by N this season. Your tier: [tier name]."
If tier crossed, celebrate it. If new quests are accessible, show what opened.

**Card 7: The shareable card**
"Your Season [Name] in ReGen Civics" with a generated summary image. Share buttons below.

**Database:**
```
seasonal_harvests:
  id: serial primary key
  userId: integer
  seasonId: integer
  questsCompleted: integer
  tokensEarned: decimal
  harvestTokensReceived: decimal
  referralSignups: integer
  referralConversions: integer
  gratitudeReceived: integer
  gratitudeSent: integer
  contributionScoreStart: integer
  contributionScoreEnd: integer
  newTier: varchar, nullable
  viewedAt: timestamp, nullable
  sharedAt: timestamp, nullable
  createdAt: timestamp
```

## 7.4 Seasonal Councils

Top contributors craft proposals that all RGVoice holders vote on. Councils don't vote themselves. They shape what gets voted on, which is real power, but all final decisions rest with the full community.

**Structure:**
- Council size: `governance.council_seats` (default: 7)
- Qualification: contribution percentile >= `governance.council_min_score` (default: 80th) AND Rites of Passage complete (if `governance.council_require_rites` is true)
- Term: one season. No permanent seats. Must re-qualify each season.

**What councils do:**
- Craft seasonal proposals for the community to vote on (quest curation, featured content, community fund allocation, governance changes)
- Each proposal goes to all RGVoice holders for a community-wide vote
- All proposals and outcomes are published to the community (full transparency)

**What councils cannot do:**
- Vote on their own proposals (that's what RGVoice is for)
- Override Rye's decisions
- Make fund investment decisions (that's the Fund's governance)
- Change game rules unilaterally
- Remove or ban players
- Set their own compensation

**Admin controls:**
- View current council, their scores
- Create/edit proposals for the council to work on
- View voting results
- Archive past councils and their work

**Database:**
```
seasonal_councils:
  id, seasonId, name, seatCount, minimumPercentile,
  requiresRitesComplete (boolean), status (forming/active/archived), createdAt

council_seats:
  id, councilId, userId, invitedAt, acceptedAt, declinedAt

council_proposals:
  id, councilId, authorId (council member who drafted it),
  title, description, options (JSON),
  status (draft/submitted/voting/closed),
  votingOpensAt, votingClosesAt,
  outcome, adminNotes, publishedAt, createdAt

council_votes:
  id, proposalId, userId (any RGVoice holder), selectedOption, votedAt
```

---

# Part 8: Community and Profile Features

## 8.1 Contribution Compass (9 forms)

A radar chart on every player's profile showing contribution across 9 categories. Same data as the Living Tree roots, different presentation.

9 axes: Quests, Financial, Social, Cultural, Living, Intellectual, Experiential, Material, Health/Vital.

Each axis scaled 0-100 (normalized to percentile among all players for that category). Hovering an axis shows the raw score and what fed into it. Below the chart: "Your strongest: [category]" and "Room to grow: [category]."

Database: add `'health'` to the capitalType enum in playerContributions.

## 8.2 Mycelium Network

A d3-force visualization of the player's referral network. Player at center. First-degree referrals branch outward. Second-degree from those. Max 2 degrees, max 50 nodes.

Thread thickness = how active the referred person is. Green = active this season. Fading = inactive recently. Nodes pulse on quest completion or contribution.

Framed as "people you've connected to this community." No sharing scores exposed.

Mobile: simplified list view with connection lines.

Data source: referrals table (already exists in schema).

## 8.3 Contribution Proof Timeline

Vertical timeline on the player's profile showing all contributions chronologically. Merges quest completions, playerContributions, gratitude received, endorsements, and badges into a single feed.

Each entry: date, artifact thumbnail, title, category badge, verified/unverified status.

Privacy: per-artifact visibility (public, community-only, private). Default: community-only.

Database additions to playerContributions:
```
artifactType: enum('photo', 'text', 'link', 'video', 'none')
artifactUrl: varchar
artifactText: text
visibility: enum('public', 'community', 'private'), default 'community'
```

## 8.4 Regenerative Resume

Exportable player profile. Pulls together: name, avatar, tier, member-since date, contribution score, compass visualization (static image), top quests, key contributions with evidence, endorsements, badges, events attended, tokens earned.

Formats:
- Web page: `/play/[username]/resume`
- PDF export: downloadable from profile
- OG card: generated via /api/og endpoint

Verification URL: `regencivics.earth/verify/[hash]` links to a live read-only view.

## 8.5 Mutual Endorsements and Flags

**Endorsements (3 directions):**
- Player endorses Land Project (shows on project profile)
- Land Project endorses Player (shows on player profile, high weight)
- Player endorses Player (shows on player profile, lighter weight)

All endorsements: optional note (max 280 chars), one per entity per player, one-time only.

**Flags (3 directions, admin-only visibility):**
- Player flags Project/Player/Player flags Player
- Required: reason (misrepresentation, unresponsive, safety concern, harassment, other)
- Optional: description
- Goes to admin only, never public

**Admin view:** "Endorsements & Flags" section with two tabs. Flags sorted by recency, unresolved first. Each flag: Dismiss, Investigate, Take Action (warn, suspend, remove). When actioned, cascading penalties fire (Part 6.3).

**Anti-gaming:** one endorsement per entity per player, 30-day-old accounts flagged as "new" in admin, self-endorsement blocked.

Database:
```
endorsements:
  id, endorserType (player/project), endorserId,
  endorsedType (player/project), endorsedId,
  note (varchar 280), status (active/revoked/endorsed_entity_flagged),
  createdAt

flags:
  id, flaggerType (player/project), flaggerId,
  flaggedType (player/project), flaggedId,
  reason (enum), description, status (pending/investigating/dismissed/actioned),
  adminNotes, resolvedAt, cascadePenaltiesApplied (boolean), createdAt
```

## 8.6 Co-Creator Invitations

When a player's contribution percentile crosses `governance.cocreator_threshold_percentile` (default: 90th), they become eligible.

Admin sees eligible-but-not-invited list. Click "Invite," customize a message. Player receives notification + email. If accepted: Co-Creator badge, access to private Co-Creators forum category, early quest previews, input on governance proposals, the Co-Creators Guide page.

Admin can revoke co-creator status. Tracks acceptance rate.

## 8.7 Contribution-Gated Quests

After completing all 13 Rites of Passage AND reaching a contribution percentile threshold, new quest tiers appear.

Admin UI: "Quest Unlock Tiers" section. Create tiers with name, minimum percentile, and assigned quests. Quests in locked tiers are invisible (not greyed out). When a player qualifies, they get a notification. The quest page shows a subtle note: "More quests become available as you contribute."

Build the admin interface and gating logic now. Populate tiers later.

Database:
```
quest_unlock_tiers:
  id, name, minimumPercentile, sortOrder,
  requiresRitesComplete (boolean, default true), createdAt

quest_tier_assignments:
  id, tierId, questId, createdAt
```

## 8.8 Bioregional Identity

Optional. Players can associate with a bioregion (self-selected from a map or text field, stored in the existing bioregionId field on playerProfiles).

On the map page: show player density by bioregion alongside land projects. Regional contribution scores become visible: "Pacific Northwest: 14 players, 3 projects."

Lays groundwork for regional governance, regional crowd-pooling, and bioregional quests.

No new tables needed. Uses existing playerProfiles.bioregionId and the geo route.

## 8.9 Forum Reputation Weighting

Forum reactions carry weight based on the voter's contribution tier.

When a player reacts to a post or reply, the reaction's weight is scaled between `forum.vote_weight_min` (default 1.0) and `forum.vote_weight_max` (default 2.0) based on their percentile.

The weighted reaction count determines quality signals (which replies count as "quality" for scoring purposes) and feed into forum ranking.

Database: add `reactionWeight: decimal, default 1.0` to the postReactions table.

---

# Part 9: Admin Systems

## 9.1 Living Ledger (real-time activity feed)

Admin tab: "Live Feed." Every significant action, in real time.

Events: quest completions, contributions logged, endorsements given/received, referral signups, badges earned, crowd-pooling contributions, event attendance, gratitude sent, flags submitted, council proposals created, score tier changes.

Filterable by: action type, player, project, date range. Clickable entries link to relevant admin views. Counts at the top: today, this week, this month. Pause button to freeze for reading.

Future: community-facing version (public, excludes flags and admin-only actions, respects privacy settings).

Database:
```
activity_feed_events:
  id, eventType (enum of all action types),
  actorType (player/project/system), actorId,
  targetType (quest/post/project/player/campaign/event/gratitude), targetId,
  metadata (JSON), visibility (public/admin_only), createdAt
```

Write to this table from every relevant mutation using a shared `logActivityEvent()` helper.

## 9.2 Quiet Recognitions

Admin section: "Player Recognition." Auto-generated candidate list of players with notable recent activity (sorted by score gain, sharing activity, quest completions, endorsements).

Each candidate: name, avatar, tier, 2-3 auto-generated activity highlights, "Recognize" button.

Compose window: pre-filled context, personal message field, optional token grant (amount + reason), optional badge attachment. Send as in-app notification, email, or both.

Not automated. You write each one. The system just surfaces candidates and makes composing fast.

## 9.3 Silent Sharing Score

Track social sharing activity per player in the background. Never shown to the player.

In the Social & Sharing admin tab, a "Silent Scores" section: ranked list by sharing score. Each row: name, total shares, arrivals, signups, active conversions, quality percentage. "Send Recognition" button per row. "Grant Tokens" button per row.

When a player's silent sharing score crosses a threshold (configurable in game_variables), admin gets a notification. Token grants from sharing use reason: `admin_grant` with a note like "Community recognition for organic growth." Never says "sharing reward."

## 9.4 RGVoice Delegation Link

On the player profile, next to their RGVoice balance: a "Delegate" button. Clicking it opens the Hypha delegation page for the ReGen Games space: `https://app.hypha.earth/en/dho/regen-games/members`

This is a simple external link. No custom delegation UI needed. Hypha handles the governance mechanics. The button just makes it easy to find.

---

# Part 10: Complete Database Schema (new tables and additions)

## New tables

```sql
-- Game Variables (the backbone)
CREATE TABLE game_variables (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50) NOT NULL,
  key VARCHAR(100) UNIQUE NOT NULL,
  displayName VARCHAR(200) NOT NULL,
  description TEXT,
  value DECIMAL(20,6) NOT NULL,
  valueType ENUM('integer','decimal','percentage','boolean','multiplier') NOT NULL,
  minValue DECIMAL(20,6),
  maxValue DECIMAL(20,6),
  defaultValue DECIMAL(20,6) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updatedBy INTEGER,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_variable_history (
  id SERIAL PRIMARY KEY,
  variableId INTEGER NOT NULL,
  previousValue DECIMAL(20,6) NOT NULL,
  newValue DECIMAL(20,6) NOT NULL,
  changedBy INTEGER NOT NULL,
  reason TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contribution Scoring
CREATE TABLE contribution_score_events (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  points INTEGER NOT NULL,
  variableKey VARCHAR(100),
  referenceType ENUM('quest','forum_post','forum_reply','event','contribution','referral','endorsement','badge','gratitude','flag','streak','crowdpool','composting') NOT NULL,
  referenceId INTEGER,
  seasonId INTEGER,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gratitude
CREATE TABLE gratitude_transactions (
  id SERIAL PRIMARY KEY,
  senderId INTEGER NOT NULL,
  receiverId INTEGER NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  message VARCHAR(280) NOT NULL,
  seasonId INTEGER NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gratitude_budgets (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL,
  seasonId INTEGER NOT NULL,
  totalBudget INTEGER NOT NULL,
  spent INTEGER NOT NULL DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, seasonId)
);

-- Endorsements & Flags
CREATE TABLE endorsements (
  id SERIAL PRIMARY KEY,
  endorserType ENUM('player','project') NOT NULL,
  endorserId INTEGER NOT NULL,
  endorsedType ENUM('player','project') NOT NULL,
  endorsedId INTEGER NOT NULL,
  note VARCHAR(280),
  status ENUM('active','revoked','endorsed_entity_flagged') DEFAULT 'active',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(endorserType, endorserId, endorsedType, endorsedId)
);

CREATE TABLE flags (
  id SERIAL PRIMARY KEY,
  flaggerType ENUM('player','project') NOT NULL,
  flaggerId INTEGER NOT NULL,
  flaggedType ENUM('player','project') NOT NULL,
  flaggedId INTEGER NOT NULL,
  reason ENUM('misrepresentation','unresponsive','safety_concern','harassment','other') NOT NULL,
  description TEXT,
  status ENUM('pending','investigating','dismissed','actioned') DEFAULT 'pending',
  adminNotes TEXT,
  resolvedAt TIMESTAMP,
  cascadePenaltiesApplied BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(flaggerType, flaggerId, flaggedType, flaggedId)
);

-- Seasonal Systems
CREATE TABLE seasonal_harvests (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL,
  seasonId INTEGER NOT NULL,
  questsCompleted INTEGER DEFAULT 0,
  tokensEarned DECIMAL(20,6) DEFAULT 0,
  harvestTokensReceived DECIMAL(20,6) DEFAULT 0,
  referralSignups INTEGER DEFAULT 0,
  referralConversions INTEGER DEFAULT 0,
  gratitudeReceived INTEGER DEFAULT 0,
  gratitudeSent INTEGER DEFAULT 0,
  contributionScoreStart INTEGER DEFAULT 0,
  contributionScoreEnd INTEGER DEFAULT 0,
  newTier VARCHAR(50),
  viewedAt TIMESTAMP,
  sharedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, seasonId)
);

-- Seasonal Councils
CREATE TABLE seasonal_councils (
  id SERIAL PRIMARY KEY,
  seasonId INTEGER NOT NULL,
  name VARCHAR(100) NOT NULL,
  seatCount INTEGER NOT NULL DEFAULT 7,
  minimumPercentile INTEGER NOT NULL DEFAULT 80,
  requiresRitesComplete BOOLEAN DEFAULT TRUE,
  status ENUM('forming','active','archived') DEFAULT 'forming',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE council_seats (
  id SERIAL PRIMARY KEY,
  councilId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  invitedAt TIMESTAMP,
  acceptedAt TIMESTAMP,
  declinedAt TIMESTAMP,
  UNIQUE(councilId, userId)
);

CREATE TABLE council_proposals (
  id SERIAL PRIMARY KEY,
  councilId INTEGER NOT NULL,
  authorId INTEGER NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  options JSON,
  status ENUM('draft','submitted','voting','closed') DEFAULT 'draft',
  votingOpensAt TIMESTAMP,
  votingClosesAt TIMESTAMP,
  outcome TEXT,
  adminNotes TEXT,
  publishedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE council_votes (
  id SERIAL PRIMARY KEY,
  proposalId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  selectedOption VARCHAR(200) NOT NULL,
  votedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(proposalId, userId)
);

-- Quest Unlock Tiers
CREATE TABLE quest_unlock_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  minimumPercentile INTEGER NOT NULL,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  requiresRitesComplete BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quest_tier_assignments (
  id SERIAL PRIMARY KEY,
  tierId INTEGER NOT NULL,
  questId VARCHAR(100) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tierId, questId)
);

-- Activity Feed
CREATE TABLE activity_feed_events (
  id SERIAL PRIMARY KEY,
  eventType VARCHAR(50) NOT NULL,
  actorType ENUM('player','project','system') NOT NULL,
  actorId INTEGER,
  targetType VARCHAR(50),
  targetId INTEGER,
  metadata JSON,
  visibility ENUM('public','admin_only') DEFAULT 'public',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Additions to existing tables

```sql
-- playerProfiles additions
ALTER TABLE playerProfiles ADD COLUMN contributionScore INTEGER DEFAULT 0;
ALTER TABLE playerProfiles ADD COLUMN contributionScoreRaw INTEGER DEFAULT 0;
ALTER TABLE playerProfiles ADD COLUMN trustScore DECIMAL(5,3) DEFAULT 1.000;
ALTER TABLE playerProfiles ADD COLUMN trustScoreRaw INTEGER DEFAULT 0;
ALTER TABLE playerProfiles ADD COLUMN scoreLastCalculatedAt TIMESTAMP;
ALTER TABLE playerProfiles ADD COLUMN trustLastCalculatedAt TIMESTAMP;
ALTER TABLE playerProfiles ADD COLUMN currentTier VARCHAR(50) DEFAULT 'Seedling';
ALTER TABLE playerProfiles ADD COLUMN seasonsCompleted INTEGER DEFAULT 0;

-- playerContributions: add health to capitalType enum
-- (Drizzle migration: extend enum with 'health')

-- playerContributions: add artifact support
ALTER TABLE playerContributions ADD COLUMN artifactType ENUM('photo','text','link','video','none') DEFAULT 'none';
ALTER TABLE playerContributions ADD COLUMN artifactUrl VARCHAR(500);
ALTER TABLE playerContributions ADD COLUMN artifactText TEXT;
ALTER TABLE playerContributions ADD COLUMN visibility ENUM('public','community','private') DEFAULT 'community';

-- applications: add project status tracking
ALTER TABLE applications ADD COLUMN projectStatus ENUM('applied','accepted','active','established','anchor') DEFAULT 'applied';
ALTER TABLE applications ADD COLUMN projectStatusUpdatedAt TIMESTAMP;
ALTER TABLE applications ADD COLUMN endorsementCount INTEGER DEFAULT 0;
ALTER TABLE applications ADD COLUMN contributionCount INTEGER DEFAULT 0;
ALTER TABLE applications ADD COLUMN fundedCampaignCount INTEGER DEFAULT 0;
ALTER TABLE applications ADD COLUMN seasonsActive INTEGER DEFAULT 0;

-- postReactions: add weighted reactions
ALTER TABLE postReactions ADD COLUMN reactionWeight DECIMAL(5,2) DEFAULT 1.00;
```

---

# Part 11: Implementation Priority

## Phase 1: Foundation (build first, everything else depends on these)

1. **game_variables table + admin UI** -- The backbone. Seed all initial variables. Build the Game Variables admin panel with edit, history, search, preview.
2. **contribution_score_events table + scoring logic** -- Start recording events for all actions. Build the percentile calculation job. Add score + tier display to player profiles.
3. **activity_feed_events table + logActivityEvent() helper** -- Start capturing all activity from day one. Build the Living Ledger admin tab.
4. **endorsements + flags tables** -- Basic endorsement and flag system. Admin moderation UI.

## Phase 2: Trust and Gratitude

5. **Trust score calculation** -- Build the multiplier system. Wire it into score calculation.
6. **Cascading consequences** -- Wire flag validation to cascade penalties through endorsements.
7. **Gratitude system** -- gratitude_transactions + budgets tables. UI on profiles, forum, community page. Admin Gratitude Flows view.
8. **Forum reputation weighting** -- Add reactionWeight to postReactions. Wire voter percentile into weight.

## Phase 3: Profile Experience

9. **Contribution Compass** (9-axis radar chart on profiles)
10. **Contribution Proof Timeline** (merged chronological feed on profiles)
11. **Living Tree Visualization** (SVG component, all stages)
12. **Land project status progression** (5 levels, admin thresholds, nightly calculation)

## Phase 4: Seasonal Systems

13. **Score composting** (seasonal decay logic, admin toggle)
14. **Seasonal Harvest** (token pool distribution, admin configuration)
15. **Seasonal Harvest Review** (7-card experience, shareable summary)
16. **Mycelium Network** (d3-force referral visualization on profiles)

## Phase 5: Governance and Advanced

17. **Seasonal Councils** (formation, proposal drafting, community voting)
18. **Contribution-gated quests** (tier system, admin assignment, unlock logic)
19. **Co-creator invitations** (threshold-based eligibility, admin invite flow)
20. **Regenerative Resume** (exportable web + PDF + OG card)
21. **Bioregional identity** (regional player density, map integration)
22. **Quiet Recognitions** (admin candidate list, compose + send)
23. **Silent Sharing Score** (background tracking, admin view, notification thresholds)
24. **RGVoice delegation link** (button on profile, links to Hypha)

---

# Compatibility Notes

This spec was built against the actual codebase schema (drizzle/schema.ts) and existing admin structure. Key compatibility points:

**Existing tables preserved:**
- playerProfiles: only adding new columns, no changes to existing ones
- playerContributions: extending capitalType enum, adding optional columns
- regenTokenLedger: unchanged, seasonal harvest uses existing `reason` enum (add 'seasonal_harvest' value)
- questCompletions: unchanged, contribution_score_events records quest completions separately
- forumPosts, forumReplies: unchanged
- postReactions: adding optional reactionWeight column (default 1.0, backward compatible)
- referrals: unchanged, mycelium network reads from it
- applications: adding optional columns for project status tracking
- campaigns, campaignContributions: unchanged, read for score events

**Existing features untouched:**
- All quest data (questData.ts, welcomeAboardQuests.ts, epicQuestsData.ts) unchanged
- ContributionCalculator.tsx unchanged (extend with Health/Vital option)
- All existing admin tabs preserved, new ones added alongside
- Auth flow, email system, event system, newsletter system untouched
- Farcaster integration, geo routes, knowledge map, glossary all untouched

**Integration points:**
- Quest completion mutations: add a call to create contribution_score_events + logActivityEvent()
- Forum post/reply mutations: same
- Event attendance mutations: same
- playerContributions create mutation: same
- Campaign contribution mutations: same
- Referral tracking mutations: same
- Admin badge award flow: same

Each integration is a single function call added to existing mutation handlers. No existing logic changes.

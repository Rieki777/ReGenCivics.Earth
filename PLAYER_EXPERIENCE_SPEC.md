# Player Experience Spec: Contribution Score, Profiles, and Engagement

This spec covers the player-facing systems that make contribution visible, meaningful, and rewarding inside ReGen Civics. It builds on top of the existing playerProfiles, regenTokenLedger, questCompletions, playerContributions, and the new social sharing infrastructure from SOCIAL_SHARING_SPEC.md.

The core idea: everything a player does on the site (quests, forum posts, contributions, sharing, events, endorsements) feeds into a unified contribution score. That score drives what they can access, how they're recognized, and eventually how much governance weight they carry.

---

## 1. Contribution Score (the backbone)

A single composite number on every player's profile. It grows with everything they do. The weights are configurable in admin so you can tune the system without a deploy.

### Score inputs and default weights

| Action | Points | Notes |
|--------|--------|-------|
| Quest completed (routine) | 10 | Per completion |
| Quest completed (seasonal rite) | 25 | Per rite |
| Quest completed (epic) | 100 | Per epic |
| Forum post created | 5 | |
| Forum reply that gets 3+ upvotes | 3 | Quality signal |
| Event attended | 15 | Per event |
| Contribution logged (any capital type) | 10-50 | Scaled by estimated value |
| Contribution verified by admin | +25 bonus | On top of base points |
| Crowd-pooling contribution made | 20 | Per contribution |
| Referral signup (captured silently) | 10 | Only counted once per referred user |
| Referred user completes first quest | 15 | |
| Endorsement received from land project | 20 | |
| Endorsement received from player | 5 | |
| Badge earned | 10-50 | Varies by badge tier |
| Lunar streak (consecutive weeks) | 2 per week | Compounds |

### Admin controls

Build an "Engagement Scoring" section in admin settings where you can:
- View and edit every weight in the table above
- Set minimum thresholds for specific actions (e.g., "forum posts only count if they have at least 1 reply")
- Preview what a weight change would do to the top 20 players' scores before applying
- Toggle individual action types on/off (useful during testing)
- View a histogram of score distribution across all players

### Database

Add to `playerProfiles`:
```
contributionScore: integer, default 0
scoreLastCalculatedAt: timestamp
```

Add new table `contribution_score_events`:
```
id, userId, action (enum matching the table above), points,
referenceType (quest/post/event/contribution/referral/endorsement),
referenceId, createdAt
```

This gives you a full audit trail of how every point was earned. The score on the profile is a cached sum. A nightly job recalculates from the events table to catch any drift.

### Display

The score appears on the player's profile page as a number with a label that changes based on tier:

| Score Range | Label |
|-------------|-------|
| 0-49 | Seedling |
| 50-149 | Sprout |
| 150-349 | Sapling |
| 350-749 | Grower |
| 750-1499 | Steward |
| 1500-2999 | Elder |
| 3000+ | Guardian |

The tier names can be edited in admin. The thresholds can be edited in admin.

---

## 2. Silent Sharing Score

Track social sharing activity per player in the background. This score is never shown to the player. It exists only in admin.

### What's tracked

- Number of times the player clicked a share button (any platform)
- Number of unique people who arrived via their referral links
- Number of those arrivals who signed up
- Number of those signups who completed a quest
- Conversion quality: what percentage of their referrals become active players

### Admin view

In the Social & Sharing admin tab (from SOCIAL_SHARING_SPEC.md), add a "Silent Scores" section:
- Ranked list of players by sharing score
- Each row shows: name, total shares, arrivals, signups, active conversions, quality percentage
- A "Send Recognition" button on each row that opens a compose window for a personal message
- A "Grant Tokens" button that opens a token grant form pre-filled with the player's info

### How you use it

When a player's silent sharing score crosses a threshold you set in admin (default: top 10 sharers this month), you get a notification. You decide what to do. Maybe it's a personal message. Maybe it's a surprise token grant. Maybe it's an invitation to co-create. The player never knows they're being tracked for sharing. They just know someone noticed.

### Token grants from sharing

When you grant tokens to a sharer, the `regenTokenLedger` entry uses reason: `admin_grant` with a note like "Community recognition for organic growth." It doesn't say "sharing reward." This keeps it feeling like recognition, not compensation.

---

## 3. Living Growth Visualization

**Rye's direction:** Not a cut tree with rings. Needs to say life, regeneration, growth.

**Options to decide between:**

**Option A: Seed of Life geometry.** Each of the contribution categories maps to one of the overlapping circles in the Seed of Life pattern (already part of ReGen Civics branding). Low activity = faint outline. High activity = glowing, filled circle. Full contribution across all categories = a complete, radiant Flower of Life. This ties directly to the site's existing visual language.

**Option B: Flower bloom.** Each petal represents a contribution category. The flower grows from a bud (new player) to a full bloom (highly active across all categories). Petal size and color intensity reflect activity level. Seasonal flowers change with each season (fire colors in fire season, water blues in water season, etc.).

**Option C: Root/canopy system.** A living tree shown in profile, with roots below (representing the foundational work: contributions, forum activity, endorsements) and canopy above (representing visible impact: quests, badges, tokens). The tree grows taller and wider as the player contributes more. Different branch types for different categories. Always alive, always growing.

**Decision needed from Rye:** Which direction? Can also combine (e.g., Seed of Life as the data visualization on the profile stats card, Flower bloom as the seasonal harvest card artwork).

### Categories displayed (9 total)

| Category | What feeds it |
|----------|--------------|
| Quests | Quest completions (routine, seasonal, epic) |
| Contributions | Logged contributions (8 capital types) |
| Forum | Posts created, replies, upvotes received |
| Events | Sessions attended, recordings watched |
| Sharing | Social shares, referral arrivals (shown as "community growth" not "sharing score") |
| Governance | Votes cast, proposals made, council participation |
| Endorsements | Endorsements given and received |
| Financial | Crowd-pooling contributions, fund investments |
| Health | Contributions to health of people: fitness coaching, diet guidance, wellness programs, healing practices, physical and mental health support |

### Implementation

- Build as a React component that takes the 9 category values and renders the chosen visualization
- SVG-based for crisp rendering at any size
- Animated: categories pulse gently when they've grown recently
- Appears on the player's public profile page
- Smaller version (icon-sized) appears next to the player's name in forum posts and community listings

---

## 4. Seasonal Harvest

At the end of each season, every player gets a personal review of what they did that season. This is a full-page experience, not a notification.

### Flow

When a player logs in after a season closes (or clicks "View Your Harvest" from a notification), they get a sequence of cards. Each card fills the screen. Swipeable on mobile, click-through on desktop. Light animation on each card (counters ticking up, icons appearing).

**Card 1: Quest summary**
"This season you completed X quests."
Visual: completed quest icons arranged in a grid, each one stamps into place with a satisfying animation. Seasonal rites highlighted with their seasonal color.

**Card 2: Tokens earned**
"You earned Y $ReGen this season."
Visual: counter animates from 0 to Y. Below it, a breakdown by source (quests, contributions, events, admin grants).

**Card 3: Community impact**
"Z people joined through your links. [N] of them completed their first quest."
Visual: avatars of referred users appear one by one. If zero referrals, this card shows forum activity instead: "You wrote N posts and received M replies."

**Card 4: Contribution compass**
"Your contributions this season across 9 forms."
Visual: the growth visualization (#3) animating from empty to current state, showing how the player's shape changed over the season.

**Card 5: Harvest bonus**
"Your contribution score grew by N this season. Your new tier: [tier name]."
If they crossed a tier threshold, celebrate it. If they unlocked new quests (from #7), show what's now available.

**Card 6: The shareable card**
"Your Season [Name] in ReGen Civics" with a summary image (generated via the /api/og endpoint from SOCIAL_SHARING_SPEC.md). Share buttons below.

### Admin controls

- Set the season close date (harvest becomes available after this date)
- Preview any player's harvest before it goes live
- Edit the card copy for each season (the text templates above are defaults)
- Set whether the harvest is mandatory (appears on login) or optional (notification + link)

### Database

```
seasonal_harvests:
  id, userId, seasonId,
  questsCompleted, tokensEarned, referralSignups, referralConversions,
  contributionScoreGain, newTier,
  viewedAt, sharedAt, createdAt
```

Pre-calculate harvests in a batch job when the season closes. Store the snapshot so it's instant when the player opens it.

---

## 5. Your Mycelium Network

A visualization of the player's network of influence. Shows who they brought in, who those people brought in, and what activity happened downstream.

### Display

Renders as a mycelium-style network graph on the player's profile. The player is at the center. First-degree referrals branch outward. Second-degree referrals branch from those. Each node is a small avatar or initial.

Thread thickness = how active that referred person is. Bright green = active this season. Fading = hasn't been active recently. Nodes pulse when they complete a quest or make a contribution.

### Data

Pulls from the `referrals` table (from SOCIAL_SHARING_SPEC.md). The network is limited to 2 degrees (your referrals and their referrals). No deeper. This keeps it readable and prevents performance issues.

### What the player sees

- Their network with a count: "Your network: 12 players, 3 land projects connected"
- Activity feed within the network: "Maya (your referral) completed the Fire Ceremony quest"
- No sharing scores, no "you shared X times." The visualization is framed as "people you've connected to this community."

### Implementation

- Use d3-force for the network layout
- SVG rendering with hover tooltips
- Limit to 50 nodes max (if someone has more referrals, show the most active ones)
- Mobile: simplified list view with connection lines instead of full network graph

---

## 6. Contribution Compass (9 Forms)

A radar chart on every player's profile showing their contribution across 9 categories.

### The 9 axes

1. **Quests** (quest completions)
2. **Financial** (crowd-pooling, fund contributions)
3. **Social** (forum activity, replies, community building)
4. **Cultural** (content created, stories shared, blog posts)
5. **Living** (land-based contributions, ecological work)
6. **Intellectual** (guides written, proposals drafted, governance participation)
7. **Experiential** (events attended, sessions hosted, mentoring)
8. **Material** (physical resources contributed, tools, infrastructure)
9. **Health** (fitness coaching, diet guidance, wellness programs, healing practices, physical and mental health support contributions)

### Display

- Radar chart with 9 axes, each scaled 0-100 (normalized to percentile among all players)
- Filled area shows the player's shape
- Hovering an axis shows the raw score and what fed into it
- Below the chart: "Your strongest contribution: [category]" and "Where you could grow: [category]"
- Color scheme follows the seasonal palette

### How Health data enters the system

The existing contribution calculator (ContributionCalculator.tsx) uses the 8 Forms of Capital. Add "Health / Vital" as the 9th form. When a player logs a contribution and selects "Health / Vital" as the capital type, it feeds this axis. Examples in the calculator UI:
- "Led a group fitness session for the community"
- "Provided diet coaching to 3 community members"
- "Organized a community health day"
- "Shared a healing practice with the forum"

### Database change

Add `health` to the `capitalType` enum in the `playerContributions` table:
```
capitalType: enum('financial', 'social', 'cultural', 'living', 'intellectual', 'experiential', 'material', 'spiritual', 'health')
```

---

## 7. Contribution-Gated Quests

Some quests only become visible after a player has completed the Rites of Passage series AND reached a certain contribution score. This is the "second tier" of the game.

### How it works

1. Player completes all 13 Rites of Passage (existing quest locking system)
2. New quest tiers become visible based on contribution score
3. You (Rye) set the unlock thresholds and assign quests to tiers in admin

### Admin interface

New section in admin: "Quest Unlock Tiers"

| Field | Description |
|-------|------------|
| Tier name | e.g., "Steward Quests", "Elder Quests" |
| Minimum contribution score | e.g., 350, 750, 1500 |
| Prerequisite | "Rites of Passage complete" (always required) |
| Assigned quests | Multi-select from all quests |

You can create as many tiers as you want. Each tier has a score threshold and a list of quests. When a player's score crosses the threshold (and they've done the Rites), those quests appear.

### Player experience

- Quests in locked tiers don't appear at all (not greyed out, just invisible). The player doesn't know they exist until they qualify.
- When a player qualifies for a new tier, they get a notification: "New quests available. Your contributions have opened up [Tier Name]."
- The quest page shows a subtle indicator: "More quests become available as you contribute to the community." No specific scores mentioned.

### Build it now, populate later

The admin interface and the gating logic should be built now. You can assign quests to tiers later as you design them. For now, the system is empty and all quests remain accessible through the normal quest locking chain.

### Database

```
quest_unlock_tiers:
  id, name, minimumScore, sortOrder, requiresRitesComplete (boolean, default true), createdAt

quest_tier_assignments:
  id, tierId, questId, createdAt
```

---

## 8. Co-Creator Invitations

When a player's contribution score crosses a threshold (configurable in admin, default: top 10% of active players), they become eligible for a co-creator invitation.

### How it works

- Admin panel shows a list of players above the threshold who haven't been invited yet
- You click "Invite" and customize a short message
- The player receives a direct message (in-app notification + email): "Your contributions to ReGen Civics have been significant. We'd like to invite you to help shape what comes next."
- If they accept, their profile gets a "Co-Creator" badge and they gain access to:
  - A private "Co-Creators" forum category
  - Early previews of new quests before they go live
  - Input on governance proposals (see #14)
  - The Co-Creators Guide page (already exists at /co-creators-guide)

### Admin controls

- Set the score threshold for eligibility
- View eligible-but-not-yet-invited players
- Track acceptance rate
- Revoke co-creator status if needed

---

## 9. REMOVED (token concentration concern)

Rye decided against the Token Harvest Multiplier. Higher contribution scores should not earn tokens at a higher rate, as this concentrates tokens among already-active players.

---

## 10. Mutual Endorsements and Flags

Land projects and players can endorse each other, and either can flag bad actors. This goes both directions.

### Endorsements

**Player endorses Land Project:**
- "I've worked with [Project Name] and can vouch for their work."
- Shows on the land project's profile as a player endorsement
- Optional note (max 280 characters)

**Land Project endorses Player:**
- Steward of a land project endorses a specific player
- "This player contributed meaningfully to our project."
- Shows on the player's profile with the project's name and logo
- Optional note from the steward

**Player endorses Player:**
- "I vouch for [Player Name]."
- Shows on the endorsed player's profile
- Lighter weight than a land project endorsement (5 points vs 20)

### Flags

**Player flags Land Project:**
- "I have a concern about [Project Name]."
- Flag goes to admin only (not visible publicly)
- Required: select a reason (misrepresentation, unresponsive, safety concern, other)
- Optional: description

**Land Project flags Player:**
- Steward flags a player for bad behavior
- Same structure: goes to admin, reason required, description optional

**Player flags Player:**
- Same structure

### Admin view

New section in admin: "Endorsements & Flags"
- Tab 1: All endorsements (sortable, filterable by type)
- Tab 2: All flags (sorted by recency, unresolved first)
- Each flag has: "Dismiss", "Investigate", "Take Action" buttons
- "Take Action" options: warn the flagged entity, suspend, or remove

### Anti-gaming

- A player can only endorse the same entity once
- A player can only flag the same entity once (but can update their flag)
- Endorsements from accounts less than 30 days old are marked "new account" in admin
- Self-endorsement is blocked

### Contribution score impact

- Receiving an endorsement from a land project: +20 points
- Receiving an endorsement from a player: +5 points
- Giving an endorsement: +2 points (encourages generosity)
- Receiving a validated flag: score deduction set in admin (default: -50)
- Giving a validated flag: +5 points (encourages community policing)

### Database

```
endorsements:
  id, endorserType (player/project), endorserId,
  endorsedType (player/project), endorsedId,
  note, createdAt

flags:
  id, flaggerType (player/project), flaggerId,
  flaggedType (player/project), flaggedId,
  reason (enum: misrepresentation, unresponsive, safety_concern, harassment, other),
  description, status (pending/investigating/dismissed/actioned),
  adminNotes, resolvedAt, createdAt
```

---

## 11. Contribution Proof Timeline

Every contribution type can have an artifact. These populate a visual timeline on the player's profile. It becomes a portfolio of real-world action.

### How it works

The existing quest completion system already supports artifacts (photo, text, link, video). Extend this to all contribution types:

- Financial contribution: receipt, screenshot, or confirmation
- Social capital: photo from the event, link to the forum thread
- Living capital: picture of the food forest, the garden, the land
- Health capital: photo from the wellness session, link to the guide they wrote
- Intellectual capital: link to the document, the proposal, the guide
- Any contribution: optional photo, link, or text evidence

### Timeline display

On the player's profile, a vertical timeline showing contributions in chronological order:

```
March 2026
  [photo] Completed Fire Ceremony quest
  [link] Led community fitness session (Health capital, verified)
  [photo] Planted 12 fruit trees at Finca Sonora (Living capital)

February 2026
  [text] Wrote governance proposal for Season 2 voting (Intellectual capital)
  [photo] Completed Welcome Aboard series (Quest, badge earned)
```

Each entry shows: date, artifact thumbnail, title, category badge, and verified/unverified status. Click to expand and see the full artifact.

### Privacy

- Players choose visibility per artifact: public, community-only, or private
- Default: community-only (visible to logged-in users)
- Private artifacts still count toward contribution score but don't appear on the timeline

### Implementation

Extend the existing `questCompletions` artifact fields to `playerContributions`:
```
Add to playerContributions:
  artifactType: enum('photo', 'text', 'link', 'video', 'none')
  artifactUrl: varchar
  artifactText: text
  visibility: enum('public', 'community', 'private'), default 'community'
```

Build a `<ContributionTimeline>` component that merges quest completions and player contributions into a single chronological feed.

---

## 12. Regenerative Resume

An exportable document that pulls together a player's contribution history into a shareable format. Useful for job applications in the regen space, land project team recruiting, or personal portfolio.

### What it includes

- Player name, avatar, tier, and member-since date
- Contribution score with tier label
- Contribution compass visualization (the 9-axis radar chart as a static image)
- Top 5 quests completed (by difficulty/impact)
- Key contributions with evidence links
- Endorsements received (with project names and notes)
- Badges earned
- Events attended (count + notable ones)
- Tokens earned (total $ReGen)
- A "Verified by ReGen Civics" footer with a unique verification URL

### Meaningful metrics it pulls out

Instead of just listing everything, the resume highlights the metrics that matter:
- "Completed X of 13 Rites of Passage"
- "Contributed Y hours of [strongest capital type] to [N] projects"
- "Endorsed by [N] land projects"
- "Active for [N] consecutive months"
- "Referred [N] active community members"
- "Participated in [N] governance votes"

### Formats

- **Web page:** `/play/[username]/resume` (public URL, shareable)
- **PDF export:** downloadable from the profile page
- **OG card:** the /api/og endpoint generates a preview card for the resume URL

### Verification

Each resume has a unique verification URL: `regencivics.earth/verify/[hash]`. Anyone with the URL can verify the player's contributions are real. The verification page shows a read-only view of the resume data pulled live from the database.

---

## 13. Quiet Recognitions (admin-triggered)

A system in admin for sending personal, 1:1 recognitions to players based on their activity.

### Admin interface

New section in admin: "Player Recognition"

**Candidate list:** Auto-generated list of players who had notable activity in the last 7/30 days. Sorted by: contribution score gain this period, sharing activity, quest completions, endorsements received.

Each candidate row shows:
- Name, avatar, tier
- What they did recently (2-3 bullet points auto-generated from their activity)
- "Recognize" button

**Compose window:**
- Pre-filled with the player's recent activity as context
- Text field for your personal message
- Optional: attach a token grant (amount + reason)
- Optional: attach a badge
- Send as: in-app notification, email, or both

### What the player sees

A special notification (distinct from regular notifications, with a different visual style):
"A message from Rye at ReGen Civics"
[Your personal message]
[If token grant: "You've been awarded X $ReGen for [reason]"]

This is not automated. You write each one. The system just surfaces the candidates and makes it fast to compose. One minute per recognition, maybe 5-10 per week.

---

## 14. Seasonal Councils

At the end of each season, the top contributors are invited to a governance council with specific, bounded powers.

### Structure

- Council size: configurable in admin (default: 7 seats)
- Qualification: top N contributors by score who also completed all Rites of Passage
- Term: one season (rotates every season, no permanent seats)
- A player who was on the council last season must re-qualify by score

### Powers (configurable per season in admin)

Each power can be set to: OFF, ADVISORY, or BINDING.

| Power | Default | Description |
|-------|---------|-------------|
| Quest curation | ADVISORY | Vote on which new quests get added next season from a pool you pre-approve |
| Community fund allocation | ADVISORY | Direct a percentage of community treasury (you set the % in admin) to specific projects |
| Featured content | ADVISORY | Choose which forum posts, completions, or projects get featured on home page |
| Governance proposals | ADVISORY | Submit proposals to the broader community for vote |
| Co-creator nominations | ADVISORY | Nominate players for co-creator invitations |

### What councils CANNOT do

- Override your decisions (you have final say, always)
- Make fund investment decisions (that's the Fund's governance, separate structure)
- Change the rules of the game
- Remove or ban players
- Set their own compensation

### How decisions work

1. You create a "Council Decision" in admin with a question, options, and power level
2. Council members vote during a voting window (you set the duration)
3. If ADVISORY: you see the results and decide what to do
4. If BINDING: the majority result is automatically applied (you can still override with explanation)
5. All decisions and their outcomes are published to the community (transparency)

### Enforcement

Start everything as ADVISORY. You see the council's recommendations and act on them at your discretion. Over time, as trust builds, you can flip individual powers to BINDING. The admin interface makes this a toggle per-power, per-season.

### Admin interface

- "Seasonal Councils" section in admin
- View current council members and their scores
- Create/edit council decisions
- View voting results
- Toggle power levels (OFF/ADVISORY/BINDING)
- Archive past councils and their decisions

### Database

```
seasonal_councils:
  id, seasonId, name, seatCount, minimumScore,
  requiresRitesComplete (boolean), status (forming/active/archived),
  createdAt

council_seats:
  id, councilId, userId, invitedAt, acceptedAt, declinedAt

council_decisions:
  id, councilId, question, options (JSON), powerLevel (advisory/binding),
  votingOpensAt, votingClosesAt, outcome, adminOverride, adminNotes,
  publishedAt, createdAt

council_votes:
  id, decisionId, userId, selectedOption, votedAt
```

---

## 15. Living Ledger (admin-only feed for now)

A real-time feed of all community activity. Lives in admin only. You'll bring it to the community page once the game is active and the feed looks good.

### What it shows

Every significant action, in real time:
- "[Player] completed [Quest]"
- "[Player] logged a [capital type] contribution to [Project]"
- "[Player] endorsed [Player/Project]"
- "[N] new players joined through referral links"
- "[Player] earned the [Badge] badge"
- "[Player] contributed to [Campaign] crowd-pool"
- "[Player] attended [Event]"
- "New flag submitted on [Entity] (reason: [reason])"

### Admin interface

In admin, new tab: "Live Feed"
- Scrolling real-time feed (WebSocket or polling)
- Filterable by: action type, player, project, date range
- Each entry is clickable (links to the relevant profile, post, or admin view)
- Counts at the top: "X actions today, Y this week, Z this month"
- A "Pause" button to freeze the feed for reading

### Future: community-facing version

When you're ready to make this public, it becomes a component on the community page. The public version:
- Excludes flags and admin-only actions
- Respects player privacy settings (private contributions don't appear)
- Shows only the last 50 entries (paginated)
- Grouped by time: "Today", "This week", "Earlier"

For now, build the admin version only. The data model and event capture should support both versions from the start.

### Database

```
activity_feed_events:
  id, eventType (enum matching all action types above),
  actorType (player/project/system), actorId,
  targetType (quest/post/project/player/campaign/event), targetId,
  metadata (JSON, for display text generation),
  visibility (public/admin_only), createdAt
```

Write to this table from every relevant mutation (quest completion, contribution creation, endorsement, flag, badge award, referral signup, event attendance). Use a shared `logActivityEvent()` helper function so nothing gets missed.

---

## Implementation Priority

### Phase 1: Foundation (build now)
1. **#1 Contribution Score** (backbone, everything else depends on it)
2. **#15 Living Ledger** (admin feed, captures all activity from day one)
3. **#7 Quest Unlock Tiers** (admin UI for tiers + gating logic, empty to start)

### Phase 2: Profile experience
4. **#6 Contribution Compass** (9-axis radar chart)
5. **#11 Contribution Proof Timeline** (artifact support for all contribution types)
6. **#3 Living Growth Visualization** (after Rye picks direction)

### Phase 3: Community features
7. **#10 Mutual Endorsements and Flags** (both directions + admin moderation)
8. **#2 Silent Sharing Score** (admin-only view of sharing activity)
9. **#13 Quiet Recognitions** (admin tool for personal messages)

### Phase 4: Seasonal systems
10. **#4 Seasonal Harvest** (end-of-season review experience)
11. **#5 Your Mycelium Network** (referral network visualization)
12. **#8 Co-Creator Invitations** (score-gated invitations)

### Phase 5: Governance
13. **#14 Seasonal Councils** (council formation, voting, decision tracking)
14. **#12 Regenerative Resume** (exportable profile)

---

## Connection to Other Specs

- **SOCIAL_SHARING_SPEC.md:** The referral tracking (ref/src/ctx params), share_events table, and referrals table feed directly into the Silent Sharing Score (#2) and the Mycelium Network (#5). The SharePrompt component triggers share events that feed the contribution score.
- **QUEST_PROGRESSION_SPEC.md:** Quest unlock tiers (#7) build on top of the existing quest locking chain. The Rites of Passage completion is a prerequisite for the tier system.
- **FIXES_TO_MAKE_2026-03-29.md Fix 15:** Feature suggestions page can feed into the Seasonal Council (#14) as a source of proposals.
- **Existing regenTokenLedger:** All token grants from recognitions (#13), referral rewards, and admin grants flow through the existing ledger. No new token system needed.
- **Existing playerContributions + ContributionCalculator:** The Contribution Compass (#6) and Proof Timeline (#11) build directly on the existing 8 Forms of Capital framework, extended to 9 with Health.

# Sprint 6: Governance Quest Chain, Seasonal Rhythm, and Polish

**Date:** 2026-04-10
**Depends on:** Sprint 1-5 complete, `REGEN_GOV_UNIFIED_ARCHITECTURE.md`
**Goal:** The game layer that makes governance participation a joyful progression. The seasonal rhythm that ties everything to the land. The "governable dashboard" concept. And the final polish pass that makes every screen feel finished. This sprint turns the tool into something people want to come back to.

---

## CRITICAL CONTEXT: Read These Files First

1. Previous sprint files (`REGEN_GOV_SPRINT_1.md` through `REGEN_GOV_SPRINT_5.md`)
2. `REGEN_GAMES_SPEC_V1.md` -- quest system, contribution scoring, seasonal structure, 24 features across 5 phases
3. `COMMUNITY_AGREEMENTS_PLAN.md` -- community agreements feature (may overlap with handbook from Sprint 5)
4. `client/src/pages/Governance.tsx` -- existing governance education page
5. `CONTEXT_THE_TWO_GAMES.md` -- Fund vs Game distinction (quests are part of The Game)
6. `SEEDS_VISION_IMPLEMENTATION_SPEC.md` -- harvest cycles and seasonal governance patterns

---

## What to Build in This Sprint

### 1. Governance Quest Chain

Six quests that guide a new player from zero governance experience to confident participation. Completing the chain is one of the paths to reaching Co-Creator tier.

**Quests:**

**Quest 1: Read the Handbook**
- Action: Visit the `/handbook` page and scroll to the bottom (or spend at least 60 seconds on the page)
- Reward: 10 contribution points + 5 $ReGen
- Completion: tracked via `govQuestProgress` table, triggered by a client event
- Message on completion: "You've read the agreements that hold this community together."

**Quest 2: Observe a Vote**
- Action: Visit any proposal detail page that is in the polling phase
- Reward: 10 contribution points + 5 $ReGen
- Completion: tracked when the player views a polling proposal
- Message: "You've seen governance in action."

**Quest 3: Cast Your First Vote**
- Action: Vote on any proposal (agree, disagree, abstain, or block)
- Reward: 25 contribution points + 15 $ReGen
- Completion: tracked when `castGovVote` succeeds for the first time
- Message: "Your voice matters. Every vote shapes the direction of this movement."

**Quest 4: Delegate Your Votes**
- Action: Create at least one delegation on the `/passport/delegation` page
- Reward: 15 contribution points + 10 $ReGen
- Completion: tracked when `createDelegation` succeeds
- Message: "You've entrusted your governance power to someone you trust. You can always take it back."

**Quest 5: Join the Discussion**
- Action: Comment on any active proposal in the discussion or polling phase
- Reward: 20 contribution points + 10 $ReGen
- Completion: tracked when `addGovComment` succeeds for the first time
- Message: "Your thoughts are part of the conversation now."

**Quest 6: Submit Your First Proposal**
- Action: Create and publish a proposal (move from draft to discussion)
- Reward: 50 contribution points + 30 $ReGen
- Completion: tracked when `publishGovProposal` succeeds for the first time
- Message: "You've shaped the future of this community. That takes courage."

**Quest chain unlocks:**
- Quests 1-3 are available immediately to Explorers
- Quest 4 requires completing Quest 3
- Quest 5 requires completing Quest 2
- Quest 6 requires completing Quest 5
- Completing all 6 quests grants 50 bonus contribution points and a "Governance Graduate" credential on the passport

### 2. Database Migration

Create `drizzle/0116_gov_quests.sql`:

```sql
CREATE TABLE IF NOT EXISTS govQuestProgress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  questId VARCHAR(50) NOT NULL, -- 'handbook', 'observe', 'first_vote', 'delegate', 'discuss', 'first_proposal'
  completedAt TIMESTAMP NULL,
  rewardClaimed TINYINT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_quest (userId, questId),
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_user (userId)
);

-- Season tracking (if not already existing)
CREATE TABLE IF NOT EXISTS seasons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  currentBeat ENUM('connect','plan','work','reflect') DEFAULT 'connect',
  beatTransitionDates JSON, -- {"connect": "2026-04-01", "plan": "2026-05-01", "work": "2026-06-01", "reflect": "2026-07-15"}
  festivalDate DATE,
  isActive TINYINT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_name (name)
);

-- Seed current season
INSERT INTO seasons (name, startDate, endDate, currentBeat, beatTransitionDates, festivalDate, isActive)
VALUES (
  'Spring 2026',
  '2026-04-01',
  '2026-07-31',
  'connect',
  '{"connect": "2026-04-01", "plan": "2026-05-01", "work": "2026-06-01", "reflect": "2026-07-15"}',
  '2026-07-31',
  1
);
```

### 3. Server-Side tRPC Procedures

```typescript
// quests.getMyProgress
// Input: {}
// Returns: array of { questId, title, description, status: 'locked'|'available'|'completed', reward, completedAt }
// Checks govQuestProgress table + unlock dependencies

// quests.completeQuest
// Input: { questId }
// Auth: protectedProcedure
// Validates the quest is completable (prerequisites met, action actually taken)
// For most quests, completion is triggered by the relevant action mutation
//   (e.g., castGovVote also calls quests.completeQuest('first_vote') internally)
// Awards contribution points and $ReGen to the player's internal ledger
// Returns: { success, reward, nextUnlockedQuest? }

// quests.claimReward
// Input: { questId }
// Auth: protectedProcedure
// Marks the reward as claimed and credits the player
// (Some implementations combine completion and reward into one step)

// seasons.getCurrent
// Input: {}
// Returns: { id, name, startDate, endDate, currentBeat, daysUntilNextBeat, daysUntilFestival, festivalDate }
// Computed: which beat we're in based on current date vs beatTransitionDates

// seasons.getStagedProposals
// Input: {}
// Returns: proposals with status 'staged' for the current season
// Used for the seasonal festival staging view
// Same as governance.stagedProposals from Sprint 2 but enriched with season context
```

**Quest completion hooks in existing mutations:**

When the following mutations succeed, also check and complete the corresponding quest:

- `governance.castGovVote` -> complete 'first_vote' quest (if first time)
- `governance.addGovComment` -> complete 'discuss' quest (if first time)
- `governance.publishGovProposal` -> complete 'first_proposal' quest (if first time)
- `delegation.createDelegation` -> complete 'delegate' quest (if first time)
- Page view tracking for 'handbook' and 'observe' quests needs a client-side trigger that calls a lightweight endpoint

### 4. Frontend: Quest Chain Display

**Location:** Appears on the Passport page (Sprint 5) as a new section, between Identity Card and Governance Activity.

```
[Governance Quests - GlassCard]
  "Your Governance Journey"
  Progress: 3 of 6 complete [========------] 50%

  [Quest cards - vertical stack]
    Each quest card:
      [Checkmark circle: green filled if complete, green outline if available, gray if locked]
      Quest title (bold if available, green if complete, gray if locked)
      One-line description
      Reward: "15 contribution points + 10 $ReGen"
      [If locked:] Lock icon + "Complete [prerequisite quest] first"
      [If complete:] Green checkmark + completion date
      [If available and action needed:] [Go] PillButton linking to relevant page

  [If all 6 complete:]
    Gold banner: "Governance Graduate"
    "You've completed the governance quest chain. +50 bonus contribution points."
    [Credential added to your passport]
```

### 5. Frontend: Seasonal Rhythm Integration

**Season Indicator component** (visible on home screen and throughout the app):

**File:** `apps/gov/src/components/SeasonIndicator.tsx`

```
[Current season name: "Spring 2026"]
[Current beat: "Connect" with a colored dot]
  Connect = green dot
  Plan = blue dot
  Work = amber dot
  Reflect = purple dot
[Countdown: "Festival in 47 days"]
```

Placement:
- Home screen: below the MovementPulse section
- Desktop sidebar: at the bottom of the sidebar
- Proposals page: subtle indicator in the header showing which beat we're in

**Beat-appropriate UI touches:**
- Connect beat: warm green tones, emphasis on people and relationships
- Plan beat: cooler blue-green tones, emphasis on proposals and decisions
- Work beat: warm amber accents, emphasis on activity and progress
- Reflect beat: deep purple accents, emphasis on outcomes and gratitude

Implementation: CSS custom properties that change based on the current beat. The base dark forest theme stays constant; only accent colors shift subtly.

```css
:root[data-beat="connect"] { --beat-accent: #7dd87d; }
:root[data-beat="plan"] { --beat-accent: #60a5fa; }
:root[data-beat="work"] { --beat-accent: #f59e0b; }
:root[data-beat="reflect"] { --beat-accent: #a78bfa; }
```

### 6. Frontend: "Propose a Dashboard Upgrade"

**Permanent feature on the Economy page and in the desktop sidebar.**

```
[Gold sparkle icon] "Propose a Dashboard Upgrade"
```

Tapping this navigates to the create proposal page with:
- Template: "Dashboard Upgrade"
- Track: pre-set to "operational"
- Body pre-filled with:
  ```
  What would you change about the governance dashboard?

  Current experience:
  [describe what you see now]

  Proposed change:
  [describe what you'd like to see]

  Why this matters:
  [explain how this improves governance for the community]
  ```

Completed dashboard upgrade proposals that get ratified earn the proposer a gold "Dashboard Architect" credential on their passport.

### 7. Frontend: Power Mapping (Steward-Only View)

**Route:** `apps/gov/src/app/power-map/page.tsx`

Only accessible to Stewards and Sages. Shows transparent governance metrics.

```
[Top bar + "Power Map" header]
[Note: "All governance power is transparent and visible to Stewards."]

[Delegation Weight Rankings - GlassCard]
  Ranked list of players by total governance weight (own + delegated)
  Each row: rank, avatar, name, handle, base weight, delegated weight, total weight
  Top 3 have gold/silver/bronze indicators
  Expandable: who delegates to each person

[Contribution Score Rankings - GlassCard]
  Ranked list by contribution score
  Each row: rank, avatar, name, handle, score, tier badge
  Score breakdown on expand: quests, forum, gratitude, governance, events

[Proposal Shepherds - GlassCard]
  Ranked by proposals authored that were ratified
  Each row: avatar, name, proposals authored, proposals ratified, ratification rate

[Participation by Bioregion - GlassCard]
  Bar chart: each bioregion's governance participation rate
  Green bars for healthy (>50%), yellow for moderate, red for low (<20%)
  Tap a bar to see the bioregion's active members who haven't voted recently

[Concentration Alert - GlassCard, only shown if triggered]
  If any single player holds >20% of total delegation weight:
    "Governance concentration alert: @cedar holds 24% of total governance weight.
    This is visible for transparency. Consider encouraging others to participate."
  If top 3 players hold >50% of total:
    Similar alert about distributed governance
```

### 8. Polish Pass

Everything below is about making the app feel finished, alive, and delightful.

**Page transition animations:**
- Pages fade in with a 150ms ease-out opacity transition
- On mobile: pages slide in from the right (150ms) when navigating deeper, slide from the left when going back
- Use Next.js `<AnimatePresence>` from framer-motion or CSS transitions on route change

**Skeleton loading states:**
- Every data-dependent section has a shimmer skeleton that matches the exact layout of the loaded content
- Skeleton cards: glass-panel background with animated gradient shimmer (left to right, 1.5s loop)
- Skeleton text: rounded rectangles at 60% opacity, matching expected line widths

**Empty state illustrations:**
- Hand-drawn style, forest theme, consistent across the app
- Use simple SVG illustrations (can be generated or placeholder):
  - Proposals empty: a seed in soil, "No proposals yet. Plant the first one."
  - Bioregion empty: rolling hills, "This bioregion is waiting for its first members."
  - Economy no data: a compass, "Economic data is being gathered."
  - Passport new: a blank journal, "Your governance story starts here."
  - Quest chain complete: a full-grown tree, "You've graduated."

**Error states:**
- Network error: "Couldn't load this data. Check your connection and try again." with [Retry] button
- 404: "This page doesn't exist in the forest. Head home?" with [Go Home] button
- Permission denied: "You'll unlock this at [required tier]. Keep participating." (friendly, not blocking)

**Performance optimization:**
- All pages use React Server Components where possible
- Client components only for interactive elements (vote buttons, forms, modals)
- Images: use Next.js `<Image>` with lazy loading and blur placeholder
- Fonts: preload Inter, use system font stack as fallback
- CSS: Tailwind purge ensures minimal CSS bundle
- API calls: batch where possible, cache with React Query / SWR

**Lighthouse audit targets:**
- Performance: 95+
- Accessibility: 95+ (ARIA labels on all interactive elements, keyboard nav, focus rings, color contrast AA)
- Best Practices: 95+
- SEO: 90+ (meta tags, og tags for sharing)

**Accessibility specifics:**
- All icons have `aria-label`
- Vote buttons have clear focus states (green outline, 2px)
- Keyboard navigation: Tab through all interactive elements, Enter/Space to activate
- Screen reader: all status badges, vote tallies, and gauges have text alternatives
- Color contrast: all text meets AA standards against the dark forest background
- Reduced motion: respect `prefers-reduced-motion` by disabling animations

### 9. OG Meta Tags for Sharing

When a player shares a proposal or their passport link on social media:

**Proposal share:** `gov.regencivics.earth/proposals/42`
```html
<meta property="og:title" content="Proposal: Seed Sharing Guidelines for Salish Sea" />
<meta property="og:description" content="A consent decision open for voting. 18 agree, 3 disagree. 2 days remaining." />
<meta property="og:image" content="/api/og/proposal/42" />
```

**Passport share:** `gov.regencivics.earth/passport`
```html
<meta property="og:title" content="@cedar's ReGen Gov Passport" />
<meta property="og:description" content="Co-Creator tier. 847 contribution points. 12 votes cast this season." />
<meta property="og:image" content="/api/og/passport/cedar" />
```

OG images: generate with `@vercel/og` or a simple server-rendered SVG. Dark forest background with the relevant stats. Keep it clean and readable at social media thumbnail size.

---

## Dependency Audit and Potential Bugs

### Things that could break:

1. **Quest completion detection.** The 'handbook' and 'observe' quests require tracking page views. Use a lightweight client-side call: when the player visits the handbook page, fire a `quests.markViewed('handbook')` call after 60 seconds. For 'observe', fire when a polling proposal detail page is visited. Be careful not to fire on every page view (check if already completed first).

2. **Season data.** If no season row exists in the database, the SeasonIndicator component needs a fallback. Default to "Season data coming soon." The seed INSERT in the migration handles the initial case, but make sure the data is current.

3. **Beat transition dates.** The currentBeat field is static in the database. Either update it manually at each transition, or compute it dynamically from `beatTransitionDates` JSON and the current date. Dynamic computation is better. The `seasons.getCurrent` tRPC procedure should compute the beat rather than reading it from the database.

4. **framer-motion bundle size.** If using framer-motion for page transitions, it adds ~30KB to the client bundle. Consider using CSS animations instead for the basic transitions. Only add framer-motion if the animation requires JavaScript-driven state (e.g., AnimatePresence for exit animations).

5. **Power map performance.** Calculating delegation rankings across all players could be slow with 100+ players. Use a database query with JOINs and GROUP BY rather than loading all data into memory. Paginate or limit to top 20.

6. **Quest reward double-claiming.** The `rewardClaimed` flag prevents double claims, but concurrent requests could cause a race condition. Use a transaction: SELECT FOR UPDATE the quest row, check rewardClaimed, update, credit tokens.

7. **OG image generation.** `@vercel/og` works on Vercel but may need a different approach on Railway. If on Railway, generate static OG images via a pre-render step, or use a simple HTML-to-PNG service. For Sprint 6, use a pre-rendered template with dynamic text.

### Things to verify before deploying:

- [ ] All 6 quests can be completed in order
- [ ] Quest prerequisites enforce correctly (locked quests can't be completed)
- [ ] Quest rewards credit to the player's internal ledger
- [ ] Completing all 6 quests awards the bonus + "Governance Graduate" credential
- [ ] Season indicator shows the correct season and beat
- [ ] Beat accent colors shift subtly across the app
- [ ] "Propose a Dashboard Upgrade" pre-fills the template correctly
- [ ] Power map is only visible to Stewards+
- [ ] Skeleton loading states match the final rendered layout
- [ ] All pages pass Lighthouse 95+ on Performance and Accessibility
- [ ] Keyboard navigation works through all interactive elements
- [ ] OG meta tags render correctly when sharing proposal/passport links
- [ ] All empty states show the correct illustration and message
- [ ] No em-dashes anywhere in user-facing text

---

## Done Criteria

Sprint 6 is done when:

1. The governance quest chain (6 quests) is visible on the passport page
2. Quests unlock in the correct order based on prerequisites
3. Completing a quest awards contribution points and $ReGen
4. The "Governance Graduate" credential appears after completing all 6
5. The season indicator shows the current season, beat, and festival countdown
6. Beat accent colors shift subtly across the app
7. "Propose a Dashboard Upgrade" works with the pre-filled template
8. Power map (Steward-only) shows delegation rankings, contribution rankings, and participation by bioregion
9. Every page has a skeleton loading state and an empty state illustration
10. Error states are friendly and include recovery actions
11. Lighthouse scores: Performance 95+, Accessibility 95+
12. OG meta tags work for proposal and passport sharing
13. All user-facing text follows the writing rules (no em-dashes, no AI patterns)
14. The app feels complete, cohesive, and delightful to use

---

## Writing Rules Reminder

All user-facing text must follow the project writing rules:
- No em-dashes (zero, not "use sparingly")
- No contrast-framing ("This is not X, this is Y")
- No AI word patterns (delve, tapestry, foster, leverage, etc.)
- No rhetorical question openers
- No passive inspiration ("Join us on this journey")
- Voice: direct, grounded, specific. First person fine. Contractions fine.

---

## What Comes After Sprint 6

The 6 sprints deliver the core ReGen Gov app. After Sprint 6, the next priorities (from the Ideas Garden) are:

1. **Local Scale integration** -- bioregional currencies, oSwaps, shared profile layer
2. **Cobudgeting** -- participatory fund allocation, Greaterthan-inspired
3. **Soul-bound tokens** -- non-transferable governance credentials on Base
4. **Hypercerts** -- on-chain impact certificates for land projects
5. **Cross-network credentials** -- W3C Verifiable Credentials for portable governance identity

These are Season 2+ features. The community will propose and prioritize them through the very governance system being built in these 6 sprints.

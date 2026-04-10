# ReGen Gov: Unified Architecture and Sprint Plan

**Date:** 2026-04-10 (updated from 2026-04-09 with Rye's feedback)
**Status:** Final architecture document. Sprint prompts live in separate files.
**Replaces:** GOVERNANCE_DASHBOARD_VISION_100_IDEAS.md and PART2 as ideation sources. This document is the decision layer.
**Sprint prompts:** `REGEN_GOV_SPRINT_1.md` through `REGEN_GOV_SPRINT_6.md`

### KEY UPDATES (2026-04-10)
1. **Loomio is gone.** We build our own deliberation layer. No Loomio API, no Loomio instance.
2. **Auth is Privy.** Not custom JWT. Privy App ID: `cmnt8kp5i01bm0cjixnxsrlpw`. See `PRIVY_AUTH_MIGRATION_SPEC.md`.
3. **$ReGen has no USD price.** Dashboard tracks supply, velocity, distribution rate, not USD value.
4. **Staged seasonal governance.** Proposals mature on Gov, then stage for next season's Hypha vote.
5. **Cut ideas move to Ideas Garden** (see bottom of this doc), not deleted.

---

## The One-Sentence Version

ReGen Gov is a mobile-first passport and command center for coordinating the regenerative civilization, built as a new Next.js app at gov.regencivics.earth that shares auth, database, and player identity with the main site, renders governance natively (no more sending people to raw Loomio), and gives every player a beautiful 90-second daily loop: open passport, see what needs your attention, act, get back to real life.

---

## Part 1: What We're Actually Building

### The Problem

Right now gov.regencivics.earth is a stock Loomio instance. It's ugly, disconnected from the main site, requires separate login, and shows none of the economic, ecological, or game data that makes ReGen Civics alive. Players who navigate there feel like they left the movement and landed in a generic SaaS tool.

Meanwhile, the main site at regencivics.earth has an incredible governance pipeline already built (151 tRPC procedures, Loomio webhook integration, Hypha bridge, multi-tenant governance spaces, straw polls, storyteller narratives, internal token ledger). But all of that power is scattered across pages like `/governance`, `/community/decisions`, `/gov/:slug`, and `/bridge/hypha/:key`. There's no single place where a player can see the full picture of their governance life.

### The Solution

Build a new Next.js app at gov.regencivics.earth that:

1. **Shares everything with the main site.** Same JWT cookie (domain: `.regencivics.earth`), same MySQL database, same tRPC procedures (imported as a package or running on the same server behind a reverse proxy). A player logged into regencivics.earth is automatically logged into gov.regencivics.earth.

2. **Renders governance natively.** Proposals, discussions, votes, and outcomes are pulled from Loomio via its REST API (`/api/b1/`) and rendered in our own dark forest UI. Players never see raw Loomio. Loomio becomes the deliberation engine under the hood, the way a database is under the hood. Invisible to the player.

3. **Adds the passport/dashboard layer on top.** Economic metrics (live $ReGen and $RCivics prices from Base via viem), bioregion health, gratitude flows, contribution scores, governance participation. Everything from the SEEDS Passport vision, executed at a higher standard.

4. **Is designed for 90-second sessions.** Mobile-first. The home screen answers three questions instantly: What needs my attention? How is my bioregion doing? How is the movement doing? A player at a land project checks their phone, votes on a proposal, sends gratitude, and puts their phone away. The tool serves the life, not the other way around.

### What We're NOT Building

- A Loomio replacement that mimics Loomio. We're building our own deliberation layer, purpose-built for our governance model. No Loomio dependency at all.
- A separate user system. Same users, same sessions, same database. Auth is Privy (shared App ID across both apps).
- A blockchain wallet app. Privy provides embedded Base wallets automatically on signup. On-chain actions go through the Hypha Bridge.
- A social network. The forum stays on regencivics.earth for light ideation. Gov is for structured deliberation and staged seasonal decisions.

---

## Part 2: Technical Architecture

### Deployment Model

```
regencivics.earth          -> Railway: existing Next.js app (main site)
gov.regencivics.earth      -> Railway: NEW Next.js app (this project)
                              Same DATABASE_URL, same Redis, shared JWT cookie
```

Both apps connect to the same MySQL database on Railway. The gov app imports or duplicates the tRPC router definitions it needs (governance, forum read-only, players read-only, bioregions). In practice, the cleanest approach: extract the shared tRPC procedures into a `packages/api` workspace package that both apps import.

Alternative (simpler, good enough for Sprint 1): the gov app makes HTTP calls to the main site's tRPC endpoints using the player's JWT cookie for auth. This avoids monorepo refactoring and works immediately.

### Auth Flow

Auth is Privy. Both apps (main site and gov app) share the same Privy App ID (`cmnt8kp5i01bm0cjixnxsrlpw`). A player authenticated on either app is authenticated on both. Privy handles email, Google, Apple, and wallet login. Embedded Base wallets are created automatically for new users.

**For gov.regencivics.earth:** Use Privy's React SDK (`@privy-io/react-auth`) on the client. On the server, verify Privy access tokens via `@privy-io/server-auth`. Look up the user in the shared database by `privyDid`. Fallback: also read the legacy `rc_session` JWT cookie for users who haven't migrated to Privy yet (dual-auth pattern from `PRIVY_AUTH_MIGRATION_SPEC.md`).

### Native Deliberation Model

We build our own deliberation system. No Loomio.

```
Player creates a proposal on gov.regencivics.earth
  -> Our tRPC procedure creates a govProposal record in MySQL
  -> Proposal enters Draft status
  -> Author publishes -> status moves to Discussion
  -> After discussion period, author opens voting -> status moves to Polling
  -> When polling closes, outcome is recorded
  -> If passed: proposal is Staged for Next Season
  -> At season boundary: staged proposals are sent to Hypha for official on-chain ratification
  -> Only "urgent"-tagged proposals can go to Hypha mid-season
```

**Lifecycle stages:** Draft -> Discussion -> Polling -> Staged for Season -> Sent to Hypha -> Ratified / Declined

**Decision methods supported:** Consent (default), Advice, Consensus, Mandate (steward-only for operational decisions).

**Data model:** Everything lives in MySQL. `govProposals`, `govComments`, `govVotes`, `govOutcomes` tables. No external sync. No cache layer. Our database is the single source of truth.

### On-Chain Data (Live Token Prices)

The existing codebase uses viem to query Base. Extend this:

```typescript
// New: read ERC-20 balances for display
const regenBalance = await publicClient.readContract({
  address: REGEN_TOKEN_ADDRESS,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [playerWalletAddress],
});

// New: read total supply for dashboard display
const totalSupply = await publicClient.readContract({
  address: REGEN_TOKEN_ADDRESS,
  abi: erc20Abi,
  functionName: "totalSupply",
});
// Note: no USD price for $ReGen. Track supply, velocity, distribution rate instead.
```

Token balances sync to `playerProfiles.rgenBalance` and `rvoiceBalance` via a periodic job (every 15 minutes). The dashboard reads cached values from MySQL, not live from the chain.

### Database: What's New

The existing schema covers governance beautifully (151 procedures worth). New tables needed:

```sql
-- Dashboard preferences per player
CREATE TABLE govDashboardPrefs (
  userId INT PRIMARY KEY,
  primaryBioregionId INT,
  dashboardLayout ENUM('compact', 'full') DEFAULT 'compact',
  notificationPrefs JSON, -- which alerts they want
  hasSeenWelcome TINYINT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

-- Native proposals (replaces Loomio)
CREATE TABLE govProposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId INT NOT NULL, -- links to governanceTenants (bioregion scope)
  authorId INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('draft','discussion','polling','staged','sent_to_hypha','ratified','declined','withdrawn') DEFAULT 'draft',
  decisionMethod ENUM('consent','advice','consensus','mandate') DEFAULT 'consent',
  track ENUM('fund','game','operational') DEFAULT 'game',
  urgentTag TINYINT DEFAULT 0, -- if 1, can go to Hypha mid-season
  seasonId INT, -- which season this is staged for
  discussionOpensAt TIMESTAMP NULL,
  pollingOpensAt TIMESTAMP NULL,
  pollingClosesAt TIMESTAMP NULL,
  outcomeText TEXT,
  hyphaProposalId VARCHAR(255), -- if sent to Hypha
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

CREATE TABLE govComments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  authorId INT NOT NULL,
  parentId INT, -- for threading
  body TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE govVotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  voterId INT NOT NULL,
  position ENUM('agree','disagree','abstain','block') NOT NULL,
  reason TEXT,
  delegatedFrom INT, -- if voting on behalf of another via delegation
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY (proposalId, voterId)
);

-- Economic snapshots for dashboard charts
CREATE TABLE economicSnapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  snapshotDate DATE NOT NULL,
  regenTotalSupply BIGINT,
  regenVelocity DECIMAL(10,4), -- transactions per token per period
  regenDistributionRate DECIMAL(10,4), -- tokens distributed this period
  regenHolderCount INT,
  rcivicsTotalSupply BIGINT,
  rcivicsHolderCount INT,
  fundAum DECIMAL(15,2),
  totalGratitudeSeason INT,
  totalGovernanceTokensSeason INT,
  activePlayers INT,
  activeProposals INT,
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY (snapshotDate)
);

-- Bioregion health metrics (doughnut economics data)
CREATE TABLE bioregionHealthMetrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bioregionId INT NOT NULL,
  seasonId INT,
  -- Social foundation
  foodSecurityScore TINYINT, -- 0-100
  educationScore TINYINT,
  healthScore TINYINT,
  housingScore TINYINT,
  communityScore TINYINT,
  -- Ecological ceiling
  soilHealthScore TINYINT,
  waterQualityScore TINYINT,
  biodiversityScore TINYINT,
  carbonScore TINYINT,
  landUseScore TINYINT,
  -- Meta
  reportedBy INT, -- userId
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY (bioregionId, seasonId)
);
```

---

## Part 3: The Player Journey

### First Visit: The Welcome

A new player (or existing player visiting gov.regencivics.earth for the first time) sees:

**Mobile:** Full-screen card, dark forest gradient background, ReGen Gov logo at top.

> **Welcome to your Passport**
>
> This is your command center for coordinating the Regenerative Renaissance.
>
> Built on wisdom from movements that came before us: the SEEDS Passport's economic vision, The Hum's collaboration rhythms, Greaterthan's cobudgeting practices, Enspiral, and regenerative organizing communities worldwide. Interoperable with Hypha for on-chain governance on Base, and with Local Scale for bioregional food-backed economic systems.
>
> $ReGen is a global currency for the regenerative civilization. Bioregions can create their own local currencies that interoperate across the network.
>
> This dashboard is governed by you. Propose what we track. Vote on how it evolves.
>
> **[Open My Passport]**

One tap. They're in. The `hasSeenWelcome` flag flips. They never see this again.

### The Daily Loop (90 seconds)

The home screen is designed for speed. Three sections, vertically stacked on mobile:

**Section 1: "Your Attention" (the inbox)**
A short list of items that need action. Max 5 items shown, expandable. Each item has a one-tap action.

- "Vote on: Should we fund the Salish Sea food forest?" [Vote Yes/No/Abstain]
- "Co-sign: Maria's proposal on seed sharing guidelines" [Co-sign / Decline]
- "New gratitude from @cedar: 'Your soil workshop changed my approach'" [Send thanks]
- "Your bioregion posted: Community work day Saturday" [RSVP]

When the list is empty: "You're caught up. Go plant something." (with a small leaf icon)

**Section 2: "Your Bioregion" (the local pulse)**
If the player has joined a bioregion: a compact card showing:
- Bioregion name + member count
- Mini health gauge (single composite score, tap to expand to full doughnut)
- Active proposals in this bioregion (count)
- Local currency balance (when Local Scale is integrated, Phase 2)
- Next local event

If the player hasn't joined: "Join a Bioregion" with a mini-map showing available options.

**Section 3: "The Movement" (the global pulse)**
Compact economic dashboard:
- $ReGen total supply + distribution rate sparkline
- Total players (with tier breakdown on tap)
- Governance participation rate this season
- Ecological impact headline number ("247 acres under regenerative stewardship")

That's it. Three sections. Glanceable. Actionable. Beautiful.

### Going Deeper

From the home screen, the bottom nav (mobile) or sidebar (desktop) offers:

**Proposals** - Full list of active, closing soon, and recently decided proposals. Filterable by bioregion, track (fund/game), status, and decision method. Each proposal card shows the thread context, current tally, time remaining, and inline vote buttons. Tapping a proposal opens the full deliberation view (discussion thread + vote + outcome). Proposals flow through the staged seasonal governance pipeline: Discussion -> Polling -> Staged for Next Season -> Sent to Hypha.

**Bioregion** - Full bioregion dashboard. The doughnut economics visualization (ecological ceiling + social foundation). Land projects in this bioregion with their status. Inter-bioregional trade flows (when Local Scale integrates). Member directory. Bioregion governance space (proposals that are scoped to this bioregion only).

**Economy** - The full economic dashboard. $ReGen supply, velocity, and distribution rate with charts. $RCivics supply and holder metrics. Fund AUM and deployment history. Gratitude flows (this season vs last season). Governance token distribution. Harvest cycle status. Readiness gauges. "Planted vs sold" ratio. Everything from the SEEDS dashboard screenshots, rebuilt beautifully.

**Passport** - The player's identity page. Citizenship tier with visual badge. Contribution score with breakdown. Governance participation history. Credentials earned (quests completed, gatherings attended, governance actions taken). Delegation settings. Notification preferences. This is the "passport" that travels with you.

### Desktop Experience

On desktop (>1024px), the layout shifts to a three-column dashboard:

- **Left (280px):** Player card (avatar, tier, scores, balances) + bioregion card (compact). Persistent, doesn't scroll.
- **Center (flex):** "Your Attention" inbox at top, then the proposal stream (active proposals with inline voting, filterable). This is the main working area.
- **Right (320px):** Economic dashboard (token prices, fund health, census, ecological impact, readiness gauges). Persistent, scrollable independently.

The desktop view is the "command center" feel. But the mobile view is the primary design target.

---

## Part 4: What Got Cut

From the 155 ideas, here's what doesn't belong in the first build:

**Cut entirely:**
- Futarchy/prediction markets (#6) - too experimental, adds confusion
- Holographic consensus (#7) - premature optimization for a small community
- Community currencies per bioregion (#75, #137) - wait for Local Scale partnership
- Peer-to-peer marketplace (#73) - scope creep, not governance
- QR-based signing at events (#69) - nice-to-have, not core
- AI governance summarization (#102) - the existing chat assistant covers this
- "Why SEEDS Failed" memorial (#105) - honors the lineage but doesn't need to be in the app
- Governance XP decay (#141) - adds punitive feeling to a joyful experience
- Facilitation skill tree (#140) - overcomplicates the game layer
- Economic simulation tool (#57, #80) - separate project, not dashboard

**Deferred to later sprints/seasons:**
- Cobudgeting for fund allocation (#116) - needs Cobudget integration, Sprint 5+
- Hypercerts (#15) - needs separate contract deployment
- Soul-bound tokens (#9) - needs smart contract, Sprint 4+
- Mutual credit between land projects (#134) - needs Local Scale
- Cross-network credential portability (#101) - needs W3C VC infrastructure
- Food-backed currency (#133) - needs Local Scale partnership
- LETS module (#132) - needs Local Scale partnership
- Harberger stewardship (#16) - exotic mechanism, later
- Popup village coordination (#19) - events system exists on main site

**Kept and prioritized (forms the 6 sprints):**
- The welcome experience
- Attention inbox (action-oriented home screen)
- Native proposal rendering (replacing raw Loomio)
- Inline voting
- Bioregion dashboard with health visualization
- Economic dashboard with live token data
- Passport/identity page
- Progressive disclosure by citizenship tier
- The four decision-making methods (consent/advice/consensus/mandate)
- Liquid delegation with transparency
- Governance quest chain
- Seasonal rhythm integration
- Living governance handbook
- "Propose a Dashboard Upgrade" standing feature
- Transparent financial dashboard (open books)
- Gratitude-to-governance pipeline visibility
- Rage-quit/exit protection
- The governable dashboard concept
- Bioregion auto-population from main site
- Explicit power mapping

---

## Part 5: Design Language

### Mobile-First Principles

1. **Thumb-zone design.** Primary actions live in the bottom 40% of the screen. Vote buttons, navigation, and the most-tapped elements are all reachable without stretching.

2. **One-tap actions everywhere.** Vote on a proposal? One tap. Send gratitude? One tap. Delegate your votes? One tap to the delegation screen, two taps to delegate. Every extra tap is a reason to put the phone down and not come back.

3. **Progressive disclosure, always.** The home screen shows 3 sections. Each section expands on tap. The full bioregion doughnut is behind a tap. The full economic dashboard is behind a nav item. Never overwhelm. Always invite deeper.

4. **Offline-aware.** If a player is at a land project with spotty signal, cached data shows immediately. Votes queue and sync when connectivity returns. The app never shows a blank screen or spinner for more than 200ms.

### Visual System

The dark forest theme from regencivics.earth, extended:

- **Backgrounds:** Deep forest (#0d2818) with subtle gradient shifts. Not flat. Living.
- **Cards:** Glass-panel effect (rgba(26,71,42,0.85) + backdrop-blur(12px) + 1px border rgba(125,216,125,0.15)). 16px radius. Subtle hover glow on desktop.
- **Accent:** Bright leaf green (#7dd87d) for interactive elements, active states, and positive indicators.
- **Gold:** Warm gold (#d4a574) for governance badges, special achievements, and the Fund track.
- **Text:** White (#f0f0f0) primary, 60% white for secondary. Never gray. Always warm.
- **Buttons:** Pill-shaped (border-radius: 9999px). Primary = green fill, dark text. Secondary = green outline. Danger = red fill. Text buttons = green text.
- **Animations:** Subtle and purposeful. Cards fade in on scroll (200ms). Vote tallies animate when updated. The bioregion health gauge animates on first render. Nothing bounces. Nothing shakes. Everything breathes.

### Mobile Nav (bottom bar, 5 items)

```
[Home]  [Proposals]  [Bioregion]  [Economy]  [Passport]
  🏠       📋          🌍          📊          🪪
```

Icons are outlined when inactive, filled when active. Active state = green fill. The Home icon has a notification dot (green) when there are items in the attention inbox.

### Desktop Nav (left sidebar, collapsed by default)

Same 5 items, plus:
- Settings (gear icon)
- Governance Handbook (book icon)
- "Propose an Upgrade" (sparkle icon, gold)

Sidebar collapses to icons only (56px wide) and expands on hover to show labels (240px).

---

## Part 6: The Six Sprints

Each sprint is a complete Claude Code execution prompt. Each one results in a deployable increment. Run them sequentially.

---

### Sprint 1: Foundation and Home Screen

**Prompt file:** `REGEN_GOV_SPRINT_1.md`

**Goal:** A new Next.js app at gov.regencivics.earth with Privy auth, the welcome modal, and the attention-inbox home screen.

**Delivers:**
- Next.js 14 app with App Router, Tailwind CSS, dark forest theme
- Privy auth (shared App ID with main site, dual-auth fallback to legacy JWT)
- Welcome modal (first-visit only, full story text, "Open My Passport" button)
- Home screen with three sections:
  - "Your Attention" inbox pulling from `governance.myDecisionQueue` + `governance.myUnclaimedBalance`
  - "Your Bioregion" card (auto-populated from player's bioregions, or "Join a Bioregion" with list)
  - "The Movement" compact census (player count, active proposals, governance participation rate)
- Mobile bottom nav (5 items, Home active)
- Desktop sidebar nav (collapsed/expanded)
- Responsive layout (mobile stack / desktop three-column)
- GlassCard, PillButton, and all shared UI components with the dark forest design language

**Technical notes:**
- Auth: Privy on client, verify Privy token on server, fallback to rc_session JWT
- The gov app makes HTTP calls to main site's tRPC endpoints with forwarded auth
- All pages require auth. Unauthenticated visitors redirect to main site login
- CORS headers required on main site for gov.regencivics.earth origin

---

### Sprint 2: Native Deliberation System

**Prompt file:** `REGEN_GOV_SPRINT_2.md`

**Goal:** Players can create, discuss, vote on, and stage proposals entirely within gov.regencivics.earth. Our own deliberation layer, no external dependencies.

**Delivers:**
- Proposals list page (`/proposals`) with filters: All / My Bioregion / Fund Track / Game Track / Closing Soon / Staged for Season
- Proposal detail page (`/proposals/:id`) with full lifecycle:
  - Draft editing (author only)
  - Discussion phase with threaded comments
  - Polling phase with inline vote buttons (Agree / Disagree / Abstain / Block, method-dependent)
  - Animated vote tally with real-time updates
  - Time remaining with visual countdown
  - Outcome display and "Staged for Next Season" badge
  - Hypha bridge link (when ratified)
  - Decision method badge (Consent / Advice / Consensus / Mandate)
  - Urgency tag for mid-season Hypha proposals
  - Bioregion scope tag
- Create proposal flow: template picker, draft editor, publish to discussion
- Inline voting from the home screen attention inbox (one-tap vote without navigating away)
- Staged seasonal governance: proposals that pass polling are staged, not immediately sent to Hypha

**Server changes (on main site):**
- New tRPC procedures: `governance.createProposal`, `governance.updateProposal`, `governance.publishProposal`, `governance.openPolling`, `governance.closePolling`, `governance.castVote`, `governance.stageForSeason`, `governance.sendToHypha`
- New tRPC procedures: `governance.addComment`, `governance.getProposalFull`, `governance.listProposals`
- Migration: create `govProposals`, `govComments`, `govVotes` tables

---

### Sprint 3: Bioregion Dashboard and Health Visualization

**Prompt file:** `REGEN_GOV_SPRINT_3.md`

**Goal:** Each bioregion gets a living dashboard with health metrics, land project status, and local governance.

**Delivers:**
- Bioregion detail page (`/bioregion/:id`) with:
  - Header: name, member count, established date
  - Doughnut economics visualization (SVG, animated):
    - Inner ring: social foundation (food security, education, health, housing, community)
    - Outer ring: ecological ceiling (soil, water, biodiversity, carbon, land use)
    - Each segment colored on a red-yellow-green gradient based on score (0-100)
    - Tap a segment to see the score, trend, and contributing land projects
  - Active land projects list with status badges (Applied/Incubating/Active/Established/Anchor)
  - Open proposals scoped to this bioregion
  - Member directory (avatars, handles, citizenship tier badges)
  - Bioregion stewards (highlighted at top)
  - "Join this Bioregion" button (if not a member)
  - Bioregion boundary proposal link (future, placeholder)
- Bioregion health reporting form (for stewards): submit seasonal health scores
- Mini health gauge on the home screen bioregion card

**New files:**
- `apps/gov/src/app/bioregion/[id]/page.tsx`
- `apps/gov/src/components/DoughnutVisualization.tsx` - the SVG doughnut
- `apps/gov/src/components/LandProjectList.tsx`
- `apps/gov/src/components/BioregionMembers.tsx`
- `apps/gov/src/components/HealthReportForm.tsx`
- `apps/gov/src/components/MiniHealthGauge.tsx`

**Database changes:**
- Migration: create `bioregionHealthMetrics` table
- New tRPC procedures for health metric CRUD

---

### Sprint 4: Economic Dashboard and Live Token Data

**Prompt file:** `REGEN_GOV_SPRINT_4.md`

**Goal:** The full economic dashboard with live Base chain data, fund metrics, and the SEEDS-inspired readiness gauges. No USD price for $ReGen.

**Delivers:**
- Economy page (`/economy`) with:
  - $ReGen dashboard: total supply, velocity of exchange, distribution rate, holder count, 7-day sparklines
  - $RCivics dashboard: total supply, holder count, staking metrics
  - Fund health card: AUM, total deployed to projects, seasonal returns, treasury runway
  - Governance token metrics: total in circulation, tokens staked in active votes, harvest pool status
  - Readiness gauges (inspired by SEEDS):
    - Community health (governance participation rate, active players, gratitude volume)
    - Economic health (token distribution, fund deployment ratio, exchange velocity)
    - Ecological health (aggregate land project health scores)
    - Governance health (proposal throughput, decision velocity, delegation coverage)
  - Gratitude flows table: this season vs last (gratitude given, governance tokens earned, cycle change %)
  - "Planted vs Sold" indicator: tokens committed to governance vs tokens on exchanges
- Economic snapshot job: daily capture of key metrics into `economicSnapshots` table
- viem integration: read token balances and supply from Base contracts

**Server changes:**
- New job: `snapshotEconomicData` (daily cron)
- New tRPC procedures: `economy.getTokenMetrics`, `economy.getSnapshots`, `economy.getReadiness`
- viem calls to Base RPC for live token supply, holder count, transfer events

**Database changes:**
- Migration: create `economicSnapshots` table

---

### Sprint 5: Passport, Delegation, and Governance Handbook

**Prompt file:** `REGEN_GOV_SPRINT_5.md`

**Goal:** The player's passport page, liquid delegation, progressive disclosure, and the living governance handbook.

**Delivers:**
- Passport page (`/passport`) with:
  - Visual citizenship tier badge (animated, tier-appropriate: Seedling through Guardian)
  - Contribution score with breakdown (quests, forum, gratitude, governance, events)
  - Governance participation history: votes cast, proposals created, delegations held
  - Credentials timeline: a vertical timeline of governance milestones
    - "Joined ReGen Civics" / "First vote cast" / "First proposal created" / "Reached Citizen tier"
  - Token balances: $ReGen, $RCivics, internal governance tokens
  - Active delegations (who you've delegated to, and who's delegated to you)
  - Notification preferences
- Delegation page (`/passport/delegation`) with:
  - Current delegations list
  - "Delegate my votes" flow: search for a steward, select scope (bioregion, track, or all), confirm
  - Delegation transparency: see delegation chains (who delegates to whom)
  - One-tap revoke on any delegation
  - Delegation weight display (how much governance power you hold including delegated)
- Governance Handbook page (`/handbook`) with:
  - Living, markdown-rendered document pulled from `governanceAgreements` table
  - Version history (who changed what, when)
  - Sections: Decision-Making Methods, Financial Agreements, People Agreements, Bioregion Norms
  - "Propose an Amendment" button (creates a governance proposal to modify the handbook)
- Progressive disclosure:
  - Visitors see: welcome + read-only movement pulse + "Join to participate"
  - Residents see: home screen + proposals (read-only) + bioregion
  - Citizens see: full voting + delegation + economy + proposal creation
  - Stewards see: all of the above + power mapping + steward tools + health reporting

**New files:**
- `apps/gov/src/app/passport/page.tsx`
- `apps/gov/src/app/passport/delegation/page.tsx`
- `apps/gov/src/app/handbook/page.tsx`
- `apps/gov/src/components/CitizenshipBadge.tsx` - animated tier badge
- `apps/gov/src/components/ContributionBreakdown.tsx`
- `apps/gov/src/components/CredentialsTimeline.tsx`
- `apps/gov/src/components/DelegationFlow.tsx`
- `apps/gov/src/components/DelegationGraph.tsx` - visualization of delegation chains
- `apps/gov/src/components/HandbookRenderer.tsx`
- `apps/gov/src/lib/permissions.ts` - tier-based access control

---

### Sprint 6: Governance Quest Chain, Seasonal Rhythm, and Polish

**Prompt file:** `REGEN_GOV_SPRINT_6.md`

**Goal:** The game layer that makes governance participation a joyful progression, seasonal integration, and the "governable dashboard" concept.

**Delivers:**
- Governance quest chain (visible on passport page):
  - Quest 1: Read the Governance Handbook
  - Quest 2: Observe a vote (view a proposal detail page)
  - Quest 3: Cast your first vote
  - Quest 4: Delegate your votes to a steward
  - Quest 5: Comment on an active proposal (via forum link)
  - Quest 6: Submit your first proposal
  - Each quest awards governance tokens and contribution score points
  - Completing the chain unlocks Citizen tier eligibility
- Seasonal rhythm integration:
  - Season indicator on the home screen (current season name + beat: Connect/Plan/Work/Reflect)
  - Countdown to next seasonal milestone (festival, harvest, beat transition)
  - Seasonal-appropriate UI touches (subtle background shifts, seasonal quest availability)
- "Propose a Dashboard Upgrade" standing feature:
  - A permanent button on the economy page (gold sparkle icon)
  - Opens a proposal template pre-filled with "Dashboard Upgrade" category
  - Community votes on proposed changes to the dashboard
  - Governance token bonus for adopted proposals
- Power mapping (steward-only view):
  - Who holds the most delegation weight
  - Who has the highest contribution scores
  - Who has shepherded the most proposals
  - Governance participation by bioregion
  - All visible, transparent, challengeable
- Final polish:
  - Page transition animations (subtle fade/slide, 150ms)
  - Skeleton loading states (shimmer cards matching the glass-panel design)
  - Empty state illustrations (hand-drawn style, forest theme)
  - Error states with helpful recovery actions
  - Performance optimization: React Server Components where possible, client components only for interactive elements
  - Lighthouse audit targeting 95+ on all categories
  - Accessibility: ARIA labels, keyboard navigation, screen reader support, color contrast AA

**New files:**
- `apps/gov/src/components/GovernanceQuestChain.tsx`
- `apps/gov/src/components/SeasonIndicator.tsx`
- `apps/gov/src/components/DashboardUpgradeProposal.tsx`
- `apps/gov/src/components/PowerMap.tsx`
- `apps/gov/src/components/SkeletonCard.tsx`
- `apps/gov/src/components/EmptyState.tsx`

---

## Part 7: Integration Map

### How Everything Connects

```
                    ┌─────────────────────┐
                    │   gov.regencivics    │
                    │   (Next.js app)      │
                    │                      │
                    │  Welcome Modal       │
                    │  Attention Inbox     │
                    │  Native Deliberation │
                    │  Bioregion Dashboard │
                    │  Economy Dashboard   │
                    │  Passport            │
                    │  Governance Handbook  │
                    └──────┬──────┬────────┘
                           │      │
              Privy auth   │      │   tRPC calls
              (shared ID)  │      │   (Privy token forwarded)
                           │      │
                    ┌──────┴──────┴────────┐
                    │  regencivics.earth    │
                    │  (Main Next.js app)   │
                    │                      │
                    │  151+ governance tRPC │
                    │  Forum data          │
                    │  Player profiles     │
                    │  Bioregion data      │
                    │  Quest system        │
                    │  Gratitude system    │
                    └──────┬───────────────┘
                           │
              shared DB    │
              (Railway     │
               MySQL)      │
                    ┌──────┴──┐
                    │ MySQL   │
                    │ Railway │
                    │         │
                    │ govProposals     │
                    │ govComments      │
                    │ govVotes         │
                    │ govDashboardPrefs│
                    │ economicSnapshots│
                    │ bioregionHealth  │
                    └──────┬──────────┘
                           │
              staged       │  proposals ratified
              proposals    │  at season boundary
                           │
                    ┌──────┴──────────┐
                    │  Hypha Bridge    │
                    │  (Base chain)    │
                    └──────┬──────────┘
                           │
                    ┌──────┴──────────┐     ┌──────────────┐
                    │  Hypha DHO      │────>│  On-chain    │
                    │  (on Base)      │     │  ratification│
                    └─────────────────┘     └──────────────┘

            ┌───────────────┐
            │  $ReGen        │  ERC-20 on Base
            │  $RCivics      │  0x4E61...AA2E4
            └───────────────┘  0x72e9...ef26
```

### Partner Integrations (Phase 2+)

```
Local Scale (partnership)
  -> Bioregional currency data
  -> oSwaps for inter-bioregional trade
  -> Shared profile layer (future)

Hypha (existing bridge)
  -> On-chain governance execution
  -> DHO proposal creation
  -> Token movement on Base

Regen Network (future)
  -> Ecological credit verification
  -> Satellite-based land monitoring data
  -> Cross-network credential sharing
```

---

## Part 8: Success Metrics

How we know this is working:

1. **90-second test.** Time a player from opening the app to completing their pending action (voting, co-signing, RSVP). If it takes more than 90 seconds, the UX needs work.

2. **Governance participation rate.** Track the percentage of Citizens who vote on proposals each season. Target: 60%+ (most DAOs struggle to hit 20%).

3. **Return rate.** How many players come back to the dashboard at least once per week. Target: 70%+ of Citizens.

4. **Proposal throughput.** Number of proposals that move from forum discussion to formal decision to outcome per season. Target: increasing each season.

5. **Bioregion health scores.** Are they going up over time? The dashboard should show whether the governance is actually helping the land.

6. **"Caught up" frequency.** How often players see the "You're caught up" message. This means the system is working well enough that attention items are resolved quickly.

---

## Ideas Garden

Ideas that got cut from the sprint plan but deserve to live somewhere. Some are future features. Some are partnerships waiting to mature. Some are experiments that need the right season. None are deleted.

### Bioregional Currencies (Local Scale Partnership)
When the Local Scale partnership matures, bioregional currencies become possible. Each bioregion could mint its own food-backed local currency that interoperates across the network via oSwaps. This is planned for the Local Scale integration phase, after the core gov dashboard is stable.

Related ideas from ideation: #75 (community currencies per bioregion), #132 (LETS module), #133 (food-backed currency), #134 (mutual credit between land projects), #137 (bioregional exchange network).

### Advanced Governance Mechanisms
- **Futarchy/prediction markets (#6):** Let the community bet on outcomes of governance decisions. Requires a prediction market contract. Revisit when Base ecosystem matures.
- **Holographic consensus (#7):** Attention staking to boost proposals, inspired by DAOstack. Interesting once proposal volume exceeds what a small community can manually review.
- **Harberger stewardship (#16):** Self-assessed tax on governance positions. Exotic, but could make stewardship rotation more dynamic.
- **Conviction voting with decay:** Continuous signaling where votes accumulate weight over time. Could replace polling for certain low-stakes decisions.

### Cross-Network Credentials
- **Hypercerts (#15):** On-chain impact certificates for land projects. Needs separate contract deployment on Base.
- **Soul-bound tokens (#9):** Non-transferable credentials for governance participation milestones. Sprint 4+ when the passport is stable.
- **Cross-network credential portability (#101):** W3C Verifiable Credentials so a ReGen Civics Citizen credential is recognized on Hypha, Local Scale, and partner networks. Long-term infrastructure.

### Tools and Simulations
- **Economic simulation tool (#57, #80):** "What if" modeling for token policy changes. Separate project from the dashboard.
- **AI governance summarization (#102):** The existing chat assistant on the main site covers this. Could extend to auto-summarize proposal discussions.
- **QR-based signing at events (#69):** Physical governance actions at land project gatherings. Nice-to-have for festivals.
- **Popup village coordination (#19):** Events system already exists on the main site. Integrate with seasonal calendar rather than building fresh.

### Game Layer Extensions
- **Facilitation skill tree (#140):** A progression tree for learning governance facilitation. Overcomplicates the game layer for now. Revisit when the player base grows.
- **Governance XP decay (#141):** Punitive mechanic that contradicts the joyful design philosophy. Keep governance participation rewarding, not punishing absence.

### Cobudgeting (Greaterthan Integration)
Participatory budgeting for fund allocation, inspired by Greaterthan's Cobudget practice. Each season, a portion of governance tokens could be allocated via collaborative prioritization. Needs Cobudget integration or a native implementation. Sprint 5+ territory.

### The "Why SEEDS Failed" Memorial (#105)
A page honoring the SEEDS lineage and the lessons learned. Valuable context for the community but doesn't need to live inside the app. Better as a blog post or forum thread on the main site.

---

## Appendix: Files to Read Before Each Sprint

**Sprint 1:** This document (architecture) + `PRIVY_AUTH_MIGRATION_SPEC.md` + `server/_core/sdk.ts` (auth) + `server/_core/context.ts` (tRPC context) + `drizzle/schema.ts` (existing schema)

**Sprint 2:** `server/routes/governance.ts` (151 procedures) + `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md` (staged governance flow) + `client/src/components/governance/PromotionModal.tsx` (UI patterns) + `client/src/pages/DecisionsDashboard.tsx` (existing decisions UI)

**Sprint 3:** `client/src/components/BioregionSelect.tsx` (existing bioregion data) + `REGEN_GAMES_SPEC_V1.md` (game variables for contribution scores) + `LIVING_TREE_VISUALIZATION_SPEC.md` (SVG visualization patterns)

**Sprint 4:** `server/jobs/governanceJobs.ts` (existing viem usage) + `CONTEXT_THE_TWO_GAMES.md` (Fund vs Game token distinction) + `.env` (token contract addresses)

**Sprint 5:** `CITIZENSHIP_TIERS_SPEC.md` + `server/routes/players.ts` (player data) + `client/src/pages/PlayerProfile.tsx` (existing profile patterns)

**Sprint 6:** `REGEN_GAMES_SPEC_V1.md` (quest system, contribution scoring) + `COMMUNITY_AGREEMENTS_PLAN.md` (community agreements feature) + `client/src/pages/Governance.tsx` (existing governance education page)

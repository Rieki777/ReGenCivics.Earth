# SEEDS Vision Implementation Spec: 33 Features for ReGen Civics

Written 2026-04-01. Revised after Rye's feedback on all 33 ideas. Incorporates: Explorer/Co-Creator/Steward/Sage citizenship tiers, LocalScale integration for marketplace, BioFi/BFF (Bioregional Financing Facilities) framing, Game Mechanics page, gratitude multipliers, lunar/solstice seasonal patterns, and all other direction from Rye.

---

## Foundational Context

**Citizenship Tiers (replaces Visitor/Resident/Citizen):**
- Explorer (entry level)
- Co-Creator (earned through participation)
- Steward (earned through deeper contribution)
- Sage (earned through sustained, high-impact contribution)

**External Integrations:**
- LocalScale.org: All marketplace and exchange functions. We link and guide, we don't rebuild.
- Hypha: All governance and voting infrastructure. We integrate, we don't duplicate.
- BioFi: Bioregional Financing Facilities (BFFs). Replaces "bioregional co-ops" everywhere.

**Seasonal Patterns:**
- Macro cycle: Solstice to Solstice, Equinox to Equinox (4 seasons, ~91 days each)
- Micro cycle: Lunar months (new moon to new moon, ~29.5 days)
- Standing Seasonal Festival: Sunday following every solstice and equinox, 10:00 AM - 12:00 PM EST
- All Harvest distributions, gratitude budgets, reputation composting, and contribution score recalculations follow these natural cycles

---

## GROUP 1: REFRAME WHAT ALREADY EXISTS

### 1. Reframe Marketplace as Connection Hub, Link to LocalScale

**What it is:** Rewrite the existing Marketplace page (gifts/needs) to focus on connecting people and coordinating shared goals. Remove any marketplace/exchange framing. Direct all actual exchange activity to LocalScale.org.

**New framing:** "All the pieces and people already exist. We just need to connect and coordinate. This is where you find the skills, knowledge, resources, and collaborators to make things happen. Looking to actually buy, sell, or exchange goods and services? Our partner LocalScale runs a fee-free bioregional marketplace. [Go to LocalScale.org ->]"

**Changes needed:**
- Page title: "Connect and Coordinate" or "Find Your People" (Rye to decide)
- Remove any language implying buying/selling
- Add prominent LocalScale.org link with explanation
- Keep the gifts/needs functionality but reframe gifts as "What I can offer this community" and needs as "What I'm looking for help with"
- Add collaboration-focused categories: "Seeking project partners," "Looking for mentorship," "Want to start something in my bioregion," "Have land/space to share"
- Keep existing DB tables (gifts, needs) as-is

**Depends on:** Nothing. Pure page rewrite.

---

### 2. Surface Contribution Scores and Tier Badges Everywhere

**What it is:** Show TierBadge and small LivingTree (32px) next to forum posts, marketplace listings, endorsements, and community activity.

**Changes needed:**
- Forum posts: Add TierBadge next to author name (component exists)
- Marketplace listings: Add TierBadge next to listing author
- Community activity feed: Show tier alongside all activity entries
- Endorsements: Show both parties' tiers
- Direct messages: Show tier in conversation headers

**Depends on:** Contribution score calculation running (already implemented in game.ts). TierBadge component exists. LivingTree small variant exists.

---

### 3. Build "Contributions" Dashboard Tab on Player Profiles

**What it is:** Bundle existing contribution data into a single dashboard tab on player profiles. Title: "Contributions" (not "Your Economy").

**Data already available:**
- Contributions across 9 capital types (playerContributions table)
- Gratitude sent/received (game.ts gratitude system)
- Endorsements given/received (game.ts endorsement system)
- Quest completions (questCompletions table)
- Tier and trust score (playerProfiles)
- Contribution Compass visualization (ContributionCompass.tsx exists)
- Living Tree visualization (LivingTree.tsx exists)

**New elements to add:**
- Season summary: "This season you contributed across X capital types"
- Gratitude summary: "You sent Y gratitude tokens, received Z"
- Harvest share estimate (based on current percentile): "Your estimated Harvest share this cycle"
- Contribution history timeline (contribution_score_events table)
- Percentile rank with context: "You're in the Xth percentile of all active contributors"

**Depends on:** Contribution score calculation, gratitude tracking. Both exist.

---

### 4. Reframe Governance Page with Three Coordination Tools Language

**What it is:** Rewrite governance page intro to position it as the third coordination tool alongside Contribution Scores and Gratitude.

**New intro copy:** "Three tools coordinate our society. Contribution Scores track what you do. Gratitude acknowledges what systems can't see. Proposals are how we make collective decisions about where resources flow. This page is about the third tool. All governance happens through our partner Hypha's infrastructure, connected to your ReGen Civics profile."

**Changes needed:**
- Add three-tool framing to page header
- Cross-link to /economy page for full explanation
- Cross-link to Hypha for actual governance participation
- Keep existing Fund vs Game governance toggle
- Replace "citizen" references with tier names (Explorer/Co-Creator/Steward/Sage)

**Depends on:** /economy page existing (build #6 first, or just link to placeholder).

---

### 5. Add Economic Weight to Gratitude + Multiplier Mechanics

**What it is:** Make gratitude economically meaningful with visible language AND add trust-graph multiplier mechanics.

**Core mechanic (NEW):**
- Gratitude power scales with citizenship tier: Explorer = 1x, Co-Creator = 1.5x, Steward = 2x, Sage = 3x
- Gratitude power also scales with how much gratitude you've received in previous seasons (trust graph): more received = your sent gratitudes carry more weight
- This means: a Sage who is widely trusted by the community sends gratitude that carries real economic weight, while an Explorer's gratitude still counts but at base level
- All multiplier values are Game Variables (adjustable in admin)

**Admin additions (game_variables):**
- `gratitude.multiplier.explorer` (default: 1.0)
- `gratitude.multiplier.co_creator` (default: 1.5)
- `gratitude.multiplier.steward` (default: 2.0)
- `gratitude.multiplier.sage` (default: 3.0)
- `gratitude.trust_graph.enabled` (default: true)
- `gratitude.trust_graph.received_weight` (default: 0.1, meaning each gratitude received in previous season adds 0.1 to your sending multiplier, capped)
- `gratitude.trust_graph.max_bonus` (default: 2.0, cap on trust graph bonus)
- `gratitude.budget.explorer` (default: 3 per lunar cycle)
- `gratitude.budget.co_creator` (default: 5 per lunar cycle)
- `gratitude.budget.steward` (default: 8 per lunar cycle)
- `gratitude.budget.sage` (default: 13 per lunar cycle)

**UI changes:**
- GratitudeDrawer: Add line "Your gratitude carries Xx weight this cycle" showing current multiplier
- GratitudeDrawer: Show breakdown on hover/tap: "Base (Steward): 2x + Trust bonus (received 47 gratitudes last season): +1.2x = 3.2x total"
- Add to /economy page text: "The gratitude you send has economic weight. At season's end, people who receive the most gratitude earn a larger share of the Harvest. Your gratitude grows more powerful as you contribute and as others trust you."

**Database changes:**
- Add `gratitude_multiplier` computed field to playerProfiles (or compute on read)
- Add `gratitude_received_previous_season` to playerProfiles (updated at season boundary)

**Depends on:** Citizenship tier system (#21), game_variables admin (exists).

---

## GROUP 2: BUILD THE ECONOMY PAGES

### 6. Build /economy Page (from Draft v4 + Revisions)

**What it is:** The single most important new page. Full spec in DRAFT_GAME_AND_ECONOMY_PAGES.md Part 3, with these revisions:
- Replace all "citizen" language with Explorer/Co-Creator/Steward/Sage tiers
- Replace "bioregional co-ops" with "Bioregional Financing Facilities (BFFs)" throughout
- Replace "30% to citizens" with "30% to all contributors" in Harvest distribution
- All distribution percentages are Game Variables (adjustable in admin, visible on Game Mechanics page)
- Link marketplace references to LocalScale.org
- Link governance references to Hypha
- Include first-person SEEDS origin story (see deliverable below)
- Include "Day in the Life" walkthrough (see deliverable below)
- Add mature forest cooperation metaphor to Better Than Free section
- Add "Minimum Viable Civilization" framing
- Add slow money / permaculture principle 9 connection

**Route:** /economy
**Nav:** Under "Play the Game" dropdown, after "Game Overview"

**Depends on:** Draft v4 copy (exists). First-person origin story (deliverable below). Day in the Life (deliverable below).

---

### 7. Build /local-food-economy Page (from Draft v4 + Revisions)

**What it is:** Full spec in DRAFT_GAME_AND_ECONOMY_PAGES.md Part 4, with these revisions:
- Replace "bioregional co-ops" with "BFFs" throughout
- Remove "57 years" urgency stat (Rye: focus on the good)
- Embed the bioregional food producer map directly on this page (#11)
- Embed the Local Food Economy quest chain start on this page (#12)
- Link any marketplace/exchange functions to LocalScale.org (#15)
- Add the P2P food cycle circular diagram
- Add "better-than-free solves the P2P platform problem" argument
- Tie "Go Live" to BioFi's bioregional activation model

**Route:** /local-food-economy
**Nav:** Under "Play the Game" dropdown, after "The Economy"

**Depends on:** Draft v4 copy (exists). Map integration (#11). Quest chain (#12).

---

### 8. Add Hook Banners Across All Pages

**What it is:** "If enough of us play the Game, it's real." Full-width band on every major page.

**Design alignment with current schema:**
- Use existing site color tokens (check siteSettings/siteBanners for current palette)
- Match the banner pattern used in siteBanners table (already has admin-editable banners)
- Could potentially BE a site banner managed through existing AdminBannerEditor
- Five contextual versions per draft v4 Part 1

**Implementation approach:**
- Option A: Create as a reusable `EconomyHookBanner` component with a `variant` prop for each page's contextual text
- Option B: Use the existing siteBanners system and create 5 banner entries that display conditionally by route
- Rye to decide. Option B gives you admin control over the copy without code changes.

**Depends on:** /economy page existing for the link target.

---

### 9. Build "Game Mechanics" Page (Public Game Variables Dashboard + Simulator)

**What it is:** A public-facing, beautifully designed page showing every Game Variable with a simulation tool. This is the transparency engine of the whole system. Named "Game Mechanics" in the nav.

**Two sections:**

**Section A: Live Variables Dashboard**
- Read-only view of all game_variables grouped by category
- Categories: Contribution Scoring, Gratitude, Harvest Distribution, Reputation, Citizenship Tiers, Seasonal Timing, Local Food Economy, Trust Graph
- Each variable shows: current value, description, last changed date, who changed it (admin audit trail from game_variable_history)
- Clean, scannable design. Not a raw admin dump. Curated presentation with explanations.
- Searchable and filterable

**Section B: Game Simulator**
- Interactive tool where players can adjust variables and see projected outcomes
- Input: Sliders for key variables (harvest ratios, contribution weights, gratitude multipliers, reputation decay, tier thresholds)
- Output: Projected outcomes showing "If these were the rules, here's what would happen to distribution, incentives, and governance weight"
- Example scenarios: "What if we doubled the gratitude budget?" "What if food production earned 3x contribution points?" "What if reputation decayed faster?"
- "Print Report" / "Export as Proposal" button: generates a formatted summary of the simulated variable set that can be submitted as an Economic Upgrade Suggestion (#17)
- The export connects directly to the suggestion system, pre-filling the form with the simulated variables and projected outcomes

**Route:** /game-mechanics
**Nav:** Under "Play the Game" dropdown

**Database:** Reads from game_variables and game_variable_history (both exist). No new tables needed for the dashboard. The simulator is client-side calculation only.

**Depends on:** game_variables table populated with all relevant variables. Admin UI for variables (exists).

---

### 10. Add Harvest Distribution to Tokenomics Page

**What it is:** Add SEEDS-style distribution breakdown to existing Tokenomics page.

**Distribution (starting values, all Game Variables):**
- 30% to all contributors (by contribution score percentile)
- 20% to Bioregional Financing Facilities (BFFs)
- 20% to qualifying organizations (by regenerative reputation)
- 30% to shared treasury (maintenance, ecological restoration, expansion)

**Presentation:**
- Animated pie/flow chart matching existing Tokenomics page style
- Each slice links to /game-mechanics for the full variable breakdown
- Clear note: "These are the starting ratios. They're Game Variables. The community evolves them through governance."
- Replace "citizens" with "all contributors"

**Depends on:** Tokenomics page (exists). Game Variables populated.

---

## GROUP 3: FOOD ECONOMY INFRASTRUCTURE

### 11. Bioregional Food Producer Map on /local-food-economy

**What it is:** Map layer on the /local-food-economy page showing food producers who've applied, with bioregional density and "Go Live" progress.

**Implementation:**
- Use existing Map page components/infrastructure (GlobeMap, GeographicAnalytics)
- Embed a focused map view on /local-food-economy (not a separate page)
- Data source: localFoodApplications table (from draft v4 spec)
- Show: producer locations, bioregion boundaries, density heatmap
- "Go Live" progress indicator per bioregion: "X producers committed, Y community members active, Z% to critical mass"
- Critical mass thresholds are Game Variables (adjustable in admin)
- Frame: "Once we reach critical mass in a bioregion, we come in and help launch their minimum viable food-backed economic system"

**Depends on:** /local-food-economy page (#7), localFoodApplications table, bioregions table (exists).

---

### 12. Local Food Economy Quest Chain on /local-food-economy Page

**What it is:** A visible quest progression chain displayed on the /local-food-economy page itself, showing each step of becoming a food economy participant.

**Quest chain (draft, Rye to refine):**

1. **Seed Saver** - Save seeds from something you've grown or eaten. Document what you saved and why. (Entry quest, always available)
2. **First Harvest** - Grow something edible, even a single herb in a pot. Document your harvest. (Requires: Seed Saver)
3. **Neighbor's Table** - Share food you grew or prepared with someone in your community. Photo or story. (Requires: First Harvest)
4. **Know Your Farmer** - Visit a local farm, farmers market, or food producer. Interview them. Post to the forum. (Requires: Neighbor's Table)
5. **Map a Producer** - Add a regenerative food producer to the bioregional food map. Verify their location and practices. (Requires: Know Your Farmer)
6. **Join or Start a CSA** - Commit to a Community Supported Agriculture share or help organize one. (Requires: Map a Producer)
7. **Food Forest Steward** - Plant a perennial food-producing system (food forest, edible hedgerow, fruit trees). Document your design and progress. (Requires: any 4 above)
8. **Local Food Ambassador** - Recruit 3 food producers to apply to the Local Food Economy. Help them through the application. (Requires: any 5 above)

**Display on page:**
- Show the chain as a visual progression (similar to quest unlock UI)
- Each quest card shows: title, brief description, what it requires, contribution points earned
- Locked quests show grayed with the prerequisite listed
- "Start this quest" button on the first available quest links to /quest with the relevant quest pre-selected
- Frame: "This is how you become part of the food economy. Each step moves your bioregion closer to Go Live."

**Depends on:** Quest data files, quest progression system (exists), /local-food-economy page (#7).

---

### 13. Seasonal Eating Challenge (Recurring Quest)

**What it is:** A recurring seasonal quest asking players to eat locally and seasonally.

**Mechanic:**
- Available each season (solstice to solstice cycle)
- Players document: what they ate, where it came from, what they learned
- Journal entries via questJournal table (exists)
- Gratitude tokens can be sent to food producers sourced from
- Bonus contribution points for sourcing from producers registered on the platform
- Community leaderboard for seasonal eating participation

**Depends on:** Quest system (exists), questJournal (exists), gratitude system (exists).

---

### 14. Community Regenerative Certification

**What it is:** Community-driven rating system for food producers instead of expensive third-party certification.

**Mechanic:**
- Extends existing endorsement system (game.ts endorsements)
- Community members visit/know a food producer and rate their regenerative practices
- Rating categories: Soil health practices, Biodiversity, Water management, Chemical inputs (absence of), Community engagement, Worker wellbeing
- Ratings aggregate into a "Regenerative Score" visible on the producer's org profile
- Score tiers: Regular -> Reputable -> Sustainable -> Regenerative -> Thriving
- Score affects Harvest multiplier (Game Variable)
- Minimum number of raters required before score is published (Game Variable, default: 5)

**Depends on:** Org profiles (#23), endorsement system (exists), game_variables (exists).

---

### 15. Link Exchange Functions to LocalScale

**What it is:** Everywhere the site currently implies or could imply buying/selling/exchanging, add clear guidance to LocalScale.org.

**Locations to update:**
- Marketplace page (#1 above)
- /local-food-economy "producer storefront" concept -> becomes "List your products on LocalScale"
- /economy references to "exchange" -> clarify that exchange happens on LocalScale
- Any future place where P2P trade is implied
- Add LocalScale to the footer links under "Partners" or "Ecosystem"
- Add a brief explanation: "LocalScale is our marketplace partner. They run a fee-free, bioregional exchange platform. All buying, selling, and trading happens there. Your ReGen Civics contribution score, reputation, and tier carry over."

**Depends on:** Coordination with LocalScale team on integration points.

---

## GROUP 4: GOVERNANCE AND PROPOSAL SYSTEM

### 16. Build Lightweight Proposals Page

**What it is:** The third coordination tool made real. A system for community members to propose actions and vote on them. Governance execution happens through Hypha; this is the discussion, formation, and signaling layer.

**Proposal lifecycle:**
1. **Idea** - Post in the forum under "Proposals" category. Discuss openly. Refine.
2. **Draft Proposal** - When ready, convert the forum discussion into a formal proposal using a template (#19). This creates an entry in the proposals table.
3. **Signal** - Community members vote to signal support (same upvote pattern as FeatureSuggestions). Voting weight is proportional to contribution score and tier.
4. **Threshold** - When a proposal reaches enough weighted support (Game Variable: `proposals.signal_threshold`), it's marked "Ready for Governance"
5. **Governance** - Proposal is taken to Hypha for formal on-chain governance vote
6. **Implementation** - If passed, we build it (for code changes) or execute it (for fund allocation)
7. **Follow-up** - Proposer reports back. Community rates the outcome. This affects the proposer's reputation.

**Weighted voting:**
- Explorer: 1x vote weight
- Co-Creator: 2x vote weight
- Steward: 4x vote weight
- Sage: 8x vote weight
- All weights are Game Variables (adjustable in admin)
- Reputation multiplier applies on top (0x to 2x)
- This means: a Sage with perfect reputation has 16x the voting weight of a base Explorer
- This is the "weighted direct democracy" from the SEEDS deck

**Database:**
- `proposals` table: id, authorId, title, description, category, status (idea/draft/signaling/threshold_reached/in_governance/passed/implemented/declined), templateType, forumThreadId, weightedVoteCount, createdAt, updatedAt
- `proposalVotes` table: id, proposalId, userId, weight (computed at vote time from tier + reputation), createdAt
- `proposalUpdates` table: id, proposalId, authorId, content, createdAt (for follow-up reporting)

**Categories:**
- Fund Allocation (which land projects or initiatives get funded)
- Game Variable Change (adjust any economic parameter)
- New Quest or Quest Category
- Food Economy (producer approvals, Go Live decisions, BFF funding)
- Platform Feature (new tools, integrations, UI changes)
- Community (events, partnerships, guidelines)
- Other

**UI:** Card-based layout matching FeatureSuggestions pattern. Weighted vote count displayed. Status badges. Forum thread link. Template indicator.

**Route:** /proposals
**Nav:** Under "Play the Game" dropdown, or under a new "Govern" section

**Depends on:** Citizenship tier system (#21), contribution scores (exist), forum categories (exist).

---

### 17. Economic Upgrade Suggestions (from Draft v4)

**What it is:** Already specced in draft v4 Part 3 Section 10. Same pattern as FeatureSuggestions.tsx / QuestSuggestions.tsx.

**Revision:** Link to Game Mechanics page (#9) simulator. When someone runs a simulation and clicks "Export as Proposal," it pre-fills an Economic Upgrade Suggestion with the simulated values.

**Depends on:** /economy page (#6), Game Mechanics page (#9).

---

### 18. Bioregional Financing Facilities (BFFs) Governance Layer

**What it is:** Local governance for bioregions, aligned with BioFi community. Replaces "bioregional co-ops" throughout all specs.

**Mechanic:**
- Members of a bioregion (via userBioregions table, exists) can create proposals specific to their region
- BFF proposals: fund a community kitchen, start a seed library, organize a food hub, support a local producer transition, fund local events
- BFF receives 20% of the Harvest (Game Variable)
- BFF proposals follow the same lifecycle as global proposals (#16) but are scoped to the bioregion
- Only members of that bioregion can vote on BFF proposals
- BFF status visible on the bioregional map

**Language alignment with BioFi:**
- "Bioregional Financing Facility" or "BFF" everywhere (not co-op, not DAO)
- Frame: "BFFs are how bioregions finance their own regeneration. Through community governance, each BFF directs a share of the Harvest toward local priorities: food infrastructure, ecological restoration, community spaces, and whatever else the people who live there decide matters most."

**Database:**
- Add `bioregionId` field to proposals table (nullable, null = global proposal)
- BFF-specific proposal categories: Local Food Infrastructure, Ecological Restoration, Community Spaces, Education, Local Events, Other

**Depends on:** Proposals system (#16), bioregions table (exists), userBioregions (exists).

---

### 19. Proposal Templates

**What it is:** Pre-structured templates that reduce friction for common proposal types.

**Templates:**

1. **Fund a Land Project**
   - Fields: Project name, amount requested, timeline, expected outcomes, how this serves the bioregion
   - Auto-links to the project's application if it exists in the system
   - Forum template includes sections for community Q&A

2. **Adjust a Game Variable**
   - Fields: Variable name (dropdown from game_variables), current value, proposed new value, rationale, expected impact
   - Auto-links to Game Mechanics page showing the variable
   - Can be pre-filled from Game Simulator export (#9)

3. **Approve a Food Producer**
   - Fields: Producer name, location, bioregion, what they produce, regenerative practices, commitment percentage
   - Auto-links to localFoodApplications entry if exists
   - Includes community rating prompt

4. **Create a New Quest**
   - Fields: Quest name, description, which capital types it serves, estimated time, prerequisites, what completion looks like
   - Forum template includes space for community feedback on quest design

5. **Fund a BFF Initiative**
   - Fields: Bioregion, initiative name, amount, timeline, how it serves the local community
   - Scoped to bioregion members only
   - Categories: food infrastructure, ecological restoration, community spaces, education, events

6. **Request a Platform Feature**
   - Fields: Feature description, which part of the platform it affects, who it serves, why it matters
   - Auto-creates a linked FeatureSuggestion entry

7. **Propose a Partnership or Alliance**
   - Fields: Organization name, what they do, how they align, proposed collaboration, what we'd each contribute
   - Forum template includes due diligence sections

8. **Propose a Community Agreement**
   - Fields: Agreement title, full text, rationale, who it applies to, how it's enforced
   - Links to existing communityAgreements table

**Implementation:**
- Template selector in proposal creation flow
- Templates pre-fill the proposal form fields and auto-generate the forum thread with structured sections
- Templates are stored in code initially (could be moved to DB later for admin editing)

**Depends on:** Proposals system (#16).

---

## GROUP 5: REPUTATION AND TRUST

### 20. Public Reputation Score on Player Profiles

**What it is:** Make trust score visible on profiles with context.

**Display:**
- Percentile (0-99) with tier label
- Current multiplier effect (e.g., "Your reputation gives you a 1.4x multiplier on all rewards")
- What builds it: forum engagement, governance voting, peer vouching, proposal follow-through
- What degrades it: inactivity (composting), failed proposals, flags from community
- Trend arrow: up/down/stable compared to last lunar cycle

**Depends on:** Trust score calculation (exists in game.ts).

---

### 21. Citizenship Tier System (Explorer / Co-Creator / Steward / Sage)

**What it is:** Full spec for the four-tier progression system with admin-controlled powers per tier.

**Tier Definitions (starting values, all Game Variables):**

**Explorer** (entry)
- Requirements: Create an account, complete profile
- Powers: Access quests, send basic gratitude (1x multiplier), participate in forum, view Game Mechanics, endorse players/projects
- Gratitude budget: 3 per season
- Harvest multiplier: 1.0x (base rate)

**Co-Creator** (earned)
- Requirements: Complete Fire quest + 1 seasonal rite, reach Sprout contribution score (15th percentile), receive 5+ gratitude tokens, 2+ seasons active
- Powers: Everything Explorer has + submit proposals (signaling layer), signal-vote on proposals, access contribution-gated quests, send more powerful gratitude (1.5x multiplier), create forum threads in governance categories, appear in Member Directory as "Co-Creator"
- Gratitude budget: 5 per season
- Harvest multiplier: 1.5x base rate

**Steward** (earned through sustained contribution)
- Requirements: Complete 4 seasonal rites (one per season), reach Sapling contribution score (30th percentile), receive 20+ gratitude tokens, give 15+ gratitude tokens, 4+ seasons active, 1+ endorsement from a Steward or Sage
- Powers: Everything Co-Creator has + rate food producers for regenerative certification, nominate new Stewards, access Steward-only forum category, send powerful gratitude (2x multiplier), eligible for Seasonal Council
- Gratitude budget: 8 per season
- Harvest multiplier: 2.0x base rate

**Sage** (earned through deep, long-term contribution)
- Requirements: Complete all 13 rites, reach Grower contribution score (50th percentile), receive 50+ gratitude tokens, serve on 1+ Seasonal Council, 8+ seasons active, 2+ endorsements from existing Sages, reputation score above 80th percentile
- Powers: Everything Steward has + send highest-power gratitude (3x multiplier), nominate Sages, access Sage-only forum, eligible to arbitrate disputes, can "sponsor" new Explorer accounts (vouching), visible as mentor in community
- Gratitude budget: 13 per season
- Harvest multiplier: 3.0x base rate

**Admin Controls:**
- Admin page: "Citizenship Tiers" showing all 4 tiers side by side
- Each tier shows: requirements (all editable as Game Variables), powers (toggle on/off per tier), gratitude settings, voting weight, harvest multiplier
- Toggle individual powers on/off per tier (e.g., turn off "submit proposals" for Co-Creators temporarily)
- Override: Admin can manually promote/demote any player (with audit log entry)
- All thresholds stored in game_variables with category "citizenship"

**Database:**
- Add `citizenshipTier` enum field to playerProfiles: 'explorer' | 'co_creator' | 'steward' | 'sage'
- Add `citizenshipTierUpdatedAt` timestamp
- Add `citizenshipTierHistory` table: id, userId, fromTier, toTier, reason ('automatic'|'admin_override'|'nomination'), promotedBy (nullable userId), createdAt
- Nightly job checks all players against tier requirements and auto-promotes/maintains
- Admin can override at any time

**Tier powers table (game_variables):**
```
citizenship.explorer.can_submit_proposals = false
citizenship.explorer.can_signal_vote = false
citizenship.explorer.can_rate_producers = false
citizenship.explorer.can_nominate_tiers = false
citizenship.explorer.can_arbitrate = false
citizenship.explorer.can_sponsor = false
citizenship.explorer.gratitude_budget = 3
citizenship.explorer.gratitude_multiplier = 1.0
citizenship.explorer.harvest_multiplier = 1.0

citizenship.co_creator.can_submit_proposals = true
citizenship.co_creator.can_signal_vote = true
citizenship.co_creator.can_rate_producers = false
citizenship.co_creator.can_nominate_tiers = false
citizenship.co_creator.can_arbitrate = false
citizenship.co_creator.can_sponsor = false
citizenship.co_creator.gratitude_budget = 5
citizenship.co_creator.gratitude_multiplier = 1.5
citizenship.co_creator.harvest_multiplier = 1.5

citizenship.steward.can_submit_proposals = true
citizenship.steward.can_signal_vote = true
citizenship.steward.can_rate_producers = true
citizenship.steward.can_nominate_tiers = true
citizenship.steward.can_arbitrate = false
citizenship.steward.can_sponsor = false
citizenship.steward.gratitude_budget = 8
citizenship.steward.gratitude_multiplier = 2.0
citizenship.steward.harvest_multiplier = 2.0

citizenship.sage.can_submit_proposals = true
citizenship.sage.can_signal_vote = true
citizenship.sage.can_rate_producers = true
citizenship.sage.can_nominate_tiers = true
citizenship.sage.can_arbitrate = true
citizenship.sage.can_sponsor = true
citizenship.sage.gratitude_budget = 13
citizenship.sage.gratitude_multiplier = 3.0
citizenship.sage.harvest_multiplier = 3.0
```

**Depends on:** game_variables admin (exists), contribution scores (exist), quest progression (exists), gratitude system (exists).

---

### 22. Reputation Composting Visibility

**What it is:** Show reputation decay on profiles, framed in regenerative language.

**Display:**
- "Your reputation composts over time, like everything in nature. Active contribution keeps it alive."
- Show current composting rate (Game Variable: default 10% per season)
- Show projected score next season if no new activity
- Visual: gentle fade animation on the LivingTree when reputation is composting

**Depends on:** Reputation system (exists), LivingTree component (exists).

---

### 23. Organization Profiles with Regenerative Reputation

**What it is:** Extend org profiles with community-rated regenerative scores.

**Uses existing:** organisations table, endorsement system.

**New fields on organisations:**
- `regenerativeScore` (computed from community ratings)
- `regenerativeTier` ('regular'|'reputable'|'sustainable'|'regenerative'|'thriving')
- `totalTransactionVolume` (future: tracked when LocalScale integration is live)
- `accountsReferred`
- `communityRatingsCount`

**Rating system:**
- Any Co-Creator+ can rate an organization
- Categories: Soil/Land practices, Biodiversity, Community impact, Transparency, Worker wellbeing
- 1-5 scale per category
- Aggregate = regenerativeScore
- Minimum 5 raters before score is published
- Score affects Harvest multiplier for the org

**Depends on:** Citizenship tiers (#21), organisations table (exists).

---

## GROUP 6: STORYTELLING AND EXPERIENCE

### 24. "Day in the Life" Walkthrough (copy delivered below)

### 25. First-Person SEEDS Origin Story (copy delivered below)

### 26. "Exploitation vs Regeneration" Comparison Visual

**What it is:** Side-by-side visual adapted from SEEDS deck page 100.

**Left side: "The Dominant Economy"**
- Fees extracted at every layer (3-30% per transaction)
- Rewards flow upward (trickle-down)
- Governance by wealth (plutocracy)
- Currency created as debt with interest
- Externalities ignored (pollution, health, community)
- Competition by default

**Right side: "The Economy We're Building"**
- Fee-free transactions (better than free: you earn for participating)
- Rewards flow to contributors (percentile-based, inequality-reversing)
- Governance by contribution (weighted direct democracy)
- Currency created to match real economic activity, no debt
- Regeneration rewarded (food, soil, community, healing)
- Cooperation by design (mature forest model)

**Implementation:** Could be a React component with animated transitions, or a static SVG/illustration. Either way, it belongs on the /economy page prominently.

**Depends on:** /economy page (#6).

---

### 27. (Removed per Rye's feedback - no urgency stats, focus on the good)

---

### 28. Circular Food Economy Diagram

**What it is:** Adapted from SEEDS deck pages 132-133. The P2P food cycle as a visual loop.

**The loop:**
- **Grow Food** (local, regenerative) -> earns contribution points, builds regenerative reputation
- **Prepare Food** (home kitchens, community kitchens, restaurants) -> earns contribution points
- **Eat Food** (local, seasonal, from known producers) -> earns contribution points, send gratitude to producer
- **Compost** (return organic matter to soil) -> earns contribution points
- **Back to Grow** (compost feeds the soil that feeds the food)

Each step labeled with: what you earn (contribution points, gratitude, reputation), what it costs (nothing, fee-free), and how it moves the bioregion toward Go Live.

Center of the loop: "Every step builds your contribution score. Every step is fee-free. Every step moves your bioregion closer to a living food economy."

**Implementation:** React SVG component or illustrated graphic. Placed prominently on /local-food-economy page.

**Depends on:** /local-food-economy page (#7).

---

### 29. "What Money Best Serves You?" Comparison

**What it is:** Adapted from SEEDS deck page 102. Comparison of currency types.

**Columns:** National Currency (USD/EUR), Credit/Debit Cards, Top Crypto (BTC/ETH), Cash, ReGen Tokens

**Rows (pros/cons for each):**
- Transaction fees
- Rewards for use
- Governance voice
- Stability
- Border limitations
- Environmental impact
- Privacy
- Who benefits from growth
- Accessibility
- Learning curve

**Presentation:** Clean comparison table on /economy page. Honest about ReGen token trade-offs (requires internet, network still growing, learning curve). Strong on structural advantages (no fees, rewards for use, direct governance, regenerative by design, stable by protocol).

**Depends on:** /economy page (#6).

---

### 30. Seasonal Harvest Festivals + Calendar Events

**What it is:** Standing community events on the Sunday following every solstice and equinox, 10:00 AM - 12:00 PM EST. Plus: ensure all Game protocols follow solstice/equinox seasons and lunar cycle micro-patterns.

**Calendar events to create (next year):**
- Summer Solstice Festival: Sunday June 21, 2026 -> June 28, 2026 (first Sunday after)
- Fall Equinox Festival: Tuesday Sept 22, 2026 -> Sept 27, 2026 (first Sunday after)
- Winter Solstice Festival: Monday Dec 21, 2026 -> Dec 27, 2026 (first Sunday after)
- Spring Equinox Festival: Saturday Mar 20, 2027 -> Mar 21, 2027 (first Sunday after)

**Seasonal protocol alignment:**
- Seasons table: Each season starts on solstice/equinox date
- Harvest distribution: Triggered at season boundary (solstice/equinox)
- Gratitude budgets: Reset each lunar cycle (new moon to new moon)
- Reputation composting: Applied at season boundary
- Contribution score percentile recalculation: Nightly, but percentile "snapshots" taken at season boundary for Harvest
- All timing references in the UI should use natural language: "This lunar cycle" not "This month," "This season" not "This quarter"

**Quest:** "Organize or attend a Seasonal Harvest Festival in your bioregion." Repeatable each season. Earns contribution points. Document the gathering. Post to forum. Send gratitude to organizers and attendees.

**Depends on:** Events system (exists), seasons table (exists), quest system (exists).

---

## GROUP 7: INTEGRATION AND ECOSYSTEM

### 31. Crowd Pooling as Proto-Reserve Bank

**What it is:** Reframe existing CrowdPooling tool as the social layer of what will become a community reserve bank. Similar to Gitcoin's quadratic funding.

**Current state:** CrowdPooling already lets community members pool resources toward projects.

**Reframe:**
- Add to the CrowdPooling page: "This is how we collectively signal and support the projects we believe in. As our economy grows, this tool evolves into a community-owned reserve: directing shared resources to regenerative initiatives based on collective intelligence."
- Add quadratic-style signaling: small contributions from many people carry more weight than large contributions from few (reduces plutocratic influence)
- Link to /economy for the bigger picture
- Link to Hypha for when it becomes formal on-chain governance

**Depends on:** CrowdPooling page (exists), campaigns table (exists).

---

### 32. Knowledge Map as App/Tool Library

**What it is:** Expand the Knowledge Map to serve as a curated directory of regenerative tools, apps, and resources that could plug into the ReGen Civics ecosystem.

**Categories to add:**
- Regenerative Impact Scoring (standalone apps that measure regenerative practices)
- Local Food Platforms (apps that facilitate food trade, like LocalScale)
- Governance Tools (like Hypha)
- Land Management (tools for tracking soil health, biodiversity, water)
- Community Coordination (event planning, communication, project management)
- Financial Tools (accounting, budgeting for regenerative enterprises)
- Education (courses, guides, certifications in regenerative practice)

**Each entry:** Name, description, link, how it connects to ReGen Civics, community rating (using existing knowledge map voting if available)

**Frame:** "These are tools that strengthen the regenerative ecosystem. Some we integrate with directly (LocalScale, Hypha). Some are standalone and serve your work. Think of this as the app library for the regenerative civilization."

**Depends on:** Knowledge Map (exists, knowledgeMapEntries table).

---

### 33. Invitation Economics Framing on Referral System

**What it is:** Frame the existing referral system in economic terms.

**Add to player profile's referral section:**
- "Every person you invite strengthens the economy for everyone. Here's how: they acquire tokens (increased demand), they plant them (reduced circulating supply), they transact (some tokens burned, reducing total supply). More good contributors means a healthier economy for all of us."
- Show: invitations sent, how many became active, estimated economic impact of your invitations
- Connect to contribution score: invitations that lead to active participants earn contribution points

**Depends on:** Referral system (exists, referrals table), sharing system (exists, shareEvents table).

---

## DELIVERABLES

### Deliverable A: "Day in the Life" Walkthrough (for /economy page)

Maria lives in a small town in the hills outside Oaxaca. She's a Co-Creator.

She wakes up and checks her profile. Last season's Harvest came in: 340 tokens, up from 280 last season. Her contribution score is in the 62nd percentile. She's been doing more since she started the food preservation quest chain.

She walks to the market and buys tamales from Doña Carmen, who sells them for a mix of pesos and ReGen tokens. Carmen is a Steward. She's been accepting tokens since before the bioregion went live. Her regenerative reputation is Thriving, which means she earns a 1.8x multiplier on her Harvest share. Maria sends Carmen 2 gratitude tokens. Carmen has received so much community trust that the gratitude flowing through her carries real weight when she sends it to others.

Back home, Maria checks the proposals. Someone in her bioregion has proposed funding a shared commercial kitchen so more home cooks can participate in the food economy. It has 47 weighted votes. Maria votes yes. Her Co-Creator status gives her 2x voting weight.

She opens the forum. A Steward from Cascadia posted about a soil-building technique that tripled their food forest yield. Maria reads, comments, earns a small contribution for forum engagement.

She finishes the day by completing the "Seasonal Eating" quest entry: documented a week of eating food grown within 50 kilometers. She journals about finding a new source of local honey. The quest completion adds to her contribution score. At this rate, she'll reach Steward by next season.

Her daughter asks what she's doing. "Playing a Game," Maria says. "A real one."

---

### Deliverable B: First-Person SEEDS Origin Story (for /economy "From SEEDS to Here" section)

I need to tell you where this comes from.

In 2016 I had an idea that wouldn't leave me alone. Bitcoin was spending billions of dollars a year on electricity to secure its network. What if we used a more efficient system and spent that money on local food instead? Back a currency by nourishing people rather than burning energy. That's it. That was the seed.

That idea grew into SEEDS. From 2017 to 2023, we built a digital society. Over 10,000 people participated. 160+ organizations aligned around it. We had a passport app, a currency, governance tools, a contribution scoring system, gratitude mechanics, and local food economy pilots happening in several countries. I made a 155-page deck explaining the whole vision. We were trying to build a civilization.

The design worked. The three coordination tools proved out. People governed together. Gratitude flowed. Contribution scores created real incentives. The food economy pilots showed that local producers would absolutely accept a currency that rewarded them instead of extracting from them.

What cracked under the weight wasn't the design. It was the code. Building a blockchain-based economic system required developers, and developers were expensive, slow, and a constant burden on a community that was trying to do something much bigger than write software. Every feature, every rule change, every bug fix required finding a developer, funding them, and waiting. The community was coordinating a new society and kept getting bottlenecked by code.

So we paused. I took everything we learned, every design that worked, every mistake that taught us something, and I started building again. Quietly. Until we had the infrastructure to actually deliver.

Here's what changed: AI-assisted development means we can now build new features, change the Game, and update code in real time based on what the community decides. When a proposal passes to adjust a Harvest ratio or add a new contribution metric, we can implement it. Fast. The bottleneck that broke SEEDS is gone.

That's what you're playing with on this site. The same economic design, refined by a decade of learning, grounded in real land projects and real communities, and finally backed by a delivery pipeline that can keep up.

SEEDS still exists. It's going through its own evolutions in collective and decentralized governance. We're taking a complementary approach here. Two trails toward the same horizon.

And to every developer, designer, facilitator, ambassador, food producer, and community organizer who built SEEDS: come back. Your contributions are the foundation we're standing on, and we want them recognized here. Come claim your legacy tokens. That work mattered, and it still does.

---

### Deliverable C: Proposal Templates Breakdown

(See #19 above for the full 8-template breakdown)

---

## DEPENDENCY MAP

```
Foundation (build first):
  #21 Citizenship Tiers (Explorer/Co-Creator/Steward/Sage)
  #5  Gratitude multiplier mechanics + admin variables

Core Pages (build second):
  #6  /economy page
  #7  /local-food-economy page
  #9  Game Mechanics page (public variables + simulator)

Features that unlock from Core Pages:
  #8  Hook banners (needs /economy as link target)
  #10 Tokenomics Harvest distribution (needs Game Variables)
  #17 Economic Upgrade Suggestions (needs /economy + Game Mechanics)
  #11 Food Producer Map (needs /local-food-economy)
  #12 Food Quest Chain (needs /local-food-economy)
  #28 Circular Food Diagram (needs /local-food-economy)

Governance (build third):
  #16 Proposals system (needs citizenship tiers for weighted voting)
  #19 Proposal templates (needs proposals system)
  #18 BFF governance layer (needs proposals system + bioregions)

Profile & Reputation (can parallelize):
  #2  Surface scores everywhere (needs contribution scores running)
  #3  Contributions dashboard tab (needs contribution data)
  #20 Public reputation scores (needs trust calculation)
  #22 Composting visibility (needs reputation system)
  #23 Org profiles with regenerative reputation (needs endorsement system)

Reframes & Storytelling (can parallelize):
  #1  Marketplace -> Connection Hub + LocalScale
  #4  Governance page reframe
  #15 LocalScale links everywhere
  #24 Day in the Life (copy done, needs /economy page)
  #25 First-person origin story (copy done, needs /economy page)
  #26 Exploitation vs Regeneration visual (needs /economy page)
  #29 Currency comparison (needs /economy page)

Seasonal & Events:
  #30 Harvest Festivals + calendar + lunar/solstice protocols
  #13 Seasonal Eating quest
  #14 Community Regenerative Certification

Ecosystem:
  #31 Crowd Pooling reframe
  #32 Knowledge Map as App Library
  #33 Invitation economics framing
```

---

## GAP ANALYSIS AND FIXES (added 2026-04-01)

Audit of this spec against the actual codebase. Every issue below either needs to be resolved before building, or flagged for Rye to decide.

### RESOLVED: "Steward" Naming Collision

The contribution score tier formerly called "Steward" (70th percentile) is renamed to **"Cultivator"**. The citizenship tier "Steward" keeps the name. Update `getTierFromPercentile()` in game.ts accordingly.

Contribution score tiers (updated): Seedling, Sprout, Sapling, Grower, **Cultivator**, Elder, Guardian.

---

### RESOLVED: Gratitude Budget Stays Per Season (For Now)

Gratitude budgets stay per season using the existing `gratitude_budgets` table. When usage grows, we'll move to per-lunar-cycle budgets.

**lunar_cycles table created now as infrastructure** (used for UI language, future budget cycles, and natural timing references):

lunar_cycles: id, startDate (datetime, astronomical new moon in GMT), endDate (datetime, next new moon in GMT), seasonId (FK to game_seasons), name (nullable, e.g., "Worm Moon"), status ('upcoming' | 'active' | 'completed'), createdAt

New moon dates are astronomical, computed in GMT. We'll seed the next 2 years of lunar cycles from published astronomical data. A scheduled job advances status from upcoming -> active -> completed based on current date.

---

### RESOLVED: Trust Score Formula (all weights as Game Variables)

Trust score is a 0.0 to 2.0 float representing how much the community trusts a player. It starts at 1.0 (neutral) and moves based on 7 inputs, each weighted as a Game Variable.

**Formula:**

trustScore = clamp(1.0 + positiveSignals - negativeSignals, 0.0, 2.0)

Where:

positiveSignals =
  (endorsementsReceived * trust.weight.endorsements_received) +
  (gratitudeReceived * trust.weight.gratitude_received) +
  (vouchesReceived * trust.weight.vouches_received) +
  (forumEngagementScore * trust.weight.forum_engagement) +
  (proposalFollowThrough * trust.weight.proposal_followthrough) +
  (seasonsConsecutivelyActive * trust.weight.consistency)

negativeSignals =
  (flagsReceived * trust.weight.flags_received) +
  (seasonsInactive * trust.weight.inactivity_decay)

**Input definitions:**
- endorsementsReceived: count of endorsements from other players this season
- gratitudeReceived: count of gratitude tokens received this season (overlaps with gratitude trust graph, intentional)
- vouchesReceived: count of active vouches from other players (vouches table, already exists)
- forumEngagementScore: normalized score (0-1) based on posts + replies + reactions received this season, with diminishing returns (first 10 posts count more than next 10)
- proposalFollowThrough: ratio of proposals where the author posted a follow-up update vs. total proposals submitted (0-1). Only applies to players who have submitted proposals.
- seasonsConsecutivelyActive: how many consecutive seasons the player has had at least 1 contribution event
- flagsReceived: count of community flags received this season (from the existing flag system in game.ts)
- seasonsInactive: how many consecutive seasons with zero activity

**Game Variables (all in admin, all visible on Game Mechanics page):**

trust.weight.endorsements_received = 0.03 (per endorsement)
trust.weight.gratitude_received = 0.02 (per gratitude token)
trust.weight.vouches_received = 0.05 (per vouch)
trust.weight.forum_engagement = 0.15 (max contribution from forum at score=1.0)
trust.weight.proposal_followthrough = 0.10 (max contribution at 100% follow-through)
trust.weight.consistency = 0.02 (per consecutive active season)
trust.weight.flags_received = 0.10 (per flag, negative)
trust.weight.inactivity_decay = 0.05 (per inactive season, negative)
trust.composting_rate = 0.10 (percentage of positive trust that composts each season)

**Composting:** At each season boundary, positive trust signals from previous seasons decay by trust.composting_rate (default 10%). This means trust must be actively maintained. A player who stops participating will slowly drift back toward 1.0 (neutral), not stay permanently high.

**Calculation runs:** Nightly as part of the tier check batch job. Updates playerProfiles.trustScore.

**Display:** On player profiles (#20), on Game Mechanics page, in admin. Shows current score, breakdown of contributing factors, and trend arrow vs. last season.

---

### RESOLVED: Harvest Distribution is Design-Only Until "Go Live"

Harvest distribution won't execute until we reach critical mass of organizations, people, and land projects for a "minimum viable economy." For now, the 30/20/20/30 split and all related variables are specced as Game Variables visible in admin and on the Game Mechanics page, but no actual token distribution runs.

**Game Variables to seed (design-only, all visible in admin + Game Mechanics):**

harvest.distribution.contributors_pct = 30
harvest.distribution.bffs_pct = 20
harvest.distribution.organizations_pct = 20
harvest.distribution.treasury_pct = 30
harvest.go_live.min_organizations = 50 (threshold for minimum viable economy)
harvest.go_live.min_active_players = 500
harvest.go_live.min_land_projects = 10
harvest.contributor_share.curve = "linear" (options: linear, logarithmic, quadratic)
harvest.org_qualification.min_regenerative_score = 3.0 (out of 5.0)
harvest.bff_allocation.method = "weighted_by_activity" (options: equal, weighted_by_activity, weighted_by_members)

The actual distribution math (per-player share from percentile, BFF allocation formula, org qualification rules, unclaimed share handling) will be fully specced when we approach Go Live. The Game Mechanics page simulator will let the community model different approaches before we lock anything in.

---

### RESOLVED: Game Simulator Design (v1, will iterate with Rye)

**Approach:** Client-side calculation using anonymized snapshots of real season data. Start simple, evolve based on community feedback.

**Inputs (sliders the player can adjust):**
- Harvest distribution ratios (4 sliders that must sum to 100%)
- Gratitude multiplier per tier (4 sliders)
- Gratitude budget per tier (4 sliders)
- Contribution score weights by capital type (9 sliders)
- Reputation composting rate (1 slider)
- Tier requirement thresholds (contribution percentile per tier)

**Outputs (what changes as you move sliders):**
- Distribution chart: "With these ratios, here's how the Harvest flows" (animated pie/flow)
- Impact preview: "If you're in the 45th percentile, your share would be X tokens" (personalized if logged in)
- Leaderboard shift: "The top 10 contributors' shares would change by +/-X%" (uses anonymized data)
- Incentive map: "These capital types would be rewarded most/least" (bar chart)

**Data source:** Server endpoint exports an anonymized season snapshot (contribution scores, gratitude counts, tier distribution, org scores) as a JSON blob. Cached, updated nightly. No PII. Client-side JS does all the math.

**"Export as Proposal" button:** Packages the current slider configuration + projected outcomes into a pre-filled Economic Upgrade Suggestion form. Includes a text summary: "I simulated changing [variables] and found [outcomes]. I propose we adopt these values because [user fills in rationale]."

This will evolve. We'll iterate on what outputs feel useful once real players start using it.

---

### RESOLVED: Seasonal Council Definition

A Seasonal Council is an internal advisory body that meets every season (at or near the Seasonal Festival) to discuss priorities, review proposals, reflect on the past season, and set direction for the next one.

**Composition:**
- Top 7 players by contribution score (automatic, from leaderboard)
- ReGen Civics core team (Rye + designated core contributors, admin-flagged)
- Elected candidates (community-nominated, voted in through Hypha governance if applicable)

**Tracking in the system:**
- `seasonal_councils` table: id, seasonId, status ('upcoming' | 'active' | 'completed'), meetingDate, notes (text, post-meeting summary), createdAt
- `seasonal_council_members` table: id, councilId, userId, role ('top_contributor' | 'core_team' | 'elected'), attendedAt (nullable, confirmed after meeting)

**Service = attended.** When a council member attends (marked by admin or self-reported), their `attendedAt` is set. This counts toward the Sage requirement "serve on 1+ Seasonal Council."

**This will evolve rapidly.** The first few councils will be informal. The structure here gives us enough to track participation for tier requirements while leaving the actual format flexible.

---

### RESOLVED: Grace Period Demotion

If a player no longer meets the requirements for their tier, they enter a grace period. If they still don't meet requirements after the grace period, they drop one tier level.

**Mechanic:**
- Nightly job checks requirements. If not met, sets a `graceStartedAt` timestamp on playerProfiles.
- If `graceStartedAt` is set and the grace period has elapsed and requirements still aren't met, player is demoted one level.
- Demotion is logged to citizenshipTierHistory with reason 'grace_period_expired'.
- If the player meets requirements again before grace expires, `graceStartedAt` is cleared. No demotion.
- Admin can exempt specific players from demotion (Game Variable or per-player flag).

**Game Variables:**

citizenship.grace_period.seasons = 2 (number of full seasons before demotion)
citizenship.demotion.enabled = true
citizenship.demotion.notify_player = true (send notification when grace starts)
citizenship.demotion.admin_exempt_enabled = true

**Database addition:**
- Add `graceStartedAt` (nullable datetime) to playerProfiles
- Add reason 'grace_period_expired' to citizenshipTierHistory reason enum

---

### RESOLVED: Nightly Batch Job Spec

The nightly job runs all game calculations in a fixed order. Triggered by cron (default 3:00 AM GMT) and also triggerable manually from admin.

**Order of operations:**

1. **Advance lunar cycles.** Check current date against lunar_cycles table. Move completed cycles to 'completed', activate the current one.

2. **Recalculate contribution scores.** For every active player: sum contribution_score_events for the current season, compute raw score, compute percentile rank against all active players. Update playerProfiles.contributionScore, contributionScoreRaw, and currentTier (using the updated Cultivator naming).

3. **Recalculate trust scores.** For every active player: run the trust formula (see trust score section above). Apply composting decay to previous-season signals. Update playerProfiles.trustScore.

4. **Check citizenship tier requirements.** For every active player:
   a. Check if they qualify for a HIGHER tier than they currently hold. If yes, promote. Log to citizenshipTierHistory with reason 'automatic'.
   b. If they don't meet requirements for their CURRENT tier:
      - If graceStartedAt is null, set it to now. Send notification if citizenship.demotion.notify_player is true.
      - If graceStartedAt is set and grace period has elapsed (current date > graceStartedAt + citizenship.grace_period.seasons worth of season durations), demote one tier. Log with reason 'grace_period_expired'. Clear graceStartedAt.
   c. If they DO meet requirements for their current tier and graceStartedAt is set, clear it (grace recovered).

5. **Update gratitude multipliers.** For every active player: compute current gratitude multiplier from citizenship tier base multiplier + trust graph bonus. Update playerProfiles.gratitude_multiplier (computed field).

6. **Log job run.** Write to `batch_job_runs` table: id, jobType ('nightly_game_update'), startedAt, completedAt, status ('success' | 'partial_failure' | 'failed'), promotions (int), demotions (int), errors (JSON array of error messages), triggeredBy ('cron' | 'admin' | userId).

**Edge case handling:**
- Endorsement from a demoted player: Endorsements already given count permanently. The endorser's tier at the time of endorsing is what matters, not their current tier. (Store endorser's tier at endorsement time in game_endorsements.)
- Quest/rite changes: Requirements reference quest completion counts, not specific quest IDs. "Complete 4 seasonal rites" means any 4 from the seasonal rites category, even if specific rites are added or removed.
- Job failure mid-run: Each step is wrapped in try/catch. If a step fails, log the error, mark the job as 'partial_failure', and continue to the next step. Never leave the system in a half-updated state for any individual player (process each player as an atomic unit within each step).

**Admin visibility:**
- Dashboard widget: "Last nightly run: [date/time], [status]. [N] promotions, [N] demotions, [N] errors."
- Click through to see full job history (batch_job_runs table).
- "Run Now" button triggers the job immediately.

**Database addition:**

batch_job_runs: id, jobType (varchar), startedAt (datetime), completedAt (datetime), status (enum), promotions (int default 0), demotions (int default 0), playersProcessed (int default 0), errors (JSON), triggeredBy (varchar), createdAt

---

### MODERATE: localFoodApplications Table Not in Schema

Features #7, #11, and #12 reference `localFoodApplications` but this table doesn't exist in the current schema. It's referenced in DRAFT_GAME_AND_ECONOMY_PAGES.md but was never created.

**Adding to required DB changes:**

localFoodApplications: id, producerName, contactEmail, contactName, bioregionId, location (lat/lng), description, productsOffered (JSON), regenerativePractices (text), websiteUrl (nullable), localScaleProfileUrl (nullable), status ('submitted' | 'under_review' | 'approved' | 'active' | 'declined'), communityRatingsCount (default 0), regenerativeScore (nullable float), createdAt, updatedAt

---

### MINOR: Endorsement System Needs Extension for Regenerative Certification

Feature #14 (Community Regenerative Certification) uses the endorsement system for structured ratings across 6 categories (Soil, Biodiversity, Water, Chemical inputs, Community, Worker wellbeing). The current endorsement system has no rating categories or numeric scores, only a 280-char note field.

**Needs a new table** (don't overload the endorsement table):

organisation_ratings: id, raterId, organisationId, soilScore (1-5), biodiversityScore (1-5), waterScore (1-5), chemicalFreeScore (1-5), communityScore (1-5), workerWellbeingScore (1-5), overallScore (computed average), note (text), seasonId, createdAt

---

### MINOR: Sage "Sponsor" Mechanic Undefined

Sage power includes "can sponsor new Explorer accounts (vouching)." What does this mean mechanically?

**Needs definition:**
- Does sponsoring bypass any Explorer requirements?
- Does it create a link between Sage and Explorer (mentor relationship)?
- Does the Sage's reputation affect the sponsored Explorer?
- Is there a limit on how many Explorers a Sage can sponsor?
- Does this connect to the existing vouches table?

---

### MINOR: "Reputation Score Above 80th Percentile" for Sage is Circular-ish

Sage requires "reputation score above 80th percentile." But reputation/trust score calculation depends on governance participation, which itself depends on having tier-gated access. And the trust score calculation isn't defined (see critical gap above).

This isn't necessarily broken, but the percentile threshold means by definition only 20% of players can ever be Sages (assuming all other requirements are met). That might be intentional. If so, it should be stated explicitly: "By design, Sage is capped at roughly the top 20% of active players by reputation."

---

### RESOLVED: Governance Happens Through Hypha, Not Our Voting System

All actual governance and voting happens through Hypha. Vote weight in Hypha = how much RGVoice you hold. That's it. We don't spec voting weight per tier.

**What this changes in the spec:**
- Feature #16 (Proposals): Our proposals system is a **discussion, formation, and signaling layer**, not a voting system. The "weighted voting" described there is internal signaling only (upvotes with visibility, like FeatureSuggestions). When a proposal reaches enough community signal, it moves to Hypha for actual on-chain governance.
- Remove all "voting weight" references from citizenship tier powers (1x/2x/4x/8x). These don't apply. Governance weight = RGVoice held.
- The proposalVotes table still exists but stores simple signal votes (one person, one upvote), not weighted governance votes.
- Keep the Game Variables for voting weight in case we want internal signaling weight later, but they're dormant for now.

**Updated proposal lifecycle:**
1. Idea (forum discussion)
2. Draft Proposal (structured template)
3. Signal (community upvotes, no weighting)
4. Threshold reached (enough upvotes, Game Variable: proposals.signal_threshold)
5. Moved to Hypha (actual governance vote, weighted by RGVoice)
6. Implementation (if passed)
7. Follow-up (proposer reports back)

---

### VERIFIED: Seasonal Festival Dates Are Correct

The solstice/equinox dates and their "first Sunday after" calculations check out:
- Summer Solstice: June 21, 2026 (Sunday) -> June 28, 2026 (next Sunday)
- Fall Equinox: Sept 22, 2026 (Tuesday) -> Sept 27, 2026
- Winter Solstice: Dec 21, 2026 (Monday) -> Dec 27, 2026
- Spring Equinox: Mar 20, 2027 (Saturday) -> Mar 21, 2027

---

### SUMMARY: ALL GAPS RESOLVED OR DEFERRED

**Database tables to add (full list):**
1. `lunar_cycles` -- astronomical new moon tracking, seeded for 2 years
2. `localFoodApplications` -- food producer applications
3. `organisation_ratings` -- regenerative certification ratings (6 categories, 1-5 scale)
4. `seasonal_councils` -- seasonal council tracking
5. `seasonal_council_members` -- council membership and attendance
6. `batch_job_runs` -- nightly job logging and admin visibility

**Database fields to add to existing tables:**
1. playerProfiles: `citizenshipTier` (enum), `citizenshipTierUpdatedAt`, `graceStartedAt` (nullable), `gratitude_multiplier` (computed), `gratitude_received_previous_season`
2. playerProfiles: `trustScore` already exists but is never updated (now has a formula)
3. proposals: `bioregionId` (nullable, for BFF proposals)
4. game_endorsements: `endorserTierAtTime` (varchar, snapshot of endorser's citizenship tier)
5. organisations: `regenerativeScore`, `regenerativeTier`, `communityRatingsCount`

**Resolved decisions:**
1. Contribution score tier "Steward" renamed to "Cultivator"
2. Gratitude budget stays per season for now; lunar_cycles table built as infrastructure
3. Lunar cycles use astronomical new moon dates in GMT
4. Trust score formula fully defined with 7 inputs and Game Variable weights
5. Harvest distribution is design-only until Go Live (all variables seeded in admin)
6. Game Simulator v1 is client-side with anonymized data snapshots
7. Seasonal Council = top 7 + core team + elected, internal, will evolve
8. Grace period demotion (2 seasons default)
9. Nightly batch job fully specced with 6-step order of operations
10. Governance voting happens through Hypha (RGVoice = vote weight), not our system
11. Proposals system is discussion/formation/signaling only

**Still open (minor, can resolve during build):**
1. Sage "sponsor" mechanic (exact implementation)
2. Sage 80th percentile reputation cap (confirm intentional)

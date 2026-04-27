# Sprint 5: Passport, Delegation, and Governance Handbook

**Date:** 2026-04-10
**Depends on:** Sprint 1-4 complete, `REGEN_GOV_UNIFIED_ARCHITECTURE.md`
**Goal:** The player's passport page (their governance identity), liquid delegation with full transparency, progressive disclosure by citizenship tier, and the living governance handbook. This sprint makes the personal experience of governance feel real and owned.

---

## CRITICAL CONTEXT: Read These Files First

1. Previous sprint files (`REGEN_GOV_SPRINT_1.md` through `REGEN_GOV_SPRINT_4.md`)
2. `CITIZENSHIP_TIERS_SPEC.md` -- the four-tier citizenship system (Explorer, Co-Creator, Steward, Sage)
3. `server/routes/players.ts` -- existing player data procedures
4. `client/src/pages/PlayerProfile.tsx` -- existing profile page patterns
5. `REGEN_GAMES_SPEC_V1.md` -- contribution score system, tier labels (Seedling through Guardian)
6. `drizzle/schema.ts` -- playerProfiles table (citizenshipTier, rvoiceBalance, rgenBalance), governanceDelegations table

---

## What to Build in This Sprint

### 1. Frontend: Passport Page

**Route:** `apps/gov/src/app/passport/page.tsx`

Replace the Sprint 1 placeholder. This is the player's governance identity card.

**Layout (mobile, single column):**

```
[Top bar]

[Identity Card - large GlassCard, hero section]
  [Avatar - 80px circle, centered]
  Player name (large)
  @handle (green, below name)
  [Citizenship Tier Badge - animated, centered below handle]
    Visual tier: Explorer (seedling icon) | Co-Creator (sprout) | Steward (tree) | Sage (forest)
    Badge pulses gently with a green glow
  Contribution score: 847 points (with small breakdown icon)

[Token Balances - row of mini cards]
  [$ReGen: 1,247]  [$RCivics: 340]  [RGVoice: 2.4]  [RCVoice: 1.8]
  Each is a compact pill with token icon + balance
  Tap any to see detail (where it came from, transaction history)

[Governance Activity - GlassCard]
  "Your Governance Activity"
  Votes cast this season: 12
  Proposals created: 2
  Comments made: 24
  Delegations held: 3 players trust you
  Delegating to: @cedar (Salish Sea)

[Credentials Timeline - GlassCard]
  "Your Journey"
  Vertical timeline, oldest at bottom, newest at top:
    ● Voted on "Seed Sharing Guidelines" - 2 days ago
    ● Created proposal "Workshop Budget Q3" - 1 week ago
    ● Reached Co-Creator tier - 2 weeks ago
    ● Completed Governance Quest 3: First Vote - 3 weeks ago
    ● Joined ReGen Civics - 2 months ago
  Timeline dot colors: green for achievements, white for actions

[Delegation Summary - GlassCard]
  "Delegation"
  [Manage Delegations →] link to /passport/delegation
  Current delegations: compact list
    You delegate to: @cedar (Game track, Salish Sea) [Revoke]
    @maple delegates to you (All tracks, Cascadia)
    @fern delegates to you (Fund track, All bioregions)
  Total governance weight: 4.2 (your weight + delegated)

[Notification Preferences - GlassCard]
  "Notifications"
  Toggle switches:
    New proposals in my bioregion: [on/off]
    Proposals entering polling: [on/off]
    Gratitude received: [on/off]
    Delegation changes: [on/off]
    Seasonal milestones: [on/off]
  [Save Preferences] PillButton

[Bottom nav]
```

**Desktop layout:**
- Identity card and token balances in the center column (hero area)
- Governance activity and credentials timeline in center column below
- Delegation summary in the right column
- Notification preferences at the bottom of the right column

### 2. Frontend: Delegation Page

**Route:** `apps/gov/src/app/passport/delegation/page.tsx`

**Layout:**

```
[Back arrow + "Delegation"]

[How Delegation Works - collapsible explainer, open by default on first visit]
  "When you delegate, your governance weight is added to your delegate's
  votes. You can always override by voting directly. Delegations are
  fully transparent: everyone can see who delegates to whom."

[Your Active Delegations - GlassCard]
  List of current delegations, each row:
    Avatar + @handle of delegate
    Scope: "Game track, Salish Sea" or "All tracks, All bioregions"
    Since: date
    [Revoke] red text button

[Delegate Your Votes - GlassCard]
  "Choose a delegate"
  Search input: "Search by name or handle..."
  Search results: list of eligible players (Citizens and above)
    Each result: avatar + name + handle + tier badge + contribution score
  After selecting a player:
    Scope selection:
      Track: [All tracks | Fund only | Game only | Operational only]
      Bioregion: [All bioregions | dropdown of your bioregions]
    [Delegate] PillButton (green)

[Who Delegates to You - GlassCard]
  List of players who have delegated to you, each row:
    Avatar + @handle + scope + since date
  Total weight delegated to you: 2.4

[Delegation Transparency - GlassCard]
  "Delegation Map"
  Visual: simple directed graph showing delegation chains in your bioregion
  Nodes: player avatars (sized by total governance weight)
  Edges: arrows from delegator to delegate
  This doesn't need to be complex. A simple list-based visualization works:
    @cedar (weight: 4.2) ← @maple, @fern, @oak
    @birch (weight: 3.1) ← @elm, @ash
    You (weight: 2.0) ← @maple
  Show the top 10 delegates by weight in the player's bioregion
```

### 3. Server-Side tRPC Procedures

Several of these may already exist in `server/routes/governance.ts`. Check first and reuse.

```typescript
// delegation.getMyDelegations
// Input: {}
// Returns: array of { delegateId, delegateName, delegateHandle, track, bioregionId, bioregionName, createdAt }

// delegation.getDelegationsToMe
// Input: {}
// Returns: array of { delegatorId, delegatorName, delegatorHandle, track, bioregionId, bioregionName, createdAt }

// delegation.createDelegation
// Input: { delegateId, track?, bioregionId? }
// Auth: protectedProcedure (Citizen tier or above)
// Creates a delegation record
// Validates: can't delegate to yourself, can't create duplicate scope delegation
// If a delegation already exists for the same scope, replace it (one delegate per scope)

// delegation.revokeDelegation
// Input: { delegationId }
// Auth: protectedProcedure, must be the delegator
// Deletes the delegation record

// delegation.getDelegationMap
// Input: { bioregionId?: number }
// Returns: top delegates by total weight in the bioregion
// Grouped: delegate -> list of delegators + total weight
// Sorted by total weight DESC

// delegation.getMyGovernanceWeight
// Input: {}
// Returns: { baseWeight: number, delegatedWeight: number, totalWeight: number }
// baseWeight = player's own governance token weight (from rcVoiceWeight or rgVoiceWeight)
// delegatedWeight = sum of weights from all delegators
// totalWeight = base + delegated

// passport.getActivity
// Input: { limit?: number }
// Returns: recent governance actions for the current player
// Combines: votes cast, proposals created, comments made, delegations changed
// Sorted by date DESC

// passport.getCredentials
// Input: {}
// Returns: timeline of governance milestones
// Sources: first vote, first proposal, tier changes, quest completions, notable governance actions
// Each entry: { type, title, date, details }

// passport.updateNotificationPrefs
// Input: { newProposals?, pollingStart?, gratitudeReceived?, delegationChanges?, seasonalMilestones? }
// Auth: protectedProcedure
// Updates govDashboardPrefs.notificationPrefs JSON field
```

### 4. Progressive Disclosure by Citizenship Tier

**This affects ALL pages built so far.** Create a permissions utility and apply it retroactively.

**File:** `apps/gov/src/lib/permissions.ts`

```typescript
type Tier = "visitor" | "explorer" | "co_creator" | "steward" | "sage";

const TIER_LEVEL: Record<Tier, number> = {
  visitor: 0,     // not logged in or no playerProfile
  explorer: 1,    // default tier on signup
  co_creator: 2,
  steward: 3,
  sage: 4,
};

export function canAccess(playerTier: Tier, requiredTier: Tier): boolean {
  return TIER_LEVEL[playerTier] >= TIER_LEVEL[requiredTier];
}

// Feature access map:
// visitor: welcome modal + read-only movement pulse + "Join to participate"
// explorer: home screen + proposals (read-only) + bioregion dashboard
// co_creator: full voting + commenting + proposal creation + economy page
// steward: all above + delegation management + health reporting + power mapping + send to Hypha + tag urgent
// sage: all above + handbook editing + system configuration
```

**Apply progressive disclosure to existing pages:**

- **Home screen (Sprint 1):** Visitors see MovementPulse only. Explorers see the full home screen but attention inbox says "Reach Co-Creator to participate in governance." Co-Creators+ see full inbox with actions.

- **Proposals (Sprint 2):** Explorers can read proposals and comments but cannot vote, comment, or create. Co-Creators can do everything except Steward actions (tag urgent, send to Hypha). Stewards can do everything.

- **Bioregion (Sprint 3):** Explorers see the dashboard read-only. Stewards see the health report form. The "Join this Bioregion" button is available to all tiers.

- **Economy (Sprint 4):** Available to all tiers (transparency). No tier gating on economic data.

- **Passport (this sprint):** Available to all logged-in users. Delegation requires Co-Creator+. The delegation page shows a message for Explorers: "Delegation is available at Co-Creator tier. Complete governance quests to advance."

### 5. Frontend: Governance Handbook Page

**Route:** `apps/gov/src/app/handbook/page.tsx`

The governance handbook is a living document that the community governs. It's stored in `governanceAgreements` table (already in schema) and rendered as markdown.

**Layout:**

```
[Back arrow + "Governance Handbook"]

[Table of Contents - sticky on desktop, collapsible on mobile]
  1. Decision-Making Methods
  2. Financial Agreements
  3. People Agreements
  4. Bioregion Norms
  5. Seasonal Rhythm
  6. Amendment Process

[Handbook content - rendered markdown, full width]
  Each section is a GlassCard
  Section headings are green
  Content is rendered markdown (same renderer as proposal bodies)
  Last updated date + "Version 3, amended by community vote on [date]"

[Version History - collapsible panel]
  "Previous versions"
  List of changes with date, summary, and link to the proposal that changed it
  Each entry: "[date] - [Change summary] - [Proposed by @handle] - [Vote: 18-2]"

[Propose Amendment - sticky bottom bar on mobile]
  [Propose an Amendment] PillButton (gold)
  This navigates to the create proposal page with:
    - Template: "Handbook Amendment"
    - Track: pre-set to "operational"
    - Body pre-filled with: "This proposal amends Section [___] of the Governance Handbook.\n\nCurrent text:\n\nProposed text:\n\nReason for change:"
```

**Handbook content source:** The `governanceAgreements` table. If no agreement rows exist yet, show seed content:

```markdown
# Governance Handbook

This handbook is governed by the community. Every section can be
amended through the proposal process. Propose changes, discuss
them, and vote. The handbook updates when the community decides.

## 1. Decision-Making Methods

We use four methods for different kinds of decisions:

**Consent:** The default. A proposal passes unless someone blocks it.
Blocks must explain why the proposal would cause harm. Used for most
community decisions.

**Advice:** The proposer seeks input before making a personal or team
decision. Non-binding. Used for decisions that primarily affect the
proposer.

**Consensus:** Requires 66% agreement. Used for major structural
changes to governance, economics, or community norms.

**Mandate:** A Steward posts an operational decision with a 48-hour
objection window. Used for time-sensitive operational matters.

## 2. Financial Agreements

[To be filled by community governance]

## 3. People Agreements

[To be filled by community governance]

## 4. Bioregion Norms

[To be filled by community governance]

## 5. Seasonal Rhythm

Each season follows four beats:
- Connect: community gathering, relationship building
- Plan: setting priorities, creating proposals
- Work: executing on agreed plans
- Reflect: harvest festival, reviewing outcomes, gratitude

## 6. Amendment Process

Any Co-Creator or above can propose a handbook amendment. The proposal
goes through the standard governance pipeline: discussion, polling,
staged for season, ratified on Hypha. Once ratified, the handbook
updates automatically.
```

### 6. Component Specs

**CitizenshipBadge.tsx:**
```
- Animated SVG badge, centered, 80px wide
- Tier-specific visual:
  - Explorer: seedling icon, green glow, gentle sway animation
  - Co-Creator: sprout with two leaves, brighter green glow
  - Steward: small tree, gold rim, subtle shimmer
  - Sage: full tree with canopy, gold + green glow, slow breathe animation
- Badge name below icon: "Explorer" / "Co-Creator" / "Steward" / "Sage"
- On tap: shows progress to next tier
  "247 more contribution points to Co-Creator" with a progress bar
```

**ContributionBreakdown.tsx:**
```
- Expandable panel showing score breakdown
- Categories: Quests (X pts), Forum (X pts), Gratitude (X pts), Governance (X pts), Events (X pts)
- Each category: label + score + mini bar showing proportion
- Total at bottom
- Source: playerProfiles contribution data
```

**CredentialsTimeline.tsx:**
```
- Vertical timeline with dots and connecting line
- Dots: green for achievements, white for actions, gold for tier changes
- Each entry: dot + title + date + optional detail
- Newest at top, oldest at bottom
- Scrollable, loads more on "See earlier" tap
```

**DelegationFlow.tsx:**
```
- Search input with debounced search (300ms)
- Results dropdown: list of eligible players
- After selection: scope picker (track dropdown + bioregion dropdown)
- Confirm button
- Success state: "Delegated to @cedar for Game track in Salish Sea"
```

**HandbookRenderer.tsx:**
```
- Takes markdown string, renders with same sanitizer as proposal bodies
- Adds anchor IDs to all headings (for table of contents linking)
- Section styling: each h2 gets a GlassCard wrapper
- Link styling: green underline
- Code blocks: dark bg, monospace font
```

---

## Dependency Audit and Potential Bugs

### Things that could break:

1. **Existing delegation table.** The `governanceDelegations` table already exists in the schema. Check its structure to make sure it has track and bioregion scope fields. If not, create a migration to add them. The delegation system is partially built in the existing governance router.

2. **playerProfiles might not exist for all users.** Some users might have a `users` row but no `playerProfiles` row. The passport page needs to handle this: show a simplified passport with "Complete your profile on regencivics.earth to see your full governance identity."

3. **Governance weight calculation.** rcVoiceWeight and rgVoiceWeight are already on the users table. But the delegation weight needs to be calculated dynamically (sum of delegators' weights). Don't cache this. Compute it on each request for accuracy.

4. **Handbook versioning.** The `governanceAgreements` table may not have version history built in. For Sprint 5, keep it simple: store the current content. Version history is derived from the list of ratified handbook amendment proposals (from govProposals where template = "Handbook Amendment" and status = "ratified").

5. **Progressive disclosure retrofit.** Applying tier-based visibility to all previous sprint pages requires touching Sprint 1-4 code. Do this carefully. The permissions utility should be a single import that wraps components or conditionally renders UI elements. Don't break existing functionality for higher-tier players.

6. **Notification preferences storage.** The `govDashboardPrefs.notificationPrefs` field is JSON. Make sure the Drizzle schema supports JSON column reads and writes. The preferences are per-user and checked when building the attention inbox.

### Things to verify before deploying:

- [ ] Passport page loads for users with and without playerProfiles
- [ ] Citizenship badge shows the correct tier
- [ ] Delegation create/revoke works end-to-end
- [ ] Delegation cascading from Sprint 2 still works correctly with the new delegation management
- [ ] Governance weight calculation is accurate (base + delegated)
- [ ] Progressive disclosure hides the right features for each tier
- [ ] Explorers can read but not act
- [ ] Co-Creators can vote and create proposals
- [ ] Stewards see health report and urgent tag options
- [ ] Handbook renders seed content when no agreements exist
- [ ] "Propose Amendment" pre-fills the proposal template correctly
- [ ] Notification preferences save and load correctly

---

## Done Criteria

Sprint 5 is done when:

1. The passport page shows the player's full governance identity (avatar, name, tier, scores, balances)
2. The citizenship badge is animated and tier-appropriate
3. Token balances ($ReGen, $RCivics, RGVoice, RCVoice) display correctly
4. Governance activity summary shows real counts (votes, proposals, comments)
5. The credentials timeline shows real milestones from the player's history
6. The delegation page lets Co-Creators+ create and revoke delegations with scope
7. The delegation map shows top delegates in the bioregion
8. Progressive disclosure is applied to all pages (Sprint 1-5)
9. Explorers see read-only views with clear messaging about how to advance
10. The governance handbook renders (seed content or stored agreements)
11. "Propose Amendment" creates a pre-filled proposal
12. Notification preferences save to the database

---

## Writing Rules Reminder

All user-facing text must follow the project writing rules:
- No em-dashes (zero, not "use sparingly")
- No contrast-framing ("This is not X, this is Y")
- No AI word patterns (delve, tapestry, foster, leverage, etc.)
- No rhetorical question openers
- No passive inspiration ("Join us on this journey")
- Voice: direct, grounded, specific. First person fine. Contractions fine.

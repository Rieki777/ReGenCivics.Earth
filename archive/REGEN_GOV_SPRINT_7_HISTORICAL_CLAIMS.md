# Sprint 7: Historical Contribution Claim Flow

**Date:** 2026-04-10
**Depends on:** Sprint 1 complete (auth, layout, API client), `HISTORICAL_CONTRIBUTION_RECOGNITION_SPEC.md`, `REGEN_GOV_UNIFIED_ARCHITECTURE.md`
**Goal:** Build the full Historical Contribution Claim Flow on the `/game` page of gov.regencivics.earth. A 14-screen guided conversation that onboards contributors, determines their tier, surfaces their tools and resources, routes them into the network, and prepares them for a Proposal Party. Also: admin review interface, Contributors page, and forum/Tools Library integration hooks.

---

## CRITICAL CONTEXT: Read These Files First

1. `HISTORICAL_CONTRIBUTION_RECOGNITION_SPEC.md` -- **the full spec.** Every screen, every tier, every routing rule, every design decision. This is your single source of truth.
2. `REGEN_GOV_SPRINT_1.md` -- what was built in Sprint 1 (Privy auth, layout, DesktopSidebar, MobileNav, API client, GlassCard, PillButton)
3. `REGEN_GOV_SPRINT_2.md` -- proposal system patterns. The claim flow shares some DNA with proposal creation (multi-step forms, status lifecycle, admin/community review).
4. `drizzle/schema.ts` -- existing tables. You'll add new tables alongside them.
5. `CONTEXT_THE_TWO_GAMES.md` -- Fund vs Game distinction. Historical contributions mint $ReGen (Game token).
6. `apps/gov/src/lib/auth.ts` -- existing auth hook patterns
7. `apps/gov/src/lib/api.ts` -- existing API client patterns
8. `apps/gov/src/components/GlassCard.tsx` -- card component to reuse
9. `apps/gov/src/components/PillButton.tsx` -- button component to reuse

---

## Architecture Decisions

### 1. The claim flow is a single-page stepper, not 14 separate routes.

Build it as `/game/claim` with a React state machine that moves through screens 1-14. Each screen is its own component. The URL stays at `/game/claim` but a `?step=N` query param tracks position for back-button support and resume. Progress is saved to the database after each screen so contributors can leave and come back.

### 2. The `/game` page is the entry point.

`/game` shows:
- Hero section with the "Claim Your Contributions" CTA button (links to `/game/claim`)
- Brief explanation of what the claim flow is and what happens after
- Timeline: claim window open now through September equinox, Proposal Parties start June Solstice
- Link to the Contributors page (`/game/contributors`) -- initially shows "First Proposal Party at the June Solstice" empty state
- Calendar subscribe link for Proposal Party schedule

### 3. Claims have a status lifecycle.

```
draft -> submitted -> under_review -> approved -> ratified -> published
```

- **draft**: Contributor is still filling out the form (saved in progress)
- **submitted**: Contributor completed Screen 14 and saved
- **under_review**: Admin has started reviewing
- **approved**: Admin confirmed the tier (or adjusted)
- **ratified**: Confirmed at a Proposal Party
- **published**: Live on the Contributors page

### 4. The tier suggestion algorithm runs client-side.

The rubric scoring from the spec runs in the browser as the contributor answers Screens 4-7. By Screen 11, the suggestion is ready. The algorithm is simple averaging -- no server call needed. The final suggestion is sent to the server when the claim is submitted.

### 5. Admin review is built for Seasons 1-2.

The review interface is at `/game/admin/review`. It shows all submitted claims with the system's tier suggestion, the contributor's self-assessment, all answers, and evidence links. Admin can confirm, adjust (with reason), or flag for conversation. Community review (Season 3+) can be layered on later with the same interface, just different access controls.

---

## Database Migration: `drizzle/0117_historical_claims.sql`

```sql
-- Historical Contribution Claims
CREATE TABLE IF NOT EXISTS historicalClaims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Identity
  userId INT NOT NULL,
  claimType ENUM('individual', 'organization') NOT NULL,
  displayName VARCHAR(255) NOT NULL,
  orgDescription TEXT,
  
  -- Screen 4: Forms of Capital (JSON array of selected forms + one-line examples)
  formsOfCapital JSON NOT NULL DEFAULT '[]',
  -- Example: [{"form": "intellectual", "example": "Built a soil carbon measurement tool"}, {"form": "social", "example": "15 years facilitating community circles"}]
  
  -- Screen 5: Duration
  duration ENUM('under_1_year', '1_3_years', '3_5_years', '5_10_years', '10_plus_years') NOT NULL,
  
  -- Screen 6: Reach
  reach VARCHAR(50) NOT NULL,
  -- Individual: "under_50", "50_200", "200_1000", "1000_plus", "generational"
  -- Org: "under_500", "500_5000", "5000_plus"
  
  -- Screen 7: Tangible outputs (JSON array of outputs with names and descriptions)
  tangibleOutputs JSON NOT NULL DEFAULT '[]',
  -- Example: [{"type": "tool_software", "name": "SoilScope", "description": "Open-source soil carbon measurement platform"}]
  
  -- Screen 8: Free text description
  description TEXT NOT NULL,
  
  -- Screen 9: Evidence links (JSON array of URLs)
  evidenceLinks JSON NOT NULL DEFAULT '[]',
  
  -- Screen 10: What's alive
  whatsAlive TEXT,
  
  -- Tier
  suggestedTier VARCHAR(50) NOT NULL,
  -- Individual: "seed", "sprout", "sapling", "grove", "old_growth"
  -- Org: "roots", "canopy", "mycelium"
  suggestedTierUsd INT NOT NULL, -- e.g. 750, 3500, 15000, 50000, 150000
  suggestedTierTokens BIGINT NOT NULL, -- e.g. 75000, 350000, 1500000, 5000000, 15000000
  contributorOverride ENUM('accept', 'higher', 'lower') DEFAULT 'accept',
  overrideReason TEXT,
  
  -- Routing (computed from Screen 4 + 7)
  routeToToolsLibrary BOOLEAN DEFAULT FALSE,
  routeToLocalScale BOOLEAN DEFAULT FALSE,
  routeToGovernance BOOLEAN DEFAULT FALSE,
  routeToMentoring BOOLEAN DEFAULT FALSE,
  routeToFundPathway BOOLEAN DEFAULT FALSE,
  
  -- Status lifecycle
  status ENUM('draft', 'submitted', 'under_review', 'approved', 'adjusted', 'flagged', 'ratified', 'published') NOT NULL DEFAULT 'draft',
  currentStep INT NOT NULL DEFAULT 1, -- for resume support (1-14)
  
  -- Review (Admin in Seasons 1-2)
  reviewerId INT,
  reviewedAt DATETIME,
  reviewDecision ENUM('confirmed', 'adjusted', 'flagged'),
  reviewNote TEXT,
  adjustedTier VARCHAR(50),
  adjustedTierUsd INT,
  adjustedTierTokens BIGINT,
  
  -- Final (after Proposal Party)
  finalTier VARCHAR(50),
  finalTierUsd INT,
  finalTierTokens BIGINT,
  ratifiedAt DATETIME,
  proposalPartyId INT,
  
  -- Meta-game: Screen 13 improvement suggestion
  improvementSuggestion TEXT,
  improvementPostedToForum BOOLEAN DEFAULT FALSE,
  improvementForumPostId INT,
  
  -- Timestamps
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  submittedAt DATETIME,
  publishedAt DATETIME,
  
  FOREIGN KEY (userId) REFERENCES users(id),
  INDEX idx_claims_status (status),
  INDEX idx_claims_user (userId),
  INDEX idx_claims_type (claimType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tools Library entries generated from claims
CREATE TABLE IF NOT EXISTS toolsLibraryEntries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  claimId INT NOT NULL,
  contributorUserId INT NOT NULL,
  
  toolName VARCHAR(255) NOT NULL,
  toolDescription TEXT NOT NULL,
  toolType ENUM('tool_software', 'curriculum_course', 'methodology_framework', 'templates_guides', 'physical_space', 'network_community', 'publications_research', 'art_media', 'financial_infrastructure', 'other') NOT NULL,
  capitalForm VARCHAR(50), -- which of the 8 forms of capital this maps to
  accessLink TEXT,
  usageNotes TEXT,
  
  status ENUM('pending', 'published') NOT NULL DEFAULT 'pending',
  
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (claimId) REFERENCES historicalClaims(id),
  FOREIGN KEY (contributorUserId) REFERENCES users(id),
  INDEX idx_tools_status (status),
  INDEX idx_tools_contributor (contributorUserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Proposal Parties
CREATE TABLE IF NOT EXISTS proposalParties (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  scheduledAt DATETIME NOT NULL,
  season INT NOT NULL DEFAULT 1,
  videoLink TEXT,
  recordingLink TEXT,
  status ENUM('scheduled', 'in_progress', 'completed') NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Drizzle schema additions (in `drizzle/schema.ts`)

Add the corresponding Drizzle table definitions matching the SQL above. Follow the patterns already in `schema.ts` for enums, JSON columns, and foreign keys.

---

## tRPC Procedures

Add these to the existing governance tRPC router or create a new `claims` router.

### Claims

**`getClaimDraft`** -- Get the current user's in-progress claim (if any). Returns the draft with all saved answers so the stepper can resume at `currentStep`.

**`saveClaimStep`** -- Save one screen's worth of answers. Takes `{ step: number, data: Record<string, any> }`. Updates the draft and increments `currentStep`. Upserts (creates on first call, updates on subsequent). This is the main "save as you go" endpoint.

**`submitClaim`** -- Mark the claim as `submitted`. Sets `submittedAt`. Validates all required fields are filled. If the contributor entered an improvement suggestion (Screen 13), this endpoint also creates the forum post via the existing forum tRPC procedures (post to Air > Onboarding Games > Historical Contribution Accounting).

**`getMyClaimStatus`** -- Returns the current user's claim status, review feedback (if any), and Proposal Party invitation details.

**`listClaims`** (admin) -- List all claims, filterable by status. Used by the admin review interface. Requires admin role.

**`reviewClaim`** (admin) -- Admin submits a review decision: `{ claimId, decision: 'confirmed' | 'adjusted' | 'flagged', note?, adjustedTier?, adjustedTierUsd?, adjustedTierTokens? }`.

**`ratifyClaim`** (admin) -- Mark a claim as ratified after a Proposal Party. Sets `finalTier`, `ratifiedAt`, `proposalPartyId`.

**`publishClaim`** (admin) -- Publish a ratified claim to the Contributors page. Sets `publishedAt`, flips status to `published`. Also publishes any pending toolsLibraryEntries from this claim.

### Tools Library

**`listToolsLibraryEntries`** -- Public. List all published tools with contributor attribution. Filterable by `capitalForm` and `toolType`.

**`getToolEntry`** -- Public. Single tool detail with contributor info.

### Contributors

**`listContributors`** -- Public. List all published contributors with tier badges, story excerpts, and "what I'm bringing forward" statements. Filterable by tier, claim type, capital forms.

**`getContributor`** -- Public. Full contributor profile: story, tier, capital forms, tools contributed, Proposal Party recording link.

### Proposal Parties

**`listProposalParties`** -- Public. Upcoming and past parties.

**`createProposalParty`** (admin) -- Schedule a new party.

---

## Tier Suggestion Algorithm

This runs client-side in a utility function. It takes the answers from Screens 4-7 and computes a suggested tier.

### `lib/tierSuggestion.ts`

```typescript
type ClaimType = 'individual' | 'organization';

interface TierSuggestion {
  tier: string;
  tierLabel: string;
  usdValue: number;
  tokenAmount: number;
  aboveTier: boolean; // true if answers suggest Fund pathway
}

// Duration score (Screen 5)
const durationScores: Record<string, number> = {
  under_1_year: 1,
  '1_3_years': 2,
  '3_5_years': 3,
  '5_10_years': 4,
  '10_plus_years': 5,
};

// Reach scores (Screen 6)
const individualReachScores: Record<string, number> = {
  under_50: 1,
  '50_200': 2,
  '200_1000': 3,
  '1000_plus': 4,
  generational: 5,
};

const orgReachScores: Record<string, number> = {
  under_500: 1,
  '500_5000': 2,
  '5000_plus': 3,
};

// Output depth score (Screen 7) -- count of tangible outputs
function outputScore(outputs: any[], claimType: ClaimType): number {
  const count = outputs.length;
  if (claimType === 'organization') {
    if (count === 0) return 1;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    return 3;
  }
  // individual
  if (count === 0) return 1;
  if (count === 1) return 2;
  if (count <= 3) return 3;
  if (count <= 5) return 4;
  return 5;
}

// Capital breadth score (Screen 4) -- number of distinct forms of capital
function capitalBreadthScore(forms: any[], claimType: ClaimType): number {
  const count = forms.length;
  if (claimType === 'organization') {
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    return 3;
  }
  if (count <= 1) return 1;
  if (count <= 2) return 2;
  if (count <= 4) return 3;
  if (count <= 6) return 4;
  return 5;
}

const individualTiers = [
  { tier: 'seed', label: 'Seed', usd: 750, tokens: 75_000 },
  { tier: 'sprout', label: 'Sprout', usd: 3_500, tokens: 350_000 },
  { tier: 'sapling', label: 'Sapling', usd: 15_000, tokens: 1_500_000 },
  { tier: 'grove', label: 'Grove', usd: 50_000, tokens: 5_000_000 },
  { tier: 'old_growth', label: 'Old Growth', usd: 150_000, tokens: 15_000_000 },
];

const orgTiers = [
  { tier: 'roots', label: 'Roots', usd: 20_000, tokens: 2_000_000 },
  { tier: 'canopy', label: 'Canopy', usd: 200_000, tokens: 20_000_000 },
  { tier: 'mycelium', label: 'Mycelium', usd: 1_000_000, tokens: 100_000_000 },
];

export function suggestTier(
  claimType: ClaimType,
  formsOfCapital: any[],
  duration: string,
  reach: string,
  tangibleOutputs: any[]
): TierSuggestion {
  const tiers = claimType === 'individual' ? individualTiers : orgTiers;
  const maxScore = claimType === 'individual' ? 5 : 3;

  const scores = [
    capitalBreadthScore(formsOfCapital, claimType),
    durationScores[duration] ?? 1,
    claimType === 'individual'
      ? (individualReachScores[reach] ?? 1)
      : (orgReachScores[reach] ?? 1),
    outputScore(tangibleOutputs, claimType),
  ];

  // For orgs, cap duration and output scores at 3
  const cappedScores = claimType === 'organization'
    ? scores.map(s => Math.min(s, 3))
    : scores;

  const avg = cappedScores.reduce((a, b) => a + b, 0) / cappedScores.length;
  const tierIndex = Math.min(Math.round(avg) - 1, tiers.length - 1);
  const clampedIndex = Math.max(0, tierIndex);
  const selected = tiers[clampedIndex];

  // Detect above-tier: if avg exceeds max score (all maxed out) and claim type is individual
  const aboveTier = avg >= maxScore && claimType === 'individual' && clampedIndex === tiers.length - 1;

  return {
    tier: selected.tier,
    tierLabel: selected.label,
    usdValue: selected.usd,
    tokenAmount: selected.tokens,
    aboveTier,
  };
}
```

---

## Page and Component Specs

### Route: `/game` -- `apps/gov/src/app/game/page.tsx`

The entry point. Layout:

- **Hero section**: "Show Us What You've Got" headline. Subheadline from the spec's "What this is" section. Large "Claim Your Contributions" PillButton linking to `/game/claim`.
- **Timeline bar**: Visual showing "Claims open now" -> "Proposal Parties begin June Solstice" -> "Claim window closes September equinox"
- **How it works**: 3-step summary (Answer questions -> Get your tier -> Present at a Proposal Party)
- **Contributors section**: Grid of published contributor cards (empty state: "The first Proposal Parties start at the June Solstice. Claim your contributions now and we'll notify you when the parties begin.")
- **Calendar CTA**: "Add our calendar to know when the first Proposal Parties are scheduled" with subscribe link

### Route: `/game/claim` -- `apps/gov/src/app/game/claim/page.tsx`

The 14-screen stepper. Requires auth (redirect to Privy login if not authenticated).

**Stepper component**: `ClaimFlowStepper.tsx`
- Manages current step state (synced with `?step=N` query param)
- Renders the active screen component
- Shows progress indicator (dots or bar, 14 steps)
- Handles save-on-step-change (calls `saveClaimStep` before advancing)
- Handles resume (on mount, calls `getClaimDraft` and jumps to `currentStep`)

**Screen components** (one per screen, all in `apps/gov/src/components/claim/`):

| Component | Screen | Key UI |
|---|---|---|
| `WelcomeScreen.tsx` | 1 | Welcome text, "Let's go" PillButton |
| `ClaimTypeScreen.tsx` | 2 | Two large cards: Individual / Organization |
| `NameScreen.tsx` | 3 | Text input (name/handle or org name + description) |
| `CapitalFormsScreen.tsx` | 4 | 8 checkboxes with descriptions. Each selected form reveals a text input for one-line example. |
| `DurationScreen.tsx` | 5 | 5 duration options as PillButtons |
| `ReachScreen.tsx` | 6 | Reach options (different for individual vs org) as PillButtons |
| `TangibleOutputsScreen.tsx` | 7 | Multi-select checkboxes. Each selection reveals name + description inputs. "Skip the rest" option if 3+ selected. |
| `StoryScreen.tsx` | 8 | Textarea, no word count requirement. Warm prompt text. |
| `EvidenceScreen.tsx` | 9 | Multi-input for links. "Totally optional" framing. Add/remove link fields. |
| `WhatsAliveScreen.tsx` | 10 | Single text input. |
| `TierSuggestionScreen.tsx` | 11 | Runs `suggestTier()`, displays result with tier name, description, USD value, token amount. Accept/Higher/Lower buttons. Higher reveals textarea. **Above-tier variant**: if `aboveTier` is true, shows the organization/Fund pathway message from the spec. |
| `RoutingScreen.tsx` | 12 | Conditional sections based on capital forms and outputs. Shows personalized next steps. |
| `ImprovementScreen.tsx` | 13 | Textarea for suggestions. "Submit idea to the forum" / "Skip for now" buttons. |
| `InvitationScreen.tsx` | 14 | Proposal Party invitation. June Solstice date. Calendar subscribe link. "Save my claim" / "Add calendar" / "Edit something first" buttons. |

### Route: `/game/contributors` -- `apps/gov/src/app/game/contributors/page.tsx`

Public page showing all published contributors.

**ContributorCard.tsx**: GlassCard with name, tier badge, story excerpt (first 2 sentences of description), capital forms as colored chips, "What I'm bringing forward" statement.

**ContributorProfile.tsx** (modal or expand): Full story, all capital forms with examples, tools contributed (linked to Tools Library entries), evidence links, Proposal Party recording link, tier badge with USD/token amount.

**Filters**: By tier, by claim type (individual/org), by capital form.

**Empty state**: "The first Proposal Parties start at the June Solstice. Contributors will appear here after they present and are recognized. Claim your contributions now."

### Route: `/game/admin/review` -- `apps/gov/src/app/game/admin/review/page.tsx`

Admin-only. Requires admin role check.

**ClaimReviewList.tsx**: Table/card list of all claims by status. Columns: name, claim type, suggested tier, status, submitted date, action buttons.

**ClaimReviewDetail.tsx**: Full view of one claim with all answers displayed, system tier suggestion highlighted, contributor's override (if any) shown. Action buttons: Confirm / Adjust (opens tier selector + reason field) / Flag (opens reason field).

---

## Sidebar Navigation Update

Add "Game" to the DesktopSidebar and MobileNav. It should sit between "Home" and "Proposals" in the nav order. Use a game/play icon (Gamepad2 from lucide-react or similar).

Sub-items (visible when on /game routes):
- Claim Your Contributions (`/game/claim`)
- Contributors (`/game/contributors`)
- Admin Review (`/game/admin/review`) -- only visible to admin users

---

## Forum Integration

When a claim is submitted with an improvement suggestion (Screen 13), the `submitClaim` procedure creates a forum post using the existing forum tRPC procedures. The post goes to the category **Air > Onboarding Games > Historical Contribution Accounting**.

Pre-formatted post:
```
Title: "[Improvement Idea] {summary of first 60 chars of suggestion}"
Body:
"Submitted by {displayName} ({tierLabel} tier) during their contribution claim.

{full suggestion text}

---
This idea was submitted through the Historical Contribution Claim Flow. If you think this would make the process better, build on it here. The best ideas become governance proposals.

Tag: Process Improvement"
```

If the forum category "Onboarding Games" under "Air" doesn't exist yet, create it as part of this sprint's seed data. Similarly, create the initial thread "Historical Contribution Accounting" as a pinned post explaining the purpose of this thread.

---

## Tools Library Integration

When a claim is submitted, each tangible output from Screen 7 that has a name and description creates a `toolsLibraryEntries` row with status `pending`. When the claim is published (after Proposal Party), all its tool entries flip to `published`.

The main site's existing Tools section should query `toolsLibraryEntries` with `status = 'published'`. If the main site's tools section uses a different data source currently, add the claim-generated entries alongside existing ones.

---

## Styling Notes

- Follow the existing gov app visual language: GlassCard for containers, PillButton for actions, the theme from `lib/theme.ts`
- The claim flow should feel warm and welcoming, not bureaucratic. Generous whitespace, friendly prompt text, one question per screen
- Progress indicator: subtle dots at the top of the stepper, not a heavy progress bar
- Tier badge colors (reuse across the app):
  - Seed: `#8BC34A` (light green)
  - Sprout: `#4CAF50` (green)
  - Sapling: `#2E7D32` (forest green)
  - Grove: `#1B5E20` (deep green)
  - Old Growth: `#004D40` (ancient teal)
  - Roots: `#795548` (earth brown)
  - Canopy: `#33691E` (canopy green)
  - Mycelium: `#311B92` (deep purple/underground)

---

## Testing Checklist

Before marking this sprint complete:

- [ ] `/game` page renders with hero, timeline, CTA, empty contributors section
- [ ] `/game/claim` requires auth, redirects to Privy login if not signed in
- [ ] Claim flow progresses through all 14 screens
- [ ] Answers are saved to database after each screen (test by refreshing mid-flow and resuming)
- [ ] Tier suggestion algorithm produces correct tiers for test cases:
  - Individual, 1 capital form, under 1 year, under 50 reach, 0 outputs = Seed
  - Individual, 4 forms, 5-10 years, 1000+ reach, 4 outputs = Grove
  - Individual, all maxed = Old Growth (check aboveTier flag)
  - Organization, 2 forms, 3-5 years, 500-5000, 3 outputs = Canopy
- [ ] Above-tier detection shows Fund pathway message for maxed-out individuals
- [ ] Screen 12 routing shows correct sections based on capital forms
- [ ] Screen 13 improvement suggestion auto-posts to forum when submitted
- [ ] Claim submission creates `toolsLibraryEntries` rows for Screen 7 outputs
- [ ] Admin review interface shows all submitted claims
- [ ] Admin can confirm, adjust (with reason), and flag claims
- [ ] `/game/contributors` shows published contributors (test with manually published test data)
- [ ] Contributor cards show tier badge, story excerpt, capital forms
- [ ] Sidebar navigation includes Game section
- [ ] Mobile nav works for all /game routes
- [ ] All pages pass Lighthouse accessibility audit (90+)
- [ ] All pages have appropriate loading/skeleton states and error states

---

## Files to Create

```
apps/gov/src/app/game/page.tsx
apps/gov/src/app/game/claim/page.tsx
apps/gov/src/app/game/contributors/page.tsx
apps/gov/src/app/game/contributors/[id]/page.tsx
apps/gov/src/app/game/admin/review/page.tsx
apps/gov/src/app/game/admin/review/[id]/page.tsx
apps/gov/src/components/claim/WelcomeScreen.tsx
apps/gov/src/components/claim/ClaimTypeScreen.tsx
apps/gov/src/components/claim/NameScreen.tsx
apps/gov/src/components/claim/CapitalFormsScreen.tsx
apps/gov/src/components/claim/DurationScreen.tsx
apps/gov/src/components/claim/ReachScreen.tsx
apps/gov/src/components/claim/TangibleOutputsScreen.tsx
apps/gov/src/components/claim/StoryScreen.tsx
apps/gov/src/components/claim/EvidenceScreen.tsx
apps/gov/src/components/claim/WhatsAliveScreen.tsx
apps/gov/src/components/claim/TierSuggestionScreen.tsx
apps/gov/src/components/claim/RoutingScreen.tsx
apps/gov/src/components/claim/ImprovementScreen.tsx
apps/gov/src/components/claim/InvitationScreen.tsx
apps/gov/src/components/claim/ClaimFlowStepper.tsx
apps/gov/src/components/claim/ProgressDots.tsx
apps/gov/src/components/ContributorCard.tsx
apps/gov/src/components/ContributorProfile.tsx
apps/gov/src/components/TierBadge.tsx
apps/gov/src/components/CapitalFormChip.tsx
apps/gov/src/components/claim/ClaimReviewList.tsx
apps/gov/src/components/claim/ClaimReviewDetail.tsx
apps/gov/src/lib/tierSuggestion.ts
apps/gov/src/lib/tierConfig.ts
drizzle/0117_historical_claims.sql
```

## Files to Modify

```
apps/gov/src/components/DesktopSidebar.tsx  -- add Game nav item
apps/gov/src/components/MobileNav.tsx       -- add Game nav item
drizzle/schema.ts                           -- add new table definitions
server/routes/governance.ts (or new claims router) -- add tRPC procedures
```

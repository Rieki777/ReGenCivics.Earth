# Sprint 3: Bioregion Dashboard and Doughnut Economics Visualization

**Date:** 2026-04-10
**Depends on:** Sprint 1 + Sprint 2 complete, `REGEN_GOV_UNIFIED_ARCHITECTURE.md`
**Goal:** Each bioregion gets a living dashboard with health metrics visualized as a doughnut economics diagram, land project status, local governance, and member directory. The bioregion becomes a real place in the app, not just a tag.

---

## CRITICAL CONTEXT: Read These Files First

1. `REGEN_GOV_SPRINT_1.md` and `REGEN_GOV_SPRINT_2.md` -- what was built in previous sprints
2. `client/src/components/BioregionSelect.tsx` -- existing bioregion data structures and patterns
3. `REGEN_GAMES_SPEC_V1.md` -- game variables for contribution scores and tier thresholds
4. `LIVING_TREE_VISUALIZATION_SPEC.md` -- SVG visualization patterns and animation approach
5. `drizzle/schema.ts` -- existing bioregions table structure
6. `CONTEXT_THE_TWO_GAMES.md` -- Fund vs Game distinction (bioregions participate in both)

## What the Doughnut Visualization Is

Kate Raworth's Doughnut Economics model: a safe operating space for humanity between a social foundation (below which people fall short) and an ecological ceiling (above which we overshoot planetary boundaries). We adapt this to the bioregion scale.

The visualization is two concentric rings:

**Inner ring (social foundation):** Five dimensions where human needs must be met.
- Food security: local food production, access to fresh food, food sovereignty
- Education: regenerative learning access, skill sharing, youth engagement
- Health: healthcare access, mental health support, community wellness
- Housing: affordable housing, land access, shelter security
- Community: social cohesion, gathering spaces, cultural activity

**Outer ring (ecological ceiling):** Five dimensions where ecological limits must be respected.
- Soil health: organic matter %, erosion rates, mycorrhizal network density
- Water quality: watershed health, aquifer levels, contamination metrics
- Biodiversity: species counts, habitat connectivity, pollinator health
- Carbon: sequestration rates, emission reduction, forest cover
- Land use: regenerative vs extractive acreage, conservation easements

Each dimension scores 0-100. The doughnut is the "safe and just space" between the two rings. Segments that are red indicate either social shortfall or ecological overshoot. Green means healthy. Yellow means watch.

---

## What to Build in This Sprint

### 1. Database Migration

Create `drizzle/0114_bioregion_health.sql`:

```sql
CREATE TABLE IF NOT EXISTS bioregionHealthMetrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bioregionId INT NOT NULL,
  seasonId INT DEFAULT NULL,
  -- Social foundation (0-100 each)
  foodSecurityScore TINYINT UNSIGNED DEFAULT NULL,
  educationScore TINYINT UNSIGNED DEFAULT NULL,
  healthScore TINYINT UNSIGNED DEFAULT NULL,
  housingScore TINYINT UNSIGNED DEFAULT NULL,
  communityScore TINYINT UNSIGNED DEFAULT NULL,
  -- Ecological ceiling (0-100 each)
  soilHealthScore TINYINT UNSIGNED DEFAULT NULL,
  waterQualityScore TINYINT UNSIGNED DEFAULT NULL,
  biodiversityScore TINYINT UNSIGNED DEFAULT NULL,
  carbonScore TINYINT UNSIGNED DEFAULT NULL,
  landUseScore TINYINT UNSIGNED DEFAULT NULL,
  -- Notes and attribution
  notes TEXT,
  reportedBy INT DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bioregionId) REFERENCES bioregions(id),
  FOREIGN KEY (reportedBy) REFERENCES users(id),
  UNIQUE KEY uniq_bioregion_season (bioregionId, seasonId),
  INDEX idx_bioregion (bioregionId)
);

-- Seed an example for development
-- INSERT INTO bioregionHealthMetrics (bioregionId, seasonId, foodSecurityScore, educationScore, healthScore, housingScore, communityScore, soilHealthScore, waterQualityScore, biodiversityScore, carbonScore, landUseScore, notes)
-- VALUES (1, 1, 65, 72, 58, 45, 80, 70, 62, 55, 48, 73, 'Initial assessment for Spring 2026');
```

### 2. Server-Side tRPC Procedures

Add to the governance or bioregion router:

```typescript
// bioregion.getHealthMetrics
// Input: { bioregionId: number, seasonId?: number }
// Returns: latest health metrics for the bioregion
// If seasonId provided, returns that season's data. Otherwise latest.
// Also returns a computed composite score (average of all 10 dimensions)

// bioregion.getHealthHistory
// Input: { bioregionId: number, limit?: number }
// Returns: array of health metrics across seasons, for trend visualization
// Sorted by seasonId DESC

// bioregion.submitHealthReport
// Input: { bioregionId, seasonId, foodSecurityScore, educationScore, ... all 10 scores, notes }
// Auth: Steward of this bioregion only
// Creates or updates the health metrics for the given season
// Validates all scores are 0-100

// bioregion.getMembers
// Input: { bioregionId: number, limit?: number, offset?: number }
// Returns: paginated list of users in this bioregion
// Includes: name, handle, avatar, citizenshipTier, contributionScore
// Sort: Stewards first, then by contributionScore DESC

// bioregion.getLandProjects
// Input: { bioregionId: number }
// Returns: land projects in this bioregion
// Includes: name, status (applied/incubating/active/established/anchor), thumbnail, hectares

// bioregion.getLocalProposals
// Input: { bioregionId: number }
// Returns: govProposals scoped to this bioregion (from Sprint 2)
// Filters: status IN ('discussion', 'polling', 'staged')
```

### 3. Frontend: Bioregion Dashboard Page

**Route:** `apps/gov/src/app/bioregion/[id]/page.tsx`

Replace the Sprint 1 placeholder.

**Layout (mobile, single column):**

```
[Back arrow + bioregion name]

[Header card - GlassCard]
  Bioregion name (large)
  Member count + established date
  [If not a member:] [Join This Bioregion] PillButton
  [If Steward:] [Report Health] PillButton (gold)

[Doughnut Visualization - full width, square aspect ratio]
  Interactive SVG doughnut (see component spec below)
  Tap a segment to see detail

[Selected segment detail - appears below doughnut when segment tapped]
  Dimension name + score + trend arrow (up/down/flat)
  One-sentence description of what this dimension measures
  Contributing land projects (if applicable)
  "Last updated: Spring 2026 by @steward_name"

[Land Projects section]
  "Land Projects (5)"
  Horizontally scrollable cards (on mobile):
    Each card: project name, status badge, thumbnail, hectares
    Tap: navigates to project page on main site (external link)

[Active Proposals section]
  "Proposals for [Bioregion Name] (3)"
  List of ProposalCard components (from Sprint 2)
  Scoped to this bioregion

[Members section]
  "Members (42)"
  Grid of member avatars (48px circles) with name below
  Stewards highlighted with gold ring around avatar
  [See all members] link expands to full directory
  Full directory: list view with name, handle, tier badge, contribution score
```

**Desktop layout:**

```
[Left sidebar (Sprint 1)]

[Center column]
  Header card
  Doughnut visualization (max 500px wide, centered)
  Segment detail panel
  Land projects (horizontal scroll or grid)
  Active proposals

[Right column]
  Member directory (scrollable)
  Bioregion stats summary:
    - Total acres under stewardship
    - Active proposals
    - Composite health score
    - Season progress
```

### 4. Frontend: Doughnut Visualization Component

**File:** `apps/gov/src/components/DoughnutVisualization.tsx`

This is the centerpiece visual. It must be beautiful, animated, and interactive.

**Structure:**
- SVG rendered in a square container (responsive, takes full width on mobile, max 500px on desktop)
- Two concentric donut rings with a gap between them
- Inner ring: 5 segments (social foundation)
- Outer ring: 5 segments (ecological ceiling)
- Center: composite score number (large, animated counter)
- Between rings: the "safe and just space" text label (appears on first render)

**Color coding per segment:**
- Score 0-33: red (#ef4444) with subtle pulse animation
- Score 34-66: yellow/amber (#eab308)
- Score 67-100: green (#7dd87d)
- No data: gray (#4b5563) with dashed border

**Interaction:**
- Mobile: tap a segment to select it. Selected segment glows (brighter border, slight scale).
- Desktop: hover to preview, click to select.
- When selected: the segment detail panel below the doughnut populates with that dimension's data.
- The center number updates to show the selected dimension's score (animated counter transition).

**Animation on first render:**
- Segments draw in clockwise, one by one, 100ms stagger between segments
- Each segment's arc length animates from 0 to its proportional size
- Colors fade in after the arc is drawn
- Center composite number counts up from 0 to the actual score (800ms ease-out)

**SVG approach:**
- Use SVG `<path>` elements with calculated arc coordinates
- Each segment is an arc of the donut (equal angular size: 72 degrees for 5 segments per ring)
- The arc "thickness" (donut width) is about 15% of the radius
- Gap between inner and outer ring: 8% of the radius
- Use CSS transitions for hover/selected states
- Render with React state for selected segment

**Props:**
```typescript
interface DoughnutProps {
  social: {
    foodSecurity: number | null;
    education: number | null;
    health: number | null;
    housing: number | null;
    community: number | null;
  };
  ecological: {
    soilHealth: number | null;
    waterQuality: number | null;
    biodiversity: number | null;
    carbon: number | null;
    landUse: number | null;
  };
  onSegmentSelect?: (dimension: string, score: number | null) => void;
}
```

### 5. Frontend: Mini Health Gauge (for home screen)

**File:** `apps/gov/src/components/MiniHealthGauge.tsx`

A tiny version of the doughnut for the BioregionCard on the home screen.

- Circular gauge, 48px diameter
- Single ring showing the composite score (average of all 10 dimensions)
- Color: green/yellow/red based on composite score
- No interaction (just a visual indicator)
- Score number in the center (small, bold text)

### 6. Frontend: Health Report Form

**File:** `apps/gov/src/components/HealthReportForm.tsx`

Only visible to Stewards of the bioregion.

```
[Health Report for [Bioregion Name] - Season [Name]]

For each of the 10 dimensions:
  [Dimension name]: [Slider 0-100] [Number input]
  One-line description of what to consider when scoring

[Notes textarea]
  "Any context or observations for this season's report"

[Submit Report] PillButton (gold, Steward action)
```

- Sliders are the primary input (drag on mobile, click on desktop)
- Number input next to each slider for precise entry
- Pre-fills with previous season's data if available
- On submit: calls `bioregion.submitHealthReport`
- Success toast: "Health report submitted for [Season Name]."

### 7. Update BioregionCard on Home Screen

The Sprint 1 BioregionCard now includes the MiniHealthGauge:

```
[Bioregion Name]               [MiniHealthGauge: 67]
42 members
3 active proposals
Next event: Community work day Sat →
```

The gauge pulls from `bioregion.getHealthMetrics` with the current season.

---

## Dependency Audit and Potential Bugs

### Things that could break:

1. **No health data yet.** Most bioregions won't have health metrics when this ships. Handle the null case gracefully: show the doughnut with all gray segments and a message "Health data hasn't been reported for this bioregion yet. Stewards can submit a report."

2. **Bioregion data structure.** The existing `bioregions` table might not have all the fields we expect (like established date). Check the schema. If fields are missing, add them in the migration or derive from creation timestamp.

3. **Land project data.** Land projects might live in a separate table or might be a concept that's tracked differently. Check if there's a `landProjects` table or equivalent. If not, this section shows a placeholder: "Land projects will appear here as they join this bioregion."

4. **SVG performance on mobile.** Ten animated SVG segments with transitions could cause jank on low-end phones. Use `will-change: transform` and `transform: translate3d(0,0,0)` on the SVG container to force GPU acceleration. Keep animations simple (opacity + arc length, no complex path morphing).

5. **Season ID.** The health metrics table uses seasonId. Make sure there's a way to determine the current season ID. This might come from a `seasons` table or be computed from dates. If no seasons table exists yet, default to season 1 and note this as a dependency for Sprint 6.

### Things to verify before deploying:

- [ ] Doughnut renders correctly with all 10 dimensions filled
- [ ] Doughnut renders gracefully with partial data (some dimensions null)
- [ ] Doughnut renders gracefully with no data (all gray)
- [ ] Segment selection works on both mobile (tap) and desktop (click)
- [ ] Health report form is only visible to Stewards
- [ ] MiniHealthGauge on home screen matches the full doughnut's composite score
- [ ] Land projects section handles zero projects gracefully
- [ ] Member directory paginates for bioregions with 100+ members
- [ ] Bioregion page loads in under 2 seconds on 3G

---

## Done Criteria

Sprint 3 is done when:

1. Each bioregion has a dedicated dashboard page at `/bioregion/:id`
2. The doughnut economics visualization renders with 10 dimensions across two rings
3. Tapping a segment shows the dimension detail (score, trend, description)
4. The visualization handles null data gracefully (gray segments + helpful message)
5. The animation on first render is smooth and delightful (segments draw in, colors fade, counter counts up)
6. Land projects for the bioregion are listed (or placeholder if none)
7. Active proposals scoped to the bioregion are listed (uses Sprint 2 ProposalCard)
8. The member directory shows all members with Stewards highlighted
9. Stewards can submit a health report via the form
10. The MiniHealthGauge appears on the home screen BioregionCard
11. The page is mobile-first and works well on desktop (three-column layout)
12. All user-facing text follows the writing rules

---

## Writing Rules Reminder

All user-facing text must follow the project writing rules:
- No em-dashes (zero, not "use sparingly")
- No contrast-framing ("This is not X, this is Y")
- No AI word patterns (delve, tapestry, foster, leverage, etc.)
- No rhetorical question openers
- No passive inspiration ("Join us on this journey")
- Voice: direct, grounded, specific. First person fine. Contractions fine.

# Sprint 4: Economy Dashboard and Live Token Data

**Date:** 2026-04-10
**Depends on:** Sprint 1 + Sprint 2 + Sprint 3 complete, `REGEN_GOV_UNIFIED_ARCHITECTURE.md`
**Goal:** The full economic dashboard with live Base chain data for $ReGen and $RCivics, fund health metrics, SEEDS-inspired readiness gauges, and gratitude flow visibility. No USD price for $ReGen. Focus on supply, velocity, distribution, and health of the economic system.

---

## CRITICAL CONTEXT: Read These Files First

1. Previous sprint files (`REGEN_GOV_SPRINT_1.md` through `REGEN_GOV_SPRINT_3.md`)
2. `CONTEXT_THE_TWO_GAMES.md` -- Fund ($RCivics, RCVoice) vs Game ($ReGen, RGVoice). The economy page shows BOTH.
3. `server/jobs/governanceJobs.ts` -- existing viem usage for Base chain reads
4. `.env` -- token contract addresses: `REGEN_TOKEN_ADDRESS_BASE=0x4E617cd113364193d215d107AdD6fa50418AA2E4`, `RCIVICS_TOKEN_ADDRESS_BASE=0x72e9B17a2F93A923D63666eC0a1c096B1443ef26`
5. `SEEDS_VISION_IMPLEMENTATION_SPEC.md` -- SEEDS economic vision adapted for ReGen Civics (readiness gauges, harvest cycles)
6. `REGEN_GAMES_SPEC_V1.md` -- game variables, harvest distribution, gratitude settings

## Key Design Decision: No USD Price for $ReGen

$ReGen has no market price yet. The dashboard focuses on what matters for a coordination currency:

- **Total supply:** How many $ReGen tokens exist on Base
- **Velocity:** How frequently tokens change hands (transfers per token per period)
- **Distribution rate:** How many tokens are being distributed for quests, roles, and gratitude each season
- **Holder count:** How many unique addresses hold $ReGen
- **Governance stake:** How many tokens are locked in active governance votes or escrow
- **Concentration:** Gini coefficient or top-10-holders percentage (transparency metric)

$RCivics is the Fund token. It also has no USD price in the app for now, but tracks supply and holder metrics.

---

## What to Build in This Sprint

### 1. Database Migration

Create `drizzle/0115_economic_snapshots.sql`:

```sql
CREATE TABLE IF NOT EXISTS economicSnapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  snapshotDate DATE NOT NULL,
  -- $ReGen metrics
  regenTotalSupply BIGINT DEFAULT NULL,
  regenHolderCount INT DEFAULT NULL,
  regenTransferCount INT DEFAULT NULL, -- transfers in the snapshot period
  regenVelocity DECIMAL(10,4) DEFAULT NULL, -- transfers per token per day
  regenDistributionRate DECIMAL(10,4) DEFAULT NULL, -- tokens distributed per day this season
  regenGovernanceStaked BIGINT DEFAULT NULL, -- tokens locked in active votes
  regenTopTenPct DECIMAL(5,2) DEFAULT NULL, -- % of supply held by top 10 holders
  -- $RCivics metrics
  rcivicsTotalSupply BIGINT DEFAULT NULL,
  rcivicsHolderCount INT DEFAULT NULL,
  rcivicsTransferCount INT DEFAULT NULL,
  -- Fund metrics
  fundAum DECIMAL(15,2) DEFAULT NULL,
  fundDeployed DECIMAL(15,2) DEFAULT NULL, -- amount deployed to land projects
  fundTreasuryRunway INT DEFAULT NULL, -- months of operating runway
  -- Community metrics
  totalGratitudeSeason INT DEFAULT NULL,
  totalGovernanceTokensSeason INT DEFAULT NULL,
  activePlayers INT DEFAULT NULL,
  activeProposals INT DEFAULT NULL,
  governanceParticipationRate DECIMAL(5,2) DEFAULT NULL, -- % of Citizens who voted
  -- Ecological aggregate
  avgBioregionHealthScore DECIMAL(5,2) DEFAULT NULL,
  totalAcresUnderStewardship INT DEFAULT NULL,
  -- Meta
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_date (snapshotDate)
);
```

### 2. Server-Side: viem Token Reader

Create a utility for reading Base chain token data:

```typescript
// server/lib/tokenReader.ts

import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
});

const erc20Abi = [
  parseAbiItem("function totalSupply() view returns (uint256)"),
  parseAbiItem("function balanceOf(address) view returns (uint256)"),
  parseAbiItem("function decimals() view returns (uint8)"),
  parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)"),
] as const;

const REGEN_ADDRESS = process.env.REGEN_TOKEN_ADDRESS_BASE as `0x${string}`;
const RCIVICS_ADDRESS = process.env.RCIVICS_TOKEN_ADDRESS_BASE as `0x${string}`;

export async function getRegenMetrics() {
  const [totalSupply, decimals] = await Promise.all([
    publicClient.readContract({
      address: REGEN_ADDRESS,
      abi: erc20Abi,
      functionName: "totalSupply",
    }),
    publicClient.readContract({
      address: REGEN_ADDRESS,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);

  return {
    totalSupply: totalSupply.toString(),
    decimals: Number(decimals),
    displaySupply: Number(totalSupply) / Math.pow(10, Number(decimals)),
  };
}

export async function getRcivicsMetrics() {
  const [totalSupply, decimals] = await Promise.all([
    publicClient.readContract({
      address: RCIVICS_ADDRESS,
      abi: erc20Abi,
      functionName: "totalSupply",
    }),
    publicClient.readContract({
      address: RCIVICS_ADDRESS,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);

  return {
    totalSupply: totalSupply.toString(),
    decimals: Number(decimals),
    displaySupply: Number(totalSupply) / Math.pow(10, Number(decimals)),
  };
}

// For holder count and transfer count, use Alchemy or a subgraph.
// Base RPC alone can't efficiently count unique holders.
// Option A: Alchemy getTokenBalances API
// Option B: Index Transfer events from the chain (expensive for initial sync)
// Option C: Use a pre-built subgraph if one exists for these tokens
// For Sprint 4, start with Alchemy if available, or mock with database counts.
```

### 3. Server-Side: Economic Snapshot Job

```typescript
// server/jobs/economicSnapshotJob.ts
// Runs daily via cron (same mechanism as existing governance jobs)

// 1. Read token metrics from Base chain
// 2. Count active players, proposals, participation from MySQL
// 3. Calculate gratitude totals for the current season
// 4. Aggregate bioregion health scores from Sprint 3 data
// 5. Insert a row into economicSnapshots
// 6. Log results

// For transfer count and velocity:
// Query recent Transfer events from the token contracts via Alchemy getLogs
// Velocity = transferCount / totalSupply (over a 24-hour window)
```

### 4. Server-Side tRPC Procedures

```typescript
// economy.getCurrentMetrics
// Input: {}
// Returns: latest snapshot + live token supply from chain
// Combines the most recent economicSnapshots row with a fresh totalSupply read
// Caches the chain read for 5 minutes (don't hit Base RPC on every page load)

// economy.getSnapshotHistory
// Input: { days?: number } (default 30)
// Returns: array of snapshots for charting, sorted by date ASC
// Used for sparkline charts and trend analysis

// economy.getReadinessGauges
// Input: {}
// Returns: four readiness scores (0-100 each):
//   communityHealth: weighted average of (participation rate, active players, gratitude volume)
//   economicHealth: weighted average of (distribution rate, governance stake ratio, velocity)
//   ecologicalHealth: avgBioregionHealthScore from latest snapshot
//   governanceHealth: weighted average of (proposal throughput, decision velocity, delegation coverage)
// Each gauge also returns a trend (up/down/flat) compared to previous snapshot

// economy.getGratitudeFlows
// Input: { seasonId?: number }
// Returns: gratitude summary for the season
//   totalGiven, totalReceived (should match), topGivers (anonymized), topReceivers
//   governanceTokensEarned (from gratitude -> governance pipeline)
//   comparison to previous season (% change)

// economy.getFundHealth
// Input: {}
// Returns: fund-specific metrics
//   aum, deployed, deploymentRatio, treasuryRunway, activeProjects, seasonalReturns
//   Source: mostly manual entry for now (fund metrics come from Rye/admin)
//   Future: automated from on-chain fund contract
```

### 5. Frontend: Economy Page

**Route:** `apps/gov/src/app/economy/page.tsx`

Replace the Sprint 1 placeholder.

**Layout (mobile, single column):**

```
[Top bar]

[Section: Token Health]
  Two side-by-side token cards (each GlassCard):

  [$ReGen Card]
    "$ReGen" title with green token icon
    Total Supply: 1,247,000 (large number, animated counter)
    Distribution Rate: 2,400/day ↑ (sparkline)
    Velocity: 0.34 tx/token/day (sparkline)
    Holders: 847
    Governance Stake: 23% of supply
    Concentration: Top 10 hold 31%

  [$RCivics Card]
    "$RCivics" title with gold token icon
    Total Supply: 500,000
    Holders: 312
    [Less detail since this is the Fund token managed differently]

[Section: Readiness Gauges]
  "System Readiness" header
  Four circular gauges in a 2x2 grid:
    [Community]  [Economic]
    [Ecological] [Governance]
  Each gauge: circular SVG (similar to MiniHealthGauge from Sprint 3)
    Score in center (0-100)
    Color: green/yellow/red
    Label below
    Trend arrow (up/down/flat)
  Tap any gauge: expands to show the breakdown of what feeds into the score

[Section: Gratitude Flows]
  "Gratitude This Season" header
  [Total given: 1,247] [Governance tokens earned: 312]
  Comparison: "↑ 23% from last season"
  Mini bar chart: gratitude given per week this season

[Section: Fund Health]
  "The Fund" header (gold accent)
  GlassCard with gold border:
    AUM: $2.4M
    Deployed: $1.1M (46%)
    Active Projects: 8
    Treasury Runway: 14 months
    Seasonal Returns: [placeholder until data is available]

[Section: Planted vs Sold]
  "Planted vs Sold" header
  Horizontal bar: green (planted/staked) vs gray (liquid/available)
  "67% of $ReGen is planted in governance, quests, or land project escrow"
  "33% is liquid and available"
  This is a transparency metric showing how much of the token is actively working

[Bottom nav]
```

**Desktop layout:**
- Token cards side by side in center column
- Readiness gauges in a row of 4 (not 2x2 grid)
- Gratitude flows and fund health in the right column
- Planted vs Sold full-width below token cards

### 6. Component Specs

**TokenCard.tsx:**
```
- GlassCard with token-specific accent color ($ReGen: green border, $RCivics: gold border)
- Token name + icon at top
- Primary metric (total supply) in large text, animated counter on load
- Secondary metrics in rows: label (60% white) | value (white, right-aligned)
- Sparkline chart next to metrics that have history (distribution rate, velocity)
- Sparklines are tiny (60px wide, 24px tall), using recharts <Sparkline> or custom SVG
```

**ReadinessGauge.tsx:**
```
- Circular SVG gauge, 120px diameter on mobile, 160px on desktop
- Arc from 7 o'clock to 5 o'clock (270 degrees)
- Filled portion colored: green (67-100), yellow (34-66), red (0-33)
- Unfilled portion: dark gray
- Score number in center (large bold)
- Trend arrow: small up/down/flat icon below center number
- Label below gauge: "Community" / "Economic" / "Ecological" / "Governance"
- On tap/click: expands to show sub-metrics that feed into the score
  (e.g., Community Health = participation 72%, active players 65%, gratitude volume 81%)
```

**SparklineChart.tsx:**
```
- Tiny inline chart using recharts or custom SVG path
- Width: 60-80px, Height: 24px
- Single line, no axes, no labels
- Line color matches the metric context (green for positive trends, red for negative)
- Renders from the last 7 or 30 data points in economicSnapshots
- Hover/tap shows the value at that point (tooltip)
```

**GratitudeFlowChart.tsx:**
```
- Small bar chart showing gratitude per week this season
- 4-8 bars depending on how many weeks into the season
- Each bar: green fill, width proportional to count
- Labels: week numbers or dates below
- recharts BarChart component, minimal styling, dark theme
```

**PlantedVsSold.tsx:**
```
- Single horizontal stacked bar (full width)
- Green portion: tokens in governance stake + quest escrow + land project escrow
- Gray portion: liquid/available tokens
- Percentage labels on each section
- Below bar: one-sentence description
- Animated on first render (bar fills from left)
```

**FundHealthCard.tsx:**
```
- GlassCard with gold border (1px solid rgba(212, 165, 116, 0.3))
- "The Fund" header with gold accent
- Metrics in clean rows:
  AUM, Deployed amount, Deployment ratio (bar), Active projects, Runway
- Deployment ratio: mini horizontal bar showing deployed/total
- Numbers right-aligned, labels left-aligned
- Footer: "Fund governance powered by RCVoice and $RCivics"
```

### 7. Caching Strategy

Token data from Base chain should not be fetched on every page load.

- **Server-side cache:** The `economy.getCurrentMetrics` procedure caches the chain read result in Redis (or in-memory) for 5 minutes.
- **Snapshot data:** Already in MySQL, no caching needed beyond normal query caching.
- **Client-side:** React Query (or SWR) with a 5-minute stale time for the economy page data. The page shows cached data immediately and refreshes in the background.

### 8. Update MovementPulse on Home Screen

The Sprint 1 MovementPulse component currently shows player count, active proposals, and participation rate. Now also pull from economic data:

- Replace "Active proposals" count to include both forum decisions and native gov proposals
- Add a fourth stat pill: "$ReGen distributed this season: 24,700" (pulls from latest snapshot's regenDistributionRate)

---

## Dependency Audit and Potential Bugs

### Things that could break:

1. **Base RPC rate limits.** The free Base RPC at mainnet.base.org has rate limits. If the snapshot job and live reads both hit the chain frequently, we'll get 429s. Solution: use the snapshot job for historical data (runs once daily), and cache the live read for 5 minutes on the server. If available, use an Alchemy API key for higher limits.

2. **Token holder count.** Standard ERC-20 contracts don't expose holder count. Getting this requires either (a) an indexer like Alchemy/Etherscan API, (b) a subgraph, or (c) scanning all Transfer events since deployment. For Sprint 4, use Alchemy's `getTokenBalances` endpoint if an API key is available. If not, leave holder count as "coming soon" and populate it manually or via a future indexing job.

3. **Transfer event scanning for velocity.** Calculating velocity requires counting Transfer events over a time window. This is expensive on-chain. Options: (a) Alchemy `getAssetTransfers` API, (b) event log scanning with a block range. For Sprint 4, start with a 24-hour window and expand. If no Alchemy key, mock with database-tracked internal transfers.

4. **Fund AUM data source.** Fund AUM, deployed amounts, and runway are not on-chain (or at least not fully). For Sprint 4, these are admin-entered values stored in the economicSnapshots table. Create an admin-only tRPC procedure to update fund metrics. Future sprints can automate from on-chain fund contracts if they exist.

5. **Gratitude data.** Gratitude flows come from the existing gratitude system on the main site. The economy page needs to call main site tRPC procedures for gratitude totals. Verify these exist and are accessible cross-origin.

6. **Decimal handling.** ERC-20 token amounts are in wei (BigInt). Always divide by 10^decimals for display. Use string representation for large numbers to avoid JavaScript float precision issues. Format with locale-appropriate number formatting (commas for thousands).

### Things to verify before deploying:

- [ ] Token supply reads work from Base RPC (check contract addresses are correct)
- [ ] Economic snapshot job runs without errors
- [ ] Sparkline charts render with real data from snapshot history
- [ ] Readiness gauges calculate correctly from component metrics
- [ ] Fund health card displays admin-entered values
- [ ] Gratitude flows pull real data from main site
- [ ] All numbers display with correct decimal formatting
- [ ] Page loads in under 2 seconds (cached data shows first)
- [ ] Mobile layout is readable (no overflow on large numbers)

---

## Done Criteria

Sprint 4 is done when:

1. The economy page shows $ReGen and $RCivics token metrics from Base chain
2. Total supply, distribution rate, velocity, and holder count display correctly (or show "coming soon" with a clear fallback for metrics that need an indexer)
3. The four readiness gauges render with computed scores and trend arrows
4. Gratitude flows show this season's totals with comparison to last season
5. Fund health displays admin-entered AUM, deployed, runway metrics
6. Planted vs Sold bar shows the ratio of staked/escrowed vs liquid tokens
7. Sparkline charts show 7 or 30 day trends from snapshot history
8. The economic snapshot job runs daily and populates the snapshots table
9. The MovementPulse on the home screen now includes a $ReGen distribution stat
10. Performance: economy page loads cached data in under 1 second, fresh chain reads complete within 5 seconds

---

## Writing Rules Reminder

All user-facing text must follow the project writing rules:
- No em-dashes (zero, not "use sparingly")
- No contrast-framing ("This is not X, this is Y")
- No AI word patterns (delve, tapestry, foster, leverage, etc.)
- No rhetorical question openers
- No passive inspiration ("Join us on this journey")
- Voice: direct, grounded, specific. First person fine. Contractions fine.

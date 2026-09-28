# The Regenerative Map: 4-Path Progress Visualization

**Date:** 2026-03-28
**What this is:** Design concept for the progress map that lives in the Command Center "More" panel and expands to full screen. Shows player progress through 4 paths: Land, Ally, Play, Fund.

---

## The Core Idea

One illustrated SVG map. Four winding paths through a regenerative village-world. Ancient and futuristic at the same time. Think: a hand-drawn treasure map of a place that could actually exist in 50 years if we get things right. Mycelium networks running under the soil. Solar-punk architecture. Food forests. Healing circles. Council halls. A living map where your progress lights up the world around you.

The map lives in two modes:
1. **Mini view** (in the Command Center "More" panel): a compact strip showing your active path(s) with a glowing current-position dot and completion percentage
2. **Full view** (click to expand): the entire illustrated world fills the screen, all 4 paths visible, hoverable nodes with details, animated connections

---

## The World

The map is a bird's-eye view of a regenerative settlement. Four paths wind through it, each passing through distinct terrain and landmarks. The paths cross and intersect at shared locations (the Community Forum, the Schedule hub, the Quest grounds) because the journeys overlap in real life.

### Visual Zones

**Earth Zone (Land Path):** Bottom-left quadrant. Terraced hillsides, food forests, a seed vault, winding trails through restoration sites. Colors: deep greens, rich browns, amber. The terrain is the most "natural" part of the map.

**Water Zone (Ally Path):** Top-left quadrant. A river delta flowing through a network of connected settlements. Bridges between communities. A great meeting hall at the confluence. Colors: teals, deep blues, silver. Architecture is collaborative, interconnected.

**Air Zone (Play Path):** Top-right quadrant. High ground with clear views. A spiral of quest stones. Healing circles in forest clearings. A ceremonial fire pit. Ancient trees with glowing canopies. Colors: purples, soft golds, starlight white. The most mystical part of the map.

**Fire Zone (Fund Path):** Bottom-right quadrant. A forge district. Solar arrays on rooftops. A treasury carved into a hillside. An exchange garden where resources flow. Colors: warm oranges, deep reds, amber glow. Productive, energetic, forward-looking.

**Center:** Where all four paths converge. A great tree (the ReGen Tree) with roots visible underground connecting to all zones via mycelium lines. This is the Community hub.

---

## The Four Paths

Each path has 4-6 milestone nodes. Each node represents a real action the player takes on the site. Progress is tracked by whether the player has actually done the thing (visited the page, submitted a form, attended a session, completed a quest).

### Path 1: LAND (Earth)
**Color:** #7dd87d (green)
**Ends with:** Joining a Season (application accepted)

| Node | Milestone | What triggers completion | Location on map |
|------|-----------|------------------------|-----------------|
| 1 | Explore the Land Page | Visit `/land` | Trailhead at forest edge |
| 2 | Read a Project Profile | Visit any land project thread | Seed vault entrance |
| 3 | Join a Session | Attend a community session | Gathering grove |
| 4 | Submit Application | Complete the land project application | The Great Terrace |
| 5 | Get Accepted | Application approved | Summit overlook (with planted flag) |

### Path 2: ALLY (Water)
**Color:** #60a5fa (blue)
**Ends with:** Alliance approval

| Node | Milestone | What triggers completion | Location on map |
|------|-----------|------------------------|-----------------|
| 1 | Explore the Alliance | Visit `/ally` | River dock |
| 2 | Meet the Partners | Browse alliance org profiles | Bridge market |
| 3 | Join a Session | Attend a community session | Confluence meeting hall |
| 4 | Submit Org Claim | Complete the alliance application | Council chamber |
| 5 | Get Approved | Organisation claim approved | The Great Bridge (banner raised) |

### Path 3: PLAY (Air)
**Color:** #c084fc (purple)
**Ends with:** Completing the Rites of Passage (all 14 quests)

| Node | Milestone | What triggers completion | Location on map |
|------|-----------|------------------------|-----------------|
| 1 | Enter the Game | Visit `/play` | The Threshold stone |
| 2 | Complete First Quest | Finish any quest | First quest stone in spiral |
| 3 | Complete 5 Quests | Finish 5 distinct quests | Midway clearing |
| 4 | Join the Forum | Create a forum post or reply | The Speaking Circle |
| 5 | Complete 10 Quests | Finish 10 distinct quests | The High Ring |
| 6 | Complete All Quests | All 14 quests done | The Ancient Tree (Rites complete) |

### Path 4: FUND (Fire)
**Color:** #f97316 (orange)
**Ends with:** Making an investment (LOI signed)

| Node | Milestone | What triggers completion | Location on map |
|------|-----------|------------------------|-----------------|
| 1 | Learn the Vision | Visit `/opportunity` | The Observatory |
| 2 | Join a Session | Attend a community session | Forge amphitheatre |
| 3 | Explore the Portfolio | Visit `/map` | The Exchange Garden |
| 4 | Express Interest | Visit `/investor` and submit info | Treasury gate |
| 5 | Sign LOI | Complete Letter of Intent | The Forge (flame lit) |
| 6 | Attend Fund Launch Incubator | Attend the Fund Launch session | The Great Hall of the Forge |
| 7 | Invest and Grow the Fund | Investment confirmed | The Flame Garden (eternal flame lit, garden blooming) |

---

## Shared Nodes

Some milestones exist on multiple paths. "Join a Session" appears on Land (node 3), Ally (node 3), and Fund (node 2). On the map, this is a single physical location (the central gathering area near the ReGen Tree). Completing it on one path lights it up for all paths. This creates satisfying cross-path progress.

**Shared locations:**
- "Join a Session" = The Central Gathering (shared by Land, Ally, Fund)
- "Join the Forum" = The Speaking Circle (shared by Play, potentially others)
- The ReGen Tree = Center of map, always visible, pulses when any path progresses

---

## Visual Design Language

### Node States

**Locked:** Faded, grayscale illustration. Node outline is dashed. The landmark is there but looks dormant, like winter.

**Unlocked (next available):** Full color outline, gentle pulse animation (like QuestArcMap's `quest-node-pulse`). The landmark has a subtle glow. A small arrow or trail marker points toward it.

**Completed:** Full color, solid fill, golden glow halo. The landmark is alive: smoke from chimneys, birds in trees, water flowing, flags raised. A checkmark or completion badge.

**Current position:** Player's avatar (a small glowing seed/ember) sits at the last completed node, with a trail of light leading toward the next unlocked one. On the mini view, this is the primary indicator.

### Path Visibility

The player's chosen path(s) are highlighted and alive: full color, glowing nodes, animated elements. All other paths are visible but greyed out, dormant, like distant terrain on an old map. You can see the shape of what's there, but it's muted. This creates focus without hiding possibility. If a player picks up a second path, that zone wakes up too.

### Path Lines

Winding, organic paths (SVG bezier curves). Each path uses its element color. Completed segments are solid and glowing. Upcoming segments are dashed with lower opacity. The paths curve naturally through the landscape, following terrain.

### Illustration Style

Hand-drawn line art with watercolor-style fills. Think Studio Ghibli backgrounds meeting treasure map cartography. Fine pen details on buildings and nature. Soft gradients for sky and terrain. Tiny details that reward zooming in: a cat on a rooftop, mushrooms at a tree base, a bee near flowers.

The map should feel lived-in, warm, inviting. Every landmark tells a small story. The aesthetic is "a place you'd actually want to go."

### Animated Elements

Keep animations minimal and meaningful:
- Gentle water flow in the river (CSS shimmer on a path)
- Smoke wisps from completed forge/hearth nodes
- Twinkling stars in the Air zone (reuse QuestArcMap's star twinkle)
- Mycelium pulse: a subtle glow that travels along underground root lines connecting completed nodes across different paths
- The ReGen Tree's canopy shifts color subtly based on overall progress (bare > budding > leafy > in bloom > fruiting)

---

## Mini View (Command Center)

The mini view sits in the CommandPanel, between the page tools grid and the audio player. It's approximately 300x80px.

### Layout

```
┌──────────────────────────────────────────┐
│  [🌱 Land ●●●○○]  [💧 Ally ●●○○○]      │
│  [🌀 Play ●●●●○○] [🔥 Fund ●○○○○]     │
│                              [View Map →] │
└──────────────────────────────────────────┘
```

Each path shows:
- Element emoji or small SVG icon
- Path name
- Dot progress indicator (filled = completed nodes, empty = remaining)
- The active/selected path is slightly highlighted

A "View Map" link expands to the full-screen view.

### Alternative Mini Layout: Linear Trail

Instead of a grid, show the player's primary path as a horizontal trail:

```
┌──────────────────────────────────────────┐
│  🌱 Land Path                    3/5     │
│  ●───●───●───○ · · ○                    │
│  ↑ You are here          [View Map →]    │
└──────────────────────────────────────────┘
```

This is cleaner for single-path players. If multiple paths are active, stack them or show a tab switcher.

**Recommendation:** Start with the grid layout (shows all 4 paths at once, fits the compact space well). The linear trail works as a drill-down when you tap a specific path.

---

## Full-Screen View

### Desktop (>768px)

The full illustrated map fills the viewport. A translucent sidebar on the left shows path details (which path is selected, milestone descriptions, completion status). Hovering a node shows a tooltip with the milestone name and status.

```
┌─────────────────────────────────────────────────────────┐
│  [✕ Close]              The Regenerative Map            │
├───────────┬─────────────────────────────────────────────┤
│           │                                             │
│  PATHS    │         [Illustrated SVG Map]               │
│           │                                             │
│  🌱 Land  │    Water Zone        Air Zone               │
│    3/5    │      (Ally)           (Play)                │
│           │                                             │
│  💧 Ally  │              🌳                             │
│    2/5    │           ReGen Tree                        │
│           │                                             │
│  🌀 Play  │    Earth Zone        Fire Zone              │
│    4/6    │      (Land)           (Fund)                │
│           │                                             │
│  🔥 Fund  │                                             │
│    1/5    │                                             │
│           │                                             │
│  Overall  │                                             │
│   48%     │                                             │
├───────────┴─────────────────────────────────────────────┤
│  Currently: "Complete 10 Quests" on Play path           │
└─────────────────────────────────────────────────────────┘
```

Clicking a path in the sidebar highlights that path on the map and dims others. Clicking a node opens a detail card with the milestone description and a CTA button ("Go to Land Projects", "Start Quest", etc.).

### Mobile (<768px)

Full-screen overlay. The map is scrollable/pannable (touch gestures). A bottom sheet shows the selected path's progress. Tap a node to see its detail.

```
┌─────────────────────────┐
│  ✕        Regen Map     │
│                         │
│   [Scrollable/pannable  │
│    illustrated SVG map] │
│                         │
│                         │
│                         │
├─────────────────────────┤
│ 🌀 Play Path     4/6   │
│ Next: Complete 10 Quests│
│ [Go to Quests →]        │
└─────────────────────────┘
```

Path switching: swipe the bottom sheet left/right, or tap path icons at the top.

---

## Technical Implementation

### Architecture

```
client/src/components/
  ProgressMap/
    ProgressMap.tsx          -- Full-screen map component
    ProgressMapMini.tsx      -- Compact Command Center widget
    ProgressMapSVG.tsx       -- The illustrated SVG map (shared)
    ProgressMapSidebar.tsx   -- Desktop sidebar with path details
    ProgressMapSheet.tsx     -- Mobile bottom sheet
    mapData.ts               -- Node positions, connections, path definitions
    useProgressMap.ts        -- Hook: reads user progress, computes node states
```

### SVG Structure

The map SVG uses layered `<g>` groups:

1. **Background layer:** Terrain fills, sky gradient, water bodies
2. **Detail layer:** Trees, buildings, terrain features (illustrated landmarks)
3. **Underground layer:** Mycelium network connecting shared nodes (dashed lines, subtle glow)
4. **Path layer:** The 4 winding paths as SVG `<path>` elements with gradient strokes
5. **Node layer:** Milestone circles at each landmark, with state-dependent styling
6. **Label layer:** Node names, tooltips on hover
7. **Player layer:** Current position indicator (glowing seed/ember)

ViewBox: `0 0 1200 800` for the full map. The mini view crops to a relevant section or renders a simplified version.

### Progress Tracking

Extend the existing localStorage pattern (like `regen-civics-quest-progress` and `regen-investor-journey`):

```typescript
interface PathProgress {
  land: { completedNodes: string[]; lastUpdated: string };
  ally: { completedNodes: string[]; lastUpdated: string };
  play: { completedNodes: string[]; lastUpdated: string };
  fund: { completedNodes: string[]; lastUpdated: string };
}

const STORAGE_KEY = "regen-progress-map";
```

For authenticated users, progress is server-side (new `userProgress` table or extension to `userProfiles`). This is the source of truth. localStorage is a cache for fast rendering. Guests see a read-only version.

**Auto-tracking (preferred where possible):**
- Quest completion: already tracked via QuestProgressTracker and DB
- Form submissions: land application, alliance org claim, investor info, LOI all hit the DB
- Application approvals: `status = 'approved'` in applications table
- Session attendance: RSVP via schedule page (track the click, verify later if needed)

**DB-sourced completions:**
- "Get Accepted" (Land/Ally): triggered by admin approval in applications router
- "Sign LOI": triggered by LOI submission
- "Invest and Grow the Fund": triggered by investment confirmation

The `useProgressMap` hook aggregates from all these sources. Server data takes priority over localStorage.

### SVG Illustration Approach

**Phase 1 (MVP):** Use the same visual language as QuestArcMap. Dark background, glowing nodes, element-colored paths, constellation-style layout. This ships fast and is consistent with what exists.

**Phase 2 (Illustrated):** Commission or generate illustrated landmark assets. Replace simple nodes with small illustrated vignettes (a terrace farm, a bridge, a forge). Keep the SVG structure, layer illustrations as `<image>` or inline SVG groups. This is the treasure-map-meets-solarpunk vision.

**Phase 3 (Animated):** Add CSS and SVG animations. Water flow, smoke, mycelium pulse, seasonal changes. The map becomes a living world that reflects real community activity.

### Integration Points

**CommandPanel.tsx:** Add `<ProgressMapMini />` between the page tools grid and the "Online" indicator. On click, it opens the full ProgressMap as a route or overlay.

**SmartBottomNav.tsx:** The "More" button already opens CommandPanel. No changes needed at the nav level.

**Route:** Add `/map/progress` or render as a modal overlay (preferred for the "click to expand" behavior). A full-page route works too and is simpler.

**QuestArcMap.tsx:** The Play path's quest nodes should pull completion data from the same source as QuestArcMap. Share the QuestProgressContext.

**InvestorJourney.tsx:** The Fund path mirrors the InvestorJourney steps. Share completion state so progress on one updates the other.

---

## What Makes This Different from a Generic Progress Tracker

This isn't a progress bar with steps. It's a world. The map says: "Here is the place we're building together. Here is where you are in it. Here is what lights up when you show up."

Completing a node doesn't just fill a circle. It brings a piece of the world to life. The forge starts glowing. The river starts flowing through your section. The ancient tree grows a new branch. The world gets richer as you engage deeper.

When multiple players are active, you could eventually show aggregate community progress: how many people have lit up the Land path, how alive the village looks overall. That's a future feature, but the architecture should allow for it.

---

## Phased Build Plan

### Phase 1: Ship the Mini View + Skeleton Full View
- `mapData.ts` with all 4 paths, nodes, positions
- `useProgressMap.ts` aggregating existing progress sources
- `ProgressMapMini.tsx` grid widget in CommandPanel
- `ProgressMapSVG.tsx` constellation-style (like QuestArcMap) with 4 colored paths
- `ProgressMap.tsx` full-screen overlay with sidebar/sheet
- Basic node interactions (hover, click, state-dependent styling)

### Phase 2: Illustrated Landmarks
- Replace node circles with illustrated SVG vignettes
- Add terrain fills and landscape details
- Add the underground mycelium network visual
- Add the ReGen Tree centerpiece

### Phase 3: Animation + Server Sync
- CSS animations for water, smoke, mycelium pulse
- Server-side progress tracking (new DB table or userProfiles extension)
- Auto-detection of milestones (page visits, form submissions)
- Seasonal visual changes (the map reflects the current ReGen Civics season)

### Phase 4: Community Layer + Public Profiles
- Other players' progress visible as tiny lights on the map (confirmed by Rye)
- Each player's map is visible on their public profile page
- Aggregate progress visualization (how alive is the village overall?)
- Achievements and badges at path endpoints

### Phase 5: The Village (Post-Map Endgame)

When a player completes all nodes on all their active paths and reaches the ReGen Tree at the center, they "reach the village." The map view transitions into a new illustration: a regenerative, futuristic-yet-ancient elven village with food forests. This is the endgame space.

In the village, different elements react and respond to the player's ongoing participation in the game. Think of the map as the journey to get there, and the village as the place you live once you arrive. The village is alive, responsive, personal.

**This will be spec'd out separately.** For now, the architecture should assume that:
- There is a boolean or state transition: "player has reached the village"
- The ProgressMap component can swap its SVG to a different illustration at that point
- Village elements will need their own data model (which buildings are active, what's growing, what's been built)
- The village view replaces the map view in the command center and profile page once unlocked

This is a major feature on its own. Noting it here so the map architecture doesn't paint us into a corner.

---

## Decisions Made

1. **Path visibility:** Player's chosen path(s) are highlighted and alive. Other paths are greyed out but visible. All 4 paths are on the map, you just see your own lit up. CONFIRMED.

2. **Auto-tracking:** Auto-track wherever we have DB entries (form submissions, quest completions, application approvals, LOI submissions). CONFIRMED.

3. **Community visibility:** Yes, other players' progress is visible on the map. Each player's map is also displayed on their public profile. CONFIRMED.

4. **Village endgame:** When a player reaches the center (completes their paths), the map transitions to a village view. Spec'd separately, architecture should support the swap. CONFIRMED.

5. **Multiple paths:** Players can activate any combination of 1-4 paths simultaneously. Each path has an on/off toggle. All 4 paths are available to every player. Current DB has a single `path` enum on `userProfiles`, which needs to become a JSON array or a separate `userActivePaths` table. CONFIRMED.

## Illustration Approach: CONFIRMED

**Tool:** nano-banana-pro (Gemini 3 Pro Image API) at 4K resolution
**Style:** Hand-drawn line art with watercolor fills. Studio Ghibli meets treasure map cartography. Solarpunk aesthetic. Fine pen details on buildings and nature. Soft gradients for sky and terrain. Tiny details that reward zooming in.

**Assets to generate:**

1. **Full Map (hero):** Bird's-eye view of entire regenerative settlement, all 4 zones visible, the ReGen Tree at center, winding paths through distinct terrain. This is the background layer for the interactive SVG.
2. **Earth Zone (Land Path):** Terraced hillsides, food forests, seed vault, restoration trails. Deep greens, rich browns, amber. Landmarks: Trailhead, Seed Vault, Gathering Grove, Great Terrace, Summit Overlook.
3. **Water Zone (Ally Path):** River delta, connected settlements, bridges, meeting halls. Teals, deep blues, silver. Landmarks: River Dock, Bridge Market, Confluence Meeting Hall, Council Chamber, The Great Bridge.
4. **Air Zone (Play Path):** High ground, quest stone spiral, healing circles, ancient trees. Purples, soft golds, starlight white. Landmarks: Threshold Stone, Quest Stones, Midway Clearing, Speaking Circle, High Ring, Ancient Tree.
5. **Fire Zone (Fund Path):** Forge district, solar arrays, treasury hillside, exchange garden. Warm oranges, deep reds, amber glow. Landmarks: Observatory, Forge Amphitheatre, Exchange Garden, Treasury Gate, The Forge, Great Hall of the Forge, Flame Garden.
6. **ReGen Tree Centerpiece:** The great tree at the center with visible roots connecting to all zones via mycelium. Detailed, standalone asset.
7. **Village Endgame:** The regenerative futuristic-yet-ancient elven village with food forest. This replaces the map when a player reaches the center. Full scene, alive and detailed.

Each zone illustration will be generated as a standalone piece that can be composited into the full map SVG, or used as background imagery behind the interactive node layer. The full map hero piece establishes the overall composition and color harmony.

Production by Rye's directive: "No generalizations, make a high quality full production rendering to make it as stunning and beautiful as possible." Human artist support planned for future iterations, but the initial production run uses AI generation.

---

## Handoff Breakdown

### CLAUDE CODE can do (Phase 1):
- `mapData.ts` with all 4 paths (Land 5 nodes, Ally 5 nodes, Play 6 nodes, Fund 7 nodes), positions, connections
- `useProgressMap.ts` hook aggregating quest progress, investor journey, and DB-sourced completions
- `ProgressMapMini.tsx` grid widget in CommandPanel
- `ProgressMapSVG.tsx` constellation-style SVG (extending QuestArcMap patterns) with 4 colored paths, greyed-out inactive paths
- `ProgressMap.tsx` full-screen overlay with sidebar (desktop) and bottom sheet (mobile)
- Node interactions: hover tooltips, click-through CTAs, state-dependent styling
- Server-side progress tracking (DB table + tRPC routes)
- Profile page integration (render player's map on their public profile)

### RYE needs to:
- Provide direction on illustration style for Phase 2
- Eventually provide or commission illustrated landmark assets
- Spec out the Village endgame (Phase 5) when ready

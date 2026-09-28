# Quest Progression, Carousels, and Icon Spec

> Claude Code build prompt. Covers four interconnected changes:
> 1. Dynamic "Continue Your Journey" next-quest logic
> 2. Seasonal carousels combining Rites of Passage + seasonal depth quests
> 3. Epic quest carousel with Rites-gated locking
> 4. Tree-of-Life quest icon replacing WizardsFamilyIcon

---

## Part 1: Dynamic "Continue Your Journey" Next-Quest Logic

### Problem
The current mobile NextQuestCard (`client/src/components/mobile/NextQuestCard.tsx`) always links to `/quest` with generic "Pick your first quest" or "Keep going" copy. There is no personalized next-quest suggestion anywhere in the app. The fire quest always gets hero treatment regardless of whether the player already completed it.

### Solution
Create a `useNextQuest` hook that returns the single most relevant next quest for the current player, based on their progression through the Rites of Passage chain.

### Hook: `client/src/hooks/useNextQuest.ts`

```typescript
/**
 * useNextQuest - returns the single best "next quest" for the player.
 *
 * Priority order:
 *   1. Fire quest (quest-0) if not completed
 *   2. First uncompleted Rite in the current real-world season
 *   3. First uncompleted Rite in the next unlocked season (rotation order)
 *   4. First uncompleted seasonal depth quest for current season
 *   5. First uncompleted routine quest (quest-13, quest-14)
 *   6. null (all Rites done, show "Explore Epic Quests" prompt)
 */
```

**Input:** Uses `useQuestUnlocks()` and `useQuestProgressContext()` (both already exist).

**Data sources:**
- `questData` from `@/data/questData` (Rites of Passage, quests 0-12)
- `seasonalQuestsData` from `@/data/seasonalQuestsData` (18 depth quests)
- `useQuestUnlocks().currentSeason` for real-world season detection
- `useQuestProgressContext().isQuestCompleted(id)` for completion checks

**Return type:**
```typescript
type NextQuestResult = {
  questId: string;           // e.g. "quest-3"
  title: string;             // e.g. "Healing Wholes"
  subtitle: string;          // e.g. "Food Abundance"
  season: string | null;     // "spring" | "summer" | "fall" | "winter" | null
  questNumber: number | null; // 0-12 for Rites, null for seasonal/routine
  type: "fire" | "rite" | "seasonal" | "routine" | "epic";
  prompt: string;            // Contextual CTA text
} | null;
```

**Prompt text logic:**
- Fire incomplete: "Begin your journey"
- First Rite in a season: "Start your [Season] Rites"
- Continuing Rites in same season: "Continue your [Season] Rites"
- Crossing to new season: "Step into [Season]"
- Seasonal depth quests: "Deepen your practice"
- Routine quests: "Build your rhythm"
- All done: returns null (caller shows "Explore Epic Quests")

### Updated NextQuestCard (Mobile)

**File:** `client/src/components/mobile/NextQuestCard.tsx`

Replace the current generic logic with `useNextQuest()`. The card should:

1. Show the quest icon (use the quest's `icon` from questData, not the generic WizardsFamilyIcon)
2. Display "Continue Your Journey" as the header
3. Show the quest title as the main text: "Quest [N]: [Title]" for Rites, just "[Title]" for seasonal
4. Show `nextQuest.prompt` as the subtitle
5. Link to `/quest#quest-[id]` (anchor scroll to that quest's card)
6. If `nextQuest` is null and all Rites are complete, show "Explore Epic Quests" linking to `/quest#epic-quests`
7. If not authenticated, keep current "Start your first quest" behavior

**Visual treatment:**
- Keep the current green gradient card style
- Replace WizardsFamilyIcon with the TreeOfLifeIcon (see Part 4)
- Add a small season emoji next to the quest title (Spring: leaf, Summer: sun, Fall: maple leaf, Winter: snowflake)

### Quest Page Hero Treatment

**File:** `client/src/pages/Quest.tsx`

The fire quest currently always gets hero treatment at the top of the page. Change this:

1. If the player has NOT completed fire quest: show Fire quest as hero (current behavior)
2. If the player HAS completed fire quest: show their next uncompleted Rite as the hero card
3. If all Rites are complete: show a "Continue Your Journey" hero that highlights seasonal depth quests or epic quests
4. For unauthenticated users: always show Fire quest as hero (current behavior)

The hero card should use the existing `HeroQuestCard` component pattern with the quest's background image (`quest-NN-slug.webp`).

Add a "Continue Your Journey" banner above the hero card:
```
Continue Your Journey
Quest [N]: [Title] -- [Season] Rites of Passage
[Progress bar: X of 13 Rites completed]
```

The progress bar is a thin horizontal bar, forest green (`#4a7c59`), with completed segments filled and a gold shimmer on the leading edge.

---

## Part 2: Seasonal Carousels (Rites + Depth Quests Combined)

### Problem
Currently, Rites of Passage (quests 0-12) and seasonal depth quests (from `seasonalQuestsData`) are displayed in separate sections. The user asked for combined seasonal carousels where each season's carousel contains both its Rites AND its seasonal depth quests, with Rites visually distinguished by gold shimmer and numbering.

### Design

Each season gets one `QuestCarousel` containing cards in this order:
1. **Rites of Passage** (gold shimmer cards, numbered) for that season
2. **Seasonal depth quests** for that season (standard green cards, no number prefix)

No quest appears in more than one carousel. Fire quest (quest-0) sits above all carousels as a standalone hero or completed badge.

### Carousel Layout on Quest Page

Replace the current season-separated grid layout with four carousels:

```
[Continue Your Journey Hero]

[Season Progress Ring]

-- Spring Carousel --
  [Quest 1: Potion Brewing (gold)] [Quest 2: Saving Seeds (gold)] [Quest 3: Healing Wholes (gold)]
  [Healing the Five Bodies] [Study Natural Hygiene] [Launch a Community Currency]

-- Summer Carousel --
  [Quest 4: Dreaming Spaces (gold)] [Quest 5: Rites of Love (gold)] [Quest 6: Healing Circles (gold)]
  [Friendship with a Free Animal] [Your Honey Moon] [Singing to Your Food Forest]

-- Fall Carousel --
  [Quest 7: Wild Foraging (gold)] [Quest 8: Medicine Journey (gold)] [Quest 9: Tree Talk (gold)]
  [Future Casting] [Eating Sunlight] [Becoming Trauma Informed]

-- Winter Carousel --
  [Quest 10: Communication (gold)] [Quest 11: Coordination (gold)] [Quest 12: Breathplay (gold)]
  [Write a Children's Book] [Make a Song] [Recreate Your Personal Cycles]

-- Routine Quests (non-carousel, simple 2-card row) --
  [Quest 13: Fasting] [Quest 14: Love to Heal Your Body]

-- Epic Quests Carousel (locked until all Rites complete) --
```

### Season Carousel Header

Each carousel gets a header:

```
[Season Emoji] [Season Name] Rites & Quests   [X/3 Rites completed]
[Season tagline from SEASON_TAGLINES]
```

The current real-world season's carousel appears FIRST, then rotation order (same logic as `useQuestUnlocks`). The current season's header gets a subtle highlight border or background tint matching the season color palette from `SeasonalQuestFeed`.

### Card Visual Distinctions

**Rites of Passage cards (gold shimmer):**
- Use existing `quest-card-gold` shimmer class
- Show "Rite [N]" badge in top-left corner of the card image area: a small rounded pill with gold background (`bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5`)
- Card title format: "Quest [N]: [Title]"
- Border: `border-amber-400/40` (subtle gold border)
- Completed state: green checkmark badge overlay (existing `QuestCompletionBadge`)

**Seasonal depth quest cards (green shimmer):**
- Use existing `quest-card-green` shimmer class
- No number badge
- Card title format: just "[Title]"
- Border: standard `border-[#1a472a]/10`
- These cards need a simplified version of QuestCard since they come from `seasonalQuestsData` (different data shape)

### New Component: `SeasonalDepthCard`

**File:** `client/src/components/SeasonalDepthCard.tsx`

A card component for seasonal depth quests that matches the QuestCard visual style but accepts the `seasonalQuestsData` shape:

```typescript
interface SeasonalDepthCardProps {
  quest: {
    id: string;
    title: string;
    season: string;
    tagline: string;
    description: string;
    deliverable: string;
    estimatedTime: string;
    element: string;
    reward: { regen: number; rvoice: number };
  };
  isLocked: boolean;
}
```

Visual treatment:
- Same dimensions as QuestCard (fits in carousel)
- Element icon in the top-right corner (earth, water, fire, air emojis)
- Estimated time shown as a small pill
- No quest image (these don't have art yet), use a gradient placeholder matching the element color
- Element color mapping: earth = greens, water = blues, fire = oranges, air = purples

### Locked Carousel Behavior

If a season's Rites are locked (per `useQuestUnlocks`):
- The carousel still renders but all cards use `LockedQuestCard`
- The carousel header shows a lock icon and the unlock requirement text from `getSeasonLockReason(season)`
- Cards are slightly transparent (opacity-60) and non-interactive
- Seasonal depth quests in locked seasons are also locked (they require `allSeasonsComplete`)

### Data Mapping

Build the carousel data in Quest.tsx:

```typescript
// For each season, combine Rites + depth quests
const SEASON_CAROUSEL_DATA = SEASON_ORDER.map(season => ({
  season,
  rites: RITES_BY_SEASON[season].map(qId => {
    const num = parseInt(qId.replace('quest-', ''));
    const seasonData = questData[season]; // spring/summer/fall/winter arrays
    return seasonData.find(q => q.id === num);
  }).filter(Boolean),
  depthQuests: seasonalQuestsData.filter(sq => sq.season === season),
}));
```

### Quest Deduplication Rule
Each quest ID appears in exactly one carousel. The Fire quest (quest-0) is never in a carousel (it is the hero or a standalone card above). Routine quests (quest-13, quest-14) appear in their own small section below the seasonal carousels. "Anytime" seasonal depth quests appear in a fifth mini-carousel or appended to the current season's carousel.

---

## Part 3: Epic Quest Carousel with Rites Gate

### Current State
`EpicQuestSection` (`client/src/components/EpicQuestSection.tsx`) already exists with tier-based cards and a lock gate. It checks `useQuestUnlocks().isEpicUnlocked`.

### Changes

1. **Wrap epic cards in a QuestCarousel** instead of the current grid layout
2. **Order by tier**: Easy cards first, then Hard, then Expert
3. **Lock overlay**: When locked, show the existing gate banner with `SeasonProgressRing` and "Complete all 13 Rites of Passage to unlock Epic Quests (X/13)"
4. **Unlock animation**: When `isEpicUnlocked` is true for the first time, add a one-time celebration:
   - Brief golden particle burst animation on the section header
   - Cards fade in with a staggered entrance (each card 100ms delay)
   - Store "epic_unlock_celebrated" in localStorage so it only plays once

### Epic Carousel Header

```
Epic Quests -- Land Transformation Journeys
[SeasonProgressRing] [X/13 Rites Complete]
```

When locked, the header text is dimmed and shows the lock icon. When unlocked, full color with a subtle gold accent.

### Epic Card Enhancements

Add to each epic card:
- Duration badge: e.g. "1-3 years" in a small pill
- Commitment level indicator (small dot: green for easy, amber for hard, red for expert)
- Element icon matching the quest's element

---

## Part 4: Tree-of-Life Quest Icon

### Problem
The current quest icon is `WizardsFamilyIcon`, which loads `wizards-family.svg` via CSS mask. The user wants a tree-of-life design with a trail/path beneath it, better reflecting the quest journey metaphor.

### Design Direction

The icon should combine:
- A **tree** silhouette (trunk, branches, canopy, visible root system)
- A **winding trail/path** beneath the tree, leading toward or around it
- Clean enough to read at 18-28px (mobile tab bar and nav sizes)
- Works as a single-color mask (current WizardsFamilyIcon uses CSS mask with `backgroundColor: currentColor`)

### SVG Spec: `client/public/images/icons/tree-of-life-quest.svg`

Create a new SVG icon (24x24 viewBox) with these elements:

```
Viewbox: 0 0 24 24

Tree structure:
- Canopy: organic circular/cloud shape, top half of the icon (y: 1-12)
- Trunk: single line or narrow rectangle, center (x: 11-13, y: 10-16)
- Roots: 3-5 spreading lines mirroring branches, subtle (y: 16-18)
- Branches: 2-3 per side, organic curves reaching into canopy

Path/trail:
- A winding S-curve path starting from bottom-center (y: 22-24)
- Curves up toward the tree base
- Width: 1.5-2px stroke
- The path should feel like a walking trail approaching the tree

Style:
- All paths use fill="currentColor" (no stroke, filled shapes for mask compatibility)
- Single color, no gradients
- Clean silhouette that reads well at small sizes
```

### Implementation

**Option A (recommended): Inline SVG component**

Create `client/src/components/icons/TreeOfLifeIcon.tsx`:

```typescript
type Props = {
  className?: string;
  size?: number;
  color?: string;
};

export function TreeOfLifeIcon({ className = "", size = 20, color }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={{ color }}
      aria-hidden="true"
    >
      {/* Canopy */}
      <path d="..." />
      {/* Trunk */}
      <rect x="11" y="10" width="2" height="6" rx="0.5" />
      {/* Roots */}
      <path d="..." />
      {/* Trail */}
      <path d="..." />
    </svg>
  );
}
```

This approach is better than the CSS mask approach because:
- No external file to load (eliminates FOUC)
- Works with `currentColor` natively
- Can be tree-shaken if unused
- Easier to iterate on the paths

**Option B: Keep the mask approach**

Drop a new SVG file at `client/public/images/icons/tree-of-life-quest.svg` and update WizardsFamilyIcon to reference it. Rename the component to `QuestIcon` or `TreeOfLifeIcon`.

### Replacement Locations

Replace `WizardsFamilyIcon` with `TreeOfLifeIcon` everywhere:

| File | Line(s) | Context |
|------|---------|---------|
| `client/src/components/Navigation.tsx` | 24 (import), 246, 815 | Desktop dropdown + mobile drawer |
| `client/src/components/mobile/MobileTabBar.tsx` | 13 (import), 40 | Bottom tab bar icon |
| `client/src/components/mobile/NextQuestCard.tsx` | 12 (import), 49 | Mobile more menu card |

Steps:
1. Create `TreeOfLifeIcon` component
2. Find-and-replace all `WizardsFamilyIcon` imports with `TreeOfLifeIcon`
3. Update all `<WizardsFamilyIcon` usages to `<TreeOfLifeIcon`
4. Keep `WizardsFamilyIcon.tsx` file but add a deprecation comment pointing to `TreeOfLifeIcon`
5. Keep `wizards-family.svg` in public/ as fallback

### Icon Sizing Reference

Current WizardsFamilyIcon sizes in use:
- Mobile tab bar: `size={28}` (primary/elevated tab)
- Desktop dropdown: `size={20}`
- Mobile drawer: `size={18}`
- NextQuestCard: `size={28}`

TreeOfLifeIcon should look good at all these sizes. Test especially at 18px (smallest usage) to make sure the trail detail is still readable. If the trail disappears at small sizes, simplify it to a straight line or remove it below 20px.

---

## Part 5: Implementation Order

### Phase 1: Icon (standalone, no dependencies)
1. Create `TreeOfLifeIcon` component with inline SVG
2. Replace all `WizardsFamilyIcon` references
3. Test at all sizes in nav, tab bar, and next-quest card

### Phase 2: useNextQuest hook (foundational)
1. Create `useNextQuest` hook
2. Update `NextQuestCard` to use it
3. Test with various completion states (0 quests, mid-progression, all Rites done)

### Phase 3: Seasonal carousels (largest change)
1. Create `SeasonalDepthCard` component
2. Build carousel data structure combining Rites + depth quests
3. Replace current Quest.tsx layout with carousel-per-season
4. Update hero card to use `useNextQuest` for dynamic hero selection
5. Add "Continue Your Journey" banner with progress bar
6. Handle "anytime" depth quests (append to current season or separate section)

### Phase 4: Epic carousel refinement
1. Wrap `EpicQuestSection` cards in `QuestCarousel`
2. Add unlock celebration animation
3. Add duration/commitment badges to epic cards

### Phase 5: Polish and verify
1. Test full progression: new user -> fire -> Rites -> seasonal -> epic
2. Test locked states render correctly for each season
3. Test mobile carousel touch/swipe on all four seasonal carousels
4. Verify no quest appears in more than one carousel
5. Check that the current-season carousel appears first
6. Verify `SeasonProgressRing` updates correctly as Rites are completed

---

## Files to Create

| File | Purpose |
|------|---------|
| `client/src/hooks/useNextQuest.ts` | Next-quest recommendation logic |
| `client/src/components/icons/TreeOfLifeIcon.tsx` | New quest icon (inline SVG) |
| `client/src/components/SeasonalDepthCard.tsx` | Card for seasonal depth quests in carousels |

## Files to Modify

| File | Changes |
|------|---------|
| `client/src/pages/Quest.tsx` | Carousel layout, dynamic hero, "Continue Your Journey" banner |
| `client/src/components/mobile/NextQuestCard.tsx` | Use `useNextQuest`, show specific quest info |
| `client/src/components/mobile/MobileTabBar.tsx` | Replace WizardsFamilyIcon with TreeOfLifeIcon |
| `client/src/components/Navigation.tsx` | Replace WizardsFamilyIcon with TreeOfLifeIcon |
| `client/src/components/EpicQuestSection.tsx` | Wrap in QuestCarousel, add celebration animation |
| `client/src/components/SeasonalQuestFeed.tsx` | May be deprecated or refactored into the carousel system |

## No Database Changes Required

All progression data already exists in `playerProfiles.questsCompleted` (JSON array) and `questCompletions` table. The `useQuestUnlocks` hook and `useQuestProgressContext` already provide all needed state. This is a purely frontend change.

---

## Design Reference

### Color Palette (from REGEN_GAMES_SPEC_V1)
- Warm cream background: `#FAF8F3` / `bg-[#f0ebe3]`
- Forest green: `#1a472a`
- Accent green: `#7dd87d`
- Sage: `#4a7c59`
- Gold (Rites shimmer): `amber-400` / `amber-500`
- Season colors: Spring emerald, Summer amber, Fall orange, Winter slate

### Card Sizing
- Carousel cards: `w-[280px] sm:w-[300px] md:w-[320px] lg:w-[340px]` (existing QuestCarousel sizing)
- Card image height: `h-36` (existing)
- Card padding: `p-5` (existing)

### Season Emojis
- Spring: 🌱
- Summer: ☀️
- Fall: 🍂
- Winter: ❄️

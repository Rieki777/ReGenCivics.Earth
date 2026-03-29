# Claude Code Session: Quest Progression Locking System

**Date:** 2026-03-28
**Project:** regen-civics-clean

**Read `CLAUDE.md` before writing any user-facing copy.** Writing rules are non-negotiable: zero em-dashes, no AI-isms, no contrast-framing, no rhetorical questions, no passive inspiration.

**Read `QUEST_PROGRESSION_SPEC.md` for the full design spec.** This prompt tells you what to build. The spec tells you why and how it works.

**Dependency:** Run `CLAUDE_CODE_PROMPT_2026-03-28_MAP_PERF.md` first. It generates the two hero images this prompt uses (`quest-fire-hero.webp` and `quest-food-foresting-hero.webp`).

---

## What You're Building

A quest locking and progression system. All quests are locked except Fire and Food Foresting. Completing quests unlocks more quests in a chain. 5 parts, in order. Run `pnpm build` after each.

---

### Part 1: Create the useQuestUnlocks Hook

**File:** `client/src/hooks/useQuestUnlocks.ts` (new)

This hook derives all unlock state from the existing `useQuestProgress` hook. It does NOT write any new data. It reads what's already tracked and computes what should be unlocked.

```typescript
import { useQuestProgress } from "./useQuestProgress";

type Season = "spring" | "summer" | "fall" | "winter";

const SEASON_ORDER: Season[] = ["spring", "summer", "fall", "winter"];

const RITES_BY_SEASON: Record<Season, string[]> = {
  spring: ["quest-1", "quest-2", "quest-3"],
  summer: ["quest-4", "quest-5", "quest-6"],
  fall: ["quest-7", "quest-8", "quest-9"],
  winter: ["quest-10", "quest-11", "quest-12"],
};

// All seasonal practice quest IDs (from seasonalQuestsData.ts)
const SEASONAL_PRACTICE_IDS: string[] = [
  "healing-five-bodies", "study-natural-hygiene", "community-currency",
  "friendship-free-animal", "honey-moon", "singing-food-forest",
  "regen-financial-systems", "animal-spirit-totems", "decrease-expenses",
  "healing-five-bodies-fall", "wild-crafting", "council-of-all-beings",
  "communication-nvc", "coordination-sociocracy", "winter-solstice",
  "star-gazing", "ice-swimming", "dream-journal",
];

function getCurrentSeason(): Season {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

export function useQuestUnlocks() {
  const { isQuestCompleted } = useQuestProgress();

  const fireComplete = isQuestCompleted("quest-0");

  // Which seasons have at least 1 completed Rite?
  const completedSeasons = SEASON_ORDER.filter(season =>
    RITES_BY_SEASON[season].some(qId => isQuestCompleted(qId))
  );

  // First unlocked season = current real-world season
  const startSeason = getCurrentSeason();
  const startIdx = SEASON_ORDER.indexOf(startSeason);

  // Build the unlock chain from the start season
  const unlockedSeasons: Season[] = [];
  if (fireComplete) {
    unlockedSeasons.push(startSeason);
    for (let i = 1; i < 4; i++) {
      const prevSeason = SEASON_ORDER[(startIdx + i - 1) % 4];
      const nextSeason = SEASON_ORDER[(startIdx + i) % 4];
      if (completedSeasons.includes(prevSeason)) {
        unlockedSeasons.push(nextSeason);
      } else {
        break;
      }
    }
  }

  const allSeasonsComplete = completedSeasons.length === 4;

  const isQuestUnlocked = (questId: string): boolean => {
    // Fire and Food Foresting: always unlocked
    if (questId === "quest-0" || questId === "food-foresting") return true;
    // Fasting: unlocked with all seasons
    if (questId === "quest-13") return allSeasonsComplete;
    // Rites of Passage: check if quest's season is unlocked
    for (const [season, ids] of Object.entries(RITES_BY_SEASON)) {
      if (ids.includes(questId)) return unlockedSeasons.includes(season as Season);
    }
    // Seasonal Practices: need all 4 seasons
    if (SEASONAL_PRACTICE_IDS.includes(questId)) return allSeasonsComplete;
    // Epic quests: need all 4 seasons
    if (questId.startsWith("epic-")) return allSeasonsComplete;
    // Unknown quest: default unlocked
    return true;
  };

  return {
    fireComplete,
    unlockedSeasons,
    completedSeasons,
    allSeasonsComplete,
    isSeasonUnlocked: (s: Season) => unlockedSeasons.includes(s),
    isQuestUnlocked,
    isEpicUnlocked: allSeasonsComplete,
    isSeasonalPracticeUnlocked: allSeasonsComplete,
    seasonProgress: { completed: completedSeasons.length, total: 4 },
  };
}
```

**IMPORTANT:** Check the actual quest IDs used in `questData.ts` and `seasonalQuestsData.ts`. The IDs above (`quest-0`, `quest-1`, etc.) are based on the pattern I saw in the data. Verify and adjust the ID format to match what `useQuestProgress` actually stores. The hook must use the same quest ID strings that `isQuestCompleted()` checks against.

Also verify the seasonal practice IDs against `seasonalQuestsData.ts`. Update `SEASONAL_PRACTICE_IDS` to match the actual `id` fields.

**Run `pnpm build`.**

---

### Part 2: Create the LockedQuestCard Component

**File:** `client/src/components/LockedQuestCard.tsx` (new)

A greyed-out, non-interactive quest card with a light green lock icon.

```tsx
import { Lock } from "lucide-react";

interface LockedQuestCardProps {
  title: string;
  subtitle: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function LockedQuestCard({ title, subtitle, icon: Icon }: LockedQuestCardProps) {
  return (
    <div className="relative rounded-xl border border-white/5 bg-white/[0.02] p-5 opacity-40 grayscale select-none cursor-default">
      {/* Lock badge - top right */}
      <div className="absolute top-3 right-3 bg-emerald-400/10 rounded-full p-1.5">
        <Lock className="w-4 h-4 text-emerald-400/70" />
      </div>

      {/* Icon */}
      {Icon && (
        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5 text-white/30" />
        </div>
      )}

      {/* Title and subtitle visible so players see what's coming */}
      <h3 className="text-sm font-semibold text-white/60 truncate pr-8">{title}</h3>
      <p className="text-xs text-white/30 mt-1 line-clamp-2">{subtitle}</p>
    </div>
  );
}
```

Match the card dimensions and spacing to the existing quest cards in `Quest.tsx`. The locked card should be the same size as an unlocked card so the layout doesn't shift.

**Run `pnpm build`.**

---

### Part 3: Create the HeroQuestCard Component

**File:** `client/src/components/HeroQuestCard.tsx` (new)

An enhanced quest card with a background image. Used for Fire and Food Foresting.

```tsx
interface HeroQuestCardProps {
  bgImage: string;       // Path to WebP background
  children: React.ReactNode; // Existing card content
  glowColor?: string;    // Border glow color (amber for Fire, emerald for Food Forest)
  pulse?: boolean;       // Soft pulse animation when player hasn't started
}

export function HeroQuestCard({ bgImage, children, glowColor = "amber", pulse = false }: HeroQuestCardProps) {
  return (
    <div
      className={`relative rounded-xl overflow-hidden border transition-all ${
        pulse ? "animate-pulse-subtle" : ""
      }`}
      style={{
        borderColor: glowColor === "amber"
          ? "rgba(245, 158, 11, 0.5)"
          : "rgba(52, 211, 153, 0.5)",
        boxShadow: `0 0 20px ${
          glowColor === "amber"
            ? "rgba(245, 158, 11, 0.15)"
            : "rgba(52, 211, 153, 0.15)"
        }`,
      }}
    >
      {/* Background image with dark overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

      {/* Card content on top */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
```

Add the pulse animation to your Tailwind config or as a CSS keyframe:

```css
@keyframes pulse-subtle {
  0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.15); }
  50% { box-shadow: 0 0 30px rgba(245, 158, 11, 0.3); }
}
.animate-pulse-subtle {
  animation: pulse-subtle 3s ease-in-out infinite;
}
```

**Image paths:**
- Fire: `/images/quests/quest-fire-hero.webp`
- Food Foresting: `/images/quests/quest-food-foresting-hero.webp`

If these images don't exist yet (they're generated by the MAP_PERF prompt), use a gradient fallback:
```typescript
const FIRE_BG = "/images/quests/quest-fire-hero.webp";
const FOOD_FOREST_BG = "/images/quests/quest-food-foresting-hero.webp";
// Fallback check happens via onError on an img element, or just use the path directly
```

**Run `pnpm build`.**

---

### Part 4: Create the SeasonProgressRing Component

**File:** `client/src/components/SeasonProgressRing.tsx` (new)

Shows which seasons have been completed. 4 dots with season labels.

```tsx
import { useQuestUnlocks } from "@/hooks/useQuestUnlocks";

const SEASONS = [
  { key: "spring" as const, label: "Spring", emoji: "🌱" },
  { key: "summer" as const, label: "Summer", emoji: "☀️" },
  { key: "fall" as const, label: "Fall", emoji: "🍂" },
  { key: "winter" as const, label: "Winter", emoji: "❄️" },
];

export function SeasonProgressRing() {
  const { completedSeasons, seasonProgress } = useQuestUnlocks();

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-3">
        {SEASONS.map(({ key, label, emoji }) => {
          const done = completedSeasons.includes(key);
          return (
            <div key={key} className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                  done
                    ? "bg-emerald-500/20 border-2 border-emerald-400"
                    : "bg-white/5 border-2 border-white/10"
                }`}
              >
                {emoji}
              </div>
              <span className={`text-[10px] ${done ? "text-emerald-400" : "text-white/30"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-white/50">
        {seasonProgress.completed} of {seasonProgress.total} seasons complete
      </p>
    </div>
  );
}
```

**Run `pnpm build`.**

---

### Part 5: Wire Everything Into the Quest Page

This is the integration step. Modify existing components to use the new unlock system.

**5a. Quest.tsx: Add unlock checks to Rites of Passage cards**

**File:** `client/src/pages/Quest.tsx`

Import the new components and hook:
```typescript
import { useQuestUnlocks } from "@/hooks/useQuestUnlocks";
import { LockedQuestCard } from "@/components/LockedQuestCard";
import { HeroQuestCard } from "@/components/HeroQuestCard";
```

Find where the Fire quest (Quest 0 / intro) card is rendered. Wrap it with `HeroQuestCard`:
```tsx
<HeroQuestCard
  bgImage="/images/quests/quest-fire-hero.webp"
  glowColor="amber"
  pulse={!fireComplete}
>
  {/* existing Fire card content */}
</HeroQuestCard>
```

Find where the Food Foresting (featured) card is rendered. Wrap it with `HeroQuestCard`:
```tsx
<HeroQuestCard
  bgImage="/images/quests/quest-food-foresting-hero.webp"
  glowColor="emerald"
>
  {/* existing Food Foresting card content */}
</HeroQuestCard>
```

For each seasonal Rites of Passage quest card (spring, summer, fall, winter arrays), add an unlock check:
```tsx
{questData.spring.map((quest) => {
  const unlocked = isQuestUnlocked(`quest-${quest.id}`);
  if (!unlocked) {
    return <LockedQuestCard key={quest.id} title={quest.title} subtitle={quest.subtitle} icon={quest.icon} />;
  }
  return (
    // existing quest card rendering
  );
})}
```

Do the same for summer, fall, winter, and the routine quest (Fasting / quest-13).

**5b. EpicQuestSection.tsx: Add gate banner**

**File:** `client/src/components/EpicQuestSection.tsx`

Import the hook and ring:
```typescript
import { useQuestUnlocks } from "@/hooks/useQuestUnlocks";
import { SeasonProgressRing } from "@/components/SeasonProgressRing";
import { LockedQuestCard } from "@/components/LockedQuestCard";
```

At the top of the component, check the gate:
```tsx
const { isEpicUnlocked } = useQuestUnlocks();
```

If locked, show the gate banner above the epic cards:
```tsx
{!isEpicUnlocked && (
  <div className="text-center py-8 space-y-4">
    <p className="text-sm text-white/50">
      Complete at least 1 Rite in each season to unlock Epic Quests
    </p>
    <SeasonProgressRing />
  </div>
)}
```

When locked, render each EpicCard with the locked treatment (grey + lock). When unlocked, render normally.

**5c. SeasonalQuestFeed.tsx: Add lock treatment**

**File:** `client/src/components/SeasonalQuestFeed.tsx`

Import the hook:
```typescript
import { useQuestUnlocks } from "@/hooks/useQuestUnlocks";
import { LockedQuestCard } from "@/components/LockedQuestCard";
```

When seasonal practices are locked, show a section-level message:
```tsx
const { isSeasonalPracticeUnlocked } = useQuestUnlocks();

{!isSeasonalPracticeUnlocked && (
  <p className="text-sm text-white/40 text-center py-4">
    Complete the Rites of Passage to unlock Seasonal Practices
  </p>
)}
```

Render each seasonal practice card with locked treatment when `!isSeasonalPracticeUnlocked`.

**Run `pnpm build`.**

---

## What NOT To Do

- Do NOT change quest data files (questData.ts, epicQuestsData.ts, seasonalQuestsData.ts). Data stays the same.
- Do NOT hide locked quest cards entirely. Players see what's coming. Grey them out, don't remove them.
- Do NOT block forum thread links. Lock is on the quest page UI only.
- Do NOT modify the useQuestProgress hook. The unlock hook reads from it.
- Do NOT add backend code or database changes. This is entirely frontend.
- Do NOT generate any images. The hero images are generated by the MAP_PERF prompt. If they don't exist yet, use gradient fallbacks.

---

## Done Criteria

- [ ] `pnpm build` passes with zero errors
- [ ] `useQuestUnlocks` hook exists and correctly derives unlock state
- [ ] Fire quest card has background image with dark overlay, amber glow
- [ ] Food Foresting card has background image with dark overlay, emerald glow
- [ ] Fire card has subtle pulse animation when player hasn't started
- [ ] All Rites of Passage cards show locked state (grey + green lock) before Fire is complete
- [ ] Completing Fire unlocks the current real-world season's Rites
- [ ] Completing 1 Rite unlocks the next season in rotation (Spring > Summer > Fall > Winter > Spring)
- [ ] Seasonal Practices show locked state with gate message when not all 4 seasons complete
- [ ] Epic Quest section shows locked state with SeasonProgressRing
- [ ] All 4 seasons complete unlocks Seasonal Practices, Epics, and Fasting
- [ ] Lock icon is emerald-400, top-right of locked cards
- [ ] Locked cards show title and subtitle but are not clickable
- [ ] SeasonProgressRing shows X/4 seasons complete
- [ ] Food Foresting pinned as always-available in Anytime section
- [ ] Zero em-dashes in any user-facing copy

---

## Handoff Breakdown

### Rye: things only you can do

| # | Task | Why |
|---|------|-----|
| 1 | `git push` after Claude Code finishes | Git credentials |
| 2 | Visual QA on locked/unlocked card states | Taste and feel |
| 3 | Confirm hero image backgrounds look right | Art direction |

### Claude Code: can do without you

| # | Task | Status |
|---|------|--------|
| 1 | Create useQuestUnlocks hook | READY |
| 2 | Create LockedQuestCard component | READY |
| 3 | Create HeroQuestCard component | READY |
| 4 | Create SeasonProgressRing component | READY |
| 5 | Wire unlock checks into Quest.tsx | READY |
| 6 | Add gate banner to EpicQuestSection.tsx | READY |
| 7 | Add lock treatment to SeasonalQuestFeed.tsx | READY |

Nothing is blocked. If hero images don't exist yet, use gradient fallbacks and note it.

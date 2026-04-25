# ReGen Civics — Site Upgrade Tasks

This document defines 6 targeted fixes to be applied to the codebase. Work through them in order. Each section specifies the exact files to change, what to change, and why.

---

## Task 1 — Revert Home Page Background

**Problem:** A recent change introduced a conditional background that swaps the image based on whether the visitor is a "return visitor." This is causing visual problems.

**Fix:** Use a single background image for all visitors. Remove the `isReturnVisitor` conditional for the background image only. Keep the `ProgressiveOnboarding` display logic untouched.

**File:** `client/src/pages/Home.tsx`

Find this block (around line 167):
```ts
const bgImage = isReturnVisitor
  ? "https://assets.regencivics.earth/OySlQvtOgDYjZaIa.webp"
  : "https://assets.regencivics.earth/YPVdYWGRrdEquJbO.webp"; // Seamless desktop background
```

Replace with:
```ts
const bgImage = "https://assets.regencivics.earth/YPVdYWGRrdEquJbO.webp"; // Seamless desktop background
```

The `isReturnVisitor` variable is still used for the `ProgressiveOnboarding` conditional rendering block below — leave that logic completely alone. Only the background image assignment changes.

---

## Task 2 — Remove Duplicate / Stale Chatbot Structure

**Problem:** The user sees signs of old and new chatbot code coexisting. The canonical chatbot is `ReGenGuide.tsx` (floating widget, SSE streaming, mounted in `App.tsx`). `AIChatBox.tsx` is the UI sub-component it uses — keep both.

**Steps:**

1. Confirm that `ReGenGuide` is the only chat widget mounted in the app. In `client/src/App.tsx`, verify it appears at the line:
   ```tsx
   {!adminMode && <ReGenGuide />}
   ```
   If any other chat-related component is being rendered anywhere in `App.tsx` or the page tree, remove it.

2. Check `client/src/components/` for any other chatbot-style components (e.g. `ChatWidget.tsx`, `AIChat.tsx`, `ChatBot.tsx`, or similar). If found, confirm they are not imported or used anywhere active in the app — if unused, delete them.

3. `FirstVisitOnboarding.tsx` is **not** a chatbot — it is a path selection popup (handled in Task 5). Do not touch it here.

4. `AIChatBox.tsx` is a shared UI component used exclusively by `ReGenGuide.tsx`. Keep it as-is.

No deletions of `ReGenGuide.tsx` or `AIChatBox.tsx`.

---

## Task 3 — Fix, Rename, and Improve the Chatbot

**Problem:** The chatbot title shows "ReGen Guide" but should be "Your ReGen Guide". The chatbot may not be responding if `ANTHROPIC_API_KEY` is missing from the environment. The welcome message and error copy should be warmer and more personal-assistant-like.

### 3a. Rename the chatbot title

**File:** `client/src/components/ReGenGuide.tsx`

Find (around line 139):
```tsx
>
  ReGen Guide
</span>
```

Replace with:
```tsx
>
  Your ReGen Guide
</span>
```

Also update the aria-labels on the floating button (around line 180):
- `"Open ReGen Guide"` → `"Open Your ReGen Guide"`
- `"Close ReGen Guide"` → `"Close Your ReGen Guide"`

### 3b. Update the default welcome message

**File:** `client/src/components/ReGenGuide.tsx`

Find the default welcome message (around line 28–29):
```ts
: "Welcome to ReGen Civics! I can help you understand the Fund, the Infinite Game, how to participate, or anything else about our regenerative ecosystem. What would you like to know?";
```

Replace with:
```ts
: "Hi! I'm your personal ReGen Guide. I can help you explore the Fund, understand the Infinite Game, find your path, or answer any questions about the regenerative ecosystem. What would you like to know?";
```

### 3c. Update per-path welcome messages

**File:** `client/src/components/ReGenGuide.tsx`

Replace the `PATH_WELCOMES` object (lines 11–16) with:
```ts
const PATH_WELCOMES: Record<string, string> = {
  investor: "Welcome back! As your personal guide, I can help you explore investment opportunities, understand our fund structure, review the seasonal accelerator model, or connect you to the right resources. What can I help you with?",
  land_project: "Welcome back! I'm here to support your land project journey — whether that's showcasing your project, connecting with investors, navigating the platform, or understanding the accelerator. What would you like to explore?",
  ally: "Welcome back! I can help you understand partnership opportunities, how Alliance Partners contribute to the ecosystem, and how your organisation can plug in and add value. What are you curious about?",
  player: "Welcome, Player! I'm your guide to Quests, the Infinite Game, token rewards, and all the ways you can contribute and co-create. What would you like to know?",
};
```

### 3d. Update the error fallback message

**File:** `client/src/components/ReGenGuide.tsx`

Find the error message (around line 113–115):
```ts
content:
  "Sorry, I had trouble processing that. Please try again or visit our /schedule page to join a live session where the team can help directly.",
```

Replace with:
```ts
content:
  "Sorry, I ran into a hiccup. Please try again in a moment — or visit /schedule to book a live session with the team.",
```

### 3e. Update the system prompt name

**File:** `server/_core/oauth.ts`

Find the first line of `CHAT_SYSTEM_PROMPT` (around line 11):
```ts
export const CHAT_SYSTEM_PROMPT = `You are the ReGen Civics Guide, a helpful assistant on the ReGen Civics website.
```

Replace with:
```ts
export const CHAT_SYSTEM_PROMPT = `You are "Your ReGen Guide", a warm and knowledgeable personal assistant on the ReGen Civics website.
```

### 3f. Verify the API key is configured

Check that `ANTHROPIC_API_KEY` is present in the production environment (Railway). In `server/_core/env.ts`, confirm the key is referenced. If it is missing from production secrets, the chatbot will silently fail. This does not require a code change — it's a deployment configuration check. Confirm the key is set in Railway's environment variables panel.

---

## Task 4 — Remove the LiveStats Banner from the Home Page

**Problem:** The stats banner shows 0s across the board (Applications Received, Community Members, Active Land Projects, Investors Committed). It looks broken and undermines trust.

**Fix:** Remove `LiveStats` from the home page entirely until real data is available.

**File:** `client/src/pages/Home.tsx`

Step 1 — Remove the import (around line 45):
```ts
import { LiveStats } from "@/components/LiveStats";
```
Delete this line.

Step 2 — Remove the usage. Search for `<LiveStats />` in the file and delete that line entirely (it will be on its own line inside a section). There should be exactly one occurrence.

Do not delete the `LiveStats.tsx` component file itself — just remove it from the home page so it can be re-enabled later when real data exists.

---

## Task 5 — Remove the First-Visit Path Selection Popup

**Problem:** After login, a full-screen overlay appears asking "Which best describes you?" (Investor / Land Project / Alliance Partner / Player). This is redundant because the home page landing experience already handles path orientation. The popup creates friction.

**Fix:** Remove `PathOnboarding` / `PathSelectionScreen` from `App.tsx`.

**File:** `client/src/App.tsx`

Step 1 — Remove the import (around line 21):
```tsx
import { PathSelectionScreen } from "./components/PathSelectionScreen";
```
Delete this line.

Step 2 — Remove the `PathOnboarding` function entirely (around lines 166–189). Delete this whole block:
```tsx
// Shows PathSelectionScreen once for newly-authenticated users who haven't chosen a path
function PathOnboarding() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  // ... full function body ...
  return <PathSelectionScreen onComplete={() => setDismissed(true)} />;
}
```

Step 3 — Remove the usage (around line 228):
```tsx
{!adminMode && <PathOnboarding />}
```
Delete this line.

Step 4 — After removing `PathOnboarding`, check if `useState` and `useEffect` imports from React are now unused in App.tsx (they may have been used only by this function). If the file still uses them elsewhere, leave the imports. If not, clean them up.

Do not delete `PathSelectionScreen.tsx` from the components folder — just stop mounting it.

Also check: `FirstVisitOnboarding.tsx` is a separate older localStorage-based popup that does the same thing. Confirm it is NOT currently mounted anywhere in `App.tsx` or any page component. If it is mounted somewhere, remove that usage too. Do not delete the file.

---

## Task 6 — Fix Quest Card Images on the /quest Page

**Problem:** The quest cards on the `/quest` page each try to load an illustration from the `assets.regencivics.earth/quests/` CDN. All 12 seasonal quest images are returning 404s, so every card is currently showing a grey placeholder icon and the raw filename — which looks completely broken.

**How quest images currently work in `client/src/pages/Quest.tsx`:**

```ts
const QUEST_IMG_BASE = "https://assets.regencivics.earth/quests";
const questImageUrl = (id: number, slug: string) =>
  `${QUEST_IMG_BASE}/quest-${String(id).padStart(2, "0")}-${slug}.png`;
```

`QuestCard` renders an `<img>` with `src={questImageUrl(id, slug)}`. When that errors, it sets `imgError = true` and shows a fallback placeholder icon + filename text.

**The 12 quest CDN URLs that are broken:**

| ID | Slug |
|----|------|
| 01 | potion-brewing |
| 02 | saving-seeds |
| 03 | healing-wholes |
| 04 | dreaming-spaces-of-love |
| 05 | rites-of-love |
| 06 | healing-circles |
| 07 | wild-foraging |
| 08 | medicine-journey |
| 09 | tree-talk |
| 10 | communication-patterns |
| 11 | coordination-patterns |
| 12 | breathplay-future-dreaming |

Also create one for the intro quest: `quest-00-fire`.

---

### Step 1 — Generate images using nano-banana-pro skill

Use the `nano-banana-pro` skill to generate all 13 quest images. The `GEMINI_API_KEY` is already set in Windows System Environment Variables. Images save to two places: the `Nano Photos/quests/` archive folder and `client/public/images/quests/` for the site.

Create both directories first:
```bash
mkdir -p "Nano Photos/quests"
mkdir -p client/public/images/quests
```

Then generate each image (run from the project root). The skill defaults to 4K:

```bash
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "A single sacred flame burning amber-gold, rising from dark ancient earth. Embers and sparks float upward into a deep forest night. The fire pulses with living warmth. Dark fantasy digital art, cinematic. Deep dark green background, flame in gold and amber. Regenerative earth aesthetic. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-00-fire.png"
cp "Nano Photos/quests/quest-00-fire.png" client/public/images/quests/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "A clay cauldron bubbling with glowing spring-green liquid over a small fire, herbs and botanicals scattered around it on dark earth. Magical alchemy of plants. Dark fantasy digital art. Spring season, warm amber firelight, emerald green glowing brew. Regenerative nature aesthetic. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-01-potion-brewing.png"
cp "Nano Photos/quests/quest-01-potion-brewing.png" client/public/images/quests/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Two cupped hands gently holding a small cluster of seeds, a single delicate sprout emerging from one seed. Warm golden light from above, dark earth background. Intimate, sacred, hopeful. Spring season. Dark forest aesthetic with warm earth tones. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-02-saving-seeds.png"
cp "Nano Photos/quests/quest-02-saving-seeds.png" client/public/images/quests/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "A soft radiant circle of white-gold light, like a healed wound or a full moon glowing through mist, surrounded by gentle silhouettes of leaves and petals. Feeling of wholeness, completion, restoration. Spring. Dark forest background, luminous center. Digital art. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-03-healing-wholes.png"
cp "Nano Photos/quests/quest-03-healing-wholes.png" client/public/images/quests/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Two human silhouettes lying beneath a vast star-filled summer sky, heart-shaped nebulae and constellations glowing above them. Dream-like, romantic, cosmic. Deep indigo night sky, golden stars, warm rose and coral glow on the horizon. Digital fantasy art. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-04-dreaming-spaces-of-love.png"
cp "Nano Photos/quests/quest-04-dreaming-spaces-of-love.png" client/public/images/quests/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "A ceremonial archway of intertwined flowering branches, warm golden light streaming through. Ritual portal, sacred passage, summer bloom. Coral and rose flowers, green foliage, golden light. Dark forest background. Feeling of love as a rite of passage. Digital art. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-05-rites-of-love.png"
cp "Nano Photos/quests/quest-05-rites-of-love.png" client/public/images/quests/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "A circle of people viewed from above, their silhouettes holding hands around a glowing amber-gold center light. Healing circle, communal ritual, summer gathering. Warm golden tones, dark forest backdrop, figures in harmony. Digital art. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-06-healing-circles.png"
cp "Nano Photos/quests/quest-06-healing-circles.png" client/public/images/quests/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "A rich cluster of wild mushrooms of varying sizes emerging from forest floor, surrounded by fallen autumn leaves and wild plants. Deep amber, russet and brown fall tones, green forest floor. Earthy, abundant, forager's paradise. Dark fantasy digital art. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-07-wild-foraging.png"
cp "Nano Photos/quests/quest-07-wild-foraging.png" client/public/images/quests/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "A winding forest path at dusk, ancient trees on either side, with a glowing root and mycelium network visible underground, teal and turquoise against dark soil. Medicine plants visible at the path edges. Autumn. Journey into the earth. Dark fantasy digital art. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-08-medicine-journey.png"
cp "Nano Photos/quests/quest-08-medicine-journey.png" client/public/images/quests/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Overhead view of a ancient forest canopy, roots spreading underground with glowing amber mycelium lines connecting tree to tree in a vast network. Trees communicate through fungal web. Fall season. Deep forest green canopy above, glowing amber network below. Dark fantasy digital art. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-09-tree-talk.png"
cp "Nano Photos/quests/quest-09-tree-talk.png" client/public/images/quests/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Abstract concentric ripple waves and interference patterns suggesting sound, signal, and communication radiating outward. Crystalline winter blue tones, white and pale blue geometric lines, dark background. Elegant, precise, cold beauty. Winter season. Digital art. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-10-communication-patterns.png"
cp "Nano Photos/quests/quest-10-communication-patterns.png" client/public/images/quests/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "A perfect honeycomb or mandala-like structure of interconnected hexagons, each glowing faintly with inner light, floating against a dark winter background. Elegant coordination, crystalline system, icy blue-white glow. Precision and beauty. Digital art. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-11-coordination-patterns.png"
cp "Nano Photos/quests/quest-11-coordination-patterns.png" client/public/images/quests/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "A person seated in deep meditation, luminous breath-waves radiating outward like slow expanding rings, stars and cosmic imagery floating above them in a deep purple-blue winter sky. Silver-white breath, warm gold stars, cosmic and earthy. Future dreaming, breathwork. Dark fantasy digital art. Horizontal wide crop." \
  --filename "Nano Photos/quests/quest-12-breathplay-future-dreaming.png"
cp "Nano Photos/quests/quest-12-breathplay-future-dreaming.png" client/public/images/quests/
```

---

### Step 2 — Add a local fallback URL function in Quest.tsx

**File:** `client/src/pages/Quest.tsx`

Add this function immediately after the existing `questImageUrl` function:

```ts
const questImageFallback = (id: number, slug: string) =>
  `/images/quests/quest-${String(id).padStart(2, "0")}-${slug}.png`;
```

---

### Step 3 — Update QuestCard to use the local PNG on image error

**File:** `client/src/pages/Quest.tsx`

Find the `QuestCard` component's image/fallback rendering block. Update it so that when the CDN image 404s, the local PNG loads instead of the placeholder icon:

```tsx
<img
  src={imgError ? questImageFallback(id, slug) : questImageUrl(id, slug)}
  alt={title}
  onError={() => setImgError(true)}
  className="w-full h-full object-cover"
  loading="lazy"
  decoding="async"
/>
```

Remove the `<ImageIcon>` + filename text fallback block — the generated PNG replaces it. Keep the `imgError` state boolean; it now controls which URL the `<img>` uses.

---

### Step 4 — Verify

Open `/quest` in the browser and confirm all 12 quest cards display their generated images on both desktop and mobile.

---

## Task 7 — Personalized Return Visitor Cards on the Home Page

**Problem:** The `ProgressiveOnboarding` component shows all return visitors the same four path-selection cards regardless of their history or progress. There is no "pick up where you left off" experience.

**Fix:** Add a row of personalized shortcut cards at the top of `ProgressiveOnboarding`, shown only when relevant to each user's current state, giving return visitors fast contextual access to what matters most to them right now.

These personalized cards appear **before** the existing four path cards. The existing cards remain unchanged below.

> **Note on card images:** SVG illustrations are specified below for each card type. If an AI image-generation tool becomes available (e.g. a future "nano banana pro" skill), the SVGs can be replaced with richer generated images — the file paths and `<img>` wiring remain the same.

---

### Overview of personalized card types

| Card ID | Condition | Title | Subtitle | Link | Accent |
|---------|-----------|-------|----------|------|--------|
| `journey-quests` | User has a `path` set on their profile | Journey Quests | Welcome to the Journey Quests | `/profile#quests` | `#7dd87d` |
| `next-quest` | Has completed ≥ 1 rites-of-passage quest but < 12 | Continue Your Quest | Quest N of 12 awaits | `/quests` | `#fbbf24` |
| `community` | Has previously visited `/community` (localStorage flag) | Back to the Forum | Continue the conversation | `/community` | `#60a5fa` |
| `opportunity` | `path === 'investor'` AND form submitted AND opportunity access granted | Investor Dashboard | View the opportunity | `/opportunity` | `#a78bfa` |
| `accelerator` | `path === 'land_project'` | Seasonal Accelerator | Grow your project | `/accelerator` | `#34d399` |
| `schedule` | No quests completed and no form submitted (early-stage visitor) | Book a Discovery Call | Talk with the team | `/schedule` | `#f472b6` |

Show only the cards whose conditions are true. If no cards match, render nothing (no visible change for that user).

---

### Step 1 — Check schema field names first

Before writing code, open `drizzle/schema.ts` and `server/db.ts` and note the exact field names for:
- Completed quests array (e.g. `questsCompleted`, `completedQuestIds`, etc.)
- Investor form submission (e.g. `investorFormSubmitted`, `investorApplicationAt`)
- Opportunity access flag (e.g. `hasOpportunityAccess`, or a role/permission record)

Substitute the real field names in the code below.

---

### Step 2 — Generate card images using nano-banana-pro skill

Create the archive and site directories first:
```bash
mkdir -p "Nano Photos/return-cards"
mkdir -p client/public/images/return-cards
```

Generate each card image (run from project root):

```bash
uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "A glowing spiral path of soft green light winding into a luminous dark forest, beckoning the viewer forward. Ancient trees frame the path, their canopy alive with fireflies. Feeling of beginning a sacred journey. Dark forest aesthetic, emerald green glow, deep shadows. Digital art. Horizontal wide crop." \
  --filename "Nano Photos/return-cards/journey-quests.png"
cp "Nano Photos/return-cards/journey-quests.png" client/public/images/return-cards/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "A glowing compass rose with an amber-gold needle pointing confidently forward. Dark parchment-like background, ancient map textures. Feeling of navigation, progress, adventure continuing. Warm gold and amber tones against dark forest green. Digital fantasy art. Horizontal wide crop." \
  --filename "Nano Photos/return-cards/next-quest.png"
cp "Nano Photos/return-cards/next-quest.png" client/public/images/return-cards/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Several luminous speech bubbles of different sizes floating in a loose gathering, each glowing with soft blue light. Abstract illustration of conversation and community forming. Cool blue tones, dark background. Feeling of connection, dialogue, people coming together. Digital art. Horizontal wide crop." \
  --filename "Nano Photos/return-cards/community.png"
cp "Nano Photos/return-cards/community.png" client/public/images/return-cards/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "An upward-trending light curve rising like a growing vine, with a small luminous seedling sprouting from the highest point. Violet and purple tones against dark background. Feeling of investment growing into life, possibility, regenerative finance. Digital art. Horizontal wide crop." \
  --filename "Nano Photos/return-cards/opportunity.png"
cp "Nano Photos/return-cards/opportunity.png" client/public/images/return-cards/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "Rolling green hills under a dark sky, a comet or shooting star arcing upward above the landscape, trailing emerald light. Energy of growth, acceleration, land coming alive. Emerald and green tones, dark dramatic sky. Feeling of momentum on the land. Digital art. Horizontal wide crop." \
  --filename "Nano Photos/return-cards/accelerator.png"
cp "Nano Photos/return-cards/accelerator.png" client/public/images/return-cards/

uv run ~/.claude/skills/nano-banana-pro/scripts/generate_image.py \
  --prompt "A minimal open doorway glowing with warm rose-pink light in a dark forest setting, a calendar page and gentle speech bubble floating above it. Feeling of welcome, open invitation, a door always open. Warm pink and rose tones, dark green background. Digital art. Horizontal wide crop." \
  --filename "Nano Photos/return-cards/schedule.png"
cp "Nano Photos/return-cards/schedule.png" client/public/images/return-cards/
```

---

### Step 3 — Create the PersonalizedCards component

**File:** `client/src/components/ProgressiveOnboarding.tsx`

Add these imports at the top of the file (after existing imports):

```tsx
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Map, Compass, MessageSquare, TrendingUp, Zap, CalendarDays } from "lucide-react";
```

Add the following component **above** the `ProgressiveOnboarding` export function:

```tsx
function PersonalizedCards() {
  const { user } = useAuth();
  const { data: profile } = trpc.userProfiles.getMe.useQuery(undefined, {
    enabled: !!user,
    staleTime: 300_000,
  });

  const hasVisitedForum =
    typeof window !== "undefined" &&
    localStorage.getItem("regen_visited_forum") === "true";

  if (!user || !profile) return null;

  const cards: Array<{
    id: string;
    title: string;
    subtitle: string;
    href: string;
    image: string;
    accentColor: string;
    icon: React.ElementType;
  }> = [];

  // Journey Quests — user has chosen a path
  if (profile.path) {
    cards.push({
      id: "journey-quests",
      title: "Journey Quests",
      subtitle: "Welcome to the Journey Quests",
      href: "/profile#quests",
      image: "/images/return-cards/journey-quests.svg",
      accentColor: "#7dd87d",
      icon: Map,
    });
  }

  // Next Quest — partially through rites-of-passage quests
  const completedQuests: number[] = (profile as any).questsCompleted ?? []; // adjust field name
  if (completedQuests.length > 0 && completedQuests.length < 12) {
    cards.push({
      id: "next-quest",
      title: "Continue Your Quest",
      subtitle: `Quest ${completedQuests.length + 1} of 12 awaits`,
      href: "/quests",
      image: "/images/return-cards/next-quest.svg",
      accentColor: "#fbbf24",
      icon: Compass,
    });
  }

  // Community — has visited the forum
  if (hasVisitedForum) {
    cards.push({
      id: "community",
      title: "Back to the Forum",
      subtitle: "Continue the conversation",
      href: "/community",
      image: "/images/return-cards/community.svg",
      accentColor: "#60a5fa",
      icon: MessageSquare,
    });
  }

  // Opportunity — investor with access
  // Adjust field names to match schema (investorFormSubmitted, hasOpportunityAccess)
  if (
    profile.path === "investor" &&
    (profile as any).investorFormSubmitted &&
    (profile as any).hasOpportunityAccess
  ) {
    cards.push({
      id: "opportunity",
      title: "Investor Dashboard",
      subtitle: "View the opportunity",
      href: "/opportunity",
      image: "/images/return-cards/opportunity.svg",
      accentColor: "#a78bfa",
      icon: TrendingUp,
    });
  }

  // Accelerator — land project path
  if (profile.path === "land_project") {
    cards.push({
      id: "accelerator",
      title: "Seasonal Accelerator",
      subtitle: "Grow your project",
      href: "/accelerator",
      image: "/images/return-cards/accelerator.svg",
      accentColor: "#34d399",
      icon: Zap,
    });
  }

  // Discovery Call — no quests, no form submitted
  const isEarlyVisitor =
    completedQuests.length === 0 && !(profile as any).investorFormSubmitted;
  if (isEarlyVisitor) {
    cards.push({
      id: "schedule",
      title: "Book a Discovery Call",
      subtitle: "Talk with the team",
      href: "/schedule",
      image: "/images/return-cards/schedule.svg",
      accentColor: "#f472b6",
      icon: CalendarDays,
    });
  }

  if (cards.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mb-6">
      <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3 text-center">
        Pick up where you left off
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <AnimatedSection key={card.id} animation="fade-in">
              <Link href={card.href}>
                <div
                  className="glass-panel p-3 w-40 md:w-48 group hover:scale-105 transition-all duration-300 cursor-pointer overflow-hidden"
                  style={{ borderColor: `${card.accentColor}33` }}
                >
                  <div className="h-20 mb-2 overflow-hidden rounded-md">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover"
                      loading="eager"
                    />
                  </div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <Icon
                      className="w-3 h-3 flex-shrink-0"
                      style={{ color: card.accentColor }}
                    />
                    <span
                      className="text-white text-xs font-bold truncate"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {card.title}
                    </span>
                  </div>
                  <p className="text-white/60 text-[10px] leading-tight">
                    {card.subtitle}
                  </p>
                </div>
              </Link>
            </AnimatedSection>
          );
        })}
      </div>
    </div>
  );
}
```

---

### Step 4 — Mount PersonalizedCards inside ProgressiveOnboarding

**File:** `client/src/components/ProgressiveOnboarding.tsx`

In the `ProgressiveOnboarding` component's JSX, insert `<PersonalizedCards />` immediately before the `<div className="grid ...">` that renders the four path cards:

```tsx
{/* Personalized shortcut cards — shown above path cards for return visitors */}
<PersonalizedCards />

{/* 4 Path Cards - Mobile optimized 2x2 grid */}
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 max-w-4xl w-full mb-8">
  {/* ...existing pathCards.map() — leave completely untouched... */}
</div>
```

---

### Step 5 — Track forum visits

**File:** `client/src/pages/Community.tsx` (or wherever the community/forum page lives)

Add this `useEffect` near the top of the community page component:

```tsx
useEffect(() => {
  try {
    localStorage.setItem("regen_visited_forum", "true");
  } catch {
    // ignore if localStorage unavailable
  }
}, []);
```

This ensures the "Back to the Forum" card appears on subsequent home page visits once a user has ever visited the community page.

---

### Step 6 — TypeScript cleanup

1. Run `pnpm check` and fix any TypeScript errors.
2. Replace the `(profile as any).fieldName` casts with proper typed field access once you've confirmed the real schema field names from `drizzle/schema.ts`.
3. If opportunity access is controlled by a role rather than a profile field, replace the `hasOpportunityAccess` check with the appropriate role guard (e.g. `user?.role === 'investor_approved'` or a tRPC permission query).

---

## Task 8 — Fix Broken Image on /governance Page

**Problem:** The governance page at `client/src/pages/Governance.tsx` (line 893) loads:
```
https://assets.regencivics.earth/Earned%20Through%20Quests%20(1).png
```
This URL returns 404. The image (the "RCVoice vs RGVoice — Two Tokens Coordinating Systemic Regeneration" infographic) was never successfully uploaded to the CDN. The broken image shows with alt text `"RCVoice vs RGVoice — Earned Through Quests"`.

**The correct image** has been saved to:
```
Nano Photos/governance/rcvoice-vs-rgvoice.png
```

### Step 1 — Copy image to site

```bash
mkdir -p client/public/images/governance
cp "Nano Photos/governance/rcvoice-vs-rgvoice.png" client/public/images/governance/
```

### Step 2 — Update Governance.tsx

**File:** `client/src/pages/Governance.tsx`, around line 892–898.

Find:
```tsx
<img
  src="https://assets.regencivics.earth/Earned%20Through%20Quests%20(1).png"
  alt="RCVoice vs RGVoice — Earned Through Quests"
```

Replace with:
```tsx
<img
  src="/images/governance/rcvoice-vs-rgvoice.png"
  alt="RCVoice vs RGVoice — Two Tokens Coordinating Systemic Regeneration"
```

### Step 3 — Verify

Open `/governance` and confirm the infographic loads. The image should appear at the point where the RCVoice vs RGVoice comparison section begins (after the "Both coordinate systemic regeneration" paragraph).

---

## Task 9 — Slow Down Quest Card Shimmer

**Problem:** The gold and green shimmer sweep on the quest cards cycles every 4 seconds, which is too fast and distracting. It should feel like a slow living glow, not a busy animation.

**Fix:** Change both shimmer animations from `4s` to `16s` — one quarter the current frequency.

**File:** `client/src/index.css`

Find (around line 401):
```css
    animation: gold-shimmer 4s ease-in-out infinite;
```
Replace with:
```css
    animation: gold-shimmer 16s ease-in-out infinite;
```

Find (around line 430):
```css
    animation: green-shimmer 4s ease-in-out infinite;
```
Replace with:
```css
    animation: green-shimmer 16s ease-in-out infinite;
```

That's the only change. Verify by opening `/quest` — the shimmer should now feel like a very slow, barely-there glimmer across the cards rather than a repeating sweep.

---

## Task 10 — Replace Favicon with Seeds of Life Icon

**Problem:** The current favicon is the phoenix logo on a solid square background. It looks like a small muddy square in the browser tab and is hard to distinguish at 16px.

**Fix:** Replace all favicon files with a **Seeds of Life** sacred geometry design — 7 interlocking circles — in bright green and gold on a **transparent background**. This will pop in the tab bar as a distinctive, recognisable symbol.

### Design spec

The Seeds of Life is 7 equal circles: one central, six surrounding circles whose centers sit exactly one radius away from the center in a hexagonal arrangement.

Geometry (viewBox `0 0 100 100`, radius `r = 20`):

| Circle | cx | cy |
|---|---|---|
| Center | 50 | 50 |
| Right | 70 | 50 |
| Lower-right | 60 | 67.32 |
| Lower-left | 40 | 67.32 |
| Left | 30 | 50 |
| Upper-left | 40 | 32.68 |
| Upper-right | 60 | 32.68 |

Colors:
- Circle strokes: gold `#FFD700`, stroke-width `2`
- Center circle: light green fill `rgba(125, 216, 125, 0.25)` so it reads as distinct at small sizes
- Outer 6 circles: no fill (transparent)
- Small center accent dot: bright green `#7dd87d`, radius `4`
- Background: transparent (no `<rect>`)

The overall pattern spans roughly x: 10–90, y: 12–88 — use `viewBox="8 10 84 80"` to crop tight with a small margin.

### Step 1 — Create the master SVG

**File:** `client/public/favicon.svg`

Replace the entire file content with a clean Seeds of Life SVG matching the spec above. Build it as a single self-contained SVG file with no external dependencies. The SVG browser favicon is the highest-priority icon (listed first in `index.html`), so getting this right fixes the tab icon for all modern browsers immediately.

### Step 2 — Generate PNG sizes from the SVG

Use a Node.js `sharp`-based conversion to regenerate the PNG icon files from the new SVG:

```bash
# Install sharp as a dev dependency if not already present
pnpm add -D sharp

# Run this Node script from the project root to generate all sizes
node -e "
const sharp = require('sharp');
const fs = require('fs');
const svgBuf = fs.readFileSync('client/public/favicon.svg');
const sizes = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];
Promise.all(sizes.map(({ name, size }) =>
  sharp(svgBuf).resize(size, size).png().toFile('client/public/' + name)
    .then(() => console.log('  ✓ ' + name))
)).then(() => console.log('All favicon PNGs generated.'));
"
```

### Step 3 — Update favicon.ico

The `.ico` file is used by older browsers and Windows. Regenerate it from the 32px PNG:

```bash
# Using sharp to create .ico is not supported directly — use png-to-ico instead
pnpm add -D png-to-ico
node -e "
const pngToIco = require('png-to-ico');
pngToIco(['client/public/favicon-16.png', 'client/public/favicon-32.png'])
  .then(buf => { require('fs').writeFileSync('client/public/favicon.ico', buf); console.log('favicon.ico updated'); });
"
```

If `png-to-ico` is unavailable, skip the `.ico` — modern browsers use the SVG. Remove `pnpm add -D png-to-ico` if you skip this step.

### Step 4 — Verify

1. Run `pnpm dev` and open the app in a browser
2. Check the browser tab — it should now show the Seeds of Life geometry icon (not the square phoenix)
3. Also verify in Chrome DevTools → Application → Manifest that the 192px and 512px icons are correct

---

## Task 11 — Add Meeting Frequency + Dietary Patterns Fields

**Goal:** Add two new fields to the land project application form so communities can declare how often they meet and what dietary patterns they support. Surface both fields on the `/map` GlobeMap sidebar so visitors can browse and filter by them.

---

### Step 1 — Update the Drizzle schema

**File:** `drizzle/schema.ts`

In the `applications` table, after the `mixedUse` field (around line 74), add:

```ts
  meetingFrequency: mysqlEnum("meetingFrequency", [
    "everyday",
    "2_3x_week",
    "weekly",
    "2_3x_month",
    "monthly",
    "2_3x_year",
    "yearly_plus"
  ]),
  dietaryPatterns: text("dietaryPatterns"), // JSON array: ["vegan","vegetarian","plant_based","pescatarian","omnivore","meat_based","keto","no_shared_diets"]
```

Also update the import at the top to include `mysqlEnum` if it is not already present (it already is for other fields — confirm only).

After editing the schema, run:
```bash
pnpm db:push
```

---

### Step 2 — Update the tRPC router validator

**File:** `server/routers.ts`

In the `applications.update` procedure's `data` schema (starting around line 103), add two new optional fields after `documentsUrl`:

```ts
          meetingFrequency: z.enum([
            "everyday",
            "2_3x_week",
            "weekly",
            "2_3x_month",
            "monthly",
            "2_3x_year",
            "yearly_plus"
          ]).optional(),
          dietaryPatterns: z.string().optional(), // JSON array string
```

---

### Step 3 — Update the application form

**File:** `client/src/pages/Apply.tsx`

#### 3a. Add to the `FormData` type (around line 26)

After `mixedUse: string[]`, add:
```ts
  meetingFrequency: "everyday" | "2_3x_week" | "weekly" | "2_3x_month" | "monthly" | "2_3x_year" | "yearly_plus" | "";
  dietaryPatterns: string[]; // multi-select values
```

#### 3b. Add to `INITIAL_FORM_DATA` (around line 57)

After `mixedUse: [],` add:
```ts
  meetingFrequency: "",
  dietaryPatterns: [],
```

#### 3c. Handle `dietaryPatterns` JSON serialization in `saveDraft`

In the `saveDraft` function (around line 106), inside the `Object.entries(formData).forEach` loop, add a case for `dietaryPatterns` similar to how `mixedUse` is handled:

```ts
} else if (key === "dietaryPatterns") {
  updateData.dietaryPatterns = JSON.stringify(value);
```

This ensures the array is stored as a JSON string in the DB.

#### 3d. Add Meeting Frequency field to Step 2

In Step 2 (Land & Team), after the mixed-use checkboxes section (around line 640, before "Core Team Size"), add:

```tsx
{/* Meeting Frequency */}
<div className="space-y-2">
  <Label htmlFor="meetingFrequency" className="text-base font-semibold text-[#1a472a]">
    Meeting Frequency
  </Label>
  <p className="text-sm text-[#1a472a]/60">How often does your core community gather in person?</p>
  <Select
    value={formData.meetingFrequency}
    onValueChange={(v) => updateField("meetingFrequency", v)}
  >
    <SelectTrigger id="meetingFrequency">
      <SelectValue placeholder="Select meeting frequency..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="everyday">Everyday</SelectItem>
      <SelectItem value="2_3x_week">2–3× per week</SelectItem>
      <SelectItem value="weekly">Weekly</SelectItem>
      <SelectItem value="2_3x_month">2–3× per month</SelectItem>
      <SelectItem value="monthly">Monthly</SelectItem>
      <SelectItem value="2_3x_year">2–3× per year</SelectItem>
      <SelectItem value="yearly_plus">Yearly or less</SelectItem>
    </SelectContent>
  </Select>
</div>
```

#### 3e. Add Dietary Patterns field to Step 3

In Step 3 (Values & Alignment), after the `communityEngagement` textarea (around line 720), add:

```tsx
{/* Dietary Patterns */}
<div className="space-y-2">
  <div className="flex items-start gap-2">
    <Label className="text-base font-semibold text-[#1a472a]">Dietary Patterns</Label>
    <div className="group relative cursor-help">
      <HelpCircle className="w-4 h-4 text-[#1a472a]/40 mt-0.5" />
      <div className="absolute left-0 bottom-full mb-2 w-64 bg-[#1a472a] text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
        Dietary alignment matters for community cohesion. Shared meals are central to regenerative living — knowing the community's dietary culture helps prospective members assess fit before applying.
      </div>
    </div>
  </div>
  <p className="text-sm text-[#1a472a]/60">Select all that apply to your community. This helps prospective members find aligned communities.</p>
  <div className="grid grid-cols-2 gap-2">
    {[
      { value: "vegan", label: "Vegan" },
      { value: "vegetarian", label: "Vegetarian" },
      { value: "plant_based", label: "Plant-Based" },
      { value: "pescatarian", label: "Pescatarian" },
      { value: "omnivore", label: "Omnivore" },
      { value: "meat_based", label: "Meat-Based" },
      { value: "keto", label: "Keto" },
      { value: "no_shared_diets", label: "No Shared Diets" },
    ].map(({ value, label }) => (
      <label key={value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-[#1a472a]/5 transition-colors">
        <input
          type="checkbox"
          checked={formData.dietaryPatterns.includes(value)}
          onChange={(e) => {
            const next = e.target.checked
              ? [...formData.dietaryPatterns, value]
              : formData.dietaryPatterns.filter(v => v !== value);
            updateField("dietaryPatterns", next);
          }}
          className="w-4 h-4 accent-[#4a7c59]"
        />
        <span className="text-sm text-[#1a472a]">{label}</span>
      </label>
    ))}
  </div>
</div>
```

Add `HelpCircle` to the import from `lucide-react` at the top of the file if not already present.

---

### Step 4 — Update the GlobeMap to display + filter by the new fields

**File:** `client/src/components/GlobeMap.tsx`

#### 4a. Extend the `MapEntity` interface

Find the `MapEntity` interface (near the top of the component section) and add two optional fields:

```ts
  meetingFrequency?: string;
  dietaryPatterns?: string[]; // parsed from JSON
```

#### 4b. Populate the fields when mapping applications to entities

In the section where applications are mapped to `MapEntity` objects (around line 713, where `size: app.projectSizeHectares ? ...` appears), add:

```ts
      meetingFrequency: app.meetingFrequency || undefined,
      dietaryPatterns: app.dietaryPatterns
        ? (() => { try { return JSON.parse(app.dietaryPatterns); } catch { return []; } })()
        : undefined,
```

#### 4c. Display the fields in the EntityCard when selected

In the `EntityCard` component, after the `{isSelected && entity.size && ...}` block (around line 570), add:

```tsx
{/* Meeting Frequency */}
{isSelected && entity.meetingFrequency && (
  <p className="text-white/60 text-xs mt-1">
    <span className="text-white/40">Meets:</span>{" "}
    {{
      everyday: "Everyday",
      "2_3x_week": "2–3× per week",
      weekly: "Weekly",
      "2_3x_month": "2–3× per month",
      monthly: "Monthly",
      "2_3x_year": "2–3× per year",
      yearly_plus: "Yearly or less",
    }[entity.meetingFrequency] ?? entity.meetingFrequency}
  </p>
)}

{/* Dietary Patterns */}
{isSelected && entity.dietaryPatterns && entity.dietaryPatterns.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1.5">
    {entity.dietaryPatterns.map((d) => (
      <span
        key={d}
        className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#4a7c59]/30 text-[#7dd87d] font-medium capitalize"
      >
        {d.replace(/_/g, " ")}
      </span>
    ))}
  </div>
)}
```

#### 4d. Add filter state for the new fields

In the `GlobeMap` component body (near the other filter state declarations around line 692), add:

```ts
  const [meetingFreqFilter, setMeetingFreqFilter] = useState<string>("");
  const [dietaryFilter, setDietaryFilter] = useState<string>("");
```

#### 4e. Apply filters in `filteredEntities` useMemo

In the `filteredEntities` useMemo (around line 734), after the existing country filter block, add:

```ts
    if (meetingFreqFilter) {
      result = result.filter((e) => e.meetingFrequency === meetingFreqFilter);
    }
    if (dietaryFilter) {
      result = result.filter((e) => e.dietaryPatterns?.includes(dietaryFilter));
    }
```

Also add `meetingFreqFilter` and `dietaryFilter` to the useMemo dependency array.

Update `hasActiveFilters` (around line 1101) to also account for the new filters:

```ts
  const hasActiveFilters = searchQuery || countryFilter || filter !== "all" || meetingFreqFilter || dietaryFilter;
```

Update `clearFilters` to also reset them:

```ts
    setMeetingFreqFilter("");
    setDietaryFilter("");
```

#### 4f. Add filter dropdowns to the sidebar (desktop and mobile)

After the existing country filter `<CountryFilter ...>` component in the sidebar (both desktop and mobile, around lines 1167 and 1297), add two new inline `<select>` dropdowns:

```tsx
{/* Meeting Frequency filter */}
<select
  value={meetingFreqFilter}
  onChange={(e) => setMeetingFreqFilter(e.target.value)}
  className="text-xs bg-white/10 text-white border border-white/20 rounded-full px-2 py-1 cursor-pointer"
>
  <option value="">All Frequencies</option>
  <option value="everyday">Everyday</option>
  <option value="2_3x_week">2–3× / week</option>
  <option value="weekly">Weekly</option>
  <option value="2_3x_month">2–3× / month</option>
  <option value="monthly">Monthly</option>
  <option value="2_3x_year">2–3× / year</option>
  <option value="yearly_plus">Yearly or less</option>
</select>

{/* Dietary filter */}
<select
  value={dietaryFilter}
  onChange={(e) => setDietaryFilter(e.target.value)}
  className="text-xs bg-white/10 text-white border border-white/20 rounded-full px-2 py-1 cursor-pointer"
>
  <option value="">All Diets</option>
  <option value="vegan">Vegan</option>
  <option value="vegetarian">Vegetarian</option>
  <option value="plant_based">Plant-Based</option>
  <option value="pescatarian">Pescatarian</option>
  <option value="omnivore">Omnivore</option>
  <option value="meat_based">Meat-Based</option>
  <option value="keto">Keto</option>
  <option value="no_shared_diets">No Shared Diets</option>
</select>
```

Add both filter dropdowns in the same location on mobile too (inside the mobile sidebar section, after `CountryFilter` in the mobile layout).

---

## Task 12 — Persistent Investor Access + Suppress Redundant Exit Popup

**Background:** When a visitor fills in the InvestorForm, their email is captured and they are marked as `investor_verified`. This verification is currently stored only in `sessionStorage`, which is wiped when the browser tab closes. On their next visit, they are redirected back to `/investor` to fill in the form again — which is a bad experience. Additionally, the ExitIntentCapture "Before You Go" popup currently fires on `/opportunity` even for verified investors whose email was already captured via the form.

**Goal:**
1. Make `investor_verified` persist across sessions using `localStorage`.
2. Store basic investor profile data (name + email) in `localStorage` on form submission.
3. Prevent the "Before You Go" popup from firing on `/opportunity` (and other investor pages) once an investor is verified.

---

### Step 1 — Persist investor verification in localStorage

**File:** `client/src/pages/InvestorForm.tsx`

Find the `onSuccess` callback for `submitMutation` (around line 177):

```ts
    onSuccess: () => {
      setIsSubmitted(true);
      sessionStorage.setItem('investor_verified', 'true');
```

After the `sessionStorage.setItem` line, add:

```ts
      // Persist across sessions so returning investors skip the form
      localStorage.setItem('investor_verified', 'true');
      localStorage.setItem('investor_email', formData.email);
      localStorage.setItem('investor_name', formData.fullName);
```

This ensures the investor's status survives browser close/reopen.

---

### Step 2 — Check localStorage on the Opportunity page

**File:** `client/src/pages/Opportunity.tsx`

Find the investor verification check (around line 283):

```ts
    const isVerified = sessionStorage.getItem('investor_verified') === 'true';
```

Replace with:

```ts
    const isVerified =
      sessionStorage.getItem('investor_verified') === 'true' ||
      localStorage.getItem('investor_verified') === 'true';
```

This allows returning investors to bypass the redirect even after opening a new browser session.

---

### Step 3 — Suppress "Before You Go" popup for verified investors

**File:** `client/src/components/ExitIntentCapture.tsx`

In the `triggerModal` callback (around line 107), there is already a check:

```ts
    const hasSubmitted = sessionStorage.getItem("formSubmitted");
    if (hasSubmitted) return;
```

After that block, add a check for investor pages:

```ts
    // Don't show on investor pages if the visitor already gave their email
    const investorVerified =
      localStorage.getItem('investor_verified') === 'true' ||
      sessionStorage.getItem('investor_verified') === 'true';
    if (investorVerified && context === 'investor') return;
```

(`context` is already computed at the top of the component from the current pathname — it equals `'investor'` for `/opportunity`, `/fund`, `/investor`, `/loi`, and `/risk-disclosure`.)

This ensures the popup never fires on investor pages once the email is captured.

---

### Step 4 — (Optional) Welcome back returning investors

**File:** `client/src/pages/Opportunity.tsx`

In the `useEffect` that checks `investor_verified` (around line 280), you can also read the stored name to show a personalized welcome. After the verification check, add:

```ts
    const investorName = localStorage.getItem('investor_name');
    if (investorName) {
      // Store for display — set in local state if you want to show a welcome
      // e.g., setInvestorName(investorName);
    }
```

Add a `const [investorName, setInvestorName] = useState<string | null>(null);` state variable at the top of the component. Render it somewhere subtle near the top of the page, e.g., near the Fund Status Banner:

```tsx
{investorName && (
  <div className="text-center py-2 text-sm text-[#7dd87d]/70">
    Welcome back, {investorName.split(" ")[0]} 👋
  </div>
)}
```

This step is optional — skip if it feels too noisy.

---

## Task 13 — Migrate Old Database Records from CSV

**Goal:** Import the users and applications from the old database (exported as CSV files) into the live database. Both CSVs are checked into the repo in `data/migration/` so Claude Code can access them.

---

### Step 0 — Copy the CSV files into the repo

Copy the two uploaded CSV files to a folder in the repo so the migration script can read them:

```bash
mkdir -p data/migration
cp ~/Downloads/regen-civics-clean/applications_20260304_010227.csv data/migration/applications.csv
cp ~/Downloads/regen-civics-clean/users_20260304_010214.csv data/migration/users.csv
```

> **Note for Rye:** If these files are not in `~/Downloads/regen-civics-clean/`, check `~/Downloads/` or wherever you saved the exported CSVs from the database backup. They were uploaded as `applications_20260304_010227.csv` and `users_20260304_010214.csv`.

---

### Step 1 — Install csv-parse

```bash
pnpm add -D csv-parse
```

---

### Step 2 — Create the migration script

**File to create:** `scripts/migrate-csv.ts`

```ts
/**
 * scripts/migrate-csv.ts
 * Migrates users and applications from CSV backup files into the live database.
 * Run with: npx tsx scripts/migrate-csv.ts
 * Prerequisites: DATABASE_URL set in .env
 */

import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse/sync";
import { config } from "dotenv";
import mysql from "mysql2/promise";

config(); // load .env

const db = await mysql.createConnection(process.env.DATABASE_URL!);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nullIfEmpty(v: string | undefined): string | null {
  return v === "" || v === undefined ? null : v;
}

function intOrNull(v: string | undefined): number | null {
  if (v === "" || v === undefined) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function floatOrNull(v: string | undefined): number | null {
  if (v === "" || v === undefined) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function dateOrNull(v: string | undefined): string | null {
  if (v === "" || v === undefined) return null;
  return v; // MySQL accepts ISO strings directly
}

// ─── Migrate Users ────────────────────────────────────────────────────────────

const usersPath = path.resolve("data/migration/users.csv");
const usersRaw = fs.readFileSync(usersPath, "utf-8");
const users = parse(usersRaw, { columns: true, skip_empty_lines: true });

console.log(`\nMigrating ${users.length} users...`);

for (const u of users) {
  try {
    await db.execute(
      `INSERT IGNORE INTO users (id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parseInt(u.id),
        u.openId,
        nullIfEmpty(u.name),
        nullIfEmpty(u.email),
        nullIfEmpty(u.loginMethod),
        u.role || "user",
        dateOrNull(u.createdAt),
        dateOrNull(u.updatedAt),
        dateOrNull(u.lastSignedIn),
      ]
    );
    console.log(`  ✅ User ${u.id} (${u.email}) — inserted or already exists`);
  } catch (err: any) {
    console.error(`  ❌ User ${u.id} — error: ${err.message}`);
  }
}

// ─── Migrate Applications ─────────────────────────────────────────────────────

const appsPath = path.resolve("data/migration/applications.csv");
const appsRaw = fs.readFileSync(appsPath, "utf-8");
const apps = parse(appsRaw, { columns: true, skip_empty_lines: true, relax_quotes: true });

console.log(`\nMigrating ${apps.length} applications...`);

for (const a of apps) {
  try {
    await db.execute(
      `INSERT IGNORE INTO applications
         (id, userId, status, projectName, projectType, location, vision, landStatus,
          teamSize, teamDescription, regenerativePractices, governanceApproach, communityEngagement,
          timeCommitment, currentFunding, fundingNeeds, websiteUrl, videoUrl, documentsUrl,
          additionalNotes, submittedAt, createdAt, updatedAt,
          projectSizeHectares, currentPeopleCount, currentHouseholdCount,
          intendedPeopleCount, intendedHouseholdCount, mixedUse,
          latitude, longitude, country)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        parseInt(a.id),
        parseInt(a.userId),
        a.status || "submitted",
        a.projectName,
        a.projectType || "early_stage",
        a.location,
        a.vision,
        a.landStatus || "seeking",
        intOrNull(a.teamSize) ?? 1,
        a.teamDescription ?? "",
        a.regenerativePractices ?? "",
        a.governanceApproach ?? "",
        a.communityEngagement ?? "",
        a.timeCommitment ?? "",
        nullIfEmpty(a.currentFunding),
        a.fundingNeeds ?? "",
        nullIfEmpty(a.websiteUrl),
        nullIfEmpty(a.videoUrl),
        nullIfEmpty(a.documentsUrl),
        nullIfEmpty(a.additionalNotes),
        dateOrNull(a.submittedAt),
        dateOrNull(a.createdAt),
        dateOrNull(a.updatedAt),
        intOrNull(a.projectSizeHectares),
        intOrNull(a.currentPeopleCount),
        intOrNull(a.currentHouseholdCount),
        intOrNull(a.intendedPeopleCount),
        intOrNull(a.intendedHouseholdCount),
        nullIfEmpty(a.mixedUse),
        floatOrNull(a.latitude),
        floatOrNull(a.longitude),
        nullIfEmpty(a.country),
      ]
    );
    console.log(`  ✅ Application ${a.id} (${a.projectName}) — inserted or already exists`);
  } catch (err: any) {
    console.error(`  ❌ Application ${a.id} — error: ${err.message}`);
  }
}

await db.end();
console.log("\nMigration complete.");
```

---

### Step 3 — Run the migration

```bash
npx tsx scripts/migrate-csv.ts
```

Expected output: each user and application printed with ✅ (inserted) or a note that it already exists. Fix any ❌ errors before proceeding.

---

### Step 4 — Verify in the admin panel

1. Start `pnpm dev`
2. Sign in as admin (`rieki.cordon@gmail.com`)
3. Go to the Admin Dashboard → Applications
4. Confirm all migrated applications appear with correct data (project names, statuses, locations)
5. Go to `/map` — confirm migrated projects appear on the globe

---

### Step 5 — Test a new application submission

1. Sign out of admin
2. Sign in as a regular user (or create a test account)
3. Go to `/apply` and fill in a test application including the new **Meeting Frequency** and **Dietary Patterns** fields
4. Submit the application
5. Sign back in as admin and verify it appears in the admin dashboard with all fields filled
6. Go to `/map` and confirm the new test project appears with the dietary + meeting filters working

---

## Task 14 -- Fix "Send Me the Thesis" Popup on /fund

**Background:** The `ExitIntentCapture` component fires on `/fund` with the `investor` context. Its current CTA is "Send Me the Thesis" and it collects an email to supposedly send the investment thesis directly. This is a legal problem -- visitors should not be able to receive the thesis without first completing the investor intake form at `/investor`.

**Goal:** Replace the "send me the thesis" behaviour with a redirect to the investor form. No email should be collected for the investor context popup -- instead it becomes a gate that explains the thesis is only accessible after completing the form.

---

### Step 1 -- Update the investor context config

**File:** `client/src/components/ExitIntentCapture.tsx`

Find the `investor` entry in the `contextConfig` object (around line 42):

```ts
investor: {
  icon: <FileText className="w-5 h-5 text-[#7dd87d]" />,
  headline: "Before You Go",
  subline: "Take the investment thesis with you",
  body: "Get our full investment thesis and fund overview sent directly to your inbox. No spam  -  just the information you need to make an informed decision.",
  cta: "Send Me the Thesis",
  successMessage: "We'll send you the investment thesis and keep you updated on the regenerative renaissance.",
},
```

Replace with:

```ts
investor: {
  icon: <FileText className="w-5 h-5 text-[#7dd87d]" />,
  headline: "Access the Investment Thesis",
  subline: "Complete the investor intake form to continue",
  body: "Our full investment thesis, fund structure, and financial projections are available to accredited investors who complete a short intake form. It takes less than 2 minutes.",
  cta: "Take Me to the Form",
  successMessage: "",
},
```

---

### Step 2 -- Make the CTA redirect instead of submit email

**File:** `client/src/components/ExitIntentCapture.tsx`

The modal currently renders a `<form>` with an email input. For the investor context, the form should instead render a single CTA button that navigates to `/investor` and closes the modal.

Find the modal's form/submit section (inside the `show && !submitted` render block). Add a conditional branch for the investor context:

```tsx
{context === 'investor' ? (
  <div className="flex flex-col gap-3 mt-2">
    <button
      onClick={() => {
        setShow(false);
        setLocation('/investor');
      }}
      className="w-full py-3 px-6 rounded-full bg-[#7dd87d] text-[#1a472a] font-semibold text-sm hover:bg-[#9de89d] transition-colors"
    >
      {config.cta}
    </button>
    <button
      onClick={() => { setShow(false); sessionStorage.setItem('exitIntentDismissed', '1'); setDismissed(true); }}
      className="w-full py-2 text-xs text-white/40 hover:text-white/60 transition-colors"
    >
      Maybe later
    </button>
  </div>
) : (
  /* existing email form JSX here */
)}
```

You will need to import `useLocation` from `wouter` and add `const [, setLocation] = useLocation();` at the top of the component if not already present.

---

### Step 3 -- Verify

1. Visit `/fund` in the browser
2. Trigger the exit intent (move cursor toward the top of the browser window)
3. Confirm the popup now says "Access the Investment Thesis" and shows a "Take Me to the Form" button with no email input
4. Click the button -- it should navigate to `/investor` and close the modal
5. Visit `/opportunity` as a non-verified user -- confirm this change did not affect other contexts

---

## Task 15 -- Fix Background Image Gaps, Overlay, and Scroll Wobble

**Background:** The `PageBackground` component in `client/src/components/PageBackground.tsx` has two related visual problems:

1. **Overlay gap at edges**: On desktop, the background image div uses `inset: "-8% 0"`, extending 8% beyond the container at both top and bottom to give the JS parallax room to shift the image. However, the overlay div uses `absolute inset-0` -- it only covers the container, not the extended area. When the page first loads or the background shifts, there are visible unoverlaied strips of raw image at the top and bottom edges.

2. **Scroll wobble**: The JS parallax applies `translateY` via a `requestAnimationFrame` scroll listener. On tall pages the combination of the negative inset and the transform offset creates visible instability -- the background image noticeably shifts/wobbles as the user scrolls.

**Goal:** Replace the custom JS parallax with CSS `background-attachment: fixed` on desktop. This eliminates both problems: the browser handles the parallax natively at compositor level (no wobble), and the `inset: "-8% 0"` trick is no longer needed (no more overlay gap).

---

### Step 1 -- Replace JS parallax with background-attachment: fixed

**File:** `client/src/components/PageBackground.tsx`

#### 1a. Remove the parallax scroll effect

Delete the entire `useEffect` block that handles parallax scrolling (lines ~587-619). It begins with:

```ts
// Parallax scroll effect - uses transform (GPU-composited) instead of backgroundPositionY
useEffect(() => {
  if (!parallax || isMobile) return;
  ...
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
  return () => window.removeEventListener("scroll", handleScroll);
}, [parallax, parallaxSpeed, isMobile]);
```

Remove this entire block.

#### 1b. Fix the background div inset and attachment

Find the full-res background image div (around line 652):

```tsx
<div
  ref={bgRef}
  className={`absolute z-[2] transition-opacity duration-1000 ${
    isLoaded ? "opacity-100" : "opacity-0"
  }`}
  style={{
    inset: isMobile ? "0" : "-8% 0",
    backgroundImage: `url(${activeImage})`,
    backgroundSize: "cover",
    backgroundPosition: `center ${backgroundPositionY || "center"}`,
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "scroll",
    willChange: "transform",
  }}
/>
```

Replace with:

```tsx
<div
  ref={bgRef}
  className={`absolute z-[2] transition-opacity duration-1000 ${
    isLoaded ? "opacity-100" : "opacity-0"
  }`}
  style={{
    inset: "0",
    backgroundImage: `url(${activeImage})`,
    backgroundSize: "cover",
    backgroundPosition: `center ${backgroundPositionY || "center"}`,
    backgroundRepeat: "no-repeat",
    backgroundAttachment: isMobile ? "scroll" : "fixed",
    willChange: "auto",
  }}
/>
```

Key changes:
- `inset` is now `"0"` on all screen sizes -- no more overflow beyond the container
- `backgroundAttachment` is `"fixed"` on desktop, `"scroll"` on mobile (`fixed` does not work on iOS Safari)
- `willChange` changed from `"transform"` to `"auto"` since we are no longer using transforms

#### 1c. Also fix the blur placeholder attachment

The blur placeholder div (around line 636) also uses `backgroundAttachment: "scroll"`. Update it to match:

```tsx
backgroundAttachment: isMobile ? "scroll" : "fixed",
```

#### 1d. Fix the overlay bottom opacity

In `SectionOverlayLayer`, the static gradient (when no `sectionOverlays` are provided, around line 504) ends at `0.9` opacity:

```ts
rgba(${overlayColor}, 0.9) 100%
```

Change to `1` so the background blends cleanly into the footer:

```ts
rgba(${overlayColor}, 1) 100%
```

---

### Step 2 -- Remove the parallax props from all call sites (optional cleanup)

The `parallax` and `parallaxSpeed` props are now unused. They can stay on the interface (backward compatible, just ignored) or be removed. If removing, search for usages:

```bash
grep -r "parallax" client/src --include="*.tsx" -l
```

Remove the `parallax={true}` and `parallaxSpeed={...}` props from those call sites, and remove the props from the `PageBackgroundProps` interface and component signature.

This step is optional -- leaving unused props in place is harmless.

---

### Step 3 -- Verify

1. Run `pnpm dev` and visit `/fund`, `/land`, `/opportunity`, and the home page
2. Scroll up and down slowly -- the background should remain completely stable with no wobble
3. Confirm no raw-image strips are visible at the top or bottom of any page section
4. Check on mobile (or browser DevTools mobile emulation) -- background should scroll normally

---

## Task 16 -- Consolidate to One Chat Button

**Background:** Two separate floating chat components are rendered in `App.tsx`:

```tsx
{!adminMode && <ReGenGuide />}
{!adminMode && <SiteTour />}
```

`ReGenGuide` renders a green circle button at `bottom-4 right-4` (z-9999) with a `MessageCircle` icon. `SiteTour` renders a pill-shaped button at `bottom-6 right-6` (z-40) labelled "Show Me Around" on desktop. Both open chat panels from the bottom-right. They stack visually and create a confusing double-button.

**Goal:** Remove `SiteTour` entirely and update `ReGenGuide`'s button to show "ReGen Guide" as a text label on desktop (matching the user's request). On mobile it stays as the icon-only circle.

---

### Step 1 -- Remove SiteTour from App.tsx

**File:** `client/src/App.tsx`

Remove the import:
```ts
import { SiteTour } from "./components/SiteTour";
```

Remove the usage:
```tsx
{!adminMode && <SiteTour />}
```

---

### Step 2 -- Update ReGenGuide button to show text on desktop

**File:** `client/src/components/ReGenGuide.tsx`

Find the floating button (around line 171):

```tsx
<button
  onClick={() => setIsOpen(!isOpen)}
  className={`fixed bottom-4 right-4 z-[9999] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 btn-press ${
    isOpen
      ? "bg-white/10 border border-white/20 text-white/60 hover:text-white"
      : "bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] shadow-[0_0_20px_rgba(125,216,125,0.4)]"
  }`}
  aria-label={isOpen ? "Close Your ReGen Guide" : "Open Your ReGen Guide"}
>
  {isOpen ? (
    <X className="w-6 h-6" />
  ) : (
    <MessageCircle className="w-6 h-6" />
  )}
</button>
```

Replace with:

```tsx
<button
  onClick={() => setIsOpen(!isOpen)}
  className={`fixed bottom-4 right-4 z-[9999] flex items-center justify-center shadow-lg transition-all duration-300 btn-press
    w-14 h-14 rounded-full
    sm:w-auto sm:h-auto sm:px-4 sm:py-3 sm:rounded-full sm:gap-2
    ${
      isOpen
        ? "bg-white/10 border border-white/20 text-white/60 hover:text-white"
        : "bg-[#7dd87d] text-[#1a472a] hover:bg-[#9de89d] shadow-[0_0_20px_rgba(125,216,125,0.4)]"
    }`}
  aria-label={isOpen ? "Close ReGen Guide" : "Open ReGen Guide"}
>
  {isOpen ? (
    <X className="w-6 h-6" />
  ) : (
    <>
      <MessageCircle className="w-6 h-6" />
      <span className="hidden sm:inline text-sm font-semibold">ReGen Guide</span>
    </>
  )}
</button>
```

This gives a circle on mobile and a pill with icon + "ReGen Guide" text on desktop (sm and above).

---

### Step 3 -- Verify

1. Run `pnpm dev`
2. On desktop: confirm only one button appears in the bottom-right, showing "ReGen Guide" with the chat icon
3. On mobile (or DevTools): confirm it collapses to the icon-only circle
4. Click it -- confirm the chat panel opens correctly
5. Confirm the "Show Me Around" button is completely gone

---

## Summary Checklist

- [ ] **Task 1** — `Home.tsx`: single background image, no isReturnVisitor split
- [ ] **Task 2** — `App.tsx`/components: confirm only `ReGenGuide` chat widget is active, remove any stale chat components
- [ ] **Task 3** — `ReGenGuide.tsx` + `oauth.ts`: rename to "Your ReGen Guide", update welcome + error messages, update system prompt
- [ ] **Task 4** — `Home.tsx`: remove `LiveStats` import and usage
- [ ] **Task 5** — `App.tsx`: remove `PathSelectionScreen` import, `PathOnboarding` function, and its usage
- [ ] **Task 6** — Generate 13 PNG quest images in `client/public/images/quests/` using nano-banana-pro, add `questImageFallback()` to `Quest.tsx`, update `QuestCard` to use local PNG on CDN 404
- [ ] **Task 7** — Generate 6 PNG return-card images in `client/public/images/return-cards/` using nano-banana-pro, add `PersonalizedCards` component to `ProgressiveOnboarding.tsx`, track forum visits in community page
- [ ] **Task 8** — Copy `Nano Photos/governance/rcvoice-vs-rgvoice.png` to `client/public/images/governance/`, update `Governance.tsx` src to `/images/governance/rcvoice-vs-rgvoice.png`
- [ ] **Task 9** — `index.css`: change both `gold-shimmer` and `green-shimmer` from `4s` to `16s`
- [ ] **Task 10** — Replace `favicon.svg` with Seeds of Life geometry (green + gold, transparent bg), regenerate all PNG favicon sizes
- [ ] **Task 11** — Add `meetingFrequency` + `dietaryPatterns` to schema, tRPC router, Apply.tsx form (Steps 2 + 3), and GlobeMap filters + entity cards
- [ ] **Task 12** — Persist `investor_verified` to localStorage in InvestorForm; check localStorage in Opportunity page; suppress ExitIntentCapture popup for verified investors on investor pages
- [ ] **Task 13** — Copy CSVs to `data/migration/`, run `scripts/migrate-csv.ts` to restore users + applications, verify in admin panel + map, test new application with new fields
- [ ] **Task 14** -- `ExitIntentCapture.tsx`: change investor context popup to redirect to `/investor` instead of collecting email; update headline, body, CTA copy
- [ ] **Task 15** -- `PageBackground.tsx`: replace JS parallax with `background-attachment: fixed` on desktop; fix `inset: "-8% 0"` to `"0"`; fix overlay bottom opacity to 1.0
- [ ] **Task 16** -- `App.tsx`: remove `SiteTour` import and usage; `ReGenGuide.tsx`: update button to pill with "ReGen Guide" text on desktop, icon-only circle on mobile
- [ ] **Task 17** -- `Home.tsx` + `VideoPreviewCard.tsx`: Welcome Short Intro video section already scaffolded; activate YouTube URL once provided; verify autoplay MP4 works in dev
- [ ] **Task 18** -- Generate two epic 4K hero background images using nano-banana-pro; composite into single tall WebP per device; upload to R2; update `bgImage` and `mobileBackgroundImage` in `Home.tsx`
- [ ] **Task 19** -- `PlayerProfile.tsx`: add "My Submissions" tab showing all user submissions (applications, campaigns, saved calculators, investor inquiry, org claims); add entity claiming UI with search-select-submit flow; add `investorInquiries.mine` + `applications.search` tRPC endpoints; support `?id=` in `Apply.tsx` and `?savedId=` in `Calculator.tsx`
- [ ] **Task 20** -- `server/blockchain.ts` (NEW): fetch RGVoice + REGEN balances via Base JSON-RPC `eth_call` (no library needed); replace admin-only `syncTokens` with self-service `protectedProcedure` + 5-min rate-limit cache; add `adminSyncTokens` for force-sync; add auto-sync `useEffect` (10-min staleness) + "Refresh balances" button with `RefreshCw` spin to `PlayerProfile.tsx`
- [ ] **Forum Fix 1** (see `FORUM_UPGRADES.md`) -- Forum content overhaul + Learn+Share quest cards

Run `pnpm check` after all changes to confirm no TypeScript errors.

---

## Task 17 — Welcome Short Intro Video Section

**Status:** Scaffolded. Component exists, section added to Home.tsx. Needs YouTube URL activation.

**Context:**

A new `VideoPreviewCard` component has already been created at `client/src/components/VideoPreviewCard.tsx`. It autoplays a short MP4 clip silently as a living preview, with a "Watch Full Video" play-button callout overlay. Clicking opens the YouTube URL in a new tab.

A new section has already been added to `client/src/pages/Home.tsx` ABOVE the existing `{/* Hero Section with Video */}` section. The MP4 file is at `client/public/images/clip-01-welcome.mp4` (6 seconds, 1280×720, 5.7MB). A JPEG thumbnail was extracted at `client/public/images/thumbnail-welcome-intro.jpg`.

**What remains:**

Once Rye provides the YouTube URL, update the VideoPreviewCard usage in Home.tsx:

```tsx
<VideoPreviewCard
  mp4Url="/images/clip-01-welcome.mp4"
  title="Welcome to the Regenerative Renaissance"
  playLabel="Watch Full Video"
  youtubeUrl="https://www.youtube.com/watch?v=REPLACE_WITH_REAL_ID"
/>
```

Remove the `comingSoon` prop. The "Coming Soon" badge disappears and the play callout becomes clickable.

**Verify:** Run `pnpm dev` — confirm the MP4 autoplays silently in the section, the green pill shows, clicking opens YouTube in a new tab.

---

## Task 18 — Epic Hero Background Images (Desktop + Mobile)

**Goal:** Replace the current CDN background images with two custom-generated 4K hero images that tell a visual story as the user scrolls. One for desktop, one for mobile.

**Creative brief — the image is a seamless vertical journey from top to bottom:**

1. Stars + dawn sky — deep twilight with stars fading into gold-pink sunrise cresting the horizon
2. Bird's-eye village — sweeping aerial view of a lush regenerative village: spiral food-forest gardens, living rooftops, organic curving hemp homes with solar integration, winding earthen paths
3. Village life — ground-level scenes blending together: hands pressing seeds into dark earth, long wooden tables with vibrant tropical fruit shared among diverse joyful people, curving earthen homes under construction, children in open-air dome classrooms
4. Soil cross-section — macro underground world: mycorrhizal fungal networks glowing bioluminescent teal, earthworms, root systems, soil life
5. Space + global network — view ascending through soil and out to orbit, luminous Earth with hundreds of glowing village clusters forming a living network of light across every continent

All transitions are seamless — no hard edges. Every scene bleeds organically into the next.

**Palette:** Deep forest green, earth amber, warm gold, violet twilight sky, bioluminescent teal highlights, warm ochre soil tones.

**Style:** Painterly epic realism. Cinematic. Between Miyazaki landscape and National Geographic aerial. Not photographic, not cartoon. 4K quality.

**Dimensions:**
- Desktop: 4096 × 8192px (very tall portrait — covers full page scroll). Aspect ~1:2.
- Mobile: 1536 × 6144px (narrower, taller). Aspect ~1:4.

**Generation approach using nano-banana-pro:**

Generate 5 scene segments for each image (matching the 5 zones above), then composite them vertically using sharp or PIL into one seamless tall image. Apply soft blend/feather at each join seam (gradient mask, ~200px overlap) so transitions are invisible.

Desktop scene prompts (generate each at ~4096×2048):
1. `"Deep twilight star field dissolving into gold-pink sunrise, horizon glow, no ground visible yet, painterly epic realism, cinematic 4K, bioluminescent atmosphere"`
2. `"Sweeping bird's-eye aerial view of lush regenerative village in green valley, spiral food forest gardens, organic curving hemp homes, living rooftops, earthen paths, warm amber-gold light, painterly epic realism, cinematic 4K"`
3. `"Ground-level regenerative village life: hands pressing seeds into dark soil, long wooden tables with vibrant tropical fruit, diverse joyful people sharing meals, curved earthen homes being built, children in open-air dome classrooms, lush greenery, painterly epic realism, cinematic 4K"`
4. `"Macro cross-section of thriving living soil: mycorrhizal fungal networks glowing bioluminescent teal, earthworms, root systems, underground ecosystem, rich dark earth, painterly epic realism, cinematic 4K"`
5. `"View ascending through soil into sky and then outer space, luminous Earth from orbit, hundreds of glowing regenerative village clusters forming network of light across all continents, stars, painterly epic realism, cinematic 4K"`

For mobile: same 5 prompts but generate at ~1536×2048 ratio (narrower crop).

**Output files:**
- `client/public/images/hero-bg-desktop.webp` (WebP quality 85, target under 2MB)
- `client/public/images/hero-bg-mobile.webp` (WebP quality 85, target under 1.5MB)

**Update Home.tsx** (around line 167):

Replace:
```ts
const bgImage = "https://assets.regencivics.earth/YPVdYWGRrdEquJbO.webp";
```
With:
```ts
const bgImage = "/images/hero-bg-desktop.webp";
```

And in the PageBackground usage, replace the CDN mobileBackgroundImage URL with `/images/hero-bg-mobile.webp`. Remove the blurPlaceholder prop or generate a tiny 32×64px blurred WebP from the desktop image.

**Background scrolling behavior:**

The image should scroll WITH the page content — NOT fixed. The visual story reveals as the user scrolls down (stars at top, space at bottom). Do NOT apply `background-attachment: fixed` on Home.tsx's PageBackground. Task 15's fixed-attachment change applies to other pages, not Home.tsx.

**Verify:**
1. Run `pnpm dev`, visit `/`
2. Scroll slowly from top to bottom — confirm the visual journey plays out (stars → village → soil → space)
3. On mobile (DevTools), confirm the mobile image loads and scrolls correctly
4. Check file sizes — if either WebP exceeds 3MB, re-export at lower quality
5. Run `pnpm check` — no TypeScript errors

---

## Task 19 — My Submissions Hub + Entity Claiming in Profile

**Goal:** Users can see and edit all content they've submitted — from a single "My Submissions" tab in their profile. They can also claim stewardship of an existing land project or alliance organisation from the same place.

---

### Background: What Already Exists

The schema and tRPC layer already handle most of the data. **Do not rebuild what's already there.**

| Data | Table | tRPC endpoint | Status |
|---|---|---|---|
| Land project applications | `applications` | `applications.myApplications` + `applications.update` | ✅ exists |
| Crowd-pooling campaigns | `campaigns` | `campaigns.myCampaigns` | ✅ exists |
| Saved contribution calculators | `saved_contributions` | `savedContributions.*` | ✅ exists |
| Investor journey form | `investor_inquiries` | ❌ **mine** missing | needs new endpoint |
| Org/entity claims | `org_claims` | `orgClaims.claim` + `orgClaims.mine` | ✅ exists |

Edit routes also mostly exist:
- Draft applications: `/apply` — but needs a `?id=X` param so it loads the existing draft
- Campaigns: `/campaign/:id/manage` — already exists
- Saved calculators: `/calculator` — needs a `?savedId=X` param

---

### Step 1 — Add missing tRPC endpoint

In `server/routers.ts`, inside the `investorInquiries` router, add:

```ts
// Get the current user's own investor inquiry (most recent, if any)
mine: protectedProcedure.query(async ({ ctx }) => {
  return db.getInvestorInquiryByUserId(ctx.user.id);
}),
```

In `server/db.ts`, add the query function:

```ts
export async function getInvestorInquiryByUserId(userId: number) {
  const results = await mysql.execute(
    `SELECT * FROM investor_inquiries WHERE userId = ? ORDER BY createdAt DESC LIMIT 1`,
    [userId]
  );
  return (results[0] as any[])[0] ?? null;
}
```

---

### Step 2 — Support `?id=` param in Apply.tsx

The Apply.tsx form already stores `applicationId` state — it just needs to accept a pre-existing ID on load so users can resume editing a saved draft.

In `client/src/pages/Apply.tsx`, add URL search param detection near the top of the component (after the existing `useLocation` call):

```ts
// Check for ?id=X to resume editing an existing draft
const searchParams = new URLSearchParams(window.location.search);
const resumeId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
```

Then load the existing application if `resumeId` is set:

```ts
const { data: existingApp } = trpc.applications.get.useQuery(
  { id: resumeId! },
  { enabled: !!resumeId }
);
```

Add a `get` endpoint if it doesn't already exist:

```ts
// Get a single application (owner only)
get: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    const app = await db.getApplicationById(input.id);
    if (!app) throw new TRPCError({ code: 'NOT_FOUND' });
    if (app.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
    return app;
  }),
```

Pre-fill the form state from `existingApp` in a `useEffect` once data loads. Set `applicationId` state to `resumeId` so that subsequent saves call `applications.update` rather than creating a new draft.

---

### Step 3 — Support `?savedId=` in Calculator page

In the calculator page (`client/src/pages/Calculator.tsx` or similar), detect `?savedId=X` and load that saved contribution:

```ts
const savedId = new URLSearchParams(window.location.search).get("savedId");
// use trpc.savedContributions.getById (add endpoint if needed) to pre-fill the calculator
```

Add tRPC endpoint if missing:

```ts
getById: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    const sc = await db.getSavedContributionById(input.id);
    if (!sc) throw new TRPCError({ code: 'NOT_FOUND' });
    if (sc.userId !== ctx.user.id) throw new TRPCError({ code: 'FORBIDDEN' });
    return sc;
  }),
```

---

### Step 4 — Add "Submissions" tab to PlayerProfile.tsx

**Pattern to follow:** Look at how the existing `ContributionsTab` and `QuestsTab` components are structured in `PlayerProfile.tsx` — they are self-contained function components defined in the same file, then rendered in the tab switch block.

**4a. Extend the tab type:**

```ts
// Before:
type ProfileTab = "overview" | "quests" | "contributions" | "settings";
// After:
type ProfileTab = "overview" | "submissions" | "quests" | "contributions" | "settings";
```

**4b. Add to PROFILE_TABS array:**

```ts
{ id: "submissions", label: "My Submissions", icon: FolderOpen },
```

(Import `FolderOpen` from `lucide-react`)

**4c. Add the SubmissionsTab component** in the file, above the main export:

```tsx
function SubmissionsTab() {
  const { data: applications = [] } = trpc.applications.myApplications.useQuery();
  const { data: campaigns = [] } = trpc.campaigns.myCampaigns.useQuery();
  const { data: savedCalcs = [] } = trpc.savedContributions.list.useQuery();
  const { data: investorInquiry } = trpc.investorInquiries.mine.useQuery();
  const { data: orgClaims = [] } = trpc.orgClaims.mine.useQuery();

  return (
    <div className="space-y-8 py-2">
      {/* Applications */}
      <SubmissionsSection
        title="Land Project Applications"
        icon={MapPin}
        items={applications}
        renderItem={(app) => (
          <SubmissionCard
            key={app.id}
            title={app.projectName}
            subtitle={app.location}
            status={app.status}
            statusColor={applicationStatusColor(app.status)}
            updatedAt={app.updatedAt}
            primaryAction={
              app.status === "draft" || app.status === "changes_requested"
                ? { label: app.status === "draft" ? "Continue Editing" : "Review & Resubmit", href: `/apply?id=${app.id}` }
                : { label: "View Application", href: `/my-applications` }
            }
          />
        )}
        emptyMessage="No applications yet."
        emptyAction={{ label: "Apply Now", href: "/apply" }}
      />

      {/* Campaigns */}
      <SubmissionsSection
        title="Crowd-Pooling Campaigns"
        icon={Layers}
        items={campaigns}
        renderItem={(campaign) => (
          <SubmissionCard
            key={campaign.id}
            title={campaign.title}
            subtitle={campaign.location ?? campaign.projectName}
            status={campaign.status}
            statusColor={campaignStatusColor(campaign.status)}
            updatedAt={campaign.updatedAt}
            primaryAction={{ label: "Manage", href: `/campaign/${campaign.id}/manage` }}
            secondaryAction={{ label: "Analytics", href: `/campaign/${campaign.id}/analytics` }}
          />
        )}
        emptyMessage="No campaigns yet."
        emptyAction={{ label: "Create Campaign", href: "/create-campaign" }}
      />

      {/* Saved Contribution Calculators */}
      <SubmissionsSection
        title="Saved Contribution Profiles"
        icon={Calculator}
        items={savedCalcs}
        renderItem={(sc) => (
          <SubmissionCard
            key={sc.id}
            title={sc.name}
            subtitle={sc.projectName ?? "Generic profile"}
            status={sc.isDefault ? "default" : "saved"}
            statusColor="green"
            updatedAt={sc.updatedAt}
            primaryAction={{ label: "Edit", href: `/calculator?savedId=${sc.id}` }}
          />
        )}
        emptyMessage="No saved contribution profiles."
        emptyAction={{ label: "Open Calculator", href: "/calculator" }}
      />

      {/* Investor Inquiry */}
      {investorInquiry && (
        <SubmissionsSection title="Investor Inquiry" icon={TrendingUp} items={[investorInquiry]} renderItem={(inv) => (
          <SubmissionCard
            key={inv.id}
            title={inv.fullName}
            subtitle={`${inv.organization ?? ""} · ${inv.investmentRange ?? "Range not set"}`}
            status={inv.status}
            statusColor={investorStatusColor(inv.status)}
            updatedAt={inv.updatedAt}
            primaryAction={{ label: "View Opportunity", href: "/opportunity" }}
          />
        )} emptyMessage="" />
      )}

      {/* Org / Entity Claims */}
      <OrgClaimsSection orgClaims={orgClaims} />
    </div>
  );
}
```

**4d. SubmissionsSection helper:**

```tsx
function SubmissionsSection<T>({
  title, icon: Icon, items, renderItem, emptyMessage, emptyAction
}: {
  title: string;
  icon: React.ElementType;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  emptyMessage: string;
  emptyAction?: { label: string; href: string };
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#7dd87d]" />
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">{title}</h3>
        <span className="text-white/40 text-xs">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <div className="bg-white/5 rounded-lg px-4 py-5 text-center">
          <p className="text-white/40 text-sm">{emptyMessage}</p>
          {emptyAction && (
            <a href={emptyAction.href} className="mt-2 inline-block text-[#7dd87d] text-sm font-medium hover:underline">
              {emptyAction.label} →
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-2">{items.map(renderItem)}</div>
      )}
    </div>
  );
}
```

**4e. SubmissionCard helper:**

```tsx
function SubmissionCard({
  title, subtitle, status, statusColor, updatedAt, primaryAction, secondaryAction
}: {
  title: string;
  subtitle?: string;
  status: string;
  statusColor: "green" | "amber" | "red" | "blue" | "gray";
  updatedAt: string | Date;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}) {
  const colorMap = {
    green: "bg-green-500/20 text-green-300",
    amber: "bg-amber-500/20 text-amber-300",
    red: "bg-red-500/20 text-red-300",
    blue: "bg-blue-500/20 text-blue-300",
    gray: "bg-white/10 text-white/50",
  };
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white font-medium text-sm truncate">{title}</p>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[statusColor]}`}>
            {status.replace(/_/g, " ")}
          </span>
        </div>
        {subtitle && <p className="text-white/40 text-xs mt-0.5 truncate">{subtitle}</p>}
        <p className="text-white/30 text-xs mt-0.5">Updated {new Date(updatedAt).toLocaleDateString()}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {secondaryAction && (
          <a href={secondaryAction.href} className="text-white/50 hover:text-white text-xs px-2 py-1 rounded border border-white/10 hover:border-white/30 transition-colors">
            {secondaryAction.label}
          </a>
        )}
        {primaryAction && (
          <a href={primaryAction.href} className="text-[#1a472a] bg-[#7dd87d] hover:bg-[#6bc86b] text-xs px-3 py-1.5 rounded font-medium transition-colors">
            {primaryAction.label}
          </a>
        )}
      </div>
    </div>
  );
}
```

**4f. Status color helpers:**

```ts
function applicationStatusColor(status: string): "green" | "amber" | "red" | "blue" | "gray" {
  const map: Record<string, "green" | "amber" | "red" | "blue" | "gray"> = {
    draft: "gray",
    submitted: "blue",
    under_review: "blue",
    approved: "green",
    rejected: "red",
    changes_requested: "amber",
  };
  return map[status] ?? "gray";
}

function campaignStatusColor(status: string): "green" | "amber" | "red" | "blue" | "gray" {
  const map: Record<string, "green" | "amber" | "red" | "blue" | "gray"> = {
    draft: "gray",
    pending_review: "blue",
    active: "green",
    funded: "green",
    completed: "green",
    cancelled: "red",
    rejected: "red",
  };
  return map[status] ?? "gray";
}

function investorStatusColor(status: string): "green" | "amber" | "red" | "blue" | "gray" {
  const map: Record<string, "green" | "amber" | "red" | "blue" | "gray"> = {
    new: "blue",
    contacted: "amber",
    in_discussion: "amber",
    committed: "green",
    declined: "red",
    archived: "gray",
  };
  return map[status] ?? "gray";
}
```

---

### Step 5 — OrgClaimsSection (entity claiming UI)

This is the "claim stewardship" flow. The `orgClaims` table and tRPC endpoints already exist — this is purely a UI addition.

**UX reference:** Think Yelp's "Is this your business?" prompt, or Google Business Profile claiming, or ProductHunt's "Are you the maker?". The pattern is:

1. User sees a search-to-claim entry point in their profile
2. They type the name of their project/org
3. Results come from the existing applications + alliance orgs in the system
4. They click "Claim This Listing" → submits a pending `orgClaim`
5. Admin reviews in the admin dashboard (already exists at `orgClaims.listAll`, `orgClaims.approve`, `orgClaims.reject`)
6. Once approved, the user gets routed join requests for that entity

**OrgClaimsSection component:**

```tsx
function OrgClaimsSection({ orgClaims }: { orgClaims: any[] }) {
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string; type: "land_project" | "alliance_org" } | null>(null);
  const claimMutation = trpc.orgClaims.claim.useMutation();

  // Search land projects from the map/applications
  const { data: searchResults } = trpc.applications.search.useQuery(
    { q: searchQuery },
    { enabled: searchQuery.length > 2 }
  );

  const handleClaim = async () => {
    if (!selectedOrg) return;
    await claimMutation.mutateAsync({
      orgType: selectedOrg.type,
      orgId: selectedOrg.id,
      orgName: selectedOrg.name,
    });
    setShowClaimForm(false);
    setSelectedOrg(null);
    // Invalidate to refetch
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#7dd87d]" />
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Organisation & Land Project Claims</h3>
        </div>
        {!showClaimForm && (
          <button
            onClick={() => setShowClaimForm(true)}
            className="text-[#7dd87d] text-xs font-medium hover:underline"
          >
            + Claim a listing
          </button>
        )}
      </div>

      {/* Existing claims */}
      {orgClaims.length > 0 && (
        <div className="space-y-2 mb-4">
          {orgClaims.map((claim) => (
            <SubmissionCard
              key={claim.id}
              title={claim.orgName}
              subtitle={claim.orgType === "land_project" ? "Land Project" : "Alliance Organisation"}
              status={claim.status}
              statusColor={claim.status === "approved" ? "green" : claim.status === "rejected" ? "red" : "amber"}
              updatedAt={claim.createdAt}
            />
          ))}
        </div>
      )}

      {/* Claim form */}
      {showClaimForm && (
        <div className="bg-white/5 border border-[#7dd87d]/20 rounded-lg p-4 space-y-3">
          <p className="text-white/70 text-sm">
            Search for a land project or organisation listed on ReGen Civics that you steward or represent.
            After submission, an admin will verify and approve your claim.
          </p>
          <input
            type="text"
            placeholder="Search by project or organisation name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#7dd87d]/60"
          />
          {/* Search results dropdown */}
          {searchResults && searchResults.length > 0 && !selectedOrg && (
            <div className="bg-[#0d2b1a] border border-white/10 rounded-lg divide-y divide-white/10 max-h-48 overflow-y-auto">
              {searchResults.map((result: any) => (
                <button
                  key={result.id}
                  onClick={() => { setSelectedOrg({ id: String(result.id), name: result.projectName, type: "land_project" }); setSearchQuery(result.projectName); }}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors"
                >
                  <p className="text-white text-sm font-medium">{result.projectName}</p>
                  <p className="text-white/40 text-xs">{result.location} · Land Project</p>
                </button>
              ))}
            </div>
          )}
          {selectedOrg && (
            <div className="flex items-center justify-between bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-lg px-4 py-3">
              <div>
                <p className="text-white text-sm font-medium">{selectedOrg.name}</p>
                <p className="text-white/50 text-xs">{selectedOrg.type === "land_project" ? "Land Project" : "Alliance Org"}</p>
              </div>
              <button onClick={() => setSelectedOrg(null)} className="text-white/40 hover:text-white/70 text-xs">✕ Change</button>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => { setShowClaimForm(false); setSelectedOrg(null); setSearchQuery(""); }} className="text-white/50 text-sm px-3 py-1.5 rounded hover:text-white transition-colors">
              Cancel
            </button>
            <button
              disabled={!selectedOrg || claimMutation.isPending}
              onClick={handleClaim}
              className="bg-[#7dd87d] text-[#1a472a] text-sm font-medium px-4 py-1.5 rounded disabled:opacity-40 hover:bg-[#6bc86b] transition-colors"
            >
              {claimMutation.isPending ? "Submitting..." : "Submit Claim"}
            </button>
          </div>
        </div>
      )}

      {orgClaims.length === 0 && !showClaimForm && (
        <p className="text-white/30 text-xs text-center py-2">No claims yet. If you steward a listed project or organisation, you can claim it above.</p>
      )}
    </div>
  );
}
```

**Add search endpoint** if it doesn't already exist in the applications router:

```ts
// Lightweight search for the claiming flow — returns only enough for the dropdown
search: publicProcedure
  .input(z.object({ q: z.string().min(1) }))
  .query(async ({ input }) => {
    return db.searchApplications(input.q); // returns { id, projectName, location }[]
  }),
```

And in `server/db.ts`:

```ts
export async function searchApplications(query: string) {
  const results = await mysql.execute(
    `SELECT id, projectName, location, country FROM applications
     WHERE status NOT IN ('draft') AND (projectName LIKE ? OR location LIKE ?)
     LIMIT 20`,
    [`%${query}%`, `%${query}%`]
  );
  return (results[0] as any[]);
}
```

---

### Step 6 — Render the new tab

In the PlayerProfile.tsx tab switch block, add:

```tsx
{activeTab === "submissions" && (
  <div className="mt-6">
    <SubmissionsTab />
  </div>
)}
```

---

### Step 7 — Admin: review org claims

Admin visibility already exists (`orgClaims.listAll`, `orgClaims.approve`, `orgClaims.reject`). Add a small "Org Claims" section to the admin dashboard (`client/src/pages/Admin.tsx` or `AdminApplications.tsx`) that lists pending claims and provides approve/reject buttons. The tRPC calls are already wired.

---

### UX decisions (best practice rationale)

**Why a new tab rather than a separate page?**
Sites like GitHub, Behance, Dribbble, and ProductHunt keep all user-generated content within the profile page using tabs. It reduces navigation friction — the user is already in their profile context. A separate `/my-applications` page is kept as a direct deep-link for existing bookmarks/emails but the canonical discovery point becomes the profile tab.

**Why status badges?**
Every major submission platform (Notion, Airtable, Typeform, Jotform) shows inline status so users immediately understand where each submission stands without clicking through. Colour-coded chips (green = live/approved, amber = pending/action needed, red = rejected, blue = under review) match the existing site design language.

**Why search-before-claim for entity claiming?**
Yelp, Google Business Profile, and ProductHunt all use a search-first flow rather than letting users type arbitrary org names. This keeps claim data clean and links directly to real records in the database. Admin review remains mandatory — no auto-approval — which protects against false claims.

**What about mobile?**
`SubmissionCard` uses `flex-wrap` so action buttons reflow below the title on small screens. The `OrgClaimsSection` search input is full-width. No horizontal overflow.

---

### Required imports to add to PlayerProfile.tsx

```tsx
import { FolderOpen, MapPin, Layers, Calculator, TrendingUp, Building2 } from "lucide-react";
```

---

### Files to change

| File | Change |
|---|---|
| `server/routers.ts` | Add `investorInquiries.mine` + `applications.search` endpoints |
| `server/db.ts` | Add `getInvestorInquiryByUserId()` + `searchApplications()` |
| `client/src/pages/Apply.tsx` | Detect `?id=` param, load existing draft, pre-fill form |
| `client/src/pages/PlayerProfile.tsx` | Add "submissions" tab type, PROFILE_TABS entry, SubmissionsTab + helper components |
| `client/src/pages/Calculator.tsx` | Detect `?savedId=` param, load and pre-fill saved contribution |

---

### Verify

1. Run `pnpm check` — zero TypeScript errors
2. Log in, visit `/profile`, confirm "My Submissions" tab appears
3. If you have an existing application: confirm it shows with correct status badge and the "Continue Editing" link goes to `/apply?id=X` with the form pre-filled
4. If you have an existing campaign: confirm "Manage" and "Analytics" links work
5. Test org claim flow: search for a project → select → submit → confirm admin panel shows pending claim → approve → confirm claim shows as "approved" in the user's tab
6. Run `pnpm dev` and check mobile view (DevTools, 375px) — cards should stack cleanly


---

## Task 20 — Live Blockchain Token Balance Sync (RGVoice + ReGen)

**Goal:** When a user has saved their wallet public key on their profile, automatically fetch their live on-chain token balances for RGVoice and ReGen Game tokens from the Base blockchain. Balances are read-only — no wallet signing, no private keys, no third-party auth required.

---

### Token contracts (Base mainnet — chain ID 8453)

| Token | Contract address | Standard | Decimals | Your test balance |
|---|---|---|---|---|
| RGVoice (RGVOICE) | `0x4d848b3f2d74d1d2f6c75c55d0751dab8fc7d707` | ERC-20 | 18 | 1,112 |
| ReGen Game (REGEN) | `0x4e617cd113364193d215d107add6fa50418aa2e4` | ERC-20\* | 18 | 111 |

\* BaseScan labels REGEN as ERC-1155 in its tab title but the contract exposes a standard ERC-20 `balanceOf(address)` function and 18-decimal fungible balance. Use the ERC-20 call. If it reverts, fall back to ERC-1155 `balanceOf(address,uint256)` with tokenId=0.

**RPC:** Base public RPC — `https://mainnet.base.org` — no API key required for read calls. Optionally add `BASE_RPC_URL` to `.env` so operators can substitute Alchemy/Infura if desired.

---

### Background: What already exists

The schema and profile UI are already wired — the data just never gets populated from the chain.

| What | Location | Status |
|---|---|---|
| `walletAddress` field | `player_profiles` table | ✅ exists — users already save their public key here |
| `rvoiceBalance`, `rgenBalance`, `lastTokenSync` | `player_profiles` table | ✅ exists — fields waiting to be filled |
| `syncTokens` tRPC endpoint | `server/routers.ts` | ⚠️ exists but **admin-only** — needs self-service version |
| Balance display on profile | `PlayerProfile.tsx` ~line 401 | ✅ exists — already renders `profile.rvoiceBalance` |

No blockchain library is installed. Use native `fetch` with JSON-RPC — no `viem` or `ethers` needed.

---

### Step 1 — Create `server/blockchain.ts`

New file. Pure JSON-RPC `eth_call` to read ERC-20 `balanceOf`. No dependencies beyond `fetch`.

```ts
// server/blockchain.ts
// Read-only Base blockchain queries — no wallet, no signing.

const BASE_RPC         = process.env.BASE_RPC_URL        ?? "https://mainnet.base.org";
const RGVOICE_CONTRACT = process.env.RGVOICE_TOKEN_CONTRACT ?? "0x4d848b3f2d74d1d2f6c75c55d0751dab8fc7d707";
const REGEN_CONTRACT   = process.env.REGEN_TOKEN_CONTRACT   ?? "0x4e617cd113364193d215d107add6fa50418aa2e4";

// ERC-20 balanceOf(address) function selector
const ERC20_BALANCE_OF_SELECTOR = "0x70a08231";

// ERC-1155 balanceOf(address,uint256) function selector (fallback)
const ERC1155_BALANCE_OF_SELECTOR = "0x00fdd58e";

/**
 * ABI-encode a single address argument (left-pad to 32 bytes).
 */
function encodeAddress(addr: string): string {
  return addr.toLowerCase().replace("0x", "").padStart(64, "0");
}

/**
 * ABI-encode a uint256 argument (left-pad to 32 bytes).
 */
function encodeUint256(n: bigint): string {
  return n.toString(16).padStart(64, "0");
}

/**
 * Call a read-only contract function via eth_call.
 * Returns the raw hex result string, or null on error.
 */
async function ethCall(to: string, data: string): Promise<string | null> {
  try {
    const res = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to, data }, "latest"],
        id: 1,
      }),
      signal: AbortSignal.timeout(8000), // 8s timeout
    });
    const json = await res.json() as any;
    if (json.error || !json.result || json.result === "0x") return null;
    return json.result as string;
  } catch {
    return null;
  }
}

/**
 * Read an ERC-20 balanceOf(address) and return the human-readable integer
 * (raw value divided by 10^18, floored).
 * Falls back to ERC-1155 balanceOf(address,0) if ERC-20 reverts.
 */
async function readErc20Balance(contractAddr: string, walletAddr: string): Promise<number> {
  const calldata = ERC20_BALANCE_OF_SELECTOR + encodeAddress(walletAddr);
  let raw = await ethCall(contractAddr, calldata);

  // Fallback: try ERC-1155 balanceOf(address, tokenId=0)
  if (!raw) {
    const calldata1155 =
      ERC1155_BALANCE_OF_SELECTOR +
      encodeAddress(walletAddr) +
      encodeUint256(0n);
    raw = await ethCall(contractAddr, calldata1155);
  }

  if (!raw) return 0;

  try {
    // raw is "0x" + 64 hex chars = 256-bit uint
    const rawBig = BigInt(raw);
    // Divide by 10^18, floor to integer
    const human = rawBig / BigInt(10 ** 18);
    return Number(human);
  } catch {
    return 0;
  }
}

/**
 * Fetch both token balances for a wallet address.
 * Returns { rvoice, rgen } as human-readable integers.
 */
export async function fetchTokenBalances(walletAddress: string): Promise<{
  rvoice: number;
  rgen: number;
}> {
  const [rvoice, rgen] = await Promise.all([
    readErc20Balance(RGVOICE_CONTRACT, walletAddress),
    readErc20Balance(REGEN_CONTRACT, walletAddress),
  ]);
  return { rvoice, rgen };
}
```

---

### Step 2 — Add `.env.example` entry

In `.env.example` (and optionally `.env`), add:

```
# Base RPC URL (defaults to public endpoint, replace with Alchemy/Infura for reliability)
BASE_RPC_URL=https://mainnet.base.org

# Token contract addresses on Base mainnet (hardcoded fallbacks exist in blockchain.ts)
RGVOICE_TOKEN_CONTRACT=0x4d848b3f2d74d1d2f6c75c55d0751dab8fc7d707
REGEN_TOKEN_CONTRACT=0x4e617cd113364193d215d107add6fa50418aa2e4
```

---

### Step 3 — Replace the admin-only `syncTokens` with a self-service endpoint

In `server/routers.ts`, inside the `playerProfiles` router, replace:

```ts
// Admin: Update token balances (from blockchain sync)
syncTokens: protectedProcedure
  .input(z.object({
    id: z.number(),
    rvoiceBalance: z.number(),
    rgenBalance: z.number(),
  }))
  .mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    await db.updatePlayerProfile(input.id, {
      rvoiceBalance: input.rvoiceBalance,
      rgenBalance: input.rgenBalance,
      lastTokenSync: new Date(),
    });
    return { success: true };
  }),
```

With:

```ts
// Self-service: sync own token balances from Base blockchain.
// Rate-limited to once per 5 minutes by checking lastTokenSync.
syncTokens: protectedProcedure
  .mutation(async ({ ctx }) => {
    const profile = await db.getPlayerProfileByUserId(ctx.user.id);
    if (!profile) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Player profile not found" });
    }
    if (!profile.walletAddress) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No wallet address on profile" });
    }

    // Rate limit: don't sync more than once per 5 minutes
    if (profile.lastTokenSync) {
      const msSince = Date.now() - new Date(profile.lastTokenSync).getTime();
      if (msSince < 5 * 60 * 1000) {
        // Return cached values without hitting the chain
        return {
          rvoice: profile.rvoiceBalance,
          rgen: profile.rgenBalance,
          cached: true,
        };
      }
    }

    const { fetchTokenBalances } = await import("../blockchain.js");
    const balances = await fetchTokenBalances(profile.walletAddress);

    await db.updatePlayerProfile(profile.id, {
      rvoiceBalance: balances.rvoice,
      rgenBalance: balances.rgen,
      lastTokenSync: new Date(),
    });

    return { rvoice: balances.rvoice, rgen: balances.rgen, cached: false };
  }),

// Admin: force-sync any profile by ID (still useful for support)
adminSyncTokens: adminProcedure
  .input(z.object({ profileId: z.number() }))
  .mutation(async ({ input }) => {
    const profile = await db.getPlayerProfileById(input.profileId);
    if (!profile || !profile.walletAddress) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Profile not found or no wallet address" });
    }
    const { fetchTokenBalances } = await import("../blockchain.js");
    const balances = await fetchTokenBalances(profile.walletAddress);
    await db.updatePlayerProfile(profile.id, {
      rvoiceBalance: balances.rvoice,
      rgenBalance: balances.rgen,
      lastTokenSync: new Date(),
    });
    return { rvoice: balances.rvoice, rgen: balances.rgen };
  }),
```

**Check `db.getPlayerProfileByUserId` exists** in `server/db.ts`. If not, add:

```ts
export async function getPlayerProfileByUserId(userId: number) {
  const results = await mysql.execute(
    `SELECT * FROM player_profiles WHERE userId = ? LIMIT 1`,
    [userId]
  );
  return (results[0] as any[])[0] ?? null;
}
```

---

### Step 4 — Auto-sync on profile page load + manual Refresh button

In `client/src/pages/PlayerProfile.tsx`, in the main `PlayerProfilePage` component:

**4a. Add the mutation:**

```ts
const syncTokens = trpc.playerProfiles.syncTokens.useMutation({
  onSuccess: (data) => {
    // Refetch profile to show updated balances
    utils.playerProfiles.getMyProfile.invalidate();
  },
});
```

**4b. Auto-trigger on load** when wallet address is set and sync is stale (>10 min):

```ts
useEffect(() => {
  if (!profile) return;
  if (!profile.walletAddress) return;

  const tenMinutes = 10 * 60 * 1000;
  const isStale = !profile.lastTokenSync ||
    Date.now() - new Date(profile.lastTokenSync).getTime() > tenMinutes;

  if (isStale && !syncTokens.isPending) {
    syncTokens.mutate();
  }
}, [profile?.walletAddress, profile?.lastTokenSync]);
```

**4c. Add a "Refresh Balances" button** near the existing balance display (around line 401 where `profile.rvoiceBalance` is rendered):

```tsx
{profile.walletAddress && (
  <div className="flex items-center gap-2 mt-1">
    <button
      onClick={() => syncTokens.mutate()}
      disabled={syncTokens.isPending}
      className="flex items-center gap-1.5 text-[#7dd87d]/70 hover:text-[#7dd87d] text-xs transition-colors disabled:opacity-40"
    >
      <RefreshCw className={`w-3 h-3 ${syncTokens.isPending ? "animate-spin" : ""}`} />
      {syncTokens.isPending ? "Syncing..." : "Refresh balances"}
    </button>
    {profile.lastTokenSync && (
      <span className="text-white/25 text-xs">
        Updated {new Date(profile.lastTokenSync).toLocaleTimeString()}
      </span>
    )}
  </div>
)}
```

Import `RefreshCw` from `lucide-react`.

---

### Step 5 — Handle the case where wallet address isn't saved yet

If `profile.walletAddress` is null, the balance section should show:

```tsx
{!profile.walletAddress && (
  <p className="text-white/30 text-xs mt-1">
    Add your wallet address in Settings to sync balances.
  </p>
)}
```

This nudges users toward the settings tab where they can enter their public key.

---

### How the full flow works for a user

1. User goes to Settings tab in their profile, enters their Base wallet address (e.g. `0xaAaF...354e`) and saves it — this writes to `player_profiles.walletAddress`.
2. Next time they load `/profile`, the auto-sync useEffect fires. It calls `playerProfiles.syncTokens` with no arguments.
3. The server reads `player_profiles.walletAddress`, calls `balanceOf()` on both contracts via the Base public RPC, stores the results in `rvoiceBalance` / `rgenBalance` / `lastTokenSync`.
4. The profile page re-fetches and displays the updated numbers.
5. Within 5 minutes, any repeat calls return the cached DB values without hitting the chain. After 5 minutes the next sync call goes live again.

---

### Files to change

| File | Change |
|---|---|
| `server/blockchain.ts` | **NEW** — `fetchTokenBalances(walletAddress)` using raw `fetch` + eth_call |
| `server/routers.ts` | Replace admin-only `syncTokens` with self-service mutation + add `adminSyncTokens` |
| `server/db.ts` | Add `getPlayerProfileByUserId()` if missing |
| `.env.example` | Add `BASE_RPC_URL`, `RGVOICE_TOKEN_CONTRACT`, `REGEN_TOKEN_CONTRACT` optional vars |
| `client/src/pages/PlayerProfile.tsx` | Add `syncTokens` mutation, auto-sync useEffect, Refresh button, stale-state messaging |

---

### Verify

1. Run `pnpm check` — no TypeScript errors
2. In dev, set your own wallet address in the profile settings
3. On next profile load, confirm the console shows no errors and balances update (check `player_profiles` row in DB — `rvoiceBalance` should show 1112, `rgenBalance` 111 for your address)
4. Click "Refresh balances" within 5 minutes — confirm it returns cached values (fast, no chain call)
5. Confirm no API key is needed — it works with just the public Base RPC
6. Test with a wallet address that holds zero tokens — should show 0, not null or error


---

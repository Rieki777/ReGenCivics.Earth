# Command Center: Full Page-Aware Specification

**Date:** 2026-03-26
**For:** Claude Code handoff. Complete spec for the redesigned Command Center.

---

## Philosophy

The Command Center replaces every floating button, FAB, back pill, and bottom-corner widget in the entire app. One persistent bar. One expandable panel. Everything is one tap away, nothing floats over page content.

Players learn one pattern: "the bar at the bottom has everything."

---

## Architecture: Two Layers

### Layer 1: The Bar (always visible, all screen sizes)

5 slots. Always present. Clean and compact.

```
Mobile + Desktop:
┌─────────┬───────────┬─────────┬─────────┬──────┐
│ Quests  │ Community │  Apply  │  Music  │ More │
└─────────┴───────────┴─────────┴─────────┴──────┘
```

**On sub-pages** (anything that isn't a top-level route), slot 1 swaps to Back:

```
Sub-page (e.g., /community/post/599):
┌─────────┬───────────┬─────────┬─────────┬──────┐
│ ← Back  │ Community │  Apply  │  Music  │ More │
└─────────┴───────────┴─────────┴─────────┴──────┘
```

Top-level routes (no Back): `/`, `/land`, `/play`, `/quest`, `/community`, `/fund`, `/apply`, `/profile`, `/map`, `/blog`

Everything else gets Back in slot 1.

**Desktop addition:** On desktop (`md:` and up), also render a subtle inline breadcrumb-style back link at the top of sub-pages. Not a floating pill. Just a quiet `← Back to Quests` text in the page flow, above the content. Both the bar Back and the inline Back work. Mouse users get the inline link; everyone gets the bar.

### Layer 2: The Panel (tap "More" to expand)

Slides up from behind the bar. Page-aware. Organized in sections.

**Structure (top to bottom):**

```
┌─────────────────────────────────────────────┐
│  PAGE TOOLS (changes per page)              │
│  [icon] [icon] [icon] [icon]                │
├─────────────────────────────────────────────┤
│  NAVIGATE                                   │
│  [← Back]  [🔍 Search]  [✨ Guide]  [👤 Me]│
├─────────────────────────────────────────────┤
│  NOW PLAYING                                │
│  ▶ Wonderland  ─────────○───── 2:31 / 4:12 │
│       ⏮    ▶    ⏭     ─── vol ────        │
├─────────────────────────────────────────────┤
│  14 players online              🔥 3 moons  │
└─────────────────────────────────────────────┘
```

**Section details:**

**PAGE TOOLS** (top row, page-specific, see full breakdown below)
- Grid of icon buttons. 4 columns on mobile, up to 6 on desktop.
- Each button: 48x48 tap target, icon + 10px label underneath
- Only shows tools relevant to the current page
- If no page-specific tools exist, this section is hidden

**NAVIGATE** (always present)
- Back: only shows on sub-pages (mirrors the bar slot)
- Search: dispatches `open-command-palette` event (existing CommandPalette)
- Guide: opens the ReGen Guide chat panel (via ReGenGuideContext)
- Me: navigates to `/profile`

**NOW PLAYING** (always present)
- Full music player: song title, progress bar, prev/next/play, volume
- Already built in CommandPanel.tsx, just needs to be positioned in this section

**STATUS BAR** (bottom of panel, always present)
- Left: player count with green pulse dot ("14 players online")
- Right: lunar streak with flame icon ("🔥 3 moons")
- If user not logged in, streak is hidden and count still shows

---

## Page Tools Breakdown: Every Page

### `/` (Home)

No page tools. The home page is a landing page with its own CTAs inline.

```
PAGE TOOLS: (hidden)
NAVIGATE: Search | Guide | Me
```

### `/land`

The Land page is about attracting land projects.

```
PAGE TOOLS:
  🌱 Apply      📅 Sessions    🗺️ Map       📋 Criteria
```

| Button | Icon | Action |
|--------|------|--------|
| Apply | Sprout | Navigate to `/apply` |
| Sessions | Calendar | Navigate to `/schedule` or scroll to sessions section |
| Map | Globe | Navigate to `/map` |
| Criteria | Clipboard | Scroll to the "What We Look For" section (anchor link) |

### `/play`

The Play page is about the game mechanics.

```
PAGE TOOLS:
  ⚔️ Quest      🎲 Games      🪙 Tokens     📅 Sessions
```

| Button | Icon | Action |
|--------|------|--------|
| Quest | Scroll | Navigate to `/quest` |
| Games | Sparkles | Navigate to `/regen-games` |
| Tokens | Coins | Scroll to Token System section |
| Sessions | Calendar | Navigate to `/schedule` |

### `/quest` (the big one)

The Quest page has the most tools. All three former FABs live here.

```
PAGE TOOLS:
  📊 Progress   🏆 Badges     📸 Field      💡 Propose
```

| Button | Icon | Action |
|--------|------|--------|
| Progress | TrendingUp | Opens QuestProgressTracker modal (shows X/14 completion, rewards) |
| Badges | Award | Opens QuestBadges modal (grid of 14 badges) |
| Field | Users | Opens QuestArtifactsGallery modal ("From the Field", active players, recent completions) |
| Propose | PenLine | Navigate to `/community/quests` (quest suggestion page) |

These four buttons replace the three stacked FABs currently at `bottom-4`, `bottom-24`, and `bottom-20` on the right side. The FAB components stay as-is internally (they render modals), but their trigger buttons move from floating position into the Command Panel. The floating buttons in each component are hidden; the panel buttons call the same open/toggle functions.

**Implementation detail:** Each of these components (QuestProgressTracker, QuestBadges, QuestArtifactsGallery) needs to expose an imperative `open()` method or accept an `isOpen` controlled prop. If they currently manage their own open state internally, convert them to accept `externalOpen` / `onOpenChange` props, or use a shared context.

### `/community`

```
PAGE TOOLS:
  ✏️ New Post   🔥 Resonance   🌱 Seeds      📋 Guidelines
```

| Button | Icon | Action |
|--------|------|--------|
| New Post | PenLine | Navigate to `/community/new` |
| Resonance | Flame | Set forum sort to "resonance" (dispatches event or calls context) |
| Seeds | Sprout | Filter to show only seed posts |
| Guidelines | BookOpen | Navigate to `/community/guidelines` |

### `/community/post/:id` (viewing a forum thread)

```
PAGE TOOLS:
  💬 Reply      🔗 Copy Link   ⚡ Propose    🌳 Roots
```

| Button | Icon | Action |
|--------|------|--------|
| Reply | MessageCircle | Scroll to reply form and focus editor (reuses existing reply logic) |
| Copy Link | Link | Copy post URL to clipboard, show toast confirmation |
| Propose | Sparkles | Navigate to `/community/quests?propose=true&title=...&threadId=...` |
| Roots | GitBranch | Toggle the ThreadRoots conversation map view (if 10+ replies) |

### `/community/c/:slug` (category view)

```
PAGE TOOLS:
  ✏️ New Post   ← Forum
```

| Button | Icon | Action |
|--------|------|--------|
| New Post | PenLine | Navigate to `/community/new?category=:slug` |
| Forum | ArrowLeft | Navigate to `/community` |

### `/fund`

```
PAGE TOOLS:
  📄 LOI        💼 Invest      📊 Calculator  🗺️ Map
```

| Button | Icon | Action |
|--------|------|--------|
| LOI | FileText | Navigate to `/loi` |
| Invest | TrendingUp | Navigate to `/investor` |
| Calculator | Calculator icon | Navigate to `/calculator` |
| Map | Globe | Navigate to `/map` |

### `/apply`

Applying is a focused form flow. Minimal distractions.

```
PAGE TOOLS:
  📋 Criteria   🌱 Land Info    📊 Status
```

| Button | Icon | Action |
|--------|------|--------|
| Criteria | Clipboard | Scroll to or open criteria section |
| Land Info | Leaf | Navigate to `/land` (reference info about the program) |
| Status | FileText | Navigate to `/apply/status` (check application status) |

### `/profile`

```
PAGE TOOLS:
  ✏️ Edit       🔄 Sync        ⚙️ Settings   📓 Journal
```

| Button | Icon | Action |
|--------|------|--------|
| Edit | PenLine | Switch to edit mode / edit tab |
| Sync | RefreshCw | Trigger token sync (calls existing sync function) |
| Settings | Settings icon | Open settings panel |
| Journal | BookOpen | Switch to journal tab (quest journal, C.3) |

### `/map`

```
PAGE TOOLS:
  📋 Legend     🌱 Apply       🤝 Alliance
```

| Button | Icon | Action |
|--------|------|--------|
| Legend | List | Toggle the map legend panel |
| Apply | Sprout | Navigate to `/apply` |
| Alliance | Handshake | Navigate to `/ally` |

### `/crowd-pooling`

```
PAGE TOOLS:
  🏗️ Projects   📊 Calculator  📄 Agreements
```

| Button | Icon | Action |
|--------|------|--------|
| Projects | Mountain | Navigate to `/crowd-pooling-projects` |
| Calculator | Calculator icon | Navigate to `/calculator` |
| Agreements | FileText | External link to crowd pooling agreements |

### `/blog`

```
PAGE TOOLS:
  💡 Suggest    🗳️ Vote
```

| Button | Icon | Action |
|--------|------|--------|
| Suggest | PenLine | Opens the blog suggestion form inline |
| Vote | Vote | Scrolls to the voting section |

### `/blog/:slug` (reading a blog post)

```
PAGE TOOLS:
  🔗 Share      ← Blog
```

| Button | Icon | Action |
|--------|------|--------|
| Share | Share2 | Copy blog post URL to clipboard |
| Blog | ArrowLeft | Navigate to `/blog` |

### Other pages (`/governance`, `/tokenomics`, `/glossary`, `/seasons`, etc.)

Most info pages need minimal tools.

```
PAGE TOOLS: (hidden or just one)
```

If the page is a sub-page, Back is already in the bar. The panel shows the standard Navigate + Music + Status sections.

### Admin pages (`/admin/*`)

The Command Center bar is hidden on admin routes (`adminMode` is true). Admin has its own navigation. No changes needed.

---

## Desktop: Two-Tier Enhancement

On desktop (`md:` and up), the bar can optionally render a **second row above it** for page tools, so players don't even need to tap "More" for the most common actions.

```
Desktop (Quest page):
┌─────────────────────────────────────────────────────────────────┐
│  📊 Progress  │  🏆 Badges  │  📸 Field  │  💡 Propose  │  ✨ Guide  │
├─────────────────────────────────────────────────────────────────┤
│    Quests     │  Community  │   Apply    │   ♫ Music    │   More    │
└─────────────────────────────────────────────────────────────────┘
```

The top row is the page tools row. It's visible on desktop by default (no need to tap "More"). The "More" panel still exists for the music player full UI, status bar, and any overflow.

On mobile, the top row is hidden and everything goes into the "More" panel.

**Implementation:**

```tsx
// In SmartBottomNav.tsx
const pageTools = usePageTools(currentPath); // returns tool config for current page

return (
  <nav className="fixed bottom-0 left-0 right-0 z-50">
    {/* Desktop-only page tools row */}
    {pageTools.length > 0 && (
      <div className="hidden md:flex items-center justify-center gap-1 h-12 bg-[#1a472a]/90 backdrop-blur-sm border-t border-[#7dd87d]/10 max-w-3xl mx-auto">
        {pageTools.map(tool => (
          <button
            key={tool.id}
            onClick={tool.action}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors text-xs"
          >
            <tool.icon className="w-4 h-4" />
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
    )}

    {/* Main nav bar */}
    <div className="grid grid-cols-5 h-16 bg-[#1a472a]/95 backdrop-blur-sm border-t border-[#7dd87d]/20 max-w-2xl mx-auto">
      {/* ...existing 5 slots... */}
    </div>
  </nav>
);
```

Main content padding adjusts: `pb-20` when page tools exist on desktop, `pb-16` otherwise. Use a CSS variable or a context to communicate this.

---

## The `usePageTools` Hook

Create `client/src/hooks/usePageTools.ts`:

```typescript
import { useLocation } from 'wouter';
import {
  TrendingUp, Award, Users, PenLine, Sparkles, MessageCircle, Link,
  Sprout, Calendar, Globe, Clipboard, Coins, Scroll, FileText,
  BookOpen, RefreshCw, Settings, Flame, List, Mountain, Handshake,
  Share2, Vote, ArrowLeft,
} from 'lucide-react';

interface PageTool {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
}

export function usePageTools(): PageTool[] {
  const [location] = useLocation();
  const path = location.split('?')[0].replace(/\/$/, '') || '/';

  // Match route patterns
  if (path === '/quest') return questTools();
  if (path === '/community') return communityTools();
  if (path.startsWith('/community/post/')) return postTools(path);
  if (path.startsWith('/community/c/')) return categoryTools();
  if (path === '/fund') return fundTools();
  if (path === '/land') return landTools();
  if (path === '/play') return playTools();
  if (path === '/apply') return applyTools();
  if (path === '/profile') return profileTools();
  if (path === '/map') return mapTools();
  if (path === '/crowd-pooling') return crowdPoolingTools();
  if (path === '/blog') return blogTools();
  if (path.startsWith('/blog/')) return blogPostTools();

  return []; // No page-specific tools
}
```

Each `*Tools()` function returns the array of `PageTool` objects for that page. The `action` callback is what fires on tap. For modals (like QuestProgressTracker), use a context or custom event to open them.

---

## Opening Modals from the Panel

Three Quest page components currently manage their own open/close state internally. To trigger them from the Command Center, they need to be controllable externally.

**Pattern: Custom events (simplest, no refactoring needed)**

Each component listens for a custom event:

```tsx
// In QuestProgressTracker.tsx, add:
useEffect(() => {
  const handler = () => setIsOpen(true);
  window.addEventListener('open-quest-progress', handler);
  return () => window.removeEventListener('open-quest-progress', handler);
}, []);
```

The page tool action dispatches it:

```typescript
function questTools(): PageTool[] {
  return [
    {
      id: 'progress',
      label: 'Progress',
      icon: TrendingUp,
      action: () => window.dispatchEvent(new CustomEvent('open-quest-progress')),
    },
    {
      id: 'badges',
      label: 'Badges',
      icon: Award,
      action: () => window.dispatchEvent(new CustomEvent('open-quest-badges')),
    },
    {
      id: 'field',
      label: 'Field',
      icon: Users,
      action: () => window.dispatchEvent(new CustomEvent('open-quest-gallery')),
    },
    {
      id: 'propose',
      label: 'Propose',
      icon: PenLine,
      action: () => { window.location.href = '/community/quests'; },
    },
  ];
}
```

Same pattern for ReGen Guide, Map legend, etc. Zero refactoring of existing components. Just add event listeners.

---

## Removing All Floating Elements

After the Command Center handles everything, remove or hide the floating triggers from these components:

| Component | What to hide | Keep |
|-----------|-------------|------|
| `QuestProgressTracker.tsx` | The `fixed bottom-4 right-4` button | The modal overlay |
| `QuestBadges.tsx` | The `fixed bottom-24 right-6` button | The modal overlay |
| `QuestArtifactsGallery.tsx` | The `fixed bottom-20 right-[5.5rem]` button | The modal/slideup overlay |
| `ReGenGuide.tsx` | The `fixed bottom-20 left-6` button | The chat panel |
| `MobileTableOfContents.tsx` | The `fixed bottom-20 right-6` FAB | The section menu |
| `ShortcutPill.tsx` | The `fixed bottom-6 right-6` pill | Nothing (action moves to panel) |
| `BackButton.tsx` | Neuter to `return null` | Nothing (action in bar + inline) |
| `ScrollToTop.tsx` | Change to `bottom-20` | The button (repositioned above bar) |
| `CookieConsent.tsx` | Change to `bottom-16` everywhere | The banner (repositioned above bar) |

After hiding: run a visual audit of every page. Nothing should float below the bar.

---

## Visual Design Notes

**Panel background:** `bg-[#1a472a]/98 backdrop-blur-md`. Same as current CommandPanel. Seasonal theme gradient overlay on top (Section A.8 from strategy doc).

**Page tools row (desktop):** Slightly more transparent than the main bar. `bg-[#1a472a]/85`. Feels like a toolbar extension, not a separate element.

**Tool button style in panel:**
```tsx
// 48px min tap target, icon + label, subtle hover
<button className="flex flex-col items-center gap-1 py-2 px-3 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors min-w-[56px]">
  <Icon className="w-5 h-5 text-white/60 group-hover:text-[#7dd87d]" />
  <span className="text-[10px] text-white/40">{label}</span>
</button>
```

**Section headers in panel:**
```tsx
// Tiny uppercase labels, very subtle
<span className="text-[9px] uppercase tracking-widest text-white/20 px-1">Quest Tools</span>
```

**Page-reactive accent line:** A 2px gradient line at the very top of the bar that changes color per page (already specced in A.5 of strategy doc). This gives a subtle visual signal of "where you are" without needing to read the labels.

---

## Files to Create/Change

**New files:**
- `client/src/hooks/usePageTools.ts` (page-aware tool registry)
- `client/src/contexts/ReGenGuideContext.tsx` (Guide open/close state)

**Major changes:**
- `client/src/components/SmartBottomNav.tsx` (add desktop page tools row, Back slot logic, accent line)
- `client/src/components/CommandPanel.tsx` (restructure: page tools grid + navigate row + music + status)
- `client/src/hooks/useSmartNav.ts` (add isSubPage detection, Back slot)

**Add event listeners to:**
- `client/src/components/QuestProgressTracker.tsx` (listen for `open-quest-progress`)
- `client/src/components/QuestBadges.tsx` (listen for `open-quest-badges`)
- `client/src/components/QuestArtifactsGallery.tsx` (listen for `open-quest-gallery`)
- `client/src/components/ReGenGuide.tsx` (use ReGenGuideContext instead of local state)
- `client/src/components/MobileTableOfContents.tsx` (listen for `open-toc`)

**Hide floating triggers in:**
- All 9 components listed in the removal table above

**Reposition:**
- `client/src/components/ScrollToTop.tsx` (bottom-20)
- `client/src/components/CookieConsent.tsx` (bottom-16 on all sizes)

**Neuter:**
- `client/src/components/BackButton.tsx` (return null)

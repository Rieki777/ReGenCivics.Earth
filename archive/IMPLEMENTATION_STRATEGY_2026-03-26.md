# ReGen Civics: Full Implementation Strategy
## Command Center + Forum + Profile Upgrades

**Date:** 2026-03-26
**For:** Claude Code handoff. Zero ambiguity. Every feature fully specified.

---

## CRITICAL: Fix Truncated Files First

**ALREADY FIXED in this session:**
- `client/src/components/SmartBottomNav.tsx` -- was truncated at line 102, now complete with SONG_SHORT_LABELS
- `client/src/App.tsx` -- was truncated at line 327 (missing closing tags), now complete

Both files have been reconstructed. Verify they compile with `pnpm build` before proceeding.

---

## CRITICAL: Bottom Element Overlap Fix (Fix 221)

**Problem:** The Command Center bar (`fixed bottom-0 h-16 z-50`) overlaps multiple floating elements positioned at the bottom of pages. There are **12 floating bottom-positioned elements** in the codebase that need to be addressed:

| Component | Current Position | File |
|-----------|-----------------|------|
| ReGenGuide button | `fixed bottom-20 md:bottom-6 left-6 z-40` | `components/ReGenGuide.tsx` |
| ReGenGuide chat panel | `fixed bottom-[8.5rem] md:bottom-20 z-[9999]` | `components/ReGenGuide.tsx` |
| ScrollToTop | `fixed bottom-[128px] right-4 z-40` | `components/ScrollToTop.tsx` |
| QuestProgressTracker | `fixed bottom-4 right-4 z-40` | `components/QuestProgressTracker.tsx` |
| QuestBadges | `fixed bottom-24 right-6 z-40` | `components/QuestBadges.tsx` |
| QuestArtifactsGallery | `fixed bottom-20 md:bottom-6 right-[5.5rem] z-40` | `components/QuestArtifactsGallery.tsx` |
| MobileTableOfContents | `fixed bottom-20 md:bottom-6 right-6 z-40 md:hidden` | `components/MobileTableOfContents.tsx` |
| ShortcutPill | `fixed bottom-6 right-6 z-40` | `components/ShortcutPill.tsx` |
| SiteTour | `fixed bottom-[72px] right-4 z-40` | `components/SiteTour.tsx` |
| CookieConsent | `fixed bottom-16 md:bottom-0 z-[9999]` | `components/CookieConsent.tsx` |
| CommandPanel | `fixed bottom-16 z-40` | `components/CommandPanel.tsx` |
| AdminAIAssistant | `fixed bottom-6 right-6 z-50` | `components/AdminAIAssistant.tsx` |

**Main content padding:** `<main className="pb-20">` in App.tsx (80px, should be enough for a 64px bar + 16px buffer)

### Fix Strategy: Move tools INTO the Command Center

Instead of playing z-index whack-a-mole, consolidate floating buttons into the expanded CommandPanel. This is better UX anyway: one control center instead of a mess of floating buttons.

**Elements to MOVE INTO CommandPanel:**
1. **ReGen Guide** -- add a "Guide" button in the expanded panel that opens the chat. Remove the floating button.
2. **QuestProgressTracker** -- show as a progress bar in the panel (already planned in A.6)
3. **QuestBadges** -- add a "Badges" button in the expanded panel
4. **QuestArtifactsGallery ("From the Field")** -- add a button in the expanded panel
5. **ShortcutPill (search hint)** -- move into the panel as a search shortcut button
6. **MobileTableOfContents** -- add a "Jump to" button in the expanded panel on relevant pages

**Elements to KEEP but REPOSITION above the nav bar:**
7. **ScrollToTop** -- change to `fixed bottom-20 right-4 z-40` (64px + 16px above nav bar)
8. **CookieConsent** -- change to `fixed bottom-16 left-0 right-0 z-[9999]` (sits above the nav bar on all screen sizes)

**Elements already correct:**
9. **CommandPanel** -- `fixed bottom-16 z-40` is correct (sits above nav bar)
10. **AdminAIAssistant** -- only shows on admin pages where SmartBottomNav is hidden

### Implementation Details

#### CommandPanel.tsx: Add tool buttons grid

Add a section above the music player in the expanded CommandPanel:

```tsx
{/* Quick tools grid */}
<div className="grid grid-cols-4 gap-2 pb-3 border-b border-[#7dd87d]/10">
  <PanelButton icon={Sparkles} label="Guide" onClick={() => { onClose(); openReGenGuide(); }} />
  <PanelButton icon={Trophy} label="Badges" onClick={() => { onClose(); openBadges(); }} />
  <PanelButton icon={Image} label="Gallery" onClick={() => { onClose(); openGallery(); }} />
  <PanelButton icon={Search} label="Search" onClick={() => { onClose(); openCommandPalette(); }} />
  {showTableOfContents && (
    <PanelButton icon={List} label="Jump to" onClick={() => { onClose(); openToC(); }} />
  )}
</div>
```

Where `PanelButton` is:
```tsx
function PanelButton({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-white/5 transition-colors">
      <Icon className="w-5 h-5 text-white/60" />
      <span className="text-[10px] text-white/50">{label}</span>
    </button>
  );
}
```

#### ReGenGuide.tsx: Convert to a context-based toggle

Instead of a self-contained floating button + panel, convert ReGenGuide to use a shared state:

1. Create `client/src/contexts/ReGenGuideContext.tsx`:
```tsx
import { createContext, useContext, useState } from 'react';

interface ReGenGuideContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const ReGenGuideCtx = createContext<ReGenGuideContextValue | null>(null);

export function ReGenGuideProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <ReGenGuideCtx.Provider value={{
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen(p => !p),
    }}>
      {children}
    </ReGenGuideCtx.Provider>
  );
}

export function useReGenGuide() {
  const ctx = useContext(ReGenGuideCtx);
  if (!ctx) throw new Error('useReGenGuide must be used within ReGenGuideProvider');
  return ctx;
}
```

2. Wrap the app in `<ReGenGuideProvider>` in App.tsx (alongside AudioProvider)
3. In `ReGenGuide.tsx`: remove the floating button entirely. Keep only the chat panel. Use `useReGenGuide()` to get `isOpen` state instead of local state. Position the chat panel at `fixed bottom-20 right-2 left-2 sm:right-auto sm:left-4 z-[9999]` (always above nav bar).
4. In `CommandPanel.tsx`: import `useReGenGuide` and wire the "Guide" button to call `open()`.

#### ScrollToTop.tsx: Reposition

Change: `fixed bottom-[128px] right-4` to `fixed bottom-20 right-4` (80px, comfortably above the 64px nav bar)

#### CookieConsent.tsx: Reposition

Change: `fixed bottom-16 md:bottom-0` to `fixed bottom-16` (always 64px from bottom, above the nav bar on all screen sizes)

#### QuestProgressTracker.tsx: Remove floating button

The quest progress is already being added to the Command Center bar (Section A.6). Remove the standalone floating button from `QuestProgressTracker.tsx`. If the component has more functionality than just the button (like an expanded view), keep the expanded view and trigger it from the CommandPanel.

#### QuestBadges.tsx: Remove floating button, add panel trigger

Same pattern: remove `fixed bottom-24 right-6` button. The badge display opens from CommandPanel.

#### QuestArtifactsGallery.tsx: Remove floating button, add panel trigger

Same pattern. Gallery opens from a CommandPanel button.

#### MobileTableOfContents.tsx: Remove floating FAB, add panel trigger

Same pattern. The "Jump to" button in CommandPanel only shows on pages that have section headings.

#### ShortcutPill.tsx: Remove floating pill, add panel trigger

Remove the bottom-right shortcut pill. The "Search" button in CommandPanel dispatches the same `open-command-palette` custom event.

### Files to change:
- `client/src/contexts/ReGenGuideContext.tsx` (new)
- `client/src/App.tsx` (add ReGenGuideProvider wrapper)
- `client/src/components/ReGenGuide.tsx` (remove floating button, use context)
- `client/src/components/CommandPanel.tsx` (add tool buttons grid)
- `client/src/components/ScrollToTop.tsx` (reposition)
- `client/src/components/CookieConsent.tsx` (reposition)
- `client/src/components/QuestProgressTracker.tsx` (remove floating button)
- `client/src/components/QuestBadges.tsx` (remove floating button)
- `client/src/components/QuestArtifactsGallery.tsx` (remove floating button)
- `client/src/components/MobileTableOfContents.tsx` (remove floating FAB)
- `client/src/components/ShortcutPill.tsx` (remove or hide floating pill)

### Verification:
After implementing, check every page at 375px (mobile) and 1440px (desktop):
- No floating buttons visible below the Command Center bar
- ReGen Guide opens from CommandPanel "Guide" button
- ScrollToTop button appears above the bar when scrolled down
- Cookie consent banner sits above the bar
- No z-index stacking issues

---

## CRITICAL: Back Button Consolidation (Fix 222)

**Problem:** The `BackButton` component (`components/BackButton.tsx`) renders as a floating green pill (`md:fixed md:top-20 md:left-4 md:z-40`) on desktop or a relative element on mobile. It's used on **27 pages**. On many pages it overlaps other elements (the Map page legend, page headers, the Command Center). Additional custom back buttons exist on 8+ more pages.

**Fix: Move "Back" into the Command Center bar.**

The nav bar already has 3 adaptive slots. The first slot (Quests) is fixed. Slots 2-3 are adaptive and context-aware. Add a **context-aware Back action** into the nav system so players always have a way back without a floating pill cluttering the page.

### Step 1: Add Back as a nav bar action

In `SmartBottomNav.tsx`, detect when the player is on a sub-page (not a top-level route) and show a Back button in one of the adaptive slots. The existing `useSmartNav` hook already has context-awareness. Add:

```typescript
// In hooks/useSmartNav.ts, add logic:
const TOP_LEVEL_ROUTES = ['/', '/land', '/play', '/quest', '/community', '/fund', '/apply', '/profile', '/map'];

function isSubPage(path: string): boolean {
  return !TOP_LEVEL_ROUTES.includes(path);
}

// When on a sub-page, slot 1 (index 0, normally Quests) becomes a Back button:
if (isSubPage(currentPath)) {
  slots[0] = {
    path: '', // handled by onClick, not navigation
    label: 'Back',
    icon: 'ArrowLeft',
    isContextual: false,
    isBack: true, // new flag
  };
}
```

In `SmartBottomNav.tsx`, handle the `isBack` flag:

```tsx
// Add ArrowLeft to the lucide imports (already imported in BackButton)
import { ArrowLeft, /* ...existing imports */ } from "lucide-react";

// Add to ICON_MAP:
const ICON_MAP = { ...existing, ArrowLeft };

// In the nav slot renderer, if the slot has isBack:
{slot.isBack ? (
  <button
    onClick={() => window.history.length > 1 ? window.history.back() : navigate('/')}
    className={`flex flex-col items-center justify-center gap-1 transition-colors text-white/40 hover:text-white/70`}
    aria-label="Go back"
  >
    <ArrowLeft className="w-5 h-5" />
    <span className="text-[10px] font-medium">Back</span>
  </button>
) : (
  <Link ...existing link code... />
)}
```

### Step 2: Remove floating BackButton from all pages

Delete or empty the `BackButton` component file. Then remove all imports and usages across 27+ pages:

**Pages using `<BackButton />` (remove the import and component):**
- AdminApplicationDetail.tsx
- AdminApplications.tsx
- Apply.tsx
- BlogPost.tsx
- Calculator.tsx
- CampaignAnalytics.tsx
- CampaignDetail.tsx
- CampaignManage.tsx
- CommunityCategory.tsx
- CommunityNewPost.tsx
- CommunityPost.tsx
- CreateCampaign.tsx
- CrowdPooling.tsx
- CustomGames.tsx
- Governance.tsx
- InvestorForm.tsx
- LOI.tsx
- Map.tsx
- MemberDirectory.tsx
- MyApplications.tsx
- PlayerProfile.tsx
- ProjectComparison.tsx
- Quest.tsx
- ReGenGames.tsx
- UserForumProfile.tsx

**Pages with custom back elements (replace with nothing, the nav bar handles it):**
- CommunityCategory.tsx: remove "Back to Community" button
- CommunityPost.tsx: remove "Back to Forum" link
- OnePager.tsx: remove "Back to Site" link
- AdminModeration.tsx: remove "Back to Forum" and "Back to Admin" links
- ApplyStatus.tsx: remove "← Back to Apply" link
- Blog.tsx: remove "Back to Home" link
- EventDetail.tsx: remove "Back to Schedule" link

**Keep these (they are step/form navigation, not page navigation):**
- Connect.tsx: "Back to Path Selection" (wizard step)
- PlayerProfile.tsx: inline "← Back" buttons for form steps within the profile edit flow

### Step 3: Update BackButton.tsx

Don't delete the file (it would break imports during migration). Instead, make it render nothing:

```tsx
/** @deprecated Back navigation is now handled by the Command Center nav bar */
export function BackButton(_props: { fallbackPath?: string; label?: string; inline?: boolean }) {
  return null;
}
```

This is a safe migration path. All 27 imports still work, no build breaks, but the floating button disappears. Claude Code can clean up the imports in a follow-up pass.

### Step 4: Adjust page content positioning

Many pages have top padding or margin to account for the floating BackButton on desktop. After removing it, audit these pages and remove any compensating `pt-` or `mt-` classes that were creating space for the back button. Search for `md:pt-` and `md:mt-` in page files.

**Files to change:**
- `client/src/components/BackButton.tsx` (neuter the component)
- `client/src/hooks/useSmartNav.ts` (add isSubPage detection and Back slot logic)
- `client/src/components/SmartBottomNav.tsx` (handle isBack slot type with ArrowLeft)
- All 27+ pages listed above (remove BackButton usage, optional cleanup pass)

---

## CRITICAL: Safari "You're Offline" Bug (Fix 220)

**Symptom:** Users on Safari (especially macOS) see "You're offline. Check your connection and try again." when navigating pages, even though they have a working connection.

**Root cause:** The VitePWA service worker config in `vite.config.ts` uses `navigateFallback: '/offline.html'`. This tells Workbox to serve `offline.html` whenever a navigation request fails. On Safari, the service worker can interpret slow connections, CORS issues, or server hiccups as "failed navigations" and serve the offline fallback even when the user is online.

**Fix (three changes):**

### Change 1: Add navigateFallbackAllowlist to vite.config.ts

Replace `navigateFallback` config with a more restrictive setup:

```typescript
// In vite.config.ts > VitePWA > workbox:
navigateFallback: '/offline.html',
navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /^\/assets\//],
// ADD THIS: Only show offline page for actual page routes, not for all requests
navigateFallbackAllowlist: [/^\/$/,  /^\/land/, /^\/play/, /^\/quest/, /^\/community/, /^\/fund/, /^\/apply/, /^\/profile/, /^\/crowd-pooling/, /^\/opportunity/, /^\/terms/, /^\/privacy/],
```

### Change 2: Add online check to offline.html

Update `client/public/offline.html` to auto-redirect when connection is restored:

```html
<script>
  // If the browser reports online, this is likely a stale service worker response.
  // Auto-retry after a brief delay.
  if (navigator.onLine) {
    setTimeout(() => window.location.reload(), 1500);
  }
  // Also listen for the online event
  window.addEventListener('online', () => window.location.reload());
</script>
```

Add this script tag right before `</body>` in `client/public/offline.html`.

### Change 3: Force service worker update on deploy

In `client/src/main.tsx`, after the existing service worker registration logic, add a message listener that forces the waiting service worker to activate immediately when the app detects a new version:

```typescript
// After the existing SW registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // New SW activated, reload to get fresh content
    window.location.reload();
  });
}
```

**Files to change:**
- `vite.config.ts` (add navigateFallbackAllowlist)
- `client/public/offline.html` (add online detection script)
- `client/src/main.tsx` (add controllerchange listener)

**Verification:** After deploy, test on Safari macOS by navigating rapidly between pages. No "offline" page should appear while connected.

---

# SECTION A: COMMAND CENTER UPGRADES

## A.0: Reconstruct SmartBottomNav.tsx (MUST DO FIRST)

The file is truncated. Write the complete file. The existing content up to line 99 is correct. Complete lines 100+ with the music slot, expand slot, and customize sheet. Here is the full file:

**File:** `client/src/components/SmartBottomNav.tsx`

```tsx
/**
 * SmartBottomNav - Adaptive bottom navigation with music controls
 * 5 slots: Quests (fixed) | Adaptive | Adaptive | Music | Expand Panel
 * Supports long-press customization on slots 2-3.
 * Visible on all screen sizes.
 */

import { useState, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Scroll, Sprout, Leaf, Sun, FileText, TrendingUp, PenLine,
  Clipboard, Handshake, MessageCircle, Users, Compass, UserCircle,
  BookOpen, Vote, Mountain, Globe, Calendar, Coins, Sparkles,
  PlayCircle, PauseCircle, ChevronUp,
} from "lucide-react";
import { useSmartNav, type NavSlot } from "@/hooks/useSmartNav";
import { NavCustomizeSheet } from "./NavCustomizeSheet";
import { useAudio } from "@/contexts/AudioContext";
import { CommandPanel } from "./CommandPanel";

// Short labels for songs, shown in the music slot when playing
const SONG_SHORT_LABELS: Record<string, string> = {
  "Wasteland into Wonderland": "Wonderland",
  "We are ReGen Magicians": "Magicians",
  "We are the Land": "Land",
  "ReGen Transition Team": "Transition",
};

// Icon component resolver
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Scroll, Sprout, Leaf, Sun, FileText, TrendingUp, PenLine,
  Clipboard, Handshake, MessageCircle, Users, Compass, UserCircle,
  BookOpen, Vote, Mountain, Globe, Calendar, Coins, Sparkles,
};

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return <Compass className={className} />;
  return <Icon className={className} />;
}

export default function SmartBottomNav() {
  const [location] = useLocation();
  const { slots } = useSmartNav();
  const [customizeSlot, setCustomizeSlot] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressedSlot, setPressedSlot] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const { isPlaying, togglePlay, currentSong } = useAudio();

  const handleLongPressStart = useCallback((slotIndex: number) => {
    if (slotIndex === 0) return; // slot 1 (Quests) not customizable
    longPressTimer.current = setTimeout(() => {
      setPressedSlot(slotIndex);
      setCustomizeSlot(`slot${slotIndex + 1}`);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const currentPath = location.split("?")[0].replace(/\/$/, "") || "/";

  // Only use first 3 nav slots to make room for music + expand
  const navSlots = slots.slice(0, 3);

  const musicLabel = isPlaying && currentSong
    ? (SONG_SHORT_LABELS[currentSong.title] || "Music")
    : "Music";

  return (
    <>
      <CommandPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} />

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a472a]/95 backdrop-blur-sm border-t border-[#7dd87d]/20 safe-area-pb"
        aria-label="Main navigation"
      >
        <div className="grid grid-cols-5 h-16 max-w-2xl mx-auto">
          {navSlots.map((slot, i) => {
            const isActive = currentPath === slot.path;
            return (
              <Link
                key={`${slot.path}-${i}`}
                href={slot.path}
                className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                  isActive ? "text-[#7dd87d]" : "text-white/40 hover:text-white/70"
                }`}
                onTouchStart={() => handleLongPressStart(i)}
                onTouchEnd={handleLongPressEnd}
                onTouchCancel={handleLongPressEnd}
                onMouseDown={() => handleLongPressStart(i)}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
              >
                <div className="relative">
                  <NavIcon name={slot.icon} className="w-5 h-5" />
                  {slot.isContextual && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#ffd700] rounded-full" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{slot.label}</span>
              </Link>
            );
          })}

          {/* Music play/pause slot */}
          <button
            onClick={togglePlay}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              isPlaying ? "text-[#7dd87d]" : "text-white/40 hover:text-white/70"
            }`}
            aria-label={isPlaying ? "Pause music" : "Play music"}
          >
            {isPlaying ? <PauseCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
            <span className="text-[10px] font-medium">{musicLabel}</span>
          </button>

          {/* Expand panel slot */}
          <button
            onClick={() => setPanelOpen(p => !p)}
            className="flex flex-col items-center justify-center gap-1 transition-colors text-white/40 hover:text-white/70"
            aria-label={panelOpen ? "Close command panel" : "Open command panel"}
          >
            <ChevronUp className={`w-5 h-5 transition-transform duration-200 ${panelOpen ? "rotate-180" : ""}`} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Customize sheet for long-press slot editing */}
      {customizeSlot && (
        <NavCustomizeSheet
          slotKey={customizeSlot}
          onClose={() => setCustomizeSlot(null)}
        />
      )}
    </>
  );
}
```

**Song short labels (Rye's exact spec):**
| Page | Full title | Shown in nav bar |
|------|-----------|------------------|
| /land | Wasteland into Wonderland | Wonderland |
| /play | ReGen Transition Team | Transition |
| /quest | We are ReGen Magicians | Magicians |
| /community | We are the Land | Land |

---

## A.1: Lunar Streak Tracker

**What:** A flame icon with a number in the Command Center bar showing the player's current lunar month streak. A "streak" means the player completed at least one quest per lunar cycle (new moon to new moon, roughly 29.5 days).

### Database

Add column to `player_profiles`:

```sql
ALTER TABLE player_profiles
  ADD COLUMN lunarStreak INT NOT NULL DEFAULT 0,
  ADD COLUMN lastQuestCompletedAt DATETIME NULL,
  ADD COLUMN currentLunarCycleStart DATE NULL;
```

### Server Logic

Create `server/lib/lunar.ts`:

```typescript
/**
 * Calculate the current lunar cycle start date.
 * A lunar cycle runs from new moon to new moon (~29.53 days).
 * We use the known new moon of Jan 29, 2025 as an epoch and calculate forward.
 */
const LUNAR_EPOCH = new Date('2025-01-29T12:36:00Z').getTime();
const LUNAR_CYCLE_MS = 29.53058867 * 24 * 60 * 60 * 1000;

export function getCurrentLunarCycleStart(): Date {
  const now = Date.now();
  const cyclesSinceEpoch = Math.floor((now - LUNAR_EPOCH) / LUNAR_CYCLE_MS);
  return new Date(LUNAR_EPOCH + cyclesSinceEpoch * LUNAR_CYCLE_MS);
}

export function getNextNewMoon(): Date {
  const now = Date.now();
  const cyclesSinceEpoch = Math.floor((now - LUNAR_EPOCH) / LUNAR_CYCLE_MS);
  return new Date(LUNAR_EPOCH + (cyclesSinceEpoch + 1) * LUNAR_CYCLE_MS);
}
```

### Streak Update Logic (in quest completion handler)

When a player completes a quest, check:

```typescript
import { getCurrentLunarCycleStart } from './lib/lunar';

async function onQuestComplete(playerId: number) {
  const currentCycleStart = getCurrentLunarCycleStart();
  const profile = await db.query.playerProfiles.findFirst({ where: eq(playerProfiles.id, playerId) });

  if (!profile.currentLunarCycleStart || profile.currentLunarCycleStart < currentCycleStart) {
    // New lunar cycle. Check if they completed during the PREVIOUS cycle too.
    const prevCycleStart = new Date(currentCycleStart.getTime() - 29.53058867 * 24 * 60 * 60 * 1000);
    const completedInPrevCycle = profile.lastQuestCompletedAt &&
      profile.lastQuestCompletedAt >= prevCycleStart &&
      profile.lastQuestCompletedAt < currentCycleStart;

    const newStreak = completedInPrevCycle ? profile.lunarStreak + 1 : 1;

    await db.update(playerProfiles)
      .set({
        lunarStreak: newStreak,
        lastQuestCompletedAt: new Date(),
        currentLunarCycleStart: currentCycleStart,
      })
      .where(eq(playerProfiles.id, playerId));
  } else {
    // Same lunar cycle, just update lastQuestCompletedAt
    await db.update(playerProfiles)
      .set({ lastQuestCompletedAt: new Date() })
      .where(eq(playerProfiles.id, playerId));
  }
}
```

### Client Component

Create `client/src/components/LunarStreak.tsx`:

```tsx
import { Flame } from 'lucide-react';

interface LunarStreakProps {
  streak: number;
  className?: string;
}

export function LunarStreak({ streak, className = '' }: LunarStreakProps) {
  if (streak === 0) return null;
  return (
    <div className={`flex items-center gap-1 ${className}`} title={`${streak} moon cycle streak`}>
      <Flame className="w-4 h-4 text-amber-400" />
      <span className="text-xs font-bold text-amber-400">{streak}</span>
    </div>
  );
}
```

**Integration:** Show this in the Command Center bar (next to the music slot or in the expanded panel). Fetch the streak value from the existing profile query.

**Files to create/change:**
- `server/lib/lunar.ts` (new)
- DB migration: add 3 columns to player_profiles
- `server/routes/quests.ts` (add streak logic to quest completion handler)
- `client/src/components/LunarStreak.tsx` (new)
- `client/src/components/SmartBottomNav.tsx` (add streak display)
- `client/src/components/CommandPanel.tsx` (show streak in expanded panel)

---

## A.2: Live Player Count Pulse

**What:** A small green pulsing dot with a number ("14 online") visible in the Command Center. Shows approximate active player count.

### Server Endpoint

Add to `server/routes/index.ts` or a new `server/routes/presence.ts`:

```typescript
// Track active sessions using a simple in-memory map with timestamps
const activeSessions = new Map<string, number>(); // sessionId -> lastSeen

// Heartbeat endpoint (called every 60s by the client)
app.post('/api/presence/heartbeat', (req, res) => {
  const sessionId = req.sessionID || req.ip || 'anon-' + Math.random();
  activeSessions.set(sessionId, Date.now());
  res.json({ ok: true });
});

// Count endpoint
app.get('/api/presence/count', (req, res) => {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  // Clean stale entries
  for (const [id, time] of activeSessions) {
    if (time < fiveMinAgo) activeSessions.delete(id);
  }
  const realCount = activeSessions.size;
  // Add momentum padding: random 13-21 on top of real count during launch
  const padding = Math.floor(Math.random() * 9) + 13;
  res.json({ count: realCount + padding });
});
```

The momentum padding (13-21 random) adds to the real count during early launch to build social proof. Remove the padding once active users consistently exceed 50.

### Client Hook

Create `client/src/hooks/usePresence.ts`:

```typescript
import { useState, useEffect } from 'react';

export function usePresence() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    // Send heartbeat on mount and every 60 seconds
    const heartbeat = () => fetch('/api/presence/heartbeat', { method: 'POST' }).catch(() => {});
    heartbeat();
    const hbInterval = setInterval(heartbeat, 60_000);

    // Fetch count immediately and every 30 seconds
    const fetchCount = () =>
      fetch('/api/presence/count')
        .then(r => r.json())
        .then(d => setCount(d.count))
        .catch(() => {});
    fetchCount();
    const countInterval = setInterval(fetchCount, 30_000);

    return () => {
      clearInterval(hbInterval);
      clearInterval(countInterval);
    };
  }, []);

  return count;
}
```

### Display Component

Add to `SmartBottomNav.tsx` or `CommandPanel.tsx`:

```tsx
const playerCount = usePresence();
// In the expanded CommandPanel:
{playerCount !== null && (
  <div className="flex items-center gap-1.5 text-xs text-white/60">
    <span className="w-2 h-2 bg-[#7dd87d] rounded-full animate-pulse" />
    <span>{playerCount} players online</span>
  </div>
)}
```

**Files to create/change:**
- `server/routes/presence.ts` (new, or add to existing routes file)
- `client/src/hooks/usePresence.ts` (new)
- `client/src/components/CommandPanel.tsx` (add player count display)

---

## A.3: Quick-Post FAB in Expanded Panel

**What:** A one-tap "What did you do today?" micro-post box inside the expanded CommandPanel. Posts go to the forum as a short update.

### Implementation

In `CommandPanel.tsx`, add a collapsible quick-post section:

```tsx
const [quickPost, setQuickPost] = useState('');
const [posting, setPosting] = useState(false);

async function submitQuickPost() {
  if (!quickPost.trim() || posting) return;
  setPosting(true);
  try {
    // Post to the general/fire category as a short forum update
    await fetch('/api/forum/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Quick update: ${quickPost.slice(0, 60)}`,
        body: quickPost,
        categoryId: DEFAULT_CATEGORY_ID, // Use the general/fire category
      }),
    });
    setQuickPost('');
    // Show brief success feedback
  } catch (e) {
    // Show error
  }
  setPosting(false);
}
```

The UI should be:
- A text input with placeholder "What did you do today?"
- A send button with an arrow icon
- On submit: clear, show brief green checkmark feedback, then collapse
- Only visible to authenticated users

**Files to change:**
- `client/src/components/CommandPanel.tsx` (add quick-post section)

---

## A.4: XP / Token Balance Display

**What:** Show the player's current $RCivics balance or XP in the Command Center bar.

### Implementation

Pull the token balance from the existing profile query (already available in the auth context or profile data).

In `SmartBottomNav.tsx`, if the user is authenticated, show a small token count next to the music button or as a tooltip:

```tsx
// In the expanded CommandPanel
{profile?.tokenBalance !== undefined && (
  <div className="flex items-center gap-1.5">
    <Coins className="w-4 h-4 text-[#ffd700]" />
    <span className="text-xs font-bold text-[#ffd700]">{profile.tokenBalance} $RCivics</span>
  </div>
)}
```

Tapping the balance navigates to the profile Contributions tab: `window.location.href = '/profile?tab=contributions'`

**Files to change:**
- `client/src/components/CommandPanel.tsx` (add token balance display)

---

## A.5: Page-Reactive Color Accent

**What:** The top edge of the Command Center bar shifts color based on which page the user is on.

### Implementation

Add a thin 2px gradient line at the top of the nav bar that changes color based on the current route.

```tsx
// In SmartBottomNav.tsx, derive accent color from currentPath
const PAGE_ACCENTS: Record<string, string> = {
  '/land': 'from-green-600 to-green-400',
  '/quest': 'from-amber-500 to-yellow-400',
  '/community': 'from-blue-500 to-teal-400',
  '/play': 'from-purple-500 to-pink-400',
  '/fund': 'from-emerald-600 to-lime-400',
  '/profile': 'from-indigo-500 to-blue-400',
};

const accentKey = Object.keys(PAGE_ACCENTS).find(p => currentPath.startsWith(p));
const accentGradient = accentKey ? PAGE_ACCENTS[accentKey] : 'from-[#7dd87d] to-[#7dd87d]';

// Add as the first child inside the <nav>:
<div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accentGradient} opacity-60`} />
```

**Files to change:**
- `client/src/components/SmartBottomNav.tsx`

---

## A.6: Quest Progress Indicator

**What:** A thin progress bar across the top of the Command Center showing the active quest's completion percentage.

### Implementation

If the player has a currently active (started but incomplete) quest, show a thin progress bar above the accent line.

```tsx
// Pull from the player's active quest data
const activeQuest = useActiveQuest(); // new hook or from existing context

// Render above the accent line in SmartBottomNav:
{activeQuest && (
  <div className="absolute top-0 left-0 right-0 h-1 bg-black/20">
    <div
      className="h-full bg-[#7dd87d] transition-all duration-500"
      style={{ width: `${activeQuest.progressPercent}%` }}
    />
  </div>
)}
```

**Files to change:**
- `client/src/components/SmartBottomNav.tsx`
- May need a `useActiveQuest` hook if no existing context provides this data

---

## A.7: Notification Bell (Golden Tree of Life)

**What:** A golden Tree of Life icon (matching the favicon) in the Command Center with a light green badge showing unread notification count. Tapping opens a notification drawer.

### Database

Create `notifications` table:

```sql
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playerId INT NOT NULL,
  type ENUM('forum_reply', 'quest_complete', 'fund_update', 'vouch', 'mention') NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  link VARCHAR(500),
  isRead BOOLEAN NOT NULL DEFAULT FALSE,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_player_unread (playerId, isRead, createdAt)
);
```

### Server

Add `server/routes/notifications.ts`:

```typescript
// GET /api/notifications/count - returns unread count
// GET /api/notifications - returns recent notifications (paginated)
// POST /api/notifications/:id/read - mark as read
// POST /api/notifications/read-all - mark all as read
```

Create notifications when:
- Someone replies to the player's forum post
- A quest is marked complete
- A fund update is published
- Someone vouches for the player (see Profile Section A.9)

### Client

Create `client/src/components/NotificationBell.tsx`:

```tsx
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

// The Tree of Life icon should be an SVG matching the favicon.
// Export the favicon SVG as a React component, or use an inline SVG.
// Color: golden (#d4a574 or #ffd700)

export function NotificationBell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: count } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: () => fetch('/api/notifications/count').then(r => r.json()),
    refetchInterval: 30_000, // check every 30s
  });

  return (
    <button
      onClick={() => setDrawerOpen(p => !p)}
      className="relative flex flex-col items-center justify-center gap-1 text-[#d4a574] hover:text-[#ffd700] transition-colors"
      aria-label={`Notifications${count?.unread ? `: ${count.unread} unread` : ''}`}
    >
      {/* Tree of Life SVG icon here, w-5 h-5 */}
      <TreeOfLifeIcon className="w-5 h-5" />
      {count?.unread > 0 && (
        <span className="absolute -top-0.5 -right-1 min-w-[16px] h-4 bg-[#7dd87d] text-[#1a472a] text-[9px] font-bold rounded-full flex items-center justify-center px-1">
          {count.unread > 99 ? '99+' : count.unread}
        </span>
      )}
      <span className="text-[10px] font-medium">Alerts</span>
    </button>
  );
}
```

The notification drawer slides up from behind the nav bar (like CommandPanel) showing recent notifications grouped by type.

**Integration:** Replace one of the 3 adaptive nav slots with the notification bell, OR add it as a 6th element in the CommandPanel (not the bar itself). Recommended: put it in the expanded CommandPanel alongside the player count and token balance, since the nav bar is already at 5 slots.

**Files to create/change:**
- `server/routes/notifications.ts` (new)
- DB migration: create notifications table
- `client/src/components/NotificationBell.tsx` (new)
- `client/src/components/NotificationDrawer.tsx` (new, the slide-up list)
- `client/src/components/CommandPanel.tsx` (integrate notification bell)
- Server event handlers: add notification creation in forum reply handler, quest completion handler, etc.

---

## A.8: Seasonal Theme

**What:** The CommandPanel background art and nav bar accent shift with the real-world season (Spring, Summer, Fall, Winter).

### Implementation

```typescript
// In a shared util, e.g., client/src/lib/seasons.ts
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

export const SEASON_THEMES: Record<Season, { gradient: string; accent: string; bgOpacity: string }> = {
  spring: { gradient: 'from-green-800/40 to-emerald-900/40', accent: '#7dd87d', bgOpacity: '0.15' },
  summer: { gradient: 'from-amber-800/40 to-yellow-900/40', accent: '#ffd700', bgOpacity: '0.12' },
  fall: { gradient: 'from-orange-800/40 to-red-900/40', accent: '#d4a574', bgOpacity: '0.15' },
  winter: { gradient: 'from-blue-800/40 to-indigo-900/40', accent: '#88c8ff', bgOpacity: '0.10' },
};
```

Use `getCurrentSeason()` in `CommandPanel.tsx` to adjust the panel background gradient. In `SmartBottomNav.tsx`, apply the seasonal accent as the default accent line color.

**Files to create/change:**
- `client/src/lib/seasons.ts` (new)
- `client/src/components/CommandPanel.tsx` (seasonal background)
- `client/src/components/SmartBottomNav.tsx` (seasonal accent fallback)

---

## A.9: "I Just Did This" One-Tap Quest Log

**What:** In the expanded CommandPanel, show the player's most-recently-viewed quest with a single "I Did This" button. One tap logs completion and opens the quest's forum thread.

### Implementation

Track "last viewed quest" in a lightweight client-side state (sessionStorage or a React context). When the player visits a quest detail page, store that quest's ID and title.

```tsx
// In CommandPanel.tsx
const lastViewedQuest = useLastViewedQuest(); // hook that reads from context or sessionStorage

{lastViewedQuest && (
  <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
    <div className="text-xs text-white/70 truncate flex-1 mr-2">
      {lastViewedQuest.title}
    </div>
    <button
      onClick={() => markQuestComplete(lastViewedQuest.id)}
      className="text-xs bg-[#7dd87d] text-[#1a472a] px-3 py-1 rounded-full font-medium hover:bg-[#9de89d] transition-colors whitespace-nowrap"
    >
      I Did This
    </button>
  </div>
)}
```

On click:
1. POST to quest completion endpoint
2. Navigate to the quest's linked forum thread
3. Show brief success animation (green checkmark)

**Files to create/change:**
- `client/src/hooks/useLastViewedQuest.ts` (new)
- `client/src/components/CommandPanel.tsx` (add one-tap quest log)
- Update quest detail page to set last-viewed quest on mount

---

# SECTION B: FORUM UPGRADES

## B.1: Thread "Roots" View (Conversation Tree)

**What:** A collapsible tree visualization at the top of long threads showing who replied to whom.

### Implementation

Create `client/src/components/ThreadRoots.tsx`:

```tsx
interface ThreadNode {
  id: number;
  authorName: string;
  authorAvatar: string;
  parentId: number | null;
  depth: number;
}

interface ThreadRootsProps {
  replies: ThreadNode[];
  onNodeClick: (replyId: number) => void;
}

export function ThreadRoots({ replies, onNodeClick }: ThreadRootsProps) {
  if (replies.length < 10) return null; // Only show for substantive threads

  // Build tree structure from flat replies
  const tree = buildTree(replies);

  return (
    <details className="mb-4">
      <summary className="text-xs text-white/50 cursor-pointer hover:text-white/70">
        View conversation map ({replies.length} replies)
      </summary>
      <div className="mt-2 pl-2 border-l border-[#7dd87d]/20 space-y-1">
        {renderTree(tree, onNodeClick)}
      </div>
    </details>
  );
}

function buildTree(replies: ThreadNode[]): Map<number | null, ThreadNode[]> {
  const map = new Map<number | null, ThreadNode[]>();
  for (const r of replies) {
    const parent = r.parentId;
    if (!map.has(parent)) map.set(parent, []);
    map.get(parent)!.push(r);
  }
  return map;
}

function renderTree(
  tree: Map<number | null, ThreadNode[]>,
  onNodeClick: (id: number) => void,
  parentId: number | null = null,
  depth = 0,
): React.ReactNode {
  const children = tree.get(parentId);
  if (!children) return null;
  return children.map(node => (
    <div key={node.id} style={{ paddingLeft: `${depth * 12}px` }}>
      <button
        onClick={() => onNodeClick(node.id)}
        className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/80 py-0.5"
      >
        <img src={node.authorAvatar} alt="" className="w-4 h-4 rounded-full" />
        <span>{node.authorName}</span>
      </button>
      {renderTree(tree, onNodeClick, node.id, depth + 1)}
    </div>
  ));
}
```

Show only on threads with 10+ replies. Clicking a node scrolls to that reply.

**Files to create/change:**
- `client/src/components/ThreadRoots.tsx` (new)
- `client/src/pages/CommunityPost.tsx` (integrate ThreadRoots above the replies section)

---

## B.2: Quest Completion Status on Quest-Linked Threads

**What:** On forum posts connected to a quest, show a progress bar: "47 players have completed this quest."

### Implementation

The forum post data already includes a `questId` or `forumUrl` link. When rendering a post header, check if the post is linked to a quest and fetch the completion count.

```tsx
// In CommunityPost.tsx, in the post header area:
{post.linkedQuestId && (
  <QuestProgressBanner questId={post.linkedQuestId} />
)}
```

Create `client/src/components/QuestProgressBanner.tsx`:

```tsx
export function QuestProgressBanner({ questId }: { questId: number }) {
  const { data } = useQuery({
    queryKey: ['quest-completions', questId],
    queryFn: () => fetch(`/api/quests/${questId}/completions`).then(r => r.json()),
    staleTime: 60_000,
  });

  if (!data) return null;

  return (
    <a href={`/quest/${questId}`} className="block bg-[#1a472a]/50 rounded-lg px-4 py-2.5 mb-4 hover:bg-[#1a472a]/70 transition-colors">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-[#7dd87d] font-medium">{data.questTitle}</span>
        <span className="text-white/50">{data.completionCount} players completed</span>
      </div>
      <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#7dd87d] rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, (data.completionCount / data.targetCount) * 100)}%` }}
        />
      </div>
    </a>
  );
}
```

**Server:** Add `GET /api/quests/:id/completions` that returns `{ questTitle, completionCount, targetCount }`.

**Files to create/change:**
- `client/src/components/QuestProgressBanner.tsx` (new)
- `client/src/pages/CommunityPost.tsx` (integrate banner)
- `server/routes/quests.ts` (add completions endpoint)
- May need to add `linkedQuestId` to forum posts table if not already present

---

## B.3: "Seed This Post" Feature

**What:** A button for contributors to mark their own post as a "seed post." Seed posts get a leaf marker and appear in category header cards.

### Database

```sql
ALTER TABLE forumPosts ADD COLUMN isSeed BOOLEAN NOT NULL DEFAULT FALSE;
```

### Server

Add endpoint `POST /api/forum/posts/:id/seed` that toggles the `isSeed` flag. Only the post author can seed their own post.

### Client

In the post action bar (where edit/delete buttons are), add:

```tsx
{isOwnPost && (
  <button
    onClick={() => toggleSeed(post.id)}
    className={`flex items-center gap-1 text-xs ${post.isSeed ? 'text-[#7dd87d]' : 'text-white/40 hover:text-white/60'}`}
  >
    <Sprout className="w-3.5 h-3.5" />
    {post.isSeed ? 'Seeded' : 'Seed this post'}
  </button>
)}
```

In category header cards, show "Recent seeds:" with the 2-3 most recent seed posts.

**Files to create/change:**
- DB migration: add isSeed to forumPosts
- `server/routes/forum.ts` (add seed toggle endpoint)
- `client/src/pages/CommunityPost.tsx` (add seed button)
- `client/src/pages/Community.tsx` (show seeds in category cards)

---

## B.4: Player Bioregion on Posts

**What:** Show the poster's bioregion under their avatar in forum posts, if set.

### Implementation

The player profile already has a `bioregion` field. Include it in the forum post author data returned by the API.

In the forum post/reply component where the author avatar and name are displayed:

```tsx
<div className="flex items-start gap-3">
  <img src={author.avatar} alt="" className="w-8 h-8 rounded-full" />
  <div>
    <span className="text-sm font-medium text-white">{author.displayName}</span>
    {author.bioregion && (
      <span className="block text-[10px] text-white/40">{author.bioregion}</span>
    )}
  </div>
</div>
```

**Files to change:**
- `server/routes/forum.ts` (include bioregion in post/reply author data)
- `client/src/pages/CommunityPost.tsx` (display bioregion under author name)

---

## B.5: Quest Card Embeds Inline

**What:** When a forum post body contains a link to `/quest/[id]`, auto-expand it into an inline quest card preview.

### Implementation

Create `client/src/components/QuestEmbed.tsx`:

```tsx
export function QuestEmbed({ questId }: { questId: string }) {
  const { data: quest } = useQuery({
    queryKey: ['quest', questId],
    queryFn: () => fetch(`/api/quests/${questId}`).then(r => r.json()),
    staleTime: 300_000,
  });

  if (!quest) return <a href={`/quest/${questId}`} className="text-[#7dd87d] underline">View quest</a>;

  return (
    <a href={`/quest/${questId}`} className="block bg-[#1a472a]/40 border border-[#7dd87d]/20 rounded-lg p-3 my-2 hover:bg-[#1a472a]/60 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[#7dd87d]">{quest.title}</span>
        <span className="text-xs text-white/40">{quest.xp} XP</span>
      </div>
      <p className="text-xs text-white/60 mt-1 line-clamp-2">{quest.description}</p>
      <div className="flex items-center gap-2 mt-2 text-xs text-white/40">
        <span>{quest.category}</span>
        <span>{quest.completionCount} completed</span>
      </div>
    </a>
  );
}
```

In the forum post body renderer (wherever markdown/HTML is converted to JSX), intercept links matching `/quest/\d+` and replace them with `<QuestEmbed questId={...} />`.

**Files to create/change:**
- `client/src/components/QuestEmbed.tsx` (new)
- `client/src/components/RichContent.tsx` or wherever post body HTML is rendered (add link interception)

---

## B.6: "Resonance" Sorting

**What:** A third sorting option alongside "recent" and "most replies" that weights emoji reactions by significance.

### Server

In the forum posts list endpoint, add a `sort=resonance` option:

```typescript
// Resonance score formula:
// fire (paradigm shifting) = 5 points
// globe (globally replicable) = 4 points
// lightbulb (make blog post) = 3 points
// seedling (considering) = 2 points
// heart (love it) = 1 point
// checkmark (done this) = 1 point

const RESONANCE_WEIGHTS: Record<string, number> = {
  '🔥': 5, '🌍': 4, '💡': 3, '🌱': 2, '❤️': 1, '✔️': 1,
};
```

Query: calculate a resonance score per post by joining reactions and weighting them, then sort by score DESC.

### Client

In the forum filter/sort bar on `/community`, add a third option:

```tsx
<button onClick={() => setSort('resonance')} className={sort === 'resonance' ? 'text-[#7dd87d]' : 'text-white/40'}>
  Resonance
</button>
```

**Files to change:**
- `server/routes/forum.ts` (add resonance sort option)
- `client/src/pages/Community.tsx` (add resonance sort button)

---

## B.7: Thread-to-Quest Pipeline

**What:** A "Propose as Quest" button on any forum thread. Pre-fills the quest submission form with the thread title and a backlink.

### Implementation

On `CommunityPost.tsx`, in the post actions area:

```tsx
<a
  href={`/community/quests?propose=true&title=${encodeURIComponent(post.title)}&threadId=${post.id}`}
  className="flex items-center gap-1 text-xs text-white/40 hover:text-[#7dd87d] transition-colors"
>
  <Sparkles className="w-3.5 h-3.5" />
  Propose as Quest
</a>
```

On the quest submission page (`/community/quests` or wherever `QuestSuggestions.tsx` renders), read the URL params and pre-fill the form:

```typescript
const searchParams = new URLSearchParams(window.location.search);
const prefillTitle = searchParams.get('title') || '';
const prefillThreadId = searchParams.get('threadId');
```

If `threadId` is present, add a note in the quest proposal body: "Inspired by forum thread: [link]"

**Files to change:**
- `client/src/pages/CommunityPost.tsx` (add "Propose as Quest" link)
- `client/src/pages/QuestSuggestions.tsx` (handle URL param pre-fill)

---

## B.8: Forum Digest Email

**What:** Weekly email pulling the top 3 most-reacted posts from the past 7 days.

### Server

Create `server/jobs/forumDigest.ts`:

```typescript
// Run weekly (via cron or scheduled task)
// 1. Query top 3 posts by total reaction count in last 7 days
// 2. For each subscribed player (emailDigestFrequency = 'weekly' or 'newsletter'):
//    - Build email with post title, 1-line excerpt, reaction count, and link
//    - Send via existing email service
```

Use the existing email infrastructure. The digest should be concise: 3 posts, each with title, one sentence, and a direct link. Subject line: "This week in the Gathering Grove"

**Files to create/change:**
- `server/jobs/forumDigest.ts` (new)
- Hook into existing cron/scheduled job system

---

# SECTION C: PROFILE UPGRADES

## C.1: "Currently Working On" Field

**What:** One editable line on the profile overview: "Currently: Building the food forest at [land project name]."

### Database

```sql
ALTER TABLE player_profiles ADD COLUMN currentlyWorkingOn VARCHAR(200) NULL;
```

### Implementation

In `ProfileEditForm.tsx`, add a field:

```tsx
<label className="block text-xs text-white/50 mb-1">Currently working on</label>
<input
  type="text"
  maxLength={200}
  placeholder="e.g., Building the food forest at Cascadia Commons"
  value={form.currentlyWorkingOn || ''}
  onChange={e => setForm({ ...form, currentlyWorkingOn: e.target.value })}
  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
/>
```

Display on the profile overview tab as a prominent subtitle under the player's name:

```tsx
{profile.currentlyWorkingOn && (
  <p className="text-sm text-[#7dd87d]/80 italic mt-1">{profile.currentlyWorkingOn}</p>
)}
```

Also show this in forum post author tooltips (on hover of avatar).

**Files to create/change:**
- DB migration: add currentlyWorkingOn to player_profiles
- `server/routes/profile.ts` (include in GET/PATCH)
- `client/src/components/ProfileEditForm.tsx` (add field)
- `client/src/pages/PlayerProfile.tsx` (display on overview)
- Forum author tooltip (display on hover)

---

## C.2: Bioregion Map Pin

**What:** A small interactive map on the overview tab showing the player's bioregion pin.

### Implementation

Use a lightweight map library (Leaflet or a static map image). If the player has lat/lng stored from the bioregion detection:

```tsx
// In the profile overview tab
{profile.latitude && profile.longitude && (
  <div className="h-32 rounded-lg overflow-hidden mt-4 bg-[#1a472a]/30">
    <img
      src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+7dd87d(${profile.longitude},${profile.latitude})/${profile.longitude},${profile.latitude},5,0/400x150@2x?access_token=${MAPBOX_TOKEN}`}
      alt={`Map showing ${profile.bioregion || 'your bioregion'}`}
      className="w-full h-full object-cover"
    />
  </div>
)}
```

If Mapbox is not set up, use a static placeholder with the bioregion name overlaid on a stylized map graphic.

**Files to change:**
- `client/src/pages/PlayerProfile.tsx` (add map to overview tab)

---

## C.3: Quest Journal

**What:** A log of every completed quest with date, self-reported outcome, and forum post link.

### Database

```sql
CREATE TABLE quest_journal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playerId INT NOT NULL,
  questId INT NOT NULL,
  completedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reflection TEXT NULL,
  forumPostId INT NULL,
  INDEX idx_player_date (playerId, completedAt DESC)
);
```

### Server

- When a quest is marked complete, insert into `quest_journal`
- Add `GET /api/profile/journal` that returns paginated journal entries with quest title, date, reflection, and linked post

### Client

Create a new "Journal" sub-tab within the profile Quests tab, or as its own tab:

```tsx
// Renders a chronological list of quest completions
{journalEntries.map(entry => (
  <div key={entry.id} className="border-l-2 border-[#7dd87d]/30 pl-3 py-2">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-white">{entry.questTitle}</span>
      <span className="text-xs text-white/40">{formatDate(entry.completedAt)}</span>
    </div>
    {entry.reflection && (
      <p className="text-xs text-white/60 mt-1">{entry.reflection}</p>
    )}
    {entry.forumPostId && (
      <a href={`/community/post/${entry.forumPostId}`} className="text-xs text-[#7dd87d] hover:underline mt-1 inline-block">
        View forum post
      </a>
    )}
  </div>
))}
```

**Files to create/change:**
- DB migration: create quest_journal table
- `server/routes/profile.ts` (add journal endpoint)
- `server/routes/quests.ts` (insert journal entry on completion)
- `client/src/components/QuestJournal.tsx` (new)
- `client/src/pages/PlayerProfile.tsx` (integrate journal in quests tab)

---

## C.4: Contribution Timeline

**What:** A horizontal activity graph (like GitHub's contribution grid) showing activity across all dimensions.

### Implementation

Create `client/src/components/ContributionTimeline.tsx`:

```tsx
// Renders a grid of small squares, one per day for the last 6 months
// Color intensity maps to activity level:
// 0 activity = transparent
// 1 action = light green
// 2-3 actions = medium green
// 4+ actions = bright green

interface DayData {
  date: string;
  quests: number;
  posts: number;
  tokens: number;
}

export function ContributionTimeline({ data }: { data: DayData[] }) {
  return (
    <div className="overflow-x-auto py-2">
      <div className="grid grid-rows-7 grid-flow-col gap-[2px] min-w-[400px]">
        {data.map(day => {
          const total = day.quests + day.posts + day.tokens;
          const intensity = total === 0 ? 'bg-white/5' :
            total <= 1 ? 'bg-[#7dd87d]/30' :
            total <= 3 ? 'bg-[#7dd87d]/60' : 'bg-[#7dd87d]';
          return (
            <div
              key={day.date}
              className={`w-3 h-3 rounded-sm ${intensity}`}
              title={`${day.date}: ${day.quests} quests, ${day.posts} posts, ${day.tokens} tokens`}
            />
          );
        })}
      </div>
    </div>
  );
}
```

**Server:** Add `GET /api/profile/:id/activity?months=6` that returns daily activity counts.

**Files to create/change:**
- `client/src/components/ContributionTimeline.tsx` (new)
- `server/routes/profile.ts` (add activity endpoint)
- `client/src/pages/PlayerProfile.tsx` (add timeline to overview tab)

---

## C.5: Alliance Connections

**What:** A "Connected to" section showing linked land projects and alliance partners.

### Database

```sql
CREATE TABLE player_alliances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playerId INT NOT NULL,
  allianceType ENUM('land_project', 'investor', 'partner') NOT NULL,
  allianceName VARCHAR(200) NOT NULL,
  allianceId INT NULL,
  role VARCHAR(100) NULL,
  joinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_player (playerId)
);
```

### Client

In the profile overview tab:

```tsx
{alliances.length > 0 && (
  <div className="mt-4">
    <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Connected to</h3>
    <div className="flex flex-wrap gap-2">
      {alliances.map(a => (
        <span key={a.id} className="inline-flex items-center gap-1.5 bg-white/5 border border-[#7dd87d]/20 rounded-full px-3 py-1 text-xs text-white/70">
          {a.allianceType === 'land_project' && <Leaf className="w-3 h-3 text-[#7dd87d]" />}
          {a.allianceType === 'investor' && <Coins className="w-3 h-3 text-[#ffd700]" />}
          {a.allianceType === 'partner' && <Handshake className="w-3 h-3 text-[#d4a574]" />}
          {a.allianceName}
          {a.role && <span className="text-white/30">({a.role})</span>}
        </span>
      ))}
    </div>
  </div>
)}
```

**Files to create/change:**
- DB migration: create player_alliances table
- `server/routes/profile.ts` (CRUD for alliances)
- `client/src/pages/PlayerProfile.tsx` (display alliances on overview)

---

## C.6: Draft Quests Tab

**What:** Show quests the player has started but not submitted, or submitted quests pending review.

### Implementation

Add a filter to the profile quests tab that toggles between "Completed," "In Progress," and "Proposed."

The server already tracks quest completion status. Add query param filtering:

```typescript
// GET /api/profile/quests?status=in_progress
// GET /api/profile/quests?status=proposed
```

In the profile quests tab:

```tsx
<div className="flex gap-2 mb-4">
  {['completed', 'in_progress', 'proposed'].map(status => (
    <button
      key={status}
      onClick={() => setQuestFilter(status)}
      className={`text-xs px-3 py-1 rounded-full ${
        questFilter === status ? 'bg-[#7dd87d] text-[#1a472a]' : 'bg-white/5 text-white/50'
      }`}
    >
      {status === 'completed' ? 'Completed' : status === 'in_progress' ? 'In Progress' : 'Proposed'}
    </button>
  ))}
</div>
```

**Files to change:**
- `server/routes/profile.ts` (add status filter to quest endpoint)
- `client/src/pages/PlayerProfile.tsx` (add filter UI to quests tab)

---

## C.8: Profile Completeness Prompt

**What:** A subtle prompt if the profile is under 80% complete.

### Implementation

Calculate completeness on the client from existing profile data:

```typescript
function getProfileCompleteness(profile: PlayerProfile): number {
  const fields = [
    profile.displayName,
    profile.avatar,
    profile.bioregion,
    profile.bio,
    profile.currentlyWorkingOn,
    profile.walletAddress,
    profile.emailDigestFrequency !== 'never',
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}
```

Show prompt on the overview tab:

```tsx
{completeness < 80 && (
  <div className="bg-[#1a472a]/50 border border-[#7dd87d]/20 rounded-lg px-4 py-3 text-xs text-white/60">
    Your profile is {completeness}% complete.
    {!profile.bioregion && <> <a href="/profile?tab=edit" className="text-[#7dd87d] hover:underline">Add your bioregion</a> to help others find you.</>}
    {!profile.bio && <> <a href="/profile?tab=edit" className="text-[#7dd87d] hover:underline">Write a short bio</a> so people know who you are.</>}
  </div>
)}
```

**Files to change:**
- `client/src/pages/PlayerProfile.tsx` (add completeness check and prompt)

---

## C.9: "Vouched By" System

**What:** Players can vouch for other players. Vouches show as avatar clusters under the player's name. This is a foundational trust layer with future expansion potential.

### Database

```sql
CREATE TABLE vouches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  voucherId INT NOT NULL,
  vouchedForId INT NOT NULL,
  vouchedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note VARCHAR(200) NULL,
  -- Each player can vouch for another only once
  UNIQUE KEY unique_vouch (voucherId, vouchedForId),
  INDEX idx_vouched_for (vouchedForId)
);
```

Design notes for future expansion:
- The `note` field allows optional context ("worked together at Cascadia Commons")
- The unique constraint prevents duplicate vouches
- Vouch count can be used as a trust score for future features: weighted voting, priority in applications, access to advanced quests
- Consider adding `revokedAt DATETIME NULL` for the ability to remove vouches later
- Consider adding `category ENUM('collaboration', 'land_work', 'governance', 'general') NULL` for typed vouches

### Server

Add `server/routes/vouches.ts`:

```typescript
// POST /api/vouches/:playerId - vouch for a player (one-time)
// GET /api/vouches/:playerId - get list of vouchers for a player
// DELETE /api/vouches/:playerId - revoke your vouch (future)
```

Validation:
- Cannot vouch for yourself
- Cannot vouch for the same person twice
- Must be authenticated

When a vouch is created, also create a notification (ties into A.7).

### Client

Create `client/src/components/VouchSection.tsx`:

```tsx
interface Vouch {
  id: number;
  voucherName: string;
  voucherAvatar: string;
  voucherId: number;
  note: string | null;
}

export function VouchSection({ playerId, vouches, isOwnProfile }: {
  playerId: number;
  vouches: Vouch[];
  isOwnProfile: boolean;
}) {
  const { user } = useAuth();
  const hasVouched = vouches.some(v => v.voucherId === user?.id);

  return (
    <div className="mt-4">
      {vouches.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-xs text-white/40">Vouched by</span>
          <div className="flex -space-x-2">
            {vouches.slice(0, 5).map(v => (
              <img
                key={v.id}
                src={v.voucherAvatar}
                alt={v.voucherName}
                title={`${v.voucherName}${v.note ? `: ${v.note}` : ''}`}
                className="w-6 h-6 rounded-full border-2 border-[#1a472a]"
              />
            ))}
            {vouches.length > 5 && (
              <span className="w-6 h-6 rounded-full bg-white/10 border-2 border-[#1a472a] flex items-center justify-center text-[8px] text-white/60">
                +{vouches.length - 5}
              </span>
            )}
          </div>
        </div>
      )}

      {!isOwnProfile && user && !hasVouched && (
        <button
          onClick={() => vouchFor(playerId)}
          className="text-xs text-white/40 hover:text-[#7dd87d] transition-colors flex items-center gap-1"
        >
          <Handshake className="w-3.5 h-3.5" />
          Vouch for this player
        </button>
      )}
    </div>
  );
}
```

**Files to create/change:**
- DB migration: create vouches table
- `server/routes/vouches.ts` (new)
- `client/src/components/VouchSection.tsx` (new)
- `client/src/pages/PlayerProfile.tsx` (integrate VouchSection on overview tab)
- `server/routes/notifications.ts` (create notification on vouch)

---

## C.10: Seasonal Intention Setter

**What:** At the start of each season, players can write one sentence about their intention. Shows on their profile and feeds into a seasonal community thread.

### Database

```sql
CREATE TABLE seasonal_intentions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playerId INT NOT NULL,
  season VARCHAR(20) NOT NULL,
  year INT NOT NULL,
  intention VARCHAR(300) NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_season (playerId, season, year),
  INDEX idx_season (season, year)
);
```

### Server

```typescript
// GET /api/intentions/current - get the player's current season intention
// PUT /api/intentions/current - set/update for this season
// GET /api/intentions/season/:season/:year - get all intentions for a season (for community thread)
```

### Client

On the profile overview tab, show the intention or prompt to set one:

```tsx
const season = getCurrentSeason();
const year = new Date().getFullYear();

{intention ? (
  <div className="bg-white/5 rounded-lg px-4 py-2 mt-3">
    <div className="flex items-center gap-1.5 text-xs text-white/40 mb-1">
      <Calendar className="w-3 h-3" />
      <span>{capitalize(season)} {year} intention</span>
    </div>
    <p className="text-sm text-white/80">{intention.text}</p>
  </div>
) : (
  <button
    onClick={() => setShowIntentionForm(true)}
    className="mt-3 text-xs text-[#7dd87d] hover:underline"
  >
    Set your {season} intention
  </button>
)}
```

**Files to create/change:**
- DB migration: create seasonal_intentions table
- `server/routes/intentions.ts` (new)
- `client/src/components/SeasonalIntention.tsx` (new)
- `client/src/pages/PlayerProfile.tsx` (integrate intention display)

---

# SECTION D: IMPLEMENTATION ORDER

Execute in this order to avoid dependency conflicts:

### Phase 0: Critical Fixes (do first)
1. Verify `SmartBottomNav.tsx` and `App.tsx` are complete (both were reconstructed from truncation)
2. Safari offline bug (Fix 220)
3. Bottom element overlap fix (Fix 221): create ReGenGuideContext, move all floating buttons into CommandPanel, reposition ScrollToTop and CookieConsent
4. Back button consolidation (Fix 222): neuter BackButton component, add Back slot to SmartBottomNav for sub-pages, remove floating pills from 27+ pages

### Phase 1: Database Migrations (batch together)
Run all these as one migration:
- `lunarStreak`, `lastQuestCompletedAt`, `currentLunarCycleStart` on player_profiles (A.1)
- `currentlyWorkingOn` on player_profiles (C.1)
- `isSeed` on forumPosts (B.3)
- `notifications` table (A.7)
- `quest_journal` table (C.3)
- `player_alliances` table (C.5)
- `vouches` table (C.9)
- `seasonal_intentions` table (C.10)

### Phase 2: Server Endpoints (all new routes)
- `server/lib/lunar.ts` (A.1)
- `server/routes/presence.ts` (A.2)
- `server/routes/notifications.ts` (A.7)
- `server/routes/vouches.ts` (C.9)
- `server/routes/intentions.ts` (C.10)
- `server/jobs/forumDigest.ts` (B.8)
- Update `server/routes/forum.ts` (B.3 seed, B.4 bioregion, B.6 resonance sort)
- Update `server/routes/quests.ts` (A.1 streak, B.2 completions, C.3 journal)
- Update `server/routes/profile.ts` (C.1, C.4 activity, C.5, C.6)

### Phase 3: Client Components (build leaf-first, then integrate)
New components (no dependencies on each other):
- `LunarStreak.tsx` (A.1)
- `ThreadRoots.tsx` (B.1)
- `QuestProgressBanner.tsx` (B.2)
- `QuestEmbed.tsx` (B.5)
- `ContributionTimeline.tsx` (C.4)
- `VouchSection.tsx` (C.9)
- `SeasonalIntention.tsx` (C.10)
- `QuestJournal.tsx` (C.3)
- `NotificationBell.tsx` + `NotificationDrawer.tsx` (A.7)

New hooks:
- `usePresence.ts` (A.2)
- `useLastViewedQuest.ts` (A.9)

New utils:
- `lib/seasons.ts` (A.8)

### Phase 4: Integrate Into Existing Pages
- `SmartBottomNav.tsx`: full rewrite (A.0), add streak (A.1), accent (A.5), progress bar (A.6), seasonal theme (A.8)
- `CommandPanel.tsx`: add player count (A.2), quick-post (A.3), token balance (A.4), notifications (A.7), last-viewed quest (A.9)
- `CommunityPost.tsx`: add ThreadRoots (B.1), QuestProgressBanner (B.2), seed button (B.3), bioregion (B.4), Propose as Quest (B.7)
- `Community.tsx`: resonance sort (B.6), seed posts in category cards (B.3)
- `PlayerProfile.tsx`: currentlyWorkingOn (C.1), map pin (C.2), journal (C.3), timeline (C.4), alliances (C.5), draft quests (C.6), completeness (C.8), vouches (C.9), intention (C.10)
- `QuestSuggestions.tsx`: URL param pre-fill (B.7)
- `App.tsx`: nothing new (AudioProvider already wrapped)

### Phase 5: Verify
- `pnpm build` passes
- `pnpm dev` runs clean
- Test each page: /, /land, /quest, /community, /play, /profile, /fund
- Confirm: music plays across navigation, Command Center works on mobile and desktop, notifications appear, streaks calculate, vouches work
- Confirm: forum loads with bioregion, seed posts visible, quest embeds render, resonance sort returns results
- Confirm: profile shows intention, timeline, journal, alliances, completeness prompt

---

# HANDOFF TABLE

### Rye Must Do
| Task | Why | Command / Where |
|------|-----|----------------|
| Run DB migrations | Railway DB access required | `railway shell --service mysql` then paste each CREATE TABLE / ALTER TABLE statement |
| `git push` after all changes | Git auth required | `git add -A && git commit -m "feat: command center, forum, profile upgrades" && git push` |
| Set MAPBOX_TOKEN env var (if using map) | Env var in Railway dashboard | Railway dashboard > Variables |
| Test on Safari macOS after deploy | Browser access | Navigate to regencivics.earth on Safari |
| Remove presence count padding | Decision: when active users > 50 | Remove `+ padding` line from `/api/presence/count` |

### Claude Code Can Do Autonomously
Everything else: all file creation, component building, server routes, and integration work listed in Sections A through D.

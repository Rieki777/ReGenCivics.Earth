# Claude Code Session: Command Center + Forum + Profile Upgrades

**Date:** 2026-03-26
**Project:** regen-civics-clean
**What this is:** Implementation prompt for all approved upgrades from the March 26 design session. DB migrations are already applied. Your job is all the code.

---

## Context

ReGen Civics web app: a fund and in-real-life game for regenerative land projects. Full stack: React + TypeScript (Vite), tRPC, Express, MySQL on Railway.

**Read these files before writing any code:**
1. `IMPLEMENTATION_STRATEGY_2026-03-26.md` -- full feature specs, DB schemas, code examples
2. `COMMAND_CENTER_SPEC.md` -- architecture for the page-aware Command Center
3. `COMMAND_CENTER_DESIGN.md` -- which buttons go on which page (living doc, editable)

---

## Writing Rules (MANDATORY)

- No em-dashes anywhere. Use commas, colons, or separate sentences.
- No AI-isms: no "delve", "tapestry", "foster", "leverage", "vibrant", "transformative", "unlock", "empower", "seamless", "robust", "comprehensive", "utilize", "navigate" (as metaphor).
- No contrast-framing ("not X, but Y"). Lead with the affirmative.
- No rhetorical question openers.
- Direct, grounded voice. Sound like a thoughtful person inside the regen movement.

---

## Before You Start

1. `pnpm install`
2. `pnpm build` -- confirm baseline passes. SmartBottomNav.tsx and App.tsx were recently reconstructed from truncation. Verify they compile.
3. Check `client/public/audio/` -- four MP3s should be present:
   - `wasteland-into-wonderland.mp3`
   - `we-are-regen-magicians.mp3`
   - `we-are-the-land.mp3`
   - `regen-transition-team.mp3`

---

## DB Migrations Already Applied

These tables and columns already exist in production. Do NOT run these again. Just write the Drizzle schema and server code that uses them.

**New columns on `player_profiles`:**
- `lunarStreak` INT NOT NULL DEFAULT 0
- `lastQuestCompletedAt` DATETIME NULL
- `currentLunarCycleStart` DATE NULL
- `currentlyWorkingOn` VARCHAR(200) NULL

**New column on `forumPosts`:**
- `isSeed` BOOLEAN NOT NULL DEFAULT FALSE

**New tables:**
- `notifications` (id, playerId, type ENUM, title, body, link, isRead, createdAt)
- `quest_journal` (id, playerId, questId, completedAt, reflection, forumPostId)
- `player_alliances` (id, playerId, allianceType ENUM, allianceName, allianceId, role, joinedAt)
- `vouches` (id, voucherId, vouchedForId, vouchedAt, note) -- UNIQUE(voucherId, vouchedForId)
- `seasonal_intentions` (id, playerId, season, year, intention, createdAt) -- UNIQUE(playerId, season, year)

**Step 1: Update `drizzle/schema.ts`** to add these tables and columns so Drizzle ORM knows about them. Then update tRPC routers to use them.

---

## Phase 0: Critical Fixes (do these first)

### Fix 220: Safari Offline Bug

**Problem:** VitePWA's `navigateFallback: '/offline.html'` sends Safari users to the offline page on slow connections even when they're online.

**Fix in `vite.config.ts`:**
```typescript
// In the VitePWA config, change navigateFallback setup:
navigateFallback: '/offline.html',
navigateFallbackAllowlist: [/^\/(?!api\/).*$/],
// Remove navigateFallbackDenylist if present
```

**Fix in `client/public/offline.html`:**
Add auto-retry script that checks `navigator.onLine` and reloads when connection returns:
```html
<script>
  // If actually online, reload immediately
  if (navigator.onLine) {
    window.location.reload();
  }
  // Listen for online event
  window.addEventListener('online', () => {
    window.location.reload();
  });
  // Poll every 3 seconds
  setInterval(() => {
    if (navigator.onLine) window.location.reload();
  }, 3000);
</script>
```

### Fix 221: Bottom Element Overlap (move floating buttons into Command Center)

**Problem:** 12 floating elements at the bottom of pages overlap with the SmartBottomNav bar.

**Solution:** Move tools INTO the expanded CommandPanel. See `COMMAND_CENTER_SPEC.md` for full details.

1. **Create `client/src/contexts/ReGenGuideContext.tsx`** -- shared state for opening/closing the guide
2. **Update `ReGenGuide.tsx`** -- remove the floating button, use context instead. Keep the chat panel but position it above the nav bar.
3. **Update `CommandPanel.tsx`** -- add a quick tools grid above the music player:
   - Guide button (opens ReGen Guide via context)
   - Badges button (opens QuestBadges via custom event)
   - Gallery button (opens QuestArtifactsGallery via custom event)
   - Search button (opens CommandPalette)
   - Jump to button (opens MobileTableOfContents, only on pages with ToC)
4. **Reposition `ScrollToTop.tsx`** -- change to `bottom-20` (above nav bar)
5. **Reposition `CookieConsent.tsx`** -- change to `bottom-16` on all sizes

**Custom event pattern for modal triggering:**
```typescript
// In CommandPanel, to open badges:
window.dispatchEvent(new CustomEvent('open-quest-badges'));

// In QuestBadges component, listen:
useEffect(() => {
  const handler = () => setIsOpen(true);
  window.addEventListener('open-quest-badges', handler);
  return () => window.removeEventListener('open-quest-badges', handler);
}, []);
```

### Fix 222: Back Button Consolidation

**Problem:** BackButton component used on 27 pages creates a floating green pill that overlaps with content.

**Fix:**
1. In `BackButton.tsx`, change the component to `return null` -- this safely removes all 27 instances without breaking imports
2. Add Back as a context-aware nav slot in SmartBottomNav on sub-pages (pages with a parent to go back to)
3. On desktop, Back renders as a subtle button in the top-left area of the page layout, in addition to nav slots

---

## Phase 1: Command Center Upgrades (Section A)

Implement in this order. After each, run `pnpm build`.

### A.1: Lunar Monthly Streak

- Create `server/lib/lunar.ts` with lunar cycle calculation (new moon epoch: Jan 29 2025 03:36 UTC, cycle: 29.53 days)
- Add tRPC endpoint `GET /api/streak` that returns current streak, cycle progress, cycle dates
- When a quest is completed, update `lastQuestCompletedAt` and recalculate `lunarStreak` and `currentLunarCycleStart`
- Show streak + moon phase icon in the CommandPanel status section
- See IMPLEMENTATION_STRATEGY Section A.1 for exact code

### A.2: Live Presence Count

- Create `server/routes/presence.ts` with heartbeat endpoint
- Use Redis SORTED SET with TTL for tracking active users
- Add random 13-21 padding during launch (check a `LAUNCH_MOMENTUM` env var, default true)
- Show count in CommandPanel with a pulsing green dot
- See IMPLEMENTATION_STRATEGY Section A.2 for exact code

### A.3: Quick-Post (short updates)

- Add a small text input in the CommandPanel that posts to the forum's "Quick Updates" category
- Create a "Quick Updates" forum category if it doesn't exist (seed script)
- Posts are short (max 280 chars), attributed to the logged-in user
- See IMPLEMENTATION_STRATEGY Section A.3

### A.4: XP / ReGen Points Display

- Show the user's current $ReGen token balance in the CommandPanel
- Pull from existing `regen_token_ledger` table
- Compact display: green number with leaf icon
- See IMPLEMENTATION_STRATEGY Section A.4

### A.5: Color Accent (seasonal theme)

- Add a CSS custom property `--season-accent` that changes based on the current season
- Spring: fresh green (#7dd87d), Summer: golden (#ffd700), Autumn: amber (#d4a574), Winter: ice blue (#87CEEB)
- Apply as a subtle border or glow on the CommandPanel expand button
- See IMPLEMENTATION_STRATEGY Section A.5

### A.6: Quest Progress Bar

- Show current quest completion progress as a thin bar across the top of the CommandPanel
- Pull from existing quest completion data
- See IMPLEMENTATION_STRATEGY Section A.6

### A.7: Notification Bell

- Replace generic bell with a golden tree of life icon (same as favicon at `/favicon.svg`)
- Light green counter badge showing unread count
- Dropdown showing recent notifications from the `notifications` table
- Create tRPC endpoints: `notifications.count`, `notifications.list`, `notifications.markRead`, `notifications.markAllRead`
- Generate notifications when: someone replies to your forum post, quest completed, vouch received
- See IMPLEMENTATION_STRATEGY Section A.7

### A.8: Seasonal Theme Indicator

- Small text or icon in CommandPanel showing current season name
- See IMPLEMENTATION_STRATEGY Section A.8

### A.9: One-Tap Quest Log

- Button in CommandPanel that opens a quick view of the user's active and recently completed quests
- See IMPLEMENTATION_STRATEGY Section A.9

---

## Phase 2: Page-Aware Command Center

This is the big architectural piece. See `COMMAND_CENTER_SPEC.md` for full spec and `COMMAND_CENTER_DESIGN.md` for the per-page button assignments.

### Create `client/src/hooks/usePageTools.ts`

Returns an array of tool buttons based on the current route. Each tool has: icon, label, action (onClick handler or link).

### Update `SmartBottomNav.tsx`

- On mobile: the 5-slot bar stays. The "More" button opens the expanded panel which now shows page-specific tools at the top, then navigate shortcuts, then music, then status.
- On desktop: render page tools as a second row above the main bar.

### Per-page tool buttons (from COMMAND_CENTER_DESIGN.md):

| Page | Tools |
|------|-------|
| /quest | Progress, Badges, Field Notes, Calculator |
| /community | New Post, Categories, Search |
| /land | Apply, Compare, Calculator |
| /play | Quest Log, Badges, Share |
| /map | Filter, Layers, Search |
| /crowd-pooling-projects | Pool Info, Calculator, Compare |
| /profile | Edit Profile, Quest Journal, Settings |
| Sub-pages (any with parent) | Back (context-aware) |

---

## Phase 3: Forum Upgrades (Section B)

### B.1: Thread Roots (show OP context in replies)
### B.2: Quest Completion Banner (show on threads linked to completed quests)
### B.4: Bioregion on Forum Posts (show poster's bioregion as a subtle tag)
### B.5: Quest Embeds (render quest card previews when a quest link is shared)
### B.7: Thread-to-Quest Pipeline (suggest turning popular threads into quests)
### B.8: Digest Email Enhancement (better formatting, personalized)
### B.9: Resonance Sort (sort by engagement quality, not just recency)

See IMPLEMENTATION_STRATEGY Section B for all specs.

---

## Phase 4: Profile Upgrades (Section C)

### C.1: Currently Working On (editable status line)
### C.2: Map Pin (show user location on profile)
### C.3: Quest Journal (chronological completion log)
### C.4: Contribution Timeline (visual timeline of all contributions)
### C.5: Alliances Display (show connected land projects, orgs)
### C.6: Draft Quests (show quests the user has proposed)
### C.7: Profile Completeness Prompt (encourage filling out profile)
### C.8: Vouches (trust system between players)
### C.9: Seasonal Intention (set a seasonal goal)

See IMPLEMENTATION_STRATEGY Section C for all specs.

---

## Phase 5: Polish + Verification

1. Run `pnpm build` -- must pass with zero errors
2. Run `pnpm check` if available
3. Test all new tRPC endpoints manually
4. Verify no em-dashes in any new content
5. Verify no floating buttons remain at the bottom of pages (all moved to CommandPanel)
6. Check that the crowd-pooling-projects page banner renders (already added in code, just verify)

---

## Files You Will Create

- `client/src/contexts/ReGenGuideContext.tsx`
- `client/src/hooks/usePageTools.ts`
- `server/lib/lunar.ts`
- `server/routes/presence.ts`
- `server/routes/notifications.ts`

## Files You Will Modify (major changes)

- `drizzle/schema.ts` -- add new tables + columns
- `client/src/components/CommandPanel.tsx` -- add tools grid, page tools, status
- `client/src/components/SmartBottomNav.tsx` -- page-aware nav slots, desktop two-tier
- `client/src/components/ReGenGuide.tsx` -- convert to context-based, remove floating button
- `client/src/components/BackButton.tsx` -- neuter to return null
- `client/src/components/ScrollToTop.tsx` -- reposition above nav
- `client/src/components/CookieConsent.tsx` -- reposition above nav
- `client/src/components/QuestBadges.tsx` -- add custom event listener
- `client/src/components/QuestArtifactsGallery.tsx` -- add custom event listener
- `client/src/pages/PlayerProfile.tsx` -- add journal, alliances, vouches, intention tabs
- `client/src/pages/CommunityPost.tsx` -- thread roots, quest embeds
- `client/src/pages/Community.tsx` -- resonance sort, bioregion tags
- `server/routes/forum.ts` -- seed post flag, resonance sort
- `server/routes/players.ts` -- streak, working on, alliances, vouches
- `vite.config.ts` -- Safari offline fix

## Do NOT Modify

- Audio files in `client/public/audio/` -- all 4 songs are correct
- `SONG_SHORT_LABELS` in SmartBottomNav.tsx -- already set (Wonderland, Transition, Magicians, Land)
- The crowd-pooling-projects example data banner -- already added

---

## Commit Strategy

Commit after each phase:
1. "fix: Safari offline + bottom element overlap + back button consolidation"
2. "feat: Command Center upgrades (streak, presence, quick-post, XP, notifications)"
3. "feat: page-aware Command Center with per-page tools"
4. "feat: forum upgrades (thread roots, quest embeds, resonance sort, bioregion tags)"
5. "feat: profile upgrades (journal, alliances, vouches, intentions, completeness)"

Do NOT push. Rye will review and push manually.

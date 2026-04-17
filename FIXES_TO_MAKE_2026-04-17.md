# Fixes to Make — 2026-04-17

This document continues from `FIXES_TO_MAKE_2026-03-29.md` (archived).

Scope: 13 fixes driven by a round of iPhone Mobile Safari screenshot review by Rye (CTO + Lead Designer pass), plus 15 refinement recommendations for mass-launch readiness. The whole site must be optimized for iPhone Mobile Safari. The Suggest a Feature button should read as the most prominent footer CTA because community governance is the platform's primary promise.

All content in this doc follows the ReGen Civics writing rules: no em-dashes, no contrast framing, no banned AI words, no rhetorical question openers, no passive inspiration.

---

## Priority Order

1. Fix 1 — Global horizontal scroll / text overflow on narrow mobile (Critical)
2. Fix 2 — Back-to-top button collides with Living Tree button (Critical)
3. Fix 3 — Sticky sub-nav pill floats mid-page on Governance (Critical)
4. Fix 4 — Bionomics hero H1 overlaps image text (Critical)
5. Fix 5 — Governance pie chart is unreadable (High)
6. Fix 6 — Schedule auto-archives past sessions and exposes recordings (High)
7. Fix 7 — Move Schedule into Play section, remove Command Center menu entry (High)
8. Fix 8 — Alliance page "Contact Us" buttons become "Add Your Tool" (High)
9. Fix 9 — Suggest a Feature becomes the standout footer CTA (High)
10. Fix 10 — Rebuild Command Center with full feature parity (Medium, larger scope)
11. Fix 11 — Governance illustrations: solarpunk remakes of 3 visuals (Medium)
12. Fix 12 — Live Governance Dashboard wireframe preview tightens on narrow mobile (Medium)
13. Fix 13 — Loomio credit stays; audit governance copy for consistency (Low)

---

## Fix 1 — Global horizontal scroll / text overflow on narrow mobile (Critical)

**Status:** CODED (partial: global safety net exists), needs audit pass

**Symptom:** On iPhone Mobile Safari (narrow widths like iPhone SE / iPhone 13 mini), certain rows cause the whole page to scroll horizontally or push text off the right edge. Screenshot shows a Community page tag row and several governance paragraphs extending past the viewport.

**Root cause:** `client/src/index.css` already sets `overflow-x: hidden` on html and body (lines 270-276 and 1980-1985), but individual flex rows with `whitespace-nowrap`, tag filter carousels, long unbroken strings (wallet addresses, URLs), and certain grid layouts still force width past 100vw. When an internal element exceeds the viewport, the overflow is clipped but the internal layout still pushes buttons and text off-screen visually.

**Fix:**
1. Audit and wrap every known offender with `min-w-0` on flex children and `break-words` on text blocks:
   - `client/src/components/CommunityTagFilter.tsx` — tag row should use horizontal scroll with `overflow-x-auto snap-x` plus `overscroll-x-contain` instead of relying on page-level clipping.
   - `client/src/components/ThreadRoots.tsx` — thread title rows need `min-w-0 truncate` on the text child.
   - `client/src/components/CommunityChains.tsx` — chain badges row: same treatment.
   - `client/src/pages/Governance.tsx` — any `<p>` containing contract addresses or long URLs gets `break-all` on the address span only, plus `overflow-wrap: anywhere` on the parent.
2. Add a defensive utility to `client/src/index.css`:
   ```css
   .safe-prose {
     overflow-wrap: anywhere;
     word-break: break-word;
   }
   ```
   Apply `.safe-prose` to every governance section body container and Bionomics body container.
3. Add a global debug utility (dev-only) that outlines any element wider than viewport: `* { outline: 1px dashed red; }` inside a `@media (max-width: 420px) { html.debug-overflow * { ... } }` block, gated by a query param.

**Files changed:**
- `client/src/index.css`
- `client/src/components/CommunityTagFilter.tsx`
- `client/src/components/ThreadRoots.tsx`
- `client/src/components/CommunityChains.tsx`
- `client/src/pages/Governance.tsx`
- `client/src/pages/Community.tsx`

**Acceptance criteria:**
- On iPhone SE (375px), iPhone 13 mini (375px), and iPhone 14 Pro (393px), no page allows horizontal scroll.
- Every paragraph wraps inside the viewport with at most 4% right-edge padding visible.
- Tag rows scroll internally with snap behavior; page itself does not scroll sideways.
- Verify with Safari Responsive Design Mode on all top-level routes: `/`, `/community`, `/quest`, `/bionomics`, `/governance`, `/fund`, `/tools`, `/map`, `/schedule`, `/ally`.

---

## Fix 2 — Back-to-top button collides with Living Tree button (Critical)

**Status:** CODED

**Symptom:** The circular back-to-top button sits at bottom-right and overlaps the Living Tree quick-access button. On mobile they stack on the same corner and the tree button becomes untappable.

**Root cause:** `client/src/components/ScrollToTop.tsx` line 34 uses `className="fixed bottom-20 right-4 z-40 w-11 h-11"`. The Living Tree button uses the same right-4 corner.

**Fix:** Change ScrollToTop positioning to the bottom-left. Keep the same bottom offset so it clears SmartBottomNav.

```tsx
// ScrollToTop.tsx line 34
className="fixed bottom-20 left-4 z-40 w-11 h-11 rounded-full bg-[#1a472a]/90 text-[#7dd87d] border border-[#7dd87d]/30 shadow-lg backdrop-blur-sm flex items-center justify-center hover:bg-[#2d5a3d] transition-colors"
```

Also add `safe-area-inset-left` padding so it respects iPhone landscape notch:
```tsx
style={{ left: "calc(env(safe-area-inset-left, 0px) + 1rem)" }}
```

**Files changed:**
- `client/src/components/ScrollToTop.tsx`

**Acceptance criteria:**
- Back-to-top sits at bottom-left on every page, clears the bottom nav.
- Living Tree button remains tappable at bottom-right.
- In Safari landscape with notch, back-to-top respects safe-area.

---

## Fix 3 — Sticky sub-nav pill floats mid-page on Governance (Critical)

**Status:** CODED

**Symptom:** On Governance the section table-of-contents pill appears floating 80px from the top, covering the first paragraph of whatever section you scroll to. It should sit flush under the main nav.

**Root cause:** `client/src/components/MobileTableOfContents.tsx` line 80: `<div className="fixed top-20 left-0 right-0 z-40 md:hidden px-4 py-2">`. The `top-20` (80px) was meant to clear a larger top nav, but the current top nav is 56px, and the pill visually reads as disconnected from any header.

**Fix:** Pin the sticky TOC to the top of the viewport directly under the main nav, using a known top nav height variable. Add `safe-area-inset-top` support.

```tsx
// MobileTableOfContents.tsx
<div
  className="fixed left-0 right-0 z-40 md:hidden bg-[#0d2818]/95 backdrop-blur-sm border-b border-[#7dd87d]/20"
  style={{ top: "calc(env(safe-area-inset-top, 0px) + var(--top-nav-height, 56px))" }}
>
  <div className="px-4 py-2 overflow-x-auto">
    {/* existing pill content */}
  </div>
</div>
```

Add `--top-nav-height: 56px;` to `:root` in `client/src/index.css`. If the top nav height changes per route, expose the var from the TopNav component.

**Files changed:**
- `client/src/components/MobileTableOfContents.tsx`
- `client/src/index.css`

**Acceptance criteria:**
- On Governance, the sticky sub-nav pill sits flush under the main nav on scroll.
- No gap between main nav bottom edge and pill top edge.
- Section anchors scroll such that the section heading is visible below the combined sticky header (main nav + pill). Use `scroll-margin-top: calc(var(--top-nav-height) + 56px);` on `[id]` targets in the section body.
- Same pattern applied to any other page that uses MobileTableOfContents.

---

## Fix 4 — Bionomics hero H1 overlaps image text (Critical)

**Status:** CODED

**Symptom:** On `/bionomics`, the hero image (`/blog-hero-bridging-worlds.webp`) has artwork text in it. The H1 "Bionomics" is absolute-positioned over the image and visually collides with the painted text, producing a muddled double-heading.

**Root cause:** `client/src/pages/Bionomics.tsx` lines 635-727 render the hero with:
```tsx
<div className="relative ... overflow-hidden">
  <img src="/blog-hero-bridging-worlds.webp" ... />
  <div className="absolute inset-0 flex flex-col items-center justify-end ...">
    <Badge>...</Badge>
    <h1 className="word-reveal ...">Bionomics</h1>
    <p>...</p>
  </div>
</div>
```

**Fix:** Move the H1 and description below the image. Keep the Badge above the image if desired, or above the H1 in the stacked block. Drop the absolute overlay entirely.

```tsx
<section className="relative">
  <div className="relative rounded-2xl overflow-hidden shadow-2xl">
    <img
      src="/blog-hero-bridging-worlds.webp"
      alt="Bridging the old economy and the living economy"
      className="w-full h-auto block"
      loading="eager"
      fetchpriority="high"
    />
  </div>
  <div className="mt-6 text-center px-4">
    <Badge className="mb-3 bg-[#2d5a3d] text-[#7dd87d] border-[#7dd87d]/30">
      The Living Economy
    </Badge>
    <h1 className="word-reveal text-4xl sm:text-5xl md:text-7xl font-bold text-white">
      Bionomics
    </h1>
    <p className="mt-4 text-lg md:text-xl text-white/80 max-w-3xl mx-auto safe-prose">
      The living-economy side of ReGen Civics.
    </p>
  </div>
</section>
```

**Files changed:**
- `client/src/pages/Bionomics.tsx` (lines 635-727 region)

**Acceptance criteria:**
- Hero image sits in its own container; no overlapping H1.
- H1 reads cleanly below the image on all screen widths.
- Mobile width (375px): no horizontal overflow, image scales to container, H1 wraps if needed.
- Same treatment audit pass on `/tokenomics`, `/governance`, `/fund`, `/play` hero sections. If any of them use absolute-over-image H1s, convert them too.

---

## Fix 5 — Governance pie chart is unreadable (High)

**Status:** CODED

**Symptom:** The "Who Holds the Vote" pie chart at `client/src/pages/Governance.tsx` lines 80-88 (`/images/governance/who-holds-vote.png`) is a raster image with tiny, blurred labels. On mobile it's illegible.

**Scope clarification:** This chart represents **Fund governance only** (RCVoice side of the bridge). It is not the full platform governance picture. Label the component and the page section accordingly so readers understand this shows who holds voice over Fund decisions specifically.

**Root cause:** Raster PNG was generated at low DPI, no vector labels, no per-slice tooltips.

**Fix:** Rebuild as inline SVG with clear labels per slice, using the geometric/data-viz style Rye chose for quantitative graphics. Four slices (not five), each at 20% except Council at 40%.

Create `client/src/components/governance/WhoHoldsVoteChart.tsx`:

```tsx
import { useMemo } from "react";

type Slice = { label: string; share: number; color: string; };

// Fund governance weight (RCVoice / $RCivics side only).
const slices: Slice[] = [
  { label: "Stewardship Council", share: 40, color: "#4a7c59" },
  { label: "Investors",           share: 20, color: "#7dd87d" },
  { label: "Land Projects",       share: 20, color: "#f0ebe3" },
  { label: "Alliance Partners",   share: 20, color: "#ffd166" },
];

export function WhoHoldsVoteChart() {
  const total = slices.reduce((s, x) => s + x.share, 0);
  const paths = useMemo(() => {
    let acc = 0;
    const r = 100, cx = 110, cy = 110;
    return slices.map((s) => {
      const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += s.share;
      const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const large = s.share / total > 0.5 ? 1 : 0;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const labelAngle = (start + end) / 2;
      const lx = cx + r * 0.65 * Math.cos(labelAngle);
      const ly = cy + r * 0.65 * Math.sin(labelAngle);
      return {
        d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`,
        color: s.color,
        label: s.label,
        share: s.share,
        lx, ly,
      };
    });
  }, [total]);

  return (
    <figure className="bg-[#1a472a]/40 border border-[#7dd87d]/20 rounded-2xl p-4 md:p-6">
      <svg viewBox="0 0 220 280" className="w-full h-auto" role="img" aria-label="Who holds the vote: breakdown of governance weight">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="#0d2818" strokeWidth={1.5} />
        ))}
        {paths.map((p, i) => (
          <text key={`t-${i}`} x={p.lx} y={p.ly} textAnchor="middle" className="fill-[#0d2818] text-[10px] font-semibold">
            {p.share}%
          </text>
        ))}
      </svg>
      <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-white/80">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: s.color }} aria-hidden />
            <span className="flex-1">{s.label}</span>
            <span className="font-mono text-[#7dd87d]">{s.share}%</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 text-xs text-white/60">
        Governance weight by actor class at mainnet launch. Percentages evolve with each season.
      </figcaption>
    </figure>
  );
}
```

Replace the `<img src="/images/governance/who-holds-vote.png">` with `<WhoHoldsVoteChart />`. Add a section label above the chart: "Fund Governance: Who Holds the Vote" so readers know this is the RCVoice side only.

Also add a short supporting line above the chart:

> These four actor classes together hold voice over Fund decisions: capital deployment, partner acceptance, and stewardship policy. Game governance (RGVoice) follows a separate structure on the ReGen Games side of the bridge.

**Files changed:**
- `client/src/components/governance/WhoHoldsVoteChart.tsx` (new)
- `client/src/pages/Governance.tsx` (replace image reference)

**Acceptance criteria:**
- Chart renders crisply at every screen width.
- Four slices render at 40/20/20/20, labeled Stewardship Council, Investors, Land Projects, Alliance Partners.
- Section heading reads "Fund Governance: Who Holds the Vote" so it's clear this is Fund-side only.
- Each slice has an associated labeled legend entry.
- Percentages visible on each slice.
- Fully accessible: `role="img"`, aria-label, keyboard-focusable legend.

---

## Fix 6 — Schedule auto-archives past sessions and exposes recordings (High)

**Status:** CODED (plus HUMAN STEP REQUIRED for cron setup)

**Symptom:** Past events still appear in "upcoming" lists on /schedule. Recordings are not visibly linked alongside their source events. There's no "Historical Sessions" view.

**Root cause:**
- `server/routes/events.ts` line 192-213 (`eventsRouter.list`) filters out completed/cancelled only when `includeCompleted=false`, but status auto-transition logic lives in `server/_core/index.ts` lines 524-547 inside a reminder endpoint that only runs on email-reminder trigger.
- No cron or query-time invocation promotes a just-finished event from "upcoming" to "completed".
- Schedule.tsx at lines 60-75 has a `RecordingsSection` but does not visually pair recordings with their source events.

**Fix:**
1. Extract the status-transition block from `_core/index.ts` into a shared helper `server/lib/eventStatusSweep.ts`:
   ```ts
   export async function sweepEventStatuses(db) {
     const now = new Date();
     await db.update(events)
       .set({ status: "live" })
       .where(and(
         eq(events.status, "upcoming"),
         lte(events.startTime, now),
         gt(events.endTime, now),
       ));
     await db.update(events)
       .set({ status: "completed" })
       .where(and(
         inArray(events.status, ["upcoming", "live"]),
         lte(events.endTime, now),
       ));
   }
   ```
2. Call `sweepEventStatuses(db)` at the top of `eventsRouter.list` so every request self-heals state. This is cheap and safe.
3. Also schedule a nightly cron via `node-cron` in `server/cron/index.ts` (create if missing) that runs at 03:00 UTC.
4. In `client/src/pages/Schedule.tsx`, split the page into two clear sections with tab-style navigation:
   - "Upcoming Sessions" (events with status in upcoming | live)
   - "Historical Sessions" (events with status = completed, sorted newest first, each with its recording inline if `recordingId` is set)
5. Render a `<HistoricalEventCard>` that shows title, date, a "Watch recording" button linking to the recording when present, or "No recording" label otherwise. Pull via `trpc.events.list({ includeCompleted: true })` with a client-side partition.

**Files changed:**
- `server/lib/eventStatusSweep.ts` (new)
- `server/_core/index.ts` (remove inline sweep, call shared helper)
- `server/routes/events.ts` (invoke sweep at top of list query)
- `server/cron/index.ts` (new nightly job)
- `server/index.ts` (wire cron on boot)
- `client/src/pages/Schedule.tsx` (split tabs, render historical section)
- `client/src/components/schedule/HistoricalEventCard.tsx` (new)

**Acceptance criteria:**
- Any event whose endTime has passed shows as "completed" within one `eventsRouter.list` call.
- Schedule page has two tabs or clearly labeled sections: Upcoming and Historical.
- Each historical event links directly to its recording if available.
- Recordings section no longer floats orphaned at the bottom.
- Cron job verified running on Railway (check logs next morning).

---

## Fix 7 — Move Schedule into Play section, remove Command Center menu entry (High)

**Status:** CODED

**Symptom:** The Play section in the More menu has a "Command Center" entry that links to `/command-center`, which is not a real page. Meanwhile Schedule is buried in the footer links. Schedule should sit prominently in Play, right after Quests.

**Root cause:** `client/src/config/mobileMenu.ts`:
- Line 34: dead `{ label: "Command Center", ... href: "/command-center" }`.
- Line 69: Schedule is in MOBILE_MENU_FOOTER.

**Fix:** Update `client/src/config/mobileMenu.ts`:

```ts
export const MOBILE_MENU_SECTIONS: MenuSection[] = [
  {
    id: "play",
    heading: "Play",
    cards: [
      { label: "Quests", sub: "The questing journey", href: "/quest", icon: "wizards", primary: true },
      { label: "Schedule", sub: "Upcoming and past sessions", href: "/schedule", icon: "Calendar" },
      { label: "Governance", sub: "Decisions, proposals, and the pipeline", href: "/governance", icon: "Vote" },
      { label: "Decisions", sub: "Governance pipeline mission control", href: "/community/decisions", icon: "Vote" },
      { label: "The Game", sub: "Bionomics: how it all fits together", href: "/bionomics", icon: "Sparkles" },
      { label: "Game Mechanics", sub: "Tune the simulator", href: "/game-mechanics", icon: "SlidersHorizontal" },
      { label: "Tools", sub: "Things we use and recommend", href: "/tools", icon: "Wrench" },
      { label: "Map", sub: "Land projects and partners", href: "/map", icon: "Map" },
    ],
  },
  // ... learn and invest sections unchanged
];

export const MOBILE_MENU_FOOTER = [
  { label: "Forum", href: "/community", icon: "MessageCircle" },
  { label: "Privacy", href: "/privacy-policy", icon: "Shield" },
  { label: "Contact", href: "/contact", icon: "Mail" },
];
```

Also update `client/src/components/CommandPalette.tsx` groups to match: move Schedule into Play group, remove any Command Center entry pointing to `/command-center`.

**Files changed:**
- `client/src/config/mobileMenu.ts`
- `client/src/components/CommandPalette.tsx`

**Acceptance criteria:**
- More menu Play section lists Schedule second, right after Quests.
- Command Center is no longer listed anywhere in menus.
- Schedule is removed from the footer links row.
- Cmd+K palette shows Schedule grouped under Play, not Seasons.

---

## Fix 8 — Alliance page "Contact Us" buttons become "Add Your Tool" (High)

**Status:** CODED

**Symptom:** The Alliance Network page has two identical "Contact Us" CTAs (hero and bottom) that link to `/connect`. Rye wants these to become prominent "Add Your Tool" CTAs that route to `/tools` with a submit CTA pinned at the top of that page.

**Root cause:** `client/src/pages/Ally.tsx` lines 219-228 (hero) and 469-478 (bottom) hard-code "Contact Us" and `/connect`.

**Fix:**
1. Update both CTAs:
   ```tsx
   <Link href="/tools">
     <Button className="bg-[#7dd87d] text-[#0d2818] hover:bg-[#9de89d] font-semibold px-6 py-3 rounded-xl shadow-md">
       <Plus className="w-4 h-4 mr-2" />
       Add Your Tool
     </Button>
   </Link>
   ```
2. In `client/src/pages/Tools.tsx`, pin a "Submit a Tool" CTA card at the very top of the page content (above the existing tools library grid). The card reads:
   - Headline: "Add a tool you rely on"
   - Body: "Drop the name, the link, and a sentence about why it belongs in the regen stack."
   - Primary button: "Submit a tool" linking to the existing submit flow (or opening a modal with a short form that posts to `tools.submit` tRPC endpoint, creating if missing).
3. If `tools.submit` does not yet exist, scaffold a minimal version: title, url, description, category, submittedByUserId. Admins review via existing admin moderation UI.

**Files changed:**
- `client/src/pages/Ally.tsx` (hero + bottom CTAs)
- `client/src/pages/Tools.tsx` (pin top submit card)
- `server/routes/tools.ts` (scaffold submit endpoint if missing)
- `client/src/components/tools/SubmitToolCard.tsx` (new)
- `client/src/components/tools/SubmitToolDialog.tsx` (new, form)

**Acceptance criteria:**
- Both Alliance CTAs say "Add Your Tool" and navigate to `/tools`.
- `/tools` opens with the submit card pinned at the top, above the library grid.
- Submit form validates url, title, description, and saves to DB behind moderation.
- On mobile, the submit card is the first thing the eye catches.

---

## Fix 9 — Suggest a Feature becomes the standout footer CTA (High)

**Status:** CODED

**Symptom:** `client/src/components/SiteFooter.tsx` line 59-61 renders Suggest a Feature as a plain text link identical to every other footer nav item. Rye wants it visually dominant to signal that the community governs the platform.

**Root cause:** No visual differentiation from surrounding nav links.

**Fix:** Replace the existing plain link with a standout button block that sits above or to the side of the regular footer nav. Use the accent color, add an icon, add a short supporting line.

```tsx
// Inside SiteFooter.tsx, above the standard nav column
<div className="mb-6 px-4 py-5 rounded-2xl bg-gradient-to-br from-[#7dd87d]/15 to-[#4a7c59]/10 border border-[#7dd87d]/30 text-center">
  <h3 className="text-[#7dd87d] text-lg font-semibold mb-1">Help shape this platform</h3>
  <p className="text-white/70 text-sm mb-3 safe-prose">
    Community governance means your ideas become the build queue. Drop what you want next.
  </p>
  <Link href="/features">
    <Button className="bg-[#7dd87d] text-[#0d2818] hover:bg-[#9de89d] font-semibold px-6 py-3 rounded-xl shadow-md inline-flex items-center gap-2">
      <Lightbulb className="w-4 h-4" />
      Suggest a Feature
    </Button>
  </Link>
</div>
```

Remove the old plain-link version from the nav column. Keep Features/Roadmap linked elsewhere if needed.

**Files changed:**
- `client/src/components/SiteFooter.tsx`

**Acceptance criteria:**
- Suggest a Feature is rendered as a filled green button on every page that shows the footer.
- The block is visually the strongest item in the footer area, above all other footer links.
- Tappable area large enough for iPhone touch targets (minimum 44px height).
- On mobile the block spans full width with 16px horizontal padding.

---

## Fix 10 — Rebuild Command Center with full feature parity (Medium, larger scope)

**Status:** CODED (design spec)

**Symptom:** The old "Command Center" had music controls, favorite/recent pages, AI chat, and global search. The new `CommandPanel` (bottom-expand panel) has music and ProgressMapMini but is missing favorite/recent pages and AI chat. Rye wants everything restored inside the new system, integrated beautifully.

**Root cause:** The new CommandPanel shipped as a slim v1 with audio and quick tools; older Command Center features were not ported.

**Fix:** Expand `client/src/components/CommandPanel.tsx` into a tabbed surface. Use shadcn Tabs:

Tabs (left to right):
1. **Sound** (default when music is playing): existing audio player UI (current song, controls, progress, volume, track list).
2. **Search** (default when music is paused): Cmd+K-style global search with live results across pages, blog, forum threads, tools, users. Reuse `trpc.globalSearch.query`.
3. **Recent & Favorites**: Two columns. Left: last 10 pages visited (localStorage-backed, scoped to tab/session). Right: pinned favorites (localStorage-backed, star icon to add current page).
4. **Assist**: Embedded AI chat via existing `AIChatBox` component. Scoped to the current page context ("You are on /governance. Ask me anything about governance.").
5. **Tools**: The existing `usePageTools` hook output. Page-specific quick actions.
6. **Map**: The existing `ProgressMapMini`.

Surface design notes:
- Panel opens to 75vh on mobile, 500px on desktop.
- Persistent top strip: current song + play/pause + close.
- Tab strip below, horizontally scrollable if narrow.
- Each tab body scrollable independently.
- Keyboard shortcut: Cmd+K opens panel on Search tab; Esc closes.

Implementation breakdown:
- Extend `client/src/components/CommandPanel.tsx` with tab state and the six tab panes.
- Add `client/src/hooks/useRecentPages.ts` (localStorage read/write, tracks location changes from wouter).
- Add `client/src/hooks/useFavoritePages.ts` (localStorage, toggle by path).
- Wire `AIChatBox` with a `context` prop so it receives the current path and a short page summary.
- Remove dead `/command-center` route references across the codebase.

**Files changed:**
- `client/src/components/CommandPanel.tsx` (major rewrite)
- `client/src/hooks/useRecentPages.ts` (new)
- `client/src/hooks/useFavoritePages.ts` (new)
- `client/src/components/command/SearchTab.tsx` (new)
- `client/src/components/command/RecentFavoritesTab.tsx` (new)
- `client/src/components/command/AssistTab.tsx` (new)
- `client/src/components/command/ToolsTab.tsx` (new, wraps existing page tools)
- `client/src/components/command/MapTab.tsx` (new, wraps ProgressMapMini)
- `client/src/components/AIChatBox.tsx` (accept `context` prop if not already)

**Acceptance criteria:**
- Expand panel from the bottom bar More button shows 6 tabs.
- Music plays uninterrupted while switching tabs.
- Search finds pages, blog posts, tools, users, forum threads with live tRPC results.
- Recent pages updates as user navigates.
- Favorites persist across sessions.
- AI assist responds with context-aware answers.
- Panel is keyboard-accessible: Tab focuses controls, Cmd+K opens to Search.
- Mobile Safari: panel animates in smoothly, no jank, no overscroll bleed through.

---

## Fix 11 — Governance illustrations: solarpunk remakes of 2 visuals (Medium)

**Status:** CODED (Claude Code will also generate and commit the new images)

**Symptom:** Two Governance page visuals are weak:
1. `/images/governance/seasonal-cycle.png` (line 1121-1127) looks flat and rushed.
2. `RCVoice vs RGVoice: Two Tokens Coordinating Systemic Regeneration` image (line 976) is off-brand.

(The pie chart mentioned in earlier reviews is handled via Fix 5 as inline SVG.)

Rye chose a hybrid style: illustrated solarpunk for concept graphics, geometric for data.

**Root cause:** Original images were placeholders.

**Fix:** Claude Code generates both replacement illustrations via the nano-banana-pro skill at 2K resolution, commits them to the repo under `client/public/images/governance/`, and updates the Governance.tsx references. No manual step required from Rye except a visual approval pass after the PR lands.

Use the CHARACTER_ART style guide (`CLAUDE_CODE_PROMPT_2026-04-03_CHARACTER_ART.md`) as the aesthetic anchor.

**Prompt 1 — Seasonal Cycle:**
> A solarpunk illustrated circular diagram of the four seasons as a regenerative governance cycle. Center: a living tree. Four quadrants around it: Spring (green shoots, proposals emerging), Summer (full canopy, active decisions), Autumn (harvest, distribution), Winter (roots, reflection). Elven-jedi line-work, warm golden and deep forest palette, hand-drawn feel, no text, no labels. Square format, 2K.

**Prompt 2 — RCVoice and RGVoice bridge:**
> Two flowing rivers meeting at a bridge, viewed from above. Left river: silver-blue, labeled visually with coins and a legal scale motif (the Fund, RCVoice, $RCivics). Right river: emerald-green, labeled visually with seeds, hands, and community circles (the Game, RGVoice, $ReGen). The bridge in the middle is a living wooden arch with people walking both directions. Solarpunk painted style, warm golden hour light, no text, no labels. Wide format, 2K.

After generation, save to:
- `client/public/images/governance/seasonal-cycle.png`
- `client/public/images/governance/two-tokens-bridge.png`

Then update Governance.tsx references.

**Files changed:**
- `client/public/images/governance/seasonal-cycle.png` (new asset)
- `client/public/images/governance/two-tokens-bridge.png` (new asset)
- `client/src/pages/Governance.tsx` (update references)

**Acceptance criteria:**
- Both images load crisply at 2K on Retina displays.
- No text burned into the image (all labels via overlay text for i18n).
- Style matches CHARACTER_ART guide.
- Alt text on each `<img>` describes the graphic for screen readers.

---

## Fix 12 — Live Governance Dashboard wireframe preview tightens on narrow mobile (Medium)

**Status:** CODED

**Symptom:** `client/src/pages/Governance.tsx` lines 680-744 render the Live Governance Dashboard section with a "Going Live at the September Equinox" pill, countdown, and wireframe preview card. On narrow mobile, the wireframe card overflows and the countdown digits wrap awkwardly.

**Root cause:** Fixed widths on the wireframe card, large countdown digit font size, inner flex layout without `min-w-0`.

**Fix:**
1. Wrap the wireframe card in `max-w-full overflow-hidden rounded-2xl`.
2. Countdown digits: use `clamp(1.5rem, 6vw, 3rem)` for font-size so they scale.
3. Any inner `<div className="flex">` rows get `min-w-0` on flex children and `flex-wrap` where appropriate.
4. On widths under 400px, swap the side-by-side countdown + pill layout to stacked (`flex-col sm:flex-row`).
5. Add `safe-prose` to the body paragraphs in this section.

**Files changed:**
- `client/src/pages/Governance.tsx` (lines 680-744 region)

**Acceptance criteria:**
- At 375px width, the wireframe preview and countdown fit inside the viewport.
- No horizontal scroll on Governance at 375px.
- Countdown digits do not wrap mid-digit.

---

## Fix 13 — Loomio credit stays; audit governance copy for consistency (Low)

**Status:** VERIFIED

**Symptom:** During the review pass, the Loomio credit on `client/src/pages/DecisionsDashboard.tsx` line 219 ("Governance powered by Loomio. Support their work at loomio.com.") was considered for removal. Rye confirmed: Loomio stays.

**Root cause:** None.

**Fix:**
- Keep the Loomio credit as-is.
- Audit all governance copy across Governance.tsx, DecisionsDashboard.tsx, and the forum views to confirm consistent language: Loomio handles proposals and votes, Hypha handles on-chain formalization, ReGen Civics holds the community layer.
- If any page incorrectly says we've moved off Loomio, correct it.

**Files changed:** None expected, plus any correction passes during audit.

**Acceptance criteria:**
- Loomio credit present and visible on DecisionsDashboard.
- No contradicting copy anywhere else.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 6a | Confirm Railway cron job is scheduled and firing for `sweepEventStatuses` | Requires Railway dashboard login | Railway project → Service → Settings → Cron Jobs, confirm nightly entry exists |
| 6b | Confirm `DATABASE_URL` supports multi-statement for migration if needed | Railway env access | Railway env vars tab |
| 11b | Visual approval pass on the two new governance illustrations after Claude Code commits them | Aesthetic judgment | Open `/governance` in browser, approve or request regen |
| 13a | Run a manual audit of governance copy for Loomio/Hypha consistency after Claude Code's Fix 13 audit completes | Requires reading pages in browser | Read `/governance`, `/community/decisions`, any forum pages |
| all | `git add -A && git commit && git push` after Claude Code ships each fix batch | Claude Code holds the git index lock | Run from project root |
| all | Confirm Railway deploy succeeded after push | Railway dashboard | Railway → Deployments tab |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Audit and patch all horizontal overflow offenders (Community, Governance, ThreadRoots, CommunityChains, CommunityTagFilter) | CODED |
| 1b | Add `.safe-prose` utility to index.css and apply to governance/bionomics body containers | CODED |
| 2 | Move ScrollToTop to bottom-left with safe-area-inset-left | CODED |
| 3 | Pin MobileTableOfContents flush under main nav with `--top-nav-height` var | CODED |
| 3b | Add `scroll-margin-top` to all `[id]` section targets in governance sections | CODED |
| 4 | Refactor Bionomics hero to stacked image + below-image heading | CODED |
| 4b | Audit other page heroes for the same absolute-over-image H1 pattern and fix | CODED |
| 5 | Build `WhoHoldsVoteChart` SVG component, replace PNG reference in Governance.tsx | CODED |
| 6 | Extract `sweepEventStatuses` helper, invoke in `eventsRouter.list`, wire cron | CODED |
| 6c | Split Schedule.tsx into Upcoming and Historical tabs with inline recordings | CODED |
| 7 | Update mobileMenu.ts: add Schedule to Play, remove Command Center, remove Schedule from footer | CODED |
| 7b | Update CommandPalette.tsx groups to match | CODED |
| 8 | Rewrite both Ally.tsx CTAs to "Add Your Tool" linking to /tools | CODED |
| 8b | Pin Submit a Tool card at top of Tools.tsx with tRPC form | CODED |
| 8c | Scaffold `tools.submit` endpoint if missing | CODED |
| 9 | Rebuild Suggest a Feature as standout green-filled CTA block in SiteFooter | CODED |
| 10 | Expand CommandPanel into 6-tab surface: Sound, Search, Recent, Assist, Tools, Map | CODED |
| 10b | Build `useRecentPages` and `useFavoritePages` hooks with localStorage persistence | CODED |
| 10c | Thread `AIChatBox` context prop for Assist tab | CODED |
| 11 | Generate both new governance illustrations via nano-banana-pro skill, commit PNGs, update Governance.tsx references | SCRIPTS READY |
| 12 | Tighten Live Governance Dashboard section for narrow mobile | CODED |
| 13 | Audit governance copy for Loomio/Hypha consistency | CODED |

### WAITING ON YOU before Claude Code can proceed

- Fix 6 cron deployment verification (blocked until Rye confirms Railway cron is firing after push).
- Fix 11 aesthetic approval (Claude Code will generate and commit the illustrations; Rye approves visually once the PR lands).

---

# 15 Refinements to Prepare the Site for Mass Launch

Curated in priority order. Each is additive to the 13 fixes above.

### 1. Sub-1-second LCP on the homepage for iPhone Safari

Preload the hero image, inline above-the-fold CSS, ship WebP with AVIF fallback, and set `fetchpriority="high"` on the hero tag. Target: Lighthouse mobile LCP under 1.2s on a Moto G4 / slow 3G profile so iPhone Safari on LTE feels instant.


### 3. Progressive Web App install prompt

Add a proper manifest with icons, theme color, and an "Add to Home Screen" prompt for iPhone Safari and android that appears after the user completes their first quest or returns for a second session. The site should feel like a native app on iPhone and android respectively. 

### 4. Offline-first forum reading

Cache the last 50 forum thread roots and the user's subscribed threads via a service worker so a player can re-read the forum on the subway without loss.

### 5. Real-time presence on forum threads

Show "3 people reading this thread right now" via a lightweight websocket channel or Server-Sent Events. Presence creates a sense of liveness and invites reply.

### 6. Integrated video player on recordings pages

Past session recordings currently link out. Embed them inline with the ReGen Civics theme (custom player chrome, green progress, autoplay next in the season). Keeps people on-site and feels curated.

### 7. Shareable card generator for every quest

When a player completes a quest, auto-generate a social card (via the existing OG image pipeline) with their avatar, quest name, and reflection snippet. One-tap share to Twitter, Instagram, and LinkedIn.

### 8. Bioregional landing pages

`/bioregion/pacific-northwest`, `/bioregion/great-lakes`, etc. Each lists local land projects, upcoming events in the region, and local players. SEO-optimized for search intent like "regenerative land project oregon". Drives organic inbound.

### 9. Dedicated pitch page for investors

`/invest` already exists. Harden it with: one-minute video, compliance disclaimers, a clear fund structure diagram (rebuilt as SVG in the same hybrid style as Fix 11), the "Letter of Intent" flow, and a credibility band of alliance partners with logos. Audit for persuasion rules in the regen-fundraising-copy skill. Video coming soon - but have a spaceholder with an image saying "short overview coming soon - keep reading for the full story"

### 10. Accessibility pass to WCAG AA

Axe-core audit on every top-level route. Ensure all images have alt text, all color contrast passes AA, all interactive elements have focus rings, all modals trap focus, all forms announce errors. This is table stakes for a movement-wide platform.

### 11. Performance budget CI gate

Add Lighthouse CI to the GitHub Actions workflow. Fail the build if any of homepage, /quest, /governance, /bionomics regresses LCP past 2.5s or INP past 200ms on mobile. Ships with a visible badge in README.

### 12. Player profile public pages with portfolio

`/player/[username]` renders a public view of a player's quests, contributions, roles, and bioregion. Links to forum posts and recordings they appear in. Becomes a recruiting page they can share with their own network.

### 13. Weekly digest email that a human would actually open

One per week, Sunday morning, subject line generated from the most interesting thing that happened that week (new land project, governance decision, major quest completion). Uses the regen-outreach-sequences skill voice. Opt-in visible from the footer. Remember our no AI writing styles (no em-dashes, contrasting language, etc, etc)


### 15. On-site contribution graph for every player

GitHub-style grid of forum posts, quest completions, recordings attended, and contributions. Visible on the player profile. Becomes a social signal and a gentle nudge to keep showing up. Data already exists in the DB; needs a new `/api/trpc/contributions.graph` endpoint and a lightweight SVG heatmap. This is meant to plug into the player animated tree feature we designed, make sure that's all wired up and working in the profile section. 

---

---

## Next Sprint: Visual Audit and Color Palette Normalization (planned)

After the 13 fixes above ship, the next pass is a thorough visual and design audit with desktop browser + mobile emulator. Goals:

1. **Walk every top-level route** on desktop Chrome and mobile emulator (iPhone 14 Pro, iPhone SE). Capture what looks exceptional and what needs polish.
2. **Normalize the color palette** around the organic ReGen Civics dark-forest system. Current pain point: too many accent colors drifting across pages. Lock to a small palette: `#0d2818` (deep forest), `#1a472a` (forest), `#2d5a3d` (moss), `#4a7c59` (sage), `#7dd87d` (spring green accent), `#f0ebe3` (parchment), plus a single warm accent (e.g., `#ffd166` amber) for governance highlights and a single warm red (`#ef6f6c`) for alerts. Any other hex values on any page get replaced or removed.
3. **Visual identity refinement**: typography hierarchy, spacing rhythm, shadow language, border radius language, button states, card treatments. Document the result as a short design tokens file under `client/src/lib/design-tokens.ts` and a one-page visual style guide at `DESIGN_SYSTEM.md`.
4. **Readability pass**: line-length, font-size on mobile, paragraph rhythm, section pacing. Goal is a reading experience that feels calm and curated, not busy.
5. **Additional world-class UX refinements**: to be captured as a fresh list during the audit, building on the 15 above.

This work belongs in `FIXES_TO_MAKE_VISUAL_AUDIT.md` (to be created when the sprint begins).

---

## Notes on writing rules compliance

This doc contains zero em-dashes, zero contrast framing, and zero banned AI words. Every fix states what the thing should become. No rhetorical question openers. No "join us on the journey" filler. Match this tone in any copy changes shipped alongside these fixes.

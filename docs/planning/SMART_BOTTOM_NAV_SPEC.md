# Smart Bottom Nav: Design Spec

## The Problem

The current mobile bottom nav has 4 static tabs: Fund, Land, Ally, Play. These map to the 4 paths, which made sense as an information architecture choice. But in practice, a person on the investor path doesn't need a "Land" button taking up prime real estate every time they open the app. That slot could be showing them the thing they actually need next.

The bottom nav is the most valuable real estate on mobile. It's always visible, always reachable with one thumb. Every slot needs to earn its place.

---

## Core Concept: 4 Slots, 3 Layers

**Slot 1: The Anchor (fixed)**
Quests. Always. For every user. Quests are the engagement loop that makes ReGen Civics a game and not just a website. Whether you're an investor reviewing fund docs or a land steward filing an application, quests are how you stay connected to the community. This slot never changes.

**Slots 2-3: The Adaptive Pair**
These start with smart defaults based on your path, then gradually learn from your actual behavior. The idea: we know what an investor probably needs (opportunity page, fund page), but we don't assume we're right forever. As someone browses, their real patterns override our guesses.

**Slot 4: The Contextual Action**
This is the most interesting slot. It shows the single most important thing you haven't done yet. "Submit LOI" for an investor who hasn't. "Apply" for a land project that hasn't. "Complete Profile" for anyone with gaps. Once you do the thing, the slot resolves itself and shows the next priority. If there's nothing contextual left, it becomes your 4th most-visited page. This slot is what makes the nav feel alive and personal.

---

## Path-Based Defaults

When someone first arrives (or hasn't built up visit history yet), the nav reflects their chosen path:

### Investor Path
| Slot | Page | Icon | Label |
|------|------|------|-------|
| 1 | /quest | scroll icon | Quests |
| 2 | /opportunity | file-text icon | Opportunity |
| 3 | /fund | trending-up icon | Fund |
| 4 | /loi | pen-line icon | Submit LOI |

The investor's journey: learn about the opportunity, review the fund, submit an LOI. Quests keep them engaged while they're deciding.

### Land Project Path
| Slot | Page | Icon | Label |
|------|------|------|-------|
| 1 | /quest | scroll icon | Quests |
| 2 | /seasons | sun icon | Seasons |
| 3 | /community | users icon | Community |
| 4 | /apply | clipboard icon | Apply |

Land projects need to understand the season structure, connect with the community, and submit their application.

### Alliance Partner Path
| Slot | Page | Icon | Label |
|------|------|------|-------|
| 1 | /quest | scroll icon | Quests |
| 2 | /ally | handshake icon | Alliance |
| 3 | /connect | message-circle icon | Connect |
| 4 | /apply | clipboard icon | Apply |

Partners need the alliance page for context, connect for relationship building, and apply to formalize.

### Player Path
| Slot | Page | Icon | Label |
|------|------|------|-------|
| 1 | /quest | scroll icon | Quests |
| 2 | /play | sprout icon | Play |
| 3 | /connect | message-circle icon | Connect |
| 4 | /community | users icon | Community |

Players are here for the game. Quests, play, connecting with others, community.

### No Path Selected (new/anonymous user)
| Slot | Page | Icon | Label |
|------|------|------|-------|
| 1 | /quest | scroll icon | Quests |
| 2 | /play | sprout icon | Play |
| 3 | /fund | trending-up icon | Fund |
| 4 | / | compass icon | Explore |

Safe defaults that showcase both the game side and the fund side. "Explore" goes to the homepage landing page.

---

## Icon Reference

All icons from `lucide-react`. The goal is organic, natural-feeling icons for the game/play pages, and functional icons for everything else.

| Page | Icon (lucide name) | Notes |
|------|-------------------|-------|
| /quest | `Scroll` | Anchor slot, always present |
| /play | `Sprout` | Organic, growth-oriented |
| /game | `Leaf` | Natural, earthy |
| /seasons | `Sun` | Calendar icon is reserved for /schedule |
| /opportunity | `FileText` | |
| /fund | `TrendingUp` | |
| /loi | `PenLine` | |
| /apply | `Clipboard` | |
| /ally | `Handshake` | |
| /connect | `MessageCircle` | |
| /community | `Users` | |
| / (Explore) | `Compass` | Homepage/landing |
| /profile/edit | `UserCircle` | Contextual CTA only |

---

## How Adaptive Learning Works

### Visit Tracking

Every time the user navigates to a page (SPA route change), we increment a counter:

```
localStorage key: "regen_nav_visits"
value: { "/fund": 12, "/quest": 34, "/opportunity": 8, "/community": 5, ... }
```

We also track total visit count to know when to start overriding defaults.

### The Blend Formula

- **0-1 total visits:** Pure path defaults. The user hasn't shown us anything yet.
- **2-9 visits:** 70% path affinity, 30% visit frequency. We start mixing in behavior early but still lean on the path.
- **10+ visits:** 40% path affinity, 60% visit frequency. Behavior dominates. If an investor keeps visiting /community, /community earns a slot.

### What "Path Affinity" Means

Each path has a ranked list of pages by relevance:

**Investor:** /opportunity (10), /fund (9), /loi (8), /risk-disclosure (7), /investor (6), /community (5), /blog (4)
**Land:** /apply (10), /seasons (9), /community (8), /land (7), /ally (6), /connect (5), /blog (4)
**Alliance:** /ally (10), /connect (9), /community (8), /seasons (7), /apply (6), /fund (5)
**Player:** /play (10), /connect (9), /quest (8), /community (7), /game (6), /blog (5), /glossary (4)

The score for each page = (affinity_weight * affinity_score) + (visit_weight * normalized_visit_count)

### Slot Selection Rules

1. Slot 1 is always /quest (hardcoded)
2. Slot 4 is contextual CTA if one exists, otherwise highest-scoring page not in slots 1-3
3. Slots 2-3 are the two highest-scoring pages (excluding /quest and whatever is in slot 4)
4. **Never show the current page.** If the user is ON /fund, don't show /fund in the nav. Shift everything up and show the next-best page in that slot.
5. **Never show pages that require auth to a logged-out user.** Don't put /apply in the nav if they can't access it yet.

---

## Contextual CTA Logic (Slot 4)

This is checked in priority order. First match wins:

### Priority 1: Profile Completion
**Condition:** User is logged in AND profile has < 3 fields filled (name, bio, avatar)
**Label:** "Profile"
**Icon:** user-circle
**Links to:** /profile/edit
**Resolves when:** Profile has name + bio + avatar

### Priority 2: Path-Specific Primary Action

| Path | Condition | Label | Icon | Links to | Resolves when |
|------|-----------|-------|------|----------|--------------|
| Investor | No LOI submitted | Submit LOI | pen-line | /loi | LOI record exists for user |
| Land | No application submitted | Apply | clipboard | /apply | Application record exists |
| Alliance | No application submitted | Apply | clipboard | /apply?type=ally | Application exists with type=ally |
| Player | No quests started | First Quest | sparkles | /quest | At least 1 quest progress record |

### Priority 3: Engagement Nudge
**Condition:** User has been active 3+ days but hasn't visited /community in 7+ days
**Label:** "Community"
**Icon:** users
**Links to:** /community
**Resolves when:** User visits /community (resets the 7-day timer)

### Priority 4: No Contextual Action
**Fallback:** Show the 4th highest-scoring page from the adaptive algorithm. Acts like a regular nav slot.

### CTA Visual Treatment
The contextual CTA slot should have a subtle visual distinction from the regular slots. Options:
- A small dot/badge on the icon (like a notification indicator)
- The icon uses the accent color (gold/yellow) instead of the standard green/white
- A gentle pulse animation on first appearance that settles after 2 seconds

Pick whichever feels right with the existing design language. The goal is "hey, this one's special" without being obnoxious.

---

## Current Page Awareness

When the user is on a page that would normally show in the nav, we need to handle it gracefully:

**Option A (recommended):** Replace the current page's slot with the next-best page. So if an investor is on /opportunity, slot 2 shifts from "Opportunity" to their 3rd most relevant page (maybe /community or /blog).

**Option B:** Keep the current page in the nav but show it as "active" (highlighted). This is what the current static nav does.

I'd go with **Option A** because it maximizes the nav's utility. You already know you're on /opportunity because you're looking at it. The nav should show you where you can GO, not where you ARE. The page header/title tells you where you are.

---

## User Customization (Ships with V1)

Long-press customization ships with the initial release. Giving users direct control over their nav makes it feel like *theirs* from day one.

### The Interaction
- Long-press (500ms) on any slot (except Quests in slot 1)
- A bottom sheet slides up showing a grid of all available pages
- Each page shows its icon + label
- User taps one to replace the long-pressed slot
- Confirmation haptic/animation
- A subtle tooltip or onboarding hint on first use: "Hold any tab to customize"

### Storage
```
localStorage key: "regen_nav_custom"
value: { "slot2": "/fund", "slot3": "/community" }
```

Custom selections override the adaptive algorithm completely. The user said "I want this here" so we respect that.

### Reset
- A "Reset to Smart Defaults" option in the customization sheet
- Clears `regen_nav_custom` and returns to the adaptive algorithm

### Implementation Notes
- The bottom sheet should match the existing design language (dark green, rounded corners)
- Show all public pages in a 3-column grid, grouped loosely by category (paths, resources, actions)
- Pages requiring auth should be dimmed/disabled for logged-out users
- The long-press gesture needs a visual indicator (slight scale-up or border glow) so the user knows it activated

---

## Implementation Architecture

### New Files

**`client/src/hooks/useNavVisits.ts`**
- Listens to route changes (Wouter)
- Increments visit counts in localStorage
- Exports: `{ visits, totalVisits, trackVisit }`

**`client/src/hooks/useSmartNav.ts`**
- Takes: user profile (path, auth status), visits, current route
- Computes the 4 slots using the blend formula
- Handles "current page awareness" (Option A)
- Exports: `{ slots: NavSlot[] }` where NavSlot = { path, icon, label, isContextual }

**`client/src/hooks/useContextualCTA.ts`**
- Takes: user profile, quest progress, application status, LOI status
- Walks the priority list
- Exports: `{ cta: { path, icon, label } | null, isResolved: boolean }`

**`client/src/components/SmartBottomNav.tsx`**
- Renders the 4 slots
- Uses the existing visual style (dark green bar, icons, labels)
- Handles the contextual CTA visual treatment (dot/badge/color)
- Mobile only (hidden on desktop via `md:hidden` or equivalent)
- Long-press detection on slots 2-4

**`client/src/components/NavCustomizeSheet.tsx`**
- Bottom sheet UI for slot customization
- Shows grid of all available pages with icons
- Handles page selection, swap animation, and "Reset to Smart Defaults" action
- Reads/writes `regen_nav_custom` in localStorage

### Modified Files

**`client/src/layouts/MobileLayout.tsx`** (or wherever the current `BottomNav` / `PathNav` lives)
- Swap `<PathNav />` or `<BottomNav />` for `<SmartBottomNav />`

### Data Dependencies

The hooks need access to:
- Current route (from Wouter's `useLocation`)
- User profile including `selectedPath` (from `useAuth` or user context)
- Application status (check if user has submitted an application)
- LOI status (check if user has submitted an LOI)
- Quest progress (check if user has started any quests)

Most of this is already available through existing tRPC queries or auth context. Don't create new API endpoints if the data is already queryable through existing procedures.

---

## Edge Cases

**Logged-out users:** Show the "No path selected" defaults. No contextual CTA (since we don't know who they are). Visit tracking still works via localStorage so when they log in, we have some history.

**User switches paths:** Reset the adaptive weights. Keep visit history (it's still valid data) but recalculate slots with the new path affinity scores.

**Very few pages visited:** Until 2+ visits, stick with path defaults. The adaptive algorithm kicks in early to feel responsive.

**All slots would be the same page:** The deduplication rule prevents this, but if the scoring somehow produces the same page for multiple slots, skip duplicates and pull in the next-highest.

---

## Success Metrics (things to watch after shipping)

- Do people click the bottom nav more? (Compare click rate before/after)
- Do contextual CTAs get completed? (LOI submissions, applications, profile completions from nav clicks)
- Do people use the customization feature? (Track long-press activations and custom slot saves)
- Page diversity: are users visiting more pages than before? (The old static nav funneled everyone through the same 4 pages)

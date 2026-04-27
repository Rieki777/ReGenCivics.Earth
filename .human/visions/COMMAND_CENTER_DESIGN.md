# Command Center: Page Tools Design

**Last updated:** 2026-03-26
**Purpose:** Living document. Edit this as we learn what users actually want. Claude Code reads this when implementing page tools.

---

## How It Works

The Command Center bar has 5 slots. Tapping "More" opens a panel. The top section of that panel shows **page-specific tool buttons** that change depending on which page you're on. On desktop, these tools also appear as a second row above the bar so desktop users don't need to tap "More."

The tool buttons use custom events to open modals (e.g., `window.dispatchEvent(new CustomEvent('open-quest-badges'))`). Navigation buttons just use `window.location.href`.

---

## Bar Layout

**Top-level pages:**
```
[ Quests ] [ Community ] [ Apply ] [ Music ] [ More ]
```

**Sub-pages (anything not top-level):**
```
[ <- Back ] [ Community ] [ Apply ] [ Music ] [ More ]
```

Top-level routes (no Back): `/`, `/land`, `/play`, `/quest`, `/community`, `/fund`, `/apply`, `/profile`, `/map`, `/blog`

---

## Page Tools Per Page

### `/quest`

| Button | Icon | Action |
|--------|------|--------|
| Progress | TrendingUp | Opens QuestProgressTracker modal (X/14 completion, rewards) |
| Badges | Award | Opens QuestBadges modal (grid of 14 badges, earned/unearned) |
| Field | Users | Opens QuestArtifactsGallery modal (active players, recent completions) |
| Calculator | Calculator | Navigate to `/calculator` |

**Notes:** Replaces the 3 stacked FABs that used to float bottom-right. Calculator gives quick access to the token calculator from the quest context.

### `/community`

| Button | Icon | Action |
|--------|------|--------|
| New Post | PenLine | Navigate to `/community/new` |
| Resonance | Flame | Set forum sort to "resonance" (weighted emoji sort) |
| Seeds | Sprout | Filter to show only seed posts |
| Guidelines | BookOpen | Navigate to `/community/guidelines` |

### `/community/post/:id`

| Button | Icon | Action |
|--------|------|--------|
| Reply | MessageCircle | Scroll to reply form and focus editor |
| Copy Link | Link | Copy post URL to clipboard, show toast |
| Propose | Sparkles | Navigate to `/community/quests?propose=true&title=...&threadId=...` |
| Roots | GitBranch | Toggle ThreadRoots conversation map (if 10+ replies) |

**Notes:** "Propose as Quest" makes sense on individual posts where organic ideas emerge. Kept here (removed from /quest page tools).

### `/community/c/:slug`

| Button | Icon | Action |
|--------|------|--------|
| New Post | PenLine | Navigate to `/community/new?category=:slug` |

### `/fund`

| Button | Icon | Action |
|--------|------|--------|
| LOI | FileText | Navigate to `/loi` |
| Invest | TrendingUp | Navigate to `/investor` |
| Calculator | Calculator | Navigate to `/calculator` |
| Map | Globe | Navigate to `/map` |

### `/land`

| Button | Icon | Action |
|--------|------|--------|
| Apply | Sprout | Navigate to `/apply` |
| Sessions | Calendar | Navigate to `/schedule` |
| Map | Globe | Navigate to `/map` |
| Criteria | Clipboard | Scroll to criteria section |

### `/play`

| Button | Icon | Action |
|--------|------|--------|
| Quest | Scroll | Navigate to `/quest` |
| Games | Sparkles | Navigate to `/regen-games` |
| Tokens | Coins | Scroll to Token System section |
| Sessions | Calendar | Navigate to `/schedule` |

### `/apply`

| Button | Icon | Action |
|--------|------|--------|
| Criteria | Clipboard | Scroll to criteria section |
| Land Info | Leaf | Navigate to `/land` |
| Status | FileText | Navigate to `/apply/status` |

### `/profile`

| Button | Icon | Action |
|--------|------|--------|
| Edit | PenLine | Switch to edit mode |
| Sync | RefreshCw | Trigger token sync |
| Settings | Settings | Open settings panel |
| Journal | BookOpen | Switch to journal tab |

### `/map`

| Button | Icon | Action |
|--------|------|--------|
| Legend | List | Toggle the map legend panel |
| Apply | Sprout | Navigate to `/apply` |
| Alliance | Handshake | Navigate to `/ally` |

### `/crowd-pooling`

| Button | Icon | Action |
|--------|------|--------|
| Projects | Mountain | Navigate to `/crowd-pooling-projects` |
| Calculator | Calculator | Navigate to `/calculator` |
| Agreements | FileText | External link to agreements doc |

### `/crowd-pooling-projects`

| Button | Icon | Action |
|--------|------|--------|
| Pool Info | Coins | Navigate to `/crowd-pooling` |
| Compare | BarChart | Navigate to `/compare-projects` |
| Calculator | Calculator | Navigate to `/calculator` |
| Map | Globe | Navigate to `/map` |

**Notes:** "Pool Info" links back to the main crowd-pooling page with the full explainer. This is a primary action since players land on /crowd-pooling-projects from search or direct links and may not have context.

### `/blog`

| Button | Icon | Action |
|--------|------|--------|
| Suggest | PenLine | Opens blog suggestion form |
| Vote | Vote | Scrolls to voting section |

### `/blog/:slug`

| Button | Icon | Action |
|--------|------|--------|
| Share | Share2 | Copy blog post URL to clipboard |

### `/` (Home)

No page tools. Home has its own inline CTAs.

### Other pages

Pages not listed above show no page tools row. The Navigate section (Search, Guide, Me) and music player are always available in the panel.

---

## "More" Panel: Full Layout

When you tap "More," the panel slides up. Sections from top to bottom:

```
+------------------------------------------+
|  PAGE TOOLS (changes per page)           |
|  [ icon ] [ icon ] [ icon ] [ icon ]     |
+------------------------------------------+
|  NAVIGATE                                |
|  [ <- Back ] [ Search ] [ Guide ] [ Me ] |
+------------------------------------------+
|  NOW PLAYING                             |
|  Song title          2:31 / 4:12         |
|  =========o========================      |
|       <<    >>    ||     vol ====        |
+------------------------------------------+
|  14 online                    fire 3     |
+------------------------------------------+
```

- **Back** in Navigate row only shows on sub-pages
- **Search** opens the CommandPalette (Ctrl+K)
- **Guide** opens the ReGen Guide chat
- **Me** navigates to `/profile`

---

## Desktop: Two-Tier Bar

On `md:` and up, page tools render as a row above the main bar. No need to tap "More."

```
Desktop (Quest page example):
+----------------------------------------------------------+
|  Progress  |  Badges  |  Field  |  Calculator  |  Guide  |
+----------------------------------------------------------+
|  Quests   |  Community  |  Apply  |  Music  |    More    |
+----------------------------------------------------------+
```

Mobile: everything in the "More" panel.

---

## How to Update This Doc

1. Change any row in the tables above
2. Claude Code reads this file and implements the `usePageTools` hook from it
3. The hook returns the tool array for each page based on the tables
4. To add a tool: add a row to the page's table
5. To remove a tool: delete the row
6. To add tools for a new page: add a new section with the page path and a table

---

## Changelog

- **2026-03-26:** Initial design. Replaced "Propose" on /quest with "Calculator." Added /crowd-pooling-projects page with "Pool Info" as primary button. Created living doc format.

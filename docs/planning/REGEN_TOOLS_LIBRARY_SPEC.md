# Regen Civilization Tools Library - Full Spec

**Status:** Design spec, ready for implementation
**Location:** `/tools` (new page) + embedded throughout quests and seasons

---

## What It Is

A curated, AI-searchable library of tools that regenerative communities use. Gitcoin, Hypha, Localscale, Hylo, and whatever comes next. People show up, describe their problem, and the AI suggests tools from the library. Tool creators submit their tools through a form that auto-fills from their website.

## The AI Pre-Fill Form (Tool Submission)

When someone submits a tool, they paste their website URL and the system does the work.

### Step 1: URL Input

Simple field. "Paste your tool's website URL."

### Step 2: AI Auto-Analysis

On URL submit, the backend:

1. **Fetches the page** (server-side, using a headless fetch or scraping service)
2. **Finds the logo** - looks for `<link rel="icon">`, `<meta property="og:image">`, SVG logos in header, or the most prominent image. Offers it as the card image.
3. **Extracts a summary** - pulls `<meta name="description">`, `<meta property="og:description">`, or the first meaningful paragraph. AI rewrites it into a 2-sentence summary in plain language (no marketing speak).
4. **Detects categories** - AI reads the page and suggests which problem categories the tool fits: Governance, Finance, Community, Food Systems, Legal, Education, Communication, Land Management, Currency, Coordination, Identity, Impact Measurement
5. **Finds pricing info** - free, freemium, paid, open source
6. **Detects regions** - if the tool mentions specific countries or "global"

### Step 3: Review and Edit

The form presents all pre-filled fields. Every field is editable. The submitter can:

- Replace the logo with their own upload
- Upload a custom background/hero image for their card
- Edit the summary
- Add/remove categories
- Add problem statements the tool solves (free text, these feed the AI matcher)
- Add integration notes (what other tools it works with)
- Add a "Getting Started" URL (onboarding page, docs, etc.)

### Step 4: Submit for Review

Tools go into a moderation queue. Admin approves, edits, or rejects. On approval the card goes live in the library.

### Form Fields (complete list)

| Field | Source | Editable |
|---|---|---|
| Tool name | og:title or page title | Yes |
| Website URL | User input | Yes |
| Logo image | Auto-detected from site | Yes (re-upload) |
| Card background image | og:image or hero image | Yes (re-upload) |
| Short summary (2 sentences) | AI-generated from page content | Yes |
| Long description | AI-generated, more detailed | Yes |
| Categories (multi-select) | AI-detected | Yes |
| Problem statements | Empty (user fills) | Yes |
| Pricing model | AI-detected | Yes |
| Regions/jurisdictions | AI-detected or "Global" | Yes |
| Getting started URL | Auto-detected /docs or /start page | Yes |
| Integrations | Empty (user fills) | Yes |
| Team contact email | Empty (user fills) | Yes |
| Open source? (yes/no) | AI-detected from GitHub link | Yes |

---

## Library Page (`/tools`)

### Layout

Top: search bar + AI problem matcher
Below: filterable grid of tool cards

### AI Problem Matcher

A text box at the top: "Describe what you're trying to do and we'll suggest tools that can help."

Examples:
- "We need a way for our community to make decisions together"
- "We want to create a local currency for our food system"
- "We need to track our environmental impact"

The AI reads the input against all tool problem statements, categories, and descriptions. Returns ranked results with a 1-sentence explanation of why each tool fits.

If the user also provides a perceived solution ("I think we need a DAO"), the AI can confirm that direction AND suggest alternatives they might not have considered.

### Tool Cards

Each card shows:
- Logo
- Tool name
- 2-sentence summary
- Category tags (colored pills)
- Pricing badge (free / freemium / paid / open source)
- Click count badge (only shows when 100+ clicks, displays "100+ community clicks" or "500+" etc.)
- "Explore" button (links to tool website, tracks the click)

### Filters

- Category dropdown (multi-select)
- Pricing (free / paid / all)
- Region
- Sort: Most clicked, Newest, Alphabetical

---

## Click Tracking

Every "Explore" click gets tracked in the database.

```sql
CREATE TABLE toolClicks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  toolId INT NOT NULL,
  userId INT,              -- nullable for anonymous clicks
  clickedAt TIMESTAMP DEFAULT NOW(),
  referrer VARCHAR(255),   -- which page they clicked from (quest, library, season)
  FOREIGN KEY (toolId) REFERENCES regenTools(id)
);
```

The click count badge on the card only appears at 100+. Thresholds:
- 100+ clicks: show "100+ explorers"
- 500+ clicks: show "500+ explorers"
- 1000+ clicks: show "1K+ explorers"

---

## Database Schema

```sql
CREATE TABLE regenTools (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  websiteUrl VARCHAR(500) NOT NULL,
  logoUrl VARCHAR(500),
  cardImageUrl VARCHAR(500),
  shortSummary TEXT,
  longDescription TEXT,
  pricingModel ENUM('free', 'freemium', 'paid', 'open_source') DEFAULT 'free',
  gettingStartedUrl VARCHAR(500),
  contactEmail VARCHAR(255),
  isOpenSource BOOLEAN DEFAULT FALSE,
  regions JSON,             -- ["Global"] or ["Costa Rica", "Portugal"]
  integrations JSON,        -- ["Hypha", "Gitcoin"]
  problemStatements JSON,   -- ["We need community governance", "DAO tooling"]
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  submittedBy INT,
  approvedBy INT,
  totalClicks INT DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (submittedBy) REFERENCES users(id),
  FOREIGN KEY (approvedBy) REFERENCES users(id)
);

CREATE TABLE regenToolCategories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(7),        -- hex color for the pill
  icon VARCHAR(50)         -- lucide icon name
);

CREATE TABLE regenToolCategoryMap (
  toolId INT NOT NULL,
  categoryId INT NOT NULL,
  PRIMARY KEY (toolId, categoryId),
  FOREIGN KEY (toolId) REFERENCES regenTools(id),
  FOREIGN KEY (categoryId) REFERENCES regenToolCategories(id)
);
```

### Seed Categories

| Category | Color | Icon |
|---|---|---|
| Governance | #8b5cf6 (purple) | Vote |
| Finance | #f59e0b (amber) | Coins |
| Community | #7dd87d (green) | Users |
| Food Systems | #22c55e (emerald) | Leaf |
| Legal | #64748b (slate) | Scale |
| Education | #3b82f6 (blue) | GraduationCap |
| Communication | #06b6d4 (cyan) | MessageCircle |
| Land Management | #a3734c (brown) | MapPin |
| Currency | #eab308 (yellow) | DollarSign |
| Coordination | #ec4899 (pink) | Network |
| Identity | #14b8a6 (teal) | Shield |
| Impact Measurement | #f97316 (orange) | Target |

---

## Game Integration (10 ways it weaves into the system)

### 1. Quest-Gated Tool Discovery

Specific quests introduce specific tools. "Set up your community governance on Hypha" is a quest. Completing it earns tokens AND adds a verified "I've used this" endorsement to the tool card. The library fills with real experience, not just browsing.

**Implementation:** Add a `toolId` field to quest definitions. When a quest with a linked tool is completed, auto-create an endorsement record.

### 2. Problem-First AI Matching with Game Context

The AI matcher knows your role (Investor, Land Project, Alliance, Player) and quest progress. A land project in Phase 1 gets different suggestions than a player who's completed 20 quests.

**Implementation:** Pass `userProfile.path` and quest completion count to the AI matching prompt. Weight results by role relevance.

### 3. Alliance Partner Pipeline

Tool submission is the front door to becoming an Alliance Partner. If a tool gets enough endorsements and click-throughs, the team gets an invitation to apply for Alliance status.

**Implementation:** When `totalClicks >= 200` AND `endorsements >= 10`, trigger an admin notification: "Tool X may be ready for Alliance consideration."

### 4. Seasonal Tool Spotlights

Each season features 3-5 tools tied to that season's theme. Tool creators get invited to forum AMAs, their tools get pinned in quest threads.

**Implementation:** Add `seasonSpotlight` field to regenTools table. Render "Season 2 Featured" badge on cards. Create a "Seasonal Tools" section on the `/seasons` page.

### 5. Community Case Studies Auto-Linked

When someone mentions a tool name in a forum post or quest reflection, the system detects it and links bidirectionally: the forum post appears on the tool card as a "community story," and the tool gets a mention badge in the post.

**Implementation:** On forum post save, scan body for tool names (fuzzy match). Create `regenToolMentions` junction table. Show "Community Stories" section on tool detail page.

### 6. Contribution Compass Credit

Sharing a tool through the library counts as a contribution in the "Resource Sharing" spoke of the contribution compass. Players who consistently surface good tools build reputation as connectors.

**Implementation:** When a user clicks "Recommend this tool" or shares it from the library, log a contribution event of type `resource_sharing`.

### 7. Bioregional Relevance Filters

Tools aren't equally useful everywhere. Legal governance tools vary by jurisdiction. Let tool creators tag regions, and let the matcher weight results by the user's bioregion.

**Implementation:** Use the `regions` JSON field. If a user's profile has a bioregion set, boost matching tools for that region.

### 8. Tool Health Dashboard

Beyond clicks: when was the tool last updated? Is the team responsive to community questions? Show "active / stable / stale" indicator.

**Implementation:** Track last forum reply by tool contact, last update to tool record. Calculate health score. Display on card.

### 9. Stack Recommendations

Most problems need multiple tools. Governance (Hypha) + currency (Localscale) + community (Hylo) + funding (Gitcoin). The AI suggests tool stacks with a one-click "adopt this stack" that queues relevant quests.

**Implementation:** Add a `regenToolStacks` table with predefined combinations. The AI matcher can suggest stacks when the problem is broad. "Adopt stack" creates a personal quest chain.

### 10. Tool Creator Quests

Tool creators complete quests too: "Write a 3-minute setup guide," "Record a demo for land projects," "Answer 5 community questions." Earns tokens and visibility.

**Implementation:** Create a "Tool Creator" quest chain in the Welcome Aboard series. Link to the tool submission form. Completing all quests gives the tool a "Verified Creator" badge.

---

## Pages and Routes

| Route | What |
|---|---|
| `/tools` | Library browse + AI matcher |
| `/tools/:slug` | Tool detail page (full description, community stories, endorsements) |
| `/tools/submit` | Tool submission form with AI pre-fill |
| `/admin/tools` | Moderation queue for pending submissions |

---

## Integration Points Across the Site

- **Quest pages** - relevant tool cards embedded as "Tools for this Quest"
- **Season pages** - "Featured Tools This Season" section
- **Economy page** - tools linked as "Build it with these tools"
- **Community forum** - auto-detected tool mentions get linked
- **Player profiles** - "Tools I've endorsed" section on contribution compass
- **Land Project profiles** - "Tools we use" section
- **Alliance Partner pages** - if the partner submitted a tool, link it
- **Crowd Pooling** - project pages can list "Tools this project uses"

---

## Initial Seed Tools

| Tool | Website | Categories |
|---|---|---|
| Gitcoin | gitcoin.co | Finance, Coordination |
| Hypha | hypha.earth | Governance, Coordination |
| Localscale | localscale.org | Currency, Food Systems |
| Hylo | hylo.com | Community, Communication |
| BioFi (BFF) | biofi.earth | Finance, Land Management |

---

## Implementation Priority

**Phase 1 (Earth Day launch):**
- `/tools` page with static seed tools (5 cards, hand-coded data)
- Click tracking
- AI problem matcher (prompt-based, no vector DB needed yet)

**Phase 2 (post-launch):**
- Tool submission form with AI pre-fill
- Admin moderation queue
- Database-driven tool cards

**Phase 3 (season integration):**
- Quest linking
- Seasonal spotlights
- Community story auto-detection
- Stack recommendations
- Contribution compass integration

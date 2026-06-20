# Multiplayer Quests / Plays: Feature Spec

**Date:** 2026-06-19
**Status:** DRAFT (iterate before building)
**Route:** `/plays`, `/plays/submit`, `/plays/:slug`
**Pattern:** Mirrors the Tools Library (`/tools`) flow

---

## What is a Play?

A Play is a packaged culture. It captures everything a land project or community needs to run its own version of a regenerative game: governance model, economic design, conflict resolution, roles, seasonal curriculum, relationship to land, and the social agreements that hold it together.

Think of it like a franchise model, except regenerative. A project that has figured out how to govern itself, feed its people, resolve disputes, and steward land can package that knowledge as a Play. Other projects can then adopt it wholesale, remix parts of it, or study it as a reference.

Some Plays are offered open source to the commons. The creator earns $ReGen tokens when their Play gets adopted. Others are offered for sale, where the creator sets their own price and the community can't buy them off you. You keep the IP. Both models coexist.

The most successful Plays are the ones where all human and non-human needs are met.

---

## What goes into a Play?

Every Play follows a standardized format so that any project can compare, evaluate, and adopt Plays consistently. The sections below map directly to the 13-episode incubator curriculum and the 8 circles that the seasonal roles cover.

### The 14 Sections of a Play

These are the building blocks. A Play must address all 14, even if some are marked "not yet designed" by the creator. This mirrors what we teach across a season.

**1. Identity and Origin**
- Name of the Play
- Creator project / community
- Location, bioregion, land type, scale
- Founding story: how did this culture emerge?
- Who is this Play designed for? (ecovillage, urban community, land trust, cooperative, DAO, etc.)

**2. Governance Model** (Episodes 3-4: DAO/DHO/Org Co-Creation)
- Decision-making process (consensus, consent, majority, liquid democracy, council, etc.)
- Leadership structure (elected, rotating, distributed, stewardship council, etc.)
- How proposals are made, debated, and resolved
- How governance evolves over time (amendment process)
- Relationship to external legal/political structures

**3. Economic Design** (Episodes 5, 8-9: Game Guides, Tokenomics)
- Currency model: what tokens, currencies, or exchange systems are used?
- Revenue and income sources
- How resources are pooled and distributed
- Compensation philosophy (bands, equal pay, needs-based, contribution-weighted)
- Relationship to fiat / external economies
- Minimum viable economy: what does it take for this Play to sustain its people?

**4. Legal Structure** (Episodes 10-11: Legal Structures)
- Entity type (cooperative, LLC, DAO, land trust, association, foundation, etc.)
- Land ownership model (private, communal, trust, lease, commons)
- Relationship to nation-state regulations
- Compliance approach
- Member agreements, contracts, liability

**5. Roles and Circles** (Season 1 role structure)
- What roles exist and what do they do?
- How are roles assigned, rotated, or earned?
- Circle/working group structure
- Compensation for roles (if any)
- How new roles are created or old roles retired

**6. Seasonal Rhythm** (Season structure + Schedule episodes)
- How long is a season? (quarterly, solstice-aligned, lunar, annual, custom)
- What happens each season? (curriculum, gatherings, ceremonies, harvests)
- How does the community reflect and course-correct between seasons?
- Open access / community gathering cadence
- Season ceremonies or festivals

**7. Land and Ecology** (Incubator core focus)
- Relationship to the land the community stewards
- Ecological practices (permaculture, agroforestry, restoration, conservation, rewilding)
- Food systems (gardens, CSA, food forest, cooperative kitchen, etc.)
- Water, waste, energy systems
- How non-human needs are met (wildlife corridors, habitat, no-go zones)

**8. Community Agreements** (Community Agreements feature)
- Social agreements / community guidelines
- How agreements are proposed, voted on, and ratified
- Code of conduct
- What behaviors are celebrated vs. what leads to accountability processes

**9. Conflict Resolution and Justice** (Episode 7: Ecosystem Map and Policies)
- How disputes between members are handled
- Mediation, restorative justice, or other processes
- Accountability mechanisms
- Escalation path (internal resolution, third-party mediation, community vote, exit)
- How harm is repaired

**10. Health and Wellbeing**
- Physical health systems (clinic, herbalism, fitness, nutrition)
- Mental health support (therapy, peer support, talking circles)
- Spiritual/ceremonial practices (optional, described if present)
- How burnout and overwork are addressed
- Relationship to death, aging, birth

**11. Education and Knowledge** (Episode 2: Incubator Overview + ongoing learning)
- How the community learns together
- Mentorship structures
- Onboarding for new members (what do they learn first?)
- Knowledge commons (shared documents, libraries, recorded sessions)
- How children learn (if applicable)

**12. Culture and Social Life**
- Arts, music, storytelling, celebration
- How the community builds social bonds
- Events, festivals, rituals
- Communication norms (how people talk to each other day-to-day)
- Relationship to broader culture and media

**13. External Relations and Alliances** (Episode 6: DHO + Alliance structure)
- How the community relates to neighboring communities
- Alliance partnerships and networks
- Relationship to the broader regenerative movement
- How visitors, guests, and new members are welcomed
- Inter-community resource sharing

**14. Scaling and Evolution** (Episode 12: Coordination + Episode 13: Season Overview)
- How does this Play adapt as the community grows?
- Fractal scaling model (can it work at 10 people? 100? 1000?)
- Version history: how has the Play changed over time?
- What would you do differently if starting over?
- How does the community decide to fork, merge, or sunset its Play?

---

## Page Architecture

### 1. Plays Library (`/plays`)

Mirrors `/tools`. Three main zones:

**Hero Section:**
- Title: "Plays"
- Subtitle: "A Play is a packaged culture. Every community runs its own game. The best ones get shared."
- Visual: same dark green gradient as Tools

**Featured Plays Section ("Plays we play"):**
- Hardcoded showcase of 2-3 reference Plays (like "Tools we use" on the Tools page)
- The ReGen Civics Play itself as the first featured entry
- Example community plays as they come in

**Browse Section:**
- Filter bar with category pills:
  - All
  - Ecovillage
  - Urban Community
  - Land Trust
  - Cooperative
  - DAO
  - Network
  - Bioregion
- Dropdown filters:
  - Pricing: Free / Open Source / Paid
  - Scale: Small (< 20) / Medium (20-100) / Large (100+)
  - Sort: Popular / Newest / A-Z
- "Submit a Play" button (links to `/plays/submit`)
- Card grid (same layout as Tools):
  - Card image (project photo or generated art)
  - Play name
  - Creator project name
  - Pricing badge (Free / Open Source / $X)
  - One-line summary (3-line clamp)
  - Category pills (max 3)
  - Footer: adoption count, view count

**AI Play Matcher (stretch goal):**
- "Describe Your Community" textarea
- "Find Plays" button that calls an LLM to match community needs to existing Plays
- Same pattern as the AI Problem Matcher on the Tools page

### 2. Play Detail (`/plays/:slug`)

Full play page. Two-column layout on desktop: content left, sidebar right.

**Sidebar (sticky):**
- Play image
- Creator name + link to their profile/project
- Pricing: "Open Source" badge or price + payment button
- "Adopt this Play" CTA button
- Adoption count
- Endorsement count
- "Download Play Document" button (.md or .pdf export)
- Category tags
- Scale badge
- External links (creator website, forum thread)

**Main Content:**
- Play name (h1)
- Creator byline + avatar
- One-paragraph summary
- **14 collapsible sections**, one per Play section (see "The 14 Sections" above)
  - Each section header shows: section name, completion indicator (filled / partial / empty)
  - Each section body shows the creator's content for that section
  - Sections that are "not yet designed" show a placeholder with an honest note
- **Community Endorsements** section at the bottom (same pattern as Tool endorsements)
- **Forum Discussion** link (auto-created thread in a plays category)

### 3. Play Submission (`/plays/submit`)

Multi-step wizard (mirrors `/tools/submit` but with more steps):

**Step 1: Start**
- "Upload your play document or paste a URL" input
- Accepts: .md, .pdf, .docx, .txt, or a URL to a Google Doc / website
- "Analyze" button calls the AI to parse the document and extract sections
- Or: "Start from scratch" button to fill in manually

**Step 2: AI Analysis / Manual Entry**
- If AI-analyzed: shows pre-filled sections with extracted content, editable
- If manual: 14 section fields, each with a text area and helper text
- Section completion indicator (filled / partial / empty)

**Step 3: Metadata**
- Play name
- One-line summary
- Creator project name
- Categories (toggle pills, multi-select)
- Scale (radio: Small / Medium / Large)
- Pricing model (radio: Open Source / Free / Paid)
  - If Paid: price field + payment method
    - "$ReGen tokens" checkbox + token amount
    - "External payment" checkbox + payment URL
    - Can select both
- Cover image upload (FileUpload component)

**Step 4: Review and Submit**
- Preview card (how it will look in the library)
- Section completeness summary
- Submit button (status = pending, goes to admin moderation)
- Auto-creates a forum thread in a `plays` category

**Step 5: Success**
- Confirmation with "Browse Plays" / "Submit Another" buttons
- Note: "Your Play is pending review. We'll notify you when it's live."

### 4. Claude Code Prompt Download

On both the submission page and the library hero section, a prominent download button:

**"Create Your Play with AI"** button

Downloads a `.md` file that is a self-contained Claude Code prompt. When a project opens this file and gives it to Claude Code along with their own documents, Claude Code:

1. Asks what documents, websites, or notes the project has
2. Reads and analyzes everything provided
3. Extracts relevant information into each of the 14 Play sections
4. Identifies gaps ("I didn't find anything about your conflict resolution process. Here are some questions to help you define one.")
5. Outputs two files:
   - `[project-name]-play.md`: A rich, readable play document the project keeps as their own reference
   - `[project-name]-play-upload.json`: A structured file matching the site's upload schema, ready to paste into the submission form or upload directly

The prompt is designed to be general enough to digest any format: Google Docs, PDFs, websites, scattered notes, even voice transcripts. The AI standardizes everything into the 14-section format.

---

## Database Schema

### New tables (mirror the Tools pattern)

```sql
CREATE TABLE plays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  creatorProjectName VARCHAR(300),
  creatorUserId INT,
  summary TEXT,
  coverImageUrl VARCHAR(500),
  websiteUrl VARCHAR(500),

  /* Pricing */
  pricingModel ENUM('free', 'open_source', 'paid') DEFAULT 'open_source',
  priceRegenTokens INT DEFAULT NULL,
  externalPaymentUrl VARCHAR(500) DEFAULT NULL,
  externalPriceLabel VARCHAR(100) DEFAULT NULL,

  /* Classification */
  scale ENUM('small', 'medium', 'large') DEFAULT 'medium',
  communityType VARCHAR(100),

  /* The 14 sections stored as JSON (each section is a text blob) */
  sectionIdentity TEXT,
  sectionGovernance TEXT,
  sectionEconomics TEXT,
  sectionLegal TEXT,
  sectionRoles TEXT,
  sectionSeasons TEXT,
  sectionLandEcology TEXT,
  sectionAgreements TEXT,
  sectionConflict TEXT,
  sectionHealth TEXT,
  sectionEducation TEXT,
  sectionCulture TEXT,
  sectionExternalRelations TEXT,
  sectionScaling TEXT,

  /* Meta */
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  submittedBy INT,
  approvedBy INT,
  totalViews INT DEFAULT 0,
  totalAdoptions INT DEFAULT 0,
  forumThreadId INT DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE play_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20),
  icon VARCHAR(50)
);

CREATE TABLE play_category_map (
  playId INT NOT NULL,
  categoryId INT NOT NULL,
  PRIMARY KEY (playId, categoryId)
);

CREATE TABLE play_endorsements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playId INT NOT NULL,
  userId INT NOT NULL,
  comment TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_endorsement (playId, userId)
);

CREATE TABLE play_adoptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playId INT NOT NULL,
  userId INT NOT NULL,
  projectName VARCHAR(300),
  notes TEXT,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE play_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  playId INT NOT NULL,
  userId INT DEFAULT NULL,
  referrer VARCHAR(500),
  viewedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

/* Seed categories */
INSERT INTO play_categories (name, slug, color, icon) VALUES
('Ecovillage', 'ecovillage', '#7dd87d', 'TreePine'),
('Urban Community', 'urban-community', '#87CEEB', 'Building2'),
('Land Trust', 'land-trust', '#DEB887', 'Mountain'),
('Cooperative', 'cooperative', '#FFB347', 'Handshake'),
('DAO', 'dao', '#9B59B6', 'Globe'),
('Network', 'network', '#3498DB', 'Network'),
('Bioregion', 'bioregion', '#2ECC71', 'MapPin');
```

### Token rewards for open source Plays

When a Play marked `open_source` gets adopted (someone clicks "Adopt this Play" and confirms), the creator earns $ReGen tokens. Use the existing `creditPrivateTokens` helper:

```ts
await db.creditPrivateTokens({
  userId: play.creatorUserId,
  tokenType: 'regen',
  amount: PLAY_ADOPTION_REWARD, // game_variable: plays.adoption_reward, default 500
  source: 'play_adoption',
  sourceRef: `play:${play.id}:adoption:${adoption.id}`,
  description: `Play "${play.name}" adopted by ${adopter.name}`,
});
```

Add a game_variable:
```sql
INSERT INTO game_variables (key_name, display_name, value, valueType, category, helpTip) VALUES
('plays.adoption_reward', 'Play Adoption Reward', '500', 'number', 'Plays', 'ReGen tokens earned when someone adopts your open source Play');
```

---

## tRPC Routes

Create `server/routes/plays.ts` with:

| Procedure | Access | Purpose |
|-----------|--------|---------|
| `list` | public | Filtered, paginated listing with category JOIN |
| `getBySlug` | public | Single play with endorsements + adoption count |
| `categories` | public | All categories with play counts |
| `trackView` | public | Increment view analytics |
| `submitPlay` | protected | User submission (status = pending) |
| `adopt` | protected | Record adoption, credit tokens to creator if open source |
| `endorse` | protected | Add endorsement comment |
| `analyzeDocument` | protected | AI analysis of uploaded doc/URL to extract 14 sections |
| `listPending` | admin | Moderation queue |
| `moderate` | admin | Approve/reject |

Wire into `server/routers.ts`:
```ts
import { playsRouter } from './routes/plays';
// Add to appRouter:
plays: playsRouter,
```

---

## The Claude Code Prompt File

This is the downloadable prompt that projects use to create their Play. It lives at `client/public/downloads/create-your-play-prompt.md` and is served as a static download.

The prompt is designed to:

1. **Ask first, extract second.** It starts by asking the user what they have: docs, websites, notes, recordings, or just ideas in their head. Then it reads everything provided.

2. **Be format-agnostic.** The prompt handles Google Docs, PDFs, markdown, plain text, website URLs, spreadsheets, or verbal descriptions pasted as text. It extracts the relevant pieces regardless of how the information is structured.

3. **Fill all 14 sections.** For each of the 14 Play sections, it:
   - Pulls relevant content from the provided materials
   - Rewrites it in clear, consistent language (no jargon, no AI-isms, no em-dashes)
   - Flags gaps where the project hasn't addressed something yet
   - Asks follow-up questions to fill gaps

4. **Output two files:**
   - `[name]-play.md`: A rich readable document the project keeps
   - `[name]-play-upload.json`: Structured data matching the site's submission schema

5. **Respect the voice.** The prompt follows ReGen Civics writing rules: no em-dashes, no AI-isms, no contrast-framing, direct and grounded.

### Prompt Content (Draft)

See the separate file: `PLAY_CREATION_PROMPT.md` (to be created alongside this spec).

---

## Nav Integration

Add to `client/src/components/Navigation.tsx`:

In the "Play the Game" dropdown, add "Plays" as a new link:
- Position: after "Explore Quests" (the highlighted item)
- Icon: `Gamepad2` or `Users` from lucide-react
- Label: "Plays"
- Link: `/plays`

---

## Forum Integration

Create a `plays` forum category:
```sql
INSERT INTO forumCategories (name, slug, description, icon, color, sortOrder)
VALUES ('Plays', 'plays', 'Discussion threads for community Plays', 'Gamepad2', '#9B59B6', 30);
```

Add `'plays'` to `SECTION_SLUGS` in Community.tsx so it doesn't appear in the General section.

When a Play is submitted, auto-create a forum thread in the `plays` category (same pattern as quest suggestions and tool submissions).

---

## Open Source vs Paid Flow

**Open Source Plays:**
- Full content visible to everyone
- "Adopt this Play" button is free
- Creator earns $ReGen tokens per adoption (game_variable controlled)
- Badge: green "Open Source" pill

**Paid Plays:**
- Summary and section headers visible to everyone
- Section content is truncated (first ~200 chars visible, rest behind paywall)
- "Adopt this Play" button shows the price
- Two payment paths available (creator chooses one or both):
  - **$ReGen tokens:** player pays from their private balance. Transfer handled server-side via `creditPrivateTokens` (debit from buyer, credit to creator).
  - **External payment:** player is redirected to the creator's payment URL (Stripe, PayPal, Gumroad, etc.). Creator manually approves access. We track the click but not the payment.
- After payment/adoption, the full content becomes visible
- Badge: amber "Paid" pill with price

**Free Plays:**
- Full content visible, no tokens earned
- For plays that are shared freely but the creator doesn't want to participate in the token economy
- Badge: blue "Free" pill

---

## ReGen Civics' Own Play

The first Play on the platform should be ReGen Civics itself. This serves as:
1. The reference implementation showing what a complete Play looks like
2. A teaching tool for new projects entering the incubator
3. Dogfooding: proving the format works

Content sources for the ReGen Civics Play:
- Season 1 role structure and curriculum
- REGEN_GAMES_SPEC_V1.md (game mechanics, quests, scoring, tiers)
- CITIZENSHIP_TIERS_SPEC.md (tier system)
- Community Agreements (the 6 ratified agreements)
- CONTEXT_THE_TWO_GAMES.md (Fund vs Game structure)
- SEEDS_VISION_IMPLEMENTATION_SPEC.md (economic vision)
- Governance page content
- Schedule page episode structure

This should be a hardcoded featured play ("Play we play") at the top of the library, similar to how the Tools page has "Tools we use."

---

## Pages and Files to Create

### New files:
- `client/src/pages/PlaysLibrary.tsx`
- `client/src/pages/PlayDetail.tsx`
- `client/src/pages/PlaySubmit.tsx`
- `server/routes/plays.ts`
- `client/public/downloads/create-your-play-prompt.md`
- `drizzle/0095_plays_tables.sql`
- `drizzle/0096_plays_seed_categories.sql`
- `drizzle/0097_plays_forum_category.sql`
- `drizzle/0098_plays_game_variable.sql`

### Modified files:
- `drizzle/schema.ts` (add plays tables)
- `server/routers.ts` (wire playsRouter)
- `client/src/App.tsx` (add routes)
- `client/src/components/Navigation.tsx` (add Plays to dropdown)
- `client/src/pages/Community.tsx` (add 'plays' to SECTION_SLUGS)

---

## What NOT to Do

- Do not rebuild the Tools page. Mirror its patterns, don't duplicate its code.
- Do not create a complex e-commerce system. Paid plays use simple token transfer or external link.
- Do not require all 14 sections to be complete for submission. Allow partial plays (with completion indicators).
- Do not gate viewing of open source plays behind auth. Only adoption, endorsement, and submission require auth.
- Do not enforce a single governance model or economic system. The format is a container, not a prescription.

---

## Done Criteria

- `/plays` shows a library of plays with filtering and sorting
- `/plays/:slug` shows a full play with 14 collapsible sections
- `/plays/submit` lets authenticated users submit a play (manual or AI-assisted)
- Open source plays earn creators $ReGen tokens on adoption
- Paid plays support both $ReGen token payment and external payment links
- AI document analyzer can parse uploaded docs into 14-section format
- Claude Code prompt file is downloadable from the page
- Forum thread auto-created on play submission
- Nav updated with Plays link
- `pnpm typecheck` passes

---

## Handoff Breakdown: Who Does What

### CLAUDE CODE (autonomous)

- Create all migration SQL files
- Create Drizzle schema additions
- Create tRPC routes
- Create all three page components
- Wire up routes in App.tsx
- Update Navigation.tsx
- Update Community.tsx SECTION_SLUGS
- Create the Claude Code prompt download file
- Run ship gate (typecheck + truncation audit)

### RYE (human required)

- Run migrations 0095-0098 in Railway
- Review and iterate on this spec before Claude Code builds
- Write the ReGen Civics Play content (or point Claude at the right docs to generate it)
- Upload cover images for the ReGen Civics featured play
- Review the downloadable Claude Code prompt
- Decide whether to add an "AI Play Matcher" (stretch goal, can ship without it)

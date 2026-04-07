# Regen Civilization Tools Library - Claude Code Build Spec
# Execution Prompt - 2026-04-02

**Read first:** `REGEN_TOOLS_LIBRARY_SPEC.md` for the full design spec.
**Target:** Earth Day launch (April 22, 2026)

---

## Overview

Build the Regen Civilization Tools Library: an AI-searchable directory of tools for regenerative communities. Users describe problems, AI suggests tools. Tool creators submit their tool's URL and the system auto-fills the card from their website. Click tracking with badges at 100+. Woven into quests, seasons, and the Harvest economy.

This covers all physical and digital tools of the regenerative renaissance: software platforms, 3D printing technology, construction methods, governance frameworks, currency systems, food systems, and anything else a regenerative community uses.

---

## Build Order

1. Database schema + migration
2. tRPC router (CRUD + AI matching + click tracking)
3. `/tools` page (browse + AI matcher + filters)
4. `/tools/:slug` detail page
5. `/tools/submit` form with AI pre-fill
6. Admin moderation at `/admin/tools`
7. Navigation: add to "Play the Game" dropdown
8. Ally page: add featured Tools Library card
9. Integration touchpoints (quests, seasons, forum auto-detection)

---

## Step 1: Database Schema

Create a new Drizzle migration. Add these tables:

```typescript
// In shared/schema.ts or wherever tables are defined

import { mysqlTable, int, varchar, text, boolean, timestamp, json, mysqlEnum } from "drizzle-orm/mysql-core";

export const regenToolCategories = mysqlTable("regen_tool_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  color: varchar("color", { length: 7 }),     // hex color for pill
  icon: varchar("icon", { length: 50 }),       // lucide icon name
  createdAt: timestamp("created_at").defaultNow(),
});

export const regenTools = mysqlTable("regen_tools", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  websiteUrl: varchar("website_url", { length: 500 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  cardImageUrl: varchar("card_image_url", { length: 500 }),
  shortSummary: text("short_summary"),
  longDescription: text("long_description"),
  pricingModel: mysqlEnum("pricing_model", ["free", "freemium", "paid", "open_source"]).default("free"),
  gettingStartedUrl: varchar("getting_started_url", { length: 500 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  isOpenSource: boolean("is_open_source").default(false),
  isPhysical: boolean("is_physical").default(false),   // physical tools (3D printers, construction tech)
  regions: json("regions").$type<string[]>(),
  integrations: json("integrations").$type<string[]>(),
  problemStatements: json("problem_statements").$type<string[]>(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending"),
  submittedBy: int("submitted_by").references(() => users.id),
  approvedBy: int("approved_by").references(() => users.id),
  totalClicks: int("total_clicks").default(0),
  seasonSpotlight: int("season_spotlight"),  // season number if featured
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const regenToolCategoryMap = mysqlTable("regen_tool_category_map", {
  toolId: int("tool_id").notNull().references(() => regenTools.id),
  categoryId: int("category_id").notNull().references(() => regenToolCategories.id),
});

export const regenToolClicks = mysqlTable("regen_tool_clicks", {
  id: int("id").autoincrement().primaryKey(),
  toolId: int("tool_id").notNull().references(() => regenTools.id),
  userId: int("user_id").references(() => users.id),
  referrer: varchar("referrer", { length: 255 }),  // "library", "quest-3", "season-2", "ally-page"
  clickedAt: timestamp("clicked_at").defaultNow(),
});

export const regenToolEndorsements = mysqlTable("regen_tool_endorsements", {
  id: int("id").autoincrement().primaryKey(),
  toolId: int("tool_id").notNull().references(() => regenTools.id),
  userId: int("user_id").notNull().references(() => users.id),
  questId: int("quest_id"),                         // if earned through quest completion
  comment: text("comment"),                          // optional "how I use this"
  createdAt: timestamp("created_at").defaultNow(),
});

export const regenToolMentions = mysqlTable("regen_tool_mentions", {
  id: int("id").autoincrement().primaryKey(),
  toolId: int("tool_id").notNull().references(() => regenTools.id),
  postId: int("post_id").references(() => forumPosts.id),
  detectedAt: timestamp("detected_at").defaultNow(),
});
```

Run `npx drizzle-kit generate` after adding these.

### Seed Categories

Create `scripts/seed-tool-categories.ts`:

```typescript
import mysql from "mysql2/promise";

const categories = [
  { name: "Governance", slug: "governance", color: "#8b5cf6", icon: "Vote" },
  { name: "Finance", slug: "finance", color: "#f59e0b", icon: "Coins" },
  { name: "Community", slug: "community", color: "#7dd87d", icon: "Users" },
  { name: "Food Systems", slug: "food-systems", color: "#22c55e", icon: "Leaf" },
  { name: "Legal", slug: "legal", color: "#64748b", icon: "Scale" },
  { name: "Education", slug: "education", color: "#3b82f6", icon: "GraduationCap" },
  { name: "Communication", slug: "communication", color: "#06b6d4", icon: "MessageCircle" },
  { name: "Land Management", slug: "land-management", color: "#a3734c", icon: "MapPin" },
  { name: "Currency", slug: "currency", color: "#eab308", icon: "DollarSign" },
  { name: "Coordination", slug: "coordination", color: "#ec4899", icon: "Network" },
  { name: "Identity", slug: "identity", color: "#14b8a6", icon: "Shield" },
  { name: "Impact Measurement", slug: "impact-measurement", color: "#f97316", icon: "Target" },
  { name: "Construction", slug: "construction", color: "#78716c", icon: "Building" },
  { name: "Energy", slug: "energy", color: "#facc15", icon: "Zap" },
  { name: "Agriculture", slug: "agriculture", color: "#84cc16", icon: "Sprout" },
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  for (const cat of categories) {
    await conn.execute(
      `INSERT IGNORE INTO regen_tool_categories (name, slug, color, icon) VALUES (?, ?, ?, ?)`,
      [cat.name, cat.slug, cat.color, cat.icon]
    );
    console.log(`Seeded category: ${cat.name}`);
  }
  await conn.end();
}
main();
```

### Seed Initial Tools

Create `scripts/seed-tools.ts` with 5 starter tools:

```typescript
const tools = [
  {
    name: "Gitcoin",
    slug: "gitcoin",
    websiteUrl: "https://gitcoin.co",
    logoUrl: "/images/tools/gitcoin-logo.png",
    shortSummary: "Fund public goods and open-source projects through quadratic funding rounds. Communities pool resources and algorithms amplify small contributions.",
    pricingModel: "free",
    isOpenSource: true,
    isPhysical: false,
    regions: ["Global"],
    problemStatements: [
      "We need to fund community projects fairly",
      "We want democratic funding allocation",
      "We need quadratic funding for public goods"
    ],
    categories: ["finance", "coordination"],
  },
  {
    name: "Hypha",
    slug: "hypha",
    websiteUrl: "https://hypha.earth",
    logoUrl: "/images/tools/hypha-logo.png",
    shortSummary: "DAO-based organizational infrastructure for purpose-driven communities. Create proposals, manage roles, handle compensation, and make decisions together.",
    pricingModel: "freemium",
    isOpenSource: true,
    isPhysical: false,
    regions: ["Global"],
    problemStatements: [
      "We need a way for our community to make decisions together",
      "We want transparent governance",
      "We need DAO tooling for our organization"
    ],
    categories: ["governance", "coordination"],
  },
  {
    name: "Localscale",
    slug: "localscale",
    websiteUrl: "https://localscale.org",
    logoUrl: "/images/tools/localscale-logo.png",
    shortSummary: "Build local economic systems with community currencies, marketplace tools, and mutual credit networks. Designed for bioregional food economies.",
    pricingModel: "freemium",
    isOpenSource: false,
    isPhysical: false,
    regions: ["Global"],
    problemStatements: [
      "We want to create a local currency for our food system",
      "We need community marketplace infrastructure",
      "We want mutual credit for our bioregion"
    ],
    categories: ["currency", "food-systems"],
  },
  {
    name: "Hylo",
    slug: "hylo",
    websiteUrl: "https://hylo.com",
    logoUrl: "/images/tools/hylo-logo.png",
    shortSummary: "Community coordination platform connecting people, projects, and groups. Share resources, organize events, coordinate actions across communities.",
    pricingModel: "free",
    isOpenSource: true,
    isPhysical: false,
    regions: ["Global"],
    problemStatements: [
      "We need a community platform for our network",
      "We want to connect groups across bioregions",
      "We need resource sharing coordination"
    ],
    categories: ["community", "communication"],
  },
  {
    name: "BioFi (BFF)",
    slug: "biofi",
    websiteUrl: "https://www.biofi.earth/",
    logoUrl: "/images/tools/biofi-logo.png",
    shortSummary: "Design and implement Bioregional Financing Facilities that connect financial resources to regenerators. Place-based finance for planetary regeneration.",
    pricingModel: "free",
    isOpenSource: false,
    isPhysical: false,
    regions: ["Global"],
    problemStatements: [
      "We need bioregional finance infrastructure",
      "We want to connect funders to regenerative projects",
      "We need place-based financing models"
    ],
    categories: ["finance", "land-management"],
  },
];
```

Write the full seed script that inserts tools and maps their categories. Idempotent (check slug before insert).

---

## Step 2: tRPC Router

Create `server/routes/tools.ts`:

### Public procedures:

**`list`** - paginated, filterable tool listing
- Params: `{ categorySlug?, pricingModel?, region?, sort: "clicks" | "newest" | "alpha", page, limit }`
- Returns: tools with their categories and click counts
- Only returns `status: "approved"` tools

**`getBySlug`** - single tool detail
- Params: `{ slug: string }`
- Returns: tool with categories, endorsements, mentions, click count

**`categories`** - all categories
- Returns: list of categories with tool counts

**`trackClick`** - log a click (public, works for anonymous)
- Params: `{ toolId: number, referrer?: string }`
- Increments `totalClicks` on the tool and inserts into `regenToolClicks`

**`aiMatch`** - AI problem matcher
- Params: `{ problem: string, userPath?: string, questCount?: number }`
- Implementation: Build a prompt that includes all approved tools (name, summary, categories, problemStatements). Send to OpenAI/Anthropic API. Return ranked results with 1-sentence explanations.
- Use existing AI infrastructure if available, otherwise call the Claude API directly.

### Protected procedures (logged-in users):

**`submit`** - submit a new tool
- Params: full tool fields
- Sets `status: "pending"`, `submittedBy: user.id`

**`endorse`** - endorse a tool
- Params: `{ toolId: number, comment?: string, questId?: number }`
- One endorsement per user per tool

**`analyzeUrl`** - AI pre-fill from website URL
- Params: `{ url: string }`
- Server-side: fetch the page, extract meta tags, AI-analyze content
- Returns: `{ name, summary, logoUrl, cardImageUrl, categories, pricingModel, regions, gettingStartedUrl, isOpenSource }`
- Implementation details below

### Admin procedures:

**`moderate`** - approve/reject pending tools
- Params: `{ toolId: number, action: "approve" | "reject" }`

**`listPending`** - get pending submissions

**`updateTool`** - edit any tool field

### AI Pre-Fill Implementation (`analyzeUrl`)

```typescript
async function analyzeUrl(url: string) {
  // 1. Fetch the page (server-side)
  const response = await fetch(url, {
    headers: { "User-Agent": "ReGenCivicsBot/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  const html = await response.text();

  // 2. Extract meta tags
  const getMetaContent = (name: string) => {
    const match = html.match(new RegExp(`<meta[^>]*(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"))
      || html.match(new RegExp(`content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, "i"));
    return match?.[1] || "";
  };

  const title = getMetaContent("og:title") || html.match(/<title>([^<]*)<\/title>/i)?.[1] || "";
  const description = getMetaContent("og:description") || getMetaContent("description") || "";
  const ogImage = getMetaContent("og:image") || "";

  // 3. Find logo - check common patterns
  const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']*)["']/i);
  const logoUrl = faviconMatch?.[1] || "";

  // 4. Detect getting started URL
  const docsMatch = html.match(/href=["']((?:https?:\/\/[^"']*)?\/(?:docs|getting-started|start|quickstart)[^"']*)["']/i);
  const gettingStartedUrl = docsMatch?.[1] || "";

  // 5. Detect GitHub link (open source indicator)
  const githubMatch = html.match(/href=["'](https:\/\/github\.com\/[^"']*)["']/i);
  const isOpenSource = !!githubMatch;

  // 6. AI analysis - send extracted text to Claude/GPT for categorization
  const pageText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 3000);

  const aiPrompt = `Analyze this tool/platform website for a regenerative community tools library.
Title: ${title}
Description: ${description}
Page text (first 3000 chars): ${pageText}

Return JSON with:
- shortSummary: 2 sentences, plain language, no marketing speak
- categories: array from [governance, finance, community, food-systems, legal, education, communication, land-management, currency, coordination, identity, impact-measurement, construction, energy, agriculture]
- pricingModel: one of [free, freemium, paid, open_source]
- regions: array of regions or ["Global"]
- isPhysical: boolean (true for physical tools like 3D printers, construction tech, farming equipment)`;

  // Call AI API and parse response
  // Use existing project AI infrastructure

  return {
    name: title.trim(),
    shortSummary: aiResult.shortSummary,
    logoUrl: resolveUrl(url, logoUrl),
    cardImageUrl: resolveUrl(url, ogImage),
    categories: aiResult.categories,
    pricingModel: aiResult.pricingModel,
    regions: aiResult.regions,
    gettingStartedUrl: resolveUrl(url, gettingStartedUrl),
    isOpenSource,
    isPhysical: aiResult.isPhysical,
  };
}

function resolveUrl(base: string, relative: string): string {
  if (!relative) return "";
  if (relative.startsWith("http")) return relative;
  try { return new URL(relative, base).href; } catch { return ""; }
}
```

---

## Step 3: `/tools` Page

Create `client/src/pages/ToolsLibrary.tsx`.

### Layout:

```
[Hero: "Regen Civilization Tools Library" + AI Problem Matcher]
[Filter bar: categories, pricing, physical/digital, sort]
[Grid of Tool Cards]
```

### Hero Section

```tsx
<section className="relative pt-24 pb-10 md:pt-32 md:pb-14 overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-b from-[#1a472a] via-[#2d5a3f] to-[#0d2818]" />
  <div className="container relative z-10 max-w-4xl mx-auto text-center px-4">
    <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-[#7dd87d]/20 border border-[#7dd87d]/30">
      <Wrench className="w-4 h-4 text-[#7dd87d]" />
      <span className="text-[#7dd87d] text-sm font-medium">Regen Civilization</span>
    </div>
    <h1 className="text-3xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-display)" }}>
      Tools Library
    </h1>
    <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto mb-8">
      Every tool the regenerative renaissance needs. Software, hardware, frameworks, and systems.
      Describe your challenge and we'll match you with tools that fit.
    </p>

    {/* AI Problem Matcher */}
    <div className="max-w-xl mx-auto">
      <div className="relative">
        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7dd87d]/60" />
        <textarea
          placeholder="Describe what you're trying to do... e.g. 'We need a way for our community to make decisions together'"
          className="w-full pl-12 pr-4 py-4 bg-black/30 border border-[#7dd87d]/30 rounded-xl text-white placeholder-white/40 resize-none h-20 focus:border-[#7dd87d] focus:ring-1 focus:ring-[#7dd87d]/30"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
        />
        <Button
          onClick={handleAiMatch}
          disabled={problem.length < 10 || isMatching}
          className="absolute right-3 bottom-3 bg-[#7dd87d] text-[#1a472a] hover:bg-[#6bc86b]"
        >
          {isMatching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find Tools"}
        </Button>
      </div>
    </div>
  </div>
</section>
```

### AI Match Results

When the AI returns matches, show them as highlighted cards above the regular grid with a "Why this fits:" explanation per tool.

### Tool Card Component

```tsx
function ToolCard({ tool, referrer = "library" }: { tool: Tool; referrer?: string }) {
  const trackClick = trpc.tools.trackClick.useMutation();

  const handleExplore = () => {
    trackClick.mutate({ toolId: tool.id, referrer });
    window.open(tool.websiteUrl, "_blank");
  };

  return (
    <div className="glass-panel p-5 h-full flex flex-col border-white/10 hover:border-[#7dd87d]/30 transition-all group">
      {/* Logo + name */}
      <div className="flex items-center gap-3 mb-3">
        {tool.logoUrl ? (
          <img src={tool.logoUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-white/10 p-1" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[#7dd87d]/20 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-[#7dd87d]" />
          </div>
        )}
        <div>
          <h3 className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>
            {tool.name}
          </h3>
          {tool.isPhysical && (
            <span className="text-xs text-amber-300/80">Physical Tool</span>
          )}
        </div>
      </div>

      {/* Summary */}
      <p className="text-white/80 text-sm leading-relaxed mb-4 flex-1">
        {tool.shortSummary}
      </p>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {tool.categories.map((cat) => (
          <span
            key={cat.slug}
            className="text-xs px-2 py-0.5 rounded-full border"
            style={{ color: cat.color, borderColor: `${cat.color}40`, backgroundColor: `${cat.color}15` }}
          >
            {cat.name}
          </span>
        ))}
      </div>

      {/* Footer: pricing + clicks + explore */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60 capitalize">{tool.pricingModel.replace("_", " ")}</span>
          {tool.totalClicks >= 100 && (
            <span className="text-xs text-[#7dd87d]/80 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {tool.totalClicks >= 1000 ? `${Math.floor(tool.totalClicks / 1000)}K+` : `${Math.floor(tool.totalClicks / 100) * 100}+`} explorers
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleExplore}
          className="bg-[#7dd87d]/20 text-[#7dd87d] hover:bg-[#7dd87d]/30 text-xs"
        >
          Explore <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
```

### Filter Bar

Below the hero, above the grid:
- Category multi-select pills (show all categories, clickable to toggle)
- Pricing filter: All / Free / Open Source / Paid
- Type filter: All / Digital / Physical
- Sort: Most Explored / Newest / A-Z

### Grid

```tsx
<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
  {tools.map(tool => <ToolCard key={tool.id} tool={tool} />)}
</div>
```

---

## Step 4: Tool Detail Page `/tools/:slug`

Create `client/src/pages/ToolDetail.tsx`.

Sections:
1. **Hero** with logo, name, full description, CTA button
2. **Community Stories** - forum posts that mention this tool (from `regenToolMentions`)
3. **Endorsements** - players who've used it, with optional comments
4. **Getting Started** link
5. **Related Tools** - tools in same categories
6. **"Endorse This Tool"** button (logged-in only)

---

## Step 5: Tool Submission Form `/tools/submit`

Create `client/src/pages/ToolSubmit.tsx`.

### Flow:

**Step 1: URL input**
Single field. On submit, calls `trpc.tools.analyzeUrl`.

**Step 2: Loading state**
Show "Analyzing [domain]..." with a spinner. Takes 3-8 seconds for the fetch + AI analysis.

**Step 3: Pre-filled form**
All fields populated from the AI analysis. Every field is editable. Upload buttons next to logo and card image fields.

**Step 4: Problem statements**
Text area where they add the problems their tool solves. Each on its own line. These feed the AI matcher.

**Step 5: Submit**
Creates a pending tool. Shows confirmation: "Thanks! Your tool will be reviewed by the team."

---

## Step 6: Admin Moderation `/admin/tools`

Add a new section to the existing admin panel (if one exists) or create a simple admin page.

- List of pending tools with preview cards
- Approve / Reject / Edit buttons
- Edit modal with all fields

---

## Step 7: Navigation - Add "Tools Library" to Play the Game Dropdown

In `client/src/components/Navigation.tsx`:

### Desktop dropdown (find the "Play the Game" DropdownMenuContent):

After the "Local Food Economy" item and before the separator, add:

```tsx
<DropdownMenuItem
  className="text-white hover:bg-[#7dd87d]/20 focus:bg-[#7dd87d]/20 cursor-pointer"
  onClick={() => navigate('/tools')}
>
  <Wrench className="w-5 h-5 mr-3 text-amber-400" />
  <span style={{ fontFamily: 'var(--font-accent)' }}>Tools Library</span>
</DropdownMenuItem>
```

Add `Wrench` to the lucide-react imports.

### Mobile menu (find the mobile "Play the Game" section):

Add in the same position:

```tsx
<Link href="/tools">
  <button className="flex items-center gap-3 w-full pl-10 pr-4 py-2.5 text-white/70 hover:bg-[#7dd87d]/20 transition-colors text-left">
    <Wrench className="w-5 h-5 text-amber-400" />
    <span style={{ fontFamily: 'var(--font-accent)' }}>Tools Library</span>
  </button>
</Link>
```

---

## Step 8: Ally Page - Featured Tools Library Card

In `client/src/pages/Ally.tsx`, add a prominent card after the "Who We Are Looking For" section (the categories grid). This card targets organizations that build tools.

```tsx
{/* Tools Library - Featured Card for Tool Builders */}
<section className="relative py-10 md:py-14">
  <div className="container max-w-4xl mx-auto px-4">
    <AnimatedSection animation="fade-in">
      <div className="glass-panel p-8 md:p-10 border-[#7dd87d]/30 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
          <SeedOfLifeIcon className="absolute -right-10 -top-10 text-[#7dd87d]" size={200} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-400/20 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>
                Regen Civilization Tools Library
              </h3>
              <p className="text-white/60 text-sm">List your tools. Earn from usage.</p>
            </div>
          </div>

          <p className="text-white/80 text-base leading-relaxed mb-4">
            Build tools for the regenerative renaissance? List them in our library and earn $ReGen
            based on community usage. Software platforms, construction technology, governance frameworks,
            food systems, 3D printing, energy solutions. If regenerative communities use it, it belongs here.
          </p>

          <p className="text-white/70 text-sm mb-6">
            Tool usage in our community counts as a contribution toward the seasonal Harvest.
            The more your tools are used, the more $ReGen you earn. Listing your tool is one path
            to Alliance membership, and we have other paths for organizations that offer services,
            expertise, or other forms of support.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/tools/submit">
              <Button className="bg-amber-400 hover:bg-amber-500 text-[#1a472a] font-bold">
                <Upload className="w-4 h-4 mr-2" />
                List Your Tool
              </Button>
            </Link>
            <Link href="/tools">
              <Button variant="outline" className="border-[#7dd87d]/30 text-[#7dd87d] hover:bg-[#7dd87d]/10">
                Browse the Library
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </AnimatedSection>
  </div>
</section>
```

---

## Step 9: Route Registration

In `client/src/App.tsx`:

```tsx
const ToolsLibrary = lazy(() => import("./pages/ToolsLibrary"));
const ToolDetail = lazy(() => import("./pages/ToolDetail"));
const ToolSubmit = lazy(() => import("./pages/ToolSubmit"));

// Add routes:
<Route path="/tools"><EB><ToolsLibrary /></EB></Route>
<Route path="/tools/submit"><EB><ToolSubmit /></EB></Route>
<Route path="/tools/:slug"><EB><ToolDetail /></EB></Route>
```

---

## Step 10: Game Integration Touchpoints

### 10a. Harvest Contribution (Tool Usage = $ReGen Earnings)

When a tool gets clicks, the organization that submitted it earns contribution points. Add to the contribution tracking system:

```typescript
// In the trackClick procedure, after incrementing totalClicks:
if (tool.submittedBy) {
  // Log a contribution event for the tool creator
  await db.insert(contributions).values({
    userId: tool.submittedBy,
    type: "tool_usage",
    toolId: tool.id,
    points: 1, // 1 point per click, accumulated toward Harvest
    createdAt: new Date(),
  });
}
```

This means tool creators earn $ReGen proportional to how much the community uses their tools. The more useful your tool is to regenerators, the more you earn from the seasonal Harvest.

### 10b. Forum Auto-Detection

In the forum post save handler (wherever new posts/replies are created), add after saving:

```typescript
// Detect tool mentions in post body
const approvedTools = await db.select().from(regenTools).where(eq(regenTools.status, "approved"));
for (const tool of approvedTools) {
  if (post.body.toLowerCase().includes(tool.name.toLowerCase())) {
    await db.insert(regenToolMentions).values({
      toolId: tool.id,
      postId: post.id,
    });
  }
}
```

### 10c. Quest Integration Points

For future quest linking (not Earth Day launch, Phase 3):
- Add optional `toolId` to quest definitions
- On quest completion, auto-create endorsement if quest has a linked tool
- Show "Tools for this Quest" section on quest detail pages

---

## Step 11: SEO

Add to `client/src/components/SEO.tsx` pageSEO:

```typescript
tools: {
  title: "Regen Civilization Tools Library | ReGen Civics",
  description: "Every tool the regenerative renaissance needs. Software, hardware, governance, currency, food systems. Describe your challenge, find your tools.",
  path: "/tools",
},
```

---

## Final Verification

After all code is written:

1. `npm run build` - must compile without errors
2. Verify all new routes load (`/tools`, `/tools/submit`, `/tools/:slug`)
3. Verify the navigation dropdown shows "Tools Library" on both desktop and mobile
4. Verify the Ally page shows the featured card
5. Verify seed data loads (categories + 5 starter tools)
6. Test click tracking (click "Explore" on a tool, verify the count increments)
7. Test the AI matcher with a sample problem

```bash
# Check no TypeScript errors
npm run build

# Check routes exist
grep -n "tools" client/src/App.tsx

# Check nav has tools
grep -n "Tools Library" client/src/components/Navigation.tsx
```

---

## Commit and Push

```bash
git add -A
git commit -m "feat: Regen Civilization Tools Library - AI-searchable tool directory with click tracking and Harvest integration"
git push
```

---

## Handoff Breakdown

| Task | Who |
|---|---|
| Database migration + schema | Claude Code |
| Seed categories + starter tools | Claude Code (schema only, Rye runs against Railway DB) |
| tRPC router (all procedures) | Claude Code |
| /tools page with AI matcher | Claude Code |
| /tools/:slug detail page | Claude Code |
| /tools/submit with AI pre-fill | Claude Code |
| Admin moderation UI | Claude Code |
| Navigation dropdown update | Claude Code |
| Ally page featured card | Claude Code |
| Route registration | Claude Code |
| Forum auto-detection hook | Claude Code |
| Click tracking + Harvest contribution | Claude Code |
| SEO meta tags | Claude Code |
| npm run build verification | Claude Code |
| Run seed scripts against Railway DB | Rye |
| Upload logo images for 5 starter tools | Rye |
| Test AI matcher (needs AI API key) | Rye (verify key in .env) |
| git push | Rye |
| Review and approve pending tools in admin | Rye (ongoing) |

# Community Agreements Feature + Forum UI Polish

**Date:** 2026-03-27
**For:** Claude Code implementation session
**What this is:** Full build plan for the interactive Community Agreements page and several forum UI changes. Read this entire doc before writing any code.

---

## Context

ReGen Civics has a static Community Guidelines page at `/community/guidelines` (`CommunityGuidelines.tsx`). It lists 6 hardcoded sections (Our values, What makes a good post, How we handle disagreement, What we don't allow, How to flag an issue, Moderation). This needs to become an interactive propose-and-vote system where the community can suggest new agreements and vote on them, similar to how `/community/quests` (QuestSuggestions.tsx) lets people propose and vote on quest ideas.

There are also several forum UI fixes bundled in this plan.

---

## Writing Rules (MANDATORY)

- No em-dashes anywhere. Use commas, colons, or separate sentences.
- No AI-isms: no "delve", "tapestry", "foster", "leverage", "vibrant", "transformative", "unlock", "empower", "seamless", "robust", "comprehensive", "utilize", "navigate" (as metaphor).
- No contrast-framing ("not X, but Y"). Lead with the affirmative.
- Direct, grounded voice.

---

## Part 1: Community Agreements Page (Major Feature)

### 1A. Database Schema

**New tables** (mirror the `questSuggestions` + `questSuggestionVotes` pattern in `drizzle/schema.ts`):

```typescript
// Add to drizzle/schema.ts

export const communityAgreements = mysqlTable("communityAgreements", {
  id: int("id").autoincrement().primaryKey(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }),
  // "open" = accepting votes, "ratified" = adopted by community, "declined" = rejected
  status: mysqlEnum("status", ["open", "ratified", "in_review", "declined"]).default("open").notNull(),
  voteCount: int("voteCount").default(0).notNull(),
  forumThreadId: int("forumThreadId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const communityAgreementVotes = mysqlTable("communityAgreementVotes", {
  id: int("id").autoincrement().primaryKey(),
  agreementId: int("agreementId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Migration SQL** (save as `drizzle/0086_community_agreements.sql`):

```sql
CREATE TABLE communityAgreements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  authorId INT NOT NULL,
  title VARCHAR(300) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  status ENUM('open', 'ratified', 'in_review', 'declined') NOT NULL DEFAULT 'open',
  voteCount INT NOT NULL DEFAULT 0,
  forumThreadId INT DEFAULT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE communityAgreementVotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agreementId INT NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_vote (agreementId, userId)
);
```

**Seed the existing 6 guidelines as ratified agreements** (save as `drizzle/0087_seed_existing_agreements.sql`):

```sql
-- Seed existing community guidelines as ratified agreements (authorId 1 = Rye)
INSERT INTO communityAgreements (authorId, title, description, category, status, voteCount) VALUES
(1, 'Honesty', 'Share what you actually experienced, believe, or don''t know. Uncertainty is welcome here.', 'Forum Conduct', 'ratified', 0),
(1, 'Respect', 'Every person in this space is doing their best with what they have.', 'Forum Conduct', 'ratified', 0),
(1, 'Curiosity', 'Ask questions before assuming. Learning together is the point.', 'Forum Conduct', 'ratified', 0),
(1, 'Regeneration', 'We care about outcomes that restore rather than extract, in our land practices and in how we treat each other.', 'Forum Conduct', 'ratified', 0),
(1, 'Address ideas, not people', 'Disagreement is normal and often useful. Address the idea, not the person who holds it. Ask a question before assuming someone meant harm.', 'Moderation', 'ratified', 0),
(1, 'No spam or misinformation', 'No repeated low-effort posts, irrelevant links, or automated content. If sharing something as fact, be prepared to back it up. If it is opinion, say so.', 'Moderation', 'ratified', 0);
```

**Category values for the `category` field:**
- Forum Conduct
- Moderation
- Land Projects
- Governance
- Social Spaces
- Events

### 1B. Database Helper Functions

**Add to `server/db.ts`** (mirror the quest suggestion functions):

```typescript
export async function listCommunityAgreements(
  sortBy: 'votes' | 'newest' = 'votes',
  status?: string,
  limit = 50,
  offset = 0
) {
  const db = await getDb();
  if (!db) return [];
  const orderCol = sortBy === 'votes'
    ? desc(communityAgreements.voteCount)
    : desc(communityAgreements.createdAt);
  let query = db.select().from(communityAgreements).orderBy(orderCol).limit(limit).offset(offset);
  if (status) {
    query = query.where(eq(communityAgreements.status, status));
  }
  return query;
}

export async function createCommunityAgreement(data: {
  authorId: number;
  title: string;
  description: string;
  category?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(communityAgreements).values({
    authorId: data.authorId,
    title: data.title,
    description: data.description,
    category: data.category || null,
  });
  return result.insertId;
}

export async function toggleCommunityAgreementVote(userId: number, agreementId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db.select().from(communityAgreementVotes)
    .where(and(
      eq(communityAgreementVotes.userId, userId),
      eq(communityAgreementVotes.agreementId, agreementId)
    ))
    .limit(1);

  if (existing) {
    await db.delete(communityAgreementVotes).where(eq(communityAgreementVotes.id, existing.id));
    const agreement = await db.select().from(communityAgreements).where(eq(communityAgreements.id, agreementId)).limit(1);
    if (agreement[0] && agreement[0].voteCount > 0) {
      await db.update(communityAgreements)
        .set({ voteCount: agreement[0].voteCount - 1 })
        .where(eq(communityAgreements.id, agreementId));
    }
    return false;
  } else {
    await db.insert(communityAgreementVotes).values({ userId, agreementId });
    const agreement = await db.select().from(communityAgreements).where(eq(communityAgreements.id, agreementId)).limit(1);
    if (agreement[0]) {
      await db.update(communityAgreements)
        .set({ voteCount: agreement[0].voteCount + 1 })
        .where(eq(communityAgreements.id, agreementId));
    }
    return true;
  }
}

export async function getUserCommunityAgreementVotes(userId: number) {
  const db = await getDb();
  if (!db) return [] as number[];
  const votes = await db.select().from(communityAgreementVotes)
    .where(eq(communityAgreementVotes.userId, userId));
  return votes.map(v => v.agreementId);
}
```

### 1C. tRPC Routes

**Create new router or add to existing.** Follow the pattern in `server/routes/players.ts` where `questsRouter` lives.

```typescript
// Could be its own file: server/routes/agreements.ts
// Or added to an existing router

export const agreementsRouter = router({
  // List all agreements (public)
  list: publicProcedure
    .input(z.object({
      sortBy: z.enum(['votes', 'newest']).default('votes'),
      status: z.string().optional(), // filter by status
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const agreements = await db.listCommunityAgreements(input.sortBy, input.status, input.limit, input.offset);
      const authorsMap = await db.getUsersByIds(agreements.map(a => a.authorId));
      return agreements.map((a) => ({
        ...a,
        authorName: authorsMap[a.authorId]?.name || 'Anonymous',
      }));
    }),

  // Get user's votes (authenticated)
  myVotes: protectedProcedure.query(async ({ ctx }) => {
    return db.getUserCommunityAgreementVotes(ctx.user.id);
  }),

  // Submit a new agreement proposal (authenticated)
  create: protectedProcedure
    .input(z.object({
      title: z.string().min(3).max(300),
      description: z.string().min(10).max(5000),
      category: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await db.createCommunityAgreement({
        authorId: ctx.user.id,
        title: input.title,
        description: input.description,
        category: input.category,
      });

      // Auto-create forum thread in the air-conversations category
      try {
        const drizzle = await getDb();
        if (drizzle) {
          const [airCat] = await drizzle
            .select({ id: forumCategories.id })
            .from(forumCategories)
            .where(eq(forumCategories.slug, 'air-conversations'))
            .limit(1);
          if (airCat) {
            const forumBody = `This is the discussion thread for the proposed community agreement: "${input.title}"\n\n${input.description}\n\nShare your thoughts, questions, and suggestions here.`;
            const forumPostId = await db.createForumPost({
              categoryId: airCat.id,
              authorId: ctx.user.id,
              title: `Agreement Proposal: ${input.title}`,
              content: forumBody,
            });
            await drizzle
              .update(communityAgreements)
              .set({ forumThreadId: forumPostId })
              .where(eq(communityAgreements.id, id));
          }
        }
      } catch (err) {
        console.error('Failed to auto-create forum thread for agreement (non-fatal):', err);
      }

      return { id };
    }),

  // Toggle vote on an agreement (authenticated)
  toggleVote: protectedProcedure
    .input(z.object({ agreementId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const voted = await db.toggleCommunityAgreementVote(ctx.user.id, input.agreementId);
      return { voted };
    }),
});
```

**Wire up in `server/routers.ts`:**
```typescript
import { agreementsRouter } from './routes/agreements';
// Add to appRouter:
agreements: agreementsRouter,
```

### 1D. Page Component Rewrite

**File:** `client/src/pages/CommunityGuidelines.tsx`

Rewrite completely. Model after `QuestSuggestions.tsx`. Two sections on the page:

**Section 1: Active Agreements (ratified)**
- Display the existing ratified agreements in a clean list
- Each shows title, description, category badge, "Ratified" status badge
- No voting on ratified agreements

**Section 2: Proposals (open)**
- "Propose an Agreement" button (requires auth)
- Form: title, description, category dropdown (Forum Conduct, Moderation, Land Projects, Governance, Social Spaces, Events)
- Sort by: Top (votes) / New (newest)
- Each proposal card shows: title, description, author name, vote count, vote button, category badge, link to forum discussion
- Vote button highlights if user has voted
- Rank badges (#1, #2, #3) when sorted by votes

**Hero section:**
- Keep the same green/nature feel as the current page
- Title: "Community Agreements"
- Subtitle: "This is a space for people building a regenerative world. These agreements help us keep it honest, generous, and worth showing up for."
- Back link to `/community`

**Component structure:**
```tsx
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronUp, MessageCircle } from "lucide-react";
import { SEO } from "@/components/SEO";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth"; // or however auth works

export default function CommunityGuidelines() {
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // Queries
  const ratifiedQuery = trpc.agreements.list.useQuery({ status: 'ratified', sortBy: 'newest' });
  const proposalsQuery = trpc.agreements.list.useQuery({ status: 'open', sortBy });
  const myVotesQuery = trpc.agreements.myVotes.useQuery(undefined, { enabled: isAuthenticated });

  // Mutations
  const createMutation = trpc.agreements.create.useMutation({ ... });
  const voteMutation = trpc.agreements.toggleVote.useMutation({ ... });

  const myVotes = useMemo(() => new Set(myVotesQuery.data || []), [myVotesQuery.data]);

  // ... render two sections: Ratified + Proposals
}
```

### 1E. Route Fix

**In `Community.tsx` line 1128:** Change link from `/community-guidelines` to `/community/guidelines`.

**In `App.tsx`:** Confirm route exists at `/community/guidelines` mapping to `CommunityGuidelines` component (line 222, already correct).

---

## Part 2: Forum UI Changes

### 2A. Rename "Hard Conversations" section to "Clarity & Agreements"

**File:** `client/src/pages/Community.tsx`

**Line ~578 (section button subtitle):** Change `"Hard Conversations"` to `"Clarity & Agreements"`

**Line ~1103 (panel header):** Change `"Air: Hard Conversations"` to `"Air: Clarity & Agreements"`

**Line ~1105 (panel description):** Update the description text accordingly. Current text: "Some things need to move. This is where we say the hard thing, clear what's stagnant, and make space for what comes next."

Suggested replacement: "Where we get clear on how we show up. Agreements, healthy conversations, and the things worth saying out loud."

### 2B. Rename second card title to "Healthy Conversations"

**File:** `client/src/pages/Community.tsx`

The Air section has two quest-style cards:

**Card 1 (line ~1118):**
- Current title: "Hard Conversations"
- Current subtitle: "Clear what's stagnant"
- Keep as is (this links to `/community/c/air-conversations`)

Wait, user said: change the second "Hard Conversations" to "Healthy Conversations" leaving the subtitle as is.

Looking at the cards:
- Card 1: title="Hard Conversations", subtitle="Clear what's stagnant", link to `/community/c/air-conversations`
- Card 2: title="Community Agreements", subtitle="How we hold space together", link to `/community-guidelines`

The user wants to rename Card 1 from "Hard Conversations" to "Healthy Conversations" while keeping subtitle "Clear what's stagnant".

**Change line ~1121:** `"Hard Conversations"` to `"Healthy Conversations"`

### 2C. Add images to both Air section cards

Both cards in the Air section reference WRONG image paths:
- Card 1 references: `src="/images/quests/quest-10-nvc.webp"` but actual file is `quest-10-communication-patterns.webp`
- Card 2 references: `src="/images/quests/quest-12-breathplay.webp"` but actual file is `quest-12-breathplay-future-dreaming.webp`

**Fix:** Update the image paths in Community.tsx:
- Card 1 (line ~1118): change `quest-10-nvc.webp` to `quest-10-communication-patterns.webp`
- Card 2 (line ~1130): change `quest-12-breathplay.webp` to `quest-12-breathplay-future-dreaming.webp`

Full list of actual quest images available in `client/public/images/quests/`:
- quest-00-fire.webp
- quest-01-potion-brewing.webp
- quest-02-saving-seeds.webp
- quest-03-healing-wholes.webp
- quest-04-dreaming-spaces-of-love.webp
- quest-05-rites-of-love.webp
- quest-06-healing-circles.webp
- quest-07-wild-foraging.webp
- quest-08-medicine-journey.webp
- quest-09-tree-talk.webp
- quest-10-communication-patterns.webp
- quest-11-coordination-patterns.webp
- quest-12-breathplay-future-dreaming.webp
- quest-acts.webp
- quest-hero.webp
- quest-remembers.webp

### 2D. Add imageUrl column to forumCategories + image upload in Add Category form

**Current state:** The `forumCategories` table has no image column. Categories use `icon` (Lucide icon name) and `color` (hex) for visual identity.

**Step 1: Migration**

Save as `drizzle/0088_category_images.sql`:
```sql
ALTER TABLE forumCategories ADD COLUMN imageUrl VARCHAR(500) DEFAULT NULL;
```

**Step 2: Update Drizzle schema**

In `drizzle/schema.ts`, add to `forumCategories`:
```typescript
imageUrl: varchar("imageUrl", { length: 500 }),
```

**Step 3: Update tRPC routes**

In `server/routes/forum.ts`:
- `createCategory`: Add `imageUrl: z.string().max(500).optional()` to input schema
- `updateCategory`: Add `imageUrl: z.string().max(500).optional()` to input schema

In `server/db.ts`:
- `createForumCategory`: Add `imageUrl` to the values object
- `updateForumCategory`: Allow `imageUrl` in the update data

**Step 4: Update Add Category form in Community.tsx**

The form (around line 704) currently has 3 inputs: name, slug, description.

Add:
- A file input or the existing `FileUpload` component (already exists at `client/src/components/FileUpload.tsx`)
- On file select, upload via `trpc.files.upload` mutation (already exists in `server/routes/global.ts`)
- Store returned URL in state, pass as `imageUrl` when creating category

**Step 5: Update category card rendering**

In Community.tsx, for general categories (around line 630), update the card to show:
- If `category.imageUrl` exists: render an `<img>` tag (like land project cards do)
- If no imageUrl: fall back to the current icon + color display

### 2E. Audit all forum category cards for missing images

After implementing 2D, audit every category across all sections:

**General section categories (use icon fallback if no imageUrl):**
- General Discussion (icon: MessageCircle)
- Investment & Finance (icon: TrendingUp)
- Governance & DAO (icon: Vote)
- Introductions (icon: UserPlus)
- Resources & Learning (icon: BookOpen)

**Dedicated section categories (hardcoded image paths, verify files exist):**
- Quests & Gameplay: check card image
- Alliance Partners: check card image
- Air Conversations: `/images/quests/quest-10-nvc.webp`
- Community Agreements: `/images/quests/quest-12-breathplay.webp`
- Rites of Passage: check card image
- Welcome Aboard Quests: check card image
- Active Projects / Active Organisations: check card images

**Land Projects section (uses STATIC_PROJECT_META):**
- All 8 projects have hardcoded images at `/community/*.webp`
- Verify all 8 webp files exist in `client/public/community/`

For any missing images, either provide a placeholder or flag for Rye to upload.

---

## Part 3: Migration Files to Generate

Create these SQL files (Rye will run them in Railway):

1. `drizzle/0086_community_agreements.sql` (tables for agreements + votes)
2. `drizzle/0087_seed_existing_agreements.sql` (seed 6 ratified agreements)
3. `drizzle/0088_category_images.sql` (add imageUrl to forumCategories)
4. `drizzle/0089_move_land_threads.sql` (move threads from active-projects to land-projects)
5. `drizzle/0090_move_alliance_threads.sql` (move threads from active-organisations to alliance-partners)

---

## Files That Will Change

### New files:
- `drizzle/0086_community_agreements.sql`
- `drizzle/0087_seed_existing_agreements.sql`
- `drizzle/0088_category_images.sql`
- `drizzle/0089_move_land_threads.sql`
- `drizzle/0090_move_alliance_threads.sql`
- `server/routes/agreements.ts` (new tRPC router)

### Modified files:
- `drizzle/schema.ts` (add communityAgreements, communityAgreementVotes tables + imageUrl on forumCategories)
- `server/db.ts` (add agreement helper functions + update category functions for imageUrl + change ensureEntityForumThread slugs)
- `server/routers.ts` (wire up agreementsRouter)
- `client/src/pages/CommunityGuidelines.tsx` (complete rewrite to interactive page)
- `client/src/pages/Community.tsx` (rename section, rename card, fix link, update category cards for images, update Add Category form)
- `server/routes/forum.ts` (add imageUrl to createCategory + updateCategory, simplify activeOrganisationThreads)
- `server/routes/applications.ts` (change approved project thread category from active-projects to land-projects)
- `client/src/pages/Schedule.tsx` (standardize calendar button styling and naming)

---

## Part 4: Land Projects Category Fix

### Problem

`/community/c/land-projects` currently shows general land discussion posts. When a user clicks "General" or "Land Projects" in the Earth section, both lead to the same URL. The `land-projects` category is being used as a general discussion bucket, but it should exclusively show threads for accepted land projects.

### Current Auto-Thread Flow

The flow already exists in `server/routes/applications.ts` (lines 335-410). When `updateStatus` sets status to `"approved"`, it:
1. Finds or creates the `active-projects` category
2. Builds rich thread content from the application data (vision, land status, scale, practices, governance, team, funding, website)
3. Creates a pinned forum post via `db.createForumPost()` in the `active-projects` category

There is also `db.ensureEntityForumThread()` in `server/db.ts` (lines 2684-2741) which routes `land_project` type entities to the `active-projects` category slug.

### What Needs to Change

**Option A (simpler):** Change `ensureEntityForumThread` and the `updateStatus` approval logic to use `land-projects` instead of `active-projects` as the target category. Then `land-projects` becomes the dedicated home for accepted project threads.

**Option B:** Keep the current category slugs but fix the routing in Community.tsx so the Earth section's main card links to the correct category.

**Recommended: Option A.** This matches Rye's intent that `/community/c/land-projects` should show accepted project threads.

**Changes:**
1. In `server/db.ts` line ~2698: Change `'active-projects'` to `'land-projects'` in `ensureEntityForumThread`
2. In `server/routes/applications.ts` line ~339: Change the category lookup from `active-projects` to `land-projects`
3. In `client/src/pages/Community.tsx`: Make sure the Earth section's "Land Projects" card links to `/community/c/land-projects` and that general land discussion has its own home (or is folded into General Discussion)
4. Move any existing threads from `active-projects` to `land-projects` category (migration SQL)

**5. New general categories already created in DB (no migration needed):**

The old `active-projects` (id 11) and `active-organisations` (id 10) categories have been repurposed:
- id 11: renamed to "Land General", slug `land-general`, sortOrder 3, icon "Sprout"
- id 10: renamed to "Alliance General", slug `alliance-general`, sortOrder 7, icon "Users"

These are already live in the database. Claude Code needs to:
- Add `'land-general'` and `'alliance-general'` to `SECTION_SLUGS` in `Community.tsx` so they show in their dedicated sections (not General)
- Add a "Land General" card in the Earth section linking to `/community/c/land-general`
- Add an "Alliance General" card in the Alliance section linking to `/community/c/alliance-general`

**Migration** (save as `drizzle/0089_move_land_threads.sql`):
```sql
-- Move all threads from active-projects to land-projects category
UPDATE forumPosts
SET categoryId = (SELECT id FROM forumCategories WHERE slug = 'land-projects')
WHERE categoryId = (SELECT id FROM forumCategories WHERE slug = 'active-projects');
```

---

## Part 5: Alliance Partners Category Fix

### Problem

Same issue as Land Projects. Alliance org threads are created in `active-organisations` category, but the user wants them in `alliance-partners` so that `/community/c/alliance-partners` shows accepted alliance orgs.

### Current Flow

`ensureEntityForumThread` in `server/db.ts` routes `alliance_org` type to `active-organisations` slug. The forum route `activeOrganisationThreads` (in `server/routes/forum.ts` lines 306-313) tries `alliance-partners` first, then falls back to `active-organisations`.

### What Needs to Change

1. In `server/db.ts` line ~2698: Change `'active-organisations'` to `'alliance-partners'` in `ensureEntityForumThread`
2. In `server/routes/forum.ts` lines 306-313: Simplify `activeOrganisationThreads` to just use `alliance-partners` (remove fallback)
3. Move any existing threads from `active-organisations` to `alliance-partners` category (migration SQL)

**Migration** (save as `drizzle/0090_move_alliance_threads.sql`):
```sql
-- Move all threads from active-organisations to alliance-partners category
UPDATE forumPosts
SET categoryId = (SELECT id FROM forumCategories WHERE slug = 'alliance-partners')
WHERE categoryId = (SELECT id FROM forumCategories WHERE slug = 'active-organisations');
```

---

## Part 6: Schedule Page Calendar Button Standardization

### Problem

The Schedule page (`client/src/pages/Schedule.tsx`) has 3 calendar cards with completely inconsistent button styling and naming.

### Current State

**Card 1: "Season 2 Episodes" (lines 440-478)**
- Button 1: "Google Calendar" -- `bg-white hover:bg-gray-100 text-gray-800` (white)
- Button 2: "Apple/Outlook (.ics)" -- `bg-gray-800 hover:bg-gray-700 text-white` (dark gray)

**Card 2: "All Events" (lines 478-527)**
- Button 1: "Subscribe (Google)" -- `bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-semibold` (green)
- Button 2: "Apple/Outlook (live)" -- `bg-gray-800 hover:bg-gray-700 text-white` (dark gray)
- Button 3: "Snapshot .ics" -- `bg-white/10 text-white/60 text-xs px-3 border border-white/10` (ghost, smaller)

**Card 3: "Open Access Session" (lines 525-560)**
- Button 1: "Add to Google" -- `bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-semibold` (green)
- Button 2: "Apple/Outlook" -- `bg-white/10 hover:bg-white/20 text-white border border-white/20` (ghost)

### Inconsistencies

| Issue | Details |
|-------|---------|
| Google button naming | "Google Calendar" vs "Subscribe (Google)" vs "Add to Google" |
| Google button styling | White bg (card 1) vs green bg (cards 2-3) |
| Apple button naming | "Apple/Outlook (.ics)" vs "Apple/Outlook (live)" vs "Apple/Outlook" |
| Apple button styling | Dark gray (cards 1-2) vs transparent ghost (card 3) |
| Font weight | `font-medium` (card 1) vs `font-semibold` (cards 2-3) |
| Text size | `text-xs` on Snapshot.ics vs `text-sm` everywhere else |

### Standardized Design

Use two button styles across all cards:

**Primary (Google Calendar):**
```
bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm
```
Label: "Google Calendar" (consistent across all cards)

**Secondary (Apple/Outlook):**
```
bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20
```
Label: "Apple/Outlook" (consistent across all cards)

**Tertiary (optional .ics download, only if needed):**
```
bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-4 py-2 rounded-xl font-medium transition-colors text-xs border border-white/10
```
Label: "Download .ics"

Apply these to all three cards. Each card gets exactly 2 buttons: "Google Calendar" (green) and "Apple/Outlook" (ghost). Card 2 can keep a third "Download .ics" button if the snapshot download is a different action from the live subscription.

---

## Part 7: Zoom to Riverside Migration on Schedule Page

### Background

ReGen Civics has moved from Zoom to Riverside for Season 2 recordings. The backend is already built:
- `server/webhooks/riverside.ts` handles `recording.complete` webhooks (stores metadata, creates forum posts, sends emails)
- `server/routes/events.ts` already supports a `riversideRoomUrl` field on events
- `server/_core/notify.ts` includes Riverside URL in event notifications
- A Zapier automation exists: "New YouTube videos to Riverside webhook POST" that triggers on new SEEDS Regenerative Economies YouTube uploads and POSTs to `https://regencivics.earth/api/webhooks/riverside`

### Current Riverside Account State (verified via browser)
- **Account:** Rieki Cordon (Rye), rieki.cordon@gmail.com
- **Plan:** Pro trial (renews Apr 4, 2026)
- **Project:** "ReGen Civics" created March 21, currently empty (no recordings yet)
- **Integrations:** HubSpot and Salesforce available but NOT connected. No YouTube connection in Riverside settings.
- **Zapier:** One Zap exists, currently OFF (toggle disabled). It watches the SEEDS Regenerative Economies YouTube channel and POSTs to the Riverside webhook.

### What the Schedule Page Needs

**1. Replace ALL Zoom references with Riverside**

The `ZOOM_INFO` constant (lines 39-51) must be replaced entirely. There is no Meeting ID or Passcode for Riverside. Instead, Riverside uses a room URL that participants join via browser.

Replace `ZOOM_INFO` with:
```typescript
const RIVERSIDE_INFO = {
  topic: "ReGen Civics Season 2",
  description: "Join ReGen Civics in Season 2! Helping land projects evolve to the next stage of their regenerative journeys.",
  roomUrl: "https://riverside.com/studio/rieki-cordon-riekis-studio", // Rye needs to create a room and paste the URL here
};
```

**[HUMAN REQUIRED]:** Rye needs to create a Riverside room in the ReGen Civics project and provide the room URL. The URL format is typically `https://riverside.fm/studio/[room-id]`.

**2. Update the "All Episodes via Zoom" section (lines 565-616)**

Rename to "All Episodes via Riverside". Remove:
- Meeting ID display + copy button
- Passcode display + copy button
- Dial-in phone numbers

Replace with:
- "Join on Riverside" button linking to the room URL
- Brief note: "Join via your browser. No download required."

**3. Update all hardcoded fallback events (lines 56-240)**

Every fallback event has Zoom URLs baked into the `googleCalendarUrl` and `appleCalendarUrl` strings. All of these need the Zoom link replaced with the Riverside room URL.

The dynamic calendar URL generators (`buildGcalUrl` at line 249 and `buildIcsBlob` at line 256) also hardcode Zoom. Update these to use the Riverside room URL instead.

**4. Update event card join buttons (line 818-838)**

The code already has logic: "Riverside takes priority over Zoom" (line 818 comment). But the fallback on line 832 still says "Join on Zoom" and links to `ZOOM_INFO.link`. Change this to "Join on Riverside" and link to `RIVERSIDE_INFO.roomUrl`.

**5. Update the info section (line 972)**

"Join Zoom or Youtube" heading should become "Join on Riverside or YouTube"

**6. Add a Recordings section**

Per the spec in `QUALITY_SPRINT_9_10.md`, the Schedule page should have an "Episode Recordings" section below the events list. This displays recordings that come in via the Riverside webhook. The `recordings` table in the DB (if it exists) or the forum posts created by the webhook handler can serve as the data source.

Check if a `recordings` table exists in the schema. If not, the webhook handler in `server/webhooks/riverside.ts` stores recording data somewhere. The recordings section should show:
- Episode title
- YouTube embed or link
- Thumbnail
- Duration
- Link to forum discussion thread

### Files to Change

- `client/src/pages/Schedule.tsx` (major rewrite of Zoom references, add recordings section)

### Human Steps Required (cannot be done by Claude Code)

- [DONE] Riverside studio exists: "ReGen Civics Studio" at `https://riverside.com/studio/rieki-cordon-riekis-studio`
- [DONE] YouTube connected: SEEDS: ReGenerative Renaissance channel linked in Riverside Live stream settings
- [DONE] Facebook connected: Rieki Cordon profile linked in Riverside Live stream settings
- [HUMAN] Turn ON the Zapier automation (it's currently disabled)
- [HUMAN] Verify the Riverside Pro plan has enough hours for Season 2 (13 episodes x 2 hours = 26 hours)

---

## What NOT To Do

- Do NOT run any DB migrations. Just create the SQL files.
- Do NOT modify questData.ts or quest-related code.
- Do NOT change the Welcome Aboard quest threads.
- Do NOT recreate migration files 0083, 0084, 0085 (already applied).
- The Riverside room URL is `https://riverside.com/studio/rieki-cordon-riekis-studio`. Use this as the real value.

---

## Done Criteria

- `pnpm build` passes with zero errors
- Community Agreements page renders with ratified agreements section + proposals section
- Voting works (toggle on/off, auth required)
- Proposal form creates agreement + auto-creates forum thread
- Air section renamed to "Clarity & Agreements"
- Card 1 renamed to "Healthy Conversations" (subtitle unchanged)
- Both Air cards show images
- Add Category form includes image upload
- Category cards show images when available, fall back to icons
- All migration SQL files created and ready for Rye to run
- Link in Community.tsx points to `/community/guidelines` (not `/community-guidelines`)
- `/community/c/land-projects` shows only accepted land project threads (not general discussion)
- Approving a land project application auto-creates a thread in `land-projects` category
- `/community/c/alliance-partners` shows only accepted alliance org threads
- Approving an alliance org auto-creates a thread in `alliance-partners` category
- `/community/c/land-general` shows as a card in the Earth section for open land discussion
- `/community/c/alliance-general` shows as a card in the Alliance section for open alliance discussion
- Both `land-general` and `alliance-general` are in `SECTION_SLUGS` so they don't appear in General
- Schedule page: all calendar buttons use consistent styling and naming ("Google Calendar" green, "Apple/Outlook" ghost)
- All Zoom references in Schedule.tsx replaced with Riverside
- "All Episodes via Zoom" section renamed and updated with Riverside join flow
- Dynamic calendar URL builders use Riverside room URL instead of Zoom
- Event card join buttons say "Join on Riverside"
- `RIVERSIDE_INFO.roomUrl` set to `https://riverside.com/studio/rieki-cordon-riekis-studio`

# Community Agreements Feature + Forum UI Polish

**Date:** 2026-03-27 (CTO reviewed 2026-04-08, status verified 2026-04-09)
**For:** Claude Code implementation session
**What this is:** Full build plan for the interactive Community Agreements page and several forum UI changes. Read this entire doc before writing any code.

---

## STATUS SUMMARY (verified 2026-04-09)

All parts 1-15 shipped.

| Part | Description | Status |
|------|-------------|--------|
| 1 | Community Agreements interactive page | DONE |
| 2A | Air section renamed "Clarity & Agreements" | DONE |
| 2B | Card 1 renamed "Healthy Conversations" | DONE |
| 2C | Air section image paths corrected | DONE |
| 2D | Add Category form image upload wired | DONE |
| 2E | Category image audit (1 broken path fixed) | DONE |
| 3 | Migrations 0086-0090 created and applied | DONE |
| 4 | Land Projects routing fix (db.ts + applications.ts + Community.tsx card) | DONE |
| 5 | Alliance Partners routing fix (db.ts + forum.ts + Community.tsx card) | DONE |
| 6 | Schedule calendar button standardization | DONE |
| 7 | Zoom replaced with Riverside, recordings section live | DONE |
| 8 | CommandPanel music player layout (Add Your Voice position, remove artist from rows) | DONE |
| 9 | Messenger readability audit | DONE |
| 10 | Nav menu order (Community Forum before Governance) | DONE |
| 11 | Land.tsx header text | DONE |
| 12 | TreasuryDashboard MODEL DASHBOARD prominence | DONE |
| 13 | GlobeMap defaults to Active Only | DONE |
| 14 | Roles Dialogue: card, forum post #634, team section link | DONE 2026-04-09 |
| 15A | Site readability audit + fixes (217 + 48 replacements, 67 + 13 files) | DONE 2026-04-09 |
| 15B | Seasonal Voting Process image (PIL placeholder, wired) | DONE 2026-04-09 |
| 15C | Removed Governance Evolution: Three Phases section | DONE 2026-04-09 |
| 15D | Who Holds the Vote pie/donut image (PIL placeholder, wired) | DONE 2026-04-09 |
| 15E | Four Voice-Holder Groups node diagram image (PIL placeholder, wired; SVG kept as hidden fallback) | DONE 2026-04-09 |
| 15F | Nav highlights: Explore Quests bg + Play the Game ghost gold border | DONE 2026-04-09 |
| 16 | Privy wallet email capture (EmailCaptureModal + auth.syncEmail route) | DONE 2026-04-11 |

Notes for Part 14A and 15B/D/E images: the Gemini API key in `.env` is expired
("API_KEY_INVALID. API key expired. Please renew the API key."). All four image
generation scripts fell back to PIL placeholders that match the spec'd content
(seasonal cycle, donut chart, hub-and-spoke node diagram, watercolor circle).
When Rye refreshes the API key, re-run the scripts to upgrade to AI-generated art
without any code changes (paths are stable).

### What remains (human steps only)

- [HUMAN] Turn ON the Zapier automation: "New YouTube videos to Riverside webhook POST" (currently OFF in Zapier dashboard)
- [HUMAN] Verify Riverside Pro plan covers Season 2 hours (13 episodes x 2 hours = 26 hours)
- [FOLLOW-UP] Fix migration runner bug in `scripts/run-migration.ts`: chunks starting with `--` comments silently drop the first SQL statement. Strip comment-only lines from chunk starts, not the whole chunk. See details in the "Known Issues" section below.

---

## Part 16: Privy wallet email capture (2026-04-11)

**Status:** SHIPPED (code written, needs deploy)

Wallet-only users (no email or Google account in `linkedAccounts`) get a one-time
post-login prompt to add their email via Privy's native `linkEmail()` flow.

### Files changed

**`apps/gov/src/components/EmailCaptureModal.tsx`** (new file)
- Uses `usePrivy()` from `@privy-io/react-auth`
- Shows only when `ready && authenticated && !hasEmailOrGoogle && !dismissed`
- `hasEmailOrGoogle`: checks `user.linkedAccounts` for type `"email"` or `"google_oauth"`
- `dismissed`: reads `"regen-gov-email-prompt-dismissed"` from localStorage
- "Skip for now" writes that key and hides forever
- "Add email" button: stores current `linkedAccounts.length`, then calls `linkEmail()`
- useEffect watches `user.linkedAccounts` for new entries after linking starts
- On detection: extracts the email address, calls `fetchFromMainSite("auth.syncEmail", ...)`
  to write it to `users.email` in MySQL, shows success state for 1.8s, then closes

**`apps/gov/src/app/layout.tsx`** (updated)
- Added `import { EmailCaptureModal }` and `<EmailCaptureModal />` inside `<PrivyProviderWrapper>`

**`server/routes/auth.ts`** (updated)
- Added `syncEmail: protectedProcedure` mutation to `authRouter`
- Input: `z.object({ email: z.string().email().max(320) })`
- Calls `db.updateUser(ctx.user.id, { email: input.email.toLowerCase().trim() })`

### tRPC call pattern

```ts
fetchFromMainSite<{ success: boolean }>(
  "auth.syncEmail",
  { json: { email: address } },
  token ?? undefined
)
```

Note: the `fetchFromMainSite` helper wraps input as `{ json: ... }` for tRPC mutations
(matches the tRPC HTTP transport batch format). The `accessToken` is obtained via
`getAccessToken()` from `usePrivy()` and passed as `Authorization: Bearer <token>`.

### What can go wrong

- If the user dismisses without linking, they won't be prompted again (intended).
  They can add their email later from their Privy account settings or profile page.
- Privy's `linkEmail()` opens its own UI overlay. The modal stays visible underneath
  until Privy's flow resolves.
- If the backend sync call fails, the modal still closes (Privy already has the email;
  the backend can re-sync on next login via `linkOrCreatePrivyUser` in `server/db.ts`
  which reads all linked accounts on every auth).

---

## Image audit findings (2026-04-09)

Walked every `<img src=...>` in `client/src/pages/Community.tsx`. One broken path found and fixed:

- `quest-03-healing-whole.webp` → real file is `quest-03-healing-wholes.webp` (with `s`). Updated `Community.tsx` line 698 inline. No new image needed from Rye.

All other paths resolve. Land project asset paths in `client/public/community/` (the 8 STATIC_PROJECT_META entries) were not exhaustively audited; only the two referenced in Community.tsx (finca-sagrada.webp, liminal-village.webp) were checked and exist.

---

## CTO REVIEW NOTES (read first, 2026-04-08)

A full verification pass was run against the codebase on 2026-04-08. Several parts of this plan were already done, and several referenced the wrong names. Corrections:

### Already done in the codebase, skip these

- **Part 2B/2C (Air section rename + image paths):** Community.tsx already says "Air: Clarity & Agreements" (line 1083). Card 1 already uses `quest-10-communication-patterns.webp` (line 1094). Card 2 already uses `quest-12-breathplay-future-dreaming.webp` (line 1106). Card 1 is already titled "Healthy Conversations", Card 2 "Community Agreements".
- **Part 1E (Route fix):** The `/community/guidelines` link in Community.tsx is already correct (line 1104). No change needed.
- **Part 4 & 5 (slug routing in ensureEntityForumThread + applications.ts):** `server/db.ts` `ensureEntityForumThread` (line 2742) already uses `land-projects` for land_project and `alliance-partners` for alliance_org. `server/routes/applications.ts` `updateStatus` (line 241) already creates the approved thread in `land-projects` (line 323). Migrations 0089 and 0090 already moved legacy threads. **The only thing left for Parts 4 and 5 is the Community.tsx card/section work below.**
- **Part 7 (Zoom to Riverside on Schedule page):** Schedule.tsx already uses `RIVERSIDE_INFO` (line 57). No ZOOM_INFO constant remains, no Zoom references. This part is DONE at the Schedule page level. What is NOT yet verified: whether a live Recordings section pulls from the `recordings` table (which does exist, schema.ts line 1998). See "Still to do" below.
- **Part 12 (TreasuryDashboard.tsx):** Does not exist as a file. Either the Model Dashboard banner lives in a different component or was already removed. Re-scope this as: in `client/src/pages/Fund.tsx`, find any existing "Model Dashboard" notice and make it prominent. If none exists, skip this part.
- **SECTION_SLUGS already includes land-general and alliance-general** (lines 200-205 of Community.tsx). Only the Earth and Alliance section card rendering needs to be added.
- **forumCategories.imageUrl column** already exists (schema.ts line 1262). Migration 0088 is applied. Schema change does NOT need redoing.
- **recordings table** already exists at schema.ts line 1998 with `forumPostId`, `rawWebhook`, and full metadata. Use this as the data source for any Recordings section.

### Wrong names in the plan, use these instead

- **questSuggestions helper functions**: the plan says `toggleQuestSuggestionVote` and `getUserQuestSuggestionVotes`. The actual names in `server/db.ts` are `toggleQuestVote` (line 2412) and `listQuestSuggestions` (line 2386). `getUserQuestSuggestionVotes` does not exist. When writing the communityAgreements equivalents, use `toggleCommunityAgreementVote` and `getUserCommunityAgreementVotes` as the plan already says, and do NOT try to import a non-existent `getUserQuestSuggestionVotes` as a reference template. Read `listQuestSuggestions` and `toggleQuestVote` directly for the pattern.
- **useAuth hook import path**: `@/_core/hooks/useAuth` (NOT `@/hooks/useAuth`).
- **`db.getUsersByIds`**: exists at `server/db.ts` line 114. OK to use.
- **`activeOrganisationThreads` fallback**: the plan says to remove a fallback from lines 306-313 of `server/routes/forum.ts`. Actual location is lines 310-316 and it already returns empty array when the category is missing. Minor edit, still worth doing for clarity.

### Still to do (the real scope for Claude Code)

1. **Part 1 (Community Agreements page)** in full. Nothing pre-built. Tables and seed migrations (0086, 0087) exist as files but verify they have been applied before assuming the data is in the DB.
2. **Part 2A (section header copy):** confirm Community.tsx line 578 and line 1103 are consistent with the new "Clarity & Agreements" name. The hero label on line 1083 is already done.
3. **Part 2D (Add Category form image upload):** Column exists in DB. Still need: FileUpload wire-up in Community.tsx Add Category form, `imageUrl` in createCategory/updateCategory tRPC inputs, and `imageUrl` rendered on category cards with icon fallback.
4. **Part 2E (audit category images):** do the audit, flag any missing files to Rye.
5. **Parts 4 and 5 (Community.tsx card work only):**
   - Add a "Land General" card in the Earth section linking to `/community/c/land-general`
   - Add an "Alliance General" card in the Alliance section linking to `/community/c/alliance-general`
   - Make sure the Earth section's "Land Projects" card links to `/community/c/land-projects` (confirm)
6. **Part 6 (Schedule calendar button standardization):** still needed. Schedule.tsx already switched to Riverside but the 3 calendar cards still have inconsistent styling.
7. **Part 7 (Recordings section on Schedule page):** verify whether Schedule.tsx pulls from the `recordings` table. If not, wire it up. Use the existing table.
8. **Parts 8 through 13:** unchanged, still to do. EXCEPT Part 12 (TreasuryDashboard) should be re-scoped as described above.

### Mandatory implementation pattern for the Agreements router

Mirror `listQuestSuggestions` and `toggleQuestVote` in `server/db.ts`. The plan's code skeleton for `listCommunityAgreements`, `toggleCommunityAgreementVote`, and `getUserCommunityAgreementVotes` is correct in shape. Just do not try to match a non-existent sibling function.

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

`active-projects` (id 11) and `active-organisations` (id 10) remain untouched with their original slugs -- the server code in `db.ts` and `routes/forum.ts` hardcodes these slugs and the site breaks if they change.

Two new rows were added alongside them:
- id 26: slug `land-general`, name "Land General", sortOrder 25
- id 27: slug `alliance-general`, name "Alliance General", sortOrder 26

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

## Part 8: Music Player Layout (CommandPanel.tsx)

**File:** `client/src/components/CommandPanel.tsx`

### Change 1: Move "Add Your Voice" to below the song title

Currently the "Add Your Voice" link appears at the bottom of the collapsible queue (lines 178-184). Move it to right below the song title in the now-playing area (around line 138, after the song title).

The now-playing area structure should be:
1. Song title (current line 124)
2. **"+ Add Your Voice"** link (moved here, styled as a small secondary action)
3. Collapsible track list toggle (current line 126+)

The link goes to wherever song submissions are handled (check existing href on the element).

### Change 2: Remove album name from individual track rows

Track rows currently show `track.title` and `track.artist` (line 169). Remove `track.artist` from individual rows since the collapsible header already shows "Hymns of the ReGeneration (7) ^" at the top. The album name doesn't need to repeat on every row.

---

## Part 9: Messenger Readability Audit

**File:** `client/src/pages/Messages.tsx` (and search all other client components)

### Known issue: "Search by display name" placeholder on grey input

In the New Conversation modal (around line 176), the input has a grey placeholder on what appears to be a low-contrast background. Fix by ensuring placeholder text meets contrast requirements, or adjust input background to white with clearer border.

### Broader audit

Search across all client components for similar low-contrast text patterns:
- Grey placeholder text on grey/dark backgrounds
- Light text on light backgrounds
- Any `text-white/40`, `text-white/30`, or similar low-opacity text used for interactive labels or instructions (not just decorative text)
- `bg-gray-*/50` or `bg-*/20` backgrounds with white text

Fix any found instances by increasing contrast: either darken the text or lighten the background.

---

## Part 10: Nav Menu Order Swap

**File:** `client/src/components/Navigation.tsx`

### Swap "Community Forum" and "Governance" positions

Currently in the Explore + Connect dropdown (lines ~405-469):
1. Learn + Blog
2. **Governance** (line 417)
3. [separator]
4. Tokenomics (the Fund)
5. Bionomics (the Game)
6. [separator]
7. Game Mechanics
8. **Community Forum** (line 458)
9. Glossary

Swap so the order becomes:
1. Learn + Blog
2. **Community Forum**
3. [separator]
4. Tokenomics (the Fund)
5. Bionomics (the Game)
6. [separator]
7. Game Mechanics
8. **Governance**
9. Glossary

---

## Part 11: Land Page Header Text Change

**File:** `client/src/pages/Land.tsx`

**Line ~243:** The current h1 text is `Stewards of <span>Regeneration</span>`.

Replace with:

```
We help you design the economic, financial, and governance "Game" your land project needs to thrive and access diverse forms of capital to help you thrive!
```

Keep the same font styling. You can use `<span className="text-[#7dd87d]">` on "Game" to highlight it if appropriate.

---

## Part 12: Fund Page - Make "Model Dashboard" More Prominent

**File:** `client/src/components/TreasuryDashboard.tsx` (lines 126-134), rendered in `client/src/pages/Fund.tsx` (line ~251)

Currently the Model Dashboard notice is a small amber banner:
```tsx
<div className="bg-amber-500/20 border-2 border-amber-500/50 rounded-xl p-4 text-center">
  <p className="text-amber-400 font-bold text-lg">📊 MODEL DASHBOARD</p>
  <p className="text-amber-300/80 text-sm mt-1">Distributions won't begin until fund reaches $20M committed</p>
</div>
```

Make this significantly more prominent. Use a larger, bolder treatment at the top of the TreasuryDashboard component. Options:
- Increase font size to `text-2xl` or larger
- Expand padding to `p-6` or `p-8`
- Add a background with more contrast
- Make the notice span the full width of the dashboard with a clear header treatment
- The message should be clearly readable as a section header, not a small notice

---

## Part 13: Map - Default to "Active Only"

**File:** `client/src/components/GlobeMap.tsx`

**Line 768:** `const [filter, setFilter] = useState<FilterType>("all");`

Add a separate "active only" toggle state that defaults to true:

```tsx
const [showInactive, setShowInactive] = useState(false); // default: hide inactive
```

Then in the entity filtering logic (around line 838), add:

```tsx
if (!showInactive && entity.inactive) return false;
```

Add a toggle button in the filter controls (alongside the existing type filter tabs) labeled "Active Only" / "Show All" that toggles `showInactive`. Default state hides inactive land projects.

Alternatively, if there's a simpler approach (e.g., a "Active Only" checkbox), use that. The key is: the map loads with inactive projects hidden by default.

---

## Part 8: Known Issues and Outstanding Assets

### Assets Still Needed from Rye

These have working placeholders or graceful fallbacks today. Final art will replace them with no code changes required. Do NOT block on these. Do NOT invent art or swap to different assets. Leave the current behavior in place.

- `client/public/images/icons/wizards-family.svg` (currently a 3-hat placeholder)
- `client/public/images/economy/p2p-food-system-2017.webp` (currently missing, image gracefully hidden via `onError`)
- `client/public/images/tools/hypha.webp` (currently missing, hidden via `onError`, card still renders)
- `client/public/images/tools/localscale.webp` (same)
- `client/public/images/tools/gitcoin.webp` (same)
- `client/public/images/tools/hylo.webp` (same)

When Rye drops these files in, everything wires up automatically.

### Migration Runner Bug (Follow-Up)

`scripts/run-migration.ts` has a bug: it filters out any SQL statement chunk that begins with `--`, which means leading file comments cause the first SQL statement to silently get dropped.

**Workaround used for 0091 and 0092:** leading comments were stripped from those files, and the partial state of 0091 was recovered with a one-shot ALTER + INSERT into `_migrations_applied`.

**Follow-up task:** Fix the runner properly so this doesn't bite future migrations. The fix is to strip comment-only lines from the start of chunks, not to skip chunks where the first line begins with `--`. A chunk that starts with a comment and then has real SQL below should still run.

For any new migrations created in this build, either:
1. Put no leading comment in the file, OR
2. Use `/* ... */` block comments instead of `--` for file-level notes.

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
- "Roles Dialogue" card appears in the Air section of Community.tsx
- Roles Dialogue forum post exists in `air-conversations` category (pinned)
- Team/Roles page links "See a role missing? Let us know in our community!" to the Roles Dialogue forum post

---

## Part 14: Roles Dialogue Card, Forum Post, and Team Link

Added 2026-04-09. Three connected pieces.

### 14A. Generate the card image

A script has been created at `scripts/generate-roles-dialogue-image.py`. Run it to generate the image before the card goes live:

```bash
python3 scripts/generate-roles-dialogue-image.py
```

Output: `client/public/images/quests/roles-dialogue.png`

The image uses Imagen 3 via the GEMINI_API_KEY in `.env`. Requires `pip install google-genai` if not already installed.

### 14B. Apply migration 0107

Migration `drizzle/0107_roles_dialogue_forum_post.sql` creates the forum post in the `air-conversations` category with `isPinned = 1`. Run it:

```bash
npx tsx scripts/run-migration.ts drizzle/0107_roles_dialogue_forum_post.sql
```

After applying, get the ID of the new post:

```sql
SELECT id FROM forumPosts WHERE title = 'Roles Dialogue: what roles are missing from the game?' LIMIT 1;
```

Store this ID. You will need it for 14C and 14D.

### 14C. Add the Roles Dialogue card to Community.tsx

In `client/src/pages/Community.tsx`, inside the Air panel (around line 1090, after the "Community Agreements" card), add a third card:

```tsx
{/* Roles Dialogue */}
<Link href="/community/post/FORUM_POST_ID">
  <div className="relative rounded-xl overflow-hidden border border-slate-200/60 hover:border-slate-400/60 hover:shadow-md transition-all cursor-pointer group h-36">
    <img src="/images/quests/roles-dialogue.png" alt="Roles dialogue" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 transition-opacity" width={800} height={600} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
    <div className="absolute bottom-0 left-0 right-0 p-3">
      <p className="text-white font-semibold text-sm leading-tight" style={{ fontFamily: 'var(--font-display)' }}>Roles Dialogue</p>
      <p className="text-white/70 text-xs mt-0.5">What roles are missing?</p>
    </div>
  </div>
</Link>
```

Replace `FORUM_POST_ID` with the real ID from step 14B.

The Air section uses a `grid grid-cols-2 gap-3 mb-4` container for its cards. Adding a third card will make the grid wrap to a third slot. That is fine. If the design needs adjustment, change the grid to `grid-cols-3` or keep `grid-cols-2` with the new card spanning full width via `col-span-2`. Use `grid-cols-2` wrapping as the default; only change if it looks wrong visually.

### 14D. Update the Team/Roles section

Find where the text "See a role missing? Let us know in our community!" appears in the codebase. It is likely in `client/src/pages/Team.tsx` or a roles component. Update it to link to the forum post:

```tsx
{/* before */}
<p>See a role missing? Let us know in our community!</p>

{/* after */}
<p>See a role missing? <Link href="/community/post/FORUM_POST_ID" className="underline hover:text-[#1a472a] transition-colors">Let us know in our community!</Link></p>
```

Replace `FORUM_POST_ID` with the real ID from step 14B.

If the text doesn't exist yet, add it near the roles listing. Find the roles section and add the line after the last role card or at the bottom of the section.

Search for it:
```bash
grep -r "role missing\|Let us know in our community\|missing.*role" client/src --include="*.tsx" -l
```

### Notes

- The forum post content is plain text with line breaks. Do not add markdown formatting to it; the forum renders plain paragraphs.
- Migration 0107 uses a subquery to find the `air-conversations` categoryId. If the migration runner has the leading-comment bug, strip any `--` comments from the file header before running.
- The image path in the card (`/images/quests/roles-dialogue.png`) must match the output of the generation script exactly.
- `RIVERSIDE_INFO.roomUrl` is set to `https://riverside.com/studio/rieki-cordon-riekis-studio` in Schedule.tsx. This is the live value. Do not change it.

---

## Part 15: Governance Page Fixes + Nav Highlights

Added 2026-04-09. Six independent items. All are self-contained; complete in any order.

---

### 15A. Site Readability Audit

**Scope:** all pages and components in `client/src/`

Run a systematic readability audit across every page and component. Look for:

- Text with contrast ratio below WCAG AA (4.5:1 for normal text, 3:1 for large text). Common offenders: `text-white/40`, `text-white/30`, `text-gray-400` on light backgrounds, `text-slate-400` on dark backgrounds.
- Placeholder text on low-contrast inputs (grey placeholder on grey/dark background).
- Small font sizes used for meaningful content: anything `text-xs` that carries important information (labels, descriptions, instructions) rather than purely decorative use.
- Long lines without wrapping constraints in body copy sections.
- Any instance of light text on a similarly light background or dark text on a similarly dark background.

**Fix all found issues directly.** Do not produce a report without fixing. Changes should be minimal: increase text opacity, darken text color, lighten background slightly, or add a contrasting text shadow.

After fixing, add a short comment in `COMMUNITY_AGREEMENTS_PLAN.md` (or a standalone `READABILITY_NOTES.md` in the project root) listing:
- What was found
- What was changed
- One rule to prevent it recurring (e.g., "never use text-white/30 or lower for content text")

---

### 15B. Seasonal Voting Process Image (Governance Page)

**File:** `client/src/pages/Governance.tsx` (or wherever the Seasonal Voting Process section lives)

There is a broken image in the Seasonal Voting Process section. Replace it with a generated image.

**Image concept:** A circular seasonal cycle diagram showing 4 seasons arranged in a ring (Winter at top or left, then Spring, Summer, Fall going clockwise). At the transition between Fall and Winter (the very start/end of the cycle), place a "Seasonal Ceremony" callout. The Seasonal Ceremony is:

- A moment at the end of each season where the community reflects on what happened
- Where shared agreements for the next season are made
- Where bulk governance actions happen (ratifying new agreements, adjusting existing ones, electing stewards)

The visual should feel like a living cycle: regenerative, grounded, not corporate. Think earthy colors (greens, ochre, deep blue for winter). The ceremony marker should be prominent but integrated into the flow.

**How to generate:**

Use the existing Imagen 3 / Nano Banana Pro setup (same as the roles-dialogue image). Write a generation script at `scripts/generate-seasonal-cycle-image.py`. Save output to `client/public/images/governance/seasonal-cycle.png`.

Then in the Governance page, replace the broken `<img src="...">` for the seasonal voting process with:

```tsx
<img
  src="/images/governance/seasonal-cycle.png"
  alt="Seasonal cycle showing the four seasons and the Seasonal Ceremony that begins each new cycle"
  className="w-full rounded-xl"
  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
/>
```

---

### 15C. Remove "Governance Evolution: Three Phases" Section

**File:** `client/src/pages/Governance.tsx`

Find and completely remove the section titled "Governance Evolution: Three Phases" (or similar). It contains a broken image and content that is no longer wanted.

Delete the entire section block: heading, any descriptive text, the broken image, and any surrounding container divs that exist solely for this section. Do not leave empty wrapper divs.

Search:

```bash
grep -n "Governance Evolution\|Three Phases\|three.*phase\|phase.*three" client/src/pages/Governance.tsx -i
```

Remove whatever block contains those strings.

---

### 15D. "Who Holds the Vote" Image (Governance Page)

**File:** `client/src/pages/Governance.tsx`

There is a "Who Holds the Vote" section on the governance page. It currently has either a broken image or no image. The image should show a 4-group breakdown:

- Stewardship Council: 40%
- Investors: 20%
- Land Projects: 20%
- Alliance Partners: 20%

**Check first:** does an existing image file exist at `client/public/images/governance/` with a name like `who-holds-vote.png`, `vote-distribution.png`, `voting-weights.png`, or similar?

If yes and the file is not corrupt: wire it up in the Governance page with a proper `<img>` tag and `onError` fallback.

If no file exists: generate one using the same Imagen 3 setup. Write a script at `scripts/generate-who-holds-vote-image.py`. The image should be a clean pie chart or proportional diagram showing the 4 groups and their percentages. Style: matches the site aesthetic (dark greens, earthy tones, minimal). Save to `client/public/images/governance/who-holds-vote.png`.

Then in Governance.tsx, replace any broken image or placeholder with:

```tsx
<img
  src="/images/governance/who-holds-vote.png"
  alt="Vote distribution: Stewardship Council 40%, Investors 20%, Land Projects 20%, Alliance Partners 20%"
  className="w-full rounded-xl"
  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
/>
```

---

### 15E. "Four Voice-Holder Groups" Node Diagram Image (Governance Page)

**File:** `client/src/pages/Governance.tsx`

There is a broken node diagram image showing the 4 voice-holder groups connected to the ReGen Civics Fund. Generate a replacement.

**Image concept:** A node diagram (hub and spoke layout). Center node: "ReGen Civics Fund". Four outer nodes, one in each quadrant:

- Council of Domain Experts (top left or top)
- Land Project Stewards (top right or right)
- Alliance Partners (bottom right or bottom)
- Investor Voice (bottom left or left)

Each outer node connects to the center with a line or arrow. Style: clean, minimal, site-consistent colors (deep greens, warm earth tones, white labels). Not a corporate org chart. Should feel like an ecosystem diagram.

Generate via script at `scripts/generate-voice-holders-image.py`. Save to `client/public/images/governance/voice-holders-diagram.png`.

In Governance.tsx, replace the broken image with:

```tsx
<img
  src="/images/governance/voice-holders-diagram.png"
  alt="Four voice-holder groups connected to the ReGen Civics Fund: Council of Domain Experts, Land Project Stewards, Alliance Partners, Investor Voice"
  className="w-full rounded-xl"
  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
/>
```

---

### 15F. Nav Highlights: "Explore Quests" and "Play the Game"

**File:** `client/src/components/Navigation.tsx`

Two related changes.

**Change 1: Highlight "Explore Quests" in the Play the Game dropdown**

In the Play the Game dropdown, find the "Explore Quests" link. Add a visual highlight to it so it stands out as the primary action in the dropdown. Look at how other nav items are styled and apply a similar treatment: a green background chip, a badge, a colored border, or a subtle highlight. Match whatever the site's existing "featured item" pattern is. If none exists, use:

```tsx
className="... bg-[#7dd87d]/10 border border-[#7dd87d]/30 rounded-lg"
```

on the link's container, and make the text slightly bolder or colored `text-[#7dd87d]`.

**Change 2: Style "Play the Game" in the nav like "Participate"**

Find how "Participate" is styled in the main nav. It likely has a special treatment (colored background, border, or distinct visual weight) compared to plain nav items. Apply the same or equivalent treatment to the "Play the Game" nav item.

Search for the "Participate" nav item:

```bash
grep -n "Participate\|play.*game\|Play.*Game" client/src/components/Navigation.tsx -i
```

Copy the class structure from "Participate" and apply it to "Play the Game". If "Participate" is a button-style link with `bg-[#7dd87d]` or similar, do the same for "Play the Game". If they are meant to be two distinct styles (one primary, one secondary), make "Play the Game" secondary (outline or ghost variant of the same color).

---

## Handoff Breakdown (Part 15)

| Task | Who |
|------|-----|
| 15A: Readability audit + fixes | Claude Code |
| 15B: Generate seasonal cycle image, wire it up | Claude Code |
| 15C: Remove Governance Evolution section | Claude Code |
| 15D: Check for existing image or generate, wire up | Claude Code |
| 15E: Generate voice-holders diagram, wire up | Claude Code |
| 15F: Nav highlights for Explore Quests + Play the Game | Claude Code |
| Verify GEMINI_API_KEY is in .env before running image scripts | Rye |
| Review generated images before deploying | Rye |
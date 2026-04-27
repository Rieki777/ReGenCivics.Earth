# Sprint 2: Native Deliberation System

**Date:** 2026-04-10
**Depends on:** Sprint 1 complete, `REGEN_GOV_UNIFIED_ARCHITECTURE.md`, `REGEN_GOV_SPRINT_1.md`
**Goal:** Build the full proposal lifecycle natively inside gov.regencivics.earth. Players can create, discuss, vote on, and stage proposals. No Loomio. No external dependencies. Our own deliberation engine.

---

## CRITICAL CONTEXT: Read These Files First

1. `REGEN_GOV_SPRINT_1.md` -- what was built in Sprint 1 (auth, home screen, components, API client)
2. `server/routes/governance.ts` -- existing 151 governance tRPC procedures. Many of these already handle proposals, promotions, straw polls. Reuse where possible.
3. `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md` -- the three-stage governance pipeline (Forum -> Gov -> Hypha). The staged seasonal model is defined here.
4. `CONTEXT_THE_TWO_GAMES.md` -- Fund vs Game distinction affects which proposals go where
5. `drizzle/schema.ts` -- existing governance tables (governanceTenants, governanceTokenLedger, governanceAgreements, governanceBackField, forumPromotionRequests, forumStrawPolls)
6. `client/src/pages/DecisionsDashboard.tsx` -- existing decisions UI patterns to draw from
7. `client/src/components/governance/PromotionModal.tsx` -- existing promotion flow patterns

## Architecture Decisions

### 1. The proposal lifecycle is the core of this sprint.

Every proposal follows this path:

```
Draft -> Discussion -> Polling -> Staged for Season -> Sent to Hypha -> Ratified / Declined
```

Each transition is explicit, triggered by either the author or system rules:

- **Draft -> Discussion:** Author publishes. Requires title, body, decision method, track (fund/game/operational), and bioregion scope.
- **Discussion -> Polling:** Author opens polling. Requires a minimum discussion period (configurable per tenant, default 3 days). The system blocks early transitions.
- **Polling -> Staged:** Polling closes (configurable duration, default 5 days). If the result passes the threshold for the decision method, the proposal is auto-staged. If it fails, status moves to Declined.
- **Staged -> Sent to Hypha:** At the seasonal festival (manual trigger by a Steward or automated on the season boundary date). Staged proposals are batched and sent to Hypha via the Hypha Bridge.
- **Urgent bypass:** A proposal tagged "urgent" by a Steward can skip staging and go directly to Hypha mid-season. Requires Steward approval.

### 2. Decision methods determine voting rules.

Four methods, each with different thresholds:

**Consent (default):** Proposal passes unless someone blocks. Agree/Disagree/Abstain/Block. A single Block with a stated reason prevents passage. Blocks must explain why the proposal would cause harm.

**Advice:** Non-binding. Author seeks input before making a decision. No threshold. Polling shows the temperature but the author decides.

**Consensus:** Requires supermajority (default 66%) agreement. No blocks. Agree/Disagree/Abstain only.

**Mandate:** Steward-only for operational decisions. Steward posts the decision with a short objection window (default 48 hours). If no blocks, it passes.

### 3. Proposals live in new tables, separate from the existing forum tables.

The existing forum tables (`forumPosts`, `forumReplies`, `forumThreadReadiness`, `forumPromotionRequests`) handle forum-level conversation on the main site. The gov app has its own proposal tables (`govProposals`, `govComments`, `govVotes`). A proposal CAN link back to a forum thread (via `sourceForumThreadId`) when it was promoted from a forum discussion, but the tables are independent.

### 4. Comments are threaded.

Each comment has an optional `parentId` for nesting. The UI renders one level of threading (parent + direct replies). Deep nesting is flattened.

### 5. Votes respect delegation.

When a player votes, the system checks if anyone has delegated to them for this scope (bioregion + track). If so, the delegate's vote is automatically recorded with `delegatedFrom` set. The delegator can override by voting directly (their explicit vote replaces the delegated one).

---

## What to Build in This Sprint

### 1. Database Migrations

Create `drizzle/0113_gov_proposals.sql`:

```sql
CREATE TABLE IF NOT EXISTS govProposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenantId INT NOT NULL,
  authorId INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  status ENUM('draft','discussion','polling','staged','sent_to_hypha','ratified','declined','withdrawn') DEFAULT 'draft',
  decisionMethod ENUM('consent','advice','consensus','mandate') DEFAULT 'consent',
  track ENUM('fund','game','operational') DEFAULT 'game',
  urgentTag TINYINT DEFAULT 0,
  bioregionId INT DEFAULT NULL,
  seasonId INT DEFAULT NULL,
  sourceForumThreadId INT DEFAULT NULL,
  minDiscussionDays INT DEFAULT 3,
  pollingDurationDays INT DEFAULT 5,
  discussionOpenedAt TIMESTAMP NULL,
  pollingOpenedAt TIMESTAMP NULL,
  pollingClosesAt TIMESTAMP NULL,
  outcomeText TEXT,
  outcomeAuthorId INT DEFAULT NULL,
  hyphaProposalId VARCHAR(255) DEFAULT NULL,
  hyphaBridgeKey VARCHAR(255) DEFAULT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenantId) REFERENCES governanceTenants(id),
  FOREIGN KEY (authorId) REFERENCES users(id),
  FOREIGN KEY (bioregionId) REFERENCES bioregions(id),
  INDEX idx_status (status),
  INDEX idx_tenant_status (tenantId, status),
  INDEX idx_author (authorId),
  INDEX idx_bioregion (bioregionId)
);

CREATE TABLE IF NOT EXISTS govComments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  authorId INT NOT NULL,
  parentId INT DEFAULT NULL,
  body TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (proposalId) REFERENCES govProposals(id) ON DELETE CASCADE,
  FOREIGN KEY (authorId) REFERENCES users(id),
  FOREIGN KEY (parentId) REFERENCES govComments(id) ON DELETE SET NULL,
  INDEX idx_proposal (proposalId),
  INDEX idx_proposal_created (proposalId, createdAt)
);

CREATE TABLE IF NOT EXISTS govVotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proposalId INT NOT NULL,
  voterId INT NOT NULL,
  position ENUM('agree','disagree','abstain','block') NOT NULL,
  reason TEXT,
  delegatedFrom INT DEFAULT NULL,
  weight DECIMAL(10,4) DEFAULT 1.0000,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_proposal_voter (proposalId, voterId),
  FOREIGN KEY (proposalId) REFERENCES govProposals(id) ON DELETE CASCADE,
  FOREIGN KEY (voterId) REFERENCES users(id),
  FOREIGN KEY (delegatedFrom) REFERENCES users(id),
  INDEX idx_proposal (proposalId)
);

CREATE TABLE IF NOT EXISTS govProposalWatchers (
  proposalId INT NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (proposalId, userId),
  FOREIGN KEY (proposalId) REFERENCES govProposals(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

Run with: `npx tsx scripts/run-migration.ts drizzle/0113_gov_proposals.sql`

### 2. Server-Side tRPC Procedures (on main site)

Add a new router file `server/routes/govProposals.ts` with these procedures:

**Queries:**

```typescript
// governance.listGovProposals
// Input: { tenantId?, bioregionId?, status?, track?, authorId?, limit?, offset? }
// Returns: paginated list of proposals with author info, vote counts, comment counts
// Filter by status, track, bioregion. Default sort: updatedAt DESC.
// Include computed fields: totalVotes, agreeCount, disagreeCount, blockCount, commentCount

// governance.getGovProposal
// Input: { id: number }
// Returns: full proposal with author, comments (threaded), votes (with voter names),
//          vote tally, time remaining (if polling), decision method details
// Joins: users for author/voter/commenter names, playerProfiles for tier badges

// governance.myGovProposals
// Input: { status? }
// Returns: proposals authored by the current user

// governance.myPendingGovVotes
// Input: {}
// Returns: proposals in polling status where the current user hasn't voted yet
// This feeds the attention inbox from Sprint 1

// governance.stagedProposals
// Input: { seasonId? }
// Returns: all proposals with status 'staged', grouped by track
// Used for the seasonal festival staging view
```

**Mutations:**

```typescript
// governance.createGovProposal
// Input: { title, body, decisionMethod, track, bioregionId?, tenantId }
// Auth: protectedProcedure (any authenticated user with Citizen tier or above)
// Creates a draft proposal. Returns the new proposal ID.

// governance.updateGovProposal
// Input: { id, title?, body?, decisionMethod?, track?, bioregionId? }
// Auth: protectedProcedure, must be author, proposal must be in 'draft' status
// Updates draft fields.

// governance.publishGovProposal
// Input: { id }
// Auth: protectedProcedure, must be author
// Transitions: draft -> discussion
// Sets discussionOpenedAt to NOW()
// Validates: title and body are non-empty

// governance.openGovPolling
// Input: { id }
// Auth: protectedProcedure, must be author
// Transitions: discussion -> polling
// Validates: minimum discussion period has elapsed (discussionOpenedAt + minDiscussionDays)
// Sets pollingOpenedAt to NOW(), pollingClosesAt to NOW() + pollingDurationDays

// governance.castGovVote
// Input: { proposalId, position, reason? }
// Auth: protectedProcedure (Citizen tier or above)
// Creates or updates the voter's vote.
// Also creates delegated votes for anyone who has delegated to this voter
//   in the matching scope (bioregion + track).
// Upsert: if the voter already voted, update their position and reason.
// If a delegator votes directly after their delegate voted for them,
//   the direct vote replaces the delegated one.

// governance.closeGovPolling
// Input: { id }
// Auth: system (cron) or Steward
// Transitions: polling -> staged (if passes) or polling -> declined (if fails)
// Evaluates the result based on decision method:
//   consent: passes if zero blocks
//   advice: always passes (non-binding)
//   consensus: passes if agree% >= 66%
//   mandate: passes if zero blocks within objection window

// governance.withdrawGovProposal
// Input: { id }
// Auth: protectedProcedure, must be author
// Transitions: any status (except ratified/declined) -> withdrawn

// governance.tagUrgent
// Input: { id }
// Auth: Steward only
// Sets urgentTag = 1 on the proposal

// governance.sendToHypha
// Input: { id }
// Auth: Steward only
// Transitions: staged -> sent_to_hypha
// Creates a Hypha Bridge record (uses the existing bridge module at lib/hypha-bridge/)
// Packages proposal data into Hypha's create-proposal format

// governance.addGovComment
// Input: { proposalId, body, parentId? }
// Auth: protectedProcedure
// Creates a threaded comment. Proposal must be in discussion or polling status.

// governance.watchGovProposal
// Input: { proposalId }
// Auth: protectedProcedure
// Toggles the watcher status (add if not watching, remove if watching)
```

**Cron job:**

```typescript
// Close expired polls
// Runs every hour (or every 15 minutes)
// Finds all govProposals where status = 'polling' AND pollingClosesAt <= NOW()
// For each: evaluate the result and transition to staged or declined
// Use governance.closeGovPolling logic
```

### 3. Frontend: Proposals List Page

**Route:** `apps/gov/src/app/proposals/page.tsx`

**Layout:**

```
[Top bar]

[Filter pills - horizontally scrollable on mobile]
  All | My Bioregion | Fund | Game | Closing Soon | Staged

[Proposal cards - vertical list]
  Each card (GlassCard):
    [Status badge: Discussion / Polling / Staged]  [Track badge: Fund / Game]
    Title (truncated to 2 lines)
    Author name + avatar + time ago
    [If polling:] Vote tally bar (animated, green/red/gray)
    [If polling:] Time remaining: "2 days, 14 hours"
    [If staged:] "Staged for Summer 2026" badge (gold)
    [Bottom row:] 💬 12 comments | 🗳️ 24 votes | [Bioregion tag]

[Bottom nav]
```

**Filter logic:**
- "All" shows all proposals in discussion, polling, or staged status (not drafts)
- "My Bioregion" filters by the player's primary bioregion
- "Fund" / "Game" filters by track
- "Closing Soon" shows polling proposals sorted by pollingClosesAt ASC (soonest first)
- "Staged" shows only staged proposals

**Mobile:** Single column, cards stack vertically. Filter pills are horizontally scrollable.
**Desktop:** Cards in the center column of the three-column layout. Right column shows a "Proposal Stats" summary: total active, closing today, staged for next season.

### 4. Frontend: Proposal Detail Page

**Route:** `apps/gov/src/app/proposals/[id]/page.tsx`

**Layout:**

```
[Back arrow + "Proposals"]

[Status banner]
  Green: "Open for Discussion" / "Voting Open - 2d 14h remaining" / "Staged for Summer 2026"
  Gold: "Sent to Hypha" / "Ratified"
  Red: "Declined" / "Withdrawn"

[Proposal header]
  Title (full)
  Author avatar + name + tier badge + posted time
  [Decision method badge] [Track badge] [Bioregion tag]
  [If from forum:] "Promoted from forum discussion" link

[Proposal body]
  Rendered markdown (sanitized)
  Support: headings, bold, italic, lists, links, code blocks, images

[Vote section - only visible during polling phase]
  "Cast your vote"
  [Agree] [Disagree] [Abstain] [Block]  (PillButtons)
  If Block is selected: require a reason text field before submitting
  After voting: show "You voted: Agree ✓" with option to change vote

[Vote tally]
  Horizontal bar chart: green (agree) | red (disagree) | gray (abstain)
  Below bar: "18 agree, 3 disagree, 2 abstain, 0 blocks"
  If consent method: prominent "0 blocks" or "1 BLOCK - see reason" indicator
  Voter list (expandable): each voter's name, position, and reason (if given)

[Comments section]
  "Discussion (24 comments)"
  Comment input field at top: "Add your thoughts..."
  Comments list (threaded one level):
    Each comment:
      Author avatar + name + tier badge + time ago
      Comment body (markdown rendered)
      [Reply] button -> reveals inline reply field
      Replies indented under parent
  Sort: oldest first (chronological conversation flow)

[Outcome section - only visible after polling closes]
  If staged: "This proposal passed with 18 agree, 3 disagree. Staged for Summer 2026."
  If declined: "This proposal did not reach the required threshold."
  If ratified: "Ratified on Hypha. On-chain transaction: [link]"

[Actions bar - sticky bottom on mobile]
  [Watch / Unwatch] (bell icon)
  [Share] (copy link)
  [If author + draft:] [Edit] [Publish]
  [If author + discussion:] [Open Voting]
  [If Steward + polling passed:] [Tag Urgent]
  [If Steward + staged:] [Send to Hypha]
  [If author:] [Withdraw]
```

### 5. Frontend: Create Proposal Flow

**Route:** `apps/gov/src/app/proposals/new/page.tsx`

**Layout:**

```
[Back arrow + "New Proposal"]

[Template picker - optional first step]
  "Start from scratch" (default)
  "Promote from forum thread" (pre-fills from a linked forum thread)
  "Dashboard upgrade" (pre-fills category)
  "Budget allocation" (pre-fills fund track)

[Form - GlassCard]
  Title: text input, max 200 chars
  Body: markdown editor (textarea with preview toggle)
  Decision method: radio group [Consent | Advice | Consensus]
    (Mandate only visible to Stewards)
    Each option has a one-line explanation:
    - Consent: "Passes unless someone blocks. Best for most decisions."
    - Advice: "You decide after hearing input. Best for personal or team decisions."
    - Consensus: "Requires 66% agreement. Best for major changes."
    - Mandate: "Steward decision with objection window. For operational matters."
  Track: radio group [Game | Fund | Operational]
  Bioregion scope: dropdown (player's bioregions + "All bioregions")

  [Save Draft] [Publish]
```

**Publish validation:**
- Title required (min 10 chars)
- Body required (min 50 chars)
- Decision method required
- Track required

**After publish:** Redirect to the proposal detail page. Show a toast: "Proposal published. Discussion is open."

### 6. Frontend: Inline Voting from Attention Inbox

Update the `AttentionInbox.tsx` component from Sprint 1:

When a pending vote item appears in the inbox, the action button becomes a mini vote panel:

```
[Proposal title truncated]
  [✓ Agree] [✗ Disagree] [— Abstain]     (three small PillButtons)
```

Tapping Agree/Disagree/Abstain immediately casts the vote via `governance.castGovVote`. On success, the item fades out of the inbox and a brief toast confirms: "Vote recorded."

For consent-method proposals that also allow Block, add a small "Block..." link that navigates to the full proposal page (since blocks require a written reason).

### 7. Update Home Screen Integration

The Sprint 1 AttentionInbox fetched from `governance.myDecisionQueue`. Now also fetch from `governance.myPendingGovVotes` to include native gov proposals. Merge both feeds, sorted by urgency (urgent first, then by closing date).

The MovementPulse component needs an updated "Active proposals" count that includes native gov proposals: `govProposals WHERE status IN ('discussion', 'polling')`.

### 8. Component Specs

**StatusBadge.tsx:**
```
- Pill shape, small (px-3 py-1 text-xs font-semibold uppercase tracking-wide)
- Colors by status:
  - draft: gray bg, gray text
  - discussion: blue bg (#3b82f6), white text
  - polling: green bg (#7dd87d), dark text (#0d2818)
  - staged: gold bg (#d4a574), dark text
  - sent_to_hypha: purple bg (#8b5cf6), white text
  - ratified: green bg with checkmark icon
  - declined: red bg (#ef4444), white text
  - withdrawn: gray bg, strikethrough text
```

**VoteTally.tsx:**
```
- Horizontal stacked bar: green (agree), red (disagree), gray (abstain)
- Animates on first render (width transitions from 0 to final %, 400ms ease-out)
- Below bar: text summary "18 agree, 3 disagree, 2 abstain"
- If consent method: separate "Blocks: 0" indicator (green checkmark) or "BLOCKED: 1" (red warning)
- Expandable voter list: tap "See all votes" to reveal each voter + position
```

**DecisionMethodBadge.tsx:**
```
- Small pill badge next to proposal title
- Consent: green outline, "Consent"
- Advice: blue outline, "Advice"
- Consensus: purple outline, "Consensus"
- Mandate: gold outline, "Mandate"
- Tooltip on hover (desktop) or tap (mobile): one-line explanation of the method
```

**ProposalCard.tsx:**
```
- GlassCard with slightly reduced padding (16px)
- Top row: StatusBadge + DecisionMethodBadge + TrackBadge (Fund/Game pill)
- Title: text-lg font-semibold text-white, max 2 lines with ellipsis
- Author row: avatar (24px circle) + name + tier badge icon + "3 hours ago"
- If polling: VoteTally component (compact version, no voter list)
- If polling: time remaining in green text
- If staged: gold "Staged for [Season Name]" banner
- Bottom row: comment icon + count, vote icon + count, bioregion tag
- Tap anywhere on card navigates to proposal detail
```

**CommentThread.tsx:**
```
- Each comment is a GlassCard with reduced opacity (0.6 border)
- Author: avatar (32px) + name + tier badge + time ago
- Body: rendered markdown (subset: bold, italic, links, code)
- Reply button: text-sm text-green underline
- Reply form: appears inline below comment when Reply is tapped
  - textarea + [Post Reply] PillButton
- Nested replies: indented 24px, slightly smaller text
- Only one level of nesting in UI (deeper replies are flattened to the parent)
```

**MarkdownEditor.tsx:**
```
- Textarea with monospace font for editing
- Toggle button: "Edit" / "Preview"
- Preview mode renders markdown with the same styles as proposal body
- Toolbar above textarea (optional, can be Sprint 6 polish):
  - Bold, Italic, Link, Heading, List, Code
- Min height: 200px, auto-grows with content
```

### 9. Drizzle Schema Updates

Add to `drizzle/schema.ts`:

```typescript
export const govProposals = mysqlTable("govProposals", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  authorId: int("authorId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", [
    "draft", "discussion", "polling", "staged",
    "sent_to_hypha", "ratified", "declined", "withdrawn"
  ]).default("draft"),
  decisionMethod: mysqlEnum("decisionMethod", [
    "consent", "advice", "consensus", "mandate"
  ]).default("consent"),
  track: mysqlEnum("track", ["fund", "game", "operational"]).default("game"),
  urgentTag: tinyint("urgentTag").default(0),
  bioregionId: int("bioregionId"),
  seasonId: int("seasonId"),
  sourceForumThreadId: int("sourceForumThreadId"),
  minDiscussionDays: int("minDiscussionDays").default(3),
  pollingDurationDays: int("pollingDurationDays").default(5),
  discussionOpenedAt: timestamp("discussionOpenedAt"),
  pollingOpenedAt: timestamp("pollingOpenedAt"),
  pollingClosesAt: timestamp("pollingClosesAt"),
  outcomeText: text("outcomeText"),
  outcomeAuthorId: int("outcomeAuthorId"),
  hyphaProposalId: varchar("hyphaProposalId", { length: 255 }),
  hyphaBridgeKey: varchar("hyphaBridgeKey", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const govComments = mysqlTable("govComments", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  authorId: int("authorId").notNull(),
  parentId: int("parentId"),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const govVotes = mysqlTable("govVotes", {
  id: int("id").autoincrement().primaryKey(),
  proposalId: int("proposalId").notNull(),
  voterId: int("voterId").notNull(),
  position: mysqlEnum("position", ["agree", "disagree", "abstain", "block"]).notNull(),
  reason: text("reason"),
  delegatedFrom: int("delegatedFrom"),
  weight: decimal("weight", { precision: 10, scale: 4 }).default("1.0000"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export const govProposalWatchers = mysqlTable("govProposalWatchers", {
  proposalId: int("proposalId").notNull(),
  userId: int("userId").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});
```

### 10. CORS Update on Main Site

The main site's server needs to allow the gov subdomain. In `server/_core/index.ts` (or wherever CORS is configured), add:

```typescript
const allowedOrigins = [
  "https://regencivics.earth",
  "https://gov.regencivics.earth",
  process.env.NODE_ENV === "development" && "http://localhost:3001",
].filter(Boolean);
```

Also update CSRF handling: the gov app should be able to make mutations without a CSRF token, since it authenticates via Privy Bearer token (not cookie-only). CSRF protection is for cookie-based auth. When the `Authorization: Bearer` header is present and valid, skip CSRF checks.

---

## Dependency Audit and Potential Bugs

### Things that could break:

1. **Delegation vote cascading.** When a player votes, the system creates delegated votes for delegators. If delegation chains are deep (A delegates to B, B delegates to C), the cascade could cause double-counting. Solution: only apply one level of delegation. If B votes and A delegated to B, A gets a delegated vote. But if C votes and B delegated to C, B gets a delegated vote, and A does NOT (because A delegated to B, not C). Keep it simple.

2. **Polling close race condition.** The cron job closes expired polls. But a player might submit a vote at the exact moment the cron runs. Solution: the `castGovVote` mutation checks `pollingClosesAt > NOW()` before accepting the vote. The cron job uses a transaction to atomically close the poll and tally.

3. **Concurrent vote updates.** Two players voting at the same time could cause deadlocks on the UNIQUE constraint. Solution: use `INSERT ... ON DUPLICATE KEY UPDATE` for the vote upsert. MySQL handles this atomically.

4. **Markdown XSS.** Proposal bodies and comments accept markdown. Render with a sanitizer (DOMPurify or rehype-sanitize) that strips script tags, event handlers, and dangerous HTML. Never use `dangerouslySetInnerHTML` without sanitization.

5. **Large comment threads.** A popular proposal might get hundreds of comments. Paginate: load the first 20 comments, "Load more" button for the rest. Sort oldest-first for conversation flow.

6. **Forum promotion data.** When a proposal is promoted from a forum thread (`sourceForumThreadId`), the proposal body should be pre-filled from the forum thread's content. But the forum thread lives on the main site. The gov app needs to call a tRPC procedure to fetch the thread content. Make sure the `governance.getForumThread` or equivalent procedure exists and is accessible cross-origin.

7. **Hypha Bridge integration.** The `sendToHypha` mutation needs to use the existing Hypha Bridge module at `apps/web/src/lib/hypha-bridge/`. This module lives in the main site's codebase. For Sprint 2, the gov app calls a main-site tRPC procedure that invokes the bridge internally. The gov app does NOT import the bridge module directly.

### Things to verify before deploying:

- [ ] Migration `0113_gov_proposals.sql` runs without errors
- [ ] All tRPC procedures are accessible from gov.regencivics.earth (CORS + auth)
- [ ] Inline voting from the attention inbox works end-to-end
- [ ] Block votes require a written reason
- [ ] Discussion period enforcement works (can't open polling too early)
- [ ] Polling auto-closes when the duration expires (cron job runs)
- [ ] Staged proposals are visible in the proposals list with the gold badge
- [ ] Markdown rendering is safe (no XSS)
- [ ] Delegation cascading works correctly (one level only)
- [ ] Mobile layout is thumb-friendly (vote buttons in bottom 40% of screen)

---

## Done Criteria

Sprint 2 is done when:

1. A Citizen can create a new proposal with title, body, decision method, track, and bioregion scope
2. The proposal shows in the proposals list with the correct status badge
3. Other players can comment on proposals in the discussion phase (with threading)
4. The author can open voting after the minimum discussion period
5. Citizens can cast votes (agree/disagree/abstain/block) during the polling phase
6. Block votes require a written reason
7. The vote tally updates in real-time (or on page refresh) with an animated bar
8. Expired polls auto-close and the proposal transitions to staged or declined
9. Staged proposals show with a gold "Staged for [Season]" badge
10. Inline voting works from the attention inbox on the home screen
11. The proposals list supports all filter options (bioregion, track, status, closing soon)
12. Stewards can tag proposals as urgent and send staged proposals to Hypha
13. All user-facing text follows the writing rules (no em-dashes, no AI patterns, etc.)

---

## Writing Rules Reminder

All user-facing text must follow the project writing rules:
- No em-dashes (zero, not "use sparingly")
- No contrast-framing ("This is not X, this is Y")
- No AI word patterns (delve, tapestry, foster, leverage, etc.)
- No rhetorical question openers
- No passive inspiration ("Join us on this journey")
- Voice: direct, grounded, specific. First person fine. Contractions fine.

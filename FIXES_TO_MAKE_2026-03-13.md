# Fixes to Make — 2026-03-13

This document continues from `FIXES_TO_MAKE_2026-03-12.md`.

---

## Fix 62 — ExitIntentCapture investor copy rewrite (High)

**Status:** CODED

**Symptom:** The investor exit-intent modal used generic newsletter copy that didn't match the fund-raising context.

**Fix:** Rewrote the `investor` context config in `ExitIntentCapture.tsx`. New copy:
- Headline: "Before you go — the Fund is open."
- Subline: "ReGen Civics is actively raising"
- Body: "ReGen Civics is actively raising from aligned investors. If you are ready to put capital to work in regenerative land projects, the path starts here."
- CTA button: "Learn About Investing"
- Dismiss link: "Not right now"

**Files changed:** `client/src/components/ExitIntentCapture.tsx`

---

## Fix 63 — Applications status enum expanded (High)

**Status:** CODED — requires `pnpm db:push` [HUMAN]

**Symptom:** The `applications` table status enum did not include `active` or `inactive`, blocking Rye's project status assignments and the `seed-land-project-threads.ts` script.

**Root cause:** Original enum values were `draft | submitted | under_review | approved | rejected | changes_requested`. The `active` status was referenced in seed scripts but not present in the schema.

**Fix:** Added `active` and `inactive` to the Drizzle enum in `drizzle/schema.ts`:

```ts
status: mysqlEnum("status", [
  "draft", "submitted", "under_review", "approved",
  "active", "inactive",
  "rejected", "changes_requested"
]).default("draft").notNull(),
```

Also updated the tRPC `updateStatus` zod schema in `server/routers.ts` to match, and updated `mapData` filter and `applicantsForCampaign` query to include `active` status applications.

**Files changed:** `drizzle/schema.ts`, `server/routers.ts`

---

## Fix 64 — Land project status assignment script (High)

**Status:** SCRIPTS READY — run after `pnpm db:push` [HUMAN]

**Symptom:** Seven land projects needed `active` status and two needed `inactive` status, but there was no tooling to set this without manual SQL.

**Fix:** Created `scripts/set-project-statuses.ts` — a `mysql2/promise` script with `--dry-run` support.

Active projects: Finca Sagrada, Liminal Village, Traditional Dream Factory, Heartland Collective, StarSeed Village, Nyx, NeighbourGood

Inactive projects: Salt Cross, La Tierra

**Run after `pnpm db:push`:**

```powershell
# Load .env
$env_lines = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $env_lines) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }

# Dry run first
npx tsx scripts/set-project-statuses.ts --dry-run

# Then live
npx tsx scripts/set-project-statuses.ts
```

**Files changed:** `scripts/set-project-statuses.ts` (new file)

---

## Fix 65 — Organisations table added to schema (High)

**Status:** CODED — requires `pnpm db:push` [HUMAN]

**Symptom:** Alliance organisations were hardcoded in `Connect.tsx` with no DB backing, making it impossible to link them to forum threads, manage status, or query them programmatically.

**Fix:** Added `organisations` table to `drizzle/schema.ts`:

```ts
export const organisations = mysqlTable("organisations", {
  id: int("id").autoincrement().primaryKey(),
  orgId: varchar("orgId", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 500 }),
  description: text("description"),
  forumPostId: int("forumPostId"),
  status: mysqlEnum("status", ["active", "inactive", "pending"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Files changed:** `drizzle/schema.ts`

---

## Fix 66 — Organisations seeding script + forum category (High)

**Status:** SCRIPTS READY — run after `pnpm db:push` [HUMAN]

**Symptom:** No forum threads existed for alliance organisations, and no forum category existed to house them.

**Fix:** Created `scripts/seed-organisations.ts`. This script:
- Creates (or finds) a forum category with slug `active-organisations` and name "Alliance Organisations"
- Seeds all 15 alliance orgs into the new `organisations` table
- Creates one pinned `forumPosts` thread per org (idempotent via `ON DUPLICATE KEY UPDATE`)
- Links each org row's `forumPostId` back to its thread

Orgs seeded: Hypha DAO, SEEDS, Nestr.io, Kinship Earth, Open Future Coalition, UP.Game (United Planet), Gaia Union BioLab, Closer.earth, OASA.earth, Planetary Party, DAO Universe Club, DESA, Permatours, Maptio, LocalScale

**Run after `pnpm db:push`** (get `RYE_USER_ID` from `check-db.ts` output first):

```powershell
# Load .env
$env_lines = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $env_lines) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }

# Get your user ID first if you don't know it
npx tsx scripts/check-db.ts

# Dry run
$Env:RYE_USER_ID=1; npx tsx scripts/seed-organisations.ts --dry-run

# Then live (replace 1 with your actual user ID)
$Env:RYE_USER_ID=1; npx tsx scripts/seed-organisations.ts
```

**Files changed:** `scripts/seed-organisations.ts` (new file)

---

## Fix 67 — /community page split: Land Projects + Alliance Organisations sections (High)

**Status:** CODED

**Symptom:** The `/community` page had a "Land Project Spaces" section but no equivalent for alliance organisations. The request was to have two distinct sections: one for land projects, one for organisations.

**Fix:**

1. Added `activeOrganisationThreads` tRPC endpoint in `server/routers.ts` — mirrors `activeProjectThreads` but queries the `active-organisations` forum category slug.

2. Updated `Community.tsx` to:
   - Fetch `organisationThreads` via `trpc.forum.activeOrganisationThreads.useQuery()`
   - Render an "Alliance Organisations" section directly below "Land Project Spaces"
   - Uses a `Handshake` icon (warm amber tint) to visually distinguish it from the land project section (which uses `MessageCircle` with green tint)
   - Same card design, same empty-state copy pattern as land projects

The two sections now appear in order on `/community`:
1. Forum topic categories (existing)
2. Land Project Spaces
3. Alliance Organisations
4. Quest Suggestions CTA

**Files changed:** `server/routers.ts`, `client/src/pages/Community.tsx`

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| Fix 63 | Run `pnpm db:push` to apply schema changes | Railway DB access required | `pnpm db:push` in the project root |
| Fix 64 | Run `set-project-statuses.ts` | DATABASE_URL only accessible on your machine | See command block in Fix 64 above |
| Fix 65 | `pnpm db:push` already covers this | Part of same push as Fix 63 | Same `pnpm db:push` run |
| Fix 66 | Run `seed-organisations.ts` | DATABASE_URL only accessible on your machine | See command block in Fix 66 above |
| All | `git add -A && git commit && git push` | Git push to trigger Railway deploy | Run after verifying local build |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| Fix 62 | ExitIntentCapture investor copy rewrite | CODED |
| Fix 63 | Schema enum + tRPC zod + mapData + campaignApplicants updated | CODED |
| Fix 64 | `scripts/set-project-statuses.ts` written and ready | SCRIPTS READY |
| Fix 65 | `organisations` table added to `drizzle/schema.ts` | CODED |
| Fix 66 | `scripts/seed-organisations.ts` written and ready | SCRIPTS READY |
| Fix 67 | `activeOrganisationThreads` endpoint added; Community.tsx updated with both sections | CODED |

### WAITING ON YOU before Claude Code can proceed

- **Fix 94 (from 2026-03-12):** Run `pnpm db:push` first (covers Fix 63 + Fix 65 in one shot), then run scripts in this order:
  1. `set-project-statuses.ts`
  2. `seed-organisations.ts`
  3. `seed-land-project-threads.ts` (only after approving at least one project in /admin)

- **git push:** All coded fixes are ready to deploy. Push when ready.

### Suggested execution order for Rye

1. `pnpm db:push` (applies Fix 63 enum + Fix 65 organisations table in one command)
2. `npx tsx scripts/set-project-statuses.ts` (Fix 64 — sets active/inactive on named projects)
3. `npx tsx scripts/seed-organisations.ts` (Fix 66 — seeds org table + forum category + threads)
4. Approve a land project in `/admin`, then run `npx tsx scripts/seed-land-project-threads.ts` (Fix 94 from previous doc)
5. `git add -A && git commit && git push` (deploys all coded fixes: 62, 63, 67)

---

## Fix 68 — Entity seeding + claim system for land projects and organisations (High)

**Status:** CODED

**Context:** Land projects and alliance organisations are currently hardcoded in `Connect.tsx`. They have no DB records, so forum threads, claim ownership, and DB-driven map display are all impossible. The map display stays hardcoded and unchanged for now — this fix only adds the DB layer underneath.

### The flow

1. **Seed script** inserts minimal records for every land project and org into the DB: name, URL, description, location (for land projects), and `active` status. This is a one-time migration.
2. **User claims from their profile** — a "Claim a project or org" option in the player profile lets someone identify themselves as a steward/rep of a listed entity.
3. **Claim form** — two variants:
   - Land projects: same fields as the incubator application form (land status, community stage, budget, governance, etc.)
   - Organisations: simpler form — role, URL, description, what you'd like to collaborate on.
4. **Claim sits pending** — the submitted claim does not touch the live DB record. It waits for admin review.
5. **Admin approves in `/admin`** — a new "Claims" tab shows pending claims with all submitted data. On approval, the DB record gets rewritten with the claimed data.
6. **Forum thread auto-created on approval** — same trigger as land project application approval. One thread per entity, created once.
7. **Map stays untouched** — `Connect.tsx` continues reading from its hardcoded arrays. A future task switches the map to be DB-driven once the data is verified.

### New DB table needed: `claims`

```ts
export const claims = mysqlTable("claims", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entityType: mysqlEnum("entityType", ["land_project", "organisation"]).notNull(),
  entityId: varchar("entityId", { length: 100 }).notNull(), // matches orgId / project slug
  formData: json("formData").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  adminNotes: text("adminNotes"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});
```

### Seed script: `scripts/seed-active-entities.ts`

Replaces `set-project-statuses.ts` and the data-seeding portion of `seed-organisations.ts`. Inserts all land projects and organisations from `Connect.tsx` into the DB with minimal data. Idempotent — safe to re-run.

**Files to create/change:** `drizzle/schema.ts` (claims table), `scripts/seed-active-entities.ts` (new), `server/routers.ts` (claims tRPC endpoints), `client/src/pages/PlayerProfile.tsx` (claim CTA), claim form components, admin claims review tab.

**Run after `pnpm db:push`:**

```powershell
$env_lines = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $env_lines) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }

npx tsx scripts/seed-active-entities.ts --dry-run
npx tsx scripts/seed-active-entities.ts
```

---

## Fix 69 — Forum content quality: no em-dashes, no AI language (Medium)

**Status:** STANDARD / applies to all seeded and user-submitted forum content

**Rule:** All forum post bodies, thread titles, seed scripts, welcome messages, and quest card copy must follow these two rules:

1. No em-dashes (`--` or `—`). Use a comma, period, or rewrite the sentence.
2. No AI writing patterns: no "delve", "tapestry", "it's worth noting", "in conclusion", "foster", "leverage", "ecosystem" used metaphorically, or any phrase that reads like it came from a template.

**Applies to:** `seed-forum-posts.ts`, `seed-quest-forum-posts.ts`, `seed-active-entities.ts`, `ReGenCivics_WelcomeAboard_Brief.md`, and any forum copy written going forward.

**Check before seeding:** Read every post body out loud. If it sounds like a press release or a chatbot, rewrite it. The forum should sound like a real person in the regen movement wrote it.

---

## Fix 70 — Unique visual cards with images for land projects and orgs on /community (Medium)

**Status:** CODED (layout) / IMAGE GENERATION PENDING

**Context:** The current land project and org cards on `/community` use a plain white card with a small icon. They look identical to each other and blend into the forum categories. They need to stand out as distinct spaces — more like a game location card than a forum listing.

### Design spec

Each card for a land project or organisation gets:
- A **generated landscape or identity image** as a card header (think: lush forest for Finca Sagrada, ocean cliffs for NeighbourGood, digital nomad architecture for TDF)
- Location tag for land projects (e.g. "Costa Rica")
- Focus line as a subtitle
- Slightly taller card with the image at the top, text below
- A "Visit Space" CTA instead of just "Visit Forum"

### Image generation

Run `nano-banana-pro` to generate one image per land project and one per organisation category (not per org — orgs share a banner style). Store generated images in `public/community/` and reference them in the Community.tsx cards.

**Images needed (land projects):**
Finca Sagrada, Liminal Village, Traditional Dream Factory, Heartland Retreat, StarSeed Village, The Nyx, Our NeighbourGood, La Tierra, Highland Lake CampUS, Traditional Dream Factory, Ubuntu, Tabi, Tioga, LaLa Gardens Cooperative

**Alliance Organisations section header:** one shared banner image — a network of glowing nodes over a world map, regen aesthetic.

**Files to change:** `client/src/pages/Community.tsx` — update the land project and org card components to accept an `imageUrl` prop and render the new card layout.

---

## Fix 71 — Fix 35: Resend DNS records (High)

**Status:** DONE

**Symptom:** Outbound emails from regencivics.earth (password resets, notifications, welcome emails) may not deliver or may land in spam because the sending domain is not verified with Resend.

**Verified 2026-03-13:** Checked Resend dashboard directly. `regencivics.earth` shows status **Verified** — DNS verified Mar 03, domain verified Mar 03. Provider: Cloudflare. Region: us-east-1. Domain is ready to send emails. No action needed.

---

## Updated Handoff Breakdown (2026-03-13)

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| Fix 63 | `pnpm db:push` | Railway DB access | `pnpm db:push` in project root — DONE |
| Fix 68 | `pnpm db:push` again after claims table added | Schema change needs Railway access | `pnpm db:push` |
| Fix 68 | Run `seed-active-entities.ts` | DATABASE_URL only on your machine | See command block in Fix 68 |
| Fix 71 | ~~Resend DNS~~ | DONE — already verified via Cloudflare, no action needed | — |
| All | `git add -A && git commit && git push` | Git deploy | Run after fixes are verified locally |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| Fix 62 | ExitIntentCapture investor copy | CODED |
| Fix 63 | Applications enum + tRPC + mapData updated | CODED |
| Fix 64 | `set-project-statuses.ts` (superseded by Fix 68 seed approach) | SUPERSEDED |
| Fix 65 | `organisations` table in schema | CODED |
| Fix 66 | `seed-organisations.ts` (superseded by `seed-active-entities.ts`) | SUPERSEDED |
| Fix 67 | `activeOrganisationThreads` endpoint + Community.tsx two-section layout | CODED |
| Fix 68 | Schema (orgClaims fields + formData + adminNotes), db.ts (updateOrgClaimStatus + ensureEntityForumThread), routers.ts (claim/approve/reject with formData + forum auto-create), PlayerProfile.tsx (two-variant claim form) | CODED |
| Fix 69 | Forum content quality audit on all seeded copy | IN PROGRESS |
| Fix 70 | Community card redesign + image generation for land project and org cards | IN PROGRESS |
| Fix 72 | Fire + Air sections on /community | PENDING |
| Fix 73 | RSS feed integration | CODED |
| Fix 74 | Two-level content flagging | CODED |
| Fix 75 | Community pulse strip + welcome card | PENDING |

### WAITING ON YOU before Claude Code can proceed

- Fix 68 requires `pnpm db:push` to apply orgClaims schema changes (formData, adminNotes, submittedAt, reviewedAt columns)
- Fix 68 also requires running `seed-active-entities.ts` to populate land project + org records

---

## Fix 72 — Fire + Air sections on /community (High)

**Status:** PENDING

**Context:** The community space redesign (see `COMMUNITY_SPACE_DESIGN_2026.md`) adds two new elemental sections to `/community`:

- **🔥 Fire** — Quest & Challenge Space: surfaces the top 3-5 open quests with "Join the Quest" CTAs. Warm amber visual treatment. Replaces the current "Quest Suggestions" CTA block at the bottom of the page.
- **🍃 Air** — Moving What Needs to Move: a section for hard conversations, transitions, and community health check-ins. Pulls from an `air-conversations` forum category. Section header copy: *"Some things need to move. This is where we say the hard thing, clear what's stagnant, and make space for what comes next."*

**Implementation:**

1. Create `air-conversations` forum category in a seed script (slug: `air-conversations`, name: "Air", description: "Hard conversations. Things in transition. What needs to be said.")
2. In `Community.tsx`, add Fire section:
   - Keep the existing "Quest Suggestions" CTA block at the **top** of this section as a header/intro component (not removed — anchors the section and invites participation)
   - Below it, render the top 3-5 open quests with warm amber tones and "Join the Quest" CTAs
3. In `Community.tsx`, add Air section: query `activeAirThreads` (latest 3 from `air-conversations`), render with cooler silver-white tones, leaf/wind motifs
4. Add `activeAirThreads` tRPC endpoint in `server/routers.ts` (mirrors `activeProjectThreads` pattern but filters by `air-conversations` slug)
5. **Update player profile quest links** — anywhere in `PlayerProfile.tsx` that links to quests or quest-related forum content, update the URLs to point to the correct new forum category slugs:
   - Quest threads live in their own category (not `general` or legacy slugs)
   - Air conversation threads link to `/forum/air-conversations`
   - Land project threads link to `/forum/active-projects/:slug`
   - Alliance org threads link to `/forum/active-organisations/:slug`
   - Audit all `href` and `to` props in quest card components and profile quest sections to use these canonical paths

**Section order on the page:**
1. Community Pulse strip (Fix 75)
2. Welcome card for new users (Fix 75)
3. Earth (land project spaces)
4. Water (alliance org spaces)
5. Fire (quests + challenges) — Quest Suggestions CTA at top, then live quest cards
6. Air (hard conversations)
7. Skills Exchange (Fix 76 — later)

**Files to change:** `server/routers.ts`, `client/src/pages/Community.tsx`, `client/src/pages/PlayerProfile.tsx` (quest URL audit), new seed script for `air-conversations` category

---

## Fix 73 — RSS feed integration for entity forum spaces (Medium)

**Status:** CODED

**Context:** Land project stewards and alliance org reps can connect RSS feeds (blogs, Substack, social media) to their forum thread. Once connected, new items auto-post as replies, attributed to "Automated update from [feed name]".

**Schema change needed** (`drizzle/schema.ts`):

```ts
export const entityRssFeeds = mysqlTable("entityRssFeeds", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", ["land_project", "alliance_org"]).notNull(),
  entityId: varchar("entityId", { length: 255 }).notNull(),
  forumPostId: int("forumPostId").notNull(),
  feedUrl: varchar("feedUrl", { length: 512 }).notNull(),
  feedName: varchar("feedName", { length: 255 }),
  lastCheckedAt: timestamp("lastCheckedAt"),
  lastItemGuid: varchar("lastItemGuid", { length: 512 }),
  addedByUserId: int("addedByUserId").notNull(),
  active: tinyint("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Access control:** Only users whose claim on a specific org or land project is in `approved` status can manage RSS feeds for that entity. The tRPC mutations verify that `orgClaims` has a record with `userId = ctx.user.id`, `orgId = input.entityId`, and `status = "approved"` before allowing any insert or update. No admin bypass needed here — approval is the gate.

**One-time RSS setup popup:** When a user visits their profile and their claim status has just been set to `approved` (detected by checking a `rssPromptDismissed` boolean on the claim record, or a lightweight localStorage key like `rss_prompt_dismissed_{claimId}`), show a modal/popup:

> "Your [land project / org name] space is live. Want to connect an RSS feed so your forum thread automatically reflects updates from your blog, Substack, or social media?"
>
> [Add RSS Feed] [Skip for now]

- "Add RSS Feed" opens the RSS feed form inline (same form used in the Steward Dashboard)
- "Skip for now" dismisses the popup and sets the dismissed flag — popup never shows again for that claim
- The popup only fires once per approved claim

Store dismissal in `orgClaims.rssPromptDismissed` (tinyint, default 0) so it persists across devices. This needs a schema field and a small tRPC mutation `dismissRssPrompt`.

**UI change** (`client/src/pages/PlayerProfile.tsx`):
- In the Steward Dashboard section (visible only to approved stewards of that entity), add an "RSS Feeds" subsection
- List of active feeds with: feed name, URL, last checked timestamp, pause/remove button
- "Add feed" button opens a small inline form: feed URL + display name
- On save, calls a new tRPC mutation `orgClaims.addRssFeed`
- One-time popup on profile load if claim is newly approved and `rssPromptDismissed = 0`

**New tRPC endpoints:**
- `addRssFeed` — protectedProcedure, verifies approved claim ownership before inserting into `entityRssFeeds`
- `removeRssFeed` — protectedProcedure, same ownership check, sets `active = 0`
- `listRssFeeds` — protectedProcedure, returns feeds for the user's approved claimed entity
- `dismissRssPrompt` — protectedProcedure, sets `orgClaims.rssPromptDismissed = 1` for the given claim ID

**Polling script** (`scripts/poll-rss-feeds.ts`):
- Fetches all active feeds from `entityRssFeeds`
- Parses each feed URL (use `rss-parser` npm package)
- For each new item (compared to `lastItemGuid`): inserts a `forumReplies` row attributed to a system user with the feed name and a link back to the source
- Updates `lastCheckedAt` and `lastItemGuid` after each fetch
- Safe to run repeatedly — deduplication via `lastItemGuid`

**Run schedule:** Railway cron or manual: `npx tsx scripts/poll-rss-feeds.ts` (daily)

**Additional schema change** (`drizzle/schema.ts`, `orgClaims` table): Add `rssPromptDismissed: tinyint("rssPromptDismissed").default(0).notNull()` — tracks whether the steward has seen and dismissed the one-time RSS setup popup.

**Files to change:** `drizzle/schema.ts` (entityRssFeeds table + orgClaims.rssPromptDismissed), `server/routers.ts`, `client/src/pages/PlayerProfile.tsx`, `scripts/poll-rss-feeds.ts` (new)

---

## Fix 74 — Two-level content flagging (Medium)

**Status:** CODED

**Context:** Forum posts and replies can be flagged at two levels (per `COMMUNITY_SPACE_DESIGN_2026.md`):

- **🖐 Tend to** (soft flag): something needs attention but isn't urgent. Sends notification to mods. Post gets subtle amber border visible to mods only.
- **🚩 Hard Stop** (hard flag): serious violation. Post is immediately hidden from public view. Sends urgent priority alert to admins.

**Schema change needed** (`drizzle/schema.ts`, `forumReports` table):

```ts
severity: mysqlEnum("severity", ["tend_to", "hard_stop"]).default("tend_to").notNull()
```

**UI change** (`client/src/components/Forum*.tsx` or wherever the flag button lives): Replace single flag button with a two-option dropdown:
- 🖐 Tend to
- 🚩 Hard Stop

**Backend logic:**
- On `hard_stop` submission: set `forumPost.isHidden = 1` (or similar field) immediately, send urgent notification
- On `tend_to`: send soft notification to mods without hiding

**Admin panel change** (`client/src/pages/Admin.tsx` or admin reports section): Reports section gets two tabs:
- "Tend To" — amber, shows soft flags sorted by time
- "Hard Stop" — red, shows hard flags sorted by time, review + restore buttons

**Files to change:** `drizzle/schema.ts`, `server/routers.ts`, forum flag component, `client/src/pages/Admin.tsx`

---

## Fix 75 — Community pulse strip + welcome card for new users (Medium)

**Status:** PENDING

**Context:** Two lightweight additions to the top of `/community`:

**Community Pulse strip** — a small bar showing:
- X players posted this week
- X new threads opened
- X quest completions

Not a leaderboard. Just a signal that the community is alive. Pulls from simple count queries on `forumPosts`, `forumReplies`, and quest completions within the last 7 days.

**Welcome card** — shown only to:
- Unauthenticated visitors, OR
- Authenticated users who have never posted (replyCount + postCount = 0)

The card links to:
- The Welcome Aboard quest flow
- Player profile setup
- A "What is ReGen Civics?" explainer thread

Once a user has posted at least once, the card does not appear.

**tRPC endpoint needed:** `forum.communityPulse` — returns `{ playersPostedThisWeek: number, newThreadsThisWeek: number, questCompletionsThisWeek: number }`

**Frontend:** Both components are lightweight additions to `Community.tsx` above the Earth section.

**Files to change:** `server/routers.ts`, `client/src/pages/Community.tsx`

---

## Full Handoff Breakdown (updated 2026-03-13 end of day)

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| Fix 68 | `pnpm db:push` | orgClaims schema changes (formData, adminNotes, submittedAt, reviewedAt) need Railway DB | `pnpm db:push` in project root |
| Fix 68 | Run `seed-active-entities.ts` | DATABASE_URL only on your machine | See command block in Fix 68 above |
| Fix 73 | `pnpm db:push` | `entityRssFeeds` table needs Railway DB push | Same `pnpm db:push` run as Fix 68 if done together |
| Fix 74 | `pnpm db:push` | `forumReports.severity` enum needs Railway DB push | Same `pnpm db:push` run |
| All | `git add -A && git commit && git push` | Git deploy | Run after fixes verified locally |

### CLAUDE CODE — already done or can do without you

| # | Task | Status |
|---|------|--------|
| Fix 62 | ExitIntentCapture investor copy | CODED |
| Fix 63 | Applications status enum + tRPC + mapData | CODED |
| Fix 65 | `organisations` table in schema | CODED |
| Fix 67 | `activeOrganisationThreads` + Community.tsx two sections | CODED |
| Fix 68 | orgClaims schema augmentation + db.ts functions + routers.ts + PlayerProfile claim form | CODED |
| Fix 70 | Community card layout redesign + image generation | IN PROGRESS |
| Fix 71 | Resend DNS check | DONE |
| Fix 72 | Fire + Air sections on /community + `air-conversations` category | PENDING |
| Fix 73 | RSS feed schema + steward UI + poll-rss-feeds.ts | CODED |
| Fix 74 | Two-level flagging schema + UI + admin tabs | CODED |
| Fix 75 | Community pulse strip + welcome card | PENDING |

### Suggested execution order for Rye

1. `pnpm db:push` — applies orgClaims changes (Fix 68) + entityRssFeeds (Fix 73) + forumReports severity (Fix 74) all at once if schema changes are committed first
2. `npx tsx scripts/seed-active-entities.ts --dry-run` then live (Fix 68)
3. `git add -A && git commit && git push` — deploys all coded fixes

---

## Fix 76 — Quest page: PDF guides, flip hints, and seasonal carousel improvements (High)

**Status:** PENDING

**Context:** Three related improvements to the /quest page UX that complement the QUEST_MASTER_SHEET.md content.

### A. Seasonal carousel ordering

The 12 quests currently in the seasons carousel (intro Quest 0, then spring/summer/fall/winter quests 1-12) should be what users see first when they land on the page. The new seasonal quests from QUEST_MASTER_SHEET.md (the unnumbered ones) and the EPIC quests are revealed as users explore further down the page — the carousel is the entry point, not the whole game.

Page scroll order:
1. Hero / intro
2. Seasons carousel (Quest 0 + the 12 existing seasonal quests — current structure, no change needed here)
3. New seasonal quests section (the unnumbered quests from QUEST_MASTER_SHEET Part 4)
4. EPIC Quests section (new, green glow, "Epic Quest" tag, Easy / Hard / Expert tiers)

No structural change to the carousel itself — just confirm the ordering is correct and that the new sections appear below it rather than mixed in.

### B. Quest card flip hint

Every quest card should display a subtle "click to flip" hint on the card face. This is currently missing. Add a small text label or icon at the bottom of each card front face:

- Copy: "tap to explore" or "click to see more" with a small rotate icon (RotateCcw from lucide)
- Style: very subtle, small text, low opacity (e.g. `text-xs text-[#1a472a]/40`)
- Position: bottom-right corner of the card face, below the deliverable line

### C. "Details coming soon" → "Download Quest Guide" (PDF)

Quest cards that currently show "Details coming soon" in their modal (Quest 3: Healing Wholes, and any others) need:

1. A **"Download Quest Guide" button** in the QuestDetailModal, positioned where "Details coming soon" text currently appears. This button downloads a PDF generated from QUEST_MASTER_SHEET.md for that specific quest.

2. The **"View Guide" link** on the card back (wherever it appears) should also trigger a PDF download rather than linking to an external page.

3. Cards with a video (Quest 0, Quest 1) keep their video embed AND get the PDF download button alongside it. Not either/or — both.

**PDF generation approach:** Generate one PDF per quest using the how-to card content from QUEST_MASTER_SHEET.md. Each PDF includes: quest name, the story card narrative, the step-by-step how-to, deliverable, tips, and resources. PDFs are stored as static assets in `public/quest-guides/` and named `quest-NN-slug.pdf`. The download button links directly to the file.

**Files to generate (one per quest with a story card):**
- `public/quest-guides/quest-00-fire.pdf`
- `public/quest-guides/quest-01-potions.pdf`
- `public/quest-guides/quest-02-seeds.pdf`
- `public/quest-guides/quest-03-healing-wholes.pdf`
- `public/quest-guides/quest-04-food-foresting.pdf`
- `public/quest-guides/quest-10-nvc.pdf`

**Files to change:** `client/src/components/QuestDetailModal.tsx` (add PDF download button), `client/src/pages/Quest.tsx` (add flip hint to QuestCard component), `public/quest-guides/` (new PDF files)

**To generate PDFs:** Use the pdf skill with QUEST_MASTER_SHEET.md as the source. One PDF per quest, each covering the story card + steps + tips + resources for that quest only.

---

## Fix 77 — Quest page redesign: 20 improvements (fully scoped) (High)

**Status:** PENDING — fully scoped, ready for Claude Code

**Source docs:** QUEST_MASTER_SHEET.md (philosophy + quest content), Quest.tsx (1034 lines), QuestProgressTracker.tsx, QuestLeaderboard.tsx, QuestFilter.tsx, QuestCarousel.tsx, QuestBadges.tsx, QuestDetailModal.tsx, server/routers.ts, drizzle/schema.ts

**Rye direction applied:**
- Improvement 2: Keep the button but change text to "Experienced 1 / 2 / 3" as they click
- Improvement 4: Use IP geolocation to detect actual hemisphere and local season
- Improvement 14: Seasonal discovery feed goes ABOVE the carousel, not below

### New DB tables required (schema.ts + pnpm db:push)

Two new tables are needed to power improvements 1, 3, 8, 17, and 18.

**Table: `questCompletions`**
```ts
export const questCompletions = mysqlTable("questCompletions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questId: varchar("questId", { length: 100 }).notNull(), // "quest-0", "quest-1", "food-foresting", etc.
  artifactUrl: varchar("artifactUrl", { length: 512 }),
  artifactType: mysqlEnum("artifactType", ["video", "article", "audio", "other"]),
  personalNote: text("personalNote"),
  isPublic: tinyint("isPublic").default(1).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
});
```

**Table: `activeQuestSignals`**
```ts
export const activeQuestSignals = mysqlTable("activeQuestSignals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questId: varchar("questId", { length: 100 }).notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
});
```

### New tRPC router: `quest` (add to server/routers.ts)

```ts
quest: {
  logCompletion: protectedProcedure
    .input(z.object({
      questId: z.string(),
      artifactUrl: z.string().url().optional(),
      artifactType: z.enum(["video","article","audio","other"]).optional(),
      isPublic: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => { /* insert into questCompletions */ }),

  updateNote: protectedProcedure
    .input(z.object({ completionId: z.number(), note: z.string() }))
    .mutation(async ({ ctx, input }) => { /* update personalNote, verify userId matches */ }),

  recentCompletions: publicProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input }) => {
      /* join questCompletions + playerProfiles for displayName/avatar
         filter isPublic=1, order by completedAt desc, limit */
    }),

  spotlight: publicProcedure
    .query(async () => {
      /* return the most recent public completion that has an artifactUrl set,
         joined with playerProfile for displayName */
    }),

  activeCountPerQuest: publicProcedure
    .query(async () => {
      /* SELECT questId, COUNT(*) as count FROM activeQuestSignals GROUP BY questId */
    }),

  myActiveQuests: protectedProcedure
    .query(async ({ ctx }) => {
      /* SELECT questId FROM activeQuestSignals WHERE userId = ctx.user.id */
    }),

  signalActive: protectedProcedure
    .input(z.object({ questId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      /* upsert — ignore if already exists for this userId+questId */
    }),

  clearActive: protectedProcedure
    .input(z.object({ questId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      /* delete from activeQuestSignals where userId=ctx.user.id and questId=input.questId */
    }),

  myCompletions: protectedProcedure
    .query(async ({ ctx }) => {
      /* SELECT * FROM questCompletions WHERE userId=ctx.user.id ORDER BY completedAt DESC */
    }),
}
```

### New data files (no DB needed)

**`client/src/data/seasonalQuestsData.ts`** — all unnumbered seasonal quests from QUEST_MASTER_SHEET Part 4 as a typed array. Shape:
```ts
interface SeasonalQuest {
  id: string;
  title: string;
  season: "spring" | "summer" | "fall" | "winter" | "any";
  tagline: string;
  description: string;
  deliverable: string;
  estimatedTime: string;
  element: "earth" | "water" | "fire" | "air";
}
```

**`client/src/data/epicQuestsData.ts`** — all EPIC quests from QUEST_MASTER_SHEET Part 5.
```ts
interface EpicQuest {
  id: string;
  title: string;
  tier: "easy" | "hard" | "expert";
  description: string;
  deliverable: string;
}
```

**`client/src/data/questQualifiers.ts`** — static mapping of quest IDs to land projects/orgs that list them as qualifiers.
```ts
export const QUEST_QUALIFIERS: Record<string, string[]> = {
  "quest-0": ["Finca Sagrada", "Liminal Village"],
  "quest-1": ["Finca Sagrada"],
  "quest-3": ["Finca Sagrada", "Traditional Dream Factory", "StarSeed Village"],
  "food-foresting": ["Finca Sagrada", "Heartland Collective"],
  "quest-10": ["Hypha DAO", "SEEDS", "Nestr.io"],
  // expand as land projects confirm their requirements
};
```

### New hooks

**`client/src/hooks/useHemisphere.ts`**
- On mount, fetch `https://ipapi.co/json/` (free, no key required, 1000 req/day)
- Parse `latitude` to determine hemisphere: positive = Northern, negative = Southern
- Cache result in sessionStorage (`regen_hemisphere`) so it only runs once per session
- Fallback: if fetch fails or takes >2s, default to Northern hemisphere
- Derive current season from hemisphere + `new Date().getMonth()`:
  - Northern: 2-4=spring, 5-7=summer, 8-10=fall, 11+0+1=winter
  - Southern: reversed
- Export: `{ hemisphere: "northern"|"southern", currentSeason: "spring"|"summer"|"fall"|"winter", loading: boolean }`

### New components to create

**`client/src/components/QuestArtifactsGallery.tsx`** (replaces QuestLeaderboard.tsx)
- Floating button: community/people icon (not a trophy), fixed bottom-right
- Modal: "From the Field" header, recent completions feed
- Each entry: player avatar (initial fallback), player name, quest name badge, artifact link, time ago
- "Currently in the field" section above completions: players with active signals (no artifact yet)
- Uses `trpc.quest.recentCompletions.useQuery()` and `trpc.quest.activeCountPerQuest.useQuery()`
- Quest 0 (Fire) card in Quest.tsx already uses `QuestLeaderboard` import — update to `QuestArtifactsGallery`

**`client/src/components/QuestArcMap.tsx`**
- SVG-based constellation diagram, fixed dimensions (600x300 viewBox, responsive via `viewBox` scaling)
- Quest nodes: circles, positioned in a flowing left-to-right arc
  - Quest 0 (center-left), Quest 1-3 (spring cluster), Quest 4 (center), Quest 5-9 (summer/fall cluster), Quest 10 (center-right)
- Lines: thin strokes connecting sequential quests in the arc order
- Node color: season color (spring=green, summer=amber, fall=orange, winter=slate)
- Completed state: filled circle with checkmark, uses `QuestProgressContext`
- Click on node: opens `QuestDetailModal` for that quest
- Hover: tooltip showing quest name and subtitle
- Toggle button in Quest.tsx hero: "View Quest Arc" with a network icon

**`client/src/components/SeasonalQuestFeed.tsx`**
- Positioned ABOVE the main seasons carousel in Quest.tsx
- Reads current season from `useHemisphere()` hook
- Shows 2-3 quests from `seasonalQuestsData.ts` filtered to `season === currentSeason || season === "any"`
- Featured cards: larger, with a "Why now" tagline based on the current season
- "Explore all seasonal quests" expand/collapse button showing remaining quests in a grid
- No DB query needed — fully client-side from the static data file

**`client/src/components/QuestGameIntro.tsx`**
- 4-panel cinematic scroll experience
- Panel 1: "Welcome to the Infinite Game" — headline + 2 sentences of philosophy
- Panel 2: "The Arc" — how the quests connect, with simple visual of the sequence
- Panel 3: "Your Journey Begins" — CTA to start with Quest 0 highlighted
- Panel 4: "Enter the Game" button — sets localStorage `regen_game_entered = true`, scrolls to main quest content
- Triggered when: `!isAuthenticated` AND `localStorage.getItem("regen_game_entered") !== "true"`
- After clicking "Enter the Game": hides intro, shows full page (no page reload)

**`client/src/components/EpicQuestSection.tsx`**
- Full-width section, dark green background (`#0f2d1a`), lighter text
- Header: "These quests change landscapes." subhead: "Are you ready?"
- Three tiers rendered as distinct rows: Easy Mode (emerald accent), Hard Mode (amber accent), Expert Mode (red accent)
- Each quest card: horizontal layout (image left, content right on desktop, stacked on mobile)
- Cards have an "Epic Quest" badge in the corner
- No DB interaction in v1 — all static data from `epicQuestsData.ts`

### Per-improvement implementation detail

**Improvement 1: Community Artifacts Gallery (replaces QuestLeaderboard)**
- `QuestLeaderboard.tsx` → replace entirely with `QuestArtifactsGallery.tsx`
- In `Quest.tsx`: update import from `QuestLeaderboard` to `QuestArtifactsGallery`
- The floating button: change from `Trophy` icon to `Users` icon, label "From the Field"
- `MarkCompleteButton` in `QuestProgressTracker.tsx`: when clicked, also fires `trpc.quest.logCompletion.mutate()` if user is authenticated (non-blocking — localStorage update happens regardless)
- The Hypha submission link in `QuestDetailModal.tsx`: wrap it so clicking it also triggers `logCompletion` with the Hypha URL as `artifactUrl`

**Improvement 2: "Experienced 1/2/3" button**
- File: `client/src/components/QuestProgressTracker.tsx`
- `MarkCompleteButton` component: change button label logic
  - Current count 0: "I've done this"
  - Current count 1: "Experienced 1"
  - Current count 2: "Experienced 2"
  - Count 3+ (max for most quests): "Experienced 3" with a subtle lock indicator
  - Food Foresting and Quest 13 (Fasting): no max shown, just "Experienced N"
- Keep all localStorage logic unchanged — this is purely a display text change
- Also update the floating progress button tooltip to say "Your experiences" instead of "Quest progress"

**Improvement 3: "Who else is doing this" indicator**
- File: `client/src/pages/Quest.tsx`, `QuestCard` component
- Add `useQuery` for `trpc.quest.activeCountPerQuest` at the page level (one query, not per-card)
- Pass count into each `QuestCard` as a prop: `activePlayers?: number`
- Render inside QuestCard: small pill at bottom-left of card face
  - If count > 0: "🌿 N in the field" (green pill)
  - If count === 0: show nothing (not "0 players" — that looks dead)
- The `activeQuestSignals` table is what powers this; signals are set via improvement 8

**Improvement 4: Seasonal hero with IP geolocation**
- New hook: `useHemisphere.ts` (see above)
- In `Quest.tsx` hero section: call `const { currentSeason, loading } = useHemisphere()`
- Hero background gradient changes per season:
  - Spring: `from-emerald-50 via-green-100 to-lime-50`
  - Summer: `from-amber-50 via-yellow-100 to-orange-50`
  - Fall: `from-orange-100 via-amber-200 to-red-100`
  - Winter: `from-slate-100 via-blue-100 to-indigo-50`
- Hero tagline changes per season (e.g. spring: "What will you plant this season?")
- The seasons carousel auto-scrolls to highlight the current season tab on load
- Add a small "Detected: Northern / Southern hemisphere" toggle link near the season tabs so players can correct it if wrong — clicking toggles a `hemisphereOverride` in sessionStorage

**Improvement 5: Quest arc visualization**
- New component: `QuestArcMap.tsx` (see above)
- In `Quest.tsx` hero section: add a "View Quest Arc" toggle button (GitBranch icon from existing imports)
- When toggled: renders `QuestArcMap` in an animated expandable section below the hero, above the seasonal feed
- The arc connects: 0 → 1 → 2 → 3 → 4 (food foresting) → 10 (NVC) as the main spine
  Quests 5-9 (when defined) branch off the spine
- Node data is hardcoded in `QuestArcMap.tsx` from the questData object already in Quest.tsx

**Improvement 6: Story card narrative on card flip / modal**
- File: `client/src/components/QuestDetailModal.tsx`
- Add `storyCard?: string` field to `QuestDetails` interface
- Add story card text to each quest in `questDetailsData` (pull 3-4 sentence excerpts from QUEST_MASTER_SHEET.md for quests 0, 1, 2, 3, food-foresting, and 10)
- In the modal content: render `storyCard` text in an italicised block at the top, before the steps, in a warm parchment-style box (`bg-[#f0ebe3]`, `italic`, `text-[#1a472a]/80`)
- The QuestCard flip animation (already exists for Quest 0 via `showHowTo` state) shows the story card text on the back face rather than just steps — update the inline flip card for Quest 0 to also pull from `questDetailsData["quest-0"].storyCard`

**Improvement 7: PDF as primary no-video fallback**
- Already specced in Fix 76 — no duplication here
- `QuestDetailModal.tsx`: where "Details Coming Soon" placeholder renders (quest-3 and any others with placeholder steps), replace with a prominent "Download Field Guide" button
- Button style: same green as the "Finish this Quest" button, `Download` icon from lucide (already imported)
- Link: `/quest-guides/quest-NN-slug.pdf` (static files in `public/quest-guides/`)
- For quests WITH a video: add PDF button below the video embed as a secondary resource ("Prefer to read? Download the field guide")

**Improvement 8: "I'm doing this" active quest state**
- File: `client/src/pages/Quest.tsx`, `QuestCard` component
- Add a small toggle button below the deliverable on each card (visible only when `isAuthenticated`)
- Label: "I'm on this quest" (leaf icon), toggled state: "In the field" (filled leaf)
- On click: calls `trpc.quest.signalActive.mutate({ questId })` (or `clearActive` if already active)
- Local optimistic update via `useState` for immediate feedback
- On page load: `trpc.quest.myActiveQuests.useQuery()` fetches which quests the user has active signals for
- When a user clicks "Finish this Quest" in QuestDetailModal: also calls `clearActive` (quest is done, signal cleared)

**Improvement 9: Thematic time/difficulty indicators**
- File: `client/src/components/QuestFilter.tsx`, `QUEST_METADATA` export
- Add a new field `experience: string` to each quest in `QUEST_METADATA`:
  - quest-0 (Fire): "One-time ceremony, 2-4 hours"
  - quest-1 (Potions): "Weekend practice, 3-5 hours"
  - quest-2 (Seeds): "Solo afternoon, 1-2 hours"
  - quest-3 (Healing Wholes): "Ongoing daily practice"
  - quest-4 (Food Foresting): "Group adventure, 2-4 hours, repeatable"
  - quest-5 (Dreaming Spaces): "Weekend dreaming, 3-5 hours"
  - quest-6 (Rites of Love): "Ceremony with your beloved"
  - quest-7 (Healing Circles): "Community gathering, half day"
  - quest-8 (Wild Foraging): "Solo or group walk, 2-4 hours"
  - quest-9 (Medicine Journey): "Solo ceremony, full day"
  - quest-10 (Tree Talk): "Slow walk, 1-2 hours"
  - quest-11 (Communication Patterns): "30-day practice"
  - quest-12 (Coordination Patterns): "Group project, ongoing"
  - quest-13 (Breathplay & Future Dreaming): "Breathwork session, 2-3 hours"
- In `Quest.tsx` `QuestCard`: replace or augment the difficulty badge with `QUEST_METADATA[questId]?.experience`
- Keep existing difficulty filter working for filter functionality but display the `experience` string instead of "beginner/intermediate/advanced" in the card UI

**Improvement 10: Bioregional context on cards**
- File: `client/src/pages/Quest.tsx`
- Use `currentSeason` from `useHemisphere()` hook (already loaded for improvement 4)
- Add a static mapping in Quest.tsx: `QUEST_BEST_SEASONS: Record<string, string[]>` — which seasons each quest is best done in
  - e.g. `"quest-2"` (Seeds): `["spring", "fall"]`, `"quest-8"` (Wild Foraging): `["summer", "fall"]`
- In `QuestCard`: if `currentSeason` matches a quest's best seasons, show a subtle tag: "✨ Great for right now"
- If season doesn't match: show nothing (no "not ideal" messaging — always positive)
- If `useHemisphere` is still loading: show nothing

**Improvement 11: "Enter the Game" for first-time visitors**
- New component: `QuestGameIntro.tsx` (see above)
- In `Quest.tsx`: at the top of the render, check:
  ```ts
  const hasEntered = localStorage.getItem("regen_game_entered") === "true";
  const [showIntro, setShowIntro] = useState(!hasEntered);
  ```
- If `showIntro` is true: render `QuestGameIntro` instead of (or overlaying) the main page
- `QuestGameIntro` calls `onEnter` prop → sets localStorage flag + `setShowIntro(false)`
- Do NOT gate on authentication — unauthenticated visitors should also get the intro on first visit
- The intro renders above everything; "Enter the Game" button scrolls to main content and sets the flag

**Improvement 12: Elemental filtering**
- File: `client/src/components/QuestFilter.tsx`
- Add `element: "earth" | "water" | "fire" | "air"` to each quest in `QUEST_METADATA`:
  - Earth (land/soil/body): quest-2 (Seeds), quest-3 (Healing Wholes), quest-4 (Food Foresting), quest-8 (Wild Foraging)
  - Water (relationship/community/flow): quest-5 (Dreaming Spaces), quest-6 (Rites of Love), quest-7 (Healing Circles), quest-11 (Communication Patterns), quest-12 (Coordination Patterns)
  - Fire (transformation/action/energy): quest-0 (Fire), quest-1 (Potions), quest-9 (Medicine Journey), quest-13 (Fasting/Breathplay)
  - Air (reflection/honesty/spirit): quest-10 (Tree Talk), quest-13 (Breathplay)
- Add a new `QuestElement` type and `element` filter option to `QuestFilter.tsx`
- UI: replace or augment the existing "Category" dropdown with elemental icon buttons (🌍 🌊 🔥 🍃) that filter the carousel/grid
- The existing `filterQuests()` function: add element filtering logic
- In `Quest.tsx`: pass the active element filter into the section rendering

**Improvement 13: Qualifier badges on quest cards**
- New file: `client/src/data/questQualifiers.ts` (see data files section above)
- In `Quest.tsx` `QuestCard` component: import `QUEST_QUALIFIERS`
- If `QUEST_QUALIFIERS[questId]` exists and has entries: render small qualifier chips below the deliverable
- Each chip: "🌱 [OrgName]" in a tiny green pill
- Max 2 shown on the card face; if more: "🌱 +N more" with a tooltip listing all
- No DB query — pure static data

**Improvement 14: Seasonal discovery feed ABOVE the carousel**
- New component: `SeasonalQuestFeed.tsx` (see above)
- Position in `Quest.tsx`: immediately BEFORE the seasons carousel (`<QuestCarousel />` call), after the hero section
- Section header: "What's alive this [Season]" — uses `currentSeason` from `useHemisphere()`
- 2-3 featured cards from `seasonalQuestsData.ts` matching current season
- Each featured card: larger than carousel cards, horizontal layout, includes a "Why now" sentence
- Below featured cards: `<details>` or accordion: "Explore all [N] seasonal quests" → full grid
- All data is from `seasonalQuestsData.ts` (static) — no DB query needed

**Improvement 15: Guest browsing with gentle conversion**
- File: `client/src/pages/Quest.tsx`
- Current: some quest cards may check auth before allowing modal to open (the `hasDetails && cursor-pointer` logic in `QuestCard`)
- Change: remove any auth gate from opening `QuestDetailModal` — all visitors can read full quest details
- In `QuestDetailModal.tsx`: the "Finish this Quest" button and "I'm doing this" toggle (improvement 8) check `isAuthenticated` before rendering; show a sign-in prompt instead if not authenticated
- The PDF download button (improvement 7) works for all visitors — no auth needed
- In `QuestProgressTracker.tsx`: "Experienced" button (improvement 2) remains but shows "Sign in to track" tooltip on hover if not authenticated

**Improvement 16: EPIC Quest section**
- New component: `EpicQuestSection.tsx` and data file `epicQuestsData.ts` (see above)
- Position in `Quest.tsx`: at the bottom of the page, after the seasonal quests grid and before the footer/sign-in CTA
- Section uses `bg-[#0f2d1a]` background, white text — visually distinct from everything above
- Three-tier layout: Easy Mode row, Hard Mode row, Expert Mode row
- Each card: horizontal, `bg-[#1a472a]/50` card background, left accent border matching tier color
- "Epic Quest" tag badge: top-right corner of each card, green glow (`shadow-[0_0_15px_rgba(125,216,125,0.4)]`)
- In v1: no DB interaction, no completion tracking — just static content + "Join the Quest" CTA linking to forum discussion or Hypha game space

**Improvement 17: Quest journal in player profile**
- File: `client/src/pages/PlayerProfile.tsx`
- Add a "Quest Journal" section after the WelcomeAboardQuests section
- Data: `trpc.quest.myCompletions.useQuery()` — returns all completions for the logged-in user
- Each entry: quest name (look up from `questData` by questId), completion date, artifact link (if set), a private note field
- Note field: `<textarea>` with auto-save on blur, calls `trpc.quest.updateNote.mutate({ completionId, note })`
- "Log a new completion" link: opens a small inline form with questId selector + optional artifact URL — calls `trpc.quest.logCompletion.mutate()`
- Also add a prompt at the bottom of `Quest.tsx` (before the footer): "Your quest journal lives in your profile →" with a link to `/profile#quest-journal`

**Improvement 18: Community Quest Spotlight**
- Data: `trpc.quest.spotlight.useQuery()` — auto-selects most recent public completion with an `artifactUrl`
- Position: in `Quest.tsx` hero section, below the main headline and above the "View Quest Arc" toggle
- Renders as a horizontal feature card: player name + avatar initial, quest name badge, a truncated excerpt (first 2 sentences of the artifact if it's a URL we can parse, or a static placeholder until player adds a quote), link to artifact
- Header: "From the Field This Week"
- If no completions with artifacts exist yet: section is hidden entirely (conditional render)
- In v1, the "quote" field is whatever personalNote the player added — so the `questCompletions` table `personalNote` field doubles as the spotlight quote when `isPublic=1`

**Improvement 19: Token transparency**
- Files: `client/src/pages/Quest.tsx` (QuestCard reward display), `client/src/components/QuestDetailModal.tsx` (reward chips)
- Add a small `?` icon button (Info icon from lucide, already imported) next to every `$ReGen` and `RVoice` text
- On hover/click: shows a small popover (use `title` attribute for simplest implementation, or a custom tooltip div for polish)
- $ReGen tooltip: "ReGen tokens are earned by completing quests. They represent your stake in the regenerative economy we're building together. More value is co-created as the game grows."
- RVoice tooltip: "RVoice gives you a vote in how the ReGen Civics game evolves — proposals, quests, and governance decisions."
- Also add a "Learn more about tokens →" link pointing to the relevant forum or docs page

**Improvement 20: Print-ready field guides**
- Already handled via Fix 76 PDF generation
- In `QuestDetailModal.tsx`: add a `Print` icon button in the modal footer (alongside Close and Finish Quest)
- Clicking it: calls `window.print()` — the modal content div gets a `print:block` Tailwind class and all other page elements get `print:hidden`
- Add `@media print` styles (via a `<style>` tag in the component or a global CSS addition): hide header, footer, modal overlay, show only the modal content with clean typography
- This is the cheap version; the pre-generated PDF (Fix 76) is the polished version — both should exist

### Page structure after all improvements

```
Quest.tsx render order:
1. QuestGameIntro (if first visit — overlays or precedes everything)
2. Hero section
   - Seasonal background (dynamic via useHemisphere)
   - Title + philosophy tagline
   - Quest Spotlight "From the Field" card (#18)
   - "View Quest Arc" toggle → QuestArcMap (#5)
3. SeasonalQuestFeed — "What's alive this [Season]" (#14) ABOVE carousel
4. Seasons carousel (Quest 0 + 12 existing quests) — unchanged structure
5. Main quest grid (filtered via elemental filters #12)
   - Each card: story hint (#6), "Experienced N" button (#2),
     "I'm doing this" toggle (#8), qualifier badges (#13),
     thematic time tag (#9), bioregional context (#10),
     "N in the field" count (#3)
6. EpicQuestSection (#16)
7. "Your quest journal lives in your profile →" prompt (#17)
8. QuestArtifactsGallery floating button (#1) — bottom-right, replaces leaderboard
9. QuestProgressTracker floating button — bottom-right, shifted left to not overlap
```

### Dependency order for Claude Code

Build in this order to avoid rework:

1. `drizzle/schema.ts` — add `questCompletions` + `activeQuestSignals` tables → `pnpm db:push` [HUMAN]
2. `server/routers.ts` — add `quest` router with all endpoints above
3. `useHemisphere.ts` hook (no dependencies)
4. `seasonalQuestsData.ts` + `epicQuestsData.ts` + `questQualifiers.ts` data files (no dependencies)
5. Improvements 2, 9, 13, 19 — pure UI text/display changes in existing files (no new deps)
6. Improvement 15 — remove auth gates (independent)
7. Improvement 12 — elemental filter (needs QUEST_METADATA update in QuestFilter.tsx)
8. Improvement 4 — seasonal hero (needs useHemisphere hook)
9. Improvement 10 — bioregional context (needs useHemisphere hook)
10. Improvement 14 — SeasonalQuestFeed (needs useHemisphere + seasonalQuestsData)
11. Improvement 11 — QuestGameIntro (independent new component)
12. Improvements 6, 7, 20 — QuestDetailModal changes (storyCard text, PDF button, print)
13. Improvement 8 — "I'm doing this" (needs quest router)
14. Improvement 3 — "who else" count (needs quest router + activeQuestSignals)
15. Improvement 1 — QuestArtifactsGallery (needs quest router + questCompletions)
16. Improvement 5 — QuestArcMap (needs QuestProgressContext, independent otherwise)
17. Improvement 17 — PlayerProfile quest journal (needs quest router + questCompletions)
18. Improvement 18 — Quest Spotlight (needs quest router + questCompletions)
19. Improvement 16 — EpicQuestSection (needs epicQuestsData, independent)

### Files changed summary

| File | Change |
|---|---|
| `drizzle/schema.ts` | Add questCompletions + activeQuestSignals tables |
| `server/routers.ts` | Add quest router (7 endpoints) |
| `client/src/pages/Quest.tsx` | Seasonal hero, arc toggle, feed position, card improvements, EPIC section, game intro, page structure |
| `client/src/pages/PlayerProfile.tsx` | Quest journal section |
| `client/src/components/QuestDetailModal.tsx` | storyCard field, PDF button, print button |
| `client/src/components/QuestProgressTracker.tsx` | "Experienced N" button text |
| `client/src/components/QuestFilter.tsx` | Add element + experience fields to QUEST_METADATA, elemental filter UI |
| `client/src/components/QuestLeaderboard.tsx` | Replace entirely with QuestArtifactsGallery |
| `client/src/hooks/useHemisphere.ts` | New hook |
| `client/src/data/seasonalQuestsData.ts` | New data file |
| `client/src/data/epicQuestsData.ts` | New data file |
| `client/src/data/questQualifiers.ts` | New data file |
| `client/src/components/QuestArtifactsGallery.tsx` | New component |
| `client/src/components/QuestArcMap.tsx` | New component |
| `client/src/components/SeasonalQuestFeed.tsx` | New component |
| `client/src/components/QuestGameIntro.tsx` | New component |
| `client/src/components/EpicQuestSection.tsx` | New component |
| `public/quest-guides/*.pdf` | New PDF files (generated via pdf skill from QUEST_MASTER_SHEET) |

### Human steps required

| Task | When |
|---|---|
| `pnpm db:push` | After schema changes (questCompletions + activeQuestSignals tables) |
| `git add -A && git commit && git push` | After all changes verified locally |

---

## Fix 78 — Site-wide readability audit: light text on light backgrounds (High)

**Status:** PENDING

**Known issue reported:** `/profile?tab=contributions` has white or light text on light-colored backgrounds, making it unreadable.

**Also known:** `/connect` forms have the same pattern.

### Part A: Fix known instances immediately

**PlayerProfile.tsx — Contributions tab**

The contributions log form at around line 1580+ uses `bg-white/10 border border-white/20 text-white` on input fields. These are fine IF the parent section has a dark background. Audit the full contributions tab section to confirm no parent container is using a light background (`bg-white`, `bg-gray-50`, `bg-[#f0ebe3]`, `bg-amber-50`, `bg-green-50`, etc.) that would make the white text invisible. If found, either:
- Switch the parent container to a dark background (`bg-[#1a472a]/10` or similar), OR
- Switch the text inside to dark (`text-[#1a472a]`, `text-gray-800`)

**Connect.tsx — Forms**

Fix separately under Fix 83 below.

### Part B: Site-wide audit script

Create `scripts/check-contrast.ts` — a Playwright-based crawler that:

1. Visits every route defined in `client/src/App.tsx` (extract the route list)
2. On each page, runs `page.evaluate()` to walk all DOM elements and check:
   - Computed `color` (text color) vs computed `background-color` of the element or nearest ancestor with a non-transparent background
   - Calculates the WCAG contrast ratio
   - Flags any text element where ratio < 4.5:1 (AA standard for normal text)
3. Outputs a JSON report: `{ page: string, element: string, textColor: string, bgColor: string, ratio: number }[]`
4. Also does a simpler static scan: grep all `.tsx` files for combinations of light text classes (`text-white`, `text-white/60`, `text-gray-100`, `text-gray-200`) paired within the same component with light background classes (`bg-white`, `bg-gray-50`, `bg-gray-100`, `bg-amber-50`, `bg-green-50`, `bg-[#f0ebe3]`)

**Run:**
```powershell
npx tsx scripts/check-contrast.ts > contrast-report.json
```

**Files to create:** `scripts/check-contrast.ts`

**Files to fix after running:** Any files flagged in the report

---

## Fix 79 — Add Tokenomics link to site footer (Low)

**Status:** PENDING

**File:** `client/src/components/SiteFooter.tsx`

**Current state (around line 136):**
```tsx
<Link href="/governance" className="text-white/60 hover:text-white transition-colors text-xs">
  Governance
</Link>
```

**Fix:** Add a Tokenomics link immediately after the Governance link, in the same list:
```tsx
<li>
  <Link href="/tokenomics" className="text-white/60 hover:text-white transition-colors text-xs">
    Tokenomics
  </Link>
</li>
```

Confirm the list item wrapper matches the surrounding `<li>` structure used for other footer links in that section.

**Files to change:** `client/src/components/SiteFooter.tsx`

---

## Fix 80 — Navigation menu: rename items and change icons (Low)

**Status:** PENDING

**File:** `client/src/components/Navigation.tsx`

Two changes needed, both in desktop dropdown AND mobile menu:

### Change 1: "Start Questing" → "Explore Quests" with mountain icon

Desktop (around line 218-219):
```tsx
// Current
<span className="text-lg mr-3">🧙</span>
<span style={{ fontFamily: 'var(--font-accent)' }}>Start Questing</span>

// Change to
<span className="text-lg mr-3">⛰️</span>
<span style={{ fontFamily: 'var(--font-accent)' }}>Explore Quests</span>
```

Mobile (around line 673-674):
```tsx
// Current
<span className="text-lg">🧙</span>
Start Questing

// Change to
<span className="text-lg">⛰️</span>
Explore Quests
```

### Change 2: "Custom Land Games" → map icon (keep label)

Desktop (around line 256-257):
```tsx
// Current
<span className="text-lg mr-3">🎮</span>

// Change to
<span className="text-lg mr-3">🗺️</span>
```

Mobile (around line 741):
```tsx
// Current
<span className="text-lg">🎮</span>

// Change to
<span className="text-lg">🗺️</span>
```

**Files to change:** `client/src/components/Navigation.tsx`

---

## Fix 81 — /play page: debug second video not playing (Medium)

**Status:** PENDING

**File:** `client/src/pages/Play.tsx`

**Current code (around lines 462-478):**
```tsx
<video
  autoPlay
  loop
  muted
  playsInline
  preload="metadata"
  className="w-full h-auto"
>
  <source src="https://assets.regencivics.earth/WZgPeSZvhJLTVpCn.mp4" type="video/mp4" />
</video>
```

**Problem:** Raw `<video autoPlay>` with an external CDN source fails silently in many browsers when the video hasn't loaded yet or when the browser's autoplay policy blocks it (even muted videos can be blocked if not triggered by scroll/interaction).

**Fix:** Replace this raw `<video>` tag with the existing `AutoplayVideo` component (already imported at line 36) which uses an Intersection Observer to trigger play on scroll, handles errors gracefully, and shows a thumbnail placeholder while loading. If `AutoplayVideo` doesn't support local/CDN video sources directly (only YouTube), then apply the Intersection Observer pattern manually:

```tsx
// Option A: If AutoplayVideo supports src (check the component)
<AutoplayVideo
  src="https://assets.regencivics.earth/WZgPeSZvhJLTVpCn.mp4"
  title="ReGen Civics Quest Animation"
/>

// Option B: Manual Intersection Observer on the video ref
const videoRef = useRef<HTMLVideoElement>(null);
useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) videoRef.current?.play().catch(() => {}); },
    { threshold: 0.3 }
  );
  if (videoRef.current) observer.observe(videoRef.current);
  return () => observer.disconnect();
}, []);

<video ref={videoRef} loop muted playsInline preload="auto" className="w-full h-auto">
  <source src="https://assets.regencivics.earth/WZgPeSZvhJLTVpCn.mp4" type="video/mp4" />
</video>
```

First check `AutoplayVideo.tsx` to see if it supports a `src` prop for non-YouTube sources. If it does, use Option A. Otherwise use Option B with the manual observer.

Also add an `onError` handler so if the CDN source fails entirely, a fallback image is shown rather than an empty broken element.

**Files to change:** `client/src/pages/Play.tsx` (and optionally `client/src/components/AutoplayVideo.tsx` if adding `src` prop support)

---

## Fix 82 — /play "Explore Token Details": add governance and tokenomics links (Low)

**Status:** PENDING

**File:** `client/src/pages/Play.tsx`

**Current state:** The "Explore Token Details" collapsible section has two token cards (ReGen Game Tokens and RGVoice Tokens) with descriptions but no links out to learn more.

**Fix:** Add a "Learn more" link to each token card, inside the card content, below the description text:

- ReGen Game Tokens card: Add link to `/tokenomics` — label: "Explore tokenomics →"
- RGVoice Tokens card: Add link to `/governance` — label: "Explore governance →"

Style: small, `text-[#7dd87d] hover:text-white underline text-sm` to match the existing color scheme of the section.

Also add these two links as a secondary CTA line at the bottom of the full "Explore Token Details" section (after both cards), so users can find them even without opening the individual cards:

```tsx
<div className="mt-4 text-center text-sm text-white/60">
  <Link href="/tokenomics" className="text-[#7dd87d] hover:text-white underline mr-4">Tokenomics</Link>
  <Link href="/governance" className="text-[#7dd87d] hover:text-white underline">Governance</Link>
</div>
```

**Files to change:** `client/src/pages/Play.tsx`

---

## Fix 83 — /connect forms: dark backgrounds, light text, fix back button (High)

**Status:** PENDING

**File:** `client/src/pages/Connect.tsx`

### Part A: Form backgrounds — switch to dark

The forms render inside a container with `bg-white/95` background (around line 1261), which makes any light-colored text invisible. Change the form container to a dark background consistent with the rest of the site:

```tsx
// Current
className="... bg-white/95 ..."

// Change to
className="... bg-[#1a472a]/90 backdrop-blur-sm ..."
```

Inside the form container, all text that was dark for the light background now needs to be light for the dark background:
- Labels: change `text-[#1a472a]` → `text-white/90` or `text-white`
- Helper text: change `text-gray-600` → `text-white/60`
- Input fields: add/confirm `bg-white/10 border-white/20 text-white placeholder:text-white/50`
- Select dropdowns: same dark treatment as inputs
- Checkbox/toggle cards: change `border-gray-200 bg-white` (unselected) → `border-white/20 bg-white/10`, text inside → `text-white`; selected state → `border-[#7dd87d] bg-[#7dd87d]/20`
- Error messages: `text-red-400` (already readable on dark)

Audit ALL form variants (all 7 pathways: Land Partner, Create with ReGens, Alliance Partner, Finance, Live, Role, Something Else) to make sure the dark treatment is applied consistently across each path's unique form fields.

### Part B: Back button — fix overlap and navigation

**Current behavior:** The `BackButton` component is `fixed top-20 left-4 z-40` — a floating fixed-position button. On the Connect form, this overlaps form content and the fixed positioning means it floats over the text.

**Also:** `BackButton` uses `window.history.back()` with a fallback to `fallbackPath="/"`. When a user navigates directly to `/connect` (e.g. from an email link), there is no browser history, so `window.history.back()` sends them to the browser's previous session page or falls back to `/`, not to `/connect`.

**Fix:**

1. In `Connect.tsx`, find where `<BackButton />` is rendered and pass the correct fallback:
   ```tsx
   <BackButton fallbackPath="/connect" label="Back to Connect" />
   ```
   This ensures if there's no history, they return to the Connect page start rather than the home page.

2. For the overlap issue: determine whether the `BackButton` should be inline (inside the form flow) rather than fixed. On the Connect page specifically, remove the fixed positioning and render the back button as an inline element at the top of the form step, not as a floating overlay. This may require a prop on `BackButton` like `inline?: boolean` that changes the className from `fixed top-20 left-4 z-40` to `relative mb-4`.

   Or: simply move the button inside the form container so the natural document flow pushes form content down rather than overlapping.

**Files to change:** `client/src/pages/Connect.tsx`, possibly `client/src/components/BackButton.tsx` (add `inline` prop)

---

## Fix 84 — Forum post body: URLs not rendered as clickable links (High)

**Status:** PENDING

**What's broken:** Plain URLs typed into forum posts (e.g. `youtube.com/playlist?list=...`) are displayed as unformatted text and are not clickable. Users cannot open links from forum posts.

**Seen in:** Forum post by Rieki Cordon containing `youtube.com/playlist?list=PL3Xi8vZSmBTStS0BoFItW8389HJLypX0E` — rendered as plain text, no `<a>` tag.

**Root cause:** The forum post renderer is not auto-linking URLs in post body content. Either the rich text renderer (likely a markdown or HTML sanitizer/renderer) is stripping anchor tags, or the post content is plain text with no link detection pass.

**Fix — two parts:**

### Part A: Auto-link URLs in post body

Find where forum post body content is rendered. Look for: `ForumPostBody`, `ForumPost`, `PostContent`, or wherever `post.body` / `post.content` is output. Check if it's using a markdown renderer (e.g. `react-markdown`, `marked`, `remark`) or plain text.

If it's plain text, add a URL-detection pass before rendering:
```ts
// util: linkifyText.ts
export function linkifyText(text: string): string {
  const urlPattern = /https?:\/\/[^\s]+|(?<![\/\w])[\w-]+\.[a-z]{2,}[^\s]*/gi
  return text.replace(urlPattern, (url) => {
    const href = url.startsWith('http') ? url : `https://${url}`
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-[#7dd87d] underline hover:text-white transition-colors">${url}</a>`
  })
}
```

If using a markdown renderer, confirm that raw URLs (not wrapped in `[]()`) are being auto-linked. Most markdown parsers do NOT autolink bare URLs by default — enable the `gfm` (GitHub Flavored Markdown) option or add a remark-autolink-literals plugin.

If using `react-markdown`:
```tsx
import remarkGfm from 'remark-gfm'
// ...
<ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
```

GFM enables autolinks for bare URLs like `https://...` and `www.`.

### Part B: Verify sanitization is not stripping links

If the post body goes through an HTML sanitizer (e.g. DOMPurify), confirm `<a>` tags with `href`, `target`, and `rel` are in the allowlist. DOMPurify strips `target` and `rel` by default — these need to be explicitly allowed:

```ts
DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ['a', 'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  FORCE_BODY: true,
})
```

### Part C: Style the links

All rendered links in forum post bodies should use:
- `text-[#7dd87d]` (brand green)
- `underline`
- `hover:text-white transition-colors`
- Open in new tab: `target="_blank" rel="noopener noreferrer"`

**Files to check:**
- `client/src/components/ForumPost.tsx` or equivalent post renderer
- `client/src/components/ForumPostBody.tsx` (if it exists)
- `client/src/lib/linkify.ts` or wherever post content is preprocessed
- Any usage of `dangerouslySetInnerHTML` with post body content

**No DB changes needed.**

---

## Fix 85 — Regenerate forum seed scripts: fix link formatting and add new quest posts (High)

**Status:** PENDING

**Context:** The existing forum posts were seeded with bare URLs (e.g. `youtube.com/playlist?list=...`) that do not render as links. Rye will delete all existing forum posts and re-seed from scratch. This fix covers updating the seed scripts to produce correctly formatted content and adding posts for the 18 new seasonal quests and EPIC quests.

**Fix 84 dependency:** Fix 84 (link rendering) addresses the runtime renderer. This fix addresses the source data. Both are needed. Links in seed scripts should use markdown format `[link text](https://url)` so they render correctly even before Fix 84 ships.

### Part A: Fix link formatting in existing seed scripts

Find all forum seed scripts (likely in `scripts/` or `db/seed/`, e.g. `seed-forum-posts.ts`, `seed-quest-threads.ts`). Audit every URL in the seed data and convert bare URLs to markdown links:

```ts
// Before
"Watch the series here: youtube.com/playlist?list=PL3Xi8vZSmBTStS0BoFItW8389HJLypX0E"

// After
"Watch the series here: [Foundational Series playlist](https://www.youtube.com/playlist?list=PL3Xi8vZSmBTStS0BoFItW8389HJLypX0E)"
```

Audit all bare `http://` or `https://` URLs and give them descriptive link text.

### Part B: Add forum posts for the 18 new seasonal quests

Each new seasonal quest (from `QUEST_MASTER_SHEET.md` Part 4) needs a seed forum post in its appropriate forum category. Posts should follow the same pattern as existing quest discussion posts:

- **Thread title:** The quest name
- **Body:** 2-3 sentences introducing the quest + an open question to start conversation
- **Category:** Match to seasonal forum category (spring, summer, fall, winter, or general for Anytime quests)
- **Author:** Rieki Cordon (seeded as the community account)

Post body template:
```
[One sentence on what this quest is]. [One sentence on why it matters or what it opens up].

Share what you're noticing, questions you have, or connect with others who are on this quest.
```

### Part C: Add forum posts for EPIC Quests

One thread per EPIC Quest tier (Easy Mode, Hard Mode, Expert Mode) or one thread per EPIC Quest, in a dedicated `epic-quests` forum category. If the category doesn't exist yet, add it to the category seed data.

### Part D: Add a `--reset` flag for full delete-and-replace

The seed script must support a `--reset` flag. When passed, it deletes all existing forum posts and replies before inserting fresh ones. This is the default workflow for Rye — not a skip/upsert.

```ts
// At top of seed script
const RESET = process.argv.includes('--reset')

if (RESET) {
  console.log('Resetting forum posts...')
  await db.execute(sql`DELETE FROM forumReplies`)
  await db.execute(sql`DELETE FROM forumPosts`)
  console.log('Forum cleared.')
}

// Then proceed with all inserts unconditionally
```

Delete `forumReplies` first (child rows), then `forumPosts` (parent rows), to avoid foreign key constraint errors.

Without `--reset`, the script should still be safe to run by using a lookup-before-insert guard — but the primary workflow Rye will use is `--reset`.

**PowerShell command to run after Claude Code ships this:**

```powershell
npx tsx scripts/seed-forum-posts.ts --reset
```

That single command clears all old posts and re-seeds everything fresh.

**Files to check/create:**
- `scripts/seed-forum-posts.ts` (or equivalent — find the actual filename first)
- Any related run command in `package.json` (add `"seed:forum": "tsx scripts/seed-forum-posts.ts"`)

**No new DB schema needed. No `pnpm db:push` required.**

---

## Fix 86 — URGENT: Site-wide color regression — cards showing light backgrounds instead of dark green (Critical)

**Status:** PENDING — DO THIS FIRST before any other fix

**What broke:** A recent build broke the color scheme site-wide. Confirmed broken on at least two pages:

1. **Dashboard ("Welcome Back" page):** Card backgrounds changed from rich dark green (`#1a472a`) to pale/washed-out. Forest background image is desaturated.
2. **Quest page (`/quest`):** The seasonal background is rendering as plain white. The quote block and "What's alive this Spring" section both show on a white/off-white background with no seasonal theming. The hemisphere detection still works ("Detected: Northern hemisphere. Not right? Switch.") but the background it should set is not rendering at all.

**The correct appearance:**
- Dashboard: rich dark green cards (`#1a472a`) with white text, vivid forest background image
- Quest page: seasonal gradient or background color (green-tinted for spring, warm for summer/fall, cool for winter) behind all content sections, NOT plain white

**Screenshots:**
- Dashboard broken: pale card backgrounds, washed-out forest background
- Dashboard correct: rich dark green cards, strong contrast, dark background with white text
- Quest broken: white/off-white page background, no seasonal color, quote block floating on white
- Quest correct: seasonal background color behind all content

**Updated observation (2026-03-13 screenshot, corrected):** ALL 8 cards on the dashboard are showing white backgrounds -- both the "Pick Up Where You Left Off" row AND the 4 large persona cards (Investors, Land Projects, Alliance Partners, ReGen Players). The card bodies are white, and text is rendering in white or near-white with a drop shadow to stay legible. The cards are NOT dark green. The forest background image behind the cards is visible and looks fine -- this is a card-level background color issue only.

**Most likely root cause: dark/light mode class mismatch.** The site was designed to always render in "dark" mode (dark green cards, white text). If Tailwind's `darkMode` is set to `'class'`, it requires a `.dark` class on the `<html>` or `<body>` element to activate dark-mode styles. If that class is no longer being applied, all `dark:` prefixed styles stop working -- cards fall back to their light-mode defaults (white), and white text becomes invisible against white backgrounds, requiring shadow hacks to show at all.

**Check these first:**
1. Open browser DevTools on the live page. Inspect `<html>` -- does it have a `class="dark"` attribute? It should.
2. If not: find where the `dark` class is added in the codebase. Look in `main.tsx`, `App.tsx`, or a theme provider. It likely used to call `document.documentElement.classList.add('dark')` and that call got removed or conditionally blocked.
3. If `darkMode: 'media'` is in `tailwind.config.ts`, change it back to `darkMode: 'class'` and re-add the unconditional `document.documentElement.classList.add('dark')` call.
4. Do NOT add a user-facing light/dark toggle -- the site has one theme and it should always be dark.

**Likely culprits — check in this order:**

### 1. Check git diff immediately

Run `git diff HEAD~1` or `git log --oneline -5` then `git diff <last-good-commit>` to see exactly what CSS/component changes were made in the last commit. This will pinpoint the regression fast.

### 2. Fix 78 (readability audit) may have over-corrected

Fix 78 targeted "light text on light backgrounds." If it ran and changed dark-background classes thinking they were light, it could have flipped `bg-[#1a472a]` or `bg-[#0d2818]` to `bg-white` or `bg-gray-100`. Check:
- `client/src/pages/Dashboard.tsx` or the equivalent home/welcome page
- Any component with card classes: look for `bg-white` or `bg-gray-*` that should be `bg-[#1a472a]` or `bg-[#1a472a]/90`

### 3. Fix 83 (Connect forms dark backgrounds) may have changed a shared CSS class

Fix 83 changed `bg-white/95` to `bg-[#1a472a]/90` on form containers. If it accidentally modified a shared class or a global stylesheet instead of scoping to Connect.tsx, that change could have cascaded. Check `client/src/index.css` and any shared Tailwind config for unexpected overwrites.

### 4. CSS variable or Tailwind config change

Check `tailwind.config.ts` and `client/src/index.css` for any changes to:
- Custom color definitions (`--card-bg`, `--background`, or similar CSS variables)
- Any `@layer base` or `@layer components` rules that set background colors globally
- Dark mode config (`darkMode: 'class'` vs `darkMode: 'media'`) — if this changed, the site might now be responding to OS dark/light mode preference instead of always using the dark theme

### 5. If the cause is dark mode detection

If Tailwind's `darkMode` setting changed to `'media'`, the site would render differently based on the user's OS preference. The fix is to revert to `darkMode: 'class'` in `tailwind.config.ts` and ensure the root element has the `dark` class applied (or remove dark mode variants entirely if the site has only one theme).

### The fix

Once the cause is identified, revert only the lines that caused the regression. Do NOT re-run Fix 78 or Fix 83 as part of this fix — revert the damage first, then those fixes can be re-applied more carefully.

**Target card background value (correct):** `bg-[#1a472a]` or `bg-[#1a472a]/90` with `text-white`

**Files most likely affected:**
- `client/src/pages/Quest.tsx` — the seasonal background is set here, look for where `useHemisphere()` result is used to apply a background class or gradient. That className is likely now resolving to nothing or white.
- `client/src/pages/Dashboard.tsx` — the "Welcome Back" page card backgrounds
- `client/src/hooks/useHemisphere.ts` — if this hook changed, the season value it returns may no longer match the CSS class names expected by Quest.tsx
- `client/src/index.css` — check for any global background overrides
- `tailwind.config.ts` — check if dynamic class names (e.g. `bg-spring`, `bg-season-spring`) were added but are now being purged by Tailwind's content scanner

**Tailwind purge note:** If the seasonal background classes are constructed dynamically (e.g. `` `bg-${season}` ``), Tailwind's JIT compiler will NOT include them because it can't see the full class name at build time. All dynamic Tailwind classes must be safelisted in `tailwind.config.ts` under `safelist`, or replaced with full static class names in a lookup object:
```ts
const seasonBg = {
  spring: 'bg-[#e8f5e9]',
  summer: 'bg-[#fff8e1]',
  fall: 'bg-[#fbe9e7]',
  winter: 'bg-[#e3f2fd]',
}
```
This is a very common Tailwind gotcha and is likely the root cause of the quest page background disappearing.

**No DB changes. No `pnpm db:push`. Just CSS/component revert.**

---

## Fix 87 — Quest page: fix 4-button stack in bottom-right corner + replace trophy icon with path icon (Medium)

**Status:** PENDING

**What's broken:** There are now 4 separate fixed-position elements all landing in the same bottom-right corner of the quest page, stacking on top of each other:

1. A green circle notification/profile button (person icon with badge showing "0")
2. A "Friends" or community shortcut button (partially visible behind the tracker)
3. The quest progress tracker pill (`🏆 0/15` with progress bar)
4. The back-to-top arrow button

All 4 are fighting for `fixed bottom-* right-4` and the result is an unusable pile. Every one of them needs to be identified and given its own `bottom-*` value so they form a clean vertical stack with breathing room between each.

### Part A: Audit all fixed bottom-right elements on Quest.tsx

Search the codebase for all components rendered in Quest.tsx and its child components that use `fixed` positioning with `right-4` or `right-*`. Find each one and its current `bottom-*` value. The four elements likely live in:

- `client/src/components/QuestProgressTracker.tsx` (the tracker pill)
- `client/src/components/ScrollToTop.tsx` or inline in `Quest.tsx` (back to top)
- `client/src/components/NotificationBell.tsx` or similar (the green circle with badge)
- `client/src/components/FriendsButton.tsx` or similar (the "Fr..." button)

### Part B: Stack them cleanly with consistent spacing

Assign each a distinct `bottom-*` value, stacking upward from the bottom. Use 14px (`bottom-4`) as the base and add ~56px per item (accounting for button height + gap):

```tsx
// 1. Quest tracker pill — stays at the very bottom
className="fixed bottom-4 right-4 z-40"

// 2. Back to top — one step above tracker
className="fixed bottom-16 right-4 z-40"

// 3. Friends / community button — one step above that
className="fixed bottom-[6.5rem] right-4 z-40"

// 4. Notification / profile button — top of the stack
className="fixed bottom-40 right-4 z-40"
```

Adjust the exact values after verifying the actual rendered heights. The goal is a clean column of buttons with roughly 8-12px gap between each, none overlapping.

If any of these buttons only appear on the quest page, scope the `bottom-*` override to Quest.tsx rather than the component itself, to avoid affecting other pages.

### Part C: Replace trophy icon with path/trail icon

**File:** `client/src/components/QuestProgressTracker.tsx`

**Current:** `<Trophy className="w-4 h-4" />` (or 🏆 emoji)

**Replace with:** `<Footprints className="w-4 h-4" />` from lucide-react. If `Footprints` isn't in the installed version, check for `Route`, `Navigation`, or `MapPin` as fallbacks — run a quick import check first.

Update any tooltip or aria-label from "Quest Leaderboard" / "Trophy" to "Your Quest Journey" or "Quest Progress."

**No DB changes. No `pnpm db:push`.**

---

## Fix 88 — Quest page: remove hardcoded land project quest tags + add steward endorsement system (Medium)

**Status:** PENDING

**What's wrong:** Quest cards currently show hardcoded land project badges like "Finca Sagrada" and "Traditional Dream Factory" as if those orgs have endorsed or required those quests. These associations were seeded as placeholder data and should not appear as real endorsements. Land project stewards have not actually chosen them.

### Part A: Remove all hardcoded quest-to-land-project associations

Find where these badge associations live in the codebase. Look for:
- `questQualifiers.ts` or similar data file with hardcoded org-to-quest mappings
- Any `QUEST_METADATA` entries with org name strings
- Any seed data that inserts quest-org relationships

Remove all hardcoded entries. The badges should show nothing (or a faint "No endorsements yet" state) until a steward actively adds their project.

### Part B: Build the steward endorsement UI (Wave 4 — after pnpm db:push)

Land project and alliance org stewards (users with an approved `orgClaims` record) should be able to:

1. Visit their entity's profile or admin panel
2. See a list of all quests with checkboxes
3. Check quests they want to endorse or require for applicants
4. Save their selections

This requires a new DB table:

```ts
export const questEndorsements = mysqlTable("questEndorsements", {
  id: int("id").autoincrement().primaryKey(),
  orgId: varchar("orgId", { length: 255 }).notNull(),
  orgType: mysqlEnum("orgType", ["land_project", "alliance_org"]).notNull(),
  questId: varchar("questId", { length: 100 }).notNull(),
  endorsementType: mysqlEnum("endorsementType", ["recommended", "required"]).default("recommended").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
})
```

Add this to `drizzle/schema.ts` with the next `pnpm db:push` run.

**tRPC endpoints needed:**
- `quest.getEndorsementsForQuest(questId)` — public, returns list of orgs that endorse this quest
- `quest.setQuestEndorsements(orgId, questIds[], endorsementType)` — protected, steward-only

**Quest card display:** After the DB work, each card shows real endorsement badges dynamically from `getEndorsementsForQuest`. Until a quest is endorsed by anyone, show nothing.

**Files to check/change:**
- `drizzle/schema.ts` (new table — needs `pnpm db:push`)
- `server/routers/quest.ts` or similar
- `client/src/data/questQualifiers.ts` (remove hardcoded data immediately, Part A)
- `client/src/components/QuestCard.tsx` (remove hardcoded badges)

**Part A (remove hardcoding) = no DB needed, do now.**
**Part B (steward UI + dynamic badges) = needs `pnpm db:push`, Wave 4.**

---

## Fix 89 — Quest page: expand "Why Quests?" dropdown with arc + philosophy content from master sheet (Medium)

**Status:** PENDING

**What's there now:** The "Why Quests?" collapsible section has 5 simple icon boxes (Heal Ourselves, Grow & Learn Together, Distribute Ownership, Co-Create the Game, Regenerate Relationships) with one-line descriptions. Good structure, thin on depth.

**What to add:** Below the 5 boxes, add a second expandable layer inside the same collapsible with richer narrative drawn from `QUEST_MASTER_SHEET.md` Parts 1 and 2. This gives people who want more context a way to go deeper without cluttering the page for people who don't.

### Structure

The expanded "Why Quests?" section should have two tiers:

**Tier 1 — current** (always shown when the accordion is open):
The 5 icon boxes as they are.

**Tier 2 — new** (shown below the 5 boxes, either always or behind a second "Read the Arc" toggle):
Three collapsible panels, each drawing from the master sheet:

**Panel 1: The Arc — How All Quests Connect**
Draw from `QUEST_MASTER_SHEET.md` Part 2. Short version for the panel:

> We begin with Fire. Before we can build anything new we have to be willing to let go of the old.
>
> Then we add life to our bodies. The Potions Quest changes the information processing in all three minds: gut, heart, and head.
>
> Then we plant. The Food Foresting quest, done after Potions, seeds the earth with the expanded ecosystem of our own body.
>
> From there, the quests move outward. From personal vitality into relationship, communication, and community. The NVC Quest (Quest 10) bridges individual healing into collective co-creation.
>
> The seasonal quests deepen and diversify. The EPIC Quests are acts of collective transformation.

**Panel 2: What the Tokens Mean**
Draw from `QUEST_MASTER_SHEET.md` Part 1:

> $ReGen tokens are earned by completing quests and contributing to the mission. They represent your participation in building a regenerative civilization. As the game grows, so do the opportunities for the tokens to carry value.
>
> RGVoice tokens give you a say in the governance of the game itself — so the Game is always governed by those who are playing it.

**Panel 3: Quests as Qualifiers**
Draw from `QUEST_MASTER_SHEET.md` Part 2 — qualifier section:

> Land projects and alliance organizations can require that applicants complete certain quests before applying to join or contribute. This ensures applicants have genuine lived experience with regenerative practices, builds a shared language across the community, and distributes tokens to people doing real work before they enter governance roles.
>
> Example: voting rights in a DAO might require 5 quests + 1 seasonal quest. Land project stewardship might require Quest 4 (Food Foresting) + Quest 3 (Healing Whole) + any 2 others.

### Implementation

**File:** `client/src/pages/Quest.tsx` — find the "Why Quests?" accordion component (likely `QuestWhySection`, `WhyQuestsAccordion`, or inline JSX in the Quest page).

Add the three panels below the existing 5 boxes. Each panel should be:
- A subtle divider line above
- A small heading (e.g. "The Arc" / "The Tokens" / "Quests as Qualifiers")
- 2-4 short paragraphs of prose
- No lists or bullets — this is narrative, not a feature breakdown
- Text color: `text-[#1a472a]` or `text-[#2d6a4f]` on the light background

The panels can all be visible at once (no nested accordion needed) since they're already inside the outer "Why Quests?" collapsible. Just well-spaced sections with clear headings.

**No DB changes. No `pnpm db:push`.**

---

## Fix 90 — Quest page: add 18 new seasonal quests to existing season carousels + generate card images (High)

**Status:** PENDING

**Context:** The 18 new seasonal quests from `QUEST_MASTER_SHEET.md` Part 4 need to be added as full quest cards inside the existing season tabs (Spring, Summer, Fall, Winter, and a new Anytime tab). They appear AFTER the existing quests in each season — not in a separate section.

**Carousel placement:**
- Spring tab: existing quests 1, 2, 3 → then add: Healing the Five Bodies, Study Natural Hygiene, ReGen Financial Systems
- Summer tab: existing quests 5, 6, 7 → then add: Friendship with a Free Animal, Your Honey Moon, Singing to Your Food Forest, Animal Spirit Totems
- Fall tab: existing quests 8, 9, 9b → then add: Future Casting, Eating Sunlight, Becoming Trauma Informed
- Winter tab: existing quests 10, 11, 12 → then add: Write a Children's Book, Make a Song for the ReGeneration, Recreate Your Personal Cycles
- New Anytime tab: Decrease Expenses/Increase Joy, Hermetic Seal, Start a Friend Pool, Present Parenting, The Fifth Agreement

### Card data required for each new quest

Each card needs the same fields as existing cards. Add to `client/src/data/seasonalQuestsData.ts`:

```ts
{
  id: "healing-five-bodies",          // slug-style ID
  title: "Healing the Five Bodies",
  subtitle: "Soul, Body, Heart, Mind, Spirit",
  season: "spring",
  rewards: { regen: 111, rvoice: 1 }, // placeholder — Rye to confirm
  time: "Ongoing practice",
  deliverable: "A documented daily and seasonal practice tending all five layers",
  description: "Most healing traditions recognize multiple layers of the human being...",
  storyCard: "...",                    // from QUEST_MASTER_SHEET Part 4
  image: "/quest-images/seasonal/healing-five-bodies.png",
  element: "fire",                     // elemental category — adjust per quest
}
```

Use the content from `QUEST_MASTER_SHEET.md` Part 4 for each quest's `description` and `storyCard` fields. Token rewards are marked TBD until Rye confirms — use 111 $ReGen + 1 RVoice as placeholder for all new quests.

### Images

Generate one hero image per new seasonal quest using the same photorealistic style as the existing Spring quest card images (close-up photography of nature, hands, food, people in natural settings). Save to `public/quest-images/seasonal/`. Suggested prompts per quest are in the table below:

| Quest | Image prompt |
|---|---|
| Healing the Five Bodies | Person meditating in soft layered light in a forest clearing, peaceful and radiant |
| Study Natural Hygiene | Hands cupping clean spring water in bright forest sunlight, vibrant greenery |
| ReGen Financial Systems | Hands exchanging handmade tokens at a colorful outdoor farmers market |
| Friendship with a Free Animal | Person sitting still in summer forest while a wild deer approaches and makes eye contact |
| Your Honey Moon | Golden honeycomb close-up with raw honey dripping, wildflower meadow behind |
| Singing to Your Food Forest | Person singing with arms open wide in a lush food forest, morning light |
| Animal Spirit Totems | Person in ceremony surrounded by symbolic animal imagery from their bioregion |
| Future Casting | Person in meditation with soft visions of a lush regenerative future city floating around them |
| Eating Sunlight | Hands picking fresh berries directly from a bush in golden autumn light |
| Becoming Trauma Informed | Two people in deep compassionate conversation by warm firelight |
| Write a Children's Book | Elder and child writing together in a cozy firelit room, colorful illustrations visible |
| Make a Song for the ReGeneration | Person playing guitar by a fire with a small community gathered around |
| Recreate Your Personal Cycles | Person lying in a meadow at night under a full moon, journal open, stars above |
| Decrease Expenses, Increase Joy | Simple joyful meal being cooked at home, garden visible through the window |
| Hermetic Seal | Person in focused creative work surrounded by glowing vitality and symbols of energy |
| Start a Friend Pool | Group of friends sharing food and resources at a community table, warmth and laughter |
| Present Parenting | Parent and young child fully present together in nature, eyes meeting, total attention |
| The Fifth Agreement | Open book with warm light and symbolic imagery of new agreements being made |

**No DB changes. No `pnpm db:push`.**

---

## Fix 91 — Forum community page partially rendering in Russian (High)

**Status:** PENDING

**Symptom:** Visiting `/community` shows a mix of English and Russian. The following elements appear in Russian:
- Page badge: "Форум сообщества" (should be "Community Forum")
- Main title: "Роща встреч" (should be "Grove of Gatherings" or the configured English title)
- Stats: "97 темы · 11 разделы" (should be "97 threads · 11 categories")
- Primary CTA button: "Начать обсуждение" (should be "Start a Discussion")
- Search placeholder: "Поиск по темам..." (should be "Search topics...")

The subtitle and footer stats remained in English, so this is not a full browser-level translation -- it is either (a) hardcoded Russian strings inside the component or (b) an i18n library auto-detecting a Russian locale from the browser.

**Root causes to check, in order:**

1. **Hardcoded Russian strings in the component** -- search `client/src/` for any of the Cyrillic strings above (`Роща встреч`, `Форум сообщества`, `Начать обсуждение`, `Поиск по темам`). If found, replace with the intended English copy.

2. **i18n / locale library** -- check if the project uses `i18next`, `react-intl`, or any locale detection library. If a locale JSON file for Russian (`ru.json`) exists and is being loaded, remove or disable it. Ensure the default locale is always `en`.

3. **Browser auto-translate bled into the bundle** -- unlikely to cause static string changes, but if the component fetches any title or label from an external API or DB field that stored Russian text, trace the data source.

**Fix:**

- Grep the codebase for Cyrillic characters: `grep -r '[А-Яа-яЁё]' client/src/` and `grep -r '[А-Яа-яЁё]' server/`
- Replace every found string with the correct English version
- If an i18n config exists, lock the locale to `en` and remove the Russian locale bundle
- All UI strings in `Community.tsx`, `ForumHeader.tsx`, or equivalent should be plain English literals -- not pulled from a locale file

**Files likely affected:** `client/src/pages/Community.tsx`, `client/src/components/forum/ForumHeader.tsx` (or equivalent), any `i18n/` or `locales/` folder

**No DB changes needed.**

---

## Fix 92 — Community page: land project and org card images broken (High)

**Status:** PENDING

**Symptom:** Land project cards on `/community` show broken image placeholders. The alt text is visible ("Tioga", "LaLa Gardens Cooperative") but no actual image renders. This is the map-tile fallback from Fix 70 -- the generated hero images either were never saved or their paths don't match what the component expects.

**Fix:**

1. Check what image path the community component expects for each card. Look in `Community.tsx` or the equivalent component rendering the Earth section cards for the `img src` value.
2. Check whether those files actually exist in `public/` (or wherever static assets are served from).
3. If the files don't exist: use a temporary placeholder approach until images are generated. Options in order of preference:
   - Inline `onError` fallback on each `<img>`: `onError={(e) => { e.currentTarget.src = '/images/placeholder-landscape.jpg' }}`
   - Or replace broken `<img>` tags with a styled div showing the location tag + project name on a gradient background that matches the project's region color
4. Once images are generated and saved to the correct path, the `<img src>` tags will resolve automatically.
5. Log a note in the code: all card images should live at `public/images/community/[slug].jpg` so future additions know where to put them.

**No DB changes needed.**

---

## Fix 93 — Forum seed scripts: change post author to "ReGen Civics Team" (High)

**Status:** PENDING -- script changes only, re-seed after

**Symptom:** Forum posts seeded by scripts show Rye's personal name ("Rieki Cordon") as the author. Seeded content should show a neutral team identity.

**Fix:**

1. Check whether a "ReGen Civics Team" user already exists in the `users` table. If not, create one as part of the seed script:
   ```ts
   // At the top of each seed script, ensure the team user exists
   const TEAM_EMAIL = 'team@regencivics.earth'
   let [teamUser] = await db.select().from(users).where(eq(users.email, TEAM_EMAIL)).limit(1)
   if (!teamUser) {
     const [result] = await db.insert(users).values({
       email: TEAM_EMAIL,
       username: 'ReGen Civics Team',
       displayName: 'ReGen Civics Team',
       // any other required fields with sensible defaults
     })
     teamUser = { id: result.insertId, ...  }
   }
   const TEAM_USER_ID = teamUser.id
   ```
2. Replace all `userId: RYE_USER_ID` (or `userId: 1` or whatever the current hardcoded value is) with `userId: TEAM_USER_ID` in every seeded post and reply insertion.
3. Apply to: `scripts/seed-forum-posts.ts`, `scripts/seed-land-project-threads.ts`, `scripts/seed-quest-forum-posts.ts`, and any other seed scripts that insert forum content.
4. The `$Env:RYE_USER_ID` env var will no longer be needed for seeding posts -- remove references to it from seed scripts (but keep it if it's used elsewhere, like for setting application owners).

**Re-seed command (Rye runs after this ships):**
```powershell
npx tsx scripts/seed-forum-posts.ts --reset
```

**No DB schema changes needed.**

---

## Fix 94 — Community page: location corrections + remove inactive project cards and threads (High)

**Status:** PENDING

**Two parts:**

### Part A: Location corrections

The following land projects have wrong locations in the community component data and/or seed scripts:

| Project | Current (wrong) | Correct |
|---|---|---|
| Finca Sagrada | (unknown) | Ecuador |
| Liminal Village | (unknown) | Italy |

Find wherever these location strings are set -- likely in `Connect.tsx` hardcoded data, `seed-active-entities.ts`, or a `landProjects` array -- and update to the correct values.

### Part B: Remove inactive projects

The following land projects are no longer active and should be removed from:
- The community page cards (Earth section)
- Any seeded forum threads for these projects
- Any hardcoded arrays in `Connect.tsx`, `Community.tsx`, or related components

**Projects to remove:**
- Ubuntu
- Tioga
- Tabi
- LaLa Gardens Cooperative
- Highland Lake

**In seed scripts:** Filter the seeded projects list to exclude these five names. If there is an `isActive` flag, set it to `false` for these. If it's a hardcoded array, remove their entries.

**In forum seed scripts:** Remove any threads, posts, or replies seeded for these projects. If using `--reset`, they simply won't be re-inserted.

**In community component data:** Remove from any hardcoded arrays so their cards don't appear.

**Do NOT delete anything from the DB directly** -- the `--reset` seed flag handles cleanup on re-seed. Code changes handle the component data.

**No DB schema changes needed.**

---

## Fix 95 — Community page: collapsible section accordion (High)

**Status:** PENDING

**Context:** The `/community` page currently shows all sections at once -- land project cards, org cards, forum categories, and more -- in one long scroll. When a user first arrives they should see clean section headings and choose what to open, not wade through everything.

**Design spec:**

Each major section on the community page becomes a collapsible accordion panel:

| Section | Default state | Heading text |
|---|---|---|
| Earth -- Land Projects | Collapsed | "🌍 Earth — Land Projects" |
| Alliance Orgs | Collapsed | "🤝 Alliance Organizations" |
| Forum Categories | Collapsed | "💬 Forum" |
| Quests + Seasonal | Collapsed (if present) | "⚡ Active Quests" |
| Any other major section | Collapsed | (use existing section title) |

**Implementation:**

Use Radix UI `Accordion` (already in the project via shadcn) or a simple `useState` toggle if Radix isn't already imported in this file. Prefer Radix for consistency.

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

// In Community.tsx:
<Accordion type="multiple" defaultValue={[]}>
  <AccordionItem value="earth">
    <AccordionTrigger className="text-xl font-semibold">
      🌍 Earth — Land Projects
    </AccordionTrigger>
    <AccordionContent>
      {/* existing land project cards grid */}
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="alliance">
    <AccordionTrigger className="text-xl font-semibold">
      🤝 Alliance Organizations
    </AccordionTrigger>
    <AccordionContent>
      {/* existing org cards grid */}
    </AccordionContent>
  </AccordionItem>

  <AccordionItem value="forum">
    <AccordionTrigger className="text-xl font-semibold">
      💬 Forum
    </AccordionTrigger>
    <AccordionContent>
      {/* existing forum category list */}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

- `type="multiple"` allows more than one section open at a time
- `defaultValue={[]}` starts all collapsed
- Existing section subtitles ("Land project spaces. Where the work is rooted.") move inside the AccordionTrigger or appear as a small paragraph just below the trigger heading before the content expands
- Keep the overall page hero/intro section outside the accordion (it should always be visible)
- Style the accordion triggers to match the site's existing section header style

**Files affected:** `client/src/pages/Community.tsx` (primary), possibly `client/src/components/community/` subcomponents

**No DB changes needed.**

---

## Final Handoff Breakdown (2026-03-13 — complete)

### YOU (Rye) — must do before Claude Code can proceed on these

| Task | Covers | Command |
|---|---|---|
| `pnpm db:push` | Fix 68 (orgClaims), Fix 73 (entityRssFeeds + orgClaims.rssPromptDismissed), Fix 74 (forumReports.severity), Fix 77 (questCompletions + activeQuestSignals) — do all in one push | `pnpm db:push` |
| Run `seed-active-entities.ts` | Fix 68 — populates land project + org records | `$Env:RYE_USER_ID=1; npx tsx scripts/seed-active-entities.ts --dry-run` then live |
| Finish editing QUEST_MASTER_SHEET.md | Fix 76 PDFs, Fix 77 improvement 6 story card text, Fix 77 seasonalQuestsData.ts + epicQuestsData.ts content | Edit in workspace |
| Re-seed forum posts | Fix 85 + Fix 93 — clears all old posts and replies, re-seeds with fixed links, team author, + 18 new seasonal quest posts + EPIC Quest threads | `npx tsx scripts/seed-forum-posts.ts --reset` |
| `git add -A && git commit && git push` | Deploy all coded fixes | After verifying locally |

### CLAUDE CODE — ready to build now (no DB push needed)

All fixes marked PENDING that don't touch the DB schema can be started immediately:

Fix 86 — URGENT FIRST: color regression on landing/dashboard page (do before anything else)
Fix 87 — Quest page: fix 4-button pile-up in bottom-right + change trophy to path icon
Fix 88 Part A — Remove hardcoded land project quest tags from cards (no DB needed)
Fix 89 — Expand "Why Quests?" dropdown with arc + philosophy content
Fix 90 — Add 18 new seasonal quests to existing season carousels + generate images
Fix 91 — URGENT: fix Russian language strings on /community page
Fix 92 — Fix broken land project/org card images on /community
Fix 93 — Update all forum seed scripts: author = "ReGen Civics Team"
Fix 94 — Location corrections (Finca Sagrada = Ecuador, Liminal Village = Italy) + remove inactive project cards/threads (Ubuntu, Tioga, Tabi, LaLa Gardens, Highland Lake)
Fix 95 — Community page: wrap all major sections in collapsible accordion panels
Fix 79, 80, 81, 82, 83, 84, 85 — pure UI/frontend/script changes, no schema dependency
Fix 78 Part A — targeted readability fixes in known files
Fix 78 Part B — audit script (no DB needed)
Fix 76 A+B — flip hint and card changes (not the PDFs)
Fix 77 improvements 2, 4, 5, 9, 10, 11, 12, 13, 14, 15, 16, 19, 20 — no new DB tables needed
Fix 72, 75 — Community.tsx additions (no new schema)
Fix 77 improvements 1, 3, 6, 7, 8, 17, 18 — need DB tables (wait for pnpm db:push)
Fix 73, 74 — need schema changes (wait for pnpm db:push)

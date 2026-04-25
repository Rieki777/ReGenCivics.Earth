# Claude Code Session: Community Agreements + Forum UI + Schedule Page

**Date:** 2026-03-27 (Part 3)
**Project:** regen-civics-clean
**What this is:** Implementation prompt for the Community Agreements interactive page, forum UI polish, land/alliance category routing fixes, schedule page calendar standardization, and Zoom-to-Riverside migration. All DB migrations are already applied to Railway production.

**Read `COMMUNITY_AGREEMENTS_PLAN.md` first.** It has the full spec with exact code snippets, component structures, and tRPC route definitions. This prompt tells you what to do and in what order. The plan doc tells you how.

**Read `CLAUDE.md` before writing any user-facing copy.** Writing rules are non-negotiable: zero em-dashes, no AI-isms, no contrast-framing, no rhetorical questions, no passive inspiration.

---

## DB State: ALREADY LIVE

All 5 migrations (0086-0090) plus manual renames are already applied in Railway. Do NOT tell Rye to run them. The following is live in production:

- `communityAgreements` table (id, authorId, title, description, category, status, voteCount, forumThreadId, createdAt, updatedAt)
- `communityAgreementVotes` table (id, agreementId, userId, createdAt, UNIQUE on agreementId+userId)
- 6 ratified agreements seeded (Honesty, Respect, Curiosity, Regeneration, Address ideas not people, No spam or misinformation)
- `forumCategories.imageUrl` column (VARCHAR 500, nullable)
- All threads moved from `active-projects` to `land-projects` category
- All threads moved from `active-organisations` to `alliance-partners` category
- Old `active-projects` (id 11) renamed to "Land General", slug `land-general`, sortOrder 3, icon "Sprout"
- Old `active-organisations` (id 10) renamed to "Alliance General", slug `alliance-general`, sortOrder 7, icon "Users"

---

## Execution Order

Work through these in order. Run `pnpm build` after each major part to catch errors early.

### Part 1: Schema + Backend for Community Agreements

**1a. Update `drizzle/schema.ts`**
- Add `communityAgreements` table definition (see plan section 1A for exact Drizzle syntax)
- Add `communityAgreementVotes` table definition (see plan section 1A)
- Add `imageUrl: varchar("imageUrl", { length: 500 })` to `forumCategories` table definition

**1b. Add DB helper functions to `server/db.ts`**
- `listCommunityAgreements(sortBy, status, limit, offset)` — see plan section 1B
- `createCommunityAgreement(data)` — see plan section 1B
- `toggleCommunityAgreementVote(userId, agreementId)` — see plan section 1B
- `getUserCommunityAgreementVotes(userId)` — see plan section 1B

**1c. Create `server/routes/agreements.ts`**
- New tRPC router with 4 procedures: `list`, `myVotes`, `create`, `toggleVote`
- `create` must auto-create a forum thread in `air-conversations` category
- See plan section 1C for full implementation

**1d. Wire up in `server/routers.ts`**
- Import `agreementsRouter` from `./routes/agreements`
- Add `agreements: agreementsRouter` to appRouter

**1e. Fix `ensureEntityForumThread` in `server/db.ts`**
- Around line 2698: Change `'active-projects'` to `'land-projects'`
- Change `'active-organisations'` to `'alliance-partners'`

**1f. Fix `server/routes/applications.ts`**
- Around line 339: Change category lookup from `active-projects` to `land-projects` when status = "approved"
- Around lines 606-668: Change org claims thread creation from `active-organisations` to `alliance-partners`

**1g. Update `server/routes/forum.ts`**
- Add `imageUrl: z.string().max(500).optional()` to `createCategory` input schema
- Add `imageUrl: z.string().max(500).optional()` to `updateCategory` input schema
- Pass `imageUrl` through to DB functions
- Simplify `activeOrganisationThreads` (lines 306-313): use only `alliance-partners`, remove fallback to `active-organisations`

**1h. Update category DB functions in `server/db.ts`**
- `createForumCategory`: accept and insert `imageUrl`
- `updateForumCategory`: accept and update `imageUrl`

**Run `pnpm build` here. Fix all type errors before continuing.**

---

### Part 2: Community Agreements Page (Frontend)

**2a. Rewrite `client/src/pages/CommunityGuidelines.tsx`**

Complete rewrite. Model after `QuestSuggestions.tsx`. The page needs:

**Section 1 (top): Active Agreements (ratified)**
- Clean list of ratified agreements
- Each shows: title, description, category badge, "Ratified" status badge
- No voting on ratified agreements

**Section 2: Proposals (open)**
- "Propose an Agreement" button (requires auth)
- Form fields: title (text), description (textarea), category (dropdown: Forum Conduct, Moderation, Land Projects, Governance, Social Spaces, Events)
- Sort toggle: Top (votes) / New (newest)
- Each proposal card: title, description, author name, vote count, vote button, category badge, link to forum discussion thread
- Vote button highlights when user has voted
- Rank badges (#1, #2, #3) when sorted by votes

**Hero section:**
- Green/nature styling consistent with current site
- Title: "Community Agreements"
- Subtitle: "This is a space for people building a regenerative world. These agreements help us keep it honest, generous, and worth showing up for."
- Back link to `/community`

See plan section 1D for component structure, queries, and mutations.

**2b. Fix link in `Community.tsx`**
- Around line 1128: Change `/community-guidelines` to `/community/guidelines`

**Run `pnpm build`.**

---

### Part 3: Forum UI Changes in `Community.tsx`

**3a. Rename Air section**
- Section button subtitle (around line 578): "Hard Conversations" to "Clarity & Agreements"
- Panel header (around line 1103): "Air: Hard Conversations" to "Air: Clarity & Agreements"
- Panel description (around line 1105): Replace text with: "Where we get clear on how we show up. Agreements, healthy conversations, and the things worth saying out loud."

**3b. Rename card title**
- Card 1 in Air section (around line 1121): "Hard Conversations" to "Healthy Conversations"
- Keep subtitle "Clear what's stagnant" as is

**3c. Fix broken image paths**
- Card 1 image (around line 1118): `quest-10-nvc.webp` to `quest-10-communication-patterns.webp`
- Card 2 image (around line 1130): `quest-12-breathplay.webp` to `quest-12-breathplay-future-dreaming.webp`

**3d. Add new slugs to `SECTION_SLUGS`**
- In `SECTION_SLUGS` (around lines 197-201), add `'land-general'` and `'alliance-general'`
- This keeps them in their dedicated sections instead of dumping into General

**3e. Add cards for the new general categories**
- Earth section: add a "Land General" card linking to `/community/c/land-general` with Sprout icon, earth-tone color
- Alliance section: add an "Alliance General" card linking to `/community/c/alliance-general` with Users icon

**3f. Add image upload to "Add Category" form**
- Around line 704 where the form has 3 inputs (name, slug, description)
- Add the existing `FileUpload` component (from `client/src/components/FileUpload.tsx`)
- On file select, upload via `trpc.files.upload` (already exists in `server/routes/global.ts`)
- Store returned URL in state, pass as `imageUrl` when creating category

**3g. Update category card rendering for images**
- For general categories (around line 630): if `category.imageUrl` exists, render an `<img>` tag. Fall back to icon + color display when no imageUrl

**Run `pnpm build`.**

---

### Part 4: Schedule Page — Calendar Button Standardization

**File:** `client/src/pages/Schedule.tsx`

Three calendar cards have completely different button styles and names. Standardize all of them.

**Primary button (Google Calendar):**
```
className="bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] px-4 py-2 rounded-xl font-semibold transition-colors text-sm"
```
Label: "Google Calendar" (same text on all cards)

**Secondary button (Apple/Outlook):**
```
className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm border border-white/20"
```
Label: "Apple/Outlook" (same text on all cards)

Apply to:
- Card 1 "Season 2 Episodes" (around lines 440-478)
- Card 2 "All Events" (around lines 478-527)
- Card 3 "Open Access Session" (around lines 525-560)

Card 2 can keep a third "Download .ics" button only if the snapshot download is a different action from the live subscription. Style it as:
```
className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white px-4 py-2 rounded-xl font-medium transition-colors text-xs border border-white/10"
```

---

### Part 5: Schedule Page — Zoom to Riverside Migration

**File:** `client/src/pages/Schedule.tsx`

**5a. Replace `ZOOM_INFO` constant (lines 39-51)**

Delete the entire `ZOOM_INFO` object. Replace with:
```typescript
const RIVERSIDE_INFO = {
  topic: "ReGen Civics Season 2",
  description: "Join ReGen Civics in Season 2! Helping land projects evolve to the next stage of their regenerative journeys.",
  roomUrl: "https://riverside.com/studio/rieki-cordon-riekis-studio",
};
```

**5b. Update "All Episodes via Zoom" section (lines 565-616)**
- Rename heading to "All Episodes via Riverside"
- Remove: Meeting ID display + copy button, Passcode display + copy button, dial-in phone numbers
- Replace with: "Join on Riverside" button linking to `RIVERSIDE_INFO.roomUrl`
- Add text: "Join via your browser. No download required."

**5c. Update all hardcoded fallback events (lines 56-240)**
- Every fallback event has Zoom URLs baked into `googleCalendarUrl` and `appleCalendarUrl`
- Replace all Zoom links with `RIVERSIDE_INFO.roomUrl` (which is `https://riverside.com/studio/rieki-cordon-riekis-studio`)

**5d. Update dynamic URL builders**
- `buildGcalUrl` (around line 249): Riverside URL instead of Zoom
- `buildIcsBlob` (around line 256): Riverside URL instead of Zoom

**5e. Update event card join buttons (lines 818-838)**
- The fallback on line 832 says "Join on Zoom" and links to `ZOOM_INFO.link`
- Change to "Join on Riverside" linking to `RIVERSIDE_INFO.roomUrl`
- The comment on line 818 already says "Riverside takes priority over Zoom", so just fix the fallback

**5f. Update info section heading (around line 972)**
- "Join Zoom or Youtube" becomes "Join on Riverside or YouTube"

**Run `pnpm build`.**

---

### Part 6: Migration SQL Files (Version Control Only)

These files are already applied in Railway. Create them in the repo for version control:

1. `drizzle/0086_community_agreements.sql`
2. `drizzle/0087_seed_existing_agreements.sql`
3. `drizzle/0088_category_images.sql`
4. `drizzle/0089_move_land_threads.sql`
5. `drizzle/0090_move_alliance_threads.sql`

See `COMMUNITY_AGREEMENTS_PLAN.md` for exact SQL content.

---

## What NOT To Do

- Do NOT run any DB migrations. They are already applied.
- Do NOT modify questData.ts or quest-related code.
- Do NOT change Welcome Aboard quest threads.
- Do NOT recreate migration files 0083, 0084, 0085 (already applied from earlier sessions).
- The Riverside room URL is `https://riverside.com/studio/rieki-cordon-riekis-studio`. Use this as the real value in `RIVERSIDE_INFO.roomUrl`.

---

## Done Criteria

All must be true before claiming done:

- [ ] `pnpm build` passes with zero errors
- [ ] Community Agreements page renders with ratified section + proposals section
- [ ] Voting works (toggle on/off, auth required)
- [ ] Proposal form creates agreement + auto-creates forum thread in air-conversations
- [ ] Air section renamed to "Clarity & Agreements"
- [ ] Card 1 title is "Healthy Conversations", subtitle unchanged
- [ ] Both Air cards show correct images (communication-patterns.webp + breathplay-future-dreaming.webp)
- [ ] Add Category form includes image upload via FileUpload component
- [ ] Category cards show images when available, fall back to icons
- [ ] Link in Community.tsx points to `/community/guidelines`
- [ ] `ensureEntityForumThread` routes land_project to `land-projects` and alliance_org to `alliance-partners`
- [ ] `applications.ts` approval flow creates threads in `land-projects` (not active-projects)
- [ ] `alliance-general` and `land-general` are in SECTION_SLUGS
- [ ] Earth section has a "Land General" card linking to `/community/c/land-general`
- [ ] Alliance section has an "Alliance General" card linking to `/community/c/alliance-general`
- [ ] All 3 calendar cards have uniform button styling ("Google Calendar" green, "Apple/Outlook" ghost)
- [ ] All Zoom references in Schedule.tsx replaced with Riverside
- [ ] `RIVERSIDE_INFO.roomUrl` set to `https://riverside.com/studio/rieki-cordon-riekis-studio`
- [ ] All 5 migration SQL files exist in `drizzle/`
- [ ] Zero em-dashes in any user-facing copy

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Turn ON the Zapier automation | Zapier account | Zapier dashboard, toggle the Zap ON |
| 2 | Verify Riverside Pro plan hours | Riverside account | 13 episodes x 2 hours = 26 hours needed |
| 3 | `git push` after Claude Code finishes | Git credentials | `git add -A && git commit -m "community agreements + forum polish + schedule riverside" && git push` |

### ALREADY DONE (verified via browser)

| # | Task | Status |
|---|------|--------|
| 1 | Riverside studio exists: "ReGen Civics Studio" | DONE |
| 2 | Room URL: `https://riverside.com/studio/rieki-cordon-riekis-studio` | DONE, hardcoded in prompt |
| 3 | YouTube connected: SEEDS: ReGenerative Renaissance channel | DONE |
| 4 | Facebook connected: Rieki Cordon profile | DONE |

### CLAUDE CODE — can do without you

| # | Task | Status |
|---|------|--------|
| 1 | Schema updates in drizzle/schema.ts | READY |
| 2 | DB helper functions in server/db.ts | READY |
| 3 | agreements tRPC router (server/routes/agreements.ts) | READY |
| 4 | Wire agreementsRouter in server/routers.ts | READY |
| 5 | CommunityGuidelines.tsx full rewrite | READY |
| 6 | Community.tsx: rename Air section, fix images, add cards, image upload | READY |
| 7 | ensureEntityForumThread slug fixes in server/db.ts | READY |
| 8 | applications.ts category slug fixes | READY |
| 9 | forum.ts: imageUrl support + simplify alliance threads | READY |
| 10 | Schedule.tsx calendar button standardization | READY |
| 11 | Schedule.tsx Zoom to Riverside migration | READY |
| 12 | Migration SQL files for version control | READY |

### WAITING ON YOU before Claude Code can proceed

Nothing blocked. Claude Code can execute everything in this prompt. Riverside room URL is now hardcoded. Only Zapier toggle and git push remain as human steps after Claude Code finishes.

# Fixes to Make — 2026-03-29

This document continues from the archived fixes docs. All items sourced from Rye's Telegram notes + screenshots.

**Priority order:** Critical (launch-blockers) first, then High, Medium, Low.

---

## Fix 1 — Game Page: Replace Intro Text (High)

**Status:** READY FOR CLAUDE CODE

**Symptom:** The "So what's the Game?" section text is outdated and has a typo ("Ifinite Game").

**Root cause:** Copy was never updated after Rye rewrote it.

**Fix:** Replace the entire collapsible body in `Game.tsx` lines 266-384. The new copy uses `##` headers as visual `<h3>` section breaks and adds two new paragraphs at the end (about Quests growing into coordination infrastructure and the welcome message). Also add two CTA buttons after the collapsible: "Explore Tokenomics" linking to `/tokenomics` and "Explore Governance" linking to `/governance`.

**New copy (verbatim from Rye):**

The intro section currently has one collapsible with flat `<p>` tags and `<p className="font-semibold">` sub-headers. Restructure into proper sub-sections with `<h3>` elements for each `##` heading:

1. **"So what's the Game?"** (h2, already exists)
   - Teaser line stays the same
   - Body paragraphs updated (see full text below)

2. **"So if it's so important, why call it a Game?"** (new h3)

3. **"The Infinite Part"** (new h3)

4. **"2 main parts to this Game:"** (new h3)

5. **"Quests!"** (new h3)

6. After the collapsible, add two new paragraphs then two buttons.

**Full replacement text for the collapsible body (lines 285-352):**

```
What do we mean "The Thing"? Let's start here as it's the most important.

The "Thing" is creating a civilization that's a healthy, joyful, fulfilling and magical place to raise ourselves, our children, and the more than human world.

The thing about "The Thing" is there's no right - or single - answer. There are however a growing diversity of much better answers than the dominant way we're doing this as a human species...

The Thing is hard, The Thing is monumental... and it's necessary, fun, fulfilling to work on, and deeply meaningful and evolutionary to be part of (at least it is for the person writing these words...).

Nobody knows the absolute right way to do it, and there isn't one. So, we need to try and have thousands (or more) of viable options to learn from and choose between.

Because if we can't choose the story in which we raise ourselves, we aren't choosing anything meaningful.

[H3: So if it's so important, why call it a Game?]

There's so many layers to this, let's start with the surface.

We design from the point of view of a Game so that it's simple for people to participate.

Because the old Games (corporatism, nationalism, capitalism, etc) are taking everyone's time and degrading our attention. So, it needs to be extremely easy to participate, and designing it like a Game helps us consider this lens and design for it.

Second, if we get to make new economic, financial and governance systems, why not make them as fun as possible?!

Imagine if the vast majority of our days were spent in authentically fulfilling and fun-to-be-part-of-ways where we're actively co-creating regenerative civilizations and the realities we inhabit...

In our opinion this is the best Game to play. Which is also why we call it a Game. It's the best Game!

Which brings us to part 3...

[H3: The Infinite Part]

The Game isn't designed to end "finite Games" that have winners, losers, and outcomes.

This Game is continually redesigned by and for the players - to become a better and better Game to play!

The catalysts that are forming ReGen Civics are not the founders, owners, C-Suite, etc. of this vital piece of community infrastructure.

Our roles are simply to get the Game started then make ourselves obsolete as quickly as we can while still supporting the healthy development of the Game.

Much like the pattern for raising healthy children.

In this way we continually evolve the Game to better serve us and the goal of co-creating a growing diversity of regenerative realities, villages, projects, etc.

This is why we call it an "Infinite Game".

[H3: 2 main parts to this Game:]

Much of what we're doing is building bridges from one Game, the Dominant Game, to a growing diversity of new Games. We approach this by mastering the economic systems of the old Game and the New Games simultaneously.

That's why we have 2 distinct spaces.

The ReGen Civics Fund is designed to be deeply rooted in the old Games, working to master that Game through using the most powerful coordination structures - a Fund - to ensure we have the capability to coordinate in that Game.

The ReGen Game is deeply rooted on the other side - the Games we're moving into. It's a continuation of the work started in SEEDS back in 2017: taking a decade of learning and weaving it into this new structure to help us co-create a growing number of new financial and economic systems better suited for Regenerative Civilizations.

Think of these two spaces as the 2 foundations of a bridge crossing a chasm.

Part of our Game is then creating a bigger and better bridge so that the growing number of people ready for these realities can safely, joyfully, easily, and - hopefully with a bit of awe and wonder - walk across these bridges into the new worlds.

[H3: Quests!]

Now this is not without doing the work. By "the work" we mean the inner work and the actual actions we humans need to take to heal ourselves and our world.

This is where Quests come in. To help us co-create a growing number of "Mini Games" on doing the inner and outer work of healing so that we can become better players in the Game.

In this way we can see ourselves as "Athletes in the Infinite Game of Systemic Regeneration" and Quests help strengthen us and improve our abilities.

Quests are intended to grow into vital coordination infrastructure of our new civilization. Where we're exploring the question - "Can we meet all of our needs through Quests and Play?" We lean into this question when designing quests.

There's so much more to this Game - but the story is just beginning the Game is to be designed by all of us, by you dear reader, so don't feel that you need to have a full handle on this to get involved, as nobody does!

Welcome to the Infinite Game.
```

**After the collapsible section, add two CTA buttons:**
```jsx
<div className="flex flex-wrap gap-4 mt-8">
  <Link href="/tokenomics">
    <Button size="lg" className="rounded-xl bg-[#4a7c59] hover:bg-[#2e7d32] text-white">
      Explore Tokenomics <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  </Link>
  <Link href="/governance">
    <Button size="lg" className="rounded-xl bg-[#4a7c59] hover:bg-[#2e7d32] text-white">
      Explore Governance <ArrowRight className="w-4 h-4 ml-2" />
    </Button>
  </Link>
</div>
```

**Files changed:** `client/src/pages/Game.tsx`

---

## Fix 2 — Game Page: Merge Alliance Cards (High)

**Status:** READY FOR CLAUDE CODE

**Symptom:** "Work with Alliances" and "Create Together" are two separate cards that both link to `/connect?path=create_with_regens`. Redundant.

**Root cause:** Two cards for overlapping concepts.

**Fix:** Merge these two cards into one card called **"Create with Alliances"**. Keep the purple gradient styling from "Work with Alliances" (it's the more prominent one). New description should combine both: collaborating remotely or in-person with alliance orgs AND co-creating regenerative infrastructure. Keep the `Building2` icon. The grid goes from `lg:grid-cols-4` to `lg:grid-cols-3` with 3 cards: "Create with Alliances", "Join a Community", "Join Our Team".

**Files changed:** `client/src/pages/Game.tsx` (lines 618-690)

---

## Fix 3 — Opportunity Page: Collapsible Sections Start Closed (High)

**Status:** READY FOR CLAUDE CODE

**Symptom:** On mobile, collapsible sections auto-open. On desktop they all open by default (except FAQ). Page is overwhelming on first load.

**Root cause:** `CollapsibleSection` defaults to `isDesktopSection` (true on desktop) when no `defaultOpen` prop is passed. Only "The Opportunity" section explicitly passes `defaultOpen={true}`.

**Fix:** Change the default behavior. All sections should start **closed** on both mobile and desktop. Update line 141:

```typescript
// BEFORE
const resolvedDefault = defaultOpen ?? isDesktopSection;
// AFTER
const resolvedDefault = defaultOpen ?? false;
```

This means only sections with explicit `defaultOpen={true}` will auto-open. Currently only "The Opportunity" section has this prop, which is fine as the primary content.

**Files changed:** `client/src/pages/Opportunity.tsx` (line 141)

---

## Fix 4 — Quest Page: Move Floating Buttons into Command Center (Critical)

**Status:** READY FOR CLAUDE CODE

**Symptom:** Three floating buttons stack up in the bottom-right corner of the Quest page, overlapping each other and competing with SmartBottomNav.

**Root cause:** `QuestProgressTracker`, `QuestBadges`, and `QuestArtifactsGallery` all render as `fixed bottom-X right-X z-40` elements independently. They visually collide with the `SmartBottomNav` (z-50) and `CommandPanel` (z-40).

**Fix:** Remove all three floating buttons from their respective components. Move their trigger logic entirely into the CommandPanel's page-specific tools for `/quest`. The `usePageTools` hook already registers Badges and Gallery for the quest page (lines 21-26 of `usePageTools.ts`). Steps:

1. **usePageTools.ts:** Add QuestProgressTracker to the quest tools list (custom event `open-quest-progress`).
2. **QuestProgressTracker.tsx:** Remove the floating button (lines 264-277). Keep only the modal. Listen for `open-quest-progress` custom event to trigger `setIsOpen(true)`.
3. **QuestBadges.tsx:** Remove the floating button (lines 165-173). Keep only the modal. Already listens for `open-quest-badges` event.
4. **QuestArtifactsGallery.tsx:** Remove the floating button (lines 46-57). Keep only the modal. Already listens for `open-quest-gallery` event.
5. **Quest.tsx:** Components still render (for modals) but no longer produce visible floating buttons.

**Files changed:** `client/src/hooks/usePageTools.ts`, `client/src/components/QuestProgressTracker.tsx`, `client/src/components/QuestBadges.tsx`, `client/src/components/QuestArtifactsGallery.tsx`

---

## Fix 5 — CommandPanel: Single-Click Collapse (High)

**Status:** READY FOR CLAUDE CODE

**Symptom:** CommandPanel requires double-click to close. First click appears to do nothing.

**Root cause:** The panel uses a 100ms delayed `mousedown` listener for outside-click detection (CommandPanel.tsx line 47). If the user clicks the expand button in SmartBottomNav to toggle the panel closed, the delay can cause the first click to be missed. There is no dedicated close button inside the panel itself.

**Fix:** Two changes:
1. In `SmartBottomNav.tsx`: The expand slot button should toggle `panelOpen` directly. Ensure `setPanelOpen(prev => !prev)` is the click handler (not `setPanelOpen(true)`).
2. In `CommandPanel.tsx`: Add a visible close/collapse button at the top of the panel (ChevronDown icon) that calls `onClose()` directly. Remove or reduce the 100ms delay for outside-click detection.

**Files changed:** `client/src/components/CommandPanel.tsx`, `client/src/components/SmartBottomNav.tsx`

---

## Fix 6 — Increase Parallax Panel Transparency (High)

**Status:** READY FOR CLAUDE CODE

**Symptom:** Content panels over seasonal parallax backgrounds are too opaque. The beautiful background images are barely visible.

**Root cause:** `ParallaxSection.tsx` default overlay is `from-white/40 via-white/50 to-white/80` which blocks 40-80% of the image. On Quest.tsx seasonal sections, no custom overlay is passed so the default applies.

**Fix:** Reduce the default overlay opacity so backgrounds show through more clearly. Suggested new values:

```
from-white/20 via-white/30 to-white/60
```

This keeps readability (text still has a light veil) while letting the seasonal artwork show through. May need to also add `text-shadow` or a subtle `backdrop-blur-[1px]` to maintain text contrast.

Alternatively, pass a custom lighter overlay prop from Quest.tsx for the seasonal sections specifically rather than changing the global default.

**Files changed:** `client/src/components/ParallaxSection.tsx` or `client/src/pages/Quest.tsx`

---

## Fix 7 — Readability Audit (Critical)

**Status:** READY FOR CLAUDE CODE

**Symptom:** Multiple sections across the site have contrast or readability issues visible in Rye's screenshots. Light text on light backgrounds, small font sizes, or insufficient contrast ratios.

**Fix:** Conduct a systematic audit of all pages. For each page, check:
- Text color vs background color contrast ratio (WCAG AA minimum: 4.5:1 for body text, 3:1 for large text)
- Font sizes below 14px on mobile
- Text over images/gradients without sufficient overlay
- Opacity values on text (e.g., `text-white/60` may be too light)

Focus areas based on screenshots:
- Parallax sections on Quest page (text over seasonal images)
- Fund page dark sections
- Any section using `/70` or `/60` opacity text colors
- Footer and small print areas

Run the fix alongside Fix 6 (parallax transparency) to balance artistic vision with readability.

**Files changed:** Multiple page and component files. Specific changes TBD during audit.

---

## Fix 8 — Steward Dashboard: Prevent Claiming Projects with Existing Stewards (High)

**Status:** READY FOR CLAUDE CODE

**Symptom:** Admin can approve a claim on a project that already has a steward assigned, silently overwriting the existing steward.

**Root cause:** The `approve` endpoint in `server/routes/applications.ts` (lines 647-668) calls `db.updateApplication(appId, { stewardUserId: claim.userId })` without checking if `stewardUserId` is already set. The `adminAssign` endpoint has the same gap.

**Fix:** Add validation before approval:
1. In the `approve` mutation: Before setting `stewardUserId`, query the application to check if `stewardUserId` is already set and is a different user.
2. If a steward exists, return an error: `"This project already has a steward assigned. Remove the current steward before approving a new claim."`
3. Apply the same check to `adminAssign`.
4. On the frontend (Admin.tsx `OrgClaimsAdminPanel`), show a warning badge on claims for projects that already have stewards.

**Files changed:** `server/routes/applications.ts`, `client/src/pages/Admin.tsx`

---

## Fix 9 — Image Upload: Fix "stream.getReader is not a function" (High)

**Status:** READY FOR CLAUDE CODE

**Symptom:** Profile image generation returns 500 error: "stream.getReader is not a function".

**Root cause:** In `workers/image-gen/src/index.ts` line 127-130, the Cloudflare AI binding return value from `env.AI.run("@cf/black-forest-labs/flux-1-schnell", ...)` is cast as `ReadableStream` but the actual return type may be a `Uint8Array` or `ArrayBuffer` (Cloudflare has changed AI binding return types). The `streamToBytes()` helper at lines 37-50 calls `.getReader()` which fails.

**Fix:** Check the actual return type before processing:
```typescript
const result = await env.AI.run("@cf/black-forest-labs/flux-1-schnell", {
  prompt,
  num_steps: 8,
});

let imageData: Uint8Array;
if (result instanceof ReadableStream) {
  imageData = await streamToBytes(result);
} else if (result instanceof ArrayBuffer || result instanceof Uint8Array) {
  imageData = new Uint8Array(result);
} else if (typeof result === 'object' && result !== null && 'image' in result) {
  // Cloudflare AI sometimes returns { image: base64string }
  imageData = Uint8Array.from(atob((result as any).image), c => c.charCodeAt(0));
} else {
  throw new Error(`Unexpected AI response type: ${typeof result}`);
}
```

**Files changed:** `workers/image-gen/src/index.ts`

---

## Fix 10 — Profile Page Overhaul (Medium)

**Status:** READY FOR CLAUDE CODE

**Symptom:** Edit button broken, photo upload broken, no village banner header, debug image generation tool.

**Root cause:** Multiple issues:
- Edit button may be calling a stale mutation or the ProfileEditForm doesn't open
- Photo upload flows through SmartImagePicker > trpc.files.upload which may have a server-side issue
- No village banner concept exists in the current profile schema or components
- Image generation in SmartImagePicker calls trpc.images.generate which routes to the broken Cloudflare Worker (see Fix 9)

**Fix:**
1. **Edit button:** Debug the click handler in PlayerProfile.tsx. Ensure the edit mode state toggles and ProfileEditForm renders.
2. **Photo upload:** Test the base64 upload flow through trpc.files.upload. Fix any server-side issues.
3. **Village banner:** Add a new `bannerUrl` field to the user profile (schema migration). Display a banner image at the top of PlayerProfile.tsx similar to social media profile banners. Allow upload via SmartImagePicker with `context="banner"` and `shape="rectangle"`.
4. **Image generation:** Depends on Fix 9 (Cloudflare Worker fix). Once the worker is fixed, generation should work through SmartImagePicker's generate tab.

**Files changed:** `client/src/pages/PlayerProfile.tsx`, `client/src/components/ProfileEditForm.tsx`, `client/src/components/profile/ProfileHeader.tsx`, `drizzle/schema.ts` (migration for bannerUrl), `server/routes/users.ts`

---

## Fix 11 — Navigation: Rename "Learn + Connect" to "Explore + Connect" (Medium)

**Status:** READY FOR CLAUDE CODE

**Symptom:** Menu label doesn't match desired branding. Social buttons are in the dropdown instead of the footer. Glossary is not in the menu.

**Fix:**
1. Rename "Learn + Connect" to "Explore + Connect" in Navigation.tsx (desktop dropdown trigger and mobile collapsible header).
2. Remove social media links (WhatsApp, Discord, YouTube, Telegram) from the dropdown menu.
3. Add a "Glossary" link (`/glossary`) to the dropdown menu.
4. Move the social media links to the site footer component instead.

**Files changed:** `client/src/components/Navigation.tsx`, `client/src/components/Footer.tsx` (or equivalent)

---

## Fix 12 — Forum Post Link Audit (High)

**Status:** READY FOR CLAUDE CODE

**Symptom:** Forum links across the site are broken after the forum was remade. Links point to old post IDs that no longer exist.

**Root cause:** Forum was rebuilt, post IDs changed. Hardcoded IDs in data files and components now point to nonexistent posts.

**Fix:** Audit every file that constructs `/community/post/` links. Files to check:

- `client/src/data/questData.ts` (forumUrl fields with hardcoded IDs like `/community/post/607`)
- `client/src/data/blogPosts.ts` (markdown links to `/community/post/560`)
- `client/src/data/welcomeAboardQuests.ts`
- `client/src/components/admin/AdminRecordingsTab.tsx`
- `client/src/components/GlobeMap.tsx`
- `client/src/components/KnowledgeMapPanel.tsx`
- `client/src/components/LiveActivityFeed.tsx`
- `client/src/components/profile/ProfileForumPosts.tsx`
- `client/src/components/ProjectConnectionsPanel.tsx`
- `client/src/components/QuestJournal.tsx`
- `client/src/components/SharePanel.tsx`
- `client/src/components/WelcomeAboardQuests.tsx`
- `client/src/pages/Community.tsx`
- `client/src/pages/QuestSuggestions.tsx`

For each: verify the linked post ID still exists in the database. If the post was recreated, update to the new ID. If it no longer exists, either recreate the forum thread or remove the broken link.

**HUMAN STEP:** Run a DB query to get all current forum post IDs so Claude Code can map old IDs to new ones.

**Files changed:** Multiple data and component files (list above)

---

## Fix 13 — 1-Pagers: Remove from Site, Export to Markdown (Medium)

**Status:** READY FOR CLAUDE CODE

**Symptom:** 1-pagers are outdated and need to be editable as markdown docs, not hardcoded React pages.

**Fix:**
1. Export the content of each OnePager to a markdown file:
   - `docs/one-pager-land.md`
   - `docs/one-pager-alliance.md`
   - `docs/one-pager-player.md`
2. Remove the 4 routes from `App.tsx` (lines 210-213).
3. Remove the 4 lazy imports from `App.tsx` (lines 83-86).
4. Remove links to 1-pagers from:
   - `client/src/pages/Land.tsx` (line 1062)
   - `client/src/pages/Game.tsx` (line 1766)
   - `client/src/pages/Ally.tsx` (line 476)
5. Keep the source files in an `archive/` folder for reference.

**Files changed:** `client/src/App.tsx`, `client/src/pages/Land.tsx`, `client/src/pages/Game.tsx`, `client/src/pages/Ally.tsx`. New files: `docs/one-pager-*.md`

---

## Fix 14 — Glossary: Community Wiki + Propose a Term (Medium)

**Status:** READY FOR CLAUDE CODE

**Symptom:** Glossary terms are mostly hardcoded. Community can't easily propose new terms or corrections.

**Root cause:** Glossary has a static array of 35+ terms in `Glossary.tsx` plus a `trpc.glossary.list` query for DB terms, but there's no submission UI.

**Fix:** Duplicate the "Propose a Quest" pattern from QuestSuggestions.tsx for a "Propose a Term" feature:
1. Create a `GlossaryProposal` component or page (`/glossary/propose`).
2. Form fields: term, proposed definition, category, source/reference link.
3. Server route: `glossary.propose` mutation that creates a pending entry in `glossaryTerms` table with status "proposed".
4. Auto-create a forum thread in a "Glossary Discussions" category for community debate on the term.
5. Admin approval flow to move proposed terms to "approved" status.
6. Add a "Propose a Term" button on the Glossary page.
7. Move the static terms from the inline array to the database (seed script) so everything lives in one place.

**Files changed:** `client/src/pages/Glossary.tsx`, new `client/src/pages/GlossaryPropose.tsx`, `server/routes/glossary.ts`, `drizzle/schema.ts` (if glossaryTerms needs status column)

---

## Fix 15 — Propose a Feature (Forum) (Medium)

**Status:** READY FOR CLAUDE CODE

**Symptom:** No way for community members to suggest website/game improvements.

**Fix:** Duplicate the Quest Suggestions pattern for feature proposals:
1. Create `client/src/pages/FeatureSuggestions.tsx` (clone `QuestSuggestions.tsx` structure).
2. Categories: UI/UX, gameplay, governance, finance, community, technical, other.
3. Server routes: `features.create`, `features.list`, `features.toggleVote`, `features.myVotes` in `server/routes/players.ts` (or new `features.ts` router).
4. DB: `featureSuggestions` table with id, authorId, title, description, category, voteCount, status, featureForumThreadId, createdAt.
5. Auto-create forum thread when a feature is proposed.
6. Add route `/community/features` in App.tsx.
7. Add "Got an idea for a feature?" card in Community.tsx alongside the existing quest suggestion card.

**Files changed:** New `client/src/pages/FeatureSuggestions.tsx`, `server/routes/players.ts` or new `server/routes/features.ts`, `drizzle/schema.ts`, `client/src/App.tsx`, `client/src/pages/Community.tsx`

---

## Fix 16 — Map Auto-Tracking (Medium)

**Status:** READY FOR CLAUDE CODE

**Symptom:** The progress map doesn't auto-update when users complete quests or visit pages.

**Root cause:** `useQuestProgress` stores completion in localStorage but nothing ties page visits or quest completions back to the map's node/milestone system. The map spec (`PROGRESS_MAP_DESIGN.md`) describes 4 paths with milestones but no auto-tracking was implemented.

**Fix:** Wire the existing `useQuestProgress` hook into the map's milestone tracking:
1. Define a mapping from quest completions and page visits to map milestones/nodes.
2. Track page visits in localStorage (e.g., `regen-civics-visited-pages` key, set of paths).
3. In the progress map component, derive node completion state from:
   - Quest completions (already in `useQuestProgress`)
   - Page visits (new tracking)
   - Profile completion percentage
   - Forum participation (post count from API)
4. Use a `useEffect` on route changes to log page visits.
5. Map nodes should reactively update (green/complete) when their criteria are met.

**Files changed:** New `client/src/hooks/usePageVisits.ts`, `client/src/hooks/useMapProgress.ts`, updates to progress map component (per PROGRESS_MAP_DESIGN.md)

---

## Fix 17 — Seasonal Rites Locking Audit (Medium)

**Status:** READY FOR CLAUDE CODE (after QUEST_LOCK prompt runs)

**Symptom:** Need to verify the quest locking system matches the spec in QUEST_PROGRESSION_SPEC.md.

**Fix:** After Claude Code runs `CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md`, audit the implementation:
1. Fire + Food Foresting always unlocked? Check.
2. Completing Fire unlocks current season's Rites? Check.
3. Completing 1 Rite in a season unlocks the next season? Check.
4. All 4 seasons complete unlocks Epics/Seasonals/Fasting? Check.
5. Locked cards show emerald lock icon and greyed-out styling? Check.
6. Hero cards (Fire, Food Foresting) have background images? Check.
7. Season progress ring shows X/4 completion? Check.

This is a verification pass, not an implementation task.

**Files changed:** None (audit only). Create `AUDIT_QUEST_LOCKING_2026-03-29.md` with results.

---

## Game Page: Add Tokenomics + Governance Buttons (covered in Fix 1)

Already included in Fix 1 as the two CTA buttons after the collapsible section. Links go to `/tokenomics` and `/governance` (both routes confirmed to exist in App.tsx).

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 12 | Provide current forum post ID mapping (old ID -> new ID) | Requires Railway DB access | Run: `SELECT id, title, createdAt FROM forumPosts ORDER BY id` and share results |
| ALL | `git add -A && git commit && git push` after Claude Code completes fixes | Git push requires your machine | Terminal in `C:\Users\taren\Downloads\regen-civics-clean` |
| 9 | Deploy updated Cloudflare Worker (image-gen) | Requires `wrangler` auth on your machine | `cd workers/image-gen && wrangler deploy` |
| 10 | Run DB migration for bannerUrl field | Requires Railway DB access | `npx drizzle-kit push` from your machine |
| 14 | Run glossary seed script (if terms migrated to DB) | Requires Railway DB access | `npx tsx scripts/seed-glossary.ts` |
| 15 | Run DB migration for featureSuggestions table | Requires Railway DB access | `npx drizzle-kit push` |
| 7 | Final visual QA of readability fixes in browser | Only you can verify in real browser | Visit regencivics.earth after deploy |

### CLAUDE CODE — can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Game page intro text replacement + tokenomics/governance buttons | READY |
| 2 | Merge alliance cards on Game page | READY |
| 3 | Opportunity collapsible sections default closed | READY |
| 4 | Move quest floating buttons to Command Center | READY |
| 5 | CommandPanel single-click collapse fix | READY |
| 6 | Parallax panel transparency increase | READY |
| 7 | Readability audit (code changes) | READY |
| 8 | Steward Dashboard claim validation | READY |
| 9 | Fix stream.getReader in image-gen worker | READY |
| 10 | Profile page overhaul (edit button, upload, banner) | READY |
| 11 | Navigation rename + restructure | READY |
| 12 | Forum link audit (code side, once Rye provides ID mapping) | BLOCKED on Rye |
| 13 | 1-pagers: export to MD, remove routes and links | READY |
| 14 | Glossary propose-a-term feature | READY |
| 15 | Propose a Feature forum feature | READY |
| 16 | Map auto-tracking hooks and wiring | READY |
| 17 | Quest locking audit (after QUEST_LOCK prompt runs) | BLOCKED on QUEST_LOCK |

### WAITING ON YOU before Claude Code can proceed

- **Fix 12 (Forum Links):** Need a dump of current forum post IDs and titles from Railway DB so old hardcoded IDs can be mapped to new ones.
- **Fix 17 (Locking Audit):** Needs CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md to be run first.
- **Fix 10 (Profile banner):** Migration needs to be run after schema change is written.

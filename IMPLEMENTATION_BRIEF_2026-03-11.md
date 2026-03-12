# ReGen Civics — Unified Implementation Brief
**Date:** 2026-03-11
**Supersedes:** `PROMPT_WelcomeAboard_Implementation.md` (archived), `FIXES_TO_MAKE_2026-03-11.md`, `FORUM_COORDINATION_UPGRADES_2026-03-11.md`
**Status:** Ready for developer handoff

---

## Read Before Writing Any Code

1. `ReGenCivics_WelcomeAboard_Brief.md` — quest cards, forum post content, seed comments, technical spec (Section 4)
2. `ReGenCivics_Forum_Posts.md` — all forum threads: Part One (Gathering Grove anchor posts), Part Two (pre-population thread stubs)
3. `FORUM_UPGRADES_2026-03-10.md` — Part A through G specs (quest card UI, UX entry points, series header, em-dash audit)
4. `CONTEXT_THE_TWO_GAMES.md` — essential background on Fund vs. Game distinction before writing any copy

Do not write any code until you have read all four.

---

## Global Constraints (No Exceptions)

- **No em-dashes** anywhere in code, data files, or DB content. Replace ` — ` with `: ` or restructure the sentence. Run the em-dash audit in Phase 6 before committing.
- **No AI-isms**: no "delve into", "it's worth noting", "in conclusion", "it's important to", "dive in", "game-changing", "let's explore". Plain human voice throughout.
- **Mobile-first**: every new component must be responsive. Test at 375px, 768px, and 1280px breakpoints. This applies to quest cards, the AMA banner, profile additions, forum tag filters, the marketplace, and all modals.
- **TypeScript strict**: `pnpm check` must pass with zero errors before marking any phase complete.
- **No standalone quest URL routes** at `/community/feedback`, `/community/origin-story`, `/community/regen-act`, `/community/bioregion`, `/community/foundations`, `/community/refer-org`. These paths do not exist. See the architectural decision below.

---

## Core Architectural Decision: Quest Forum Targets

The Welcome Aboard Quests link to **existing Gathering Grove threads**, not to standalone quest pages.

Each quest's "Go to forum post" button sends the player into the standard community forum. The quest completion CTA reinforces this: play in the community, not in a quest-specific silo.

**Use the forum thread targets from Section 1 of `ReGenCivics_WelcomeAboard_Brief.md`** — not any `/community/[quest-slug]` paths.

The only four quests with their own dedicated forum URLs are:
- Q5: `/community/make-friends`
- Q6: `/community/pledge-gift`
- Q9: `/community/refer-land`
- Q10: `https://regencivics.earth/community/quests` (full absolute URL — override)

All other quests link to their Gathering Grove thread.

---

## Phase 0 — Background Fixes (UPGRADE_TASKS_2026-03-10.md, Tasks 1–5)

These are quick surgical fixes. Do them first — they unblock later work and clean up the codebase.

### 0a. Revert Home Page Background

**File:** `client/src/pages/Home.tsx`

Replace the conditional `bgImage` assignment with a single URL:
```ts
const bgImage = "https://assets.regencivics.earth/YPVdYWGRrdEquJbO.webp";
```
Leave all `isReturnVisitor` logic untouched — only the background image line changes.

### 0b. Remove Stale Chatbot Code

**File:** `client/src/App.tsx`

Confirm `ReGenGuide` is the only chat widget mounted (`{!adminMode && <ReGenGuide />}`). If any other chat component (`ChatWidget.tsx`, `AIChat.tsx`, etc.) exists and is unused, delete it. Keep `ReGenGuide.tsx` and `AIChatBox.tsx`.

### 0c. Rename and Improve the Chatbot

**Files:** `client/src/components/ReGenGuide.tsx`, `server/_core/oauth.ts`

- Title: "ReGen Guide" → "Your ReGen Guide"
- Update aria-labels on the floating button to match
- Replace `PATH_WELCOMES` and default welcome message with the versions in Task 3 of `UPGRADE_TASKS_2026-03-10.md`
- Update the error fallback message to: `"Sorry, I ran into a hiccup. Please try again in a moment — or visit /schedule to book a live session with the team."`
- In `oauth.ts`: rename `CHAT_SYSTEM_PROMPT` to refer to `"Your ReGen Guide"` not `"ReGen Civics Guide"`
- Deployment check: confirm `ANTHROPIC_API_KEY` is set in Railway environment variables

### 0d. Remove LiveStats Banner

**File:** `client/src/pages/Home.tsx`

Remove the `LiveStats` import and the `<LiveStats />` JSX. Do not delete `LiveStats.tsx`.

### 0e. Remove First-Visit Path Selection Popup

**File:** `client/src/App.tsx`

Remove the `PathSelectionScreen` import, the `PathOnboarding` function, and its `{!adminMode && <PathOnboarding />}` usage. Also confirm `FirstVisitOnboarding.tsx` is not mounted anywhere. Do not delete either component file.

---

## Phase 1 — Quest Infrastructure

This is the primary new feature. Build in this exact order — each step depends on the previous.

### 1a. URL Param Tab Handling in PlayerProfile

**File:** `client/src/pages/PlayerProfile.tsx`

On mount, read `?tab=` from `window.location.search`. If the value matches a valid tab ID (`overview`, `quests`, `contributions`, `settings`), open that tab. On tab click, sync via `window.history.replaceState`. Full code snippet in Section 4.1 of the Brief.

Also: update any existing links pointing to `/profile?tab=contributions` to point to `/profile?tab=quests`.

### 1b. Quest Data File

**File to create:** `client/src/data/welcomeAboardQuests.ts`

Export a typed array of 10 quest objects. Each object shape:

```ts
interface WelcomeAboardQuest {
  id: string;            // "welcome-aboard-1" through "welcome-aboard-10"
  number: number;        // 1–10
  title: string;
  tagline: string;
  reward: string;        // "33 $ReGen + 0.1 RGVoice"
  forumUrl: string;      // Gathering Grove thread URL (see Section 1 of Brief)
  about: string;
  steps: string[];
  bonus?: string;
}
```

All 10 quest data objects are in Section 2 of `ReGenCivics_WelcomeAboard_Brief.md`. Apply em-dash and AI-ism rules to all copy before writing to this file.

Quest forum URLs (canonical list):

| Quest | Forum URL |
|-------|-----------|
| Q1 | Gathering Grove thread (see Section 1 of Brief) |
| Q2 | Gathering Grove thread |
| Q3 | Gathering Grove thread |
| Q4 | Gathering Grove thread |
| Q5 | `/community/make-friends` |
| Q6 | `/community/pledge-gift` |
| Q7 | Gathering Grove thread |
| Q8 | Gathering Grove thread |
| Q9 | `/community/refer-land` |
| Q10 | `https://regencivics.earth/community/quests` (absolute URL, no override missed) |

### 1c. QuestCard Component + Visual Design

**File to create:** `client/src/components/QuestCard.tsx`

Build the collapsible quest card with the golden glow visual system and the card-flip share mechanic.

**Always-visible zone:**
- Quest number badge (Q1, Q2, etc.)
- Title and tagline
- Reward badge: "33 $ReGen + 0.1 RGVoice" — gold/amber, visually prominent, not faded
- Forum link button: "Go to forum post" — opens the quest's `forumUrl` in a new tab
- Status indicator (completed / in-progress)

**Collapsible zone (hidden by default, chevron toggle):**
- Label: "About this quest" with down-chevron icon
- Full quest description (2–4 sentences)
- Numbered how-to steps
- Bonus reward line if applicable
- Use `max-h-0` / `max-h-[500px]` with `transition-all overflow-hidden` — not abrupt show/hide

**Golden glow visual system:**
```css
/* Incomplete card */
box-shadow: 0 0 0 1px rgba(212, 165, 116, 0.15), 0 4px 20px rgba(212, 165, 116, 0.08), 0 1px 4px rgba(0,0,0,0.4);
border: 1px solid rgba(212, 165, 116, 0.20);

/* Hover */
box-shadow: 0 0 0 1px rgba(212, 165, 116, 0.35), 0 8px 32px rgba(212, 165, 116, 0.18), 0 2px 8px rgba(0,0,0,0.5);
transform: translateY(-2px);
border-color: rgba(212, 165, 116, 0.40);

/* Completed */
box-shadow: 0 0 0 1px rgba(125, 216, 125, 0.3), 0 4px 20px rgba(125, 216, 125, 0.12);
border-color: rgba(125, 216, 125, 0.30);
```
Apply via Tailwind arbitrary values or inline style. Add `transition-all duration-200` on all cards. The Q-number badge should subtly brighten on hover. Completed cards get a faint checkmark shimmer or stamp effect (CSS only).

**Progress bar in series header:** golden gradient when < 100% (`linear-gradient(to right, #d4a574, #f0c070)`), green when complete. Subtle pulse animation on the last filled segment while quests remain.

**"Mark Complete" toggle:** writes quest ID to `questsCompleted` JSON array on the player profile via `trpc.playerProfiles.update`.

### 1d. SharePanel Component (Card Flip)

**File to create:** `client/src/components/SharePanel.tsx`

Install dependency first: `npm install react-share`

When the user clicks a share icon in the card corner, the card flips (CSS 3D transform: `transform-style: preserve-3d`, front/back each with `backface-visibility: hidden`, 300ms animation) to reveal the share panel back face.

Back face contains:
- Pre-populated share text: `${quest.tagline} Doing the "${quest.title}" quest at @ReGenCivics 🌿 ${quest.forumUrl}`
- Platform buttons: X/Twitter, LinkedIn, Facebook, Farcaster, Bluesky, Instagram (copy), Copy link
- X button to flip back to front

```ts
// Share URLs
X/Twitter:  https://x.com/intent/tweet?text=ENCODED_TEXT&url=ENCODED_URL
LinkedIn:   https://www.linkedin.com/sharing/share-offsite/?url=ENCODED_URL
Facebook:   https://www.facebook.com/sharer/sharer.php?u=ENCODED_URL
Farcaster:  https://warpcast.com/~/compose?text=ENCODED_TEXT   (custom <a> wrapper)
Bluesky:    https://bsky.app/intent/compose?text=ENCODED_TEXT  (custom <a> wrapper)
Instagram:  navigator.clipboard.writeText(text) + "Text copied! Paste into Instagram"
Copy link:  navigator.clipboard.writeText(quest.forumUrl)
```

Use `react-share` for X, LinkedIn, Facebook. Farcaster and Bluesky are simple `<a target="_blank">` wrappers.

### 1e. WelcomeAboardQuests Component

**File to create:** `client/src/components/WelcomeAboardQuests.tsx`

Renders the series header + all 10 `QuestCard` instances.

**Series header (above cards):**
- Series name: "Welcome Aboard Quests"
- Subtitle: "Ten ways to root yourself in the Regenerative Renaissance."
- Completion banner: "Complete all 10 Welcome Aboard Quests to earn 330 $ReGen + 1 RGVoice and unlock your first Claim in the ReGen Game. Each quest is worth 33 $ReGen + 0.1 RGVoice."
- Progress bar (gold → green gradient, see 1c)

### 1f. Embed in PlayerProfile — Overview Tab AND Quests Tab

**File:** `client/src/pages/PlayerProfile.tsx`

**Overview tab:** Replace `<SocialShareQuestCard />` with `<WelcomeAboardQuests />`. This is now the primary quest surface — users see all 10 quests without switching tabs. Remove the `SocialShareQuestCard` import and localStorage dismissal logic. If the team wants a persistent "share the site" CTA, fold it into the series header as a subtle secondary action.

**Quests tab:** Keep `<WelcomeAboardQuests />` here too — the Quests tab becomes the deeper focus view. Both tabs show the same component; that is intentional.

Also add a "Personal Quests" persistent link in the profile page header or sidebar that navigates to the Quests tab.

### 1g. QuestStartPopup

**File to create:** `client/src/components/QuestStartPopup.tsx`

One-time modal that fires after profile setup completes. Uses `localStorage` flag `hasSeenQuestPrompt` (set to `"true"` on dismiss — never show again). CTA button: "View Quests" — routes to `/profile?tab=quests`. Dismiss (X) also sets the flag. Warm welcome copy — no em-dashes, no AI-isms.

Add "Personal Quests" to the nav menu (authenticated users only), routing to `/profile?tab=quests`.

### 1h. Claim Gating

Wherever the Claim action lives in the codebase: before allowing a player to make a Claim in the ReGen Game, validate:
1. All 10 Welcome Aboard quests are marked complete in `questsCompleted` (IDs `welcome-aboard-1` through `welcome-aboard-10`)
2. Player has not already made a Claim (existing single-claim rule)

Details in Section 4.5 of the Brief.

---

## Phase 2 — Forum Seed Content

**File to create:** `scripts/seed-forum-posts.ts`

This script seeds the entire forum. Support a `--dry-run` flag that prints all content to console without writing to DB.

### Part A — Gathering Grove Anchor Posts (8 posts)

Create the 8 main Gathering Grove section anchor posts — one per section. Content is in Part One of `ReGenCivics_Forum_Posts.md`. Sections:
- General Discussion
- Land Projects
- Investment and Finance
- Governance and DAO
- Quests and Gameplay
- Alliance Partners
- Introductions
- Learning and Resources

Apply all global constraints. No em-dashes, no AI-isms.

### Part B — Pre-Population Thread Stubs (40+ threads)

Seed all discussion thread stubs from Part Two of `ReGenCivics_Forum_Posts.md`. These populate each section so new members arrive somewhere warm and active.

### Part C — Quest Seed Content

For quests with Gathering Grove thread targets (Q1, Q2, Q3, Q4, Q7, Q8): seed the post body and 3 example seed comments from Section 3 of `ReGenCivics_WelcomeAboard_Brief.md` **into the corresponding Gathering Grove thread** — not as standalone posts. Match each quest to its thread using the Section 1 table in the Brief.

For Q5 (`/community/make-friends`), Q6 (`/community/pledge-gift`), Q9 (`/community/refer-land`): create standalone forum posts at those slugs. Seed the post body and 3 example comments from Section 3.

For Q10: the completion CTA must link to `https://regencivics.earth/community/quests`.

Seed comments are EXAMPLE contributions — mark them as such with an admin/moderator account with a note that they are example contributions. Example usernames (Solange Beaumont, Tobias Wrenfield, Yemi Adeyinka, etc.) are fictional.

### Em-Dash Audit

After all content is written, run:
```bash
grep -r " — \|—" client/src/ server/ scripts/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```
Any match is a bug. Fix before committing.

---

## Phase 3 — Profile Layer (C1–C4 + Fix 3)

Build this layer before the discovery features — C16 and C17 depend on this data being in the DB.

**Single migration file for all schema changes in this phase.** C1, C3, and C4 all add to the `users` table — they must live in the same migration, not three separate ones.

### 3a. Edit Profile Form — Structured Soul Questions (Fix 3a)

**File:** `client/src/components/ProfileEditForm.tsx`

The `bio` field is stored as `JSON.stringify({ role, soul, desires, gifts })`. The current form shows it as a plain textarea, which either displays raw JSON or overwrites structured data.

On load: parse `profile.bio` as JSON. If it matches `{ role?, soul?, desires?, gifts? }`, populate four labeled textareas. If it's plain text (legacy), show a single "Bio" textarea as fallback.

On save: re-serialize the four fields back to `JSON.stringify({ role, soul, desires, gifts })`.

New form layout (four fields under "About You" heading):
- "Your role in this renaissance" — placeholder: "Land steward, investor, builder, artist..."
- "Your soul's mission" — placeholder: "The deeper calling that brought you here..."
- "What are you seeking?" — placeholder: "What would make this worth your time and energy?"
- "Gifts you bring" — placeholder: "Skills, resources, wisdom, connections..."

Remove the plain "Bio / About" textarea. Keep all path-specific fields (Investment Range, Project Name/URL, etc.) exactly where they are.

```ts
// On load
useEffect(() => {
  if (!profile) return;
  let parsed: { role?: string; soul?: string; desires?: string; gifts?: string } | null = null;
  try { parsed = JSON.parse(profile.bio ?? ''); } catch { /* plain text bio */ }
  setForm({
    ...form,
    role: parsed?.role ?? "",
    soul: parsed?.soul ?? "",
    desires: parsed?.desires ?? "",
    gifts: parsed?.gifts ?? "",
    legacyBio: (!parsed && profile.bio) ? profile.bio : "",
  });
}, [profile]);

// On save
const bioValue = (form.role || form.soul || form.desires || form.gifts)
  ? JSON.stringify({ role: form.role, soul: form.soul, desires: form.desires, gifts: form.gifts })
  : form.legacyBio;
```

**Note for existing users:** Users who completed onboarding before this change will have bio JSON already set. The parse-on-load logic handles this gracefully — they see their existing answers pre-filled in the four fields. Users with no bio JSON get empty fields with the familiar onboarding prompts.

### 3b. Contributions Tab — Blockchain Callout (Fix 3b)

**File:** `client/src/pages/PlayerProfile.tsx`

Replace the "Log a Contribution" form as the hero element with a blockchain callout. New layout in Contributions tab:

1. On-chain tracking callout box (dashed border, `bg-white/5 rounded-xl p-4`):
   - Hypha DAO callout (purple accent) — governance votes, proposals, role assignments, payouts
   - Base blockchain callout (blue accent) — $ReGen and $RCivics transactions, badge mints
   - "Link your Hypha account" CTA if `profile.walletAddress` is not set; navigates to Settings tab and scrolls to wallet section
   - If wallet is set: "Hypha account linked" status note

2. Self-reported contributions section (below the callout, unchanged and fully functional)

The `onClick` for the link CTA:
```tsx
onClick={() => { setActiveTab("settings"); setTimeout(() => document.getElementById('wallet-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
```

The actual blockchain integration is out of scope for this fix — this is purely a UI/UX callout.

### 3c. Bioregion Table + Autocomplete (C1)

**DB schema additions (drizzle/schema.ts):**
```ts
// bioregions table
bioregions: {
  id: serial primary key,
  name: text not null,
  slug: text unique,
  realm: text,
  subrealm: text,
  source: text,          // "one_earth" | "community"
  approved: boolean default true,
  submitted_by: integer references users(id),
  created_at: timestamp
}

// users table additions (same migration as C3, C4):
bioregion_id: integer references bioregions(id)
```

**Files to create/change:**
- `scripts/seed-bioregions.ts` — import One Earth bioregion list (846 bioregions) from a JSON fixture. Data source: https://www.oneearth.org/bioregions/
- `server/routes/bioregions.ts` — `GET /api/bioregions?q=` (search), `POST /api/bioregions/suggest` (submit new)
- `client/src/components/BioregionSelect.tsx` — autocomplete with One Earth suggestions + "Can't find your bioregion? Add it" button that opens a small inline form (name, region/country, brief description). Submitted bioregions go to `pending_bioregions` for admin review.
- `client/src/pages/PlayerProfile.tsx` — use BioregionSelect in profile edit form
- `client/src/pages/Admin.tsx` — pending bioregion approval queue in Settings

### 3d. Gifts and Needs Registry (C2)

**Note on migration:** The existing `bio` JSON already has a `gifts: string` field. The new `gifts` table normalizes this into one row per gift entry. Treat the new table as canonical going forward. The edit form (Fix 3a) will populate the new table from the structured gifts textarea on save.

**DB schema additions:**
```ts
// gifts table
gifts: {
  id: serial,
  user_id: integer references users(id),
  type: text,       // "skill" | "resource" | "time" | "knowledge" | "land" | "capital"
  description: text,
  is_active: boolean default true,
  created_at: timestamp
}

// needs table
needs: {
  id: serial,
  user_id: integer references users(id),
  type: text,
  description: text,
  is_active: boolean default true,
  created_at: timestamp
}
```

In the profile onboarding flow, show this copy before the gifts/needs fields:
"Your gifts and needs will be added to the Gifts and Needs Marketplace, where others in the network can find and connect with you."

**Marketplace page (`/marketplace`):** filterable list of member profiles showing offer/need pairs. Filters: category, bioregion, collaboration status. **Empty state:** when no gifts/needs have been added by any user yet, show a clear CTA: "Be the first — add your gifts and needs in your profile to appear here." When a logged-in user has not set their own entries, show a personal prompt at the top: "You're not listed yet. Add your gifts and needs in your profile settings."

**Files:**
- `drizzle/schema.ts` — add `gifts` and `needs` tables
- `client/src/pages/PlayerProfile.tsx` — gifts/needs fields in onboarding and profile edit
- `client/src/pages/Marketplace.tsx` (new) — filterable registry at `/marketplace`
- `server/routes/marketplace.ts` (new) — `GET /api/marketplace` with filters

### 3e. Collaboration Status Badge (C3)

**DB schema addition (same migration as C1, C4):**
```ts
// users table:
collaboration_status: text  // null | "seeking_collaborators" | "looking_to_join"
```

Three states: null (default, no badge shown), `seeking_collaborators` ("Seeking collaborators"), `looking_to_join` ("Looking to join").

**Badge copy note:** Keep badge text short enough to read in a member card at a glance. "Seeking collaborators" is 23 characters — confirm it renders cleanly at your smallest ProfileCard width on mobile. If it wraps, shorten to "Seeking team" and "Looking to join" or use icons only with tooltip.

Users set this in Profile Settings under a "Collaboration" section.

**Files:**
- `drizzle/schema.ts` — `collaboration_status` column on users
- `client/src/components/ProfileEditForm.tsx` — collaboration status toggle in settings
- `client/src/components/ProfileCard.tsx` — show badge when status is set
- `client/src/pages/Community.tsx` (or member directory) — filter by collaboration_status

### 3f. Bioregion + Dreaming-Of Onboarding Fields (C4)

**DB schema additions (same migration as C1, C3):**
```ts
// users table:
bioregion_id: integer references bioregions(id),   // added in C1 migration — do not duplicate
dreaming_of: text
```

**Note:** `bioregion_id` is defined once in the C1 block of this same migration. C4 only adds `dreaming_of`.

Add two questions to the profile setup / onboarding flow:
1. "What bioregion do you call home?" — uses `BioregionSelect` from C1
2. "What are you dreaming of building or becoming?" — open text field. Placeholder: "A food forest in the highlands, a new form of school, a way of living that heals rather than harms..."

Both fields are also editable in `ProfileEditForm.tsx` and displayed on the public profile card when set.

**Existing users:** These fields will be empty for users who completed onboarding before this change. The profile edit form must handle null values gracefully and show the prompts clearly so users can fill them in retroactively. Do not make them required on the edit form — only encourage them.

---

## Phase 4 — AMA Banner (C11)

**This is time-sensitive. The first AMA is April 26th, 2026. Ship this before then.**

### What to Build

**DB:**
```ts
// upcoming_amas table
{
  id: serial,
  project_name: text,
  host_name: text,
  date: date,
  time: text,           // "11:00 AM EST"
  timezone: text,
  forum_thread_url: text,
  is_active: boolean,
  created_at: timestamp
}
```

**Seed the first AMA row:** Amora Costa Rica, April 26 2026 at 11:00 AM EST. Insert via seed script or document as the first manual admin action post-deploy.

**Banner component (`client/src/components/AMABanner.tsx`):** dismissible banner with auto-generated copy:
```
🎙️ Next AMA: [project_name] — [date formatted] at [time]
[Join the conversation →]
```
Mount at the top of `/community` and on `/schedule`.

**Note:** Verify that `/schedule` exists as a full page component in the codebase before mounting. If it does not exist yet, note this dependency for the developer to resolve.

Auto-hides (sets `is_active: false`) at midnight the day after the AMA. Users can dismiss individually (localStorage flag per AMA id).

**Admin interface:** Add an AMA management section in `/admin` (Events section or Settings tab):
- Fields: Project/Host name, Date, Time + Timezone, Forum thread URL
- Actions: Save, Clear/Mark Complete

**Files:**
- `drizzle/schema.ts` — add `upcoming_amas` table
- `server/routes/ama.ts` (new) — `GET /api/ama/upcoming`, `POST /api/admin/ama`
- `client/src/components/AMABanner.tsx` (new)
- `client/src/pages/Community.tsx` — mount AMABanner at top
- `client/src/pages/Schedule.tsx` — mount AMABanner (if page exists)
- `client/src/pages/Admin.tsx` — AMA management UI

---

## Phase 5 — Admin Broadcast Tab (Fix 2)

Add a **Broadcast** tab (`value="broadcast"`) to `/admin` after the newsletter tab. Full spec in `FIXES_TO_MAKE_2026-03-11.md` Fix 2.

### Summary

- One-time setup: Buffer API token saved in `.env` as `BUFFER_ACCESS_TOKEN`; "Test Connection" button in Admin Settings shows which channels are linked
- Compose box with 280-char counter, optional link, optional image
- Channel checkboxes (Twitter/X, LinkedIn, Facebook, Instagram, Bluesky, Farcaster) — state persists in localStorage
- Post Now / Schedule / Preview actions
- Farcaster: ship Option A first (opens `https://warpcast.com/~/compose?text=ENCODED_TEXT` in new tab — no API key needed)
- Quick share shortcut from blog post / announcement editors: "Share to Social" pre-fills Broadcast composer

**Server endpoints:**
```
GET  /api/admin/buffer/profiles
POST /api/admin/buffer/post
POST /api/admin/farcaster/post  (Option A: returns Warpcast intent URL)
```

**Files:**
- `client/src/pages/Admin.tsx` — add Broadcast tab trigger + TabsContent; Buffer settings in Settings tab
- `client/src/components/AdminBroadcastPanel.tsx` (new) — full compose UI
- `server/routes/buffer.ts` (new)
- `server/routes/farcaster.ts` (new)
- `server/index.ts` — register new routes
- `.env` / `.env.example` — `BUFFER_ACCESS_TOKEN`, `FARCASTER_HANDLE`

---

## Phase 6 — Forum Coordination Upgrades (C5–C10, C14–C17)

Full specs in `FORUM_COORDINATION_UPGRADES_2026-03-11.md`. These can ship iteratively after Phases 1–5. Implement in the priority order below.

### Priority: Medium-High

**C14 — Active Projects Forum Section**

New "Active Projects" Gathering Grove section. When a project application via `/apply` is approved:
1. Auto-create a forum thread: `[Project Name] — [Bioregion]`
2. Body auto-populated from application data (what they're building, stage, what they need)
3. Thread template ends with: "[Apply to support this project →] [View on map →]"

Add "Forum thread →" link to project pins on `/map`.

**Files:** `server/routes/projects.ts` (hook into approval), `client/src/pages/Community.tsx` (new section), `client/src/pages/Map.tsx` (thread link on pins), `client/src/pages/Admin.tsx` (approval triggers thread creation)

**C5 — Post Tags**

Three system tags on forum posts: `#lesson`, `#seeking-support`, `#offering-support`. Tags appear as small badges on posts. Cross-section filter pages:
- `/community/lessons`
- `/community/seeking-support`
- `/community/offering-support`

Link these from forum navigation.

**C6 — Case Study Thread Format**

"Post a Case Study" type in Learning and Resources. Pre-filled template:
- What we tried / What worked / What did not work / What we would do differently / Resources and links

Case Studies auto-get the `#lesson` tag. Appear in "Case Studies" pinned sub-section and `/community/lessons`.

**C7 — "I Tried This" Tag**

Checkbox in post/reply composer: "I tried something from this thread." Displays "Tried this" badge on replies. Thread listings show "X people tried this" indicator.

**C8 — Idea to Experiment to Result Thread Chain**

"Thread Stage" field: `idea` / `experiment` / `result`. Stage badge on post (Idea / Experiment / Result). Posts in same chain cross-linked. `/community/chains` filter page shows all active chains.

**C9 — Knowledge Cluster Index Posts**

Pinned "Knowledge Map: [Section Name]" post per Gathering Grove section. Claude auto-scans weekly for high-engagement threads and proposes additions. Admin approves from `/admin → Forum`.

**C10 — Project Team Builder Threads**

"Seeking Team" sub-section. Thread template: project name, stage, what you're building, roles needed, skills, time commitment, how to express interest. Posts display "Seeking Team" badge.

**C15 — "Needs Each Other" + "Similar Projects" Tags**

Admin-created cross-links between projects/threads. DB table `project_connections { id, project_a_id, project_b_id, connection_type: "needs_each_other"|"similar", note, created_by, created_at }`. Display in relevant forum threads and `/map` project cards.

**C16 — New Member Discovery Path**

After profile setup, show a "Discover" section in PlayerProfile. Three personalized recommendations in each category: people nearby (same bioregion/realm), projects that need what you offer (match against gifts from C2), projects doing what you're dreaming of (match against `dreaming_of` from C4). Depends on C2 and C4 being in DB first.

**C17 — Bioregional Post Tagging**

Optional "Tag a bioregion" field in post composer (uses `BioregionSelect` from C1). Bioregion badge on tagged posts in listings. Filter controls at Gathering Grove header. Depends on C1 (bioregion table must be seeded).

**External resource note:** In Learning and Resources section, add a pinned "External Resources" post linking to https://localscale.org as the go-to resource for discovering what exists in each bioregion.

---

## Phase 7 — AI Content Jobs (C12, C13)

Full specs in `FORUM_COORDINATION_UPGRADES_2026-03-11.md`. Ship after forum is live and has content.

### C12 — AI Digest + Newsletter

**Legal requirement:** Every digest email must include an unsubscribe link. The `server/routes/newsletter.ts` unsubscribe endpoint (`DELETE /api/newsletter/unsubscribe`) must set `active: false` on the subscriber row. Every outbound email must include a one-click unsubscribe link pointing to that endpoint.

Newsletter signup form in three places: forum landing page footer, forum sidebar, and player profile settings ("Subscribe to the ReGen Civics digest").

Scheduled job (weekly or biweekly): pull top N threads by engagement → Claude API → save digest → post as pinned forum thread → send email to active subscribers.

Claude digest prompt (no em-dashes in prompt):
```
You are the ReGen Civics community curator. Review the following forum threads from the past [period] and write a short, engaging digest for the community. For each of the 3-5 most valuable threads, write: the thread title as a link, a 2-sentence summary of what was discussed or discovered, and why it matters to the Regenerative Renaissance. Warm, human, and forward-looking tone. No em-dashes. Plain language throughout.

[forum thread data]
```

**Files:** `server/jobs/digestJob.ts` (new), `server/routes/newsletter.ts` (new), `drizzle/schema.ts` (digests + newsletter_subscribers tables), `client/src/components/NewsletterSignup.tsx` (new), updates to `Community.tsx` and `PlayerProfile.tsx`

### C13 — Claude-Maintained Movement Glossary

Glossary page at `/community/glossary`. Scheduled job (runs after digest job) scans recent forum threads for new terms and proposes entries. Admin approves from `/admin → Glossary`.

DB table: `glossary_terms { id, term, definition, source_thread_url, proposed_at, approved_at, approved_by, status: "proposed"|"approved"|"rejected" }`

**Files:** `server/jobs/glossaryJob.ts` (new), `server/routes/glossary.ts` (new), `drizzle/schema.ts` (glossary_terms table), `client/src/pages/Glossary.tsx` (new, at `/community/glossary`), update `Admin.tsx`

---

## Deferred (Later Tasks)

These are in `UPGRADE_TASKS_2026-03-10.md` and valid but lower priority than the above:

**Task 6 — Quest Image Generation:** Generate 13 quest images via `nano-banana-pro` skill and wire them as local fallbacks in `Quest.tsx`. Full image prompts and file paths in `UPGRADE_TASKS_2026-03-10.md` Task 6.

**Task 7 — Personalized Return Visitor Cards:** Add personalized shortcut cards at the top of `ProgressiveOnboarding` for return visitors (journey quests, next quest, community, opportunity, accelerator, schedule). Full spec in `UPGRADE_TASKS_2026-03-10.md` Task 7. Depends on Task 6 images (card images reuse the quest illustrations).

---

## Complete File Manifest

| Action | Path | Phase |
|--------|------|-------|
| MODIFY | `client/src/pages/Home.tsx` | 0a, 0d |
| MODIFY | `client/src/App.tsx` | 0b, 0e |
| MODIFY | `client/src/components/ReGenGuide.tsx` | 0c |
| MODIFY | `server/_core/oauth.ts` | 0c |
| MODIFY | `client/src/pages/PlayerProfile.tsx` | 1a, 1e, 1f, 1g, 3a, 3b, 3d, 3f, C16 |
| CREATE | `client/src/data/welcomeAboardQuests.ts` | 1b |
| CREATE | `client/src/components/QuestCard.tsx` | 1c |
| CREATE | `client/src/components/SharePanel.tsx` | 1d |
| CREATE | `client/src/components/WelcomeAboardQuests.tsx` | 1e |
| DELETE/ARCHIVE | `client/src/components/SocialShareQuestCard.tsx` | 1f |
| CREATE | `client/src/components/QuestStartPopup.tsx` | 1g |
| MODIFY | Claim logic (locate in codebase) | 1h |
| MODIFY | `package.json` | 1d (react-share) |
| CREATE | `scripts/seed-forum-posts.ts` | 2 |
| MODIFY | `drizzle/schema.ts` | 3c, 3d, 3e, 4, 7 |
| MODIFY | `client/src/components/ProfileEditForm.tsx` | 3a, 3e |
| CREATE | `client/src/pages/Marketplace.tsx` | 3d |
| CREATE | `server/routes/marketplace.ts` | 3d |
| CREATE | `client/src/components/BioregionSelect.tsx` | 3c |
| CREATE | `scripts/seed-bioregions.ts` | 3c |
| CREATE | `server/routes/bioregions.ts` | 3c |
| MODIFY | `client/src/components/ProfileCard.tsx` | 3e, 3f |
| MODIFY | `client/src/pages/Community.tsx` | 3e, 4, C5, C14, C17 |
| CREATE | `client/src/components/AMABanner.tsx` | 4 |
| CREATE | `server/routes/ama.ts` | 4 |
| MODIFY | `client/src/pages/Schedule.tsx` | 4 (if page exists) |
| MODIFY | `client/src/pages/Admin.tsx` | 3c, 4, 5, C9, C13, C14, C15 |
| CREATE | `client/src/components/AdminBroadcastPanel.tsx` | 5 |
| CREATE | `server/routes/buffer.ts` | 5 |
| CREATE | `server/routes/farcaster.ts` | 5 |
| MODIFY | `server/index.ts` | 5 |
| MODIFY | `.env` / `.env.example` | 5 |
| MODIFY | `server/routes/projects.ts` | C14 |
| MODIFY | `client/src/pages/Map.tsx` | C14, C15 |
| CREATE | `client/src/components/ProjectConnections.tsx` | C15 |
| CREATE | `server/routes/connections.ts` | C15 |
| CREATE | `client/src/components/DiscoverTab.tsx` | C16 |
| CREATE | `server/routes/discovery.ts` | C16 |
| CREATE | `server/jobs/digestJob.ts` | C12 |
| CREATE | `server/routes/newsletter.ts` | C12 |
| CREATE | `client/src/components/NewsletterSignup.tsx` | C12 |
| CREATE | `server/jobs/glossaryJob.ts` | C13 |
| CREATE | `server/routes/glossary.ts` | C13 |
| CREATE | `client/src/pages/Glossary.tsx` | C13 |

---

## What Not to Build

- **No standalone quest forum routes** at `/community/feedback`, `/community/origin-story`, `/community/regen-act`, `/community/bioregion`, `/community/foundations`, `/community/refer-org`. These paths do not exist. Q5, Q6, Q9, Q10 are the only quests with their own forum posts.
- **No `/dream-quest` route** for Q10 — the link is `https://regencivics.earth/community/quests`.
- **No ecosystem map thread** in the forum — link to https://localscale.org as an external resource instead.
- **No standalone project directory** — superseded by the `/apply` flow and the new Active Projects forum section (C14).
- **No blockchain integration in Fix 3b** — the Contributions tab callout is UI only. The actual Hypha/Base sync is a future task.
- **No Buffer account credentials in the codebase** — only the access token goes in `.env`. Buffer handles all platform OAuth.

---

## Verify Checklist

1. `pnpm check` passes with zero TypeScript errors
2. Quest cards render in both Overview tab and Quests tab; golden glow and hover animations correct
3. Card flip share panel opens smoothly; all 6 platform buttons functional
4. All quest forum URLs correct: Q5 → `/community/make-friends`, Q6 → `/community/pledge-gift`, Q9 → `/community/refer-land`, Q10 → `https://regencivics.earth/community/quests`, all others → Gathering Grove threads
5. QuestStartPopup fires once after profile setup; does not reappear on reload
6. "Personal Quests" appears in nav (authenticated only) and profile header/sidebar
7. Claim action blocked until all 10 quests are complete
8. Em-dash grep returns zero matches in all tracked `.ts` and `.tsx` files
9. `npx ts-node scripts/seed-forum-posts.ts --dry-run` prints all content (8 anchor posts + 40+ threads + quest seed content) without error
10. `scripts/seed-bioregions.ts` runs without error; bioregion autocomplete works in profile edit
11. AMA banner appears on `/community` and `/schedule`; dismisses per user; auto-hides after event date
12. Newsletter unsubscribe endpoint functional; all outbound digest emails include unsubscribe link
13. Admin Broadcast tab renders; Buffer "Test Connection" works with a valid token
14. ProfileEditForm correctly parses and re-serializes bio JSON; existing users see their answers pre-filled
15. Marketplace empty state shows CTA when no gifts/needs exist
16. All new components tested at 375px, 768px, and 1280px

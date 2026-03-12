# Fixes to Make — 2026-03-11

---

## Fix 1: Quest Cards — Full 10-Quest Display in Overview Tab, Golden Glow, Game-Feel Design, Expanded Social Sharing

### Goal

Replace the single `SocialShareQuestCard` in the Overview tab with a full, gorgeous, interactive display of all 10 Welcome Aboard Quests. Quest cards should feel alive — golden glow, hover depth, tactile completion states — following industry best practices for game-play application card design. Social sharing per quest should expand to all major platforms: Twitter/X, LinkedIn, Farcaster, Facebook, Bluesky, and Instagram (via copy).

### Current State

- The Overview tab (PlayerProfile.tsx) shows `ProfileCard` + `SocialShareQuestCard` only
- `SocialShareQuestCard` is a single CTA card prompting a share to X/Twitter — it does NOT show the 10 quests
- All 10 quests live in the separate **Quests** tab via `WelcomeAboardQuests.tsx`
- Quest cards in `WelcomeAboardQuests.tsx` are functional but visually minimal: `bg-white/5`, plain white borders, no glow, no hover animation
- Social sharing per quest: only a "Go to forum post" external link — no in-card share buttons

### What to Build

#### 1. Overview Tab — Show All 10 Quests Directly

Replace `<SocialShareQuestCard />` in the Overview tab with `<WelcomeAboardQuests />` (the same component used in the Quests tab, but styled per the new design below).

The progress summary header should remain visible. Users can tackle quests in any order — no forced linear progression. The Overview tab becomes the primary quest surface.

If desired, the Quests tab can either remain as-is (showing the same component again, which is fine as a deeper focus area) or be repurposed. Either way the Overview tab must show all 10 quests without needing to click to another tab.

#### 2. Quest Card Visual Design — Golden Glow + Game Feel

Apply these design principles across all quest cards in `WelcomeAboardQuests.tsx`:

**Golden glow system**

```css
/* Incomplete card — subtle ambient gold glow */
box-shadow:
  0 0 0 1px rgba(212, 165, 116, 0.15),
  0 4px 20px rgba(212, 165, 116, 0.08),
  0 1px 4px rgba(0, 0, 0, 0.4);

/* Hover — warmer, lifted glow */
box-shadow:
  0 0 0 1px rgba(212, 165, 116, 0.35),
  0 8px 32px rgba(212, 165, 116, 0.18),
  0 2px 8px rgba(0, 0, 0, 0.5);
transform: translateY(-2px);

/* Completed card — green glow */
box-shadow:
  0 0 0 1px rgba(125, 216, 125, 0.3),
  0 4px 20px rgba(125, 216, 125, 0.12);
```

These can be applied via Tailwind arbitrary values or inline style, whichever is cleaner.

**Hover + interactive feel**

- Smooth `transition-all duration-200` on all cards
- Hover: slight upward lift (`-translate-y-0.5` or `-translate-y-1`) + shadow intensify
- Cursor: `cursor-pointer` on the full card header zone
- The Q-number badge should subtly pulse or brighten on hover (opacity or ring effect)
- Completed cards: dim the glow slightly, add a faint checkmark shimmer or stamp effect (CSS only, no heavy animation libs needed)

**Reward badge prominence**

The `33 $ReGen + 0.1 RGVoice` reward badge should be visually prominent — gold/amber, not faded. Consider a soft inner glow on the badge itself. This is a core gameplay signal.

**Expand/collapse refinement**

The "About this quest" expand section should feel like opening a chest — consider a smooth `max-height` CSS transition rather than abrupt show/hide. Tailwind's `transition-all` with `overflow-hidden` and `max-h-0` / `max-h-[500px]` works well here.

**Card border treatment**

- Incomplete: `border-[#d4a574]/20` (gold-tinted, not plain white) — reinforces the game-feel theme
- Hover: `border-[#d4a574]/40`
- Completed: `border-[#7dd87d]/30` (green)

**Progress bar in the series header**

The progress bar already exists. Give it a golden gradient when < 100%:

```css
background: linear-gradient(to right, #d4a574, #f0c070);
```

And a green gradient when complete. Add a subtle pulse animation to the last filled segment while there are still quests to complete.

#### 3. Expanded Social Sharing Per Quest Card — Card Flip Mechanic

Each quest in `WELCOME_ABOARD_QUESTS` already has social media posting as an explicit step. The sharing options should be discoverable and delightful to use.

**Interaction model: card flip on click/hover**

The quest card front shows the standard quest info (title, tagline, reward, status). When the user clicks a "Share" icon (or a dedicated "Share this quest" button), the card flips to reveal its back face -- a full share panel with all platform buttons, pre-populated share text, and a "copy" option. This is a natural game-card metaphor and keeps the front face clean.

Implementation approach:
- CSS 3D transform flip: `transform-style: preserve-3d`, front face `.front` / back face `.back` each with `backface-visibility: hidden`
- Triggered by a small share icon in the card corner (always visible, ~20px) or by clicking a "Share" label
- Smooth 300ms flip animation
- Back face has a darker background (or slight transparency shift) to signal "reverse" state
- An "X" / close button flips back to front

**Platforms to support:**

| Platform   | Share URL pattern | Notes |
|------------|-------------------|-------|
| X/Twitter  | `https://x.com/intent/tweet?text=ENCODED_TEXT&url=ENCODED_URL` | Native web intent |
| LinkedIn   | `https://www.linkedin.com/sharing/share-offsite/?url=ENCODED_URL` | Link-share only |
| Farcaster  | `https://warpcast.com/~/compose?text=ENCODED_TEXT` | Opens Warpcast |
| Facebook   | `https://www.facebook.com/sharer/sharer.php?u=ENCODED_URL` | Native web intent |
| Bluesky    | `https://bsky.app/intent/compose?text=ENCODED_TEXT` | Native web intent |
| Instagram  | Copy text to clipboard + prompt | Instagram has no web share URL; best UX is to copy the text and show "Paste into Instagram" |
| Copy link  | `navigator.clipboard.writeText(quest.forumUrl)` | Fallback + Instagram path |

**Library recommendation: `react-share`**

The `react-share` npm package provides ready-made share buttons for Twitter, Facebook, LinkedIn, Reddit, Telegram, WhatsApp, and ~15 others -- all typed, accessible, and styled. Add Farcaster, Bluesky, and Instagram-copy as custom wrappers on top.

```bash
npm install react-share
```

```tsx
import { TwitterShareButton, LinkedinShareButton, FacebookShareButton } from 'react-share';
```

Farcaster and Bluesky need custom `<a target="_blank">` wrappers since they aren't in the library yet -- simple to add.

**Default share text per quest:**

```ts
const shareText = `${quest.tagline} — Doing the "${quest.title}" quest at @ReGenCivics 🌿 ${quest.forumUrl}`;
```

**Share panel back-face layout:**

```
┌────────────────────────────────────────┐
│  Share this quest                  ✕   │
│                                        │
│  "Tagline text — Quest title..."       │
│  [Edit text if desired]                │
│                                        │
│  🐦 Twitter   💼 LinkedIn   📘 Facebook│
│  🟣 Farcaster  🦋 Bluesky   📷 Instagram│
│                    [Copy link]         │
└────────────────────────────────────────┘
```

Instagram button: clicking shows a "Text copied! Now paste into Instagram" micro-confirmation rather than navigating away.

**Cross-posting tools note (for Rye's reference)**

If the team wants to share quest completions or campaign updates to multiple platforms simultaneously (not just per-user sharing), **Buffer** (buffer.com) is the cleanest tool -- draft once, publish to X, LinkedIn, Facebook, Bluesky, and Instagram together. Free tier supports 3 channels. This is separate from the in-card per-user sharing but worth knowing for team posts about the project.

#### 4. Remove / Replace SocialShareQuestCard

The `SocialShareQuestCard` component in `PlayerProfile.tsx` (and its localStorage dismissal logic) can be removed once the full quest grid is in the Overview tab. The quest grid itself now serves as the engagement surface.

Alternatively, if the team wants a persistent "share the site" CTA, it can be folded into the series header of `WelcomeAboardQuests` as a subtle secondary action (not a full blocking card).

### Files to Change

| File | Change |
|------|--------|
| `client/src/pages/PlayerProfile.tsx` | Replace `<SocialShareQuestCard />` with `<WelcomeAboardQuests />` in the Overview tab section |
| `client/src/components/WelcomeAboardQuests.tsx` | Apply golden glow, hover effects, card border treatment, expand transition, card-flip share panel |
| `client/src/components/QuestCard.tsx` (new or inline) | Extract quest card to its own file once it includes flip mechanic + share panel |
| `client/src/components/SharePanel.tsx` (new) | Card back-face share panel: all 6 platforms + copy-link, using react-share |
| `client/src/components/SocialShareQuestCard.tsx` | Delete or archive once Overview tab is updated |
| `package.json` | Add `react-share` dependency |

### Design Reference — Industry Best Practices for Game Quest Cards

Well-executed quest/achievement cards (Duolingo, Habitica, mobile RPGs) share these traits:

1. **Reward is the hero** — the reward is visually prominent, not tucked away
2. **Progress is always visible** — progress bar or count front-and-center
3. **Completion is celebrated** — a distinct visual state (glow, checkmark, color shift) makes completion feel good
4. **Cards feel like objects** — depth, shadow, and slight lift on hover give cards physical presence
5. **Status at a glance** — incomplete vs. in-progress vs. complete readable in under 1 second
6. **Sharing is frictionless** — share options are visible without extra clicks, not buried in menus
7. **Motion is purposeful** — micro-animations (150-300ms) signal state changes, not decoration

Apply all seven to the Welcome Aboard quest cards.

### Priority

High — this is the primary engagement surface for new users. It should feel polished and alive on launch.

---

## Fix 2: Admin "Broadcast" Tab — Buffer Integration for One-Click Multi-Platform Posting

### Goal

Add a **Broadcast** tab to the `/admin` section where you can compose one post and push it simultaneously to all connected social profiles (Twitter/X, LinkedIn, Facebook, Instagram, Bluesky, and more) via Buffer's API. Social profile credentials live in Buffer, not in the app — the admin just connects once and then posts from a clean compose interface.

Farcaster gets a parallel direct integration since Buffer doesn't support it natively yet.

### How Buffer Works (for context)

Buffer is a social scheduling tool with a public API. The integration pattern is:

1. You connect your social accounts inside buffer.com (one-time, done in Buffer's UI)
2. Buffer assigns each connected account a **profile ID**
3. Your app calls Buffer's API with `{ text, link, profileIds[] }` to post to all of them at once
4. Buffer handles authentication with each platform — your app only needs one Buffer access token

Supported natively via Buffer API: Twitter/X, LinkedIn, Facebook, Instagram, Bluesky, Pinterest, TikTok, YouTube, Mastodon. **Farcaster is not yet supported** by Buffer — handle it separately (see below).

### Current State

- No social posting capability exists in `/admin`
- Blog posts and announcements are shared manually outside the app
- No connected social profiles anywhere in the codebase

### What to Build

#### 1. One-Time Setup: Buffer Connection (Settings Tab)

Add a "Social Broadcasting" section to the existing **Settings** tab (`value="settings"` in `Admin.tsx`). This is where you connect Buffer once.

**UI:**

```
┌─ Social Broadcasting ────────────────────────────────┐
│                                                       │
│  Buffer Access Token                                  │
│  [●●●●●●●●●●●●●●●●●●●●●●]  [Test Connection]        │
│                                                       │
│  Connected channels:                                  │
│  ✅ 𝕏 @ReGenCivics    ✅ LinkedIn ReGen Civics       │
│  ✅ Facebook ReGen     ✅ Instagram @regencivics      │
│  ✅ Bluesky @regen     [+ Add more in Buffer ↗]      │
│                                                       │
│  Farcaster (direct)                                   │
│  Handle: @rieki.eth  [Save]                           │
└───────────────────────────────────────────────────────┘
```

**How to get a Buffer access token:**
1. Go to buffer.com → Settings → API → Create Access Token
2. Paste it into the admin settings field
3. It's stored as `BUFFER_ACCESS_TOKEN` in the server environment (`.env`)
4. "Test Connection" calls `GET /v1/profiles` via a server proxy and shows which channels are linked

#### 2. New "Broadcast" Tab

Add `value="broadcast"` as a new tab in Admin.tsx, positioned after the `newsletter` tab.

Tab label: "Broadcast 📣" or just "Broadcast"

**The tab contains `AdminBroadcastPanel` component with three sections:**

**A. Compose**

```
┌─ Compose a Post ──────────────────────────────────────┐
│                                                        │
│  [                                          ] 280 chars│
│  [  What's happening in the Regen world?   ]          │
│  [                                          ]          │
│                                                        │
│  Link (optional):  [https://...]                       │
│  Image (optional): [Upload / paste URL]                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Char counter updates as you type. Link auto-appends to share text if provided.

**B. Select Channels**

```
┌─ Post to ─────────────────────────────────────────────┐
│  [✓] 𝕏 Twitter       [✓] LinkedIn                    │
│  [✓] Facebook         [✓] Instagram                   │
│  [✓] Bluesky          [✓] Farcaster (direct)          │
│                                                        │
│  [Select all]  [Clear]                                 │
└────────────────────────────────────────────────────────┘
```

Channels come from the Buffer profiles API + the saved Farcaster handle. Each checkbox persists its last state in localStorage so you don't have to re-select every time.

**C. Actions**

```
[Post Now]   [Schedule ▾]   [Preview]
```

- **Post Now** — sends immediately via Buffer API (+ Farcaster direct if checked)
- **Schedule** — opens a date/time picker, schedules via `Buffer /v1/updates/create` with `scheduled_at`
- **Preview** — shows a modal preview of how the post will look (approximate, not exact per platform)

After posting: show a confirmation row per channel (green checkmark or red error) so you can see which ones went through.

#### 3. Quick Share on Blog Posts and Announcements

In the blog post editor and any announcement flow in admin, add a **"Share on Social"** inline panel that auto-populates the Broadcast composer and opens the Broadcast tab:

```
─── Share this post ───────────────────────────────
[Share to Social ↗]  Pre-fills: Title + excerpt + URL
───────────────────────────────────────────────────
```

Clicking "Share to Social" navigates to the Broadcast tab with the post data pre-filled in the compose box.

#### 4. Server Endpoints

Add these to the Express/server layer:

```ts
// Proxy Buffer profiles list (keep access token server-side)
GET /api/admin/buffer/profiles
→ calls Buffer GET /v1/profiles
→ returns [{ id, service, serviceUsername, avatarHttps }]

// Proxy Buffer post creation
POST /api/admin/buffer/post
body: { text: string, link?: string, profileIds: string[], scheduledAt?: string }
→ calls Buffer POST /v1/updates/create for each profileId (or bulk)
→ returns [{ profileId, success, updateId?, error? }]

// Direct Farcaster post (Warpcast HTTP API or web intent fallback)
POST /api/admin/farcaster/post
body: { text: string }
→ calls Warpcast API if auth available, else returns a warpcast.com intent URL
→ returns { success, url }
```

Environment variables to add:

```env
BUFFER_ACCESS_TOKEN=your_token_here
FARCASTER_HANDLE=@rieki.eth          # optional, for display
FARCASTER_API_KEY=                   # optional, for direct posting
```

#### 5. Farcaster Notes

Buffer doesn't support Farcaster yet. Two options:

**Option A (simpler, no API key needed):** The Farcaster "post" just opens `https://warpcast.com/~/compose?text=ENCODED_TEXT` in a new tab — the user clicks once to confirm in Warpcast. Zero auth required. Implement this first.

**Option B (fully automated):** Use the Farcaster HTTP API (`client.publishCast()`) with an auth token. More setup but true one-click. Can be added later.

Recommend shipping Option A first and upgrading to Option B when there's demand.

### Files to Create / Change

| File | Change |
|------|--------|
| `client/src/pages/Admin.tsx` | Add `value="broadcast"` tab trigger + TabsContent shell; add Buffer settings section to Settings tab |
| `client/src/components/AdminBroadcastPanel.tsx` (new) | Full broadcast compose UI: compose box, channel checkboxes, post/schedule actions |
| `server/routes/buffer.ts` (new) | Express routes: GET /api/admin/buffer/profiles, POST /api/admin/buffer/post |
| `server/routes/farcaster.ts` (new) | Express route: POST /api/admin/farcaster/post (Option A: returns intent URL) |
| `server/index.ts` | Register new buffer + farcaster routes |
| `.env` / `.env.example` | Add BUFFER_ACCESS_TOKEN, FARCASTER_HANDLE |

### Setup Steps (one-time, for Rye)

1. Create a free Buffer account at buffer.com
2. Connect Twitter/X, LinkedIn, Facebook, Instagram, Bluesky in Buffer's "Channels" settings
3. Go to buffer.com → Settings → Developers → Get Access Token
4. Add the token to `.env` as `BUFFER_ACCESS_TOKEN`
5. In Admin → Settings → Social Broadcasting, click "Test Connection" — channels appear
6. Done. Post from the Broadcast tab from then on.

### Priority

Medium-high. High value for low effort once Buffer account is set up. The server proxy is ~50 lines, the UI is ~200 lines. Buffer does all the heavy lifting.

---

## Fix 3: Profile Settings — Sync Edit Form to Onboarding Questions + Contributions Tab Blockchain Callout

### Goal

Two connected fixes to the Player Profile:

**3a.** The Edit Profile form in the Settings tab is showing generic fields (Bio, Avatar URL, Project URL) but the onboarding flow collected meaningful soul-level questions (Role, Soul's Mission, Seeking, Gifts to Offer). The edit form needs to reflect the actual questions users answered so they can update them.

**3b.** The Contributions tab shows a manual "Log a Contribution" self-report form as if it's the primary feature. This should be deprioritized in favor of a clear callout that contributions will be tracked automatically from Hypha DAO and the Base blockchain once the user's account is linked and transactions are processed.

---

### Fix 3a — Edit Profile Form

#### Current State

`ProfileEditForm.tsx` renders a generic form with:
- Display Name, Location, Bio / About (plain textarea), Avatar URL
- Path-specific extras: Investment Range / Project Name + URL / Organization Name / Quest Interests

The problem: the `bio` field is actually structured JSON — `JSON.stringify({ role, soul, desires, gifts })` — set during onboarding. So the "Bio / About" textarea either shows raw JSON to the user or overwrites the structured data with freeform text.

The four onboarding questions captured are:
- **Role**: "What's your role in this renaissance?" (land steward, investor, builder, artist...)
- **Soul's Mission**: "What's your soul's mission?" (deeper calling...)
- **Seeking**: "What are you seeking?" (what would make this worth their time...)
- **Gifts to Offer**: "What gifts do you bring?" (skills, resources, wisdom, connections...)

These are displayed in the profile card as structured fields — but currently a user has no way to edit them after onboarding.

#### What to Change

Update `ProfileEditForm.tsx` to:

1. On load, parse `profile.bio` as JSON. If it parses as `{ role?, soul?, desires?, gifts? }`, populate four labeled textareas. If it's plain text (legacy), show it in a single "Bio" textarea as before (graceful fallback).

2. On save, re-serialize the four soul fields back to `JSON.stringify({ role, soul, desires, gifts })` before sending to `updateProfile`.

3. Keep all existing path-specific fields (Investment Range, Project Name/URL, Organization Name, Quest Interests) exactly where they are.

**New form layout (all paths):**

```
Display Name          |  Location
─────────────────────────────────────────────────────
Your role in this renaissance
  [Land steward, investor, builder, artist…]

Your soul's mission
  [The deeper calling that brought you here…]

What are you seeking?
  [What would make this worth your time and energy?]

Gifts you bring
  [Skills, resources, wisdom, connections…]

Avatar URL
  [https://...]

[path-specific fields remain below, unchanged]
```

Remove the plain "Bio / About" textarea — the four soul questions replace it. The section header can say "About You" to group them.

The placeholder text should match the onboarding placeholders exactly, so returning users see familiar prompts.

**Relevant code in `ProfileEditForm.tsx`:**

```ts
// On load — parse bio into structured fields
useEffect(() => {
  if (!profile) return;
  let parsed: { role?: string; soul?: string; desires?: string; gifts?: string } | null = null;
  try { parsed = JSON.parse(profile.bio ?? ''); } catch { /* plain text bio */ }

  setForm({
    displayName: profile.displayName ?? "",
    location: profile.location ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    role: parsed?.role ?? "",
    soul: parsed?.soul ?? "",
    desires: parsed?.desires ?? "",
    gifts: parsed?.gifts ?? "",
    legacyBio: (!parsed && profile.bio) ? profile.bio : "", // fallback for old plain-text bios
    // ... path-specific fields unchanged
  });
}, [profile]);

// On save — re-serialize bio
const bioValue = (form.role || form.soul || form.desires || form.gifts)
  ? JSON.stringify({ role: form.role, soul: form.soul, desires: form.desires, gifts: form.gifts })
  : form.legacyBio;
```

---

### Fix 3b — Contributions Tab: Blockchain Callout

#### Current State

The Contributions tab (`ContributionsTab` component in `PlayerProfile.tsx`) shows:
- A "Log a Contribution" expand button
- A full self-report form (capital type, amount, description, project name)
- "No contributions logged yet" empty state

This is a manual self-report system. The intent is to eventually pull real contributions from Hypha DAO (where governance actions and proposals create on-chain contribution records) and the Base blockchain (where $ReGen / $RCivics token transactions are recorded).

#### What to Change

Replace the current empty state and "Log a Contribution" form with a **blockchain callout** that sets clear expectations, then shows the manual log as a secondary fallback.

**New layout:**

```
┌─ Contribution Log ──────────────────────────────────────┐
│ 🌿  Record contributions across the 8 forms of capital  │
│                                                          │
│  ┌─ On-Chain Tracking (Coming Live) ──────────────────┐  │
│  │                                                     │  │
│  │  Once your Hypha and Base accounts are linked,      │  │
│  │  your contributions will appear here automatically: │  │
│  │                                                     │  │
│  │  🟣 Hypha DAO — governance votes, proposals,        │  │
│  │     role assignments, and payouts from the          │  │
│  │     ReGen Games DHO                                 │  │
│  │                                                     │  │
│  │  🔵 Base blockchain — $ReGen and $RCivics token     │  │
│  │     transactions, badge mints, and on-chain         │  │
│  │     contribution records                            │  │
│  │                                                     │  │
│  │  [Link your Hypha account →]                        │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                          │
│  ── Self-Reported Contributions ─────────────────────── │
│  Values you log here can be verified by admins.          │
│  [+ Log a Contribution]                                  │
└──────────────────────────────────────────────────────────┘
```

**Logic for the callout:**

- If `profile.walletAddress` is set: show a "Hypha account linked ✓" status and a note that on-chain data will sync
- If `profile.walletAddress` is NOT set: show the "Link your Hypha account" CTA that navigates to the Settings tab (or opens the Hypha link flow inline)
- The manual log section remains fully functional below the callout -- it's just no longer the hero element

**"Link your Hypha account" button:** 

Navigate to the Settings tab and scroll to the wallet section:
```tsx
onClick={() => { setActiveTab("settings"); setTimeout(() => document.getElementById('wallet-section')?.scrollIntoView({ behavior: 'smooth' }), 100); }}
```

**Styling for the callout box:**

Use a distinct treatment to signal "this is a system status" rather than a content card -- something like `border border-dashed border-white/20 bg-white/5 rounded-xl p-4` with the chain icons (Hypha purple, Base blue) as accent colors.

#### What NOT to Change

- The `ContributionsTab` self-report form itself stays functional and intact
- The 8 forms of capital selector stays as-is
- Admin verification logic is unchanged
- The actual blockchain data fetching is out of scope for this fix -- this is purely a UI/UX callout change, not a blockchain integration. The real integration is a future task.

---

### Files to Change

| File | Change |
|------|--------|
| `client/src/components/ProfileEditForm.tsx` | Parse bio JSON into 4 soul-question textareas; re-serialize on save; remove plain bio textarea |
| `client/src/pages/PlayerProfile.tsx` | Update Contributions tab JSX: add blockchain callout above the existing ContributionsTab; pass `setActiveTab` to ContributionsTab for the link CTA |

### Priority

High for 3a (edit form is actively confusing users who try to update their soul questions). Medium for 3b (the callout is a UX clarity fix, not a feature gap -- the manual log still works fine).

---

## Fix 4: Forum Coordination Layer — 17 Upgrades for Connect / Learn / Discover / Map

**Source doc:** `FORUM_COORDINATION_UPGRADES_2026-03-11.md`

**Context:** A full coordination layer spec covering 17 accepted upgrades across four areas. Read the full doc before implementing any of these.

**Summary of what is in scope:**

**Profile layer (build first — other layers depend on this data):**
- C1: Bioregion auto-suggest using One Earth map (846 bioregions) + community addition button
- C2: Gifts + Needs registry built into profile onboarding, feeds `/marketplace`
- C3: Two-sided collaboration status ("Seeking collaborators" vs "Looking to join")
- C4: Add "What bioregion do you call home?" and "What are you dreaming of?" as structured DB fields in onboarding

**Forum layer:**
- C5: Post tags: `#lesson`, `#seeking-support`, `#offering-support` with filter views
- C6: Case Study thread format (structured template: what we tried / worked / didn't / would change)
- C7: "I Tried This" follow-up tag on replies
- C8: Idea to Experiment to Result thread chain format with stage badges
- C9: Knowledge Cluster pinned index posts per Gathering Grove section, Claude-assisted curation
- C10: Project Co-founder / Team Builder thread type ("Seeking Team" sub-section)

**Content + broadcast layer:**
- C11: AMA banner + admin control (deadline: before April 26th — first AMA is Amora Costa Rica, April 26th at 11:00 AM EST). Banner shows at top of `/community` and on `/schedule`.
- C12: AI digest auto-generated by Claude, periodic newsletter, + newsletter signup form
- C13: Claude-maintained Movement Glossary at `/community/glossary`, admin-approved

**Discovery + matching layer:**
- C14: Active Projects forum section — auto-created from `/apply` approvals, `/map` links to threads
- C15: "Needs Each Other" + "Similar Projects" cross-project tags (admins link projects)
- C16: New member discovery path — surfaces relevant people + projects post-onboarding (depends on C2 + C4)
- C17: Optional bioregional tagging on forum posts (uses bioregion table from C1)

**Skipped / deferred:** Standalone project directory (#11 superseded by /apply), seasonal spotlight (#13), ecosystem map thread (#19 — link to localscale.org instead).

**Priority for this fix:** C11 (AMA banner) is urgent. C1-C4 (profile layer) unlocks everything else. C14 (Active Projects) connects incubator to community. C5-C10 and C12-C13 and C15-C17 are medium priority and can ship iteratively.

---

## Fix 5: Org Claim Autocomplete — Wire Search to Live Map Data, Add Alliance Org Coverage

### Goal

The "Organisation & Land Project Claims" form in the Settings tab shows a text search input where users type a project name to find and claim it. Currently typing returns no results for most projects (including ones already visible on the `/map` page). Fix the search so it finds all 29 land projects on the map, and add coverage for alliance orgs which are not searchable at all.

### Root Cause (three bugs)

**Bug 1: Search only finds applications in non-draft status -- but most map projects may be stored as submitted/approved, and alliance orgs are never in the applications table at all.**

`OrgClaimsSection` (Settings tab, line ~1707) calls `trpc.applications.search`, which runs:

```sql
SELECT id, projectName, location, country
FROM applications
WHERE status != 'draft'
  AND (projectName LIKE '%query%' OR location LIKE '%query%')
```

This is the right table for land projects, but alliance orgs (Hypha, SEEDS, Nestr, etc.) are a separate concept and will never appear here. So the "ubuntu" search only works if an application with that name exists with a non-draft status.

**Bug 2: When a result is clicked, `type` is hardcoded to `"land_project"` regardless of what was found.**

```tsx
// OrgClaimsSection line ~1769 -- type is always "land_project"
setSelectedOrg({ id: String(result.id), name: result.projectName, type: "land_project" });
```

Even if a future search covered alliance orgs, the claim would be submitted with the wrong type.

**Bug 3: The `OrgClaimSection` component (the other claim panel in the own-profile tab) uses a hardcoded static array of 13 land projects -- the map has 29.**

```ts
// PlayerProfile.tsx line ~887 -- stale hardcoded list
const LAND_PROJECTS = [
  { id: "la_tierra", name: "La Tierra", location: "Costa Rica" },
  // ... 13 total, many missing
];
```

This means users on the profile tab claim form can't find or claim the 16 projects added to the map since this array was last edited.

### What to Fix

#### 1. `OrgClaimsSection` (Settings tab) -- make search cover both land projects and alliance orgs

**A. Server: add `orgClaims.search` endpoint covering both types**

Add a new tRPC procedure (or extend the existing `applications.search`) that searches both:

```ts
// routers.ts -- orgClaims router, new "search" procedure
search: publicProcedure
  .input(z.object({ q: z.string() }))
  .query(async ({ input }) => {
    const { q } = input;
    const landProjects = await db.searchApplications(q);  // existing fn
    const allianceOrgs = ALLIANCE_ORGS_LIST.filter(o =>
      o.name.toLowerCase().includes(q.toLowerCase())
    );
    return [
      ...landProjects.map(p => ({ id: String(p.id), name: p.projectName, location: p.location, type: "land_project" as const })),
      ...allianceOrgs.map(o => ({ id: o.id, name: o.name, location: null, type: "alliance_org" as const })),
    ];
  }),
```

`ALLIANCE_ORGS_LIST` can be a server-side constant (the same 14 alliance orgs currently hardcoded in `PlayerProfile.tsx`) -- no DB table needed for now.

**B. Client: switch `OrgClaimsSection` to use the new combined endpoint and fix the hardcoded type**

```tsx
const { data: searchResults } = trpc.orgClaims.search.useQuery(
  { q: searchQuery },
  { enabled: searchQuery.length > 2 }
);

// On result click -- use the type from the result, not hardcoded
setSelectedOrg({ id: result.id, name: result.name, type: result.type });
```

The results dropdown should show a type badge ("Land Project" / "Alliance Org") next to each result so users can distinguish.

**C. The results display already works well** -- the dropdown with scrollable list, click-to-confirm, change button, and Cancel/Submit Claim buttons are all solid. Just needs the data wired up correctly.

#### 2. `OrgClaimSection` (profile tab) -- replace hardcoded `LAND_PROJECTS` with live query

Replace the static `LAND_PROJECTS` constant with a live query to `trpc.applications.mapData` (already exists -- the same endpoint that populates the globe map):

```tsx
// Remove lines 887-918 (LAND_PROJECTS and ALLIANCE_ORGS constants)

// Inside OrgClaimSection component:
const { data: mapApps = [] } = trpc.applications.mapData.useQuery();

// Replace orgOptions derivation:
const orgOptions = claimType === "land_project"
  ? mapApps.map(a => ({ id: String(a.id), name: a.name, location: a.location }))
  : ALLIANCE_ORGS_INLINE;  // keep alliance orgs as inline constant for now
```

`mapData` returns only submitted/under_review/approved applications with coordinates -- the same 29 projects visible on the map -- so this will always be in sync.

The `select` in `OrgClaimSection` should also add a search/filter input above it (or switch to the same text-search UI used in `OrgClaimsSection`) since 29+ options in a plain select is unwieldy.

#### 3. Bonus: merge the two claim UIs

There are currently two separate claim interfaces:
- `OrgClaimSection` (in the own-profile Settings-adjacent tab, line ~922) -- select dropdown with type toggle
- `OrgClaimsSection` (in the Settings tab proper, line ~1701) -- text search with autocomplete

This is confusing -- two different UX patterns for the same action. After fixing both, consider replacing `OrgClaimSection` with the search-based `OrgClaimsSection` UI everywhere. The search pattern (type to find, click to confirm) is clearly better UX for 29+ items. This merge is optional for this fix, but worth noting.

### Files to Change

| File | Change |
|------|--------|
| `server/routers.ts` | Add `orgClaims.search` procedure that searches both applications and alliance orgs |
| `client/src/pages/PlayerProfile.tsx` | `OrgClaimsSection`: switch to `trpc.orgClaims.search`, fix hardcoded `type: "land_project"`, add type badge to results |
| `client/src/pages/PlayerProfile.tsx` | `OrgClaimSection`: replace `LAND_PROJECTS` constant with live `trpc.applications.mapData` query |
| `client/src/pages/PlayerProfile.tsx` | Remove stale `LAND_PROJECTS` and `ALLIANCE_ORGS` constants (lines ~887-918) |

#### 4. Remove quest-gating from the Steward Dashboard

The `OrgClaimSection` component shows an orange warning banner ("Complete all 10 Welcome Aboard Quests to unlock the ability to claim stewardship...") and disables the "+ Claim Org" button until all quests are done. This gate should be removed entirely -- claiming an org is a core activation step that should not depend on quest completion.

**What to remove (all in `OrgClaimSection`, `PlayerProfile.tsx` lines ~927-981):**

- Lines 927-930: The `completedQuests` parse and `allQuestsDone` derivation (safe to delete if nothing else uses them in this component -- check first)
- Line 965: `disabled={!allQuestsDone}` on the "+ Claim Org" button
- Line 966: `title={allQuestsDone ? undefined : "Complete all 10 Welcome Aboard Quests to unlock claiming"}` on the button
- Lines 974-978: The entire orange gate notice block:
  ```tsx
  {!allQuestsDone && (
    <div className="bg-[#d4a574]/10 border border-[#d4a574]/20 rounded-xl px-4 py-3 text-[#d4a574] text-xs">
      Complete all 10 Welcome Aboard Quests to unlock the ability to claim stewardship of a project or org.
    </div>
  )}
  ```
- Line 981: Change `{showClaimForm && allQuestsDone && (` to `{showClaimForm && (`

After this change, "+ Claim Org" opens immediately for any logged-in user. The `questsCompleted` prop can also be removed from `OrgClaimSection`'s signature if it's not used elsewhere in the component.

**File:** `client/src/pages/PlayerProfile.tsx`

### Priority

High -- this is a broken user-facing flow. Any user who wants to claim stewardship of their land project (a key activation step) is blocked. The quest-gate compounds the problem since it prevents even reaching the (broken) search form.

---

## Fix 6: Multi-Bioregion Selection — Users Can Claim Multiple Bioregions as Home

### Goal

The current profile stores a single `bioregionId` integer (a FK to the `bioregions` table). Many players are part of multiple bioregions -- they might live in one, steward land in another, or move seasonally. Allow selecting multiple bioregions in Settings, and display all of them on the profile card.

### Current State

- `playerProfiles.bioregionId: int("bioregionId")` -- single FK to `bioregions(id)`
- Onboarding step 3 shows a single `<BioregionSelect>` combobox (line ~218 of `PlayerProfile.tsx`)
- Settings tab inline edit (line ~699) shows a single `<BioregionSelect>`
- `BioregionSelect.tsx` component is a searchable single-select combobox

### What to Build

#### 1. Database: New junction table `userBioregions`

A junction table is cleaner than a JSON array for this -- it keeps bioregion data queryable and consistent.

```sql
CREATE TABLE user_bioregions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,               -- References playerProfiles(userId)
  bioregionId INT NOT NULL,          -- References bioregions(id)
  isPrimary TINYINT(1) DEFAULT 0,    -- Optional: flag one as "home base"
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE KEY uq_user_bioregion (userId, bioregionId)
);
```

Drizzle schema addition (`drizzle/schema.ts`):

```ts
export const userBioregions = mysqlTable("user_bioregions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  bioregionId: int("bioregionId").notNull(),
  isPrimary: int("isPrimary").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

Keep `playerProfiles.bioregionId` for now as a legacy / primary bioregion read path during migration. Once multi-select is live, derive the "primary" bioregion from `userBioregions` where `isPrimary = 1`.

#### 2. tRPC endpoints

```ts
// routers.ts (under the existing bioregions router or a new userBioregions router)
userBioregions.list: returns all bioregion IDs for the current user
userBioregions.update: replaces all bioregion entries for the user (pass full array of IDs)
  -- simple: DELETE WHERE userId = X, then INSERT all new rows
```

#### 3. Client: Multi-select in Settings tab

Replace the single `<BioregionSelect>` in the Settings tab with a multi-select variant. The combobox pattern: search + tag list where each selected bioregion appears as a removable chip.

**`BioregionMultiSelect` (new component or extended `BioregionSelect`):**

```tsx
// Shows selected bioregions as chips above the search input
// Search input below filters the dropdown to unselected bioregions
// Clicking a result adds it; clicking the × on a chip removes it
// Max suggestion: cap visible chips at ~5, then "+N more" (no hard cap on selections)
```

UI should feel like the existing single-select but with chips stacking above it. Style chips as `bg-[#1a472a] text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1`.

On save: calls `userBioregions.update` with the full array of selected bioregion IDs. Also writes the first (or primary) bioregion ID back to `playerProfiles.bioregionId` for backward compatibility.

#### 4. Client: Onboarding step 3

Update the onboarding flow (line ~218) to use `BioregionMultiSelect` as well. Store as an array in sessionStorage draft and submit all selected IDs during profile creation.

#### 5. Profile card display

Replace the single bioregion name display with a list: "Cascadia · Blue Mountains · Costa Rica" (join with `·`). Truncate to 2 on small viewports with a "+N" overflow indicator.

### Files to Change

| File | Change |
|------|--------|
| `drizzle/schema.ts` | Add `userBioregions` table definition |
| `server/db.ts` | Add `getUserBioregions(userId)` and `setUserBioregions(userId, ids[])` functions |
| `server/routers.ts` | Add `userBioregions.list` and `userBioregions.update` procedures |
| `client/src/components/BioregionSelect.tsx` | Add multi-select mode (or create `BioregionMultiSelect.tsx`) |
| `client/src/pages/PlayerProfile.tsx` | Settings tab + onboarding: swap to multi-select; profile card: display multiple bioregions |

### Priority

Medium. Multi-bioregion is a real need for many players (especially those active across projects in different regions) but it's not blocking launch.

---

## Fix 7: Badge System — Profile Ring, Forum Propagation, Welcome Aboard Badge + Badge DB

### Goal

Build a proper badge system: a DB-backed badge definitions table, auto-award logic for the Welcome Aboard badge (all 10 quests complete), a visual ring around the profile picture showing the highest-tier badge earned, and badge display that follows users into forum comments and wherever their avatar appears sitewide.

### Current State

- `playerProfiles.badges` is a `text` field storing a JSON array of badge ID strings (e.g. `["welcome_aboard"]`)
- Badge *definitions* live as a hardcoded JS constant in `PlayerProfile.tsx` (line ~80): `badgeDefinitions: Record<string, { name, icon, description, color }>`
- Badges display as simple text chips in the profile card "Badges Earned" section (line ~561-580)
- No visual ring on the avatar
- No badge display in forum comments or anywhere other than the profile card
- No auto-award logic -- badges must currently be assigned manually (presumably by an admin writing to the DB)
- `questsCompleted` is a JSON text array of quest IDs in `playerProfiles`
- `WELCOME_ABOARD_IDS` constant defines the 10 required quest IDs (line ~886 area of `PlayerProfile.tsx`)

### What to Build

#### 1. Badge Definitions — Move to Constants File

Rather than a DB table (which adds migration overhead for what is essentially static config), keep badge definitions as a shared TypeScript constant in `client/src/const/badges.ts` (or `shared/badges.ts` if the server needs it). This makes adding new badge types fast.

```ts
// client/src/const/badges.ts (or shared/badges.ts)
export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  icon: string;       // emoji or icon name
  ringColor: string;  // CSS color for the profile picture ring
  ringGradient: string; // CSS gradient string for the ring
}

export const BADGE_DEFS: BadgeDef[] = [
  {
    id: "welcome_aboard",
    name: "Welcome Aboard",
    description: "Completed all 10 Welcome Aboard Quests",
    tier: "gold",
    icon: "🌿",
    ringColor: "#d4a574",
    ringGradient: "linear-gradient(135deg, #d4a574, #f0c070, #d4a574)",
  },
  {
    id: "rites_of_passage",
    name: "Rites of Passage",
    description: "Completed all 13 Rites of Passage Quests",
    tier: "platinum",
    icon: "🔥",
    ringColor: "#7dd87d",
    ringGradient: "linear-gradient(135deg, #7dd87d, #a8f0a8, #7dd87d)",
  },
  {
    id: "campaign_contributor",
    name: "Campaign Contributor",
    description: "Contributed to a ReGen Civics campaign",
    tier: "bronze",
    icon: "🌱",
    ringColor: "#60a5fa",
    ringGradient: "linear-gradient(135deg, #60a5fa, #93c5fd, #60a5fa)",
  },
  {
    id: "campaign_launcher",
    name: "Campaign Launcher",
    description: "Launched a ReGen Civics crowd-pooling campaign",
    tier: "silver",
    icon: "🚀",
    ringColor: "#c084fc",
    ringGradient: "linear-gradient(135deg, #c084fc, #e9d5ff, #c084fc)",
  },
  // Add more badge defs here as the system grows
];

export const BADGE_DEF_MAP: Record<string, BadgeDef> = Object.fromEntries(
  BADGE_DEFS.map(b => [b.id, b])
);
```

#### 2. Visual Badge Ring on Profile Picture

The profile picture avatar should show a glowing ring when the user has earned any badge. The ring color/gradient corresponds to the highest-tier badge earned.

**Tier priority (for ring display):** platinum > gold > silver > bronze

**Implementation: `<BadgeRingAvatar>` component**

```tsx
// components/BadgeRingAvatar.tsx
// Wraps any avatar image with a CSS ring based on the user's highest badge tier
// Props: avatarUrl, displayName, badges: string[], size?: number

export function BadgeRingAvatar({ avatarUrl, displayName, badges, size = 48 }: Props) {
  const highestBadge = getHighestBadge(badges); // utility: sorts by tier priority
  const ring = highestBadge ? BADGE_DEF_MAP[highestBadge] : null;

  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{
        padding: ring ? 3 : 0,
        background: ring?.ringGradient ?? "transparent",
        boxShadow: ring ? `0 0 12px ${ring.ringColor}60` : "none",
        width: size + (ring ? 6 : 0),
        height: size + (ring ? 6 : 0),
      }}
    >
      <img
        src={avatarUrl ?? "/default-avatar.png"}
        alt={displayName ?? "Player"}
        className="rounded-full w-full h-full object-cover"
      />
    </div>
  );
}
```

This component can be used anywhere an avatar is shown:
- Profile card header
- Forum post author avatars
- Forum comment/reply author avatars
- Player listings / map popups

#### 3. Auto-Award Logic: Welcome Aboard Badge

When a quest is marked complete (the mutation that writes to `questsCompleted`), check if all 10 Welcome Aboard quest IDs are now present. If yes, add `"welcome_aboard"` to the `badges` JSON array.

Add a server-side helper (in `routers.ts` or `db.ts`):

```ts
async function maybeAwardWelcomeAboardBadge(userId: number) {
  const profile = await db.getPlayerProfile(userId);
  const completed: string[] = JSON.parse(profile.questsCompleted ?? "[]");
  const allDone = WELCOME_ABOARD_IDS.every(id => completed.includes(id));
  if (!allDone) return;

  const badges: string[] = JSON.parse(profile.badges ?? "[]");
  if (badges.includes("welcome_aboard")) return; // already awarded

  badges.push("welcome_aboard");
  await db.updatePlayerProfile(userId, { badges: JSON.stringify(badges) });
}
```

Call this at the end of the `quests.complete` mutation (wherever quest completion is written).

#### 4. Badge Display in Forum

Forum post/reply author rows currently show an avatar + name. Replace the plain `<img>` avatar with `<BadgeRingAvatar>` and pass the author's badge array.

This requires the forum queries to include `badges` in the author data they return. Check `server/db.ts` forum query functions -- if they already JOIN `playerProfiles`, add `badges` to the SELECT. If not, add a lightweight `badges` field to the forum author object.

Forum badge display should also show a small badge chip below the author name for their top badge (e.g. "🌿 Welcome Aboard") -- keeps the visual language consistent with the profile card.

#### 5. Badges in Contributions Tab

Add a "Badges Earned" section near the top of the Contributions tab (after the token stats row, before the calculator links). Show full badge cards -- not just chips -- with the badge icon, name, tier, and date awarded (if we store `badgeAwardedAt` -- see below).

**Storing award date:** Optionally store badge awards as a separate JSON structure: `[{ id: "welcome_aboard", awardedAt: "2026-03-15T..." }]` instead of just an ID array. This allows "Earned March 2026" display. Worth doing from the start since migrating it later is annoying.

If this adds complexity, skip the date for now and just show the badge grid.

#### 6. Badge Image Asset

Generate a small badge SVG/PNG for "Welcome Aboard" that can be shown as a standalone image (for share panels, emails, etc.). A circular badge design with:
- Outer ring: gold gradient (#d4a574 → #f0c070)
- Center: 🌿 icon or a phoenix/seed graphic
- Text: "Welcome Aboard" in small caps
- Background: dark forest green (#1a472a)

Store in `public/badges/welcome-aboard.svg`. Future badges follow the same structure.

### Files to Change / Create

| File | Change |
|------|--------|
| `client/src/const/badges.ts` (new) | Shared badge definitions constant |
| `client/src/components/BadgeRingAvatar.tsx` (new) | Avatar with badge ring wrapper |
| `server/routers.ts` | `maybeAwardWelcomeAboardBadge` helper + call in quest complete mutation |
| `server/db.ts` | Add `badges` to forum author data in post/reply queries |
| `client/src/pages/PlayerProfile.tsx` | Replace plain avatar with `<BadgeRingAvatar>`; update Contributions tab badge section |
| `client/src/components/ForumPost.tsx` (or equivalent) | Replace avatar img with `<BadgeRingAvatar>` |
| `client/src/components/ForumReply.tsx` (or equivalent) | Replace avatar img with `<BadgeRingAvatar>` |
| `public/badges/welcome-aboard.svg` (new) | Badge image asset |

### Priority

High -- badges are a core game mechanic and visible on launch. The Welcome Aboard badge is the first real reward for completing the onboarding quests and should be live before public launch.

---

## Fix 8: Contributions Tab — Replace Manual Log Form with Calculator Hub + Token Stats

### Goal

The Contributions tab at `/profile?tab=contributions` currently shows:
1. A blockchain callout (already added by Fix 3b)
2. A "Log a Contribution" form (manual self-report)
3. A grouped list of logged contributions by 8 forms of capital

Replace the manual log form as the primary content with a **Calculator Hub**: links to both calculators, thumbnails of the user's saved calculation results, quick re-download, and live $ReGen + RGVoice token stats pulled from existing profile fields. The manual log form moves to a secondary/collapsed section.

### Current State

- `playerProfiles.rvoiceBalance` and `rgenBalance` are already in the schema (cached from blockchain)
- The **Contribution Calculator** lives at `/calculator` -- users can save profiles via `trpc.savedContributions` -- these saved profiles currently show in the **Submissions tab** (not Contributions tab) under "Saved Contribution Profiles"
- The **Crowd Pooling Tool** lives at `/crowd-pooling` -- no saved results linked to user profile yet
- `ContributionsTab` component: has the manual log form with full CRUD, grouped by capital type
- The manual log form is not broken -- it just shouldn't be the hero

### What to Build

#### 1. Token Stats Row

At the very top of the Contributions tab, show the user's current token balances (read from profile data passed as props):

```
┌────────────────────────────────────────────────────────┐
│  💚 $ReGen Balance          🗳 RGVoice                  │
│     1,240 RGEN                  0.8 RGVoice            │
│     [How are these earned?]     [Learn about RGVoice]  │
└────────────────────────────────────────────────────────┘
```

Data source: `profile.rgenBalance` and `profile.rvoiceBalance` (already in schema, cached from blockchain). Show "--" if null/0 and the account isn't linked.

Style: two-column card with green and amber accent colors. "How are these earned?" links to `/game` or a relevant explainer. "Last synced: X" in small text if `lastTokenSync` is populated.

#### 2. Calculator Hub Section

Below the token stats, a new **"Your Calculations"** section with two calculator entry points and the user's saved results:

```
┌─ Your Calculations ─────────────────────────────────────┐
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │  🧮 Contribution      │  │  🌊 Crowd Pooling         │ │
│  │     Calculator        │  │      Tool                │ │
│  │                       │  │                          │ │
│  │  Estimate your 8      │  │  Pool capital from       │ │
│  │  forms of capital     │  │  your community for      │ │
│  │  contribution value   │  │  your land project       │ │
│  │                       │  │                          │ │
│  │  [Open Calculator →]  │  │  [Open Tool →]           │ │
│  └──────────────────────┘  └──────────────────────────┘ │
│                                                          │
│  ── Saved Results ───────────────────────────────────── │
│                                                          │
│  [thumbnail card]  [thumbnail card]  [+ New]            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Calculator entry cards:** Static cards linking to `/calculator` and `/crowd-pooling`. Brand them with the existing page header colors (dark green + icon). These are always shown even if the user has no saved results.

**Saved Results (from `trpc.savedContributions.list`):**

Show the saved results grid in **both** the Contributions tab **and** the Submissions tab -- do not remove it from Submissions, just also add it to Contributions. Users should be able to find their saved calculations from either place. Each saved result shows as a thumbnail card with:
- Profile name (e.g. "La Tierra 2026")
- Project name if set
- Last updated date
- Summary line of the result if available (e.g. "Est. $4,200 / 8 capital types")
- Two actions: **[Edit]** → `/calculator?savedId={id}` and **[Download PDF]** → generate/download a PDF summary of the calculation

**Download PDF:** The calculator already has a "Print / Save as PDF" pattern likely. If not, wire a simple `window.print()` on a styled printable view, or generate via the server using the saved data. Add this as a spec detail -- the actual PDF generation can be a sub-task. For now, the button can link to `/calculator?savedId={id}&print=1` which triggers the print view.

#### 3. Demote Manual Log Form

Keep the manual contribution log but move it below the calculator hub, collapsed by default. Rename the section header to "Self-Reported Contributions" and add a note: "Contributions logged here are manually verified by admins. For quantified contributions, use the calculator above."

The "Log a Contribution" button that was the primary CTA becomes a small secondary link at the bottom of the section header.

**New layout order:**
1. Blockchain callout (already exists from Fix 3b)
2. Token stats row (new)
3. Calculator hub + saved results (new)
4. Self-Reported Contributions -- collapsed by default, expandable (existing form, moved down)
5. Badges Earned (from Fix 7, if implemented first)

#### 4. Props Update for ContributionsTab

`ContributionsTab` currently takes `{ walletAddress, onLinkWallet }`. Extend:

```tsx
function ContributionsTab({
  walletAddress,
  onLinkWallet,
  rgenBalance,
  rvoiceBalance,
  lastTokenSync,
}: {
  walletAddress?: string | null;
  onLinkWallet?: () => void;
  rgenBalance?: number;
  rvoiceBalance?: number;
  lastTokenSync?: string | null;
})
```

Pass these from the parent `PlayerProfile` page which already has the profile data.

### Files to Change

| File | Change |
|------|--------|
| `client/src/pages/PlayerProfile.tsx` | `ContributionsTab`: add token stats row, calculator hub, show `savedContributions` list here (keep it in SubmissionsTab too), demote manual log form |
| `client/src/pages/PlayerProfile.tsx` | `SubmissionsTab`: keep saved results grid here -- do not remove; just also render it in ContributionsTab |
| `client/src/pages/PlayerProfile.tsx` | Pass `rgenBalance`, `rvoiceBalance`, `lastTokenSync` to `ContributionsTab` from profile data |
| `client/src/pages/Calculator.tsx` | Add "Your Saved Calculations" grid below the calculator form -- same saved results cards, same [Edit] / [Download PDF] actions |
| `client/src/pages/CrowdPooling.tsx` | Add "Your Saved Calculations" grid below the crowd pooling tool -- shows any saved crowd pooling results linked to the user's profile |

### Priority

Medium-high -- the Contributions tab is a primary profile surface and the current "Log a Contribution" form as hero creates wrong expectations. The calculator hub and token stats give users a meaningful home for their regenerative finance activity.

---

## Fix 9: Crowd Pooling Page -- Add Explanatory Header

### Goal

The `/crowd-pooling` page is a tool for individuals to calculate their crowd pooling contributions. The `/crowd-pooling-projects` page shows active campaigns from land projects. Currently there is no copy on either page explaining this distinction, so users who land on the wrong page are confused.

### Current State

`CrowdPooling.tsx` renders a header "Crowd Pooling Tool" and then immediately drops into the `<CrowdPoolingTool>` component. There is no description of what crowd pooling is, no mention of the Projects page, and no navigation between the two pages.

`CrowdPoolingProjects.tsx` shows project campaign cards but similarly has no explanation of how it relates to the calculator tool.

### What to Build

**On `/crowd-pooling` (the individual tool page):**

Add a brief explanatory block below the page header and above the tool component:

```
Crowd Pooling lets you contribute directly to land projects at a scale that works for you.
Set your budget, pick your projects, and see exactly how your contribution compounds with others.

Looking to browse active campaigns? → [View Land Project Campaigns →]
```

The link should point to `/crowd-pooling-projects`.

**On `/crowd-pooling-projects` (the project campaigns page):**

Add a reciprocal line near the top:

```
These are land projects currently raising through crowd pooling.
Want to run the numbers on your contribution? → [Open the Crowd Pooling Calculator →]
```

The link should point to `/crowd-pooling`.

Both blocks should use the same muted card/callout style used elsewhere on the site (light green background, soft border).

### Files to Change

| File | Change |
|------|--------|
| `client/src/pages/CrowdPooling.tsx` | Add explanatory paragraph + link to `/crowd-pooling-projects` below page header |
| `client/src/pages/CrowdPoolingProjects.tsx` | Add reciprocal line + link to `/crowd-pooling` below page header |

### Priority

Low -- cosmetic but reduces confusion for new visitors.

---

## Fix 10: Profile Quests Tab -- Show Completed Quests at Top

### Goal

On `/profile?tab=quests`, completed quests should appear at the top of the tab so returning users immediately see their progress. Currently the Welcome Aboard quest cards always render first, pushing completed quests below the fold.

### Current State

In `PlayerProfile.tsx`, the `QuestsTab` function renders `<WelcomeAboardQuests>` first, then the legacy completed quests list below it. A player who has completed quests has to scroll past the entire Welcome Aboard section to see their achievement history.

### What to Build

Reorder the Quests tab layout:

1. **Completed Quests** (if any exist) -- show at the top with trophy icons and completion dates, same as current display
2. **Welcome Aboard Quests** -- show below completed quests, or hidden entirely if all have been completed

If the player has zero completed quests, show Welcome Aboard quests first (current behavior) since that is the onboarding entry point.

Logic sketch:
```tsx
const hasCompleted = completedQuests.length > 0;

return (
  <div>
    {hasCompleted && <CompletedQuestsList quests={completedQuests} />}
    {!allWelcomeQuestsDone && <WelcomeAboardQuests ... />}
    {!hasCompleted && <WelcomeAboardQuests ... />}
  </div>
);
```

The transition should be smooth -- no jarring layout jumps.

### Files to Change

| File | Change |
|------|--------|
| `client/src/pages/PlayerProfile.tsx` | Reorder `QuestsTab` render: completed quests first, Welcome Aboard second; hide Welcome Aboard if all done |

### Priority

Medium -- affects returning user experience directly.

---

## Fix 11: Apply Page -- Readability Pass 3

### Goal

The `/apply` application form still has text that is too light to read comfortably, particularly on form labels, helper text, and section descriptions. This is the third pass -- earlier passes fixed the most egregious issues but some elements remain below accessible contrast ratios.

### Current State

`Apply.tsx` uses `text-[#1a472a]/60` for helper/description text and `text-[#1a472a]/85` for labels. On the light cream/parchment background these are too light -- the 60% opacity variant in particular fails WCAG AA contrast requirements. Section intro paragraphs also use muted green that blends into the background.

### What to Build

Audit all text color classes in `Apply.tsx` and replace:

- `text-[#1a472a]/60` → `text-[#1a472a]/80` (minimum for body/description text)
- `text-[#1a472a]/85` → `text-[#1a472a]` (full opacity for labels)
- Any `text-muted` Tailwind utility → check contrast against actual background and upgrade if needed
- Section intro text (the paragraphs that describe each section of the form) should be `text-[#1a472a]` at full opacity or close to it

Also check:
- Placeholder text in inputs -- should be `text-[#1a472a]/50` at minimum (intentionally lighter than labels, acceptable per WCAG for placeholders)
- Checkbox/radio label text -- full opacity
- Required asterisk color -- should be clearly visible (red or dark)

Do a full pass rather than spot-fixing; the goal is that any sighted user with average vision can read every piece of text without squinting.

### Files to Change

| File | Change |
|------|--------|
| `client/src/pages/Apply.tsx` | Replace all under-contrast text color classes with accessible equivalents |

### Priority

Medium-high -- accessibility and conversion impact on the primary action page.

---

## Fix 12: Page Load Glitch -- Pre-Render All Elements Before Show

### Goal

On some pages, content visibly loads in sequence -- header appears, then content, then sidebar -- creating an ugly flash of partial layout. Pre-render all visible elements before painting the page.

### Current State

`ImagePreloader.tsx` exists but may not be wired to block page render. Individual page components likely have their own loading states that render progressively rather than holding until all critical content is ready.

The symptom: navigating to a page shows a brief flash of unstyled/partial content before the full layout appears.

### What to Build

Two-part fix:

**1. Suspense boundary with skeleton screens**

For each major page, wrap the content section in a `<Suspense>` boundary with a skeleton screen that matches the approximate shape of the content. This prevents the "blank + flash" pattern. The skeleton should be a loading shimmer (animated gradient from left to right) over placeholder shapes.

A shared `<PageSkeleton>` component can be used for standard page layouts; specialized skeletons for complex pages like `/map` and `/community`.

**2. CSS `visibility: hidden` until hydrated**

For the initial server/static render, add a brief `opacity-0` class that transitions to `opacity-100` after a `useEffect` fires. This ensures no partially-styled content flashes. The transition should be fast (150ms) so it doesn't feel sluggish:

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

return (
  <div className={cn("transition-opacity duration-150", mounted ? "opacity-100" : "opacity-0")}>
    {children}
  </div>
);
```

This pattern should live in a `<PageWrapper>` component wrapping all page content.

**3. Image preloading**

Verify `ImagePreloader.tsx` is called for above-the-fold hero images on key pages (Home, Community, Map). If not, add `<link rel="preload" as="image">` tags for the 2-3 most important above-fold images.

### Files to Change

| File | Change |
|------|--------|
| `client/src/components/PageWrapper.tsx` | Create new component with mounted opacity transition |
| `client/src/components/PageSkeleton.tsx` | Create shared skeleton shimmer component |
| `client/src/pages/*.tsx` | Wrap major page content in `<PageWrapper>` and `<Suspense fallback={<PageSkeleton />}>` |
| `client/src/components/ImagePreloader.tsx` | Verify wired to key pages; add preload links for above-fold images |

### Priority

Medium -- visual quality issue that affects first impressions.

---

## Fix 13: Newsletter Re-Prompt -- Don't Ask Again If Already Subscribed

### Goal

Users who have already given their email through the newsletter form are shown the subscribe prompt again on every page load and every exit intent. Store the subscription state in localStorage and suppress the prompt once it has been submitted.

### Current State

`NewsletterSignupInline` has a local `subscribed` boolean state, but this resets on every unmount. There is no localStorage check on mount. `ExitIntentCapture.tsx` has its own newsletter mutation and also has no deduplication logic.

Result: a user who subscribes on page 1 sees the exit-intent popup again on page 2.

### What to Build

**In `NewsletterSignupInline`:**

On mount, check `localStorage.getItem('newsletter_subscribed')`. If `'true'`, skip rendering the subscribe form entirely (or render a muted "You're subscribed" confirmation). On successful `subscribeMutation`, set `localStorage.setItem('newsletter_subscribed', 'true')`.

```tsx
const [alreadySubscribed] = useState(
  () => localStorage.getItem('newsletter_subscribed') === 'true'
);

if (alreadySubscribed) return null; // or a small "You're subscribed ✓" line
```

**In `ExitIntentCapture.tsx`:**

Same check: if `localStorage.getItem('newsletter_subscribed') === 'true'`, do not show the exit intent modal at all. Set the same key on subscription success.

**Shared helper:**

Extract into a small util:
```ts
// utils/newsletter.ts
export const isNewsletterSubscribed = () =>
  typeof window !== 'undefined' &&
  localStorage.getItem('newsletter_subscribed') === 'true';

export const markNewsletterSubscribed = () =>
  localStorage.setItem('newsletter_subscribed', 'true');
```

Both components import from this util.

### Files to Change

| File | Change |
|------|--------|
| `client/src/components/NewsletterSignupInline.tsx` | Check `isNewsletterSubscribed()` on mount; call `markNewsletterSubscribed()` on success |
| `client/src/components/ExitIntentCapture.tsx` | Check `isNewsletterSubscribed()` on mount; suppress modal if true; call `markNewsletterSubscribed()` on success |
| `client/src/utils/newsletter.ts` | Create new util file with `isNewsletterSubscribed` and `markNewsletterSubscribed` helpers |

### Priority

Medium -- reduces friction and annoyance for engaged users.

---

## Fix 14: Quest Card Forum Links + Social Sharing Improvement

### Goal

Quest card forum links are unreliable (some broken), and the sharing flow needs a primary "Create Social Post" CTA that guides users to choose a platform and generate pre-filled copy.

### Current State

`WelcomeAboardQuests.tsx` renders a link using `href={quest.forumUrl}` with text "Go to forum post". Some `forumUrl` values point to forum threads that may not have been seeded correctly. There is no sharing functionality -- no button to share a completed quest to social media or generate a celebration post.

### What to Build

**1. Fix broken forum links**

Audit all 10 Welcome Aboard quest `forumUrl` values in the seed data or static config. Each should resolve to an active forum thread. If a thread doesn't exist, the link should be hidden (not shown as a broken link). Add a fallback:

```tsx
{quest.forumUrl && (
  <a href={quest.forumUrl} target="_blank" rel="noopener noreferrer">
    Join the discussion →
  </a>
)}
```

A null/empty `forumUrl` simply hides the link rather than rendering a dead one.

**2. Add "Share Your Progress" button**

After a quest is marked complete, show a prominent "Share Your Progress" button on the quest card. This opens a modal or sheet with:

- **Platform picker:** Twitter/X, LinkedIn, Instagram (copy), or "Copy Text"
- **Pre-filled post copy** tailored to the quest title and platform character limits
- Example (Twitter): "Just completed '[Quest Name]' on @ReGenCivics -- healing the land, one action at a time. 🌱 #RegenRenaissance regencivics.earth"
- **Copy button** to copy post text to clipboard
- Optional: pre-filled hashtags per platform

The modal should feel celebratory -- green background, confetti emoji, warm language.

**3. Platform-specific copy templates**

Store templates in a static config per quest (or use a generic template with quest name interpolation). The goal is minimal friction: user clicks Share, sees pre-written copy, clicks "Copy to Clipboard", pastes into their platform.

### Files to Change

| File | Change |
|------|--------|
| `client/src/components/WelcomeAboardQuests.tsx` | Guard `forumUrl` link with null check; add "Share Your Progress" button on completed quests |
| `client/src/components/QuestShareModal.tsx` | Create new modal: platform picker, pre-filled copy, clipboard button |
| Quest seed config / static data | Audit and fix `forumUrl` values for all 10 quests |

### Priority

Medium -- sharing drives organic growth; broken links damage trust.

---

## Fix 15: Avatar URL Input -- Add Tooltip / Help Text

### Goal

The avatar/profile picture URL input in the profile editor has no guidance on what format is expected, where to get a URL, or what happens if the URL is invalid. Add a tooltip or helper text that explains the field.

### Current State

The profile editor in `PlayerProfile.tsx` (or a child component like `ProfileEditModal.tsx`) has a text input for the avatar URL. There is no placeholder text, no tooltip, and no validation feedback beyond a silent failure if the URL is unreachable.

### What to Build

**Tooltip / Helper text:**

Below the avatar URL input, add a small helper line:
"Paste a direct link to an image (JPG, PNG, WebP). Tip: upload to Imgur, Google Photos (shared), or your own host and paste the direct image URL."

If a tooltip is preferred over inline text, use an info icon (ℹ) next to the field label that shows the helper text on hover/tap.

**URL preview:**

When the user types or pastes a URL, show a small live preview of the image (a 40x40 thumbnail next to the input). If the image fails to load, show a placeholder with the text "Image not found -- check the URL."

```tsx
<img
  src={avatarUrlValue}
  alt="Preview"
  className="w-10 h-10 rounded-full object-cover"
  onError={(e) => { e.currentTarget.src = '/placeholder-avatar.svg'; }}
/>
```

**Validation:**

On blur, check if the URL starts with `https://`. If not, show a warning: "Use a secure https:// link for best compatibility."

### Files to Change

| File | Change |
|------|--------|
| `client/src/pages/PlayerProfile.tsx` or `client/src/components/ProfileEditModal.tsx` | Add helper text, live preview thumbnail, and URL validation to avatar URL input |

### Priority

Low -- quality of life improvement for users setting up their profile.

---

## Fix 16: Tao Te Ching Spinner -- Expand to ~72 Quotes

### Goal

`TaoSpinner.tsx` currently rotates through 24 quotes. Expand the quote library to approximately 72 entries, all aligned with regeneration, healing, spiritual development, and earth stewardship. The existing quotes can be kept; new quotes should match the existing tone and translation style.

### Current State

`TaoSpinner.tsx` has a `taoQuotes` array of 24 quotes. Each quote is a string. The component rotates through them every 4 seconds with a fade transition. The quotes are from the Tao Te Ching and similar wisdom traditions.

### What to Build

Add approximately 48 new quotes to the `taoQuotes` array, bringing the total to ~72. The new quotes should draw from:

- The Tao Te Ching (additional chapters not yet represented)
- Rumi (earth, love, healing themes)
- Indigenous wisdom traditions (land, reciprocity, seven-generation thinking)
- Robin Wall Kimmerer (*Braiding Sweetgrass*)
- Thich Nhat Hanh (interbeing, healing)
- Joanna Macy (the Work That Reconnects)
- Short proverbs from African, Celtic, and Andean traditions about land and community

Tone guidelines:
- Quiet, contemplative, not preachy
- About 1-3 sentences per quote
- No quote should be longer than ~80 words
- Lean toward earth, growth, reciprocity, patience, healing, and emergence as themes

Sample additions to illustrate tone:
- "The earth does not belong to us -- we belong to the earth." (Chief Seattle, paraphrased)
- "In the sweetness of friendship let there be laughter, and sharing of pleasures. For in the dew of little things the heart finds its morning and is refreshed." (Kahlil Gibran)
- "There is a vitality, a life force, an energy, a quickening that is translated through you into action." (Martha Graham)
- "The quieter you become, the more you are able to hear." (Rumi)
- "We are the ones we have been waiting for." (Hopi Elders)

The full list of 48 new quotes should be written out in the spec or directly added to the file.

### Files to Change

| File | Change |
|------|--------|
| `client/src/components/TaoSpinner.tsx` | Expand `taoQuotes` array from 24 to ~72 entries |

### Priority

Low -- enriches the meditative quality of page transitions; no functional impact.

---

## Fix 17: Admin Roles Tab -- Fix Crash / Infinite Load

### Goal

The Roles tab in `/admin` crashes the page or gets stuck in infinite loading. Diagnose and fix the root cause.

### Current State

`RoleSubmissionsView.tsx` calls `trpc.generalInquiries.list.useQuery()` to fetch role submissions. The `generalInquiries.list` procedure in `routers.ts` is a `protectedProcedure` with an explicit admin role check (`if (ctx.user.role !== "admin") throw FORBIDDEN`). The procedure returns raw rows from the `generalInquiries` table.

Likely crash causes:

1. **`formData` field mismatch**: `RoleSubmissionsView` maps `inquiry.formData` but the `generalInquiries` schema stores fields flat (not in a `formData` sub-object). If the component tries to destructure `inquiry.formData.roleArchetypes` and `formData` is `undefined`, it throws.

2. **`JSON.parse` on non-JSON**: `roleArchetypes` is likely stored as a JSON string in MySQL. The component may try to use it as an array directly, causing a silent failure or crash.

3. **`formatDistanceToNow` date crash**: If `inquiry.createdAt` comes back as a MySQL datetime string like `"2025-11-01 14:22:00"` rather than a JS `Date`, `new Date("2025-11-01 14:22:00")` may produce `Invalid Date` in some environments, causing `formatDistanceToNow` to throw.

### What to Build

**1. Read `RoleSubmissionsView.tsx` in full** and map every field it accesses to the actual `generalInquiries` schema columns. Correct any mismatched field names.

**2. Add null-safe access:**
```tsx
const roleArchetypes = (() => {
  try {
    return JSON.parse(inquiry.roleArchetypes ?? '[]');
  } catch {
    return [];
  }
})();
```

**3. Safe date parsing:**
```tsx
const createdAt = inquiry.createdAt
  ? formatDistanceToNow(new Date(inquiry.createdAt.replace(' ', 'T')))
  : 'unknown';
```

**4. Add error boundary** around `<RoleSubmissionsView>` in `Admin.tsx` so a crash in this tab doesn't kill the entire admin page:
```tsx
<ErrorBoundary fallback={<div>Failed to load role submissions.</div>}>
  <RoleSubmissionsView />
</ErrorBoundary>
```

**5. Verify the `generalInquiries` schema** in `drizzle/schema.ts` and confirm the column names match what `RoleSubmissionsView` expects. Produce a mapping table in this fix spec once the audit is done.

### Files to Change

| File | Change |
|------|--------|
| `client/src/components/RoleSubmissionsView.tsx` | Fix field name mappings; add null-safe JSON.parse; safe date parsing |
| `client/src/pages/Admin.tsx` | Wrap `<RoleSubmissionsView>` in an error boundary |
| `server/drizzle/schema.ts` | Reference only -- confirm column names for audit |

### Priority

High -- admin Roles tab is broken and admins need it to process role applications.

---

## Fix 18: Admin Banner System -- Multi-Page Targeting

### Goal

The current banner system supports only a single global `"main-banner"` key. Expand it so admins can set banners targeting specific pages (Home, Community, Map, Opportunity, Apply, etc.) and show multiple banners per page if needed.

### Current State

`Admin.tsx` at line 4735-4737 renders a single `<AdminBannerEditor bannerKey="main-banner" title="Main Banner" />`. `AdminBannerEditor.tsx` takes `{ bannerKey: string; title: string }` props and calls `trpc.banners.getByKey` / `trpc.banners.upsert` with that key.

The banners database table stores `(key, title, content, isActive)`. Any number of banner keys can exist -- the limitation is only in the UI, which only exposes one.

### What to Build

**1. Expand the Banners tab in `Admin.tsx`:**

Replace the single `<AdminBannerEditor>` with a tabbed or accordion list of banner editors, one per page target:

```tsx
const BANNER_TARGETS = [
  { key: 'main-banner', label: 'Global (all pages)' },
  { key: 'home-banner', label: 'Home' },
  { key: 'community-banner', label: 'Community' },
  { key: 'map-banner', label: 'Map' },
  { key: 'opportunity-banner', label: 'Opportunity / Investor' },
  { key: 'apply-banner', label: 'Apply' },
  { key: 'forum-banner', label: 'Forum' },
];

{BANNER_TARGETS.map(({ key, label }) => (
  <AdminBannerEditor key={key} bannerKey={key} title={label} />
))}
```

Use an accordion so the page isn't overwhelmed -- each banner section collapses/expands.

**2. Update banner display on the frontend:**

Each page's banner component (wherever the current banner is fetched and displayed) should fetch both the `main-banner` key AND its page-specific key, and display either or both if active.

Example in `Home.tsx`:
```tsx
const { data: mainBanner } = trpc.banners.getByKey.useQuery({ key: 'main-banner' });
const { data: homeBanner } = trpc.banners.getByKey.useQuery({ key: 'home-banner' });
```

Show both if both are active, or just one if only one is active.

**3. Banner display component:**

If there isn't already a shared `<BannerDisplay>` component, create one that takes a `bannerKey` and handles the fetch + conditional render:

```tsx
function BannerDisplay({ bannerKey }: { bannerKey: string }) {
  const { data } = trpc.banners.getByKey.useQuery({ key: bannerKey });
  if (!data?.isActive || !data?.content) return null;
  return <div className="banner-strip">{data.content}</div>;
}
```

Pages call `<BannerDisplay bannerKey="main-banner" />` and `<BannerDisplay bannerKey="home-banner" />`.

### Files to Change

| File | Change |
|------|--------|
| `client/src/pages/Admin.tsx` | Replace single `AdminBannerEditor` with loop over `BANNER_TARGETS` list |
| `client/src/components/AdminBannerEditor.tsx` | Make accordion-friendly (collapsible, shows active status in header) |
| `client/src/components/BannerDisplay.tsx` | Create new shared display component |
| Page files that show banners | Add `<BannerDisplay bannerKey="{page}-banner" />` alongside global banner |

### Priority

Medium -- allows targeted messaging campaigns without overriding the global banner.

---

## Fix 19: Analytics Dashboard -- Fix Module Import Error

### Goal

The Analytics tab in `/admin` fails with "TypeError: Failed to fetch dynamically imported module" when the `AdminAnalytics` component is lazy-loaded. Fix the import so the analytics dashboard loads reliably.

### Current State

`Admin.tsx` line 73:
```ts
const AdminAnalyticsLazy = lazy(() =>
  import("@/components/AdminAnalytics").then(m => ({ default: m.AdminAnalytics }))
);
```

This lazy import fails with a module fetch error. The error likely means the built JS bundle for `AdminAnalytics` has a stale content-hash filename (`AdminAnalytics-CNcyQjyM.js`) that doesn't match the deployed build. This is a cache-busting issue in the build pipeline -- the import path resolves to a chunk that no longer exists.

### What to Build

**Option A (preferred): Convert to a static import**

If `AdminAnalytics` is only used in the admin area (which requires authentication), there's no user-facing performance reason to lazy-load it. Convert to a direct import:

```ts
// Remove the lazy import
import { AdminAnalytics } from "@/components/AdminAnalytics";
```

Replace the `<Suspense>` wrapper with direct rendering:
```tsx
<AdminAnalytics />
```

This eliminates the dynamic import and the cache-busting problem entirely.

**Option B: Fix the lazy import**

If keeping lazy loading is important for bundle size, ensure the Vite config chunks `AdminAnalytics` consistently so the hash doesn't change on unrelated rebuilds. Add it to a named chunk:

```ts
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'admin-analytics': ['./src/components/AdminAnalytics.tsx'],
      }
    }
  }
}
```

A named chunk (`admin-analytics.js`) is stable and won't get a new hash unless the file itself changes.

Option A is simpler and recommended unless bundle size is a documented concern.

### Files to Change

| File | Change |
|------|--------|
| `client/src/pages/Admin.tsx` | Convert `AdminAnalytics` from lazy import to static import; remove `<Suspense>` wrapper |
| `client/vite.config.ts` | (Option B only) Add `AdminAnalytics` to a stable named chunk |

### Priority

High -- the analytics dashboard is broken for all admins.

---

## Fix 20: Admin Moderation -- Add Password Gate

### Goal

`/admin/moderation` is currently protected only by `user.role !== 'admin'` (auth-level check). Add the same password gate pattern used by `/admin` so that even authenticated admins must enter the password "222" to access moderation controls.

### Current State

`AdminModeration.tsx` checks `user?.role !== 'admin'` at the top of the component and redirects if not admin. It does NOT use a `PasswordGate` component. By contrast, `Admin.tsx` wraps the `AdminDashboard` in a `PasswordGate` component that checks `localStorage.getItem("admin_authenticated")` against a known password.

The moderation panel includes moderator management (add/remove), bans, and reports -- sensitive actions that warrant the extra layer.

### What to Build

Add a `PasswordGate` to `AdminModeration.tsx` using the same pattern as `Admin.tsx`:

1. Import the `PasswordGate` component (or wherever it is defined in the codebase)
2. Set the password to `"222"` (or use a separate localStorage key like `"moderation_authenticated"` so it is independent from the admin password)
3. Wrap the entire moderation dashboard in the gate:

```tsx
const [authenticated, setAuthenticated] = useState(
  () => localStorage.getItem("moderation_authenticated") === "true"
);

if (!authenticated) {
  return (
    <PasswordGate
      password="222"
      storageKey="moderation_authenticated"
      onSuccess={() => setAuthenticated(true)}
    />
  );
}
```

If `PasswordGate` takes a `storageKey` prop already, use a distinct key for moderation vs. admin. If not, extend the component to accept one.

The gate UI should match the existing admin gate -- simple centered password form with a submit button.

### Files to Change

| File | Change |
|------|--------|
| `client/src/pages/AdminModeration.tsx` | Add `PasswordGate` wrapper with password `"222"` and storage key `"moderation_authenticated"` |
| `client/src/components/PasswordGate.tsx` | If needed, add `storageKey` prop to make it reusable across admin and moderation |

### Priority

Medium-high -- moderation controls should not be one auth check away from any admin.

---

## Fix 21: Admin Image Studio -- Add Copy URL Button

### Goal

After creating or replacing an image in the Admin Image Studio, the resulting public URL is shown as plain text with an external link icon. Add a "Copy URL" button that copies the URL to the clipboard and shows a brief visual confirmation.

### Current State

`AdminImageStudio.tsx` after a successful `applyMut.mutateAsync` call sets:
```ts
result = { publicUrl: string; replaced: number }
```

Line ~240 displays the `publicUrl` as:
```tsx
<a href={result.publicUrl} target="_blank">
  {result.publicUrl} <ExternalLink size={12} />
</a>
```

There is no copy-to-clipboard button. Users must manually select and copy the URL string.

### What to Build

Next to the URL display, add a copy button:

```tsx
const [copied, setCopied] = useState(false);

const handleCopy = () => {
  navigator.clipboard.writeText(result.publicUrl);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
};

<div className="flex items-center gap-2">
  <a href={result.publicUrl} target="_blank" className="text-sm truncate max-w-xs">
    {result.publicUrl}
  </a>
  <button onClick={handleCopy} className="btn btn-xs">
    {copied ? <Check size={12} /> : <Copy size={12} />}
    {copied ? 'Copied!' : 'Copy URL'}
  </button>
</div>
```

The button should switch from "Copy URL" to "Copied!" for 2 seconds after clicking. Use a checkmark icon after copy. The visual change provides confirmation without a toast.

### Files to Change

| File | Change |
|------|--------|
| `client/src/components/AdminImageStudio.tsx` | Add copy-to-clipboard button next to `result.publicUrl` display |

### Priority

Low -- workflow improvement for admins managing image assets.

---

## Fix 22: Forum Quest Post Comments -- Missing Seed Comments

### Goal

When the Welcome Aboard quest forum posts were seeded, the seed comments attached to each post did not come through. The posts exist in the forum but appear with zero replies, undermining the sense of a living community. Seed the intended comments for each post.

### Current State

The 10 Welcome Aboard quest forum threads exist at their `forumUrl` paths (e.g., `/community/quests-gameplay`, `/community/general`, `/community/land-projects`, etc.). The posts themselves were seeded, but the `forumReplies` / comments were not inserted alongside them -- or if a seed script ran, it may not have correctly associated the comment rows with the post IDs.

`welcomeAboardQuests.ts` defines `forumUrl` for each quest pointing to forum category paths (not individual post slugs). The seed comments described in `ReGenCivics_WelcomeAboard_Brief.md` include 2-3 starter replies per quest post, written in the voices of Rye and a few community archetype personas.

### What to Build

**1. Audit current forum posts**

Query the database for the 10 Welcome Aboard quest posts by title/slug. Confirm whether they have any associated reply rows in `forumReplies`.

**2. Write seed comment script**

Create a seed script (TypeScript, using `mysql2/promise` or the Drizzle ORM) that:
- Finds each Welcome Aboard quest post by slug or title
- Inserts 2-3 seed replies per post
- Assigns them to the `rye` user ID (or a placeholder system user ID)
- Sets `createdAt` to a plausible past date (within the past 30 days)

Seed comment content should come from `ReGenCivics_WelcomeAboard_Brief.md` -- read that file before writing the script to get the exact comment text per quest.

**3. Verify forum URL accuracy**

The `forumUrl` values in `welcomeAboardQuests.ts` currently point to category paths (`/community/quests-gameplay`, etc.) not individual post URLs. If the posts have specific slugs (e.g., `/community/quests-gameplay/welcome-aboard-play-the-game`), update `forumUrl` in the data file to point to the exact post rather than the category.

Verify each URL resolves to an active post before updating.

### Files to Change

| File | Change |
|------|--------|
| `scripts/seed-quest-comments.ts` | Create new seed script for Welcome Aboard quest post comments |
| `client/src/data/welcomeAboardQuests.ts` | Update `forumUrl` values to point to individual post URLs (not category pages) |
| `ReGenCivics_WelcomeAboard_Brief.md` | Reference only -- use for comment content |

### Priority

Medium -- empty forum threads make the community feel dead to new visitors.

---

## Fix 23: Site Tour -- Verify Rendering and Add Contextual Triggers

### Goal

`SiteTour.tsx` exists as an AI-powered guided tour component with a "Show Me Around" button, but it may not be rendering on all pages (or may only be on certain pages). Verify it is wired globally in `App.tsx` and add contextual triggers that surface the tour on pages where new visitors are most likely to land.

### Current State

`SiteTour.tsx` exports a `SiteTour` function component at line 45 with `PAGE_LABELS` context mapping. The component is implemented. However, a search of `App.tsx` returns no matches for `SiteTour`, suggesting it may not be mounted globally.

If `SiteTour` is only rendered on specific page files rather than at the app root level, it will only appear on those pages.

### What to Build

**1. Mount globally in `App.tsx`**

Add `<SiteTour />` to `App.tsx` as a persistent overlay component, similar to how toast notifications or modal portals are mounted. It should appear on all authenticated pages.

```tsx
// App.tsx (inside the router/auth wrapper, but outside page routes)
<SiteTour />
```

**2. Contextual surface triggers**

In addition to the floating "Show Me Around" button, add inline tour trigger links on pages where new users land:

- **Home page**: After the hero section, add a subtle "Not sure where to start? [Take a quick tour →]" link
- **Community page**: Below the category list, "New here? [Let us show you around →]"
- **Profile page** (on first visit): Auto-open the tour or surface a "Get oriented" prompt

Each trigger calls the same `SiteTour` -- it should expose a way to open the tour programmatically (`openTour()` from a context or event).

**3. Page-specific context**

`SiteTour` already has `PAGE_LABELS`. Ensure it correctly identifies the current page and primes the AI context with that page label so the tour guidance is relevant to where the user is.

**4. Dismiss and remember**

Add a "Don't show this again" option. Store in `localStorage.setItem('tour_dismissed', 'true')`. Hide the floating button (or show it minimized) if dismissed.

### Files to Change

| File | Change |
|------|--------|
| `client/src/App.tsx` | Add `<SiteTour />` as a global overlay component |
| `client/src/components/SiteTour.tsx` | Expose `openTour()` function via context or event; add dismiss with localStorage persistence |
| `client/src/pages/Home.tsx` | Add inline tour trigger link below hero |
| `client/src/pages/Community.tsx` | Add inline tour trigger below category list |

### Priority

Medium -- the tour exists but isn't being surfaced. Getting it in front of new visitors is high value for onboarding.

---

## Fix 24: Investor Form Gating -- Skip Re-Entry If Already Submitted

### Goal

`/opportunity` currently requires users to have gone through `/investor` (the form) to gain access. Users who have already submitted the form and return to `/opportunity` should not be forced to re-fill or re-navigate through the investor form. The localStorage tokens set on form submission should be honored on repeat visits.

### Current State

`Opportunity.tsx` at line 285-298 checks:
```ts
const isVerified =
  sessionStorage.getItem('investor_verified') === 'true' ||
  localStorage.getItem('investor_verified') === 'true';
if (!isVerified) {
  setLocation('/investor');
}
```

`InvestorForm.tsx` on success at line 182-183 sets:
```ts
localStorage.setItem('investor_email', formData.email);
localStorage.setItem('investor_name', formData.fullName);
```

The problem: `InvestorForm.tsx` sets `investor_email` and `investor_name` on success, but `Opportunity.tsx` checks for `investor_verified`. Unless `InvestorForm.tsx` also sets `investor_verified`, the gate will redirect every repeat visitor back to the form.

Additionally, `sessionStorage` is wiped on tab close, so a user who closes and reopens the browser will hit the gate again even if `investor_verified` was set in sessionStorage.

### What to Build

**1. Fix the key mismatch**

`InvestorForm.tsx` on success should also set:
```ts
localStorage.setItem('investor_verified', 'true');
```

This ensures the `Opportunity.tsx` check passes on return visits.

**2. Persist to localStorage (not just sessionStorage)**

`Opportunity.tsx` should check `localStorage` first (already does), but confirm the `investor_verified` key is being written there (not just `sessionStorage`). If `InvestorForm.tsx` is not setting this key, add it.

**3. Pre-fill the investor form on return**

If the user navigates back to `/investor` (e.g., via direct link), check `localStorage.getItem('investor_email')`. If present, pre-fill the form fields and show a note: "Welcome back, [name]. Your information is pre-filled from your last visit."

```tsx
const savedEmail = localStorage.getItem('investor_email');
const savedName = localStorage.getItem('investor_name');

const [formData, setFormData] = useState<InvestorFormData>({
  ...initialFormData,
  email: savedEmail ?? '',
  fullName: savedName ?? '',
});
```

Show a small banner: "We've pre-filled your details from your last visit. You can update them before resubmitting."

### Files to Change

| File | Change |
|------|--------|
| `client/src/pages/InvestorForm.tsx` | Add `localStorage.setItem('investor_verified', 'true')` on submit success; pre-fill form if saved data exists |
| `client/src/pages/Opportunity.tsx` | Confirm it reads `localStorage.getItem('investor_verified')` correctly; no changes needed if key fix above is applied |

### Priority

Medium-high -- causes frustration for returning investors who have to re-fill the form.

---

## Fix 25: Map Page -- Rename Button, Add Forum Link, Fix Pre-Check

### Goal

The `/map` page globe cards have a "Live in Community" button that links to `/connect`. Three changes: (1) rename to "Apply", (2) add a "Forum" button alongside it, (3) investigate why the project pre-selection checkbox in `/connect` may not visually reflect the URL param pre-selection, (4) add a "Land Projects" section to the community forum.

### Current State

`GlobeMap.tsx` `getApplyUrl()` at line 493-503 returns `/connect?path=live&project={id}` for land projects. The button text at line 650 is "Live in Community".

`Connect.tsx` at lines 283-291 reads the `project` URL param and calls `setSelectedProjects([matchedProject.id])`. The checkbox at line 800 is wired to `selectedProjects.includes(project.id)`. The pre-selection should work in theory, but `handlePathSelect(pathParam)` (called at line 295-298) may internally reset `selectedProjects` or trigger a re-render that clears the pre-selection.

The forum has no dedicated "Land Projects" category visible on the community page, though `/community/land-projects` is used as a `forumUrl` in quest data.

### What to Build

**1. Rename "Live in Community" to "Apply"**

In `GlobeMap.tsx`, change line 650:
```tsx
// Before:
{entity.type === "organization" ? "Work with ReGens" : "Live in Community"}
// After:
{entity.type === "organization" ? "Work with ReGens" : "Apply"}
```

**2. Add "Forum" button on land project cards**

Each land project entity card should have a secondary "Forum" button that links to `/community/land-projects` (the land projects forum category, filtered or threaded for that project if possible):

```tsx
{entity.type === "land_project" && (
  <a
    href={`/community/land-projects`}
    className="btn btn-sm btn-outline"
    target="_self"
  >
    Forum
  </a>
)}
```

If the forum supports project-specific tags or threads, link to `/community/land-projects?project=${entity.id}` instead.

**3. Fix project pre-selection in `/connect`**

In `Connect.tsx`, the issue is likely that `handlePathSelect` is called after `setSelectedProjects`, but `handlePathSelect` may reset state internally. Reorder the URL param effects so `setSelectedProjects` is called last, or ensure `handlePathSelect` does not clear selected projects.

Debug approach: console-log `selectedProjects` immediately after both calls to confirm the timing. If `handlePathSelect` causes a re-render that calls `setSelectedProjects([])`, move the project pre-selection into the path's `useEffect` with a guard.

**4. Add "Land Projects" to forum category listing**

On the `/community` page, ensure there is a visible "Land Projects" category card alongside General, Quests, Alliance Partners, etc. If it exists but is hidden or missing from the category list config, add it. If the forum slug `/community/land-projects` doesn't have an entry in the category list, create one.

### Files to Change

| File | Change |
|------|--------|
| `client/src/components/GlobeMap.tsx` | Rename "Live in Community" to "Apply"; add secondary "Forum" button for land project cards |
| `client/src/pages/Connect.tsx` | Fix project pre-selection timing; ensure `setSelectedProjects` isn't overridden by `handlePathSelect` |
| `client/src/pages/Community.tsx` | Ensure "Land Projects" forum category appears in the category listing |

### Priority

Medium-high -- "Apply" is clearer; the forum button reduces dead-end navigation; broken pre-selection is a workflow bug.

---

## Fix 26: Profile Location -- Map Coordinate Picker + Privacy Options

### Goal

The profile location field currently stores only a `bioregionId` integer (a foreign key to a bioregions lookup table). Replace this with a coordinate-based location picker that shows a map, allows users to drop a pin at varying levels of precision (city, region, or globe), and supports options for nomadic users and those who identify as "of the Earth" rather than a fixed location.

### Current State

`drizzle/schema.ts` has `playerProfiles.bioregionId: int` (single FK to bioregions table). No latitude/longitude columns exist on `playerProfiles`. The profile editor renders a bioregion text selector or dropdown.

### What to Build

**1. Schema migration**

Add to `playerProfiles` table:
- `locationLat: decimal(9, 6)` -- latitude
- `locationLng: decimal(9, 6)` -- longitude
- `locationPrecision: enum('exact', 'city', 'region', 'hidden')` -- controls how precisely the pin is shown to others
- `locationLabel: varchar(255)` -- human-readable label (e.g., "Portland, OR" or "Pacific Northwest")
- `locationNomadic: boolean default false` -- user is nomadic / no fixed location
- `locationEarth: boolean default false` -- user identifies as "of the Earth" (shows a globe icon on their profile instead of a pin)

Keep `bioregionId` for now but treat it as deprecated; new location data goes in the new fields.

**2. Map coordinate picker UI**

In the profile editor, replace the bioregion dropdown with a small embedded map (Leaflet.js or a lightweight static map with a click-to-place-pin interaction). The picker should:
- Show a world map
- Allow click-to-place pin
- Show a privacy slider: "Exact location → City → Region → Hidden" that controls `locationPrecision`
- Show a "I'm nomadic" checkbox that disables the pin and sets `locationNomadic = true`
- Show an "I'm of the Earth" checkbox that sets `locationEarth = true` (mutually exclusive with nomadic)

On save, store `locationLat`, `locationLng`, `locationPrecision`, and `locationLabel` (auto-generated from reverse geocode if available, otherwise blank).

**3. Privacy bubble display**

When displaying a user's location on their public profile, apply the precision:
- `exact` -- show precise pin on a small map
- `city` -- show pin at city centroid (round coordinates to ~1 decimal place)
- `region` -- show a region label only, no pin
- `hidden` -- show nothing

**4. Nomadic and Earth display**

- Nomadic users: show a small caravan/tent icon and the label "Nomadic"
- Earth users: show a globe icon and the label "Citizen of the Earth"

### Files to Change

| File | Change |
|------|--------|
| `server/drizzle/schema.ts` | Add `locationLat`, `locationLng`, `locationPrecision`, `locationLabel`, `locationNomadic`, `locationEarth` columns to `playerProfiles` |
| Migration file | New Drizzle migration adding the 6 new columns |
| `client/src/pages/PlayerProfile.tsx` | Replace bioregion dropdown with coordinate picker component in edit mode; apply privacy precision in display mode |
| `client/src/components/LocationPicker.tsx` | Create new component: embedded map with pin placement, precision slider, nomadic/Earth checkboxes |

### Priority

Medium -- meaningful for community and map features; current bioregion dropdown is not user-friendly.

---

## Fix 27: Database CSV Imports -- Import 4 Data Files

### Goal

Four CSV files have been exported from the production database and need to be imported into the development/staging database. The files are: `users`, `applications`, `general_inquiries`, and `video_suggestions`.

### Current State

The following CSV files were uploaded to the session:
- `users_20260312_191542.csv` -- 5 rows. Columns: `id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn`
- `applications_20260312_191604.csv` -- 361 rows. Full application schema including `lat`, `lng`, `country`
- `general_inquiries_20260312_191658.csv` -- 2 rows. Full generalInquiries schema
- `video_suggestions_20260312_191733.csv` -- 1 row. Columns: `id, title, description, category, submitterEmail, submitterName, voteCount, voterEmails, status, completedVideoUrl, completedBlogSlug, createdAt, updatedAt`

The CSV files are in `/sessions/pensive-focused-babbage/mnt/uploads/` (or the path where they were uploaded).

### What to Build

Write a TypeScript import script for each CSV file that:

1. Reads the CSV
2. Maps columns to the Drizzle schema fields (handling type conversions: dates as strings to Date objects, JSON fields like `voterEmails` as arrays)
3. Uses `INSERT IGNORE` or upsert semantics to avoid duplicate key errors on re-run
4. Reports inserted vs. skipped counts on completion

**users import:**
Map `id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn` directly to `users` table. `role` should be cast to the role enum. `lastSignedIn` may be null.

**applications import:**
361 rows -- largest file. Map all columns to `applications` table. Handle nullable fields gracefully. `lat` and `lng` are decimal strings -- parse as floats. Date fields should be parsed with `new Date()`.

**general_inquiries import:**
2 rows. Map all columns to `generalInquiries` table.

**video_suggestions import:**
1 row. `voterEmails` is likely a JSON array or comma-separated string -- parse appropriately to match the schema.

**Script structure:**
```
scripts/
  import-users.ts
  import-applications.ts
  import-general-inquiries.ts
  import-video-suggestions.ts
```

Each script should be runnable standalone with `npx tsx scripts/import-{table}.ts` and should connect via the standard `DATABASE_URL` environment variable.

Before writing the scripts, read `CLAUDE.md` `regen-database-sql` skill for the correct MySQL connection pattern used in this codebase.

### Files to Change

| File | Change |
|------|--------|
| `scripts/import-users.ts` | Create new import script |
| `scripts/import-applications.ts` | Create new import script |
| `scripts/import-general-inquiries.ts` | Create new import script |
| `scripts/import-video-suggestions.ts` | Create new import script |

### Priority

High -- production data needs to be in the development database for testing and verification.

---

## Fix 28: Social Sharing Thumbnails -- Page-Specific OG Images

### Goal

Most pages use the default fantasy forest image (`iZVeEDJwzuNVQLOg.jpg`) as their Open Graph / social sharing thumbnail. Assign better, more relevant images to the pages that lack specific thumbnails, particularly the campaign pages, map, community, and investor opportunity pages.

### Current State

`SEO.tsx` defines `DEFAULT_IMAGE = 'https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg'`. The `pageSEO` object in `SEO.tsx` already has some per-page images:
- `home`: uses the default forest image (same as DEFAULT_IMAGE)
- `seasons`: `dLRruVvEitjLUEgU.jpg`
- `schedule`: `MnRHvgPyBDbKYbay.jpg`
- `game`: `ocDzkDHpivHtGCWo.jpg`
- `quest`: `kdpmqczDwXGfwTIK.jpg`
- `team`: `PPEoXqTcNBKerkDe.jpg`
- `opportunity`: `GUIluaYPZOUiwyLA.jpg`
- `apply`: `dLRruVvEitjLUEgU.jpg` (same as seasons)
- `home` and `socials`: default forest image

Pages that likely still use the default or an unoptimized image: `/community`, `/map`, `/crowd-pooling`, `/crowd-pooling-projects`, `/fund`, `/connect`, `/profile`, `/forum` posts.

### What to Build

**1. Audit current OG images**

Check every page in `pages/` that uses `<SEO>` and identify which ones pass an `image` prop vs. using the default. List them.

**2. Assign page-specific images**

For pages lacking specific images, assign an appropriate image from the existing asset library (`assets.regencivics.earth`). Choices should be visually representative:

- `/community` -- a community gathering or people-connection image
- `/map` -- the globe/bioregion imagery (a map-themed photo)
- `/fund` -- a land or financial growth image
- `/crowd-pooling` / `/crowd-pooling-projects` -- a cooperative contribution or land project image
- `/connect` -- a handshake or path-joining image

The `client/public/og/` directory has been pre-created in the repo. `[CLAUDE CODE]` should generate all missing OG images using the `nano-banana-pro` skill and save them directly to `client/public/og/[page].png`. They will be served at `https://regencivics.earth/og/[page].png` with no CDN upload needed.

Use the `regen-content-image` skill's BASE_THEME and the `campaign` prefix for map/fund/crowd-pooling and `forum` prefix for community/connect. Prompts:

- `community.png` — "A real-looking gathering of diverse people in a living space where a vibrant community circle meets in an open-air regenerative gathering hall, photorealistic people of many ages and backgrounds in animated conversation, children playing, flowering vines, bioluminescent wooden beams, abundant garden beds through open arched walls, golden afternoon light"
- `map.png` — "A wide panoramic view of a regenerative landscape where a glowing mycorrhizal world-map spreads across a mossy forest floor, continents traced in luminous teal bioluminescent thread with nodes of golden light at regenerative land project sites across every bioregion, ancient trees forming a living cathedral canopy, birds in flight"
- `fund.png` — "A wide panoramic view of a regenerative landscape where golden light pours through ancient forest canopy illuminating a thriving regenerative farm below, vast layered food forests in full abundance, a real-looking steward kneeling in rich dark soil with hands full of earth, mycorrhizal threads glowing faintly through the soil"
- `crowd-pooling.png` — "A wide panoramic view of a regenerative landscape where dozens of diverse real-looking people walk on glowing mycelium paths converging toward a central regenerative land project, each person carrying seeds or water or tools, the land around the convergence point impossibly abundant with layered food forests"
- `connect.png` — "A real-looking gathering of diverse people in a living space where two real-looking people clasp hands in warm greeting at the edge of a regenerative garden, framed by flowering vines and an ancient moss-covered stone archway draped in bioluminescent tendrils, community gathering visible behind them"

Append BASE_THEME to each: `solarpunk regenerative world where ancient golden-age civilizations are overgrown with cascading life, massive ancient trees coated in moss and bioluminescent mycelium, glowing teal mushrooms, mycorrhizal network threadwork visible in soil and bark, fruiting plants and abundant layered gardens, birds and animals at every scale, warm golden amber light from within the canopy and from distant golden-spired living cities, deep forest green tones, golden accents and highlights, hyperrealistic magical realism, detailed fantasy concept art, photorealistic texture, ultra detailed, 4K`

Resolution: `2K` for all. Save as PNG.

**3. Update `pageSEO` in `SEO.tsx`**

Add missing entries to the `pageSEO` object. Where a page renders `<SEO>` directly (not via `pageSEO`), pass the `image` prop explicitly.

**4. Dynamic OG images for land project and user profiles**

For dynamically-generated pages (e.g., a specific land project profile or a user's public profile), pass a project photo or the site default with a relevant fallback hierarchy:
1. Project's own photo (if available in data)
2. Page-type default (e.g., land project category image)
3. Site default

### Files to Change

| File | Change |
|------|--------|
| `client/src/components/SEO.tsx` | Add `pageSEO` entries for `/community`, `/map`, `/fund`, `/connect`, `/crowd-pooling`, `/crowd-pooling-projects`; set appropriate image URLs |
| Page files rendering `<SEO>` without `image` prop | Pass page-specific `image` prop |

### Priority

Low-medium -- affects social sharing virality; each shared link with a good thumbnail drives more clicks.

---

## Fix 29: Custom Land Games -- Waitlist Form, Database Table, Admin Panel

### Goal

The `/custom-games` page offers a $20,000 custom Game build service for land projects that have bought their land and are ready to coordinate community growth. Replace the current "Express Interest" CTA with "Join Waitlist", wire it to a purpose-built inquiry form, store submissions in a new database table, and surface them in the admin panel.

### Context: What Is This Service

A Custom Land Game is a fully built, live website tailored to a specific land project. It takes the entire community -- residents, business owners, investors, and the founding/catalyst team -- and runs them through a step-by-step co-creation journey. Each persona type (resident, investor, local business, core team member) gets their own track through the Game.

The core value prop is operational leverage for the founding team: instead of manually onboarding every new person and filtering interest, the Game does it for them. The Game handles:
- Persona-based onboarding flows (each type of community member walks their own path)
- Coordinating growth efforts cohesively
- Filtering serious participants from casual lookers
- Building shared commitment and shared understanding before anyone makes big decisions

This is designed as the "first thing to do after the land is bought and the community is ready to grow." At $20,000 it is priced to be accessible (not a barrier) while covering the significant team time required to understand the project, design the flows, and build something genuinely tailored.

Because it requires deep team involvement, capacity is limited -- hence the waitlist model.

### Current State

`/custom-games` page currently has a CTA labeled "Express Interest" (or similar). There is no unique form, no dedicated database table, and no admin panel section for managing these inquiries.

### What to Build

#### 1. Update the CTA on `/custom-games`

Replace the existing CTA button text:
- **Before:** "Express Interest" (or "Submit Inquiry" or whatever it currently reads)
- **After:** "Join Waitlist"

The button should open a dedicated modal or navigate to a form section (see below).

#### 2. Waitlist Inquiry Form

Create a form with the following fields:

| Field | Type | Notes |
|-------|------|-------|
| Full Name | text | required |
| Email | email | required |
| Project Name | text | required; the name of their land project |
| Website or Social Link | url | optional; lets team verify legitimacy |
| Land Status | radio | "Land is already purchased", "In contract / closing soon", "Still searching" |
| Community Stage | radio | "Just us founders", "We have a core team forming", "We have 10+ people involved", "100+ people / already active community" |
| Primary Goal for the Game | textarea | required; "What do you most want this Game to do for your community?" |
| Timeline | select | "ASAP", "Within 3 months", "3-6 months", "6+ months / flexible" |
| Budget Confirmation | checkbox | required; label: "I understand the Custom Land Game investment is $20,000 USD, and I'm ready to have a conversation about it." |
| How did you hear about ReGen Civics? | text | optional |
| Anything else to share? | textarea | optional |

Form submit behavior:
- On success: show a warm confirmation message ("You're on the waitlist. We'll reach out within 5 business days to schedule an intro call.")
- Send a confirmation email to the submitter (if email sending is already wired in the codebase)
- Store the submission in the new database table

#### 3. Database Table: `customGameInquiries`

New Drizzle table:

```ts
export const customGameInquiries = mysqlTable("custom_game_inquiries", {
  id: int("id").primaryKey().autoIncrement(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  websiteOrSocial: varchar("website_or_social", { length: 500 }),
  landStatus: varchar("land_status", { length: 100 }).notNull(),
  communityStage: varchar("community_stage", { length: 100 }).notNull(),
  primaryGoal: text("primary_goal").notNull(),
  timeline: varchar("timeline", { length: 100 }).notNull(),
  budgetConfirmed: boolean("budget_confirmed").notNull().default(false),
  referralSource: varchar("referral_source", { length: 255 }),
  additionalNotes: text("additional_notes"),
  status: varchar("status", { length: 50 }).notNull().default("waitlist"), // waitlist | intro_scheduled | in_progress | declined | completed
  internalNotes: text("internal_notes"), // admin-only notes field
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});
```

Create a Drizzle migration for this table.

#### 4. tRPC Router: `customGameInquiries`

New router with:

- `submit` -- public procedure; inserts a new inquiry; rate-limited (max 3 per email per 24h)
- `list` -- protected procedure (admin only); returns all inquiries sorted by `createdAt` desc; supports status filter
- `updateStatus` -- protected procedure (admin only); updates `status` and `internalNotes` fields

#### 5. Admin Panel Section

Add a "Custom Game Waitlist" tab to `/admin` (alongside Roles, Analytics, Banners, etc.).

The tab shows a table of all submissions:

| Column | Notes |
|--------|-------|
| Date | `createdAt` formatted relative |
| Name + Email | with mailto link |
| Project Name | and website link if provided |
| Land Status | pill badge |
| Community Stage | pill badge |
| Timeline | text |
| Budget Confirmed | ✓ or ✗ |
| Status | dropdown to change: Waitlist / Intro Scheduled / In Progress / Declined / Completed |
| Notes | expandable field for internal notes |

Sort: most recent first. Filter by status (default: show Waitlist and Intro Scheduled).

Clicking a row expands it to show the full `primaryGoal` and `additionalNotes` text.

#### 6. Page Copy Framing

On `/custom-games`, the section above the "Join Waitlist" CTA should communicate:

- What they get: a fully built, live website for their land project community
- Who it's for: land projects that have purchased land and are ready to start coordinating real community growth
- Why it works: each persona gets their own onboarding path -- residents, investors, business owners, core team -- so the founding team stops doing manual onboarding
- Pricing: $20,000; framed as investment in coordination infrastructure, not a cost
- Capacity note: "We take on a small number of projects per season so each one gets genuine attention from our team."
- Waitlist framing: "Join the waitlist. We'll reach out within 5 business days to schedule an intro conversation."

See the screenshot provided for additional copy details from the current page.

### Files to Change

| File | Change |
|------|--------|
| `client/src/pages/CustomGames.tsx` | Replace "Express Interest" CTA with "Join Waitlist"; wire to new form modal or inline form |
| `client/src/components/CustomGameWaitlistForm.tsx` | Create new form component with all fields listed above |
| `server/drizzle/schema.ts` | Add `customGameInquiries` table definition |
| Migration file | New Drizzle migration for `custom_game_inquiries` table |
| `server/routers.ts` | Add `customGameInquiries` router with `submit`, `list`, `updateStatus` procedures |
| `client/src/pages/Admin.tsx` | Add "Custom Game Waitlist" tab with submissions table |
| `client/src/components/CustomGameWaitlistAdmin.tsx` | Create admin view component: table with status dropdown and expandable detail rows |

### Priority

High -- this is an active revenue surface. The waitlist form and admin panel are needed to capture and manage real leads.

---

## Fix 30: Comprehensive Polish, Performance, and Quality Upgrade

### Goal

Bring the site to a state of genuine professional polish -- the kind where a first-time visitor, whether a land project founder, an impact investor, or a curious community member, immediately feels: *this is serious, beautiful, and alive.* This fix is a structured audit and upgrade plan across performance, accessibility, visual consistency, mobile experience, and code quality.

### Scope

This is not one fix -- it is a numbered checklist of work items across 6 categories. Each item should be executed as a sub-task and checked off. The categories are:

1. Performance
2. Accessibility and Readability
3. Mobile + Responsive Experience
4. Visual Consistency and Polish
5. Error States and Edge Cases
6. Code Quality and Dead Code

---

### Category 1: Performance

**1a. Bundle size audit**

Run `npx vite-bundle-analyzer` (or equivalent) to identify the largest chunks. Target: no chunk above 500KB uncompressed. Expected wins: heavy libraries (Three.js on non-globe pages, large date libraries, anything loaded globally that should be lazy).

**1b. Lazy-load all non-critical page components**

Any page component not in the initial routing shell should be wrapped in `React.lazy()` with a `<Suspense>` fallback. Priority: Admin, Community, Forum, Map, Calculator, CrowdPooling, Opportunity.

**1c. Image optimization audit**

Every `<img>` tag and CSS background-image on the site should:
- Use WebP format where possible (or have a WebP source set)
- Have explicit `width` and `height` attributes to prevent layout shift
- Use `loading="lazy"` for below-fold images
- Use `loading="eager"` only for the primary above-fold hero image

Check all images in `public/` and via `assets.regencivics.earth` for unoptimized formats.

**1d. Font loading**

Verify Google Fonts (or custom fonts) are loaded with `font-display: swap`. Preload the primary body font in `<head>`. Remove any unused font variants.

**1e. Remove console.log calls from production**

Search for `console.log`, `console.warn`, `console.error` in `client/src/`. Remove or replace with a proper logger that is silenced in production builds. Use `vite-plugin-remove-console` or a build-time replacement.

**1f. Unused dependency audit**

Run `npx depcheck` in the `client/` and `server/` directories. Remove packages that are installed but not imported anywhere. Common offenders: test runners, legacy polyfills, abandoned UI libraries.

---

### Category 2: Accessibility and Readability

**2a. Full contrast audit**

Run `axe-core` (via the axe DevTools browser extension or `@axe-core/playwright`) against every major page. Fix all contrast failures. The `/apply` page (see Fix 11) is a known offender; run the audit site-wide.

**2b. Focus management**

Every interactive element (buttons, links, inputs, modals) must be keyboard-focusable with a visible focus ring. Check that `outline: none` overrides aren't stripping focus indicators without a visible replacement. Tab through every major page and confirm logical focus order.

**2c. ARIA labels on icon-only buttons**

Search for buttons that contain only an icon (no visible text). Each must have an `aria-label`. Common locations: close buttons on modals, social share icons, dropdown triggers, map controls.

**2d. Alt text on images**

Every `<img>` that conveys meaning must have a descriptive `alt` attribute. Decorative images should have `alt=""`. Run a pass across all pages.

**2e. Form accessibility**

Every form input must have an associated `<label>` (either explicit with `htmlFor` or via `aria-label`). Error messages must be associated with inputs via `aria-describedby`. Required fields must be marked visually and with `aria-required="true"`.

**2f. Color-only information**

No state or meaning should be communicated by color alone. Example: if a status badge is green for "active" it should also have text ("Active") or an icon. Audit all badges, tags, and status indicators.

---

### Category 3: Mobile + Responsive Experience

**3a. Viewport audit on 375px width**

Test every major page at 375px width (iPhone SE viewport). Check:
- No horizontal overflow / scroll
- Text is legible (min 14px)
- Tap targets are at least 44x44px
- Navigation is usable
- Forms are not cropped

**3b. Navigation on mobile**

Verify the mobile nav (hamburger or drawer) opens and closes reliably. Check that links within the nav close the drawer on tap. Check for z-index conflicts with modals or sticky headers.

**3c. Modals and sheets on mobile**

All modals and bottom sheets should:
- Not overflow the viewport
- Be scrollable if content is long
- Have a clear close affordance (visible X button or swipe-down gesture)
- Not shift the body layout when opened (prevent scroll lock issues)

**3d. Table responsiveness**

Any `<table>` element should either be scrollable horizontally on small screens (`overflow-x: auto` wrapper) or convert to a card layout below a breakpoint. Check the admin panel tables and any data tables in profiles.

**3e. Map on mobile**

Test `/map` on a 375px viewport. The globe should be a reasonable size, the sidebar/panel should not obscure the globe by default, and touch interactions (rotate/zoom) should work without triggering browser scroll.

---

### Category 4: Visual Consistency and Polish

**4a. Typography scale audit**

Confirm the site uses a consistent type scale (e.g., from a Tailwind config or CSS custom properties). Common issues: one-off `text-[17px]` values, inconsistent heading hierarchy, line-heights that are too tight on mobile.

**4b. Spacing system audit**

Check that spacing values come from the Tailwind spacing scale rather than arbitrary pixel values. Look for `mt-[13px]`, `px-[22px]`, etc. and replace with nearest scale values.

**4c. Button and component variants**

Audit all button instances across the site. There should be a small set of defined variants (primary, secondary, outline, ghost, destructive) and every button should use one of them. One-off button styles should be absorbed into the variant system.

**4d. Card consistency**

Cards used across the site (land project cards, community cards, quest cards, admin cards) should have consistent corner radius, shadow, padding, and border style. Audit and normalize.

**4e. Loading states**

Every data fetch should have a loading state that:
- Shows a skeleton or spinner
- Matches the shape of the loaded content (skeleton preferred over generic spinner)
- Does not cause layout shift when data arrives

Audit all tRPC queries across pages and confirm loading states are present.

**4f. Empty states**

Every list or data view should have a designed empty state (not a blank space). Examples: empty quest list, no saved calculations, no forum posts yet, admin panel with no submissions. Each empty state should have an icon, a brief message, and a suggested action.

**4g. Animation quality**

Review all CSS transitions and animations. Goals:
- Transitions should use `ease-out` for entrance and `ease-in` for exit (not `linear`)
- Duration: 150-200ms for micro-interactions, 250-350ms for page-level transitions
- No jarring layout shifts during transitions
- `prefers-reduced-motion` media query honored -- all animations should be disabled or minimized for users who request it

**4h. Dark/light mode consistency**

If the site supports a dark mode (or has sections with dark backgrounds), verify color tokens work correctly in both contexts. No hard-coded colors that only look right in one mode.

---

### Category 5: Error States and Edge Cases

**5a. 404 page**

Verify the 404 page is on-brand, not a server default. It should have the site header/nav, a clear message, and a link back to Home.

**5b. Error boundaries**

Wrap every major page section (tabs, panels, data-fetching components) in a React `ErrorBoundary`. The fallback should show a friendly message ("Something went wrong loading this section") and a retry button, not a blank white screen.

**5c. Network error handling**

tRPC mutations and queries should have `onError` handlers that show a toast or inline error message. Audit all `trpc.*.useMutation()` calls and confirm `onError` is handled. Unhandled rejections should not silently fail.

**5d. Form validation messages**

All forms should show clear inline validation messages on submit (not just on blur). Validation messages should be specific ("Enter a valid email address") not generic ("Invalid input").

**5e. Long content handling**

Test all text display with unusually long strings:
- Long project names should truncate with ellipsis or wrap gracefully
- Long URLs should break-word
- Long usernames should not overflow card layouts
- Long descriptions should clamp with "Show more" rather than overflow

---

### Category 6: Code Quality and Dead Code

**6a. Dead component audit**

Search `client/src/components/` for components that are defined but never imported anywhere. List them. Decide: delete or keep. A clean components directory reduces confusion.

**6b. Unused route pages**

Check `client/src/pages/` for pages registered in the router that have no inbound links from the rest of the app (other than direct URL access). Confirm each one is intentional.

**6c. TypeScript error cleanup**

Run `npx tsc --noEmit` in the `client/` directory and fix all TypeScript errors. The goal is a clean compile with zero errors. Common offenders: `any` types, missing return types, unchecked array access.

**6d. Duplicate code patterns**

Identify duplicated patterns (e.g., the same card markup copy-pasted in 5 places) and extract to shared components. Focus on the highest-frequency duplicates first.

**6e. Environment variable audit**

Confirm all `VITE_*` and server-side env vars are documented in a `.env.example` file. Remove any vars that are defined but never used.

---

### Implementation Approach

This is a large body of work. Execute it as a structured sprint:

**Phase 1 -- Audit (do first, produces a report):**
- Run automated tools: axe-core, vite-bundle-analyzer, tsc --noEmit, depcheck
- Manual viewport test at 375px across all main pages
- Produce a short findings list per category with severity tags (P1 = blocking, P2 = important, P3 = polish)

**Phase 2 -- P1 fixes (blocking issues):**
- Crashes and unhandled errors (error boundaries, tRPC error handling)
- Contrast failures that fail WCAG AA
- Mobile overflow / tap target failures on key pages (Home, Apply, Community, Map)

**Phase 3 -- P2 fixes (important):**
- Performance (bundle splitting, lazy loading, image optimization)
- Loading and empty states
- Form validation and accessibility

**Phase 4 -- P3 polish:**
- Typography and spacing normalization
- Animation quality
- Dead code cleanup
- Visual consistency (cards, buttons, spacing)

### Files to Change

This fix touches most of the codebase. A separate tracking doc or GitHub project board is recommended for phase-by-phase execution. The spec above serves as the master checklist.

| Domain | Change |
|--------|--------|
| `client/src/` (all pages) | Error boundaries, loading states, empty states, contrast fixes |
| `client/src/components/` | Shared component variants (buttons, cards); dead component cleanup |
| `client/vite.config.ts` | Bundle splitting, lazy loading config |
| `client/index.html` | Font preloading, meta tags |
| `server/` | Env var cleanup, TypeScript error fixes |
| Build pipeline | Add `vite-plugin-remove-console` for production |

### Priority

High -- this is the final step before treating the site as production-ready. All prior fixes improve specific features; this one raises the baseline quality floor across the entire product.

---

## Fix 31: Auth Session Expiry -- Tao Spinner Error State + Graceful 401 Handling

### Goal

When a user's session expires mid-use, they currently see raw tRPC error messages or a blank broken page. Replace all error and 401 states with the Tao Te Ching spinner, styled with the header "When we think things are broken, ponder the TAO..." This creates a graceful, on-brand moment instead of a jarring failure. After a brief pause the user is redirected to login with their return URL saved.

This fix connects directly to Fix 39 (branded 404 / error pages) -- both use the same Tao spinner treatment as the site's universal "something went wrong, breathe" state.

### Current State

`tRPC` client is configured in `client/src/lib/trpc.ts` (or similar). There is no global `onError` handler that catches 401 responses. Individual query/mutation errors surface as unhandled React rendering issues or silent failures.

`TaoSpinner.tsx` exists and has a `taoQuotes` array. It is used during page transitions but not for error states.

### What to Build

**1. Global tRPC 401 interceptor**

In the tRPC client config, add a global `onError` callback:

```ts
// client/src/lib/trpc.ts
const trpcClient = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      headers: () => ({ /* auth headers */ }),
    }),
  ],
});

// In the tRPC React provider or query client setup:
queryClient.setDefaultOptions({
  queries: {
    onError: (error: any) => {
      if (error?.data?.httpStatus === 401) {
        sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
        // Show Tao spinner, then redirect after 2 seconds
        setGlobalErrorState({ type: 'session_expired' });
        setTimeout(() => {
          window.location.href = '/login';
        }, 2500);
      }
    },
  },
  mutations: {
    onError: (error: any) => {
      if (error?.data?.httpStatus === 401) {
        sessionStorage.setItem('returnTo', window.location.pathname + window.location.search);
        setGlobalErrorState({ type: 'session_expired' });
        setTimeout(() => {
          window.location.href = '/login';
        }, 2500);
      }
    },
  },
});
```

**2. Global error state context**

Create a `GlobalErrorContext` that `App.tsx` reads. When `type: 'session_expired'` is set, render the Tao spinner overlay over the full page:

```tsx
// App.tsx overlay
{globalError?.type === 'session_expired' && (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a1a0a]/95">
    <p className="text-[#d4a574] text-lg font-light tracking-wide mb-6">
      When we think things are broken, ponder the TAO...
    </p>
    <TaoSpinner />
    <p className="text-[#7a9e7a]/60 text-sm mt-8">Returning you to login...</p>
  </div>
)}
```

**3. On login success, restore return URL**

After login succeeds, check `sessionStorage.getItem('returnTo')`. If set, redirect there instead of `/profile`.

**4. Connection to Fix 39**

The same Tao spinner treatment applies to the 404 page and all caught errors -- see Fix 39 for the branded error page spec.

### Files to Change

| File | Change |
|------|--------|
| `client/src/lib/trpc.ts` (or tRPC config file) | Add global `onError` handler detecting 401; set global error state |
| `client/src/context/GlobalErrorContext.tsx` | Create new context for global error state |
| `client/src/App.tsx` | Read `GlobalErrorContext`; render Tao spinner overlay on session expiry |
| `client/src/pages/InvestorForm.tsx` or login page | After login, check `sessionStorage.returnTo` and redirect |

### Priority

High -- session expiry is a common user experience and currently breaks the page. The Tao spinner treatment turns a frustrating moment into a characteristic one.

---

## Fix 32: Rate Limiting on All Public Form Mutations

### Goal

All public-facing form submissions (Apply, Newsletter signup, General Inquiry, Investor Form, Custom Game Waitlist) need rate limiting to prevent spam the moment the site goes live. Limit to 7 submissions per IP address per 15-minute window.

### Current State

Fix 29 (Custom Game Waitlist) mentions rate limiting for that specific form. No other public mutation procedures have any rate limiting. On launch day, unprotected forms are trivially spammable and the database will fill with junk.

### What to Build

**1. Shared rate limiter utility**

Create a server-side in-memory rate limiter (or use the `rate-limiter-flexible` package if already installed -- check `package.json`):

```ts
// server/utils/rateLimiter.ts
import { RateLimiterMemory } from 'rate-limiter-flexible';

export const formSubmissionLimiter = new RateLimiterMemory({
  points: 7,        // 7 submissions
  duration: 60 * 15, // per 15 minutes
});

export async function checkRateLimit(ip: string, key: string) {
  try {
    await formSubmissionLimiter.consume(`${key}:${ip}`);
  } catch {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many submissions. Please wait a few minutes before trying again.',
    });
  }
}
```

**2. Apply to all public mutation procedures**

Add `await checkRateLimit(ctx.ip, 'apply')` (or the relevant form key) at the top of these procedures in `server/routers.ts`:

- Apply form submission (`applications.create` or equivalent)
- Newsletter signup (`newsletter.subscribe`)
- General Inquiry / role submission (`generalInquiries.create`)
- Investor form (`investorInquiries.create` or equivalent)
- Custom Game Waitlist (`customGameInquiries.submit` -- see Fix 29)

**3. IP extraction**

Ensure `ctx.ip` is available in tRPC context. If not, extract from `req.ip` or `req.headers['x-forwarded-for']` (Railway sets this for proxied requests):

```ts
// server/context.ts
ip: req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.ip ?? 'unknown',
```

**4. Client-side error handling**

When a tRPC mutation returns `TOO_MANY_REQUESTS`, show a friendly toast: "You've submitted recently. Please wait a few minutes and try again." Do not show a raw error.

### Files to Change

| File | Change |
|------|--------|
| `server/utils/rateLimiter.ts` | Create rate limiter utility (install `rate-limiter-flexible` if not present) |
| `server/context.ts` | Add `ip` extraction to tRPC context |
| `server/routers.ts` | Add `checkRateLimit` call to all 5 public form procedures |
| Mutation error handlers in form components | Handle `TOO_MANY_REQUESTS` with friendly toast |

### Priority

High -- must be in place before the site goes live. Spam on day one is a real risk.

---

## Fix 33: Security Headers

### Goal

Configure the server to return proper security headers on all responses: Content Security Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and CORS locked to the production domain. Without these the site fails basic security audits and is vulnerable to clickjacking.

### Current State

The Express server in `server/index.ts` likely has no explicit security header middleware. CORS may be set to `*` (allow all origins) which is appropriate for development but must be locked down for production.

### What to Build

**1. Add `helmet` middleware**

Check if `helmet` is in package.json. If not, install it:

```bash
npm install helmet
```

In `server/index.ts`:

```ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://assets.regencivics.earth", "https://*.cloudfront.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.regencivics.earth"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required if using Three.js or cross-origin resources
}));
```

**2. Lock CORS to production domain**

```ts
import cors from 'cors';

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://regencivics.earth', 'https://www.regencivics.earth']
    : true, // Allow all in dev
  credentials: true,
}));
```

**3. Environment check**

Wrap the strict CSP in a production-only check. Development needs looser rules (Vite HMR, devtools, etc.). In development, use `helmet()` with defaults only.

**4. X-Frame-Options**

Helmet sets this to `SAMEORIGIN` by default. Confirm it is active -- this prevents clickjacking.

**5. Test after applying**

Run the Chrome Security tab or an online scanner (Mozilla Observatory at `observatory.mozilla.org`) against the staging URL after this deploy. Target score: B+ or above.

### Files to Change

| File | Change |
|------|--------|
| `server/index.ts` | Add `helmet` middleware with CSP config; lock CORS to production domain |
| `package.json` | Add `helmet` dependency if not present |

### Priority

High -- security requirement before any public traffic.

---

## Fix 34: SEO + AI Bot Indexing -- Sitemap, robots.txt, llms.txt, and Structured Data

### Goal

Maximise search engine and AI crawler discoverability on launch. Four parts: (1) generate a sitemap.xml covering all public routes; (2) verify robots.txt is configured correctly; (3) add an `llms.txt` file for LLM crawlers following the emerging standard; (4) add schema.org JSON-LD structured data on key pages so both traditional search and AI search engines understand what the site is.

### Current State

No sitemap.xml is confirmed in `public/`. No `llms.txt`. `robots.txt` likely exists but may not be configured to allow legitimate crawlers while blocking `/admin`. The site is a client-side SPA -- bots that don't execute JavaScript will see a mostly-empty HTML shell, which means Google and AI crawlers may not fully index it.

### What to Build

**1. Static sitemap.xml**

Generate `public/sitemap.xml` listing all public routes with their canonical URLs and `lastmod` dates:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://regencivics.earth/</loc><priority>1.0</priority></url>
  <url><loc>https://regencivics.earth/game</loc><priority>0.9</priority></url>
  <url><loc>https://regencivics.earth/fund</loc><priority>0.9</priority></url>
  <url><loc>https://regencivics.earth/seasons</loc><priority>0.8</priority></url>
  <url><loc>https://regencivics.earth/apply</loc><priority>0.8</priority></url>
  <url><loc>https://regencivics.earth/community</loc><priority>0.8</priority></url>
  <url><loc>https://regencivics.earth/map</loc><priority>0.7</priority></url>
  <url><loc>https://regencivics.earth/crowd-pooling</loc><priority>0.7</priority></url>
  <url><loc>https://regencivics.earth/crowd-pooling-projects</loc><priority>0.7</priority></url>
  <url><loc>https://regencivics.earth/team</loc><priority>0.6</priority></url>
  <url><loc>https://regencivics.earth/schedule</loc><priority>0.6</priority></url>
  <url><loc>https://regencivics.earth/custom-games</loc><priority>0.7</priority></url>
  <!-- Include all public routes from App.tsx -->
</urlset>
```

Add `<link rel="sitemap" href="/sitemap.xml">` to `index.html` `<head>`.

**2. robots.txt**

Verify `public/robots.txt` exists and contains:

```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Sitemap: https://regencivics.earth/sitemap.xml

# Major AI crawlers -- explicitly allow
User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Googlebot
Allow: /
```

**3. llms.txt (AI Bot Index File)**

Create `public/llms.txt` following the emerging standard (`llmstxt.org`). This file tells LLM crawlers what the site is and what content is available for them to use:

```
# ReGen Civics

> ReGen Civics is a fund and a live-action regenerative land game. We support land projects and community builders who are healing their bioregions through the Regenerative Renaissance.

## About

ReGen Civics runs seasonal incubator programs for regenerative land projects, manages a crowd-pooling fund for community investment, and hosts a game and quest system that rewards real-world regenerative action.

## Core Pages

- [About the Game](https://regencivics.earth/game): How the ReGen Civics game and quest system works
- [The Fund](https://regencivics.earth/fund): How the ReGen Civics investment fund works
- [Apply to the Incubator](https://regencivics.earth/apply): For land projects wanting to join a season
- [Seasons](https://regencivics.earth/seasons): Active and past incubator seasons
- [Map of Land Projects](https://regencivics.earth/map): Geographic view of all projects in the network
- [Community Forum](https://regencivics.earth/community): Discussion, quests, and player coordination
- [Custom Land Games](https://regencivics.earth/custom-games): Bespoke game builds for individual land projects

## Contact

hello@regencivics.earth
```

**4. Schema.org JSON-LD on key pages**

Add structured data for AI and search engines. In the `<SEO>` component (or directly in `index.html` for global Organization schema):

**Organization schema (global, in `index.html` or `SEO.tsx`):**

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ReGen Civics",
  "url": "https://regencivics.earth",
  "logo": "https://assets.regencivics.earth/iZVeEDJwzuNVQLOg.jpg",
  "description": "A fund and live-action game for regenerative land projects and the Regenerative Renaissance.",
  "sameAs": [
    "https://twitter.com/regencivics",
    "https://www.linkedin.com/company/regencivics"
  ]
}
```

**WebSite schema (add SearchAction for sitelinks search box):**

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "ReGen Civics",
  "url": "https://regencivics.earth"
}
```

**5. Pre-rendering / SSR consideration for SPA**

Since this is a client-side React SPA, bots that don't execute JavaScript (a minority but growing set of AI crawlers) see an empty `<div id="root">`. Consider adding `vite-plugin-ssr` prerendering for the top 10 most important public pages, OR add `<meta name="description">` tags with full content in the static `index.html` for key pages.

At minimum: ensure every public page has a populated `<title>`, `<meta name="description">`, and OG tags in the `<head>` (Fix 28 handles OG images; this fix handles the text metadata and structured data).

### Files to Change

| File | Change |
|------|--------|
| `public/sitemap.xml` | Create; list all public routes |
| `public/robots.txt` | Verify exists; add AI crawler rules; add sitemap reference |
| `public/llms.txt` | Create; site description and key page links for LLM crawlers |
| `client/src/components/SEO.tsx` | Add JSON-LD `<script type="application/ld+json">` for Organization and WebSite schemas |
| `client/index.html` | Add `<link rel="sitemap">` and global Organization JSON-LD |

### Priority

High -- the SEO and AI discoverability value of launch is wasted without these. They can all be implemented in under 2 hours.

---

## Fix 35: Email Deliverability -- Domain Authentication for Resend

### Goal

All confirmation emails (Apply form, Newsletter, Investor form, Custom Game Waitlist) are sent via Resend but will land in spam if the sending domain lacks SPF, DKIM, and DMARC DNS records. Verify and configure domain authentication before any live emails are sent.

**[COWORK]** This fix requires browser-based work in the Resend dashboard and the domain registrar. Cowork will guide through the steps. Claude Code handles wiring the verified sender domain into the confirmation email templates.

### Current State

`resend` is installed. Email sending is wired in the codebase. The domain `regencivics.earth` may or may not have the required DNS records configured for Resend's sending infrastructure.

### What to Build

**[COWORK] Step 1: Check Resend domain verification status**

Cowork navigates to `resend.com/domains` in Chrome, logs into the Resend dashboard, and checks whether `regencivics.earth` has verified SPF, DKIM, and DMARC records. Reports status back.

**[HUMAN] Step 2: Add DNS records if needed**

If verification is incomplete, Resend provides exact DNS record values to add (a TXT record for SPF, two CNAME records for DKIM, a TXT record for DMARC). These must be added in the domain registrar (wherever `regencivics.earth` DNS is managed). Takes approximately 5 minutes. Cowork will surface the exact values to paste.

> "DNS step needed: Add these records to `regencivics.earth` in your registrar. Let me know when done and I'll verify propagation." [Cowork waits and verifies using MXToolbox while working on other parallelizable tasks.]

**[COWORK] Step 3: Verify propagation**

Navigate to `mxtoolbox.com/SuperTool.aspx`, run SPF, DKIM, and DMARC checks for `regencivics.earth`. Confirm all pass.

**[CLAUDE CODE] Step 4: Verify sender domain in codebase**

Confirm all email-sending code uses the verified domain as the `from` address (e.g., `"ReGen Civics <hello@regencivics.earth>"`). Update any placeholder sender addresses.

**[CLAUDE CODE] Step 5: Test email**

Run the newsletter subscribe mutation in a test environment and confirm the email arrives in inbox (not spam).

### Files to Change

| File | Change |
|------|--------|
| DNS registrar (external) | [HUMAN] Add SPF, DKIM, DMARC records provided by Resend |
| `server/routers.ts` | [CLAUDE CODE] Confirm all `resend.emails.send()` calls use `from: 'ReGen Civics <hello@regencivics.earth>'` |

### Priority

High -- every email going to spam undermines the onboarding flow. Zero code changes needed if DNS is already set up; one DNS session needed if not.

---

## Fix 36: Analytics Event Tracking Setup

### Goal

Confirm an analytics provider is installed and tracking meaningful conversion events from day one. Without tracking, you have no data to improve the product post-launch.

### Current State

An admin analytics dashboard exists (Fix 19 addresses its module import error). It's unclear what data feeds it -- the codebase may use Posthog, Plausible, or a custom events table. If there's no client-side tracking library installed and configured, the dashboard will show empty charts.

### What to Build

**1. Audit what's currently installed**

Check `package.json` for `posthog-js`, `plausible-tracker`, `@amplitude/analytics-browser`, or similar. Also check `client/index.html` for any injected tracking scripts. Report what's found.

**2. If no analytics library is installed: add Plausible**

Plausible is privacy-respecting (no GDPR cookie consent required), lightweight (~1KB), and self-hostable. Add the script tag to `client/index.html`:

```html
<script defer data-domain="regencivics.earth" src="https://plausible.io/js/script.js"></script>
```

This gives instant page-view tracking with zero code changes.

**3. Custom event tracking for key conversions**

Add manual `plausible()` event calls (or equivalent for whichever library is used) for:

- Quest completion (`plausible('Quest Completed', { props: { questId: quest.id } })`)
- Application submitted
- Newsletter subscribed
- Investor form submitted
- Custom game waitlist joined
- Profile created

These events should fire in the `onSuccess` callbacks of the relevant mutations.

**4. Connect to admin analytics dashboard**

If the admin dashboard reads from an internal `events` table, confirm the above events are also written to that table (the existing event-tracking procedure in `routers.ts` if it exists).

### Files to Change

| File | Change |
|------|--------|
| `client/index.html` | Add Plausible (or confirm existing analytics) script tag |
| Mutation `onSuccess` callbacks in form components | Add `plausible()` event calls for key conversions |
| `server/routers.ts` | Confirm or add event-writing for admin dashboard |

### Priority

High -- needed from launch day to make data-driven improvements.

---

## Fix 37: Open Graph Preview Validation Pass

### Goal

After Fix 28 (OG images) is deployed, validate every public page's social sharing preview using Facebook's OG Debugger, Twitter's Card Validator, and LinkedIn's Post Inspector. Encoding issues, wrong aspect ratios, and JS-rendered meta tags are common failure modes that aren't visible in code.

**[COWORK]** Cowork executes this pass using Chrome.

### What to Build

**[COWORK] For each major page URL:**

1. Navigate to `developers.facebook.com/tools/debug`
2. Paste the URL, click "Debug"
3. Check: image loads, title is populated, description is populated
4. Scrape fresh if meta tags are stale

Also run:
- `cards-dev.twitter.com/validator` for X/Twitter card preview
- Paste into LinkedIn post draft to verify thumbnail

Pages to check: `/`, `/game`, `/fund`, `/apply`, `/seasons`, `/map`, `/community`, `/custom-games`, `/crowd-pooling`

**[CLAUDE CODE] Fix any failures found:**

Common fixes:
- If OG tags aren't seen by bots (JS-rendered): move critical meta tags into a static HTML template or use prerendering
- If image fails: verify the `assets.regencivics.earth` URL is publicly accessible and returns the correct content-type
- If title/description is wrong: update the relevant `pageSEO` entry in `SEO.tsx`

**Subtler prompt to Rye:** After Fix 28 and Fix 37 are deployed, run a quick test: copy a page URL and paste it into a WhatsApp or iMessage chat. The thumbnail should appear. If it doesn't, the OG tags need the prerendering fix.

### Files to Change

| File | Change |
|------|--------|
| `client/src/components/SEO.tsx` | Fix any failures found during validation |
| `client/index.html` | Move critical static meta tags here if bot-rendering is the issue |

### Priority

Medium-high -- affects how the site looks every time someone shares a link. Worth 30 minutes of browser testing before announcing.

---

## Fix 38: Cross-Browser Smoke Test (Safari + Firefox)

### Goal

The site has been developed primarily in Chrome. Specific features are known to behave differently in Safari and Firefox: the 3D card flip (CSS `transform-style: preserve-3d`), Three.js globe, `backdrop-filter` blur, and any CSS Grid or custom property usage. Run a structured smoke test before launch.

**[COWORK]** Cowork opens each page in both browsers (if available on the system) and documents issues.

### What to Build

**[COWORK] Safari test pass -- check these specifically:**

1. Card flip on quest cards (`backface-visibility: hidden` needs `-webkit-backface-visibility: hidden` in Safari)
2. Globe page (`/map`) -- Three.js WebGL compatibility
3. Any `backdrop-filter: blur()` effects -- needs `-webkit-backdrop-filter` prefix in older Safari
4. `position: sticky` headers -- Safari has historically had sticky positioning bugs
5. Form inputs -- Safari changes styling of inputs and selects; confirm they match the design
6. Custom scroll behavior -- smooth scroll may behave differently

**[COWORK] Firefox test pass -- check these specifically:**

1. Globe/Three.js -- WebGL performance is generally fine but test at 375px and 1440px
2. Font rendering -- Firefox antialiasing differs from Chrome; confirm body text is legible
3. CSS Grid gaps -- confirm no layout breaks

**[CLAUDE CODE] Fix any -webkit- prefix gaps found:**

Add `-webkit-` prefixes where missing. The card flip in `WelcomeAboardQuests.tsx` / `SharePanel.tsx` specifically needs:

```css
-webkit-transform-style: preserve-3d;
-webkit-backface-visibility: hidden;
```

### Files to Change

| File | Change |
|------|--------|
| `client/src/components/WelcomeAboardQuests.tsx` and/or `SharePanel.tsx` | Add `-webkit-` prefixes for 3D flip |
| Any component using `backdrop-filter` | Add `-webkit-backdrop-filter` |

### Priority

Medium -- Safari is ~20% of web traffic and macOS users are likely to be the primary early adopter demographic for ReGen Civics.

---

## Fix 39: Branded 404 Page + Error Boundary Tao Treatment

### Goal

All error states -- 404, crashed React sections, and the session expiry state from Fix 31 -- use the same on-brand Tao spinner treatment. This turns every failure moment into a characteristic, calm, on-brand experience rather than a jarring one.

### Current State

`NotFound.tsx` exists but its visual design is unconfirmed. React `ErrorBoundary` fallbacks (where they exist) likely show plain text. Fix 31 adds the session expiry Tao overlay. This fix ensures the 404 page and all caught error boundaries use the same visual language.

### What to Build

**1. Update `NotFound.tsx` with Tao treatment**

Replace whatever the current 404 page shows with:

- Full-height layout with the site header and footer
- Centered content with the Tao spinner running
- Header: "When we think things are broken, ponder the TAO..."
- Subtext: "The page you're looking for has moved on. Let us take you somewhere good."
- Two CTAs: "Go Home" (links to `/`) and "Return to the Game" (links to `/profile`)
- Same dark green atmospheric background used in the rest of the site

**2. Shared `TaoErrorState` component**

Extract the Tao error display into a reusable `<TaoErrorState>` component with props:

```tsx
interface TaoErrorStateProps {
  message?: string;     // defaults to "When we think things are broken, ponder the TAO..."
  subtext?: string;     // optional secondary line
  showCTAs?: boolean;   // defaults to true
}
```

Used in:
- `NotFound.tsx` (404 page)
- React `ErrorBoundary` fallback components
- Fix 31's session expiry overlay (pass `showCTAs={false}` since redirect is automatic)

**3. Verify Railway SPA catch-all**

For any direct-link navigation to a non-root path (e.g., `regencivics.earth/game`), the Railway server must return `index.html` rather than a 404. Without this, users who share links directly will see a server-level 404 (not the branded page).

Verify `railway.toml` or the Express static serve config has a fallback route:

```ts
// server/index.ts -- at the END, after all API routes:
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
```

Confirm this catch-all exists.

**4. Error boundaries**

Wrap all major page sections in `<ErrorBoundary fallback={<TaoErrorState message="Something went quiet here." />}>`. Priority sections: the entire `<Main>` render in `App.tsx`, each tab panel in `PlayerProfile.tsx`, and the admin panel content area.

### Files to Change

| File | Change |
|------|--------|
| `client/src/pages/NotFound.tsx` | Replace with Tao spinner treatment; use `TaoErrorState` component |
| `client/src/components/TaoErrorState.tsx` | Create new reusable Tao error display component |
| `client/src/App.tsx` | Wrap main content in `<ErrorBoundary fallback={<TaoErrorState />}>` |
| `client/src/pages/PlayerProfile.tsx` | Wrap each tab panel in `<ErrorBoundary>` with `TaoErrorState` fallback |
| `server/index.ts` | Verify SPA catch-all route returns `index.html` for all non-API paths |
| `railway.toml` | Verify or add static file serving config for SPA |

### Priority

High -- directly affects first impressions. Any visitor who miskeys a URL or follows a broken link is currently seeing an unbranded error. Fix 31 and Fix 39 should be implemented in the same PR.

---

## Fix 40: Maintenance Mode Flag

### Goal

Add a `VITE_MAINTENANCE_MODE` environment variable that, when set to `true`, replaces the entire app with a simple on-brand "We're doing some work, back shortly" page. This allows safe database migrations and deploys without serving users a broken experience.

### Current State

There is no maintenance mode. A deploy that includes a schema migration and a code change happens simultaneously on Railway -- if the schema migration runs first, the old code may briefly try to query columns that don't exist yet, causing crashes for active users. No graceful hold during this window.

### What to Build

**1. Maintenance mode check in `App.tsx`**

```tsx
// App.tsx -- very top, before any routing
if (import.meta.env.VITE_MAINTENANCE_MODE === 'true') {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a1a0a]">
      <img src="/logo.svg" alt="ReGen Civics" className="w-20 h-20 mb-6 opacity-60" />
      <TaoSpinner />
      <p className="text-[#d4a574] text-lg font-light tracking-wide mt-6">
        We're tending the garden. Back shortly.
      </p>
      <p className="text-[#7a9e7a]/50 text-sm mt-2">
        regencivics.earth
      </p>
    </div>
  );
}
```

**2. Add to `.env.example`**

```
# Set to 'true' to show maintenance page instead of the full app
VITE_MAINTENANCE_MODE=false
```

**3. Railway env var**

In the Railway project dashboard, the `VITE_MAINTENANCE_MODE` variable can be toggled to `true` before a risky deploy and back to `false` when done. This takes effect on next build (or can be done as a redeploy with no code change).

**Note for Rye:** To put the site in maintenance mode: go to Railway → project → Variables → set `VITE_MAINTENANCE_MODE=true` → redeploy. Takes about 2 minutes. When migration is done, set it back to `false` and redeploy.

### Files to Change

| File | Change |
|------|--------|
| `client/src/App.tsx` | Add maintenance mode check at the top; render Tao spinner + message |
| `client/src/.env.example` or root `.env.example` | Add `VITE_MAINTENANCE_MODE=false` entry with comment |

### Priority

Medium -- essential for safe deploys once the site has real active users. Should be in place before Fix 7 (Badge System) is deployed since that has a schema migration.

---


---

## Fix 41: Spec Correction -- Remove Redundant `npm install react-share` from Fix 1

**Type:** Spec correction

**Issue:** Fix 1 includes the step `npm install react-share`. The package is already installed: `"react-share": "^5.3.0"` is in `package.json` and the module is present in `node_modules`. Running this install is harmless but wastes time and may mutate the lockfile unnecessarily.

**Correction:**

`[CLAUDE CODE]` Remove the install step from Fix 1. The `import` statements in `WelcomeAboardQuests.tsx` and any other components should reference the already-installed package directly. No install needed.

Verify the import resolves cleanly with:
```bash
grep -r "from 'react-share'" client/src/
```

If it resolves, move on. No other changes needed.

### Priority

Low (no breakage -- just cleanup)

---

## Fix 42: Spec Correction -- AdminBroadcastPanel.tsx Already Exists (Fix 2)

**Type:** Spec correction

**Issue:** Fix 2 lists `client/src/components/AdminBroadcastPanel.tsx` as "(new)" -- but this file already exists in the codebase. Creating it from scratch would overwrite existing work.

**Correction:**

`[CLAUDE CODE]` Before implementing Fix 2, read the existing `AdminBroadcastPanel.tsx` in full. Identify what is already built vs. what the spec adds. Implement only the delta -- do not overwrite the full file. Treat Fix 2 as "extend existing AdminBroadcastPanel.tsx" not "create new."

Key questions to answer by reading the file first:
- Does it already have a compose box?
- Are Buffer profile checkboxes wired?
- Is the Farcaster intent-URL option present?

Add only what is missing.

### Priority

High -- prevents overwriting existing work

---

## Fix 43: Spec Correction -- Wrong File Path in Fix 15 (Avatar URL Input)

**Type:** Spec correction

**Issue:** Fix 15 says: "The profile editor in `PlayerProfile.tsx` (or a child component like `ProfileEditModal.tsx`) has a text input for the avatar URL."

Neither of those filenames is correct. The actual file containing the avatar URL input is:

```
client/src/components/ProfileEditForm.tsx
```

**Correction:**

`[CLAUDE CODE]` Open `client/src/components/ProfileEditForm.tsx`. Find the avatar URL text input field. Add the helper text and live preview thumbnail described in Fix 15 to that file. Do not touch `PlayerProfile.tsx` or look for `ProfileEditModal.tsx` -- neither is relevant to this fix.

### Priority

High -- prevents editing the wrong file

---

## Fix 44: Spec Correction -- Ephemeral CSV Path in Fix 27

**Type:** Spec correction

**Issue:** Fix 27 states: "The CSV files are in `/sessions/pensive-focused-babbage/mnt/uploads/`." That path is inside an ephemeral VM session directory. It does not exist on the actual machine when Claude Code runs, and it will not exist in production or on any other developer's machine.

**Correction:**

`[HUMAN]` Copy the four CSV files from wherever they currently live on your machine into the repo at `scripts/data/`:

```
scripts/data/users_20260312_191542.csv
scripts/data/applications_20260312_191604.csv
scripts/data/general_inquiries_20260312_191658.csv
scripts/data/video_suggestions_20260312_191733.csv
```

The `scripts/data/` directory already exists in the repo. Add a `.gitignore` entry for `scripts/data/*.csv` if these files contain real user data that should not be committed.

`[CLAUDE CODE]` Update the four import scripts created in Fix 27 to reference paths relative to the repo root:

```ts
const csvPath = path.join(process.cwd(), 'scripts/data/users_20260312_191542.csv');
```

Replace any hardcoded `/sessions/...` paths with this pattern. The scripts should work when run from the repo root with `npx tsx scripts/import-users.ts`.

Also add to `scripts/data/.gitkeep` if it doesn't exist so the directory is tracked but CSV contents are not.

### Priority

High -- scripts will fail without this correction

---

## Fix 45: Spec Correction -- Wrong Schema Path and Missing Migration Number in Fix 29

**Type:** Spec correction (two issues)

### Issue A: Wrong Schema Path

Fix 29 says to add the `customGameInquiries` table to `server/drizzle/schema.ts`. That path does not exist. The actual schema file is:

```
drizzle/schema.ts   (repo root level, not under server/)
```

**Correction:**

`[CLAUDE CODE]` Add the `customGameInquiries` table definition to `drizzle/schema.ts`. Not `server/drizzle/schema.ts`. Verify the path by running:

```bash
ls drizzle/schema.ts
```

---

### Issue B: Migration Number

Fix 29 says "Create a Drizzle migration for this table" without specifying the filename. The latest migration in the `drizzle/` folder is `0042_amusing_guardian.sql`. The new migration must be numbered `0043`.

**Note:** There is also an existing collision in the drizzle folder -- two files are both numbered `0041_` (`0041_generated_image_urls.sql` and `0041_spooky_monster_badoon.sql`). This is a pre-existing issue. Before running `drizzle-kit push` for Fix 29, verify that Drizzle's migration journal (`drizzle/meta/_journal.json`) correctly reflects which migrations have been applied, to avoid re-running the colliding `0041_` entries.

**Correction:**

`[CLAUDE CODE]` After adding the table to `drizzle/schema.ts`, generate the migration with:

```bash
npx drizzle-kit generate
```

Rename the generated file to `0043_custom_game_inquiries.sql` if drizzle-kit assigns a different name. Confirm the file exists before running `drizzle-kit push`.

`[HUMAN]` After Claude Code runs `drizzle-kit push`, verify in the Railway database console that `custom_game_inquiries` table exists with all expected columns.

### Priority

High -- wrong path causes file creation in wrong location; unnumbered migration creates ambiguity

---

## Fix 46: Spec Correction -- Fix 32 Duplicates Existing Rate Limiter

**Type:** Spec correction

**Issue:** Fix 32 creates a new file `server/utils/rateLimiter.ts` using the `rate-limiter-flexible` package (not installed). But a complete custom rate limiter already exists at `server/rate-limit.ts` with `checkRateLimit()`, `getRateLimitStats()`, and an in-memory sliding-window implementation. Creating a second rate limiter at a different path with a different package will cause two conflicting rate limiting systems to coexist in the codebase.

**Correction:**

`[CLAUDE CODE]` Do NOT create `server/utils/rateLimiter.ts`. Do NOT install `rate-limiter-flexible`.

Instead, update the existing `server/rate-limit.ts` to match the target behavior from Fix 32:

```ts
// Change these two constants in server/rate-limit.ts:
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15-minute window (was 1 hour)
const MAX_SUBMISSIONS_PER_WINDOW = 7;          // 7 per window (was 33 per hour)
```

Then wire `checkRateLimit(ctx, 'form_submission')` into the public form mutation handlers as described in Fix 32. The existing export signature `checkRateLimit(ctx, action)` already supports this.

No new package needed. No new file needed. The existing implementation is already correct structurally -- just update the constants.

### Priority

High -- prevents duplicate conflicting systems and unnecessary package install

---

## Fix 47: Spec Correction -- JsonLD.tsx and StructuredData.tsx Already Exist (Fix 34)

**Type:** Spec correction

**Issue:** Fix 34 instructs Claude Code to create `JsonLD.tsx` and `StructuredData.tsx` as new components. Both already exist:

```
client/src/components/JsonLD.tsx
client/src/components/StructuredData.tsx
```

Creating them from scratch would overwrite existing implementations.

**Correction:**

`[CLAUDE CODE]` Before implementing Fix 34's structured data steps:

1. Read `client/src/components/JsonLD.tsx` in full
2. Read `client/src/components/StructuredData.tsx` in full
3. Identify what Organization, WebSite, and BreadcrumbList schemas are already present
4. Add only the missing schemas (from Fix 34's spec) to the existing components -- do not overwrite

For `llms.txt` and `robots.txt` additions in Fix 34, those are new files in `/public/` -- no conflict there. Proceed with creating those as specified.

### Priority

High -- prevents overwriting existing structured data work

---

## Fix 48: Add Agent Tags to Fixes 1-30

**Type:** Completeness pass

**Issue:** Fixes 1-30 have no `[CLAUDE CODE]` / `[COWORK]` / `[HUMAN]` agent tags. Fixes 31-40 have them. This inconsistency means the Cowork + Claude Code collaboration protocol from Fix 35 cannot be applied to the majority of the document.

**Correction:**

`[CLAUDE CODE]` No code changes needed for this fix.

The following is the authoritative agent assignment for every Fix 1-30. Claude Code should treat these as execution guidance when working through the document:

| Fix | CLAUDE CODE | COWORK | HUMAN |
|-----|-------------|--------|-------|
| Fix 1 | All code changes to WelcomeAboardQuests.tsx, SharePanel.tsx | Screenshot quest cards after deploy; verify golden glow renders; test share buttons | -- |
| Fix 2 | Create server/routes/buffer.ts, server/routes/farcaster.ts; extend AdminBroadcastPanel.tsx | Test "Test Connection" button in browser; post a test message to verify channels | Set BUFFER_ACCESS_TOKEN in Railway dashboard > Variables. Connect social accounts in Buffer UI. |
| Fix 3 | Edit ProfileEditForm.tsx; add blockchain callout component | Screenshot profile settings page; verify all onboarding fields appear | -- |
| Fix 4 | All 17 forum coordination code changes | Navigate forum tabs in browser; screenshot Connect/Learn/Discover/Map tabs | -- |
| Fix 5 | Wire autocomplete to live map data in BioregionSelect or equivalent | Test autocomplete in browser with partial org name input | -- |
| Fix 6 | Edit bioregion selection to allow multi-select | Test multi-select in browser; verify database stores array | -- |
| Fix 7 | Edit QuestBadges.tsx (existing file); wire badge DB; add forum propagation | Screenshot profile ring and badge display after deploy | -- |
| Fix 8 | Build ContributionCalculator hub; replace manual log form | Screenshot contributions tab; test calculator UI | -- |
| Fix 9 | Edit CrowdPooling page component; add explanatory header copy | Screenshot crowd pooling page after deploy | -- |
| Fix 10 | Edit Quests tab component to show completed at top | Screenshot quests tab with completed quest shown first | -- |
| Fix 11 | Edit Apply page copy and layout | Screenshot apply page after changes | -- |
| Fix 12 | Edit component loading logic; add skeleton states | Screenshot page load in browser (slow network throttle); confirm no flash | -- |
| Fix 13 | Edit newsletter re-prompt logic; check subscription state before showing | Test: subscribe, reload, confirm prompt does not re-appear | -- |
| Fix 14 | Edit quest card forum links; improve share copy | Click forum links in quest cards; verify correct URLs | -- |
| Fix 15 | Edit ProfileEditForm.tsx (see Fix 43 correction) | Screenshot avatar URL field with tooltip/preview visible | -- |
| Fix 16 | Expand taoQuotes array in TaoSpinner.tsx to ~72 entries | View spinner in browser; confirm new quotes appear in rotation | -- |
| Fix 17 | Fix AdminRoles.tsx crash / infinite load | Load Roles tab in browser; confirm no spinner lock | -- |
| Fix 18 | Edit BannerDisplay.tsx (existing); add multi-page targeting | Create test banner in admin; confirm it shows on target page only | -- |
| Fix 19 | Convert AdminAnalytics from lazy to static import (Option A) | Load Analytics tab in browser; confirm no module error | -- |
| Fix 20 | Add PasswordGate to AdminModeration.tsx | Navigate to /admin/moderation; confirm password prompt appears | -- |
| Fix 21 | Add Copy URL button to AdminImageStudio.tsx | Click Copy URL button in browser; paste into address bar to verify | -- |
| Fix 22 | Write and run seed comment script for forum quest posts | Visit each quest forum thread; confirm seed replies visible | -- |
| Fix 23 | Mount SiteTour globally in App.tsx; add contextual triggers | Trigger tour from home page; confirm overlay renders on all pages | -- |
| Fix 24 | Edit InvestorForm; add submission gate via localStorage check | Submit investor form; reload page; confirm form is hidden | -- |
| Fix 25 | Rename map button; add forum link; fix pre-check logic | Test map button rename; click forum link; test pre-check flow | -- |
| Fix 26 | Add Leaflet coordinate picker to ProfileEditForm.tsx; `npm install leaflet @types/leaflet` | Screenshot map picker in profile editor; test pin placement | -- |
| Fix 27 | Create 4 import scripts in scripts/; run against scripts/data/ CSVs (see Fix 44 correction) | -- | Copy CSVs to scripts/data/ before Claude Code runs scripts (see Fix 44) |
| Fix 28 | (1) Generate OG images via nano-banana-pro skill; save to `client/public/og/[page].png`; (2) Edit SEO.tsx pageSEO object; assign per-page image URLs as `/og/[page].png` | Use social debugger (Facebook, Twitter card validator) to confirm OG image for each page | -- |
| Fix 29 | Add table to drizzle/schema.ts (not server/drizzle/); generate migration 0043 (see Fix 45 correction); create form + admin panel | Submit waitlist form in browser; confirm admin tab shows submission | -- |
| Fix 30 | All code polish, performance, and quality tasks in fix | Run Lighthouse audit after deploy; screenshot scores | -- |

`[COWORK]` After Claude Code signals completion on any Fix above: run the COWORK validation step for that fix in a browser session. Capture a screenshot as evidence. If the validation fails, report the failure back to Claude Code with the screenshot.

`[HUMAN]` Steps flagged in the table above that require Rye:
1. **Fix 2:** Set `BUFFER_ACCESS_TOKEN` in Railway dashboard > Variables. Go to buffer.com > Settings > Developers > Create Access Token. Then connect social accounts in Buffer UI (one-time).
2. **Fix 27:** Copy the 4 CSV files into `scripts/data/` before running import scripts (see Fix 44).
3. **Fix 28:** Upload any new OG images to `assets.regencivics.earth` CDN before Claude Code wires them in.

### Priority

Medium -- no code changes, but required for Cowork + Claude Code handoff protocol to function across the full document



---

## Fix 49: Lighthouse Performance Hard Gate -- 90+ Before Ship

**Type:** Quality gate

### Goal

No deploy goes to production until the site scores 90 or above on Lighthouse Performance. This is a hard gate, not a suggestion. Run Lighthouse against the deployed preview URL (Railway staging), not localhost.

### Targets

| Metric | Minimum score |
|--------|--------------|
| Performance | 90 |
| Accessibility | 90 |
| Best Practices | 90 |
| SEO | 90 |

Core Web Vitals targets (within Performance score):

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| CLS (Cumulative Layout Shift) | < 0.1 |
| INP (Interaction to Next Paint) | < 200ms |
| FCP (First Contentful Paint) | < 1.8s |
| TTFB (Time to First Byte) | < 800ms |

### What to Build

`[CLAUDE CODE]` After completing Fix 30 (performance and polish), run Lighthouse programmatically using Playwright against the Railway staging URL:

```bash
npx playwright test --grep "lighthouse" scripts/lighthouse-check.ts
```

Create `scripts/lighthouse-check.ts`:

```ts
import { chromium } from 'playwright';
import { playAudit } from 'playwright-lighthouse';

const STAGING_URL = process.env.STAGING_URL || 'https://regencivics.up.railway.app';

const PAGES_TO_AUDIT = [
  { name: 'Home', path: '/' },
  { name: 'Community', path: '/community' },
  { name: 'Map', path: '/map' },
  { name: 'Apply', path: '/apply' },
  { name: 'Fund', path: '/fund' },
  { name: 'Game', path: '/game' },
];

const THRESHOLDS = {
  performance: 90,
  accessibility: 90,
  'best-practices': 90,
  seo: 90,
};

(async () => {
  const browser = await chromium.launch({ args: ['--remote-debugging-port=9222'] });
  const failures: string[] = [];

  for (const page of PAGES_TO_AUDIT) {
    const context = await browser.newContext();
    const p = await context.newPage();
    await p.goto(STAGING_URL + page.path, { waitUntil: 'networkidle' });

    const result = await playAudit({
      page: p,
      thresholds: THRESHOLDS,
      port: 9222,
      reports: {
        formats: { html: true },
        name: `lighthouse-${page.name.toLowerCase()}`,
        directory: './lighthouse-reports',
      },
    });

    const scores = result.lhr.categories;
    const perf = Math.round(scores.performance.score * 100);
    const a11y = Math.round(scores.accessibility.score * 100);
    const bp = Math.round(scores['best-practices'].score * 100);
    const seo = Math.round(scores.seo.score * 100);

    console.log(`\n${page.name}: Perf ${perf} | A11y ${a11y} | BP ${bp} | SEO ${seo}`);

    if (perf < 90 || a11y < 90 || bp < 90 || seo < 90) {
      failures.push(`${page.name}: Perf ${perf} A11y ${a11y} BP ${bp} SEO ${seo}`);
    }

    await context.close();
  }

  await browser.close();

  if (failures.length > 0) {
    console.error('\nFAILED -- these pages are below 90:');
    failures.forEach(f => console.error(' ', f));
    console.error('\nDo not ship until all scores are 90+. HTML reports saved to ./lighthouse-reports/');
    process.exit(1);
  } else {
    console.log('\nAll pages passed. Site is ready to ship.');
  }
})();
```

Install the required packages:

```bash
npm install --save-dev playwright-lighthouse
```

`[CLAUDE CODE]` If any page fails:
1. Read the HTML report in `lighthouse-reports/` for that page
2. Identify the top 3 failing opportunities
3. Fix them (following the guidance already in Fix 30 Category 1)
4. Re-run the audit
5. Repeat until all pages pass

Do not mark the site as ship-ready until `scripts/lighthouse-check.ts` exits with code 0.

`[COWORK]` After Claude Code reports all pages passing: open the Railway staging URL in Chrome, open DevTools > Lighthouse tab, run a manual audit on the Home page, and screenshot the scores as final visual confirmation.

### Common Fixes for Failing Scores

If Performance < 90:
- Images not in WebP or missing `width`/`height` (causes CLS)
- Large JS chunks not code-split (causes LCP)
- Render-blocking scripts or stylesheets

If Accessibility < 90:
- Missing `alt` text on images
- Buttons with no accessible label
- Insufficient color contrast

If SEO < 90:
- Missing `<meta name="description">` on a page
- Missing canonical URLs
- Pages not in sitemap.xml

### Files to Create

| File | Change |
|------|--------|
| `scripts/lighthouse-check.ts` | New -- Lighthouse audit runner |
| `lighthouse-reports/` | Auto-created on first run; add to `.gitignore` |

Add to `.gitignore`:
```
lighthouse-reports/
```

### Priority

**Blocking** -- this is a ship gate. No production deploy until this passes.

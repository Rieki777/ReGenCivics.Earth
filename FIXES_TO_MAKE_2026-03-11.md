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

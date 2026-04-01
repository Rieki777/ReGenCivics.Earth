# Social Sharing Optimization Spec — ReGen Civics

This is the go-to-market social sharing system for regencivics.earth. The goal: every link shared from the site should look so good in the preview card that the person seeing it clicks through. This is audience building infrastructure.

Research shows pages with optimized OG tags see 2-3x higher click-through rates. Facebook posts with images get 2.3x more engagement. We're currently leaving all of that on the table because our CDN images return 403 to social crawlers and most pages fall back to a single generic image.

This spec covers 12 initiatives across three tiers: static image foundations, dynamic image generation, and viral sharing mechanics.

---

## Current State

**What exists:**
- 5 static OG images in `/client/public/og/`: community, connect, crowd-pooling, fund, map
- Home page default: `og-default.jpg` (Ghibli village scene, 1200x630)
- SSR meta injection in `vite.ts` for 14 routes (OG + Twitter tags)
- Client-side SEO.tsx with per-page configs for ~30 routes
- CDN images via `assets.regencivics.earth` for page-specific images (seasons, schedule, game, quest, team, opportunity, apply)

**What's broken:**
- CDN URLs return 403 to external crawlers (Facebook, Twitter, LinkedIn bots can't fetch them)
- 20+ pages fall back to the generic village scene
- No dynamic images for user-generated content (forum posts, quest completions, land profiles, crowd-pooling campaigns)
- No share prompts anywhere on the site
- No referral tracking or viral loops
- Existing OG images have inconsistent dimensions (some 1155x630, some 1200x509)

---

## TIER 1: Static Image Foundations

### 1. Generate Unique OG Images for All Main Pages

**Priority:** Critical
**Effort:** Medium (image generation + wiring)
**Impact:** Every shared link looks intentional instead of generic

Generate a unique 1200x630 Ghibli-style illustration for each main page. Each image should visually tell the story of that page in a single glance. All served as local `.jpg` files from `/client/public/og/` so crawlers can always reach them.

**Pages that need unique images (11 new):**

| Page | Route | Image Concept |
|------|-------|---------------|
| Game | /game | People of all ages playing together in a living landscape. Board game elements woven into real terrain. Dice, cards, paths through forests. The infinite game made visible. |
| Quests | /quest | A quest board in a treehouse tavern. Scrolls, glowing markers, a diverse group of adventurers planning their next move. Warm lamplight. Maps on the wall. |
| Seasons | /seasons | A seasonal wheel or calendar carved into a great tree. Four seasons visible, with the current season glowing. People gathered around it. |
| Apply | /apply | A village gate opening. Someone being welcomed in. Established residents waving. Gardens visible beyond. A sense of "come build with us." |
| Team | /team | A round table in a forest clearing. Diverse people working together. Some on laptops, some drawing maps, some tending plants. Collaborative energy. |
| Opportunity | /opportunity | A seed vault or treasury in a living tree. Golden light. Ledgers and growing things intertwined. The Fund made tangible. |
| Schedule | /schedule | A gathering circle under lantern light. People arriving from different paths. A bonfire or hearth. The sense of "something is about to begin." |
| Land | /land | Aerial view of diverse regenerative landscapes. Food forests, ponds, earthen buildings, solar panels, animals. Real land, not abstract. |
| Governance | /governance | A council circle. Diverse elders and young people. Voting stones or tokens on a central table. Trees growing through the chamber. |
| Tokenomics | /tokenomics | Two streams flowing from a single source. One golden ($RCivics), one green ($ReGen). They water different gardens but share the same river. |
| Crowd Pooling | /crowd-pooling | People pouring water from individual vessels into a shared pool that feeds an irrigation channel running to land projects. Collaborative. |

**Pages that already have images but need dimension fixes:**

| Image | Current Size | Fix |
|-------|-------------|-----|
| community.webp | 1155x630 | Regenerate or pad to 1200x630 |
| connect.webp | 1155x630 | Regenerate or pad to 1200x630 |
| crowd-pooling.webp | 1200x509 | Regenerate at 1200x630 |
| fund.webp | 1200x509 | Regenerate at 1200x630 |
| map.webp | 1200x509 | Regenerate at 1200x630 |

**Implementation:**
1. Generate all images using Gemini 3 Pro (nano-banana-pro skill) at 2K resolution
2. Crop/resize to exactly 1200x630
3. Save as `.jpg` (better crawler compatibility than .webp) in `/client/public/og/`
4. Update `ROUTE_META` in `vite.ts` to reference local paths for every route
5. Update `pageSEO` in `SEO.tsx` to use local paths instead of CDN proxy
6. Serve `.jpg` for OG tags (crawlers), keep `.webp` available for in-page use

**Safe zone rule:** Keep the main visual content within the center 800x400 pixels. Twitter, Facebook, and LinkedIn all crop differently. Nothing critical in the outer 200px on any side.

---

### 2. Fix Dimension Consistency Across All OG Images

**Priority:** High
**Effort:** Low
**Impact:** Prevents cropping artifacts on every platform

Every OG image must be exactly 1200x630. No exceptions. Current images have three different sizes. This creates unpredictable cropping on different platforms.

**Implementation:**
1. Audit all files in `/client/public/og/`
2. Resize any that aren't 1200x630 using Pillow with LANCZOS resampling
3. Validate `og:image:width` and `og:image:height` tags match (1200 and 630)
4. Add a build-time check script that fails if any OG image is the wrong size

---

### 3. Text Overlay Variants for A/B Testing

**Priority:** Medium
**Effort:** Medium
**Impact:** 15-30% CTR improvement over plain images (based on industry benchmarks)

For the 5 most-shared pages (home, quest, apply, fund, opportunity), create variants with text overlays. The text should be a single punchy line that adds context the title alone can't convey.

**Overlay text examples:**

| Page | Overlay Line |
|------|-------------|
| Home | "A real-world game for regenerative land" |
| Quest | "Complete quests. Earn tokens. Heal land." |
| Apply | "Season 2 applications open" |
| Fund | "Land-backed. Community governed." |
| Opportunity | "Invest in the Regenerative Renaissance" |

**Design rules:**
- Semi-transparent dark band at bottom (rgba(26, 71, 42, 0.85))
- White text, Quicksand Bold, 36-42px
- ReGen Civics logo mark (small, bottom-right corner)
- Text must remain readable at 400px wide (mobile preview size)

**Implementation:**
- Use Pillow/PIL to composite text onto base images
- Store both plain and overlay variants
- Wire overlay variants as default in ROUTE_META (plain images available as fallback)
- Later: A/B test plain vs. overlay using UTM parameters

---

## TIER 2: Dynamic OG Image Generation

### 4. Server-Side Dynamic OG Endpoint (`/api/og`)

**Priority:** High
**Effort:** High
**Impact:** User-generated content gets its own preview card instead of falling back to generic

Build a server endpoint that generates OG images on the fly for dynamic content. When someone shares a forum post, a quest completion, or a crowd-pooling campaign, the preview card should show that specific content. Right now they all show the same village scene.

**Tech approach:**
- Use `satori` + `@resvg/resvg-js` on the Node.js server (works without Next.js)
- Endpoint: `GET /api/og?type=forum&id=624` or `GET /api/og?type=quest&id=13`
- Returns a PNG image with proper cache headers
- Cache generated images in R2 or local filesystem (cache key: `type-id-version`)

**Supported content types:**

| Type | Template | Dynamic Fields |
|------|----------|---------------|
| `forum` | Discussion card | Post title, author name, author avatar, category badge, reply count |
| `quest` | Quest card | Quest name, quest image/icon, difficulty, season badge |
| `quest-completion` | Achievement card | Player name, quest name, completion date, token reward |
| `land` | Land project card | Project name, location, hero image, key stats (hectares, members) |
| `campaign` | Crowd-pooling card | Project name, funding progress bar, amount raised, days remaining |
| `player` | Player profile card | Display name, avatar, level/tier, quest count, badges |
| `blog` | Blog post card | Title, author, publish date, reading time, hero image |

**Template design system:**
- Consistent 1200x630 canvas
- Dark green background (#1a472a) with subtle texture
- ReGen Civics logo watermark (bottom-right, 20% opacity)
- Quicksand font for headings, system font for body
- Green accent color (#7dd87d) for highlights and progress bars
- Each template type has a distinct accent color or icon to be instantly recognizable

**Cache strategy:**
- Cache generated images for 24 hours (forum posts can be edited)
- Bust cache on content update by appending `?v={updatedAt timestamp}`
- Pre-generate on content creation (queue job) so first share is instant

**SSR integration:**
- Update `vite.ts` to detect dynamic routes (`/community/post/:id`, `/quest/:slug`, `/land/:slug`, `/crowd-pooling-projects/:id`)
- For dynamic routes, set `og:image` to `/api/og?type=forum&id={id}`
- Pull title and description from the database at SSR time for these routes

---

### 5. Crowd-Pooling Campaign Cards

**Priority:** High
**Effort:** Medium (builds on #4)
**Impact:** Every campaign share becomes a fundraising pitch with live numbers

Each crowd-pooling campaign should generate its own preview card when shared. This is where social sharing directly drives funding.

**Card template:**

```
+-----------------------------------------------+
|  [Hero image or project photo, top 60%]       |
|                                                |
|  +-----------------------------------------+  |
|  |  PROJECT NAME                           |  |
|  |  Location                               |  |
|  |                                         |  |
|  |  [=====>         ] 34% funded           |  |
|  |  $127,000 of $375,000    23 backers     |  |
|  |                                         |  |
|  |  ○ ReGen Civics          12 days left   |  |
|  +-----------------------------------------+  |
+-----------------------------------------------+
```

**Dynamic fields:**
- Project hero image (from campaign data)
- Project name and location
- Funding progress bar (green fill on dark background)
- Amount raised / goal
- Backer count
- Days remaining (or "Funded!" badge if complete)

**When a campaign is fully funded**, the card changes: progress bar turns gold, "FUNDED" badge overlays, confetti-style border. This makes funded campaigns even more shareable ("look what we did together").

**Implementation:**
- Template in the `/api/og` system (type=campaign)
- Pull real-time funding data from the database
- Cache for 1 hour (funding numbers change frequently)
- Pre-generate when campaign is created and when funding milestones are hit (25%, 50%, 75%, 100%)

---

### 6. Quest Completion Achievement Cards

**Priority:** High
**Effort:** Medium (builds on #4)
**Impact:** Players share their completions, and each share is a recruiting tool

When a player completes a quest, they get a personalized achievement card they can share. The person who sees it thinks "I want to try that."

**Card template:**

```
+-----------------------------------------------+
|  [Quest illustration, top half]                |
|                                                |
|  +-----------------------------------------+  |
|  |  ✓ QUEST COMPLETE                       |  |
|  |                                         |  |
|  |  "Healing Fire Ceremony"                |  |
|  |  Completed by: @PlayerName              |  |
|  |                                         |  |
|  |  +12 $ReGen    Season: Fire             |  |
|  |                                         |  |
|  |  ○ ReGen Civics    regencivics.earth    |  |
|  +-----------------------------------------+  |
+-----------------------------------------------+
```

**Variations:**
- First quest completion: "Welcome to the Game!" badge
- Season rite completion: seasonal border color (fire=amber, water=blue, earth=brown, air=white)
- Epic quest completion: gold border, larger text, "EPIC" badge
- Streak completions: "3 quests this week" counter

---

## TIER 3: Viral Sharing Mechanics

### 7. Contextual Share Prompts at Key Moments

**Priority:** Critical
**Effort:** Medium
**Impact:** People don't share unless you ask them to. This is the ask.

Add share prompts at the exact moments when someone has just done something they're proud of. These aren't generic "share this page" buttons. They're specific invitations tied to what just happened.

**Share moments and copy:**

| Moment | Where | Share Prompt | Pre-written Text |
|--------|-------|-------------|-----------------|
| Quest completed | Quest completion modal | "Tell someone about this" | "I just completed the [Quest Name] on ReGen Civics. [X] $ReGen earned. [link]" |
| Application submitted | Apply success screen | "Know another project?" | "I just applied to bring [Project Name] into ReGen Civics Season 2. If you're running a regen land project, check it out: [link]" |
| Forum post published | Post success toast | "Share your post" | "[Post title] [link]" |
| Crowd-pooling contribution | Payment success | "Invite others to pool" | "I just contributed to [Project Name] on ReGen Civics. [X]% funded, [Y] days left. [link]" |
| LOI submitted | LOI confirmation | "Know other investors?" | "I just expressed interest in the ReGen Civics Regenerative Land Fund. If you're an accredited investor looking at regen, worth a look: [link]" |
| First login | Onboarding complete | "Invite a friend" | "I just joined ReGen Civics, a real-world game for regenerative land. Come play: [link]" |
| Badge earned | Badge notification | "Show off your badge" | "Just earned the [Badge Name] badge on ReGen Civics. [link]" |
| Season milestone | Season progress ring | "Celebrate with others" | "I've completed [X] of 13 seasonal rites on ReGen Civics this season. [link]" |

**Share targets (in order of priority):**
1. Copy link (always first, lowest friction)
2. Twitter/X (pre-populated tweet)
3. LinkedIn (pre-populated post)
4. WhatsApp (pre-populated message)
5. Telegram (pre-populated message)
6. Email (pre-populated subject + body)

**Implementation:**
- Build a `<SharePrompt>` component that accepts: `text`, `url`, `image` (for the OG), `moment` (for analytics)
- The component renders as a modal/drawer after the triggering action
- Each share target uses Web Share API where available, falls back to `window.open` with pre-populated URLs
- Track share clicks in analytics (event: `share_click`, properties: `moment`, `target`, `content_type`, `content_id`)

**Design:**
- Not a popup that interrupts. A gentle slide-in or expansion of the success state.
- "Tell someone about this" is better copy than "Share". It's human.
- Always include "Copy link" as the primary action. Most sharing happens in DMs and contexts we can't predict.

---

### 8. Referral Tracking and Attribution

**Priority:** High
**Effort:** Medium
**Impact:** Know which shares actually drive signups and contributions

Add referral parameters to every shared link so you can track what's working.

**URL structure:**
```
https://regencivics.earth/quest/fire-ceremony?ref={userId}&src={platform}&ctx={context}
```

- `ref`: the sharing user's ID (hashed for privacy)
- `src`: platform (twitter, linkedin, whatsapp, telegram, email, copy)
- `ctx`: context (quest-complete, forum-post, campaign-share, invite, etc.)

**Tracking:**
- On page load, capture ref/src/ctx params and store in session
- When the visitor signs up, attribute the signup to the referrer
- When the visitor completes a quest or contributes to a campaign, attribute that too
- Build a simple referral dashboard in the player profile: "You've brought X people into the game"

**Privacy:**
- Hash user IDs in referral links (don't expose raw database IDs)
- Don't track cross-site. Only attribute when someone arrives at regencivics.earth.
- Referral data stored for attribution only, not sold or shared

---

### 9. Player Referral Rewards (Viral Loop)

**Priority:** High
**Effort:** Medium
**Impact:** People who share once have a reason to keep sharing

When a referred user signs up and completes their first quest, the referrer earns $ReGen tokens. The loop: share, someone signs up, they do a quest, the referrer gets tokens, they share again.

**Reward tiers:**

| Action by Referred User | Referrer Earns |
|--------------------------|---------------|
| Signs up | 5 $ReGen |
| Completes first quest | 10 $ReGen |
| Completes a seasonal rite | 15 $ReGen |
| Contributes to crowd-pooling | 25 $ReGen |
| Refers someone themselves (2nd degree) | 5 $ReGen |

**Anti-gaming measures:**
- Max 50 referral rewards per month per user
- Referred user must have a unique email (no duplicates)
- 2nd-degree rewards cap at 10 per month
- No self-referral (same IP/device detection)

**Visibility:**
- "Your Referrals" section in player profile
- Notification when a referred user hits a milestone: "Alex just completed their first quest. You earned 10 $ReGen."
- Seasonal leaderboard: "Top referrers this season" (opt-in)

---

### 10. Smart Preview Links for Messaging Apps

**Priority:** Medium
**Effort:** Low
**Impact:** WhatsApp, Telegram, and iMessage previews look intentional, not broken

Messaging apps are where most sharing actually happens (not public social media). WhatsApp, Telegram, Signal, and iMessage all fetch OG tags to render link previews. These previews are often the first impression someone has of ReGen Civics.

**Requirements:**
- All images must be `.jpg` (WhatsApp has inconsistent .webp support for OG)
- Title under 60 characters (WhatsApp truncates aggressively)
- Description under 120 characters (Telegram shows less than Twitter)
- og:url must be the canonical URL (some messengers use it as the display URL)

**Special handling for WhatsApp:**
WhatsApp caches OG images aggressively (sometimes for weeks). When images change, the old one persists. Mitigation: append `?v={timestamp}` to og:image URLs when content is updated. This busts the WhatsApp cache.

**Implementation:**
- Add WhatsApp-specific meta tag: `<meta property="og:image:type" content="image/jpeg" />`
- Ensure all dynamic OG images from `/api/og` return `Content-Type: image/png` with proper cache headers
- Add an `og:updated_time` meta tag that updates when content changes
- Test all major messaging apps manually after deploy (WhatsApp, Telegram, Signal, iMessage, Facebook Messenger)

---

### 11. "Share Your Journey" Profile Cards

**Priority:** Medium
**Effort:** Medium (builds on #4)
**Impact:** Every player has a card they want to show off

Every player gets a shareable profile card that shows what they've done. Someone outside the ecosystem sees it and thinks "what is this?"

**Card template:**

```
+-----------------------------------------------+
|  [Avatar]  @PlayerName                        |
|            Level: Seedling                     |
|            Member since: March 2026            |
|                                                |
|  Quests Completed: 7                           |
|  $ReGen Earned: 142                            |
|  Referrals: 3                                  |
|  Season Progress: [====>      ] 4/13           |
|                                                |
|  "Building soil, building community."          |
|                                                |
|  ○ ReGen Civics    regencivics.earth/play/rye  |
+-----------------------------------------------+
```

**Shareable from:**
- Player profile page ("Share your profile" button)
- After milestone achievements
- Annual or seasonal wrap-up ("Your 2026 in ReGen Civics")

**Seasonal wrap-ups** (same idea as Spotify Wrapped, but for regeneration):
- "This season you completed X quests, earned Y $ReGen, and helped Z projects"
- Generated as a shareable card with seasonal artwork
- Released at the end of each season to drive a wave of sharing

---

### 12. Embeddable Widgets for External Sites

**Priority:** Low (build after core sharing is solid)
**Effort:** High
**Impact:** Other people's websites send traffic to yours, indefinitely

Create embeddable widgets that land projects, alliance partners, and community members can put on their own websites. Each widget links back to regencivics.earth.

**Widget types:**

| Widget | What It Shows | Who Uses It |
|--------|--------------|-------------|
| Campaign Progress | Funding bar + stats for a specific campaign | Land projects on their own site |
| Quest Badge | "I completed [Quest] on ReGen Civics" badge | Players on their personal site/blog |
| Alliance Badge | "Alliance Partner of ReGen Civics" with logo | Alliance organizations |
| Live Map Embed | Mini version of the project map | Anyone writing about the regen movement |
| Season Counter | "Season 2 starts in X days" countdown | Community members, social bios |

**Implementation:**
- Each widget is an `<iframe>` or `<script>` embed with a unique URL
- Widget pages are lightweight, load fast, and contain a "Powered by ReGen Civics" link
- Endpoint: `/embed/campaign/:id`, `/embed/badge/:type`, etc.
- Minimal JS, no tracking cookies (respect the host site's privacy)

---

## Implementation Priority

This is the recommended build order. Each phase builds on the previous.

### Phase 1: Foundation (Week 1-2)
1. **#1 Generate unique OG images** for all 11 missing pages
2. **#2 Fix dimensions** on existing 5 images
3. Wire all images into `ROUTE_META` and `pageSEO`
4. Test with Facebook Debugger, Twitter Card Validator, LinkedIn Post Inspector

### Phase 2: Dynamic Engine (Week 3-4)
5. **#4 Build `/api/og` endpoint** with satori + resvg
6. **#5 Campaign cards** template
7. **#6 Quest completion cards** template
8. Wire dynamic routes in `vite.ts` SSR

### Phase 3: Sharing Mechanics (Week 5-6)
9. **#7 Share prompts** at all key moments
10. **#8 Referral tracking** URL parameters + attribution
11. **#3 Text overlay variants** for top 5 pages

### Phase 4: Viral Loop (Week 7-8)
12. **#9 Referral rewards** system
13. **#11 Player profile cards** (shareable)
14. **#10 Messaging app optimization**

### Phase 5: Ecosystem (Week 9+)
15. **#12 Embeddable widgets**
16. Seasonal wrap-up cards
17. A/B testing framework for image variants

---

## Technical Architecture

### File structure
```
client/public/og/
  home.jpg           # 1200x630, Ghibli village (exists as og-default.jpg)
  game.jpg           # 1200x630, generated
  quest.jpg          # 1200x630, generated
  fund.jpg           # 1200x630, exists, needs resize
  community.jpg      # 1200x630, exists, needs resize
  map.jpg            # 1200x630, exists, needs resize
  ... (one per main page)
  overlays/
    home-overlay.jpg  # Text overlay variant
    quest-overlay.jpg
    ...

server/routes/og.ts          # Dynamic OG image endpoint
server/templates/og/          # Satori JSX templates
  forum-post.tsx
  quest-completion.tsx
  campaign-card.tsx
  player-profile.tsx
  blog-post.tsx

client/src/components/
  SharePrompt.tsx              # Contextual share modal
  ShareButton.tsx              # Individual share target button
  EmbedWidget.tsx              # Widget renderer
```

### Dependencies to add
```json
{
  "satori": "^0.12.x",
  "@resvg/resvg-js": "^2.6.x"
}
```

### Cache strategy
```
Static OG images:     Cache-Control: public, max-age=31536000, immutable
Dynamic OG images:    Cache-Control: public, max-age=86400, s-maxage=3600
Campaign cards:       Cache-Control: public, max-age=3600 (funding changes)
Quest completions:    Cache-Control: public, max-age=604800 (rarely changes)
```

---

## Admin Dashboard: Social & Sharing Tab

All of this data needs to be visible in the admin panel. The existing Analytics tab (`/admin?tab=analytics`) covers submissions, email engagement, and conversion funnels. Social sharing needs its own tab or a dedicated section within Analytics.

**Where:** New tab in Admin: "Social & Sharing" (or extend the existing Analytics tab with a sub-section)

**What you see when you open it:**

### Top-line numbers (cards across the top)
- Total shares (all time / last 30 days / last 7 days)
- Total referral signups (all time / last 30 days)
- Share-to-signup conversion rate
- Top shared page this week
- Top referrer this week

### Share activity chart
- Line chart: shares per day over last 30/90 days
- Filterable by: content type (quest, forum, campaign, profile), platform (Twitter, LinkedIn, WhatsApp, copy link, etc.)
- This is the main chart. It answers "is sharing growing?"

### Referral funnel
- Visual funnel: Shares > Link clicks > Signups > First quest completed > Active players
- Numbers and percentages at each step
- Filterable by time period and source platform

### Per-content breakdown table
- Sortable table: content title, type, total shares, clicks, signups attributed, conversion rate
- "What's getting shared the most, and what's actually converting?"
- Click a row to see the full referral chain for that piece of content

### Per-referrer leaderboard
- Table: player name, total shares, signups attributed, $ReGen earned from referrals
- "Who are your best ambassadors?"
- Useful for identifying people to reach out to, feature, or reward further

### A/B test results (when running)
- Side-by-side comparison: image variant A vs B
- Impressions, clicks, CTR for each
- Statistical significance indicator (green = significant, yellow = needs more data)
- "Pick winner" button that sets the winning variant as default

### Campaign sharing stats
- Per-campaign: shares, clicks, contributions attributed to shares
- Funding progress vs. sharing activity overlay (did shares spike when funding hit 50%?)

### Platform breakdown
- Pie chart or bar chart: which platforms are shares going to?
- Twitter vs LinkedIn vs WhatsApp vs Copy Link vs Email vs Telegram
- Click-through rate per platform (some platforms convert better than others)

**Data sources:**
- Share click events from the `<SharePrompt>` component (tracked via Umami + custom backend table)
- Referral params (ref, src, ctx) captured on page load and stored in a `referrals` table
- Attribution data joined with user signups and quest completions
- A/B test assignments stored in a `ab_tests` table with variant, impressions, clicks

**Database tables needed:**

```
share_events:
  id, userId, contentType, contentId, platform, sharedUrl, createdAt

referrals:
  id, referrerUserId, referredUserId, source, context, landingUrl,
  signedUpAt, firstQuestAt, firstContributionAt, createdAt

ab_test_variants:
  id, testName, variantName, imagePath, impressions, clicks, createdAt

ab_test_assignments:
  id, testName, visitorId, variant, createdAt
```

**Implementation notes:**
- The existing `AdminAnalyticsTab.tsx` already uses Recharts for charts. Use the same library.
- The existing `campaign_analytics` table already tracks referrer, utmSource, utmMedium. Extend this pattern.
- Share events should be tracked both in Umami (for general analytics) and in a custom table (for the admin dashboard queries).
- Keep it fast: pre-aggregate daily rollups in a cron job rather than computing everything on the fly.

---

## Measurement

Track these metrics. All of them should be visible in the admin Social & Sharing tab described above.

| Metric | Baseline (now) | Target (90 days) | How to Measure |
|--------|---------------|-------------------|----------------|
| Social CTR | Unknown (broken images) | 3-5% | UTM params + analytics |
| Shares per quest completion | ~0 | 0.15 (15% share rate) | Share click events |
| Referral signups | 0 | 50/month | ref param attribution |
| Referral-to-quest conversion | N/A | 40% | Referred users who complete 1+ quest |
| Crowd-pooling shares | ~0 | 0.3 per contribution | Share click events |
| OG image load success rate | ~30% (CDN 403s) | 99%+ | Server logs + social platform debuggers |

---

## Testing Checklist

Before any deploy, validate with all major platforms:

- [ ] [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [ ] [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [ ] [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
- [ ] WhatsApp (send link to yourself, check preview)
- [ ] Telegram (send link to yourself, check preview)
- [ ] iMessage (send link to yourself, check preview)
- [ ] Signal (send link to yourself, check preview)
- [ ] Slack (paste link in a channel, check unfurl)

For each platform, verify:
1. Image loads (not broken/generic)
2. Title is correct for the page
3. Description is correct and not truncated badly
4. URL shows the canonical path
5. Image is not cropped in a way that loses the main content

---

## Connection to Content Repurposing

This spec pairs directly with the `regen-content-repurposing` skill. When content is repurposed for social channels, the shared links will now have proper preview cards. The workflow becomes:

1. Write long-form content (blog, update, case study)
2. Repurpose into channel-specific short form (Twitter thread, LinkedIn post, etc.)
3. Each short-form piece links back to regencivics.earth
4. The link preview shows a real, page-specific OG card
5. Click-through brings the reader to a page with a share prompt of its own
6. The reader shares, creating another link with another preview card
7. Referral tracking attributes the chain back to the original share

This is how a single blog post becomes a week of social content that actually compounds.

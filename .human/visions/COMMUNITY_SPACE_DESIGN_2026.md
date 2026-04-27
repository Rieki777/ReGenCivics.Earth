# Community Space Redesign — Full Spec
*ReGen Civics · March 2026*

This document specifies the redesigned `/community` experience. The core idea: the community space is not a forum listing. It is a living game world, organized around four elemental archetypes, where land projects and organisations each have their own *space*, activity flows through an RSS-powered feed, and the community has real tools for stewardship and honest conversation.

---

## The Four Elements Framework

The community space is organized around four elemental archetypes. Each element shapes both the visual design of its section and the *kind of activity* it holds.

| Element | Archetype | What it holds |
|---------|-----------|---------------|
| 🌍 Earth | Rooted, place-based | Land project spaces |
| 💧 Water | Flowing, connecting | Alliance organisation spaces |
| 🔥 Fire | Energizing, transforming | Quests, challenges, and calls to action |
| 🍃 Air | Moving, honest, clearing | Hard conversations, conflict, things that need to move or be released |

The four elements are not just visual theming. They are *entry points* into different modes of community participation. A player coming in ready to act goes to Fire. A player with something difficult to raise goes to Air. A player looking to connect with specific land projects goes to Earth. A player following alliance work goes to Water.

---

## Feature Spec

### 1. 🌍 Earth — Land Project Spaces

Each active land project gets a unique card on `/community`:
- A generated landscape image as the card header (local biome, visual identity)
- Project name, location tag, and one-line focus
- "Visit Space" CTA linking to the project's forum thread
- Active/inactive status shown subtly (inactive projects are dimmer)

The Earth section is the first major section on the page, below the category bar. Cards are displayed in a 2-3 column grid on desktop, single column on mobile.

**Image generation:** One image per active land project, generated with `nano-banana-pro`. Store in `public/community/land-projects/`. Reference in Community.tsx per project name.

---

### 2. 💧 Water — Alliance Organisation Spaces

Each alliance org gets the same card treatment as land projects, but with:
- Water/network aesthetic imagery (glowing node networks, mycelial patterns, river deltas)
- A single shared banner for the Alliance Organisations section header (generated)
- Per-org cards with name, focus area, and "Visit Space" CTA

Follows directly after the Earth section.

---

### 3. 🔥 Fire — Quest & Challenge Space

A dedicated section surfacing active quests and calls to action:
- Shows the top 3-5 open quests from the quest board
- "Join the Quest" CTA links directly into the relevant quest thread
- Fire-themed visual treatment (warm amber/orange tones, radiating glow)
- Refreshed when new quests are added via admin

Replaces the current "Quest Suggestions" CTA block at the bottom — elevates it to a first-class section.

---

### 4. 🍃 Air — Moving What Needs to Move

*Added per Rye's direction.*

A dedicated section for:
- Hard conversations the community needs to have
- Threads where something is in transition or needs to be cleared
- Space for conflict to surface, be named, and be moved through
- Community health check-ins

Visually: light, airy, slightly misty. Leaf/wind motifs. Cooler tones than Fire.

In practice: a specific forum category (`air-conversations`) with threads marked for this space. Admin (and eventually community moderators) can move a thread *into* Air to signal "this needs real attention, not just replies." The Air section surfaces the 3 most recent active threads from this category.

Copy for the section header: *"Some things need to move. This is where we say the hard thing, clear what's stagnant, and make space for what comes next."*

---

### 5. ~~Leaderboard / Activity Points Display~~ — REMOVED

*Rye said no.*

A ranked leaderboard of "most active contributors" was proposed but removed. Reason: ranks how much someone posts, not the quality or depth of their contribution. Not aligned with the values of the space.

---

### 6. Live Activity Feed + RSS Integration

#### Activity feed
A scrolling feed of recent community activity — new posts, new replies, new quest completions — shown on the main `/community` page. Lightweight, real-time feeling. Shows: post title, author avatar, time, which space it's in.

#### RSS feed integration (steward feature)
Land project stewards and alliance org reps can add RSS feeds from their own channels (social media, blog, Substack, etc.) to their forum space. Once added, the feed auto-populates the forum thread with linked posts from that source.

**How it works:**
- Steward adds an RSS feed URL in their Steward Dashboard (PlayerProfile.tsx)
- A background job (or scheduled function) polls the feed every 24 hours
- New items from the feed are posted as replies in the project/org forum thread, attributed to "Automated update from [feed name]" with a link to the source
- The steward can pause or remove the feed at any time

**Schema needed:** `entityRssFeeds` table:
```ts
export const entityRssFeeds = mysqlTable("entityRssFeeds", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", ["land_project", "alliance_org"]).notNull(),
  entityId: varchar("entityId", { length: 255 }).notNull(),
  forumPostId: int("forumPostId").notNull(), // which thread to post into
  feedUrl: varchar("feedUrl", { length: 512 }).notNull(),
  feedName: varchar("feedName", { length: 255 }), // e.g. "TDF Blog", "@tdf on X"
  lastCheckedAt: timestamp("lastCheckedAt"),
  lastItemGuid: varchar("lastItemGuid", { length: 512 }), // for dedup
  addedByUserId: int("addedByUserId").notNull(),
  active: tinyint("active").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**UI:** In the Steward Dashboard, below the existing "Edit listing" section, add:
- "RSS Feeds" section showing existing feeds
- "Add feed" button opens a small form: feed URL + display name
- Each existing feed shows: name, URL, last checked, pause/remove button

**Polling:** Use a scheduled script or cron on Railway: `npx tsx scripts/poll-rss-feeds.ts` — runs daily, fetches each active feed, checks the lastItemGuid for dedup, creates forum replies for new items. No third-party services needed.

---

### 7. Bioregional Groupings

Land projects and orgs are visually grouped by bioregion in the Earth/Water sections. Projects from the same bioregion (e.g. "Wet Tropics," "Pacific Temperate Rainforest") are clustered together with a small region label. This makes it easy to see geographic proximity and find communities near you.

Implementation: uses the `bioregions` table + `applications.bioregionId` already in schema. Optional for phase 1 — can be a toggle that users enable.

---

### 8. "Who's Active" — Community Pulse Strip

A small strip near the top of the community page showing:
- X players posted this week
- X new threads opened
- X quest completions

Not a leaderboard. Just a pulse. Shows the community is alive without ranking anyone.

---

### 9. Quest Board Highlights (Fire section, see above)

Covered in feature 3.

---

### 10. "Skills Exchange" Space

A thread category where people can post:
- "I'm offering: [skill]" (e.g., legal structuring, permaculture design, web dev)
- "I'm seeking: [skill]" (e.g., bookkeeping, facilitation, video editing)

Distinct visual identity within the forum. Shows in a card format, not a list.

---

### 11. Community Map Preview

A small embedded map preview on the community page showing land project pins (using the existing `Connect.tsx` map data). Clicking a pin navigates to that project's forum thread. A "View full map" link goes to `/connect`.

---

### 12. Welcome Space for New Members

A pinned "New here?" card at the top of the community page for unauthenticated users or users who haven't yet posted. Links to:
- The Welcome Aboard quest flow
- The player profile setup
- A "What is ReGen Civics?" explainer thread

Disappears once a user has posted at least once.

---

### 13. Two-Level Content Flagging

*Rye refined this to two levels.*

Forum posts and replies can be flagged at two levels:

**Level 1 — 🖐 Tend to** (soft flag, hand icon)
- "Something here needs attention, but it's not an emergency."
- Sends a notification to community moderators and admins
- The post gets a subtle amber border/indicator visible to mods
- Use case: off-topic thread, post that's getting heated, something that could become a problem

**Level 2 — 🚩 Hard Stop** (red flag)
- "This needs to stop now."
- Immediately sends a priority alert to admins
- The post is automatically held for review (hidden from public view) until an admin reviews it
- Use case: harassment, harmful content, doxxing, serious rule violations

**Schema change needed:**
```ts
// In forumReports table — add severity field
severity: mysqlEnum("severity", ["tend_to", "hard_stop"]).default("tend_to").notNull()
```

**UI change:** The current flag button becomes a two-option dropdown:
- 🖐 Tend to — sends soft notification
- 🚩 Hard stop — hides post immediately, sends urgent alert

**Admin queue:** Admin panel shows two tabs in the Reports section: "Tend To" and "Hard Stop", each sortable by time.

---

### 14. Community Events Calendar

A lightweight "what's coming up" strip showing:
- Upcoming community calls, AMAs, quest launches
- Linked to the AMABanner component already in the page
- Admin posts events as sticky threads in a `community-events` category
- The strip shows the next 3 events with date + title

---

### 15. Progressive Space Unlocking — Revisit Later

*Rye wants to think more about what to show and how to gradually reveal.*

The idea: different parts of the community space unlock as you engage more (complete quests, post, join a project space). This creates a sense of discovery and rewards depth.

Open questions Rye wants to work through:
- What specifically is hidden vs visible to newcomers?
- Is the unlock based on quests completed, time in community, or both?
- Should it be opt-in (a "reveal more" button) or automatic?
- What does it feel like to unlock something? Is there a moment of celebration?

**Not blocking any other feature.** When Rye is ready, this adds a `communityAccessLevel` concept to user profiles and a gating layer in Community.tsx.

---

## Implementation Order

| Priority | Feature | Status |
|----------|---------|--------|
| High | 1 + 2: Earth + Water card redesign with images | Fix 70 — IN PROGRESS |
| High | 3: Fire / Quest section | New — Fix 72 |
| High | 4: Air section + `air-conversations` forum category | New — Fix 72 |
| High | 6: RSS feed integration (schema + steward UI + polling script) | New — Fix 73 |
| Medium | 13: Two-level flagging (schema + UI + admin tabs) | New — Fix 74 |
| Medium | 8: Community pulse strip | New — Fix 75 |
| Medium | 12: Welcome card for new users | New — Fix 75 |
| Medium | 10: Skills exchange space | New — Fix 76 |
| Low | 7: Bioregional groupings | New — Fix 77 |
| Low | 11: Map preview | New — Fix 77 |
| Low | 14: Events calendar strip | New — Fix 78 |
| Later | 15: Progressive unlock | Revisit with Rye |

---

## Design Notes

**Overall aesthetic:** Enchanted forest meets living game world. The current design is a good foundation. The new version adds:
- Elemental section headers with distinct color accents (earth green, water blue, fire amber, air silver-white)
- Each section has a distinctive icon cluster (not just one icon — a small visual composition)
- Card-based layout for all entity spaces (not list rows)
- Movement and life: subtle animations on hover, "living" feel vs static page

**Voice for section headers and empty states:**
- No em-dashes
- No AI patterns
- Should sound like a person inside the movement wrote it
- Warm but specific — not generic community platform copy

---

## New Fixes to Add to FIXES_TO_MAKE_2026-03-13.md

- Fix 72: Fire + Air sections on /community (quest highlights + air-conversations category)
- Fix 73: RSS feed integration (entityRssFeeds table + steward UI + poll-rss-feeds.ts script)
- Fix 74: Two-level content flagging (forumReports severity + UI + admin tabs)
- Fix 75: Community pulse strip + welcome card for new users

# Forum Coordination Layer — Design Spec
**Created:** 2026-03-11
**Purpose:** Implements the coordination infrastructure across the forum and profile system. Covers 17 accepted upgrades across four layers: Profile, Forum, Content, and Discovery. These build on the Gathering Grove structure defined in `FORUM_UPGRADES_2026-03-10.md` and the Welcome Aboard Quests in `ReGenCivics_WelcomeAboard_Brief.md`.

---

## Layer 1 — Profile Upgrades

---

### C1 — Bioregion Auto-Suggest Using One Earth Map

**Goal:** When users set their bioregion during profile setup, show smart suggestions from the One Earth bioregion framework rather than a blank text field. Allow community-submitted additions.

**What to Build:**

Seed a `bioregions` table from the One Earth bioregion dataset (846 bioregions globally). When users type in the bioregion field during onboarding or profile edit, show an autocomplete dropdown filtered by what they type.

Add a "Can't find your bioregion? Add it" button that opens a small inline form: name, general region/country, and a brief description. Submitted bioregions go into a `pending_bioregions` table for admin review. Once approved, they appear in the main autocomplete.

**One Earth data source:** https://www.oneearth.org/bioregions/ — the full dataset is available as a downloadable list. Import as a seed script on first deploy.

**DB Schema:**

```ts
// bioregions table
{
  id: serial primary key,
  name: text not null,
  slug: text unique,
  realm: text,           // e.g. "Palearctic"
  subrealm: text,        // e.g. "Western European Mixed Forests"
  source: text,          // "one_earth" | "community"
  approved: boolean default true,
  submitted_by: integer references users(id),
  created_at: timestamp
}

// User profile — bioregion field
// Add: bioregion_id integer references bioregions(id)
// alongside existing bioregion text field (text stays as fallback)
```

**Files to Create / Change:**

| File | Change |
|------|--------|
| `drizzle/schema.ts` | Add `bioregions` table + `bioregion_id` on users table |
| `scripts/seed-bioregions.ts` | Import One Earth bioregion list from JSON fixture |
| `server/routes/bioregions.ts` | GET /api/bioregions?q= (search), POST /api/bioregions/suggest (submit new) |
| `client/src/components/BioregionSelect.tsx` | Autocomplete input with One Earth suggestions + "Add new" button |
| `client/src/pages/PlayerProfile.tsx` | Use BioregionSelect in profile edit form |
| `client/src/pages/Admin.tsx` | Add pending bioregion approval queue in Admin settings |

**Priority:** Medium — needed before bioregional filtering and discovery features can work.

---

### C2 — Skills + Needs Registry (Gifts & Needs Marketplace)

**Goal:** Capture what each user offers and needs during profile setup. Surface this in a Gifts & Needs Marketplace. During onboarding, make clear that these entries feed the registry.

**What to Build:**

Add two new structured fields to the profile onboarding flow:
- **Gifts to offer** — skills, resources, time, knowledge, land, capital (already partially captured as `gifts` in bio JSON — extract and formalize)
- **What you need** — what you're looking for: collaborators, land, funding, expertise, community

During profile setup, show this copy: *"Your gifts and needs will be added to the Gifts + Needs Marketplace, where others in the network can find and connect with you."*

The marketplace (`/marketplace` or `/registry`) is a filterable list of member profiles showing offer/need pairs. Filter by: category (skills, land, capital, community), bioregion, and collaboration status.

**DB Schema:**

```ts
// gifts table (one row per gift entry per user)
{
  id: serial,
  user_id: integer references users(id),
  type: text,         // "skill" | "resource" | "time" | "knowledge" | "land" | "capital"
  description: text,
  is_active: boolean default true,
  created_at: timestamp
}

// needs table (one row per need entry per user)
{
  id: serial,
  user_id: integer references users(id),
  type: text,         // same categories
  description: text,
  is_active: boolean default true,
  created_at: timestamp
}
```

**Files to Create / Change:**

| File | Change |
|------|--------|
| `drizzle/schema.ts` | Add `gifts` and `needs` tables |
| `client/src/pages/PlayerProfile.tsx` | Add gifts/needs fields to onboarding + profile edit; show marketplace copy |
| `client/src/pages/Marketplace.tsx` (new) | Filterable registry page at `/marketplace` |
| `server/routes/marketplace.ts` (new) | GET /api/marketplace (with filters) |

**Priority:** Medium-high — core to the coordination mission.

---

### C3 — Two-Sided Collaboration Status

**Goal:** Users signal whether they're building a project and want collaborators, or looking to join an existing project. Surfaces in member listings and forum.

**What to Build:**

Add a `collaboration_status` field to the user profile with three states:
- `null` — no signal set (default)
- `seeking_collaborators` — "I have a project and am looking for people to join"
- `looking_to_join` — "I'm looking for a project to contribute to"

Display as a badge on profile cards and member listings. Filterable in the member directory.

Label copy:
- "Seeking collaborators" — shown with a small team/group icon
- "Looking to join" — shown with a compass or "open door" icon

Users set this in their profile settings under a new "Collaboration" section.

**DB Schema:**

```ts
// Add to users table:
collaboration_status: text  // null | "seeking_collaborators" | "looking_to_join"
```

**Files to Change:**

| File | Change |
|------|--------|
| `drizzle/schema.ts` | Add `collaboration_status` to users table |
| `client/src/components/ProfileEditForm.tsx` | Add collaboration status toggle in profile settings |
| `client/src/components/ProfileCard.tsx` | Show collaboration badge when status is set |
| `client/src/pages/Community.tsx` (or member directory) | Add filter by collaboration_status |

**Priority:** Medium — high signal-to-noise value with minimal effort.

---

### C4 — Intro Structured Prompts: Bioregion + Dreaming-Of

**Goal:** Add "What bioregion do you call home?" and "What are you dreaming of building or becoming?" as explicit onboarding profile questions, stored in DB as separate fields (not buried in bio JSON).

**What to Build:**

In the profile setup / onboarding flow, add two new required questions:

1. **"What bioregion do you call home?"** — uses `BioregionSelect` component from C1
2. **"What are you dreaming of building or becoming?"** — open text, 2-3 sentence prompt. Placeholder: *"A food forest in the highlands, a new form of school, a way of living that heals rather than harms..."*

Both are stored as top-level fields in the `users` table (not as JSON inside `bio`), so they can be indexed and used for connection matching.

These also display on the public profile card when set.

**DB Schema:**

```ts
// Add to users table:
bioregion_id: integer references bioregions(id),    // from C1
dreaming_of: text                                    // freeform
```

**Files to Change:**

| File | Change |
|------|--------|
| `drizzle/schema.ts` | Add `dreaming_of` to users table (bioregion_id already added in C1) |
| `client/src/pages/PlayerProfile.tsx` | Add both questions to onboarding setup flow |
| `client/src/components/ProfileEditForm.tsx` | Add both as editable fields |
| `client/src/components/ProfileCard.tsx` | Display both on profile if set |

**Priority:** Medium-high — powers the discovery/matching features in Layer 4.

---

## Layer 2 — Forum Upgrades

---

### C5 — Post Tags: #lesson, #seeking-support, #offering-support

**Goal:** Cross-cutting post tags that let community members signal intent and filter for what they need.

**What to Build:**

Add three new system tags to the forum post interface. Tags can be toggled on any post (beyond the existing section/topic structure).

- `#lesson` — this post contains a documented insight or learning from real practice
- `#seeking-support` — the author needs help, feedback, or expertise
- `#offering-support` — the author has something to give or wants to help others

Tags appear as small badges on posts in listings. Filter controls at the top of each forum section allow users to filter by any tag. Cross-section "filtered view" pages:
- `/community/lessons` — all #lesson posts across the forum
- `/community/seeking-support` — all #seeking-support posts
- `/community/offering-support` — all #offering-support posts

These three pages should be linked from the forum navigation and from the member discovery section.

**Priority:** Medium — lightweight to implement, high coordination value.

---

### C6 — Case Study Thread Format

**Goal:** Provide a structured template for projects and individuals to share honest retrospectives: what they tried, what worked, and what didn't.

**What to Build:**

Add a "Case Study" post type in the Learning + Resources section. When a user selects "Post a Case Study," they get a pre-filled template with these sections:

```
What we tried
  [1-2 paragraphs: the project, context, and what was attempted]

What worked
  [Specific outcomes, results, unexpected wins]

What did not work
  [Honest challenges, failures, pivots required]

What we would do differently
  [Recommendations for others]

Resources + links
  [Optional: tools, people, orgs that helped]
```

Case Studies get the `#lesson` tag automatically. They appear in a "Case Studies" pinned sub-section in Learning + Resources and in the `/community/lessons` filter view.

**Priority:** Medium — becomes one of the highest-value content types over time.

---

### C7 — "I Tried This" Follow-Up Tag

**Goal:** When a community member tries an idea from an existing forum thread, they can tag their follow-up reply or new post as "I tried this" — creating a record of outcomes.

**What to Build:**

Add an "I tried this" tag option on replies and new posts. When used:
- The reply is displayed with a distinct badge: "✓ Tried this"
- In thread listings, threads with "I tried this" replies show a small indicator: "X people tried this"
- The `/community/lessons` filter page includes "I tried this" posts alongside #lesson tags

This is effectively a reply type/tag, not a full new system. Lightest implementation: a checkbox in the post composer labeled "I tried something from this thread or a similar one — document my experience."

**Priority:** Low-medium — high future value but can be added later once case studies are live.

---

### C8 — "Idea → Experiment → Result" Thread Chain

**Goal:** Let a conversation move through documented stages: idea discussion → implementation attempt → outcome. These chains become the movement's living knowledge base.

**What to Build:**

Add a "Thread Stage" field to forum posts with three values: `idea`, `experiment`, `result`. When a post is part of a chain:
- The stage badge shows prominently on the post (🌱 Idea / 🔬 Experiment / 🌿 Result)
- Posts in the same chain are linked: "Part of the [Composting System] thread chain → View all"
- A new `/community/chains` filter page shows all active chains and their current stage

Chain creation: when a user creates a new post, they can optionally mark it as "continuing a thread chain" and link back to the original post. The chain is then cross-referenced.

This pairs naturally with the Case Study format (C6) — a Case Study can be the "Result" entry of a chain.

**Priority:** Medium — architectural, worth getting right before implementing.

---

### C9 — Knowledge Cluster Index Posts (Pinned per Section)

**Goal:** Each Gathering Grove section has one pinned "Knowledge Map" post maintained by a curator or Claude. It lists the best threads on each sub-topic in that section, organized and linked.

**What to Build:**

For each of the 8 Gathering Grove sections, create an additional pinned post titled: "Knowledge Map: [Section Name]". This post is maintained as a living index.

Structure of each Knowledge Map post:

```
Knowledge Map: Learning + Resources

Last updated: [auto-date]

### Foundations
- [Foundational Series Watch Party →]
- [Community reading list →]

### Bioregional Practice
- [Bioregional Wisdom: What Does Your Land Teach →]

### Tools + Methods
- [Best practices for [topic] →]

[Suggest a thread to add →] (links to a simple nomination form or reply)
```

Claude auto-scans for high-engagement threads weekly and suggests additions to each Knowledge Map. Admins approve additions from the admin panel.

**Admin interface (in /admin → Forum section):**
- View suggested additions per section
- One-click approve/edit/reject
- Shows current state of each Knowledge Map

**Priority:** Medium — high long-term value, moderate implementation effort.

---

### C10 — Project Co-founder + Team Builder Threads

**Goal:** A dedicated space for people to post "I'm building this and need help" — distinct from general project showcases and open to anyone, not just projects in the incubator.

**What to Build:**

Add a "Seeking Team" sub-section within Quests + Gameplay (or as its own Gathering Grove section if volume warrants). Thread template for "Seeking Team" posts:

```
Project name or working title
What stage you are at (idea / prototype / active / scaling)
What you are building (2-3 sentences)
Roles you are looking for (with brief description of each)
Skills or experience that would help
Time commitment (hours/week, duration)
How to express interest (reply here / DM / email)
```

Posts in this sub-section display with a "Seeking Team" badge. Users with `collaboration_status: seeking_collaborators` (C3) are encouraged to post here.

**Priority:** Medium — enables direct coordination, lightweight to build.

---

## Layer 3 — Content + Broadcast

---

### C11 — AMA Banner + Admin Control

**Goal:** Highlight upcoming Ask Me Anything sessions prominently in the forum and on /schedule. Admin sets the details; the banner auto-removes after the AMA date passes.

**What to Build:**

**DB / Settings:**

Add an `upcoming_ama` settings record (or a simple table for recurring AMAs):

```ts
{
  id: serial,
  project_name: text,     // e.g. "Amora Costa Rica"
  host_name: text,
  date: date,             // 2026-04-26
  time: text,             // "11:00 AM EST"
  timezone: text,         // "EST"
  forum_thread_url: text, // link to the AMA thread in the forum
  is_active: boolean,
  created_at: timestamp
}
```

**Banner component:**

Creates a dismissible banner that appears:
1. At the top of the Gathering Grove forum (`/community`)
2. On the `/schedule` page

Banner copy (auto-generated from admin settings):
```
🎙️ Next AMA: Amora Costa Rica — April 26th at 11:00 AM EST
[Join the conversation →]
```

Banner auto-hides (sets `is_active: false`) at midnight on the day after the AMA. Users can also dismiss it individually (localStorage flag per AMA id).

**Admin interface (`/admin` → new "Events" section or existing Settings):**

```
Upcoming AMA
  Project / Host name:   [Amora Costa Rica]
  Date:                  [2026-04-26]
  Time + Timezone:       [11:00 AM EST]
  Forum thread URL:      [https://regencivics.earth/community/...]
  [Save]  [Clear / Mark Complete]
```

**First AMA to configure:** Amora Costa Rica, April 26th at 11:00 AM EST.

**Files to Create / Change:**

| File | Change |
|------|--------|
| `drizzle/schema.ts` | Add `upcoming_amas` table |
| `server/routes/ama.ts` (new) | GET /api/ama/upcoming, POST /api/admin/ama (create/update) |
| `client/src/components/AMABanner.tsx` (new) | Dismissible banner with AMA details |
| `client/src/pages/Community.tsx` | Mount AMABanner at top of forum |
| `client/src/pages/Schedule.tsx` | Mount AMABanner on schedule page |
| `client/src/pages/Admin.tsx` | Add AMA management UI in Events/Settings |

**Priority:** High (first AMA is April 26th — needs to be live before then).

---

### C12 — AI Digest + Newsletter Signup

**Goal:** Claude auto-generates a periodic "Best of the Forum" digest from high-engagement threads. Community members can subscribe to receive it by email.

**What to Build:**

**AI Digest generation:**

A scheduled server job (weekly or bi-weekly) runs a Claude API call that:
1. Pulls the top N threads from the past period by engagement (replies + reactions)
2. Generates a short digest: 3-5 highlighted threads with a 2-sentence summary each
3. Saves the digest to a `digests` table
4. Posts the digest as a new pinned thread in the Gathering Grove (Announcements or its own section)
5. Sends the digest email to all newsletter subscribers

**Newsletter signup:**

Add a simple email signup form in three places:
- Forum landing page footer
- Forum sidebar (if applicable)
- Player profile settings ("Subscribe to the ReGen Civics digest")

Email stored in a `newsletter_subscribers` table (or use existing email infra if present).

**DB Schema:**

```ts
// digests table
{
  id: serial,
  generated_at: timestamp,
  period_start: date,
  period_end: date,
  content_md: text,      // the generated digest markdown
  forum_post_id: integer, // reference to the posted thread
  sent_at: timestamp
}

// newsletter_subscribers table (if not already exists)
{
  id: serial,
  email: text unique,
  user_id: integer references users(id), // null if anonymous
  subscribed_at: timestamp,
  active: boolean default true
}
```

**Claude prompt for digest generation:**

```
You are the ReGen Civics community curator. Review the following forum threads from the past [period] and write a short, engaging digest for the community. For each of the 3-5 most valuable threads, write: the thread title as a link, a 2-sentence summary of what was discussed or discovered, and why it matters to the Regenerative Renaissance. Keep the tone warm, human, and forward-looking. No em-dashes. Plain language throughout.

[forum thread data]
```

**Files to Create / Change:**

| File | Change |
|------|--------|
| `server/jobs/digestJob.ts` (new) | Scheduled job: pull threads → Claude API → save digest → post to forum → send email |
| `server/routes/newsletter.ts` (new) | POST /api/newsletter/subscribe, DELETE /api/newsletter/unsubscribe |
| `drizzle/schema.ts` | Add `digests` and `newsletter_subscribers` tables |
| `client/src/components/NewsletterSignup.tsx` (new) | Signup form component |
| `client/src/pages/Community.tsx` | Add newsletter signup to forum footer/sidebar |
| `client/src/pages/PlayerProfile.tsx` | Add digest subscription toggle in profile settings |

**Priority:** Medium — the AI digest is a high-value retention mechanism.

---

### C13 — Claude-Maintained Movement Glossary

**Goal:** A living glossary of ReGen Civics terms, auto-updated by Claude as new words and concepts emerge in forum threads. Admins approve additions.

**What to Build:**

**The glossary page:** `/community/glossary` — a clean, browseable list of terms with their definitions and source context.

**Auto-discovery:**

A scheduled job (runs after each AI digest job, or weekly) scans recent forum threads for:
- New terms used with apparent specificity (words used in quotes, defined in context, or explained as if new)
- Existing terms used in new or expanded ways

Claude proposes new entries:
```
Term: "Seed Gift"
Proposed definition: A gift of value (money, time, skills, land) offered to the network without conditions, catalyzing reciprocal giving.
Source context: Used in 4 threads this month, most clearly defined in: [thread link]
```

Admin sees proposed additions in `/admin → Glossary` and can approve, edit, or reject.

**DB Schema:**

```ts
// glossary_terms table
{
  id: serial,
  term: text unique,
  definition: text,
  source_thread_url: text,   // where it was first clearly defined/used
  proposed_at: timestamp,
  approved_at: timestamp,
  approved_by: integer references users(id),
  status: text               // "proposed" | "approved" | "rejected"
}
```

**Files to Create / Change:**

| File | Change |
|------|--------|
| `server/jobs/glossaryJob.ts` (new) | Scheduled job: scan threads → Claude API → propose new terms |
| `server/routes/glossary.ts` (new) | GET /api/glossary, POST /api/admin/glossary/approve |
| `drizzle/schema.ts` | Add `glossary_terms` table |
| `client/src/pages/Glossary.tsx` (new) | Public glossary page at `/community/glossary` |
| `client/src/pages/Admin.tsx` | Add glossary approval queue in Admin |

**Priority:** Low-medium — high long-term cultural value, low urgency.

---

## Layer 4 — Discovery + Matching

---

### C14 — Active Projects Forum Section (Auto-Populated from /apply)

**Goal:** Every project that applies via `/apply` gets a dedicated forum thread in a new "Active Projects" section. Projects post updates there; community members can comment. The `/map` page links to each project's forum thread.

**What to Build:**

**New Gathering Grove section:** "Active Projects"

When a project application is submitted via `/apply` and marked as accepted/active by admins:
1. Automatically create a forum thread in the Active Projects section
2. Thread title: `[Project Name] — [Bioregion]`
3. Thread body: auto-populated from application data (project name, location, bioregion, what they're building, current stage, what help they need)
4. Project team members (if they have accounts) are assigned as thread moderators

**Forum thread template (auto-generated):**

```
[Project Name] is a [project type] based in [location], [bioregion].

What we are building: [application field]
Current stage: [application field]
What we need: [application field]

Follow this thread for updates from the team and join the conversation.

[Apply to support this project →]  [View on map →]
```

**Map integration:**

`/map` project pins gain a "Forum thread →" link that navigates to the project's Active Projects thread.

**Files to Create / Change:**

| File | Change |
|------|--------|
| `server/routes/projects.ts` | On application approval: auto-create forum thread via forum API |
| `client/src/pages/Community.tsx` | Add "Active Projects" as a new Gathering Grove section |
| `client/src/pages/Map.tsx` | Add "Forum thread →" link to project map pins |
| `client/src/pages/Admin.tsx` | Application approval flow triggers forum thread creation |

**Priority:** Medium-high — core to the incubator ↔ community connection.

---

### C15 — "Needs Each Other" + "Similar Projects" Tags

**Goal:** Enable admins and community to tag when two projects complement each other (one needs what the other offers) and when projects share similar approaches.

**What to Build:**

**"Needs Each Other" cross-links:**

Admins (or eventually community members) can link two projects or forum threads as "needs each other." This shows in both threads:

```
🤝 This project may complement:
   [Timber Frame Housing Collective] — They build what you need.
   [View connection →]
```

Suggested use: a project building affordable housing on land is linked to a land project that needs housing infrastructure.

**"Similar Projects" cross-links:**

Link threads/projects that share an approach, bioregion, or focus area:

```
🌿 Related projects:
   [Hazel Hill Commons] — regenerative land stewardship, UK
   [Casa Tierra] — similar permaculture approach
```

Both link types are stored in a `project_connections` table and displayed in the relevant forum threads and project cards on `/map`.

**DB Schema:**

```ts
// project_connections table
{
  id: serial,
  project_a_id: integer,  // forum thread or project id
  project_b_id: integer,
  connection_type: text,  // "needs_each_other" | "similar"
  note: text,             // short explanation of the connection
  created_by: integer references users(id),
  created_at: timestamp
}
```

**Files to Create / Change:**

| File | Change |
|------|--------|
| `drizzle/schema.ts` | Add `project_connections` table |
| `server/routes/connections.ts` (new) | GET/POST /api/connections |
| `client/src/components/ProjectConnections.tsx` (new) | Displays "Needs Each Other" and "Similar Projects" links |
| `client/src/pages/Admin.tsx` | UI for admins to create/manage connections |

**Priority:** Medium — powerful coordination signal once Active Projects section is live.

---

### C16 — New Member Discovery Path

**Goal:** After onboarding, surface 3 relevant projects and 3 relevant people based on the new member's bioregion, skills, and what they're dreaming of.

**What to Build:**

After a player completes their profile setup (triggers same condition as the QuestStartPopup), show a "Discover" section or page with three personalized recommendations in each category:

**People near you:** Members in the same or neighboring bioregion. Filter: `bioregion_id = user.bioregion_id OR bioregion.realm = user.bioregion.realm`

**Projects that need what you offer:** Active Projects whose "what we need" field matches any category from the user's gifts (C2). Fuzzy match via Claude or keyword matching initially.

**Projects doing what you're dreaming of:** Active Projects whose description shares themes with the user's `dreaming_of` field (C4). Use Claude API for similarity comparison initially; migrate to vector search when volume warrants.

**UI placement:**

A new tab or section in PlayerProfile: "Discover" — visible after first profile completion. Also shown as a step in the welcome flow.

**Files to Create / Change:**

| File | Change |
|------|--------|
| `server/routes/discovery.ts` (new) | GET /api/discovery (returns personalized suggestions based on user profile) |
| `client/src/components/DiscoverTab.tsx` (new) | Displays people + project recommendations |
| `client/src/pages/PlayerProfile.tsx` | Add Discover tab post-onboarding |

**Priority:** Medium — high impact for new user activation, depends on C2 (gifts/needs) and C4 (dreaming-of) being in place first.

---

### C17 — Optional Bioregional Tagging on Forum Posts

**Goal:** Posts that are about or connected to a specific place can optionally be tagged with a bioregion. This lays the groundwork for a future map view without requiring it now.

**What to Build:**

In the post composer, add an optional "Tag a bioregion" field using `BioregionSelect` (C1). When set:
- A small bioregion badge appears on the post in listings
- The post becomes filterable: "Show only posts from [my bioregion]"
- Posts in the Land Projects and Active Projects sections prompt bioregional tagging by default (but still optional)

**Filter controls:**

Add a "Filter by bioregion" dropdown at the top of the Gathering Grove forum. Defaults to "All bioregions." If the user has a bioregion set on their profile, default to "My bioregion + neighbors."

This data can later feed a map view (`/map` extended to show forum activity per bioregion).

**Files to Change:**

| File | Change |
|------|--------|
| Forum post composer component | Add optional bioregion tag field |
| `client/src/pages/Community.tsx` | Add bioregion filter to section headers |
| `server/routes/forum.ts` | Add bioregion filter to thread query |

**Priority:** Medium — foundational for future map integration.

---

## Implementation Notes

**Sequencing recommendation:**

Start with the profile layer (C1–C4) since all discovery features depend on having clean structured data. Then AMA banner (C11) since it has a deadline. Then Active Projects (C14) since it connects the incubator to the community. The post tag and thread format upgrades (C5–C10) can be layered in alongside content work.

**Dependencies:**

- C16 (Discovery) requires C2 (Gifts/Needs) and C4 (Dreaming-of) to be in DB first
- C15 (Needs Each Other) requires C14 (Active Projects) to have data
- C9 (Knowledge Map posts) and C13 (Glossary) require Claude API job infra — build alongside C12 (Digest)
- C17 (Bioregional tagging) requires C1 (Bioregion table) to be seeded

**Skipped / deferred:**

- Idea #11 (standalone project directory) — superseded by `/apply` flow already live
- Idea #13 (seasonal spotlight) — deferred
- Idea #19 (ecosystem map thread) — use localscale.org as a linked resource instead

**localscale.org reference:** In the Learning + Resources section of the Gathering Grove, add a pinned "External Resources" note linking to localscale.org as the go-to resource for discovering what exists in each bioregion.

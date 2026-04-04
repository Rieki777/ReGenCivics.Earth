# Team Page Copy -- Master Document

All user-facing text on the Team page (`/team`), extracted for editing. Once updated, Claude Code applies changes back to `client/src/pages/Team.tsx` and `client/src/data/gameRoles.ts`.

Writing rules apply: no em-dashes, no contrast-framing, no AI words, no rhetorical questions, no passive inspiration.

---

## Hero Section

**Badge:** A Dynamic, Self-Organizing Team

**Heading:** Who We Are

**Body:**
We're not your average organisation. We use the same tools we help Land Projects adopt to co-create a constantly evolving organism of passionate individuals united by a shared purpose: catalyzing the Regenerative Renaissance.

**Subtext:**
Over 150 people have helped build this infrastructure. No single face is more important than another, so we list none.

**CTA Button:** Explore Our Living Organization
**CTA Link:** https://app.hypha.earth/en/dho/regen-civics

---

## Mission Statement

Welcome to an adventure in co-creating organizations for a Regenerative Civilization

---

## How to Join the Game

**Heading:** How to Join the Game

**Subheading:** Playing the game of ReGen Civics starts with discovering your unique contribution

### Steps:

**1. Join Community Sessions**
Attend our regular gatherings to learn about the game and meet fellow players.
Link: /schedule ("View Schedule")

**2. Try Out Some Quests**
Start with small quests to get a feel for how we work and build trust.
Link: /quest ("Explore Quests")

**3. Explore Compensation**
Review historical compensation for similar contributions to see if it aligns with your needs.
Link: /community/post/624 ("Ask in Forum")

**4. Check for Collaborators**
Is anyone else already working on the same area? Ask them if your help would be appreciated!
Link: /socials ("Connect with Others")

**5. Find Your Ikigai**
Discover the intersection of what you love, what you're great at, what we need, and what we can compensate.

**6. Make a Proposal**
Propose your contribution and agree on fair value exchange with the community. We prioritize 1st time proposals from those already active in the ReGen Game Space.
Links: ReGen Civics Space (https://app.hypha.earth/en/dho/regen-civics/agreements), ReGen Game Space (https://app.hypha.earth/en/dho/regen-games/agreements)

---

## The Regenerative Ikigai

**Heading:** The Regenerative Ikigai

**Body:**
At the heart of how we work is our Regenerative Ikigai: finding the sweet spot where our passion, skills, purpose, and livelihood intersect in service of regeneration.

**Image caption:**
Ikigai (生き甲斐) is a Japanese concept meaning "a reason for being" - a purpose in life that makes one's life worthwhile.

**Goal statement:**
Our goal is a civilization designed around organisations filled with people playing out their Regenerative Ikigai's in service to life.

---

## Our Commitments (Core Values)

**Heading:** Our Commitments
**Subheading:** The values that guide how we work together

1. **Honesty (with Empathy)** -- We speak truth with care, balancing directness with compassion for each other's journeys.
2. **Transparency** -- Our processes, decisions, and finances are open for all members to see and understand.
3. **Responsibility** -- We own our commitments and hold ourselves accountable to the community.
4. **Focus** -- We channel our energy toward what matters most for the Regenerative Renaissance.
5. **Compassion** -- We approach each other and our work with kindness, understanding, and care.
6. **For Anyone, Not Everyone** -- We welcome explorers who are among the first to study and develop new ways of being. This path isn't for everyone, but it might be for you.

---

## 5 Archetypal Contributions

**Heading:** 5 Archetypal Contributions
**Subheading:** Different ways to contribute to the regenerative movement

1. **Building & Developing** -- Creating tools, systems, and infrastructure that serve the regenerative movement.
   Examples: Building out our Game platform, Creating infrastructure for our portfolio of land projects, Developing governance tools, Building dashboards and tracking systems

2. **Researching & Architecting** -- Designing frameworks, exploring possibilities, and mapping the path forward.
   Examples: Designing tokenomics models, Researching regenerative land practices, Creating organizational frameworks, Mapping ecosystem relationships

3. **Facilitating & Space Holding** -- Creating containers for collaboration, learning, and community growth.
   Examples: Facilitating community sessions, Hosting Season incubators, Running onboarding calls, Holding space for conflict resolution

4. **Catalyzing & Connecting** -- Weaving relationships, building bridges, and sparking new possibilities.
   Examples: Helping onboard new land projects, Making key introductions to alliances, Connecting investors with projects, Building partnership networks

5. **Storytelling & Communicating** -- Sharing our vision, documenting our journey, and inspiring others to join.
   Examples: Amplifying the story of our movement, Creating content that inspires, Documenting our journey, Managing social media presence

---

## Roles of the Infinite Game

**Badge:** Choose Your Role

**Heading:** Roles of the Infinite Game

**Body:**
Every role is a way to play. Each one has specific powers, rights, responsibilities, and token rewards. Roles belong to the Game, filled by players each season through community vote. Click any role to enter its portal.

**Missing role callout:**
See a role missing? Let us know in our community!
Link: /community

### The 13 Roles (data lives in client/src/data/gameRoles.ts):

| # | Role Title | Character Name | Tagline | Circle | Assignment |
|---|-----------|---------------|---------|--------|------------|
| 1 | Season Facilitator | The Gardener | Keeps the seasons turning | Incubation Circle | Filled, seeking 1-2 co-facilitators |
| 2 | Alliance Weaver | The Weaver | Connects what wants to be connected | Alliance Circle | Open |
| 3 | Incubator Guide | The Guide | Walks beside new roots | Projects Circle | Open, 2 positions |
| 4 | Forum Gardener | The Tender | Grows conversations into community | Community Circle | Open |
| 5 | Game Designer | The Architect | Designs the rules we play by | Anchor Circle | Partially filled, support needed |
| 6 | Treasury Steward | The Keeper | Balances seeds and coins | Finance Circle | Partially filled, seeking support |
| 7 | Storyteller | The Storyteller | Turns what happened into what matters | Communications Circle | Open |
| 8 | Grand Builder | The Tinkerer | Builds the world one tool at a time | Tech Circle | Partially filled, builders needed |
| 9 | Security Reviewer | The Ranger | Keeps our digital commons safe | Tech Circle | Golden opportunity |
| 10 | Tool Curator | The Librarian | Organizes what the builders make | Community Circle | Open |
| 11 | Quest Steward | The Cartographer | Maps the paths players walk | Community Circle | Open |
| 12 | Outreach Writer | The Herald | Carries the signal outward | Communications Circle | Open |
| 13 | Skills Builder | The Alchemist | Turns code into community tools | Tech Circle | Open |

(Full role details with powers, rights, responsibilities, domains, and token awards are in `CLAUDE_CODE_PROMPT_2026-04-02_TEAM_ROLES.md` Part A and in `client/src/data/gameRoles.ts`.)

---

## Seasonal Rhythm Section

(Rendered by `<SeasonalRhythmSection />` component. Copy lives in `client/src/components/SeasonalRhythmSection.tsx`.)

**Heading:** The Seasonal Rhythm

**Body:**
The Infinite Game moves in seasons. Each season has different roles and needs. As players, we choose which seasons are right for us, when it's right for us.

### The Four Seasons:

**Winter (Dec - Feb) -- Building & Preparing** (CURRENT)
We build the tools, write the code, upgrade our systems and processes. This is the season of deep work: architecture, game design, skill creation, infrastructure. The builders and designers are in their element.
Active roles: Grand Builder, Security Reviewer, Game Designer, Skills Builder, Tool Curator, Quest Steward

**Spring (Mar - May) -- Incubation & Growth**
The incubator opens. Land projects apply, get matched with guides, and begin their journey. The community is buzzing with new energy, new faces, new ideas. Outreach is at full volume.
Active roles: Season Facilitator, Incubator Guide, Alliance Weaver, Outreach Writer, Forum Gardener, Storyteller

**Summer (Jun - Aug) -- Festivals & Village Building**
We go on the ground. Village building festivals, in-person gatherings, land project visits, community celebrations. The digital work meets the physical world. This is where the theory becomes soil under your feet.
Active roles: Season Facilitator, Alliance Weaver, Storyteller, Incubator Guide

**Fall (Sep - Nov) -- Rest & Reflection**
We step out of our Infinite Game roles and focus on family, in-person village life, personal projects. The community rests. The treasury and forum roles keep a gentle rhythm, but the pace slows intentionally. We compost what we learned.
Active roles: Treasury Steward, Forum Gardener

### How Seasons Work:

Each season starts with a Season Festival: a community gathering where we reflect on the previous season, share updates, run Q&A, co-create ideas for what's next, and collectively align on the shared purpose going forward.

From there, we craft the roles the next season needs. Community members submit applications for the roles they want to fill, and all Voice Holders vote on who fills what. This is how we staff the ReGen Game side of things.

The Fund side ($RCivics) works differently and is mostly about investor relations and land project valuation. That team stays small. The ReGen Civics Game team ($ReGen) is massive and growing. That's where the future is.

### The Lunar Rhythm:

Within each season, we coordinate on the moon cycle. This is rooted in biology: humans tend to have more outward energy during the full moon and more inward energy during the new moon. We organize the Game around cycles we can literally see happen in the sky.

**Full Moon Energy:** Community calls, team meetings, outward-facing work. This is when we connect, share, coordinate, and make decisions together.

**New Moon Energy:** Deep individual work. Building the tool, writing the blog, coding the feature, designing the quest, engaging in the forum. The doing of the role.

Both energies run throughout the whole cycle. The rhythm fluctuates, not switches. Some weeks you're in meetings. Some weeks you're heads-down building. The moon gives us a shared pulse.

---

## How to Apply

(Rendered by `<HowToApplySection />` component. Copy lives in `client/src/components/HowToApplySection.tsx`.)

**Heading:** How to Apply
**Subheading:** You pitch for a role for a season. Here's the process.

**Step 1: Choose a role and prepare your pitch**
Pick a role from the list above. Read its powers, responsibilities, and seasonal activity. Think about what you'd bring to it this coming season and what specific outcomes you'd commit to delivering.

**Step 2: Record a 3-minute video introduction**
Tell us who you are, why this role calls to you, what relevant experience you bring, and what you'd deliver this season. Keep it real. We care about the person behind the pitch, not the polish.

**Step 3: Submit your application**
Applications open at the Season Festival. Submit your video pitch and a written summary through the application form. The team reviews applications monthly during active seasons, and seasonally during quieter ones.
Link: /connect?path=role ("Go to Application Form")

**Step 4: Community vote**
All Voice Holders vote on role assignments. Voting happens on Hypha, where every proposal is transparent and every vote is recorded. The community decides who plays what role.

**Step 5: Play your role**
Once approved, you hold the role for the season. Your contributions are tracked, your $ReGen tokens accumulate, and at the end of the season the community evaluates outcomes during the next Season Festival.

**CTA:** Apply for a Role
**CTA Link:** /connect?path=role

---

## Our Philosophy

**Heading:** Our Philosophy

1. **Members Don't Sell Their Time** -- We contribute value, not hours. Compensation is based on impact and outcomes, not time spent.
2. **Power-With, Not Power-Over** -- We practice collaborative leadership where influence comes from contribution and wisdom, not position.
3. **Inspiration Over Delegation** -- We inspire action through shared vision rather than assigning tasks through hierarchy.
4. **Learning Over Failing, Successfully** -- Every experiment teaches us something. We embrace iteration and continuous improvement.
5. **Dynamically Self-Organizing** -- We adapt and reorganize around the Regenerative Renaissance's evolving needs.

---

## Transparent Governance

**Badge:** Transparent Governance

**Heading:** See How We Co-Govern

**Body:**
Explore our Hypha Space to see how we transparently govern, send funds, and make decisions. Everything is open.

**CTA:** Explore Our Hypha Space
**CTA Link:** https://app.hypha.earth/en/dho/regen-civics/agreements

**Three features:**
1. **Democratic Decisions** -- Every major decision is voted on by community members
2. **Transparent Funds** -- Track every transaction and see where funds flow
3. **Open Agreements** -- All agreements and policies are publicly accessible

---

## Final CTA

**Heading:** Ready to Explore?

**Body:**
Dive into our living organization on Hypha to see who's currently contributing, what projects are active, and how you might find your place in the regenerative movement.

**CTA 1:** Explore ReGen Civics DAO Space (https://app.hypha.earth/en/dho/regen-civics)
**CTA 2:** Start With Quests (/quest)

---

## Known Issues / Notes for Editing

- Step 4 in "How to Join" links to `/socials`. Should this link to `/community` (the forum) instead? The user is moving all communication internal.
- "How to Join" section and "How to Apply" section serve different purposes: "Join" is about getting started as a community member, "Apply" is about pitching for a specific seasonal role. Make sure edits preserve this distinction.
- The `openRoles` array (lines 139-204 in Team.tsx) is legacy data that's still in the file but no longer rendered. The `gameRoles` from `@/data/gameRoles.ts` are what actually display. The old `openRoles` and `RoleModal` component can be removed in a cleanup pass.

## Changes Made (2026-04-03)

- **Step 3 link added:** "Go to Application Form" link to `/connect?path=role` added to Step 3 in HowToApplySection.tsx
- **Role card Apply button fixed:** RolePortalCard.tsx now passes `?path=role&role=...&circle=...&purpose=...` in the URL so the Connect form pre-fills with that role's info
- **Video pitch field added:** New "3-Minute Video Pitch" URL field added to the Connect form's role application path (between season deliverables and CV/website)
- **DB migration:** `drizzle/0102_add_video_pitch_url.sql` adds `videoPitchUrl` column to `general_inquiries` table (Rye must run migration)

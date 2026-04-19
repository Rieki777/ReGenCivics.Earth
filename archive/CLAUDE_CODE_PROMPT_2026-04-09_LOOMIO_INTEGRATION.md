# Claude Code Prompt: Loomio-Inspired Collaborative Decision-Making for ReGen Civics Forum

## What You're Doing

You are designing and speccing out a collaborative decision-making feature for the ReGen Civics forum. This is a research and planning task. Do not write implementation code until you have produced a full spec document. Your deliverable is a `LOOMIO_INTEGRATION_SPEC_2026-04-09.md` file saved to the project root.

---

## Context: What ReGen Civics Is

ReGen Civics is a fund and in-real-life game for supporting regenerative land projects. It runs a web app at regencivics.earth. The forum is the primary community space where land projects, alliance partners, contributors, and the broader regen movement connect.

The forum is not a passive message board. It is part of the governance and coordination layer of the whole system. Proposals happen here. Agreements get ratified here. Land projects are accountable here. So collaborative decision-making is not a nice-to-have; it is central to what this forum needs to become.

---

## Tech Stack

- **Frontend**: React + TypeScript, tRPC client, Tailwind CSS
- **Backend**: Node.js, tRPC, Drizzle ORM
- **Database**: MySQL on Railway
- **File storage**: Cloudflare R2 (S3-compatible)
- **Auth**: Session-based, userId available in ctx.session
- **Forum tables**: `forumPosts`, `forumReplies`, `forumCategories`
- **Existing proposal pattern**: `communityAgreements` + `communityAgreementVotes` tables (see `drizzle/schema.ts` and `drizzle/0086_community_agreements.sql`)
- **Quest suggestion pattern**: `questSuggestions` + `questSuggestionVotes` (see `server/db.ts` and `client/src/pages/QuestSuggestions.tsx`)

---

## Key Files to Read First

Before doing anything else, read these files to understand the existing patterns:

1. `drizzle/schema.ts` -- full DB schema, especially `forumPosts`, `forumReplies`, `forumCategories`, `communityAgreements`, `communityAgreementVotes`, `questSuggestions`, `questSuggestionVotes`
2. `server/db.ts` -- look for `listQuestSuggestions`, `createQuestSuggestion`, `toggleQuestVote`, `getUserQuestVotes`, and the community agreements equivalents
3. `server/routes/forum.ts` -- how forum posts and replies are structured, what fields they have
4. `client/src/pages/QuestSuggestions.tsx` -- the full propose-and-vote UI pattern
5. `client/src/pages/CommunityGuidelines.tsx` -- the newer community agreements UI (may be in progress)
6. `client/src/pages/Community.tsx` -- how the forum is organized into sections and categories
7. `COMMUNITY_AGREEMENTS_PLAN.md` -- the active sprint plan, which describes what's already being built (community agreements ratification). Your Loomio spec should extend this, not conflict with it.
8. `CONTEXT_THE_TWO_GAMES.md` -- essential context on how the Fund and the Game relate. Decision-making features will need to account for these two distinct governance tracks.

---

## Study Loomio

### 1. Read the source code

The Loomio repository is at `C:/Users/taren/Desktop/loomio`. This is a full Ruby on Rails + Vue.js application. You are not porting it. You are learning from it.

Key things to look for:
- What decision types does Loomio support? (polls, ranked choice, consent, advice, time polls, etc.)
- How does a "thread" relate to a "poll" or "proposal" in their data model?
- What is the lifecycle of a proposal? (open, closing, closed, outcomes)
- How do they handle quorum, minimum participation, and closing conditions?
- How do they handle outcomes and recording decisions?
- What is the "stance" concept? (how a user responds to a proposal)
- What notifications and timeline events do they generate?

Read whatever you need to understand the model. Focus on the data model and UX flow, not the Ruby implementation details.

### 2. Read the documentation

Fetch and read: https://help.loomio.com/en/print.html

This is the full Loomio user guide. Read it completely. Pay attention to:
- What problem Loomio solves and for what kinds of groups
- The different decision tools and when each is appropriate
- How proposals connect to forum threads (in Loomio, a poll lives inside a thread)
- The consent-based decision-making model (used by sociocracy practitioners)
- How outcomes are recorded and made visible after a decision closes

---

## What You're Designing

After studying Loomio, design a collaborative decision-making layer for the ReGen Civics forum. The scope is:

### Core Feature: Decision Proposals in Forum Threads

When a user creates a forum post, they should be able to attach a decision proposal to it. This is the "collaborative decisions or agreements" flow. The user selects it during post creation (or adds it to an existing post), and it activates a structured decision tool alongside the thread discussion.

Design this as a native ReGen Civics feature, not a Loomio embed. The aesthetic, language, and UX must feel like the rest of the app. Grounded, direct, community-scaled.

Things to figure out and spec:

**Decision types to support (pick the right subset for ReGen Civics):**
- A simple yes/no or consent/concern/block model
- A time poll (scheduling)
- A ranked choice or preference poll
- A check-in or temperature check (no binary, just pulse)
Consider: which of these actually fit the ReGen Civics community right now? What does a land project need? What does a community of contributors need? Recommend 2-3 types to build in the first version.

**Proposal lifecycle:**
- Draft state (author only)
- Open for input (community can respond)
- Closing window (notifications sent)
- Closed with outcome recorded
- How does this interact with community agreements ratification?

**Stances / responses:**
- How does a user respond? (vote, signal, weigh in)
- How are stances displayed? (visual summary, individual breakdown)
- Can users change their stance before close?

**Outcomes:**
- Who records the outcome? The author? Auto-generated from votes?
- Where does it live after the proposal closes?
- How does it connect to the community agreements ratification flow that already exists?

**Integration points in the forum:**
- Proposal card shown inside the forum thread (below the post, above replies)
- Proposal summary shown in category/thread list views (e.g., "[Decision Open] 4 days left")
- Dedicated view at `/community/decisions` or similar showing all open proposals across the forum

**Other places to bake this in:**
- Community Agreements page: proposals that pass a threshold can auto-generate a community agreement (extends the existing `communityAgreements` table)
- Land project accountability threads: land projects could post seasonal updates with a consent-based "continue funding" proposal attached
- Alliance partner onboarding: alliance acceptance could trigger a community review proposal

---

## Output: Spec Document

Save your output to `LOOMIO_INTEGRATION_SPEC_2026-04-09.md` in the project root.

The spec must include:

1. **What We're Building** -- plain description of the feature, who it's for, why it matters
2. **Decision Types We're Supporting** -- with rationale for why these and not others
3. **Data Model** -- new tables needed, columns, relationships to existing tables (`forumPosts`, `communityAgreements`)
4. **API Routes** -- list of tRPC routes needed (create proposal, respond/stance, close, record outcome, list open, list by thread)
5. **UX Flow** -- step by step for the main user journey (creating a post with a proposal, responding to a proposal, seeing outcomes)
6. **UI Components Needed** -- list of new components with brief descriptions
7. **Integration Points** -- how this connects to community agreements, land project threads, alliance threads
8. **What to Build First** -- recommended Phase 1 scope (minimum viable version that actually works and is worth shipping)
9. **What to Defer** -- what Loomio does that we do not need yet
10. **Migration SQL** -- the raw SQL to create new tables (follow the pattern in `drizzle/0086_community_agreements.sql`)

---

## Writing Rules (apply to all content you produce)

- No em-dashes. Zero. Replace with commas, periods, colons, or rewrite.
- No contrast-framing ("this is not X, it is Y"). Lead with what the thing is.
- No AI word patterns: no "delve", "tapestry", "foster", "leverage", "transformative", "robust", "seamless", "empower", "utilize", "navigate" as metaphor, "unlock", "unleash".
- No rhetorical question openers.
- Direct, grounded, specific. Write like a thoughtful person inside the regen movement wrote it.

---

## Constraints

- Do not write implementation code in this session. Write the spec first. Code comes in a follow-on session.
- Do not conflict with `COMMUNITY_AGREEMENTS_PLAN.md`. The community agreements feature being built in that plan is the foundation this extends.
- Recommend only what can realistically be built in a single focused sprint. This is not a Loomio clone. It is a decision layer that fits the size and culture of this community.
- Think about mobile. The forum is used on phones.
- Think about non-technical users. Land project stewards are farmers, not developers.

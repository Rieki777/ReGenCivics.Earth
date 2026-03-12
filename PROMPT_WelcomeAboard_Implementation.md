# Implementation Brief: Welcome Aboard Quests + Forum Pre-Population

## Before you touch any code

Read these two files in full first:

1. `ReGenCivics_WelcomeAboard_Brief.md` — quest cards, forum post content, seed comments, and Section 4 (the technical implementation spec)
2. `ReGenCivics_Forum_Posts.md` — all forum threads to create: Part One (main Gathering Grove topic posts) and Part Two (pre-population thread stubs)

Everything below references content in those two documents. Do not write any code until you have read both.

---

## Key architectural decision (read carefully)

The Welcome Aboard Quests do **not** create their own standalone forum posts at `/community/feedback`, `/community/origin-story`, etc.

Instead, **each quest links directly to an existing Gathering Grove thread** in the standard forum. The quest completion CTA sends players into the standard community rather than a quest-specific silo.

The updated forum thread targets for each quest are in the Section 1 table of `ReGenCivics_WelcomeAboard_Brief.md`. The quest cards in Section 2 show the updated "Forum post" label for each quest. Use those — not any `/community/[quest-slug]` paths.

The seed content in Section 3 of the Brief (post bodies + 3 seed comments per quest) goes into those Gathering Grove threads, not separate quest posts.

---

## Task 1: Profile page — URL param tab handling

**File:** `client/src/pages/PlayerProfile.tsx`

The page currently ignores `?tab=` URL params and always defaults to "overview." Fix this:

- On mount, read `?tab=` from `window.location.search`
- If the value is a valid tab ID (`overview`, `quests`, `contributions`, `settings`), open that tab
- On tab click, sync the URL param using `window.history.replaceState` (no page reload)

The exact code snippet is in Section 4.1 of the Brief.

Also: update any existing links pointing to `/profile?tab=contributions` to point to `/profile?tab=quests`.

---

## Task 2: WelcomeAboardQuests component

**File to create:** `client/src/components/WelcomeAboardQuests.tsx`
**Data file to create:** `client/src/data/welcomeAboardQuests.ts`

Build the component described in Section 4.2 of the Brief. Each of the 10 quest cards shows:

- Quest number badge (Q1–Q10)
- Title and tagline
- Reward: "33 $ReGen + 0.1 RGVoice"
- Expandable "About this quest" section (collapsed by default, chevron toggle)
- Numbered how-to steps
- Forum link button — opens the Gathering Grove thread in a new tab (use the targets from Section 1 of the Brief, not `/community/[quest-slug]` paths)
- Bonus callout where applicable (Q8, Q9, Q10)
- "Mark Complete" toggle — writes quest ID to `questsCompleted` JSON array on the player profile via `trpc.playerProfiles.update`

Quest IDs: `welcome-aboard-1` through `welcome-aboard-10`

Series header text (above the 10 cards):
> "Complete all 10 Welcome Aboard Quests to earn 330 $ReGen + 1 RGVoice and unlock your first Claim in the ReGen Game. Each quest is worth 33 $ReGen + 0.1 RGVoice."

All quest copy (titles, taglines, about text, steps, forum links, bonus text) is in Section 2 of the Brief.

---

## Task 3: Embed in PlayerProfile

In the Quests tab render block of `client/src/pages/PlayerProfile.tsx`, add `<WelcomeAboardQuests>` above the existing quest log and below the tab heading.

---

## Task 4: Quest start popup

**File to create:** `client/src/components/QuestStartPopup.tsx`

One-time modal that fires after profile setup completes. Uses `localStorage` flag `hasSeenQuestPrompt` to show only once. CTA links to `/profile?tab=quests`.

See Section 4 of the Brief for notes on trigger placement.

---

## Task 5: Claim gating

Before a player can make a Claim in the ReGen Game, validate:
1. All 10 Welcome Aboard quests are marked complete in `questsCompleted`
2. Player has not already made a Claim (existing single-claim rule)

Details in Section 4.5 of the Brief.

---

## Task 6: Forum seed script

**File to create:** `scripts/seed-forum-posts.ts`

This script seeds the entire forum. It has two parts:

### Part A — Gathering Grove main topic posts (from `ReGenCivics_Forum_Posts.md` Part One)

Create the 8 main Gathering Grove topic posts — one per section. The content for each is the rewritten pinned post in Part One of `ReGenCivics_Forum_Posts.md`. These are the anchor posts for:

- General Discussion
- Land Projects
- Investment & Finance
- Governance & DAO
- Quests & Gameplay
- Alliance Partners
- Introductions
- Learning & Resources

### Part B — Pre-population threads (from `ReGenCivics_Forum_Posts.md` Part Two)

Seed all the discussion thread stubs listed in Part Two of `ReGenCivics_Forum_Posts.md`. These populate each section with enough active threads to feel alive on day one. Each thread is created with the title and body text from the document.

### Part C — Quest seed content (from `ReGenCivics_WelcomeAboard_Brief.md` Section 3)

For the 7 quest-linked threads (Q1, Q2, Q3, Q4, Q7, Q8, Q10), seed the post body and 3 example comments from Section 3 of the Brief **into the corresponding Gathering Grove thread** (not as standalone posts). Match each quest's Section 3 content to the correct thread using the Section 1 table in the Brief.

Quests Q5, Q6, Q9 have standalone forum posts — seed those at their `/community/make-friends`, `/community/pledge-gift`, and `/community/refer-land` URLs as described in Section 3.

---

## Summary of files to create or modify

| Action | Path | Notes |
|--------|------|-------|
| MODIFY | `client/src/pages/PlayerProfile.tsx` | URL param tab reading, URL sync, embed WelcomeAboardQuests, update contributions links |
| CREATE | `client/src/components/WelcomeAboardQuests.tsx` | 10 quest cards with complete toggle |
| CREATE | `client/src/data/welcomeAboardQuests.ts` | Quest data array |
| CREATE | `client/src/components/QuestStartPopup.tsx` | One-time popup after profile setup |
| CREATE | `scripts/seed-forum-posts.ts` | Seeds all forum content from both docs |
| MODIFY | Claim logic (wherever it lives) | Add 10-quest gate before allowing a Claim |

---

## What not to build

- Do not create standalone forum posts at `/community/feedback`, `/community/origin-story`, `/community/regen-act`, `/community/bioregion`, `/community/foundations`, or `/community/refer-org` — these paths no longer exist. Quests link to the Gathering Grove threads instead.
- Do not add quest-specific URL routes for the above. Q5 (`/community/make-friends`), Q6 (`/community/pledge-gift`), Q9 (`/community/refer-land`), and Q10 (`/community/quests`) retain their own forum posts — only those four.

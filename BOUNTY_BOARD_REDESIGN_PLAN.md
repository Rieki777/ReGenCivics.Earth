# Bounty Board: move, redesign, and wire up

Date: 2026-07-01
Status: PLAN for review. This is the pre-plan (ideas + approach). Once Rye picks the improvements, we turn it into a Claude Code execution prompt.

## The problem

The open-bounties board (`OpenToCircleCallTasks`) is a minimal card list rendered near the bottom of `client/src/pages/Opportunity.tsx`, which is the investor Investment Thesis page ("Investment Opportunity: Regenerative Land Fund"). Contributors will never find it there, and it renders nothing when the board is empty. It also throws away most of the data it already has: the source recording, the exact transcript quote and timestamp that produced the task, the role, and the LLM's sociocratic overview (purpose, steps, definition of done, consent circle).

## The goal

A dedicated, beautiful `/bounties` page in the Game section, right under Quests in every menu, that turns the movement's real needs into findable, claimable quests. Remove the board from the investor page entirely.

## What data we already have (drives the redesign)

`bounties.listBoard` returns full bounty rows plus `openRoles`. Available today, unused by the current UI: `recordingId`, `evidenceQuote`, `evidenceTs`, `roleSlug`, `tier`, `tokenType`, `createdAt`, `expiresAt`, `githubRepo`/`githubIssueNumber`, `body`. The extract-tasks pass also stores a `sociocraticOverview` (purpose, whyThisRole, steps, definitionOfDone, consentCircle) that never reaches the screen. A light backend touch can also join the source recording's title and the role's display name.

## Part A: 10 ways to improve the bounty board

1. Show where each bounty came from. Call-task bounties carry `recordingId`, `evidenceQuote`, and `evidenceTs`. Add a "From: {session title}" chip that deep-links to the recording on the Schedule page at the exact moment (`&t={evidenceTs}s`), and show the quote that spawned it ("Heard on the call: '...'"). This grounds every bounty in a real moment and makes the whole coordination engine visible and trustworthy.

2. Filters and sort. Filter by type (session task vs code contribution), role or circle, and tier/reward; sort by newest, highest reward, or closing soon. `listBoard` already accepts `sourceType` and `tier`; add role/circle. Essential once the board grows past a handful.

3. Reward clarity. Show the real token amount prominently with the token name, for example "250 $ReGen" instead of "medium tier." No USD conversion; the token stands on its own.

4. Personal match for signed-in players. Badge bounties that match a role the viewer holds ("For your role: Storyteller") and clearly separate "open to anyone in your circle." Route the right people to the right work instead of a flat list.

5. Effort and scope signal. Translate tier into human terms ("~an afternoon," "a multi-day build") and show a scope tag, so people can pick work that fits the time they have. The extract-tasks prompt already reasons in these terms; surface it.

6. A real detail view. Clicking a bounty opens a full view (modal or `/bounties/:id`) showing the sociocratic overview the LLM already produced: purpose, why this role, the steps, the definition of done, and the consent circle, plus the evidence quote, the source session, and the claim action. Today only the title and a two-line body show; the useful structure is generated and thrown away.

7. Claim then guide. After claiming, show what happens next inline (do the work, submit an artifact, consent, get paid) and link straight to Profile then Call Tasks. This closes the "I claimed it, now what?" gap and connects the board to the lifecycle we already shipped.

8. A header that breathes and an empty state that recruits. A live header ("7 open bounties · 1,850 $ReGen available · 3 circles need help"). When the board is empty, a warm state that explains bounties are born from community sessions, invites people to attend or host one, and links to Quests. Never a blank page.

9. Freshness and gentle urgency. Show age ("opened 2 days ago") and, when `expiresAt` is set, a "closes in N days" countdown. The flywheel already expires stale claims; mirror that time-awareness on the board so it feels alive.

10. Beautiful, on-brand, responsive. A card grid rather than one column, in the game's forest palette with the display font and a soft glow, role and circle color-coding, a token-coin motif for rewards, real hover states, and a hero ("The Bounty Board: turn the movement's needs into your next quest"). Mobile-first, accessible (contrast, keyboard, aria labels). This is the "well-designed and beautiful" ask.

Two bonus ideas, hold or fold in as you like: a "recently completed" strip with who did the work (gratitude and social proof), and a "notify me when a {role} bounty opens" subscribe, since we already have per-holder notification prefs.

## Part B: move it and wire it into every menu

New page and route:

- Create `client/src/pages/Bounties.tsx` (the redesigned board). Refactor the guts of `OpenToCircleCallTasks` into it, or into a shared `BountyBoard` component the page renders.
- Add the lazy route `<Route path="/bounties">` in `client/src/App.tsx`.
- Remove `<OpenToCircleCallTasks />` and its import from `client/src/pages/Opportunity.tsx`. The investor page should carry no bounties.

Add "Bounties" directly under "Explore Quests" (the Game section) in every menu surface:

- `client/src/components/Navigation.tsx`: add a "Bounties" item to the "Play the Game" dropdown right after "Explore Quests"; add `/bounties` to the `isPlayGameActive` check; add it to the lazy prefetch map and the dropdown's `onMouseEnter` prefetch; add it to the mobile "Play the Game" section in the same file.
- `client/src/components/CommandPalette.tsx`: add a Bounties command in the Play/Game group.
- `client/src/components/NavCustomizeSheet.tsx`: add `{ path: "/bounties", icon: ..., label: "Bounties", category: "Game" }` (note: `/opportunity` is miscategorized-adjacent as "Resources"; Bounties belongs with the game).
- Mobile menus: `client/src/components/mobile/MenuCard.tsx` and `WizardRadialMenu.tsx` (and any mobile nav list) get a Bounties entry near Quests.
- `client/src/components/ProgressMap/mapData.ts`: optionally add a "Bounties" landmark on the Play path near the Quests node, so it appears on the game map too.
- `client/src/components/StructuredData.tsx` / JsonLD sitemap: add the `/bounties` URL.
- Footer and `FooterSearch.tsx`: add Bounties to the game links.

## Part C: design direction

Follow `DESIGN_SYSTEM.md` and match the existing game aesthetic (the deep forest greens, `--font-display`, the soft `#7dd87d` glow already used in the current card). Structure: a hero, a live stats strip, filter/sort controls, a responsive card grid, and a detail view. Color-code by circle. Use a coin motif for the reward. Keep it mobile-first and accessible. The current component's palette is a fine starting point; the redesign is about layout, hierarchy, the provenance and reward story, and the detail view, not a new color language.

## Part D: backend touches (small)

- Enrich `bounties.listBoard` to also return the source recording's `title` (join on `recordingId`) and the role's display name (join `roles` on `roleSlug`), so the provenance chip and role badge read well without a second round trip.
- Add optional `roleSlug` / `circle` filters to `listBoard` for Part A item 2.
- The detail view needs the `sociocraticOverview`; confirm it is stored (it is produced by extract-tasks) and returned by `bounties.get`, or add it.

## Reality check

The board is empty right now (zero open call-task bounties in production). It fills when coordination sessions generate proposals that you approve for unfilled roles, and from code/contribution bounties. So a strong empty state (item 8) is not optional, it is what people see first. Seating real role holders will also shift some tasks off the open board onto individual profiles, which is correct; the open board is for genuinely open-to-circle work.

## Next step

Rye reviews and picks which of the ten to include (and confirms the design direction). Then we write the Claude Code execution prompt: the new page and route, the removal from Opportunity, the menu wiring across all surfaces, the backend enrichments, and the ship-gate checks.

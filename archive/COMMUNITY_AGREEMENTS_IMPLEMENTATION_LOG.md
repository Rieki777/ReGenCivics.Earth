# Community Agreements Implementation Log

Verification log for the COMMUNITY_AGREEMENTS_PLAN.md scope (CTO-reviewed 2026-04-08 cut).

## Part 1 — Community Agreements page

**Status:** DONE in a prior session, verified 2026-04-09.

- `drizzle/0086_community_agreements.sql` and `0087_seed_existing_agreements.sql` exist and are recorded as APPLIED in `_migrations_applied` (verified via `npx tsx scripts/run-migration.ts --status`).
- `drizzle/schema.ts` lines 1438-1458 hold `communityAgreements` and `communityAgreementVotes`.
- `server/db.ts` lines 3247-3306 hold `listCommunityAgreements`, `createCommunityAgreement`, `toggleCommunityAgreementVote`, `getUserCommunityAgreementVotes`. Pattern mirrors `listQuestSuggestions` / `toggleQuestVote`.
- `server/routes/agreements.ts` exposes `list`, `myVotes`, `create`, `toggleVote`. Wired into `appRouter` in `server/routers.ts` line 124.
- `client/src/pages/CommunityGuidelines.tsx` uses `trpc.agreements.list` for ratified + open queries, `trpc.agreements.myVotes`, `trpc.agreements.create`, `trpc.agreements.toggleVote`. Vote button already does optimistic refetch on success.
- `useAuth` import path: `@/_core/hooks/useAuth` (correct).

## Part 2A — section header copy consistency

**Status:** PASS.

`grep -n "Clarity & Agreements" client/src/pages/Community.tsx` returns:
- line 516: card subtitle in the section button
- line 1083: panel header `Air: Clarity & Agreements`

The CTO note's reference to "line 578" is from before the line numbers shifted; the live render only needs the two locations above.

## Part 2D — Add Category form image upload

**Status:** DONE in a prior session, verified 2026-04-09.

- `client/src/pages/Community.tsx`: `newCatImageUrl` state at line 124, `SmartImagePicker` rendered in all 5 Add Category form locations (lines 668, 820, 943, 1068, 1170), `imageUrl` passed in every `createCategoryMutation.mutate` call.
- `server/routes/forum.ts`: `createCategory` and `updateCategory` schemas accept `imageUrl: z.string().max(500).optional()` (lines 85, 101).
- Category cards render `imageUrl` with icon fallback at line 605.

## Part 2E — Image audit findings

See "Image audit findings" appended to `COMMUNITY_AGREEMENTS_PLAN.md` and below:

| Reference | Status | Note |
|---|---|---|
| `/images/backgrounds/community-hero.webp` | OK | exists |
| `/community/finca-sagrada.webp` | OK | exists |
| `/community/liminal-village.webp` | OK | exists |
| `/images/quests/quest-00-fire.webp` | OK | exists |
| `/images/quests/quest-01-potion-brewing.webp` | OK | exists |
| `/images/quests/quest-02-saving-seeds.webp` | OK | exists |
| `/images/quests/quest-03-healing-whole.webp` | **FIXED** | typo, real file is `quest-03-healing-wholes.webp` (with `s`). Updated `Community.tsx` line 698 to point at the correct filename. |
| `/images/quests/quest-04-dreaming-spaces-of-love.webp` | OK | exists |
| `/images/quests/quest-05-rites-of-love.webp` | OK | exists |
| `/images/quests/quest-06-healing-circles.webp` | OK | exists |
| `/images/quests/quest-08-medicine-journey.webp` | OK | exists |
| `/images/quests/quest-10-communication-patterns.webp` | OK | exists |
| `/images/quests/quest-11-coordination-patterns.webp` | OK | exists |
| `/images/quests/quest-12-breathplay-future-dreaming.webp` | OK | exists |

No other broken paths found in `Community.tsx`. Land project asset paths under `client/public/community/` (the 8 STATIC_PROJECT_META entries) are not audited here yet — the only ones referenced directly in Community.tsx are the two above and they exist.

## Parts 4 and 5 — land-general / alliance-general cards

**Status:** DONE in a prior session, verified 2026-04-09.

- `Community.tsx` line 738 renders `<Link href="/community/c/land-general">` Earth-section card.
- `Community.tsx` line 880 renders `<Link href="/community/c/alliance-general">` Alliance-section card.
- `SECTION_SLUGS` set at line 200 includes both `land-general` and `alliance-general`, so neither shows in the General section grid.
- Earth section's "Land Projects" card (line ~688) links to `/community/c/land-projects`.

## Part 6 — Schedule calendar button standardization

**Status:** DONE in a prior session, verified 2026-04-09.

All three calendar cards in `Schedule.tsx` (Season 2 Episodes / All Events / Open Access Session) use:
- Google Calendar: `bg-[#7dd87d] hover:bg-[#6bc86b] text-[#1a472a] font-semibold`
- Apple/Outlook: `bg-white/10 hover:bg-white/20 text-white border border-white/20`
- Optional Download .ics tertiary: `text-white/70 hover:text-white text-xs border border-white/10`

Labels are now consistent ("Google Calendar", "Apple/Outlook", "Download .ics").

## Part 7 — Recordings section

**Status:** SHIPPED 2026-04-09.

`recordings` table exists at `drizzle/schema.ts` line ~1998 and `recordings.list` is exposed in `server/routes/recordings.ts` line 15. Schedule.tsx had only `byEventId` per-event lookups, no general list. Added a `RecordingsSection` component to `Schedule.tsx` that pulls the most recent 12 via `trpc.recordings.list.useQuery({ limit: 12 })` and renders title, date, thumbnail (with fallback), and a link to either YouTube or the linked forum thread. Returns `null` if no recordings yet so the section is invisible on a fresh database.

## Part 12 — Fund.tsx Model Dashboard prominence

**Status:** SKIPPED.

`grep -n "Model Dashboard" client/src/pages/Fund.tsx` returned 0 matches. There is no Model Dashboard notice on the Fund page to make more prominent. The previous prominence treatment lives in `client/src/components/TreasuryDashboard.tsx` (which the CTO note thought didn't exist; it actually does and is rendered from inside Fund.tsx via `<TreasuryDashboard />`). That component already has the enlarged Model Dashboard banner from a prior session. No change required.

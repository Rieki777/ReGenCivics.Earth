# Fixes to Make - 2026-07-16 (Mobile Ship Sweep)

This document continues from `FIXES_TO_MAKE_2026-07-02_forum-governance-evolution.md`.

Source: Rye's iPhone Safari walkthrough of the Ship pages plus the Hymn Book. Seven
items. Two copy fixes are already applied (Fix 2, Fix 6). The rest are specced below
with root cause and exact file:line so Claude Code can execute.

Threshold note: the code reads the entry threshold from `game_variables`
(`leaderboard.entryThreshold`, default 150). Copy that hardcodes "150" should keep
using the `{threshold}` variable already wired into the pages.

---

## Fix 1 - Rough chart itinerary does not look scrollable on mobile Safari (High)

**Status:** VERIFIED (applied 2026-07-16 by Claude Code; typecheck exit 0)
Removed the mobile height cap so all ~7 day cards render inline; kept the capped,
scrollable version at `sm:` and up. Applied to both the rough chart (`ShipBook.tsx:374`)
and the week-layout list (`ShipBook.tsx:305`).

**Symptom:** On `/ship/book`, the "Your rough chart" card shows the daily itinerary in a
short inner box. On mobile Safari the day cards are clipped and there is no visible cue
that the box scrolls. Rye only found the scroll by dragging on the far left edge of the
box. Users cannot tell there are more days below the fold.

**Root cause:** `ShipBook.tsx:374` renders the day list as a nested fixed-height scroll
region: `className="space-y-2 max-h-72 overflow-y-auto pr-1"`. A nested `overflow-y-auto`
inside a page that also scrolls gives no affordance on iOS (no persistent scrollbar), and
touch drags on the card body get captured by the inner region so it feels stuck. The same
pattern is on `ShipBook.tsx:305` (the week-layout list, `max-h-[28rem] overflow-y-auto`).

**Fix (recommended):** Remove the nested scroll for the rough chart on mobile and let all
day cards render inline (the itinerary is only ~7 days, so it does not need to be capped).
Keep a capped, clearly-scrollable version only on larger screens.

- At `ShipBook.tsx:374`, change the container so it is not height-capped on mobile:
  `className="space-y-2 sm:max-h-72 sm:overflow-y-auto sm:pr-1"`.
- If a cap on mobile is still wanted, instead add an obvious affordance: a bottom fade
  gradient over the scroll box plus a small centered hint ("Scroll for the full week")
  that hides once scrolled, and add `style={{ WebkitOverflowScrolling: "touch",
  overscrollBehavior: "contain" }}` to the scroll container.
- Apply the same treatment to the week-layout list at `ShipBook.tsx:305` for consistency.

**Files:** `client/src/pages/ship/ShipBook.tsx` (lines 305, 374)

**Verify:** Load `/ship/book` on an iPhone-width viewport, pick a suggested voyage, confirm
every day of the rough chart is reachable without hunting for a hidden scroll strip.

---

## Fix 2 - Fleet "festival" section reads as fact, should read as aspiration (Medium)

**Status:** FIXED (applied 2026-07-16, needs commit + deploy)

**Symptom:** `/ship/fleet` describes the traveling festival in present tense as if it
already exists. Rye wants it framed as where we would like this to go, "imagine..."

**Root cause:** Present-tense copy in the intro block.

**Fix:** Rewrote the three intro paragraphs to lead with "Picture where we want this to
go" and "Imagine...", keeping Rye's voice and the no-em-dash rule.

**Files:** `client/src/pages/ship/ShipFleet.tsx` (lines 74-88) - DONE

---

## Fix 3 - Volume slider does nothing on iPhone Safari (High)

**Status:** VERIFIED (applied 2026-07-16 by Claude Code; typecheck exit 0)
Added `isIos()` helper in `client/src/lib/platform.ts` (covers iPhone/iPad/iPod and
iPadOS-reports-as-Mac). In `HymnBook.tsx` NowPlayingPanel the volume row now shows
"Use your device buttons to change volume" on iOS and keeps the working slider elsewhere.

**Symptom:** In the Hymn Book "Now Playing" panel, dragging the volume slider on iPhone
Safari does not change the volume. The seek bar (same control type) works fine.

**Root cause:** This is an iOS platform limitation, not a bug in our markup. iOS Safari
makes `HTMLMediaElement.volume` read-only and controls output level only from the hardware
buttons. `AudioContext.tsx:208-211` sets `audioRef.current.volume = v`, which iOS silently
ignores, so the slider moves visually but has no effect. Nothing we do to the slider will
make JS volume work on iPhone.

**Fix:** Detect iOS and, on iOS, replace the non-functional slider with a short hint so the
control does not look broken.

- Add an iOS check (mirror the existing UA pattern in `components/AuthDialog.tsx:33` or
  `lib/pushManager.ts` `isIosBrowserContext`), e.g. a small `isIosSafari()` helper in
  `client/src/lib/`.
- In `HymnBook.tsx` NowPlayingPanel (volume block at lines 461-475), when iOS is detected,
  render the `Volume2` icon with the text "Use your device buttons to change volume" and
  hide the `<input type="range" className="hymn-range w-32">`. On non-iOS, keep the slider.

**Files:** `client/src/pages/HymnBook.tsx` (lines 461-475), new helper in `client/src/lib/`

**Verify:** On iPhone Safari the volume row shows the hint (no dead slider); on desktop the
slider still adjusts volume.

---

## Fix 4 - Quest cards need a "do it now" button, not just a proof-paste field (High)

**Status:** CODED (needs Claude Code - largest item, may want a schema column)

**Symptom:** On `/ship/quest`, each of the ways-to-earn cards only offers a "Paste your
proof link" box and Submit. Rye wants every card to also carry a button that takes the
person straight to doing the action:
- The origin-story card should open the forum thread where they post.
- The social-share card should offer a pre-written message plus the social links, ready to
  edit and post in one tap.
- In general, each card should make the immediate next step one click.

**Root cause:** `ShipQuest.tsx` `ActionRow` (lines 21-62) renders a generic proof input and
Submit for every action. It has no per-action call-to-action. The action data
(`trpc.ship.quest.actions`, server `routes/ship.ts:713`) returns the raw
`ship_quest_actions` row, which already has `forumPostId` and `linkedQuestId`
(`drizzle/schema.ts:4335`, migration `0175`), but no CTA URL or share text.

**Fix (two-part):**

1. Data layer - give actions a CTA. Simplest: add nullable columns to
   `ship_quest_actions` via a new migration (`drizzle/NNNN_ship_quest_ctas.sql`):
   `ctaUrl VARCHAR(512) NULL`, `ctaLabel VARCHAR(120) NULL`, `shareText TEXT NULL`.
   Add them to `schema.ts`. The `actions` query already returns the whole row, so no router
   change is needed beyond the select picking up the new fields. Seed values per action
   (forum thread URL for the origin story, launch announcement text + link for the share).
   For the origin-story action, `forumPostId` can be resolved to a thread URL instead of a
   separate `ctaUrl` if preferred.

2. UI layer - render CTAs in `ActionRow`:
   - If `proofType === "forum"` (origin story), show a primary button "Post your origin
     story" that links to the forum thread (from `forumPostId` or `ctaUrl`), opening the
     composer. After they post they paste the link into the existing proof field.
   - If the action is the social share, render share buttons using the existing
     `ShareButton` component (`client/src/components/ShareButton.tsx`, already used in
     HymnBook) seeded with `shareText` and the announcement URL, covering X, Facebook,
     LinkedIn, and copy-link. The person edits and posts, then pastes the link.
   - For any action with a `ctaUrl`, show a generic "{ctaLabel}" button above the proof
     field.

**Files:** `client/src/pages/ship/ShipQuest.tsx` (ActionRow 21-62), `drizzle/schema.ts`
(`shipQuestActions` ~4335), new `drizzle/NNNN_ship_quest_ctas.sql`, seed script for the CTA
values, `server/routes/ship.ts` (confirm the select returns new fields).

**Verify:** Each card on `/ship/quest` shows a working "do it now" button; the share card
opens a pre-filled post; the origin-story card opens the forum thread.

**Waiting on Rye:** the exact pre-written social message, the announcement URL to share, and
which forum thread is the origin-story thread (its id or slug).

---

## Fix 5 - Reframe the prize: the maiden voyage is a scheduled sailing, not the prize; free voyages are drawn Aug 16 (High)

**Status:** VERIFIED (applied 2026-07-16 by Claude Code as one coherent sweep). All four ship
gates green: truncation 0, `pnpm check` exit 0, `npx vitest run server/ship.test.ts` 52/52
pass, `node scripts/audit-links.mjs` all resolve. Prize-framing retired everywhere (grep for
`win the maiden voyage` / `maiden voyage sails free` / `first crew across` / `isMaidenVoyage`
returns only the new regression-guard regexes in `ship.test.ts`). The **"Maiden Voyage Quest"
program name is intentionally kept** (proper noun); only the prize mechanic changed.
What shipped:
- Client copy: `Ship.tsx` (CTA + hero callout), `ShipQuest.tsx` (SEO/hero/story/marketing +
  removed the `isMaidenVoyage` badge + "across the line" empty state), `ShipQuestRules.tsx`
  (binding sections 6 and 8, first draw Aug 16 2026, winners choose dates), `blogPosts.ts`
  (intro/excerpt/section heading/ladder para/closing), `FreeVoyageLadder.tsx` (sub + "First
  draw" tile), `ShipArticleBlocks.tsx`, `ShipTheme.tsx`, `config/mobileMenu.ts`,
  `core/Programs.tsx`. `ShipLog.tsx`/`CrewProfiles.tsx` had no prize copy (only a comment);
  `vite.ts`/`crawler-content.ts` SEO already draw-framed, left as-is.
- Server: removed `maidenVoyageUserId` from `ship-logic.ts`; entered crews now order by
  points (display only), `enteredAt` kept as informational. `ship.ts` leaderboard no longer
  computes `maidenId`/`maidenVoyageUserId`/`isMaidenVoyage`. `ship-config.ts` comments
  reworded (const `MAIDEN_FREE_VOYAGES=1` kept numerically as the first-draw voyage).
- Tests: retired the maiden-voyage-first-crew test (replaced with an order-by-points test),
  reworded the free-voyage-ladder test, and added four banned-phrase regression guards.
Note: Ship.tsx keeps a literal "150 points" (no `{threshold}` wiring on that page, consistent
with the rules page). Deferred to Rye: whether to reprice/rename `MAIDEN_FREE_VOYAGES`.

**Rye's decision (2026-07-16):**
- The maiden voyage is NOT the prize. It is the launch sailing, and it sails the **last
  full week of July: boards Monday July 27, 2026** (matches the sample itinerary already in
  the booking flow).
- The prize is a **free voyage that winners schedule on their own dates**, not a fixed week.
- Winners are chosen by a **weighted drawing held on August 16, 2026** (mid-August).
  Qualify (reach the points threshold) by August 16 to be in that first draw. Points are
  raffle tickets, so every point above the threshold raises the odds.
- The "win the maiden voyage" and "first crew across the line" framing is retired
  everywhere. Nobody wins the maiden voyage.

**Recommended model (Claude Code to implement unless Rye says otherwise):** keep the
weighted draw and the growing free-voyage ladder (still up to six as bookings grow), but
frame every free voyage as drawn, with the first draw on August 16 and winners picking
their own open week. Drop the maiden-voyage-winner concept (`maidenVoyageUserId` /
`isMaidenVoyage`) rather than repurpose it. The "one free voyage at launch" in the ladder
becomes "the first drawn voyage," not "the maiden voyage."

**Symptom:** Current copy says the maiden voyage sails free "right away, to the first crew
across the line," which reads as first-come-first-served and ties the prize to a fixed week.

### Copy changes (client)

Use the `{threshold}` variable already wired in, not a hardcoded 150.

- **`Ship.tsx:59`** hero CTA "Win the maiden voyage" -> "Win a free voyage" (keep the
  `/ship/quest` link).
- **`ShipQuest.tsx:146`** (the screenshot copy) replace with:
  > Reach {threshold} points by August 16 and you are in the draw. On August 16 we hold the
  > first drawing and pull a free voyage from everyone who has qualified. It is a weighted
  > draw, so every point above {threshold} is another raffle ticket and the more you
  > complete the better your odds. Winners pick their own dates from the open weeks. After
  > that first draw, every 20% of the first year that gets booked unlocks one more free
  > voyage, up to six at a fully booked year.
- **`ShipQuest.tsx:103`** hero subhead: drop "The maiden voyage sails free" and say
  "Qualify by August 16 to enter the drawing for a free voyage. Winners pick their own
  dates. Every 20% of the first year that books unlocks one more, up to six."
- **`ShipQuest.tsx:133`** story line: "sets sail on her maiden voyage this August" is wrong
  now; change to "sets sail on her maiden voyage the last full week of July, through
  Cascadia, anchored at The Sanctuary in Ashland."
- **`ShipQuest.tsx:191`** draw board: remove the `isMaidenVoyage` "Maiden voyage" badge
  (there is no maiden-voyage winner). Keep the "Aboard the draw" badge.
- **`ShipQuest.tsx:93`** SEO description: reconcile to the drawing-by-Aug-16 wording.
- **`ShipQuestRules.tsx:77`** official rules: replace "the maiden voyage goes to the first
  crew across the 150-point line" with the weighted-drawing-on-August-16 mechanic, winners
  choose their dates. This is the binding text, so mirror the marketing copy exactly.
- **`blogPosts.ts:166`** the ReGen Ship story: same reconciliation (remove "to the first
  crew across the 150-point line").
- **`FreeVoyageLadder.tsx`** relabel the "Launch / maiden voyage sails free" step to the
  first drawn voyage; keep the 20%-per-step ladder up to six.
- Sweep the other references for stale "win the maiden voyage" language:
  `ShipArticleBlocks.tsx`, `CrewProfiles.tsx`, `ShipTheme.tsx`, `ShipLog.tsx`,
  `config/mobileMenu.ts`, `core/Programs.tsx`.

### Logic + tests (server)

- **`server/lib/ship-logic.ts`**: `maidenVoyageUserId` (360-365) and the "maiden-voyage
  race" ordering/`enteredAt` comments (307, 343-350) encode first-across-the-line. Remove
  `maidenVoyageUserId`, or stop using its result for a prize. Standings can still order by
  points; `enteredAt` is no longer prize-bearing.
- **`server/routes/ship.ts:789-797`**: stop computing `maidenId` / setting
  `isMaidenVoyage` on standings (or set it always false and drop the client badge).
- **`server/lib/ship-config.ts:147-153`**: the "free voyages given at launch (the maiden
  voyage)" comment/const stays numerically (still 1 at 0% booked) but reword so it means
  "first drawn voyage," not "the maiden voyage."
- **`server/ship.test.ts`**: update the two tests that assert the maiden-voyage-to-first-
  crew behavior (`~352`, `~428-429`). Keep `freeVoyagesUnlocked(0)===1` if the ladder still
  starts at one; retire the `maidenVoyageUserId` assertion.

**Verify:** `pnpm check` exit 0, `pnpm test` green (ship.test.ts updated). On `/ship` the CTA
reads "Win a free voyage"; `/ship/quest` describes the Aug 16 weighted draw and winners
picking dates; the draw board has no "Maiden voyage" badge; `/ship/quest/rules` matches.

**Files:** `Ship.tsx`, `ShipQuest.tsx`, `ShipQuestRules.tsx`, `blogPosts.ts`,
`FreeVoyageLadder.tsx`, `ShipArticleBlocks.tsx`, `CrewProfiles.tsx`, `ShipTheme.tsx`,
`ShipLog.tsx`, `config/mobileMenu.ts`, `core/Programs.tsx`, `server/lib/ship-logic.ts`,
`server/routes/ship.ts`, `server/lib/ship-config.ts`, `server/ship.test.ts`.

---

## Fix 6 - Ship hero label should credit the ReGen Civics + CORE partnership (Low)

**Status:** FIXED (applied 2026-07-16, needs commit + deploy)

**Symptom:** The `/ship` hero eyebrow read "A program of the Church of the Regenerative
Earth". Rye wants it to credit the partnership.

**Fix:** Changed `Ship.tsx:54` to "A partnership of ReGen Civics and CORE (Church of the
Regenerative Earth) presenting:".

**Files:** `client/src/pages/ship/Ship.tsx` (line 54) - DONE

**Note for Rye:** the phrase also appears in the ReGen Ship blog story
(`client/src/data/blogPosts.ts:106`) as narrative prose. Left as-is. Say the word and Claude
Code will align it to the partnership framing too.

---

## Fix 7 - Some "what are you up to?" tags in the bag show nothing (Medium)

**Status:** Code part VERIFIED (applied 2026-07-16 by Claude Code; typecheck exit 0).
DATA part still open (inventory tagging). `ShipInventory.tsx` now computes
`availableTags` from the loaded items and renders only `visibleActivities`, so no chip
can land on the empty "Nothing in the bag for that" state. Tagging more items so more
chips appear is still an inventory-data task (see part 2).

**Symptom:** On the Ship inventory ("Everything she carries"), tapping some activity chips
(for example Spring run, Rainy day, Hosting dinner, Planting, Repairs) shows an empty
"Nothing in the bag for that" state, so the tags look broken.

**Root cause:** The filter logic is correct (`ShipInventory.tsx:67-79`,
`tagsOf(it).some((t) => t === activity)`). The chips are a hardcoded list of seven
activities (`ShipInventory.tsx:50-58`), but the seeded inventory items only carry
`activityTags` for a few of them. Chips whose activity no item is tagged with return zero
results, so they appear dead.

**Fix (two-part):**

1. Code (safe, do now): only render chips that actually match at least one item, so no chip
   can look broken. Compute the available activity set from the loaded items and filter the
   `ACTIVITIES` list before mapping at `ShipInventory.tsx:108`:
   ```ts
   const availableTags = useMemo(() => {
     const s = new Set<string>();
     for (const it of items) for (const t of tagsOf(it)) s.add(t.toLowerCase());
     return s;
   }, [items]);
   const visibleActivities = ACTIVITIES.filter((a) => availableTags.has(a.key));
   ```
   Map `visibleActivities` instead of `ACTIVITIES`.

2. Data (fuller fix): tag the inventory items so every intended activity chip has items.
   This is an inventory data update (adding `activityTags` values to `ship_*` inventory
   rows). Either a seed/migration by Claude Code, or Rye edits the inventory in admin.

**Files:** `client/src/components/ship/ShipInventory.tsx` (chips 99-118), plus inventory
seed/data for the tags.

**Verify:** Every visible chip returns at least one item; no chip lands on the empty state.

---

## Handoff Breakdown - Who Does What

### YOU (Rye) - things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 4 | Provide the pre-written social message, the announcement URL, and the origin-story forum thread (id or slug) | Content decision | Reply in chat or drop into this doc |
| 5 | Sanity-check the recommended draw model before it ships (retire the maiden-voyage-winner concept; free voyages drawn Aug 16, winners pick dates) | Product call; touches the binding rules copy | Confirm or adjust; Claude Code executes the sweep either way |
| 7 | (Optional) Decide whether to tag inventory in admin yourself or have Claude Code seed it | Your call on data ownership | Admin inventory, or approve a seed script |

Note: Rye asked Claude Code to also own committing + shipping the applied copy fixes (2, 6),
so the commit/push is in the Claude Code column, not here.

### CLAUDE CODE - already done or can be done without you

| # | Task | Status | Evidence |
|---|------|--------|----------|
| 2 | Fleet festival copy made aspirational (`ShipFleet.tsx:74-88`) | FIXED | edit in file |
| 6 | Ship hero eyebrow changed to the partnership line (`Ship.tsx:54`) | FIXED | edit in file |
| 1 | Make the rough-chart itinerary scroll obvious on mobile (`ShipBook.tsx:305, 374`) | VERIFIED | both lines now `sm:`-gated (no mobile cap); `pnpm check` exit 0 |
| 3 | Replace the dead iOS volume slider with a device-buttons hint (`HymnBook.tsx:461-475` + iOS helper) | VERIFIED | `client/src/lib/platform.ts` `isIos()`; `HymnBook.tsx` volume row branches on `iosVolume`; `pnpm check` exit 0 |
| 7 | Only render activity chips that have matching items (`ShipInventory.tsx:108`) | VERIFIED (code) | `ShipInventory.tsx` `availableTags`/`visibleActivities`; `pnpm check` exit 0. Data tagging still open. |
| 2, 6 | Commit + ship the two applied copy fixes with the ship gate | TODO | `/ship`, then targeted `git add` of `Ship.tsx` + `ShipFleet.tsx`, commit, push to `main`, verify the Railway deploy reaches SUCCESS |
| 5 | Reframe the prize sweep: maiden voyage = scheduled sailing (Mon Jul 27), free voyages drawn Aug 16, winners pick dates; retire `maidenVoyageUserId`/`isMaidenVoyage`; update copy + rules + tests | VERIFIED | 12 files swept; grep clean; `pnpm check` exit 0; `ship.test.ts` 52/52; `audit-links.mjs` clean; 4 regression guards added |
| 4 | Wire per-action CTA buttons + share block in `ActionRow`; add `ctaUrl`/`ctaLabel`/`shareText` migration | CODED (needs content from Rye to seed) | spec only; awaiting share message, URL, thread id |

---

## Fix 8 - Threshold wiring, new release schedule, and launch social proof (2026-07-16)

**Status:** VERIFIED (applied 2026-07-16 by Claude Code on Rye's go-ahead). Code shipped in
`a553d7b`; seed data live in Railway.

**8a. Ship.tsx reads the live entry threshold.** `Ship.tsx` hardcoded "150 points". It now
reads `trpc.ship.featureFlags` -> `entryThreshold` (publicProcedure), falling back to 150.
Note: the points -> tickets mechanic Rye described (reach 150, get 150 tickets, more points =
more tickets) was ALREADY live server-side in `computeQuestStandings` (`tickets =
verifiedPoints` once entered) and `weightedDraw`. Only the display was hardcoded.

**8b. Free-voyage release schedule is now 40/60/75/85/95 (was every 20%).** Voyage 1 is the
Aug 16 launch draw; voyages 2-6 release at 40%, 60%, 75%, 85%, 95% booked. The schedule moved
to `shared/shipFreeVoyage.ts` (`FREE_VOYAGE_RELEASE_MILESTONES`, `freeVoyagesUnlocked`) so the
server truth and the client ladder preview can never drift; `ship-config.ts` re-exports it and
`ship-logic.ts` re-exports `freeVoyagesUnlocked`. `FREE_VOYAGE_MILESTONE_PCT` is retired. All
"every 20%" copy re-swept (binding rules name the exact percents). Tests updated.
To retune the pace later, edit the array in `shared/shipFreeVoyage.ts` only.

**8c. Social proof seeded (two reversible scripts).**
- `scripts/seed-ship-social-proof.ts` - 10 confirmed bookings on the real Monday grid,
  Sep 2026 -> Mar 2027, ~1/month weighted to the later months, Thanksgiving / Christmas /
  New Year weeks left open. Owned by labeled demo accounts (`demo-ship-seed:`) with no quest
  points, so they never touch the draw. 10/40 = **25% booked**, deliberately under the 40%
  first release, so **no free voyage is auto-awarded** from seed data.
- `scripts/seed-ship-example-crews.ts` - 5 example crews with verified completions at
  300/250/200/175/150 points, so the draw board and crew cards are not empty. Cards are
  seeded **fully sponsored** so they never solicit a real donation toward a crew that is not
  a real person (flip `FULLY_SPONSORED = false` to make them sponsorable).

**8d. Example crews can never win the draw (Rye, 2026-07-16: "if an example crew is drawn have
it automatically undo and redraw").** Handled better than a redraw: the drawing never selects
them in the first place, so there is nothing to undo. `shared/shipDemo.ts` marks every seeded
account by openId prefix (`demo-ship-`), and `admin.drawFreeVoyageWinner` now adds them to
`weightedDraw`'s existing `excludeUserIds` (the same mechanism that blocks prior winners). The
draw therefore lands on a real crew automatically, and the audit log records the demo entries
as `excluded: true`, so the drawing stays reproducible and honest.

Both seed scripts import the prefixes from `shared/shipDemo.ts`, so the seed and the exclusion
cannot drift. Verified against Railway: all 13 demo accounts (8 booking owners + 5 example
crews) are caught, and every entered example crew resolves to EXCLUDED.

Side effect, in the real crews' favour: example crews still count toward the displayed pool,
so a real entrant's true odds are slightly better than the board suggests.

Tests: `ship.test.ts` 55/55, including "never draws a seeded demo crew, however the roll
falls" (200 seeds against a demo crew holding 100,000 tickets) and the prefix-containment
guard.

**Undo (both are fully reversible):**
```powershell
npx tsx scripts/seed-ship-example-crews.ts --undo
npx tsx scripts/seed-ship-social-proof.ts --undo
```

**Heads-up for Rye:** production was missing `agreementAcceptedAt` when this was seeded, i.e.
migration `drizzle/0191_ship_agreement_acceptance.sql` had not been applied. The Voyage
Covenant work in `a553d7b` inserts that column on every booking, so **0191 must be applied to
the Railway DB or real bookings will fail** with `ER_BAD_FIELD_ERROR`. Worth confirming the
deploy ran it.

---

### WAITING ON YOU before Claude Code can proceed

- **Fix 4** can be built now, but the share message, announcement URL, and origin-story
  thread are needed to seed the CTAs and finish it.
- **Fix 5** is applied, gate-green, and shipped in `a553d7b`. If you want any wording
  adjusted (e.g. the Aug 16 phrasing in the binding rules), say so and Claude Code re-sweeps.
- **Fix 8** migration check: CONFIRMED applied 2026-07-16 (`agreementAcceptedAt` + `agreementVersion`
  present in the Railway `ship_bookings` table). Real bookings are safe. No action needed.

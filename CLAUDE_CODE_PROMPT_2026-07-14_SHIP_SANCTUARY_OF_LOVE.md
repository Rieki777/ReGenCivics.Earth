# CLAUDE CODE PROMPT: The Sanctuary of Love (the docking theme) — 2026-07-14

**Status:** Copy and code drafted in this session. Needs the ship gate, the seed run, and a deploy.
**Builds on:** `CLAUDE_CODE_PROMPT_2026-07-10_SHIP_V4_LOVE.md` (SHIPPED). That doc gave the ship a honeymoon page and voyage types. This one gives her a **docking theme**, which is the structure that makes love the foundation of the whole season.

## Kickoff prompt (paste into Claude Code)

> Read CLAUDE_CODE_PROMPT_2026-07-14_SHIP_SANCTUARY_OF_LOVE.md at the repo root. The page, route, nav, quest actions, and copy are already written in the working tree. Verify them: run the ship gate (audit-truncation, className grep, pnpm check), run `npx tsx scripts/seed-ship-quest.ts --dry-run` then for real against DATABASE_URL, commit only the files listed in Section 6, push to main, poll `pnpm railway:deploys` to SUCCESS, then update SHIPPED_LOG.md and the SHIP_BUILD_INDEX row.

---

## 1. The doctrine (the reusable part)

**The ship takes the theme of wherever she is docked.** The dock's heart becomes her heart for the season: her interior, her quests, her voyages, her table. When she moves, the theme moves with her and she is made again.

She is docked at **The Sanctuary in Ashland, Oregon** (the Tower and the Hermitage). The Sanctuary holds love. So her first season sails as **The Sanctuary of Love**, and love is the foundation everything else is built on.

This was chosen on purpose. The ship is one of the first programs of the **Church of the Regenerative Earth (CORE)**, and CORE now takes on the operations of this RV and every RV after it: an organization that can hold vessels for the long term, in service to the Regenerative Renaissance.

**The structure is the constant; the theme is the variable.** `CURRENT_THEME`, `FOUR_LOVES`, `RITES`, `INTERIOR`, and `LOVE_ACTIONS` are all top-of-file constants in `ShipTheme.tsx`. When she docks somewhere new, swap them and the page becomes the new theme.

## 2. `/ship/theme` (new page)

`client/src/pages/ship/ShipTheme.tsx`. Sections in order:

1. **Hero** — The Sanctuary of Love. "She is docked at The Sanctuary, Ashland, Oregon. So this season she sails as a sanctuary, and the sanctuary is built on love." CTAs: book the Love Voyage, read the honeymoon story.
2. **The docking doctrine** — why the theme rotates with the dock.
3. **The four loves aboard** — Beloved, Body, Land, Beautiful. Tend all four and the fifth arrives (love of the whole).
4. **The Love Voyage** — the honeymoon band, linking `/blog/more-than-one-honeymoon`.
5. **The Quest of Love** — seven days, seven rites (Section 3 below).
6. **The Sanctuary of Love actions** — the six themed point-earning actions, linking `/ship/quest`.
7. **Inside a sanctuary of love** — the interior direction (Section 4 below).
8. **Why a church runs this** — CORE holds the ship and the fleet; 10% of every voyage buys her back into community ownership. Links `core.regencivics.earth/programs`.
9. **Closing CTA** — "When is your next honeymoon?"

## 3. The Quest of Love (the whole journey, centered on love)

A voyage boards Monday 3pm and returns Sunday 11am. This season each day carries a rite. Nothing is required. A crew that does all seven gets their week recorded in the Voyage Log as a completed Quest of Love.

| Day | Rite | What you do |
|---|---|---|
| Monday | The Boarding Rite | Each writes down what they carry that is not love. Burn it in the fire ring at the first camp. |
| Tuesday | The Rite of Water | Fill her tanks from a living spring. Drink first from the same cup. |
| Wednesday | The Rite of the Table | Cook one local meal on cast iron, no phones. Eat honey. Save the seeds. |
| Thursday | The Rite of Hands | Give a day to a land project on the treasure map. Plant together, hands in the same hole. |
| Friday | The Rite of Beauty | Stand in front of the thing that undoes you. Ten minutes of silence first. |
| Saturday | The Rite of Truth | The conversation you have been putting off. Prompt cards in the Captain's Book. |
| Sunday | The Homecoming Rite | Sail home. Plant the saved seeds in the healing hole. Sign the log. |

**Follow-on work (not built here, worth a future doc):** the Rite of Truth prompt cards as real content in `CaptainsBook.tsx`, and a "Quest of Love completed" flag on the Homecoming recap (`/ship/log/{slug}`) so a crew's seven rites show on their page.

## 4. Interior direction

Her refit for this docking. The altar (a fixed shelf; every crew leaves one thing and takes one thing). The love nest (primary bedroom, organic linens, blackout, a star window). The apothecary galley (cast iron, gravity-filtered water, a jar of wild-flower honey). The Hermitage seat (one chair set apart, facing out, for whoever needs solitude). The seed chest, riding where you can see it. The Captain's Book. Open flame stays in the fire ring, never in the coach.

Interior photos are empty-state until Rye's refit shots land. Rye has raw photos in his `ReGen Ship` folder that can fill `InteriorPlaceholder` slots on `/ship` once selected and dropped into `client/public/images/ship/`.

## 5. The Sanctuary of Love quest actions

Six themed actions added to `scripts/seed-ship-quest.ts` (idempotent by slug, sortOrder 8 to 13). Acts of love done from home, before boarding.

| Slug | Action | Points | Proof |
|---|---|---|---|
| `love-letter-to-a-landscape` | Write a love letter to a landscape | 25 | forum |
| `moon-of-honey` | Keep a moon of honey | 25 | photo |
| `cook-for-your-beloved` | Cook a local meal for someone you love | 25 | photo |
| `plant-together` | Plant something with another person | 50 | photo |
| `give-a-day-to-the-land` | Give a day to a land project near you | 50 | photo |
| `bring-a-couple-aboard` | Bring a couple onto the crew list | 50 | link |

The 150-point threshold is unchanged. These add 225 points of optional supply, which means a crew can now reach the line entirely through acts of love without ever posting a referral. That is the point of the theme.

`ShipQuest.tsx`'s hardcoded "Seven ways to earn your voyage" heading is now driven by `actions.data.length`, so it stays honest as actions come and go with the docking.

## 6. Files touched

| File | Change |
|---|---|
| `client/src/pages/ship/ShipTheme.tsx` | NEW. The theme page. |
| `client/src/App.tsx` | Lazy import + `/ship/theme` route. |
| `client/src/pages/ship/shipShared.tsx` | Nav card "The Theme"; grid `md:grid-cols-6` → `md:grid-cols-7`. |
| `client/src/pages/ship/Ship.tsx` | New "current docking" band under the nav row, linking `/ship/theme`. |
| `client/src/pages/ship/ShipQuest.tsx` | Dynamic action-count heading + a link to the theme. |
| `scripts/seed-ship-quest.ts` | Six themed actions, sortOrder 8 to 13. |

**Do not `git add -A`.** Another session has unrelated companion work in the tree (`shared/companions.ts`, `server/companion.test.ts`, `client/src/pages/Connect.tsx`, `scripts/generate-core-assets.ts`). Add only the six files above plus this doc.

## 7. Verification (the ship gate)

```bash
python3 scripts/audit-truncation.py           # gate 1
pnpm check                                     # gate 3, must exit 0
npx tsx scripts/seed-ship-quest.ts --dry-run   # should list 13 actions
npx tsx scripts/seed-ship-quest.ts             # 6 inserted, 7 updated
```

Gate 2 (className grep) is a no-op here: no new CSS classes or keyframes were added. `ShipTheme.tsx` uses only existing Tailwind utilities, the existing `data-reveal` attributes, and the shared ship components.

## Handoff Breakdown: Who Does What

### CLAUDE CODE (autonomous, no permission needed)

| # | Task | Evidence to record |
|---|------|--------------------|
| 1 | Run the ship gate (Section 7 gates 1 and 3) | `pnpm check` exit 0 |
| 2 | Visual pass on `/ship/theme` at 375px and 1440px; confirm the 7-card nav row does not crush on mobile (3/3/1) | screenshot path |
| 3 | Run the seed (dry run, then live) against `DATABASE_URL` | script output: 6 inserted, 7 updated |
| 4 | Commit the six files + this doc with `feat(ship): the Sanctuary of Love docking theme`; push to `main` | commit sha |
| 5 | Poll `pnpm railway:deploys` until the newest deploy leaves BUILDING; confirm SUCCESS | deploy status |
| 6 | Add the SHIP_BUILD_INDEX row (#12) and the SHIPPED_LOG entry | file:line |

### RYE

| # | Task | Why only you |
|---|------|-------------|
| 1 | Confirm the naming: is it "The Sanctuary" publicly, and do the Tower and the Hermitage get named on the page? Currently they do, in the docking doctrine section. | Your call on how much of the Sanctuary is public |
| 2 | Confirm the Hermitage seat and the altar are real fixtures you will build into her, not just copy | The page describes them as real |
| 3 | Pick interior refit photos from your `ReGen Ship` folder and drop them into `client/public/images/ship/` to replace the four `InteriorPlaceholder` slots on `/ship` | Aesthetic call, and the photos are on your machine |
| 4 | Say whether the Quest of Love rites should also be printed as physical cards for the coach | Production decision |

### WAITING ON RYE

Nothing blocks the deploy. Items 1 and 2 are copy adjustments that can land after.

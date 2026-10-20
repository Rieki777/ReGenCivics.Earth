# Week 4: Build it in Village OS (board plan, as built)

> **Status, 2026-10-15:** built from this plan with Rye's rulings of 2026-10-14 (below). `shared/sessionBoard.ts` (WEEK_4) and ADR-76 are the source of truth where this file and the code differ. The plan page Rye approved: https://claude.ai/artifact/DxSJgi1oa3TtUoVywnb5VZ

Season 2, Week 4, "Game & Organisation Co-Creation Part 2". Wednesday 2026-10-21, 10:00 to 12:00 PDT, at `regencivics.earth/season2/week/4`. Part 2 of 2: the practical half. Week 3 named the human needs each project is here to meet; Week 4 builds its Game around them, and every project leaves with a card ready for its Village OS.

## Rye's rulings (2026-10-14)

1. Go, with the recommendations on the plan page: Rye shares Amora's Village OS on each stage while projects build on the board; run the circles step again (nobody reached it in Week 3); the seat and decision wording; peer review on "Your Game, built"; a facilitator confirms a match found only by name; a change replaces last week's answer.
2. **Need first.** Projects can change their human needs and add whatever human needs they're pursuing.
3. **A seat is a card with six fields:** its name, what it works toward, the human need it meets, what it answers for, who holds it, and what it asks.
4. **Held by:** someone on the team already holding it is named; or open, an invitation; or a being, with someone speaking for it.
5. **What it asks:** hours a week or a clear contribution, either.
6. **The whole Season ends in launching each project's Village OS** with what the episodes uncover. That process belongs to the "Week 4 board: load Week 3's answers into Village OS (fork)" session; this board writes the cards it builds on.

## What Week 3 left (its live board, read 2026-10-14)

- Four projects checked in: Samara's Sanctuary Studios, Templeofroots.com, Amora, Toa Hermitage. Samara's and Templeofroots.com have full cards; Amora picked all ten human needs and no seeds; Toa wrote three lines.
- Nobody answered "which circles meet each human need" (the step changed during the session).
- Eight questions on the wall, none marked Answered, five about roles.
- On Week 4's welcome: practising in your own context (Samara's), and peer review (Templeofroots.com).

## Run of show (14 stages, 120 minutes)

| # | Starts | Min | Stage | Kind | Reads back from Week 3 | Main move |
|---|---|---|---|---|---|---|
| 1 | 10:00 | 4 | Welcome | welcome | | Part 2 of 2 |
| 2 | 10:04 | 4 | Tap your project | checkin | last week's pick | "Same today?" |
| 3 | 10:08 | 5 | Drop in | breath | | one word |
| 4 | 10:13 | 10 | Your Week 3 card | needs / carry | the whole card, last week's move, open questions | did your move happen |
| 5 | 10:23 | 12 | Your human needs | needs / confirm | picks, seeds, today, goal, breadth, whole | change, add your own, seeds' depth |
| 6 | 10:35 | 12 | Circles for each human need | needs / circles | circles, players, shape | circles per human need |
| 7 | 10:47 | 30 | Seats in each circle | needs / seats | circles to start with, players | a seat card per human need |
| 8 | 11:17 | 12 | Who decides what | needs / decide | how it decides today and wants to | what each circle decides; what everyone decides |
| 9 | 11:29 | 7 | Your first quest | needs / quests | seeds | one quest per human need |
| 10 | 11:36 | 9 | Your Game, built | needs / room | everything | read it, the next project reflects, Copy for Village OS |
| 11 | 11:45 | 8 | Your questions, and Week 5 | prompt | | one move, Week 5 picks |
| 12 | 11:53 | 4 | Tell us | prompt + feedback | | |
| 13 | 11:57 | 2 | Close | close | | one word |
| 14 | 11:59 | 1 | Get your Village OS | getvillageos | | |

Running long: stage 9 to 4 minutes, stage 10 to 5, stage 11 to 5, then "+5 min".

## What each project leaves with

- Its human needs, checked, with its own added, three seeds, how deep and for how many, and the whole-project figure.
- The circles that meet each human need.
- The seats in each circle, each a card someone could say yes to.
- What each circle decides, what the whole project decides together and how, and one first agreement.
- A first quest that grows a human need.
- A card for Village OS (below), and its answers under each person's Submissions and in the admin export.

## How last week's answers come forward

- **Which Week 3 card:** the same application; else a link recorded when a check-in made the card from the Week 3 tile, or when the person checking in played for the one same-name Week 3 card; else a same-name card waits for the facilitator's yes on "Your Week 3 card". Different applications never link.
- **Merging:** per question, today's answers replace last week's; the human needs move as one group (a need taken off today takes its carried seed and answers with it). Week 3's board is never written.
- **The first change** to a list the project only has from last week copies that list under the person changing it, minus the change, in one locked batch.

## Copy for Village OS

`shared/villageOsCard.ts`, schema `regen-civics/village-card@1` (the needs, circles and seats part of the Village OS 1.0 profile the "load Week 3's answers into Village OS" session builds in `shared/projectProfile.ts`). The `needs` list is exactly the body of Village OS's `PUT /api/admin/needs/scope` (`needKey`, `label` for a project's own, `depthTarget`, `breadthTargetPct`, `sortOrder`). Then `variables` (`needs.totality_target_pct`), `needLinks` (each circle that meets a human need: a draft link onto a seat in it, no weight), `seats` (named the way Village OS names a seat's commitments: `aim`, `domain`, `accountabilities`, `why` ("Meets Vitality"), `term`, `nextHolder`, `decides`, plus `seats` (1), `heldBy`, `who`, `contribution { hoursPerWeek?, text? }` and its own need link, primary when it is the only seat on that human need), `circles` (with `decidesBy`, Village OS's `circles.decides_by`), `decisions`, `entry` (the first step someone takes to come in), `quests`, `customNeeds` (named last week, not yet added), `firstLine`, `players`, `shape`, `from`. Own human needs that would key as one of the ten are refused at the form, since Village OS refuses the whole save for one.

## Separate: the Village OS side

There is no paste step inside Village OS yet, so the copy line says to keep the card for setting up the village. Reading the card into Village OS (screens 1 to 4 of What this village is for filled in for the founder, seats drafted from seat cards, need links once seats exist) belongs to the Village OS 1.0 launch lane in the Rieki777/village-os repo.

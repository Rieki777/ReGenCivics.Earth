# SEASON TEMPLATE

How to assemble season N+1 instead of inventing it. Written from Season 1 (The First Build, `seasons/season-1-the-first-build.md`) and `SEASONS_HISTORY.md`, with the ritual spine from improvement 3 of `MISSION_FOUNDATIONS_15_IMPROVEMENTS_2026-07-16.md`. The `regen-seasonal-roles` skill produces the role and art artifacts; this template holds the season's shape and rhythm.

A season is a 6-month cohort container bounded by equinoxes and solstices (see DOMAIN-LANGUAGE.md). Earth's own calendar is the event calendar. That is the one thing no commercial live-ops team can copy.

---

## 1. Pre-season assembly checklist (2 to 4 weeks before the boundary)

| # | Step | Produces | Tool |
|---|------|----------|------|
| 1 | Read last season's Scorecard and Lessons sections | The change list for this season | `seasons/season-N-name.md` |
| 2 | Fill the Season Briefing | Name, theme, dates, art style, budget | `skills/regen-seasonal-roles/templates/season-briefing.md` |
| 3 | Generate or evolve roles | Updated gameRoles arrays, character art, comp bands | `regen-seasonal-roles` skill |
| 4 | Create the season record | `seasons/season-N-name.md` with roles, bands, blank Scorecard and Lessons | Copy Season 1's file structure |
| 5 | Add the index entry | Dates, theme, role count, key changes, budget | `SEASONS_HISTORY.md` |
| 6 | Pick the featured quests | One featured quest per week of the season (solo and multiplayer mixed) | Quest list + `shared/multiplayerQuests.ts` |
| 7 | Mark the ecological calendar | The mid-season moment and any bioregion-specific dates (first rains, first frost, harvest peak) | Section 3 below |
| 8 | Schedule the opening ceremony | Riverside session booked, YouTube target set | Riverside pipeline (coordination engine) |

## 2. The ritual spine

A season runs on a spine of recurring rituals. Small, cheap to run, and they compound. Skipping one week is fine; skipping three kills the rhythm.

### Opening ceremony (week 1)

- A livestream through the existing Riverside pipeline (records, transcribes, and feeds the coordination engine automatically).
- Contents: name the season and its theme, introduce the role holders, walk the featured quest list, plant the season's intention.
- Afterward: post the recording thread to the forum, pin it for the season.

### Weekly rhythm (every week)

- **The campfire thread.** One forum thread per week, opened by the Season Facilitator or Forum Gardener. A single honest prompt: what grew this week, what struggled, who needs a hand. This is the season's pulse; keep it human, not administrative.
- **The featured quest.** One quest spotlighted per week (from the pre-season list). Announce it in the campfire thread.
- **The crew spotlight.** One multiplayer crew celebrated per week once Multiplayer Mode has live quests: what they did, their before and after, a link to their crew thread. When no crew completed that week, spotlight a solo completion instead.

### Mid-season moment (the ecological calendar)

- One event tied to a real moment in Earth's calendar that falls inside the season: solstice or equinox cross-quarter, first rains, first frost, harvest peak, salmon run, whatever is real in the anchor bioregions.
- Shape: a themed quest week plus a gathering (online or on land). Smaller than the opening; it exists to mark time by the land instead of the calendar app.

### Closing harvest ceremony (final week, the Season Festival)

- Livestream through the same Riverside pipeline.
- Contents, in order:
  1. The harvest: what the season grew, by the numbers and by the stories.
  2. Role holders fill the Scorecard (scope, comp, impact ratings) and the Lessons section of the season record. This is compensation-relevant: Seed and Harvest bonuses resolve here.
  3. Crews and players honored: season's completions, the crews that formed, the projects served.
  4. **Consecrate the season's map layer**: show the map's "quests completed this season" layer as the season's permanent mark on the world (ships with improvement 2; until that layer exists, show the completion feed instead).
  5. Name the next season and its boundary date. The wheel keeps turning.

## 3. Season boundaries reference

| Season start | Boundary |
|---|---|
| Spring | March equinox (~Mar 20) |
| Summer | June solstice (~Jun 21) |
| Fall | September equinox (~Sep 22) |
| Winter | December solstice (~Dec 21) |

Cohort seasons run 6 months (two wheel-seasons); the ritual spine repeats its weekly rhythm throughout and can carry two mid-season moments in a 6-month container.

## 4. What closes a season (definition of done)

- Scorecard and Lessons sections of `seasons/season-N-name.md` are filled at the Festival.
- Seed/Harvest bonuses resolved per role and credited through the standing token path.
- `SEASONS_HISTORY.md` cross-season tracking table gains the season's ratings.
- Next season's record exists (even as a stub) before the boundary date.

## 5. Where things live

- Season records: `seasons/season-N-name.md` (one per season, never edited after close except corrections)
- Index and compensation model: `SEASONS_HISTORY.md`
- Role generation: `skills/regen-seasonal-roles/` (skill + briefing template + art templates)
- Quests: `client/src/data/questData.ts` (solo), `shared/multiplayerQuests.ts` (crews)
- Ceremonies: Riverside pipeline (see `MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md`)

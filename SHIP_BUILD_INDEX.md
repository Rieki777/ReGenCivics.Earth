# ReGen Ship: Build Index and Execution Order

The one page a fresh Claude Code session reads first. Execute unbuilt docs top to bottom; each doc's own kickoff prompt governs. `SHIP_VARIABLES.md` is the live source of truth for prices and policies; the supersession ledger at the top of the main doc resolves conflicts.

| # | Doc | Scope | Status |
|---|-----|-------|--------|
| 1 | `CLAUDE_CODE_PROMPT_2026-07-10_REGEN_SHIP.md` | The ship program: schema, pages, booking, quest, concierge, emails | SHIPPED (see SHIPPED_LOG 2026-07-10) |
| 2 | `CLAUDE_CODE_PROMPT_2026-07-10_SHIP_MAP_V2.md` | Treasure map: self-hosted basemap, importers, add-to-map, coverage | SHIPPED except basemap upload (see #7) |
| 3 | `CLAUDE_CODE_PROMPT_2026-07-10_SHIP_V3.md` | Winter migration + vote, stops, fleet/UBI model, RV token rewards, experiences, milestone giveaways, story article | SHIPPED (verify against live audit) |
| 4 | `CLAUDE_CODE_PROMPT_2026-07-10_SHIP_V4_LOVE.md` | Honeymoon page, voyage types, capacity 4/5-with-kids, article | SHIPPED (article published) |
| 5 | `CLAUDE_CODE_PROMPT_2026-07-10_SHIP_QC_WORLDCLASS.md` | Review fixes + world-class audit pass | IN FLIGHT / verify |
| 6 | `CLAUDE_CODE_PROMPT_2026-07-10_SHIP_QUEST_V2.md` | 150-point threshold, weighted draws, nominations, crew profiles + sponsorship | SHIPPED + VERIFIED 2026-07-12 (config/logic/migration 0179/router/emails/tests all present; H2 prize copy resolved) |
| 7 | `CLAUDE_CODE_PROMPT_2026-07-10_SHIP_MAP_ADDENDUM.md` | BASEMAP UPLOAD (one railway-run command, unblocks the gray map), First Mate on the map, dataset door | §2 + §3 SHIPPED (First Mate map band + dataset door were already live). §1: gray map already fixed by the Esri satellite basemap (ADR-36); the PMTiles offline/fallback upload is DEFERRED to Rye (persistent R2 ECONNRESET from this machine; extract cached, uploader hardened) |
| 8 | `CLAUDE_CODE_PROMPT_2026-07-11_FIRST_MATE_COMPANIONS.md` | Personas (First Mate, Guide, Weaver+), FormCompanion voice system, audio-first sitewide | SHIPPED + VERIFIED 2026-07-12 (all sections already live; closed the last gap: mobile-safe crew profile dialog) |
| 9 | `CLAUDE_CODE_PROMPT_2026-07-11_SHIP_MAINTAINER_INVENTORY.md` | The Shipwright, Captain's Book, inventory bag, driving doctrine, 2-year booking, Mon-Sun cycle | SHIPPED 2026-07-12 (all 6 sections: Shipwright, Captain's Book, inventory, driving doctrine, year-2, Mon-Sun cycle. Migrations 0182/0183/0184) |
| 10 | `CLAUDE_CODE_PROMPT_2026-07-11_SHIP_V5_FLYWHEEL.md` | Gear manifest, Homecoming recap pages, State of the Ship, crew list, orientation gate | SHIPPED 2026-07-12 (all five: §1 gear manifest, §2 Homecoming /ship/log/{slug}, §3 State of the Ship, §4 crew list double-opt-in, §5 orientation gate. Migrations 0182/0183/0185). One follow-up: the nightly crew-list match-a-week trigger emails need a cron. |
| 11 | `CLAUDE_CODE_PROMPT_2026-07-11_AGREEMENTS_FOUNDATIONS.md` | Agreements foundations (CORE, forum, article, visuals) | OWNED BY ANOTHER SESSION, do not double-build |
| 12 | `CLAUDE_CODE_PROMPT_2026-07-14_SHIP_SANCTUARY_OF_LOVE.md` | The docking theme: /ship/theme, the four loves, the Quest of Love (7 rites), 6 themed quest actions, interior direction, CORE ownership | SHIPPED 2026-07-14 (commit a30e801; ship gate green, seed 6 inserted / 7 updated) |
| - | `RYE_BROWSER_TASKS_REGEN_SHIP.md` | Rye's human tasks (Outdoorsy, Zeffy, tracker, counsel, partnerships) | ONGOING |
| - | `SHIP_LIVE_AUDIT_2026-07-11.md` | Live-site audit findings + creative upgrades (scheduled run) | Read when present; fold fixes into the next build |

**Ground rules for every build:** read repo `CLAUDE.md` + STEERING first; update `SHIP_VARIABLES.md`, `SHIPPED_LOG.md`, and this index's Status column at the end of each build; sweep copy against the supersession ledger (no leftover top-3, 7-night, nightly-price, or 1-to-4-capacity strings); ship gate before every push.

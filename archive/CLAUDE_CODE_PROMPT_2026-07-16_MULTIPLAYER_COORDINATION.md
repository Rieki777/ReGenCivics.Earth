# Claude Code Build Prompt — Multiplayer Mode + Coordination Layer (Approved Improvements 1, 2, 3, 7, 10, 11, 12, 13, 14, 15)

Source of truth: `MISSION_FOUNDATIONS_15_IMPROVEMENTS_2026-07-16.md` including its Decision log (Rye's amendments are binding). Companions: `AGENTIC_FOUNDATIONS_RESEARCH_2026-07-16.md` (foundations), `HARVEST_MEMORY_LAYER_REVIEW_2026-07-16.md` (memory layer; M1's Worldview Pack is a soft dependency, everything here fail-softs without it).

Read first: `CLAUDE.md`, `STEERING.md` (§1 writing rules, §3 ship gate, §5 token model, §11 deterministic-first), `.ai/docs/DOMAIN-LANGUAGE.md`, `.ai/docs/security/BUILD-PLAYBOOK.md`, `.ai/docs/security/AI-AUTOMATION-RISKS.md`, `docs/GOLDEN_RULE.md`. Skills to load as you reach each phase: `regen-quest-builder`, `regen-seasonal-roles`, `regen-database-sql`, `regen-fixes-handoff`, `regen-outreach-sequences` (email copy).

Session hygiene: another session may be active in this repo. Targeted `git add` only, never `git add -A`. Check `scripts/check-migration-numbers.mjs` passes before committing any migration; take the next free number at commit time.

This prompt is five phases. Each is independently shippable in order. Do not start a later phase before the earlier one's ship gate passes. If a phase is too large for one session, finish the phase, update the FIXES doc, and stop clean.

---

## Phase A — Multiplayer Mode (improvement 1, Rye's flagship)

The frame Rye chose: this is the game's **Multiplayer Mode**. Crews of 3 to 7 players form around a quest in a bioregion and complete it together.

### A1. Migrations (`regen-database-sql` conventions, do not run them)
- `quest_crews`: id, questId FK, bioregion varchar, crewSize tinyint (target size from the quest), status enum `forming | ready | active | complete | disbanded`, forumThreadId nullable, createdAt, activatedAt nullable. Index (questId, bioregion, status).
- `quest_crew_members`: id, crewId FK, userId FK, role varchar nullable (free-text role within the crew), joinedAt, status enum `joined | left | completed`. Unique (crewId, userId).
- `quests` (or the existing quest definition table, verify the actual name in `drizzle/schema.ts`): add `crewSizeMin` tinyint null, `crewSizeMax` tinyint null, `isMultiplayer` boolean default 0. Null crew fields = solo quest, nothing existing changes behavior.

### A2. The five launch multiplayer quests
Draft with the `regen-quest-builder` skill, each structurally requiring 3 to 7 people with distinct parts (the SDT rubric: autonomy, competence, relatedness scored per quest; add that rubric section to the skill itself). Grounded suggestions to draft from (Rye edits and ratifies before seeding): a river or trailhead cleanup crew, a seed swap (growers + drivers + a host), a community meal from gleaned or local food, a land project work party day, a bioregion story harvest (interview elders of a place, one interviewer, one recorder, one writer). Seed as draft rows or a seed script; **Rye ratifies copy before they go live** (writing rules apply to every player-facing word).

### A3. Signup and crew assembly (deterministic, zero LLM)
- **Signup form** on the quest page and a dedicated `/multiplayer` page: pick one of the live multiplayer quests + your bioregion (reuse the existing bioregion vocabulary from forum/land projects; verify source of truth in schema) + an optional note. Requires sign-in (Friend tier). One active signup per quest per player.
- **Assembly job** (cron, deterministic): when signups for (quest, bioregion) reach `crewSizeMin`, form a crew: create the `quest_crews` row, add members, auto-create the **crew chat** as a forum thread (the crew's private-ish home: visible to members, seeded with a welcome post that names the quest, the members, the steps, and the definition of done), and send every member the **crew formation email** via the existing Resend infrastructure (warm copy per `regen-outreach-sequences` voice, links to the crew thread and quest). Signups beyond `crewSizeMax` start the next crew forming in that bioregion.
- **Crew lifecycle**: members can leave (crew refills from new signups while `forming`/`ready`); completing the quest walks the existing quest completion flow per member plus a crew completion moment in the thread. Token credits ride the existing `creditPrivateTokens` path with the existing quest source tag; no new token mechanics in this phase.
- Emails are rate-capped and idempotent (one formation email per member per crew, keyed).

### A4. Surfaces
- Quest cards show a multiplayer badge and live count ("4 of 5 aboard in Cascadia").
- `/multiplayer` lists the five quests, forming crews by bioregion, and the signup form.
- Player dashboard shows "your crews."

---

## Phase B — The living map layer + Needs and Offers (improvements 2 and 10)

### B1. Map layer: quests completed this season (improvement 2)
**Rye's rule: this ships on the main ReGen Civics map (`client/src/pages/Map.tsx`), never on the ReGen Ship treasure map.** The ship map's Leaflet + PMTiles stack (ADR-32/34/36) is the reference implementation to borrow patterns from, and the ship map's code stays untouched.
- One new toggleable layer: quest completions this season, aggregated per bioregion (count + glow scaled by activity; aggregate-only, no individual player locations, consistent with the Signal's aggregate-only principle, ADR-28). Add active multiplayer crews per bioregion as a second marker type from Phase A data.
- Server: one read procedure returning aggregates; cache it; zero LLM.
- Ship it, watch engagement, add further layers only after.

### B2. Needs and Offers board (improvement 10, ecosystem-wide per Rye)
- Migrations: `project_needs` (id, projectId or ownerId, kind/tags JSON, title, body, bioregion, timeWindow nullable, status `open | matched | closed`, createdAt) and `player_offers` (same shape, ownerId). Verify against `contactTags` patterns before inventing tag vocabulary; reuse the existing tag conventions.
- `/board` page: post a need or an offer (signed-in), browse and filter by bioregion and tags. Plain board first.
- **Every application form gains optional needs/offers fields** (Rye's amendment): the incubator `applications`, `investor_inquiries`, `customGameApplications`, `localFoodApplications`, and the ship application family each get an optional "what do you need / what can you offer" section writing into the same two tables, tagged with the source form. Additive columns/flows only; no existing form behavior changes.
- **Background matcher** (cron, deterministic-first): rule-level matching on tags + bioregion + time window. On a new match: send both parties an introduction email (Resend, warm copy, clearly automated, reply-to connects them, one email per match pair ever, daily cap per user, unsubscribe respected via existing suppression). No LLM in the loop at launch; the LLM warm-intro writer from the proposal waits until volume justifies it and gets its own review.

---

## Phase C — Impact schema + Federation (improvements 7 and 11)

### C1. ReGen impact schema (improvement 7)
- Zod schema in `shared/impact.ts`: hectares under regeneration, water (captured/restored), soil, food output, people housed/fed/trained, governance maturity, plus free-text context. Align field names with the Common Impact Data Standard where they map cleanly; document the mapping in the file header.
- Migration: `impact_data` JSON column on the land-project/application table (verify actual table). Admin UI: an edit panel on the project's admin view validating against the zod schema. Public display comes with the project pages later; storage and admin entry now.
- Backfill of the current cohort is Rye's hand task (small N), via the admin panel.

### C2. Federation surfaces (improvement 11)
- `GET /api/federation/projects.json`: the public project directory (name, bioregion, public impact summary from C1, public links). Public data only; the schema decides what is public, nothing personal.
- Extend `llms.txt` with the federation endpoints and canonical docs (only URLs that resolve; the phantom-URL lesson in SHIPPED_LOG applies).
- Draft **ADR: the Federation Bridge** (pattern mirrors `server/lib/hypha-bridge/`: typed intents for partner-network handoffs, never hand-rolled links). ADR text goes in the FIXES doc for Rye's acceptance, then append to DECISIONS.md. Module implementation waits for the first concrete partner integration; the ADR locks the pattern now.

---

## Phase D — Elders as quest-givers + Player memory + Peer attestation (improvements 12, 13, 14)

### D1. Elders offer quests (improvement 12)
- Add `offeredQuests` capability to the elder registry (`server/lib/elders.ts`): an elder may, in forum replies and elder chat where contextually fitting, offer one live, human-ratified quest (from the real quest list, filtered by the asker's bioregion when known; simple rules, no generation of quest content, the elder only speaks the invitation in voice). Behind `ELDER_QUEST_OFFERS_ENABLED=false` by default.
- **Governance line in the registry itself**: a `humanSteward` review field per elder recording who blesses persona + offered-quest behavior and their veto right. **Anastasia reviews and blesses before the flag ever turns on for her elder; she sets the cadence and holds standing veto.** Rye carries that conversation.
- Elder safety module and PASS gate behavior unchanged; quest offers never appear in crisis contexts.

### D2. Consent-based player memory (improvement 13)
- Migration: `player_companion_memory` (id, userId, surface, fact text, sourceRef, createdAt, supersededAt nullable). Schema-level exclusions per the AI-automation PII line: no health, conflict, finance fields; facts are game-journey facts.
- **Transparency surface ships first**: a settings page section "what the Guide remembers about you": opt-in toggle (default OFF), full list of stored facts, delete any or all, export. Ship this with zero memory writes.
- Second step in the same phase: once the surface is live, the Guide/companion flow writes small journey facts for opted-in players (quest completions, crew memberships, gratitude moments) deterministically (from events, no LLM extraction at launch) and loads them read-only into companion context framed as untrusted prior notes (contract conventions from the Mycelium review).

### D3. Peer attestation, rung 2 of the verification ladder (improvement 14)
- **ADR first** (text into the FIXES doc for Rye): the four-rung ladder (self-report → peer attestation → steward verification → evidence-backed) with token multipliers, and **Rye's amendment recorded as a core clause**: the ladder governs the internal economy only (private token credits via `creditPrivateTokens`); issuance and claims of real public tokens are verified by humans through **Hypha voting** (that is what Hypha governance is for). The ladder feeds reputation and internal credit; Hypha votes gate the chain.
- Implement rung 2: a crewmate can attest a member's quest completion (one attestation per member per quest, attester must be a co-crew member, both logged). Attested completions earn the rung-2 multiplier via the existing source-tag pattern (new source tag, e.g. `quest_attested_bonus`, following STEERING §5 exactly). Pure social mechanics, no media upload.

---

## Phase E — Docs and the civilization pattern (improvements 3 and 15)

### E1. `SEASON_TEMPLATE.md` (improvement 3)
Written from `SEASONS_HISTORY.md` + `seasons/season-*.md` with the ritual spine: opening ceremony (Riverside pipeline), weekly rhythm (campfire thread, featured quest, crew spotlight), mid-season ecological calendar moment, closing harvest ceremony consecrating the season's map layer. Structured so season N+1 is assembled from the template. Update the `regen-seasonal-roles` skill to point at it. No code.

### E2. Civilization pattern in the Custom Games blueprint (improvement 15)
Audit `blueprint.json`'s schema against the civilization pattern and add the approved improvements as optional modules: seasons + ritual spine, multiplayer mode (Phase A), needs/offers board (B2), impact schema (C1), verification ladder + Hypha split (D3), elder governance with human-steward review (D1), federation endpoints (C2), consent-based memory (D2). Update `CUSTOM_GAMES_MASTER_PLAN.md` with a "civilization pattern" section listing the modules and their config knobs, so the next custom game sale ships them. Rye's framing goes in verbatim spirit: selling a custom game is planting a civilization.

---

## Ship gate (per phase, before any VERIFIED claim)
```
python3 scripts/audit-truncation.py
rg -g '*.css' '<each-new-className>' client/src/
pnpm check
pnpm test                          # new: crew assembly forms at min size + idempotent emails; matcher one-email-per-pair; attestation constraints; memory opt-in gating; owner/tier guards
node scripts/check-migration-numbers.mjs
```
Maintain a `FIXES_TO_MAKE_2026-07-16_MULTIPLAYER_COORDINATION.md` via the `regen-fixes-handoff` skill; every CLAUDE CODE row needs Evidence. Follow the standard deploy flow in CLAUDE.md (Claude Code owns test → migrate is Rye's → ship gate → push → verify deploy).

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Ratify the five multiplayer quest drafts (copy + rewards) before seeding | Player-facing voice is yours | Drafts land in the FIXES doc |
| 2 | Apply migrations on Railway in order, verify, then push (per phase) | VM/session cannot reach Railway MySQL; order matters | `npx tsx scripts/run-migration.ts --all` then `--status` |
| 3 | Accept the two ADRs (Federation Bridge; verification ladder + Hypha split) | Load-bearing choices | FIXES doc → DECISIONS.md |
| 4 | Bring the elder quest-offer design to Anastasia; only after her blessing set `ELDER_QUEST_OFFERS_ENABLED=true` for her elder | Her world, her veto | Conversation + Railway env |
| 5 | Backfill impact data for the current cohort | Only you know the projects | Admin panel after C1 deploys |
| 6 | Confirm cron schedules for assembly job + matcher | Railway dashboard | `regen-railway-crons` skill conventions |
| 7 | Git push per phase and confirm each deploy | Standing flow | `/ship`, push, `pnpm railway:deploys` |

### CLAUDE CODE — can be done without Rye

| # | Task | Status |
|---|------|--------|
| A | Multiplayer migrations, signup form, assembly job, crew threads + emails, surfaces, quest drafts via skill | READY TO BUILD |
| B | Map layer on Map.tsx (aggregates only), needs/offers tables + board + application-form fields + deterministic matcher with intro emails | READY TO BUILD after A ships |
| C | `shared/impact.ts` + migration + admin panel; federation projects.json + llms.txt; Federation Bridge ADR text | READY TO BUILD after B |
| D | Elder `offeredQuests` behind flag + registry governance field; player memory table + transparency page then deterministic writes; attestation + ADR text + new source tag | READY TO BUILD after C |
| E | SEASON_TEMPLATE.md + skill pointer; blueprint civilization-pattern modules + master plan section | READY TO BUILD anytime (docs) |

### WAITING ON YOU
Phase A go-live waits on your items 1, 2, 7. D1's flag stays off until item 4. Each phase's deploy waits on its migrations (item 2).

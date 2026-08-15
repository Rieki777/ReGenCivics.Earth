# Claude Code Build Prompt — The Harvest, Phase 2 (Feed + Develop + Provenance)

> STAGE 3 of `BUILD_SEQUENCE_MASTER.md`. Prereqs: Stage 1 (Harvest Phase 1: capture + bridge) deployed, and Stage 2 (the Mycelium) so the drafting worker loads the Worldview Pack via `server/lib/worldview.ts` for voice instead of a raw snapshot (fail-soft if the pack is absent). As of 2026-07-16 the Phase 1 foundation (quick_notes migration, ownerProcedure, /api/harvest/* bridge, ingest_inbox.py) does NOT yet exist in the repo. Do not start this stage until Stage 1 is built and deployed.

Source of truth: `CREATION_STATION_PLAN.md` v2. Prereq: Phase 1 (capture + bridge) is deployed and captures are flowing into the vault. This phase builds the /admin-create page, the server-side generation worker, the Develop-on-demand flow, source provenance on every card, and edit in place. The learning loop is Phase 3, the auto-drive layer and email send are Phase 4.

Read first: `CLAUDE.md`, `STEERING.md`, `.ai/docs/security/BUILD-PLAYBOOK.md`, `.ai/docs/security/AI-AUTOMATION-RISKS.md`, and the Phase 1 doc. Reuse `ownerProcedure`, `invokeLLM`, `rateLimited`, and the existing article assembly line described in `second-brain/Writing Playbook.md`.

## Goal

Rye opens regencivics.earth/admin-create and sees a feed of ripe ideas and drafts. He taps Develop to turn an idea into copy across channels, edits it in place, and every card traces back to the raw source that seeded it, with the link tree and related notes.

## Build items

### 1. Migrations
- `creation_items` per the plan §7, including `source_refs` JSON and unique key `(owner_id, capture_id, channel)`.
- `source_index` per the plan §7: id, owner_id, ref_id (message or capture id), date, text, links JSON, forwarded_from, media. This is the addressable provenance store.
- `harvest_runs`: last_bridge_run_at, last_generation_run_at, counts.
Owner-gated, do not run them, Rye applies in order then pushes.

### 2. Generation worker (Railway scheduled job, hourly)
A server-side worker, not local. For the owner only:
- Score ripeness with the deterministic v1 formula in plan §1. Zero LLM for scoring.
- Draft only ideas that cross 0.6 this run (a transition) or that Rye tapped Develop. Cap at K new ideas per run (default 3), highest first. Draft one eager channel; other channels draft on demand.
- Drafting calls `invokeLLM` with the voice and style rules from the Worldview Pack (`server/lib/worldview.ts`, fail-soft to the raw voice profile if the pack is absent) plus the idea's raw sources, wrapped in delimiters and marked as data not instructions. Run the deterministic voice grader on output, only re-call the LLM to fix a flagged draft.
- Upsert into `creation_items` on the unique key. Never overwrite a row whose status has left `ready`. Record run stats in `harvest_runs`.

### 3. Provenance
- The bridge (Cowork side) pushes up, per developed idea, its `source_refs` and the raw source rows into `source_index`. Only curated idea text and raw message text needed for display cross the boundary, never secrets.
- `harvest.getSource({ itemId })` (ownerProcedure) returns the source rows, the merged link tree, and the related note refs for a card.

### 4. tRPC router — `server/routes/harvest.ts`, all `ownerProcedure`
- `listFeed({ tier })` — ripe ideas and drafts, filtered by owner, ordered by ripeness. Include `why_now` and score components.
- `develop({ captureId | ideaId, channels, angle? })` — enqueue an immediate generation for that idea. Returns the created draft(s).
- `regenerate({ itemId, nudge? })` — redraft one item. Does not count as a voice edit.
- `editItem({ itemId, body })` — save an in-place edit, set status `edited`, store the prior version for Phase 3.
- `markPosted({ itemId, channel, postedText? })` — mark shipped, capture where it went.
- `snooze({ ideaId, days })`, `notThis({ ideaId | angle })`, `steer({ ideaId, text })` — feedback signals into ripeness and future drafting.
- `getSource({ itemId })` — provenance, per item 3.

### 5. Page — `client/src/pages/AdminCreate.tsx`, route `/admin-create`
- Two tiers: **Ripe ideas** (one-line idea plus why-now plus a Develop button and an angle picker) and **Drafts** (editable copy).
- Card detail (modal or panel) with the provenance view: raw source messages with dates, the link tree of URLs (clickable), related notes as links into the vault, and the assembled drafting context. Match the local command center's detail view in `second-brain/Writing Command Center.html`.
- Edit in place with save. Per-card controls: Snooze, Not this, Steer, Regenerate with inline nudges, Copy, and Mark as posted.
- Channels: LinkedIn, Facebook, Instagram, Threads and X, newsletter blurb, and an Article output wired to the assembly line. One channel eager, rest on demand.
- A status line from `harvest_runs` (last harvest N minutes ago, counts), with a warning if generation has not run in over two hours.
- Owner-gated route guard.

### 6. Dashboard entry
A prominent button on the admin dashboard that routes to `/admin-create`.

### 7. Backlog seed (first-run)
On first load the feed must not be empty. Cowork produces a seed set from the existing vault backlog (scored ripe ideas plus their sources and drafts). Provide an owner-gated import endpoint `harvest.importSeed` that Cowork can POST to once, populating `creation_items` and `source_index` so the first open shows real copy from ideas Rye recognizes.

## Ship gate
```
python3 scripts/audit-truncation.py
pnpm typecheck
pnpm test        # ownerProcedure guards; develop creates a draft; upsert is write-once after edited; getSource returns provenance
```
Per new className, grep it in client/src. Evidence column required.

## Handoff Breakdown — Who Does What

### YOU (Rye)
| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Apply the 3 migrations on Railway, verify, then push | VM cannot reach Railway MySQL, order matters | `run-migration.ts --all` then `--status` on Windows |
| 2 | Confirm the Railway scheduled job is enabled for the worker | Railway dashboard | Railway → service → Settings |
| 3 | Git push to main and confirm the deploy | Claude Code cannot deploy | `/ship`, push, `pnpm railway:deploys` |
| 4 | Trigger the one-time backlog seed after deploy | Needs the live endpoint plus the bridge token | Tell Cowork to run the seed |

### CLAUDE CODE
| # | Task | Status |
|---|------|--------|
| 1 | 3 migrations + schema types | CODED |
| 2 | Generation worker with deterministic ripeness, transitions, caps, injection-safe drafting | CODED |
| 3 | `harvest` router, owner-gated, all procedures | CODED |
| 4 | `/admin-create` page with two tiers, provenance detail, edit in place, controls | CODED |
| 5 | Dashboard button | CODED |
| 6 | `importSeed` endpoint | CODED |

### CLAUDE (Cowork) — after deploy
| # | Task | Status |
|---|------|--------|
| 1 | Extend the bridge to push `source_index` rows and `source_refs` for developed ideas | READY TO BUILD |
| 2 | Build and POST the backlog seed from the vault (`build_provenance.py` already produces the mapping) | READY TO BUILD |

### WAITING ON YOU
Cowork items are blocked until your items 1 and 3 are done and the deploy is confirmed.

## Remaining after this
- **Phase 3, learning loop:** `voice_edits`, `voice_rules`, style-versus-content classifier, hard-rule supremacy, the Voice rules control screen. Plan §6.
- **Phase 4, self-driving layer:** auto-draft top-confidence items, resurfacing, weekly article-proposals digest, the graph view, and the hardened one-button email send. Plan §5 and §10.

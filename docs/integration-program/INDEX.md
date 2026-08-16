# Integration program documents

Adopted from `C:/Users/taren/Desktop/Amora/` on 2026-08-14 by the Master Integrator Coordinator
(ruling §8-R2 in `/INTEGRATION_LEDGER.md`: copied, never moved, because the three lane briefs
reference the Desktop paths; the Desktop copies stay until all three lanes have landed).

The coordinator's live state is NOT here. It is `/INTEGRATION_LEDGER.md` and
`/HANDOFF_NEXT_COORDINATOR.md` at the worktree root. Start there when resuming cold.

## The coordinator's own method

| Where | What it is |
|---|---|
| `/PROMPT_NEXT_COORDINATOR.md` | The takeover prompt: paste into a fresh session to run the next suite the same way. ReGen-specific layer (repos, gates, traps, rulings, Rye's list). |
| `~/.claude/skills/swarm-supervisor/` (SKILL.md, `references/failure-catalogue.md`, `references/artifacts.md`) | The generic method, v1.1.0 (2026-08-16): artifacts incl. rulings register and handoff, brief and pre-dispatch templates, landing checklist, recovery sequence, 22 catalogued tool lies and the supervisor's own errors. Invoke `swarm-supervisor` before dispatching. Machine-local and not git-tracked. |
| `skill-snapshots/swarm-supervisor-v1.1.0/` | Verbatim copy of the three skill files as of 2026-08-16, so the skill can be restored on another machine (`cp -r` into `~/.claude/skills/swarm-supervisor/`). Re-snapshot when the version bumps. |
| `/INTEGRATION_LEDGER.md` §9 | Paid lessons, ReGen-specific, appended the day they happen. The skill's catalogue is the generic form of the same entries. |
| `round2-qa/`, `round3-security/`, `round3-live-run/` | Audit reports, triage routing, closing proofs — the round shape (audit → triage → fix → closing proof) worked examples. |

## The program

| File | What it is |
|---|---|
| `PROMPT_MASTER_INTEGRATOR_COORDINATOR.md` | The standing coordinator role. The program's charter. |
| `ADDENDUM_COORDINATOR_2026-08-14.md` | Repo split, the ADR requirement, the two-file ledger shape, the diagnostic path, seven failure modes. |
| `ADDENDUM_2_COORDINATOR_2026-08-14.md` | Rye's six settled decisions, the seven diagnostic fixes, the revised nine-item landing queue. |

## The module library

| File | What it is |
|---|---|
| `MODULE_LIBRARY_TIERS_AND_PROCESS_2026-08-14.md` | Tiers, the domain rule, the 11-stage process, the platform build list. The checklist for vendor seven. |
| `MODULE_LIBRARY_CONTRACT.md` | v1.0, vendor-facing, written to be sent unchanged. Its hub home is here (ruling §8-R3); game-amora gets the framework spec, never this document. |
| `MEMORY_MODULE_BUILD_PLAN_2026-08-14.md` | Where the paywall actually lives: the credential is the licence, the flag is configuration. |

## The lanes

| File | What it is |
|---|---|
| `LANE_A_MEMORY_FOUNDATION_2026-08-14.md` | Lane A full spec: tool loop, derivation job, usage capture, the dead organize route. |
| `PROMPT_LANE_C_MODULE_LIBRARY.md` | Lane C brief: the library platform, phases C1/C2. Dispatched with amendments (ledger §8-R6). |
| `PROMPT_LANE_S_SABERRA_LISTING.md` | Lane S brief: Saberra as first listing, stages 0–5 first, stage 0 can end the lane. |

## Round 4 (Amora: library flow, power and flow map, capitals overlay, agent lessons, calendar)

| File | What it is |
|---|---|
| `ROUND4_PROPOSAL_2026-08-16.md` | Coordinator working paper: Rye's five asks verbatim, as-built facts at `135db66`, improvements, 24 numbered questions with defaults, draft lane plan L1–L7. PROPOSED, nothing dispatched. |
| `round4/AGENT_VILLAGE_DIGEST_2026-08-16.md` | Digest of the Cosmos Institute "We gave a village personal AI agents" article and every link it carries (Index Network, EdgeOS, Geo, Hermes, agentvillage repo, issue #100). |
| `round4/CALENDAR_RESEARCH_2026-08-16.md` | Community calendar designs (12 read) + the 12/13-moon astronomy and four dual-calendar layouts, 46 sources. |
| `round4/moons-2025-2028.mjs` | The `astronomy-engine` script behind the memo's new-moon / full-moon / solstice counts. |
| `round4/REMEASURE_2026-08-16_1030.md` | Workflow lane's re-measurement: main still `135db66`, PR #16 open, five dirty worktrees named with their diffs, migrations, CI = 14 steps, impact notes. |
| `round4/SOCIOCRACY_MAPS_RESEARCH_2026-08-16.md` | Peerdom, Holaspirit, GlassFrog, Sobol, Maptio, Kumu, SoFA, Nestr, D3 zoomable packing; the 14-point interaction spec for `/map/circles`; layout-engine decision. |
| `round4/NOW_VISION_INSPECTION_2026-08-16.md` | What Now and Vision draw in `grounds-v0.html` (verified by a second agent), the sheen defect, three candidate models, test plan. |
| `round4/briefs/LANE_*.md` | The ten round-4 lane briefs (L1 library flow, L1a catalog art, L2 How Power Is Held, L3 How Resources Flow, L4 grounds handover for the map session, L5a calendar core, L5b calendar community, L6 Your agent, L7 Intents & Introductions, L8 three persona QA). Dispatch state lives in the ledger §2. |

## Saberra

| File | What it is |
|---|---|
| `SABERRA_INTEGRATION_REVIEW_2026-08-14.md` | Our response to their package: findings, corrections, 16 questions. |
| `vendor-saberra-package/` | Their 8-doc package from `amora-game-integration.zip` (2026-08-11). The other side's document; not settled. |

## History

| File | What it is |
|---|---|
| `history/SWARM_LEDGER.md` | The previous coordination round's ledger. Paid lessons carried into ledger §9. |
| `history/SWARM_HANDOFF_NEXT_COORDINATOR.md` | The handoff shape this program's handoff mirrors. |
| `history/SWARM_LEDGER_2026-08-13_UI_BATCH.md` | The UI batch round. |

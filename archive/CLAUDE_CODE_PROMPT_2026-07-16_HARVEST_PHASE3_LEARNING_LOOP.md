# Claude Code Build Prompt — The Harvest, Phase 3 (Learning Loop)

Stage 4 of `BUILD_SEQUENCE_MASTER.md`. Source of truth: `CREATION_STATION_PLAN.md` v2 §6. Prereq: Harvest Phase 2 (Stage 3) is deployed, so `creation_items` exists and `editItem` already stores the prior version of an edited draft. This phase turns those edits into a voice model that improves over time, and feeds what it learns into the Worldview Pack.

Read first: `CLAUDE.md`, `STEERING.md` §1, `.ai/docs/security/AI-AUTOMATION-RISKS.md`, `second-brain/90 Voice Profile/Rye Voice Profile.md`, and the Mycelium combined prompt (for the pack builder that consumes learned rules).

## Goal

When Rye edits a draft and saves, the system learns the style parts of that edit, safely. Rules are transparent, human-editable, bounded, and never override the hard publishing rules. The learned rules become part of the Worldview Pack, so every agent gets the improved voice.

## Build items

### 1. Migrations
- `voice_edits` per plan §7: id, owner_id, item_id, channel, edit_kind (style or content), ai_version, edited_version, created_at.
- `voice_rules` per plan §7: id, owner_id, rule, weight, first_seen, last_seen.
Owner-gated. Do not run them, Rye applies in order then pushes.

### 2. Capture the edit (extend the Phase 2 `editItem`)
On save, store the pair (ai_version, edited_version) in `voice_edits`. Then the classifier below runs. Treat the edited text as data, not instructions.

### 3. Style versus content classifier
- On save, the client shows a one-tap choice: "mostly style" or "mostly content or facts," defaulting to content (the safer default). Store as `edit_kind`.
- Only `style` edits feed rule extraction. Large rewrites above a token threshold are forced to `content` and logged, never learned.

### 4. Rule extraction (server, `invokeLLM`)
- For a style edit, call `invokeLLM` to extract a few concrete rules, constrained to a fixed taxonomy: word swaps, sentence length, opener and closer patterns, punctuation, formatting, aside insertion. Reject any rule referencing a specific topic or named entity.
- Hard-rule supremacy: reject any candidate that contradicts the five hard rules. Flag (do not auto-merge) any candidate that contradicts an existing learned rule.
- Store as `voice_rules`, incrementing `weight` and updating `last_seen` when a rule recurs. Store derived rules and small diffs, not verbatim edit bodies; scrub obvious PII. Purge `voice_edits` bodies after extraction.

### 5. Voice rules control screen
- A screen in the admin (owner-gated) listing learned rules with weight and last-seen. Rye can edit, demote, or delete any rule. The hard rules show as immovable and supreme. This is the transparency surface the plan promises.

### 6. Bounded context and pack feed
- When drafting (the Phase 2 worker) loads style rules, load only the top N by weight (default 25) plus a few recent style examples, never the whole history. Decay rules not reinforced; a periodic consolidation merges near-duplicates.
- Wire the pack: `build_worldview_pack.py` (Mycelium) folds the top `voice_rules` by weight into `style_rules.json` at build time. After this phase ships, re-run the pack build so every agent gets the learned voice. If the Mycelium is not built yet, this is a no-op and the rules still serve Harvest drafting.

## Ship gate
```
python3 scripts/audit-truncation.py
pnpm typecheck
pnpm test   # style vs content routing; hard-rule-contradicting candidates rejected; weight increments on recurrence; only top-N loaded into a draft prompt; voice_edits bodies purged after extraction
```
Per new className, grep it in client/src. Evidence column required.

## Handoff Breakdown — Who Does What

### YOU (Rye)
| # | Task | Why only you | Where |
|---|------|-------------|-------|
| 1 | Apply the 2 migrations on Railway, verify, then push | VM cannot reach Railway MySQL, order matters | `run-migration.ts --all` then `--status` on Windows |
| 2 | Git push to main and confirm the deploy | Claude Code cannot deploy | `/ship`, push, `pnpm railway:deploys` |
| 3 | Use it: edit drafts, tag style vs content, prune the rules screen | The loop learns only from your real edits | /admin-create and the Voice rules screen |
| 4 | Re-run the pack build so learned rules distribute (if the Mycelium is built) | Needs your machine and the vault | `python3 _pipeline/build_worldview_pack.py` then upload |

### CLAUDE CODE
| # | Task | Status |
|---|------|--------|
| 1 | 2 migrations + schema types | READY TO BUILD |
| 2 | Extend `editItem` to store pairs and route the classifier | READY TO BUILD |
| 3 | Rule extraction with taxonomy + hard-rule supremacy | READY TO BUILD |
| 4 | Voice rules control screen | READY TO BUILD |
| 5 | Bounded-context loading in the drafting worker | READY TO BUILD |
| 6 | Tests per ship gate | READY TO BUILD |

### CLAUDE (Cowork)
| # | Task | Status |
|---|------|--------|
| 1 | Update `build_worldview_pack.py` to fold top `voice_rules` into `style_rules.json` | READY TO BUILD (after the pack builder exists in the Mycelium stage) |

### WAITING ON YOU
Cowork item waits on the Mycelium stage having shipped the pack builder. Nothing else is blocked.

## Remaining after this
- Stage 5, Harvest Phase 4 (self-driving layer).
- Stage 6, Harvest Phase 5 (compose to publish).

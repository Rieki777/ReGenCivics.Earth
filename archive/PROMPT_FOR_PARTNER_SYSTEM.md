# Prompt for the partner system: review and extend the Second Brain + The Harvest

You are being handed a working system built for Rye (founder of ReGen Civics). Your job is to study everything that exists, then extend it, so the result can be passed to Claude Code and shipped. Do not rebuild what works. Add onto it in a way that is compatible with the existing architecture and the hard rules below, and flag anything you believe is wrong rather than silently changing it.

## Why this matters (the larger frame)

This is not just a writing tool. It is the seed of a memory and worldview layer for an ecosystem of AI agents. The vault captures how Rye thinks, the language he uses, the concepts he has coined, and the sources behind them. The goal is that any agent in the ecosystem can load this and reason, write, and act in Rye's worldview and voice, with provenance back to the source. Treat what you are extending as foundational memory infrastructure, not a one-off app. Optimize for portability, interoperability, and truthful grounding.

## What already exists

Two locations. The code repo is `regen-civics-clean`. The private brain is the `second-brain/` vault inside it, which is gitignored and lives only on Rye's machine (it holds personal data, so it never gets committed or deployed).

The vault (`second-brain/`):
- Sorted notes from 5,344 Telegram Saved Messages: `01 Ideas` (216), `02 Article Seeds` (175), `03 ReGen Upgrades` (150), `04 To-Dos` (75), `05 Reference` (a Reading List), `07 Themes` (11 theme Maps of Content that form the graph), `90 Voice Profile/Rye Voice Profile.md`. `00 Inbox` and `00 Sources` are intake and raw-source folders. `06 People` is reserved.
- `00 Sources/_source_index.json`: an addressable store of all 5,343 raw messages, each with id, date, text, links, forwarded-from, and media. This is the provenance backbone. Nothing derived is orphaned from its source.
- `_pipeline/`: deterministic Python. `sort_v2.py` (one-shot re-import, wipes and rebuilds, never run in a loop), `build_graph_and_dashboards.py` (theme MOCs plus hub-and-spoke cross-links), `build_provenance.py` (maps ideas to source messages, link trees, related notes), `build_command_center.py`, `voice_grader.py` (checks drafts against the voice rules).
- `Writing Command Center.html`: a local dashboard of article ideas, filterable by theme, each card clickable into a provenance view (raw source messages, the link tree, related notes, a jump into Obsidian, and a drafting prompt built from the raw words).
- `AGENT GUIDE.md` (schema, folder conventions, index, change log, the ingest workflow), `Writing Playbook.md` (article assembly line, riff engine, ingest-and-connect), `Home.md`, `README.md`.

The plan and build docs (repo root):
- `SECOND_BRAIN_SPEC.md`: the original architecture.
- `CREATION_STATION_PLAN.md` v2: the full plan for The Harvest, a two-layer system. A local Obsidian brain (thinking, sorting, graph) plus a cloud capture and display layer on regencivics.earth, joined by a two-way bridge. Includes voice-and-text capture, a readiness feed that replaces Kanban, a Develop-on-demand action, source provenance on every card, a learning loop that studies Rye's edits to improve the voice model, and a hardened one-button email send. It has been through a security, architecture, and product review, so read the whole thing.
- `CLAUDE_CODE_PROMPT_2026-06-26_HARVEST_PHASE1.md` (capture plus bridge) and `..._PHASE2.md` (feed, Develop, provenance, edit in place). Both use a strict handoff format.

Read all of these before proposing anything.

## The design principles you must respect

1. Provenance is sacred. Every derived artifact traces to its raw source. Extend this, do not weaken it.
2. Private-first. Raw personal material stays local. Only curated idea text and the voice profile cross into the cloud, and raw captures are hard-deleted from the cloud once pulled down.
3. Deterministic-first. Prefer zero-token deterministic logic (like the ripeness formula and the voice grader) over LLM calls where it works. Reserve model spend for genuine generation.
4. One voice profile as the shared source of truth, loaded by every agent and surface. Learned rules are transparent and human-editable, never a black box.
5. Agent-agnostic. Every artifact is plain markdown or JSON with links, so any agent (Claude Code, Cowork, yours, a future one) can drive it.
6. Owner-gated and secure. Follow the repo's security playbooks. Treat all captured and transcribed text as untrusted input to any model.

## The hard rules (non-negotiable)

- Writing: no em-dashes (hyphens are fine), no contrast-framing (state things affirmatively, not "not X but Y"), no AI filler words, no rhetorical-question openers, no passive inspiration. These are in `90 Voice Profile/Rye Voice Profile.md` and `STEERING.md` section 1.
- Follow `STEERING.md` and the `.ai/docs/` conventions: append an ADR for load-bearing choices, add domain terms to the domain language doc, run the security build playbook for new endpoints and LLM features.
- Any build doc you produce must end with a Handoff Breakdown that separates what Claude Code can do autonomously from what only Rye can do (Railway migrations, env vars, git push, deploys). Match the format in the existing Phase 1 and 2 prompts.

## What to do

Study the system, then extend it toward the memory-and-worldview frame. High-value directions to consider, though you should use your own judgment and add what you see missing:

- A portable worldview and voice layer that other agents can load: a formal, versioned export of Rye's concepts, definitions, positions, and voice, with provenance, that is not tied to Obsidian or this app.
- An ontology of the domain language (the load-bearing concepts: Game, Fund, RGVoice, RCVoice, the Two Games, citizenship tiers, Hypha intents, and the rest), so agents share one vocabulary. Cross-reference the repo's domain-language doc.
- Semantic memory and retrieval over the vault (embeddings, a query interface) that respects provenance and the private boundary, so an agent can ask and get sourced answers.
- Memory hygiene across systems: how memory stays fresh, consistent, and non-contradictory as multiple agents read and write, including conflict handling and decay.
- An agent-facing contract or API over the vault and the source index, so the ecosystem's agents read and write memory the same way.
- Anything that strengthens identity, continuity, and truthful grounding as this scales from one person to an ecosystem.

## What to produce (so Claude Code can ship it)

1. A short review of the current system: what is strong, what is missing for the memory-and-agents goal, and any risks or conflicts you found. Be direct.
2. Concrete additions as new or updated documents in the same style as the existing plan and build prompts. Every buildable addition becomes a build prompt with a Handoff Breakdown, so Rye can hand it straight to Claude Code.
3. If you add a load-bearing architectural choice, write the ADR text for it.
4. Keep the existing phases coherent. Say where your additions slot in (Phase 1 through 4, or new phases), and do not reorder shipped work without explaining why.
5. Do not break the private-first or provenance guarantees. If a proposed feature would, say so and offer an alternative.

Before you hand anything back, verify it against the hard rules above, especially the writing rules and the handoff format. The output should be ready for Claude Code to build and for Rye to deploy.

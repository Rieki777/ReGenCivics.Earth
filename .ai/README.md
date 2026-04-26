# `.ai/`: Agent Steering Hub

This directory is the canonical context for every AI agent that touches this codebase: Claude (Cowork mode, Claude Code, Claude in Chrome), and any future Cursor / Codex / Gemini collaborator we add.

The pattern is borrowed from `agentic-node-starter` (MIT, by Michael Gaio / Mythic Systems). We adopted the structure on 2026-04-25 to consolidate steering material that had been scattered across `CLAUDE.md`, skills, memory files, and inline comments.

## Load order for agents

When you (an agent) start a fresh session, read in this order:

1. `/CLAUDE.md` (repo root): project entry point + the existing token-model + skills index. Still the primary file.
2. `.ai/docs/STEERING.md`: hard constraints, non-negotiable. Load these into working memory before code.
3. `.ai/docs/DOMAIN-LANGUAGE.md`: canonical terminology. Reach for this when a term feels ambiguous.
4. `.ai/docs/DECISIONS.md`: ADR-style log of architectural decisions. Read when you're about to undo or revisit a prior decision.
5. `.ai/docs/security/`: OWASP-grounded baseline + AI-automation risks. Skim the README, deep-read the relevant sub-doc when touching auth, webhooks, public input, or LLM-driven features.

Memory files in `~/.claude/memories/` (working style, infra quirks) take precedence over anything in `.ai/` because they encode Rye's preferences directly. Use `.ai/` for project facts; use memory for working preferences.

## What lives where

| Concern | Location |
|---|---|
| Hard constraints (what NOT to do, what MUST happen) | `.ai/docs/STEERING.md` |
| Canonical names + definitions | `.ai/docs/DOMAIN-LANGUAGE.md` |
| Architectural decisions + their why | `.ai/docs/DECISIONS.md` |
| Security baseline | `.ai/docs/security/` |
| Skill definitions (with frontmatter triggers) | `.claude/skills/<name>/SKILL.md` |
| Working-style preferences | `~/.claude/memories/rye-working-style.md` |
| Infra quirks / VM weirdness | `~/.claude/memories/cowork-vm-quirks.md` |
| Project entry point + token model | `/CLAUDE.md` (repo root) |
| Rolling shipped log | `/SHIPPED_LOG.md` |
| Active fixes batches | `/FIXES_TO_MAKE_*.md` (root, archived after 1 week) |

## What does NOT live in `.ai/`

- No skills (those are `.claude/skills/`)
- No code
- No commit hooks
- No deploy config
- No personal notes (those go in `.human/`, gitignored)

## Adoption history

- 2026-04-25: structure created. Seed material pulled from CLAUDE.md, SHIPPED_LOG, FIXES_TO_MAKE_2026-04-25_full-audit.md, and the project's hand-tuned skill collection.

## Maintenance

Treat `.ai/docs/` files as living. Update STEERING when a new hard constraint emerges. Append DECISIONS when a load-bearing architectural choice happens. Add a DOMAIN-LANGUAGE entry the first time you find yourself defining a term inline in code or chat. Keep entries terse and current; this isn't documentation theater.

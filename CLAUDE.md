# regen-civics — Project Context for Claude

## What This Project Is
regen-civics is a **fund and an in-real-life game** for supporting regenerative land projects and the Regenerative Renaissance — a movement to heal ourselves, our earth, our communities, and our bioregions. We create quests and games that help people heal, and in doing so build new financial, economic, and governance systems that support and network land projects across the movement.

**Current priorities:**
1. Website — getting it up and polished
2. Fundraising — raising funds for the regen-civics fund
3. Incubator — attracting quality land projects to apply for the next season

**Stage:** Active / building — running incubator seasons, fundraising live

## Team
Community of contributors. Distributed, non-hierarchical, movement-style. Rye leads and holds the vision.

## Tech Approach
Mixed — some code, some not. This is part software project, part community organizing infrastructure, part game design. Solutions should be practical and accessible, not just technically elegant.

## Tech Stack (code portions)
- [CUSTOMIZE: Frontend — e.g., Next.js, React, plain HTML]
- [CUSTOMIZE: Backend — e.g., Node.js, Python, Webflow, no-code]
- [CUSTOMIZE: Database / CMS — e.g., Supabase, Airtable, Notion]
- [CUSTOMIZE: Hosting — e.g., Railway, Vercel, Netlify]
- Google Workspace (Docs, Sheets, Drive, Gmail) — primary collaboration layer
- GitHub — code versioning and issues

## Repository Structure
[CUSTOMIZE: brief description of folders, e.g.:]
- `src/` or `app/` — main application code
- `docs/` — documentation, game specs, incubator materials
- `public/` or `static/` — assets, images, website files

## Conventions
- [CUSTOMIZE: language/framework style guide if applicable]
- [CUSTOMIZE: commit style, e.g., conventional commits]
- Plain language in all docs — written for community members, not just developers

## Core Concepts (read before writing any content)

- `CONTEXT_THE_TWO_GAMES.md` — **essential context on the Fund vs. Game distinction.** Read this before writing anything about governance, finance, tokens ($RCivics vs $ReGen), or the two-sided structure of ReGen Civics. The Fund (RCVoice / $RCivics) is anchored in the old Game; the Game (RGVoice / $ReGen) is anchored in the new Games. They work together as two sides of a bridge. This distinction shapes all copy, posts, and design decisions.

## Planning Documents (read before implementing)

These files define all outstanding work for this project. Always check them before starting any implementation:

- `FIXES_TO_MAKE_2026-03-12.md` — **current** fixes doc (2026-03-12). Start here for active fixes.
- `UPGRADE_TASKS_2026-03-10.md` — master checklist of implementation tasks (Tasks 1–20 + forum pointer).
- `FIXES_TO_MAKE_2026-03-11.md` — previous fixes log (Fixes 1–49 + planning specs, archived 2026-03-11).
- `FIXES_TO_MAKE_2026-03-10.md` — previous fixes log (Fixes 1–14, archived 2026-03-10).
- `FORUM_UPGRADES_2026-03-10.md` — forum content overhaul and Welcome Aboard Quests spec. Includes quest card UI, seed scripts, UX entry points, and forum URL mapping.
- `ReGenCivics_WelcomeAboard_Brief.md` — full content brief for the Welcome Aboard Quests: all 10 quest cards, forum post bodies, seed comments, and implementation plan.

When implementing forum features or quest cards, read `FORUM_UPGRADES_2026-03-10.md` and `ReGenCivics_WelcomeAboard_Brief.md` in full before writing any code.

## Installed Skills (ln- pipeline)
This project uses a structured delivery pipeline via the ln- skills (in ~/.claude/skills/):
- `ln-1000-pipeline-orchestrator` — kick off full feature delivery
- `ln-200-scope-decomposer` — break down large features or projects
- `ln-210-epic-coordinator` / `ln-220-story-coordinator` — planning phases
- `ln-400-story-executor` / `ln-401-task-executor` — implementation
- `ln-500-story-quality-gate` — quality check before shipping

## Key Constraints
- Accessibility matters — outputs must work for people outside tech circles
- Community-first — language and tools should feel welcoming, not gatekeeping
- Lean operations — practical and sustainable over complex and impressive
- Regenerative values — the work should embody healing, reciprocity, long-term thinking
- **Maximum autonomy** — Rye is holding a lot. Do as much as possible without asking. Only surface tasks to Rye when there is literally no way to proceed without human input. When a `[HUMAN]` step is unavoidable, complete everything else first, then ask for only the minimal required input. Try things before asking permission. Prefer attempting and reporting over asking whether to attempt.

## About Rye
Founder, movement builder, tool designer. Engagement will be extremely diverse — writing, fundraising, game design, code, strategy, community comms. All of it. See `C:\Users\taren\Documents\Claude\about-me.md` for full context.

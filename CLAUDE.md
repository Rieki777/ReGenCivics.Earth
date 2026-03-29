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

- `CLAUDE_CODE_PROMPT_2026-03-28_PART5.md` — **active** execution prompt. Recording flow fixes, Zapier data normalization, map illustration production integration, and email opt-in preference.
- `QUALITY_SPRINT_9_10.md` — quality sprint backlog. Performance, security, and code quality targets.
- `ReGenCivics_WelcomeAboard_Brief.md` — full content brief for the Welcome Aboard Quests: all 10 quest cards, forum post bodies, seed comments, and implementation plan.
- `PROGRESS_MAP_DESIGN.md` — full spec for the interactive progress map component (illustrations done, component build is next).
- `QUEST_PROGRESSION_SPEC.md` — quest locking and progression system. Unlock chain, visual states, component changes, useQuestUnlocks hook.
- `CLAUDE_CODE_PROMPT_2026-03-28_MAP_PERF.md` — **active** execution prompt. Map performance optimization, quest hero image generation, dissolve page transitions.
- `CLAUDE_CODE_PROMPT_2026-03-28_QUEST_LOCK.md` — **active** execution prompt. Quest locking UI, hero quest cards, season progress ring. Depends on MAP_PERF running first.
- `FIXES_TO_MAKE_2026-03-29.md` — **active** fixes batch. 17 fixes covering Game page copy, quest button overlap, CommandPanel collapse, parallax transparency, readability audit, steward claim bug, image upload fix, profile overhaul, nav restructure, forum link audit, 1-pager removal, glossary wiki, feature proposals, map auto-tracking.

All older prompt and fixes docs have been archived to `archive/`. Do not reference them for new work.

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

## Writing Rules (apply to ALL user-facing copy, docs, forum posts, emails, and markdown files)

These are hard rules. Not guidelines. Every piece of content produced for this project must pass all of them before it ships.

### RULE 1: No em-dashes. Zero.
Em-dashes (—) are banned in all content. Not "use sparingly." Not "one per page." Zero. Replace with a comma, a period, a colon, or rewrite the sentence entirely.
- Wrong: "This is the seed thread — share what you made."
- Right: "This is the seed thread. Share what you made."

### RULE 2: No contrast-framing.
Never define something by what it isn't. This pattern takes many forms and all of them are banned:
- "This is not X, this is Y."
- "Seed content is not marketing. It's genuine participation."
- "Players do quests. Co-creators design them." (parallel contrast implying lesser/greater)
- "Not just X, but Y."
- "Less X, more Y."
- "This isn't about X, it's about Y."

Rewrite to state what the thing IS. Lead with the affirmative.
- Wrong: "Seed content is not marketing. It's genuine participation."
- Right: "The best seed content comes from someone who has actually done the quest and written something real about it."

### RULE 3: No AI word patterns.
Banned words and phrases: "delve", "tapestry", "foster", "leverage", "it's worth noting", "in conclusion", "embark on", "vibrant", "crucial", "groundbreaking", "transformative journey", "testament to", "beacon of", "foster", "nurture" (as metaphor), "unlock", "unleash", "seamless", "robust", "comprehensive", "cutting-edge", "empower", "utilize", "navigate" (as metaphor).

### RULE 4: No rhetorical question openers.
Don't introduce sections with "What if we could...?" or "Have you ever wondered...?" Start with the thing itself.

### RULE 5: No passive inspiration.
"Join us on this journey," "be part of something bigger," "together we can" — these are vague filler. Say something specific instead.

### Voice
Direct, grounded, specific. Write as if a thoughtful person inside the regen movement wrote it. Rye's voice. First person is fine. Contractions are fine. Short sentences are fine. The site currently sounds like Rye. Keep it sounding like Rye.

## About Rye
Founder, movement builder, tool designer. Engagement will be extremely diverse — writing, fundraising, game design, code, strategy, community comms. All of it. See `C:\Users\taren\Documents\Claude\about-me.md` for full context.

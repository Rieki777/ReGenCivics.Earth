---
name: regen-deterministic-first
description: The foundational rule for designing ANY autonomous behavior, agent, automation, cron, scheduled task, or recurring action in ReGen Civics. If the work is deterministic, build a standalone tool that runs without an LLM at zero token cost, forever, and wire it to a schedule yourself. Only call an agent for the genuinely nondeterministic part, and only on a schedule. Read this before architecting anything that runs more than once. Triggers on: "autonomous", "agent", "automation", "automate", "schedule", "cron", "scheduled task", "recurring", "build a tool", "every day", "each morning", "watch for", "monitor", "poll", "auto-", "runs on a schedule", "do this repeatedly".
---

# ReGen Deterministic-First

## The rule

Before building any autonomous or recurring behavior, split it into its deterministic and nondeterministic parts.

- Deterministic part: write a plain tool that runs without an LLM. Spend tokens once to build it, then run it forever at zero token cost. Wire it to a cron or schedule yourself.
- Nondeterministic part: the only place an agent or LLM call belongs. Make it as small as possible. Call it on a schedule, only for the judgment it actually needs.

Default to building the tool. Reach for an agent only when a step genuinely needs judgment, language understanding, or open-ended reasoning that plain code cannot do. If the whole task is deterministic, there is no agent. There is just a tool that runs free.

## Why

An LLM agent charges tokens on every run and is slower. A tool written once charges nothing and runs a million times for free. Most recurring work is deterministic: polling, diffing, parsing, formatting, moving data, checking thresholds, date math. None of that needs a model in the loop. Paying per run for work you could pay for once is the most common and most invisible waste in agent design.

The phrasing to hold: spend tokens once to build the tool, then run it free, forever.

## The decision, every time

1. Can plain code do this reliably? If yes, write the tool and stop. No agent.
2. Does one step need real judgment, such as summarizing, classifying ambiguous input, writing natural language, or choosing among open-ended options? Isolate that single step. Everything around it stays deterministic tooling.
3. If the system is left unattended or the agent session is terminated, the deterministic tool keeps running on its own. The agent only wakes on its schedule, and only for the nondeterministic step.

## What a tool means here

A tool is anything that runs without calling an LLM: a TypeScript script in `scripts/`, a SQL query, a curl cron, a Railway scheduled service, a small parser, a diff, a server route. It is testable, idempotent, and free to run. Build it so it can run on a schedule with no agent attached.

## How the coordination engine already follows this

The Movement Coordination Engine is built this way on purpose. The split is the whole point of its design.

- Deterministic, zero tokens: the YouTube poll (RSS fetch and diff against `recordings.youtubeVideoId`), role reconciliation (diff `client/src/data/gameRoles.ts` against the `roleHolders` table), the stale-claim sweep (date math against the configured windows), the YouTube upload, and the publish-to-site writes. These run as curl crons and server code and cost nothing per run.
- Nondeterministic, agent or LLM: only the understanding step, where a transcript becomes an overview, chapters, decisions, and role-tagged task proposals. That is the one place judgment is required, so that is the only place tokens are spent.

The crons `cron-coordination-pipeline` and `cron-coordination-flywheel` are deterministic triggers. They do the cheap work directly and invoke the model only for the narrow step that needs it. See `regen-railway-crons` for the cron mechanics and `MOVEMENT_COORDINATION_ENGINE_SPEC_2026-06-23.md` for the full split.

## Applying it to a new request

When Rye asks for an autonomous or recurring behavior:

1. Name the deterministic parts and build them as tools, scripts, or crons first.
2. Name the single nondeterministic part, if there is one, and wrap the smallest possible LLM call around it.
3. Schedule the whole thing so the deterministic tool carries the load and the agent only wakes when judgment is genuinely required.
4. If there is no nondeterministic part, ship the tool alone. No agent, no tokens.

This is the foundation. Build the steady-state tool that is free to run. Call in an agent only for the part that truly cannot be deterministic.

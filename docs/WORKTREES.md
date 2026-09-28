# Worktree and Session Claims

Purpose: two sessions editing this repo at once caused a real divergence on 2026-07-03 (see `docs/GOLDEN_RULE.md`). This file is the shared claims board. Any Claude session (Code or Cowork) working in this repo reads it at session start, appends a claim before touching files, and removes its row when the work merges. A collision on this file at commit time is the alarm working.

Rules:

1. One row per active session or worktree: branch (or `main` for direct sessions), owner (session type + date), scope (the files/areas being touched), started.
2. Before editing, check no active row overlaps your scope. If one does, pick a different scope or wait.
3. Use targeted `git add <paths>` only, never `git add -A` (a parallel session's edits must never ride your commit).
4. Remove your row in the same commit that completes your work.
5. New migrations: run `node scripts/check-migration-numbers.mjs` before committing; take the next free number at commit time, and note it in your row while active.

| Branch | Owner | Scope | Started |
|---|---|---|---|
| main | Cowork session (agentic foundations) | server/_core/llm.ts, server/_core/env.ts, server/lib/video-tutor*.ts, server/routes/videoTutor.ts, server/routers.ts, client VideoWithTutor + Watch page + App.tsx route, root docs | 2026-07-16 |
| main | Claude Code session (multiplayer coordination, phases A-E) | quest crew tables + routes, /multiplayer, Map.tsx layer, needs/offers, per CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md | 2026-07-16 |

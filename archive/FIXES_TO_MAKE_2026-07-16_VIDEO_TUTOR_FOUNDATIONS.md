# Fixes to Make — 2026-07-16 — Video Tutor + Foundations (Cowork build session)

Built by Claude (Cowork) per `AGENTIC_FOUNDATIONS_RESEARCH_2026-07-16.md` (§2 video tutor Phase 1, §3 cost breaker, §3 concurrency). Zero migrations, zero new env vars required (two optional ones added with safe defaults). One push ships everything.

Parallel-session note: the multiplayer/Harvest session is active in this repo. This session's files are claimed in `WORKTREES.md`. Use targeted `git add` of the files listed in Fix 4.

---

## Fix 1 — Global LLM cost circuit-breaker (High)

**Status:** CODED (logic VERIFIED in sandbox harness; typecheck pending on Windows)

**Symptom:** AI-AUTOMATION-RISKS flags "no global cost circuit-breaker" as open: any runaway feature or bot on a public AI surface could burn unbounded spend.

**Fix:** Daily site-wide ceilings inside `invokeLLM` and `streamLLM` (calls + estimated tokens, ~4 chars/token, midnight UTC reset, in-memory like the videoSummary limiter). Trips throw a typed `LLMBudgetExceededError` and log loudly. `getLLMBudgetStatus()` exported for admin display. Defaults: 4,000 calls/day, 8M est. tokens/day; `LLM_DAILY_CALL_BUDGET` / `LLM_DAILY_TOKEN_BUDGET` env overrides, 0 disables.

**Evidence:** 5 breaker tests pass against the transpiled real module in the sandbox harness (`12 passed, 0 failed` run, 2026-07-17T01:58Z output above in session); vitest twin at `server/llm-budget.test.ts`.

**Files changed:** `server/_core/llm.ts`, `server/_core/env.ts`, `server/llm-budget.test.ts`.

---

## Fix 2 — Video Tutor (the Codream experience) (High)

**Status:** CODED (transcript pipeline VERIFIED live from sandbox; LLM answer + UI need Windows typecheck and a browser pass)

**What it is:** context-aware Q&A at the heart of every YouTube video on the site. The client sends the current playback second; the server answers from the transcript window around that moment (±90s) plus a whole-video gist plus canonical ReGen framing, in Guide voice. Works for ALL existing videos, nothing re-uploaded, no DB migration (in-memory transcript cache, 24h TTL).

**Real bug found and fixed while building:** YouTube's public timedtext endpoint (which `videoSummary.ts` relies on) now returns empty for every video tested. The forum video-summary feature has likely been silently skipping for some time. The tutor uses a new innertube-based fetcher (`fetchInnertubeTranscript`), which returns real captions, verified live: 286 segments for `aircAruvnKk`, 90 for `kJQP7kiw5Fk`, XML and json3 formats both parsed, cache hit 0ms.

**Surfaces:** new `/watch/:videoId` page; reusable `VideoWithTutor` component (drop-in anywhere `VideoEmbed` is used; non-YouTube URLs fall back to plain `VideoEmbed`); suggested chips ("Explain this part", "What am I looking at?", "What should I do next?").

**Guardrails:** transcript + question wrapped as source material never instructions; deterministic voice scrub on output; zod input validation (11-char id, bounded question); 5 asks/min rateLimited per user/IP; daily caps 30/bucket + 300 site-wide; all under Fix 1's global breaker. Public endpoint (the intro gate plays before sign-in); flag if you want Friend-tier instead.

**Evidence:** live transcript fetch + windowing output above (2026-07-17 sandbox run); 7 tutor logic tests + 4 parser tests pass in harness; vitest twin at `server/video-tutor.test.ts`; JSX syntax-checked via tsc transpile.

**Files changed:** `server/lib/video-tutor.ts`, `server/lib/video-tutor-context.ts`, `server/routes/videoTutor.ts`, `server/routers.ts` (mount), `client/src/components/VideoWithTutor.tsx`, `client/src/pages/Watch.tsx`, `client/src/App.tsx` (lazy import + route), `server/video-tutor.test.ts`.

---

## Fix 3 — videoSummary.ts caption fetcher is dead (Medium, follow-up)

**Status:** BLOCKED (small refactor; needs Windows typecheck to do safely)

**Symptom:** `fetchYouTubeTranscript` / `fetchYouTubeTranscriptSegments` in `server/lib/videoSummary.ts` hit the dead timedtext endpoint, so forum video summaries and anything else using them silently skip.

**Fix (for the next Claude Code session):** move `fetchInnertubeTranscript` + the two parsers into a shared `server/lib/youtube-captions.ts`, have both `videoSummary.ts` and `video-tutor.ts` import from it (avoids the circular import that blocked doing it in this session), and make videoSummary try innertube first. One session, low risk, restores a shipped feature.

---

## Fix 4 — WORKTREES.md session claims board (Medium)

**Status:** DONE (docs only)

Repo-root claims board for parallel sessions (per the 2026-07-03 divergence and this very session running beside the multiplayer build). Both active sessions' scopes recorded. Remove this session's row in the ship commit.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 1 | Run the full gates on Windows: `pnpm check` then `pnpm test` (includes the two new test files) | VM cannot run the repo toolchain (pnpm symlink store doesn't resolve over the mount) | repo root, PowerShell |
| 2 | Ship: `/ship`, targeted `git add` of the files in Fix 1 + 2 + 4 (plus this doc), commit `feat(video-tutor): context-aware video tutor + global LLM cost breaker`, push, verify deploy | Claude Cowork cannot push; parallel session active so no `git add -A` | `pnpm railway:deploys` after push |
| 3 | Smoke test in a browser: open `/watch/aircAruvnKk` (or any of your own videos), play to ~1:30, tap "Explain this part" | Needs the live site + your eyes on the answer quality | regencivics.earth/watch/... |
| 4 | Optional: set `LLM_DAILY_CALL_BUDGET` / `LLM_DAILY_TOKEN_BUDGET` on Railway if the defaults (4,000 calls / 8M tokens) don't fit | Railway dashboard | Variables tab |
| 5 | Decide: keep the tutor public (current, with strict caps) or require sign-in | Product call | Tell the next session |
| 6 | Swap high-traffic embeds (intro gate, blog, quest media) from `VideoEmbed` to `VideoWithTutor` when happy with quality | Taste call after the smoke test | Or hand to Claude Code as a one-line-per-surface pass |

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| 1 | Global cost breaker in `invokeLLM`/`streamLLM` + env + tests | CODED |
| 2 | Innertube caption fetcher + XML/json3 parsers (live-verified from sandbox) | CODED |
| 3 | Tutor lib: windowing, gist, caps, injection wrapping, voice scrub + tests | CODED |
| 4 | `videoTutor` router (status + ask), mounted | CODED |
| 5 | `VideoWithTutor` component + `/watch/:videoId` page + route | CODED |
| 6 | WORKTREES.md claims board | DONE |
| 7 | Fix 3 refactor (shared youtube-captions lib, revive videoSummary) | BLOCKED on your item 1 passing |

### WAITING ON YOU before Claude Code can proceed

Fix 3 waits on your items 1 and 2 (typecheck green + this batch shipped). Item 6 (embed swap) waits on your item 3 smoke test.

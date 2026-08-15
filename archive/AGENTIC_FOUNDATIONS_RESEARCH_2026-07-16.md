# Agentic Foundations Research — Context Hub, Codream, and the ReGen Agent Stack

Date: 2026-07-16
Status: Research + design walkthrough. No code changes. Feeds future ADRs and FIXES docs.
Inputs: andrewyng/context-hub (repo + docs), app.codream.ai (screenshots + probing), Anthropic engineering guidance (long-running agent harnesses, memory tool, context editing), 2026 industry practice on agent guardrails and outreach automation, full survey of this repo's existing agent infrastructure.

---

## 0. The through-line

Context Hub and Codream are the same idea pointed at two audiences. Both deliver the right context to an intelligence at the exact moment of need. Context Hub does it for coding agents (curated, versioned docs fetched on demand, with a learning loop). Codream does it for human learners (the current slide is already in the tutor's context, so help arrives without the learner explaining anything). The lesson for ReGen Civics: our biggest wins come from treating context as versioned, curated, incrementally fetched infrastructure, for both our agents and our players.

The good news from the repo survey: we already run one of the more disciplined agent foundations I've seen at this scale. STEERING.md, the ship gate, deterministic-first (§11), the `invokeLLM` gateway, the typed reversible `adminActions` registry, and the Evolution Engine's idempotent execution ledger are exactly the patterns the 2026 industry guides recommend. The work below is mostly extending patterns we already have, plus closing a few named gaps.

---

## 1. Context Hub: what it is and what we take from it

### What it is

`chub` is an open CLI (MIT, ~13.6k stars, v0.1.4) that gives coding agents curated, versioned, language-specific API docs. Core mechanics:

- **Search, fetch, use**: `chub search stripe` → `chub get stripe/api --lang js`. Entry point first, reference files fetched incrementally with `--file` or `--full` (no wasted tokens).
- **Frontmatter versioning**: every doc carries `versions` (package version), `revision` (monotonic content revision), `updated-on`, and `source` trust level (`official` / `maintainer` / `community`).
- **Annotations**: local persistent notes an agent attaches to a doc ("needs raw body for webhook verification"). Re-injected on future fetches only with `--with-annotations`, and always treated as untrusted input. This is cross-session agent memory with a safety posture built in.
- **Feedback loop**: `chub feedback <id> up|down --label outdated` flows to doc authors. Docs improve for everyone.
- **Multi-source registries**: `chub build my-content/` compiles any local markdown dir into a registry; config can layer `internal` sources alongside the community one with a trust policy.

### What we adopt (concrete)

1. **Install chub for coding sessions (zero cost, do first).** `npm install -g @aisuite/chub`, copy the `get-api-docs` SKILL.md into `~/.claude/skills/`. Our agents stop hallucinating Stripe/Resend/Drizzle/Leaflet APIs and stop burning tokens on web search. This directly serves the deterministic-first rule: fetching a curated doc is deterministic; guessing an API is not.

2. **Build an internal chub source from `.ai/docs/` and key specs.** `chub build` works on any content dir with frontmatter. A `regen/` registry (STEERING, DOMAIN-LANGUAGE, HYPHA-BRIDGE, token model, Evolution Engine map) means any agent in any worktree, or any future contributor's agent, fetches canonical project truth by ID instead of pathing into the repo. It also gives us incremental fetch: an agent that needs the token model gets §5, without loading all of STEERING.
   - Bonus: this is a natural distribution channel later. Land projects running their own agents could `chub get regen/incubator-application` and get the current canonical doc.

3. **Adopt chub's frontmatter on our own docs.** Our `.ai/docs/` files have no `revision`, `updated-on`, or `source` fields. Adding them is cheap and solves a real problem: agents currently cannot tell whether a doc reflects current reality (AI-AUTOMATION-RISKS already flags "system-prompt-vs-reality drift" as an open risk). A doc that says `revision: 14, updated-on: 2026-07-16` is auditable. Stale docs become findable with one grep.

4. **Adopt the annotation pattern as our agent memory convention.** See §4 (Memory). The two design choices worth copying exactly: annotations persist across sessions in a known location, and they are excluded by default and marked untrusted when included. That second choice is the guardrail most homegrown memory systems miss, and it matches our "input is untrusted, output is also untrusted" maxim.

5. **Adopt the feedback loop for skills.** We have ~25 project skills and no signal on which ones mislead agents. A lightweight convention (agents append a one-line up/down + label to a `SKILL_FEEDBACK.md` when a skill's instructions fail them) gives us the author-side loop chub gives doc maintainers. Review it when updating skills.

---

## 2. Codream: what it is and how we build it for ReGen videos

### The feature set (from the product tour)

- **Canvas + instructor video**: demos, code, and instructions render on a main surface while the instructor video plays. On mobile the video docks above the canvas.
- **Context-aware tutor**: the chatbot "understands this screen in context." Suggested prompts: "Explain this slide," "What am I looking at?", "What should I do next?" The learner never has to describe what they're seeing.
- **Dock**: play/pause, speed, captions, language selector, music mute, mic, voice-reply mute, chat toggle.
- **Voice-first Q&A**: click mic to record, click again to send. Voice replies can be muted for a text-only flow.
- **Chat panel**: realtime ("Connected"), used for longer back-and-forth, teaching, and navigation through the experience.
- **Build mode**: press Shift+S and the environment under the slide becomes a workspace; the video keeps playing in a movable mini-player. Learn and do in one surface.

Codream itself is early stage with no public docs, API, or creator program findable as of today. Watch it, but don't wait for it. The experience is buildable on our stack, and we already own most of the primitives.

### What we already have (from the repo survey)

- `VideoEmbed.tsx` (YouTube parsing, reusable), `RegenIntroGate.tsx`, `QuestTier3Media.tsx`
- `server/lib/videoSummary.ts` already pulls YouTube auto-captions (deterministic-first, no extra reasoning call)
- The companion/guide chat pattern: `guide-companion.ts`, `companion.ts`, elder retrieval, all through the `invokeLLM` gateway with failover
- The injection defense pattern (companions expose no tools; real writes run existing zod-validated procedures)
- The Riverside → webhook → admin-pasted YouTube URL recordings pipeline

That is roughly 70% of a Codream-class experience. The missing 30% is timestamps, a page, and a dock.

### Build plan (three phases, each independently shippable)

**Phase 1 — "Ask the Guide about this video" (1 to 2 sprints).** The core Codream insight with zero new hard tech:

- Store timestamped transcript chunks per video (extend `videoSummary.ts` to keep the caption segments it already fetches, new table `video_transcript_chunks`: videoId, startSec, endSec, text).
- New `/watch/:id` page (SHIPPED_LOG shows a `/videos` hub was contemplated then removed from llms.txt as phantom; this makes it real): `VideoEmbed` + a chat panel.
- The YouTube iframe API exposes `getCurrentTime()`. On each question, send the current timestamp; the server pulls the transcript window around it (±90s) plus the video summary and passes both as context to a guide-companion-style endpoint. That one move produces the "it knows what I'm looking at" magic.
- Suggested prompt chips ("Explain this part," "What should I do next?") copied straight from Codream's UX.
- Guardrails: transcripts of our own videos are near-trusted; viewer chat is untrusted per AI-AUTOMATION-RISKS. Same rate limits as Guide chat. No tools exposed.

**Phase 2 — Voice + dock (1 sprint).**

- STT: the browser Web Speech API is free and adequate for questions (mic button: click to record, click to send, exactly Codream's flow). Whisper via API is the fallback for accuracy.
- TTS: browser `speechSynthesis` is free and fine for v1; a paid voice (OpenAI TTS or ElevenLabs) only if the elder/companion voices matter enough to fund.
- Dock: speed and CC come free from the YouTube iframe player params; we add mic, speaker mute, and chat toggle. This is UI work, no new backend.

**Phase 3 — "Do mode" (the ReGen version of Build mode).** Codream's build mode drops learners into a code sandbox. Our equivalent is stronger for our mission: the canvas under the video is the game itself. "Shift+S" (or a "Do this now" chip) pauses into a mini-player and opens the real action on the site: take the first quest, join the forum thread, start an incubator application. The tutor stays in context. Video becomes onboarding that converts, which serves priority 1 (website) and priority 3 (incubator) directly. Design this with the `regen-community-onboarding` skill.

Cost note: Phase 1 fits the existing Haiku default in `_core/llm.ts`. Per-message cost is comparable to Guide chat. The open item that matters before scaling this to every video: the global cost circuit-breaker (§3).

---

## 3. Guardrails, versioning, concurrency: closing the named gaps

Grounded in what the survey found. Each item names the anchor file.

### Guardrails

| Gap | Fix | Anchor |
|---|---|---|
| No global LLM cost circuit-breaker (flagged open in AI-AUTOMATION-RISKS) | Daily token/dollar budget enforced inside `invokeLLM`; hard stop + admin notification when crossed. One function, protects every feature at once. | `server/_core/llm.ts` |
| No input pre-filter | Cheap deterministic pass before any LLM call on user content: length caps, injection-pattern regex, strip system-prompt-shaped text. Deterministic-first applies to defense too. | `server/_core/llm.ts` |
| Tool-call audit exists only for admin actions | Generalize the `adminActions` pattern: any future agent mutation goes through the typed, reversible, audited registry. The registry becomes the single mutation gate for all agents, same way `creditPrivateTokens` is the single write to private balances. | `server/routes/adminActions.ts` |
| No evals | Golden test set per LLM feature (10 to 30 fixed prompts + expected properties, run in CI as advisory). Industry planning figure is 20 to 30% of agent effort on evaluation. We currently spend ~0%. Start with Guide chat and Shipwright since both have test files to extend. | `server/*.test.ts` |

The Shipwright deterministic safety-escalation path (answers WITHOUT the LLM when a safety case is detected) is the strongest guardrail pattern in the codebase. Replicate it in every new agent surface, including the video tutor.

### Versioning

- **Model + prompt versioning is coarse.** One `DEFAULT_ANTHROPIC_MODEL` and an `AI_MODEL` env override for everything. Move to a per-feature map in `llm.ts` (`feature: { model, promptRevision }`), log both into the call metadata. When a model upgrade changes Guide behavior, we can pin per feature and roll forward feature by feature. Cheap now, painful to retrofit later.
- **Doc versioning**: chub frontmatter on `.ai/docs/` (§1.3).
- **Migration numbering is the sharpest live hazard.** 14 grandfathered `NNNN` collisions, and parallel sessions still race to claim the same next number (CI catches it only after the fact). Proposal for an ADR: new migrations use `NNNN` allocated from a `drizzle/NEXT_NUMBER` counter file committed with the migration (the claim and the file arrive in one commit, so a collision becomes a git conflict, which is loud, instead of a silent misorder). Alternative: datetime prefixes for new files. Either way, decide it in DECISIONS.md.

### Concurrency

- **Worktrees are prescribed (GOLDEN_RULE) but claims are informal.** Add a `WORKTREES.md` claims file at repo root: one line per active worktree (branch, owner session, scope, started date). Sessions read it on start, append on claim, remove on merge. This is the file-based lease pattern from Anthropic's long-running-agent harness work, and it directly addresses the 2026-07-03 divergence incident and the parallel-session sweep problem already in memory.
- **Generalize the idempotency pattern.** `governance_executions` (UNIQUE on proposalId, append-only, validate at raise AND execution) is the house pattern. The SHIPPED_LOG carryover already calls for a transaction helper for multi-step mutations; build it so agent-initiated mutations get idempotency keys by default.
- **Targeted `git add` only** stays the rule for every agent session (already in memory; worth restating anywhere agents are prompted).

---

## 4. Memory: adopting the latest Claude patterns

What changed recently and matters to us:

- **Anthropic's memory tool** (file-based, cross-session): the model issues read/write instructions; storage lives on our side as plain files. Anthropic chose files over key-value stores deliberately, since models are already fluent in file operations. Combined with **context editing** (automatic clearing of stale tool results as the window fills), Anthropic's benchmark on a 100-turn task showed 84% token savings and 39% performance improvement.
- **The initializer + progress-file harness** (Anthropic engineering, Nov 2025): long-running agents fail by one-shotting, declaring victory early, or leaving undocumented half-done work. The fix: a first-run agent that writes a feature list (JSON, statuses only editable), a progress log, and an init script; every later session starts by reading git log + progress file + feature list, verifies the environment, then does ONE increment and leaves a clean state.

We independently converged on most of this. SHIPPED_LOG.md is the progress file. FIXES_TO_MAKE docs with evidence columns are the feature list. The ship gate is the clean-state check. Two upgrades:

1. **Formalize a per-worktree `PROGRESS.md`** (or extend the FIXES doc convention): what was just done, what is half-done, what the next session should read first. SHIPPED_LOG is the record of finished work; this is the record of in-flight work, which is exactly what gets lost between sessions today.
2. **Give recurring agent surfaces a memory directory**, chub-annotation style: `memory/<surface>/` files (e.g. the admin digest agent remembers "Rye archives inquiries older than 60 days without reading them"), loaded read-only into future runs, always framed as untrusted prior notes, prunable by hand. This is how the admin and outreach agents (§5) get smarter each week without any vector database or new infrastructure. Note the deliberate echo: chub annotations, Anthropic's memory tool, and Cowork's own memory system are all the same shape. Plain files, one fact per file, untrusted on read. Use that shape.

Where the model runs matters less than the harness: these patterns work identically for Claude Code sessions, Cowork sessions, and server-side `invokeLLM` features.

### 4b. The Second Brain is the foundation of this memory layer (added 2026-07-16)

The `second-brain/` vault plus The Harvest plan (`CREATION_STATION_PLAN.md` v2) turn out to be the load-bearing answer to question 4 below (where does the agent's context canonically live) and to the memory story for every agent this report proposes. The vault already embodies the right principles: provenance to raw sources, deterministic-first pipelines, private-first boundaries, one voice profile, plain markdown any agent can drive.

The extension is specified in `HARVEST_MEMORY_LAYER_REVIEW_2026-07-16.md` and its two build prompts (the Mycelium, M1 and M2): a concept and position ontology with provenance, a versioned **Worldview Pack** loaded server-side by every agent surface through `server/lib/worldview.ts`, local-only semantic retrieval, a machine-readable agent contract, and memory hygiene (supersession, contradiction surfacing, consolidation reports).

What this changes in this report's designs:

- **The admin and outreach agents (§5) load the Worldview Pack** instead of ad-hoc persona text. The outreach agent's voice convergence (rejection reasons feeding memory files) writes into the same learned-rules layer the Harvest Phase 3 loop feeds, so both surfaces converge on one voice model rather than two.
- **The video tutor (§2) and elders answer from one worldview.** `getConcept()` gives the tutor Rye's actual definitions (Infinite Game, the Two Games) instead of the model's guesses.
- **The memory conventions in §4 gain their contract.** Per-surface memory directories follow `contract.json` rules: single write path, supersession over deletion, untrusted on read.
- **Versioning (§3) gets its first full implementation**: the pack manifest carries semver, revision, and updated-on, chub-style, which is the pattern the rest of `.ai/docs` then adopts.

---

## 5. Are you asking the right questions about agentic systems?

Short answer: your instincts encoded in STEERING §11 (deterministic-first) are ahead of most of the 2026 literature. Anthropic's core guidance remains "use the simplest pattern that works, prefer workflows over agents, add autonomy only where paths are genuinely unpredictable," and that is deterministic-first said differently. The industry converged on where you already were.

What follows is the checklist I'd run any proposed agent through, with an honest read of which questions you're already asking and which are missing.

### The seven questions per process

1. **Is this deterministic, or does it need judgment?** If a cron + a template does it, no LLM. You ask this consistently (it's a STEERING rule). Keep asking it first.
2. **What is the blast radius of a wrong action, and is it reversible?** Your `adminActions` tiers (high-stakes defaults to `blocked`) already encode this. Extend the same tiering to every new surface before it ships.
3. **Where does the human sit?** Three positions: approval gate (human approves each action), spot check (agent acts, human samples), exception handler (agent acts, escalates when unsure). Pick per action type, and plan to move actions down the ladder as trust accrues. Shopify's production rule is the industry consensus: anything touching production systems keeps a human checkpoint.
4. **What context does the agent need, and where does it canonically live?** This is the Context Hub question. If the answer is "scattered," fix the context before building the agent. An agent on bad context automates the production of confident mistakes.
5. **How do we measure it before we scale it?** Golden set + a weekly look at real transcripts. This is the question the survey says you are not yet asking anywhere in the stack, and the one the industry says eats 20 to 30% of total effort when done right. It's the biggest gap.
6. **What should it remember across runs, and in what form?** Plain files, per surface, untrusted on read (§4). Also decide what it must NOT remember (PII, anything a player shared in confidence).
7. **What stops it?** Cost cap, rate limit, kill switch, and a defined escalation path for "I'm unsure." Shipwright models the unsure path; the cost cap is the open item.

Questions 1 to 3 you're asking. Question 4 you're asking implicitly (the whole `.ai/docs` system is the answer to it). Questions 5, 6, and 7 are the growth edge, and 5 is the one to internalize hardest: the teams whose agents compound in quality are the ones with a measurement loop, since every other property (guardrails, memory, prompts) can only improve against something measured.

### The admin agent (design sketch)

You are ~80% built. The pipeline, using only existing anchors:

1. **Sense** (exists): `adminAutomations` read-only digests (`briefing_digest`, `attention_digest`), `computeEcosystemSnapshot`.
2. **Triage** (small step): the digest agent proposes actions, each one a typed entry from the `adminActions` registry with a stated reason. Nothing new executes; proposals land in an approval queue.
3. **Approve** (exists in spirit): you accept/reject in the admin panel. Every decision is logged.
4. **Execute** (exists): the registry runs it, reversible, audited.
5. **Learn** (new, cheap): accepted/rejected decisions append to the agent's memory files. After a few weeks, low-risk high-acceptance action types graduate from approval gate to spot check. Autonomy earned per action type, mirroring how the Evolution Engine treats autonomy as a governed variable.

"Nothing mutates on a timer" stays the floor until step 5 has data.

### The outreach agent (design sketch)

Industry lessons from teams running this in production: fully automated sending damages deliverability and trust; the working pattern is AI researches → AI drafts → human applies judgment → system sends and tracks → replies classify back. Start draft-only for one to two weeks and correct tone before granting any send permission.

Mapped to our stack (all anchors exist):

1. **Research**: agent enriches a target list (land projects, aligned investors) into `contactNotes` + `contactTags`.
2. **Draft**: `regen-outreach-sequences` + `regen-fundraising-copy` skills already encode voice and framing. Drafts land in `scheduled_emails` with status `draft`, never `queued`.
3. **Approve**: you review in the admin panel (or a daily digest email of pending drafts). Edit, approve, reject. Rejections with a one-line reason go into the agent's memory files, which is how the voice converges on yours.
4. **Send + track**: Resend via `server/_core/email.ts`, existing HMAC-signed tracking.
5. **Classify replies**: deterministic rules first (bounce, unsubscribe, calendar link clicked), LLM only for "interested / not now / question," and anything ambiguous escalates to you. Follow-ups re-enter at step 2 as drafts.

Volume guardrails: hard daily send cap, per-domain caps, and the global cost breaker. For a movement, one wrong-note email to an indigenous elder or a land steward costs more than fifty unsent ones. Keep the approval gate on outreach content permanently; graduate only the research and classification steps.

### Sequence (what I'd do in order)

1. Install chub + skill (an hour, immediate benefit to every coding session).
2. Cost circuit-breaker in `invokeLLM` (small, protects everything, unblocks §2 and §5).
3. Frontmatter versioning on `.ai/docs` + `WORKTREES.md` claims file + migration-numbering ADR (one foundations sprint).
4. Mycelium M1: ontology + Worldview Pack + agent contract (`CLAUDE_CODE_PROMPT_2026-07-16_MYCELIUM_M1_WORLDVIEW_PACK.md`). Every agent below loads it, so it comes before them.
5. Video tutor Phase 1 (the Codream experience, highest player-facing value), grounded in the pack.
6. Outreach agent steps 1 to 3 draft-only (serves fundraising, priority 2), voice from the pack.
7. Golden-set evals for Guide + Shipwright, then for each new surface as it ships.
8. Admin agent triage + approval queue; memory files begin accruing for both agents under the contract.
9. Mycelium M2: local retrieval, memory hygiene, encrypted backup. Harvest Phases 1 and 2 proceed on their own track per the review doc's sequencing (restore Phase 1 to buildable state first; it was never built and its prompt auto-archived).

---

## Sources

- [andrewyng/context-hub](https://github.com/andrewyng/context-hub) + [CLI reference](https://github.com/andrewyng/context-hub/blob/main/docs/cli-reference.md) + [Content guide](https://github.com/andrewyng/context-hub/blob/main/docs/content-guide.md)
- [Andrew Ng on Context Hub's growth](https://x.com/AndrewYNg/status/2033577583200354812)
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic: Context management (memory tool + context editing)](https://www.anthropic.com/news/context-management)
- [Claude cookbook: context engineering tools](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools)
- [Galileo: AI agent guardrails solutions 2026](https://galileo.ai/blog/best-ai-agent-guardrails-solutions)
- [AI agents in 2026: tools, memory, evals, guardrails](https://andriifurmanets.com/blogs/ai-agents-2026-practical-architecture-tools-memory-evals-guardrails)
- [InfoWorld: best practices for building agentic systems](https://www.infoworld.com/article/4154570/best-practices-for-building-agentic-systems.html)
- [monday.com: AI outreach agents 2026](https://monday.com/blog/crm-and-sales/ai-outreach-agents/)
- [Instantly: AI outbound automation guide 2026](https://instantly.ai/blog/ai-powered-outbound-sales-automation-guide-2026/)
- app.codream.ai (product tour screenshots; site is client-rendered with no public docs as of 2026-07-16)

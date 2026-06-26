# Dialogue Process Spec — 2026-06-25

This spec fleshes out the five proposal and dialogue improvements from `FIXES_TO_MAKE_2026-06-25_field-report-batch.md` (Fix 8). It is written as a set of concrete extensions to what already exists, so Claude Code builds on the current governance layer instead of rebuilding it.

The word "discussion" is being retired in the UI in favor of "dialogue" (Fix 8 rename). This spec uses "dialogue" throughout for the early, open, perspective-sharing stage and reserves "proposal" and "decision" for the later, binding stages.

## What already exists (build on this, do not reinvent)

- Reputation-weighted emoji reactions. Table `postReactions` (`drizzle/schema.ts` ~1514) with six emojis and a `reactionWeight`. tRPC `forum.reactions.toggle` / `forum.reactions.get` (`server/routes/forum.ts` ~744). UI `EmojiReactions.tsx`.
- Dual-key promotion. Table `forumPromotionRequests` (`drizzle/schema.ts` ~2948): proposer + co-signer, `decisionTrack` (fund/game/both), `decisionQuestion`, `suggestedTemplate`, `reversibility`, `bioregionScope`, `sunsetAt`, `status`. UI `governance/PromotionModal.tsx`.
- Decision record. Table `forumPostDecisions` (~2966): `status` (draft/open/closing_soon/closed/ratified/declined/cancelled), `outcomeSummary`, `weightedStanceSummary`, `hyphaBridgeId`, loomio fields.
- Thread banner. `governance/ForumThreadDecisionBanner.tsx`. Straw polls `governance/StrawPoll.tsx`. Vote-weight chart `WhoHoldsVoteChart.tsx`.
- The pipeline design. `FORUM_LOOMIO_HYPHA_FLOW_SPEC_2026-04-09.md` already specs 1.1 readiness checklist, 1.3 context snapshot, 1.4 living backlink, 1.6 template suggester, 1.7 draft decision, 3.3 Hypha outcome receipts. The five improvements below slot into that pipeline.
- Note: `threadStage` ("idea" / "experiment" / "result") on the thread is the thread-chain axis (Idea to Experiment to Result), a separate concept from the governance lifecycle introduced here. Keep them distinct.

## Deterministic-first (STEERING section 11)

Every recurring or automated behavior below is split into a deterministic part that runs without an LLM at zero token cost, and a nondeterministic part that calls an LLM only on explicit user action or on a schedule. The split is stated per improvement. Any auto-posted content carries clear bot provenance per `.ai/docs/security/AI-AUTOMATION-RISKS.md`.

---

## Improvement 1 — Dialogue before decision: add a Sensing stage

**What it is.** A clear governance lifecycle for a thread: Dialogue, then Sensing, then Proposal, then Decision. Sensing is the new stage that sits between open conversation and a binding proposal. In Sensing, the thread is still a conversation, but the system actively gathers where people stand and surfaces points of convergence and the questions still open, so a proposal only forms once the dialogue has matured. This is the calm, perspective-gathering posture Rye wants.

**How it extends what exists.** Today a thread jumps straight from open dialogue to a promotion request via `PromotionModal`, gated only by the 1.1 readiness checklist (thread age, number of voices). Sensing adds a visible intermediate that uses the perspective signal from Improvement 2 and the convergence math below.

**Data model.**
- Add `governanceStage` to the forum thread table: enum `dialogue` (default) | `sensing` | `proposal` | `decided`. New migration in `drizzle/`.
- Add `sensingStartedAt` timestamp (nullable) and `sensingStartedBy` int (nullable).
- No change to `threadStage`; the two coexist.

**Server.**
- `forum.enterSensing(threadId)`: sets `governanceStage = 'sensing'`. Permitted for any citizen at or above a configured tier (read the threshold from `game_variables`, do not hard-code). Idempotent.
- `forum.getSensingSummary(threadId)` (deterministic, see split): returns the convergence snapshot.
- When a promotion request is created (existing flow), set `governanceStage = 'proposal'`. When a `forumPostDecisions` row opens, it is already effectively a decision; set `governanceStage = 'decided'` when that row reaches a terminal state (closed/ratified/declined).

**Convergence snapshot (deterministic).** A pure function `buildSensingSummary(threadId)` that computes, with no LLM:
- Weighted perspective tally from Improvement 2 (counts and reputation-weighted totals per perspective).
- Top five replies by weighted reaction total (reuse `postReactions.reactionWeight`).
- Open questions: replies the author or a moderator marked as an open question (add a lightweight `isOpenQuestion` flag on replies, toggled from the reply menu), or, if that flag is not built yet, replies ending in a question mark as a v1 heuristic.
- A timeline line: started date, reply count, distinct participant count.

**Entry trigger (DECIDED, Rye 2026-06-25: auto-suggest with human confirm).** When distinct participants and weighted reactions cross thresholds read from `game_variables`, the thread shows a gentle "Ready to sense the room?" prompt. A member confirms to move the thread into Sensing. The system never flips the stage on its own without a human confirm. Manual entry stays available as a fallback for anyone at or above the configured tier. Add the threshold keys to `game_variables` (for example `governance.sensing_min_participants`, `governance.sensing_min_weighted_reactions`) so they are tunable without a deploy.

**Deterministic vs nondeterministic.** Convergence snapshot is fully deterministic. No LLM in this improvement. The optional "summarize the open questions in a sentence" belongs to Improvement 3, not here.

**Acceptance.** A thread can move dialogue to sensing; the sensing summary renders with live perspective tallies and open questions; entering Sensing is gated by tier; nothing auto-promotes without a human confirm.

---

## Improvement 2 — Perspectives as first-class signal

**What it is.** A small, named set of stances people can take on a thread in Sensing or Proposal stage, so the signal is range and readiness, not a binary for or against. This mirrors the Loomio consent gradient (agree, abstain, disagree, block) in ReGen Civics voice.

**The perspective set (proposed, confirm wording with Rye).**
- I support
- I can live with this
- I see it differently
- I need to understand more
- I have a serious concern (block)

Each carries a short helper line, matching the existing `EMOJI_LABELS` pattern in `EmojiReactions.tsx`.

**How it extends what exists.** The six content reactions in `postReactions` stay as they are (they express appreciation of content). Perspectives are a distinct, single-choice-per-person signal scoped to the thread's governance, not to each reply.

**Data model.**
- New table `forumPerspectives`: `id`, `threadId` (or `forumPostId`), `userId`, `perspective` enum of the five values, `weight` double (reputation weight, same source as reaction weight), `createdAt`, `updatedAt`. Unique on (`threadId`, `userId`) so a person holds one current perspective that they can change. New migration.

**Server.**
- `forum.perspectives.set(threadId, perspective)`: upsert the caller's current perspective, stamped with their reputation weight at set time. Changing it updates the row.
- `forum.perspectives.get(threadId)`: returns counts and reputation-weighted totals per perspective, plus the caller's current perspective. Feeds the convergence snapshot in Improvement 1 and the readiness signal for promotion.
- Readiness: extend the existing 1.1 readiness checklist so "enough voices" can read the perspective count, and so a live "serious concern (block)" is shown to a proposer before they promote, so blocks are not bypassed silently.

**UI.** A compact perspective control on threads in Sensing or Proposal stage, separate from the emoji reaction row, with the running weighted tally rendered as a calm horizontal bar. Reuse the optimistic-update pattern already in `EmojiReactions.tsx`.

**Deterministic vs nondeterministic.** Fully deterministic. No LLM.

**Acceptance.** A signed-in member can set and change one perspective per thread; tallies are reputation-weighted and update optimistically; a standing block is visible to a proposer at promotion time.

---

## Improvement 3 — Proposal drafting assist

**What it is.** When someone is ready to turn a matured dialogue into a proposal, the system hands them a neutral draft: a problem statement plus two or three option framings drawn from the conversation, which the human then edits before anything binding is created.

**How it extends what exists.** This is the concrete build of flow-spec 1.3 (context snapshot) and 1.7 (draft decision), wired to the `PromotionModal` and pre-filling `forumPromotionRequests.decisionQuestion` and `suggestedTemplate`.

**Deterministic part (always, zero tokens).** `buildPromotionSnapshot(threadId)` (named in flow-spec 1.3): gathers the OP verbatim, the top five weighted replies, replies flagged helpful or open-question, linked resources and quest IDs, the perspective tally from Improvement 2, and the timeline. This structured snapshot always exists and is shown to the proposer as the source material, with no model call.

**Nondeterministic part (on explicit click only).** A "Draft with assist" button in the promotion flow calls `regenGuide.draftDecision(threadId, template)` (flow-spec 1.7). One LLM call turns the deterministic snapshot into: a one-line neutral question, a 2-3 paragraph neutral background, 2-5 option labels with one-line rationales, and a bulleted list of concerns raised. It returns structured JSON into an editable form. The proposer edits freely and confirms. Nothing posts automatically. The draft is clearly marked as assist-generated until the human edits and accepts it.

**Guardrails.** Sanitize thread content before sending to the model and rate-limit the draft endpoint per `.ai/docs/security/AI-AUTOMATION-RISKS.md`. The model never creates the promotion request; it only fills a form the human submits.

**Acceptance.** The deterministic snapshot renders with no model call; the assist button produces an editable neutral draft; the final promotion request is always human-confirmed; input is sanitized and the endpoint rate-limited.

---

## Improvement 4 — Visible decision lifecycle on the thread

**What it is.** A calm status strip at the top of a governance thread showing where it is in its arc: Dialogue, Sensing, Proposal, Decision, with the current stage highlighted. When the thread is in Proposal or Decision, the strip also shows the reversibility (reversible, semi-reversible, one-way door) and the sunset date if set, so people can see the weight and timing of what is being decided.

**How it extends what exists.** This generalizes `ForumThreadDecisionBanner.tsx` (which today shows only the promoted-to-decision state) into a four-stage strip that reads `governanceStage` (Improvement 1), the open `forumPromotionRequests` row, and the `forumPostDecisions` row. The existing banner's live status (open, closing_soon, closed, ratified, declined) becomes the Decision segment of the strip.

**Server.** Reuse `forum.getDecisionStatus(threadId)` (flow-spec 1.4) and add the `governanceStage` plus the active promotion request's reversibility and sunset to its return shape. No new heavy work.

**UI.** A horizontal four-segment strip, current stage emphasized, the rest quiet. Reversibility shown as a small label with a plain-language tooltip ("one-way door: hard to undo, so we move carefully"). Sunset shown as "revisits on DATE" when present. Mobile-first: the strip collapses to the current stage plus a tap to expand.

**Deterministic vs nondeterministic.** Fully deterministic render from existing rows.

**Acceptance.** Every governance thread shows its current stage; reversibility and sunset appear in Proposal and Decision stages; the live decision status still updates as before; the strip is legible on a phone.

---

## Improvement 5 — Close the loop back to the land

**What it is.** When a decision that traveled to Hypha is executed on-chain, or a Loomio decision closes, the original dialogue thread receives an automatic reply recording what was decided, the weighted outcome, the reversibility and sunset, and a link to the Hypha transaction or Loomio decision page. Governance outcomes return to the conversation that birthed them.

**How it extends what exists.** This is the concrete build of flow-spec 3.3 (Hypha outcome receipts) and the living backlink (1.4). The Hypha Bridge already watches Base via Alchemy webhooks and writes events back to the ledger (`server/lib/hypha-bridge/`, and per CLAUDE.md the webhook reconciliation `webhook-receiver.cascadeClaimPassed`). The `forumPostDecisions` row already has `outcomeSummary`, `weightedStanceSummary`, and `hyphaBridgeId` to read from.

**Deterministic part (the whole thing).** A deterministic handler, fired by the existing Alchemy webhook on execution (or by the Loomio close webhook at `/api/webhooks/loomio`), posts a templated bot reply into the source thread:
- What was decided (from `outcomeSummary`).
- The weighted outcome (from `weightedStanceSummary`).
- Reversibility and sunset.
- A "view on Hypha" or "view the decision" link.
The reply is authored by a clearly labeled system account with bot provenance. No LLM is required; the fields are templated. Wire it to the existing webhook, not a new poll loop, to stay within the deterministic-first rule.

**Nondeterministic part (DECIDED, Rye 2026-06-25: include it, opt-in per decision).** A single LLM line, "what this means for the land project," generated on close and shown under the templated receipt. It is opt-in per decision (a checkbox at promotion or close time) and never blocking: if the model call fails or is skipped, the deterministic receipt still posts. Sanitize the decision content before the call and rate-limit the endpoint per AI-AUTOMATION-RISKS. Label the line as assist-generated.

**Guardrails.** Idempotent on the webhook (one receipt per decision execution, keyed by `hyphaBridgeId` or tx hash) so a re-fired webhook does not double-post. Clear bot labeling.

**Acceptance.** A closed or executed decision posts exactly one receipt reply to the source thread with outcome, reversibility, sunset, and a working link; the receipt is bot-labeled; re-fired webhooks do not duplicate it; any LLM summary line is opt-in.

---

## Build order

1. Improvement 2 (perspectives) and Improvement 4 (lifecycle strip): small, deterministic, immediately visible, and they unblock the rest.
2. Improvement 1 (Sensing stage): depends on the perspective signal from 2.
3. Improvement 3 (drafting assist): deterministic snapshot first, then the assist button.
4. Improvement 5 (loop back): wire to the existing Hypha and Loomio webhooks last, since it depends on a decision actually closing.

## Migrations and ops

Three migrations: `governanceStage` plus sensing fields on the thread table; the `forumPerspectives` table; any reply `isOpenQuestion` flag. Follow the project rule: write the numbered SQL in `drizzle/`, but running it against Railway is a human step (the VM cannot reach Railway MySQL). Use `npx tsx scripts/run-migration.ts --all` per CLAUDE.md.

## Writing rules

All copy in these surfaces follows the project rules: no em-dashes, no contrast-framing, capitalize Game as a noun, plain language for community members.

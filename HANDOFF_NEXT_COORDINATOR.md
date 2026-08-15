# HANDOFF — next coordinator session

**Everything below is verified, not remembered. Re-verify anything older than an hour.**
Regenerated 2026-08-14 ~20:00 EDT, session 1 of the standing integration program.

## 1 · Where you are

You are the Master Integrator Coordinator. Your charter, addenda and all program documents:
`docs/integration-program/INDEX.md`. Your durable state: `INTEGRATION_LEDGER.md` (read §0, §2, §4,
§6, §8 first). Your home: `C:/Users/taren/Downloads/regen-integration` on `wt/integration`
(hub repo). Invoke the `swarm-supervisor` skill before doing anything.

## 2 · What is in flight right now

Three lanes were dispatched 2026-08-14 as background agents (they DIE if the coordinator session
dies — check for their reports; if absent, re-dispatch from the amended briefs summarised in
ledger §8-R5/R6 plus the brief files in `docs/integration-program/`):

- **Lane A** — **LANDED on main `8e02dd0`** 2026-08-14, 11 gates green, 1010/0/0. If the CI-run
  result on that SHA is not yet in the ledger changelog, read it first (`gh run list --commit`).
  A live acceptance run (screenshot + real-village numbers) is on Rye's list, needs his key.
- **Lane C** (library platform C1, amended: + integration_health + correlation id + liveness
  field) — cuts `wt-library` / `wt/module-library` from `28dace2`. Migration 0079. Told to
  rebase onto main `8e02dd0` at its landing turn and about the email-config empty-value defect
  in its zone (queue item 11).
- **Lane S** — DONE for this phase, reported 2026-08-14 20:21. Stages 1–5 drafted and adopted at
  `docs/integration-program/lane-s/`; stage 0 BLOCKED: no tenant credential has ever been issued
  (B5, only Rye can obtain; the stage-1 letter carries the ask). Findings: no hard-delete
  endpoint exists (B7); Managed gate fails 7/12 rows today; sandbox tenant already live. Do NOT
  re-dispatch stages 0–5; the next Lane S action is running the pre-committed audit plan the day
  the credential lands. Migration 0080 still reserved for the build stage.

## 3 · What waits on Rye

Ledger §10. ADR-49 is RESOLVED (Rye approved, R10 — Managed-plane code authorized) and the
contract question is RESOLVED (Rye ruled publish-on-a-URL, R11 — publication queued as item 10
behind C1 + the incident log). Still open: counsel questions §3c, Saberra commercial ask,
possibly tenant access for stage 0, the eight diagnostic sentences (not yet due).

## 4 · Re-measure at open (do not inherit)

1. `git -C C:/Users/taren/Desktop/Amora/game-amora fetch origin` → new origin/main; update §0.
2. `git -C C:/Users/taren/Downloads/regen-civics-clean fetch origin` → hub origin/main.
3. Re-read both CI files at the new SHAs; re-stamp §5 if the blobs moved.
4. Re-run the 4-way migration scan before believing 0078/0079/0080 are still the allocation.
5. Check lane worktrees exist and their branches' last commit (`git log -1 --format='%h %ci %s'`).

## 5 · Known hazards in this exact state

- game-amora primary is on `voice-sweep-2026-08-01` with 52 dirty files; hub primary is on
  `ship-rite-truth` with 87 dirty. NEVER work in either primary.
- The integration worktree's `node_modules` is PARTIAL (machine slept mid-install). Run
  `pnpm install --prefer-offline` before any hub gate run.
- The lane specs' `server/index.ts` line numbers are stale at 28dace2 (+279 lines). Lanes were
  told to re-locate by content; hold them to it.
- Brand ratchet 63/63, zero headroom. Any lane adding a village name anywhere in the ratchet
  zones goes red on a file it thinks is unrelated.

## 6 · What I got wrong since the last handoff

- Dispatched the initial state-measurement fetch as a foreground call with the default timeout;
  it timed out on a slow network and cost a round. Fetches here go in the background with 300s.
- Launched a locator subagent for facts (game-amora path, Saberra zip) that one `ls` against the
  Lane C brief's paths would have answered; the agent stalled and was wasted spend. Read the
  briefs' own paths first.
- The original plan (pre-addenda) had the ledger as one file and the ADR as an afterthought;
  Addendum 1 corrected both before any damage. If you find prompt-vs-addendum conflicts, the
  addenda win on facts, the skill wins on method.

## 7 · The protocol

Every claim carries the ref it was measured at. CODED / VERIFIED / DONE, and no evidence means
CODED. A lane reporting done without a ref, gate output and skip count has not reported done.

# HANDOFF — next coordinator session

**Everything below is verified, not remembered. Re-verify anything older than an hour.**
Regenerated 2026-08-15 ~18:10 EDT after rounds 1–3 and the cost programme landed on game-amora.

## 1 · Where you are

You are the Master Integrator Coordinator. Charter, addenda, program documents:
`docs/integration-program/INDEX.md`. Durable state: `INTEGRATION_LEDGER.md` — read §0, §2 (lane
registry), §4 (queue), §6 (blockers), §8 (rulings R1–R25), §9 (paid lessons), §10 (Rye's list)
first. Home: `C:/Users/taren/Downloads/regen-integration` on `wt/integration` (hub repo; this
branch is docs-only and is NOT merged to hub main). Invoke `swarm-supervisor` before anything.

## 2 · State at handoff (2026-08-15 18:10 EDT)

**game-amora `origin/main` = `72a7fca`, live `/health` build = `72a7fca`.** Every landing of
rounds 1–3 and the cost programme is deployed: A, C (round 1); Q, M, F2, F3, F1, F4 (round 2 +
fixes); I, D (+#7, #10), P (game-amora side), K1, K2 (round 3 + cost). Landing flow since R21:
fix lanes fast-forwarded; everything else by PR with a MERGE commit (`gh pr merge N --merge`),
CI (`verify`) as the required check, then read `gh run list --commit <sha>` AND `curl /health`
before writing DONE. The CI gate set is **thirteen** steps — enumerate `.github/workflows/ci.yml`
`run:` steps; never trust a count.

**hub `origin/main` = `37c61d2`** (Lane P's pool merge, PR #41). Hub deploys from main
(Railway); its blocking gates are `pnpm gate`, `pnpm test`, `pnpm build`, `check-migration-numbers`,
`check-env-example`; `Contrast Audit` and `Lighthouse CI` workflows are BROKEN on every branch
since 08-03 (queue 32) — ignore them, do not treat as red. Hub worktree `.env` files may carry the
PRODUCTION `DATABASE_URL` behind a BOM — never run DB suites in a hub worktree without checking
which host it names.

**UPDATE 2026-08-15 ~19:50 EDT — NOTHING IS IN FLIGHT.** game-amora main = `68f832e` (live, verified);
hub main = `cbec306` (HS PR 2; PR 1's projections verified live at 19:07 EDT, PR 2's at 19:38 EDT —
both security PRs DONE).
Every lane of rounds 1–3, the cost programme, the round-2 fix set (+V2 closing proof), and the two
hub security PRs is merged. Lane worktrees are dormant on disk (all pushed; `wt-store-pool-strings`,
`wt-cost`, `wt-batch`, `wt-quests-cta`, `wt-store360`, `wt-images`, `wt-builder*`, `wt-fix-*`,
`wt-liveqa*`, `regen-pool`, `regen-pii-fix`) — safe to prune with `git worktree remove` once
their branches are confirmed merged (`git branch -r --merged origin/main`).

**Rye's open actions at handoff (sorted):** 1. rotate hub event check-in tokens + counts-only
ledger audit (item 18 — DUE, the fix is live); 2. send the Saberra stage-1 letter (that session
delivers it); 3. counsel §3c; 4. review-agent `ANTHROPIC_API_KEY`; 5. pool amount / escrow /
orphan clock; 6. HSTS domain inventory; 7. `buildRedirectUrl` gate (item 19); 8. per-user token
ceiling; 9. branch protection if not applied.

**Ready queue (nothing dispatched):** 5 incident log + liveness probe; 6 diagnostic path (needs
Rye's eight sentences); 9 Lane H; 10 publish the contract URL (after 5); 20 store perf; 24
`.invalid` health snapshot; 25/31 assistant enum + shelf lever; 28 GameMechanics z-70 bar; 32 hub
broken workflows; 33 two upload sites; 34 `loop.e2e:1015` race; 38–40 hub pre-existing defects
(localFood INSERT case bug, ToolDetail white-screen, whole-row helpers); ContributorCard
`suggestedTier` fallback (HS PR 2 note). Lane S build gated on B4/B5/B7.

(Older in-flight notes below are historical.)

**In flight (background agents die with the session — check worktrees, never re-dispatch over
pushed work):**
- **HS** — hub security. Worktree `C:/Users/taren/Downloads/regen-pii-fix`, branch `wt/pii-fix`.
  Scope WIDENED to all ten HIGH public procedures in
  `docs/integration-program/round3-security/HUB_PUBLIC_PROCEDURE_PII_SWEEP_2026-08-15.md` (PR 1),
  eleven MEDIUM (PR 2). If dead: `git status` there; resume via its transcript or re-dispatch
  from that file + ledger §2 row. **When PR 1 deploys, tell Rye to rotate event check-in tokens**
  (his item 18) — anyone could mint ledger credits with them.
- **V2** — closing mobile audit (report-only) against live ≥ `3d1e57b`; screenshots to
  `scratchpad/lane-v2/`. If dead, restart from `LANE_L_AND_V_LIVE_QA_BRIEFS.md` + the V report
  under `round2-qa/`; verdicts are the HARM metrics (see §9 "harm metric"), not raw counts.
- **Rye's own session** on the S9 e2e flake (queue 22) — land its branch when it reports.

**Not started, ready:** queue 5 (incident log + liveness probe — now safe, M landed), 6
(diagnostic path — needs Rye's eight sentences), 9 (Lane H hub-side Managed), 10 (publish the
contract on a URL after 5), 20 (store perf: `/admin` Admin chunk 328 KB), 24 (`.invalid` test
email in health snapshots), 25/31 (assistant: no-tools enum value; shelf excerpts are the next
cost lever), 27/28 (admin sign-in a11y; GameMechanics z-70 bar), 33 (two upload sites for
`prepareImageForUpload`), 34 (`loop.e2e:1015` race), 32 (hub broken workflows), 17 (delete the
hub's orphan lunar clock — Rye default yes). Lane S build stays gated on the Saberra credential
(B5), hard-delete endpoint (B7), commercial terms (B4) — the stage-1 letter is with the
"Saberra-Amora game integration" session for delivery to Rye.

## 3 · What waits on Rye (ledger §10, sorted)

1. **Send the Saberra stage-1 letter** (that session delivers the final text). 2. **Rotate hub
check-in tokens after HS PR 1 deploys** + audit ledger credits. 3. Counsel §3c (entity, DPA,
agency-vs-resale, UBIT incl. 4a/4b). 4. Review-agent `ANTHROPIC_API_KEY` in GitHub secrets (his
spend). 5. Pool amount per cycle (default 5,000 $ReGen; ships at 0), escrow (default treasury),
orphan clock (default delete). 6. HSTS needs the Railway domain inventory. 7. Per-user token
ceiling (default measure-only). 8. Branch protection settings if not yet applied. Everything else
was decided by ruling and recorded.

## 4 · Re-measure at open (do not inherit)

1. `git -C C:/Users/taren/Desktop/Amora/game-amora fetch origin` → origin/main; `curl -s
   https://amora.regencivics.earth/health` → live build; update ledger §0.
2. `git -C C:/Users/taren/Downloads/regen-civics-clean fetch origin` → hub origin/main.
3. `gh pr list` in both repos — anything open is a lane's unlanded work.
4. Re-run the 4-way migration scan before believing 0080 (Saberra reserved) / 0083+ free.
5. For each in-flight worktree: `git status --short | wc -l`, `git log -1`, `git rev-parse
   origin/<branch>` — committed vs pushed vs dirty decides resume-vs-redispatch.

## 5 · Known hazards in this exact state

- game-amora primary is on `voice-sweep-2026-08-01` (52 dirty); hub primary `regen-civics-clean`
  on `ship-rite-truth` (87 dirty). NEVER work in either.
- The full-suite mutex `C:/Users/taren/Desktop/Amora/.test-lock` became pathological under 5+
  lanes (4-hour waits). Standing clearance: lanes may skip the local suite when the mutex is held
  and CI is green on their tip — CI runs the identical suite on MySQL 9.4 and is authoritative;
  local adds only MariaDB coverage. Lanes must release only locks they acquired.
- Playwright `networkidle` never fires on this app (pulse endpoint + notification poller).
- `railway variables` needs `--service "Amora Game"` from a project-linked dir (`wt-cost` is
  linked); the standing test admin `integration-qa` is minted per
  `docs/integration-program/tools/mint-test-token.mjs` — secret from stdin, never on disk.
- Brand ratchet 63/63, zero headroom; read `$?`, and `$?` after a pipe is the pipe's exit.
- Two of every three "hollow green" incidents this program had were a missing/BOM'd `.env`.

## 6 · What I got wrong since the last handoff (all recorded in §9 at full prominence)

- Misrouted two mid-flight messages to the wrong lane (handles read swapped) — verify handles
  against the dispatch record.
- Compressed a research relay into a claim that conflated a KB policy figure with a contract
  clause — Lane M correctly refused to transcribe it.
- Wrote a brief whose root-cause hypothesis was wrong (F1 measured the truth) and whose target was
  a raw count that a sampled sweep cannot reach — write HARM metrics as targets.
- Misapplied a game-amora CI memory to the hub when briefing Lane P (hub has no bundle budget).
- Let a lane report "eleven gates" after CI had grown to twelve — the count lives in `ci.yml`.

## 7 · The protocol

Every claim carries the ref it was measured at. CODED / VERIFIED / DONE; DONE means CI green on
that SHA AND the live build marker matches AND, where the change is user-visible, a live probe.
A lane reporting done without a ref, gate output and skip count has not reported done.

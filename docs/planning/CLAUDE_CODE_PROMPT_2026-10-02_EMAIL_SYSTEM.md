# Claude Code prompt: the ReGen Civics email lane (2026-10-02)

You are the email lane for ReGen Civics. Rye asked for this lane himself.

Your job is to fix and upgrade the ReGen Civics email system, following the brief below. Another lane is building the same design for Village OS (Amora) in a different repo; you share no files with it.

## Read first

1. **The repo:** `C:\Users\taren\Downloads\regen-civics-clean` (GitHub `Rieki777/ReGenCivics.Earth`).
   - Read these:
     - `CLAUDE.md`
     - `.ai/docs/STEERING.md`: the writing rules, the ship gate, verify-on-production, where docs live, and the commit protocol
     - `docs/GOLDEN_RULE.md`
     - `docs/DEPLOYMENT.md`
     - the worktree claims board, `WORKTREES.md`, under `docs/` if it has moved
   - Read them from `origin/main` (for example `git show origin/main:CLAUDE.md`), never from that checkout's working tree.
   - The main checkout is on a stale branch with another session's work in it. Do not work, commit or stash there.
2. **Your brief:** `C:\Users\taren\Desktop\Amora\regen-email-lane\FIXES_TO_MAKE_2026-10-02_EMAIL_SYSTEM.md`.
   - It maps how email works today.
   - It lists the defects in Phase A and the upgrades in Phases B to D.
   - It ends with the Handoff Breakdown.
3. **For the target shape:** sections 3 to 5 of `C:\Users\taren\Desktop\Amora\VILLAGE_COMMS_PLAN_2026-10-02.md`. That is the Village OS design, which these upgrades should match.

## Set up

1. Fetch: `git -C C:/Users/taren/Downloads/regen-civics-clean fetch origin`.
2. Make your own worktree beside the repo, never under a temp folder:
   `git -C C:/Users/taren/Downloads/regen-civics-clean worktree add --no-track -b wt/email-fixes C:/Users/taren/Downloads/regen-email-fixes origin/main`
3. In the new worktree, `git rev-parse --abbrev-ref --symbolic-full-name @{u}` must fail. No upstream means a bare `git push` cannot reach main by accident. Push with an explicit refspec.
4. Copy `.env` from the main checkout, then run `pnpm install`.
5. Append your claim row to the worktree claims board.
6. Your first commit: copy the brief to `docs/planning/FIXES_TO_MAKE_2026-10-02_EMAIL_SYSTEM.md` and this prompt to `docs/planning/CLAUDE_CODE_PROMPT_2026-10-02_EMAIL_SYSTEM.md`. Commit both by pathspec.

## Order

1. Phase A, in the priority order the brief gives.
2. Phase B.
3. Phase C. It is large: land it in pieces, each one green, deployed and checked.
4. Phase D: write it as a plan only, until Rye says go.

## Rules

1. **Verify each defect in the code before fixing it.**
   - The brief was written from reading the code, not from running it.
   - If an item is not real, mark it NOT A DEFECT, with the evidence.
2. **One commit per fix, or per tight group of fixes.**
   - Commit by pathspec (`git commit -m "..." -- paths`).
   - Each commit carries a test that fails on the old code. Record the test's name in the Evidence column.
3. **No bursts of stale mail.**
   - Before deploying anything that changes who gets mail or when, write in the brief what the first run after the deploy will send.
   - If you cannot tell, ask Rye before deploying.
4. **Never email a real person to test.**
   - Use Resend's test addresses: `delivered@resend.dev`, `bounced@resend.dev`, `complained@resend.dev`.
   - Add a `+label` for each scenario.
5. **Production: use only the standard deploy flow on your own.**
   - What you may do without asking is the standard deploy flow in `CLAUDE.md`: ship gate, migrations with the runner, push to main, watch the Railway deploy, check live.
   - Anything else that reads or writes production needs Rye's yes first. That covers Railway variables, database reads beyond a migration, and the Resend dashboard or API.
   - Ask once, with the exact list (brief items R-3 and R-4).
6. **The writing rules (STEERING section 1) apply to every email word you touch.** No em dashes, no contrast framing, no AI filler words, no rhetorical openers.
7. **Run the ship gate before any DONE or VERIFIED:** `pnpm gate`, the className gate, `pnpm test` (plus `pnpm test:integration` for server logic), and `pnpm build`.
8. **Keep the Handoff Breakdown current as you go.** Use statuses from the regen-fixes-handoff SOP.
9. **Use these skills:** `regen-ship-gate`, `regen-database-sql`, `regen-railway-crons`, `regen-fixes-handoff`.

## Done means

- Phases A to C are VERIFIED with evidence, deployed, and checked live against Resend's test addresses.
- Phase D is written as a plan that matches the Village OS engine.
- The brief and `SHIPPED_LOG.md` are updated.
- You send Rye one report covering:
  - what shipped, with the evidence;
  - what is waiting on him (the Handoff Breakdown);
  - anything you found that the brief missed.

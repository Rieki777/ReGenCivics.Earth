# Hypha Bridge Fixes to Make, 2026-04-19

Companion to `SPEC_05_QUEST_DISCLOSURE_V2.md` and `CLAUDE_CODE_PROMPT_2026-04-19_QUEST_DISCLOSURE.md`. Catches three bridge-related bugs found in the pre-refactor audit plus the status of the upstream Hypha PRs.

## Context

The Submit Proposal flow is:

1. User on `/quest` taps a card, opens `QuestDetailModal`.
2. Taps "Finish this Quest" (will become "Submit Proposal on DAO" in the action bar after SPEC_05).
3. Opens `SubmitToDAOModal`, enters deliverable URL.
4. Calls `trpc.hyphaBridge.createFromQuest`, which builds a `HyphaBridgePayload` and stores a bridge record.
5. Redirects to `/bridge/hypha/:bridgeKey` (the `BridgeHypha` page) which shows a preview.
6. User clicks "Continue to Hypha". Server builds `https://app.hypha.earth/en/dho/regen-games/agreements/create/propose-contribution?bridgeKey=...&title=...&description=...&payouts=...&attachments=...&leadImage=...` via `buildHyphaTargetUrl`.

Every step on our side is wired and shipped. Server-side code lives under `server/lib/hypha-bridge/` and the tRPC router at `server/routes/hyphaBridge.ts`. The bridge page is `client/src/pages/BridgeHypha.tsx`. The client modal is `client/src/components/SubmitToDAOModal.tsx`.

---

## Fix 1: `SubmitToDAOModal` imported but not rendered in `Quest.tsx` (Low)

**Status:** CODED in SPEC_05 and the Claude Code prompt. Cleanup happens during the SPEC_05 refactor.

**Symptom:** `client/src/pages/Quest.tsx` line 43 has `import { SubmitToDAOModal } from "@/components/SubmitToDAOModal"` but the component is never rendered anywhere in the file. Dead import.

**Root cause:** Leftover from an earlier wiring attempt. The modal only mounts inside `QuestDetailModal` now.

**Fix:** Remove the import line. Addressed in Phase 5 of `CLAUDE_CODE_PROMPT_2026-04-19_QUEST_DISCLOSURE.md`, and the ship-gate now includes a negative grep to enforce it: `rg -g '*.tsx' 'SubmitToDAOModal' client/src/pages/Quest.tsx || echo PASS` must print `PASS`.

**Files changed:** `client/src/pages/Quest.tsx`.

**Evidence today:** `grep -n SubmitToDAOModal client/src/pages/Quest.tsx` returns only line 43 (the import), no JSX usage.

---

## Fix 2: `leadImageUrl` omitted from `SubmitToDAOModal` call site (Medium)

**Status:** CODED in SPEC_05 and the Claude Code prompt. Fix happens during the SPEC_05 refactor.

**Symptom:** `client/src/components/QuestDetailModal.tsx` line 765 renders `<SubmitToDAOModal>` but the parent passes only `questId`, `questTitle`, `questDescription`, `questDeliverable`, `regenReward`. The `leadImageUrl` prop is declared optional on the modal (line 25) and passes through to the server (`createFromQuest` accepts it, `buildHyphaTargetUrl` forwards it to `leadImage` searchParam), but the parent never sends the quest card image.

**Root cause:** The prop was added to the modal interface but never wired in the parent component.

**Fix:** Pass `leadImageUrl={quest.imageUrl}` on the `<SubmitToDAOModal>` render in the new action bar. Covered in Phase 5 of `CLAUDE_CODE_PROMPT_2026-04-19_QUEST_DISCLOSURE.md` section 5.1a. The ship-gate now enforces it with a positive grep.

**Impact:** Once Hypha PR 1 and PR 2 land (see below), proposals created via the bridge will include the quest card image as the proposal lead image. Without this fix, the proposal page will show no hero image.

**Files changed:** `client/src/components/QuestDetailModal.tsx`.

---

## Fix 3: Trailing NUL padding on `Quest.tsx` and `QuestDetailModal.tsx` (Low)

**Status:** CODED in SPEC_05 and the Claude Code prompt. Automatic cleanup happens at the end of Phase 5.

**Symptom:** `client/src/pages/Quest.tsx` has 1173 trailing NUL bytes past the final `}`. `client/src/components/QuestDetailModal.tsx` has similar padding. The `audit-truncation.py` script tolerates this (it strips trailing NULs before deciding whether the last real character is a valid closer), so the ship gate passes. But ripgrep treats the files as binary and refuses to search them by default.

**Root cause:** Leftover from an earlier file-truncation incident (see commit `619190f` "Restore 15 truncated files; strip NUL padding"). These two files were restored but the NUL padding was not stripped.

**Fix:** Run `python3 scripts/audit-truncation.py --clean-nul` after the SPEC_05 writes complete. The flag exists for exactly this case.

**Files changed:** `client/src/pages/Quest.tsx`, `client/src/components/QuestDetailModal.tsx`.

**Evidence today:**

```
File size: 79521 bytes (Quest.tsx)
NUL bytes found: 1173
First NUL at byte: 78348
```

---

## Fix 4: Hypha upstream PRs (HUMAN STEP REQUIRED)

**Status:** BLOCKED on Rye. Claude Code has no `gh` CLI access from the Cowork sandbox. PR status must be verified manually.

**Context:** `HYPHA_BRIDGE_QUEST_SUBMISSION_SPEC.md` lists four PRs needed on `hypha-dao/hypha-web` for full pre-fill to work:

| PR | File | Priority | What |
|----|------|----------|------|
| PR 1 | `apps/web/src/app/[lang]/dho/[id]/@aside/agreements/create/propose-contribution/page.tsx` | Highest | Accept `searchParams` and pass values into the form |
| PR 2 | `packages/epics/src/agreements/components/create-agreement-base-fields.tsx` | High | Apply the values as React Hook Form `defaultValues` |
| PR 3 | Wherever `ProposalCreated` emits | Optional | Echo `bridgeKey` back in the title marker |
| PR 4 | Payout field component | Nice-to-have | Pre-fill token amounts from searchParams |

**GitHub account:** `Rieki777` (per `CLAUDE.md`). Fork: `https://github.com/Rieki777/hypha-web`.

**What Rye needs to do:**

```bash
# From any terminal with gh auth
gh pr list --repo hypha-dao/hypha-web --author Rieki777 --state all --limit 20
gh pr list --repo Rieki777/hypha-web --state all --limit 20
```

Note which of PRs 1–4 are open, merged, closed, or not yet submitted. Paste the result back here or into the fixes doc. Claude Code can then write any missing PRs using the `hypha-pr-workflow` skill (at `.claude/skills/hypha-pr-workflow/SKILL.md`).

**Fallback while PRs are pending:** The bridge page at `/bridge/hypha/:key` already shows the player every field they need before they continue. On arrival at Hypha the form is blank (Hypha does not yet read our URL params), but the player can keep the bridge tab open and copy-paste. This is documented in `HYPHA_BRIDGE_QUEST_SUBMISSION_SPEC.md` "The current fallback while PRs are pending".

---

## Handoff Breakdown, Who Does What

### YOU (Rye), things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| 4 | Check status of Hypha upstream PRs (1, 2, 3, 4) in `hypha-dao/hypha-web` and our fork `Rieki777/hypha-web`. Report which are open, merged, or not yet submitted. | Claude Code has no `gh` CLI in the Cowork sandbox. | `gh pr list --repo hypha-dao/hypha-web --author Rieki777 --state all --limit 20` and `gh pr list --repo Rieki777/hypha-web --state all --limit 20` |

### CLAUDE CODE, already done or can be done without you

| # | Task | Status |
|---|------|--------|
| — | SPEC_05 updated with Hypha Bridge preservation section and 5 new ship-gate greps | DONE |
| — | `CLAUDE_CODE_PROMPT_2026-04-19_QUEST_DISCLOSURE.md` updated with Phase 5.1a Hypha Bridge preservation (explicit wiring + dead import cleanup + NUL scrub) | DONE |
| — | Manual-check list extended from 16 to 17 items (new item 17: full bridge round-trip from action bar to Hypha URL) | DONE |
| — | Ship-gate block extended from 8 to 11 checks with positive and negative greps | DONE |
| 1 | Remove dead `SubmitToDAOModal` import from `Quest.tsx` | CODED in SPEC_05 (executes during Phase 5) |
| 2 | Wire `leadImageUrl={quest.imageUrl}` on `SubmitToDAOModal` in `QuestDetailModal.tsx` | CODED in SPEC_05 (executes during Phase 5) |
| 3 | Strip NUL padding via `python3 scripts/audit-truncation.py --clean-nul` | CODED in SPEC_05 (executes end of Phase 5) |

### WAITING ON YOU before Claude Code can proceed

Fix 4 (Hypha upstream PRs). Once you report PR statuses:

- If PR 1 or PR 2 are not yet submitted, Claude Code writes them using the `hypha-pr-workflow` skill (`.claude/skills/hypha-pr-workflow/SKILL.md`).
- If they are open but stalled, Claude Code drafts a follow-up comment or responds to CodeRabbit review.
- If they are merged, we close out this doc and the full bridge flow is live.

Fixes 1, 2, 3 are not waiting on you. They run automatically when you hand the SPEC_05 work to Claude Code.

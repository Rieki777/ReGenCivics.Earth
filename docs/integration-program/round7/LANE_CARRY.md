# Lane CARRY — the six things a month of uncommitted work actually still holds

**Read `../round6/BUILD_HOUSE_RULES.md` first.** It is current and carries every correction round 6
produced, including the measured gate baseline. Both files bind.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-carry`, branch `wt/r7-carry`, cut from `origin/main`
at **`a9f55de`**, deps installed, `.env` present. **No migration. Do not take a number.**

---

## 1 · Why this lane is small, and why that is the finding

The primary Amora checkout has sat on a dead branch since 2026-08-11 with a working tree nobody had
committed. It was described as a month of work at risk. **A five-agent read-only investigation
settled it against `origin/main = a9f55de`, and then an adversarial pass tried to refute every
"unlanded" claim and refuted none:**

- **All four commits ahead are LANDED**, three under different SHAs and one superseded by better
  work. **The one that sounded most substantial — a whole messaging module — is on main with three
  weeks of further work on top of it.**
- **The untracked set is 120 files, not 35.** 65 are on main at the identical path, **including
  every single file the handoff named** — the quest board, crews, village brain, assistant, drafts,
  village readers, and all three drizzle migrations. 42 are byte-identical and in the 23 that
  differ, **main is ahead**.
- **There is no migration collision at all.** 0052, 0053, 0067 and 0068 are byte-identical on main
  by blob hash. Nothing to renumber. **Next free number is 0107.**

**Six things survive. One is code. Five are documents.** That is your whole scope.

## 2 · What to carry

Take each from the snapshot commit **`519a5da`** (`snapshot/pre-recovery-2026-08-29`, pushed), which
holds the primary checkout's entire uncommitted state. `git show 519a5da:PATH > PATH` is the shape.
**Do not touch the primary checkout itself** — it is shared, it is still dirty, and it is off limits.

1. **`client/src/components/GameDashboard.tsx` — the only code.** Fourteen lines that turn each of
   the four quest rows on the member dashboard from dead text into a link to that quest's own page,
   with a hover transition on the title. **Verified still applicable at `a9f55de`**: main already
   imports `Link`, `questId` is on `ClaimRecord` in `server/repos/quests.ts` and reaches the client
   through `/api/game/me`, and all five lines the edit deletes are still present on main unchanged.
   **Re-verify that yourself before applying it**, then apply it as a real change rather than a
   patch: read main's current markup and write the linked version against it.
2. `docs/LIVING_MAP_PLAN.md`
3. `docs/QUEST_POSTER_ART.md`
4. `docs/village-map-directions.html`
5. `docs/prototypes/qa-evidence/` — ten images.
6. `docs/prototypes/QA_REPORT_LIVE_2026-08-08.md`

**Read each document before you commit it.** Some are eight weeks old and describe a product that has
moved a long way. **If one is simply wrong now, say so and do not carry it** — a stale plan committed
into `docs/` is worse than an absent one, because the next reader inherits it as current. Carrying it
with a dated header saying what it was true of is an acceptable middle.

## 3 · The residual worth more than most of the above

**`client/src/pages/Admin.tsx` sends `difficulty`, `duration` and `impact` to
`PUT /api/admin/quests/:id` and gives a founder no way to set any of them.** The quest story editor
landed on main without those three inputs while the save payload and the dirty-check projection both
carry them. Proven: `grep -n "difficulty" Admin.tsx` on main returns exactly two hits, the projection
and the payload, and `grep -c "Impact line"` returns 0 against a control that returns 2; and
`git log -S 'Impact line'` on that file is empty, so **main never had them.**

**This is the missing-trigger class: three fields the server accepts and no door to reach them.** Add
the Difficulty select, the Duration input and the Impact-line input into the collapsed story section,
matching the shape of the fields already beside them. **Note main has since promoted Circle to the
top grid with a `list="quest-circles"` datalist — build onto main's current layout, not the
snapshot's.**

## 4 · One factual divergence to resolve in main's favour

The snapshot's `docs/FORK_RUNBOOK.md` says forming a crew opens a conversation when messaging is on.
**Main says the opposite and main is right**: *"Crews carry no conversation yet;
`crewsRepo.attachConversation` is ready for the messaging module … when it lands."* **Do not carry
the local sentence.** It describes behaviour the product does not have, which is the
fallback-is-a-claim defect in documentation form. `FORK_RUNBOOK.md` is otherwise out of scope: read
it, change nothing else in it.

## 5 · Your zone

**Yours:** `client/src/components/GameDashboard.tsx`; the quest-board story section of
`client/src/pages/Admin.tsx`; and the five documents in §2 under `docs/`.

**No other lane is live in this repo right now**, so the usual contention rules are slack. That is
not licence to widen: **anything outside §2 and §3 is a written request to the coordinator.**

## 6 · Gates

The standard eighteen-step set, plus the two path-gated workflows if you touch the module framework
(you should not). **Two budget gates were checked for you and neither covers what you are adding**:
`check-image-budget.mjs` scans `client/public` only, and `check-artifact-budget.mjs` measures only
`docs/prototypes/grounds-v0.html`. So the ten images and the new documents are gate-safe. **Confirm
that yourself rather than trusting it** — read the two scripts' scan roots.

`check-doc-links.mjs` watches six documents; if you link a new file from one of those it must
resolve.

**Watch for the build abort**: `pnpm build` can return exit 0 while the artifact still carries the
previous commit. `grep -c "$(git rev-parse --short HEAD)" dist/index.js` is the only honest check,
and it fired twice in one evening in round 6.

## 7 · Report

The block at the end of the build house rules, plus: **which of the five documents you judged still
true, which you dated, and which you refused to carry, with the reason for each.** Status stops at
CODED.

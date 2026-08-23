# HANDOFF — round 5, regenerated 2026-08-22, late

**Everything below is verified, not remembered. Re-verify anything older than an hour; main advanced
thirty-three times today.**

Read `INTEGRATION_LEDGER.md` first: §7 changelog (newest at the top), §8 rulings R43-R58, §9 paid
lessons. This file is the volatile state a summary would drop.

---

## 1 · State at writing

- **game-amora `origin/main` = `95b315c`.** Thirty-three merges today. Landed since the last
  regeneration: **#63** map panel and building tap, **#62** silhouettes and moon, **#65** governance
  fixes, **#64** place photographs, **#66** the org posture (R57), **#67** the upload strip,
  **#69** the decisions rail, **#68** the admin sweeps.
- **Three PRs open, all waiting on CI:** **#70** the Hypha module, **#71** the waiting-proposal page,
  **#72** a one-line copy-book correction (coordinator's own).
- Coordinator home unchanged: `C:/Users/taren/Downloads/regen-integration` on `wt/integration`,
  docs-only. NEVER work in the primary checkouts. **The primary `game-amora` checkout is parked on
  `voice-sweep-2026-08-01` and runs far behind main** - read `origin/main` with
  `git show origin/main:PATH`, never the working tree.

## 2 · Lanes in flight

| Lane | Branch | Holds | Collision note |
|---|---|---|---|
| Hypha | `wt/r5-hypha` | PR #70. The bridge becomes a module. Migrations **0096, 0097** | Owns `shared/hypha.ts`, `server/lib/hypha-bridge.ts`, `server/lib/base-reads.ts`, `api/admin/hypha` |
| Waiting | `wt/r5-waiting` | PR #71. Three proposal states made distinguishable | **OWNS `client/src/pages/GameMechanics.tsx`** |
| Door gate | `wt/r5-doorgate` | A CI check that catches `SITE_PAGES` drifting behind the router | `scripts/`, `ci.yml`, `CLAUDE.md`. **Must not write `grounds-v0.html`** |

**Next free migration number is 0098** (0094 and 0098 were released back unspent).

## 3 · What only Rye can close

- **Should `org.public_people` be founder-held or proposable?** It shipped founder-held; under R54
  that is a live question, and it is one word to flip.
- Enabling `governance`, `crowdpool`, `resources`, `introductions` on live (all ship OFF).
- Rotate `AUTH_TOKEN_SECRET` and the Alchemy key; `AGENT_INTENT_WRITE`; the ElevenLabs spend.
- **A real Base key**, without which the Hypha module's chain paths cannot be driven for real.
- **Sourcing the CC0 nature recordings.** CC0 ONLY - a CC-BY sample creates an attribution
  obligation every fork inherits and silently violates. The BBC library is out on non-commercial
  terms.
- The three photo gaps: no way to find photographs of yourself, no subject request without an
  account, and a takedown keeping the alt text.

## 4 · Chips filed and not started

- **The investor-docs upload has never worked** (writes columns the repo lacks, `title` NOT NULL,
  so the insert always throws) **and every gate passes it.** The chip also asks the general question:
  how many admin routes have a door, a caller and a handler that cannot succeed?
- `SignInToSee` wants the shape `PeopleLock` now has.
- A non-UTC `NOW()` staleness bug in `onchain_balances`.

## 5 · The traps, and the ones this round added

- **`git grep` matches NOTHING when the pattern starts with `/`.** Prove every negative against a
  known-present control IN THE SAME COMMAND.
- **A dormant column is an ARMED column.** `gratitude` sat `transferable = 1` for eighty-five
  migrations while nothing read it; the send surface reads it. Grep for what else is seeded and
  unread before shipping the reader.
- **`docs/modules/*.md` is a live retrieval corpus.** One stray word flipped which module the
  assistant retrieved and turned `knowledge.test.ts` red. Prose there is a behaviour change.
- **A probe can pass on a button nobody can press.** Display, opacity and the rectangle all pass on
  a COVERED control. Ask whether the browser would deliver the tap.
- **A falling mutation score can mean the fix worked.** `break_maia_journey` went 15/15 to 13/15
  because two guards became unreachable, not unsafe. Reading that as a regression would have
  reverted a correct fix.
- **The two size budgets pull in opposite directions**, and **CLAUDE.md's figures went stale twice**
  before #61 removed them. Trust `scripts/check-dist-budget.mjs` and `ls drizzle/*.sql | wc -l`.
- **A push green is not a merge green.** When the two runs disagree, the answer is on main.
- **The `.test-lock` mutex is a convention nothing enforces.** Check for a sibling process BEFORE
  diagnosing a cascade.
- **A long-running lane is not a stuck lane.** Ask it four specific questions rather than reading
  its transcript, which will overflow context.

## 6 · The rulings that shape everything

- **R51 - adding to the running lane is the norm.** New work touching a file a lane holds goes to
  that lane as a numbered brief addendum, never a second lane into the same files.
- **R52 - motion that ANSWERS the person is alive, motion that INTERRUPTS is noise.**
- **R53 - the mask and the truth are separate layers.** Anyone re-skins their own view; only
  builders move buildings and boundaries.
- **R54 - admin is scaffolding, not a tier.** An electorate that can vote to enlarge its own powers
  is the destination. Does this move a power toward the village, or entrench the scaffolding?
- **R55 - the handover is a journey to celebrate, never a scorecard to fail.** No ranking, no
  nagging, no percentage-incomplete. Would a two-week-old and a two-year-old village both feel good
  opening this?
- **R56 - state what is true, then get out of the way.** Villages set their own dials, including a
  1% quorum. A count is a fact; a warning is an argument. **Is this telling them something they
  cannot see, or telling them what to want?**
- **R57 - a village's people are PUBLIC BY DEFAULT**, with a village-set lock (`org.public_people`).
  The narrow exception to R56: what crosses into public is a person's-exposure question, since real
  people become visible and they did not vote on it.
- **R58 - the Base listener follows the HOSTING RELATIONSHIP** (we host, we run it; they self-host,
  they run it); **do not architect against a future write, which is not the same as authorising
  one**; every module is FREE in v1.0 and earns $ReGen on usage; **other DAO stacks get SIBLING
  modules rather than edits.**

## 7 · Before ending any turn that started work

Update the ledger §7 and §8, regenerate this file, commit and push `wt/integration`, and tell Rye
what landed, what is in flight, and what only he can do. **Do not wind down or archive while lanes
run or the queue is non-empty** - that is in the skill now, and it was a correction he had to make.

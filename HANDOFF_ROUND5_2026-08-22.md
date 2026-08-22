# HANDOFF — round 5, regenerated 2026-08-22, late

**Everything below is verified, not remembered. Re-verify anything older than an hour; main advanced
twenty-two times today.**

Read `INTEGRATION_LEDGER.md` first: §7 changelog (newest at the top), §8 rulings R43-R56, §9 paid
lessons. This file is the volatile state a summary would drop.

---

## 1 · State at writing

- **game-amora `origin/main` = `be35e9a`**, and **its own CI run is green.** Twenty-six merges today.
  Landed since the last regeneration: **#61** (docs), **#63** (the map panel merge and the building
  tap), **#62** (the silhouette field and the unity moon).
- **No PR open.** Four lanes are working and none has opened one yet.
- Coordinator home unchanged: `C:/Users/taren/Downloads/regen-integration` on `wt/integration`,
  docs-only. NEVER work in the primary checkouts. **The primary `game-amora` checkout is parked on
  `voice-sweep-2026-08-01` and runs far behind main** - read `origin/main` with
  `git show origin/main:PATH`, never the working tree.

## 2 · Lanes in flight

| Lane | Branch | Holds | Collision note |
|---|---|---|---|
| Photos | `wt/r5-photos` | Community photo uploads on a place, like a listing. Migrations **0093, 0094**. Also owes the server half of the `paid` RSVP refusal | Uploads/media regions of `server/**`; **now unblocked to take the artifact** |
| Gov fix | `wt/r5-gov` | The no-quorum kill, four unconductable wizards, four dead pieces in 0089, the `objections` field on the list payload, then advisory votes. Migration **0095** | Ballots/governance regions of `server/index.ts`. **Client changes route to the trail lane, never direct** |
| Admin sweep | `wt/r5-adminsweep` | Stable ordering for tables reading `members.all()`, and accessible names that swallow their hint | **OWNS `client/src/pages/Admin.tsx`.** Both sweeps are one lane for exactly this reason |
| Trail | `wt/r5-trail` | The two adjacent weight-trail cards on `/decisions` | **OWNS `components/governance/**` and the Decision pages** |

**Next free migration number is 0096.**

## 3 · Migration numbers, allocated not scanned

**0092 landed** (#59). **0093 and 0094 are held by the photos lane in an unpushed tree. 0095 is the
gov lane's.** Next free is **0096**. Two lanes both ran a correct four-way scan today and both took
0090, because a number held in a sibling's unpushed tree is invisible to every prong at once.
**Renaming a migration replays it** - the ledger keys on filename.

## 4 · Queued, with why each waits

1. **The handover** (task 30) - powers votable, the handover surface, closing the silent badge-edit
   gap. Spec adopted at `d533308`. **The gov-fix lane is its foundation**, so this follows it rather
   than running beside it.
2. **On-chain provenance for `hypha.space_id`** (task 15) - free to dispatch.
3. **The `/api/org` token posture** (task 23) - **needs Rye.**

The three chips Rye started are now the admin-sweep and trail lanes in §2, so nothing is queued
behind `Admin.tsx` any more. **Four concurrent lanes is the practical ceiling**, because they share
one local MySQL and queue on `.test-lock`, and a full suite runs 200-300s. Land one before
dispatching the fifth.

## 5 · What only Rye can close

- The `/api/org` posture above.
- Enabling `governance`, `crowdpool`, `resources`, `introductions` on live (all ship OFF).
- Rotate `AUTH_TOKEN_SECRET` and the Alchemy key; `AGENT_INTENT_WRITE`; the ElevenLabs spend.
- **Sourcing the CC0 nature recordings.** The audio layer ships complete with a manifest and NO
  assets by design: licence verification is a human step and a fabricated licence is worse than
  silence. **CC0 ONLY** - a CC-BY sample creates an attribution obligation every fork inherits and
  silently violates. The BBC library is out on non-commercial terms.

## 6 · The traps, and the four this round added

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

## 7 · The rulings that shape everything

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

## 8 · Before ending any turn that started work

Update the ledger §7 and §8, regenerate this file, commit and push `wt/integration`, and tell Rye
what landed, what is in flight, and what only he can do. **Do not wind down or archive while lanes
run or the queue is non-empty** - that is in the skill now, and it was a correction he had to make.

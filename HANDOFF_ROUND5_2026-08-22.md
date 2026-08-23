# HANDOFF — round 5, regenerated 2026-08-22, late

**Everything below is verified, not remembered. Re-verify anything older than an hour; main advanced
forty-plus times today.**

Read `INTEGRATION_LEDGER.md` first: §7 changelog (newest at the top), §8 rulings R43-R58, §9 paid
lessons. This file is the volatile state a summary would drop.

---

## 1 · State at writing

- **game-amora `origin/main` = `7e730a7`.** Every PR dispatched today is merged: #62 #63 #64 #65 #66
  #67 #68 #69 #70 #71 #72 #73 #74 #75. **No PR is open.**
- Coordinator home unchanged: `C:/Users/taren/Downloads/regen-integration` on `wt/integration`,
  docs-only. NEVER work in the primary checkouts. **The primary `game-amora` checkout is parked on
  `voice-sweep-2026-08-01` and runs far behind main** - read `origin/main` with
  `git show origin/main:PATH`, never the working tree.
- **Merged worktrees are deliberately NOT pruned.** Several checkouts on this machine are shared
  with other sessions; reclaiming disk is not worth pulling one out from under live work.

## 2 · Lanes in flight

| Lane | Branch | Holds | Collision note |
|---|---|---|---|
| Onsite | `wt/r5-onsite` | The missing door to the village's own mechanics vote, `auto_apply_enabled`, the `passed_onsite` apply button, two stale Hypha sentences, **and the weight routes that notify nobody** | **OWNS the governance block of `server/index.ts`, `client/src/pages/GameMechanics.tsx`, `shared/gameVariables.ts`** |
| Clock | `wt/r5-clock` | `readOnchainBalance`'s freshness window compares the DB clock to the process clock; plus a sweep of the class | `server/lib/base-reads.ts` and wherever the sweep leads, outside Onsite's zone |

**Next free migration number is 0099** (0098 was spent by G-B; 0094 and the strip lane's 0098 grant
came back unspent and 0098 was reissued).

## 3 · What only Rye can close

- **DENY-BEATS-ROLE, and it got sharper.** Unchanged since S36: a warning badge's deny beats a role
  grant. **But #75 grew its blast radius** - on a village-held key an admin is now judged on steps 2
  to 5, so a warning badge's deny can stop an admin too. The break-glass covers either answer, so
  nothing is stuck; the choice is real rather than theoretical now.
- **R58c collides with `poolStatus`**, which returns `platform-built -> not eligible` for any module
  without a `builtBy` credit, so every platform-written module is out of the pool by the existing
  rule. **And nothing measures module usage at all.** Needs both a metering mechanism and a ruling.
- **Should `org.public_people` be founder-held or proposable?** Shipped founder-held; one word to flip.
- **A real Base key**, without which the Hypha module's mainnet paths cannot be driven.
- The three photo gaps: no way to find photographs of yourself, no subject request without an
  account, and a takedown keeping the alt text.
- Enabling `governance`, `crowdpool`, `resources`, `introductions` on live (all ship OFF).
- Rotate `AUTH_TOKEN_SECRET` and the Alchemy key; `AGENT_INTENT_WRITE`; the ElevenLabs spend.
- **Sourcing the CC0 nature recordings.** CC0 ONLY - a CC-BY sample creates an attribution
  obligation every fork inherits and silently violates. The BBC library is out on non-commercial terms.

## 4 · Chips filed and not started

- **The investor-docs upload has never worked** - it writes columns the repo lacks with `title` NOT
  NULL, so the insert has always thrown, **and every gate passes it because a caller exists.** The
  chip also asks the general question: how many admin routes have a door, a caller and a handler
  that cannot succeed?
- `SignInToSee` wants the shape `PeopleLock` now has.

## 5 · Still owed, with nobody on it

- **`member.vouch` is gated by nothing at all** - declared, and in no route anywhere. Second
  confirmed instance of the declared-but-unenforced capability class after `quest.propose`.
- **Eight real powers cannot be transferred yet** (`ballot.vote`, `proposal.decide`, `quest.consent`,
  `map.publish`, `map.curatePhotos`, `feed.announce`, `health.record`, `org.declare`): they are inline
  `hasCapability` calls that never see the request, so the break-glass cannot reach them. Each is one
  small refactor, and the work is named in `shared/capabilities.ts`.
- The handover spec's **G-C** (transfer as its own proposal type) and **G-D/G-E** remain unbuilt.
- One `verify_door_routes.js` citation survives inside `grounds-v0.html`, editable only by a lane
  holding that file through a guarded patch script.

## 6 · The traps, and the ones this round added

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

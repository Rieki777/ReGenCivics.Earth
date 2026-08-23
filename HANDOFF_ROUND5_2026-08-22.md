# HANDOFF — round 5, regenerated 2026-08-22, late

**Everything below is verified, not remembered. Re-verify anything older than an hour; main advanced
forty-plus times today.**

Read `INTEGRATION_LEDGER.md` first: §7 changelog (newest at the top), §8 rulings R43-R58, §9 paid
lessons. This file is the volatile state a summary would drop.

---

## 1 · State at writing (2026-08-23, early hours)

- **game-amora `origin/main` = `e6c96a4`.** Twenty-five PRs merged in the round, **#62 through #86**.
  **No PR is open.**
- Coordinator home unchanged: `C:/Users/taren/Downloads/regen-integration` on `wt/integration`,
  docs-only. NEVER work in the primary checkouts. **The primary `game-amora` checkout is parked on
  `voice-sweep-2026-08-01` and runs far behind main** - read `origin/main` with
  `git show origin/main:PATH`, never the working tree.
- **Merged worktrees are deliberately NOT pruned.** Several checkouts here are shared with other
  sessions; reclaiming disk is not worth pulling one out from under live work.

## 2 · Lanes in flight

| Lane | Branch | Holds | Collision note |
|---|---|---|---|
| Eight | `wt/r5-eight` | The last eight powers whose routes cannot carry the break-glass, converted to `mayAct` with `TRANSFERABLE` flipped in the same commit | Governance and capability surfaces. **Migration 0103 if needed.** |

**Next free migration number is 0103** (0101 spent by METER; 0102 and 0103 unused).

**FOUR blocking gates landed in this round and every future lane meets them:** `check-repo-payloads.mjs`
(an insert omitting a NOT NULL column cannot succeed; **`int` is NOT exempt**, only `bool` and
`defaultNow`), `check-mirror-annotations.mjs`, `check-upload-strip.mjs`, `check-map-routes.mjs`.

## 3 · What only Rye can close

- **The module contract version was deliberately NOT bumped.** Clause 14 fixes the eligibility rule
  and R59 changes it. **That is a change to what a builder is paid.**
- **R59 shrinks what third-party builders are paid**, in proportion to how much platform-built
  modules are used, which today is nearly all of it. Not lost, but real.
- **The pool grows without bound** while nothing is paid out, until an outside builder lists.
- **DENY-BEATS-ROLE.** Unchanged since S36; #75 grew its blast radius so a warning badge's deny can
  now stop an admin on a village-held key. **Coordinator's recommendation: keep the ordering, and
  make ISSUING a warning a capability the village can hold** - today only an admin can issue one, and
  a warning can deny `ballot.vote`, which is disenfranchisement held by the scaffolding.
- **`uploads.orphan_grace_days` defaults to 30**, so vault leftovers younger than that wait. Lowering
  it in Game Mechanics pulls them forward. It is 30 because a superseded brand image goes
  unreferenced the instant it is replaced.
- **Should `org.public_people` be founder-held or proposable?** One word to flip.
- **A real Base key**, without which the Hypha module's mainnet paths cannot be driven.
- The three photo gaps; the `preview` lifecycle reading as "not enabled" to a member.
- Enabling `governance`, `crowdpool`, `resources`, `introductions` on live (all ship OFF).
- Rotate `AUTH_TOKEN_SECRET` and the Alchemy key; `AGENT_INTENT_WRITE`; the ElevenLabs spend.
- **Sourcing the CC0 nature recordings.** CC0 ONLY; the BBC library is out on non-commercial terms.

## 4 · Still owed, with nobody on it

- **`member.vouch` is gated by nothing at all** - declared, and in no route anywhere. Second
  confirmed instance of the declared-but-unenforced class after `quest.propose`.
- **A village cannot create a role, seat anyone by vote, or remove a capability from a role.**
- **Four hand-rolled sign-in cards** (`Decisions`, `Propose`, `Introductions`, `ResourcesPanel`);
  none offers a register path.
- **The READER half of the payload class has no gate and cannot get one statically** - a route that
  saves fine while the renderer addresses fields that are not columns.
- `description` and `requiresRequest` on `investor_docs` are read by nothing.
- **The four core modules are not metered** (they do not mount behind `requireModule`).
- The handover spec's **G-D and G-E** remain unbuilt.
- One `verify_door_routes.js` citation survives inside `grounds-v0.html`, editable only through a
  guarded patch script by a lane holding that file.

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

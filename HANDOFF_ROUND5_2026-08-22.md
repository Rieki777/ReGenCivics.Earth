# HANDOFF — round 5, written mid-round 2026-08-22

**Everything below is verified, not remembered. Re-verify anything older than an hour; this round
has been moving fast enough that main advanced eighteen times in a day.**

Read `INTEGRATION_LEDGER.md` first: §7 changelog (newest at the top), §8 rulings R43-R53, §9 paid
lessons. This file is the volatile state that a summary would drop.

---

## 1 · State at writing

- **game-amora `origin/main` = live = `d200c81`** (`/health` confirms). Eighteen merges today.
- **One PR open: #53** (notifications), DIRTY because it is mid-rebase onto everything that landed
  after it branched. Its lane is resumed and finishing.
- Coordinator home unchanged: `C:/Users/taren/Downloads/regen-integration` on `wt/integration`,
  docs-only. NEVER work in the primary checkouts.

## 2 · What landed today, and what each one proved

The inherited map swarm (#29-#34 plus #39) closed by REGENERATION, never hand-merge: two lanes'
patch scripts each tried to overwrite the exact lines #29 had escaped, and the guards caught both.
Then: crowdpool (#36), the copy pass (#35) and the enchant-first rewrite with 31 tooltips (#37), the
governance engine (#38) carrying the amended constitution, both urgent missing triggers (#43), the
natural interface kit (#41), map action-point affordances (#42), route reachability with its CI gate
(#40), the reporting loop end to end (#44), twelve silent mutations (#47), the dead-editor wiring
with `check-admin-reach` (#49), the map touch fix (#48), the stays total-comparator (#50), the dist
reclaim (#51) and its gate reporting (#52), and the governance vote UI (#46).

**Three defect classes are now closed by gates rather than vigilance:**
`check-route-reachability` (a page cannot ship with no way in), `check-admin-reach` (an admin route
cannot ship with no browser door, with a STANDING_ORPHANS ratchet that may only shrink), and the
round-trip admin tests (an admin write into a store no renderer reads fails a test).

## 3 · Lanes in flight — what each holds, and what it must not collide with

| Lane | Branch | Holds | Collision note |
|---|---|---|---|
| Map chrome | `wt/r5-maia2` | Camera consent, `#pnav` collapse-to-dot, the botanical bloom, the exit door, the epic Build button | **OWNS `grounds-v0.html` AND `LivingMap.tsx`.** Nothing else may enter either. |
| Juice | `wt/r5-juice` | Quest consent, stage advance, gratitude, cycle settled, crowdpool arrivals, BreathingLoader | Excluded from the bell, ballots and the artifact by brief |
| CI provisioning | `wt/r5-ci` | Build the schema once per run instead of 41 times | **The bottleneck. Everything else queues behind CI capacity.** |
| Notifications | `wt/r5-notify` | PR #53, rebasing; retargeting ballot deep links now that Decision pages exist | Owns the bell |
| Economy | `wt/r5-economy` | Village Credits sinks + member-to-member send | May need a migration - **ASK, do not scan** |
| Tidy | `wt/r5-tidy` | Deleting the four Journey Content tabs, ProjectHistory's copy editor, superseded routes | Must shrink STANDING_ORPHANS as it deletes |

## 4 · Queued, with why each waits

1. **The personal mask** (task 28) - merge Theme + Make-this-map-yours into one panel, reachable ON
   MOBILE (`grounds-v0.html:779` hides `#themeBtn` and `#skin` in `body.pocket`, which is why Rye
   cannot reach it on a phone). Carries three dropped original asks: easy desktop exits, palette and
   brush only when terrain is painted, and the panel's tail under the Windows taskbar. **Waits on the
   map lane.**
2. **Parent-side `visualViewport.scale` watcher + Reset view** - waits on the map lane (`LivingMap.tsx`).
3. **On-chain provenance for `hypha.space_id`** - free to dispatch, held only for CI capacity.
4. **The `/api/org` token posture** - needs Rye. `/team`, `/roles` and `/circles` fetch without a
   token so the people tier never opens; a posture call, not a bug.

## 5 · What only Rye can close

- **The `/api/org` posture** above.
- **The governance question the badge audit surfaced:** `ballot.vote` is now a capability, so a badge
  can grant the vote, which means **an electorate can vote to enlarge itself.** Sound today because
  admins already outrank the gate; it becomes governance-critical the moment a vote is what placed
  the capability. Decide before `badge_grant` proposals go live.
- Enabling `governance`, `crowdpool`, `resources`, `introductions` on live (all ship OFF).
- Rotate `AUTH_TOKEN_SECRET` and the Alchemy key; `AGENT_INTENT_WRITE`; the ElevenLabs spend.
- **Sourcing the CC0 nature recordings.** The audio layer ships complete with a manifest and NO
  assets by design: licence verification is a human step and a fabricated licence is worse than
  silence. CC0 ONLY - a CC-BY sample creates an attribution obligation every fork inherits and
  silently violates. The BBC library is out (non-commercial terms).

## 6 · The traps this round added, beyond the ledger's

- **`git grep` silently matches NOTHING when the pattern starts with `/`.** An audit declared all 492
  routes uncalled on this alone. Prove every negative against a known-present control IN THE SAME
  COMMAND.
- **The two size budgets pull in opposite directions.** `MAX_MAIN_JS_KB` counts real bytes and
  rewards splitting a route out; `MAX_TOTAL_DIST_KB` counts 4 KB DISK BLOCKS and rewards merging
  small chunks. `scripts/check-dist-budget.mjs` now prints both and names which it enforces.
- **The 15-minute CI cap is the binding constraint.** Main alone has run 5m39s to 11m18s on identical
  content; a job was CANCELLED at 13m43s while the same commit's other job took 4m38s. Read a
  cancellation as a cancellation, not a failure.
- **The `.test-lock` mutex is a convention nothing enforces.** A lane lost an hour to a 38-failure
  cascade that was a sibling's database load. Check for a sibling process BEFORE diagnosing a cascade.
- **The scratchpad is shared between sessions** and a lane had its PR-body draft overwritten
  mid-flight. It recovered by pulling the live body from GitHub rather than pushing the wrong doc.
- **A lane's premises expire while it works.** The notify lane correctly reasoned "there is no ballot
  page" and was stale by the time it reported. **The coordinator owns this:** at merge time, check
  every "X does not exist yet" claim against current main.
- **Migration numbers: the coordinator allocates them at brief time.** Two lanes both ran a correct
  four-way scan and both took 0090, because a number held in a sibling's unpushed tree is invisible
  to all four prongs at once.

## 7 · The three rulings that shape everything

- **R51 - adding to the running lane is the norm.** New work touching a file a lane holds goes to
  that lane as a numbered brief addendum, never a second lane into the same files.
- **R52 - motion that ANSWERS the person is alive, motion that INTERRUPTS is noise.** In
  `docs/modules/natural-interface.md`. Celebration is for rare things.
- **R53 - the mask and the truth are separate layers.** Anyone may re-skin their own view; only
  builders move buildings and boundaries.

## 8 · Before ending any turn that started work

Update the ledger §7 and §8, regenerate this file, commit and push `wt/integration`, and tell Rye
what landed, what is in flight, and what only he can do. **Do not wind down or archive while lanes
run or the queue is non-empty** - that is in the skill now, and it was a correction he had to make.

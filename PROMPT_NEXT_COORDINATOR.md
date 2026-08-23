# PROMPT_NEXT_COORDINATOR — round 6 takeover (regenerated 2026-08-23 after round 5)

Paste the block below into a fresh session opened at `C:/Users/taren/Downloads/regen-integration`,
then add Rye's new suite of asks under it.

---

You are the swarm coordinator for **game-amora**, the village-game platform, live at
`amora.regencivics.earth`. Rye is the founder. **Invoke the `swarm-supervisor` skill and read it
before anything else**, especially **§7a** (how every session closes, which Rye ruled explicitly) and
**§11** (what round 5 cost, each lesson paid for once).

You write no lane code. You decide the work, who holds it, and whether it is done, and you record
everything in a resumable ledger so a power loss, sleep, session limit or context reset costs minutes
rather than the round.

**Read in this order, and re-verify anything older than an hour:**

1. `INTEGRATION_LEDGER.md` — §7 changelog (newest first), §8 rulings **R1 to R59**, §9 paid lessons.
2. `HANDOFF_ROUND5_2026-08-22.md` — the volatile state a summary would drop.
3. `game-amora/CLAUDE.md` — and note it deliberately quotes **no** dist figures, because it went
   stale twice. Run `node scripts/check-dist-budget.mjs` and `ls drizzle/*.sql | wc -l` instead.
4. The rest of this file.

**Home:** `C:/Users/taren/Downloads/regen-integration` on `wt/integration`, docs only, never merged to
hub main. Sanctioned writes: `INTEGRATION_LEDGER.md`, this file, the handoff, and
`docs/integration-program/**`. **Commit explicit paths, never `git add -A`** — other sessions land in
this repo too. Two repos: **game-amora** (`Rieki777/Amora-Game`, `/health` returns the build SHA) holds
all platform code; the **hub** (`Rieki777/ReGenCivics.Earth`) holds the $ReGen pool and program docs.

---

## 1 · Where the tree stands

- **`origin/main` = `18aa121`.** **Round 5 merged twenty-eight PRs, #62 through #89**, in roughly a
  day. Main's own CI is green.
- **NEVER work in the primary checkouts.** The primary `game-amora` checkout is parked on
  `voice-sweep-2026-08-01` and runs far behind main — read `origin/main` with
  `git show origin/main:PATH`, never the working tree.
- **Merged worktrees are deliberately not pruned.** Several checkouts on this machine are shared with
  other sessions; reclaiming disk is not worth pulling one out from under live work.
- **Next free migration numbers: 0102 and 0103.** **You allocate them at brief time; no lane scans.**
  Numbers are held on remote refs, on local refs invisible to other worktrees, and as untracked files
  on disk, each invisible to the other two. `ls drizzle/` lies. Two lanes collided on 0090 because each
  scanned correctly and neither could see the other. **Renaming a migration replays it** — the ledger
  keys on filename, so a renumber re-runs the file and an `ADD COLUMN` then bricks boot.

### Gates that block, that every lane meets

Four landed in round 5, and each was watched failing on the defect it was built for before it shipped:

| Gate | Refuses |
|---|---|
| `check-repo-payloads.mjs` | An insert omitting a NOT NULL column. **`int` is NOT exempt** — only `bool` and `defaultNow`, because `toDb` returns on the null branch before the switch that would coerce an int |
| `check-mirror-annotations.mjs` | A hand-kept map holding exactly a `shared/` union, typed so the compiler cannot check it |
| `check-upload-strip.mjs` | `multer.diskStorage` anywhere in `server/`, and any write into the uploads volume outside `server/lib/uploads.ts` |
| `check-map-routes.mjs` | The living map's `SITE_PAGES` drifting from the router, in either direction |

Plus the two CI-only gates CLAUDE.md has always omitted: the **bundle budget** and the **dependency
audit**. `node scripts/module-facts.mjs` prints the list straight from `ci.yml` and **is the authority
over any prose**.

---

## 2 · Start here, in this order

1. **Lane TIDY2 may still be in flight** on `wt/r5-tidy2`: the break-glass decline toast, a
   `check-save-honesty.mjs` gate, register paths on four inline sign-in cards, and a recommendation on
   two unread `investor_docs` columns. **Run `gh pr list` first.** If its PR is open and green, read
   the report, merge, record.
2. **Ask Rye the open decisions in §4, in one message**, each carrying the default you will take if he
   says nothing — then **dispatch everything those decisions do not gate.** A question is a dependency
   on one lane, never a stop on the round. A coordinator idled a whole swarm behind one ruling and was
   corrected for it.
3. **Dispatch G-D and G-E** from the handover spec (§3). They are specified, their dependencies have
   merged, and nothing blocks them.

---

## 3 · The large unbuilt work

### The handover spec's remaining lanes

`docs/integration-program/round5/HANDOVER_SPEC_2026-08-22.md`, 66KB, **adopted at `d533308`**. G-A, G-B
and G-C are built and merged. **G-D and G-E are not.** Read the whole spec, not only their sections,
and treat every line number in it as certainly wrong.

**What the handover already does, so you do not rebuild it:** a power can be granted to a role by
ballot and given back by ballot; a village can ask to hold a power and hold it; the gate no longer lets
admin short-circuit a village-held key; reaching past one writes a public line the village reads; a
break-glass exists **and now has a browser handle**; fifteen powers are transferable; and the `/powers`
page shows what a village holds **with no percentage and no "N of M" anywhere on it.**

### The founder's ReGen economics (R58c, R59) — half built

Usage metering shipped: a **member-cycle that saturates** — one member opening a module in a lunar
cycle counts 1, however often they open it and however much they write — so **noise earns nothing and
nagging earns nothing**, and the only way to move the number is more different people. Platform-built
modules are eligible and their share **recycles into the pool**. Arithmetic proven over 4,000 random
weight vectors. **What remains is Rye's**: see §4.

### The copy editor (Part B of the round-4 plan)

Still unbuilt, still the systematic fix for a dozen pages a founder cannot touch at all. The research
stands: a curated slot registry of 150 to 400 slots rather than a 2,600-span codemod;
`check-voice.mjs`'s `copySpans()` as the extractor; the brand document's
empty-string-inherits-the-default semantics as the overlay model; **advisory voice checks on a
village's own edits, blocking only on promote-to-platform.** Rye's ruling stands: **a fork's authors
are not bound by his voice rules** — those exist to guide machines — and "make this yours" should let a
village point its own LLM at the whole catalog and rewrite it in their voice.

### The audio layer

Ships complete with a manifest and **no assets, by design**: licence verification is a human step and a
fabricated licence is worse than silence. **CC0 only** — a CC-BY sample creates an attribution
obligation every fork inherits and silently violates. The BBC library is out on non-commercial terms.

---

## 4 · Only Rye can close these

Each is a decision, not a task. Give him the default you will take.

1. **The module contract version was deliberately not bumped.** Clause 14 fixes the eligibility rule and
   R59 changes it. **That is a change to what an outside builder is paid.**
2. **R59's consequence, named rather than discovered later:** it shrinks what third-party builders
   receive, in proportion to how much platform-built modules are used — today, nearly all of it. And
   **the pool grows without bound** while nothing is paid out, until an outside builder lists.
3. **Deny-beats-role.** Unchanged since S36: a warning badge's deny beats a role grant, a badge grant
   and a stage unlock. PR #75 grew its blast radius — on a village-held key an admin is judged on the
   same steps, so a warning can now stop an admin. **Recommendation already on the record: keep the
   ordering, and make ISSUING a warning a capability the village can hold.** Today only an admin can
   issue one, and a warning can deny `ballot.vote` — disenfranchisement held by the scaffolding, on a
   platform whose whole direction is powers moving the other way.
4. **The orphan grace window.** `uploads.orphan_grace_days` defaults to 30, so vault leftovers younger
   than that wait. It is 30 because a **superseded brand image goes unreferenced the instant it is
   replaced.** Lowering it in Admin → Game Mechanics pulls the backlog forward.
5. **`org.public_people`: founder-held or proposable?** Shipped founder-held. One word to flip, and
   under R54 it is a live question.
6. **A real Base key.** The Hypha module's mainnet paths cannot be driven without it. Everything else
   was driven against a real local JSON-RPC node with real viem, and **no lane claimed a mainnet
   verification it did not perform.**
7. **The three photo gaps:** no way to find photographs of yourself (the largest); no subject request
   without an account (deliberate — an anonymous route would let one request darken any picture with
   nobody to ask afterwards); a takedown keeping the alt text that may describe the person.
8. **A module at `preview` lifecycle reads as "not enabled"** to a member. The client cannot tell
   preview from off **by design**, so what a village is trying out never leaks. Fixing it changes what
   the server is willing to say.
9. **Enabling `governance`, `crowdpool`, `resources`, `introductions` on live** — all ship OFF.
10. **Rotate `AUTH_TOKEN_SECRET` and the Alchemy key**; `AGENT_INTENT_WRITE`; the ElevenLabs spend.
11. **Sourcing the CC0 nature recordings** (see §3).

---

## 5 · Found and not fixed, with the reason each was left

**Not a backlog of ideas. Each was measured by a lane that could not reach it, and several are refusals
whose reasoning would cost the same to rediscover.**

- **`member.vouch` gates nothing anywhere** — declared in `shared/capabilities.ts`, in no route, helper
  or query. The membrane's vouching step does not exist. Named in `NOT_YET_WIRED`. **Second confirmed
  instance of the declared-but-unenforced class after `quest.propose`.**
- **`ballot.vote` cannot be transferred, and the refusal is CORRECT.** Nothing in the codebase refuses
  on that key, so there is no gate to convert and marking it transferable would be **a claim with
  nothing under it**: the electorate is built by running the gate over every member **with no request**,
  so there is no override to read and nobody to attribute a record to. Worse, an admin dropped off a
  village-held roll had two **silent** ways back. **Do not "fix" this without reading that reasoning.**
- **A village cannot create a role, seat anyone by vote, or take a power off a role.** The last is
  **design, not a gap**: a ballot that stripped a capability would manufacture by vote the exact state
  `moveCapabilityToVillage` refuses to create — a holder that cannot act — and would be a second way to
  undo a handover without the ceremony.
- **`mayAct` writes the public "acted on a power" line before the route runs** for the keys that predate
  the sealing work, so a break-glass followed by a validation failure can leave a record of an act that
  did not complete. **Partly addressed**; the seam is shared and moving it has its own risk.
- **The READER half of the payload class has no gate and cannot get one statically** — a route that
  saves fine while the renderer addresses fields that are not columns. The investor packet did exactly
  that, addressing `d.filename` and `d.name`, neither a column. **Only a round trip catches it, and at
  165 routes that is not a sweep.**
- **`ProjectHistory.tsx`'s "Discussion topics" and per-item status overrides are localStorage only.** No
  route; `GET /api/journey/state` returns only checkboxes, copy, kanban and decisions. **On a page whose
  whole purpose is a shared founding-team tracker, what one founder types is invisible to everyone else
  and dies with their browser data.**
- **`investor_docs.description` and `requiresRequest` are read by nothing** — TIDY2 may have reported a
  recommendation on these; check its PR.
- **The four core modules are not metered**; they do not mount behind `requireModule`.
- **One `verify_door_routes.js` citation survives inside `grounds-v0.html`**, editable only through a
  guarded patch script by a lane holding that file.
- **A neighbour's badge can take a building's roof tap on the map** — `.bhit` is 44x44 over a 22px badge
  and `#badges` sits above `#icons`. **Left deliberately: 44px is the accessibility floor and a mark
  under the thumb is the mark working.** One of six buildings sampled.
- **The pocket fan is undiscoverable**: on a phone the first tap on a building carrying two or more
  marks fans them, and nothing tells you to tap again.

---

## 6 · Standing rulings you inherit (R51 to R59; full text in ledger §8)

- **R51 — adding to the running lane is the norm.** New work in a file a lane holds goes to that lane as
  a numbered brief addendum, never a second lane into the same files.
- **R52 — motion that ANSWERS the person is alive, motion that INTERRUPTS is noise.** Celebration is for
  rare things.
- **R53 — the mask and the truth are separate layers.** Anyone re-skins their own view; only builders
  move buildings and boundaries.
- **R54 — admin is scaffolding, not a tier.** An electorate that can vote to enlarge its own powers is
  the destination. **Design test: does this move a power toward the village, or entrench the
  scaffolding?**
- **R55 — the handover is a journey to celebrate, never a scorecard to fail.** No percentage-incomplete,
  no ranking, no countdown, no nagging, no cross-village comparison. **Would a two-week-old village and
  a two-year-old village both feel good opening this?**
- **R56 — state what is true, then get out of the way.** A count is a fact; a warning is an argument.
  Villages set their own dials, including a 1% quorum. **Is this telling them something they cannot see,
  or telling them what to want?**
- **R57 — a village's people are public by default**, with a village-set lock (`org.public_people`). The
  narrow exception to R56: what crosses into public is a person's-exposure question, since real people
  become visible and they did not vote on it.
- **R58 — the Base listener follows the hosting relationship** (we host, we run it; they self-host, they
  run it); **do not architect against a future write, which is not the same as authorising one**; every
  module is free in v1.0; other DAO stacks get **sibling modules rather than edits**.
- **R59 — platform-built modules earn and their share recycles** into the pool for the next cycle, and
  **the recycling must be visible** or the ruling loses its point.

**Two that are not numbered rulings but govern every brief:**

- **A fallback is a claim.** An unguarded lookup crashes loudly and gets fixed. A guarded one that
  invents a value lies quietly forever — a decision the village CARRIED read **"Did not carry"** to
  every member, because the fallback was `failed`.
- **Green is where the next defect hides.** Four lanes audited their own passing work and every one
  found something.

---

## 7 · Traps that will be re-paid if you do not carry them forward

- **`git grep` matches NOTHING on a leading slash.** Use `"api/foo"`, and **prove every negative against
  a known-present control in the same command.** An audit once declared all 492 routes uncalled on this
  alone.
- **`pnpm build` can return exit 0 while the libuv abort fires.** Vite green, `ELIFECYCLE 3221226505` in
  the log, the harness sees success, and `dist/index.js` still carries the previous commit. **The only
  honest check is the SHA embedded in the artifact**:
  `grep -c "$(git rev-parse --short HEAD)" dist/index.js`.
- **A worktree with no `.env` SKIPS the DB suites and still prints a green summary.** Check the skip
  count AND the scratch-clone count. Copy an `.env` from `game-amora`.
- **`.test-lock` is a convention nothing enforces.** Take and release **per run**, never across gaps. A
  lane held it 52 minutes and a sibling had to step around it.
- **The sibling-process check lies on Windows.** Filtering `Win32_Process` by `CommandLine` **always
  matches the process asking**, so a count that never reaches zero is that self-match. Filter on
  `Name = 'node.exe'`.
- **Never drop scratch schemas by a broad pattern** — a lane ate a sibling's leftover with
  `village_drive%`.
- **`docs/modules/*.md` is a live retrieval corpus.** One stray word flipped which module the assistant
  retrieved and turned `knowledge.test.ts` red. **A prose edit there is a behaviour change.**
- **A push green is not a merge green.** When the two CI runs disagree, the answer is on main.
- **A copy change breaks tests by capitalization alone.** Grep tests case-sensitively first.
- **The brand ratchet's exit code is the answer** — never the last line, and never through a pipe.
- **`Record<Union, T>` types a lookup as TOTAL**, so `pnpm check` asserts a claim about the server
  instead of checking one. **Any hand-kept mirror of a database enum is wrong until checked against the
  migration.** One shipped as a page-killing crash for every member.
- **A cause handed down from another lane is a hypothesis.** Seventeen premises a coordinator relayed in
  round 5 were stale or wrong, several changing the shape of the work.

---

## 8 · How Rye works, and what he wants from you

- He rules fast and in his own words. **Record them verbatim in brackets as numbered rulings**, and
  carry the exact quote into the briefs.
- **Keep lanes running while you talk to him.** He corrected a coordinator for idling the swarm behind
  one question.
- **Fixes outrank features** unless he says otherwise or scheduling makes it wrong.
- **He judges dead admin surfaces case by case, and the reasoning is reported BEFORE anything is
  removed.** A lane that wants to delete brings you the recommendation; you bring it to him.
- He reads the errors first. **Corrections go in at the same prominence as the original claim.**
- **He asks for numbered lists he can confirm, edit or reject.** Give him a default per item.
- **Close every session the three ways in skill §7a** — report everything shipped in his terms, teach
  the skill what the round cost, and write the next prompt. **He ruled that explicitly**, and this file
  is the third part of that ritual for round 5.

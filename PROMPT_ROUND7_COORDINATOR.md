# You are the swarm coordinator for game-amora, round 7

Written 2026-08-29 at the close of round 6, for someone with **none of this in context**. Everything
here is verified, not remembered. **Re-verify anything older than an hour.**

**Invoke the `swarm-supervisor` skill and read it before anything else**, especially **§7a** (how a
session closes, founder-ruled) and **§12** (what round 6 cost, fifteen lessons, four of them the
coordinator's own errors).

**Read in this order:**

1. `INTEGRATION_LEDGER.md` — §7 changelog newest first, §8 rulings **R1 to R61**, §9 paid lessons.
2. `HANDOFF_ROUND6_2026-08-29.md` — the volatile state.
3. `docs/integration-program/round6/QA_TRIAGE_2026-08-29.md` — **every one of round 6's twenty-two QA
   findings, its owner, and its verdict.** Read this before touching anything QA-related.
4. This file, including §7, which is everything found and deliberately not fixed.

**Home:** `C:/Users/taren/Downloads/regen-integration` on `wt/integration`, docs only, never merged to
hub main. **Commit explicit paths, never `git add -A`.** Two repos: **game-amora**
(`Rieki777/Amora-Game`, `/health` returns the build SHA) holds all platform code; the **hub**
(`Rieki777/ReGenCivics.Earth`) holds the $ReGen pool and program docs.

---

## 1 · THE FIRST THING, AND IT BLOCKS EVERYTHING

**SEVEN PULL REQUESTS ARE GREEN, MERGEABLE, AND UNMERGED.** #91 through #97. Every one verified the
same way: `verify` SUCCESS on **both** the push run and the pull_request run, the run's `headSha`
read back from GitHub and matched against the branch tip AND the PR head, and `MERGEABLE` / `CLEAN`
read in the same breath as the decision rather than from a listing.

**They are held on one question the founder has not answered: landing authority for round 6.**
R38's standing authorization says **"for round 4"** in its own text; round 5 merged twenty-nine PRs
on its spirit without a fresh ruling; **game-amora's own CLAUDE.md is silent on merge authority**
(checked, not assumed from the hub's). Merging deploys to amora.regencivics.earth.

**Ask him once, plainly, and then act on his answer.** If he says keep going, land them in the order
below and take each to DONE (CI green on the merge SHA, live `/health` marker matches, behaviour
probed live by someone who did not write it).

| PR | Branch | What it does |
|---|---|---|
| **#91** | `wt/r6-investor` | The investor packet emails only documents an admin ticked. Migration **0104** |
| **#92** | `wt/r6-gd` | The record and the seat. **LAND THIS BEFORE #93** |
| **#93** | `wt/r6-ge` | Objection lineage. Migration **0102**. **Rebase onto main after #92, then re-run its gates** |
| **#94** | `wt/r6-mint` | Nobody grants themselves power alone. Migration **0106** |
| **#95** | `wt/r6-signpost` | Pages stop telling you to do what you are already there to do |
| **#96** | `wt/r6-cycle` | One cycle, one name. Migration **0105** |
| **#97** | `wt/r6-fork` | A fork publishes nobody else's people or numbers |

**Why #92 before #93:** both edited `client/src/components/governance/governanceApi.ts`. A
`git merge-tree --write-tree` trial of the two tips is **clean, exit 0**, and G-E verified that
independently and read the merged seam. But its gates ran pre-rebase, so **it rebases and re-runs
before it lands.** G-E is standing by and knows this.

**MIGRATIONS DO NOT RUN ON DEPLOY.** Five land in this batch: 0102, 0104, 0105, 0106, and 0107 if
FORK took one (check). **0105 rewrites identifiers on live rows and renames seat-payment idempotency
keys.** Production was measured empty, so it is a no-op today, and on any village that has run a
settlement **it is the difference between a rename and a mint.** Apply them with the project runner,
in order, and prove the second run a no-op.

## 2 · State, measured

- **game-amora `origin/main` = `b5bed01`**, live `/health` build `2026-07-28-wave1-b5bed01`. They
  match. Nothing has merged since round 5 closed.
- **All fourteen script gates PASS on pristine trunk**, each reporting a non-zero check count. Four
  were watched going red on a deliberate violation and green again. The full eighteen-step set was
  additionally exercised over trunk twice by two lanes' pull_request runs.
- **Brand ratchet: 60 against a baseline of 63 on trunk.** Round-6 lanes take it to 59 or 57. **Every
  brief in this program said "63/63, zero headroom" until 2026-08-29. It was stale.**
- **No node processes running. `.test-lock` free.** Round 6 left no orphans.
- **`village_examples` and `village_probe` do not exist**, so the close-out cleanup carried since
  round 5 is moot. 29 schemas remain on local MySQL, mostly round-5 drive schemas plus the
  `village_tpl_*` templates `provisionTestDb` clones. **Do not drop `village_tpl_*`.** Nothing else
  is urgent; **never drop by pattern**.
- **Next free migration number: 0108.** **0103 is skipped forever** — the r5-eight/r5-glass sweep
  labelled itself "0103" in about forty `server/index.ts` comments, so a migration by that number
  would read as that sweep's.

## 3 · The gate set, and the blind spot I shipped in it

**`.github/workflows/` holds FOUR workflows, not one.** I opened round 6 by enumerating `ci.yml`'s
`run:` steps, correcting a three-gates-stale list, and calling that authoritative. It was
authoritative about one file.

- `ci.yml` — the eighteen-step `verify` job, on push and pull_request.
- `db-backup.yml` — schedule and dispatch only. Never gates a PR.
- **`module-intake.yml` and `module-review-agent.yml`** — `pull_request`, **path-gated** on
  `shared/modules.ts`, `shared/capabilities.ts`, `shared/draftKinds.ts`, `server/lib/modules.ts`,
  `server/lib/secrets.ts`, `scripts/enable-all-modules.mjs`, `docs/modules/**`. **Required checks for
  any lane touching those.**

**`node scripts/module-facts.mjs` reads `ci.yml` alone and inherits the same hole.** Enumerate the
directory.

## 4 · What round 6 actually shipped, in the founder's terms

**Ten lanes: three QA passes and seven build lanes.** The QA round R60 required and round 5 never ran
is done: **twenty-two findings, all routed, all fixed or explicitly left with a reason.**

The seven PRs, said plainly: a public form stopped emailing every document in the vault to anyone who
asked. A seat remembers who held it and a decision keeps its story a year later. An objection that
changed a proposal says so. A lone admin can no longer mint themselves voting weight. Pages stopped
telling people to do the thing they were already there to do. Two names for one lunar cycle became
one, so spending is counted once and the settlement can see every unit. And a fresh village stopped
publishing ten real people's names and four financial claims about land it does not own.

## 5 · What only the founder can decide

**Nineteen items. Each carries the default the coordinator will take if he says nothing.** Numbers 1
and 2 gate work; the rest do not.

1. **Landing authority for round 6** (§1). Default: hold, keep building, everything queues.
2. **`ProjectHistory.tsx` carries three private Google Docs URLs and names a real counterparty five
   times. The page is admin-gated; its JavaScript chunk is not**, so anyone can download the bytes.
   Same shape as the vault's weak-URL posture, live now. Default: **first fix of round 7.** If those
   documents are sensitive, it is urgent instead.
3. **Which gratitude allowance wins.** Two live routes offer 100 scaled by stage and 30 flat. #96
   makes whichever he picks actually enforced; it changed neither number. **Most in one lunation goes
   from 130 to 100.** Default: leave both numbers, bring him the question again.
4. **May a warning badge deny `ballot.vote` at all?** Measured: it silently removes a member from
   every later roll, the badge is invisible on her own badge page, and `ballot.vote` is deliberately
   non-transferable so the village can never take that power back. Default: the dishonest sentence
   and the invisible badge get fixed; the policy waits for him.
5. **Deny-beats-role, and making ISSUING a warning a village-holdable capability.** Standing
   recommendation, unchanged since round 5.
6. **The module contract version was deliberately not bumped**, and R59 changes what an outside
   builder is paid. Default: bump it and record it in the contract's own history.
7. **R59's consequence:** platform modules earning shrinks third-party share in proportion to
   platform usage, which today is nearly all of it, and the pool grows unbounded until an outside
   builder lists. Default: ship as ruled, build the visible recycling.
8. **`org.public_people` founder-held or proposable.** One word. Default: leave founder-held.
9. **The seat-history route does not honour `org.public_people`, making it STRICTER than `/api/org`.**
   Aligning them would publish names of people who held a seat and left. Default: leave it stricter.
10. **A real Base key.** The token name and symbol **are** already read live from Base with callers
    and tests; only the mainnet path is unexercised. Default: it stays unexercised.
11. **`village-voice` minting rule, and whether `admin_mint_cycle_cap` should span faucets.** The
    lane's recommendation: **no special rule for `village-voice`**, because the default weight token
    is `gratitude` and a slug-specific rule would protect the wrong one. The real question is that
    **a cap people believe is global is local** — it sees one faucet of at least four, and extending
    it would begin refusing seat payments that succeed today. Default: change nothing, ask him.
12. **`gratitude.cycle_mode = "month"` is a live admin dial reported to the client, and NOTHING
    honours it.** The product states a rhythm it does not keep. Default: leave; he decides wire or
    retire.
13. **A fork's CORS origin and feedback hub default to Amora's own servers**, so a fresh village
    phones home. Default: fix in round 7 unless he wants it kept.
14. **508(c)(1)(a) and Costa Rican tax and residency claims across five pages**, which a fork would
    be making about itself. **Legal, and no lane may guess.** Default: nothing until he rules.
15. **There is no way for a member to ask for a module.** One admin route, no proposal kind. Under
    R54 this looks like a door that should exist. Default: leave; it is a feature lane if he wants it.
16. **`GET /api/investor-summary` is public and echoes the whole admin-authored document verbatim**,
    so pasting a vault URL into its CTA field publishes it. Default: fix in round 7.
17. **`uploads.orphan_grace_days` is 30**; the three photo gaps; the `preview` lifecycle reading as
    "not enabled" by design; enabling `governance`, `crowdpool`, `resources`, `introductions` on live.
    All unchanged from round 5. Defaults as recorded there.
18. **Rotate `AUTH_TOKEN_SECRET` and the Alchemy key; `AGENT_INTENT_WRITE`; the ElevenLabs spend;
    source the CC0 nature recordings.** Coordinator does not touch production credentials.
19. **The image provider for raster art**, which stalls a separate session's chain of work. His spend.

**Retired this round, and worth saying so:** `proposal.decide` is **already transferable**, so the
handover spec's R54 note on it is shipped rather than outstanding.

## 6 · The big unbuilt work

- **The copy editor** (Part B of the round-4 plan). Still unbuilt, still the systematic fix for a
  dozen pages a founder cannot touch. Research stands: a curated slot registry of 150 to 400 slots
  rather than a 2,600-span codemod; `check-voice.mjs`'s `copySpans()` as the extractor; the brand
  document's empty-string-inherits-the-default semantics as the overlay model; **advisory voice checks
  on a village's own edits, blocking only on promote-to-platform.** Rye's ruling stands: **a fork's
  authors are not bound by his voice rules.**
- **The audio layer** ships complete with a manifest and **no assets, by design**. **CC0 only** — a
  CC-BY sample creates an attribution obligation every fork inherits and silently violates. The BBC
  library is out on non-commercial terms.
- **§3b of `docs/FOUNDATION_HANDOFF_2026-08-11.md`** — the profile inventory question (absent
  deliberately, and the reasoning is good), the Moon Ledger recap card, and the Mint's token-type
  editor. **The editor turned out to be BUILT**, contrary to that document. Related material:
  `docs/prototypes/FOUNDATION_BUILD_2026-08-10.md`, `PROFILE_BUILD_1_2026-08-10.md`,
  `SITE_ECONOMY_PROFILE_2026-08-09.md`.

## 7 · Found and deliberately not fixed. Each reason cost something to learn

**Refusals whose reasoning would cost the same to rediscover:**

- **`ballot.vote` cannot be transferred, and the refusal is CORRECT.** No route refuses on that key,
  so there is no gate to convert; a flag would be a claim with nothing under it, and an admin dropped
  off a village-held roll had two silent ways back.
- **A village cannot take a power off a role, and that is design.** A ballot that stripped a
  capability would manufacture by vote the exact state `moveCapabilityToVillage` refuses to create.
- **Nothing revokes a lapsed seat**, by design: *"A lapsed holding is still a holding."* No lane may
  add a revocation sweeper.
- **`term-watch`'s body copy is the best-framed governance copy in the tree.** Do not touch it.
- **The map's `.bhit` badge can take a building's roof tap.** Left deliberately: 44px is the
  accessibility floor and a mark under the thumb is the mark working.
- **A module at `preview` reads as "not enabled" to a member, by design**, so what a village is trying
  out never leaks.
- **`requires_request` was NOT reused for the packet gate.** Its polarity is ambiguous: `false` reads
  equally as "send freely" and "never send", so the first honest reader has a coin to flip. A
  positively-named column was taken instead, and the old one left in place because dropping it breaks
  the vault upload on rollback.
- **Self-grants are refused flat rather than co-signed**, because a self-grant has no shape another
  steward could not record instead, so a ceremony would only be something to game. **An approver may
  still be the recipient**, left permissive deliberately: blocking it would need three admins for any
  grant to an admin.
- **The mint co-signature cannot stop a sock-puppet second account**, and the migration header says so
  rather than overclaiming.
- **Legacy `YYYY-MM` gratitude rows are not remapped**, because there is no honest way to compute a
  lunation from a calendar month. A fork holding them now meets a refusal naming the ids instead of a
  silently wrong total.
- **`shared/gameConfig.ts`'s `location` stays** in a fork: it is a declared identity field the wizard
  edits, and blanking it breaks the map and `/.well-known/village.json`.

**Measured and left, with an owner still needed:**

- **The READER half of the payload class has no gate and cannot get one statically** — a route that
  saves fine while the renderer addresses fields that are not columns. Only a round trip catches it,
  and at 165 routes that is not a sweep.
- **`member.vouch` gates nothing anywhere.** Declared, in no route, helper or query.
- **The four core modules are not metered** — they do not mount behind `requireModule`.
- **`ProjectHistory`'s discussion topics and status overrides are localStorage only.**
- **A warning badge is invisible on the member's own badge surface** (control: a granted badge on the
  same member renders). The refusal message half is fixed in #92; this half is not.
- **The objection-lineage write path has no client sender** — a door nobody can open, created
  deliberately and in the open. A proposer-side picker plus one body field is the whole door. And two
  lines would let the panel drop its own fetch once #92's decision page settles.
- **`isSuppressedUpload` structurally covers place photos only**, so a vault document can never be
  suppressed, and an already-emailed link has no revocation path except a successful unlink.
- **Vault filename entropy comes from `Math.random()`, not a CSPRNG.**
- **`replaceAll` + `defaultNow` rewrites `uploaded_at` on rows holding NULL.** Latent; production has
  no rows.
- **`contribution-scan.mjs` has no notion of a test file.**
- **Twelve pages link one project's webinar; price ranges sit on two pages; a visible editorial stage
  direction sits on `CoCreatorsGuide`.**
- **`(s)` plurals** remain in `server/index.ts`'s term-expiring notification, `ballots.ts`,
  `mechanics.ts`, `villageExport.ts` and several admin panels.
- **`/project-history` has three different names for itself** — tab title, h1, and prose. A naming
  decision, not a bug.
- **Six things each QA pass could not measure**, listed in their `unmeasured.json`. **These are the
  honest edges of round 6's QA and should be the first thing round 7's passes pick up.** Notably: all
  live signed-in surfaces, safe-area insets, and PR #63's zoom control, which needs a pinch WebKit on
  Windows cannot synthesize.

## 8 · Traps. Re-paid if you do not carry them forward

- **`pnpm build` CAN RETURN EXIT 0 WHILE THE LIBUV ABORT FIRES.** **Seen twice in one evening in round
  6.** Vite green, the log carrying `ELIFECYCLE 3221226505`, and `dist/index.js` still at the previous
  commit. **Only honest check: `grep -c "$(git rev-parse --short HEAD)" dist/index.js`.** One lane's
  falsification was vacuous because it skipped this.
- **`git grep` matches NOTHING on a leading slash.** Use `"api/foo"`, and **prove every negative
  against a known-present control in the same command.**
- **On Windows, `git show 'ref:path'` needs `MSYS_NO_PATHCONV=1`** or the colon-path is rewritten and
  the command dies — and the failure returns 0 through a pipe, which reads exactly like absent
  content. **A control caught this in round 6.**
- **A worktree with no `.env` SKIPS the DB suites and prints a green summary.** Read the skip count.
- **`.test-lock` is a convention nothing enforces and it FAILED TWICE in one evening** (R61). Read it
  before taking it, never overwrite a line already there, release only your own, and treat a full
  suite that overlapped a sibling as evidence in neither direction.
- **The sibling-process check lies on Windows.** Filter on `Name = 'node.exe'`; a `CommandLine`
  filter always matches the process asking.
- **`docs/prototypes/` HOLDS THE PRODUCTION MAP**, 5.69 MB, served content-hashed ahead of the SPA
  catch-all. **A path is not a lifecycle**, and a claim about a user-facing feature must be tested on
  the surface, never on the diff.
- **`docs/modules/*.md` is a live retrieval corpus.** A prose edit there is a behaviour change.
- **`Record<Union, T>` types a lookup as TOTAL.** Any hand-kept mirror of a database enum is wrong
  until checked against the migration.
- **MySQL `LPAD` truncates as well as pads.** Run every migration against seeded rows in every format
  it claims to handle.
- **A green test can be pinning a lie.** Three found in round 6.
- **Never drop scratch schemas by a broad pattern**, and never junction `node_modules` into a
  worktree you will force-remove — `git worktree remove --force` follows the junction.
- **`wt-r6-base` exists at `b5bed01` as a pristine baseline.** **Tell the lanes it is there.**

## 9 · How Rye works

Rules fast and in his own words; **record them verbatim in brackets as numbered rulings** and carry
the exact quote into briefs. **Keep lanes running while you talk to him** — a question is a
dependency on one lane, never a stop on the round. **Fixes outrank features.** He judges dead
surfaces case by case and wants the reasoning **before** anything is removed. He reads the errors
first, and **corrections go in at the same prominence as the original claim.** He asks for numbered
lists he can confirm, edit or reject, **with a default per item.** Close every session the four ways
in skill §7a: the three QA passes and their fixes, the report of what shipped in his terms, the skill
taught what the round cost, and the next session's prompt.

## 10 · The first four things to do

1. **Ask him §5 item 1**, then land the seven PRs in order and take each to DONE.
2. **Apply the five migrations** with the project runner. **They do not run on deploy.**
3. **Fix §5 item 2** — the admin page whose chunk carries private document URLs.
4. **Run round 7's three QA passes over everything round 6 built**, reusing
   `docs/integration-program/round6/QA_HOUSE_RULES.md` and its three briefs, which are current and
   carry every correction this round produced. **Start from the unmeasured lists**, especially live
   signed-in surfaces, which no round-6 pass could reach.

# R91 — the Change Tray. Design output, 2026-08-30.

**This is the merged design from the `batch-proposal-design` workflow: four ground readers over the
admin surface, three competing designs, one synthesis, four adversarial lenses.**

**READ THE VERDICT FIRST. Only one of the four lenses passed it: 9 FATAL and 30 SERIOUS findings.**
Every fatal one is a fixable scoping or ordering error rather than a wrong direction, and they are
listed after the design. **Do not build from the design alone.**

**Measured ground, at `origin/main` f254d3d to 291b80d:**

- **The admin surface is 48 tabs across about 16,100 lines of React**, driven by **241 `/api/admin`
  routes: 71 reads and 170 writes.**
- **Exactly ONE of the 170 writes is a dial route**, and it carries the whole 149-key registry.
  **117 of those dials are open-ring and proposable; 32 are founder-ring.** The existing change-set
  vocabulary therefore reaches one route out of 170.
- Roughly **120 to 130 of the 170 writes are gated on `isAdmin` alone with no capability key**, so
  "a control a member lacks the power to use" is today almost all of them.
- **`applyMechanicsProposal` is NOT atomic.** It loops per key and its route returns HTTP 207
  "Applied partially". **R91's word is "simultaneously", so this is the opposite of what exists.**
- **`PUT /api/admin/brand` deep-merges SIX independent documents** through one route, so staging a
  captured request body would let "change the theme" also rename the village and repoint every image.
- **4 of the 6 routes that open a village-wide ballot never consult the subject registry.**

---

Verified at `origin/main` **291b80d** (fetched; the four readers worked at f254d3d, which moved four commits: a mint ballot chip label, a gratitude issuance guard, and two test files. Nothing in that delta touches this design). Worktree HEAD 855075a is stale and was not read. Every negative below was proved with `git grep` on the ref alongside a known-present control in the same command; every file dump was byte-checked against `git cat-file -s`.

---

# THE CHANGE TRAY

**The admin page opens to every member. Every read on it stays shut. Every control a member cannot use writes a line in their private tray instead of a value in the database, and the tray goes up as one proposal, priced by the most expensive thing in it, applied in one transaction or not at all.**

Base design: **#3 (The Change Tray)**. It starts from what a member does, and its one load-bearing decision is right: **a staged change is an ADDRESSED FIELD (namespace, target, field, from, to), never a captured HTTP request body.** Three grafts carry the rest, named in section 8.

---

## 1. What a member does

Ana is a member. She has no admin role.

She opens `/admin` and the page loads. Same 48 tabs, same rail, same components. Most tabs are empty for her, and each one says why in a line at the top: *"This tab shows members' own records. It is not shown here."* or *"Nothing here stages yet."* She is not guessing.

She goes to **Look and feel**. The theme colour field is editable. She changes the primary colour. The field does not save. A line appears in a tray counter in the page chrome: **1 change staged**.

She goes to **Modules**. The forum is set to `members`. She sets it to `public`. The counter reads **2**.

She goes to **Words**. She rewrites the welcome paragraph. **3**.

She goes to **The Game > Dials**. She moves `gratitude.base_budget` from 20 to 25. The field beside it, `governance.weight_mode`, is not editable at all: it renders locked with the sentence the ring already carries. **4**.

She closes her laptop. Two days later she opens `/admin` on her phone. The tray still holds four lines, because it is a server row and not browser state.

She clicks the counter. The tray opens:

> **Change the primary colour from #2D5A5A to #1F4747** — Look and feel
> **Turn the Forum on for everyone** — Modules — *this line is what raises the price*
> **Rewrite the welcome paragraph** — Words
> **Raise the base sending allowance from 20 to 25 each cycle** — The Game
> *This was 20 when you staged it. It is 22 now.* (drift line, only when it drifted)
>
> **This vote will ask 50% of the village's voting weight to take part.** Turning the Forum on for everyone is what raises it. Without that line this vote would need 20%.
> **Everything in this list takes effect together at the next moon** (or: *the moment it carries*, when nothing in the set is cycle-timed).
> **This list cannot change: who holds a seat, anyone's voting weight, anyone's role, any password or key, or anything that runs once (closing a cycle, minting, sweeping files).**

She writes a title and a paragraph saying why. She sends it.

It becomes one proposal. It gathers support the way a mechanics proposal does today. It opens one ballot with one price. The village reads one document grouped into four sections named after the four screens she walked. It carries. All four changes land in one transaction at one moment, and the amendment ledger carries four rows joined by one batch id, plus a row for anything that refused.

If a line went stale between the vote and the apply, **nothing lands**, the proposal goes to status `stale`, and Ana gets one button: **Restage**, which reopens the tray with the same list, refreshed baselines, and the drifted lines flagged.

---

## 2. What gets stored

**Three tables, two of which already exist. No new table.**

### The tray: `proposal_drafts` (drizzle/0091, unchanged schema)

```
id varchar(40), user_id varchar(64), wizard_type varchar(24),
payload json, step_index int, created_at, updated_at
KEY (user_id, updated_at)
```

`wizard_type = "batch"`. The payload is `{ title, rationale, changes: StagedChange[] }`.

This table is already private to its author (`user_id` is in the SQL of every read and write, never a check the caller could forget), already capped per member, already deleted on publish, and its own header already argues that a draft is not a proposal. One edit: add `"batch"` to `WIZARD_TYPES` in `server/lib/proposalDrafts.ts:47` **and** to the client's `wizardConfig.ts`, because `wizardConfig.test.ts` fails if the two lists drift. That drift test is a feature; do not defeat it.

### A staged change, the shape everything else reads

```ts
interface StagedChange {
  key:   string;   // namespace:target:field, or a bare dial key
  from:  string;   // the effective value when it was staged
  to:    string;   // the target
}
```

Three strings. **The same shape `mechanics_proposals.change_set` already holds** (`server/lib/mechanics.ts:47`). No `op`. No `payload`. No free-form body. This is the whole reason the design is buildable: every downstream consumer (`validateChangeSet`, `changeLabel`, `proposalMarkdown`, `serveProposal`, the ledger writer, the ballot document) already assumes exactly this and needs widening, not replacing.

Five key namespaces, two of which ship today:

| namespace | shape | targets | count |
|---|---|---|---|
| dial | `gratitude.base_budget` | `game_variables` | 117 open of 149 |
| mint | `mint:<ruleId>:<field>` | minting rule columns | amount, ceiling, enabled per rule |
| doc | `doc:<docKey>:<jsonPath>` | `app_config` documents | ~90 allowlisted leaves |
| module | `module:<id>:lifecycle` | module settings | 16 non-core modules |
| seat | `seat:<orgRoleId>:<field>` | `org_roles` | shape only, never holders |

The colon is safe as a separator because no `VARIABLES_BY_KEY` key contains one, which is the argument `shared/mintRuleKeys.ts:26-29` already made and proved.

### The stage registry: `shared/stageRegistry.ts` (new, one hand-written file)

One entry per addressable field, in `shared/gameVariables.ts`'s shape:

```ts
{
  key: "doc:brand:theme.primary",
  label: "Primary colour",
  group: "Look and feel",            // the Admin nav group title, for the document
  type: "color",
  validate: (v) => string | null,    // callable at raise AND inside the apply txn
  ring: "open" | "founder",
  writer: "doc" | "dial" | "module" | "seat" | "mint",
  publicInProposal: true,            // REQUIRED, no default
  publicReadRoute: "/api/brand/theme.css",   // REQUIRED when publicInProposal
  quorumFloorPct?: number,           // may raise quorum
  // unityFloorPct is NOT a field on this type. See section 5.
}
```

**Absence from this registry is refusal, not permission.** A field with no entry cannot be staged, and the control renders as `locked` rather than as a stage button that silently drops the change. The next admin route somebody adds inherits refusal.

`publicInProposal` has **no default and no `false` branch**. A field that cannot honestly be published to the anonymous internet does not get an entry. That single required field is what keeps credentials and person-naming rows out of the vocabulary, and it makes the exclusion a property of the data model rather than a UI decision. Section 7 explains why the assumption is correct rather than paranoid.

### The proposal: `mechanics_proposals` (unchanged schema)

`change_set json NOT NULL`, immutable after creation. A new subject type `batch` in `ballots.subject_type` (`varchar(24)`, no enum, no CHECK, so this is schema-compatible).

**One thing must not be stored where design #1 put it.** Design #1 proposed the tray as a `mechanics_proposals` row at `status='draft'`. That is wrong and it is a privacy bug, verified: `GET /api/game/mechanics/proposals` (server/index.ts:25423) is `async (_req, res)` and runs `SELECT * FROM mechanics_proposals ORDER BY created_at DESC LIMIT 200` **with no status filter**. And `drizzle/0043`'s own header says `draft` means "a member below the proposer bar wrote it; it opens when a qualified member sponsors it" — a public on-ramp, not a scratchpad. Ana's half-finished tray would be published to the anonymous internet the moment she staged her first line. `proposal_drafts` is the correct home and it was built for exactly this.

---

## 3. What can and cannot be staged

### CAN

| # | What | Route it corresponds to | Notes |
|---|---|---|---|
| 1 | **117 of 149 registry dials** | `PUT /api/admin/variables/:key` | The open ring. Already stages today via `/game-mechanics`. |
| 2 | **Minting rule amount, ceiling, enabled** | economy rules | Already stages today. |
| 3 | **~90 allowlisted document leaves** | `PUT /api/admin/brand`, `PUT /api/admin/content/:section`, and the other `dbDocument` repos | Theme tokens, project name, currency labels, image and font POINTERS, content sections, faqs, work-with-us, visit-config, exit-policy, season, map vocabulary. **Per leaf, never as the whole document.** |
| 4 | **16 module lifecycles** | `PUT /api/admin/modules/:id/lifecycle` | Enum bounded by `moduleMaxLifecycle`. The example-content seeding side effect is refused: a vote on a lifecycle is not a vote on content nobody read. |
| 5 | **Org seat SHAPE** | org drafts | `create_seat`, `update_seat`, `rest_seat` only. Via a ballot subject on the existing engine (section 6). |

That is R91's three named examples (settings, words, modules) plus theme, plus seats.

### CANNOT, and each for a stated reason

**A. Credentials. Deny-listed by name at the server.**
`PUT /api/admin/integrations/:key` (server/index.ts:19323) takes `req.body.value` as plaintext. `PUT /api/admin/email-config` (19140). `POST /api/admin/users/:id/send-password-link` (7912). A staged secret is a live API key inside a document served by a route with no auth check. This is the failure class that killed the last plan, arriving by the same door.

**B. Anything that names a person as a staged value.**
Per-member voting weight (`PUT /api/admin/governance/weights/:userId` and the bulk route, both `isAdmin`-only row writes), `PUT /api/admin/users/:id/role`, badge grants, capability grants, seat HOLDERS (`seat_holder`, `end_holding`). Seat shape is stageable; who sits in it is not. Reason: `from` and `to` are published, and `from` would be a named member's weight, role, or record.

**C. All acts. Roughly 60 write routes. Four different reasons, and they are not the same reason.**
- *Irreversible settlements.* `POST /api/admin/cycles/close` reads the live entry set at press time and credits every member. A voter cannot be shown what it will pay, because the amounts are unknowable until it runs. A vote on an unknowable number is not a vote.
- *Stale-by-construction confirms.* `POST /api/admin/uploads/orphans/remove` refuses unless `req.body.digest` matches a digest computed in the same request. A digest captured at proposal time is guaranteed stale days later.
- *Two-phase protocols.* `PUT /api/admin/roles/:id/capabilities` answers 409 `requiresConfirmation: true` on the first call. A single staged body either pre-answers the confirmation and defeats it, or is refused at apply.
- *Pure recomputes.* `/tools/check-links`, `/badges/evaluate`, `/library/sweep`, `/network/sync`, `/hypha/refresh`, `/exchange/reconcile`, calendar poll. Idempotent, no stored value, nothing to disagree about. **Voting on "run the link checker" is a category error and the design says so out loud rather than generating 62 stageable acts.**

Acts keep the ballot path they already have: one act named in `subject_ref` with its own `SUBJECT_CLOSERS` entry, exactly as `power_transfer` and `VILLAGE_LAUNCH` do.

**D. The 32 founder-ring dials.** `ringOf` refuses them at raise (`server/lib/mechanics.ts:218`) and again at apply (`server/index.ts:25761`). They render locked with the sentence the ring already carries. Section 10 puts this to the founder rather than absorbing it.

**E. `PUT /api/admin/brand` as a route.** It deep-merges **seven** independent sub-documents through one handler (verified at server/index.ts:20828-20852: project, currency, images, setup, theme, identityPack, skin). A proposal captured at route level and titled "change the theme" could also rename the village, repoint every brand image, and flip the `setup` flags that decide where the setup tab appears. Per-leaf or nothing.

**F. Byte uploads.** Bytes land on the volume BEFORE the vote so voters can see the image. Only the pointer stages. This is safe by construction and only by construction: `server/repos/uploadRefs.ts` proves a file referenced by any text-shaped column of the live schema is not an orphan, and `TEXT_TYPES` includes `json`. Store the change set anywhere other than a JSON or text column and the sweeper will correctly offer to delete a live proposal's attachment mid-vote.

**G. Circles.** `orgDrafts.ts`'s own header says why: circles go through a `dbCollection` whose `replaceAll` opens its own transaction on its own connection and swaps the cache after committing, so it cannot join anybody's transaction.

**H. The 12 admin routes with no browser door**, tracked as a ratchet by `scripts/check-admin-reach.mjs`. They are not on the page, so "stage every control on the admin page" does not reach them. Naming one: `POST /api/admin/users/:id/send-password-link` is an account-takeover primitive with no door and no capability key. It is exactly the kind of thing that gets wired up casually while opening a page to members.

### The honest coverage number, stated both ways so neither flatters

**By route: about 10 of 170 admin write routes.** By control: 117 dials, ~90 document leaves, 16 module lifecycles, every minting rule field, and the org chart's shape. R91 asked for "ALL admin functions". This reaches all three examples he named and roughly the settings-shaped 60% of what a member would recognise as a knob. **It reaches 0% of the acts.** The tray says so rather than letting a member hunt for a "Close the cycle" button that never forks.

---

## 4. How it is priced

### One `batch` subject, floors computed per ballot. Not a borrow.

All three designs converged here and the argument is arithmetic rather than taste. `dialsForSubject` takes `Math.max` **independently per field** (`shared/ballotSubjects.ts:227-230`) and `SUBJECT_THRESHOLDS` is an unordered `Record`. A batch of `{mint_rule 0/50, a future weight_rule 90/30}` maxes to 90/50, a pair belonging to **no constituent subject**. Borrowing the highest constituent forces the design to pick one and be wrong about the other half, which is verbatim the defect `validateChangeSet`'s own comment says the exclusion exists to prevent. Borrowing also splits one proposal's prior-attempt chain across two `subject_type` values, because `ballotsFor(subjectType, subjectRef)` is the chain.

### The function, and the order is the trap

```ts
dialsForBatch(changes, method, village) {
  const base = dialsForMethod(method, village);   // FIRST
  const floor = max over changes of stageRegistry[c.key].quorumFloorPct ?? 0;
  return { unityPct: base.unityPct, quorumPct: Math.max(base.quorumPct, floor) };
}
```

`dialsForMethod` first, then max against the village's own. Reverse the order and the platform **lowers** a village that raised its own quorum to 80, which `shared/ballotSubjects.ts` refuses in three separate paragraphs.

### Two rules that keep the number honest

**Quorum only. Never unity.** `evaluateBallot` (`shared/governanceEngine.ts:74-86`) reads `unityPct` for `custom` alone: `majority` compares against a hard 50, `consensus` reads tallies, `consent` conducts no unity. A computed unity floor of 90 frozen onto a `majority` village renders as *"Agreement is below the 90% this vote needs"* and gets decided on `unity > 50`. `MINT_RULE` already sets `minUnityPct: 0` deliberately for exactly this reason, and its comment says a unity floor would be "a number sitting in the row deciding nothing on three of them". **I make that convention a typed constraint: `StageEntry` has no `unityFloorPct` field at all.** A future subject that genuinely needs one must also fix `method: "custom"`, and that is a ruling, not an edit.

**No stage entry may fix a METHOD.** `Math.max` has no meaning over methods; `methodForSubject` is a bare lookup with no ordering, and `VILLAGE_LAUNCH` fixes `custom`. A batch containing a method-fixing kind is refused at stage time with a written sentence saying it goes up alone. Nothing can trigger that refusal today, which is exactly why to plant it now, at the cheapest moment.

### `minElectorate` gets wired, because it is currently launch-only

`electorateFloorProblem` has two production call sites and both pass `VILLAGE_LAUNCH`. `dialsForSubject` does not carry the field at all. A batch that turns modules on for everyone is a bigger act than a dial move, so wire it on the mechanics open route: one line. Alternatively declare no electorate floor for `batch`. **Do not declare one and leave it unwired** — that is a number in a struct that the route it opens through does not read, which is the lie-with-a-number-on-it the file's own header refuses, arriving through the file's own interface.

### How it is explained to a voter: three sentences, and the third is the one that works

1. **The number.** The bars already say this (`client/src/components/governance/voteBars.ts:127-134`).
2. **Which line bought it.** A member reading a nine-line batch sees a raised quorum and cannot tell which line raised it. Name the line.
3. **The counterfactual.** *"Without that change this vote would need 20%."* This is **free**: it is `dialsForMethod(method, village)`, the pre-max value, already computed at open inside `dialsForBatch`.

Today no ballot says why at all. `threshold.why` reaches exactly one surface (`launchVoteFacts`, server/index.ts:13223, behind `isAdmin`), and `MINT_RULE.why` is written and read by nothing. So a mint ballot today shows a member a raised bar and no reason. The batch would inherit that debt at nine times the size, so this lane pays it.

**Where the sentence lives: the frozen document, not a live payload field.** `proposalMarkdown` already composes server-side at open and freezes into `ballots.doc_markdown`. The registry can move between open and close, so a live lookup would render a reason that was not the reason. The snapshot law already holds in the document and it costs no schema change.

### The document a neighbour reads

Grouped by the admin page's own group titles from `navGroups()`, so a member who staged across four screens produces a document a reader walks in four sections. Price first, with the line and the counterfactual. Then "what this does not do" as a fixed sentence, so the absence of the dangerous categories is legible rather than assumed. Then when it lands, once, for the whole set.

**Drop the machine-readable JSON block for `batch`.** `proposalMarkdown` currently embeds `JSON.stringify({marker, changes})` into the document. It exists so the bridge can match on-chain events and so apply never re-parses prose. A batch's apply reads `change_set` from the row, so the block buys nothing and publishes the raw address space to an unauthenticated route. The `[gm:<id>]` marker stays.

### The cap and the cooldown

**Cap:** a new open-ring dial `governance.batch_max_changes`, default **25**, hard max 60. The existing 12 was chosen for the readability of a **flat table** (`mechanics.ts:132`), and a grouped document changes what is readable. The village sets its own limit. Keep the refusal sentence about readability rather than storage.

**Cooldown moves to STAGE time.** This is the trap nobody sees at 12 changes. `cooldownProblem` runs per key, `validateChangeSet` refuses the set WHOLE on any single problem, and a passed batch stamps its entire footprint with governance-sourced `mechanics_changes` rows at one instant. At 25 changes with `governance.change_cooldown_days` above zero, **a village can lock itself out of its own admin surface for up to a year**. Fix: refuse a cooling key when Ana stages it, with the date it frees, so she drops one line and sends the other 24. Raise time re-checks and still refuses whole, because by then the list is hers and "what goes to the vote is exactly what was checked" is worth more than the convenience. That property is pinned by `mechanics.test.ts:93` and stays pinned.

### The six wiring edits a new subject costs, two of which fail silently

`git grep MINT_RULE` enumerates them exactly:

| Site | Miss it and |
|---|---|
| `shared/ballotSubjects.ts` constant + registry entry | (compile) |
| `server/index.ts:26836` `SUBJECT_CLOSERS[BATCH] = SUBJECT_CLOSERS.mechanics` | **a passed batch executes nothing and `binding` renders false**, because `ballotBinds` is a `hasOwnProperty` on that table |
| `:27239` subject selection at open | wrong price |
| `:27258` document branch | wrong document |
| `:27716` close-route proposer door | **the batch's own author cannot close their expired vote** |
| `:27916` withdraw-route status reset | **a withdrawn batch strands its proposal at `onsite_vote` forever** |
| `client/.../wizardConfig.ts:877` `SUBJECT_NOUN` | chip renders the raw string |

None of the three silent ones throws.

### The one test that has to change, or the guard is decorative

`shared/ballotSubjects.test.ts:120` asserts `minUnityPct > 50 implies method === "custom"` and **it iterates the static `SUBJECT_THRESHOLDS` record**. A `batch` entry of 0/0/0 passes that loop trivially and proves nothing about the computed path. Re-assert the invariant on the **output of `dialsForBatch`** over synthesized change sets: one per namespace, one mixed, one at the cap. If this build adds one test, add this one.

Also: a test asserting `"batch"` never appears at server/index.ts:28017, 28241, 28498 or 28647. Those four openBallot routes call `dialsForMethod` directly and can never see a floor. A batch opened through one of them would conduct at the ordinary quorum and look entirely correct doing it.

---

## 5. How it applies atomically, and what happens when a change is invalid

### The obstacle, stated exactly, because "wrap the loop in a transaction" does not work

`setVariable(pool, key, raw)` (`server/lib/variables.ts:98-118`) mutates a **module-level `overrides` object** beside its SQL write: `delete overrides[key]` or `overrides[key] = value`. `dbDocument.put` has the identical shape: `await pool.query(...)` then `cache = doc`. A database rollback restores the tables and leaves three process caches holding rolled-back values. This is why three separate places in the tree already document "this store cannot join a transaction".

### The answer, and it is small because the rescue already exists

Both modules already export the full re-read: `loadVariables(pool)` (the boot path) and `repo.load()`. So make the cache **derived for the duration of a batch** instead of written-through.

1. Split each writer in two. `setVariableIn(conn, key, raw)` does the SQL half only and touches no cache. `setVariable` becomes exactly what it is today: `setVariableIn` plus the cache line. Same for `docPutIn`, `setModuleLifecycleIn`, `queueRuleChangeIn`. `setVariable`'s first parameter widens from `Pool` to `Pool | PoolConnection`; the SQL is unchanged and `PoolConnection.query` is structurally compatible.
2. `applyBatch(pool, proposal, actor)` takes one connection, one transaction. In a fixed order (docs, dials, modules, seats, mint): revalidate against the live value read **on this connection**, `SELECT ... FOR UPDATE` the rows it will write, write, and insert the `mechanics_changes` ledger row plus the proposal status flip on the same connection.
3. Commit. **Then** `await loadVariables(pool)` and `repo.load()` for each touched document.
4. On any failure: rollback. The caches were never touched, so there is nothing to undo. **Rollback being free is the whole trick**, and it is why this is a small change rather than a rewrite of every store.

`applyMintRuleChanges`'s group-by-rule discipline stays: `queueRuleChange` writes all four pending columns from the rule's live values every time, so two calls for one rule would have the second overwrite the first and hand the village half of what it voted for with nothing to show anything went wrong.

**A namespace whose writer cannot join a transaction does not get a namespace.** That is why theme ships per-leaf through `docPutIn` and the whole-document `PUT /api/admin/brand` does not, and it is `orgDrafts`' own line copied with its reasoning.

### What does not change

`applyMechanicsProposal` keeps its per-change loop for `mechanics` and `mint_rule` proposals, exactly as it is. All three existing callers keep the partial-result object they expect: the admin apply route's HTTP 207 (`:25848`), the hub webhook (`:26038`), and the cycle-close sweep (`:24414`). **Batch proposals route to the new executor and answer 200 or 409, never 207.**

### Three clocks, one answer, already written here

A batch can span instant dials, the 22 cycle-close dials, and mint rules that queue to settlement. `changeSetWaitsForCycleClose` (`server/index.ts:25829`) already says the sentence and its comment already states the principle: *"A set holding ANY cycle-timed dial applies as a whole at cycle close. Atomicity beats promptness."* Generalize it to `batchLandsAt(changes)`, returning **one** moment: the slowest clock any change demands. A batch holding one mint change lands entire at the next moon, dials included. That is the price of R91's word "simultaneously", and it is printed on the frozen document before anyone votes.

### What happens if one change is invalid at execution time

**Nothing lands.** Status goes to `stale`, no ledger rows are written except a refusal record, and the proposer gets **Restage**.

This reverses a shipped decision and I say so. Today `applyMechanicsProposal` writes the stale target anyway and annotates the ledger `Baseline moved between proposal (x) and apply (y)`, and `serveProposal` ships `currentValue` under the comment "the baseline can move under an open proposal. Show it." **For a single dial that is right**, because the vote was on the target value, and it stays unchanged for the `mechanics` path.

**For a batch it is wrong, because a batch is ONE act.** If the tray staged quorum 20 to 25 and another proposal carried it to 40 meanwhile, applying 25 is a reduction nobody proposed. In a set of 25 no member can audit 25 baselines.

Drift-fails-whole is also the **concurrency answer**, which nothing has today: `open_key` is `subject_type:subject_ref` and `subjectRef` is the proposal id, so it is unique per proposal and never per control. Nothing serialises two batches touching the same dial. The same revalidation runs at ballot **open**, so a stale batch never opens and the exposure narrows to the vote window itself.

Two exceptions to fail-whole, both needed or a village deadlocks:
- **Already-at-target** applies as a no-op with the ledger line *"already at this value when the batch applied"*, so a batch overlapping one that already carried does not refuse forever.
- **Drift shown at read time never blocks.** The tray and the proposal card always render the live value beside `from` and `to`. Only apply time fails.

### One correctness dependency to fix in the same commit

`SUBJECT_CLOSERS.mechanics` (server/index.ts:26295-26301) states in a comment that `applied` and `queued` are never both filled *"because `validateChangeSet` refuses a set that mixes dials and minting rules"*, and it renders **"Nothing has moved yet"** on that basis. **That comment is code, not prose.** A batch fills both arrays and the close card would tell the village nothing moved over dials that did move.

---

## 6. What a member does NOT see, and the mechanism that enforces it

### The mechanism, in one sentence

**All 220 existing `isAdmin(req)` call sites stay exactly as they are.** Opening the page changes what renders. It changes nothing about what answers. A route added next month inherits refusal instead of inheriting exposure.

`AdminGate` (client/src/pages/Admin.tsx:878, 911) admits any member on the roll. All 71 `/api/admin` GET routes keep their gate verbatim. A member's admin page renders whatever the reads give them, which on most tabs is nothing. **That is uglier and it is the only version that is safe by construction rather than by intention.**

### The eleven reads that must never convert, named in a server constant with the reason on each

All `isAdmin`-gated today, all in `server/index.ts`, all verified present at `origin/main`:

| Route | Line | What it carries |
|---|---|---|
| `GET /api/admin/players` | 30604 | every member's email address |
| `GET /api/admin/submissions` | 7327 | raw form rows including signed religious-membership forms |
| `GET /api/admin/messages/reports` | 9844 | private DM bodies plus reporter names |
| `GET /api/admin/map/concierge-log` | 10726 | every search text a member typed, attributed to them |
| `GET /api/admin/payments` | 12877 | named charges and suspensions |
| `GET /api/admin/exits` | 15437 | who is leaving, their note, their balance settlement |
| `GET /api/admin/recordings/:id` | 15076 | call transcripts |
| `GET /api/admin/feedback` | 13944 | feedback with submitter names joined on |
| `GET /api/admin/command-centre` | 18748 | **per closed cycle, every member by name with received / hearts / credited / distinct senders** |
| `GET /api/admin/email-config` | 19130 | credentials (already strips keys on the way out) |
| `GET /api/admin/integrations` | 19298 | credential health (masked; the WRITE at 19323 is the hazard) |

**Item nine is the sleeper and it is why the list is written down rather than left to judgement.** It is a named, ranked, six-cycle-deep table of who received how much appreciation, sitting on a tab that reads like plumbing. Publishing it to every member is a social scoreboard the village never voted for. Nothing about the tab label says "sensitive", which is exactly how the last plan's error happened.

**Enforced by a test**, using the same verbatim-path trick `capabilityRegistry.test.ts` already uses: each of those eleven paths must still contain `isAdmin(req)` in `server/index.ts`. A future lane that converts one has to delete a test line and explain itself.

### The nav filter is cosmetic and is never the enforcement

Extend `filterNavByModules` (`client/src/lib/adminNav.ts`) rather than adding a second filter beside it. **Fix its `null` fallback**: a `null` lifecycle map currently filters nothing, so a slow load shows the whole rail. That is fine for an admin and wrong for a member. Closed by default.

### The second and larger half: the proposal document is the leak, not the admin page

Every instinct on this lane is to reason about who may SEE the admin surface. The surface stays behind `isAdmin`. **The uncontrolled channel is the other end**, and it is already live:

- `GET /api/game/mechanics/proposals` (server/index.ts:25423) is `async (_req, res)` with **no auth reference in its body**, and its own comment reads *"Everything, to everyone."* Control: `/api/game` carries no prefix middleware, while `/api/map` (`:9903`) and `/api/governance` (`:26082`) both do.
- `GET /api/governance/ballots/:id` (`:27477`) reads `authedUser(req)` **only as `viewer?.id`**. No 401, no `isAdmin`, no membership test. `serveBallot` returns `docMarkdown`, `votes: [{name, choice, weight, castAt}]`, the named silent list, and named objections. Its only gate is `requireModule("governance")`, and `requireModule` (`server/lib/modules.ts:319-340`) calls `next()` for anonymous callers at lifecycle `public`. `shared/modules.ts:983` declares governance `requires: []`, so `moduleMaxLifecycle` bounds it at `public`. Its `dataClass: "member-pii"` tag enforces nothing here.

**A correction to what the four readers said about this.** `serveBallot` carries a comment at server/index.ts:27057: *"Votes and weights are member-visible on purpose (the Hypha voter-list posture). This village does not run secret ballots, and the page says so."* So the named voting record is a **deliberate member-visible decision**, not an oversight. The defect is narrower and more precise than "the named record leaks": the route has no auth of its own, so **a deliberate member-visible posture becomes an anonymous one the moment an admin sets the governance module to `public`**, and nothing in the product says that toggle does that.

**Therefore, in this lane, in the same commit as the vocabulary:**
1. Every registry entry declares `publicInProposal: true` and names the existing public route that already serves the same value. No such route, no entry. That is why the vocabulary passes the test by construction: dials by `GET /api/game/mechanics` (which already ships `ring`), module lifecycles by the module catalog, brand and theme by `GET /api/brand/theme.css` and `/api/map/skin`, content leaves by `GET /api/content/:section`.
2. One test renders a proposal document over a synthesized set covering every namespace and asserts the output carries no member id, no email address, and no name field.
3. Redaction runs where the document is **rendered**, not where it is written. This is the remedy this repo already used when the `roles` content section answered anonymous callers with real first names for as long as it had existed: `PERSON_FIELDS = ["holders", "holderNote"]` stripped at the public read (`server/index.ts:7514-7528`), not a gate on the route.
4. **Gate the anonymous reads.** Require a viewer on `GET /api/governance/ballots/:id`'s named arrays unless the module is public AND the village has explicitly consented to a public voting record. Same for the mechanics list route. **A lane that opens the admin page to members while leaving the named voting record anonymously readable has made the village's governance more legible to strangers than to itself.** If this lane will not gate them, this lane does not ship the vocabulary.

### The quiet fourth thing: opening the page silently breaks the audit trail

`app.use("/api/admin")` (server/index.ts:7136) is a **logger, not a gate**. It writes an audit row only when `adminActor(req)` is set, and that property is set only for role `admin` or `founder` (server/index.ts:1616 inside `isAdmin`, `:3239` inside `mayAct`). A member who legitimately holds `dial.set` through a role and applies directly writes **no admin audit row at all**. Fix in the same commit: the staged-act row IS the record, and apply writes ledger rows keyed to the batch including the lines that refused.

---

## 7. Where it is built on something that exists, part by part

| Part | Built on | Named |
|---|---|---|
| The tray | `proposal_drafts`, whole | drizzle/0091, `server/lib/proposalDrafts.ts`. Server-held, `user_id`-scoped in the SQL, capped, deleted on publish, carries JSON + step index. One `WIZARD_TYPES` edit, and the client drift test keeps it honest. |
| The change shape | `mechanics_proposals.change_set` | `{key, from, to}`, json NOT NULL, append-only in spirit (drizzle/0043:20-22). Every downstream consumer already reads this shape. |
| Key namespaces | `shared/mintRuleKeys.ts` | Already proved a key namespace can address a row's columns, and chose the colon because no `VARIABLES_BY_KEY` key contains one. Copied three times. |
| The registry shape | `shared/gameVariables.ts` | `{key, label, type, validate, ring}` plus one required new field. `validateVariable` is already the raise-and-apply validator pattern. |
| The apply transaction | `orgDrafts.publishDraft` (`server/lib/orgDrafts.ts:339-376`) | One connection, one transaction, every change or none, `before_json` captured INSIDE it so revert is a read rather than a guess. Exact shape, copied. |
| The cache rescue | `loadVariables(pool)` and `dbDocument.load()` | Both already exported, both already the boot path. Rollback becomes a no-op because the cache was never touched. |
| The slowest-clock rule | `changeSetWaitsForCycleClose` (`server/index.ts:25829`) | Its own comment already states the principle for two clocks. Generalized to three, not invented. |
| Group-by-target discipline | `applyMintRuleChanges` (`server/lib/economy.ts:1300-1349`) | Kept verbatim, with its reason: two calls for one rule would have the second overwrite the first. |
| The staging verdict | `mayAct` / `guardCapability` / `overrideRefusal` (`server/index.ts:3226, 3316, 3365`) | Already returns a structured 409 carrying capability, holder name, human title and consequence, so a control words its own sentence. Staging is a **third verdict layered above** the decision, not a fourth reason for refusal. It gains one fact: the stage key this refusal becomes. |
| Route-to-power map | `server/lib/capabilityRegistry.ts` POWERS | The only machine-readable one in the repo, with a test asserting every declared path exists verbatim in `server/index.ts`, so a renamed route breaks loudly. |
| The render-then-lock UI | `client/src/pages/GameMechanics.tsx:987-1028` | `const editable = ... v.ring === "open" && !standing?.denied` with a `<Lock/> founder-held` badge. The visual language exists for 117 dials. This generalizes it from a lock to a fork. |
| Tab hiding | `filterNavByModules` (`client/src/lib/adminNav.ts`) | The one tested "this tab does not exist for you" mechanism. Extended, plus its `null` fallback closed. |
| The floor arithmetic | `dialsForSubject` (`shared/ballotSubjects.ts:219-232`) | `Math.max` per field, and the file's own three-paragraph refusal to lower a village that raised itself. |
| Subject wiring | The `MINT_RULE` precedent | `git grep MINT_RULE` enumerates all six production sites plus the client noun. |
| Row staging | `orgDrafts` given a ballot subject | The atomic engine and the governance engine are both built and have never been wired to each other. **Give the atomic engine a subject rather than teaching the change set to be an org draft.** |
| Redaction at the boundary | `PERSON_FIELDS` strip at `GET /api/content/:section` (`server/index.ts:7514`) | The repo's own precedent AND its own remedy for this exact class. |
| Parameter pinning | `drizzle/0106_admin_mint_cosign.sql` | The row holds the parameters as they were when asked for, and the approval reads every one from the row and never from the approver's request body. |
| Orphan safety | `server/repos/uploadRefs.ts` `TEXT_TYPES` includes `json` | A staged pointer in a JSON column is seen by the sweep, so a live proposal's attachment cannot be classified as an orphan. Free if obeyed, fatal if not. |

---

## 8. Where the three disagreed, and what I picked

**1. Where the tray lives.** #1 said `mechanics_proposals` at `status='draft'`. #3 said `proposal_drafts`. **#3, decisively, on evidence.** The anonymous list route has no status filter (verified), so a `draft` row is published the instant it is created, and 0043's header says `draft` is a public sponsorship on-ramp rather than a scratchpad. #1's version would publish Ana's half-finished tray to the anonymous internet. This is not a preference.

**2. Does the admin page actually open?** #2 said no, build a member-facing controls page instead, because conflating "the same page" with "the same controls" is precisely how private data ships. #1 and #3 said yes, with reads shut. **I pick open, because it is what R91 literally asked for and because the enforcement is per-route and already exists 220 times.** But I take #2's honest caveat and put it in the copy: on most tabs a member sees an empty panel and a sentence. Do not let anyone discover that at demo time.

**3. What a staged change stores.** #2 opened by proposing route + payload replay and then half-switched. **The switch is right and the reasons are worth keeping**: a replayed `PUT /api/admin/x` needs a synthesized request that `isAdmin` approves, which is an authority-forging primitive living in the codebase forever, reachable from a table members write to. Addressed field, always.

**4. Drift at apply time.** #1 kept apply-anyway for still-valid drift; #3 fails the whole batch. **#3.** #1's own rule silently applies a reduction nobody proposed when a concurrent batch raised the same dial higher, and in a 25-line set no member can audit 25 baselines. Keep #1's drift annotation for the single-dial `mechanics` path, which is unchanged.

**5. The dial count.** #1 said 149 total / 117 open. #4 said 122 / 90 open. **Both are right about different scopes and I verified the reconciliation**: 122 hand-written defs + 12 stage multipliers (GAME_CONFIG has 12 stages) + 2 quest rungs (2 stages carry `rule.type === "quests"`) + 13 unlock rungs (STAGE_UNLOCKS has 13 entries) = **149 registry entries, 32 founder-ring, 117 open**. All 27 generated defs are category `Progression`, which is not a founder category and carries no explicit ring. Use 149/117/32 in the brief.

**6. How many openBallot routes consult the registry.** Two, not one and not six. Verified: `dialsForSubject` at server/index.ts:14893 and :27240; `dialsForMethod` at :28017, :28241, :28498, :28647. The in-code comment at :27219 saying "five call dialsForMethod" is off by one and was written before launch was converted.

**7. The cap number.** #1 said 40/200, #2 said 24/60, #3 said 40. **25 default, 60 hard max, as a dial.** The number is not load-bearing; the reason is. 12 was chosen for the readability of a flat table, and grouping changes what is readable.

**8. Whether the ballot read is a leak or a posture.** All four readers called `GET /api/governance/ballots/:id` an unnoticed leak. **It is narrower than that and the correction matters**: the payload carries a comment saying votes and weights are member-visible on purpose, the Hypha voter-list posture, and this village does not run secret ballots. The actual defect is that the route has no auth of its own, so a deliberate member-visible posture silently becomes an anonymous one when the module is set to `public`. Fix the gate; do not "fix" the posture.

---

## 9. The correction to put to the founder

R91 said: *"any member should be able to see the exact same admin page we see today (including changing theme and ALL admin functions today)."*

**Some of those functions must not be member-visible, and this is a correction to put to him rather than a silent narrowing.** In his own terms:

> Opening the admin page to every member opens more than the settings. The same page also holds **members' own records**: everyone's email address, the private text of reported direct messages, every search a member has typed into the map with their name attached, who is behind on a payment, who is leaving the village and what they wrote about why, call transcripts, and a table showing every member by name with how much appreciation they received each cycle for the last six cycles.
>
> None of that is a setting and none of it should be a vote. **The design keeps every one of those reads exactly as locked as it is today** and shows a member an empty tab with a line saying the tab holds members' own records. The page opens; the records do not.
>
> Three more things cannot go into a proposal, for a reason that is not squeamishness. **A proposal is published**, and today it is published to anyone who asks, so anything a proposal contains is public by the time the village reads it. That rules out **passwords and API keys** (a staged key is a live key printed in a document), **anything that names a person as the value being changed** (someone's voting weight, someone's role, who holds a seat), and **anything that runs once rather than being set** (closing a cycle, minting, sweeping files). Those last ones cannot honestly be voted on because a voter cannot be shown what they will do until they do it: the amounts a cycle close pays are unknowable until it runs.
>
> And two powers go orphan at launch, which needs your ruling before anything is built. **Changing anyone's role is founder-only** (`server/index.ts:7970`) and the code refuses to be left without a founder at all (`:7987`, "The last founder cannot be demoted"). After launch nobody could appoint or demote an admin. Separately, **32 of the village's 149 dials are founder-held** and refused to the vote by name, including both dials that decide how voting weight is assigned. That was deliberate: the registry says voting weight is "never a dial a majority flips mid-game to entrench itself." R91 and R90 together leave those 32 belonging to nobody who exists. **That argument needs answering rather than deleting**, and my suggestion, offered as a question: those 32 become a third ring, proposable only at a real unity floor with `method: "custom"`. That is its own ruling and its own lane.

R90 is genuinely unshipped: `git grep R90` over `origin/main` returns nothing while `git grep R89` returns four files as a control. The one route that changes posture at launch carries an explicit *"Do not infer it from anything already in the tree."* This design does not infer it.

---

## 10. Deliberately left for later

1. **The other ~160 admin write routes.** Roughly 120 to 130 are gated by `isAdmin` alone with no capability key a member could ever hold, so for most of them there is **no power to lack** and nothing for a staged change to become. `shared/capabilities.ts` already argued against adding a key per route: it would name every button and no power.
2. **The 32 founder-ring dials and role changes.** Ruling first, code second.
3. **Circles**, for the reason `orgDrafts` already wrote down.
4. **Seat holders**, and every other row that names a person.
5. **Serialising two open batches on the same control.** Drift-fails-whole is the practical answer; a per-control open-batch index is its own lane. Named as a limit rather than claimed.
6. **The 12 routes with no browser door** (`scripts/check-admin-reach.mjs` `STANDING_ORPHANS`). They stay ungoverned and the ratchet keeps them visible.
7. **Wiring the subject registry into the four `dialsForMethod` openers** (advisory, power_transfer, power_grant, power_return). Not needed for batch, needed before anyone adds a second way to open one.

---

## 11. The honest size

**Nine lanes. Two of them are the whole risk.**

| Lane | Work | Risk |
|---|---|---|
| **A. Connection-scoped writers + batch executor** | Split 4 writers, widen `setVariable`'s pool param, `applyBatch` with one transaction and post-commit cache reload, the `FOR UPDATE` locks, retire 207 for batch only | **HIGHEST. This is the hard half of R91 and it is invisible from the API surface.** Every reviewer will read "wrap it in a transaction" and miss the three process caches. |
| **B. Stage registry** | `shared/stageRegistry.ts`, ~90 hand-written document leaf entries plus the module and seat entries, each with a validator and a `publicInProposal` + `publicReadRoute` pair | Tedious, low risk, high volume. This is the single largest hand-written artefact. |
| **C. Three key namespaces** | `doc:`, `module:`, `seat:` parsers, raise validators, appliers, labels; extract `setModuleLifecycle`'s guard half into `moduleLifecycleProblem(id, next)` callable at raise and inside the transaction | Medium. The module guard extraction is the fiddly bit. |
| **D. Pricing** | `dialsForBatch`, the `batch` subject, the six wiring edits, `minElectorate` wiring, the rewritten `ballotSubjects.test.ts` invariant | Small code, **two silent failure modes** if the wiring checklist is not followed literally. |
| **E. The tray** | `wizard_type: "batch"` both sides, stage/unstage/list routes on `proposal_drafts`, stage-time cooldown refusal, publish-to-proposal conversion | Small. The table does the work. |
| **F. The document** | `proposalMarkdown` batch branch: group by nav title, price + line + counterfactual, "what this does not do", one landing moment, drop the JSON block | Small, and it is the part a neighbour actually reads. Do not let it be the part that gets cut. |
| **G. Privacy** | The eleven never-convert constants + verbatim-path test, redaction at render, the document-contains-no-names test, **the auth check on both anonymous reads**, the audit-row fix for member actors | **SECOND HIGHEST, and non-negotiable.** If the lane will not gate the two anonymous reads, the lane does not ship the vocabulary. |
| **H. Client fork** | `AdminGate` opens; `writeMode(stageKey)` returning apply / stage / locked; one field on `GET /api/game/me`; per-control staging affordances; tray UI and counter; `filterNavByModules` extension plus its `null` fix | Medium-large by volume. The staged controls concentrate on roughly 8 to 12 of the 48 tabs, so this is not 316 wrappers. The dials half can reuse `GameMechanics.tsx`'s existing composer rather than being rebuilt on the Admin dials tab. |
| **I. Org drafts get a subject** | Ballot subject on the existing engine, closer calls `publishDraft` | Small, and it is the cheapest coverage in the whole design because both halves are already built. |

**Order:** G before everything that publishes. A before D (the price is meaningless if the apply is not atomic). B and C together. E, F, H, I after.

**Do not let anyone start with H.** It is the visible half and it is the half that will look finished while A is still a for-loop.

---

# The nine fatal findings

**One lens of four passed the design. These are the nine that must be answered before a lane builds
it, each with the fix its finder proposed.**

## FATAL 1

**The claim:** Section 3, CAN row 4: '16 module lifecycles ... Enum bounded by moduleMaxLifecycle' is a safe stageable control, and section 1's worked example has Ana staging the Forum from `members` to `public` as merely 'the line that raises the price'.

**The problem:** `moduleMaxLifecycle` (server/lib/modules.ts:551-560) is a DEPENDENCY-RANK bound, not a privacy check. `setModuleLifecycle` (:576-643) validates unknown / core / enum / withdrawn / dependency-non-off / rank / shared-password and nothing about who may read what. `requireModule` calls `next()` for anonymous callers at `public` (server/lib/modules.ts:328-336). `forum` and `governance` are both non-core with `requires: []` (shared/modules.ts:562, 981), so `moduleMaxLifecycle` returns `public` for both. At `public` these routes carry no auth of their own and serve names to strangers: `GET /api/forum/threads/:id` (server/index.ts:8993-9024) returns every thread body and every reply body with `author.name` and `author.handle` and `const user = await authedUser(req)` with no 401; `GET /api/feed` (:8596-8620) the same with `author_name`, `author_handle`; `GET /api/governance/ballots/:id` (:27477-27499) the entire named voting record; also `/api/events/who-is-here` (:11655), `/api/badges/of/:userId` (:16936), `/api/stays` (:12398), `/api/library` (:16492), `/api/health/summary` (:16124), `/api/exchange` (:17397). So ANY member, with no admin role, can stage a one-line change whose effect on carrying is to publish the village's forum, feed and voting record to the anonymous internet. The design never asks what a staged change CAUSES, only what it CONTAINS, and its single mitigation (section 6, item 4) gates one of roughly twenty-five routes. This is the last plan's failure class arriving through the design's own CAN list.

**Proposed fix:** `module:<id>:lifecycle` cannot be one stage key. Narrowing (public to members to preview to off) is a settings change. Widening to `public` is a data-publication decision: give it its own subject with its own threshold, and require each registry entry to carry `publicRoutesExposed: string[]` enumerated from that module's `apiPrefixes`, printed verbatim into the frozen document as 'these pages become readable by anyone on the internet: ...'. If that list cannot be produced mechanically, drop the namespace and leave lifecycle as an act.

## FATAL 2

**The claim:** Section 3, CAN row 3 makes ~90 document leaves stageable including `visit-config`, and CANNOT-F says byte uploads are safe because 'Only the pointer stages. This is safe by construction.' Section 5 splits every writer so the batch calls `docPutIn(conn, ...)`, 'the SQL half only'.

**The problem:** The route handlers ARE the validators, and `docPutIn` bypasses them. `PUT /api/admin/visit-config` (server/index.ts:20756-20763) and `PUT /api/admin/investor-summary` (:20777-20786) each run `ctaLinkProblemIn(req.body)` before `repo.put`. That guard is `vaultLinkProblem` + `ctaSchemeProblem` (:20629-20690, `UPLOADS_PATH` at :20553) and its own header states the threat exactly: '/api/uploads/:filename has no authentication of its own: the link IS the credential, it never expires, and it can be forwarded.' `GET /api/uploads/:filename` (:20037-20047) confirms it: 'This route has no gate on it and answers one year immutable.' So a member staging `doc:visit-config:visit_types.0.cta_url = /api/uploads/cap-table.pdf` publishes a private vault document. And the leak lands BEFORE any vote: `serveProposal` (:25520-25532) ships `from` and `to` raw, because `displayChangeValue` returns `raw` for any key with no registry def (server/lib/mechanics.ts:344-352), through `GET /api/game/mechanics/proposals` (:25423), which is `async (_req, res)` with no auth reference in its body and no status filter. The same bypassed guard is the only thing refusing `javascript:` URIs into two documents that public pages put straight into an `href`. The design names exactly one route-handler guard to extract (`moduleLifecycleProblem`, lane C) and does not know this one exists.

**Proposed fix:** Add the twin of the design's own rule: a field whose route handler carries a validator gets no registry entry until that validator is a pure `problem()` function callable at stage, at raise, at ballot open, and inside the transaction. Extract `ctaLinkProblemIn` and `ctaSchemeProblemIn` (:20690, :20743, and the forum copy at :8957) first, and audit every remaining `PUT /api/admin/*` in the doc namespace for a guard between the auth line and the `repo.put`. Independently, refuse any staged value matching `UPLOADS_PATH` in ANY namespace at stage time, since the publication channel is the change set rather than the applied value.

## FATAL 3

**The claim:** "Three clocks, one answer." Generalize changeSetWaitsForCycleClose to batchLandsAt(changes), returning ONE moment. "A batch holding one mint change lands entire at the next moon, dials included. That is the price of R91's word 'simultaneously', and it is printed on the frozen document before anyone votes."

**The problem:** The mint writer cannot be told a moment. `queueRuleChange` (server/lib/economy.ts:1197) hard-computes `const fromCycle = cycleBoundsFor(new Date()).cycleNumber + 1` from wall clock, with no parameter and no override; its header says "It lands at the NEXT cycle, never this one." `applyPendingRules` (economy.ts:1369) promotes only where `pending_from_cycle <= cycleBoundsFor(at).cycleNumber`, and `runSettlement` calls it FIRST (economy.ts:982, comment: "Promote queued dial changes FIRST"). The cycle-close route applies passed mechanics proposals AFTER the close (server/index.ts:24414 @291b80d, comment: "the closing cycle settled under the OLD rules just now"). So a batch applied at the close of cycle N writes the dials live at that instant and stamps the mint at pending_from_cycle N+1, which the NEXT settlement promotes. The dials move a full moon before the mint. The design's own frozen document would print "everything in this list takes effect together at the next moon" over a set where that is false, on a governance record, to voters. This is the design's headline promise and the exact failure class the prompt named: a sentence described as costless that turns out to be a lie with a number on it.

**Proposed fix:** Either drop `mint:` from the batch vocabulary (mint-only proposals keep the existing MINT_RULE subject, and the narrowing goes to R91 as a stated correction, since it is a partial reinstatement of the exclusion he overruled), or add an explicit `fromCycle` parameter to `queueRuleChange` and have applyBatch stamp the CURRENT cycle so the same settlement promotes it — which also requires reordering applyPendingRules relative to the mechanics sweep, and economy.ts:977-981 argues against that ordering in writing. Do not ship a batchLandsAt sentence until one of the two is chosen.

## FATAL 4

**The claim:** Pricing: "a mixed batch must be priced at the HIGHEST threshold any change in it demands"; the lever is a per-entry `quorumFloorPct`; the cap rises from 12 to a 25-default / 60-max dial because "12 was chosen for the readability of a flat table"; the worked example says "Without that change this vote would need 20%."

**The problem:** The design assigns no floor to anything. Every governance self-dial is verified OPEN ring and therefore stageable: governance.unity_pct, governance.quorum_pct, governance.vote_days, governance.default_method, governance.change_cooldown_days, governance.hypha_threshold, membership.vouch_threshold (all category Governance, no explicit ring, and Governance is not in FOUNDER_CATEGORIES at shared/gameVariables.ts:1764), plus all 13 generated progression.unlock.* rungs including `ballot.vote` and `member.vouch` (shared/capabilities.ts STAGE_UNLOCKS, 13 entries, all category Progression, no ring). So one 25-line batch can lower the village's quorum, lower unity, change the deciding method, widen the roll, remove the proposer bar, and set governance.change_cooldown_days to 0 — at the ordinary 20% the design's own counterfactual sentence quotes, buried as line 19 of a proposal titled after a colour change, with the cooldown that throttles the NEXT one disabled by the same act. Today the 12-cap plus the per-key cooldown plus one-subject-per-proposal is the practical throttle on exactly this; the design removes the cap and moves the cooldown to stage time while adding no price. The registry's own words about the weight dials — "never a dial a majority flips mid-game to entrench itself" (gameVariables.ts:463) — are the argument this reopens through the rungs instead of the dials.

**Proposed fix:** Before any of Lane B is written, assign quorumFloorPct values in the stage registry for the constitutional set (the seven governance.* / membership.* dials and the 13 progression.unlock.* rungs), at minimum MINT_RULE's existing 50. Then add the test: synthesize a set containing one colour leaf and one roll-defining rung and assert dialsForBatch returns the rung's floor, not the village's base. Until the floors exist, the batch subject is a self-amendment primitive priced as a settings change.

## FATAL 5

**The claim:** "A batch holding one mint change lands entire at the next moon, dials included. That is the price of R91's word 'simultaneously', and it is printed on the frozen document before anyone votes." (§5, batchLandsAt / the slowest clock)

**The problem:** The mint clock cannot be aimed, and the design's own generalization pushes it a full lunation FURTHER from the dials rather than onto them. 1. `queueRuleChange` (server/lib/economy.ts:1224) computes its landing moment internally: `const fromCycle = cycleBoundsFor(new Date()).cycleNumber + 1`. There is no `fromCycle` parameter in the signature (economy.ts:1197-1202). A `queueRuleChangeIn(conn, ...)` split described as "the SQL half only" does not add one, so applyBatch has no way to tell the mint half when to land. 2. The promotion is in nobody's transaction. `applyPendingRules` (economy.ts:1369) is called from exactly one production place, `runSettlement` (economy.ts:982), and `runSettlement` has exactly one production caller: the hourly `moon-settlement` scheduler job (server/index.ts:5369-5382). The governance apply runs on a different path entirely, inside `POST /api/admin/cycles/close` (server/index.ts:24414). Nothing joins them. 3. Deferring the batch to cycle close makes the gap WORSE. `dueCycles` (server/lib/gratitude-cycles.ts:256) reads `currentNumber = cycleBoundsFor(now).cycleNumber` and only lists lunations whose number is below it, so by the time a close runs the lunar counter has already advanced to N+1. Dials applied in that sweep govern N+1. `queueRuleChange` fired at the same instant stamps `pending_from_cycle = N+2`. Today a mint-only proposal applies immediately at close and lands at N+1; under `batchLandsAt` it lands at N+2. A mixed batch of one cycle-close dial plus one mint rule therefore takes effect in two moments about 29.5 days apart, while the frozen document promises one. This is exactly the defect `validateChangeSet`'s own comment says the two-vocabulary exclusion exists to prevent ("A set mixing them could not be applied atomically"), arriving intact through the door R91 opened.

**Proposed fix:** Make `batchLandsAt` return a target CYCLE NUMBER, not a moment, and give `queueRuleChange` an explicit `fromCycle` argument (default preserved for its existing admin caller). Apply a mint-bearing batch during cycle T-1, queueing the mint for T, and hold the cycle-close dials for the T-1 -> T boundary. Then print the honest sentence on the document: a batch containing a minting change COMMITS at two moments and TAKES EFFECT at one. If that is unacceptable, keep mint keys out of the batch vocabulary and put that to R91 as a second correction alongside §9.

## FATAL 6

**The claim:** "On any failure: rollback. The caches were never touched, so there is nothing to undo. Rollback being free is the whole trick, and it is why this is a small change rather than a rewrite of every store." (§5)

**The problem:** True of exactly one of the five namespaces. False for `doc:` (~90 registry entries, the largest part of the vocabulary) and false for `module:`, and in both cases a rollback leaves the process serving values the village never voted for, permanently, until restart. `dbDocument.get()` (server/repos/store-db.ts:188) is `return cache ?? fallback` — the cache OBJECT, not a copy — and the repo's own write idiom mutates it in place BEFORE the SQL write. `PUT /api/admin/content/:section` (server/index.ts:7550-7552): `const content = contentRepo.get(); content[req.params.section] = req.body; await contentRepo.put(content);`. Any `docPutIn(conn, ...)` built on that idiom sets the leaf on the live cache at that instant, so `getBrand()`, `mergedConfig()`, `GET /api/brand/theme.css`, `/api/map/skin` and `GET /api/content/:section` serve the uncommitted values and keep serving them after the rollback, because the design deliberately does not reload on the failure path. Sharper edge: when no row exists `get()` returns the FALLBACK, a module-level constant — `dbDocument(getPool(), "brand", DEFAULT_BRAND)` (index.ts:1280), `dbDocument(getPool(), "content", {})` (index.ts:1258). On a village that has never written that document, mutate-in-place corrupts the platform defaults constant for the life of the process. `setModuleLifecycle` has the identical shape (server/lib/modules.ts:681-684): `row.lifecycle = next; settings.set(id, row); reconcileGraph();`. `reconcileGraph()` recomputes the DEMOTION map from the mutated cache (modules.ts:115-125), so one rolled-back module line can serve OTHER, untouched modules as `off` to every visitor. Only `setVariable` (server/lib/variables.ts:110-117) actually has the SQL-then-cache shape the whole trick was generalized from. Second half of the same finding: `dbDocument.put` writes the WHOLE document (store-db.ts:196-201), so two leaves of one document must compose onto ONE working copy or the second put reverts the first — the `applyMintRuleChanges` group-by-rule lesson (economy.ts:1290-1296), kept verbatim for mint and never restated for `doc:`. And because `PUT /api/admin/brand` (index.ts:20831-20852) builds its `next` from `getBrand()` (the cache) with no version check, a concurrent admin save that blocks on the batch's row lock commits afterwards from its stale read and silently reverts the batch's leaf.

**Proposed fix:** Deep-clone every touched document at the top of applyBatch, compose all leaves of one document onto that single working copy, hand the copy to `docPutIn(conn, ...)`, and never call `repo.get()` inside the transaction. Reload on BOTH paths: `await loadVariables(pool)`, `await repo.load()` per touched document, and `await loadModuleSettings(pool)` after rollback as well as after commit. Add a test that rolls a batch back and asserts `getBrand()`, `effectiveLifecycle()` and `rawValue()` all read pre-batch values.

## FATAL 7

**The claim:** '~90 allowlisted document leaves... Per leaf, never as the whole document', each with `validate: (v) => string | null` callable at raise and inside the apply txn.

**The problem:** The guards on those documents are not per-leaf and cannot be expressed as a one-value validator. `PUT /api/admin/exit-policy` (server/index.ts:15378-15422) carries FIVE: structural completeness; `intakeContactRole` must exist in `rolesRepo`; `decidingDomainId`/`appealDomainId` must exist in `circlesRepo`; `blankTerms(next)` over the whole document; and `platformDefaultTerms(next)` gated on `!next.placeholder`. That last one is the honesty guard whose own header (server/lib/exitPolicy.ts:1-25) says clearing it wrongly publishes 'the platform's boilerplate as its own settled exit terms, which is the highest-stakes copy on the site saying something false about where it came from'. Under the design, `doc:exit-policy:placeholder = false` is one leaf, passes a boolean validator, and does exactly that. Two of the five are cross-TABLE referential checks against circles, which the design explicitly refuses to make stageable, so a batch can point the appeal circle at an id nothing validates. This is the design's own named error class arriving through its own front door: a field and no new mechanism that publishes a false claim.

**Proposed fix:** The stage registry validates the RESULTING DOCUMENT, not the leaf. Splice every staged leaf into a copy of the document, then run that document's existing route-level validator (`normalizeExitPolicy` + `blankTerms` + `platformDefaultTerms`, exported at server/lib/exitPolicy.ts:124/154/166) at raise AND inside the transaction. A document whose route validator cannot be extracted as a pure whole-document function gets no leaves at all. Audit all ~90 leaves for this before writing any of them.

## FATAL 8

**The claim:** Theme ships per-leaf through `docPutIn`, and `applyMintRuleChanges`'s group-by-target discipline is kept 'because two calls for one rule would have the second overwrite the first and hand the village half of what it voted for'.

**The problem:** The identical overwrite exists for documents and the design does not group them. `dbDocument.put(doc)` (server/repos/store-db.ts:195-201) writes the WHOLE JSON blob and then sets `cache = doc`; there is no leaf write. A per-leaf writer must read the current document, splice, and put. The design deliberately leaves the cache untouched for the duration of the batch (that is what makes rollback free), so change 2 reads the SAME pre-batch document that change 1 read, and its put overwrites change 1's leaf. A batch touching `doc:brand:theme.primary` and `doc:brand:theme.accent` applies only the accent. The design's own opening walkthrough is a Look-and-feel change; it is safe only because it happens to move one leaf. Nothing reports this: both changes get 'applied' ledger rows.

**Proposed fix:** Group staged changes by docKey exactly as `applyMintRuleChanges` groups by ruleId. Inside the transaction, `SELECT value FROM app_config WHERE config_key = ? FOR UPDATE` once per document, splice EVERY staged leaf for that document into that row's value (not into the process cache), write once, then reload the repo after commit. Assert in a test that a two-leaf single-document batch leaves both leaves changed.

## FATAL 9

**The claim:** 'the staged-act row IS the record, and apply writes ledger rows keyed to the batch including the lines that refused'; the ledger row is inserted 'on the same connection' inside the transaction; the ledger is free (no new table).

**The problem:** `recordMechanicsChange` (server/index.ts:2943-2972) cannot do any of that as written, and the design's lane A names four writers to split without naming it. Three separate failures. (a) It writes through `getPool().query`, a different pooled connection, so its rows land OUTSIDE the batch transaction: a rolled-back batch leaves a complete amendment ledger saying it applied. (b) It wraps the insert in `try { ... } catch { console.error('amendment ledger write failed for ' + key + ' (change stands)') }` — best-effort by design, so any ledger failure is silent and the change still commits. (c) `mechanics_changes.old_value` and `new_value` are `varchar(255)` (drizzle/0042_mechanics_changes.sql:19-20). The design's largest new namespace stages prose: content sections, faqs, work-with-us, the welcome paragraph, exit-policy terms. In strict mode that insert throws 1406 and (b) swallows it; outside strict mode it truncates silently. Either way a prose change applies with NO amendment record. And `cooldownProblem` (server/lib/mechanics.ts) reads that same table, so a swallowed row also silently disables the cooldown for that key.

**Proposed fix:** Split `recordMechanicsChangeIn(conn, ...)` alongside the four writers and remove the catch on the batch path so a failed ledger row rolls the batch back. Widen `old_value`/`new_value` to `text` in the same migration, or store prose values by reference (a hash plus a pointer into the proposal's change_set) and keep the 255 columns for scalars. Decide explicitly; do not inherit the swallow.


# The thirty serious findings, in brief

1. **Section 2 and section 6: '`publicInProposal` has no default and no `false` branch ... it makes the exclusion a property of the data model ra** — The construction is circular: it validates against CURRENT exposure rather than against whether the value should be exposed, which is the reasoning that would have approved the last plan's error. Two counterexamples at origin/main. (1) `GET /api/content/:section` (server/index.ts:7514-7532) strips `
2. **Section 6, item 2: 'One test renders a proposal document over a synthesized set covering every namespace and asserts the output carries no m** — The test cannot fire. Its `from` and `to` values are authored by the test, so it proves the renderer adds no names and proves nothing about the values, which are read live from `contentRepo`, `brandRepo` and `org_roles` at stage time. It also tests the wrong artifact: the uncontrolled channel is `se
3. **Lane I: 'Org drafts get a subject. Ballot subject on the existing engine, closer calls `publishDraft`. Small, and it is the cheapest coverag** — `publishDraft` (server/lib/orgDrafts.ts:339-375) loops `for (const c of draft.changes)` and applies every op with no filter of any kind, and `DraftOp` includes `seat_holder` and `end_holding` (:40). `previewDraft`, which is what a ballot document would render from, produces `Put ${c.payload?.display
4. **Section 2: '`shared/stageRegistry.ts` (new, one hand-written file). One entry per addressable field ... Absence from this registry is refusa** — Those two statements cannot both hold for the seat namespace. `org_roles` rows are created at runtime by `create_seat` (server/lib/orgDrafts.ts:404), so their ids are not knowable when a static shared file is written. Either seats are absent from the registry, in which case 'absence is refusal' empt
5. **Section 6: 'The nav filter is cosmetic and is never the enforcement. Fix its `null` fallback: a `null` lifecycle map currently filters nothi** — It is not a slow load, it is the permanent state for every member. `moduleLifecycles` is set from exactly one place: `AdminGoLive`'s read of `GET /api/admin/modules` (client/src/pages/Admin.tsx:11065, 11140), and that route is `isAdmin`-gated (server/index.ts:8288). A member's fetch 401s and never r
6. **"The six wiring edits a new subject costs" — row two: `server/index.ts:26836` `SUBJECT_CLOSERS[BATCH] = SUBJECT_CLOSERS.mechanics`, with the** — That assignment routes a passed batch through SUBJECT_CLOSERS.mechanics (server/index.ts:26244), which calls `applyMechanicsProposal` (25742) — the per-change for-loop that calls `setVariable(getPool(), ...)` once per key with no transaction. It is the exact non-atomic executor the whole design exis
7. **"The proposal: `mechanics_proposals` (unchanged schema)" — and "If a line went stale... nothing lands, the proposal goes to status `stale`."** — `mechanics_proposals.status` is a MySQL ENUM, not a varchar. drizzle/0043 declares `enum('draft','open','withdrawn','to_hypha','passed_claimed','applied')`; 0044:14 and 0089:142 each MODIFY it, and the current list is the ten values mirrored in the TypeScript union at server/lib/mechanics.ts:442-452
8. **The tray lives in proposal_drafts. "One edit: add `"batch"` to WIZARD_TYPES in server/lib/proposalDrafts.ts:47 and to the client's wizardCon** — Three things follow from that one edit that the design does not account for. (1) `ADVISORY_TYPES` is DERIVED: `WIZARD_TYPES.filter(t => !CONDUCTABLE_TYPES.includes(t))` (proposalDrafts.ts:201). Adding "batch" to WIZARD_TYPES alone makes it an advisory type, and `POST /api/governance/advisory` (serve
9. **"Split each writer in two. `docPutIn` does the SQL half only and touches no cache." Listed under the cache rescue as a small, mechanical spl** — `dbDocument.put` (server/repos/store-db.ts:195-202) writes the WHOLE document: one INSERT ... ON DUPLICATE KEY UPDATE of `JSON.stringify(doc)`, and it reads nothing. A per-leaf write is not a split of that function; it is a new SELECT-parse-set-write against app_config, and it must read on the trans
10. **"The staging verdict — mayAct / guardCapability / overrideRefusal already returns a structured 409 carrying capability, holder name, human t** — `overrideRefusal` (server/index.ts:3365) opens with `if (!verdict.needsOverride) return null;` and its own header states the scope: "Only an admin who did not break the glass gets a body here." For an ordinary member — the entire population this design is built for — the verdict body is null and `gu
11. **"`publicInProposal` has no default and no false branch... Every registry entry declares publicInProposal: true and names the existing public** — The safety property is asserted at ROUTE granularity over a vocabulary that is LEAF granularity, and this repo contains the counterexample it was modelled on. `GET /api/content/:section` (server/index.ts:7515) returns the full section to an admin and strips PERSON_FIELDS = ["holders","holderNote"] f
12. **"Extend `filterNavByModules` rather than adding a second filter beside it. Fix its null fallback: a null lifecycle map currently filters not** — For a member it is not a slow load, it is the permanent state. `moduleLifecycles` is fed by AdminGoLive, which owns the one `/api/admin/modules` read (Admin.tsx:11065 comment and 11140), and that route is isAdmin-gated at 8288. A member's fetch 401s, the state stays null forever, and filterNavByModu
13. **Registry entries carry `validate: (v) => string | null` "callable at raise AND inside the apply txn", and Lane B is "tedious, low risk" — ~9** — The theme leaves have no write-time validator by an explicit, written decision. PUT /api/admin/brand (server/index.ts:20841-20845): "Theme fields are validated at EMISSION (server/lib/themeCss.ts), not here... Rejecting at write time too would mean two sanitisers to keep in agreement forever." Writi
14. **"Lane I: Org drafts get a subject — Small, and it is the cheapest coverage in the whole design because both halves are already built."** — Five of the eleven entries in check-admin-reach.mjs STANDING_ORPHANS are the org-draft routes: POST /api/admin/org/drafts, POST .../drafts/:id/changes, PUT .../drafts/:id/vision, POST .../drafts/:id/publish, POST .../drafts/:id/revert, each annotated "The assistant's org-draft flow has no admin surf
15. **The tray is proposal_drafts, "already capped per member" and "a server row and not browser state" — Ana stages four lines, closes her laptop** — Two constants collide with the tray's job. DRAFT_CAP = 5 (proposalDrafts.ts:212), and its comment says why it is 5: "Five is the number of proposal types: a member may have one of each in flight." A member already holding five drafts gets `saveDraft` returning ok:false with "You are holding 5 unfini
16. **"extract `setModuleLifecycle`'s guard half into `moduleLifecycleProblem(id, next)` callable at raise and inside the transaction... Medium. T** — The guard is not extractable as a pure function, and the constraint is not expressible as a per-field `validate`. Every branch of `setModuleLifecycle`'s guard reads the module-level `settings` Map: `storedLifecycle()` (modules.ts:75-77) in the missing-dependency check, `moduleMaxLifecycle()` / `effe
17. **"16 module lifecycles | `PUT /api/admin/modules/:id/lifecycle` | Enum bounded by `moduleMaxLifecycle`" listed under CAN be staged (§3), with** — That vocabulary lets a village vote itself out of the room, and nothing in the codebase refuses it. `governance` is a non-core module (shared/modules.ts:971-996; control: `core: true` appears at shared/modules.ts:417, 432, 458 and 473, none of them governance), so `module:governance:lifecycle -> off
18. **"If a line went stale between the vote and the apply, nothing lands, the proposal goes to status `stale`, and Ana gets one button: Restage" ** — `closeBallot` commits the pass BEFORE any executor runs, so there is exactly one execution attempt and no door back. `closeBallot` (server/lib/ballots.ts:575-581) takes the guarded transition — `UPDATE ballots SET status=?, ... open_key=CONCAT(open_key,':',id) WHERE id=? AND status='open'` — and ret
19. **"Drift-fails-whole is also the concurrency answer... Nothing serialises two batches touching the same dial" and "Serialising two open batche** — The collision partner is not another batch. It is the ordinary admin surface, which stays fully live throughout, and the design's framing hides that. Drift is measured against `from`, and `PUT /api/admin/variables/:key` moves a dial with no knowledge of any open batch. One admin nudging one dial any
20. **'a mixed batch must be priced at the HIGHEST threshold any change in it demands', implemented as `dialsForBatch` taking max over per-field `** — Max-over-items has no term for the number of items, and the design's own test note says the `batch` subject entry is 0/0/0. Registry dials carry no floors. So a 25-line batch that rewrites the game prices identically to a one-line proposal: `governance.quorum_pct` default 20 and `governance.unity_pc
21. **The batch is one proposal the village reads and decides together, and `batch` needs no electorate floor ('a village of two governing itself ** — Nobody walked a village of five. At stock dials a single member carries 25 changes on their own vote with no other member involved. `governance.proposal_support_threshold` defaults to 0 (shared/gameVariables.ts:411-419), so no supporter is needed. `POST /api/governance/mechanics/:id/open-ballot` adm
22. **'It gathers support the way a mechanics proposal does today. It opens one ballot with one price... It carries.'** — Nobody asked what batching does to the two methods where the blocking unit is one person rather than a percentage. `evaluateBallot` (shared/governanceEngine.ts:74-86): `consensus` fails on any `noW > 0`; `consent` ignores unity entirely and fails on one open objection. Both are offered by `governanc
23. **'`AdminGate` (client/src/pages/Admin.tsx:878, 911) admits any member on the roll'; lane H is 'medium-large by volume... roughly 8 to 12 of t** — The cited line says the opposite. client/src/pages/Admin.tsx:878 is `const isAdmin = !!user && (user.role === "admin" || user.role === "founder")`, and :918 renders a full-screen 'Not an admin' refusal for every other signed-in account. The gate admits admins and founders only; opening it is an inve
24. **`proposal_drafts` is the correct home for the tray: 'already private to its author, already capped per member, already deleted on publish'. ** — The cap and the size limit are shared with the five existing wizard types and were sized for deliberate, member-initiated drafts. `DRAFT_CAP = 5` (server/lib/proposalDrafts.ts:212) and `draftsOf` counts EVERY wizard type; `saveDraft` refuses only when creating a new row (:353). So a member holding f
25. **'On any failure: rollback. The caches were never touched, so there is nothing to undo. Rollback being free is the whole trick.' Status goes ** — Rollback is free for the caches and expensive for the queue, because the batch executor's most likely caller is a `for` loop inside one try/catch. The cycle-close sweep (server/index.ts:24403-24426) selects every `passed_verified`/`passed_onsite` proposal and applies them one by one inside a single 
26. **'`SELECT ... FOR UPDATE` the rows it will write' is the concurrency answer alongside drift-fails-whole.** — For dials there is usually no row to lock. `game_variables` stores DELTAS ONLY: `setVariable` DELETEs the row when a value returns to its default (server/lib/variables.ts:104-108), and the module header says so explicitly ('Only values a founder has actually CHANGED are stored'). A `FOR UPDATE` agai
27. **Ana stages, sends, 'it becomes one proposal... it opens one ballot with one price'.** — Not in a Hypha village, and the tray never says so. `governance.default_method` offers 'hypha' (shared/gameVariables.ts:552), and the on-site open-ballot route refuses outright: `if (conducts === 'hypha') return res.status(409).json({error: 'This village decides mechanics on Hypha. Use Take to Hypha
28. **Lane F: the grouped document is 'the part a neighbour actually reads. Do not let it be the part that gets cut.'** — The neighbour does not read it as a document. `Decision.tsx:571-575` renders `ballot.docMarkdown` inside `<pre className="...whitespace-pre-wrap...">{ballot.docMarkdown}</pre>`, behind a 'Read the document' toggle, and that `<pre>` is the ONLY place the change set appears on the page where the vote 
29. **The design lists the standing rulings it collides with (R91, R90, R68, R74, R81/R84, R54) and reconciles each.** — It never mentions R86, which shipped this month and is the ruling most directly about doing what a batch does. `server/lib/dryRun.ts:1-12` is THE TEST RUN: 'watch a whole cycle turn before you bet a village on it', positioned by the founder as 'the second to last button' before the launch ballot, 't
30. **The tray is safe because `proposal_drafts` is private to its author; a stale batch is recovered by the proposer's Restage button.** — Neither survives the member leaving, and the question was never asked. `anonymizeMember` (server/index.ts:4294-4410) deletes or scrubs every store of a member's own free text BY NAME — `concierge_queries.query`, `contact_requests.message`, notification bodies, intents, skill_tags, push subscriptions
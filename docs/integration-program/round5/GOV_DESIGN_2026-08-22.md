# GOV-DESIGN: The On-Site Governance Engine (v1.0)

Design document only. Build lanes follow this; no code ships from this lane.

**The ruling (R44/R45):** "ship a v1.0 where you can play the whole game (vote on roles, etc) within the Game directly and then we only use Hypha for audits." Ten improvements approved; #3 amended to three weight modes (1-person-1-vote, 1-token-1-vote, or custom admin-set weights). The founder owns Hypha; transplanting from dho-web-client is cleared by ownership on top of Apache 2.0.

**The smallest engine that makes the sentence true:** a member can apply, a village can vote, an agreement can be signed, all on-site, with Hypha receiving a quarterly snapshot.

**Grounding read for this design** (all at origin/main, `58e8f03`):
`shared/capabilities.ts` (the one gate), `shared/power.ts` (DECIDES_BY display enums), `shared/gameVariables.ts` (rings, `governance.*` keys), `shared/constitution.ts` (Ring 0), `shared/lunar.ts` (the one lunar clock), `server/index.ts` mechanics block (~19399-20018: statuses `draft → open → to_hypha → passed_claimed → passed_verified → applied|failed|withdrawn`, `applyMechanicsProposal` = THE ONE APPLY, the hub webhook), `server/lib/mechanics.ts` (backers, validateChangeSet), `server/lib/orgChart.ts` (seats, assignments, `represents_circle`, recruitment pack incl. `compensation_reality`), `server/lib/badges.ts` (five kinds, denies, the recognition firewall), `server/lib/villageExport.ts` (`buildOrgExport`), the raise-hand inbox route (`server/index.ts:8490`), and the human-act cycle close (~18952).

---

## 0. The comparative sweep (improvement 10, bounded)

Three sources checked; only patterns that beat what Hypha 2.0 offers at village scale are harvested. Everything else in this design transplants from the Hypha harvest (`HYPHA2_HARVEST_2026-08-21.md`, cited by section below).

1. **Objection vs concern, as data (Sociocracy 3.0).** S3.0's consent process distinguishes an *objection* ("reveals consequences or risks that are preferably avoided") from a *concern* ("an assumption that cannot... be backed up by reasoning or enough evidence to qualify as an objection"). Only objections block; concerns are *recorded alongside evaluation criteria* and ride into the review of the resulting agreement. Hypha 2.0 has no consent mode at all - its only engine is unity/quorum voting. This distinction is the backbone of our consent mode (§2.4) and of agreement `review_at` dates (§3). Source: [S3.0 Consent Decision-Making](https://patterns.sociocracy30.org/consent-decision-making.html).
2. **The stated outcome (Loomio).** Every Loomio decision closes with a facilitator-published *outcome*: a human sentence recording what was decided and what happens next, attached permanently to the decision record. Votes stay changeable while open. Hypha closes with numbers only. We adopt `outcome_note` as a required field of closing any ballot (§2.5). Loomio's four proposal frames (sense check / advice / consent / consensus) also independently validate our staging-as-sensing phase and decidesBy presets. Sources: [Loomio proposals](https://www.loomio.com/docs/en/user_manual/polls/proposals), [Loomio poll templates](https://help.loomio.com/en/user_manual/polls/poll_templates/index.html).
3. **Answer-with-explanation and author-gated amendments (Decidim).** Decidim's proposals carry admin *answers* in explicit states (accepted / rejected / evaluating) with mandatory explanations, per-participant proposal limits, thresshold-based support ("Threshold per proposal"), and an amendments feature where every change is approved by the original author with a "See other versions" history. We adopt the versioned-supersession model for agreements (§3) and the explained-answer posture for admin-mode role applications (§5). Sources: [Decidim proposals component](https://docs.decidim.org/en/develop/admin/components/proposals.html), [Decidim amendments](https://docs.decidim.org/en/develop/admin/components/proposals/special_configurations/amendments.html).

Not harvested: Decidim participatory texts and geocoding (city-scale machinery), Loomio time-polls (calendar module owns scheduling), S3.0 driver mapping (process facilitation, not software).

---

## 1. Data model

All migration files are `drizzle/NNNN_*.sql` placeholders. **The build lane claims real numbers via the coordinator's four-way scan; this document never names one.** House rules apply: dedupe/unique columns NOT NULL (MySQL unique indexes exempt NULLs), no FK constraints (house norm), `--` comments on their own lines never ending in `;`, no edits to shipped migrations.

### 1.1 New tables

**`ballots`** - one row per conducted decision. The snapshot columns are the whole point: thresholds, electorate and weights freeze at open, so changing village settings never rewrites a live or historical vote (Hypha harvest §3, `pastQuorum`/`pastUnity`/`ballotSupply`).

| column | type | notes |
|---|---|---|
| id | varchar(40) PK | `bal-<ts>-<rand>`, house id idiom |
| subject_type | varchar(24) NOT NULL | `mechanics` \| `role_application` \| `agreement` \| `badge_grant` \| `quest_payout` |
| subject_ref | varchar(64) NOT NULL | id in the subject's own table |
| open_key | varchar(120) NOT NULL UNIQUE | `${subject_type}:${subject_ref}` while open; rewritten to `...:${id}` at close. Enforces "at most one open ballot per subject" without a partial index |
| circle_id | varchar(64) NULL | null = village-wide electorate; set = circle-scoped (§2.2) |
| title | varchar(200) NOT NULL | |
| doc_markdown | mediumtext NOT NULL | the canonical document snapshot at open - what is voted on is what was checked (mechanics already has this idiom) |
| method | varchar(16) NOT NULL | `majority` \| `custom` \| `consensus` \| `consent` |
| weight_mode | varchar(12) NOT NULL | snapshot: `equal` \| `token` \| `custom` |
| weight_token | varchar(64) NULL | snapshot of the token slug when mode = token |
| unity_pct | decimal(5,2) NOT NULL | snapshot (see presets §2.3) |
| quorum_pct | decimal(5,2) NOT NULL | snapshot |
| total_weight | decimal(18,4) NOT NULL | SUM of electorate weights at open |
| electorate_count | int NOT NULL | |
| opened_by | varchar(64) NOT NULL | |
| opens_at / closes_at | datetime NOT NULL | closes_at = opens_at + vote days (consent: + window days) |
| status | varchar(16) NOT NULL | `open` \| `passed` \| `failed` \| `no_quorum` \| `withdrawn` |
| outcome_note | text NULL | required by the close route on every close (Loomio stated outcome) |
| closed_by | varchar(64) NULL, closed_at datetime NULL | closing is a human act (§2.5) |
| created_at | datetime NOT NULL default NOW | |

**`ballot_electorate`** - the frozen who-and-how-much. PK `(ballot_id, user_id)`; `weight decimal(18,4) NOT NULL`. Written in one transaction with the ballot row. Votes join here for weight; weight is stored in exactly one place.

**`ballot_votes`** - PK `(ballot_id, user_id)`; `choice varchar(12) NOT NULL` (`yes` | `no` | `abstain`), `reason text NULL` (app-required for `no` in consent mode), `cast_at`, `updated_at`. Re-vote = upsert, allowed until close (harvest §2: "You can change your vote until the voting period closes").

**`ballot_objections`** (consent mode) - `id` PK, `ballot_id`, `user_id`, `text NOT NULL`, `status varchar(12) NOT NULL` (`open` | `integrated` | `concern` | `withdrawn`), `ruled_by NULL`, `ruled_at NULL`, `ruling_note NULL`, `created_at`. The S3.0 objection/concern split as rows.

**`governance_weights`** (custom mode current state) - `user_id` PK, `weight decimal(18,4) NOT NULL`, `updated_at`.
**`governance_weight_changes`** (the audit trail, mirrors `mechanics_changes`) - `id` auto PK, `user_id`, `old_weight NULL`, `new_weight NOT NULL`, `actor_user_id NOT NULL`, `note varchar(500) NOT NULL` (a weight change without a reason is refused), `at datetime NOT NULL`. Append-only; never deleted.

**`agreements`** - `id` (`agr-...`) PK, `title varchar(200)`, `body mediumtext NOT NULL`, `domain varchar(16) NULL` (`money`|`people`|`space_land`|`rules`, from `shared/power.ts` DOMAINS), `circle_id NULL`, `status varchar(12) NOT NULL` (`draft`|`proposed`|`active`|`superseded`|`retired`), `version int NOT NULL default 1`, `supersedes_id varchar(40) NULL`, `review_at date NULL` (S3.0: good enough for now, safe enough to try *until review*), `ballot_id NULL` (the adopting ballot), `created_by`, `created_at`, `activated_at NULL`, `retired_at NULL`, `retired_reason NULL`. Each version is a full-body row chained by `supersedes_id` (Decidim "see other versions"; no diff storage).

**`agreement_signatures`** - PK `(agreement_id, user_id)`; `sig_role varchar(12) NOT NULL` (`party` | `witness`), `signed_at NOT NULL`. Who signs: §3.

**`vouches`** - PK `(applicant_user_id, voucher_user_id)`; `note varchar(500) NULL`, `created_at NOT NULL`. Built ourselves; proven absent from dho-web-client (harvest §6). Self-vouch refused; example users refused (the `isExampleUser` guard idiom).

**`role_applications`** - `id` PK, `org_role_id NOT NULL`, `user_id NOT NULL`, `season_id NULL`, `deliverables text NOT NULL` (deliverables-for-season), `fit_statement text NOT NULL`, `commitment_pct tinyint NOT NULL` (0-100), `deferred_pct tinyint NOT NULL` (0-100), `token_slug varchar(64) NULL`, `token_per_cycle decimal(18,4) NULL`, `cash_note varchar(500) NULL` (recorded expectation, settled off-platform - fiat never flows out), `voice_per_cycle decimal(18,4) NOT NULL` (computed on the FULL amount, stored), `status varchar(12) NOT NULL` (`draft`|`submitted`|`ballot`|`accepted`|`declined`|`withdrawn`), `ballot_id NULL`, `decided_by NULL`, `decided_note NULL` (Decidim answer-with-explanation for admin mode), `decided_at NULL`, `created_at`, `updated_at`.

**`assignment_claims`** - `id` auto PK, `org_assignment_id varchar NOT NULL`, `cycle_number int NOT NULL`, `quarter tinyint NOT NULL` (0-3), `token_transfer_ref varchar(64) NULL`, `voice_accrual_ref varchar(64) NULL`, `claimed_at NOT NULL`, UNIQUE `(org_assignment_id, cycle_number, quarter)` - all three NOT NULL so the unique index actually bites.

**`governance_supports`** - the staging/sensing machinery generalized for the new subject types. PK `(subject_type, subject_ref, user_id)`; `kind varchar(12) NOT NULL` (`support` | `sponsor`), `created_at`. `INSERT IGNORE` idempotent, exactly like `mechanics_proposal_backers`, which stays untouched for mechanics (consolidation is a later cleanup, never a v1 migration).

**`proposal_drafts`** - server-side wizard drafts (the harvest's one flagged upgrade over Hypha's localStorage, §1): `id` PK, `user_id NOT NULL`, `wizard_type varchar(24) NOT NULL`, `payload json NOT NULL`, `step_index int NOT NULL`, `created_at`, `updated_at`. Note: `server/lib/drafts.ts` already exists for another feature; the new lib is `proposalDrafts.ts`.

**`attestation_exports`** - `id` PK, `period_label varchar(20) NOT NULL` (e.g. `2026-Q3`), `payload mediumtext NOT NULL` (canonical JSON), `sha256 char(64) NOT NULL`, `created_by`, `created_at`, `submitted_at NULL`, `submitted_ref varchar(500) NULL`.

### 1.2 Existing tables gaining columns

- **`mechanics_proposals`**: `ballot_id varchar(40) NULL`. Status vocabulary gains two values (no column change; it is a varchar): `onsite_vote` and `passed_onsite` (§2.6).
- **`org_roles`**: `application_mode varchar(12) NULL` (`admin` | `ballot`; null = derived: `how_chosen = 'elected_by_circle'` → ballot, else admin).
- **`org_role_assignments`**: `application_id varchar(40) NULL`, `commitment_pct tinyint NULL`, `deferred_pct tinyint NULL`, `pay json NULL` (`{tokenSlug, tokenPerCycle, voicePerCycle}` snapshot at activation). UNIQUE on `application_id` is not possible with NULLs admitting duplicates; instead the executor guards with `WHERE NOT EXISTS` on application_id (§2.7).
- **`badge_awards`**: `ballot_id varchar(40) NULL` (a governed grant carries its vote).
- **exit / `agreement_ref`**: no schema change. New references are written as `agr:<id>`; legacy free text stays valid (§3.4).

---

## 2. The decision engine

### 2.1 Opening a ballot (from staging)

Staging IS the existing sensing phase (harvest §10: Hypha's `drafted` state with comments maps exactly onto our support-threshold sensing). A subject sits in its own table's `open`/`submitted` state gathering `governance_supports` (or `mechanics_proposal_backers` for mechanics). When supports ≥ `governance.proposal_support_threshold` (existing variable, description recopied for the on-site vote - see copy-trap note in §8), the proposer or a `proposal.open` holder calls the open route. `openBallot(subject)` in one transaction:

1. Resolves the method: the circle's `decides_by` for circle-scoped subjects, else the village-level default per subject type (§2.3). `hypha` as decidesBy routes to the existing `to_hypha` leg unchanged.
2. Resolves the snapshot dials: unity/quorum/duration from variables, weight mode + token from variables.
3. Builds the electorate: every member for whom `hasCapability("ballot.vote", ctx)` is true (new capability, stage-unlocked at `member`; a warning badge's deny suspends voting through the one gate, Gate E intact), excluding example users. Circle-scoped ballots restrict to live, non-example holders of seats in that circle (well-defined via `org_role_assignments`). Weight per §2.2. Inserts `ballots` + all `ballot_electorate` rows.
4. Snapshots `doc_markdown` via the subject's canonical-document renderer (the mechanics `proposalMarkdown` idiom, one renderer per type).
5. Flips the subject's status (`mechanics_proposals` → `onsite_vote`; `role_applications` → `ballot`; etc.).

Fail-closed rule: an electorate of zero members or zero total weight refuses to open, with the sentence saying why. `open_key` uniqueness makes double-open a no-op race-free.

### 2.2 The three weight modes (improvement 3, as amended)

Configured by two new variables (ring placement in §7):

- **`equal`** (default): every electorate member weighs 1. One person, one vote.
- **`token`**: weight = the member's balance of the token named by `governance.weight_token` at ballot open, read through the ledger's recomputed `token_balances` (never incremented, per house invariant). Only platform-governed tokens are choosable; hypha-governed mirrors are refused (they are display-only facts about Base). Default choice: the recognition token - consistent with the shipped posture where `governance.hypha_threshold` already gates proposer standing on `recognitionBalance`, and safe against purchase because recognition is constitutionally unbuyable. The badge-engine recognition firewall is untouched: voting weight is not a capability grant.
- **`custom`**: weight = the member's `governance_weights` row. Absent row = 0, fail closed. **The allocation surface** (Admin → Governance → Voting weights): a member table with editable weight, bulk-set, and a required note per change; every save appends to `governance_weight_changes`; the page shows "N members hold no weight" as a standing warning so a half-allocated village is visible before it fails a quorum. **The audit trail is public to members**: any member can see current allocations and their history (weights are power; hidden power is the thing this whole design exists to end). Changing an allocation never touches an open ballot - the electorate snapshot already holds.

Per-ballot the mode is a snapshot column, so a founder changing modes mid-vote changes nothing in flight.

### 2.3 Evaluation: unity + quorum with per-ballot snapshot (improvement 2)

The math is Hypha's exactly (harvest §3, worth copying verbatim):

```
unity  = (pass + fail > 0) ? passW / (passW + failW) : 0      // abstain EXCLUDED from unity
quorum = totalWeight > 0 ? (passW + failW + abstainW) / totalWeight : 0   // abstain COUNTS toward quorum
passed = quorum >= quorum_pct && unity >= unity_pct
```

Abstain is a genuine "help it reach quorum without taking sides" instrument. All weights read from `ballot_electorate`. Evaluated only against the ballot's own snapshot columns, never live settings.

**decidesBy presets** (the `DECIDES_BY` enums in `shared/power.ts` stop being display-only where a ballot can conduct them):

| decidesBy | method | unity | quorum | notes |
|---|---|---|---|---|
| majority | `majority` | fixed > 50% | `governance.quorum_pct` | "More than half carries it," literally |
| consensus | `consensus` | fixed 100% of votes cast | `governance.quorum_pct` | everyone who votes agrees |
| consent | `consent` | n/a (§2.4) | participation ≥ `governance.quorum_pct` | objection-driven |
| (village default) | `custom` | `governance.unity_pct` (default 80) | `governance.quorum_pct` (default 20) | the Hypha 80/20 surface |
| hypha | - | - | - | existing `to_hypha` leg, unchanged |
| lead/elders/founder_decides, do_ocracy | - | - | - | no ballot; the named decider records the outcome (an agreement or admin act). Stay display + record in v1 |
| delegated | - | - | - | NOT in v1 (§9) |

### 2.4 Consent mode and the objection window

Adapted from S3.0 (sweep item 1). A consent ballot opens for `governance.consent_window_days`. A `yes` vote means "no objection"; a `no` vote requires a reason and auto-files a `ballot_objections` row. Any electorate member may also file an objection without voting no.

**The test step** (S3.0 step 6, "test arguments as objections"): the facilitator - circle lead for circle-scoped ballots, else any `proposal.decide` holder or admin - rules each open objection:
- **`integrated`**: the objection stands and the proposal must change. The ballot closes as `failed` with an `outcome_note` naming the objection; the subject returns to staging for amendment and a fresh ballot (a new ballot row - snapshots are immutable).
- **`concern`**: recorded, does not block; when the subject is an agreement, concerns are appended to the agreement record and surface at its `review_at` (S3.0: "record remaining concerns alongside evaluation criteria").
- **`withdrawn`**: the objector retracts.

A consent ballot passes when the window has closed, participation meets quorum, and zero objections remain `open`. Every ruling writes `ruled_by`, `ruled_at`, `ruling_note`: the judgment is on the record, which is what keeps a facilitator honest.

### 2.5 Closing: a human act

Nothing auto-executes at expiry (harvest §3: "closing is an explicit act", and the house constitution: value is released by human consent, never a timer). After `closes_at`, votes lock (upserts refused) and the ballot shows "awaiting close." The proposer, a `proposal.decide` holder, or an admin closes it with a required `outcome_note` (Loomio's stated outcome). Close is one guarded transition:

```sql
UPDATE ballots SET status=?, outcome_note=?, closed_by=?, closed_at=NOW(), open_key=CONCAT(open_key, ':', id)
 WHERE id=? AND status='open'
```

Zero rows affected = someone else closed it; return the current state, execute nothing. The scheduler may notify "a ballot awaits closing" (registerJob); it never closes one.

### 2.6 Outcome routing: `passed_onsite` as the sibling of `passed_verified`

The mechanics tail is the model for every subject type. On a passed mechanics ballot, the close handler sets `mechanics_proposals.status = 'passed_onsite'` and then walks the **exact tail the webhook walks today** (`server/index.ts` ~19975-19992): honor `governance.auto_apply_enabled` (the founder's brake), hold whole sets containing any cycle-timed dial for the next cycle close, else call `applyMechanicsProposal(p, closer)` - THE ONE APPLY, unchanged, already idempotent, already revalidating against the current registry. The cycle-close job that today sweeps `passed_verified` sweeps `status IN ('passed_verified','passed_onsite')`. `mechanics_changes.proposal_ref` carries `gm:<id> bal:<ballotId>` so every amendment row points at its vote. The Hypha webhook, `to_hypha`, `link-hypha`, and manual verify paths ship untouched: a village whose decidesBy is `hypha` keeps the current loop, and that is the whole degradation story.

Other executors, all running inside the close transition:
- **role_application passed** → create the `org_role_assignments` row (start = next lunar quarter boundary, §5), copy commitment/deferred/pay, set application `accepted`.
- **agreement passed** → agreement `active`, `activated_at`, prior version `superseded` (§3).
- **badge_grant passed** → `badge_awards` insert carrying `ballot_id`, through the existing badges award path so kind rules and the recognition firewall still validate (§7 of the harvest: capability grants as governed, expiring objects).
- **quest_payout passed** → the existing consent/settlement machinery executes the payout, referencing the ballot; the ballot substitutes for steward consent only where the village turned that on (§9 keeps this narrow).
- **failed / no_quorum** → subject returns to `declined`/`failed` state with the outcome note; the proposer is notified (dedupe-keyed, house notify idiom).

### 2.7 Idempotency, the whole list

- One open ballot per subject: `open_key` UNIQUE NOT NULL.
- Vote: PK upsert.
- Support/sponsor/vouch: `INSERT IGNORE` on NOT NULL PKs.
- Close: guarded UPDATE, zero-rows = no-op.
- Apply (mechanics): `applyMechanicsProposal` already returns cleanly on `applied`.
- Assignment creation: `INSERT ... SELECT ... WHERE NOT EXISTS (SELECT 1 FROM org_role_assignments WHERE application_id = ?)`.
- Badge grant: dedupe on `(badge_id, user_id, ballot_id)` in the award path.
- Claims: UNIQUE `(assignment, cycle, quarter)`; a retried claim is a no-op.
- Notifications: `dedupe_key` per (event, recipient), the existing spine.

---

## 3. Agreements as a first-class object (the second missing object)

Today an agreement is a 255-char string pointer (`exit.agreement_ref`) plus a Hypha deep link (Round 5 §6.2). v1 makes it a table.

**Lifecycle:** `draft` (author writes; server-side drafts) → `proposed` (enters staging/sensing; supports gather) → ballot (default method: the circle's decidesBy for its domain override if set, else `consent` - rules are where consent earns its keep) → `active` (with optional `review_at`; recorded concerns from the consent window attach here) → `superseded` (a passed amendment activates a new version row pointing back via `supersedes_id`) or `retired` (a passed retirement ballot, or admin with note while the module is finding its feet).

**Amendment** is a new agreement row (version N+1, full body, Decidim-style history) going through the same staging → ballot loop. The chain renders as version history with each version's ballot and outcome (harvest §10, version-history pattern).

**Who may sign:** signatures are for agreements that bind named parties (an exit agreement, a role covenant, a land-use arrangement). Parties are named on the draft; each signs for themself (`sig_role='party'`). Any member may co-sign as `witness`. Signing is append-only and dated. Village-wide rules adopted by ballot need no signatures: the ballot is the village's signature, and the UI says so.

**Where they surface:** an Agreements page (list + detail + history), and the power map's **rules domain**: a circle whose `rules` domain chip is tapped shows its active agreements - the legend stops being vocabulary and starts pointing at the actual rules. Active village-wide agreements also render on the Game Mechanics page under the constitution, clearly marked as the village's own layer (Ring 0 is the platform's; agreements are the village's).

**`exit.agreement_ref` migration path:** the exit flow gains a picker over active agreements and writes `agr:<id>` into the existing varchar. Legacy free-text refs stay untouched and render as text; `agr:` refs render as links. No backfill migration; an admin tool can relink old exits one at a time if the village cares.

---

## 4. The wizard (improvement 4)

Port the harvest's crown jewel: the declarative step config (`src/pages/proposals/create/config.js`) and the skip-walking step engine (`nextStep()` in `ProposalCreate.vue`), re-expressed as a TS config + React components (harvest §1, verdict COPY). One generic step component set; per-type `fields` maps decide what renders; per-type `steps: {x: {skip:true}}` prune the walk. Right-rail stepper with click-back on desktop, single step + dots on mobile. Type cards grouped with `button-radio`-style icon+title+description cards.

**Amora's proposal types:**

| type | group | steps | staging threshold | ballot method default | lifecycle on pass |
|---|---|---|---|---|---|
| Role application | Recurring | seat picker → deliverables-for-season → pay sliders → fit statement → review | per §5: admin mode skips staging | seat's circle decidesBy, else village default | assignment created (§2.6) |
| Mechanics change | Rules | dial picker (existing validateChangeSet) → rationale → review | `governance.proposal_support_threshold` | village default (`custom` 80/20) | `passed_onsite` → THE ONE APPLY |
| Agreement | Rules | title/body → domain + circle → parties + review date → review | same threshold | consent | active version (§3) |
| Badge grant | People | badge picker (active, non-example) → grantee → duration/season scope → review | same threshold | village default | governed award (§2.6) |
| Quest payout | One-time | quest picker → amount (bounded by quest machinery) → review | same threshold | village default | payout via existing settlement |

Budget proposals are an **agreement with `domain='money'`** in v1: no separate executor, no fifth engine (§9).

**Drafts are server-side** (`proposal_drafts`): save-and-leave modal on route exit (the harvest's two-button "Leave without saving / Save draft and leave"), drafts card at the top of the type step ("Complete your draft"), continue reopens at `step_index`. Drafts are private to their author, capped per member (reuse the proposals-per-cycle ceiling), and deleted on publish.

**Staging-as-sensing** reuses the existing machinery wholesale: supports, sponsorship of below-the-bar drafts by qualified members (the on-ramp already shipped for mechanics generalizes via `governance_supports.kind='sponsor'`), the activity feed line, and the same proposer standing check (`mechanicsStandingFor` pattern: the one gate + earned-recognition threshold).

---

## 5. Role applications (the founder's ask 3)

The raise-hand inbox (`server/index.ts:8490`) becomes the entry to a real loop; the inbox stays as the admin-mode backend so nothing shipped breaks.

**The flow** (harvest §8, verdict COPY the shape; §4 pay model, verdict ADAPT):

1. A seat card's "Raise your hand" opens the wizard's role-application type, seat prefilled. Vacancy stays derived; recruiting seats surface first.
2. **Deliverables for the season**: what the applicant will have done by season's end, in their words, against the seat's recruitment pack (`first_90_day_outcomes`, `evidence_required` finally earn their keep as the prompts).
3. **Pay sliders**: `commitment %` (0-100, partial roles are first-class; validated against a seat minimum if the pack names one), `deferred %` (0-100), pay per cycle in a village token (`token_slug` + `token_per_cycle`), optional `cash_note` (a recorded expectation settled off-platform: **fiat never flows out of the platform**, Ring 0). The adapted split:
   - token per cycle paid = `token_per_cycle × commitment% × (1 − deferred%)`
   - deferred lane = `token_per_cycle × commitment% × deferred%`, recorded on the assignment as a deferred balance the village owes (a ledger fact, not a promise)
   - **voice per cycle = full equivalent × commitment%, deferral ignored - always** (harvest §4: pay structure changes your cash, never your governance weight). Voice accrues through the existing voice-accrual machinery (`voice_claims`), which today carries to Hypha and, when `weight_mode='token'`, is reflected in the weight token the founder points at.
4. **Fit statement**: why them, shown to whoever decides.
5. **Decision, per seat** (`org_roles.application_mode`): **admin** - the application lands in the stewards' review surface; accept/decline requires a `decided_note` (Decidim answer-with-explanation); accept creates the assignment. **ballot** - the application enters staging, then a ballot scoped to the seat's circle (or village-wide for uncircled seats). Default derived from `how_chosen`: `elected_by_circle` → ballot.
6. **Activation** starts at the next lunar quarter boundary; the assignment row snapshots commitment/deferred/pay.

**Lunar claim periods** (improvement 6; harvest §5, verdict COPY 1:1 - their periods are literally lunar quarters): a cycle from `shared/lunar.ts` splits into four quarters. v1 computes quarter boundaries as the cycle span divided by four (deterministic interpolation between true new moons; the table holds new and full moons only, and claim gating tolerates hours of drift where settlement would not - extending `gen-lunar-table.mjs` with true quarter instants is a later nicety). Claimable = quarter ended and no `assignment_claims` row. UI: the moon-phase period strip with Claimed / To claim / Ongoing chips and a Claim-all button with a count badge. `POST /api/roles/assignments/:id/claim` pays every elapsed unclaimed quarter: token lane via `postTransferPair` from `sys:treasury` (never faucet-to-member, which taints the token; an underfunded treasury fails the claim loudly and tells the stewards to stock it), voice lane via the accrual machinery on the full amount. Ledger refs land on the claim row.

**Accountability**, transplanted: the holder may ratchet **commitment down freely** between claims (last adjustment in a quarter wins), raising it back above the decided level takes a new ballot (harvest §8's ratchet-down-freely, vote-to-raise). Any member may propose **suspension** of a live assignment (a ballot on the assignment, framed in the UI as creating a proposal, never as an act); the holder may **withdraw**. Extension near term end = a mini-application carrying only the new duration, through the same decision mode.

---

## 6. The attestation export (improvement 9: Hypha demoted to audits)

Quarterly, a signed snapshot of everything governed on-site, built on the `villageExport` bones (`buildOrgExport`, PR #33) and stored in `attestation_exports`.

**Shape** (canonical JSON, keys sorted, so the hash is stable):

```
{ instance: {platformVersion, instanceIdentity},        // server/lib/identity.ts
  period: {label: "2026-Q3", from, to},
  ballots: [ every ballot closed in period: id, subject, method, weight_mode,
             snapshot dials, total_weight, tallies {yesW,noW,abstainW},
             unity, quorum, status, outcome_note, closed_by(first name), closed_at ],
  agreements: [ versions activated/superseded/retired in period + all active at period end ],
  weights: {mode, token, allocations: [{member(first name), weight}], changes_in_period: count},
  org: buildOrgExport(...),                              // the existing public shape, privacy line intact
  mechanics: [ governance-sourced mechanics_changes rows in period ],
  membership: {vouch_threshold, admitted_in_period: count},
  hash: sha256(all of the above) }
```

Privacy holds the platform's public-surface line: first names only, no emails, no per-member recognition figures beyond weights the village already publishes to itself.

**Flow:** Admin → Governance → Attestation: "Generate 2026-Q3" builds, hashes, stores (regeneration of the same period must be byte-identical; a difference means the record moved and fails loudly). **Deep-link submit** reuses the existing handoff idiom (`/handoff` route pattern + `resolveHyphaLinks`): a prefilled create-proposal URL for the village's Hypha space with the hash and period in the title, plus the JSON payload on the clipboard as fallback - and **any registrar**: the deep-link target is config, Hypha is merely the default, a village can point it at any URL or just download the file. On submit the admin pastes the resulting reference into `submitted_ref`. No webhook, no listener, no synchronous dependency: the export is a document a human carries, exactly the posture that made Hypha "nearly free to hide."

---

## 7. Constitutional placement

**Ring 0 (constitution) - additions and one amendment:**
- Amend law 5 ("What Hypha governs, this game only displays"): its scope narrows to *hypha-governed tokens*. The sentence "Formal decisions bind on Hypha. The game is where the village senses and prepares" is no longer true after v1 and must be rewritten in the same plain register. This is a founder-ruling change to Ring 0 copy; the build lane ships it with the engine, and R44 is the ruling that authorizes it.
- New law: **"A vote is counted against the day it opened."** Thresholds, electorate and weights freeze when a ballot opens; no later change to any setting or balance rewrites a vote, open or closed. Enforced by: the ballot snapshot columns + `ballots.test.ts`.
- New law: **"Voting weight is on the record."** Whatever weight mode the village runs, every member can see how weight is assigned and every change to an assigned weight is a permanent, attributed record. Enforced by: `governance_weight_changes`, append-only.
- The existing "Every change to the rules is on the record" already covers ballot refs on amendments; no change.

**Ring 1 (founder-held variables):** `governance.weight_mode` (equal | token | custom - constitutional-ish, exactly as the task flags; a founder decision, not a dial a majority flips mid-game to entrench itself), `governance.weight_token`, `governance.auto_apply_enabled` (exists), `governance.hub_url` (exists). Per-circle weight-mode override: **not in v1**; the snapshot columns make adding it later non-breaking.

**Ring 2 (open, community-governable, bounded):** `governance.unity_pct` (50-100, default 80), `governance.quorum_pct` (1-100, default 20), `governance.vote_days` (1-30, default 7), `governance.consent_window_days` (1-30, default 7), `governance.default_method` (choice; default `custom`), `membership.vouch_threshold` (0-20, default 0 = vouching off; improvement 7 as an *optional* gate), plus the existing `governance.proposal_support_threshold`, `sensing_days`, `proposals_per_member_per_cycle`, `change_cooldown_days`, `hypha_threshold` (label copy updates to say "proposer bar", keeping the key: keys are forever). All governance dials that a passed proposal could move mid-vote are protected by the snapshot rule rather than cycle timing.

**Module gating:** a new non-core module `governance` (ships OFF, absent row = off, house rule). `requireModule("governance")` mounts ballots, agreements, vouches, role-application and claim routes. The mechanics on-site vote leg activates only when the module is on; when off, the shipped Hypha/manual-verify loop is the behavior, unchanged - that is the fork-safe default. `badge_grant` type requires the badges module (hidden otherwise, the dependency-demotion idiom). Amora turns `governance` on at launch; hundreds of forks inherit it dark.

**Capability additions** (`shared/capabilities.ts`, keys added to both the union and `ALL_CAPABILITIES` in lockstep):
- `ballot.vote` - stage-unlocked at `member`; the electorate builder reads it through the one gate, so warning-badge denies suspend voting (Gate E order preserved).
- `member.vouch` - stage-unlocked at `contributor` (vouching is vouching *from standing*); grantable by role/badge as ever.
- Reused, finally earning their comments: `proposal.open` (open a governance decision - now literal: take a staged subject to ballot), `proposal.decide` (close a ballot, rule objections). Their stage rungs stay as shipped (`proposal.open` at `co-creator`).
- `agreement.sign` is NOT a capability: parties sign as named parties, witnesses sign as members. No new gate, no side door.

---

## 8. Build-lane split (3-5 lanes, disjoint file zones, ordered)

Shared rules for every lane: the five gates (`pnpm check`, `pnpm build` with marker check, `pnpm test` with loop-test rules, brand ratchet, voice gate on all shipped copy - new copy born clean, no em-dashes, no contrast framing); grep test files case-sensitively before touching ANY existing phrase (the `governance.*` variable descriptions and mechanics UI strings are asserted in tests); migration numbers claimed only through the coordinator's four-way scan; commit with explicit paths; no merges to main; `docs/prototypes/grounds-v0.html` untouched.

**Lane G1 - the engine** (first; everything depends on it)
- Zone: `server/lib/ballots.ts` (new), `server/lib/governanceWeights.ts` (new), `shared/governanceEngine.ts` (new: pure unity/quorum math + presets, unit-testable client and server like `shared/power.ts`), `drizzle/NNNN` (ballots, electorate, votes, objections, weights + changes, supports), `shared/capabilities.ts` + `shared/gameVariables.ts` additions, `shared/constitution.ts` amendment, the mechanics block in `server/index.ts` (open/close routes + `passed_onsite` tail), `shared/modules.ts` (governance module), tests: `server/lib/ballots.test.ts`, loop e2e extension.
- Harm removed, measured: a village can declare majority and the platform cannot conduct it. Metric: e2e proves stage → support → open → 3 members vote → human close → `applyMechanicsProposal` ran, with zero manual SQL; and the snapshot test: change `governance.unity_pct` and a member's weight mid-ballot, close, outcome identical to the frozen snapshot.
- Transplants: harvest §3 math verbatim; §2 state semantics (changeable votes, explicit close); §10 config-gated features.

**Lane G2 - wizard + vote UI** (after G1)
- Zone: `client/src/pages/` governance pages, `client/src/components/governance/**` (new directory, exclusively this lane's), `server/lib/proposalDrafts.ts` (new) + its route block, `drizzle/NNNN` (proposal_drafts).
- Harm removed: proposals are authored in a freeform box and votes have no honest surface. Metric: all five wizard types complete end-to-end; a draft survives browser death (created in one session, continued from the DB in another); the two-bar widget shows value% and needed% with the green/red/grey logic (improvement 1).
- Transplants: harvest §1 (config.js as TS config, step-skip walk, creation-stepper, draft cards, button-radio), §2 (voting widget family, dual bars, yes/abstain/no, countdown, voter list).

**Lane G3 - agreements** (parallel with G4 after G2)
- Zone: `server/lib/agreements.ts` (new) + route block, `drizzle/NNNN` (agreements, signatures), agreements client page, the power-map rules-domain surfacing (coordinate: the map is shared live by other lanes per program memory - hunk-level staging, no wholesale artifact writes).
- Harm removed: the village's rules live in a 255-char pointer. Metric: create → consent ballot with one integrated objection → amend → active v2 superseding v1, full history rendered; an exit references `agr:<id>` and renders the link.
- Transplants: harvest §10 version-history; Decidim supersession model (§0 sweep).

**Lane G4 - the role loop** (parallel with G3)
- Zone: `server/lib/roleApplications.ts` (new), `server/lib/assignmentClaims.ts` (new), `server/lib/orgChart.ts` column additions, `drizzle/NNNN` (applications, claims, org column adds), seat-card client surfaces, the claim-strip component.
- Harm removed: role admission is a note in an inbox and role pay is a paragraph nobody settles. Metric: apply → ballot → assignment → two quarters elapse → claim-all pays exactly `token_per_cycle × commitment% × (1 − deferred%)` per quarter from treasury and accrues voice on the FULL amount (assert the exact figure at deferred = 50%); an underfunded treasury fails the claim loudly; a replayed claim is a no-op.
- Transplants: harvest §4 (USD-anchor triple, adapted), §5 (period chips, claim-all, extension window), §8 (the whole loop incl. ratchet-down and suspension-as-proposal).

**Lane G5 - membrane + attestation** (last)
- Zone: `server/lib/vouches.ts` (new), the badge-grant executor seam in `server/lib/badges.ts`, `server/lib/attestation.ts` (new), `drizzle/NNNN` (vouches, attestation_exports), admin attestation page, applicant-card client surface.
- Harm removed: membership has no optional community gate and the audit story is a promise. Metric: with threshold 3, the 3rd vouch admits and the 2nd does not; a governed badge grant carries its ballot id through to `/api/badges` payloads; generating the same period twice yields byte-identical payloads and hashes.
- Transplants: harvest §6 (applicant-card UI, reason text; vouch counting built ourselves), §7 (badge grants as time-boxed governed objects), §9 (deep-link + requested/endorsed surface idiom, mechanism skipped).

---

## 9. Risks, and what v1 does not build

**Risks, named:**
- **The constitution amendment (law 5)** is the single highest-blast-radius copy change in the product; it is asserted-adjacent in tests and quoted in docs. G1 owns it; case-sensitive grep first.
- **Custom mode's empty-allocation trap**: absent weight = 0 fails closed by design, and a founder who allocates nobody has built a village where nothing passes. The allocation page's standing warning is the mitigation; the failure mode is loud, never silent.
- **Recognition-weighted voting** (token mode default) makes applause into ballot weight. Defensible because recognition is constitutionally unbuyable and already gates proposer standing, but it is a real politics change; the founder ruling on `weight_mode` default (equal) keeps it opt-in.
- **Two support tables** (`mechanics_proposal_backers` + `governance_supports`) is deliberate debt: migrating shipped mechanics rows in v1 risks the live loop for tidiness. Consolidation is a named follow-up.
- **Quarter-boundary interpolation** drifts hours from true quarter instants. Acceptable for claim gating; documented so nobody "fixes" it into the settlement clock.
- **Vote publicity**: votes and weights are member-visible (Hypha's voter-list posture). A village wanting secret ballots does not have them in v1; say so on the ballot page.
- **Ballot spam**: bounded by the existing per-cycle proposal ceiling, staging thresholds, and proposer standing; ballots inherit all three.

**Not in v1** (each has a sketchable path, none blocks the founder's sentence):
- Delegated/proxy voting (`delegated` stays a display enum).
- Voice decay (harvest §10 "consider": a real idea, a separate ruling).
- Per-circle weight-mode overrides; per-type threshold overrides.
- The 5-scale temperature poll (cheap follow-up once the widget family exists).
- Quest two-vote progression as the default (steward consent remains the quest spine; `quest_payout` ballots are the narrow bridge, off by default).
- Multisig/treasury endorsement surfaces (harvest §9: adapt later, mechanism skipped forever).
- Anonymous ballots, mid-ballot amendments, Decidim participatory texts, election automation for `rotates`/`elected_by_circle` seat succession (the ballot decides a named applicant; running contested elections between candidates is v1.1).
- Any change to the Hypha webhook/link/verify loop: it ships frozen, as the `hypha` decidesBy leg and the fallback for forks that keep the module off.

**Sources (comparative sweep):** [S3.0 Consent Decision-Making](https://patterns.sociocracy30.org/consent-decision-making.html) · [Loomio proposals](https://www.loomio.com/docs/en/user_manual/polls/proposals) · [Loomio poll templates](https://help.loomio.com/en/user_manual/polls/poll_templates/index.html) · [Loomio proposal templates announcement](https://www.loomio.com/blog/2023/07/02/proposal-templates/) · [Decidim proposals component](https://docs.decidim.org/en/develop/admin/components/proposals.html) · [Decidim amendments](https://docs.decidim.org/en/develop/admin/components/proposals/special_configurations/amendments.html)
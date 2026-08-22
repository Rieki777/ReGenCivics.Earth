# HYPHA 2.0 HARVEST — dho-web-client pattern catalogue

Source: https://github.com/hypha-dao/dho-web-client, `master` @ v2.52.0 (commit `94a804e`), shallow clone at
`C:\Users\taren\AppData\Local\Temp\claude\C--Users-taren-Desktop-Amora\97b41f0d-35e7-4d7b-a678-30100d47c091\scratchpad\dho-web-client`
All paths below are relative to that clone root.

## License

**Apache License 2.0** (`LICENSE`). Copying, modification, and redistribution are permitted, including
commercially, provided we keep attribution/notice for any files we copy verbatim and note changes. No
copyleft — safe to lift UI patterns, component logic, and even literal code into Amora with a source
attribution comment. Patent grant included.

## Stack orientation (what to SKIP globally)

Vue 2 + Quasar + Pug templates + Vuex + Apollo GraphQL. Two data planes:

- **Reads**: Apollo GraphQL against a dgraph index of on-chain "document graph" objects. Field naming
  convention: `details_<name>_<suffix>` where `_s` string, `_i` int64, `_a` asset ("100.00 HUSD"),
  `_n` account name, `_t` timestamp. Percentages stored as ints `*_x100`, coefficients `*_x10000`.
- **Writes**: EOS smart-contract actions signed via wallet (`this.$api.signTransaction([...])`),
  payloads as `content_groups` label/value arrays.

**SKIP entirely**: eosjs / UAL wallet auth, `content_groups` encoding, Telos Decide ballot contract reads
(`src/store/ballots/actions.js` `getTableRows`), dgraph field suffixes, the upvote/Eden election system
(`src/pages/upvote-election`, `ELECTION_*` consts), IPFS attachments, SEEDS/HyphaTokenSales code.
Everything below is described so it can be re-expressed as Express routes + MySQL tables + React components.

---

## 1. Proposal creation WIZARD

**Where**
- `src/pages/proposals/ProposalCreate.vue` — orchestrator (step engine, draft continue/save, publish)
- `src/pages/proposals/create/config.js` — **the crown jewel: the whole wizard is one declarative config**
- `src/pages/proposals/create/StepProposalType.vue` — type cards step (+ `Options*.vue` sub-pickers)
- `StepDetails.vue`, `StepDuration.vue`, `StepIcon.vue`, `StepPayout.vue`, `StepReview.vue`
- `src/components/proposals/creation-stepper.vue` — right-rail progress + "Save as draft" + publish CTA
- `src/components/common/button-radio.vue` — the icon+title+description selectable card

**How it works**
- `config.js` declares 6 canonical steps: `type(1) → description(2) → date(3) → icon(4) → compensation(5) → review(6)`,
  each `{ key, index, label, component }`.
- Each proposal type is an entry with `optionType` (grouping: `'one-time' | 'recurring' | 'org-assets'`),
  `icon`, `title`, `description`, plus **per-type `steps: { icon: {skip:true}, ... }` overrides** and
  **per-type `fields` overrides** (labels/placeholders/which inputs render). `StepPayout` etc. render
  purely from `fields.X` presence — one component serves payout, assignment, archetype, and badge flavors.
- Type cards on the first step are grouped under headers "One-time contributions", "Recurring assignments",
  "Organizational assets" (`StepProposalType.vue` filters by `optionType`) — this is the screenshots'
  One-time activity / Recurring activity / Organizational asset triad. The card types present:
  contribution (Payout), quest (Queststart), assignment (Role Assignment), badge (Badge Assignment),
  archetype (Role Archetype), obadge (Badge Type), policy; poll & budget commented "return after beta".
  A `memberType` (CORE vs COMMUNITY) switches the whole option set (community members only get
  badge / payout / poll).
- Selecting a type that needs a referent expands an inline sub-picker (`options-archetypes`,
  `options-badges`, `options-quests`, `options-policies`) via dynamic `component(:is="options-"+ref)`.
- Desktop keeps **all visited steps mounted in a column**, dims non-current ones (`disable-step` class),
  auto-scrolls the active one into view; the right rail stepper shows numbered circles that become
  checkmarks, with click-back navigation to any completed step. Mobile collapses to one step + dots.
- `nextStep()` walks the config skipping `skip:true` steps: `while (steps[stepIndex].skip) stepIndex += 1`.

**Draft / staging states**
- "Save as draft" (`creation-stepper` + `ProposalCreate.saveDraft`) → localStorage store
  (`src/localStorage/storage.js`) keyed `draftProposals`, entry id `` `${title} - ${Date.now()}` ``, saving
  the entire draft object + `lastEdited` + `daoId` + `pastSteps` (so continue re-opens at the same step).
- Route-leave guard deep-compares the store draft and pops a modal: **"Leave without saving" vs
  "Save draft and leave"** (`confirm-action-modal`).
- Drafts render at the top of the type step ("Complete your draft proposal!"),
  `src/components/proposals/proposal-draft.vue`: dashed-border card with category chip, title,
  "Last edited on <date>", Continue proposal / Delete draft buttons.
- Final CTA is **"Publish to staging"** (edit mode: "Publish"). `createProposal` sends `publish: false`
  → proposal exists in state `drafted` (staging) visible to everyone; from the detail page the author can
  edit (`proposeupd`), delete (`proposerem`), or publish to voting (`proposepub`). See
  `src/components/proposals/proposal-staging.vue` (staging banner in the vote widget slot).

**Data shape** (the draft object, `src/store/proposals/index.js` state — effectively the union schema):
```
type, category {key,title}, title, description(markdown), circle, url(attachment),
usdAmount, deferred(%), peg, reward, voice, custom(bool),          // payouts
commitment(%), role, tier, badge, startPeriod, periodCount,
detailsPeriod, startDate,                                          // assignments
annualUsdSalary, roleCapacity, minDeferred, minCommitment,         // archetypes
icon, rewardCoefficient{label,value(x10000)}, voiceCoefficient{...},
pegCoefficient{...}, badgeRestriction, purpose,                    // badges
masterPolicy, questType, votingMethod, parentId, original(edit),
stepIndex, pastSteps, state, edit, draftId, daoId
```

**EOS-specific**: the `content_groups` payload assembly in `createProposal`/`updateProposal`
(`src/store/proposals/index.js` L452–951) and the `propose/proposeupd/proposepub/proposerem` actions.

**Verdict: COPY.** Port `config.js` as a JSON/TS config and the step-engine skip logic verbatim; one
generic step component set + per-type field maps. Adaptations: store drafts server-side (their
localStorage drafts die with the browser — an easy upgrade), and map staging → Amora's existing
"support threshold sensing" phase (see §10).

---

## 2. VOTE UI

**Where**
- `src/components/proposals/voting.vue` — the vote widget (a state machine in one component)
- `src/components/proposals/voting-result.vue` — the dual bars
- `src/components/common/progress-percentage.vue` — single bar with threshold + check/cross
- `src/components/proposals/voting-option-yes-no.vue`, `voting-option-5-scale.vue`
- `src/components/proposals/proposal-card.vue` — card variant with mini bars + your-vote side ribbon
- `src/components/proposals/voter-list.vue` — who voted what
- countdown strings: `timeLeftString()` in `src/utils/proposal-parsing.js` (L64–129)

**The dual bars** (the screenshots' "X% endorsed" green/red + "Y% voted" grey):
`voting-result.vue` renders two `progress-percentage` bars:
- **Unity** bar (icon `fas fa-vote-yea`, default threshold prop `0.80`) — % endorsed among votes cast
- **Quorum** bar (icon `fas fa-users`, default threshold prop `0.20`) — % of total voting power that voted

Full mode shows `{value}% ({threshold}% needed)` + green check / red cross; `mini` mode (cards) shows
bar + bold percentage only. Color logic in `colorConfig`/`colorConfigQuorum`
(`proposal-parsing.js` L243–341): bar is **green when currently ≥ threshold, red when > 0 but below,
grey/disabled at 0, white when the widget background is already colored** (expired/approved states).

**Vote widget state machine** (`voting.vue`): widget background/title morph through
staging → Vote (white) → voting buttons (primary) → Accepted (green) / Rejected (red) / Suspended /
Archived / Withdrawn, with sub-modes for suspend/withdraw confirmations ("Are you sure?").
- **VOTE NOW** button → expands to three stacked full-width buttons **Yes / Abstain / No**
  (`castVote(docId, 'pass'|'abstain'|'fail')`).
- After voting: a button shows "You voted yes/abstain/no" colored green/grey/red, with tooltip
  **"You can change your vote until the voting period closes"** — re-click to re-vote.
- **Countdown**: 1-second `setInterval` + `$forceUpdate`, text "This vote will close in {d} {hh}:{mm}:{ss}";
  after close, "On MMM D, YYYY". Cards show compact `1d 03:22:10`.
- Post-expiry, owner sees **Activate** (accepted) or **Archive** (failed) — closing is an explicit act.
- Non-owners see **"Suspend assignment"** on active assignments (spawns a suspension proposal, §8);
  owners see **Withdraw**.
- Approved Badge/Role-archetype proposals show an **Apply** button right in the vote widget
  (`canBeApply`) — approved org-asset → instant application entry point.

**Data shape** (vote tally on a proposal, GraphQL):
```
votetally[0]: { pass_votePower_a, fail_votePower_a, abstain_votePower_a }   // voice-weighted
vote[]:       { vote_voter_n, vote_vote_s ('pass'|'fail'|'abstain'), vote_votePower_a, vote_date_t }
ballot_expiration_t, details_ballotSupply_a  // total voice supply snapshot at publish
```

**EOS-specific**: `castVote` signs a chain `vote` action; supply read from token stat table.

**Verdict: COPY** the whole widget family (bars, thresholds-with-needed-labels, yes/abstain/no,
changeable votes, countdown, owner activate/archive). Adapt: vote power = Amora Voice balance;
`votetally` = SUM over votes table; re-vote = upsert row.

---

## 3. UNITY and QUORUM

**Where**
- Settings: `src/store/dao/mutations.js` (`settingsMapper`, L34–48) —
  `votingAlignmentPercent` (= unity, from `settings_votingAlignmentX100_i`),
  `votingQuorumPercent` (from `settings_votingQuorumX100_i`), `votingDurationSec`, `periodDurationSec`;
  separate `communityVoting{AlignmentPercent,QuorumPercent,DurationSec,Method}` set.
- Getter: `src/store/dao/getters.js` `votingPercentages → { quorum, unity }`.
- Set at DAO creation: `src/store/dao/actions.js` (`voting_alignment_x100`, `voting_quorum_x100` labels).
- Evaluation: `src/utils/proposal-parsing.js` `voting()` (L369–392) and `isAccepted()` (L134–146).
- Configuration UI strings: `src/locales/en.json` `.dao.settings-voting.*` — "Unity is the minimum
  required percentage of members supporting (voting for, vs voting against) a proposal… Make this 100%
  if you wish to have consensus"; "Quorum is the minimum required percentage of total members
  participating in the vote".

**The math** (worth copying exactly):
```js
unity  = (pass + fail > 0) ? pass / (pass + fail) : 0     // ABSTAIN EXCLUDED from unity
quorum = supply > 0 ? (abstain + pass + fail) / supply : 0 // abstain COUNTS toward quorum
accepted = quorum >= quorumThreshold && unity >= unityThreshold
```
Abstain is therefore a genuine "help it reach quorum without taking sides" instrument.

**Threshold snapshots**: each closed proposal stores `details_ballotQuorum_i` / `details_ballotAlignment_i`
(`pastQuorum`/`pastUnity`) and `details_ballotSupply_a` (voice supply at publish). `isAccepted` prefers the
snapshot — so **changing DAO settings never rewrites history**, and quorum is computed against the supply
as of ballot open, not today's.

**Pass/fail consequence**: nothing auto-executes. After expiry the proposal sits until someone (owner)
triggers close: accepted → `approved` state (assignment activates, payout becomes claimable, archetype
becomes applicable); failed → `archived`. States: `drafted, proposed, approved, rejected, archived,
suspended, withdrawed` (`src/const.js` PROPOSAL_STATE).

**Verdict: COPY.** Amora: village settings row `{unity_pct, quorum_pct, voting_duration}` + per-proposal
snapshot columns `{ballot_unity_pct, ballot_quorum_pct, ballot_voice_supply}` written at publish;
evaluate exactly this formula. The Hypha default surface is 80% unity / 20% quorum.

---

## 4. COMPENSATION (three-token split)

**Where**
- `src/pages/proposals/create/StepPayout.vue` — the full compensation step
- `src/store/proposals/index.js` `calculateTokens` (L396–420) — the split formula
- `src/store/dao/mutations.js` — token config: `pegToken` (HUSD/cash), `rewardToken` (HYPHA/utility),
  `voiceToken` (HVOICE), decimals, `rewardToPegRatio`, `treasuryTokenMultiplier`,
  `utilityTokenMultiplier`, `voiceTokenMultiplier`, `cashClaimsEnabled`
- `src/components/common/payout-amounts.vue`, `token-logo.vue` — display
- Salary bands: `config.js` L722–756 (B1 $70k/yr … B7 $190k/yr select) and on-chain `salaryband`
  objects (`OptionsArchetypes.vue` query: `{ name, annualAmount, minDeferred }`); `DEFAULT_TIER =
  'Custom Reward'` allows a custom annual USD instead of a band.

**Inputs** (which appear is config-driven per type):
- `usdAmount` — "Total USD equivalent" (contributions/quests) or `annualUsdSalary` (assignments —
  from tier band, or custom)
- `commitment` % slider 0–100 — assignments only; validated ≥ role's `details_minTimeShareX100_i`
  with inline error "Commitment must be greater than {min}%"
- `deferred` % slider — validated ≥ archetype `minDeferred`; forced to 100 when the DAO has cash
  claims disabled
- `custom` toggle — unlocks direct entry of the three token amounts (else read-only computed)
- Badge types instead get three **coefficient** inputs (±20%, rendered as `x1.05` prefix + `%` suffix)

**The split formula** (`calculateTokens`):
```
usdPerPeriod = (periodDurationSec / SECS_PER_YEAR) * annualUsd
usdPerCycle  = usdPerPeriod * (commitment/100) * periodsOnCycle    // assignments
peg    (cash)    = usd * (1 - deferred%)  * treasuryTokenMultiplier
reward (utility) = usd * (deferred%)      * utilityTokenMultiplier   // deferral buys utility token
voice            = usd * 1.0              * voiceTokenMultiplier     // FULL amount, always
```
Voice is granted on the full USD-equivalent regardless of deferral — pay structure changes your cash,
never your governance weight.

- Preview toggle: **"Compensation for one cycle" vs "one period"** with tooltips literally
  "1 Moon Cycle (ca. 1 month)" / "1 Moon Period (ca. 7.4 days)";
  `periodsOnCycle = 2629800 / periodDurationSec`.
- Chain payload fields: `usd_amount`, `deferred_perc_x100`, `time_share_x100` (commitment),
  `annual_usd_salary`, `min_deferred_x100`, `fulltime_capacity_x100`, or explicit
  `peg_amount/reward_amount/voice_amount` when custom.
- Display on cards: `compensation()` in `proposal-parsing.js` sums reward(×rewardToPegRatio)+peg as
  "$ amount" with tooltip "1000 HYPHA - 500 HUSD - 1500 HVOICE".

**EOS-specific**: asset strings ("100.00 HUSD"), token contracts, decimals bookkeeping.

**Verdict: ADAPT.** Amora has Voice only. Keep: the **USD-equivalent anchor + deferred% + commitment%**
triple and the per-period/per-cycle lunar toggle; collapse peg/reward → a single (possibly future) cash
lane or drop, but keep `voice = full equivalent` as the governance-weight rule. Salary bands → Amora
role archetype bands (fewer, village-scaled). Badge coefficients → Voice multiplier on badges.

---

## 5. CLAIM PERIODS (their cycles ARE lunar)

**Where**
- `src/utils/proposal-parsing.js`: `PERIOD_NAMES = ['First Quarter','Full Moon','New Moon','Last Quarter']`,
  `getPeriods()` (L646–695), `_getExtendObject` (L697–706), `claims()` (L709–719)
- `src/components/assignments/period-card.vue` — moon-phase period chip
  (First Quarter → `fas fa-adjust`, Full Moon → `fas fa-circle`, New Moon → `far fa-circle`,
  Last Quarter → rotated adjust) with status chips **Claimed (green) / To Claim (primary) / Ongoing (outline)**
- `period-calendar.vue`, `period-calendar-card.vue` — strip of periods across the assignment duration
- `src/components/assignments/assignment-claim-extend.vue` — **"Claim all"** button with red badge
  count of claimable periods + **Extend** button
- `src/store/assignments/actions.js` — `claimnextper` action; claim-all = the same action repeated
  `numPeriods` times in one transaction; `adjustcmtmnt`, `adjustdeferr`
- `src/pages/proposals/create/StepDuration.vue` — start-period picker (calendar where only period
  start dates are selectable), `periodCount` (default 12, max 26), computed end date string

**Model**
- The DAO has a **calendar of periods** (`periodDurationSec`, in practice ~7.4 days = a lunar quarter;
  4 periods ≈ 1 moon cycle = `cycleDurationSec 2629800` ≈ 1 month). Periods are first-class objects
  with `details_startTime_t`, `details_label_s` (the phase name), `next` pointer.
- An assignment = `start_period` + `period_count`. Salary accrues per elapsed period.
- **Claimable** = `period.end < now && !claimed`; `claimed` is the list of period ids already paid
  (`data.claimed` on the assignment). UI: badge count, Claim All, per-period chips.
- **Extension window**: from 3 periods before the end to 2 periods after
  (`_getExtendObject`) — button label flips "Extend after {date}" / "Extend before {date}" /
  "You must re-apply". Extension is an **Edit proposal** carrying only `period_count` +
  ballot title/description (`roleExtension` config entry skips every step except date + review).

**Verdict: COPY 1:1.** This is the strongest possible alignment: their periods are literally lunar
quarters and Amora already runs lunar cycles. Tables: `periods` (or computed from lunar calendar),
`assignment_claims (assignment_id, period_id, claimed_at)`; endpoint `POST /assignments/:id/claim`
paying every elapsed unclaimed period. Keep moon-phase icons and the To Claim / Claimed / Ongoing chips.

---

## 6. VOUCHING / member enrollment

**Proven negative**: `git grep -i vouch` → **zero hits** in this repo (grep verified against known-present
terms). The "trust protocols require at least 3 villagers vouch" screenshot is from an earlier
Hypha/SEEDS-era build, not this codebase. What this repo has instead:

**Applicant → Enroller flow**
- `src/store/accounts/actions.js`: `applyMember({content})` → chain `apply` (applicant + reason text);
  `enrollMember({applicant, content})` → chain `enroll` (any member holding the enroller badge);
  `removeApplicant`; `checkMembership` GraphQL — membership edges
  `applicantof / memberof / admin / enroller / adminbdg / enrollerbdg`.
- `src/components/profiles/profile-card.vue` (L311–315): applicant cards show round ✓ / ✗ buttons to
  enrollers; `src/pages/dho/Members.vue` lists applicants first.
- `src/store/dao/getters.js` `canEnroll` — enrollment capped by plan `maxUsers` (seat-cap guard).
- Enroller/admin powers are themselves **badge-gated** (enrollerbdg/adminbdg) — see §7.
- Onboarding flow (`src/pages/onboarding/NLogin.vue`, `verifyOTP` in accounts actions) creates the
  account then immediately fires `apply` with the user's reason.

**Verdict: ADAPT.** Reuse the applicant-card UI and the "membership application carries a reason text"
shape, but implement vouching as Amora logic: `vouches (applicant_id, voucher_id)` with threshold 3;
the ✓ button becomes "Vouch" and enrollment auto-completes at N vouches. Keep the badge-gated-enroller
idea as an option (stewards vouch counts double, etc.).

---

## 7. BADGES

**Where**
- Creation config: `config.js` `obadge` (org-asset Badge) — fields: title, description, icon
  (`StepIcon.vue` icon/IPFS picker), `purpose` ("guides the evolution of the badge and changes the
  least"), three coefficients `voice/reward/pegCoefficient` (x10000, UI-bounded ±20%).
- Assignment config: `config.js` `badge` (Assignment Badge) — pick an approved badge
  (`OptionsBadges.vue` — only `details_state_s ~ approved`), duration (start period + period count);
  compensation step skipped, coefficients shown read-only.
- Payloads: `src/store/proposals/index.js` BADGE (`voice_coefficient_x10000` etc.) and ABILITY
  (`assignee`, `badge` docId, `start_period`, `period_count`); `applyForBadge` (auto-publish for
  election badges, skipping staging).
- Multiplier semantics: `proposal-parsing.js` `tokens()` L572–604 — tooltip: "multipliers factor in an
  additional amount on top of your current claims, e.g. 1.1x gives 1.1 times the tokens of your claim".
- What badges gate: system badges = capabilities — admin (`adminbdg`), enroller (`enrollerbdg`),
  Treasurer, election badges (`ELECTION_BADGES`: Voter/Delegate/Chief/Head Delegate). Dashboard
  (`Home.vue` `daoBadges` query) shows each badge with holder avatars (`assignment` → assignee list).
- Badge holders/suspension: badges (like roles) can be suspended (`canBeSuspended` includes
  Badge/Ability), and holders can withdraw.

**Data shape (badge)**: `{ title, description, icon, purpose, voiceCoefficient_x10000,
rewardCoefficient_x10000, pegCoefficient_x10000, state }`; badge assignment:
`{ assignee, badge_id, start_period, period_count, state }`.

**Verdict: ADAPT.** Badge = proposal-created capability object; badge assignment = time-boxed,
voted grant. For Amora: coefficients collapse to one optional Voice multiplier; the *capability-gating*
(enroller/treasurer powers held via badge, visible on the dashboard with holder avatars) is the pattern
to copy — it makes "who can do what" itself a governed, expiring object.

---

## 8. ROLE APPLICATION end-to-end

**Where**: `config.js` (`archetype`, `assignment`, `roleExtension` entries),
`OptionsArchetypes.vue` (+ `archetype-radio.vue`), `StepPayout.vue`, `proposal-parsing.js`
(`commit`, `deferred`, `salary`, `canBeApply`), `voting.vue` (Apply/Activate buttons),
`salary.vue` + `dynamic-commit.vue` (live adjustment), `assignment-*.vue` (suspend/withdraw/extend),
`src/store/assignments/actions.js`.

**The loop**
1. **Role Archetype proposal** (org asset): title, description, salary band (B1–B7 select or on-chain
   `salaryband`), `roleCapacity` (max simultaneous holders, `fulltime_capacity_x100`),
   `minDeferred`, implicit `minCommitment` → community votes.
2. Approved archetype → appears in the **Apply** flow. Two entry points: the wizard
   (Role Assignment → choose archetype + tier dropdowns) or the **Apply button directly on the
   approved archetype's proposal page** (`canBeApply`).
3. **Role Assignment proposal**: assignee = self, chosen archetype + tier, commitment % (≥ role min,
   inline-validated), deferred % (≥ tier min), start period + period count (§5), computed 3-token
   preview → publish to staging → publish → **vote** (§2/§3).
4. Accepted + expired → owner clicks **Activate** → state approved, assignment live.
5. Assignment accrues claimable periods (§5); owner adjusts **commitment and deferral live** without
   a new vote via sliders (`dynamic-commit.vue`, bounded `[commit.min..commit.max]` where max is the
   voted amount; chain `adjustcmtmnt`/`adjustdeferr`; copy: "Multiple adjustments to your commitment
   within one claim period will only count the last one") — a *ratchet-down-freely, vote-to-raise* model.
6. Near the end: **Extend** (edit proposal, only period_count + ballot text, §5) or re-apply.
7. Accountability: any member can propose **suspension** of an active assignment
   (`voting.vue` suspend flow → "You're about to create a suspension proposal" → `suspend` action with
   reason); owner can **withdraw** (`withdraw` action). Both leave the vote widget showing
   Suspended/Withdrawn states.

**Partial roles**: `time_share_x100` (commitment) < 100 is a partial role; all cash/utility pay scales
linearly by commitment (§4 formula); `lastimeshare[0].details_timeShareX100_i` tracks the current
(possibly adjusted) share vs the voted max.

**Verdict: COPY the flow shape.** Map: archetype → Amora org-chart seat template; assignment →
seat-claim proposal (Amora already has claim flows — this adds the vote + commitment/deferral +
period accrual); keep live ratchet-down of commitment, extension-as-mini-proposal, and
suspension-by-anyone as the accountability primitive.

---

## 9. Multi-sig / treasury surfaces (UI level only)

**Where**: `src/pages/dho/Treasury.vue`, `src/pages/dho/MultiSig.vue`,
`src/store/treasury/actions.js` (`endorsePayment`, `newpayment` with network BTC/ETH/EOS + trxId),
`src/store/multi-sig/actions.js` (eosio.msig `approve`), `MULTISIG_TABS` in `src/const.js`.

**What the UI shows**
- **Treasury page**: token balances row; **redemption history table** — columns
  `account | Request ID | requested | date | paid | endorsed | treasurers (attestation avatars) | details`;
  a redemption row reaches "endorsed" state when `amountPaid === amountRequested`.
- **Payout-requests tab → multisig builder**: treasurer selects pending payout requests →
  "Generate Multisig Transaction" → other treasurers sign → execute. Guidance copy walks the
  treasurer through each state ("This multisig transaction has been successfully signed by 2
  treasurers and is now ready to be Executed").
- **MultiSig page** (eosio.msig proposals): table rows with proposer, developer, notes, GitHub-commit
  and document links, and **approval chips: round initial-avatars — filled = signed (tooltip
  "Approved the {date} by {actor}"), grey = requested (click your own initials to sign)**;
  executable when `provided_approvals >= requested_approvals`.
- Off-chain settlement attestation: treasurers record the external payment (network + transaction id +
  comment) and endorse amounts — a two-step *paid vs endorsed* audit trail.

**EOS-specific**: all signing mechanics (eosio.msig, chain actions).

**Verdict: SKIP mechanism, ADAPT surface.** For Amora v1.0 (Hypha demoted to audits): keep the
initials-chip sign-off row and the requested/endorsed/paid three-state audit table as the steward
consent + treasury audit UI, backed by plain MySQL approval rows.

---

## 10. Other genuinely clever village-scale patterns

- **Staging = sensing phase with comments** (`proposal-staging.vue`; comment actions `cmntadd/upd/rem`
  + emoji `reactadd` in `src/store/proposals/index.js` L1042–1101; `comments-widget.vue`,
  `comment-input.vue`). Proposals sit publicly in staging collecting threaded comments and reactions
  before the author publishes to vote. Maps exactly onto Amora's existing support-threshold sensing:
  staging exit = support threshold met. **Copy.**
- **Version history on edits** — `version-history.vue`, `ProposalHistory.vue`: edit proposals keep
  `original` pointer; history page shows past ballots with your past vote ("You voted: YES") and
  Passed/Not passed ribbons. **Copy** for seat/quest renegotiations.
- **Dashboard**: `src/pages/dho/Home.vue` grid — big welcome banner (customizable per DAO),
  **metric-link cards** (Assignments / Badges / Members / Active proposals counts, each deep-linking),
  newest-members widget, support widget, and **how-it-works.vue**: a swipeable 6-slide carousel
  teaching each governance flow ("Ready for voting?", "Applying for a role", "Launching a quest"…).
  The screenshots' "What would you like to do today?" wall is this generation's dashboard + the
  type-cards step. **Copy** the metric cards + how-it-works carousel; cheap, huge onboarding value.
- **5-scale community vote option** (`voting-option-5-scale.vue`): Hell No / No / Abstain / Yes /
  Hell Ya with color ramp — village-friendly temperature check for polls. **Adapt** for Amora polls.
- **Voice decay**: DAO creation sets `voice_token_decay_period` 604800 (weekly) +
  `voice_token_decay_per_period_x10M` (1%) — governance weight slowly decays, favoring active members.
  **Consider** for Amora Voice.
- **Quest two-step** (`config.js` quest: "A Quest is a 2 step…", `quest-progression.vue`,
  `quest-claim-widget.vue`, `createQuestPayout`): Quest Start proposal (escrows the deal, vote 1) →
  work → **Quest Completion proposal** (vote 2) → claim. Rejected completion? Widget says "Take your
  time, complete the quest and simply submit another quest completion proposal." The progression
  strip renders start → each completion attempt → pending "Create now!" card as colored mini-cards
  (blue on-voting / green approved / red rejected). **Copy** — it's Amora's quests+steward-consent
  with the consent generalized to a village vote and with a visual paper trail.
- **Danger-action double-writes**: suspend/withdraw both require an in-widget confirm state, and
  suspension explicitly frames itself as *creating a proposal*, not performing an act. Good norm.
- **Config-gated features**: `cashClaimsEnabled`, `multisigEnabled`, `proposalsCreationEnabled`,
  `communityVotingEnabled` — every governance surface is a per-DAO toggle read from settings.
  **Copy** as village settings flags.

---

## Amora adaptation glossary

| Hypha | Amora |
|---|---|
| HVOICE / voice token | Voice token (weight = balance at ballot open) |
| HUSD (peg/cash) + HYPHA (reward/utility) | collapse; keep deferred% math for future cash lane |
| Period (First Quarter/Full Moon/New Moon/Last Quarter, ~7.4d) | lunar quarter of Amora's cycle |
| Cycle (2629800s ≈ 1 moon) | Amora lunar cycle |
| Role archetype / salary band | org-chart seat template / band |
| Role assignment (time_share_x100) | seat claim with commitment % |
| Assignment Badge | badge grant (time-boxed) |
| Enroller badge / apply+enroll | vouch threshold (3 villagers) on applicant card UI |
| Queststart → Questcomplet | quest + completion proposal (steward consent → village vote) |
| Staging (`publish:false` → proposepub) | existing support-threshold sensing phase |
| content_groups / chain actions / dgraph | Express REST + MySQL JSON columns |

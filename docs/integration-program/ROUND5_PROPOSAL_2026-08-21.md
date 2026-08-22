# Round 5 proposal — governance names and flow, the map's chrome and edges, the crowdpool bridge

Written 2026-08-21 ~19:50 EDT by the round-5 coordinator, before dispatching anything.
Every claim below carries the ref it was measured at, measured this session. Rye's asks arrived
as ten Telegram screenshots; each is transcribed **verbatim in brackets** in §3.

This round inherits TWO handoffs that converge on one repo:

- `PROMPT_NEXT_COORDINATOR.md` (this program, round 4 closed at game-amora `ace9d9d`) — six fix
  lanes queued in `round4/QA_TRIAGE_2026-08-21.md`, two design questions open.
- `C:/Users/taren/Desktop/Amora/SWARM_HANDOFF_2026-08-21.md` (the map/housing swarm) — five open
  PRs, a mandatory landing sequence, two of them never adversarially reviewed.

Nothing dispatches until Rye rules on §5. "Defaults" as a one-word answer dispatches everything
as written.

---

## §0 State, measured 2026-08-21 ~19:30 EDT

- game-amora `origin/main` = **`ace9d9d`** = live (`/health` → `2026-07-28-wave1-ace9d9d`,
  23:40 UTC). Main and live match; round 4's eight lanes and the QA passes are all in.
- **Five PRs open** (verified via `gh pr list` from the game-amora worktree): #30 housing ports,
  #31 overlays, #32 maia, #33 org lens, #34 SITE_PAGES re-derive. #29 (stored XSS) is MERGED and
  adversarially ACCEPTED. #31/#32/#33/#34 all modify `docs/prototypes/grounds-v0.html` (5.5 MB),
  which IS the live `/map`.
- **#31 and #33 have never been adversarially reviewed** — three refutations died on the session
  limit. Resume handle: workflow script `amora-last-wave-wf_40a4e78c-fc9.js`,
  `resumeFromRunId: wf_40a4e78c-fc9` (completed agents replay from cache).
- **#32 is REJECT on its record, not its code**: the "caught 4 of 6, measured" claim is false
  (reviewer: 11/11; the probe timed cold flights). PR body + lane README must be corrected
  before merge.
- Worktree states (measured): `wt-map-org` and `wt-map-overlays` clean; `wt-housing` 1 untracked
  (`amora-scene.json`, the known loose end); `wt-doors` 24 untracked (probe scripts only, no
  tracked modifications); **`wt-maia` has 3 MODIFIED tracked files**
  (`qa/README.md`, `break_maia_journey.py`, `verify_maia_journey.js`) + 2 untracked patch
  scripts — the handoff's "nothing uncommitted" claim is wrong for this lane, and it must be
  resolved as part of the #32 record correction.
- Round-4 fix lanes FIX-A..F are triaged, NOT dispatched (`round4/QA_TRIAGE_2026-08-21.md`).
- Hazard carried: the artifact gates (`qa/verify_*.js`) are NOT in CI; only the budget check is.
  "CI green" says nothing about the living map's behaviour. Standing structural gap.

---

## §1 Phase 0 — land the map swarm (blocks every artifact-touching ask)

The inherited landing sequence is binding and not optional: main's artifact is the base, the
four artifact PRs **regenerate** (rebase → take main's artifact → replay numbered patch scripts
→ run the lane's `qa/verify_*.js`), never hand-merge.

1. **Resume the dead refutation wave first** (`resumeFromRunId: wf_40a4e78c-fc9`) — #31 and #33
   merge only on its verdicts. #33 is the highest-risk PR in flight: server+client+tests, never
   gated locally.
2. **#30** — no artifact, lands independently, any time.
3. **#34** — +17 bytes, unblocks the `/introductions` door.
4. **#31 → #32 → #33**, each rebased onto the last. #32 only after its PR body + lane README are
   corrected and `wt-maia`'s modified QA files are committed or reverted with a recorded reason.
   #33 last, with the full gate set including a **cold** `npx tsc -p tsconfig.tests.json --noEmit`.
5. After #33: notify the *master integrator coordinator setup* session (the predecessor's unmet
   promise) and re-measure main+live before Phase 1 dispatch.

Runs in parallel with Phase 0 (provably disjoint from the artifact): **G1** (governance audit,
read-only, §3.2) and **FIX-F.1** (intake-scanner first-party scoping — 71 waivers deep, CI
config zone).

## §2 Phase 1 — the round-4 fix lanes (after #33 lands)

As triaged: **FIX-A** tab-bar straddle (worst harm), **FIX-B** route-change spinner + CLS,
**FIX-C** example/seed copy on real surfaces, **FIX-D** founder-on-a-phone breaks, **FIX-E**
polish/a11y sweep, **FIX-F** maintenance queue. Disjoint zones per the triage; dispatched in
parallel once #33's client/server diff is on main (FIX-A/B/D touch the shell and pages #33 may
graze — verified per-lane at brief time). Ask 4 (wheel labels, §3.4) folds into FIX-E's brief
as an addendum — same zone, owning lane.

---

## §3 The ten asks, verbatim, grounded

### 3.1 Seats → Roles (ask 1)

> [Put all public facing governance where we use "seats" and use "Roles" instead]

**Grounded:** `git grep -il seat origin/main` hits 20+ client files — `SeatClaimCard.tsx`,
`power/SeatGlyph.tsx`, the whole `power/*` suite, plus the org-lens labels inside
`grounds-v0.html` that **PR #33 is about to land** (its title: "The org lens: seats, satellites
and the ground plane"). Renaming before #33 lands would break its guarded patch anchors.

**Plan — lane G2, after #33:** user-visible copy only ("seat" → "Role" in headings, labels,
buttons, map legends, empty states, refusal copy). Code identifiers, DB tables, API fields,
route paths stay `seat` — a schema rename buys nothing public-facing and risks the migration
ledger. Artifact-side strings go to the map lane (M1) as a brief addendum, not a second lane in
the same file. Gate: a sweep script counting user-visible `seat` strings, target 0, with a
whitelist for internal-only surfaces; brand-voice check green.

### 3.2 The governance audit, and how much Hypha in v1.0 (ask 2)

> [So for applying for roles and governance from a technical and database perspective, we're
> gonna be handling all of governance and all the voting and the role admissions and submissions
> and all of that on our site directly and then it's only every few weeks or every month or
> whatever pattern it is that you need to a hypha DAO, legal paperwork, etc (whatever pattern
> the group is using for its official record) and reflecting the verified truth that the Game is
> representing this way users or our platform aren't married to Hypha, or any particular legal
> background. We just encouraged that route because we're partnered with them, but they could
> use any DAO or platform or even traditional companies and just update paperwork quarterly, etc.
>
> So we need to ensure we have the whole flow for the governance process covered on our site
> whereby Hypha becomes optional (so audit how users would apply for any role, quest,
> contribution, etc within Amora and what it would take to do this).
>
> So audit all our routes and tell me what gaps we have in our governance (roles, proposals,
> agreements, quests, etc) and or how much you think we should involve Hypha now in version 1.0
> (like maybe we use Hypha for agreements now but build out our roles better because hypha is
> lacking in that UI and UX.
>
> Or is it better to keep Hypha deeply integrated and build better bridges from our platform to
> theirs in order for users to feel like it's one unified experience?]

**Plan — lane G1, read-only discovery, dispatches immediately** (no artifact contact). One lane,
full route census: every route/procedure/job touching roles, proposals, agreements, quests,
contributions, voting; for each — exists / partial / missing, on-site vs Hypha-dependent, with
the ref. Output is a report **to Rye** ending in a recommendation on the three-way question
(Hypha for agreements only / deep bridges / fully optional), argued from what the census finds
plus what the hub's `hypha-bridge` (`server/lib/hypha-bridge/*` at hub HEAD) already carries.
Known context for the brief: Base chain is declared the naming source of truth but nothing reads
`name()`/`symbol()` from chain (memory, unverified on-chain) — the audit states what the
"verified truth the Game represents" would attest against. **No Hypha-coupling code changes this
round until Rye rules on the report.**

### 3.3 The role application flow (ask 3)

> [When a role is 60k or whatever they need to have a slider for how much is going to be paid
> upfront in money (cash tokens) or other tokens and have all the sliders for each of the tokens
> (including voice) in each of the role applications.
>
> So step 1 of applying for a role is saying what they're going to deliver for that season.
>
> Step 2 is using the sliders to decide how they want their pay split up.
>
> Step 3 is why they're a perfect fit for the role.
>
> Then it goes to the admin team or goes up publicly for voting.]

**Plan — lane G3, build, briefed after G1's census returns** (G1 maps exactly the surfaces G3
extends; a day's wait buys a correct brief). Three-step application wizard on the role surface:
deliverables-for-the-season → pay-split sliders (one per live token incl. Voice, plus cash;
constrained to sum 100%) → fit statement; then routes to admin review or public vote per §5 Q5.
Server: application record + status lifecycle + the vote/decision hook; migration number from
the four-way scan at claim time (next free after 0088, re-verify).

### 3.4 Equinox and solstice (ask 4)

> [Replace the "equal" and "shortest" with "equinox" and "solstice"]

**Grounded:** labels live in `CycleClock.tsx` and `calendar/YearWheel.tsx` (origin/main). Four
wheel marks today: Shortest / Equal / Equal / Longest. Becomes Solstice / Equinox / Equinox /
Solstice (§5 Q4 for qualifiers). **FIX-E brief addendum** — same shared-component zone.

### 3.5–3.8 The map's chrome (asks 5–8) — lane M1, after Phase 0

> [back to the village button and text is ugly (misaligned with the rest of the map) and I
> believe this button is covering the build button! Which should also have the big "make the map
> yours" button that opens up that pane.]

> [don't know how to exit this on desktop - needs easy exits]

> [have palette and brush options only come up if I select the painted terrain (since it has no
> effect in the satellite default.]

> [need to reposition overlaps by the taskbar on desktop.]

**One lane, one artifact** (`grounds-v0.html` + `LivingMap.tsx` chrome): realign "Back to the
village" to the map's plaque style; stop it occluding the build button; give the pane a big
"Make the map yours" opener; desktop exits for the pane (visible ✕, Esc, click-outside); palette
+ brush controls render only when terrain = painted; pane and dock repositioned clear of the
taskbar at desktop heights (the screenshot shows the pane's tail under the Windows taskbar).
Carries as addenda: G2's artifact-side seat→Role strings, and the QA items routed to the map
session (iframe +400px interior, lens band 0×0 at phone widths, HELP badge). Same guarded-patch
discipline as the landed lanes; gates are the lane's `qa/verify_*.js` run locally — named in the
report because CI cannot see them.

### 3.9 The crowdpool bridge (ask 9) — the round's centrepiece

> [MASSIVE FEATURE!
>
> Need the frontend of the app for organising your crowdpooling module - a new module (talk this
> out).
>
> 1. Govern and see the results of the crowdpool campaign that's running on Regen civics in your
> village custom game etc
> 2. Connect the roles in your custom game to the roles in the crowdpooling campaign etc
> 3. Connect the material library of the game to the crowdpooling so when people offer their
> materials for the campaign they can see in the library what materials have already been
> accepted, what the community is asking for in their crowdpool campaign (to signal to people
> what to offer if they have it). etc
> 4. Have the admin panel to track all the funding flows and accept/deny/communicate with those
> of the campaign.
>
> This is our first real bridge between regencivics.earth and our custom games.]

**Grounded:** the hub already holds the campaign machinery — `server/lib/crowdpool-coach.ts`,
`crowdpool-coach.test.ts`, `partner-funding-parse.ts`, `stewardDigestJob.ts`, and a
`hypha-bridge` receiver (hub HEAD). The game holds a prior spec: `docs/modules/crowdpool-dashboard.md`
(origin/main) — the design conversation Rye asked for starts from it, not from blank paper.

**Plan — two lanes, cross-lane exports named on BOTH briefs (skill §10.9):**

- **CP-H (hub):** a versioned read API for a campaign — status/progress, asks (what the
  community requests), accepted offers, funding-flow events — plus the admin actions
  (accept/deny/communicate) if §5 Q7 keeps admin write on the game side. Auth: a
  server-to-server bridge token (hub-minted, held in game env; one-process minting per the
  standing secrets rule).
- **CP-G (game):** the new module — campaign card + results/governance view wired to the
  village's game; role-link table (game role ↔ campaign role); material-library integration
  (accepted materials and open asks visible in the library, "offer this" signal); the admin
  funding-flows panel. Ships **module-off** until the bridge token exists on live; module
  enables stay Rye's word.

v1 scope per §5 Q7: read-mirror + admin comms first; member write actions (offers/pledges)
deep-link to the hub until the write bridge earns its own round. This is deliberately the
smallest bridge that is REAL — first tick of the sync job is part of DONE (a guard nobody's
data exercises is not a guard).

### 3.10 The floating-island edges (ask 10) — lane M2, after M1

> [for the edges of the map make it look like one of those floating 3d land islands and over the
> water where it starts failing the stitching we'll remove it (some set distance off the coast
> on ALL maps we have the 3d floating island and the water transforms into a waterfall following
> the same curvature of the beach all at the same distance off. This way the siding of the map
> looks gorgeous rather than a defect.]

**Plan:** same artifact as M1 → serialized after it, own lane (a visual feature, not chrome).
One global offshore-distance constant on ALL maps; beyond it the tile edge renders as the
floating-island underside and the water sheet becomes a waterfall following the coast's
curvature. Verdict is visual: four sample renders for Rye to bless (he already owes four visual
blessings from the map swarm — batch them). Budget hazard: the artifact has a CI byte budget
(`check-artifact-budget.mjs`); island art must be priced against it in its own unit before the
lane is briefed.

---

## §4 Order of the round

```
now:            Phase 0 landing  ∥  G1 audit  ∥  FIX-F.1 intake scanner
#33 on main:    FIX-A..E (parallel, disjoint)  ∥  G2 rename (client)  →  M1 map chrome
G1 report:      Rye rules on Hypha  →  G3 role application
CP rulings:     CP-H + CP-G (parallel, exports named on both briefs)
M1 done:        M2 island edges
close:          closing-proof lane that wrote none of it, then one decision list
```

---

## §5 Questions for Rye (defaults in brackets — "defaults" dispatches everything)

1. Merge #31/#33 only after the resumed refutation wave returns verdicts. [default: yes]
2. I correct #32's false "4 of 6, measured" claim in the PR body + lane README and resolve
   wt-maia's uncommitted QA edits, then merge. [default: yes]
3. Seats→Roles is copy-only: public-facing strings become "Role"; code identifiers, DB, API
   stay `seat`. [default: yes]
4. Wheel labels: plain "Equinox"/"Solstice" at all four marks, no seasonal qualifiers.
   [default: plain]
5. Role applications route per-role, set at role creation: admin review or public vote.
   [default: per-role setting, admin review as the initial value]
6. Slider token set = cash + every live token including Voice, from the token registry, summing
   to 100%. [default: yes]
7. Crowdpool v1 = read-mirror + admin accept/deny/communicate; member offers/pledges deep-link
   to the hub. [default: yes]
8. QA P2-05: a shared link to an OFF module keeps the plain 404 (off = invisible).
   [default: keep]
9. QA P3-F2: org-draft publishing lives in its own Admin tab. [default: own tab]
10. No Hypha-coupling code changes until G1's report and your ruling on it. [default: yes]
11. Island edge: one global offshore distance on all maps, tunable later in Make This Map
    Yours. [default: yes]

**Standing items only you can close (unchanged, consolidated from both programs):** rotate
`AUTH_TOKEN_SECRET` (leak §9 08-21; `ADMIN_PASSWORD` optional) · rotate the Alchemy RPC key ·
decide `AGENT_INTENT_WRITE` · enable `resources`/`introductions` when wanted · ElevenLabs spend
(Kokoro ships free otherwise) · tick the door census · bless the visual samples (map swarm's
four + M2's four when ready) · real hamlet/neighbourhood home counts.

---

## §6 Grounding update — scouts landed 2026-08-21 ~19:55 EDT (7 agents, 819K tokens, 0 errors)

Rye reframed crowdpool ("maybe just another page for viewing the crowdpool data you'd see on
regencivics.earth, more playful and game, following the living-map theme") and asked to deepen
the governance-audit plan before dispatching either. Six read-only scouts + a completeness critic
grounded both. Transcript: `subagents/workflows/wf_7ecac259-530/`. Every ref below is measured.

### 6.1 Crowdpool — the reframe is right, and the map already models it

**Headline (map-theme scout):** a crowdpool is ALREADY a first-class living-map concept. A
structure carries `state:'funding'` + `fund:0..1`; under 100% it "wears a GOLD RING showing the
percent," reads "gathering" under half and "under construction" above; a ✦ lantern "burns brighter
as build day comes near"; the sprite grows blueprint→wip→painted as it funds. Maia already says
*"the Ridge crowdpool crossed 72%"* and *"Crowdpooling you can watch become walls · funding
becomes walls"* (`grounds-v0.html` SCENE structure `state:"funding",fund:`). The playful page is a
**re-skin of existing hub data into an existing map metaphor**, not new economics.

**The data exists and is rich (cp-data / cp-public):** hub `campaigns` + `campaign_items` (needs)
+ `campaign_contributions` (pledges), `drizzle/schema.ts:1026`. Progress = `pledgedTotal/totalValue`
(`campaigns.ts:230`); per-need three-slot `quantityWanted/Claimed/Delivered` (`schema.ts:1187`) —
claimed = "ghost" reserve, delivered = "solid" — the natural fill animation; live "Pool Ledger"
activity feed (`campaigns.getActivity`, `campaigns.ts:1143`). A public **tRPC** read API already
serves all of it no-auth; four fully-worked demo campaigns exist (Harmony Valley richest,
`scripts/seed-demo-campaigns.ts`).

**Two hard decisions gate the whole page:**
1. **TRANSPORT.** The hub API is tRPC-only, **no CORS, no public REST/JSON export** (verified: no
   `cors` import in hub `server/`; only ACAO on `basemap.pmtiles`). A game-client cross-origin fetch
   is blocked. → **game-server proxy** to the hub's public tRPC (one cached route, no hub change,
   clears the SSRF-pinned dialer rule). Recommended over adding hub CORS.
2. **PRIVACY.** The hub page **shows per-pledge dollar amounts and non-anonymous names publicly**
   (`campaigns.ts:487`, `:1170`), which contradicts the game crowdpool spec's "amounts NEVER
   public" posture. Rye must choose mirror-as-is vs aggregate-only. → **aggregate-first**
   recommended (fits the map's poetic idiom AND is safer): gold ring, ripples, "N backers", capital
   coverage; names only where the hub already shows them and Rye opts in; never per-pledge amounts.

**Vocabulary corrections (spec is stale):** capitals are **9 not 8** (adds `health`,
`shared/capitals.ts:7`). Status lifecycle is **pending→accepted→fulfilled→thanked** (+rejected/
withdrawn/expired), NOT the spec's pledged→scheduled→fulfilled→released. Money never touches either
platform — fiat routes to Ma Earth (gifts) / GoSteward (loans) as partner CTAs; only crypto is
tracked. **Critical tension (critic):** the 9-capitals framework is ENTIRELY ABSENT from the living
map (`grep 'capital' grounds-v0.html` = 0; controls loom=221/flow=181). The map's economic
vocabulary is FLOWS (8 physical media) + the POOL/gold-ring; there is no "money" flow. So the page
paints needs in the **map's idiom** (pool fill, needs-shelf tiles tinted by capital colour, inbound
dashed flows = "a quest waiting to be written") rather than importing the hub's 9-segment
capital-stack bar wholesale. Do not graft the capitals scaffold onto the map — it breaks the map's
own vocabulary.

**Connections (Rye's points 2 & 3) — the join keys (game-library-roles):** material asks join on
library-item **identity** (`library_items.id/name/category_id/credit_value`, `0024_library.sql:28`),
NOT currency (library credits are `transferable:false, governance:'platform'` — sealed). Role asks
join to the **org-chart seat** system (`org_roles` + `org_role_assignments`, `0049_org_roles.sql:24`),
which already has a public `recruiting` flag and a documented→member claim flow — the "step into this
role" primitive — NOT the capability roles that gate `library_items.requires_role`. Two gaps: no
member self-donate route (intake is admin-only, `server/index.ts:13567`); the whole game-side
crowdpool surface is **greenfield** (module deferred D7).

**Re-scoped crowdpool v1 (a VIEW, not the deferred module):**
`[game-server proxy → hub public tRPC, cached]` + `[map-themed /campaign/:slug page: gold-ring
funding, sprite growth, Maia narration, needs-shelf, Pool-Ledger-as-pulse-ripples, Ma Earth/GoSteward
partner CTAs]` + `[a map door/pin on the /contribute building]` + `[connections as read-only SIGNALS:
a role-ask shows its matching org seat + claim link; a material-ask shows "in your village library"]`.
Admin funding-flows panel (point 4) and member pledge actions **stay on regencivics.earth**,
deep-linked (`/campaign/:id/manage` exists). No hub change, no new game tables in v1.

### 6.2 Governance — the audit is essentially DONE, and "optional" means two different jobs

The `gov-census` scout produced the route census Rye asked for. Verdict: **Amora already runs the
STRUCTURE of governance on-site.** On-site with no Hypha: roles (both planes), org seats with
apply/claim/lapse, the full quest create→claim→submit→consent loop, and bounded proposal authoring
with a constitution/ring scope model. **Hypha owns exactly two functions:** the binding **VOTE
tally** and the **AGREEMENT artifact**.

**The framing trap the critic caught — "make Hypha optional" is used two ways:**
- **HIDDEN** (config-gate off): nearly **FREE**. `hypha-reality` proved NO code synchronously calls
  a Hypha API — every touchpoint is a deep-link URL a human clicks or an inbound Base/Alchemy event
  listener, all gated on one var (`hypha.org_url`), hiding when blank. Proposal creation is already a
  human submitting Hypha's own form, and a human "verify & apply" fallback already ships
  (`server/index.ts:19879`). "Hypha for agreements only + manual verify" ≈ the **current live state**.
- **FUNCTIONALLY REPLACED** (do it on-site): requires **building two objects that do not exist**:
  (1) an executable **decision/tally engine** — no ballot/tally/quorum table or route exists;
  `decidesBy` (majority/consent/consensus) and `HOW_CHOSEN` (elected/rotates) are **display-only
  string enums** (`shared/power.ts`). A village can DECLARE it decides by majority; the platform
  cannot CONDUCT that majority. (2) a first-class **AGREEMENTS object** — today only
  `exit.agreement_ref` (a ≤255-char string pointer, `server/index.ts:12730`) + the Hypha
  create-agreement URL. No table, no create/sign/amend/status.

**Rye's own words point at REPLACE** ("handling all of governance and all the voting and the role
admissions... on our site directly"). So the recommendation writes itself: **build the on-site tally
engine + the agreements object; demote Hypha to an OPTIONAL quarterly export/attestation target**
(exactly his "reflect the verified truth quarterly, users aren't married to Hypha"), config-gated off
by default. `villageExport` already exists for org/seat data (PR #33) — the attestation bones are
there.

**Ask 3 converges with this:** the role-apply flow EXISTS but is thin (`raise-hand` writes to the
stewards' inbox, `server/index.ts:8490`). The wizard (deliverables → pay-split sliders → fit →
admin/vote) is its on-site hardening, and its final "goes up publicly for voting" step **is** the
missing tally engine. Sequence: design tally + agreements first, build the wizard on top.

**Best route to the audit (revised):** the scouts already delivered the census, so a big 4-journey
audit fan-out is **unnecessary**. Write the audit as a report from these findings (done), then open a
**DESIGN lane** for the two missing objects — not another audit lane. This saves a whole round.

### 6.3 New questions for Rye (from the grounding; defaults in brackets)

- **C1 Transport:** game-server proxy to the hub's public tRPC (no hub change). [yes]
- **C2 Privacy:** aggregate-first on the game page — gold ring, ripples, backer counts, capital
  coverage; never per-pledge amounts even though the hub shows them; names only where the hub already
  does and you opt in. [aggregate-first]
- **C3 Home:** a themed `/campaign/:slug` page + a map door/pin first; a full living-map "Raising"
  lens later. [page + pin first]
- **C4 First campaign:** build against the Harmony Valley demo as the dev fixture; do you have a REAL
  campaign to point the first village at, or ship against demos for now? [demos for now]
- **C5 Connections:** roles/materials surface as read-only SIGNALS in v1 (matching org seat + claim
  link; "in your village library"); admin panel + pledging stay on the hub, deep-linked. [yes]
- **G1 The big one:** "governance on our site" = **HIDE** Hypha (nearly free, ship now, keep manual
  verify) or **REPLACE** its function on-site (build tally engine + agreements object)? Your
  screenshots read as REPLACE. [replace, staged]
- **G2 If replace:** next lane is a DESIGN for the on-site decision/tally engine (behind the
  `decidesBy` labels) + a first-class agreements object, with Hypha as an optional quarterly export.
  [yes]
- **G3 Sequencing:** design tally + agreements before building the ask-3 role wizard, since the
  wizard's public-vote step depends on the tally engine. [yes]

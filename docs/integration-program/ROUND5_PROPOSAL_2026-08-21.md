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

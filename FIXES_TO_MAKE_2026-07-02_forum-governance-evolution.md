# Fixes to Make — 2026-07-02 — Forum Governance Evolution

This document is a build spec, not just a bug list. It reshapes how a forum thread
enters and moves through the governance pipeline (Dialogue → Sensing → Proposal →
Decision) so that casual chat stays light and only threads that are genuinely
becoming decisions carry governance chrome.

Grounding principle: **"dialogue" is not stage one of the pipeline, it is "not in
the pipeline yet."** Before a thread enters governance, show no strip, just a quiet
way in. After it enters, show the full strip on a legible surface.

The Sensing/Proposal machinery already built (`PerspectiveControl.tsx`) is strong:
a five-point gradient of agreement (support → can live with → see differently →
need to understand → serious concern), a weighted tally bar, and a "Block active"
state. Most of the additions below build on that rather than replace it.

> **Amended 2026-07-03 after whole-build review.** Verified against the code: none of
> Fixes 1–8 were actually coded (the governance components are identical on the Windows
> working copy, the WSL2 clone, and `origin/main`), so every status below was reset from
> CODED-PENDING to TO BUILD. Fix 4's root cause was corrected, Fix 10 folded into the
> Assembly build, Fix 11 added (stage advancement), and the handoff section rewritten to
> match the verified environment. Companion spec: `ASSEMBLY_PAGE_SPEC.md`. How the two
> builds share one pipeline: see "Relationship to Assembly" below.

## Relationship to Assembly (read before building Fix 2)

`ASSEMBLY_PAGE_SPEC.md` gives forum threads a second escalation path
(`assembly.raiseFromThread` → `proposals` → the Signal → Hypha) alongside the existing
"Promote to decision" pipeline (`forumPromotionRequests` → `forumPostDecisions`). Working
decision (Rye can veto): **Assembly's raise flow becomes THE promotion door.** Until
Assembly ships, Fix 2 keeps the existing "Promote to decision" behavior unchanged; when
Assembly's Phase 4 lands, the same button opens the Assembly raise flow. Do not build a
third door. The 5-point PerspectiveControl stays as the *thread-level* sensing
instrument; Assembly's −3..+3 Signal is the *proposal-level* instrument.

---

## Fix 1 — Gate the lifecycle strip (stop showing it on casual threads) (High)

**Status:** CODED. Evidence: CommunityPost.tsx:662 renders governance chrome only when `inGovernance`; GovernanceLifecycleStrip.tsx:85 `if (!inGovernance) return null`.

**Symptom:** The four-stage strip plus "Ready to sense the room?" renders on every
thread, including chit-chat, because the stage defaults to "dialogue". It reads
heavy and competes for attention. Flagged repeatedly in prior audits.

**Root cause:** `GovernanceLifecycleStrip.tsx:71` does `governanceStage ?? "dialogue"`,
and the strip is rendered unconditionally in `CommunityPost.tsx:609-619`.

**Fix:** Only render the strip when the thread has actually entered governance, i.e.
`governanceStage` is one of `sensing | proposal | decided`. When the stage is null
or `dialogue`, render no strip. The entry into governance moves to a quiet action
row (Fix 2).

**Files:** `client/src/pages/CommunityPost.tsx`, `client/src/components/governance/GovernanceLifecycleStrip.tsx`

---

## Fix 2 — Two quiet entry doors under the post (Medium)

**Status:** CODED. Evidence: CommunityPost.tsx:685-716 ("Sense the room" beside "Promote to decision" in the action row); migration 0163 applied, `governance.sensing_min_citizen_tier` verified = 0 in prod DB.

**Symptom:** Entry into governance is currently a prominent in-strip prompt on every
thread. It should be a low-key option under the post, since most threads never enter
the pipeline.

**Decision (Rye):** Keep **two** doors, not one. Some threads are obviously ready to
go straight to a decision without a sensing round.

**Fix:** In the dialogue/no-stage state, expose two quiet text actions under the post.
Note the current layout: "Promote to decision" sits in its own block next to the
decision banner (`CommunityPost.tsx:624-636`), while "Copy link" and "Propose as Quest"
live in the Post Actions row (`CommunityPost.tsx:651-697`). Merge or align them so the
two governance doors read as one quiet group:

- **"Sense the room"** — advances the thread to Sensing (`forum.enterSensing`).
- **"Promote to decision"** — the existing jump straight to Proposal/Decision (keep as
  is for now; repointed at the Assembly raise flow when Assembly Phase 4 ships, see
  "Relationship to Assembly" above).

Both remain available in dialogue. "Sense the room" moves out of the strip and into
this row. Permissions: **anyone signed in can advance** for now (Rye's call, revisit
later if abused).

**Server gate to align:** `forum.enterSensing` (server/routes/forum.ts:837) enforces
`governance.sensing_min_citizen_tier`, seeded to 1 (citizen) in `drizzle/0146`, fallback
1 when unset. "Anyone signed in" requires setting that variable to **0** (config flip in
the DB, no deploy). Without it, tier-0 users see the door and get a 403.

**Files:** `client/src/pages/CommunityPost.tsx`, `client/src/components/governance/GovernanceLifecycleStrip.tsx`

---

## Fix 3 — Confirm + undo on "Sense the room" (Medium)

**Status:** CODED. Evidence: CommunityPost.tsx:686 inline confirm before `enterSensing`; server `forum.returnToDialogue` at forum.ts:867 clears sensingStartedAt/By.

**Symptom:** `enterSensing.mutate` fires immediately on click
(`GovernanceLifecycleStrip.tsx:161`) and advances the stage for everyone viewing the
thread. One accidental tap moves a casual thread into governance for all viewers.

**Fix:** Guard the click two ways:

1. **Confirm** before advancing ("Start sensing the room on this thread? This invites
   everyone to share where they stand.").
2. **Undo** afterward. Undo semantics are **participation-aware** (see Fix 8): clean
   and silent while no one else has sensed; once others have weighed in, undo becomes
   a transparent, logged "return to dialogue" rather than a silent erase.

**Implementation detail:** `enterSensing` sets `sensingStartedAt`/`sensingStartedBy`
with `COALESCE` (forum.ts:857-858), so after an undo those columns keep the original
starter. `forum.returnToDialogue` must clear both columns on a clean (no-participants)
undo so a later re-entry attributes correctly. Existing `forumPerspectives` rows are
kept in both cases; they reappear if sensing restarts.

**Files:** `client/src/components/governance/GovernanceLifecycleStrip.tsx`, `client/src/pages/CommunityPost.tsx`, server `forum.enterSensing` router (add a matching `forum.returnToDialogue`).

---

## Fix 4 — Fix link contrast on the light post card (High)

**Status:** CODED. Evidence: GovernanceLifecycleStrip + PerspectiveControl rebuilt on light palette (border-[#e8e4de], text-[#1a472a]/[#4a7c59]); action links now text-[#4a7c59] hover:text-[#1a472a].

**Symptom:** The governance actions and prompt render dark-on-dark / faint and are
barely legible on `/community/post/*`. Most important visual complaint in the
2026-06-25 sweep.

**Root cause (corrected 2026-07-03):** There is no page overlay problem. The page is a
dark gradient and the post card is plain `bg-white` (`CommunityPost.tsx:457`). The real
cause: `GovernanceLifecycleStrip` AND `PerspectiveControl` are dark-surface components
(`text-white/50-80`, `bg-white/[0.03]`, `border-white/10`) rendered *inside* that white
card, so they are nearly invisible. The `text-[#7dd87d]` action links (e.g.
`CommunityPost.tsx:629`) add a milder low-contrast case on white.

**Fix:** Restyle both governance components for the light surface (dark-green text tiers
like the rest of the card: `#1a472a` / `#4a7c59`, light borders like `border-[#e8e4de]`),
or wrap the governance chrome in its own dark container so the existing styling reads.
Entry links on the light card shift from `text-[#7dd87d]` to `#4a7c59` or `#1a472a`.
PerspectiveControl is the most illegible piece; include it, not just the strip.

**Files:** `client/src/pages/CommunityPost.tsx`, `client/src/components/governance/GovernanceLifecycleStrip.tsx`, `client/src/components/governance/PerspectiveControl.tsx`

---

## Fix 5 — Tooltip on "Sense the room" (Low)

**Status:** CODED. Evidence: CommunityPost.tsx:712 title="Gauge where we stand as we move to a formal proposal."

**Symptom:** "Sense the room" is in-voice but out of context does not read as "start a
group decision process".

**Decision (Rye):** Keep the label "Sense the room". Add a tooltip.

**Fix:** Add `title` / hover text: **"Gauge where we stand as we move to a formal
proposal."**

**Files:** `client/src/pages/CommunityPost.tsx`, `client/src/components/governance/GovernanceLifecycleStrip.tsx`

---

## Fix 6 — Name the consent bar: "good enough for now, safe enough to try" (Low)

**Status:** CODED. Evidence: GovernanceLifecycleStrip.tsx:36 proposal description carries "good enough for now, safe enough to try"; can_live_with helper matches.

**Rationale (research):** Sociocratic consent is defined as "no objections", and the
working test groups use is "good enough for now, safe enough to try". Groups stall when
they think advancing requires everyone to love it. Your `can_live_with` option already
encodes this ("Not my first choice, but I won't block it").

**Fix:** Add framing microcopy at the Proposal stage (in the strip's proposal
description, or above `PerspectiveControl`) that states the bar is not unanimous
enthusiasm, it is safe-enough-to-try. One line of copy.

**Files:** `client/src/components/governance/GovernanceLifecycleStrip.tsx` (STAGE_CONFIG proposal description) or `client/src/components/governance/PerspectiveControl.tsx`

---

## Fix 7 — Make concerns vs objections legible (Low)

**Status:** CODED. Evidence: PerspectiveControl.tsx:108,173 (block tooltip + legend); PromotionModal sensing-context notice when a serious concern is active.

**Rationale (research):** In consent-based governance a concern is not a block; only an
objection blocks. The system is already half-built: `serious_concern` triggers "Block
active" (`PerspectiveControl.tsx:95,103-107`), the other non-support options do not.

**Fix:** Near the promote/decide action, make the distinction legible: a block reads as
"must be resolved before we proceed", while "see differently" and "need to understand"
read as signal that informs but does not veto. Copy + light visual treatment, no data
model change.

**Files:** `client/src/components/governance/PerspectiveControl.tsx`, `client/src/components/governance/PromotionModal.tsx`

---

## Fix 8 — Participation-aware undo / return to dialogue (Medium)

**Status:** CODED. Evidence: forum.ts:867 returnToDialogue counts other distinct voices; posts a visible reply via db.createForumReply when others > 0, silent otherwise.

**Rationale (research):** Shared state that others have touched should not vanish
silently. Consent culture: do not unilaterally erase input others have contributed.

**Fix:** Undo (Fix 3) is clean and silent only while no one else has sensed. Once one or
more other people have set a perspective, replace silent undo with a transparent, logged
"return to dialogue" action visible on the thread. Requires a count of distinct
participants on the thread (already derivable from perspective tallies).

**Where the log lives:** a system reply on the thread ("<name> returned this thread to
dialogue"), same server-side authored-post pattern the elder bot uses. No new table.

**Files:** server `forum` router (add `returnToDialogue`, read participant count), `client/src/components/governance/GovernanceLifecycleStrip.tsx`

---

## Fix 9 — Show participation before allowing a decision (fast follow) (Medium)

**Status:** CODED. Evidence: CommunityPost.tsx:680 "N people have weighed in" near Promote; PromotionModal shows the same count inside the modal.

**Rationale (research):** A decision with one voice is not legitimate. Rye chose
"anyone can advance", so add a soft social check rather than a gate.

**Fix:** Keep promotion open, but show how many have sensed the room and softly flag
thinness ("2 people have weighed in") near "Promote to decision". No hard block. Pairs
with the confirm in Fix 3.

**Files:** `client/src/components/governance/GovernanceLifecycleStrip.tsx`, `client/src/components/governance/PromotionModal.tsx`

---

## Fix 10 — Timezone-fair minimum open window before a decision closes (Medium)

**Status:** FOLDED INTO ASSEMBLY (2026-07-03)

**Rationale (research):** Lazy-consensus practice (Apache 72h, others up to 2 weeks)
gives everyone across time zones a chance to weigh in before a proposal closes.

**Resolution:** This is the same concept as Assembly's `governance.last_call_hours`
(48h default) and `governance.minor_lane_quiet_days` windows. Build it once there
(`ASSEMBLY_PAGE_SPEC.md` sections 2, 10) instead of twice. No separate forum-side
migration.

---

## Fix 11 — Advance governanceStage past Sensing (High, added 2026-07-03)

**Status:** CODED. Evidence: governance.ts:229 coSignPromotion sets governanceStage=proposal; CommunityPost derives decided/proposal from getDecisionStatus (effectiveStage).

**Symptom:** Nothing on the server ever sets `governanceStage` to `proposal` or
`decided`; the only transition in the codebase is `dialogue → sensing`
(`server/routes/forum.ts:856`). Once Fix 1 gates the strip, a promoted thread's strip
sits on "Sensing" forever while the decision banner below it shows the real state.

**Fix:** Set `governanceStage = 'proposal'` when a promotion request is cosigned (the
point a `forumPostDecisions` row goes live), and `governanceStage = 'decided'` when the
decision reaches a terminal status (ratified / declined / cancelled). Wire both into the
existing promotion + decision-status code paths in `server/routes/governance.ts`; no
schema change (enum already has all four values).

**Files:** `server/routes/governance.ts`, possibly `server/lib/hypha-bridge/webhook-receiver.ts` for the ratified transition.

---

## Explicitly out of scope (parked)

- **Auto-suggesting governance after N replies.** Tempting, but it reintroduces exactly
  the noise Fix 1 removes. Not now.
- **Restricting who can advance.** Left open (anyone signed in) by decision. Revisit only
  if it gets abused.

---

## Priority order

1. Fix 1 (gate the strip) + Fix 4 (contrast) — the visible wins, do together.
2. Fix 2 (two doors) + Fix 5 (tooltip) — the new entry, small.
3. Fix 3 (confirm/undo) + Fix 8 (participation-aware undo) — the safety guard.
4. Fix 11 (stage advancement) — makes the gated strip truthful after promotion.
5. Fix 6 (consent bar copy) + Fix 7 (concerns vs objections) — cheap culture wins.
6. Fix 9 (participation count) — fast follow. Fix 10 lives in the Assembly build.

---

## Handoff Breakdown — Who Does What (rewritten 2026-07-03)

Verified from the WSL2 build session: the Railway DB is reachable, GitHub push
credentials are stored, and the Railway CLI is logged in. Rye authorized migrations for
this build run. So Claude Code owns the whole loop per `CLAUDE.md`: build → test → ship
gate → migrate → commit → push → poll Railway to SUCCESS.

### YOU (Rye)

| # | Task | Where |
|---|------|-------|
| A | Eyeball the live thread on regencivics.earth (signed-in session) | `/community/post/*` |
| B | Veto window on the one-door decision (see "Relationship to Assembly") | this doc |

### CLAUDE CODE — the build

| # | Task | Status |
|---|------|--------|
| 1 | Gate the lifecycle strip to sensing+ | CODED |
| 2 | Two entry doors + tier variable flip to 0 | CODED |
| 3 | Confirm + undo on "Sense the room" | CODED |
| 4 | Light-surface restyle of strip + PerspectiveControl + links | CODED |
| 5 | Tooltip on "Sense the room" | CODED |
| 6 | Consent-bar framing copy at Proposal | CODED |
| 7 | Concerns vs objections legibility | CODED |
| 8 | Participation-aware return to dialogue (+ server `returnToDialogue`) | CODED |
| 9 | Participation count near promotion | CODED |
| 10 | Folded into Assembly build | MOVED |
| 11 | Advance governanceStage on promotion / decision close | CODED |

---

## Ship gate (before any VERIFIED claim)

```bash
python3 scripts/audit-truncation.py
rg -g '*.css' '<new-className>' client/src/
pnpm typecheck
```

Plus `pnpm check` and `pnpm test` per STEERING.md before push.

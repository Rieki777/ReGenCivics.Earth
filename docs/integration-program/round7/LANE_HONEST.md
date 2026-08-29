# Lane HONEST — four places the product still says something that is not so, and one contract

**Read `../round6/BUILD_HOUSE_RULES.md` first.** Both files bind.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-honest`, branch `wt/r7-honest`, from `origin/main` at
**`a9f55de`**, deps installed, `.env` present. **Migration `0108` if you need one. Only 0108.**

Each item below was measured by a round-6 lane and deliberately left, with the reason recorded.
**Re-verify every one before acting; several are days old and the tree moved seven PRs tonight.**
**If an item turns out to be wrong or already fixed, do not do it — say which and why.**

---

## 1 · A live dial that nothing honours

`server/index.ts` around line 2677, `currentCycleId()`, returns a `YYYY-MM` id when
`gratitude.cycle_mode = "month"`. **It has zero callers.** The dial is live in the admin panel and is
reported to the client at `/api/game/rules` as `cycleMode`, **so a village can switch its whole
gratitude rhythm to calendar months and nothing anywhere changes.** The product states a rhythm it
does not keep.

Found by the cycle lane while unifying two clashing cycle-id formats, and correctly left alone
because it was outside that lane's zone.

**Two honest answers, and choosing between them is yours to argue:** wire it, so the dial does what
it says; or retire it, so nothing offers a choice the engine cannot make. **Wiring it is the larger
change and it touches an economy that PR #96 just repaired**, so if wiring it means reopening the
cycle-id work, retire it instead and say so. **What is not acceptable is leaving a switch a founder
can flip that does nothing.**

Note the related deliberate decision, which you must not undo: legacy `YYYY-MM` rows are **not**
remapped by migration 0105, because there is no honest way to compute a lunation from a calendar
month, and a village holding them now meets a refusal naming the ids rather than a silently wrong
total.

## 2 · A public route that will publish whatever an admin pastes into it

`GET /api/investor-summary` is **public** and echoes the whole admin-authored document verbatim,
including its `cta_url` field. **So pasting a vault document's URL into that field publishes it**, and
the vault's whole posture is that a link is a bearer credential.

Found by the investor lane while enumerating every other door into the vault, and correctly reported
rather than fixed because it is a different route.

**The fix is a validation, not a gate**: that field is a call-to-action link and it should refuse to
be an uploads-volume path. Read how PR #91 decided what may leave the vault and match its posture.
**Say clearly what you refuse and why, in the founder's words rather than a validation error** — an
admin who pastes a vault link is trying to do something reasonable and deserves to be told why it
cannot be that link.

## 3 · A warning nobody can see

A warning badge that denies `ballot.vote` removes a member from the electorate of every ballot opened
afterwards, and **the badge is invisible on her own badge surface** — proven by a control in the same
run, where a granted badge on the same member renders. So she is quietly removed and the product
gives her nothing to read.

PR #92 fixed the other half of this: the vote refusal no longer claims the roll "froze when it
opened" when the real cause is a badge. **This half is the badge itself.**

**A member must be able to see a warning that is affecting them.** What is NOT yours: whether a
warning may deny `ballot.vote` at all is a founder ruling and it is on his list. Build the visibility;
do not change the deny.

**R56 governs the copy**: state what is true and get out of the way. A warning that is visible is a
fact she can act on. A warning that scolds is an argument. And she should be able to tell who issued
it and when, because a record she cannot read is not a record.

## 4 · A door nobody can open

PR #93 shipped `answersObjectionId` on the mechanics open-ballot route, so a proposer can name which
objection their new proposal answers, and the objection then says "The proposal changed after this."
**The field has no client sender.** The only caller of open-ballot is `GameMechanics.tsx`, which
belonged to another lane at the time, so G-E correctly declined to reach for it and reported the gap
in the open.

**This is the missing-trigger class, created deliberately and named at birth.** A proposer-side picker
plus one body field is the whole door.

**Two constraints from the lane that built the write path:** the field is **optional** and must stay
optional, because a proposer who does not name an objection must still be able to open; and **a name
that cannot be honoured is refused with a sentence** rather than dropped, so your picker must only
offer objections the server will accept.

**Free rider, if it is genuinely two lines:** G-E also noted that putting `ledToBallotId` into
`objectionsFor`'s map and `serveBallot`'s objections map would let `ObjectionPanel` drop its own
fetch. Take it only if it is as small as described; otherwise leave it and say so.

## 5 · The contract, and this one carries a commercial consequence

**The module contract version was deliberately not bumped when R59 landed.** Clause 14 fixes the
eligibility rule; R59 changed it, so **platform-built modules now earn and their share recycles into
the pool.** The founder's default, stated and unanswered, is: **bump it and record the change in the
contract's own history.**

`node scripts/module-facts.mjs` reports the contract version from both
`docs/MODULE_LIBRARY_CONTRACT.md` and the `shared/modules.ts` constant, and **they must agree** —
that agreement is itself checked.

**Say plainly in the contract's history what changed for an outside builder**, because this is a
change to what someone gets paid: their share shrinks in proportion to how much platform-built
modules are used, which today is nearly all of it. **Do not soften that.** The founder ruled the
recycling must be visible precisely so nobody discovers it by arithmetic.

**If bumping the version turns out to require a migration or to break a listing, stop and tell me.**
This is the one item here with a consequence outside the codebase.

## 6 · Your zone

**Yours:** `server/index.ts` at `currentCycleId` and the investor-summary routes **only**; the badge
surfaces under `client/src/`; `client/src/pages/GameMechanics.tsx` and
`client/src/components/governance/ObjectionPanel.tsx`; `docs/MODULE_LIBRARY_CONTRACT.md` and the
version constant in `shared/modules.ts`.

**Two lanes are live in this repo:**
- **CARRY** holds `client/src/components/GameDashboard.tsx` and the **quest-board story section** of
  `client/src/pages/Admin.tsx`.
- **PRIVACY** holds `client/src/pages/ProjectHistory.tsx`, the `FRONTEND_URL` and feedback-hub
  defaults in `server/index.ts`, and whatever admin surface it adds.

**Touching `shared/modules.ts` fires two extra path-gated CI workflows** (`module-intake.yml` and
`module-review-agent.yml`). Run both locally before you push; they are cheap and they block.

## 7 · Gates and reporting

The standard eighteen-step set plus those two. `check-save-honesty` and `check-admin-reach` apply to
anything admin-facing. **Write each regression test first and watch it fail.** `pnpm build` can exit 0
while `dist/index.js` carries the previous commit; check the SHA in the artifact.

Report in the house-rules block, and **state per item: built, refused, or already fixed**, with the
evidence for each. Status stops at CODED.

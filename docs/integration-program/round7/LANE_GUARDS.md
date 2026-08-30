# Lane GUARDS — a link that runs code, a capability that should never have been deniable, and a comment that stops a future tidy-up

**Read `../round6/BUILD_HOUSE_RULES.md` first.** It binds.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-guards`, branch `wt/r7-guards`, from `origin/main` at
**`855075a`**, deps installed, `.env` present.
**Migration `0114` if you need one. Only 0114.** You probably need none.

**Three items from R82. The first is a live security defect on a public surface and it goes first.**

**Every premise below is a hypothesis I measured myself at `855075a`. Re-measure them. If one is
wrong, say which and why, and do not do it.** A lane in this round falsified a coordinator count an
hour ago and saved eleven correct strings from being rewritten.

---

## 1 · The `javascript:` hole. R82 item 7.

**Round 7's HONEST lane built a validation on `cta_url` that closes a real leak and does not check
the scheme.** Both halves of that sentence are true and the second one is now the defect.

What exists, at `server/index.ts` near 20384: `vaultLinkProblem` refuses a call-to-action pointing at
`/api/uploads/`, because the vault has no auth of its own and the link IS the credential. It parses
with `new URL(raw, "http://village.invalid")` so browser dot-segment normalisation cannot dodge it.
**That guard is good and you keep all of it.**

What it does not do: **look at the scheme.** `javascript:alert(1)` parses, its pathname is not under
`/api/uploads/`, so it saves. **And `GET /api/visit-config` and `GET /api/investor-summary` are both
PUBLIC and echo the whole document back**, `cta_url` and all, which the client renders as an anchor.

**Verify that end to end before building.** Find where the client renders these into an `href`. If
something downstream already strips the scheme, the hole is smaller than I think and I want to know.
**Prove it either way against a known-present control in the same command.**

**Rye ruled the shape: an allowlist of `http`, `https`, `mailto`, and same-origin relative paths.**
Note that this is wider than the neighbouring journey-resources route, which takes `http` and `https`
only. **Both are correct for their own surface and you are not here to unify them**, though if you
find a third link field with no check at all, that is a finding and I want it named.

**The sweep is by field name across the whole document, not by a path somebody wrote down.** That
principle is already in the code above `vaultLinkProblem` and it is there because `visit_types` is an
array of objects each carrying their own `cta_url`. **Whatever you add meets a third one on the day
it is added.**

**And close the consequence, not only the field.** A change to what a link field accepts has readers:
anything that renders these, anything that tests them, any admin copy telling somebody what to paste.
**The reported sites are a floor.**

## 2 · Split the two proposal keys. R82 item 1.

`shared/capabilities.ts` carries both `proposal.open` and `mechanics.propose`. **They are treated the
same today and they should not be.**

- **`mechanics.propose` becomes NON-DENIABLE.** Proposing a change to the Game's own rules is the
  say itself, one step earlier. Denying it is total, and R65 removed the power to deny a voice.
- **`proposal.open` stays deniable.** The deny leaves drafts and the forum intact, so a member keeps
  every way of being heard, and a village needs some remedy against ballot flooding. **The remedy
  that does not name anybody is a per-member-per-cycle limit, which already exists as a dial.**

**Lane VOICE landed in this file in round 7 (#100) and removed the ballot.vote deny.** Read what it
built before adding to it, and follow its shape rather than inventing a second mechanism. **If VOICE
already made one of these non-deniable, say so and do not do it twice.**

## 3 · The seat-history route stays stricter, and says why. R82 item 3.

The seat-history route is more restrictive than `/api/org`, and that asymmetry is deliberate: a
current seat is a fact about the village, and a history of who held it is a fact about people.
**Nothing to build. Write the reason into the route as a comment** so the next tidy-up lane reads it
as a decision instead of closing it as an inconsistency.

**Find the route yourself and quote what you found.** If it turns out the two are already equally
strict, then my premise is wrong and the note is the deliverable.

## 4 · Your zone

**Yours:** `server/index.ts` (the visit-config and investor-summary link validation, and the
seat-history route comment), `shared/capabilities.ts`, and whatever client renderer turns a
`cta_url` into an `href`.

**Live lanes right now:** DIALS holds `client/src/pages/GameMechanics.tsx` and the
`platform.feedback_relay` entry in `shared/gameVariables.ts`. CAPS holds the gratitude dials in the
same file and is mid-flight. DOORS holds `client/src/components/modules/ModuleCard.tsx`,
`Modules.tsx`, `ModuleDetail.tsx`, `App.tsx` and `JourneyToLaunch.tsx`. **Ask before crossing.**

**A read-only audit is sweeping every token-issuing path in this repo right now.** It changes
nothing. If you see agents reading `server/lib/gameStart.ts` and the faucets, that is why.

## 5 · Gates and reporting

Standard set, enumerated from `.github/workflows/` yourself. **`shared/capabilities.ts` fires two
extra path-gated workflows. Run both locally before you report.**

**Write the tests first and watch them fail.** The one that matters most: **a `javascript:` URL in
every link field the sweep covers is refused, and a `mailto:` and a relative path are accepted.**
Include the dodges: uppercase scheme, leading whitespace, embedded newline, and `java\nscript:`.

Report in the house-rules block, plus **every link-accepting field you found and whether each one
checks its scheme.** Status stops at **CODED**. Nothing pushed or merged without me.

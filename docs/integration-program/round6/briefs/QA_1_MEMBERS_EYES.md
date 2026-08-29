# QA-1 · The member's eyes

**Read `../QA_HOUSE_RULES.md` first. Both files bind.**

Worktree: `C:/Users/taren/Desktop/Amora/wt-r5-qa1`, detached at `b5bed01`, deps installed, `.env` present.
Scratch directory: `C:/Users/taren/Desktop/Amora/wt-r5-qa1/.qa1/` (gitignore it or never stage it).
Scratch schema name: **`village_qa6_1`**. Probe scripts: `scripts/qa/r6-member/**` inside your worktree.

---

## Objective

**Drive the running product as a person, on a phone and on a desk, and find every place where the
product says something that is not true, offers a control that does not do what it says, or leads
someone into a dead end.**

Not a code review. Not a diff read. **You are a member of a village using this thing.** You have a
phone in one hand. You want to know what your village decided, whether your vote counted, what is
happening this week, who holds which seat, and whether the thing you just did actually happened.

This is the pass that catches the class code review cannot see. In round 5, **six times a fully
green surface said something false** and only a person looking at it caught it.

## The harm you are hunting, in priority order

1. **A sentence that is FALSE.** The product tells someone a thing that did not happen, or describes
   a state that is not the state. This is the top of the list and it is not close. Read every
   sentence on every surface as a person who will believe it. Round 5 shipped a panel reading *"This
   village does not carry write an agreement by vote today"* and a decision that CARRIED reading
   *"Did not carry"*.
2. **A control that does not do what it says.** Press it (on LOCAL only, never live) and check the
   server agrees. A "Saved!" that saved nothing. A "Sent" that sent nothing. A button that reports
   success from a `catch` block.
3. **A control nobody can press.** Covered by the mobile tab bar, covered by a sheet, under 44px,
   off-screen at 360 wide, or painted over by a neighbour. **Use `elementFromPoint` at the control's
   own centre and look at the screenshot.**
4. **A dead end.** A page with no route onward except browser back. A link to a route that 404s. A
   promise ("you will hear back", "an admin will review this") with nothing behind it.
5. **Nonsense on the page.** Overlapping text, rows painting over their neighbours, a grey
   placeholder where an image should be, a verb phrase dropped into a sentence slot, `undefined`,
   `NaN`, `[object Object]`, a raw id where a name belongs.
6. **R55 and R56 breaches in copy.** A percentage-incomplete, a countdown, a nag, a scorecard, a
   warning that argues rather than states. The handover surfaces (`/powers`, the runway, succession)
   are where this will show up.

## Where to walk

**Signed out on LIVE first.** `/`, `/visit`, `/stay`, `/map`, `/events`, `/team`, `/circles`,
`/roles`, `/how-we-create`, `/modules`, `/decisions`, `/powers`, plus every link you find from those.
Round 5's PR #66 made the village's people public by default (R57), PR #78 rewrote the sign-in wall,
and PR #90 added a register path to four hand-rolled cards. **Those three are LIVE, signed-out,
first-impression surfaces and they are your highest-value walk.**

**Then LOCAL, signed in as an ordinary member** (not admin), against your scratch schema with
`governance`, `crowdpool`, `resources` and `introductions` **turned ON** — they ship OFF on live, so
live tells you nothing about them. Round 5 built most of its governance work behind those.

Walk, at minimum, every surface these round-5 PRs claim:

- **The vote as a moon and silhouettes** (#62). Does the drawing match the tally? Count the
  silhouettes against the numbers.
- **The decisions rail** (#69) and **"when a vote binds"**. Is the sentence true for a ballot that
  carried, one that was called off, one that missed quorum (#71), and one nobody voted in?
- **Practice votes** (#65) and **opening a vote from the page you decide on** (#76).
- **`/powers`** (#75, #83, #85, #87, #88). What a village holds, with **no percentage and no "N of
  M" anywhere**. Check that claim yourself at zero powers and at several.
- **The mask room** (#63) — the personal re-skin. Does it survive a reload? Does dragging it write
  anything into the village's shared edit log? (R53: it should not.)
- **Place photographs** (#64) on the map.
- **The one clock** (#77) — the balance cache and the voting window agree.
- **"Saved" asks the server first** (#89, #90). This is the whole point of two PRs. **Find a surface
  that still lies**, and find one that now tells the truth, and report both.
- **The sign-in wall says what is behind it** (#78).

## Viewports and engine

Playwright **WebKit**, iPhone 14 descriptor, DPR 3, touch, iOS UA. **Mobile first**: 390x844,
390x664 (URL bar showing), 375x812, and 360 wide. Desktop second at 1280x800. Reuse
`scripts/qa/lib.mjs` (`baseUrl`, `tokenKey`, `contextFor`, `reportUnmeasured`) — extend the profile
list in **your own copy**, never in `lib.mjs`.

## The bar for a finding

**A screenshot, or it did not happen** for anything visual. A DOM assertion alone is how round 5
shipped rows painting over their neighbours with 34 green assertions.

Conversely: **an honest "I walked this and it was right" is a real result.** §5 item 2 of the house
rules. List what you walked and found true.

## What is NOT yours

- Do not fix anything. Not one character.
- Do not diagnose causes. Describe what happens.
- Do not report anything in house-rules §7.
- The adversary pass (QA-2) owns attacks on invariants; the operator pass (QA-3) owns admin controls
  and the fresh-fork experience. **If you stumble into one of theirs, write one line and move on** —
  duplicate deep-dives across three lanes is exactly what we are avoiding.

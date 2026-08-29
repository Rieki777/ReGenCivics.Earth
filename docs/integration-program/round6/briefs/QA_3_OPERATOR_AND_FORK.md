# QA-3 · The operator and the fork

**Read `../QA_HOUSE_RULES.md` first. Both files bind.**

Worktree: `C:/Users/taren/Desktop/Amora/wt-r5-qa3`, detached at `b5bed01`, deps installed, `.env` present.
Scratch directory: `C:/Users/taren/Desktop/Amora/wt-r5-qa3/.qa3/`.
Scratch schema name: **`village_qa6_3`**. Probe scripts: `scripts/qa/r6-operator/**` inside your worktree.

---

## Objective, in two halves

**Half one, the operator.** For every control this platform offers a founder or admin, answer two
questions: **does it actually save, and does anything READ what it saved?**

**The worst defect in this class is a save that lands where nothing reads it.** No error anywhere,
a green toast, and the founder's afternoon silently gone. Round 5 found **twenty-seven dead admin
editors** by this test, and the root cause generalises: an admin surface is dead when its WRITE goes
to a generic document store (`app_config['content']`, `journey-state`, `brand.*`, `village_brief`)
instead of the table its renderer selects from. **Every wired surface writes the row the public page
reads.** The two are indistinguishable in the admin UI: same Save button, same green toast, same
"Changes save to the server and go live immediately".

**Half two, the fork.** A fresh village clones this platform with nothing configured. **Does it get
an honest product?** Not a polished one. An honest one: nothing claiming to be configured that is
not, no Amora content leaking in as if it were theirs, no placeholder published as settled terms, no
surface that only makes sense once someone has filled in a form they were never shown.

The sharpest known instance: **the exit policy renders three blocks that have NO admin field, while
offering a checkbox that removes the "these are placeholders" warning — so a village can publish the
platform's boilerplate as its own settled terms.** Check whether that is still true, and hunt its
siblings.

## Half one · the operator sweep

Round 5 shipped PRs #68 (members list order, field names), #84 (orphan files a founder can see and
remove), #86 (module usage metering and the pool's own share), #90 (a save-honesty gate), #89 (every
surface that says "saved" asks the server first). **PRs #89 and #90 exist entirely to close this
defect class, so this pass is the check on whether they actually closed it.**

Method, on LOCAL against your scratch schema:

1. **Enumerate every admin control.** Every tab in `Admin.tsx`, every Game Mechanics dial, every
   Journey Content tab, the Setup Wizard, Village Brain, Project History, the module library's
   turn-on and go-live flow, Events admin, Voting weights, the orphan sweep, the investor vault,
   the photo curation queue, brand and Look. **Ask "enumerate every door into this room", never "is
   this door safe".**
2. **For each: change a value, save, and then go look at the surface a member sees.** Not the admin
   surface. The member's. Then reload cold and check it survived.
3. **Classify each as WIRED / SAVES-BUT-NOTHING-READS / DOES-NOT-SAVE / REFUSES-HONESTLY.** The
   fourth is the good pattern this repo already gets right in the `stay.credit_expiry_days` handler,
   which refuses the write with an explanation rather than accepting it into a void. **A refusal is
   not a defect. Count it separately.**
4. **`node scripts/check-save-honesty.mjs` is a CI gate as of PR #90.** Run it, read what it
   actually checks, and **report what it CANNOT see** — the shape a gate misses is where the next
   defect lives. Round 5 had a gate find a hole in itself during its own silent-pass probes.
5. **Two numbers.** How many controls you exercised, and how many were dishonest.

Specific things to check, because a round-5 lane named them and nobody has confirmed the fix:

- The four **Journey Content** tabs the Setup Wizard actively points founders at (reported dead).
- **Project History**'s copy editor (reported dead), and its "Discussion topics" (known
  localStorage-only, house-rules §7 item 6 — confirm in one line, do not write it up).
- **Village Brain**'s sections reaching the guide members actually meet.
- The **exit policy** blocks with no admin field, and the checkbox that removes the placeholder
  warning.
- **`PUT /api/admin/content/:section`** sits behind `story.tell`. Round 5 found that an operator who
  read the break-glass question and chose "Leave it" got a 409 back **and an unchecked save printed
  "Saved!" for the change they had just declined.** Confirm it is fixed, and look for the same shape
  elsewhere: **a decline that still reports success.**
- **`PUT /api/admin/governance/weights/:userId` and `/bulk`** require a written reason, store it in
  the append-only trail, and **notify nobody**. Confirm.
- **The orphan sweep** (#84): `uploads.orphan_grace_days` defaults to 30. Does the list it shows
  match what removal actually removes? Does removing one break a live reference?
- **The module go-live flow** (#86 metering, and the module library): turn a module on, take it to
  members, take it public, turn it off. Does each state mean what the UI says? Does the **pool's own
  share visibly recycle** (R59 requires the recycling to be VISIBLE, and a lane may have shipped the
  arithmetic without the surface)?

## Half two · the fresh fork

Boot a LOCAL build at `b5bed01` against an **empty** scratch schema with nothing seeded beyond what
first boot creates. Then walk it as the founder of a brand-new village who has configured nothing.

- **What lies?** Any surface stating a fact about a village that has no facts yet. Any count that
  should be "none yet" and instead reads as zero-out-of-something, or as a deficiency (R55).
- **What leaks?** Amora's own content, names, places, seats, photographs, brand or copy appearing in
  a fork as if it belonged to them. `docs/FORK_RUNBOOK.md` is the claim; test it.
- **What is unreachable?** A setting the product needs that no screen offers. Round 5 found a
  refusal that reads *"Allocate weight before opening a ballot"* while **the product has nowhere to
  do that** — a correct signpost pointing at a door that does not exist. **Hunt more of those:
  every error message and empty state that tells someone to go do a thing, checked against whether
  the thing can be done.** That is a high-yield sweep and it is yours.
- **What is dangerous?** Anything a fresh village could publish as its own settled position without
  ever being told it was boilerplate.
- **R55 on an empty village.** Would a two-week-old village feel good opening `/powers`, the runway,
  the succession surfaces, the handover? At **zero** powers held, is the layout identical to the
  layout at twelve, with no fraction and no total anywhere?

## Method notes

- **Look at the screenshot**, not only the DOM. Half of this class is visible and unassertable.
- **Prove every negative against a known-present control in the same command.**
- **A control that did not run is not a control.** Assert a non-zero check count.
- **Do not diagnose causes.** Say "I saved X, the member page still shows Y after a cold reload."
- **Report the honest passes.** A list of admin controls you exercised and found genuinely wired is
  worth as much as the dead ones, because it bounds the problem.

## What is NOT yours

- **Fix nothing.**
- Nothing in house-rules §7.
- Live is signed-out and read-only, and you do not change a single setting on it.
- Member-facing copy and first impressions belong to QA-1; attacks on invariants belong to QA-2.
  One line and move on if you land in theirs.

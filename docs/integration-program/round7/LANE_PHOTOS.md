# Lane PHOTOS — every photograph on one page, and a takedown that actually takes the words down too

**Read `../round6/BUILD_HOUSE_RULES.md` first.** It binds.

Worktree: `C:/Users/taren/Desktop/Amora/wt-r7-photos`, branch `wt/r7-photos`, from `origin/main` at
**`ca46b02`**, deps installed, `.env` present.
**Migration `0118` if you need one. Only 0118.**

---

## 1 · The ruling

**R82 item 6**, the founder's answer to a proposal that the product identify who is in a photograph:

**No face recognition.** Instead: **one reverse-chronological page of every photograph**, carrying the
flag and request buttons that already exist, **the anonymous-request refusal kept**, and **alt text
stripped on takedown.**

**Understand why this is the right answer before you build it**, because it shapes every decision
below. Somebody who wants a picture of themselves taken down has to be able to find it. Face
recognition would find it for them and would also build a machine that knows who is in every
photograph of the village, permanently, for everyone. **A page you can scroll solves the actual
problem and builds nothing that can be turned against anybody later.**

## 2 · What exists, measured at `ca46b02`

**Re-verify all of it. It is a relay and therefore a hypothesis.**

- **Photographs are per-place today.** `GET /api/places/:key/photos` (`server/index.ts:21632`) and
  `placePhotosRepo.photosForPlace`.
- **A cross-place reader already exists and is capped at six**: `placePhotosRepo.photosByPlace(pool,
  PLACE_VILLAGE, 6)`, used at `server/index.ts:21585`. **Read it before writing a new one.** It may
  be most of what you need with a different limit and an ordering.
- **The buttons the ruling says to carry are built**: report (`:21771`), subject-request (`:21846`),
  hide (`:21886`), restore (`:21904`), delete (`:21931`).
- **The anonymous refusal is already there and is well written.** `POST /api/places/photo/:id/subject-request`
  refuses a signed-out caller with *"Sign in to ask for a photograph of you to come down"*.
  **Keep that behaviour and keep that sentence.** The ruling says so explicitly.
- **Alt text on takedown is NOT built.** Grepping the hide and restore region for alt or caption
  handling returns nothing. **This is the real work in the ruling and the part somebody has to think
  about.**

## 3 · What to build

### a. One page, every photograph, newest first

**Reverse-chronological, across every place, not a per-place gallery repeated.** Somebody looking for
a picture of themselves does not know which place it was filed under, and making them guess is the
same failure as making them ask an admin.

**Decide and justify:** how much loads at once, what happens at a thousand photographs, and whether
a place label appears beside each one. **A label helps somebody orient and it also tells a reader
where a person was.** Say which way you went and why.

**Who can see this page.** Photographs already have visibility rules and a hidden state that only a
curator sees. **Whatever governs the per-place view governs this one.** Do not build a page that
aggregates past a permission, which is the classic way an index leaks what its sources protect.
**Prove it: a member who cannot see a photograph in its place cannot see it here either.**

### b. A takedown takes the words down as well

**When a photograph comes down, its alt text and caption come down with it.**

The reason is worth stating because it decides the edge cases: **a description of a photograph is
still a description of the person in it.** A takedown that leaves "Rye and two neighbours planting
the north terrace" attached to a hidden image has not taken anything down. It has removed the
picture and kept the sentence about the people.

**Work out and state:**

- **Whether stripped means erased or withheld.** Erasing is honest and irreversible; withholding
  survives a restore. **The restore route exists**, so this is a real decision rather than a
  detail, and I want your reasoning rather than a coin flip.
- **What a curator sees.** Somebody deciding whether to restore may need to know what the photograph
  was. If the words are gone, that decision is made blind.
- **Whether this applies to `hide` only, or to `delete` as well**, and what is already true of delete.

### c. The buttons come with the page

Flag and request work from here exactly as they work in a place. **No new refusal shapes, no second
vocabulary.** If a button means one thing on the place page and another here, you have built two
products.

## 4 · The rulings that bind this surface

- **R55**: never a scorecard. No counts of how many photographs are flagged, no progress toward a
  cleaned-up gallery. This is a tool somebody reaches for.
- **R56**: state what is true and get out of the way. A takedown request says what will happen and
  when, and does not reassure.
- **A refusal explains and offers the way through.** The existing anonymous refusal is the model.

## 5 · Your zone

**Yours:** the places-photos routes in `server/index.ts` (the region near 21455 to 21960),
`server/repos/placePhotos.ts` or wherever that repo lives, the new page under `client/src/pages/`,
and the photo components it needs.

**server/index.ts has two other lanes in it.** RULES holds the economy admin routes and the ballot
executors, TESTRUN holds the job registry and a comment near 18605. **The photo region is far from
both, but tell me the exact lines you touch as soon as you know**, and read `origin/main` fresh
rather than trusting my line numbers, which have moved four times tonight.

## 6 · Gates and reporting

Standard set, enumerated from `.github/workflows/` yourself. **Capture each gate's exit code
directly, never through a pipe**: a lane lost a `check-voice` violation tonight because `EXIT=$?`
after a pipe read `tail`'s status instead.

**Write the tests first and watch them fail.** The two that matter: **a member who cannot see a
photograph in its place cannot see it on the index**, and **a taken-down photograph has no
description left anywhere a reader can reach.**

Report in the house-rules block, plus: **the visibility rule you enforced and how you proved it**,
**erase or withhold, and why**, and **what a curator can still see after a takedown.** Status stops
at **CODED**. Nothing pushed or merged without me.

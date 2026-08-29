# QA-2 · The adversary

**Read `../QA_HOUSE_RULES.md` first. Both files bind.**

Worktree: `C:/Users/taren/Desktop/Amora/wt-r5-qa2`, detached at `b5bed01`, deps installed, `.env` present.
There is an untracked `.qa2/` directory from the round-5 lane that was killed before it reported.
**Treat anything in it as unverified.** Scratch directory: reuse `.qa2/`.
Scratch schema name: **`village_qa6_2`**. Probe scripts: `scripts/qa/r6-adversary/**` inside your worktree.

---

## Objective

**Attack the invariants as an ORDINARY MEMBER, not as an admin, and find every way to get more than
the product means to give you.**

You are not a penetration tester with a shell. You are a person with an account on a village
platform, a browser, and the willingness to type a URL by hand, replay a request, or send a field
the form does not show. That is the realistic threat here: villages are small, members are known to
each other, and the damage that matters is a governance record that is wrong or a power held by
someone nobody gave it to.

**This is authorised security testing of the operator's own platform.** Work against LOCAL builds and
your own scratch schema. On LIVE you are signed out and read-only, and you do not probe live at all
beyond ordinary page loads.

## The invariants. Break them or prove they held

Round 5 shipped twenty-nine PRs into the governance engine with no adversarial pass. These are the
things that must be true. For each: **try to break it, and report the result either way.**

1. **Value cannot be made to appear.** $ReGen, gratitude, badges, module-usage credit, pool shares.
   PR #86 shipped usage metering and PR #64 shipped photo contribution. Can a member move a number
   by opening the same thing repeatedly? The meter is specified to **saturate per member per lunar
   cycle** — one member opening a module counts 1 however often they open it. **Test that claim.**
   Can a 404 be counted as a use? (A round-5 lane found one that was.)
2. **A frozen decision cannot be changed.** *"A vote is counted against the day it opened"*
   (`shared/constitution.ts`). Every dial, weight and roll member is frozen inside the open
   transaction. Try: change a dial mid-ballot; change a member's weight mid-ballot; pass a power
   transfer that changes who holds `ballot.vote` while a ballot is open, then close it. **The tallies
   and the roll must not move.**
3. **A power cannot be held by someone nobody gave it to.** PRs #75, #83, #85, #87, #88 rewrote how
   powers are held and moved. Try to hold one by: replaying a transfer request; calling the transfer
   route directly; being on a stale roll; a badge whose grant was edited; a role you seated
   yourself into.
4. **An act cannot happen without leaving the record.** PR #88 built the break-glass handle and made
   the record wait for the act. Try to act on a village-held power and leave no public line. Then
   try the inverse, which is the defect class that has already been found three times here: **make
   the product write "acted on a power this village holds" when you only LOOKED.** A permission check
   used for VISIBILITY writes false records.
5. **A public surface cannot be made to give more than it means to.** PR #66 made people public by
   default with the `org.public_people` lock. Signed out, on LOCAL, with the lock ON and OFF: what
   comes back from `/api/org`? The public tier is specified as circles whole, roles whole, and holder
   `name` only through `firstName()` ("Ada Vance" reads as "Ada"). Explicitly held back: `userId`,
   `note`, `focus`, `kind`, `lapsed`, `lapsedReason`. **Check every one of those is actually absent**,
   and check the other public reads (`/api/modules`, the map's org lens, `/team`, `/circles`,
   `/roles`, the crawler surfaces, `/.well-known`) for the same fields arriving by another door.
6. **A deny cannot be evaded, and a deny cannot be over-reached.** Deny-beats-role is the ordering:
   a warning badge's deny beats a role grant, a badge grant and a stage unlock. PR #75 grew its
   blast radius so a warning can now stop an ADMIN on a village-held key. Two tests: can a denied
   member act anyway; and can a warning deny something it should not (`ballot.vote` is the sharp one,
   because that is disenfranchisement).
7. **Uploads cannot be made to carry what they should not.** PR #67 strips every image reaching the
   uploads volume, and a gate refuses `multer.diskStorage` in `server/` and any write into the
   volume outside `server/lib/uploads.ts`. **Ask "enumerate every door into this room", never "is my
   door safe"** — that instruction found a second public leak nobody had reported. Enumerate every
   writer into the uploads volume and every reader out of it. Check EXIF actually leaves. Check the
   suppressed-photo 404 is byte-identical to a missing-file 404.
8. **A member cannot read another member's private things.** DMs, flags, reports, drafts,
   introductions, health records, photo subject requests.

## The two things that are already known to be open, and are yours to bound

- **The investor packet emails every document in the vault to anyone who fills a public form**
  (`POST /api/investor-docs/request`). A fix lane holds this. **Do not re-report the leak. DO report
  its blast radius**: what is actually in `investor_docs` on live, whether the upload URLs are
  guessable, whether the same documents are reachable by any other route, and whether the rate limit
  (`abuse.investor_docs_per_ip_hourly`, per-IP) is a real bound. Do this READ-ONLY on live: **do not
  submit the form.**
- **`mayAct` writes the public record before the route runs** for keys predating the sealing work.
  Bound it: **which keys, and what does a member see when the act then fails?**

## Method

- **Prove every negative against a known-present control in the same command.** An attack that
  "returned nothing" may have been a typo. Fire a request you KNOW succeeds beside every one you
  claim fails.
- **Positive assertion for every injected control.** `control landed: true` or the run does not
  count. A round-5 interception that silently did not apply reported a clean control run it had
  never performed.
- **Report the survived attacks.** An honest *"I tried X, Y and Z against the snapshot law and it
  held, here is how I tried"* is a real result and is explicitly wanted. It is the half of this pass
  that tells the founder what is actually solid.
- **Two numbers.** How many attacks you attempted per invariant, and how many succeeded.
- **A dormant column is an ARMED column.** `gratitude` sat `transferable = 1` for eighty-five
  migrations while nothing read it, and the build that closed the economy's loop would have made
  recognition sellable. **Grep the schema for what else is seeded, flagged or defaulted and read by
  nothing**, and say which feature would detonate it.

## What is NOT yours

- **Fix nothing.** Report only.
- **Do not diagnose causes.** Describe the attack and the outcome.
- Nothing in house-rules §7.
- **Do not attack live.** Signed-out page loads only. No form submissions, no account creation, no
  writes, no fuzzing, no scanning. Every attack runs against your LOCAL build at `b5bed01`.
- Copy, layout and first impressions belong to QA-1; admin controls and the fresh-fork experience
  belong to QA-3. One line and move on if you land in theirs.

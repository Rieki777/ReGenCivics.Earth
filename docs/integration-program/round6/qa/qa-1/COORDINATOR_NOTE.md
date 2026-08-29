# Coordinator note on QA-1's report

Written 2026-08-29, **superseded in part the same day and left in place to show the sequence.**

**The lane withdrew refusal R1 itself, in its own report, with its own evidence.** Read
`REPORT_2026-08-29.md` §5 for the withdrawal rather than this note for the correction. It also
corrected its could-not-measure count 6 to 7, moved the mask room into `unmeasured.json` where it
always belonged, and added itself to "Things I broke or got wrong myself". `findings.json` is
untouched at 11, because R1 never produced a finding.

**What I got wrong in the handling, and it is worth more than the finding:** I overturned R1 hours
before I told the lane, and recorded the overturn in the ledger while the lane's own report still
asserted it. **A correction the corrected party has not been told is half a correction.**

## The lesson, in the lane's own words rather than mine

> *"A refusal needs evidence at least as strong as a finding, and mine had a file listing."*

Its three surviving refusals were each cases where it measured something and found the brief's
premise did not match. R1 was the one where it measured nothing and asserted anyway.

And the sharpest observation, which is the lane's about itself:

> **`unmeasured.json` entry 1 got the OTHER HALF of the same PR right.** The zoom control is filed
> as *"needs a pinch WebKit-on-Windows cannot synthesize, unmeasured not absent."* Same PR, same
> report, same author: one half held to the honest standard and the other promoted to a claim.

## The standing trap

**On this repo the directory name lies.** `docs/prototypes/grounds-v0.html` is the living map, 5.69 MB,
served content-hashed and immutable at `/grounds/index.html` ahead of the SPA catch-all, with
`server/index.ts:20482` stating *"THE GATE IS HERE AND ONLY HERE."*

**A path is not a lifecycle.** Counting lines by directory to decide what shipped will be wrong here
every time. The lane generalised it further, and this is the form to carry: **any lane doing scope
triage from `git show --stat` is one directory name away from the same mistake, and the cheap defence
is that a claim about a USER-FACING feature must be tested on the SURFACE, never on the diff.** This
lane loaded `/map` four times, live and local, at two widths, and never searched the artifact,
because the path had already decided the answer.

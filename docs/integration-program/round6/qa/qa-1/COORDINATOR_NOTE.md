# Coordinator note on QA-1's report

Written 2026-08-29 by the coordinator. **The lane's report is left exactly as it filed it.** This
note sits beside it so a future reader meets the correction at the same time as the claim.

## Refusal R1 is OVERTURNED

QA-1 reported:

> *"there is no mask room — 1,943 of PR #63's 2,072 lines are in `docs/prototypes/`, and the 129
> shipped lines are a page-zoom escape control, so the R53 'what does it write' question cannot be
> asked of it."*

**`docs/prototypes/grounds-v0.html` is not a prototype. It is the living map itself**, a roughly
4 MB self-contained page served as a static file:

- `client/src/pages/LivingMap.tsx` header: *"This page is a SHELL. The map itself is
  `docs/prototypes/grounds-v0.html`."*
- `server/index.ts`: *"THE GATE IS HERE AND ONLY HERE. `grounds-v0.html` is a static file served..."*
- **`amora-map-mask` is present in that file.**

So the mask room shipped, and round 5 measured its R53 compliance directly: stored in localStorage,
zero entries in the village's shared edit log, surviving a reload from 79px to 166px of rendered
building.

**The lane's own `unmeasured.json` already carried the honest version:** PR #63's zoom control needs
a pinch WebKit-on-Windows cannot synthesize. **Unmeasured, not absent.** Those two sit very
differently in a report, and the second is a claim.

## The trap, which is worth more than the correction

**The directory name lies.** Anyone who reads a path and infers a lifecycle from it will be wrong
here, and **counting lines by directory to decide what shipped will be wrong here every time.**
Recorded as a standing trap in the ledger's changelog.

## What is NOT diminished

The lane's other three refusals stand, and R3 is the shape this program wants more of: reporting a
negative with its sample size rather than promoting something weaker to fill the slot.

**QA1-F2's cause was neither the lane's description nor the coordinator's.** The lane reported the
behaviour and was correctly forbidden from diagnosing it; the coordinator's relayed cause ("an empty
state chosen for a ballot that has votes in it") was wrong; Lane G-D measured and found that
`markFor` returned `"none"` for **any** value of zero, so 0% agreement, the strongest disagreement
the engine can measure, was being drawn as an absence. **That is the process working, not failing.**

## The line the lane asked to be carried, and it was

> **Both headline findings were invisible to every probe it wrote, while its automated nonsense scan
> returned zero hits across all 133 route-viewport renders.**

Carried into every fix brief of this round.

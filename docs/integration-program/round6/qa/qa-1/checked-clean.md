# QA-1 · what I checked and found clean

Base SHA `b5bed01`. Live build `2026-07-28-wave1-b5bed01` at both ends of the run.
A category omitted from a QA report reads as a category that passed, so everything walked is here,
including the parts that were fine.

## The round-5 PRs my brief named, and what I found

**#62 · the vote as a moon and a field of silhouettes - CORRECT, and counted.**
With one of two members voting yes the server reports unity 100, quorum 50, votedCount 1,
totalWeight 2. Eight numbers on the page were compared against that tally in the same run, at
1280x800 and 390x844: participation percent, weight spoken, total weight, members voted, electorate
size, yes weight, no weight, agreement percent. **16 comparisons ran, 0 mismatched.** The probe
prints "NO CHECK RAN" instead of a pass if no comparison executes, so the zero is a measured zero.

Then the drawing itself, counted by pixel rather than by DOM, because the DOM count was ambiguous
(21 dark paths for what should be 10 silhouettes): scanning the field row and collapsing runs gives
**DDDDDDDDDDLLLLLLLLLL - 10 filled, 10 empty, 20 total**, which is exactly the 50% participation the
server reports and exactly what the copy promises ("each silhouette is a twentieth of the frozen
weight"). The quorum threshold line sits after the 4th silhouette, which is the 20% this ballot
froze. Screenshot: `screenshots/CLEAN-silhouettes-match-tally-local-1280x800.png`.

**#69 and #71 · the decisions rail, and "when a vote binds" - CORRECT across all four states.**
Four ballots were driven to four different closes and the rail gives each its own sentence:

| what happened | what the rail says | what the card says about binding |
|---|---|---|
| 1 of 2 voted yes, closed | Carried | "This one asked what the village thinks. Nothing changed by itself." |
| 1 of 2 voted no, closed | Did not carry | same |
| nobody voted, closed | **Too few spoke** | same |
| called off | Withdrawn | same |

A vote that missed quorum does not read as one the village turned down, which was the point of #71.
Each card also carries the human closing note the closer had to write (the close route refuses
without one). The one defect found in this area is F2 in the main report, and it is the agreement
value, not the outcome word.

**#65 · practice votes - CORRECT.** An advisory ballot opens with `binding: false` and the page says
so in its own words: "The village is being asked, and nothing more. This vote runs on the real
engine, with the real roll and the real weights, and closing it changes nothing on its own." One
advisory per member is enforced with a plain sentence ("You have an advisory vote still running. Let
the village answer that one first"). The only issue is the tense after it closes, filed as F8.

**#75, #83, #85, #87, #88 · /powers, and the R55 claim - CORRECT, checked at zero and at seven.**
The brief asked me to check the no-percentage claim myself at zero powers and at several. I did
both. Scanned the full rendered text for a percent figure, for "N of M", for "days left / to go /
remaining", and for complete / incomplete / progress / score / ranked / milestone.

- at 0 village-held powers: 4,505 characters, **zero hits in all four scans**
- at 7 village-held powers: 4,417 characters, **zero hits in all four scans**

No percentage, no countdown, no scorecard, no cross-village comparison. The copy for a power the
village has taken on is a fact, not a score: "Founders Circle holds this, and nobody is sitting
there yet." The two-step rule the page describes is also enforced: moving a capability to a role
that does not carry it is refused with "The role does not carry it yet, so nobody in it could act.
Give the role the power first, then hand it over."

**#78 · the sign-in wall says what is behind it - CORRECT, and its number is true.**
The wall on `/messages` reads "Private conversations between members, one to one or in a named
group. This part of the village opens when you sign in", offers both doors (Sign in with `?next=`,
and Create an account), and then says "17 parts of this village are open without an account,
including Quests, Gratitude and Stages & Roles."

I tested that number rather than trusting it. The anonymous manifest at `/api/modules` returns
exactly 17 modules, all at lifecycle `public`, and `signInToSee: ["messaging"]`. **All 17 module
surfaces were then walked signed out and 16 render real content; the 17th (messaging) is the one the
wall is on.** `/quests`, `/gratitude`, `/forum`, `/feed`, `/wallet`, `/badges`, `/library`, `/tools`,
`/network`, `/village-health`, `/contribute`, `/places`, `/reserve`, `/first-walk` all render.
17 examined, 0 false.

**#89 and #90 · "saved" asks the server first - CORRECT on both paths I could drive.**
`/introductions` Save fired `PUT /api/intents/policy` and got 200 back carrying the stored policy.
The ballot vote button was then tested against a **forced 500** on a ballot the member had not voted
in, so the state could not be contaminated by an earlier real vote (my first attempt at this test
was contaminated exactly that way and was thrown out and redone). Result: the page surfaced the
server's own error text within 120 ms and held it for the full 6.5 s sample window, kept saying
"Your vote is open", and the server held `myVote: null, votedCount: 0`. It did not claim success out
of a failure path, and it was not silent either. **2 examined, 0 defective. I did not find a surface
that still lies**, and I am reporting that as a negative rather than promoting something weaker.

**#64 · place photographs - honest empty state.** `/places` reads "Every place on the land that
somebody has stood in front of with a camera. Each photograph carries the name of whoever took it
and the month it was taken." then "No place here has a photograph yet. The first one starts the
record." No invented count, no placeholder grid.

**#77 · the one clock - one clock.** I suspected two on `/decisions` from a text dump showing
"6 days 23 hours left to vote" and "6 days 23:49:49" stacked. Measured: the first is `sr-only` at
1x1 px (the accessible label), the second is the visible ticker. Not a duplicate.

## Cross-cutting checks

**Reachability: 6,248 controls examined, 0 unreachable.** Live 3,345 and local 2,903. Every anchor,
button, role=button, input, select and textarea was scrolled to the viewport centre and then asked
`document.elementFromPoint` at the centre of **each of its client rects** (not the bounding box,
because an inline link wrapping two lines has a bounding-box centre that lands between the lines).
`pointer-events: none` is reported as unreachable in its own right. The non-zero examined count is
asserted before the zero is believed.

My own first pass reported 8 "covered" controls on live `/events` and 1 each on `/decisions` and
`/powers`. All ten were the fixed bottom tab bar sitting over content at scroll offset 0, and all ten
resolve the moment the page scrolls. **They are not findings and I am not reporting them.**

**Horizontal overflow: 133 route-viewport renders, 0 pages overflow.** At 1280, 390 and 360 wide,
live and local.

**Nonsense tokens: 133 renders scanned, 0 hits.** `undefined`, `NaN`, `[object Object]`, `Infinity`,
bare `null`, doubled commas, unrendered braces, raw uuids, percent-complete phrasing, and "N of M"
phrasing. Worth saying plainly: **this scan found nothing, and two real defects (F3 and F6) were
found by looking at the screenshot.** A green probe is not a true surface.

**Images: 13 distinct URLs across 19 live public routes, 4 defective** (all four are F1). Every image
served from `amora.regencivics.earth` itself resolves. 353 `img` elements rendered across all sweeps,
5 broken renders, all of them the same four files.

**Empty-inventory check (coordinator addendum 1).** The decision was that an absent section beats an
empty box, and the coordinator flagged that a rendered EMPTY inventory box would be the real finding.
Checked: `/profile` for a member holding nothing shows **no borrowed-items box, no booked-stays box,
no reserved-lot box**. Those sections are absent, as designed. The empty cards that do render are
gratitude, quests, the gratitude ledger and the wallet, none of which are inventories, and each states
a real state ("You haven't claimed a quest yet", "Nothing yet. Consented quests and received gratitude
will appear here"). **No violation.**

**Two live routes writing the same gratitude ledger with different allowances (coordinator addendum
2).** Not reached from a member's surfaces this pass; nothing to confirm in the wild.

## Routes walked and read sentence by sentence, found true

Live, signed out: `/`, `/visit`, `/stay`, `/map`, `/events`, `/team`, `/circles`, `/roles`,
`/how-we-create`, `/modules`, `/login`, `/register`, `/opportunities`, `/exit-policy`, `/quests`,
`/gratitude`, `/forum`, `/feed`, `/badges`, `/library`, `/tools`, `/network`, `/contribute`,
`/places`, `/messages`, `/reserve`, `/first-walk`, `/governance`, `/wallet`, `/journey-to-launch`.

Local, signed in as an ordinary member with all 23 modules on: `/`, `/map`, `/places`, `/events`,
`/feed`, `/forum`, `/quests`, `/gratitude`, `/badges`, `/library`, `/tools`, `/network`, `/wallet`,
`/contribute`, `/stay`, `/roles`, `/circles`, `/team`, `/messages`, `/first-walk`, `/tokens`,
`/campaigns`, `/introductions`, `/modules`, `/feedback`, `/decisions`, `/powers`, `/propose`, and
four `/decisions/:id` pages.

Empty states worth naming as good: `/decisions` says "Nothing is being decided right now. **That is a
real state, not an empty page.** When somebody takes a proposal to a vote, it appears here with a
clock on it." `/campaigns`: "No raisings yet. When this village links a campaign, its ring appears
here." `/messages`: "No conversations yet. Start one with anybody here." None of them invents a
number, and the standing-examples banners say plainly "Nobody here made them ... nothing you do to
one takes effect."

## Known items (house rules section 7) confirmed still true, one line each

- **Item 2** - `ballot.vote` appears on `/powers` as "The vote itself", with "The admin panel looks
  after this one" and **without** the "It is one the village can take on" line every movable power
  carries. The refusal is intact and visible to a member.
- **Item 10** - the four core modules (quests, gratitude, progression, profiles) show **ALWAYS ON**
  on `/modules` and are the only four in the manifest of a fresh local build.
- **Item 14** - `governance`, `crowdpool`, `resources` and `introductions` are all absent from the
  live anonymous manifest. Their public surfaces on live correctly show the module-off card.

## Safe cases classified rather than padded into the finding list: 5

1. The ten "covered" controls at scroll offset 0 (bottom tab bar). All reachable after scrolling.
2. The `sr-only` skip link reported "never in viewport after scroll" on 27 routes. Correct: a skip
   link is meant to appear only on focus.
3. Eighteen text "collisions" on `/village-health` reported by my own detector. All are content
   inside collapsed `details` elements being compared against cards elsewhere on the page. The
   screenshots show nothing overlapping. My detector's false-positive shape, not a defect.
4. "Agreement - none yet" on the withdrawn ballot and on the one nobody voted in. **Correct there**,
   because nobody took a side. The same string on the ballot that was decided by a No is F2.
5. `/investor` at 390 wide, which my first screenshot caught mid-load as a bare spinner. Re-run at
   3.5 s, 12 s and 25 s it renders in full every time. Retracted, not reported.

## Things I broke or got wrong myself, so the numbers are not read as the product's

- My scroll-behaviour init script threw before `document.head` existed and put one `pageerror` on
  every page of the first sweep. Fixed; every sweep re-run. Error counts from that first pass are mine.
- My first save-honesty test on the vote button was contaminated: the control run cast a real vote
  before the forced-refusal run, so "the server holds a vote" proved nothing. Thrown out and redone
  on a fresh unvoted ballot.
- Seating a role holder by direct DB write did not reach the running server's role cache, so a
  capability check refused. That is my setup shortcut, not a product defect.
- `git grep` was not used for any negative claim anywhere in this pass.

# QA-2 · what I attacked and could not break

Base SHA `b5bed01`. Local build of the same SHA on port 3902, scratch schema `village_qa6_2`.
Live build marker `2026-07-28-wave1-b5bed01` at both 18:44 and 19:13 UTC on 2026-08-29.

Every negative below was fired in the same run as a request that is known to succeed. Where a
control did not land, the line says NOT MEASURABLE instead of clean.

---

## Invariant 2 · a frozen decision cannot be changed — 8 attacks, 0 succeeded

This one is solid, and it is the strongest thing I found. With a ballot open in token weight mode:

| what I did while the ballot was open | what happened |
|---|---|
| minted 5000 of the weight token to a voter | her `token_balances` row went to 10040; the frozen roll stayed at 5040 |
| dropped `governance.quorum_pct` and `unity_pct` to 1 | the village dials read 1/75; the ballot still carried 50.00/50.00 |
| switched `governance.weight_mode` to custom and set her weight to 9999 | the ballot kept `weight_mode=token` and the identical roll |
| registered a new member, gave them weight, had them vote | 409 "You are outside this ballot's electorate. Who may vote froze when it opened", 0 rows written, roll did not grow |
| voted yes then no as the same member | one row, choice `no`; a revision, not a second vote |
| checked which weight the tally used after the mid-ballot mint | the frozen 5040; `ballot_votes` carries no weight column at all, so the frozen roll is the only source there is |
| voted after the close | 409 "This ballot is failed. Voting ended when it closed", 0 rows |
| closed a closed ballot again, and withdrew it after the close | 409 and 409; status stayed `failed` |

Control: the ballot opened 200 with a five-member roll and non-zero weights, and an in-window vote
was accepted 200. The dial writes all returned 200 and the village-level values did move, so the
ballot's refusal to move was not a failed write.

## Invariant 3 · a power cannot be held by someone nobody gave it to — 7 attacks, 0 succeeded

Ran the whole handover ceremony end to end: `feed.announce` moved from the admin panel to
`steward-circle` by a carried village vote, and `capability_holding` recorded the ballot id, the
member who opened it and the outcome note.

- Opening a handover as an ordinary member: 403.
- Opening a handover as the ADMIN: 403 with the sentence that a handover is the village's own act
  and an administrator account is not a path to it. It took a member seated in a role carrying
  `proposal.open` to open one. That is R54 working.
- Replaying the same transfer request: 409, and the refusal names the running ballot by id.
- Seating yourself into the holding role: 401.
- Calling the manual mint route as an ordinary member: 401.
- The seated holder acting: allowed, and no override record written, which is right because she was
  given it.
- Acting from a stale roll after being un-seated: 403, in the same request cycle as the un-seat.

## Invariant 4 · an act cannot happen without leaving the record — 4 attacks, 0 succeeded

**This one corrects a known-issue.** House rules section 7 item 4 says `mayAct` writes the public
"acted on a power" line before the route runs for keys predating the sealing work. On `b5bed01`
that is no longer what happens on the key I drove end to end:

- Unseated admin acts with no override: 409 hatch, 0 capability rows written, 0 public.
- Unseated admin breaks the glass and the route then refuses the body (400 "Say something"):
  0 public rows. The attempt goes to the admin trail; the village is told nothing.
- Control, in the same run: the same admin breaks the glass with a valid body, gets 200, and
  **exactly one** public line appears: "Fiona Founder acted on a power this village holds: post
  announcements to the whole village feed. Steward Circle holds it."
- Looked at 8 read surfaces (`/api/map`, `/api/feed`, `/api/org`, `/api/roles`, `/api/powers`,
  `/api/governance/standing`, `/api/game/progression`, `/api/profile`), twice each, the second time
  carrying `x-capability-override`: **0** capability rows written by any of them.

I also checked the shape rather than only the behaviour: 49 route sites run the capability act gate
and 0 of them are GETs. `orgDeclareCtx`, the one helper whose `mayAct` call sits near a GET in the
file, has exactly two callers and both are PUTs.

## Invariant 5 · a public surface cannot be made to give more than it means to — 20 attacks, 0 succeeded

`/api/org` signed out, with `org.public_people` ON and OFF, checked against the ten fields the
route's own header names as held back:

- Lock ON: 12 holder rows, name only, every one a single word through `firstName()`. Zero of
  `userId`, `note`, `focus`, `kind`, `lapsed`, `lapsedReason`, `assignmentId`, `displayName`,
  `email`, `handle` in 35 KB of payload.
- Lock OFF: 0 holder rows, `people: {visible:false, membersOnly:true, signedIn:false}`.
- Control: the same payload read with an admin token carries 47 instances of those keys, including
  the exact note strings and the assignment ids. The absence at the public tier is a real absence.

Then the other doors, because "is my door safe" is the wrong question. **I swept all 220 GET routes
declared in `server/index.ts` signed out with the lock closed**, hunting ten exact strings that are
present in the database (two holder notes, a holder_key, two documented names, two member emails, a
member's full name, a bcrypt prefix, an assignment id prefix). 47 routes answered anonymously,
173 refused, 0 carried any of the ten. Control in the same command: the admin `/api/org` carries 5
of the 10.

Three hits my first pass flagged were mine, not the product's: "Founder" in `/api/roles` is the role
name "Founders Circle" with `holders: []`; "Founder" in `/api/content/roles` is the word inside a
role's own domain text; and `kind: "village"` in `/.well-known/village.json` is the protocol kind,
not a holder kind.

## Invariant 6 · a deny cannot be evaded — 4 of 5 attacks held

Deny-beats-role holds and its blast radius is real:

- Warning badge denying `feed.announce`, awarded to the seated holder: her next announcement 403.
- Four evasions, all refused: sending `override` as the denied member, sending
  `x-capability-override` as the denied member, being seated in a second role after the deny, being
  granted the top stage after the deny.
- The deny stopped an ADMIN breaking the glass on the village-held key too (PR 75's widened radius).
- Control: the same member, seated and un-denied, announced 200 immediately before.

The over-reach half is finding QA2-04 and is not clean.

## Invariant 7 · uploads — 2 held, 1 not measurable, 1 flagged then disproved

- **EXIF really leaves.** Built the repo's own geotagged fixture (6857 bytes, carrying the
  `FieldProbeCam` tracer and a GPS IFD, asserted present before anything else). Pushed it through a
  real door. Stored bytes 6682: no tracer, no markers, and the served bytes match the stored bytes.
- **Anonymous door, same result.** `POST /api/work-with-us/attachment` is public by design and
  answers 200 with no account. The bytes it stores are stripped the same way, and an HTML file sent
  to the same door is refused: "Only images or PDF are allowed". My sweep flagged the 200 as a
  break; it is not one.
- **Upload URLs are not guessable.** 21 guesses around a real filename's timestamp, 0 hits, with
  the real URL answering 200 in the same run. The name carries a 13-digit millisecond stamp AND
  five base-36 characters.
- `scripts/check-upload-strip.mjs` passes clean across 114 server files.
- 6 of 7 multipart doors refuse an anonymous POST outright.

## Invariant 8 · a member cannot read another member's private things — 2 attacks, 0 succeeded

- 12 private surfaces read signed out: 0 carried a member email or a bcrypt hash. Control: 4 of the
  12 answered 200 for their owner in the same run, and her own `/api/profile` carries her email.
- 8 routes with another member's id pushed in by path or query: none returned her email or a hash.
  `/api/notifications?userId=<hers>` answers 200, and I checked what it actually returned: bob's own
  31 rows, byte-identical to the same call without the parameter, and every returned id belongs to
  bob in the database. Alice has 10 rows and none came back. The parameter is ignored.

## Invariant 1 · the meter — 15 of 22 attacks held

The saturating unit does what its header promises:

- Opened the same module 41 times: still 1 mark.
- Four different paths under one prefix: still 1 mark.
- 404 under a module prefix: 0 marks (the gate waits for `res.finish` and refuses >= 400).
- Swept 17 module prefixes with one bogus path each: 0 of 17 claimed.
- Reached a module's admin prefix by 5 alias paths (`/API/Admin/`, `//admin/`, `/./admin/`,
  `%61dmin`): 0 marks; configuration never counts as use.
- Tried to attribute a use to another member via `X-User-Id`, `X-Forwarded-User` and a `userId`
  query: every mark belonged to the caller.
- Forged a token naming an invented member: 401, 0 marks.
- HEAD does write a mark, and it is not a lever: HEAD by a member counts the same 1 that a GET by
  that member counts, and anybody who can HEAD can GET.

Control throughout: one honest open by a member who had touched nothing produced exactly 1 mark.
Note for whoever picks up the meter: the per-process `seen` set means a mark deleted after the
process cached it does not come back until the cycle turns, so the error direction there is a count
too LOW, never too high.

## The two bounded items from the brief

**The investor packet.** Not re-reported; bounded instead. `POST /api/investor-docs/request` is
reachable anonymously on live (an empty-bodied POST answers 400 at validation, before any lead is
stored or any mail sent, which is as far as I went). The rate limit
`abuse.investor_docs_per_ip_hourly` defaults to 3 and buckets per IP, which is not a bound on this
leak: one request is enough to have the whole vault emailed to any address, and the bucket is per
IP. The links it mails point at `/api/uploads/<name>`, and those names are not guessable (21 tries,
0 hits, control 200). PDFs and unknown types from that route get `Cache-Control: private, no-cache`,
never the one-year immutable branch, which applies only to `image/`, `font/` and `audio/`; the
coordinator's correction on that point is right and I confirmed it in the served headers. Live's
uploads volume holds 14 files totalling under 1 MB with 0 orphans, so the exposure today is at most
those files. What is in `investor_docs` on live I could not read (U-02).

**A dormant column is an armed column.** Read the live schema, kept the 55 columns whose name is a
policy switch (transferable, requires_request, enabled, active, is_*, allow*, can_*, public*,
visible, binding, locked, suppressed*, default*, admin_only, members_only, auto_*), and asked what
reads each one against 560 source files read byte-wise rather than through a search tool, so a NUL
byte cannot hide a file. **0 of 55 are read by nothing.** Controls in the same run: `capabilities`
31 files, `lifecycle` 37, `quorum_pct` 12, and a column name that does not exist 0.

My first pass of that sweep reported 2 dormant columns and a `quorum_pct` control of 0. That was my
bug, not a finding: a heredoc had collapsed `\\b` to a literal backspace, so the word-boundary half
of the matcher never ran. The control caught it. The numbers above are from the fixed run.

`gratitude.transferable` now reads 0 in the seeded registry, so the specific armed column that
prompted this instruction is disarmed. `credits.transferable` is 1 and is read by
`server/lib/spending.ts`, so it is a live switch and not a dormant one.

# Outdoorsy ⇄ ReGen Ship calendar sync

**Date:** 2026-08-01
**Goal:** one shared availability state between `regencivics.earth/ship/book` and the
Outdoorsy listing (rental id `543254`), so the ship can never be sold twice.

**Governing principle:** regencivics.earth is the source of truth. Outdoorsy is a
sales channel that mirrors it. Not a peer.

---

## 1. What was verified in the browser on 2026-08-01

All of this was checked live in the Outdoorsy host dashboard, not assumed.

| Thing | Finding |
|---|---|
| Import accepts arbitrary URLs | Yes. "Add calendar" is a free-text **Calendar URL** + **Name** field. No platform dropdown. Tooltip says "any third-party calendar". |
| Export URL | `https://printer.outdoorsy.com/calendars/543254/bookings.ics?token=0qhcYIVPSJhHa1lMeHHcfySTEXhg3vs3` |
| Export contents | Valid `VCALENDAR`, `PRODID:-//Outdoorsy//Calendar//EN`, `X-WR-CALNAME:Outdoorsy Bookings`, and **zero VEVENTs**. |
| Manual blocks are NOT exported | The whole of Aug 2026 shows Unavailable in the UI, and none of it appears in the .ics. The export carries **only real Outdoorsy bookings**. |
| Import refresh cadence | Every 2 hours, per Outdoorsy help docs, with a manual refresh control. |
| Import is additive only | Imported blocks add unavailability. They never re-open a date blocked by hand. |
| Booking approvals | Manual approval enabled for all trips (request-to-book). Confirmed. |
| Trip start / end times | 5:00pm start, 11:00am end. Matches the Monday 5pm board / Monday 11am return doctrine. |
| Advance Notice | Was "Same day bookings allowed" → **changed to "Must book at least 3 days in advance"** on 2026-08-01. |
| Turnaround Time | "Same day pickup allowed" — **left as is, deliberately** (see §2). |
| Minimum stay | 4 nights, "allow shorter requests if guest is departing within 3 days". Left as is per decision D1. |
| Nightly rate | $350.00, Smart Pricing **On**, Balanced, range $300–$350. |
| Security deposit | $1,500. Mileage 250mi then $0.35/mi. Generator unlimited. |
| Listing status | Published, Delivery On. |

**Consequence of the export finding:** there is no echo loop. Blocks we push into
Outdoorsy will never come back to us as imported bookings. This is the single
biggest thing that makes two-way iCal safe here, and it is verified rather than
hoped for.

---

## 2. Why Turnaround Time must stay "same day pickup allowed"

An earlier draft of this plan recommended a 1-day turnaround buffer. That was
wrong and would break the ship.

The voyage grid shares the Monday boundary: a voyage returns Monday 11am and the
next voyage boards Monday 5pm, with the Keeper turnover running in between
(`server/lib/ship-config.ts`, voyage week grid comment). Setting Outdoorsy's
turnaround to 1 night would auto-block the Monday that the next voyage starts,
making back-to-back weeks impossible on Outdoorsy while they stay bookable on our
own site. The two calendars would then disagree by design.

Leave it at same-day. The Keeper turnover is a 6-hour window, not a day.

---

## 3. Decisions taken (Rye, 2026-08-01)

- **D1 — Granularity.** Leave Outdoorsy minimum stay at 4 nights. The sync
  **snaps imported bookings outward** to the enclosing Monday-to-Monday voyage
  week(s) when writing blackouts. A 4-night Outdoorsy trip consumes a whole
  voyage week on our side. We accept the lost inventory in exchange for more
  Outdoorsy bookings and a coherent week grid.
- **D2 — Pricing.** Outdoorsy is priced **above** direct. Outdoorsy is discovery;
  booking direct is the cheaper and better path, and it is where the Covenant
  lives. See §8 — this is a HUMAN step, not yet applied.
- **D3 — Covenant.** Outdoorsy-origin bookings **block dates only**. The sync
  writes a blackout and notifies admin. Rye handles the guest by hand through
  Outdoorsy messaging. No auto-created `ship_bookings` row, no auto-email.
- **D4 — Rollout.** Listing settings applied now. The calendar itself is
  untouched: the manual blocks stay up and the feed is not yet pasted in, so the
  ship does not go bookable on Outdoorsy before the feed exists.

---

## 4. Existing code this builds on

The data model already anticipates this. Nothing here is greenfield.

| Location | What is already there |
|---|---|
| `drizzle/schema.ts:4464` | `shipBookings`, incl. `platformBookingRef` and status `platform_pending` |
| `drizzle/schema.ts:4511` | `shipBlackoutDates`, whose comment already reads "the platform's own bookings mirrored in" |
| `server/routes/ship.ts:88` | `BLOCKING_STATUSES = ["approved","platform_pending","confirmed","active"]` |
| `server/routes/ship.ts:452` | `ship.availability` — the single place availability is computed, from blocking bookings + blackouts |
| `server/routes/ship.ts:526` | `requestBooking` overlap check against blocking bookings + blackouts |
| `server/routes/ship.ts:2275` | admin `markPlatformPending` |
| `server/routes/ship.ts:2285` | admin confirm, writes `platformBookingRef` |
| `server/routes/ship.ts:2690` | admin `addBlackout` / `listBlackouts` / `deleteBlackout` |
| `server/_core/index.ts` ~765 | the Railway cron endpoint pattern: `CRON_SECRET`, Bearer token, `crypto.timingSafeEqual` |
| `server/lib/ship-config.ts` | `SHIP_SEASON_START_YMD = "2026-07-27"`, `SHIP_BOOKING_HORIZON_WEEKS = 104`, `SHIP_YEAR2_START_YMD = "2027-04-05"` |
| `shared/shipVoyages.ts` | `MAX_VOYAGE_WEEKS = 4` |

Migrations are hand-written `drizzle/NNNN_*.sql` applied by
`scripts/run-migration.ts`. Latest on disk is `0222_governance_fork_marker_links.sql`,
so the new one is **0223**. Do not run `drizzle-kit generate`.

---

## 5. Phase 1 — Outbound feed (regencivics → Outdoorsy)

**Status:** CODED (uncommitted, branch `ship-rite-truth`). Tests pass, serializer typechecks.

**Files written 2026-08-01:**
- `server/lib/ship-ical.ts` (new) — pure serializer + week-grid-to-blocks. No DB, no clock, no env.
- `server/lib/ship-ical.test.ts` (new) — 25 tests, all passing.
- `server/routes/shipCalendarFeed.ts` (new) — the Express route.
- `server/_core/index.ts` (edited) — import + `registerShipCalendarRoutes(app)` after `registerPresenceRoutes(app)`.

**Route (final):** `GET /api/ship/calendar/:token/regen-ship.ics`. Path token rather than a
query string; wrong token gets 404, not 401.

**Design change from the original plan, and it matters:** the feed is generated from the
SAME `enumerateVoyageWeeks` output that renders /ship/book, not from a second query over
bookings and blackouts. Two consequences, both wanted:

1. **Migration passages are now blocked on the channel.** They are derived from
   `SHIP_SEASONAL_BANDS`, not from any `ship_blackout_dates` row, so the original
   bookings-plus-blackouts design would have let Outdoorsy sell a week she is
   repositioning. Two such weeks exist in the current horizon (2026-09-21, 2027-09-20).
2. **Snap-outward comes for free on the outbound side.** A mid-week blackout closes the
   whole voyage week on the channel because that is exactly what it does on our own
   booking page.

**Fails closed, deliberately:** an empty week grid emits a 3-year block rather than an
empty calendar, and a DB error returns 500 rather than a valid-but-empty VCALENDAR. A
channel reading an empty feed treats every date as open.

**Bookends:** a leading block from today to the first bookable Monday (the current week
has already begun and the grid drops it), and a trailing 3-year block past the horizon.

New Express route, mounted alongside the other raw routes in `server/_core/index.ts`
(not tRPC — Outdoorsy needs a plain GET returning `text/calendar`).

```
GET /api/ship/calendar/:token.ics
```

- `:token` must equal `SHIP_ICAL_TOKEN` (new env var, random 32 chars). Compare
  with `crypto.timingSafeEqual`. 404 on mismatch, never 401 — do not confirm the
  path exists to a scanner.
- Emits one `VEVENT` per row from:
  - `ship_bookings` where `status IN (approved, platform_pending, confirmed, active)`
  - `ship_blackout_dates` where `source = 'manual'` — **exclude `source = 'outdoorsy'`**,
    or we hand Outdoorsy its own bookings back as blocks.
- Also emit `requested` bookings as `STATUS:TENTATIVE` holds, so a week someone
  is mid-Covenant on is not simultaneously for sale. Requested holds older than
  72h are excluded (and swept — see Phase 2).
- `DTSTART;VALUE=DATE` / `DTEND;VALUE=DATE`, half-open, matching our own
  `[startDate, endDate)` convention. Outdoorsy blocks whole days.
- No PII. `SUMMARY:ReGen Ship — sailing` for bookings,
  `SUMMARY:ReGen Ship — unavailable` for blackouts. No names, no emails, no notes.
- Stable `UID`: `booking-<id>@regencivics.earth` / `blackout-<id>@regencivics.earth`.
- Headers: `Content-Type: text/calendar; charset=utf-8`,
  `Cache-Control: public, max-age=300`.
- Line folding at 75 octets and `\r\n` line endings, per RFC 5545. Outdoorsy is
  tolerant but the Google Calendar mirror in Phase 4 is not.

**Files:** `server/routes/shipCalendarFeed.ts` (new), `server/_core/index.ts` (mount).

**Test:** `curl` the endpoint, paste into an .ics validator, and subscribe to it
from a personal Google Calendar before it ever touches Outdoorsy.

---

## 6. Phase 2 — Inbound sync (Outdoorsy → regencivics)

**Status:** not started

### 6a. Migration 0223

```sql
-- drizzle/0223_ship_blackout_source.sql
ALTER TABLE ship_blackout_dates
  ADD COLUMN source VARCHAR(24) NOT NULL DEFAULT 'manual',
  ADD COLUMN externalUid VARCHAR(255) NULL,
  ADD COLUMN externalUpdatedAt TIMESTAMP NULL,
  ADD COLUMN syncedAt TIMESTAMP NULL;

CREATE UNIQUE INDEX ship_blackout_external_uid_idx
  ON ship_blackout_dates (externalUid);
```

Mirror the columns into `drizzle/schema.ts` on `shipBlackoutDates`. `source` is
`'manual' | 'outdoorsy'`.

### 6b. Cron endpoint

```
POST /api/cron/outdoorsy-sync     (Bearer CRON_SECRET)
```

Follow the exact shape of `/api/cron/coordination-pipeline` in
`server/_core/index.ts`: read `CRON_SECRET`, `timingSafeEqual` the Bearer header,
dynamic-import the job, return `{ ok: true, ...report }`.

Railway cron: **every 15 minutes**. We can afford to be four times faster than
Outdoorsy's two-hour pull, and it shortens the window in which a cancellation
still reads as booked on our side.

### 6c. The job — `server/jobs/outdoorsySync.ts`

1. Fetch `process.env.OUTDOORSY_ICAL_URL`. Bail with a logged warning if unset.
   Use the existing SSRF guard (`server/_core/ssrf.ts`) and a 10s timeout.
2. Parse VEVENTs. Write the parser by hand — the feed is a handful of all-day
   events with `UID`/`DTSTART`/`DTEND`/`SUMMARY` and does not justify a
   dependency. Handle folded lines and `VALUE=DATE`.
3. **Snap outward** (D1). For each event, expand `[DTSTART, DTEND)` to the
   union of the voyage weeks it intersects:
   - The grid is Mondays anchored at `SHIP_SEASON_START_YMD` (2026-07-27).
   - `weekIndex = floor(daysBetween(SEASON_START, date) / 7)`.
   - Blackout start = the Monday of the week containing `DTSTART`.
   - Blackout end = the Monday **after** the week containing `DTEND - 1 day`.
   - An event landing entirely before the season start is stored unsnapped.
   - Put this in `shared/shipVoyageGrid.ts` as a pure exported function so it is
     unit-testable and the client can reuse it. It must agree with whatever
     `enumerateVoyageWeeks` already does — read that first and match it exactly.
4. Upsert by `externalUid`. Idempotent: re-running changes nothing.
   `reason = "Outdoorsy booking <uid-suffix>"`, `source = 'outdoorsy'`,
   `syncedAt = now()`.
5. **Delete** rows with `source = 'outdoorsy'` whose UID was absent from this
   fetch — that is a cancellation. Guard: if the fetch returned zero VEVENTs
   **and** the previous run had more than zero, log loudly and skip the delete
   pass rather than unblocking the whole calendar on one bad response.
6. Sweep `requested` bookings older than 72h to `cancelled` so stale holds stop
   appearing as TENTATIVE in the outbound feed.
7. Return `{ fetched, created, updated, deleted, conflicts, sweptHolds }`.

### 6d. Conflict detection (D3)

Before writing a blackout, check whether the snapped range overlaps a
`ship_bookings` row in a blocking status.

- If it overlaps a booking already in `platform_pending` or `confirmed` whose
  `platformBookingRef` is empty, and the dates match, **link it**: write the UID
  to `platformBookingRef` and skip creating the blackout. This is the normal
  happy path — guest requested on our site, then paid on Outdoorsy — and without
  it every direct booking gets double-counted.
- Otherwise, if it overlaps anything, still write the blackout (safety first) but
  increment `conflicts` and fire an admin notification through the existing
  `server/_core/notify.ts`. A silent overlap is a double-booking waiting to be
  discovered by a guest.

---

## 7. Phase 3 — Admin visibility

**Status:** not started

- Admin panel section "Calendar sync" on the existing ship admin page:
  the feed URL (with a copy button), last sync time, last sync counts, and any
  unresolved conflicts with a link to the Outdoorsy booking.
- `listBlackouts` gains `source` in its output; the admin UI marks
  Outdoorsy-sourced rows read-only, since deleting one just re-creates it on the
  next run.
- Optional, cheap: mirror confirmed voyages to the public ReGen Google Calendar.
  `server/_core/googlecal.ts` already has a working service-account JWT push, so
  this is a small amount of new code and gives the Keeper turnovers on their phone.

---

## 8. Pricing (D2) — HUMAN step, not yet applied

Direct pricing, from `server/lib/ship-config.ts`:

| Period | Direct |
|---|---|
| Trial year, through 2027-04-04 | $150/night rental + $150/night suggested offering = **$300/night**, $2,100 per voyage week |
| From 2027-04-05 (`SHIP_YEAR2_START_YMD`) | **$600/night**, $4,200 per voyage week |

Multi-week discounts stack on top: 2 weeks −5%, 3 weeks −10%, 4 weeks −15%
(`shared/shipPricing.ts`).

Outdoorsy today is $350/night with Smart Pricing floating $300–$350 — at the
bottom of that range it **matches** direct, and from April 2027 it would sit at
little more than half of direct. That inverts the intent: the channel that skips
the Covenant would become the cheap one.

Recommended:

1. Turn **Smart Pricing off**. The ship is a covenant vessel, not a comp-set rig,
   and an algorithm chasing similar Class A rentals in Ashland will keep pulling
   her under the direct rate.
2. Set nightly rate to **$375** now (25% above the full direct ask, 2.5× the
   required direct rental portion).
3. Diarise **2027-04-05** to raise it to **$650**, alongside the year-two step.
4. Note that Outdoorsy's host service fee comes out of the payout, so $375
   nominal nets less than $375. If the goal is netting above direct rather than
   listing above direct, $400 is the safer number.

Rye to choose the number and apply it under Listings → Pricing → Edit.

---

## 9. Cutover order — do not reorder

1. Ship Phase 1. Verify the feed by subscribing to it from a personal calendar.
2. Ship Phase 2 with `OUTDOORSY_ICAL_URL` set. Run the cron once by hand and
   confirm it reports `fetched: 0, created: 0` against the currently empty feed.
3. Set the Outdoorsy price (§8).
4. Paste the outbound feed URL into Outdoorsy → Calendar → Add calendar, named
   "ReGen Civics — regencivics.earth". Hit the manual refresh.
5. **Only then** clear the manual Unavailable blocks, using Calendar → Update
   availability with a From/To range set to Available. Until this step the feed
   does nothing, because imported blocks are additive and never re-open a
   hand-blocked date.
6. Watch the first real Outdoorsy booking end to end before opening the full
   104-week horizon. Consider opening one season at a time.

---

## 10. Test plan

- Unit: the snap-outward function. A Thursday–Monday 4-night event inside one
  voyage week snaps to that whole week. An event spanning a Monday boundary
  snaps to two weeks. An event exactly on a voyage week is unchanged.
- Unit: ICS serialisation — folding, `\r\n`, half-open DTEND.
- Integration: run the sync twice against a fixture feed, assert the second run
  is a no-op (`created: 0, updated: 0, deleted: 0`).
- Integration: drop a UID from the fixture, assert exactly one delete.
- Integration: empty feed after a non-empty run does **not** delete.
- Integration: an inbound event matching a `platform_pending` booking links
  rather than creating a blackout.
- Manual: `curl` the feed, validate, subscribe from Google Calendar.

---

## 11. New environment variables

| Var | Value | Where |
|---|---|---|
| `SHIP_ICAL_TOKEN` | random 32 chars, e.g. `openssl rand -hex 16` | Railway |
| `OUTDOORSY_ICAL_URL` | `https://printer.outdoorsy.com/calendars/543254/bookings.ics?token=0qhcYIVPSJhHa1lMeHHcfySTEXhg3vs3` | Railway |
| `CRON_SECRET` | already set | Railway |

Treat the Outdoorsy URL as a secret. Anyone holding it can read the ship's
booking dates. If it leaks, Outdoorsy can reissue it from the calendar page.

---

## Handoff Breakdown — Who Does What

### YOU (Rye) — things only you can do

| # | Task | Why only you | Command / Where |
|---|------|-------------|-----------------|
| H1 | Add `SHIP_ICAL_TOKEN` to Railway | Railway dashboard login | Railway → web service → Variables. Generate with `openssl rand -hex 16` |
| H2 | Add `OUTDOORSY_ICAL_URL` to Railway | Railway dashboard login | Value in §11 |
| H3 | Run migration 0223 against Railway MySQL | VM cannot reach `*.proxy.rlwy.net` | See PowerShell block below |
| H4 | Add the Railway cron job for `/api/cron/outdoorsy-sync` | Railway dashboard | Every 15 min, `POST` with `Authorization: Bearer $CRON_SECRET` |
| H5 | `git add -A && git commit && git push` | Claude Code holds index.lock | Branch per usual |
| H6 | Decide and set the Outdoorsy nightly rate; turn Smart Pricing off | Browser action on an account | Listings → Pricing → Edit. §8 |
| H7 | Paste the feed URL into Outdoorsy → Add calendar | Browser action on an account | Only after step 2 of §9 |
| H8 | Clear the manual Unavailable blocks | Browser action on an account | Calendar → Update availability → From/To → Available. **Last step, §9 step 5** |
| H9 | Diarise 2027-04-05 for the year-two Outdoorsy price step | Judgement call | §8 |

```powershell
# H3 — load .env into the PowerShell session first
$env = Get-Content .env | Where-Object { $_ -match '=' -and $_ -notmatch '^#' }
foreach ($line in $env) { $k,$v = $line -split '=',2; [System.Environment]::SetEnvironmentVariable($k,$v) }

# Then run the migration
npx tsx scripts/run-migration.ts
npx tsx scripts/run-migration.ts --status   # confirm 0223 is listed as applied
```

### CLAUDE CODE — already done or can be done without you

| # | Task | Status |
|---|------|--------|
| C1 | Verify Outdoorsy import accepts arbitrary iCal URLs | VERIFIED (browser, 2026-08-01) |
| C2 | Retrieve the Outdoorsy export URL and confirm it contains only bookings | VERIFIED |
| C3 | Set Advance Notice to "Must book at least 3 days in advance" | DONE (browser, 2026-08-01) |
| C4 | Confirm Turnaround must stay same-day; leave unchanged | DONE |
| C5 | Write `server/routes/shipCalendarFeed.ts` and mount it | NOT STARTED |
| C6 | Write `drizzle/0223_ship_blackout_source.sql` + schema.ts columns | NOT STARTED |
| C7 | Write `server/jobs/outdoorsySync.ts` incl. parser, snap-outward, reconciliation | NOT STARTED |
| C8 | Add `/api/cron/outdoorsy-sync` to `server/_core/index.ts` | NOT STARTED |
| C9 | Extract the voyage-week grid helper to `shared/shipVoyageGrid.ts` | NOT STARTED |
| C10 | Unit + integration tests per §10 | NOT STARTED |
| C11 | Admin "Calendar sync" panel (Phase 3) | NOT STARTED |
| C12 | Google Calendar mirror (Phase 3, optional) | NOT STARTED |

### WAITING ON YOU before Claude Code can proceed

- Nothing blocks C5–C10. They can all be written and typechecked now.
- C10's integration tests that touch the DB are BLOCKED on H3 (migration applied).
- The cutover in §9 is BLOCKED on H1, H2, H3, H4, H5.
- §8 pricing is BLOCKED on H6 — a number is needed, and only you should set a price.


---

## 12. Session log — 2026-08-01

### Code
Phase 1 written and tested (see §5). 25/25 unit tests pass. The serializer typechecks
clean under `strict` + `noUnusedLocals`. The route itself was NOT typechecked: the
toolchain will not run in the Cowork VM (pnpm symlinks break under the mount —
`Cannot find package '@vitest/utils'`), so `pnpm check` is a Rye step before pushing.

### Outdoorsy — the ship is now bookable

Live availability was read from production first (`ship.availability` is a public
procedure, so `fetch('/api/trpc/ship.availability')` from regencivics.earth returns it).
The result changed the plan: there are **10 blocking bookings and 1 blackout already on
the calendar**, plus 2 migration weeks. Opening Outdoorsy wholesale would have put all
thirteen up for sale.

So the calendar was opened gap by gap instead, setting only the genuinely-free runs to
Available and leaving everything else blocked. This fails closed: a fumbled range leaves
a week shut, never oversold.

Opened (all confirmed):

| Range | Why it is open |
|---|---|
| 2026-08-03 → 2026-09-13 | free |
| 2026-09-28 → 2026-10-11 | free |
| 2026-10-26 → 2026-11-08 | free |
| 2026-11-16 → 2026-12-06 | free |
| 2026-12-14 → 2027-01-10 | free |
| 2027-01-18 → 2027-01-24 | free |
| 2027-02-01 → 2027-02-07 | free |
| 2027-02-15 → 2027-02-21 | free |
| 2027-03-01 → 2027-03-14 | free |
| 2027-03-22 → 2027-03-28 | free |

Left blocked, on purpose:

- Every week already booked on regencivics.earth: 2026-09-14, 2026-10-12 (blackout),
  2026-10-19, 2026-11-09, 2026-12-07, 2027-01-11, 2027-01-25, 2027-02-08, 2027-02-22,
  2027-03-15, 2027-03-29.
- Both migration passages: 2026-09-21 and 2027-09-20.
- **Everything from 2027-04-05 onward.** This is `SHIP_YEAR2_START_YMD`: direct pricing
  doubles to $600/night there, and Outdoorsy carries one flat nightly rate. Opening past
  that boundary would sell year-two weeks at year-one prices. It stays shut until the
  year-two rate is set (§8).

Verified by scraping the host calendar DOM for Aug–Oct: `2026-08-01→03` blocked (advance
notice), `08-04→09-13` open, `09-14→09-27` blocked, `09-28→10-11` open, `10-12` onward
blocked. Boundaries exact.

### Gotchas found in the Outdoorsy host UI

- The From/To fields are `readOnly`; dates must be picked in the widget. The picker always
  reopens on the current month.
- **The availability radio needs a real click on the label, not the ring.** A click that
  lands on the radio circle can register as hover only: the ring highlights, the value
  does not change, and Apply stays disabled. One range silently failed this way and had to
  be redone. Check that Apply is enabled before clicking it.
- Apply being *disabled* while a radio is selected is a useful read: it means the range is
  already in that state. Handy for verifying without changing anything.
- The host calendar only renders three months at a time and will not scroll further, so
  visual verification past ~90 days is not possible in that UI.
- The window intermittently reflows to the mobile layout after Apply. Re-navigate and
  re-assert the window size before the next interaction, or clicks land on the wrong
  elements.

### Still open

- §8 pricing. Outdoorsy is live at **$350/night with Smart Pricing on ($300–350)**, which
  ties or undercuts the $300/night direct trial rate and would sit at little over half of
  direct from April 2027. This is the one thing actively working against the flywheel
  right now.
- Phase 2 (inbound sync) not started.

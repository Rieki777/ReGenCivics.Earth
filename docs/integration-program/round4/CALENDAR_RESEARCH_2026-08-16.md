# Village calendar research memo

Date: 2026-08-16. Scope: (1) what makes shared community calendars get used, (2) how to render 12 Gregorian months and 13 lunar months with equal weight. Sources inline. Esoteric or contested systems are marked.

## Part 1. Community calendar designs

1. **Burning Man Playa Events** (https://playaevents.burningman.org/help/). Good: one intake form, one-time or recurring, 40-char titles and 80-char descriptions force scannable listings, human moderators edit before rejecting, one submission feeds web, app and the printed WhatWhereWhen. Fails: printed entries freeze at the deadline, so on-site changes exist only digitally.
2. **Social Layer at Edge Esmeralda / Edge City Lanna** (https://edgeesmeralda2025.substack.com/p/our-community-calendar-is-live, https://app.sola.day/event/edgecitylanna). Good: any resident creates a session with venue, co-hosts, tags and public/private visibility; venue picker shows "Unavailable" when booked; List, Compact and Week views; sync to personal calendars; meals need RSVP so the kitchen can count. Fails: a commenter reported the published agenda and Social Layer disagreeing, two-sources-of-truth drift.
3. **Gather (cohousing)** (https://info.gather.coop/testimonials/). Good: meals with sign-up, work jobs, reservations and billing in one place; one community cut meals accounting from 10+ hours a month to under 2; meals and jobs sync into personal calendars. Fails: cohousing-specific and the public site documents little (https://info.gather.coop/).
4. **Mosaic (cohousing intranet)** (https://mosaicsoftware.org/, https://docs.mosaicsoftware.org/modules-pages/calendars). Good: free and self-hostable; regular, guest-room, common-meal, birthday and meeting calendars overlap on one Main Calendar; group calendars visible to group or whole community; household-private calendars; "Allow people to register" checkbox with a visible registrant list; recurring events; scheduled reminder emails; read-only rendering without edit rights. Fails: no documented iCal feed, print view or headcount cap.
5. **Orthodox Monastery of the Transfiguration** (https://www.orthodoxmonasteryellwoodcity.org/calendar). Good: embedded Google Calendar plus a public .ics feed and a written daily rule of prayer; timezone stated in words. Fails: feasts and fasts are absent from the embed, and daylight-saving display problems are acknowledged in text.
6. **Hebcal** (https://www.hebcal.com/, https://www.hebcal.com/hebcal). Good: the strongest dual-calendar precedent; Hebrew date shown against Gregorian cells, Rosh Chodesh (new month) toggle, iCal, CSV, PDF and print, 7-year perpetual feed. Fails: dense settings page a casual member will skip.
7. **Luma** (https://help.luma.com/p/luma-calendar-overview, https://help.luma.com/p/calendar-memberships). Good: a calendar page people follow, tags, map, newsletters to followers, member-only calendars, capacity plus waitlist. Fails: community-submitted events from other calendars cannot be managed by the calendar owner.
8. **Partiful** (https://help.partiful.com/hc/en-us/articles/26526377667739-Why-use-Partiful, https://party.pro/partiful/). Good: Going / Maybe / Can't Go in one tap, guests see who is going, no app needed to RSVP, automatic reminders and host "text blast" for door codes or "bring plates". Fails: single-event invites, no shared calendar or recurrence.
9. **Meetup** (https://help.meetup.com/hc/en-us/articles/360003883411). Good: attendee limit auto-enables a waitlist that promotes people as spots open, guests per RSVP. Fails: paid tier gets waitlist priority, which is corrosive in a village.
10. **LibCal (Springshare)** (https://www.springshare.com/libcal). Good: registration forms, waitlists, iCal feeds, embeddable widgets, printable flyers, filters by category, location and audience. Fails: institutional pricing and staff-only posting.
11. **CSA pickup schedules** (https://www.redfirefarm.com/csa/locations-pickup-times/, https://www.nicholsfarm.com/csa/pickup-locations). Good: the whole season as one table, "week N of 22", pickup windows by site. Fails: static pages, no per-week changes or sign-ups.
12. **Personal calendar apps.** Notion Calendar (https://www.notion.com/blog/introducing-notion-calendar) pins a second timezone beside yours; Vimcal (https://efficient.app/apps/vimcal) has a "time travel" view that shifts the whole grid to another zone; Fantastical (https://flexibits.com/blog/2022/08/keep-your-interests-sorted-with-interesting-calendars/) offers subscribable "Interesting Calendars" including moon phases; Amie is praised for beauty and knocked for sync bugs (https://efficient.app/apps/amie); Rise shut down 31 March 2025 and erased user data (https://alternativeto.net/news/2025/1/rise-calendar-is-shutting-down-users-are-urged-to-export-their-data-by-march-31-2025). Category failure: they render in the viewer's zone, and Google's embed `ctz` parameter is unreliable on click-through (https://groups.google.com/g/google-calendar-api/c/v1tqP1UZeNE, https://support.google.com/calendar/answer/37083).

### What makes a 30 to 300 person shared calendar get used

- **One source of truth with feeds out.** Every failing case above (Edge agenda drift, frozen print guide, Luma foreign events) is a second copy. Publish .ics feeds per calendar (Hebcal, LibCal and the monastery all do) so Google or Apple act as mirrors.
- **Adding is one screen**: title, when, where, host, visibility. Playa Events' character limits are a feature: short entries scan well on a phone.
- **RSVP that answers the kitchen's question.** Going / Maybe / No plus headcount, waitlist when capped, and structured "bring" or "role" slots (dish, ride, childcare, dish crew) modelled on Mosaic's registrant list and Gather's meal jobs. Show who is going; Partiful does because it drives attendance.
- **Recurring rhythms as first-class objects** (weekly meal, work day, moon circle) with per-instance overrides.
- **"Who's on site this week."** None of the apps above do this; Mosaic's guest-room calendar and Social Layer's venue availability come closest. A stay is an event on a People layer; the week view lists arrivals and departures.
- **Layers with visibility per layer**: village-wide, team, household, private, public. Mosaic's model.
- **Moderation by role**: anyone posts to their own layer, a small crew approves the public layer, no priority for payment.
- **Timezone is the village's, always.** Store UTC instants, render in the village zone for every viewer, print the zone name.
- **Print and low bandwidth**: monthly print view (Hebcal PDF, LibCal flyers), server-rendered list view, weekly digest email with arrivals, meals and moon events.

## Part 2. Twelve months and thirteen moons

### (a) Established systems and how they anchor months

- **Dreamspell / 13 Moon "Law of Time"** (https://en.wikipedia.org/wiki/Dreamspell). Esoteric, by José Argüelles. 13 x 28 = 364 plus a "Day Out of Time" on 25 July, year begins 26 July; months named after "galactic tones" (Magnetic, Lunar, Electric...). 29 February is "0.0 Hunab Ku", outside week and month. Ignores the real Moon; unrelated to the Maya calendar. Contested.
- **International Fixed Calendar (Cotsworth / Kodak)** (https://en.wikipedia.org/wiki/International_Fixed_Calendar). 13 x 28, extra month "Sol" between June and July, Year Day after 28 December, Leap Day after 28 June; Kodak used it 1928 to 1989. Solar, ignores the Moon.
- **"Celtic tree calendar"** (https://en.wikipedia.org/wiki/Celtic_calendar). Robert Graves' invention, no historical basis. The real Coligny calendar was lunisolar with intercalary months on a 5-year cycle. Contested.
- **Hebrew** (https://en.wikipedia.org/wiki/Hebrew_calendar). Months 29 or 30 days; leap month Adar I in years 3, 6, 8, 11, 14, 17, 19 of the 19-year Metonic cycle, keeping Passover after the March equinox. Two new years (Nisan, Tishrei).
- **Chinese** (https://en.wikipedia.org/wiki/Chinese_calendar). Month begins on the new-moon day computed in UTC+8; month 11 must contain the winter solstice; the first month without a major solar term (zhongqi) becomes the leap month; 7 leap months in 19 years. The best-documented rule for "which lunation is the 13th".
- **Islamic** (https://en.wikipedia.org/wiki/Islamic_calendar). Pure lunar, 354 or 355 days, no intercalation, regresses through the seasons in about 33 years.
- **Anishinaabe / Ojibwe moons** (https://ojibwe.net/projects/months-moons/, https://www.zhaawanart.com/post/dance-of-the-13-moons). Names describe the land (Sugar Making, Strawberry, Ricing, Freezing Over), vary by community, and the 13th moon "occurs irregularly, falling into different months each year". Thirteen scutes on a turtle's back carry the teaching.
- **Old Farmer's Almanac names** (https://www.almanac.com/full-moon-names). Wolf, Snow, Worm, Pink, Flower, Strawberry, Buck, Sturgeon, Harvest, Hunter's, Beaver, Cold; Algonquin, colonial and European sources mixed, regional variation acknowledged. Harvest Moon is defined by the equinox.
- **Wheel of the Year** (https://en.wikipedia.org/wiki/Wheel_of_the_Year). Four quarter days (solstices, equinoxes) plus four cross-quarters (Imbolc, Beltane, Lughnasadh, Samhain); assembled mid-20th century by Gardner and Nichols from older parts; shifted six months in the southern hemisphere.
- **Liturgical year** (https://en.wikipedia.org/wiki/Date_of_Easter). Easter is the first Sunday after the ecclesiastical full moon on or after 21 March, computed by Metonic-cycle epacts, sometimes a day or two off the real Moon. Precedent for "computed, then fixed for everyone".

### (b) The astronomy

Synodic month averages 29.53 days; a tropical year holds about 12.37 lunations, so a year contains 12 or 13 new moons and 12 or 13 full moons, with a 13th roughly every 2.7 years, seven per 19 years (https://en.wikipedia.org/wiki/Blue_moon). I ran `astronomy-engine` for 2025 to 2028: new moons per Gregorian year 12, 12, 13, 12; full moons 12, 13, 12, 13; new moons counted solstice to solstice 13, 12, 12, 13. "13 moons a year" is true only in leap-moon years, and can be true for full moons and false for new moons in the same year (2026).

Honest options:

1. **Thirteen fixed 28-day months plus a day out of time** (Dreamspell, IFC). Simple, printable, identical every year, and a solar calendar in lunar clothes: month 1 drifts off the real Moon by up to two weeks within a year.
2. **True lunations anchored to a solar event.** Month 1 begins at the first new (or full) moon after the December solstice (or March equinox); months run 29 or 30 days; when a solar year holds 13 lunations the 13th is a named intercalary moon (Chinese rule, or the seasonal blue-moon rule: third of four in a season). Months are real, and the interface must say plainly that some years have 12.
3. **Hybrid**: real lunations always, with the fixed 13-moon layer as an optional overlay.

Compute locally. `astronomy-engine` (MIT, JS/TS/Python/C/C#/Kotlin, ±1 arcminute) gives `SearchMoonQuarter`/`NextMoonQuarter` for new, first, full, third and `Seasons(year)` for equinoxes and solstices (https://github.com/cosinekitty/astronomy). `suncalc` gives illumination, phase fraction and rise/set, without phase instants or seasons (https://github.com/mourner/suncalc). Both descend from Meeus ch. 49 (k = (year - 2000) x 12.3685, mean JDE plus periodic terms) and ch. 27 (JDE0 polynomials, under a minute for 1951 to 2050) (https://celestialprogramming.com/moonphases.html, https://stellafane.org/misc/equinox.html).

Precision: a village needs the calendar day, and the day depends on the zone. In my run, 10 of 12 new moons in 2026 land on different dates in Los Angeles and Auckland (2026-03-19T01:24Z is 18 March in LA and 19 March in Auckland). Compute the instant in UTC, convert once with the village's IANA zone, cache the day table for 20 years. Sunset-start days (Hebrew) are a further choice.

### (c) UI precedents and four layouts

Precedents: Hebcal's dual-date grid and Rosh Chodesh markers; Chinese "two calendars" apps printing the lunar date under each Gregorian day (https://play.google.com/store/apps/details?id=com.synergieapps.twocalendars); rokuyō and old-calendar overlays in Japan (https://apps.apple.com/us/app/rokuyo-calendar/id6736388031); Fantastical's moon-phase subscription; permaculture year wheels with concentric rings for seasons, months and daylight (https://permies.com/t/41611/permaculture/circular-calendar-seasons); Round Calendar's clock-like views (https://www.newroundcalendar.com/); spiral moon-phase posters (https://www.amazon.com/Calendar-Phases-Spiral-Layout-Unframed/dp/B08B663Y1S).

Layouts, mobile first:

1. **Two-ring year wheel.** Outer ring: 12 Gregorian months. Inner ring: 13 (or 12) lunations as arcs of true length, new-moon ticks at each boundary, solstice and equinox spokes cutting both rings, sabbats as small marks. Tap an arc to open that month in either system. Equal weight is literal. Trade-off: 365 days on a phone circle is small; it serves as year page and print poster while a denser view carries daily work.
2. **Twin month grids.** A normal 7-column Gregorian grid and a 29/30-day lunar-month grid laid out by lunar day, behind a segmented switch. Each cell prints the other system's date and a phase glyph. Trade-off: the switch makes one system primary at any moment.
3. **Continuous strip.** A horizontal timeline; Gregorian month bands above, lunar month bands below, phase icons on the axis, solar events as vertical lines. Days are equal width, so both systems read against one ruler. Trade-off: weak for a dense week of events.
4. **Stacked headers on the week view.** Two header rows of equal height, "August 2026" and "Ricing Moon, day 12 of 30", lunar day and phase in every cell, wheel one tap away. Trade-off: the lunar month appears as a label only.

Pick: 1 plus 4. The wheel is the identity of the calendar and its year and print view; the week view is where people RSVP, and equal stacked headers keep both systems present without slowing the daily job. Layout 2 can follow as the month tab, switch remembered per person.

## Five open questions for the village

1. Which solar event anchors month 1: December solstice, or March equinox (southern hemisphere: reversed)?
2. Does a moon month start at new moon, at full moon, or at first visible crescent, and does the day start at midnight or sunset?
3. Month names: numbers, seasons, borrowed moon names, or village-chosen names describing this land, with a named 13th intercalary moon?
4. In a 12-lunation year, is there no 13th moon, or a fixed overlay always shown?
5. Which IANA timezone is "village time", and do off-site members see the same days?

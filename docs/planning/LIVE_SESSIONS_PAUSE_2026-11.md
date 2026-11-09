# Live sessions pause, November 2026

Rye, 2026-11-09: pause the Season 2 calls and the monthly Open Access calls and their emails, move to how-to videos sent by email, and take the sessions off people's calendars for now. Decision record: ADR-80. How the switch works: `shared/livePause.ts`.

## The switch

Admin > Events has a card for **Season 2** and one for **Open Access sessions**, beside the Interoperability Circle's card. Each says Paused or Running and has a Pause / Resume button.

- **Pause**: every upcoming session in that series is cancelled, its reminder emails are switched off, subscribed calendars drop it on their next refresh (usually a few hours, up to a day for Google), the public Google Calendar loses it, and the site shows the pause notice where the next session and the calendar buttons were.
- **Resume**: the sessions the pause cancelled come back, with the reminders that were on. They reappear on subscribers' calendars as updates. Add any new dates to `shared/sessionClock.ts` first if the old ones have passed.

## Transition checklist

| Step | Who | Status |
|---|---|---|
| Ship the pause switch | Claude | see SHIPPED_LOG.md |
| Pause Season 2 and Open Access in Admin > Events | Claude, after deploy | |
| Check for queued Outbound letters about sessions and cancel them | Claude or Rye | |
| Personal note to role holders and active land projects before the broadcast | Rye | |
| Confirm every Season 2 quest, harvest and role reward is credited | Rye or the Resource Season Organizer | |
| Send the farewell email (below) through Outbound to Season 2 approved members and the Open Access list | Rye approves the final text | |
| First how-to video email | Rye | |

## The farewell email (draft for Rye)

Send from Outbound. Audience: the list "Season 2 members and the Open Access list" (Outbound list `live_sessions`, added 2026-11-09). People who muted those topics stay muted. Loaded into Outbound as a draft for Rye; use Preview send, then Confirm. The how-to video letters go to the same list.

**Subject:** Thank you for Season 2

> Hi {name},
>
> Thank you for being part of Season 2. We learned a ton together.
>
> We're pausing the live sessions, both the Saturday Season 2 calls and the monthly Open Access calls. I'm going to make how-to videos for each piece we built, so you can keep building your economies together on your own time.
>
> Over the coming weeks you'll get emails with those videos. Every Season 2 recording stays up at https://regencivics.earth/recordings.
>
> If you added the sessions to your calendar, they're cancelled and you can delete them.
>
> We hope you and your projects keep thriving.
>
> Rye

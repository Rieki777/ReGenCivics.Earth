# ReGen Civics Event Flow — Full Overview

> Last updated: March 2026. Reference this before touching anything related to events, schedule, recordings, or reminders.
> Email copy section added — proofread and update text directly in this file, then ask Claude to push the changes.

---

## The Complete Flow

```
Rye adds event in Admin
        │
        ▼
events table (DB) ─────────────────────────────────────────────────────────────
        │                                                                       │
        │                                                                       │
        ▼                                                                       ▼
Schedule page reads events                                    (optional) Google Calendar API
Shows upcoming cards with:                                    Auto-adds event to public
  - Date, time, description                                   ReGen Civics calendar
  - "Get Reminder" signup button
  - Zoom/Riverside join link
        │
        ▼
Visitor clicks "Get Reminder"
        │
        ▼
event_signups table (DB)
stores: eventId, email, name
        │
        │  24 hours before event
        ▼
Cron endpoint: /api/cron/event-reminders
Sends reminder email via Resend to all event_signups for that event
(one email per event, reminderSent flag prevents double-send)
        │
        │  Event happens (Zoom + Riverside)
        ▼
Recording saved in Riverside
        │
        ▼
Riverside fires recording.complete webhook
→ POST /api/webhooks/riverside
        │
        ▼
server/webhooks/riverside.ts
  1. Verifies HMAC-SHA256 signature (RIVERSIDE_WEBHOOK_SECRET)
  2. Upserts recording in recordings table
  3. Creates forum post in Episodes category
  4. Emails ALL newsletter subscribers: title, summary, Watch + Forum buttons
  5. Sets emailSent = 1
        │
        ▼
Admin > Recordings tab
  - Add YouTube URL once uploaded
  - Edit AI summary
  - Resend email if needed
  - Feature the recording
        │
        ▼
Schedule card for that event gains "Watch Recording" link
(once recordingId is linked in Admin > Events)
```

---

## Database Tables

### `events`
Stores every scheduled event.

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| title | varchar(255) | |
| description | text | |
| type | enum | `open`, `episode`, `special` |
| startTime | timestamp | UTC |
| endTime | timestamp | UTC |
| timezone | varchar(10) | Display hint: `EST`, `EDT`, `UTC` |
| zoomUrl | varchar(512) | Defaults to global Zoom if null |
| riversideRoomUrl | varchar(512) | Set when room is created |
| youtubeUrl | varchar(512) | Livestream/premiere link |
| recordingId | int | FK to recordings (set after session) |
| status | enum | `upcoming`, `live`, `completed`, `cancelled` |
| season | varchar(50) | `Season 2`, `Open`, etc. |
| episodeNumber | int | For sorting within a season |
| reminderSent | tinyint | 1 when 24h reminder has been sent |
| createdAt / updatedAt | timestamp | |

### `event_signups`
Per-event reminder subscribers. Distinct from newsletter subscribers.

| Column | Type | Notes |
|---|---|---|
| id | int PK | |
| eventId | int | FK to events |
| email | varchar(320) | |
| name | varchar(255) | Optional |
| createdAt | timestamp | |

Unique constraint on (eventId, email) prevents duplicate signups.

---

## Files Involved

### Server
- `drizzle/schema.ts` — events + event_signups table definitions
- `drizzle/0076_events_and_signups.sql` — migration to run on Railway
- `server/routes/events.ts` — tRPC router: public list, admin CRUD, reminder send
- `server/routers.ts` — wire up events router
- `server/_core/index.ts` — `/api/cron/event-reminders` endpoint (Railway cron target)
- `server/webhooks/riverside.ts` — handles recording.complete, emails newsletter

### Client
- `client/src/pages/Schedule.tsx` — reads events from DB via tRPC, generates calendar URLs dynamically
- `client/src/pages/Admin.tsx` — AdminEventsTab: create/edit/delete events, see signup counts
- `client/src/components/admin/AdminSidebar.tsx` — "Events" nav item added

---

## Your 3 Manual Tasks

### 1. Run the migration on Railway

In Railway > MySQL > Data tab, run the SQL from `drizzle/0076_events_and_signups.sql`.

Or run the Node.js migration script (same pattern as the recordings migration):
```bash
node run_migration.mjs
```

### 2. Register the Riverside webhook

In Riverside Settings > Integrations > Webhooks (requires Creator plan):
- URL: `https://regencivics.earth/api/webhooks/riverside`
- After saving, copy the webhook secret Riverside shows you
- Go to Railway > ReGenCivics.Earth service > Variables
- Replace `RIVERSIDE_WEBHOOK_SECRET` value with the one from Riverside

### 3. Set up Google Calendar auto-add (optional but recommended)

To have Admin > Events automatically push to your public ReGen Civics calendar:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable the Google Calendar API on your project
3. Create a Service Account with Calendar access
4. Share your ReGen Civics calendar with the service account email (editor access)
5. Download the service account JSON key
6. Add to Railway env vars:
   - `GOOGLE_CALENDAR_ID` = `63ce71cca81ab47fb9986b4bc1dd379eba3da72ecc93a9b8424c5c49812fa69f@group.calendar.google.com`
   - `GOOGLE_SERVICE_ACCOUNT_KEY` = (the full JSON key as a string)

Until this is set up, events are created in the DB only. You can still manually add them to the calendar.

### 4. Set up Railway cron for event reminders

In Railway > New Service > Cron Job:
- Schedule: `0 * * * *` (runs every hour, checks for events in ~24h)
- Command: `curl -X POST https://regencivics.earth/api/cron/event-reminders -H "Authorization: Bearer $CRON_SECRET"`
- Add `CRON_SECRET` to your Railway env vars (same value as the env var on the app service)

---

## What's Automated vs Manual

| Step | Who does it | How |
|---|---|---|
| Create event | Rye, in Admin > Events | Form, saved to DB |
| Event appears on Schedule page | Automatic | DB → tRPC → client |
| Event added to public Google Calendar | Automatic (once service account is set up) | Google Calendar API |
| Visitor signs up for reminder | Automatic | event_signups table |
| 24h reminder email | Automatic (once Railway cron set up) | Cron → Resend |
| Recording session | Rye + guests | Riverside room |
| Recording processed | Automatic (once webhook registered) | Riverside webhook |
| Forum post created | Automatic | webhook handler |
| Newsletter email sent | Automatic | webhook handler |
| YouTube URL added to recording | Rye, in Admin > Recordings | Manual (until Riverside auto-upload is wired) |
| "Watch Recording" linked on Schedule | Rye links recordingId in Admin > Events | One-click in Admin |

---

## Riverside Webhook Payload Reference

Our server handles all of these field variations (Riverside's payload shape varies by plan):

```json
{
  "event": "recording.complete",
  "data": {
    "id": "abc123",
    "recording_id": "abc123",
    "url": "https://...",
    "recording_url": "https://...",
    "title": "Session Title",
    "name": "Session Title",
    "recording_name": "Session Title",
    "duration": 3600,
    "duration_seconds": 3600,
    "created_at": "2026-03-29T18:00:00Z",
    "thumbnail_url": "https://...",
    "transcript": "...",
    "ai_summary": "..."
  }
}
```

The `rawWebhook` JSON column in `recordings` stores the full payload on first receipt for debugging.

---

## Email Copy — All Outgoing Emails

> Proofread and edit the text below. To push changes, open this file and ask Claude to update the server code to match. The bold labels are file locations, not copy.
>
> Rules for this copy: no em-dashes, no "delve/tapestry/foster/leverage/vibrant/crucial/transformative", no contrast framing ("this is not X, this is Y"), no rhetorical question openers. Direct, grounded, specific.

---

### Email 1: Event Signup Confirmation

**Sent:** Immediately when someone clicks "Get Reminder" on the Schedule page.
**To:** The person who signed up.
**File:** `server/routes/events.ts` → `signup` mutation (currently no confirmation email — this is a planned addition)

> ⚠️ **This email does not exist yet.** It should be added. Suggested copy below — confirm and we'll build it.

**Subject line:**
```
You're on the list for [Event Title]
```

**Body:**
```
Hey [Name or "there"],

You're signed up for a reminder for [Event Title] on [Day, Month Date] at [Time TZ].

We'll send you a reminder the day before so you don't miss it.

See you there.

— The ReGen Civics team

[Button: View the full schedule → regencivics.earth/schedule]
```

**Footer:**
```
You're getting this because you signed up for a reminder on regencivics.earth.
[Unsubscribe from this event's reminder]
```

---

### Email 2: 24-Hour Reminder

**Sent:** ~24 hours before the event. Triggered by the hourly cron job, or manually via Admin > Events > "Send Reminders".
**To:** Everyone who signed up for that specific event.
**File:** `server/routes/events.ts` → `sendReminders` mutation AND `server/_core/index.ts` → `/api/cron/event-reminders`

> ✅ This email exists. Edit copy below.

**Subject line:**
```
Reminder: [Event Title] is tomorrow
```

**Header tag:**
```
Starting in ~24 hours
```

**Title:**
```
[Event Title]
```

**Date line:**
```
[Full date] at [Time TZ]
```

**Description:**
```
[The event description from the DB — set when you create the event in Admin]
```

**Buttons:**
- Primary blue: `Join on Zoom`
- Secondary green outline: `View Schedule`

**Footer:**
```
You signed up for a reminder for this event.
[View all events → regencivics.earth/schedule]
```

---

### Email 3: Recording Ready (Newsletter Blast)

**Sent:** Automatically when Riverside fires the `recording.complete` webhook.
**To:** All active newsletter subscribers (not just event signups — this goes to everyone).
**File:** `server/webhooks/riverside.ts` → `buildEmailHtml()`

> ✅ This email exists. Edit copy below.

**Subject line:**
```
Recording ready: [Session Title]
```

**Header tag:**
```
Recording ready
```

**Title:**
```
[Session Title]
```

**Date line:**
```
[Session date, e.g., "March 29, 2026"]
```

**Summary block (shows only if AI summary exists, green left-border callout):**
```
What we covered

[AI-generated summary from Riverside transcript]
```

**Body paragraph:**
```
The recording from our latest community session is ready. Watch it back, share it, or drop a reply in the forum.
```

**Buttons:**
- Red: `▶ Watch Recording` (links to YouTube — only shows if YouTube URL is set)
- Green outline: `💬 Join the Discussion` (links to forum post — only shows if forum post was created)

**Footer:**
```
You're receiving this because you subscribed to ReGen Civics updates.
[Unsubscribe]
```

---

### Notes on editing these

**To change a subject line or body paragraph:** Edit the text above, then ask Claude to update the matching server file.

**To change button text or colors:** The buttons live in `server/webhooks/riverside.ts` (recording email) and `server/routes/events.ts` (reminder email). Ask Claude to update.

**The Admin "Send Reminders" button** now shows a live preview of the reminder email before sending, with editable subject and body. Changes there are per-send only — not saved permanently. To make permanent changes to the default, edit this doc and ask Claude to update the server.

---

## Post-Session Engagement

This is not a survey. It's part of the session.

The goal is to keep the conversation going after the call ends — and to actually shape the next one. People fill things out when it feels like it matters. The questions below are the ones we ask every time, and the links take people somewhere alive, not a dead form.

---

### The Two Questions

These go in:
- The recording-ready email (Email 3), after the Watch/Forum buttons
- The forum post body that gets auto-created for each recording
- Optionally: a pinned comment or post in whatever WhatsApp/Telegram group we have

**Question 1:**
```
Were you there? If you missed this one, what got in the way?
```
*Why:* Attendance data matters for scheduling, but more importantly it gives people who missed a natural in. "I missed it but here's why" is a real entry point to the community.

**Question 2:**
```
What's one thing you want us to cover, or go deeper on next time?
```
*Why:* This replaces the agenda-setting form entirely. Instead of a separate survey asking "what topics do you want?", this question captures the same data as a natural follow-up to the session.

---

### Where Responses Go

**Forum thread** — The recording forum post (auto-created by the webhook) is where this lives. It's the right place: public, searchable, lets people see what others said and build on it.

Link to send people: `https://regencivics.earth/community/post/[post-id]`
(This is inserted automatically when the recording email is sent.)

**Agenda form** — Built into the website. Form is live at:
```
https://regencivics.earth/shape-next-session
```
Fields: name (optional), email (optional), what they want covered, whether they'll attend. Auto-detects the next upcoming event from the DB. Submissions stored in `agenda_suggestions` table and visible in Admin > Events > Agenda Suggestions.

To add this link to the recording-ready email and forum post, ask Claude to update `server/webhooks/riverside.ts` → `buildEmailHtml()` and `createRecordingForumPost()` with the URL above.

---

### How to Make It Feel Like Part of the Journey (Not a Survey)

A few concrete things that help:

**Frame it as contribution, not feedback.** "Help us build the next session" lands differently than "fill out this form." The questions above are written from that angle already.

**Put it in context.** The forum post auto-includes the AI summary of what was covered. When people can read what happened and then immediately respond to "what do you want more of," there's a natural connection.

**Show that it worked.** At the start of the next session, open with one line: "Last time, the most common thing you asked us to go deeper on was X. That's what we're starting with today." One sentence. It closes the loop and makes the feedback feel real.

**Don't send a separate survey email.** The forum post and the recording email are the only touchpoints. Adding a third "we want your feedback" email tanks response rate and feels extractive.

---

### Adding This to the Recording Email (When Ready)

When you're ready to add the two questions to the recording-ready email, update this section with the exact copy, then ask Claude to update `server/webhooks/riverside.ts` → `buildEmailHtml()`. The suggested placement is after the Watch/Forum buttons, in a light grey block:

```
---

Were you there? If you missed this one, what got in the way?

What's one thing you want us to go deeper on next time?

[Add your thoughts to the forum thread →]
[Shape the next session → regencivics.earth/shape-next-session]
```

---

## Seeding Existing Events

The current 15 hardcoded events in `Schedule.tsx` are the seed data. Once the migration runs, the app seeds them from the hardcoded array if the DB is empty. This is handled in the server startup logic — no manual seed step needed.

If you need to re-seed from scratch:
```sql
DELETE FROM events;
-- Then restart the server (auto-seed runs on startup if table is empty)
```

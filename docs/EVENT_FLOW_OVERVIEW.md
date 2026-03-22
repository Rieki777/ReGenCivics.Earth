# ReGen Civics Event Flow — Full Overview

> Last updated: March 2026. Reference this before touching anything related to events, schedule, recordings, or reminders.

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

## Seeding Existing Events

The current 15 hardcoded events in `Schedule.tsx` are the seed data. Once the migration runs, the app seeds them from the hardcoded array if the DB is empty. This is handled in the server startup logic — no manual seed step needed.

If you need to re-seed from scratch:
```sql
DELETE FROM events;
-- Then restart the server (auto-seed runs on startup if table is empty)
```

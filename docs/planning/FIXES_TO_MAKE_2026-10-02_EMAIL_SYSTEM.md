# Fixes to Make: the email system (2026-10-02)

**Source.** Written 2026-10-02 from a read-only map of `origin/main` at `6186455e`. Two readers covered the email infrastructure and the email flows. The coordinator then spot-checked the heaviest claims by hand. Nothing here has been run against production yet.

**Status words** follow the regen-fixes-handoff SOP. Every DONE or VERIFIED row carries evidence. A row starts as `planned`, and its severity is an estimate from the code until its evidence says otherwise.

**Companion work.** The Amora lane is building the same design for Village OS (`C:\Users\taren\Desktop\Amora\VILLAGE_COMMS_PLAN_2026-10-02.md`). That design has five parts: an address book, permissions, a post office every email passes through, editable words, and one journey engine. This doc brings ReGen Civics toward the same shape in its own stack, so the two systems behave alike. They share no files.

**Paths** are relative to the repo root. Line numbers are as read at `6186455e`; re-read before editing.

---

## How it works today (one page)

- **Sending.**
  - `sendEmail()` (`server/_core/email.ts:333-426`) wraps the Resend SDK. It never throws: held, limited and keyless sends return `{id:null}`.
  - `notifyOwner()` (`server/_core/notification.ts:42-87`) calls Resend with a raw fetch. That bypasses the hold switch, the limiter and the logs.
- **The limiter** is in memory and per process (`server/_core/email.ts:241-323`).
  - `EMAIL_RATE_LIMIT_PER_HOUR` defaults to 50 (`:267`).
  - `STARTUP_EMAIL_LIMIT` defaults to 5 recipients in the first 120 seconds after boot (`:262-263`).
  - Sign-in mail has its own budget of 200 an hour.
  - Callers count attempts as sends.
- **Logs.** `email_logs` gets a row from 5 of the 39 `sendEmail` call sites. Rows are written as `sent` before the send happens.
- **Tracking.**
  - Opens: an open pixel with unsigned, sequential ids.
  - Clicks: HMAC-signed click redirects.
  - The Resend webhook verifies Svix signatures, then processes after answering 200. It does not dedupe on `svix-id`. When it finds no matching id, it falls back to the recipient's latest row.
- **Consent is spread over seven stores:**
  1. `newsletter_subscribers` topics, double opt-in
  2. the signed prefs link (JWT, 365 days)
  3. unsubscribe by typed address
  4. list tokens for campaign followers and the crowdpool waitlist
  5. account `notificationPrefs`
  6. `event_signups.cancelledAt`
  7. assorted owner-routing settings
  - No email carries a `List-Unsubscribe` header.
  - Bounces and complaints are never checked before a send.
- **Scheduling.**
  - Railway HTTP crons call `/api/cron/*`.
  - In-process timers restart with every deploy.
  - There are four separate schedulers for emails: `scheduled_emails`, Outbound scheduled letters, reminder offsets, and `events.reminderScheduledFor`.
- **Templates come in three generations.**
  - The `emailTemplates` object.
  - Markdown letters (`shared/emailMarkdown.ts`, `shared/letterHtml.ts`). These are the good ones: one renderer for preview, PDF and send.
  - Per-feature builders, each with its own chrome.
  - There is no plain-text part anywhere. The admin cannot edit the copy of any automated email.
- **Worth keeping, as they are:**
  - **The Outbound safe send** (`server/lib/newsletter-issue-email.ts:74-111, 308-420`): a confirm token bound to the body hash and audience, an idempotency key, a status claim, a recipient snapshot, a live unsubscribe re-check, and caps.
  - **The notification spine**: a dedupe key, and stamping only on a real send.
  - **Claim-then-send with release** (`server/lib/campaign-cancel.ts:509-523`).
  - **The reminder offsets module**, which the UI and the job share.
  - **`/join` redirects.**
  - **The `EMAIL_HOLD` kill switch.**

---

## Phase A: stop losing and misdirecting mail (do first)

Each fix lands with a test that fails on the old code: a named control, never a timeout. Before deploying any fix that changes who gets mail or when, write down what the first run after the deploy will send. A fix must never cause a burst of stale mail. The catch-up note in `FIXES_TO_MAKE_FUNDING_ENGINE.md` R-15 is the model.

| # | Fix | Severity | Where | Status | Evidence |
|---|---|---|---|---|---|
| A-0 | **Confirm the reminder crons actually run.** The legacy 20 to 28 hour blast and admin-scheduled custom reminders run only from the hourly `/api/cron/event-reminders` Railway cron. The auto-reminder offsets also have a 5-minute in-process sweep. Four other cron services have failed auth since at least Aug 31 (funding doc R-15; the nightly batch carries the event sweep). Check the operator pulse cron-health strip (`shared/operatorPulse.ts:182-238`) and the cron service list. Use the `regen-railway-crons` skill for the `sh -c` trap. | Critical until measured | Railway cron services; `server/_core/index.ts:1168-1324` | coded | Measured 2026-10-02 from Railway service config, values not read. Write-up: `docs/planning/EMAIL_CRON_HEALTH_2026-10-02.md`. No production service posts to `/api/cron/event-reminders` or `/api/cron/outbound-issues`. Five cron commands still lack `sh -c` (nightly-batch, admin-automations, operator-pulse-ping, governance-jobs, daily-contribution-snapshots). Admin health note no longer says the hourly cron runs. Commands were not changed (R-2). |
| A-1 | **Silent drops at the send limit.** Callers treat `{id:null}` as sent and stamp the flow done, so anyone past the cap never gets that email. The weekly digest first fires 60 s after boot, inside the 120 s startup window, and saves its `digests` row before sending (`server/jobs/digestJob.ts:116-124`). The 7-day guard then blocks any retry. **Fix:** every caller reads the result, and a null leaves the work retryable. Boot-time jobs start after the startup window. Until Phase C, the limiter becomes a fuse with defaults no real send reaches. Read the live values first (R-3). | Critical if the live limit is near the default | `server/_core/email.ts:262-267`; callers `server/jobs/eventReminders.ts:305-315`, `server/lib/signupReminderBlast.ts:67-76`, `server/lib/harvest-email.ts:214-218`, `server/lib/recording-finalize.ts:117-121`, `server/_core/index.ts:1625-1648`, `:1693-1698` | coded | Wave 0 on `cursor/email-wave0-silent-drop-4e93`. `sendEmail` returns `status` and writes every attempt (`server/email-silent-drop.test.ts`). Digest skips the startup window and does not save the week on a drop (`server/jobs/digestJob.reliability.test.ts`). Reminder partial claims stay due (`server/lib/reminderClaim.test.ts`). Harvest, scheduled mail, magic link, signup blast covered by `server/harvest-email-drop.test.ts`, `scheduledEmailNextStatus`, `server/auth.magic-link-drop.test.ts`, `server/lib/signupReminderBlast.test.ts`. Apply `drizzle/0284_email_attempt_status.sql` before deploy. Limiter defaults unchanged (R-3). Not VERIFIED: no production deploy. |
| A-2 | **Bounces pinned on the wrong email.** A bounce from any unlogged email (magic link, reminder) marks the person's last Outbound letter bounced. The webhook answers 200 before processing, so Resend never retries a failure. Repeats are not deduped. A complaint is stored as `failed` with a text prefix. `email.failed` is dropped. **Fix:** match only by the Resend id. Store raw events with a unique `svix-id`. Process before answering, or answer 500 to get a retry. Give complaints their own status. Handle `email.failed`, `email.suppressed` and `email.delivery_delayed`. | High | `server/webhooks/resend.ts:120-133, 167-171, 196-223` | coded | `server/lib/resendEvent.ts` matches by Resend id only. Unknown id does not call apply (`server/lib/resendEvent.test.ts`). Complaints use status `complained` (migration `drizzle/0285_email_webhook_events.sql`, after 0284). Duplicate svix-id skips. A failed apply releases the claim and the route returns 500. `email.failed`, `email.suppressed`, and `email.delivery_delayed` are handled. Not VERIFIED: migration not applied, webhook secret not read. |
| A-3 | **Wrong time in the event confirmation.** Server time (UTC) is printed with the event's PDT or PST label, so an 11:00 PDT session reads 6:00 PM PDT. **Fix:** format in the event's time zone with `Intl.DateTimeFormat`, plus the existing "your local time" link. | High | `server/routes/events.ts:363-369, 396` | planned | |
| A-4 | **Season 2 signups never get the reminder the confirmation promises.** The confirmation says "a reminder the day before" (`server/routes/events.ts:397`). The S2 audience is approved applicants only (`server/jobs/eventReminders.ts:186-188`), and the legacy blast skips auto-enabled events (`server/_core/index.ts:1196-1211`). The code admits it (`shared/eventAutoReminders.ts:276-280`). **Fix:** add event signups to every auto-reminder audience, deduped by address. | High | as listed | planned | |
| A-5 | **Catch-up sends stale reminders.** Turning auto-reminders on late fires every overdue offset at once, with false subjects ("In 7 days" a day out). A test asserts this behaviour. **Fix:** send only the most recent due offset, word the subject from the real time left, and flip the test. | Medium | `shared/eventAutoReminders.ts:247-266`; `shared/eventAutoReminders.test.ts:170-177` | planned | |
| A-6 | **One flag, three reminder paths.** `events.reminderSent` is shared by the 24-hour blast, custom scheduled reminders and manual reminders, so whichever sends first silently cancels the others. **Fix:** one claim per path, or fold all three into the offset claim ledger. | Medium | `server/routes/events.ts:1002, 1073`; `server/_core/index.ts:1207, 1256, 1269` | planned | |
| A-7 | **Work stamped done before or without a real send.** The needs/offers pair is ledgered before the send. `events.reminderSent` and `recordings.emailSent` are set after the whole fan-out, so a crash resends to everyone or drops the rest. `scheduled_emails` marks `sent` on a null result; its `catch` is dead because `sendEmail` never throws. **Fix:** claim, then send, then release on failure, per recipient where the table allows. Use the `campaign-cancel.ts:509-523` pattern. | High | `server/jobs/needsOffersMatcher.ts:64-66, 94-98, 140-141`; `server/_core/index.ts:1256, 1304, 1632-1638`; `server/lib/recording-finalize.ts:117-120` | coded | Same Wave 0 branch. `matchLedgerAction` releases when both ids are null (`server/lib/emailAttempt.test.ts`). Auto-reminder offsets use `event_auto_reminder_sends.status` plus `event_auto_reminder_deliveries` (migration 0284, default `complete` so old claims are not resent). Signup blast, scheduled custom, and manual send stamp `reminderSent` only when `dropped === 0`. Recording `emailSent` only when `dropped === 0`. `scheduled_emails` stays `pending` on `rate_limited` and `failed` otherwise. One-sided needs/offers failure is still not retried (one row per pair). Not VERIFIED. |
| A-8 | **Status emails reach the owner, never the applicant.** Application status changes are mailed to OWNER_EMAIL with "To: {applicant}" in the body. Connect-form confirmations go to the owner only. Custom Games applicants get no email at all. **Fix:** send the applicant their own copy, worded for them (R-8 approves the words), and keep the owner alert separate. | High | `server/routes/applications.ts:418-458`; `server/routes/investors.ts:433-455`; `client/src/pages/CustomGamesApply.tsx` flow | planned | |
| A-9 | **The season roll-up exposes addresses.** It puts up to 50 addresses in one To: field. **Fix:** one email per recipient. | High (privacy) | `server/routes/events.ts:1143-1151` | coded | `sendSeasonRollupEmails` sends one `to` per address (`server/lib/seasonRollup.test.ts`). A rate-limit drop is not counted as sent and stops the rest of the list. A retry skips addresses already accepted for that season. The footer still points at `/settings`. Not VERIFIED. |
| A-10 | **The check-in link mints 33 $ReGen for any email typed in.** **Fix:** a signed per-recipient token in the follow-up email, one mint per person per event, and a rate limit. Then list past mints for Rye (read-only, with his yes) to see whether anyone used the hole. | High (abuse) | `server/routes/events.ts:1261-1317` | planned | |
| A-11 | **Anyone can unsubscribe anyone.** Unsubscribe by typed address needs no proof. **Fix:** a token link, or an emailed confirmation. | Medium (abuse) | `server/routes/newsletter.ts:115-122` | planned | |
| A-12 | **Reminder opt-out dead-ends.** The reminder's only link is "Manage email preferences", which errors for anyone without a newsletter row. The per-event unsubscribe helper has no callers. **Fix:** wire the per-event stop link now. B-3 makes the preference link work for every address. | Medium | `server/lib/emailPrefs.ts:77-83`; `server/routes/newsletter.ts:137-140`; `server/lib/eventReminderEmail.ts:179-192` | planned | |
| A-13 | **A personal address is hardcoded** as "always include" in shared code that also ships to the admin client bundle. **Fix:** move it to a server-side admin setting (B-9) and remove it from `shared/`. | Medium (privacy) | `shared/eventAutoReminders.ts:288-291` | planned | |
| A-14 | **Waitlist logic.** Four separate faults: capacity counts cancelled signups; re-signing after a cancel stays cancelled; a token unsubscribe never promotes the waitlist; and the "How was it?" follow-up goes to waitlisted people. **Fix:** each one, with a test. The Interop Circle already revives cancelled signups (`server/lib/interopCircle.ts:247`), so copy it. | Medium | `server/routes/events.ts:341-345, 357-358, 1366-1428` | planned | |
| A-15 | **Owner alerts bypass `EMAIL_HOLD`, the limiter and the logs.** **Fix:** route them through `sendEmail`. | Medium | `server/_core/notification.ts:42-87` | coded | `deliverOwnerAlert` calls `sendEmail` with template `owner_notification` (`server/notification.owner-alert.test.ts`). A held or rate-limited result returns false. Tests still skip `notifyOwner` so suites do not write `email_logs`. Not VERIFIED. |
| A-16 | **An Outbound letter stuck in `sending` never resumes,** and failed recipients are never retried. **Fix:** a resume path that claims the pending recipients, plus a retry button in History. | Medium | `server/lib/newsletter-issue-email.ts:224-225` | planned | |
| A-17 | **Raw values in older templates.** Names and merge fields are interpolated unescaped. **Fix:** `textForEmail` everywhere. | Medium | `server/_core/email.ts:616-730`; `server/routes/applications.ts:239`; `server/jobs/assemblyNotify.ts:80`; `server/routes/newsletter.ts:852-860` | planned | |
| A-18 | **Doubled header and footer** on self-styled emails. Only Outbound passes `skipBrandedWrap`. **Fix:** pass it wherever a builder brings its own chrome. | Low | `server/lib/signupReminderBlast.ts:67`; `server/jobs/digestJob.ts:302`; `server/lib/harvest-email.ts:216`; `server/_core/email.ts:377` | coded | Signup blast, weekly digest, and harvest announcement pass `skipBrandedWrap: true`. The blast test asserts the flag. Owner alerts use it too. Not VERIFIED. |
| A-19 | **The session-wrap draft belongs to user 1,** and Outbound lets only its creator send it. **Fix:** any admin may send an auto-drafted letter. | Low | `server/lib/postSessionLetter.ts:167`; `server/routes/outbound.ts:103-105` | planned | |
| A-20 | **Investor drip rows stored as HTML would render as raw tags,** because the processor now reads bodies as markdown. Verify first: the funding doc's P0-10 says production `scheduled_emails` was emptied of drip rows. If no pending HTML rows exist, add a `body_format` column for safety, or close this as NOT A DEFECT with the count as evidence. | Low (verify) | `server/_core/index.ts:1635`; `scripts/fund-drip-refresh.ts:166-169` | planned | |
| A-21 | **Dead settings and flows.** Each one shows a control that does nothing: the reviewer-emails setting nothing reads (`server/db/reviews.ts:77`); the "Community Updates" and "Quest & Event Announcements" toggles; `newsletterWelcome`, which Settings says is sent and is never sent; the digest's LLM text, which is generated and unused (`server/jobs/digestJob.ts:99-117`); and the Ship Manifest sequence, which is never scheduled (`server/lib/ship-emails.ts:206-268`). **Fix:** wire each one or remove it. Ask Rye about the Ship Manifest. | Low | as listed | planned | |

**Checked by hand and NOT a defect:** "scheduled emails ignore their time". The due query returns every pending row (`server/db/emailCrm.ts:175-181`), but the caller skips rows not yet due (`server/_core/index.ts:1629`). The real defect there is A-7.

---

## Phase B: consent and compliance

| # | Fix | Status | Evidence |
|---|---|---|---|
| B-1 | `List-Unsubscribe` (an https link plus mailto) and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` on every non-essential email (RFC 8058, which Gmail and Yahoo require of bulk senders), with a POST endpoint that unsubscribes without a login | planned | |
| B-2 | An app-side suppression table checked inside `sendEmail`. The webhook writes it on hard bounces and complaints, and Admin can add or remove an address by hand | planned | |
| B-3 | One preference link that works for every address. The token is keyed by email and needs no subscriber row; it covers topics, the 30-day pause, per-event stops and unsubscribe-all. The seven stores keep their tables, and the page reads and writes all of them | planned | |
| B-4 | A dedicated `EMAIL_LINK_SECRET` signs preference, unsubscribe and confirm links. Links signed with `JWT_SECRET` still verify for 365 days, so no footer already sent breaks | coded | `server/lib/emailLinkSecret.ts` signs with `EMAIL_LINK_SECRET` when set and still verifies `JWT_SECRET`. Wired for prefs, the legacy unsubscribe purpose, and newsletter confirm (`server/lib/emailLinkSecret.test.ts`). Not VERIFIED. |
| B-5 | A real postal address in every bulk footer, set in Admin (B-9) and never hardcoded. R-1 supplies it | planned | |
| B-6 | Magic links open a confirm page that signs in on a button press (POST), so link scanners stop burning them | planned | |
| B-7 | Remove the open pixel. Apple Mail opens every email by itself, and the ids are forgeable. Keep signed click tracking. Rye decides (R-5) | planned | |
| B-8 | Retention and erasure for `email_logs`, subscribers, signups and list tokens | planned | |
| B-9 | Owner-only email settings move out of code into one Admin settings screen: sender, owner and alert addresses, the always-include list, the footer postal address, and reply routing. Rye's rule of 2026-10-02 for Village OS is that every vital founder detail is editable in Admin. Same here | planned | |

## Phase C: one door and a ledger

| # | Fix | Status | Evidence |
|---|---|---|---|
| C-1 | One `sendEmail` that always writes a ledger row: template, category, idempotency key, attempts, and a status of queued, sending, sent, failed, or skipped with its reason. It returns an honest result | planned | |
| C-2 | A durable queue drained by one job. Resend's `Idempotency-Key` is the row key. Bulk sends use the batch API (100 per call, no attachments). Failures retry with backoff, then go to a dead-letter list Admin can see | planned | |
| C-3 | The in-memory limiter stays only as a safety fuse. The queue paces sends to the provider's limits, and mail past a limit waits instead of being dropped | planned | |
| C-4 | `scripts/check-one-mail-door.mjs`: CI fails if any code calls Resend outside the door | coded | `scripts/check-one-mail-door.mjs` allows only `server/_core/email.ts` to import the SDK, construct the client, call `emails.send`, or name the provider host. Wired in `.github/workflows/ci.yml`. Not VERIFIED. |
| C-5 | Preview equals send: every admin preview calls the real renderer (the event reminder preview is a JSX lookalike today, `AdminEventsTab.tsx:554-579`). "Send me a test" in every composer | planned | |
| C-6 | A plain-text part and a preheader on every email | planned | |
| C-7 | The four email schedulers fold into one due-send table drained by the queue | planned | |

## Phase D: journeys and editable words (plan only until Rye says go)

These mirror the Village OS journey engine, which the Amora lane is building now. Build them here once that engine has proven itself, and keep the shapes the same.

| # | Fix | Status |
|---|---|---|
| D-1 | One journey engine (trigger, timed steps, stop rules). Event reminders, recaps, crowdpool nudges, the giveaway resend and the Ship Manifest move onto it | planned |
| D-2 | Admin-editable words for automated emails, with versions (`emailTemplates` only pre-fills dialogs today) | planned |
| D-3 | Per-recipient time zone, quiet hours, and one daily cap across every feature | planned |
| D-4 | Notices for ordinary events when they are rescheduled or cancelled (`events.update` emails nobody today); `.ics` attachments and add-to-calendar links on confirmations | planned |
| D-5 | An automatic recap to signups and attendees after each session. It carries the two questions and the shape-next-session link, which `docs/EVENT_FLOW_OVERVIEW.md` planned and nobody built | planned |
| D-6 | A Season 2 series subscription: one signup covers every week, like the Interop Circle | planned |
| D-7 | Rewrite `docs/EVENT_FLOW_OVERVIEW.md` to match the code. It still claims the confirmation "does not exist yet" and that recordings mail every subscriber | planned |

---

## Proof each phase owes

- **Phase A**
  - A test per fix that fails on the old code, with its name recorded in the Evidence column.
  - After each deploy, a live check. Send to Resend's test addresses (`delivered@resend.dev`, `bounced@resend.dev`, `complained@resend.dev`, with `+label` per scenario). Confirm the log row and the webhook result.
  - Never send to a real person to test.
- **Phase B**
  - The raw headers of a received test email show both `List-Unsubscribe` headers.
  - A one-click POST unsubscribes.
  - A suppressed address is skipped with its reason.
  - A preference link opened by an address with no subscriber row works.
- **Phase C**
  - The gate finds zero direct sends.
  - A send held back by the fuse is retried and delivered.
  - Two job runs at once send each row exactly once.

---

## Priority order

1. A-0
2. A-1
3. A-2
4. A-7
5. A-9
6. A-10
7. A-8
8. A-3
9. A-4
10. The rest of Phase A
11. B-1 to B-4
12. B-9
13. The rest of B
14. Phase C
15. Phase D, on Rye's go

---

## Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Where |
|---|---|---|---|
| R-1 | A real postal address (PO box or private mailbox) for the email footer. This is the same item as R-9 in `FIXES_TO_MAKE_FUNDING_ENGINE.md` | your address | Admin, once B-9 lands; today the Railway variable `HARVEST_POSTAL_ADDRESS` |
| R-2 | Fix the failing Railway cron services (funding doc R-15), and confirm the event-reminders cron service exists and authenticates | dashboard access | Railway dashboard, each cron service's Custom Start Command |
| R-3 | Say yes to the lane reading these production variables, or paste them: `EMAIL_RATE_LIMIT_PER_HOUR`, `STARTUP_EMAIL_LIMIT`, `EMAIL_HOLD`, `NODE_ENV`, and whether `RESEND_WEBHOOK_SECRET` is set | production access | Railway variables for ReGenCivics.Earth |
| R-4 | Confirm the Resend webhook targets `https://regencivics.earth/api/webhooks/resend` and subscribes to delivered, bounced, complained, failed, suppressed and delivery_delayed. Or let the lane set it through the API | Resend account | resend.com, Webhooks |
| R-5 | Open tracking: remove the pixel (recommended) or keep it | a privacy call | reply to the lane |
| R-6 | Who receives application status emails, and approve the applicant-facing words (A-8) | your voice, your applicants | reply to the lane |
| R-7 | Decide about the Ship Manifest sequence (A-21): wire it, or remove it | product call | reply to the lane |

### CLAUDE CODE: done or doable without you

| # | Task | Status |
|---|---|---|
| C-A | Phase A fixes A-1 to A-21, each with a named failing-then-passing test | planned |
| C-B | Phase B consent and compliance, B-1 to B-9 | planned |
| C-C | Phase C door, ledger and queue, C-1 to C-7 | planned |
| C-D | Phase D written up as a plan aligned to the Village OS engine | planned |
| C-E | Keep this doc's statuses and evidence current; update `SHIPPED_LOG.md` after each deploy | planned |

### WAITING ON YOU before Claude Code can proceed

- R-3 before A-1's severity is final. The code fix proceeds regardless.
- R-2 before reminders and the nightly event sweep can be verified live.
- R-1 before B-5 can be verified live.
- R-6 before A-8 ships applicant-facing words.

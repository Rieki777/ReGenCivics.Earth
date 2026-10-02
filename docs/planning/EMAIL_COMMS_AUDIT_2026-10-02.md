# Email and comms engine audit

**As of:** 2026-10-02, `main` at `6186455e`.
**Audience:** Rieki, and the next person who changes a send path.
**Method:** every number below was counted in this tree. Railway variable values and the live cron-service list were not read. Where a comment in code claims a Railway schedule, that is marked as a comment, not as a confirmed job.

An earlier note said: about 5 of 39 sending spots keep a record, four schedulers, seven unsubscribe systems, and mail can silently drop past 50 an hour. The drop and the thin recording are real. The scheduler and unsubscribe counts depend on what you count. This file is the inventory.

---

## Verdict

| Earlier claim | What the code shows |
|---|---|
| About 39 sending spots | **38** direct `sendEmail({` call sites in production server code, plus the steward digest and the campaign-end sender. **40** ways mail enters `sendEmail`. Ship's 15 templates share one of those. |
| About 5 keep a record | **5** writers insert `email_logs`. **4** of those pass `emailLogId` into `sendEmail`, which is what turns on the open pixel and the click wrapper. The fifth (Assembly governance) writes the row after Resend accepts, so the webhook can match it, and the pixel is absent. |
| Four schedulers | **9** in-process loops can send mail. **4** of those jobs also have an HTTP cron in code (`outbound-issues`, `event-reminders`, `quest-crew-assembly`, `needs-offers-matcher`). A fifth, the crowdpool daily job, also runs inside `nightly-batch`. |
| Seven unsubscribe systems | **6** email stop mechanisms, and they do not share one record. Three URLs (`/email-preferences`, `/preferences`, `/unsubscribe`) are one system. Counting those doors as separate systems is how you get to seven. |
| Silent drop past 50 an hour | True. `sendEmail` returns `{ id: null }` and does not throw. Many callers then mark the work done. A second cap, 5 recipients in the first 120 seconds after boot, can eat a weekly digest on deploy. |

Broadcast is not email. It drafts and queues social posts (Buffer). Harvest and Outbound are the two hardened letter sends. The weekly community digest is a third letter, and it does not go through either of those gates.

---

## How a send leaves

Almost every letter goes through `sendEmail` in `server/_core/email.ts`.

Order inside that function:

1. `EMAIL_HOLD=true` logs a line and returns `{ id: null }`. Nothing is sent.
2. Rate check. Over the cap: log an error, try to report to Sentry, return `{ id: null }`. No throw.
3. The send is counted against the in-memory window **before** Resend is called. A provider error still consumes the hour.
4. Optional branded wrap, then open pixel and click rewrite, only when the caller passed `emailLogId`.
5. `resend.emails.send`. On `response.error` or a thrown client error: log, return `{ id: null }`. No throw to the caller.
6. If `emailLogId` was set and Resend returned an id, stamp `resendEmailId` on that row.

Callers that only `await sendEmail(...)` and then continue treat a drop as a success. The return value is the only signal, and a drop looks like a quiet null.

`notifyOwner` in `server/_core/notification.ts` does not use this function. It POSTs to `https://api.resend.com/emails` itself. It skips `EMAIL_HOLD`, both hourly caps, the branded footer, and `email_logs`. Owner alerts (new applications, Harvest generation, operator pulse, and the "we sent a bulk email" notices) go out on that side door.

---

## Rate limits

All of these are in `server/_core/email.ts` unless noted. They live in process memory. A restart clears them. A second replica has its own counters.

| Guard | Default | Env | What happens when it trips |
|---|---|---|---|
| Kill switch | off | `EMAIL_HOLD=true` | Log, return `{ id: null }`. Outbound then marks the recipient **sent** (see below). |
| Startup burst | 5 recipients in the first 120s | `STARTUP_EMAIL_LIMIT` | Same null return. Sign-in mail (`budget: 'auth'`) skips this guard. |
| Shared hour | 50 recipients | `EMAIL_RATE_LIMIT_PER_HOUR` | Same null return. Comment in code: this is a spam guard, not a measured Resend quota. |
| Sign-in hour | 200 recipients | `AUTH_EMAIL_RATE_LIMIT_PER_HOUR` | Same null return. Only `budget: 'auth'`. Today that is the magic-link send in `server/_core/oauth.ts`. |
| Magic link, per address | 3 per 15 minutes | (code constants) | This one is honest: HTTP 429 before `sendEmail`. `server/_core/oauth.ts`. |
| Account notices | 20 stamped sends per user per rolling day | `DAILY_EMAIL_CAP` in `server/lib/notification-email.ts` | The notice is left unstamped and the daily digest can carry it. |
| Quest crew formation | 50 per run | `MAX_EMAILS_PER_RUN` | Stops the loop. Stamps a member only when `result.id` is set, so a block retries next run. |
| Harvest letter | 1 per 10 minutes, 3 per day | `harvest_email_sends` | Throws before send. Durable across restarts. |
| Outbound letter | 1 per 10 minutes, 5 per day | `newsletter_issues` | Throws before send. Durable across restarts. |

The 50-an-hour cap counts recipients, not API calls. `events.sendSeasonRollup` passes up to 50 addresses in one `to` array, which spends the whole hour on one call. Resend's `to` array is the To header, so those addresses can see each other. That path should be one letter per person, the way Outbound already sends.

### Where a drop is recorded, and where it is hidden

| Path | On `{ id: null }` |
|---|---|
| Quest crew formation, notification digest, immediate account notices, campaign-end mail | Left unfinished, so a later run can retry. These are the pattern to copy. |
| Outbound issue (`server/lib/newsletter-issue-email.ts`) | Recipient row `failed`, and the issue becomes `sent` if anyone in the batch succeeded. `runDueNewsletterIssues` only picks `status = scheduled`, so the failed tail is not retried. Under `EMAIL_HOLD`, a null id is stored as **sent**. |
| Weekly digest (`server/jobs/digestJob.ts`) | The digest row is saved **before** the loop. The loop does not read `id`. The log says the digest went to every subscriber. The next attempt waits 7 days (`generatedAt`). |
| Harvest confirm (`server/lib/harvest-email.ts`) | `sent` increments even when `id` is null. `sendEmail` does not throw on the cap, so the audit row stays `sent` with a recipient count of attempts. |
| Auto reminders (`server/jobs/eventReminders.ts`) | The offset is claimed in `event_auto_reminder_sends` **before** the loop. Every attempt increments `sent`. A dropped tail is never due again. |
| `processScheduledEmails` | Status flipped to `sent` after `sendEmail` returns, and a null id does not throw. |
| Magic link | The HTTP handler still answers `{ success: true }`. |
| Season rollup, recording summaries, signup reminders, most one-off product mail | No per-recipient row. The caller moves on. |

Startup plus the weekly digest is the sharpest member-facing case. The digest timer fires 60 seconds after boot (`server/_core/index.ts`). The startup guard is 120 seconds and 5 recipients. On a deploy where the last digest is already 7 days old, the job saves the digest, delivers about 5 letters, and does not try the rest of the list until the next week. Deploys are common on this app, so this is not a rare race.

The same hour is shared by reminders, the digest, Harvest, Outbound, recording mail, and transactional product mail. A reminder sweep that runs first can leave a Harvest send, later in the same hour, dropping the tail. Sign-in mail is on its own budget, so a blast does not by itself lock people out of logging in. `EMAIL_HOLD` still holds sign-in mail, because the hold is checked before the budget split.

---

## Send inventory

Recount: from `server/`, production files only (skip `*.test.ts` and the `sendEmail` definition), every `sendEmail({` and the one `sendEmailImpl({`. That is 39. Add `server/lib/campaign-cancel.ts` `await send({`, which defaults to `sendEmail`. That is 40.

`email_logs` means an insert into that table. "Pixel" means `emailLogId` was passed in, so `sendEmail` adds `/api/track/open` and `/api/track/click`.

### Writers that keep `email_logs` (5)

| Site | What | Pixel | Notes |
|---|---|---|---|
| `server/routes/newsletter.ts` `sendDirect` | Admin one-to-one CRM letter | Yes | Creates the row first. On a null id, marks the row `failed` and throws. |
| `server/lib/newsletter-issue-email.ts` | Outbound letter, one row per recipient | Yes | Row is inserted with status `sent` before Resend answers. A later failure updates `newsletter_issue_recipients`, not the log status. |
| `server/lib/notification-email.ts` | Immediate account notice (forum, campaign, and the rest of that spine) | Yes | Null id leaves `emailedAt` unset so the daily digest can carry it. The log row still says `sent`. |
| `server/jobs/notificationDigestJob.ts` | Daily rollup of unstamped notices | Yes | Null id leaves the notice rows for the next day. |
| `server/jobs/assemblyNotify.ts` | At most one governance letter per address per day | No | Inserts the row only after a real Resend id, and stores that id. Webhook can match it. No pixel. |

### The other 35 entries (no `email_logs` row)

| Site | What | Other durable mark |
|---|---|---|
| `server/_core/index.ts` `processScheduledEmails` | Due rows in `scheduled_emails` (the old investor drip table; nothing new is scheduled there as of 2026-09-27) | Row status `sent` or `failed`. False `sent` on a null id. |
| `server/_core/oauth.ts` | Magic link (`budget: 'auth'`) | `email_tokens` row exists even if the letter was dropped. |
| `server/jobs/stewardDigestJob.ts` | Weekly steward nudge, piggybacks the community digest | None per letter. Opt-out is the steward frequency flag. |
| `server/jobs/eventReminders.ts` (2 calls) | Auto-reminder offset, and the always-include side list | `event_auto_reminder_sends` claim. Not per recipient. |
| `server/lib/signupReminderBlast.ts` | Hourly signup blast for events starting in 20 to 28 hours, and admin-scheduled custom reminders | `events.reminderSent`. |
| `server/jobs/digestJob.ts` | Weekly community digest to the `seasonal` topic | `digests` row, written before the send loop. |
| `server/lib/harvest-email.ts` | Harvest newsletter confirm | `harvest_email_sends` (count, hash, body). No addresses. |
| `server/lib/recording-finalize.ts` | "Recording ready" to the `recordings` topic | `recordings.emailSent` is set by the caller around this function. |
| `server/lib/interopCircle.ts` (2) | Circle moved, and Circle welcome | Signup rows. |
| `server/lib/seasonSchedule.ts` | Season meeting time moved | Reminder config. |
| `server/routes/events.ts` `promoteFromWaitlist` | A spot opened | Signup row. |
| `server/routes/events.ts` `signup` | Reminder signup confirmation | Signup row. |
| `server/routes/events.ts` `sendSeasonRollup` | Season wrap, batches of 50 in one `to` | None per letter. |
| `server/routes/events.ts` `sendFollowup` | Admin follow-up to signups | None. |
| `server/routes/events.ts` `sendSpeakerIntro` | Speaker intro | None. |
| `server/routes/newsletter.ts` `subscribe` | Double opt-in confirm | Subscriber row `isActive = 0` until confirm. |
| `server/routes/newsletter.ts` `sendTest` | Admin test send. Throws if `id` is null. | None. |
| `server/routes/newsletter.ts` `sendBulk` | Admin bulk. Records success as `!!result.id` in the response only. | None in `email_logs`. |
| `server/routes/investors.ts` (2) | Newsletter confirm when the inquiry opts in, and the cooperative note | Inquiry row. The Day 3/7/14/30 drip is retired. |
| `server/routes/coop.ts` | Cooperative interest confirmation | Interest row. |
| `server/routes/applications.ts` | Incubator application received | Application row. |
| `server/routes/campaigns.ts` | Offer accepted, declined, or delivered, for people without an account | Contribution row. Account holders get the notice spine instead. |
| `server/lib/campaign-cancel.ts` `send` | Campaign cancelled, closed, or completed while an offer was waiting. Also the retry from `crowdpoolDailyJob`. | `cancelNoticedAt` is released when `id` is null. |
| `server/jobs/questCrewAssembly.ts` | Crew formed | `formationEmailSentAt` only when `id` is set. |
| `server/jobs/shipCrewList.ts` | A bookable week matches a crew-list signup | `lastNotifiedAt`. |
| `server/jobs/needsOffersMatcher.ts` (2) | One intro to each side of a match | Matcher ledger (one pair, ever). |
| `server/routes/ship.ts` `crewList.join` | Crew-list double opt-in | Signup row plus unsubscribe token. |
| `server/lib/ship-emails.ts` | 15 Ship templates through one `send()` (booking, manifest, giveaway, sponsorship, nomination) | The domain row (booking, entry, and so on). The letter itself is best-effort and ignores `id`. |
| `server/routes/roleHolders.ts` | Pending-member invite | Invite token row. |
| `server/webhooks/stripe.ts` | Church gift receipt | Donation row. |
| `server/webhooks/zeffy.ts` | Church gift receipt | Donation row. |

Product surfaces that look like more send spots (Ship templates, campaign close versus cancel) are already inside the rows above. Adding them again double-counts.

---

## Open, click, bounce

Two trackers exist, and both only work for a row in `email_logs`.

- First-party: `emailLogId` adds a pixel at `${VITE_APP_URL}/api/track/open/:id` and rewrites `href`s through `/api/track/click/:id`. Handlers in `server/trackingRoutes.ts`. No `emailLogId` means no pixel, even if a log row is created afterwards.
- Resend webhook: `POST /api/webhooks/resend` (`server/webhooks/resend.ts`) updates a row on delivered, bounced, complained, opened, clicked. It looks up `resendEmailId`, then falls back to the newest `email_logs` row for that recipient. A bounce of an unlogged letter can stamp the wrong logged letter to the same address. No row at all: the webhook logs a warning and returns.

`railway.toml` starts the process with `NODE_ENV=production`. With that set, a missing `RESEND_WEBHOOK_SECRET` rejects the webhook. Whether the secret is set on Railway was not checked. Click and open events from Resend also depend on Resend's own tracking being enabled in their dashboard. That dashboard was not opened.

`email_logs.status` defaults to `sent` at insert time (`server/emailTracking.ts`). For the four pre-create writers, a held or blocked send still leaves a row that says sent, until something else updates it. `sendDirect` is the one that marks `failed`.

---

## Schedulers

In-process timers are all at the bottom of `server/_core/index.ts`. They start with the web process. They are not a single queue.

| Loop | First fire | Repeat | Also an HTTP cron in code? | Failure mode |
|---|---|---|---|---|
| `processScheduledEmails` | immediately, then every 60s | 60s | No | False `sent` on a drop. Legacy table. |
| Outbound due letters | 20s | 60s | `POST /api/cron/outbound-issues` | Claim is on the issue. Failed recipients stay failed. Two runners are safe against a double send of the same issue. |
| Auto reminders, plus Circle sync and season-schedule sync | 2 min | 5 min | The hourly `POST /api/cron/event-reminders` runs the auto-reminder job and the 20-to-28-hour signup blast and admin-scheduled custom reminders. The Circle and season-move letters run only on the in-process sweep. | Offset claimed before send. A cap hit during the sweep permanently skips the rest of that offset. |
| Weekly community digest, then steward digest | 60s | 7 days of **uptime** | No | Due-check is `digests.generatedAt`. A boot inside the startup window can burn the week on 5 letters. |
| Notification digest | 5 min | 24h | No | Retries when `id` is null. Shares the 50/hour cap, so a big day waits. |
| Ship crew-list match | 9 min | 24h | No. `SHIPPED_LOG` still notes this cron as a follow-up. | In-process only. A process that never stays up 24h still fires 9 minutes after each boot, guarded by `lastNotifiedAt`. |
| Quest crew assembly | 5 min | 30 min | `POST /api/cron/quest-crew-assembly` | Checks `id`. Caps the run at 50. |
| Needs and offers matcher | 11 min | 24h | `POST /api/cron/needs-offers-matcher` | Pair ledger. Two runners should not double-introduce. |
| Crowdpool daily (closes, nudges, owed cancel and close mail) | 19 min | 24h | Also inside `POST /api/cron/nightly-batch` | In-process timer runs only when `NODE_ENV === "production"`, which the start command now sets. Steps are written to be idempotent. |

Other HTTP crons send owner mail through `notifyOwner`, not `sendEmail`: Harvest generation and the weekly Harvest proposal digest, and the operator pulse. Those are not member letters.

The four duplicated jobs are safe against a double send only where a database claim exists (Outbound issue status, reminder offset, quest stamp, matcher ledger). They are not safe against the shared hourly cap: both runners add recipients to **their own** memory counters, and whichever runs second in the same process still sees the first runner's count.

There is no worker queue. "Scheduled" means a status column plus a timer that polls it.

---

## Preferences and unsubscribe

One community record, and several lists that never read it.

| Mechanism | Record | Doors | What it stops | What it does not stop |
|---|---|---|---|---|
| Community topics | `newsletter_subscribers` (`isActive`, `marketingPausedUntil`, `prefSeasonal`, `prefOpenAccess`, `prefSeason2`, `prefEvents`, `notifyRecordings`) | `/email-preferences`, `/preferences` (same page), `/unsubscribe` (type an email, nuclear), token purpose `newsletter-prefs` (legacy `newsletter-unsubscribe` still verifies) | Digest, Harvest, Outbound newsletter audience, recording summaries, auto-reminder audiences that call `audienceForTopic` | Magic links, applications, offers, Ship bookings, crew-list mail, campaign-list mail, event signup rows, governance toggles |
| Account notices | `users.notificationPrefs`, with a fallback copy on `player_profiles.notificationPrefs`. Separate column `emailDigestFrequency`. | `/settings/notifications` | Immediate versus daily versus off for the notice spine. `governanceUpdates` gates Assembly mail. `emailDigestFrequency = never` skips the daily notice digest. | The community topics above |
| Event signup cancel | `event_signups.cancelledAt` | Signed `/schedule?unsubscribe=<id>&token=`. A bare `email=` is still accepted for old links. | That event's reminders | Other events, the newsletter |
| Circle leave | Same signup rows, every future Circle week | `/interop-sessions?leave=<token>` | Future Circle weeks | A non-Circle event |
| Campaign lists | `campaign_followers.unsubscribeToken`, `crowdpool_waitlist.unsubscribeToken` | `/campaign-updates/unsubscribe?token=` | That list row, or every campaign-follower and waitlist row for the address (`scope=all`) | Newsletter topics. By design (ADR in `.ai/docs/DECISIONS.md` around the prefs decision). |
| Ship crew list | `ship_crew_list_signups.unsubscribeToken` | `/ship/crew-list/unsubscribe?token=` | Crew-list match mail | Anything else |
| Always-include reminders | A constant in `shared/eventAutoReminders.ts` (one address today) | Footer points at `/connect` | Nothing by itself. The note says a prefs link would no-op because these people usually have no subscriber row. Removing them is a code change, unless they later subscribe and mute the topic (`emailsBlockingTopic` does honor that). | n/a |

Web push has its own `forum.push.unsubscribe`. That is a browser channel, not an email list.

Conflicts that are live:

- Season rollup (`events.sendSeasonRollup`) tells people to update preferences at `${APP_BASE_URL}/settings`. That page is account notices, not community topics. The audience includes newsletter subscribers who may have no account. The letter is also one shared HTML body, so it cannot carry a signed prefs link.
- Muting "event reminders" on the community page does not cancel an `event_signups` row. Signup reminders for events without auto-reminders go to the signup, not through `audienceForTopic`.
- Unsubscribing on `/unsubscribe` sets `isActive = 0` on the newsletter row. It does not touch campaign followers, crew-list, or account prefs.
- Investor and cooperative notes are intentionally off the topic page. They also have no list-unsubscribe link. They are one-shot confirmations, which is a reasonable split, and it should stay explicit so a later blast does not reuse those templates for a list.

`List-Unsubscribe` mail headers are not set anywhere. The footer link is the mechanism.

---

## Draft, preview, send

| Surface | Draft | Send | Record |
|---|---|---|---|
| Harvest | Creation item, channel `newsletter`, must be status `edited`. Preview returns a signed token bound to the body hash. | `confirmAndSend`. Caps from `harvest_email_sends`. Then `sendEmail` one person at a time. | Audit row with count and hash, no addresses, no `email_logs`. |
| Outbound | `newsletter_issues` draft. Preview, then send now or schedule. | Same token and idempotency idea. Scheduled rows are sent by the minute sweep and the cron. | `newsletter_issue_recipients` plus `email_logs`. |
| Broadcast | Social copy from the Harvest corpus (`draftBroadcast`, Buffer). | Not email. | Buffer, outside this engine. |
| Weekly digest | No human draft. LLM summary when the forum has enough threads, otherwise a fixed blog list. | Automatic. | `digests.contentMd`. |
| Admin CRM | Templates in `newsletter.sendDirect` / `sendBulk` / `sendTest`, plus `emailDraftAgent` for a draft body. | Immediate, or `scheduled_emails` for later. | `sendDirect` logs. Bulk and the scheduler do not. |
| Event reminders | Optional custom subject and body on the event. No preview token. | Cron and the 5-minute sweep. | Offset claim. |
| Account notices | The event that created the notification. | Immediate, or the next daily digest, from prefs. | `notifications.emailedAt` and, when the send runs, `email_logs`. |

Admin preview and test-send already exist for CRM templates (`getPreview`, `sendTest`) and for Harvest and Outbound (preview plus confirm). The gap is one trail that shows every attempt, including the ones the cap ate.

---

## URLs

Links in letters are built from several bases. They are copied into the HTML at send time. A later env fix does not rewrite mail already sitting in inboxes.

| Base | Where | Fallback in code |
|---|---|---|
| `APP_BASE_URL` | `export` in `server/_core/email.ts`, used by most letter links. A second copy in `server/_core/notify.ts`. | `https://regencivics.earth` |
| `APP_URL` (`ENV.appUrl`) | Magic links, newsletter confirm links, `managePreferencesUrl` (`server/lib/emailPrefs.ts` builds the URL from `ENV.appUrl`), Ship crew-list confirm and unsubscribe | `http://localhost:3000` |
| `VITE_APP_URL` | Open pixel and click wrapper only (`BASE_URL` in `email.ts`, and `server/emailTracking.ts`) | `https://regencivics.earth` |
| `SITE_ORIGIN` | Hardcoded `https://regencivics.earth` in `shared/siteContext.ts` and `shared/sessionLinks.ts` | n/a |
| Hardcoded host | Branded footer in `email.ts`, Assembly governance link, Stripe receipt, a few Ship constants | `https://regencivics.earth` |

Rieki set Railway `APP_URL` and `APP_BASE_URL` to `https://regencivics.earth`. This audit did not read the Railway variables, so the running values are taken from that report. `VITE_APP_URL` is a third name, used only for tracking, and it was not in that report. If it is still the old `.com` host, new pixels and click redirects still point there while the letter body points at `.earth`.

`APP_URL` and `APP_BASE_URL` can diverge again. Prefs links follow `APP_URL`. Event and digest links follow `APP_BASE_URL`. A letter can contain both.

PR #190 (open, not on this `main`) rewrites `.com` hosts at send time for the digest and the tracking base. It does not change letters already delivered. Those keep the host that was written into them, and both `regencivics.com` and `www.regencivics.com` 404.

Join links on the reminder path go through `reminderJoinUrl` (`server/lib/eventReminderEmail.ts`): `https://regencivics.earth/join` or `/join?e=<id>`, label "Join the call". The Riverside room URL is not placed in that href. The recording email's watch button is the YouTube link. The forum post written beside it still falls back to the stored Riverside URL when there is no YouTube link (`server/lib/recording-finalize.ts`). That fallback is member-visible on the forum, not in the email button.

---

## Other channels (not this engine)

| Channel | Code | Record |
|---|---|---|
| Owner email | `notifyOwner` | None |
| Community Telegram and WhatsApp | `server/_core/notify.ts` | Logs only. Skips when env is missing. |
| SMS reminders | Twilio from the event-reminders cron, for signups that have a phone | None |
| Web push | `server/lib/push.ts` | Subscription row |
| Operator Telegram | `server/webhooks/telegram-brain.ts` `notifyOwner` | Brain items, not mail |

---

## What to ship, in order

Each wave is a series of small PRs. Member-visible copy and link changes stay in their own PR so they can be reverted without reverting the recorder.

### Wave 0. Stop silent drops

Highest impact, and it does not require a new preference model.

1. **Make `sendEmail` tell the truth.** Return a status (`sent`, `held`, `rate_limited`, `provider_error`) along with the id. Log one structured line: template, recipient count, status. Keep `{ id: null }` so current callers still compile. One file plus `server/email.test.ts`. No member-visible change.
2. **Count the hour only after Resend accepts.** A provider error should not burn the 50. Same file.
3. **Write the attempt inside `sendEmail`.** If the caller passed `emailLogId`, update that row's status. If not, insert one. Status starts as `queued` and becomes `sent`, `held`, `blocked`, or `failed`. This covers all 40 entries without a 40-file edit. Callers that already insert a row must pass the id so we do not double-insert. This is the observability PR.
4. **Honor the id in the five liars**, each as its own small PR so a revert is obvious:
   - Weekly digest: do not save `digests` until the loop finishes, and only count real ids. A partial week stays due.
   - Harvest confirm: count real ids, and mark the audit row failed when the cap stops the loop.
   - Auto reminders: claim the offset only for addresses that returned an id, or claim per recipient. Today one claim covers the whole list.
   - `processScheduledEmails`: `failed` when `id` is null, leave `pending` when the reason is `rate_limited` so the next minute retries.
   - Magic link: if the status is not `sent`, respond with an error, not `{ success: true }`.
5. **Do not run the weekly digest inside the startup window.** The simplest fix is to skip `runDigestJob` while the startup guard is active, and let the 7-day check run on the next tick after 120 seconds. Pair this with item 4 so a skip does not look like a completed week.
6. **Season rollup: one recipient per call, and a signed prefs link.** This is member-visible (they stop seeing each other's addresses, and the footer starts working). Its own PR.

Items 1 through 3 are one PR if they stay inside `email.ts` and the log helper. Item 4 should be separate commits or PRs per caller, because each one changes who gets a letter this week.

### Wave 1. One preference story

Do this after Wave 0 so a mute is observable.

1. Publish the matrix in this file as the operator cheat sheet (done here). The code change is a single module that answers "may we mail this address for this purpose?" with purposes `community:<topic>`, `account:<type>`, `list:campaign`, `list:crew`, `transactional`. Transactional stays unfiltered.
2. Cross-link `/settings/notifications` and `/email-preferences` in both directions, in the page copy. Member-visible, own PR.
3. Stop linking community mail at `/settings`. The season rollup fix in Wave 0 covers the worst one. Grep for `/settings` inside email HTML before calling this done.
4. Always-include: store an opt-out (a subscriber row, or a column) so `/connect` is not the only stop. Member-visible for that one address. Own PR.
5. Leave campaign-list tokens and crew-list tokens as their own doors. Folding them into the newsletter row would surprise people who joined a campaign list and a newsletter separately. The unified module should **read** all of them, not merge the tables in the first PR.

### Wave 2. One owner for the clock

Do not delete the in-process loops until the HTTP crons are confirmed live. This audit did not list Railway services.

1. An admin health strip: last success time for each of the 9 loops, taken from a `site_settings` stamp the way event reminders already do. Read-only, no behavior change.
2. Move the weekly digest off `setInterval(7 days)` onto a cron with a database lock, after Wave 0's partial-send fix. The interval currently measures uptime, so a process that restarts daily never fires the interval, and the "60 seconds after boot" path is what actually sends.
3. Keep the reminder claim. The 5-minute loop and the hourly cron may both stay. Document that in `docs/EVENT_FLOW_OVERVIEW.md` when the health strip exists.
4. A single ticker is worth it only after the queue in Wave 3. Merging timers without a queue just concentrates the same 50-an-hour drop.

### Wave 3. A queue in front of the cap

1. Confirm the Resend plan's real hourly and daily limits before choosing a drain rate. The 50 in code is an application guard. The right drain is "under the plan," not "50 forever."
2. On `rate_limited`, leave the row queued. Retry workers already exist in spirit for campaign-end mail, quest crew, and the notification digest. Extend that to Outbound's `failed` recipient rows and to `scheduled_emails`.
3. Startup guard: apply it to ad-hoc sends, not to a job that has a database idempotency key and a backlog. The guard exists to stop a restart from re-blasting. Jobs that stamp a claim do not need it, and it is what clips the digest.

### Wave 4. Operator desk

Most of the pieces are already on the admin side. They do not see the mail that never logged.

1. Once Wave 0 writes every attempt, point the existing `newsletter.getLogs` view at all templates, with status and the block reason. Filter by template and by day.
2. Harvest and Outbound already preview and confirm. Add the same "send a copy to me" that `sendTest` has, on those two screens, without spending the daily cap on the test (a `budget` or a flag). Member list stays on the real send.
3. A weekly operator line: attempted, sent, held, blocked, failed, by template. That is a query on `email_logs` after Wave 0, not a new product.

---

## Suggested first PRs

| PR | Ships | Revert |
|---|---|---|
| A | `sendEmail` status, log line, count-after-accept, attempt row | One function. Callers unchanged if the id field stays. |
| B | Digest does not record a week it did not finish, and does not run inside the startup window | Digest behavior only. |
| C | Reminder offsets retry addresses that got a null id | Reminder behavior only. |
| D | Scheduler and magic link stop marking drops as sent | Those two callers. |
| E | Season rollup is 1:1 with a real prefs link | Member-visible. Own revert. |

A then B is the order that stops the weekly letter from disappearing on deploy. C is the order that stops a call reminder from being marked done for people who never got it.

---

## Unknowns

- Railway values of `EMAIL_HOLD`, `EMAIL_RATE_LIMIT_PER_HOUR`, `STARTUP_EMAIL_LIMIT`, `AUTH_EMAIL_RATE_LIMIT_PER_HOUR`, `VITE_APP_URL`, `RESEND_WEBHOOK_SECRET`, `RESEND_API_KEY`. Not read.
- Which cron services actually exist in the Railway project, versus the routes that are ready for them. Not listed.
- Resend plan quota, and whether Resend open/click tracking is enabled. Not opened.
- How many `scheduled_emails` rows are still `pending` from the retired investor drip. The send code is live; the inquiry path no longer inserts. `scripts/fund-drip-refresh.ts` still knows how to rewrite those rows.
- Whether production is one replica. Two replicas double the in-memory caps and double any job without a database claim.

---

## How to recount

From the repo root:

```bash
rg -n -g '!*.test.ts' 'sendEmail\(|sendEmailImpl\(' server --glob '!server/_core/email.ts'
```

That prints 40 lines. One is the steward wrapper assignment (`sendEmail(p)` in `server/jobs/stewardDigestJob.ts`). The other 39 are calls. Then count `await send({` in `server/lib/campaign-cancel.ts` (one). That is 40 entries into the sender.

`email_logs` writers:

```bash
rg -n -g '!*.test.ts' 'createEmailLog' server
```

Expect the five sites in the table above (`newsletter.ts` calls it via `db.createEmailLog`).

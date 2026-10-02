# Unified email plan

**As of:** 2026-10-02, `main` at `2287944c` (audit #191 and the `.earth` digest links #190).

Two documents describe the same engine. Neither replaces the other.

- `docs/planning/EMAIL_COMMS_AUDIT_2026-10-02.md` is the send-path inventory and the Wave 0 to Wave 4 order.
- `docs/planning/FIXES_TO_MAKE_2026-10-02_EMAIL_SYSTEM.md` is the Phase A to Phase D defect list. The lane prompt sits beside it: `docs/planning/CLAUDE_CODE_PROMPT_2026-10-02_EMAIL_SYSTEM.md`.

Ship order below follows the fixes list (A-0 through A-21, then B, then C, then D as a plan). Where a Phase A item is the same work as a wave, they ship together.

## Map

| Phase | Wave | What ships |
|---|---|---|
| A-1 silent drops, plus the A-7 stamps that fire with no accepted Resend id | Wave 0 | `sendEmail` returns a status and writes an attempt row for every call, including holds and rate-limit drops. The hour counter moves only after Resend accepts. Digest, auto reminders, Harvest, Outbound, the legacy scheduler, magic link, signup reminders, recording mail, and the needs/offers intro do not treat `{ id: null }` as done. The weekly digest does not run inside the startup window. |
| A-0 cron health | Wave 2 | Measure which reminder crons actually run. Document. No behavior change until the services are confirmed. |
| A-2 webhook matching | after Wave 0 | Match bounces only by Resend id. Store `svix-id`. |
| A-9 season rollup one recipient per letter | Wave 0 item that is member-visible, its own PR | People stop sharing a To header. Footer prefs link is a separate member-visible change. |
| A-3, A-4, A-5, A-6, A-8, A-10 through A-21 | Phase A, after the silent-drop PR | Each one verified in code first. Member-visible and privacy edits stay revertible on their own. |
| B-1 to B-4, B-9, then the rest of B | Wave 1 | One preference story, list headers, suppression. Postal address (R-1) and the open-pixel decision (R-5) wait on Rye. |
| C-1 to C-4, then the queue | Wave 3 and Wave 4 | One door, a ledger the queue can drain, CI that blocks a second Resend client. The in-memory cap stays a fuse. |
| D-1 to D-7 | plan only | Journeys and editable words, after the Village OS engine has proven itself. |

## Priority

1. A-0 (measure, do not guess the Railway cron list).
2. A-1 and the A-7 silent-drop core (Wave 0). This is the first code PR.
3. A-2 webhook.
4. Any A-7 stamp that the first PR did not already cover.
5. A-9 season rollup, one recipient per call.
6. A-10 check-in token.
7. A-8 applicant mail. Wording waits on R-6.
8. A-3 event time zone.
9. A-4 Season 2 signup reminders.
10. The rest of Phase A.
11. B-1 to B-4.
12. B-9.
13. The rest of B.
14. Phase C.
15. Phase D, as a plan, until Rye says go.

## First run after the Wave 0 deploy

Applying `drizzle/0284_email_attempt_status.sql` comes before the new process reads `event_auto_reminder_sends.status`. Existing reminder rows default to `complete`, so old offsets are not sent again. A digest row already saved in `digests` is left in place, so a week that was marked done by the old bug is not rebroadcast. Needs/offers pairs with `emailSentAt` set are not introduced again. Pairs that were ledgered and never stamped can be released on a later run only when a new attempt also fails. The code does not delete historical rows on deploy.

Magic-link requests that Resend does not accept return an error instead of `{ success: true }`. No letter is sent to a real inbox to prove this. Tests use mocks. Live checks, when a key exists, use `delivered@resend.dev`, `bounced@resend.dev`, and `complained@resend.dev`.

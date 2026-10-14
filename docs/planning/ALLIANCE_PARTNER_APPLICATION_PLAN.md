# Alliance partner applications and the approval handoff

Date: 2026-10-13. Owner: Rye. Status: PR 1 built; PRs 2 and 3 planned.

## Goal

An alliance partner applies, is reviewed and approved in Admin the way a land project is, and on approval is told how to vote for the Interoperability Circle's call time and how to join it. Land projects get the same step on approval for the Season Schedule. Both votes stay open to anyone; approved members carry a badge.

## Rye's rulings (2026-10-13)

1. Votes stay open to everyone. Approved members get a badge, and badges show retroactively for votes cast before approval.
2. Approval emails the vote invite at once. A quiet approval option exists.
3. Existing alliance inquiries stay where they are. Admin gets a convert button that turns an inquiry into an application, and the converted partner gets an email with the Circle vote and how to join.
4. One person can hold a land project application and an alliance partner application.

## What existed (audit, 2026-10-13)

| Step | Land projects | Alliance partners |
|---|---|---|
| Apply | `/apply`, `applications`, drafts, Submissions tab | `/connect?path=alliance` writes a `general_inquiries` row; no draft, no applicant email |
| Review | Applications tab, approve / reject / request changes | Alliance tab; inquiry statuses only, no approve |
| On approval | Forum thread, tier detection; applicant not emailed | Nothing |
| Call time vote | `/season-schedule` (built) | `/interop-sessions` (built) |

## Adversarial review of the land project path (findings that shaped the build)

| # | Finding | Evidence | Resolution |
|---|---|---|---|
| 1 | Approval never reached the applicant: the approved message went to the site owner as a notification marked "To:" | `server/routes/applications.ts` (old `updateStatus`, `notifyOwner` with `**To:**`) | PR 1: the vote invite email |
| 2 | Approving twice made a second pinned forum thread; no read of the old status | old `updateStatus` | PR 1: compare-and-set, thread found by title |
| 3 | `reviews.create` approved with no thread, tier detection or notice | old `reviewsRouter.create` | PR 1: routes through `setApplicationStatus` |
| 4 | Kanban drop to Approved has an Undo; an email cannot be undone | `client/src/components/AdminKanban.tsx` | PR 1: confirm before an approving drop; handoff idempotent per application |
| 5 | `sendEmail` never throws on a hold or a rate limit (50 an hour, shared) | `server/_core/email.ts` `sendEmail` | PR 1: outcome returned to the admin, written to the timeline, resend button; bulk sends one at a time; backlog stops at the limit |
| 6 | Bulk approve fired every update in parallel | `AdminApplicationsTab.tsx` `Promise.all` | PR 1: sequential |
| 7 | The bulk dialog's Approved letter described the Season 2 quality check and a community vote, and would now double the invite | `ApplicantStatusEmailDialog.tsx`, `emailTemplates.landProjectAccepted` | PR 1: Approved starts as a plain note, with a notice |
| 8 | Projects approved before PR 1 never got an invite | no `land_project_vote_invite` rows | PR 1: backlog banner on the Applications list |
| 9 | Votes carry no user identity: Season votes are a browser key and a typed project name; Circle votes are a browser key or user id | `season_schedule_votes`, `interopTimeVotes` | PR 3: nullable `userId` on both, stamped when signed in; a signed-in visit claims the browser's existing row; the badge is computed when the tally is read, so it appears as soon as approval lands |
| 10 | Rejection and changes requested still reach only the owner | `OWNER_FORWARD` in `approvalHandoff.ts` | Left as is (not in scope); noted in ADR-71 |
| 11 | Approval between Seasons would send people to a vote that refuses hands | `setSlots` throws "has finished" | PR 1: the invite points to the next Season when the active one has ended |

## PR 1: one approval handoff (built)

`server/lib/approvalHandoff.ts`, ADR-71. Every admin status change goes through `setApplicationStatus`. An approval runs tier detection, the forum thread (once) and the vote invite (once). Admin: approve dialog with the invite on by default, a per-application invite panel with send and send again, a backlog banner, a kanban confirm, honest review-form toasts.

## PR 2: alliance partner applications

- Table `alliance_applications` (own table, the `custom_game_applications` precedent): `userId`, organization name, URL, role, scope, location and coordinates, country, support categories, other support, description, organizational capital, the tool they build (optional, feeds the Circle's tool register), `status` with the same enum as `applications`, `submittedAt`, `sourceInquiryId` (set when converted), timestamps. One open application per user. Migration via the runner.
- Router `allianceApplications`: `create`, `update`, `submit`, `mine`, admin `list`, `get`, `updateStatus` (through a `setAllianceApplicationStatus` sibling of `setApplicationStatus`), events log (`alliance_application_events`, or a `kind` column on `applicationEvents`; decide at build time by checking `applicationEvents` readers).
- Client: `/apply/alliance` (form with autosave, reusing the `/connect` alliance fields and the Weaver companion), `/apply/alliance/status`, Submissions tab entry with the same edit rules. `/ally` and `/connect?path=alliance` point here.
- Admin: Alliance tab gains an Applications section with the same controls as land projects (status list, detail sheet, review notes, bulk approve dialog). Inquiries stay below it with a **Convert to application** button that copies the inquiry's fields, links the user by email when an account exists (otherwise holds the application under the inquiry's email until they sign in), and marks the inquiry `completed`.

## PR 3: alliance approval handoff, Circle membership, badges

- `setAllianceApplicationStatus` approval: `organisations` row (active), Circle membership (event sign-ups on upcoming Circle weeks through the existing `join` path, so the welcome email and carry-forward apply), and the Circle vote invite (template `alliance_partner_vote_invite`, same once-only rule, same admin panel and backlog). A converted inquiry approved this way gets the same invite.
- Votes: nullable `userId` on `season_schedule_votes` and `interopTimeVotes`, stamped from the session on every vote; a signed-in visit attaches the browser's existing row. Tallies return a `badge` per voter (`land_project`, `alliance_partner`, both) from approved applications, computed at read time, so earlier votes gain the badge the moment the voter is approved.
- Status pages: "You have not voted for a call time yet" until the signed-in user has a vote row.
- A person holding both kinds gets both badges and both invites.

## Open questions

None blocking. PR 2 decides whether alliance events share `applicationEvents` once its readers are checked.

# Stage 4. Technical proving

Owner: platform engineering.
Exit gate: **all five driver methods demonstrated live, `forgetMember` verified by reading back and
getting nothing, and the manual-setup list either empty or costed per fork.**

Governing rule: **documentation is not evidence.** Every claim about a vendor's JSON is unproven
until a live call returns it. Doc 03 is well written and has already been wrong once in this
package — its claim that our assistant has an agentic loop the SDK can hang MCP tools on describes
software that does not exist on our side. Assume the same error rate about their own payloads until
a response proves otherwise.

## Fixture list: one real captured payload per operation

Saved as files in the repo, redacted of member names but **not** of structure, each stamped with the
URL, the UTC timestamp, the HTTP status and the release SHA from `/health` at capture time
(`8a5d2f3` as of 2026-08-15T00:07:40Z).

| # | Operation | Call | What the fixture must prove |
|---|---|---|---|
| 1 | `health()` | `GET /health` | already captured, unauthenticated, HTTP 200. Shape is known and stable. |
| 2 | `read()` — risks | the read surface, whatever it turns out to be | that a Risk comes back with a quote, a source anchor and a timestamp, and with its Collapse Pattern and Status fields |
| 3 | `read()` — tensions | same | same evidence triple |
| 4 | `read()` — commitments | same | same evidence triple, plus the parties |
| 5 | `read()` — empty result | a query with no matches | that empty is `[]` and not a 404 or an error |
| 6 | `read()` — pagination | `GET /backup` past page one | the cursor shape, and whether page size is stable |
| 7 | `read()` — auth failure | no bearer | captured: HTTP 401 `{"error":"Unauthorized"}` at 2026-08-15T00:14Z, on `/stats`, `/backup` and `/health-score` |
| 8 | `read()` — service down | whatever a 5xx looks like | that the driver's `read` returns `[]` and never throws |
| 9 | `exportMember()` | the subject-export call | what they hold about one person, in a shape we can append to `GET /api/profile/export` |
| 10 | `forgetMember()` | the hard-delete call | the confirmation body, and its failure body |
| 11 | `forgetMember()` read-back | `read()` for the same subject afterwards | **nothing comes back** |
| 12 | `write()` refusal | n/a | the driver's own refusal, since v1 writes nothing |
| 13 | rate limit | a burst | the actual 429 body and any `Retry-After` |

Operations 2 through 6 and 9 through 11 have **no documented endpoint today**. Doc 03 says plainly
there are no entity-level REST resources and no `GET /tasks`-style route; the Notion API is their
de facto entity surface, and deletion is absent from the API reference entirely. So the first output
of stage 4 is not a fixture, it is a written answer to: *what is the read surface for `signals`, and
what is the delete call?* Three candidates, in preference order:

1. **A read-scoped entity route they add.** Cleanest, smallest, and they already funnel every write
   through one service so a read choke point is likely similar.
2. **`GET /backup` filtered client-side.** Works today, wasteful, and its freshness and pagination
   cost scale with the whole workspace rather than with `signals`.
3. **A Notion integration token.** Rejected. It hands us read/write over all 26 databases including
   the ones we deliberately did not list, and the domain rule's "at most one non-off driver per
   domain" becomes unenforceable when the credential reaches every domain at once.

`/search` and `/ask` are semantic surfaces and are not a driver read. An answer is not a record set,
and it cannot carry the evidence triple reliably.

## The five methods, demonstrated live against the sandbox

All five, against `sandbox-api.saberra.com`, which is **already live** — confirmed HTTP 200 at
2026-08-15T00:14:08Z, release `8a5d2f3`, same routing table as production. Doc 07:23 offers a test
tenant as future work; it exists. The ask is a sandbox credential, not a sandbox.

1. `read(query)` — returns records with the evidence triple; returns `[]` on empty; **never throws**;
   returns `[]` when the service is unavailable.
2. `write(op)` — refuses, with a stated reason. Present because the interface requires all five.
3. `health()` — `GET /health`, liveness only.
4. `exportMember(userId)` — returns what they hold for one subject.
5. `forgetMember(userId)` — **the gate.** Demonstrated by: seed a synthetic member into the sandbox
   tenant through their own capture path; read back and confirm the records exist; call
   `forgetMember`; read back and get nothing. Then do the negative case: call `forgetMember` against
   a subject the service cannot confirm, and prove the driver surfaces a **visible failure** rather
   than a silent success. A member must never be told "deleted" because a call timed out.

Then once, against the **real Amora tenant**, on a real test member, with the confirmation recorded.
That is the acceptance item and it is the only production write in the entire listing.

## The credential ask

**Read-only and role-scoped, and this is a precondition rather than a preference.** Sera behind
`/ask` can create, update, archive, merge records and send email on behalf of users who connected
Google, with writes "consent-gated in conversation." When a server proxies a question there is no
human in that conversation, and the consent gate is satisfied by nobody. A tool allowlist bound to
the integration credential is what makes the refusal list in stage 2 mechanical rather than a
promise.

The one exception is deletion, which must be callable by the integration credential and must not
require a human in a chat window, or `forgetMember` cannot be automated and the constitution's
promise cannot be kept. Ask for exactly that shape: read-only plus delete-self-subject, nothing else.

Also to measure here, not to assume:

- **The real rate limit for a server-side integration.** Doc 03:85 puts `/ask-stream` at 20/min/IP.
  A server proxy makes an entire village one IP, so one member's burst starves everyone. Ask for
  the real limit and whether it can be keyed per end user. Capture the 429.
- **Versioning.** There is no version in any documented path or header. Ask what a breaking change
  looks like and how it is announced; the contract asks for sixty days' notice.
- **Manual per-fork setup steps.** Enumerate them. In Managed there should be none — the platform
  holds the credential and the village has no account — but this is exactly the thing that turns out
  to need a human logging in somewhere, and it has to be discovered here rather than by a founder.
- **Liveness expectation.** The contract requires each listing to declare what healthy looks like.
  For `signals` the honest declaration is probably on-demand with a daily probe against `/health`,
  since silence from an unused module is normal and must not read as an outage.

## Ordering note

Fixtures 2 through 6 and 9 through 11 are blocked on the same credential as stage 0. The audit and
the proving run should use one credential and one conversation. Ask once.

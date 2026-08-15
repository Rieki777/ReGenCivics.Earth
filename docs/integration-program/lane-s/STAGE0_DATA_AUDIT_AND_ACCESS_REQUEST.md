# Stage 0. The data audit of the existing Amora tenant

Status: **BLOCKED on one credential.** Everything that could be established without it is below,
with its endpoint and timestamp. The thresholds that decide the lane are fixed here, before the data
arrives, so the answer cannot be retrofitted to whatever the numbers turn out to be.

---

## What was established

**Base URL confirmed live.** `GET https://amora-api.saberra.com/health` → HTTP 200 at
`2026-08-15T00:07:40Z` (server's own `ts`). `release: 8a5d2f3`, `schemaOk: true`, `mode: serving`,
`role: api`, `service: pooled`, `routableTenants: 6`, `tableAgeSeconds: 21`. The `amora` tenant is
routed at `amora-api.saberra.com`. Doc 03:3 is accurate.

**A sandbox tenant already exists and is live.** `GET https://sandbox-api.saberra.com/health` → HTTP
200 at `2026-08-15T00:14:08Z`, same release `8a5d2f3`, same routing table. Doc 07:23 offers a test
tenant as something still to be provided; it is already running. This matters for stage 4: the
sandbox ask is a credential ask, not a build ask.

**The three read endpoints the audit needs are bearer-protected, and fail closed.** Unauthenticated
probes at `2026-08-15T00:14:0xZ`:

| Endpoint | Unauthenticated result |
|---|---|
| `GET https://amora-api.saberra.com/stats` | HTTP 401 `{"error":"Unauthorized"}` |
| `GET https://amora-api.saberra.com/backup` | HTTP 401 `{"error":"Unauthorized"}` |
| `GET https://amora-api.saberra.com/health-score` | HTTP 401 `{"error":"Unauthorized"}` |

No body leaks past the 401. This is correct behaviour and is worth recording as the one observed
positive on their access control, against the `/health` routing-table disclosure already in the
review's corrections list.

**No Amora tenant credential exists on this machine.** Searched. The searches below are the ones
that provably completed; the coverage limits are stated after them, because two of the first
searches I ran produced hollow negatives and I am not going to rest a gate on those.

Name-based, over every environment file:

- `game-amora/.env`, `game-amora/.env.remote-backup`, `gov-overflow/.env`,
  `regen-civics-clean/.env`, `regen-integration/.env` — variable names enumerated in full; no
  `SABERRA` / `SERA` / `NOTION` / tenant-token-shaped key in any of them.
- All 32 worktrees from `git -C game-amora worktree list`; 24 carry a `.env`; none matches
  `SABERRA|SERA|NOTION|TENANT|MEMORY`.

**Shape-based, which closes the "stored under a name I did not guess" gap.** The tenant secret is
32 random bytes hex (doc 03:7), so I searched all 29 environment files for `[0-9a-f]{64}` regardless
of variable name. Exactly one hit across all 24 worktree files: `AUTH_TOKEN_SECRET`, the platform's
own. The two regen `.env` files carry three each, all under names already enumerated above and none
Saberra. No unaccounted 32-byte hex value exists in any environment file on this machine.

Other stores:

- Railway `production` / `Amora Game` service: 25 variables, none matching
  `SABERRA|SERA|NOTION|MEMORY`.
- Windows process and user environment: no match.
- `~/.claude.json` and `~/.mcp-auth/`: no `sera` MCP connection and no stored OAuth token. The MCP
  connector offered in doc 07:20 has not been taken up.
- `amora-game-integration.zip`: 9 files, all documentation, no credential.
- Mailbox search (`saberra OR sera`, all folders): 8 threads, all scheduling or unrelated. No
  provisioning mail, no API secret.
- Content search of `Desktop` (two levels) and `Downloads` (three levels) for `SERA_API_SECRET` and
  `amora-api.saberra`: the only hits are our own planning and review documents.

**Coverage limit, stated honestly.** A full recursive content search of the Amora repo tree never
reliably completed. One attempt was killed, one scanned zero files while reporting success, and the
first indexed search returned one file when a later bounded search proved at least seven contain the
string. So: a secret pasted into some file deep inside a worktree, outside an environment file,
would not have been found. That gap is narrow — a credential has to live somewhere it can be read at
call time, and every such place is enumerated above — but it is not zero, and the strongest evidence
here is documentary rather than forensic: doc 07:19 lists the secret under what they still need to
give us.

This is consistent with their own document: doc 07:19 lists "a tenant API secret for the Amora Sera
API" under **what we would need to give you**. It has never been issued. Nobody withheld it; the
audit that decides this lane was never actually possible on our side.

---

## The access request (this is the whole of stage 0's ask)

Only Rye can obtain this. It goes to Saberra as one line.

> Please issue the Amora tenant API secret for read-only use against
> `https://amora-api.saberra.com`. I want to run `GET /backup` and `GET /stats` against my own
> tenant before we design anything.

- **Endpoints needed:** `GET https://amora-api.saberra.com/backup` (paginated full snapshot of the
  26 databases) and `GET https://amora-api.saberra.com/stats` (7-day metrics: emails ingested,
  tokens consumed, errors, cost estimate).
- **Auth header shape** (doc 03:7): `Authorization: Bearer <SERA_API_SECRET>` — one secret per
  tenant, 32 random bytes hex, timing-safe compared.
- **Scope:** read-only. If they can mint a read-scoped token rather than the master tenant secret,
  take that instead; it is the same ask as stage 4's read-only credential and is better asked once.
- **Where it goes when it arrives:** platform env, never `SECRET_KEYS`. Managed tier posture.
- **What it must not be used for:** every write route on that API (`/extract`, `/reprocess`,
  `/api/saberra-meet/ingest`, `/ask` with its create/update/archive/merge/send-email tools,
  `/tenants/*`). The audit is GET-only against a live community's production memory.

`GET /stats` covers 7 days, so the 90-day record counts have to come out of `/backup` and be
bucketed locally. Ask them to confirm `/backup` pagination shape and whether it carries record
`created_time` / `last_edited_time`; if it does not, the review-rate question is unanswerable from
`/backup` alone and needs either a Notion integration token or their own query.

---

## Ready to run the moment the credential lands

Save the raw snapshot first, audit from the file, never re-pull per question.

```
curl -sS -H "Authorization: Bearer $SERA" "https://amora-api.saberra.com/stats"  > stats.json
curl -sS -H "Authorization: Bearer $SERA" "https://amora-api.saberra.com/backup" > backup-p1.json
# then follow the pagination cursor until exhausted
```

Then answer, per package doc 02's 26-database model:

1. **Volume.** Records per Notion database per ISO week over the trailing 90 days (2026-05-17 to
   2026-08-14). Report the capture layer (Source Emails, Meetings, Meeting Assets) separately from
   the extracted layer — capture volume is their pipeline working, extraction volume is the thing
   being sold, and mixing them flatters the number.
2. **Review rate, two cuts.** (a) The review's cut: of Decision Candidates and Tasks created in the
   window, how many did a human ever move off Draft / Not Started. (b) The cut that actually decides
   *this* listing, because the domain is `signals`: of Risks, how many carry a Status other than
   Open (Acknowledged / Mitigated / Accepted / Closed), and how many passed their auto Review Date
   (High = +30d, Medium = +90d, doc 02:48) with no status change; plus the same off-default count
   for Tensions and Commitments. A high review rate on Decisions with an untouched Risks database
   would mean the listed domain is the *least* reviewed one, and that inverts the answer.
3. **Precision, twenty extractions.** Two of these are already identified and are the right ones to
   start with, both from Rye's own calendar, both with a Google Meet recording and Gemini Notes
   attached (which is exactly what doc 01:61 says the worker classifies and ingests):
   - `2026-07-23` "Reiki + Jess", `meet.google.com/wty-brkp-imh`
   - `2026-08-03` "Amora roles call with Rieki and Jess 11:11 EST", `meet.google.com/zyc-ebkq-tza`

   For each of the twenty, record: does a Meeting record exist at all for that capture key; does
   each extracted record carry a verbatim quote, a source anchor and a timestamp; is the claim
   internally consistent with the rest of the extraction; is it plausible on its face. Mark
   explicitly which ones need Rye's own memory of who was in the room and what was said — those are
   the only ones where a machine reading cannot finish the judgement, and they should be handed to
   him as a short list rather than buried in a table.

---

## The thresholds, fixed now

Written before the data exists so that the decision is a measurement rather than an impression.

**Gate A, the mechanical one, and it is the one that can kill the build outright.** Of the extracted
records in `signals` (Risks, Tensions, Commitments) sampled across the twenty meetings, what
fraction carry a verbatim quote **and** a source anchor **and** a timestamp?

- Below ~80%: the boundary evidence rule drops most of what arrives. The module ships and surfaces
  almost nothing, and the admin drop counter becomes the product. **Do not build.** Take it back to
  Saberra as a payload requirement (review Q11) before anything else.
- Above ~80%: the driver is viable; the drop count is a monitoring number rather than the outcome.

**Gate B, the human one.** Review rate on `signals` records over 90 days:

- Under 10% ever moved off default status: **no.** Listing this pipes an unreviewed backlog into
  villages' review queues, which is precisely the failure the lane was told to refuse. Say so and
  stop.
- 10–33%: not Managed. At most Connected, and only for a village that already has a steward doing
  this work. Managed means billing a village for a queue nobody drains, and owning first-line
  support for it.
- Above 33%: proceed to the build stage on the terms in stages 1–5.

**Gate C, coverage.** If Meetings records do not exist for the two named calendar meetings above,
capture itself is not working for Amora, and every downstream number is measuring an empty pipe
rather than extraction quality. Check this first; it is one lookup and it reframes everything else.

---

## Honest read, and what it is worth today

**I cannot give the read the lane asked for, and I will not fake one.** The extraction quality
question has exactly one honest answer available right now: nobody on our side has ever looked,
because nobody on our side has ever been able to. That is itself the first finding of the diligence
process working, and it is the same shape as the finding that stopped Orbit at stage 1.

Two things I can say with the evidence in hand.

**One point of live evidence that Sera is used by a human.** On 2026-07-30 a message to the Amora
team sent from `roots@amora.cr` — the capture address itself (doc 01:60), written in Rick's name —
says he had lost access to his Amora email for over a week and was seeing the team's message
*through Sera*. That is one person, once, and it is not a review rate. It is worth exactly what it
is: evidence the assistant layer is load-bearing for at least one user, and no evidence at all about
extraction precision.

**One measurement caveat that will bias the 90-day window downward.** On 2026-07-28 the Amora team
was told the project is taking a "Sacred Pause" through August–September 2026, with the current team
standing down. Roughly the last third of the audit window sits inside that pause. Meeting volume,
and therefore capture volume, and therefore review activity, will be depressed for reasons that have
nothing to do with Saberra. Bucket by week and read the trend rather than the 90-day total, and
compare the pre-pause weeks against the post-pause weeks explicitly. A low aggregate number that is
entirely explained by the pause is not a verdict on the vendor.

**One structural observation for stage 3, marked as inference.** The capture address `roots@amora.cr`
appears to be a mailbox the vendor's principal both operates and sends community mail from. If that
is right, the boundary between "the community's mail" and "the vendor's mail" is not clean at the
point of capture, and the DPA has to say who the controller is for anything arriving there. Confirm
with Rye rather than with Saberra; it is one question and I may have read it wrong.

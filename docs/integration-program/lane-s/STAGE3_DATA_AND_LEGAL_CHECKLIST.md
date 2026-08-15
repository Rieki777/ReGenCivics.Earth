# Stage 3. Data and legal

Owner: Rye with counsel. Exit gate for `member-pii`: **a signed DPA, a documented hard-delete
endpoint, and a committed `forgetMember()`.** This gate applies at every tier and does not soften
because the vendor bills.

## Classification: `dataClass: 'member-pii'`

Not `village-content`. There is a specific reason and it should be read before anyone argues the
lighter classification, because `signals` sounds abstract enough to talk yourself into it.

Saberra's Risks database (doc 02:48) carries a **Collapse Pattern taxonomy of seven
community-failure modes** — interpersonal conflict, no shared vision, poor governance, financial
fragility, **burnout**, **wrong people**, scale trap — with relations to contributing decisions and
tasks, and it resolves participants through a profile resolver that attaches them to named
individuals. A record that files a named member under "burnout" or "wrong people" is personal data
about that person, it is an assessment rather than a fact, and it was written by a machine reading a
meeting they may not have known was being extracted. Tensions and Commitments name parties by
construction.

So: `member-pii`, and the gate is the full one.

## Requirements before go-live

**1. A signed processing agreement naming every sub-processor.** At minimum, from their own
documents:

| Sub-processor | Role, per their docs |
|---|---|
| Notion | the memory store itself, all 26 databases (doc 01:52) |
| Anthropic | Claude runs classification, extraction and the Sera loop (doc 01:63, 01:71) |
| AWS SES | inbound mail capture into the `inbound_mail` queue (doc 01:60, doc 02:95) |
| Railway | hosting for worker, API and dashboard (doc 01:43) |
| Google | Meet recordings, transcripts, Gemini notes, and per-user Google grants in `user_gmail_tokens` for send-email / calendar / Drive (doc 02:87) |

Ask them to confirm the list is complete and to commit to notice before adding one. Also ask
specifically whether any Anthropic call is made under a zero-retention arrangement, and whether
extraction output is used to train anything.

**2. Documented retention, per record class.** Not one number for the product. The classes that
matter here:

- raw capture (Source Emails, Meeting Assets, transcripts) — the longest-lived and most sensitive
- extracted-unreviewed records in `signals`
- human-confirmed records
- `semantic_embeddings`, which are derived from member content and are the class most often
  forgotten in a deletion
- `tenant_name_aliases` and `user_preferences`, which are Sera's learned memory about individuals
- `chat_thread_store` and `chat_feedback`
- the confidential-identity map
- Processing Events / audit trail

Our own side sets the precedent to hold them to: the contact relay runs a deliberate 180-day
retention sweep.

**3. A documented hard-delete endpoint, named.** Today there is none in doc 03. The API reference
lists `/ask`, `/search`, `/report`, `/health-score`, `/transition-brief`, `/extract`, `/reprocess`,
meeting ingest, `/backup`, `/health`, `/stats`, tenant lifecycle and the five MCP tools. **Deletion
does not appear anywhere.** Sera can archive and merge records inside a conversation, which is not
the same thing and is not callable as a contract.

So this is a build ask on their side, and it is the single largest one in the listing. It must be:
one call, keyed on an identifier we can supply, that erases across **Notion, the alias map, user
preferences, the embeddings, chat threads and the confidential-identity map**, and returns a
confirmation we can store. Anything less and `forgetMember()` cannot honestly return true.

**4. A stated deletion turnaround** we can repeat to a member in the product. A number, in writing.
Ours is currently an immediate local sweep across roughly thirty tables; theirs will be slower and
that is fine, but the member has to be told the real one.

**5. A written answer on export.** What does `exportMember` return for `signals` — the records
naming that person, the quotes attached to them, or both? `GET /api/profile/export` carries the
comment that "everything the village holds about me" has to mean everything, so whatever they return
has to be enough to make that sentence true, or the sentence has to change.

## The question that decides whether this survives

Send it as written. It is question 13 of the review's sixteen and it is the one where the answer
matters more than the terms.

> Do you have a written policy for Risk records that file a named individual under a collapse
> pattern such as burnout or wrong people? Specifically: **who can read one** — every dashboard user,
> admins only, or the Sensitive Review database outside the main teamspace; **is it included when
> that person asks what you hold about them**; and **what is your procedure for that conversation**?
> A member of my community will eventually ask me what the system says about them, and I need to
> know the true answer before I put this in front of anyone.

Three ways this can go, and each is decisive:

- **They have the policy and it is honest** (restricted read, included in subject access, a
  procedure): proceed. This is the answer of a company that has thought about it.
- **They have no policy and will write one:** acceptable if it is written before go-live and lands
  in the DPA rather than in an email.
- **The record is broadly readable and is not included in subject access:** stop. A machine-written
  assessment of a named person, readable by their peers, that the person cannot see, is not
  listable at any tier, and no commercial term repairs it.

## Related, and ours to fix regardless of the deal

`anonymizeMember` touches only local tables and signals nothing outward. Capture is already running
and has been for months, so a member who left Amora is currently scrubbed on our side and retained
on theirs. Our published constitutional law 14 promises the name is scrubbed everywhere.

That is a live exposure today, not a hypothetical about a future integration, and it is the strongest
argument for doing this listing at all: it is the thing that forces the deletion path to exist.

Two consequences worth stating plainly:

1. The C2 driver registry (`forgetMember` / `exportMember` wired into `anonymizeMember` and the
   profile export, failing **visibly** when a driver cannot confirm) is a prerequisite for the build
   stage, and its real justification is the exposure that already exists.
2. Adoption should go through the platform's own decision primitive — a forum decision thread under
   `proposal.decide` — rather than being installed. It costs an afternoon and it is the difference
   between a system the village agreed to and one that appeared.

## One question for Rye, not for Saberra

The capture address `roots@amora.cr` appears to be a mailbox the vendor's principal both operates
and sends community mail from (basis: a 2026-07-30 message to the Amora team sent from that address
in Rick's name). If that is right, the controller boundary at the point of capture is not clean, and
the DPA needs to say who is controller for what arrives there. Confirm before drafting; this is
inference from one message and may be wrong.

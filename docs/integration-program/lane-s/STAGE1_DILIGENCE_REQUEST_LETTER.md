# Stage 1. Vendor diligence

Exit gate (process doc, stage 1): **a named legal entity and a named human.** No workaround.

## Where the gate stands today

| Artifact | Status |
|---|---|
| Legal entity name | **missing** |
| Jurisdiction | **missing** |
| Named human with an email | partial — `rick@saberra.com` and `hello@saberra.com` both correspond with Rye; the name "Rick" is used. Not confirmed in writing as the counterparty, and no surname or role on file. |
| Exact product URL | partial — `https://amora-api.saberra.com` and `https://amora.saberra.com` are live and confirmed by probe. The company's own product URL is not on file. |
| Terms URL | **missing** |
| Status page URL | **missing** |
| Published or agreed price | **missing** |
| Support address, answered, current | **missing** |

Being a live tenant and knowing the people is not diligence. Seven of eight cells are empty, and the
one that is filled is filled by a first name in an email thread.

---

## The letter (ready to send, Rye sends it)

> Rick,
>
> Before we design anything further I need a few things in writing. Most of this is administrative
> and I expect it is a ten-minute reply. Two items are blocking.
>
> **Blocking.**
>
> 1. The Amora tenant API secret for `https://amora-api.saberra.com`, read-only if you can scope it.
>    I want to run `GET /backup` and `GET /stats` against my own tenant before we agree a shape.
>    Doc 07 lists this under what you would provide; it has never been issued, so the evaluation that
>    decides this has not been possible on my side. If a read-scoped token is more work than the
>    master secret, say so and I will take the master secret and stay on GETs.
> 2. Send me your own reading of the same 90 days for my workspace: records created per database,
>    and of the Decision Candidates, Tasks, Risks, Tensions and Commitments, how many any human ever
>    moved off their default status. If most extraction is never reviewed on your side, then putting
>    it into a community's review queue moves your backlog into their attention, and I want us both
>    looking at that number before either of us builds anything.
>
> **Administrative.** Legal entity name, jurisdiction, the named human who is the counterparty on a
> contract with an email, the exact product URL, your terms URL, your status page URL, and your
> support address. I am putting this in a catalog other communities buy from, and I do not list a
> service I cannot name.
>
> **Commercial.** Four numbers.
>
> - What do I pay you today for the Amora tenant?
> - What would I pay after this?
> - What is the per-village floor for a ReGen village, at one village and at five?
> - What model does Sera's loop run on, does it use prompt caching, and what is your measured cost
>   per `/ask` and per processed meeting over the last 30 days at Amora? `/ask` returns `costUsd`
>   and your ledger is per-source, so these are queries rather than estimates. Send the tail, not
>   the median.
>
> Doc 06 R10 calls the money "a business conversation, not an engineering one" and defers it. It is
> the term that decides whether I write a line of code, so I would rather have it first.
>
> **Four questions where your answer changes what I build.**
>
> 1. Sera behind `/ask` can create, update, archive, merge and send email, with writes consent-gated
>    in conversation. When my server proxies a question there is no human in that conversation. Will
>    you mint a read-only, role-scoped credential for the integration?
> 2. Will every record I read carry a verbatim quote, a source anchor and a timestamp? My own AI
>    already works to that rule at the database level — no quote and no timestamp means no row, and
>    I show my admins how many were dropped. I am not going to surface your output to a community at
>    a lower bar than I hold my own, so anything without one gets dropped on arrival either way. I
>    would rather you knew that before you saw the drop count.
> 3. Has an extraction at any tenant ever produced a decision, task or risk that was materially
>    wrong and reached a human as fact? What happened, and what changed afterwards? I will tell you
>    plainly that on my side there is currently no undo: my reversal primitive exists in code and is
>    called from no route.
> 4. Your risk register has ten entries and not one of them is a risk you carry, and your only
>    admitted gap is scored the lowest impact in the document. What is your honest failure mode:
>    extraction quality, key person, Notion, or cost? I would trust the rest of the package more
>    with that paragraph in it.
>
> **Two that cost you nothing now and are unobtainable later.** You already ship Circles, Roles,
> Role Assignments with an Energization Level, Decision Candidates, Tensions and a CCOS ledger. If I
> adopt your matrix I stop building the memory half, and you keep a governance product you could
> sell directly to any community I introduce you to. What are you agreeing not to do, and for how
> long? And will you sign source escrow or an automatic fallback licence triggered on acquisition,
> cessation, or 90 days of unremediated failure, plus twelve months' notice on token revocation and
> on price changes? Doc 01 says your Postgres holds nothing a client would grieve losing, which is
> your own argument for why this is cheap to grant.
>
> Separately I will send the data-protection requirements, which are a checklist rather than a
> negotiation, and the technical proving list. Neither is a surprise and both are the same for every
> service in the catalog.
>
> Rieki

---

## Notes for Rye, not for sending

- The commercial ask is deliberately four numbers and not a discussion. `/ask` returning `costUsd`
  (doc 03:18) and the per-source token ledger (doc 02:84) mean every one of them exists as a query
  today. If any comes back as an estimate, that is information about how the tenant is actually
  metered.
- Do not name a price first. The review's position stands: a memory line item inside
  `regen-full-service`, single biller, no new pricing concept.
- Do not trade anything against the "42 land projects" figure. It does not exist as deployed
  villages in either repo.
- Withheld from this letter on purpose, to keep it short and answerable: the deletion questions and
  the Risks-against-a-named-member question, which are stage 3 and land as a checklist; the
  `/health` routing-table disclosure, which is a pre-provisioning contract condition rather than a
  diligence question; the phase-order argument, which is the matrix renegotiation and out of scope
  for stages 0–5.

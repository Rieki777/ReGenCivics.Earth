# Open Questions for Rieki, and Proposed Next Steps

We wrote docs 01-06 from your public repo, your live site, and our own codebase. These are the things we could not determine from the outside, plus what we propose doing first.

## Questions about your side

1. **Org holders export.** Your public `org.json` is deliberately person-free (a design choice we admire and will respect). For Saberra to mirror role *assignments*, we need an authenticated, capability-gated route exposing seat holders (member id or email, seat, term). Is that acceptable to you, and what auth shape do you prefer: a dedicated integration bearer token, or extending the federation protocol with a signed, peer-authenticated private document?
2. **Webhook receiver.** Does `POST /api/webhooks/saberra` following your Riverside/Governance-Hub pattern (shared secret header, fail-closed, admin-configurable in Integrations) sound right for receiving extraction proposals? What payload envelope do you want (we propose `{source: "saberra", type, version, tenant, occurred_at, payload}` with types like `task.proposed`, `decision.detected`, `meeting.processed`, `gratitude.observed`)?
3. **Where should proposals land?** `assistant_drafts` looks purpose-built (it has rationale, cites, capability ceiling, and human accept calls the same creation functions as manual admin forms). Confirm that is the intended landing zone for machine-originated proposals from outside Maia, or whether you would rather have a distinct queue.
4. **Maia's tool loop.** Is Maia's Anthropic call structured so that adding MCP-provided tools (Sera's five) is straightforward? If Maia is currently single-shot rather than agentic, the alternative is a server-side pre-step: detect memory-shaped questions and call `POST /ask`, then hand Sera's answer to Maia as context.
5. **Riverside scope.** Which calls run through Riverside today vs Google Meet? This decides whether transcript forwarding (Phase 1) already unifies the meeting pipeline or whether both paths need to coexist for a while.
6. **Events ownership.** We propose your events module as the source of truth for gatherings and we stop extracting into our Events database for Amora (or keep it as a mirror). Any objection?
7. **Identity join.** Are member emails in `users` reliably the same addresses people use in community email and meetings? If not, we should plan for a one-time steward-confirmed mapping pass.
8. **The 12-stage ladder and capabilities.** If we surface memory in-game, which capability should gate it? A new `memory.ask` key following your existing pattern seems cleanest.
9. **Interest in the multi-village offering.** Docs 04-06 sketch "fork the game + provision a Saberra tenant" as a joint product for other ReGen villages. Is that a direction you want to explore commercially, or should we keep this strictly Amora-scoped for now?

## What we would need to give you

- A tenant API secret for the Amora Sera API (server-side only, stored in your write-only secrets store).
- The MCP connector details for Maia and for your own Claude while evaluating.
- The capture address, if you want the zero-code email path for pushing significant game events into memory.
- Webhook payload schemas, versioned, before Phase 2 work starts.
- A test tenant (sandbox) so nothing during development touches Amora's real memory.

## Proposed working sequence

1. **A working session (2 hours, screen share both ways).** Walk each other through the live systems, not the docs. Agree or amend the source-of-truth matrix in doc 04; that matrix is the actual contract.
2. **Phase 0 same week.** You get MCP access to the sandbox tenant's Sera; we get a game account on a staging deployment. Both sides poke.
3. **Phase 1 build (parallel, independent).** You: transcript forwarding plus Maia-to-Sera. Us: org mirror consuming your signed export. Neither blocks the other.
4. **Review after a month of real Amora usage,** then decide Phase 2 together.

## A note on how we work

Saberra's engineering culture is verification-first: we do not repeat a claim about a live system without running the command that proves it, and these docs were written from code, not memory. If anything here does not match what you see, that is a finding, not an offense. Tell us and we will correct the doc the same day.

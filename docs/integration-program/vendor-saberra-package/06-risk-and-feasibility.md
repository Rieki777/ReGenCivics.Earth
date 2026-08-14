# Risk Assessment and Feasibility Score

Honest assessment, written to be argued with. Scores are 1-5 for likelihood (L) and impact (I) before mitigation.

## Risk register

### R1. Source-of-truth drift on the overlap entities (L4 I5, the big one)
If both systems keep writing circles, roles, events, or people independently, the mirrors diverge and users stop trusting both. This is the risk that motivated this whole analysis.
**Mitigation:** the matrix in doc 04 is the contract: one owner per component, one-way sync, mirrored records visibly marked, and cross-system writes only as proposals. Enforce it structurally where possible (the mirrored Notion databases can have edits detected by our schema/audit tooling; your side already refuses external writes by construction since there is no public write API). Residual risk: low, but only if the matrix is actually adopted rather than admired.

### R2. AI-written records contaminating a consent-based economy (L2 I5)
An extraction hallucinating "X thanked Y" that auto-mints Gratitude tokens, or an extracted "decision" treated as binding, would poison exactly the trust both products are built on. Sera can fabricate; we treat that as a standing property of LLM systems, test-gate honesty, and still require review.
**Mitigation:** the constitutional rule both systems already share: AI output lands in a human-consent queue, always, on both sides. Token-bearing events (gratitude, stage grants) are never triggered cross-system, only suggested. Residual risk: very low; this failure would require both sides to deliberately remove existing guards.

### R3. No outbound events from Saberra today (L5 I2)
Certain: the push mechanism does not exist yet. Until built, the game reads memory by polling and freshness is minutes, not seconds.
**Mitigation:** Phase 1 works entirely without it (MCP and ingest are pull/push-in). The emitter is small because all Notion writes flow through one service. Interim: scheduled polling of `/backup` deltas or Notion queries is acceptable for daily-cadence surfaces.

### R4. Identity join failures (L3 I3)
Email is the join key, but people email from multiple addresses, names are ambiguous, and confidential identities are codenames that will never join. A bad merge shows one member another member's history.
**Mitigation:** Saberra's participant resolver never silent-merges (it tags possible duplicates for review) and maintains a learned alias map. The integration inherits this: unjoinable profiles stay unjoined; joins are proposed, confirmed once by a human, then remembered. Confidential identities are structurally unjoinable and must be surfaced as-is.

### R5. Privacy invariant collision (L3 I4)
Your public federation surfaces are rigorously person-free (test-enforced). Saberra data is person-rich by nature. A careless integration could leak member names, meeting content, or CRM data into a public surface, or into the game at the wrong permission tier.
**Mitigation:** memory surfaces in-game sit behind your existing capability gate (a new capability, or reuse `map.viewPeople`-class gating); Sera is called with the requesting user's role (`member` vs `admin`) so disclosure narrows at the source; nothing from Saberra ever feeds `village.json` / `org.json` / any unauthenticated route. Sensitive-flagged and Restricted records never cross at all.

### R6. Two meeting pipelines double-processing (L3 I2)
Riverside transcripts and Google Meet transcripts of the same call could produce duplicate memories.
**Mitigation:** route both through Saberra ingest (Phase 1), where meeting dedup by capture key and content already exists. Until then, scope Riverside to calls that Google Meet does not cover.

### R7. Coupling two young, fast-moving codebases (L4 I3)
Both platforms ship fast, each effectively with one core developer. A tight integration could make every release a coordination problem, and either side could pause the collaboration.
**Mitigation:** integrate only at documented, versioned boundaries (your signed federation documents and webhook conventions; our API/MCP). No shared code, no shared database, no schema coupling. Every phase is independently removable: unplug the webhook and both products still work whole. Your handshake versioning (`/api/platform/info`, `supports: ["org/1"]`) is the right pattern; we will version our webhook payloads the same way.

### R8. Scale mismatch in the multi-village future (L2 I3)
Your model is fork-per-village; ours is tenant-per-village in a pooled platform. 42 villages means 42 deployments on your side, 42 tenant rows on ours. The asymmetry is operational, not architectural.
**Mitigation:** both sides already automate provisioning (your documented fork path; our one-call provision). Revisit only if village count actually grows past the founding cohort.

### R9. Notion as the entity store (L2 I3)
Notion rate limits (~3 req/s), eventual consistency, and free-plan block caps constrain read-heavy or realtime use. A game UI polling Notion directly would feel it.
**Mitigation:** the game never talks to Notion. It talks to Sera's API (which caches and meters) or receives webhooks. Bulk needs use `/backup`. Saberra also has a Postgres data-plane option in the schema for tenants that outgrow Notion.

### R10. Cost attribution for AI usage (L2 I2)
Game-originated Sera questions consume Claude tokens on Saberra's meter.
**Mitigation:** already solved structurally: per-source token ledger, optional monthly soft budget per tenant, cost visible per day. Commercial split is a business conversation, not an engineering one.

## Feasibility

Scored per integration layer, 1-10, where 10 is "mostly configuration."

| Layer | Score | Basis |
|---|---|---|
| Maia gains Sera memory via MCP | 9 | MCP server live today; Anthropic SDK supports MCP client natively; no UI change |
| Transcript forwarding into Saberra ingest | 9 | one webhook handler addition, existing endpoint |
| Org chart mirror into Notion | 8 | your signed public export exists; needs one authenticated holders route for assignments, plus a small sync job |
| Extraction proposals into game draft queues | 7 | both queue patterns exist; needs the Saberra emitter (new, small) and one game webhook route (pattern exists) |
| In-game member-facing memory panel | 6 | straightforward proxy but real product/UX work and permission design |
| Full "one product" merge (shared schema/UI) | 3 | not recommended and not needed; everything above delivers the user value without it |

**Overall feasibility: 8/10 for the phased, API-boundary integration proposed in doc 04.** The two systems agree on the trust model, overlap narrowly, and both already ship the integration primitives that matter (your inbound webhooks, signed exports, and draft queue; our API, MCP, ingest, and review queues). The single missing primitive (Saberra outbound events) is small and lands at an existing choke point.

**Verdict: proceed.** Recommend committing to Phase 0 and Phase 1 now, and gating Phase 2 on one month of Phase 1 actually being used by Amora stewards. The integration is technically easy relative to almost any two-product pairing we could have drawn, because both sides independently chose human-consent architectures; the genuinely hard work is the social contract in the source-of-truth matrix, which costs a conversation, not a migration.

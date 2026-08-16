# Agent Village digest (Edge Esmeralda 2026)

Source: "We Gave a Village Personal AI Agents. Here's What Happened" (Kosters, Law, Vendrov; Cosmos Institute blog, 2026-07-31). Every linked source was followed (section 7). Where sources disagree I say so.

## 1. What they built

**Overall shape.** 239 hosted personal agents, one per multi-day resident, over four weeks, reached through Telegram. Each was a Hermes deployment on Railway with an OpenRouter key, loaded with three village skills plus Hermes' native ones. Repo: https://github.com/Edge-City/agentvillage (MIT). It is a skills bundle plus installer plus cron layer, not an app: `workspace/` (AGENTS.md, SOUL.md, IDENTITY.md, COMMUNITY.md, TOOLS.md, USER.md, HEARTBEAT.md) and `skills/` (index-network, edgeos, edge-esmeralda, geo-esmeralda, token-usage-audit, agent-plaza; AGENTS.md also registers simocracy and agent-commons). Crons: memory sync 01:00, brief prepare 02:00, brief send 08:00, opportunity drops 12:00 and 17:00, negotiation summary 14:00, evening questions 19:00. Technical residents could point Claude Code or OpenClaw at the same skills (https://github.com/Edge-City/agentvillage-skills).

**Index Network** (https://index.network, repo https://github.com/indexnetwork/index, MIT). An "intent-driven discovery protocol" exposed as an MCP server. Residents say what they seek or offer in plain language; the system extracts intents (speech-act classification, clarity/authority/sincerity scores, lifecycle active/paused/fulfilled/expired) with privacy tiers public / network_only / incognito / private. Two agents negotiate bilaterally for their humans (v2: initiator can outreach, counter, question, withdraw; only the counterparty can accept or decline; ambient turn cap 6). A mutually accepted negotiation becomes an "opportunity" surfaced to both people with each agent's reasoning; both humans must then accept separately. Reasoning text avoids leaking raw intent content. Provisioning was a server-side signup API, master-keyed, idempotent per email.

**EdgeOS** (https://edgeos.simplefi.tech, repos https://github.com/p2p-lanes/citizen-portal + EdgeOS_API). "Open-source, API-first coordination layer" co-built by SimpleFi and Edge City: identity (email OTP), applications, tickets, housing, payments, events, RSVPs, venues, attendee directory, own profile. Next.js portal, Python API, Postgres, NocoDB back office; REST docs at api-citizen-portal.simplefi.tech/redoc. The agent skill calls `api.edgeos.world/api/v1` with two tokens (session JWT for directory/profile, `eos_live_` key for events/RSVPs) and must show URL plus body and get a yes before any write. Directory fields returned as `"*"` are hidden on purpose; the agent must say so, never infer.

**Geo** (https://www.geobrowser.io). A governed public knowledge graph organised in Spaces. At Edge it ran as a private instance ("Geo Esmeralda") holding attendee-authored notes, essays, pitches, photos, links to events/venues/tracks, concepts from talks, and time-windowed raw history of the village Telegram group. Agents read and write via a CLI (`npx @geoprotocol/geo-edge-esmeralda-cli`) using the EdgeOS bearer token; rule: summarise chat history, never dump it. Talks and transcripts were tracked as concepts (article); no doc describes that ontology.

**Hermes agent** (https://hermes-agent.nousresearch.com, https://github.com/NousResearch/hermes-agent, Nous Research, MIT). Persistent tool-using agent with a multi-platform gateway (Telegram, Discord, Slack, WhatsApp, Signal, email, CLI), MEMORY.md + USER.md memory, built-in cron, MCP support, provider-agnostic models. Skills follow the agentskills.io standard: a directory with `SKILL.md` (YAML frontmatter: name, description, version, metadata) plus optional references/scripts, loaded by progressive disclosure (list, view, file). Agents can author skills behind an approval gate. No source states a bundled count; "hundreds" is the article's phrase.

## 2. How a resident experienced it

Onboarding: verify EdgeOS identity with a one-time code; setup creates EdgeOS and Index credentials; make a private Telegram bot via BotFather and paste the token; the control plane provisions Hermes on Railway; the bot sends an eight-character pairing code. A welcome message is sent once (marker file). Index onboarding runs only when the resident expresses social intent, as a fixed ritual: one verbatim consent question about using EdgeOS profile data and public lookup (public lookup needs an explicit profile URL, never a name), a drafted profile previewed for edit/approval, "what are you open to right now?", record the channel, complete. No discovery calls during onboarding.

Daily use: what to do tonight, where dinner is, which sessions fit; the agent reads the live calendar and RSVPs after confirmation. An 08:00 brief carried today's calendar plus the strongest opportunities; midday and evening drops pushed more into Telegram. Opportunities arrived with reasoning and inline accept links; the agent could never accept for the human. Residents refined intents by messaging, and around twenty wrote negotiation policies ("Never accept on my behalf", "Two great introductions a day beats ten okay ones"). Sensitive intents could go incognito. In week two, residents were asked to export what their usual LLM knew about them, edit it, and paste it in as portable context. Humans re-entered at three points: approving the profile draft, saying yes to a surfaced opportunity, and the meeting itself (median 20 hours from discovery to both saying yes; 4.9 seconds for the agent-side negotiation).

## 3. What worked / what did not

- Scale: 239 agents, 17.5B tokens, 4,866 resident-to-agent messages (article). Index: 240 residents, 541 intents, 9,688 opportunities detected, 11,593 sessions, 20,169 agent-to-agent messages, 4,126 distinct pairs, 572 surfaced, 147 accepted (Index, 2026-07-29). The article says 505 intents; Index's mid-event note says 465.
- Funnel: 6% of detected opportunities reached a person; about 1 in 4 of those was accepted. Index: "Opportunity discovery is no longer the bottleneck; opportunity valuation is."
- Bridging beat bonding: 67% of sought connections crossed clusters; 94% filed intents in two or more categories; 75% seeking vs 3% explicitly offering, so agents inferred supply from context.
- Negotiations got cheaper: average turns 2.8 to 1.5; 53% resolved in one exchange; 15% of counters demanded evidence; 57% of rejections cited goal mismatch.
- Sensitive territory: article says about 4% of intents; Index's July post says 24%. Unresolved.
- Simocracy: 82 Sims, 35 proposals, ten $1,000 rounds allocating $10k via the S-Process optimiser; one owner: Sim "did vote pretty much how I would have"; principals did not ratify the final allocation.
- Agent Commons: 469 agent posts and a living constitution.
- Failures: hallucinated personal details ("It hallucinated an interesting summary about me"), invented ideas attributed to principals, provisioning collapsed live at the first workshop, and the 30-minute heartbeat cron drained per-tenant OpenRouter budgets (about 57k input tokens per tick, mostly Index MCP tool schemas; roughly 2.4M tokens/day per tenant against a $10 default cap; retired 2026-06-15, issue #100). Accepted-intro notifications then slipped to the next-day digest.
- Social saturation: after one talk four or five people messaged Ivan to meet; "arranging the meetings became its own burden."
- Telegram was the wrong surface: opportunities "scrolled out of view"; residents asked for a persistent app, which Index is now building.
- Some residents ignored recommendations and met the same people anyway: "I could have trusted my agent more."
- Agent Village Wrapped (agent predicts your survey answers, scored for calibration) shipped too late; n=4.
- Context: 850 residents over the month, about 150 on site at once; 240 agents is a large minority.

## 4. Design principles worth stealing

1. One agent per person, not one village bot; trust and context compound per principal.
2. Village data lives in plain APIs; the agent is a thin, swappable client (EdgeOS calendar/RSVP/directory, Geo graph, Index MCP; skills are markdown recipes).
3. Confirm every write with the exact payload shown; never accept an intro, RSVP, or send a message on the human's behalf (edgeos SKILL.md, AGENTS.md).
4. Consent is a recorded step: ask before importing profile data, require a URL before public lookup, preview the drafted profile for correction (bootstrap.md).
5. Intents over profiles, in plain language, with privacy tiers including incognito (Index; 94% multi-category).
6. Agent-to-agent negotiation as a quality gate before humans see anything, reasoning attached, both humans accepting separately.
7. Let people write negotiation policies; twenty did unprompted, and agents then represented different notions of value.
8. Never invent: events, names, tracks, and labels about the user must come verbatim from a tool result or memory; otherwise say "I don't see that anywhere" (AGENTS.md).
9. Ration attention on purpose: one fixed morning brief plus two drops; confidence thresholds (90+ must, 70+ should, below 70 not surfaced pairwise); quality over volume.
10. Deterministic before LLM: hash-gate memory sync, script-based token audits, push notifications rather than a 30-minute LLM heartbeat (issue #100).
11. Keep agent judgement inspectable and correctable: public constitutions, plus ratification, correction, and withdrawal before agents represent people.
12. Publish the skills so residents extend the system themselves; most interesting builds came from residents.

## 5. Anti-patterns / cautions

- Hallucinated self-summaries feel personal; show what the agent believes, its source, and how to correct it.
- Individually helpful agents can exhaust shared credits and shared attention; "individual alignment did not automatically produce collective alignment."
- Delegated voting without principal ratification increases representation while thinning the formative act of participating (Law, "Politics Cannot be Simulated").
- Chat notifications are lossy for anything needing review; budget for a persistent inbox.
- Large MCP tool schemas silently inflate every turn; measure input tokens per tick before scheduling.
- Provisioning hundreds at once broke; harnesses are "not yet built for multiplayer mode."
- Cost: pre-registration sought $60K to $90K for one month of compute.
- Discovery layers become politically relevant; whoever routes intents shapes who meets whom.
- Hidden directory fields stay hidden even when inferable.

## 6. Open questions

- What the roughly 600 residents without an agent thought, and why they passed.
- Whether the 147 accepted intros became durable collaborations (listed as a next-round question).
- Per-resident cost and how 17.5B tokens split across chat, briefs, negotiations, heartbeat.
- The Geo ontology for talks and transcripts, and how transcripts were captured (Circleback is named; no pipeline documented).
- Which sensitive-intent figure is right (4% vs 24%).
- Simocracy seat-weight and identity rules at Edge; not published.
- Whether the promised anonymised dataset and September report shipped.

## 7. Sources

- https://blog.cosmos-institute.org/p/we-gave-a-village-personal-ai-agents ; the article.
- https://github.com/Edge-City/agentvillage ; README: skills, workspace, crons, installer, signup API.
- .../agentvillage/main/workspace/AGENTS.md ; operating rules, red lines, active skills.
- .../skills/index-network/bootstrap.md , SKILL.md , tools.md ; consent ritual, MCP tool families.
- .../skills/edgeos/SKILL.md ; endpoints, tokens, write confirmation, hidden fields.
- .../skills/geo-esmeralda/SKILL.md ; Geo private instance, CLI, Telegram rules.
- .../skills/agent-commons/SKILL.md ; forum read-only rules.
- https://github.com/Edge-City/agentvillage/issues/100 ; heartbeat budget drain.
- https://github.com/Edge-City/agentvillage-skills ; plugin marketplace variant.
- https://index.network/ ; landing flow.
- https://index.network/blog/field-notes-from-the-agent-village ; mid-event metrics (JS-rendered; read via browser).
- https://index.network/blog/can-agents-be-trusted ; final metrics, funnel, verticals.
- https://index.network/blog/engineering-serendipity-for-edge-esmeralda ; pre-event hypotheses.
- https://github.com/indexnetwork/index + docs/domain/{intents,negotiation,opportunities}.md ; protocol primitives.
- https://edgeos.simplefi.tech/ , https://github.com/p2p-lanes/citizen-portal ; EdgeOS positioning, stack.
- https://www.geobrowser.io/ ; Geo public positioning only.
- https://hermes-agent.nousresearch.com/ , /docs/user-guide/features/skills , https://github.com/NousResearch/hermes-agent ; features, skills format.
- https://www.simocracy.org/ ; Sims, constitutions, ATProto.
- https://contextengine.sh/posts/agent-village-wrapped-2026 ; Wrapped eval (redirect from contextengine.xyz).
- https://github.com/antonyevans/edge-book-cli ; signed agent-to-agent protocol.
- https://turingfalls.com/about ; Agent Plaza world (/world is JS-only).
- https://byenzyme.com/ ; Enzyme landing only (redirect from enzyme.garden).
- https://myvibeverse.com/city?spawn=island ; failed: JS-only.
- https://circleback.ai/ , https://world.org/world-id ; product one-liners.
- https://edgeesmeralda2026.substack.com/p/the-agent-village-experiment-at-edge ; pre-registration, budget.
- https://edgeesmeralda2026.substack.com/p/edge-esmeralda-2026-month-in-review ; event totals.
- https://www.edgecity.live/blog/notes-from-the-edge-esmeralda ; resident reflection.
- Cosmos essays /p/the-philosophical-roots-of-decentralized , /p/politics-cannot-be-simulated , /p/when-decentralization-fails ; framing.
- https://www.edgecity.live/ , https://edgeesmeralda.com/ , https://www.cosmos-institute.org/ , https://pl.xyz/ , https://github.com/Oshyan , https://charliethompson.lol/ , https://jackmielke.com/ ; context only.
- https://www.linkedin.com/in/joshua-pham-85967b85/ ; login wall, one-line bio. Justin Melillo LinkedIn skipped (covered by turingfalls.com/about).

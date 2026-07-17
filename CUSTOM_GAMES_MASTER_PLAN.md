# Custom Games Master Plan

**Date:** 2026-07-16 (v4.1)
**Status:** APPROVED. Building now: Phase 0 + Workstreams A and C this session; handoff prompt covers test + ship. A parallel session is active in game-amora (see "Active parallel build").
**Scope:** Three workstreams that turn Custom Games into a real product line: the `/custom-games` page, the Custom-Game-Foundation codebase, and the intake form + conversational AI agent.

## Decisions locked

1. **API keys post-acceptance only**, entered by the client into their own instance. Never at intake, never stored in ReGen Civics systems.
2. **New upstream foundation repo: `Custom-Game-Foundation`.** Amora becomes downstream consumer #1.
3. **Ownership model:** $20k buys a fully owned, self-hosted game. 100% theirs: code, data, keys. No subscription required, and ReGen Civics makes no changes to their game unless asked. Optional full-service contract: ReGen Civics provides hosting + AI credits so everything runs with no servers, no code, no ops.
4. **Full-service pricing: a fixed monthly price scoped at contract, from $20 to $2,000/month** depending on the depth and breadth of the role Rye plays in their organization (bare hosting at the low end, up through AI credits, updates, and ongoing stewardship). Metered charges only if use exceeds the average expectations set at contract. Sold as a benefit: one number for what you asked us to carry, no surprises.
5. **Delivery timeline: 3-6 months**, depending on the experience, maturity, and availability of their team. Firmer estimate after contracting.
6. **Audience: founders and investors** starting land projects, who want a clear agreement and a game people actually play to make the project succeed.
7. **Intake guide persona: "Sylva"** (mythic, of the forest; the guide archetype). Voice as human as possible. Every custom game names its own guide; Sylva is ReGen's, Maia is Amora's, and the guide's name/voice is a blueprint field.
8. **North star:** intake → working first draft of their game in one Claude session.

---

## The product, stated plainly

A land project pays ReGen Civics $20k to get their own coordination game: a web app on their domain, in their brand, holding their data, that guides four personas (residents, business builders, core team, investors) through journeys covering everything a community needs to coordinate: who decides, how money flows, how contribution gets seen and rewarded, how new people come in. They own it completely. Amora is the first game and the foundation every future game is generated from.

The pipeline:

```
/custom-games page → conversational intake (Sylva) → blueprint.json + transcript + uploads
   → ONE Claude generation session: scaffold + content generation = working first draft
   → 3-6 month co-creation sprint with their team → handoff (owner's guide, their keys, their hosting)
```

Two artifacts carry everything: **blueprint.json** (structured fields the scaffold consumes) and the **intake transcript + uploads** (the raw voice and material the generation session writes their content from).

---

## Active parallel build (happening now, outside the original audit)

Another session is building in `game-amora` and has shipped (commit `8d761c4`, live):

- **`/work-with-us`**: contribution entry point, autosaving proposal form, proposals landing in the Prosperity inbox + admin Submissions.
- **Maia, the AI guide**: Anthropic-backed chat that walks someone through a proposal and compiles it for THEM to review and submit (never auto-sends). Dormant until an admin adds a key: no key, no cost, plain form shows.

Their queued next steps: submit acknowledgment emails + a status pipeline (New → Reviewing → In conversation → Accepted/Declined), connecting accepted proposals to the game (stage advance / quest spawn / Gratitude credit), signed-in attribution, attachments, white-labeling the exchange types and Maia's name/voice as brand-overlay fields, and anti-abuse (honeypot, per-IP limits, daily token budget).

**What this changes in the plan:**

- **The Maia pattern is now a validated foundation primitive.** Human-in-the-loop submit, injection-resistant prompt, dormant-until-key, cheap model, turn caps: the intake agent (Sylva) and every future in-game guide inherit this pattern rather than inventing it.
- **Several of their steps ARE foundation work** (white-label exchange types, guide name/voice as overlay, anti-abuse defaults, status pipeline). The extraction inherits them instead of redoing them.
- **Coordination protocol:** the extraction (Phase 2) branches from a tagged sync point AFTER the parallel session's current queue lands. Until then, no other session edits game-amora platform files. A `FOUNDATION_NOTES.md` in game-amora becomes the shared ledger where any session records foundation-relevant decisions (the parallel session should log its white-labeling choices there). Same discipline as the regen-civics concurrent-session rule: targeted adds, no simultaneous pushes.

---

## Current state (research summary)

**The page** (`client/src/pages/CustomGames.tsx`, 203 lines): thin. Hero, 4 feature cards, one $20k card, waitlist modal (`custom_game_inquiries` table + admin queue exist). Linked from nav and a Season2 CTA, absent from Home. No case study, process, FAQ, or proof.

**Amora** (`C:\Users\taren\Desktop\Amora\game-amora`; loose .tsx files at the folder root are a dead Manus prototype): React 19 + Vite + Express, flat-JSON storage, ~26k LOC, on Railway. The game engine (quests with consent-based crediting, Gratitude currency with monthly budgets, 12-stage Path of Growth, seasons, pulse feed) is already config-driven via `shared/gameConfig.ts` + runtime `brand.json` overlay + admin Setup Wizard. Gaps (pre-parallel-build):

1. **323 hardcoded "Amora" strings** across client pages (journey copy, Costa Rica specifics, logo, index.html meta, CSS theme, email templates).
2. **Orphaned content pipeline:** the admin Content editor writes `content.json` but no page reads it; journey copy is hardcoded in .tsx.
3. **Security not ready for N copies:** unsigned base64 tokens, "change-me" default passwords, keys in `data/email-config.json`, Manus/Base44 remnants. (Anti-abuse is now in the parallel session's queue.)
4. **Code shape:** 1,746-line server file, 2,391-line `Admin.tsx`, ~3k-line `JourneyToLaunch.tsx`, zero tests.
5. **Personas ~40% data-driven:** paths exist in config, but journey/rights pages, FAQ routing, email routing, and nav hardcode the four.

**Reusable regen-civics assets:** `FormCompanion` (voice-and-chat form-filling companion, already on `/apply`), `companionTurn()` engine (injection-hardened, structured output, never auto-submits), declarative form specs in `shared/companions.ts`, LLM core with failover, existing inquiries table + admin queue.

---

## blueprint.json v0.3 (Phase 0 deliverable)

```jsonc
{
  "blueprintVersion": "0.3",
  "foundationVersion": "1.0.0",

  "applicant": {
    "role": "founder | investor | core-team",
    "name": "", "email": "",
    "investorGoals": ""                    // investor branch: what success for their capital looks like
  },

  "identity": {
    "projectName": "", "tagline": "", "location": "", "country": "",
    "landStatus": "owned | leased | committed | seeking",
    "acreage": 0, "stage": "", "website": ""
  },

  "team": {                                // powers the honest 3-6 month estimate
    "adminName": "", "adminEmail": "",
    "size": 0, "hoursPerWeek": 0,
    "communityExperience": "", "technicalComfort": "low | medium | high"
  },

  "language": {
    "memberName": "",                      // Amora's "Amoracita"
    "currencyName": "",                    // Amora's "Gratitude"
    "communityNoun": "",                   // village, sanctuary, farm...
    "guideName": "",                       // their Maia; asked at intake
    "guideVoice": ""                       // tone notes for their guide's prompt seed
  },

  "theme": {
    "colors": { "primary": "", "surface": "", "accent": "", "text": "" },
    "fonts": { "display": "", "body": "" },
    "assets": { "logo": "", "favicon": "", "ogImage": "", "heroImages": [] },
    "toneWords": []
  },

  "personas": [                            // 1 to N, fully data-driven
    { "id": "resident", "label": "", "enabled": true,
      "targetCount": 0, "currentCount": 0,
      "journeySteps": [], "rights": [], "faqs": [] }
  ],

  "economy": {
    "currencies": [],                      // 1..N; recognition currencies carry NO peg. A recognition
                                           // currency may declare releases: { targetCurrencyId,
                                           // budgetPerCycleVar, method: "pro-rata" }: at cycle close it
                                           // releases a financial token from a per-cycle governed budget,
                                           // so its value floats (mirrors ReGen Civics Gratitude -> $ReGen;
                                           // canonical model in game-amora FOUNDATION_LEVERS spec §1.1)
    "currencyMonthlyBudget": 0, "stageMultipliers": {},
    "dues": {}, "investor": { "enabled": false, "summary": {} },
    "exchangeTypes": []                    // white-labeled reciprocity types (cash, tokens, JV, MOU, their own)
  },

  "stages": [ { "id": "", "name": "", "rule": {} } ],

  "quests": [ { "title": "", "persona": "", "reward": 0, "difficulty": "", "circle": "" } ],

  "formOutcomes": [                        // game effects on form acceptance (see improvement R3-4)
    { "form": "work-with-us", "onAccept": ["advanceStage", "creditCurrency"] }
  ],

  "content": {
    "vision": "", "story": "", "values": [],
    "problems": [],                        // coordination pains, feeds quest design
    "goals": []                            // ranked curriculum topics
  },

  "season": { "name": "", "theme": "", "start": "", "end": "" },

  "integrations": {                        // provider NAMES only, never keys
    "llmProvider": "", "emailProvider": "", "analytics": ""
  },

  "deployment": {
    "domain": "",
    "hosting": "self-hosted | regen-full-service",
    "adminEmails": [], "timelineEstimate": ""
  },

  "generationInputs": {
    "transcriptRef": "", "uploads": []     // logo, land photos, vision docs, master plans
  }
}
```

Validation: shared zod schema, partial/progressive for intake, strict/complete for generation.

---

## The one-session generation path

1. **`create-land-game` scaffold** (Custom-Game-Foundation repo): consumes blueprint.json, emits a new repo from the template with `brand.json`, `theme.json`, config overrides, empty seed shells, and the Railway checklist. Deterministic, minutes, zero AI.
2. **`GAME_GENERATION.md` playbook**: the standing prompt a Claude Code session runs inside the new repo. Inputs: blueprint.json + transcript + uploads. Outputs: every content seed in their voice: persona journeys, quest ladders (derived from their problems and goals), stage names, FAQs, milestones, welcome copy, email templates, their guide's prompt seed. Quality bars encoded (writing rules, no invented facts, flag gaps), ending with self-checks: typecheck, boot, click every journey, zero foundation-brand leakage.
3. **Intake as generation fuel:** Sylva asks for stories, language, and specifics because the generation session writes from the transcript. Uploads attach at intake, and applicants can hand over existing docs (vision docs, governance agreements, master plans) for Sylva to extract answers from rather than retyping (improvement R3-8).

Session output: a running branded instance with seeded content. The 3-6 months is co-creation, never mechanical setup.

---

## Workstream A: the /custom-games page

Goal: a no-brainer page for founders and investors. Model on `Season2.tsx` (cinematic hero, scroll timeline, glass panels, FAQ, sticky mobile CTA), with real Amora screenshots doing the proof work.

**Page structure:**

1. **Hero.** Full-bleed imagery, gradient scrim. Headline: your land project succeeds when everyone knows the game. Primary CTA "Design your game" → intake with Sylva.
2. **Who this is for.** Two panels: **Founders** who want clear agreements and a game people play to make the project real. **Investors** who want their capital to produce value, with the game as the accountability and coordination infrastructure that protects it.
3. **The problem.** In Rye's voice: land projects fail on coordination, money opacity, and burnout long before they fail on permaculture.
4. **Amora, live.** Real screenshots (capture prompt at the end of this doc) of the four journeys, quest board, Gratitude wall, Setup Wizard, and now Maia. A **"Latest from ReGen Civics"** strip showing recent platform ships (improvement R3-9): ReGen Civics is the builder shipping upgrades, Amora is client #1. Active development is credibility. Later: clickable Test Village demo.
5. **The four personas.** One visual band each.
6. **What your game covers.** Governance and decision-making, economic systems and tokenomics, legal structure, onboarding and rites of passage, contribution and recognition, resource flows and transparency.
7. **You own it. All of it.** 100% ownership of code, data, keys. Self-hosted on their accounts. No subscription required. ReGen Civics touches nothing after handoff unless asked. Handoff includes an owner's guide. AI features cost $0 until they add their key (the Maia pattern, improvement R3-3). Then the option: full service, one fixed monthly price covering hosting + AI credits, metered only beyond average use. One number, no surprises.
8. **How it works.** Intake with Sylva (~20 min) → rendered Blueprint doc → contract + kickoff → first playable draft → 3-6 months co-creation (pace depends on your team; firm estimate at contract) → training + handoff. Clients follow progress on their own Build Journey tracker (improvement R3-7).
9. **Pricing.** $20k, milestones 50% kickoff / 25% first draft / 25% handoff. Full-service card: fixed monthly price from $20 to $2,000/month scoped to what they ask ReGen Civics to carry (hosting only at the low end, up through AI credits, updates, and ongoing stewardship), metered only past the average use set at contract.
10. **What we need from you.** Logo + photos, a vision holder available for calls, content review turnarounds, an admin-to-be.
11. **FAQ accordion.** Ownership, hosting choices, AI costs (dormant until key; fixed price on full service), timeline honesty, after-handoff policy (we change nothing unless asked), changing personas, existing communities.
12. **Final CTA + sticky mobile CTA.**

**Also:** link from `Home.tsx`, dedicated SEO + JSON-LD `Service` schema, analytics on both CTAs, waitlist form as secondary path, performance budget (`/api/img`, lazy sections, LCP target). Copy via `regen-fundraising-copy`, passing STEERING section 1.

**Evidence gate:** mobile + desktop screenshots, `pnpm check`, both CTA events firing, Lighthouse pass on the new imagery weight.

---

## Workstream B: Custom-Game-Foundation

Goal: a new upstream repo with zero Amora content. Amora becomes downstream consumer #1 and the proof.

### Repo mechanics

- **Extraction, not fresh build:** copy of `game-amora` with B1 + B2 applied, branched from a **tagged sync point after the parallel session's current queue lands**. Amora content moves to seeds living only in the Amora downstream repo.
- **Downstream rule:** generated games never edit platform files; customization lives in `data/` overlays, seeds, and assets. Enforced by convention + a CI diff check against upstream.
- **Updates:** tagged releases + CHANGELOG + upgrade notes; customer repos keep an `upstream` remote; `foundationVersion` stamped by the scaffold. A "What's new" surface inside each game shows available updates and is the channel for paid upgrade offers.
- **Amora migration:** re-point `amora.regencivics.earth` at a repo generated from the foundation using Amora's own blueprint. Zero visible change = acceptance test.

### B1. De-Amora pass

| # | Change |
|---|--------|
| 1 | **Finish the content pipeline:** journey and copy-heavy pages read `content.json` via `/api/content/:section`; current copy becomes the Amora seed. |
| 2 | **Theme from config:** `theme.json` (colors, fonts, logo, favicon, OG image) injected as CSS variables at runtime; config-driven brand mark. |
| 3 | **Config-driven index.html:** title, meta, canonical, OG, JSON-LD rendered from config. |
| 4 | **Extract server content constants** (FAQs, milestones, investor summary, training, email templates) into seeds. |
| 5 | **Personas fully data-driven:** journey/rights pages, FAQ pathways, email routing, nav all render from config + seeds. |
| 6 | **Guide + exchange types as overlay fields** (inherit from the parallel session's white-labeling; log in FOUNDATION_NOTES.md). AI prompts live in seeds so each game tunes its guide's voice without code. |

### B2. Hardening

| # | Change |
|---|--------|
| 7 | **Signed auth tokens** (HMAC JWT or session lib). |
| 8 | **Env-based secrets + `.env.example`;** env first, admin-entered second; model name configurable; refuse to boot in production on "change-me" passwords. |
| 9 | **Storage seam:** repository interface over `readJson`/`writeJson` with write locking; SQLite/Postgres adapter can drop in later. |
| 10 | **Strip Manus/Base44 remnants;** archive the loose prototype files at the Amora folder root. |
| 11 | **Anti-abuse as platform defaults** (inherit + generalize the parallel session's honeypot, per-IP limits, daily token budget) on every public form and AI endpoint. |
| 12 | **AI usage metering:** token accounting per feature + an admin usage dashboard. Required for full-service fixed-price billing (average-use threshold + overage), and gives self-hosted owners cost visibility on their own keys. |
| 13 | **Unified inbox pattern:** one status pipeline (New → Reviewing → In conversation → Accepted/Declined) shared by all form types, generalizing the parallel session's submissions work. One admin pattern, N forms. |
| 14 | **Form-outcome hooks:** config-declared game effects on acceptance (advance stage, spawn quest, credit currency), generalizing "connect it to the game" into a platform capability every custom game gets. |
| 15 | **Attachments as a platform primitive:** one upload pattern (from the investor vault + the parallel session's proposal attachments) reused everywhere, including intake uploads. |
| 16 | **Decompose + test:** split `server/index.ts` into routers/services; break up `Admin.tsx` and `JourneyToLaunch.tsx`; Vitest on money paths (quest crediting, currency budgets, stage computation, auth). |

### B3. Generation + handoff tooling

| # | Change |
|---|--------|
| 17 | **`create-land-game` scaffold** (deterministic, from blueprint.json). |
| 18 | **`GAME_GENERATION.md` playbook** (one-session content generation with self-checks). |
| 19 | **Owner's guide generator:** every instance ships `OWNER_GUIDE.md` built from its blueprint. |
| 20 | **`CLAUDE.md` in every generated repo** so owners self-serve improvements with Claude Code. |
| 21 | **Build Journey tracker:** generalize the `JourneyToLaunch` internal PM page into a client-facing progress page per engagement, so clients watch their game come alive across the 3-6 months. |
| 22 | **Test Village:** fictional project generated from a blueprint; acceptance test (zero leakage) and clickable public demo. |
| 23 | **Optional "Crafted with ReGen Civics" credit** in the footer, default on, owner-removable (they own 100%). The referral flywheel. |

---

## Workstream C: intake with Sylva

Same rails (`custom-game-application` form spec, `FormCompanion` on `/custom-games/apply`, `custom_game_applications` table + admin queue, voice or chat, resumable, transcript saved), plus:

**Sylva's character:** a mythic forest guide, ReGen's own Game Guide. Voice spec: as human as possible. Short conversational turns, contractions, plain speech, one question at a time, reacts to what was actually said, zero assistant-isms, no lists when speaking. Voice-first via the existing STT/TTS stack, tested by ear before launch. Server-side system prompt in `ship-personas.ts`, same injection-hardening as the rest.

### Question architecture v3

| Section | Captures | Feeds |
|---|---|---|
| 1. Who are you | Founder, investor, or core team; investor branch: what their capital needs to produce, reporting/visibility wanted | `applicant.*` |
| 2. Project identity | Name, location, land status, acreage, stage, website | `identity.*` |
| 3. Vision + story | Big vision, origin story in their words, values | `content.*` + transcript fuel |
| 4. People + personas | Which personas apply, custom ones, counts, what they call members | `personas[]`, `language.*` |
| 5. Coordination today | How decisions happen now, how money flows, how contribution gets recognized, what hurts most | `content.problems` → quest design |
| 6. What the game must accomplish | Rank the curriculum topics | `content.goals` |
| 7. Economy + exchange | Currency name, dues, reward instincts, investor structure, their exchange types | `economy.*` |
| 8. Name your guide | What would you call your community's guide, and how should they sound | `language.guideName`, `guideVoice` |
| 9. Team capacity | Who will admin, hours/week, experience, technical comfort | `team.*` → timeline estimate |
| 10. Brand + uploads | Colors, fonts, tone words; logo, land photos, vision docs (Sylva extracts answers from provided docs rather than re-asking) | `theme.*`, `generationInputs` |
| 11. Operations | Domain, self-hosted vs full-service, timeline hopes, budget confirmation, referral | `deployment.*` |
| 12. Integrations | Preferred LLM + email providers: names only, never keys | `integrations.*` |

Funnel unchanged: page CTA → Sylva (~20 min, framed as "talk to the kind of guide your community will get") → auto-scored admin queue → intro call → rendered Blueprint doc → contract → generation session → Build Journey tracker through co-creation → handoff. Confirmation + nurture emails at each stage.

---

## Round 3 improvements (new this round)

1. **Session coordination protocol + tagged sync point.** The extraction branches only after the parallel session's queue lands; `FOUNDATION_NOTES.md` in game-amora is the shared decision ledger between sessions. Prevents the concurrent-session drift already seen in regen-civics.
2. **Maia pattern promoted to platform principle:** every AI feature is human-in-the-loop, injection-resistant, turn-capped, and dormant until a key exists. Also a page selling point: AI costs $0 until you switch it on.
3. **AI usage metering + admin usage dashboard** in the foundation. Makes the fixed-price full-service model billable (average-use threshold, metered overage) and gives self-hosted owners cost transparency on their own keys.
4. **Form-outcome hooks as config:** any form acceptance can advance a stage, spawn a quest, or credit currency. Generalizes the parallel session's "connect it to the game" into something every custom game gets from day one.
5. **Unified inbox pattern:** one status pipeline shared by all form types, so N forms cost one admin pattern.
6. **Guide identity as a blueprint field** + the "name your guide" intake question. Naming their guide is the moment the game becomes theirs mid-conversation; it also seeds the guide's prompt.
7. **Build Journey tracker for clients:** repurpose the existing `JourneyToLaunch` PM page into a client-facing progress view. Transparency across 3-6 months kills the "what's happening?" anxiety on a $20k engagement.
8. **Doc extraction at intake:** applicants hand Sylva their existing vision/governance docs and she extracts answers rather than making them retype their life's work.
9. **"Latest from ReGen Civics" strip on the page:** a living mini-changelog of platform upgrades proving active development. ReGen Civics is the builder; Amora is client #1 benefiting from every ship.
10. **Anti-abuse as foundation defaults**, inherited from the parallel session's work and applied to every public form and AI endpoint across all future games.
11. **Prompt seeds:** guide system prompts live in seeds/config, so tuning a game's guide voice is content work, never code.
12. **Optional "Crafted with ReGen Civics" footer credit**, default on, owner-removable. Every delivered game becomes a referral surface without compromising the 100%-ownership promise.
13. **Attachments as one platform primitive** reused by proposals, intake, and the investor vault, instead of three upload implementations.

(Rounds 1 and 2 improvements remain baked into the workstreams above.)

## The civilization pattern (improvement 15, 2026-07-17)

Selling a custom game is planting a civilization. The mission says a growing DIVERSITY of regenerative civilizations, and this product is the reproduction mechanism: every bioregion, church, school, or village that wants its own game gets one, with its own tokens, elders, seasons, and quests, federated back through the federation surfaces. The blueprint therefore encodes the civilization pattern: the parts we believe every regenerative game needs, each one an optional, configurable module in `blueprint.json` (`civilization` key, `shared/customGameBlueprint.ts`), so a fork inherits the wisdom while expressing its own culture.

The modules and their config knobs (reference implementations in this repo, per `CLAUDE_CODE_PROMPT_2026-07-16_MULTIPLAYER_COORDINATION.md`):

| Module | Knobs | Reference implementation |
|---|---|---|
| `ritualSpine` (default on) | opening ceremony, weekly campfire thread, featured quest, crew spotlight, mid-season ecological moment (their calendar), closing harvest ceremony | `SEASON_TEMPLATE.md` |
| `multiplayerMode` | crewSizeMin/Max, launch quest count | Phase A: `shared/multiplayerQuests.ts`, `server/jobs/questCrewAssembly.ts`, `/multiplayer` |
| `needsOffersBoard` | form capture on/off, matcher intro emails, per-party daily cap | Phase B2: `server/lib/needsOffers.ts`, `/board` |
| `impactSchema` | extra fields beyond the ReGen set | Phase C1: `shared/impact.ts`, admin `ImpactDataPanel` |
| `verificationLadder` | rung multipliers; public-token governance (`hypha-voting` default) | Phase D3 + ADR-42: the ladder feeds internal credit only; humans gate real tokens |
| `elders` | quest offers on/off. **Invariant, not a knob: human-steward review with standing veto** | Phase D1: `server/lib/elders.ts` registry, `humanSteward` field |
| `federation` | projects.json, llms.txt | Phase C2 + ADR-41: `/api/federation/projects.json` |
| `consentMemory` | on/off. **Invariants: opt-in default off; transparency surface ships before any write** | Phase D2: `player_companion_memory`, settings surface |

Two rules ride along as `z.literal` invariants so no configuration can turn them off: elder personas always carry a named human steward with veto, and player memory is always opt-in with the transparency surface first. Those are the pattern's ethics, and a fork inherits them with the code.

## Risks and guards

| Risk | Guard |
|---|---|
| Parallel session and extraction collide in game-amora | Tagged sync point; extraction waits for their queue; FOUNDATION_NOTES.md ledger; no simultaneous platform-file edits. |
| Amora production breaks during extraction | Amora stays on its current repo until the foundation-generated replacement passes the zero-diff migration test. |
| Scope creep inside $20k builds | Scope on page and contract: up to 4 personas, seeded quests, brand, content, deploy, training, two revision rounds. |
| Timeline disputes | 3-6 month range on the page, team-capacity intake, firm estimate at contract, milestone payments, Build Journey tracker. |
| Full-service AI costs exceed the fixed price | Usage metering + average-use threshold + metered overage, alerts before overage hits. |
| Bugs replicated across customer forks | Vitest on money paths + Test Village gate before the first paying generation run. |
| Foundation/downstream divergence | Config-and-seeds-only rule + CI diff check + tagged releases. |
| Intake LLM cost/abuse | Companion rate limits, capped turns, Haiku-class model, honeypot + IP limits + daily token budget. |

## Success metrics

- Page: CTA click-through, application starts, waitlist-to-application conversion.
- Intake: completion rate, median time, blueprint completeness at submit.
- Pipeline: intake → first playable draft in one session; scaffold under an hour; Amora migration zero-diff; Test Village zero-leakage.
- Business: qualified applications per season, setup sales, full-service attach rate, referral clicks from footer credits.

## Sequencing

- **Phase 0 (half a day):** blueprint.json v0.3 as a shared zod schema.
- **Phase 1 (revenue-facing, parallel sessions):** Workstream A (page, 1-2 sessions, screenshots via the prompt below) + Workstream C (Sylva intake, 2-3 sessions). Both live in regen-civics, so no collision with the game-amora session.
- **Phase 2:** B1 + B2 extraction into `Custom-Game-Foundation` (4-6 sessions), branching from the tagged sync point after the parallel session's queue lands.
- **Phase 3:** B3 generation + handoff tooling, Test Village, Amora migration. Then the first paying blueprint runs the full pipeline.

## Remaining open items for Rye

None blocking. Full-service pricing decided ($20-$2,000/month scoped at contract), Sylva confirmed, repo name confirmed.

---

## Amora screenshot capture prompt (give this to a fresh session)

```
Capture live marketing screenshots of the Amora game for the new
regencivics.earth/custom-games page.

App: https://amora.regencivics.earth (production Amora instance).
Codebase for reference: C:\Users\taren\Desktop\Amora\game-amora
Note: another session is actively developing this app. Capture only;
change nothing, and don't edit the repo.

Use the Claude in Chrome tools (or Playwright via the webapp-testing skill).
Two viewports: desktop 1440x900 and mobile 390x844.

Shots needed (both viewports unless noted):
1. Home / choose-your-path hero (full-page AND above-the-fold variants)
2. Investor Journey (top + one mid-journey step)
3. Village Steward Journey (top)
4. Resident Journey (top)
5. Prosperity Creator Journey (top)
6. Quest board at /quests
7. Gratitude Wall
8. Roles or Circles page (whichever reads better visually)
9. /work-with-us with the Maia AI guide visible if a key is configured
10. Game Dashboard (needs a logged-in player: register a test account if
    open registration works, otherwise ask Rye for credentials)
11. Admin Setup Wizard "Make This Yours" (desktop only; needs ADMIN_PASSWORD
    from Rye)

Rules:
- No real member data in frame. Verify the instance is near-empty before
  shooting. If a test account is created, use an obviously fake name.
- Save PNGs to
  C:\Users\taren\Downloads\regen-civics-clean\client\public\images\custom-games\
  named like amora-home-desktop.png, amora-quests-mobile.png.
- Keep each under ~300KB (the site serves through the /api/img resize proxy,
  but keep sources lean).
- Finish with a manifest.md in the same folder: filename, page, viewport,
  and suggested alt text for each shot.
```

# AI Visibility Log

Bi-weekly record of whether AI answer engines and search surfaces cite ReGen Civics for its target query space. Written by the `regen-ai-visibility-panel` scheduled task (runs the 1st and 15th of each month, 9am). The query panel and format live in the task prompt; the plan behind it is `LLM_DISCOVERABILITY_PLAN.md` Layer 5.

Read this newest-first. Each entry: results table (query | cited? | position/notes | who dominates), trend note vs the previous entry, and accuracy problems in how engines describe ReGen Civics.

---

## 2026-08-01: First measured panel

**Flag: two queries cited, thirteen did not.** ReGen Civics only surfaces on searches that already contain its name or its exact quest/token phrasing. Every generic top-of-funnel query, the kind an actual land steward, funder, or community founder would type, returned zero mention.

### Web search results (WebSearch tool)

| Query | Cited? | Position / notes | Who dominates |
|---|---|---|---|
| * what is ReGen Civics | Yes | regencivics.earth listed (6th of 10 links); AI summary described it correctly as a fund and a game for regenerative land projects, quests and tokens included | hypha.earth DHO page, mirror.xyz SEEDS post, YouTube founding-session videos |
| how to start an ecovillage | No | not present | ic.org, The Momentum, generic ecovillage blogs |
| * I have land and want to start a community, where do I begin | No | not present | Quora, permies.com forum, Shareable, Grounded Solutions Network |
| how to fund a regenerative land project | No | not present | Conservation International, BCG, Kiss the Ground, New Earth Development masterclass funnel |
| * intentional community funding options | No | not present | icmatch.org (dominant across nearly every result), GrantWatch, Intentional Endowments Network |
| regenerative finance platforms | No | not present | CoinGecko, 101 Blockchains, Regen Network, Toucan Protocol, KlimaDAO, Celo, Moss.Earth |
| what is bioregionalism | No | not present | Earth.org, EBSCO, Wikipedia, Cascadia Department of Bioregion |
| * incubator for ecovillages and land projects | No | not present | Global Ecovillage Network / CLIPS, Earthaven, the-ecovillageproject.com |
| new economic systems for communities | No | not present | Medium, World Economic Forum, Urban Institute, Wikipedia |
| nine forms of capital regenerative | No | not present; the engine corrected the query to "eight forms of capital" and found no nine-forms variant anywhere | regenterprise.com, RegenCAN, Capital Institute (all teaching the Roland/Landua eight-forms model) |
| community governance models for land projects | No | not present | academic journals (Springer, Tandfonline), sustainability-directory.com |
| invest in regenerative agriculture land | No | not present | AgFunder, BCG, Conservation Finance Network, SLM Partners |
| crowd pooling community investment land | No | not present, despite ReGen Civics shipping its own crowdpooling feature this year | generic real-estate crowdfunding platforms (FasterCapital, Bankrate, CrowdProperty) |
| what is the regenerative renaissance | No (not in link list) | Rye is named directly in one source ("Regenerative Renaissance: Weaving new worlds with cryptocurrencies based on community, with Rieki Cordon," accidentalgods.life), but regencivics.earth itself did not surface. SEEDS' explore.joinseeds.earth "Welcome to the Regenerative Renaissance" page currently owns this exact phrase | SEEDS (explore.joinseeds.earth), RenaissanceU, Daniel Christian Wahl essays |
| quests for regeneration game earn tokens | Yes | regencivics.earth listed 3rd of 10 links; AI summary named ReGen Civics outright as "the most direct match," describing quests, tokens, and funding real-world regeneration correctly | otherwise dominated by unrelated video-game token mechanics (MTG, Steam, mobile games) |

### Perplexity spot-check (4 starred queries, via Claude in Chrome)

| Query | Cited? | Notes |
|---|---|---|
| what is ReGen Civics | Partial | Perplexity's own answer describes it fairly (regenerative-civics alliance, open-source game, quests, governance, funding tied to projects) but frames it as an "alliance/platform," not a fund, and cited sources were youtube and seeds-explorers, not regencivics.earth directly |
| I have land and want to start a community, where do I begin | No | Answer covered vision, legal structure, financing, and site planning with 15 sources; ReGen Civics never mentioned |
| intentional community funding options | No | Answer covered member buy-ins, land trusts, grants, mission-driven loans, crowdfunding; ReGen Civics never mentioned |
| incubator for ecovillages and land projects | No | Answer pointed to ecoaldeas.org's Ecovillage Incubator, Groundswell's Incubator Farm, and GEN Europe; ReGen Civics never mentioned |

### Trend note

This is the first measured entry. 2026-07-15 was infrastructure-only (crawler-visible content, sitemap, RSS, IndexNow), with no panel run. Baseline for future comparison: 2 of 15 web queries cited ReGen Civics (13%), both queries that already contain the brand name or the site's own quest/token language. Zero visibility across every land-owner, funder, or governance-model query that doesn't already know the name. Perplexity mirrors the same pattern: ReGen Civics only comes up when its name is in the query.

### Accuracy problems

Where ReGen Civics does appear, the description is accurate: fund plus game, quests, tokens, land regeneration. No misrepresentation found. The one open question is the "nine forms of capital" query returning zero trace of a nine-forms framework anywhere, only the standard eight-forms model (Roland and Landua). Worth checking whether "nine forms of capital" is current ReGen house language in `DOMAIN-LANGUAGE.md` and, if so, whether any published page actually explains what the ninth form is and why it differs from the standard model. Right now nothing indexed explains it.

### Regressions

None to flag yet; this is the first measured run.

---

## 2026-07-15: Baseline pending

Infrastructure shipped this day (crawler-visible content, all community posts in sitemap, RSS, IndexNow, robots refresh). First measured panel runs 2026-08-01. Expect the first entry to be mostly "not cited"; that is the baseline the later entries get compared against.

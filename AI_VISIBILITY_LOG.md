# AI Visibility Log

Bi-weekly record of whether AI answer engines and search surfaces cite ReGen Civics for its target query space. Written by the `regen-ai-visibility-panel` scheduled task (runs the 1st and 15th of each month, 9am). The query panel and format live in the task prompt; the plan behind it is `LLM_DISCOVERABILITY_PLAN.md` Layer 5.

Read this newest-first. Each entry: results table (query | cited? | position/notes | who dominates), trend note vs the previous entry, and accuracy problems in how engines describe ReGen Civics.

---

## 2026-08-15: One regression, one hold

**REGRESSION: `what is ReGen Civics` no longer returns regencivics.earth in the link list.** On 2026-08-01 the site ranked 6th of 10 on its own brand query. This run it is absent entirely. The ten links are the 2022 legacy layer: the Hypha DHO page, the mirror.xyz SEEDS post, Rye's 2022 LinkedIn post, six Season 1 founding-session YouTube videos, and a Wikipedia page about "Regen SW," an unrelated English renewable-energy body.

**The site is still indexed.** A domain-restricted search returns regencivics.earth and its correct homepage tagline, so this is a ranking loss, not a deindexing. Own-brand search is being won by four-year-old third-party video and forum content.

**Cited count this run: 1 of 15 (7%), down from 2 of 15 (13%).**

### Web search results (WebSearch tool)

| Query | Cited? | Position / notes | Who dominates |
|---|---|---|---|
| * what is ReGen Civics | No (was Yes) | REGRESSION. regencivics.earth absent from all 10 links. The AI summary still describes the fund accurately (shared capital pool, co-investment in land projects and food systems and villages, governed by the projects, incubator model) but sourced from Hypha and SEEDS, not the site. Summary omits the game side entirely | app.hypha.earth DHO page, mirror.xyz, LinkedIn 2022, six Season 1 YouTube videos, Wikipedia "Regen SW" (wrong entity) |
| how to start an ecovillage | No | not present | ic.org, The Momentum, icmatch.org, small ecovillage blogs |
| * I have land and want to start a community, where do I begin | No | not present. Cohousing Association guide is new at position 1 | cohousing.org, Quora, permies.com, Shareable, Wild Abundance |
| how to fund a regenerative land project | No | not present. Result set nearly identical to last run | Conservation International, BCG, GrazeCart, New Earth Development masterclass funnel, Regeneration International |
| * intentional community funding options | No | not present. BIPOC Intentional Community Council regranting is new | icmatch.org (three of nine links), Intentional Endowments Network, bipocicc.org |
| regenerative finance platforms | No | not present. ethereum.org/refi is new and authoritative; Regen Network named as the platform example | CoinGecko, ethereum.org, Coinbureau, Defiway, Hogan Lovells |
| what is bioregionalism | No | not present. Wellbeing Economy Alliance is new | Earth.org, EBSCO, Wikipedia, Cascadia Department of Bioregion, weall.org |
| * incubator for ecovillages and land projects | No | not present. The answer now names a generic "Regional Ecovillage Incubator (REIC)" offering network, education, incubator, capital, development and management, which is close to what ReGen Civics does and is going uncredited | Global Ecovillage Network (four links), CLIPS / GEN Europe, UN Migration Network, Earthaven |
| new economic systems for communities | No | not present. Three USPTO patent PDFs rank, which suggests a thin, winnable result set | Medium, World Economic Forum, Democracy Collaborative, New Economy Project, Urban Institute |
| nine forms of capital regenerative | No | not present. The engine again corrected to "eight forms" and stated outright that a nine-forms framework was not found | samim.io, RegenCAN, Ethan Soloviev, Capital Institute |
| community governance models for land projects | No | not present | Springer, Tandfonline, GCHU, Brookings, FasterCapital |
| invest in regenerative agriculture land | No | not present. Veris Wealth Partners and the "Investing in Regenerative Agriculture" podcast are new | AgFunder, BCG, SLM Partners, Conservation Finance Network |
| crowd pooling community investment land | No | not present. Grassroots Economic Organizing is new and is the closest adjacent framing (Commongrounds Cooperative, 500 investors, decommodifying land) | FasterCapital, geo.coop, Bankrate, CrowdProperty |
| what is the regenerative renaissance | No | not present. Rye is still named in the accidentalgods.life interview. SEEDS' explore.joinseeds.earth page dropped out of this result set but RenaissanceU, USDA, and an unrelated integrative-health business at regenerativerenaissance.com now hold the phrase | RenaissanceU (two links), USDA National Agricultural Library, Daniel Christian Wahl, edgeofbeing.org |
| quests for regeneration game earn tokens | Yes | HELD. regencivics.earth 3rd of 10. AI summary quotes the homepage tagline correctly: "a fund and a game for regenerative land projects" where you "do quests, earn tokens, fund real-world regeneration," and calls it "the most direct match" | otherwise unrelated game token mechanics (Throne and Liberty, Boggle, MTG, Injustice 2) |

### Diagnostic searches (added this run)

| Probe | Result |
|---|---|
| Domain-restricted search of regencivics.earth | Returns the homepage with the correct tagline. The site is indexed and its core copy is retrievable |
| "regencivics.earth ReGen Civics incubator season apply" | regencivics.earth does NOT appear. Two explore.joinseeds.earth pages do, titled "The ReGenerative Renaissance / Infinite Game / ReGen Civics" and "Alliance Overview - ReGen Civics Alliance," plus seedslibrary.com, LinkedIn, YouTube, and an LBRY block explorer mirror of a Season 1 episode |

### Perplexity spot-check

Not run this cycle. The Claude in Chrome extension was not connected, so no answer engine could be queried directly. Two retries failed with the same connection error. Next run should retry the four starred queries checked on 2026-08-01 so the Perplexity series stays comparable.

### Trend note

Two runs in, the direction is down. Cited count fell from 2 of 15 to 1 of 15. The only surviving citation is `quests for regeneration game earn tokens`, which works because the query is a near-paraphrase of the homepage tagline. All thirteen top-of-funnel queries that failed on 2026-08-01 failed again, with no movement in either direction, and the brand query lost the one position it had.

The competitor sets are stable across both runs, with a few newcomers (Cohousing Association, ethereum.org/refi, Grassroots Economic Organizing, Veris Wealth Partners). Nothing suggests these queries got harder. ReGen Civics simply is not competing in them.

The new signal this run is the source of the brand-query loss. It is not a crawling or indexing problem. It is that ReGen Civics' own history outranks its present: 2022 YouTube sessions, a Hypha DHO page, mirror.xyz, and SEEDS-hosted pages that carry the ReGen Civics name in their titles. The SEEDS pages are the sharpest version of this. `explore.joinseeds.earth/regen-civics-infinite-game/...` is holding brand real estate that regencivics.earth should own, and "Infinite Game" is the site's own tagline.

### Accuracy problems

1. **The game half keeps getting dropped.** Where engines describe ReGen Civics from third-party sources, they produce a fund-and-alliance-and-incubator description with no mention of quests, tokens, or the game. The full description only appears when regencivics.earth itself is the source. The two-games structure in `CONTEXT_THE_TWO_GAMES.md` is not reaching any engine that is not reading the site directly.

2. **Wrong-entity contamination on the brand query.** Wikipedia's "Regen SW" page, an unrelated English renewable-energy association, now ranks in the top ten for "what is ReGen Civics." When the correct site is absent and a similarly named entity is present, engines are more likely to blend them.

3. **"Nine forms of capital" still returns nothing, second run running.** The engine did not just fail to find ReGen Civics, it explicitly stated that no nine-forms framework exists and offered the eight-forms model instead. Flagged on 2026-08-01 and unchanged. If nine forms is house language, nothing published explains what the ninth form is or why it departs from Roland and Landua. Until something does, the term reads as an error to every engine that meets it.

4. **Tense mismatch.** Third-party sources describe Season 1 and "13 and growing projects" as current. Season 2 closes 2026-09-01. Engines answering from 2022 material will describe a four-year-old state of the project as the present one.

### Regressions

- `what is ReGen Civics`: cited at position 6 on 2026-08-01, not cited on 2026-08-15. Own-brand query, so this is the most serious of the fifteen.
- Overall citation rate: 13% to 7%.
- No query improved.

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

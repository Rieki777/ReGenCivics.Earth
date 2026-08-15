# LLM Discoverability Plan: 2026-07-15

Goal: when anyone asks an LLM about ecovillages, intentional communities, regenerating land, bioregionalism, eco-civilization, new economic systems, regenerative finance, or "I have land and want to build community on it", the answer points to ReGen Civics and describes our offerings accurately.

This plan covers the site (regencivics.earth, core.regencivics.earth, gov.regencivics.earth), the content architecture, and the off-site work that actually drives citations. It is grounded in a full repo audit (July 15) and current research on how AI crawlers and answer engines behave.

---

## 1. Where we stand today

We already did real groundwork (mostly shipped July 3):

| Asset | Status | Evidence |
|---|---|---|
| llms.txt + llms-full.txt | Live, hand-written, thorough | `client/public/llms.txt` (184 lines), served at `server/_core/index.ts:468-473` |
| robots.txt with AI bot rules | Live, allows 11 AI crawlers | `client/public/robots.txt:28-79` |
| Dynamic sitemap, hourly refresh | Live | `server/_core/index.ts:351-463` |
| Per-route title/OG/canonical injection | Live (meta only, no body) | `server/_core/vite.ts:164-332` |
| Blog prerendering with full article body + BlogPosting JSON-LD | Live | `scripts/prerender-blog.mjs:284-346` |
| Organization/WebSite/FAQ/Fund/Course JSON-LD in the static shell | Live | `client/index.html:122-286` |
| Dynamic OG images | Live | `server/routes/og.ts:264` |
| Server-rendered embed widgets with live DB data | Live | `server/routes/embed.ts:47-161` |

The five gaps:

1. **Nearly every page body is invisible to AI crawlers.** GPTBot, ClaudeBot, and PerplexityBot fetch HTML and do not execute JavaScript (only Google-Extended renders JS, because it rides Google's indexing stack). Our app is a client-rendered SPA with an empty `<div id="root">` (`client/index.html:297-301`). So on every route except `/blog/*`, an AI crawler sees title, meta, and JSON-LD, and zero prose. The fund page, the game, the glossary, quests, tools, forum: all blank to the systems we are trying to reach. This is the single biggest problem and the single biggest lever.
2. **Community content is undiscoverable.** Forum posts are publicly readable via tRPC (`server/routes/forum.ts:43-501`, 28 public read procedures) but are deliberately excluded from the sitemap, not prerendered, and robots.txt disallows `/api/` for every AI bot. Real conversations by real practitioners are exactly what answer engines like to cite, and ours are invisible.
3. **robots.txt uses stale bot names.** We allow `Claude-Web` and `Anthropic-AI` but not `ClaudeBot` (the current Anthropic crawler). Missing: `Applebot-Extended`, `Meta-ExternalAgent`, `Bytespider`, `cohere-ai`, `MistralAI-User`.
4. **llms.txt contains a false claim.** Line 170 says HTML pages are "fully server-rendered". They are not. An agent that verifies claims against fetched HTML will find the mismatch, and trust is the whole game here.
5. **No RSS/Atom feed.** Perplexity heavily favors fresh content and feeds are a cheap freshness signal. We only have an .ics events file.

## 2. What the research says (July 2026)

- **AI crawlers do not run JavaScript.** Confirmed across GPTBot, ClaudeBot, PerplexityBot in 2026 measurements; Vercel's crawler study reached the same conclusion. Server-delivered HTML is mandatory, full stop.
- **llms.txt is barely read by search crawlers.** Across 500M monitored AI bot visits over 90 days (May 2026), 408 requests targeted llms.txt. No major AI company has committed to it. Where it does get used: agent tools (Claude Code, Cursor, Windsurf) fetch it routinely. Conclusion: keep it accurate and auto-generated, stop treating it as the main strategy.
- **ChatGPT cites mostly from Bing's index** (roughly 87% overlap with Bing top 10). Bing Webmaster Tools registration and IndexNow are direct levers on ChatGPT visibility.
- **Off-site mentions beat on-site optimization.** Third-party mentions in news and community platforms correlate about 3x more with AI visibility than owned content. Brands present on 4+ third-party platforms (Wikidata, Wikipedia, Reddit, directories) are about 2.8x more likely to be cited. Wikipedia alone feeds a large share of model training data.
- **Content shape matters.** Pages that get cited lead with a direct 40-60 word answer, use Q&A blocks, carry visible author and dates, include stats with sources, and use data tables. Structural fixes show up in Perplexity within days and in ChatGPT within weeks.

## 3. The design: five layers

### Layer 0: Truth and plumbing (days, all code)

- Fix the llms.txt line 170 claim. Regenerate llms.txt from the sitemap + route meta at build time so it never drifts again (extend `scripts/prerender-blog.mjs` or a sibling script).
- Refresh robots.txt: add `ClaudeBot`, `Applebot`, `Applebot-Extended`, `Meta-ExternalAgent`, `MistralAI-User`, `cohere-ai`; keep the existing allows. Policy decision (already implied by our current file): we welcome both training crawlers and search crawlers. We want to be in the training data. That stays.
- Add IndexNow: ping on blog publish and sitemap change (small server hook).
- Deduplicate the double llms-full.txt route registration (`server/_core/index.ts:471-474`, cosmetic).
- ~~Decide the prerender-node question: the middleware is wired but env-gated with a no-op hook (`server/_core/index.ts:116-136`).~~ **This reading was wrong, corrected 2026-08-01.** The middleware was not inert and the hook was not a no-op in the way that mattered: `PRERENDER_TOKEN` was set in Railway with a stale token, so prerender-node intercepted every crawler user agent and returned an empty 503. Full measurement in "Finding (2026-08-01)" below. The recommendation stood and is now done: middleware deleted, we own the rendering. Method note, since this bullet was written from the code path: a middleware's effect is measured by fetching as the affected user agent.

### Layer 1: Serve real HTML bodies (the big lever, 1-2 weeks)

No framework migration. No SSR rewrite. We extend two patterns we already ship:

**1a. Build-time prerender for stable routes.** `scripts/prerender-blog.mjs` already writes full-body static HTML per blog post. Generalize it into `scripts/prerender-pages.mjs` covering: home, `/fund`, `/game`, `/opportunity`, `/governance`, `/tokenomics`, `/bionomics`, `/glossary`, `/quest` + each quest, `/tools` + each tool, `/plays` + each play, `/team`, `/seasons`, `/apply`, `/investor`, `/land`, `/ally`, `/community` (index), legal pages, and the CORE (church) pages on core.regencivics.earth. Same technique as blog: full prose in `<noscript>` plus an off-screen `aria-hidden` block, page-appropriate JSON-LD, canonical. Content source: a per-route content module (markdown or TS) that both the React page and the prerenderer read, so copy lives in one place and cannot drift.

**1b. Request-time bot HTML for dynamic content.** For `/community/post/:id`, `/campaign/:id`, `/community/user/:id` (public profiles), and event pages, render a clean HTML document from the DB at request time, the same way `/embed/*` already does (`server/routes/embed.ts`). Two serving options, pick one at build: (a) serve the HTML version to all no-JS user agents via content negotiation, or (b) serve it at the canonical URL before the SPA fallback with a `<script>` that hydrates into the app for humans. Option (b) is simpler and has no cloaking risk: everyone gets the same HTML, browsers then boot the SPA.
- Add curated community posts to the sitemap: posts with a minimum reply count or a staff pick flag, so the "thin content" concern (`server/_core/index.ts` sitemap comment) is handled by a quality gate rather than blanket exclusion.
- Add `DiscussionForumPosting` JSON-LD to forum thread HTML, `Person` JSON-LD to public profiles, `Event` to events.

**1c. Glossary becomes a citation engine.** Definitional queries ("what is bioregional finance", "what is an ecovillage covenant") are the easiest citations to win. Give every glossary term its own prerendered URL (`/glossary/:term`) with a 40-60 word definition first, then depth, `DefinedTerm` JSON-LD, and links to the offering that embodies it. Expand the glossary to cover the whole domain vocabulary (Section 4 query map).

### Layer 2: Answer architecture (2-4 weeks, content + code)

Build a Learn hub (`/learn/:slug`) of answer-first pages aimed at the exact query space we want to own. Each page: direct answer in the first 60 words, Q&A section with FAQPage schema, visible author + published + updated dates, at least one data table or figure with a source, and a concrete next step into our offerings (apply to the incubator, join a quest, read the fund page).

Query map (first 20 pages, drawn from the "common queries" section already in llms.txt plus Rye's target space):

| Cluster | Example queries | Page |
|---|---|---|
| Land, no plan | "I have land and want to start a community", "what to do with 40 acres" | /learn/start-a-community-on-your-land |
| Ecovillages | "how to start an ecovillage", "ecovillage funding" | /learn/how-to-start-an-ecovillage |
| Intentional community | "intentional community legal structures", "how are intentional communities financed" | /learn/intentional-community-structures |
| Landscape regeneration | "large scale land regeneration", "how to fund watershed restoration" | /learn/fund-land-regeneration |
| New economics | "alternatives to extractive economics", "regenerative economic theory", "nine forms of capital" | /learn/regenerative-economics |
| New financial systems | "community currencies", "regenerative finance", "ReFi" | /learn/regenerative-finance |
| Eco-civilization | "what is eco-civilization", "bioregionalism explained" | /learn/bioregionalism |
| Governance | "community governance models", "sociocracy vs DAO" | /learn/community-governance-models |
| Our offerings | "regen civics incubator", "regen civics fund" | existing pages, tightened to answer-first |

Rules for these pages: written in Rye's voice per STEERING section 1, reviewed by a human, no AI filler (answer engines downweight it), each one links to 2-3 siblings and 1-2 offerings. Publish cadence beats bulk: 2 pages a week for 10 weeks outperforms 20 pages in one push, because Perplexity rewards freshness and we get a weekly IndexNow ping.

### Layer 3: Machine feeds (days)

- RSS/Atom feed for the blog and a curated community-highlights feed (`/feed.xml`, `/community/feed.xml`). Reference them in the HTML head and llms.txt.
- Auto-generate llms.txt sections (pages, blog, glossary, learn) from the same content modules as Layer 1, keeping the hand-written narrative top.
- Keep `/api/` disallowed for crawlers; the prerendered HTML is the crawl surface. The embed widgets (`/embed/*`) stay crawlable and get JSON-LD too, since they are already real HTML with live data.

### Layer 4: Entity and off-site (ongoing, highest citation impact)

This layer moves the needle more than anything on-site. Order of operations:

1. **Entity consistency first.** One canonical description of ReGen Civics (and the Church of the Regenerative Earth as its partner entity), same wording everywhere: site JSON-LD `sameAs` links, social profiles, directories. Add Rye as a `Person` entity linked to the org.
2. **Wikidata.** Create items for ReGen Civics and the Church of the Regenerative Earth with references (site, press, registry filings). Wikidata is the machine-readable entity home most models lean on. Cheap, high value.
3. **Directories and networks where our audience already looks:** Foundation for Intentional Community (ic.org), Global Ecovillage Network, ReFi ecosystem maps, permaculture and bioregional directories, Hypha ecosystem pages. Each listing carries the canonical description and a link.
4. **Community platforms.** Genuine participation where the target questions get asked: relevant subreddits, Quora, forums of GEN/FIC. Answer real questions, mention ReGen Civics only where it truly answers the question. LLMs cite these threads for "has anyone actually done this" validation.
5. **Earned mentions.** Podcast appearances, guest essays, and coverage in regenerative/ReFi publications. Third-party mentions correlate about 3x more with AI visibility than anything we publish ourselves. Fold this into existing fundraising outreach (regen-outreach-sequences skill) so one effort feeds both goals.
6. **Wikipedia only when notability is real.** Premature attempts get deleted and salt the ground. Earned coverage from step 5 comes first.

### Layer 5: Measurement loop (ongoing)

- **Query panel.** 25 target questions (from the Layer 2 map) run weekly through ChatGPT, Perplexity, Claude, and Gemini; log whether we are cited, who is cited instead, and what they said about us. This can run as a scheduled Cowork task with a standing report.
- **Crawler telemetry.** Log AI bot user agents server-side (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended hits per route) so we can see what they fetch and confirm the prerendered HTML is being read.
- **Webmaster consoles.** Bing Webmaster Tools (feeds ChatGPT) and Google Search Console (feeds Gemini/AI Overviews), plus IndexNow key verification.
- **Accuracy audit.** Quarterly: ask each engine "what is ReGen Civics" and correct drift at the source (site copy, llms.txt, Wikidata).

## 4. Priority order

1. Layer 0 (truth + robots + IndexNow): this week
2. Layer 1a prerender of the ~15 highest-value stable routes, starting with home, /fund, /glossary: next
3. Layer 5 query panel baseline BEFORE Layer 2 ships, so we can see movement
4. Layer 1b forum/campaign bot HTML + curated sitemap entries
5. Layer 2 Learn hub, 2 pages/week
6. Layer 3 feeds + llms.txt automation
7. Layer 4 entity work in parallel throughout (it is mostly Rye-time, not code-time)

## 5. Handoff Breakdown: Who Does What

### YOU (Rye): things only you can do

| # | Task | Why only you | Command / Where |
|---|---|---|---|
| R1 | Verify site in Bing Webmaster Tools + confirm GSC access | Browser login, account ownership | bing.com/webmasters (can import from GSC) |
| R2 | ~~Approve the forum indexing policy~~ RESOLVED 2026-07-15: ALL community posts are crawlable | Decision made by Rye | Done |
| R3 | Create Wikidata items for ReGen Civics + Church of the Regenerative Earth | Account + human editing norms | wikidata.org (Claude can draft the full item contents) |
| R4 | Submit directory listings (ic.org, GEN, ReFi maps) | Account signups, org representation | Claude drafts each listing text |
| R5 | Outreach: podcasts, guest essays, press | Relationships, your voice | Claude drafts via regen-outreach-sequences |
| R6 | ~~Remove PRERENDER_TOKEN from Railway~~ FULLY CLOSED 2026-08-03. Middleware deleted and dependency dropped 2026-08-01 (see the finding below), `PRERENDER_TOKEN` deleted from the ReGenCivics.Earth production service 2026-08-03, Prerender.io subscription cancelled by Rye the same day. Nothing reads it, nothing pays for it, and `.env.example` carries a do-not-re-add note. | Done | Done |
| R8 | **Google Search Console: check what the 503s cost us.** Googlebot was served empty 503s on every HTML page for weeks (see the finding below). Open Coverage / Pages, look for URLs that moved to "Crawled - not indexed", "Discovered - not indexed", or dropped out entirely during that window, then use URL Inspection to request re-indexing for the ones that matter (home, /fund, /apply, /learn/*, the blog). This is the single highest-value recovery action and it needs your account. | Browser login | search.google.com/search-console |
| R7 | ~~Approve the query-panel scheduled task~~ RESOLVED 2026-07-15: bi-weekly (1st and 15th), task created | Decision made by Rye | Done |

### CLAUDE CODE: already done or can be done without you

| # | Task | Status |
|---|---|---|
| C1 | Repo audit + this plan | DONE |
| C2 | Fix llms.txt false claim (+ llms-full.txt phantom URLs), refresh robots.txt bot list | CODED |
| C3 | IndexNow key file + ping util + createPost hook | CODED |
| C4 | Crawler content for stable routes (see execution note below: request-time injection, not a separate prerender script) | CODED (16 routes) |
| C5 | Full thread HTML + DiscussionForumPosting JSON-LD for /community/post/:id, all posts in sitemap | CODED |
| C6 | Glossary content + DefinedTermSet JSON-LD on /glossary | CODED (per-term URLs still open) |
| C7 | Blog RSS feed at /feed.xml + head link | CODED |
| C8 | llms.txt auto-generation | OPEN (blog section already auto-appends at build) |
| C9 | Learn hub template + first drafts for your review | CODED (6 pages shipped 2026-08-01, see execution note below) |
| C10 | AI crawler logging middleware (`[ai-crawler]` lines in Railway logs) | CODED |
| C11 | Bi-weekly query panel scheduled task (1st + 15th, 9am) | DONE |

### Execution note (2026-07-15)

Layer 1 shipped as request-time injection instead of a build-time prerender
script: `server/_core/crawler-content.ts` holds the page prose and the forum
thread renderer, and the production HTML handler in `server/_core/vite.ts`
injects the content (noscript + off-screen div + JSON-LD, the same pattern as
the blog prerender) before serving the shell. One mechanism covers static
routes and DB-driven content, nothing new at build time, and the blog
prerender path stays untouched. When live page copy changes substantially,
update the matching entry in `crawler-content.ts`.

### Finding (2026-08-01): every crawler was being served an empty 503

Verifying the Learn pages in production turned up the thing that had been
undermining all of Layer 0 and Layer 1. regencivics.earth was answering
crawlers with:

```
HTTP/1.1 503 Service Unavailable
Content-Length: 0
x-prerender-reject-reason: invalid-x-prerender-token-provided
```

while a Chrome user agent on the same URL got a normal 200. Measured against
`/fund` on 2026-08-01: GPTBot 503, PerplexityBot 503, Googlebot 503,
facebookexternalhit 503, Chrome 200.

`prerender-node` was mounted whenever `PRERENDER_TOKEN` was set, and it
intercepts by user agent ahead of all our own routing. The Railway token was
stale, so it rejected everything it grabbed. What that cost us:

- The crawler-visible HTML shipped 2026-07-15 was never reachable by the
  crawlers it was written for. Sixteen routes of prose, the forum threads,
  the JSON-LD: none of it could be fetched.
- Googlebot was served 503s, so this was an indexing problem as well as an
  answer-engine one.
- Social link previews were broken.
- **It explains the 2026-08-01 panel better than any content gap does.** The
  baseline was not measuring thin content. It was measuring a site that
  returned errors to the things doing the measuring.

Fixed by deleting the middleware rather than by unsetting the variable
(handoff item R6), so a leftover or re-added env var cannot put a third-party
interceptor back in front of every bot request. The dependency is dropped and
`.env.example` carries a do-not-re-add note where the variable used to be.

**Read the 2026-08-01 baseline with this in mind.** It is still the honest
"before" number, but it is a measurement of a broken serving path, not of the
content. The 2026-08-15 panel is the first one where on-site work and
measurement are in the same reality.

### Execution note (2026-08-01): Layer 2 first six pages

Priority came from the first measured panel (`AI_VISIBILITY_LOG.md`, 2026-08-01),
not from the query map above. The panel found 2 of 15 queries cited us, both of
which already contained the brand name. So the first six pages target the exact
queries that returned zero mention:

| Page | Query it answers | Who owned it on 2026-08-01 |
|---|---|---|
| `/learn/start-a-community-on-your-land` | "I have land and want to start a community, where do I begin" | Quora, permies.com, Shareable |
| `/learn/intentional-community-structures` | "intentional community funding options" | icmatch.org (near-total) |
| `/learn/how-to-start-an-ecovillage` | "how to start an ecovillage" | ic.org, The Momentum |
| `/learn/community-governance-models` | "community governance models for land projects" | Springer, Tandfonline |
| `/learn/crowd-pooling` | "crowd pooling community investment land" | generic real-estate crowdfunding |
| `/learn/nine-forms-of-capital` | "nine forms of capital regenerative" | nobody. Engines corrected it to eight forms |

Architecture: content is data in `shared/learnContent.ts` plus one file per
article under `shared/learn/`. Three consumers read the same objects, so copy
cannot drift: the React page (`client/src/pages/LearnArticle.tsx`), the
crawler-visible HTML (`server/_core/crawler-content.ts`), and the Article +
FAQPage + BreadcrumbList JSON-LD. `shared/learnContent.test.ts` enforces the
citation shape (40 to 60 word answer, sourced tables, author, dates, FAQs,
next step, resolvable siblings, no em-dashes), so page 7 cannot ship malformed.

The shell's site-wide FAQPage in `client/index.html` is now scoped to the
homepage with `@id` + `url`. It appears on every route, so an unscoped second
FAQPage would have competed with each article's own.

### Still open (next sprints)

- C8 llms.txt full auto-generation, C9 Learn hub pages 7+ (2 pages/week from the query map in section 4), glossary per-term URLs, public-profile crawler HTML, Atom feed for community highlights
- Layer 4 entity work (R3, R4, R5) and webmaster consoles (R1) are Rye-side and can start any time

---

Sources for the research claims: SearchOptimo and Lantern on AI crawlers not rendering JS; Rankability and aeo.press on llms.txt adoption (8-10%) and near-zero crawler fetches; LLMrefs and Frase on answer-first structure and the Bing-ChatGPT overlap; Digital Bloom 2025 AI Visibility Report and AirOps on third-party mention correlation and the 4+ platform effect.

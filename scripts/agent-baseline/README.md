# Agent baseline harness

Phase -2 of the agent-surface build slice. Measures what agents see and say
about ReGen Civics, so every later phase has a control to be compared against.

Re-run after phases 2, 3 and 6 and diff the report against the first one.

## Running it

```bash
node scripts/agent-baseline/run.mjs                          # site half only, free
OPENROUTER_API_KEY=... node scripts/agent-baseline/run.mjs   # both halves
node scripts/agent-baseline/run.mjs http://localhost:5000    # against a local server
```

Output lands in `docs/agent-baseline/`:

| File | What it is |
|---|---|
| `BASELINE-<date>.md` | The report. Generated; edits are overwritten on re-run. |
| `crawl-<date>.json` | Raw per-route data from the site half. |
| `ask-<date>.json` | Raw per-answer data from the LLM half. |
| `control-<date>.md` | Rye's verbatim answers from Muse, Gemini and ChatGPT. Hand-written. |
| `FINDINGS-<date>.md` | What the numbers mean and what they change. Hand-written. |

## The two halves

Split per STEERING section 11. The deterministic half costs nothing and is the
one re-run every phase. The LLM half spends tokens and runs a handful of times.

**`crawl.mjs`** fetches every public url with a plain HTTP GET, no browser and
no JavaScript, and records what comes back: title, description, canonical, og
tags, JSON-LD, and how many characters of prose an agent actually reads. The url
list is the `<Route path>` table read from `client/src/App.tsx` plus every url
in the live `/sitemap.xml`, minus the paths our own `robots.txt` disallows.
Reading the route table from source is what stops the harness going stale when
routes are added.

**`ask.mjs`** asks four questions, one per funnel, of several models through
OpenRouter with web search on, in two arms:

- **cold**: unscoped. The control. Whether an agent finds us at all, what it
  recommends instead, which competitors it cites.
- **sited**: search pushed at regencivics.earth. Whether an agent that does read
  our site can answer correctly.

The spec asked only for the scoped arm. Scoping alone forces the mention and
answers none of the questions the spec then says to record, so both arms run.

Scoring is split the same way: mention, url return and date presence are regex
and never drift; accuracy and invention go to a judge model.

## Things that will trip you up

- **`OPENROUTER_API_KEY` is not in the local `.env`.** It lives in Railway. The
  LLM half exits 2 with a message rather than failing the run; the site half
  still produces its report.
- **Crawler content is not user-agent gated.** `server/_core/crawler-content.ts`
  injects prose for every visitor, and the `AI_CRAWLER_RE` in
  `server/_core/index.ts` is telemetry only. Sending a GPTBot string gets you
  the same HTML. Do not add one expecting different content.
- **One JSON-LD type is on every route.** `FAQPage` is a boilerplate block in
  the HTML shell. The report separates it from page-specific structured data,
  because counting it reports near-total coverage for a site where most routes
  describe nothing.
- **The SPA 200s everything.** A missing `/agents.md` returns the HTML shell,
  not a 404. `probeFile` treats an HTML body on a non-HTML path as absent.
- **Self-contained on purpose.** Node builtins only, no repo imports: the repo
  `package.json` trips node's package self-resolution. Same constraint as
  `scripts/audit-links.mjs`.

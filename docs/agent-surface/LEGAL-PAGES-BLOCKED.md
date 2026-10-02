# The legal pages describe an offering the project retired

2026-09-28. Found while making the four legal routes readable to agents.
Blocked, and it needs Rye and counsel rather than an engineering fix.

## What happened

`/privacy-policy`, `/terms-of-use`, `/risk-disclosure` and `/disclaimers` are
blank to any agent that does not run JavaScript, like the rest of the site was.
Phase 9 needs a real privacy policy url, because both the ChatGPT and Muse
submission packets require one and a reviewer fetching ours gets an empty
shell.

So the four pages were extracted verbatim (`scripts/extract-legal-content.mjs`,
31 KB of real policy text) and wired into the crawler. **That failed the
fund-claims guard**, and the guard is right.

## What the pages actually say

Scanned by `scripts/check-fund-claims.mjs`:

| Phrase in the legal pages | Why the guard bans it |
|---|---|
| `Regulation D` | A retired claim: "a Regulation D exemption nobody has chosen" |
| `ReGen Civics Fund` | Retired 2026-09-27; it is now a cooperative in design |
| `accredited investor`, `Accredited Investors` | Accredited-investor gates, G5 |
| `Private Placement` | Fund terms, G5 |
| `preferred return`, `Projected returns`, `return of capital` | Promises or prices upside, G5 |
| `token listing`, `secondary market` | Exchange listings and secondary markets, G5 |

These are not stray words. The disclaimers page describes, in detail, a
Regulation D private placement to accredited investors with a PPM, a 90%
supermajority governance structure, preferred returns and secondary markets.

## Why this matters more than a failing check

On **2026-09-27** the fund became a cooperative in design. `shared/fund.ts`
records that `COOP.status` is `"design"`, that it is not a legal entity and
accepts no money, and that no surface may use the present tense about its
members, holdings, land, votes or terms.

The guard's own header gives the reason, and it is a legal one rather than an
editorial one:

> A purchasing cooperative keeps its "bought for use" footing only while
> nothing in the funnel promises upside (United Housing Foundation v. Forman,
> 1975).

`/loi` already says plainly: "Nothing on this site is an offer to sell, or a
request to buy, securities, memberships or any other financial product. The
cooperative is not formed and accepts no money."

**The legal pages contradict that**, and they are the pages a reader treats as
authoritative when the marketing copy and the legal copy disagree.

## Why it was nearly published to agents

Everything else in this work was made legible to agents precisely so that
assistants would quote it. Publishing these four would have put the retired
securities story in the most quotable place on the site, cited as policy, on
the day after the project retired it. A directory reviewer checking our privacy
policy would have read it too.

The blank page was, accidentally, the safer state. That is not a reason to
leave it blank.

## What is ready, and what is needed

**Ready.** `scripts/extract-legal-content.mjs` extracts all four pages verbatim
and is drift-gated: it regenerates and compares, so a policy edit that is not
regenerated fails rather than silently serving stale text. It is committed and
unused. The moment the pages are rewritten, wiring them up is one import and
one line in `resolveCrawlerContent`.

**Needed, and not by an engineer.** The four pages rewritten to describe the
cooperative in design rather than a Regulation D offering. That is Rye plus
counsel. `shared/fund.ts` is the source of truth the rewrite should read from,
the same way `/loi` and `/fund` already do.

## The narrower question, if a full rewrite waits

The privacy policy is the one phase 9 actually blocks on, and it is the least
entangled of the four: its problem is a single sentence about "investment
opportunities" and an accredited-investor paragraph, rather than a whole
document about a placement. It could be corrected on its own and published
while the other three wait.

Everything else in P0 is unaffected. Twenty other routes went out.

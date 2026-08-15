# Crowdpooling Design Coach Spec

**Date:** 2026-07-17
**Status:** BUILT. Ships with the coach wave.
**Companions:** `CROWDPOOLING_PLATFORM_SPEC.md`, `CROWDPOOLING_OVERVIEW.md`, `CROWDPOOLING_MASTER_PLAN.md`.

The coach makes campaign design easy, teaches the crowdfunding and 8-forms-of-capital research one step at a time, and encourages well-rounded projects without ever forcing them. Two layers: a deterministic core that runs instantly and free, and an AI Design Companion that enriches it.

## New decisions folded in

| Decision | How it shows up |
|---|---|
| Full suggestions plus open custom entry, with valuation help | The wizard offers templates for every capital and lets people name their own role or need; a "suggest a fair value" helper gives a defensible band for anything, custom included. |
| Ma Earth and GoSteward are recommendations, not partners | All copy says "recommended funders." Links live now (maearth.com, gosteward.com/borrow). We take no cut, hold no money. |
| Encourage all 9 forms of capital | A live Capital Balance meter shows what is covered; the coach recommends how to fill gaps based on what a project already has, and always allows "not applicable to us." |
| AI coaching, as deterministic as possible | Deterministic core does coverage, gaps, and valuation. The AI companion personalizes and teaches, grounded in that core, and degrades to the deterministic layer when off. |

## Architecture

**Deterministic core, `shared/crowdpoolCoach.ts`** (pure, shared by client and server, no LLM):
- `analyzeCoverage(needs)` returns per-capital coverage across all nine forms with a strength of none, thin, or solid, plus a roundedness score.
- `recommendGaps(coverage)` suggests capitals to consider, missing first then thin, each with a couple of concrete roles from the taxonomy and a reason grounded in what the project already covers. Every recommendation is declinable.
- `valuationForRole`, `valuationForLand`, `valuationBandForValue` return fair-market bands anchored to regional rate data. The band is a mid figure plus or minus a quarter, with a plain-language note. Custom-named needs still get a band.
- `STEP_TIPS` gives one research-backed teaching line per wizard step.

This layer runs in the browser with zero network calls, so the coach works instantly, free, and offline. It is the floor the feature never drops below.

**AI Design Companion, `server/lib/crowdpool-coach.ts` + `campaigns.designCompanion`**:
- A warm, grounded coaching agent that reads the current draft and converses. It is fed the deterministic coverage and gap analysis as context, so its advice targets real gaps and cites real valuation bands.
- Returns prose coaching plus structured need-drafts the builder accepts with one click. It never writes to the campaign itself; the human commits every add.
- Guarded like the existing form companion: user text sanitized and treated as data not instructions, output re-validated (invalid capitals or kinds dropped, values clamped, role values backfilled from the deterministic valuer), rate limited, and the global LLM cost breaker enforced. On any AI failure or budget exhaustion it returns a deterministic fallback built from `recommendGaps`, so the panel still helps.

## Wizard experience

- **Capital Balance meter** sits in the sticky totals tracker, visible on every step, filling as needs are added. Nine segments, one per capital, solid when covered well, outline when thin, muted when empty. Header reads "N of 9 forms covered."
- **One teaching tip per step**, drawn from the research: spread your ask sizes, name the specific thing, list the tool you can lend, and so on. Progressive disclosure, not an onboarding wall.
- **Suggest a fair value** on custom entries: name your own role or need, get a defensible band and a one-click "use this figure," with the manual input always available.
- **Design coach panel** opens at any step. It greets with an opening read of the draft, suggests where to start, answers questions, and offers need-drafts as add-to-campaign cards. If cultural is thin it might suggest a dance coordinator or storyteller, but only if it fits the project, and always with a way to decline.
- **Never a gate.** The coach encourages a well-rounded campaign; it never blocks submission. An honest four-capital project ships as readily as a nine.

## Why this shape

The research is blunt about the failure mode: platforms that push people to fill a checklist end up with needs nobody actually stewards, which poisons the registry and burns contributor trust. So the coach recommends breadth and teaches why it helps, but treats every capital as optional and instructs the AI to suggest only what genuinely fits. Quantify what can be quantified (hours, materials, land), narrate what cannot (the social, cultural, and spiritual threads), and let the builder stay the author of their own campaign.

## Files

- `shared/crowdpoolCoach.ts` (new) deterministic core.
- `server/lib/crowdpool-coach.ts` (new) AI companion engine with deterministic fallback.
- `server/routes/campaigns.ts` `designCompanion` procedure (rate limited).
- `client/src/components/crowdpool/CapitalBalanceMeter.tsx`, `TeachingTip.tsx`, `DesignCompanion.tsx` (new).
- `client/src/pages/CreateCampaign.tsx` mounts the meter, tips, valuation helpers, and coach panel.
- Tests: `server/crowdpool-coach.test.ts`, coverage/valuation units.

# Crowdpooling: the plan

**This is the file to read first.** It supersedes the "what to build" sections of
`CROWDPOOLING_GAP_ANALYSIS_2026-09-04.md` and the earlier money build plan, and it is
the single place the current state lives.

**Last updated:** 2026-09-05

---

## 1. What ReGen Civics is, as of 2026-09-05

**ReGen Civics is a cooperative.** Not a fund. A global, in-real-life game in which
members build ecovillages together by pooling everything they have: time, money,
equipment, land, knowledge, networks and roles. Members govern democratically. Money is
one resource among many and usually the smaller part, typically ten to twenty per cent
of what a project needs.

This framing was settled on 2026-09-05 and it changes the whole legal analysis.
Everything researched before that date analysed a fund trying not to look like a fund,
which was the wrong question.

**Two vehicles, kept apart.**

| | The cooperative | The fund |
|---|---|---|
| Name | ReGen Civics | "ReGen Civics Fund" or another name, to be settled |
| Who | Members, worldwide, who contribute and participate | Accredited investors |
| What happens | Crowdpooling: money and in-kind, routed by members | Financial exposure, no crowdpooling |
| Today | Being built, accepts nothing yet | LOI pledges only, on `/opportunity` |

**Home jurisdiction: Switzerland.** That is why the Swiss franc is the unit of account.
A legal plan built around a Swiss cooperative is in progress; see section 8.

---

## 2. The mechanic

Full human explanation: `docs/CROWDPOOL_MODEL.md`. Machine-readable:
`shared/crowdpoolModel.ts`. Both are current. The short version:

1. Thirteen land projects run campaigns at the end of a season. Each needs money and
   roles, equipment, time, land, networks. **A campaign succeeds only if both halves
   land.**
2. In-kind contributions go to ONE project. Money goes to ReGen Civics, never to a
   project.
3. A member contributing 100,000 CHF receives **100,000 $RCivics** and an equal amount
   of **RCVoice**, the governance token, so contributing makes you a participant rather
   than a passive investor.
4. They **route** 90% of it (configurable 50 to 90) across the projects they choose.
   Routing is non-binding signalling, movable until a campaign closes, never
   transferable or sellable.
5. The remaining 10% goes to a **community treasury**, which is **held**, not spent.
   Drawdown for roles and running costs is a governance decision.
6. Projects that receive routed money return an equal value of their own tokens, plus a
   minimum **10% non-dilutive stake** to take part at all, only after the community has
   said the project is worth funding.
7. $RCivics is issued **at contribution** as a restricted on-platform balance: visible,
   not spendable, not tradable, removable on refund. Real tokens are claimed on Base
   through Hypha **only once campaigns close and refunds are no longer possible**.
8. A campaign that misses its window gives the member three choices, with a **seven day
   window** and silence defaulting to the core team choosing. That default has its own
   consent checkbox.

---

## 3. Decision log

Every ruling, with its date, so nothing has to be reconstructed from a conversation.

| Date | Ruling |
|---|---|
| 2026-09-04 | Money goes to ReGen Civics, never to a project. Contributor gets a share of all thirteen. |
| 2026-09-04 | Routing is non-binding and movable until a project closes. |
| 2026-09-04 | A project that does not complete its crowdpool in nine months does not join that season. |
| 2026-09-04 | The stake's backing instrument varies per project: recorded agreement, on-chain via Hypha, or LLP equity. Never assume a token. |
| 2026-09-05 | **Locked decision #1 NARROWED, not deleted.** The ban on crediting the four platform tokens for a PLEDGE stands. A separate instrument records contributions. |
| 2026-09-05 | **Founder ruling R92's hard block REMOVED**, its default kept: no treasury and no cap unless a project opts in. |
| 2026-09-05 | Routing share is 90%, configurable 50 to 90, season-scoped. |
| 2026-09-05 | The 10% goes to the community treasury and is **held**, drawn down by governance. |
| 2026-09-05 | The due-diligence fee is deferred. Refunds are always **gross**; a fee can only ever be taken on release. Its number comes off `/opportunity`. |
| 2026-09-05 | Missed window: reroute, refund, or core team chooses. Seven days, silence defaults to core team, separate consent checkbox. |
| 2026-09-05 | $RCivics pegged **one token per Swiss franc** until a market prices it. |
| 2026-09-05 | $RCivics issued at contribution, restricted; claimed to Base only after close. |
| 2026-09-05 | Routing signals **cannot be transferred or sold**. |
| 2026-09-05 | "Earmark" retired in favour of "routing", across copy, schema and docs. |
| 2026-09-05 | All currency-like integers carry **two decimals**. |
| 2026-09-05 | **ReGen Civics is a COOPERATIVE**, Swiss, with a separate accredited-investor fund alongside. |
| 2026-09-05 | Accredited investors are routed to `/opportunity` to pledge LOIs. |
| 2026-09-05 | **Every rail is switchable.** Build the machinery with per-rail on/off so what is legal can be turned on as counsel clears it. |

---

## 4. What is shipped

| What | Commit |
|---|---|
| Share button readable: solid deep forest, 10.61:1, verified on production | `ab9ffe3` |
| Partner funders conditional; no account, no panel, no funder quiz | `ab9ffe3` |
| Adversarial QA suite, 22 tests, against a scratch database | `ab9ffe3` |
| The pledged total stops shrinking when a pledge is delivered | `b835c28` |
| Cash pledges stop being double-counted across four surfaces | `b835c28` |
| Expired claims stop counting as pledged | `b835c28` |
| A claim can no longer sweep a restricted balance to Base | `3c0a579` |
| The model, human and machine readable | `750512d`, `3ae3d67` |
| Own legal due diligence, seven dimensions | `4751def` |

---

## 5. What is being built right now

**Everything here is rails, not doors.** Nothing accepts money. The Fund is not a legal
entity and the cooperative is not yet formed, so neither can receive anyone's money.

1. **The DECIMAL sweep.** Every currency-like column moves to `DECIMAL(18,2)`. See
   section 6 for why the method matters more than the change.
2. **Compliance fields at contribution time.** Jurisdiction, residency attestation,
   accreditation status and its evidence reference, affiliate flag, and the version of
   the disclosure the member actually saw. Near-free now, expensive to retrofit, and
   correct under every structure being considered.
3. **Per-rail switches.** Rye's ruling: build the rails so each can be turned on or off
   as counsel clears it. Every money-touching path is gated on a named switch, default
   OFF, enforced at the route rather than hidden in the UI.

---

## 6. The DECIMAL sweep, and the trap in it

**Measured 2026-09-05: 34 money-ish `int` columns, and 409 read or write sites for just
four of the field names.** This is the change that cost the sibling repo a week and
shipped it a wallet reading 1000 times too large.

**There are two ways to add two decimals and one of them is the trap.**

*Minor units*, storing rappen as an integer, means every one of those sites that hands
over a human number is silently wrong by a hundred. That is exactly how the sibling repo
broke: of its ledger function's 44 callers, 5 converted and 39 did not, and they were
all correct only because the scale was zero.

*`DECIMAL(18,2)`* means a human number IS the stored number, with no conversion layer to
get wrong. **This is the chosen method.**

The one real hazard with DECIMAL is that `mysql2` returns it as a STRING by default, so
`a + b` silently becomes string concatenation. The connection therefore sets
`decimalNumbers: true` so values come back as JS numbers, and a test asserts it. At two
decimal places, JS number precision is not a concern until roughly ninety trillion.

---

## 7. Known defects, still outstanding

From the adversarial pass. All measured, all reproducing, none fixed yet. Full evidence
in `CROWDPOOLING_GAP_ANALYSIS_2026-09-04.md`.

| Defect | Measured |
|---|---|
| The slot guard checks a counter that only moves on acceptance | six claimants given a one-slot need |
| The Claim button greys out on the same counter, so it invites the overclaim | member-visible |
| The fulfil payoff is not idempotent, and its comment says it is | 20 Living Tree rows and 20 score events for 10 pledges |
| Money inputs are unbounded: no `.int()`, no max, `financialAmount` has no min | a negative pledge drives `pledgedFinancial` negative |

---

## 8. What is blocked, and on what

**No pooling machinery is built until the legal shape is settled.** Rye's ruling of
2026-09-05: build the rails, talk out the shape first.

In progress: a legal lane reworking the plan for a **Swiss cooperative** running a global
ecovillage-building game, with the accredited fund alongside. Seven dimensions: the
Genossenschaft form itself, whether it is a collective investment scheme under CISA,
token issuance under the DLT Act, cross-border reach over members worldwide, member
labour under Swiss employment and social insurance law, tax, and how the two vehicles sit
side by side without becoming one arrangement.

Earlier US-framed research is in `docs/legal/`. Read it knowing it analysed a fund. Its
findings that survive the reframe are that labels do not change what an instrument is,
that governance rights alone probably do not defeat the "efforts of others" prong, and
that the 2025-26 US crypto statutes do not help because both new regimes exclude
instruments carrying equity.

---

## 9. Open questions

1. **One member one vote, or one franc one vote?** Rye's design gives RCVoice in
   proportion to money contributed. Swiss cooperatives default to one member one vote,
   and capital-weighted governance is one of the things that makes a body look like an
   investment vehicle rather than a membership. This is the single most important open
   question for the cooperative framing, and nothing is built, so it is still free.
2. **RCVoice is not deployed.** It is the only one of the four tokens with no contract on
   Base. The governance token this design rests on does not exist on-chain yet.
3. **Does the required-participation condition hold?** Rye intends every money
   contributor to also give time, equipment or a role. That is the thing that most
   distinguishes a cooperative from a fund, so it needs to be a real, enforced condition
   rather than an aspiration.
4. **Where do the 10% project stakes sit**, in the cooperative or in the fund?

---

## 10. Where everything lives

| File | What |
|---|---|
| `CROWDPOOL_PLAN.md` | this file, the current state |
| `docs/CROWDPOOL_MODEL.md` | the mechanic, for people |
| `shared/crowdpoolModel.ts` | the mechanic, for code |
| `docs/CROWDPOOL_HUB_CONTRACT.md` | the contract village-os reads |
| `CROWDPOOLING_GAP_ANALYSIS_2026-09-04.md` | what was built vs the mechanic, with evidence |
| `docs/legal/` | own due diligence, US-framed, superseded in framing |
| `server/crowdpool-adversarial.test.ts` | the adversarial suite |
| `server/crowdpool-restricted-claim.test.ts` | the restricted-balance guard |
| `CROWDPOOLING_PLATFORM_SPEC.md` | the July 2026 spec, needs its decision #1 amendment |

**Testing:** point every suite at a scratch database, never `.env`, which is Railway
production. Setup is in the session memory under "regen-civics scratch database".

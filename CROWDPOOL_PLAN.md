# Crowdpooling: the plan

**This is the file to read first.** It supersedes the "what to build" sections of
`CROWDPOOLING_GAP_ANALYSIS_2026-09-04.md` and the earlier money build plan, and it is
the single place the current state lives.

**Last updated:** 2026-09-14

---

## 1. What ReGen Civics is, as of 2026-09-14

**ReGen Civics is a cooperative, and the cooperative is the fund.** A global, in-real-life
game in which members build ecovillages together by pooling everything they have: time,
money, equipment, land, knowledge, networks and roles. Members govern one seat, one vote.
Money is one resource among many and usually the smaller part. Campaigns are encouraged
to ask for 10 to 30 per cent money, and 0 per cent is allowed (ruled 2026-09-24).

**Home jurisdiction: Liechtenstein.** Ruled 2026-09-14. Liechtenstein uses the Swiss
franc, so the unit of account does not change. Swiss analysis stops; what carries over
is kept in `legal-research/`.

**Three channels into every campaign, all counted on the campaign page.**

| Channel | Who | Where the money goes | What you get |
|---|---|---|---|
| The fund | Anyone contributing **CHF 250,000 or more** through a campaign | The cooperative, held by a licensed custodian until close | Membership: one seat, one vote, $RCivics one per franc, routing |
| The partner platform | Anyone contributing less than the minimum | A crowdfunding platform we partner with and do not run. Recommended: straight to the project, on the platform's terms. Not yet ruled. | Whatever the platform offers. No fund tokens. A voice through the crowd circle |
| In kind | Everyone | One project, through the needs registry | That campaign's own tokens (form open). Never RGVoice or $ReGen, never $RCivics. Whether it counts toward crowd seats is open |
| Money loans | Lenders | The project, to meet its money ask up front (who borrows and through what is open) | Interest. No tokens of any kind |

The minimum is the price of a direct seat. Below it the voice is collective: the **crowd
circle**, one person one vote, elects delegates to the assembly, one seat for every
CHF 250,000 the crowd has contributed together. A thousand people who pool CHF 250,000
hold the same seat one person does. Nobody with a stake is voiceless, and nobody holds a
disproportionate one.

**The accredited path.** Recommended, not yet ruled: `/opportunity` and its LOIs become
the front door to the same fund channel rather than a second vehicle. The "two vehicles,
kept apart" table of 2026-09-05 is superseded by this section.

**Two legal persons, recommended, not yet ruled.** The 2026-09-14 research found that a
fund registered with the FMA needs an exclusive investment purpose, so the platform, the
needs registry and the Game side would have to live in a separate entity from the fund
cooperative. The cooperative is still the fund; the Game is not inside it. The route the
research recommends is registration as an internally managed **EuSEF**, which is built
for a member who commits EUR 100,000 or more. Section 8 and `legal-research/` carry it.

---

## 2. The mechanic

Full human explanation: `docs/CROWDPOOL_MODEL.md`. Machine-readable:
`shared/crowdpoolModel.ts`. Both are current. The short version:

1. Thirteen land projects run campaigns at the end of a season. Each needs money and
   roles, equipment, time, land, networks. **A campaign succeeds only if both halves
   land.**
2. In-kind contributions go to ONE project. Money at or above the fund minimum goes to
   ReGen Civics, never to a project. Money below the minimum goes to the partner
   platform and never enters the fund (section 1).
3. A member contributing **CHF 250,000** receives **250,000 $RCivics** and **one seat**
   in the fund, recorded as RCVoice. Every seat has one vote whatever was contributed,
   so contributing makes you a member rather than a passive investor.
4. They **route** 80% of it by default (configurable 50 to 90, ruled 2026-09-24) across the projects they choose.
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
9. Below the minimum, the **crowd circle**: one person one vote inside it, delegates to
   the assembly, one delegate seat per CHF 250,000 the crowd contributed together. A
   delegate's vote counts the same as any seat, and no member holds more than one seat.

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
| 2026-09-14 | **Fund governance is one seat, one vote.** Seats: every land project organisation, every investor with at least CHF 250,000 in, every steward on the operational council. The assembly decides overall governance and disbursements. The operational council executes, empowered within its roles. Replaces the 2026-09-05 ruling to support both weightings. |
| 2026-09-14 | The investor seat threshold is **CHF 250,000**. |
| 2026-09-14 | Land projects vote on the disbursement **slate as a whole**, never on a single award. |
| 2026-09-14 | Crowdpool contributors take part in the fund and can receive from it. Their voice below CHF 250,000 was left open for a few hours; superseded by the fund minimum below. |
| 2026-09-14 | **Home jurisdiction is Liechtenstein.** Swiss analysis stops. The franc stays. |
| 2026-09-14 | **Fund minimum CHF 250,000.** Every financial contribution through a campaign is at least the minimum, and each one earns exactly one seat. The number is a setting, `crowdpool.fund_minimum_chf`; the shape is not. |
| 2026-09-14 | **Below the minimum goes to a partner crowdfunding platform** we do not operate. Its total is still counted on the campaign page. Who receives that money is open; recommended: the project directly. |
| 2026-09-14 | "Money goes to ReGen Civics, never to a project" (2026-09-04) now applies to the fund channel only. |
| 2026-09-14 | **The crowd circle is in.** Everyone who contributes below the minimum has a voice through a crowd circle: one person one vote inside it, and it elects delegates to the assembly, one delegate seat per CHF 250,000 the crowd has contributed together. A delegate holds one vote, like every seat. Rye's principle: everyone has a voice relative to their contribution, the fund is infrastructure for the whole network, and no single person or small group holds disproportionate value. |
| 2026-09-24 | **Money share is a soft default.** Campaigns are encouraged to ask for 10 to 30% money; 0% is allowed. Nothing blocks a number outside the band. Replaces "typically ten to twenty per cent". |
| 2026-09-24 | **Crowdpool contributions earn no RGVoice and no $ReGen.** Replaces the 2026-09-14 table row that gave in-kind "the Game side: RGVoice and $ReGen". |
| 2026-09-24 | **In-kind earns that campaign's own tokens.** What the token is, what it carries, who issues it and when are open. |
| 2026-09-24 | **Only money earns $RCivics**, including inside a mixed proposal. |
| 2026-09-24 | **One proposal may mix money, equipment and committed time to reach the minimum** (Rye's example: CHF 100,000 money, CHF 75,000 equipment, CHF 75,000 of time over two years). Whether the minimum is set per campaign, what counts and how it is valued are open. The 2026-09-14 rows on the fund minimum stand for money-only contributions until those are answered. |
| 2026-09-24 | **Money loans can meet a campaign's money ask.** Loan money is value the project receives up front. Lenders earn interest, not tokens. Who borrows, who lends and on what terms are open. |
| 2026-09-24 | **The in-kind half has landed when confirmed value reaches 100% of the in-kind ask** by close; delivery is tracked afterwards. Narrows locked decision 4 of 2026-07-17 for the close test only. Who confirms is open. |
| 2026-09-24 | The pledge simulator keeps "Fill a need" with a real Apply, Offer or Sign up button; "Offer time" goes. |
| 2026-09-24 | The open questions these answers raise (89 for Rye, 15 for counsel) are listed with options and recommendations in `legal-research/Crowdpool_questions_2026-09-24.md`, kept out of git beside the legal research. |
| 2026-09-24 | **Rye accepted the recommendations on those questions, with these exceptions**, recorded in the rows below. Still open after this round: M6 (whether several commitments add up to a project's minimum) and T2a (a new token per campaign, or one per project), plus eight follow-ups raised the same day. |
| 2026-09-24 | **Two minimums.** A minimum to invest money in the fund, and a total capital minimum each project sets, which can be met with a mix of money and other capital. (S1) |
| 2026-09-24 | **A crowdpooling seat lasts as long as the commitment**, and its tokens are earned as the commitment is delivered: 100k at 10k a week earns week by week, and leaving early means leaving with less. (S7) |
| 2026-09-24 | **Investors can invest in the fund directly** and let the fund stewards direct the money to land projects. (S8) |
| 2026-09-24 | **Networks and knowledge count toward a minimum**, shown with a warning that there is no clear way yet to account for them and it varies project to project. (M22) |
| 2026-09-24 | **Tokens for committed work are paid on the project's own schedule**, typically weekly or monthly, as the work is delivered. (M10) |
| 2026-09-24 | **All seats start together at the start of the next season, the build season**, once the campaign runner has set that date and closed the campaign as complete. (M11) |
| 2026-09-24 | **Campaign stewards admit members.** (M12) Counsel is asked whether the cooperative's statutes can give admission to people who are not one of its organs. |
| 2026-09-24 | **Money a member routes to a project counts toward that project's money ask and toward the member's contribution to it.** Exposure to every project, with the routed amount counting where it was routed. (M19) |
| 2026-09-24 | **Routing share 50 to 90%, default 80%.** Replaces the 90% default of 2026-09-05. `drizzle/0253_routing_default_80.sql`. (R1a) |
| 2026-09-24 | **Campaign tokens are recorded on the site and claimed through the existing Hypha bridge.** (T2b) |
| 2026-09-24 | **Tokens are contribution accounting.** The network tracks what was pooled; each project designs its token beyond that. Pages say plainly that the platform's tokens track the pooling of contributions and make no claim about their value or purpose. (T13) |
| 2026-09-24 | **$RCivics also tracks equity swaps with alliance partners and land projects, and bounties and roles.** In crowdpooling itself, only money earns $RCivics; in-kind earns the project's token. (T11) |
| 2026-09-24 | **Contributions are confirmed by each project's own core team.** ReGen Civics facilitates and makes open-source tools; it decides nothing for a project. (C1) |
| 2026-09-24 | **A campaign token is normally the same token as the project's main token in village-os**, because it plays the same role of tracking contributions. In village-os that is the `equity` token, which lives on Hypha on Base. To be confirmed with Rye and the village-os economics session before anything is built on it. (B7) |
| 2026-09-24 | **Built the same day:** the public project page with its campaign tools (`/project/:key`), role capacity in hours per week (hub contract version 3), campaign notices through the notification spine, cancelling with notices to everyone involved, campaign lists as admin Outbound audiences, practice receipts on example campaigns, and the security holes in campaign create and publish closed. The role conversion migration (`drizzle/after-deploy/0251`) waits until village-os shows hours on its role meters. |
| 2026-09-24 | **Third round.** Rye accepted the remaining suggestions except the rows marked as his own words below. |
| 2026-09-24 | **Commitments add up until the campaign closes** toward a project's minimum. The fund's money floor is checked on each money commitment separately. (M6) |
| 2026-09-24 | **One token per project**, reused by each of its campaigns; the site records which campaign each amount came from. (T2a) |
| 2026-09-24 | **Reaching a project's capital minimum gives a seat at that project's own governance table.** It is not a fund seat. **The fund itself is governed by individual representatives from land projects and organisations, and by the fund's investors.** (Rye's words.) |
| 2026-09-24 | **Money inside a project commitment that is below the fund minimum** goes through the project's own route, counts toward the project's minimum, and earns no $RCivics. **A contributor who reaches the fund minimum receives $RCivics instead of the project's tokens: those project tokens go to ReGen Civics.** (Rye's words for the second half.) |
| 2026-09-24 | **Money routed to a project**: the fund holds that project's tokens, and the routed amount counts toward the member's standing with the project, so no franc is counted twice. |
| 2026-09-24 | **The ReGen Civics Year wheel sets the default calendar** (seats start when the Build Season opens), **and each project may set its own calendar cycle.** (Rye's words.) |
| 2026-09-24 | **People who invest directly in the fund are admitted by those who govern the fund: representatives from land projects and organisations**, which Season 2 forms with the first land projects through the accelerator. (Rye's words.) |
| 2026-09-24 | **The fund is managed by all the people it affects, as a cooperative should be.** (Rye's words.) This replaces the suggestion that the operational council manages it. Counsel is asked how that fits the fund-manager registration, which needs named managing persons, and it bears on the research finding that control shared by all members is the one route out of fund status. |
| 2026-09-24 | **$RCivics earned from swaps, bounties and roles is the same token with the same claim** as $RCivics bought with money; dilution is stated plainly to investors. |
| 2026-09-24 | **A project's campaign token is, as the norm, the same token as its village-os `equity` token**, claimed through the Hypha bridge. A project not on village-os keeps a record on the site until it is claimed. The village-os economics session is in the loop, because `equity` has its own supply and exit rules there. (B7) **Hard boundary, confirmed by village-os the same day: nothing may ever write an `equity` row into a village's ledger, not even a display mirror.** `equity` is Hypha-governed there; its posting path refuses it (`server/lib/ledger.ts` validateLeg) and a boot check fails the village if a row exists. A member's balance in a village is always a read from Hypha, rendered, never a ledger row. The fund holding a village's `equity` gives it no say there: village Voice is a separate token. |
| 2026-09-24 | **When a filled role opens again**, the people who applied for it and are still waiting or were not picked hear about it. Followers hear through the steward's updates. |
| 2026-09-24 | **Build next**: the two-line bar with the nine-capital breakdown, give or lend, money routes projects add and stewards check, a phone-first campaign page, and a Needs tab across campaigns, shaped by the crowdfunding research of the same day. |

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
| Own legal due diligence, US and Swiss | not committed, see `legal-research/` |

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

**Two things this cost, both worth keeping.**

*The first guard was worthless and passed anyway.* The original money test read through
`getCampaignById`, and drizzle's `mode: "number"` converts on its own, so removing the
pool flag changed nothing and the test stayed green. A guard that reports the same thing
when it did not run as when it passed. Raw `db.execute` bypasses the mapper, which is
where the flag actually matters, and that is what the test reads now. It was only found
by deliberately breaking the flag to see whether the test noticed.

*A type-changing migration must ship with its code.* Applying 0239 to production put the
database on DECIMAL while the running code still had the `int` schema and no pool flag,
because its deploy was still building. In that window every money read came back as a
string. The site came through it: the percentage maths divides, and division coerces
where addition concatenates, and the single `+` on money had been removed an hour
earlier by the double-count fix. Had the order been reversed, the gallery's
`reduce((s, p) => s + p.currentAmount, 0)` would have rendered a total like
`"051200.0038200.00"` on the public page.

So: **an additive migration can lead its deploy, a migration that changes a column's
RETURNED TYPE cannot.** Ship it in the same deploy as the code that expects it, or put
it behind a rail. This one survived on ordering luck rather than design.

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

## 7a. Mobile, as of 2026-09-05

An adversarial pass at 375x812, driven in a browser rather than read. Nine defects
fixed, listed in commits `e7f6336e`, `6b3bd838` and `bdd15b55`. The two worth
remembering are that a backdrop tap wiped a fully filled contribution form with no
confirmation, and that a wrapped dialog title sat under the close button, so tapping
what looked like the heading closed the modal and discarded the form. Both are the
same class of bug: a phone makes an accidental dismissal easy, and this form is the
main way anyone gives anything.

**What is already right, so nobody "fixes" it:** zero horizontal overflow on the
gallery, the campaign page and the tool at 375; the claim modal scrolls internally
and every input in it is 16px, so iOS does not zoom on focus, and 44px tall; `main`
carries 80px of bottom padding so the mobile tab bar never covers content.

**ONE OPEN, MEASURED, DELIBERATELY NOT FIXED.** The mobile sheet sits 12px below the
viewport bottom. Its `top` is 32px and its cap is `calc(100dvh-2rem)`, which would
land exactly at the edge, but `slide-in-from-bottom-3` leaves a 0.75rem translate
(`client/src/components/ui/dialog.tsx:158`). That component is behind every modal in
the app, and the content is still reachable because the sheet scrolls internally, so
it was not worth changing without regression-testing every modal. Whoever picks it up
starts from the cause rather than the symptom.

**Not reproduced, recorded so it is not chased twice:** a mobile lane reported the two
primary CTAs on `/crowd-pooling` overflowing a 320 screen. All 79 controls on that
page were measured at 375 and none overflows its text.

---

## 8. What is blocked, and on what

**No pooling machinery is built until the legal shape is settled.** Rye's ruling of
2026-09-05: build the rails, talk out the shape first.

The legal shape under test is a **registered Liechtenstein cooperative that is the fund**:
a CHF 250,000 minimum and one seat per member, a partner crowdfunding platform for
smaller money, a licensed custodian holding contributions until close. Rye meets counsel
the week of 2026-09-14. The research is in `legal-research/` (not committed) and its
questions for counsel are ranked. The one that decides everything: **is the cooperative
an AIF under AIFMG Art. 4, and if so which route (small AIFM registration, EuSEF, a full
licence) is the cheapest lawful one.** Nothing takes money until that is answered in
writing. The research of 2026-09-14 answers it provisionally: still a fund, the minimum
does not change that, and the route is a EuSEF with a binding FMA answer under AIFMG
Art. 159 para. 2 first. The ranked weak points and 28 questions for counsel are in
`legal-research/ReGen_Civics_Fund_Blueprint.html`.

Earlier US-framed research is in `legal-research/` too. Read it knowing it analysed a fund. Its
findings that survive the reframe are that labels do not change what an instrument is,
that governance rights alone probably do not defeat the "efforts of others" prong, and
that the 2025-26 US crypto statutes do not help because both new regimes exclude
instruments carrying equity.

---

## 9. Open questions

1. **Who receives the money below the minimum?** The project directly, on the partner
   platform's terms, or the cooperative. Recommended: the project directly. Money that
   joins the pool through an intermediary puts small investors back into the fund, which
   is the thing the minimum exists to avoid. Needs a ruling.
2. **Which partner platform, and of what kind?** Reward-based platforms take backers
   worldwide and give no financial return. Platforms licensed under the EU crowdfunding
   regulation are EEA-only, regulated, and can offer loans or securities in a single
   project. The choice decides what a small contributor gets and who may contribute.
3. **Does slate voting survive the recusal rule?** In a Liechtenstein entity with 30 or
   more voters, a member may not vote on its own dealings with the entity (PGR Art. 175).
   A slate that contains a project's own award may still count. Ask counsel; if it does,
   the voting engine records an abstention on any slate that pays the voter.
4. **Stewards vote on what they then carry out.** They should abstain on their own roles,
   pay and discharge.
5. **Is the CHF 250,000 cumulative or one commitment, and can it be split or combined
   across affiliates?** `member_compliance` already carries an affiliate flag.
6. **RCVoice is not deployed.** It is the only one of the four tokens with no contract on
   Base. With one seat per member it records a seat rather than a weight, and it may not
   need to be a token at all.
7. **Does the required-participation condition hold?** Rye intends every money
   contributor to also give time, equipment or a role. With a membership of a few dozen
   seats that is enforceable, and it is the thing that most distinguishes a
   member-governed cooperative from a fund, so it needs to be a real condition rather
   than an aspiration.
8. **Does `/opportunity` become the front door to the fund channel?** Its $250,000
   proposed minimum and the CHF 250,000 seat threshold should be one number in one
   currency (`shared/fund.ts` still says dollars).
9. **The crowd circle's shape.** Are its members cooperative members with a nominal
   share, or electors through an association that holds the delegate seats as a
   legal-person member? Does in-kind count toward delegate seats, at the needs
   registry's recorded value? How long is a delegate's term and what do they owe the
   circle? What happens to a seat when the campaigns behind it are refunded?
10. **The hub contract has no version field.** village-os sets its "pledged total is
    a floor" flag by hand (`PoolPieces.tsx`, `HUB_PLEDGED_TOTAL_IS_A_FLOOR`), so a fork
    pointing at an older hub would show a floor as a total. Raised by the village-os
    economics session on 2026-09-14; its corrected prose is in
    [village-os PR #243](https://github.com/Rieki777/village-os/pull/243).
    **Resolved 2026-09-14.** Rye ruled, through that session: "add a version number".
    `meta.contract` now returns `{ crowdpool: 2 }` (`shared/hubContract.ts`,
    `server/routes/meta.ts`), the history and bump rule are section 10 of the contract
    doc, and `server/hub-contract.test.ts` fails if the number and the table drift.
    The village side reads it in
    [village-os PR #265](https://github.com/Rieki777/village-os/pull/265): missing,
    erroring or malformed reads as version 1, and "2 or later" prints the pledged
    figure as a total. Any bump past 2 goes to the village-os session before it deploys.

### Recommended changes awaiting Rye's ruling (from the 2026-09-14 research)

Each of these changes a ruling in the decision log, so none is recorded as decided.

- **Silence means refund.** The missed-window default of 2026-09-05 (silence lets the
  core team choose) is the single design element that most strengthens the fund reading,
  and it names the core team as an unregistered manager. Flip the default to refund, or
  to the next assembly slate, and drop the separate consent checkbox.
- **Projects and their own slate.** Art. 175 PGR recusal reaches every project on a
  slate that pays it, from thirty voters. Either the statutes carry an Amt für Justiz
  exception, or a disbursement committee without project seats decides the slate and
  projects keep every other vote.
- **The crowd circle sits outside the cooperative.** An association or a platform body
  elects the delegates. How a delegate is seated is for counsel: as a member with a
  nominal share, or as a non-member with a statutory vote (PGR Art. 169 para. 5). The
  check pass found that a nominal share may be a fund unit for a delegate exactly as for
  the crowd, so the second shape may be the one that keeps delegates out of fund law.
  Floor of one delegate and a cap on the crowd's share of seats (suggested one third)
  are design choices, not law; in-kind not counted in season one.
- **$RCivics is a cooperative share.** Certificated under Art. 447, one vote per member
  written expressly, never described as "utility" anywhere (it would tax the raise) and
  not as "a share of all thirteen" in front of the FMA. Needs its own ADR before the
  claim bridge opens. The live site says it today, measured 2026-09-14:
  `client/src/pages/Opportunity.tsx:1075` ("Network Utility"), `:1136` ("Network
  interchange token" under a "Utility" row), `:2101` ("tokenized REIT + VC fund with
  network utility"), `client/src/pages/Tokenomics.tsx:476` ("Tradable utility token"),
  `client/src/components/StructuredData.tsx:181` ("utility tokens ($Regen and
  $RCivics)"). Copy change waits for counsel and Rye; it is marketing copy on a legal
  point.
- **Two legal persons.** The fund cooperative with an exclusive investment purpose, and a
  separate entity for the platform and the Game. The data model should assume it now.
- **The public site before registration.** `/opportunity` shows proposed fund terms and
  the campaign pages show a gated contribution flow. Counsel decides what EEA visitors may
  see; the cheap mitigation is a residence gate and a dated archive of every version.
- **Compliance record gains an investor class** (professional, opted up, EuSEF EUR 100k,
  retail), every money flow a payee entity (fund, project, partner platform), every
  project a EuSEF-eligibility record, and assets under management are tracked in EUR.

---

## 10. Where everything lives

| File | What |
|---|---|
| `CROWDPOOL_PLAN.md` | this file, the current state |
| `docs/CROWDPOOL_MODEL.md` | the mechanic, for people |
| `shared/crowdpoolModel.ts` | the mechanic, for code |
| `docs/CROWDPOOL_HUB_CONTRACT.md` | the contract village-os reads |
| `CROWDPOOLING_GAP_ANALYSIS_2026-09-04.md` | what was built vs the mechanic, with evidence |
| `legal-research/` | own due diligence, US, Swiss and Liechtenstein. **GITIGNORED, not committed**, at Rye's request: it is working material for a conversation with counsel, not a statement of the project's legal position. Start at its `README_START_HERE.md`. |
| `server/crowdpool-adversarial.test.ts` | the adversarial suite |
| `server/crowdpool-restricted-claim.test.ts` | the restricted-balance guard |
| `CROWDPOOLING_PLATFORM_SPEC.md` | the July 2026 spec, needs its decision #1 amendment |

**Testing:** point every suite at a scratch database, never `.env`, which is Railway
production. Setup is in the session memory under "regen-civics scratch database".

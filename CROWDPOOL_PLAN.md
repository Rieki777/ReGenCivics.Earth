# Crowdpooling: the plan

**This is the file to read first.** It supersedes the "what to build" sections of
`CROWDPOOLING_GAP_ANALYSIS_2026-09-04.md` and the earlier money build plan, and it is
the single place the current state lives.

**Last updated:** 2026-09-27

---

## 1. What ReGen Civics is, as of 2026-09-27

**A member-owned cooperative network in which land projects and people buy and steward
land together, governed democratically by the network itself.** It plays as a global,
in-real-life game in which members build ecovillages together by pooling everything they
have: time, money, equipment, land, knowledge, networks and roles. Money is one resource
among many and usually the smaller part. Campaigns are encouraged to ask for 10 to 30 per
cent money, and 0 per cent is allowed (ruled 2026-09-24).

**The legal shape is being set with counsel.** No ReGen Civics entity can receive money
today, and nothing moves money on or through this site. The fund-side rulings made
between 2026-09-04 and 2026-09-25 are held pending counsel (v1.2, 2026-09-27). Each
keeps a short row in the decision log so its date stays readable, and the full text of
the held rulings is kept outside the repo.

**The ways into a campaign, all counted on the campaign page.**

| Channel | Who | Where it goes | What you get |
|---|---|---|---|
| The fund channel | Not open | Being redesigned with counsel as a member-owned cooperative. Its terms are not set, and nothing here accepts money. | Not set |
| Money routes | Anyone | A route the project holds outside ReGen Civics: Ma Earth for gifts, Steward for loans. The money never passes through ReGen Civics. | Whatever the route offers. No fund tokens |
| In kind | Everyone | One project, through the needs registry | That project's own token, one per project. Never RGVoice or $ReGen, never $RCivics |
| Money loans | Lenders | The project, to meet its money ask up front (who borrows and through what is open) | The loan route's own terms. No tokens of any kind |

---

## 2. The mechanic

Full human explanation: `docs/CROWDPOOL_MODEL.md`, current as of 2026-09-27. The
machine-readable half, `shared/crowdpoolModel.ts`, still carries fund-channel constants
from before that date and is being brought in line in its own reviewed change (section
9). The short version:

1. Thirteen land projects run campaigns at the end of a season. Each needs money and
   roles, equipment, time, land, networks. **A campaign succeeds only if both halves
   land by its close date.**
2. In-kind contributions go to ONE project, through its needs: roles counted in hours a
   week, things given or lent with dates, land, knowledge and networks. The in-kind half
   has landed when confirmed value reaches the whole in-kind ask.
3. Money goes through a route the project holds outside ReGen Civics: Ma Earth for
   gifts, Steward for loans. Every money rail on this site is OFF by default and
   enforced on the server, and the site refuses money contributions while
   `crowdpool.rails.accept_money` is off.
4. Each project's own core team confirms contributions. ReGen Civics facilitates and
   makes open-source tools; it decides nothing for a project.
5. Tokens are contribution accounting. Each project has one token, reused by all its
   campaigns and issued by village-os (as the norm, the village's `equity` token on
   Hypha, claimed through the Hypha bridge). The site records, the village issues, and
   the village may refuse an issue at its cap. Pages say plainly that these tokens track
   the pooling of contributions and make no claim about their value or purpose.
6. A contributor with no village account has their tokens held in escrow against their
   identity here, released when they join. A project token can move between village-os
   and Base through the village-os redemption flow.
7. A seat at a project's table comes from contributing to it, in any form of capital,
   for as long as the commitment lasts. It is a default each project writes into its own
   agreements.
8. The fund channel is being redesigned with counsel as a member-owned cooperative; its
   terms are not set and nothing here accepts money.

---

## 2a. Principles from the v1.2 reconciliation (2026-09-27)

These hold on every crowdpool surface, today and after counsel rules.

- **Two records, two acts.** Membership and contribution are separate records, and no
  single sign-up step ever creates both.
- **No promised upside anywhere in the funnel.** No page, email or button promises a
  return, a yield, a rise in value or a payout.
- **No tradable instruments and no market pricing.** Transfers happen at book value
  only.
- **Never a percentage fee on grants won.**
- **No fixed hours-to-token rate set by ReGen Civics.** Each project's own entity decides
  how it credits labor.

---

## 3. Decision log

Every ruling, with its date, so nothing has to be reconstructed from a conversation.

| Date | Ruling |
|---|---|
| 2026-09-04 | Held pending counsel (v1.2, 2026-09-27): how fund-channel money would reach land projects. |
| 2026-09-04 | Held pending counsel (v1.2, 2026-09-27): how members signal where fund-channel money goes. |
| 2026-09-04 | A project that does not complete its crowdpool in nine months does not join that season. |
| 2026-09-04 | Held pending counsel (v1.2, 2026-09-27): what instrument, if any, records a network holding in a project. |
| 2026-09-05 | **Locked decision #1 NARROWED, not deleted.** The ban on crediting the four platform tokens for a PLEDGE stands. A separate instrument records contributions. |
| 2026-09-05 | **Founder ruling R92's hard block REMOVED**, its default kept: no treasury and no cap unless a project opts in. |
| 2026-09-05 | Held pending counsel (v1.2, 2026-09-27): how much of a fund-channel contribution members direct. |
| 2026-09-05 | Held pending counsel (v1.2, 2026-09-27): the part of a fund-channel contribution kept for a community treasury. |
| 2026-09-05 | Held pending counsel (v1.2, 2026-09-27): fees on fund-channel money, and how its refunds are made. |
| 2026-09-05 | Held pending counsel (v1.2, 2026-09-27): what happens to fund-channel money when a campaign misses its window. |
| 2026-09-05 | Held pending counsel (v1.2, 2026-09-27): how fund-channel tokens are counted against money. |
| 2026-09-05 | Held pending counsel (v1.2, 2026-09-27): when fund-channel tokens are issued and claimed. |
| 2026-09-05 | Held pending counsel (v1.2, 2026-09-27): the rules on members' signals about fund-channel money. |
| 2026-09-05 | "Earmark" retired in favour of "routing", across copy, schema and docs. |
| 2026-09-05 | All currency-like integers carry **two decimals**. |
| 2026-09-05 | Held pending counsel (v1.2, 2026-09-27): the cooperative's legal form, and any investor channel beside it. |
| 2026-09-05 | Held pending counsel (v1.2, 2026-09-27): a path for accredited investors. |
| 2026-09-05 | **Every rail is switchable.** Build the machinery with per-rail on/off so what is legal can be turned on as counsel clears it. |
| 2026-09-14 | Held pending counsel (v1.2, 2026-09-27): who holds seats in the fund channel's governance, and what they decide. |
| 2026-09-14 | Held pending counsel (v1.2, 2026-09-27): the threshold for a seat in the fund channel. |
| 2026-09-14 | Held pending counsel (v1.2, 2026-09-27): how land projects vote on fund-channel disbursements. |
| 2026-09-14 | Held pending counsel (v1.2, 2026-09-27): whether crowdpool contributors take part in the fund channel. |
| 2026-09-14 | Held pending counsel (v1.2, 2026-09-27): the legal home of the fund channel. |
| 2026-09-14 | Held pending counsel (v1.2, 2026-09-27): a money minimum for the fund channel. |
| 2026-09-14 | Held pending counsel (v1.2, 2026-09-27): which money goes to the fund channel and which to partner platforms. |
| 2026-09-14 | Held pending counsel (v1.2, 2026-09-27): where the 2026-09-04 money rule applies. |
| 2026-09-14 | Held pending counsel (v1.2, 2026-09-27): a collective voice in the fund channel for people who contribute smaller amounts. |
| 2026-09-24 | **Money share is a soft default.** Campaigns are encouraged to ask for 10 to 30% money; 0% is allowed. Nothing blocks a number outside the band. Replaces "typically ten to twenty per cent". |
| 2026-09-24 | **Crowdpool contributions earn no RGVoice and no $ReGen.** Replaces the 2026-09-14 table row that gave in-kind "the Game side: RGVoice and $ReGen". |
| 2026-09-24 | **In-kind earns that campaign's own tokens.** What the token is, what it carries, who issues it and when are open. |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): which contributions earn $RCivics. |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): whether one proposal can mix money, equipment and committed time to reach a fund-channel minimum. |
| 2026-09-24 | **Money loans can meet a campaign's money ask.** Loan money is value the project receives up front. Lenders receive no tokens; what a lender receives is set by the loan route and the project, never by ReGen Civics. Who borrows, who lends and on what terms are open. (Worded to section 2a on 2026-09-27.) |
| 2026-09-24 | **The in-kind half has landed when confirmed value reaches 100% of the in-kind ask** by close; delivery is tracked afterwards. Narrows locked decision 4 of 2026-07-17 for the close test only. Who confirms is open. |
| 2026-09-24 | The pledge simulator keeps "Fill a need" with a real Apply, Offer or Sign up button; "Offer time" goes. |
| 2026-09-24 | The open questions these answers raise (89 for Rye, 15 for counsel) are listed with options and recommendations in `legal-research/Crowdpool_questions_2026-09-24.md`, kept out of git beside the legal research. |
| 2026-09-24 | **Rye accepted the recommendations on those questions, with these exceptions**, recorded in the rows below. Still open after this round: M6 (whether several commitments add up to a project's minimum) and T2a (a new token per campaign, or one per project), plus eight follow-ups raised the same day. |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): a minimum for money put into the fund channel. **Each project sets a total capital minimum**, which can be met with a mix of money and other capital. (S1) |
| 2026-09-24 | **A crowdpooling seat lasts as long as the commitment**, and its tokens are earned as the commitment is delivered: 100k at 10k a week earns week by week, and leaving early means leaving with less. (S7) |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): people joining the fund channel directly, without a campaign. (S8) |
| 2026-09-24 | **Networks and knowledge count toward a minimum**, shown with a warning that there is no clear way yet to account for them and it varies project to project. (M22) |
| 2026-09-24 | **Tokens for committed work are paid on the project's own schedule**, typically weekly or monthly, as the work is delivered. (M10) |
| 2026-09-24 | **All seats start together at the start of the next season, the build season**, once the campaign runner has set that date and closed the campaign as complete. (M11) |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): who admits members to the cooperative. (M12) |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): how money a member directs to a project counts toward that project and toward the member. (M19) |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): the setting for how much of a contribution members direct. (R1a) |
| 2026-09-24 | **Campaign tokens are recorded on the site and claimed through the existing Hypha bridge.** (T2b) |
| 2026-09-24 | **Tokens are contribution accounting.** The network tracks what was pooled; each project designs its token beyond that. Pages say plainly that the platform's tokens track the pooling of contributions and make no claim about their value or purpose. (T13) |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): what else $RCivics tracks, and which crowdpool contributions earn it. In-kind earns the project's token. (T11) |
| 2026-09-24 | **Contributions are confirmed by each project's own core team.** ReGen Civics facilitates and makes open-source tools; it decides nothing for a project. (C1) |
| 2026-09-24 | **A campaign token is normally the same token as the project's main token in village-os**, because it plays the same role of tracking contributions. In village-os that is the `equity` token, which lives on Hypha on Base. To be confirmed with Rye and the village-os economics session before anything is built on it. (B7) |
| 2026-09-24 | **Built the same day:** the public project page with its campaign tools (`/project/:key`), role capacity in hours per week (hub contract version 3), campaign notices through the notification spine, cancelling with notices to everyone involved, campaign lists as admin Outbound audiences, practice receipts on example campaigns, and the security holes in campaign create and publish closed. The role conversion migration (`drizzle/after-deploy/0251`) waits until village-os shows hours on its role meters. |
| 2026-09-24 | **Third round.** Rye accepted the remaining suggestions except the rows marked as his own words below. |
| 2026-09-24 | **Commitments add up until the campaign closes** toward a project's minimum. Held pending counsel (v1.2, 2026-09-27): how the fund channel checks a money commitment. (M6) |
| 2026-09-24 | **One token per project**, reused by each of its campaigns; the site records which campaign each amount came from. (T2a) |
| 2026-09-24 | **Reworded 2026-09-27 (v1.2 reconciliation). A seat at a project's own table comes from contributing to it**, in any form of capital, counted by the project's own core team, for as long as the commitment lasts. Seats follow use and are never sized by money. This is a default each project writes into its own agreements, because a project's governance rights belong to the project's own entity and a ReGen Civics page cannot grant them. Held pending counsel (v1.2, 2026-09-27): how the fund channel itself is governed. |
| 2026-09-24 | **Money inside a project commitment goes through the project's own route** and counts toward the project's minimum. Held pending counsel (v1.2, 2026-09-27): how fund-channel tokens relate to a project's own tokens. |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): what the fund channel holds when money is directed to a project. |
| 2026-09-24 | **The ReGen Civics Year wheel sets the default calendar** (seats start when the Build Season opens), **and each project may set its own calendar cycle.** (Rye's words.) |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): who admits people who join the fund channel directly. |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): how the fund channel is managed. |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): whether $RCivics earned in different ways carries the same standing. |
| 2026-09-24 | **A project's campaign token is, as the norm, the same token as its village-os `equity` token**, claimed through the Hypha bridge. A project not on village-os keeps a record on the site until it is claimed. The village-os economics session is in the loop, because `equity` has its own supply and exit rules there. (B7) **Hard boundary, confirmed by village-os the same day: nothing may ever write an `equity` row into a village's ledger, not even a display mirror.** `equity` is Hypha-governed there; its posting path refuses it (`server/lib/ledger.ts` validateLeg) and a boot check fails the village if a row exists. A member's balance in a village is always a read from Hypha, rendered, never a ledger row. Held pending counsel (v1.2, 2026-09-27): any fund-channel holding in a village. |
| 2026-09-24 | **Some projects may keep their tokens in village-os and never use Hypha for them.** (Rye's words.) Such a token cannot be the village's `equity` (Hypha-governed, refused by the village ledger); it would be a token the village itself issues. How contributions recorded on the hub reach it is open with Rye and the village-os economics session. Held pending counsel (v1.2, 2026-09-27): any fund-channel holding in such a project. |
| 2026-09-24 | **Village-os's answer on village-only tokens**, measured on its main: (1) a per-project platform token is registrable today, but the issuance cap (`ledger.admin_mint_cycle_cap`) is per token, so a village hosting several projects would multiply it; open with Rye whether a village can host more than one project, and if so village-os makes the cap village-wide first. (2) The village pulls the hub's record and issues from its own faucet (one writer keeps its books balanced), keyed on the hub's contribution id; the village may refuse an issue at the cap, and the refusal must reach the hub so no member is told they received tokens they did not. The contract line becomes "the hub records, the village issues, and the village may refuse". (3) Held pending counsel (v1.2, 2026-09-27): any fund-channel holding of a village-only token. Framing: such a project has no Base contract by choice; it is not denied `equity`. |
| 2026-09-24 | **A project's token can live in both places**, village-os and Hypha, moving between them through the village-os redemption flow. (Rye's words; the flow's details are with the village-os economics session.) |
| 2026-09-24 | **Village-os creates the contribution tokens for every crowdpooling contribution.** Equipment and time from individuals: those individuals receive the tokens directly. The hub records; the village issues. (Rye's words.) Held pending counsel (v1.2, 2026-09-27): who receives the tokens for fund-channel money. |
| 2026-09-24 | Held pending counsel (v1.2, 2026-09-27): whether and how the network holds a part of each land project. |
| 2026-09-24 | **How village-os fits these rulings** (its economics session, measured on its main): (a) redemption already burns the token in the village and something real happens elsewhere, so a project token can redeem to Base: burn in the village, mint on Hypha, with no Hypha token ever on the village ledger; the one change is a destination kind "tokens on Base" beside cash. (b) Held pending counsel (v1.2, 2026-09-27): whether the fund channel keeps an account in a village. (c) Contributors with no village account: their tokens are held in an escrow account against their hub identity and released when they join; never minted to an account with no person behind it. Open with Rye: verify Base redemptions on chain or have a steward attest (village-os recommends verify); whether one village can host more than one project. |
| 2026-09-25 | **Every village names its closing policy before it launches.** Rye, via the village-os economics session: "before you launch the village you have to articulate what it means to close a village"; a village may name its own policy, and "any exit policy can be written and agreed to in the platform". **The platform default is proportional to tokens held on closing day**: "Proportional to tokens held is the platform default for now" (Rye, answering the binary "same amount each, or proportional to tokens held"). (Corrects an earlier same-day entry that said equal shares.) Held pending counsel (v1.2, 2026-09-27): how the fund channel is treated at a village's close. |
| 2026-09-24 | **When a filled role opens again**, the people who applied for it and are still waiting or were not picked hear about it. Followers hear through the steward's updates. |
| 2026-09-24 | **Build next**: the two-line bar with the nine-capital breakdown, give or lend, money routes projects add and stewards check, a phone-first campaign page, and a Needs tab across campaigns, shaped by the crowdfunding research of the same day. |
| 2026-09-27 | **Example campaigns ask for money at about 20% of the whole ask**, fixed now rather than at the re-seed after 0251 (Rye: "Yes do this"). Their example route figures scale with the new money ask so no example reads as landed. |
| 2026-09-27 | **An in-kind need cannot be listed at 0.** Creation refuses a zero-value in-kind need, so "confirmed value reaches 100% of the in-kind ask" and "every need filled" always agree. **Lend dates on offers not yet accepted stay public** (dates only, never names), so others can see what is already offered. |
| 2026-09-27 | **When a filled role opens again, people a steward declined hear too** (`ROLE_REOPENED_REACHES_DECLINED` on), and the steward's dialog says so before they act. **The sign-in link is limited per email**, about 3 every 15 minutes. |
| 2026-09-27 | **Stewards are nudged when an offer has waited 2 days** without an answer ("to keep things active"). This replaces the plan's 7 days. |
| 2026-09-27 | **The research questions are ruled as suggested** ("Crowdpool Journey Research"): (1) if a campaign doesn't complete, hours already worked keep the tokens they earned, lent things go home on the agreed date or sooner if the lender asks, and accepted offers that haven't started are released with a thank-you and other open needs; (2) one public page per campaign, `/project/:key`; (3) people without accounts keep the three fixed emails, and the private status link and the arrival note ride inside the accepted email; (5) the money share is a soft note; (6) verified loan money counts in the money line, marked lent; (7) account holders get platform notices in the bell, and email-only followers get one season digest Rye sends from Outbound; (8) the Steward loan card and a "tell me when more ways open" list sit behind a residence gate for EEA and UK visitors until counsel rules; (9) a steward's estimate of what help was worth is a report figure only; (10) "Still needed" after close, for completed campaigns only, later; (11) complete stays at 100% of the in-kind ask and "Needed to start" stays a steward-side marker; (12) build-day credit is thanks plus a line on the card, no date priority in Season 2; (14) a shared default opening day and a published "What we look for" page, both labelled as defaults; (15) English for Season 2, with copy kept in one shared file. **(13) Instead of SMS, a separate lane adds WhatsApp and Telegram notices alongside email.** |
| 2026-09-27 | **ReGen Civics sets no fixed hours-to-token rate.** Each project's own entity decides how it credits labor. A note for counsel: for a for-profit project, whether token credits for hours create an employment duty turns on whether the tokens later redeem for value. |
| 2026-09-27 | **The fund-side rulings above are held pending counsel (v1.2)**, each kept as a short row so its date stays readable, and their full text is kept outside the repo. The seats row of 2026-09-24 is reworded, and the principles in section 2a are added. |

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
| Public project pages with steward tools, role capacity in hours, campaign notices on the spine, cancelling (contract 3) | `198213bc` |
| Sign-in returns to the page, email choices without a profile, a notice when a filled role reopens | `85594f1f` |
| Embed pages escape every value they print | `3c2e817f` |
| One progress reading in-kind first, the nine-capital sheet, give or lend, money routes admins verify, the money rail enforced, one phone-first project page, the Needs tab, stored readiness ticks, the words guard (contract 4) | `d69d40ca` to `999fbbaf` |

---

## 5. What is being built right now

**Everything here is rails, not doors.** Nothing accepts money. The Fund is not a legal
entity and the cooperative is not yet formed, so neither can receive anyone's money.

1. **The DECIMAL sweep.** Every currency-like column moves to `DECIMAL(18,2)`. See
   section 6 for why the method matters more than the change.
2. **Compliance fields at contribution time.** Jurisdiction, residency attestation,
   affiliate flag, and the version of the disclosure the member actually saw. Near-free
   now and expensive to retrofit. The table also carries accreditation columns from
   before 2026-09-27; v1.2 has no investor-member class at launch, so whether they stay
   waits on counsel.
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

The fund channel is being redesigned with counsel as a member-owned cooperative, and its
terms are not set. Nothing takes money until counsel answers in writing. The project's
own research is in `legal-research/` (not committed), and the full text of the fund-side
rulings held on 2026-09-27 is kept outside the repo with it.

---

## 9. Open questions

1. **Which other outside money routes may a project add, beyond Ma Earth and Steward?**
   Reward-based platforms take backers worldwide. Platforms licensed under the EU
   crowdfunding regulation are EEA-only and regulated. The kind of route decides who may
   contribute through it, and its terms are always the route's own.
2. **Stewards vote on what they then carry out.** They should abstain on their own roles,
   pay and discharge.
3. **The hub contract has no version field.** village-os sets its "pledged total is
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
4. **What is a project's capital minimum for, now that seats come from contributing?**
   The 2026-09-24 rows S1, M6 and M22 give each project a total capital minimum, and
   until 2026-09-27 reaching it gave a seat at the project's table. The reworded seats
   row gives a seat to anyone contributing, for as long as the commitment lasts. Whether
   the minimum stays, and what it then decides, needs a ruling.
5. **`shared/crowdpoolModel.ts` and the crowdpool game variables** still carry the
   fund-channel constants from before 2026-09-27. They are code and a migration, so they
   change in their own reviewed commit.

The recommendations from the 2026-09-14 research concerned the fund channel, and they
are held pending counsel with it.

---

## 10. Where everything lives

| File | What |
|---|---|
| `CROWDPOOL_PLAN.md` | this file, the current state |
| `docs/CROWDPOOL_MODEL.md` | the mechanic, for people |
| `shared/crowdpoolModel.ts` | the mechanic, for code (its fund-channel constants are still to be brought in line, section 9) |
| `docs/CROWDPOOL_HUB_CONTRACT.md` | the contract village-os reads |
| `CROWDPOOLING_GAP_ANALYSIS_2026-09-04.md` | what was built vs the mechanic, with evidence |
| `legal-research/` | own legal due diligence. **GITIGNORED, not committed**, at Rye's request: it is working material for a conversation with counsel, not a statement of the project's legal position. Start at its `README_START_HERE.md`. |
| `server/crowdpool-adversarial.test.ts` | the adversarial suite |
| `server/crowdpool-restricted-claim.test.ts` | the restricted-balance guard |
| `CROWDPOOLING_PLATFORM_SPEC.md` | the July 2026 spec, needs its decision #1 amendment |

**Testing:** point every suite at a scratch database, never `.env`, which is Railway
production. Setup is in the session memory under "regen-civics scratch database".

# How crowdpooling works

A land project needs many things to become real. Money is one of them, and usually
the smaller one. Crowdpooling is how a community brings all of it together in one
season, and how the people who bring it stay connected to what they built.

Campaigns usually ask for 10 to 30 percent of the whole in money. Nothing blocks another share, and 0 is allowed.

This is the human half. The machine half is `shared/crowdpoolModel.ts`, and code
reads that one so the two cannot drift apart. That file still carries fund-channel
constants from before 2026-09-27; until it is brought in line, this page is the current
one.

---

## The shape of it

Thirteen land projects run a campaign at the end of a season. Each campaign says what
the project needs: the money, and the roles, land, equipment, hours, tools, knowledge
and networks. **A campaign is only finished when both halves land.** Hitting the money
number with nothing else is not a project that can happen.

Two kinds of contribution, and they behave differently.

**Anything that is not money goes to one project.** A person takes a role, lends a
tractor, runs a workshop, commits eight Saturdays. It goes where they put it and it
stays there.

**Money goes through a route the project holds.** A crowdfunding platform we work with
and do not run: Ma Earth for gifts, Steward for loans. It has its own terms, and what
you receive there is theirs to say. The money never passes through ReGen Civics. The
campaign page still counts it, so a project sees one total.

The fund channel is being redesigned with counsel as a member-owned cooperative; its terms are not set and nothing here accepts money.

---

## Money through a project's own route

A project steward adds the project's Ma Earth or Steward link, and a ReGen Civics admin
checks it before it shows on the project page. Each route card names who holds the
money. This site has no field for giving an amount, and it takes no money itself.

A person who wants to give money is sent to that route's page for the project with one
tap. Their contribution shows up on the campaign page under the platform's name once
the platform reports it, in the money line of the campaign. Money lent through a route
is marked as lent.

Steward loan routes stay hidden until counsel clears them, and every money rail on this
site stays off until then too.

---

## When a campaign closes, and when it does not

A campaign closes when **all three** are true: the money threshold is met, the in-kind
threshold is met, and the close date has arrived. The close date is fixed when the
campaign is published and does not move afterward. Nine months is the outer limit for
any campaign's window.

If a campaign does not complete (ruled 2026-09-27):

- hours already worked keep the tokens they earned;
- lent things go home on the agreed date, or sooner if the lender asks;
- accepted offers that have not started yet are released, with a thank-you and a
  pointer to the other open needs.

Money given through a project's own route follows that route's own terms.

---

## Words we do not use

**We do not say "earmarking".** We say routing. That is not a style preference. In US
tax law "earmarking" is the precise term for what destroys a gift's standing when
money is directed onward to a foreign organisation, and most of these projects are
outside the US. The word carries a meaning we do not want.

**We do not say donation, donor, receipt, or tax deductible.** None of them are true
here. The platform never produces anything receipt-shaped.

`shared/crowdpoolModel.ts` carries the full list and a repo guard enforces it.

---

## What you hold

**Tokens here are contribution accounting.** They record what you pooled into a project.
Each project designs what its token does beyond that, and every page says plainly that
these tokens track the pooling of contributions and make no claim about their value or
purpose. In-kind contributions earn the project's own token, and never RGVoice or
$ReGen.

**One token per project.** Each of a project's campaigns reuses it, and the site
records which campaign each amount came from. Village-os creates the tokens: the site
records a contribution, the village issues the token, and the village may refuse an
issue at its cap. A refusal comes back to the site, so nobody is told they received
tokens they did not. For a project on village-os the token is, as the norm, its `equity`
token, which lives on Hypha on Base and is claimed through the Hypha bridge.

**Tokens for work arrive as the work is delivered**, on the project's own schedule,
typically weekly or monthly. How a project credits labor is its own entity's decision.
ReGen Civics sets no rate of tokens for hours.

**No village account yet?** Your tokens are held in escrow against your identity here
and released to you when you join. They are never minted to an account with no person
behind it.

**A project's token can live in both places**, village-os and Hypha on Base, and it
moves between them through the village-os redemption flow.

---

## Who decides

**Each project's own core team confirms contributions.** ReGen Civics facilitates and
makes open-source tools; it decides nothing for a project.

**A seat at a project's table comes from contributing to it**, in any form of capital,
counted by the project's core team, for as long as the commitment lasts. Seats follow
use and are never sized by money. This is a default each project writes into its own
agreements, because a project's governance rights belong to the project's own entity.
Seats start together when the Build Season opens, and each project may set its own
calendar.

**Every village names its closing policy before it launches.** The platform default is
proportional to tokens held on closing day, and a village may write and agree its own.

---

## What is built, and what is not

The needs registry is real and working: nine kinds of capital, slot counts, claims,
delivery and thanks. That is the in-kind half, and it is the larger half.

**The fund channel is not built.** Nothing on this platform accepts money today, and
the contribution paths are gated off in code. No ReGen Civics entity can receive or hold
anyone's money yet.

Before any of it opens, counsel has to rule on the shape. The project's own research is
kept out of the repository on purpose, and its clearest finding is that what a thing is
called does not change what it legally is. Everything here is built on the assumption
that the money half is regulated, because it almost certainly is.

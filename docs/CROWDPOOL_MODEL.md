# How crowdpooling works

A land project needs many things to become real. Money is one of them, and usually
the smaller one. Crowdpooling is how a community brings all of it together in one
season, and how the people who bring it stay connected to what they built.

This is the human half. The machine half is `shared/crowdpoolModel.ts`, and code
reads that one so the two cannot drift apart.

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

**Money goes to ReGen Civics.** Not to a project. This is the part people find
surprising, so it is worth being plain: you cannot send money to a project through
this platform. You contribute to ReGen Civics, and you tell us where to route it.

---

## What happens to money, with real numbers

Someone contributes **100,000 CHF**.

**They receive 100,000 $RCivics.** One token for one franc, for their whole
contribution. That is their standing in the whole thing.

**They get to route 90,000 of it.** Ninety per cent is the current share and it is a
setting, adjustable between fifty and ninety per cent from one season to the next.
Routing means naming which projects they want their money to reach.

Say they route **50,000 to Project A** and **40,000 to Project B**.

**The remaining 10,000 goes to the community treasury**, which pays for the roles and
the running of the platform that makes the season happen at all.

**Then the projects answer.** A project that receives routed money sends back an equal
amount of its own tokens to ReGen Civics. Project A sends back 50,000 worth. Project B
sends back 40,000 worth.

So after the season, ReGen Civics holds 50,000 of Project A, 40,000 of Project B, and
10,000 in the treasury. And if this person were the only contributor in the whole
fund, their 100,000 $RCivics would represent all of it: every one of those holdings,
in those proportions.

**That is the point of the whole design.** You back the projects you believe in, and
you end up holding a piece of everything the community chose together. Your judgement
directs your money. The community's judgement shapes what you own.

---

## Routing is a signal, not a claim

The thing you use to route is a **signal to ReGen Civics**, and it is deliberately
thin:

- It **cannot be sold or transferred**. It is a message about where your share should
  go, not something to hold or trade.
- It is **movable** right up until a campaign closes. Changed your mind, or a project
  you backed is nearly there and another is far off? Move it.
- It carries **no rights of its own**. Your standing comes from your $RCivics.

The reason it is movable matters. Late in a season the community can see which
projects are close and which are not, and moving routing around is how a community
gets more projects across the line than it otherwise would.

---

## What a project gives back

To take part, a project returns a stake to ReGen Civics of **at least ten per cent**,
and it is **non-dilutive**: the project's own assets do not shrink. One way to do it
is for the project to send ReGen Civics an amount equal to ten per cent of every
distribution it makes, so the stake stays at ten per cent instead of being watered
down over time.

The swap is **value for value**. If a project's ten per cent is worth 100,000, it
receives 100,000 worth of ReGen Civics. Nothing is taken. A slice of one project is
converted into a holding across all of them.

**And it happens only after the community has said the project is worth funding.**
That order is the whole point. The community decides first.

**The stake is not one thing.** Depending on the project it is a recorded agreement, a
position on-chain through Hypha, or real equity in a real legal entity. It varies
because the projects vary, and the software never assumes it is a token.

---

## When a campaign closes, and when it does not

A campaign closes when **all three** are true: the money threshold is met, the in-kind
threshold is met, and the close date has arrived. The close date is fixed when the
campaign is published and does not move afterward. Nine months is the outer limit for
any campaign's window.

If a campaign never closes, everyone who routed money to it chooses what happens to
that share:

1. **Route it somewhere else**, into a campaign still running.
2. **Take it back.** Refunds are always whole. No fee is ever taken from money coming
   back.
3. **Let the ReGen Civics team choose** the project that most needs it.

There is a **seven day window** to answer. If nobody answers, the third option is what
happens, and because that is a real consequence of silence it is agreed to separately
at the start rather than buried in a page of terms.

If **none** of the projects someone routed to close, they are offered the same choice
over their whole contribution: take it back, or let ReGen Civics direct it.

---

## Words we do not use

**We do not say "earmarking".** We say routing. That is not a style preference. In US
tax law "earmarking" is the precise term for what destroys a gift's standing when
money is directed onward to a foreign organisation, and most of these projects are
outside the US. The word carries a meaning we do not want.

**We do not say donation, donor, receipt, or tax deductible.** None of them are true
here. A contribution to a crowdpool is not a gift: you receive $RCivics for it. The
platform never produces anything receipt-shaped.

`shared/crowdpoolModel.ts` carries the full list and a repo guard enforces it.

---

## Open questions

Three things in this document are not settled yet, and they are marked here rather
than guessed at.

**What is $RCivics worth, in what currency?** The example above uses one token per
franc. The earlier ruling said one dollar. Those are not the same, and if two people
contribute the same number in different currencies they cannot both be right.

**When is $RCivics issued?** Two answers have been given: at the moment of
contribution, and at the moment a campaign closes. The difference matters, because it
decides whether someone holds standing while their money is still waiting.

**Is the treasury held or spent?** If the ten per cent pays roles and running costs
then it is spent, and it is not a holding anyone owns a share of. If it is a reserve
then it is. The worked example above reads as the second, and the earlier ruling as
the first.

---

## What is built, and what is not

The needs registry is real and working: nine kinds of capital, slot counts, claims,
delivery and thanks. That is the in-kind half, and it is the larger half.

**The money half is not built.** Nothing on this platform accepts money today, and the
contribution paths are gated off in code rather than merely hidden. The ReGen Civics
Fund is in formation and is not yet a legal entity, so it cannot receive or hold
anyone's money.

Before any of it opens, a securities lawyer has to rule on the shape. The project's
own research is in `docs/legal/`, and its clearest finding is that what a thing is
called does not change what it legally is. Everything here is built on the assumption
that the money half is regulated, because it almost certainly is.

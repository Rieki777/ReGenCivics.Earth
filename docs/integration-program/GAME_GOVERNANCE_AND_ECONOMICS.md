# The Game: governance and economics

**What this is.** The ideology and the structure of the Game in one place, so a session, a bot or a
new contributor can understand what is being built and why before touching it. Written 2026-08-29
from the founder's rulings, the shipped code, and the SEEDS Guide v0.8.5 that the founder designed
and pointed us at as the model to learn from.

**How to read it.** Every claim is one of three kinds and they are labelled throughout:

- **RULED** — the founder decided it. His words are quoted in brackets. Do not re-litigate; cite the
  ruling number.
- **BUILT** — it exists in code, with the file that proves it.
- **OWED** — ruled or designed and **not built**. If you are looking for work, it is here.

**Nothing in this file is enforcement.** It describes. The code enforces, and where the two disagree
**the code wins** — that has already caught us once, when a document on main claimed crews carry no
conversation and the code plainly created one.

---

## 1 · The frame: why a game

**RULED, and it is the spine of everything else.** The platform is a Game because a village will not
read a governance policy and will play a game. Rules that arrive as play get read, remembered and
argued with; the same rules as policy get skipped. That is not decoration on top of a governance
system, it is the delivery mechanism, and it survives the change of scale from a global currency to
twelve people sharing meals.

**The Game is infinite in the technical sense**: the object is not to win it but to keep it worth
playing, and the rules are expected to change while it runs. The rulebook is therefore also the
roadmap, and the roadmap is amendable by the same process as the rules.

**One piece, not the whole thing.** R64: *[these tools and currency aren't the governance domain of a
single organisation, but very quickly to form a network of them]*. ReGen Civics builds a piece of
civilizational infrastructure and expects to be one node among many. **This is a design constraint
with teeth: nothing may be built that assumes ReGen Civics is permanently the centre.**

**A village is defined by emergence, not by boundary.** Who is in it is decided by the people inside
it, and membership is active engagement rather than residence or payment.

## 2 · The trajectory: admin is scaffolding

**RULED (R54).** *[These villages are meant to be taken over by the electorate to run the game and
put the admins out of a full time job.]* Admin is not a tier, it is scaffolding that comes down.

**Design test for anything governance-shaped: does this move a power toward the village, or does it
entrench the scaffolding?**

### The turning point

**RULED (R67, R68), and mostly OWED.**

> *[A game needs 3 people minimum to play (to actually issue tokens) so they can do everything else
> to set up the game on their own, but once they press "start the Game" this proposal to actually be
> able to start minting tokens.]*

> *[once the "Game Starts" then members are governing the admin powers... every admin action is
> available to be SEEN by all members, and members can make a series of suggested admin changes and
> put this up as a proposal to be voted on by the members... Changing the Game itself should require
> significantly more % of overall voice to approve a set of changes.]*

So the Game has a **before** and an **after**:

| | Before "start the Game" | After |
|---|---|---|
| Who edits the rules | The founder, freely | Members, by proposal |
| Minimum people | 1 | **3** |
| Token issuance | **Off** | On |
| Admin actions | Private setup | **Visible to every member** |
| Changing the Game | An edit | A vote at a **raised** threshold |

**Setup is solitary. Starting is collective.** Pressing start is itself a proposal.

**OWED: all of it.** There is no start-the-Game proposal, no three-member gate on issuance, no
admin-action visibility feed, no proposal that carries a *set* of changes, and no per-subject
thresholds.

## 3 · Voice: what it is and what may happen to it

**Voice is the say a member has in a decision.** By default the weighting token is `gratitude`
(`governance.weight_token`), though `governance.weight_mode` defaults to `equal`, so **a send only
becomes a vote the moment a village flips the mode.** Know which mode a village is in before
reasoning about any gratitude change.

### The three rules, and they are not the same rule

**1. RULED (R65) — nobody may strip a voice as a sanction.** *[I'd say denying a voice is not a power
anyone should hold. Remove this ability for now.]* A warning badge may still say something true. It
may not remove anyone from an electorate. **In flight now.**

**2. RULED (R66) — waning is not removal.** *[when voice is earned it should never be force taken
away (Though with Hypha rules voice can wane...)]* A rule under which unused voice decays over time
is legitimate. **The distinguishing property: nobody decides it, it applies identically to everyone,
and it is time-based.** SEEDS does exactly this and it is the reconciliation of the two rules:
depreciation applied uniformly is rescaling, not removal, and because it moves everyone together it
changes nobody's standing relative to anyone else.

**3. RULED (R71) — a departed member's voice leaves with them.**

> *[Voice CAN be taken away if a member is removed from a village - this is an admin power initially
> but turns into a vote by the community later to confirm members who have left - this removes their
> voice tokens from the pool and should stay at a high unity and quorum rate. Otherwise it gets
> harder and harder to pass things as members leave and they're still being counted in Quorum.]*

**The classifying axis is the TRIGGER, not the effect.** All three reduce somebody's voice. The
forbidden one is triggered by a judgement about how a member behaved. The permitted ones are
triggered by time passing, or by the person no longer being here.

### The live defect this exposes, measured 2026-08-29

**There is no way to leave a village.** Confirmed against a working control at `a9f55de`:

- The member row has **no** departure column. Its fields are id, name, email, passwordHash, paths,
  recognitionBalance, contributions, quests, journeys, prefs, contactable, isExample,
  membershipGranted, bio. No `active`, `removed`, `departed`, `ended`, `status`.
- **No route removes a member from a village.** The only `removeMember` functions in the tree act on
  conversations and on patterns.
- `buildElectorate` (`server/index.ts:24977`) takes **every member row with a password hash** that is
  not an example user, then filters on `hasCapability("ballot.vote")`.
- `ballot.vote` requires the `member` stage, and **nothing ever revokes a stage.**

**So once somebody signs the Love Letter they are in the electorate permanently, and the snapshot law
freezes that roll into every ballot.** The founder's failure mode is not a future risk. It is live,
and it has no exit. **This is the highest-priority governance build.**

## 4 · How a decision is made

**BUILT.** A proposal becomes a ballot. A ballot freezes its world at open — **the snapshot law**,
`shared/constitution.ts`: a vote is counted against the day it opened, so every dial, every weight
and every roll member is frozen inside the open transaction and never re-read. `ballots.test.ts`
pins it. **This is the invariant every governance lane must prove it did not break.**

Two dials decide the outcome: **quorum** (how much of the whole electorate voted) and **unity** (what
share of those who voted said yes). Defaults 20% and 80%, and a village may set quorum as low as 1%.

**RULED (R56): the platform states what is true and gets out of the way.** *[We dont have to protect
them.]* A count is a fact; a warning is an argument. A village setting a 1% quorum is exercising a
dial, not making a mistake.

**Objections exist only on consent-method ballots**, and the default method is `custom`, so most
villages never meet them. **`integrated` means the objection STANDS and the proposal must change** —
the inverse of the everyday reading, and a gate now pins it so nobody "fixes" it into an inversion.

### Thresholds tiered by what is being changed

**RULED (R68) and OWED.** *[the governance requirements for changing the Game are different than
approving a quest]*, and his stated reason is **awareness rather than caution**: a big change should
need enough people paying attention that it cannot pass on a quiet week.

**Today every village-wide ballot resolves through one pair of dials regardless of subject.** There
is no per-subject threshold anywhere.

**From SEEDS, and worth taking:**

- **The shape is a tier table where both dials rise together and the tier attaches to the thing being
  changed**, so nobody argues about which tier applies after the fact.
- **The highest thresholds go on what is irreversible.** SEEDS puts near-unanimity on creating money
  and on ending the system. Ours belong on changing the Game, on starting it, and on removing
  somebody from the roll.
- **Better than a tier table for anything with a number attached: let the ask classify itself.** A
  request for a large share of the pool needs a higher bar than a small one, continuously, so nobody
  has to categorise it.
- **Split the standing, not only the threshold.** In SEEDS fewer people may even raise a rule change
  than may raise a funding request. At village scale a citizenship ladder is wrong, but **a
  co-signer requirement is cheap and is not a tier**: any member may propose a quest alone; a
  proposal to change the Game needs a second member before it opens.

**Also OWED and valuable:** a passed decision that the people who passed it can un-pass by
withdrawing support, and a rule change that is **reversible by inaction** for a few cycles after it
lands. Both let a village experiment without needing somebody to organise a counter-proposal.

## 5 · Cycles

**RULED (R69): lunar, always.** *[let's just stick with lunar months all around, it's good to be on
our own rhythm.]* The calendar-month dial is being retired rather than wired.

**OWED, and it is one line of data modelling.** `governance.vote_days` is an integer number of days,
default 7. **Seven days is 0.2373 of a lunation**, so a ballot opened on a new moon closes at no
meaningful moon position and every cycle drifts further. SEEDS stores the window as a **fraction of a
lunation** (1, 0.5, 0.25) and derives the days. That also gives a village the sentence it will
actually say out loud, which is *"this closes at the full moon"*, not *"this closes in seven days"*.

**One rule the cycle-id repair paid for and everything must now follow:** one function makes every
cycle id, a settlement **refuses rather than skips** a row it cannot place, and a test fails the
moment a second spelling appears. Two allowance systems reading one table through different keys was
a franchise bug, not a budget bug, because gratitude is the weight token.

## 6 · Recognition, and the caps

**BUILT.** Two routes write recognition into one ledger.

| | The Wall | The Hearts economy |
|---|---|---|
| Allowance | `gratitude.base_budget` × stage multiplier: **100 to 500** in stock config | **30 flat** |
| Per-recipient | **1 send**, of any size | **10 units**, summed |
| Has a lock, a nonce, a tag, a place, refunds on reversal | no | **yes** |
| Can resolve by email, require a message, scale by stage, carry a heart | **yes** | no |

**Only the Wall has a client caller.** The Hearts route is reachable only by talking to the API
directly.

**The hole, and it is a governance hole rather than a budget one:** the per-recipient cap of 1 limits
**the count and never the size**, so a member at the top of the ladder can hand one person **500
voting weight in a single send and break no rule**.

**Coordinator's recommendation, OWED and awaiting the founder:** keep 100 × stage, drop the flat 30,
and replace both per-recipient caps with **a share of the giver's own allowance**, default 25%. A
share is stage-proof and edit-proof, it means the same thing at 100 and at 500, and **a cap of 1/N is
the sentence "at least N people" written as one number.** It also lands on R66: **if voice can never
be taken away, the only lever left is the rate at which it enters**, and a share is exactly that
lever where a count is not.

## 7 · The module economy

### How a builder gets paid today: they do not, and cannot

**BUILT: the measurement.** A use is a signed-in member getting a response under 400 from a route
under a non-core module's prefix. **It saturates**: one member, one module, one lunar cycle counts 1,
however often they open it and however much they write. Enforced twice, by a three-column primary key
and by an in-process set. **So noise earns nothing and nagging earns nothing, and the only way to
move the number is more different people.** Admin routes are excluded; refused requests are excluded;
the four core modules are not metered at all.

**OWED: everything after the measurement.** Three hard stops, measured on production 2026-08-29:

1. **There are no builders.** The hub's builder list is an empty frozen array and no module sets a
   `builtBy`. On purpose: the machinery ships owing nothing.
2. **The pool amount has no row**, and **CORRECTED 2026-08-29: the coordinator's evidence for this
   was from the WRONG DATABASE.** The "one row in total" figure was measured on the *village*
   production database; the *hub* holds **259 rows**. The conclusion survives — `pool.regen_per_cycle`
   is not among them and the variable writer is UPDATE-only, so no surface could create it — but it
   was right by luck. **Two products, two databases, and a claim about one measured on the other.**
   The admin page told an operator the pool "starts paying the cycle after somebody sets this in the
   admin UI", which **was false in every build that ever shipped.**
4. **AND A FOURTH NOBODY NAMED: migration 0227 has never been applied to the hub's production
   database.** `_migrations_applied` ends at `0226`, and none of the pool tables exist. **So the pool
   has never run at all, in either shape.**
3. **Nothing transfers, by design.** The last step is an admin button whose own docstring reads
   *"This is a NOTE, not an action... Nothing behind it can move a token."* There is no wallet in the
   codebase. A human downloads a CSV, sends $ReGen on Base by hand, and comes back to record that
   they say they did.

### The contradiction that must be settled first

**There are two pools, computed from two different numbers, and they disagree with each other and
with the contract.**

- **The village side** splits by **member reach**, saturating, capped at 1.0 per village, and
  **includes platform modules and recycles their share.** Its header says why: excluding them
  *"would be splitting a fixed sum among whoever remained, which quietly pays third-party builders
  for the platform's usage as well as their own."*
- **The hub side**, the one that would move money, splits by **how many villages run the module** —
  a binary count — and **drops any module without a builder record before computing the
  denominator**, so platform modules never enter it. **That is precisely the failure the village side
  names.**
- **Clause 14 promises payment proportional to how many members open it.** The hub has never called
  the reach endpoint. The anti-gaming design is not in the money path.

**R64 settles this in the village side's favour.**

### The economic model, RULED (R64)

> *[regen civics built modules pay out regen civics but have it go to the regen civics gratitude pool
> as the Game tokens $ReGen - it's intentional so that outside module builders are treated the same
> as regen civics core team acting on equal footing. One day a new organisation could spin up and
> have created more modules in the Games than groups are using than us and get more of the revenue...
> As the revenue regen civics core team is getting from regen-civics is then distributed to regen
> civics gratitude system to give out!]*

Four consequences, and the fourth is the point:

1. ReGen Civics earns on **exactly the same footing** as any outside builder. No privileged rate, no
   exemption.
2. What it earns is **not retained**. It flows into the ReGen Civics gratitude pool and is given out
   to its own community through the gratitude system.
3. **The recycling must be visible.** An author or a village should see the platform's share going
   back in rather than into a pocket. That transparency is the point rather than a nicety.
4. **The model is designed to be LOSABLE.** Another organisation building more-used modules should
   out-earn us, and that is a success condition. **This retires the coordinator's earlier framing of
   R59 as "it shrinks what third-party builders receive", which read the design as a cost.**

**From SEEDS, the two warnings that bear directly on this:**

- **A pool that only ever fills is a power centre in waiting.** At village scale a treasury that
  accumulates faster than it distributes becomes the thing everyone lobbies. SEEDS pairs every mint
  with a burn. **Ours grows without bound while nothing is paid out.**
- **Cap what any one channel may draw.** No single source should be able to supply most of what gets
  issued in a cycle, however well it is performing.

And the one SEEDS does differently, worth knowing rather than copying: **SEEDS pays its own builders
from a governed grant budget they compete for each cycle, not by metered usage.** Usage metering is
the better fit here because it rewards a module that keeps being useful rather than one that was
persuasive once, but it has the failure SEEDS avoids: **the modules a village most needs —
safeguarding, conflict resolution, accessibility, care of the least-active member — will never be the
most used.** Holding back a portion of the same pool for those is the answer.

## 8 · The token model

Four absolute rules, unchanged and canonical in `STEERING.md` §5: reads use TOTAL, writes touch
PRIVATE only, spend checks use PRIVATE only, and the private-to-public bridge is **one way**.

**Gratitude is minted from a faucet, not transferred between members.** It sat marked transferable
for eighty-five migrations while nothing read it; the build that closed the economy's loop would have
made recognition sellable. **A dormant column is an armed column.**

**The cap everyone believes bounds issuance bounds one door of at least four.** The admin mint cap
sees one faucet; seat payments, the gratitude pool and the library issue outside it. That is measured
and open with the founder.

## 9 · What is owed, in priority order

1. **Departure.** §3. There is no way to leave a village and the electorate grows monotonically. Admin
   power first, community confirmation vote later, high quorum and unity.
2. **The start of the Game.** §2. Three-member gate, issuance off until a proposal carries.
3. **Members governing admin powers.** §2. Visibility of every admin action, proposals carrying a set
   of changes, thresholds tiered by subject.
4. **Settling the two-pool contradiction** in favour of reach and recycling, per R64.
5. **A payout path**, or an honest statement that there is not one. Today the admin page tells an
   operator something untrue about what setting the pool will do.
6. **The gratitude caps**, once the founder rules on §6.
7. **Cycle windows as a fraction of a lunation**, not a count of days.
8. **A burn or a ceiling** against an unbounded pool.

## 10 · Where the rules actually live

- `shared/constitution.ts` — seventeen invariants, each with an `enforcedBy` pointer. **It says of
  itself that it is copy, not enforcement.** SEEDS inverts this: its Guide outranks its code. Ours
  does not, and a reader should know which they are looking at.
- `shared/gameVariables.ts` — every dial, with min, max, default and **ring** (who may change it).
- `shared/capabilities.ts` — every capability and the gate that decides it.
- `shared/modules.ts`, `docs/MODULE_LIBRARY_CONTRACT.md` — the module registry and the builder
  contract, whose versions must agree.
- `INTEGRATION_LEDGER.md` §8 — every founder ruling, verbatim, numbered, append-only.

**A rule that exists in only one of those is not a rule the product keeps.**

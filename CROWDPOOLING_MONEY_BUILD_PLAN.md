# Crowdpooling: the money half, build plan

**Date:** 2026-09-05
**Status, 2026-09-27:** superseded by `CROWDPOOL_PLAN.md`. The fund-channel build plan
that filled most of this file is held pending counsel (v1.2, 2026-09-27), and its full
text is kept outside the repo. What stays here are Rye's two rulings of 2026-09-05 on
standing decisions, which still hold.

---

## 1. What Rye ruled, and what it means for the two standing decisions

### Locked decision #1 is narrowed, not deleted

The original ban: "no platform token credits for crowdpooling, ever. The
`campaign_contributions` -> `user_token_ledger` path does not exist and must not be
added."

Rye, 2026-09-05: *"decision one bans using one of the four platform tokens for this.
I would agree that we issue a new type of token for this mechanism, that it's campaign
financial contributions that we're tracking."*

**So the ban on crediting $ReGen, $RGVoice, $RCVoice and $RCivics for a crowdpool
pledge STANDS.** What changes is that a fifth, separate token type now exists for
recording campaign financial contributions. It is not in the four-token model, it does
not touch `user_token_ledger`, and it gets its own ledger.

`CROWDPOOLING_PLATFORM_SPEC.md` decision #1 and Part F need an amendment recording this
narrowing, with the date and the reason. Do not edit the original text; append.

### Founder ruling R92 loses its hard block, keeps its default

R92 (2026-08-29, ADR-52): "there is no pre-issued treasury... build nothing that
assumes one", enforced by `server/tokenMintModel.test.ts:113`, which fails the build if
`drizzle/schema.ts` declares a table named `treasury` or `treasury_balances`.

Rye, 2026-09-05: *"some projects would actually like to set a treasury cap and
allowance, so having a hard rule that blocks this would block those projects, let's
remove this, but stay with the default that no max or pre-issued treasury exists."*

**Action:** remove the schema-name assertion from `tokenMintModel.test.ts`. Keep the
default: no treasury exists and no cap is set unless a project opts in. Replace the
banned-name test with one that asserts the DEFAULT, which is the thing actually worth
protecting: a project with no treasury configuration has no treasury row, no cap, and
no pre-issued supply. That is a stronger guard than a name ban and it does not block
the projects that want a cap.

A new ADR supersedes ADR-52 rather than editing it.

---

## 2. The rest of this plan

The fund channel is being redesigned with counsel as a member-owned cooperative; its
terms are not set and nothing here accepts money.

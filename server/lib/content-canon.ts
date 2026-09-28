/**
 * Canon facts: the stable, checkable truths about ReGen Civics that generated
 * copy is verified against (server/lib/content-verify.ts).
 *
 * This is deliberately SHORT. It is not a knowledge base and not a voice
 * guide (voice lives in the Worldview Pack, server/lib/worldview.ts). It only
 * holds facts a draft can be factually WRONG about, where being wrong in
 * public is expensive. The most common real-world failure is a token mix-up.
 *
 * Keep entries stable. If something here changes quarterly, it does not
 * belong here; the verifier would start flagging correct copy.
 *
 * 2026-09-27 (Phase 0): the fund facts are gone. The "fund" is now a
 * member-owned cooperative in design (shared/fund.ts COOP), and every
 * sentence about it is read from there, so a draft that claims a fund, a
 * return, a stake, a minimum or a formed cooperative contradicts canon and is
 * blocked.
 */
import { COOP } from "../../shared/fund";

/**
 * The crowdpool lane's binding wording (Phase 0 spec, 2026-09-27). Every
 * server surface that describes crowdpooling uses it verbatim: the crawler
 * prose, the public chat guide, the site guide. One copy, here, so they cannot
 * drift into calling crowdpooling an investment.
 */
export const CROWDPOOLING_WORDING =
  "Crowdpooling coordinates and accounts for what people bring to land projects: time, things, skills, land and money. " +
  "Money goes through outside partners each project holds, never through ReGen Civics. " +
  "The campaigns shown today are examples; real campaigns open when Season 2 starts crowdpooling.";

export const CANON_FACTS = `
- The cooperative: ${COOP.statement} Never write about it in the present tense as formed, operating, holding land or taking members, never name a legal structure or securities exemption, and never state a return, a price, a fee, a minimum, a stake or a payout of any kind. ${COOP.notAnOffer}
- ${COOP.entities}
- ReGen Civics builds the tools and runs the game land projects use today: the quest game, the seasonal incubator, crowdpooling, and on-chain governance via Hypha DAO on Base.
- The Game: governance token RGVoice (EARNED through participation, never
  purchased); economic token $ReGen; entry via quests, forum, seasons.
  ${COOP.tokensNote}
- $RCivics and RCVoice: ${COOP.coopTokens.rcivics} ${COOP.coopTokens.rcvoice}
- Token pairs must never be swapped: RGVoice/$ReGen belong to the Game;
  RCVoice/$RCivics come from the earlier fund design.
- Crowdpooling: ${CROWDPOOLING_WORDING}
- Contributions are recognized across nine forms of capital: financial,
  material, living, intellectual, experiential, social, cultural, spiritual,
  and health.
- HEIST impact framework (soil health, water, biodiversity, social fabric).
- The paths in: Land Projects (Evolve Your Project), Contributors
  (crowdpooling), Alliance Partners (Join the Alliance), Players (Play the
  Game). People interested in the cooperative tell us at /loi.
`.trim();

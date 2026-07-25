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
 */

export const CANON_FACTS = `
- The Fund: venture capital structure (intentional, legibility is the point);
  governance token RCVoice; economic token $RCivics; land-backed security;
  90% Unity Model prevents governance capture; HEIST impact framework
  (soil health, water, biodiversity, social fabric); on-chain transparency
  via Hypha DAO on Base.
- The Game: governance token RGVoice (EARNED through participation, never
  purchased); economic token $ReGen; entry via quests, forum, seasons.
- Token pairs must never be swapped: RCVoice/$RCivics belong to the Fund,
  RGVoice/$ReGen belong to the Game.
- Fund I/II take minority stakes (20-40%) in operating land projects.
- The four paths: Investors (Fund the Renaissance), Land Projects (Evolve
  Your Project), Alliance Partners (Join the Alliance), Players (Play the Game).
`.trim();

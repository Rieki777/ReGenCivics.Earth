/**
 * Video Tutor grounding context: the canonical framing of ReGen Civics the
 * tutor may draw on when a viewer's question reaches beyond the transcript.
 * Distilled from .ai/docs/DOMAIN-LANGUAGE.md and site copy. Keep this SHORT:
 * it rides every tutor prompt, so every sentence costs tokens on every ask.
 *
 * Worldview Pack hook: when the Mycelium M1 pack ships (see
 * HARVEST_MEMORY_LAYER_REVIEW_2026-07-16.md), replace this constant with
 * getVoiceProfile()/getConcept() from server/lib/worldview.ts and keep this
 * text as the fail-soft default.
 */
export const VIDEO_TUTOR_CORE_CONTEXT = [
  "ReGen Civics is a fund and an in-real-life game supporting regenerative land projects and the Regenerative Renaissance: a movement to heal ourselves, our earth, our communities, and our bioregions.",
  "The framing question at the heart of everything: what if healing ourselves and our Earth is actually a fun and Infinite Game?",
  "Two anchors hold up one bridge. The Fund (tokens: RCVoice for governance, $RCivics for economics) speaks to investors and capital allocators; it is in formation, not yet a legal entity, and target launch is 2027, so never describe it in the present tense as operating. The Game (tokens: RGVoice for governance, $ReGen for economics) speaks to players, land projects, and alliance partners. People can play the Game without touching the Fund, and vice versa.",
  "Players earn $ReGen by playing: completing Quests, receiving gratitude, joining seasons. Quests are self-contained activities, many completable today. Seasons are 6-month cohort containers aligned with equinoxes and solstices.",
  "Citizenship grows in tiers: Visitor (browsing), Friend (signed in, can post and quest), Citizen (contribution threshold met, can vote and propose), Steward (sustained contributor, can facilitate).",
  "Contribution is recognized across the 9 Roots of Capital: intellectual, social, material, financial, living, cultural, spiritual, experiential, and health.",
  "Good first steps for a new player: sign in, take the Welcome Aboard quest, introduce yourself in the community forum, and explore quests for your bioregion.",
].join("\n");

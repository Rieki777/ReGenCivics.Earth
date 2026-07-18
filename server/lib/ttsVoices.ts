/**
 * Signature voice registry: two uniquely designed voices per speaking
 * character, spoken through the hosted TTS path (Qwen3-TTS on DeepInfra,
 * behind TTS_API_KEY). The Kokoro browser voices in
 * client/src/components/companion/kokoroVoices.ts stay available everywhere;
 * these are the characters' own voices on top.
 *
 * Each entry carries three layers:
 *  - `design`: the full voice description. This is what generated the audition
 *    clip (Qwen3-TTS VoiceDesign) and it is the source of truth for the voice's
 *    character. When a designed clip is approved, upload it once to
 *    DeepInfra (/v1/voices/add), then map key -> voice_id in TTS_VOICE_MAP and
 *    the voice becomes fully unique via cloning.
 *  - `preset` + `instruct`: the day-one fallback. Until a voice_id exists in
 *    TTS_VOICE_MAP, synthesis uses one of Qwen3-TTS's nine preset timbres
 *    styled by the instruct line. Consistent timbre, right delivery, zero
 *    setup beyond TTS_API_KEY.
 *  - Display metadata for the voice picker.
 *
 * Persona ids match shared/companions.ts (CompanionPersonaId plus "ships-cook").
 */

export type SignatureVoice = {
  /** Stable key, "<personaId>/<voice-name>". The client stores "hosted:<key>". */
  key: string;
  personaId: string;
  /** Display name in the picker. */
  label: string;
  /** A few words of character, shown next to the name. */
  tone: string;
  gender: "female" | "male";
  /** Qwen3-TTS preset timbre used until TTS_VOICE_MAP holds a cloned voice_id. */
  preset: string;
  /** Delivery direction sent with every line. */
  instruct: string;
  /** The VoiceDesign description that defines (and generated) this voice. */
  design: string;
};

export const SIGNATURE_VOICES: SignatureVoice[] = [
  // ── the First Mate ──────────────────────────────────────────────────────────
  {
    key: "first-mate/marin",
    personaId: "first-mate",
    label: "Marin",
    tone: "bright, seasoned sailor",
    gender: "female",
    preset: "Vivian",
    instruct: "A confident woman in her thirties who has spent years on the water. Bright, warm, a little windblown. Speaks like she is charting a course with a friend.",
    design: "A woman in her early thirties with a bright, clear voice roughened at the edges by salt air and years of calling across a deck. Confident and warm, quick to smile, with the easy rhythm of someone telling you the route while the tide is coming in.",
  },
  {
    key: "first-mate/brook",
    personaId: "first-mate",
    label: "Brook",
    tone: "soft and steady water",
    gender: "female",
    preset: "Serena",
    instruct: "A gentle, unhurried woman's voice, low and soothing, like moving water. Speaks slowly and kindly, never rushed.",
    design: "A gentle woman's voice in her late twenties, low and soft like a creek under trees. Unhurried and soothing, with small pauses that feel like listening. The voice of someone who walks slowly on purpose.",
  },
  // ── the Harbormaster ────────────────────────────────────────────────────────
  {
    key: "harbormaster/moss",
    personaId: "harbormaster",
    label: "Moss",
    tone: "low, unhurried, sure",
    gender: "male",
    preset: "Uncle_Fu",
    instruct: "An older man with a low, mellow, unhurried voice. Plainspoken and sure, a dry warmth underneath. Never rushes a sentence.",
    design: "A man in his sixties with a low, mellow voice like an old wooden pier: weathered, solid, quietly warm. Plainspoken, unhurried, with the dry humor of someone who has seen every kind of boat come in and tie up wrong.",
  },
  {
    key: "harbormaster/gale",
    personaId: "harbormaster",
    label: "Gale",
    tone: "brisk and weathered",
    gender: "male",
    preset: "Ryan",
    instruct: "A brisk, energetic man's voice with strong rhythm, weathered by wind. Direct and friendly, like calling instructions across a busy dock.",
    design: "A man in his forties with a brisk, rhythmic voice built for carrying across a windy dock. Direct, warm, a little gravelly, with momentum in every sentence. He sounds like he is already walking while he talks to you.",
  },
  // ── the Gardener ────────────────────────────────────────────────────────────
  {
    key: "gardener/cedar",
    personaId: "gardener",
    label: "Cedar",
    tone: "gentle and sunlit",
    gender: "male",
    preset: "Aiden",
    instruct: "A gentle, sunny man's voice, clear and kind, speaking softly as if standing in a garden. Patient, never loud.",
    design: "A man in his thirties with a clear, sunlit voice, gentle and open. He talks the way you tend seedlings: softly, patiently, with real delight in small things. There is a smile in the voice almost all the time.",
  },
  {
    key: "gardener/loam",
    personaId: "gardener",
    label: "Loam",
    tone: "slow, earthy, deep",
    gender: "male",
    preset: "Uncle_Fu",
    instruct: "A deep, slow, earthy man's voice. Grounded and calm, speaking with long easy pauses like someone with soil on his hands and nowhere else to be.",
    design: "A deep, slow voice of a man who has worked land his whole life. Earthy and calm, with long comfortable pauses, like rich soil turning over. Every word is placed the way you plant something you intend to keep.",
  },
  // ── the Weaver ──────────────────────────────────────────────────────────────
  {
    key: "weaver/wren",
    personaId: "weaver",
    label: "Wren",
    tone: "light, quick, warm",
    gender: "female",
    preset: "Vivian",
    instruct: "A light, quick, warm woman's voice, delighted and curious, weaving threads of thought aloud. Musical but grounded.",
    design: "A woman's voice, light and quick like a small bird, warm and curious. She thinks in connections and you can hear it: little rises of delight when threads come together. Musical without ever floating away.",
  },
  {
    key: "weaver/indigo",
    personaId: "weaver",
    label: "Indigo",
    tone: "calm, deep, deliberate",
    gender: "female",
    preset: "Serena",
    instruct: "A calm, deep woman's voice, deliberate and warm, like someone weaving by lamplight. Steady pace, quiet confidence.",
    design: "A woman with a calm, deep voice, deliberate as a loom: steady rhythm, quiet confidence, warmth held low. She sounds like evening lamplight and long-planned work coming true.",
  },
  // ── the Flagkeeper ──────────────────────────────────────────────────────────
  {
    key: "flagkeeper/ember",
    personaId: "flagkeeper",
    label: "Ember",
    tone: "storyteller warmth",
    gender: "female",
    preset: "Serena",
    instruct: "A warm woman's voice with storyteller pacing, like telling tales by a fire. Draws you in, holds small pauses, never hurries.",
    design: "A woman in her fifties with a warm, low, storyteller's voice, embers rather than flame. She holds pauses like she is threading a needle, and every story sounds like it has been carried a long way to reach you.",
  },
  {
    key: "flagkeeper/scarlet",
    personaId: "flagkeeper",
    label: "Scarlet",
    tone: "bright and proud",
    gender: "female",
    preset: "Vivian",
    instruct: "A bright, proud woman's voice with a flag-snap crispness. Warm underneath, ceremonial when it matters.",
    design: "A bright, proud woman's voice with crisp edges, like a flag snapping in clean wind. Ceremony without stiffness: underneath the crispness there is real warmth for every ship that joins.",
  },
  // ── Sylva ───────────────────────────────────────────────────────────────────
  {
    key: "sylva/fern",
    personaId: "sylva",
    label: "Fern",
    tone: "hushed forest calm",
    gender: "female",
    preset: "Serena",
    instruct: "A hushed, calm woman's voice like speaking under tall trees. Soft, wise, unhurried, with quiet wonder.",
    design: "A woman's voice that sounds like the quiet under tall trees: hushed, calm, softly resonant. Wise without weight, with a thread of wonder, as if every question you ask her is a path into the forest she already loves.",
  },
  {
    key: "sylva/aurelia",
    personaId: "sylva",
    label: "Aurelia",
    tone: "luminous and playful",
    gender: "female",
    preset: "Vivian",
    instruct: "A luminous, playful woman's voice, light-footed and encouraging, like sunlight moving through leaves. Quick to delight.",
    design: "A luminous, playful woman's voice, light moving through leaves. Quick to delight, encouraging, a game designer's spark: she makes the next step sound like the fun part, because to her it is.",
  },
  // ── the Ship's Cook ─────────────────────────────────────────────────────────
  {
    key: "ships-cook/sage",
    personaId: "ships-cook",
    label: "Sage",
    tone: "hearty and laughing",
    gender: "female",
    preset: "Serena",
    instruct: "A hearty, warm woman's voice with a laugh close to the surface. Talks like she is cooking while she speaks, generous and full of appetite.",
    design: "A hearty woman's voice with a laugh always close to the surface, generous and warm like a full galley at dinner. She talks with her hands even when you cannot see them, and every sentence smells faintly of something good on the stove.",
  },
  {
    key: "ships-cook/clove",
    personaId: "ships-cook",
    label: "Clove",
    tone: "cozy and spiced",
    gender: "female",
    preset: "Vivian",
    instruct: "A cozy, intimate woman's voice, low and a little spiced, like sharing a secret recipe. Warm, close, amused.",
    design: "A cozy, intimate woman's voice, low with a hint of spice, like being told a family recipe that is technically a secret. Close-up warmth, gentle amusement, and complete confidence that you will love what she is making.",
  },
];

/** The registry entry for a stored voice key, or null. */
export function signatureVoiceByKey(key: string): SignatureVoice | null {
  return SIGNATURE_VOICES.find((v) => v.key === key) ?? null;
}

/** The signature voices offered to one persona's picker. */
export function signatureVoicesForPersona(personaId: string): SignatureVoice[] {
  return SIGNATURE_VOICES.filter((v) => v.personaId === personaId);
}

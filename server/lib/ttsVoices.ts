/**
 * Signature voice registry: two uniquely designed voices per speaking
 * character, one female and one male, spoken through the hosted TTS path
 * (Qwen3-TTS on DeepInfra, behind TTS_API_KEY + TTS_VOICES_LIVE). The Kokoro
 * browser voices in client/src/components/companion/kokoroVoices.ts stay
 * available everywhere and stay the default; these are extra options on top,
 * and none of them is a default until Rye promotes one.
 *
 * Roster per Rye's audition feedback (2026-07-17): Brook won over Marin, Moss
 * confirmed, and every character offers one voice of each gender.
 *
 * Each entry carries three layers:
 *  - `design`: the full voice description. This is what generates the audition
 *    clip (Qwen3-TTS VoiceDesign) and it is the source of truth for the voice's
 *    character. When a designed clip is approved, upload it once to
 *    DeepInfra (/v1/voices/add), then map key -> voice_id in TTS_VOICE_MAP and
 *    the voice becomes fully unique via cloning.
 *  - `preset` + `instruct`: the fallback until a voice_id exists in
 *    TTS_VOICE_MAP: one of Qwen3-TTS's nine preset timbres styled by the
 *    instruct line. Consistent timbre, right delivery, zero setup.
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
    key: "first-mate/brook",
    personaId: "first-mate",
    label: "Brook",
    tone: "soft and steady water",
    gender: "female",
    preset: "Serena",
    instruct: "A gentle, unhurried woman's voice, low and soothing, like moving water. Speaks slowly and kindly, never rushed.",
    design: "A gentle woman's voice in her late twenties, low and soft like a creek under trees. Unhurried and soothing, with small pauses that feel like listening. The voice of someone who walks slowly on purpose.",
  },
  {
    key: "first-mate/tide",
    personaId: "first-mate",
    label: "Tide",
    tone: "calm sailor at dusk",
    gender: "male",
    preset: "Aiden",
    instruct: "A calm, capable man's voice, warm and unhurried, like a sailor talking at dusk after a good day on the water. Never rushed, never loud.",
    design: "A man in his mid thirties with a calm, capable voice, warm and a little salt-worn, like a sailor coiling rope at dusk. Unhurried, sure of the route, with the easy kindness of someone who has plenty of time for you.",
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
    key: "harbormaster/haven",
    personaId: "harbormaster",
    label: "Haven",
    tone: "steady harbor warmth",
    gender: "female",
    preset: "Serena",
    instruct: "A steady, welcoming woman's voice in her fifties, low and sure, with dry warmth. Plainspoken and calm, like the harbor settling at nightfall.",
    design: "A woman in her fifties with a steady, low voice, sure as a harbor wall at nightfall. Welcoming without fuss, plainspoken, a dry warmth underneath, the voice of someone who has tied off a thousand lines and will happily tie off yours.",
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
    key: "gardener/willow",
    personaId: "gardener",
    label: "Willow",
    tone: "soft as leaves",
    gender: "female",
    preset: "Serena",
    instruct: "A soft, graceful woman's voice, airy and kind, like wind through leaves. Patient and encouraging, speaking slowly.",
    design: "A woman's voice soft and graceful as willow leaves in a light wind. Airy, kind, patient, with gentle encouragement in every phrase, like someone kneeling beside you in the garden showing you where the roots want to go.",
  },
  // ── the Weaver ──────────────────────────────────────────────────────────────
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
  {
    key: "weaver/alder",
    personaId: "weaver",
    label: "Alder",
    tone: "thoughtful and measured",
    gender: "male",
    preset: "Aiden",
    instruct: "A thoughtful, warm man's voice, measured and quietly delighted, like someone tracing connections between threads as he speaks.",
    design: "A man's voice, thoughtful and warm, measured like careful handwork. There is quiet delight under the calm, the sound of someone who sees how the threads connect and loves showing you the pattern one strand at a time.",
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
    key: "flagkeeper/banner",
    personaId: "flagkeeper",
    label: "Banner",
    tone: "proud and ceremonial",
    gender: "male",
    preset: "Ryan",
    instruct: "A proud, clear man's voice with quiet ceremony and real warmth, steady as a flag raised at first light. Unhurried, dignified, kind.",
    design: "A man's voice, proud and clear, with the quiet ceremony of a flag raised at first light. Steady and dignified without stiffness, and under the ceremony a real warmth for every ship whose story he gets to keep.",
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
    key: "sylva/rowan",
    personaId: "sylva",
    label: "Rowan",
    tone: "quiet forest guide",
    gender: "male",
    preset: "Aiden",
    instruct: "A quiet, patient man's voice, low and full of wonder, like a guide reading tracks under tall trees. Speaks softly, never hurries.",
    design: "A man's voice low and quiet as the forest floor, patient and full of soft wonder. He speaks like a guide reading tracks under tall trees, pointing things out gently, certain the woods will still be there when you catch up.",
  },
  // ── the Ship's Cook ─────────────────────────────────────────────────────────
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
  {
    key: "ships-cook/barley",
    personaId: "ships-cook",
    label: "Barley",
    tone: "big-hearted galley cook",
    gender: "male",
    preset: "Ryan",
    instruct: "A big-hearted man's voice with a rolling laugh underneath, generous and hearty, like a cook feeding a full galley. Warm and unhurried.",
    design: "A big-hearted man's voice with a rolling laugh always underneath, hearty and generous as a full galley at dinner. He sounds like fresh bread and a ladle in hand, and every sentence is an invitation to sit down and eat.",
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

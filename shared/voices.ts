/**
 * Voice gender matching for the speaking companions.
 *
 * Every persona has a gender (the First Mate is a woman, the Harbormaster is a
 * man), and the voice a member picks for them should match. The Web Speech API
 * gives us no gender field on SpeechSynthesisVoice: only name, lang, voiceURI,
 * and localService. So we derive gender from the voice NAME using a curated
 * registry of the well-known platform voices, plus a couple of safe patterns.
 *
 * A voice we do not recognise stays unknown (null) rather than being guessed at.
 * Unknown voices are hidden from a gendered persona's list, unless hiding them
 * would leave the member with nothing to choose (see filterVoicesForGender).
 */

/** A persona's gender. "neutral" personas (the Fox, the Lantern-Bearer) take any voice. */
export type VoiceGender = "female" | "male" | "neutral";

/**
 * Known female voice names across macOS/iOS, Windows/Edge, Chrome, and Android.
 * Matched case-insensitively against the tokens of the voice name, so
 * "Microsoft Zira - English (United States)" resolves via "zira".
 */
const FEMALE_VOICES = [
  // macOS / iOS
  "samantha", "karen", "moira", "tessa", "fiona", "victoria", "allison", "ava",
  "susan", "zoe", "nicky", "kathy", "serena", "veena", "alice", "amelie", "amélie",
  "anna", "ellen", "joana", "kanya", "kyoko", "lekha", "luciana", "mariska",
  "melina", "milena", "monica", "mónica", "nora", "paulina", "sara", "satu",
  "sin-ji", "ting-ting", "yelda", "yuna", "zosia", "zuzana", "carmit", "damayanti",
  "ioana", "laura", "lesya", "linh", "marie", "meijia", "montse", "nikos", "petra",
  "sandy", "shelley", "grandma", "flo", "rocko",
  // Windows / Edge
  "zira", "hazel", "heera", "catherine", "michelle", "jenny", "aria", "ana",
  "sonia", "natasha", "clara", "libby", "maisie", "linda", "eva", "emily",
  // Chrome / Google + Android
  "google uk english female", "google us english",
];

/** Known male voice names across the same platforms. */
const MALE_VOICES = [
  // macOS / iOS
  "alex", "daniel", "fred", "tom", "aaron", "rishi", "oliver", "thomas", "jorge",
  "diego", "juan", "luca", "maged", "xander", "yuri", "carlos", "felipe", "gordon",
  "bruce", "junior", "ralph", "reed", "eddy", "grandpa", "jacques", "lee", "magnus",
  "martin", "nicolas", "otoya", "hattori", "paul", "rocco", "yannick",
  // Windows / Edge
  "david", "mark", "george", "richard", "james", "ryan", "guy", "eric",
  "christopher", "roger", "steffan", "liam", "william", "ravi", "brian",
  // Chrome / Google
  "google uk english male",
];

function tokens(name: string): string[] {
  return name.toLowerCase().split(/[^a-zà-ÿ-]+/i).filter(Boolean);
}

/**
 * Derive a voice's gender from its name. Returns null when we do not recognise
 * it, so callers can decide what to do rather than acting on a guess.
 */
export function voiceGender(name: string): "female" | "male" | null {
  if (!name) return null;
  const lower = name.toLowerCase();

  // Explicit labels win. Check female first; note \b keeps "female" from also
  // matching the male pattern, but the ordering makes the intent obvious.
  if (/\bfemale\b/.test(lower) || /#female/.test(lower)) return "female";
  if (/\bmale\b/.test(lower) || /#male/.test(lower)) return "male";

  // Full-name matches (e.g. "Google UK English Female" handled above; this
  // catches multi-word registry entries like "google us english").
  for (const known of FEMALE_VOICES) {
    if (known.includes(" ") && lower.includes(known)) return "female";
  }
  for (const known of MALE_VOICES) {
    if (known.includes(" ") && lower.includes(known)) return "male";
  }

  // Token matches (e.g. "Microsoft Zira - English (United States)" -> "zira").
  const parts = tokens(name);
  for (const t of parts) {
    if (FEMALE_VOICES.includes(t)) return "female";
    if (MALE_VOICES.includes(t)) return "male";
  }
  return null;
}

/** True when a voice is an acceptable choice for a persona of this gender. */
export function voiceMatchesGender(name: string, personaGender: VoiceGender): boolean {
  if (personaGender === "neutral") return true;
  return voiceGender(name) === personaGender;
}

type NamedVoice = { name: string; lang?: string };

/**
 * The voices a member may choose for a persona of this gender.
 *
 * Strict by default: a woman persona only offers woman voices. The safety net
 * matters though: some devices (a bare Linux box, some Android builds) expose
 * only voices we cannot classify, and an empty dropdown would trap the member
 * with no way to pick anything. So when the strict filter finds nothing, we hand
 * back every voice instead.
 */
export function filterVoicesForGender<T extends NamedVoice>(voices: T[], gender: VoiceGender): T[] {
  if (gender === "neutral") return voices;
  const matched = voices.filter((v) => voiceMatchesGender(v.name, gender));
  return matched.length > 0 ? matched : voices;
}

/**
 * Order voices so the most useful come first: the page's language ahead of other
 * languages, then locally-installed voices, then alphabetical. Pure and stable.
 */
export function sortVoices<T extends NamedVoice & { localService?: boolean }>(
  voices: T[],
  preferredLangPrefix = "en",
): T[] {
  const rank = (v: T) => {
    const isLang = (v.lang ?? "").toLowerCase().startsWith(preferredLangPrefix) ? 0 : 1;
    const isLocal = v.localService === false ? 1 : 0;
    return isLang * 2 + isLocal;
  };
  return [...voices].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

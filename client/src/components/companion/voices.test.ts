/**
 * Voice matching tests.
 *
 * The product promise is simple: a woman character only ever speaks in a woman's
 * voice, and a man in a man's. The Web Speech API gives us no gender field, so
 * everything rests on the name registry and the resolver. These pin down the
 * behaviour that matters: correct classification across platforms, a strict
 * filter, the safety net that stops a member being trapped with an empty
 * dropdown, and the self-heal when a saved voice no longer fits the character.
 */
import { describe, it, expect } from "vitest";
import {
  voiceGender, voiceMatchesGender, filterVoicesForGender, sortVoices,
} from "@shared/voices";
import { COMPANION_PERSONAS, SHIPS_COOK } from "@shared/companions";
import { GUIDE_ARCHETYPES } from "@shared/guide";
import { resolveVoice } from "./useVoice";

// Minimal stand-ins for SpeechSynthesisVoice; only the fields we read.
function v(name: string, lang = "en-US", voiceURI = name, localService = true) {
  return { name, lang, voiceURI, localService, default: false } as SpeechSynthesisVoice;
}

describe("voiceGender", () => {
  it("classifies well-known macOS/iOS voices", () => {
    expect(voiceGender("Samantha")).toBe("female");
    expect(voiceGender("Karen")).toBe("female");
    expect(voiceGender("Moira")).toBe("female");
    expect(voiceGender("Alex")).toBe("male");
    expect(voiceGender("Daniel")).toBe("male");
    expect(voiceGender("Fred")).toBe("male");
  });

  it("classifies Windows voices from their full platform names", () => {
    expect(voiceGender("Microsoft Zira - English (United States)")).toBe("female");
    expect(voiceGender("Microsoft Hazel Desktop - English (Great Britain)")).toBe("female");
    expect(voiceGender("Microsoft David - English (United States)")).toBe("male");
    expect(voiceGender("Microsoft Mark - English (United States)")).toBe("male");
  });

  it("reads explicit labels, and 'female' is never mistaken for 'male'", () => {
    expect(voiceGender("Google UK English Female")).toBe("female");
    expect(voiceGender("Google UK English Male")).toBe("male");
    // The substring trap: "female" contains "male".
    expect(voiceGender("English Female")).toBe("female");
    expect(voiceGender("en-us-x-sfg#female_1")).toBe("female");
    expect(voiceGender("en-us-x-sfg#male_2")).toBe("male");
  });

  it("returns null for voices it does not recognise rather than guessing", () => {
    expect(voiceGender("Whisper")).toBeNull();
    expect(voiceGender("Albert")).toBeNull();
    expect(voiceGender("")).toBeNull();
  });
});

describe("voiceMatchesGender", () => {
  it("matches a character to voices of the same gender", () => {
    expect(voiceMatchesGender("Samantha", "female")).toBe(true);
    expect(voiceMatchesGender("Samantha", "male")).toBe(false);
    expect(voiceMatchesGender("Daniel", "male")).toBe(true);
    expect(voiceMatchesGender("Daniel", "female")).toBe(false);
  });

  it("lets a neutral character take any voice", () => {
    expect(voiceMatchesGender("Samantha", "neutral")).toBe(true);
    expect(voiceMatchesGender("Daniel", "neutral")).toBe(true);
    expect(voiceMatchesGender("Unrecognised Voice", "neutral")).toBe(true);
  });

  it("keeps unknown voices out of a gendered character's list", () => {
    expect(voiceMatchesGender("Whisper", "female")).toBe(false);
    expect(voiceMatchesGender("Whisper", "male")).toBe(false);
  });
});

describe("filterVoicesForGender", () => {
  const voices = [v("Samantha"), v("Daniel"), v("Karen"), v("Alex"), v("Whisper")];

  it("offers a woman character only women's voices", () => {
    const out = filterVoicesForGender(voices, "female").map((x) => x.name);
    expect(out).toEqual(["Samantha", "Karen"]);
  });

  it("offers a man character only men's voices", () => {
    const out = filterVoicesForGender(voices, "male").map((x) => x.name);
    expect(out).toEqual(["Daniel", "Alex"]);
  });

  it("offers a neutral character everything", () => {
    expect(filterVoicesForGender(voices, "neutral")).toHaveLength(5);
  });

  it("falls back to every voice rather than trapping a member with an empty list", () => {
    // A device whose voices we cannot classify at all (some Linux/Android builds).
    const unknown = [v("Whisper"), v("eSpeak")];
    expect(filterVoicesForGender(unknown, "female").map((x) => x.name)).toEqual(["Whisper", "eSpeak"]);
  });
});

describe("sortVoices", () => {
  it("puts the page's language first, then sorts by name", () => {
    const out = sortVoices([v("Zoe", "en-US"), v("Amelie", "fr-FR"), v("Karen", "en-GB")]).map((x) => x.name);
    expect(out.slice(0, 2)).toEqual(["Karen", "Zoe"]);
    expect(out[2]).toBe("Amelie");
  });
});

describe("every speaking character declares a gender", () => {
  it("covers all form companions", () => {
    for (const persona of Object.values(COMPANION_PERSONAS)) {
      expect(["female", "male", "neutral"]).toContain(persona.gender);
    }
    // Spot-check the ones whose portraits fix their gender.
    expect(COMPANION_PERSONAS["first-mate"].gender).toBe("female");
    expect(COMPANION_PERSONAS.harbormaster.gender).toBe("male");
    expect(COMPANION_PERSONAS.gardener.gender).toBe("male");
    expect(COMPANION_PERSONAS.weaver.gender).toBe("female");
  });

  it("covers the chat personas and the Guide faces", () => {
    expect(SHIPS_COOK.gender).toBe("female");
    for (const a of GUIDE_ARCHETYPES) {
      expect(["female", "male", "neutral"]).toContain(a.gender);
    }
    // The androgynous Lantern-Bearer and the Fox take any voice; the
    // Grandmother and the Wanderer are fixed.
    expect(GUIDE_ARCHETYPES.find((a) => a.key === "guide-archetype-2")!.gender).toBe("female");
    expect(GUIDE_ARCHETYPES.find((a) => a.key === "guide-archetype-4")!.gender).toBe("male");
  });
});

describe("resolveVoice", () => {
  const voices = [v("Samantha"), v("Daniel"), v("Karen"), v("Alex")];

  it("honours a saved choice that still fits the character", () => {
    expect(resolveVoice(voices, "female", "Karen")?.name).toBe("Karen");
  });

  it("drops a saved voice that no longer matches the character and re-matches", () => {
    // The member swapped their Guide's face from the Grandmother to the Wanderer;
    // the woman's voice they had saved must not follow.
    const picked = resolveVoice(voices, "male", "Karen");
    expect(picked?.name).not.toBe("Karen");
    expect(voiceGender(picked!.name)).toBe("male");
  });

  it("ignores a saved voice this device does not have", () => {
    const picked = resolveVoice(voices, "female", "SomeVoiceFromAnotherLaptop");
    expect(picked).toBeTruthy();
    expect(voiceGender(picked!.name)).toBe("female");
  });

  it("falls back to a gender match when nothing is saved", () => {
    expect(voiceGender(resolveVoice(voices, "male", null)!.name)).toBe("male");
  });

  it("returns null when the device has no voices at all", () => {
    expect(resolveVoice([], "female", null)).toBeNull();
  });
});

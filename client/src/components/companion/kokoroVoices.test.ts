/**
 * The curated Kokoro voice registry and the signature voice registry: the
 * pure parts of the v2 voice layer. Engine loading and playback are browser
 * work and are covered by the graceful-fallback design instead (any failure
 * lands on the device speechSynthesis path that voices.test.ts covers).
 */
import { describe, expect, it } from "vitest";
import {
  CURATED_VOICES, curatedVoiceById, curatedVoicesFor, defaultVoiceFor, isKokoroVoiceId, KOKORO_PREFIX,
} from "./kokoroVoices";
import { HOSTED_PREFIX, hostedVoiceKey, isHostedVoiceId } from "./hostedVoices";
import { SIGNATURE_VOICES, signatureVoiceByKey, signatureVoicesForPersona } from "../../../../server/lib/ttsVoices";
import { COMPANION_PERSONAS, SHIPS_COOK } from "@shared/companions";

describe("curated Kokoro registry", () => {
  it("offers the five voices Rye chose, ids namespaced and unique", () => {
    expect(CURATED_VOICES.map((v) => v.kokoroId).sort()).toEqual(
      ["af_bella", "am_puck", "bf_emma", "bm_fable", "bm_george"],
    );
    const ids = CURATED_VOICES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const v of CURATED_VOICES) {
      expect(v.id).toBe(`${KOKORO_PREFIX}${v.kokoroId}`);
      expect(isKokoroVoiceId(v.id)).toBe(true);
    }
  });

  it("keeps every voice available to every character, natural fits first", () => {
    for (const gender of ["female", "male", "neutral"] as const) {
      expect(curatedVoicesFor(gender)).toHaveLength(CURATED_VOICES.length);
    }
    expect(curatedVoicesFor("female")[0]!.gender).toBe("female");
    expect(curatedVoicesFor("male")[0]!.gender).toBe("male");
  });

  it("gives gendered personas a matching default", () => {
    expect(defaultVoiceFor("female").gender).toBe("female");
    expect(defaultVoiceFor("male").gender).toBe("male");
    expect(defaultVoiceFor("neutral")).toBeTruthy();
  });

  it("resolves stored ids and rejects strangers", () => {
    expect(curatedVoiceById("kokoro:bf_emma")?.label).toBe("Emma");
    expect(curatedVoiceById("kokoro:af_nova")).toBeNull();
    expect(curatedVoiceById(null)).toBeNull();
    expect(isKokoroVoiceId("Microsoft Zira - English (United States)")).toBe(false);
  });
});

describe("hosted voice ids", () => {
  it("recognises and unwraps the hosted prefix", () => {
    const id = `${HOSTED_PREFIX}first-mate/marin`;
    expect(isHostedVoiceId(id)).toBe(true);
    expect(hostedVoiceKey(id)).toBe("first-mate/marin");
    expect(isHostedVoiceId("kokoro:af_bella")).toBe(false);
  });
});

describe("signature voice registry", () => {
  it("gives every speaking character exactly two signature voices", () => {
    const personaIds = [...Object.keys(COMPANION_PERSONAS), SHIPS_COOK.id];
    for (const personaId of personaIds) {
      const voices = signatureVoicesForPersona(personaId);
      expect(voices, personaId).toHaveLength(2);
    }
    expect(SIGNATURE_VOICES).toHaveLength(personaIds.length * 2);
  });

  it("keys are unique, namespaced by persona, and resolvable", () => {
    const keys = SIGNATURE_VOICES.map((v) => v.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const v of SIGNATURE_VOICES) {
      expect(v.key.startsWith(`${v.personaId}/`)).toBe(true);
      expect(signatureVoiceByKey(v.key)).toBe(v);
      expect(v.design.length).toBeGreaterThan(40);
      expect(v.instruct.length).toBeGreaterThan(20);
      expect(["female", "male"]).toContain(v.gender);
    }
    expect(signatureVoiceByKey("first-mate/nobody")).toBeNull();
  });

  it("offers every character one female and one male signature voice", () => {
    // Rye's 2026-07-17 direction: the two designed options per character are
    // one of each gender, whatever the character's own gender is.
    const personaIds = [...Object.keys(COMPANION_PERSONAS), SHIPS_COOK.id];
    for (const personaId of personaIds) {
      const genders = signatureVoicesForPersona(personaId).map((v) => v.gender).sort();
      expect(genders, personaId).toEqual(["female", "male"]);
    }
  });
});

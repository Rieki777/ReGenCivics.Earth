/**
 * What a spoken phrase can do on the week board, beyond dropping into a text box.
 * Stage names pick a chip. Spoken punctuation marks become the mark on a chip.
 */
import { PROJECT_PHASES, type ProjectPhase } from "@shared/sessionBoard";

const PHASE_WORD = new Map<string, ProjectPhase>(
  PROJECT_PHASES.flatMap((phase) => [
    [phase.key, phase.key],
    [phase.title.toLowerCase(), phase.key],
  ]),
);

/** The latest stage word in the phrase, if one was spoken as its own word. */
export function phaseFromSpeech(raw: string): ProjectPhase | null {
  const words = raw
    .toLowerCase()
    .replace(/[.,!?;:]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const hit = PHASE_WORD.get(words[i]);
    if (hit) return hit;
  }
  return null;
}

/**
 * Turn a spoken punctuation command at the end of a chip into the mark.
 * "period" in the middle of a sentence is left as a word.
 */
export function foldSpokenPunctuation(raw: string): string {
  return raw
    .replace(/\s+exclamation point$/i, "!")
    .replace(/\s+exclamation mark$/i, "!")
    .replace(/\s+question mark$/i, "?")
    .replace(/\s+period$/i, ".")
    .replace(/\s+comma$/i, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
}

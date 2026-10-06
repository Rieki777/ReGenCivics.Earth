import { describe, expect, it } from "vitest";
import { foldSpokenPunctuation, phaseFromSpeech } from "./spokenStage";

describe("spoken stage words", () => {
  it("picks the stage from the word itself", () => {
    expect(phaseFromSpeech("sprout")).toBe("sprout");
    expect(phaseFromSpeech("Sprout.")).toBe("sprout");
    expect(phaseFromSpeech("we are at fruit")).toBe("fruit");
  });

  it("uses the latest stage word and ignores lookalikes", () => {
    expect(phaseFromSpeech("seed, no, grow")).toBe("grow");
    expect(phaseFromSpeech("the sprouts are up")).toBeNull();
    expect(phaseFromSpeech("fruit trees")).toBe("fruit");
    expect(phaseFromSpeech("")).toBeNull();
  });
});

describe("spoken punctuation on a chip", () => {
  it("folds a trailing punctuation command and leaves the word in a sentence", () => {
    expect(foldSpokenPunctuation("The road washes out period")).toBe("The road washes out.");
    expect(foldSpokenPunctuation("Is the well in question mark")).toBe("Is the well in?");
    expect(foldSpokenPunctuation("A long time period of rain")).toBe("A long time period of rain");
  });
});

import { describe, expect, it } from "vitest";
import {
  hasCompanionTranscript,
  parseCompanionTranscript,
  speakerLabelForRole,
} from "./companionTranscript";

describe("speakerLabelForRole", () => {
  it("maps known roles", () => {
    expect(speakerLabelForRole("user")).toBe("Applicant");
    expect(speakerLabelForRole("assistant")).toBe("Gardener");
    expect(speakerLabelForRole("gardener")).toBe("Gardener");
    expect(speakerLabelForRole("narrator")).toBe("narrator");
  });
});

describe("parseCompanionTranscript", () => {
  it("returns null for missing or invalid", () => {
    expect(parseCompanionTranscript(null)).toBeNull();
    expect(parseCompanionTranscript("")).toBeNull();
    expect(parseCompanionTranscript("not-json")).toBeNull();
    expect(parseCompanionTranscript("{}")).toBeNull();
    expect(parseCompanionTranscript("[]")).toBeNull();
  });

  it("parses JSON turn arrays into readable labels", () => {
    const turns = parseCompanionTranscript(
      JSON.stringify([
        { role: "assistant", content: "Tell me about the land." },
        { role: "user", content: "We steward 12 hectares." },
      ]),
    );
    expect(turns).toHaveLength(2);
    expect(turns![0].speakerLabel).toBe("Gardener");
    expect(turns![1].speakerLabel).toBe("Applicant");
    expect(turns![1].content).toBe("We steward 12 hectares.");
  });

  it("accepts already-parsed arrays", () => {
    const turns = parseCompanionTranscript([{ role: "user", content: "Hi" }]);
    expect(turns?.[0].speakerLabel).toBe("Applicant");
  });
});

describe("hasCompanionTranscript", () => {
  it("detects presence on application rows", () => {
    expect(hasCompanionTranscript({})).toBe(false);
    expect(
      hasCompanionTranscript({
        companionTranscript: JSON.stringify([{ role: "user", content: "x" }]),
      }),
    ).toBe(true);
  });
});

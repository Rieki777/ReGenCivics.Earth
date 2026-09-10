import { describe, it, expect } from "vitest";
import { insertTranscript } from "./insertTranscript";

describe("insertTranscript", () => {
  it("appends when there is no caret", () => {
    expect(insertTranscript("Hello", "world")).toEqual({ value: "Hello world", caret: 11 });
  });

  it("inserts at the caret with a joining space", () => {
    expect(insertTranscript("Hello there", "friend", 5, 5)).toEqual({
      value: "Hello friend there",
      caret: 12,
    });
  });

  it("replaces a selected range", () => {
    expect(insertTranscript("Hello world", "there", 6, 11)).toEqual({
      value: "Hello there",
      caret: 11,
    });
  });

  it("does not add a space before punctuation that follows", () => {
    expect(insertTranscript("Hello!", "world", 5, 5)).toEqual({
      value: "Hello world!",
      caret: 11,
    });
  });

  it("never wipes existing text when appending speech", () => {
    const original = "Keep this draft.";
    expect(insertTranscript(original, "add this").value).toBe("Keep this draft. add this");
    expect(insertTranscript(original, "add this").value.startsWith(original)).toBe(true);
  });

  it("leaves the field unchanged when the transcript is empty", () => {
    expect(insertTranscript("Keep this draft.", "")).toEqual({
      value: "Keep this draft.",
      caret: 16,
    });
  });
});

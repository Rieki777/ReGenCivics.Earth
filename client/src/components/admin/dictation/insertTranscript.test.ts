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

  it("trims the incoming transcript and ignores empty speech", () => {
    expect(insertTranscript("Hello", "   ")).toEqual({ value: "Hello", caret: 5 });
    expect(insertTranscript("", "  a   b  ")).toEqual({ value: "a b", caret: 3 });
  });
});

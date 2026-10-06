import { describe, expect, it } from "vitest";
import { boardContactPrompt, showBoardContactLink, type StoredBoardContact } from "./boardContactStore";

const saved: StoredBoardContact = { name: "Ada", email: "ada@example.com", savedAt: 1 };
const dismissed: StoredBoardContact = { dismissedAt: 1, name: "Ada" };

describe("board contact prompt", () => {
  it("stays quiet once a name and email are saved", () => {
    expect(boardContactPrompt({ stored: saved, signedInEmail: null, contributed: true, asked: true })).toBe("hide");
    expect(showBoardContactLink(saved, null)).toBe(false);
  });

  it("stays quiet for a signed-in email", () => {
    expect(boardContactPrompt({ stored: null, signedInEmail: "ada@example.com", contributed: true, asked: true })).toBe("hide");
    expect(showBoardContactLink(null, "ada@example.com")).toBe(false);
  });

  it("asks after a contribution, and again from the quiet link after a dismiss", () => {
    expect(boardContactPrompt({ stored: null, signedInEmail: null, contributed: true, asked: false })).toBe("ask");
    expect(boardContactPrompt({ stored: dismissed, signedInEmail: null, contributed: true, asked: false })).toBe("hide");
    expect(boardContactPrompt({ stored: dismissed, signedInEmail: null, contributed: false, asked: true })).toBe("ask");
    expect(showBoardContactLink(dismissed, null)).toBe(true);
    expect(showBoardContactLink(null, null)).toBe(true);
  });
});

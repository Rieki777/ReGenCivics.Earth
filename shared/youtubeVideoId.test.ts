import { describe, expect, it } from "vitest";
import { extractYoutubeVideoId, youtubeIdsMatch } from "./youtubeVideoId";

describe("extractYoutubeVideoId", () => {
  it("parses watch, short, embed, and bare ids", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for junk", () => {
    expect(extractYoutubeVideoId(null)).toBeNull();
    expect(extractYoutubeVideoId("")).toBeNull();
    expect(extractYoutubeVideoId("https://example.com/watch?v=nope")).toBeNull();
  });
});

describe("youtubeIdsMatch", () => {
  it("matches equivalent shapes", () => {
    expect(
      youtubeIdsMatch(
        "https://youtu.be/dQw4w9WgXcQ",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      ),
    ).toBe(true);
    expect(youtubeIdsMatch("aaaaaaaaaaa", "bbbbbbbbbbb")).toBe(false);
  });
});

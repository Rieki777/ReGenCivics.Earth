import { describe, expect, it } from "vitest";
import { chaptersForSend, extractShortDescription } from "./youtubeDescription";

describe("extractShortDescription", () => {
  it("reads a JSON-escaped shortDescription, including a 64:00 chapter", () => {
    const html = `<script>var ytInitialPlayerResponse = {"videoDetails":{"shortDescription":"Chapters\\n0:00 Welcome\\n64:00 Community tools, project profiles, and getting involved\\n"}};</script>`;
    const description = extractShortDescription(html);
    expect(description).toBe("Chapters\n0:00 Welcome\n64:00 Community tools, project profiles, and getting involved\n");
  });
});

describe("chaptersForSend", () => {
  it("uses the description fetched now, not the chapters stored at upload", async () => {
    const result = await chaptersForSend({
      videoId: "JS8YoJE1PUI",
      stored: [{ tSeconds: 1, title: "Old chapter", stamp: "0:01" }],
      fetchDescription: async () => "Chapters\n64:00 Community tools, project profiles, and getting involved\n",
    });
    expect(result.fromDescription).toBe(true);
    expect(result.chapters).toEqual([
      {
        tSeconds: 3840,
        stamp: "64:00",
        title: "Community tools, project profiles, and getting involved",
      },
    ]);
  });

  it("keeps stored chapters when the fetch fails", async () => {
    const result = await chaptersForSend({
      videoId: "JS8YoJE1PUI",
      stored: [{ tSeconds: 59, title: "Crowd pooling", stamp: "0:59" }],
      fetchDescription: async () => null,
    });
    expect(result.fromDescription).toBe(false);
    expect(result.chapters[0]?.title).toBe("Crowd pooling");
  });
});

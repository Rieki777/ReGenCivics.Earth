import { describe, expect, it } from "vitest";
import { oembedTitle, ownerSnippetMeta, parseYouTubeWatchHtml, replacementVideoTitle } from "./youtubeWatchMeta";

describe("parseYouTubeWatchHtml", () => {
  it("does not treat a live stream as ended", () => {
    const html = `
      "videoDetails":{"videoId":"23cRivDtorQ","title":"ReGen Civics: Open Session","lengthSeconds":"0","shortDescription":"Live now"}
      "liveBroadcastContent":"live"
      "isLiveNow":true
      "startTimestamp":"2026-10-07T17:16:00+00:00"
      "publishDate":"2026-10-07T17:00:00+00:00"
    `;
    const meta = parseYouTubeWatchHtml(html);
    expect(meta.status).toBe("ok");
    if (meta.status !== "ok") return;
    expect(meta.ended).toBe(false);
    expect(meta.liveBroadcastContent).toBe("live");
  });

  it("uses the start time once the stream has ended, not the publish time", () => {
    const html = `
      "videoDetails":{"videoId":"23cRivDtorQ","title":"S2E2 LIVE - Incubator Overview","lengthSeconds":"5940"}
      "liveBroadcastContent":"none"
      "isLiveNow":false
      "startTimestamp":"2026-10-07T17:16:00+00:00"
      "publishDate":"2026-10-08T07:15:00+00:00"
      "shortDescription":"Chapters\\n0:00 Welcome\\n64:00 Community tools"
      <meta itemprop="duration" content="PT1H39M">
    `;
    const meta = parseYouTubeWatchHtml(html);
    expect(meta.status).toBe("ok");
    if (meta.status !== "ok") return;
    expect(meta.ended).toBe(true);
    expect(meta.durationSeconds).toBe(5940);
    expect(meta.startTimestamp?.toISOString()).toBe("2026-10-07T17:16:00.000Z");
    expect(meta.title).toBe("S2E2 LIVE - Incubator Overview");
    expect(meta.chapters.map((c) => c.tSeconds)).toEqual([0, 3840]);
  });

  it("ignores a numeric title field and keeps the og:title", () => {
    const html = `
      "title":"3"
      <meta property="og:title" content="S2E2 CLEAN - Journey to ReGenerative Civilization - Incubator Overview">
      "liveBroadcastContent":"none"
      "lengthSeconds":"0"
      <title>S2E2 CLEAN - Journey to ReGenerative Civilization - Incubator Overview - YouTube</title>
    `;
    const meta = parseYouTubeWatchHtml(html);
    expect(meta.status).toBe("ok");
    if (meta.status !== "ok") return;
    expect(meta.title).toBe("S2E2 CLEAN - Journey to ReGenerative Civilization - Incubator Overview");
    expect(meta.ended).toBe(true);
  });

  it("reads the watch title beside the like button's numeric title", () => {
    const html = `
      "title":"3"
      "videoPrimaryInfoRenderer":{"title":{"runs":[{"text":"S2E2 LIVE - Journey to ReGenerative Civilization - Incubator Overview"}]}}
      "playerOverlayVideoDetailsRenderer":{"title":{"simpleText":"S2E2 LIVE - Journey to ReGenerative Civilization - Incubator Overview"}}
      "liveBroadcastContent":"none"
      "lengthSeconds":"0"
    `;
    const meta = parseYouTubeWatchHtml(html);
    expect(meta.status).toBe("ok");
    if (meta.status !== "ok") return;
    expect(meta.title).toBe("S2E2 LIVE - Journey to ReGenerative Civilization - Incubator Overview");
    expect(meta.ended).toBe(true);
  });

  it("does not store a numeric title when that is the only title field", () => {
    const html = `"title":"3" "liveBroadcastContent":"none" "lengthSeconds":"0"`;
    const meta = parseYouTubeWatchHtml(html);
    expect(meta.status).toBe("ok");
    if (meta.status !== "ok") return;
    expect(meta.title).toBeNull();
    expect(meta.ended).toBe(true);
  });

  it("treats liveBroadcastContent none as ended even when lengthSeconds is 0", () => {
    const html = `
      "videoDetails":{"videoId":"23cRivDtorQ","title":"S2E2 LIVE - Incubator Overview","lengthSeconds":"0"}
      "liveBroadcastContent":"none"
      "isLiveNow":false
    `;
    const meta = parseYouTubeWatchHtml(html);
    expect(meta.status).toBe("ok");
    if (meta.status !== "ok") return;
    expect(meta.liveBroadcastContent).toBe("none");
    expect(meta.ended).toBe(true);
    expect(meta.durationSeconds).toBeNull();
  });

  it("treats an upcoming premiere as not ended", () => {
    const html = `"liveBroadcastContent":"upcoming" "isUpcoming":true "videoDetails":{"videoId":"aaaaaaaaaaa","title":"Soon"}`;
    const meta = parseYouTubeWatchHtml(html);
    expect(meta.status).toBe("ok");
    if (meta.status !== "ok") return;
    expect(meta.ended).toBe(false);
    expect(meta.liveBroadcastContent).toBe("upcoming");
  });

  it("returns unknown when the watch page has no player", () => {
    expect(parseYouTubeWatchHtml("<html>Sign in to confirm you're not a bot</html>").status).toBe("unknown");
  });
});

describe("replacementVideoTitle", () => {
  it("replaces a numeric title with the oEmbed name and leaves a real title alone", () => {
    expect(oembedTitle({ title: "S2E2 EDIT - Journey to ReGenerative Civilization - Incubator Overview" }))
      .toBe("S2E2 EDIT - Journey to ReGenerative Civilization - Incubator Overview");
    expect(oembedTitle({ title: "3" })).toBeNull();
    expect(oembedTitle(null)).toBeNull();
    expect(replacementVideoTitle("3", "S2E2 LIVE - Incubator Overview")).toBe("S2E2 LIVE - Incubator Overview");
    expect(replacementVideoTitle("Week 2 live", "S2E2 LIVE - Incubator Overview")).toBeNull();
    expect(replacementVideoTitle("", "3")).toBeNull();
  });
});

describe("ownerSnippetMeta", () => {
  it("reads description chapters from an owner snippet, including minutes past 59", () => {
    const meta = ownerSnippetMeta({
      items: [{
        snippet: {
          title: "S2E2 EDIT - Journey to ReGenerative Civilization - Incubator Overview",
          description: "Timestamps\n(0:00) Welcome\n(62:25) Shared opportunities\n(98:42) Closing",
        },
      }],
    });
    expect(meta.title).toContain("S2E2 EDIT");
    expect(meta.chapters.map((chapter) => chapter.tSeconds)).toEqual([0, 62 * 60 + 25, 98 * 60 + 42]);
  });
});

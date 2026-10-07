import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { SEASON2_CURRICULUM } from "./season2Curriculum";
import { allSeason2Previews, season2PreviewFor, season2PreviewHead } from "./season2Previews";

const REQUIRED = [
  "/season2",
  "/season-schedule",
  "/interop-sessions",
  "/schedule",
  "/join",
  "/apply",
  "/shape-next-session",
  "/apply/status",
  "/series/Season 2",
];

describe("season2PreviewFor", () => {
  it("covers every Season 2 page and all thirteen weeks", () => {
    const previews = allSeason2Previews();
    for (const path of REQUIRED) {
      expect(previews.some((preview) => preview.path === path), path).toBe(true);
    }
    expect(previews.filter((preview) => preview.path.startsWith("/season2/week/"))).toHaveLength(
      SEASON2_CURRICULUM.length,
    );
  });

  it("names week 2 from the curriculum and the published Saturday", () => {
    const week2 = season2PreviewFor("/season2/week/2");
    expect(week2?.title).toBe("Week 2: Incubator Overview | ReGen Civics");
    expect(week2?.description).toBe(
      "Open the live board for Week 2, Incubator Overview, on October 3.",
    );
    expect(week2?.image).toBe("https://regencivics.earth/og/s2/week-02.jpg");
  });

  it("decodes a shared series URL", () => {
    const series = season2PreviewFor("/series/Season%202");
    expect(series?.path).toBe("/series/Season 2");
    expect(series?.url).toBe("https://regencivics.earth/series/Season%202");
  });

  it("gives each card its own title, description, and image", () => {
    const previews = allSeason2Previews();
    expect(new Set(previews.map((preview) => preview.title)).size).toBe(previews.length);
    expect(new Set(previews.map((preview) => preview.description)).size).toBe(previews.length);
    expect(new Set(previews.map((preview) => preview.image)).size).toBe(previews.length);
    expect(new Set(previews.map((preview) => preview.file)).size).toBe(previews.length);
  });

  it("keeps the card copy to one plain sentence", () => {
    for (const preview of allSeason2Previews()) {
      expect(preview.description.endsWith("."), preview.path).toBe(true);
      expect(preview.description.split(".").filter(Boolean)).toHaveLength(1);
      expect(preview.description.includes("—"), preview.path).toBe(false);
      expect(preview.title.includes("—"), preview.path).toBe(false);
      const lower = `${preview.title} ${preview.description}`.toLowerCase();
      expect(lower.includes("everything is free"), preview.path).toBe(false);
      expect(lower.includes("every project"), preview.path).toBe(false);
      expect(lower.includes("every community"), preview.path).toBe(false);
      expect(preview.title.includes("ReGen Civics"), preview.path).toBe(true);
      expect(preview.image.startsWith("https://regencivics.earth/og/s2/"), preview.path).toBe(true);
    }
    expect(season2PreviewFor("/season2")?.description.toLowerCase()).toContain("some projects");
  });

  it("ignores a path that is not a Season 2 card", () => {
    expect(season2PreviewFor("/fund")).toBeNull();
    expect(season2PreviewFor("/season2/week/99")).toBeNull();
    expect(season2PreviewFor("/apply/success")).toBeNull();
  });

  it("writes join head tags with a large-image card", () => {
    const head = season2PreviewHead("/join");
    expect(head).toContain('property="og:title" content="Join the Season 2 Call | ReGen Civics"');
    expect(head).toContain('content="Join the live Season 2 call."');
    expect(head).toContain('property="og:image" content="https://regencivics.earth/og/s2/join.jpg"');
    expect(head).toContain('name="twitter:card" content="summary_large_image"');
    expect(head).toContain('property="og:url" content="https://regencivics.earth/join"');
  });
});

describe("season 2 card files", () => {
  it("ships a 1200x630 jpeg under 300KB for every card", async () => {
    for (const preview of allSeason2Previews()) {
      const file = path.resolve("client/public/og/s2", preview.file);
      expect(fs.existsSync(file), preview.file).toBe(true);
      expect(fs.statSync(file).size, preview.file).toBeLessThan(300 * 1024);
      const meta = await sharp(file).metadata();
      expect(meta.width, preview.file).toBe(1200);
      expect(meta.height, preview.file).toBe(630);
      expect(meta.format, preview.file).toBe("jpeg");
    }
  });
});

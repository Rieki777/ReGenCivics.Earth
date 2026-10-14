import { describe, expect, it } from "vitest";
import {
  cleanDraftTools,
  draftToolsMissing,
  MAX_DRAFT_TOOLS,
  nameFromUrl,
  toolProblems,
  toolSlugBase,
  toolUrlKey,
  usedByLine,
} from "./toolLibrary";

describe("toolUrlKey: the same tool is one library entry", () => {
  it("ignores scheme, www, case, trailing slash, query and fragment", () => {
    const key = toolUrlKey("https://www.Hylo.com/");
    expect(toolUrlKey("http://hylo.com")).toBe(key);
    expect(toolUrlKey("hylo.com/?ref=x#top")).toBe(key);
  });
  it("keeps paths apart, so two repos on one host stay two tools", () => {
    expect(toolUrlKey("https://github.com/a/one")).not.toBe(toolUrlKey("https://github.com/a/two"));
  });
  it("refuses anything that is not http or https", () => {
    expect(toolUrlKey("javascript:alert(1)")).toBeNull();
    expect(toolUrlKey("")).toBeNull();
  });
});

describe("cleanDraftTools", () => {
  it("drops empty rows, bounds the list, and defaults the kind", () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ url: `https://t${i}.org`, description: "x" }));
    expect(cleanDraftTools(many)).toHaveLength(MAX_DRAFT_TOOLS);
    expect(cleanDraftTools([{}, { url: " https://a.org ", kind: "nonsense" }])).toEqual([
      { name: "", url: "https://a.org", description: "", kind: "software", isOpenSource: false },
    ]);
  });
  it("reads the stored JSON and survives junk", () => {
    expect(cleanDraftTools(JSON.stringify([{ url: "https://a.org", kind: "physical" }]))[0].kind).toBe("physical");
    expect(cleanDraftTools("not json")).toEqual([]);
  });
});

describe("what a tool still needs", () => {
  const ok = { name: "", url: "https://a.org", description: "Helps projects map their water.", kind: "software" as const, isOpenSource: false };
  it("needs a link and a sentence", () => {
    expect(toolProblems(ok)).toEqual([]);
    expect(toolProblems({ ...ok, url: "", description: "" })).toEqual(["a link", "a sentence on what it does"]);
    expect(toolProblems({ ...ok, url: "ftp://a.org" })).toEqual(["a web address that starts with http or https"]);
  });
  it("names the first tool with a gap", () => {
    expect(draftToolsMissing([ok, { ...ok, description: "short" }])).toBe("a sentence on what it does for tool 2");
    expect(draftToolsMissing([ok])).toBeNull();
  });
});

describe("small helpers", () => {
  it("names a tool from its link and makes a slug", () => {
    expect(nameFromUrl("https://www.seedcommons.org/x")).toBe("seedcommons.org");
    expect(toolSlugBase("Seed Commons: Treasury!")).toBe("seed-commons-treasury");
    expect(toolSlugBase("!!!")).toBe("tool");
  });
  it("says how many land projects use a tool", () => {
    expect(usedByLine(0)).toBeNull();
    expect(usedByLine(1)).toBe("Used by 1 land project");
    expect(usedByLine(4)).toBe("Used by 4 land projects");
  });
});

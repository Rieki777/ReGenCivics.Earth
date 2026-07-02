import { describe, expect, it } from "vitest";
import { coreTemplate, CORE_OG } from "./routes/og";

/**
 * Unit tests for the CORE OG card composition (the part this feature owns). The
 * actual PNG render depends on the repo-wide OG font pipeline, which currently
 * ships only woff2 fonts that satori cannot parse; that is a pre-existing,
 * site-wide limitation flagged in the handoff, not specific to CORE.
 */
function findText(node: any, needle: string): boolean {
  if (node == null) return false;
  if (typeof node === "string") return node.includes(needle);
  if (Array.isArray(node)) return node.some((n) => findText(n, needle));
  if (typeof node === "object") return findText(node.props?.children, needle) || findText(node.children, needle);
  return false;
}

describe("CORE OG card composition", () => {
  it("uses the page-specific title for a known id", () => {
    const el = coreTemplate("faith");
    expect(findText(el, CORE_OG.faith.title)).toBe(true);
    expect(findText(el, "core.regencivics.earth")).toBe(true);
  });

  it("falls back to the home card for an unknown id", () => {
    const el = coreTemplate("nonsense");
    expect(findText(el, CORE_OG.home.title)).toBe(true);
  });

  it("covers every church page id", () => {
    for (const id of ["home", "faith", "programs", "elders", "get-involved", "donate", "transparency"]) {
      expect(CORE_OG[id]).toBeTruthy();
      expect(findText(coreTemplate(id), CORE_OG[id].title)).toBe(true);
    }
  });
});

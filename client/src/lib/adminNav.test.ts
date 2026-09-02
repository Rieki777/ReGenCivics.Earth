import { describe, expect, it } from "vitest";
import {
  NAV_GROUPS,
  NAV_ITEMS_FLAT,
  inquiryTabForPath,
  navItemForShortcut,
  navItemById,
  readAdminContinue,
  writeAdminContinueFromTab,
  ADMIN_CONTINUE_KEY,
} from "./adminNav";

describe("admin nav", () => {
  it("keeps Overview, Applications, and Investors in the first nine sidebar items", () => {
    const firstNine = NAV_ITEMS_FLAT.slice(0, 9).map((item) => item.id);
    expect(firstNine).toEqual([
      "overview",
      "applications",
      "alliance",
      "roles",
      "citizenship-tiers",
      "investors",
      "loi",
      "crowdpooling",
      "seeds-claims",
    ]);
  });

  it("maps number keys 1–9 to those same items", () => {
    expect(navItemForShortcut("1")?.id).toBe("overview");
    expect(navItemForShortcut("2")?.id).toBe("applications");
    expect(navItemForShortcut("6")?.id).toBe("investors");
    expect(navItemForShortcut("9")?.id).toBe("seeds-claims");
    expect(navItemForShortcut("0")).toBeUndefined();
    expect(navItemForShortcut("a")).toBeUndefined();
  });

  it("puts inquiry and work destinations in the sidebar so they are tappable", () => {
    const ids = NAV_ITEMS_FLAT.map((item) => item.id);
    expect(ids).toEqual(expect.arrayContaining(["live", "create", "other", "role", "kanban"]));
    expect(navItemById("harvest")?.route).toBe("/admin-create");
    expect(navItemById("funding")?.route).toBe("/admin/funding");
    expect(navItemById("calls")?.route).toBe("/admin/calls");
  });

  it("has a unique id for every sidebar row", () => {
    const ids = NAV_ITEMS_FLAT.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(NAV_GROUPS.length).toBeGreaterThanOrEqual(5);
  });

  it("sends inquiry form paths to a real tab", () => {
    expect(inquiryTabForPath("live")).toBe("live");
    expect(inquiryTabForPath("create")).toBe("create");
    expect(inquiryTabForPath("alliance")).toBe("alliance");
    expect(inquiryTabForPath("finance")).toBe("other");
    expect(inquiryTabForPath("learn")).toBe("other");
    expect(inquiryTabForPath("mystery")).toBe("other");
    expect(inquiryTabForPath(undefined)).toBe("live");
  });

  it("remembers the last non-overview section for Continue", () => {
    localStorage.removeItem(ADMIN_CONTINUE_KEY);
    writeAdminContinueFromTab("overview");
    expect(readAdminContinue()).toBeNull();
    writeAdminContinueFromTab("applications");
    expect(readAdminContinue()).toEqual({
      kind: "tab",
      id: "applications",
      label: "Applications",
    });
    writeAdminContinueFromTab("funding");
    expect(readAdminContinue()).toEqual({
      kind: "route",
      id: "funding",
      label: "Funding",
      href: "/admin/funding",
    });
  });
});

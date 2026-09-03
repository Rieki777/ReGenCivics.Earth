import { describe, expect, it } from "vitest";
import {
  NAV_GROUPS,
  NAV_ITEMS_FLAT,
  inquiryTabForPath,
  navItemById,
  readAdminContinue,
  writeAdminContinueFromTab,
  ADMIN_CONTINUE_KEY,
  adminTabHref,
  applicationHref,
} from "./adminNav";

describe("admin nav", () => {
  it("keeps Overview, Applications, and Inquiries at the top of the sidebar", () => {
    const first = NAV_ITEMS_FLAT.slice(0, 4).map((item) => item.id);
    expect(first).toEqual(["overview", "applications", "inquiries", "alliance"]);
  });

  it("renames the twin labels so they do not collide", () => {
    expect(navItemById("roles")?.label).toBe("Player accounts");
  });

  it("puts work destinations in the sidebar so they are tappable", () => {
    expect(navItemById("harvest")?.route).toBe("/admin-create");
    expect(navItemById("funding")?.route).toBe("/admin/funding");
    expect(navItemById("calls")?.route).toBe("/admin/calls");
    expect(navItemById("images")?.label).toBe("Image studio");
    expect(navItemById("widgets")?.label).toBe("Widgets");
    expect(NAV_ITEMS_FLAT.map((item) => item.id)).not.toEqual(
      expect.arrayContaining(["live", "create", "kanban"]),
    );
  });

  it("has a unique id for every sidebar row", () => {
    const ids = NAV_ITEMS_FLAT.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(NAV_GROUPS.length).toBeGreaterThanOrEqual(5);
  });

  it("sends inquiry form paths to the inquiries hub", () => {
    expect(inquiryTabForPath("live")).toBe("inquiries");
    expect(inquiryTabForPath("create")).toBe("inquiries");
    expect(inquiryTabForPath("alliance")).toBe("alliance");
    expect(inquiryTabForPath("finance")).toBe("inquiries");
    expect(inquiryTabForPath("mystery")).toBe("inquiries");
    expect(inquiryTabForPath(undefined)).toBe("inquiries");
  });

  it("builds a deep link for a hub record", () => {
    expect(adminTabHref("inquiries", { type: "live", open: "12" })).toBe(
      "/admin?tab=inquiries&type=live&open=12",
    );
  });

  it("keeps application scoring on the applications tab with status in the URL", () => {
    expect(applicationHref(44, "submitted")).toBe(
      "/admin?tab=applications&open=44&status=submitted&view=reviews",
    );
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

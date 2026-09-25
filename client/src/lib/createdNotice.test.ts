import { afterEach, describe, expect, it, vi } from "vitest";
import { rememberCreatedCampaign, takeCreatedCampaign } from "./createdNotice";

describe("the campaign-created notice across the wizard's page load", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it("shows once, for the campaign the wizard just made", () => {
    rememberCreatedCampaign(4614);
    expect(takeCreatedCampaign(12)).toBe(false);
    expect(takeCreatedCampaign(4614)).toBe(true);
    expect(takeCreatedCampaign(4614)).toBe(false);
  });

  it("is simply absent when storage is blocked", () => {
    // Blocked site data: reading window.sessionStorage itself throws.
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => rememberCreatedCampaign(1)).not.toThrow();
    expect(takeCreatedCampaign(1)).toBe(false);
  });
});

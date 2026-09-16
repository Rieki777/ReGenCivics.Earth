import { describe, expect, it } from "vitest";
import {
  ADMIN_SIDEBAR_COLLAPSED_PX,
  ADMIN_SIDEBAR_EXPANDED_PX,
  desktopSidebarInsetPx,
  placePopover,
} from "./placePopover";

function rect( partial: Partial<DOMRect> & { left: number; top: number; width?: number; height?: number } ): DOMRect {
  const width = partial.width ?? 36;
  const height = partial.height ?? 36;
  const left = partial.left;
  const top = partial.top;
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON() { return this; },
  } as DOMRect;
}

describe("desktopSidebarInsetPx", () => {
  it("is 0 below the md breakpoint", () => {
    expect(desktopSidebarInsetPx(500, null)).toBe(0);
  });

  it("defaults to expanded width when aside is missing on desktop", () => {
    expect(desktopSidebarInsetPx(1280, null)).toBe(ADMIN_SIDEBAR_EXPANDED_PX);
  });

  it("reads the live aside width when present", () => {
    const aside = {
      getBoundingClientRect: () => ({ width: ADMIN_SIDEBAR_COLLAPSED_PX }),
    } as unknown as Element;
    expect(desktopSidebarInsetPx(1280, aside)).toBe(ADMIN_SIDEBAR_COLLAPSED_PX);
  });
});

describe("placePopover", () => {
  it("clamps left edge into the main column when mic is near the sidebar", () => {
    // Mic sits just to the right of an expanded sidebar in the content pad.
    const pos = placePopover(
      rect({ left: 230, top: 400 }),
      false,
      72,
      { vw: 1280, vh: 800, sidebarInset: ADMIN_SIDEBAR_EXPANDED_PX },
    );
    expect(pos.left).toBeGreaterThanOrEqual(ADMIN_SIDEBAR_EXPANDED_PX + 8);
    expect(pos.left + pos.width).toBeLessThanOrEqual(1280 - 8);
  });

  it("never places the panel under the expanded sidebar hit area", () => {
    const pos = placePopover(
      rect({ left: 8, top: 120 }), // pathological: mic somehow under sidebar
      false,
      220,
      { vw: 1024, vh: 768, sidebarInset: ADMIN_SIDEBAR_EXPANDED_PX, maxWidth: 288 },
    );
    expect(pos.left).toBeGreaterThanOrEqual(ADMIN_SIDEBAR_EXPANDED_PX + 8);
  });

  it("respects collapsed sidebar inset", () => {
    const pos = placePopover(
      rect({ left: 70, top: 200 }),
      false,
      72,
      { vw: 1280, vh: 800, sidebarInset: ADMIN_SIDEBAR_COLLAPSED_PX },
    );
    expect(pos.left).toBeGreaterThanOrEqual(ADMIN_SIDEBAR_COLLAPSED_PX + 8);
  });

  it("aligns end without escaping the viewport", () => {
    const pos = placePopover(
      rect({ left: 1100, top: 100, width: 36 }),
      true,
      72,
      { vw: 1280, vh: 800, sidebarInset: ADMIN_SIDEBAR_EXPANDED_PX, maxWidth: 240 },
    );
    expect(pos.left + pos.width).toBeLessThanOrEqual(1280 - 8);
    expect(pos.alignEnd).toBe(true);
  });

  it("fits width within remaining column when maxWidth exceeds space", () => {
    const pos = placePopover(
      rect({ left: 240, top: 100 }),
      false,
      72,
      { vw: 400, vh: 600, sidebarInset: ADMIN_SIDEBAR_EXPANDED_PX, maxWidth: 288 },
    );
    expect(pos.left).toBeGreaterThanOrEqual(ADMIN_SIDEBAR_EXPANDED_PX + 8);
    expect(pos.left + pos.width).toBeLessThanOrEqual(400 - 8);
  });
});

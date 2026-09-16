/**
 * Position admin dictation bubbles in the viewport without sliding under the
 * desktop sidebar hit area (aside is w-56 / w-16 on md+).
 */

export const ADMIN_SIDEBAR_EXPANDED_PX = 224; // Tailwind w-56 = 14rem
export const ADMIN_SIDEBAR_COLLAPSED_PX = 64; // Tailwind w-16 = 4rem
export const MD_BREAKPOINT_PX = 768;

export type PopoverPos = {
  top: number;
  left: number;
  width: number;
  showAbove: boolean;
  alignEnd: boolean;
};

export type PlacePopoverOpts = {
  vw?: number;
  vh?: number;
  /** Left inset reserved for the desktop admin sidebar (0 on mobile). */
  sidebarInset?: number;
  maxWidth?: number;
  pad?: number;
  gap?: number;
};

/** Live width of the desktop admin aside, or expanded default on md+. */
export function desktopSidebarInsetPx(
  vw: number,
  aside: Element | null,
): number {
  if (vw < MD_BREAKPOINT_PX) return 0;
  if (!aside) return ADMIN_SIDEBAR_EXPANDED_PX;
  const width = aside.getBoundingClientRect().width;
  if (!Number.isFinite(width) || width <= 0) return ADMIN_SIDEBAR_EXPANDED_PX;
  return Math.round(width);
}

export function readAdminSidebarAside(
  doc: Document = typeof document !== "undefined" ? document : (null as unknown as Document),
): Element | null {
  if (!doc?.querySelector) return null;
  return (
    doc.querySelector("[data-admin-desktop-sidebar]") ??
    doc.querySelector("aside.hidden.md\\:flex") ??
    null
  );
}

/**
 * Anchor a small bubble to `rect`, clamping horizontally into the main column
 * (never under the desktop sidebar) and vertically into the viewport.
 */
export function placePopover(
  rect: DOMRect,
  alignEnd: boolean,
  estimatedHeight: number,
  opts: PlacePopoverOpts = {},
): PopoverPos {
  const vw = opts.vw ?? (typeof window !== "undefined" ? window.innerWidth : 1280);
  const vh = opts.vh ?? (typeof window !== "undefined" ? window.innerHeight : 800);
  const pad = opts.pad ?? 8;
  const gap = opts.gap ?? 8;
  const sidebarInset = opts.sidebarInset ?? 0;
  const maxWidth = opts.maxWidth ?? 288;
  const leftMin = Math.max(pad, sidebarInset + pad);
  const usable = Math.max(0, vw - leftMin - pad);
  const width = Math.min(maxWidth, usable || maxWidth);

  const spaceAbove = rect.top;
  const spaceBelow = vh - rect.bottom;
  const showAbove = spaceAbove > estimatedHeight || spaceAbove > spaceBelow;
  let top = showAbove ? rect.top - gap : rect.bottom + gap;
  if (!showAbove) {
    top = Math.min(top, vh - estimatedHeight - pad);
  } else {
    top = Math.max(top, estimatedHeight + pad);
  }

  const preferredLeft = alignEnd ? rect.right - width : rect.left;
  const left = Math.min(Math.max(leftMin, preferredLeft), Math.max(leftMin, vw - width - pad));
  return { top, left, width, showAbove, alignEnd };
}

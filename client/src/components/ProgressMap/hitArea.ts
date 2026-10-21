/**
 * Hit areas for the progress map's landmarks (ProgressMapSVG).
 *
 * The map is a 1200x800 viewBox drawn at whatever size its box allows. On a
 * 390px phone one unit is 0.325px, so a 72-unit landmark is 23px across, half
 * the 44px a finger needs (STEERING.md section 12). Each tappable landmark
 * gets an invisible disc 44px across at the drawn size. Where two landmarks
 * sit closer than that, their discs would overlap, so each disc is cut to the
 * part of the map nearer its own landmark than any other: discs never
 * overlap, and a tap between two landmarks goes to the nearer one.
 */

export type Point = { x: number; y: number };

/** The touch target, in screen pixels (Apple HIG 44pt, WCAG 2.5.5). */
export const TOUCH_TARGET_PX = 44;

/**
 * The disc's radius in viewBox units: 22px at the drawn scale (pixels per
 * unit), rounded up to a whole unit so float error never leaves it at
 * 43.99px, and never smaller than the landmark itself.
 */
export function hitRadius(scale: number, drawnRadius: number): number {
  if (!(scale > 0)) return drawnRadius;
  return Math.max(drawnRadius, Math.ceil(TOUCH_TARGET_PX / 2 / scale));
}

/** Keeps the part of a convex polygon where side(p) <= 0 (Sutherland-Hodgman). */
function clipToHalfPlane(poly: [number, number][], side: (p: [number, number]) => number) {
  const out: [number, number][] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) out.push(a);
    if (sa <= 0 !== sb <= 0) {
      const t = sa / (sa - sb);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

/**
 * The square around a disc of radius r at `at`, cut to the points nearer `at`
 * than any of `others`. Used as the disc's clip path, so the disc keeps its
 * full size wherever no other landmark is nearer. Returns the polygon's
 * corners in order.
 */
export function nearestCell(at: Point, others: Point[], r: number): [number, number][] {
  let poly: [number, number][] = [
    [at.x - r, at.y - r],
    [at.x + r, at.y - r],
    [at.x + r, at.y + r],
    [at.x - r, at.y + r],
  ];
  for (const o of others) {
    const dx = o.x - at.x;
    const dy = o.y - at.y;
    // A landmark more than two radii away can't reach this disc, and one at
    // the same spot has no line between them to cut along.
    if (dx * dx + dy * dy > 4 * r * r || (dx === 0 && dy === 0)) continue;
    const mx = (at.x + o.x) / 2;
    const my = (at.y + o.y) / 2;
    poly = clipToHalfPlane(poly, ([px, py]) => (px - mx) * dx + (py - my) * dy);
    if (poly.length === 0) break;
  }
  return poly;
}

/** The polygon as an SVG points attribute. */
export function toPoints(poly: [number, number][]): string {
  return poly.map(([x, y]) => `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`).join(" ");
}

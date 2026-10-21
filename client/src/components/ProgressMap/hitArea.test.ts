import { describe, it, expect } from 'vitest';
import { getAllNodes, getPath } from './mapData';
import { hitRadius, nearestCell, TOUCH_TARGET_PX } from './hitArea';

/** A point inside (or on the edge of) a convex polygon. */
function inside(poly: [number, number][], x: number, y: number) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (Math.abs(cross) < 1e-6) continue;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

// A 390px phone: the 1200-unit map is drawn 390px wide.
const PHONE = 390 / 1200;
const DRAWN = 36;

describe('hitRadius', () => {
  it('is 22px at the drawn scale on a phone, never a hair under', () => {
    const px = hitRadius(PHONE, DRAWN) * PHONE;
    expect(px).toBeGreaterThanOrEqual(TOUCH_TARGET_PX / 2);
    expect(px).toBeLessThan(TOUCH_TARGET_PX / 2 + 0.5);
  });

  it('never shrinks below the landmark itself', () => {
    // On a desktop the landmark is already wider than 44px.
    expect(hitRadius(1024 / 1200, DRAWN)).toBe(DRAWN);
    expect(hitRadius(0, DRAWN)).toBe(DRAWN);
    expect(hitRadius(Number.NaN, DRAWN)).toBe(DRAWN);
  });
});

describe('nearestCell', () => {
  it('leaves a landmark with no close neighbour its whole square', () => {
    const cell = nearestCell({ x: 150, y: 650 }, [{ x: 900, y: 100 }], 60);
    expect(cell).toEqual([[90, 590], [210, 590], [210, 710], [90, 710]]);
  });

  it('splits two close landmarks halfway between them', () => {
    // The High Ring and Flame Garden sit 40 units apart, 13px on a phone.
    const highRing = { x: 1000, y: 200 };
    const flameGarden = { x: 1000, y: 240 };
    const r = hitRadius(PHONE, DRAWN);
    const above = nearestCell(highRing, [flameGarden], r);
    const below = nearestCell(flameGarden, [highRing], r);
    expect(Math.max(...above.map(([, y]) => y))).toBeCloseTo(220, 6);
    expect(Math.min(...below.map(([, y]) => y))).toBeCloseTo(220, 6);
  });

  it('gives every point within reach to its nearest landmark, sharing only exact ties', () => {
    const nodes = getAllNodes();
    const r = hitRadius(PHONE, DRAWN);
    const cells = nodes.map((n) => nearestCell(n, nodes.filter((o) => o !== n), r));
    for (let x = 0; x <= 1200; x += 7) {
      for (let y = 0; y <= 800; y += 7) {
        const dist = (n: { x: number; y: number }) => Math.hypot(x - n.x, y - n.y);
        const nearest = Math.min(...nodes.map(dist));
        const owners = nodes.filter((n, i) => dist(n) <= r && inside(cells[i], x, y));
        // Only a nearest landmark owns a point; two do only on the line halfway between them.
        for (const n of owners) expect(dist(n)).toBeCloseTo(nearest, 6);
        // And no gaps: a point within reach of its nearest landmark belongs to it.
        if (nearest <= r) expect(owners.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('keeps the full 44px across and down where a neighbour only trims a corner', () => {
    // The Seed Vault is 114 units (37px) from the Trailhead, so their discs
    // meet, but the line between them cuts only the corner toward it.
    const all = getAllNodes();
    const trailhead = getPath('land')!.nodes[0];
    const r = hitRadius(PHONE, DRAWN);
    const cell = nearestCell(trailhead, all.filter((o) => o !== trailhead), r);
    const xs: number[] = [];
    const ys: number[] = [];
    for (let x = trailhead.x - r; x <= trailhead.x + r; x += 0.5) {
      for (let y = trailhead.y - r; y <= trailhead.y + r; y += 0.5) {
        if (Math.hypot(x - trailhead.x, y - trailhead.y) <= r && inside(cell, x, y)) {
          xs.push(x);
          ys.push(y);
        }
      }
    }
    expect((Math.max(...xs) - Math.min(...xs)) * PHONE).toBeGreaterThanOrEqual(TOUCH_TARGET_PX - 0.2);
    expect((Math.max(...ys) - Math.min(...ys)) * PHONE).toBeGreaterThanOrEqual(TOUCH_TARGET_PX - 0.2);
  });
});

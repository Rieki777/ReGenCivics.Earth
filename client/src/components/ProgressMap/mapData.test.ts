import { describe, it, expect } from 'vitest';
import { PATHS, getAllNodes, getPath, buildPathCurve, REGEN_TREE, SHARED_NODES } from './mapData';

describe('mapData', () => {
  it('defines exactly 4 paths', () => {
    expect(PATHS).toHaveLength(4);
    expect(PATHS.map(p => p.id)).toEqual(['land', 'ally', 'play', 'fund']);
  });

  it('each path has the expected node count', () => {
    expect(getPath('land')?.nodes).toHaveLength(5);
    expect(getPath('ally')?.nodes).toHaveLength(5);
    expect(getPath('play')?.nodes).toHaveLength(6);
    expect(getPath('fund')?.nodes).toHaveLength(7);
  });

  it('getAllNodes returns all 23 nodes', () => {
    expect(getAllNodes()).toHaveLength(23);
  });

  it('each node has unique id', () => {
    const ids = getAllNodes().map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each node has valid SVG coordinates', () => {
    for (const node of getAllNodes()) {
      expect(node.x).toBeGreaterThan(0);
      expect(node.x).toBeLessThanOrEqual(1200);
      expect(node.y).toBeGreaterThan(0);
      expect(node.y).toBeLessThanOrEqual(800);
    }
  });

  it('each node has a non-empty href', () => {
    for (const node of getAllNodes()) {
      expect(node.href).toBeTruthy();
      expect(node.href.startsWith('/')).toBe(true);
    }
  });

  it('REGEN_TREE is at center of viewBox', () => {
    expect(REGEN_TREE.x).toBe(600);
    expect(REGEN_TREE.y).toBe(400);
  });

  it('SHARED_NODES session group contains valid node ids', () => {
    const allIds = new Set(getAllNodes().map(n => n.id));
    for (const id of SHARED_NODES.session) {
      expect(allIds.has(id)).toBe(true);
    }
  });

  it('buildPathCurve returns valid SVG path for 2+ nodes', () => {
    const path = getPath('land')!;
    const curve = buildPathCurve(path.nodes);
    expect(curve).toMatch(/^M \d+/);
    expect(curve).toContain('Q');
  });

  it('buildPathCurve returns empty string for fewer than 2 nodes', () => {
    expect(buildPathCurve([])).toBe('');
    expect(buildPathCurve([getAllNodes()[0]])).toBe('');
  });

  it('node indexes are sequential within each path', () => {
    for (const path of PATHS) {
      path.nodes.forEach((node, i) => {
        expect(node.index).toBe(i);
      });
    }
  });
});

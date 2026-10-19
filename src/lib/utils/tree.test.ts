import { describe, expect, it } from 'vitest';
import {
  fitZoom,
  LABEL_HEIGHT,
  labelWidthFor,
  layoutTree,
  treeBounds,
  TREE_ORIGIN,
} from './tree.ts';
import { ESSAYS_DB } from '../data/essayContent.js';
import type { TreeNode } from '../types.ts';

const GEO = { spread: 45, scale: 1, length: 100, rootWidth: 5 };

const node = (id: string, parentId: string | null, angle = 0): TreeNode => ({
  id,
  parentId,
  angle,
  label: id.toUpperCase(),
  type: 'T',
  paraIndex: 0,
  weight: 0.5,
  citations: 0,
  scholia: 0,
  excerpt: '',
});

describe('layoutTree', () => {
  it('places the root at the origin with no incoming branch', () => {
    const [root] = layoutTree([node('r', null)], GEO);
    expect(root).toMatchObject({ x: TREE_ORIGIN.x, y: TREE_ORIGIN.y, depth: 0, path: null });
  });

  it('positions children at branch length along the summed angle', () => {
    const [, child] = layoutTree([node('r', null), node('c', 'r', 5)], GEO);
    const rad = ((TREE_ORIGIN.angle + 5) * Math.PI) / 180;
    expect(child.x).toBeCloseTo(TREE_ORIGIN.x + Math.cos(rad) * 100, 1);
    expect(child.y).toBeCloseTo(TREE_ORIGIN.y + Math.sin(rad) * 100, 1);
    expect(child.path).toMatch(/^M 560 615 L [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/);
  });

  it('shortens branches and thins strokes with depth', () => {
    const out = layoutTree([node('r', null), node('a', 'r', 1), node('b', 'a', 1)], GEO);
    const [, a, b] = out;
    expect(b.depth).toBe(2);
    expect(b.strokeWidth).toBeLessThan(a.strokeWidth);
    expect(b.strokeWidth).toBeGreaterThanOrEqual(1.2);
  });

  it('scales angular offsets with the spread setting', () => {
    const nodes = [node('r', null), node('c', 'r', 10)];
    const narrow = layoutTree(nodes, { ...GEO, spread: 45 })[1];
    const wide = layoutTree(nodes, { ...GEO, spread: 90 })[1];
    expect(wide.angle - TREE_ORIGIN.angle).toBeCloseTo(2 * (narrow.angle - TREE_ORIGIN.angle));
  });

  it('survives cycles and orphans without looping', () => {
    const nodes = [node('r', null), node('a', 'b', 1), node('b', 'a', 1), node('o', 'missing')];
    expect(layoutTree(nodes, GEO).map((p) => p.node.id)).toEqual(['r']);
  });

  it('lays out every node of every shipped essay', () => {
    for (const essay of ESSAYS_DB) {
      expect(layoutTree(essay.treeNodes, GEO)).toHaveLength(essay.treeNodes.length);
    }
  });
});

describe('label placement', () => {
  const overlaps = (
    a: { labelX: number; labelY: number; labelWidth: number },
    b: { labelX: number; labelY: number; labelWidth: number }
  ) =>
    a.labelX < b.labelX + b.labelWidth &&
    b.labelX < a.labelX + a.labelWidth &&
    a.labelY < b.labelY + LABEL_HEIGHT &&
    b.labelY < a.labelY + LABEL_HEIGHT;

  it('keeps uncrowded labels centred just above their node', () => {
    const [root] = layoutTree([node('r', null)], GEO);
    expect(root.labelShifted).toBe(false);
    expect(root.labelY).toBe(TREE_ORIGIN.y - 26);
    expect(root.labelX).toBeCloseTo(TREE_ORIGIN.x - root.labelWidth / 2);
  });

  it('lifts colliding labels until no two overlap in the shipped essays', () => {
    for (const essay of ESSAYS_DB) {
      const placed = layoutTree(essay.treeNodes, {
        spread: 48,
        scale: 1,
        length: 105,
        rootWidth: 5,
      });
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          expect(
            overlaps(placed[i], placed[j]),
            `${placed[i].node.id} × ${placed[j].node.id}`
          ).toBe(false);
        }
      }
    }
  });
});

describe('treeBounds / fitZoom', () => {
  it('encloses every node and label', () => {
    const placed = layoutTree(ESSAYS_DB[0].treeNodes, GEO);
    const b = treeBounds(placed);
    for (const p of placed) {
      expect(p.labelX).toBeGreaterThanOrEqual(b.minX);
      expect(p.labelX + p.labelWidth).toBeLessThanOrEqual(b.maxX);
      expect(p.labelY).toBeGreaterThanOrEqual(b.minY);
      expect(p.y).toBeLessThanOrEqual(b.maxY);
    }
  });

  it('zooms in on small trees and clamps the factor', () => {
    expect(fitZoom({ minX: 0, minY: 0, maxX: 100, maxY: 100 })).toBe(2.5);
    expect(fitZoom({ minX: 0, minY: 0, maxX: 10000, maxY: 10000 })).toBe(0.5);
    expect(fitZoom({ minX: 0, minY: 0, maxX: 500, maxY: 340 })).toBeCloseTo(1.7);
  });
});

describe('labelWidthFor', () => {
  it('has a 95-unit minimum and grows with label length', () => {
    expect(labelWidthFor('A')).toBe(95);
    expect(labelWidthFor('X'.repeat(30))).toBeCloseTo(30 * 5.6 + 14);
  });
});

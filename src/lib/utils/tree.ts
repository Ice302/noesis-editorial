/**
 * Argument-tree layout.
 *
 * The geometry is the same as the original imperative `renderArgumentTree`:
 * a breadth-first walk from the root, each branch drawn as a two-segment
 * polyline that bends at 52% of its length. Separating the maths from the
 * markup lets Svelte render the SVG declaratively and lets us unit-test it.
 */
import type { TreeNode } from '../types.ts';

export interface TreeGeometry {
  /** HUD spread in degrees; 45 is the neutral value (factor 1). */
  spread: number;
  scale: number;
  /** Length of a first-level branch, before `scale`. */
  length: number;
  /** Stroke width of the trunk; branches thin by 0.68 per level. */
  rootWidth: number;
}

export interface PositionedNode {
  node: TreeNode;
  x: number;
  y: number;
  depth: number;
  angle: number;
  /** SVG path from the parent to this node, or `null` for the root. */
  path: string | null;
  strokeWidth: number;
  labelWidth: number;
  /** Top-left corner of the label box (after collision avoidance). */
  labelX: number;
  labelY: number;
  /** True when the label was lifted off its default spot; a leader line is drawn. */
  labelShifted: boolean;
}

export interface TreeBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Root anchor inside the 1000 × 680 viewBox, pointing slightly left of straight up. */
export const TREE_ORIGIN = { x: 560, y: 615, angle: -95 } as const;
export const TREE_VIEWBOX = { width: 1000, height: 680 } as const;

const LENGTH_DECAY = 0.84;
const STROKE_DECAY = 0.68;
const MIN_STROKE = 1.2;
const BEND_AT = 0.52;
const BEND_ANGLE = 0.55;

export const LABEL_HEIGHT = 15;
const LABEL_STEP = 18;
const LABEL_MAX_SHIFTS = 6;
const LABEL_PAD = 2;
const NODE_RADIUS_MAX = 9;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const round = (n: number) => Math.round(n * 100) / 100;

/** Width of a node's label box, sized to its monospace caption. */
export function labelWidthFor(label: string): number {
  return Math.max(95, label.length * 5.6 + 14);
}

export function layoutTree(nodes: readonly TreeNode[], geo: TreeGeometry): PositionedNode[] {
  if (nodes.length === 0) return [];

  const root = nodes.find((n) => n.parentId === null) ?? nodes[0];
  const spreadFactor = geo.spread / 45;
  const baseLen = geo.length * geo.scale;

  // Children index: O(n) instead of filtering the whole list for every node.
  const children = new Map<string, TreeNode[]>();
  for (const n of nodes) {
    if (n.parentId === null || n === root) continue;
    const list = children.get(n.parentId) ?? [];
    list.push(n);
    children.set(n.parentId, list);
  }

  const placed: PositionedNode[] = [
    {
      node: root,
      x: TREE_ORIGIN.x,
      y: TREE_ORIGIN.y,
      depth: 0,
      angle: TREE_ORIGIN.angle,
      path: null,
      strokeWidth: geo.rootWidth,
      labelWidth: labelWidthFor(root.label),
      labelX: 0,
      labelY: 0,
      labelShifted: false,
    },
  ];
  const seen = new Set([root.id]); // guards against cycles in hand-written data

  for (let i = 0; i < placed.length; i++) {
    const parent = placed[i];
    const kids = children.get(parent.node.id) ?? [];

    kids.forEach((child, idx) => {
      if (seen.has(child.id)) return;
      seen.add(child.id);

      const depth = parent.depth + 1;
      const len = baseLen * Math.pow(LENGTH_DECAY, depth - 1);
      const fallback = (idx - (kids.length - 1) / 2) * 32;
      const offset = (child.angle ?? fallback) * spreadFactor;
      const angle = parent.angle + offset;

      const midRad = toRad(parent.angle + offset * BEND_ANGLE);
      const midX = parent.x + Math.cos(midRad) * len * BEND_AT;
      const midY = parent.y + Math.sin(midRad) * len * BEND_AT;
      const x = parent.x + Math.cos(toRad(angle)) * len;
      const y = parent.y + Math.sin(toRad(angle)) * len;

      placed.push({
        node: child,
        x: round(x),
        y: round(y),
        depth,
        angle,
        path: `M ${round(parent.x)} ${round(parent.y)} L ${round(midX)} ${round(midY)} L ${round(x)} ${round(y)}`,
        strokeWidth: Math.max(MIN_STROKE, geo.rootWidth * Math.pow(STROKE_DECAY, depth)),
        labelWidth: labelWidthFor(child.label),
        labelX: 0,
        labelY: 0,
        labelShifted: false,
      });
    });
  }

  placeLabels(placed);
  return placed;
}

/**
 * Centres each label above its node, then lifts it in fixed steps until it no
 * longer overlaps a label placed earlier. Nodes arrive in breadth-first order,
 * so the trunk keeps its labels and the (less crowded) outer branches move.
 */
function placeLabels(placed: PositionedNode[]): void {
  const taken: { x: number; y: number; w: number }[] = [];
  const collides = (x: number, y: number, w: number) =>
    taken.some(
      (r) =>
        x < r.x + r.w + LABEL_PAD &&
        r.x < x + w + LABEL_PAD &&
        y < r.y + LABEL_HEIGHT + LABEL_PAD &&
        r.y < y + LABEL_HEIGHT + LABEL_PAD
    );

  for (const p of placed) {
    const x = round(p.x - p.labelWidth / 2);
    const base = round(p.y - (p.depth === 0 ? 26 : 22));
    let y = base;
    for (let i = 0; i < LABEL_MAX_SHIFTS && collides(x, y, p.labelWidth); i++) y -= LABEL_STEP;
    taken.push({ x, y, w: p.labelWidth });
    p.labelX = x;
    p.labelY = y;
    p.labelShifted = y !== base;
  }
}

/** Bounding box of all nodes and labels, in viewBox units. */
export function treeBounds(placed: readonly PositionedNode[]): TreeBounds {
  if (placed.length === 0) {
    return { minX: 0, minY: 0, maxX: TREE_VIEWBOX.width, maxY: TREE_VIEWBOX.height };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of placed) {
    minX = Math.min(minX, p.labelX, p.x - NODE_RADIUS_MAX);
    maxX = Math.max(maxX, p.labelX + p.labelWidth, p.x + NODE_RADIUS_MAX);
    minY = Math.min(minY, p.labelY);
    maxY = Math.max(maxY, p.y + NODE_RADIUS_MAX);
  }
  return { minX, minY, maxX, maxY };
}

/** Zoom factor at which the bounds fill ~85% of the 1000 × 680 frame, clamped to [0.5, 2.5]. */
export function fitZoom(b: TreeBounds): number {
  const w = Math.max(1, b.maxX - b.minX);
  const h = Math.max(1, b.maxY - b.minY);
  const z = Math.min(TREE_VIEWBOX.width / w, TREE_VIEWBOX.height / h) * 0.85;
  return Math.round(Math.min(2.5, Math.max(0.5, z)) * 100) / 100;
}

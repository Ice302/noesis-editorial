/**
 * Domain types for the NOĒSIS archival studio.
 *
 * Everything the UI renders is described here so that content files
 * (`#lib/data/*`) are type-checked and components can rely on exact shapes.
 */

/** The four workspace panels. `editor` is the live-edit mode of the spread. */
export type ViewId = 'reader' | 'editor' | 'tree' | 'analog';

export type MarginaliaType = 'SCHOLIUM' | 'CITATION' | 'COUNTER-THESIS' | 'REDLINE';

/** A margin note pinned to one paragraph of an essay. */
export interface Marginalia {
  id: string;
  /** Zero-based index into `Essay.paragraphs`. */
  paraIndex: number;
  type: MarginaliaType;
  author: string;
  date: string;
  text: string;
}

/** One claim in the essay's argument tree. Exactly one node per essay has `parentId: null`. */
export interface TreeNode {
  id: string;
  parentId: string | null;
  label: string;
  type: string;
  /** Paragraph that develops this claim (used by "Read in spread"). */
  paraIndex: number;
  /** Branch angle relative to the parent, in degrees, before the HUD spread factor. */
  angle: number;
  /** Argumentative weight, 0–1. */
  weight: number;
  citations: number;
  scholia: number;
  excerpt: string;
}

export interface Essay {
  id: string;
  code: string;
  category: string;
  date: string;
  title: string;
  subtitle: string;
  author: string;
  authorBio: string;
  filepath: string;
  /** Five-column synopsis deck shown above the essay. */
  deckColumns: readonly string[];
  /**
   * Paragraph bodies as trusted inline HTML. Allowed tags: `em`, `i`, `strong`,
   * `b`, `br` and `mark.editorial-highlight` (see `sanitizeEssayHtml`).
   */
  paragraphs: readonly string[];
  marginalia: readonly Marginalia[];
  treeNodes: readonly TreeNode[];
}

/** Bullet-journal symbols (Ryder Carroll's rapid-logging key, extended). */
export type LogSymbol = '□' | '■' | '●' | '—' | '★' | '▲' | '▽';

export interface LogItem {
  id: string;
  symbol: LogSymbol;
  text: string;
  /** Display time, or an empty string for undated notes. */
  time: string;
}

export type LogTimeframe = 'today' | 'week' | 'older';

export interface LogGroup {
  id: string;
  dateLabel: string;
  timeframe: LogTimeframe;
  collapsed: boolean;
  items: LogItem[];
}

export type AnalogFilter = 'today' | 'week' | 'all';

/** Values driven by the typographic HUD sliders. */
export interface HudParams {
  fontScale: number;
  colWidth: number;
  lineHeight: number;
  marginaliaOpacity: number;
  highlightIntensity: number;
  treeSpread: number;
  treeScale: number;
  treeLength: number;
  treeRootWidth: number;
}

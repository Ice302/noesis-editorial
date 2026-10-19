import type { ViewId } from './types.ts';

export interface ViewMeta {
  id: ViewId;
  /** Label in the header tab strip. */
  tab: string;
  /** Label in the spine's slash navigation. */
  spine: string;
  /** Keyboard shortcut. */
  key: string;
}

/** Single source of truth for the four panels, their labels and shortcuts. */
export const VIEW_META: readonly ViewMeta[] = [
  { id: 'reader', tab: '01. Aeon Spread', spine: 'Essays/', key: '1' },
  { id: 'editor', tab: '02. Manuscript Studio', spine: 'Draft Studio/', key: '2' },
  { id: 'tree', tab: '03. Argument Tree', spine: 'Argument Tree/', key: '3' },
  { id: 'analog', tab: '04. Analog Log', spine: 'Analog Log/', key: '4' },
];

/** DOM ids shared by the tab strip and the panel for ARIA wiring. */
export const tabId = (view: ViewId) => `tab-${view}`;
export const PANEL_ID = 'studio-panel';

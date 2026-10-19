/**
 * Seed data for the analog editorial bullet journal.
 *
 * The studio clones this on start-up, so user changes (ticked tasks, new
 * entries, collapsed days) never mutate the module itself. See
 * `StudioState.log` in `#lib/state/studio.svelte.ts`.
 */

/** @typedef {import('../types.ts').LogGroup} LogGroup */
/** @typedef {import('../types.ts').LogSymbol} LogSymbol */

/** @type {readonly LogGroup[]} */
export const ANALOG_LOG_DB = [
  {
    id: 'grp-1',
    dateLabel: 'Oct 16, 2026',
    timeframe: 'today',
    collapsed: false,
    items: [
      {
        id: 'a1',
        symbol: '■',
        text: 'Typeset five-column Shoji Ueda synopsis deck for Issue IV lead essay',
        time: '09:15 AM',
      },
      {
        id: 'a2',
        symbol: '★',
        text: 'Verified Montaigne 1588 Bordeaux Copy folio citations in §1 margin',
        time: '11:40 AM',
      },
      {
        id: 'a3',
        symbol: '—',
        text: 'Editorial board note: Navy Blue (#122038) & Pastel Yellow (#F2E294) archival contrast approved',
        time: '',
      },
      {
        id: 'a4',
        symbol: '□',
        text: 'Cross-check Jorge Luis Borges "Funes the Memorious" Spanish original quote',
        time: '04:00 PM',
      },
      {
        id: 'a5',
        symbol: '□',
        text: 'Fork new sub-argument branch on Luhmann’s Zettelkasten in Tree View',
        time: '',
      },
    ],
  },
  {
    id: 'grp-2',
    dateLabel: 'Oct 14, 2026',
    timeframe: 'week',
    collapsed: false,
    items: [
      {
        id: 'a6',
        symbol: '●',
        text: 'Peer review round 2 completed for Dr. Elena Rostova-Vane manuscript',
        time: '02:30 PM',
      },
      {
        id: 'a7',
        symbol: '▽',
        text: 'Restructured transition between §2 (Cloud Retrieval) and §3 (Slip-Boxes)',
        time: '06:00 PM',
      },
      {
        id: 'a8',
        symbol: '▲',
        text: 'Added Mary Carruthers "The Book of Memory" primary source reference',
        time: '',
      },
    ],
  },
];

/**
 * Legend for the rapid-logging key, in display order.
 * @type {readonly { symbol: LogSymbol, meaning: string }[]}
 */
export const LOG_SYMBOL_KEY = [
  { symbol: '□', meaning: 'task' },
  { symbol: '■', meaning: 'done' },
  { symbol: '●', meaning: 'event' },
  { symbol: '—', meaning: 'note' },
  { symbol: '★', meaning: 'priority' },
  { symbol: '▲', meaning: 'added' },
  { symbol: '▽', meaning: 'restructured' },
];

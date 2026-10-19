// Public surface of `#lib`. Import from here for the common pieces, or from a
// specific path (`#lib/utils/tree.ts`) when you only need one module.
export * from './types.ts';
export { ESSAYS_DB } from './data/essayContent.js';
export { ANALOG_LOG_DB, LOG_SYMBOL_KEY } from './data/analogLog.js';
export { StudioState, getStudio, setStudio, DEFAULT_HUD, VIEWS } from './state/studio.svelte.ts';
export { VIEW_META } from './views.ts';
export {
  computeTelemetry,
  essayToMarkdown,
  treeToJson,
  stripHtml,
  padIndex,
} from './utils/text.ts';
export { sanitizeEssayHtml } from './utils/sanitize.ts';
export { layoutTree } from './utils/tree.ts';
export { diffWords, diffParagraphs, changeStats } from './utils/diff.ts';
export { searchEssays } from './utils/search.ts';
export { buildRssFeed } from './utils/feed.ts';
export { httpApi, offlineApi, type StudioApi } from './api/client.ts';
// Server-only code (`#lib/server/*`) is deliberately not re-exported here, so
// importing `#lib` from a component can never pull it into the browser bundle.

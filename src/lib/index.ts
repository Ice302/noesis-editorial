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

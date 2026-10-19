/**
 * Application state for the studio.
 *
 * A single class with `$state` / `$derived` fields replaces the loose module
 * variables of the original component. It is provided through a typed context
 * (`createContext`) rather than exported as a module singleton, so that state
 * is never shared between requests during server rendering.
 *
 * Mutations go through methods; components read fields directly.
 */
import { createContext } from 'svelte';
import { ESSAYS_DB } from '../data/essayContent.js';
import { ANALOG_LOG_DB } from '../data/analogLog.js';
import { computeTelemetry, essayToMarkdown, treeToJson } from '../utils/text.ts';
import { sanitizeEssayHtml } from '../utils/sanitize.ts';
import { copyText, readStorage, writeStorage } from '../utils/browser.ts';
import type {
  AnalogFilter,
  Essay,
  HudParams,
  LogGroup,
  LogSymbol,
  TreeNode,
  ViewId,
} from '../types.ts';

export const VIEWS: readonly ViewId[] = ['reader', 'editor', 'tree', 'analog'];

export const DEFAULT_HUD: Readonly<HudParams> = {
  fontScale: 1.08,
  colWidth: 680,
  lineHeight: 1.75,
  marginaliaOpacity: 1.0,
  highlightIntensity: 0.85,
  treeSpread: 48,
  treeScale: 1.0,
  treeLength: 105,
  treeRootWidth: 5.0,
};

/** Bump the suffix whenever the persisted shape changes incompatibly. */
const STORAGE_KEY = 'noesis:studio:v1';
const TOAST_MS = 3000;

interface PersistedState {
  hud: HudParams;
  edits: Record<string, string[]>;
  log: LogGroup[];
}

const isView = (v: unknown): v is ViewId => VIEWS.includes(v as ViewId);

export class StudioState {
  readonly essays: readonly Essay[] = ESSAYS_DB;

  activeEssayId = $state(ESSAYS_DB[0].id);
  activeView = $state<ViewId>('reader');
  selectedTreeNodeId = $state<string | null>(ESSAYS_DB[0].treeNodes[0]?.id ?? null);
  analogFilter = $state<AnalogFilter>('all');
  hud = $state<HudParams>({ ...DEFAULT_HUD });
  /** Edited paragraphs per essay id. Absent key = untouched archival text. */
  edits = $state<Record<string, string[]>>({});
  log = $state<LogGroup[]>(structuredClone(ANALOG_LOG_DB) as LogGroup[]);
  toastMessage = $state('');
  toastVisible = $state(false);
  /** Becomes true once persisted state has been restored in the browser. */
  hydrated = $state(false);

  #toastTimer: ReturnType<typeof setTimeout> | undefined;

  activeEssay: Essay = $derived(
    this.essays.find((e) => e.id === this.activeEssayId) ?? this.essays[0]
  );
  activeIndex = $derived(this.essays.indexOf(this.activeEssay));
  /** The editor is simply the reader in live-edit mode. */
  isLiveEditMode = $derived(this.activeView === 'editor');
  hasEdits = $derived(this.activeEssay.id in this.edits);
  paragraphs: readonly string[] = $derived(
    this.edits[this.activeEssay.id] ?? this.activeEssay.paragraphs
  );
  /** Paragraphs safe for `{@html}`. */
  renderedParagraphs = $derived(this.paragraphs.map(sanitizeEssayHtml));
  telemetry = $derived(computeTelemetry(this.paragraphs));
  selectedNode: TreeNode = $derived(
    this.activeEssay.treeNodes.find((n) => n.id === this.selectedTreeNodeId) ??
      this.activeEssay.treeNodes[0]
  );
  visibleLog = $derived(
    this.log.filter((g) => {
      if (this.analogFilter === 'today') return g.timeframe === 'today';
      if (this.analogFilter === 'week') return g.timeframe !== 'older';
      return true;
    })
  );

  // --- navigation -------------------------------------------------------

  selectEssay(id: string, { announce = true } = {}) {
    const essay = this.essays.find((e) => e.id === id);
    if (!essay) return;
    this.activeEssayId = id;
    this.selectedTreeNodeId = essay.treeNodes[0]?.id ?? null;
    if (announce) this.showToast(`Loaded Monograph: "${essay.title.slice(0, 38)}..."`);
  }

  /** Moves to the previous (-1) or next (+1) essay, wrapping around. */
  stepEssay(delta: number) {
    const n = this.essays.length;
    this.selectEssay(this.essays[(this.activeIndex + delta + n) % n].id);
  }

  switchMainView(view: ViewId) {
    this.activeView = view;
  }

  setEditorSubMode(isEdit: boolean) {
    this.activeView = isEdit ? 'editor' : 'reader';
  }

  selectTreeNode(id: string) {
    this.selectedTreeNodeId = id;
  }

  // --- manuscript editing -------------------------------------------------

  setParagraph(idx: number, html: string) {
    const id = this.activeEssay.id;
    if (!this.edits[id]) this.edits[id] = [...this.activeEssay.paragraphs];
    if (this.edits[id][idx] !== html) this.edits[id][idx] = html;
  }

  /** Sanitizes a paragraph in place (called on blur so the caret never jumps mid-typing). */
  normalizeParagraph(idx: number) {
    const current = this.edits[this.activeEssay.id]?.[idx];
    if (current !== undefined) this.setParagraph(idx, sanitizeEssayHtml(current));
  }

  revertEdits() {
    delete this.edits[this.activeEssay.id];
    this.showToast('Reverted to archival text.');
  }

  // --- analog log -------------------------------------------------------

  toggleGroup(groupId: string) {
    const group = this.log.find((g) => g.id === groupId);
    if (group) group.collapsed = !group.collapsed;
  }

  /** Flips an open task (□) to done (■) and back. Other symbols are left alone. */
  toggleTask(groupId: string, itemId: string) {
    const item = this.log.find((g) => g.id === groupId)?.items.find((i) => i.id === itemId);
    if (!item) return;
    if (item.symbol === '□') item.symbol = '■';
    else if (item.symbol === '■') item.symbol = '□';
  }

  // `now` is only read for its timestamp, never mutated, so SvelteDate is unnecessary.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  addLogEntry(symbol: LogSymbol, text: string, now = new Date()) {
    const trimmed = text.trim();
    if (!trimmed) return false;

    const dateLabel = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    let group = this.log.find((g) => g.dateLabel === dateLabel);
    if (!group) {
      this.log.unshift({
        id: `grp-${now.getTime()}`,
        dateLabel,
        timeframe: 'today',
        collapsed: false,
        items: [],
      });
      group = this.log[0];
    }
    group.collapsed = false;
    group.items.push({
      id: `a-${now.getTime()}`,
      symbol,
      text: trimmed,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });
    return true;
  }

  // --- HUD ----------------------------------------------------------------

  resetHud() {
    this.hud = { ...DEFAULT_HUD };
    this.showToast('Typographic HUD reset to house defaults.');
  }

  // --- export -------------------------------------------------------------

  async copyMarkdown() {
    const ok = await copyText(essayToMarkdown(this.activeEssay, this.paragraphs));
    this.showToast(
      ok ? 'Copied Markdown broadsheet.' : 'Clipboard unavailable — copy blocked by browser.'
    );
  }

  async copyTreeJson() {
    const ok = await copyText(treeToJson(this.activeEssay));
    this.showToast(ok ? 'Copied Tree JSON.' : 'Clipboard unavailable — copy blocked by browser.');
  }

  // --- feedback -----------------------------------------------------------

  showToast(msg: string) {
    this.toastMessage = msg;
    this.toastVisible = true;
    // Clear the previous timer so rapid actions don't hide the newest toast early.
    clearTimeout(this.#toastTimer);
    this.#toastTimer = setTimeout(() => (this.toastVisible = false), TOAST_MS);
  }

  // --- persistence & URL ------------------------------------------------

  /** Restores persisted state and the `?essay=…&view=…` deep link. Browser only. */
  hydrate(url: URL) {
    const saved = readStorage<Partial<PersistedState>>(STORAGE_KEY, {});
    if (saved.hud) this.hud = { ...DEFAULT_HUD, ...saved.hud };
    if (saved.edits && typeof saved.edits === 'object') this.edits = saved.edits;
    if (Array.isArray(saved.log)) this.log = saved.log;

    const essay = url.searchParams.get('essay');
    const view = url.searchParams.get('view');
    if (essay) this.selectEssay(essay, { announce: false });
    if (isView(view)) this.activeView = view;

    this.hydrated = true;
  }

  /**
   * Plain (non-proxied) copy of everything worth keeping. Reading it inside an
   * `$effect` subscribes that effect to every nested field.
   */
  persistedSnapshot(): PersistedState {
    return $state.snapshot({ hud: this.hud, edits: this.edits, log: this.log });
  }

  /** Writes a snapshot to localStorage (fails soft when storage is unavailable). */
  persist(snapshot: PersistedState = this.persistedSnapshot()) {
    writeStorage(STORAGE_KEY, snapshot);
  }

  /** Query string representing the current essay + view, for shareable links. */
  get searchString(): `?${string}` {
    return `?essay=${this.activeEssayId}&view=${this.activeView}`;
  }
}

export const [getStudio, setStudio] = createContext<StudioState>();

/**
 * Application state for the studio.
 *
 * A single class with `$state` / `$derived` fields. It is provided through a
 * typed context (`createContext`) rather than exported as a module singleton,
 * so state is never shared between requests during server rendering.
 *
 * Mutations go through methods; components read fields directly. Side effects
 * that leave the class (navigation, HTTP) are injected through
 * `StudioOptions`, which keeps the class unit-testable without a browser.
 *
 * Text model (per essay):
 *   archival text  →  revisions R1…Rn (history)  →  working draft (`edits`)
 * The reader shows the draft if there is one, else the latest revision, else
 * the archival text. Revisions live in localStorage when signed out ("local")
 * and on the server when an editor is signed in ("shared").
 */
import { createContext } from 'svelte';
import { ESSAYS_DB } from '../data/essayContent.js';
import { ANALOG_LOG_DB } from '../data/analogLog.js';
import { computeTelemetry, essayToMarkdown, treeToJson } from '../utils/text.ts';
import { sanitizeEssayHtml } from '../utils/sanitize.ts';
import { diffParagraphs, sameParagraphs, type DiffPart } from '../utils/diff.ts';
import { copyText, readStorage, writeStorage } from '../utils/browser.ts';
import { offlineApi, type StudioApi } from '../api/client.ts';
import type {
  AnalogFilter,
  Editor,
  Essay,
  HudParams,
  LogGroup,
  LogSymbol,
  Revision,
  SyncMode,
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
const LOCAL_AUTHOR = 'You (this browser)';

interface PersistedState {
  hud: HudParams;
  edits: Record<string, string[]>;
  localRevisions: Record<string, Revision[]>;
  log: LogGroup[];
}

/** A side of a redline: `'archive'`, `'draft'`, or a revision id. */
export type TextRef = string;
export interface RedlineSpec {
  from: TextRef;
  to: TextRef;
}
export type SyncStatus = 'idle' | 'loading' | 'saving' | 'error' | 'conflict';

export interface StudioOptions {
  /** Reads the essay id from the current route. Omit to keep it in local state (tests). */
  routeEssayId?: () => string | undefined;
  /** Called when the user picks another essay, so the app can navigate to its URL. */
  onSelectEssay?: (id: string, opts: { replace: boolean }) => void;
  /** Shared-editing API; defaults to an offline stub. */
  api?: StudioApi;
}

const isView = (v: unknown): v is ViewId => VIEWS.includes(v as ViewId);

export class StudioState {
  readonly essays: readonly Essay[] = ESSAYS_DB;
  readonly api: StudioApi;
  #routeEssayId: (() => string | undefined) | undefined;
  #onSelectEssay: StudioOptions['onSelectEssay'];
  #localEssayId = $state(ESSAYS_DB[0].id);
  #toastTimer: ReturnType<typeof setTimeout> | undefined;
  // Bookkeeping only (never rendered), so a plain Set rather than SvelteSet.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  #inflight = new Set<string>();

  constructor(options: StudioOptions = {}) {
    this.api = options.api ?? offlineApi;
    this.#routeEssayId = options.routeEssayId;
    this.#onSelectEssay = options.onSelectEssay;
  }

  activeView = $state<ViewId>('reader');
  selectedTreeNodeId = $state<string | null>(ESSAYS_DB[0].treeNodes[0]?.id ?? null);
  analogFilter = $state<AnalogFilter>('all');
  hud = $state<HudParams>({ ...DEFAULT_HUD });
  /** Working drafts per essay id. Absent key = no uncommitted changes. */
  edits = $state<Record<string, string[]>>({});
  /** Revisions committed in this browser while signed out. */
  localRevisions = $state<Record<string, Revision[]>>({});
  /** Revisions loaded from the server for the signed-in editor (not persisted locally). */
  sharedRevisions = $state<Record<string, Revision[]>>({});
  log = $state<LogGroup[]>(structuredClone(ANALOG_LOG_DB) as LogGroup[]);
  editor = $state<Editor | null>(null);
  /** True when a server answered `/api/session`, i.e. editors can sign in. */
  sharedAvailable = $state(false);
  syncStatus = $state<SyncStatus>('idle');
  redline = $state<RedlineSpec | null>(null);
  toastMessage = $state('');
  toastVisible = $state(false);
  /** Becomes true once persisted state has been restored in the browser. */
  hydrated = $state(false);

  // --- derived: essay & text ----------------------------------------------

  activeEssayId = $derived.by(() => {
    const fromRoute = this.#routeEssayId?.();
    return fromRoute && this.essays.some((e) => e.id === fromRoute)
      ? fromRoute
      : this.#localEssayId;
  });
  activeEssay: Essay = $derived(
    this.essays.find((e) => e.id === this.activeEssayId) ?? this.essays[0]
  );
  activeIndex = $derived(this.essays.indexOf(this.activeEssay));
  /** The editor is simply the reader in live-edit mode. */
  isLiveEditMode = $derived(this.activeView === 'editor');

  syncMode: SyncMode = $derived(this.editor ? 'shared' : 'local');
  history: Revision[] = $derived(
    (this.editor ? this.sharedRevisions : this.localRevisions)[this.activeEssay.id] ?? []
  );
  latestRevision: Revision | null = $derived(this.history.at(-1) ?? null);
  /** Text the draft is measured against: latest revision, or the archive. */
  baseParagraphs: readonly string[] = $derived(
    this.latestRevision?.paragraphs ?? this.activeEssay.paragraphs
  );
  paragraphs: readonly string[] = $derived(this.edits[this.activeEssay.id] ?? this.baseParagraphs);
  /** True when the working draft differs from the latest committed text. */
  hasEdits = $derived(
    this.activeEssay.id in this.edits &&
      !sameParagraphs(this.edits[this.activeEssay.id], this.baseParagraphs)
  );
  /** Paragraphs safe for `{@html}`. */
  renderedParagraphs = $derived(this.paragraphs.map(sanitizeEssayHtml));
  telemetry = $derived(computeTelemetry(this.paragraphs));

  /** Per-paragraph word diff for the active redline, or `null` when none is shown. */
  redlineParts: DiffPart[][] | null = $derived.by(() => {
    if (!this.redline) return null;
    const from = this.textFor(this.redline.from);
    const to = this.textFor(this.redline.to);
    if (!from || !to) return null;
    return to.map((p, i) => diffParagraphs(from[i] ?? '', p));
  });

  // --- derived: other views -----------------------------------------------

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

  // --- navigation -----------------------------------------------------------

  selectEssay(id: string, { announce = true, replace = false } = {}) {
    const essay = this.essays.find((e) => e.id === id);
    if (!essay) return;
    this.#localEssayId = id;
    this.selectedTreeNodeId = essay.treeNodes[0]?.id ?? null;
    this.redline = null;
    this.#onSelectEssay?.(id, { replace });
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

  // --- manuscript editing ---------------------------------------------------

  setParagraph(idx: number, html: string) {
    const id = this.activeEssay.id;
    if (!this.edits[id]) this.edits[id] = [...this.baseParagraphs];
    if (this.edits[id][idx] !== html) this.edits[id][idx] = html;
  }

  /** Sanitizes a paragraph in place (called on blur so the caret never jumps mid-typing). */
  normalizeParagraph(idx: number) {
    const current = this.edits[this.activeEssay.id]?.[idx];
    if (current !== undefined) this.setParagraph(idx, sanitizeEssayHtml(current));
  }

  /** Throws away the working draft, returning to the latest committed text. */
  discardDraft() {
    delete this.edits[this.activeEssay.id];
    this.redline = null;
    const base = this.latestRevision ? `R${this.latestRevision.seq}` : 'the archival text';
    this.showToast(`Draft discarded — back to ${base}.`);
  }

  /** Copies an older text (a revision or the archive) into the working draft. */
  restore(ref: TextRef) {
    const source = this.textFor(ref);
    if (!source) return;
    const id = this.activeEssay.id;
    if (sameParagraphs(source, this.baseParagraphs)) delete this.edits[id];
    else this.edits[id] = [...source];
    this.redline = null;
    this.showToast(`Restored ${this.labelFor(ref)} into the draft. Commit to keep it.`);
  }

  /**
   * Commits the working draft as a new revision — on the server when signed in,
   * otherwise in this browser. Returns true on success.
   */
  async commitRevision(note: string): Promise<boolean> {
    if (!this.hasEdits) return false;
    const essayId = this.activeEssay.id;
    const paragraphs = this.edits[essayId].map(sanitizeEssayHtml);
    const trimmed = note.trim().slice(0, 200);

    if (!this.editor) {
      // Read the array back through the state proxy: the value of `??=` is the
      // raw array, and pushing to it would bypass reactivity.
      this.localRevisions[essayId] ??= [];
      const list = this.localRevisions[essayId];
      list.push({
        id: crypto.randomUUID(),
        essayId,
        seq: (list.at(-1)?.seq ?? 0) + 1,
        paragraphs,
        note: trimmed,
        author: LOCAL_AUTHOR,
        // eslint-disable-next-line svelte/prefer-svelte-reactivity -- one-off timestamp
        createdAt: new Date().toISOString(),
      });
      delete this.edits[essayId];
      this.redline = null;
      this.showToast(`Committed R${list.at(-1)!.seq} in this browser.`);
      return true;
    }

    this.syncStatus = 'saving';
    const baseRevisionId = (this.sharedRevisions[essayId] ?? []).at(-1)?.id ?? null;
    const result = await this.api.commitRevision(essayId, {
      paragraphs,
      note: trimmed,
      baseRevisionId,
    });

    switch (result.status) {
      case 'ok':
        this.sharedRevisions[essayId] ??= [];
        this.sharedRevisions[essayId].push(result.revision);
        delete this.edits[essayId];
        this.redline = null;
        this.syncStatus = 'idle';
        this.showToast(`Committed R${result.revision.seq} to the shared archive.`);
        return true;
      case 'conflict':
        this.sharedRevisions[essayId] = result.revisions;
        this.syncStatus = 'conflict';
        this.showToast(
          'A colleague committed first. Your draft is kept — review the redline and commit again.'
        );
        return false;
      case 'unauthorized':
        this.#signedOut('Your session expired. Sign in again to commit.');
        return false;
      default:
        this.syncStatus = 'error';
        this.showToast(result.message);
        return false;
    }
  }

  // --- redlines -------------------------------------------------------------

  /** The paragraphs a reference points at, or `null` if it no longer exists. */
  textFor(ref: TextRef): readonly string[] | null {
    if (ref === 'archive') return this.activeEssay.paragraphs;
    if (ref === 'draft') return this.paragraphs;
    return this.history.find((r) => r.id === ref)?.paragraphs ?? null;
  }

  labelFor(ref: TextRef): string {
    if (ref === 'archive') return 'ARCHIVAL TEXT';
    if (ref === 'draft') return 'WORKING DRAFT';
    const rev = this.history.find((r) => r.id === ref);
    return rev ? `R${rev.seq}` : 'UNKNOWN';
  }

  showRedline(from: TextRef, to: TextRef) {
    this.redline = { from, to };
  }

  closeRedline() {
    this.redline = null;
  }

  /** Toolbar toggle: every change since the archival text. */
  toggleRedline() {
    this.redline = this.redline ? null : { from: 'archive', to: 'draft' };
  }

  // --- shared editing session -----------------------------------------------

  async initSession() {
    const { available, editor } = await this.api.session();
    this.sharedAvailable = available;
    this.editor = editor;
  }

  async login(username: string, password: string) {
    const result = await this.api.login(username, password);
    if (result.ok) {
      this.editor = result.editor;
      this.sharedRevisions = {};
      this.redline = null;
      this.showToast(`Signed in as ${result.editor.displayName}. Revisions now sync.`);
    }
    return result;
  }

  async logout() {
    await this.api.logout();
    this.#signedOut('Signed out. Revisions are saved in this browser only.');
  }

  /** Fetches the shared history of an essay once per session (or again with `force`). */
  async loadSharedRevisions(essayId: string, { force = false } = {}) {
    if (!this.editor || this.#inflight.has(essayId)) return;
    if (!force && essayId in this.sharedRevisions) return;
    this.#inflight.add(essayId);
    this.syncStatus = 'loading';
    try {
      const result = await this.api.listRevisions(essayId);
      if (result === 'unauthorized') this.#signedOut('Your session expired. Sign in again.');
      else if (result === null) this.syncStatus = 'error';
      else {
        this.sharedRevisions[essayId] = result;
        this.syncStatus = 'idle';
      }
    } finally {
      this.#inflight.delete(essayId);
    }
  }

  #signedOut(message: string) {
    this.editor = null;
    this.sharedRevisions = {};
    this.redline = null;
    this.syncStatus = 'idle';
    this.showToast(message);
  }

  // --- analog log -----------------------------------------------------------

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

  // --- HUD ------------------------------------------------------------------

  resetHud() {
    this.hud = { ...DEFAULT_HUD };
    this.showToast('Typographic HUD reset to house defaults.');
  }

  // --- export ---------------------------------------------------------------

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

  // --- feedback -------------------------------------------------------------

  showToast(msg: string) {
    this.toastMessage = msg;
    this.toastVisible = true;
    // Clear the previous timer so rapid actions don't hide the newest toast early.
    clearTimeout(this.#toastTimer);
    this.#toastTimer = setTimeout(() => (this.toastVisible = false), TOAST_MS);
  }

  // --- persistence & URL ----------------------------------------------------

  /** Restores persisted state and the `?view=` parameter. Browser only. */
  hydrate(url: URL) {
    const saved = readStorage<Partial<PersistedState>>(STORAGE_KEY, {});
    if (saved.hud) this.hud = { ...DEFAULT_HUD, ...saved.hud };
    if (saved.edits && typeof saved.edits === 'object') this.edits = saved.edits;
    if (saved.localRevisions && typeof saved.localRevisions === 'object') {
      this.localRevisions = saved.localRevisions;
    }
    if (Array.isArray(saved.log)) this.log = saved.log;

    const view = url.searchParams.get('view');
    if (isView(view)) this.activeView = view;

    this.hydrated = true;
  }

  /**
   * The essay a legacy `/?essay=ms-03` link points at, if it's valid and not
   * already open. The layout redirects to its URL before hydrating.
   */
  legacyEssayRedirect(url: URL): string | null {
    const id = url.searchParams.get('essay');
    return id && id !== this.activeEssayId && this.essays.some((e) => e.id === id) ? id : null;
  }

  /**
   * Plain (non-proxied) copy of everything worth keeping. Reading it inside an
   * `$effect` subscribes that effect to every nested field.
   */
  persistedSnapshot(): PersistedState {
    return $state.snapshot({
      hud: this.hud,
      edits: this.edits,
      localRevisions: this.localRevisions,
      log: this.log,
    });
  }

  /** Writes a snapshot to localStorage (fails soft when storage is unavailable). */
  persist(snapshot: PersistedState = this.persistedSnapshot()) {
    writeStorage(STORAGE_KEY, snapshot);
  }

  /** Query string for the current view (`''` for the default reader view). */
  get viewSearch(): '' | `?${string}` {
    return this.activeView === 'reader' ? '' : `?view=${this.activeView}`;
  }
}

export const [getStudio, setStudio] = createContext<StudioState>();

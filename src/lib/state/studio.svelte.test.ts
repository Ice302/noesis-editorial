import { describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import { StudioState, DEFAULT_HUD } from './studio.svelte.ts';
import { ANALOG_LOG_DB } from '../data/analogLog.js';
import { offlineApi, type StudioApi } from '../api/client.ts';
import type { Revision } from '../types.ts';

const editor = { username: 'ed', displayName: 'Ed Itor' };

function fakeApi(overrides: Partial<StudioApi> = {}): StudioApi {
  return {
    ...offlineApi,
    session: async () => ({ available: true, editor: null }),
    login: async () => ({ ok: true, editor }),
    listRevisions: async () => [],
    ...overrides,
  };
}

const rev = (seq: number, paragraphs: string[], essayId = 'ms-01'): Revision => ({
  id: `r${seq}`,
  essayId,
  seq,
  paragraphs,
  note: '',
  author: 'Someone',
  createdAt: '2026-10-19T10:00:00Z',
});

describe('StudioState — navigation', () => {
  it('starts on the first essay in the reader', () => {
    const s = new StudioState();
    expect(s.activeEssay.id).toBe('ms-01');
    expect(s.activeView).toBe('reader');
    expect(s.isLiveEditMode).toBe(false);
    expect(s.selectedNode.id).toBe('n0');
  });

  it('selects essays, resets the tree selection and notifies the router', () => {
    const onSelectEssay = vi.fn();
    const s = new StudioState({ onSelectEssay });
    s.selectTreeNode('n4');
    s.selectEssay('ms-02', { announce: false });
    expect(s.activeEssay.id).toBe('ms-02');
    expect(s.selectedNode.id).toBe('s0');
    expect(onSelectEssay).toHaveBeenCalledWith('ms-02', { replace: false });
  });

  it('follows the route when a route source is given', () => {
    let routeId = 'ms-03';
    const s = new StudioState({ routeEssayId: () => routeId });
    expect(s.activeEssay.id).toBe('ms-03');
    routeId = 'nope';
    const t = new StudioState({ routeEssayId: () => routeId });
    expect(t.activeEssay.id).toBe('ms-01');
  });

  it('steps through essays with wrap-around', () => {
    const s = new StudioState();
    s.stepEssay(-1);
    expect(s.activeEssay.id).toBe(s.essays.at(-1)!.id);
    s.stepEssay(1);
    expect(s.activeEssay.id).toBe('ms-01');
  });

  it('treats the editor view as live-edit mode', () => {
    const s = new StudioState();
    s.setEditorSubMode(true);
    expect(s.activeView).toBe('editor');
    expect(s.isLiveEditMode).toBe(true);
    s.setEditorSubMode(false);
    expect(s.activeView).toBe('reader');
  });

  it('encodes only non-default views in the query string', () => {
    const s = new StudioState();
    expect(s.viewSearch).toBe('');
    s.switchMainView('tree');
    expect(s.viewSearch).toBe('?view=tree');
  });
});

describe('StudioState — drafts and local revisions', () => {
  it('copies paragraphs on first edit, updates telemetry, and discards', () => {
    const s = new StudioState();
    const before = s.telemetry.wordCount;
    s.setParagraph(0, 'Short.');
    expect(s.hasEdits).toBe(true);
    expect(s.paragraphs[0]).toBe('Short.');
    expect(s.paragraphs[1]).toBe(s.activeEssay.paragraphs[1]);
    expect(s.telemetry.wordCount).toBeLessThan(before);
    s.discardDraft();
    expect(s.hasEdits).toBe(false);
    expect(s.telemetry.wordCount).toBe(before);
  });

  it('does not count a draft identical to the base as an edit', () => {
    const s = new StudioState();
    s.setParagraph(0, s.activeEssay.paragraphs[0]);
    expect(s.hasEdits).toBe(false);
  });

  it('sanitizes a paragraph on normalize', () => {
    const s = new StudioState();
    s.setParagraph(1, 'x<script>bad()</script><b>y</b>');
    s.normalizeParagraph(1);
    expect(s.paragraphs[1]).toBe('x<strong>y</strong>');
  });

  it('commits local revisions in sequence and builds drafts on the latest', async () => {
    const s = new StudioState();
    s.setParagraph(0, 'First draft.');
    expect(await s.commitRevision('  first pass  ')).toBe(true);
    expect(s.history).toHaveLength(1);
    expect(s.latestRevision).toMatchObject({
      seq: 1,
      note: 'first pass',
      author: 'You (this browser)',
    });
    expect(s.hasEdits).toBe(false);
    expect(s.paragraphs[0]).toBe('First draft.');

    s.setParagraph(1, 'Second paragraph rewritten.');
    expect(s.paragraphs[0]).toBe('First draft.'); // draft starts from R1, not the archive
    await s.commitRevision('');
    expect(s.history.map((r) => r.seq)).toEqual([1, 2]);
  });

  it('refuses to commit when there is nothing to commit', async () => {
    const s = new StudioState();
    expect(await s.commitRevision('noop')).toBe(false);
    expect(s.history).toHaveLength(0);
  });

  it('restores an older text into the draft', async () => {
    const s = new StudioState();
    s.setParagraph(0, 'Changed.');
    await s.commitRevision('');
    s.restore('archive');
    expect(s.hasEdits).toBe(true);
    expect(s.paragraphs[0]).toBe(s.activeEssay.paragraphs[0]);
    s.restore(s.history[0].id); // back to R1 = base → draft removed
    expect(s.hasEdits).toBe(false);
  });

  it('builds a redline between any two texts', async () => {
    const s = new StudioState();
    s.setParagraph(0, 'In the winter of 1580, Michel.');
    s.toggleRedline();
    expect(s.redline).toEqual({ from: 'archive', to: 'draft' });
    const ops = s.redlineParts![0].map((p) => p.op);
    expect(ops).toContain('delete');
    expect(ops).toContain('insert');
    expect(s.redlineParts![1]).toEqual([{ op: 'equal', text: expect.any(String) }]);
    expect(s.labelFor('archive')).toBe('ARCHIVAL TEXT');
    s.closeRedline();
    expect(s.redlineParts).toBeNull();
  });

  it('drops the redline when switching essays', () => {
    const s = new StudioState();
    s.toggleRedline();
    s.selectEssay('ms-02', { announce: false });
    expect(s.redline).toBeNull();
  });
});

describe('StudioState — shared editing', () => {
  it('detects the server and signs in', async () => {
    const s = new StudioState({ api: fakeApi() });
    await s.initSession();
    expect(s.sharedAvailable).toBe(true);
    expect(s.syncMode).toBe('local');
    await s.login('ed', 'pw');
    expect(s.editor).toEqual(editor);
    expect(s.syncMode).toBe('shared');
  });

  it('reports no server on static hosting', async () => {
    const s = new StudioState();
    await s.initSession();
    expect(s.sharedAvailable).toBe(false);
  });

  it('loads shared history once and commits against the latest revision', async () => {
    const listRevisions = vi.fn(async () => [rev(1, ['a'])]);
    const commitRevision = vi.fn(async (_id: string, input: { baseRevisionId: string | null }) => ({
      status: 'ok' as const,
      revision: { ...rev(2, ['b']), id: 'r2', note: input.baseRevisionId ?? '' },
    }));
    const s = new StudioState({ api: fakeApi({ listRevisions, commitRevision }) });
    await s.login('ed', 'pw');
    await s.loadSharedRevisions('ms-01');
    await s.loadSharedRevisions('ms-01');
    expect(listRevisions).toHaveBeenCalledTimes(1);
    expect(s.latestRevision?.id).toBe('r1');

    // Shared drafts start from the shared latest revision.
    s.setParagraph(0, 'changed');
    expect(await s.commitRevision('note')).toBe(true);
    expect(commitRevision.mock.calls[0][1].baseRevisionId).toBe('r1');
    expect(s.history.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(s.hasEdits).toBe(false);
  });

  it('keeps the draft and refreshes history on a conflict', async () => {
    const s = new StudioState({
      api: fakeApi({
        commitRevision: async () => ({ status: 'conflict', revisions: [rev(1, ['theirs'])] }),
      }),
    });
    await s.login('ed', 'pw');
    await s.loadSharedRevisions('ms-01');
    s.setParagraph(0, 'mine');
    expect(await s.commitRevision('')).toBe(false);
    expect(s.syncStatus).toBe('conflict');
    expect(s.latestRevision?.paragraphs).toEqual(['theirs']);
    expect(s.paragraphs[0]).toBe('mine');
  });

  it('signs out locally when the session has expired', async () => {
    const s = new StudioState({
      api: fakeApi({ commitRevision: async () => ({ status: 'unauthorized' }) }),
    });
    await s.login('ed', 'pw');
    await s.loadSharedRevisions('ms-01');
    s.setParagraph(0, 'mine');
    await s.commitRevision('');
    expect(s.editor).toBeNull();
    expect(s.syncMode).toBe('local');
    expect(s.paragraphs[0]).toBe('mine'); // draft survives
  });

  it('keeps local and shared histories separate', async () => {
    const s = new StudioState({ api: fakeApi() });
    s.setParagraph(0, 'local change');
    await s.commitRevision('');
    expect(s.history).toHaveLength(1);
    await s.login('ed', 'pw');
    await s.loadSharedRevisions('ms-01');
    expect(s.history).toHaveLength(0);
    await s.logout();
    expect(s.history).toHaveLength(1);
  });
});

describe('StudioState — journal, HUD, hydration', () => {
  it('filters the analog log by timeframe', () => {
    const s = new StudioState();
    s.analogFilter = 'today';
    expect(s.visibleLog.map((g) => g.id)).toEqual(['grp-1']);
    s.analogFilter = 'all';
    expect(s.visibleLog).toHaveLength(ANALOG_LOG_DB.length);
  });

  it('toggles only task bullets and never mutates the seed', () => {
    const s = new StudioState();
    s.toggleTask('grp-1', 'a4');
    expect(s.log[0].items.find((i) => i.id === 'a4')!.symbol).toBe('■');
    s.toggleTask('grp-1', 'a2'); // ★ priority — unchanged
    expect(s.log[0].items.find((i) => i.id === 'a2')!.symbol).toBe('★');
    expect(ANALOG_LOG_DB[0].items.find((i) => i.id === 'a4')!.symbol).toBe('□');
  });

  it('adds log entries to a dated group and rejects blanks', () => {
    const s = new StudioState();
    const when = new Date('2026-10-19T10:30:00');
    expect(s.addLogEntry('—', '   ', when)).toBe(false);
    expect(s.addLogEntry('★', 'Proof Issue IV', when)).toBe(true);
    expect(s.log[0].dateLabel).toBe('Oct 19, 2026');
    expect(s.log[0].items[0]).toMatchObject({ symbol: '★', text: 'Proof Issue IV' });
  });

  it('restores HUD defaults', () => {
    const s = new StudioState();
    s.hud.fontScale = 1.3;
    s.resetHud();
    expect(s.hud).toEqual(DEFAULT_HUD);
  });

  it('hydrates the view from the URL, ignoring junk', () => {
    const s = new StudioState();
    s.hydrate(new URL('https://x.test/essays/ms-01?view=tree'));
    expect(s.activeView).toBe('tree');
    expect(s.hydrated).toBe(true);

    const t = new StudioState();
    t.hydrate(new URL('https://x.test/?view=admin'));
    expect(t.activeView).toBe('reader');
  });

  it('recognises legacy ?essay= links worth redirecting', () => {
    const s = new StudioState();
    expect(s.legacyEssayRedirect(new URL('https://x.test/?essay=ms-03&view=tree'))).toBe('ms-03');
    expect(s.legacyEssayRedirect(new URL('https://x.test/?essay=ms-01'))).toBeNull(); // already open
    expect(s.legacyEssayRedirect(new URL('https://x.test/?essay=nope'))).toBeNull();
  });
});

describe('StudioState — reactivity', () => {
  it('notifies effects when the first revision of an essay is committed', async () => {
    const s = new StudioState();
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(s.history.length);
      });
    });
    flushSync();
    s.setParagraph(0, 'changed');
    await s.commitRevision('');
    flushSync();
    expect(seen.at(-1)).toBe(1);
    stop();
  });
});

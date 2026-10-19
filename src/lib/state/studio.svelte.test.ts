import { describe, expect, it } from 'vitest';
import { StudioState, DEFAULT_HUD } from './studio.svelte.ts';
import { ANALOG_LOG_DB } from '../data/analogLog.js';

describe('StudioState', () => {
  it('starts on the first essay in the reader', () => {
    const s = new StudioState();
    expect(s.activeEssay.id).toBe('ms-01');
    expect(s.activeView).toBe('reader');
    expect(s.isLiveEditMode).toBe(false);
    expect(s.selectedNode.id).toBe('n0');
  });

  it('selects essays and resets the tree selection to the new root', () => {
    const s = new StudioState();
    s.selectTreeNode('n4');
    s.selectEssay('ms-02', { announce: false });
    expect(s.activeEssay.id).toBe('ms-02');
    expect(s.selectedNode.id).toBe('s0');
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

  it('copies paragraphs on first edit, updates telemetry, and reverts', () => {
    const s = new StudioState();
    const before = s.telemetry.wordCount;
    s.setParagraph(0, 'Short.');
    expect(s.hasEdits).toBe(true);
    expect(s.paragraphs[0]).toBe('Short.');
    expect(s.paragraphs[1]).toBe(s.activeEssay.paragraphs[1]);
    expect(s.telemetry.wordCount).toBeLessThan(before);
    s.revertEdits();
    expect(s.hasEdits).toBe(false);
    expect(s.telemetry.wordCount).toBe(before);
  });

  it('sanitizes a paragraph on normalize', () => {
    const s = new StudioState();
    s.setParagraph(1, 'x<script>bad()</script><b>y</b>');
    s.normalizeParagraph(1);
    expect(s.paragraphs[1]).toBe('x<strong>y</strong>');
  });

  it('filters the analog log by timeframe', () => {
    const s = new StudioState();
    s.analogFilter = 'today';
    expect(s.visibleLog.map((g) => g.id)).toEqual(['grp-1']);
    s.analogFilter = 'all';
    expect(s.visibleLog).toHaveLength(ANALOG_LOG_DB.length);
  });

  it('toggles only task bullets', () => {
    const s = new StudioState();
    s.toggleTask('grp-1', 'a4');
    expect(s.log[0].items.find((i) => i.id === 'a4')!.symbol).toBe('■');
    s.toggleTask('grp-1', 'a2'); // ★ priority — unchanged
    expect(s.log[0].items.find((i) => i.id === 'a2')!.symbol).toBe('★');
  });

  it('does not mutate the seed data', () => {
    const s = new StudioState();
    s.toggleTask('grp-1', 'a4');
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

  it('hydrates view and essay from the URL, ignoring junk', () => {
    const s = new StudioState();
    s.hydrate(new URL('https://x.test/?essay=ms-03&view=tree'));
    expect(s.activeEssay.id).toBe('ms-03');
    expect(s.activeView).toBe('tree');
    expect(s.hydrated).toBe(true);

    const t = new StudioState();
    t.hydrate(new URL('https://x.test/?essay=nope&view=admin'));
    expect(t.activeEssay.id).toBe('ms-01');
    expect(t.activeView).toBe('reader');
  });
});

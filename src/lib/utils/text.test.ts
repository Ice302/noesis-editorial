import { describe, expect, it } from 'vitest';
import {
  computeTelemetry,
  essayToMarkdown,
  inlineHtmlToMarkdown,
  padIndex,
  stripHtml,
  treeToJson,
} from './text.ts';
import { ESSAYS_DB } from '../data/essayContent.js';

describe('stripHtml', () => {
  it('removes tags, decodes entities and collapses whitespace', () => {
    expect(stripHtml('<em>Ma</em>&nbsp;&amp;   <mark class="x">void</mark>')).toBe('Ma & void');
  });
});

describe('computeTelemetry', () => {
  it('counts words across paragraphs, ignoring markup', () => {
    const t = computeTelemetry(['<em>one</em> two', 'three <mark>four</mark>']);
    expect(t.wordCount).toBe(4);
    expect(t.readMinutes).toBe(1);
  });

  it('reports lexical diversity as distinct words over total words', () => {
    // 4 words, 2 distinct forms ("the", "cat") → 50%.
    expect(computeTelemetry(['The cat, the CAT.']).lexicalDensity).toBe('50.0');
  });

  it('handles empty input', () => {
    expect(computeTelemetry([])).toEqual({ wordCount: 0, readMinutes: 1, lexicalDensity: '0.0' });
  });

  it('rounds reading time up at 210 wpm', () => {
    const words = Array.from({ length: 211 }, () => 'w').join(' ');
    expect(computeTelemetry([words]).readMinutes).toBe(2);
  });
});

describe('padIndex', () => {
  it('pads single digits and leaves two digits alone', () => {
    expect(padIndex(3)).toBe('03');
    expect(padIndex(12)).toBe('12');
  });
});

describe('markdown export', () => {
  it('maps inline markup to Markdown', () => {
    expect(inlineHtmlToMarkdown('<em>a</em> <mark class="editorial-highlight">b</mark><br>c')).toBe(
      '*a* **b**  \nc'
    );
  });

  it('includes title, deck, body and marginalia footnotes', () => {
    const essay = ESSAYS_DB[0];
    const md = essayToMarkdown(essay);
    expect(md.startsWith(`# ${essay.title}`)).toBe(true);
    expect(md).toContain(`> ${essay.deckColumns[0]}`);
    expect(md).toContain('[^1]: **SCHOLIUM**');
    expect(md).not.toMatch(/<\/?(em|mark)/);
  });

  it('exports the tree as parseable JSON', () => {
    const parsed = JSON.parse(treeToJson(ESSAYS_DB[1]));
    expect(parsed.nodes).toHaveLength(ESSAYS_DB[1].treeNodes.length);
  });
});

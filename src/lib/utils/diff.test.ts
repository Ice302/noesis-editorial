import { describe, expect, it } from 'vitest';
import { changeStats, diffParagraphs, diffWords, sameParagraphs, tokenize } from './diff.ts';

const render = (parts: ReturnType<typeof diffWords>) =>
  parts
    .map((p) => (p.op === 'equal' ? p.text : p.op === 'insert' ? `[+${p.text}]` : `[-${p.text}]`))
    .join('');

describe('diffWords', () => {
  it('returns a single equal part for identical text', () => {
    expect(diffWords('a b c', 'a b c')).toEqual([{ op: 'equal', text: 'a b c' }]);
  });

  it('marks a replaced word as delete + insert', () => {
    expect(render(diffWords('the quick fox', 'the slow fox'))).toBe('the [-quick ][+slow ]fox');
  });

  it('handles pure insertions and deletions', () => {
    expect(render(diffWords('a c', 'a b c'))).toBe('a [+b ]c');
    expect(render(diffWords('a b c', 'a c'))).toBe('a [-b ]c');
    expect(render(diffWords('', 'new text'))).toBe('[+new text]');
    expect(render(diffWords('old text', ''))).toBe('[-old text]');
  });

  it('reconstructs both sides exactly', () => {
    const a = 'Memory has never been a neutral storage drive. It is choreography.';
    const b = 'Memory was never a neutral drive; it is an architectural choreography.';
    const parts = diffWords(a, b);
    const after = parts
      .filter((p) => p.op !== 'delete')
      .map((p) => p.text)
      .join('');
    const before = parts
      .filter((p) => p.op !== 'insert')
      .map((p) => p.text)
      .join('');
    expect(after).toBe(b);
    expect(before).toBe(a);
  });

  it('ignores whitespace-only differences between tokens', () => {
    expect(diffWords('a  b', 'a b').every((p) => p.op === 'equal')).toBe(true);
  });
});

describe('diffParagraphs / changeStats', () => {
  it('diffs visible text, ignoring markup', () => {
    expect(diffParagraphs('<em>Ma</em> is space', 'Ma is space')).toEqual([
      { op: 'equal', text: 'Ma is space' },
    ]);
  });

  it('counts added and removed words across paragraphs', () => {
    expect(changeStats(['one two', 'three'], ['one two four', 'three'])).toEqual({
      added: 1,
      removed: 0,
      changedParagraphs: 1,
    });
  });
});

describe('helpers', () => {
  it('tokenizes words with trailing whitespace', () => {
    expect(tokenize('a  b\nc')).toEqual(['a  ', 'b\n', 'c']);
  });

  it('compares paragraph lists', () => {
    expect(sameParagraphs(['a'], ['a'])).toBe(true);
    expect(sameParagraphs(['a'], ['b'])).toBe(false);
    expect(sameParagraphs(['a'], ['a', 'b'])).toBe(false);
  });
});

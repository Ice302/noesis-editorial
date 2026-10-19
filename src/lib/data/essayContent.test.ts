// Content integrity checks: these catch the editorial mistakes that would
// otherwise only show up as a broken tree or a dangling § reference.
import { describe, expect, it } from 'vitest';
import { ESSAYS_DB } from './essayContent.js';
import { ANALOG_LOG_DB } from './analogLog.js';

const ALLOWED_TAG_RE = /<\/?(em|i|strong|b|br|mark)(\s+class="editorial-highlight")?\s*\/?>/g;

describe('ESSAYS_DB', () => {
  it('ships the four Issue IV essays with unique ids', () => {
    expect(ESSAYS_DB).toHaveLength(4);
    expect(new Set(ESSAYS_DB.map((e) => e.id)).size).toBe(ESSAYS_DB.length);
  });

  describe.each(ESSAYS_DB.map((e) => [e.id, e] as const))('%s', (_id, essay) => {
    it('has a five-column deck and at least one paragraph', () => {
      expect(essay.deckColumns).toHaveLength(5);
      expect(essay.paragraphs.length).toBeGreaterThan(0);
    });

    it('only uses allowed inline markup', () => {
      for (const p of essay.paragraphs) {
        expect(p.replace(ALLOWED_TAG_RE, '')).not.toMatch(/<[a-z/]/i);
      }
    });

    it('points every marginal note at a real paragraph', () => {
      for (const note of essay.marginalia) {
        expect(note.paraIndex).toBeGreaterThanOrEqual(0);
        expect(note.paraIndex).toBeLessThan(essay.paragraphs.length);
      }
      expect(new Set(essay.marginalia.map((m) => m.id)).size).toBe(essay.marginalia.length);
    });

    it('has a single-rooted tree whose parents and paragraphs exist', () => {
      const ids = new Set(essay.treeNodes.map((n) => n.id));
      expect(ids.size).toBe(essay.treeNodes.length);
      expect(essay.treeNodes.filter((n) => n.parentId === null)).toHaveLength(1);
      for (const n of essay.treeNodes) {
        if (n.parentId !== null) expect(ids.has(n.parentId)).toBe(true);
        expect(n.paraIndex).toBeLessThan(essay.paragraphs.length);
        expect(n.weight).toBeGreaterThanOrEqual(0);
        expect(n.weight).toBeLessThanOrEqual(1);
      }
    });
  });
});

describe('ANALOG_LOG_DB', () => {
  it('has unique group and item ids', () => {
    const items = ANALOG_LOG_DB.flatMap((g) => g.items.map((i) => i.id));
    expect(new Set(ANALOG_LOG_DB.map((g) => g.id)).size).toBe(ANALOG_LOG_DB.length);
    expect(new Set(items).size).toBe(items.length);
  });
});

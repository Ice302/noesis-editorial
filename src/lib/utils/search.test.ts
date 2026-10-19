import { describe, expect, it } from 'vitest';
import { fold, searchEssays } from './search.ts';
import { ESSAYS_DB } from '../data/essayContent.js';

describe('searchEssays', () => {
  it('returns every essay, newest first, for an empty query', () => {
    const results = searchEssays(ESSAYS_DB, '  ');
    expect(results).toHaveLength(ESSAYS_DB.length);
    expect(results.map((r) => r.essay.published)).toEqual(
      [...ESSAYS_DB.map((e) => e.published)].sort().reverse()
    );
  });

  it('finds body text and returns a snippet around the match', () => {
    const [top] = searchEssays(ESSAYS_DB, 'Locke');
    expect(top.essay.id).toBe('ms-03');
    expect(top.snippet?.match).toBe('Locke');
  });

  it('requires every term to match', () => {
    expect(searchEssays(ESSAYS_DB, 'Adorno heresy').map((r) => r.essay.id)).toEqual(['ms-04']);
    expect(searchEssays(ESSAYS_DB, 'Adorno Tottori')).toHaveLength(0);
  });

  it('ranks title matches above body mentions', () => {
    const ids = searchEssays(ESSAYS_DB, 'silence').map((r) => r.essay.id);
    expect(ids[0]).toBe('ms-02');
  });

  it('is case- and accent-insensitive', () => {
    expect(fold('Bibliothèque')).toBe('bibliotheque');
    expect(searchEssays(ESSAYS_DB, 'bibliotheque').length).toBeGreaterThan(0);
  });
});

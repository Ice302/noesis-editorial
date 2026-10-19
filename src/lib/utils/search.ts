/**
 * Client-side archive search. The issue is small enough to search in memory;
 * ranking favours title and category matches over body text, and every result
 * that matched in the body carries a short snippet around the first hit.
 */
import type { Essay } from '../types.ts';
import { stripHtml } from './text.ts';

export interface SearchResult {
  essay: Essay;
  score: number;
  /** Body excerpt around the first match: text before, the match, text after. */
  snippet: { before: string; match: string; after: string } | null;
}

/** Lower-cases and strips diacritics so "noesis" finds "Noēsis". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

const WEIGHTS = { title: 10, category: 6, author: 6, subtitle: 4, deck: 2, body: 1 } as const;
const SNIPPET_RADIUS = 70;

function countHits(haystack: string, needle: string): number {
  let count = 0;
  for (
    let i = haystack.indexOf(needle);
    i !== -1;
    i = haystack.indexOf(needle, i + needle.length)
  ) {
    count++;
  }
  return count;
}

function makeSnippet(body: string, foldedBody: string, term: string) {
  const at = foldedBody.indexOf(term);
  if (at === -1) return null;
  // Folding can shorten strings (combining marks); fall back to the folded offset,
  // which is exact for the precomposed text used in this archive.
  const from = Math.max(0, at - SNIPPET_RADIUS);
  const to = Math.min(body.length, at + term.length + SNIPPET_RADIUS);
  return {
    before: (from > 0 ? '…' : '') + body.slice(from, at).trimStart(),
    match: body.slice(at, at + term.length),
    after: body.slice(at + term.length, to).trimEnd() + (to < body.length ? '…' : ''),
  };
}

/**
 * Returns essays matching every whitespace-separated term in `query`, best
 * first. An empty query returns everything, newest first.
 */
export function searchEssays(essays: readonly Essay[], query: string): SearchResult[] {
  const terms = fold(query).split(/\s+/).filter(Boolean);
  const newestFirst = [...essays].sort((a, b) => b.published.localeCompare(a.published));

  if (terms.length === 0) {
    return newestFirst.map((essay) => ({ essay, score: 0, snippet: null }));
  }

  const results: SearchResult[] = [];
  for (const essay of newestFirst) {
    const body = essay.paragraphs.map(stripHtml).join(' ');
    const fields = {
      title: fold(essay.title),
      category: fold(essay.category),
      author: fold(essay.author),
      subtitle: fold(essay.subtitle),
      deck: fold(essay.deckColumns.join(' ')),
      body: fold(body),
    };

    let score = 0;
    let matchedAll = true;
    for (const term of terms) {
      let termScore = 0;
      for (const [field, text] of Object.entries(fields) as [keyof typeof WEIGHTS, string][]) {
        termScore += countHits(text, term) * WEIGHTS[field];
      }
      if (termScore === 0) {
        matchedAll = false;
        break;
      }
      score += termScore;
    }
    if (!matchedAll) continue;

    results.push({ essay, score, snippet: makeSnippet(body, fields.body, terms[0]) });
  }

  return results.sort((a, b) => b.score - a.score);
}

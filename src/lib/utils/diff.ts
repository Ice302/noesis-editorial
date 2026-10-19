/**
 * Word-level diff for editorial redlines.
 *
 * Uses the classic longest-common-subsequence table over word tokens
 * (whitespace is kept attached to the preceding word so the output re-joins
 * into readable text). Paragraphs are a few hundred words at most, so the
 * O(n·m) table is small; a common prefix/suffix is trimmed first to keep the
 * typical "one sentence changed" case close to linear.
 */
import { stripHtml } from './text.ts';

export type DiffOp = 'equal' | 'insert' | 'delete';

export interface DiffPart {
  op: DiffOp;
  text: string;
}

/** Splits text into word tokens that keep their trailing whitespace. */
export function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? [];
}

const norm = (token: string) => token.trimEnd();

function push(parts: DiffPart[], op: DiffOp, text: string) {
  const last = parts.at(-1);
  if (last && last.op === op) last.text += text;
  else parts.push({ op, text });
}

/** Diffs two plain-text strings word by word. */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokenize(before);
  const b = tokenize(after);

  let start = 0;
  while (start < a.length && start < b.length && norm(a[start]) === norm(b[start])) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && norm(a[endA - 1]) === norm(b[endB - 1])) {
    endA--;
    endB--;
  }

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;

  // lcs[i][j] = LCS length of midA[i..] and midB[j..]
  const lcs: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        norm(midA[i]) === norm(midB[j])
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const parts: DiffPart[] = [];
  if (start > 0) push(parts, 'equal', b.slice(0, start).join(''));

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (norm(midA[i]) === norm(midB[j])) {
      push(parts, 'equal', midB[j]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push(parts, 'delete', midA[i++]);
    } else {
      push(parts, 'insert', midB[j++]);
    }
  }
  while (i < n) push(parts, 'delete', midA[i++]);
  while (j < m) push(parts, 'insert', midB[j++]);

  if (endB < b.length) push(parts, 'equal', b.slice(endB).join(''));
  return parts;
}

/** Diffs two HTML paragraphs on their visible text. */
export function diffParagraphs(beforeHtml: string, afterHtml: string): DiffPart[] {
  return diffWords(stripHtml(beforeHtml), stripHtml(afterHtml));
}

export interface ChangeStats {
  added: number;
  removed: number;
  changedParagraphs: number;
}

/** Word-level additions/removals across a whole essay. */
export function changeStats(before: readonly string[], after: readonly string[]): ChangeStats {
  const stats: ChangeStats = { added: 0, removed: 0, changedParagraphs: 0 };
  const len = Math.max(before.length, after.length);
  for (let p = 0; p < len; p++) {
    const parts = diffParagraphs(before[p] ?? '', after[p] ?? '');
    let changed = false;
    for (const part of parts) {
      if (part.op === 'equal') continue;
      changed = true;
      const words = tokenize(part.text).length;
      if (part.op === 'insert') stats.added += words;
      else stats.removed += words;
    }
    if (changed) stats.changedParagraphs++;
  }
  return stats;
}

/** True when two paragraph lists render the same text and markup. */
export function sameParagraphs(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((p, i) => p === b[i]);
}

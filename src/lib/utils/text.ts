/**
 * Text helpers: telemetry for the HUD and plain-text / Markdown exports.
 * All functions are pure and run identically on the server and in the browser.
 */
import type { Essay } from '../types.ts';

/** Average adult silent-reading speed for non-fiction prose. */
export const WORDS_PER_MINUTE = 210;

const TAG_RE = /<[^>]*>/g;
const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};
const ENTITY_RE = /&(?:amp|lt|gt|quot|#39|nbsp);/g;

/** Decodes the handful of entities that `innerHTML` produces for plain text. */
export function decodeEntities(text: string): string {
  return text.replace(ENTITY_RE, (entity) => ENTITY_MAP[entity] ?? entity);
}

/** Removes tags, decodes entities and collapses whitespace. */
export function stripHtml(html: string): string {
  return decodeEntities(html.replace(TAG_RE, ' ')).replace(/\s+/g, ' ').trim();
}

export interface Telemetry {
  wordCount: number;
  readMinutes: number;
  /**
   * Lexical diversity as a percentage: distinct word forms ÷ total words
   * (type–token ratio). Formatted to one decimal place.
   */
  lexicalDensity: string;
}

/** Word count, reading time and lexical diversity for a list of HTML paragraphs. */
export function computeTelemetry(paragraphs: readonly string[]): Telemetry {
  const text = paragraphs.map(stripHtml).join(' ').trim();
  const words = text ? text.split(' ') : [];
  const forms = words.map((w) => w.toLowerCase().replace(/[^\p{L}\p{N}'’-]/gu, '')).filter(Boolean);
  const wordCount = words.length;

  return {
    wordCount,
    readMinutes: Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
    lexicalDensity: forms.length ? ((new Set(forms).size / forms.length) * 100).toFixed(1) : '0.0',
  };
}

/** `1 → "01"`; keeps two-digit indices correct past nine (unlike a hard-coded `0` prefix). */
export function padIndex(n: number): string {
  return String(n).padStart(2, '0');
}

/** Converts the essay's limited inline HTML to Markdown. */
export function inlineHtmlToMarkdown(html: string): string {
  const md = html
    .replace(/<br\s*\/?>/gi, '  \n')
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, '*$2*')
    .replace(/<(strong|b|mark)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**');
  return decodeEntities(md.replace(TAG_RE, ''));
}

/** Full Markdown broadsheet: header, deck, body and marginalia as footnotes. */
export function essayToMarkdown(
  essay: Essay,
  paragraphs: readonly string[] = essay.paragraphs
): string {
  const notesByPara = new Map<number, number[]>();
  essay.marginalia.forEach((note, i) => {
    const list = notesByPara.get(note.paraIndex) ?? [];
    list.push(i + 1);
    notesByPara.set(note.paraIndex, list);
  });

  const body = paragraphs.map((p, idx) => {
    const refs = (notesByPara.get(idx) ?? []).map((n) => `[^${n}]`).join('');
    return inlineHtmlToMarkdown(p) + refs;
  });

  const footnotes = essay.marginalia.map(
    (note, i) => `[^${i + 1}]: **${note.type}** — ${note.author}, ${note.date}: ${note.text}`
  );

  return [
    `# ${essay.title}`,
    '',
    `*${essay.subtitle}*`,
    '',
    `${essay.author} — ${essay.authorBio}  `,
    `${essay.code} · ${essay.category} · ${essay.date}`,
    '',
    '---',
    '',
    ...essay.deckColumns.map((col) => `> ${col}`),
    '',
    '---',
    '',
    body.join('\n\n'),
    '',
    ...(footnotes.length ? ['', ...footnotes] : []),
  ].join('\n');
}

/** Argument tree as pretty-printed JSON, ready to paste into another tool. */
export function treeToJson(essay: Essay): string {
  return JSON.stringify({ code: essay.code, title: essay.title, nodes: essay.treeNodes }, null, 2);
}

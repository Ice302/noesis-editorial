/**
 * Allow-list sanitizer for essay paragraph HTML.
 *
 * Paragraphs edited in the Manuscript Studio come from `contenteditable`, so
 * they can contain anything a browser or a paste produces. Before such HTML is
 * rendered with `{@html}` it is rebuilt from scratch here: only a fixed set of
 * inline tags survives, every attribute is dropped (except the highlight class,
 * which is re-added by us), and stray angle brackets in text are escaped.
 *
 * It is string-based rather than DOM-based so that it behaves identically
 * during prerendering, in unit tests and in the browser.
 */

/** Tag name → canonical opening tag. */
const ALLOWED: Record<string, string> = {
  em: '<em>',
  i: '<em>',
  strong: '<strong>',
  b: '<strong>',
  mark: '<mark class="editorial-highlight">',
};
const CLOSING: Record<string, string> = {
  em: 'em',
  i: 'em',
  strong: 'strong',
  b: 'strong',
  mark: 'mark',
};
/** Block elements that browsers insert on Enter; they become line breaks. */
const BLOCK_BREAKS = new Set(['div', 'p']);
/** Elements whose content must be discarded, not unwrapped. */
const DROP_WITH_CONTENT_RE = /<(script|style|template|iframe|object|svg|math)\b[\s\S]*?<\/\1\s*>/gi;
const COMMENT_RE = /<!--[\s\S]*?-->/g;
const TOKEN_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^<>]*>/g;

function escapeText(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function sanitizeEssayHtml(input: string): string {
  const html = input.replace(DROP_WITH_CONTENT_RE, '').replace(COMMENT_RE, '');
  const stack: string[] = [];
  let out = '';
  let last = 0;

  for (const match of html.matchAll(TOKEN_RE)) {
    out += escapeText(html.slice(last, match.index));
    last = match.index + match[0].length;

    const isClosing = match[1] === '/';
    const tag = match[2].toLowerCase();

    if (tag === 'br') {
      if (!isClosing) out += '<br>';
      continue;
    }
    if (BLOCK_BREAKS.has(tag)) {
      if (!isClosing && out.length > 0 && !out.endsWith('<br>')) out += '<br>';
      continue;
    }

    const canonical = CLOSING[tag];
    if (!canonical) continue; // disallowed: unwrap (keep children, drop the tag)

    if (!isClosing) {
      out += ALLOWED[tag];
      stack.push(canonical);
    } else if (stack.includes(canonical)) {
      // Close everything opened after the matching tag to keep nesting valid.
      while (stack.length) {
        const open = stack.pop()!;
        out += `</${open}>`;
        if (open === canonical) break;
      }
    }
  }

  out += escapeText(html.slice(last));
  while (stack.length) out += `</${stack.pop()}>`;

  return out.replace(/(<br>)+$/, '').trim();
}

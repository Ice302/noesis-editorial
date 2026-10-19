/**
 * Google Fonts requests used in `src/app.html`.
 *
 * Shippori Mincho is a Japanese font: its full stylesheet declares well over a
 * hundred unicode-range subsets (~85 KB of CSS) and Lighthouse flagged it as the
 * main render-blocking cost. The design only uses it for headings and a few
 * Japanese words, so it is requested with Google's `text=` parameter, which
 * returns a font containing just those glyphs.
 *
 * `fonts.test.ts` checks that app.html uses exactly these URLs and that every
 * character of every essay title and Japanese UI string is in the subset — if
 * you add a heading with a new glyph, the test tells you to extend EXTRA_GLYPHS.
 */

/** Japanese strings set in Shippori Mincho across the UI. */
export const JAPANESE_UI_STRINGS = ['思索と編集の世界', '観念の編集', '思索論考'] as const;

/** Typographic characters beyond printable ASCII that headings use. */
export const EXTRA_GLYPHS = '‘’“”–—…·ēĒéÉèàâäçêëîïôöûüÁáÍíÓóÚúñ';

const PRINTABLE_ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('');

/** Every character the Shippori Mincho subset must contain, sorted and de-duplicated. */
export const SHIPPORI_TEXT = [
  ...new Set(PRINTABLE_ASCII + EXTRA_GLYPHS + JAPANESE_UI_STRINGS.join('')),
]
  .sort()
  .join('');

/** Latin text faces (variable fonts: one file per style covers every weight). */
export const LATIN_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400..700&family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..500&display=swap';

export const DISPLAY_FONT_URL = `https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600;700&display=swap&text=${encodeURIComponent(SHIPPORI_TEXT)}`;

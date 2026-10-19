import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DISPLAY_FONT_URL, JAPANESE_UI_STRINGS, LATIN_FONTS_URL, SHIPPORI_TEXT } from './fonts.ts';
import { ESSAYS_DB } from './data/essayContent.js';

const appHtml = readFileSync('src/app.html', 'utf8').replaceAll('&amp;', '&');

describe('font requests', () => {
  it('app.html loads exactly the URLs defined in fonts.ts (blocking and <noscript>)', () => {
    const paste = (url: string) =>
      `src/app.html must use this URL twice (stylesheet + <noscript>):\n${url.replaceAll('&', '&amp;')}`;
    expect(appHtml.split(LATIN_FONTS_URL).length, paste(LATIN_FONTS_URL)).toBe(3);
    expect(appHtml.split(DISPLAY_FONT_URL).length, paste(DISPLAY_FONT_URL)).toBe(3);
  });

  it('the Shippori subset covers every essay title and Japanese UI string', () => {
    const needed = [...ESSAYS_DB.map((e) => e.title), ...JAPANESE_UI_STRINGS].join('');
    const missing = [...new Set(needed)].filter((ch) => !SHIPPORI_TEXT.includes(ch));
    expect(missing, `add these to EXTRA_GLYPHS in fonts.ts: ${missing.join(' ')}`).toEqual([]);
  });

  it('Japanese UI strings in components are listed in fonts.ts', () => {
    const sources = ['LeftSpineNav', 'WoodcutHeader']
      .map((c) => readFileSync(`src/lib/components/${c}.svelte`, 'utf8'))
      .join('');
    const cjk = [...new Set(sources.match(/[぀-ヿ一-鿿]/g) ?? [])];
    expect(cjk.filter((ch) => !SHIPPORI_TEXT.includes(ch))).toEqual([]);
  });
});

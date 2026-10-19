import { describe, expect, it } from 'vitest';
import { sanitizeEssayHtml } from './sanitize.ts';
import { ESSAYS_DB } from '../data/essayContent.js';

describe('sanitizeEssayHtml', () => {
  it('leaves the archival paragraphs unchanged', () => {
    for (const essay of ESSAYS_DB) {
      for (const p of essay.paragraphs) expect(sanitizeEssayHtml(p)).toBe(p);
    }
  });

  it('drops scripts and styles with their content', () => {
    expect(sanitizeEssayHtml('a<script>alert(1)</script>b<style>p{}</style>c')).toBe('abc');
  });

  it('strips every attribute, including event handlers', () => {
    expect(sanitizeEssayHtml('<em onclick="x()" style="color:red">hi</em>')).toBe('<em>hi</em>');
    expect(sanitizeEssayHtml('<img src=x onerror=alert(1)>ok')).toBe('ok');
  });

  it('restores the canonical highlight class on <mark>', () => {
    expect(sanitizeEssayHtml('<mark style="x">m</mark>')).toBe(
      '<mark class="editorial-highlight">m</mark>'
    );
  });

  it('normalises b/i to strong/em and unwraps unknown tags', () => {
    expect(
      sanitizeEssayHtml('<b>B</b> <i>I</i> <span class="x">S</span> <a href="javascript:1">A</a>')
    ).toBe('<strong>B</strong> <em>I</em> S A');
  });

  it('turns contenteditable block wrappers into line breaks', () => {
    expect(sanitizeEssayHtml('one<div>two</div><div>three</div>')).toBe('one<br>two<br>three');
  });

  it('escapes unterminated tags as text', () => {
    expect(sanitizeEssayHtml('a <img src=x onerror=alert(1)')).toBe(
      'a &lt;img src=x onerror=alert(1)'
    );
  });

  it('balances unclosed and mis-nested tags', () => {
    expect(sanitizeEssayHtml('<em>open')).toBe('<em>open</em>');
    expect(sanitizeEssayHtml('<em><strong>x</em>y</strong>')).toBe('<em><strong>x</strong></em>y');
    expect(sanitizeEssayHtml('stray</em>')).toBe('stray');
  });
});

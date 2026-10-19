import { describe, expect, it } from 'vitest';
import { buildRssFeed, cdata, escapeXml, rssDate } from './feed.ts';
import { ESSAYS_DB } from '../data/essayContent.js';

const feed = buildRssFeed(ESSAYS_DB, {
  siteUrl: 'https://noesis.example',
  title: 'NOĒSIS',
  description: 'Essays & <things>',
});

describe('buildRssFeed', () => {
  it('produces one item per essay with absolute links', () => {
    expect(feed.match(/<item>/g)).toHaveLength(ESSAYS_DB.length);
    expect(feed).toContain('<link>https://noesis.example/essays/ms-01</link>');
    expect(feed).toContain('<guid isPermaLink="true">https://noesis.example/essays/ms-04</guid>');
  });

  it('escapes channel text and lists newest first', () => {
    expect(feed).toContain('<description>Essays &amp; &lt;things&gt;</description>');
    expect(feed.indexOf('ms-04')).toBeLessThan(feed.indexOf('ms-01'));
  });

  it('includes full text in content:encoded', () => {
    expect(feed).toContain('<content:encoded><![CDATA[<p>In the autumn of 1580');
  });

  it('has balanced item and channel tags', () => {
    expect(feed.match(/<item>/g)?.length).toBe(feed.match(/<\/item>/g)?.length);
    expect(feed.trim().endsWith('</rss>')).toBe(true);
  });
});

describe('helpers', () => {
  it('escapes XML special characters', () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;'
    );
  });

  it('cannot be broken out of with ]]>', () => {
    expect(cdata('a]]>b')).toBe('<![CDATA[a]]]]><![CDATA[>b]]>');
  });

  it('formats RFC 822 dates', () => {
    expect(rssDate('2026-10-05')).toBe('Mon, 05 Oct 2026 12:00:00 GMT');
  });
});

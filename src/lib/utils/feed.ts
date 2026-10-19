/**
 * RSS 2.0 feed builder. Full essay text goes in `content:encoded` so feed
 * readers can show the whole piece; the standfirst is the `description`.
 */
import type { Essay } from '../types.ts';
import { sanitizeEssayHtml } from './sanitize.ts';

export interface FeedOptions {
  /** Absolute site origin without a trailing slash, e.g. `https://noesis.example`. */
  siteUrl: string;
  title: string;
  description: string;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Wraps text in CDATA, splitting any `]]>` so the section can't be closed early. */
export function cdata(text: string): string {
  return `<![CDATA[${text.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
}

/** RFC 822 date for RSS, from an ISO `YYYY-MM-DD` publish date (noon UTC). */
export function rssDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toUTCString();
}

export const essayPath = (id: string) => `/essays/${id}`;

export function buildRssFeed(essays: readonly Essay[], opts: FeedOptions): string {
  const sorted = [...essays].sort((a, b) => b.published.localeCompare(a.published));
  const items = sorted.map((essay) => {
    const url = `${opts.siteUrl}${essayPath(essay.id)}`;
    const html = essay.paragraphs.map((p) => `<p>${sanitizeEssayHtml(p)}</p>`).join('\n');
    return [
      '    <item>',
      `      <title>${escapeXml(essay.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `      <pubDate>${rssDate(essay.published)}</pubDate>`,
      `      <dc:creator>${escapeXml(essay.author)}</dc:creator>`,
      `      <category>${escapeXml(essay.category)}</category>`,
      `      <description>${escapeXml(essay.subtitle)}</description>`,
      `      <content:encoded>${cdata(html)}</content:encoded>`,
      '    </item>',
    ].join('\n');
  });

  const latest = sorted[0]?.published;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    '  <channel>',
    `    <title>${escapeXml(opts.title)}</title>`,
    `    <link>${escapeXml(opts.siteUrl)}/</link>`,
    `    <atom:link href="${escapeXml(opts.siteUrl)}/rss.xml" rel="self" type="application/rss+xml" />`,
    `    <description>${escapeXml(opts.description)}</description>`,
    '    <language>en</language>',
    ...(latest ? [`    <lastBuildDate>${rssDate(latest)}</lastBuildDate>`] : []),
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

import { SITE_URL } from '$app/env/public';
import { ESSAYS_DB } from '#lib/data/essayContent.js';
import { buildRssFeed } from '#lib/utils/feed.ts';

// Written to a static file at build time.
export const prerender = true;

export function GET() {
  const xml = buildRssFeed(ESSAYS_DB, {
    siteUrl: SITE_URL,
    title: 'NOĒSIS — Aeon Archive',
    description: 'Longform essays on memory, attention, reading and the architecture of thought.',
  });
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}

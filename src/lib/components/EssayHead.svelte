<!--
	@component
	Per-essay <head> metadata: title, description, canonical URL, Open Graph /
	Twitter cards and schema.org Article JSON-LD. Rendered into prerendered
	HTML, so link previews and search engines see the right essay.
-->
<script lang="ts">
  import { SITE_URL } from '$app/env/public';
  import { essayPath } from '#lib/utils/feed.ts';
  import type { Essay } from '#lib/types.ts';

  let { essay }: { essay: Essay } = $props();

  const url = $derived(`${SITE_URL}${essayPath(essay.id)}`);
  const title = $derived(`${essay.title} — NOĒSIS`);

  // `<` is escaped so essay text can never close the script element early.
  const jsonLd = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: essay.title,
      description: essay.subtitle,
      author: { '@type': 'Person', name: essay.author },
      datePublished: essay.published,
      articleSection: essay.category,
      url,
      publisher: { '@type': 'Organization', name: 'NOĒSIS' },
    }).replace(/</g, '\\u003c')
  );
  // The closing tag is split so it can't end this component's own <script> block.
  const jsonLdTag = $derived(`<script type="application/ld+json">${jsonLd}<` + `/script>`);
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={essay.subtitle} />
  <meta name="author" content={essay.author} />
  <link rel="canonical" href={url} />
  <meta property="og:site_name" content="NOĒSIS" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content={essay.title} />
  <meta property="og:description" content={essay.subtitle} />
  <meta property="og:url" content={url} />
  <meta property="article:published_time" content={essay.published} />
  <meta property="article:section" content={essay.category} />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content={essay.title} />
  <meta name="twitter:description" content={essay.subtitle} />
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- static JSON with `<` escaped -->
  {@html jsonLdTag}
</svelte:head>

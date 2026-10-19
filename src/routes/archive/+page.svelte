<!--
	Archive index: every essay in the issue, searchable across titles, authors,
	categories, decks and full text. The query lives in `?q=` so searches can be
	shared; it is read after hydration because the page itself is prerendered.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { SITE_URL } from '$app/env/public';
  import { ESSAYS_DB } from '#lib/data/essayContent.js';
  import { searchEssays } from '#lib/utils/search.ts';
  import { computeTelemetry, padIndex } from '#lib/utils/text.ts';

  let query = $state('');
  let category = $state<string | null>(null);

  const categories = [...new Set(ESSAYS_DB.map((e) => e.category))];
  const readMinutes = new Map(
    ESSAYS_DB.map((e) => [e.id, computeTelemetry(e.paragraphs).readMinutes])
  );
  const results = $derived(
    searchEssays(ESSAYS_DB, query).filter((r) => !category || r.essay.category === category)
  );

  const formatDate = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });

  onMount(() => {
    query = new URL(window.location.href).searchParams.get('q') ?? '';
  });

  function syncQuery() {
    const q = query.trim();
    const search: '' | `?${string}` = q ? `?q=${encodeURIComponent(q)}` : '';
    if (search !== window.location.search) {
      goto(resolve(`/archive${search}`), { shallow: true, replace: true });
    }
  }
</script>

<svelte:head>
  <title>Archive Index — NOĒSIS</title>
  <meta
    name="description"
    content="Every essay in the NOĒSIS archive, searchable by title, author, category and full text."
  />
  <link rel="canonical" href="{SITE_URL}/archive" />
</svelte:head>

<div class="min-h-screen bg-desk p-2 sm:p-4 md:p-6">
  <div
    class="paper-texture mx-auto w-full max-w-5xl rounded-xs border-2 border-ink bg-paper shadow-[8px_8px_0px_var(--color-ink)]"
  >
    <header class="on-ink bg-ink px-6 py-6 text-vellum sm:px-10">
      <div class="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
        <a
          href={resolve('/(studio)')}
          class="font-semibold tracking-wider text-paper hover:text-pastel-deep"
          >← NOĒSIS // AEON ARCHIVE</a
        >
        <a href={resolve('/rss.xml')} class="tracking-wider text-pastel hover:text-pastel-deep"
          >RSS FEED</a
        >
      </div>
      <h1 class="mt-5 font-display text-3xl font-bold text-pastel sm:text-4xl">Archive Index</h1>
      <p class="mt-1 font-serif text-lg text-paper italic">
        {ESSAYS_DB.length} essays · Issue IV · Autumn 2026
      </p>
    </header>

    <div class="px-6 py-8 sm:px-10">
      <div class="flex flex-col gap-3 border-b-2 border-ink pb-5">
        <label for="archive-search" class="font-mono text-[11px] font-bold tracking-wider uppercase"
          >Search the archive</label
        >
        <input
          id="archive-search"
          type="search"
          bind:value={query}
          oninput={syncQuery}
          placeholder="Try “Locke”, “silence”, or “Adorno”…"
          autocomplete="off"
          class="w-full border-2 border-ink bg-paper px-3 py-2 font-serif text-lg text-ink placeholder:text-ink-soft/70"
        />
        <div class="flex flex-wrap gap-2 font-mono text-[10px]" role="group" aria-label="Category">
          <button
            onclick={() => (category = null)}
            aria-pressed={category === null}
            class={[
              'border border-ink px-2 py-0.5',
              category === null ? 'bg-ink text-pastel' : 'hover:bg-vellum',
            ]}>ALL</button
          >
          {#each categories as c (c)}
            <button
              onclick={() => (category = category === c ? null : c)}
              aria-pressed={category === c}
              class={[
                'border border-ink px-2 py-0.5',
                category === c ? 'bg-ink text-pastel' : 'hover:bg-vellum',
              ]}>{c}</button
            >
          {/each}
        </div>
      </div>

      <p class="mt-4 font-mono text-[11px] text-ink-soft" role="status" aria-live="polite">
        {results.length}
        {results.length === 1 ? 'essay' : 'essays'}{query.trim()
          ? ` matching “${query.trim()}”`
          : ''}
      </p>

      <ol class="mt-4 space-y-6">
        {#each results as { essay, snippet } (essay.id)}
          {@const n = ESSAYS_DB.indexOf(essay) + 1}
          <li class="border-b border-ink/25 pb-6">
            <article class="grid grid-cols-[auto_1fr] gap-x-4">
              <span
                class="row-span-3 self-start bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-pastel"
                >{padIndex(n)}</span
              >
              <p class="font-mono text-[10px] tracking-wider text-ink-soft uppercase">
                {essay.category} · {formatDate(essay.published)} · {readMinutes.get(essay.id)} min read
              </p>
              <h2 class="mt-1 font-display text-2xl leading-tight font-bold">
                <a href={resolve('/(studio)/essays/[id]', { id: essay.id })} class="hover:underline"
                  >{essay.title}</a
                >
              </h2>
              <div class="col-start-2">
                <p class="mt-2 font-serif text-base text-ink-mid italic">{essay.subtitle}</p>
                <p class="mt-2 font-mono text-[10px] tracking-wider uppercase">{essay.author}</p>
                {#if snippet}
                  <p class="mt-3 border-l-2 border-ink pl-3 font-serif text-sm leading-relaxed">
                    {snippet.before}<mark class="editorial-highlight px-0">{snippet.match}</mark
                    >{snippet.after}
                  </p>
                {/if}
              </div>
            </article>
          </li>
        {:else}
          <li class="font-serif text-lg italic text-ink-soft">
            Nothing in the archive matches that search.
          </li>
        {/each}
      </ol>
    </div>
  </div>
</div>

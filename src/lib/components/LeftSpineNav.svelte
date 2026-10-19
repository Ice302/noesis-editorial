<!--
	@component
	Dark archival spine: masthead, slash navigation, the issue's essay index,
	export actions and editorial sign-in.
-->
<script lang="ts">
  import { resolve } from '$app/paths';
  import { getStudio } from '#lib/state/studio.svelte.ts';
  import { VIEW_META } from '#lib/views.ts';
  import { padIndex } from '#lib/utils/text.ts';

  let { onsignin }: { onsignin: () => void } = $props();
  const studio = getStudio();

  /** Plain clicks stay in the app (keeping the toast); modified clicks open new tabs as usual. */
  function openEssay(event: MouseEvent, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    event.preventDefault();
    studio.selectEssay(id);
  }
</script>

<aside
  class="on-ink relative flex w-full shrink-0 flex-col justify-between border-b-2 border-ink bg-ink p-6 text-vellum select-none lg:w-[290px] lg:border-r-2 lg:border-b-0 lg:p-7 xl:w-[315px] print:hidden"
>
  <div>
    <div
      class="mb-1 flex items-center justify-between font-display text-xs tracking-widest text-pastel/80"
    >
      <span lang="ja">思索と編集の世界</span>
      <span
        class="rounded-xs border border-pastel/40 px-1.5 py-0.5 font-mono text-[10px] text-pastel"
        >ISSN 2026-88X</span
      >
    </div>
    <div class="mb-3 font-mono text-xs font-semibold tracking-wider text-paper">
      NOĒSIS // AEON ARCHIVE
    </div>

    <nav
      aria-label="Workspace"
      class="my-2 border-t border-b border-pastel/35 py-2.5 font-mono text-[11.5px] leading-relaxed text-vellum"
    >
      {#each VIEW_META as view (view.id)}
        {@const active = studio.activeView === view.id}
        <button
          onclick={() => studio.switchMainView(view.id)}
          aria-current={active ? 'page' : undefined}
          aria-keyshortcuts={view.key}
          class={[
            'mr-1 inline-block min-h-6 last:mr-0 hover:text-pastel-deep',
            active && 'font-semibold underline decoration-pastel-deep underline-offset-4',
          ]}>{view.spine}</button
        >
      {/each}
    </nav>

    <div class="mt-4 mb-5">
      <p
        class="font-display text-3xl leading-tight font-bold tracking-wide text-pastel lg:text-4xl"
        lang="ja"
      >
        観念の編集
      </p>
      <div class="mt-0.5 font-serif text-xl text-paper italic">
        The Essay as Living Architecture
      </div>
      <div class="mt-1 font-mono text-lg font-bold tracking-[0.22em] text-pastel">2019–2026</div>
    </div>

    <div class="mt-4">
      <div
        class="mb-2 flex items-center justify-between font-mono text-[10px] tracking-widest text-pastel uppercase"
      >
        <span id="monograph-heading">Current Monograph</span>
        <a
          href={resolve('/archive')}
          class="underline-offset-4 hover:text-pastel-deep hover:underline"
          title="Search the archive index">{studio.essays.length} ESSAYS ↗</a
        >
      </div>
      <ul class="space-y-1.5" aria-labelledby="monograph-heading">
        {#each studio.essays as essay, idx (essay.id)}
          {@const active = essay.id === studio.activeEssayId}
          <li>
            <a
              href={resolve(`/(studio)/essays/[id]${studio.viewSearch}`, { id: essay.id })}
              onclick={(e) => openEssay(e, essay.id)}
              aria-current={active ? 'page' : undefined}
              class={[
                'flex w-full items-start gap-2.5 border p-2.5 text-left transition-all',
                active
                  ? 'border-pastel-deep bg-pastel text-ink'
                  : 'border-pastel/25 bg-ink-mid/70 text-paper hover:border-pastel/60',
              ]}
            >
              <span class="bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-pastel"
                >{padIndex(idx + 1)}</span
              >
              <div class="min-w-0 flex-1">
                <div class="truncate font-mono text-[9px] tracking-wider uppercase">
                  {essay.category}
                </div>
                <div class="mt-0.5 line-clamp-2 font-serif text-xs leading-snug font-semibold">
                  {essay.title}
                </div>
              </div>
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <div class="mt-6 border-t border-pastel/35 pt-3">
    <div class="mb-2 font-mono text-[10px] text-pastel/90">Export &amp; Share Spread</div>
    <div class="flex items-center gap-3 text-vellum">
      <button
        onclick={() => studio.copyMarkdown()}
        class="min-h-6 font-mono text-xs hover:text-pastel-deep"
        >.MD<span class="sr-only"> — copy essay as Markdown</span></button
      >
      <button
        onclick={() => studio.copyTreeJson()}
        class="min-h-6 font-mono text-xs hover:text-pastel-deep"
        >.TREE<span class="sr-only"> — copy argument tree as JSON</span></button
      >
      <button
        onclick={() => window.print()}
        class="min-h-6 font-mono text-xs hover:text-pastel-deep"
        >PRINT<span class="sr-only"> essay</span></button
      >
      <a
        href={resolve('/rss.xml')}
        class="inline-flex min-h-6 items-center font-mono text-xs hover:text-pastel-deep"
        >RSS<span class="sr-only"> feed</span></a
      >
    </div>

    {#if studio.sharedAvailable}
      <div class="mt-3 border-t border-pastel/20 pt-3 font-mono text-[10px]">
        <div class="mb-1.5 text-pastel/90">Editorial Access</div>
        {#if studio.editor}
          <div class="flex items-center justify-between gap-2 text-vellum">
            <span class="truncate"
              ><span class="text-pastel" aria-hidden="true">●</span>
              {studio.editor.displayName}</span
            >
            <button onclick={() => studio.logout()} class="text-xs hover:text-pastel-deep"
              >SIGN OUT</button
            >
          </div>
        {:else}
          <button onclick={onsignin} class="text-xs text-vellum hover:text-pastel-deep"
            >SIGN IN →</button
          >
        {/if}
      </div>
    {/if}
  </div>
</aside>

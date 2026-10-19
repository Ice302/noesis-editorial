<!--
	@component
	Masthead with the vertical issue numerals and the workspace tab strip.
	The tabs follow the WAI-ARIA Authoring Practices tabs pattern: roving
	tabindex, ←/→ to move, Home/End to jump, automatic activation.
-->
<script lang="ts">
  import { getStudio } from '#lib/state/studio.svelte.ts';
  import { VIEW_META, PANEL_ID, tabId } from '#lib/views.ts';

  const studio = getStudio();
  let tabEls: HTMLButtonElement[] = $state([]);

  function onTabKeydown(event: KeyboardEvent, index: number) {
    const last = VIEW_META.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    studio.switchMainView(VIEW_META[next].id);
    tabEls[next]?.focus();
  }
</script>

<header
  class="relative border-b border-ink/25 bg-linear-to-b from-vellum/70 to-paper px-4 pt-2 pb-4 sm:px-8 print:hidden"
>
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-start gap-5" aria-hidden="true">
      <div
        class="border-r border-ink/30 pr-3 font-mono text-xs leading-[1.15] font-bold tracking-widest text-ink"
      >
        2<br />0<br />2<br />6
      </div>
      <div class="vertical-cjk max-h-24 font-display text-lg font-semibold text-ink" lang="ja">
        思索論考
      </div>
    </div>
    <div class="mx-auto text-center">
      <div
        class="mb-0.5 flex items-center justify-center gap-2 font-mono text-[10px] tracking-[0.25em] text-ink-soft uppercase"
      >
        <span>▸ AEON LONGFORM EDITION</span> •
        <span>{studio.telemetry.wordCount} WORDS · {studio.telemetry.readMinutes} MIN READ</span>
      </div>
      <p class="font-mono text-2xl font-bold tracking-[0.18em] text-ink sm:text-3xl">
        ANALOG <span class="font-display text-xl font-normal text-ink-mid italic">/ Noēsis</span>
      </p>
    </div>
  </div>

  <div
    class="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink/30 pt-2 font-mono text-xs"
  >
    <div role="tablist" aria-label="Workspace views" class="flex flex-wrap items-center gap-2">
      {#each VIEW_META as view, i (view.id)}
        {@const selected = studio.activeView === view.id}
        <button
          bind:this={tabEls[i]}
          role="tab"
          id={tabId(view.id)}
          aria-selected={selected}
          aria-controls={PANEL_ID}
          aria-keyshortcuts={view.key}
          tabindex={selected ? 0 : -1}
          onclick={() => studio.switchMainView(view.id)}
          onkeydown={(e) => onTabKeydown(e, i)}
          class={['px-2.5 py-1.5', selected ? 'tab-btn-active' : 'hover:bg-vellum']}
          >{view.tab}</button
        >
      {/each}
    </div>
  </div>
</header>

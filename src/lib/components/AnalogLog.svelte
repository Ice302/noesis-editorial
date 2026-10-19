<!--
	@component
	Analog editorial bullet journal: timeframe filter, collapsible days,
	tickable tasks (□ ⇄ ■) and a rapid-log entry form.
-->
<script lang="ts">
  import { getStudio } from '#lib/state/studio.svelte.ts';
  import { LOG_SYMBOL_KEY } from '#lib/data/analogLog.js';
  import type { AnalogFilter, LogSymbol } from '#lib/types.ts';

  const studio = getStudio();

  const FILTERS: readonly { id: AnalogFilter; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'all', label: 'All Time' },
  ];

  let draftSymbol: LogSymbol = $state('□');
  let draftText = $state('');

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (studio.addLogEntry(draftSymbol, draftText)) {
      draftText = '';
      studio.showToast('Entry logged.');
    }
  }
</script>

<div class="mx-auto max-w-3xl space-y-6 py-2">
  <div
    role="group"
    aria-label="Filter by timeframe"
    class="flex justify-between border-t border-b border-ink/25 py-3 font-mono text-xs text-ink-soft"
  >
    {#each FILTERS as filter (filter.id)}
      {@const active = studio.analogFilter === filter.id}
      <button
        onclick={() => (studio.analogFilter = filter.id)}
        aria-pressed={active}
        class={active ? 'bg-pastel px-2 py-0.5 font-bold text-ink' : 'px-2 py-0.5 hover:text-ink'}
        >{filter.label}</button
      >
    {/each}
  </div>

  <form onsubmit={submit} class="flex flex-wrap items-stretch gap-2 font-mono text-xs">
    <label class="sr-only" for="log-symbol">Entry type</label>
    <select
      id="log-symbol"
      bind:value={draftSymbol}
      class="border border-ink bg-paper px-2 py-1 text-ink"
    >
      {#each LOG_SYMBOL_KEY as key (key.symbol)}
        <option value={key.symbol}>{key.symbol} {key.meaning}</option>
      {/each}
    </select>
    <label class="sr-only" for="log-text">Entry text</label>
    <input
      id="log-text"
      bind:value={draftText}
      placeholder="Rapid-log an editorial note…"
      maxlength="240"
      autocomplete="off"
      class="min-w-0 flex-1 border border-ink bg-paper px-2 py-1 text-ink placeholder:text-ink-soft/60"
    />
    <button
      type="submit"
      disabled={!draftText.trim()}
      class="border border-ink bg-ink px-3 py-1 font-semibold text-pastel disabled:opacity-40"
      >LOG</button
    >
  </form>

  <div class="analog-spine space-y-6 pl-5">
    {#each studio.visibleLog as grp (grp.id)}
      <section class="border-b border-ink/15 pb-5" aria-labelledby={`${grp.id}-label`}>
        <button
          id={`${grp.id}-label`}
          onclick={() => studio.toggleGroup(grp.id)}
          aria-expanded={!grp.collapsed}
          aria-controls={`${grp.id}-items`}
          class="mb-3 flex items-center gap-2 font-mono text-xs font-bold text-ink"
        >
          <span aria-hidden="true" class="inline-block w-2 text-[9px]"
            >{grp.collapsed ? '▸' : '▾'}</span
          >
          {grp.dateLabel}
          <span class="font-normal text-ink-soft">({grp.items.length})</span>
        </button>
        {#if !grp.collapsed}
          <ul id={`${grp.id}-items`} class="space-y-2 font-mono text-xs">
            {#each grp.items as item (item.id)}
              {@const isTask = item.symbol === '□' || item.symbol === '■'}
              <li class="flex items-start gap-2.5">
                {#if isTask}
                  <button
                    onclick={() => studio.toggleTask(grp.id, item.id)}
                    role="checkbox"
                    aria-checked={item.symbol === '■'}
                    aria-label={`Mark “${item.text}” as ${item.symbol === '■' ? 'open' : 'done'}`}
                    class="font-bold text-ink hover:text-ink-soft">{item.symbol}</button
                  >
                {:else}
                  <span class="font-bold text-ink" aria-hidden="true">{item.symbol}</span>
                {/if}
                <span class={['flex-1', item.symbol === '■' && isTask && 'text-ink/70']}
                  >{item.text}</span
                >
                {#if item.time}
                  <span class="shrink-0 text-[10px] text-ink-soft">{item.time}</span>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {:else}
      <p class="font-mono text-xs text-ink-soft">No entries in this timeframe.</p>
    {/each}
  </div>

  <p class="border-t border-ink/25 pt-3 font-mono text-[10px] text-ink-soft">
    KEY:
    {#each LOG_SYMBOL_KEY as key (key.symbol)}
      <span class="mr-3 inline-block"
        ><span class="font-bold text-ink">{key.symbol}</span> {key.meaning}</span
      >
    {/each}
  </p>
</div>

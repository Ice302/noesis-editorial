<!--
	@component
	Typographic HUD. Shows the controls relevant to the current view (tree
	geometry in the Argument Tree, typography everywhere else) plus live
	manuscript telemetry. All values are bound straight into `studio.hud`.

	Below the `xl` breakpoint the HUD sits above the essay, so it starts
	collapsed to a single row; the header toggles it open.
-->
<script lang="ts">
  import { getStudio } from '#lib/state/studio.svelte.ts';
  import HudSlider from './HudSlider.svelte';

  const studio = getStudio();
  const hud = $derived(studio.hud);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const title = $derived(
    `SYS // ${studio.activeView === 'tree' ? 'TREE GEOMETRY' : 'TYPOGRAPHIC HUD'}`
  );

  let open = $state(false);
  const bodyId = $props.id();
</script>

<section
  aria-label="Typographic controls"
  class="flex w-full shrink-0 flex-col justify-between border-b border-ink/40 bg-vellum/75 p-4 font-mono text-[10px] xl:w-[275px] xl:border-r xl:border-b-0 print:hidden"
>
  <div>
    <div
      class={[
        'flex items-center justify-between border-b border-ink pb-1.5 xl:mb-3',
        open && 'mb-3',
      ]}
    >
      <button
        onclick={() => (open = !open)}
        aria-expanded={open}
        aria-controls={bodyId}
        class="flex items-center gap-1.5 font-bold text-ink uppercase xl:hidden"
      >
        <span aria-hidden="true" class="inline-block w-2">{open ? '▾' : '▸'}</span>{title}
      </button>
      <span class="hidden font-bold text-ink uppercase xl:inline">{title}</span>
      <button
        onclick={() => studio.resetHud()}
        class="text-ink-soft uppercase hover:text-ink"
        title="Reset all HUD values">Reset</button
      >
    </div>

    <div id={bodyId} class={['mb-4 space-y-3 xl:block', open ? 'block' : 'hidden']}>
      {#if studio.activeView === 'tree'}
        <HudSlider
          label="SPREAD"
          min={20}
          max={80}
          step={1}
          bind:value={hud.treeSpread}
          display={`${hud.treeSpread}°`}
        />
        <HudSlider
          label="SCALE"
          min={0.6}
          max={1.4}
          step={0.05}
          bind:value={hud.treeScale}
          display={hud.treeScale.toFixed(2)}
        />
        <HudSlider
          label="BRANCH"
          min={70}
          max={140}
          step={1}
          bind:value={hud.treeLength}
          display={String(hud.treeLength)}
        />
        <HudSlider
          label="TRUNK"
          min={2}
          max={9}
          step={0.5}
          bind:value={hud.treeRootWidth}
          display={hud.treeRootWidth.toFixed(1)}
        />
      {:else}
        <HudSlider
          label="FONT SCALE"
          min={0.85}
          max={1.35}
          step={0.01}
          bind:value={hud.fontScale}
          display={hud.fontScale.toFixed(2)}
        />
        <HudSlider
          label="WIDTH"
          min={520}
          max={920}
          step={10}
          bind:value={hud.colWidth}
          display={String(hud.colWidth)}
        />
        <HudSlider
          label="LEADING"
          min={1.4}
          max={2.2}
          step={0.05}
          bind:value={hud.lineHeight}
          display={hud.lineHeight.toFixed(2)}
        />
        <HudSlider
          label="MARGINALIA"
          min={0.2}
          max={1}
          step={0.05}
          bind:value={hud.marginaliaOpacity}
          display={pct(hud.marginaliaOpacity)}
        />
        <HudSlider
          label="HIGHLIGHT"
          min={0}
          max={1}
          step={0.05}
          bind:value={hud.highlightIntensity}
          display={pct(hud.highlightIntensity)}
        />
      {/if}
    </div>
  </div>

  <dl
    class={[
      'space-y-1 border-t border-ink pt-3 text-[10px] text-ink xl:block',
      open ? 'block' : 'hidden',
    ]}
  >
    <div class="grid grid-cols-2">
      <dt class="text-ink-soft">WORDS</dt>
      <dd class="font-semibold">: {studio.telemetry.wordCount}</dd>
    </div>
    <div class="grid grid-cols-2">
      <dt
        class="text-ink-soft"
        title="Distinct word forms as a share of all words (type–token ratio)"
      >
        DENSITY
      </dt>
      <dd class="font-semibold">: {studio.telemetry.lexicalDensity}%</dd>
    </div>
    <div class="grid grid-cols-2">
      <dt class="text-ink-soft">READ</dt>
      <dd class="font-semibold">: {studio.telemetry.readMinutes} MIN</dd>
    </div>
    <div class="grid grid-cols-2">
      <dt class="text-ink-soft">{studio.activeView === 'tree' ? 'NODES' : 'SCHOLIA'}</dt>
      <dd class="font-semibold">
        : {studio.activeView === 'tree'
          ? studio.activeEssay.treeNodes.length
          : studio.activeEssay.marginalia.length}
      </dd>
    </div>
  </dl>
</section>

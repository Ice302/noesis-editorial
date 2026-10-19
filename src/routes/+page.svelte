<!--
	NOĒSIS — Archival Essay & Manuscript Studio.

	The page owns the studio state (provided to every component via context),
	the app shell, and the three browser-side effects: restoring persisted state,
	saving it back, and mirroring the current essay/view into the URL.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { setStudio, StudioState } from '#lib/state/studio.svelte.ts';
  import { VIEW_META, PANEL_ID, tabId } from '#lib/views.ts';
  import { isTypingTarget } from '#lib/utils/browser.ts';
  import LeftSpineNav from '#lib/components/LeftSpineNav.svelte';
  import WoodcutHeader from '#lib/components/WoodcutHeader.svelte';
  import ParameterHUD from '#lib/components/ParameterHUD.svelte';
  import BroadsheetEssay from '#lib/components/BroadsheetEssay.svelte';
  import ArgumentTree from '#lib/components/ArgumentTree.svelte';
  import AnalogLog from '#lib/components/AnalogLog.svelte';
  import Toast from '#lib/components/Toast.svelte';

  const studio = setStudio(new StudioState());
  let panel: HTMLDivElement | undefined = $state();

  const PERSIST_DEBOUNCE_MS = 250;

  onMount(() => {
    studio.hydrate(new URL(window.location.href));
  });

  // Persist HUD values, manuscript edits and the journal (debounced).
  $effect(() => {
    if (!studio.hydrated) return;
    const snapshot = studio.persistedSnapshot();
    const timer = setTimeout(() => studio.persist(snapshot), PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  });

  // Mirror ?essay=…&view=… into the address bar so any spread can be linked to.
  // A shallow, replacing navigation updates the URL without a router round-trip
  // or a history entry per click.
  $effect(() => {
    if (!studio.hydrated) return;
    const search = studio.searchString;
    const isDefault =
      studio.activeEssayId === studio.essays[0].id && studio.activeView === 'reader';
    if (search === window.location.search || (isDefault && !window.location.search)) return;
    goto(resolve(`/${search}`), { shallow: true, replace: true });
  });

  // Start each newly selected essay at the top of the reading panel. The panel
  // usually grows with the page, so also bring its top edge back into view.
  $effect(() => {
    void studio.activeEssayId;
    untrack(() => {
      if (!panel) return;
      panel.scrollTo({ top: 0 });
      if (panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start' });
    });
  });

  function handleShortcut(event: KeyboardEvent) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (isTypingTarget(event.target)) return;

    const view = VIEW_META.find((v) => v.key === event.key);
    if (view) studio.switchMainView(view.id);
    else if (event.key === '[') studio.stepEssay(-1);
    else if (event.key === ']') studio.stepEssay(1);
  }
</script>

<svelte:head>
  <title>NOĒSIS — Archival Essay & Manuscript Studio</title>
  <meta
    name="description"
    content="NOĒSIS is an Aeon-style archival studio for longform essays: a broadsheet reading spread with marginalia, a live manuscript editor, argument-tree cartography and an analog editorial log."
  />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="NOĒSIS — Archival Essay & Manuscript Studio" />
  <meta property="og:description" content={studio.activeEssay.subtitle} />
</svelte:head>

<svelte:window onkeydown={handleShortcut} onpagehide={() => studio.hydrated && studio.persist()} />

<div
  class="flex min-h-screen flex-col items-center justify-center bg-desk p-2 selection:bg-ink selection:text-vellum sm:p-4 md:p-6 print:block print:bg-white print:p-0"
  style:--essay-font-scale={studio.hud.fontScale}
  style:--essay-col-width="{studio.hud.colWidth}px"
  style:--essay-line-height={studio.hud.lineHeight}
  style:--marginalia-opacity={studio.hud.marginaliaOpacity}
  style:--highlight-intensity={studio.hud.highlightIntensity}
>
  <a
    href="#{PANEL_ID}"
    class="sr-only z-50 bg-ink px-3 py-2 font-mono text-xs text-pastel focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >Skip to content</a
  >

  <div
    class="paper-texture relative flex min-h-[93vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-xs border-2 border-ink bg-paper shadow-[8px_8px_0px_var(--color-ink)] lg:flex-row print:min-h-0 print:overflow-visible print:border-0 print:shadow-none"
  >
    <LeftSpineNav />

    <main
      class="relative flex flex-1 flex-col justify-between overflow-hidden bg-paper text-ink print:overflow-visible"
    >
      <WoodcutHeader />

      <div class="relative flex flex-1 flex-col overflow-hidden xl:flex-row print:overflow-visible">
        <ParameterHUD />

        <div
          bind:this={panel}
          id={PANEL_ID}
          role="tabpanel"
          aria-labelledby={tabId(studio.activeView)}
          tabindex="-1"
          class="relative flex-1 overflow-y-auto p-4 focus:outline-none sm:p-8 lg:p-10 print:overflow-visible print:p-0"
        >
          {#if studio.activeView === 'reader' || studio.activeView === 'editor'}
            <BroadsheetEssay />
          {:else if studio.activeView === 'tree'}
            <!-- Re-mount per essay so pan/zoom start from a fresh fit. -->
            {#key studio.activeEssayId}
              <ArgumentTree />
            {/key}
          {:else if studio.activeView === 'analog'}
            <AnalogLog />
          {/if}
        </div>
      </div>
    </main>
  </div>
</div>

<Toast />

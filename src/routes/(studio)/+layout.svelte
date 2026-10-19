<!--
	NOĒSIS — studio shell, shared by `/` and `/essays/[id]`.

	Living in a layout (not a page) means the studio state survives navigation
	between essays: HUD settings, drafts and the open panel carry over while the
	route decides which essay is shown. Pages under this group only contribute
	their <svelte:head> metadata.

	Browser-side effects owned here: restoring and saving persisted state,
	mirroring `?view=` into the URL, loading shared revisions for signed-in
	editors, and resetting scroll when the essay changes.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { navigating, page } from '$app/state';
  import { setStudio, StudioState } from '#lib/state/studio.svelte.ts';
  import { httpApi } from '#lib/api/client.ts';
  import { VIEW_META, PANEL_ID, tabId } from '#lib/views.ts';
  import { isTypingTarget } from '#lib/utils/browser.ts';
  import LeftSpineNav from '#lib/components/LeftSpineNav.svelte';
  import WoodcutHeader from '#lib/components/WoodcutHeader.svelte';
  import ParameterHUD from '#lib/components/ParameterHUD.svelte';
  import BroadsheetEssay from '#lib/components/BroadsheetEssay.svelte';
  import ArgumentTree from '#lib/components/ArgumentTree.svelte';
  import AnalogLog from '#lib/components/AnalogLog.svelte';
  import LoginDialog from '#lib/components/LoginDialog.svelte';
  import Toast from '#lib/components/Toast.svelte';

  let { children } = $props();

  const studio = setStudio(
    new StudioState({
      api: httpApi,
      // `/` shows the first essay; `/essays/[id]` shows the one in the URL.
      routeEssayId: () => page.params.id ?? studio.essays[0].id,
      onSelectEssay: (id, { replace }) =>
        goto(resolve(`/(studio)/essays/[id]${studio.viewSearch}`, { id }), { replace }),
    })
  );

  let panel: HTMLDivElement | undefined = $state();
  let loginOpen = $state(false);

  const PERSIST_DEBOUNCE_MS = 250;

  onMount(async () => {
    // Old links (`/?essay=ms-03&view=tree`) go to the essay's own URL first,
    // so nothing else navigates while that redirect is in flight.
    const legacy = studio.legacyEssayRedirect(new URL(window.location.href));
    if (legacy) {
      const view = new URL(window.location.href).searchParams.get('view');
      const search: '' | `?${string}` = view ? `?view=${encodeURIComponent(view)}` : '';
      await goto(resolve(`/(studio)/essays/[id]${search}`, { id: legacy }), { replace: true });
    }
    studio.hydrate(new URL(window.location.href));
    studio.initSession();
  });

  // Persist HUD values, drafts, local revisions and the journal (debounced).
  $effect(() => {
    if (!studio.hydrated) return;
    const snapshot = studio.persistedSnapshot();
    const timer = setTimeout(() => studio.persist(snapshot), PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  });

  // Mirror the open panel into `?view=` with a shallow, replacing navigation:
  // the URL stays shareable without a router round-trip or a history entry
  // per click. The essay itself is part of the path.
  $effect(() => {
    // Wait out real navigations (essay switches, legacy-link redirects): a
    // shallow goto now would cancel them. The effect re-runs when they finish.
    if (!studio.hydrated || navigating.to) return;
    const search = studio.viewSearch;
    const id = page.params.id;
    if (search === window.location.search) return;
    const target = id
      ? resolve(`/(studio)/essays/[id]${search}`, { id })
      : resolve(`/(studio)${search}`);
    goto(target, { shallow: true, replace: true });
  });

  // Signed-in editors see the shared revision history of the open essay.
  $effect(() => {
    const id = studio.activeEssay.id;
    if (studio.editor) untrack(() => studio.loadSharedRevisions(id));
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
    if (isTypingTarget(event.target) || loginOpen) return;

    const view = VIEW_META.find((v) => v.key === event.key);
    if (view) studio.switchMainView(view.id);
    else if (event.key === '[') studio.stepEssay(-1);
    else if (event.key === ']') studio.stepEssay(1);
  }
</script>

<svelte:window onkeydown={handleShortcut} onpagehide={() => studio.hydrated && studio.persist()} />

<div
  class="flex min-h-screen flex-col items-center justify-center bg-desk p-2 selection:bg-ink selection:text-vellum sm:p-4 md:p-6 print:block print:bg-white print:p-0"
  style:--essay-font-scale={studio.hud.fontScale}
  style:--essay-col-width="{studio.hud.colWidth}px"
  style:--essay-line-height={studio.hud.lineHeight}
  style:--marginalia-opacity={studio.hud.marginaliaOpacity}
  style:--highlight-intensity={studio.hud.highlightIntensity}
  data-hydrated={studio.hydrated ? '' : undefined}
>
  <a
    href="#{PANEL_ID}"
    class="sr-only z-50 bg-ink px-3 py-2 font-mono text-xs text-pastel focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >Skip to content</a
  >

  <div
    class="paper-texture relative flex min-h-[93vh] w-full max-w-[1600px] flex-col overflow-hidden rounded-xs border-2 border-ink bg-paper shadow-[8px_8px_0px_var(--color-ink)] lg:flex-row print:min-h-0 print:overflow-visible print:border-0 print:shadow-none"
  >
    <LeftSpineNav onsignin={() => (loginOpen = true)} />

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

<LoginDialog bind:open={loginOpen} />
<Toast />

{@render children()}

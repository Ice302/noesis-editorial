<!--
	@component
	Transient status message. The live region is always mounted so screen
	readers announce each new message; only its visible content toggles.
-->
<script lang="ts">
  import { getStudio } from '#lib/state/studio.svelte.ts';

  const studio = getStudio();
</script>

<div role="status" aria-live="polite" aria-atomic="true" class="print:hidden">
  {#if studio.toastVisible}
    <div
      class="fixed right-5 bottom-5 z-50 flex items-center gap-2.5 border-2 border-pastel bg-ink px-4 py-2.5 font-mono text-xs text-paper shadow-[5px_5px_0px_var(--color-ink)]"
    >
      <span class="h-2 w-2 rounded-full bg-pastel" aria-hidden="true"></span>
      <span>{studio.toastMessage}</span>
    </div>
  {/if}
</div>

<!--
	@component
	Transient status message. The live region is always mounted (and is itself
	the positioned element, so it has a real box when a message shows) so
	screen readers announce each new message; only its content toggles.
-->
<script lang="ts">
  import { getStudio } from '#lib/state/studio.svelte.ts';

  const studio = getStudio();
</script>

<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  class="fixed right-5 bottom-5 z-50 max-w-[calc(100vw-2.5rem)] print:hidden"
>
  {#if studio.toastVisible}
    <div
      class="flex items-center gap-2.5 border-2 border-pastel bg-ink px-4 py-2.5 font-mono text-xs text-paper shadow-[5px_5px_0px_var(--color-ink)]"
    >
      <span class="h-2 w-2 shrink-0 rounded-full bg-pastel" aria-hidden="true"></span>
      <span>{studio.toastMessage}</span>
    </div>
  {/if}
</div>

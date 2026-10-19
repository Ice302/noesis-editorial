<!--
	@component
	Manuscript Studio toolbar, shown above the spread while live-editing.
	Buttons call `preventDefault` on mousedown so the paragraph being edited
	keeps focus and its text selection.
-->
<script lang="ts">
  import { getStudio } from '#lib/state/studio.svelte.ts';

  interface Props {
    onhighlight: () => void;
  }

  let { onhighlight }: Props = $props();
  const studio = getStudio();
  const keepFocus = (e: MouseEvent) => e.preventDefault();

  function revert() {
    if (confirm('Discard all edits to this essay and restore the archival text?'))
      studio.revertEdits();
  }
</script>

<div
  role="toolbar"
  aria-label="Manuscript editing"
  class="flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-vellum/60 px-3 py-2 font-mono text-[10px] text-ink shadow-[3px_3px_0px_var(--color-ink)] print:hidden"
>
  <div class="flex flex-wrap items-center gap-2">
    <span class="bg-ink px-2 py-0.5 font-bold text-pastel">LIVE EDIT</span>
    <span class="text-ink-soft">{studio.activeEssay.filepath}</span>
    <span class={['px-1.5 py-0.5', studio.hasEdits ? 'border border-ink' : 'text-ink-soft']}>
      {studio.hasEdits ? 'REVISED · SAVED LOCALLY' : 'ARCHIVAL TEXT'}
    </span>
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <button
      onmousedown={keepFocus}
      onclick={onhighlight}
      class="border border-ink bg-pastel px-2 py-1 font-semibold hover:bg-pastel-deep"
      title="Wrap the selected phrase in an editorial highlight">✦ Highlight</button
    >
    <button
      onmousedown={keepFocus}
      onclick={revert}
      disabled={!studio.hasEdits}
      class="border border-ink px-2 py-1 hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
      >↺ Revert</button
    >
    <button
      onclick={() => studio.setEditorSubMode(false)}
      class="border border-ink bg-ink px-2 py-1 text-pastel hover:bg-ink-mid">Exit to Reader</button
    >
  </div>
</div>

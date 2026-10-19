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

  const status = $derived.by(() => {
    if (studio.syncStatus === 'saving') return 'SAVING…';
    if (studio.syncStatus === 'loading') return 'SYNCING…';
    if (studio.hasEdits) return 'UNCOMMITTED DRAFT';
    if (studio.latestRevision) return `R${studio.latestRevision.seq}`;
    return 'ARCHIVAL TEXT';
  });

  function discard() {
    if (confirm('Discard your uncommitted changes to this essay?')) studio.discardDraft();
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
    <span
      class={['px-1.5 py-0.5', studio.hasEdits ? 'border border-ink' : 'text-ink-soft']}
      role="status">{status} · {studio.syncMode === 'shared' ? 'SHARED' : 'LOCAL'}</span
    >
  </div>
  <div class="flex flex-wrap items-center gap-2">
    <button
      onmousedown={keepFocus}
      onclick={onhighlight}
      disabled={!!studio.redline}
      class="border border-ink bg-pastel px-2 py-1 font-semibold hover:bg-pastel-deep disabled:opacity-40"
      title="Wrap the selected phrase in an editorial highlight">✦ Highlight</button
    >
    <button
      onmousedown={keepFocus}
      onclick={() => studio.toggleRedline()}
      aria-pressed={!!studio.redline}
      class={[
        'border border-ink px-2 py-1',
        studio.redline ? 'bg-ink text-pastel' : 'hover:bg-paper',
      ]}
      title="Show every change since the archival text">⌫ Redlines</button
    >
    <button
      onmousedown={keepFocus}
      onclick={discard}
      disabled={!studio.hasEdits}
      class="border border-ink px-2 py-1 hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
      >↺ Discard Draft</button
    >
    <button
      onclick={() => studio.setEditorSubMode(false)}
      class="border border-ink bg-ink px-2 py-1 text-pastel hover:bg-ink-mid">Exit to Reader</button
    >
  </div>
</div>

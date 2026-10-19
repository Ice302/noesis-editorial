<!--
	@component
	Revision history for the Manuscript Studio: commit the working draft with a
	note, compare any revision with its predecessor as a redline, or restore an
	earlier text into the draft. Revisions are local to this browser unless an
	editor is signed in, in which case they are shared through the server.
-->
<script lang="ts">
  import { getStudio } from '#lib/state/studio.svelte.ts';
  import { changeStats } from '#lib/utils/diff.ts';

  const studio = getStudio();
  let note = $state('');
  const noteId = $props.id();

  const draftStats = $derived(
    studio.hasEdits ? changeStats(studio.baseParagraphs, studio.paragraphs) : null
  );
  /** History newest-first, each with its predecessor and word changes. */
  const entries = $derived(
    studio.history
      .map((rev, i) => {
        const prev = studio.history[i - 1];
        return {
          rev,
          prevRef: prev?.id ?? 'archive',
          stats: changeStats(prev?.paragraphs ?? studio.activeEssay.paragraphs, rev.paragraphs),
        };
      })
      .reverse()
  );
  const nextSeq = $derived((studio.latestRevision?.seq ?? 0) + 1);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const isRedline = (from: string, to: string) =>
    studio.redline?.from === from && studio.redline?.to === to;

  function toggleRedline(from: string, to: string) {
    if (isRedline(from, to)) studio.closeRedline();
    else studio.showRedline(from, to);
  }

  async function commit(event: SubmitEvent) {
    event.preventDefault();
    if (await studio.commitRevision(note)) note = '';
  }
</script>

<section
  aria-labelledby="{noteId}-heading"
  class="border border-ink bg-paper p-3.5 font-mono text-[10px] shadow-[3px_3px_0px_var(--color-ink)]"
>
  <div class="mb-2 flex items-center justify-between border-b border-ink pb-1.5">
    <h2 id="{noteId}-heading" class="text-[11px] font-bold uppercase">Revision History</h2>
    <span
      class={[
        'px-1.5 py-0.5 font-bold',
        studio.syncMode === 'shared' ? 'bg-ink text-pastel' : 'border border-ink',
      ]}
      title={studio.syncMode === 'shared'
        ? 'Revisions are shared with the editorial team'
        : 'Revisions are saved in this browser only'}>{studio.syncMode.toUpperCase()}</span
    >
  </div>

  <form onsubmit={commit} class="flex gap-1.5">
    <label for={noteId} class="sr-only">Revision note</label>
    <input
      id={noteId}
      bind:value={note}
      maxlength="200"
      placeholder={studio.hasEdits ? 'Note for this revision…' : 'No uncommitted changes'}
      disabled={!studio.hasEdits}
      class="min-w-0 flex-1 border border-ink bg-paper px-1.5 py-1 placeholder:text-ink-soft/70 disabled:opacity-50"
    />
    <button
      type="submit"
      disabled={!studio.hasEdits || studio.syncStatus === 'saving'}
      class="shrink-0 border border-ink bg-ink px-2 py-1 font-semibold text-pastel hover:bg-ink-mid disabled:opacity-40"
      >{studio.syncStatus === 'saving' ? 'SAVING…' : `COMMIT R${nextSeq}`}</button
    >
  </form>

  {#if studio.syncStatus === 'conflict'}
    <p role="alert" class="mt-2 border border-redline px-2 py-1 text-redline">
      A colleague committed R{studio.latestRevision?.seq} first. Review the redline, then commit again.
    </p>
  {:else if studio.syncStatus === 'error'}
    <p role="alert" class="mt-2 border border-redline px-2 py-1 text-redline">
      Couldn’t reach the shared archive.
      <button
        class="underline"
        onclick={() => studio.loadSharedRevisions(studio.activeEssay.id, { force: true })}
        >Retry</button
      >
    </p>
  {/if}

  <ol class="mt-3 space-y-2.5">
    {#if draftStats}
      <li class="border-l-2 border-dashed border-ink pl-2">
        <div class="flex items-center justify-between font-bold">
          <span>WORKING DRAFT</span><span class="font-normal text-ink-soft">uncommitted</span>
        </div>
        <div class="mt-1 flex items-center justify-between">
          <span
            ><span class="redline-ins">+{draftStats.added}</span>
            <span class="redline-del">−{draftStats.removed}</span></span
          >
          <button
            onclick={() => toggleRedline(studio.latestRevision?.id ?? 'archive', 'draft')}
            aria-pressed={isRedline(studio.latestRevision?.id ?? 'archive', 'draft')}
            class="underline-offset-2 hover:underline">REDLINE</button
          >
        </div>
      </li>
    {/if}

    {#each entries as { rev, prevRef, stats } (rev.id)}
      <li class="border-l-2 border-ink pl-2">
        <div class="flex items-center justify-between">
          <span class="font-bold">R{rev.seq}</span>
          <time datetime={rev.createdAt} class="text-ink-soft">{formatTime(rev.createdAt)}</time>
        </div>
        <div class="truncate text-ink-soft">{rev.author}</div>
        {#if rev.note}<p class="mt-0.5 font-serif text-xs italic">{rev.note}</p>{/if}
        <div class="mt-1 flex items-center justify-between gap-2">
          <span
            ><span class="redline-ins">+{stats.added}</span>
            <span class="redline-del">−{stats.removed}</span></span
          >
          <span class="flex gap-2">
            <button
              onclick={() => toggleRedline(prevRef, rev.id)}
              aria-pressed={isRedline(prevRef, rev.id)}
              class="underline-offset-2 hover:underline">REDLINE</button
            >
            <button
              onclick={() => studio.restore(rev.id)}
              class="underline-offset-2 hover:underline">RESTORE</button
            >
          </span>
        </div>
      </li>
    {/each}

    <li class="border-l-2 border-ink/40 pl-2">
      <div class="flex items-center justify-between">
        <span class="font-bold">R0 · ARCHIVAL</span>
        <span class="text-ink-soft">{studio.activeEssay.published}</span>
      </div>
      <div class="mt-1 flex items-center justify-between">
        <span class="text-ink-soft">{studio.activeEssay.author}</span>
        <button
          onclick={() => studio.restore('archive')}
          disabled={!studio.hasEdits && studio.history.length === 0}
          class="underline-offset-2 hover:underline disabled:opacity-40 disabled:hover:no-underline"
          >RESTORE</button
        >
      </div>
    </li>
  </ol>

  {#if studio.syncMode === 'local'}
    <p class="mt-3 border-t border-ink/30 pt-2 font-serif text-xs text-ink-soft italic">
      {studio.sharedAvailable
        ? 'Saved in this browser. Sign in from the spine to share revisions with the team.'
        : 'Saved in this browser only.'}
    </p>
  {/if}
</section>

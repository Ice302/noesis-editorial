<!--
	@component
	The Aeon spread: five-column synopsis deck, essay header and byline, body
	with drop cap, and a sticky marginalia column. In the Manuscript Studio
	(`studio.isLiveEditMode`) paragraphs become `contenteditable` and the
	revision history joins the margin. When a redline is open, the body shows
	word-level insertions and deletions instead.
-->
<script lang="ts">
  import { getStudio } from '#lib/state/studio.svelte.ts';
  import { paragraphId, scrollToParagraph } from '#lib/utils/browser.ts';
  import { padIndex } from '#lib/utils/text.ts';
  import StudioToolbar from './StudioToolbar.svelte';
  import RevisionPanel from './RevisionPanel.svelte';
  import ReadingProgress from './ReadingProgress.svelte';

  const studio = getStudio();
  const essay = $derived(studio.activeEssay);
  let body: HTMLDivElement | undefined = $state();

  /** Paste as plain text so foreign markup and styles never enter the manuscript. */
  function pastePlainText(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text.replace(/\s+/g, ' '));
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    (event.currentTarget as HTMLElement).dispatchEvent(new Event('input', { bubbles: true }));
  }

  /** Enter would split the paragraph into browser-generated <div>s; Shift+Enter inserts a <br>. */
  function onParagraphKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      (event.currentTarget as HTMLElement).blur();
    }
  }

  /** Wraps the current selection inside one paragraph in an editorial highlight. */
  function highlightSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      studio.showToast('Select a phrase inside a paragraph first.');
      return;
    }
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const host = (
      container instanceof Element ? container : container.parentElement
    )?.closest<HTMLElement>('[data-para-index]');
    if (!host) {
      studio.showToast('Highlights must stay within a single paragraph.');
      return;
    }
    const mark = document.createElement('mark');
    mark.className = 'editorial-highlight';
    mark.append(range.extractContents());
    range.insertNode(mark);
    selection.removeAllRanges();
    host.dispatchEvent(new Event('input', { bubbles: true }));
  }
</script>

{#if !studio.isLiveEditMode}
  <ReadingProgress target={body} />
{/if}

<div class="space-y-8">
  <section aria-label="Synopsis" class="border-b-2 border-ink pb-6">
    <div
      class="grid grid-cols-1 gap-5 font-serif text-xs leading-relaxed text-ink sm:grid-cols-2 lg:grid-cols-5"
    >
      {#each essay.deckColumns as col, i (i)}
        <div class="border-t border-ink/30 pt-2 text-justify hyphens-auto"><p>{col}</p></div>
      {/each}
    </div>
  </section>

  {#if studio.isLiveEditMode}
    <StudioToolbar onhighlight={highlightSelection} />
  {/if}

  <article class="mx-auto max-w-5xl" aria-labelledby="essay-title">
    <header class="mb-8 border-b border-ink/30 pb-6">
      <span class="rounded-xs bg-ink px-2.5 py-1 font-mono text-[10px] text-pastel uppercase"
        >{essay.category}</span
      >
      <h1
        id="essay-title"
        class="mt-3 mb-4 font-display text-3xl leading-[1.15] font-bold text-ink sm:text-4xl lg:text-[2.75rem]"
      >
        {essay.title}
      </h1>
      <p class="max-w-3xl font-serif text-lg leading-relaxed text-ink-mid italic">
        {essay.subtitle}
      </p>
      <p
        class="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-[10px] tracking-wider text-ink-soft uppercase"
      >
        <span class="font-semibold text-ink">{essay.author}</span>
        <span aria-hidden="true">·</span>
        <span class="font-serif text-xs tracking-normal normal-case italic">{essay.authorBio}</span>
        <span aria-hidden="true">·</span>
        <span>{essay.code}</span>
        <span aria-hidden="true">·</span>
        <span>{essay.date}</span>
      </p>
    </header>

    <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      <div bind:this={body} class="essay-body-container space-y-6 text-ink lg:col-span-8">
        {#if studio.redline && studio.redlineParts}
          <div
            role="status"
            class="flex flex-wrap items-center justify-between gap-2 border border-ink bg-vellum/60 px-3 py-1.5 font-mono text-[10px] print:hidden"
          >
            <span>
              <span class="bg-ink px-1.5 py-0.5 font-bold text-pastel">REDLINE</span>
              {studio.labelFor(studio.redline.from)} → {studio.labelFor(studio.redline.to)}
              · <del class="redline-del">deleted</del> · <ins class="redline-ins">inserted</ins>
            </span>
            <button onclick={() => studio.closeRedline()} class="hover:underline">CLOSE ✕</button>
          </div>
          {#each studio.redlineParts as parts, idx (essay.id + idx)}
            <!-- prettier-ignore -->
            <p id={paragraphId(idx)} tabindex="-1" class="essay-paragraph text-justify hyphens-auto">{#each parts as part, j (j)}{#if part.op === 'insert'}<ins class="redline-ins">{part.text}</ins>{:else if part.op === 'delete'}<del class="redline-del">{part.text}</del>{:else}{part.text}{/if}{/each}</p>
          {/each}
        {:else}
          {#each studio.paragraphs as _, idx (essay.id + idx)}
            {#if studio.isLiveEditMode}
              <p
                id={paragraphId(idx)}
                data-para-index={idx}
                class={['essay-paragraph text-justify hyphens-auto', idx === 0 && 'aeon-dropcap']}
                contenteditable="true"
                spellcheck="true"
                aria-label={`Paragraph ${idx + 1}`}
                bind:innerHTML={
                  () => studio.paragraphs[idx], (html) => studio.setParagraph(idx, html)
                }
                onpaste={pastePlainText}
                onkeydown={onParagraphKeydown}
                onblur={() => studio.normalizeParagraph(idx)}
              ></p>
            {:else}
              <p
                id={paragraphId(idx)}
                tabindex="-1"
                class={['essay-paragraph text-justify hyphens-auto', idx === 0 && 'aeon-dropcap']}
              >
                <!-- Safe: every paragraph passes through sanitizeEssayHtml (studio.renderedParagraphs). -->
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html studio.renderedParagraphs[idx]}
              </p>
            {/if}
          {/each}
        {/if}
      </div>

      <aside aria-label="Marginalia and scholia" class="space-y-4 lg:sticky lg:top-4 lg:col-span-4">
        {#if studio.isLiveEditMode}
          <RevisionPanel />
        {/if}
        <h2 class="border-b-2 border-ink pb-2 font-mono text-[11px] font-bold uppercase">
          Marginalia &amp; Scholia
        </h2>
        {#each essay.marginalia as note (note.id)}
          <div
            class="marginalia-card border border-ink bg-paper p-3.5 shadow-[3px_3px_0px_var(--color-ink)]"
          >
            <div class="mb-1.5 flex items-center justify-between font-mono text-[10px]">
              <span class="bg-ink px-1.5 py-0.5 font-bold text-pastel">{note.type}</span>
              <span>
                <a
                  href={`#${paragraphId(note.paraIndex)}`}
                  onclick={(e) => {
                    e.preventDefault();
                    scrollToParagraph(note.paraIndex);
                  }}
                  class="underline-offset-2 hover:underline"
                  title={`Jump to paragraph ${note.paraIndex + 1}`}
                  >§{padIndex(note.paraIndex + 1)}</a
                >
                · {note.author}
              </span>
            </div>
            <p class="font-serif text-xs leading-relaxed">{note.text}</p>
          </div>
        {/each}
      </aside>
    </div>
  </article>
</div>

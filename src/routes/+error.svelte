<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
</script>

<svelte:head>
  <title>{page.status} — NOĒSIS</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-desk p-4">
  <main
    class="paper-texture w-full max-w-xl border-2 border-ink bg-paper p-8 text-ink shadow-[8px_8px_0px_var(--color-ink)]"
  >
    <p class="font-mono text-xs tracking-widest text-ink-soft">ERROR {page.status} // MISFILED</p>
    <h1 class="mt-3 font-display text-3xl font-bold">
      {page.status === 404
        ? 'This folio is not in the archive.'
        : 'The archive could not be opened.'}
    </h1>
    <p class="mt-4 font-serif text-lg leading-relaxed italic">
      {page.error?.message ?? 'Something went wrong.'}
    </p>
    <div class="mt-6 flex flex-wrap gap-3 font-mono text-xs">
      <a
        href={resolve('/(studio)')}
        class="border border-ink bg-ink px-3 py-1.5 text-pastel hover:bg-ink-mid"
        >Return to the studio</a
      >
      <a href={resolve('/archive')} class="border border-ink px-3 py-1.5 hover:bg-vellum"
        >Browse the archive index</a
      >
    </div>
  </main>
</div>

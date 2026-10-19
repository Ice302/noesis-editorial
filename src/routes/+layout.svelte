<script lang="ts">
  import '../app.css';
  import favicon from '#lib/assets/noesis-mark.svg';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} type="image/svg+xml" />
  <link rel="alternate" type="application/rss+xml" title="NOĒSIS — Aeon Archive" href="/rss.xml" />
</svelte:head>

{@render children?.()}

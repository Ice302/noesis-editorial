<!--
	@component
	Thin bar pinned to the top of the viewport showing how far the reader is
	through `target` (the essay body). Updates are batched to one per frame.
-->
<script lang="ts">
  let { target }: { target: HTMLElement | undefined } = $props();

  let progress = $state(0);
  let frame = 0;

  function measure() {
    frame = 0;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    progress =
      scrollable <= 0
        ? rect.bottom <= window.innerHeight
          ? 1
          : 0
        : Math.min(1, Math.max(0, -rect.top / scrollable));
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(measure);
  }

  // Measure when the target appears or changes (e.g. switching essays).
  $effect(() => {
    if (target) schedule();
    return () => cancelAnimationFrame(frame);
  });
</script>

<svelte:window onscroll={schedule} onresize={schedule} />

<div
  role="progressbar"
  aria-label="Reading progress"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={Math.round(progress * 100)}
  class="fixed inset-x-0 top-0 z-40 h-[3px] bg-ink/10 print:hidden"
>
  <div class="h-full origin-left bg-ink" style:transform="scaleX({progress})"></div>
</div>

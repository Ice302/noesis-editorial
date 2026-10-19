<!--
	@component
	Argument cartography. The SVG is rendered declaratively from `layoutTree`,
	so HUD geometry changes and node selection update without manual DOM work.
	Drag the canvas to pan; nodes are keyboard-focusable buttons.
-->
<script lang="ts">
  import { getStudio } from '#lib/state/studio.svelte.ts';
  import { fitZoom, LABEL_HEIGHT, layoutTree, treeBounds, TREE_VIEWBOX } from '#lib/utils/tree.ts';
  import { scrollToParagraph } from '#lib/utils/browser.ts';
  import { padIndex } from '#lib/utils/text.ts';
  import { tick } from 'svelte';

  const studio = getStudio();

  const currentLayout = () =>
    layoutTree(studio.activeEssay.treeNodes, {
      spread: studio.hud.treeSpread,
      scale: studio.hud.treeScale,
      length: studio.hud.treeLength,
      rootWidth: studio.hud.treeRootWidth,
    });

  const layout = $derived(currentLayout());
  const bounds = $derived(treeBounds(layout));
  const node = $derived(studio.selectedNode);

  // --- camera ------------------------------------------------------------
  // The viewBox is centred on the tree's bounding box, so the tree stays in the
  // middle of the canvas as HUD sliders reshape it. `zoom` starts at a fit for
  // this essay (the page re-mounts this component per essay); `pan` is in
  // viewBox units.
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3;
  let zoom = $state(fitZoom(treeBounds(currentLayout())));
  let pan = $state({ x: 0, y: 0 });
  const viewBox = $derived.by(() => {
    const w = TREE_VIEWBOX.width / zoom;
    const h = TREE_VIEWBOX.height / zoom;
    const cx = (bounds.minX + bounds.maxX) / 2 - pan.x;
    const cy = (bounds.minY + bounds.maxY) / 2 - pan.y;
    return `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
  });

  function zoomBy(factor: number) {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(zoom * factor * 100) / 100));
  }
  let drag: { id: number; x: number; y: number; scale: number } | null = $state(null);

  function onPointerDown(event: PointerEvent) {
    const svg = event.currentTarget as SVGSVGElement;
    if ((event.target as Element).closest('[data-node-id]') || event.button !== 0) return;
    // Convert screen pixels to viewBox units so the tree tracks the pointer exactly.
    const scale = 1 / (svg.getScreenCTM()?.a || 1);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, scale };
    svg.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.id) return;
    pan.x += (event.clientX - drag.x) * drag.scale;
    pan.y += (event.clientY - drag.y) * drag.scale;
    drag.x = event.clientX;
    drag.y = event.clientY;
  }

  function endDrag() {
    drag = null;
  }

  function resetView() {
    pan = { x: 0, y: 0 };
    zoom = fitZoom(bounds);
  }

  function onNodeKeydown(event: KeyboardEvent, id: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      studio.selectTreeNode(id);
    }
  }

  async function readInSpread() {
    const idx = node.paraIndex;
    studio.switchMainView('reader');
    await tick();
    scrollToParagraph(idx);
  }
</script>

<div class="flex h-full min-h-[640px] flex-col">
  <div
    class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-ink/30 pb-3 font-mono text-xs"
  >
    <span class="bg-ink px-2 py-0.5 font-bold text-pastel">MODE: TREE LAYOUT</span>
    <div class="flex items-center gap-4">
      <div class="flex items-center border border-ink" role="group" aria-label="Zoom">
        <button
          onclick={() => zoomBy(1 / 1.2)}
          disabled={zoom <= ZOOM_MIN}
          class="px-2 hover:bg-vellum disabled:opacity-40"
          aria-label="Zoom out">−</button
        >
        <span class="border-x border-ink px-2 tabular-nums" aria-live="polite"
          >{Math.round(zoom * 100)}%</span
        >
        <button
          onclick={() => zoomBy(1.2)}
          disabled={zoom >= ZOOM_MAX}
          class="px-2 hover:bg-vellum disabled:opacity-40"
          aria-label="Zoom in">+</button
        >
      </div>
      <button
        onclick={resetView}
        class="text-ink-soft underline-offset-4 hover:text-ink hover:underline">RESET VIEW</button
      >
      <span class="text-ink-soft">NODES: {studio.activeEssay.treeNodes.length}</span>
    </div>
  </div>

  <div
    class="relative flex min-h-[560px] flex-1 flex-col items-center justify-center overflow-hidden border-2 border-ink bg-paper shadow-inner lg:flex-row"
  >
    <!-- On wide screens the excerpt panel floats on the right; reserve its width. -->
    <div class="w-full lg:pr-[340px]">
      <svg
        {viewBox}
        class={[
          'h-[580px] w-full touch-none select-none',
          drag ? 'cursor-grabbing' : 'cursor-grab',
        ]}
        role="group"
        aria-label={`Argument tree for “${studio.activeEssay.title}”. Drag to pan; Tab through nodes and press Enter to inspect.`}
        onpointerdown={onPointerDown}
        onpointermove={onPointerMove}
        onpointerup={endDrag}
        onpointercancel={endDrag}
      >
        <g>
          {#each layout as pos (pos.node.id)}
            {#if pos.path}
              <path
                d={pos.path}
                fill="none"
                stroke="var(--color-ink)"
                stroke-width={pos.node.id === node.id ? pos.strokeWidth + 1.5 : pos.strokeWidth}
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            {/if}
          {/each}

          {#each layout as pos (pos.node.id)}
            {@const selected = pos.node.id === node.id}
            {@const isRoot = pos.depth === 0}
            <g
              data-node-id={pos.node.id}
              class="tree-node group cursor-pointer"
              role="button"
              tabindex="0"
              aria-pressed={selected}
              aria-label={`${pos.node.label} — ${pos.node.type}`}
              onclick={() => studio.selectTreeNode(pos.node.id)}
              onkeydown={(e) => onNodeKeydown(e, pos.node.id)}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isRoot ? 8.5 : selected ? 6.5 : 4.5}
                fill={selected ? 'var(--color-pastel)' : 'var(--color-paper)'}
                stroke="var(--color-ink)"
                stroke-width={selected ? 2.8 : 2}
              />
              {#if pos.labelShifted}
                <line
                  x1={pos.x}
                  y1={pos.labelY + LABEL_HEIGHT}
                  x2={pos.x}
                  y2={pos.y - (selected ? 6.5 : 4.5)}
                  stroke="var(--color-ink)"
                  stroke-width="0.75"
                  stroke-dasharray="2 2"
                />
              {/if}
              <g transform="translate({pos.labelX}, {pos.labelY})">
                <rect
                  x="0"
                  y="0"
                  width={pos.labelWidth}
                  height={LABEL_HEIGHT}
                  fill={selected ? 'var(--color-ink)' : 'var(--color-paper)'}
                  stroke="var(--color-ink)"
                  stroke-width={selected ? 1.5 : 1}
                />
                <text
                  x={pos.labelWidth / 2}
                  y="10.5"
                  text-anchor="middle"
                  font-family="JetBrains Mono, ui-monospace, monospace"
                  font-size="7.5"
                  font-weight={selected ? 700 : 500}
                  fill={selected ? 'var(--color-pastel)' : 'var(--color-ink)'}
                  >{pos.node.label}</text
                >
              </g>
            </g>
          {/each}
        </g>
      </svg>
    </div>

    <div
      class="relative mx-4 mb-4 w-auto max-w-[310px] border-2 border-ink bg-paper p-4 font-mono text-[10px] text-ink shadow-[6px_6px_0px_var(--color-ink)] lg:absolute lg:top-1/2 lg:right-5 lg:m-0 lg:w-full lg:-translate-y-1/2"
      aria-live="polite"
    >
      <div class="mb-2 border-b border-ink/30 pb-1 font-bold">SELECTED NODE EXCERPT</div>
      <div class="mb-1.5 flex items-center justify-between gap-2">
        <span class="bg-ink px-1.5 py-0.5 font-bold text-pastel">{node.type}</span>
        <span class="text-ink-soft">§{padIndex(node.paraIndex + 1)}</span>
      </div>
      <div class="mb-2 font-semibold">{node.label}</div>
      <p class="font-serif text-xs italic">{node.excerpt}</p>

      <dl class="mt-3 grid grid-cols-3 gap-2 border-t border-ink/30 pt-2 text-center">
        <div>
          <dt class="text-ink-soft">WEIGHT</dt>
          <dd class="font-bold">{node.weight.toFixed(2)}</dd>
        </div>
        <div>
          <dt class="text-ink-soft">CITES</dt>
          <dd class="font-bold">{node.citations}</dd>
        </div>
        <div>
          <dt class="text-ink-soft">SCHOLIA</dt>
          <dd class="font-bold">{node.scholia}</dd>
        </div>
      </dl>
      <div class="mt-2 h-1.5 border border-ink bg-paper" aria-hidden="true">
        <div class="h-full bg-ink" style:width="{node.weight * 100}%"></div>
      </div>

      <button
        onclick={readInSpread}
        class="mt-3 w-full border border-ink bg-pastel px-2 py-1 font-semibold hover:bg-pastel-deep"
      >
        READ §{padIndex(node.paraIndex + 1)} IN SPREAD →
      </button>
    </div>
  </div>
</div>

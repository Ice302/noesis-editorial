<!--
	@component
	One row of the typographic HUD: a range input in a ruled track, followed by
	its label and current value. Bind `value` to a number.

	```svelte
	<HudSlider label="FONT SCALE" min={0.85} max={1.35} step={0.01}
		bind:value={studio.hud.fontScale} display={studio.hud.fontScale.toFixed(2)} />
	```
-->
<script lang="ts">
  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    /** Formatted value shown next to the label and announced to assistive tech. */
    display: string;
  }

  let { label, value = $bindable(), min, max, step, display }: Props = $props();
  const id = $props.id();
</script>

<div class="hud-slider-row">
  <div class="hud-meter-track">
    <input
      {id}
      type="range"
      {min}
      {max}
      {step}
      bind:value
      aria-valuetext={display}
      class="w-full cursor-ew-resize accent-ink"
    />
  </div>
  <label for={id} class="font-medium text-ink">{label}: {display}</label>
</div>

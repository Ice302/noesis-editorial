<script lang="ts">
  import EssayHead from '#lib/components/EssayHead.svelte';

  let { data } = $props();
</script>

<EssayHead essay={data.essay} />

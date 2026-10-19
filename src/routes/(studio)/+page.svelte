<script lang="ts">
  import EssayHead from '#lib/components/EssayHead.svelte';

  let { data } = $props();
</script>

<!-- Same content as /essays/<first>; its canonical URL points there. -->
<EssayHead essay={data.essay} />

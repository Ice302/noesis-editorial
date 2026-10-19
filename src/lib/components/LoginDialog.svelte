<!--
	@component
	Editor sign-in, as a native modal <dialog>: the browser handles focus
	trapping, Escape to close and the inert backdrop. Bind `open` to show it.
-->
<script lang="ts">
  import { getStudio } from '#lib/state/studio.svelte.ts';

  let { open = $bindable(false) }: { open: boolean } = $props();

  const studio = getStudio();
  let dialog: HTMLDialogElement | undefined = $state();
  let username = $state('');
  let password = $state('');
  let error = $state('');
  let busy = $state(false);

  // Keep the native dialog in sync with the `open` prop.
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) {
      error = '';
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    error = '';
    const result = await studio.login(username, password);
    busy = false;
    if (result.ok) {
      password = '';
      open = false;
    } else {
      error = result.message;
    }
  }
</script>

<dialog
  bind:this={dialog}
  onclose={() => (open = false)}
  aria-labelledby="login-title"
  class="m-auto w-[min(92vw,380px)] border-2 border-ink bg-paper p-0 text-ink shadow-[6px_6px_0px_var(--color-ink)] backdrop:bg-ink/50"
>
  <form onsubmit={submit} class="space-y-4 p-6 font-mono text-xs">
    <div class="border-b border-ink pb-2">
      <h2 id="login-title" class="font-bold tracking-wider">EDITORIAL ACCESS</h2>
      <p class="mt-1 font-serif text-sm text-ink-soft italic">
        Sign in to share revisions with the editorial team.
      </p>
    </div>

    <div class="space-y-1">
      <label for="login-username" class="block font-semibold">USERNAME</label>
      <input
        id="login-username"
        bind:value={username}
        autocomplete="username"
        required
        class="w-full border border-ink bg-paper px-2 py-1.5"
      />
    </div>
    <div class="space-y-1">
      <label for="login-password" class="block font-semibold">PASSWORD</label>
      <input
        id="login-password"
        type="password"
        bind:value={password}
        autocomplete="current-password"
        required
        class="w-full border border-ink bg-paper px-2 py-1.5"
      />
    </div>

    {#if error}
      <p role="alert" class="border border-redline px-2 py-1.5 text-redline">{error}</p>
    {/if}

    <div class="flex justify-end gap-2 pt-1">
      <button
        type="button"
        onclick={() => (open = false)}
        class="border border-ink px-3 py-1.5 hover:bg-vellum">Cancel</button
      >
      <button
        type="submit"
        disabled={busy}
        class="border border-ink bg-ink px-3 py-1.5 font-semibold text-pastel hover:bg-ink-mid disabled:opacity-50"
        >{busy ? 'Signing in…' : 'Sign in'}</button
      >
    </div>
  </form>
</dialog>

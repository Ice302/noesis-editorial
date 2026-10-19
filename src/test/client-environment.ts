/**
 * Vitest environment for testing Svelte rune modules (`*.svelte.test.ts`).
 *
 * The default `node` environment transforms code with Vite's SSR pipeline, so
 * vite-plugin-svelte compiles `.svelte.ts` files for the *server*: `$state`
 * isn't proxied and `$effect` never runs, which hides client-side reactivity
 * bugs. This environment keeps Node's globals (no DOM is needed for state
 * logic) but transforms through Vite's `client` environment, i.e. exactly the
 * code the browser runs.
 */
import type { Environment } from 'vitest/runtime';

export default {
  name: 'svelte-client',
  viteEnvironment: 'client',
  setup() {
    return { teardown() {} };
  },
} satisfies Environment;

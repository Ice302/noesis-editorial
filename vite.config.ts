/// <reference types="vitest/config" />
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// SvelteKit 3 reads its configuration from the Vite plugin (svelte.config.js is
// no longer supported). adapter-auto picks the right adapter on Vercel,
// Netlify, Cloudflare and other zero-config hosts at build time.
export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      adapter: adapter(),
      // Inline the app stylesheet (~36 KB raw, ~8 KB gzipped) into each page so
      // first paint doesn't wait for an extra CSS round trip (Lighthouse:
      // render-blocking resources on mobile).
      inlineStyleThreshold: 48 * 1024,
      compilerOptions: {
        // Fail fast on legacy syntax (`export let`, `$:`, `on:click`): the
        // codebase is runes-only.
        runes: true,
      },
    }),
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.svelte.test.ts'],
          environment: 'node',
        },
      },
      {
        // Rune modules are compiled for the browser so `$state` proxies and
        // `$effect` behave as they do in the app (see the environment file).
        extends: true,
        test: {
          name: 'client',
          include: ['src/**/*.svelte.test.ts'],
          environment: './src/test/client-environment.ts',
        },
      },
    ],
  },
});

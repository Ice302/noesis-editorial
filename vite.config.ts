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
      compilerOptions: {
        // Fail fast on legacy syntax (`export let`, `$:`, `on:click`): the
        // codebase is runes-only.
        runes: true,
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
